import { create } from 'zustand';
import api from '../services/api';
import { storage } from '../utils/storage';

interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  monthly_budget: number;
  dark_mode: boolean;
  notifications_enabled: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,

  loadStoredAuth: async () => {
    try {
      const token = await storage.getItem('accessToken');
      const userStr = await storage.getItem('user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, accessToken: token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Load auth error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      console.log('Login attempt:', email);
      const res = await api.post('/auth/login', { email, password });
      console.log('Login response:', res.data);
      const { user, accessToken, refreshToken } = res.data;
      
      console.log('Storing tokens...');
      await storage.setItem('accessToken', accessToken);
      await storage.setItem('refreshToken', refreshToken);
      await storage.setItem('user', JSON.stringify(user));
      
      console.log('Setting authorization header...');
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      console.log('Setting auth state - isAuthenticated: true');
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
      console.log('Login complete!');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  register: async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { user, accessToken, refreshToken } = res.data;
    await storage.setItem('accessToken', accessToken);
    await storage.setItem('refreshToken', refreshToken);
    await storage.setItem('user', JSON.stringify(user));
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    const refreshToken = await storage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {}
    await storage.deleteItem('accessToken');
    await storage.deleteItem('refreshToken');
    await storage.deleteItem('user');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  updateUser: (data) => {
    const updated = { ...get().user, ...data } as User;
    set({ user: updated });
    storage.setItem('user', JSON.stringify(updated));
  },
}));
