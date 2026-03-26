import React from 'react';
import styles from './MaintenanceScheduleForm.module.css';
import ProgressBar from './ProgressBar';
import StatusIndicator from './StatusIndicator';

/**
 * 張數觸發設定面板
 * @param {object} config - 設定資料
 * @param {function} onChange - 變更事件
 */
const CounterBasedConfig = ({ config, onChange }) => {
    const remaining = (config.threshold || 0) - (config.currentCount || 0);
    const remainingPercent = (remaining / (config.threshold || 1)) * 100;

    // 決定狀態
    const getStatus = () => {
        if (remaining <= 0) return 'danger';
        if (remainingPercent <= 10) return 'danger';
        if (remainingPercent <= 20) return 'warning';
        return 'normal';
    };

    return (
        <div className={styles.configPanel}>
            <h5 className={styles.configTitle}>張數觸發設定</h5>

            {/* 數據來源 */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#666' }}>
                    數據來源
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="counterSource"
                            value="plc"
                            checked={config.source === 'plc'}
                            onChange={() => onChange({ ...config, source: 'plc' })}
                        />
                        <span>PLC 自動讀取</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="counterSource"
                            value="manual"
                            checked={config.source === 'manual'}
                            onChange={() => onChange({ ...config, source: 'manual' })}
                        />
                        <span>人工回報</span>
                    </label>
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
                <span>張執行一次</span>
            </div>

            {/* 進度條 */}
            <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>目前進度</span>
                    <StatusIndicator status={getStatus()} />
                </div>
                <ProgressBar
                    value={config.currentCount || 0}
                    max={config.threshold || 500000}
                    unit="張"
                />
            </div>

            {/* PLC 設定 (僅 PLC 來源) */}
            {config.source === 'plc' && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                    <h6 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#666' }}>
                        PLC 設定
                    </h6>
                    <div className={styles.inputRow}>
                        <label>PLC 位址</label>
                        <input
                            type="text"
                            value={config.plcAddress || ''}
                            onChange={e => onChange({ ...config, plcAddress: e.target.value })}
                            placeholder="Ex: D1002"
                            style={{ width: '120px' }}
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
                </div>
            )}

            {/* 人工回報 (僅手動來源) */}
            {config.source === 'manual' && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#fff3e0', borderRadius: '8px' }}>
                    <h6 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#666' }}>
                        人工回報
                    </h6>
                    <div className={styles.inputRow}>
                        <label>目前張數</label>
                        <input
                            type="number"
                            value={config.currentCount || ''}
                            onChange={e => onChange({ ...config, currentCount: parseInt(e.target.value) || 0 })}
                            style={{ width: '120px', textAlign: 'right' }}
                        />
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                            更新
                        </button>
                    </div>
                    {config.lastUpdate && (
                        <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '8px' }}>
                            最後更新: {config.lastUpdate}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CounterBasedConfig;
