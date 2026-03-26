import React from 'react';
import styles from './MaintenanceScheduleForm.module.css';

/**
 * 觸發類型選擇器元件
 * @param {string} value - 目前選中的類型
 * @param {function} onChange - 變更事件
 */
const TriggerTypeSelector = ({ value, onChange }) => {
    const options = [
        {
            id: 'time',
            icon: '📅',
            label: '週期觸發',
            subLabel: 'Time-based',
            description: '依固定時間週期'
        },
        {
            id: 'counter',
            icon: '🔢',
            label: '張數觸發',
            subLabel: 'Counter-based',
            description: '依累計印刷張數'
        },
        {
            id: 'plc',
            icon: '⚙️',
            label: 'PLC 觸發',
            subLabel: 'IoT-based',
            description: '依 PLC 訊號數值'
        },
        {
            id: 'hybrid',
            icon: '🔀',
            label: '混合觸發',
            subLabel: 'Hybrid',
            description: '多條件組合'
        }
    ];

    return (
        <div className={styles.section}>
            <h4 className={styles.sectionTitle}>觸發類型選擇器</h4>
            <div className={styles.triggerSelector}>
                {options.map(opt => (
                    <div
                        key={opt.id}
                        className={`${styles.triggerOption} ${value === opt.id ? styles.active : ''}`}
                        onClick={() => onChange(opt.id)}
                    >
                        <span className={styles.triggerIcon}>{opt.icon}</span>
                        <span className={styles.triggerLabel}>{opt.label}</span>
                        <span className={styles.triggerSubLabel}>({opt.subLabel})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TriggerTypeSelector;
