import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from './HelpModal.module.css';

/**
 * HelpModal 元件 - 顯示操作說明書的模態視窗
 * 
 * @param {Object} props - 元件屬性
 * @param {boolean} props.isOpen - 是否開啟模態框
 * @param {function} props.onClose - 關閉模態框的回調函數
 * @returns {JSX.Element|null} - 模態框元件或 null
 */
const HelpModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    // 說明項目定義：包含 ID、顯示名稱及對應的 HTML 檔案路徑
    const helpItems = [
        { id: 'monitor', label: t('modalExt.help.items.monitor'), src: '/help/monitor.html' },
        { id: 'schedule', label: t('modalExt.help.items.schedule'), src: '/help/schedule.html' },
        { id: 'reports', label: t('modalExt.help.items.reports'), src: '/help/reports.html' },
        { id: 'analysis', label: t('modalExt.help.items.analysis'), src: '/help/analysis.html' },
        { id: 'settings', label: t('modalExt.help.items.settings'), src: '/help/settings.html' },
    ];

    // 當前選中的說明項目索引
    const [activeIndex, setActiveIndex] = useState(0);

    // 若未開啟則不渲染
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* 標題列 */}
                <div className={styles.header}>
                    <h2 className={styles.title}>📖 {t('modalExt.help.title')}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* 內容區 */}
                <div className={styles.content}>
                    {/* 左側選單 */}
                    <div className={styles.sidebar}>
                        {helpItems.map((item, index) => (
                            <button
                                key={item.id}
                                className={`${styles.menuItem} ${activeIndex === index ? styles.active : ''}`}
                                onClick={() => setActiveIndex(index)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* 右側內容區 - 使用 iframe 載入 HTML */}
                    <div className={styles.mainContent}>
                        <iframe
                            src={helpItems[activeIndex].src}
                            title={helpItems[activeIndex].label}
                            className={styles.iframe}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
