import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/SettingsPage.module.css';
import {
    getCommunicationSettings,
    updateCommunicationSettings,
    testMqttConnection
} from '../../services/api';
import { buildCommPayload } from '../../utils/commPayload';
import {
    DATA_LOG_INTERVAL_MIN,
    DATA_LOG_INTERVAL_MAX,
    DATA_LOG_INTERVAL_DEFAULT,
    parseLogInterval,
    describeSeconds,
} from '../../utils/dataLogInterval';

/**
 * 滑動開關。輸入:checked、onChange(boolean)、label;輸出:role="switch" 的按鈕。
 * 邏輯:沿用既有 enabled 欄位的布林值,不引入新相依套件。
 */
function ToggleSwitch({ checked, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={!!checked}
            onClick={() => onChange(!checked)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
            <span style={{
                width: '38px', height: '20px', borderRadius: '10px', position: 'relative',
                background: checked ? '#4caf50' : '#bdbdbd', transition: 'background 0.2s'
            }}>
                <span style={{
                    position: 'absolute', top: '2px', left: checked ? '20px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s'
                }} />
            </span>
            <span style={{ fontWeight: 'bold' }}>{label}</span>
        </button>
    );
}

const CommunicationTab = () => {
    const { t } = useLanguage();

    // --- Communication Settings State ---
    const [commSettings, setCommSettings] = useState({
        plc: {
            enabled: true,
            simulate: false,
            deviceType: 'wise',
            ip: '192.168.1.1',
            port: 502,
            motorSignal: 'DI-0',
            countSignal: 'DI-1',
            // Mitsubishi Evol 用序列埠(RS-232)預設值:9600 bps、8 資料位元、偶同位、1 停止位元
            serialPort: '',
            baudRate: 9600,
            dataBits: 8,
            parity: 'even',
            stopBits: 1
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
        machineId: 'MACHINE_01', // 機台識別碼
        mmBaseUrl: '' // P1:MM 維護模組網址,空字串代表未設定(導覽列不顯示入口)
    });

    /*
      S15:間隔改以「秒」輸入(原本是分鐘,`Math.floor(秒/60)` 讓 6 秒顯示成 0 分鐘,
      而且低於一分鐘的值根本打不進去)。
      改秒之後典型值變成三位數,若沿用「每次按鍵就送出」,打「300」的過程會先把
      **3 秒**送到後端與 Worker —— 所以改成草稿狀態,離開欄位或按 Enter 才送出。
    */
    const [logIntervalDraft, setLogIntervalDraft] = useState(String(DATA_LOG_INTERVAL_DEFAULT));
    const isLogIntervalInRange = parseLogInterval(logIntervalDraft).ok;

    // MQTT Test State
    const [mqttTestStatus, setMqttTestStatus] = useState('idle'); // idle, testing, success, error
    const [mqttTestMsg, setMqttTestMsg] = useState('');
    const [showMqttMonitor, setShowMqttMonitor] = useState(false);

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
                            mqttTopic: data.mqtt_topic,
                            // 舊設定沒有這些鍵,缺值時落回預設
                            serialPort: data.plc_serial_port ?? '',
                            baudRate: data.plc_baud_rate ?? 9600,
                            dataBits: data.plc_data_bits ?? 8,
                            parity: data.plc_parity ?? 'even',
                            stopBits: data.plc_stop_bits ?? 1
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
                        dataLogInterval: data.data_log_interval || DATA_LOG_INTERVAL_DEFAULT,
                        machineId: data.machine_id || 'MACHINE_01',
                        mmBaseUrl: data.mm_base_url || ''
                    });
                    // S15:草稿要跟著後端的值走,否則畫面顯示的是預設值而非實際生效值
                    setLogIntervalDraft(String(data.data_log_interval || DATA_LOG_INTERVAL_DEFAULT));
                }
            } catch (error) {
                console.error("Failed to load settings from API, using defaults.", error);
            }
        };
        fetchSettings();
    }, []);

    /**
     * 送出定時寫入間隔(離開欄位或按 Enter 時)。
     * 輸入:無(取 logIntervalDraft);輸出:無;
     * 邏輯:超出 1~3600 或非整數一律**不送出**,並把草稿還原成目前生效值 ——
     *       送出去只會被後端靜默換成 300,那比擋下來更糟(使用者會以為設好了)。
     */
    const commitLogInterval = () => {
        const { ok, seconds } = parseLogInterval(logIntervalDraft);
        if (!ok) {
            setLogIntervalDraft(String(commSettings.dataLogInterval));
            return;
        }
        if (seconds === commSettings.dataLogInterval) return; // 沒變就不打 API

        const newSettings = { ...commSettings, dataLogInterval: seconds };
        setCommSettings(newSettings);
        localStorage.setItem('communicationSettings', JSON.stringify(newSettings));
        window.dispatchEvent(new Event('comm-settings-changed'));

        updateCommunicationSettings(buildCommPayload(newSettings))
            .catch(err => console.error('API update failed:', err));
    };

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
        const payload = buildCommPayload(newSettings);

        // 4. Call API
        try {
            await updateCommunicationSettings(payload);
        } catch (error) {
            console.error("Failed to save settings to API:", error);
            // Optionally revert state here if strict consistency is needed
        }
    };

    return (
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
                    <ToggleSwitch
                        checked={commSettings.plc.enabled}
                        onChange={v => handleCommChange('plc', 'enabled', v)}
                        label={t('settingsExt.comm.enableSwitch')}
                    />
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
                                <option value="mhi_evol">Mitsubishi Evol (MHI)</option>
                            </select>
                        </div>

                        {(commSettings.plc.deviceType === 'wise' || commSettings.plc.deviceType === 'mhi_evol') && (
                            <div className={styles.inputRow}>
                                <label>{t('settings.comm.protocol')}:</label>
                                <span>{commSettings.plc.deviceType === 'wise' ? 'MQTT · Advantech WISE-4000' : 'Mitsubishi Evol (MHI) · RS-232'}</span>
                                <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#888' }}>{t('settingsExt.comm.switchNote')}</span>
                            </div>
                        )}

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
                                    <label>{t('settingsExt.comm.monitorInterval')}:</label>
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
                                        <span style={{ marginLeft: '5px' }}>{t('settingsExt.comm.secondsDefault')}</span>
                                    </div>
                                </div>
                            </>
                        ) : commSettings.plc.deviceType === 'mhi_evol' ? (
                            <div style={{ marginLeft: '20px' }}>
                                <div className={styles.inputRow}>
                                    <label>{t('settingsExt.comm.serialPort')}:</label>
                                    <input
                                        value={commSettings.plc.serialPort}
                                        onChange={e => handleCommChange('plc', 'serialPort', e.target.value)}
                                        placeholder="/dev/ttyUSB0 或 COM1"
                                        style={{ width: '200px' }}
                                    />
                                </div>
                                <div className={styles.inputRow}>
                                    <label>{t('settingsExt.comm.baudRate')}:</label>
                                    <select
                                        value={commSettings.plc.baudRate}
                                        onChange={e => handleCommChange('plc', 'baudRate', Number(e.target.value))}
                                        style={{ padding: '6px', width: '110px' }}
                                    >
                                        {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.inputRow}>
                                    <label>{t('settingsExt.comm.dataBits')}:</label>
                                    <select
                                        value={commSettings.plc.dataBits}
                                        onChange={e => handleCommChange('plc', 'dataBits', Number(e.target.value))}
                                        style={{ padding: '6px', width: '110px' }}
                                    >
                                        <option value={7}>7</option>
                                        <option value={8}>8</option>
                                    </select>
                                </div>
                                <div className={styles.inputRow}>
                                    <label>{t('settingsExt.comm.parity')}:</label>
                                    <select
                                        value={commSettings.plc.parity}
                                        onChange={e => handleCommChange('plc', 'parity', e.target.value)}
                                        style={{ padding: '6px', width: '110px' }}
                                    >
                                        <option value="none">{t('settingsExt.comm.parityNone')}</option>
                                        <option value="even">{t('settingsExt.comm.parityEven')}</option>
                                        <option value="odd">{t('settingsExt.comm.parityOdd')}</option>
                                    </select>
                                </div>
                                <div className={styles.inputRow}>
                                    <label>{t('settingsExt.comm.stopBits')}:</label>
                                    <select
                                        value={commSettings.plc.stopBits}
                                        onChange={e => handleCommChange('plc', 'stopBits', Number(e.target.value))}
                                        style={{ padding: '6px', width: '110px' }}
                                    >
                                        <option value={1}>1</option>
                                        <option value={2}>2</option>
                                    </select>
                                </div>
                            </div>
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

                        {/* MQTT Connection Test(Evol 走序列埠,不適用) */}
                        {commSettings.plc.deviceType !== 'mhi_evol' && (
                        <div style={{ marginTop: '15px' }}>
                            <button
                                onClick={async () => {
                                    setMqttTestStatus('testing');
                                    setMqttTestMsg('Connecting...');
                                    try {
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
                                📊 {t('settingsExt.comm.monitorMsg')}
                            </button>
                        </div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: '15px', padding: '10px', background: '#e3f2fd', borderRadius: '4px', fontSize: '0.9rem', color: '#0d47a1' }}>
                    ℹ️ <strong>{t('settingsExt.comm.simControlTitle')}:</strong><br />
                    {t('settingsExt.comm.simControlHintPre')} <strong>[{t('settingsExt.comm.simProduction')}]</strong> {t('settingsExt.comm.simControlHintMid')} <strong>[Power ON/OFF]</strong> {t('settingsExt.comm.simControlHintPost')}
                </div>

                {/* MQTT Debug Monitor Modal (Updated to match DebugDashboard Logic) */}
                {showMqttMonitor && (
                    <div style={{ padding: '10px', marginTop: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
                        TODO: MqttMonitorModal is missing from this project. Placeholder for monitor UI.
                        <button onClick={() => setShowMqttMonitor(false)} style={{ marginLeft: '10px' }}>Close</button>
                    </div>
                )}
            </div>

            {/* [BOTTOM] ERP Settings */}
            <div className={styles.settingGroup} style={{ marginTop: '20px', border: '1px solid #ffe0b2', background: '#fff3e0', padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
                    🏢 {t('settings.comm.erpTitle')}
                </h4>
                <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>
                    {t('settingsExt.comm.erpDesc')}
                </div>

                <div className={styles.inputRow}>
                    <ToggleSwitch
                        checked={commSettings.erp.enabled}
                        onChange={v => handleCommChange('erp', 'enabled', v)}
                        label={t('settingsExt.comm.enableSwitch')}
                    />
                    <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#888' }}>{t('settingsExt.comm.switchNote')}</span>
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
                            /> {t('settingsExt.comm.connNone')}
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
                            <label>{t('settingsExt.comm.serverIp')}:</label>
                            <input
                                value={commSettings.erp.host}
                                onChange={e => handleCommChange('erp', 'host', e.target.value)}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>{t('settingsExt.comm.port')}:</label>
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
                            <label>{t('settingsExt.comm.inputDir')}:</label>
                            <input
                                value={commSettings.erp.inputDir}
                                onChange={e => handleCommChange('erp', 'inputDir', e.target.value)}
                                placeholder="\\\\server\\share\\input"
                                style={{ width: '300px' }}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>{t('settingsExt.comm.outputDir')}:</label>
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
                    💾 {t('settingsExt.comm.dataLogTitle')}
                </h4>
                <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>
                    {t('settingsExt.comm.dataLogDesc')}
                </div>
                <div className={styles.inputRow}>
                    <label>{t('settingsExt.comm.logInterval')}:</label>
                    <input
                        type="number"
                        min={DATA_LOG_INTERVAL_MIN}
                        max={DATA_LOG_INTERVAL_MAX}
                        step="1"
                        value={logIntervalDraft}
                        onChange={e => setLogIntervalDraft(e.target.value)}
                        onBlur={commitLogInterval}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        style={{ width: '90px' }}
                    />
                    <span>{t('settingsExt.comm.seconds')}</span>
                    <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#666' }}>
                        {t('settingsExt.comm.current')}: {commSettings.dataLogInterval} {t('settingsExt.comm.seconds')}
                        {commSettings.dataLogInterval >= 60 && ` (${describeSeconds(commSettings.dataLogInterval)})`}
                    </span>
                </div>
                {/*
                  S15:後端把 <=0 或 >3600 的值**靜默換成預設 300 秒**
                  (SignalMappingProvider.cs:162)。不說出來的話,現場會以為自己設的值生效了,
                  實際跑的是另一個數字 —— 這種落差在畫面上看不出來,只能在這裡講明。
                */}
                {!isLogIntervalInRange && (
                    <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#c62828' }}>
                        ⚠️ {t('settingsExt.comm.intervalOutOfRange')}
                    </div>
                )}
                <div style={{ marginTop: '10px', padding: '10px', background: '#fff', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <strong>{t('settingsExt.comm.note')}：</strong>
                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        <li>{t('settingsExt.comm.noteItem1')}</li>
                        <li>{t('settingsExt.comm.noteItem2')}</li>
                        <li>{t('settingsExt.comm.noteItem3')}</li>
                        <li>{t('settingsExt.comm.noteItem4')}</li>
                    </ul>
                </div>

                {/* Machine ID Setting */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #c5e1a5' }}>
                    <div className={styles.inputRow}>
                        <label>🏭 {t('settingsExt.comm.machineId')}:</label>
                        <input
                            type="text"
                            value={commSettings.machineId || 'MACHINE_01'}
                            onChange={e => {
                                const newSettings = { ...commSettings, machineId: e.target.value };
                                setCommSettings(newSettings);
                                localStorage.setItem('communicationSettings', JSON.stringify(newSettings));

                                const payload = buildCommPayload(newSettings);
                                updateCommunicationSettings(payload).catch(err => console.error('API update failed:', err));
                            }}
                            style={{ width: '200px' }}
                            placeholder="MACHINE_01"
                        />
                        <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#666' }}>
                            {t('settingsExt.comm.machineIdHint')}
                        </span>
                    </div>

                    {/*
                      P1:MM 維護模組入口。與機台識別碼放同一組 —— 兩者是同一件事的兩面:
                      「這台機器是誰」以及「這台機器的保養資料在哪」。
                      空字串時導覽列不顯示入口,不留一個必然打不開的死連結。
                    */}
                    <div className={styles.inputRow} style={{ marginTop: '10px' }}>
                        <label>🔧 {t('settingsExt.comm.mmBaseUrl')}:</label>
                        <input
                            type="text"
                            value={commSettings.mmBaseUrl || ''}
                            onChange={e => {
                                const newSettings = { ...commSettings, mmBaseUrl: e.target.value };
                                setCommSettings(newSettings);
                                localStorage.setItem('communicationSettings', JSON.stringify(newSettings));
                                window.dispatchEvent(new Event('comm-settings-changed'));
                                updateCommunicationSettings(buildCommPayload(newSettings))
                                    .catch(err => console.error('API update failed:', err));
                            }}
                            style={{ width: '280px' }}
                            placeholder="https://mms.ericchh.work"
                        />
                        <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#666' }}>
                            {t('settingsExt.comm.mmBaseUrlHint')}
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.actionRow}>
                <button className={styles.saveBtn} onClick={async () => {
                    try {
                        const payload = buildCommPayload(commSettings);
                        await updateCommunicationSettings(payload);
                        localStorage.setItem('communicationSettings', JSON.stringify(commSettings));
                        alert('✅ ' + t('settingsExt.comm.saveSuccess'));
                    } catch (error) {
                        console.error('Failed to save settings:', error);
                        alert('❌ ' + t('settingsExt.comm.saveFailed') + ': ' + error.message);
                    }
                }}>{t('settingsExt.common.save')}</button>
            </div>
        </div>
    );
};

export default CommunicationTab;
