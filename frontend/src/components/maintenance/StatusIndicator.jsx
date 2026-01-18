import React from 'react';

/**
 * 狀態指示器元件
 * @param {string} status - 狀態: normal, warning, danger, offline
 * @param {string} text - 顯示文字
 */
const StatusIndicator = ({ status = 'normal', text = '' }) => {
    const getConfig = () => {
        switch (status) {
            case 'normal':
                return { icon: '🟢', color: '#4caf50', bg: '#e8f5e9', label: '正常' };
            case 'warning':
                return { icon: '🟡', color: '#ff9800', bg: '#fff3e0', label: '即將到期' };
            case 'danger':
                return { icon: '🔴', color: '#f44336', bg: '#ffebee', label: '逾期' };
            case 'offline':
                return { icon: '⚫', color: '#9e9e9e', bg: '#f5f5f5', label: '離線' };
            default:
                return { icon: '🟢', color: '#4caf50', bg: '#e8f5e9', label: '正常' };
        }
    };

    const config = getConfig();

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: config.bg,
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: config.color
        }}>
            <span>{config.icon}</span>
            <span>{text || config.label}</span>
        </div>
    );
};

export default StatusIndicator;
