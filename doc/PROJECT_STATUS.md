# Flexo IoT 專案狀態報告 (Project Status)

**最後更新時間**: 2026-01-19
**目前階段**: 系統驗收與移交 (System Acceptance & Handover)

## 1. 系統模組狀態 (System Modules)

| 模組 | 狀態 | 說明 |
| :--- | :--- | :--- |
| **Frontend (React)** | 🟢 Stable | 包含即時監控、排程、報表查詢、生產分析與多語系支援。 |
| **Backend API (.NET 9)** | 🟢 Stable | 升級至 .NET 9。提供穩定 REST API 與 Swagger 文件。 |
| **Backend Worker (.NET 9)** | 🟢 Stable | 處理 MQTT 訊號 (WISE/模擬器)。經壓力測試驗證 (50 users/60s)。 |
| **Database (PostgreSQL)** | 🟢 Stable | Schema 包含詳細產品規格與生產履歷。 |
| **Infrastructure (Docker)** | 🟢 Stable | 包含 MQTT Broker, Redis, Cloudflared Tunnel。 |

## 2. 最近完成項目 (Recent Accomplishments)

*   **[Infra] .NET 9 Upgrade**: 全面對應開發環境，升級後端所有專案至 .NET 9。
*   **[Infra] 雙系統部署**: 完成 `Printing IoT` (Edge) 與 `Flexo IoT HQ` (Cloud) 的 Docker 容器化部署與連線驗證。
*   **[QA] 壓力測試驗證**: 成功執行 API 壓力測試 (50 並發用戶)，系統無崩潰。
*   **[Doc] 標準測試案例**: 建立 `TEST_CASES.md` (Based on B250520010/B250703007)。
*   **[Doc] 系統移交文件**: 完成 `HANDOVER.md` 與 `FLEXO_HQ_INTEGRATION.md`。
*   **[Feat] 全面監控**: Dashboard 整合排程、生產履歷與即時訊號。

## 3. 待辦事項 (Backlog)

*   **[Feat] 拖拉排序 (Drag & Drop)**: 排程列表 UI 優化 (目前使用按鈕排序)。
*   **[Feat] 預防保養模組**: 擴充保養排程的自動提醒。
*   **[Doc] 多語系擴充**: 增加越南/泰文支援。

## 4. 風險與阻礙 (Risks & Blockers)

*   **OT 硬體依賴**: 需確認實體 WISE 模組的訊號特徵 (目前僅使用模擬器驗證)。
*   **Redis Cluster**: 若未來擴充至 10+ 產線，建議從單機 Redis 升級為 Cluster 模式。

---
> 此文件由 `@project-sync-manager` 維護，每日更新。
