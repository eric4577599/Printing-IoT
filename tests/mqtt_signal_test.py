#!/usr/bin/env python3
"""
MQTT 訊號完整性測試腳本
測試高頻訊號發送與接收，驗證訊息不遺失
"""

import paho.mqtt.client as mqtt
import json
import time
import threading
from datetime import datetime
from collections import defaultdict

class MqttSignalTester:
    def __init__(self, broker="localhost", port=1884):
        self.broker = broker
        self.port = port
        self.publish_client = None
        self.subscribe_client = None
        
        # 統計資料
        self.messages_sent = 0
        self.messages_received = defaultdict(int)
        self.latencies = []
        self.start_time = None
        self.running = False
        
    def on_connect_subscriber(self, client, userdata, flags, rc):
        """訂閱者連線回調"""
        if rc == 0:
            print(f"[訂閱者] 已連線到 MQTT Broker")
            # 訂閱監控主題
            client.subscribe("factory/monitor/update", qos=1)
            client.subscribe("factory/machine/update", qos=1)
            print(f"[訂閱者] 已訂閱 factory/monitor/update 和 factory/machine/update")
        else:
            print(f"[訂閱者] 連線失敗，錯誤碼: {rc}")
    
    def on_message(self, client, userdata, msg):
        """接收訊息回調"""
        try:
            payload = json.loads(msg.payload.decode())
            topic = msg.topic
            self.messages_received[topic] += 1
            
            # 計算延遲（如果有時間戳）
            if 'timestamp' in payload:
                sent_time = payload['timestamp']
                latency = (time.time() - sent_time) * 1000  # 轉換為毫秒
                self.latencies.append(latency)
            
            # 每10筆訊息顯示一次
            if self.messages_received[topic] % 10 == 0:
                print(f"[接收] {topic}: 已收到 {self.messages_received[topic]} 筆")
                
        except json.JSONDecodeError:
            print(f"[錯誤] 無法解析 JSON: {msg.payload}")
        except Exception as e:
            print(f"[錯誤] 處理訊息時發生錯誤: {e}")
    
    def setup_clients(self):
        """設定 MQTT 客戶端"""
        # 發布者
        self.publish_client = mqtt.Client(client_id="test_publisher")
        
        # 訂閱者
        self.subscribe_client = mqtt.Client(client_id="test_subscriber")
        self.subscribe_client.on_connect = self.on_connect_subscriber
        self.subscribe_client.on_message = self.on_message
        
        try:
            print(f"正在連線到 MQTT Broker ({self.broker}:{self.port})...")
            self.publish_client.connect(self.broker, self.port, 60)
            self.subscribe_client.connect(self.broker, self.port, 60)
            
            # 啟動訂閱者迴圈（背景執行）
            self.subscribe_client.loop_start()
            time.sleep(1)  # 等待連線建立
            print("MQTT 客戶端已連線並準備就緒\n")
            return True
        except Exception as e:
            print(f"連線失敗: {e}")
            return False
    
    def test_high_frequency_signals(self, frequency=10, duration=10, speed=250):
        """
        測試高頻訊號發送
        
        Args:
            frequency: 每秒發送次數 (Hz)
            duration: 測試持續時間 (秒)
            speed: 模擬車速 (m/min)
        """
        print(f"=== 高頻訊號測試 ===")
        print(f"頻率: {frequency} Hz")
        print(f"持續時間: {duration} 秒")
        print(f"模擬車速: {speed} m/min")
        print(f"預計發送: {frequency * duration} 筆訊息\n")
        
        self.start_time = time.time()
        self.running = True
        self.messages_sent = 0
        interval = 1.0 / frequency
        
        d1_counter = 0
        
        for i in range(frequency * duration):
            if not self.running:
                break
            
            # 模擬脈衝計數器增加（每次增加速度 * interval 對應的長度）
            d1_counter += int(speed * interval / 60 * 100)  # 假設每100米一個脈衝
            
            payload = {
                "d1": d1_counter,
                "speed": speed + (i % 10 - 5),  # 模擬速度微小波動
                "timestamp": time.time(),
                "message_id": i + 1
            }
            
            try:
                result = self.publish_client.publish(
                    "factory/machine/update",
                    json.dumps(payload),
                    qos=1
                )
                
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    self.messages_sent += 1
                else:
                    print(f"[警告] 訊息 {i+1} 發送失敗，錯誤碼: {result.rc}")
                
                time.sleep(interval)
                
            except Exception as e:
                print(f"[錯誤] 發送訊息時發生錯誤: {e}")
                break
        
        # 等待所有訊息被接收
        print("\n等待訊息處理完成...")
        time.sleep(2)
        
        self.print_statistics()
    
    def test_stress_burst(self, burst_size=100):
        """
        測試突發性大量訊息
        
        Args:
            burst_size: 一次性發送的訊息數量
        """
        print(f"\n=== 壓力測試：突發訊息 ===")
        print(f"突發訊息數量: {burst_size} 筆\n")
        
        self.start_time = time.time()
        self.messages_sent = 0
        
        for i in range(burst_size):
            payload = {
                "d1": i * 100,
                "speed": 300,
                "timestamp": time.time(),
                "message_id": i + 1
            }
            
            result = self.publish_client.publish(
                "factory/machine/update",
                json.dumps(payload),
                qos=1
            )
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                self.messages_sent += 1
        
        print("突發訊息已全部發送")
        print("等待訊息處理完成...")
        time.sleep(3)
        
        self.print_statistics()
    
    def print_statistics(self):
        """輸出統計資料"""
        elapsed_time = time.time() - self.start_time
        
        print("\n" + "="*50)
        print("測試結果統計")
        print("="*50)
        print(f"測試時間: {elapsed_time:.2f} 秒")
        print(f"發送訊息數: {self.messages_sent}")
        
        for topic, count in self.messages_received.items():
            print(f"接收訊息數 ({topic}): {count}")
        
        # 計算遺失率
        total_received = sum(self.messages_received.values())
        if self.messages_sent > 0:
            loss_rate = (self.messages_sent - total_received) / self.messages_sent * 100
            print(f"訊息遺失率: {loss_rate:.2f}%")
        
        # 延遲統計
        if self.latencies:
            avg_latency = sum(self.latencies) / len(self.latencies)
            min_latency = min(self.latencies)
            max_latency = max(self.latencies)
            print(f"\n延遲統計:")
            print(f"  平均延遲: {avg_latency:.2f} ms")
            print(f"  最小延遲: {min_latency:.2f} ms")
            print(f"  最大延遲: {max_latency:.2f} ms")
        
        print("="*50 + "\n")
    
    def cleanup(self):
        """清理資源"""
        self.running = False
        if self.subscribe_client:
            self.subscribe_client.loop_stop()
            self.subscribe_client.disconnect()
        if self.publish_client:
            self.publish_client.disconnect()
        print("已斷開 MQTT 連線")

def main():
    """主測試流程"""
    print("MQTT 訊號完整性測試工具")
    print("="*50)
    
    tester = MqttSignalTester(broker="localhost", port=1884)
    
    if not tester.setup_clients():
        print("無法連線到 MQTT Broker，測試終止")
        return
    
    try:
        # 測試 1: 模擬正常生產 (10 Hz, 10秒)
        tester.test_high_frequency_signals(frequency=10, duration=10, speed=150)
        
        time.sleep(2)
        
        # 測試 2: 模擬高速生產 (10 Hz, 5秒, 250 m/min)
        print("\n" + "="*50)
        tester.test_high_frequency_signals(frequency=10, duration=5, speed=250)
        
        time.sleep(2)
        
        # 測試 3: 突發訊息壓力測試
        print("\n" + "="*50)
        tester.test_stress_burst(burst_size=50)
        
    except KeyboardInterrupt:
        print("\n\n測試已被使用者中斷")
    finally:
        tester.cleanup()
        print("測試完成")

if __name__ == "__main__":
    main()
