import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getOrders = async (status) => {
    const params = status ? { status } : {};
    const response = await api.get('/orders', { params });
    return response.data;
};

export const createOrder = async (order) => {
    const response = await api.post('/orders', order);
    return response.data;
};

export const updateOrderStatus = async (id, status) => {
    const response = await api.put(`/orders/${id}/status?status=${status}`);
    return response.data;
};

// 全欄位更新(Phase 2:編輯排程列時同步後端;body 為後端 Order payload,含 specJson)
export const updateOrder = async (id, order) => {
    const response = await api.put(`/orders/${id}`, order);
    return response.data;
};

// 刪除後端訂單(Phase 2:刪除排程列時同步)
export const deleteOrder = async (id) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
};

export const reorderOrders = async (orderedIds) => {
    const response = await api.post('/orders/reorder', orderedIds);
    return response.data;
};

// 排程同步(S1 / DF-04):上傳 { orders, deleteIds }。
// 後端只 upsert orders 內的列(第 i 筆 sequence = i)並刪除 deleteIds 明確列出的列,
// 清單外的既有排程一律保留(不再全量鏡像刪除)。回傳同步後的正規清單。
export const syncSchedule = async (orders, deleteIds = []) => {
    const response = await api.post('/orders/sync', { orders, deleteIds });
    return response.data;
};

export const getRealtimeData = async () => {
    const response = await api.get('/monitor/realtime');
    return response.data; // Expects { deviceId, speed, totalLength, status, timestamp }
};

export const getProductionHistory = async (page = 1, pageSize = 50) => {
    const response = await api.get('/monitor/history', { params: { page, pageSize } });
    return response.data;
};

// TODO(Phase3): Implement real CurrentOrder endpoints after backend unification
// Tracked in: doc/REFACTORING_LOG.md#1.4
export const setCurrentOrder = async (orderData) => {
    console.warn('[STUB] setCurrentOrder — not yet connected to backend', orderData);
    return Promise.resolve({ success: true });
};

export const clearCurrentOrder = async () => {
    console.warn('[STUB] clearCurrentOrder — not yet connected to backend');
    return Promise.resolve({ success: true });
};



// Settings API
export const getCommunicationSettings = async () => {
    const response = await api.get('/settings/communication');
    return response.data;
};

export const updateCommunicationSettings = async (settings) => {
    const response = await api.put('/settings/communication', settings);
    return response.data;
};

export const getMachineSections = async () => {
    const response = await api.get('/settings/machine-sections');
    return response.data;
};

export const createMachineSection = async (section) => {
    const response = await api.post('/settings/machine-sections', section);
    return response.data;
};

export const updateMachineSection = async (section) => {
    const response = await api.put(`/settings/machine-sections/${section.id}`, section);
    return response.data;
};

export const deleteMachineSection = async (id) => {
    const response = await api.delete(`/settings/machine-sections/${id}`);
    return response.data;
};

export const updateSimulationSpeed = async (speedFactor) => {
    const response = await api.post('/simulation/speed', { speedFactor });
    return response.data;
};

// 修正 #10:原本不收參數,呼叫端傳入的 host/port/device_type 全被丟棄。改為轉發 config 至後端。
export const testMqttConnection = async (config = {}) => {
    const response = await api.post('/simulation/test-mqtt', config);
    return response.data;
};

export const getBoxTypes = async () => {
    const response = await api.get('/settings/box-types');
    return response.data;
};

export const updateBoxTypes = async (types) => {
    const response = await api.put('/settings/box-types', types);
    return response.data;
};

// ---------------------------------------------------------------------------
// S3 / F6:完工實績落地後端(後端才是實績的權威來源,localStorage 降級為離線快取)
// ---------------------------------------------------------------------------

/**
 * 送出一筆完工實績到後端
 * @param {Object} payload - 完工實績本體,形狀見 docs/spec20260903-s3-v1.md §F2
 *                           (含 clientRecordId 冪等鍵、defects、stops)
 * @returns {Promise<Object>} 後端回應,含 productionDate / oee / availabilityRate 等後端算出的欄位
 * @description 同一 clientRecordId 重送會得到 duplicated: true 且資料庫不長第二筆(冪等)。
 */
export const createProductionCompletion = async (payload) => {
    const response = await api.post('/production/completions', payload);
    return response.data;
};

/**
 * 依工廠日區間查詢完工實績
 * @param {Object} params - 查詢條件
 * @param {string} [params.from] - 起始工廠日 YYYY-MM-DD(含)
 * @param {string} [params.to] - 結束工廠日 YYYY-MM-DD(含)
 * @param {number} [params.page=1] - 頁碼
 * @param {number} [params.pageSize=50] - 每頁筆數(後端上限 500)
 * @returns {Promise<Array>} 完工實績清單(含 defects / stops 明細)
 */
export const getProductionCompletions = async ({ from, to, page = 1, pageSize = 50 } = {}) => {
    const params = { page, pageSize };
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await api.get('/production/completions', { params });
    return response.data;
};

/**
 * 逐頁抓取指定工廠日區間的全部完工實績
 * @param {Object} params - 查詢條件
 * @param {string} [params.from] - 起始工廠日 YYYY-MM-DD(含);省略則不限該端
 * @param {string} [params.to] - 結束工廠日 YYYY-MM-DD(含);省略則不限該端
 * @param {number} [params.pageSize=500] - 每頁筆數(後端上限 500,超過由後端夾)
 * @param {number} [params.maxPages=20] - 硬上限頁數,防止無限迴圈打 API
 * @returns {Promise<{ items: Array, pageCount: number, truncated: boolean }>}
 *          items 為串接後的完整清單;truncated = true 表示觸到硬上限、資料未取完
 * @description 後端回的是裸 JSON 陣列、沒有 total / hasNext 信封(見 spec20260905-s4-v1 §1.3),
 *              因此「取完了沒」只能靠「本頁筆數 < pageSize」判斷,這是唯一可靠的終止條件。
 *              代價是總筆數恰為 pageSize 倍數時會多打一次回空陣列的請求,以正確性換取。
 *
 *              任一頁拋錯時整個函式拋出(不在此吞例外),由上層 hook 轉成降級 —— 否則上層
 *              分不清「取完了」與「取到一半炸了」,會把半份資料當成完整資料呈現。
 *              回應不是陣列(後端日後改成信封)時視該頁為 0 筆並結束,不讓 .length 爆 TypeError。
 */
export const getAllProductionCompletions = async ({ from, to, pageSize = 500, maxPages = 20 } = {}) => {
    const items = [];
    let pageCount = 0;
    let truncated = false;

    for (let page = 1; page <= maxPages; page++) {
        const data = await getProductionCompletions({ from, to, page, pageSize });
        pageCount++;

        if (!Array.isArray(data)) break;
        items.push(...data);

        // 短頁 = 已取完(唯一可靠的終止條件)
        if (data.length < pageSize) {
            truncated = false;
            break;
        }
        // 滿頁(或異常地超過滿頁)代表可能還有下一頁;已用完硬上限就標示未取完
        if (page === maxPages) truncated = true;
    }

    return { items, pageCount, truncated };
};

/**
 * 取得工廠時區與日界設定
 * @returns {Promise<{ timeZone: string, dayBoundaryHour: number }>} 工廠日換算所需參數
 * @description 前端算本地快取紀錄的工廠日時取得與後端同一組參數,不必把 8 寫死在前端。
 */
export const getFactoryTimeSettings = async () => {
    const response = await api.get('/settings/factory-time');
    return response.data;
};

// ---------------------------------------------------------------------------
// S3 / F8:停機 / 不良原因主檔(設定頁與現場彈窗共用同一份資料)
// ---------------------------------------------------------------------------

/**
 * 取得指定類別的原因清單
 * @param {string} type - 'stop' | 'defect'
 * @param {boolean} [includeInactive=false] - 是否含已軟刪除的原因
 * @returns {Promise<Array>} 依 displayOrder → code 升冪的原因清單
 */
export const getReasonCodes = async (type, includeInactive = false) => {
    const response = await api.get('/reasons', { params: { type, includeInactive } });
    return response.data;
};

/**
 * 建立一筆原因
 * @param {string} type - 'stop' | 'defect'
 * @param {Object} reason - { code, name, category, displayOrder }
 * @returns {Promise<Object>} 建立後的原因
 * @description 同類別下代碼重複時後端回 409,呼叫端需自行捕捉。
 */
export const createReasonCode = async (type, reason) => {
    const response = await api.post('/reasons', { type, ...reason });
    return response.data;
};

/**
 * 更新一筆原因(只改 name / category / displayOrder / isActive)
 * @param {string} id - 原因 Id
 * @param {Object} reason - 要更新的欄位
 * @returns {Promise<Object>} 後端回應(204 無本體)
 */
export const updateReasonCode = async (id, reason) => {
    const response = await api.put(`/reasons/${id}`, reason);
    return response.data;
};

/**
 * 軟刪除一筆原因
 * @param {string} id - 原因 Id
 * @returns {Promise<Object>} 後端回應(204 無本體)
 * @description 後端為軟刪除(isActive = false),歷史報表仍讀得到當時的原因名稱。
 */
export const deleteReasonCode = async (id) => {
    const response = await api.delete(`/reasons/${id}`);
    return response.data;
};
