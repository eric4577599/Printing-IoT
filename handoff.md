# Handoff — Claude(Printing IoT)
> 最後更新:2026-09-05 21:40

## ⛔ 下一個接手的人先看這段

主系統**已啟用真正的認證授權**(commit `9e86cf9`)。這改變了部署行為:

- 上線前必讀 **`docs/report20260905-2.md`**,照它的 §2 逐步做。
- 順序:輪替 JWT 簽章密鑰 → 注入一次性 SetupToken → **先跑重複帳號檢查 SQL** → 套用 migration
  → 建立管理者與現場帳號。**在建立帳號完成之前,現場完全無法操作系統**,這是刻意的。
- **`/api/erp/push-orders` 現在需要身分,ERP 暫時無法推單**,要等下一趟補機器對機器憑證。
- 原本硬編碼在前端的管理者密碼 `eric4577599` 已進版控並推上 GitHub。
  從程式碼移除**不等於**它安全了,凡是別處(GitHub、Google、公司系統、其他專案)還在用同一組的,全部要換。

## Current Task
**依架構稽核修正六批問題**:三輪對抗性稽核 → 依客戶手繪架構圖做設計意圖對照
→ 以 PM→RD→Tester 六趟分工實作修正。
分支 `fix/audit-20260903`,**全部 commit 已 push**(2026-09-04 與 09-05,Eric 三次明確授權)。

## Done

### 本回合(2026-09-03 → 09-04)

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
1. ~~`git push`~~ ✅ 全部已推送。分支 `fix/audit-20260903` 共 6 個 commit,本機與 origin 一致。
   尚未開 PR;注意這個分支是從 `feat/extract-maintenance` 開出來的,不是 `main`,開 PR 時要確認基底。
2. **S7 · ERP 的機器對機器認證**(下一趟的第一優先)。
   `/api/erp/push-orders` 目前需要身分,而 ERP 是程式呼叫、不能用互動式登入,所以**現在推不了單**。
   需要另一套憑證機制(API 金鑰或服務帳號),範圍已在 `docs/report20260905-2.md` §6 列出。
3. **依 `docs/report20260905-2.md` §2 完成上線步驟**(Eric 手動,Docker 在這台機器不可用故無法代跑)。
   見本檔開頭的置頂段落。前端改完要**重建容器**才會上線。
4. **五個 EF migration 尚未實際套用**(本機無 Docker,只驗過 migration 產生與 build)。
   兩個有 DBA 前置條件,套用前必須先查:
   - `AddProductCodeUniqueIndex` —— 既有 Products 若有重複 ProductCode,建索引會失敗。
   - `AddUsernameNormalizedUniqueIndex` —— 既有 Users 若有僅大小寫不同的重複帳號,建索引會失敗、
     **整個 migration 回滾**。檢查 SQL 在 `docs/report20260905-2.md` §2 第 3 步,不可略過。
5. **實機驗收**:走一次 完工 → 整頁重載 → 確認完工單不會復活、順序與狀態正確;
   以及登入 → 各頁面 → 權杖過期後的行為。
6. **仍待客戶決策**:對外埠綁定改 127.0.0.1、mosquitto 關匿名並建 ACL(需同步設定 WISE 硬體)。
   ~~認證授權~~ ✅ 2026-09-05 S5+S6 完成。
7. **Stop 與 NG 的實體訊號來源**:只做了後端落地欄位,訊號本身牽涉現場硬體怎麼接,待硬體端確認。
8. ~~前端報表四頁改讀後端 API~~ ✅ 2026-09-05 S4 完成(commit `1270601`)。
9. **localStorage 舊實績回填後端**:S4 只做合併呈現讓資料看得見,舊資料仍只在單一瀏覽器內,
   換機器或超過 1000 筆上限就沒了。要真正解決需先確認去重規則、工單關聯遺失怎麼補、
   工廠日怎麼重算,以及客戶現場實際資料量。
10. **後端彙總端點**:目前後端只有逐筆率值,報表要的彙總在前端算,
   所以 `reportUtils` 的 JS 公式無法退場,與 C# `OeeCalculator` 是兩份會漂移的實作。
   要收斂成單一事實來源,需補日 / 月 / 停機原因三組彙總查詢端點。
11. S4 驗收留下三條非阻斷觀察(詳見 `tests/report20260905-s4-v2.md`):
   工廠日與本機日界線落差會讓已同步紀錄被標成「僅存在本機」(僅措辭,去重仍正確);
   `filterByDateRange` 單邊區間語意與規格描述有落差(既有行為,現行入口走不到);
   硬上限一萬列在未虛擬捲動的明細表上的渲染成本。

## Key Context
- 分支 `fix/audit-20260903`(自 `feat/extract-maintenance` 開出),6 個 commit 全部已 push,與 origin 一致。
- **主系統現在需要登入才能用**。角色與權限矩陣見 `docs/spec20260905-s5-v1.md`;
  帳號不分大小寫(以 `UsernameNormalized` 唯一索引背書);權杖效期 2 小時,過期由前端攔截器處理。
- 專案根 `/Volumes/G70Pro/cusor pool/Printing IoT`;MM 外掛獨立 repo `/Volumes/G70Pro/cusor pool/MM/`。
- 容器與 port:前端 :5600、API :5200 `/swagger`、Postgres :5433、Redis :6380、MQTT :1884 / WS 9001;MM 前端 :5301、後端 :5300、`mm-postgres-1` **127.0.0.1**:5434(僅綁 loopback 是安全修復的一部分,不要改)。
- 資料庫單一 `FlexoDB`;MM 用 `MmsDB`。
- **`doc/` vs `docs/`**:`doc/` 會被 `DocsController` 對外提供,寫進去等於改產品 UI;`docs/` 是交付物,不對外。
- 詞彙準繩:零件管理 = `/api/v1/*`(採購主檔);備品零件 = `/api/parts`(保養耗用)。
- MM 與主系統的設計整合形狀是**並列掛同一訊息來源、共用 Parameter**,不是主系統轉手 → `[[printingiot-mm-parallel-signal-source]]`

## Risk / Note
- **`git push` 是全域紅線**,一律需 Eric 明確同意。
- **這台機器的沙箱會讓 `dotnet` 指令假失敗**:卡滿 5 分鐘後回報「建置失敗,0 個警告,0 個錯誤」。
  沙箱外同一條指令 1.7 秒成功。跑 dotnet 一律要 `dangerouslyDisableSandbox: true`,
  **派 subagent 做後端工作時必須在提示裡寫明**,否則整輪盲跑(本回合已踩過一次)。
- **Docker 在這台機器不可用**(unix socket 權限被拒),無法 compose、無法連真 DB。
- `pm-rd-tester` 舊有的「讀到別輪舊 spec」問題,本回合用 `specBase` / `reportBase` 覆寫檔名前綴避開,
  同 repo 派工正常。跨 repo 仍不建議。
- 子代理的 Write 工具會擋 report / summary 類 `.md` 檔名,Tester 的驗收報告可能落不了檔。
- **主系統不得再加保養維修 / 零件管理功能**(已外移 MM)→ `[[printingiot-maintenance-parts-moved-out]]`。
- **產品庫仍 localStorage-only**,只有訂單遷到後端 → `[[schedule-orders-backend-sync]]`。
- 前端改完要**重建容器**才會上線(compose 掛原始碼,服務的是 build 出來的 bundle)。
- 大小寫:Mac 不敏感、Linux 容器敏感,import 路徑不一致會「本機過、進 Docker 炸」。
- macOS `._*` 檔會弄壞 `dotnet build`:`find . -name "._*" -delete`。
- S1 驗收留下兩條非阻斷的觀察:`fromBackendOrder` 恆填 `paperSpec` 使 flute 編輯不再回寫後端(畫面因 SpecJson 還原仍正確);`targetLength: ''` 會送 0,目前無 app 路徑可產生,表單日後開放編輯需加守衛。
