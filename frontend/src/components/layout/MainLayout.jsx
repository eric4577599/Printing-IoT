import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import styles from './MainLayout.module.css';
import { updateSimulationSpeed, getOrders as apiGetOrders, syncSchedule as apiSyncSchedule } from '../../services/api';
import { fromBackendOrder, toBackendOrder, sortBySequence, isGuid } from '../../utils/orderMapper';

// 空排程時的等待列(純 UI,id 固定 'placeholder',不上傳後端)
const PLACEHOLDER_ORDER = {
    id: 'placeholder',
    boxNo: 'WAITING',
    msg: '等待派工 (Waiting)',
    orderNo: '-',
    qty: 0,
    eta: '-',
    status: 'Idle',
};

// 產生後端可 upsert 的 GUID 訂單 id(全量鏡像同步以 GUID 為身分真相)
const genOrderId = () =>
    (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 6)}`;

import DebugPanel from '../debug/DebugPanel';
import { useLanguage } from '../../modules/language/LanguageContext';
import LanguageSwitcher from '../../modules/language/LanguageSwitcher';
import LanguageNavMenu from '../../modules/language/LanguageNavMenu';
import { useAuth } from '../../modules/auth/AuthContext';
import LoginModal from '../../modules/auth/LoginModal';
import HelpModal from '../modals/HelpModal';
import { createSeedProducts } from '../../data/seedProducts';
import { spliceMove, renumberSeq } from '../../utils/scheduleDnd';

const MainLayout = () => {
    const location = useLocation();
    const { t } = useLanguage();
    const { user, logout } = useAuth();

    // Default Admin Debug Mode = true
    const [debugMode, setDebugMode] = React.useState(true);
    const [isSimulating, setIsSimulating] = React.useState(false);
    const [simulationMode, setSimulationMode] = React.useState('remote'); // 'local' | 'remote'
    const [isMotorOn, setIsMotorOn] = React.useState(true);
    const [speedFactor, setSpeedFactor] = React.useState(0); // -1 (停止) ~ 0 (標準) ~ 1 (極速)
    const [logs, setLogs] = React.useState([]);
    const [showLoginModal, setShowLoginModal] = useState(false);

    const [showHelpModal, setShowHelpModal] = useState(false);
    const [activeKey, setActiveKey] = useState(null); // 用於鍵盤視覺回饋

    // Listen for keyboard events for visual feedback
    useEffect(() => {
        const handleKeyDown = (e) => setActiveKey(e.key);
        const handleKeyUp = () => setActiveKey(null);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // PLC Connection State
    const [isPlcConnected, setIsPlcConnected] = useState(true);

    // PLC Simulation Config State
    const [plcSimulateEnabled, setPlcSimulateEnabled] = useState(false);

    // ERP Status State (Read from localStorage, synced via event)
    const [erpStatus, setErpStatus] = useState('connected');

    useEffect(() => {
        const loadSettings = () => {
            try {
                const saved = localStorage.getItem('communicationSettings');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Update ERP Status
                    setErpStatus(parsed.erp?.connectionType === 'none' ? 'disabled' : 'connected');

                    // Update PLC Simulation Status
                    const simEnabled = parsed.plc?.simulate || false;
                    setPlcSimulateEnabled(simEnabled);

                    // Force Simulation OFF if setting is disabled
                    if (!simEnabled) {
                        setIsSimulating(false);
                    }
                }
            } catch (e) { }
        };

        // Initial Load
        loadSettings();

        const handleCommUpdate = () => {
            loadSettings();
        };
        // Listen for custom event from SettingsPage
        window.addEventListener('comm-settings-changed', handleCommUpdate);
        return () => window.removeEventListener('comm-settings-changed', handleCommUpdate);
    }, []);

    const togglePlcConnection = () => {
        setIsPlcConnected(prev => {
            const newState = !prev;
            if (!newState) {
                // Disconnected Logic (Motor Off)
                setIsMotorOn(false);
                setSpeedFactor(-1); // Stop
                addLog('⚠️ PLC Connection Lost (Simulated)');
            } else {
                addLog('✅ PLC Connection Established (Simulated)');
            }
            return newState;
        });
    };

    const simulatePlcCount = () => {
        if (!isPlcConnected) return;
        // Logic handled in Dashboard via event or shared state if needed
        // For now just log it, or we dispatch a custom event
        window.dispatchEvent(new CustomEvent('plc-count-signal'));
        addLog('PLC Count Signal Received (+1)');
    };

    // 共享的即時監控資料 (用於 Schedule 頁面刪除判斷)
    const [currentMonitorData, setCurrentMonitorData] = React.useState({
        lineSpeed: 0,
        currentQty: 0,
        resetOffset: 0
    });

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        setLogs(prev => [{ time, message: msg }, ...prev].slice(0, 50));
    };

    // Shared Schedule Data
    const [orders, setOrders] = useState(() => {
        try {
            const saved = localStorage.getItem('orders');
            let initialOrders = saved ? JSON.parse(saved) : [];

            // Ensure placeholder exists if no orders or if first order is not placeholder equivalent
            // Requirement: "Default no order running on login"
            // If the first order is NOT a placeholder, we should probably insert one or rely on user to manage?
            // User requirement: "When logging in, default NO order is running".
            // So we should force a placeholder at index 0 if it's not "Running".
            // But if we reload page, we might want to keep state.
            // Let's ensure that if the list is empty, we add a placeholder.
            // If list has items, we assume state is preserved (or we could force pause).

            if (initialOrders.length === 0) {
                initialOrders = [{
                    id: 'placeholder',
                    boxNo: 'WAITING',
                    msg: '等待派工 (Waiting)',
                    orderNo: '-',
                    qty: 0,
                    eta: '-',
                    status: 'Idle'
                }];
            }
            return initialOrders;
        } catch (e) {
            console.error("Failed to load orders", e);
            return [{
                id: 'placeholder',
                boxNo: 'WAITING',
                msg: '等待派工 (Waiting)',
                orderNo: '-',
                qty: 0,
                eta: '-',
                status: 'Idle'
            }];
        }
    });

    useEffect(() => {
        localStorage.setItem('orders', JSON.stringify(orders));
    }, [orders]);

    // ── Phase 2:全量鏡像同步(後端 Orders 表為跨 session 持久化真相)──────────────
    // orders 最新值的 ref(供 mount 載入時讀當前 localStorage 訂單而不建立相依)
    const ordersRef = useRef(orders);
    useEffect(() => { ordersRef.current = orders; }, [orders]);

    // 是否已完成首次「從後端載入」;完成前不觸發鏡像同步,避免用 localStorage 初值覆寫後端
    const [ordersLoaded, setOrdersLoaded] = useState(false);

    // 開頁載入:GET 後端 → 還原(含 SpecJson 規格)→ 依 Sequence 排序;
    // 後端為空則「首次匯入」現有 localStorage 訂單(排除 placeholder,補 GUID)。
    // 後端無法連線時保留 localStorage 初值(離線容錯)。
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const be = await apiGetOrders();
                if (cancelled) return;
                const mapped = sortBySequence((be || []).map(fromBackendOrder));
                if (mapped.length > 0) {
                    setOrders(mapped);
                } else {
                    const local = (ordersRef.current || []).filter(o => o.id !== 'placeholder');
                    if (local.length > 0) {
                        const withGuids = local.map(o => ({ ...o, id: isGuid(o.id) ? o.id : genOrderId() }));
                        const payload = withGuids.map((o, i) => toBackendOrder(o, i));
                        const synced = await apiSyncSchedule(payload);
                        if (cancelled) return;
                        const remapped = sortBySequence((synced || []).map(fromBackendOrder));
                        setOrders(remapped.length ? remapped : [PLACEHOLDER_ORDER]);
                    }
                    // 後端空且本地也空 → 維持 placeholder 初值
                }
            } catch (e) {
                console.warn('[orders] 後端載入失敗,改用 localStorage 離線初值', e);
            } finally {
                if (!cancelled) setOrdersLoaded(true);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 身分正規化:確保每筆非 placeholder 訂單都有 GUID id(任何程式路徑新增的訂單皆納入),
    // 讓鏡像同步能穩定 upsert 而非重複新建。
    useEffect(() => {
        if (!ordersLoaded) return;
        let changed = false;
        const normalized = orders.map(o => {
            if (o.id !== 'placeholder' && !isGuid(o.id)) { changed = true; return { ...o, id: genOrderId() }; }
            return o;
        });
        if (changed) setOrders(normalized);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders, ordersLoaded]);

    // debounced 鏡像同步:orders 任何變動(拖拉、完工、佇列推進、F 鍵、新增/刪除/編輯)
    // 800ms 後把整份排程(排除 placeholder)上傳後端;後端 upsert + 刪除清單外的列。
    useEffect(() => {
        if (!ordersLoaded) return;
        const payload = orders
            .filter(o => o.id !== 'placeholder' && isGuid(o.id))
            .map((o, i) => toBackendOrder(o, i));
        const handle = setTimeout(() => {
            apiSyncSchedule(payload).catch(e => console.warn('[orders] 鏡像同步失敗', e));
        }, 800);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders, ordersLoaded]);
    // ──────────────────────────────────────────────────────────────────────────────

    // Shared Product Data(供生產排程與產品庫共用)
    // 產品檔為空時種入 RSC/HSC 測試料號(供生產排程右側顯示 + 加入排程生成工單)。
    const [products, setProducts] = useState(() => {
        try {
            const saved = localStorage.getItem('products');
            const initial = saved ? JSON.parse(saved) : [];
            return initial.length === 0 ? createSeedProducts() : initial;
        } catch (e) {
            console.error("Failed to load products", e);
            return createSeedProducts();
        }
    });

    useEffect(() => {
        localStorage.setItem('products', JSON.stringify(products));
    }, [products]);

    // 以 splice 搬移取代原本的相鄰交換:相鄰移動(上/下移按鈕)結果不變,
    // 額外支援任意 from→to(拖拉排序需要把某列插到非相鄰位置)。
    const moveOrder = (fromIndex, toIndex) => {
        setOrders(prev => spliceMove(prev, fromIndex, toIndex));
    };

    const deleteOrder = (orderId) => {
        setOrders(prev => prev.filter(o => String(o.id) !== String(orderId)));
        addLog(`Order ${orderId} Deleted`);
    };

    const saveOrder = (formData, isEdit = false, existingId = null) => {
        if (isEdit && existingId) {
            // Update Existing - Keep original seqNo
            setOrders(prev => prev.map(o => o.id === existingId ? { ...o, ...formData, msg: formData.productName, qty: Number(formData.qty) || Number(formData.bundleCount) * 100 || 1000 } : o));
            addLog(`Order ${existingId} Updated`);
        } else {
            // Add New - Generate unique ID and sequence number
            // Phase 2:改用 GUID 作為 id,讓全量鏡像同步能穩定 upsert 至後端 Orders 表
            const timestamp = Date.now();
            const newId = genOrderId();

            // 產生唯一序號：使用時間戳的後4位數字 × 10 來確保唯一性
            // 例如：timestamp = 1736915298135 → seqNo = 8130 (取後3位813 * 10)
            const uniqueSeqNo = (timestamp % 10000) * 10;

            const newOrder = {
                id: newId,
                seqNo: uniqueSeqNo, // 固定的唯一序號，不會因為位置改變而變化
                ...formData,
                msg: formData.productName || 'New Product',
                // Use user-provided orderNo, fallback to auto-generated if not provided
                orderNo: formData.orderNo || `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
                // Use user-provided qty directly
                qty: formData.qty ? Number(formData.qty) : (Number(formData.bundleCount) * 100 || 1000),
                eta: '12:00',
                status: 'Queued',
                boxNo: formData.boxNo || '-', // Ensure boxNo exists
            };
            setOrders(prev => [...prev, newOrder]);
            addLog(`Order ${formData.orderNo || newId} Added (SeqNo: ${uniqueSeqNo})`);
        }
    };

    // Product Management Helpers
    const saveProduct = (productData) => {
        // 修正:原以 boxNo 為 upsert 鍵,編輯時若修改 boxNo 會找不到舊記錄而新增一筆,造成重複。
        // 編輯流程(ProductFormModal)會帶回既有 id,優先以 id 比對更新;僅在無 id 時(儀表板自動存檔)才退回以 boxNo upsert。
        const existsById = productData.id && products.find(p => p.id === productData.id);
        const existsByBoxNo = !productData.id && products.find(p => p.boxNo === productData.boxNo);

        if (existsById) {
            setProducts(prev => prev.map(p => p.id === productData.id ? { ...p, ...productData } : p));
            addLog(`Product ${productData.boxNo} Updated in Library`);
        } else if (existsByBoxNo) {
            setProducts(prev => prev.map(p => p.boxNo === productData.boxNo ? { ...p, ...productData } : p));
            addLog(`Product ${productData.boxNo} Updated in Library`);
        } else {
            setProducts(prev => [...prev, { ...productData, id: productData.id || `p${Date.now()}` }]);
            addLog(`Product ${productData.boxNo} Auto-Saved to Library`);
        }
    };

    const deleteProduct = (index) => {
        setProducts(prev => prev.filter((_, i) => i !== index));
        addLog('Product Deleted from Library');
    };

    const reorderOrders = () => {
        setOrders(prev => renumberSeq(prev));  // 重新編號 seqNo 為 10,20,30…,保留原始 id 與其餘欄位
        addLog('Orders Renumbered (seqNo updated)');
    };

    // RBAC: Debug Config
    // Admin/Engineer can see Debug Panel. Others cannot.
    const canDebug = user && (user.role === 'ADMIN' || user.role === 'ENGINEER');
    // Force debugMode off if not allowed
    useEffect(() => {
        if (!canDebug) setDebugMode(false);
        else setDebugMode(true); // Default on for authorized
    }, [user, canDebug]);

    // Nav Items (Dynamic)
    // 導覽列改用 i18n,切換語言時同步更換(原為硬編碼中文,永不隨語言變動)
    const navItems = [
        { path: '/', label: t('nav.monitor') },
        { path: '/schedule', label: t('nav.schedule') },
        { path: '/reports', label: t('nav.reports') },
        { path: '/analysis', label: t('nav.analysis') },
        { path: '/settings', label: t('nav.settings') },
        { path: '/docs', label: `📖 ${t('nav.docs')}` },
    ];

    // F-Keys (Dynamic)
    const fKeys = [
        { key: 'F1', label: t('fkeys.f1') },
        { key: 'F2', label: t('fkeys.f2') },
        { key: 'F3', label: t('fkeys.f3') },
        { key: 'F4', label: t('fkeys.f4') },
        { key: 'F5+', label: t('fkeys.f5'), code: 'F5' }, // 修正:派發真實鍵 F5(原派發 'F5+' Dashboard 永不匹配),按鈕仍顯示 F5+
        { key: 'F6+', label: t('fkeys.f6'), code: 'F6' }, // 修正:同上,派發 F6
        { key: 'F7', label: t('fkeys.f7') },
        { key: 'M/N', label: t('fkeys.f8'), className: styles.pinkBtn, code: 'F8' }, // Manual
        { key: 'F9', label: t('fkeys.f9') },
        { key: 'F10', label: t('fkeys.f10') },
        { key: 'F12', label: t('fkeys.f12') },
    ];

    if (!user && !showLoginModal) {
        return <LoginModal isOpen={true} onClose={() => { }} />;
    }

    return (
        <div className={styles.container}>
            {/* Top Menu Bar */}
            <header className={styles.header}>
                <div className={styles.appTitle}>PRIIOT <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>({user.role})</span></div>
                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                    {/* 語言切換 nav 選單(新增):即時同步切換全站語言 */}
                    <LanguageNavMenu className={styles.navItem} />
                </nav>

                {/* Simulation Controls - Only for Admin (Req: Simulation [New] Only Admin) AND if Enabled in Settings */}
                {canDebug && plcSimulateEnabled && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', marginRight: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#666', marginRight: '5px' }}>{t('layout.sim.label')}</span>
                        <button
                            onClick={() => setIsSimulating(!isSimulating)}
                            style={{
                                padding: '5px 10px',
                                backgroundColor: isSimulating ? '#4caf50' : '#ccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {isSimulating ? 'ON' : 'OFF'}
                        </button>

                        {/* Simulation Mode Toggle */}
                        {isSimulating && (
                            <select
                                value={simulationMode}
                                onChange={(e) => setSimulationMode(e.target.value)}
                                style={{
                                    marginLeft: '5px',
                                    padding: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    color: '#333'
                                }}
                                title={t('layout.sim.modeTitle')}
                            >
                                <option value="local">Local</option>
                                <option value="remote">Remote</option>
                            </select>
                        )}

                        <button
                            onClick={() => setIsMotorOn(!isMotorOn)}
                            disabled={!isSimulating}
                            style={{
                                padding: '5px 10px',
                                backgroundColor: isMotorOn ? '#2196f3' : '#ccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isSimulating ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                opacity: isSimulating ? 1 : 0.5
                            }}
                        >
                            {isMotorOn ? 'Power ON' : 'Power OFF'}
                        </button>
                        {/* 速度調整滑桿 */}
                        {isSimulating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '8px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#666' }}>{t('layout.sim.stop')}</span>
                                <input
                                    type="range"
                                    min="-1"
                                    max="1"
                                    step="0.1"
                                    value={speedFactor}
                                    onChange={async (e) => {
                                        const newSpeedFactor = parseFloat(e.target.value);
                                        setSpeedFactor(newSpeedFactor);
                                        try {
                                            await updateSimulationSpeed(newSpeedFactor);
                                        } catch (error) {
                                            console.error('Failed to update simulation speed:', error);
                                        }
                                    }}
                                    style={{
                                        width: '80px',
                                        cursor: 'pointer',
                                        accentColor: speedFactor < 0 ? '#f44336' : speedFactor > 0 ? '#4caf50' : '#2196f3'
                                    }}
                                    title={`${t('layout.sim.speed')}: ${speedFactor === -1 ? t('layout.sim.stop') : speedFactor === 0 ? t('layout.sim.standard') : speedFactor === 1 ? t('layout.sim.max') : (speedFactor * 100).toFixed(0) + '%'}`}
                                />
                                <span style={{ fontSize: '0.7rem', color: '#666' }}>{t('layout.sim.max')}</span>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: speedFactor < 0 ? '#f44336' : speedFactor > 0 ? '#4caf50' : '#2196f3',
                                    fontWeight: 'bold',
                                    minWidth: '35px'
                                }}>
                                    {speedFactor === -1 ? t('layout.sim.stopShort') : speedFactor === 0 ? t('layout.sim.standard') : speedFactor === 1 ? t('layout.sim.max') : `${(speedFactor * 100).toFixed(0)}%`}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Help Button - 說明按鈕 */}
                <button
                    onClick={() => setShowHelpModal(true)}
                    style={{
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        marginLeft: canDebug ? '0' : 'auto',
                        marginRight: '10px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    title={t('layout.help.title')}
                >
                    📖 {t('layout.help.button')}
                </button>

                {/* Language Switcher Component */}
                <LanguageSwitcher style={{ marginRight: '20px' }} />

                <div className={styles.systemStatus} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>User: {user.name}</span>
                    <button onClick={logout} style={{ padding: '2px 8px', cursor: 'pointer' }}>{t('layout.logout')}</button>
                    <span>Status: OK</span>
                </div>
            </header>

            {/* Middle: Main Content + Debug Panel */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <main className={styles.mainContent}>
                    {/* Pass addLog, orders, and isSimulating capability to children */}
                    <Outlet context={{
                        addLog,
                        debugMode,
                        isSimulating,
                        isMotorOn,
                        setIsMotorOn,
                        isPlcConnected,      // New
                        togglePlcConnection, // New
                        simulatePlcCount,    // New
                        speedFactor,      // 速度因子 (-1~1)
                        user,
                        simulationMode, // New
                        orders,
                        setOrders,
                        products,      // New
                        setProducts,   // New
                        saveProduct,   // New
                        deleteProduct, // New
                        moveOrder,
                        deleteOrder,
                        saveOrder,
                        reorderOrders,
                        setShowLoginModal,
                        // 即時監控資料 (用於 Schedule 頁面判斷刪除)
                        currentMonitorData,
                        setCurrentMonitorData
                    }} />
                </main>

                {canDebug && debugMode && (
                    <DebugPanel logs={logs} />
                )}
            </div>

            {/* Debug Footer REMOVED (Integrated into DebugPanel Overlay) */}

            {/* Login Modal for F9 (Switch Operator) */}
            {showLoginModal && (
                <LoginModal
                    isOpen={true}
                    onClose={() => setShowLoginModal(false)}
                />
            )}

            {/* Help Modal - 說明視窗 */}
            <HelpModal
                isOpen={showHelpModal}
                onClose={() => setShowHelpModal(false)}
            />

            {/* Bottom Function Bar */}
            <footer className={styles.footer}>
                {/* F-Keys: Only show on Home/Dashboard ('/') */}
                {location.pathname === '/' && (
                    <div className={styles.fKeyGrid}>
                        {fKeys.map((k) => (
                            <button
                                key={k.key}
                                className={`${styles.fKeyBtn} ${k.className || ''} ${activeKey === k.key || activeKey === k.code ? styles.active : ''}`}
                                onClick={() => {
                                    addLog(`Button Clicked: ${k.key} (${k.label})`);
                                    window.dispatchEvent(new KeyboardEvent('keydown', { key: k.code || k.key }));
                                }}
                            >
                                <div className={styles.fKeyLabel}>{k.key}</div>
                                <div className={styles.fKeyAction}>{k.label}</div>
                            </button>
                        ))}
                    </div>
                )}

                <div className={styles.statusBar}>
                    {/* Left: System Status */}
                    <div className={styles.statusItem}>
                        <span>{t('layout.status.state')}</span>
                    </div>

                    {/* Left-Center: Connection Status */}
                    <div className={styles.statusItem}>
                        <div style={{ display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                            <span className={styles.statusIndicator} style={{ backgroundColor: isPlcConnected ? '#4caf50' : '#f44336' }}></span>
                            <span>PLC: {isPlcConnected ? t('layout.status.connected') : t('layout.status.disconnected')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={styles.statusIndicator} style={{ backgroundColor: erpStatus === 'connected' ? '#4caf50' : '#bdbdbd' }}></span>
                            <span>ERP: {erpStatus === 'connected' ? t('layout.status.connected') : t('layout.status.disabled')}</span>
                        </div>
                    </div>

                    {/* Center: Time */}
                    <div className={styles.statusItem}>
                        <span>Start Time: 2025/12/21</span>
                    </div>

                    {/* Right: Operator Info */}
                    <div className={styles.statusItem}>
                        Operator: {user.name} {user.shift ? `(Shift: ${user.shift})` : ''} ({user.role})
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
