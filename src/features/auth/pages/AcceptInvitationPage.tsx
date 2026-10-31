import React, { useState, useEffect } from 'react';
import {
  Building2,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Mail,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { validateInvitationApi, acceptInvitationApi, getGoogleLoginUrl, InvitationValidationResponse } from '../api/authApi';

export const AcceptInvitationPage: React.FC = () => {
  const { setSession } = useAuth();

  // URL search params
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');

  // Page states: 'validating' | 'ready' | 'invalid' | 'submitting' | 'success'
  const [pageState, setPageState] = useState<'validating' | 'ready' | 'invalid' | 'submitting' | 'success'>('validating');
  const [invitationInfo, setInvitationInfo] = useState<InvitationValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getRoleMeta = (role?: string) => {
    switch (role) {
      case 'DepartmentAdmin':
        return {
          title: 'Kích hoạt Quản trị viên Phòng ban',
          subtitle: 'Thiết lập thông tin đăng nhập để quản trị và phân quyền phòng ban',
          badge: 'Quản trị viên Phòng ban',
          redirectText: 'Đang chuyển hướng tới Cổng Quản trị Phòng ban...',
        };
      case 'Employee':
        return {
          title: 'Kích hoạt Tài khoản Nhân viên',
          subtitle: 'Thiết lập thông tin đăng nhập để truy cập tài liệu và làm việc',
          badge: 'Nhân viên',
          redirectText: 'Đang chuyển hướng tới Không gian làm việc...',
        };
      case 'TenantAdmin':
      default:
        return {
          title: 'Kích hoạt Quản trị viên Tổ chức',
          subtitle: 'Thiết lập mật khẩu bảo mật để truy cập cổng Tenant Admin',
          badge: 'Quản trị viên Tổ chức',
          redirectText: 'Đang tự động đăng nhập vào Tenant Admin Portal...',
        };
    }
  };

  const roleMeta = getRoleMeta(invitationInfo?.role);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token') || '';
    const emailParam = params.get('email') || '';

    setToken(tokenParam);
    setEmail(emailParam);

    if (!tokenParam || !emailParam) {
      setPageState('invalid');
      setErrorMessage('Đường dẫn không hợp lệ. Thiếu mã xác minh (Token) hoặc địa chỉ Email.');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await validateInvitationApi(tokenParam, emailParam);
        if (response.isValid) {
          setInvitationInfo(response);
          setPageState('ready');
        } else {
          setPageState('invalid');
          setErrorMessage(response.message || 'Mã kích hoạt không hợp lệ hoặc đã hết hạn.');
        }
      } catch (err: any) {
        setPageState('invalid');
        const apiError = err?.response?.data?.message || err?.message || 'Không thể kiểm tra mã kích hoạt. Vui lòng thử lại sau.';
        setErrorMessage(apiError);
      }
    };

    validateToken();
  }, []);

  const handleActivateWithGoogle = async () => {
    setPageState('submitting');
    try {
      // 1. Kích hoạt tài khoản không cần mật khẩu
      await acceptInvitationApi({
        token,
        email,
      });

      // 2. Chuyển sang luồng đăng nhập Google OAuth kèm callback frontend SPA
      const returnUrl = `${window.location.origin}/auth/google/callback`;
      window.location.href = getGoogleLoginUrl(returnUrl);
    } catch (err: any) {
      setPageState('ready');
      const apiError = err?.response?.data?.message || err?.message || 'Kích hoạt tài khoản không thành công. Vui lòng thử lại.';
      setErrorMessage(apiError);
    }
  };

  const handleQuickActivate = async () => {
    setPageState('submitting');
    try {
      const loginResponse = await acceptInvitationApi({
        token,
        email,
      });

      setPageState('success');

      setTimeout(() => {
        setSession(loginResponse);
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      setPageState('ready');
      const apiError = err?.response?.data?.message || err?.message || 'Kích hoạt tài khoản không thành công. Vui lòng thử lại.';
      setErrorMessage(apiError);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header Bar */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-800 bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-900/30 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-400 mb-3 shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {roleMeta.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {roleMeta.subtitle}
          </p>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8">
          {/* STATE 1: VALIDATING */}
          {pageState === 'validating' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <div>
                <h3 className="text-base font-semibold text-slate-200">
                  Đang kiểm tra mã kích hoạt...
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Vui lòng chờ trong giây lát
                </p>
              </div>
            </div>
          )}

          {/* STATE 2: INVALID / EXPIRED */}
          {pageState === 'invalid' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-5">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full text-red-400">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-bold text-white">
                  Liên kết không hợp lệ hoặc đã hết hạn
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {errorMessage || 'Mã xác minh không tồn tại, đã được sử dụng hoặc đã quá thời hạn 48 giờ.'}
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3">
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

          {/* STATE 3: SUCCESS */}
          {pageState === 'success' && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white">
                  Kích hoạt tài khoản thành công!
                </h3>
                <p className="text-sm text-slate-300">
                  Chào mừng bạn đến với hệ thống Cloud-DMS.
                </p>
                <p className="text-xs text-emerald-400 mt-2 flex items-center justify-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {roleMeta.redirectText}
                </p>
              </div>
            </div>
          )}

          {/* STATE 4: READY / SUBMITTING FORM */}
          {(pageState === 'ready' || pageState === 'submitting') && (
            <div className="space-y-5">
              {/* Organization & Recipient summary banner */}
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm pt-0.5">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white text-base block">
                      {invitationInfo?.tenantName || 'Tổ chức'}
                    </span>
                    {invitationInfo?.departmentName && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-300">
                        <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Phòng ban: <strong className="text-white">{invitationInfo.departmentName}</strong></span>
                      </div>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-700/60 px-2.5 py-1 rounded-md self-start sm:self-center">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{invitationInfo?.fullName || email}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-slate-700/50">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email: {email}</span>
                </div>
              </div>

              {/* Error notification if any */}
              {errorMessage && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Nút 1: KÍCH HOẠT NHANH VỚI GOOGLE WORKSPACE / GMAIL */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleActivateWithGoogle}
                  disabled={pageState === 'submitting'}
                  className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 text-sm font-bold text-slate-100 bg-slate-800 hover:bg-slate-750 hover:text-white border border-slate-700 hover:border-blue-500/50 rounded-xl shadow-lg transition-all cursor-pointer group"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Kích hoạt & Đăng nhập ngay với Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickActivate}
                  disabled={pageState === 'submitting'}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/60 rounded-xl transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Kích hoạt tài khoản ngay (Không cần đặt mật khẩu)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AcceptInvitationPage;
