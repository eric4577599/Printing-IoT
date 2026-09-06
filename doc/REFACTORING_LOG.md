# 重構變更紀錄 (Refactoring Log)

> 記錄每一步的變更決策、影響範圍與對應測試。
> 此文件可透過前端 `/docs` 路由在線檢視。
>
> **⚠ 2026-07 註記**：本日誌所載「SmartParts 整併入主系統」為 2026-04 整併階段的歷史紀錄；2026-06／07 已依方案 C′ 反向拆分——保養維修與零件管理均已移出至 MM 外掛，`sm-frontend` 與 :5100 已退役。整併敘述僅為歷史，現況請見 `doc/PROJECT_STATUS.md`。正文凍結未改寫。

---

## Phase 1：基礎清理與文件對齊

### 1.1 修正 README.md
- **日期**: 2026-04-10
- **變更**: 技術架構從 Python FastAPI 修正為 .NET 8 ASP.NET Core
- **原因**: README 描述與實際後端技術不符（可能為初始範本殘留）
- **影響**: 僅文件，不影響運行時行為

### 1.2 刪除 AnalysisPage.bak.jsx
- **日期**: 2026-04-10
- **變更**: 移除 `frontend/src/pages/AnalysisPage.bak.jsx` (44KB)
- **原因**: 備份檔殘留於正式目錄，增加混淆
- **影響**: 無功能影響（已有 `analysis/AnalysisPage.jsx` 替代）

### 1.3 移除硬編碼版本字串
- **日期**: 2026-04-10
- **變更**: `App.jsx` 版本字串改為讀取 `package.json` 的 `version` 欄位
- **機制**: Vite `define` plugin 在建置時注入 `__APP_VERSION__`
- **影響**: 版本號自動同步 package.json，無需手動維護

### 1.4 API Stub 標記 TODO
- **日期**: 2026-04-10
- **變更**: `setCurrentOrder` / `clearCurrentOrder` 標記 `TODO(Phase3)` + `console.warn`
- **原因**: 原始 stub 使用 `console.log` 容易被忽略
- **追蹤**: 計畫在 Phase 3 後端統一時實作真實端點

### 1.5 Docker-Compose 密碼環境變數化
- **日期**: 2026-04-10
- **變更**: 所有 `POSTGRES_PASSWORD=password` 替換為 `${POSTGRES_PASSWORD:-password}`
- **原因**: 硬編碼密碼不適用於生產環境
- **向後相容**: 使用 `:-default` 語法，開發環境無需設定仍可正常啟動

### 1.6 建立 .editorconfig
- **日期**: 2026-04-10
- **變更**: 新增統一編碼風格設定（.NET 4-space, JS 2-space, LF 換行）
- **原因**: 多人協作需統一 indent/charset 避免 diff 污染

### 1.7 建立 DocsPortal 路由骨架
- **日期**: 2026-04-10
- **變更**: 新增 `/docs` 路由與 `DocsPortal.jsx` 組件
- **功能**: 左側文件索引 + 右側內容閱覽器
- **待完成**: 後端 `/api/docs/:filename` 端點（Phase 3），react-markdown 渲染器（Phase 2）

### 1.8 建立重構變更紀錄
- **日期**: 2026-04-10
- **變更**: 本文件 (`doc/REFACTORING_LOG.md`)
- **用途**: 所有重構步驟的決策、影響與追蹤紀錄

---

## Error-Test Traceability

| Bug ID | 描述 | Test Case ID | Status |
|--------|------|-------------|--------|
| — | Phase 1 無 Bug (純文件/配置清理) | — | — |

> 後續 Phase 發現的 Bug 將在此表登錄，同步於 `doc/ERROR_TEST_MATRIX.md`

---

## Phase 2：前端重構 — Dashboard 分拆

### 2.1 抽取 useSimulation Hook
- **日期**: 2026-04-10
- **變更**: `Dashboard.jsx` L651-L724 的模擬引擎邏輯 → `hooks/useSimulation.js`
- **功能**: 支援 Local/Remote 模式、speedFactor 速度控制、MQTT 發佈
- **行數**: 約 115 行

### 2.2 抽取 useFKeyHandler Hook
- **日期**: 2026-04-10
- **變更**: `Dashboard.jsx` L435-L635 的 F-Key 虛擬鍵盤處理 → `hooks/useFKeyHandler.js`
- **功能**: F1-F12 鍵盤事件分派、F3 開單、F4 完工、F10 退回等核心邏輯
- **行數**: 約 245 行（含 helperFn handleF3 / handleF10）

### 2.3 抽取 useProductionTimer Hook
- **日期**: 2026-04-10
- **變更**: `Dashboard.jsx` L786-L808 的計時器邏輯 → `hooks/useProductionTimer.js`
- **功能**: jobRunTime / todayRunTime / stopTime / prepTime 追蹤
- **包含**: `formatDuration()` 工具函數

### 2.4 抽取 useRealtimeData Hook
- **日期**: 2026-04-10
- **變更**: `Dashboard.jsx` L733-L765 的 API 輪詢 + Tare 邏輯 → `hooks/useRealtimeData.js`
- **功能**: 每秒輪詢後端 API、初始化 Offset (Tare)、本地模擬跳過

### 2.5 分離翻譯 JSON
- **日期**: 2026-04-10
- **變更**: 繁體中文翻譯從 `LanguageContext.jsx` (1085行) 抽取至 `locales/tw.js`
- **架構**: `locales/index.js` 提供統一入口，後續 cn/en/vn/th 待遷移

### 2.6 Zustand Store 取代 useOutletContext
- **日期**: 2026-04-10
- **變更**: 新增 `stores/productionStore.js` 集中管理 orders/products/logs/simulation/PLC 狀態
- **原因**: MainLayout 547 行中約 200 行是狀態管理邏輯，透過 useOutletContext 傳遞給所有子頁面
- **優勢**: 任何組件可直接 import 使用，無需 Provider、內建 localStorage 持久化

### 2.8 Hook Unit Tests
- **日期**: 2026-04-10
- **測試框架**: Vitest + @testing-library/react + jsdom
- **測試結果**: 28/28 tests passed, 3/3 test files, 1.77s
- **涵蓋範圍**:
  - `useRealtimeData`: 初始化、輪詢、模擬跳過、Offset、錯誤容錯 (6 tests)
  - `useProductionTimer` + `formatDuration`: 計時器增量、重置、格式化、邊界値 (11 tests)
  - `productionStore`: Orders CRUD、Products CRUD、Logs 管理、Log 上限 (11 tests)

### 2.9 DocsPortal 操作紀錄整合
- **日期**: 2026-04-10
- **變更**: DocsPortal 新增「即時操作紀錄」分頁
- **功能**: 從 Zustand Store 讀取 logs 即時顯示，支援色彩分類 (失敗=紅, 成功=綠)

---

### Phase 2 Error-Test Traceability

| Bug ID | 描述 | Test Case ID | Status |
|--------|------|-------------|--------|
| P2-001 | macOS `._` dot-underscore 檔案導致 Vitest parse 失敗 | — (環境問題，非代碼 Bug) | ✅ 已清理 |

---

## Phase 3：後端統一 — 合併服務

### 3.1 遷移 SmartParts Entities
- **日期**: 2026-04-12
- **變更**: `SmartParts.API/Entities/{Part,Supplier,SupplierPart}.cs` → `PrintingIoT.Core/Entities/Parts/`
- **namespace**: `SmartParts.API.Entities` → `PrintingIoT.Core.Entities.Parts`
- **影響**: 實體定義完全相同，僅 namespace 變更

### 3.2 MMS Entities 去重
- **日期**: 2026-04-12
- **發現**: `MMS.Core/Entities/` 與 `PrintingIoT.Core/Entities/Maintenance/` 完全相同（逐行一致）
- **決策**: 無需遷移，直接使用已存在的 Core/Entities/Maintenance/
- **影響**: 無

### 3.3 遷移 SmartParts Controllers + Services
- **日期**: 2026-04-12
- **變更**:
  - DTOs → `PrintingIoT.Core/DTOs/Parts/PartDtos.cs`
  - Interface → `PrintingIoT.Core/Interfaces/IPartService.cs`
  - Service → `PrintingIoT.Infrastructure/Services/PartService.cs`
  - Controller → `PrintingIoT.API/Controllers/PartsController.cs`
- **路由**: 保留 `api/v1/parts`（向後相容 smart-parts-frontend）
- **DbContext**: 由 `SmartPartsDbContext` 改為 `PrintingContext`

### 3.5 統一 DbContext
- **日期**: 2026-04-12
- **變更**: `PrintingContext` 新增 `Parts`, `Suppliers`, `SupplierParts` DbSet
- **Fluent Config**: 移植 InternalPN 唯一索引、外鍵關聯、Price 精度設定

### 3.7 共用 Migration Retry
- **日期**: 2026-04-12
- **變更**: `Infrastructure/Extensions/DatabaseMigrationExtensions.cs`
- **原因**: `PrintingIoT.API/Program.cs` 與 `SmartParts.API/Program.cs` 有完全重複的 retry 代碼
- **改進**: 使用泛型 `MigrateWithRetryAsync<TContext>`，結構化日誌取代字串插值

### 3.8 Global Exception Handler
- **日期**: 2026-04-12
- **變更**: `API/Middleware/GlobalExceptionHandlerMiddleware.cs`
- **功能**: 統一將未處理例外轉為結構化 JSON 回應 (status, error, message, traceId)
- **映射**: InvalidOperationException→409, KeyNotFoundException→404, UnauthorizedAccessException→401

### 3.9 更新 docker-compose
- **日期**: 2026-04-12
- **變更**:
  - 移除 `sm-backend` 服務（已合併至 backend-api）
  - 移除 `mms-backend` 服務（MaintenanceController 已在 backend-api）
  - `sm-frontend` 改依賴 `backend-api`
  - 移除 `POSTGRES_MULTIPLE_DATABASES` 和 init-multiple-dbs.sh
- **服務數量**: 8 → 6

### 3.10 PartService Unit Tests
- **日期**: 2026-04-12
- **新增**: `PrintingIoT.Tests/PartServiceTests.cs` (6 tests)
- **覆蓋**: GetParts 空集合、Create 成功、重複 InternalPN 拒絕、關鍵字過濾、供應商關聯、供應商重用
- **結果**: 12/12 全通過 (含原有 SpeedCalculator + Integration tests)

### 3.13 DocsController API
- **日期**: 2026-04-12
- **變更**: `API/Controllers/DocsController.cs`
- **端點**: `GET /api/docs` (列表), `GET /api/docs/{filename}` (內容)
- **安全**: Path.GetFileName 防目錄遍歷、僅允許 .md 檔案

---

### Phase 3 Error-Test Traceability

| Bug ID | 描述 | Test Case ID | Status |
|--------|------|-------------|--------|
| P3-002 | Infrastructure 缺少 DI/Logging Abstractions 套件 | — (套件依賴) | ✅ 加入 csproj |

---

## Phase 4：安全性強化 (Security Hardening)

### 4.1 CORS Hardening
- **日期**: 2026-04-12
- **變更**: `PrintingIoT.API/Program.cs` 的 CORS 設定
- **功能**: 移除 `AllowAnyOrigin()`，改為讀取 `appsettings.json` 裡的 `Cors:AllowedOrigins` 列表。
- **影響**: 增強 API 防護，只允許定義過的 localhost 開發環境與正式環境的域名。

### 4.2 Auth Models & EF Migration
- **日期**: 2026-04-12
- **變更**: 新增 `User`, `Role`, `UserRole` 實體於 `PrintingIoT.Core/Entities/Auth/`
- **架構**: 多對多關係，透過 EF Core 流暢 API (Fluent API) 限制 Unique Username、Cascade Delete。
- **資料庫遷移**: 生成了 `Phase4_AuthModels` Migration，並預備更新。

### 4.3 AuthController (登入驗證 & JWT 發放)
- **日期**: 2026-04-12
- **變更**: 新增 `AuthController.cs` 及 `AuthDtos.cs`
- **功能**: 提供 `/api/v1/auth/login` 端點驗證密碼（使用 `BCrypt.Net-Next`）並簽發 JWT Token。
- **特殊端點**: 提供 `/setup-admin` 路由用於空資料庫建置初始管理員帳號。

### 4.4 JWT Middleware & Configuration
- **日期**: 2026-04-12
- **變更**: 於 `PrintingIoT.API/Program.cs` 註冊 JWT 驗證，並在 `appsettings.json` 加入 Secret, Issuer, Audience。
- **相依套件**: 安裝了 `Microsoft.AspNetCore.Authentication.JwtBearer` 9.0.0。

### 4.5 API 限流防禦 (Rate Limiting)
- **日期**: 2026-04-12
- **變更**: 引入 .NET 原生的 `AddRateLimiter` 和 `UseRateLimiter`
- **規則**: `FixedWindowRateLimiterOptions`，基於 Client IP (RemoteIpAddress) 限制為每分鐘 100 次請求。
- **優勢**: 降低暴力破解密碼（Brute-force）與 DoS 攻擊風險。


