import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/SettingsPage.module.css';
import {
    getCommunicationSettings,
    updateCommunicationSettings,
    testMqttConnection
} from '../../services/api';

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
            plc_monitor_interval: newSettings.plc.monitor_interval, // 修正 #9:原 payload 遺漏,監控頻率永不送到後端

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
                        value={Math.floor(commSettings.dataLogInterval / 60)}
                        onChange={e => {
                            const minutes = Number(e.target.value);
                            const seconds = minutes * 60;
                            const newSettings = { ...commSettings, dataLogInterval: seconds };
                            setCommSettings(newSettings);
                            localStorage.setItem('communicationSettings', JSON.stringify(newSettings));
                            window.dispatchEvent(new Event('comm-settings-changed'));

                            const payload = {
                                plc_enabled: newSettings.plc.enabled,
                                plc_simulate: newSettings.plc.simulate,
                                plc_device_type: newSettings.plc.deviceType,
                                plc_ip: newSettings.plc.ip,
                                plc_port: newSettings.plc.port,
                                plc_motor_signal: newSettings.plc.motorSignal,
                                plc_count_signal: newSettings.plc.countSignal,
                                plc_monitor_interval: newSettings.plc.monitor_interval, // 修正 #9:保留監控頻率
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
                    <span>{t('settingsExt.comm.minutes')}</span>
                    <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#666' }}>
                        {t('settingsExt.comm.current')}: {Math.floor(commSettings.dataLogInterval / 60)} {t('settingsExt.comm.minutes')} ({commSettings.dataLogInterval} {t('settingsExt.comm.seconds')})
                    </span>
                </div>
                <div style={{ marginTop: '10px', padding: '10px', background: '#fff', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <strong>{t('settingsExt.comm.note')}：</strong>
                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        <li>{t('settingsExt.comm.noteItem1')}</li>
                        <li>{t('settingsExt.comm.noteItem2')}</li>
                        <li>{t('settingsExt.comm.noteItem3')}</li>
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

                                const payload = {
                                    plc_enabled: newSettings.plc.enabled,
                                    plc_simulate: newSettings.plc.simulate,
                                    plc_device_type: newSettings.plc.deviceType,
                                    plc_ip: newSettings.plc.ip,
                                    plc_port: newSettings.plc.port,
                                    plc_motor_signal: newSettings.plc.motorSignal,
                                    plc_count_signal: newSettings.plc.countSignal,
                                    plc_monitor_interval: newSettings.plc.monitor_interval, // 修正 #9:保留監控頻率
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
                            {t('settingsExt.comm.machineIdHint')}
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
