import React from 'react';
import styles from '../AnalysisPage.module.css';

const AnalysisSidebar = ({
    startDate, setStartDate,
    endDate, setEndDate,
    selectedCategories, setSelectedCategories,
    chartType, setChartType,
    timeScale, setTimeScale,
    selectedDisplayItems, setSelectedDisplayItems,
    sidebarCollapsed, setSidebarCollapsed,
    handleQuickDate,
    availableCategoryFields,
    availableDisplayFields,
    chartOptions,
    timeScaleOptions,
    isDistributionChart,
    exportToExcel,
    downloadChartAsImage,
    clearAllFilters,
    t
}) => {
    
    // === 新增分類條件 ===
    const handleAddCategory = () => {
        const unusedField = availableCategoryFields.find(f => !selectedCategories.includes(f.id));
        if (unusedField) setSelectedCategories(prev => [...prev, unusedField.id]);
    };

    const handleRemoveCategory = (categoryId) => {
        setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    };

    const handleCategoryChange = (index, newCategoryId) => {
        setSelectedCategories(prev => {
            const updated = [...prev];
            updated[index] = newCategoryId;
            return updated;
        });
    };

    const handleAddDisplayItem = () => {
        if (selectedDisplayItems.length >= 3) return;
        const unusedField = availableDisplayFields.find(f => !selectedDisplayItems.includes(f.id));
        if (unusedField) setSelectedDisplayItems(prev => [...prev, unusedField.id]);
    };

    const handleRemoveDisplayItem = (itemId) => {
        setSelectedDisplayItems(prev => prev.filter(id => id !== itemId));
    };

    const handleDisplayItemChange = (index, newItemId) => {
        setSelectedDisplayItems(prev => {
            const updated = [...prev];
            updated[index] = newItemId;
            return updated;
        });
    };

    return (
        <div className={`${styles.controlPanel} ${sidebarCollapsed ? styles.collapsed : ''}`}>
            <button
                className={styles.collapseBtn}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
                {sidebarCollapsed ? '▶' : '◀'}
            </button>
            
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>📅 {t('analysis.dateRange')}</h4>
                <div className={styles.dateRange}>
                    <label>開始: <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.dateInput} /></label>
                    <label>結束: <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.dateInput} /></label>
                </div>
                <div className={styles.quickDateButtons}>
                    {['today', 'yesterday', 'last7days', 'thisMonth'].map(type => (
                        <button key={type} onClick={() => handleQuickDate(type)} className={styles.quickBtn}>
                            {t(`analysis.quickDate.${type}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>📊 {t('analysis.category.title')}</h4>
                    <button className={styles.addBtn} onClick={handleAddCategory} disabled={selectedCategories.length >= availableCategoryFields.length}>+ {t('ui.buttons.add')}</button>
                </div>
                <div className={styles.categoryList}>
                    {selectedCategories.map((categoryId, index) => (
                        <div key={index} className={styles.categoryRow}>
                            <select value={categoryId} onChange={(e) => handleCategoryChange(index, e.target.value)} className={styles.categorySelect}>
                                {availableCategoryFields.map(field => (
                                    <option key={field.id} value={field.id} disabled={selectedCategories.includes(field.id) && field.id !== categoryId}>{field.label}</option>
                                ))}
                            </select>
                            <button className={styles.removeBtn} onClick={() => handleRemoveCategory(categoryId)}>✕</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>📋 {t('analysis.display.title')}</h4>
                    <button className={styles.addBtn} onClick={handleAddDisplayItem} disabled={selectedDisplayItems.length >= 3}>+ {t('ui.buttons.add') || '新增'}</button>
                </div>
                <div className={styles.categoryList}>
                    {selectedDisplayItems.map((itemId, index) => (
                        <div key={index} className={styles.categoryRow}>
                            <select value={itemId} onChange={(e) => handleDisplayItemChange(index, e.target.value)} className={styles.categorySelect}>
                                {availableDisplayFields.map(field => (
                                    <option key={field.id} value={field.id} disabled={selectedDisplayItems.includes(field.id) && field.id !== itemId}>{field.label}</option>
                                ))}
                            </select>
                            <button className={styles.removeBtn} onClick={() => handleRemoveDisplayItem(itemId)}>✕</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>📈 {t('analysis.chartType.title') || '圖形類型'}</h4>
                <div className={styles.radioGroup}>
                    {chartOptions.map(opt => (
                        <label key={opt.id} className={styles.radioLabel}>
                            <input type="radio" name="chartType" value={opt.id} checked={chartType === opt.id} onChange={() => setChartType(opt.id)} />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>⏱ {t('analysis.timeScale.title') || '時間刻度'}</h4>
                <div className={styles.radioGroup}>
                    {timeScaleOptions.map(opt => (
                        <label key={opt.id} className={styles.radioLabel}>
                            <input type="radio" name="timeScale" value={opt.id} checked={timeScale === opt.id} onChange={() => setTimeScale(opt.id)} disabled={isDistributionChart} />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <button className={styles.exportBtn} onClick={exportToExcel}>💾 {t('analysis.actions.exportExcel') || '匯出 Excel'}</button>
                <button className={styles.exportBtn} onClick={downloadChartAsImage} style={{ background: '#4caf50', marginBottom: '8px' }}>📷 {t('analysis.actions.downloadImage') || '下載圖表'}</button>
                <button className={styles.printBtn} onClick={() => window.print()}>🖨️ {t('analysis.actions.print') || '列印'}</button>
                <button className={styles.clearBtn} onClick={clearAllFilters} style={{ marginTop: '8px', width: '100%' }}>🗑️ {t('analysis.actions.clearFilters')}</button>
            </div>
        </div>
    );
};

export default AnalysisSidebar;
