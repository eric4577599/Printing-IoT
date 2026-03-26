import React from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/Dashboard.module.css';

const SchedulePanel = ({ 
    orders, selectedOrderId, setSelectedOrderId, 
    isContinuousProduction, prepTimeSeconds, thresholdSettings, getPrepTimeColor,
    currentData, resetOffset,
    handleAddOrder, handleEditOrder, handleDeleteOrder, handleReorder 
}) => {
    const { t } = useLanguage();

    return (
        <div className={styles.schedulePanel} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '10px', padding: '10px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <button onClick={handleAddOrder} className={styles.actionButton}>{t('dashboard.schedule.addOrder')}</button>
                <button onClick={handleEditOrder} className={styles.actionButton}>{t('dashboard.schedule.editOrder')}</button>
                <button onClick={handleDeleteOrder} className={styles.actionButton} style={{ color: 'var(--status-error)' }}>{t('dashboard.schedule.deleteOrder')}</button>
                <button onClick={handleReorder} className={styles.actionButton} style={{ marginLeft: 'auto' }}>{t('dashboard.schedule.reorder')}</button>
            </div>

                    {/* Running Order Section (The Green Box) - Dynamic colors based on prep time */}
                    <div style={{ padding: '8px 12px', borderBottom: '2px solid var(--bg-secondary)', marginBottom: '4px' }}>
                        {(() => {
                            // 計算動態背景色和邊框色
                            let bgColor = 'var(--bg-primary)'; // 預設白色
                            let borderColor = 'var(--status-ok)'; // 預設綠色邊框

                            if (!isContinuousProduction && orders[0] && orders[0].id !== 'placeholder') {
                                // 未達連續生產：根據準備時間變化顏色
                                bgColor = getPrepTimeColor(prepTimeSeconds);
                                const stdPrepTimeSec = thresholdSettings.stdPrepTime * 60;
                                const yellowThresholdSec = stdPrepTimeSec * (thresholdSettings.prepTimeYellowThreshold / 100);

                                if (prepTimeSeconds < stdPrepTimeSec) {
                                    borderColor = 'var(--status-ok)'; // 綠色
                                } else if (prepTimeSeconds <= yellowThresholdSec) {
                                    borderColor = 'var(--status-warning)'; // 黃色
                                } else {
                                    borderColor = 'var(--status-error)'; // 紅色
                                }
                            }

                            // 計算剩餘數量和字體顏色
                            const currentQty = Math.floor(currentData.di1 - resetOffset);
                            const orderQty = orders[0]?.qty || 0;
                            const remaining = orderQty - currentQty;
                            const isNearComplete = remaining > 0 && remaining <= thresholdSettings.shortageThreshold;
                            const textColor = isNearComplete ? 'var(--status-ok)' : 'var(--text-primary)'; // 接近完成時字體變綠

                            return (
                                <div style={{
                                    border: `3px solid ${borderColor}`,
                                    borderRadius: '6px',
                                    backgroundColor: bgColor,
                                    minHeight: '60px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 10px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    transition: 'background-color 0.5s, border-color 0.5s'
                                }}>
                                    {(!orders[0] || orders[0].id === 'placeholder') ? (
                                        <div style={{ width: '100%', textAlign: 'center', color: '#999', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            【 {t('dashboard.monitor.idle')} 】 - {t('dashboard.monitor.waitForF3')}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: textColor }}>
                                            {/* Using same flex ratios as header for alignment */}
                                            <div style={{ flex: 0.8, color: borderColor }}>{t('dashboard.monitor.running')}</div>
                                            <div style={{ flex: 2 }}>{orders[0].customer || '-'}</div>
                                            <div style={{ flex: 1.5 }}>{orders[0].orderNo}</div>
                                            <div style={{ flex: 1.5 }}>{orders[0].boxNo}</div>
                                            <div style={{ flex: 1 }}>{orders[0].qty}</div>
                                            <div style={{ flex: 1.5 }}>{orders[0].msg || orders[0].productName}</div>
                                            <div style={{ flex: 1 }}>{orders[0].boxType || '-'}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Schedule List Header */}
                    <div className={styles.gridHeaderRow}>
                        <div style={{ flex: 0.8 }}>{t('dashboard.schedule.seqNo')}</div>
                        <div style={{ flex: 2 }}>{t('dashboard.schedule.customer')}</div>
                        <div style={{ flex: 1.5 }}>{t('dashboard.schedule.orderNo')}</div>
                        <div style={{ flex: 1.5 }}>{t('dashboard.schedule.boxNo')}</div>
                        <div style={{ flex: 1 }}>{t('dashboard.schedule.qty')}</div>
                        <div style={{ flex: 1.5 }}>{t('dashboard.schedule.productName')}</div>
                        <div style={{ flex: 1 }}>{t('dashboard.schedule.boxType')}</div>
                    </div>

                    {/* Render Order List (Queue Only - Index 1+) */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {orders.slice(1).map((order, index) => {
                            // original index = index + 1
                            const displaySeq = (index + 1) * 10;

                            return (
                                <div
                                    key={order.id}
                                    className={styles.gridRow}
                                    style={selectedOrderId === order.id ? { backgroundColor: '#e6f7ff' } : {}}
                                    onClick={() => setSelectedOrderId(order.id)} // Allow selecting queued items
                                >
                                    <div style={{ flex: 0.8 }}>{displaySeq}</div>
                                    <div style={{ flex: 2 }}>{order.customer || '-'}</div>
                                    <div style={{ flex: 1.5 }}>{order.orderNo}</div>
                                    <div style={{ flex: 1.5 }}>{order.boxNo}</div>
                                    <div style={{ flex: 1 }}>{order.qty}</div>
                                    <div style={{ flex: 1.5 }}>{order.msg || order.productName}</div>
                                    <div style={{ flex: 1 }}>{order.boxType || '-'}</div>
                                </div>
                            );
                        })}
                        {orders.length <= 1 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                                {t('dashboard.schedule.noQueuedOrders')}
                            </div>
                        )}
                        <div className={styles.gridFill}></div>
                    </div>
        </div>
    );
};

export default SchedulePanel;
