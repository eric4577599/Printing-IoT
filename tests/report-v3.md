# 驗收報告 v3 — C′ 遷移收尾 回3:整體回歸驗證(第三輪複驗,結案)

> 日期:2026-07-07(`date` 取得)
> 驗收者:Tester subagent(獨立驗收,關鍵指令親自重跑,不採信 RD 說法)
> 規格:`docs/spec-v3.md`(PM 已修訂 AC-B5:回傳筆數與備份檔來源筆數一致,0↔0 亦 PASS;新增邊界 E10)
> RD 交付:`docs/report20260707-4.md`(v3 更新版,commit `ae2a4d7`)
> 受驗 repo:主系統 `feat/extract-maintenance`(HEAD `ae2a4d7`)、MM `main`(HEAD `4009193`)
> 前情:v2 驗收 FAIL(T3)→ route=PM,唯一未結案項 F-4(AC-B5「筆數 > 0」與來源 0 筆的既成事實矛盾)
> 結果:**PASS**(T1/T2/T3 全過,F-4 依 v3 新標準結案,17 項 AC 全數通過)

---

## 沙箱註記(規格 §0 準繩 5 / E1)

docker socket、localhost curl、dotnet/npm build(NuGet 快取與 MM repo 位於本專案目錄外)於沙箱下失敗,前兩輪已實證;本輪該類指令停沙箱執行後判定(本輪曾因沙箱重跑:docker compose ps、四端點 curl、B4 --verify、四套 build/test)。git/grep/原始碼靜態檢查於沙箱內執行。

---

## 前置核驗:v3「不改 code」約定

| 檢查 | 指令 | 結果 |
|---|---|---|
| 主系統自 v2 驗過的 HEAD(`3008939`)以來變更 | `git diff --name-only 3008939..HEAD` | 僅 `docs/report20260707-4.md` 一檔(commit `ae2a4d7`,`docs:` 前綴,104 行新增)— **零 code 變更** ✅ |
| MM 自 v2 驗過的 HEAD 以來變更 | `git log e3cebd8..HEAD` + `git status -sb` | HEAD 仍為 `4009193`、工作區乾淨 — **無任何變更** ✅ |

因 code 與前輪 Tester 親測通過的版本位元相同,前輪 T1/T2 證據依規格 §6 本可直接引用;本輪仍重跑四套 build/test 以求確定性(見 T1)。

---

## T1 deterministic(親自執行)— PASS

| # | AC | 指令 | 結果 | 證據 |
|---|---|---|---|---|
| T1-1 | AC-A1 | `dotnet build PrintingIoT.sln` + `dotnet test`(主系統 backend/) | ✅ | build 0 警告 0 錯誤;測試 **11 通過 / 0 失敗 / 0 略過** |
| T1-2 | AC-A2 | `npm run build` + `npx vitest run`(主系統 frontend/) | ✅ | build exit 0、`dist/` 產出;vitest **5 檔 33/33 全過** |
| T1-3 | AC-B1 | `dotnet build MaintenanceSystem.sln` + `dotnet test`(MM backend/) | ✅ | build 0 錯誤;測試 **67 通過 / 0 失敗**(≥67) |
| T1-4 | AC-B2 | `npx vitest run`(MM frontend/) | ✅ | **5 檔 89/89 全過**(≥89、0 failed) |
| T1-5 | B5 前置 | `docker compose ps`(MM) | ✅ | mms-backend(:5300)、mms-frontend(:5301)、postgres(:5434)皆 Up |
| T1-6 | AC-B5 ① | curl 四端點(host 埠 5300,程式驗證 JSON 有效性) | ✅ | `/api/parts`、`/api/v1/parts`、`/api/v1/suppliers`、`/api/v1/supplier-parts` 皆 **HTTP 200、有效 JSON 陣列**(python json.load 驗證);`/api/v1/*` 三端點筆數皆 **0** |
| T1-7 | AC-B5 ② / AC-B4 | `bash scripts/migrate-parts-data.sh --verify` | ✅ | exit 0;Suppliers/Parts/SupplierParts 三表來源(備份檔 `flexodb-backup-20260706115229.sql` 還原之臨時庫)↔ 目的 MmsDB 對照 **0↔0 全通過**;來源三表 md5 皆 `d41d8cd98f00b204e9800998ecf8427e`(與規格 §0.1/E10 記載一致)且前後不變;臨時庫 `_migverify_*` 自動 DROP |
| T1-8 | AC-B6(可達性) | `curl -w "%{http_code}" http://localhost:5301/` | ✅ | 回 **200**(compose 對映 80→5301) |
| T1-9 | E9 複核 | `docker exec mm-postgres-1 psql -U postgres -lt \| grep -iE "regress\|migverify"` | ✅ | 零命中(grep exit 1),無殘留臨時庫 |

其餘項目(AC-A3~A6、B3-1、B3-2)本輪 code 零變更(前置核驗已證),引用 `tests/report-v2.md` 本 Tester 前輪親測證據勾稽:A5 三步鏈、B3-1 五步鏈於臨時庫全過並 DROP、compose 7 services 無 sm-frontend、生產 MmsDB history 3 筆且無 pending model changes。

**T1:PASS**

---

## T2 semantic(對照 spec-v3 逐條核閱)— PASS

| 項目 | 判定 | 證據 |
|---|---|---|
| **AC-B5(v3)判定標準 ①**:四端點 200 + 有效 JSON(空集合屬有效) | ✅ | T1-6 親測,四端點皆 200、皆為合法 JSON 陣列 |
| **AC-B5(v3)判定標準 ②**:`/api/v1/*` 筆數與備份檔來源一致,以 B4 `--verify` 為證據 | ✅ | 端點回傳 0 筆(T1-6)↔ `--verify` 逐表 0↔0(T1-7)一致;0↔0 依 v3 明文為 PASS |
| **AC-B5(v3)判定標準 ③**:兩元件互不影響 | ✅ | 路由/資料表分離靜態核實:`MMS.API/Controllers/PartsController.cs:14`(`api/[controller]` → `/api/parts`,SpareParts)與 `PartsCatalogController.cs:16`(`api/v1/parts`,Parts 表)、`SuppliersController.cs:14`、`SupplierPartsController.cs:14` 各自獨立;零件管理三端點回空集合之同時 `/api/parts` 仍正常回 200 與其自身資料(目前亦為空集合,屬其自身 SpareParts 表實際內容,規格未要求該表 >0) |
| **v3 §0.1「不要求改 code」遵循** | ✅ | 前置核驗:兩 repo 自 v2 驗過版本起零 code 變更,僅一筆 `docs:` commit 更新報告,符合 spec-v3 §4.2「更新報告以 docs: 提交、不觸發重跑全套」 |
| **AC-R:報告五章節 + AC-B5 註明 v3 標準** | ✅ | `docs/report20260707-4.md`:§1 執行摘要(總判定 PASS with fixes、日期、dotnet 9.0.301 / node v22.16.0 / docker 29.4.1);§2 逐項結果表 AC-A1~C2,AC-B5 列明「依 spec-v3 標準判定(0↔0 一致為 PASS),本日重跑留證」;§3 修復清單(F-2/F-3 已修復、F-4 註明 PM 修訂後結案、程式碼零回歸);§4 兩 repo commit 清單註明皆未 push;§5 遺留事項(Cloudflare Tunnel 待 Eric 手動、來源 0 筆與種子資料另立需求、mms-backend 部署 SOP) |
| **AC-C1 同步補列本版新 commit**(spec §3 C 部分註記) | ✅ | 報告 §4.1 以「另加」段載明本報告以 `docs: 回3 最終回歸報告 — AC-B5 依 spec-v3 標準重新判定 PASS` 提交且未 push;本 Tester 核實該 commit 為 `ae2a4d7`、標題完全一致、僅動報告一檔;`git status -sb` ahead 15 = 報告所載 14 + 本筆 1,`@{u}..HEAD` 計 15,**全數未 push**;MM ahead 13 = `@{u}..HEAD`,全數未 push;工作區差異僅 workflow 管理檔(`docs/spec-v1.md`、`spec-v3.md`、`spec20260707-2/-3.md`、`tests/report-v*.md`),報告 §4.1/§5.4 已列明 |
| **RD 報告數據與實測吻合** | ✅ | 11/33/67/89、四端點 200、0↔0、md5、5301=200、殘留臨時庫零命中 — 逐項與本輪親測一致,無虛報 |

**T2:PASS**(RD 依 v3 僅重新判定 AC-B5 並更新報告,判定引據與實況相符,無誤解規格情事)

---

## T3 judgment(驗收契約合理性)— PASS

| # | 檢視點 | 判定 |
|---|---|---|
| J-1 | v3 修訂後的 AC-B5(筆數與來源一致、0↔0 為 PASS、以 `--verify` 為證據)是否合理 | 合理 — 正確區分「搬移正確性」(可驗證:0 筆被完整冪等搬移)與「資料存在性」(既成事實,非實作可控);採前輪 Tester 甲案建議,證據鏈(curl + `--verify` + md5)閉合可重現 |
| J-2 | E10 新增後,邊界表是否仍有未涵蓋的 edge case | 無礙 — 「來源 0 筆」缺口已由 E10 補齊;E10 同時明文禁止湊資料 INSERT,防堵為過驗收而造假的旁門;種子資料明確劃出本回歸範圍(§0.1),範圍紀律正確 |
| J-3 | `/api/parts`(備品零件)目前亦回空陣列,是否影響「兩元件互不影響」判定 | 不影響 — 規格判定基準為「任一端點的資料多寡不影響另一端點**正常回應**」,兩端點均正常回 200 與自身資料表內容;規格自始未對 SpareParts 筆數設限。如日後需展示資料,已由遺留事項 2 導向種子資料新需求 |
| J-4 | 報告新 commit 無法自列 hash(先寫後 commit 的先天限制) | 合理 — 報告以完整 commit 標題預告,Tester 事後核實 `ae2a4d7` 存在且僅動報告一檔,ahead 數對帳一致(14+1=15) |
| J-5 | v2 之 J-1~J-4(E5 個案、settings 條件頁籤、F-2 修法、Tunnel 遺留)本輪是否有新事證推翻 | 無 — code 零變更,前輪判定維持 |

**T3:PASS**(驗收契約經 v3 修訂後自洽,無遺漏 edge case)

---

## 結論

**PASS(failedLayer=NONE, route=NONE)— 回3 整體回歸驗證結案。**

- v3 約定的「零 code 變更」經 git 逐檔核實成立;四套 build/test 本輪仍親自重跑,11/33/67/89 全綠。
- AC-B5 依新標準親測通過:四端點 200 + 有效 JSON,`/api/v1/*` 0 筆與備份檔來源 0↔0 一致(`--verify` exit 0、md5 `d41d8cd98f00b204e9800998ecf8427e` 前後不變),兩元件路由/資料表分離、互不影響。
- AC-R 通過:`docs/report20260707-4.md` 五章節齊備、AC-B5 註明依 v3 標準、commit 清單含本版新增之 `ae2a4d7` 且兩 repo 全數未 push(硬性紅線 1 遵守)。
- 遺留事項(不擋結案,已列報告 §5):Cloudflare Tunnel 三步驟待 Eric 手動執行;如需零件展示資料,另立「種子資料策略」新需求。
