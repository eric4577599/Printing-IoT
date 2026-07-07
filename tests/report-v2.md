# 驗收報告 v2 — C′ 遷移 回3(P4 主系統瘦身)

> 日期:2026-07-07
> 驗收者:Tester subagent(獨立驗收,所有指令親自重跑,不採信 RD 說法)
> 規格:`docs/spec-v1.md`
> 受驗 repo:`/Volumes/G70Pro/cusor pool/Printing IoT`(branch `feat/extract-maintenance`,ahead 7 未 push;本輪新增 commit `add7fde`)
> 附帶 repo:`/Volumes/G70Pro/cusor pool/MM`(main,ahead 7 未 push,commit `d6289c2`)
> 前情:v1 驗收 FAIL(T2)— F-1 RD 報告缺失、F-2 AC-8 前置不成立未回報。本輪驗證 RD 補交付物(`docs/report20260707-1.md`)後全案。
> 結果:**PASS**(T1/T2/T3 全過;T3 附三則觀察,均不影響判定)

---

## T1 — Deterministic(自動化測試與建置,全部親自執行)

> 沙箱說明:dotnet/docker/curl/dig 需 docker socket 與網路,依 AC-10「測試若因沙箱失敗,停沙箱重跑後再判定」停沙箱執行(前輪已實證沙箱擋 NuGet restore)。

| # | 檢查項目 | 指令 | 結果 | 證據 |
|---|---|---|---|---|
| T1-1 | 主系統建置(AC-2) | `dotnet build PrintingIoT.sln` | ✅ | 「建置成功。0 個警告 0 個錯誤」(3.63s) |
| T1-2 | 主系統測試(AC-3) | `dotnet test PrintingIoT.sln` | ✅ | 「已通過! 失敗: 0,通過: 11,總計: 11」;`PartServiceTests.cs` 不存在,`PrintingIoT.Tests/` 僅餘 AuthControllerTests / OpenApiContractTests / QA_Scenarios_Tests / SpeedCalculatorTests |
| T1-3 | compose 驗證(AC-5) | `docker compose config --services` | ✅ | postgres/redis/backend-api/frontend/cloudflared/mqtt-broker/backend-worker,**無 sm-frontend** |
| T1-4 | 目錄刪除(AC-5) | `ls` | ✅ | `smart-parts-frontend/`、`backend/SmartParts.API/` 皆「No such file or directory」 |
| T1-5 | 回歸端點(AC-6) | `curl localhost` | ✅ | frontend 5600→200;`/api/orders`→200、`/api/monitor/realtime`→204;**`/api/v1/parts`→404**;port 5100→connection refused(已釋出) |
| T1-6 | migration 現況(AC-4) | psql `__EFMigrationsHistory`、`\dt` | ✅ | 最新 = `20260706143822_RemoveSmartPartsModule`;FlexoDB 8 表,三表(Parts/Suppliers/SupplierParts)消失,其餘無恙 |
| T1-7 | migration Down 親測(AC-4) | `dotnet ef database update 20260606021031_RemoveMaintenanceModule` | ✅ | Done;`\dt` 11 表(三表重建);`\d` 逐項比對:Parts 九欄含 `IX_Parts_InternalPN` UNIQUE、SupplierParts `Price numeric(18,2)`、兩組 FK `ON DELETE RESTRICT`(與 drop 前備份 schema 一致) |
| T1-8 | migration 再 Up 親測(AC-4) | `dotnet ef database update` | ✅ | Done;三表消失(pg_tables count=0)、history 回最新、`Orders` 可查 — Down→Up 可重複,結果一致 |
| T1-9 | 備份檔(AC-1) | ls + grep + sed | ✅ | `MM/backups/flexodb-backup-20260706115229.sql`(13,484 bytes,最新)含三表 `CREATE TABLE`(L75/L165/L182);COPY 區塊三表皆空(L254/L286/L294 後即 `\.`)→ drop 前三表 0 筆 |
| T1-10 | MmsDB 筆數(AC-1) | psql MmsDB | ✅ | `0|0|0` — 與 FlexoDB drop 前(0/0/0)逐表相等 |
| T1-11 | MM 後端(AC-9) | `dotnet test`(MM/backend) | ✅ | 「已通過! 失敗: 0,通過: 65,總計: 65」 |
| T1-12 | MM 前端(AC-9) | `npm test -- --run`、`npm run build` | ✅ | vitest 89/89;vite build ✓ 486ms |
| T1-13 | tunnel 現況(AC-8) | dig/curl | ✅* | `mms.ericchh.work` → **NXDOMAIN**;`smartparts.ericchh.work` → HTTP/2 **403**(仍在 Cloudflare)— 與 RD 報告 §6.1 陳述一致;*此為「前置不成立」事實查證,判定見 T2 |

**T1 判定:PASS。**

---

## T2 — Semantic(邏輯符合規格;重點驗前輪 F-1/F-2 是否解除)

| # | 檢查項目 | 結果 | 證據 |
|---|---|---|---|
| S-1 | **F-1 解除:RD 報告存在且落地四項佐證** | ✅ | `docs/report20260707-1.md`(commit `add7fde`,`docs:` 前綴,194 行):§1 筆數對照表(AC-1)、§3 migration 三步驟紀錄(AC-4)、§5 grep 結果表(AC-7)、§6 tunnel 處置說明(AC-8)— DoD §5 四項內容齊備 |
| S-2 | RD 報告內容與現實相符(反虛報查核) | ✅ | 報告 §1 筆數 0/0/0 ↔ 本輪 T1-9/T1-10 親測一致;§3 三步驟 ↔ T1-6~T1-8 親測重現;§4 compose/curl ↔ T1-3/T1-5 一致;§6.1 NXDOMAIN/403 ↔ T1-13 一致 — 無任何虛報 |
| S-3 | **F-2 解除:AC-8 前置不成立已依 §2.6 回報** | ✅ | 報告 §6.2 明載「mms.ericchh.work 不在 tunnel(NXDOMAIN)→ 前置不成立,中止此工作項並回報」;§6.3 手動指引**第一步即建立 mms public hostname**(v1 指正事項),再處理 smartparts 移除 + 301 Redirect Rule,標題明標「**待 Eric 手動執行**」,附 curl/dig 驗證指令;採首選方案並說明理由 — 符合 §2.6「無儀表板/API 權限時」交付要求 |
| S-4 | 「無 Cloudflare API 權限」宣稱查證 | ✅ | 親自 grep `.env`/compose/scripts:僅 `CLOUDFLARE_TUNNEL_TOKEN`(token 模式),無 `CF_API`/`CLOUDFLARE_API`/`api.cloudflare` 憑證 — 宣稱屬實,走無權限分支正當 |
| S-5 | AC-7 grep 白名單外零命中(親自重掃) | ✅ | `backend/**/*.cs`(排除 Migrations/obj/bin)對 `smartparts|IPartService|PartsController|SupplierPart` 零命中;`*.csproj`/`.sln` 零命中;`frontend/src/**` 僅 `reportUtils.js:152-155`、`BoxTypeTab.jsx:130-135` 字串切分之 `parts` 變數(英文一般字白名單);`scripts/` 零命中;報告 §5 結果表逐項判定與實況相符 |
| S-6 | migration 檔品質(§2.3) | ✅ | `20260706143822_RemoveSmartPartsModule.cs`:Up 先刪子表 SupplierParts 再父表(:21-28);註解正體中文、含輸入/輸出/邏輯(:14-18, :31-37);:35-36 明寫「Down 僅還原結構,不還原資料 — 須另自 MM/backups/ 匯入」 |
| S-7 | 其餘功能零異動(§0 準繩) | ✅ | `PrintingContext` 僅餘 ProductionLogs/Orders/MachineSections/Products/Auth 三表 DbSet;既有測試未改斷言語意;回歸端點全綠(T1-5) |
| S-8 | MM 附帶項範圍(AC-9) | ✅ | `d6289c2` 僅動 5 檔(PartsCatalogController/PartDtos/IPartService/PartService/PartServiceTests);`PartDto` 含 `Specification/Category/Unit`(`PartDtos.cs:34-36`);備品(`/api/parts`、SpareParts)與保養功能零異動;MM 工作樹乾淨 |
| S-9 | AC-10 程序面 | ✅ | 四個主系統 commit(`a17f71f` refactor / `8069abe` chore / `279f813` chore / `add7fde` docs)+ MM `d6289c2`(fix)皆 Conventional Commits、正體中文;兩 repo 各 ahead 7 **未 push**(Tester 亦未 push) |

**T2 判定:PASS** — 前輪 F-1/F-2 全數解除,報告內容經逐項反查與現實一致。

---

## T3 — Judgment(驗收契約合理性與 edge case)

| # | 檢查項目 | 結果 | 說明 |
|---|---|---|---|
| J-1 | AC-8 允許「無權限 → 手動指引」分支是否合理 | ✅ | 合理 — cloudflared token 模式下 hostname 路由確實不在 repo(§1.3 已盤點),AC-8 明文提供此分支;RD 交付完整可執行指引且無虛報。**殘留人工動作**:Eric 需依報告 §6.3 步驟 1–9 執行(建 mms hostname → 移除 smartparts → 301 Rule),執行前 mms.ericchh.work 對外不可達(僅本機可用) |
| J-2 | AC-9 edge「有值必須正確顯示」在 0 筆資料下的可測性 | ✅ | 兩庫零件資料現為 0 筆,無法以真實資料演練前端顯示;惟 MM 測試 65 案含三欄映射/空值補位/依 Id 查詢案例,映射正確性已由測試層覆蓋,規格 edge case(空字串顯示空白或「-」皆可)不被違反 — 契約可接受 |
| J-3 | 規格內部矛盾與白名單縫隙(觀察,不影響判定) | ⚠ 觀察 | 見下列三則,建議 PM 於 P5 或下版規格處理 |

**T3 觀察(供 PM 參考,均不構成本輪 FAIL)**:

1. **「兩組 Cascade FK」為規格盤點筆誤**(§1.1/§2.3/AC-4):drop 前真實 schema(備份佐證)與 EF 模型皆為 `ON DELETE RESTRICT`;規格自身主準繩「與移除前逐項一致」足以裁決,RD 忠實還原 Restrict 並於 migration 註解與報告 §3 載明,處理正確。建議下版規格文字更正為 Restrict。
2. **`docker-compose.yml:60` 註解**「Phase 3.9: SmartPartsDB and MmsDB removed…」位於服務定義區而非檔尾 DEPRECATED 區塊:本輪依 §2.7 白名單「類別=部署歷史註解(例為示例非窮舉)」判定保留,RD 報告 §5 亦已表列判定;建議 PM 下版明列或指示移至檔尾,消除「必須零命中範圍 vs 白名單類別」的縫隙。
3. **操作說明書 v3.0 公告與現況時序落差**:說明書已載明「smartparts 已停用並轉址到 MM」,但 301 尚待 Eric 手動執行(現況 403)— 屬 P5(文件定稿)與 J-1 人工動作的銜接事項,建議 PM 在 P5 驗收時一併確認 301 已生效。

**T3 判定:PASS。**

---

## 結論

**PASS(T1/T2/T3 全過)。** AC-1~AC-10 逐條成立:

| AC | 判定 | 主要證據 |
|---|---|---|
| AC-1 | ✅ | 報告 §1 對照表 + 本輪 T1-9/T1-10 親測(0/0/0 兩庫相等;備份非空含三表) |
| AC-2 | ✅ | T1-1(build 0 警告 0 錯誤)+ v1 已驗八項移除(commit a17f71f diff) |
| AC-3 | ✅ | T1-2(11/11;PartServiceTests 不存在) |
| AC-4 | ✅ | T1-6~T1-8 三步驟親測 + 報告 §3 留痕(FK 為 Restrict,見 T3 觀察 1) |
| AC-5 | ✅ | T1-3/T1-4 |
| AC-6 | ✅ | T1-5 |
| AC-7 | ✅ | S-5 親自重掃 + 報告 §5 結果表 |
| AC-8 | ✅ | 無權限分支:前置不成立已回報 + 完整手動指引明標「待 Eric 手動執行」(S-3/S-4;殘留人工動作見 T3 J-1) |
| AC-9 | ✅ | T1-11/T1-12 + S-8 |
| AC-10 | ✅ | S-9(Conventional Commits、無 push、停沙箱重跑) |

後續交辦(非驗收阻擋):Eric 依 `docs/report20260707-1.md` §6.3 手動完成 Cloudflare 儀表板三步驟並以 curl 驗證;PM 於下版規格處理 T3 三則觀察。
