# Flexo IoT 標準測試案例 (Standard Test Cases)

**Version**: 1.0  
**Date**: 2026-01-19  
**Designed By**: @domain-qa-specialist, @iot-fullstack-architect  
**Purpose**: 此文件將作為系統發布前的標準驗收測試（UAT）劇本，整合真實訂單規格與排程邏輯。

---

## 📂 測試資料準備 (Test Data Setup)

根據附件工單規格，請在測試環境預先建立以下料號與訂單資料。

### Data Set A: 標準自動包裝訂單
*對應附件：Order B250520010*

**1. Product (料號資料)**
*   **Product Code**: `4-PLATE-AUTO` (參考名稱: 【自動包】4號紙盤)
*   **Dimensions**: 315 (L) x 209 (W) x 50 (H) mm
*   **Material**: `212` / Flute: `B`
*   **Processing**:
    *   Print Color: 2 (黑D-378, 紅R-303)
    *   Die Cut: 修 440x1256
*   **Packaging**:
    *   Packing Type: 一般 (M71-打包機)
    *   Bundle Count: 20 (預設)

**2. Order (訂單資料)**
*   **Order No**: `B250520010`
*   **Customer**: 正康 (0014)
*   **Qty**: 5000
*   **Delivery Date**: 2025/05/28
*   **Expected Process**: M21(印) -> M31(軋) -> M71(包)

---

### Data Set B: 特殊規格訂單 (PIZZA盒)
*對應附件：Order B250703007*

**1. Product (料號資料)**
*   **Product Code**: `20005475` (品名: 20005475-PIZZA)
*   **Dimensions**: 394 (L) x 279 (W) x 104 (H) mm
*   **Material**: `C11M4` / Flute: `AB` (五層熱)
*   **Processing**:
    *   Print Color: 1 (紅R-303)
    *   Die Cut: 修 850x787
*   **Packaging**:
    *   **Note**: **【橫向打包】，每捆 20 pcs，加護角**
    *   Packing Type: 護角 (M76-打包機)
    *   Bundle Count: 20

**2. Order (訂單資料)**
*   **Order No**: `B250703007`
*   **Customer**: 永豐餘-健策 (0233)
*   **Qty**: 2000
*   **Delivery Date**: 2025/07/03
*   **Expected Process**: M21(印) -> M31(軋) -> M76(包/護) -> M71(包)

---

## 🧪 測試劇本 (Test Scenarios)

### Scenario 1: 排程規劃與衝突檢測 (@iot-fullstack-architect)
*目標：驗證排程邏輯正確性與 UI 操作流暢度*

**Pre-condition**: System is online, Database empty or clean.

| Step | Action (操作) | Input Data (輸入) | Expected Result (預期結果) |
|:----:|:---|:---|:---|
| 1 | **Create Product A** | 輸入 Data Set A 完整規格 | 成功儲存，DB `Products` 表格新增一筆資料，規格欄位正確。 |
| 2 | **Create Product B** | 輸入 Data Set B 完整規格 | 成功儲存。 |
| 3 | **Import Orders** | 建立訂單 B250520010, B250703007 | 兩筆訂單進入 "Pending" 列表，狀態顯示 "Pool"。 |
| 4 | **Schedule Planning** | 將 B250520010 拖入排程 | 訂單狀態變更為 "Scheduled"，Sequence = 1。 |
| 5 | **Priority Insert** | 將 B250703007 插隊至第一位 | B250703007 Seq=1, B250520010 Seq=2。UI 應立即刷新順序。 |
| 6 | **Conflict Check** | 嘗試修改 B250703007 數量為 0 | 系統應阻擋並顯示錯誤訊息 (Validation Error)。 |
| 7 | **Delivery Check** | 檢查 Schedule UI 顯示 | 應清楚顯示 "交貨日期"，且 B250520010 (5/28) 應視覺上提示較緊急 (若當前日期接近)。 |

---

### Scenario 2: 完整生產流程 - 標準單 (@domain-qa-specialist)
*目標：驗證 Data Set A (B250520010) 的生產記錄與即時監控*

**Pre-condition**: B250520010 is first in schedule. Frontend connected based on Order Spec image.

| Step | Action (操作) | Input/Simulation | Expected Result (預期結果) |
|:----:|:---|:---|:---|
| 1 | **Load Order** | Dashboard 點擊 "載入工單" | 顯示 B250520010 資訊，包含 "M21 -> M31 -> M71" 工序提示。 |
| 2 | **Start Production** | 點擊 "開始生產" | 機台狀態轉為 "Running" (Green)。MQTT 發送 `factory/monitor/update`. |
| 3 | **Simulate Run** | 模擬速度 150 m/min, 持續 10分鐘 | Dashboard 車速顯示 150±5，產量持續累加。 |
| 4 | **Check Specs** | 查看 Dashboard "詳細資訊" | 應顯示長寬高 `315x209x50`，材質 `212 B`。 |
| 5 | **Stop & Report** | 點擊 "停止" -> "完工回報" | 跳出回報視窗，預設良品數 = 累計產量。 |
| 6 | **Fat Finger Test** | 快速連點 "確認" 按鈕 5 次 | 系統應只送出一筆完工請求，DB `ProductionLogs` 只有一筆 Completed 記錄。 |
| 7 | **Verify DB** | 檢查 `Orders` 表格 | Status = `Completed`, CompletedAt = 現在時間。 |

---

### Scenario 3: 特殊規格與異常處理 - PIZZA盒 (@domain-qa-specialist)
*目標：驗證 Data Set B (B250703007) 的特殊備註與異常流程*

**Pre-condition**: B250703007 is active.

| Step | Action (操作) | Input/Simulation | Expected Result (預期結果) |
|:----:|:---|:---|:---|
| 1 | **Check Warning** | 載入工單時 | **UI 應醒目提示 "注意：橫向打包、加護角"** (關聯欄位 `PackingType`, `Notes`)。 |
| 2 | **Machine Error** | 模擬 PLC 斷線 (停止發生訊號) | Dashboard 顯示 "連線中斷" (紅色)，且記錄最後產量。 |
| 3 | **Manual Recovery** | 恢復連線，手動修正產量 (補 50 pcs) | 系統應接受手動修正，並記錄在 Log 中 (Source=Manual)。 |
| 4 | **Shortage Close** | 產量僅 1900 (訂單 2000)，按 "強制完工" | 系統提示 "欠量 100"，確認後狀態為 `Completed` 但標記 `Shortage`。 |

---

### Scenario 4: 基礎設施韌性測試 (@iot-fullstack-architect)
*目標：驗證系統在惡劣環境下的穩定性*

| Step | Action (操作) | Expected Result (預期結果) |
|:----:|:---|:---|
| 1 | **Database Down** | 暫停 PostgreSQL 容器 | Frontend 顯示 "系統維護中" 或 "離線模式"，操作暫存於 LocalStorage/Redis。 |
| 2 | **Database Up** | 恢復 PostgreSQL | Backend 自動重連，積壓的數據 (Store-and-Forward) 寫入 DB。 |
| 3 | **Worker Restart** | `docker restart backend-worker` | MQTT 訂閱自動恢復，無數據遺失。 |

---

## 📝 驗收標準 (Acceptance Criteria)

1.  **資料完整性**: 新增的 Product/Order 欄位 (尺寸、材質、交期) 必須準確寫入與讀取，無亂碼或遺失。
2.  **排程操作**: 拖拉排序回應時間 < 500ms，且資料一致性 100%。
3.  **UI 提示**: 特殊規格 (如 Scenario 3 的橫向打包) 必須有視覺提示，避免現場做錯。
4.  **穩定性**: 壓力測試下 (10用戶並發 + 200m/min 訊號)，CPU 使用率 < 70%，無崩潰。

---

> **Note**: 使用此文件進行每次 Release 的回歸測試 (Regression Testing)。
