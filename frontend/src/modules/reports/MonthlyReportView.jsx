import React, { useState, useMemo, useEffect } from 'react';
import styles from './MonthlyReportView.module.css';
import {
    filterByDateRange,
    calculateMonthlySummary,
    formatNumber,
    formatPercent,
    minutesToHHMM
} from '../../utils/reportUtils';
import { useLanguage } from '../language/LanguageContext';
import { useProductionSummary } from '../../hooks/useProductionSummary';
import SummarySourceNote from './SummarySourceNote';

/**
 * 生產月報表元件
 * 按月份彙總顯示每日生產統計，並計算月度總計
 *
 * @param {Array} productionHistory - 生產紀錄陣列(父層提供)
 * @param {Function} [onRangeChange] - S4 / F4.1:選用回呼,以 { startDate, endDate } 回報本元件
 *        自持的月份區間,讓父層能把該區間下推給後端查詢。未傳入時行為與加入本參數前完全相同。
 * @param {number} [localOnlyCount=0] - S8:區間內僅存在本機的筆數,大於 0 時不採用後端彙總
 */
const MonthlyReportView = ({ productionHistory, onRangeChange, localOnlyCount = 0 }) => {
    const { t } = useLanguage();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // 產生年份選項 (近5年)
    const yearOptions = useMemo(() => {
        const years = [];
        for (let y = currentYear; y >= currentYear - 4; y--) {
            years.push(y);
        }
        return years;
    }, [currentYear]);

    // 月份選項
    const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    // 計算選取月份的日期範圍
    const dateRange = useMemo(() => {
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;
        return { startDate, endDate };
    }, [selectedYear, selectedMonth]);

    // S4 / F4.1:本元件的區間是自持的(父層不知道使用者選了哪個月),
    // 初始化與每次變更都往上回報一次,否則父層只會抓到明細分頁的區間,月報會空白。
    useEffect(() => {
        if (typeof onRangeChange === 'function') {
            onRangeChange({ startDate: dateRange.startDate, endDate: dateRange.endDate });
        }
    }, [dateRange, onRangeChange]);

    // 前端計算的月報:S8 之後降為備援,涵蓋僅存在本機的舊實績(見 spec20260906-s8-v1 §4)
    const localSummary = useMemo(() => {
        const filtered = filterByDateRange(productionHistory, dateRange.startDate, dateRange.endDate);
        return calculateMonthlySummary(filtered);
    }, [productionHistory, dateRange]);

    // 後端彙總(S8):每日一列與整月總計都由後端以彙總數據重算
    const { data: backendSummary, source, reason } = useProductionSummary({
        kind: 'monthly',
        from: dateRange.startDate,
        to: dateRange.endDate,
        localOnlyCount,
    });

    // 形狀檢查不是多餘的防禦:後端回應一旦不是預期形狀(改版、代理插手、走錯端點),
    // 直接解構會讓 dailyRows 變成 undefined,下面的 .length 就把整個報表頁炸掉。
    // 寧可退回前端計算 —— 報表數字略有落差遠好過白畫面。
    const backendUsable = source === 'backend'
        && backendSummary
        && Array.isArray(backendSummary.dailyRows)
        && backendSummary.totals;

    // 形狀被守衛擋下來時,畫面不可以還說「數字來自後端」—— 那是騙人的。
    // 這種情況等同取不到後端彙總,一律以降級呈現。
    const effectiveSource = backendUsable ? 'backend' : 'local';
    const effectiveReason = backendUsable ? null : (source === 'backend' ? 'error' : reason);

    const { dailyRows, totals } = backendUsable ? backendSummary : localSummary;

    // 匯出 Excel（待實作）
    const handleExport = () => {
        alert(t('reportView.alert.exportWip'));
    };

    // 列印
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className={styles.container}>
            {/* 控制列 */}
            <div className={styles.controlBar}>
                <div className={styles.filters}>
                    <span className={styles.label}>📅 {t('reportView.monthly.selectMonth')}:</span>
                    <select
                        className={styles.select}
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <span className={styles.label}>{t('reportView.monthly.year')}</span>
                    <select
                        className={styles.select}
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                    >
                        {monthOptions.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <span className={styles.label}>{t('reportView.monthly.month')}</span>
                </div>
                <div className={styles.actions}>
                    <button className={styles.btn} onClick={handleExport}>📊 {t('reportView.btn.exportExcel')}</button>
                    <button className={styles.btn} onClick={handlePrint}>🖨️ {t('reportView.btn.print')}</button>
                </div>
            </div>

            {/* 報表標題 */}
            <div className={styles.reportHeader}>
                <h2>📈 {selectedYear} {t('reportView.monthly.year')} {selectedMonth} {t('reportView.monthly.month')} {t('reportView.monthly.title')}</h2>
                <SummarySourceNote source={effectiveSource} reason={effectiveReason} />
            </div>

            {/* 資料表格 */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>{t('reportView.col.date')}</th>
                            <th>{t('reportView.col.orderCount')}</th>
                            <th>{t('reportView.col.totalQty')}</th>
                            <th>{t('reportView.col.good')}</th>
                            <th>{t('reportView.col.defect')}</th>
                            <th>{t('reportView.col.yieldRate')}</th>
                            <th>{t('reportView.col.avgSpeed')}</th>
                            <th>{t('reportView.col.prodTime')}</th>
                            <th>{t('reportView.col.stopTime')}</th>
                            <th>{t('reportView.col.utilization')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dailyRows.length === 0 ? (
                            <tr>
                                <td colSpan={10} className={styles.emptyRow}>
                                    {t('reportView.empty.noMonth')}
                                </td>
                            </tr>
                        ) : (
                            dailyRows.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.date}</td>
                                    <td>{row.orderCount}</td>
                                    <td>{formatNumber(row.totalQty)}</td>
                                    <td className={styles.goodQty}>{formatNumber(row.goodQty)}</td>
                                    <td className={styles.defectQty}>{formatNumber(row.defectQty)}</td>
                                    <td className={row.yieldRate >= 98 ? styles.highYield : ''}>{formatPercent(row.yieldRate)}</td>
                                    <td>{formatNumber(row.avgSpeed, 1)}</td>
                                    <td>{minutesToHHMM(row.runTime)}</td>
                                    <td>{minutesToHHMM(row.stopTime)}</td>
                                    <td className={row.utilizationRate >= 90 ? styles.highUtil : ''}>{formatPercent(row.utilizationRate)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {dailyRows.length > 0 && (
                        <tfoot>
                            <tr className={styles.totalRow}>
                                <td><strong>{t('reportView.monthly.total')}</strong></td>
                                <td><strong>{totals.orderCount}</strong></td>
                                <td><strong>{formatNumber(totals.totalQty)}</strong></td>
                                <td><strong>{formatNumber(totals.goodQty)}</strong></td>
                                <td><strong>{formatNumber(totals.defectQty)}</strong></td>
                                <td><strong>{formatPercent(totals.yieldRate)}</strong></td>
                                <td><strong>{formatNumber(totals.avgSpeed, 1)}</strong></td>
                                <td><strong>{minutesToHHMM(totals.runTime)}</strong></td>
                                <td><strong>{minutesToHHMM(totals.stopTime)}</strong></td>
                                <td><strong>{formatPercent(totals.utilizationRate)}</strong></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default MonthlyReportView;
