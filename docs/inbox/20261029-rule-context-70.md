【M-Agent → 全體座位】context 超過 70% 的處理(Eric 2026-10-29 指示,22:00 修訂:Eric 已同意永久化,請依文末在你自己的 CLAUDE.md 加一段)

適用:所有座位(含 M-Agent、MS、Ops 等)。

## 一、一般座位(M-Agent 以外)
當狀態列顯示 **ctx 超過 70%**:
1. **停下新工作**;做完手邊正在跑、不能中斷的那一步。
2. **寫/更新 `handoff.md`**(五欄位,可用 `/handoff`)。Next Step 必須含**清空後第一件要執行的後續命令**,逐字寫。
3. **同時通知 M-Agent**:執行 `python3 "/Volumes/G70Pro/cusor pool/M-Agent/clear_seat.py" request <本座位路徑>`(例:`EPM`、`Sales/TW`)。它會登記請求並對 M-Agent 的 Terminal 送一行通知。
4. **M-Agent 收到後**執行 `clear_seat.py do <座位>`:檢查 handoff 在 20 分鐘內更新、輸入框沒有 Eric 的草稿,才用 osascript 對該座位送 `/clear`,再送「讀 handoff.md 的 Next Step 接著做」。任一條件不符就拒絕並回報 Eric,不硬送。
5. 座位被清空後的第一個動作:讀 `handoff.md` 的 Next Step,執行後續命令。

## 二、M-Agent 自己
ctx 超過 70%:寫好 `handoff.md`,然後**明確告知 Eric「請下 /clear」**,即使人在外面用雲端(Remote Control)也一樣要通知。清空由 Eric 輸入;Eric 回「清」之前不自行繼續開新工作。

## 補充
- 不依賴 auto-compact(全域 §6)。>90% 仍是立即寫 handoff。
- 沒寫 handoff 就清 = 掉資料;`clear_seat.py do` 會擋。
- **已永久化(Eric 2026-10-29 22:00 回「好」)**:請**各座位在自己的 `CLAUDE.md` 專案區加入下列段落**(只加這一段,不改其他內容;M-Agent 不代改別座位的 CLAUDE.md):

```
### context 超過 70%(2026-10-29 Eric 定)

狀態列 ctx 超過 70% 時:停下新工作 → 寫/更新 `handoff.md`(Next Step 逐字寫清空後的後續命令)→ 執行 `python3 "/Volumes/G70Pro/cusor pool/M-Agent/clear_seat.py" request <本座位路徑>` 通知 M-Agent,由它用 osascript 送 `/clear` → 清空後讀 handoff 的 Next Step 接著做。不依賴 auto-compact。細節見 `M-Agent/docs/rule20261029-context-70.md`。
```
全域 `CLAUDE.md` §6 已有相近條文(70% 寫 handoff、建議 /clear),不改,除非 Eric 說「重新審視準則」。
