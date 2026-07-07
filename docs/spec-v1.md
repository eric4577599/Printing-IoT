# 規格 — C′ 遷移收尾 回1:P5 文件對齊(純文件回合)

> 日期:2026-07-07(`date` 取得)
> 撰寫:PM subagent(本檔覆寫回3 規格;回3 原文已歸檔至 `docs/spec20260707-1.md` 並完成 AC-4 勘誤,見 §5)
> 目標 repo 1:`/Volumes/G70Pro/cusor pool/Printing IoT`(分支 `feat/extract-maintenance`,可 commit,**禁止 git push**)
> 目標 repo 2:`/Volumes/G70Pro/cusor pool/MM`(main 線,可 commit,**禁止 git push**)
> 設計依據:`doc/spec20260704-1.md` §4 P5;前置 P0–P4 已全數 PASS(總結 `docs/report20260707-2.md`、P4 RD 報告 `docs/report20260707-1.md`)

---

## 0. 範圍界定

### 本回做(P5,五個工作項)

1. 主系統專案文件盤點與校正(HANDOVER、PROJECT_STATUS、開發說明書、README 等)
2. 操作說明書定稿(`doc/操作說明文件.html`)
3. 規格勘誤(回3 AC-4「Cascade FK」→ Restrict;PM 已代辦歸檔,RD 驗證即可)
4. MM repo 文件對齊(README、CLAUDE.md 等)
5. 兩 repo 文件與工作檔各自 commit 納入版控

### 本回明確不做(硬性紅線)

- **不動任何程式碼與部署檔**:`*.cs`、`*.jsx`、`*.js`(程式)、`*.csproj`、`*.sln`、`docker-compose.yml`、`Dockerfile`、`nginx.conf`、`.env` 等**僅可讀不可改**。本回 git diff 只允許出現文件檔(`.md`、`.html`)。
- **不執行 Cloudflare 儀表板三步驟**(建 mms hostname / 移除 smartparts hostname / 301)— 該事項**待 Eric 手動執行**,所有文件一律如實標示,**不可寫成已完成**。
- **不改歷史報告、會議紀錄、歷次 spec/report**(`doc/report*.md`、`doc/2026*` 會議紀錄、`doc/spec20260606-1.md`、`doc/spec20260704-1.md`、MM `docs/` 歷次報告等)— 歷史敘述凍結;確屬「會誤導接手者的過時現況文件」者,只允許**在檔頭加註記**,不重寫正文(見 §2.1 處置欄)。
- **不動備品/保養以外領域內容**:主系統瓦楞生產文件(SASD說明書、MQTT訊息處理流程、FLEXO_HQ_INTEGRATION、STRESS_TEST_REPORT、TEST_CASES 等)非本回對象;僅當其中含「零件管理仍在主系統」類過時敘述時才校正該句,不得順手改寫其他內容。
- 任何 `git push`(兩 repo 皆禁)。

### 準繩(全程遵守)

- 全部新寫/修改文字為**正體中文(台灣用語)**(既有英文技術名詞、指令、程式碼區塊不在此限)。
- 「零件管理」= Parts/Suppliers/SupplierParts(採購主檔,已入 MM `/api/v1/*`);「備品零件」= SpareParts(MM `/api/parts`)。兩詞不可混用。
- MM 定位統一表述:「**設備資產管理外掛**」— 內含**保養維修**與**零件管理**兩元件並立(備品零件屬保養維修元件之庫存)。
- 事實不確定時以**程式碼與 compose 為準**(§1 事實基準表),不得抄舊文件。

---

## 1. 事實基準表(PM 已逐項核對程式/部署現況;RD 撰寫依據、Tester 抽查依據)

| # | 事實 | 值(2026-07-07 快照) | 佐證位置 |
|---|---|---|---|
| F1 | 主系統 compose 服務 | `backend-api`、`backend-worker`、`cloudflared`、`frontend`、`mqtt-broker`、`postgres`、`redis`(共 7,**無 sm-frontend**) | `docker-compose.yml`;`docs/report20260707-1.md` §4 |
| F2 | 主系統對外埠 | 前端 5600、backend-api 5200、FlexoDB 5433;**5100 已釋出(connection refused)** | 同上 |
| F3 | 主系統前端導航 | 6 鈕:即時監控/生產排程/生產報表/生產分析/系統設定/文件 | `frontend/src` 導航元件 |
| F4 | 主系統 `api/v1/parts` | **404(路由已不存在)**;`smart-parts-frontend/`、`backend/SmartParts.API/` 目錄已刪除 | commits `a17f71f`、`8069abe` |
| F5 | 主系統 migration 序列尾端 | `20260606021031_RemoveMaintenanceModule` → `20260706143822_RemoveSmartPartsModule` | `backend/PrintingIoT.Infrastructure/Migrations/` |
| F6 | MM compose 服務與埠 | `postgres`(5434)、`mms-backend`(5300)、`mms-frontend`(**5301:80**,本機直連入口;cloudflared 走網路別名不經此埠) | `MM/docker-compose.yml` |
| F7 | MM 前端頁籤 | **9 個**:設備台帳/維修清單/📦零件主檔/🏢供應商/🔩備品庫存(原「零件庫存」更名)/保養排程/歷史紀錄/照片管理/系統設定(順序以 `MM/frontend/src/App.jsx` 為準) | commit `5830934` |
| F8 | MM 零件管理端點 | `/api/v1/parts`(含 GET `/api/v1/parts/{id}`)、`/api/v1/suppliers`、`/api/v1/supplier-parts`;Controller 名 `PartsCatalogController`(避開備品 `PartsController`) | commits `b38dae0`、`d6289c2` |
| F9 | MM 備品端點 | `/api/parts`(SpareParts,與 F8 並立不混) | `MMS.API/Controllers` |
| F10 | MM migration 現況 | `20260706073656_InitialCreate`、`20260706074434_AddPartsManagement`;啟動已由 EnsureCreated 改 **`MigrateAsync()`**(既有庫 baseline) | `MM/backend/MMS.Infrastructure/Migrations/`;commit `aeb06e9` |
| F11 | MM 資料搬移腳本 | `MM/scripts/migrate-parts-data.sh`(FlexoDB→MmsDB 三表,冪等)+ `test-migrate-parts-data.sh`;備份落 `MM/backups/`(已 gitignore) | commit `a055bde`;MM `docs/report20260706-1.md` |
| F12 | MM 測試數 | 後端 dotnet test 65、前端 vitest 89(2026-07-07 快照,文件引用時須註記日期或改為不寫死) | `docs/report20260707-2.md` §2 |
| F13 | Cloudflare 現況 | `mms.ericchh.work` **NXDOMAIN(尚未生效)**;`smartparts.ericchh.work` 回 403(hostname 未移除、未 301)。三步驟指引在 `docs/report20260707-1.md` §6.3,**待 Eric 手動執行** | `docs/report20260707-1.md` §6 |
| F14 | 主系統 untracked 檔 | `doc/spec20260704-1.md`、`doc/操作說明文件.html`、`doc/整合設計與重新拆分規劃_20260617.md`、`docs/report20260707-2.md`、`docs/spec-v1.md`、`docs/spec20260707-1.md`、`handoff.md`、`tests/report-v1.md`、`tests/report-v2.md` | `git status` |

> RD 開工第一步:重跑 F1/F2/F5/F6/F7/F10/F14 的確認指令(`docker compose config --services`、`ls Migrations`、`git status` 等,唯讀),若與本表不符,以實況為準並在報告註明差異。

---

## 2. 工作項 1:主系統專案文件盤點與校正

**功能描述**:盤點主系統 repo 全部「現況型」文件,把 C′ 遷移後的事實(F1–F5、F13)落進去;歷史文件凍結、只加檔頭註記。

**輸入**:§1 事實基準表、下方盤點初表。
**輸出**:各檔修改 + RD 報告內「盤點結果表」(檔案 × 判定〔更新/檔頭註記/凍結不動〕× 修改摘要)。

### 2.1 盤點初表(PM 已初查,RD 須逐檔複核並補漏)

| 檔案 | 現況問題(PM 初查) | 處置 |
|---|---|---|
| `README.md` | 已有 C′ 註記(第 9 行);複核其餘段落是否仍描述零件管理/sm-frontend | 核對,必要時微調 |
| `doc/HANDOVER.md` | 「將原有三套分離後端(`PrintingIoT`, `SmartParts`, `MMS`)…收攏為單一 API 統一存 `FlexoDB`」已與現狀相反(MM 已再拆出、零件管理已移出);後端測試描述含「Part CRUD」;檔尾自述為 2026-04-12 結案總結 | 屬歷史結案文件 → **檔頭加「2026-07 現況更新」區塊**:載明 2026-06 保養維修、2026-07 零件管理已依 C′ 移出至 MM 外掛(路徑、mms.ericchh.work 待生效)、sm-frontend/:5100 已退役、FlexoDB 已無 Parts 三表;正文凍結不重寫 |
| `doc/PROJECT_STATUS.md` | 最後更新 2026-01-19;模組表無 MM 去向;待辦含「預防保養模組」(已外移);未提零件管理移出 | **更新為現況**:最後更新時間改今日(`date` 取得)、模組表補「零件管理/保養維修 → 已移出至 MM 外掛」列、待辦移除已外移項、補「Cloudflare 三步驟待 Eric 手動執行」一列 |
| `doc/開發說明書.md` | 2026-01-18 建立;RD 須通讀確認是否描述三後端/SmartParts/零件管理 | 通讀後:現況描述過時則更新或檔頭註記;無過時敘述則盤點表記「凍結不動」 |
| `doc/DEPLOYMENT_GUIDE_v1.md` | 整篇為 Smart Parts 部署指南(SmartPartsDB、:5100、smartparts hostname、smart-parts-frontend)— 全數已退役 | **檔頭加醒目「⚠ 已廢止(DEPRECATED,2026-07)」註記**:零件管理已併入 MM(`/Volumes/G70Pro/cusor pool/MM/`),部署見 MM README;smartparts.ericchh.work 轉址待 Eric 手動;正文保留為歷史 |
| `doc/操作說明書.md`(Markdown 舊版) | v2.x 時代操作說明,已被 v3.0 HTML 取代 | 檔頭加註「本文件已由 `doc/操作說明文件.html`(v3.0)取代,僅供歷史參考」 |
| `INSTRUCTIONS.md`、`doc/Operator Manual.md`、`doc/Supervisor_Manual.md`、其餘 `doc/*.md` | PM grep 未命中零件字樣,但未逐檔通讀 | RD 逐檔快掃(標題+grep `零件|SmartParts|sm-frontend|5100|smartparts`),命中才處理,結果進盤點表 |
| `handoff.md` | 工作交接檔,內容隨本回收尾更新 | 本回結束前依五欄位標準更新一次 |
| `doc/report*.md`、`doc/2026*` 會議紀錄、`doc/spec*.md`、`docs/report*.md`、`tests/report*.md` | 歷史紀錄 | **凍結不動**(盤點表記明) |

### 2.2 Edge case

| 情境 | 預期行為 |
|---|---|
| 某文件同段落混雜「過時零件敘述」與「有效瓦楞領域內容」 | 只改零件相關語句,其餘一字不動;diff 須可逐行對應盤點表摘要 |
| 「零件庫存」字樣出現在 MM 備品語境(如 `doc/操作說明書.md` 的備品表格) | 屬備品領域,**不是**零件管理殘留 — 不改語意;至多在該檔檔頭註記已被 v3.0 取代 |
| RD 發現盤點初表外的過時檔案 | 一併處理並列入盤點表(仍受 §0 紅線約束) |
| 文件中提及 mms.ericchh.work | 一律附註「待 Cloudflare 設定生效(待 Eric 手動執行);MM 本機入口 http://localhost:5301」 |

---

## 3. 工作項 2:操作說明書定稿(`doc/操作說明文件.html`)

**功能描述**:把 v3.0 說明書從「修正評估草案」轉為「定稿」,內容與實作對齊(F3、F6、F7、F13)。純 HTML 內容/文字/樣式編修,**不引入外部資源、不加 script**。

**輸入**:現有 `doc/操作說明文件.html`(1602 行)、§1 事實基準表。
**輸出**:定稿版同檔覆寫。

### 3.1 必改清單

1. **版本註記**(檔頭 header 與 `<title>` 一帶):改為「v3.0(定稿)」,doc-meta 補定稿日期(今日,`date` 取得),移除「供下一階段修正評估使用」字樣,改為「定稿:內容與 2026-07-07 實作現況一致」。
2. **第 2 章「UI 畫面總覽(修正評估清單)」定案化**(Eric 未勾選視同全數照 v3.0 目標設計):
   - 章名改為「UI 畫面總覽(定案)」;副標「請在評估欄勾選處置」改為定案說明。
   - 「評估」欄之互動勾選(`□ 保留 □ 修改 □ 移除`)**整欄移除或改為定案標記**(建議:欄名改「定案」,一般列標「✔ 照 v3.0 設計定案」或「✔ 保留現況」;末列 Smart Parts 獨立網站標「✔ 已退役(P4 完成)」)。27 列畫面清單與線框圖本體**全數保留**。
   - 狀態欄對齊實況:M2「現況 7 → 目標 9」改「現況(9 頁籤)」;M7 標示更名已完成;M13、M14 的「v3.0 目標(尚未實作)」chip 改為「現況(已實作)」。
3. **全檔 chip/標記同步**:所有 `v3.0 目標`、「尚未實作」、「(9 個;綠框為新增…)」等草案措辭,凡對應功能已於 P0–P4 落地者改為現況表述(M13 零件主檔、M14 供應商、九頁籤、備品庫存更名皆已實作);「修正評估請搭配第 2 章…逐張勾選」的線框標記說明段一併改寫。
4. **入口與轉址公告更正**(最重要,不可虛報):
   - 現文「smartparts.ericchh.work 已停用並轉址到 MM」**與事實不符**(F13:mms NXDOMAIN、smartparts 403 未轉址)。
   - 改為:「主系統零件管理頁面與 :5100 已於 2026-07 退役;`mms.ericchh.work` 入口與 `smartparts.ericchh.work` 301 轉址之 **Cloudflare 儀表板三步驟待 Eric 手動執行**(步驟見 `docs/report20260707-1.md` §6.3),生效前請使用 MM 本機入口 `http://localhost:5301`。」語氣可潤飾,但「待 Eric 手動執行」與「生效前本機入口」兩事實必須明載。
   - 全檔其他提及 mms.ericchh.work / smartparts 之處(含 §1 系統全景、§13 說明)逐一同步。
5. **主系統導航現狀**:S2 相關敘述維持 6 鈕(F3),確認無殘留「零件管理」入口描述。

### 3.2 Edge case

| 情境 | 預期行為 |
|---|---|
| 移除評估欄造成表格欄數變動 | 同表 `<thead>`/`<tbody>` 欄數一致,頁面不得跑版(瀏覽器開啟目視確認) |
| 線框圖內含「□」核取方塊字元屬**畫面線框本體**(如 M6 保養重點勾選) | 保留 — 只移除第 2 章「評估」欄的互動勾選,不動線框內容 |
| 檔名含中文 | git 操作以引號包路徑 |

---

## 4. 工作項 3:規格勘誤(回3 AC-4)

**功能描述**:回3 規格 §1.1/§2.3/AC-4 將 SupplierParts 兩組 FK 誤寫「Cascade」,實為 **ON DELETE RESTRICT**(回3 Tester 以備份 schema 與 EF 模型查證)。

**現況(PM 已代辦)**:回3 規格已歸檔至 `docs/spec20260707-1.md`,檔頭載明勘誤緣由、三處誤寫已更正為「Restrict〔勘誤:原誤寫 Cascade〕」。

**RD 工作**:驗證 `docs/spec20260707-1.md` 存在、勘誤註記完整、三處已更正;並 grep 兩 repo 確認除「引述勘誤本身」的歷史報告(`docs/report20260707-1.md`、`docs/report20260707-2.md`、`tests/report-v*.md`)外,無其他文件仍以「Cascade」描述該兩組 FK。歷史報告中的引述**不改**(其為「發現筆誤」的紀錄,語意正確)。

---

## 5. 工作項 4:MM repo 文件對齊

**功能描述**:MM 文件反映「設備資產管理外掛、兩元件並立」定位與 P0–P3 落地成果(F6–F12)。

### 5.1 `MM/README.md`(必改)

| 現文問題 | 更正為 |
|---|---|
| 標題/定位「設備保養維修管理系統」 | 「設備資產管理外掛」,開頭明述兩元件並立:**保養維修**(設備台帳/排程/紀錄/文件/備品零件 `/api/parts`)與**零件管理**(採購主檔 `/api/v1/*`,2026-07 自主系統依 C′ 併入) |
| 架構圖「7 頁籤」 | 9 頁籤(F7 清單) |
| 架構圖 compose 只列 postgres + mms-backend | 補 `mms-frontend`(5301:80,本機直連入口);埠對照 5434/5300/5301 |
| 「EnsureCreated 建表,不做 schema 演進」(部署注意事項整段) | 改寫為 **migration 工作流**:啟動 `MigrateAsync()` 自動套用;既有序列 `20260706073656_InitialCreate` → `20260706074434_AddPartsManagement`;schema 演進一律 `dotnet ef migrations add <Name>`(附 `--project MMS.Infrastructure --startup-project MMS.API` 慣用指令);既有庫 baseline 機制一句帶過 |
| API 端點表缺零件管理 | 補三端點列:`GET/POST/PUT/DELETE /api/v1/parts`(含 GET `{id}`)、`/api/v1/suppliers`、`GET/POST/DELETE /api/v1/supplier-parts`(以實際 Controller 動詞為準,RD 讀 `PartsCatalogController`/`SuppliersController` 核對);`/api/parts` 列註明「備品零件(保養維修元件)」以資區隔 |
| 測試數「前端 61 / 後端 44」 | 更新為現值(F12,註記快照日期)或改為「執行 `dotnet test` / `npx vitest run` 取得現值」不寫死 |
| (新增)資料搬移腳本用法 | 新增一節:`scripts/migrate-parts-data.sh` 用途(FlexoDB→MmsDB 零件三表,冪等:前置檢查→pg_dump 備份至 `backups/`→單一交易 COPY + ON CONFLICT DO NOTHING→筆數/抽樣核對)、執行方式與前提(兩庫容器運行中)、`test-migrate-parts-data.sh` 為拋棄式測試庫整合測試;註明 `backups/` 已 gitignore |

### 5.2 `MM/CLAUDE.md`(不存在 → 新建)

PM 已確認 MM repo 無 CLAUDE.md。新建精簡版(< 100 行),至少含:專案定位(設備資產管理外掛、兩元件並立、與主系統真分離無程式碼互相依賴)、兩元件 API 邊界(`/api/parts` 備品 vs `/api/v1/*` 零件管理,**改 A 不可動 B**)、migration 工作流(同 §5.1)、埠與容器(F6)、測試指令、**禁止 git push**、正體中文規範。

### 5.3 其他

- `MM/frontend/README.md` 為 Vite 樣板 — 可選項:替換為三五行的前端說明(頁籤、dev proxy、測試),或本回不動(盤點表記明即可,不列驗收硬項)。
- MM `docs/` 歷次 spec/report 凍結不動。

---

## 6. 工作項 5:版控收尾

**主系統 repo**(建議 2 個 commit,均 `docs:`,可合為 1 個):
1. `docs: C′ 遷移工作檔納入版控` — F14 全部 untracked 檔(`doc/` 三檔、`docs/` 三檔、`tests/` 兩檔、`handoff.md`)。
2. `docs: P5 文件對齊 — 主系統文件與操作說明書 v3.0 定稿` — 工作項 1、2 的修改(含本回 RD 報告)。

**MM repo**:文件異動獨立 commit(如 `docs: P5 文件對齊 — README 兩元件定位與 CLAUDE.md 新建`)。

規則:Conventional Commits、訊息正體中文、**兩 repo 皆不 push**;commit 後 `git status` 須乾淨(MM 的 `backups/`、`node_modules/` 等 gitignore 項除外)。

---

## 7. 驗收標準(逐條可測,Tester 對照 §1 事實基準表抽查程式碼與 compose)

- [ ] **AC-1(盤點表)** RD 報告含主系統文件盤點結果表(檔案 × 判定 × 修改摘要),§2.1 初表所列檔案全數出現且處置落實。
- [ ] **AC-2(無殘留過時敘述)** 兩 repo 全部「現況型」文件(未標歷史/廢止註記者)中,grep `sm-frontend|smartparts|5100|零件管理|SmartParts` 之命中逐項核閱:不存在「主系統含零件管理」「sm-frontend 仍在跑」「:5100 可用」「已停用並轉址」等與 F1–F5、F13 矛盾的現行式敘述;歷史文件僅靠檔頭註記隔離,正文未被改寫。
- [ ] **AC-3(操作說明書定稿)** `doc/操作說明文件.html`:(a) 版本註記含「定稿」與日期;(b) 第 2 章無「□ 保留 □ 修改 □ 移除」互動評估欄,27 列與線框全數保留、瀏覽器開啟不跑版;(c) M2 顯示現況 9 頁籤、M13/M14 為已實作現況;(d) 轉址/入口段落明載「待 Eric 手動執行」與本機入口 5301,無「已轉址」不實敘述。
- [ ] **AC-4(勘誤)** `docs/spec20260707-1.md` 存在、含歸檔+勘誤說明、三處 FK 描述為 Restrict;除引述勘誤的歷史報告外,兩 repo 無文件再以 Cascade 描述該兩組 FK。
- [ ] **AC-5(MM README 事實核對)** §5.1 七項全數落實;Tester 抽查關鍵事實與實作一致:頁籤數(對 `App.jsx`)、端點路徑與動詞(對 Controllers)、migration 清單(對 `Migrations/` 目錄)、埠(對 `MM/docker-compose.yml`)、腳本名稱(對 `scripts/`)。
- [ ] **AC-6(MM CLAUDE.md)** 檔案存在且含 §5.2 全部要點;敘述與 F6–F11 無矛盾。
- [ ] **AC-7(版控)** 主系統 `docs:` commit 含 F14 全部檔案;MM 端獨立 commit;皆符 Conventional Commits;`git log origin/<branch>..HEAD` 佐證**無 push**;兩 repo `git status` 乾淨(gitignore 項除外)。
- [ ] **AC-8(紅線)** 本回全部 commit 的 diff 僅含 `.md`/`.html`(及必要之無害純文字文件);`*.cs`/`*.jsx`/compose 等零異動(`git diff --stat` 佐證)。
- [ ] **AC-9(語文)** 新寫/修改內容為正體中文台灣用語,無簡體字與中國用語(抽查:接口/視頻/優化/提交 等詞不得作中國語意使用)。

## 8. 整體完成定義(DoD)

AC-1 ~ AC-9 全數通過,RD 產出實作報告(主系統 `docs/`,含盤點結果表、操作說明書修改摘要、MM 文件修改摘要、commit 清單與兩 repo `git status` 截錄),即交 Tester 驗收。
