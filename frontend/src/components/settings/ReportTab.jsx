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
        const keyword = prompt(t('settingsExt.report.enterKeyword'));
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
                    <label>{t('settingsExt.report.dayCutoff')}:</label>
                    <input
                        type="time"
                        step="1"
                        value={reportSettings.dayCutoffTime}
                        onChange={e => handleReportChange('dayCutoffTime', e.target.value)}
                    />
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>({t('settingsExt.report.cutoffDefault')})</span>
                </div>
            </div>

            {/* 2. Small Batch Definition */}
            <div className={styles.settingGroup}>
                <h4>{t('settingsExt.report.smallBatchTitle')}</h4>
                <div className={styles.inputRow}>
                    <label>{t('settingsExt.report.smallBatchQty')}:</label>
                    <input
                        type="number"
                        value={reportSettings.smallBatchQty}
                        onChange={e => handleReportChange('smallBatchQty', Number(e.target.value))}
                    />
                    <span>{t('settingsExt.common.sheets')}</span>
                </div>
                <p style={{ marginTop: '5px', color: '#666', fontSize: '0.9rem' }}>
                    * {t('settingsExt.report.smallBatchHint')}
                </p>
            </div>

            {/* 3. Exception Filters */}
            <div className={styles.settingGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4>{t('settingsExt.report.exceptionFilters')}</h4>
                    <button className={styles.btn} onClick={handleAddFilter}>+ {t('settingsExt.report.addKeyword')}</button>
                </div>
                <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '10px' }}>
                    * {t('settingsExt.report.filterHint')}
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
                    {reportSettings.exceptionFilters.length === 0 && <span style={{ color: '#999' }}>{t('settingsExt.report.noFilters')}</span>}
                </div>
            </div>
        </div>
    );


};

export default ReportTab;
