import React, { useState, useMemo } from 'react';
import styles from './StopReasonView.module.css';
import {
    filterByDateRange,
    groupStopReasonsByReason,
    minutesToHHMM,
    formatNumber
} from '../../utils/reportUtils';

/**
 * 停車原因分析元件
 * 支援時間區間篩選，按原因分類彙總，可展開顯示訂單細節
 */
const StopReasonView = ({ productionHistory }) => {
    const today = new Date().toISOString().split('T')[0];

    // 預設顯示近7天
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const defaultStart = weekAgo.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(today);
    const [expandedReasons, setExpandedReasons] = useState(new Set());

    // 篩選並分組停車原因
    const stopReasonSummaries = useMemo(() => {
        const filtered = filterByDateRange(productionHistory, startDate, endDate);
        return groupStopReasonsByReason(filtered);
    }, [productionHistory, startDate, endDate]);

    // 計算總計
    const totals = useMemo(() => {
        return {
            count: stopReasonSummaries.reduce((sum, r) => sum + r.count, 0),
            duration: stopReasonSummaries.reduce((sum, r) => sum + r.totalDuration, 0)
        };
    }, [stopReasonSummaries]);

    // 切換展開狀態
    const toggleExpand = (reason) => {
        setExpandedReasons(prev => {
            const next = new Set(prev);
            if (next.has(reason)) {
                next.delete(reason);
            } else {
                next.add(reason);
            }
            return next;
        });
    };

    // 全部展開/收合
    const toggleAll = () => {
        if (expandedReasons.size === stopReasonSummaries.length) {
            setExpandedReasons(new Set());
        } else {
            setExpandedReasons(new Set(stopReasonSummaries.map(r => r.reason)));
        }
    };

    // 匯出
    const handleExport = () => {
        alert('匯出功能開發中...');
    };

    return (
        <div className={styles.container}>
            {/* 控制列 */}
            <div className={styles.controlBar}>
                <div className={styles.filters}>
                    <span className={styles.label}>📅 時間區間:</span>
                    <input
                        type="date"
                        className={styles.dateInput}
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                    <span className={styles.label}>~</span>
                    <input
                        type="date"
                        className={styles.dateInput}
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </div>
                <div className={styles.actions}>
                    <button className={styles.btn} onClick={toggleAll}>
                        {expandedReasons.size === stopReasonSummaries.length ? '🔼 全部收合' : '🔽 全部展開'}
                    </button>
                    <button className={styles.btn} onClick={handleExport}>📊 匯出</button>
                </div>
            </div>

            {/* 報表標題 */}
            <div className={styles.reportHeader}>
                <h2>⚠️ 停車原因分析</h2>
                <div className={styles.summaryInfo}>
                    <span>總停車次數: <strong>{totals.count}</strong></span>
                    <span>總停車時間: <strong>{minutesToHHMM(totals.duration)}</strong></span>
                </div>
            </div>

            {/* 停車原因列表 */}
            <div className={styles.reasonList}>
                {stopReasonSummaries.length === 0 ? (
                    <div className={styles.emptyMessage}>
                        📋 此時間區間內無停車記錄
                    </div>
                ) : (
                    stopReasonSummaries.map((item, idx) => {
                        const isExpanded = expandedReasons.has(item.reason);
                        const percentage = totals.count > 0 ? (item.count / totals.count * 100).toFixed(1) : 0;

                        return (
                            <div key={idx} className={styles.reasonGroup}>
                                {/* 原因標題行（可點擊展開） */}
                                <div
                                    className={styles.reasonHeader}
                                    onClick={() => toggleExpand(item.reason)}
                                >
                                    <div className={styles.expandIcon}>
                                        {isExpanded ? '▼' : '▶'}
                                    </div>
                                    <div className={styles.reasonName}>
                                        {item.code && <span className={styles.reasonCode}>[{item.code}]</span>}
                                        {item.reason}
                                    </div>
                                    <div className={styles.reasonStats}>
                                        <span className={styles.count}>{item.count} 次</span>
                                        <span className={styles.percentage}>({percentage}%)</span>
                                        <span className={styles.duration}>{minutesToHHMM(item.totalDuration)}</span>
                                    </div>
                                    <div className={styles.progressBar}>
                                        <div
                                            className={styles.progressFill}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>

                                {/* 展開的訂單細節 */}
                                {isExpanded && (
                                    <div className={styles.orderDetails}>
                                        <div className={styles.detailHeader}>
                                            <span>日期</span>
                                            <span>訂單編號</span>
                                            <span>客戶</span>
                                            <span>品名</span>
                                            <span>時間</span>
                                            <span>時長</span>
                                        </div>
                                        {item.records.map((record, rIdx) => (
                                            <div key={rIdx} className={styles.detailRow}>
                                                <span>{record.date?.split('T')[0] || '-'}</span>
                                                <span className={styles.orderNo}>{record.orderNo || '-'}</span>
                                                <span>{record.customer || '-'}</span>
                                                <span>{record.productName || '-'}</span>
                                                <span>{record.time || '-'}</span>
                                                <span className={styles.durationCell}>{record.duration || '-'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default StopReasonView;
