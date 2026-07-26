import { describe, it, expect } from 'vitest';
import { translations } from '../../modules/language/LanguageContext';

/**
 * i18n 語系鍵集合對等測試(S3 AC-S3-3)。
 *
 * t() 無跨語系 fallback,任一語系缺鍵會直接把點路徑當字串渲染(如 'nav.monitor')。
 * 本測試以 tw 為結構準繩,斷言 cn/en/vn/th 的葉鍵集合與 tw 完全相同(無缺、無多),
 * 且所有值皆為非空字串。vn/th 補齊前本測試會失敗,正是把關依據。
 */

// 攤平巢狀翻譯物件為 { '點路徑': 值 }
const flatten = (obj, prefix = '') => {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
        else out[key] = v;
    }
    return out;
};

const twFlat = flatten(translations.tw);
const twKeys = Object.keys(twFlat).sort();

describe('i18n 語系鍵集合對等(AC-S3-3)', () => {
    for (const loc of ['cn', 'en', 'vn', 'th']) {
        it(`${loc} 葉鍵集合與 tw 完全相同`, () => {
            const locKeys = Object.keys(flatten(translations[loc])).sort();
            const missing = twKeys.filter(k => !locKeys.includes(k));
            const extra = locKeys.filter(k => !twKeys.includes(k));
            expect(missing, `${loc} 缺鍵`).toEqual([]);
            expect(extra, `${loc} 多鍵`).toEqual([]);
        });

        it(`${loc} 所有值皆為非空字串`, () => {
            const flat = flatten(translations[loc]);
            const empties = Object.entries(flat)
                .filter(([, v]) => typeof v !== 'string' || v.length === 0)
                .map(([k]) => k);
            expect(empties, `${loc} 空值/非字串鍵`).toEqual([]);
        });
    }
});
