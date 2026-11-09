import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ProblemDetails } from '@/types/common.types';

//Lấy URL của backend từ biến môi trường của Vite
export const BASE_URL = '/api';

//Tạo instance của axios với base URL và headers mặc định
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Thêm JWT Bearer Token vào header của request & tự động bổ sung Idempotency-Key
 * cho các request thay đổi dữ liệu (POST, PUT, PATCH, DELETE) nếu chưa có.
 * Dùng chung bởi `apiClient` và bất kỳ axios instance khác cần cùng hành vi
 * (ví dụ: `largeUploadClient.ts`), để chỉ có một nơi định nghĩa logic này.
 */
export function attachAuthAndIdempotency(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = config.method?.toLowerCase();
  if (config.headers && ['post', 'put', 'patch', 'delete'].includes(method || '')) {
    const existingKey = typeof (config.headers as any).get === 'function'
      ? (config.headers as any).get('Idempotency-Key')
      : config.headers['Idempotency-Key'];

    if (!existingKey) {
      const generatedKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('Idempotency-Key', generatedKey);
      }
      config.headers['Idempotency-Key'] = generatedKey;
    }
  }

  // Nếu gửi FormData (upload file), xóa Content-Type để Axios và Browser tự tính kèm boundary chuẩn
  if (config.data instanceof FormData && config.headers) {
    if (typeof (config.headers as any).delete === 'function') {
      (config.headers as any).delete('Content-Type');
    }
    delete config.headers['Content-Type'];
  }

  return config;
}

// Request Interceptor: Thêm JWT Bearer Token vào header của request & tự động bổ sung Idempotency-Key
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => attachAuthAndIdempotency(config),
  (error: AxiosError) => Promise.reject(error)
);

// Trạng thái xoay vòng Refresh Token (tránh race condition nhiều request 401 cùng lúc).
// Module-level nên được chia sẻ bởi MỌI axios instance gọi `refreshAccessToken()` dưới đây
// (apiClient và largeUploadClient) — đảm bảo chỉ có một lượt refresh chạy tại một thời điểm,
// không có 2 refresh chạy đua nhau ghi đè token của nhau.
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

/**
 * Xoay vòng refresh access token dùng chung (single-flight): nếu đang có một lượt
 * refresh chạy, các lời gọi tiếp theo xếp hàng chờ chung kết quả thay vì tự gọi
 * `/auth/refresh` riêng. Trả về access token mới, hoặc throw khi refresh thất bại
 * (đồng thời dọn localStorage và điều hướng về /login, giống hành vi cũ).
 * Dùng chung bởi response interceptor của `apiClient` và `largeUploadClient`.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw new Error('Không có refresh token');
  }

  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve: resolve as (value?: unknown) => void, reject });
    });
  }

  isRefreshing = true;
  try {
    const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    const newAccessToken = refreshRes.data.accessToken;
    const newRefreshToken = refreshRes.data.refreshToken;

    localStorage.setItem('access_token', newAccessToken);
    if (newRefreshToken) {
      localStorage.setItem('refresh_token', newRefreshToken);
    }

    processQueue(null, newAccessToken);
    return newAccessToken;
  } catch (refreshErr) {
    processQueue(refreshErr, null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw refreshErr;
  } finally {
    isRefreshing = false;
  }
}

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

        originalRequest._retry = true;

        try {
          const newAccessToken = await refreshAccessToken();
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshErr) {
          return Promise.reject(refreshErr);
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
