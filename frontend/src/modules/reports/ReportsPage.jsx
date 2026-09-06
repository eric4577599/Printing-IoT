import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ReportsPage.module.css';
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
import DailyReportView from './DailyReportView';
import MonthlyReportView from './MonthlyReportView';
import StopReasonView from './StopReasonView';
import { useLanguage } from '../language/LanguageContext';
import { useProductionRecords, patchLocalProductionRecord } from '../../hooks/useProductionRecords';

// 報表類型清單:label 於元件內以 t('reportView.tab.<id>') 動態取得
const reportTypes = [
    { id: 'details' },
    { id: 'daily' },
    { id: 'monthly' },
    { id: 'stop' },
];

// 格式化完工時間戳為 YYYY/MM/DD HH:mm:ss(顯示用)
const formatFinishedAt = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const ReportsPage = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [activeReport, setActiveReport] = useState('details');

    // 設定預設日期為今天
    // 修正:原用 toISOString()(UTC),台灣(UTC+8)在 00:00-07:59 會取到前一天。改用本地時區。
    const today = (() => {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    })();
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [selectedShift, setSelectedShift] = useState('全部');

    // 生產明細實際套用的查詢區間(按「確認」才更新,與輸入框暫存值分離)
    const [appliedRange, setAppliedRange] = useState({ start: today, end: today });

    // S4 / F4.1:月報與停車原因頁的區間是元件內部自持的,由 onRangeChange 回報上來,
    // 否則父層只會抓明細分頁的區間,那兩頁會顯示不出資料(spec §1.2 的坑)。
    const [monthlyRange, setMonthlyRange] = useState(null);
    const [stopRange, setStopRange] = useState(null);

    /**
     * 接收月報元件回報的區間
     * @param {{ startDate: string, endDate: string }} range - 該元件當前的月份首末日
     * @returns {void}
     * @description 值相同時回傳原物件,避免 setState 造成無限重繪 → 無限重抓。
     */
    const handleMonthlyRangeChange = useCallback(({ startDate: s, endDate: e }) => {
        setMonthlyRange(prev => (prev && prev.startDate === s && prev.endDate === e) ? prev : { startDate: s, endDate: e });
    }, []);

    /**
     * 接收停車原因元件回報的區間
     * @param {{ startDate: string, endDate: string }} range - 該元件當前的起訖日
     * @returns {void}
     */
    const handleStopRangeChange = useCallback(({ startDate: s, endDate: e }) => {
        setStopRange(prev => (prev && prev.startDate === s && prev.endDate === e) ? prev : { startDate: s, endDate: e });
    }, []);

    // 依當前分頁決定要向後端抓哪個區間(班別不下推,仍由 filterByShift 在前端處理)
    const fetchRange = useMemo(() => {
        switch (activeReport) {
            case 'daily':
                return { from: startDate, to: endDate };
            case 'monthly':
                return monthlyRange
                    ? { from: monthlyRange.startDate, to: monthlyRange.endDate }
                    : { from: appliedRange.start, to: appliedRange.end };
            case 'stop':
                return stopRange
                    ? { from: stopRange.startDate, to: stopRange.endDate }
                    : { from: appliedRange.start, to: appliedRange.end };
            case 'details':
            default:
                return { from: appliedRange.start, to: appliedRange.end };
        }
    }, [activeReport, startDate, endDate, appliedRange, monthlyRange, stopRange]);

    // S4 / F4.1:改由共用 hook 供資料(後端為主、本機快取補洞),不再直讀 localStorage
    const {
        records: productionHistory,
        isLoading,
        error,
        isDegraded,
        truncated,
        localOnlyCount,
        reload,
    } = useProductionRecords({ from: fetchRange.from, to: fetchRange.to });


    // Selection
    const [selectedOrderId, setSelectedOrderId] = useState(null);

    // Modal State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editData, setEditData] = useState({ good: 0, bad: 0 });

    // Load Formula Settings
    useEffect(() => {
        const savedSettings = localStorage.getItem('formulaSettings');
        if (savedSettings) {
            console.log('Loaded Formula Settings:', JSON.parse(savedSettings));
            // Future: Use these to calculate derived columns like OEE or highlights
        }
    }, []);

    // 生產明細:依已套用的查詢區間過濾真實生產紀錄
    const detailRecords = useMemo(
        () => filterByDateRange(productionHistory, appliedRange.start, appliedRange.end),
        [productionHistory, appliedRange]
    );

    const handleOpenUpload = () => {
        if (!selectedOrderId) {
            alert(t('reportView.alert.selectOrder'));
            return;
        }
        const record = productionHistory.find(r => r.id === selectedOrderId);
        if (!record) return;
        // S4 / F4.1:後端沒有實績修改端點,只改本機會在重整後被後端值覆寫,
        // 等同假裝存檔成功 —— 因此對後端列直接阻擋,不寫任何儲存層。
        if (record.source === 'backend') {
            alert(t('reportView.alert.backendRecordReadOnly'));
            return;
        }
        setEditData({ good: record.goodQty ?? 0, bad: record.defectQty ?? 0 });
        setShowUploadModal(true);
    };

    // 手動上傳報工:更新所選「本機列」的良品/不良數並寫回 localStorage
    // (本輪維持只寫本機快取的現狀;後端列在 handleOpenUpload 就已擋掉,此處再守一次)
    const handleSaveUpload = () => {
        const goodQty = Number(editData.good) || 0;
        const defectQty = Number(editData.bad) || 0;
        const target = productionHistory.find(r => r.id === selectedOrderId);
        if (!target || target.source === 'backend') {
            alert(t('reportView.alert.backendRecordReadOnly'));
            setShowUploadModal(false);
            return;
        }
        patchLocalProductionRecord(selectedOrderId, { goodQty, defectQty });
        setShowUploadModal(false);
        // 存檔後重取,讓率值以現行公式重算過的結果回到畫面(不只改本地 state)
        reload();
    };

    // 匯出生產明細為 CSV(修正:原「匯出」按鈕無 handler)
    const handleExport = () => {
        if (detailRecords.length === 0) {
            alert(t('reportView.alert.noExport'));
            return;
        }
        // S4 / F4.1:多一欄「資料來源」,讓匯出檔也能分辨後端列與本機快取列的口徑
        const headers = ['序號', '客戶名稱', '訂單號碼', '品名', '班別', '車速', '數量', '計件數', '良品', '不良', '完工時間', 'OEE', '資料來源'];
        const rows = detailRecords.map((r, i) => [
            i + 1, r.customer, r.orderNo, r.productName, r.shift, r.avgSpeed,
            r.targetQty, (r.goodQty || 0) + (r.defectQty || 0), r.goodQty, r.defectQty,
            formatFinishedAt(r.finishedAt), r.oee != null ? `${r.oee}%` : '-',
            r.source === 'local' ? t('reportView.source.local') : t('reportView.source.backend')
        ]);
        const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
        // 加 BOM 讓 Excel 正確辨識 UTF-8
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `production_details_${appliedRange.start}_${appliedRange.end}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 離開報表頁,返回即時監控(修正:原「離開」按鈕無 handler)
    const handleLeave = () => navigate('/');

    /**
     * 渲染資料狀態區(S4 / spec §5)
     * @returns {JSX.Element} 主狀態(載入中 / 錯誤 / 無資料,三者擇一)+ 可疊加的警示列
     * @description 主狀態三種措辭必須可區分 —— 查詢失敗不可看起來像沒生產。
     *              警示列與正常狀態並存,且可同時出現多條(降級 / 未取完 / 本機列)。
     *              報表內容一律照常渲染,月報與停車原因元件才有機會回報自己的區間。
     */
    const renderDataState = () => {
        const hasRecords = productionHistory.length > 0;
        return (
            <div className={styles.stateArea}>
                {isLoading && (
                    <div className={styles.stateLoading} data-testid="state-loading">{t('reportView.state.loading')}</div>
                )}
                {!isLoading && isDegraded && !hasRecords && (
                    <div className={styles.stateError} data-testid="state-error">
                        {t('reportView.state.error')}
                        <button className={styles.btn} onClick={reload}>{t('reportView.btn.retry')}</button>
                    </div>
                )}
                {!isLoading && !error && !hasRecords && (
                    <div className={styles.stateEmpty} data-testid="state-empty">{t('reportView.state.empty')}</div>
                )}
                {!isLoading && isDegraded && hasRecords && (
                    <div className={styles.stateWarn} data-testid="alert-degraded">
                        {t('reportView.state.degraded')}
                        <button className={styles.btn} onClick={reload}>{t('reportView.btn.retry')}</button>
                    </div>
                )}
                {truncated && (
                    <div className={styles.stateWarn} data-testid="alert-truncated">
                        {t('reportView.state.truncated')}:{productionHistory.length}
                    </div>
                )}
                {localOnlyCount > 0 && (
                    <div className={styles.stateWarn} data-testid="alert-local-only">
                        {localOnlyCount} {t('reportView.state.localOnly')}
                    </div>
                )}
            </div>
        );
    };

    // Render "Production Details" Layout
    const renderDetailsView = () => {
        const selectedRecord = detailRecords.find(r => r.id === selectedOrderId);
        const selectedLogs = selectedRecord?.stopReasons || [];

        return (
            <div className={styles.content}>
                {/* Control Bar */}
                <div className={styles.controlBar}>
                    <div className={styles.topRow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className={styles.label}>{t('reportView.label.date')}:</span>
                            <input
                                type="date"
                                className={styles.dateInput}
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                            <span>~</span>
                            <input
                                type="date"
                                className={styles.dateInput}
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                            <button className={styles.btn} onClick={() => { setAppliedRange({ start: startDate, end: endDate }); setSelectedOrderId(null); }}>{t('reportView.btn.confirm')}</button>
                        </div>

                        <div className={styles.actionButtons}>
                            <button className={styles.btn} onClick={handleOpenUpload}>{t('reportView.btn.manualUpload')}</button>
                            <button className={styles.btn} onClick={handleExport}>{t('reportView.btn.export')}</button>
                            <button className={styles.btn} onClick={handleLeave}>{t('reportView.btn.leave')}</button>
                        </div>
                    </div>
                </div>

                {/* Upper Grid: Order List */}
                <div className={styles.upperGridContainer}>
                    <div className={styles.tableHeader}>
                        <div className={styles.headerCell} style={{ width: 30 }}>{t('reportView.col.select')}</div>
                        <div className={styles.headerCell} style={{ width: 50 }}>{t('reportView.col.seq')}</div>
                        <div className={styles.headerCell} style={{ width: 120 }}>{t('reportView.col.customer')}</div>
                        <div className={styles.headerCell} style={{ width: 140 }}>{t('reportView.col.orderNo')}</div>
                        <div className={styles.headerCell} style={{ flex: 1 }}>{t('reportView.col.productName')}</div>
                        <div className={styles.headerCell} style={{ width: 40 }}>{t('reportView.col.shift')}</div>
                        <div className={styles.headerCell} style={{ width: 50 }}>{t('reportView.col.speed')}</div>
                        <div className={styles.headerCell} style={{ width: 60 }}>{t('reportView.col.qty')}</div>
                        <div className={styles.headerCell} style={{ width: 60 }}>{t('reportView.col.countQty')}</div>
                        <div className={styles.headerCell} style={{ width: 60 }}>{t('reportView.col.good')}</div>
                        <div className={styles.headerCell} style={{ width: 60 }}>{t('reportView.col.defect')}</div>
                        <div className={styles.headerCell} style={{ width: 150 }}>{t('reportView.col.finishedAt')}</div>
                        <div className={styles.headerCell} style={{ width: 50 }}>OEE</div>
                        <div className={styles.headerCell} style={{ width: 80 }}>{t('reportView.col.source')}</div>
                    </div>
                    <div className={styles.tableBody}>
                        {detailRecords.length === 0 ? (
                            <div style={{ padding: 10, textAlign: 'center', color: '#888' }}>{t('reportView.empty.noRecords')}</div>
                        ) : detailRecords.map((record, index) => {
                            const isSelected = selectedOrderId === record.id;
                            const isLocalOnly = record.source === 'local';
                            // 僅存在本機快取的列以列樣式與來源欄雙重標示(spec §5)
                            const rowStyle = `${styles.tableRow} ${isSelected ? styles.selectedRow : ''} ${isLocalOnly ? styles.localRow : ''}`;
                            const textClass = isSelected ? '' : styles.textRed;

                            return (
                                <div
                                    key={record.id}
                                    className={rowStyle}
                                    onClick={() => setSelectedOrderId(record.id)}
                                >
                                    <div className={`${styles.cell} ${styles.cellCenter}`} style={{ width: 30 }}><input type="checkbox" checked={isSelected} readOnly /></div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 50 }}>{index + 1}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 120 }}>{record.customer}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 140 }}>{record.orderNo}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ flex: 1 }}>{record.productName}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 40 }}>{record.shift}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 50 }}>{record.avgSpeed}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 60 }}>{record.targetQty}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 60 }}>{(record.goodQty || 0) + (record.defectQty || 0)}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 60 }}>{record.goodQty}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 60 }}>{record.defectQty}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 150 }}>{formatFinishedAt(record.finishedAt)}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 50 }}>{record.oee != null ? `${record.oee}%` : '-'}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 80 }}>{isLocalOnly ? t('reportView.source.local') : t('reportView.source.backend')}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Lower Grid: Stop Logs */}
                <div className={styles.lowerGridContainer}>
                    <div className={styles.tableHeader}>
                        <div className={styles.headerCell} style={{ flex: 1 }}>{t('reportView.col.stopStart')}</div>
                        <div className={styles.headerCell} style={{ flex: 1 }}>{t('reportView.col.duration')}</div>
                        <div className={styles.headerCell} style={{ flex: 3 }}>{t('reportView.col.stopReason')}</div>
                    </div>
                    <div className={styles.tableBody}>
                        {selectedLogs.length === 0 ? (
                            <div style={{ padding: 10, textAlign: 'center', color: '#888' }}>{selectedOrderId ? t('reportView.empty.noStopRecords') : ''}</div>
                        ) : (
                            selectedLogs.map((log, idx) => (
                                <div key={idx} className={styles.tableRow} style={{ backgroundColor: '#fff' }}>
                                    <div className={styles.cell} style={{ flex: 1 }}>{log.time}</div>
                                    <div className={styles.cell} style={{ flex: 1 }}>{log.duration}</div>
                                    <div className={styles.cell} style={{ flex: 3 }}>{log.reason}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Manual Upload Modal */}
                {showUploadModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalWindow}>
                            <div className={styles.modalHeader}>
                                <button className={styles.closeBtn} onClick={() => setShowUploadModal(false)}>×</button>
                            </div>
                            <div className={styles.modalBody}>
                                <div className={styles.inputField}>
                                    <span className={styles.inputLabel}>{t('reportView.label.good')}</span>
                                    <input
                                        type="number" className={styles.textInput}
                                        value={editData.good}
                                        onChange={e => setEditData({ ...editData, good: e.target.value })}
                                    />
                                </div>
                                <div className={styles.inputField}>
                                    <span className={styles.inputLabel}>{t('reportView.label.defect')}</span>
                                    <input
                                        type="number" className={styles.textInput}
                                        value={editData.bad}
                                        onChange={e => setEditData({ ...editData, bad: e.target.value })}
                                    />
                                </div>
                                <div className={styles.modalFooter}>
                                    <button className={styles.btn} onClick={handleSaveUpload}>{t('reportView.btn.ok')}</button>
                                    <button className={styles.btn} onClick={() => setShowUploadModal(false)}>{t('reportView.btn.cancel')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>{t('reportView.label.reportType')}</div>
                {reportTypes.map(rt => (
                    <div
                        key={rt.id}
                        className={`${styles.menuItem} ${activeReport === rt.id ? styles.active : ''}`}
                        onClick={() => setActiveReport(rt.id)}
                    >
                        {t(`reportView.tab.${rt.id}`)}
                    </div>
                ))}
            </div>

            <div className={styles.mainArea}>
            {/* 資料狀態(載入中 / 錯誤 / 無資料)與警示列(降級 / 未取完 / 本機列) */}
            {renderDataState()}

            {/* 根據選擇的報表類型渲染不同內容 */}
            {activeReport === 'details' && renderDetailsView()}

            {activeReport === 'daily' && (
                <DailyReportView
                    productionHistory={productionHistory}
                    startDate={startDate}
                    endDate={endDate}
                    selectedShift={selectedShift}
                    onDateChange={(type, value) => {
                        if (type === 'start') setStartDate(value);
                        else setEndDate(value);
                    }}
                    onShiftChange={(shift) => setSelectedShift(shift)}
                    localOnlyCount={localOnlyCount}
                />
            )}

            {activeReport === 'monthly' && (
                <MonthlyReportView productionHistory={productionHistory} onRangeChange={handleMonthlyRangeChange} localOnlyCount={localOnlyCount} />
            )}

            {activeReport === 'stop' && (
                <StopReasonView productionHistory={productionHistory} onRangeChange={handleStopRangeChange} localOnlyCount={localOnlyCount} />
            )}
            </div>
        </div>
    );
};

export default ReportsPage;
