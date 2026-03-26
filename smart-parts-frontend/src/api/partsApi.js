import axiosClient from './axiosClient';

export const getParts = async (keyword = '') => {
    const response = await axiosClient.get('/parts', { params: { keyword } });
    return response.data; // Expecting { data: [...], total: ... } or just [...] depend on backend
    // Backend returns List<PartDto>, so just response.data
};

export const createPart = async (partData) => {
    const response = await axiosClient.post('/parts', partData);
    return response.data;
};

export const getPartDetail = async (id) => {
    const response = await axiosClient.get(`/parts/${id}`);
    return response.data;
};
