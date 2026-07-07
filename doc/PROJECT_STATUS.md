# Flexo IoT 專案狀態報告 (Project Status)

**最後更新時間**: 2026-07-07
**目前階段**: C′ 遷移收尾（零件管理已移出，文件對齊完成）

## 1. 系統模組狀態 (System Modules)

| 模組 | 狀態 | 說明 |
| :--- | :--- | :--- |
| **Frontend (React)** | 🟢 Stable | 包含即時監控、排程、報表查詢、生產分析與多語系支援。導航 6 鈕：即時監控／生產排程／生產報表／生產分析／系統設定／文件。 |
| **Backend API (.NET 9)** | 🟢 Stable | 升級至 .NET 9。提供穩定 REST API 與 Swagger 文件。 |
| **Backend Worker (.NET 9)** | 🟢 Stable | 處理 MQTT 訊號 (WISE/模擬器)。經壓力測試驗證 (50 users/60s)。 |
| **Database (PostgreSQL)** | 🟢 Stable | Schema 包含詳細產品規格與生產履歷。FlexoDB 已無零件三表（`RemoveSmartPartsModule` migration）。 |
| **Infrastructure (Docker)** | 🟢 Stable | 7 服務：backend-api / backend-worker / cloudflared / frontend / mqtt-broker / postgres / redis。`sm-frontend` 與 :5100 已退役。 |
| **保養維修 → MM 外掛** | 📦 已移出 | 2026-06 依 C′ 移出至獨立外掛 MM（`/Volumes/G70Pro/cusor pool/MM/`），主系統不再提供保養功能。 |
| **零件管理 → MM 外掛** | 📦 已移出 | 2026-07 依 C′ 併入 MM（`/api/v1/parts`、`/api/v1/suppliers`、`/api/v1/supplier-parts`），FlexoDB 資料已搬移至 MmsDB。 |

## 2. 最近完成項目 (Recent Accomplishments)

*   **[Arch] C′ 遷移 P0–P4**: 零件管理（Parts / Suppliers / SupplierParts）自主系統移出併入 MM 外掛；主系統瘦身（刪除 `smart-parts-frontend/`、`backend/SmartParts.API/`，`api/v1/parts` 路由移除，:5100 釋出）。
*   **[Doc] P5 文件對齊**: 專案文件盤點校正、操作說明書 v3.0 定稿（`doc/操作說明文件.html`）。
*   **[Infra] .NET 9 Upgrade**: 全面對應開發環境，升級後端所有專案至 .NET 9。
*   **[Infra] 雙系統部署**: 完成 `Printing IoT` (Edge) 與 `Flexo IoT HQ` (Cloud) 的 Docker 容器化部署與連線驗證。
*   **[QA] 壓力測試驗證**: 成功執行 API 壓力測試 (50 並發用戶)，系統無崩潰。
*   **[Doc] 標準測試案例**: 建立 `TEST_CASES.md` (Based on B250520010/B250703007)。

## 3. 待辦事項 (Backlog)

*   **[Infra] Cloudflare 儀表板三步驟（待 Eric 手動執行）**: 建立 `mms.ericchh.work` hostname、移除 `smartparts.ericchh.work` hostname、設定 301 轉址（步驟見 `docs/report20260707-1.md` §6.3）。生效前 MM 請走本機入口 `http://localhost:5301`。
*   **[Feat] 拖拉排序 (Drag & Drop)**: 排程列表 UI 最佳化 (目前使用按鈕排序)。
*   **[Doc] 多語系擴充**: 增加越南/泰文支援。

## 4. 風險與阻礙 (Risks & Blockers)

*   **OT 硬體依賴**: 需確認實體 WISE 模組的訊號特徵 (目前僅使用模擬器驗證)。
*   **Redis Cluster**: 若未來擴充至 10+ 產線，建議從單機 Redis 升級為 Cluster 模式。

---
> 此文件由 `@project-sync-manager` 維護。
