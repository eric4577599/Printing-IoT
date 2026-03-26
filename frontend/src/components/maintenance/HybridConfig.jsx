import React from 'react';
import styles from './MaintenanceScheduleForm.module.css';
import StatusIndicator from './StatusIndicator';

/**
 * 混合觸發設定面板
 * @param {object} config - 設定資料
 * @param {function} onChange - 變更事件
 */
const HybridConfig = ({ config, onChange }) => {
    // 條件類型選項
    const conditionTypes = [
        { id: 'time', label: '週期', icon: '📅' },
        { id: 'counter', label: '張數', icon: '🔢' },
        { id: 'plc', label: 'PLC', icon: '⚙️' }
    ];

    // 新增條件
    const addCondition = () => {
        const newCondition = {
            id: Date.now(),
            type: 'time',
            frequencyUnit: 'month',
            frequencyValue: 1,
            threshold: 0,
            currentValue: 0
        };
        onChange({
            ...config,
            conditions: [...(config.conditions || []), newCondition]
        });
    };

    // 刪除條件
    const deleteCondition = (id) => {
        onChange({
            ...config,
            conditions: (config.conditions || []).filter(c => c.id !== id)
        });
    };

    // 更新條件
    const updateCondition = (id, updates) => {
        onChange({
            ...config,
            conditions: (config.conditions || []).map(c =>
                c.id === id ? { ...c, ...updates } : c
            )
        });
    };

    // 取得條件狀態描述
    const getConditionStatus = (condition) => {
        switch (condition.type) {
            case 'time':
                return `每 ${condition.frequencyValue} ${getUnitLabel(condition.frequencyUnit)}`;
            case 'counter':
                return `每 ${(condition.threshold || 0).toLocaleString()} 張`;
            case 'plc':
                return `每 ${(condition.threshold || 0).toLocaleString()} 小時`;
            default:
                return '';
        }
    };

    const getUnitLabel = (unit) => {
        const labels = { day: '日', week: '週', month: '月', quarter: '季', year: '年' };
        return labels[unit] || unit;
    };

    return (
        <div className={styles.configPanel}>
            <h5 className={styles.configTitle}>混合觸發設定</h5>

            {/* 觸發邏輯 */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#666' }}>
                    觸發邏輯
                </label>
                <div className={styles.logicToggle}>
                    <button
                        type="button"
                        className={`${styles.logicBtn} ${config.logic === 'OR' ? styles.active : ''}`}
                        onClick={() => onChange({ ...config, logic: 'OR' })}
                    >
                        任一條件達成 (OR)
                    </button>
                    <button
                        type="button"
                        className={`${styles.logicBtn} ${config.logic === 'AND' ? styles.active : ''}`}
                        onClick={() => onChange({ ...config, logic: 'AND' })}
                    >
                        全部條件達成 (AND)
                    </button>
                </div>
            </div>

            {/* 條件列表 */}
            {(config.conditions || []).map((condition, index) => (
                <div key={condition.id} className={styles.conditionCard}>
                    <div className={styles.conditionHeader}>
                        <span className={styles.conditionTitle}>
                            條件 {index + 1}: {conditionTypes.find(t => t.id === condition.type)?.icon} {conditionTypes.find(t => t.id === condition.type)?.label}
                        </span>
                        <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => deleteCondition(condition.id)}
                        >
                            ✕
                        </button>
                    </div>

                    {/* 條件類型選擇 */}
                    <div className={styles.inputRow} style={{ marginBottom: '12px' }}>
                        <label>類型</label>
                        <select
                            value={condition.type}
                            onChange={e => updateCondition(condition.id, { type: e.target.value })}
                        >
                            {conditionTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* 依類型顯示不同設定 */}
                    {condition.type === 'time' && (
                        <div className={styles.inputRow}>
                            <label>每</label>
                            <input
                                type="number"
                                min="1"
                                value={condition.frequencyValue || 1}
                                onChange={e => updateCondition(condition.id, { frequencyValue: parseInt(e.target.value) || 1 })}
                                style={{ width: '60px', textAlign: 'center' }}
                            />
                            <select
                                value={condition.frequencyUnit || 'month'}
                                onChange={e => updateCondition(condition.id, { frequencyUnit: e.target.value })}
                            >
                                <option value="day">日</option>
                                <option value="week">週</option>
                                <option value="month">月</option>
                                <option value="quarter">季</option>
                                <option value="year">年</option>
                            </select>
                        </div>
                    )}

                    {condition.type === 'counter' && (
                        <div className={styles.inputRow}>
                            <label>每</label>
                            <input
                                type="number"
                                min="1"
                                value={condition.threshold || ''}
                                onChange={e => updateCondition(condition.id, { threshold: parseInt(e.target.value) || 0 })}
                                style={{ width: '100px', textAlign: 'right' }}
                            />
                            <span>張</span>
                        </div>
                    )}

                    {condition.type === 'plc' && (
                        <div className={styles.inputRow}>
                            <label>每</label>
                            <input
                                type="number"
                                min="1"
                                value={condition.threshold || ''}
                                onChange={e => updateCondition(condition.id, { threshold: parseInt(e.target.value) || 0 })}
                                style={{ width: '100px', textAlign: 'right' }}
                            />
                            <span>運轉小時</span>
                        </div>
                    )}

                    {/* 目前狀態 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#666' }}>{getConditionStatus(condition)}</span>
                        <StatusIndicator status="normal" text="" />
                    </div>
                </div>
            ))}

            {/* 新增條件按鈕 */}
            <button
                type="button"
                className={styles.addConditionBtn}
                onClick={addCondition}
            >
                + 新增條件
            </button>

            {/* 預計觸發 */}
            {(config.conditions || []).length > 0 && (
                <div className={`${styles.statusDisplay} ${styles.warning}`} style={{ marginTop: '16px' }}>
                    <span>🔔</span>
                    <span>
                        預計觸發: 基於{config.logic === 'OR' ? '最早達成的條件' : '全部條件達成'}
                    </span>
                </div>
            )}
        </div>
    );
};

export default HybridConfig;
