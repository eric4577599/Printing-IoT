// 通訊設定送出 payload 的單一來源(P1)。
//
// 為什麼需要它:後端 `UpdateCommunicationSettingsAsync` 是**整包覆寫** Redis 的字串,
// 送什麼就存什麼、沒送的鍵直接消失。而 CommunicationTab 原本有**四處**各自手寫 payload,
// 且四處遺漏的欄位還不一樣:
//
//   - 定時寫入間隔那處:少 mqtt_broker_url / mqtt_topic / machine_id
//   - PLC 欄位那處:少 machine_id
//   - 機台識別碼那處:少 mqtt_broker_url / mqtt_topic
//   - 「儲存」按鈕那處:少 plc_monitor_interval **與** 兩個 mqtt 欄位
//
// 也就是說按一次「儲存」就會把監控頻率與 MQTT 設定洗掉。
// 「修正 #9」修過其中一處,但沒有拿掉「同一份 payload 手寫四次」這個成因,於是復發。
//
// 本模組把它收斂成一個函式:**新增欄位只會有一個地方要改**。

import { DATA_LOG_INTERVAL_DEFAULT } from './dataLogInterval';

/**
 * 由完整的通訊設定狀態產生送給後端的 payload
 * @param {Object} s - CommunicationTab 的 commSettings 完整狀態
 * @returns {Object} 後端 `/settings/communication` 的 payload(snake_case)
 * @description 一律送出**全部欄位**。後端整包覆寫,少送一個等於刪掉一個 ——
 *              所以這裡不做「只送有變的欄位」那種最佳化,那正是原本的災難來源。
 */
export function buildCommPayload(s) {
    const plc = s?.plc ?? {};
    const erp = s?.erp ?? {};

    return {
        plc_enabled: plc.enabled,
        plc_simulate: plc.simulate,
        plc_device_type: plc.deviceType,
        plc_ip: plc.ip,
        plc_port: plc.port,
        plc_motor_signal: plc.motorSignal,
        plc_count_signal: plc.countSignal,
        plc_monitor_interval: plc.monitor_interval,
        mqtt_broker_url: plc.mqttBroker,
        mqtt_topic: plc.mqttTopic,
        // 序列埠(RS-232)連線參數,plc_device_type 為 mhi_evol 時使用
        plc_serial_port: plc.serialPort,
        plc_baud_rate: plc.baudRate,
        plc_data_bits: plc.dataBits,
        plc_parity: plc.parity,
        plc_stop_bits: plc.stopBits,

        erp_enabled: erp.enabled,
        erp_protocol: erp.protocol,
        erp_connection_type: erp.connectionType,
        erp_host: erp.host,
        erp_port: erp.port,
        erp_input_dir: erp.inputDir,
        erp_output_dir: erp.outputDir,

        data_log_interval: s?.dataLogInterval,
        machine_id: s?.machineId,

        // P1:MM 維護模組的對外網址。空字串代表未設定,主系統不顯示入口。
        mm_base_url: s?.mmBaseUrl ?? '',
    };
}

/** payload 應有的鍵集合 —— 供測試釘住「不得再有人漏送欄位」 */
export const COMM_PAYLOAD_KEYS = Object.freeze(Object.keys(buildCommPayload({})));

/**
 * 通訊設定的預設值 —— 也是 CommunicationTab 的初始狀態,單一來源。
 * 載入後端設定時,後端沒有的鍵一律落回這裡的值。
 */
export const DEFAULT_COMM_SETTINGS = Object.freeze({
    plc: Object.freeze({
        enabled: true, simulate: false, deviceType: 'wise', ip: '192.168.1.1', port: 502,
        motorSignal: 'DI-0', countSignal: 'DI-1', monitor_interval: 1.0,
        mqttBroker: '', mqttTopic: '',
        // Mitsubishi Evol 用序列埠(RS-232)預設值:9600 bps、8 資料位元、偶同位、1 停止位元
        serialPort: '', baudRate: 9600, dataBits: 8, parity: 'even', stopBits: 1,
    }),
    erp: Object.freeze({
        enabled: true, protocol: 'lmc_flexo', connectionType: 'tcp',
        host: '192.168.1.100', port: 3000, inputDir: '', outputDir: '',
    }),
    dataLogInterval: DATA_LOG_INTERVAL_DEFAULT,
    machineId: 'MACHINE_01',
    mmBaseUrl: '',
});

/**
 * 把後端回傳的通訊設定(snake_case)轉成 CommunicationTab 的狀態
 * @param {Object} data - GET /api/settings/communication 的回應
 * @returns {Object} 與 DEFAULT_COMM_SETTINGS 同形的狀態,**任何欄位都不會是 undefined**
 * @description 舊設定可能缺鍵(例如在 ERP 欄位出現前存的設定完全沒有 erp_*)。
 *              缺鍵若變成 undefined,畫面會出現「連線方式一個都沒選」,且 React 會把原本
 *              TCP 分支的輸入框 DOM 重用到檔案分支,殘留舊文字(B23)。
 *              也補上先前漏讀的 plc_monitor_interval —— 沒讀回來,下一次「儲存」就會把它洗掉。
 */
export function parseCommSettings(data) {
    const d = data ?? {};
    const D = DEFAULT_COMM_SETTINGS;
    return {
        plc: {
            enabled: d.plc_enabled ?? D.plc.enabled,
            simulate: d.plc_simulate ?? D.plc.simulate,
            deviceType: d.plc_device_type ?? D.plc.deviceType,
            ip: d.plc_ip ?? D.plc.ip,
            port: d.plc_port ?? D.plc.port,
            motorSignal: d.plc_motor_signal ?? D.plc.motorSignal,
            countSignal: d.plc_count_signal ?? D.plc.countSignal,
            monitor_interval: d.plc_monitor_interval ?? D.plc.monitor_interval,
            mqttBroker: d.mqtt_broker_url ?? D.plc.mqttBroker,
            mqttTopic: d.mqtt_topic ?? D.plc.mqttTopic,
            serialPort: d.plc_serial_port ?? D.plc.serialPort,
            baudRate: d.plc_baud_rate ?? D.plc.baudRate,
            dataBits: d.plc_data_bits ?? D.plc.dataBits,
            parity: d.plc_parity ?? D.plc.parity,
            stopBits: d.plc_stop_bits ?? D.plc.stopBits,
        },
        erp: {
            enabled: d.erp_enabled ?? D.erp.enabled,
            protocol: d.erp_protocol ?? D.erp.protocol,
            connectionType: d.erp_connection_type ?? D.erp.connectionType,
            host: d.erp_host ?? D.erp.host,
            port: d.erp_port ?? D.erp.port,
            inputDir: d.erp_input_dir ?? D.erp.inputDir,
            outputDir: d.erp_output_dir ?? D.erp.outputDir,
        },
        dataLogInterval: d.data_log_interval || D.dataLogInterval,
        machineId: d.machine_id || D.machineId,
        mmBaseUrl: d.mm_base_url || D.mmBaseUrl,
    };
}
