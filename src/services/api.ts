import axios from 'axios';
import type { Store } from '@reduxjs/toolkit';

let storeInstance: Store;

export const setStore = (store: Store) => {
  storeInstance = store;
};

// Determine the base URL based on environment
const getBaseURL = () => {
  // In WebContainer, we need to use the correct internal URL
  if (import.meta.env.DEV) {
    // Development mode - use the WebContainer internal URL
    // The backend should be accessible on the same host but different port
    const currentOrigin = window.location.origin;
    // Replace the port with 5000 for the backend
    const backendURL = currentOrigin.replace(/:\d+/, ':5000');
    return backendURL;
  } else {
    // Production mode
    return 'https://api.pokemon-tournaments.netlify.app';
  }
};

const baseURL = getBaseURL();

console.log('API Base URL:', baseURL);
console.log('Environment:', import.meta.env.MODE);
console.log('Current origin:', window.location.origin);

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Making request to:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      baseURL: error.config?.baseURL
    });
    
    if (error.response?.status === 401 && storeInstance) {
      const { logout } = await import('../features/auth/authSlice');
      storeInstance.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;