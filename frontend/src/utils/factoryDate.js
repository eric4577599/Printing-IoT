/**
 * 工廠日工具(S3 / F7)
 *
 * 規則見 docs/spec20260903-s3-v1.md §5.2,與後端 FactoryDayCalculator 是同一份規則的兩處實作:
 * ProductionDate =(完工時間換算工廠時區後的當地日期)−(當地小時 < 日界 ? 1 天 : 0 天)。
 *
 * 舊寫法 `new Date().toISOString().split('T')[0]` 取的是 UTC 日期,
 * 台北 00:00–08:00 完工的大夜班工單會落在前一個 UTC 日,與現場認知的工廠日不一致。
 */

/** 工廠日界的預設值(每日 08:00 換日)。 */
export const DEFAULT_DAY_BOUNDARY_HOUR = 8;

/** 工廠時區的預設值。 */
export const DEFAULT_TIME_ZONE = 'Asia/Taipei';

/**
 * 取得指定時區下的日期與小時
 * @param {Date} date - 已確認合法的 Date 物件
 * @param {string} timeZone - IANA 時區 id
 * @returns {{ year: number, month: number, day: number, hour: number }} 該時區的當地年月日與小時
 * @description 用 Intl.DateTimeFormat('en-CA') 取得 YYYY-MM-DD 與 h23 小時,
 *              避免依賴瀏覽器本機時區;時區不被支援時由呼叫端捕捉 RangeError。
 */
function getZonedParts(date, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
    };
}

/**
 * 把年月日組成 YYYY-MM-DD,可同時位移天數
 * @param {{ year: number, month: number, day: number }} parts - 當地年月日
 * @param {number} offsetDays - 位移天數(-1 表示前一日)
 * @returns {string} YYYY-MM-DD
 * @description 以 Date.UTC 做日曆運算(純日期不涉時區),再自行補零輸出,避免再繞一次 toISOString。
 */
function toDateString(parts, offsetDays = 0) {
    const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays));
    const y = utc.getUTCFullYear();
    const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
    const d = String(utc.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * 將完工時間換算為工廠日
 * @param {string|number|Date} completedAt - 完工時間(ISO 字串、時間戳或 Date)
 * @param {{ dayBoundaryHour?: number, timeZone?: string }} options - 工廠日界與時區,
 *                                                    由 getFactoryTimeSettings() 取得,取不到時用預設值
 * @returns {string} 工廠日 YYYY-MM-DD
 * @description 換算成工廠時區當地時間後,當地小時小於日界就取前一日,否則取當地日曆日。
 *              completedAt 非法或 timeZone 不被支援時退回 Asia/Taipei 規則並 console.warn,不拋例外。
 */
export function resolveFactoryDate(completedAt, options = {}) {
    const { dayBoundaryHour = DEFAULT_DAY_BOUNDARY_HOUR, timeZone = DEFAULT_TIME_ZONE } = options || {};

    // 日界超出 0–23 視為 0(等同不調整),與後端 FactoryDayCalculator 一致
    let boundary = Number(dayBoundaryHour);
    if (!Number.isInteger(boundary) || boundary < 0 || boundary > 23) {
        console.warn(`[factoryDate] 日界 ${dayBoundaryHour} 超出 0–23,改用 0(等同不調整)`);
        boundary = 0;
    }

    let date = completedAt instanceof Date ? completedAt : new Date(completedAt);
    if (Number.isNaN(date.getTime())) {
        console.warn('[factoryDate] 完工時間無法解析,改用現在時間', completedAt);
        date = new Date();
    }

    let parts;
    try {
        parts = getZonedParts(date, timeZone);
    } catch {
        console.warn(`[factoryDate] 時區 ${timeZone} 不被支援,退回 ${DEFAULT_TIME_ZONE}`);
        parts = getZonedParts(date, DEFAULT_TIME_ZONE);
    }

    return toDateString(parts, parts.hour < boundary ? -1 : 0);
}
