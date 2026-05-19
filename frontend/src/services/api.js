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

export const reorderOrders = async (orderedIds) => {
    const response = await api.post('/orders/reorder', orderedIds);
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

export const testMqttConnection = async () => {
    const response = await api.post('/simulation/test-mqtt');
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

// --- Maintenance ---
export const getMaintenanceSchedules = async () => {
    const response = await api.get('/maintenance/schedules');
    return response.data;
};

export const createMaintenanceSchedule = async (schedule) => {
    const response = await api.post('/maintenance/schedules', schedule);
    return response.data;
};

export const getSpareParts = async () => {
    const response = await api.get('/maintenance/parts');
    return response.data;
};

export const createSparePart = async (part) => {
    const response = await api.post('/maintenance/parts', part);
    return response.data;
};

export const getMaintenanceRecords = async () => {
    const response = await api.get('/maintenance/records');
    return response.data;
};

export const createMaintenanceRecord = async (record) => {
    const response = await api.post('/maintenance/records', record);
    return response.data;
};
