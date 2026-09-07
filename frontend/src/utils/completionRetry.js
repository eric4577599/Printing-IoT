// 完工實績送出的重試策略(S11)。
//
// 背景:S10 做的是**事後對帳** —— 掃描本機殘留的 pending 再補送。
// 但源頭沒堵:`Dashboard.jsx` 的完工 POST 只送一次,catch 裡只 console.warn,
// 一次網路抖動、一次 502、一次撞限流,那筆就永遠停在 pending 等人去報表頁按回填。
// 自從 S5/S6 開了認證,權杖過期那一瞬間完工的單也會落到同一條路上。
//
// 本模組把「該不該重試、等多久」抽成純決策 + 一支可注入相依的送出迴圈,
// 讓判準能被測試釘住,而不是散在 Dashboard 的 .catch 裡。
//
// **重試安全的前提是冪等**:後端以 `clientRecordId` 去重(同鍵重送回 duplicated
// 且資料庫不長第二筆),所以「送出去了但回應沒收到」的情境重送不會產生兩筆實績。
// 沒有這個前提就不該重試 —— 這是本模組成立的唯一理由,改動時先確認它還在。
//
// 邊界:重試只在頁面開著的時候有效。關掉分頁、整晚離線、始終沒登入的那些,
// 仍然只有 S10 的回填面板涵蓋得到 —— 兩者是互補的,不是誰取代誰。

/** 預設退避階梯(毫秒):快、中、慢各一次,合計約 40 秒內收斂 */
export const DEFAULT_RETRY_DELAYS_MS = [2000, 8000, 30000];

/** 429 沒帶 Retry-After 時的等待;與 useBackfill 的退避同量級(固定視窗一分鐘) */
export const RATE_LIMIT_FALLBACK_MS = 5000;

/** Retry-After 再長也不等超過這個時間,免得一筆卡住整個佇列 */
export const MAX_RETRY_AFTER_MS = 60000;

/**
 * 判斷一個送出失敗該不該重試
 * @param {Object} err - axios 風格的錯誤(可能有 err.response.status)
 * @returns {{ retry: boolean, reason: string }}
 *          reason 為給人看的短標籤,會寫進操作記錄
 * @description 判準是「重試有沒有機會變好」:
 *              - 沒有 response(斷網 / DNS / 逾時)→ 重試,網路可能只是抖一下
 *              - 429 / 408 / 5xx → 重試,是對方的暫時狀態
 *              - 401 → 重試。api 攔截器已經試過換發權杖了,走到這裡表示換發也失敗;
 *                但作業員可能正在另一個分頁重新登入,慢一點再送有機會成功
 *              - 其他 4xx(400 欄位錯、403 沒權限、409 業務衝突)→ 不重試。
 *                重送一模一樣的內容只會得到一模一樣的拒絕,徒然拖慢換單
 */
export function classifyFailure(err) {
    const status = err?.response?.status;

    if (status === undefined || status === null) {
        return { retry: true, reason: 'network' };
    }
    if (status === 429) return { retry: true, reason: 'rateLimited' };
    if (status === 408) return { retry: true, reason: 'timeout' };
    if (status === 401) return { retry: true, reason: 'unauthorized' };
    if (status >= 500) return { retry: true, reason: 'serverError' };

    return { retry: false, reason: `http${status}` };
}

/**
 * 算出這次失敗後要等多久
 * @param {Object} err - 送出失敗的錯誤
 * @param {number} attempt - 已經失敗過幾次(0 = 第一次送就失敗)
 * @param {Array<number>} [delays] - 退避階梯,預設 DEFAULT_RETRY_DELAYS_MS
 * @returns {number} 毫秒;階梯用完回 0(呼叫端據此判定不再重試)
 * @description 429 帶 Retry-After 時以伺服器說的為準(夾在 MAX_RETRY_AFTER_MS 內),
 *              這比我們自己猜的階梯準 —— 但仍受重試次數上限約束,不會無限等下去。
 */
export function nextDelayMs(err, attempt, delays = DEFAULT_RETRY_DELAYS_MS) {
    if (attempt >= delays.length) return 0;

    if (err?.response?.status === 429) {
        const raw = err?.response?.headers?.['retry-after'] ?? err?.response?.headers?.['Retry-After'];
        const seconds = Number(raw);
        if (Number.isFinite(seconds) && seconds > 0) {
            return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
        }
        return RATE_LIMIT_FALLBACK_MS;
    }

    return delays[attempt];
}

/**
 * 送出一筆完工實績,失敗時依策略重試
 * @param {Object} payload - 完工實績本體(必須含 clientRecordId,冪等靠它)
 * @param {Object} deps - 注入的相依
 * @param {Function} deps.send - (payload) => Promise<Object>,實際送出(正式用 createProductionCompletion)
 * @param {Function} [deps.sleep] - (ms) => Promise,預設 setTimeout;測試注入假的以免真的等
 * @param {Function} [deps.onAttempt] - ({ attempt, phase, reason, delayMs, error }) => void,
 *                                      每次嘗試的結果回報,用來寫操作記錄
 * @param {Function} [deps.isCancelled] - () => boolean,回 true 時停止重試(例如元件已卸載)
 * @param {Array<number>} [deps.delays] - 退避階梯,預設 DEFAULT_RETRY_DELAYS_MS
 * @returns {Promise<{ ok: boolean, result?: Object, error?: Object, attempts: number, reason?: string }>}
 * @description **絕不 reject**。完工路徑不能因為送不出去就中斷現場換單,
 *              所以結果一律以回傳值表達,由呼叫端決定要不要標 pending。
 */
export async function sendCompletionWithRetry(payload, deps = {}) {
    const {
        send,
        sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        onAttempt = () => {},
        isCancelled = () => false,
        delays = DEFAULT_RETRY_DELAYS_MS,
    } = deps;

    if (typeof send !== 'function') {
        return { ok: false, attempts: 0, reason: 'noSender', error: new Error('deps.send 未提供') };
    }

    let attempt = 0;

    // 迴圈次數 = 首次送出 + 階梯長度;不靠 while(true) 收斂,避免判斷寫錯就無限打 API
    for (;;) {
        try {
            const result = await send(payload);
            onAttempt({ attempt, phase: 'succeeded' });
            return { ok: true, result, attempts: attempt + 1 };
        } catch (error) {
            const { retry, reason } = classifyFailure(error);

            if (!retry) {
                onAttempt({ attempt, phase: 'givenUp', reason, error });
                return { ok: false, error, attempts: attempt + 1, reason };
            }

            const delayMs = nextDelayMs(error, attempt, delays);
            if (delayMs <= 0 || isCancelled()) {
                const finalReason = isCancelled() ? 'cancelled' : reason;
                onAttempt({ attempt, phase: 'givenUp', reason: finalReason, error });
                return { ok: false, error, attempts: attempt + 1, reason: finalReason };
            }

            onAttempt({ attempt, phase: 'retrying', reason, delayMs, error });
            await sleep(delayMs);

            if (isCancelled()) {
                onAttempt({ attempt, phase: 'givenUp', reason: 'cancelled', error });
                return { ok: false, error, attempts: attempt + 1, reason: 'cancelled' };
            }

            attempt += 1;
        }
    }
}
