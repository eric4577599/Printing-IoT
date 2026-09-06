import React from 'react';
import { useLanguage } from '../language/LanguageContext';

/**
 * 彙總資料來源標示(S8 / §3、AC-16 ~ AC-18)
 *
 * 報表上的同一組數字可能來自兩個地方:後端彙總端點(單一事實來源),
 * 或前端以 reportUtils 重算。兩者在正常情況下相同,但涵蓋範圍不同 ——
 * 前端算得到僅存在本機的舊實績,後端算不到。
 *
 * 使用者有權知道自己看的是哪一種,尤其是降級的時候:
 * 一個沉默的降級會讓人以為看到的是權威數字,那比看不到數字更糟。
 *
 * @param {Object} props
 * @param {'backend'|'local'} props.source - 這批數字的來源
 * @param {string|null} props.reason - source 為 local 時的原因:
 *        'localOnly'(本機還有未回填的舊實績)/ 'error'(後端取不到)/ 'disabled'(尚未查詢)
 * @returns {JSX.Element|null} 'disabled' 時不渲染任何東西
 */
const SummarySourceNote = ({ source, reason }) => {
    const { t } = useLanguage();

    if (source === 'backend') {
        return (
            <div data-testid="summary-source-backend" style={noteStyle('#2f6f4f')}>
                {t('reportView.state.sourceBackend')}
            </div>
        );
    }

    // 還沒決定區間、根本沒查過 —— 沒有來源可言,不要平白嚇人
    if (reason === 'disabled' || !reason) return null;

    const isDegraded = reason === 'error';

    return (
        <div
            data-testid={isDegraded ? 'summary-source-degraded' : 'summary-source-local'}
            style={noteStyle(isDegraded ? '#8a5a00' : '#4a5568')}
        >
            {t(isDegraded ? 'reportView.state.sourceDegraded' : 'reportView.state.sourceLocalOnly')}
        </div>
    );
};

/**
 * 標示列的行內樣式。
 * 輸入:文字顏色;輸出:style 物件。
 * 走行內樣式而不是 CSS module —— 這個元件被三個檢視共用,
 * 各自的 module.css 沒有共通的類別可掛。
 */
const noteStyle = (color) => ({
    color,
    fontSize: '12px',
    margin: '4px 0 8px',
});

export default SummarySourceNote;
