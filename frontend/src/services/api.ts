import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { APIError } from '../types/api.types';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for logging
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log request in development
    if (import.meta.env.VITE_APP_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.VITE_APP_ENV === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error: AxiosError<APIError>) => {
    // Enhanced error handling
    const errorMessage = error.response?.data?.detail || error.message || 'An unexpected error occurred';
    const status = error.response?.status || 500;

    console.error('[API Response Error]', {
      message: errorMessage,
      status,
      url: error.config?.url,
      method: error.config?.method,
    });

    // Create normalized error object
    const apiError: APIError = {
      detail: errorMessage,
      status,
    };

    return Promise.reject(apiError);
  }
);

export default api;
