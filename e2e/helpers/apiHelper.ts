import { APIRequestContext } from '@playwright/test';

export interface AuthSession {
  accessToken: string;
  cookies: string[];
}

/**
 * Helper đăng nhập API qua Kong Gateway và trả về Bearer Token
 */
export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  pass: string,
  origin: string = 'https://localhost:8443'
): Promise<string> {
  // 1. Lấy CSRF token
  const csrfRes = await request.get(`${origin}/api/auth/csrf`, {
    headers: {
      Origin: origin,
    },
  });

  if (!csrfRes.ok()) {
    throw new Error(`Không lấy được CSRF token: HTTP ${csrfRes.status()}`);
  }

  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.requestToken;

  // 2. Gọi POST /api/auth/login
  const loginRes = await request.post(`${origin}/api/auth/login`, {
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
    },
    data: {
      email,
      password: pass,
    },
  });

  if (!loginRes.ok()) {
    throw new Error(`Đăng nhập API thất bại cho ${email}: HTTP ${loginRes.status()}`);
  }

  const loginData = await loginRes.json();
  return loginData.accessToken;
}

