import React, { useState, useMemo, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { useLanguage } from '../modules/language/LanguageContext';
import styles from './AnalysisPage.module.css';

// 註冊 Chart.js 組件
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

/**
 * 生產分析頁面
 * 提供多維度的生產數據分析與可視化功能
 */
const AnalysisPage = () => {
    const { t } = useLanguage();
    // === 圖表容器引用 ===
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null); // 圖表實例引用

    // === 時間軸滾動函數 ===
    const scrollToStart = () => {
        if (chartContainerRef.current) {
            chartContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
    };
    const scrollToEnd = () => {
        if (chartContainerRef.current) {
            chartContainerRef.current.scrollTo({
                left: chartContainerRef.current.scrollWidth,
                behavior: 'smooth'
            });
        }
    };

    // === 時間區間 ===
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // === 分類條件（可從生產明細欄位選擇）===
    const [selectedCategories, setSelectedCategories] = useState([]);

    // 生產明細可用欄位（根據 orders 資料結構動態生成）
    const availableCategoryFields = [
        { id: 'customer', label: t('analysis.fields.customer'), field: 'customer' },
        { id: 'productName', label: t('analysis.fields.product'), field: 'productName' },
        { id: 'boxNo', label: t('analysis.fields.boxNo'), field: 'boxNo' },
        { id: 'boxType', label: t('analysis.fields.boxType'), field: 'boxType' },
        { id: 'orderNo', label: t('analysis.fields.orderNo'), field: 'orderNo' },
        { id: 'qty', label: t('analysis.fields.qty'), field: 'qty' },
        { id: 'operator', label: t('analysis.fields.operator'), field: 'operator' },
        { id: 'shift', label: t('analysis.fields.shift'), field: 'shift' },
        { id: 'stopReason', label: t('analysis.fields.stopReason'), field: 'stopReason' },
        { id: 'prepTime', label: t('analysis.fields.prepTime'), field: 'prepTime' },
        { id: 'flute', label: t('settings.unit.flute'), field: 'flute' },
        { id: 'date', label: t('analysis.fields.date'), field: 'date' },
    ];

    // === 圖形類型（單選）===
    const [chartType, setChartType] = useState('bar');
    const chartOptions = [
        { id: 'pie', label: t('analysis.chartTypes.pie') },
        { id: 'doughnut', label: t('analysis.chartTypes.doughnut') },
        { id: 'line', label: t('analysis.chartTypes.line') },
        { id: 'bar', label: t('analysis.chartTypes.bar') },
        { id: 'radar', label: t('analysis.chartTypes.radar') },
    ];

    // === 側邊欄收摺狀態 ===
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // === 視圖模式（圖表/表格）===
    const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'

    // === 時間刻度（單選）===
    const [timeScale, setTimeScale] = useState('day');
    const timeScaleOptions = [
        { id: 'minute', label: t('analysis.timeScales.minute') },
        { id: 'hour', label: t('analysis.timeScales.hour') },
        { id: 'day', label: t('analysis.timeScales.day') },
        { id: 'week', label: t('analysis.timeScales.week') },
        { id: 'month', label: t('analysis.timeScales.month') },
    ];

    // === 顯示項目（從生產明細選擇，最多三種）===
    const [selectedDisplayItems, setSelectedDisplayItems] = useState(['qty']);
    const MAX_DISPLAY_ITEMS = 3;

    // 顯示項目可用欄位（數值型或可統計欄位）
    const availableDisplayFields = [
        { id: 'qty', label: t('analysis.fields.qty'), unit: 'pcs' },
        { id: 'prepTime', label: t('analysis.fields.prepTime'), unit: 'min' },
        { id: 'runTime', label: t('analysis.fields.runTime'), unit: 'min' },
        { id: 'stopTime', label: t('analysis.fields.stopTime'), unit: 'min' },
        { id: 'avgSpeed', label: t('analysis.fields.avgSpeed'), unit: 'pcs/min' },
        { id: 'stopCount', label: t('analysis.fields.stopCount'), unit: 'times' },
        { id: 'defectQty', label: t('analysis.fields.defectQty'), unit: 'pcs' },
        { id: 'oee', label: t('analysis.fields.oee'), unit: '%' },
    ];

    // === 新增顯示項目 ===
    const handleAddDisplayItem = () => {
        if (selectedDisplayItems.length >= MAX_DISPLAY_ITEMS) return;

        const unusedField = availableDisplayFields.find(
            f => !selectedDisplayItems.includes(f.id)
        );
        if (unusedField) {
            setSelectedDisplayItems(prev => [...prev, unusedField.id]);
        }
    };

    // === 移除顯示項目 ===
    const handleRemoveDisplayItem = (itemId) => {
        setSelectedDisplayItems(prev => prev.filter(id => id !== itemId));
    };

    // === 更新顯示項目 ===
    const handleDisplayItemChange = (index, newItemId) => {
        setSelectedDisplayItems(prev => {
            const updated = [...prev];
            updated[index] = newItemId;
            return updated;
        });
    };

    // === 新增分類條件 ===
    const handleAddCategory = () => {
        // 找到尚未選擇的第一個欄位
        const unusedField = availableCategoryFields.find(
            f => !selectedCategories.includes(f.id)
        );
        if (unusedField) {
            setSelectedCategories(prev => [...prev, unusedField.id]);
        }
    };

    // === 移除分類條件 ===
    const handleRemoveCategory = (categoryId) => {
        setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    };

    // === 更新分類條件 ===
    const handleCategoryChange = (index, newCategoryId) => {
        setSelectedCategories(prev => {
            const updated = [...prev];
            updated[index] = newCategoryId;
            return updated;
        });
    };

    // === 從 localStorage 讀取生產歷史資料 ===
    const productionHistory = useMemo(() => {
        try {
            const history = JSON.parse(localStorage.getItem('productionHistory') || '[]');
            // 根據時間區間篩選
            return history.filter(record => {
                const recordDate = record.date;
                return recordDate >= startDate && recordDate <= endDate;
            });
        } catch (e) {
            console.error('Failed to load production history:', e);
            return [];
        }
    }, [startDate, endDate]);

    // === 根據分類條件分組數據 ===
    const groupedData = useMemo(() => {
        if (selectedCategories.length === 0 || productionHistory.length === 0) {
            return { '全部': productionHistory };
        }

        const groups = {};
        productionHistory.forEach(record => {
            const key = selectedCategories.map(cat => record[cat] || '-').join(' / ');
            if (!groups[key]) groups[key] = [];
            groups[key].push(record);
        });
        return groups;
    }, [productionHistory, selectedCategories]);

    // === 快速時間選取 ===
    const handleQuickDate = (type) => {
        const end = new Date();
        let start = new Date();

        switch (type) {
            case 'today':
                // 今日
                break;
            case 'yesterday':
                // 昨日
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
                break;
            case 'last7days':
                // 最近7天
                start.setDate(start.getDate() - 7);
                break;
            case 'last30days':
                // 最近30天
                start.setDate(start.getDate() - 30);
                break;
            case 'thisMonth':
                // 本月
                start = new Date(end.getFullYear(), end.getMonth(), 1);
                break;
            default:
                return;
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    // === 清除所有篩選 ===
    const clearAllFilters = () => {
        setSelectedCategories([]);
        setSelectedDisplayItems(['qty']);
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(weekAgo.toISOString().split('T')[0]);
        setEndDate(today);
    };

    // === 計算摘要統計 ===
    const summaryStats = useMemo(() => {
        if (productionHistory.length === 0) {
            return { totalQty: 0, avgDailyQty: 0, totalStopTime: 0, avgSpeed: 0 };
        }

        const totalQty = productionHistory.reduce((sum, r) => sum + (r.goodQty || 0), 0);
        const totalStopTime = productionHistory.reduce((sum, r) => sum + (r.stopTime || 0), 0);
        const totalRunTime = productionHistory.reduce((sum, r) => sum + (r.runTime || 0), 0);
        const avgSpeed = totalRunTime > 0 ? Math.round(totalQty / totalRunTime) : 0;

        // 計算日期範圍內的天數
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        const avgDailyQty = Math.round(totalQty / days);

        return { totalQty, avgDailyQty, totalStopTime, avgSpeed };
    }, [productionHistory, startDate, endDate]);

    // === 格式化停車時間 ===
    const formatStopTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) {
            return `${hours} 小時 ${mins} 分`;
        }
        return `${mins} 分鐘`;
    };

    // === 生成圖表數據（使用真實數據）===
    const chartData = useMemo(() => {
        // 取得顯示項目的標籤名稱
        const getDisplayItemLabel = (itemId) => {
            const field = availableDisplayFields.find(f => f.id === itemId);
            return field ? field.label : itemId;
        };

        // 欄位映射：將 displayItem ID 映射到 productionHistory 欄位
        const fieldMapping = {
            qty: 'goodQty',
            prepTime: 'prepTime',
            runTime: 'runTime',
            stopTime: 'stopTime',
            avgSpeed: 'avgSpeed',
            stopCount: 'stopCount',
            defectQty: 'defectQty',
            oee: 'oee'
        };

        // 顏色配置（擴展到支援更多分組）
        const colors = [
            { border: 'rgba(54, 162, 235, 1)', bg: 'rgba(54, 162, 235, 0.5)' },
            { border: 'rgba(255, 99, 132, 1)', bg: 'rgba(255, 99, 132, 0.5)' },
            { border: 'rgba(75, 192, 192, 1)', bg: 'rgba(75, 192, 192, 0.5)' },
            { border: 'rgba(255, 206, 86, 1)', bg: 'rgba(255, 206, 86, 0.5)' },
            { border: 'rgba(153, 102, 255, 1)', bg: 'rgba(153, 102, 255, 0.5)' },
            { border: 'rgba(255, 159, 64, 1)', bg: 'rgba(255, 159, 64, 0.5)' },
            { border: 'rgba(199, 199, 199, 1)', bg: 'rgba(199, 199, 199, 0.5)' },
            { border: 'rgba(83, 102, 255, 1)', bg: 'rgba(83, 102, 255, 0.5)' },
        ];

        // 如果沒有真實數據，生成時間標籤和空數據提示
        if (productionHistory.length === 0) {
            const labels = ['無數據'];
            const datasets = selectedDisplayItems.map((itemId, index) => ({
                label: getDisplayItemLabel(itemId),
                data: [0],
                borderColor: colors[index % colors.length].border,
                backgroundColor: colors[index % colors.length].bg,
                fill: chartType === 'line',
                tension: 0.4,
                borderWidth: 2,
            }));
            return { labels, datasets };
        }

        // 根據時間刻度聚合數據
        const aggregateByTimeScale = (records, itemId) => {
            const fieldName = fieldMapping[itemId] || itemId;
            const aggregated = {};

            records.forEach(record => {
                let key;
                const date = new Date(record.date);

                switch (timeScale) {
                    case 'minute':
                    case 'hour':
                        // 對於小時/分鐘刻度，使用完整日期時間
                        const hour = record.finishedAt ? new Date(record.finishedAt).getHours() : 12;
                        key = `${date.getMonth() + 1}/${date.getDate()} ${hour}:00`;
                        break;
                    case 'week':
                        // 計算週數
                        const startOfYear = new Date(date.getFullYear(), 0, 1);
                        const weekNum = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
                        key = `${date.getFullYear()} W${weekNum}`;
                        break;
                    case 'month':
                        key = `${date.getFullYear()}/${date.getMonth() + 1}`;
                        break;
                    case 'day':
                    default:
                        key = record.date;
                        break;
                }

                if (!aggregated[key]) {
                    aggregated[key] = { sum: 0, count: 0 };
                }
                aggregated[key].sum += (record[fieldName] || 0);
                aggregated[key].count += 1;
            });

            return aggregated;
        };

        // 格式化標籤顯示
        const formatLabel = (key) => {
            if (timeScale === 'day') {
                const date = new Date(key);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            }
            return key;
        };

        // 獲取所有唯一的時間標籤（排序後）
        const getAllTimeKeys = () => {
            const allKeys = new Set();
            Object.values(groupedData).forEach(records => {
                const agg = aggregateByTimeScale(records, selectedDisplayItems[0] || 'qty');
                Object.keys(agg).forEach(key => allKeys.add(key));
            });
            return Array.from(allKeys).sort();
        };

        const timeKeys = getAllTimeKeys();
        const labels = timeKeys.map(formatLabel);

        // 根據分類條件生成數據集
        const groupNames = Object.keys(groupedData);
        let datasets = [];
        let colorIndex = 0;

        if (selectedCategories.length === 0) {
            // 無分類條件：每個顯示項目一個數據集
            datasets = selectedDisplayItems.map((itemId, index) => {
                const aggregated = aggregateByTimeScale(productionHistory, itemId);
                const data = timeKeys.map(key => aggregated[key]?.sum || 0);

                return {
                    label: getDisplayItemLabel(itemId),
                    data,
                    borderColor: colors[index % colors.length].border,
                    backgroundColor: colors[index % colors.length].bg,
                    fill: chartType === 'line',
                    tension: 0.4,
                    borderWidth: 2,
                };
            });
        } else {
            // 有分類條件：每個分組 × 每個顯示項目
            groupNames.forEach((groupName) => {
                const records = groupedData[groupName];

                selectedDisplayItems.forEach((itemId) => {
                    const aggregated = aggregateByTimeScale(records, itemId);
                    const data = timeKeys.map(key => aggregated[key]?.sum || 0);

                    const label = selectedDisplayItems.length > 1
                        ? `${groupName} - ${getDisplayItemLabel(itemId)}`
                        : groupName;

                    datasets.push({
                        label,
                        data,
                        borderColor: colors[colorIndex % colors.length].border,
                        backgroundColor: colors[colorIndex % colors.length].bg,
                        fill: chartType === 'line',
                        tension: 0.4,
                        borderWidth: 2,
                    });
                    colorIndex++;
                });
            });
        }

        return { labels, datasets };
    }, [productionHistory, groupedData, selectedCategories, selectedDisplayItems, timeScale, chartType, availableDisplayFields]);

    // === 匯出 Excel 功能 ===
    const exportToExcel = () => {
        if (productionHistory.length === 0) {
            alert(t('ui.messages.noData'));
            return;
        }

        // 準備匯出數據
        const exportData = productionHistory.map(record => ({
            '日期': record.date,
            '訂單編號': record.orderNo,
            '客戶': record.customer,
            '產品名稱': record.productName,
            '盒型': record.boxType,
            '操作員': record.operator,
            '班別': record.shift,
            '目標數量': record.targetQty,
            '良品數量': record.goodQty,
            '不良數量': record.defectQty,
            '準備時間(分)': record.prepTime,
            '運轉時間(分)': record.runTime,
            '停車時間(分)': record.stopTime,
            '停車次數': record.stopCount,
            '平均車速': record.avgSpeed,
            'OEE (%)': record.oee
        }));

        try {
            const ws = XLSX.utils.json_to_sheet(exportData);

            // 設定欄寬
            ws['!cols'] = [
                { wch: 12 }, // 日期
                { wch: 15 }, // 訂單編號
                { wch: 15 }, // 客戶
                { wch: 20 }, // 產品名稱
                { wch: 10 }, // 盒型
                { wch: 12 }, // 操作員
                { wch: 8 },  // 班別
                { wch: 10 }, // 目標數量
                { wch: 10 }, // 良品數量
                { wch: 10 }, // 不良數量
                { wch: 12 }, // 準備時間
                { wch: 12 }, // 運轉時間
                { wch: 12 }, // 停車時間
                { wch: 10 }, // 停車次數
                { wch: 10 }, // 平均車速
                { wch: 10 }, // OEE
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '生產分析');
            XLSX.writeFile(wb, `生產分析_${startDate}_${endDate}.xlsx`);
        } catch (err) {
            console.error('Excel export failed:', err);
            alert('匯出失敗，請稍後再試。');
        }
    };

    // === 檢測是否需要雙 Y 軸 ===
    const needsDualAxis = useMemo(() => {
        if (selectedDisplayItems.length <= 1) return false;
        const units = selectedDisplayItems.map(id => {
            const field = availableDisplayFields.find(f => f.id === id);
            return field?.unit;
        });
        return new Set(units).size > 1;
    }, [selectedDisplayItems, availableDisplayFields]);

    // === 下載圖表為圖片 ===
    const downloadChartAsImage = () => {
        if (!chartRef.current) {
            alert('圖表尚未載入完成');
            return;
        }

        try {
            const canvas = chartRef.current.canvas;
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `生產分析_${startDate}_${endDate}.png`;
            link.href = url;
            link.click();
        } catch (err) {
            console.error('下載圖片失敗:', err);
            alert('下載失敗，請稍後再試。');
        }
    };

    // === 圖表選項 ===
    const chartOptionsConfig = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                onClick: (e, legendItem, legend) => {
                    const index = legendItem.datasetIndex;
                    const ci = legend.chart;
                    const meta = ci.getDatasetMeta(index);
                    meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                    ci.update();
                },
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: { size: 12 }
                }
            },
            title: {
                display: true,
                text: `${t('analysis.title')} (${startDate} ~ ${endDate})`,
                font: { size: 16, weight: 'bold' },
                padding: { top: 10, bottom: 20 }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderWidth: 1
            }
        },
        scales: needsDualAxis && chartType !== 'pie' && chartType !== 'doughnut' && chartType !== 'radar' ? {
            y: {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: t('analysis.yAxis.left'),
                    font: { size: 12, weight: 'bold' }
                },
                grid: { color: 'rgba(0, 0, 0, 0.1)' }
            },
            y1: {
                type: 'linear',
                position: 'right',
                title: {
                    display: true,
                    text: t('analysis.yAxis.right'),
                    font: { size: 12, weight: 'bold' }
                },
                grid: { drawOnChartArea: false },
                ticks: { callback: (value) => value + '%' }
            }
        } : undefined,
    };

    // === 處理分類條件切換 ===
    const handleCategoryToggle = (categoryId) => {
        setSelectedCategories(prev => {
            if (prev.includes(categoryId)) {
                return prev.filter(id => id !== categoryId);
            }
            return [...prev, categoryId];
        });
    };

    // === 判斷是否為分布型圖表（不需要時間刻度）===
    const isDistributionChart = ['pie', 'doughnut', 'radar'].includes(chartType);

    // === 渲染表格 ===
    const renderTable = () => {
        if (productionHistory.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    <h3>{t('ui.messages.noData')}</h3>
                    <p>請嘗試以下操作：</p>
                    <ul className={styles.emptyHints}>
                        <li>📅 擴大日期範圍</li>
                        <li>🔄 清除分類條件</li>
                        <li>🏭 前往 Dashboard 完成一些訂單</li>
                    </ul>
                    <button onClick={clearAllFilters} className={styles.clearBtn}>
                        🗑️ {t('analysis.actions.clearFilters')}
                    </button>
                </div>
            );
        }

        return (
            <div className={styles.tableView}>
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th>{t('analysis.fields.date')}</th>
                            <th>{t('analysis.fields.orderNo')}</th>
                            <th>{t('analysis.fields.customer')}</th>
                            <th>{t('analysis.fields.product')}</th>
                            <th>{t('analysis.fields.shift')}</th>
                            <th>{t('analysis.fields.operator')}</th>
                            <th>{t('analysis.fields.goodQty')}</th>
                            <th>{t('analysis.fields.defectQty')}</th>
                            <th>{t('analysis.fields.prepTime')}</th>
                            <th>{t('analysis.fields.runTime')}</th>
                            <th>{t('analysis.fields.stopTime')}</th>
                            <th>{t('analysis.fields.avgSpeed')}</th>
                            <th>{t('analysis.fields.oee')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productionHistory.map((record, index) => (
                            <tr key={record.id || index}>
                                <td>{record.date}</td>
                                <td>{record.orderNo}</td>
                                <td>{record.customer}</td>
                                <td>{record.productName}</td>
                                <td>{record.shift}</td>
                                <td>{record.operator}</td>
                                <td className={styles.numCell}>{record.goodQty?.toLocaleString()}</td>
                                <td className={styles.numCell}>{record.defectQty?.toLocaleString()}</td>
                                <td className={styles.numCell}>{record.prepTime?.toFixed(1)} 分</td>
                                <td className={styles.numCell}>{record.runTime?.toFixed(1)} 分</td>
                                <td className={styles.numCell}>{record.stopTime?.toFixed(1)} 分</td>
                                <td className={styles.numCell}>{record.avgSpeed}</td>
                                <td className={styles.numCell}>{record.oee?.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // === 渲染圖表 ===
    const renderChart = () => {
        const chartProps = {
            ref: chartRef,
            data: chartData,
            options: chartOptionsConfig
        };

        switch (chartType) {
            case 'pie':
                return <Pie {...chartProps} />;
            case 'doughnut':
                return <Doughnut {...chartProps} />;
            case 'line':
                return <Line {...chartProps} />;
            case 'radar':
                return <Radar {...chartProps} />;
            case 'bar':
            default:
                return <Bar {...chartProps} />;
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>{t('analysis.title')}</h2>

            <div className={styles.mainLayout}>
                {/* 左側：控制面板 */}
                <div className={`${styles.controlPanel} ${sidebarCollapsed ? styles.collapsed : ''}`}>
                    {/* 收摺按鈕 */}
                    <button
                        className={styles.collapseBtn}
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? '展開側邊欄' : '收摺側邊欄'}
                    >
                        {sidebarCollapsed ? '▶' : '◀'}
                    </button>
                    {/* 時間區間 */}
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>📅 {t('analysis.dateRange')}</h4>
                        <div className={styles.dateRange}>
                            <label>
                                開始:
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className={styles.dateInput}
                                />
                            </label>
                            <label>
                                結束:
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className={styles.dateInput}
                                />
                            </label>
                        </div>
                        {/* 快速時間選取 */}
                        <div className={styles.quickDateButtons}>
                            <button onClick={() => handleQuickDate('today')} className={styles.quickBtn}>{t('analysis.quickDate.today')}</button>
                            <button onClick={() => handleQuickDate('yesterday')} className={styles.quickBtn}>{t('analysis.quickDate.yesterday')}</button>
                            <button onClick={() => handleQuickDate('last7days')} className={styles.quickBtn}>{t('analysis.quickDate.last7Days')}</button>
                            <button onClick={() => handleQuickDate('thisMonth')} className={styles.quickBtn}>{t('analysis.quickDate.thisMonth')}</button>
                        </div>
                    </div>

                    {/* 分類條件 - 下拉式選擇 */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h4 className={styles.sectionTitle}>📊 {t('analysis.category.title')}</h4>
                            <button
                                className={styles.addBtn}
                                onClick={handleAddCategory}
                                disabled={selectedCategories.length >= availableCategoryFields.length}
                            >
                                + {t('ui.buttons.add')}
                            </button>
                        </div>
                        <div className={styles.categoryList}>
                            {selectedCategories.length === 0 ? (
                                <div className={styles.emptyHint}>
                                    請點擊「新增」按鈕選擇分類條件
                                </div>
                            ) : (
                                selectedCategories.map((categoryId, index) => (
                                    <div key={index} className={styles.categoryRow}>
                                        <select
                                            value={categoryId}
                                            onChange={(e) => handleCategoryChange(index, e.target.value)}
                                            className={styles.categorySelect}
                                        >
                                            {availableCategoryFields.map(field => (
                                                <option
                                                    key={field.id}
                                                    value={field.id}
                                                    disabled={selectedCategories.includes(field.id) && field.id !== categoryId}
                                                >
                                                    {field.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => handleRemoveCategory(categoryId)}
                                            title="移除此條件"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 顯示項目 - 下拉式選擇（最多三種）*/}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h4 className={styles.sectionTitle}>📋 {t('analysis.display.title')}</h4>
                            <button
                                className={styles.addBtn}
                                onClick={handleAddDisplayItem}
                                disabled={selectedDisplayItems.length >= MAX_DISPLAY_ITEMS}
                            >
                                + 新增
                            </button>
                        </div>
                        <div className={styles.categoryList}>
                            {selectedDisplayItems.length === 0 ? (
                                <div className={styles.emptyHint}>
                                    請點擊「新增」按鈕選擇顯示項目
                                </div>
                            ) : (
                                selectedDisplayItems.map((itemId, index) => (
                                    <div key={index} className={styles.categoryRow}>
                                        <select
                                            value={itemId}
                                            onChange={(e) => handleDisplayItemChange(index, e.target.value)}
                                            className={styles.categorySelect}
                                        >
                                            {availableDisplayFields.map(field => (
                                                <option
                                                    key={field.id}
                                                    value={field.id}
                                                    disabled={selectedDisplayItems.includes(field.id) && field.id !== itemId}
                                                >
                                                    {field.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => handleRemoveDisplayItem(itemId)}
                                            title="移除此項目"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 圖形類型 */}
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>📈 圖形類型</h4>
                        <div className={styles.radioGroup}>
                            {chartOptions.map(opt => (
                                <label key={opt.id} className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="chartType"
                                        value={opt.id}
                                        checked={chartType === opt.id}
                                        onChange={() => setChartType(opt.id)}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 時間刻度 */}
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>⏱ 時間刻度</h4>
                        {isDistributionChart && (
                            <div className={styles.infoHint}>
                                ℹ️ 當前圖表類型不適用時間刻度
                            </div>
                        )}
                        <div className={styles.radioGroup}>
                            {timeScaleOptions.map(opt => (
                                <label key={opt.id} className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="timeScale"
                                        value={opt.id}
                                        checked={timeScale === opt.id}
                                        onChange={() => setTimeScale(opt.id)}
                                        disabled={isDistributionChart}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 匯出按鈕 */}
                    <div className={styles.section}>
                        <button className={styles.exportBtn} onClick={exportToExcel}>
                            💾 匯出 Excel
                        </button>
                        <button className={styles.exportBtn} onClick={downloadChartAsImage} style={{ background: '#4caf50', marginBottom: '8px' }}>
                            📷 下載圖表
                        </button>
                        <button className={styles.printBtn} onClick={() => window.print()}>
                            🖨️ 列印
                        </button>
                    </div>
                </div>

                {/* 右側：圖表區域 */}
                <div className={styles.chartArea}>
                    {/* 視圖模式切換 */}
                    <div className={styles.viewModeToggle}>
                        <button
                            className={`${styles.viewModeBtn} ${viewMode === 'chart' ? styles.active : ''}`}
                            onClick={() => setViewMode('chart')}
                        >
                            📊 圖表視圖
                        </button>
                        <button
                            className={`${styles.viewModeBtn} ${viewMode === 'table' ? styles.active : ''}`}
                            onClick={() => setViewMode('table')}
                        >
                            📋 表格視圖
                        </button>
                    </div>

                    {/* 摘要資訊（移至頂部）*/}
                    <div className={styles.summaryBar}>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryIcon}>📦</span>
                            <div>
                                <span className={styles.summaryLabel}>總生產量</span>
                                <span className={styles.summaryValue}>{summaryStats.totalQty.toLocaleString()} 張</span>
                            </div>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryIcon}>📊</span>
                            <div>
                                <span className={styles.summaryLabel}>平均日產量</span>
                                <span className={styles.summaryValue}>{summaryStats.avgDailyQty.toLocaleString()} 張</span>
                            </div>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryIcon}>⏸️</span>
                            <div>
                                <span className={styles.summaryLabel}>總停車時間</span>
                                <span className={styles.summaryValue}>{formatStopTime(summaryStats.totalStopTime)}</span>
                            </div>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryIcon}>⚡</span>
                            <div>
                                <span className={styles.summaryLabel}>平均車速</span>
                                <span className={styles.summaryValue}>{summaryStats.avgSpeed} 張/分</span>
                            </div>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryIcon}>📋</span>
                            <div>
                                <span className={styles.summaryLabel}>記錄筆數</span>
                                <span className={styles.summaryValue}>{productionHistory.length} 筆</span>
                            </div>
                        </div>
                    </div>

                    {/* 圖表導航按鈕 */}
                    <div className={styles.chartNavigation}>
                        <button
                            className={styles.navBtn}
                            onClick={scrollToStart}
                            title="滾動到開始時間"
                        >
                            ◀ 開始
                        </button>
                        <button
                            className={styles.navBtn}
                            onClick={scrollToEnd}
                            title="滾動到結束時間"
                        >
                            結束 ▶
                        </button>
                    </div>

                    <div ref={chartContainerRef} className={styles.chartContainer}>
                        {/* 根據視圖模式渲染圖表或表格 */}
                        {viewMode === 'table' ? (
                            renderTable()
                        ) : productionHistory.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>📊</div>
                                <h3>目前無生產數據</h3>
                                <p>請嘗試以下操作：</p>
                                <ul className={styles.emptyHints}>
                                    <li>📅 擴大日期範圍</li>
                                    <li>🔄 清除分類條件</li>
                                    <li>🏭 前往 Dashboard 完成一些訂單</li>
                                </ul>
                                <button onClick={clearAllFilters} className={styles.clearBtn}>
                                    🗑️ 清除所有篩選
                                </button>
                            </div>
                        ) : (
                            <div
                                className={styles.chartWrapper}
                                style={{
                                    minWidth: chartData.labels.length > 10
                                        ? `${Math.max(100, chartData.labels.length * 60)}px`
                                        : '100%',
                                    height: '100%'
                                }}
                            >
                                {renderChart()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;

