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

// Request Interceptor: Thêm JWT Bearer Token vào header của request & tự động bổ sung Idempotency-Key
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Tự động gán Idempotency-Key cho các request thay đổi dữ liệu (POST, PUT, PATCH, DELETE) nếu chưa có
    const method = config.method?.toLowerCase();
    if (config.headers && ['post', 'put', 'patch', 'delete'].includes(method || '')) {
      if (!config.headers['Idempotency-Key']) {
        config.headers['Idempotency-Key'] =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Trạng thái xoay vòng Refresh Token (tránh race condition nhiều request 401 cùng lúc)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Định dạng lỗi từ .NET Web API & Xoay vòng Refresh Token (FE-07 / P3-02)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError<ProblemDetails>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response) {
      const { status, data } = error.response;

      // Xử lý 401: Tự động Refresh Token xoay vòng (FE-07)
      if (status === 401 && originalRequest && !originalRequest._retry) {
        // Không lặp lại nếu chính route refresh / login bị 401
        if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // Nếu đang có request refresh đang chạy ngầm, xếp hàng chờ token mới
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Gọi API refresh độc lập bằng axios để không chạy qua interceptor này
          const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const newAccessToken = refreshRes.data.accessToken;
          const newRefreshToken = refreshRes.data.refreshToken;

          localStorage.setItem('access_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      // Xử lý 403: Không có quyền truy cập
      if (status === 403) {
        const forbiddenMsg = (data as any)?.detail || (data as any)?.message || 'Bạn không có quyền thực hiện thao tác này.';
        return Promise.reject(new Error(forbiddenMsg));
      }

      // Xử lý 429: Vượt ngưỡng Rate Limit (P3-01 / BUG-17)
      if (status === 429) {
        return Promise.reject(new Error('Hệ thống đang bận hoặc bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ 1 phút rồi thử lại.'));
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
