import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://your-flask-app.up.railway.app' 
    : 'http://localhost:5000');

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Flask uses session cookies, no need for tokens
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  sendOTP: async (email) => {
    const response = await api.post('/auth/send-otp', { email });
    return response.data;
  },
  
  verifyOTP: async (email, token) => {
    const response = await api.post('/auth/verify-otp', { email, token });
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// User/Dashboard API
export const userAPI = {
  getDashboard: async () => {
    const response = await api.get('/api/user/dashboard');
    return response.data;
  },
  
  getReferrals: async (page = 1, perPage = 10) => {
    const response = await api.get(`/api/user/referrals?page=${page}&per_page=${perPage}`);
    return response.data;
  },
};

// Referral API
export const referralAPI = {
  signup: async (email) => {
    const response = await api.post('/api/referral/signup', { email });
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getAllReferrals: async (page = 1, perPage = 20, status = '') => {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (status) params.append('status', status);
    
    const response = await api.get(`/admin/referrals?${params}`);
    return response.data;
  },
  
  completeReferral: async (referralId) => {
    const response = await api.put(`/admin/referral/${referralId}/complete`);
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
  
  exportReferrals: async () => {
    const response = await api.get('/admin/export', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Utility function to handle API errors
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    return error.response.data?.error || 'Server error occurred';
  } else if (error.request) {
    // Network error
    return 'Network error. Please check your connection.';
  } else {
    // Other error
    return 'An unexpected error occurred';
  }
};

export default api;