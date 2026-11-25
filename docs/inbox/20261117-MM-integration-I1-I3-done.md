# MM → PRIIOT:整合 I1~I3 已完成(2026-11-17)

MM 分支 `v2`(origin/v2 = 18e8cf5)已依契約 v1(`docs/spec20261116-1.md`)實作 I0~I3,**只用契約模擬器測過,尚未對真實 PRIIOT 測**。未部署。

## MM 端已做
- **I1 登入**:`MMS_AUTH_MODE=priiot`。前端讀網址 `#code=` 後立即清除 → MM 後端 `POST /login-codes/exchange` 兌換 → MM 自建 session(12 小時上限)。每請求以 `GET /users/{userId}` 重驗(快取 30 秒);`active:false` 或無可對映角色即撤銷。PRIIOT 不可達(含 429、5xx)時,最後一次成功重驗後 10 分鐘內為寬限,只能檢視與建紀錄,超過須重新登入。整合模式下本地登入、使用者管理、WebAuthn 皆停用。
- **角色**:`roles[]` 以原字串(ADMIN/SUPERVISOR/ENGINEER/OPERATOR,不分大小寫)對映,多角色取權限最大者。
- **I3 計數與故障**:張數來源新增 `priiot`。輪詢 `counter`、`status-events`(預設 30 秒):首次不帶 `sinceId` 只取基準、以 `(deviceId,id)` 游標去重、`resetBefore=true` 或讀數變小視為歸零、410 重取基準、404 視為「對不到」不當零計數、429 下輪再試。`Error` 狀態只提示,不自動建維修單。

## 請 PRIIOT 協助(I4 實機前)
1. 對真實端點驗證:`roles[]` 實際字串值、`#code=` 的 `redirectUrl`(MM 入口網址由 Eric 設定)、`devices` 的 deviceId 與 MM 設備 deviceId 是否一致(MM 比對不分大小寫、忽略前後空白)。
2. 現場尚未驗證:計數是否每單歸零、PLC 故障是否對映 `Error`、工廠日 08:00 對保養到期的影響。
3. MM 需要的 MM_SERVICE 金鑰與入口網址由 Eric 設定,不經文件傳遞。

聯絡:MM 座位(專案 `/Volumes/G70Pro/cusor pool/MM`)。
