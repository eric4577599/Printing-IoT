import React from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from './OrderDetailsModal.module.css';
import BoxDiagram from '../common/BoxDiagram';

/**
 * ProductDetailModal - 產品規格詳情視窗(唯讀)
 *
 * 於排程管理頁點選產品庫任一列時彈出,完整顯示該產品的
 * 基本資料、尺寸與紙箱展開圖、機械參數與印刷部設定。
 * 與 OrderDetailsModal(F7,可編輯、只影響當前訂單)不同,
 * 本視窗純檢視、不提供任何修改。
 *
 * @param {boolean} isOpen - 是否開啟
 * @param {function} onClose - 關閉回呼
 * @param {object} product - 產品庫資料(ProductFormModal 同構欄位)
 * @returns {JSX.Element|null} 唯讀詳情視窗;未開啟或無資料時回傳 null
 */
const ProductDetailModal = ({ isOpen, onClose, product }) => {
    const { t } = useLanguage();

    if (!isOpen || !product) return null;

    const data = product;

    // 機械參數列定義:[PX 標籤, PX 欄位, 間隙標籤(i18n), 間隙欄位](標籤沿用 OrderDetailsModal 慣例)
    const pxRows = [
        ['PX1', 'px1', t('modalExt.params.gapFeedFront'), 'gapFeedFront'],
        ['PX2', 'px2', t('modalExt.params.gapFeedProg'), 'gapFeedProg'],
        ['PX3', 'px3', t('modalExt.params.gapFeedRubber'), 'gapFeedRubber'],
        ['PX4', 'px4', t('modalExt.params.gapFormFront'), 'gapFormFront'],
        ['PX5', 'px5', t('modalExt.params.dieCutPhase'), 'dieCutPhase'],
        ['', null, t('modalExt.params.dieCutFeedGap'), 'dieCutFeedGap'],
        ['', null, t('modalExt.params.slotGuide'), 'slotGuide'],
        ['', null, t('modalExt.params.slotFront'), 'slotFront'],
        ['', null, t('modalExt.params.slotAux'), 'slotAux'],
        ['', null, t('modalExt.params.midKnife'), 'midKnife'],
    ];

    return ReactDOM.createPortal(
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <span>{t('modals.productDetail.title')} — {data.boxNo || ''}</span>
                    <div className={styles.winControls}>
                        <button onClick={onClose} className={styles.closeBtn}>×</button>
                    </div>
                </div>

                <div className={styles.content}>
                    {/* 基本資料 */}
                    <div className={styles.formRow}>
                        <label>{t('dashboard.schedule.boxNo')}</label>
                        <input type="text" value={data.boxNo || ''} readOnly style={{ width: '220px' }} />
                        <label>{t('dashboard.schedule.customer')}</label>
                        <input type="text" value={data.customer || ''} readOnly style={{ flex: 1 }} />
                    </div>

                    <div className={styles.formRow}>
                        <label>{t('dashboard.schedule.productName')}</label>
                        <input type="text" value={data.productName || ''} readOnly style={{ flex: 1 }} />
                        <label>{t('dashboard.schedule.boxType')}</label>
                        <input type="text" value={data.boxType || ''} readOnly style={{ width: '100px' }} />
                    </div>

                    <div className={styles.formRow}>
                        <label>{t('settings.unit.flute')}</label>
                        <input type="text" value={data.flute || ''} readOnly style={{ width: '80px', marginRight: '20px' }} />
                        <label>{t('settings.unit.thickness')}</label>
                        <input type="text" value={data.thickness ?? ''} readOnly style={{ width: '80px', marginRight: '20px' }} />
                        <label>{t('dashboard.schedule.sheets')}</label>
                        <input type="text" value={data.bundleCount ?? ''} readOnly style={{ width: '80px' }} />
                    </div>

                    <div className={styles.formRow}>
                        <label>{t('dashboard.schedule.notes')}</label>
                        <textarea rows="2" style={{ flex: 1, resize: 'none' }} value={data.remarks || ''} readOnly></textarea>
                    </div>

                    {/* 主分割區:左圖面、右機械參數 */}
                    <div className={styles.mainSplit}>
                        <div className={styles.diagramPanel}>
                            <BoxDiagram data={data} />
                        </div>

                        <div className={styles.paramPanel}>
                            <div className={styles.pxGrid}>
                                {pxRows.map(([pxLabel, pxField, gapLabel, gapField]) => (
                                    <div className={styles.pxRow} key={gapField}>
                                        <span>{pxLabel}</span>
                                        {pxField
                                            ? <input type="number" value={data[pxField] || 0} readOnly />
                                            : <span></span>}
                                        <span>{gapLabel}</span>
                                        <input type="number" value={data[gapField] || 0} readOnly />
                                    </div>
                                ))}
                            </div>

                            {/* 印刷部 */}
                            <div className={styles.printSection}>
                                <div>{t('modalExt.params.printSection')}</div>
                                <table className={styles.printTable}>
                                    <thead>
                                        <tr><th></th><th>{t('modalExt.params.press')}</th><th>{t('modalExt.params.pos')}</th><th>{t('modalExt.params.beltGap')}</th><th>{t('modalExt.params.plateGap')}</th></tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3, 4].map(i => {
                                            const u = (data.printUnits && data.printUnits[i - 1]) || { ink: 0, pos: 0, gap: 0, press: 0 };
                                            return (
                                                <tr key={i}>
                                                    <td>{[t('modalExt.params.unit1'), t('modalExt.params.unit2'), t('modalExt.params.unit3'), t('modalExt.params.unit4')][i - 1]}</td>
                                                    <td><input type="number" value={u.ink ?? 0} readOnly /></td>
                                                    <td><input type="number" value={u.pos ?? 0} readOnly /></td>
                                                    <td><input type="number" value={u.gap ?? 0} readOnly /></td>
                                                    <td><input type="number" value={u.press ?? 0} readOnly /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={styles.footerBtns}>
                        <button onClick={onClose}>{t('modals.orderDetails.close')}</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProductDetailModal;
