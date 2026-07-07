# Handoff — Claude(Printing IoT)
> 最後更新:2026-07-07 16:00(收尾三回完成,迴圈收工)

## Current Task
C′ 遷移**全部完成**:P0–P5 + 遺留小修 + 整體回歸驗證,共六回 PM/RD/Tester 全數 PASS。無進行中工作。

## Done
- P0–P4 三回(2026-07-06~07):零件管理移出主系統併入 MM,詳 docs/report20260707-2.md
- 收尾回1 P5 文件對齊:兩 repo 文件與實況對齊、操作說明書 v3.0 定稿(PASS)
- 收尾回2 遺留小修:shadow FK 清除(生產庫實測無痛升級)、供應商去重、備份保留上限 BACKUP_KEEP、compose 註解(PASS)
- 收尾回3 整體回歸:17 項 AC 全 PASS(spec-v3 修訂 AC-B5「0↔0 一致即 PASS」後結案),最終回歸報告 docs/report20260707-4.md;過程中修復生產 MmsDB 缺第三段 migration(重建 mms-backend)並補 BoxDiagram 面數回歸測試
- Eric 回報的兩個 UI 問題已修:排程面板未翻譯按鈕列移除、展開圖 RSC/HSC 改 4 面+舌片(commit 284baa7);printingiot-frontend 容器已重建生效
- 兩 repo 全部 commit(主系統 HEAD f5a8d77、MM HEAD 4009193),**皆未 push**

## Next Step
1. ~~Cloudflare 三步驟~~ ✅ 2026-07-07 完成:mms.ericchh.work 已上線(mms-frontend:80);smartparts.ericchh.work 改指 mms-frontend 並關閉殘留的 Access JWT 驗證(原 403 根因),兩網址皆 200 回 MM;/api 與 /api/v1 反向代理驗證通過。(選配未做:301 Redirect Rule 讓網址列自動換成 mms)
2. 兩 repo 未 push commit 待 Eric 同意後 push
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
