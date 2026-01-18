import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from './OrderDetailsModal.module.css';
import BoxDiagram from '../common/BoxDiagram';

/**
 * OrderDetailsModal - 訂單規格視窗 (F7)
 * 
 * 此視窗用於顯示和編輯當前訂單的規格參數。
 * 重要：在此修改的內容只會影響當前訂單，不會回寫到產品庫（最佳化內容）。
 * 
 * @param {boolean} isOpen - 是否開啟
 * @param {function} onClose - 關閉回呼
 * @param {object} order - 訂單資料
 * @param {function} onSave - 儲存回呼 (可選，用於更新當前訂單)
 */
const OrderDetailsModal = ({ isOpen, onClose, order, onSave }) => {
    const { t } = useLanguage();
    // 編輯用的狀態
    const [formData, setFormData] = useState({});
    const [isDirty, setIsDirty] = useState(false);

    // 當 Modal 開啟或訂單變更時，重設表單資料
    useEffect(() => {
        if (isOpen && order) {
            setFormData({ ...order });
            setIsDirty(false);
        }
    }, [isOpen, order]);

    if (!isOpen) return null;

    const data = formData;

    /**
     * 處理欄位變更
     * @param {string} field - 欄位名稱
     * @param {any} value - 新值
     */
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    /**
     * 處理儲存 - 只更新當前訂單，不影響產品庫
     */
    const handleSave = () => {
        if (onSave && isDirty) {
            // 只傳遞當前訂單的修改，不會影響產品庫
            onSave(formData);
        }
        onClose();
    };

    /**
     * 處理取消 - 放棄變更
     */
    const handleCancel = () => {
        if (isDirty) {
            if (!confirm(t('ui.messages.unsavedWarning'))) {
                return;
            }
        }
        onClose();
    };

    return ReactDOM.createPortal(
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <span>{t('modals.orderDetails.title')} {isDirty && `(${t('ui.messages.modified')})`}</span>
                    <div className={styles.winControls}>
                        <button onClick={handleCancel} className={styles.closeBtn}>×</button>
                    </div>
                </div>

                <div className={styles.content}>
                    {/* 提示訊息 */}
                    <div style={{
                        backgroundColor: '#fff8e1',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        marginBottom: '10px',
                        fontSize: '0.85rem',
                        color: '#856404',
                        border: '1px solid #ffeeba'
                    }}>
                        💡 {t('modals.orderDetails.editNote')}
                    </div>

                    {/* Top Form Section */}
                    {/* Row 1 */}
                    <div className={styles.formRow}>
                        <label>{t('dashboard.schedule.boxNo')}</label>
                        <input
                            type="text"
                            value={data.boxNo || ''}
                            onChange={e => handleChange('boxNo', e.target.value)}
                            style={{ width: '220px' }}
                        />
                        <label>{t('dashboard.schedule.customer')}</label>
                        <input
                            type="text"
                            value={data.customer || ''}
                            onChange={e => handleChange('customer', e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>

                    {/* Row 2 */}
                    <div className={styles.formRow}>
                        <label>{t('dashboard.schedule.productName')}</label>
                        <input
                            type="text"
                            value={data.productName || data.msg || ''}
                            onChange={e => handleChange('productName', e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>

                    {/* Row 3 */}
                    <div className={styles.formRow}>
                        <label>{t('dashboard.schedule.boxType')}</label>
                        <input
                            type="text"
                            value={data.boxType || ''}
                            onChange={e => handleChange('boxType', e.target.value)}
                            style={{ width: '50px', marginRight: '5px' }}
                        />
                        <button style={{ marginRight: '5px' }} disabled>...</button>
                        <input type="text" defaultValue="" readOnly style={{ width: '150px' }} />

                        <div style={{ flex: 1 }}></div> {/* Spacer */}
                    </div>

                    {/* Row 4 */}
                    <div className={styles.formRow}>
                        <label>{t('settings.unit.flute')}</label>
                        <input
                            type="text"
                            value={data.flute || ''}
                            onChange={e => handleChange('flute', e.target.value)}
                            style={{ width: '80px', marginRight: '20px' }}
                        />

                        <label>{t('settings.unit.thickness')}</label>
                        <input
                            type="number"
                            value={data.thickness || ''}
                            onChange={e => handleChange('thickness', Number(e.target.value))}
                            style={{ width: '80px', marginRight: '20px' }}
                        />

                        <label>張摺數</label>
                        <input
                            type="number"
                            value={data.bundleCount || 0}
                            onChange={e => handleChange('bundleCount', Number(e.target.value))}
                            style={{ width: '80px' }}
                        />
                    </div>

                    {/* Row 5: Remarks */}
                    <div className={styles.formRow}>
                        <label>{t('dashboard.schedule.notes')}</label>
                        <textarea
                            rows="2"
                            style={{ flex: 1, resize: 'none' }}
                            value={data.remarks || ''}
                            onChange={e => handleChange('remarks', e.target.value)}
                        ></textarea>
                    </div>

                    {/* Main Split Area */}
                    <div className={styles.mainSplit}>

                        {/* LEFT: Box Diagram (Gray Background) */}
                        <div className={styles.diagramPanel}>
                            <BoxDiagram data={data} />
                        </div>

                        {/* RIGHT: Parameters Panel */}
                        <div className={styles.paramPanel}>
                            {/* PX Settings */}
                            <div className={styles.pxGrid}>
                                <div className={styles.pxRow}>
                                    <span>PX1</span>
                                    <input value={data.px1 || 0} onChange={e => handleChange('px1', Number(e.target.value))} type="number" />
                                    <span>送紙前擋板間隙</span>
                                    <input value={data.gapFeedFront || 0} onChange={e => handleChange('gapFeedFront', Number(e.target.value))} type="number" />
                                </div>
                                <div className={styles.pxRow}>
                                    <span>PX2</span>
                                    <input value={data.px2 || 0} onChange={e => handleChange('px2', Number(e.target.value))} type="number" />
                                    <span>送紙進紙輪間隙</span>
                                    <input value={data.gapFeedProg || 0} onChange={e => handleChange('gapFeedProg', Number(e.target.value))} type="number" />
                                </div>
                                <div className={styles.pxRow}>
                                    <span>PX3</span>
                                    <input value={data.px3 || 0} onChange={e => handleChange('px3', Number(e.target.value))} type="number" />
                                    <span>送紙皮帶輪間隙</span>
                                    <input value={data.gapFeedRubber || 0} onChange={e => handleChange('gapFeedRubber', Number(e.target.value))} type="number" />
                                </div>
                                <div className={styles.pxRow}>
                                    <span>PX4</span>
                                    <input value={data.px4 || 0} onChange={e => handleChange('px4', Number(e.target.value))} type="number" />
                                    <span>成型部前導間隙</span>
                                    <input value={data.gapFormFront || 0} onChange={e => handleChange('gapFormFront', Number(e.target.value))} type="number" />
                                </div>
                                <div className={styles.pxRow}>
                                    <span>PX5</span>
                                    <input value={data.px5 || 0} onChange={e => handleChange('px5', Number(e.target.value))} type="number" />
                                    <span>模切部相位</span>
                                    <input value={data.dieCutPhase || 0} onChange={e => handleChange('dieCutPhase', Number(e.target.value))} type="number" />
                                </div>
                                <div className={styles.pxRow}>
                                    <span></span><span></span>
                                    <span>模切部送紙輪間隙</span>
                                    <input value={data.dieCutFeedGap || 0} onChange={e => handleChange('dieCutFeedGap', Number(e.target.value))} type="number" />
                                </div>
                                <div className={styles.pxRow}>
                                    <span></span><span></span>
                                    <span>開槽導紙輪</span>
                                    <input value={data.slotGuide || 0} onChange={e => handleChange('slotGuide', Number(e.target.value))} type="number" />
                                </div>
                                <div className={styles.pxRow}>
                                    <span></span><span></span>
                                    <span>開槽部壓線</span>
                                    <input value={data.slotFront || 0} onChange={e => handleChange('slotFront', Number(e.target.value))} type="number" />
                                </div>
                                <div className={styles.pxRow}>
                                    <span></span><span></span>
                                    <span>開槽部輔助壓線</span>
                                    <input value={data.slotAux || 0} onChange={e => handleChange('slotAux', Number(e.target.value))} type="number" />
                                </div>
                                <div className={styles.pxRow}>
                                    <span></span><span></span>
                                    <span>中刀位置</span>
                                    <input value={data.midKnife || 0} onChange={e => handleChange('midKnife', Number(e.target.value))} type="number" />
                                </div>
                            </div>

                            {/* Print Units */}
                            <div className={styles.printSection}>
                                <div>印刷部</div>
                                <table className={styles.printTable}>
                                    <thead>
                                        <tr><th></th><th>印壓</th><th>位置</th><th>皮帶間隙</th><th>版座間隙</th></tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3, 4].map(i => {
                                            // 取得印刷單元資料
                                            const printUnit = (data.printUnits && data.printUnits[i - 1]) || { ink: 0, pos: 0, gap: 0, press: 0 };
                                            return (
                                                <tr key={i}>
                                                    <td>{['一', '二', '三', '四'][i - 1]}</td>
                                                    <td><input type="number" value={printUnit.ink} onChange={e => {
                                                        const newUnits = [...(data.printUnits || [{}, {}, {}, {}])];
                                                        newUnits[i - 1] = { ...newUnits[i - 1], ink: Number(e.target.value) };
                                                        handleChange('printUnits', newUnits);
                                                    }} /></td>
                                                    <td><input type="number" value={printUnit.pos} onChange={e => {
                                                        const newUnits = [...(data.printUnits || [{}, {}, {}, {}])];
                                                        newUnits[i - 1] = { ...newUnits[i - 1], pos: Number(e.target.value) };
                                                        handleChange('printUnits', newUnits);
                                                    }} /></td>
                                                    <td><input type="number" value={printUnit.gap} onChange={e => {
                                                        const newUnits = [...(data.printUnits || [{}, {}, {}, {}])];
                                                        newUnits[i - 1] = { ...newUnits[i - 1], gap: Number(e.target.value) };
                                                        handleChange('printUnits', newUnits);
                                                    }} /></td>
                                                    <td><input type="number" value={printUnit.press} onChange={e => {
                                                        const newUnits = [...(data.printUnits || [{}, {}, {}, {}])];
                                                        newUnits[i - 1] = { ...newUnits[i - 1], press: Number(e.target.value) };
                                                        handleChange('printUnits', newUnits);
                                                    }} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.footerBtns}>
                                <button onClick={handleSave} style={{ backgroundColor: isDirty ? '#28a745' : undefined, color: isDirty ? '#fff' : undefined }}>
                                    {t('ui.buttons.confirm')}
                                </button>
                                <button onClick={handleCancel}>{t('ui.buttons.cancel')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default OrderDetailsModal;
