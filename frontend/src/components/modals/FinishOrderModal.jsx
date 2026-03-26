import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from './ModalStyles.module.css';

const FinishOrderModal = ({ isOpen, onClose, onConfirm, initialData }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        operator: '',
        shift: 'A',
        goodQty: 0,
        splitCount: 0,
        shortageWen: 0,
        shortageWu: 0,
        shortageReason: '',
        processType: '',
        isSplit: false,
        isFinished: false,
        saveOptimized: true,
        targetQty: 0,
    });

    const [defects, setDefects] = useState([
        { id: 'A01', reason: '不良平板', qty: 0 },
        { id: 'A02', reason: '不良印製', qty: 0 },
        { id: 'A03', reason: '不良本身', qty: 0 },
        { id: 'A04', reason: '超製', qty: 0 },
    ]);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(prev => ({
                ...prev,
                operator: initialData.operator || '',
                shift: initialData.shift || 'A',
                goodQty: initialData.qty || 0,
                targetQty: initialData.targetQty || 0
            }));
        }
    }, [isOpen, initialData]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDefectChange = (id, newQty) => {
        setDefects(prev => prev.map(d => d.id === id ? { ...d, qty: Number(newQty) } : d));
    };

    const handleSubmit = () => {
        // Validation: If Good Qty < Target Qty, Shortage Reason is required
        // UNLESS the gap is smaller than the configured threshold (default 50)

        const shortageGap = formData.targetQty - formData.goodQty;
        // Fetch setting dynamically (or pass as prop, but fetch is safer for modal isolation)
        let threshold = 50;
        try {
            const settings = JSON.parse(localStorage.getItem('formulaSettings'));
            if (settings && settings.shortageThreshold !== undefined) {
                threshold = settings.shortageThreshold;
            }
        } catch (e) {
            console.error("Error reading formulaSettings", e);
        }

        if (shortageGap > 0 && shortageGap > threshold && !formData.shortageReason) {
            alert(`未達目標產量 (${formData.targetQty}) 且差異大於 ${threshold}，請輸入欠量原因 (Shortage Reason Required)`);
            return;
        }

        onConfirm({ ...formData, defects });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ width: '600px', maxWidth: '90vw' }}>
                <div className={styles.header}>
                    <h2>{t('modals.finishOrder.title')}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>
                <div className={styles.body} style={{ display: 'flex', gap: '20px' }}>
                    {/* Left Column: Form Info */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '80px', textAlign: 'right', marginRight: '10px' }}>{t('dashboard.monitor.operator')}</label>
                            <input
                                name="operator"
                                value={formData.operator}
                                onChange={handleInputChange}
                                style={{ flex: 1, padding: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '80px', textAlign: 'right', marginRight: '10px' }}>{t('dashboard.monitor.shift')}</label>
                            <input
                                name="shift"
                                value={formData.shift}
                                onChange={handleInputChange}
                                style={{ flex: 1, padding: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '80px', textAlign: 'right', marginRight: '10px' }}>{t('reports.table.good')}</label>
                            <input
                                type="number"
                                name="goodQty"
                                value={formData.goodQty}
                                onChange={handleInputChange}
                                style={{ flex: 1, padding: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '80px', textAlign: 'right', marginRight: '10px' }}>{t('modals.finishOrder.splitCount')}</label>
                            <input
                                type="number"
                                name="splitCount"
                                value={formData.splitCount}
                                onChange={handleInputChange}
                                style={{ flex: 1, padding: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '80px', textAlign: 'right', marginRight: '10px' }}>{t('modals.finishOrder.shortageWen')}</label>
                            <input
                                type="number"
                                name="shortageWen"
                                value={formData.shortageWen}
                                onChange={handleInputChange}
                                style={{ flex: 1, padding: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '80px', textAlign: 'right', marginRight: '10px' }}>{t('modals.finishOrder.shortageWu')}</label>
                            <input
                                type="number"
                                name="shortageWu"
                                value={formData.shortageWu}
                                onChange={handleInputChange}
                                style={{ flex: 1, padding: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '80px', textAlign: 'right', marginRight: '10px' }}>{t('modals.finishOrder.shortageReason')}</label>
                            <select
                                name="shortageReason"
                                value={formData.shortageReason}
                                onChange={handleInputChange}
                                style={{ flex: 1, padding: '4px' }}
                            >
                                <option value="">請選擇</option>
                                <option value="Reason A">原因 A</option>
                                <option value="Reason B">原因 B</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ width: '80px', textAlign: 'right', marginRight: '10px' }}>{t('modals.finishOrder.processType')}</label>
                            <select
                                name="processType"
                                value={formData.processType}
                                onChange={handleInputChange}
                                style={{ flex: 1, padding: '4px' }}
                            >
                                <option value="">請選擇</option>
                                <option value="Type A">類別 A</option>
                                <option value="Type B">類別 B</option>
                            </select>
                        </div>
                        <div style={{ paddingLeft: '90px' }}>
                            <label style={{ display: 'block' }}>
                                <input type="checkbox" name="isSplit" checked={formData.isSplit} onChange={handleInputChange} /> {t('modals.finishOrder.isSplit')}
                            </label>
                            <label style={{ display: 'block' }}>
                                <input type="checkbox" name="isFinished" checked={formData.isFinished} onChange={handleInputChange} /> {t('modals.finishOrder.isFinished')}
                            </label>
                            <label style={{ display: 'block' }}>
                                <input type="checkbox" name="saveOptimized" checked={formData.saveOptimized} onChange={handleInputChange} /> {t('modals.finishOrder.saveOptimized')}
                            </label>
                        </div>
                    </div>

                    {/* Right Column: Defects Table */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                            <thead style={{ backgroundColor: '#f0f0f0' }}>
                                <tr>
                                    <th style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'left' }}>{t('reports.table.reason')}</th>
                                    <th style={{ border: '1px solid #ccc', padding: '5px', width: '60px' }}>{t('reports.table.qty')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {defects.map(d => (
                                    <tr key={d.id}>
                                        <td style={{ border: '1px solid #ccc', padding: '5px' }}>{d.id} {d.reason}</td>
                                        <td style={{ border: '1px solid #ccc', padding: '0' }}>
                                            <input
                                                type="number"
                                                value={d.qty}
                                                onChange={(e) => handleDefectChange(d.id, e.target.value)}
                                                style={{ width: '100%', border: 'none', padding: '5px' }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ flex: 1, background: '#999', marginTop: '10px', minHeight: '100px' }}>
                            {/* Placeholder for whatever graphic was in the gray box */}
                        </div>
                    </div>
                </div >
                <div className={styles.footer} style={{ justifyContent: 'flex-end', gap: '10px' }}>
                    <button className={styles.primaryBtn} onClick={handleSubmit}>{t('ui.buttons.confirm')}</button>
                    <button className={styles.secondaryBtn} onClick={onClose}>{t('ui.buttons.cancel')}</button>
                </div>
            </div >
        </div >
    );
};

export default FinishOrderModal;
