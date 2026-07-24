import { describe, it, expect } from 'vitest';
import { translations } from '../../modules/language/LanguageContext';

/**
 * i18n 缺鍵回歸測試(對抗性稽核第二輪 #1 critical / #11 / #13)
 *
 * t() 無跨語系 fallback,缺鍵會直接渲染成 key 路徑字串。
 * 本測試確保先前缺失的鍵在對應語系實際存在,避免畫面顯示 'analysis.fields.date' 等原始鍵。
 */

/**
 * 依點路徑取巢狀值
 * 輸入:obj - 語系物件;path - 如 'analysis.fields.date'
 * 輸出:命中的值,或 undefined
 * 邏輯:逐段深入,遇缺即回 undefined
 */
const get = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);

/**
 * 斷言指定語系皆存在且非空字串
 */
const expectKeys = (locales, keys) => {
    for (const loc of locales) {
        for (const key of keys) {
            const v = get(translations[loc], key);
            expect(typeof v === 'string' && v.length > 0, `${loc}.${key} 缺失`).toBe(true);
        }
    }
};

describe('Analysis i18n 鍵(#1)', () => {
    it('tw/cn/en 皆有 analysis 頁使用的所有鍵', () => {
        const keys = [
            'analysis.fields.customer', 'analysis.fields.date', 'analysis.fields.oee', 'analysis.fields.goodQty',
            'analysis.chartTypes.pie', 'analysis.chartTypes.radar', 'analysis.chartType.title',
            'analysis.timeScales.minute', 'analysis.timeScales.month', 'analysis.timeScale.title',
            'analysis.category.title', 'analysis.display.title', 'analysis.dateRange',
            'analysis.quickDate.today', 'analysis.quickDate.yesterday', 'analysis.quickDate.thisMonth',
            'analysis.actions.clearFilters', 'analysis.actions.exportExcel',
            'analysis.summary.totalQty', 'analysis.summary.avgSpeed', 'analysis.summary.recordsCount',
        ];
        expectKeys(['tw', 'cn', 'en'], keys);
    });
});

describe('設定 i18n 補鍵(#11 / #13)', () => {
    it('cn/en 補齊 flute_single 與 sheets', () => {
        expectKeys(['cn', 'en'], ['settings.unit.flute_single', 'dashboard.schedule.sheets']);
    });

    it('vn/th 補齊 settings.unit/formula/report', () => {
        expectKeys(['vn', 'th'], [
            'settings.unit.title', 'settings.unit.flute_single',
            'settings.formula.title', 'settings.formula.targetOEE',
            'settings.report.title', 'settings.report.timeBoundary',
        ]);
    });
});

describe('dashboard 停車原因 / 備註鍵(#8 / #9)', () => {
    it('tw/cn/en 皆有 dashboard.stopReasons 與 dashboard.schedule.notes', () => {
        expectKeys(['tw', 'cn', 'en'], [
            'dashboard.stopReasons.startTime', 'dashboard.stopReasons.duration', 'dashboard.stopReasons.reason',
            'dashboard.schedule.notes',
        ]);
    });
});
