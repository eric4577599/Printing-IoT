# 驗收報告 — C′ 遷移 回3(P4 主系統瘦身)

> 日期:2026-07-06
> 驗收者:Tester subagent(獨立驗收,所有指令親自執行,不採信 RD 說法)
> 規格:`docs/spec-v1.md`(回3,覆寫回2;回1/回2 均已 PASS,歷史報告見 MM repo)
> 受驗 repo:`/Volumes/G70Pro/cusor pool/Printing IoT`(branch `feat/extract-maintenance`,commits `a17f71f`/`8069abe`/`279f813`,ahead 6 未 push)
> 附帶 repo:`/Volumes/G70Pro/cusor pool/MM`(commit `d6289c2`,ahead 7 未 push)
> 結果:**FAIL(T2)** — 程式面全過,但 RD 實作報告缺失致 AC-1/AC-4/AC-7/AC-8 之「報告佐證」要求全數落空,且 AC-8 前置不成立(mms.ericchh.work NXDOMAIN)未依規格回報。route=RD。

---

## T1 — Deterministic(自動化測試與建置,全部親自執行)

> 註:dotnet/docker/npm/curl 需網路與 docker socket,沙箱會擋(NuGet restore 於沙箱內 5 分鐘逾時「建置失敗 0 錯誤」),依 AC-10「測試若因沙箱失敗,停沙箱重跑」全程停沙箱執行。

| # | 檢查項目 | 指令 | 結果 | 證據 |
|---|---|---|---|---|
| T1-1 | 主系統建置(AC-2) | `dotnet build PrintingIoT.sln` | ✅ | 「建置成功。0 個警告 0 個錯誤」(5 專案,3.28s) |
| T1-2 | 主系統測試(AC-3) | `dotnet test PrintingIoT.sln` | ✅ | 「已通過! 失敗: 0,通過: 11,總計: 11」;`PartServiceTests.cs` 已不存在,`PrintingIoT.Tests/` 僅餘 Controllers/、Integration/、SpeedCalculatorTests.cs |
| T1-3 | compose 驗證(AC-5) | `docker compose config` | ✅ | exit 0;services = redis/postgres/backend-api/mqtt-broker/backend-worker/frontend/cloudflared,**無 sm-frontend** |
| T1-4 | 目錄刪除(AC-5) | `ls` | ✅ | `smart-parts-frontend/` 與 `backend/SmartParts.API/` 皆「No such file or directory」 |
| T1-5 | 回歸端點(AC-6) | `curl localhost` | ✅ | frontend 5600→200;backend-api 5200:`/api/orders`→200、`/api/monitor/realtime`→204;**`/api/v1/parts`→404**(路由已不存在) |
| T1-6 | migration 已套用(AC-4) | psql `__EFMigrationsHistory` | ✅ | 最新 = `20260706143822_RemoveSmartPartsModule`;`\dt` 三表消失,其餘 7 表(含 Auth 三表)無恙 |
| T1-7 | migration Down 實測(AC-4) | `dotnet ef database update 20260606021031_RemoveMaintenanceModule` | ✅ | Done;`\dt` 三表重建 |
| T1-8 | migration 再 Up(AC-4) | `dotnet ef database update` | ✅ | Done;三表再消失,`Orders` 可查(其餘表無恙),回到最新 |
| T1-9 | MM 後端(AC-9) | `dotnet test`(MM/backend) | ✅ | 「已通過! 失敗: 0,通過: 65,總計: 65」(較回2 +3 案:三欄映射/空值補位/依 Id 查詢 404) |
| T1-10 | MM 前端(AC-9) | `npm test -- --run`、`npm run build` | ✅ | vitest 89/89(5 檔);vite build ✓ 625ms |
| T1-11 | 備份檔(AC-1) | grep 備份 | ✅ | `MM/backups/flexodb-backup-20260706115229.sql` 13,484 bytes 非空,含三表 `CREATE TABLE` |

**T1 判定:PASS。**

---

## T2 — Semantic(邏輯符合規格)

### 通過項

| # | 檢查項目 | 結果 | 證據 |
|---|---|---|---|
| S-1 | §1.1 八項全數移除(AC-2) | ✅ | commit `a17f71f` diff:Entities/Parts 三檔、DTOs/Parts、IPartService、PartService、PartsController、PartServiceTests 刪除;`PrintingContext.cs` -30 行(using/三 DbSet/OnModelCreating Parts 區塊);`Program.cs` -1 行(DI 註冊) |
| S-2 | migration Up 先子後父(§2.3) | ✅ | `20260706143822_RemoveSmartPartsModule.cs:21-28`:DropTable 順序 SupplierParts→Parts→Suppliers |
| S-3 | migration Down 結構逐項一致(AC-4) | ✅ | 以 **drop 前真實 schema**(備份 `flexodb-backup-20260706115229.sql:75-192, 349-489`)為基準逐項比對 Down 實測後 `\d` 輸出:三表全部欄位/型別/nullable、Guid PK×3、`IX_Parts_InternalPN` UNIQUE、`IX_SupplierParts_PartId`/`_SupplierId`、兩組 FK `ON DELETE RESTRICT`、`Price numeric(18,2)` — **全部一致** |
| S-4 | Down 僅還原結構之註記(§2.3 edge case) | ✅ | migration 檔 :35-36 註解明寫「不還原資料 — 須另自 MM/backups/ 匯入」;註解正體中文、含輸入/輸出/邏輯 |
| S-5 | 其餘 DbSet 未動(§2.2) | ✅ | `PrintingContext.cs` 現存 DbSet 僅 ProductionLogs/Orders/MachineSections/Products/Users/Roles/UserRoles;既有測試未改斷言語意(diff 無測試檔異動,僅刪 PartServiceTests) |
| S-6 | compose DEPRECATED 區塊更新(§2.4) | ✅ | `docker-compose.yml:103-108`:補記零件管理隨 C′ 遷入 MM(mms.ericchh.work)、port 5100 釋出、舊網址公告 |
| S-7 | 全域 grep 白名單外零命中(AC-7) | ✅ | 親自 grep:`backend/**/*.cs`(排除 Migrations/、obj/)僅餘框架 API(PartitionedRateLimiter)與 `topic.Split` 一般英文;`.sln`、`frontend/src/**`、`scripts/` 零命中;README/註解殘留已由 `279f813` 清除 |
| S-8 | MM 附帶項範圍(AC-9) | ✅ | `d6289c2` 僅動 5 檔(PartsCatalogController/PartDtos/IPartService/PartService/PartServiceTests),`PartDto` 補 `Category`/`Unit`(`PartDtos.cs:31-38`),新增 `GET /api/v1/parts/{id}`;備品(`/api/parts`、SpareParts)與保養功能零異動(git diff 佐證) |
| S-9 | commit 規範(AC-10) | ✅ | 三個 commit 均 Conventional(refactor/chore/chore)+ MM 獨立 commit(fix);兩 repo 均 ahead 未 push |
| S-10 | AC-1 實質資料安全(獨立重建證據) | ✅* | 備份 COPY 區塊三表皆空(`:254-296` 均 `\.`)→ drop 前 FlexoDB 三表 0 筆;MmsDB 實測 `0/0/0` → 逐表相等(0=0)。*但此對照表**未見於任何 RD 報告**,見缺失 F-1 |

### 缺失項(FAIL 依據)

| # | 缺失 | 證據 | 影響 |
|---|---|---|---|
| **F-1** | **RD 實作報告完全缺失** | `docs/` 僅有 `spec-v1.md`(ls 佐證);全 repo `find -name "*20260706*"` 僅命中兩個 migration 檔;commit `279f813` 訊息稱「詳 RD 報告」但該報告不存在 | DoD §5 明定須產出 RD 報告於本 repo `docs/`,且 **AC-1**(筆數對照表存在於報告)、**AC-4**(三步驟指令與輸出留存報告)、**AC-7**(grep 結果表列入報告)、**AC-8**(手動操作指引寫入報告)四條 AC 的報告佐證要求全數無處落地 — 逐條可測的驗收標準直接不成立 |
| **F-2** | **AC-8 前置不成立且未回報** | `nslookup mms.ericchh.work 1.1.1.1` → **NXDOMAIN**(mms hostname 根本不在 Cloudflare DNS/tunnel);`curl -sI https://smartparts.ericchh.work` → **403**(仍在 Cloudflare 服務中,未 301、未移除);本機 MM 前端 5301→200(服務本身正常) | 規格 §2.6 edge case:「mms.ericchh.work 不在 tunnel 設定 → 中止此工作項並回報(前置不成立)」— RD 既未回報此事實,無權限情境下應交付的「逐步手動操作指引 + 標註待 Eric 手動執行」也因 F-1 一併缺失。且指引內容必須先涵蓋「建立 mms.ericchh.work public hostname」才輪得到 smartparts 轉導 |

**T2 判定:FAIL(F-1、F-2),route=RD** — 程式碼、migration、grep、MM 附帶項經獨立驗證均正確,缺的是規格明文要求的交付物(報告與回報),屬 RD 交付不完整,非規格歧義。

---

## T3 — Judgment(本輪因 T2 FAIL 依程序停止;以下為順帶觀察,供 PM 參考,不影響本輪判定)

1. **規格 §1.1/§2.3/AC-4 之「兩組 Cascade FK」為盤點筆誤**:drop 前真實 schema(備份 :481、:489)與移除前 model snapshot(`git show a17f71f^:...ModelSnapshot.cs:462,468`)均為 **Restrict**。RD 依「與移除前逐項一致」主準繩保留 Restrict 並於 commit 訊息載明,處理正確;建議 PM 下版將 AC-4 文字更正為 Restrict,避免逐字驗收時自相矛盾。
2. `docker-compose.yml:60` 服務定義區內註解「Phase 3.9: SmartPartsDB and MmsDB removed…」含 SmartParts 字樣,屬歷史敘述但不在「檔尾 DEPRECATED 區塊」白名單位置;建議下輪順手移至檔尾區塊或加入白名單明列。

---

## 結論與下一輪修正指引(給 RD)

**FAIL(T2,route=RD)。** 程式面免重工(build/test/migration 可逆性/grep/MM 附帶項本輪已全數獨立驗證通過),只需補齊交付物:

1. 產出 RD 實作報告至本 repo `docs/`(命名依 `report{YYYYMMDD}-{序號}.md`),內含:
   - **筆數對照表**(AC-1):可引用備份檔 COPY 區塊為 drop 前佐證(三表 0 筆)+ MmsDB 實測 0/0/0;
   - **migration 三步驟驗證紀錄**(AC-4):update 至前一 migration → `\d` 比對 → update 回最新,附指令與輸出(本報告 T1-6~T1-8 可為格式參考,RD 應自行重跑留痕);
   - **grep 結果表**(AC-7):命中清單 + 移除/白名單逐項判定;
   - **tunnel 處置說明**(AC-8):明載「無 Cloudflare 儀表板權限」+ 完整手動操作指引,**第一步必須是建立 `mms.ericchh.work` public hostname(現況 NXDOMAIN,前置不成立)**,再處理 smartparts 移除 + 301 Redirect Rule,標註「待 Eric 手動執行」,附 curl 驗證指令。
2. 報告 commit 依 §2.8 切點 3(`docs:`),不得 push。
