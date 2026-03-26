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

/**
 * 生產日報表元件
 * @param {Object} props
 * @param {Array} props.productionHistory - 生產歷史資料
 * @param {string} props.startDate - 開始日期
 * @param {string} props.endDate - 結束日期
 * @param {string} props.selectedShift - 選擇的班別
 * @param {Function} props.onDateChange - 日期變更回調
 * @param {Function} props.onShiftChange - 班別變更回調
 */
const DailyReportView = ({
    productionHistory,
    startDate,
    endDate,
    selectedShift,
    onDateChange,
    onShiftChange
}) => {
    // 篩選資料
    const filteredRecords = useMemo(() => {
        let records = filterByDateRange(productionHistory, startDate, endDate);
        records = filterByShift(records, selectedShift);
        return records;
    }, [productionHistory, startDate, endDate, selectedShift]);

    // 計算統計彙總
    const summary = useMemo(() => {
        return calculateDailySummary(filteredRecords);
    }, [filteredRecords]);

    // 匯出 Excel 功能（待實作）
    const handleExport = () => {
        alert('Excel 匯出功能開發中...');
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
                    <label>日期範圍：</label>
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

                    <label style={{ marginLeft: '20px' }}>班別：</label>
                    <select
                        value={selectedShift}
                        onChange={(e) => onShiftChange(e.target.value)}
                        className={styles.shiftSelect}
                    >
                        <option value="全部">全部</option>
                        <option value="A">A班</option>
                        <option value="B">B班</option>
                        <option value="C">C班</option>
                        <option value="Day">日班</option>
                        <option value="Night">夜班</option>
                    </select>
                </div>

                <div className={styles.actionButtons}>
                    <button onClick={handleExport} className={styles.btn}>📊 匯出 Excel</button>
                    <button onClick={handlePrint} className={`${styles.btn} ${styles.noPrint}`}>🖨️ 列印</button>
                </div>
            </div>

            {/* 統計彙總區 */}
            <div className={styles.summaryPanel}>
                <h3>📈 統計彙總</h3>
                <div className={styles.summaryGrid}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>總工單數</span>
                        <span className={styles.summaryValue}>{summary.totalOrders} 筆</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>總目標數量</span>
                        <span className={styles.summaryValue}>{formatNumber(summary.totalTarget)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>總良品數量</span>
                        <span className={styles.summaryValue}>{formatNumber(summary.totalGood)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>總不良數量</span>
                        <span className={styles.summaryValue}>{formatNumber(summary.totalDefect)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>平均良率</span>
                        <span className={styles.summaryValue}>{formatPercent(summary.avgYieldRate)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>平均達成率</span>
                        <span className={styles.summaryValue}>{formatPercent(summary.avgAchievementRate)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>總運轉時間</span>
                        <span className={styles.summaryValue}>{minutesToHHMM(summary.totalRunTime)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>總停車時間</span>
                        <span className={styles.summaryValue}>{minutesToHHMM(summary.totalStopTime)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>總停車次數</span>
                        <span className={styles.summaryValue}>{summary.totalStopCount} 次</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>平均 OEE</span>
                        <span className={styles.summaryValue}>{formatPercent(summary.avgOEE)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>稼動率</span>
                        <span className={styles.summaryValue}>{formatPercent(summary.utilization)}</span>
                    </div>
                </div>
            </div>

            {/* 明細表格 */}
            <div className={styles.tableContainer}>
                <table className={styles.reportTable}>
                    <thead>
                        <tr>
                            <th>序號</th>
                            <th>訂單號碼</th>
                            <th>客戶名稱</th>
                            <th>產品名稱</th>
                            <th>紙箱編號</th>
                            <th>班別</th>
                            <th>操作員</th>
                            <th>目標數量</th>
                            <th>良品數量</th>
                            <th>不良數量</th>
                            <th>良率(%)</th>
                            <th>達成率(%)</th>
                            <th>準備時間</th>
                            <th>運轉時間</th>
                            <th>停車時間</th>
                            <th>停車次數</th>
                            <th>平均車速</th>
                            <th>OEE(%)</th>
                            <th>完工時間</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length === 0 ? (
                            <tr>
                                <td colSpan="19" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                    📭 查無資料，請調整查詢條件
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
                                        <td className={styles.numCell}>{record.prepTime?.toFixed(1) || '-'} 分</td>
                                        <td className={styles.numCell}>{minutesToHHMM(record.runTime)}</td>
                                        <td className={styles.numCell}>{minutesToHHMM(record.stopTime)}</td>
                                        <td className={styles.numCell}>{record.stopCount}</td>
                                        <td className={styles.numCell}>{record.avgSpeed} 張/分</td>
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
                <p>列印時間：{formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')}</p>
                <p>統計區間：{startDate} ~ {endDate} | 班別：{selectedShift}</p>
            </div>
        </div>
    );
};

export default DailyReportView;
