import { useState, useMemo } from 'react';
import { useLanguage } from '../../../modules/language/LanguageContext';
import { useProductionRecords } from '../../../hooks/useProductionRecords';

export const useAnalysisData = () => {
    const { t } = useLanguage();

    // === 時間區間 ===
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // === 狀態管理 ===
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [chartType, setChartType] = useState('bar');
    const [timeScale, setTimeScale] = useState('day');
    const [selectedDisplayItems, setSelectedDisplayItems] = useState(['qty']);
    const [viewMode, setViewMode] = useState('chart');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // === 資料讀取 ===
    // S4 / F4.2:改由共用 hook 供資料(後端為主、本機快取補洞並標示來源),
    // 不再直讀 localStorage;日期區間直接下推給後端查詢。
    const {
        records: productionHistory,
        isLoading,
        error,
        isDegraded,
        truncated,
        localOnlyCount,
        reload,
    } = useProductionRecords({ from: startDate, to: endDate });

    // === 資料分組 ===
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

    // === 摘要統計 ===
    const summaryStats = useMemo(() => {
        if (productionHistory.length === 0) {
            return { totalQty: 0, avgDailyQty: 0, totalStopTime: 0, avgSpeed: 0 };
        }

        const totalQty = productionHistory.reduce((sum, r) => sum + (r.goodQty || 0), 0);
        const totalStopTime = productionHistory.reduce((sum, r) => sum + (r.stopTime || 0), 0);
        const totalRunTime = productionHistory.reduce((sum, r) => sum + (r.runTime || 0), 0);
        const avgSpeed = totalRunTime > 0 ? Math.round(totalQty / totalRunTime) : 0;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        const avgDailyQty = Math.round(totalQty / days);

        return { totalQty, avgDailyQty, totalStopTime, avgSpeed };
    }, [productionHistory, startDate, endDate]);

    return {
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
        // S4 / F4.2:新增的資料狀態(既有回傳欄位一個不少,只做加法)
        isLoading,
        error,
        isDegraded,
        truncated,
        localOnlyCount,
        reload
    };
};
