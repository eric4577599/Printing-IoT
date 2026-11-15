// 報表設定「異常過濾」的預設選項與舊資料轉換(從 ReportTab 抽出,元件檔只匯出元件)。

/**
 * 異常過濾的預設選項。存的是語言無關的代號,顯示名稱依介面語言翻譯
 * (原本直接存中文字串「休息」「點心」「支援」,切到其他語言仍顯示中文)。
 */
export const FILTER_PRESETS = [
    { id: 'rest', labelKey: 'settingsExt.report.filterRest' },
    { id: 'snack', labelKey: 'settingsExt.report.filterSnack' },
    { id: 'support', labelKey: 'settingsExt.report.filterSupport' },
];
const LEGACY_FILTER_IDS = { '休息': 'rest', '點心': 'snack', '支援': 'support' };

/** 舊資料存的是中文字串:對得上預設選項的轉成代號,其餘視為自訂關鍵字原樣保留 */
export const normalizeFilters = (list) =>
    Array.isArray(list) ? [...new Set(list.map(k => LEGACY_FILTER_IDS[k] ?? k))] : ['rest', 'snack', 'support'];

