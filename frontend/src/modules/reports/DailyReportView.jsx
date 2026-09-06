import React, { useMemo } from 'react';
import styles from './DailyReportView.module.css';
import {
    filterByDateRange,
    filterByShift,
    calculateDailySummary,
    formatDate,
    formatNumber,
    formatPercent,
    minutesToHHMM,
    calculateYieldRate,
    calculateAchievementRate
} from '../../utils/reportUtils';
import { useLanguage } from '../language/LanguageContext';
import { useProductionSummary } from '../../hooks/useProductionSummary';
import SummarySourceNote from './SummarySourceNote';

/**
 * 生產日報表元件
 * @param {Object} props
 * @param {Array} props.productionHistory - 生產歷史資料
 * @param {string} props.startDate - 開始日期
 * @param {string} props.endDate - 結束日期
 * @param {string} props.selectedShift - 選擇的班別
 * @param {Function} props.onDateChange - 日期變更回調
 * @param {Function} props.onShiftChange - 班別變更回調
 * @param {number} [props.localOnlyCount=0] - 區間內僅存在本機的筆數(S8:大於 0 時不採用後端彙總)
 */
const DailyReportView = ({
    productionHistory,
    startDate,
    endDate,
    selectedShift,
    onDateChange,
    onShiftChange,
    localOnlyCount = 0
}) => {
    const { t } = useLanguage();
    // 篩選資料
    const filteredRecords = useMemo(() => {
        let records = filterByDateRange(productionHistory, startDate, endDate);
        records = filterByShift(records, selectedShift);
        return records;
    }, [productionHistory, startDate, endDate, selectedShift]);

    // 前端計算的彙總:S8 之後降為備援,但不可移除 ——
    // 本機還有未回填的舊實績時,只有它涵蓋得到那些資料(見 spec20260906-s8-v1 §4)
    const localSummary = useMemo(() => {
        return calculateDailySummary(filteredRecords);
    }, [filteredRecords]);

    // 後端彙總(S8):單一事實來源。localOnlyCount > 0 或取得失敗時 source 會是 'local'
    const { data: backendSummary, source, reason } = useProductionSummary({
        kind: 'daily',
        from: startDate,
        to: endDate,
        shift: selectedShift,
        localOnlyCount,
    });

    // 同 MonthlyReportView:形狀不符就退回前端計算,不讓 undefined 流進畫面變成 'NaN 筆'
    const backendUsable = source === 'backend'
        && backendSummary
        && !Array.isArray(backendSummary)
        && typeof backendSummary.totalOrders === 'number';

    // 形狀被守衛擋下來時,畫面不可以還說「數字來自後端」—— 那是騙人的。
    // 這種情況等同取不到後端彙總,一律以降級呈現。
    const effectiveSource = backendUsable ? 'backend' : 'local';
    const effectiveReason = backendUsable ? null : (source === 'backend' ? 'error' : reason);

    const summary = backendUsable ? backendSummary : localSummary;

    // 匯出 Excel 功能（待實作）
    const handleExport = () => {
        alert(t('reportView.alert.exportWip'));
    };

    // 列印功能
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className={styles.container}>
            {/* 控制列 */}
            <div className={styles.controlBar}>
                <div className={styles.dateControls}>
                    <label>{t('reportView.label.dateRange')}：</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => onDateChange('start', e.target.value)}
                        className={styles.dateInput}
                    />
                    <span>~</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => onDateChange('end', e.target.value)}
                        className={styles.dateInput}
                    />

                    <label style={{ marginLeft: '20px' }}>{t('reportView.label.shift')}：</label>
                    <select
                        value={selectedShift}
                        onChange={(e) => onShiftChange(e.target.value)}
                        className={styles.shiftSelect}
                    >
                        <option value="全部">{t('reportView.shift.all')}</option>
                        <option value="A">{t('reportView.shift.a')}</option>
                        <option value="B">{t('reportView.shift.b')}</option>
                        <option value="C">{t('reportView.shift.c')}</option>
                        <option value="Day">{t('reportView.shift.day')}</option>
                        <option value="Night">{t('reportView.shift.night')}</option>
                    </select>
                </div>

                <div className={styles.actionButtons}>
                    <button onClick={handleExport} className={styles.btn}>📊 {t('reportView.btn.exportExcel')}</button>
                    <button onClick={handlePrint} className={`${styles.btn} ${styles.noPrint}`}>🖨️ {t('reportView.btn.print')}</button>
                </div>
            </div>

            {/* 統計彙總區 */}
            <div className={styles.summaryPanel}>
                <h3>📈 {t('reportView.daily.summaryTitle')}</h3>
                <SummarySourceNote source={effectiveSource} reason={effectiveReason} />
                <div className={styles.summaryGrid}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.totalOrders')}</span>
                        <span className={styles.summaryValue}>{summary.totalOrders} {t('reportView.unit.count')}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.totalTarget')}</span>
                        <span className={styles.summaryValue}>{formatNumber(summary.totalTarget)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.totalGood')}</span>
                        <span className={styles.summaryValue}>{formatNumber(summary.totalGood)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.totalDefect')}</span>
                        <span className={styles.summaryValue}>{formatNumber(summary.totalDefect)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.avgYield')}</span>
                        <span className={styles.summaryValue}>{formatPercent(summary.avgYieldRate)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.avgAchievement')}</span>
                        <span className={styles.summaryValue}>{formatPercent(summary.avgAchievementRate)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.totalRunTime')}</span>
                        <span className={styles.summaryValue}>{minutesToHHMM(summary.totalRunTime)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.totalStopTime')}</span>
                        <span className={styles.summaryValue}>{minutesToHHMM(summary.totalStopTime)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.totalStopCount')}</span>
                        <span className={styles.summaryValue}>{summary.totalStopCount} {t('reportView.unit.times')}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.avgOEE')}</span>
                        <span className={styles.summaryValue}>{formatPercent(summary.avgOEE)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>{t('reportView.daily.utilization')}</span>
                        <span className={styles.summaryValue}>{formatPercent(summary.utilization)}</span>
                    </div>
                </div>
            </div>

            {/* 明細表格 */}
            <div className={styles.tableContainer}>
                <table className={styles.reportTable}>
                    <thead>
                        <tr>
                            <th>{t('reportView.col.seq')}</th>
                            <th>{t('reportView.col.orderNo')}</th>
                            <th>{t('reportView.col.customer')}</th>
                            <th>{t('reportView.col.productName')}</th>
                            <th>{t('reportView.col.boxNo')}</th>
                            <th>{t('reportView.col.shift')}</th>
                            <th>{t('reportView.col.operator')}</th>
                            <th>{t('reportView.col.targetQty')}</th>
                            <th>{t('reportView.col.goodQty')}</th>
                            <th>{t('reportView.col.defectQty')}</th>
                            <th>{t('reportView.col.yieldRate')}(%)</th>
                            <th>{t('reportView.col.achievementRate')}(%)</th>
                            <th>{t('reportView.col.prepTime')}</th>
                            <th>{t('reportView.col.runTime')}</th>
                            <th>{t('reportView.col.stopTime')}</th>
                            <th>{t('reportView.col.stopCount')}</th>
                            <th>{t('reportView.col.avgSpeed')}</th>
                            <th>OEE(%)</th>
                            <th>{t('reportView.col.finishedAt')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length === 0 ? (
                            <tr>
                                <td colSpan="19" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                    📭 {t('reportView.empty.noData')}
                                </td>
                            </tr>
                        ) : (
                            filteredRecords.map((record, index) => {
                                const yieldRate = calculateYieldRate(record.goodQty, record.defectQty);
                                const achievementRate = calculateAchievementRate(record.goodQty, record.targetQty);

                                return (
                                    <tr key={record.id || index}>
                                        <td>{index + 1}</td>
                                        <td>{record.orderNo}</td>
                                        <td>{record.customer}</td>
                                        <td>{record.productName}</td>
                                        <td>{record.boxNo}</td>
                                        <td>{record.shift}</td>
                                        <td>{record.operator}</td>
                                        <td className={styles.numCell}>{formatNumber(record.targetQty)}</td>
                                        <td className={styles.numCell}>{formatNumber(record.goodQty)}</td>
                                        <td className={styles.numCell}>{formatNumber(record.defectQty)}</td>
                                        <td className={styles.numCell}>{formatPercent(yieldRate)}</td>
                                        <td className={styles.numCell}>{formatPercent(achievementRate)}</td>
                                        <td className={styles.numCell}>{record.prepTime?.toFixed(1) || '-'} {t('reportView.unit.minutes')}</td>
                                        <td className={styles.numCell}>{minutesToHHMM(record.runTime)}</td>
                                        <td className={styles.numCell}>{minutesToHHMM(record.stopTime)}</td>
                                        <td className={styles.numCell}>{record.stopCount}</td>
                                        <td className={styles.numCell}>{record.avgSpeed} {t('reportView.unit.sheetsPerMin')}</td>
                                        <td className={styles.numCell}>{formatPercent(record.oee)}</td>
                                        <td>{formatDate(record.finishedAt, 'YYYY-MM-DD HH:mm:ss')}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* 列印時顯示的頁尾資訊 */}
            <div className={styles.printFooter}>
                <p>{t('reportView.print.printTime')}：{formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')}</p>
                <p>{t('reportView.print.statRange')}：{startDate} ~ {endDate} | {t('reportView.print.shift')}：{selectedShift}</p>
            </div>
        </div>
    );
};

export default DailyReportView;
