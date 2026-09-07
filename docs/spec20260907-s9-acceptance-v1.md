# 規格 — S9 設計規劃書對抗性重整:驗收契約(第 2 輪)

> 日期:2026-09-07
> 撰寫:PM subagent
> 受驗交付物:**`docs/spec20260907-s9-v1.md`**(唯一)
> 受驗 repo:**只有主系統** `/Volumes/G70Pro/cusor pool/Printing IoT`
> 性質:**純文件交付輪**,不含程式碼異動 —— DoD 不適用「測試通過」,改用 §4 的可重跑判準

> **檔名沿革(重要,避免再度誤讀)**
> 本檔路徑 `docs/spec-v2.md` 原先放的是 2026-07-08「C′ 遷移收尾 回4」規格(commit `2318253`)。
> 該內容**已完整封存**於 `docs/spec-cmigration-v2-20260708.md`,git 歷史亦保留;
> `docs/report20260707-4.md:110-112`、`docs/report20260708-1.md` 對「`docs/spec-v2.md` §1 / §2」的引用,
> 一律改讀封存檔。自本版起,`docs/spec-v2.md` 的內容是**本輪(S9)的驗收契約**,與 C′ 遷移無關。

---

## 0. 本輪定位 — 先讀這段

上一輪 Tester 卡在 **T3(驗收契約本身失效)**,不是實作失敗。四點問題與本檔處置逐條對應:

| 上輪問題 | 本檔處置 |
|---|---|
| ① 契約指向已被取代的 `docs/spec-v1.md`(最後變動 `f5a8d77`,2026-07-07),其條文已由 `docs/spec-v3.md` 修訂 | §1 明確指定本輪受驗物為 `docs/spec20260907-s9-v1.md`;`spec-v1.md` / `spec-v3.md` 屬 **C′ 遷移系列**,本輪一律 **不適用**,不得援引其 AC(含 `spec-v1.md:167` 的 `/api/v1/parts` 判準) |
| ② `spec-v1.md:167`「筆數 > 0」與 `spec-v3.md:17-18`「0↔0 亦 PASS」矛盾 | 該爭點屬 C′ 遷移系列,**本輪 N/A**。若日後要重驗 C′,契約請指 `docs/spec-v3.md`,不要指 v1 |
| ③ 上輪無可驗收實作;T1/T2 綠燈只反映前一日既有狀態 | §4.5 明訂:回歸測試只當**護欄**(不得由綠轉紅),**不作為本輪通過依據**;本輪 PASS 完全由 AC-D / AC-V / AC-M / AC-G 決定 |
| ④ 規格環境脫節(分支 `feat/extract-maintenance`、AC 半數對象是 MM repo、mm-postgres 綁定已改) | §2 重新宣告環境基準(分支 `fix/audit-20260903`、HEAD `69ca7b8`);§5 明列**跨 repo 與跨系統不在驗收範圍**,MM 相關只保留一條唯讀事實查核 |

**一句話**:本輪要驗的是「一份文件是否誠實、可重跑、沒放錯位置」,不是「程式是否可跑」。

---

## 1. 功能描述(交付物是什麼)

`docs/spec20260907-s9-v1.md` 是對 `doc/整合設計與重新拆分規劃_20260617.md`(2026-06-17)的**對抗性稽核重整**。
它必須把三個月來的漂移逐條證偽,並重建一份與**執行中的系統**相符的設計全景。

必備七個構件:

| 構件 | 內容 | 對應 AC |
|---|---|---|
| C1 立場宣告 | 明示「舊文件每條宣稱視為待證偽假設」、不採信 `doc/` 自述、實查時點 | AC-D-01 |
| C2 漂移對照表 | 每列:原宣稱 / 實地驗證結果 / 判定(仍成立 / 已漂移 / 已不存在)/ **查證方式** | AC-D-02、AC-V-* |
| C3 更新後系統全景 | 三個關注點的邊界:主系統核心 / MM 外掛 / 已消失的 Smart Parts 內建模組 | AC-D-03 |
| C4 作業流程圖 | mermaid flowchart × 3 主線(見 §3) | AC-M-01~03 |
| C5 邏輯判斷圖 | mermaid flowchart 決策樹 × 3(見 §3) | AC-M-04~06 |
| C6 S1–S8 納入 | 舊文件完全沒提、但已改變資料流本體的八趟實作 | AC-D-04 |
| C7 開放問題重寫 | 拿掉已被現實跨過的舊 §7 題目,補上真正未解者 | AC-D-05 |

---

## 2. 輸入 / 輸出定義

### 2.1 環境基準(以此為準,不得沿用舊契約的環境假設)

| 項目 | 值 | 取得方式 |
|---|---|---|
| 專案根 | `/Volumes/G70Pro/cusor pool/Printing IoT` | — |
| 分支 | `fix/audit-20260903` | `git branch --show-current` |
| HEAD | `69ca7b8`(2026-09-06) | `git log --oneline -1` |
| 執行中的主系統容器 | `printingiot-{frontend,backend-api,backend-worker,postgres,redis,mqtt-broker,cloudflared}-1` 共 7 個 | `docker compose ps` |
| 資料庫 | 單一 `FlexoDB` | `docker compose exec -T postgres psql -U postgres -d FlexoDB` |

**沙箱注意(不照做會整輪盲跑)**:本機 Bash 沙箱會讓 `dotnet` 與 `docker` **假失敗**。
這兩個指令一律要 `dangerouslyDisableSandbox: true`。假失敗**不得**判為 AC 失敗(見 §6 E-01)。

### 2.2 輸入(RD 取證的來源,依可信度排序)

1. **執行中的系統**(最高):容器、FlexoDB 實表與列數。
2. **repo 內原始碼與設定**:`backend/`、`frontend/src/`、`docker-compose.yml`、`backend/PrintingIoT.Infrastructure/Migrations/`、`tests/fixtures/`。
3. **內部交付物**(可引用,但不可作為唯一依據):`docs/spec20260903-*`、`docs/spec20260905-*`、`docs/spec20260906-*`、`docs/report20260906-*`、根目錄 `handoff.md`。
4. **`doc/` 底下的任何文件**:**只能當作被稽核對象,不得當作證據**。

### 2.3 輸出

| 項目 | 值 |
|---|---|
| 檔案 | `docs/spec20260907-s9-v1.md`(唯一交付物) |
| 語言 | 正體中文(台灣用語) |
| 禁止路徑 | `doc/`(由 `DocsController` + 前端 `/docs` 對外提供,寫進去會直接出現在產品 UI) |
| 允許的其他異動 | 無。`backend/` `frontend/` `tests/` 一律不動 |

---

## 3. 必備圖表(內容定義)

### 3.1 作業流程圖(mermaid flowchart,至少三條主線)

| 代號 | 主線 | 必須出現的環節 |
|---|---|---|
| F-A | ERP 推單 → 排程 → 現場生產 → 完工實績落地 → 報表 | `X-Api-Key` / `ErpPush` policy、批次上限、冪等、排程 upsert、`ProductionCompletions` 落地、報表讀後端 |
| F-B | 登入與授權 | 登入取權杖、預設拒絕(`FallbackPolicy`)、401 → 刷新 → **重送原請求**、刷新權杖輪替與重用偵測 |
| F-C | Worker 訊號 WISE/PLC → MQTT → `ProductionLogs` | MQTT 主題、`plc_motor_signal` / `plc_count_signal` 對映、真機與模擬器合流、`Source` 欄位 |

### 3.2 邏輯判斷圖(mermaid flowchart 決策樹,至少三個,每個 ≥ 2 個判斷節點)

| 代號 | 主題 | 必須出現的分支 |
|---|---|---|
| L-A | OEE 四率計算判斷 | 分母為零 → 0、超產封頂(效能)、負值先夾零、負荷時間夾 0、達成率刻意不封頂 |
| L-B | 報表彙總來源取捨 | `localOnlyCount > 0` → 走前端、後端成功 → 採後端、後端失敗 → 降級 |
| L-C | 完工實績落地的冪等與驗證分支 | `ClientRecordId` 重複 → 不長第二列、欄位驗證失敗分支、原因碼與工廠日處理 |

---

## 4. 驗收標準

判定規則:**每條 AC 必須由 Tester 實際重跑指令取得結果,並在報告中貼出輸出**。
「讀文件說有」不算通過。任何一條 FAIL → 本輪不通過。

### 4.1 AC-D:文件內容(人工判定,但判準明確)

| # | 驗收項 | 判定方式 | 通過條件 |
|---|---|---|---|
| AC-D-01 | 立場宣告存在 | 讀 `docs/spec20260907-s9-v1.md` §0 | 明文寫出「舊文件每條宣稱視為待證偽假設」「不採信 `doc/` 自述」「實查時點」三者 |
| AC-D-02 | 漂移對照表五欄齊備 | 逐列檢視 §1 全部表格 | 每一列都有「原宣稱 / 驗證結果 / 判定 / 查證方式」;**查證方式欄不得為空、不得只寫『見上』而無指令或檔案:行號** |
| AC-D-03 | 三個關注點邊界清楚 | 檢視 §2 | 主系統核心、MM 外掛、已消失的 Smart Parts 三者各自的服務、資料表、埠與**邊界宣告**皆在;並寫明主系統不得再加保養/零件功能 |
| AC-D-04 | S1–S8 全數納入 | 檢視 §1.6 | S1、S2、S3、S4、S5+S6、S7(憑證 + 刷新)、S8 七件事**逐件**有落地證據(檔案:行號或 migration 名)與查證指令;缺任一件即 FAIL |
| AC-D-05 | 開放問題已重寫 | 對照 §5 與舊文件 §7 | ①「Smart Parts 去留」「MM 版控」「A/B/C 拆分方案」三題明確標為已被現實跨過;②新開放問題至少 8 條,每條有「為何是問題 / 誰能拍板 / 證據」 |
| AC-D-06 | 舊 §5 決策題的現況判定 | 檢視 §1 或 §5 | 明確寫出現況是「方案 C 走了一半」,而非舊文件宣稱的「方案 B 是目前狀態」 |
| AC-D-07 | 易漂移數值已標為快照 | 檢視 §1.7 與 §1.6 中的列數宣稱 | 非零列數(如 `RefreshTokens`、`Orders`、`ReasonCodes`、`MachineSections`、`Users`)須標明為 **2026-09-07 快照**;僅 `= 0` 類宣稱(`ProductionLogs` / `ProductionCompletions` / `Products` / `ApiKeys`)可作為判定依據 |
| AC-D-08 | 用語 | 全文掃視 | 正體中文,無簡體字、無中國用語(視頻/接口/優化/提交/程序等) |

### 4.2 AC-V:可重跑查證(自動判定,附本輪基準值)

以下每條都要實跑。基準值為 PM 於 **2026-09-07** 實測所得。

| # | 指令(於專案根執行) | 通過條件 |
|---|---|---|
| AC-V-01 | `grep -cE "^  [a-z-]+:" docker-compose.yml` | 輸出 `7`,且與文件 §1.2 記載一致 |
| AC-V-02 | `docker compose ps --format "table {{.Name}}\t{{.Service}}\t{{.Status}}"`(停用沙箱) | 7 個 `printingiot-*` 服務,無 `sm-frontend`;與文件一致 |
| AC-V-03 | `docker compose exec -T postgres psql -U postgres -d FlexoDB -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;"`(停用沙箱) | 14 列 = 13 張應用表(`ApiKeys, MachineSections, Orders, ProductionCompletions, ProductionDefects, ProductionLogs, ProductionStops, Products, ReasonCodes, RefreshTokens, Roles, UserRoles, Users`)+ `__EFMigrationsHistory`,且與文件 §1.3 逐字相符 |
| AC-V-04 | 同上輸出 | `Machines` / `Alarms` / `Parts` / `Suppliers` / `SupplierParts` / `Inventory` **皆不在**輸出中,文件對此判定為「已不存在」 |
| AC-V-05 | `grep -rn "TargetFramework" backend/*/*.csproj` | 5 個 csproj 全 `net9.0`,0 個 `net8.0`;文件判定舊文件「.NET 8」為已漂移 |
| AC-V-06 | `grep -n "FallbackPolicy\|AddAuthorization" backend/PrintingIoT.API/Program.cs` | 命中 `AddAuthorization`(:82)與 `FallbackPolicy`(:84);文件必須說明「S5/S6 之前是門鎖裝好沒上鎖」這層區別,而非單純抄舊文件的「已有 JWT + Role-based」 |
| AC-V-07 | `grep -rn "smartparts\|SmartParts\|sm-frontend" --include="*.cs" --include="*.js" --include="*.jsx" backend/PrintingIoT.API backend/PrintingIoT.Core frontend/src docker-compose.yml \| wc -l` | 輸出 `0` |
| AC-V-08 | `ls backend/PrintingIoT.Infrastructure/Migrations/ \| grep RemoveSmartPartsModule` | 命中 `20260706143822_RemoveSmartPartsModule`;文件據此標明外移時點 |
| AC-V-09 | `docker compose exec -T postgres psql -U postgres -d FlexoDB -tAc "SELECT count(*) FROM \"__EFMigrationsHistory\";"`(停用沙箱) | 輸出 `13`,與文件記載一致(文件若寫其他數字即 FAIL) |
| AC-V-10 | 對 `ProductionLogs` / `ProductionCompletions` / `Products` / `ApiKeys` 各跑 `SELECT count(*)`(停用沙箱) | 四者皆 `0`;文件明確把這四個 0 解讀為「尚未有真機/真實資料」而非缺陷,並連到對應開放問題 |
| AC-V-11 | `ls docs/spec20260907-s9-v1.md; ls doc/ \| grep -c "spec20260907\|s9"` | 前者存在;後者輸出 `0`(**未誤寫入 `doc/`**) |
| AC-V-12 | `git status --short -- backend frontend tests` | 無任何輸出(本輪零程式碼異動) |
| AC-V-13 | `git status --short -- docs` | 只出現本輪文件檔;不得出現 `backend/` `frontend/` `tests/` 路徑 |
| AC-V-14 | 抽驗文件中任選 **5 條**含「檔案:行號」的證據 | 5 條全部可用 `sed -n 'N,Mp' <檔>` 打開且內容與宣稱相符;任一條對不上即 FAIL |

### 4.3 AC-M:mermaid 可渲染(自動判定)

| # | 驗收項 | 判定方式 | 通過條件 |
|---|---|---|---|
| AC-M-01 | 圖數量 | `grep -c '^```mermaid' docs/spec20260907-s9-v1.md` | ≥ 6 |
| AC-M-02 | 結構檢查 | 跑 §4.4 的檢查腳本 | `ISSUES: none`,且 blocks ≥ 6 |
| AC-M-03 | 決策樹判斷節點 | 同腳本輸出 | §4 的三張決策樹(L-A / L-B / L-C)各 `decision_nodes >= 2` |
| AC-M-04 | 三條主線齊備 | 讀 §3 | F-A / F-B / F-C 各一張,且含 §3.1 表列的必要環節 |
| AC-M-05 | 節點文字 | 讀圖 | 正體中文,無簡體字 |
| AC-M-06 | 渲染複驗(選用) | `npx -y @mermaid-js/mermaid-cli -i <抽出的圖> -o out.svg` | 若環境可下載該套件則須全數成功;無網路時記為 E-02 並以 AC-M-02 為準 |

### 4.4 mermaid 結構檢查腳本(直接貼進終端機執行,不寫任何檔案)

```bash
cd "/Volumes/G70Pro/cusor pool/Printing IoT" && python3 - <<'PY'
import re
src=open('docs/spec20260907-s9-v1.md',encoding='utf-8').read().split('\n')
blocks=[];cur=None
for ln in src:
    if ln.strip()=='```mermaid': cur=[]; continue
    if cur is not None and ln.strip()=='```': blocks.append(cur); cur=None; continue
    if cur is not None: cur.append(ln)
print('blocks',len(blocks))
bad=[]
for i,b in enumerate(blocks,1):
    body=[l for l in b if l.strip()]
    if not re.match(r'^(flowchart|graph)\s+(TD|TB|LR|RL)$',body[0].strip()): bad.append((i,'header',body[0]))
    nodes=0
    for l in body:
        if l.count('"')%2: bad.append((i,'quote',l))
        for o,c in [('[',']'),('{','}'),('(',')')]:
            if l.count(o)!=l.count(c): bad.append((i,'bracket',l))
        nodes+=len(re.findall(r'\{"',l))
    print(f'  block {i}: lines={len(body)} decision_nodes={nodes} arrows={sum(l.count("-->")+l.count("-.->") for l in body)}')
print('ISSUES:',bad if bad else 'none')
PY
```

PM 於 2026-09-07 對現行草稿實跑此腳本的結果:`blocks 6`、六塊 `decision_nodes` 依序為
`1 / 5 / 4 / 3 / 3 / 6`、`ISSUES: none`。**此腳本已驗證為可通過,不是空頭判準。**

### 4.5 AC-G:治理與護欄

| # | 驗收項 | 判定方式 | 通過條件 |
|---|---|---|---|
| AC-G-01 | 交付路徑正確 | AC-V-11 | 只在 `docs/`,`doc/` 零命中 |
| AC-G-02 | 零程式碼異動 | AC-V-12 | 無輸出 |
| AC-G-03 | 回歸護欄未由綠轉紅 | `dotnet test backend/PrintingIoT.sln`(停用沙箱);`cd frontend && npm run test` | 若可執行,結果**不得比 HEAD `69ca7b8` 的既有狀態更差**。此項是**護欄不是依據** —— 綠燈**不能**用來宣告本輪通過;紅燈若與本輪文件無因果關係,記為觀察不判 FAIL |
| AC-G-04 | 未動 `doc/` 既有檔 | `git status --short -- doc` | 無輸出 |
| AC-G-05 | 契約自身不再指向被取代檔 | 讀本檔 §0 | 已明確排除 `spec-v1.md` / `spec-v3.md`(C′ 系列)之 AC |

---

## 5. 明確不在驗收範圍(避免重蹈上輪半數 AC 打空)

| 項目 | 處置 | 理由 |
|---|---|---|
| MM repo(`/Volumes/G70Pro/cusor pool/MM`)之程式、資料、容器行為 | **N/A,跨 repo 不驗** | 本輪受驗物只有主系統的一份文件 |
| MM 唯一保留的查核 | `cd "/Volumes/G70Pro/cusor pool/MM" && git remote -v` → 指向 `github.com/eric4577599/MM.git`。**唯讀事實查核**,用來證偽舊文件「MM 尚未 git init」一句;MM 若不在此機或未 clone,記 E-03 為 N/A,不判 FAIL | 這條是漂移證據,不是 MM 的功能驗收 |
| C′ 遷移系列 AC(`spec-v1.md` AC-A/B/C、`spec-v3.md` 修訂版判準,含 `/api/v1/parts` 筆數) | **本輪 N/A** | 已於 2026-07 結案(`docs/report20260707-4.md`、`tests/report-v2.md`、`report-v3.md`),重跑只會重報已處置的假缺陷 |
| Cloudflare Tunnel 實際路由(`smartparts.*` 殘留、`mms.*` 是否已加) | 不驗,列為文件內開放問題即可 | 設定不在版控內,repo 無真相來源 |
| 實機瀏覽器驗收(完工單不復活、`/docs` 不回 401、`/debug` 被擋、逾時自動換發) | 不驗 | 需真人操作瀏覽器,且屬 S1–S8 既有 backlog,非本輪文件交付範圍 |
| `mm-postgres` 對外綁定 | 不驗(現況已為 `127.0.0.1:5434`) | 舊契約 AC-B5/B6 的假設已過期 |

---

## 6. 已知 edge case 的預期行為

| 代號 | 情境 | 預期行為 |
|---|---|---|
| E-01 | 跑 `docker` / `dotnet` 時忘了 `dangerouslyDisableSandbox` | 指令**假失敗**。這**不算** AC 失敗;停用沙箱重跑一次。連續兩次真失敗才記 FAIL,並附完整錯誤訊息 |
| E-02 | 無網路,`npx @mermaid-js/mermaid-cli` 取不到 | AC-M-06 記為 N/A,以 AC-M-02 結構檢查為準;報告須註明 |
| E-03 | MM repo 不在本機 | §5 那條唯讀查核記 N/A;文件中對應漂移條(MM 已 git init)改以其他證據判定,不判 FAIL |
| E-04 | `ProductionLogs` / `ProductionCompletions` / `Products` / `ApiKeys` 查出 **0 列** | **符合預期**,是「尚未有真實資料」而非缺陷。文件必須這樣解讀;若文件把它寫成系統故障 → FAIL |
| E-05 | 同上四表日後查出**非 0** | 代表現場已有資料。此時 AC-V-10 改判「文件記載已過期」→ 要求 RD 更新該條與對應開放問題,**不是**判文件造假 |
| E-06 | `RefreshTokens` / `Orders` / `Users` 等非零列數與文件記載不同 | **不判 FAIL**(這些值天天在動)。只要文件依 AC-D-07 標明為 2026-09-07 快照即通過 |
| E-07 | 文件中某條「檔案:行號」因後續 commit 位移 | 以**內容是否對得上**為準,不以行號絕對值為準;內容找不到才 FAIL |
| E-08 | 有人把交付物複製進 `doc/` | **直接 FAIL(AC-G-01)**。`doc/` 由 `DocsController` 對外提供,等於把內部稽核結論推進產品 UI |
| E-09 | Tester 想援引 `docs/spec-v1.md` 或 `spec-v3.md` 的 AC | **契約錯誤**,不是實作缺陷。依 §0 一律不適用;若仍有歧義,回報 T3 並指出本檔 §5 |
| E-10 | 本輪 `git status` 顯示無程式碼異動 | **符合預期**(AC-V-12),純文件輪本該如此。**不得**因此判「本輪無可驗收產出」—— 受驗物是文件本身 |
| E-11 | 文件某條漂移只寫「已確認」而無指令 | 違反 AC-D-02 → FAIL,要求補上可重跑指令或 `檔案:行號` |
| E-12 | 舊文件某條宣稱查證後**仍成立** | 允許,判定欄寫「仍成立」即可。對抗性稽核不要求每條都推翻,但**必須附查證方式** |

---

## 7. 交付與回報格式(給 Tester)

Tester 報告須逐條列出:AC 代號 / 實跑指令 / 實際輸出摘要 / PASS·FAIL·N/A / 依據。
分流依既有規則:

- **T1**:AC-V / AC-M 指令層級失敗(環境或指令錯) → 先套 §6 的 E-01~E-03 排除,仍失敗才回報。
- **T2**:文件內容與實查結果矛盾(AC-D / AC-V 的一致性條款)→ 回 RD 修文件。
- **T3**:契約本身有歧義或指向錯誤標的 → 回 PM 改本檔,**並具體指出是哪一條 AC 無法判定**。

---

## 附錄:本檔封存與引用

- 本檔前身(2026-07-08 C′ 遷移回4 規格)→ `docs/spec-cmigration-v2-20260708.md`(內容一字未改),git commit `2318253`。
- C′ 遷移系列現行有效規格 → `docs/spec-v3.md`(**本輪不適用**)。
- 本輪受驗物 → `docs/spec20260907-s9-v1.md`。
- 稽核對象 → `doc/整合設計與重新拆分規劃_20260617.md`(唯讀,不得修改)。
