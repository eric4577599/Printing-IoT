import React from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/Dashboard.module.css';

const StatusPanel = ({ 
    autoNext, activeTab, setActiveTab, machineSections,
    currentData, isPlcConnected, isMotorOn, stopReasons 
}) => {
    const { t } = useLanguage();

    return (
        <div className={styles.machineStatusPanel}>
                    {/* Auto Next Indicator */}
                    <div style={{
                        backgroundColor: autoNext ? 'var(--bg-block)' : 'var(--bg-secondary)',
                        color: autoNext ? 'var(--primary-blue)' : 'var(--text-secondary)',
                        padding: '8px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        borderBottom: '1px solid var(--border-color)'
                    }}>
                        {autoNext ? t('dashboard.schedule.autoNextOn') : t('dashboard.schedule.autoNextOff')}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                        <div
                            style={{
                                flex: 1,
                                padding: '8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: activeTab === 'status' ? 'var(--bg-panel)' : 'var(--bg-secondary)',
                                color: activeTab === 'status' ? 'var(--primary-blue)' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'status' ? '600' : 'normal',
                                borderBottom: activeTab === 'status' ? '2px solid var(--primary-blue)' : 'none'
                            }}
                            onClick={() => setActiveTab('status')}
                        >
                            {t('dashboard.machineStatus.title')}
                        </div>
                        <div
                            style={{
                                flex: 1,
                                padding: '8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: activeTab === 'reason' ? 'var(--bg-panel)' : 'var(--bg-secondary)',
                                color: activeTab === 'reason' ? 'var(--primary-blue)' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'reason' ? '600' : 'normal',
                                borderBottom: activeTab === 'reason' ? '2px solid var(--primary-blue)' : 'none'
                            }}
                            onClick={() => setActiveTab('reason')}
                        >
                            {t('dashboard.machineStatus.stopReason')}
                        </div>
                    </div>

                    {/* Machine Status - Dynamic Sections */}
                    {activeTab === 'status' ? (
                        <div className={styles.errorList} style={{ padding: '10px' }}>
                            {machineSections && machineSections.length > 0 ? (
                                machineSections.map((section, i) => {
                                    // Status Logic
                                    // 1. Fault maps to Red
                                    let isFault = false;
                                    if (section.errorSignal && currentData) {
                                        const signalVal = currentData[section.errorSignal];
                                        if (signalVal != undefined && signalVal == section.errorValue) {
                                            isFault = true;
                                        }
                                    }

                                    // 2. Run maps to Green
                                    let isRun = false;
                                    if (section.runSignal && currentData) {
                                        const signalVal = currentData[section.runSignal];
                                        if (signalVal != undefined && signalVal == section.runValue) {
                                            isRun = true;
                                        }
                                    }

                                    // 3. Fallback (Global Motor)
                                    // If no specific signals configured, use global IsMotorOn
                                    if (!section.errorSignal && !section.runSignal) {
                                        isFault = !(isPlcConnected && isMotorOn);
                                        isRun = !isFault;
                                    }

                                    // Determine Color
                                    let color = 'var(--text-secondary)'; // Grey
                                    if (isFault) color = 'var(--digital-text-red)';
                                    else if (isRun) color = 'var(--digital-text)'; // Green

                                    return (
                                        <div key={section.id || i} className={styles.errorItem}>
                                            <div className={styles.errorBox} style={{ backgroundColor: color }}></div>
                                            <span>{section.name}</span>
                                            <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: color }}>
                                                {isFault ? 'ERR' : (isRun ? 'RUN' : 'OFF')}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ color: '#888', textAlign: 'center' }}>{t('ui.messages.loading')}</div>
                            )}
                        </div>
                    ) : (
                        // Reason Tab
                        <div className={styles.errorList} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className={styles.statusHeaderRow} style={{ background: 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ flex: 1 }}>{t('dashboard.stopReasons.startTime')}</div>
                                <div style={{ flex: 1 }}>{t('dashboard.stopReasons.duration')}</div>
                                <div style={{ flex: 2 }}>{t('dashboard.stopReasons.reason')}</div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {stopReasons.length === 0 ? (
                                    <div style={{ padding: '16px', color: 'var(--text-secondary)', textAlign: 'center' }}>{t('ui.messages.noData')}</div>
                                ) : (
                                    stopReasons.map((stop, i) => (
                                        <div key={i} style={{ display: 'flex', borderBottom: '1px solid var(--bg-secondary)', padding: '8px 4px', fontSize: '0.9rem' }}>
                                            <div style={{ flex: 1, color: 'var(--text-primary)' }}>{stop.time}</div>
                                            <div style={{ flex: 1, color: 'var(--primary-blue)' }}>{stop.duration}</div>
                                            <div style={{ flex: 2, color: 'var(--digital-text-red)' }}>{stop.reason}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
        </div>
    );
};

export default StatusPanel;
