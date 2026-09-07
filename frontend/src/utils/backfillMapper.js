import { resolveFactoryDate } from './factoryDate';
import { durationToMinutes } from './reportUtils';
import { isGuid } from './orderMapper';

/**
 * 本機舊實績回填後端的對映層(S10 / handoff Next Step 9)
 *
 * 這一層只做「一筆本機紀錄 → 一個後端請求」的純轉換,不碰網路也不碰 localStorage,
 * 因此每一條轉換規則都可以單獨測。
 *
 * 設計上最重要的一件事:**任何有損的轉換都必須回報,不得靜默**。
 * 回填是一次性的動作,靜默截斷的欄位事後沒有人會發現 ——
 * 使用者只會在幾個月後看到一筆數字對不起來的舊單,而且再也查不出原因。
 * 因此每筆轉換都回傳 issues 陣列,由呼叫端彙總後顯示在畫面上。
 */

// 對齊後端 ProductionService.Validate 的長度上限,超過就截斷並回報
const MAX_CLIENT_RECORD_ID = 64;
const MAX_ORDER_NUMBER = 50;
const MAX_DEVICE_ID = 50;
const MAX_OPERATOR = 100;
const MAX_SHIFT = 20;
const MAX_SHORTAGE_REASON = 100;
const MAX_REASON_CODE = 20;
const MAX_REASON_NAME = 100;
const MAX_DETAIL_ROWS = 200;

/**
 * 取得一筆本機紀錄的冪等鍵
 * @param {Object} record - localStorage.productionHistory 內的一筆
 * @returns {string} 冪等鍵;取不到時回空字串(該筆無法回填)
 * @description 與 completionMapper 的 localClientRecordId 規則一致 ——
 *              兩邊若不同,合併呈現與回填就會對不上同一筆。
 */
export function backfillKey(record) {
    if (!record || typeof record !== 'object') return '';
    if (typeof record.clientRecordId === 'string' && record.clientRecordId !== '') return record.clientRecordId;
    if (record.clientRecordId != null && record.clientRecordId !== '') return String(record.clientRecordId);
    if (record.id != null && record.id !== '') return String(record.id);
    return '';
}

/**
 * 截斷字串到指定長度
 * @param {*} value - 原值
 * @param {number} max - 上限
 * @param {string} field - 欄位名(供回報)
 * @param {Array} issues - 有損轉換的收集陣列,會被就地追加
 * @returns {string} 截斷後的字串
 */
function truncate(value, max, field, issues) {
    const s = value == null ? '' : String(value);
    if (s.length <= max) return s;
    issues.push({ kind: 'truncated', field, from: s.length, to: max });
    return s.slice(0, max);
}

/**
 * 把可能為負或非數值的輸入夾成 >= 0
 * @param {*} value - 原值
 * @param {string} field - 欄位名(供回報)
 * @param {Array} issues - 有損轉換的收集陣列
 * @returns {number} 夾到 0 以上的數字
 * @description 後端對負值直接回 400,舊資料若有負值會整筆被擋。
 *              夾到 0 讓那筆進得去,但**必須回報** —— 靜默改數字比擋下來更糟。
 */
function clampNonNegative(value, field, issues) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
        if (value != null && value !== '') issues.push({ kind: 'notANumber', field, value });
        return 0;
    }
    if (n < 0) {
        issues.push({ kind: 'negativeClamped', field, value: n });
        return 0;
    }
    return n;
}

/**
 * 把停機時長轉成分鐘,容忍舊資料的多種形狀
 * @param {*} duration - "MM:SS" 字串、純數字(分鐘)、或數字字串
 * @param {Array} issues - 有損轉換的收集陣列
 * @returns {number} 分鐘數
 * @description `reportUtils.durationToMinutes` 只吃 "MM:SS" 字串,**其餘一律回 0**。
 *              舊紀錄若把時長存成數字,直接套用會讓停機時間靜默歸零 ——
 *              停機分鐘是稼動率的分母成分,歸零會讓那筆的稼動率虛高。
 *              因此這裡明確處理三種形狀,認不得的形狀回 0 但**回報**。
 */
export function stopDurationToMinutes(duration, issues = []) {
    if (duration == null || duration === '') return 0;

    if (typeof duration === 'number') {
        return Number.isFinite(duration) && duration > 0 ? duration : 0;
    }

    const s = String(duration);
    if (s.includes(':')) return durationToMinutes(s);

    const n = Number(s);
    if (Number.isFinite(n)) return n > 0 ? n : 0;

    issues.push({ kind: 'unparsableDuration', field: 'stop.duration', value: s });
    return 0;
}

/**
 * 反解出「會被後端判回指定工廠日」的完工時間
 * @param {string} factoryDate - 目標工廠日 YYYY-MM-DD
 * @param {Object} settings - { timeZone, dayBoundaryHour }
 * @returns {string|null} ISO 時間字串;反解失敗回 null
 * @description **這是本模組最容易出錯的一段,所以用「反解 + 驗證」而不是算時差。**
 *
 *              後端會拿 completedAt 重新推算工廠日。舊紀錄若只有 date 沒有 finishedAt,
 *              直接送 `date + T00:00` 會被日界(預設 08:00)判成**前一天** —— 整批舊單
 *              集體位移一天,而且沒有任何地方會出錯示警。
 *
 *              作法:以工廠日界當鐘面時刻造候選時間,逐一用 resolveFactoryDate 回推,
 *              **只回傳「確實會還原成目標工廠日」的那個**。判準就是不變量本身,
 *              不是我對時區算術的信心。搜尋範圍 UTC−14 ~ +14 涵蓋所有現存時區。
 */
export function completedAtForFactoryDate(factoryDate, settings = {}) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(factoryDate || ''))) return null;

    const boundary = Number(settings.dayBoundaryHour);
    const hour = Number.isInteger(boundary) && boundary >= 0 && boundary <= 23 ? boundary : 0;
    const hh = String(hour).padStart(2, '0');

    const base = Date.parse(`${factoryDate}T${hh}:30:00Z`);
    if (Number.isNaN(base)) return null;

    for (let offset = -14; offset <= 14; offset++) {
        const candidate = new Date(base - offset * 3600 * 1000);
        if (resolveFactoryDate(candidate, settings) === factoryDate) {
            return candidate.toISOString();
        }
    }
    return null;
}

/**
 * 決定一筆紀錄要送給後端的完工時間
 * @param {Object} record - 本機紀錄
 * @param {Object} settings - 工廠時區設定
 * @param {Array} issues - 有損轉換的收集陣列
 * @returns {string|null} ISO 時間字串;無法決定時回 null(該筆無法回填)
 * @description 優先用 finishedAt(真實時間戳);沒有就從工廠日反解一個安全時刻,
 *              並標記 approximatedTime —— 那筆的「幾點完工」是我們補的,不是現場的。
 */
export function resolveCompletedAt(record, settings, issues) {
    const finishedAt = record?.finishedAt;
    if (finishedAt) {
        const t = Date.parse(finishedAt);
        if (!Number.isNaN(t)) return new Date(t).toISOString();
        issues.push({ kind: 'unparsableFinishedAt', field: 'finishedAt', value: finishedAt });
    }

    const iso = completedAtForFactoryDate(record?.date, settings);
    if (iso) {
        issues.push({ kind: 'approximatedTime', field: 'completedAt', value: record.date });
        return iso;
    }
    return null;
}

/**
 * 把一筆本機紀錄轉成後端的完工實績請求
 * @param {Object} record - localStorage.productionHistory 內的一筆
 * @param {Object} settings - { timeZone, dayBoundaryHour }
 * @returns {{ request: Object|null, key: string, issues: Array, blocked: string|null }}
 *          request 為 null 時表示這筆無法回填,原因在 blocked。
 * @description 邏輯:先取冪等鍵(取不到就不可回填)→ 決定完工時間 → 逐欄位轉換並收集有損項。
 *              明細筆數超過後端上限時**不截斷**而是擋下 —— 截掉不良明細會讓後端重算出
 *              偏低的不良數,那是靜默竄改實績,寧可讓人工處理。
 */
export function toCompletionRequest(record, settings = {}) {
    const issues = [];
    const key = backfillKey(record);

    if (!key) {
        return { request: null, key: '', issues, blocked: '沒有可用的紀錄編號(id 與 clientRecordId 皆為空)' };
    }
    if (key.length > MAX_CLIENT_RECORD_ID) {
        // 冪等鍵不能截斷 —— 截了就不是同一筆了,重跑會長出第二列
        return { request: null, key, issues, blocked: `紀錄編號長度 ${key.length} 超過 64 字元,截斷會破壞冪等` };
    }

    const completedAt = resolveCompletedAt(record, settings, issues);
    if (!completedAt) {
        return { request: null, key, issues, blocked: '無法決定完工時間(finishedAt 與 date 皆不可用)' };
    }

    const defects = Array.isArray(record.defects) ? record.defects : [];
    const stops = Array.isArray(record.stopReasons) ? record.stopReasons : [];

    if (defects.length > MAX_DETAIL_ROWS) {
        return { request: null, key, issues, blocked: `不良明細 ${defects.length} 筆超過上限 200,截斷會讓後端算出偏低的不良數` };
    }
    if (stops.length > MAX_DETAIL_ROWS) {
        return { request: null, key, issues, blocked: `停機明細 ${stops.length} 筆超過上限 200,截斷會讓後端算出偏低的停機次數` };
    }

    // 工單關聯:後端要 GUID。舊紀錄的 orderId 多半是本機的數字 id,接不回去。
    // 送 null 並保留 orderNumber 文字 —— 實績仍然查得到是哪一張單,只是點不進工單。
    const orderId = isGuid(record.orderId) ? record.orderId : null;
    if (record.orderId != null && record.orderId !== '' && !orderId) {
        issues.push({ kind: 'orderLinkLost', field: 'orderId', value: String(record.orderId) });
    }

    const request = {
        clientRecordId: key,
        orderId,
        orderNumber: truncate(record.orderNo === '-' ? '' : record.orderNo, MAX_ORDER_NUMBER, 'orderNumber', issues),
        deviceId: truncate(record.deviceId, MAX_DEVICE_ID, 'deviceId', issues),
        operator: truncate(record.operator, MAX_OPERATOR, 'operator', issues),
        shift: truncate(record.shift, MAX_SHIFT, 'shift', issues),
        targetQty: Math.round(clampNonNegative(record.targetQty, 'targetQty', issues)),
        goodQty: Math.round(clampNonNegative(record.goodQty, 'goodQty', issues)),
        prepTimeMinutes: clampNonNegative(record.prepTime, 'prepTime', issues),
        runTimeMinutes: clampNonNegative(record.runTime, 'runTime', issues),
        stopTimeMinutes: clampNonNegative(record.stopTime, 'stopTime', issues),
        avgSpeed: clampNonNegative(record.avgSpeed, 'avgSpeed', issues),
        shortageReason: truncate(record.shortageReason, MAX_SHORTAGE_REASON, 'shortageReason', issues),
        completedAt,
        // 後端會由 defects 重算 defectQty、由 stops 重算 stopCount,
        // 所以這裡不送那兩個彙總欄位 —— 送了也會被忽略,還會讓人以為前端說了算
        defects: defects.map(d => ({
            code: truncate(d?.code, MAX_REASON_CODE, 'defect.code', issues),
            reason: truncate(d?.reason, MAX_REASON_NAME, 'defect.reason', issues),
            qty: Math.round(clampNonNegative(d?.qty, 'defect.qty', issues)),
        })),
        stops: stops.map(s => ({
            code: truncate(s?.code, MAX_REASON_CODE, 'stop.code', issues),
            reason: truncate(s?.reason, MAX_REASON_NAME, 'stop.reason', issues),
            startedAt: s?.startedAtIso || null,
            durationMinutes: clampNonNegative(stopDurationToMinutes(s?.duration, issues), 'stop.duration', issues),
        })),
    };

    return { request, key, issues, blocked: null };
}

/**
 * 把本機紀錄分成「後端已有」「待回填」「無法回填」三堆
 * @param {Array} localRecords - localStorage 讀出的原始紀錄
 * @param {Set<string>} backendKeys - 後端已存在的 clientRecordId 集合
 * @param {Object} settings - 工廠時區設定
 * @returns {{ alreadySynced: Array, pending: Array, blocked: Array, duplicateKeys: Array }}
 * @description pending 的每一項是 { record, request, key, issues }。
 *              duplicateKeys 是本機自己出現重複鍵的那些 —— 只留先出現者,
 *              其餘列出來讓人知道有幾筆被跳過(與 mergeCompletionRecords 的處理一致)。
 */
export function classifyForBackfill(localRecords, backendKeys, settings = {}) {
    const list = Array.isArray(localRecords) ? localRecords.filter(Boolean) : [];
    const known = backendKeys instanceof Set ? backendKeys : new Set(backendKeys || []);

    const alreadySynced = [];
    const pending = [];
    const blocked = [];
    const duplicateKeys = [];
    const seen = new Set();

    list.forEach(record => {
        const converted = toCompletionRequest(record, settings);

        if (converted.blocked) {
            blocked.push({ record, key: converted.key, reason: converted.blocked, issues: converted.issues });
            return;
        }
        if (known.has(converted.key)) {
            alreadySynced.push({ record, key: converted.key });
            return;
        }
        if (seen.has(converted.key)) {
            duplicateKeys.push({ record, key: converted.key });
            return;
        }
        seen.add(converted.key);
        pending.push({ record, request: converted.request, key: converted.key, issues: converted.issues });
    });

    return { alreadySynced, pending, blocked, duplicateKeys };
}

/**
 * 彙總一批轉換的有損項,供畫面顯示
 * @param {Array} items - classifyForBackfill 回傳的 pending 陣列
 * @returns {Object} 以 issue kind 為 key 的筆數統計
 */
export function summariseIssues(items) {
    const counts = {};
    (items || []).forEach(item => {
        const kinds = new Set((item.issues || []).map(i => i.kind));
        kinds.forEach(kind => { counts[kind] = (counts[kind] || 0) + 1; });
    });
    return counts;
}
