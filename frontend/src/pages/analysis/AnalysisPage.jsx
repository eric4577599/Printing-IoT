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
        t,
        isLoading,
        error,
        isDegraded,
        truncated,
        localOnlyCount,
        reload
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
        // S4 / F4.2:載入中要提示尚在載入,而不是匯出一份空檔讓使用者誤以為沒資料
        if (isLoading) return alert(t('analysis.state.exportWhileLoading'));
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
        if (isLoading) return alert(t('analysis.state.exportWhileLoading'));
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
        const palette = [
            { border: '#36a2eb', bg: 'rgba(54,162,235,.5)' },
            { border: '#ff6384', bg: 'rgba(255,99,132,.5)' },
            { border: '#4bc0c0', bg: 'rgba(75,192,192,.5)' },
            { border: '#ff9f40', bg: 'rgba(255,159,64,.5)' },
            { border: '#9966ff', bg: 'rgba(153,102,255,.5)' },
            { border: '#ffcd56', bg: 'rgba(255,205,86,.5)' },
            { border: '#2ecc71', bg: 'rgba(46,204,113,.5)' },
            { border: '#e74c3c', bg: 'rgba(231,76,60,.5)' },
        ];
        const labelOf = (itemId) => availableDisplayFields.find(f => f.id === itemId)?.label || itemId;

        // 依時間刻度把單筆紀錄歸入時間桶(修正 #2:原三元兩邊皆 r.date,minute/hour/week/month 全為 no-op)
        // minute/hour 需時間戳,取 finishedAt;day/week/month 以日期字串為準。
        const pad = (n) => String(n).padStart(2, '0');
        const bucketOf = (r) => {
            const dateStr = r.date || (r.finishedAt ? r.finishedAt.split('T')[0] : '-');
            const ts = r.finishedAt ? new Date(r.finishedAt) : (r.date ? new Date(`${r.date}T00:00:00`) : null);
            switch (timeScale) {
                case 'minute': return ts ? `${dateStr} ${pad(ts.getHours())}:${pad(ts.getMinutes())}` : dateStr;
                case 'hour': return ts ? `${dateStr} ${pad(ts.getHours())}:00` : dateStr;
                case 'week': {
                    if (!ts) return dateStr;
                    const dow = (ts.getDay() + 6) % 7; // 週一為週首
                    const monday = new Date(ts); monday.setDate(ts.getDate() - dow);
                    return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())} (週)`;
                }
                case 'month': return dateStr.slice(0, 7);
                case 'day':
                default: return dateStr;
            }
        };

        // 修正 #3:改用 groupedData(分類分組結果);未選分類時為 { '全部': productionHistory }
        const groupKeys = Object.keys(groupedData);
        const isGrouped = !(groupKeys.length === 1 && groupKeys[0] === '全部');

        // 分佈圖(圓餅/環圈/雷達):有選分類→每組一切片;未選→依時間桶切片。值=第一個顯示欄位總和
        if (isDistributionChart) {
            const itemId = selectedDisplayItems[0] || 'qty';
            const field = fieldMapping[itemId] || itemId;
            let labels, values;
            if (isGrouped) {
                labels = groupKeys;
                values = groupKeys.map(k => groupedData[k].reduce((s, r) => s + (r[field] || 0), 0));
            } else {
                const agg = {};
                productionHistory.forEach(r => { const b = bucketOf(r); agg[b] = (agg[b] || 0) + (r[field] || 0); });
                labels = Object.keys(agg).sort();
                values = labels.map(k => agg[k]);
            }
            return {
                labels,
                datasets: [{
                    label: labelOf(itemId),
                    data: values,
                    borderColor: labels.map((_, i) => palette[i % palette.length].border),
                    backgroundColor: labels.map((_, i) => palette[i % palette.length].bg),
                }]
            };
        }

        // 時間序列(折線/長條):X 軸為時間桶;每個(分組 × 顯示欄位)為一條資料集
        const timeKeys = Array.from(new Set(productionHistory.map(bucketOf))).sort();
        const datasets = [];
        let ci = 0;
        groupKeys.forEach(gk => {
            selectedDisplayItems.forEach(itemId => {
                const field = fieldMapping[itemId] || itemId;
                const agg = {};
                groupedData[gk].forEach(r => { const b = bucketOf(r); agg[b] = (agg[b] || 0) + (r[field] || 0); });
                const c = palette[ci % palette.length];
                datasets.push({
                    label: isGrouped ? `${gk} · ${labelOf(itemId)}` : labelOf(itemId),
                    data: timeKeys.map(k => agg[k] || 0),
                    borderColor: c.border,
                    backgroundColor: c.bg,
                    fill: chartType === 'line',
                    tension: 0.4,
                });
                ci++;
            });
        });

        return { labels: timeKeys, datasets };
    }, [productionHistory, groupedData, selectedDisplayItems, timeScale, chartType, isDistributionChart, availableDisplayFields]);

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

    /**
     * 渲染資料狀態與警示列(S4 / spec §5)
     * @returns {JSX.Element} 主狀態(載入中 / 錯誤 / 無資料)+ 可疊加的警示列
     * @description 三種主狀態措辭必須可區分;API 成功但回空只是「無資料」,不是錯誤(E-17)。
     */
    const renderDataState = () => {
        const hasRecords = productionHistory.length > 0;
        return (
            <div className={styles.stateArea}>
                {isLoading && (
                    <div className={styles.stateLoading} data-testid="analysis-state-loading">{t('analysis.state.loading')}</div>
                )}
                {!isLoading && isDegraded && !hasRecords && (
                    <div className={styles.stateError} data-testid="analysis-state-error">
                        {t('analysis.state.error')}
                        <button className={styles.stateBtn} onClick={reload}>{t('analysis.state.retry')}</button>
                    </div>
                )}
                {!isLoading && !error && !hasRecords && (
                    <div className={styles.stateEmpty} data-testid="analysis-state-empty">{t('analysis.state.empty')}</div>
                )}
                {!isLoading && isDegraded && hasRecords && (
                    <div className={styles.stateWarn} data-testid="analysis-alert-degraded">
                        {t('analysis.state.degraded')}
                        <button className={styles.stateBtn} onClick={reload}>{t('analysis.state.retry')}</button>
                    </div>
                )}
                {truncated && (
                    <div className={styles.stateWarn} data-testid="analysis-alert-truncated">
                        {t('analysis.state.truncated')}:{productionHistory.length}
                    </div>
                )}
                {localOnlyCount > 0 && (
                    <div className={styles.stateWarn} data-testid="analysis-alert-local-only">
                        {localOnlyCount} {t('analysis.state.localOnly')}
                    </div>
                )}
            </div>
        );
    };

    const scrollToStart = () => chartContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    const scrollToEnd = () => chartContainerRef.current?.scrollTo({ left: chartContainerRef.current.scrollWidth, behavior: 'smooth' });

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>{t('analysis.title')}</h2>
            {renderDataState()}
            <div className={styles.mainLayout}>
                <AnalysisSidebar 
                    {...{startDate, setStartDate, endDate, setEndDate, selectedCategories, setSelectedCategories, chartType, setChartType, timeScale, setTimeScale, selectedDisplayItems, setSelectedDisplayItems, sidebarCollapsed, setSidebarCollapsed, handleQuickDate, availableCategoryFields, availableDisplayFields, chartOptions, timeScaleOptions, isDistributionChart, exportToExcel, downloadChartAsImage, clearAllFilters, t}} 
                />
                <div className={styles.chartArea}>
                    <div className={styles.viewModeToggle}>
                        <button className={`${styles.viewModeBtn} ${viewMode === 'chart' ? styles.active : ''}`} onClick={() => setViewMode('chart')}>📊 {t('analysis.controls.chartView')}</button>
                        <button className={`${styles.viewModeBtn} ${viewMode === 'table' ? styles.active : ''}`} onClick={() => setViewMode('table')}>📋 {t('analysis.controls.tableView')}</button>
                    </div>
                    <AnalysisSummary summaryStats={summaryStats} historyCount={productionHistory.length} formatStopTime={formatStopTime} t={t} />
                    <div className={styles.chartNavigation}>
                        <button className={styles.navBtn} onClick={scrollToStart}>◀ {t('analysis.controls.scrollStart')}</button>
                        <button className={styles.navBtn} onClick={scrollToEnd}>{t('analysis.controls.scrollEnd')} ▶</button>
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
