import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ProblemDetails } from '@/types/common.types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Format errors from .NET Web API / FluentValidation
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError<ProblemDetails>) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        // Token expired or invalid
        localStorage.removeItem('access_token');
        // Optional: window.location.href = '/login';
      }

      if (status === 400 && data?.errors) {
        // FluentValidation formatted validation errors
        const validationMessages = Object.entries(data.errors)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join('\n');
        return Promise.reject(new Error(validationMessages || data.title || 'Dữ liệu không hợp lệ'));
      }

      const errorMessage = data?.detail || data?.title || error.message || 'Lỗi kết nối máy chủ';
      return Promise.reject(new Error(errorMessage));
    }

    return Promise.reject(new Error('Không thể kết nối đến máy chủ API'));
  }
);

export default apiClient;
