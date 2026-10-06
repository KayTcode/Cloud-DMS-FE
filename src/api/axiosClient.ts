import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ProblemDetails } from '@/types/common.types';

//Lấy URL của backend từ biến môi trường của Vite
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api';

//Tạo instance của axios với base URL và headers mặc định
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Thêm JWT Bearer Token vào header của request
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

// Response Interceptor: Định dạng lỗi từ .NET Web API / FluentValidation
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError<ProblemDetails>) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        // Token hết hạn hoặc không hợp lệ
        localStorage.removeItem('access_token');
        // Chuyển hướng về trang đăng nhập
        window.location.href = '/login';
      }

      if (status === 400 && data?.errors) {
        if (Array.isArray(data.errors)) {
          const combined = data.errors.filter(Boolean).join('\n');
          return Promise.reject(new Error(combined || (data as any).error || 'Dữ liệu không hợp lệ'));
        }

        if (typeof data.errors === 'object') {
          // Định dạng lỗi từ FluentValidation hoặc object lỗi
          const validationMessages = Object.entries(data.errors)
            .map(([field, msgs]) => {
              if (Array.isArray(msgs)) return `${field}: ${msgs.join(', ')}`;
              return `${field}: ${String(msgs)}`;
            })
            .join('\n');
          return Promise.reject(new Error(validationMessages || (data as any).error || data.title || 'Dữ liệu không hợp lệ'));
        }
      }

      const errorData = data as any;
      const errorMessage = errorData?.message || errorData?.error || data?.detail || data?.title || error.message || 'Lỗi kết nối máy chủ';
      return Promise.reject(new Error(errorMessage));
    }

    return Promise.reject(new Error('Không thể kết nối đến máy chủ API'));
  }
);

export default apiClient;
