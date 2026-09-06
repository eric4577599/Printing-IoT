import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/SettingsPage.module.css'; // Adjust path depending on where module CSS is

const FormulaTab = () => {
    const { t } = useLanguage();

    const [formulaSettings, setFormulaSettings] = useState(() => {
        const saved = localStorage.getItem('formulaSettings');
        return saved ? JSON.parse(saved) : {
            stdAvgSpeed: 100,
            stdPrepTime: 10,
            splitPrintCredit: 3,
            targetOEE: 85,
            targetPrepSuccess: 95,
            minTestCount: 50,
            minPrepTime: 20,
            maxAvgSpeed: 100,
            continuousSeconds: 10,
            continuousSheets: 10,
            shortageThreshold: 50,
            trialSuccessSheets: 3,
            prepTimeStartMode: 'prevFinish',
            prepTimeGreenThreshold: 100,
            prepTimeYellowThreshold: 120,
            speedBasePercent: 80,
            speedYellowUpperThreshold: 100,
            speedGreenThreshold: 120,
            speedBaseType: 'standard'
        };
    });

    const handleFormulaChange = (key, value) => {
        setFormulaSettings(prev => ({ ...prev, [key]: value }));
    };

    const saveSettings = () => {
        localStorage.setItem('formulaSettings', JSON.stringify(formulaSettings));
        alert(t('settingsExt.formula.savedAlert'));
    };

    return (
        <div className={styles.tabContent} style={{ height: '100%', overflowY: 'auto' }}>
            <h3>{t('settings.formula.title')}</h3>
            <p className={styles.description}>{t('settings.formula.desc')}</p>

            <div className={styles.settingGroup}>
                <h4>{t('settings.formula.coreEff')}</h4>
                <div style={{ float: 'right', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label>{t('settingsExt.formula.shortageThresholdLabel')}: </label>
                    <input
                        type="number"
                        value={formulaSettings.shortageThreshold || 50}
                        onChange={e => handleFormulaChange('shortageThreshold', Number(e.target.value))}
                        style={{ width: '60px', textAlign: 'center' }}
                    />
                    <span>{t('settingsExt.common.sheets')}</span>
                </div>
                <div className={styles.inputRow}>
                    <label>{t('settingsExt.formula.stdAvgSpeed')}:</label>
                    <input
                        type="number"
                        value={formulaSettings.stdAvgSpeed}
                        onChange={e => handleFormulaChange('stdAvgSpeed', e.target.value)}
                    />
                    <span>m/min</span>
                </div>
            </div>

            <div className={styles.settingGroup}>
                <h4>{t('settings.formula.timeAvail')}</h4>
                <div className={styles.inputRow}>
                    <label>{t('settings.formula.stdPrepTime')}:</label>
                    <input
                        type="number"
                        value={formulaSettings.stdPrepTime}
                        onChange={e => handleFormulaChange('stdPrepTime', e.target.value)}
                    />
                    <span>min</span>
                </div>
                <div className={styles.inputRow}>
                    <label>{t('settingsExt.formula.splitPrintCredit')}:</label>
                    <input
                        type="number"
                        value={formulaSettings.splitPrintCredit}
                        onChange={e => handleFormulaChange('splitPrintCredit', e.target.value)}
                    />
                    <span>min</span>
                </div>
            </div>

            <div className={styles.settingGroup}>
                <h4>{t('settingsExt.formula.continuousDef')}</h4>
                <div className={styles.inputRow}>
                    <label>{t('settingsExt.formula.continuousCriteria')}:</label>
                    <span>{t('settingsExt.formula.criteriaPrefix')}</span>
                    <input
                        type="number"
                        value={formulaSettings.continuousSeconds}
                        onChange={e => handleFormulaChange('continuousSeconds', e.target.value)}
                        style={{ width: '60px', margin: '0 5px' }}
                    />
                    <span>{t('settingsExt.formula.criteriaMiddle')}</span>
                    <input
                        type="number"
                        value={formulaSettings.continuousSheets}
                        onChange={e => handleFormulaChange('continuousSheets', e.target.value)}
                        style={{ width: '60px', margin: '0 5px' }}
                    />
                    <span>{t('settingsExt.common.sheets')}</span>
                </div>
            </div>

            <div className={styles.settingGroup}>
                <h4>{t('settings.formula.targets')}</h4>
                <div className={styles.inputRow}>
                    <label>{t('settings.formula.targetOEE')}:</label>
                    <input
                        type="number"
                        value={formulaSettings.targetOEE}
                        onChange={e => handleFormulaChange('targetOEE', e.target.value)}
                    />
                    <span>%</span>
                </div>
                <div className={styles.inputRow}>
                    <label>{t('settings.formula.targetPrepSuccess')}:</label>
                    <input
                        type="number"
                        value={formulaSettings.targetPrepSuccess}
                        onChange={e => handleFormulaChange('targetPrepSuccess', e.target.value)}
                    />
                    <span>%</span>
                </div>
                <div className={styles.inputRow}>
                    <label>{t('settingsExt.formula.trialSuccessLabel')}:</label>
                    <input
                        type="number"
                        value={formulaSettings.trialSuccessSheets || 3}
                        onChange={e => handleFormulaChange('trialSuccessSheets', Number(e.target.value))}
                        style={{ width: '60px' }}
                    />
                    <span>{t('settingsExt.formula.withinSheets')}</span>
                    <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#666' }}>
                        * {t('settingsExt.formula.trialSuccessHint')}
                    </span>
                </div>

                {/* === 準備時間燈號管理 === */}
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ffcc80' }}>
                    <h5 style={{ margin: '0 0 12px 0', color: '#e65100', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⏱️ {t('settingsExt.formula.prepTimeIndicator')}
                    </h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#666' }}>
                        {t('settingsExt.formula.prepTimeDescPrefix')}<strong>{t('settingsExt.formula.bgColor')}</strong>
                    </p>

                    <div className={styles.inputRow}>
                        <label>{t('settingsExt.formula.stdPrepTimeLabel')}:</label>
                        <input
                            type="number"
                            value={formulaSettings.stdPrepTime || 10}
                            onChange={e => handleFormulaChange('stdPrepTime', Number(e.target.value))}
                            style={{ width: '60px' }}
                        />
                        <span>{t('settingsExt.formula.minUnit')}</span>
                        <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#888' }}>{t('settingsExt.formula.defaultPrefix')}: 10{t('settingsExt.formula.minuteWord')}</span>
                    </div>

                    <div className={styles.inputRow} style={{ marginTop: '10px' }}>
                        <label>{t('settingsExt.formula.startTimeMode')}:</label>
                        <select
                            value={formulaSettings.prepTimeStartMode || 'prevFinish'}
                            onChange={e => handleFormulaChange('prepTimeStartMode', e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '4px' }}
                        >
                            <option value="prevFinish">{t('settingsExt.formula.prevFinish')}</option>
                            <option value="dataArrival">{t('settingsExt.formula.dataArrival')}</option>
                        </select>
                    </div>

                    <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className={styles.inputRow}>
                                <label>🟡 {t('settingsExt.formula.yellowUpper')}:</label>
                                <input
                                    type="number"
                                    value={formulaSettings.prepTimeYellowThreshold || 120}
                                    onChange={e => handleFormulaChange('prepTimeYellowThreshold', Number(e.target.value))}
                                    style={{ width: '60px' }}
                                />
                                <span>%</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666', alignSelf: 'center' }}>
                                🔴 {t('settingsExt.formula.redLight')}: &gt; {formulaSettings.prepTimeYellowThreshold || 120}%
                            </div>
                        </div>
                        <div style={{ marginTop: '10px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.85rem' }}>
                            <strong>{t('settingsExt.formula.lightRule')}:</strong> 🟢 &lt;100% | 🟡 100%~{formulaSettings.prepTimeYellowThreshold || 120}% | 🔴 &gt;{formulaSettings.prepTimeYellowThreshold || 120}%
                        </div>
                    </div>
                </div>

                {/* === 欠量字體顏色說明 === */}
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #a5d6a7' }}>
                    <div style={{ fontSize: '0.9rem', color: '#2e7d32' }}>
                        💡 <strong>{t('settingsExt.formula.qtyFontColor')}</strong>{t('settingsExt.formula.controlledByShortage')}
                        <span style={{ marginLeft: '10px' }}>
                            🟢 &lt; {formulaSettings.shortageThreshold || 50}{t('settingsExt.common.sheets')} | 🔴 ≥ {formulaSettings.shortageThreshold || 50}{t('settingsExt.common.sheets')}
                        </span>
                    </div>
                </div>

                {/* === 車速燈號管理 === */}
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
                    <h5 style={{ margin: '0 0 12px 0', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🚀 {t('settingsExt.formula.speedIndicator')}
                    </h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#666' }}>
                        {t('settingsExt.formula.speedDescPrefix')}<strong>{t('settingsExt.formula.fontColor')}</strong>{t('settingsExt.formula.speedDescSuffix')}
                    </p>

                    <div className={styles.inputRow}>
                        <label>{t('settingsExt.formula.speedBaseType')}:</label>
                        <select
                            value={formulaSettings.speedBaseType || 'standard'}
                            onChange={e => handleFormulaChange('speedBaseType', e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '4px', marginRight: '15px' }}
                        >
                            <option value="standard">{t('settingsExt.formula.standardSpeed')}</option>
                            <option value="maximum">{t('settingsExt.formula.maximumSpeed')}</option>
                        </select>
                    </div>

                    {formulaSettings.speedBaseType !== 'maximum' && (
                        <div className={styles.inputRow} style={{ marginTop: '10px' }}>
                            <label>{t('settingsExt.formula.stdSpeedBase')}:</label>
                            <span style={{ marginRight: '5px' }}>{t('settingsExt.formula.machineMaxTimes')}</span>
                            <input
                                type="number"
                                value={formulaSettings.speedBasePercent || 80}
                                onChange={e => handleFormulaChange('speedBasePercent', Number(e.target.value))}
                                style={{ width: '60px' }}
                            />
                            <span>%</span>
                            <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#888' }}>{t('settingsExt.formula.defaultPrefix')}: 80%</span>
                        </div>
                    )}

                    {formulaSettings.speedBaseType === 'maximum' && (
                        <div style={{ marginTop: '10px', padding: '10px', background: '#fff3e0', borderRadius: '4px', fontSize: '0.85rem', color: '#e65100' }}>
                            ⚠️ {t('settingsExt.formula.maxSpeedNote')}
                        </div>
                    )}

                    <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className={styles.inputRow}>
                                <label>🟡 {t('settingsExt.formula.yellowRange')}:</label>
                                <span>100% ~</span>
                                <input
                                    type="number"
                                    value={formulaSettings.speedGreenThreshold || 120}
                                    onChange={e => handleFormulaChange('speedGreenThreshold', Number(e.target.value))}
                                    style={{ width: '60px' }}
                                />
                                <span>%</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666', alignSelf: 'center' }}>
                                🟢 {t('settingsExt.formula.greenLight')}: &gt; {formulaSettings.speedGreenThreshold || 120}%
                            </div>
                        </div>
                        <div style={{ marginTop: '10px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.85rem' }}>
                            <strong>{t('settingsExt.formula.lightRule')}:</strong> 🔴 &lt;{t('settingsExt.formula.standardSpeedShort')} | 🟡 100%~{formulaSettings.speedGreenThreshold || 120}% | 🟢 &gt;{formulaSettings.speedGreenThreshold || 120}%
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.actionRow}>
                <button className={styles.saveBtn} onClick={saveSettings}>{t('settingsExt.common.save')}</button>
            </div>
        </div>
    );
};

export default FormulaTab;
