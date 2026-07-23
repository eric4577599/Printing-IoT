# Handoff — Claude(Printing IoT)
> 最後更新:2026-07-24 07:40(UI 對抗性稽核 /loop 接續:確認缺陷 16→修 15、僅 #5 延後)

## Current Task
**UI 對抗性稽核與修正**。/loop workflow:7 獵手(6 UI 頁 + api-contract)→ 每筆發現三視角(repro/correctness/impact)反駁投票 ≥2 存活。**16 筆確認缺陷已修 15 筆(3 筆 reports 於 3693556、12 筆本回合於 b9e4123),僅 #5 di3-di10 延後(需後端/硬體決策)。** 尚有 ~20 筆待驗證項(票數不足,非被反駁),需 resume workflow。

### 稽核結果現況
- **已修正並驗證 15/16 筆**:
  - commit `3693556`(reports 3 筆,已重建容器實測):生產明細接真實 productionHistory+日期過濾、手動報工持久化、停車記錄接 stopReasons
  - commit `b9e4123`(本回合 12 筆,vite build 通過 + vitest 40 passed;**容器尚未重建**):
    - #1 Dashboard handleFinish 過期閉包 di1 → currentDataRef.current.di1
    - #2 Dashboard handleConfirmFinish total_length(NaN)→ di1
    - #3 Dashboard 補 MQTT 連線 effect(ws 9001,參考 DebugDashboard)
    - #4 FinishOrderModal effect 只依 isOpen、ref 持 initialData、closed→open 才初始化(+ 新增回歸測試 3 筆)
    - #6 defectQty 由 modal defects 陣列加總
    - #7 佇列剩 1 筆完工正確移除/歸零/清後端(guard >=1 且保護 orders[1])
    - #8/#9/#13 i18n:dashboard.stopReasons.*、dashboard.schedule.notes、cn/en 補 flute_single+sheets
    - #10/#11 Schedule 產品庫 Reload onClick + 搜尋框/radio(過濾保留原始 index)
    - #12 MainLayout saveProduct 優先以 id upsert(編輯改 boxNo 不再重複)
    - #13 AddScheduleModal 訂單號碼重複檢查
    - reports 剩餘:匯出 CSV、離開導回監控、預設日期改本地時區
- **確認未修 1 筆(延後,需後端+硬體決策)**:
  - **#5 [high] di3-di10 狀態燈永遠 OFF**:已查證後端 `MonitorData`(PrintingIoT.Core/Models/MonitorData.cs)僅 5 欄(DeviceId/Speed/di1/Status/Timestamp),realtime API 根本不回 di3-di10。StatusPanel 對有配置 errorSignal/runSignal(如 di3~di10)的機台部位因 currentData 無該欄恆判 OFF。**非安全前端修正**:需 (a) WISE 模組 DI 點位→機台部位對映決策(Eric/硬體);(b) 後端 MonitorData 擴充 di3-di10 + Worker 寫入 Redis;(c) 前端 polling 映射。等 Eric 定 DI 對映再動。
- **待驗證 ~20 筆**(analysis 5、settings 6、shell 4、api-contract 8,票數不足非被反駁):resume 指令 `Workflow({scriptPath: "<session>/workflows/scripts/ui-adversarial-audit-wf_39a7cca2-0d5.js", resumeFromRunId: "wf_39a7cca2-0d5"})`(scriptPath 在舊 session 目錄,新 session 需重寫 workflow;原 audit 快取在 run wf_39a7cca2-0d5,新 session 未必可用)

## Next Step(UI 稽核)
1. **容器重建**:`printingiot-frontend-1`(:5600)尚未以 b9e4123 重建,前端修正未在跑起來的站台生效。Eric 確認無展示中即可重建。
2. **#5 di3-di10**:需 Eric 提供 WISE DI 點位→機台部位對映後,才能安全實作後端+前端。
3. **待驗證 ~20 筆**:若要收尾需重跑 workflow(新 session 重寫獵手 script)。
4. 主系統新增 commit(含 b9e4123)是否 push 待 Eric 個別指示(全域紅線:未經明確同意不 push)。

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
