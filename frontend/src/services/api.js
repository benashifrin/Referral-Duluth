import axios from 'axios';

// Single source of truth for API URL
export const API_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api.bestdentistduluth.com'
    : 'http://localhost:5000');

// Debug API URL for mobile troubleshooting
console.log('[API Debug] API_URL:', API_URL);
console.log('[API Debug] NODE_ENV:', process.env.NODE_ENV);
console.log('[API Debug] REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

// Detect if running on mobile device
const isMobile = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for session cookies
  timeout: isMobile() ? 15000 : 10000, // Longer timeout for mobile networks
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

// Response interceptor with mobile retry logic
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle unauthorized access
    if (error.response?.status === 401) {
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Mobile retry logic for network issues
    if (!originalRequest._retry && 
        (error.code === 'NETWORK_ERROR' || 
         error.code === 'ECONNABORTED' || 
         error.response?.status >= 500) && 
        isMobile()) {
      
      originalRequest._retry = true;
      
      // Wait 2 seconds before retry on mobile
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Retry the request
      return api(originalRequest);
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
  getUsers: async (page = 1, perPage = 20, q = '') => {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (q) params.append('q', q);
    const response = await api.get(`/admin/users?${params}`);
    return response.data;
  },

  updateUserReferrals: async (userId, { completed, signed_up } = {}) => {
    const payload = {};
    if (typeof completed === 'number') payload.completed = completed;
    if (typeof signed_up === 'number') payload.signed_up = signed_up;
    const response = await api.put(`/admin/user/${userId}/referrals`, payload);
    return response.data;
  },
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
  deleteReferral: async (referralId) => {
    const response = await api.delete(`/admin/referral/${referralId}`);
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

// Utility function to handle API errors with mobile-specific messages
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    return error.response.data?.error || 'Server error occurred';
  } else if (error.request) {
    // Network error - provide mobile-specific guidance
    if (isMobile()) {
      return 'Network error. Please check your mobile connection and try again.';
    }
    return 'Network error. Please check your connection.';
  } else {
    // Other error
    return 'An unexpected error occurred';
  }
};

// Network connectivity check for mobile
export const checkNetworkConnectivity = async () => {
  if (!navigator.onLine) {
    throw new Error('No internet connection detected');
  }
  
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include'  // Important for cookies
    });
    return true;
  } catch (error) {
    throw new Error('Unable to reach server');
  }
};

export default api;
