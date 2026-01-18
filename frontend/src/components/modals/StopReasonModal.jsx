import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from './StopReasonModal.module.css';

const StopReasonModal = ({ isOpen, onClose, onSelect }) => {
    const { t } = useLanguage();
    const [selectedCode, setSelectedCode] = useState(null);

    const STOP_REASONS = [
        { code: '001', name: t('dashboard.stopReasons.001') || '送紙歪斜 (Feed Skew)' },
        { code: '002', name: t('dashboard.stopReasons.002') || '印刷不清 (Print Blurry)' },
        { code: '003', name: t('dashboard.stopReasons.003') || '紙張破裂 (Paper Tear)' },
        { code: '004', name: t('dashboard.stopReasons.004') || '油墨不足 (Low Ink)' },
        { code: '005', name: t('dashboard.stopReasons.005') || '機械故障 (Mechanical Failure)' },
        { code: '006', name: t('dashboard.stopReasons.006') || '其他 (Other)' },
    ];

    if (!isOpen) return null;

    const handleSelect = () => {
        if (selectedCode) {
            const reason = STOP_REASONS.find(r => r.code === selectedCode);
            onSelect(reason);
            onClose();
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.window}>
                <div className={styles.titleBar}>
                    <span>{t('reports.tabs.stopReasons')}</span>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>
                <div className={styles.body}>
                    <div className={styles.listContainer}>
                        <div className={styles.headerRow}>
                            <div className={styles.colCode}>Code</div>
                            <div className={styles.colReason}>{t('dashboard.stopReasons.reason')}</div>
                        </div>
                        <div className={styles.list}>
                            {STOP_REASONS.map((item) => (
                                <div
                                    key={item.code}
                                    className={`${styles.row} ${selectedCode === item.code ? styles.selected : ''}`}
                                    onClick={() => setSelectedCode(item.code)}
                                >
                                    <div className={styles.colCode}>{item.code}</div>
                                    <div className={styles.colReason}>{item.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.sideButtons}>
                        <button onClick={onClose}>{t('ui.buttons.cancel')}</button>
                        <button onClick={handleSelect}>{t('ui.buttons.confirm')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StopReasonModal;
