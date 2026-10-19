import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const OneDriveOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Đang hoàn tất kết nối Microsoft OneDrive...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      setStatus('error');
      setMessage(errorDescription || error || 'Người dùng đã từ chối hoặc hủy quá trình đăng nhập.');
      if (window.opener) {
        window.opener.postMessage({ type: 'ONEDRIVE_AUTH_ERROR', error: errorDescription || error }, '*');
      }
      return;
    }

    if (code) {
      setStatus('success');
      setMessage('Xác thực thành công! Cửa sổ này sẽ tự động đóng...');
      if (window.opener) {
        window.opener.postMessage({ type: 'ONEDRIVE_AUTH_CODE', code }, '*');
        setTimeout(() => {
          window.close();
        }, 800);
      }
    } else {
      setStatus('error');
      setMessage('Không tìm thấy mã xác thực từ Microsoft.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Đang xử lý kết nối Microsoft</h2>
            <p className="text-xs text-slate-500">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-lg font-bold text-emerald-900">Kết Nối Thành Công!</h2>
            <p className="text-xs text-slate-600">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
            <h2 className="text-lg font-bold text-rose-900">Lỗi Xác Thực</h2>
            <p className="text-xs text-rose-700">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Đóng cửa sổ
            </button>
          </>
        )}
      </div>
    </div>
  );
};
