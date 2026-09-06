import { describe, it, expect } from 'vitest';
import {
    calculateOEE,
    calculateUtilization,
    calculateWeightedAvgOEE,
    calculateDailySummary,
    calculateMonthlySummary,
} from '../../utils/reportUtils';

/**
 * 報表公式測試(S3 / GAP-05,對應 AC-23、AC-24、AC-25)。
 *
 * 規則見 docs/spec20260903-s3-v1.md §5.1。calculateOEE 的期望值刻意與後端
 * OeeCalculatorTests(AC-10 ~ AC-12)完全相同 —— 兩份實作漂移時這裡會先紅。
 */
describe('calculateOEE(AC-23:與後端數值完全一致)', () => {
    // 對應後端 AC-10 的正常案例
    it('§5.1 正常案例:R=96 S=18 P=12.5 G=4820 D=120 T=5000', () => {
        const result = calculateOEE({
            runTime: 96, stopTime: 18, prepTime: 12.5,
            goodQty: 4820, defectQty: 120, targetQty: 5000,
        });

        expect(result.availability).toBe(94.6);
        expect(result.performance).toBe(96.4);
        expect(result.quality).toBe(97.6);
        expect(result.oee).toBe(89.0);
    });

    // 對應後端 AC-11a:負荷時間 ≤ 0
    it('邊界:負荷時間 ≤ 0 → 稼動率 0、OEE 0(不是 100)', () => {
        const result = calculateOEE({
            runTime: 10, stopTime: 5, prepTime: 20,
            goodQty: 100, defectQty: 0, targetQty: 100,
        });

        expect(result.availability).toBe(0);
        expect(result.oee).toBe(0);
    });

    // 對應後端 AC-11b:目標數量為 0
    it('邊界:目標數量 0 → 效能 0、OEE 0(不以 1 假裝滿分)', () => {
        const result = calculateOEE({
            runTime: 96, stopTime: 18, prepTime: 0,
            goodQty: 100, defectQty: 0, targetQty: 0,
        });

        expect(result.performance).toBe(0);
        expect(result.oee).toBe(0);
    });

    // 對應後端 AC-11c:良品 + 不良品 = 0
    it('邊界:無任何產出 → 良率 0、OEE 0', () => {
        const result = calculateOEE({
            runTime: 96, stopTime: 18, prepTime: 0,
            goodQty: 0, defectQty: 0, targetQty: 5000,
        });

        expect(result.quality).toBe(0);
        expect(result.oee).toBe(0);
    });

    // 對應後端 AC-12
    it('無不良品 → 良率 100;全部不良 → 良率 0 且 OEE 0', () => {
        const clean = calculateOEE({
            runTime: 96, stopTime: 18, prepTime: 0,
            goodQty: 5000, defectQty: 0, targetQty: 5000,
        });
        expect(clean.quality).toBe(100);

        const allBad = calculateOEE({
            runTime: 96, stopTime: 18, prepTime: 0,
            goodQty: 0, defectQty: 500, targetQty: 5000,
        });
        expect(allBad.quality).toBe(0);
        expect(allBad.oee).toBe(0);
    });

    // 對應後端 AC-13:效能分子用良品數
    it('把 100 個產出從良品移到不良品 → 效能下降(證明不再用含不良品的累計計數)', () => {
        const before = calculateOEE({
            runTime: 96, stopTime: 18, prepTime: 12.5,
            goodQty: 4820, defectQty: 120, targetQty: 5000,
        });
        const after = calculateOEE({
            runTime: 96, stopTime: 18, prepTime: 12.5,
            goodQty: 4720, defectQty: 220, targetQty: 5000,
        });

        expect(before.performance).toBe(96.4);
        expect(after.performance).toBe(94.4);
        expect(after.performance).toBeLessThan(before.performance);
    });

    // 對應後端 AC-14:準備時間排除
    it('準備時間由 0 加到 10 → 稼動率持續上升且永遠 ≤ 100', () => {
        let previous = -1;

        for (let prep = 0; prep <= 10; prep++) {
            const { availability } = calculateOEE({
                runTime: 96, stopTime: 18, prepTime: prep,
                goodQty: 4820, defectQty: 120, targetQty: 5000,
            });

            expect(availability).toBeGreaterThan(previous);
            expect(availability).toBeLessThanOrEqual(100);
            previous = availability;
        }
    });

    it('超產時效能以 100% 封頂,OEE 不會超過 100', () => {
        const result = calculateOEE({
            runTime: 96, stopTime: 18, prepTime: 0,
            goodQty: 6000, defectQty: 0, targetQty: 5000,
        });

        expect(result.performance).toBe(100);
        expect(result.oee).toBeLessThanOrEqual(100);
    });

    it('負數輸入先夾到 0,不出現負值或 NaN', () => {
        const result = calculateOEE({
            runTime: -5, stopTime: -5, prepTime: -5,
            goodQty: -10, defectQty: -10, targetQty: -10,
        });

        expect(result).toEqual({ availability: 0, performance: 0, quality: 0, oee: 0 });
    });

    it('未帶任何參數時回全 0,不拋例外', () => {
        expect(() => calculateOEE()).not.toThrow();
        expect(calculateOEE()).toEqual({ availability: 0, performance: 0, quality: 0, oee: 0 });
    });
});

describe('calculateUtilization(AC-24:向下相容且支援準備時間)', () => {
    it('兩參數呼叫的結果與加入第三參數前完全一致', () => {
        // 修改前:runTime / (runTime + stopTime) * 100
        expect(calculateUtilization(96, 18)).toBeCloseTo((96 / 114) * 100, 10);
        expect(calculateUtilization(60, 60)).toBe(50);
        expect(calculateUtilization(100, 0)).toBe(100);
        expect(calculateUtilization(0, 0)).toBe(0);
    });

    it('帶入 prepTime > 0 時分母縮小、結果變大且 ≤ 100', () => {
        const withoutPrep = calculateUtilization(96, 18);
        const withPrep = calculateUtilization(96, 18, 10);

        expect(withPrep).toBeGreaterThan(withoutPrep);
        expect(withPrep).toBeCloseTo((96 / 104) * 100, 10);
        expect(withPrep).toBeLessThanOrEqual(100);
    });

    it('準備時間吃掉整段負荷時間時回 0,不出現負值', () => {
        expect(calculateUtilization(10, 5, 20)).toBe(0);
    });

    it('準備時間讓負荷時間小於運轉時間時以 100% 封頂', () => {
        // L = 96 + 18 − 100 = 14 < R;min(R, L) / L = 1 → 100%
        expect(calculateUtilization(96, 18, 100)).toBe(100);
    });
});

describe('calculateWeightedAvgOEE / calculateDailySummary(AC-25:加權平均)', () => {
    // AC-25:兩筆紀錄(OEE 90 / 產量 100,OEE 50 / 產量 900)→ 54,不是 70
    const records = [
        { oee: 90, goodQty: 100, defectQty: 0, targetQty: 100, runTime: 10, stopTime: 0, stopCount: 0 },
        { oee: 50, goodQty: 900, defectQty: 0, targetQty: 1000, runTime: 90, stopTime: 10, stopCount: 1 },
    ];

    it('加權平均為 54(算術平均的 70 是錯的)', () => {
        expect(calculateWeightedAvgOEE(records)).toBe(54);
        expect(calculateWeightedAvgOEE(records)).not.toBe(70);
    });

    it('calculateDailySummary 的 avgOEE 使用加權平均', () => {
        const summary = calculateDailySummary(records);

        expect(summary.avgOEE).toBe(54);
        expect(summary.avgOEE).not.toBe(70);
    });

    it('Σqty = 0 → 0(不得退回算術平均)', () => {
        const zeroQty = [
            { oee: 90, goodQty: 0, defectQty: 0 },
            { oee: 50, goodQty: 0, defectQty: 0 },
        ];

        expect(calculateWeightedAvgOEE(zeroQty)).toBe(0);
        expect(calculateDailySummary(zeroQty).avgOEE).toBe(0);
    });

    it('不良品也計入權重(qty = goodQty + defectQty)', () => {
        const withDefects = [
            { oee: 100, goodQty: 0, defectQty: 100 },
            { oee: 0, goodQty: 100, defectQty: 0 },
        ];

        expect(calculateWeightedAvgOEE(withDefects)).toBe(50);
    });

    it('空陣列回 0,不拋例外', () => {
        expect(calculateWeightedAvgOEE([])).toBe(0);
        expect(calculateWeightedAvgOEE(null)).toBe(0);
        expect(calculateDailySummary([]).avgOEE).toBe(0);
    });
});

describe('calculateMonthlySummary(GAP-05:每日與總計新增 OEE)', () => {
    const records = [
        {
            date: '2026-09-03', goodQty: 4820, defectQty: 120, targetQty: 5000,
            runTime: 96, stopTime: 18, prepTime: 12.5, avgSpeed: 52, oee: 89,
        },
        {
            date: '2026-09-04', goodQty: 1000, defectQty: 0, targetQty: 1000,
            runTime: 20, stopTime: 0, prepTime: 0, avgSpeed: 50, oee: 100,
        },
    ];

    it('每日列的 oee 由該日彙總數據重算,與 calculateOEE 一致', () => {
        const { dailyRows } = calculateMonthlySummary(records);

        const day0903 = dailyRows.find(r => r.date === '2026-09-03');
        expect(day0903.oee).toBe(calculateOEE({
            runTime: 96, stopTime: 18, prepTime: 12.5,
            goodQty: 4820, defectQty: 120, targetQty: 5000,
        }).oee);
        expect(day0903.oee).toBe(89.0);

        const day0904 = dailyRows.find(r => r.date === '2026-09-04');
        expect(day0904.oee).toBe(100);
    });

    it('每日列的 utilizationRate 帶入 prepTime(分母為負荷時間)', () => {
        const { dailyRows } = calculateMonthlySummary(records);
        const day0903 = dailyRows.find(r => r.date === '2026-09-03');

        expect(day0903.prepTime).toBe(12.5);
        expect(day0903.utilizationRate).toBeCloseTo((96 / 101.5) * 100, 10);
    });

    it('totals 以整月彙總數據計算 oee 與 utilizationRate', () => {
        const { totals } = calculateMonthlySummary(records);

        expect(totals.oee).toBe(calculateOEE({
            runTime: 116, stopTime: 18, prepTime: 12.5,
            goodQty: 5820, defectQty: 120, targetQty: 6000,
        }).oee);
        expect(totals.utilizationRate).toBeCloseTo((116 / 121.5) * 100, 10);
        expect(totals.prepTime).toBe(12.5);
    });

    it('空陣列回空結果,不拋例外', () => {
        expect(calculateMonthlySummary([])).toEqual({ dailyRows: [], totals: {} });
    });
});
