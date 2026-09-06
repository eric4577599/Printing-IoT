# 驗收報告 v2 — C′ 遷移收尾 回3:整體回歸驗證(第二輪複驗)

> 日期:2026-07-07(`date` 取得)
> 驗收者:Tester subagent(獨立驗收,所有指令親自重跑,不採信 RD 說法)
> 規格:`docs/spec-v1.md`(回3 整體回歸驗證計畫)
> RD 交付:`docs/report20260707-4.md`(本輪已補齊,前輪 F-1 缺件已解除)
> 受驗 repo:主系統 `feat/extract-maintenance`(HEAD `3008939`,基準 `b683831` 起 11 commits)、MM `main`(HEAD `4009193`,基準 `e3cebd8` 起 11 commits)
> 前情:v1 驗收 FAIL(T2)→ route=RD,四項待辦(F-1 報告缺件、F-2 生產庫 history 缺第三段、F-3 殘留臨時庫、F-4 AC-B5 規格矛盾)
> 結果:**FAIL(T3 judgment)→ route=PM**(T1/T2 全過;唯 AC-B5「筆數 > 0」為規格對既成事實的錯誤假設,任何實作皆不可滿足,需 PM 修訂判定標準)
>
> 註:本檔覆寫回2(P4 瘦身回合)之驗收報告,原內容見 git 歷史。

---

## 沙箱註記(規格 §0 準繩 5 / E1)

dotnet build/test(寫 obj)、docker(socket)、curl(網路)、EF 連庫於沙箱下必然失敗,前兩輪已實證誤報;本輪該類指令一律停沙箱執行後判定。靜態檢查(git/grep/原始碼)於沙箱內執行。

---

## T1 deterministic(全數親自執行)— PASS

| # | AC | 指令 | 結果 | 證據 |
|---|---|---|---|---|
| T1-1 | AC-A1 | `dotnet build PrintingIoT.sln` + `dotnet test` | ✅ | 建置成功 0 警告 0 錯誤;測試 **11 通過 / 0 失敗 / 0 略過** |
| T1-2 | AC-A2 | `npm run build` + `npx vitest run`(主系統 frontend/) | ✅ | build exit 0、`dist/` 產出;vitest **5 檔 33/33 全過**(含 BoxDiagram 回歸測試 4 條) |
| T1-3 | AC-A4 | `docker compose config` + `--services` | ✅ | config exit 0;services 恰 7 項:backend-api / backend-worker / cloudflared / frontend / mqtt-broker / postgres / redis;`grep -c sm-frontend docker-compose.yml` = 0 |
| T1-4 | AC-A5 | 臨時庫 `printing_regress_v2_1783407663`(printingiot-postgres :5433)三步 `dotnet ef database update --connection` | ✅ | S1 全套 apply exit 0,history 尾筆 `20260706143822_RemoveSmartPartsModule`;S2 Down 至 `20260606021031_RemoveMaintenanceModule` exit 0,尾筆為之;S3 再 apply exit 0,尾筆回 `RemoveSmartPartsModule`;驗畢 DROP,`psql -lt` grep regress 零命中(**本輪 Tester 親自重跑,前輪未複驗項已補**) |
| T1-5 | AC-B1 | `dotnet build MaintenanceSystem.sln` + `dotnet test` | ✅ | 建置成功 0 錯誤;測試 **67 通過 / 0 失敗**(≥67) |
| T1-6 | AC-B2 | `npx vitest run`(MM frontend/) | ✅ | **5 檔 89/89 全過**(≥89、0 failed) |
| T1-7 | AC-B3-1 | 臨時庫 `mm_regress_v2_1783407700`(mm-postgres :5434)五步鏈 | ✅ | S1 全套 apply(0→3)、S2 Down 第 3 段、S3 Down 第 2 段、S4 Down 至 0、S5 重放,五步皆 exit 0;S4 後 public 僅剩空 `__EFMigrationsHistory`(COUNT=0);S5 後 history 恰 3 筆(InitialCreate / AddPartsManagement / RemoveShadowForeignKeys);驗畢 DROP、殘留零命中(**本輪 Tester 親自重跑,前輪未複驗項已補**) |
| T1-8 | AC-B4 | `bash scripts/migrate-parts-data.sh --verify` | ✅ | exit 0;來源三表已移除後改以最新備份檔(`flexodb-backup-20260706115229.sql`)還原臨時庫 `_migverify_*` 對照;Suppliers/Parts/SupplierParts 三表 0↔0 通過、抽樣通過、來源 FlexoDB 前後 md5 一致、臨時庫自動 DROP |
| T1-9 | AC-B5(HTTP 層) | curl `http://localhost:5300` 四端點 | ✅* | `/api/parts`、`/api/v1/parts`、`/api/v1/suppliers`、`/api/v1/supplier-parts` 皆 **HTTP 200、回有效 JSON 陣列**;唯 `/api/v1/parts` 回 `[]`(筆數 = 0),與規格「筆數 > 0」不符 → 歸 T3 處理(見下) |
| T1-10 | AC-B6(可達性) | `curl -w "%{http_code}" http://localhost:5301/` + `npm run build` | ✅ | 5301 回 **200**(compose 對映 80→5301 核實);MM 前端 build exit 0 |
| T1-11 | AC-B3-2 | `docker exec mm-postgres-1 psql ... __EFMigrationsHistory`(唯讀)+ `dotnet ef migrations has-pending-model-changes` | ✅ | 生產 MmsDB history **恰 3 筆、順序正確**(前輪 F-2 已由 RD 重建 mms-backend 修復,`docker ps` 顯示該容器重啟於本輪複驗前);`has-pending-model-changes` → 「No changes have been made to the model since the last migration.」;全程僅 SELECT |

**前輪 F-3 複驗**:`docker exec mm-postgres-1 psql -U postgres -lt | grep -i regress` 零命中,殘留臨時庫 `mm_regress_20260707_t` 已 DROP ✅;本輪 Tester 自建之兩個臨時庫亦皆驗畢即 DROP 並複核(E9 遵循)。

**T1:PASS**(所有 build/test/腳本/端點可達性全綠)

---

## T2 semantic(對照規格逐條核閱)— PASS

| AC | 判定 | 證據 |
|---|---|---|
| AC-A3-1 | ✅ | `git show 284baa7` 被刪片段 = SchedulePanel 之 `handleAddOrder/handleEditOrder/handleDeleteOrder/handleReorder` props 與 `dashboard.schedule.addOrder/editOrder/deleteOrder/reorder` 按鈕列、Dashboard 之 ProductFormModal 掛載與 handlers;於現行 HEAD 之 `SchedulePanel.jsx`、`Dashboard.jsx` 精確 grep **零命中(exit 1)**;現存 `dashboard.schedule.seqNo/customer/...` 為表頭欄位,非被刪片段;vitest 33/33 + build 佐證正常渲染 |
| AC-A3-2 | ✅ | `frontend/src/components/common/BoxDiagram.jsx:59-63`:`segCount = Number(l3) > 0 ? 5 : 4`(l3 = dimL5/S5),尺寸欄與分隔線共用 `colW = 500 / segCount` 均分邏輯 — 與規格「RSC/HSC 4 面+舌片、S5 有值才 5 面、尺寸欄對齊」一致;`src/tests/components/BoxDiagram.test.jsx`(commit `c5d58ea`)四條測試涵蓋 RSC 4 面、HSC 4 面(無上蓋 H1)、S5 有值 5 面、對齊公式,隨 T1-2 全綠 |
| AC-A6 | ✅ | 依規格排除條件重掃:英文 `smartparts\|sm-frontend` allowlist(tests/report-\*.md、RemoveSmartPartsModule migration 檔)外 **0 命中**;中文「零件管理」allowlist 外僅 `README.md:9,101`,皆為「已移入 MM 外掛」之移除紀錄敘述句,符合 E5 個案(理由:描述已移除事實,非程式/設定/路由殘留) |
| AC-B6(九頁籤) | ✅ | `MM/frontend/src/App.jsx:234-246` tabs 陣列恰 9 頁籤(equipment/taskList/parts/partsCatalog/suppliers/schedule/history/photos + 管理員 settings);i18n:`parts=備品庫存(🔩)`、`partsCatalog=零件主檔(📦)`、`suppliers=供應商(🏢)`,i18n.test.js 有斷言且全綠 |
| AC-B5(兩元件並立) | ✅ | `/api/parts`(PartsController→SpareParts 表)與 `/api/v1/parts`(PartsCatalogController→Parts 表)走不同 Controller 與資料表,MM CLAUDE.md:11-16 明定邊界;67 後端測試含兩元件,互不影響 |
| AC-C1 | ✅ | 主系統 `b683831..HEAD` 11 commits(`a17f71f`…`3008939`)、`git status -sb` ahead 14、`@{u}..HEAD` = 14,**全數未 push**;工作區僅 workflow 管理檔(`docs/spec-v1.md`、`tests/report-v1.md` 修改)與報告/歸檔新檔(`docs/report20260707-4.md`、`spec20260707-2/-3.md`),已列明;MM `e3cebd8..HEAD` 11 commits(`aeb06e9`…`4009193`)、ahead 13 = `@{u}..HEAD`,工作區乾淨,**全數未 push**;與 RD 報告 §4 清單逐筆一致 |
| AC-C2 | ✅ | 四點核對:(1) 主系統 README:9、`doc/PROJECT_STATUS.md:15-16` 皆載明保養/零件管理**已移出**至 MM;(2) MM README 兩元件並立表(備品零件 `/api/parts` + 零件管理 `/api/v1/*`)、CLAUDE.md:11-16 API 邊界;(3) MM README/CLAUDE.md 九頁籤 + 5301 入口;(4) compose 無 sm-frontend(PROJECT_STATUS:14 亦載明退役)— 無矛盾;操作說明書 v3.0 之「零件管理併入 MM/搬家」為紀錄性敘述,一致 |
| AC-R | ✅ | `docs/report20260707-4.md` 存在(前輪 F-1 解除),含 §4.1 五章節:執行摘要(含環境版本與總判定)、逐項結果表(AC-A1~C2)、修復清單(F-2/F-3/F-4)、兩 repo commit 清單(註明未 push)、遺留事項(含 Cloudflare Tunnel 待 Eric 手動);RD 報告所載各項數據(11/33/67/89、7 services、history 3 筆、0↔0)與本輪 Tester 親自重跑結果**逐項吻合,無虛報** |
| 前輪 F-2 | ✅ 已修復 | 生產 MmsDB history 恰 3 筆(本輪唯讀複查);修法(重建 mms-backend 令 MigrateAsync 套用)未動生產資料,符合紅線 3 |
| 前輪 F-3 | ✅ 已修復 | `mm_regress_20260707_t` 已 DROP,psql -lt 零命中 |

**T2:PASS**(實作與 RD 報告皆與規格描述行為一致;無 RD 誤解規格情事)

---

## T3 judgment(驗收契約合理性)— **FAIL → route=PM**

### F-4(承前輪):AC-B5「/api/v1/parts 筆數 > 0」為不可滿足的驗收標準

- **事實鏈**(本輪親自複核):
  1. `curl :5300/api/v1/parts` → HTTP 200、`[]`(筆數 0);
  2. B4 `--verify` 輸出:來源(備份檔還原)↔ 目的三表 **0↔0**、來源三表 md5 = `d41d8cd98f00b204e9800998ecf8427e`(**空內容之 md5**,證明來源自始 0 筆);
  3. MM `docs/report20260706-1.md`(P2 搬移報告)明載生產 FlexoDB 三表搬移當時即 0 筆。
- **判定**:搬移腳本、migration、端點實作全部正確(0 筆資料被完整、冪等地搬移並可查詢);「筆數 > 0」失敗的唯一原因是**規格假設來源有資料,與既成事實矛盾**。此非 RD 實作缺陷 — 任何實作都不可能讓不存在的資料出現。規格 §5 邊界情境表(E1–E9)未涵蓋「來源資料為 0 筆」此 edge case,屬驗收契約本身的缺口。
- **對 PM 的具體修正建議**(擇一,下一輪規格明文化):
  - **甲案(建議)**:AC-B5 改為「`/api/v1/parts` 回傳筆數與備份檔來源筆數**一致**(0↔0 亦為 PASS),以 B4 `--verify` 逐表對照輸出為證據」;
  - 乙案:若 Eric 要求上線即有展示資料,另訂**種子資料策略**(seed 腳本 + 對應清除機制)並補 AC 定義筆數來源 — 此屬新需求,不應由回歸驗證回合夾帶。
- 另請 PM 順手處理:RD 報告 §5 遺留事項 2 已將本議題列案,PM 修訂 AC-B5 後本項可逕依新標準複驗,毋須 RD 改 code。

### 其餘 judgment 檢視(無礙,僅列紀錄)

| # | 項目 | 判定 |
|---|---|---|
| J-1 | E5 個案(README:9,101 中文「零件管理」保留) | 合理 — 皆為「已移出」紀錄性敘述,符合 E5 允許類別,RD 報告已載明理由 |
| J-2 | AC-B6 settings 頁籤為管理員條件式(`can(user,'manageSettings')`) | 合理 — 權限未啟用時 `can()` 全放行照常顯示 9 頁籤,與規格 M2-b 配置一致 |
| J-3 | F-2 修法(重建容器令 MigrateAsync 套用)是否違反紅線 3「不動生產庫」 | 合理 — 紅線 3 禁止「驗證程序」寫入生產庫;MigrateAsync 為**既定部署機制**,套用已 commit 之 migration 屬正常部署行為,且 RD 已把「migration 進 repo 須重建映像」寫入遺留事項 3 作為 SOP 提醒 |
| J-4 | Cloudflare Tunnel 三步驟未完成 | 不擋 — 規格 §4.1 第 5 章即定位為「待 Eric 手動執行」之遺留事項,RD 報告已引用指引 |

---

## 結論

**FAIL(failedLayer=T3)→ route=PM。**

- T1/T2 全過:兩 repo build/test 全綠(11/33/67/89)、A5 與 B3-1 migration 鏈本輪已由 Tester 親自重跑補齊複驗、前輪 F-1/F-2/F-3 全部解除、RD 報告與實況逐項吻合。**程式碼層面本回歸零問題,RD 無待辦。**
- 唯一未結案項為規格議題 F-4:AC-B5「筆數 > 0」與「來源三表自始 0 筆」的既成事實矛盾,PM 下一輪請依 T3 節建議修訂 AC-B5 判定標準(建議甲案:改為「與備份檔來源筆數一致」),或明文訂定種子資料策略;修訂後本項可直接依新標準結案,無須 RD 動工。
