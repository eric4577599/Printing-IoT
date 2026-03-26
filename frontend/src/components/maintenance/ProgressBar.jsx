import React from 'react';
import styles from './MaintenanceScheduleForm.module.css';

/**
 * 進度條元件
 * @param {number} value - 目前值
 * @param {number} max - 最大值
 * @param {string} unit - 單位 (如: 張, 小時)
 */
const ProgressBar = ({ value = 0, max = 100, unit = '' }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const remaining = max - value;

    // 根據剩餘比例決定狀態
    const getStatus = () => {
        const remainingPercent = (remaining / max) * 100;
        if (remainingPercent <= 10) return 'danger';
        if (remainingPercent <= 20) return 'warning';
        return 'normal';
    };

    const status = getStatus();

    return (
        <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
                <div
                    className={`${styles.progressFill} ${styles[status]}`}
                    style={{ width: `${percentage}%` }}
                />
                <span className={styles.progressText}>
                    {value.toLocaleString()} / {max.toLocaleString()} {unit}
                </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem', color: '#666' }}>
                <span>剩餘: {remaining.toLocaleString()} {unit}</span>
                <span>{percentage.toFixed(1)}%</span>
            </div>
        </div>
    );
};

export default ProgressBar;
