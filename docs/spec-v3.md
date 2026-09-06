# 規格 — C′ 遷移收尾 回3:整體回歸驗證計畫(v3)

> 日期:2026-07-07(`date` 取得)
> 撰寫:PM subagent
> 版次:**v3** — 基於 `docs/spec-v1.md` 做針對性修訂,除 §7 列明的變更外,其餘條文與 v1 完全相同、且已由 RD/Tester 驗證通過,**不得重新解讀**。
> 性質:**驗證回合** — 本回原則上「不寫新功能」,RD 依本計畫執行全套回歸;**發現任何回歸問題才修**(修復 + 補測試 + 獨立 commit),全數通過則產出最終回歸報告。
> 前置:P0–P5 + 遺留小修全部完成(主系統 `docs/report20260707-2.md`、各回 `tests/report-v*.md`)。

---

## 0. 範圍界定

### 0.1 本版(v3)修訂重點 — 先讀這段

上一輪 Tester 複驗結果:**T1/T2 全過**(兩 repo build/test 全綠 11/33/67/89;A5 三步與 B3-1 五步 migration 鏈於臨時庫重跑全數通過並 DROP;前輪 F-1/F-2/F-3 解除;RD 報告 `docs/report20260707-4.md` 與實測逐項吻合),**唯卡在 AC-B5**:

- 原 AC-B5 要求 `GET /api/v1/parts` 回傳「筆數 > 0」,但來源 FlexoDB 三表(Parts/Suppliers/SupplierParts)**自始為 0 筆**(備份檔 md5 = `d41d8cd98f00b204e9800998ecf8427e`,即空內容;B4 `--verify` 0↔0 對照通過)。搬移腳本、migration、端點實作全部正確 — 任何實作都無法讓不存在的資料出現,屬**規格與既成事實矛盾**。
- **v3 處置**:修訂 AC-B5 為「回傳筆數與備份檔來源筆數一致(0↔0 亦為 PASS),以 B4 `--verify` 逐表對照為證據」(全文見 §2 B5);§5 邊界表新增 E10 涵蓋「來源 0 筆」情境。
- **本版不要求 RD 改任何 code**。RD 僅需:依新 AC-B5 重新判定該項(可引用既有 curl / `--verify` 證據,或重跑一次留證),並更新 `docs/report20260707-4.md` 的 AC-B5 判定與總結。Tester 依新標準複驗後即可結案。
- 若日後需要展示用零件資料,**另立「種子資料策略」新需求**,不屬本回歸範圍。

### 0.2 受驗對象(兩個 repo)

| 代號 | Repo | 路徑 | 分支 | 基準 commit(自此以後為本次遷移變更) |
|---|---|---|---|---|
| A | 主系統 Printing IoT | `/Volumes/G70Pro/cusor pool/Printing IoT` | `feat/extract-maintenance` | `b683831` |
| B | MM 保養維修外掛 | `/Volumes/G70Pro/cusor pool/MM` | `main` | `e3cebd8` |

### 0.3 角色分工

| 角色 | 職責 |
|---|---|
| PM(本檔) | 產出回歸驗證計畫:涵蓋面、每項的執行指令與判定標準 |
| RD | 逐項執行 §1–§3;任一項 FAIL → 修復 + 補測試 + 獨立 commit 後**重跑該項與受影響項**;產出/更新最終回歸報告 `docs/report20260707-4.md`(格式見 §4)。**本版(v3)下,已通過項目免重跑,僅 AC-B5 依新標準重新判定並更新報告** |
| Tester | 依本檔驗收標準**獨立複驗**(重跑指令、核對輸出),產出 `tests/report-v*.md`;已於前輪親測通過之項目可引用前輪證據 |

### 0.4 硬性紅線(全程遵守)

1. **禁止 `git push`**(兩 repo 皆同)。
2. 驗證性操作(build/test/grep/compose config)不得改動程式;**只有確認的回歸問題**才允許改 code,且每個修復獨立一個 Conventional Commits commit。
3. **不得動生產資料庫**:EF migration 的 apply/Down 驗證一律對**臨時空庫**執行(見 A5/B3 的隔離做法);既有 Docker `MmsDB` 只做**唯讀健康檢查**。
4. 新寫的文件、報告、commit message 一律正體中文(台灣用語)。
5. 測試若因沙箱失敗(dotnet 寫 obj、連 DB、開 port、docker socket),**停沙箱重跑**再判定,不得把沙箱錯誤記為 FAIL。
6. 無頭瀏覽器**非必要**:UI 回歸以「元件原始碼核對 + vitest + build 產物」判定即可;若環境可用 curl 檢查 HTTP 狀態則加做。

---

## 1. A 部分 — 主系統(Printing IoT)

> 執行目錄一律用絕對路徑;後端方案檔 `backend/PrintingIoT.sln`,前端 `frontend/`。
> (本部分 v3 無變更,前輪已全數通過。)

### A1 後端 build/test 全綠

- 指令:
  ```bash
  cd "/Volumes/G70Pro/cusor pool/Printing IoT/backend" && dotnet build PrintingIoT.sln
  dotnet test PrintingIoT.sln
  ```
- **驗收 AC-A1**:build 0 error;test 全數通過、0 failed、0 error(warning 不擋,但需列入報告)。

### A2 前端 build + vitest 全綠

- 指令:
  ```bash
  cd "/Volumes/G70Pro/cusor pool/Printing IoT/frontend" && npm run build
  npx vitest run
  ```
- **驗收 AC-A2**:`npm run build` exit 0 且產出 `dist/`(或該專案設定的輸出目錄);vitest 全數通過、0 failed。

### A3 最近兩項 UI 修正回歸(commit `284baa7`)

**A3-1 Dashboard 排程面板無訂單操作按鈕列**
- 核對方式:
  1. 原始碼:於 Dashboard 排程面板相關元件 grep 確認**不存在**先前被移除的訂單操作按鈕列(如開始/完成/取消訂單等操作按鈕群);可由 `git show 284baa7` 比對被刪片段確認未被回加。
  2. 相關 vitest(若有覆蓋該面板的測試)通過。
  3. 頁面正常渲染:以 build 成功 + 該元件測試 render 不拋錯判定。
- **驗收 AC-A3-1**:上述三點皆成立;`git show 284baa7` 刪除的 UI 片段在現行 HEAD 原始碼中無殘留。

**A3-2 BoxDiagram 展開圖面數與尺寸欄對齊**
- 預期行為(判定標準):
  - 箱型 RSC/HSC:預設 **4 面 + 舌片**(不得出現多一面);
  - `S5` 有值時才呈現 **5 面**;
  - 上方尺寸欄與各面分隔線**對齊**(尺寸欄格數/寬度與面數一致)。
- 核對方式:BoxDiagram 元件原始碼邏輯核對(面數陣列的產生條件)+ 對應 vitest;若無既有測試覆蓋「RSC 4 面」「S5 有值 5 面」兩情境,**RD 補上這兩條測試**(此為允許的改動,屬補測試)。
- **驗收 AC-A3-2**:兩情境測試存在且通過;原始碼面數邏輯與上述預期一致。

### A4 docker compose 設定

- 指令:
  ```bash
  cd "/Volumes/G70Pro/cusor pool/Printing IoT" && docker compose config >/dev/null && echo OK
  docker compose config --services
  ```
- **驗收 AC-A4**:`config` exit 0;services 清單為 `frontend, backend-api, backend-worker, postgres, redis, mqtt-broker, cloudflared`(順序不拘),**不含 `sm-frontend`**;全檔 grep `sm-frontend` 無任何命中(含註解)。

### A5 EF migration 鏈(含 `20260706143822_RemoveSmartPartsModule`)

- 隔離做法:於現有 postgres 容器建**臨時空庫**(例:`printing_regress_YYYYMMDD`),以連線字串覆寫指向該庫;驗畢 DROP。**嚴禁**指向生產庫。
- 步驟與指令(於 `backend/`,project = `PrintingIoT.Infrastructure`,startup = `PrintingIoT.API`;依專案實際 `dotnet ef` 慣用參數):
  1. `dotnet ef database update`(全套 apply 至最新)
  2. `dotnet ef database update 20260606021031_RemoveMaintenanceModule`(Down 一段,驗 RemoveSmartPartsModule 可還原)
  3. `dotnet ef database update`(再 apply 回最新)
- **驗收 AC-A5**:三步皆 exit 0 無例外;步驟 2 後 `__EFMigrationsHistory` 最後一筆為 `RemoveMaintenanceModule`,步驟 3 後為 `RemoveSmartPartsModule`;臨時庫驗畢已刪除。

### A6 全域 grep 無零件管理殘留

- 指令(於主系統根目錄):
  ```bash
  grep -rniE "smartparts|sm-frontend" . \
    --exclude-dir={.git,node_modules,bin,obj,dist,docs,doc} \
    --exclude=handoff.md --exclude=test_output.txt
  ```
- **允許的例外(allowlist)**:
  - `docs/`、`doc/`、`handoff.md`、`tests/report-*.md`:歷史報告/規格提及,屬紀錄非殘留;
  - `backend/PrintingIoT.Infrastructure/Migrations/20260706143822_RemoveSmartPartsModule*`:移除 migration 本身的檔名與內容;
  - `Maintenance-System/`(若為歸檔目錄)僅供紀錄。
- **驗收 AC-A6**:allowlist 以外命中數 = 0;另以中文關鍵字 `grep -rn "零件管理"` 用同樣排除條件複核,allowlist 以外命中數 = 0。若發現殘留 → RD 清除並獨立 commit,重跑本項。

---

## 2. B 部分 — MM(保養維修外掛)

> 方案檔 `backend/MaintenanceSystem.sln`;migration 位於 `backend/MMS.Infrastructure/Migrations/`。
> (本部分僅 B5 於 v3 修訂,其餘無變更、前輪已通過。)

### B1 後端 build/test 全綠(67+)

- 指令:
  ```bash
  cd "/Volumes/G70Pro/cusor pool/MM/backend" && dotnet build MaintenanceSystem.sln
  dotnet test MaintenanceSystem.sln
  ```
- **驗收 AC-B1**:build 0 error;test 通過數 **≥ 67** 且 0 failed。

### B2 前端 vitest 89/89

- 指令:`cd "/Volumes/G70Pro/cusor pool/MM/frontend" && npx vitest run`
- **驗收 AC-B2**:通過數 **≥ 89**、0 failed(若 A3-2 之外本回有補測試造成 >89,以「全綠且不少於 89」判定)。

### B3 三段 migration 鏈 + 生產庫健康檢查

三段鏈(依時間序):
1. `20260706073656_InitialCreate`
2. `20260706074434_AddPartsManagement`
3. `20260707012448_RemoveShadowForeignKeys`(shadow FK 修正)

**B3-1 空庫全套 apply + 逐段 Down**(臨時空庫,同 A5 隔離原則):
1. `dotnet ef database update`(0 → 3 全套 apply)
2. `dotnet ef database update 20260706074434_AddPartsManagement`(Down 第 3 段)
3. `dotnet ef database update 20260706073656_InitialCreate`(Down 第 2 段)
4. `dotnet ef database update 0`(Down 至空)
5. `dotnet ef database update`(再全套 apply,確認可重放)
- **驗收 AC-B3-1**:五步皆 exit 0;步驟 4 後臨時庫無業務資料表(僅剩/或連 `__EFMigrationsHistory` 皆清空);步驟 5 後 history 恰為上列三筆。

**B3-2 既有生產庫(Docker MmsDB)唯讀健康檢查**:
- 指令(容器名依 `docker compose ps` 實際輸出;唯讀查詢):
  ```bash
  docker exec <mm-postgres容器> psql -U <user> -d MmsDB \
    -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";'
  cd "/Volumes/G70Pro/cusor pool/MM/backend" && \
    dotnet ef migrations has-pending-model-changes --project MMS.Infrastructure --startup-project MMS.API
  ```
- **驗收 AC-B3-2**:history 恰含上列三筆(順序正確、無缺漏);`has-pending-model-changes` 回報**無** pending model changes;全程未對 MmsDB 執行任何寫入。

### B4 搬移腳本 --verify

- 指令:`cd "/Volumes/G70Pro/cusor pool/MM" && bash scripts/migrate-parts-data.sh --verify`
- **驗收 AC-B4**:exit 0,輸出顯示三表(Parts/Suppliers/SupplierParts)來源↔目的筆數對照一致(**0↔0 一致亦為 PASS**);不產生資料變更。

### B5 容器端點煙霧測試(兩元件互不影響)【v3 修訂】

- 前置:`cd "/Volumes/G70Pro/cusor pool/MM" && docker compose ps` 確認 mms-backend / mms-frontend / postgres 皆 Up(未起則 `docker compose up -d` 後等待健康)。
- 指令(host 埠依 compose 實際對映;以 curl 驗證):

| 端點 | 元件 | 判定 |
|---|---|---|
| `GET /api/parts` | 備品零件(SpareParts) | HTTP 200,回有效 JSON 陣列 |
| `GET /api/v1/parts` | 零件管理 | HTTP 200,回有效 JSON;**回傳筆數與備份檔來源筆數一致**(來源 0 筆 → 回空集合即 PASS) |
| `GET /api/v1/suppliers` | 零件管理 | HTTP 200,回有效 JSON;筆數與來源一致(同上,0↔0 為 PASS) |
| `GET /api/v1/supplier-parts` | 零件管理 | HTTP 200,回有效 JSON;筆數與來源一致(同上,0↔0 為 PASS) |

- **驗收 AC-B5(v3)**:
  1. 四端點皆 HTTP 200 且回有效 JSON(空陣列/空集合屬有效 JSON);
  2. `/api/v1/*` 三端點回傳筆數與**備份檔來源筆數一致**,以 **B4 `--verify` 逐表對照輸出為證據**(目前已知來源三表為 0 筆,備份檔 md5 = `d41d8cd98f00b204e9800998ecf8427e`,故 **0↔0 即 PASS**;不得以「筆數 > 0」為要求);
  3. 兩元件互不影響:`/api/parts`(備品零件)與 `/api/v1/parts`(零件管理)由**不同元件/資料表**供應,任一端點的資料多寡不影響另一端點正常回應(來源 0 筆情境下,以「`/api/v1/parts` 回空集合、同時 `/api/parts` 仍正常回 200 與其自身資料」判定)。
- 註:本項判定變更**不要求改 code**;前輪既有 curl 輸出與 B4 `--verify` 證據若已留存,可直接引用重新判定。若需展示資料,種子資料策略為**另立新需求**,不在本回歸範圍。

### B6 前端可達 + 九頁籤

- 指令:`curl -s -o /dev/null -w "%{http_code}" http://localhost:5301/`
- 九頁籤核對:以**前端原始碼的頁籤/路由設定**(M2-b 九頁籤,含「📦 零件主檔」「🏢 供應商」「🔩 備品庫存」)與 build 產物存在性核對即可,無頭瀏覽器非必要。
- **驗收 AC-B6**:`http://localhost:5301` 回 200;頁籤設定原始碼恰為九個頁籤,且三個零件相關頁籤名稱如上;`npm run build` exit 0。

---

## 3. C 部分 — 交叉檢查

(本部分 v3 無變更,前輪已通過;若因本版更新報告而在主系統新增 commit,C1 清單需同步補列。)

### C1 兩 repo commit 清單化 + 確認未 push

- 指令(各 repo):
  ```bash
  git log --oneline b683831..HEAD        # 主系統
  git log --oneline e3cebd8..HEAD        # MM
  git status -sb                          # 看 ahead 數
  git log --oneline @{u}..HEAD 2>/dev/null || echo "(無 upstream 或全部未推)"
  ```
- **驗收 AC-C1**:報告中完整列出兩 repo 自基準以來所有 commit(hash + 標題);每一筆皆確認**尚未 push**(存在於 `@{u}..HEAD`,或該分支無 upstream);`git status` 無非預期的未追蹤/未提交變更(docs 報告類新檔除外,需列明)。

### C2 文件與程式狀態一致

- 核對對象:主系統 `README.md`、MM `README.md` 與 `CLAUDE.md`、`PROJECT_STATUS`(若存在,兩 repo 皆找:`find . -iname "*project_status*"`)、操作說明書(主系統 `doc/操作說明文件.html` 及 doc/ 內相關版本)。
- 判定基準(文件敘述不得與最終程式狀態矛盾):
  1. 主系統**不含**保養與零件管理功能;
  2. MM 為兩元件並立:備品零件(`/api/parts`)+ 零件管理(`/api/v1/*`);
  3. MM 前端九頁籤、埠 5301;
  4. 主系統 compose 無 `sm-frontend`。
- **驗收 AC-C2**:逐一核對上述四點,無矛盾;若有矛盾 → RD 更正文件並獨立 commit(`docs:` 前綴),重跑本項。

---

## 4. 輸出物定義(RD 產出)

### 4.1 最終回歸報告 `docs/report20260707-4.md`(主系統 repo,**v3 為更新既有檔**)

必含章節:
1. **執行摘要**:總判定(PASS / PASS with fixes)、執行日期、環境(dotnet / node / docker 版本);
2. **逐項結果表**:AC-A1 ~ AC-C2 每項的「執行指令、結果摘要(通過數/關鍵輸出)、判定」;**AC-B5 需註明依 v3 標準判定(0↔0 一致為 PASS)**;
3. **修復清單**(若有):問題描述、根因、修復 commit hash、補的測試;無問題則明寫「本回歸未發現問題」;
4. **兩 repo commit 清單**:自 `b683831` / `e3cebd8` 起全列(含本回新增),並註明皆未 push;
5. **遺留事項**:Cloudflare Tunnel 三步驟待 Eric 手動執行(引用 `docs/report20260707-2.md` 之指引)、零件管理來源資料為 0 筆(如需展示資料另立種子資料需求)、及其他未決事項。

### 4.2 修復 commit(僅在發現回歸問題時)

- 每個問題獨立 commit,Conventional Commits(`fix:` / `docs:` / `test:`);修 code 必附對應測試。
- 修復後必須重跑:該項 AC + 同 repo 的 build/test 全套(A1/A2 或 B1/B2)。
- **v3 下更新報告本身**以 `docs:` commit 提交即可,不觸發重跑全套。

---

## 5. 已知 edge case 與預期行為

| # | 情境 | 預期行為 |
|---|---|---|
| E1 | 沙箱導致 dotnet/EF/docker/curl 失敗(寫 obj、連 port、docker socket 被擋) | 停沙箱重跑後再判定;報告註明哪些項曾因沙箱重跑 |
| E2 | Docker Desktop 未啟動或 MM 容器未起 | 先 `docker compose up -d` 並等待健康再測 B5/B6;若 Docker 完全不可用,B3-2/B5/B6 標記 BLOCKED 並回報,不得標 PASS |
| E3 | 5301 埠被占用或容器埠對映異動 | 以 `docker compose ps` 實際對映埠為準,報告記錄實際埠 |
| E4 | `dotnet ef database update 0` 對 InitialCreate Down 失敗(Down 未實作完整) | 屬回歸問題:RD 修 migration Down 邏輯(不得改既有 Up 行為),補驗證後重跑 B3-1 全五步 |
| E5 | grep 出現 allowlist 以外殘留,但屬「移除紀錄」性質(如 changelog 句子) | 個案判定:註解/文件中描述「已移除」的敘述句可加入 allowlist 並在報告載明理由;程式碼、設定、路由中的殘留一律清除 |
| E6 | `has-pending-model-changes` 指令在該 EF 版本不存在 | 改用 `dotnet ef migrations add __probe --project ... --startup-project ...` 檢查產出是否為空 migration,驗畢**立即刪除** probe 檔且不得 commit |
| E7 | vitest 因 A3-2 補測試而超過原基準數 | 以「全綠且不少於原基準(主系統原數、MM 89)」判定 |
| E8 | 生產 MmsDB 查詢需要密碼/使用者 | 從 `docker-compose.yml` 環境變數讀取,僅用於唯讀查詢,不寫入報告明文密碼 |
| E9 | 臨時空庫驗證中途失敗 | 無論成敗,結束時一律 DROP 臨時庫,並在報告記錄 |
| **E10(v3 新增)** | **零件管理搬移來源(FlexoDB 三表)為 0 筆**(備份檔為空內容,md5 = `d41d8cd98f00b204e9800998ecf8427e`) | **非缺陷**:端點回空集合 + HTTP 200 即正常;AC-B4/AC-B5 以「來源↔目的筆數一致」判定(0↔0 為 PASS);**禁止**為湊資料而手動 INSERT 或造假;如需展示資料,種子資料策略另立新需求 |

---

## 6. 總驗收清單(Tester 複驗用)

| AC | 內容 | 判定 |
|---|---|---|
| AC-A1 | 主系統 dotnet build/test 全綠 | ☐ |
| AC-A2 | 主系統前端 build + vitest 全綠 | ☐ |
| AC-A3-1 | Dashboard 排程面板無訂單操作按鈕列、正常渲染 | ☐ |
| AC-A3-2 | BoxDiagram RSC/HSC 4 面+舌片、S5 有值 5 面、尺寸欄對齊(含測試) | ☐ |
| AC-A4 | compose config 通過、無 sm-frontend | ☐ |
| AC-A5 | 主系統 migration 鏈空庫 apply + RemoveSmartPartsModule Down 可還原 | ☐ |
| AC-A6 | 全域 grep 無零件管理殘留(allowlist 外 = 0) | ☐ |
| AC-B1 | MM dotnet build/test 全綠(≥67) | ☐ |
| AC-B2 | MM vitest 全綠(≥89) | ☐ |
| AC-B3-1 | MM 三段 migration 空庫全套 apply + 逐段 Down + 重放 | ☐ |
| AC-B3-2 | 生產 MmsDB history 三筆完整、無 pending model changes、全程唯讀 | ☐ |
| AC-B4 | migrate-parts-data.sh --verify 通過(0↔0 一致亦 PASS) | ☐ |
| AC-B5(v3) | 四端點 200 且回有效 JSON;`/api/v1/*` 筆數與來源一致(0↔0 為 PASS,B4 --verify 為證據);兩元件互不影響 | ☐ |
| AC-B6 | localhost:5301 可達、九頁籤設定正確 | ☐ |
| AC-C1 | 兩 repo commit 全清單、皆未 push | ☐ |
| AC-C2 | 文件與最終程式狀態無矛盾 | ☐ |
| AC-R | 最終回歸報告 `docs/report20260707-4.md` 含 §4.1 五章節(AC-B5 註明依 v3 標準) | ☐ |

> Tester 複驗指引:前輪已親測通過之項目(AC-A1~A6、B1~B4、B6、C1、C2)可引用前輪證據直接勾稽;本輪重點為 **AC-B5 依 v3 新標準複驗**與 AC-R 報告更新確認。

---

## 7. 版次變更紀錄

| 版次 | 日期 | 變更 |
|---|---|---|
| v1 | 2026-07-07 | 初版回歸驗證計畫(回2 規格歸檔於 `docs/spec20260707-3.md`) |
| v3 | 2026-07-07 | 依 Tester 回饋修訂 AC-B5:移除不可滿足的「筆數 > 0」,改為「回傳筆數與備份檔來源筆數一致(0↔0 亦 PASS),以 B4 `--verify` 逐表對照為證據」;AC-B4 同步註明 0↔0 為 PASS;§5 新增 E10「來源 0 筆」邊界;§0.1 註明本版不要求改 code,僅重新判定 AC-B5 並更新報告 |
