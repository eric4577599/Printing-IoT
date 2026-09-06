import { describe, it, expect } from 'vitest';
import vectors from '../../../../tests/fixtures/oee-golden-vectors.json';
import { calculateOEE } from '../../utils/reportUtils';

/**
 * S8 / §2:黃金向量測試(AC-13)
 *
 * 這個檔案讀的是 repo 根的 tests/fixtures/oee-golden-vectors.json ——
 * **與後端 OeeCalculatorGoldenVectorTests 讀的是同一個檔**。
 *
 * 存在的理由是跨語言漂移,不是覆蓋率:`calculateOEE` 與 C# 的 `OeeCalculator` 是同一組公式的
 * 兩份實作,在本檔出現之前兩邊各自對著自己手寫的期望值測,任一邊被改動另一邊都不會有反應,
 * 報表數字會靜靜地分岔而沒有任何測試轉紅。
 *
 * 期望值由 C# 背書(decimal 精確運算);這裡要證明的是 JS 算得出完全相同的數字。
 * 特別注意 x.x5 那幾筆 —— C# 用 decimal、JS 用二進位浮點,那正是兩者最容易分岔的地方。
 */

describe('AC-13 calculateOEE 對黃金向量', () => {
    it('向量檔讀得到且非空', () => {
        // 檔案路徑寫錯時 vitest 會直接爆,但空陣列會靜靜地讓整組測試「全過」——
        // 那等於這層保護不存在,所以明確釘住筆數
        expect(Array.isArray(vectors)).toBe(true);
        expect(vectors.length).toBeGreaterThan(0);
    });

    it.each(vectors.map(v => [v.name, v]))('%s', (_name, vector) => {
        const actual = calculateOEE(vector.input);

        expect(actual.availability).toBe(vector.expected.availability);
        expect(actual.performance).toBe(vector.expected.performance);
        expect(actual.quality).toBe(vector.expected.quality);
        expect(actual.oee).toBe(vector.expected.oee);
    });
});
