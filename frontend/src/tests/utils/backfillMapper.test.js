import { describe, it, expect } from 'vitest';
import { resolveFactoryDate } from '../../utils/factoryDate';
import {
    backfillKey,
    completedAtForFactoryDate,
    toCompletionRequest,
    classifyForBackfill,
    summariseIssues,
} from '../../utils/backfillMapper';

/**
 * 本機舊實績回填的對映層測試(handoff Next Step 9)
 *
 * 重點放在兩件會「靜默算錯」的事:
 *  ① 只有工廠日、沒有時間戳的舊單,送錯時刻會讓整批位移一天;
 *  ② 有損轉換若不回報,事後沒人查得出為什麼數字對不上。
 */

const TAIPEI = { timeZone: 'Asia/Taipei', dayBoundaryHour: 8 };

/** 造一筆形狀完整的本機紀錄。 */
const localRecord = (over = {}) => ({
    id: 1756000000000,
    orderId: 42,
    orderNo: 'WO-0001',
    customer: '大同紙器',
    productName: 'A 楞箱',
    operator: 'OP1',
    shift: 'A',
    targetQty: 1000,
    goodQty: 950,
    defectQty: 50,
    prepTime: 12,
    runTime: 240,
    stopTime: 30,
    avgSpeed: 120,
    date: '2026-08-01',
    finishedAt: '2026-08-01T09:30:00.000Z',
    defects: [{ code: 'DF01', reason: '色差', qty: 50 }],
    stopReasons: [{ code: 'ST01', reason: '換版', time: '10:05', duration: '12:30' }],
    ...over,
});

// ── 工廠日反解:本模組最容易錯的一段 ──────────────────────────────

describe('completedAtForFactoryDate', () => {
    it('反解出來的時刻,一定會被還原成同一個工廠日', () => {
        // 涵蓋月初、月底、閏年 2/29、跨年
        for (const date of ['2026-08-01', '2026-08-31', '2024-02-29', '2026-12-31', '2027-01-01']) {
            const iso = completedAtForFactoryDate(date, TAIPEI);
            expect(iso, `${date} 應反解得出時刻`).toBeTruthy();
            expect(resolveFactoryDate(iso, TAIPEI), `${date} 必須還原成自己`).toBe(date);
        }
    });

    it('天真作法(送 T00:00)會位移一天 —— 這正是本函式要避免的', () => {
        // 台北 08:00 日界:2026-08-01T00:00Z 是台北 08:01 當天 08:00,剛好在界上…
        // 用一個明確會出錯的:UTC 午夜 = 台北早上 8 點之前的時刻
        const naive = '2026-08-01T00:00:00.000Z'; // 台北時間 08:00 整
        const safe = completedAtForFactoryDate('2026-08-01', TAIPEI);

        // 安全時刻必定還原成 2026-08-01;天真作法不保證(此處只斷言安全時刻)
        expect(resolveFactoryDate(safe, TAIPEI)).toBe('2026-08-01');

        // 而真正會位移的是日界之前:台北 2026-08-01 07:00 屬於工廠日 07-31
        const beforeBoundary = new Date(Date.parse('2026-07-31T23:00:00.000Z')); // 台北 08-01 07:00
        expect(resolveFactoryDate(beforeBoundary, TAIPEI)).toBe('2026-07-31');
        expect(resolveFactoryDate(naive, TAIPEI)).toBe('2026-08-01');
    });

    it('日界為 0 時同樣成立', () => {
        const opts = { timeZone: 'Asia/Taipei', dayBoundaryHour: 0 };
        const iso = completedAtForFactoryDate('2026-08-01', opts);
        expect(resolveFactoryDate(iso, opts)).toBe('2026-08-01');
    });

    it('日界為 23(極端值)時同樣成立', () => {
        const opts = { timeZone: 'Asia/Taipei', dayBoundaryHour: 23 };
        const iso = completedAtForFactoryDate('2026-08-01', opts);
        expect(resolveFactoryDate(iso, opts)).toBe('2026-08-01');
    });

    it('換一個時區也成立(UTC 與美西)', () => {
        for (const timeZone of ['UTC', 'America/Los_Angeles']) {
            const opts = { timeZone, dayBoundaryHour: 6 };
            const iso = completedAtForFactoryDate('2026-08-01', opts);
            expect(iso, `${timeZone} 應反解得出時刻`).toBeTruthy();
            expect(resolveFactoryDate(iso, opts), timeZone).toBe('2026-08-01');
        }
    });

    it('日期格式不合法回 null,不亂猜', () => {
        expect(completedAtForFactoryDate('2026/08/01', TAIPEI)).toBeNull();
        expect(completedAtForFactoryDate('', TAIPEI)).toBeNull();
        expect(completedAtForFactoryDate(null, TAIPEI)).toBeNull();
    });
});

// ── 冪等鍵 ────────────────────────────────────────────────────

describe('backfillKey', () => {
    it('優先用 clientRecordId,其次 id', () => {
        expect(backfillKey({ clientRecordId: 'abc', id: 1 })).toBe('abc');
        expect(backfillKey({ id: 1756 })).toBe('1756');
        expect(backfillKey({})).toBe('');
        expect(backfillKey(null)).toBe('');
    });
});

// ── 轉換 ──────────────────────────────────────────────────────

describe('toCompletionRequest', () => {
    it('正常紀錄轉出完整請求,且不送 defectQty / stopCount(後端自己重算)', () => {
        const { request, issues, blocked } = toCompletionRequest(localRecord(), TAIPEI);

        expect(blocked).toBeNull();
        expect(request.clientRecordId).toBe('1756000000000');
        expect(request.goodQty).toBe(950);
        expect(request.targetQty).toBe(1000);
        expect(request.completedAt).toBe('2026-08-01T09:30:00.000Z');
        expect(request.defects).toHaveLength(1);
        expect(request.stops[0].durationMinutes).toBe(12.5); // '12:30' → 12.5 分

        // 這兩個欄位由後端從明細重算,送了只會讓人以為前端說了算
        expect(request).not.toHaveProperty('defectQty');
        expect(request).not.toHaveProperty('stopCount');

        // 非 GUID 的 orderId 接不回去,必須回報而不是靜默丟掉
        expect(issues.map(i => i.kind)).toContain('orderLinkLost');
        expect(request.orderId).toBeNull();
    });

    it('沒有 finishedAt 時由工廠日反解,並標記時間是補的', () => {
        const { request, issues } = toCompletionRequest(
            localRecord({ finishedAt: undefined }), TAIPEI);

        expect(resolveFactoryDate(request.completedAt, TAIPEI)).toBe('2026-08-01');
        expect(issues.map(i => i.kind)).toContain('approximatedTime');
    });

    it('GUID 形式的 orderId 保留,且不回報遺失', () => {
        const guid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
        const { request, issues } = toCompletionRequest(localRecord({ orderId: guid }), TAIPEI);

        expect(request.orderId).toBe(guid);
        expect(issues.map(i => i.kind)).not.toContain('orderLinkLost');
    });

    it('負值夾到 0 但必須回報 —— 靜默改數字比擋下來更糟', () => {
        const { request, issues } = toCompletionRequest(
            localRecord({ goodQty: -5, runTime: -30 }), TAIPEI);

        expect(request.goodQty).toBe(0);
        expect(request.runTimeMinutes).toBe(0);
        const clamped = issues.filter(i => i.kind === 'negativeClamped').map(i => i.field);
        expect(clamped).toEqual(expect.arrayContaining(['goodQty', 'runTime']));
    });

    it('超長字串截斷並回報', () => {
        const { request, issues } = toCompletionRequest(
            localRecord({ operator: 'x'.repeat(150) }), TAIPEI);

        expect(request.operator).toHaveLength(100);
        expect(issues.some(i => i.kind === 'truncated' && i.field === 'operator')).toBe(true);
    });

    it('冪等鍵過長時擋下,不截斷 —— 截了重跑會長出第二列', () => {
        const { request, blocked } = toCompletionRequest(
            localRecord({ id: 'k'.repeat(80) }), TAIPEI);

        expect(request).toBeNull();
        expect(blocked).toContain('冪等');
    });

    it('明細筆數超過上限時擋下,不截斷 —— 截了會讓後端算出偏低的不良數', () => {
        const many = Array.from({ length: 201 }, () => ({ code: 'D', reason: 'x', qty: 1 }));
        const { request, blocked } = toCompletionRequest(localRecord({ defects: many }), TAIPEI);

        expect(request).toBeNull();
        expect(blocked).toContain('200');
    });

    it('完全沒有時間資訊時擋下,不用現在時間充數', () => {
        const { request, blocked } = toCompletionRequest(
            localRecord({ finishedAt: undefined, date: undefined }), TAIPEI);

        expect(request).toBeNull();
        expect(blocked).toContain('完工時間');
    });

    it('停機時長容忍舊資料的三種形狀,認不得的回 0 並回報', () => {
        // "MM:SS"(現行)、純數字(舊資料可能的形狀)、數字字串
        const cases = [
            ['12:30', 12.5],
            [12, 12],
            ['12', 12],
        ];
        for (const [duration, expected] of cases) {
            const { request } = toCompletionRequest(
                localRecord({ stopReasons: [{ code: 'ST01', reason: '換版', duration }] }), TAIPEI);
            expect(request.stops[0].durationMinutes, String(duration)).toBe(expected);
        }

        // 認不得的形狀:回 0 但必須回報,不可靜默把停機時間歸零
        const { request, issues } = toCompletionRequest(
            localRecord({ stopReasons: [{ code: 'ST01', reason: '換版', duration: '一刻鐘' }] }), TAIPEI);
        expect(request.stops[0].durationMinutes).toBe(0);
        expect(issues.map(i => i.kind)).toContain('unparsableDuration');
    });

    it('沒有 id 也沒有 clientRecordId 時擋下', () => {
        const { request, blocked } = toCompletionRequest(
            localRecord({ id: undefined, clientRecordId: undefined }), TAIPEI);

        expect(request).toBeNull();
        expect(blocked).toContain('紀錄編號');
    });
});

// ── 分類 ──────────────────────────────────────────────────────

describe('classifyForBackfill', () => {
    it('把本機紀錄分成已同步 / 待回填 / 無法回填 / 本機重複四堆', () => {
        const records = [
            localRecord({ id: 1 }),                                   // 後端已有
            localRecord({ id: 2 }),                                   // 待回填
            localRecord({ id: 2 }),                                   // 本機重複,只留先出現者
            localRecord({ id: 3, finishedAt: undefined, date: undefined }), // 無法回填
        ];

        const result = classifyForBackfill(records, new Set(['1']), TAIPEI);

        expect(result.alreadySynced.map(x => x.key)).toEqual(['1']);
        expect(result.pending.map(x => x.key)).toEqual(['2']);
        expect(result.duplicateKeys.map(x => x.key)).toEqual(['2']);
        expect(result.blocked).toHaveLength(1);

        // 四堆加起來必須等於輸入筆數 —— 不可以有紀錄憑空消失
        const total = result.alreadySynced.length + result.pending.length
            + result.duplicateKeys.length + result.blocked.length;
        expect(total).toBe(records.length);
    });

    it('輸入為空或非陣列時不炸', () => {
        expect(classifyForBackfill(null, new Set(), TAIPEI).pending).toEqual([]);
        expect(classifyForBackfill([], undefined, TAIPEI).pending).toEqual([]);
    });
});

describe('summariseIssues', () => {
    it('同一筆的同類問題只計一次,避免一筆多欄位灌大數字', () => {
        const items = [
            { issues: [{ kind: 'truncated' }, { kind: 'truncated' }, { kind: 'orderLinkLost' }] },
            { issues: [{ kind: 'truncated' }] },
        ];
        expect(summariseIssues(items)).toEqual({ truncated: 2, orderLinkLost: 1 });
    });
});
