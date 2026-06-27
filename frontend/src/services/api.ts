import axios from 'axios';
import { useStore } from '../store/useStore';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Interceptor to inject bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor to handle session expiration (401)
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // Clear state store and signout user
    useStore.getState().logout();
  }
  return Promise.reject(error);
});

export default api;
