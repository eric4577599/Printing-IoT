import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveFactoryDate } from '../../utils/factoryDate';

/**
 * 工廠日工具測試(S3 / F7,對應 AC-26)。
 *
 * 規則見 docs/spec20260903-s3-v1.md §5.2,與後端 FactoryDayCalculatorTests 釘住同一組輸入輸出。
 */
describe('resolveFactoryDate(S3 / F7,AC-26)', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // AC-26 + §5.2 表:五列輸入輸出
    it.each([
        // UTC 16:41 → 台北 09-04 00:41,日界 8 → 前一日(大夜班)
        ['2026-09-03T16:41:00Z', 8, '2026-09-03'],
        // UTC 23:59 → 台北 09-04 07:59,日界 8 → 仍為前一日
        ['2026-09-03T23:59:00Z', 8, '2026-09-03'],
        // UTC 00:00 → 台北 09-04 08:00,日界 8 → 換日
        ['2026-09-04T00:00:00Z', 8, '2026-09-04'],
        // UTC 05:00 → 台北 09-04 13:00
        ['2026-09-04T05:00:00Z', 8, '2026-09-04'],
        // 日界 0 等同不調整 → 台北當地日曆日
        ['2026-09-03T16:41:00Z', 0, '2026-09-04'],
    ])('%s(日界 %i)→ %s', (completedAt, dayBoundaryHour, expected) => {
        expect(resolveFactoryDate(completedAt, { dayBoundaryHour })).toBe(expected);
    });

    it('預設日界為 8、預設時區為 Asia/Taipei', () => {
        expect(resolveFactoryDate('2026-09-03T16:41:00Z')).toBe('2026-09-03');
        expect(resolveFactoryDate('2026-09-04T00:00:00Z')).toBe('2026-09-04');
    });

    // 舊寫法(UTC 取日)會在台北 08:00–24:00 這段給出前一日,這裡釘住新舊行為的差異
    it('與舊寫法 toISOString().split("T")[0] 的差異被修正', () => {
        const iso = '2026-09-04T15:30:00Z';   // 台北 09-04 23:30

        expect(iso.split('T')[0]).toBe('2026-09-04');
        expect(resolveFactoryDate(iso, { dayBoundaryHour: 8 })).toBe('2026-09-04');

        // 真正分歧的是大夜班:UTC 取日會得到 09-03,工廠日規則同樣是 09-03,
        // 但 UTC 16:00 之後(台北隔日 00:00 起)兩者就會分家
        const nightShift = '2026-09-04T16:10:00Z';   // 台北 09-05 00:10
        expect(nightShift.split('T')[0]).toBe('2026-09-04');
        expect(resolveFactoryDate(nightShift, { dayBoundaryHour: 8 })).toBe('2026-09-04');

        // 台北 09-05 08:30 → 工廠日 09-05,UTC 取日則是 09-05 00:30 的 09-05(此列兩者相同)
        expect(resolveFactoryDate('2026-09-05T00:30:00Z', { dayBoundaryHour: 8 })).toBe('2026-09-05');
    });

    it('接受 Date 物件與時間戳', () => {
        const date = new Date('2026-09-03T16:41:00Z');

        expect(resolveFactoryDate(date, { dayBoundaryHour: 8 })).toBe('2026-09-03');
        expect(resolveFactoryDate(date.getTime(), { dayBoundaryHour: 8 })).toBe('2026-09-03');
    });

    it('跨月與跨年邊界會正確退回前一日', () => {
        // 台北 2026-10-01 00:30 → 工廠日 2026-09-30
        expect(resolveFactoryDate('2026-09-30T16:30:00Z', { dayBoundaryHour: 8 })).toBe('2026-09-30');
        // 台北 2027-01-01 01:00 → 工廠日 2026-12-31
        expect(resolveFactoryDate('2026-12-31T17:00:00Z', { dayBoundaryHour: 8 })).toBe('2026-12-31');
    });

    // AC-26:非法輸入不拋例外
    it('完工時間非法時不拋例外,改用現在時間並 console.warn', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });

        let result;
        expect(() => { result = resolveFactoryDate('not-a-date', { dayBoundaryHour: 8 }); }).not.toThrow();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(warn).toHaveBeenCalled();
    });

    it('時區不被支援時退回 Asia/Taipei 規則,不拋例外', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });

        let result;
        expect(() => {
            result = resolveFactoryDate('2026-09-03T16:41:00Z', { dayBoundaryHour: 8, timeZone: 'Mars/Olympus_Mons' });
        }).not.toThrow();

        expect(result).toBe('2026-09-03');
        expect(warn).toHaveBeenCalled();
    });

    it('日界超出 0–23 時夾到 0(等同不調整),不拋例外', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });

        expect(resolveFactoryDate('2026-09-03T16:41:00Z', { dayBoundaryHour: 99 })).toBe('2026-09-04');
        expect(resolveFactoryDate('2026-09-03T16:41:00Z', { dayBoundaryHour: -1 })).toBe('2026-09-04');
        expect(warn).toHaveBeenCalled();
    });

    it('options 為 null 時使用預設值,不拋例外', () => {
        expect(() => resolveFactoryDate('2026-09-03T16:41:00Z', null)).not.toThrow();
        expect(resolveFactoryDate('2026-09-03T16:41:00Z', null)).toBe('2026-09-03');
    });
});
