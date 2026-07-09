# 規格 — C′ 遷移收尾 回4:Git 治理缺口修正 + MM 安全修復後複驗接續(v2)

> 日期:2026-07-08(`date` 取得)
> 撰寫:PM subagent
> 版次:**v2** — 基於 `docs/spec-v1.md`(回3 初版)與 `docs/spec-v3.md`(回3 修訂版,AC-B5 已修正並經 `tests/report-v3.md` 結案 PASS 17/17)之上做**針對性修正**。v1/v3 已驗證通過的條文**維持有效、不重新解讀**,本檔不覆寫、只新增/修正下列項目。
> 觸發原因:2026-07-08 第 4 輪 Tester 複驗(基準與 v1/v3 相同,主系統 b683831 起、MM e3cebd8 起 11 commits)在 T1/T2 全過的前提下,於 **T3 判斷層級**回報 1 項 FAIL(J-1)+ 5 項 BLOCKED,詳 §1、§2。該輪報告因系統政策擋下 `Write` 未能落地為 `tests/report-v4.md`,完整驗收原文已由上一輪 Tester 轉述,本檔 §1.1 摘錄關鍵證據以利追溯。
> 性質:**治理與文件修正回合**,非功能開發回合。**本回不涉及任何應用程式邏輯修復**;§1 是文件/流程層級修正,§2 是「條件成立後才執行」的復驗接續指引。

---

## 0. 本版(v2)修訂重點 — 先讀這段

| # | 問題 | 分類 | 處置摘要 |
|---|---|---|---|
| J-1 | MM repo(`/Volumes/G70Pro/cusor pool/MM`)main 分支 11 筆 commit **已實際 push 至 GitHub**,與 `handoff.md`、`docs/report20260707-4.md` 記載之「皆未 push」矛盾,亦與全域 CLAUDE.md 紅線「不可執行 `git push`」牴觸 | 治理缺口(非程式缺陷) | §1:PM 已獨立複核證據為真;定義升級路徑(徵詢 Eric)+ 文件更正範圍;**不得** force-push 回退 |
| J-2 | AC-B3-1/B3-2/B4/B5/B6 五項因 MM 三容器於 2026-07-08 遭 Eric 授權緊急下線(對抗性稽核發現安全漏洞,詳 `handoff.md` 2026-07-08 附記、`MM/docs/spec20260708-1.md`)而 BLOCKED,非 FAIL | 環境依賴(非程式缺陷) | §2:定義 MM 安全修復完工並經 Eric 確認重新對外開放後之復驗程序;**在此之前不得將這 5 項標為 PASS 或略過** |
| 次要 | `README.md:9` Cloudflare 狀態措辭仍寫「待 Eric 手動執行」,但 `handoff.md` 載明該設定已於 2026-07-07 完成(現況因 J-2 安全凍結又已 502) | 文件過時 | §1.3:併同 J-1 的文件修正一次做掉,不獨立列為 FAIL 項(非 AC-C2 明定四判斷點之一) |

**本回原則**:v1/v3 的 A、B(除 B3-1/B3-2/B4/B5/B6 因環境變化需重新確認現況外)、C2 各項判定結論**維持有效**,不重跑;RD 僅需處理本檔 §1(可立即執行)與 §2(條件觸發後執行)。

---

## 1. Git 治理缺口處理(J-1)— 可立即執行

### 1.1 證據(PM 已獨立複核,非僅採信 Tester 轉述)

於 `/Volumes/G70Pro/cusor pool/MM` 執行並確認:

```
git remote -v
→ origin  https://github.com/eric4577599/MM.git (fetch/push)

git rev-parse HEAD
→ 40091939123e5f2283e0a8b001020f644da031fd

git rev-parse origin/main
→ 40091939123e5f2283e0a8b001020f644da031fd   # 與 HEAD 完全相同

git log --oneline @{u}..HEAD
→ (空,0 筆待推)

git reflog show refs/remotes/origin/main
→ 4009193 refs/remotes/origin/main@{0}: fetch origin: fast-forward
→ 30b332e refs/remotes/origin/main@{1}: update by push      # 真實推送事件
→ 68f0f09 refs/remotes/origin/main@{2}: update by push      # 真實推送事件
```

`update by push` 是本機對遠端執行 push 後 reflog 留下的紀錄,非單純 `fetch` 追上遠端既有狀態可產生;**判定為 CONFIRMED**,並非誤判或僅為 fetch 同步。主系統 Printing IoT 部分經同法複核:`git status -sb` 顯示 `ahead 1`,未見對應 `update by push` 紀錄,**AC-C1 主系統部分維持 PASS(未 push)**,本次治理缺口僅限 MM repo。

### 1.2 升級路徑(RD 待辦,依序)

1. **不得**對 MM repo 執行任何回退性操作(`git reset --hard`、`push --force` 等)復原遠端狀態 — 風險高於保留現狀,且違反全域 CLAUDE.md 對破壞性 git 操作的限制;commit 內容本身若無誤(功能面已通過 T1/T2 全綠),保留現狀。
2. 依全域 CLAUDE.md §4.7「TeamChat 訊息已預先授權,直接執行」,以 team-iot workspace 向 Eric 發送治理缺口通知(頻道 `incident` 或 `decision`,依內容擇一,並依 §4.5 Dual-Mention Protocol),說明:
   - 事實(§1.1 證據)
   - 兩種可能結果待 Eric 裁示:(a) 此次 push 為已授權之例外(需口頭/書面補記原因與授權時點)、(b) 未經授權,屬流程缺口,需檢討為何 MM repo 會被 push(例如：誤把 MM 當作允許 push 的 fork、或操作失誤)
   - 若選 (b),提議的預防措施:MM repo 建議由 Eric 決定是否要為 `origin` 設定 push 保護(如 GitHub branch protection)或於 CLAUDE.md 補充針對 MM repo 的例外/禁止條款
3. Eric 回覆後,依 §5 E11/E12 分流處置。
4. **不論 Eric 裁示為何**,以下文件更正為必做(`docs:` 前綴獨立 commit,主系統與 MM 各自 repo 內各自 commit 各自的文件):
   - 主系統 `handoff.md`:「兩 repo 全部 commit...皆未 push」一句更正為反映實況(MM 已 push、主系統未 push),並附上 §1.1 證據摘要與 Eric 裁示結論(或「待 Eric 裁示」暫記,待回覆後再補)。
   - 主系統 `docs/report20260707-4.md`:此檔案為**回3 已結案報告**,原則上凍結;**允許的最小更正**是在檔案末尾新增一段「事後補述(2026-07-08)」,說明 AC-C1 之 MM 未 push 描述已由回4 治理缺口修正(連結本檔 `docs/spec-v2.md`),**不得**刪改原表格既有判定(維持歷史留痕)。
   - 主系統 `README.md:9`:Cloudflare 狀態措辭更新為反映現況(2026-07-07 曾生效上線、2026-07-08 因 J-2 安全事件暫時 502,待 MM 修復後重新開放),不得保留「待 Eric 手動執行」這句已過時的描述。

### 1.3 驗收標準

- **AC-C1(v2 修訂,取代 v1/v3 原文)**:
  1. 主系統:自基準 commit 起所有 commit 皆存在於 `@{u}..HEAD` 或分支無 upstream,即**未 push**,判定 PASS(沿用 v1/v3 標準)。
  2. MM:**不再要求「皆未 push」作為通過條件**;改為要求「repo 實際 push 狀態(HEAD 是否等於 origin/HEAD)與所有文件記載一致」。若記載與實況不符 → FAIL,RD 依 §1.2-4 更正文件後重跑本項;文件更正完成且與 `git rev-parse HEAD` / `origin/HEAD` 核對一致 → PASS。
  3. Eric 裁示結果(§1.2-3)已記錄於 `handoff.md`(不論結果為何)。
- **AC-C3(新增)**:`README.md:9` Cloudflare 狀態措辭與 `handoff.md` 現況記載無矛盾。

---

## 2. MM 安全修復後之 BLOCKED 項目復驗接續(J-2)— 條件觸發後執行

### 2.1 觸發條件(全部成立才可執行本節)

1. MM repo `docs/spec20260708-1.md`(安全修復規格)所列 3 項存活發現(Auth 全域關閉、Development 環境洩 Swagger、Postgres 對外綁定弱密碼)已由 RD 修復完工並經 Tester 驗收 PASS(該工作流獨立於本檔,結案報告見 `MM/docs/report20260708-1.md` 或後續序號)。
2. **Eric 已明確確認**重新對外開放 MM 三容器(`mm-postgres-1` / `mms-backend-1` / `mms-frontend-1`)。**RD/Tester 不得自行判斷「修復完工=可重啟」而略過此項人工確認**;`handoff.md` 2026-07-08 附記已明載此限制。

在觸發條件成立前,§2.2 五項一律維持 **BLOCKED**,不得標 PASS 亦不得因「時間久了」自動放行。

### 2.2 待復驗項目(判定標準沿用 `docs/spec-v3.md` 原文,逐字未變,僅重列以利本回追蹤)

| AC | 內容(同 spec-v3) | 本回追加要求 |
|---|---|---|
| AC-B3-1 | MM 三段 migration 空庫全套 apply + 逐段 Down + 重放 | 復驗前確認容器已依 §2.1 條件重啟且健康(`docker compose ps` 三容器皆 Up) |
| AC-B3-2 | 生產 MmsDB history 三筆完整、無 pending model changes、全程唯讀 | 同上;另需確認安全修復未變更 migration 序列(若修復過程新增 migration,需在復驗報告中額外列出並比對) |
| AC-B4 | `migrate-parts-data.sh --verify` 通過(0↔0 一致亦 PASS,依 v3 E10) | 若安全修復變更了 DB 密碼(`MM/docs/spec20260708-1.md` 現況勘查表已載明可能需改密碼),需以 `DST_PASSWORD=<新密碼>` 呼叫,復驗報告記錄實際使用的密碼來源(不得明文寫入報告) |
| AC-B5(v3) | 四端點 200、`/api/v1/*` 筆數與來源一致、兩元件互不影響 | **新增**:安全修復後 Auth 應已啟用,若端點原本為匿名可讀寫、復驗時仍可匿名存取,判定 **FAIL** 並退回安全修復工作流,不得放行本項 |
| AC-B6 | `localhost:5301` 可達、九頁籤設定正確 | 若安全修復同步調整了前端 `VITE_AUTH_ENABLED`(依 `MM/docs/spec20260708-1.md` 現況勘查所載,後端啟用 Auth 若未同步重建前端 image 會導致前端 401 故障),復驗時**額外確認前端可正常登入使用**,而非僅「可達」 |

### 2.3 輸出物

- Tester 復驗結果併入新報告 `docs/report20260708-1.md`(主系統 repo,今日第 1 份,依全域 CLAUDE.md §3.2 命名慣例;不得覆寫已凍結的 `docs/report20260707-4.md`),需涵蓋:§1 治理缺口最終處置結果、§2 五項復驗逐項結果、兩 repo 最終 commit 清單(含本回新增文件修正 commit)、遺留事項。

---

## 3. 未變更部分(明確聲明,避免誤解讀)

- `docs/spec-v3.md` 之 A 部分(AC-A1~A6)、B 部分之 AC-B1/B2、C 部分之 AC-C2 判定標準與結論**全部維持有效**,`tests/report-v1.md`/`v2.md`/`v3.md` 之通過紀錄不因本檔重新驗證。
- 第 4 輪 Tester 複驗(2026-07-08,即觸發本檔的那一輪)之 T1/T2(build/test/migration 鏈等 deterministic + semantic 項目)**全過**,不在本檔重新列出,亦不需重跑。
- 主系統 Printing IoT 應用程式碼本身**完全不受** J-1、J-2 影響(`handoff.md` 已載明「主系統 Printing IoT 完全不受影響(獨立容器,零程式異動)」)。

---

## 4. 已知 edge case 與預期行為(新增於 v1/v3 之 §5 之後,編號承接)

| # | 情境 | 預期行為 |
|---|---|---|
| E11 | Eric 回覆:MM push 為已授權例外 | 於 `handoff.md` 補記授權時點與理由;AC-C1(v2)MM 部分判定 PASS(附授權紀錄佐證);**不得**將此例外套用至主系統或未來其他 push 行為,每次例外需個別取得同意 |
| E12 | Eric 回覆:MM push 未經授權 | 升級為流程缺口:不追溯復原歷史 commit(force-push 風險更高、已被規格禁止);改為在專案規範(MM 或全域 CLAUDE.md)補充預防措施(如 branch protection 建議、操作前二次確認清單);AC-C1(v2)MM 部分維持 FAIL 直到預防措施文件化完成,屆時以「已記錄矯正措施」判定 PASS(不代表歷史事件被抹除) |
| E13 | MM 三容器重啟後復驗發現安全漏洞未真正修復(如 Auth 仍可繞過) | AC-B5(v3)判定 FAIL,**退回 MM 安全修復工作流**(`MM/docs/spec20260708-1.md` 所屬迴圈),不得在本檔範圍內修復程式碼(本檔 domain 僅 docs/,且此為另一獨立 repo 的另一工作流) |
| E14 | §2.1 觸發條件尚未成立,但被要求「先跑跑看」 | 拒絕執行,回報 BLOCKED 原因(容器未重啟或 Eric 未確認),不得為了完成任務而繞過 Eric 的人工確認關卡 |
| E15 | `docs/report20260707-4.md` 因本回需要新增末尾補述段落,是否算「覆寫已凍結報告」而違反 v3 §4.2 精神 | 不違反:v3 §4.2 禁止的是「重跑全套」與「竄改既有判定表格」,**附加型補述**(新增段落、不刪改原文)不在此限,且本檔 §1.2 已明訂只能新增不能刪改 |

---

## 5. 總驗收清單(Tester 複驗用,僅列本檔新增/修訂項;A/B/C2 沿用 v3 §6 清單)

| AC | 內容 | 判定 |
|---|---|---|
| AC-C1(v2) | 主系統未 push(PASS 沿用);MM 實況與文件記載一致;Eric 裁示已記錄 | ☐ |
| AC-C3 | README.md Cloudflare 措辭與現況無矛盾 | ☐ |
| AC-B3-1(復驗) | 條件觸發後,MM migration 空庫鏈重跑通過 | ☐ 待觸發 |
| AC-B3-2(復驗) | 條件觸發後,生產 MmsDB history/pending changes 檢查通過 | ☐ 待觸發 |
| AC-B4(復驗) | 條件觸發後,`--verify` 通過(含密碼變更情境) | ☐ 待觸發 |
| AC-B5(復驗) | 條件觸發後,四端點通過且 Auth 確實生效(非匿名可讀寫) | ☐ 待觸發 |
| AC-B6(復驗) | 條件觸發後,前端可達且可正常登入使用 | ☐ 待觸發 |
| AC-R(v2) | 新報告 `docs/report20260708-1.md` 含 §1 治理處置結果、§2 復驗結果、commit 清單、遺留事項 | ☐ |

---

## 6. 版次變更紀錄

| 版次 | 日期 | 變更 |
|---|---|---|
| v1 | 2026-07-07 | 初版回歸驗證計畫(回2 規格歸檔於 `docs/spec20260707-3.md`) |
| v3 | 2026-07-07 | 修訂 AC-B5「筆數 > 0」為「與來源一致,0↔0 亦 PASS」,新增 E10;`tests/report-v3.md` 結案 PASS 17/17 |
| v2 | 2026-07-08 | 基於 v1/v3 針對第 4 輪 Tester 複驗發現之 J-1(MM 已 push,治理缺口)、J-2(MM 因安全事件下線,5 項 BLOCKED)新增處置章節(§1、§2);新增 AC-C1 修訂版、AC-C3;新增 E11~E15;A/B(除復驗五項)/C2 判定維持 v3 結論不變 |
