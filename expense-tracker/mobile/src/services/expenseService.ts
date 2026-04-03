import api from './api';

export interface Expense {
  id: string;
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  amount: number;
  currency: string;
  description: string;
  merchant: string;
  notes: string;
  tags: string[];
  date: string;
  source: 'manual' | 'ocr' | 'voice';
  created_at: string;
}

export interface ExpenseInput {
  category_id?: number;
  amount: number;
  currency?: string;
  description?: string;
  merchant?: string;
  notes?: string;
  tags?: string[];
  date?: string;
  source?: string;
}

export const expenseService = {
  getAll: (params?: Record<string, any>) =>
    api.get('/expenses', { params }).then((r) => r.data),

  getOne: (id: string) =>
    api.get(`/expenses/${id}`).then((r) => r.data),

  create: (data: ExpenseInput) =>
    api.post('/expenses', data).then((r) => r.data),

  update: (id: string, data: Partial<ExpenseInput>) =>
    api.put(`/expenses/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/expenses/${id}`).then((r) => r.data),

  scanOCR: async (imageUri: string) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'scan.jpg',
    } as any);

    return api.post('/ocr/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // OCR can take time
    }).then((r) => r.data);
  },
};

export const analyticsService = {
  monthly: (month?: number, year?: number) =>
    api.get('/analytics/monthly', { params: { month, year } }).then((r) => r.data),

  yearly: (year?: number) =>
    api.get('/analytics/yearly', { params: { year } }).then((r) => r.data),

  insights: () =>
    api.get('/analytics/insights').then((r) => r.data),
};

export const budgetService = {
  getAll: (month?: number, year?: number) =>
    api.get('/budgets', { params: { month, year } }).then((r) => r.data),

  upsert: (data: { category_id: number; amount: number; month?: number; year?: number }) =>
    api.post('/budgets', data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/budgets/${id}`).then((r) => r.data),
};

export const userService = {
  getProfile: () => api.get('/users/profile').then((r) => r.data),
  updateProfile: (data: any) => api.put('/users/profile', data).then((r) => r.data),
  changePassword: (data: any) => api.put('/users/change-password', data).then((r) => r.data),
  getCategories: () => api.get('/users/categories').then((r) => r.data),
  exportCSV: () => api.get('/users/export-csv', { responseType: 'text' }).then((r) => r.data),
};
