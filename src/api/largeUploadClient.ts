/**
 * Second axios instance dedicated to the large-file-transfer upload session
 * API (`largeUploadApi.ts`).
 *
 * Why a second instance instead of reusing the shared `apiClient` directly:
 * `apiClient`'s response interceptor (axiosClient.ts) always normalizes
 * backend errors into a plain `Error`, discarding the HTTP `status` and the
 * backend's `code` field. `largeUploadApi.ts` needs that `code`/`status` to
 * build `ApiCodeError` (sessions can live up to an hour with many sequential
 * calls — presign-per-part, heartbeat, status polls — so callers need to
 * branch on specific backend error codes like `UPLOAD_SESSION_EXPIRED`).
 *
 * Rather than duplicate the auth/idempotency request logic and the 401
 * refresh-token rotation, this instance reuses the exact same building
 * blocks exported from `axiosClient.ts`:
 *  - `attachAuthAndIdempotency` for the request interceptor (Bearer token +
 *    auto Idempotency-Key for mutating requests + FormData Content-Type
 *    handling) — identical behavior to `apiClient`, single source of truth.
 *  - `handleUnauthorized` for 401 handling — delegates to `getAuthClient().refresh()`
 *    which has single-flight built in; a 401 from either client triggers at most
 *    one concurrent refresh call.
 *
 * Only the final error-shaping step differs from `apiClient`: on a non-401
 * error response with a backend `code` field, this instance's interceptor
 * rejects with `ApiCodeError` (code/status/retryAfterSeconds) instead of a
 * plain `Error`.
 */
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BASE_URL, attachAuthAndIdempotency, handleUnauthorized } from './axiosClient';

/**
 * Error thrown by every function in `largeUploadApi.ts` when the backend
 * error response body contains a `code` field (e.g. `UPLOAD_SESSION_EXPIRED`,
 * `TOO_MANY_ACTIVE_UPLOADS`, `BLOCKED_EXTENSION`, ...).
 */
export class ApiCodeError extends Error {
  code: string;
  status: number;
  retryAfterSeconds?: number;

  constructor(code: string, status: number, message?: string, retryAfterSeconds?: number) {
    super(message || code);
    this.name = 'ApiCodeError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const largeUploadClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: identical behavior to `apiClient` (Bearer token +
// auto Idempotency-Key), reusing the shared helper so there is exactly one
// implementation of this logic.
largeUploadClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => attachAuthAndIdempotency(config),
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: reuses the shared single-flight `refreshAccessToken`
// for 401s (same rotation guard as `apiClient`, no racing refreshes), and on
// any other error response builds `ApiCodeError` from the backend `code`
// field when present, else falls back to a plain `Error`.
largeUploadClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
      return Promise.reject(new Error('Không thể kết nối đến máy chủ API'));
    }

    const { status, data } = error.response;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const sentToken = (originalRequest as any)._sentToken ?? null;
      const newToken = await handleUnauthorized(sentToken);
      if (!newToken) {
        return Promise.reject(error);
      }
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return largeUploadClient(originalRequest);
    }

    const code = (data as any)?.code;
    if (code) {
      const retryAfterSeconds = (data as any)?.retryAfterSeconds ?? (data as any)?.retryAfterSecond ?? undefined;
      const message = (data as any)?.message || (data as any)?.detail || (data as any)?.title || code;
      return Promise.reject(new ApiCodeError(code, status, message, retryAfterSeconds));
    }

    const errorData = data as any;
    const errorMessage = errorData?.message || errorData?.error || errorData?.detail || errorData?.title || error.message || 'Lỗi kết nối máy chủ';
    return Promise.reject(new Error(errorMessage));
  }
);

export default largeUploadClient;
