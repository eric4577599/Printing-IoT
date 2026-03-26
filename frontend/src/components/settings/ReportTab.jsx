import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/SettingsPage.module.css';

const ReportTab = () => {
    const { t } = useLanguage();

    // --- Report Settings State ---
    const [reportSettings, setReportSettings] = useState(() => {
        const saved = localStorage.getItem('reportSettings');
        return saved ? JSON.parse(saved) : {
            dayCutoffTime: '07:30:00',
            exceptionFilters: ['休息', '點心', '支援'],
            smallBatchQty: 500
        };
    });

    const handleReportChange = (key, value) => {
        setReportSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem('reportSettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    const handleAddFilter = () => {
        const keyword = prompt('請輸入要排除的停機原因關鍵字 (Enter Exception Keyword):');
        if (keyword && !reportSettings.exceptionFilters.includes(keyword)) {
            const newFilters = [...reportSettings.exceptionFilters, keyword];
            handleReportChange('exceptionFilters', newFilters);
        }
    };

    const handleDeleteFilter = (keyword) => {
        const newFilters = reportSettings.exceptionFilters.filter(k => k !== keyword);
        handleReportChange('exceptionFilters', newFilters);
    };


    // --- Render Logic ---
    return (
        <div className={styles.tabContent} style={{ height: '100%', overflowY: 'auto' }}>
            <h3>{t('settings.report.title')}</h3>
            <p className={styles.description}>{t('settings.report.desc')}</p>

            {/* 1. Time Boundary */}
            <div className={styles.settingGroup}>
                <h4>{t('settings.report.timeBoundary')}</h4>
                <div className={styles.inputRow}>
                    <label>跨天判定基準時間 (Day Cutoff Time):</label>
                    <input
                        type="time"
                        step="1"
                        value={reportSettings.dayCutoffTime}
                        onChange={e => handleReportChange('dayCutoffTime', e.target.value)}
                    />
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>(預設 07:30:00)</span>
                </div>
            </div>

            {/* 2. Small Batch Definition */}
            <div className={styles.settingGroup}>
                <h4>小量產定義 (Small Batch Definition)</h4>
                <div className={styles.inputRow}>
                    <label>小量產判定數量 (Low Product Qty):</label>
                    <input
                        type="number"
                        value={reportSettings.smallBatchQty}
                        onChange={e => handleReportChange('smallBatchQty', Number(e.target.value))}
                    />
                    <span>張 (Sheets)</span>
                </div>
                <p style={{ marginTop: '5px', color: '#666', fontSize: '0.9rem' }}>
                    * 訂單數量小於此值將被標記為小量產，並獨立統計平均批量。
                </p>
            </div>

            {/* 3. Exception Filters */}
            <div className={styles.settingGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4>異常過濾 (Exception Filters)</h4>
                    <button className={styles.btn} onClick={handleAddFilter}>+ 新增關鍵字 (Add Keyword)</button>
                </div>
                <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '10px' }}>
                    * 統計停機時間時，將自動排除包含以下關鍵字的紀錄：
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {reportSettings.exceptionFilters.map((keyword, idx) => (
                        <span key={idx} style={{
                            padding: '4px 10px',
                            backgroundColor: '#e3f2fd',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#1565c0',
                            fontWeight: '500'
                        }}>
                            {keyword}
                            <button
                                onClick={() => handleDeleteFilter(keyword)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#d32f2f',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '1.0rem',
                                    lineHeight: 1
                                }}
                            >×</button>
                        </span>
                    ))}
                    {reportSettings.exceptionFilters.length === 0 && <span style={{ color: '#999' }}>無過濾關鍵字</span>}
                </div>
            </div>
        </div>
    );


};

export default ReportTab;
