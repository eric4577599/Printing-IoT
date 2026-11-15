import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/SettingsPage.module.css';
import { FILTER_PRESETS, normalizeFilters } from '../../utils/reportFilters';

const ReportTab = () => {
    const { t } = useLanguage();
    const [customInput, setCustomInput] = useState('');

    // --- Report Settings State ---
    const [reportSettings, setReportSettings] = useState(() => {
        const saved = localStorage.getItem('reportSettings');
        const base = saved ? JSON.parse(saved) : {
            dayCutoffTime: '07:30:00',
            exceptionFilters: ['rest', 'snack', 'support'],
            smallBatchQty: 500
        };
        return { ...base, exceptionFilters: normalizeFilters(base.exceptionFilters) };
    });

    const handleReportChange = (key, value) => {
        setReportSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem('reportSettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    /** 勾選或取消預設選項 */
    const handleTogglePreset = (id, checked) => {
        const cur = reportSettings.exceptionFilters;
        handleReportChange('exceptionFilters', checked ? [...new Set([...cur, id])] : cur.filter(k => k !== id));
    };

    /** 新增自訂關鍵字(行內輸入框,取代原本的 window.prompt) */
    const handleAddFilter = () => {
        const keyword = customInput.trim();
        if (keyword && !reportSettings.exceptionFilters.includes(keyword)) {
            handleReportChange('exceptionFilters', [...reportSettings.exceptionFilters, keyword]);
        }
        setCustomInput('');
    };

    const handleDeleteFilter = (keyword) => {
        handleReportChange('exceptionFilters', reportSettings.exceptionFilters.filter(k => k !== keyword));
    };

    const presetIds = FILTER_PRESETS.map(p => p.id);
    const customFilters = reportSettings.exceptionFilters.filter(k => !presetIds.includes(k));

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

            {/* 3. Exception Filters:預設項目為可勾選的選項,另可新增自訂關鍵字 */}
            <div className={styles.settingGroup}>
                <h4>{t('settingsExt.report.exceptionFilters')}</h4>
                <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '10px' }}>
                    * {t('settingsExt.report.filterHint')}
                </p>

                <div role="group" aria-label={t('settingsExt.report.exceptionFilters')} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
                    {FILTER_PRESETS.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={reportSettings.exceptionFilters.includes(p.id)}
                                onChange={e => handleTogglePreset(p.id, e.target.checked)}
                            />
                            {t(p.labelKey)}
                        </label>
                    ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {customFilters.map(keyword => (
                        <span key={keyword} style={{ padding: '4px 10px', backgroundColor: '#e3f2fd', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1565c0', fontWeight: '500' }}>
                            {keyword}
                            <button
                                type="button"
                                aria-label={`${t('settingsExt.common.delete')} ${keyword}`}
                                onClick={() => handleDeleteFilter(keyword)}
                                style={{ border: 'none', background: 'transparent', color: '#d32f2f', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.0rem', lineHeight: 1 }}
                            >×</button>
                        </span>
                    ))}
                    <input
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddFilter(); }}
                        placeholder={t('settingsExt.report.enterKeyword')}
                        style={{ width: '260px' }}
                    />
                    <button className={styles.btn} type="button" onClick={handleAddFilter}>+ {t('settingsExt.report.addKeyword')}</button>
                </div>
            </div>
        </div>
    );


};

export default ReportTab;
