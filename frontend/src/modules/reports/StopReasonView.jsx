import React, { useState, useMemo, useEffect } from 'react';
import styles from './StopReasonView.module.css';
import {
    filterByDateRange,
    groupStopReasonsByReason,
    minutesToHHMM,
    formatNumber
} from '../../utils/reportUtils';
import { useLanguage } from '../language/LanguageContext';
import { useProductionSummary } from '../../hooks/useProductionSummary';
import SummarySourceNote from './SummarySourceNote';

/**
 * 停車原因分析元件
 * 支援時間區間篩選，按原因分類彙總，可展開顯示訂單細節
 *
 * @param {Array} productionHistory - 生產紀錄陣列(父層提供)
 * @param {Function} [onRangeChange] - S4 / F4.1:選用回呼,以 { startDate, endDate } 回報本元件
 *        自持的時間區間(預設近 7 天),讓父層能把該區間下推給後端查詢。未傳入時行為不變。
 * @param {number} [localOnlyCount=0] - S8:區間內僅存在本機的筆數,大於 0 時不採用後端彙總
 */
const StopReasonView = ({ productionHistory, onRangeChange, localOnlyCount = 0 }) => {
    const { t } = useLanguage();
    const today = new Date().toISOString().split('T')[0];

    // 預設顯示近7天
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const defaultStart = weekAgo.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(today);
    const [expandedReasons, setExpandedReasons] = useState(new Set());

    // S4 / F4.1:本元件的區間是自持的(預設近 7 天),初始化與每次變更都往上回報一次,
    // 否則父層只會抓到明細分頁的區間,停車原因頁會顯示不出資料。
    useEffect(() => {
        if (typeof onRangeChange === 'function') {
            onRangeChange({ startDate, endDate });
        }
    }, [startDate, endDate, onRangeChange]);

    // 前端分組:S8 之後仍然必要 —— 它是備援,**而且是展開列明細的唯一來源**。
    // 彙總端點刻意不回下鑽明細(回了會讓回應大小隨區間內訂單數無上限成長),
    // 所以「哪幾張單」永遠從這裡取(見 spec20260906-s8-v1 §1.3)。
    const localSummaries = useMemo(() => {
        const filtered = filterByDateRange(productionHistory, startDate, endDate);
        return groupStopReasonsByReason(filtered);
    }, [productionHistory, startDate, endDate]);

    // 後端彙總(S8):次數與總時長的單一事實來源
    const { data: backendSummaries, source, reason: sourceReason } = useProductionSummary({
        kind: 'stop-reasons',
        from: startDate,
        to: endDate,
        localOnlyCount,
    });

    // 採用後端的次數 / 時長,再把展開列要的訂單明細從前端分組接回去。
    // 欄位名沿用既有的 totalDuration,渲染層不必改。
    const stopReasonSummaries = useMemo(() => {
        if (source !== 'backend' || !Array.isArray(backendSummaries)) return localSummaries;

        const drilldown = new Map(localSummaries.map(g => [g.reason, g.records]));
        return backendSummaries.map(g => ({
            reason: g.reason,
            code: g.code,
            count: g.count,
            totalDuration: g.totalDurationMinutes,
            records: drilldown.get(g.reason) || [],
        }));
    }, [source, backendSummaries, localSummaries]);

    // 後端回應不是陣列(改版、走錯端點)時已在上面退回前端分組,
    // 畫面就不可以還說「數字來自後端」,一律以降級呈現。
    const backendUsable = source === 'backend' && Array.isArray(backendSummaries);
    const effectiveSource = backendUsable ? 'backend' : 'local';
    const effectiveReason = backendUsable ? null : (source === 'backend' ? 'error' : sourceReason);

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
        alert(t('reportView.alert.exportWip'));
    };

    return (
        <div className={styles.container}>
            {/* 控制列 */}
            <div className={styles.controlBar}>
                <div className={styles.filters}>
                    <span className={styles.label}>📅 {t('reportView.stop.timeRange')}:</span>
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
                        {expandedReasons.size === stopReasonSummaries.length ? `🔼 ${t('reportView.btn.collapseAll')}` : `🔽 ${t('reportView.btn.expandAll')}`}
                    </button>
                    <button className={styles.btn} onClick={handleExport}>📊 {t('reportView.btn.export')}</button>
                </div>
            </div>

            {/* 報表標題 */}
            <div className={styles.reportHeader}>
                <h2>⚠️ {t('reportView.stop.title')}</h2>
                <div className={styles.summaryInfo}>
                    <span>{t('reportView.stop.totalCount')}: <strong>{totals.count}</strong></span>
                    <span>{t('reportView.stop.totalTime')}: <strong>{minutesToHHMM(totals.duration)}</strong></span>
                </div>
                <SummarySourceNote source={effectiveSource} reason={effectiveReason} />
            </div>

            {/* 停車原因列表 */}
            <div className={styles.reasonList}>
                {stopReasonSummaries.length === 0 ? (
                    <div className={styles.emptyMessage}>
                        📋 {t('reportView.empty.noStopInRange')}
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
                                        <span className={styles.count}>{item.count} {t('reportView.unit.times')}</span>
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
                                            <span>{t('reportView.col.date')}</span>
                                            <span>{t('reportView.col.orderNo')}</span>
                                            <span>{t('reportView.col.customer')}</span>
                                            <span>{t('reportView.col.productName')}</span>
                                            <span>{t('reportView.col.time')}</span>
                                            <span>{t('reportView.col.durationShort')}</span>
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
