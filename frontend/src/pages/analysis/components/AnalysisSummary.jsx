import React from 'react';
import styles from '../AnalysisPage.module.css';

const AnalysisSummary = ({ summaryStats, historyCount, formatStopTime, t }) => {
    return (
        <div className={styles.summaryBar}>
            <div className={styles.summaryItem}>
                <span className={styles.summaryIcon}>📦</span>
                <div>
                    <span className={styles.summaryLabel}>{t('analysis.summary.totalQty') || '總生產量'}</span>
                    <span className={styles.summaryValue}>{summaryStats.totalQty.toLocaleString()} {t('analysis.units.sheets')}</span>
                </div>
            </div>
            <div className={styles.summaryItem}>
                <span className={styles.summaryIcon}>📊</span>
                <div>
                    <span className={styles.summaryLabel}>{t('analysis.summary.avgDailyQty') || '平均日產量'}</span>
                    <span className={styles.summaryValue}>{summaryStats.avgDailyQty.toLocaleString()} {t('analysis.units.sheets')}</span>
                </div>
            </div>
            <div className={styles.summaryItem}>
                <span className={styles.summaryIcon}>⏸️</span>
                <div>
                    <span className={styles.summaryLabel}>{t('analysis.summary.totalStopTime') || '總停車時間'}</span>
                    <span className={styles.summaryValue}>{formatStopTime(summaryStats.totalStopTime)}</span>
                </div>
            </div>
            <div className={styles.summaryItem}>
                <span className={styles.summaryIcon}>⚡</span>
                <div>
                    <span className={styles.summaryLabel}>{t('analysis.summary.avgSpeed') || '平均車速'}</span>
                    <span className={styles.summaryValue}>{summaryStats.avgSpeed} {t('analysis.units.sheetsPerMin')}</span>
                </div>
            </div>
            <div className={styles.summaryItem}>
                <span className={styles.summaryIcon}>📋</span>
                <div>
                    <span className={styles.summaryLabel}>{t('analysis.summary.recordsCount') || '記錄筆數'}</span>
                    <span className={styles.summaryValue}>{historyCount} {t('analysis.units.records')}</span>
                </div>
            </div>
        </div>
    );
};

export default AnalysisSummary;
