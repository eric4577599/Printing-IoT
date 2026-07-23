import React, { useState, useEffect, useMemo } from 'react';
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

const reportTypes = [
    { id: 'details', label: '生產明細 (Production Details)' },
    { id: 'daily', label: '生產日報表 (Daily Report)' },
    { id: 'monthly', label: '生產月報表 (Monthly Report)' },
    { id: 'stop', label: '停車原因 (Stop Reasons)' },
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
    const [activeReport, setActiveReport] = useState('details');

    // 設定預設日期為今天
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [selectedShift, setSelectedShift] = useState('全部');

    // 生產明細實際套用的查詢區間(按「確認」才更新,與輸入框暫存值分離)
    const [appliedRange, setAppliedRange] = useState({ start: today, end: today });

    // 載入生產歷史資料
    const [productionHistory, setProductionHistory] = useState([]);

    useEffect(() => {
        try {
            const history = JSON.parse(localStorage.getItem('productionHistory') || '[]');
            setProductionHistory(history);
        } catch (err) {
            console.error('Failed to load production history:', err);
            setProductionHistory([]);
        }
    }, []);


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
            alert('請先選擇一筆訂單 (Please select an order first)');
            return;
        }
        const record = productionHistory.find(r => r.id === selectedOrderId);
        if (!record) return;
        setEditData({ good: record.goodQty ?? 0, bad: record.defectQty ?? 0 });
        setShowUploadModal(true);
    };

    // 手動上傳報工:更新所選紀錄的良品/不良數並寫回 localStorage
    const handleSaveUpload = () => {
        const goodQty = Number(editData.good) || 0;
        const defectQty = Number(editData.bad) || 0;
        const updated = productionHistory.map(r =>
            r.id === selectedOrderId ? { ...r, goodQty, defectQty } : r
        );
        setProductionHistory(updated);
        try {
            localStorage.setItem('productionHistory', JSON.stringify(updated));
        } catch (err) {
            console.error('Failed to save production history:', err);
        }
        setShowUploadModal(false);
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
                            <span className={styles.label}>生產日期 (Date):</span>
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
                            <button className={styles.btn} onClick={() => { setAppliedRange({ start: startDate, end: endDate }); setSelectedOrderId(null); }}>確認 (Confirm)</button>
                        </div>

                        <div className={styles.actionButtons}>
                            <button className={styles.btn} onClick={handleOpenUpload}>手動上傳報工</button>
                            <button className={styles.btn}>匯出 (Export)</button>
                            <button className={styles.btn}>離開</button>
                        </div>
                    </div>
                </div>

                {/* Upper Grid: Order List */}
                <div className={styles.upperGridContainer}>
                    <div className={styles.tableHeader}>
                        <div className={styles.headerCell} style={{ width: 30 }}>選</div>
                        <div className={styles.headerCell} style={{ width: 50 }}>序號</div>
                        <div className={styles.headerCell} style={{ width: 120 }}>客戶名稱</div>
                        <div className={styles.headerCell} style={{ width: 140 }}>訂單號碼</div>
                        <div className={styles.headerCell} style={{ flex: 1 }}>品名</div>
                        <div className={styles.headerCell} style={{ width: 40 }}>班別</div>
                        <div className={styles.headerCell} style={{ width: 50 }}>車速</div>
                        <div className={styles.headerCell} style={{ width: 60 }}>數量</div>
                        <div className={styles.headerCell} style={{ width: 60 }}>計件數</div>
                        <div className={styles.headerCell} style={{ width: 60 }}>良品</div>
                        <div className={styles.headerCell} style={{ width: 60 }}>不良</div>
                        <div className={styles.headerCell} style={{ width: 150 }}>完工時間</div>
                        <div className={styles.headerCell} style={{ width: 50 }}>OEE</div>
                    </div>
                    <div className={styles.tableBody}>
                        {detailRecords.length === 0 ? (
                            <div style={{ padding: 10, textAlign: 'center', color: '#888' }}>查詢區間內無生產紀錄</div>
                        ) : detailRecords.map((record, index) => {
                            const isSelected = selectedOrderId === record.id;
                            const rowStyle = `${styles.tableRow} ${isSelected ? styles.selectedRow : ''}`;
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
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Lower Grid: Stop Logs */}
                <div className={styles.lowerGridContainer}>
                    <div className={styles.tableHeader}>
                        <div className={styles.headerCell} style={{ flex: 1 }}>停車開始</div>
                        <div className={styles.headerCell} style={{ flex: 1 }}>持續時間</div>
                        <div className={styles.headerCell} style={{ flex: 3 }}>停車原因</div>
                    </div>
                    <div className={styles.tableBody}>
                        {selectedLogs.length === 0 ? (
                            <div style={{ padding: 10, textAlign: 'center', color: '#888' }}>{selectedOrderId ? '此筆紀錄無停車記錄' : ''}</div>
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
                                    <span className={styles.inputLabel}>良品</span>
                                    <input
                                        type="number" className={styles.textInput}
                                        value={editData.good}
                                        onChange={e => setEditData({ ...editData, good: e.target.value })}
                                    />
                                </div>
                                <div className={styles.inputField}>
                                    <span className={styles.inputLabel}>不良</span>
                                    <input
                                        type="number" className={styles.textInput}
                                        value={editData.bad}
                                        onChange={e => setEditData({ ...editData, bad: e.target.value })}
                                    />
                                </div>
                                <div className={styles.modalFooter}>
                                    <button className={styles.btn} onClick={handleSaveUpload}>確定</button>
                                    <button className={styles.btn} onClick={() => setShowUploadModal(false)}>取消</button>
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
                <div className={styles.sidebarHeader}>報表類型</div>
                {reportTypes.map(rt => (
                    <div
                        key={rt.id}
                        className={`${styles.menuItem} ${activeReport === rt.id ? styles.active : ''}`}
                        onClick={() => setActiveReport(rt.id)}
                    >
                        {rt.label}
                    </div>
                ))}
            </div>

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
                />
            )}

            {activeReport === 'monthly' && (
                <MonthlyReportView productionHistory={productionHistory} />
            )}

            {activeReport === 'stop' && (
                <StopReasonView productionHistory={productionHistory} />
            )}
        </div>
    );
};

export default ReportsPage;
