import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLanguage } from '../modules/language/LanguageContext';
import BoxDiagram from '../components/common/BoxDiagram';
import ProductFormModal from '../components/modals/ProductFormModal';
import AddScheduleModal from '../modules/maintenance/AddScheduleModal';
import styles from './Schedule.module.css';

const Schedule = () => {
    const { t } = useLanguage();
    const {
        orders,
        products,       // Shared
        setProducts,    // Shared (via context setters if needed)
        saveProduct,    // Shared Helper
        deleteProduct,  // Shared Helper
        moveOrder,
        deleteOrder,
        saveOrder, // Used for 'Add to Schedule'
        reorderOrders,
        addLog,
        currentMonitorData  // 即時監控資料（車速、生產量）
    } = useOutletContext();

    const [selectedScheduleId, setSelectedScheduleId] = useState(null);
    const [selectedProductIndex, setSelectedProductIndex] = useState(null);

    // --- Graphic Linking Logic ---
    const [lastClickedSection, setLastClickedSection] = useState('none'); // 'schedule', 'product'

    // Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false); // [新增] 排程 Modal 狀態
    const [pendingProduct, setPendingProduct] = useState(null); // [新增] 待新增的產品
    const [modalMode, setModalMode] = useState('add_product');
    const [editingProduct, setEditingProduct] = useState(null);

    // --- Schedule Controls (Left) ---
    const handleMoveOrder = (direction) => {
        if (!selectedScheduleId) return;
        const idx = orders.findIndex(o => o.id === selectedScheduleId);

        if (idx === 0) {
            alert('無法移動正在生產中的工單 (Cannot move Running Order)!');
            return;
        }

        let targetIndex = -1;
        if (direction === 'up' && idx > 1) targetIndex = idx - 1;
        if (direction === 'down' && idx < orders.length - 1) targetIndex = idx + 1;

        if (targetIndex !== -1) {
            moveOrder(idx, targetIndex);
            addLog(`Moved Order ${selectedScheduleId} ${direction}`);
        } else {
            addLog(`Cannot move Order ${selectedScheduleId} ${direction}`);
        }
    };

    /**
     * 刪除排程
     * - Running 工單（第一筆）：需額外確認（提醒用戶在即時監控頁面確認車速和生產量為0）
     * - 其他工單：直接確認刪除
     */
    const handleDeleteSchedule = () => {
        if (!selectedScheduleId) {
            alert(t('orders.alerts.selectOrder'));
            return;
        }

        const idx = orders.findIndex(o => o.id === selectedScheduleId);
        const order = orders[idx];

        if (idx === 0) {
            // Running 工單：自動檢查車速和生產量
            const lineSpeed = currentMonitorData?.lineSpeed || 0;
            const currentQty = currentMonitorData?.currentQty || 0;
            const orderQty = order.qty || 0;
            const remainingQty = orderQty - currentQty;

            if (lineSpeed > 0) {
                alert(`❌ 無法刪除：車速不為 0\n當前車速: ${Math.floor(lineSpeed)} m/min\n\n請先停止生產後再試。`);
                return;
            }

            if (remainingQty > 0) {
                alert(`❌ 無法刪除：未生產量不為 0\n剩餘數量: ${remainingQty} 張\n\n請完成生產後再試。`);
                return;
            }

            // 車速為 0 且未生產量為 0，可以刪除
            if (confirm(`${t('orders.alerts.confirmDeleteRunning')} ${order.orderNo}?`)) {
                deleteOrder(selectedScheduleId);
                setSelectedScheduleId(null);
                addLog(`Deleted Running Order: ${order.orderNo}`);
            }
        } else {
            // 其他工單：直接確認刪除
            if (confirm(`${t('orders.alerts.confirmDelete')} ${order.orderNo}?`)) {
                deleteOrder(selectedScheduleId);
                setSelectedScheduleId(null);
                addLog(`Deleted Order: ${order.orderNo}`);
            }
        }
    };

    const handleReorderSchedule = () => {
        if (confirm(t('orders.alerts.confirmReorder'))) {
            reorderOrders();
        }
    };

    // --- Product Library Handlers ---
    const handleAddProduct = () => {
        setModalMode('add_product');
        setEditingProduct(null);
        setShowProductModal(true);
    };

    const handleEditProduct = () => {
        if (selectedProductIndex === null) {
            alert(t('orders.alerts.selectOrder'));
            return;
        }
        setModalMode('edit_product');
        setEditingProduct(products[selectedProductIndex]);
        setShowProductModal(true);
    };

    const handleDeleteProduct = () => {
        if (selectedProductIndex === null) return;
        if (confirm(`${t('orders.products.delete')} (${products[selectedProductIndex].boxNo})?`)) {
            deleteProduct(selectedProductIndex);
            setSelectedProductIndex(null);
        }
    };

    const handleModalSave = (formData) => {
        saveProduct(formData);
        setShowProductModal(false);
    };

    /**
     * 新增排程 - 彈出 Modal 讓使用者輸入訂單參數
     */
    const handleAddToSchedule = () => {
        if (selectedProductIndex === null) {
            alert(t('orders.alerts.selectOrder'));
            return;
        }
        const product = products[selectedProductIndex];
        setPendingProduct(product);
        setShowScheduleModal(true);
    };

    /**
     * 排程 Modal 儲存回呼
     * @param {Object} scheduleData - Modal 表單資料 (orderNo, qty, seqNo, isOptimized)
     */
    const handleScheduleSave = (scheduleData) => {
        if (!pendingProduct) return;

        const calculatedBundles = Math.ceil(Number(scheduleData.qty) / 100);

        saveOrder({
            ...pendingProduct,
            orderNo: scheduleData.orderNo,
            bundleCount: calculatedBundles,
            qty: scheduleData.qty,
            seqNo: scheduleData.seqNo,
            isOptimized: scheduleData.isOptimized
        }, false, null);

        addLog(`Added ${pendingProduct.boxNo} (Order: ${scheduleData.orderNo}) to Schedule`);
        setShowScheduleModal(false);
        setPendingProduct(null);
    };

    return (
        <div className={styles.container}>
            {/* LEFT COLUMN */}
            <div className={styles.leftColumn}>
                {/* Top: Buttons */}
                <div className={styles.toolbar}>
                    <button onClick={() => handleMoveOrder('up')}>{t('orders.schedule.moveUp')}</button>
                    <button onClick={() => handleMoveOrder('down')}>{t('orders.schedule.moveDown')}</button>
                    <button onClick={handleReorderSchedule}>{t('orders.schedule.reorder')}</button>
                </div>

                {/* Middle: Schedule Table */}
                <div className={styles.scheduleTableContainer}>
                    <table className={styles.scheduleTable}>
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>{t('dashboard.schedule.seqNo')}</th>
                                <th>{t('dashboard.schedule.customer')}</th>
                                <th>{t('dashboard.schedule.orderNo')}</th>
                                <th>{t('dashboard.schedule.boxNo')}</th>
                                <th style={{ width: '60px' }}>{t('dashboard.schedule.qty')}</th>
                                <th>{t('dashboard.schedule.productName')}</th>
                                <th style={{ width: '80px' }}>{t('dashboard.schedule.boxType')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, index) => (
                                <tr key={order.id}
                                    onClick={() => {
                                        setSelectedScheduleId(order.id);
                                        setLastClickedSection('schedule');
                                        if (index === 0) {
                                            addLog(`Viewing Running Order: ${order.orderNo}`);
                                        }
                                    }}
                                    className={`${selectedScheduleId === order.id ? styles.selectedRow : ''} ${index === 0 ? styles.runningRow : ''}`}
                                >
                                    <td style={{ fontWeight: index === 0 ? 'bold' : 'normal', color: index === 0 ? '#2e7d32' : 'inherit' }}>
                                        {order.seqNo || (index + 1) * 10}
                                    </td>
                                    <td>{order.customer}</td>
                                    <td>{order.orderNo}</td>
                                    <td>{order.boxNo}</td>
                                    <td>{order.qty}</td>
                                    <td>{order.msg || order.productName}</td>
                                    <td>{order.boxType}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Bottom: Box Diagram */}
                <div className={styles.diagramArea} style={!selectedScheduleId ? { backgroundColor: '#e3f2fd', border: 'none' } : {}}>
                    {selectedScheduleId ? (
                        <BoxDiagram data={orders.find(o => o.id === selectedScheduleId) || {}} />
                    ) : (
                        <div style={{ color: '#1976d2', fontSize: '1rem', fontWeight: 'bold', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                            <div>請選取左側排程以顯示紙箱展開圖</div>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Select an order from the left to display box diagram</div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN - Aligned with Flexo IoT */}
            <div className={styles.rightColumn}>
                {/* Unified Blue Toolbar */}
                <div className={styles.toolbarRight}>
                    {/* Col 1: Schedule Ops */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '120px', marginRight: '5px' }}>
                        <button onClick={handleAddToSchedule} className={styles.brightGreenBtn} style={{ flex: 1, width: '100%', borderRadius: '4px' }}>{t('orders.schedule.addToSchedule')}</button>
                        <button onClick={handleDeleteSchedule} className={styles.redBtn} style={{ flex: 1, width: '100%', borderRadius: '4px', border: '1px solid #c62828' }}>{t('orders.schedule.delete')}</button>
                    </div>

                    {/* Col 2: Product Ops */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {/* Row 1: Filters & Product Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {/* Radios */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '0.9rem', marginRight: '5px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    <input type="radio" name="searchType" defaultChecked style={{ marginRight: '4px' }} /> {t('dashboard.schedule.boxNo')}
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    <input type="radio" name="searchType" style={{ marginRight: '4px' }} /> {t('dashboard.schedule.customer')}
                                </label>
                            </div>

                            {/* Refresh Icon */}
                            <button className={styles.iconBtn} title="Reload" style={{ fontSize: '1.2rem', padding: '0 5px' }}>🔄</button>

                            {/* Spacer */}
                            <div style={{ flex: 1 }}></div>

                            {/* Product Buttons */}
                            <button onClick={handleEditProduct} className={styles.blueBtn} style={{ minWidth: '70px' }}>{t('orders.products.edit')}</button>
                            <button onClick={handleAddProduct} className={styles.blueBtn} style={{ minWidth: '70px' }}>{t('ui.buttons.add')}</button>
                        </div>

                        {/* Row 2: Search & Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input className={styles.searchInput} placeholder={t('ui.buttons.search')} style={{ flex: 1, height: '30px' }} />
                            <button onClick={handleDeleteProduct} className={styles.redBtn} style={{ minWidth: '70px', height: '30px' }}>{t('ui.buttons.delete')}</button>
                        </div>
                    </div>
                </div>

                {/* Product List */}
                <div className={styles.productTableContainer}>
                    <table className={styles.productTable}>
                        <thead>
                            <tr>
                                <th>{t('dashboard.schedule.boxNo')}</th>
                                <th>{t('dashboard.schedule.customer')}</th>
                                <th>{t('dashboard.schedule.productName')}</th>
                                <th>{t('dashboard.schedule.boxType')}</th>
                                <th style={{ width: '30px' }}>{t('settings.unit.flute_single')}</th>
                                <th style={{ width: '40px' }}>{t('settings.unit.thickness')}</th>
                                <th style={{ width: '40px' }}>{t('dashboard.schedule.sheets')}</th>
                                <th>{t('modals.finishOrder.notes')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((prod, i) => (
                                <tr key={prod.id || `product-${i}`}
                                    onClick={() => {
                                        setSelectedProductIndex(i);
                                        setLastClickedSection('product');
                                    }}
                                    className={selectedProductIndex === i ? styles.selectedProductRow : ''}
                                >
                                    <td>{prod.boxNo}</td>
                                    <td>{prod.customer}</td>
                                    <td>{prod.productName}</td>
                                    <td>{prod.boxType}</td>
                                    <td>{prod.flute}</td>
                                    <td>{prod.thickness}</td>
                                    <td>{prod.bundleCount}</td>
                                    <td>{prod.remarks}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <ProductFormModal
                    isOpen={showProductModal}
                    onClose={() => setShowProductModal(false)}
                    onSave={handleModalSave}
                    initialData={editingProduct}
                />

                <AddScheduleModal
                    isOpen={showScheduleModal}
                    onClose={() => setShowScheduleModal(false)}
                    onSave={handleScheduleSave}
                    product={pendingProduct}
                    orders={orders}
                />
            </div>
        </div>
    );
};

export default Schedule;
