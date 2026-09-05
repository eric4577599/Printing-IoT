import { describe, it, expect } from 'vitest';
import {
    mapCompletionToRecord,
    normalizeLocalRecord,
    mergeCompletionRecords,
    buildEnrichMap,
    formatDurationMMSS,
} from '../../utils/completionMapper';
import * as reportUtils from '../../utils/reportUtils';
import { durationToMinutes, groupStopReasonsByReason, calculateOEE } from '../../utils/reportUtils';

/**
 * S4 / F1 對映層測試(AC-S4-16 ~ AC-S4-25、AC-S4-32、E-06 ~ E-13)。
 *
 * 這一層是「後端實績 → 報表記錄形狀」的唯一入口,錯了會讓三個檢視元件靜默算錯
 * (尤其是 duration 沒轉成 "MM:SS" 時,停機彙總會全變零而不拋例外)。
 */

/** 造一筆完整的後端 DTO,便於各測試只覆寫關心的欄位。 */
const makeDto = (over = {}) => ({
    id: '11111111-1111-1111-1111-111111111111',
    clientRecordId: '1001',
    orderId: '22222222-2222-2222-2222-222222222222',
    orderNumber: 'A-001',
    deviceId: 'DEV-1',
    operator: '阿明',
    shift: 'A',
    targetQty: 1000,
    goodQty: 900,
    defectQty: 100,
    prepTimeMinutes: 20,
    runTimeMinutes: 90,
    stopTimeMinutes: 30,
    stopCount: 2,
    avgSpeed: 120,
    availabilityRate: 90,
    performanceRate: 90,
    qualityRate: 90,
    oee: 72.9,
    shortageReason: '',
    completedAt: '2026-09-10T06:30:00Z',
    productionDate: '2026-09-10',
    createdAt: '2026-09-10T06:31:00Z',
    defects: [{ id: 1, code: 'D1', reason: '壓痕', qty: 100 }],
    stops: [{ id: 1, code: 'S1', reason: '換版', startedAt: null, durationMinutes: 3.5 }],
    ...over,
});

/** 造一筆本機快取記錄(S3 之前的形狀)。 */
const makeLocal = (over = {}) => ({
    id: 900,
    orderNo: 'B-900',
    customer: '老客戶',
    productName: '五層箱',
    operator: '阿華',
    shift: 'B',
    targetQty: 1000,
    goodQty: 900,
    defectQty: 100,
    prepTime: 20,
    runTime: 90,
    stopTime: 30,
    stopCount: 1,
    avgSpeed: 110,
    oee: 99,
    date: '2026-09-09',
    finishedAt: '2026-09-09T10:00:00Z',
    stopReasons: [{ code: 'S1', reason: '換版', duration: '02:00', time: '10:00:00' }],
    ...over,
});

describe('mapCompletionToRecord 欄位對映(AC-S4-21)', () => {
    it('逐欄對應到 DTO 的正確來源欄位', () => {
        const r = mapCompletionToRecord(makeDto());

        expect(r.id).toBe('11111111-1111-1111-1111-111111111111');
        expect(r.backendId).toBe('11111111-1111-1111-1111-111111111111');
        expect(r.clientRecordId).toBe('1001');
        expect(r.orderNo).toBe('A-001');
        expect(r.date).toBe('2026-09-10');
        expect(r.finishedAt).toBe('2026-09-10T06:30:00Z');
        expect(r.runTime).toBe(90);
        expect(r.stopTime).toBe(30);
        expect(r.prepTime).toBe(20);
        expect(r.stopCount).toBe(2);
        expect(r.avgSpeed).toBe(120);
        expect(r.targetQty).toBe(1000);
        expect(r.goodQty).toBe(900);
        expect(r.defectQty).toBe(100);
        expect(r.defects).toEqual([{ code: 'D1', reason: '壓痕', qty: 100 }]);
        expect(r.source).toBe('backend');
        expect(r.syncState).toBe('synced');
    });

    it('orderNumber 為空字串時顯示 "-"(E-09)', () => {
        expect(mapCompletionToRecord(makeDto({ orderNumber: '' })).orderNo).toBe('-');
    });

    it('productionDate 帶時間時只取前 10 碼(E-18)', () => {
        expect(mapCompletionToRecord(makeDto({ productionDate: '2026-09-10T00:00:00' })).date).toBe('2026-09-10');
    });
});

describe('停機明細對映(AC-S4-22、AC-S4-23、E-06 ~ E-08)', () => {
    it('durationMinutes 3.5 → "03:30",且 durationToMinutes 往返一致', () => {
        const r = mapCompletionToRecord(makeDto());
        expect(r.stopReasons[0].duration).toBe('03:30');
        expect(durationToMinutes('03:30')).toBe(3.5);
        expect(r.stopReasons[0].durationMinutes).toBe(3.5);
    });

    it('startedAt 為 null → time 為 "-",不得是 Invalid Date 或 undefined', () => {
        const r = mapCompletionToRecord(makeDto());
        expect(r.stopReasons[0].time).toBe('-');
    });

    it('startedAt 有值 → time 為本地 HH:mm:ss', () => {
        const iso = '2026-09-10T06:30:05Z';
        const r = mapCompletionToRecord(makeDto({
            stops: [{ code: 'S1', reason: '換版', startedAt: iso, durationMinutes: 1 }],
        }));
        expect(r.stopReasons[0].time).toBe(new Date(iso).toLocaleTimeString('en-GB', { hour12: false }));
        expect(r.stopReasons[0].time).not.toContain('Invalid');
    });

    it('durationMinutes 為 0 → "00:00" 且解析回 0(E-06)', () => {
        expect(formatDurationMMSS(0)).toBe('00:00');
        expect(durationToMinutes('00:00')).toBe(0);
    });

    it('durationMinutes >= 60 時分不封頂(E-07)', () => {
        expect(formatDurationMMSS(125.5)).toBe('125:30');
        expect(durationToMinutes('125:30')).toBe(125.5);
    });

    it('秒數四捨五入到 60 時進位成 mm+1 與 "00"(E-08)', () => {
        // 3.999 分 → 59.94 秒 → 四捨五入 60 → 必須是 '04:00',不得是 '03:60'
        expect(formatDurationMMSS(3.999)).toBe('04:00');
        expect(formatDurationMMSS(3.999)).not.toBe('03:60');
    });

    it('reason 為空時退為「未分類」,對齊 groupStopReasonsByReason 的既有預設', () => {
        const r = mapCompletionToRecord(makeDto({
            stops: [{ code: '', reason: '', startedAt: null, durationMinutes: 1 }],
        }));
        expect(r.stopReasons[0].reason).toBe('未分類');
    });
});

describe('對映結果與既有 reportUtils 的相容性(AC-S4-24)', () => {
    it('2 筆同原因、各 2 分鐘 → count 2、totalDuration 4', () => {
        const stop = { id: 1, code: 'S1', reason: '換版', startedAt: null, durationMinutes: 2 };
        const records = [
            mapCompletionToRecord(makeDto({ id: 'a', clientRecordId: 'a', stops: [stop] })),
            mapCompletionToRecord(makeDto({ id: 'b', clientRecordId: 'b', stops: [stop] })),
        ];

        const grouped = groupStopReasonsByReason(records);
        expect(grouped).toHaveLength(1);
        expect(grouped[0].reason).toBe('換版');
        expect(grouped[0].count).toBe(2);
        expect(grouped[0].totalDuration).toBe(4);
    });
});

describe('customer / productName 補欄位(AC-S4-25、F4.3)', () => {
    it('本機快取有對應 clientRecordId 時取快取值', () => {
        const local = [normalizeLocalRecord(makeLocal({ id: 1001, customer: '大客戶', productName: '三層箱' }))];
        const enrichMap = buildEnrichMap(local);
        const r = mapCompletionToRecord(makeDto({ clientRecordId: '1001' }), enrichMap.get('1001'));

        expect(r.customer).toBe('大客戶');
        expect(r.productName).toBe('三層箱');
    });

    it('查不到時為 "-",不是 undefined、不是空字串', () => {
        const enrichMap = buildEnrichMap([]);
        const r = mapCompletionToRecord(makeDto({ clientRecordId: '9999' }), enrichMap.get('9999'));

        expect(r.customer).toBe('-');
        expect(r.productName).toBe('-');
    });
});

describe('normalizeLocalRecord 率值重算(AC-S4-18)', () => {
    it('本機列的 oee 以現行公式重算並覆寫舊公式殘值', () => {
        const expected = calculateOEE({ runTime: 90, stopTime: 30, prepTime: 20, goodQty: 900, defectQty: 100, targetQty: 1000 });
        const n = normalizeLocalRecord(makeLocal({ oee: 99 }));

        expect(expected.oee).toBe(72.9);
        expect(n.oee).toBe(expected.oee);
        expect(n.oee).not.toBe(99);
        expect(n.availabilityRate).toBe(expected.availability);
        expect(n.performanceRate).toBe(expected.performance);
        expect(n.qualityRate).toBe(expected.quality);
        expect(n.source).toBe('local');
    });

    it('clientRecordId 補為 String(id),讓去重對得上', () => {
        expect(normalizeLocalRecord(makeLocal({ id: 1001 })).clientRecordId).toBe('1001');
    });

    it('date 缺失時以 finishedAt 前 10 碼補;兩者皆缺回 null', () => {
        expect(normalizeLocalRecord(makeLocal({ date: undefined })).date).toBe('2026-09-09');
        expect(normalizeLocalRecord(makeLocal({ date: undefined, finishedAt: undefined }))).toBeNull();
    });
});

describe('mergeCompletionRecords 去重與合併(AC-S4-16、AC-S4-19、E-10 ~ E-13)', () => {
    it('後端 1001 與本機 1001 / 900 → 2 筆,1001 取後端、900 為本機,localOnlyCount 1', () => {
        const backend = [mapCompletionToRecord(makeDto({ clientRecordId: '1001' }))];
        const local = [
            normalizeLocalRecord(makeLocal({ id: 1001, date: '2026-09-10' })),
            normalizeLocalRecord(makeLocal({ id: 900, date: '2026-09-09' })),
        ];

        const { records, localOnlyCount } = mergeCompletionRecords(backend, local);

        expect(records).toHaveLength(2);
        expect(records.find(r => r.clientRecordId === '1001').source).toBe('backend');
        expect(records.find(r => r.clientRecordId === '900').source).toBe('local');
        expect(localOnlyCount).toBe(1);
    });

    it('後端列的率值不被重算(AC-S4-19)', () => {
        // 刻意讓後端 oee 與 calculateOEE 由同組數字算出的 72.9 不同
        const backend = [mapCompletionToRecord(makeDto({ oee: 12.3, availabilityRate: 11.1 }))];
        const { records } = mergeCompletionRecords(backend, []);

        expect(calculateOEE({ runTime: 90, stopTime: 30, prepTime: 20, goodQty: 900, defectQty: 100, targetQty: 1000 }).oee).toBe(72.9);
        expect(records[0].oee).toBe(12.3);
        expect(records[0].availabilityRate).toBe(11.1);
    });

    it('本機 syncState=pending 但後端已有同鍵 → 後端勝出,不計入 localOnlyCount(E-10)', () => {
        const backend = [mapCompletionToRecord(makeDto({ clientRecordId: '1001' }))];
        const local = [normalizeLocalRecord(makeLocal({ id: 1001, syncState: 'pending' }))];

        const { records, localOnlyCount } = mergeCompletionRecords(backend, local);
        expect(records).toHaveLength(1);
        expect(records[0].source).toBe('backend');
        expect(localOnlyCount).toBe(0);
    });

    it('同一 clientRecordId 在本機出現兩次 → 只留先出現者(E-12)', () => {
        const local = [
            normalizeLocalRecord(makeLocal({ id: 900, orderNo: '先' })),
            normalizeLocalRecord(makeLocal({ id: 900, orderNo: '後' })),
        ];
        const { records, localOnlyCount } = mergeCompletionRecords([], local);

        expect(records).toHaveLength(1);
        expect(records[0].orderNo).toBe('先');
        expect(localOnlyCount).toBe(1);
    });

    it('clientRecordId 為空的本機列不參與去重,一律保留(E-13)', () => {
        const local = [
            { ...makeLocal({ id: '' }), clientRecordId: '', source: 'local' },
            { ...makeLocal({ id: '' }), clientRecordId: '', source: 'local' },
        ];
        const { records, localOnlyCount } = mergeCompletionRecords([], local);

        expect(records).toHaveLength(2);
        expect(localOnlyCount).toBe(2);
    });

    it('結果依 date 遞減、再 finishedAt 遞減排序', () => {
        const backend = [
            mapCompletionToRecord(makeDto({ clientRecordId: 'x1', productionDate: '2026-09-08', completedAt: '2026-09-08T01:00:00Z' })),
            mapCompletionToRecord(makeDto({ clientRecordId: 'x2', productionDate: '2026-09-10', completedAt: '2026-09-10T01:00:00Z' })),
            mapCompletionToRecord(makeDto({ clientRecordId: 'x3', productionDate: '2026-09-10', completedAt: '2026-09-10T09:00:00Z' })),
        ];
        const { records } = mergeCompletionRecords(backend, []);
        expect(records.map(r => r.clientRecordId)).toEqual(['x3', 'x2', 'x1']);
    });
});

describe('reportUtils 既有 export 一個不少(AC-S4-32,決策 4:本輪不移除任何公式)', () => {
    it('單筆率值與彙總函式皆仍在', () => {
        const required = [
            'formatDate', 'filterByDateRange', 'filterByShift', 'groupByDate', 'sum', 'average',
            'calculateYieldRate', 'calculateAchievementRate', 'calculateUtilization', 'calculateOEE',
            'calculateWeightedAvgOEE', 'minutesToHHMM', 'durationToMinutes', 'analyzeStopReasons',
            'calculateDailySummary', 'formatNumber', 'formatPercent', 'groupByMonth',
            'calculateMonthlySummary', 'groupStopReasonsByReason',
        ];
        required.forEach(name => {
            expect(typeof reportUtils[name], `reportUtils.${name} 應仍為函式`).toBe('function');
        });
    });
});
