import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ProblemDetails } from '@/types/common.types';
import { getAuthClient } from './authClient';
import { waitForOperation } from './pendingOperation';

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
  const token = getAuthClient().accessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    (config as any)._sentToken = token;
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

// Handler hết phiên: AuthContext đăng ký để redirect về /login và xoá user state
let _sessionExpiredHandler: (() => void) | null = null;

/**
 * Đăng ký hàm xử lý khi phiên đăng nhập hết hạn (401 không thể refresh).
 * AuthContext gọi hàm này khi mount.
 */
export function setSessionExpiredHandler(handler: () => void): void {
  _sessionExpiredHandler = handler;
}

/**
 * Xử lý 401: thử refresh token một lần (single-flight qua authClient).
 * - Nếu refresh thành công → trả token mới.
 * - Nếu thất bại → gọi _sessionExpiredHandler rồi trả null.
 *
 * @param failedToken - token đã gửi khi nhận 401 (để authClient tránh race condition)
 */
export async function handleUnauthorized(failedToken: string | null): Promise<string | null> {
  const client = getAuthClient();
  const ok = await client.refresh(failedToken);
  if (ok) {
    return client.accessToken();
  }
  // Refresh thất bại → kích hoạt handler hết phiên
  if (_sessionExpiredHandler) {
    _sessionExpiredHandler();
  }
  return null;
}

// Response Interceptor: Định dạng lỗi từ .NET Web API & xử lý 202/401/429/503
apiClient.interceptors.response.use(
  async (response: AxiosResponse) => {
    // Xử lý 202 Accepted với operationId (tác vụ bất đồng bộ)
    if (response.status === 202 && (response.data as any)?.operationId) {
      const operationId = (response.data as any).operationId as string;
      await waitForOperation(
        operationId,
        {
          get: (path: string) => apiClient.get(path) as Promise<any>,
          sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
        }
      );
      return response.data;
    }
    return response.data;
  },
  async (error: AxiosError<ProblemDetails>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _sentToken?: string | null };

    if (error.response) {
      const { status, data } = error.response;

      // Xử lý 401: Refresh token một lần
      if (status === 401 && originalRequest && !originalRequest._retry) {
        // Không lặp lại nếu chính route auth bị 401
        if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
          if (_sessionExpiredHandler) _sessionExpiredHandler();
          return Promise.reject(error);
        }

        originalRequest._retry = true;
        const sentToken = originalRequest._sentToken ?? null;

        const newToken = await handleUnauthorized(sentToken);
        if (!newToken) {
          return Promise.reject(error);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      }

      // Xử lý 403: Không có quyền truy cập
      if (status === 403) {
        const forbiddenMsg = (data as any)?.detail || (data as any)?.message || 'Bạn không có quyền thực hiện thao tác này.';
        return Promise.reject(new Error(forbiddenMsg));
      }

      // Xử lý 429: Vượt ngưỡng Rate Limit
      if (status === 429) {
        const retryAfter = (error.response.headers as any)?.['retry-after'] ?? 60;
        return Promise.reject(new Error(`Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfter} giây.`));
      }

      // Xử lý 503: Gateway / Kong đang khởi động
      if (status === 503) {
        return Promise.reject(new Error('Hệ thống bảo mật đang khởi động hoặc tạm gián đoạn. Vui lòng thử lại sau.'));
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
