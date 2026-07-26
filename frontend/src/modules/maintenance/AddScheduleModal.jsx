import React, { useState, useEffect } from 'react';
import { useLanguage } from '../language/LanguageContext';
import styles from './AddScheduleModal.module.css';

/**
 * 新增排程 Modal
 * @param {boolean} isOpen - 是否顯示 Modal
 * @param {function} onClose - 關閉回呼
 * @param {function} onSave - 儲存回呼 (scheduleData)
 * @param {object} product - 待新增的產品資料
 * @param {array} orders - 現有排程列表 (用於計算預設序號)
 */
const AddScheduleModal = ({ isOpen, onClose, onSave, product, orders = [] }) => {
    const { t } = useLanguage();
    // 計算預設序號：現有排程數量 +1 再 ×10
    const getDefaultSeqNo = () => {
        if (!orders || orders.length === 0) return 10;
        return (orders.length + 1) * 10;
    };

    const [formData, setFormData] = useState({
        orderNo: '',
        qty: 5000,
        seqNo: getDefaultSeqNo(),
        isOptimized: true
    });

    // 當 isOpen 變化時重新計算預設序號
    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                seqNo: getDefaultSeqNo()
            }));
        }
    }, [isOpen, orders?.length]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!formData.orderNo || formData.orderNo.trim() === '') {
            alert(t('modalExt.addSchedule.alertOrderNoRequired'));
            return;
        }
        if (!formData.qty || formData.qty < 1) {
            alert(t('modalExt.addSchedule.alertQtyRequired'));
            return;
        }
        // 修正:輸入框標示「不可重複」但原無檢查。比對現有排程,拒絕重複訂單號碼。
        const inputNo = formData.orderNo.trim();
        if (orders.some(o => (o.orderNo || '').trim() === inputNo)) {
            alert(`${t('modalExt.addSchedule.alertDuplicate')} (${inputNo})`);
            return;
        }
        onSave(formData);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <span>{t('modalExt.addSchedule.title')}</span>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>
                <div className={styles.content}>
                    <div className={styles.row}>
                        <label>{t('dashboard.schedule.orderNo')}</label>
                        <input
                            type="text"
                            placeholder={t('modalExt.addSchedule.orderNoPlaceholder')}
                            maxLength={12}
                            value={formData.orderNo}
                            onChange={e => setFormData(prev => ({ ...prev, orderNo: e.target.value }))}
                        />
                    </div>
                    <div className={styles.row}>
                        <label>{t('dashboard.schedule.qty')}</label>
                        <input
                            type="number"
                            value={formData.qty}
                            min={1}
                            onChange={e => setFormData(prev => ({ ...prev, qty: Number(e.target.value) }))}
                        />
                    </div>
                    <div className={styles.row}>
                        <label>Seq/No</label>
                        <input
                            type="number"
                            value={formData.seqNo}
                            onChange={e => setFormData(prev => ({ ...prev, seqNo: Number(e.target.value) }))}
                        />
                    </div>
                    <div className={styles.row} style={{ justifyContent: 'flex-start' }}>
                        <input
                            type="checkbox"
                            id="optimize"
                            checked={formData.isOptimized}
                            onChange={e => setFormData(prev => ({ ...prev, isOptimized: e.target.checked }))}
                        />
                        <label htmlFor="optimize" style={{ width: 'auto', marginLeft: '5px' }}>{t('modalExt.addSchedule.useOptimized')}</label>
                    </div>
                </div>
                <div className={styles.footer}>
                    <button onClick={handleConfirm}>{t('ui.buttons.confirm')}</button>
                    <button onClick={onClose}>{t('ui.buttons.cancel')}</button>
                </div>
            </div>
        </div>
    );
};

export default AddScheduleModal;
