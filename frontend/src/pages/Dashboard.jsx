import React, { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt'; // Added for MQTT Monitor Loop
import { useOutletContext } from 'react-router-dom';
import styles from './Dashboard.module.css';
import OrderDetailsModal from '../components/modals/OrderDetailsModal';
import StopReasonModal from '../components/modals/StopReasonModal';
import FinishOrderModal from '../components/modals/FinishOrderModal';
import ProductFormModal from '../components/modals/ProductFormModal';
import {
    setCurrentOrder, clearCurrentOrder, getRealtimeData, getMachineSections // Imported
} from '../services/api';
import { withCooldown } from '../utils/debounce';
import { useLanguage } from '../modules/language/LanguageContext';

const Dashboard = () => {
    const { t } = useLanguage();

    const {
        addLog,
        isSimulating,
        isMotorOn,
        setIsMotorOn,
        speedFactor = 0,  // 速度因子 (-1~1)
        user,
        orders,
        setOrders,
        moveOrder,       // From Context
        deleteOrder,     // From Context
        saveOrder,       // From Context
        saveProduct,     // From Context (New)
        reorderOrders,   // From Context
        setShowLoginModal, // From Context
        setCurrentMonitorData, // 共享即時監控資料
        isPlcConnected, // New: Disconnection state
        simulationMode = 'remote' // New: Local/Remote Sim Mode
    } = useOutletContext() || {
        addLog: console.log,
        isSimulating: false,
        isMotorOn: true,
        setIsMotorOn: () => { },
        speedFactor: 0,
        user: { name: 'Guest' },
        orders: [],
        setOrders: () => { },
        setCurrentMonitorData: () => { },
        isPlcConnected: true
    };
    const wsRef = useRef(null);

    const [currentData, setCurrentData] = useState({
        line_speed: 0,
        di1: 0,
        status_code: 0
    });

    // Simulation Internal State (Virtual PLC Memory)
    const simStateRef = useRef({
        line_speed: 0,
        di1: 0,
        status_code: 0
    });
    // MQTT Client Ref
    const mqttClientRef = useRef(null);

    const [selectedOrderId, setSelectedOrderId] = useState(null);

    const [showOrderModal, setShowOrderModal] = useState(false);
    const [autoNext, setAutoNext] = useState(true);
    const [resetOffset, setResetOffset] = useState(0);
    const isOffsetInitialized = useRef(false); // New: Track if we have Tared the offset

    // Stop Reason Logic
    const [showStopReasonModal, setShowStopReasonModal] = useState(false);
    const [stopReasons, setStopReasons] = useState([]);
    const [hasLoggedStop, setHasLoggedStop] = useState(false); // To prevent multiple modals for same stop

    // Tab State
    const [activeTab, setActiveTab] = useState('status'); // 'status' or 'reason'
    const [stopStartTime, setStopStartTime] = useState(null);

    // 從設定頁面讀取機台極速 (Max Speed)
    const [machineMaxSpeed, setMachineMaxSpeed] = useState(() => {
        const saved = localStorage.getItem('unitSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            return settings.maxSpeed || 350;
        }
        return 350; // 預設值
    });

    // 從設定頁面讀取閾值設定
    const [thresholdSettings, setThresholdSettings] = useState(() => {
        const saved = localStorage.getItem('formulaSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            return {
                stdPrepTime: settings.stdPrepTime || 10, // 標準準備時間 (分) - 預設10分鐘
                prepTimeYellowThreshold: settings.prepTimeYellowThreshold || 120, // 黃色閾值 %
                speedBasePercent: settings.speedBasePercent || 80, // 標準車速基準 % (機台極速的百分比)
                speedGreenThreshold: settings.speedGreenThreshold || 120, // 車速綠色閾值 %
                shortageThreshold: settings.shortageThreshold || 50 // 欠量閾值
            };
        }
        return {
            stdPrepTime: 10,
            prepTimeYellowThreshold: 120,
            speedBasePercent: 80,
            speedGreenThreshold: 120,
            shortageThreshold: 50
        };
    });

    // 準備時間計時 (秒)
    const [prepTimeSeconds, setPrepTimeSeconds] = useState(0);
    // 是否已進入連續生產
    const [isContinuousProduction, setIsContinuousProduction] = useState(false);

    // Stats State (Seconds)
    const [jobRunTime, setJobRunTime] = useState(0);
    const [todayRunTime, setTodayRunTime] = useState(0);
    const [jobStopTime, setJobStopTime] = useState(0);
    const [todayStopTime, setTodayStopTime] = useState(0);
    const [stopCount, setStopCount] = useState(0);

    // Machine Sections (Error/Run Status Configuration)
    const [machineSections, setMachineSections] = useState([]);

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const data = await getMachineSections();
                if (data) setMachineSections(data);
            } catch (err) {
                console.error("Failed to load machine sections:", err);
            }
        };
        fetchSections();
    }, []);



    // Helper: Format Seconds to HH:MM:SS
    const formatDuration = (secs) => {
        if (!secs || isNaN(secs)) return '00:00:00';
        const h = Math.floor(secs / 3600).toString().padStart(2, '0');
        const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    /**
     * 計算準備時間對應的背景顏色
     * @param {number} prepTimeSec - 準備時間 (秒)
     * @returns {string} CSS 顏色值
     */
    const getPrepTimeColor = (prepTimeSec) => {
        const stdPrepTimeSec = thresholdSettings.stdPrepTime * 60; // 轉為秒
        const yellowThresholdSec = stdPrepTimeSec * (thresholdSettings.prepTimeYellowThreshold / 100);

        if (prepTimeSec < stdPrepTimeSec) {
            return 'var(--status-ok-bg)'; // 淺綠色背景 (< 100%)
        } else if (prepTimeSec <= yellowThresholdSec) {
            return 'var(--status-warning-bg)'; // 淺黃色背景 (100% ~ 黃色閾值)
        } else {
            return 'var(--status-error-bg)'; // 淺紅色背景 (> 黃色閾值)
        }
    };

    /**
    /**
     * 計算車速對應的字體顏色
     * 邏輯優化：
     * - 🔴 < 綠色閾值 (嚴重低速)
     * - 🟡 < 標準車速 (低於目標)
     * - 🟢 >= 標準車速 (達標)
     * @param {number} speed - 當前車速
     * @returns {string} CSS 顏色值
     */
    const getSpeedColor = (speed) => {
        // 標準車速 = 機台極速 × 基準百分比
        const standardSpeed = machineMaxSpeed * (thresholdSettings.speedBasePercent / 100);
        const greenThreshold = standardSpeed * (thresholdSettings.speedGreenThreshold / 100);

        if (speed < greenThreshold) {
            return 'var(--status-error)'; // 🔴 紅色 (嚴重低速)
        } else if (speed < standardSpeed) {
            return 'var(--status-warning)'; // 🟡 橙色 (低於目標)
        } else {
            return 'var(--status-ok)'; // 🟢 綠色 (達標)
        }
    };

    // Helper: Move queued order up/down
    const handleMoveOrder = (direction) => {
        if (orders.length < 2) return;

        // Find index to move directly from selection, or default to 1 (top of queue)
        let targetIndex = 1;
        if (selectedOrderId) {
            const idx = orders.findIndex(o => o.id === selectedOrderId);
            if (idx > 0) targetIndex = idx; // Only allow moving if not the running order (0)
        }

        if (targetIndex < 1) {
            addLog(`Cannot move Running Order ${selectedOrderId}`);
            return;
        }

        let swapIndex = -1;
        if (direction === 'up' && targetIndex > 1) swapIndex = targetIndex - 1;
        if (direction === 'down' && targetIndex < orders.length - 1) swapIndex = targetIndex + 1;

        if (swapIndex !== -1) {
            moveOrder(targetIndex, swapIndex);
            addLog(`Moved Order ${selectedOrderId || orders[targetIndex].id} ${direction} to pos ${swapIndex}`);
        } else {
            addLog(`Cannot move ${direction} further.`);
        }
    };

    const [showFinishModal, setShowFinishModal] = useState(false);

    const handleFinish = () => {
        const currentCount = Math.floor(currentData.di1 - resetOffset);
        if (currentCount > 0) {
            setShowFinishModal(true);
        } else {
            alert(`${t('dashboard.monitor.productionQty')} 0! ${t('dashboard.logs.f10Return')}`);
            addLog('Finish failed: Count is 0');
        }
    };

    const handleConfirmFinish = (data) => {
        const currentCount = Math.floor(currentData.total_length - resetOffset);
        addLog(`Order ${orders[0].id} Finished. Good: ${data.goodQty}, Operator: ${data.operator}`);

        // --- Auto-Save to Product Library ---
        const finishedOrder = orders[0];
        if (finishedOrder && finishedOrder.boxNo) {
            const productData = {
                boxNo: finishedOrder.boxNo,
                customer: finishedOrder.customer || 'Unknown',
                productName: finishedOrder.productName || finishedOrder.msg,
                boxType: finishedOrder.boxType || '',
                length: finishedOrder.length || 0,
                width: finishedOrder.width || 0,
                height: finishedOrder.height || 0,
                // Ensure ID is not passed so it creates new if not exists, or handle in saveProduct
                // SaveProduct logic in MainLayout handles upsert by BoxNo.
            };
            if (saveProduct) saveProduct(productData);
        }
        // -------------------------------------

        // --- 儲存生產歷史記錄到 localStorage ---
        // 計算平均車速：運轉時間 > 0 時，用生產數量 / 運轉時間(分鐘)
        const avgSpeedCalc = jobRunTime > 0 ? Math.round(currentCount / (jobRunTime / 60)) : 0;
        // 計算 OEE：簡化公式 = (實際產量 / 目標產量) × (運轉時間 / (運轉時間 + 停車時間)) × 100
        const totalTime = jobRunTime + jobStopTime;
        const availability = totalTime > 0 ? jobRunTime / totalTime : 1;
        const performance = finishedOrder.qty > 0 ? Math.min(1, currentCount / finishedOrder.qty) : 1;
        const oeeCalc = Math.round(availability * performance * 100);

        const productionRecord = {
            id: Date.now(),
            orderId: finishedOrder.id,
            orderNo: finishedOrder.orderNo || '-',
            boxNo: finishedOrder.boxNo || '-',
            customer: finishedOrder.customer || 'Unknown',
            productName: finishedOrder.productName || finishedOrder.msg || '-',
            boxType: finishedOrder.boxType || '-',
            flute: finishedOrder.flute || '-',
            operator: data.operator || user?.name || 'Unknown',
            shift: user?.shift || 'Day',
            targetQty: finishedOrder.qty || 0,
            goodQty: data.goodQty || currentCount,
            defectQty: data.defectQty || 0,
            prepTime: Math.round(prepTimeSeconds / 60 * 10) / 10,   // 準備時間（分鐘，保留1位小數）
            runTime: Math.round(jobRunTime / 60 * 10) / 10,         // 運轉時間（分鐘）
            stopTime: Math.round(jobStopTime / 60 * 10) / 10,       // 停車時間（分鐘）
            stopCount: stopReasons.length,                           // 停車次數
            avgSpeed: avgSpeedCalc,                                  // 平均車速（張/分）
            oee: oeeCalc,                                            // OEE 百分比
            date: new Date().toISOString().split('T')[0],            // 生產日期 (YYYY-MM-DD)
            finishedAt: new Date().toISOString(),                    // 完工時間戳
            stopReasons: stopReasons.map(r => ({                     // 停車原因記錄
                time: r.time,
                duration: r.duration,
                reason: r.reason
            }))
        };

        try {
            const history = JSON.parse(localStorage.getItem('productionHistory') || '[]');
            history.unshift(productionRecord);
            // 限制保留最近 1000 筆記錄，避免 localStorage 超容量
            if (history.length > 1000) history.length = 1000;
            localStorage.setItem('productionHistory', JSON.stringify(history));
            addLog(`Production history saved: ${finishedOrder.orderNo}`);
        } catch (err) {
            console.error('Failed to save production history:', err);
        }
        // -----------------------------------------

        // --- Publish to MQTT for Backend Storage ---
        if (mqttClientRef.current && mqttClientRef.current.connected) {
            const completionPayload = {
                order_id: String(finishedOrder.id),
                product_id: finishedOrder.boxNo || finishedOrder.productName || 'UNKNOWN',
                status: 'COMPLETED',
                timestamp: new Date().toISOString(),
                details: {
                    goodQty: data.goodQty || currentCount,
                    defectQty: data.defectQty || 0,
                    operator: data.operator || user?.name || 'Unknown',
                    avgSpeed: avgSpeedCalc,
                    oee: oeeCalc,
                    runTime: jobRunTime,
                    stopTime: jobStopTime,
                    stopReasons: stopReasons
                }
            };
            mqttClientRef.current.publish('factory/production/completion', JSON.stringify(completionPayload), { qos: 1 });
            addLog(`Published completion for Order ${finishedOrder.id}`);
        } else {
            addLog('MQTT Disconnected: Completion record NOT sent to backend!');
        }
        // -----------------------------------------

        if (orders.length > 1) {
            const nextOrders = orders.slice(1);
            setOrders(nextOrders);
            setResetOffset(currentData.di1);
            if (selectedOrderId === orders[1].id) setSelectedOrderId(null);

            setHasLoggedStop(false);
            setStopReasons([]);
            setJobRunTime(0);
            setJobStopTime(0);

            // === 清除後端 CurrentOrder ===
            clearCurrentOrder().then(() => {
                addLog('F4: CurrentOrder cleared from backend');
            }).catch(err => {
                console.error('Failed to clear CurrentOrder:', err);
            });

            setIsMotorOn(true);
        }
    };

    // Product Form Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null); // null = Add, obj = Edit

    const handleAddOrder = () => {
        setEditingOrder(null);
        setShowProductModal(true);
    };

    const handleEditOrder = () => {
        if (!selectedOrderId) {
            alert(t('dashboard.alerts.selectOrderFirst'));
            return;
        }
        const order = orders.find(o => o.id === selectedOrderId);
        if (order) {
            setEditingOrder(order);
            setShowProductModal(true);
        }
    };

    const handleSaveOrder = (formData) => {
        if (editingOrder) {
            saveOrder(formData, true, editingOrder.id);
        } else {
            saveOrder(formData, false);
        }
        setShowProductModal(false);
    };

    const handleDeleteOrder = () => {
        if (!selectedOrderId) {
            alert(t('dashboard.alerts.selectOrderFirst'));
            return;
        }
        if (confirm(`${t('dashboard.alerts.confirmDelete')} ${selectedOrderId}?`)) {
            deleteOrder(selectedOrderId);
            setSelectedOrderId(null);
        }
    };

    const handleReorder = () => {
        if (confirm(t('dashboard.alerts.confirmReorder'))) {
            reorderOrders();
        }
    };

    // Helper: Check Stop Condition
    // Called whenever data updates
    const checkStopCondition = (speed, di1) => {
        const currentQty = Math.floor(di1 - resetOffset);
        const orderQty = orders[0]?.qty || 0;
        const remaining = orderQty - currentQty;

        if (speed === 0 && remaining > 50 && currentQty > 0) {
            if (!hasLoggedStop && !showStopReasonModal) {
                setShowStopReasonModal(true);
                setHasLoggedStop(true);
                setStopStartTime(new Date()); // Record Start Time
                setActiveTab('reason'); // Auto Switch to Reason Tab
            }
        } else if (speed > 0) {
            if (hasLoggedStop) setHasLoggedStop(false);
        }
    };

    const handleAddStopReason = (reason) => {
        const endTime = new Date();
        const startTimeStr = stopStartTime ? stopStartTime.toLocaleTimeString('en-GB', { hour12: false }) : endTime.toLocaleTimeString('en-GB', { hour12: false });

        let durationStr = '00:00';
        if (stopStartTime) {
            const diffMs = endTime - stopStartTime;
            const diffSec = Math.floor(diffMs / 1000);
            const mm = Math.floor(diffSec / 60).toString().padStart(2, '0');
            const ss = (diffSec % 60).toString().padStart(2, '0');
            durationStr = `${mm}:${ss}`;
        }

        setStopReasons(prev => [{ time: startTimeStr, duration: durationStr, reason: reason.name }, ...prev]);
        addLog(`Stop Reason Logged: ${reason.name} (${durationStr})`);
        setStopStartTime(null);
    };

    // Effect 1: F-Key Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.startsWith('F')) e.preventDefault();

            let key = e.key;
            if (e.key === 'F8') key = 'Manual';

            // Only log significant keys to avoid spam, or log all F-keys
            if (key.startsWith('F') || key === 'Manual') {
                // Log handled below
            }

            switch (key) {
                case 'F7':
                    console.log('F7 key pressed. Setting showOrderModal to true.');
                    setShowOrderModal(true);
                    addLog(t('dashboard.logs.f7OrderModal'));
                    break;
                case 'F1':
                    handleMoveOrder('up');
                    addLog(t('dashboard.logs.f1Pressed'));
                    break;
                case 'F2':
                    handleMoveOrder('down');
                    addLog(t('dashboard.logs.f2Pressed'));
                    break;
                case 'F3':
                    {
                        // Motor Off Logic: Block Start
                        if (!isPlcConnected) {
                            alert(t('dashboard.alerts.plcDisconnected'));
                            addLog('F3 Failed: PLC Disconnected');
                            return;
                        }

                        const isPlaceholder = orders[0]?.id === 'placeholder';

                        if (isPlaceholder) {
                            if (selectedOrderId) {
                                const idx = orders.findIndex(o => o.id === selectedOrderId);
                                if (idx > 0) {
                                    const newOrders = [...orders];
                                    // Move selected to 0, remove placeholder
                                    const selected = newOrders[idx];
                                    newOrders[0] = { ...selected, status: 'Running' };
                                    newOrders.splice(idx, 1); // Remove from queue

                                    setOrders(newOrders);

                                    // Software Offset Logic for WISE MQTT:
                                    // Set resetOffset to current di1 (which is the accumulating di1 value)
                                    // This makes the displayed Qty start at 0 for the new order.
                                    setResetOffset(currentDataRef.current.di1);

                                    setJobRunTime(0);
                                    setJobStopTime(0);
                                    setSelectedOrderId(null);

                                    // === 同步到後端 CurrentOrder API ===
                                    setCurrentOrder({
                                        order_id: selected.id,
                                        order_no: selected.orderNo || '',
                                        customer: selected.customer || '',
                                        box_no: selected.boxNo || '',
                                        target_qty: selected.qty || 0
                                    }).then(() => {
                                        addLog(`F3: Order ${selected.id} synced to backend`);
                                    }).catch(err => {
                                        console.error('Failed to sync CurrentOrder:', err);
                                        addLog(`F3: Backend sync failed - ${err.message}`);
                                    });

                                    addLog(`F3: Moved Order ${selected.id} to Production`);
                                } else {
                                    addLog('F3: Cannot move active order');
                                }
                            } else {
                                alert(t('dashboard.alerts.selectQueuedOrder'));
                            }
                        } else {
                            // 非 placeholder：重新同步目前工單到後端
                            const currentOrder = orders[0];
                            if (currentOrder) {
                                setCurrentOrder({
                                    order_id: currentOrder.id,
                                    order_no: currentOrder.orderNo || '',
                                    customer: currentOrder.customer || '',
                                    box_no: currentOrder.boxNo || '',
                                    target_qty: currentOrder.qty || 0
                                }).then(() => {
                                    addLog(`F3: CurrentOrder synced to backend`);
                                }).catch(err => {
                                    console.error('Failed to sync CurrentOrder:', err);
                                });
                            }
                            alert(`F3: ${t('dashboard.alerts.startProduction')}`);
                            addLog(t('dashboard.logs.f3Start'));
                        }
                    }
                    break;
                case 'F4': // Finish Order
                    // Check speed = 0 before allowing finish
                    if (currentDataRef.current.line_speed > 0) {
                        alert(t('dashboard.alerts.speedNotZero'));
                        addLog('F4 Failed: Speed is not 0');
                        return;
                    }
                    handleFinish();
                    break;
                case 'F5':
                    setResetOffset(prev => prev - 1);
                    addLog(t('dashboard.logs.f5GoodQty'));
                    break;
                case 'F6':
                    setResetOffset(prev => prev + 1);
                    addLog(t('dashboard.logs.f6DefectQty'));
                    break;
                case 'Manual': // F8
                    setAutoNext(prev => {
                        addLog(`F8: Auto Next toggled to ${!prev}`);
                        return !prev;
                    });
                    break;
                case 'F9': // Switch Shift
                    addLog(t('dashboard.logs.f9SwitchShift'));
                    if (setShowLoginModal) setShowLoginModal(true);
                    break;
                case 'F10': // Return logic
                    {
                        // Check speed = 0 before allowing return
                        if (currentDataRef.current.line_speed > 0) {
                            alert(t('dashboard.alerts.speedNotZeroReturn'));
                            addLog('F10 Failed: Speed is not 0');
                            return;
                        }
                        if (orders.length > 0 && orders[0].id !== 'placeholder') {
                            const curLen = currentDataRef.current.di1;
                            const newOrders = [...orders];
                            const returnedOrder = { ...newOrders[0], status: 'Queued' };

                            // Force placeholder to ensure Green Box becomes EMPTY (Idle) as requested
                            // "Long green box should have NO order inside"
                            const placeholder = {
                                id: 'placeholder',
                                boxNo: 'WAITING',
                                msg: '等待派工 (Waiting)',
                                orderNo: '-',
                                qty: 0,
                                eta: '-',
                                status: 'Idle'
                            };

                            if (autoNext && newOrders.length > 1) {
                                // Auto Next ON: Swap with next available
                                // Even in Auto Next, maybe we should transiently show empty? 
                                // Standard logic: Auto Next means immediacy. 
                                // But if user wants "Empty", maybe Auto Next implies *immediate* replacement. 
                                // Let's keep Auto Next as "Swap" (Immediate fill). 
                                // Only Manual Return (F10 default) creates the "Empty" state.
                                newOrders[0] = { ...newOrders[1], status: 'Running' };
                                newOrders[1] = returnedOrder;
                                addLog(`F10 (Auto): Swapped ${returnedOrder.id} with ${newOrders[0].id}`);
                            } else {
                                // Manual / Default Return:
                                // Move current [0] to [1], Insert Placeholder at [0]
                                newOrders.splice(0, 0, placeholder);
                                newOrders[1] = returnedOrder;
                                addLog(`F10: Returned ${returnedOrder.id} to queue. Box is Empty.`);
                            }

                            setOrders(newOrders);
                            setResetOffset(curLen);
                            setJobRunTime(0);
                            setJobStopTime(0);
                            setHasLoggedStop(false);
                            setStopReasons([]);

                            // === 清除後端 CurrentOrder ===
                            clearCurrentOrder().then(() => {
                                addLog('F10: CurrentOrder cleared from backend');
                            }).catch(err => {
                                console.error('Failed to clear CurrentOrder:', err);
                            });

                            setIsMotorOn(true);
                        }
                    }
                    break;
                case 'F12':
                    if (confirm('確定離開?')) {
                        addLog('F12: Exit System');
                        window.close();
                    }
                    break;
                default: break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [orders, currentData.total_length, selectedOrderId, resetOffset]);


    // Effect: Auto-Stop Motor when Order Finished
    useEffect(() => {
        if (isSimulating && isMotorOn) {
            const currentQty = Math.floor(currentData.di1 - resetOffset);
            const orderQty = orders[0]?.qty || 0;
            if (currentQty >= orderQty && orderQty > 0) {
                setIsMotorOn(false);
                addLog(`Order ${orders[0].id} Quantity Reached. Motor Auto-Stop.`);
            }
        }
    }, [currentData.di1, orders, isSimulating, isMotorOn, resetOffset, setIsMotorOn]);

    // Effect: Simulation Mode (MQTT Publisher)
    useEffect(() => {
        let interval;
        if (isSimulating) {
            // Sync simState with currentData when starting simulation to avoid jump
            simStateRef.current = { ...currentData };

            interval = setInterval(() => {
                let newSpeed = 0;
                let distance = 0;

                if (isMotorOn) {
                    const speedBaseType = thresholdSettings.speedBaseType || 'standard';
                    const standardSpeed = machineMaxSpeed * (thresholdSettings.speedBasePercent / 100);
                    const maxSpeed = machineMaxSpeed;
                    const baseSpeed = speedBaseType === 'maximum' ? maxSpeed : standardSpeed;

                    if (speedFactor <= -1) {
                        newSpeed = 0;
                    } else if (speedFactor >= 1) {
                        newSpeed = maxSpeed + (Math.random() * 10 - 5);
                    } else if (speedFactor === 0) {
                        newSpeed = baseSpeed + (Math.random() * 20 - 10);
                    } else if (speedFactor > 0) {
                        const targetSpeed = baseSpeed + (maxSpeed - baseSpeed) * speedFactor;
                        newSpeed = targetSpeed + (Math.random() * 15 - 7.5);
                    } else {
                        const targetSpeed = baseSpeed * (1 + speedFactor);
                        newSpeed = Math.max(0, targetSpeed + (Math.random() * 10 - 5));
                    }
                    distance = newSpeed / 60 / 10;
                }

                // Update Virtual PLC State
                simStateRef.current = {
                    ...simStateRef.current,
                    line_speed: Math.max(0, newSpeed),
                    di1: simStateRef.current.di1 + distance,
                    status_code: newSpeed > 0 ? 1 : 0
                };

                if (simulationMode === 'local') {
                    // Local Mode: Direct Update
                    setCurrentData({
                        ...simStateRef.current
                    });
                } else {
                    // Remote Mode: MQTT Publish (Simulating WISE module)
                    if (mqttClientRef.current && mqttClientRef.current.connected) {
                        const payload = {
                            d1: Math.floor(simStateRef.current.di1),
                            di1: simStateRef.current.di1,
                            line_speed: simStateRef.current.line_speed,
                            status_code: simStateRef.current.status_code,
                            timestamp: new Date().toISOString()
                        };
                        mqttClientRef.current.publish('factory/machine/update', JSON.stringify(payload));
                    }
                }


                // NOTE: We do NOT set local state here. We wait for Backend to echo back via factory/monitor/update
            }, 100);
        } else {
            // Simulation Stop: Send 0 speed once
            if (simulationMode === 'remote' && mqttClientRef.current && mqttClientRef.current.connected) {
                const payload = { ...simStateRef.current, line_speed: 0, status_code: 0 };
                mqttClientRef.current.publish('factory/machine/update', JSON.stringify(payload));
            }
            if (simulationMode === 'local') {
                setCurrentData(prev => ({ ...prev, line_speed: 0 }));
            }
        }
        return () => clearInterval(interval);
    }, [isSimulating, isMotorOn, speedFactor, machineMaxSpeed, thresholdSettings, simulationMode]);

    // Effect: Handle Stop Condition based on Current Data
    // Runs whenever currentData updates (from WS or Sim)
    useEffect(() => {
        checkStopCondition(currentData.line_speed, currentData.di1);
    }, [currentData, isSimulating, hasLoggedStop, showStopReasonModal, orders, resetOffset]);

    // Effect: Real-time Data Polling (API)
    useEffect(() => {
        const fetchRealtime = async () => {
            if (isSimulating && simulationMode === 'local') return; // Skip if local sim

            try {
                const data = await getRealtimeData();
                if (data) {
                    setCurrentData(prev => ({
                        ...prev,
                        line_speed: data.lineSpeed ?? data.speed ?? data.line_speed ?? 0,
                        di1: data.di1 ?? data.DI1 ?? data.totalLength ?? data.total_length ?? 0,
                        status_code: data.status
                    }));

                    // INITIALIZE OFFSET (TARE) ON FIRST DATA LOAD
                    // If dashboard just opened, we assume current count is the baseline (0 produced in this session so far)
                    // unless we want to persist offset in localStorage? 
                    // User request: "If no message or stable, show 0". Implies session reset.
                    if (!isOffsetInitialized.current && (data.di1 || data.totalLength || data.d1) > 0) {
                        const rawVal = data.di1 ?? data.DI1 ?? data.totalLength ?? data.total_length ?? 0;
                        setResetOffset(rawVal);
                        isOffsetInitialized.current = true;
                        console.log("Initialized Reset Offset to:", rawVal);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch realtime data:", err);
            }
        };

        const interval = setInterval(fetchRealtime, 1000); // Poll every 1s
        return () => clearInterval(interval);
    }, [isSimulating, simulationMode]);


    // Ref for Timer Access (Avoid re-render loop)
    const currentDataRef = useRef(currentData);
    useEffect(() => {
        currentDataRef.current = currentData;
    }, [currentData]);

    // 同步即時資料到共享狀態 (供 Schedule 頁面使用)
    useEffect(() => {
        if (setCurrentMonitorData) {
            const currentQty = Math.floor(currentData.di1 - resetOffset);
            setCurrentMonitorData({
                lineSpeed: currentData.line_speed,
                currentQty: currentQty,
                resetOffset: resetOffset
            });
        }
    }, [currentData.line_speed, currentData.di1, resetOffset, setCurrentMonitorData]);

    // Effect: Timers (Run/Stop Time) - ONE SECOND INTERVAL
    useEffect(() => {
        const timer = setInterval(() => {
            const speed = currentDataRef.current.line_speed;

            if (speed > 0) {
                setJobRunTime(prev => prev + 1);
                setTodayRunTime(prev => prev + 1);

                // 檢測連續生產狀態：如果速度 > 0 且已經持續生產一段時間
                // 簡化邏輯：速度 > 0 就認為是連續生產中
                setIsContinuousProduction(true);
            } else {
                setJobStopTime(prev => prev + 1);
                setTodayStopTime(prev => prev + 1);
            }

            // 準備時間計時：在未達連續生產狀態時累計
            if (!isContinuousProduction) {
                setPrepTimeSeconds(prev => prev + 1);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [isContinuousProduction]);

    // Effect: 訂單切換時重置準備時間和連續生產狀態
    useEffect(() => {
        setPrepTimeSeconds(0);
        setIsContinuousProduction(false);
    }, [orders[0]?.id]);

    const currentOrder = orders[0] || {};

    return (
        <div className={`${styles.container} ${!isPlcConnected ? styles.emergencyState : ''}`}>
            {/* Monitor Section */}
            <div className={styles.monitorSection}>
                <div className={styles.mainMetric}>
                    <div className={styles.metricLabel}>{t('dashboard.monitor.productionQty')} ({t('dashboard.monitor.qty')})</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '10px' }}>
                        <div className={styles.metricBigNumber}>
                            {Math.floor(currentData.di1 - resetOffset)}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
                            / {currentOrder.qty || '-'}
                            <span style={{ marginLeft: '10px', color: 'var(--primary-blue)' }}>
                                ({currentOrder.qty ? Math.floor(((currentData.di1 - resetOffset) / currentOrder.qty) * 100) : 0}%)
                            </span>
                        </div>
                    </div>
                </div>
                <div className={styles.speedMetric}>
                    <div className={styles.metricLabel}>{t('dashboard.monitor.speed')}</div>
                    {(() => {
                        // Motor Off Logic: Force 0
                        const speed = isPlcConnected ? Math.floor(currentData.line_speed) : 0;
                        const standardSpeed = Math.floor(machineMaxSpeed * (thresholdSettings.speedBasePercent / 100));
                        const maxSpeed = machineMaxSpeed;
                        // Grey color if disconnected, else normal logic
                        const speedColor = isPlcConnected ? getSpeedColor(speed) : '#888';

                        return (
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '10px' }}>
                                <div className={styles.metricBigNumber} style={{ color: speedColor }}>
                                    {speed}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span>{t('dashboard.monitor.standard')}: {standardSpeed}</span>
                                    <span style={{ fontSize: '0.9rem' }}>{t('dashboard.monitor.maxSpeed')}: {maxSpeed}</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Stats Panel */}
            <div className={styles.statsPanel}>
                <div className={styles.statsHeaderRow}>
                    <div className={styles.statsLabel}>&nbsp;</div>
                    <div>{t('dashboard.stats.squareMeter')}</div><div>{t('dashboard.stats.total')}</div><div>{t('dashboard.stats.count')}</div><div>{t('dashboard.stats.remaining')}</div><div>{t('dashboard.stats.defect')}</div>
                    <div>{t('dashboard.stats.avgSpeed')}</div><div>{t('dashboard.stats.runTime')}</div><div>{t('dashboard.stats.stopTime')}</div><div>{t('dashboard.stats.stopCount')}</div>
                </div>
                {/* Today (Accumulated Total) */}
                <div className={styles.statsRow}>
                    <div className={styles.statsRowLabel}>{t('dashboard.stats.today')}</div>
                    <div>0</div>
                    <div>{orders.reduce((sum, o) => sum + (o.qty || 0), 0)}</div>
                    <div>{Math.floor(currentData.di1)}</div>
                    <div>
                        {orders.reduce((sum, o) => sum + (o.qty || 0), 0) - Math.floor(currentData.di1)}
                    </div>
                    <div>0</div>
                    <div>{Math.floor(currentData.line_speed * 0.9)}</div><div>{formatDuration(todayRunTime)}</div><div>{formatDuration(todayStopTime)}</div><div>{stopReasons.length}</div>
                </div>
                {/* Current Job (Reset per order) */}
                <div className={styles.statsRow}>
                    <div className={styles.statsRowLabel} style={{ color: 'var(--primary-blue)' }}>{t('dashboard.stats.currentJob')}</div>
                    <div>0</div>
                    <div>{currentOrder.qty || 0}</div>
                    <div>{Math.floor(currentData.di1 - resetOffset)}</div>
                    <div style={{ color: 'var(--digital-text-red)' }}>
                        {(currentOrder.qty || 0) - Math.floor(currentData.di1 - resetOffset)}
                    </div>
                    <div>0</div>
                    <div>{Math.floor(currentData.line_speed)}</div>
                    <div>{formatDuration(jobRunTime)}</div><div>{formatDuration(jobStopTime)}</div><div>{stopReasons.length}</div>
                </div>
            </div>

            {/* Split Section */}
            <div className={styles.splitSection}>
                {/* Schedule Panel */}
                {/* Schedule Panel */}
                <div className={styles.schedulePanel} style={{ position: 'relative' }}>

                    {/* Running Order Section (The Green Box) - Dynamic colors based on prep time */}
                    <div style={{ padding: '8px 12px', borderBottom: '2px solid var(--bg-secondary)', marginBottom: '4px' }}>
                        {(() => {
                            // 計算動態背景色和邊框色
                            let bgColor = 'var(--bg-primary)'; // 預設白色
                            let borderColor = 'var(--status-ok)'; // 預設綠色邊框

                            if (!isContinuousProduction && orders[0] && orders[0].id !== 'placeholder') {
                                // 未達連續生產：根據準備時間變化顏色
                                bgColor = getPrepTimeColor(prepTimeSeconds);
                                const stdPrepTimeSec = thresholdSettings.stdPrepTime * 60;
                                const yellowThresholdSec = stdPrepTimeSec * (thresholdSettings.prepTimeYellowThreshold / 100);

                                if (prepTimeSeconds < stdPrepTimeSec) {
                                    borderColor = 'var(--status-ok)'; // 綠色
                                } else if (prepTimeSeconds <= yellowThresholdSec) {
                                    borderColor = 'var(--status-warning)'; // 黃色
                                } else {
                                    borderColor = 'var(--status-error)'; // 紅色
                                }
                            }

                            // 計算剩餘數量和字體顏色
                            const currentQty = Math.floor(currentData.di1 - resetOffset);
                            const orderQty = orders[0]?.qty || 0;
                            const remaining = orderQty - currentQty;
                            const isNearComplete = remaining > 0 && remaining <= thresholdSettings.shortageThreshold;
                            const textColor = isNearComplete ? 'var(--status-ok)' : 'var(--text-primary)'; // 接近完成時字體變綠

                            return (
                                <div style={{
                                    border: `3px solid ${borderColor}`,
                                    borderRadius: '6px',
                                    backgroundColor: bgColor,
                                    minHeight: '60px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 10px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    transition: 'background-color 0.5s, border-color 0.5s'
                                }}>
                                    {(!orders[0] || orders[0].id === 'placeholder') ? (
                                        <div style={{ width: '100%', textAlign: 'center', color: '#999', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            【 {t('dashboard.monitor.idle')} 】 - {t('dashboard.monitor.waitForF3')}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: textColor }}>
                                            {/* Using same flex ratios as header for alignment */}
                                            <div style={{ flex: 0.8, color: borderColor }}>{t('dashboard.monitor.running')}</div>
                                            <div style={{ flex: 2 }}>{orders[0].customer || '-'}</div>
                                            <div style={{ flex: 1.5 }}>{orders[0].orderNo}</div>
                                            <div style={{ flex: 1.5 }}>{orders[0].boxNo}</div>
                                            <div style={{ flex: 1 }}>{orders[0].qty}</div>
                                            <div style={{ flex: 1.5 }}>{orders[0].msg || orders[0].productName}</div>
                                            <div style={{ flex: 1 }}>{orders[0].boxType || '-'}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Schedule List Header */}
                    <div className={styles.gridHeaderRow}>
                        <div style={{ flex: 0.8 }}>{t('dashboard.schedule.seqNo')}</div>
                        <div style={{ flex: 2 }}>{t('dashboard.schedule.customer')}</div>
                        <div style={{ flex: 1.5 }}>{t('dashboard.schedule.orderNo')}</div>
                        <div style={{ flex: 1.5 }}>{t('dashboard.schedule.boxNo')}</div>
                        <div style={{ flex: 1 }}>{t('dashboard.schedule.qty')}</div>
                        <div style={{ flex: 1.5 }}>{t('dashboard.schedule.productName')}</div>
                        <div style={{ flex: 1 }}>{t('dashboard.schedule.boxType')}</div>
                    </div>

                    {/* Render Order List (Queue Only - Index 1+) */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {orders.slice(1).map((order, index) => {
                            // original index = index + 1
                            const displaySeq = (index + 1) * 10;

                            return (
                                <div
                                    key={order.id}
                                    className={styles.gridRow}
                                    style={selectedOrderId === order.id ? { backgroundColor: '#e6f7ff' } : {}}
                                    onClick={() => setSelectedOrderId(order.id)} // Allow selecting queued items
                                >
                                    <div style={{ flex: 0.8 }}>{displaySeq}</div>
                                    <div style={{ flex: 2 }}>{order.customer || '-'}</div>
                                    <div style={{ flex: 1.5 }}>{order.orderNo}</div>
                                    <div style={{ flex: 1.5 }}>{order.boxNo}</div>
                                    <div style={{ flex: 1 }}>{order.qty}</div>
                                    <div style={{ flex: 1.5 }}>{order.msg || order.productName}</div>
                                    <div style={{ flex: 1 }}>{order.boxType || '-'}</div>
                                </div>
                            );
                        })}
                        {orders.length <= 1 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                                {t('dashboard.schedule.noQueuedOrders')}
                            </div>
                        )}
                        <div className={styles.gridFill}></div>
                    </div>
                </div>

                {/* Status Panel (with Auto Next Toggle) */}
                <div className={styles.machineStatusPanel}>
                    {/* Auto Next Indicator */}
                    <div style={{
                        backgroundColor: autoNext ? 'var(--bg-block)' : 'var(--bg-secondary)',
                        color: autoNext ? 'var(--primary-blue)' : 'var(--text-secondary)',
                        padding: '8px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        borderBottom: '1px solid var(--border-color)'
                    }}>
                        {autoNext ? t('dashboard.schedule.autoNextOn') : t('dashboard.schedule.autoNextOff')}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                        <div
                            style={{
                                flex: 1,
                                padding: '8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: activeTab === 'status' ? 'var(--bg-panel)' : 'var(--bg-secondary)',
                                color: activeTab === 'status' ? 'var(--primary-blue)' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'status' ? '600' : 'normal',
                                borderBottom: activeTab === 'status' ? '2px solid var(--primary-blue)' : 'none'
                            }}
                            onClick={() => setActiveTab('status')}
                        >
                            {t('dashboard.machineStatus.title')}
                        </div>
                        <div
                            style={{
                                flex: 1,
                                padding: '8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: activeTab === 'reason' ? 'var(--bg-panel)' : 'var(--bg-secondary)',
                                color: activeTab === 'reason' ? 'var(--primary-blue)' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'reason' ? '600' : 'normal',
                                borderBottom: activeTab === 'reason' ? '2px solid var(--primary-blue)' : 'none'
                            }}
                            onClick={() => setActiveTab('reason')}
                        >
                            {t('dashboard.machineStatus.stopReason')}
                        </div>
                    </div>

                    {/* Machine Status - Dynamic Sections */}
                    {activeTab === 'status' ? (
                        <div className={styles.errorList} style={{ padding: '10px' }}>
                            {machineSections && machineSections.length > 0 ? (
                                machineSections.map((section, i) => {
                                    // Status Logic
                                    // 1. Fault maps to Red
                                    let isFault = false;
                                    if (section.errorSignal && currentData) {
                                        const signalVal = currentData[section.errorSignal];
                                        // Compare loosely (string/number)
                                        // eslint-disable-next-line eqeqeq
                                        if (signalVal != undefined && signalVal == section.errorValue) {
                                            isFault = true;
                                        }
                                    }

                                    // 2. Run maps to Green
                                    let isRun = false;
                                    if (section.runSignal && currentData) {
                                        const signalVal = currentData[section.runSignal];
                                        // eslint-disable-next-line eqeqeq
                                        if (signalVal != undefined && signalVal == section.runValue) {
                                            isRun = true;
                                        }
                                    }

                                    // 3. Fallback (Global Motor)
                                    // If no specific signals configured, use global IsMotorOn
                                    if (!section.errorSignal && !section.runSignal) {
                                        isFault = !(isPlcConnected && isMotorOn);
                                        isRun = !isFault;
                                    }

                                    // Determine Color
                                    let color = 'var(--text-secondary)'; // Grey
                                    if (isFault) color = 'var(--digital-text-red)';
                                    else if (isRun) color = 'var(--digital-text)'; // Green

                                    return (
                                        <div key={section.id || i} className={styles.errorItem}>
                                            <div className={styles.errorBox} style={{ backgroundColor: color }}></div>
                                            <span>{section.name}</span>
                                            <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: color }}>
                                                {isFault ? 'ERR' : (isRun ? 'RUN' : 'OFF')}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ color: '#888', textAlign: 'center' }}>{t('ui.messages.loading')}</div>
                            )}
                        </div>
                    ) : (
                        // Reason Tab
                        <div className={styles.errorList} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className={styles.statusHeaderRow} style={{ background: 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ flex: 1 }}>{t('dashboard.stopReasons.startTime')}</div>
                                <div style={{ flex: 1 }}>{t('dashboard.stopReasons.duration')}</div>
                                <div style={{ flex: 2 }}>{t('dashboard.stopReasons.reason')}</div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {stopReasons.length === 0 ? (
                                    <div style={{ padding: '16px', color: 'var(--text-secondary)', textAlign: 'center' }}>{t('ui.messages.noData')}</div>
                                ) : (
                                    stopReasons.map((stop, i) => (
                                        <div key={i} style={{ display: 'flex', borderBottom: '1px solid var(--bg-secondary)', padding: '8px 4px', fontSize: '0.9rem' }}>
                                            <div style={{ flex: 1, color: 'var(--text-primary)' }}>{stop.time}</div>
                                            <div style={{ flex: 1, color: 'var(--primary-blue)' }}>{stop.duration}</div>
                                            <div style={{ flex: 2, color: 'var(--digital-text-red)' }}>{stop.reason}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>



            <OrderDetailsModal
                isOpen={showOrderModal}
                onClose={() => setShowOrderModal(false)}
                order={
                    selectedOrderId
                        ? orders.find(o => o.id === selectedOrderId)
                        : (orders.length > 0 && orders[0].id !== 'placeholder' ? orders[0] : null)
                }
                onSave={(updatedOrder) => {
                    // 只更新當前訂單，不會影響產品庫
                    setOrders(prev => prev.map(o =>
                        o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o
                    ));
                    addLog(`Order ${updatedOrder.id} updated (訂單規格修改，不影響產品庫)`);
                }}
            />
            <StopReasonModal isOpen={showStopReasonModal} onClose={() => setShowStopReasonModal(false)} onSelect={handleAddStopReason} />
            <FinishOrderModal
                isOpen={showFinishModal}
                onClose={() => setShowFinishModal(false)}
                onConfirm={handleConfirmFinish}
                initialData={{
                    operator: user.name,
                    qty: Math.floor(currentData.di1 - resetOffset),
                    targetQty: orders[0]?.qty || 0
                }}
            />
            <ProductFormModal
                isOpen={showProductModal}
                onClose={() => setShowProductModal(false)}
                onSave={handleSaveOrder}
                initialData={editingOrder}
            />
        </div >
    );
};

export default Dashboard;
