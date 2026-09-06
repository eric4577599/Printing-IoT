import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '../modules/language/LanguageContext';
import { resolveDragReorder } from '../utils/scheduleDnd';
import BoxDiagram from '../components/common/BoxDiagram';
import ProductFormModal from '../components/modals/ProductFormModal';
import ProductDetailModal from '../components/modals/ProductDetailModal';
import AddScheduleModal from '../modules/maintenance/AddScheduleModal';
import styles from './Schedule.module.css';

/**
 * 可拖拉的排程列。
 * - 執行中訂單(index 0)鎖定:disabled 且不掛拖拉 listener,僅可點選檢視。
 * - 其餘列掛上 dnd-kit 的 attributes/listeners,支援滑鼠拖拉與鍵盤(Tab 聚焦 + 空白鍵抓取 + 方向鍵)。
 * @param {Object} order 訂單資料
 * @param {number} index 於陣列中的位置(0 為執行中)
 * @param {boolean} isSelected 是否為目前選取列
 * @param {Function} onSelect (order, index) 點選回呼
 */
const SortableOrderRow = ({ order, index, isSelected, onSelect }) => {
    const isRunning = index === 0;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: order.id, disabled: isRunning });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        cursor: isRunning ? 'default' : 'grab',
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            onClick={() => onSelect(order, index)}
            className={`${isSelected ? styles.selectedRow : ''} ${isRunning ? styles.runningRow : ''}`}
            {...(isRunning ? {} : attributes)}
            {...(isRunning ? {} : listeners)}
        >
            <td style={{ fontWeight: isRunning ? 'bold' : 'normal', color: isRunning ? '#2e7d32' : 'inherit' }}>
                {order.seqNo || (index + 1) * 10}
            </td>
            <td>{order.customer}</td>
            <td>{order.orderNo}</td>
            <td>{order.boxNo}</td>
            <td>{order.qty}</td>
            <td>{order.msg || order.productName}</td>
            <td>{order.boxType}</td>
        </tr>
    );
};

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

    // 產品庫搜尋狀態(修正:原搜尋框與 boxNo/customer radio 皆未實作)
    const [productSearch, setProductSearch] = useState('');
    const [productSearchType, setProductSearchType] = useState('boxNo'); // 'boxNo' | 'customer'

    // --- Graphic Linking Logic ---
    const [lastClickedSection, setLastClickedSection] = useState('none'); // 'schedule', 'product'

    // Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false); // [新增] 排程 Modal 狀態
    const [pendingProduct, setPendingProduct] = useState(null); // [新增] 待新增的產品
    const [modalMode, setModalMode] = useState('add_product');
    const [editingProduct, setEditingProduct] = useState(null);
    const [detailProduct, setDetailProduct] = useState(null); // 點選產品列時顯示的唯讀詳情

    // 拖拉感測器:PointerSensor 設 5px 啟動門檻,讓「點選檢視」與「拖拉排序」不衝突
    // (小於門檻視為點擊 → 觸發 onClick 選取;超過才進入拖拉);KeyboardSensor 保留無滑鼠可操作性。
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    /**
     * 拖拉放開:依商規解析來源/目標索引,允許時 splice 搬移並重新編號 seqNo。
     * 執行中訂單(index 0)鎖定由 resolveDragReorder 一併擋下(來源或目標為 0 皆忽略)。
     */
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;
        const { allowed, oldIndex, newIndex } = resolveDragReorder(orders, active.id, over.id);
        if (!allowed) return;
        moveOrder(oldIndex, newIndex);   // splice 搬移(MainLayout)
        reorderOrders();                 // 重新編號 seqNo 10,20,30…
        addLog(`Reordered Order ${active.id} to position ${newIndex + 1}`);
    };

    // --- Schedule Controls (Left) ---
    const handleMoveOrder = (direction) => {
        if (!selectedScheduleId) return;
        const idx = orders.findIndex(o => o.id === selectedScheduleId);

        if (idx === 0) {
            alert(t('modalExt.ordersAlert.cannotMoveRunning'));
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
                alert(t('modalExt.ordersAlert.cannotDeleteSpeedNotZero').replace('{speed}', Math.floor(lineSpeed)));
                return;
            }

            if (remainingQty > 0) {
                alert(t('modalExt.ordersAlert.cannotDeleteQtyRemaining').replace('{qty}', remainingQty));
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

    // 產品庫重新載入(修正:原 🔄 按鈕無 onClick)。由 localStorage 重新同步產品清單並清除搜尋與選取。
    const handleReloadProducts = () => {
        try {
            const saved = localStorage.getItem('products');
            if (saved) setProducts(JSON.parse(saved));
        } catch (e) {
            console.error('Failed to reload products', e);
        }
        setProductSearch('');
        setSelectedProductIndex(null);
        addLog('Product library reloaded');
    };

    // 依搜尋條件過濾產品(保留原始 index 供選取/刪除正確對應 products 陣列)
    const filteredProductEntries = products
        .map((prod, i) => ({ prod, i }))
        .filter(({ prod }) => {
            const q = productSearch.trim().toLowerCase();
            if (!q) return true;
            const field = productSearchType === 'customer' ? prod.customer : prod.boxNo;
            return String(field || '').toLowerCase().includes(q);
        });

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

                {/* Middle: Schedule Table(支援拖拉排序;執行中訂單鎖定) */}
                <div className={styles.scheduleTableContainer}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                            <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                                <tbody>
                                    {orders.map((order, index) => (
                                        <SortableOrderRow
                                            key={order.id}
                                            order={order}
                                            index={index}
                                            isSelected={selectedScheduleId === order.id}
                                            onSelect={(o, i) => {
                                                setSelectedScheduleId(o.id);
                                                setLastClickedSection('schedule');
                                                if (i === 0) {
                                                    addLog(`Viewing Running Order: ${o.orderNo}`);
                                                }
                                            }}
                                        />
                                    ))}
                                </tbody>
                            </SortableContext>
                        </table>
                    </DndContext>
                </div>

                {/* Bottom: Box Diagram */}
                <div className={styles.diagramArea} style={!selectedScheduleId ? { backgroundColor: '#e3f2fd', border: 'none' } : {}}>
                    {selectedScheduleId ? (
                        <BoxDiagram data={orders.find(o => o.id === selectedScheduleId) || {}} />
                    ) : (
                        <div style={{ color: '#1976d2', fontSize: '1rem', fontWeight: 'bold', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                            <div>{t('modalExt.ordersAlert.selectToShowDiagram')}</div>
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
                                    <input type="radio" name="searchType" checked={productSearchType === 'boxNo'} onChange={() => setProductSearchType('boxNo')} style={{ marginRight: '4px' }} /> {t('dashboard.schedule.boxNo')}
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    <input type="radio" name="searchType" checked={productSearchType === 'customer'} onChange={() => setProductSearchType('customer')} style={{ marginRight: '4px' }} /> {t('dashboard.schedule.customer')}
                                </label>
                            </div>

                            {/* Refresh Icon */}
                            <button onClick={handleReloadProducts} className={styles.iconBtn} title="Reload" style={{ fontSize: '1.2rem', padding: '0 5px' }}>🔄</button>

                            {/* Spacer */}
                            <div style={{ flex: 1 }}></div>

                            {/* Product Buttons */}
                            <button onClick={handleEditProduct} className={styles.blueBtn} style={{ minWidth: '70px' }}>{t('orders.products.edit')}</button>
                            <button onClick={handleAddProduct} className={styles.blueBtn} style={{ minWidth: '70px' }}>{t('ui.buttons.add')}</button>
                        </div>

                        {/* Row 2: Search & Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input className={styles.searchInput} placeholder={t('ui.buttons.search')} value={productSearch} onChange={(e) => setProductSearch(e.target.value)} style={{ flex: 1, height: '30px' }} />
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
                            {filteredProductEntries.map(({ prod, i }) => (
                                <tr key={prod.id || `product-${i}`}
                                    onClick={() => {
                                        setSelectedProductIndex(i);
                                        setLastClickedSection('product');
                                        setDetailProduct(prod); // 點選即彈出規格詳情與圖面
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

                <ProductDetailModal
                    isOpen={detailProduct !== null}
                    onClose={() => setDetailProduct(null)}
                    product={detailProduct}
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
