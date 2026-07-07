# Handoff — Claude(Printing IoT)
> 最後更新:2026-07-07(P5 文件對齊回合)

## Current Task
C′ 遷移收尾 回1:**P5 文件對齊(純文件回合)**— RD 實作完成,待 Tester 驗收。規格:docs/spec-v1.md(回3 規格已歸檔至 docs/spec20260707-1.md 並完成 AC-4 勘誤)。

## Done
- P0–P4 三回全部完成並驗收 PASS(總結 docs/report20260707-2.md;RD 報告 docs/report20260707-1.md)
- P5 工作項 1:主系統文件盤點校正 — README、PROJECT_STATUS 更新為現況;HANDOVER/DEPLOYMENT_GUIDE_v1/操作說明書.md/Supervisor_Manual/Operator Manual/開發說明書/維護保養開發設計書/REFACTORING_LOG 檔頭加註記(正文凍結)
- P5 工作項 2:doc/操作說明文件.html v3.0 **定稿**(評估欄定案化、M2 九頁籤、M13/M14 已實作、轉址公告更正為「待 Eric 手動執行 + 本機入口 5301」)
- P5 工作項 3:AC-4 勘誤驗證 — docs/spec20260707-1.md 三處 Restrict 勘誤完整;兩 repo 無現行文件再以 Cascade 描述該兩組 FK
- P5 工作項 4:MM README 改寫(設備資產管理外掛、兩元件並立、9 頁籤、migration 工作流、/api/v1/* 端點、搬移腳本)+ MM/CLAUDE.md 新建
- P5 工作項 5:兩 repo 文件 commit(見 git log;皆未 push)

## Next Step
1. Tester 依 docs/spec-v1.md §7 AC-1~AC-9 驗收 P5
2. **Eric 手動**:Cloudflare 三步驟 — 建 mms.ericchh.work public hostname、移除 smartparts.ericchh.work、設 301(詳 docs/report20260707-1.md §6.3)
3. 兩 repo 未 push commit 待 Eric 同意後 push
4. 遺留小修:ScheduleId1 shadow FK、重複 SupplierName、PartDto 規格筆誤(詳 report20260707-2.md §5)

## Key Context (minimal)
- 主系統分支 feat/extract-maintenance;MM repo /Volumes/G70Pro/cusor pool/MM(main)
- 詞彙準繩:零件管理 = /api/v1/*(採購主檔);備品零件 = /api/parts(保養耗用)
- MM 入口:mms.ericchh.work 待生效;本機 http://localhost:5301
- FlexoDB 備份在 MM backups/(gitignore);FlexoDB 三表已 drop(migration 可還原)
- MM docker-compose.yml 第 18 行註解仍寫 EnsureCreated(過時)— 屬部署檔,P5 紅線不可改,留待日後程式回合

## Risk / Note
- mms.ericchh.work 尚為 NXDOMAIN → MM 前端對外不可達,Cloudflare 步驟完成前 smartparts 使用者無新入口
- 歷史文件(doc/report*、doc/spec*、會議紀錄、MM docs/)一律凍結,僅檔頭註記
- 禁止 git push(全域紅線)
