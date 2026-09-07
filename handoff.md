# Handoff — Claude(Printing IoT)
> 最後更新:2026-09-07 23:00

## ⛔ 下一個接手的人先看這段

**這台機器的堆疊已於 2026-09-06 21:30 上線完成**(`docs/report20260906-4.md`)——
8 個 migration 已套用、認證已生效、admin 與 OP1~OP5 已建立、E 段 14 項驗收全過。

- **初始密碼明文在 `.credentials-20260906.txt`**(已 gitignore)。
  **請盡快移到密碼管理器並刪除該檔。**
- 上線流程本身見 **`docs/report20260906-2.md`** §2(A–E 五段),其他機器要部署時照它做。
  **不要照 `docs/report20260905-2.md` §2 的字面順序** —— migration 是 API 啟動時自動套用的。
- ⚠️ **`JWT_SECRET` 是否已輪替尚未確認**。`.env` 裡有一組 64 字元的值,但不確定是不是新產的。
  舊密鑰在版控歷史中,若這組是舊的必須換掉並重啟 API(會讓現有登入階段全部失效,要挑時間)。
- ~~**`/api/erp/push-orders` 現在需要身分,ERP 暫時無法推單**~~ ✅ 2026-09-06 S7 把**管道**建好了。
  ERP 只要帶 `X-Api-Key` 標頭就能推單。**但這一趟只做管道,沒有要立刻串接** ——
  金鑰等 ERP 真的要接的那天再建(步驟 `docs/report20260906-1.md` §2.1)。
  在那之前 `ApiKeys` 是空表,**系統一切正常**,只是 ERP 推單不可用,與現況相同。
- 原本硬編碼在前端的管理者密碼 `eric4577599` 已進版控並推上 GitHub。
  從程式碼移除**不等於**它安全了,凡是別處(GitHub、Google、公司系統、其他專案)還在用同一組的,全部要換。

## Current Task
**依架構稽核修正七批問題**:三輪對抗性稽核 → 依客戶手繪架構圖做設計意圖對照
→ 分趟實作修正。**這件事已收尾** —— 2026-09-06 PR #2 與 PR #3 都已合併,
S1–S7 全部進了 `main`(`ae1d45a`)。分支 `fix/audit-20260903` 與 `feat/extract-maintenance` 已完成任務。

合併之後接著做了三件事,全部完成:**上線前置整備**(runbook + 前置檢查腳本)、
**S8 後端彙總端點**(Next Step 第 10 項)、以及**實際上線**(`docs/report20260906-4.md`)。

**下一步是瀏覽器端的實機驗收**(E1 / E5 / E6)與 `JWT_SECRET` 的確認,見 Next Step 5。

## Done

### 本回合(2026-09-07)

**S10 · 本機舊實績回填後端**(`docs/report20260907-2.md`)—— Next Step 第 9 項

查出來的事實比 handoff 描述的更麻煩:**它不是一次性遷移,是常態對帳**。
`Dashboard.jsx` 完工送後端失敗時只 `console.warn`、**沒有任何重試**,那筆就永遠停在 `pending`;
自從 S5/S6 開了認證,任何在未登入或權杖過期時完工的單都會 401 然後留在本機。
所以本機殘留有兩群(S3 前的舊單 + 送失敗的單),而且第二群**會持續產生**。

handoff 列的四個待決問題都有了答案(詳見報告 §2):
- **去重**:沿用 `clientRecordId` 冪等鍵,後端本來就冪等 → 重跑安全。
  但 `Date.now()` 是每台各自產生的,**兩台同毫秒完工會撞鍵** ——
  冪等命中時比對不良數與停機次數,不一致標成 conflict,不靜默跳過。
- **工單關聯**:送 null、保留訂單編號文字,並回報有幾筆。
- **工廠日**:最容易靜默算錯的一段。舊單只有 `date` 沒有 `finishedAt` 時,
  把日期當當地午夜送出會被日界判到**前一天**(對真實後端實測證實:
  送 `2026-08-01T00:00:00+08:00` → 後端判 **2026-07-31**)。
  改用**反解 + 驗證**:只回傳確實會還原成目標工廠日的時刻。
  已對真實後端跨語言驗過四個日期(含閏日、跨年)全數一致。
- **資料量**:上限 1000,逐筆送、撞 429 退避重試(直接吃到昨天設的 600/分額度)。

新增 `backfillMapper`(純函式,所有有損轉換都回報)、`useBackfill`(掃描唯讀 / 回填 / 中止)、
`BackfillPanel`(先掃描看清楚,確認後才出現寫入按鈕),`backfill` i18n 五語系齊補。

**實測**:npm test **368 過 1 略過**(基準線 338);lint 49/18 與基準線相同;build 成功。
驗證過程在正式庫建的 5 筆假實績**已全部刪除並確認還原為 0 筆**。

**限流會把整廠一起鎖掉 —— 已修正**(`docs/report20260907-1.md`)

Eric 貼 Docker 記錄問「問題在哪」而查出來的。**問題不在 Docker**:
Docker Desktop 的埠轉發把 localhost、LAN 終端(192.168.x.x)、Tunnel 流量
**全部 NAT 成同一個位址**(實測三種來源皆為 `172.65.90.66`),
所以限流的 `RemoteIpAddress` 分區等於**全廠共用一個桶**。
而一台看板每秒輪詢(`useRealtimeData.js:59`)就吃 60/分,原額度只有 100/分 ——
**兩台看板就爆**。實測修正前:連發 115 次 → 100 過、15 個 429。

依 Eric 指示(demo 系統、最多 5 台)把額度改為**由設備數推導**:
`RateLimit:MaxDevices`(預設 5)× `PerDevice:PermitLimit`(120)= 全域 600/分,
登入 5×5 = 25/分;啟動時記錄實際生效值。**現場加機台只要改一個數字。**
誠實標註:這是「整廠預算 = 台數 × 每台預算」,**不是**真的每台一個桶。

**同時更正我先前寫錯的東西**:`docs/report20260906-2.md` §1.3 原本寫
「廠內直連 → 每台終端各自一個桶,正確」,整段是錯的(我推論了但沒實測),已全面改寫。
這是本 session 第二次因為沒實測而寫錯結論(第一次是誤判 Docker 不可用)。

**實測**:dotnet build 0 錯 0 警;**dotnet test 344 全過**(基準線 338,+6);
執行中的系統上,當初撞 429 的 115 次現在**全過**,加到 300 次仍零 429。

**留著沒動**:前端對 429 是靜默的(`useRealtimeData` 的 catch 不顯示任何東西),
額度放寬了但這個盲點還在 → 開放問題 **O-16**,牽涉現場 UI 取捨。

**S9 · 設計規劃書對抗性重整**(`docs/spec20260907-s9-v1.md`;交付頁面見下)

稽核對象 `doc/整合設計與重新拆分規劃_20260617.md`(3 個月前)。以對抗性立場逐條證偽,
不採信任何文件自述,一律回到程式碼與**執行中的系統**取證。

**核心發現:那份文件請 Eric 在拆分方案 A/B/C 之間拍板,但現實已經自己決定了一半。**
Smart Parts 於 2026-07-06 隨 migration `RemoveSmartPartsModule` 整塊移出,零件與保養都外掛化了,
現況是「方案 C 走了一半」,那個分岔口不存在。

30 條逐條證偽,其中最要緊的:
- **§3.1 點名的八張資料表,實查 FlexoDB 一張都不在**(Machines/Alarms/Parts/Suppliers/SupplierParts/Inventory…)
- **「認證:JWT + BCrypt + Role-based」當時為假** —— 元件都在但沒有預設拒絕,無權杖照樣打得進去。
  判準因此定為「**預設是否成立**」而不是「元件是否存在」。
- 順帶查出 **`ProductionLogs` / `ProductionCompletions` / `Products` 皆 0 列** ——
  S2→S3→S4→S8 整條報表鏈在正式庫上還沒跑過一筆真資料,只有測試背書。

重寫後的開放問題 14 條,新抓到兩條結構性的:**O-05 對外入口(Cloudflare Tunnel)不在版控裡**,
repo 內沒有任何真相來源;**O-06 `doc/` 由 DocsController 對外提供,產品 UI 裡的說明文件
正在描述一個不存在的系統**。

**工作流的兩件事(依 `[[pm-rd-tester-doc-deliverable-blind-spot]]` 預期處理)**:
Tester 的驗收報告一如既往沒落檔,改由主流程親自抽驗 —— 九項資料庫實查數字與規格完全一致、
`Program.cs:84` / `OeeCalculator.cs` 132 行 / `reportUtils.js:165` 等引用行號全部屬實、
六張 mermaid 以真正的解析器驗過**全部渲染成功**。
另外 PM 階段覆寫了既有的 `docs/spec-v2.md`,但**覆寫前已先另存**為
`docs/spec-cmigration-v2-20260708.md`(逐位元組相同,已驗)。

**S8 · 後端彙總端點 + OEE 黃金向量**(`docs/report20260906-3.md`、`docs/spec20260906-s8-v1.md`)

Next Step 第 10 項。三支彙總端點(`/api/production/summary/{daily,monthly,stop-reasons}`)
+ 前端三個檢視改讀它們。算術全部委由 `OeeCalculator`,服務層不自己寫任何率值公式。

**真正的收穫是黃金向量抓到一個已經存在的漂移**:同一組資料,
後端稼動率 66.7、前端 66.6。根因是運算順序 —— 前端 `(6665/10000)*100` 先除掉精度,
落在真值下方;後端 decimal 精確。修法是統一成先乘 100 再除(`percent()`)。
**這不是本輪寫壞的,是本輪照出來的** —— 在此之前兩邊測試都是綠的。

`tests/fixtures/oee-golden-vectors.json` 由 C# 與 JS **讀同一個檔**,
任一邊改公式而沒改另一邊就立刻紅。這是本輪真正的交付價值。

另外抓到:接端點時直接解構後端回應會讓月報頁被非預期形狀炸成白畫面(已補形狀守衛);
`AC-S4-06` 的判準與意圖分岔(換掉判準而非放寬斷言)。

**刻意沒做**:`reportUtils` 的彙總函式不退場 —— 本機還有未回填的舊實績時,
後端彙總看不到它們,改讀會讓彙總與明細互相矛盾。故 `localOnlyCount > 0` 時一律用前端計算並標示。

**實測**:dotnet build 0 錯 0 警;**dotnet test 338 全過**(基準線 305);
**npm test 338 過 1 略過**(基準線 313);npm lint 49 err / 18 warn(**與基準線相同**);npm build 成功。

**上線前置整備**(`docs/report20260906-2.md`)—— PR 合併後接著做的收尾:

- **抓到照文件做會出事的地方**:migration 是 API 啟動時自動套用的(`Program.cs:159`),
  但 `report20260905-2.md` §2 把它寫成獨立的第 3 步,排在「重啟 API」之後 ——
  照字面做的話,那段「不可略過」的重複帳號檢查會在事情發生完之後才跑到。
  真撞上時 `MigrateWithRetryAsync` 還會把必然失敗的 migration 重試 10 次,
  加上 `restart: always` 變成無限重啟,現場看到的只會是「API 一直起不來」。
- **`Auth__SetupToken` 根本沒接進 docker-compose**,§2 第 2 步做不到。已補上該變數與
  `Auth__RefreshTokenHours`,`.env.example` 同步。
- 新增唯讀前置檢查 **`scripts/preflight-check.sh`**:環境設定、migration 落差、
  兩個唯一索引的重複資料、帳號現況;有阻斷就 `exit 1`。
  以假 `docker` 跑過 healthy / fresh / dupes 三種情境,退出碼正確;
  **但沒對真實 PostgreSQL 跑過**,SQL 只經人工核對。
- 順帶更正:待套用 migration 是 **8 個**不是 7 個;另記下限流分區走 Tunnel 時會全體共用一個桶。

**S7 · ERP 機器對機器憑證 + 三項認證 backlog**(`docs/report20260906-1.md`、`docs/spec20260906-s7-v1.md`)

`docs/report20260905-2.md` §6 列的四項一次收完:

- **G1 ERP 憑證**(稽核後 ERP 推不了單的正解)。Eric 裁決採 **API 金鑰 + DB 雜湊保管**。
  金鑰格式 `pio_{prefix}_{secret}`,前綴明文入庫供單列查找,祕密段只存 SHA-256。
  新增不是預設方案的 `ApiKey` 驗證方案 + `ErpPush` policy(`ApiKey` 或 `ADMIN` 的 Bearer),
  只有推單端點吃金鑰 —— **一支外洩的金鑰打不開整個系統**。
  管理端點 `/api/v1/apikeys` 限 ADMIN 且只收 JWT(不讓金鑰自我繁殖),撤銷不刪列。
- **G2 名冊接後端**。設定頁改讀 `/api/v1/auth/users`;登入視窗因為面對未登入的人、
  呼叫不了 ADMIN 端點,**仍讀本機快取**,快取由設定頁改寫,已停用的帳號不進快取。
  「刪除」語意改「停用」(後端沒有刪除端點)。密碼新增必填、編輯留空即不變更。
- **G3 403 文案 i18n**。新增 `authGuard` 群組五語系齊補;狀態碼「403」刻意不翻譯。
- **G4 權杖刷新**。刷新憑證預設 12 小時(涵蓋一個班),一次性 + 輪替 + 重用偵測;
  前端 401 → 換發 → **重送原請求**,同時只允許一次換發(否則會踩到自己的重用偵測)。

**驗收擋下三件事**(詳見報告 §4):
- **base64url 的 `_` 讓約三分之一的金鑰從產生當下就是死的** —— `Split('_')` 要求剛好三段,
  但祕密段本身可能含底線。改 `Split('_', 3)`,並補「連續產生 200 支每支都解析得出前綴」的回歸。
- 安全測試 `noHardcodedCredentials` 的粗判準(GeneralTab 不得出現 `password:`)
  會擋掉正當的「把密碼送給後端」。沒有放寬,換成兩條更精確的:密碼不得與 localStorage 同行、
  名冊快取投影不得有 password 欄位。
- `@testing-library/jest-dom` 在 `package.json` 裡但沒掛進 `setupFiles`,`toBeDisabled()` 全部不可用。

**實測**:dotnet build 0 錯 0 警;**dotnet test 305 全過**(基準線 249);
**npm test 313 過 1 略過**(基準線 297);npm lint 49 err / 18 warn(**與基準線相同**);npm build 成功。

### 先前回合(2026-09-03 → 09-05)

**一、三輪對抗性架構稽核**(`docs/report20260903-1.md`)
14 個代理分三輪:六面向分工稽核(141 條)→ 六名對抗驗證員逐條試圖反駁(刪 2 條)→ 完整性批判者補漏 6 條並彙整。去重後 77 條定稿,critical 8、high 25。
交付頁面:<https://claude.ai/code/artifact/7bd76125-447a-4602-8917-7accbcd44b69>

**二、設計意圖對照**(`docs/report20260903-2.md`)
Eric 提供 MM 對應架構的手繪釋義圖,四個代理拿圖上 27 個設計元件逐格比對程式碼。
最大收穫是冒出一個原本抓不到的問題類型:**介面做好了、資料到後端就被丟棄**(6 格)。
從程式碼往外看抓不到,只有拿規格往裡對才會露出來 → `[[spec-driven-audit-finds-hollow-ui]]`

**三、PM→RD→Tester 三趟實作**(commit `47b525e`,89 檔、12389 行新增)
- S1 訂單資料正確性:同步改 upsert 不再自動刪除、目標長度與楞別不再被歸零、推單冪等 + 批次上限 + 逐列回報、完工改回寫狀態避免復活。第 2 輪 PASS(第 1 輪 T3 擋下完工路徑缺口)。
- S2 Worker 訊號:真機路徑補寫 ProductionLogs 並與模擬器合流、狀態不再硬寫死、**設定頁既有的 plc_motor_signal / plc_count_signal 真正生效**、缺欄位不再毀速度基準。第 1 輪 PASS。
- S3 生產實績:完工實績落地成後端實體與端點、停機與不良原因改後端主檔、OEE 補良率因子等四項公式修正、完工日界改工廠時區。第 1 輪 PASS。
- 規格 `docs/spec20260903-s{1,2,3}-v*.md`;驗收報告 `tests/report20260903-s1-v2.md`、`-s3-v1.md`(s2 那份因子代理 Write 限制未落檔,結論在 workflow 回傳值)。

**四、S4 報表與分析四頁改讀後端**(commit `1270601`,26 檔、3286 行新增,`docs/report20260905-1.md`)
S3 §9 backlog 第 1 項。新增對映層 `completionMapper` 與共用 hook `useProductionRecords`,
兩個入口改用它,三個檢視元件 props 契約不變。分頁逐頁取完並設硬上限,未取完會顯示警示。
第 2 輪 PASS(第 1 輪 T2 擋下兩項規格明文交付物未落地)。
三個交給 PM 的判斷點:
- **舊資料**:採合併呈現 + 以 `clientRecordId` 去重(後端勝出),每筆標資料來源,
  僅存在本機的筆數顯示於畫面。**不是遷移** —— 舊資料仍只活在該台瀏覽器,回填仍在 backlog。
- **前端公式不退場**:後端只有逐筆率值、無彙總端點。SSOT 分界為「逐筆看後端、彙總看前端」,
  已寫進 `calculateOEE` 與 `calculateUtilization` 註解。
- **分頁不靜默截斷**:超過上限時畫面明示。

**五、S5 + S6 端到端接通認證授權**(commit `9e86cf9`,67 檔、7437 行新增,`docs/report20260905-2.md`)
稽核頭號根因,前四趟刻意排除因為必須前後端一起做。
後端改預設拒絕(fallback policy),11 個 Controller 全數標註,敏感操作再加政策限制,僅登入端點匿名;
setup-admin 密碼改走 body 並以一次性 SetupToken 保護;統一角色詞彙;限流啟用 ForwardedHeaders 並移到
CORS 之後;移除已進版控的 JWT 密鑰。前端接真登入、只存權杖、攔截器帶授權標頭並處理 401、
移除三處硬編碼帳密並加掃描測試釘住、`/debug` 納入保護。

**驗收機制擋下三個我沒預料到的真問題**:
- `DocsPortal` 用裸 fetch 繞過攔截器,後端一上鎖文件頁 100% 回 401。
- **登入大小寫會把現場鎖在門外**:建立端不分大小寫唯一、登入端精確比對,
  管理者建 `OP1` 而作業員打 `op1` 會回 401 且只顯示「帳號或密碼錯誤」。
  已裁決採不分大小寫,並以 `UsernameNormalized` 唯一索引讓應用層與資料庫層一致。
- 名冊 `username` 有**兩個**寫入點(登入視窗與設定頁 `GeneralTab`),只修一處會從另一條路徑復發。

**兩趟都耗盡三次重試,但卡的不是程式碼** —— T1 從頭到尾全綠,卡的是 RD 連三輪沒更新交付報告。
最後那四處文件缺口由主流程自己補完。教訓見 `[[pm-rd-tester-doc-deliverable-blind-spot]]`。

**驗證(主流程親自實跑,非採信代理)**
| 項目 | 原始基準線 | S1–S3 後 | S4 後 | S5+S6 後 |
|---|---|---|---|---|
| dotnet build | 成功 | 成功 | 成功 | 成功,0 錯誤 0 警告 |
| dotnet test | 39 | 181 | 181 | **249 全過** |
| npm run test | 103 過 | 190 過 | 263 過 | **297 過、1 略過**,30/31 檔 |
| npm run lint | 51 err / 18 warn | 相同 | 相同 | **49 err / 18 warn**(比基準線少 2) |
| npm run build | — | — | — | 成功 |

唯一失敗的 `frontend/tests/dashboard.e2e.test.js` 需真實瀏覽器,為既有問題,四趟都未修改該檔。

### 先前回合結論(不再展開)
- 專案治理收尾、`CLAUDE.md` 建立、README/INSTRUCTIONS 版本與路徑修正(2026-07-29,已 push)。
- S2 排程拖拉排序 Phase 1+2、全站 i18n 三回合、UI 稽核 30 筆修正、C′ 遷移 P0–P5、MM 安全三項修復。

## Next Step
1. ~~`git push` / 開 PR / 合併~~ ✅ 2026-09-06 全部完成。
   PR #3(`fix/audit-20260903` → `feat/extract-maintenance`)先併,
   再併 PR #2(`feat/extract-maintenance` → `main`),`main` 現在是 `ae1d45a`。
   **本機 `main` 已同步**;兩個功能分支留著沒刪,確認上線無誤後可清掉。
2. ~~**S7 · ERP 的機器對機器認證**~~ ✅ 2026-09-06 完成(**只做管道,尚未串接**)。
   **不是上線當下的必辦事項** —— 等 ERP 那側真的要接時,才由 ADMIN 建一支金鑰交過去
   (`docs/report20260906-1.md` §2.1,明文只回傳一次)。
   在那之前 `ApiKeys` 空表,系統正常運作。
   真正要串的那天要一併確認的:ERP 端誰負責改、金鑰放在對方哪個設定檔、輪替窗口怎麼安排。
3. ~~**上線**~~ ✅ 2026-09-06 21:30 完成(`docs/report20260906-4.md`)。
   流程本身(A–E 五段可貼指令)在 `docs/report20260906-2.md` §2,**其他機器要部署時照它做**;
   **不要照 `docs/report20260905-2.md` §2 的字面順序** —— 那份把「套用 migration」寫成獨立的第 3 步,
   但本專案的 migration 是 **API 一啟動就自動套用**(`Program.cs:159` `MigrateWithRetryAsync`),
   照字面做會在檢查跑到之前就把 migration 套下去。前端改完要**重建容器**才會上線。
4. ~~**八個 EF migration 尚未實際套用**~~ ✅ 全部套用完畢(現為 13 個,0 待套用)。
   前置檢查對真實資料庫跑過,**無重複帳號、無重複 ProductCode**,兩個唯一索引都乾淨建起來了。
   `./scripts/preflight-check.sh` 的 SQL 也因此獲得真實 psql 驗證(先前只用假 docker 驗過邏輯)。
5. **剩下的實機驗收**(需真人開瀏覽器,API 能驗的 14 項已全過):
   - **E1** 完工一張單 → 整頁重載 → 確認完工單不會復活、順序與狀態正確(S1)
   - **E5** 登入後開 `/docs`,文件要正常顯示(不是 401)
   - **E6** 未登入直接開 `/debug`,要被擋下
   - **E3** 登入後放**超過 2 小時**,確認自動換發而不是被踢出去(S7 G4)——
     注意既有階段沒有刷新憑證,首次仍會被登出一次,再登入起才有
   - 另外:**確認 `JWT_SECRET` 是不是這次才產生的新值**。若是舊的必須換掉並重啟 API
     (會讓現有登入階段全部失效,挑時間做)。
6. **仍待客戶決策**:對外埠綁定改 127.0.0.1、mosquitto 關匿名並建 ACL(需同步設定 WISE 硬體)。
   ~~認證授權~~ ✅ 2026-09-05 S5+S6 完成。
7. **Stop 與 NG 的實體訊號來源**:只做了後端落地欄位,訊號本身牽涉現場硬體怎麼接,待硬體端確認。
8. ~~前端報表四頁改讀後端 API~~ ✅ 2026-09-05 S4 完成(commit `1270601`)。
9. ~~**localStorage 舊實績回填後端**~~ ✅ 2026-09-07 S10 完成(`docs/report20260907-2.md`)。
   報表頁出現「本機舊實績回填」面板(只在真的有殘留時顯示):掃描唯讀 → 看清楚 → 確認後回填,可重複執行。
   **但源頭沒堵**:`Dashboard.jsx` 的完工 POST 仍然沒有重試,pending 會繼續產生(報告 §6 第 1 項)。
   **尚未在真實瀏覽器走過完整流程** —— 單元測試與對後端的 API 驗證都過了,
   但「開報表頁 → 掃描 → 回填 → 數字變化」需真人走一次。
10. ~~**後端彙總端點**~~ ✅ 2026-09-06 S8 完成(`docs/report20260906-3.md`)。
   三支端點已上、前端三個檢視已接。**漂移風險已由黃金向量關掉**
   (`tests/fixtures/oee-golden-vectors.json`,C# 與 JS 讀同一個檔)。
   但 `reportUtils` 的彙總函式**仍不能刪** —— 本機還有未回填的舊實績時只有它涵蓋得到,
   要等第 9 項回填完成才能退場。
11. **S7 留下的三條**(詳見 `docs/report20260906-1.md` §6):
   **存取權杖無法撤銷** —— JWT 無狀態,登出或停用後已發出的權杖最長仍有 2 小時殘命,
   要收掉需黑名單或改不透明權杖;**金鑰管理沒有前端 UI**(走 curl / Swagger,以使用頻率判斷不值得先做);
   **名冊快取仍是單機的** —— A 機器建的帳號,B 機器的登入視窗要等 B 的管理者開過設定頁才會出現在觸控清單
   (帳號本身在後端,手動輸入永遠登得進去)。
12. S4 驗收留下三條非阻斷觀察(詳見 `tests/report20260905-s4-v2.md`):
   工廠日與本機日界線落差會讓已同步紀錄被標成「僅存在本機」(僅措辭,去重仍正確);
   `filterByDateRange` 單邊區間語意與規格描述有落差(既有行為,現行入口走不到);
   硬上限一萬列在未虛擬捲動的明細表上的渲染成本。

## Key Context
- **工作分支在 `main`**。稽核修正 S1–S7 已於 2026-09-06 隨 PR #3 → PR #2 合併進 `main`(`ae1d45a`);
  `fix/audit-20260903` 與 `feat/extract-maintenance` 已無後續工作。
- **主系統現在需要登入才能用**。角色與權限矩陣見 `docs/spec20260905-s5-v1.md`;
  帳號不分大小寫(以 `UsernameNormalized` 唯一索引背書);存取權杖效期 2 小時,
  **S7 起到期會由前端以刷新憑證自動換發**(憑證 12 小時,`Auth:RefreshTokenHours`),
  換不到才登出。
- **ERP 推單靠 `X-Api-Key` 標頭**,金鑰由 ADMIN 在 `/api/v1/apikeys` 建立,
  明文只在建立當下回傳一次。撤銷不刪列。金鑰只對推單端點有效,打不開其他端點。
- 專案根 `/Volumes/G70Pro/cusor pool/Printing IoT`;MM 外掛獨立 repo `/Volumes/G70Pro/cusor pool/MM/`。
- 容器與 port:前端 :5600、API :5200 `/swagger`、Postgres :5433、Redis :6380、MQTT :1884 / WS 9001;MM 前端 :5301、後端 :5300、`mm-postgres-1` **127.0.0.1**:5434(僅綁 loopback 是安全修復的一部分,不要改)。
- 資料庫單一 `FlexoDB`;MM 用 `MmsDB`。
- **`doc/` vs `docs/`**:`doc/` 會被 `DocsController` 對外提供,寫進去等於改產品 UI;`docs/` 是交付物,不對外。
- 詞彙準繩:零件管理 = `/api/v1/*`(採購主檔);備品零件 = `/api/parts`(保養耗用)。
- MM 與主系統的設計整合形狀是**並列掛同一訊息來源、共用 Parameter**,不是主系統轉手 → `[[printingiot-mm-parallel-signal-source]]`

## Risk / Note
- ~~這台機器的 `git` 與 `python3` 被 Xcode 授權擋住~~ ✅ 2026-09-06 09:45 複驗已恢復
  (`git`、`python3 3.9.6` 皆正常)。若再出現 `You have not agreed to the Xcode license agreements.`,
  解法是 `sudo xcodebuild -license accept`。`dotnet` 從頭到尾不受影響。
- **migration 是 API 啟動時自動套用的**(`Program.cs:159`),不是可以挑時機的獨立步驟。
  所有 DBA 前置檢查必須在 `docker compose up --build` **之前**跑完,
  否則「不可略過的檢查」會在事情發生完之後才跑到 → `docs/report20260906-2.md` 置頂段。
- **限流分區走 Cloudflare Tunnel 時會全體共用一個桶**(`ForwardLimit=1` 取到的是 cloudflared 的容器 IP)。
  廠內直連不受影響。上線後看遠端存取有沒有撞 429 再決定處理 → `docs/report20260906-2.md` §1.3。
- **`docs/spec-v1.md` / `spec-v3.md` 仍是通用檔名**,pm-rd-tester 的 PM 階段固定寫
  `docs/spec-v{n}.md`,下次跑到 v1 或 v3 就會覆寫它們。`spec-v2.md` 已於 2026-09-07 改名避開,
  另兩個要不要一併改名待 Eric 決定(改名有引用面的影響)。
- **`git push` 是全域紅線**,一律需 Eric 明確同意。
- **這台機器的沙箱會讓 `dotnet` 指令假失敗**:卡滿 5 分鐘後回報「建置失敗,0 個警告,0 個錯誤」。
  沙箱外同一條指令 1.7 秒成功。跑 dotnet 一律要 `dangerouslyDisableSandbox: true`,
  **派 subagent 做後端工作時必須在提示裡寫明**,否則整輪盲跑(本回合已踩過一次)。
- ~~Docker 在這台機器不可用~~ ❌ **這是誤判,2026-09-06 已推翻**。真正的原因是
  **Claude Code 的 Bash 沙箱擋掉 docker 的 unix socket**;帶 `dangerouslyDisableSandbox` 執行時
  daemon 正常(29.4.1),compose、連真 DB、套 migration 全都做得到。
  先前四份報告裡「本機做不到」的自我限制全部不成立 → `[[feedback-sandbox-false-negative]]`
- **`gh` 在沙箱內會 TLS 憑證驗證失敗**(`x509: OSStatus -26276`),查 PR / API 要帶
  `dangerouslyDisableSandbox`。同一類問題,`git` 走 https 不受影響。
- `pm-rd-tester` 舊有的「讀到別輪舊 spec」問題,本回合用 `specBase` / `reportBase` 覆寫檔名前綴避開,
  同 repo 派工正常。跨 repo 仍不建議。
- 子代理的 Write 工具會擋 report / summary 類 `.md` 檔名,Tester 的驗收報告可能落不了檔。
- **主系統不得再加保養維修 / 零件管理功能**(已外移 MM)→ `[[printingiot-maintenance-parts-moved-out]]`。
- **產品庫仍 localStorage-only**,只有訂單遷到後端 → `[[schedule-orders-backend-sync]]`。
- 前端改完要**重建容器**才會上線(compose 掛原始碼,服務的是 build 出來的 bundle)。
- 大小寫:Mac 不敏感、Linux 容器敏感,import 路徑不一致會「本機過、進 Docker 炸」。
- macOS `._*` 檔會弄壞 `dotnet build`:`find . -name "._*" -delete`。
- S1 驗收留下兩條非阻斷的觀察:`fromBackendOrder` 恆填 `paperSpec` 使 flute 編輯不再回寫後端(畫面因 SpecJson 還原仍正確);`targetLength: ''` 會送 0,目前無 app 路徑可產生,表單日後開放編輯需加守衛。
