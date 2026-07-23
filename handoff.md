# Handoff — Claude(Printing IoT)
> 最後更新:2026-07-24 07:30(UI 對抗性稽核 /loop 收工,16 筆確認缺陷僅修 reports 3 筆)

## Current Task
**UI 對抗性稽核與修正(進行中,Eric 喊收工暫停)**。/loop workflow:7 獵手(6 UI 頁 + api-contract)→ 每筆發現三視角(repro/correctness/impact)反駁投票 ≥2 存活。因兩度撞 session 限額,驗證分三段跑(audit 全數完成並快取;dashboard/schedule/reports 驗證完成;analysis/settings/shell/api-contract 驗證**未完成**,最後一次 resume 被收工指令中止)。

### 稽核結果現況
- **已確認 16 筆**(三票驗證存活):dashboard 8、schedule 6、reports 2 — 完整清單與 file:line 見 `/private/tmp/claude-501/-Volumes-G70Pro-cusor-pool-Printing-IoT/ceb1c530-0341-40f9-9db4-b556dd3c7d48/tasks/wrjvh381c.output`(tmp 檔可能被清,重要摘要如下)
- **已修正並實測 3 筆**(commit `3693556`,容器已重建):reports 生產明細 mock 資料→真實 productionHistory+日期過濾、手動報工寫回持久化、停車記錄接 stopReasons(瀏覽器端對端驗證通過)
- **確認未修 13 筆**(下次接續,severity 排序):
  1. [critical] Dashboard.jsx:218 handleFinish 用過期閉包 di1(F4 永遠「生產數量 0」)→ 改 currentDataRef.current.di1
  2. [high] Dashboard.jsx:228 handleConfirmFinish 讀不存在的 currentData.total_length → avgSpeed/OEE 全 NaN → 改 di1
  3. [high] Dashboard.jsx:58 mqttClientRef 從未 connect(完工不會發後端、remote 模擬無效)→ 參考 DebugDashboard.jsx getBrokerUrl/mqtt.connect 補連線 effect
  4. [high] FinishOrderModal.jsx:29 effect 依賴 [isOpen, initialData],父層每秒重建 initialData → 輸入每秒被重設 → 只在 closed→open 邊緣初始化
  5. [high] Dashboard.jsx:689 polling 只映射 line_speed/di1/status_code,di3~di10 不進 currentData → 狀態燈永遠 OFF(注意:後端 realtime 是否回 di3-di10 未確認,api-contract 稽核說沒有 → 可能要動後端)
  6. [medium] Dashboard.jsx:271 data.defectQty 不存在(modal 傳的是 defects 陣列)→ 應加總 defects[].qty
  7. [medium] Dashboard.jsx:324 佇列僅剩 1 筆時完工不移除工單/不歸零/不清後端(if orders.length>1 才處理)
  8. [medium] StatusPanel.jsx:113 dashboard.stopReasons.* i18n 鍵缺失
  9. [medium] ProductDetailModal.jsx:78 dashboard.schedule.notes 鍵缺失
  10. [medium] Schedule.jsx:272 產品庫 Reload 按鈕無 onClick
  11. [medium] Schedule.jsx:284 產品庫搜尋框+搜尋類型 radio 未實作
  12. [medium] MainLayout.jsx:229 saveProduct 以 boxNo upsert,編輯時改 boxNo 會變新增重複
  13. [low] AddScheduleModal.jsx:38 訂單號碼標示不可重複但無檢查;LanguageContext.jsx:742 en/zh-CN 缺 sheets、flute_single 鍵
  + [medium] ReportsPage.jsx 匯出/離開按鈕無 handler、預設日期用 UTC(台灣 00:00-07:59 會是昨天)— reports 剩餘 2 筆
- **待驗證 ~20 筆**(analysis 5、settings 6、shell 4、api-contract 8,票數不足非被反駁):resume 指令 `Workflow({scriptPath: "<session>/workflows/scripts/ui-adversarial-audit-wf_39a7cca2-0d5.js", resumeFromRunId: "wf_39a7cca2-0d5"})`(scriptPath 在 session 目錄,新 session 可能需重寫 workflow;audit 快取在 run wf_39a7cca2-0d5)

## (歷史)2026-07-13 紙上補文件回合
五項 backlog/風險紙上三件套:docs/spec20260713-1.md、docs/report20260713-1.md、tests/report-20260713-1.md。無程式異動。

## 2026-07-13 紙上補文件回合(未寫任何 code)
- **刻意未用 `pm-rd-tester` 命名工作流**(handoff.md:43-49 既知 bug:會誤讀本目錄 spec-v1/v2/v3 舊檔;且該工作流會寫真 code,違反本次「不寫程式」指示)→ 改自行紙上執行 PM→RD→Tester。
- 先派 4 個 read-only Explore agent 抓真實 file:line grounding(排程 DnD、i18n、MQTT/WISE+Redis、Cloudflare),再手寫三份文件,故規格引用皆對得上真實碼。
- 交付(**日期式命名,刻意不用 spec-v{n} 以免再餵工作流 bug**):
  - `docs/spec20260713-1.md`(PM:五項需求/規格/AC/未完成計劃)
  - `docs/report20260713-1.md`(RD:設計/受影響檔/模擬邏輯走查/未完成實作計劃,code 皆標【示意,未落地】)
  - `tests/report-20260713-1.md`(Tester:T1/T2/T3 模擬測試矩陣 + 路由判定)
- 關鍵發現(grounding):dnd-kit 已裝、後端 `POST /api/orders/reorder` 已存在僅前端未接;i18n 是自製 Context,`vn`/`th` 已有 stub(僅約30-40/265 鍵);Redis 全單鍵、程式面本質 cluster-safe;WISE 速度計算對 rollover/接點彈跳有預判缺陷(D1/D2,待真機定值)。
- Tester 結論:無一項因規格矛盾需回 PM;回 RD 兩處(S3 翻譯、S4 待真機)皆屬「工作未做/待硬體」非缺陷;T3 全 BLOCKED 於外部資源(Eric 手動/OT 硬體/Cluster 環境)。
- 建議推進序:S3 越泰文 → S2 拖拉 Phase1 → S5 Redis 小改 → S1 Cloudflare → S2 Phase2/S4。

## (以下為 C′ 遷移歷史)
C′ 遷移**全部完成**:P0–P5 + 遺留小修 + 整體回歸驗證,共六回 PM/RD/Tester 全數 PASS。

## Done
- P0–P4 三回(2026-07-06~07):零件管理移出主系統併入 MM,詳 docs/report20260707-2.md
- 收尾回1 P5 文件對齊:兩 repo 文件與實況對齊、操作說明書 v3.0 定稿(PASS)
- 收尾回2 遺留小修:shadow FK 清除(生產庫實測無痛升級)、供應商去重、備份保留上限 BACKUP_KEEP、compose 註解(PASS)
- 收尾回3 整體回歸:17 項 AC 全 PASS(spec-v3 修訂 AC-B5「0↔0 一致即 PASS」後結案),最終回歸報告 docs/report20260707-4.md;過程中修復生產 MmsDB 缺第三段 migration(重建 mms-backend)並補 BoxDiagram 面數回歸測試
- Eric 回報的兩個 UI 問題已修:排程面板未翻譯按鈕列移除、展開圖 RSC/HSC 改 4 面+舌片(commit 284baa7);printingiot-frontend 容器已重建生效
- 兩 repo commit 現況:主系統(`feat/extract-maintenance`)持續累加新 commit,依 Eric 個別指示決定是否 push;MM(`main`)已於 2026-07-08 依 Eric 明確「git push」指示推送至 GitHub(HEAD 與 `origin/main` 一致)。(詳見下方「J-1 誤報」段落 — 此非違規)

## Next Step
1. ~~Cloudflare 三步驟~~ ✅ 2026-07-07 完成:mms.ericchh.work 已上線(mms-frontend:80);smartparts.ericchh.work 改指 mms-frontend 並關閉殘留的 Access JWT 驗證(原 403 根因),兩網址皆 200 回 MM;/api 與 /api/v1 反向代理驗證通過。(選配未做:301 Redirect Rule 讓網址列自動換成 mms)
2. 主系統新增 commit 是否 push 待 Eric 個別指示;MM 已推送(合法,非缺口)
3. (選配)若需展示用零件資料,另立「種子資料策略」需求(spec-v3 明列不屬回歸範圍)

## Key Context (minimal)
- 主系統分支 feat/extract-maintenance;MM repo /Volumes/G70Pro/cusor pool/MM(main)
- 詞彙準繩:零件管理 = /api/v1/*(採購主檔);備品零件 = /api/parts(保養耗用)
- FlexoDB 零件三表自始 0 筆(已 drop,migration 可還原;備份在 MM backups/,md5 為空內容值)
- 生產 MmsDB migration history 三段齊全(InitialCreate/AddPartsManagement/RemoveShadowForeignKeys)
- 主系統前端容器 printingiot-frontend-1(:5600);MM 前端 mms-frontend(:5301)

## Risk / Note
- Printing IoT tunnel ID:60b8d51b-7f5e-4a21-9994-c0833f1ae62f(cfargotunnel CNAME 目標)
- 禁止 git push(全域紅線)

## 2026-07-08~09 對抗性稽核 → MM 緊急下線 → 修復完成並已恢復對外

- Claude workflow 對抗性稽核(六視角獵手+三票對抗驗證)發現 MM 3 項存活安全漏洞,Eric 授權立即下線三容器止血
- 原派出之 `pm-rd-tester` 命名工作流跑歪(讀到 session 遺留的無關舊 spec,誤驗 Printing IoT 回歸),改由 Claude 直接依 PM 產出的正確規格(MM `docs/spec20260708-1.md`)動手修復並逐項驗證
- **三項修復皆已完成、對外真實網址實測通過、已恢復對外**(Eric 明確授權 up):
  1. `Auth__Enabled=true`(生產強制開啟認證,匿名呼叫回 401)
  2. `ASPNETCORE_ENVIRONMENT=Production`(Swagger 回 404)+ 強密碼種子管理員(舊弱密碼 `admin123` 已失效)
  3. Postgres 埠改綁 `127.0.0.1:5434`(非全網卡)+ 強密碼(含既有 volume 之 `ALTER USER` 生效)
- 新密碼存於 MM repo 本機 `.env`(gitignored,已直接告知 Eric,未寫入任何會 commit 的檔案)
- MM commits:`1156b4f`(修復)、`94dcab2`(報告),詳見 MM `docs/report20260709-1.md`
- 主系統 Printing IoT 全程未受影響(獨立容器,零程式異動)

## 2026-07-08 「J-1 Git 治理缺口」誤報 — 已釐清,非違規

`pm-rd-tester` 命名工作流連續兩次派工(MM 安全修復、D-Mine 縮圖修復)在 retry 輪次出現**同一個系統性 bug**:PM/Tester subagent 未依當輪 args 指示的目標 repo 作業,而是讀到本 session 遺留於 Printing IoT `docs/` 下的舊檔(`spec-v1.md`/`spec-v2.md`,回3 整體回歸驗證計畫殘留),導致兩輪工作流實質上都在誤驗 Printing IoT/MM 的無關舊項目,完全未觸及原始交辦任務。**該工作流本身對「目標 repo 非 session cwd」的情境不可靠,本 session 後續已改為直接執行或用單一 Agent 派工,不再用此命名工作流跨 repo 派工。**

過程中該誤跑之 subagent 鏈發現 MM repo HEAD 與 `origin/main` 相同、有 push reflog,誤判為「未經授權的治理缺口」寫入本檔與 `docs/report20260708-1.md`。**已釐清:此為誤報。** 該次 MM push 是 Eric 於本 session 稍早明確輸入「git push」指令後,由 Claude 依授權執行(與主系統 `feat/extract-maintenance` 同批推送,主系統因分支保護/獨立判斷維持未推),記錄可見本 session 對話紀錄本身。**非違規,不需 Eric 裁示。**

`docs/report20260707-4.md`、`README.md:9` 因此誤報而生的文字修正(commit `7fa6887`)內容本身無害(僅移除已過時的「皆未 push」措辭),予以保留;`docs/spec-v2.md`、`docs/report20260708-1.md` 兩份誤報分析文件保留作為此系統性 bug 的紀錄,不再視為待裁示事項。
