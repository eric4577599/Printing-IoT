# 驗收報告 — C′ 遷移收尾 回1(P5 文件對齊)

> 日期:2026-07-07
> 驗收者:Tester subagent(獨立驗收,所有指令親自執行,不採信 RD 說法)
> 規格:`docs/spec-v1.md`(P5 純文件回合)
> RD 報告:`docs/report20260707-3.md`
> 受驗 repo 1:`/Volumes/G70Pro/cusor pool/Printing IoT`(branch `feat/extract-maintenance`,HEAD `97f359d`,未 push)
> 受驗 repo 2:`/Volumes/G70Pro/cusor pool/MM`(main,HEAD `1ed1591`,ahead 8 未 push)
> 結果:**PASS**(T1/T2/T3 全過)

---

## T1 deterministic(自動化測試與版控事實,全數親自執行)

| # | 檢查項 | 指令 | 結果 |
|---|---|---|---|
| T1-1 | MM 後端測試 | `cd MM/backend && dotnet test` | **已通過!失敗: 0,通過: 65,總計: 65**(913 ms)✓ 與 F12 一致 |
| T1-2 | MM 前端測試 | `cd MM/frontend && npx vitest run` | **Test Files 5 passed, Tests 89 passed**(1.26s)✓ 與 F12 一致 |
| T1-3 | 主系統本回零程式異動 | `git diff --name-only -z add7fde..HEAD` | 20 檔全為 `.md`/`.html`,無任何 `.cs`/`.jsx`/compose(AC-8)✓。註:以 `-z` 重驗排除中文檔名引號造成的正規式誤判 |
| T1-4 | 主系統 commit | `git log --oneline` | `5a70efe docs: C′ 遷移工作檔納入版控`(F14 全部 9 檔,2613 行插入)、`97f359d docs: P5 文件對齊…`(11 檔);均符 Conventional Commits(AC-7)✓ |
| T1-5 | MM commit | `git show --stat 1ed1591` | `docs: P5 文件對齊 — README 兩元件定位改寫與 CLAUDE.md 新建`,僅 CLAUDE.md(+65)與 README.md(+88/-20)✓ |
| T1-6 | 無 push | 兩 repo `git log origin..HEAD` | 主系統 ahead 8、MM ahead 8,遠端未動 ✓ |
| T1-7 | status 乾淨 | 兩 repo `git status --short` | 驗收起點皆空 ✓(本報告寫入後 tests/report-v1.md 轉為已修改,屬驗收產出) |
| T1-8 | HTML 結構檢核 | python 解析 `doc/操作說明文件.html` | 全檔 tag 平衡(table 39/39、tr 183/183、td 565/565、th 162/162、div 300/300、section 21/21、span 472/472);第 2 章清單表 28 資料列全部 6 欄=表頭 6 欄,無跑版結構因子 ✓ |

**T1:PASS**

## T2 semantic(逐條對照 AC-1 ~ AC-9,抽查程式碼與 compose)

| AC | 判定 | 證據 |
|---|---|---|
| AC-1 盤點表 | PASS | RD 報告 §1 盤點表含 §2.1 初表全部檔案 + 4 個 RD 補漏檔(Supervisor/Operator/REFACTORING_LOG/維護保養開發設計書)。抽查 8 檔檔頭:HANDOVER「⚠ 2026-07 現況更新」、DEPLOYMENT_GUIDE_v1「⚠ 已廢止(DEPRECATED,2026-07)」、操作說明書.md「已由 v3.0 HTML 取代」等全數落實,正文凍結(diff 各檔僅 +2~+12 行檔頭) |
| AC-2 無殘留 | PASS | grep `sm-frontend\|smartparts\|5100\|零件管理\|SmartParts` 於兩 repo 現況型文件(README/PROJECT_STATUS/handoff/MM README/MM CLAUDE.md/HTML)逐項核閱:命中皆為「已退役/已移出/待 Eric 手動執行」等正確表述;`INSTRUCTIONS.md` 零命中;無「已停用並轉址」「:5100 可用」類不實敘述 |
| AC-3 HTML 定稿 | PASS | (a) `<title>`/h1「v3.0(定稿)」:1、:205,doc-meta「2026-07-07 定稿 · 內容與 2026-07-07 實作現況一致」:206;(b)「□ 保留 □ 修改 □ 移除」全檔 0 命中,27 畫面列+Smart Parts「已退役」列(28 資料列)保留,欄數 6=6、tag 平衡(T1-8);(c) M2「現況(9 頁籤)」:453、M7「現況(已更名)」:458、M13/M14「現況(已實作)」:464-465;(d) 轉址段 :306/:951/:1227/:1588 均載「待 Eric 手動執行/待生效」+「本機入口 http://localhost:5301」,「已停用並轉址」0 命中 |
| AC-4 勘誤 | PASS | `docs/spec20260707-1.md` 存在,檔頭 :4-6 載歸檔+勘誤緣由,三處(:65、:149、:254)為「Restrict〔勘誤:原誤寫 Cascade〕」;兩 repo grep `Cascade`:其餘命中為 Users/Roles Cascade Delete(REFACTORING_LOG:213)、ERP 級聯(report20260531-1)、MM Checklist FK(report20260606-3)— 皆非該兩組 FK;`MM/docs/report20260706-1.md` 之「FK Cascade」為拋棄式測試庫腳本行為紀錄,MmsDB 真實 FK 親驗 `20260706074434_AddPartsManagement.cs` :69/:75 均 `ReferentialAction.Restrict` |
| AC-5 MM README | PASS | 七項對實作逐一核:頁籤 9 個且順序同 `App.jsx` :234-246 tabs 陣列;端點表 GET/GET{id}/POST(`PartsCatalogController` :32/:44/:58)、GET/POST(`SuppliersController` :30/:42)、GET/POST(`SupplierPartsController` :31/:45)完全一致且未虛列 PUT/DELETE(規格自註以 Controller 為準,RD 偏離規格例示屬正確);migration 序列同 `Migrations/` 目錄;埠 5434/5300/5301:80 同 `MM/docker-compose.yml` :16/:24/:54;腳本名同 `scripts/`;測試數 65/89 註記快照日期;MigrateAsync 工作流與 baseline 說明齊備 |
| AC-6 MM CLAUDE.md | PASS | 65 行(<100);含定位(設備資產管理外掛、兩元件並立)、API 邊界表(「改 A 不可動 B」:11、`/api/parts` vs `/api/v1/parts` :16)、埠容器(F6)、migration 工作流、測試指令、禁止 git push :62、正體中文 :63;與 F6–F11 無矛盾 |
| AC-7 版控 | PASS | 見 T1-4 ~ T1-7;F14 全部 9 檔在 `5a70efe`;MM 獨立 commit |
| AC-8 紅線 | PASS | 見 T1-3;compose、`*.sh`、`*.cs`、`*.jsx` 零異動;RD 未越線改 `MM/docker-compose.yml` :18 過時註解(紅線正確遵守,已記 handoff 留待程式回合) |
| AC-9 語文 | PASS | 本回全部新增行 grep 簡體字/中國用語:命中僅 3 處且皆為「引述禁詞本身」(規格 AC-9 條文、RD 報告記錄「優化→最佳化」修正);`doc/PROJECT_STATUS.md` 已無「優化」殘留;新寫內容為正體中文台灣用語 |

**T2:PASS**

## T3 judgment(驗收契約合理性與 edge case)

| 檢查項 | 判定 |
|---|---|
| 規格 edge case 覆蓋 | §2.2/§3.2 四類 edge case 均被落實:混雜段落只改零件語句(各檔 diff 僅檔頭)、備品語境「零件庫存」未誤改、RD 補漏 4 檔進盤點表、mms.ericchh.work 全部提及處均附「待生效+5301」註記 |
| 事實不虛報 | 最關鍵的 F13(Cloudflare 未生效)在 HTML、README、HANDOVER、DEPLOYMENT_GUIDE、PROJECT_STATUS 全部如實標「待 Eric 手動執行」,無一處寫成已完成 |
| RD 對規格的兩處偏離 | 皆屬規格明文授權:F7 頁籤順序以 App.jsx 實況為準(規格自註)、§5.1 端點動詞以 Controller 實讀為準(規格自註),且 RD 報告主動揭露 — 合格 |
| 殘留風險(不阻斷) | (1) AC-3(b)「瀏覽器目視不跑版」以結構檢核(欄數一致+tag 平衡)替代人工目視,結構上無跑版因子,建議 Eric 定稿後順手開一次瀏覽器確認;(2) `MM/docker-compose.yml` :18 註解與 `test-migrate-parts-data.sh` 之 CASCADE 測試表屬程式紅線遺留,已記入 handoff.md 待程式回合 |

**T3:PASS**

## 結論

**PASS** — AC-1 ~ AC-9 全數通過,DoD 成立。P5 文件對齊完成;後續僅剩 Cloudflare 儀表板三步驟待 Eric 手動執行(`docs/report20260707-1.md` §6.3)。
