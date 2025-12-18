import axios from 'axios';
import type {
  User,
  Product,
  Customer,
  Supplier,
  Sale,
  Purchase,
  DashboardStats,
  FilterOptions,
  CreateSaleInput,
  CreatePurchaseInput,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 errors (logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  getMe: () => api.get<User>('/auth/me'),
};

// Users API
export const usersAPI = {
  list: (params?: { page?: number; limit?: number }) => api.get('/users', { params }),
  create: (data: { email: string; password: string; name: string }) => api.post('/users', data),
  update: (id: string, data: { name?: string; email?: string; is_active?: boolean }) =>
    api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Products API
export const productsAPI = {
  list: (params?: any) => api.get<{ products: Product[]; total: number; page: number; limit: number }>('/products', { params }),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  updateStock: (id: string, data: { current_stock_boxes: number; notes?: string }) => api.patch(`/products/${id}/stock`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getFilterOptions: () => api.get<FilterOptions>('/products/filter-options'),
};

// Customers API
export const customersAPI = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ customers: Customer[]; total: number; page: number; limit: number }>('/customers', { params }),
  get: (id: string) => api.get<Customer>(`/customers/${id}`),
  autocomplete: (q: string) => api.get<{ suggestions: Customer[] }>('/customers/autocomplete', { params: { q } }),
};

// Suppliers API
export const suppliersAPI = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ suppliers: Supplier[]; total: number; page: number; limit: number }>('/suppliers', { params }),
  create: (data: any) => api.post('/suppliers', data),
  autocomplete: (q: string) => api.get<{ suggestions: Supplier[] }>('/suppliers/autocomplete', { params: { q } }),
};

// Sales API
export const salesAPI = {
  list: (params?: any) => api.get<{ sales: Sale[]; total: number; page: number; limit: number }>('/sales', { params }),
  get: (id: string) => api.get<Sale>(`/sales/${id}`),
  create: (data: CreateSaleInput) => api.post('/sales', data),
  delete: (id: string) => api.delete(`/sales/${id}`),
};

// Purchases API
export const purchasesAPI = {
  list: (params?: any) => api.get<{ purchases: Purchase[]; total: number; page: number; limit: number }>('/purchases', { params }),
  get: (id: string) => api.get<Purchase>(`/purchases/${id}`),
  create: (data: CreatePurchaseInput) => api.post('/purchases', data),
  delete: (id: string) => api.delete(`/purchases/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
};

// Reports API
export const reportsAPI = {
  stock: (params?: any) => api.get('/reports/stock', { params }),
  sales: (params?: any) => api.get('/reports/sales', { params }),
  purchases: (params?: any) => api.get('/reports/purchases', { params }),
};

export default api;
