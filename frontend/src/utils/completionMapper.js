// S4 / F1:完工實績 DTO <-> 報表記錄形狀的對映層(純函式,便於單元測試)。
//
// 分工與 SSOT(見 docs/spec20260905-s4-v1.md 決策 4):
//  - 「單筆率值」(oee / availabilityRate / performanceRate / qualityRate)的真相在後端
//    PrintingIoT.Core.Services.OeeCalculator —— 後端列一律原樣採用,絕不重算;
//  - 「彙總」(日報 / 月報 / 停機原因 / 加權平均 OEE)的真相在前端 reportUtils —— 後端無對應端點;
//  - 本機快取列(後端沒有的舊資料)的單筆率值,以 reportUtils.calculateOEE 重算,
//    讓合併後的同一張表口徑一致(不混入 S3 之前的舊公式殘值)。

import { calculateOEE } from './reportUtils';

/**
 * 把分鐘數格式化成 reportUtils.durationToMinutes 認得的 "MM:SS" 字串
 * @param {number} minutes - 停機時長(分鐘,可含小數)
 * @returns {string} "MM:SS";分不封頂(125.5 → '125:30'),秒進位到 60 時改為 mm+1 與 '00'
 * @description 三個檢視元件與明細下表都直接顯示這個字串,且 durationToMinutes 只解析 "MM:SS";
 *              若塞入數字會讓停機彙總全變零而不拋例外(靜默錯誤),故必須在此轉成字串。
 */
export function formatDurationMMSS(minutes) {
    const n = Number(minutes);
    const safe = Number.isFinite(n) && n > 0 ? n : 0;
    let mm = Math.floor(safe);
    let ss = Math.round((safe - mm) * 60);
    if (ss >= 60) {
        mm += 1;
        ss = 0;
    }
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * 把 ISO 時間字串格式化成本地時區的 HH:mm:ss
 * @param {string|null|undefined} iso - ISO 時間字串;後端既有停機明細的 startedAt 目前皆為 null
 * @returns {string} 'HH:mm:ss',無值或無法解析時回 '-'(不得回 'Invalid Date' 或 undefined)
 * @description 對齊 Dashboard 現場產生的 toLocaleTimeString('en-GB', { hour12: false })。
 */
export function formatClockTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-GB', { hour12: false });
}

/**
 * 取日期字串的前 10 碼(YYYY-MM-DD)
 * @param {string|null|undefined} value - 日期字串,可能是 'YYYY-MM-DD' 或帶時間的 ISO 字串
 * @returns {string} 'YYYY-MM-DD';無值回空字串
 * @description 後端 DateOnly 正常序列化為 'YYYY-MM-DD',但若 JSON 設定變動而帶上時間,
 *              直接使用會讓 filterByDateRange / groupByDate 破功,故一律截前 10 碼。
 */
export function toDateOnly(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
}

/**
 * 把數值欄位轉成安全的數字
 * @param {*} value - 任意來源值(後端 decimal 可能序列化成字串)
 * @returns {number} 有限數字;無法轉換時回 0
 */
function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/**
 * 取一筆記錄可用的去重鍵
 * @param {Object} record - 本機快取記錄(含 id 或 clientRecordId)
 * @returns {string} 冪等鍵字串;無法取得時回空字串(空字串不參與去重)
 * @description S3 已把 clientRecordId 定義為 String(productionRecord.id),
 *              本機列補上同一個值,合併時才對得上後端列。
 */
function localClientRecordId(record) {
    if (typeof record.clientRecordId === 'string' && record.clientRecordId !== '') return record.clientRecordId;
    if (record.clientRecordId != null && record.clientRecordId !== '') return String(record.clientRecordId);
    if (record.id != null && record.id !== '') return String(record.id);
    return '';
}

/**
 * 把後端停機明細對映成報表記錄的 stopReasons 項
 * @param {Array} stops - dto.stops
 * @returns {Array} [{ code, reason, duration, durationMinutes, time }]
 * @description duration 轉成 "MM:SS" 字串讓 reportUtils 與三個檢視元件零改動;
 *              同時保留原始數值 durationMinutes 供未來精算用(現行檢視不消費)。
 *              time 取 startedAt;既有資料 startedAt 皆為 null,顯示 '-'(S4 F6 只修往後的新資料)。
 */
function mapStops(stops) {
    if (!Array.isArray(stops)) return [];
    return stops.map(stop => ({
        code: stop?.code || '',
        reason: stop?.reason || '未分類',
        duration: formatDurationMMSS(stop?.durationMinutes),
        durationMinutes: num(stop?.durationMinutes),
        time: formatClockTime(stop?.startedAt),
    }));
}

/**
 * 把一筆完工實績 DTO 對映成報表記錄形狀
 * @param {Object} dto - ProductionCompletionDto(GET /api/production/completions 的元素)
 * @param {Object} [enrich] - 補欄位 { customer, productName },由本機快取依 clientRecordId 反查而來
 * @returns {Object} 報表記錄物件,source 恆為 'backend'
 * @description 後端實體沒有 customer / productName(刻意不對 Order 建導覽屬性),
 *              故這兩欄由 enrich 補;查不到一律 '-',不猜。
 *
 *              ⚠ 四個率值一律原樣採用後端回傳值,不得在此重算 —— 後端 OeeCalculator 是單筆率值的 SSOT
 *              (docs/spec20260905-s4-v1.md 決策 4,由 AC-S4-19 釘住)。
 */
export function mapCompletionToRecord(dto, enrich) {
    const source = dto || {};
    const extra = enrich || {};

    return {
        id: source.id,
        backendId: source.id,
        clientRecordId: source.clientRecordId || '',
        orderId: source.orderId ?? null,
        orderNo: source.orderNumber || '-',
        customer: extra.customer || '-',
        productName: extra.productName || '-',
        operator: source.operator,
        shift: source.shift,
        targetQty: source.targetQty,
        goodQty: source.goodQty,
        defectQty: source.defectQty,
        prepTime: num(source.prepTimeMinutes),
        runTime: num(source.runTimeMinutes),
        stopTime: num(source.stopTimeMinutes),
        stopCount: source.stopCount,
        avgSpeed: num(source.avgSpeed),
        // 以下四欄為後端權威值,不重算
        availabilityRate: num(source.availabilityRate),
        performanceRate: num(source.performanceRate),
        qualityRate: num(source.qualityRate),
        oee: num(source.oee),
        shortageReason: source.shortageReason,
        date: toDateOnly(source.productionDate),
        finishedAt: source.completedAt,
        defects: Array.isArray(source.defects)
            ? source.defects.map(d => ({ code: d?.code || '', reason: d?.reason || '', qty: d?.qty ?? 0 }))
            : [],
        stopReasons: mapStops(source.stops),
        source: 'backend',
        syncState: 'synced',
    };
}

/**
 * 把一筆本機快取記錄正規化成與後端列同一個形狀
 * @param {Object} record - localStorage.productionHistory 內的 productionRecord
 * @returns {Object|null} 報表記錄物件(source: 'local');date 與 finishedAt 皆缺時回 null(視為不可用)
 * @description 既有欄位原樣保留(本機列的形狀本來就是目標形狀),另做三件事:
 *              1. 以 reportUtils.calculateOEE 重算並覆寫四個率值 —— S3 之前的舊紀錄是舊公式算的,
 *                 不重算會讓同一張表出現兩種口徑而誤導判讀;
 *              2. 補 clientRecordId = String(id),讓與後端列的去重對得上;
 *              3. date 缺失時以 finishedAt 前 10 碼補。
 */
export function normalizeLocalRecord(record) {
    if (!record || typeof record !== 'object') return null;

    const date = toDateOnly(record.date) || toDateOnly(record.finishedAt);
    if (!date) return null;

    const rates = calculateOEE({
        runTime: record.runTime,
        stopTime: record.stopTime,
        prepTime: record.prepTime,
        goodQty: record.goodQty,
        defectQty: record.defectQty,
        targetQty: record.targetQty,
    });

    return {
        ...record,
        date,
        clientRecordId: localClientRecordId(record),
        availabilityRate: rates.availability,
        performanceRate: rates.performance,
        qualityRate: rates.quality,
        oee: rates.oee,
        source: 'local',
    };
}

/**
 * 以本機快取列建立 customer / productName 的補欄位索引
 * @param {Array} localRecords - 已正規化的本機列
 * @returns {Map<string, { customer: string, productName: string }>} 以 clientRecordId 為鍵
 * @description 後端沒有這兩欄(S4 §1.4);對「這台機器產生過的單」100% 命中,
 *              換機器或本機快取超過 1000 筆被截斷時查不到,由對映層誠實顯示 '-'。
 */
export function buildEnrichMap(localRecords) {
    const map = new Map();
    if (!Array.isArray(localRecords)) return map;

    localRecords.forEach(record => {
        const key = localClientRecordId(record);
        if (!key || map.has(key)) return;
        map.set(key, {
            customer: record.customer,
            productName: record.productName || record.product,
        });
    });
    return map;
}

/**
 * 合併後端列與本機列,以 clientRecordId 去重(後端勝出)
 * @param {Array} backendRecords - 已對映的後端列
 * @param {Array} localRecords - 已正規化的本機列
 * @returns {{ records: Array, localOnlyCount: number }}
 *          records 依 date 遞減、再 finishedAt 遞減排序;localOnlyCount 為僅存在本機的筆數
 * @description 本輪不做資料回填遷移,後端只有切換後的新完工;若只讀後端,S3 之前的歷史資料
 *              會整片消失。合併能讓舊單看得到,又以 source 分得清來源。
 *
 *              clientRecordId 為空的本機列不參與去重、一律保留 —— 寧可重複顯示,不可讓一筆單消失。
 */
export function mergeCompletionRecords(backendRecords, localRecords) {
    const backend = (Array.isArray(backendRecords) ? backendRecords : []).filter(Boolean);
    const local = (Array.isArray(localRecords) ? localRecords : []).filter(Boolean);

    const backendKeys = new Set();
    backend.forEach(row => {
        const key = row.clientRecordId;
        if (key) backendKeys.add(String(key));
    });

    const seenLocalKeys = new Set();
    const localOnly = [];
    local.forEach(row => {
        const key = localClientRecordId(row);
        if (key) {
            // 後端已有同一筆 → 捨棄本機那份(後端的率值與工廠日才是權威)
            if (backendKeys.has(key)) return;
            // 同一鍵在本機重複出現(理論上不該發生)→ 只留先出現者
            if (seenLocalKeys.has(key)) return;
            seenLocalKeys.add(key);
        }
        localOnly.push({ ...row, source: 'local' });
    });

    const records = [...backend.map(row => ({ ...row, source: row.source || 'backend' })), ...localOnly];

    // 對齊後端排序(ProductionDate 遞減、再 CompletedAt 遞減),讓合併前後視覺順序一致
    records.sort((a, b) => {
        const dateDiff = String(b.date || '').localeCompare(String(a.date || ''));
        if (dateDiff !== 0) return dateDiff;
        return String(b.finishedAt || '').localeCompare(String(a.finishedAt || ''));
    });

    return { records, localOnlyCount: localOnly.length };
}
