import React from 'react';
import styles from './MaintenanceScheduleForm.module.css';
import GaugeChart from './GaugeChart';
import StatusIndicator from './StatusIndicator';

/**
 * PLC 訊號觸發設定面板
 * @param {object} config - 設定資料
 * @param {function} onChange - 變更事件
 */
const PLCBasedConfig = ({ config, onChange }) => {
    const signalTypes = [
        { id: 'motor_hours', label: '運轉時數', unit: '小時' },
        { id: 'temperature', label: '溫度', unit: '°C' },
        { id: 'pressure', label: '壓力', unit: 'MPa' },
        { id: 'vibration', label: '震動頻率', unit: 'Hz' }
    ];

    const currentSignal = signalTypes.find(s => s.id === config.signalType) || signalTypes[0];
    const remaining = (config.threshold || 0) - (config.currentValue || 0);
    const remainingPercent = (remaining / (config.threshold || 1)) * 100;

    // 決定狀態
    const getStatus = () => {
        if (remaining <= 0) return 'danger';
        if (remainingPercent <= 10) return 'danger';
        if (remainingPercent <= 20) return 'warning';
        return 'normal';
    };

    // 預估到達日
    const estimateDate = () => {
        if (!config.avgDaily || config.avgDaily <= 0) return null;
        const daysRemaining = remaining / config.avgDaily;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + Math.ceil(daysRemaining));
        return targetDate;
    };

    const estimatedDate = estimateDate();

    return (
        <div className={styles.configPanel}>
            <h5 className={styles.configTitle}>PLC 訊號觸發設定</h5>

            {/* 訊號類型 */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#666' }}>
                    訊號類型
                </label>
                <div className={styles.frequencyButtons}>
                    {signalTypes.map(signal => (
                        <button
                            key={signal.id}
                            type="button"
                            className={`${styles.frequencyBtn} ${config.signalType === signal.id ? styles.active : ''}`}
                            onClick={() => onChange({ ...config, signalType: signal.id })}
                        >
                            {signal.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 閾值設定 */}
            <div className={styles.inputRow}>
                <label>每累計</label>
                <input
                    type="number"
                    min="1"
                    value={config.threshold || ''}
                    onChange={e => onChange({ ...config, threshold: parseInt(e.target.value) || 0 })}
                    style={{ width: '120px', textAlign: 'right' }}
                />
                <span>{currentSignal.unit}執行一次</span>
            </div>

            {/* 儀表板 */}
            <div className={styles.gaugeContainer}>
                <GaugeChart
                    value={config.currentValue || 0}
                    max={config.threshold || 10000}
                    unit={currentSignal.unit}
                    label={`目前${currentSignal.label}`}
                />
            </div>

            {/* 狀態顯示 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <div>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>剩餘: </span>
                    <span style={{ fontWeight: 600 }}>{remaining.toLocaleString()} {currentSignal.unit}</span>
                </div>
                <StatusIndicator status={getStatus()} />
            </div>

            {estimatedDate && (
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#666' }}>
                    預估到達日: {estimatedDate.toLocaleDateString('zh-TW')}
                    (基於過去 30 天平均: {config.avgDaily} {currentSignal.unit}/日)
                </div>
            )}

            {/* PLC 連接設定 */}
            <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                <h6 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#666' }}>
                    PLC 連接設定
                </h6>
                <div className={styles.inputRow}>
                    <label>PLC 位址</label>
                    <input
                        type="text"
                        value={config.plcAddress || ''}
                        onChange={e => onChange({ ...config, plcAddress: e.target.value })}
                        placeholder="Ex: D1000"
                        style={{ width: '100px' }}
                    />
                    <label style={{ marginLeft: '16px' }}>資料類型</label>
                    <select
                        value={config.plcDataType || 'DWORD'}
                        onChange={e => onChange({ ...config, plcDataType: e.target.value })}
                    >
                        <option value="WORD">WORD</option>
                        <option value="DWORD">DWORD</option>
                        <option value="REAL">REAL</option>
                    </select>
                </div>

                {/* 連線狀態 */}
                <div className={`${styles.plcStatus} ${config.connected ? styles.connected : styles.disconnected}`}>
                    <div className={`${styles.statusDot} ${!config.connected ? styles.disconnected : ''}`} />
                    <span>{config.connected ? '已連線' : '未連線'}</span>
                    {config.lastSync && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#999' }}>
                            最後更新: {config.lastSync}
                        </span>
                    )}
                </div>
            </div>

            {/* 預警設定 */}
            <div style={{ marginTop: '16px', padding: '16px', background: '#fff8e1', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="checkbox"
                        id="warningEnabled"
                        checked={config.warningEnabled || false}
                        onChange={e => onChange({ ...config, warningEnabled: e.target.checked })}
                    />
                    <label htmlFor="warningEnabled" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                        啟用預警通知
                    </label>
                </div>

                {config.warningEnabled && (
                    <div className={styles.inputRow}>
                        <label>預警閾值</label>
                        <input
                            type="number"
                            value={config.warningThreshold || ''}
                            onChange={e => onChange({ ...config, warningThreshold: parseInt(e.target.value) || 0 })}
                            style={{ width: '100px', textAlign: 'right' }}
                        />
                        <span>{currentSignal.unit} (提前 {(config.threshold || 0) - (config.warningThreshold || 0)} {currentSignal.unit} 通知)</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PLCBasedConfig;
