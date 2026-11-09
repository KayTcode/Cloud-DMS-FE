/**
 * authClient.ts — Giữ access token trong RAM (không bao giờ lưu vào Storage).
 * Refresh token chỉ tồn tại trong HttpOnly cookie, FE không đọc được.
 *
 * Hành vi:
 *  - POST đến auth endpoints luôn lấy CSRF trước (GET /api/auth/csrf)
 *  - Khoá Web Locks `cloud-dms-auth-cookie` để tránh race condition nhiều tab
 *  - Kênh BroadcastChannel `cloud-dms-auth` để đồng bộ trạng thái đăng nhập/đăng xuất
 *  - Single-flight refresh: nhiều lời gọi `refresh()` đồng thời chỉ tạo 1 request
 */

export class AuthRequestError extends Error {
  status: number;
  retryAfterSeconds: number | null;

  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface InvitationInfo {
  email: string;
  type: string;
  expiresAt: string;
}

export interface AuthClientDeps {
  fetch: typeof fetch;
  locks: Pick<LockManager, 'request'>;
  createChannel: (name: string) => {
    postMessage(m: unknown): void;
    onmessage: ((e: { data: unknown }) => void) | null;
  };
  origin: string; // phải là https
}

export interface AuthClient {
  login(email: string, password: string): Promise<boolean>;
  bootstrap(): Promise<boolean>;
  refresh(failedToken?: string | null): Promise<boolean>;
  logout(): Promise<void>;
  validateInvitation(token: string): Promise<InvitationInfo | null>;
  acceptInvitation(token: string, newPassword: string): Promise<boolean>;
  accessToken(): string | null;
  onSessionEvent(listener: (type: 'login' | 'logout' | 'refresh') => void): () => void;
}

const LOCK_NAME = 'cloud-dms-auth-cookie';
const CHANNEL_NAME = 'cloud-dms-auth';

export function createAuthClient(deps: AuthClientDeps): AuthClient {
  const { fetch: fetchFn, locks, createChannel, origin } = deps;

  if (!origin.startsWith('https://')) {
    throw new TypeError(`origin phải là https, nhận được: ${origin}`);
  }

  const BASE = `${origin}/api/auth`;

  // --- RAM state ---
  let _token: string | null = null;
  let _loggedOut = false; // đã logout/401 → không refresh nữa
  let _refreshingPromise: Promise<boolean> | null = null;
  let _epoch = '';

  // --- Session event listeners ---
  const _listeners = new Set<(type: 'login' | 'logout' | 'refresh') => void>();

  // --- BroadcastChannel ---
  const channel = createChannel(CHANNEL_NAME);
  channel.onmessage = (e: { data: unknown }) => {
    const msg = e.data as { type?: string; epoch?: string };
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'logout') {
      _token = null;
      _loggedOut = true;
      _epoch = msg.epoch ?? '';
      _emit('logout');
    } else if (msg.type === 'login') {
      // Tab khác đăng nhập — không tự cập nhật token (token trong RAM của tab kia)
      // chỉ phát sự kiện nếu cần
    } else if (msg.type === 'refresh') {
      _epoch = msg.epoch ?? '';
    }
  };

  function _emit(type: 'login' | 'logout' | 'refresh') {
    for (const l of _listeners) {
      try { l(type); } catch { /* ignore */ }
    }
  }

  function _broadcast(type: 'login' | 'logout' | 'refresh') {
    _epoch = String(Date.now());
    channel.postMessage({ type, epoch: _epoch });
  }

  // --- Lấy CSRF + POST trong cùng 1 lần giữ khoá ---
  async function cookieRequest(path: string, body: Record<string, unknown>): Promise<Response> {
    return locks.request(LOCK_NAME, async () => {
      // 1. Lấy CSRF token
      const csrfRes = await fetchFn(`${BASE}/csrf`, {
        method: 'GET',
        credentials: 'include',
        mode: 'same-origin' as RequestMode,
        cache: 'no-store' as RequestCache,
        redirect: 'error' as RequestRedirect,
      });
      if (!csrfRes.ok) {
        const retryAfter = csrfRes.headers.get('Retry-After');
        throw new AuthRequestError(
          `CSRF fetch thất bại: ${csrfRes.status}`,
          csrfRes.status,
          retryAfter ? parseInt(retryAfter, 10) : null
        );
      }
      const { token: csrfToken } = await csrfRes.json();

      // 2. POST với CSRF header
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
      };
      const res = await fetchFn(`${BASE}/${path}`, {
        method: 'POST',
        credentials: 'include',
        mode: 'same-origin' as RequestMode,
        cache: 'no-store' as RequestCache,
        redirect: 'error' as RequestRedirect,
        headers,
        body: JSON.stringify(body),
      });
      return res as unknown as Response;
    }) as Promise<Response>;
  }

  // --- Xử lý response lỗi chung ---
  function handleErrorResponse(res: { status: number; headers: { get(k: string): string | null } }): never {
    const retryAfter = res.headers.get('Retry-After');
    throw new AuthRequestError(
      `Auth request thất bại: ${res.status}`,
      res.status,
      retryAfter ? parseInt(retryAfter, 10) : null
    );
  }

  // --- login ---
  async function login(email: string, password: string): Promise<boolean> {
    const res = await cookieRequest('login', { email, password });
    if (res.status === 429 || (!res.ok && res.status !== 200)) {
      handleErrorResponse(res);
    }
    const data = await (res as any).json();
    _token = data.accessToken ?? null;
    _loggedOut = false;
    _emit('login');
    _broadcast('login');
    return true;
  }

  // --- bootstrap: kiểm tra session hiện tại bằng cách refresh cookie ---
  async function bootstrap(): Promise<boolean> {
    try {
      const res = await cookieRequest('refresh', {});
      if (res.status === 401) return false;
      if (!res.ok) return false;
      const data = await (res as any).json();
      _token = data.accessToken ?? null;
      if (_token) {
        _loggedOut = false;
        _emit('login');
      }
      return !!_token;
    } catch {
      return false;
    }
  }

  // --- refresh ---
  async function refresh(failedToken?: string | null): Promise<boolean> {
    // Đã logout/401 → không làm gì thêm
    if (_loggedOut) return false;

    // failedToken guard: nếu token hiện tại đã khác (tab khác đã refresh rồi) → bỏ qua
    if (failedToken !== undefined && failedToken !== null && failedToken !== _token) {
      return !!_token;
    }

    // Single-flight
    if (_refreshingPromise) return _refreshingPromise;

    _refreshingPromise = (async () => {
      try {
        const res = await cookieRequest('refresh', {});
        if (res.status === 401) {
          _token = null;
          _loggedOut = true;
          _emit('logout');
          _broadcast('logout');
          return false;
        }
        if (!res.ok) {
          handleErrorResponse(res);
        }
        const data = await (res as any).json();
        _token = data.accessToken ?? null;
        _emit('refresh');
        _broadcast('refresh');
        return true;
      } finally {
        _refreshingPromise = null;
      }
    })();

    return _refreshingPromise;
  }

  // --- logout ---
  async function logout(): Promise<void> {
    try {
      await cookieRequest('logout', {});
    } catch { /* ignore */ }
    _token = null;
    _loggedOut = true;
    _emit('logout');
    _broadcast('logout');
  }

  // --- validateInvitation ---
  async function validateInvitation(token: string): Promise<InvitationInfo | null> {
    try {
      const res = await cookieRequest('invitations/validate', { token });
      if (res.status === 400) return null;
      if (!res.ok) return null;
      return await (res as any).json() as InvitationInfo;
    } catch {
      return null;
    }
  }

  // --- acceptInvitation ---
  async function acceptInvitation(token: string, newPassword: string): Promise<boolean> {
    const res = await cookieRequest('invitations/accept', { token, newPassword });
    if (!res.ok) {
      handleErrorResponse(res);
    }
    const data = await (res as any).json();
    _token = data.accessToken ?? null;
    _loggedOut = false;
    _emit('login');
    _broadcast('login');
    return true;
  }

  // --- accessToken ---
  function accessToken(): string | null {
    return _token;
  }

  // --- onSessionEvent ---
  function onSessionEvent(listener: (type: 'login' | 'logout' | 'refresh') => void): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }

  return {
    login,
    bootstrap,
    refresh,
    logout,
    validateInvitation,
    acceptInvitation,
    accessToken,
    onSessionEvent,
  };
}

// --- Lazy singleton cho browser ---
let _singleton: AuthClient | null = null;

export function getAuthClient(): AuthClient {
  if (!_singleton) {
    if (typeof window === 'undefined') {
      throw new Error('getAuthClient() chỉ dùng được trong môi trường browser');
    }
    _singleton = createAuthClient({
      fetch: window.fetch.bind(window),
      locks: navigator.locks,
      createChannel: (name) => new BroadcastChannel(name),
      origin: window.location.origin,
    });
  }
  return _singleton;
}
