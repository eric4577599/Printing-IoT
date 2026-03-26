import React, { useState, useEffect } from 'react';
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
            alert('請輸入訂單號碼 (Order No. is required)');
            return;
        }
        if (!formData.qty || formData.qty < 1) {
            alert('請輸入有效數量 (Valid Qty is required)');
            return;
        }
        onSave(formData);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <span>新增排程</span>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>
                <div className={styles.content}>
                    <div className={styles.row}>
                        <label>訂單號碼</label>
                        <input
                            type="text"
                            placeholder="12碼, 不可重複"
                            maxLength={12}
                            value={formData.orderNo}
                            onChange={e => setFormData(prev => ({ ...prev, orderNo: e.target.value }))}
                        />
                    </div>
                    <div className={styles.row}>
                        <label>數量</label>
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
                        <label htmlFor="optimize" style={{ width: 'auto', marginLeft: '5px' }}>是否使用最佳化參數</label>
                    </div>
                </div>
                <div className={styles.footer}>
                    <button onClick={handleConfirm}>確定</button>
                    <button onClick={onClose}>取消</button>
                </div>
            </div>
        </div>
    );
};

export default AddScheduleModal;
