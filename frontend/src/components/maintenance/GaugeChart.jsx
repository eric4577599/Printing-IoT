import React from 'react';

/**
 * 半圓儀表板圖表元件
 * @param {number} value - 目前值
 * @param {number} max - 最大值
 * @param {string} unit - 單位
 * @param {string} label - 標籤
 */
const GaugeChart = ({ value = 0, max = 100, unit = '', label = '' }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const angle = (percentage / 100) * 180; // 0-180 度

    // 根據百分比決定顏色
    const getColor = () => {
        if (percentage >= 90) return '#f44336'; // 紅色
        if (percentage >= 70) return '#ff9800'; // 橘色
        return '#4caf50'; // 綠色
    };

    const color = getColor();

    // SVG 路徑計算
    const size = 200;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const centerX = size / 2;
    const centerY = size / 2;

    // 計算圓弧終點
    const endAngle = (angle - 90) * (Math.PI / 180);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);

    // 大圓弧標誌
    const largeArc = angle > 180 ? 1 : 0;

    return (
        <div style={{ textAlign: 'center' }}>
            <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
                {/* 背景弧 */}
                <path
                    d={`M ${strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${centerY}`}
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />

                {/* 進度弧 */}
                {percentage > 0 && (
                    <path
                        d={`M ${strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                )}

                {/* 數值文字 */}
                <text
                    x={centerX}
                    y={centerY - 10}
                    textAnchor="middle"
                    fontSize="32"
                    fontWeight="bold"
                    fill="#333"
                >
                    {value.toLocaleString()}
                </text>
                <text
                    x={centerX}
                    y={centerY + 15}
                    textAnchor="middle"
                    fontSize="14"
                    fill="#666"
                >
                    {unit}
                </text>

                {/* 刻度標籤 */}
                <text x="10" y={centerY + 25} fontSize="12" fill="#999">0</text>
                <text x={centerX - 10} y="15" fontSize="12" fill="#999">{(max / 2).toLocaleString()}</text>
                <text x={size - 35} y={centerY + 25} fontSize="12" fill="#999">{max.toLocaleString()}</text>
            </svg>
            {label && (
                <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
                    {label}
                </div>
            )}
        </div>
    );
};

export default GaugeChart;
