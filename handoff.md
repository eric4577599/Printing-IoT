# Handoff — Claude(Printing IoT)
> 最後更新:2026-11-20(MM 整合核對完成;契約文字已 push、前端容器已重建;剩 I4 實測)

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

工作分支 `main`。**截至 2026-11-16 全部 commit 已 push**(`5e9c264`,Eric 親自執行;工作樹乾淨)。
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
- ✅ **2026-11-15 後續(已 commit/部署,見 `docs/report20261115-3.md`)**:B21 設定頁選單樣式補回(+靜態測試)、B22 通訊設定分頁僅 ADMIN/ENGINEER 顯示(對齊後端 SystemConfig)、B23 舊設定缺 `erp_*` 的顯示異常(`parseCommSettings` 退回預設;順帶補讀先前漏掉的 `plc_monitor_interval`)、B24 `&gt;` 字面顯示。**F4/F10 車速防呆實機驗通過**(車速 50 時兩鍵都被擋;車速 0 時 F4 放行)。**E3 機制等效驗證通過**(無效存取權杖 → 自動換發、仍登入);**2 小時實際計時未做**。損耗率答案已寫入 M-Agent 回覆檔 §8。
- ✅ **中英文頁面配置檢查(2026-11-15)**:英文介面逐頁掃描(殘留中文 + 版面溢出),繁中/越南文/泰文掃溢出。結果:排程、報表四分頁、文件頁、設定多數分頁乾淨(殘留中文皆為資料庫資料:客戶/產品/機台部位/停機原因名稱)。**報表設定「休息/點心/支援」已改為可勾選選項**(`utils/reportFilters.js`,存語言無關代號 `rest/snack/support`,舊中文值自動對應;自訂關鍵字改行內輸入;該設定目前**沒有任何報表程式讀取**,只存 localStorage)。
- ✅ **PRIIOT⇄MM 整合(2026-11-16,見 `docs/report20261116-1.md`、`docs/spec20261116-1.md`、設計說明書 §14)**:原則與契約 v1 雙邊定稿(Eric 四項決定皆採推薦);本系統端已實作並部署(`MM_SERVICE` 金鑰、users/introspect/login-codes/exchange、devices/counter/status-events、限速兩桶),後端測試 382 全過、實機以臨時金鑰驗過並刪除。**待辦**:Eric 建正式金鑰 + 設 `MM_ENTRY_URL` + 實測登入代碼全流程;MM 端依其 `docs/design20261116-1.md` 做 I0~I4。
  **MM 權限矩陣 Eric 已全數定案(11-16,已轉告 MM)**:角色對映採 MM 提案、圖資管理僅 ADMIN、不留本機緊急管理員、故障只提示不自動建單、整合模式關閉第二因子;張數只能由計數器(WISE 等感測)寫入、OPERATOR 不可手填;計數器壞掉由 ADMIN 切回人工再切回,並新增「來源切換」稽核紀錄(選項 1)。**主系統端無待辦**,等 MM 做 I0→I1→I3→I4(I4 需 Eric 在場)。未驗證:登入代碼真實全流程、現場計數是否換單歸零、PLC 故障是否對映成 `Error`。
- ✅ **MM 整合核對(2026-11-18~19,工單 T-20261118-10)**:逐項核對回覆在 `M-Agent/docs/inbox/20261118-reply-PRIIOT-MM整合核對.md`。結論:`exchange` 對停用/不存在使用者回 400(契約原寫 `{active:false}`)→ Eric 同意**改契約文字**,已改 `docs/spec20261116-1.md`(`838e64f`);PRIIOT 端通訊說明已寫入 `doc/系統設計說明書.md` §14.6(`aa91a83`)。**2026-11-20 已 push(`9148107`);MM 端契約語意一致、措辭不同(Eric 接受),前端容器已重建,§14.6 已進 bundle(未用瀏覽器看過文件頁)。** 現況限制:真實設備不會產生 `Error`(WISE 只有運轉/待機/不明、無 PLC 驅動);Worker 一次只處理一台鎖定設備;deviceId 取 MQTT 主題第二段,缺則為 `WISE`。
  **Next Step(逐字)**:Eric 在場時做 I4 實測(正式金鑰、`MM_ENTRY_URL`、登入代碼全流程)。①② 已完成。
- **配置檢查發現、尚未修(i18n 與版面)**:
  1. ~~分析頁 6 處寫死中文~~ **已修(eb4b679)**:改走 `analysis.startLabel/endLabel/units.*`(5 語系)。
  2. **說明視窗(`components/modals/HelpModal.jsx`)內容全是中文**:載入 `public/help/{monitor,schedule,reports,analysis,settings}.html`(`lang="zh-TW"`),只有視窗標題與側欄有翻譯。要補英文等語系需另寫內容(或改為渲染新操作手冊章節);**待 Eric 決定要補哪些語言**。
  3. ~~越南文報表頁標題被裁切~~ **已修(eb4b679)**:來源欄寬 80→130,實機確認未裁切。
  4. ~~語言選擇不保存~~ **已修(eb4b679)**:存 localStorage `printingiot.language`,壞值退回繁中;測試 `tests/modules/languagePersist.test.jsx`。
- 剩下:E3 的 2 小時實際計時(選做)、上列 i18n/版面項目、Backlog。

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

> 2026-11-20 夜班:T-20261105-02(損耗率)核對為已完成並結案;回報在 M-Agent/docs/inbox/夜班回報-Printing IoT.md。白天待決:3.1/3.5 是否實際重算。

> **2026-11-21 新增 demo 帳號(Eric 指示)**:帳號 `demo` / 密碼 `demo`,角色 OPERATOR、班別 A。**走資料庫層寫入,不是 API**(`demo` 不符 API 密碼政策;理由同 OP1~OP5)。`UsernameNormalized` 必須是大寫 `DEMO`(登入以 `ToUpperInvariant` 比對,寫成小寫會 401)。實測 `demo/demo` 200、`demo/wrong` 401。登入畫面名冊會自動帶 `0000`,故 demo 需手動輸入帳號密碼。密碼很弱,**對外開放(Cloudflare Tunnel)時請留意**。移除:`delete from "Users" where "Username"='demo';`(UserRoles 連動刪除)。

---
## 2026-11-23 接手「走一趟虛擬印刷現場」(Eric 選方案 1:整份接手)
- 規格:`../M-Agent/docs/spec20261121-1.md`(§8 DoD、§9 Eric 決定)。給璉鐵對客戶介紹用。
- 建置目錄已從 M-Agent 暫存區搬到 `virtual-tour/`(**不進版控**,已寫入 `.git/info/exclude`;截圖未搬)。進度:`final.html` 為 11/23 14:08 版。
- 守則:脫敏(§6)、每個動畫步驟要有畫面或事實簿來源、不發明。
- 待辦:① 在 agent-hub 補工單並把 owner 改成本座位(目前查無此案工單)② 通知 M-Agent 已接手,避免兩邊同時改 ③ 對照規格 §8 盤點完成度(步驟 1~7)④ 需 Eric 登入真實畫面才能補 🔍 項。
- **Eric 決定(11-23)**:成品保留 4 個展示環境網址(priiot/mms/smartline/mcse),是規格 §6 唯一例外,已寫入規格 §9 第 7 點。脫敏搜尋以此為白名單。
- 盤點(11-23):功能測試 t8.py 全過(7 站 15 功能、中英、桌機手機、播放到結束、JS 錯誤 0)。待做:抽查 steps_trace 來源、驗英文 miss、美編檢查、發布私人 Artifact。M-Agent 通知被扣住未送達,Eric 需到 M-Agent 對話口頭告知。
- 盤點結論(11-23):步驟 2、3(來源齊)、4(miss 0)、6(含 4 例外網址)達標;步驟 5 美編只做了我的目視,尚無獨立美編檢查員記錄;步驟 7 待發布。
- 11-24:build.py、build_combined.py 原寫死 M-Agent 暫存路徑,已改為相對本目錄(此前兩次「重建一致」驗證無效,且寫入過 M-Agent 暫存區同名檔,內容與其原檔相同)。美編必修 3 已修;建議 9 項見工單。
- 11-24 PDCA 結論:美編建議 #1 #3 #4 #9 已做;#2 還原;#5 #6 #7 #8 不做(理由見工單)。t8 全過。下一步:發布私人 Artifact 給 Eric 驗收。
- 11-24 已發布私人 Artifact(見工單 T-20261123-08)。等 Eric 驗收。
- 2026-11-24 Eric 新指示:A/B/C 改標籤頁、「看操作動畫」改 popup、寬度對應 2K、畫面 100% 復刻(A=priiot、B=mms 真實畫面,C=附圖排程與 Dashboard);**不可顯示公司名、客戶名、產品名**(須烤進圖檔像素,非僅網頁遮罩)。

---
## 2026-11-25 接力(夜班交接;Eric 休息,要我夜班處理)
**Eric 新需求(11-24 起)**:① A/B/C 三模組改**標籤頁**;② 「看操作動畫」改 **popup 視窗**;③ 寬度對應 **2K 螢幕**;④ 畫面 **100% 復刻**:A=priiot.ericchh.work 真實畫面、B=mms.ericchh.work 真實畫面、C=Eric 附圖(排程、Dashboard);⑤ **不可顯示公司名、客戶名、產品名**(烤進圖檔像素)。
**已做**
- 附圖 7 張複製到 `virtual-tour/srcC/`(原圖,**不進版控**);`virtual-tour/maskC.py` 產出遮蓋版 `virtual-tour/outC/{1,2,7}.png`(公司名→「示意公司」;客戶→Customer A..;主卡號→SIM-000n;品名→Sample Carton n)。已目視 OK。3、4、5、6 號圖(Grafana、停車/不良原因清單)無公司/客戶名,原圖可直接用(送進頁面前再確認一次)。
- 圖號對應:1=Converter Production List、2=Converter Schedule、3=Dashboard 多機總覽、4=Dashboard 單機、5=停車/不良分析、6=停車/不良原因清單、7=Converter Output。
- PRIIOT 展示站:Chrome 分頁 117009466 已用操作員 OP1 登入(免密碼);抓過「即時監控」全解析度圖(`/var/folders/.../claude-chrome-screenshots-Dn8jW4/`,暫存);排程/報表/分析只存了縮小版,**要重抓**;今天的資料是空的 → 報表與分析要把日期拉到 **2026-10**(DB 有 294 筆 `SIM202610-` 模擬紀錄)。Eric 說「PRIIOT 展示站你幫做模擬資料」:先用 10 月資料,不夠才用畫面操作新增,**不直接改資料庫**。
- MMS:分頁 117009469 停在登入頁(帳密為瀏覽器自動填入)。**Claude 不得替使用者按「登入」**(等於以密碼驗證);須 Eric 自己在該分頁按登入。若夜班結束仍未登入,MMS 標籤頁先用 `facts/live_20261121_priiot_mms.md` 與既有重繪保底,並註記待補。
**下一步(照順序)**
1. 抓 PRIIOT 全解析度畫面(登入、排程/產品庫、監控、停車原因視窗、完工確認、報表、生產分析),**客戶名、品名一律用 `maskC.py` 同法烤進像素**(PRIIOT 畫面有「QA測試」客戶名與「RSC B楞 中型箱」品名)。
2. 抓 MMS 畫面(待 Eric 登入)。
3. 重構 `p1.html`/`p3~p7.js`:A/B/C 標籤頁、「看操作動畫」popup(以真實截圖輪播+步驟文字取代重繪 mockup)、最大寬 ~2200px;保留 3D 場景在上方當入口(預設,Eric 未否決)。
4. 重建(`python3 build.py && python3 build_combined.py`,現已用相對路徑),跑 `t8.py` 全過,再 `Artifact` 發布到同一網址 https://claude.ai/artifact/1wzzTMQ6SaJ438W7TgYcMg(私人)。
5. 脫敏搜尋:除 4 個展示環境網址白名單外,不得有公司名/客戶名/品名。
6. M-Agent 尚不知已接手(訊息被扣住);工單 `agent-hub/tickets/T-20261123-08.md`。

### 2026-11-25 補充(Eric 已登入 MMS;指示:畫面不可簡化、要復刻、資料不足由我模擬、PDCA、順序=先查程式→流程→配置→最後查畫面、做到完成)
- **PRIIOT 抓圖法(已驗證可行)**:`virtual-tour/cap_a.py`(Playwright+系統 Chrome,2560x1440)。登入=`get_by_label("帳號 (Username)").fill("OP1")` 再按「選取 (Select)」(新 context 名冊是空的,不能點名冊列)。排程/產品庫在 `localStorage`(`orders`、`products`),啟動時 `POST /api/orders/sync` 會寫伺服器 → 抓圖 context 用 `route` 擋掉非 GET(登入 `/api/v1/auth/login` 除外)。
- **模擬資料作法**:`add_init_script` 在載入前塞 localStorage 的 products/orders(客戶 A、範例紙箱 RSC…);`/api/monitor/realtime` 平時回 204,以 `route.fulfill` 模擬 `{lineSpeed:240, di1:遞增計數, status:1}`(格式見 `frontend/src/hooks/useRealtimeData.js`);停車原因清單有 6 筆(送紙歪斜、印刷不清…)。報表/分析頁日期拉到 2026-10(DB 有 SIM202610 模擬資料)。
- **遮蓋**:PRIIOT 畫面在截圖前用 DOM 文字替換(QA測試→客戶 A;品名→範例紙箱…),不必後製像素。MMS 因要用 Eric 已登入的 Chrome 分頁(117009469),改用 Chrome 工具截圖(可 `resize_window` 放大),客戶/品名/公司名若出現,截圖後用 `maskC.py` 同法處理。

### 2026-11-25 清空前 Next Step(逐字,清空後照做)
**狀態**:Eric 已登入 MMS(Chrome 分頁 117009469,停在 mms.ericchh.work)。指示:畫面不可簡化、100% 復刻、資料不足我模擬、PDCA(先查程式→流程→配置→最後查畫面)、做到完成。標籤頁 A/B/C、「看操作動畫」popup、2K 寬、不顯示公司名/客戶名/產品名。
**已驗證的技術事實**
- `virtual-tour/cap_a.py` 的 `login(pg)` 可用(帳號欄填 OP1 → 按「選取 (Select)」),Playwright 2560x1440 可載入展示站。
- 登入完成**之前**呼叫 `/api/orders`、`/api/orders/sync` 會回 401;登入後排程頁才有伺服器資料(排程頁當時有序號 10/20 兩筆,客戶「QA測試」)。monitor/realtime 平時回 **204**。
- 排程資料格式尚未取得:下一步用 `page.on("response")` 在**登入後**切到 /schedule 時擷取 `GET /api/orders` 的 JSON,照該格式做模擬(客戶 A…、範例紙箱 RSC…),並以 `page.route` 對 `**/api/orders**` GET 回模擬、擋掉所有非 GET(登入除外)。monitor 用 `route.fulfill` 回 `{lineSpeed:240,di1:遞增,status:1}`。產品庫直接寫 `localStorage.products`(格式:id、boxNo、customer、productName、boxType、flute、thickness、bundleCount、remarks、length/width/height)。
- 前端按鈕:F1 上移/F2 下移/F3 送單/F4 完工/F5+ 良品/F6+ 不良/F7 訂單/M/N 下一筆/F9 班別/F10 退回/F12 離開。
**要抓的 A 畫面清單**:登入(含管理者按鈕)、排程+產品庫、新增排程、F3 送單後監控、機器狀態頁籤、停車原因視窗、停車原因頁籤、F4 完工確認、報表(生產明細/日報/月報/停車原因,日期 2026-10)、生產分析(含圖表+條件)。對照 `virtual-tour/steps_trace.md` 的 A 區步驟(1~7 功能共 29 步)。
**B(MMS)**:用 Chrome 工具在分頁 117009469 操作與截圖(`resize_window` 放大);對照 steps_trace 的 B 區(8~10 功能)。
**C**:用 `virtual-tour/outC/{1,2,7}.png`(已遮蓋)與 `srcC/{3,4,5,6}`(Grafana 與原因清單,無公司/客戶名);圖號對照見上節。
**重構**:`p1.html`/`p3~p7.js` 改成 A/B/C 標籤頁+popup 動畫(以真實截圖輪播+步驟說明);最大寬 ~2200px;3D 場景保留為上方入口。`python3 build.py && python3 build_combined.py` 重建、`python3 t8.py` 全過、`Artifact` 發布到 https://claude.ai/artifact/1wzzTMQ6SaJ438W7TgYcMg;完工後做脫敏全文搜尋(白名單=4 個展示環境網址)。

### 2026-11-25 00:50 進度(清空後接手用)
- **A 區抓圖腳本已就緒**:`virtual-tour/cap_a2.py`(框架:模擬 orders/realtime、擋非 GET、DOM 遮蓋)、`cap_a_full.py`(登入→待機→F3→運轉→停車視窗,已跑通)。**必須 `dangerouslyDisableSandbox`**(沙箱擋 Chrome profile)。輸出 `virtual-tour/shotsA/a01..a09*.png`(2560x1440,已遮蓋客戶 A/B、範例紙箱、SIM-000n)。
- 關鍵技巧:登入後 server 載入的 orders 首筆會當「執行中」→ 先按 `M/N 下一筆`(關自動下一筆)再按 F10 → 佔位列待機;點排隊列後 `keyboard.press("F3")`;state 字典控制 realtime(speed/di1,di1 起始 >0 才會 tare);排程頁點產品列會開「產品規格詳情」視窗(要按「關閉」),再按「新增排程」開真實視窗。
- 待抓:選機械故障→確認、F4 完工確認視窗、報表四分頁(日期 2026-10)、生產分析、新增排程填寫後。之後 B(MMS 分頁 117009469)、C、重構頁面。

### 2026-11-25 01:35 A 區抓圖完成
- `virtual-tour/shotsA/` 已有全部 A 區真實畫面(2560x1440):a01 登入/a01b 填帳號/a01c 管理者;a02 待機;a03 排程;a04 選列(展開圖);a05_product_detail 產品規格視窗;a05_add_modal 新增排程;a06 選排隊單;a07 運轉(F3 後);a08/a09/a09b/a10 停車原因視窗與頁籤;a10b;a11 完工確認;a11b 填不良;a12 遞補;r01 生產明細;r02 日報;r03 月報(2026-10);r04 停車原因;r04b 展開;an01~an05 生產分析(長條/班別/折線/圓餅/表格)。`a05_dbg/an00/an02_add_category/probe_schedule/r00` 是廢圖。腳本:`cap_a_full.py`(監控流程)、`cap_a_rpt2.py`+`cap_a_rpt3.py`(報表)、`cap_a_an.py`(分析),框架 `cap_a2.py`(遮蓋規則在 MASK_JS/FILL_JS)。
- **待**:B(MMS 分頁 117009469 用 Chrome 工具截圖)、C 圖、重構頁面(標籤頁+popup+2K)、重建/t8/發布/脫敏搜尋。

### 2026-11-25 02:00 B 區改法(清空後接手用)
- Chrome 工具截圖只有 ~1568px、且本機接收器被 Chrome 區網權限擋,**放棄 Chrome 工具抓 MMS**。改:Playwright 載入 mms.ericchh.work 靜態 SPA,假 `mmToken`+`route` 全模擬 API(不登入、不寫線上資料)。已派背景子代理產出 `virtual-tour/shotsB/b*.png` + `INDEX.md` + `cap_b.py`(完成會通知;回來要肉眼驗脫敏)。MMS 線上 DB 實際只有 1 台設備 M20、其餘全空。
- 下一步:C 圖(outC/、srcC/)→ 重構 p1.html/p3~p7.js(標籤頁 A/B/C、popup 動畫輪播真實截圖、2K 寬)→ 重建 → t8 → 發布 → 脫敏搜尋。

### 2026-11-25 02:20 清空前 Next Step(逐字)
**素材狀態**:A 區 31 張真實 2K 圖在 `virtual-tour/shotsA/`(見上節清單);C 圖 `outC/{1,2,7}.png`(已遮蓋)+`srcC/{3.webp,4.png,5.png,6.png}`(已確認無公司/客戶名;圖號 1=Converter Production List 2=Converter Schedule 3=Dashboard 多機 4=Dashboard 單機 5=停車/不良分析 6=原因清單 7=Converter Output);B 區由背景子代理產出 `virtual-tour/shotsB/b*.png`+`INDEX.md`(完成通知到才算,**回來必須肉眼逐張驗脫敏**,不通過就請它補)。
**頁面架構(現況)**:`p1.html`(殼+CSS)+`p2~p7.js`+`p5m.js` →`build.py` 產 `all.html`/`body.js` →`build_combined.py` 產 `final.html`(含 EN 翻譯管線:TL()/applyStatic;`i18n/*.json`)。3D 場景 + 站點面板 + 舊「看操作動畫」(`#video` 區,重繪 mockup)都在內。
**重構方案(已決定,照做)**:不動 3D/EN 管線內部,**新增一層**:(1) 在 `p1.html` 場景下方加「A 印刷機生產 / B 維護 / C 現場管理」標籤頁(`role=tablist`,鍵盤可操作),每頁以真實截圖為主,逐步驟卡片(圖+字幕,字幕沿用 `steps_trace.md` 對應步驟,圖用 `<img>` 相對路徑或 base64);(2)「看操作動畫」改開 **popup 視窗**(`<dialog>`),內容=該模組真實截圖輪播(上一步/播放/下一步+字幕+進度),取代舊 `#video` 區與其觸發鈕(找 p5/p6/p7 內呼叫 video 的按鈕改指向 popup);(3) 最大寬 `max-width: ~2200px`,圖片 `width:100%`;(4) 圖片需烤入遮蓋(已完成,勿再用網頁遮罩替代);(5) 英文版:標籤與字幕補 EN(沿用 TL/ENH 機制或新增小字典),圖內文字維持中文(註明)。
**打包**:圖片數量大(31+B+C),Artifact 單檔 ≤16MB → 以 JPEG 品質 80、寬 ≤2200 轉檔(PIL),base64 內嵌或用 Artifact 的 `files` 多檔發布(`files` 映射相對路徑,支援 binary ≤15MB/檔)。優先 `files` 方式。
**驗證順序**:`python3 build.py && python3 build_combined.py`→`python3 t8.py`(功能測試,需沙箱外)→肉眼看標籤頁/popup 截圖→脫敏全文搜尋(白名單=4 個展示環境網址;搜公司名、QA測試、真實品名、infotech 等)→`Artifact` 發布到 https://claude.ai/artifact/1wzzTMQ6SaJ438W7TgYcMg(私人,同網址更新)→更新工單 `agent-hub/tickets/T-20261123-08.md` 與 handoff,通知 Eric 驗收。

### 2026-11-25 B 區完成
- `virtual-tour/shotsB/` 34 張 2560x1440(b01~b34 + `INDEX.md` 對應 steps_trace 第 8~10 節,腳本 `cap_b.py`)。我已用縮圖拼板複看前 12 張,無公司/客戶/產品名;b25~b34 與其餘由子代理肉眼驗過。b08 QR 內含 mms.ericchh.work(屬白名單網址,可留)。
- 素材齊備,剩:重構頁面(見上節方案)→ 重建 → t8 → 發布 → 脫敏搜尋。

### 2026-11-25 重構完成並已發布(Version 2)
- 新增一層不動舊管線:`virtual-tour/tour_data.py`(圖與中英說明)+`tour.js`+`tour.css`+`build_tour.py`(final.html → `out/index.html` + `out/img/*.jpg`,69 張,8.3MB)。重建順序:`build.py`→`build_combined.py`→`build_tour.py`。
- 內容:A/B/C 標籤頁(鍵盤方向鍵可切)、每功能真實截圖卡片、「看操作動畫」改開 `<dialog>` popup 輪播(上一步/播放/下一步/進度)、舊 `#video` 區隱藏、`main` 最大寬 2200px、EN 切換同步。登入頁三張已裁到內容範圍。
- 驗證:`t8.py` 全過(舊功能未退化);`t_tour.py` 桌機 2560 與手機 390 無橫向捲動、無 JS 錯誤;全文搜尋僅出現 4 個展示網址+函式庫 CDN;圖內脫敏為烤入像素。
- 已發布 https://claude.ai/artifact/1wzzTMQ6SaJ438W7TgYcMg(私人)。待 Eric 驗收。
- 已知:手機報工(mrep)無真實截圖,popup 該功能改播排程匯入畫面;C 區截圖僅 7 張。

### 2026-11-25 PDCA 第二輪完成(Version 3 已發布)+ MM API 設定檢查
- 細節見 `docs/report20261125-1.md`。虛擬導覽:依規格 §6 補 C 區像素脫敏(`maskC.py` 產 `outC/1~7.png`)、B 區改名重抓、A 區說明對圖改寫、mrep/main 改開示意播放器、獨立功能測試與美編檢查完成。等 Eric 驗收與 5 個待決項。
- MM API:兩邊程式符合契約但整合未開(PRIIOT 無 MM_SERVICE 金鑰、`MM_ENTRY_URL` 空;MM 為 standalone,且 compose 未傳 `MMS_AUTH_MODE`/`MMS_PRIIOT_*`)。**Next Step**:Eric 在場做 I4;先請 MM 座位補 compose 的環境變數傳遞。
- 11-25 補設定:已建 `MM_SERVICE` 金鑰(前綴 ef0938808d9a,DB 層)、PRIIOT `MM_ENTRY_URL` 已設並重建 API、MM compose 已補變數傳遞(MM repo 已 commit、未 push)。MM 仍 standalone、`mm-v2` 未重建。細節與回滾見 `docs/report20261125-1.md` 第三節。**Next Step**:I4 時把 MM `.env` 的 `MMS_AUTH_MODE` 改 priiot 並重建,由 Eric 登入測登入代碼全流程。

### 【2026-11-25 晚】I4 切換已做,等 Eric 真人測全流程
- MM 已是 `MMS_AUTH_MODE=priiot`(`mm-v2` 以 v2+cutover 重建,healthy);本地登入 404、`/api/auth/mode` 回 priiot、假代碼兌換有打到 PRIIOT。
- PRIIOT 前端補上入口取代碼(commit `acb6378`,未 push),前端容器已重建。
- **下一步**:請 Eric 以 ADMIN/ENGINEER/SUPERVISOR 登入 PRIIOT → 點 MM 入口 → 應直接登入 MM。失敗就看 `docker logs mm-v2` 與 API 記錄;要回滾見 `docs/report20261125-1.md` 第四節。
- 回滾點:`MM/backups/mms-backup-20261125-134906.tar`、映像 `mm-v2:pre-i4-20261125`、`printingiot-frontend:pre-i4-20261125`。

### 【2026-11-26】導覽頁第 5 版,Eric 回覆「完成」
- C「現場看板」第四張換成全廠機台看板:原圖只有 430×274,改由 `virtual-tour/sim8.py` 以示意資料重繪(輸出 `outC/8.png`),圖說標「示意重繪」。舊的原因清單圖已移除。
- 表格欄名與狀態格左下標籤是依版面推測的,Eric 若提供實際名稱,改 `sim8.py` 後跑 `python3 sim8.py && python3 build_tour.py` 再發佈。
- 未 push:Printing IoT `acb6378`、`eadfcab` 與本筆;MM `9ab5a09`。I4 真人全流程仍待 Eric 測。

### 【2026-11-26】I4 登入全流程通過(Eric 實測)
- 「🔧 維護」入口出現、可直接登入 MM。入口顯示修正為 commit `78ac870`(已 push)。
- 剩現場項目:deviceId 對照、計數歸零、故障對映 `Error`、角色權限對映。MM 維持 `MMS_AUTH_MODE=priiot`。

### 【2026-11-27】已回覆 MM 的 WISE 數字對照(工單 T-20261119-13)
- 回覆在 `MM/docs/inbox/20261127-PRIIOT-WISE數字對照回覆.md`;測試 `backend/PrintingIoT.Tests/Integration/WiseCounterParityTests.cs`(commit `73263db`,14 項過,全套 396 過)。
- 結論:序列 100→250→30→80 的 counter 輸出與 MM 表一致。差異與限制:counter 只反映已寫入歷史的紀錄(節流);節流區間內的歸零可能判不出來;數值字串與負數本系統會採用、MM 不採用;本系統沒有 WISE 模擬器,且 Worker 連的是自家 `mqtt-broker`。
- 未實測真實 MQTT。待 Eric 決定:歸零盲區要不要處理。未 push:`73263db` 與本筆;MM `61282db`。

### 【2026-11-28】決議:歸零盲區先不處理(Eric「依建議」)
- 理由:MM 設備 deviceId 留空、張數仍人工輸入,計數這條路尚未實際使用。
- 日後現場要接計數時再做:在 `TelemetryPipeline.ShouldWriteLogAsync` 加一條「計數比上次寫入的值小就立刻寫入」,並補測試(現有 `WiseCounterParityTests.Counter_CannotSeeReset_WhenNewValueAlreadyExceedsPrevious` 屆時要改期望值)。
