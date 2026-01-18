# Flexo IoT 專案跨部門檢討報告 (Project Review)

**Date**: 2026-01-16
**Topic**: 架構合理性與未來優化建議
**Participants**: AI Team (Architect, OT, QA, Test, Maintenance, UI)

---

## 1. 架構與系統面 (Architecture & System)

### 🏗️ @iot-fullstack-architect (全端架構師)
我檢視了最新的 `SASD說明書.md`，目前規劃轉向 **.NET 8** 是正確的決定，能提供比 Python 更強的型別安全與效能。

*   **現狀問題**: 目前後端程式碼 (`mqtt_subscriber.py`) 仍是 Python 原型。
*   **建議事項**:
    1.  **遷移計畫**: 需盡快建立 .NET Solution，包含 `Worker Service` (處理 MQTT) 與 `Web API`。
    2.  **Docker 化**: 現有的 `docker-compose.yml` 需更新，加入 .NET Runtime 容器。
    3.  **Redis 緩存**: 建議在 Worker 與 API 之間加入 Redis。即時監控數據 (`factory/monitor/update`) 頻率高，直接寫入 DB 會造成 IO 壓力，應先存 Redis，再批次寫入 PostgreSQL。

## 2. OT 與現場面 (OT & Field)

### ⚙️ @ot-production-expert (OT 生產專家)
針對 MQTT 協議與模擬訊號部分，我有以下疑慮：

*   **現狀問題**: 目前使用 WISE 模組的 `d1` (Digital Input) 來計數並計算長度/速度。
*   **潛在風險**:
    *   **頻率限制**: 一般 DI 若非高速計數通道 (High Speed Counter)，在車速快 (e.g. >200m/min) 時可能會漏掉脈衝 (Pulse Loss)，導致計米不準。
    *   **模擬真實性**: 目前模擬器只送 `d1` 和 `speed`。但真實機台會有「張力控制」、「緊急停止」等多種訊號。
*   **建議事項**:
    1.  **硬體確認**: 確認現場 WISE 模組型號是否支援頻率足夠的 Counter Mode。
    2.  **訊號擴充**: 建議 MQTT Payload 預留 `error_code` (故障碼) 欄位，以便未來與 PLC 整合時能傳送停機原因 (如：斷紙、馬達過熱)。

## 3. 測試與品質 (Test & QA)

### 🧪 @automated-test-engineer (自動化測試)
*   **現狀觀察**: `verify_simulation_loop.py` 是很好的整合測試 (Integration Test)，驗證了 MQTT 迴路。
*   **建議事項**:
    1.  **單元測試 (Unit Test)**: 在轉移到 .NET 後，`SpeedCalculator` 邏輯必須與 MQTT 解耦，這樣我才能用 xUnit 寫單元測試，不需要依賴真實 Broker。
    2.  **負載測試**: 用戶端可能有多個 Dashboard 同時開啟，需測試 Backend 廣播 `factory/monitor/update` 給多個 WebSocket 客戶端時的延遲。

### 🕵️ @domain-qa-specialist (領域 QA)
*   **現狀觀察**: 雙模模擬 (Local/Remote) 對於測試 UI 很有幫助。
*   **場景漏洞**:
    1.  **瀏覽器崩潰**: 如果在生產中途瀏覽器當機，目前的 `localStorage` 備份機制夠嗎？重開後能「恢復」原本的計數嗎？
    2.  **網路瞬斷**: 如果 Backend 斷線 10 秒又恢復，Dashboard 的數據會跳變 (Jump) 嗎？這可能會嚇到操作員。
*   **建議事項**:
    1.  **斷點續傳 (Resuming)**: 後端 DB 應該是單一真理來源 (SSOT)。前端重連時，應主動詢問後端「當前工單狀態」，而非只依賴 Local。

## 4. 維運與保養 (Maintenance)

### 🛠️ @smart-maintenance-mgr (保養經理)
*   **現狀觀察**: 目前只記錄了「產量」與「速度」。
*   **建議事項**:
    1.  **預防保養數據**: 為了做到「預防保養」，我需要更多類比訊號 (Analog)。例如 `Motor Current` (電流) 或 `Temperature` (溫度)。當電流異常升高時，通常代表軸承磨損或潤滑不足。
    2.  **Schema 擴充**: 建議在 `ProductionLog` 資料表中預留 `Analog1`, `Analog2` 欄位。

## 5. 介面體驗 (UI/UX)

### 🎨 @creative-ui-designer (UI 設計師)
*   **現狀觀察**: Dashboard 介面功能完整，且有模擬開關。
*   **建議事項**:
    1.  **權限隔離**: 「Local/Remote 模擬切換」選單不應該直接暴露給現場操作員 (Operator)。這容易導致誤觸，以為自己在生產其實是在 Local 模擬。建議藏在「Settings」頁面或僅限 Admin 角色可見。
    2.  **視覺回饋**: 當 MQTT 連線中斷時（也就是紅燈亮起時），應該要有更明顯的遮罩 (Overlay) 或提示，避免操作員看著舊數據以為產線停了。

---

## 總結 (Executive Summary)

團隊一致認為目前的 **「雙軌架構」** 與 **「.NET 轉型計畫」** 方向正確。主要風險在於 **OT 硬體極限** (DI 計數頻率) 與 **前端異常恢復機制**。

**Next Steps (優先順序)**:
1.  (Architect) 建立 .NET Solution 骨架。
2.  (UI) 將模擬切換功能隱藏至 Admin 權限。
3.  (OT/Backend) 確認硬體規格，並在 Schema 中擴充預防保養欄位。
4.  (QA) 設計「瀏覽器崩潰恢復」的測試劇本。
