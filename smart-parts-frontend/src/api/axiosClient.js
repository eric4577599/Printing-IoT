import axios from 'axios';

const axiosClient = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to inject Token
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor to handle 401 (Token Expired)
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error('API: Unauthorized, redirecting to login...');
            localStorage.removeItem('token');
            window.location.href = '/login'; // Or redirect back to Main IoT App
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
