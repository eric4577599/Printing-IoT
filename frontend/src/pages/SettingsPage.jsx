import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import mqtt from 'mqtt'; // Added for direct connection test
import { useAuth } from '../modules/auth/AuthContext';
import { useLanguage } from '../modules/language/LanguageContext';
import styles from './SettingsPage.module.css';
import {
    getCommunicationSettings,
    updateCommunicationSettings,
    getMachineSections,
    createMachineSection,
    updateMachineSection as apiUpdateSection,
    deleteMachineSection as apiDeleteSection,
    testMqttConnection, // New import
    getBoxTypes, updateBoxTypes // Imported
} from '../services/api';

const SettingsPage = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('formula');

    // Formula Constants (Defaults entirely or from localStorage)
    const [formulaSettings, setFormulaSettings] = useState(() => {
        const saved = localStorage.getItem('formulaSettings');
        return saved ? JSON.parse(saved) : {
            stdAvgSpeed: 100, // 標準平均車速 (m/min)
            stdPrepTime: 10,  // 標準準備時間 (min) - 預設10分鐘
            splitPrintCredit: 3, // 分印作業 Credit (min)
            targetOEE: 85,    // OEE 目標 (%)
            targetPrepSuccess: 95, // 一張試車成功率目標 (%)
            minTestCount: 50, // 試車張數
            minPrepTime: 20, // 準備時間
            maxAvgSpeed: 100, // 平均車速
            continuousSeconds: 10, // 連續生產-秒
            continuousSheets: 10,   // 連續生產-張
            shortageThreshold: 50, // 欠量閾值 - 影響生產數量字體顏色
            // 一張試車成功率判定張數
            trialSuccessSheets: 3, // 幾張內為成功，預設3張
            // === 準備時間燈號管理 ===
            prepTimeStartMode: 'prevFinish', // 'prevFinish' = 前一筆完工時間, 'dataArrival' = 資料送入時
            prepTimeGreenThreshold: 100,  // 綠燈上限 (< 100% 標準時間)
            prepTimeYellowThreshold: 120, // 黃燈上限 (100% ~ 120%)
            // prepTimeRedThreshold: > 120% 自動計算
            // === 車速燈號管理 ===
            speedBasePercent: 80,      // 標準車速 = 機台極速 × 此百分比
            speedYellowUpperThreshold: 100,  // 黃燈上限 (標準車速的百分比)
            speedGreenThreshold: 120   // 綠燈下限 (> 120% 標準車速為綠)
        };
    });

    const handleFormulaChange = (key, value) => {
        setFormulaSettings(prev => ({ ...prev, [key]: value }));
    };

    const saveSettings = () => {
        localStorage.setItem('formulaSettings', JSON.stringify(formulaSettings));
        alert('設定已儲存 (Settings Saved!)');
    };

    const renderFormulaTab = () => (
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



    // --- Communication Settings State ---
    const [commSettings, setCommSettings] = useState({
        plc: {
            enabled: true,
            simulate: false,
            deviceType: 'wise',
            ip: '192.168.1.1',
            port: 502,
            motorSignal: 'DI-0',
            countSignal: 'DI-1'
        },
        erp: {
            enabled: true,
            protocol: 'lmc_flexo',
            connectionType: 'tcp',
            host: '192.168.1.100',
            port: 3000,
            inputDir: '',
            outputDir: ''
        },
        dataLogInterval: 300, // 定時寫入間隔（秒），預設5分鐘
        machineId: 'MACHINE_01' // 機台識別碼
    });

    // MQTT Test State
    const [mqttTestStatus, setMqttTestStatus] = useState('idle'); // idle, testing, success, error
    const [mqttTestMsg, setMqttTestMsg] = useState('');

    // Fetch Settings on Mount (API)
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getCommunicationSettings();
                if (data) {
                    setCommSettings({
                        plc: {
                            enabled: data.plc_enabled,
                            simulate: data.plc_simulate,
                            deviceType: data.plc_device_type,
                            ip: data.plc_ip,
                            port: data.plc_port,
                            motorSignal: data.plc_motor_signal,
                            countSignal: data.plc_count_signal,
                            mqttBroker: data.mqtt_broker_url,
                            mqttTopic: data.mqtt_topic
                        },
                        erp: {
                            enabled: data.erp_enabled,
                            protocol: data.erp_protocol,
                            connectionType: data.erp_connection_type,
                            host: data.erp_host,
                            port: data.erp_port,
                            inputDir: data.erp_input_dir,
                            outputDir: data.erp_output_dir
                        },
                        dataLogInterval: data.data_log_interval || 300,
                        machineId: data.machine_id || 'MACHINE_01'
                    });
                }
            } catch (error) {
                console.error("Failed to load settings from API, using defaults.", error);
            }
        };
        fetchSettings();
    }, []);

    // Get global context for simulation
    const { isPlcConnected, togglePlcConnection, simulatePlcCount } = useOutletContext() || {};
    const handleCommChange = async (section, key, value) => {
        // 1. Optimistic UI Update
        const newSettings = {
            ...commSettings,
            [section]: {
                ...commSettings[section],
                [key]: value
            }
        };
        setCommSettings(newSettings);

        // 2. Sync to LocalStorage (for MainLayout Footer compatibility)
        localStorage.setItem('communicationSettings', JSON.stringify(newSettings));
        window.dispatchEvent(new Event('comm-settings-changed'));

        // 3. Prepare payload for API (Flatten structure)
        const payload = {
            plc_enabled: newSettings.plc.enabled,
            plc_simulate: newSettings.plc.simulate,
            plc_device_type: newSettings.plc.deviceType,
            plc_ip: newSettings.plc.ip,
            plc_port: newSettings.plc.port,
            plc_motor_signal: newSettings.plc.motorSignal,
            plc_count_signal: newSettings.plc.countSignal,

            mqtt_broker_url: newSettings.plc.mqttBroker,
            mqtt_topic: newSettings.plc.mqttTopic,

            erp_enabled: newSettings.erp.enabled,
            erp_protocol: newSettings.erp.protocol,
            erp_connection_type: newSettings.erp.connectionType,
            erp_host: newSettings.erp.host,
            erp_port: newSettings.erp.port,
            erp_input_dir: newSettings.erp.inputDir,
            erp_output_dir: newSettings.erp.outputDir,

            data_log_interval: newSettings.dataLogInterval,
            machine_id: newSettings.machineId
        };

        // 4. Call API
        try {
            await updateCommunicationSettings(payload);
        } catch (error) {
            console.error("Failed to save settings to API:", error);
            // Optionally revert state here if strict consistency is needed
            // setCommSettings(prevSettings);
        }
    };

    const renderCommunicationTab = () => (
        <div className={styles.tabContent} style={{ height: '100%', overflowY: 'auto' }}>
            <h3>{t('settings.comm.title')}</h3>
            <p className={styles.description}>{t('settings.comm.desc')}</p>

            {/* [TOP] PLC Settings */}
            <div className={styles.settingGroup} style={{ border: '1px solid #b3e5fc', background: '#e1f5fe', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        📡 {t('settings.comm.plcTitle')}
                        <span style={{
                            fontSize: '0.8rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: isPlcConnected ? '#4caf50' : '#f44336',
                            color: '#fff'
                        }}>
                            {isPlcConnected ? 'Connected (Motor On)' : 'Disconnected (Motor Off)'}
                        </span>
                    </h4>
                    {/* New: Simulate Signal Option */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: '#fff', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <input
                            type="checkbox"
                            checked={commSettings.plc.simulate || false}
                            onChange={e => handleCommChange('plc', 'simulate', e.target.checked)}
                        />
                        <span style={{ fontWeight: 'bold', color: '#1976d2' }}>{t('settings.comm.simulateSignal')}</span>
                    </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <div className={styles.inputRow}>
                            <label>{t('settings.comm.deviceType')}:</label>
                            <select
                                value={commSettings.plc.deviceType}
                                onChange={e => handleCommChange('plc', 'deviceType', e.target.value)}
                                style={{ padding: '6px' }}
                            >
                                <option value="wise">Advantech MQTT (Wise-4000)</option>
                                <option value="modbus">Generic Modbus TCP</option>
                            </select>
                        </div>

                        {/* MQTT Settings for Wise/MQTT Mode */}
                        {commSettings.plc.deviceType === 'wise' ? (
                            <>
                                <div className={styles.inputRow}>
                                    <label>MQTT Broker URL:</label>
                                    <input
                                        value={commSettings.plc.mqttBroker || window.location.hostname}
                                        onChange={e => handleCommChange('plc', 'mqttBroker', e.target.value)}
                                        placeholder="e.g. mqtt.yourdomain.com"
                                        style={{ width: '250px' }}
                                    />
                                </div>
                                <div className={styles.inputRow}>
                                    <label>MQTT Topic:</label>
                                    <input
                                        value={commSettings.plc.mqttTopic || 'Advantech/+/data'}
                                        onChange={e => handleCommChange('plc', 'mqttTopic', e.target.value)}
                                        placeholder="e.g. Advantech/+/data"
                                        style={{ width: '250px' }}
                                    />
                                </div>
                                <div className={styles.inputRow} style={{ marginTop: '10px' }}>
                                    <label>監控更新頻率 (Monitor Interval):</label>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="5.0"
                                            step="0.1"
                                            value={commSettings.plc.monitor_interval !== undefined ? commSettings.plc.monitor_interval : 1.0}
                                            onChange={e => handleCommChange('plc', 'monitor_interval', parseFloat(e.target.value))}
                                            style={{ width: '120px', marginRight: '10px', cursor: 'pointer' }}
                                        />
                                        <input
                                            type="number"
                                            min="0.1"
                                            max="5.0"
                                            step="0.1"
                                            value={commSettings.plc.monitor_interval !== undefined ? commSettings.plc.monitor_interval : 1.0}
                                            onChange={e => handleCommChange('plc', 'monitor_interval', parseFloat(e.target.value))}
                                            style={{ width: '60px', borderRadius: '4px', border: '1px solid #ccc', padding: '2px 5px' }}
                                        />
                                        <span style={{ marginLeft: '5px' }}>秒 (Default: 1.0s)</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={styles.inputRow}>
                                <label>{t('settings.comm.ip')}:</label>
                                <input
                                    value={commSettings.plc.ip}
                                    onChange={e => handleCommChange('plc', 'ip', e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        {commSettings.plc.deviceType === 'modbus' && (
                            <div className={styles.inputRow}>
                                <label>{t('settings.comm.port')}:</label>
                                <input
                                    type="number"
                                    value={commSettings.plc.port}
                                    onChange={e => handleCommChange('plc', 'port', Number(e.target.value))}
                                    style={{ width: '80px' }}
                                />
                            </div>
                        )}

                        {/* MQTT Connection Test */}
                        <div style={{ marginTop: '15px' }}>
                            <button
                                onClick={async () => {
                                    setMqttTestStatus('testing');
                                    setMqttTestMsg('Connecting...');
                                    try {
                                        // Use Backend API for connectivity test (Ping/TCP Check)
                                        const host = commSettings.plc.deviceType === 'wise'
                                            ? (commSettings.plc.mqttBroker || 'mqtt.infotech-consultant.com')
                                            : commSettings.plc.ip;

                                        const res = await testMqttConnection({
                                            host: host,
                                            port: commSettings.plc.deviceType === 'wise' ? 8083 : commSettings.plc.port,
                                            device_type: commSettings.plc.deviceType,
                                            mac_id: commSettings.plc.deviceType === 'wise' ? 'auto' : undefined
                                        });
                                        if (res.status === 'ok') {
                                            setMqttTestStatus('success');
                                            setMqttTestMsg(`✅ Connection OK (${res.latency_ms}ms)`);
                                        } else {
                                            setMqttTestStatus('error');
                                            setMqttTestMsg(`❌ ${res.message}`);
                                        }
                                    } catch (err) {
                                        setMqttTestStatus('error');
                                        setMqttTestMsg(`❌ API Error: ${err.message}`);
                                    }
                                }}
                                disabled={mqttTestStatus === 'testing'}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    background: mqttTestStatus === 'testing' ? '#eee' : '#fff',
                                    cursor: mqttTestStatus === 'testing' ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {mqttTestStatus === 'testing' ? 'Testing...' : '📡 Test Connection (Backend)'}
                            </button>
                            {mqttTestMsg && (
                                <span style={{
                                    marginLeft: '10px',
                                    fontSize: '0.9rem',
                                    color: mqttTestStatus === 'success' ? 'green' : mqttTestStatus === 'error' ? 'red' : '#666'
                                }}>
                                    {mqttTestMsg}
                                </span>
                            )}
                            <button
                                onClick={() => setShowMqttMonitor(true)}
                                style={{
                                    marginLeft: '15px',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid #4caf50',
                                    background: '#e8f5e9',
                                    color: '#2e7d32',
                                    cursor: 'pointer'
                                }}
                            >
                                📊 監控訊息 (Direct)
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '15px', padding: '10px', background: '#e3f2fd', borderRadius: '4px', fontSize: '0.9rem', color: '#0d47a1' }}>
                    ℹ️ <strong>模擬控制 (Simulation Controls):</strong><br />
                    請使用畫面上方工具列的 <strong>[模擬生產]</strong> 與 <strong>[Power ON/OFF]</strong> 開關進行測試。
                </div>

                {/* MQTT Debug Monitor Modal (Updated to match DebugDashboard Logic) */}
                {showMqttMonitor && (
                    <MqttMonitorModal
                        onClose={() => setShowMqttMonitor(false)}
                        brokerUrl={commSettings.plc.mqttBroker || 'mqtt.infotech-consultant.com'}
                        topic={commSettings.plc.mqttTopic || 'Advantech/+/data'}
                    />
                )}
            </div>



            {/* [BOTTOM] ERP Settings */}
            <div className={styles.settingGroup} style={{ marginTop: '20px', border: '1px solid #ffe0b2', background: '#fff3e0', padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
                    🏢 {t('settings.comm.erpTitle')}
                </h4>
                <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>
                    建立對應「生產排程的產品檔、訂單」的協定介面
                </div>

                <div className={styles.inputRow}>
                    <label>{t('settings.comm.protocol')}:</label>
                    <select
                        value={commSettings.erp.protocol}
                        onChange={e => handleCommChange('erp', 'protocol', e.target.value)}
                        style={{ padding: '6px', width: '300px' }}
                    >
                        <option value="lmc_flexo">LMC Flexo Protocol (@doc/20190323)</option>
                        <option value="custom">Custom JSON / XML</option>
                    </select>
                </div>

                <div className={styles.inputRow}>
                    <label>{t('settings.comm.connType')}:</label>
                    <div className={styles.radioGroup} style={{ margin: 0 }}>
                        <label>
                            <input
                                type="radio"
                                checked={commSettings.erp.connectionType === 'none'}
                                onChange={() => handleCommChange('erp', 'connectionType', 'none')}
                            /> 無連線 (None)
                        </label>
                        <label>
                            <input
                                type="radio"
                                checked={commSettings.erp.connectionType === 'tcp'}
                                onChange={() => handleCommChange('erp', 'connectionType', 'tcp')}
                            /> TCP/IP
                        </label>
                        <label>
                            <input
                                type="radio"
                                checked={commSettings.erp.connectionType === 'file'}
                                onChange={() => handleCommChange('erp', 'connectionType', 'file')}
                            /> File Share
                        </label>
                    </div>
                </div>

                {commSettings.erp.connectionType === 'tcp' ? (
                    <div style={{ marginLeft: '20px' }}>
                        <div className={styles.inputRow}>
                            <label>伺服器 IP (Host):</label>
                            <input
                                value={commSettings.erp.host}
                                onChange={e => handleCommChange('erp', 'host', e.target.value)}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>連接埠 (Port):</label>
                            <input
                                type="number"
                                value={commSettings.erp.port}
                                onChange={e => handleCommChange('erp', 'port', Number(e.target.value))}
                                style={{ width: '80px' }}
                            />
                        </div>
                    </div>
                ) : (
                    <div style={{ marginLeft: '20px' }}>
                        <div className={styles.inputRow}>
                            <label>輸入路徑 (Input Dir):</label>
                            <input
                                value={commSettings.erp.inputDir}
                                onChange={e => handleCommChange('erp', 'inputDir', e.target.value)}
                                placeholder="\\\\server\\share\\input"
                                style={{ width: '300px' }}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>輸出路徑 (Output Dir):</label>
                            <input
                                value={commSettings.erp.outputDir}
                                onChange={e => handleCommChange('erp', 'outputDir', e.target.value)}
                                placeholder="\\\\server\\share\\output"
                                style={{ width: '300px' }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Data Logging Settings */}
            <div className={styles.settingGroup} style={{ marginTop: '20px', border: '1px solid #c5e1a5', background: '#f1f8e9', padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
                    💾 數據記錄設定 (Data Logging Settings)
                </h4>
                <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>
                    控制 MQTT 數據寫入資料庫的頻率。當機台狀態改變時會立即寫入，其他時候依據設定的時間間隔定期寫入。
                </div>
                <div className={styles.inputRow}>
                    <label>定時寫入間隔 (Log Interval):</label>
                    <input
                        type="number"
                        value={Math.floor(commSettings.dataLogInterval / 60)}
                        onChange={e => {
                            const minutes = Number(e.target.value);
                            const seconds = minutes * 60;
                            const newSettings = { ...commSettings, dataLogInterval: seconds };
                            setCommSettings(newSettings);
                            localStorage.setItem('communicationSettings', JSON.stringify(newSettings));
                            window.dispatchEvent(new Event('comm-settings-changed'));

                            // Update API
                            const payload = {
                                plc_enabled: newSettings.plc.enabled,
                                plc_simulate: newSettings.plc.simulate,
                                plc_device_type: newSettings.plc.deviceType,
                                plc_ip: newSettings.plc.ip,
                                plc_port: newSettings.plc.port,
                                plc_motor_signal: newSettings.plc.motorSignal,
                                plc_count_signal: newSettings.plc.countSignal,
                                erp_enabled: newSettings.erp.enabled,
                                erp_protocol: newSettings.erp.protocol,
                                erp_connection_type: newSettings.erp.connectionType,
                                erp_host: newSettings.erp.host,
                                erp_port: newSettings.erp.port,
                                erp_input_dir: newSettings.erp.inputDir,
                                erp_output_dir: newSettings.erp.outputDir,
                                data_log_interval: seconds
                            };
                            updateCommunicationSettings(payload).catch(err => console.error('API update failed:', err));
                        }}
                        style={{ width: '80px' }}
                    />
                    <span>分鐘 (minutes)</span>
                    <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#666' }}>
                        目前: {Math.floor(commSettings.dataLogInterval / 60)} 分鐘 ({commSettings.dataLogInterval} 秒)
                    </span>
                </div>
                <div style={{ marginTop: '10px', padding: '10px', background: '#fff', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <strong>說明：</strong>
                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        <li>狀態改變時（RUN ↔ STOP ↔ JOG）會立即寫入資料庫</li>
                        <li>非狀態改變期間，依據此間隔定期寫入</li>
                        <li>建議設定：3-10 分鐘</li>
                    </ul>
                </div>

                {/* Machine ID Setting */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #c5e1a5' }}>
                    <div className={styles.inputRow}>
                        <label>🏭 機台識別碼 (Machine ID):</label>
                        <input
                            type="text"
                            value={commSettings.machineId || 'MACHINE_01'}
                            onChange={e => {
                                const newSettings = { ...commSettings, machineId: e.target.value };
                                setCommSettings(newSettings);
                                localStorage.setItem('communicationSettings', JSON.stringify(newSettings));

                                // Update API
                                const payload = {
                                    plc_enabled: newSettings.plc.enabled,
                                    plc_simulate: newSettings.plc.simulate,
                                    plc_device_type: newSettings.plc.deviceType,
                                    plc_ip: newSettings.plc.ip,
                                    plc_port: newSettings.plc.port,
                                    plc_motor_signal: newSettings.plc.motorSignal,
                                    plc_count_signal: newSettings.plc.countSignal,
                                    erp_enabled: newSettings.erp.enabled,
                                    erp_protocol: newSettings.erp.protocol,
                                    erp_connection_type: newSettings.erp.connectionType,
                                    erp_host: newSettings.erp.host,
                                    erp_port: newSettings.erp.port,
                                    erp_input_dir: newSettings.erp.inputDir,
                                    erp_output_dir: newSettings.erp.outputDir,
                                    data_log_interval: newSettings.dataLogInterval,
                                    machine_id: e.target.value
                                };
                                updateCommunicationSettings(payload).catch(err => console.error('API update failed:', err));
                            }}
                            style={{ width: '200px' }}
                            placeholder="MACHINE_01"
                        />
                        <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#666' }}>
                            用於識別本機台的唯一編碼，會記錄在生產日誌中
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.actionRow}>
                <button className={styles.saveBtn} onClick={async () => {
                    try {
                        const payload = {
                            plc_enabled: commSettings.plc.enabled,
                            plc_simulate: commSettings.plc.simulate,
                            plc_device_type: commSettings.plc.deviceType,
                            plc_ip: commSettings.plc.ip,
                            plc_port: commSettings.plc.port,
                            plc_motor_signal: commSettings.plc.motorSignal,
                            plc_count_signal: commSettings.plc.countSignal,
                            erp_enabled: commSettings.erp.enabled,
                            erp_protocol: commSettings.erp.protocol,
                            erp_connection_type: commSettings.erp.connectionType,
                            erp_host: commSettings.erp.host,
                            erp_port: commSettings.erp.port,
                            erp_input_dir: commSettings.erp.inputDir,
                            erp_output_dir: commSettings.erp.outputDir,
                            data_log_interval: commSettings.dataLogInterval,
                            machine_id: commSettings.machineId
                        };
                        await updateCommunicationSettings(payload);
                        localStorage.setItem('communicationSettings', JSON.stringify(commSettings));
                        alert('✅ 通訊設定已儲存至伺服器 (Settings saved to server!)');
                    } catch (error) {
                        console.error('Failed to save settings:', error);
                        alert('❌ 儲存失敗 (Save failed): ' + error.message);
                    }
                }}>儲存 (Save)</button>
            </div>
        </div >
    );

    // --- 公司抬頭設定 State ---
    const [companySettings, setCompanySettings] = useState(() => {
        const saved = localStorage.getItem('companySettings');
        return saved ? JSON.parse(saved) : {
            companyName: '',
            companyNameEn: '',
            address: '',
            phone: '',
            fax: '',
            logo: null
        };
    });

    const handleCompanyChange = (key, value) => {
        setCompanySettings(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem('companySettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            handleCompanyChange('logo', reader.result);
        };
        reader.readAsDataURL(file);
    };

    // --- User Settings State ---
    const [userSource, setUserSource] = useState('custom'); // 'inherit' | 'custom'
    const [userRemoteIP, setUserRemoteIP] = useState('');
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem('appUsers');
        return saved ? JSON.parse(saved) : [
            { id: '001', name: 'OP1', username: 'OP1', password: '123', role: 'OPERATOR', shift: 'A' },
            { id: '002', name: 'OP2', username: 'OP2', password: '123', role: 'OPERATOR', shift: 'B' },
            { id: '003', name: 'OP3', username: 'OP3', password: '123', role: 'OPERATOR', shift: 'C' }
        ];
    });

    const [newUserCode, setNewUserCode] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserShift, setNewUserShift] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);

    // --- Shift Settings State ---
    const [shiftSource, setShiftSource] = useState('custom'); // 'inherit' | 'custom'
    const [shiftRemoteIP, setShiftRemoteIP] = useState('');
    const [shifts, setShifts] = useState(() => {
        const saved = localStorage.getItem('appShifts');
        return saved ? JSON.parse(saved) : [
            { name: '日', start: '08:00', end: '18:00' },
            { name: '夜', start: '20:00', end: '04:00' }
        ];
    });

    const [newShiftName, setNewShiftName] = useState('');
    const [newShiftStart, setNewShiftStart] = useState('08:00');
    const [newShiftEnd, setNewShiftEnd] = useState('18:00');
    const [selectedShiftIdx, setSelectedShiftIdx] = useState(null);


    // --- User Handlers ---
    const handleAddUser = () => {
        if (!newUserCode || !newUserName || !newUserPassword) {
            alert('請完整輸入使用者資訊 (Please fill all user fields)');
            return;
        }
        const newUser = {
            id: newUserCode,
            name: newUserName,
            username: newUserName,
            password: newUserPassword,
            role: 'OPERATOR', // Default
            shift: newUserShift
        };

        const existingIdx = users.findIndex(u => u.id === newUserCode);
        let newUsers;
        if (existingIdx >= 0) {
            newUsers = [...users];
            newUsers[existingIdx] = newUser;
        } else {
            newUsers = [...users, newUser];
        }
        setUsers(newUsers);
        localStorage.setItem('appUsers', JSON.stringify(newUsers));
        alert('使用者已儲存 (User Saved)');

        // Reset inputs
        setNewUserCode('');
        setNewUserName('');
        setNewUserPassword('');
        setNewUserShift('');
        setSelectedUserId(null);
    };

    const handleDeleteUser = (id) => {
        if (confirm('確定刪除此使用者? (Delete User?)')) {
            const newUsers = users.filter(u => u.id !== id);
            setUsers(newUsers);
            localStorage.setItem('appUsers', JSON.stringify(newUsers));
            if (selectedUserId === id) setSelectedUserId(null);
        }
    };

    const handleUserClick = (u) => {
        if (userSource === 'inherit') return;
        setSelectedUserId(u.id);
        setNewUserCode(u.id);
        setNewUserName(u.name);
        setNewUserPassword(u.password || '');
        setNewUserShift(u.shift || '');
        // We need to unlock ID editing restriction or handle it? 
        // For simplicity, we allow overwriting by ID.
    };

    // --- Shift Handlers ---
    const handleAddShift = () => {
        if (!newShiftName || !newShiftStart || !newShiftEnd) {
            alert('請完整輸入班別資訊 (Please fill all shift fields)');
            return;
        }
        const newShift = {
            name: newShiftName,
            start: newShiftStart,
            end: newShiftEnd
        };

        let newShifts;
        if (selectedShiftIdx !== null) {
            newShifts = [...shifts];
            newShifts[selectedShiftIdx] = newShift;
        } else {
            newShifts = [...shifts, newShift];
        }

        setShifts(newShifts);
        localStorage.setItem('appShifts', JSON.stringify(newShifts));
        alert('班別已儲存 (Shift Saved)');

        // Reset
        setNewShiftName('');
        setNewShiftStart('08:00');
        setNewShiftEnd('18:00');
        setSelectedShiftIdx(null);
    };

    const handleDeleteShift = (idx) => {
        if (confirm('確定刪除此班別? (Delete Shift?)')) {
            const newShifts = shifts.filter((_, i) => i !== idx);
            setShifts(newShifts);
            localStorage.setItem('appShifts', JSON.stringify(newShifts));
            if (selectedShiftIdx === idx) setSelectedShiftIdx(null);
        }
    };

    const handleShiftClick = (s, idx) => {
        if (shiftSource === 'inherit') return;
        setSelectedShiftIdx(idx);
        setNewShiftName(s.name || '');
        setNewShiftStart(s.start);
        setNewShiftEnd(s.end);
    };

    // --- Render Sections ---

    const renderUserSection = () => (
        <div className={styles.settingGroup}>
            <h4>使用者設定 (User Settings)</h4>

            <div className={styles.radioGroup}>
                <label>
                    <input
                        type="radio"
                        name="userSource"
                        value="inherit"
                        checked={userSource === 'inherit'}
                        onChange={e => setUserSource(e.target.value)}
                    />
                    繼承遠端IP設定 (Inherit Remote IP)
                </label>
                <label>
                    <input
                        type="radio"
                        name="userSource"
                        value="custom"
                        checked={userSource === 'custom'}
                        onChange={e => setUserSource(e.target.value)}
                    />
                    自訂 (Custom)
                </label>
            </div>

            {userSource === 'inherit' && (
                <div className={styles.inputRow}>
                    <label>遠端 IP (Remote IP):</label>
                    <input
                        value={userRemoteIP}
                        onChange={e => setUserRemoteIP(e.target.value)}
                        placeholder="e.g. 192.168.1.100"
                    />
                </div>
            )}

            <div className={`${styles.subSection} ${userSource === 'inherit' ? styles.disabledArea : ''}`}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>使用者 (User)</th>
                            <th className={styles.th}>密碼 (Password)</th>
                            <th className={styles.th}>代碼 (ID)</th>
                            <th className={styles.th}>操作 (Actions)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr
                                key={u.id}
                                onClick={() => handleUserClick(u)}
                                className={selectedUserId === u.id ? styles.selectedRow : ''}
                                style={{ cursor: userSource === 'custom' ? 'pointer' : 'default' }}
                            >
                                <td className={styles.td}>{u.name}</td>
                                <td className={styles.td}>{u.password}</td>
                                <td className={styles.td}>{u.id}</td>
                                <td className={styles.td}>
                                    <button
                                        className={styles.miniBtn}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}
                                        disabled={userSource === 'inherit'}
                                    >刪除</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className={styles.editRow}>
                    <input placeholder="使用者 (name)" value={newUserName} onChange={e => setNewUserName(e.target.value)} disabled={userSource === 'inherit'} />
                    <input placeholder="密碼 (pwd)" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} disabled={userSource === 'inherit'} />
                    <input placeholder="代碼 (ID)" value={newUserCode} onChange={e => setNewUserCode(e.target.value)} disabled={userSource === 'inherit'} style={{ width: '80px' }} />
                    <button className={styles.actionButton} onClick={handleAddUser} disabled={userSource === 'inherit'}>
                        {selectedUserId ? '修改 (Update)' : '新增 (Add)'}
                    </button>
                    {selectedUserId && (
                        <button className={styles.actionButton} onClick={() => {
                            setSelectedUserId(null); setNewUserName(''); setNewUserCode(''); setNewUserPassword('');
                        }}>取消 (Cancel)</button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderShiftSection = () => (
        <div className={styles.settingGroup}>
            <h4>班別時間設定 (Shift Time Settings)</h4>

            <div className={styles.radioGroup}>
                <label>
                    <input
                        type="radio"
                        name="shiftSource"
                        value="inherit"
                        checked={shiftSource === 'inherit'}
                        onChange={e => setShiftSource(e.target.value)}
                    />
                    繼承遠端IP設定 (Inherit Remote IP)
                </label>
                <label>
                    <input
                        type="radio"
                        name="shiftSource"
                        value="custom"
                        checked={shiftSource === 'custom'}
                        onChange={e => setShiftSource(e.target.value)}
                    />
                    自訂 (Custom)
                </label>
            </div>

            {shiftSource === 'inherit' && (
                <div className={styles.inputRow}>
                    <label>遠端 IP (Remote IP):</label>
                    <input
                        value={shiftRemoteIP}
                        onChange={e => setShiftRemoteIP(e.target.value)}
                        placeholder="e.g. 192.168.1.100"
                    />
                </div>
            )}

            <div className={`${styles.subSection} ${shiftSource === 'inherit' ? styles.disabledArea : ''}`}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>班別 (Shift)</th>
                            <th className={styles.th}>時間起 (Start)</th>
                            <th className={styles.th}>迄 (End)</th>
                            <th className={styles.th}>操作 (Actions)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shifts.map((s, idx) => (
                            <tr
                                key={idx}
                                onClick={() => handleShiftClick(s, idx)}
                                className={selectedShiftIdx === idx ? styles.selectedRow : ''}
                                style={{ cursor: shiftSource === 'custom' ? 'pointer' : 'default' }}
                            >
                                <td className={styles.td}>{s.name}</td>
                                <td className={styles.td}>{s.start}</td>
                                <td className={styles.td}>{s.end}</td>
                                <td className={styles.td}>
                                    <button
                                        className={styles.miniBtn}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteShift(idx); }}
                                        disabled={shiftSource === 'inherit'}
                                    >刪除</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className={styles.editRow}>
                    <input placeholder="班別 (Name)" value={newShiftName} onChange={e => setNewShiftName(e.target.value)} disabled={shiftSource === 'inherit'} style={{ width: '80px' }} />
                    <input type="time" value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} disabled={shiftSource === 'inherit'} />
                    <span>~</span>
                    <input type="time" value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} disabled={shiftSource === 'inherit'} />
                    <button className={styles.actionButton} onClick={handleAddShift} disabled={shiftSource === 'inherit'}>
                        {selectedShiftIdx !== null ? '修改 (Update)' : '新增 (Add)'}
                    </button>
                    {selectedShiftIdx !== null && (
                        <button className={styles.actionButton} onClick={() => {
                            setSelectedShiftIdx(null); setNewShiftName(''); setNewShiftStart('08:00'); setNewShiftEnd('18:00');
                        }}>取消 (Cancel)</button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderGeneralTab = () => (
        <div className={styles.tabContent} style={{ height: '100%', overflowY: 'auto' }}>
            <h3>一般設定 (General Settings)</h3>

            {/* 公司抬頭設定 */}
            <div className={styles.settingGroup}>
                <h4>公司抬頭設定 (Company Header)</h4>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                    此設定將用於報表列印時的公司抬頭顯示
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <div className={styles.inputRow}>
                            <label>公司名稱 (中文):</label>
                            <input
                                value={companySettings.companyName}
                                onChange={e => handleCompanyChange('companyName', e.target.value)}
                                placeholder="例：台灣紙箱股份有限公司"
                                style={{ flex: 1 }}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>公司名稱 (英文):</label>
                            <input
                                value={companySettings.companyNameEn}
                                onChange={e => handleCompanyChange('companyNameEn', e.target.value)}
                                placeholder="e.g. Taiwan Carton Co., Ltd."
                                style={{ flex: 1 }}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>公司地址:</label>
                            <input
                                value={companySettings.address}
                                onChange={e => handleCompanyChange('address', e.target.value)}
                                placeholder="例：台北市信義區信義路一段100號"
                                style={{ flex: 1 }}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>電話:</label>
                            <input
                                value={companySettings.phone}
                                onChange={e => handleCompanyChange('phone', e.target.value)}
                                placeholder="例：02-1234-5678"
                                style={{ width: '150px' }}
                            />
                            <label style={{ marginLeft: '20px' }}>傳真:</label>
                            <input
                                value={companySettings.fax}
                                onChange={e => handleCompanyChange('fax', e.target.value)}
                                placeholder="例：02-1234-5679"
                                style={{ width: '150px' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <label style={{ marginBottom: '10px', fontWeight: 'bold' }}>公司標誌 (Logo)</label>
                        {companySettings.logo ? (
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={companySettings.logo}
                                    alt="Company Logo"
                                    style={{ maxWidth: '200px', maxHeight: '100px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                                <button
                                    onClick={() => handleCompanyChange('logo', null)}
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        background: '#dc3545',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        cursor: 'pointer'
                                    }}
                                >×</button>
                            </div>
                        ) : (
                            <div style={{
                                width: '200px',
                                height: '100px',
                                border: '2px dashed #ccc',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999'
                            }}>
                                <span>尚未上傳</span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            style={{ marginTop: '10px' }}
                        />
                    </div>
                </div>
            </div>

            {renderUserSection()}
            {renderShiftSection()}

            <div className={styles.settingGroup}>
                <h4>停車原因設定 (Stop Reason Settings)</h4>
                <div className={styles.buttonGroup}>
                    {/* <button className={styles.actionButton} onClick={handleAddStopReason}>新增原因 (Add Reason)</button> */}
                    <button className={styles.actionButton} onClick={handleImportStopReasons}>匯入 (Import)</button>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>ID</th>
                                <th className={styles.th}>原因 (Reason)</th>
                                <th className={styles.th}>類別 (Category)</th>
                                <th className={styles.th}>操作 (Actions)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stopReasonsList.map(reason => (
                                <tr key={reason.id}>
                                    <td className={styles.td}>{reason.id}</td>
                                    <td className={styles.td}>{reason.reason}</td>
                                    <td className={styles.td}>{reason.category}</td>
                                    <td className={styles.td}>
                                        <button className={styles.miniBtn} onClick={() => handleDeleteStopReason(reason.id)}>刪除 (Delete)</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className={styles.editRow}>
                        <input placeholder="ID" value={newStopId} onChange={e => setNewStopId(e.target.value)} style={{ width: '60px' }} />
                        <input placeholder="原因 (Reason)" value={newStopReason} onChange={e => setNewStopReason(e.target.value)} />
                        <input placeholder="類別 (Category)" value={newStopCategory} onChange={e => setNewStopCategory(e.target.value)} />
                        <button className={styles.actionButton} onClick={handleAddStopReason}>新增 (Add)</button>
                    </div>
                </div>
            </div>

            <div className={styles.settingGroup}>
                <h4>不良原因設定 (Defect Reason Settings)</h4>
                <div className={styles.buttonGroup}>
                    {/* <button className={styles.actionButton} onClick={handleAddDefectReason}>新增原因 (Add Reason)</button> */}
                    <button className={styles.actionButton} onClick={handleImportDefectReasons}>匯入 (Import)</button>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>ID</th>
                                <th className={styles.th}>原因 (Reason)</th>
                                <th className={styles.th}>類別 (Category)</th>
                                <th className={styles.th}>操作 (Actions)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {defectReasonsList.map(reason => (
                                <tr key={reason.id}>
                                    <td className={styles.td}>{reason.id}</td>
                                    <td className={styles.td}>{reason.reason}</td>
                                    <td className={styles.td}>{reason.category}</td>
                                    <td className={styles.td}>
                                        <button className={styles.miniBtn} onClick={() => handleDeleteDefectReason(reason.id)}>刪除 (Delete)</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className={styles.editRow}>
                        <input placeholder="ID" value={newDefectId} onChange={e => setNewDefectId(e.target.value)} style={{ width: '60px' }} />
                        <input placeholder="原因 (Reason)" value={newDefectReason} onChange={e => setNewDefectReason(e.target.value)} />
                        <input placeholder="類別 (Category)" value={newDefectCategory} onChange={e => setNewDefectCategory(e.target.value)} />
                        <button className={styles.actionButton} onClick={handleAddDefectReason}>新增 (Add)</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const { user } = useAuth();

    // --- Reason State (Kept here) ---

    const [stopReasonsList, setStopReasonsList] = useState(() => {
        const saved = localStorage.getItem('stopReasonsList');
        return saved ? JSON.parse(saved) : [
            { id: '001', reason: '送紙歪斜 (Feed Skew)', category: 'Feed' },
            { id: '002', reason: '印刷不清 (Print Blurry)', category: 'Print' }
        ];
    });
    const [defectReasonsList, setDefectReasonsList] = useState(() => {
        const saved = localStorage.getItem('defectReasonsList');
        return saved ? JSON.parse(saved) : [
            { id: 'D01', reason: '髒污 (Dirty)', category: 'Quality' }
        ];
    });

    // Inputs for New Reason
    const [newStopId, setNewStopId] = useState('');
    const [newStopReason, setNewStopReason] = useState('');
    const [newStopCategory, setNewStopCategory] = useState('');

    const [newDefectId, setNewDefectId] = useState('');
    const [newDefectReason, setNewDefectReason] = useState('');
    const [newDefectCategory, setNewDefectCategory] = useState('');


    // --- Reason Handlers ---
    const handleAddStopReason = () => {
        if (!newStopId || !newStopReason) {
            alert('請輸入編號與原因 (Please enter ID and Reason)');
            return;
        }
        const newList = [...stopReasonsList, { id: newStopId, reason: newStopReason, category: newStopCategory || 'General' }];
        setStopReasonsList(newList);
        localStorage.setItem('stopReasonsList', JSON.stringify(newList));

        // Reset
        setNewStopId('');
        setNewStopReason('');
        setNewStopCategory('');
    };

    const handleDeleteStopReason = (id) => {
        if (confirm('確定刪除? (Delete Reason?)')) {
            const newList = stopReasonsList.filter(r => r.id !== id);
            setStopReasonsList(newList);
            localStorage.setItem('stopReasonsList', JSON.stringify(newList));
        }
    };

    const handleImportStopReasons = () => {
        alert('模擬由 Excel 匯入成功! (Simulated Import from Excel)');
        const newList = [
            ...stopReasonsList,
            { id: '003', reason: '機械故障 (Imported)', category: 'Machine' },
            { id: '004', reason: '缺墨 (Imported)', category: 'Material' }
        ];
        setStopReasonsList(newList);
        localStorage.setItem('stopReasonsList', JSON.stringify(newList));
    };

    const handleAddDefectReason = () => {
        if (!newDefectId || !newDefectReason) {
            alert('請輸入編號與原因 (Please enter ID and Reason)');
            return;
        }
        const newList = [...defectReasonsList, { id: newDefectId, reason: newDefectReason, category: newDefectCategory || 'General' }];
        setDefectReasonsList(newList);
        localStorage.setItem('defectReasonsList', JSON.stringify(newList));

        // Reset
        setNewDefectId('');
        setNewDefectReason('');
        setNewDefectCategory('');
    };

    const handleDeleteDefectReason = (id) => {
        if (confirm('確定刪除? (Delete Reason?)')) {
            const newList = defectReasonsList.filter(r => r.id !== id);
            setDefectReasonsList(newList);
            localStorage.setItem('defectReasonsList', JSON.stringify(newList));
        }
    };

    const handleImportDefectReasons = () => {
        alert('模擬由 Excel 匯入成功! (Simulated Import from Excel)');
        const newList = [
            ...defectReasonsList,
            { id: 'D02', reason: '顏色偏差 (Imported)', category: 'Color' }
        ];
        setDefectReasonsList(newList);
        localStorage.setItem('defectReasonsList', JSON.stringify(newList));
    };

    // --- Box Type State ---
    const [boxTypes, setBoxTypes] = useState([]);
    const [selectedBoxTypeId, setSelectedBoxTypeId] = useState(null);
    const [selectedPositionField, setSelectedPositionField] = useState(null);

    // Fetch on Mount
    useEffect(() => {
        getBoxTypes().then(types => {
            if (types && types.length > 0) {
                setBoxTypes(types);
                // Select first default
                setSelectedBoxTypeId(types[0].id);
            } else {
                // Determine defaults if empty? Or let user create?
                // For now, if empty API, maybe load defaults?
                // Let's keep existing default logic but trigger save
                const defaultTypes = [ /* ... copy defaults ... */];
                // Actually, let's just leave it empty if API is empty to avoid overwriting user deletions
                // UNLESS it's truly the first run.
                // Assuming API returns empty list on first run.
                // I'll stick to simple "setBoxTypes(types)"
                setBoxTypes(types || []);
            }
        }).catch(console.error);
    }, []);

    // --- Box Type Handlers ---
    const handleAddBoxType = () => {
        const name = prompt('請輸入盒型名稱 (Enter Box Type Name):');
        if (!name) return;

        const newBox = {
            id: Date.now().toString(),
            name,
            erpAlias: '',
            image: null,
            // Length
            useS1: false, labelS1: 'S1',
            useS2: false, labelS2: 'S2',
            useS3: false, labelS3: 'S3',
            useS4: false, labelS4: 'S4',
            useS5: false, labelS5: 'S5',
            lenCorrection: 0,
            // Width
            useLeading: false, labelLeading: 'Leading',
            useBody: false, labelBody: 'Body',
            useTail: false, labelTail: 'Tail',
            widCorrection: 0,

            lengthEq: '', widthEq: '', heightEq: 'Body', quantityEq: '',

            fields: []
        };
        const newTypes = [...boxTypes, newBox];
        setBoxTypes(newTypes);
        updateBoxTypes(newTypes).catch(console.error);
        setSelectedBoxTypeId(newBox.id);
    };

    const handleEditBoxType = () => {
        if (!selectedBoxTypeId) return;
        const box = boxTypes.find(b => b.id === selectedBoxTypeId);
        const newName = prompt('修改盒型名稱 (Rename Box Type):', box.name);
        if (newName && newName !== box.name) {
            handleUpdateBoxType(selectedBox.id, 'name', newName); // This calls update
        }
    };

    const handleDeleteBoxType = () => {
        if (!selectedBoxTypeId) return;
        if (confirm('確定刪除此盒型? (Delete this Box Type?)')) {
            const newTypes = boxTypes.filter(b => b.id !== selectedBoxTypeId);
            setBoxTypes(newTypes);
            updateBoxTypes(newTypes).catch(console.error);
            setSelectedBoxTypeId(null);
        }
    };

    const handleUpdateBoxType = (id, key, value) => {
        const newTypes = boxTypes.map(b =>
            b.id === id ? { ...b, [key]: value } : b
        );
        setBoxTypes(newTypes);
        updateBoxTypes(newTypes).catch(console.error);
    };

    const handleImageUpload = (id, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            handleUpdateBoxType(id, 'image', reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Helper to display formula
    const getLengthFormula = (box) => {
        const parts = [];
        if (box.useS1) parts.push(box.labelS1 || 'S1');
        if (box.useS2) parts.push(box.labelS2 || 'S2');
        if (box.useS3) parts.push(box.labelS3 || 'S3');
        if (box.useS4) parts.push(box.labelS4 || 'S4');
        if (box.useS5) parts.push(box.labelS5 || 'S5');

        let formula = parts.length > 0 ? parts.join(' + ') : '(None)';
        if (box.lenCorrection !== 0 && box.lenCorrection !== '0') {
            formula += ` + (${box.lenCorrection})`;
        }
        return formula;
    };

    const getWidthFormula = (box) => {
        const parts = [];
        if (box.useLeading) parts.push(box.labelLeading || 'Leading');
        if (box.useBody) parts.push(box.labelBody || 'Body');
        if (box.useTail) parts.push(box.labelTail || 'Tail');

        let formula = parts.length > 0 ? parts.join(' + ') : '(None)';
        if (box.widCorrection !== 0 && box.widCorrection !== '0') {
            formula += ` + (${box.widCorrection})`;
        }
        return formula;
    };

    const renderBoxTypeTab = () => {
        const selectedBox = boxTypes.find(b => b.id === selectedBoxTypeId);

        return (
            <div className={styles.tabContent} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3>盒型設定 (Box Type Settings)</h3>
                <div className={styles.twoColumnLayout}>
                    {/* Left: List with Toolbar */}
                    <div className={styles.leftPanel}>
                        <div className={styles.buttonGroup} style={{ marginBottom: '10px' }}>
                            <button className={styles.actionButton} onClick={handleAddBoxType}>新增 (Add)</button>
                            <button className={styles.actionButton} onClick={handleEditBoxType} disabled={!selectedBoxTypeId}>修改 (Edit)</button>
                            <button className={styles.actionButton} onClick={handleDeleteBoxType} disabled={!selectedBoxTypeId} style={{ color: 'red', borderColor: 'red' }}>刪除 (Del)</button>
                        </div>
                        <div className={styles.listBox}>
                            {boxTypes.map(box => (
                                <div
                                    key={box.id}
                                    className={`${styles.listItem} ${selectedBoxTypeId === box.id ? styles.active : ''}`}
                                    onClick={() => setSelectedBoxTypeId(box.id)}
                                >
                                    <span>{box.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Detail */}
                    <div className={styles.rightPanel}>
                        {selectedBox ? (
                            <div>
                                <div className={styles.settingGroup}>
                                    <h4>基本資訊 (Basic Info)</h4>
                                    <div className={styles.inputRow}>
                                        <label>盒型名稱 (Name):</label>
                                        <input
                                            value={selectedBox.name}
                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>ERP 別名 (ERP Alias):</label>
                                        <input
                                            value={selectedBox.erpAlias || ''}
                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, 'erpAlias', e.target.value)}
                                            placeholder="e.g. Dk3"
                                            style={{ width: '100px' }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>對應文字敘述 (Desc):</label>
                                        <input
                                            value={selectedBox.description || ''}
                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, 'description', e.target.value)}
                                            placeholder="e.g. 長*寬*高 = S2*S3*H"
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>對應公式 (Formulas):</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ width: '40px' }}>L =</span>
                                                <input
                                                    value={selectedBox.lengthEq || ''}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'lengthEq', e.target.value)}
                                                    placeholder="e.g. S1 + S3"
                                                    style={{ flex: 1 }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ width: '40px' }}>W =</span>
                                                <input
                                                    value={selectedBox.widthEq || ''}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'widthEq', e.target.value)}
                                                    placeholder="e.g. S2 + S4"
                                                    style={{ flex: 1 }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ width: '40px' }}>H =</span>
                                                <input
                                                    value={selectedBox.heightEq || ''}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'heightEq', e.target.value)}
                                                    placeholder="e.g. Body"
                                                    style={{ flex: 1 }}
                                                />
                                            </div>
                                            {/* Production Qty Formula */}
                                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                                                <span style={{ width: '40px', color: 'green', fontWeight: 'bold' }}>Qty=</span>
                                                <input
                                                    value={selectedBox.quantityEq || ''}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'quantityEq', e.target.value)}
                                                    placeholder="e.g. (TotalMeters * 1000) / (L + 30)"
                                                    style={{ flex: 1, borderColor: 'green' }}
                                                />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: '#666' }}>支援 +, -, *, /, ( ) 與欄位變數 (S1, L, W...)</span>
                                        </div>
                                    </div>

                                    {/* Length Config */}
                                    <div className={styles.subSection} style={{ marginTop: '10px' }}>
                                        <h4>長度定義 (Length Definition)</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {['S1', 'S2', 'S3', 'S4', 'S5'].map(s => (
                                                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <label style={{ width: 'auto' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBox[`use${s}`]}
                                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, `use${s}`, e.target.checked)}
                                                        />
                                                        {s}
                                                    </label>
                                                    <input
                                                        placeholder="標籤 (Label e.g. 長/寬)"
                                                        value={selectedBox[`label${s}`] || ''}
                                                        onChange={(e) => handleUpdateBoxType(selectedBox.id, `label${s}`, e.target.value)}
                                                        style={{ padding: '4px', width: '100px', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                            ))}
                                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                                                <label style={{ width: 'auto', color: '#d32f2f' }}>修正值 (Correction):</label>
                                                <input
                                                    type="number"
                                                    value={selectedBox.lenCorrection || 0}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'lenCorrection', e.target.value)}
                                                    style={{ width: '80px' }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: '#666' }}>mm (加減值)</span>
                                            </div>
                                        </div>
                                        <p style={{ color: '#1890ff', fontWeight: 'bold', marginTop: '10px' }}>
                                            公式: {getLengthFormula(selectedBox)}
                                        </p>
                                    </div>

                                    {/* Width Config */}
                                    <div className={styles.subSection} style={{ marginTop: '10px' }}>
                                        <h4>寬度定義 (Width Definition)</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {[
                                                { key: 'useLeading', labelKey: 'labelLeading', defaultName: 'Leading' },
                                                { key: 'useBody', labelKey: 'labelBody', defaultName: 'Body' },
                                                { key: 'useTail', labelKey: 'labelTail', defaultName: 'Tail' }
                                            ].map(item => (
                                                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <label style={{ width: 'auto' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBox[item.key]}
                                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, item.key, e.target.checked)}
                                                        />
                                                        {item.defaultName}
                                                    </label>
                                                    <input
                                                        placeholder="標籤 (Label)"
                                                        value={selectedBox[item.labelKey] || ''}
                                                        onChange={(e) => handleUpdateBoxType(selectedBox.id, item.labelKey, e.target.value)}
                                                        style={{ padding: '4px', width: '120px', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                            ))}
                                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                                                <label style={{ width: 'auto', color: '#d32f2f' }}>修正值 (Correction):</label>
                                                <input
                                                    type="number"
                                                    value={selectedBox.widCorrection || 0}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'widCorrection', e.target.value)}
                                                    style={{ width: '80px' }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: '#666' }}>mm (加減值)</span>
                                            </div>
                                        </div>
                                        <p style={{ color: '#1890ff', fontWeight: 'bold', marginTop: '10px' }}>
                                            公式: {getWidthFormula(selectedBox)}
                                        </p>
                                    </div>


                                    {/* Diagram Position Settings */}
                                    <div className={styles.subSection} style={{ marginTop: '10px', borderTop: '2px solid #eee', paddingTop: '10px' }}>
                                        <h4>圖面欄位位置設定 (Diagram Position Settings)</h4>
                                        <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#666' }}>
                                            選取下方欄位，點擊圖面以設定顯示位置 (Select field below, then click image to set position)
                                        </div>

                                        {/* Field Selector */}
                                        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                            {['S1', 'S2', 'S3', 'S4', 'S5', 'Leading', 'Body', 'Tail', 'L', 'W'].map(field => (
                                                <button
                                                    key={field}
                                                    onClick={() => setSelectedPositionField(field)}
                                                    style={{
                                                        padding: '5px 10px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        background: selectedPositionField === field ? '#1976d2' : '#f5f5f5',
                                                        color: selectedPositionField === field ? '#fff' : '#000',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    {field}
                                                </button>
                                            ))}
                                        </div>

                                        <div className={styles.inputRow}>
                                            <label>盒型圖示 (Image):</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(selectedBox.id, e)} />
                                        </div>

                                        <div className={styles.imagePreviewArea} style={{ position: 'relative', display: 'inline-block' }}>
                                            {selectedBox.image ? (
                                                <div
                                                    style={{ position: 'relative', display: 'inline-block', cursor: 'crosshair' }}
                                                    onClick={(e) => {
                                                        if (!selectedPositionField) {
                                                            alert('請先選擇要設定位置的欄位 (Please select a field first)');
                                                            return;
                                                        }
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                        const y = ((e.clientY - rect.top) / rect.height) * 100;

                                                        const currentPositions = selectedBox.fieldPositions || {};
                                                        handleUpdateBoxType(selectedBox.id, 'fieldPositions', {
                                                            ...currentPositions,
                                                            [selectedPositionField]: { x, y }
                                                        });
                                                    }}
                                                >
                                                    <img src={selectedBox.image} alt="Box Preview" className={styles.previewImage} style={{ maxWidth: '100%', display: 'block' }} />

                                                    {/* Render Markers */}
                                                    {selectedBox.fieldPositions && Object.entries(selectedBox.fieldPositions).map(([key, pos]) => (
                                                        <div
                                                            key={key}
                                                            style={{
                                                                position: 'absolute',
                                                                left: `${pos.x}%`,
                                                                top: `${pos.y}%`,
                                                                transform: 'translate(-50%, -50%)',
                                                                background: key === selectedPositionField ? 'rgba(25, 118, 210, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                                                                color: '#fff',
                                                                padding: '2px 5px',
                                                                borderRadius: '3px',
                                                                fontSize: '0.7rem',
                                                                pointerEvents: 'none',
                                                                border: '1px solid #fff',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {key}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#999' }}>請上傳圖片 (Please upload image)</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' }}>
                                請選擇或新增盒型 (Select or Add Box Type)
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- Unit Settings State ---
    const [unitSettings, setUnitSettings] = useState(() => {
        const saved = localStorage.getItem('unitSettings');
        return saved ? JSON.parse(saved) : {
            unit: 'mm', // 'mm' or 'inch'
            maxSpeed: 350,
            flutes: [
                { name: 'AB', value: 7.6 },
                { name: 'A', value: 4.0 },
                { name: 'B', value: 3.6 }
            ]
        };
    });

    const handleUnitChange = (key, value) => {
        setUnitSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem('unitSettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    const handleAddFlute = () => {
        const name = prompt('請輸入楞別名稱 (Enter Flute Name):', 'E');
        if (!name) return;
        const valStr = prompt(`請輸入 ${name} 楞厚度 (Enter Thickness):`, '2.0');
        if (!valStr) return;

        const newFlutes = [...unitSettings.flutes, { name, value: parseFloat(valStr) || 0 }];
        handleUnitChange('flutes', newFlutes);
    };

    const handleUpdateFlute = (index, key, value) => {
        const newFlutes = [...unitSettings.flutes];
        newFlutes[index] = { ...newFlutes[index], [key]: value };
        handleUnitChange('flutes', newFlutes);
    };

    const handleDeleteFlute = (index) => {
        if (confirm('確定刪除此楞別? (Delete Flute?)')) {
            const newFlutes = unitSettings.flutes.filter((_, i) => i !== index);
            handleUnitChange('flutes', newFlutes);
        }
    };

    // --- Machine Settings State ---
    const [machineSettings, setMachineSettings] = useState(() => {
        const saved = localStorage.getItem('machineSettings');
        // Keep maxSpeed from local, but sections will be fetched
        return saved ? JSON.parse(saved) : {
            maxSpeed: 350, // 機台極速 (張/分)
            sections: []
        };
    });

    // Fetch Machine Sections on Mount
    useEffect(() => {
        const fetchSections = async () => {
            try {
                const sections = await getMachineSections();
                setMachineSettings(prev => ({
                    ...prev,
                    sections: sections || []
                }));
            } catch (error) {
                console.error("Failed to fetch machine sections:", error);
            }
        };
        fetchSections();
    }, []);

    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [newSectionName, setNewSectionName] = useState('');

    /**
     * 更新機台設定
     * @param {string} key - 設定項目鍵值
            * @param {any} value - 新的值
            */
    const handleMachineChange = (key, value) => {
        setMachineSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem('machineSettings', JSON.stringify(newSettings));

            // If maxSpeed changed, sync to Redis for Worker
            if (key === 'maxSpeed') {
                const payload = { ...commSettings, max_speed: value };
                updateCommunicationSettings(payload).catch(console.error);
            }

            return newSettings;
        });
    };

    /**
     * 新增機台部位
     */
    const handleAddSection = async () => {
        if (!newSectionName) {
            alert('請輸入部位名稱 (Please enter Section Name)');
            return;
        }
        const name = newSectionName;

        const maxOrder = machineSettings.sections.length > 0
            ? Math.max(...machineSettings.sections.map(s => s.order))
            : 0;

        const newSectionPayload = {
            name,
            order: maxOrder + 1,
            is_active: true
        };

        try {
            const createdSection = await createMachineSection(newSectionPayload); // API Call returns the created object

            const newSections = [...machineSettings.sections, createdSection];
            // setMachineSettings UPDATE: Don't overwrite whole object, just sections
            setMachineSettings(prev => ({ ...prev, sections: newSections }));
            localStorage.setItem('machineSettings', JSON.stringify({ ...machineSettings, sections: newSections }));

            setSelectedSectionId(createdSection.id);
            setNewSectionName('');
        } catch (error) {
            console.error("Failed to create section:", error);
            alert("新增失敗 (Failed to create section)");
        }
    };

    /**
     * 刪除機台部位
     * @param {string} sectionId - 部位ID
            */
    /**
     * 刪除機台部位
     * @param {string} sectionId - 部位ID
            */
    const handleDeleteSection = async (sectionId) => {
        if (!confirm('確定刪除此部位? (Delete Section?)')) return;

        try {
            await apiDeleteSection(sectionId); // API Call

            const newSections = machineSettings.sections
                .filter(s => s.id !== sectionId)
            // .map((s, idx) => ({...s, order: idx + 1 })); // Skip re-ordering DB for now to avoid multiple requests
            // Just keep local order consistent for display if needed, but 'order' field in DB won't match idx+1 exactly unless we update all.
            // For simplicity, just remove it. The order sorting still works.

            handleMachineChange('sections', newSections);
            if (selectedSectionId === sectionId) {
                setSelectedSectionId(null);
            }
        } catch (error) {
            console.error("Failed to delete section:", error);
            alert("刪除失敗 (Failed to delete section)");
        }
    };

    /**
     * 移動機台部位順序
     * @param {string} sectionId - 部位ID
            * @param {'up' | 'down'} direction - 移動方向
            */
    const handleMoveSection = async (sectionId, direction) => {
        const sections = [...machineSettings.sections].sort((a, b) => a.order - b.order);
        const idx = sections.findIndex(s => s.id === sectionId);

        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === sections.length - 1) return;

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

        // Swap targets
        const currentSection = sections[idx];
        const targetSection = sections[targetIdx];

        // Store new orders
        const newCurrentOrder = targetSection.displayOrder;
        const newTargetOrder = currentSection.displayOrder;

        // Optimistic Update
        const updatedSections = [...sections];
        updatedSections[idx] = { ...currentSection, displayOrder: newCurrentOrder };
        updatedSections[targetIdx] = { ...targetSection, displayOrder: newTargetOrder };

        const sortedSections = updatedSections.sort((a, b) => a.displayOrder - b.displayOrder);
        handleMachineChange('sections', sortedSections);

        // API Update
        try {
            await Promise.all([
                apiUpdateSection(currentSection.id, { displayOrder: newCurrentOrder }),
                apiUpdateSection(targetSection.id, { displayOrder: newTargetOrder })
            ]);
        } catch (error) {
            console.error("Failed to update section order:", error);
            alert("順序更新失敗 (Failed to update order)");
        }
    };

    /**
     * 重置為預設部位
     */
    const handleResetDefaults = async () => {
        if (!confirm('確定重置? 這將刪除現有部位並建立預設值。 (Reset to Defaults?)')) return;

        const defaultSections = [
            { name: '送紙部 (Feeder)', displayOrder: 1, errorSignal: 'di3', errorValue: '1' },
            { name: '印刷1部 (Print 1)', displayOrder: 2, errorSignal: 'di4', errorValue: '1' },
            { name: '印刷2部 (Print 2)', displayOrder: 3, errorSignal: 'di5', errorValue: '1' },
            { name: '印刷3部 (Print 3)', displayOrder: 4, errorSignal: 'di6', errorValue: '1' },
            { name: '模切部 (Die-cut)', displayOrder: 5, errorSignal: 'di7', errorValue: '1' }
        ];

        try {
            // Delete all existing
            for (const s of machineSettings.sections) {
                await apiDeleteSection(s.id);
            }

            // Create defaults
            const created = [];
            for (const d of defaultSections) {
                const res = await createMachineSection({ ...d, isActive: true });
                created.push(res);
            }

            setMachineSettings(prev => ({ ...prev, sections: created }));
            localStorage.setItem('machineSettings', JSON.stringify({ ...machineSettings, sections: created }));
            setSelectedSectionId(created.length > 0 ? created[0].id : null);
            alert('已重置為預設值 (Reset Complete)');
        } catch (err) {
            console.error(err);
            alert('重置失敗 (Reset Failed)');
        }
    };

    /**
     * 通用更新部位欄位
     */
    const handleUpdateSectionField = async (sectionId, key, value) => {
        // Optimistic
        const newSections = machineSettings.sections.map(s =>
            s.id === sectionId ? { ...s, [key]: value } : s
        );
        handleMachineChange('sections', newSections); // Save local

        // API
        const section = newSections.find(s => s.id === sectionId);
        try {
            await apiUpdateSection(section);
        } catch (e) { console.error("Update failed", e); }
    };

    /**
     * 渲染機台設定分頁
     */
    const renderMachineTab = () => {
        const sortedSections = [...machineSettings.sections].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        const selectedSection = machineSettings.sections.find(s => s.id === selectedSectionId);

        const signals = [
            { value: '', label: '(None)' },
            ...Array.from({ length: 8 }, (_, i) => ({ value: `di${i + 1}`, label: `DI ${i + 1}` })),
            ...Array.from({ length: 8 }, (_, i) => ({ value: `do${i + 1}`, label: `DO ${i + 1}` })),
            { value: 'status_code', label: 'Status Code' }
        ];

        return (
            <div className={styles.tabContent} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3>{t('settings.machine.title')}</h3>
                <p className={styles.description}>{t('settings.machine.desc')}</p>

                {/* 機台極速設定 */}
                <div className={styles.settingGroup}>
                    <h4>{t('settings.machine.maxSpeed')}</h4>
                    <div className={styles.inputRow}>
                        <label>{t('settings.machine.maxSpeed')}:</label>
                        <input
                            type="number"
                            value={machineSettings.maxSpeed}
                            onChange={e => handleMachineChange('maxSpeed', Number(e.target.value))}
                            style={{ width: '100px' }}
                        />
                        <span>張/分 ({t('common.speed')} unit)</span>
                    </div>
                </div>

                {/* 部位設定 */}
                <div className={styles.settingGroup}>
                    <h4>{t('settings.machine.sections')}</h4>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                        這些部位將用於機器狀態顯示和保養維修的部位選項
                    </p>

                    <div className={styles.twoColumnLayout}>
                        {/* 左側：部位列表 */}
                        <div className={styles.leftPanel}>
                            <div className={styles.buttonGroup} style={{ marginBottom: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <input
                                    placeholder={t('settings.machine.sectionName')}
                                    value={newSectionName}
                                    onChange={e => setNewSectionName(e.target.value)}
                                    style={{ padding: '5px', width: '120px' }}
                                />
                                <button className={styles.actionButton} onClick={handleAddSection}>{t('settings.machine.add')}</button>
                                <button
                                    className={styles.actionButton}
                                    onClick={() => handleResetDefaults()}
                                    style={{ backgroundColor: '#666', borderColor: '#666' }}
                                >預設 (Defaults)</button>
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <button className={styles.actionButton} onClick={() => handleMoveSection(selectedSectionId, 'up')} disabled={!selectedSectionId}>▲</button>
                                <button className={styles.actionButton} onClick={() => handleMoveSection(selectedSectionId, 'down')} disabled={!selectedSectionId}>▼</button>
                                <button className={styles.actionButton} onClick={() => handleDeleteSection(selectedSectionId)} disabled={!selectedSectionId} style={{ color: 'red' }}>刪除 (Del)</button>
                            </div>

                            <div className={styles.listBox} style={{ minHeight: '300px' }}>
                                {sortedSections.map((section, idx) => (
                                    <div
                                        key={section.id}
                                        className={`${styles.listItem} ${selectedSectionId === section.id ? styles.active : ''}`}
                                        onClick={() => setSelectedSectionId(section.id)}
                                    >
                                        <span style={{ marginRight: '8px', color: '#888', fontSize: '0.85rem' }}>
                                            {idx + 1}.
                                        </span>
                                        <span>{section.name}</span>
                                    </div>
                                ))}
                                {sortedSections.length === 0 && (
                                    <div style={{ padding: '20px', color: '#999', textAlign: 'center' }}>
                                        尚無部位，請點擊「新增」按鈕
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 右側：選中部位詳情 */}
                        <div className={styles.rightPanel}>
                            {selectedSection ? (
                                <div className={styles.settingGroup}>
                                    <h4>部位詳情 (Section Details)</h4>
                                    <div className={styles.inputRow}>
                                        <label>{t('settings.machine.sectionName')}:</label>
                                        <input
                                            value={selectedSection.name}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'name', e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>順序 (Order):</label>
                                        <span style={{ fontWeight: 'bold' }}>{selectedSection.displayOrder}</span>
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>故障訊號 (Fault Signal):</label>
                                        <select
                                            value={selectedSection.errorSignal || ''}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'errorSignal', e.target.value)}
                                            style={{ width: '120px' }}>
                                            {signals.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                        <span style={{ margin: '0 5px' }}>Value:</span>
                                        <input
                                            value={selectedSection.errorValue || ''}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'errorValue', e.target.value)}
                                            placeholder="1"
                                            style={{ width: '60px' }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>運作訊號 (Run Signal):</label>
                                        <select
                                            value={selectedSection.runSignal || ''}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'runSignal', e.target.value)}
                                            style={{ width: '120px' }}>
                                            {signals.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                        <span style={{ margin: '0 5px' }}>Value:</span>
                                        <input
                                            value={selectedSection.runValue || ''}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'runValue', e.target.value)}
                                            placeholder="1"
                                            style={{ width: '60px' }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>ID:</label>
                                        <span style={{ color: '#888', fontSize: '0.85rem' }}>{selectedSection.id}</span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '40px', color: '#999', textAlign: 'center' }}>
                                    請從左側選擇一個部位以查看詳情
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    const renderUnitTab = () => (
        <div className={styles.tabContent} style={{ height: '100%', overflowY: 'auto' }}>
            <h3>{t('settings.unit.title')}</h3>

            {/* Unit Selection */}
            <div className={styles.settingGroup}>
                <h4>{t('settings.unit.select')}</h4>
                <div className={styles.radioGroup}>
                    <label>
                        <input
                            type="radio"
                            name="unit"
                            value="mm"
                            checked={unitSettings.unit === 'mm'}
                            onChange={e => handleUnitChange('unit', e.target.value)}
                        />
                        {t('settings.unit.mm')}
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="unit"
                            value="inch"
                            checked={unitSettings.unit === 'inch'}
                            onChange={e => handleUnitChange('unit', e.target.value)}
                        />
                        {t('settings.unit.inch')}
                    </label>
                </div>
            </div>

            {/* Flute Settings */}
            <div className={styles.settingGroup}>
                <h4>{t('settings.unit.fluteSettings')}</h4>
                <div className={styles.buttonGroup}>
                    <button className={styles.actionButton} onClick={handleAddFlute}>{t('settings.unit.addFlute')}</button>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>{t('settings.unit.flute')}</th>
                                <th className={styles.th}>{t('settings.unit.thickness')}</th>
                                <th className={styles.th}>{t('settings.machine.delete')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {unitSettings.flutes.map((flute, idx) => (
                                <tr key={idx}>
                                    <td className={styles.td}>
                                        <input
                                            value={flute.name}
                                            onChange={e => handleUpdateFlute(idx, 'name', e.target.value)}
                                            style={{ width: '60px', textAlign: 'center' }}
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                            type="number"
                                            value={flute.value}
                                            onChange={e => handleUpdateFlute(idx, 'value', Number(e.target.value))}
                                            style={{ width: '80px', textAlign: 'center' }}
                                        />
                                        <span> {unitSettings.unit}</span>
                                    </td>
                                    <td className={styles.td}>
                                        <button className={styles.miniBtn} onClick={() => handleDeleteFlute(idx)}>刪除 (Delete)</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
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

    const renderReportTab = () => (
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

    // RBAC: Check visibility
    // RBAC: Check visibility
    const canSeeCommunication = true; // user?.role === 'ADMIN';
    const canSeeFormula = true; // user?.role === 'ADMIN';
    const canSeeBoxType = true; // Open to all or admin?
    const canSeeUnit = true; // Open to all

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>{t('nav.settings')}</div>
                <div className={`${styles.menuItem} ${activeTab === 'general' ? styles.active : ''}`} onClick={() => setActiveTab('general')}>{t('settings.tabs.general')}</div>
                <div className={`${styles.menuItem} ${activeTab === 'unit' ? styles.active : ''}`} onClick={() => setActiveTab('unit')}>{t('settings.tabs.unit')}</div>
                <div className={`${styles.menuItem} ${activeTab === 'machine' ? styles.active : ''}`} onClick={() => setActiveTab('machine')}>{t('settings.tabs.machine')}</div>

                {canSeeCommunication && (
                    <div className={`${styles.menuItem} ${activeTab === 'communication' ? styles.active : ''}`} onClick={() => setActiveTab('communication')}>{t('settings.tabs.communication')}</div>
                )}

                {canSeeFormula && (
                    <div className={`${styles.menuItem} ${activeTab === 'formula' ? styles.active : ''}`} onClick={() => setActiveTab('formula')}>{t('settings.tabs.formula')}</div>
                )}

                {canSeeBoxType && (
                    <div className={`${styles.menuItem} ${activeTab === 'boxType' ? styles.active : ''}`} onClick={() => setActiveTab('boxType')}>{t('settings.tabs.boxType')}</div>
                )}

                <div className={`${styles.menuItem} ${activeTab === 'report' ? styles.active : ''}`} onClick={() => setActiveTab('report')}>{t('settings.tabs.report')}</div>
            </div>
            <div className={styles.content}>
                {activeTab === 'general' && renderGeneralTab()}
                {activeTab === 'unit' && renderUnitTab()}
                {activeTab === 'machine' && renderMachineTab()}
                {activeTab === 'formula' && (canSeeFormula ? renderFormulaTab() : <div className={styles.tabContent}>Access Denied</div>)}
                {activeTab === 'communication' && (canSeeCommunication ? renderCommunicationTab() : <div className={styles.tabContent}>Access Denied</div>)}
                {activeTab === 'boxType' && (canSeeBoxType ? renderBoxTypeTab() : <div className={styles.tabContent}>Access Denied</div>)}
                {activeTab === 'report' && renderReportTab()}
            </div>
        </div>
    );
};

export default SettingsPage;
