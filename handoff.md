# Handoff — Claude(Printing IoT)
> 最後更新:2026-11-15 收工

## ⛔ 下一個接手的人先看這段

**系統已於 2026-09-06 21:30 上線,現在正常運作中。** 需要登入才能用。

| 事項 | 狀態 |
|---|---|
| 8 個 migration | ✅ 已套用(現為 13 個,0 待套用) |
| admin / OP1~OP5 帳號 | ✅ 已建立 |
| E 段 API 驗收 14 項 | ✅ 全過 |
| `JWT_SECRET` | ✅ 2026-09-07 查明是**新產生的**,**不必輪替**(`report20260907-3.md` §4) |
| 實機驗收 **E6 / E5** | ✅ 2026-09-08 已驗過(`report20260908-1.md` §1、`-2.md` §6) |
| 實機驗收 **E1 / S10 / S11** | ✅ 2026-09-16 由 Claude 自行走完(`report20260916-1.md`) |
| 實機驗收 **E3** | ⏸ 本質上要等 2 小時,尚未做 |

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

工作分支 `main`。**截至 2026-11-13 全部 commit 已 push**(`7c10267`,Eric 親自執行)。
`fix/audit-20260903` 與 `feat/extract-maintenance` 已完成任務,確認上線無誤後可清掉。

**2026-09-15:S16 已整個還原,改做 S17**(`docs/spec20260915-1.md`、`docs/report20260915-1.md`)——
登入畫面改成「作業員點名冊一列 + 按選取」兩個動作登入(密碼由前端帶約定值 `0000`),
密碼欄只在按「管理者」後出現,名冊改為表格內按「+」就地新增。
後端密碼政策依角色分流:OPERATOR 4 碼純數字可用,ADMIN / ENGINEER / SUPERVISOR 維持 12 碼英數。
OP1~OP5 的密碼已改為 `0000`(直接改資料庫雜湊,因為走 API 要輸入管理者密碼)。

**沒有進行中的工作。** 下一步是實機驗收與 backlog,見 Next Step。

**測試基準線(每輪主流程親自實跑,非採信代理)**

| 項目 | 原始 | S1–S3 | S4 | S5+S6 | S7 | S8 | S10 | **S11(現況)** |
|---|---|---|---|---|---|---|---|---|
| dotnet test | 39 | 181 | 181 | 249 | 305 | 338 | 344 | **353**(S17) |
| npm test | 103 | 190 | 263 | 297 | 313 | 338 | 368 | **461**(+1 略過,S17) |
| npm lint | 51/18 | 51/18 | 51/18 | 49/18 | 49/18 | 49/18 | 49/18 | **48/18**(S17) |
| build(前後端) | — | — | — | 成功 | 成功 | 成功 | 成功 | **成功** |

唯一失敗的 `frontend/tests/dashboard.e2e.test.js` 需真實瀏覽器,是既有問題,歷輪都未改動該檔。

---

## Next Step

### 0. 待辦(2026-11-05 更新)

- ✅ **B18 已修**(`report20261105-1.md`):斷線自動重連 + 重訂閱 + 沉默警告;實機重啟 broker 驗過。
  已 push;下次斷線不會再失聰。
- ✅ **損耗率查證已回覆**(2026-11-05,`M-Agent/docs/inbox/20261105-reply-printing-iot-loss-rate.md`):資料夾內查無公式,3.1/3.5 無法重算;下一步要向製表人/正隆資訊課要欄位定義。
- ✅ **損耗率定義已取得**(2026-11-06 stacker-ai 回覆,原文在 `docs/inbox/20261106-stacker-loss-rate-answer.md`;**尚未補進** `M-Agent/docs/inbox/20261105-reply-printing-iot-loss-rate.md`,沙箱不讓本座位寫 M-Agent 目錄,需 Eric 或 M-Agent 處理):損耗率 = 設計損耗÷良品張數;入庫不足率 = 欠量張數÷良品張數。資料來源是 SQL Server `SmartIoT_<機台>`。不必再問 TeamChat。
- ✅ **B19 已修**(`report20261113-2.md`,commit afa81e6):API 反序列化區分大小寫,車速等欄位全落回預設值。已重建 backend-api 並實測畫面車速。**F4/F10 車速防呆尚未實機走過**。已 push。
- ✅ **T-20261113-01 學習筆記已完成**(Greenstone 三份協定,`docs/report20261113-1.md`;**客戶保密,已加入 `.git/info/exclude`,不進版控**)。回覆 M-Agent `20261113-done-Printing IoT.md` 尚未寫(見「M-Agent 交辦」)。
- ✅ **設定頁通訊設定擴充**(2026-11-15,commit 395654f / b47a97b / 7c55f00,已 push、已部署 frontend):ERP「通訊協定」新增 `mhi_evol`(Mitsubishi Evol);「連線方式」新增 `serial`(RS-232,欄位 serialPort/baudRate 預設 9600/dataBits 8/parity even/stopBits 1,payload 鍵 `erp_serial_port` 等);PLC 與 ERP 各加啟用開關(綁 `plc_enabled`/`erp_enabled`)與 WISE 協定說明列。測試 `CommunicationTab.test.jsx`。
  **全部只是設定值**:後端不讀 `plc_enabled`/`erp_enabled`,Worker 沒有 Evol 協定或序列埠驅動,開關旁已加「僅記錄設定值」提示。要真的生效 = 另一件事:Worker 讀 enabled、實作 Evol(RS-232)驅動,且 Docker 要掛序列埠裝置(Mac 上麻煩),須先評估。Evol 協定依據為 Greenstone 學習筆記(`report20261113-1.md`,保密、不進版控)。
- ✅ **2026-11-15 本日完成(已 commit,多數已 push,見下)**:
  - 日報與月報**稼動率口徑統一**(扣準備時間),前後端 + 測試;日報平均 OEE 與月報 OEE 仍不同(加權平均 vs 合計重算,設計如此)。
  - **Mitsubishi Evol / RS-232 / 啟用開關**:Evol 屬**設備(PLC)區塊**的裝置類型(不是 ERP);序列埠欄位為 `plc_serial_*`。**全部只存設定值,Worker 無驅動、`plc_enabled`/`erp_enabled` 無人讀**。
  - **10 月模擬生產紀錄**(294 筆,`ClientRecordId LIKE 'SIM202610-%'`,清除 SQL 見 `docs/report20261115-1.md`)。
  - **文件圖文化**:文件頁改用輕量 Markdown 渲染器(`modules/docs/markdownRender.jsx` + `markdownParse.js`,無新相依,HTML 當純文字、不放行 `javascript:`、不載外部圖);`doc/pic/**` 圖檔建置時收入(順解 B14);新增 `doc/系統設計說明書.md`(現況)、重寫 `doc/操作說明書.md` 與 `doc/Operator Manual.md`(v4.0),增補 `doc/操作說明文件.html`;22 張圖(實機截圖 14 + SVG 流程圖 7 + 既有)。**流程圖由 `scripts/gen-doc-diagrams.py` 產生**,改圖請改腳本重跑。
  - **nginx**:`index.html` 回 `Cache-Control: no-cache`,`/assets/` 不存在回 404。原因:部署後瀏覽器拿舊 `index.html` 指向已被換掉的 JS,nginx 回退成 HTML 當 JS 執行 → **整頁空白**(每次部署都會發生)。
  - 文件更正:F3 的前提是 **PLC 連線**(不是先停機);完工後下一筆直接遞補(與 Auto Next 無關,Auto Next 只影響 F10)。
  - **刪除舊資料(Eric 11-15 指示,已確認範圍)**:① 資料庫 `ProductionCompletions` 9/15 的 2 筆真實測試實績(訂單 123123123123,含 8 筆不良明細),交易內刪除;備份 CSV 在專案根 `backups/`(已加入 `.git/info/exclude`,不進版控)。**模擬的 10 月 294 筆保留**。該訂單本身(`Orders`)未刪。② `doc/` 移除 13 個舊檔(9 個誤放的 report/spec + 4 個保養維修相關),同步清掉 docRegistry 登錄與 5 語系多語系鍵;檔案仍可由 git 歷史找回。
- 剩下實機驗收 E3、**F4/F10 車速防呆實機驗**、Backlog。

### 1. 實機驗收(唯一真正卡住的事,需真人開瀏覽器)

前端已是最新 bundle(2026-09-07 23:20 重建過,`index-DS0OzfpF.js`),開 http://localhost:5600 即可走。

| 項目 | 要驗什麼 |
|---|---|
| ~~**E1**~~ | ✅ 2026-09-16 通過 —— 完工後 Orders.Status 1→3、重載不復活、下一張單遞補正確 |
| ~~**E5**~~ | ✅ 2026-09-08 通過,但**先失敗過** —— 是 404 不是 401,根因是 `doc/` 從沒進過 API 容器。已改為不經 API(S14) |
| ~~**E6**~~ | ✅ 2026-09-08 通過。DOM 內零個 DebugDashboard 標記、無隱藏渲染,是真的沒渲染不是視覺遮蔽 |
| **E3** | 登入後放**超過 2 小時**,確認自動換發而不是被踢出去(S7 G4)。 注意既有階段沒有刷新憑證,首次仍會被登出一次,再登入起才有 |
| ~~**S10**~~ | ✅ 2026-09-16 通過 —— 掃描列出待回填 1 筆與有損轉換,回填後該列資料來源變「後端」 |
| ~~**S11**~~ | ✅ 2026-09-16 通過 —— 停 API 完工落 pending,復原後 10 秒內自送成功並取得 backendId |

⚠️ **分工(S17 後已改變)**:**Claude 不得將密碼輸入任何欄位**仍然成立,Eric 把密碼告訴 Claude 也一樣。
但 S17 之後**作業員登入不需要密碼**(點名冊一列 → 按「選取」),所以 **E1 / S10 / S11 三項
Claude 可以自己走完**,不必等 Eric 先登入。**管理者登入**(設定頁、名冊維護)仍要 Eric 自己來。

⚠️ **不要讓 Claude 按會跳 `window.confirm` / `alert` 的按鈕**(例如名冊的「刪除」)——
瀏覽器對話框會卡死擴充功能,之後所有指令都收不到。

💡 **作業員(OP1~OP5)密碼自 2026-09-15 起是 `0000`**,而且登入畫面不會再問 ——
點名冊一列按「選取」就進去了。**管理者密碼**在 `.credentials-20260906.txt`,
**不是 `eric4577599`**(那組 2026-09-08 實測回 401,已確實失效)。

### 2. 待客戶決策(不是技術問題)

- 對外埠綁定改 127.0.0.1
- mosquitto 關匿名並建 ACL(**需同步設定 WISE 硬體**,不能只改一邊)
- **Stop 與 NG 的實體訊號來源**:後端落地欄位已備妥,訊號本身牽涉現場硬體怎麼接,待硬體端確認

### 3.5 MM 整合(規格已定,分期進行)

`docs/spec20260910-1.md` —— 機台綁定 + PLC 訊號並列繼承,17 條 AC、6 個開放問題。

| 期 | 內容 | 狀態 |
|---|---|---|
| **P0** | **把設備建進 MM 台帳**,`MachineCode` 與主系統 `machine_id` 一致 | ❌ **現場工作,擋住 P3 之後全部** —— MM 資料庫目前完全是空的 |
| P1 | 入口 + 綁定 | ✅ 2026-09-10 完成 |
| P2 | MM 補地基(`MqttDeviceId`、排程與紀錄的 `EquipmentId`) | 未開始 |
| P3 | MM 訂閱 MQTT + 運轉時數累積 | 需 P0、O-6 |
| P4 | 時數觸發保養 | 需 P3 |
| P5 | 停機自動開單(預設關閉) | 需 O-2、**O-4 停機門檻需現場給數字** |

### 3. Backlog(有價值但不急)

| # | 事項 | 出處 |
|---|---|---|
| B21 | **設定頁左側分類選單沒有樣式** —— `SettingsPage.module.css` 沒有 `sidebar` / `menuItem` / `sidebarHeader` / `active` 規則(自最早的 commit 就沒有),顯示成左上角小字清單,功能正常 | `docs/report20261115-2.md` |
| B22 | **作業員(OP1)可開啟「通訊設定」「計算公式」等分頁**(儲存由後端 `SystemConfig` 擋 403)。前端沒有依角色隱藏;且**改欄位時前端先樂觀更新本機狀態**,被後端擋下後畫面仍顯示新值。是否要在前端依角色隱藏/唯讀,待決 | 同上 |
| B23 | 設定頁「通訊」ERP 區塊在目前環境顯示:連線方式一個都沒選,輸入/輸出路徑欄位顯示 `192.168.1.100` / `3000`(疑似舊設定缺 `erp_connection_type`,落入檔案分支) | 同上 |
| B20 | **其他頁面仍有約 50 個 alert / confirm**(排程、報表、分析、設定、maintenance);`hooks/useFKeyHandler.js` 是沒人引用的死碼 | 同上 §3.3 |
| B16 | **回填會把「有 defectQty 但沒有不良明細」的舊紀錄靜默算成 0 不良**,且「有損轉換」不會示警(差異偵測比的是送出的明細加總,不是紀錄自己的 defectQty)。是否真有這種舊資料未證實 | 同上 §3.2 |
| B17 | **完工實績的 `DeviceId` 是空的** —— 設定頁的機台識別碼未填,多台機器的實績分不出來源 | 同上 §3.3 |
| B1 | **存取權杖無法撤銷** —— JWT 無狀態,登出或停用後已發出的權杖最長仍有 2 小時殘命。要收掉需黑名單或改不透明權杖 | `report20260906-1.md` §6 |
| B2 | **金鑰管理沒有前端 UI** —— 走 curl / Swagger,以使用頻率判斷不值得先做 | 同上 |
| B3 | **名冊快取仍是單機的** —— A 機器建的帳號,B 機器的登入視窗要等 B 的管理者開過設定頁才會出現在觸控清單(帳號本身在後端,手動輸入永遠登得進去) | 同上 |
| B4 | **O-16 前端對 429 靜默** —— `useRealtimeData` 的 catch 什麼都不顯示。額度放寬了但盲點還在,牽涉現場 UI 取捨 | `report20260907-1.md` |
| B5 | **回填面板只在報表頁** —— 作業員不會進報表頁的話,實際上要由管理者定期執行,或改成登入後自動偵測提示 | `report20260907-2.md` §6 |
| B6 | **回填衝突只到「標示出來」** —— 真撞鍵時要人工進資料庫,以發生機率判斷暫不值得先做 | 同上 |
| B7 | **`reportUtils` 彙總函式還不能退場** —— 本機仍有未回填舊實績時只有它涵蓋得到 | `report20260906-3.md` |
| B8 | S4 三條非阻斷觀察:工廠日與本機日界線落差會讓已同步紀錄被標成「僅存在本機」(僅措辭,去重仍正確)、`filterByDateRange` 單邊區間語意與規格有落差(既有行為,現行入口走不到)、硬上限一萬列在未虛擬捲動的明細表上的渲染成本 | `tests/report20260905-s4-v2.md` |
| B9 | S1 兩條非阻斷觀察:`fromBackendOrder` 恆填 `paperSpec` 使 flute 編輯不再回寫後端(畫面因 SpecJson 還原仍正確);`targetLength: ''` 會送 0,目前無 app 路徑可產生,表單日後開放編輯需加守衛 | `tests/report20260903-s1-v2.md` |
| B12 | **後端 `DocsController` 與 `getDocument()` 已成死碼**,前端不再呼叫;要移除或補 `COPY doc/` 讓它可用,待決 | `report20260908-2.md` §7 |
| B13 | **文件內容現在是公開可取的靜態資源**(不經 API 的必然代價,已知並接受)。若日後判斷不可接受,回頭走「修容器留 API」 | 同上 |
| B14 | **`doc/pic/` 圖片沒收進 bundle**,文件內的圖片連結會斷;`操作說明文件.html` 非 md 也不在範圍 | 同上 |
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
| **B15** | 看板 F 鍵 6 個、完工視窗 1 個、登入名冊 1 個 alert 改畫面訊息;靜態守門測試當場抓到漏看的那顆。驗收途中發現 **Worker MQTT 不會重連**(B18) | `report20260927-1.md` |
| **驗收** | E1 / S10 / S11 實機三項全過。現場沒有真實 PLC 訊號,改以 mosquitto_pub 注入(順帶端到端驗了 MQTT→Worker→Redis→API→前端);抓到完工流程兩個會凍結分頁的 alert | `report20260916-1.md` |
| **S17** | 登入畫面:作業員點名冊一列 + 選取即登入(密碼帶約定值 0000),密碼欄只在管理者模式出現,名冊表內「+」就地新增;後端密碼政策依角色分流,管理者強度不動。**S16 已整個 revert** | `spec20260915-1.md`、`report20260915-1.md` |
| **P1** | MM 入口 + 機台綁定(規格 `spec20260910-1.md`)。順手根治「按儲存會洗掉監控頻率與 MQTT 設定」的現行 bug —— 四處手寫 payload 各漏不同欄位,後端整包覆寫 | `report20260910-1.md` |
| **S15** | 定時寫入間隔改以秒輸入。原本是分鐘,實際生效的 6 秒顯示成「0 分鐘」且低於一分鐘設不進去;順帶擋掉「打字中途把 3 秒送到 Worker」 | `report20260909-1.md` |
| **S14** | 文件不經 API + 角色分權。`doc/` 從沒進過容器 → 全部 404;改由建置時收檔,ADMIN 全看 / OPERATOR 只看操作手冊 | `report20260908-2.md` |
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

## M-Agent 交辦

- 2026-10-14 JD 與 10-29 context 70% 規則:✅ 2026-11-05 已寫入 CLAUDE.md(commit 63d499c),ack 已回。
- 2026-11-05 損耗率查證:✅ 已回覆。
- 2026-11-05 全體「完成未完成工作」:✅ 已回 `M-Agent/docs/inbox/下班回報-Printing-IoT.md`。
- 2026-11-13 T-20261113-01(Greenstone 協定學習):✅ 筆記完成;結案回覆檔待寫(沙箱曾擋 M-Agent 目錄)。
- 2026-11-13 損耗率答案補進 `M-Agent/docs/inbox/20261105-reply-printing-iot-loss-rate.md` §8:未完成,內容見 `docs/inbox/20261106-stacker-loss-rate-answer.md`。
