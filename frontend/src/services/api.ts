import axios from 'axios';
import { useStore } from '../store/useStore';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
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

// Interceptor to handle standard response unwrapping and session expiration
api.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
    const envelope = response.data;
    const unwrapped = envelope.data;
    
    if (unwrapped && typeof unwrapped === 'object') {
      // Copy other metadata properties to the unwrapped object
      Object.keys(envelope).forEach(key => {
        if (key !== 'data' && !(key in unwrapped)) {
          unwrapped[key] = envelope[key];
        }
      });
      // Set status field if success is true to satisfy 'success' check
      if (envelope.success && !('status' in unwrapped)) {
        unwrapped['status'] = 'success';
      }
      response.data = unwrapped;
    } else {
      if (Array.isArray(unwrapped)) {
        (unwrapped as any).success = envelope.success;
        (unwrapped as any).status = envelope.success ? 'success' : 'error';
        (unwrapped as any).message = envelope.message;
      }
      response.data = unwrapped;
    }
  }
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // Clear state store and signout user
    useStore.getState().logout();
  }
  return Promise.reject(error);
});

export default api;
