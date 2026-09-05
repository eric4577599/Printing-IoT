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

// S4 / F5:分析頁的資料狀態鍵(載入中 / 錯誤 / 無資料 / 降級 / 未取完 / 本機列 / 重試 / 載入中匯出)
// 五語系皆須存在且為非空字串,否則畫面會直接渲染 'analysis.state.loading' 這種原始鍵路徑。
describe('Analysis 資料狀態 i18n 鍵(S4 / F5,AC-S4-31)', () => {
    it('tw/cn/en/vn/th 皆有 analysis.state.* 鍵', () => {
        expectKeys(['tw', 'cn', 'en', 'vn', 'th'], [
            'analysis.state.loading', 'analysis.state.error', 'analysis.state.empty',
            'analysis.state.degraded', 'analysis.state.truncated', 'analysis.state.localOnly',
            'analysis.state.retry', 'analysis.state.exportWhileLoading',
        ]);
    });

    it('載入中 / 無資料 / 錯誤三種措辭不得相同(AC-S4-29:查詢失敗不可看起來像沒生產)', () => {
        for (const loc of ['tw', 'cn', 'en', 'vn', 'th']) {
            const texts = [
                get(translations[loc], 'analysis.state.loading'),
                get(translations[loc], 'analysis.state.empty'),
                get(translations[loc], 'analysis.state.error'),
            ];
            expect(new Set(texts).size, `${loc} 三種狀態措辭重複`).toBe(3);

            const reportTexts = [
                get(translations[loc], 'reportView.state.loading'),
                get(translations[loc], 'reportView.state.empty'),
                get(translations[loc], 'reportView.state.error'),
            ];
            expect(new Set(reportTexts).size, `${loc} 報表三種狀態措辭重複`).toBe(3);
        }
    });
});
