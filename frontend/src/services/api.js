import axios from 'axios';
import { getToken, getRefreshToken, saveSession, clearAuth } from './authStorage';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 認證端點路徑(baseURL 已含 /api,故此處為 /v1/auth/*)
const LOGIN_PATH = '/v1/auth/login';
const REFRESH_PATH = '/v1/auth/refresh';
const LOGOUT_PATH = '/v1/auth/logout';

/**
 * 判斷一次請求是否打向登入端點。
 * 輸入:axios 設定物件;輸出:布林;
 * 邏輯:比對 config.url 尾段,避免把「密碼打錯的 401」誤判成「權杖失效的 401」。
 */
const isLoginRequest = (config) => {
    const url = config?.url || '';
    return url.includes(LOGIN_PATH);
};

/**
 * 判斷一次請求是否打向刷新 / 登出端點(S7)。
 * 輸入:axios 設定物件;輸出:布林;
 * 邏輯:這兩個端點自己回 401 時**不得**再觸發一次刷新 —— 否則刷新失敗會遞迴自打。
 */
const isSessionEndpoint = (config) => {
    const url = config?.url || '';
    return url.includes(REFRESH_PATH) || url.includes(LOGOUT_PATH);
};

// 同時只允許一次換發。多個請求同時撞到 401 時共用同一個 promise,
// 否則每個請求各自拿同一張刷新憑證去換,第二個之後會踩到後端的重用偵測而被全數作廢。
let refreshPromise = null;

/**
 * 觸發全域登出(S7 抽出)。
 * 輸入:無;輸出:無;
 * 邏輯:清空認證儲存並派發事件,由 AuthContext 同步畫面狀態。
 */
const forceLogout = () => {
    clearAuth();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
};

/**
 * 以刷新憑證換發新的連線階段(S7)。
 * 輸入:無(自 authStorage 取憑證);
 * 輸出:布林 —— 是否換發成功;
 * 邏輯:沒有憑證直接回 false(等同舊行為:401 就登出);
 *       成功則把新的權杖、憑證與到期時間一起寫回儲存。
 *       任何錯誤都吞掉並回 false —— 換發失敗的處置是登出,不該讓錯誤再往上炸一層。
 */
const runRefresh = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await api.post(REFRESH_PATH, { refreshToken });
        const data = response?.data;
        if (!data?.token) return false;
        saveSession(data.token, data.refreshToken, data.expiresAt);
        return true;
    } catch {
        return false;
    }
};

// 請求攔截器:有權杖才掛 Authorization,無權杖時絕不留下空標頭
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 回應攔截器(S7 改寫):非登入端點的 401 先試著以刷新憑證換發並重送原請求,
// 換不到才視為權杖失效並觸發全域登出。
//
// 這是 E2 的解法:2 小時到期後不再是「下一次操作直接被踢出、未存檔的表單資料消失」,
// 而是使用者無感地換一張新權杖,原請求照常完成。
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error?.config;

        // 無 response 代表網路錯誤 / 後端不可達,絕不可當成 401 而把使用者登出
        if (error?.response?.status !== 401) return Promise.reject(error);

        // 403 走不到這裡;登入端點的 401 是「密碼打錯」,不是權杖失效
        if (!config || isLoginRequest(config)) return Promise.reject(error);

        // 刷新 / 登出端點自己回 401 交給呼叫端(runRefresh)判讀,不在此遞迴自打
        if (isSessionEndpoint(config)) return Promise.reject(error);

        // 每個原始請求只重試一次,避免換發成功但後端仍回 401 時無限重送
        if (!config.__authRetried && getRefreshToken()) {
            config.__authRetried = true;

            if (!refreshPromise) {
                refreshPromise = runRefresh().finally(() => { refreshPromise = null; });
            }
            const pending = refreshPromise;

            if (await pending) return api.request(config);
        }

        forceLogout();
        return Promise.reject(error);
    }
);

/**
 * 登入並取得 JWT。
 * 輸入:帳號、密碼;
 * 輸出:後端 LoginResponse({ token, username, roles, displayName, expiresAt });
 * 邏輯:POST /v1/auth/login;失敗(401)由呼叫端捕捉,攔截器刻意不對登入端點做全域登出。
 */
export const login = async (username, password) => {
    const response = await api.post(LOGIN_PATH, { username, password });
    return response.data;
};

/**
 * 登出(S7)。
 * 輸入:刷新憑證;輸出:無;
 * 邏輯:POST /v1/auth/logout 作廢該張憑證。**盡力而為** ——
 *       後端不可達時仍要讓本機登出成功,否則斷網的現場會連登出都做不到。
 *       存取權杖本身無法撤銷(JWT 無狀態),最長仍有 2 小時殘命。
 */
export const logoutSession = async (refreshToken) => {
    if (!refreshToken) return;
    try {
        await api.post(LOGOUT_PATH, { refreshToken });
    } catch {
        // 盡力而為,不阻斷本機登出
    }
};

/**
 * 取得使用者名冊(S7)。
 * 輸入:無;
 * 輸出:UserSummary 陣列({ id, username, displayName, shift, roles, isActive, createdAt });
 * 邏輯:GET /v1/auth/users,**僅 ADMIN 可呼叫**,其餘角色後端回 403,由呼叫端轉為唯讀提示。
 */
export const getUsers = async () => {
    const response = await api.get('/v1/auth/users');
    return response.data;
};

/**
 * 建立使用者(S7)。
 * 輸入:{ username, password, role, displayName, shift };
 * 輸出:建立後的 UserSummary;
 * 邏輯:POST /v1/auth/users。密碼有後端強度規則(預設至少 12 碼),
 *       違反時回 400 並帶訊息,呼叫端直接顯示後端訊息而非自行猜測規則。
 */
export const createUser = async (payload) => {
    const response = await api.post('/v1/auth/users', payload);
    return response.data;
};

/**
 * 更新使用者(S7)。
 * 輸入:使用者 id、{ displayName, shift, role, password, isActive }(全部選填);
 * 輸出:無(後端回 204);
 * 邏輯:PUT /v1/auth/users/{id}。只送有值的欄位 —— 密碼留空代表不改密碼,
 *       送空字串會被後端當成「要改成空密碼」而回 400。
 *       停用最後一位啟用中的 ADMIN 時後端回 409,由呼叫端顯示訊息。
 */
export const updateUser = async (id, payload) => {
    const response = await api.put(`/v1/auth/users/${id}`, payload);
    return response.data;
};

/**
 * 讀取單一系統設計文件(doc/*.md)的原始 Markdown。
 * 輸入:檔名(如 'HANDOVER.md',內含中文或空白時由本函式負責百分比編碼);
 * 輸出:Markdown 純文字字串;
 * 邏輯:走同一個 axios instance,因此請求攔截器會補上 Authorization ——
 *       S5 起 /api/docs 已加 [Authorize],用瀏覽器原生 fetch 會因缺權杖固定回 401。
 *       後端回的是 text/markdown,故指定 responseType 'text' 避免 axios 誤判為 JSON。
 */
export const getDocument = async (filePath) => {
    const response = await api.get(`/docs/${encodeURIComponent(filePath)}`, { responseType: 'text' });
    return response.data;
};

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
 * 取得後端彙總(S8)
 * @param {'daily'|'monthly'|'stop-reasons'} kind - 要哪一組彙總
 * @param {Object} params - 查詢條件
 * @param {string} [params.from] - 起始工廠日 YYYY-MM-DD(含)
 * @param {string} [params.to] - 結束工廠日 YYYY-MM-DD(含)
 * @param {string} [params.shift] - 班別;'全部' 或空值視為不過濾
 * @returns {Promise<Object|Array>} daily 回物件、monthly 回 { dailyRows, totals }、stop-reasons 回陣列
 * @description 彙總端點刻意不分頁 —— 資料量超過後端上限時回 400 而不是截斷,
 *              呼叫端會拿到 axios 錯誤,由上層 hook 轉成降級並顯示原因(見 spec20260906-s8-v1 §1.4)。
 *              班別的 '全部' 是前端的 UI 值,不是後端語彙,在這裡就濾掉不往下送。
 */
export const getProductionSummary = async (kind, { from, to, shift } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (shift && shift !== '全部') params.shift = shift;

    const response = await api.get(`/production/summary/${kind}`, { params });
    return response.data;
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
