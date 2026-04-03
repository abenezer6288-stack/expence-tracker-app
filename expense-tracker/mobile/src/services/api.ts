import axios from 'axios';
import { storage } from '../utils/storage';

// For physical device testing, use your computer's IP address
// For web browser testing, use localhost
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.99.187:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await storage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data;

        await storage.setItem('accessToken', accessToken);
        await storage.setItem('refreshToken', newRefresh);

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
