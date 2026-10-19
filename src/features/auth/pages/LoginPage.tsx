import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getGoogleLoginUrl, getGoogleAuthStatusApi } from '@/features/auth/api/authApi';

export const LoginPage: React.FC = () => {
  const { login, setSession, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Listen for message from Google OAuth popup callback
  React.useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleLoading(false);
        setSession(event.data.payload);
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setIsGoogleLoading(false);
        setErrorMessage(event.data.error || 'Đăng nhập Google thất bại.');
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [setSession]);

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    try {
      // Check if backend Google Auth is configured
      const status = await getGoogleAuthStatusApi();
      if (!status.isConfigured) {
        setErrorMessage(
          'Hệ thống chưa cấu hình Google ClientId/Secret trên máy chủ. Vui lòng liên hệ Quản trị viên!'
        );
        setIsGoogleLoading(false);
        return;
      }

      const returnUrl = `${window.location.origin}/auth/google/callback`;
      const googleAuthUrl = getGoogleLoginUrl(returnUrl);

      // Open OAuth popup window
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        googleAuthUrl,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup) {
        // Fallback to full page redirect if popup was blocked
        window.location.href = googleAuthUrl;
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể khởi động đăng nhập Google.');
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin!');
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main card container */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10">
        {/* Left column: Brand & Value Proposition (Hidden on very small screens, 5 cols on lg) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-900/40 via-slate-900 to-indigo-950/50 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  CloudDMS
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Enterprise
                  </span>
                </h1>
                <p className="text-xs text-slate-400">Document Management System</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-100 leading-snug">
                Nền tảng Quản trị & Lưu trữ Tài liệu Đa Doanh nghiệp
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hệ thống bảo mật cao cấp với kiến trúc CQRS & Clean Architecture, phân quyền chặt chẽ theo Role & Phòng ban.
              </p>

              <div className="pt-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Phân quyền RBAC & Dynamic Permission Claim</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Multi-Tenant cô lập dữ liệu an toàn</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Quản lý kho tài liệu & phân phối dung lượng</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>© 2026 CloudDMS Inc.</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API Server Online
            </span>
          </div>
        </div>

        {/* Right column: Login form & Demo buttons (7 cols on lg) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-slate-900/60">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Đăng nhập tài khoản</h2>
            <p className="text-xs text-slate-400 mt-1">
              Nhập thông tin xác thực để truy cập cổng làm việc tương ứng
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email công việc
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@clouddms.com hoặc tenant@acme.com"
                  className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-100 text-xs rounded-xl pl-10 pr-4 py-2.5 placeholder:text-slate-500 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Mật khẩu
                </label>
                <span className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer">
                  Quên mật khẩu?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-100 text-xs rounded-xl pl-10 pr-10 py-2.5 placeholder:text-slate-500 transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social SSO Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider absolute">
              hoặc
            </span>
          </div>

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            className="w-full py-2.5 px-4 bg-slate-950/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Đang kết nối Google...</span>
              </>
            ) : (
              <>
                {/* Official Google 'G' SVG Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span className="group-hover:text-white transition-colors">Đăng nhập với Google Workspace</span>
              </>
            )}
          </button>

          {/* Quick Demo Credentials Section */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Tài khoản Demo (1-Click Test)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Quick System Admin button */}
              <button
                type="button"
                onClick={() => handleQuickFill('admin@clouddms.com', 'Admin@123')}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-blue-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-blue-300">
                    System Admin
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">admin@clouddms.com</div>
                <div className="text-[10px] text-slate-500 font-mono">Pass: Admin@123</div>
              </button>

              {/* Quick Tenant Admin button */}
              <button
                type="button"
                onClick={() => handleQuickFill('tenant@acme.com', 'Tenant@123')}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-indigo-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                    Tenant Admin
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">tenant@acme.com</div>
                <div className="text-[10px] text-slate-500 font-mono">Pass: Tenant@123</div>
              </button>

              {/* Quick Department Admin button */}
              <button
                type="button"
                onClick={() => handleQuickFill('deptadmin@acme.com', 'DeptAdmin@123')}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-emerald-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">
                    Department Admin
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">deptadmin@acme.com</div>
                <div className="text-[10px] text-slate-500 font-mono">Pass: DeptAdmin@123</div>
              </button>

              {/* Quick User / Employee button */}
              <button
                type="button"
                onClick={() => handleQuickFill('user@acme.com', 'User@123')}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-violet-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-violet-500/20 text-violet-400 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-violet-300">
                    Team Member / User
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">user@acme.com</div>
                <div className="text-[10px] text-slate-500 font-mono">Pass: User@123</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
