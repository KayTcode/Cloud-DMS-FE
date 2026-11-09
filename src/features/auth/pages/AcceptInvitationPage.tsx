import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Mail,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAuthClient, AuthRequestError } from '@/api/authClient';
import { googleStartUrl } from '@/features/auth/api/authApi';
import { validateInvitationPassword } from '../invitationPassword';
import type { InvitationInfo } from '@/api/authClient';

export const AcceptInvitationPage: React.FC = () => {
  const { completeExternalLogin } = useAuth();

  // Đọc token một lần duy nhất từ URL — tránh StrictMode double-effect ghi đè bằng ''
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);

  const [pageState, setPageState] = useState<'validating' | 'ready' | 'invalid' | 'submitting' | 'success'>(
    () => (new URLSearchParams(window.location.search).get('token') ? 'validating' : 'invalid')
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    () => (new URLSearchParams(window.location.search).get('token') ? null : 'Đường dẫn không hợp lệ. Thiếu mã xác minh (Token).')
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Xoá query string khỏi URL một lần
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Validate invitation token
  const validatedRef = useRef(false);
  useEffect(() => {
    if (!token) return;
    if (validatedRef.current) return;
    validatedRef.current = true;

    const validate = async () => {
      try {
        const info = await getAuthClient().validateInvitation(token);
        if (info) {
          setInvitationInfo(info);
          setPageState('ready');
        } else {
          setPageState('invalid');
          setErrorMessage('Mã kích hoạt không hợp lệ hoặc đã hết hạn.');
        }
      } catch (err: unknown) {
        setPageState('invalid');
        if (err instanceof AuthRequestError) {
          if (err.status === 503) {
            setErrorMessage('Hệ thống bảo mật chưa sẵn sàng. Vui lòng thử lại sau.');
          } else if (err.status === 429) {
            const wait = err.retryAfterSeconds ? ` Vui lòng thử lại sau ${err.retryAfterSeconds} giây.` : '';
            setErrorMessage(`Quá nhiều yêu cầu.${wait}`);
          } else {
            setErrorMessage(err.message || 'Không thể kiểm tra mã kích hoạt. Vui lòng thử lại sau.');
          }
        } else {
          const e = err as { message?: string };
          setErrorMessage(e?.message || 'Không thể kiểm tra mã kích hoạt. Vui lòng thử lại sau.');
        }
      }
    };

    validate();
  }, [token]);

  const getRoleMeta = (type?: string) => {
    switch (type) {
      case 'DepartmentAdmin':
        return {
          title: 'Kích hoạt Quản trị viên Phòng ban',
          subtitle: 'Thiết lập mật khẩu để quản trị và phân quyền phòng ban',
          badge: 'Quản trị viên Phòng ban',
          redirectText: 'Đang chuyển hướng tới Cổng Quản trị Phòng ban...',
        };
      case 'Employee':
        return {
          title: 'Kích hoạt Tài khoản Nhân viên',
          subtitle: 'Thiết lập mật khẩu để truy cập tài liệu và làm việc',
          badge: 'Nhân viên',
          redirectText: 'Đang chuyển hướng tới Không gian làm việc...',
        };
      default:
        return {
          title: 'Kích hoạt Quản trị viên Tổ chức',
          subtitle: 'Thiết lập mật khẩu bảo mật để truy cập cổng Tenant Admin',
          badge: 'Quản trị viên Tổ chức',
          redirectText: 'Đang tự động đăng nhập vào Tenant Admin Portal...',
        };
    }
  };

  const roleMeta = getRoleMeta(invitationInfo?.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validateInvitationPassword(newPassword, confirmPassword);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setPageState('submitting');
    try {
      await getAuthClient().acceptInvitation(token, newPassword);
      const user = await completeExternalLogin();
      if (user) {
        setPageState('success');
        setTimeout(() => {
          window.location.replace('/');
        }, 1200);
      } else {
        setPageState('ready');
        setErrorMessage('Kích hoạt thành công nhưng không thể đăng nhập tự động. Vui lòng đăng nhập thủ công.');
      }
    } catch (err: unknown) {
      setPageState('ready');
      if (err instanceof AuthRequestError) {
        if (err.status === 401) {
          setErrorMessage('Mật khẩu không đúng hoặc tài khoản bị khoá.');
        } else if (err.status === 503) {
          setErrorMessage('Hệ thống bảo mật chưa sẵn sàng. Vui lòng thử lại sau.');
        } else {
          setErrorMessage(err.message || 'Kích hoạt tài khoản không thành công. Vui lòng thử lại.');
        }
      } else {
        const e = err as { message?: string };
        setErrorMessage(e?.message || 'Kích hoạt tài khoản không thành công. Vui lòng thử lại.');
      }
    }
  };

  const googleEnabled = import.meta.env.VITE_GOOGLE_LOGIN_ENABLED === 'true';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans select-none">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-800 bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-900/30 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-400 mb-3 shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{roleMeta.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{roleMeta.subtitle}</p>
        </div>

        <div className="p-6 sm:p-8">
          {/* VALIDATING */}
          {pageState === 'validating' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <div>
                <h3 className="text-base font-semibold text-slate-200">Đang kiểm tra mã kích hoạt...</h3>
                <p className="text-xs text-slate-400 mt-1">Vui lòng chờ trong giây lát</p>
              </div>
            </div>
          )}

          {/* INVALID */}
          {pageState === 'invalid' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-5">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full text-red-400">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-bold text-white">Liên kết không hợp lệ hoặc đã hết hạn</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {errorMessage || 'Mã xác minh không tồn tại, đã được sử dụng hoặc đã quá thời hạn.'}
                </p>
              </div>
              <div className="pt-4">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  <span>Chuyển tới Trang Đăng nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {pageState === 'success' && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white">Kích hoạt tài khoản thành công!</h3>
                <p className="text-sm text-slate-300">Chào mừng bạn đến với hệ thống Cloud-DMS.</p>
                <p className="text-xs text-emerald-400 mt-2 flex items-center justify-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {roleMeta.redirectText}
                </p>
              </div>
            </div>
          )}

          {/* READY / SUBMITTING */}
          {(pageState === 'ready' || pageState === 'submitting') && (
            <div className="space-y-5">
              {/* Summary banner */}
              <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Thông tin kích hoạt</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-300 bg-blue-950/70 border border-blue-800/60 px-2 py-0.5 rounded-md font-medium">
                    {roleMeta.badge}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-slate-700/50">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email: {invitationInfo?.email}</span>
                </div>

                {invitationInfo?.expiresAt && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hết hạn: {new Date(invitationInfo.expiresAt).toLocaleString('vi-VN')}</span>
                  </div>
                )}
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Password form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật khẩu mới</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 12 ký tự"
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-100 text-xs rounded-xl pl-10 pr-10 py-2.5 placeholder:text-slate-500 transition-all outline-none"
                      required
                      disabled={pageState === 'submitting'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
                      aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Xác nhận mật khẩu</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-100 text-xs rounded-xl pl-10 pr-10 py-2.5 placeholder:text-slate-500 transition-all outline-none"
                      required
                      disabled={pageState === 'submitting'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
                      aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={pageState === 'submitting'}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pageState === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kích hoạt...</span>
                    </>
                  ) : (
                    <>
                      <span>Đặt mật khẩu & Kích hoạt tài khoản</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Google SSO option — chỉ hiện khi VITE_GOOGLE_LOGIN_ENABLED=true */}
              {googleEnabled && (
                <>
                  <div className="relative my-1 flex items-center justify-center">
                    <div className="border-t border-slate-800 w-full" />
                    <span className="bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider absolute">
                      hoặc
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => { window.location.href = googleStartUrl('invitation', token); }}
                    disabled={pageState === 'submitting'}
                    className="w-full inline-flex items-center justify-center gap-3 px-5 py-3 text-sm font-bold text-slate-100 bg-slate-800 hover:bg-slate-750 hover:text-white border border-slate-700 hover:border-blue-500/50 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Kích hoạt & Đăng nhập với Google</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
