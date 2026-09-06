# 開發規範(dev 套件)

> 由 `/seed dev` 套進專案根。本檔只寫**程式開發專案通用**的規範;
> 專案特有的架構、服務、路徑寫在下方「專案區」,不要改上半部。

## 完工定義(DoD)

不可自己宣告完工。程式專案的判準是:

1. 新功能**附測試**且測試通過 —— 沿用專案既有框架(Python→pytest、JS/TS→vitest、Go→testing、C#→xUnit),檔案與被測檔同層或對應 `tests/`。
2. 跑過一次真實情境,不是只有單元測試綠燈。
3. 有 lint / type check 的專案要一併通過。

說「**嚴格測試**」時升級:覆蓋率 ≥ 80%,含正常與邊界案例。

## 程式碼

- 註解用**正體中文**,函式級,說明輸入 / 輸出 / 邏輯。格式自由。
- 寫出來的程式碼要像周圍的程式碼:沿用既有命名、慣例與註解密度,不要引入新風格。
- 不主動加相依套件;需要時先問。

## Commit

Conventional Commits:`feat:` `fix:` `docs:` `refactor:` `test:` `chore:`。
一個 commit 一件事;`push` 依全域 §0 需明確同意。

## 錯誤處理

自動重試 **1 次**,仍失敗就停下回報(附錯誤訊息 + 建議解法)。說「自主處理」時才自行判斷是否續做。

## 交付

- 任務報告 `docs/report{YYYYMMDD}-{序號}.md`,規格 `docs/spec{YYYYMMDD}-{序號}.md`(依全域 §3)。
- 有 page spec 的專案:**改頁面前先讀 `docs/page_spec_<頁面>.md`,改完必須回寫**(PostToolUse hook 會檢查 spec 是否比程式碼舊)。
- 事實(架構決策、Bug 根因)寫 L3;教訓與偏好寫 L2;都不要塞進本檔。

---

## 專案區(以下由各專案自行填寫)

### 技術棧

- 後端 **.NET 9**(全部 csproj `net9.0`)—— API / Worker / Core / Infrastructure / Tests 五個專案,EF Core + PostgreSQL 15 + Redis 7 + MQTTnet(Mosquitto)。
- 前端 **React 19 + Vite 7 + Leaflet**;測試 vitest,lint eslint。
- 後端測試 **xUnit** + Moq + EF Core InMemory + `Mvc.Testing`。
- 週邊:MinIO(S3)、Modbus(Pymodbus)、PaddleOCR、Google Gemini、Cloudflare Tunnel。

### 服務與啟動方式

- 全套:`docker compose up -d --build`(先 `cp .env.example .env`,`JWT_SECRET` 必填)。
- Port:前端 **5600**、API **5200**(`/swagger`)、Postgres **5433**、Redis **6380**、MQTT **1884**、MQTT WS 9001。
- 前端單開:`cd frontend && npm run dev`。
- 測試:`cd frontend && npm run test`(vitest) + `dotnet test backend/PrintingIoT.sln`(xUnit)。
- Lint:`cd frontend && npm run lint`。

### 資料庫與重要路徑

- 單一資料庫 **`FlexoDB`**(Phase 3.9 起舊拆分庫已整併,不要再假設有多個 DB)。
- 專案根 `/Volumes/G70Pro/cusor pool/Printing IoT`(正式運行路徑,X10Pro 那份已刪除)→ [[printingiot-runtime-path-g70pro]]。
- **`doc/`** = 系統設計文件,由 `DocsController`(`/api/docs`)+ 前端 `/docs` 路由對外提供 —— 丟進 `doc/*.md` 的東西**會出現在產品 UI**,寫之前先想清楚。
- **`docs/`** = 依全域 §3 的 report / spec 交付物,不對外。兩者只差一個 s,別放錯。
- MM 外掛在獨立 repo:`/Volumes/G70Pro/cusor pool/MM/`。

### 這個專案跟通則不同的地方

- 工作模式是 **RD↔QC 接力**,每版改善要跑**全情境**測試而非只測改動處;身分設定為瓦楞印刷領域專家 → [[rd-qc-relay-workmode]]。
- TeamChat workspace 固定 **team-iot**(`$TEAMCHAT_KEY_IOT`),不是預設的 Team LT。
- 本專案**沒有** page spec 檔;交付以 `docs/report*`、`docs/spec*` 與根目錄 `handoff.md` 為主。

### 已知的坑

- 保養維修 + 零件管理已外移到 MM 外掛,**主系統不得再加這兩類功能** → [[printingiot-maintenance-parts-moved-out]]。
- 前端 i18n 未完:Settings / modals / Docs 仍有約 340 字串硬編碼 → [[i18n-app-wide-retrofit]]。
- 排程訂單已改後端全量鏡像同步,**產品庫仍 localStorage-only** → [[schedule-orders-backend-sync]]。
- 前端改完要**重建容器**才會上線(compose 掛的是原始碼,實際服務的是 build 出來的 bundle)。
- macOS dot-underscore(`._*`)會弄壞 `dotnet build`:`find . -name "._*" -delete`。
- 大小寫:Mac 不敏感、Linux 容器敏感,import 路徑大小寫必須完全一致,否則本機過、進 Docker 炸。
