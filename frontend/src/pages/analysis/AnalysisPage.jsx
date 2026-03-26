import React, { useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import styles from './AnalysisPage.module.css';

import { useAnalysisData } from './hooks/useAnalysisData';
import AnalysisSidebar from './components/AnalysisSidebar';
import AnalysisSummary from './components/AnalysisSummary';
import AnalysisChart from './components/AnalysisChart';
import AnalysisTable from './components/AnalysisTable';

const AnalysisPage = () => {
    const {
        startDate, setStartDate,
        endDate, setEndDate,
        selectedCategories, setSelectedCategories,
        chartType, setChartType,
        timeScale, setTimeScale,
        selectedDisplayItems, setSelectedDisplayItems,
        viewMode, setViewMode,
        sidebarCollapsed, setSidebarCollapsed,
        productionHistory,
        groupedData,
        summaryStats,
        t
    } = useAnalysisData();

    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    // === 定義常用欄位與選項 (原本在 AnalysisPage) ===
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

    const chartOptions = [
        { id: 'pie', label: t('analysis.chartTypes.pie') },
        { id: 'doughnut', label: t('analysis.chartTypes.doughnut') },
        { id: 'line', label: t('analysis.chartTypes.line') },
        { id: 'bar', label: t('analysis.chartTypes.bar') },
        { id: 'radar', label: t('analysis.chartTypes.radar') },
    ];

    const timeScaleOptions = [
        { id: 'minute', label: t('analysis.timeScales.minute') },
        { id: 'hour', label: t('analysis.timeScales.hour') },
        { id: 'day', label: t('analysis.timeScales.day') },
        { id: 'week', label: t('analysis.timeScales.week') },
        { id: 'month', label: t('analysis.timeScales.month') },
    ];

    // === 輔助邏輯 ===
    const isDistributionChart = ['pie', 'doughnut', 'radar'].includes(chartType);

    const formatStopTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return hours > 0 ? `${hours} 小時 ${mins} 分` : `${mins} 分鐘`;
    };

    const handleQuickDate = (type) => {
        const end = new Date();
        let start = new Date();
        switch (type) {
            case 'yesterday': start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); break;
            case 'last7days': start.setDate(start.getDate() - 7); break;
            case 'last30days': start.setDate(start.getDate() - 30); break;
            case 'thisMonth': start = new Date(end.getFullYear(), end.getMonth(), 1); break;
            default: break; // today
        }
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const clearAllFilters = () => {
        setSelectedCategories([]);
        setSelectedDisplayItems(['qty']);
        setStartDate(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
    };

    const exportToExcel = () => {
        if (productionHistory.length === 0) return alert(t('ui.messages.noData'));
        const exportData = productionHistory.map(record => ({
            '日期': record.date, '訂單編號': record.orderNo, '客戶': record.customer, '產品名稱': record.productName,
            '良品數量': record.goodQty, '不良數量': record.defectQty, '停車次數': record.stopCount, 'OEE (%)': record.oee
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '生產分析');
        XLSX.writeFile(wb, `生產分析_${startDate}_${endDate}.xlsx`);
    };

    const downloadChartAsImage = () => {
        if (!chartRef.current) return alert('圖表尚未載入完成');
        const canvas = chartRef.current.canvas;
        const link = document.createElement('a');
        link.download = `生產分析_${startDate}_${endDate}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // === 圖表數據聚合邏輯 (移回 Page 層級以保持 Hook 單純) ===
    const chartData = useMemo(() => {
        const fieldMapping = { qty: 'goodQty', prepTime: 'prepTime', runTime: 'runTime', stopTime: 'stopTime', avgSpeed: 'avgSpeed', stopCount: 'stopCount', defectQty: 'defectQty', oee: 'oee' };
        const colors = [
            { border: '#36a2eb', bg: 'rgba(54, 162, 235, 0.5)' },
            { border: '#ff6384', bg: 'rgba(255, 99, 132, 0.5)' },
            { border: '#4bc0c0', bg: 'rgba(75, 192, 192, 0.5)' }
        ];

        const aggregate = (records, itemId) => {
            const field = fieldMapping[itemId] || itemId;
            const res = {};
            records.forEach(r => {
                const key = timeScale === 'day' ? r.date : r.date; // 簡化處理
                if (!res[key]) res[key] = 0;
                res[key] += (r[field] || 0);
            });
            return res;
        };

        const timeKeys = Array.from(new Set(productionHistory.map(r => r.date))).sort();
        const datasets = selectedDisplayItems.map((itemId, i) => {
            const agg = aggregate(productionHistory, itemId);
            return {
                label: availableDisplayFields.find(f => f.id === itemId)?.label || itemId,
                data: timeKeys.map(k => agg[k] || 0),
                borderColor: colors[i % colors.length].border,
                backgroundColor: colors[i % colors.length].bg,
                fill: chartType === 'line',
                tension: 0.4
            };
        });

        return { labels: timeKeys.map(k => k.split('-').slice(1).join('/')), datasets };
    }, [productionHistory, selectedDisplayItems, timeScale, chartType, availableDisplayFields]);

    const needsDualAxis = useMemo(() => {
        const units = selectedDisplayItems.map(id => availableDisplayFields.find(f => f.id === id)?.unit);
        return new Set(units).size > 1;
    }, [selectedDisplayItems]);

    const chartOptionsConfig = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' }, title: { display: true, text: `${t('analysis.title')} (${startDate} ~ ${endDate})` } },
        scales: needsDualAxis && !isDistributionChart ? {
            y: { type: 'linear', position: 'left' },
            y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }
        } : {}
    };

    const scrollToStart = () => chartContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    const scrollToEnd = () => chartContainerRef.current?.scrollTo({ left: chartContainerRef.current.scrollWidth, behavior: 'smooth' });

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>{t('analysis.title')}</h2>
            <div className={styles.mainLayout}>
                <AnalysisSidebar 
                    {...{startDate, setStartDate, endDate, setEndDate, selectedCategories, setSelectedCategories, chartType, setChartType, timeScale, setTimeScale, selectedDisplayItems, setSelectedDisplayItems, sidebarCollapsed, setSidebarCollapsed, handleQuickDate, availableCategoryFields, availableDisplayFields, chartOptions, timeScaleOptions, isDistributionChart, exportToExcel, downloadChartAsImage, clearAllFilters, t}} 
                />
                <div className={styles.chartArea}>
                    <div className={styles.viewModeToggle}>
                        <button className={`${styles.viewModeBtn} ${viewMode === 'chart' ? styles.active : ''}`} onClick={() => setViewMode('chart')}>📊 圖表視圖</button>
                        <button className={`${styles.viewModeBtn} ${viewMode === 'table' ? styles.active : ''}`} onClick={() => setViewMode('table')}>📋 表格視圖</button>
                    </div>
                    <AnalysisSummary summaryStats={summaryStats} historyCount={productionHistory.length} formatStopTime={formatStopTime} t={t} />
                    <div className={styles.chartNavigation}>
                        <button className={styles.navBtn} onClick={scrollToStart}>◀ 開始</button>
                        <button className={styles.navBtn} onClick={scrollToEnd}>結束 ▶</button>
                    </div>
                    <div ref={chartContainerRef} className={styles.chartContainer}>
                        {viewMode === 'table' ? (
                            <AnalysisTable productionHistory={productionHistory} clearAllFilters={clearAllFilters} t={t} />
                        ) : (
                            <AnalysisChart 
                                ref={chartRef}
                                chartType={chartType}
                                chartData={chartData}
                                options={chartOptionsConfig}
                                chartWrapperStyle={{
                                    chartWrapper: styles.chartWrapper,
                                    style: {
                                        minWidth: chartData.labels.length > 10 ? `${chartData.labels.length * 60}px` : '100%',
                                        height: '100%'
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;
