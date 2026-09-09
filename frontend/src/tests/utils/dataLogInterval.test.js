import { describe, it, expect } from 'vitest';
import {
    parseLogInterval,
    describeSeconds,
    DATA_LOG_INTERVAL_MIN,
    DATA_LOG_INTERVAL_MAX,
    DATA_LOG_INTERVAL_DEFAULT,
} from '../../utils/dataLogInterval';

/**
 * S15:定時寫入間隔改以「秒」輸入。
 *
 * 原本輸入是分鐘、儲存是秒,`Math.floor(秒 / 60)` 讓實際生效的 6 秒顯示成「0 分鐘」,
 * 而且低於一分鐘的值根本打不進去。
 *
 * 前端的判準必須與後端一致 —— `SignalMappingProvider` 把 <=0 或 >3600
 * **靜默**換成預設 300。前端若放行,現場會以為自己設的值生效了,實際跑的是另一個數字。
 */

describe('parseLogInterval — 判準與後端一致', () => {
    it('範圍內的整數秒可送出', () => {
        for (const v of [1, 6, 180, 300, 600, 3600]) {
            expect(parseLogInterval(String(v))).toEqual({ ok: true, seconds: v });
        }
    });

    it('低於一分鐘的值可以設定 —— 這正是改秒要解決的事', () => {
        expect(parseLogInterval('6').ok).toBe(true);
        expect(parseLogInterval('30').ok).toBe(true);
    });

    it('0 與負數擋下 —— 後端會靜默換成 300,放行等於騙人', () => {
        expect(parseLogInterval('0').ok).toBe(false);
        expect(parseLogInterval('-5').ok).toBe(false);
    });

    it('超過 3600 擋下', () => {
        expect(parseLogInterval('3601').ok).toBe(false);
        expect(parseLogInterval('99999').ok).toBe(false);
    });

    it('邊界剛好可用', () => {
        expect(parseLogInterval(String(DATA_LOG_INTERVAL_MIN)).ok).toBe(true);
        expect(parseLogInterval(String(DATA_LOG_INTERVAL_MAX)).ok).toBe(true);
    });

    it('空白、非數字、小數一律擋下', () => {
        for (const v of ['', '   ', 'abc', '3.5', '1e3x', null, undefined]) {
            expect(parseLogInterval(v).ok, `不該放行:${String(v)}`).toBe(false);
        }
    });

    it('前後空白不影響', () => {
        expect(parseLogInterval('  300  ')).toEqual({ ok: true, seconds: 300 });
    });

    it('預設值本身必須是合法的', () => {
        expect(parseLogInterval(String(DATA_LOG_INTERVAL_DEFAULT)).ok).toBe(true);
    });
});

describe('describeSeconds — 讓三位數的秒還看得懂', () => {
    it('滿一分鐘才換算', () => {
        expect(describeSeconds(300)).toBe('5 分 0 秒');
        expect(describeSeconds(90)).toBe('1 分 30 秒');
        expect(describeSeconds(3600)).toBe('60 分 0 秒');
    });

    it('未滿一分鐘回空字串,不顯示「0 分 6 秒」這種贅述', () => {
        expect(describeSeconds(6)).toBe('');
        expect(describeSeconds(59)).toBe('');
    });

    it('非數字不炸', () => {
        expect(describeSeconds('abc')).toBe('');
        expect(describeSeconds(undefined)).toBe('');
    });
});
