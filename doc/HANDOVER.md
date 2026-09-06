# 專案結案狀態與交接清單 (Project Status & Handover)

> **⚠ 2026-07 現況更新（正文為 2026-04-12 結案總結，已凍結，閱讀前必看）**
>
> 本文「三套後端收攏為單一 API、統一存 FlexoDB」之敘述已與現狀相反，2026-06／07 已依方案 C′ 重新拆分：
>
> - **保養維修**（2026-06）與**零件管理**（2026-07）已移出主系統，併入獨立外掛 **MM**（`/Volumes/G70Pro/cusor pool/MM/`，設備資產管理外掛，兩元件並立），與主系統真分離、無程式碼相互依賴。
> - MM 對外入口 `mms.ericchh.work` **待 Cloudflare 設定生效（待 Eric 手動執行）**；生效前請使用 MM 本機入口 `http://localhost:5301`。
> - `sm-frontend` 與 :5100 已退役；主系統 compose 為 7 服務（backend-api / backend-worker / cloudflared / frontend / mqtt-broker / postgres / redis）。
> - FlexoDB 已無 `Parts` / `Suppliers` / `SupplierParts` 三表（`RemoveSmartPartsModule` migration），資料已搬移至 MmsDB。
> - 正文「後端測試包含 Part CRUD」等描述屬結案當時快照，現行測試以 `dotnet test` 實跑為準。
>
> 最新現況請見 `doc/PROJECT_STATUS.md` 與 `README.md`。

本文件紀錄了 Printing IoT 系統經歷 5 個階段重構後的最終技術狀態與接手工程師注意事項。

## 系統現況 (Current State)

- **前端框架**: 升級至 React 19 + Vite，全面採用 `Zustand` 作為中央狀態管理（取代原本近千行的 Context drilling）。
- **後端架構**: 將原有三套分離後端程式 (`PrintingIoT`, `SmartParts`, `MMS`) 與三座不同資料庫完美收攏為單一直出 API，並統一儲存至 `FlexoDB`。
- **認證體系**: 引入 JWT Authentication + BCrypt，擁有 Role-based 的存取控制架構 (`Users`, `Roles`, `UserRoles`)，具備 Rate Limiting 限流防禦。
- **測試覆蓋**: 
  - 前端：28 單元測試，涵蓋所有關鍵業務 Hooks (包含計時引擎、即時數據輪詢、虛擬鍵盤分配等)
  - 後端：14+ 單元測試，100% 通過（包含 Part CRUD、JWT 核發、Migration 自動重試邏輯）
- **CI/CD**: `.github/workflows/ci.yml` 已配置上線。
- **文件網站**: 新增內部開發者專用的 `/docs` 路由（DocsPortal），無縫整合 `doc/` 內的 Markdown 及即時操作日誌 (Live Logs)。

## 架構特點 (Architecture Highlights)

1. **Clean Architecture (後端)**：分離 `API`, `Infrastructure`, `Core` 三層。
2. **Modular Components (前端)**：超大型 `Dashboard.jsx` 抽離後，所有生產邏輯已被模組化為自定義 hooks。
3. **Graceful Error Handling**：後端擁有全域中介軟體統一拋出格式化 JSON Error，取代了過去四散的 `try-catch`。

## 交接注意事項 (Developer Onboarding)

1. **環境建置**: 取出專案後，只需在根目錄下指令 `docker-compose up -d --build`，即可帶起 Frontend, Backend, PostgreSQL, Redis, MQTT Broker。
2. **隱藏地雷 (macOS)**: 若在 Mac 機器上開發，避免產生 `.DS_Store` 或資源分支文件 (`._*`)。若 `dotnet build` 異常，可使用 `.gitignore` 中記錄的指令清除 `._*` 殘毒（或於根目錄執行 `find . -name "._*" -delete`）。
3. **初次登入**: 初次建置資料庫是空的時候，請對呼叫一次 `POST /api/v1/auth/setup-admin?password=您的密碼` 開通第一個 Admin 帳號，否則無人能登入。
4. **IoT 推播規則**: `PrintingIoT.Worker` 在背後仍然走 MQTT，而前端在 `useRealtimeData` Hook 內採用 Polling 結合本地端模擬模式。當機台未上線時可透由 Zustand 調整此屬性。

> 以上為 Printing IoT 重構計畫 Phase 1 到 Phase 5 的最終技術遺產總結（2026-04-12）。
