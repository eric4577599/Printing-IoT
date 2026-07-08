# Handoff — Claude(Printing IoT)
> 最後更新:2026-07-08 20:09(回4:J-1 Git 治理缺口文件修正)

## Current Task
C′ 遷移**全部完成**:P0–P5 + 遺留小修 + 整體回歸驗證,共六回 PM/RD/Tester 全數 PASS。無進行中工作。

## Done
- P0–P4 三回(2026-07-06~07):零件管理移出主系統併入 MM,詳 docs/report20260707-2.md
- 收尾回1 P5 文件對齊:兩 repo 文件與實況對齊、操作說明書 v3.0 定稿(PASS)
- 收尾回2 遺留小修:shadow FK 清除(生產庫實測無痛升級)、供應商去重、備份保留上限 BACKUP_KEEP、compose 註解(PASS)
- 收尾回3 整體回歸:17 項 AC 全 PASS(spec-v3 修訂 AC-B5「0↔0 一致即 PASS」後結案),最終回歸報告 docs/report20260707-4.md;過程中修復生產 MmsDB 缺第三段 migration(重建 mms-backend)並補 BoxDiagram 面數回歸測試
- Eric 回報的兩個 UI 問題已修:排程面板未翻譯按鈕列移除、展開圖 RSC/HSC 改 4 面+舌片(commit 284baa7);printingiot-frontend 容器已重建生效
- 兩 repo commit 現況(2026-07-08 治理稽核複核,取代原「皆未 push」之錯誤記載):主系統(`feat/extract-maintenance`,HEAD `7d82ab6`)`git status -sb` 顯示 `ahead 1`、無對應 `update by push` reflog,**未 push**;MM(`main`,HEAD `4009193`)`git rev-parse HEAD` 與 `origin/main` 完全相同,且 `git reflog show refs/remotes/origin/main` 可見 `update by push` 紀錄(非單純 fetch 同步),**已實際 push 至 GitHub**,構成治理缺口 J-1(與全域 CLAUDE.md「不可執行 `git push`」紅線牴觸)。證據詳 `docs/spec-v2.md` §1.1、`docs/report20260708-1.md` §1

## Next Step
1. ~~Cloudflare 三步驟~~ ✅ 2026-07-07 完成:mms.ericchh.work 已上線(mms-frontend:80);smartparts.ericchh.work 改指 mms-frontend 並關閉殘留的 Access JWT 驗證(原 403 根因),兩網址皆 200 回 MM;/api 與 /api/v1 反向代理驗證通過。(選配未做:301 Redirect Rule 讓網址列自動換成 mms)
2. 主系統未 push commit 待 Eric 同意後 push;MM repo 已 push(治理缺口 J-1,待 Eric 裁示,見上方「2026-07-08 Git 治理缺口(J-1)通知與裁示」段落),**不得**對 MM repo 做任何回退性操作
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

## 2026-07-08 對抗性稽核與 MM 緊急下線
- Claude workflow 對抗性稽核(六視角獵手+三票對抗驗證)發現 MM 3 項存活安全漏洞:(1) Critical:Auth:Enabled=false 全域關閉,對外 API 匿名可讀寫;(2) High:生產以 Development 環境跑,Swagger 外洩+內建弱密碼 admin123;(3) Medium:Postgres 對主機 0.0.0.0:5434 發布、預設密碼 postgres/password
- Eric 已授權:**MM 三容器(mm-postgres-1/mms-backend-1/mms-frontend-1)已 docker compose stop**,mms.ericchh.work/mms-api.ericchh.work/smartparts.ericchh.work 現況皆 502(有意為之,非故障)
- 修復工作流已派出(MM repo),完工後**不會自動重新對外開放**,需 Eric 確認後手動 `docker compose up -d` 三容器
- 主系統 Printing IoT 完全不受影響(獨立容器,零程式異動)

## 2026-07-08 Git 治理缺口(J-1)通知與裁示
- PM 已依 `docs/spec-v2.md` §1.1 獨立複核證據為真:MM repo HEAD 與 `origin/main` 相同,且 reflog 有 `update by push` 紀錄,判定 **CONFIRMED** 已實際 push(非 fetch 同步);主系統部分維持未 push(PASS)
- 依 §1.2-2 應向 Eric 發送治理缺口通知(頻道 `incident`,Dual-Mention `@Eric @Eric-LT AI`),說明事實與待裁示的兩種結果((a) 已授權例外 (b) 未經授權流程缺口);**本輪 RD 因 subagent 執行環境無 TeamChat 網路存取權限(sandbox 未開放 `team-chat.corriot.com` 對外連線),未能實際送出通知**,待具備 TeamChat 存取權限的執行環境(如 eric-pod 常駐秘書)補送
- **Eric 裁示結果:待 Eric 裁示**(暫記,回覆後依 §5 E11/E12 分流處置並回補本段;E11→AC-C1(v2) MM 部分 PASS 並記授權時點,E12→維持 FAIL 直到補齊預防措施文件)
