import React, { useState, useEffect } from 'react';
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Mail,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { validateInvitationApi, acceptInvitationApi, InvitationValidationResponse } from '../api/authApi';

export const AcceptInvitationPage: React.FC = () => {
  const { setSession } = useAuth();

  // URL search params
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');

  // Page states: 'validating' | 'ready' | 'invalid' | 'submitting' | 'success'
  const [pageState, setPageState] = useState<'validating' | 'ready' | 'invalid' | 'submitting' | 'success'>('validating');
  const [invitationInfo, setInvitationInfo] = useState<InvitationValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setPageState('submitting');
    try {
      const loginResponse = await acceptInvitationApi({
        token,
        email,
        newPassword: newPassword.trim(),
      });

      setPageState('success');

      // Auto login after 1.5s
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
            Kích hoạt Quản trị viên Tổ chức
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Thiết lập mật khẩu bảo mật để truy cập cổng Tenant Admin
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
                  Đang tự động đăng nhập vào Tenant Admin Portal...
                </p>
              </div>
            </div>
          )}

          {/* STATE 4: READY / SUBMITTING FORM */}
          {(pageState === 'ready' || pageState === 'submitting') && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Organization & Recipient summary banner */}
              <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Tổ chức được phân quyền</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
                  <span className="font-bold text-white text-base">
                    {invitationInfo?.tenantName || 'Tổ chức'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-700/60 px-2.5 py-1 rounded-md">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{invitationInfo?.fullName || email}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
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

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Mật khẩu mới <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Xác nhận lại mật khẩu mới <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password requirements hint */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Yêu cầu bảo mật:</p>
                <div className="flex items-center gap-2">
                  <span className={newPassword.length >= 6 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    ✓ Độ dài tối thiểu 6 ký tự
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={newPassword && newPassword === confirmPassword ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    ✓ Mật khẩu xác nhận trùng khớp
                  </span>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={pageState === 'submitting'}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all disabled:opacity-60 cursor-pointer"
              >
                {pageState === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kích hoạt tài khoản...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Hoàn tất Kích hoạt & Đăng nhập</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default AcceptInvitationPage;
