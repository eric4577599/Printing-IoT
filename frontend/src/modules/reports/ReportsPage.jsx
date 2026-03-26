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

// Mock Data matching screenshot style
const mockOrders = [
    { id: '005', client: 'aaa', orderNo: '123456789012', product: 'aaa', shift: 'A', speed: 0, qty: 2000, count: 1, good: 1, bad: 0, start: '2021/07/02 08:00:00', test: '2021...', status: 'Normal' },
    { id: '006', client: 'aaa', orderNo: '123456789012', product: 'aaa', shift: 'A', speed: 0, qty: 2000, count: 2, good: 2, bad: 0, start: '2021/07/02 21:51:27', test: '2021...', status: 'Normal' },
    { id: '007', client: '花東製米...', orderNo: '7100257721...', product: '', shift: 'A', speed: 70, qty: 1008, count: 1012, good: 1008, bad: 0, start: '2021/07/06 16:00:00', test: '2021...', status: 'Running' }, // active-like row
    { id: '009', client: '屏東縣蔬...', orderNo: '112233445566', product: '', shift: 'A', speed: -15, qty: 2000, count: 2002, good: 0, bad: 0, start: '2021/07/06 08:00:00', test: '2021...', status: 'Error' },
];

const mockStopLogs = {
    '005': [
        { start: '14:16:59', end: '14:19:14', code: '001', reason: '送紙歪斜 (Feed Skew)' }
    ],
    '007': []
};

const ReportsPage = () => {
    const [activeReport, setActiveReport] = useState('details');

    // 設定預設日期為今天
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [selectedShift, setSelectedShift] = useState('全部');

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

    const handleOpenUpload = () => {
        if (!selectedOrderId) {
            alert('請先選擇一筆訂單 (Please select an order first)');
            return;
        }
        const order = mockOrders.find(o => o.id === selectedOrderId);
        setEditData({ good: order.good, bad: order.bad });
        setShowUploadModal(true);
    };

    const handleSaveUpload = () => {
        alert(`Saved: Good=${editData.good}, Bad=${editData.bad}`);
        setShowUploadModal(false);
    };

    // Render "Production Details" Layout
    const renderDetailsView = () => {
        const selectedLogs = selectedOrderId ? mockStopLogs[selectedOrderId] || [] : [];

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
                            <button className={styles.btn} onClick={() => alert(`Querying from ${startDate} to ${endDate}`)}>確認 (Confirm)</button>
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
                        <div className={styles.headerCell} style={{ width: 150 }}>開始時間</div>
                        <div className={styles.headerCell} style={{ width: 50 }}>試車</div>
                    </div>
                    <div className={styles.tableBody}>
                        {mockOrders.map((order, index) => {
                            const isSelected = selectedOrderId === order.id;
                            // Based on screenshot, text color logic seems specific. 
                            // Let's use Pink for OrderNo/Client if not selected, and White if selected.
                            const rowStyle = `${styles.tableRow} ${isSelected ? styles.selectedRow : ''}`;
                            const textClass = isSelected ? '' : styles.textRed; // Use Red/Pink for ID/Client as seen in screenshot (pinkish)

                            return (
                                <div
                                    key={index}
                                    className={rowStyle}
                                    onClick={() => setSelectedOrderId(order.id)}
                                >
                                    <div className={`${styles.cell} ${styles.cellCenter}`} style={{ width: 30 }}><input type="checkbox" /></div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 50 }}>{order.id}...</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 120 }}>{order.client}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 140 }}>{order.orderNo}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ flex: 1 }}>{order.product}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 40 }}>{order.shift}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 50 }}>{order.speed}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 60 }}>{order.qty}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 60 }}>{order.count}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 60 }}>{order.good}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 60 }}>{order.bad}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 150 }}>{order.start}</div>
                                    <div className={`${styles.cell} ${textClass}`} style={{ width: 50 }}>{order.test}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Lower Grid: Stop Logs */}
                <div className={styles.lowerGridContainer}>
                    <div className={styles.tableHeader}>
                        <div className={styles.headerCell} style={{ flex: 1 }}>停車開始</div>
                        <div className={styles.headerCell} style={{ flex: 1 }}>停車結束</div>
                        <div className={styles.headerCell} style={{ flex: 1 }}>停車代碼</div>
                        <div className={styles.headerCell} style={{ flex: 3 }}>停車原因</div>
                    </div>
                    <div className={styles.tableBody}>
                        {selectedLogs.length === 0 ? (
                            <div style={{ padding: 10, textAlign: 'center', color: '#fff' }}></div>
                        ) : (
                            selectedLogs.map((log, idx) => (
                                <div key={idx} className={styles.tableRow} style={{ backgroundColor: '#fff' }}>
                                    <div className={styles.cell} style={{ flex: 1 }}>{log.start}</div>
                                    <div className={styles.cell} style={{ flex: 1 }}>{log.end}</div>
                                    <div className={styles.cell} style={{ flex: 1 }}>{log.code}</div>
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
