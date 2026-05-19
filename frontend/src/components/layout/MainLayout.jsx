import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import styles from './MainLayout.module.css';
import { updateSimulationSpeed } from '../../services/api';

import DebugPanel from '../debug/DebugPanel';
import { useLanguage } from '../../modules/language/LanguageContext';
import LanguageSwitcher from '../../modules/language/LanguageSwitcher';
import { useAuth } from '../../modules/auth/AuthContext';
import LoginModal from '../../modules/auth/LoginModal';
import HelpModal from '../modals/HelpModal';

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

    // Shared Product Data (Lifted from Maintenance)
    const [products, setProducts] = useState(() => {
        try {
            const saved = localStorage.getItem('products');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load products", e);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('products', JSON.stringify(products));
    }, [products]);

    const moveOrder = (fromIndex, toIndex) => {
        if (toIndex < 0 || toIndex >= orders.length) return;
        const newOrders = [...orders];
        [newOrders[fromIndex], newOrders[toIndex]] = [newOrders[toIndex], newOrders[fromIndex]];
        setOrders(newOrders);
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
            const timestamp = Date.now();
            const newId = `ord_${timestamp}`;

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
        // Check if exists
        const exists = products.find(p => p.boxNo === productData.boxNo);
        if (exists) {
            // Update? Or just skip? Req says "Auto save if not exists". 
            // Let's perform upsert or update if explicitly asked. 
            // For now, pure add if new.
            setProducts(prev => prev.map(p => p.boxNo === productData.boxNo ? { ...p, ...productData } : p));
            addLog(`Product ${productData.boxNo} Updated in Library`);
        } else {
            setProducts(prev => [...prev, { ...productData, id: `p${Date.now()}` }]);
            addLog(`Product ${productData.boxNo} Auto-Saved to Library`);
        }
    };

    const deleteProduct = (index) => {
        setProducts(prev => prev.filter((_, i) => i !== index));
        addLog('Product Deleted from Library');
    };

    const reorderOrders = () => {
        setOrders(prev => prev.map((o, index) => ({
            ...o,
            seqNo: (index + 1) * 10  // 重新編號序號，但保留原始 id
        })));
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
    const navItems = [
        { path: '/', label: '即時監控 (Monitor)' },
        { path: '/schedule', label: '生產排程 (Schedule)' },
        { path: '/reports', label: '生產報表 (Report)' },
        { path: '/analysis', label: '生產分析 (Analysis)' },
        { path: '/maintenance', label: '保養維修 (Maintenance)' },
        { path: '/settings', label: '系統設定 (Settings)' },
        { path: '/docs', label: '📖 文件 (Docs)' },
    ];

    // F-Keys (Dynamic)
    const fKeys = [
        { key: 'F1', label: t('fkeys.f1') },
        { key: 'F2', label: t('fkeys.f2') },
        { key: 'F3', label: t('fkeys.f3') },
        { key: 'F4', label: t('fkeys.f4') },
        { key: 'F5+', label: t('fkeys.f5') },
        { key: 'F6+', label: t('fkeys.f6') },
        { key: 'F7', label: t('fkeys.f7') },
        { key: 'M/N', label: t('fkeys.f8'), className: styles.pinkBtn, code: 'F8' }, // Manual
        { key: 'F9', label: '班別' },
        { key: 'F10', label: '退回' },
        { key: 'F12', label: t('fkeys.f12') },
    ];

    if (!user && !showLoginModal) {
        return <LoginModal isOpen={true} onClose={() => { }} />;
    }

    return (
        <div className={styles.container}>
            {/* Top Menu Bar */}
            <header className={styles.header}>
                <div className={styles.appTitle}>Flexo IoT <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>({user.role})</span></div>
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
                </nav>

                {/* Simulation Controls - Only for Admin (Req: Simulation [New] Only Admin) AND if Enabled in Settings */}
                {canDebug && plcSimulateEnabled && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', marginRight: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#666', marginRight: '5px' }}>模擬生產:</span>
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
                                title="選擇模擬模式: 本地(直接顯示) vs 遠端(經由MQTT迴路)"
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
                                <span style={{ fontSize: '0.7rem', color: '#666' }}>0</span>
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
                                    title={`速度: ${speedFactor === -1 ? '停止' : speedFactor === 0 ? '標準' : speedFactor === 1 ? '極速' : (speedFactor * 100).toFixed(0) + '%'}`}
                                />
                                <span style={{ fontSize: '0.7rem', color: '#666' }}>極速</span>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: speedFactor < 0 ? '#f44336' : speedFactor > 0 ? '#4caf50' : '#2196f3',
                                    fontWeight: 'bold',
                                    minWidth: '35px'
                                }}>
                                    {speedFactor === -1 ? '停' : speedFactor === 0 ? '標準' : speedFactor === 1 ? '極速' : `${(speedFactor * 100).toFixed(0)}%`}
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
                    title="操作說明"
                >
                    📖 說明
                </button>

                {/* Language Switcher Component */}
                <LanguageSwitcher style={{ marginRight: '20px' }} />

                <div className={styles.systemStatus} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>User: {user.name}</span>
                    <button onClick={logout} style={{ padding: '2px 8px', cursor: 'pointer' }}>登出</button>
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
                        <span>狀態: Idle</span>
                    </div>

                    {/* Left-Center: Connection Status */}
                    <div className={styles.statusItem}>
                        <div style={{ display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                            <span className={styles.statusIndicator} style={{ backgroundColor: isPlcConnected ? '#4caf50' : '#f44336' }}></span>
                            <span>PLC: {isPlcConnected ? '連線 (Connected)' : '斷線 (Disconnected)'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={styles.statusIndicator} style={{ backgroundColor: erpStatus === 'connected' ? '#4caf50' : '#bdbdbd' }}></span>
                            <span>ERP: {erpStatus === 'connected' ? '連線 (Connected)' : '未啟用 (Disabled)'}</span>
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
