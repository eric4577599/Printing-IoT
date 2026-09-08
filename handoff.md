# Handoff — Claude(Printing IoT)
> 最後更新:2026-09-08 22:10

## ⛔ 下一個接手的人先看這段

**系統已於 2026-09-06 21:30 上線,現在正常運作中。** 需要登入才能用。

| 事項 | 狀態 |
|---|---|
| 8 個 migration | ✅ 已套用(現為 13 個,0 待套用) |
| admin / OP1~OP5 帳號 | ✅ 已建立 |
| E 段 API 驗收 14 項 | ✅ 全過 |
| `JWT_SECRET` | ✅ 2026-09-07 查明是**新產生的**,**不必輪替**(`report20260907-3.md` §4) |
| 實機驗收 **E6** | ✅ 2026-09-08 已驗過(`report20260908-1.md` §1) |
| 實機驗收 E1 / E3 / E5 / S10 / S11 | ❌ **需登入態**,Claude 不得輸入密碼 → Next Step 1 |

**兩件還沒了結的安全事項:**
- **初始密碼明文在 `.credentials-20260906.txt`**(已 gitignore)。**請盡快移到密碼管理器並刪除該檔。**
- 原本硬編碼在前端的管理者密碼 `eric4577599` **已進版控並推上 GitHub**。
  從程式碼移除**不等於**它安全了 —— 凡是別處(GitHub、Google、公司系統、其他專案)
  還在用同一組的,全部要換。

**要在別台機器部署時:** 照 `docs/report20260906-2.md` §2(A–E 五段可貼指令)。
**不要照 `docs/report20260905-2.md` §2 的字面順序** —— 見下方 Risk 段第 1 條。

**ERP 推單:** S7 已把管道建好(帶 `X-Api-Key` 標頭),但**只做管道、尚未串接**。
在 ERP 真的要接之前 `ApiKeys` 是空表,**系統一切正常**,只是 ERP 推單不可用。

---

## Current State

稽核修正 S1–S11 全部進了 `main`,工作分支就是 `main`(`ea5c31e`,**已 push**)。
`fix/audit-20260903` 與 `feat/extract-maintenance` 已完成任務,確認上線無誤後可清掉。

**沒有進行中的工作。** 下一步是實機驗收(要真人)與 backlog,見 Next Step。

**測試基準線(每輪主流程親自實跑,非採信代理)**

| 項目 | 原始 | S1–S3 | S4 | S5+S6 | S7 | S8 | S10 | **S11(現況)** |
|---|---|---|---|---|---|---|---|---|
| dotnet test | 39 | 181 | 181 | 249 | 305 | 338 | 344 | **344** |
| npm test | 103 | 190 | 263 | 297 | 313 | 338 | 368 | **385**(+1 略過) |
| npm lint | 51/18 | 51/18 | 51/18 | 49/18 | 49/18 | 49/18 | 49/18 | **49/18** |
| build(前後端) | — | — | — | 成功 | 成功 | 成功 | 成功 | **成功** |

唯一失敗的 `frontend/tests/dashboard.e2e.test.js` 需真實瀏覽器,是既有問題,歷輪都未改動該檔。

---

## Next Step

### 1. 實機驗收(唯一真正卡住的事,需真人開瀏覽器)

前端已是最新 bundle(2026-09-07 23:20 重建過,`index-DS0OzfpF.js`),開 http://localhost:5600 即可走。

| 項目 | 要驗什麼 |
|---|---|
| **E1** | 完工一張單 → 整頁重載 → 完工單不會復活、順序與狀態正確(S1) |
| **E5** | 登入後開 `/docs`,文件正常顯示(不是 401) |
| ~~**E6**~~ | ✅ 2026-09-08 通過。DOM 內零個 DebugDashboard 標記、無隱藏渲染,是真的沒渲染不是視覺遮蔽 |
| **E3** | 登入後放**超過 2 小時**,確認自動換發而不是被踢出去(S7 G4)。 注意既有階段沒有刷新憑證,首次仍會被登出一次,再登入起才有 |
| **S10** | 報表頁 → 掃描 → 回填 → 數字變化,走一次完整流程 |
| **S11** | 拔網路 → 完工 → 插回網路 → 確認自己送成功、不落 pending |

⚠️ **分工**:瀏覽器擴充功能已接上(2026-09-08),但 **Claude 不得將密碼輸入任何欄位** ——
這是硬性限制,Eric 把密碼告訴 Claude 也一樣。所以剩下五項全都要 **Eric 先自行登入**,
之後 Claude 才能接手操作那個已登入的分頁(權杖存 localStorage,同源分頁共用)。

⚠️ **不要讓 Claude 按會跳 `window.confirm` / `alert` 的按鈕**(例如名冊的「刪除」)——
瀏覽器對話框會卡死擴充功能,之後所有指令都收不到。

💡 登入密碼在 `.credentials-20260906.txt`。**不是 `eric4577599`** ——
那組 2026-09-08 實測回 401,已確實失效。

### 2. 待客戶決策(不是技術問題)

- 對外埠綁定改 127.0.0.1
- mosquitto 關匿名並建 ACL(**需同步設定 WISE 硬體**,不能只改一邊)
- **Stop 與 NG 的實體訊號來源**:後端落地欄位已備妥,訊號本身牽涉現場硬體怎麼接,待硬體端確認

### 3. Backlog(有價值但不急)

| # | 事項 | 出處 |
|---|---|---|
| B1 | **存取權杖無法撤銷** —— JWT 無狀態,登出或停用後已發出的權杖最長仍有 2 小時殘命。要收掉需黑名單或改不透明權杖 | `report20260906-1.md` §6 |
| B2 | **金鑰管理沒有前端 UI** —— 走 curl / Swagger,以使用頻率判斷不值得先做 | 同上 |
| B3 | **名冊快取仍是單機的** —— A 機器建的帳號,B 機器的登入視窗要等 B 的管理者開過設定頁才會出現在觸控清單(帳號本身在後端,手動輸入永遠登得進去) | 同上 |
| B4 | **O-16 前端對 429 靜默** —— `useRealtimeData` 的 catch 什麼都不顯示。額度放寬了但盲點還在,牽涉現場 UI 取捨 | `report20260907-1.md` |
| B5 | **回填面板只在報表頁** —— 作業員不會進報表頁的話,實際上要由管理者定期執行,或改成登入後自動偵測提示 | `report20260907-2.md` §6 |
| B6 | **回填衝突只到「標示出來」** —— 真撞鍵時要人工進資料庫,以發生機率判斷暫不值得先做 | 同上 |
| B7 | **`reportUtils` 彙總函式還不能退場** —— 本機仍有未回填舊實績時只有它涵蓋得到 | `report20260906-3.md` |
| B8 | S4 三條非阻斷觀察:工廠日與本機日界線落差會讓已同步紀錄被標成「僅存在本機」(僅措辭,去重仍正確)、`filterByDateRange` 單邊區間語意與規格有落差(既有行為,現行入口走不到)、硬上限一萬列在未虛擬捲動的明細表上的渲染成本 | `tests/report20260905-s4-v2.md` |
| B9 | S1 兩條非阻斷觀察:`fromBackendOrder` 恆填 `paperSpec` 使 flute 編輯不再回寫後端(畫面因 SpecJson 還原仍正確);`targetLength: ''` 會送 0,目前無 app 路徑可產生,表單日後開放編輯需加守衛 | `tests/report20260903-s1-v2.md` |
| B11 | **名冊班別欄仍是自由文字**(placeholder A/B),未與班別時段表連動。改成下拉會變更 `resolveShiftCode` 語意 | `report20260908-1.md` §5 |
| B10 | **S9 抓到的兩條結構性問題**:O-05 對外入口(Cloudflare Tunnel)不在版控裡,repo 內沒有真相來源;O-06 `doc/` 由 DocsController 對外提供,**產品 UI 裡的說明文件正在描述一個不存在的系統** | `spec20260907-s9-v1.md` |

### 4. ERP 真的要串的那天

由 ADMIN 建一支金鑰交過去(`docs/report20260906-1.md` §2.1,**明文只回傳一次**)。
同時要確認的三件事:ERP 端誰負責改、金鑰放在對方哪個設定檔、輪替窗口怎麼安排。

---

## Done

**細節一律在 report 裡,這裡只留指標。** 下表由新到舊。

| 批次 | 一句話 | 交付物 |
|---|---|---|
| **S13** | 點名冊列不再靜默覆寫已輸入的帳號。判準是「這個值是誰打的」而不是「有沒有值」 —— 只看有沒有值會讓名冊列之間切不動 | `report20260908-1.md` §6 |
| **S12** | 登入畫面名冊編輯列。代碼欄溢位到卡片外導致「新增」實質不可用 —— `.infoBar` 沒有 flex-wrap 而卡片固定 640px | `report20260908-1.md` |
| **S11** | 完工送出重試,堵住 pending 持續產生的源頭。判準本身是交付:斷網/429/408/5xx/401 重試,400/403/409 不重試 | `report20260907-3.md` |
| **S10** | 本機舊實績回填後端。**不是一次性遷移,是常態對帳**:掃描唯讀 → 看清楚 → 回填,可重跑 | `report20260907-2.md` |
| **限流修正** | 額度改由設備數推導。原本兩台看板就會把整廠鎖掉 —— Docker 埠轉發把所有來源 NAT 成同一位址,限流分區等於全廠共用一個桶 | `report20260907-1.md` |
| **S9** | 設計規劃書對抗性重整。30 條逐條證偽,**§3.1 點名的八張資料表實查一張都不在** | `spec20260907-s9-v1.md`、`-acceptance-v1.md` |
| **S8** | 後端彙總端點 + OEE 黃金向量。**黃金向量照出一個已存在的漂移**:同資料後端 66.7 / 前端 66.6,根因是運算順序 | `report20260906-3.md`、`spec20260906-s8-v1.md` |
| **上線** | 實際上線,E 段 14 項全過 | `report20260906-4.md` |
| **上線前置** | runbook + `scripts/preflight-check.sh`。**抓到照文件做會出事的地方**(見 Risk 第 1 條) | `report20260906-2.md` |
| **S7** | ERP 機器對機器憑證 + 三項認證 backlog(名冊接後端、403 文案 i18n、權杖刷新) | `report20260906-1.md`、`spec20260906-s7-v1.md` |
| **S5+S6** | 端到端接通認證授權(稽核頭號根因)。後端改預設拒絕、前端接真登入 | `report20260905-2.md`、`spec20260905-s5-v1.md`、`-s6-v1.md`、`-s6-v3.md` |
| **S4** | 報表與分析四頁改讀後端 API | `report20260905-1.md`、`spec20260905-s4-v1.md` |
| **S1–S3** | 訂單資料正確性 / Worker 訊號 / 生產實績落地 | `spec20260903-s{1,2,3}-v*.md` |
| **稽核** | 三輪對抗性架構稽核(14 個代理,77 條定稿,critical 8 / high 25)+ 設計意圖對照 | `report20260903-1.md`、`report20260903-2.md` |
| 更早 | 專案治理收尾、`CLAUDE.md` 建立、S2 排程拖拉、全站 i18n 三回合、UI 稽核 30 筆、C′ 遷移 P0–P5、MM 安全三項修復 | `report202607*.md` |

### 只有這裡有、report 裡找不到的

- **稽核交付頁面**(不在 repo 內,連結遺失就沒了):
  <https://claude.ai/code/artifact/7bd76125-447a-4602-8917-7accbcd44b69>
- **S2 的驗收報告沒有落檔** —— 子代理的 Write 工具擋掉了該檔名,結論只存在於當時
  workflow 的回傳值裡,**已經找不回來**。S1/S3 那兩份有落檔(`tests/report20260903-s*.md`)。
- **設計意圖對照最大的收穫是冒出一個原本抓不到的問題類型**:介面做好了、資料到後端就被丟棄
  (6 格)。從程式碼往外看抓不到,只有拿規格往裡對才會露出來 → `[[spec-driven-audit-finds-hollow-ui]]`
- **S5+S6 兩趟都耗盡三次重試,但卡的不是程式碼** —— T1 從頭到尾全綠,卡的是 RD 連三輪
  沒更新交付報告,最後四處文件缺口由主流程自己補完 → `[[pm-rd-tester-doc-deliverable-blind-spot]]`
- **本 session 兩次因為沒實測就寫錯結論**:誤判 Docker 不可用、誤判廠內直連限流分區正確。
  兩份文件都已改寫 → `[[feedback-sandbox-false-negative]]`

---

## Key Context

- **主系統需要登入才能用**。角色與權限矩陣見 `docs/spec20260905-s5-v1.md`;
  帳號**不分大小寫**(以 `UsernameNormalized` 唯一索引背書);存取權杖效期 2 小時,
  S7 起到期會由前端以刷新憑證自動換發(憑證 12 小時,`Auth:RefreshTokenHours`),換不到才登出。
- **ERP 推單靠 `X-Api-Key` 標頭**,金鑰由 ADMIN 在 `/api/v1/apikeys` 建立,
  明文只在建立當下回傳一次,撤銷不刪列。金鑰只對推單端點有效,**打不開其他端點**。
- **完工實績有兩條保險**:S11 當下重試(頁面開著時)+ S10 事後回填(報表頁面板)。
  兩者互補,**都要留著** —— 重試涵蓋不到關掉分頁 / 整晚離線的那些。
- 專案根 `/Volumes/G70Pro/cusor pool/Printing IoT`;MM 外掛獨立 repo `/Volumes/G70Pro/cusor pool/MM/`。
- 容器與 port:前端 :5600、API :5200 `/swagger`、Postgres :5433、Redis :6380、MQTT :1884 / WS 9001;
  MM 前端 :5301、後端 :5300、`mm-postgres-1` **127.0.0.1**:5434
  (僅綁 loopback 是安全修復的一部分,**不要改**)。
- 資料庫單一 `FlexoDB`;MM 用 `MmsDB`。
- **`doc/` vs `docs/`**:`doc/` 會被 `DocsController` 對外提供,寫進去等於改產品 UI;
  `docs/` 是交付物,不對外。
- 詞彙準繩:零件管理 = `/api/v1/*`(採購主檔);備品零件 = `/api/parts`(保養耗用)。
- MM 與主系統的整合形狀是**並列掛同一訊息來源、共用 Parameter**,不是主系統轉手
  → `[[printingiot-mm-parallel-signal-source]]`

---

## Risk / Note

**踩過會出事的**

1. **migration 是 API 啟動時自動套用的**(`Program.cs:159` `MigrateWithRetryAsync`),
   不是可以挑時機的獨立步驟。所有 DBA 前置檢查必須在 `docker compose up --build`
   **之前**跑完,否則「不可略過的檢查」會在事情發生完之後才跑到。
   真撞上時 `MigrateWithRetryAsync` 會把必然失敗的 migration 重試 10 次,
   加上 `restart: always` 變成無限重啟,現場只看得到「API 一直起不來」→ `report20260906-2.md` 置頂段。
2. **前端改完要重建容器才會上線**(compose 掛的是原始碼,服務的是 build 出來的 bundle)。
   `docker compose up -d --build frontend` 會**連帶重建 backend-api**(相依關係),線上有人時要挑時間。
3. **大小寫**:Mac 不敏感、Linux 容器敏感,import 路徑不一致會「本機過、進 Docker 炸」。
4. **macOS `._*` 檔會弄壞 `dotnet build`**:`find . -name "._*" -delete`。
5. **`git push` 是全域紅線**,一律需 Eric 明確同意。
6. **主系統不得再加保養維修 / 零件管理功能**(已外移 MM)→ `[[printingiot-maintenance-parts-moved-out]]`。

**這台機器的沙箱**

7. **`dotnet` 指令會假失敗**:卡滿 5 分鐘後回報「建置失敗,0 個警告,0 個錯誤」;
   沙箱外同一條指令 1.7 秒成功。跑 dotnet 一律要 `dangerouslyDisableSandbox: true`,
   **派 subagent 做後端工作時必須在提示裡寫明**,否則整輪盲跑。
8. **`docker` 的 unix socket 被沙箱擋掉** —— 曾被誤判成「Docker 在這台不可用」,
   帶 `dangerouslyDisableSandbox` 時 daemon 完全正常 → `[[feedback-sandbox-false-negative]]`。
9. **`gh` 在沙箱內 TLS 憑證驗證失敗**(`x509: OSStatus -26276`),查 PR / API 要帶
   `dangerouslyDisableSandbox`。`git` 走 https 不受影響。
10. 若再出現 `You have not agreed to the Xcode license agreements.`,解法是
    `sudo xcodebuild -license accept`(2026-09-06 已復原,`git` / `python3` 皆正常)。

**工具與資料**

11. **`docs/spec-v1.md` / `spec-v3.md` 仍是通用檔名**,pm-rd-tester 的 PM 階段固定寫
    `docs/spec-v{n}.md`,下次跑到 v1 或 v3 就會**覆寫它們**。`spec-v2.md` 已於 2026-09-07
    改名為 `spec-cmigration-v2-20260708.md` 避開(逐位元組相同,已驗),
    另兩個要不要一併改名待 Eric 決定(改名有引用面的影響)。
12. **子代理的 Write 工具會擋 report / summary 類 `.md` 檔名**,Tester 的驗收報告可能落不了檔
    (S2 那份就是這樣消失的)。文件類收尾應由主流程自己做。
13. `pm-rd-tester` 舊有的「讀到別輪舊 spec」問題,可用 `specBase` / `reportBase` 覆寫檔名前綴避開;
    同 repo 派工正常,**跨 repo 仍不建議**。
14. **限流分區走 Cloudflare Tunnel 或 Docker 埠轉發時全體共用一個桶**。
    額度現由設備數推導:`RateLimit:MaxDevices`(預設 5)× 120 = 全域 600/分。
    **現場加機台只要改這一個數字。** 誠實標註:這是「整廠預算 = 台數 × 每台預算」,
    **不是**真的每台一個桶 → `report20260907-1.md`。
15. **產品庫仍 localStorage-only**,只有訂單遷到後端 → `[[schedule-orders-backend-sync]]`。
16. **前端 i18n 未完**:Settings / modals / Docs 仍有約 340 字串硬編碼 → `[[i18n-app-wide-retrofit]]`。
