import axios from 'axios';
import type { Store } from '@reduxjs/toolkit';

let storeInstance: Store;

export const setStore = (store: Store) => {
  storeInstance = store;
};

// Determine the base URL based on environment
const baseURL = import.meta.env.PROD 
  ? 'https://api.pokemon-tournaments.netlify.app' // Production API URL
  : 'http://localhost:5000'; // Development API URL

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && storeInstance) {
      const { logout } = await import('../features/auth/authSlice');
      storeInstance.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;