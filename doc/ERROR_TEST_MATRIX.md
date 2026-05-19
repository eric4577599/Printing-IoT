# Error-Test Traceability Matrix (錯誤與測試追蹤矩陣)

本文件紀錄了系統在開發、重構或維運過程中發現的所有重要 Bug，以及它們如何被隔離、測試覆蓋與修復的生命週期。

> **原則（Test-Driven Bug Fixing）：**
> 任何 Bug 的修復都必須先擁有能夠重現該問題的 Regression Test。

## 追蹤總表

| Bug ID | 模組 | 問題描述 | 關聯測試案例 (Test Case ID) | 狀態 | 修復日期 |
|--------|------|----------|---------------------------|------|----------|
| P2-001 | Frontend | macOS 編譯環境因 `._` 資源檔案解析錯誤導致 Vitest 崩潰 | `hooks.test.js` (環境層面) | ✅ Closed | 2026-04-10 |
| P3-001 | Backend | API 專案存在多個 `._*.csproj` 導致 `dotnet build` 無法判定主要專案 | — (環境層面) | ✅ Closed | 2026-04-12 |
| P3-002 | Infrastructure | 缺少 `Microsoft.Extensions.Logging.Abstractions` 導致無法共用重試邏輯 | 整合環境驗證 | ✅ Closed | 2026-04-12 |
| P4-001 | Auth | 在空資料庫情況下首次無法登入 | `AuthControllerTests.SetupAdmin_CreatesUser_WhenDatabaseEmpty` | ✅ Closed | 2026-04-12 |

## 詳細分析紀錄

### P4-001: Bootstrap Admin User Issue
- **症狀**: 當啟用 JWT 與資料庫驗證後，因為是空關聯式資料表，系統管理員無法登入進行初始使用者配置。
- **重現條件**: 執行完整 Docker-compose `up -d` 後，請求 `/api/v1/auth/login` 會一律回傳 401。
- **修復方案**: 開發專用之 `/setup-admin` API 路由，限定在 `_context.Users.Any()` 為 `false` 時才可呼叫，初始化預設管理員與其對應角色。
- **影響範圍**: 僅限初次部署。
- **Regression Test**: 
  - `SetupAdmin_CreatesUser_WhenDatabaseEmpty` (確保正常初始化)
  - `SetupAdmin_ReturnsBadRequest_WhenDatabaseNotEmpty` (防止後門重複呼叫)
