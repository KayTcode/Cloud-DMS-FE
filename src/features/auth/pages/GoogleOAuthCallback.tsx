import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * GoogleOAuthCallback:
 * Handles redirection from backend /api/auth/google/callback back into frontend SPA.
 * If backend returned tokens in URL query params or if window was opened as popup,
 * this component dispatches tokens to opener or saves to localStorage and navigates to root.
 */
export const GoogleOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Đang hoàn tất đăng nhập bằng tài khoản Google...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error') || params.get('message');
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId = params.get('userId');
    const email = params.get('email');
    const fullName = params.get('fullName');
    const role = params.get('role');
    const tenantId = params.get('tenantId');
    const permissionsRaw = params.get('permissions');

    if (error && !accessToken) {
      setStatus('error');
      setMessage(error || 'Đăng nhập Google không thành công.');
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error }, '*');
      }
      return;
    }

    if (accessToken) {
      let permissions: string[] = [];
      if (permissionsRaw) {
        try {
          permissions = JSON.parse(permissionsRaw);
        } catch {
          permissions = permissionsRaw.split(',');
        }
      }

      const sessionData = {
        accessToken,
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
        // Direct redirection flow
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
    } else {
      // If code/state arrived directly at frontend route (if configured to hit SPA first)
      setStatus('error');
      setMessage('Không tìm thấy thông tin đăng nhập Google.');
    }
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
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              Quay lại đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
};
