import React from 'react';
import styles from '../AnalysisPage.module.css';

const AnalysisTable = ({ productionHistory, clearAllFilters, t }) => {
    if (productionHistory.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <h3>{t('ui.messages.noData')}</h3>
                <p>請嘗試以下操作：</p>
                <ul className={styles.emptyHints}>
                    <li>📅 擴大日期範圍</li>
                    <li>🔄 清除分類條件</li>
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

export default AnalysisTable;
