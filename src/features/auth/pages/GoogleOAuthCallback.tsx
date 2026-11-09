import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * GoogleOAuthCallback:
 * Được gọi sau khi backend chuyển hướng về /auth/google/callback.
 * Cookie HttpOnly đã được backend đặt vào trình duyệt tại thời điểm này.
 * Xoá query/hash khỏi URL rồi gọi completeExternalLogin() để lấy /me.
 */
export const GoogleOAuthCallback: React.FC = () => {
  const { completeExternalLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      // Xoá query và hash khỏi URL để tránh rò rỉ thông tin (OWASP A02/A04)
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const user = await completeExternalLogin();
      if (user) {
        window.location.replace('/');
      } else {
        setError('Đăng nhập Google không thành công.');
      }
    };

    handleAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-rose-300">Lỗi Xác Thực</h2>
          <p className="text-xs text-rose-400">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Quay lại đăng nhập
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full text-center space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
        <h2 className="text-lg font-bold text-white">Xác thực Google</h2>
        <p className="text-xs text-slate-400">Đang hoàn tất đăng nhập bằng tài khoản Google...</p>
      </div>
    </div>
  );
};

export default GoogleOAuthCallback;
