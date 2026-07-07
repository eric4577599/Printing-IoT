# 驗收報告 — C′ 遷移收尾 回3:整體回歸驗證

> 日期:2026-07-07
> 驗收者:Tester subagent(獨立驗收,所有指令親自執行,不採信 RD 說法)
> 規格:`docs/spec-v1.md`(回3 版「整體回歸驗證計畫」;回2 原文歸檔於 `docs/spec20260707-3.md`)
> 受驗 repo:主系統 `feat/extract-maintenance`(HEAD `3008939`,自基準 `b683831` 起 11 commits)、MM `main`(HEAD `4009193`,自基準 `e3cebd8` 起 11 commits)
> 結果:**FAIL(T2 semantic)→ route=RD**
>
> 註:本檔覆寫回2 驗收報告(回2 結果 PASS,內容見前一版本)。

---

## T1 deterministic(build 與自動化測試,全數親自執行)

> 沙箱內 `dotnet build` 報「建置失敗(0 警告 0 錯誤)」、主系統 vitest 之 puppeteer e2e 報「browser already running」,皆為沙箱寫入受阻誤報;依規格 §0 準繩 5 / E1 停沙箱重跑後判定。

| # | 檢查項(對應 AC) | 指令 | 結果 |
|---|---|---|---|
| T1-1 | AC-A1 主系統後端 | `dotnet build PrintingIoT.sln` + `dotnet test` | 建置成功;測試 **通過 11 / 失敗 0 / 略過 0** ✓ |
| T1-2 | AC-A2 主系統前端 | `npm run build` + `npx vitest run` | build exit 0、`dist/` 產出;vitest **5 檔全過,33/33**(含新增 BoxDiagram 回歸測試)✓ |
| T1-3 | AC-A4 compose | `docker compose config` | exit 0;services = backend-api / backend-worker / cloudflared / frontend / mqtt-broker / postgres / redis(恰 7 項);`grep -n sm-frontend docker-compose.yml` **零命中** ✓ |
| T1-4 | AC-B1 MM 後端 | `dotnet build MaintenanceSystem.sln` + `dotnet test` | 建置成功;測試 **通過 67 / 失敗 0**(≥67)✓ |
| T1-5 | AC-B2 MM 前端 | `npx vitest run` | **5 檔全過,89/89**(≥89)✓ |
| T1-6 | AC-B4 搬移腳本 | `bash scripts/migrate-parts-data.sh --verify` | exit 0;來源三表已自 FlexoDB 移除後改以最新備份檔(`flexodb-backup-20260706115229.sql`)還原臨時庫對照,三表 0=0 通過、md5 前後一致、臨時庫自動 DROP ✓ |
| T1-7 | AC-B6 前端可達 | `curl http://localhost:5301/` | **200** ✓ |

**T1:PASS**(build/test 層面全綠)

## T2 semantic(對照規格逐條核閱)— **FAIL**

### 不符事項(依嚴重度排序)

| # | AC | 問題 | 證據 | 歸因 |
|---|---|---|---|---|
| F-1 | **AC-R(§4.1)** | RD 最終回歸報告 **`docs/report20260707-4.md` 不存在** — `find` 兩 repo 全域搜尋 `*20260707-4*` 零命中;主系統 `docs/` 僅至 `report20260707-3.md`。規格 §0 角色分工與 §4.1 明定 RD 須產出含五章節之最終回歸報告,本回核心交付缺件,A5/B3-1 等項亦因此**無 RD 執行證據可供複驗** | `ls docs/`;`find ... -name "*20260707-4*"` 空 | RD |
| F-2 | **AC-B3-2** | 生產 MmsDB `__EFMigrationsHistory` 僅 **2 筆**(`20260706073656_InitialCreate`、`20260706074434_AddPartsManagement`),**缺第三段 `20260707012448_RemoveShadowForeignKeys`** — 規格要求「恰含三筆」。根因:`mm-mms-backend-1` 容器 Up 16 小時,映像早於回2 新增之 migration,啟動時 MigrateAsync 未套用第三段;修法 = 重建/重啟 mms-backend 容器令 MigrateAsync 套用後複查 history 與 shadow 欄位 | `docker exec mm-postgres-1 psql -U postgres -d MmsDB -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ...'` 輸出 2 筆;`dotnet ef migrations has-pending-model-changes` 回報 No changes(模型與 migration 同步,純部署未套用問題) | RD |
| F-3 | **E9 / B3-1 隔離** | mm-postgres 存在**殘留臨時庫 `mm_regress_20260707_t`** 未 DROP — 規格 E9「無論成敗,結束時一律 DROP 臨時庫」;修法 = `DROP DATABASE "mm_regress_20260707_t"` 並在報告記錄 | `docker exec mm-postgres-1 psql -U postgres -lt` 列出該庫 | RD |
| F-4 | **AC-B5** | `GET /api/v1/parts` 回 `[]`(200,有效 JSON,但 **筆數 = 0**),不符規格「含搬移後資料,筆數 > 0」。惟查證:**來源 FlexoDB 三表自始即 0 筆** — P2 搬移報告 `MM/docs/report20260706-1.md:54-55` 明載「生產 FlexoDB 三表目前為 0 筆(主系統零件管理尚無正式資料)」,四份備份檔逐一解析 Parts/Suppliers/SupplierParts 皆 0 筆。**「筆數 > 0」為規格對既成事實的錯誤假設,任何實作都不可能滿足**,需 PM 修正 AC-B5 判定標準(如:改為「與備份檔來源筆數一致」),或另訂種子資料策略 | `curl :5300/api/v1/parts` → `[]`;`psql -d MmsDB` 四表 count 全 0;備份檔 COPY 區段逐檔計數全 0 | **PM**(規格矛盾,隨 route=RD 一併轉知) |

### 已核符事項

| AC | 判定 | 證據 |
|---|---|---|
| AC-A3-1 | PASS | `git show 284baa7` 刪除片段(SchedulePanel 之 addOrder/editOrder/deleteOrder/reorder 按鈕列、Dashboard 之 ProductFormModal 掛載)於現行 HEAD 之 `SchedulePanel.jsx` / `Dashboard.jsx` **零命中**(productionStore/MainLayout 之同名 action 屬別處既有功能,非被移除片段);vitest 全綠、build 通過 |
| AC-A3-2 | PASS | 補測試 commit `c5d58ea` 存在,`src/tests/components/BoxDiagram.test.jsx` 涵蓋 RSC/HSC 4 面與 S5 有值 5 面,隨 33/33 全綠;`BoxDiagram.jsx:59` 註解與邏輯「僅箱型啟用 S5 且訂單第 5 段有值才畫第 5 面」相符 |
| AC-A6 | PASS(含 E5 個案) | allowlist 過濾後 `smartparts|sm-frontend` 僅剩 `tests/report-*.md`(allowlist 內);中文「零件管理」僅 `README.md:9,101`(「已移入 MM」之移除紀錄敘述句,E5 允許)與 Remove migration 檔(allowlist 內);本回 RD 修復 `633c0ba`(compose 註解)、`3008939`(DocsPortal 索引)已生效 |
| AC-B3-2(後半) | PASS | `dotnet ef migrations has-pending-model-changes` → **No changes have been made to the model since the last migration**;對 MmsDB 全程僅 SELECT |
| AC-B6(後半) | PASS | `MM/frontend/src/App.jsx:234-246` tabs 陣列恰 9 頁籤(8 + 管理員 settings),📦 partsCatalog / 🏢 suppliers / 🔩 parts(備品庫存)三頁籤名稱相符 |
| AC-C1 | PASS | 主系統 `b683831..HEAD` 11 commits(`a17f71f`…`3008939`)、ahead 14 皆未推;MM `e3cebd8..HEAD` 11 commits(`aeb06e9`…`4009193`)、ahead 13 皆未推;`@{u}..HEAD` 計數與 ahead 一致 |
| AC-C2(抽核) | PASS | 主系統 README:9 已載明零件管理/保養移入 MM、mms hostname 待手動、本機 5301;compose 無 sm-frontend;與程式狀態無矛盾 |

### 未複驗項(因 F-1 阻斷,無 RD 證據可對照)

- **AC-A5**(主系統 migration 鏈臨時庫 apply/Down/re-apply)、**AC-B3-1**(MM 三段鏈五步驟):RD 無報告佐證曾執行;F-3 殘留臨時庫顯示 B3-1 疑似跑過但未收尾。待 RD 補齊報告後由 Tester 重跑複驗。

**T3 judgment — 未達(T2 已 FAIL,依序停止)**;僅預留一項供 PM 參考:AC-B5「筆數 > 0」與 P2 既成事實(來源 0 筆)矛盾,詳 F-4。

## 結論

**FAIL(T2)→ route=RD**。RD 下一輪必辦:
1. 補產出 `docs/report20260707-4.md`(§4.1 五章節),含 A5/B3-1 的實際執行輸出;
2. 重建/重啟 `mm-mms-backend-1` 使 MigrateAsync 套用 `20260707012448_RemoveShadowForeignKeys`,複查 MmsDB history 恰 3 筆且 shadow 欄位 = 0;
3. `DROP DATABASE "mm_regress_20260707_t"` 清除殘留臨時庫並記錄;
4. 於報告中將 F-4(AC-B5 筆數>0 不可能成立,來源自始 0 筆)明列為規格議題轉 PM 修訂判定標準。
