import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import mqtt from 'mqtt';
import styles from './Dashboard.module.css';
import SchedulePanel from '../components/dashboard/SchedulePanel';
import StatusPanel from '../components/dashboard/StatusPanel';
import OrderDetailsModal from '../components/modals/OrderDetailsModal';
import StopReasonModal from '../components/modals/StopReasonModal';
import FinishOrderModal from '../components/modals/FinishOrderModal';
import {
    setCurrentOrder, clearCurrentOrder, getRealtimeData, getMachineSections, // Imported
    updateOrderStatus, createProductionCompletion, getFactoryTimeSettings
} from '../services/api';
import { finishHeadOrder, promoteSelectedToHead, returnCurrentToQueue } from '../utils/orderQueue';
import { isGuid } from '../utils/orderMapper';
import { calculateOEE, durationToMinutes } from '../utils/reportUtils';
import { resolveFactoryDate, DEFAULT_DAY_BOUNDARY_HOUR, DEFAULT_TIME_ZONE } from '../utils/factoryDate';
import { useLanguage } from '../modules/language/LanguageContext';

/**
 * 修補 localStorage 內某一筆生產歷史紀錄
 * @param {number|string} recordId - productionRecord.id
 * @param {Object} patch - 要覆寫的欄位
 * @returns {boolean} 是否找到並更新
 * @description S3 / F6:後端落地成功後,把後端算出的工廠日與四個率值寫回離線快取,
 *              讓報表(本輪仍讀 localStorage)顯示的是後端的權威數字。
 *              寫入失敗只記 warning,不得影響現場流程。
 */
const patchProductionRecord = (recordId, patch) => {
    try {
        const history = JSON.parse(localStorage.getItem('productionHistory') || '[]');
        const index = history.findIndex(r => String(r.id) === String(recordId));
        if (index === -1) return false;
        history[index] = { ...history[index], ...patch };
        localStorage.setItem('productionHistory', JSON.stringify(history));
        return true;
    } catch (err) {
        console.warn('回寫生產歷史紀錄失敗', err);
        return false;
    }
};

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
        saveProduct,     // From Context (New)
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

    // WISE DI 模擬:保留機台部位故障訊號(di3~di10)於虛擬 PLC 記憶體。
    // 預設 0(無故障);機台部位在設定頁(MachineTab)可對應不同 DI,實訊號到位前由模擬供值。
    const simulatedDiDefaults = { di3: 0, di4: 0, di5: 0, di6: 0, di7: 0, di8: 0, di9: 0, di10: 0 };

    const [currentData, setCurrentData] = useState({
        line_speed: 0,
        di1: 0,
        status_code: 0,
        ...simulatedDiDefaults
    });

    // Simulation Internal State (Virtual PLC Memory)
    const simStateRef = useRef({
        line_speed: 0,
        di1: 0,
        status_code: 0,
        ...simulatedDiDefaults
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
    const [machineMaxSpeed] = useState(() => {
        const saved = localStorage.getItem('unitSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            return settings.maxSpeed || 350;
        }
        return 350; // 預設值
    });

    // 從設定頁面讀取閾值設定
    const [thresholdSettings] = useState(() => {
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

    // Effect: MQTT 連線(供 remote 模擬發佈與完工紀錄上傳)
    // 修正:mqttClientRef 原本從未 connect,導致 remote 模擬不會發訊、完工紀錄永遠送不到後端。
    // 參考 DebugDashboard 的 getBrokerUrl / mqtt.connect 模式,連 docker-compose 暴露的 ws 9001 埠。
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const brokerUrl = `${protocol}://${window.location.hostname}:9001`;
        const client = mqtt.connect(brokerUrl, {
            clientId: `dashboard_${Math.random().toString(16).substring(2, 8)}`,
            keepalive: 60,
        });
        client.on('connect', () => addLog('MQTT connected'));
        client.on('error', (err) => console.error('MQTT connection error:', err));
        mqttClientRef.current = client;
        return () => {
            client.end();
            mqttClientRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // S3 / F7:工廠時區與日界(啟動時向後端取一次,取不到就用預設 8 / Asia/Taipei)。
    // 用 ref 供 handleConfirmFinish 讀取,避免閉包捕捉到過期的設定值。
    const factoryTimeRef = useRef({ dayBoundaryHour: DEFAULT_DAY_BOUNDARY_HOUR, timeZone: DEFAULT_TIME_ZONE });

    useEffect(() => {
        let cancelled = false;
        getFactoryTimeSettings()
            .then(settings => {
                if (cancelled || !settings) return;
                factoryTimeRef.current = {
                    dayBoundaryHour: Number.isInteger(settings.dayBoundaryHour)
                        ? settings.dayBoundaryHour
                        : DEFAULT_DAY_BOUNDARY_HOUR,
                    timeZone: settings.timeZone || DEFAULT_TIME_ZONE,
                };
            })
            .catch(err => {
                console.warn('取得工廠時間設定失敗,改用預設 08:00 / Asia/Taipei', err);
            });
        return () => { cancelled = true; };
    }, []);

    const handleFinish = () => {
        // 修正:F4 完工透過 currentDataRef 取即時 di1,避免 keydown effect 閉包捕捉到過期 currentData 導致永遠判定「生產數量 0」
        const currentCount = Math.floor(currentDataRef.current.di1 - resetOffset);
        if (currentCount > 0) {
            setShowFinishModal(true);
        } else {
            alert(`${t('dashboard.monitor.productionQty')} 0! ${t('dashboard.logs.f10Return')}`);
            addLog('Finish failed: Count is 0');
        }
    };

    const handleConfirmFinish = (data) => {
        // 修正:原讀不存在的 currentData.total_length(恆為 NaN,連帶 avgSpeed/OEE 全 NaN),改用即時 di1
        const currentCount = Math.floor(currentDataRef.current.di1 - resetOffset);
        // 修正:FinishOrderModal 傳回的是 defects 陣列(非單一 defectQty),需加總各項不良數量
        const defectQty = (data.defects || []).reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
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

        // S3 / GAP-05:三個計時器換成分鐘(後端與報表都以分鐘為單位)
        const prepTimeMinutes = Math.round(prepTimeSeconds / 60 * 10) / 10;
        const runTimeMinutes = Math.round(jobRunTime / 60 * 10) / 10;
        const stopTimeMinutes = Math.round(jobStopTime / 60 * 10) / 10;
        const goodQtyValue = data.goodQty || currentCount;
        const targetQtyValue = finishedOrder.qty || 0;

        // S3 / GAP-05:行內的簡化 OEE 公式整段移除,改呼叫唯一的 calculateOEE
        //(舊公式:效能分子用含不良品的累計計數、分母為零時以 1 假裝滿分、且沒有良率因子)
        const oeeResult = calculateOEE({
            runTime: runTimeMinutes,
            stopTime: stopTimeMinutes,
            prepTime: prepTimeMinutes,
            goodQty: goodQtyValue,
            defectQty,
            targetQty: targetQtyValue,
        });
        const oeeCalc = oeeResult.oee;

        // S3 / F7:完工日改用工廠日規則(舊寫法 toISOString 取的是 UTC 日,
        // 台北 00:00–08:00 完工的大夜班會落在前一個 UTC 日)
        const finishedAtIso = new Date().toISOString();
        const factoryDate = resolveFactoryDate(finishedAtIso, factoryTimeRef.current);

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
            targetQty: targetQtyValue,
            goodQty: goodQtyValue,
            defectQty: defectQty,
            prepTime: prepTimeMinutes,                               // 準備時間（分鐘，保留1位小數）
            runTime: runTimeMinutes,                                 // 運轉時間（分鐘）
            stopTime: stopTimeMinutes,                               // 停車時間（分鐘）
            stopCount: stopReasons.length,                           // 停車次數
            avgSpeed: avgSpeedCalc,                                  // 平均車速（張/分）
            availabilityRate: oeeResult.availability,                // 稼動率（%）
            performanceRate: oeeResult.performance,                  // 效能（%）
            qualityRate: oeeResult.quality,                          // 良率（%）
            oee: oeeCalc,                                            // OEE 百分比
            date: factoryDate,                                       // 工廠日 (YYYY-MM-DD)
            finishedAt: finishedAtIso,                               // 完工時間戳
            syncState: 'pending',                                    // S3 / F6:後端落地成功後改為 'synced'
            defects: (data.defects || []).map(d => ({                // 不良明細（形狀對齊後端 DTO）
                code: d.code,
                reason: d.reason,
                qty: Number(d.qty) || 0
            })),
            stopReasons: stopReasons.map(r => ({                     // 停車原因記錄
                code: r.code || '',
                time: r.time,
                duration: r.duration,
                reason: r.reason
            }))
        };

        try {
            const history = JSON.parse(localStorage.getItem('productionHistory') || '[]');
            history.unshift(productionRecord);
            // 限制保留最近 1000 筆記錄，避免 localStorage 超容量
            // (S3 起這裡只是離線快取,真相在後端 —— 截斷不再等於資料遺失)
            if (history.length > 1000) history.length = 1000;
            localStorage.setItem('productionHistory', JSON.stringify(history));
            addLog(`Production history saved: ${finishedOrder.orderNo}`);
        } catch (err) {
            console.error('Failed to save production history:', err);
        }
        // -----------------------------------------

        // --- S3 / F6:完工實績落地後端(後端才是實績的權威來源)---
        const completionPayload = {
            clientRecordId: String(productionRecord.id),
            orderId: isGuid(finishedOrder.id) ? finishedOrder.id : null,
            orderNumber: productionRecord.orderNo === '-' ? '' : productionRecord.orderNo,
            deviceId: currentDataRef.current?.device_id || '',
            operator: productionRecord.operator,
            shift: productionRecord.shift,
            targetQty: targetQtyValue,
            goodQty: goodQtyValue,
            prepTimeMinutes,
            runTimeMinutes,
            stopTimeMinutes,
            avgSpeed: avgSpeedCalc,
            shortageReason: data.shortageReason || '',
            completedAt: finishedAtIso,
            defects: productionRecord.defects,
            stops: stopReasons.map(r => ({
                code: r.code || '',
                reason: r.reason,
                // S4 / F6:補送停車起始時間(後端 ProductionStopRequest.StartedAt 早已存在,不需後端變更);
                // 沒有 ISO 時間戳的舊項送 null,回讀時由對映層顯示 '-'。
                startedAt: r.startedAtIso || null,
                durationMinutes: durationToMinutes(r.duration),
            })),
        };

        createProductionCompletion(completionPayload)
            .then(result => {
                // 後端算出的工廠日與四個率值覆寫回本地紀錄,避免兩份數字打架
                patchProductionRecord(productionRecord.id, {
                    syncState: 'synced',
                    backendId: result.id,
                    date: result.productionDate || productionRecord.date,
                    oee: result.oee,
                    availabilityRate: result.availabilityRate,
                    performanceRate: result.performanceRate,
                    qualityRate: result.qualityRate,
                });
                addLog(`Completion synced to backend: ${result.id}`);
            })
            .catch(err => {
                // 斷網 / 4xx / 5xx 一律不阻擋現場:不 alert、不中止換單,本地紀錄留 pending
                console.warn('完工實績落地後端失敗,本地紀錄標記為 pending', err);
                addLog('Completion sync FAILED (kept locally as pending)');
            });
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
                    defectQty: defectQty,
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

        // 修正:原僅 orders.length > 1 才處理,佇列剩最後 1 筆完工時工單不移除/計數不歸零/後端不清除。
        // slice(1) 對長度 1 會得到空陣列,可同時處理「換下一筆」與「完成最後一筆」兩種情境。
        if (orders.length >= 1) {
            // S1 / v2.0:完工單不從後端刪除(它是生產紀錄),改回寫狀態為 Completed;
            // 載入端由 isSchedulableBackendOrder 過濾,避免它下次開頁以「執行中」回到佇列。
            const { nextOrders } = finishHeadOrder(orders, { updateStatus: updateOrderStatus });
            setOrders(nextOrders);
            setResetOffset(currentDataRef.current.di1);
            if (orders[1] && selectedOrderId === orders[1].id) setSelectedOrderId(null);

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

        // S4 / F6:除了顯示用的 time 字串,另存一份 ISO 時間戳,
        // 完工時一併送給後端 ProductionStopRequest.StartedAt —— 否則回讀報表時停車起始時間永遠是 '-'。
        setStopReasons(prev => [{
            code: reason.code || '',
            time: startTimeStr,
            startedAtIso: (stopStartTime || endTime).toISOString(),
            duration: durationStr,
            reason: reason.name
        }, ...prev]);
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
                                    // Move selected to 0, remove placeholder(行為保持重構:陣列變換抽到 orderQueue)
                                    const selected = orders[idx];
                                    const newOrders = promoteSelectedToHead(orders, selectedOrderId);

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
                            const returnedOrder = { ...orders[0], status: 'Queued' };

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

                            // 行為保持重構:陣列變換抽到 orderQueue.returnCurrentToQueue,
                            // Auto Next ON 為「與次筆交換」(立即遞補)、Manual 為「插入 placeholder」(綠框留空)。
                            const newOrders = returnCurrentToQueue(orders, { autoNext, placeholder });

                            if (autoNext && orders.length > 1) {
                                addLog(`F10 (Auto): Swapped ${returnedOrder.id} with ${newOrders[0].id}`);
                            } else {
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
                    if (confirm(t('dashboard.alerts.confirmExit'))) {
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
    // eslint-disable-next-line react-hooks/immutability
    currentDataRef.current = currentData; // Update ref directly in render to satisfy strict lint if needed

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
                                <SchedulePanel 
                    orders={orders} selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId}
                    isContinuousProduction={isContinuousProduction} prepTimeSeconds={prepTimeSeconds} 
                    thresholdSettings={thresholdSettings} getPrepTimeColor={getPrepTimeColor}
                    currentData={currentData} resetOffset={resetOffset}
                />
                
                <StatusPanel 
                    autoNext={autoNext} activeTab={activeTab} setActiveTab={setActiveTab} 
                    machineSections={machineSections} currentData={currentData} 
                    isPlcConnected={isPlcConnected} isMotorOn={isMotorOn} stopReasons={stopReasons} 
                />
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
        </div >
    );
};

export default Dashboard;
