// 定時寫入間隔的判準(S15)。
//
// 為什麼獨立成模組:這些是純規則,不是元件;放在元件檔裡除了讓 react-refresh 抱怨,
// 也讓「前端判準」變得不好被測試與引用。判準本身才是這次的交付。

/**
 * 定時寫入間隔的有效範圍(秒)。
 * 與後端 SignalMappingProvider 的判準一致 —— 它把 <=0 或 >3600 一律換成預設 300,
 * 而且是**靜默**換掉。前端沿用同一組數字,才不會出現「畫面說 A、機器跑 B」。
 */
export const DATA_LOG_INTERVAL_MIN = 1;
export const DATA_LOG_INTERVAL_MAX = 3600;
export const DATA_LOG_INTERVAL_DEFAULT = 300;

/**
 * 秒數換成人看得懂的說法
 * @param {number} seconds - 秒
 * @returns {string} 例如 300 → "5 分 0 秒";未滿一分鐘回空字串(呼叫端自行判斷不顯示)
 */
export function describeSeconds(seconds) {
    const n = Number(seconds);
    if (!Number.isFinite(n) || n < 60) return '';
    return `${Math.floor(n / 60)} 分 ${n % 60} 秒`;
}

/**
 * 把使用者輸入的字串收斂成可送出的秒數
 * @param {string|number} raw - 輸入框的原始值
 * @returns {{ ok: boolean, seconds: number }}
 *          ok = false 代表空白 / 非數字 / 超出範圍,呼叫端應維持原值不送出
 * @description 只接受整數秒。小數在這個語意下沒有意義,而且後端讀的是 int。
 */
export function parseLogInterval(raw) {
    const n = Number(String(raw).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, seconds: NaN };
    if (n < DATA_LOG_INTERVAL_MIN || n > DATA_LOG_INTERVAL_MAX) return { ok: false, seconds: n };
    return { ok: true, seconds: n };
}
