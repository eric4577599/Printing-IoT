import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import { useReasonCodes } from '../../hooks/useReasonCodes';
import styles from './StopReasonModal.module.css';

/**
 * 現場停機原因的內建預設清單(S3 / F8 的最後一道降級)
 * @param {Function} t - i18n 翻譯函式
 * @returns {Array} 六筆停機原因 { code, name }
 * @description 原本是元件內寫死的常數,改為後端主檔的 fallback ——
 *              API 與 localStorage 快取皆不可用時仍讓現場有原因可選。
 */
const buildDefaultStopReasons = (t) => [
    { code: '001', name: t('fix.stop001') || '送紙歪斜 (Feed Skew)' },
    { code: '002', name: t('fix.stop002') || '印刷不清 (Print Blurry)' },
    { code: '003', name: t('fix.stop003') || '紙張破裂 (Paper Tear)' },
    { code: '004', name: t('fix.stop004') || '油墨不足 (Low Ink)' },
    { code: '005', name: t('fix.stop005') || '機械故障 (Mechanical Failure)' },
    { code: '006', name: t('fix.stop006') || '其他 (Other)' },
];

const StopReasonModal = ({ isOpen, onClose, onSelect }) => {
    const { t } = useLanguage();
    const [selectedCode, setSelectedCode] = useState(null);

    // S3 / F8:改讀後端原因主檔,設定頁的異動現場立即看得到;失敗時退回內建六筆
    const { reasons: STOP_REASONS } = useReasonCodes('stop', buildDefaultStopReasons(t));

    if (!isOpen) return null;

    const handleSelect = () => {
        if (selectedCode) {
            const reason = STOP_REASONS.find(r => r.code === selectedCode);
            if (!reason) return;
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
