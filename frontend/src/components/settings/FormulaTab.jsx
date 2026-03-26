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
        alert('設定已儲存 (Settings Saved!)');
    };

    return (
        <div className={styles.tabContent} style={{ height: '100%', overflowY: 'auto' }}>
            <h3>{t('settings.formula.title')}</h3>
            <p className={styles.description}>{t('settings.formula.desc')}</p>

            <div className={styles.settingGroup}>
                <h4>{t('settings.formula.coreEff')}</h4>
                <div style={{ float: 'right', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label>欠量強制輸入閥值 (Shortage Force Input Threshold): </label>
                    <input
                        type="number"
                        value={formulaSettings.shortageThreshold || 50}
                        onChange={e => handleFormulaChange('shortageThreshold', Number(e.target.value))}
                        style={{ width: '60px', textAlign: 'center' }}
                    />
                    <span>張 (Sheets)</span>
                </div>
                <div className={styles.inputRow}>
                    <label>標準平均車速 (Standard Avg Speed):</label>
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
                    <label>分印作業補償 (Split Print Credit):</label>
                    <input
                        type="number"
                        value={formulaSettings.splitPrintCredit}
                        onChange={e => handleFormulaChange('splitPrintCredit', e.target.value)}
                    />
                    <span>min</span>
                </div>
            </div>

            <div className={styles.settingGroup}>
                <h4>連續生產定義 (Continuous Production Definition)</h4>
                <div className={styles.inputRow}>
                    <label>連續生產判定條件 (Criteria):</label>
                    <span>在</span>
                    <input
                        type="number"
                        value={formulaSettings.continuousSeconds}
                        onChange={e => handleFormulaChange('continuousSeconds', e.target.value)}
                        style={{ width: '60px', margin: '0 5px' }}
                    />
                    <span>秒內，生產</span>
                    <input
                        type="number"
                        value={formulaSettings.continuousSheets}
                        onChange={e => handleFormulaChange('continuousSheets', e.target.value)}
                        style={{ width: '60px', margin: '0 5px' }}
                    />
                    <span>張 (Sheets in Seconds)</span>
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
                    <label>一張試車成功判定 (Trial Success Sheets):</label>
                    <input
                        type="number"
                        value={formulaSettings.trialSuccessSheets || 3}
                        onChange={e => handleFormulaChange('trialSuccessSheets', Number(e.target.value))}
                        style={{ width: '60px' }}
                    />
                    <span>張內 (sheets)</span>
                    <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#666' }}>
                        * 試車時在此張數內達成即為成功
                    </span>
                </div>

                {/* === 準備時間燈號管理 === */}
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ffcc80' }}>
                    <h5 style={{ margin: '0 0 12px 0', color: '#e65100', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⏱️ 準備時間燈號管理 (Prep Time Indicator)
                    </h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#666' }}>
                        影響即時監控「生產數量」欄位<strong>底色</strong>
                    </p>

                    <div className={styles.inputRow}>
                        <label>標準準備時間 (Standard Prep Time):</label>
                        <input
                            type="number"
                            value={formulaSettings.stdPrepTime || 10}
                            onChange={e => handleFormulaChange('stdPrepTime', Number(e.target.value))}
                            style={{ width: '60px' }}
                        />
                        <span>分 (min)</span>
                        <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#888' }}>預設: 10分鐘</span>
                    </div>

                    <div className={styles.inputRow} style={{ marginTop: '10px' }}>
                        <label>準備時間判斷 (Start Time Mode):</label>
                        <select
                            value={formulaSettings.prepTimeStartMode || 'prevFinish'}
                            onChange={e => handleFormulaChange('prepTimeStartMode', e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '4px' }}
                        >
                            <option value="prevFinish">前一筆完工時間 (Previous Order Finish)</option>
                            <option value="dataArrival">資料送入時開始 (Data Arrival)</option>
                        </select>
                    </div>

                    <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className={styles.inputRow}>
                                <label>🟡 黃燈上限:</label>
                                <input
                                    type="number"
                                    value={formulaSettings.prepTimeYellowThreshold || 120}
                                    onChange={e => handleFormulaChange('prepTimeYellowThreshold', Number(e.target.value))}
                                    style={{ width: '60px' }}
                                />
                                <span>%</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666', alignSelf: 'center' }}>
                                🔴 紅燈: &gt; {formulaSettings.prepTimeYellowThreshold || 120}%
                            </div>
                        </div>
                        <div style={{ marginTop: '10px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.85rem' }}>
                            <strong>燈號規則:</strong> 🟢 &lt;100% | 🟡 100%~{formulaSettings.prepTimeYellowThreshold || 120}% | 🔴 &gt;{formulaSettings.prepTimeYellowThreshold || 120}%
                        </div>
                    </div>
                </div>

                {/* === 欠量字體顏色說明 === */}
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #a5d6a7' }}>
                    <div style={{ fontSize: '0.9rem', color: '#2e7d32' }}>
                        💡 <strong>生產數量字體顏色</strong>由「欠量強制輸入閾值」控制：
                        <span style={{ marginLeft: '10px' }}>
                            🟢 &lt; {formulaSettings.shortageThreshold || 50}張 | 🔴 ≥ {formulaSettings.shortageThreshold || 50}張
                        </span>
                    </div>
                </div>

                {/* === 車速燈號管理 === */}
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
                    <h5 style={{ margin: '0 0 12px 0', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🚀 車速燈號管理 (Speed Indicator)
                    </h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#666' }}>
                        影響即時監控「車速」欄位<strong>字體顏色</strong>，基於「單位設定」中的機台極速計算
                    </p>

                    <div className={styles.inputRow}>
                        <label>速度基準類型 (Speed Base Type):</label>
                        <select
                            value={formulaSettings.speedBaseType || 'standard'}
                            onChange={e => handleFormulaChange('speedBaseType', e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '4px', marginRight: '15px' }}
                        >
                            <option value="standard">標準車速 (Standard Speed)</option>
                            <option value="maximum">極限速度 (Maximum Speed)</option>
                        </select>
                    </div>

                    {formulaSettings.speedBaseType !== 'maximum' && (
                        <div className={styles.inputRow} style={{ marginTop: '10px' }}>
                            <label>標準車速基準 (Standard Speed Base):</label>
                            <span style={{ marginRight: '5px' }}>機台極速 ×</span>
                            <input
                                type="number"
                                value={formulaSettings.speedBasePercent || 80}
                                onChange={e => handleFormulaChange('speedBasePercent', Number(e.target.value))}
                                style={{ width: '60px' }}
                            />
                            <span>%</span>
                            <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#888' }}>預設: 80%</span>
                        </div>
                    )}

                    {formulaSettings.speedBaseType === 'maximum' && (
                        <div style={{ marginTop: '10px', padding: '10px', background: '#fff3e0', borderRadius: '4px', fontSize: '0.85rem', color: '#e65100' }}>
                            ⚠️ 使用極限速度作為基準時，速度燈號將以機台極速 (100%) 為標準計算
                        </div>
                    )}

                    <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className={styles.inputRow}>
                                <label>🟡 黃燈範圍:</label>
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
                                🟢 綠燈: &gt; {formulaSettings.speedGreenThreshold || 120}%
                            </div>
                        </div>
                        <div style={{ marginTop: '10px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.85rem' }}>
                            <strong>燈號規則:</strong> 🔴 &lt;標準車速 | 🟡 100%~{formulaSettings.speedGreenThreshold || 120}% | 🟢 &gt;{formulaSettings.speedGreenThreshold || 120}%
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.actionRow}>
                <button className={styles.saveBtn} onClick={saveSettings}>儲存 (Save)</button>
            </div>
        </div>
    );
};

export default FormulaTab;
