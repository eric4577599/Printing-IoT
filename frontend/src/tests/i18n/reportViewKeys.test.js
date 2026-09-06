import { describe, it, expect } from 'vitest';
import { translations } from '../../modules/language/LanguageContext';

/**
 * reportView i18n 缺鍵回歸測試(生產報表四檔 i18n 接入)
 *
 * 涵蓋 ReportsPage / DailyReportView / MonthlyReportView / StopReasonView
 * 四個報表元件實際使用的所有 reportView.* 鍵。
 *
 * t() 無跨語系 fallback,缺鍵會直接把點路徑當字串渲染(如 'reportView.col.seq')。
 * 本測試確保五語系(tw/cn/en/vn/th)皆存在對應鍵且為非空字串,
 * 避免報表畫面顯示原始鍵路徑。
 */

/**
 * 依點路徑取巢狀值
 * 輸入:obj - 語系物件;path - 如 'reportView.col.seq'
 * 輸出:命中的值,或 undefined
 * 邏輯:逐段深入,遇缺即回 undefined
 */
const get = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);

/**
 * 斷言指定語系內每個鍵皆存在且為非空字串
 * 輸入:locales - 語系代碼陣列;keys - 點路徑陣列
 * 輸出:無(以 expect 斷言)
 */
const expectKeys = (locales, keys) => {
    for (const loc of locales) {
        for (const key of keys) {
            const v = get(translations[loc], key);
            expect(typeof v === 'string' && v.length > 0, `${loc}.${key} 缺失`).toBe(true);
        }
    }
};

// 四個報表元件實際引用的 reportView.* 鍵(與元件內 t() 呼叫一一對應)
const REPORT_VIEW_KEYS = [
    // 側欄報表類型(reportView.tab.${id})
    'reportView.tab.details', 'reportView.tab.daily', 'reportView.tab.monthly', 'reportView.tab.stop',
    // alert 對話框
    'reportView.alert.selectOrder', 'reportView.alert.noExport', 'reportView.alert.exportWip',
    // 按鈕
    'reportView.btn.confirm', 'reportView.btn.export', 'reportView.btn.manualUpload', 'reportView.btn.leave',
    'reportView.btn.exportExcel', 'reportView.btn.print', 'reportView.btn.ok', 'reportView.btn.cancel',
    'reportView.btn.expandAll', 'reportView.btn.collapseAll',
    // 標籤
    'reportView.label.date', 'reportView.label.good', 'reportView.label.defect',
    'reportView.label.reportType', 'reportView.label.dateRange', 'reportView.label.shift',
    // 表頭欄名
    'reportView.col.select', 'reportView.col.seq', 'reportView.col.customer', 'reportView.col.orderNo',
    'reportView.col.productName', 'reportView.col.shift', 'reportView.col.speed', 'reportView.col.qty',
    'reportView.col.countQty', 'reportView.col.good', 'reportView.col.defect', 'reportView.col.finishedAt',
    'reportView.col.boxNo', 'reportView.col.operator', 'reportView.col.targetQty', 'reportView.col.goodQty',
    'reportView.col.defectQty', 'reportView.col.yieldRate', 'reportView.col.achievementRate',
    'reportView.col.prepTime', 'reportView.col.runTime', 'reportView.col.stopTime', 'reportView.col.stopCount',
    'reportView.col.avgSpeed', 'reportView.col.stopStart', 'reportView.col.duration', 'reportView.col.stopReason',
    'reportView.col.date', 'reportView.col.orderCount', 'reportView.col.totalQty', 'reportView.col.prodTime',
    'reportView.col.utilization', 'reportView.col.time', 'reportView.col.durationShort',
    // 日報統計彙總
    'reportView.daily.summaryTitle', 'reportView.daily.totalOrders', 'reportView.daily.totalTarget',
    'reportView.daily.totalGood', 'reportView.daily.totalDefect', 'reportView.daily.avgYield',
    'reportView.daily.avgAchievement', 'reportView.daily.totalRunTime', 'reportView.daily.totalStopTime',
    'reportView.daily.totalStopCount', 'reportView.daily.avgOEE', 'reportView.daily.utilization',
    // 月報
    'reportView.monthly.selectMonth', 'reportView.monthly.year', 'reportView.monthly.month',
    'reportView.monthly.title', 'reportView.monthly.total',
    // 停車原因
    'reportView.stop.timeRange', 'reportView.stop.title', 'reportView.stop.totalCount', 'reportView.stop.totalTime',
    // 班別下拉
    'reportView.shift.all', 'reportView.shift.a', 'reportView.shift.b', 'reportView.shift.c',
    'reportView.shift.day', 'reportView.shift.night',
    // 單位
    'reportView.unit.count', 'reportView.unit.times', 'reportView.unit.minutes', 'reportView.unit.sheetsPerMin',
    // 列印頁尾
    'reportView.print.printTime', 'reportView.print.statRange', 'reportView.print.shift',
    // 空狀態
    'reportView.empty.noRecords', 'reportView.empty.noStopRecords', 'reportView.empty.noData',
    'reportView.empty.noMonth', 'reportView.empty.noStopInRange',
    // S4:資料狀態(載入中 / 錯誤 / 無資料)與警示列(降級 / 未取完 / 本機列)
    'reportView.state.loading', 'reportView.state.error', 'reportView.state.empty',
    'reportView.state.degraded', 'reportView.state.truncated', 'reportView.state.localOnly',
    // S4:資料來源欄與來源標示
    'reportView.col.source', 'reportView.source.backend', 'reportView.source.local',
    // S4:重試按鈕與後端列唯讀提示
    'reportView.btn.retry', 'reportView.alert.backendRecordReadOnly',
];

describe('reportView i18n 鍵(生產報表四檔)', () => {
    it('tw/cn/en/vn/th 皆有報表元件使用的所有 reportView 鍵', () => {
        expectKeys(['tw', 'cn', 'en', 'vn', 'th'], REPORT_VIEW_KEYS);
    });
});
