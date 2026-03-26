import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import BoxDiagram from '../../components/common/BoxDiagram';
import ProductFormModal from '../../components/modals/ProductFormModal';
import AddScheduleModal from './AddScheduleModal';
import styles from './MaintenancePage.module.css';

const MaintenancePage = () => {
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

    const getDisplayData = () => {
        if (lastClickedSection === 'schedule' && selectedScheduleId) {
            return orders.find(o => o.id === selectedScheduleId) || {};
        }
        if (lastClickedSection === 'product' && selectedProductIndex !== null) {
            return products[selectedProductIndex] || {};
        }
        return {};
    };

    const displayData = getDisplayData();

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
            alert('請先選擇要刪除的排程 (Please select an order first)');
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
            if (confirm(`✅ 車速為 0，未生產量為 0\n確認刪除生產中工單 ${order.orderNo}?`)) {
                deleteOrder(selectedScheduleId);
                setSelectedScheduleId(null);
                addLog(`Deleted Running Order: ${order.orderNo}`);
            }
        } else {
            // 其他工單：直接確認刪除
            if (confirm(`確認刪除排程 ${order.orderNo}?`)) {
                deleteOrder(selectedScheduleId);
                setSelectedScheduleId(null);
                addLog(`Deleted Order: ${order.orderNo}`);
            }
        }
    };

    const handleReorderSchedule = () => {
        if (confirm('是否重新整理序號? (Renumber 10, 20, 30...)')) {
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
            alert('請先選擇產品 (Select a product to edit)');
            return;
        }
        setModalMode('edit_product');
        setEditingProduct(products[selectedProductIndex]);
        setShowProductModal(true);
    };

    const handleDeleteProduct = () => {
        if (selectedProductIndex === null) return;
        if (confirm('確認刪除此產品資料? (Delete from Library)')) {
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
     * 修正：原本直接呼叫 saveOrder，現改為先彈出 Modal 取得使用者輸入
     */
    const handleAddToSchedule = () => {
        if (selectedProductIndex === null) {
            alert('請先選擇右側產品 (Select a product from the right)');
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
                    <button onClick={() => handleMoveOrder('up')}>上移</button>
                    <button onClick={() => handleMoveOrder('down')}>下移</button>
                    <button onClick={handleReorderSchedule}>順序重整</button>
                </div>

                {/* Middle: Schedule Table */}
                <div className={styles.scheduleTableContainer}>
                    <table className={styles.scheduleTable}>
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>序號</th>
                                <th>客戶名稱</th>
                                <th>訂單號碼</th>
                                <th>紙箱編號</th>
                                <th style={{ width: '60px' }}>數量</th>
                                <th>品名</th>
                                <th style={{ width: '80px' }}>盒型</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, index) => (
                                <tr key={order.id}
                                    onClick={() => {
                                        // 允許選取任何列以顯示 BoxDiagram（包括第一列/生產中工單）
                                        // 移動和刪除操作的保護邏輯在各自的 handler 中處理
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

                {/* Bottom: Box Diagram - 修正：只根據 selectedScheduleId 顯示，不受 lastClickedSection 影響 */}
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

            {/* RIGHT COLUMN */}
            <div className={styles.rightColumn}>
                {/* Top: Controls */}
                {/* Top: Controls */}
                <div className={styles.toolbarRight} style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                    {/* Col 1: Schedule Ops */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '120px', marginRight: '5px' }}>
                        <button onClick={handleAddToSchedule} className={styles.brightGreenBtn} style={{ flex: 1, width: '100%', borderRadius: '4px' }}>新增排程</button>
                        <button onClick={handleDeleteSchedule} className={styles.redBtn} style={{ flex: 1, width: '100%', borderRadius: '4px', border: '1px solid #c62828' }}>刪除排程</button>
                    </div>

                    {/* Col 2: Product Ops */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {/* Row 1: Filters & Product Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {/* Radios */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '0.9rem', marginRight: '5px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    <input type="radio" name="searchType" defaultChecked style={{ marginRight: '4px' }} /> 紙箱編號
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    <input type="radio" name="searchType" style={{ marginRight: '4px' }} /> 客戶名稱
                                </label>
                            </div>

                            {/* Refresh Icon */}
                            <button className={styles.iconBtn} title="Reload" style={{ fontSize: '1.2rem', padding: '0 5px' }}>🔄</button>

                            {/* Spacer */}
                            <div style={{ flex: 1 }}></div>

                            {/* Product Buttons */}
                            <button onClick={handleEditProduct} className={styles.darkGreenBtn} style={{ minWidth: '70px' }}>修改</button>
                            <button onClick={handleAddProduct} className={styles.darkGreenBtn} style={{ minWidth: '70px' }}>新增</button>
                        </div>

                        {/* Row 2: Search & Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input className={styles.searchInput} placeholder="" style={{ flex: 1, height: '30px' }} />
                            <button onClick={handleDeleteProduct} className={styles.redBtn} style={{ minWidth: '70px', height: '30px' }}>刪除</button>
                        </div>
                    </div>
                </div>

                {/* Product List */}
                <div className={styles.productTableContainer}>
                    <table className={styles.productTable}>
                        <thead>
                            <tr>
                                <th>紙箱編號</th>
                                <th>客戶名稱</th>
                                <th>品名</th>
                                <th>盒型</th>
                                <th style={{ width: '30px' }}>楞</th>
                                <th style={{ width: '40px' }}>厚度</th>
                                <th style={{ width: '40px' }}>張摺數</th>
                                <th>備註</th>
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
    );
};

export default MaintenancePage;
