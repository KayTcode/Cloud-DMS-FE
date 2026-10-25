import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { exchangeGoogleTicketApi } from '../api/authApi';

/**
 * GoogleOAuthCallback:
 * Handles redirection from backend /api/auth/google/callback back into frontend SPA.
 * Supports both:
 * 1. Secure Ticket Exchange (OWASP A02/A04): URL contains ?ticket=XYZ -> POST /api/auth/google/exchange
 * 2. Legacy Direct Token: URL contains ?accessToken=...
 */
export const GoogleOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Đang hoàn tất đăng nhập bằng tài khoản Google...');

  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(window.location.search);
      const params =
        hashParams.get('ticket') || hashParams.get('accessToken') || hashParams.get('error')
          ? hashParams
          : searchParams;

      const ticket = params.get('ticket');
      const error = params.get('error') || params.get('message');
      const directAccessToken = params.get('accessToken');

      // Ngay lập tức xóa sạch URL params để chống rò rỉ (OWASP A02 / A04)
      if (window.location.hash || window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (error && !ticket && !directAccessToken) {
        setStatus('error');
        setMessage(error || 'Đăng nhập Google không thành công.');
        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error }, '*');
        }
        return;
      }

      // Luồng 1: Bảo mật cao qua Ticket Exchange
      if (ticket) {
        try {
          setStatus('processing');
          setMessage('Đang trao đổi mã xác thực an toàn với máy chủ...');
          const exchangeData = await exchangeGoogleTicketApi(ticket);

          const sessionData = {
            accessToken: exchangeData.accessToken,
            refreshToken: '',
            userId: exchangeData.userId || '',
            email: exchangeData.email || '',
            fullName: exchangeData.fullName || exchangeData.email || '',
            role: exchangeData.role || 'Employee',
            tenantId: exchangeData.tenantId || null,
            permissions: exchangeData.permissions || [],
          };

          setStatus('success');
          setMessage('Đăng nhập thành công! Đang chuyển hướng...');

          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', payload: sessionData }, '*');
            setTimeout(() => {
              window.close();
            }, 600);
          } else {
            localStorage.setItem('access_token', sessionData.accessToken);
            localStorage.setItem(
              'auth_user',
              JSON.stringify({
                id: sessionData.userId,
                email: sessionData.email,
                fullName: sessionData.fullName,
                role: sessionData.role,
                tenantId: sessionData.tenantId,
                permissions: sessionData.permissions,
              })
            );
            setTimeout(() => {
              window.location.href = '/';
            }, 500);
          }
          return;
        } catch (err: any) {
          setStatus('error');
          const errMsg =
            err?.response?.data?.message ||
            err?.message ||
            'Phiên đăng nhập Google đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.';
          setMessage(errMsg);
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: errMsg }, '*');
          }
          return;
        }
      }

      // Luồng 2: Fallback nếu backend trả trực tiếp accessToken
      if (directAccessToken) {
        const refreshToken = params.get('refreshToken');
        const userId = params.get('userId');
        const email = params.get('email');
        const fullName = params.get('fullName');
        const role = params.get('role');
        const tenantId = params.get('tenantId');
        const permissionsRaw = params.get('permissions');

        let permissions: string[] = [];
        if (permissionsRaw) {
          try {
            permissions = JSON.parse(permissionsRaw);
          } catch {
            permissions = permissionsRaw.split(',');
          }
        }

        const sessionData = {
          accessToken: directAccessToken,
          refreshToken: refreshToken || '',
          userId: userId || '',
          email: email || '',
          fullName: fullName || email || '',
          role: role || 'Employee',
          tenantId: tenantId ? tenantId : null,
          permissions,
        };

        setStatus('success');
        setMessage('Đăng nhập thành công! Đang chuyển hướng...');

        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', payload: sessionData }, '*');
          setTimeout(() => {
            window.close();
          }, 600);
        } else {
          localStorage.setItem('access_token', sessionData.accessToken);
          if (sessionData.refreshToken) {
            localStorage.setItem('refresh_token', sessionData.refreshToken);
          }
          localStorage.setItem(
            'auth_user',
            JSON.stringify({
              id: sessionData.userId,
              email: sessionData.email,
              fullName: sessionData.fullName,
              role: sessionData.role,
              tenantId: sessionData.tenantId,
              permissions: sessionData.permissions,
            })
          );
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        }
        return;
      }

      // Không tìm thấy cả ticket lẫn accessToken
      setStatus('error');
      setMessage('Không tìm thấy thông tin đăng nhập Google.');
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-white">Xác thực Google</h2>
            <p className="text-xs text-slate-400">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-emerald-300">Đăng Nhập Thành Công!</h2>
            <p className="text-xs text-slate-400">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-rose-300">Lỗi Xác Thực</h2>
            <p className="text-xs text-rose-400">{message}</p>
            <button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  window.location.href = '/login';
                }
              }}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Quay lại đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
};
