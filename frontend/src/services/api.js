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

// 全量鏡像同步(Phase 2):上傳整份排程(後端 Order payload 陣列),
// 後端依序 upsert + 刪除清單外的列,回傳正規清單。
export const syncSchedule = async (orders) => {
    const response = await api.post('/orders/sync', orders);
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
