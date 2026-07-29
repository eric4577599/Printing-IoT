# Handoff — Claude(Printing IoT)
> 最後更新:2026-07-29 16:31

## Current Task
**專案治理收尾**:建立專案級 `CLAUDE.md`(dev 套件)+ 修正根目錄文件過時資訊。已完成並 commit,**未 push**。

## Done

### 本回合(2026-07-29)
- `/seed dev` → 新建專案根 `CLAUDE.md`(84 行,上限內)。上半部通用規範原樣保留,專案區四欄全部實地查證後填寫:技術棧、服務與 port、資料庫與路徑、專案特有慣例、已知的坑。已知的坑只放 L2 記憶 `[[指標]]`,不複製內容。
- 查證過程發現並修正三處文件失真:
  - `README.md` 技術架構表 + 目錄結構 `.NET 8` → **`.NET 9`**(全部 csproj 實為 `net9.0`)
  - `INSTRUCTIONS.md` 同一處 `.NET 8 Solution` → `.NET 9 Solution`
  - `README.md` §5 路徑慣例 `X10Pro` → **`G70Pro`**(2026-07-02 已遷移)
- 修正 `CLAUDE.md` 內一處斷鏈:`[[mm-maintenance-plugin]]` → `[[printingiot-maintenance-parts-moved-out]]`(記憶檔已更名)。
- Commit:`b8e3da9`(文件修正)、`44eb802`(新增 CLAUDE.md)。工作區乾淨。

### 先前回合結論(細節見對應報告,不再展開)
- **S2 排程拖拉排序 Phase 1+2 完成並上線**(`docs/report20260726-1.md`、`-2.md`):前端 dnd-kit 拖拉 + 後端 `SpecJson` 欄與 `POST /api/orders/sync` 全量鏡像同步。vitest 82 / xUnit 5 通過,瀏覽器實測拖拉→重載順序保留。**此批已 push**。
- **全站 i18n 三回合**(commits `6cd4c87`~`580c21c`):導覽列語言切換鈕 + Settings 7 分頁 + modals / MaintenancePage / DocsPortal 接入,補齊 20 個未定義鍵。**已 push**。
- **UI 對抗性稽核兩輪共 30 筆缺陷全數修正上線**(`docs/report20260724-1.md`、`-2.md`、`docs/audit-round2.html`)。
- **C′ 遷移 P0–P5 全部完成驗收**(`docs/report20260707-*.md`);保養維修 + 零件管理已移入獨立外掛 MM。
- **MM 安全漏洞三項修復完成、已恢復對外**(2026-07-09,MM `docs/report20260709-1.md`)。

## Next Step
1. **`git push`**(需 Eric 明確同意):`feat/extract-maintenance` 本機領先 origin **2 個 commit**(`b8e3da9`、`44eb802`),皆為文件類異動。
2. ~~修正 `README.md:9` 的 MM 現況段落~~ ✅ 2026-07-29:實測後改寫完成。實測結果 —— `mms.ericchh.work` **200**(回真實 MM 前端)、`/api/v1/parts` **401**、後端 `localhost:5300/swagger` **404**、`mm-postgres-1` 仍只綁 `127.0.0.1:5434`,三項安全修復全部仍生效;`smartparts.ericchh.work` 亦 200(301 Rule 仍未做,選配)。
   - 陷阱:公網 `/swagger` 回 **200** 是 SPA fallback 吐 index.html,不是 Swagger 被打開,別誤判為安全回退 —— 要驗就直打後端埠。
3. **S2 實機驗收(Eric 手動)**:走一次 完工 → 整頁重載 → 確認訂單順序與狀態正確。後端邏輯已 curl 驗過,但完整 UI 完工流程未跑過,而該流程涉生產監控核心。
4. **重驗 i18n backlog 現況**:L2 記憶 `i18n-app-wide-retrofit` 仍記為「Settings/modals/Docs 約 340 字串待辦」,但 2026-07-26 的三個 commit 訊息聲稱已接入 —— 兩者不一致,引用前先實查,驗完更新該記憶的 `verified`。

## Key Context
- 分支 `feat/extract-maintenance`,upstream `origin/feat/extract-maintenance`,**ahead 2 / behind 0**,工作區乾淨。
- 專案根 `/Volumes/G70Pro/cusor pool/Printing IoT`;MM 外掛獨立 repo `/Volumes/G70Pro/cusor pool/MM/`(branch `main`,已與 origin 同步)。
- 容器與 port:`printingiot-frontend-1`(:5600)、API(:5200 `/swagger`)、Postgres(:5433)、Redis(:6380)、MQTT(:1884 / WS 9001);MM 為 `mm-mms-frontend-1`(:5301)、`mm-mms-backend-1`(:5300)、`mm-postgres-1`(**127.0.0.1**:5434,僅綁 loopback 是安全修復的一部分,不要改成全網卡)。
- 資料庫單一 `FlexoDB`(Phase 3.9 起已整併);MM 用 `MmsDB`。
- **`doc/` vs `docs/`**:`doc/` 會被 `DocsController`(`/api/docs`)+ 前端 `/docs` 路由**對外提供**,寫進去等於改產品 UI;`docs/` 是 report / spec 交付物,不對外。
- 詞彙準繩:零件管理 = `/api/v1/*`(採購主檔);備品零件 = `/api/parts`(保養耗用)。
- Printing IoT tunnel ID:`60b8d51b-7f5e-4a21-9994-c0833f1ae62f`。
- 專案規則現已落在專案根 `CLAUDE.md`,新 session 會自動載入,不必再從本檔翻慣例。

## Risk / Note
- **`git push` 是全域紅線**,一律需 Eric 明確同意。
- **不要用 `pm-rd-tester` 命名工作流跨 repo 派工** —— 已知系統性 bug:subagent 會無視當輪 args,改讀本 session `docs/` 下的舊 `spec-v*.md`,兩次派工都因此誤驗到無關的舊工作。跨 repo 改用直接執行或單一 Agent。
- **主系統不得再加保養維修 / 零件管理功能**(已外移 MM)→ `[[printingiot-maintenance-parts-moved-out]]`。
- **產品庫仍 localStorage-only**,只有訂單遷到後端;改產品相關功能前先確認這層落差 → `[[schedule-orders-backend-sync]]`。
- dnd-kit 拖拉在自動化測試中需鍵盤或真實事件(合成滑鼠 / JS pointer 事件不觸發),實機滑鼠正常。
- 每次整頁重載會跳班別選擇視窗,是既有設計不是 bug。
- 大小寫:Mac 不敏感、Linux 容器敏感,import 路徑大小寫不一致會「本機過、進 Docker 炸」。
- macOS `._*` dot-underscore 檔會弄壞 `dotnet build`:`find . -name "._*" -delete`。
- (選配、未做)mms 301 Redirect Rule;di3~di10 模擬故障注入;零件展示用種子資料策略。
