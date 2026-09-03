# Handoff — Claude(Printing IoT)
> 最後更新:2026-09-04 02:15

## Current Task
**依架構稽核修正三批問題**:三輪對抗性稽核 → 依客戶手繪架構圖做設計意圖對照 → 以 PM→RD→Tester 三趟分工實作修正。
已完成並 commit 於分支 `fix/audit-20260903`,**未 push**。

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

**驗證(主流程親自實跑,非採信代理)**
| 項目 | 基準線 | 現況 |
|---|---|---|
| dotnet build | 成功 | 成功,0 錯誤 0 警告 |
| dotnet test | 39 | **181 全過** |
| npm run test | 103 過 | **190 過、1 略過**,18/19 檔 |
| npm run lint | 51 err / 18 warn | 相同,零新增 |

唯一失敗的 `frontend/tests/dashboard.e2e.test.js` 需真實瀏覽器,為既有問題,本次未修改該檔。

### 先前回合結論(不再展開)
- 專案治理收尾、`CLAUDE.md` 建立、README/INSTRUCTIONS 版本與路徑修正(2026-07-29,已 push)。
- S2 排程拖拉排序 Phase 1+2、全站 i18n 三回合、UI 稽核 30 筆修正、C′ 遷移 P0–P5、MM 安全三項修復。

## Next Step
1. **`git push`**(需 Eric 明確同意):分支 `fix/audit-20260903`,兩個 commit `8ac1d47`(報告)、`47b525e`(三趟修正)。目前 origin 上沒有這個分支。
2. **實機驗收**(Eric 手動,Docker 在這台機器不可用故無法代跑):
   前端改完要**重建容器**才會上線。重點走一次 完工 → 整頁重載 → 確認完工單不會復活、順序與狀態正確。
3. **四個 EF migration 尚未實際套用到資料庫**(本機無 Docker,只驗過 migration 產生與 build)。
   `AddProductCodeUniqueIndex` 有 DBA 前置注意事項:若既有 Products 已存在重複 ProductCode,建索引會失敗,需先清理。
4. **未納入三趟範圍、待客戶決策的項目**:認證授權(加 [Authorize] 必須與前端登入改接後端一起做)、對外埠綁定改 127.0.0.1、mosquitto 關匿名並建 ACL(需同步設定 WISE 硬體)。
5. **Stop 與 NG 的實體訊號來源**:本次只做後端落地欄位,訊號本身牽涉現場硬體怎麼接,待硬體端確認。
6. 前端報表四頁改讀後端 API:S3 規格已標為 backlog,未做。

## Key Context
- 分支 `fix/audit-20260903`(自 `feat/extract-maintenance` 開出),兩個 commit 皆未 push。
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
