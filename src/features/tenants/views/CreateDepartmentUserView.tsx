import React, { useState } from 'react';
import { ArrowLeft, UserPlus, Building2, Shield, Check, Info, KeyRound, Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react';
import { useTenantContext } from '@/context/TenantContext';
import { TenantUser } from '@/features/tenants/types';

interface CreateDepartmentUserViewProps {
  onBack: () => void;
  onUserCreated?: (newUser: TenantUser) => void;
  defaultDepartment?: string;
}

export const CreateDepartmentUserView: React.FC<CreateDepartmentUserViewProps> = ({
  onBack,
  defaultDepartment,
}) => {
  const { departments, handleCreateDepartmentAdmin, handleUserCreated } = useTenantContext();

  const [selectedDeptId, setSelectedDeptId] = useState<string>(defaultDepartment || '');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('Department Administrator');
  const [accessLevel, setAccessLevel] = useState<'Standard' | 'Manager' | 'Admin'>('Admin');
  const [quotaGB, setQuotaGB] = useState('50');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [requirePasswordReset, setRequirePasswordReset] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate suggested email based on name
  const handleNameChange = (name: string) => {
    setFullName(name);
    if (!email || email.endsWith('@acme.com')) {
      const sanitized = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
      if (sanitized) {
        setEmail(`${sanitized}@acme.com`);
      }
    }
  };

  // Generate strong random password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên nhân sự.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }

    // Split First & Last Name
    const nameParts = trimmedName.split(' ');
    const firstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[0] : 'Member';

    setIsSubmitting(true);
    try {
      if (accessLevel === 'Admin') {
        // Call Backend API via Context
        const success = await handleCreateDepartmentAdmin({
          email: email.trim(),
          password: password,
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber.trim() || undefined,
          departmentId: selectedDeptId ? selectedDeptId : undefined,
        });

        if (!success) {
          setIsSubmitting(false);
        }
      } else {
        // Standard or Manager member
        const matchedDept = departments.find(d => d.id === selectedDeptId || d.name === selectedDeptId);
        await handleUserCreated({
          id: `usr-${Date.now()}`,
          name: trimmedName,
          email: email.trim(),
          department: matchedDept?.name || 'Chưa phân bổ',
          role: `${role} (${accessLevel})`,
          status: 'Active',
          lastActive: 'Just now',
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra khi tạo tài khoản.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-5 space-y-5 animate-in fade-in duration-200">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 hover:underline font-medium flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại</span>
        </button>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 font-medium">Tạo tài khoản Department Administrator</span>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <Info className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Tạo tài khoản Department Administrator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cấp tài khoản quản trị viên phòng ban cho Tenant (chọn hoặc để trống phòng ban nếu chưa chỉ định).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
          >
            Hủy
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Selection (Optional / Nullable) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chỉ định Phòng ban (Department) <span className="text-slate-400 font-normal">(Tuỳ chọn)</span>
              </label>
              <div className="relative">
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
                >
                  <option value="">-- Chưa chỉ định phòng ban (Gán sau) --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.headCount} nhân sự • Quota: {dept.allocatedStorageGB} GB)
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                Nếu chưa chọn, tài khoản sẽ được tạo ở cấp Tenant và có thể liên kết phòng ban sau.
              </p>
            </div>

            {/* Access Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cấp độ phân quyền (Access Level)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Admin', 'Manager', 'Standard'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      setAccessLevel(level);
                      if (level === 'Admin') setRole('Department Administrator');
                      else if (level === 'Manager') setRole('Team Lead');
                      else setRole('Staff Member');
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      accessLevel === level
                        ? 'bg-blue-50/80 border-blue-500 text-blue-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {level === 'Admin' && '👑 Quản trị viên (Admin)'}
                    {level === 'Manager' && 'Trưởng nhóm (Lead)'}
                    {level === 'Standard' && 'Thành viên'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {accessLevel === 'Admin' && 'Gán Role DepartmentAdmin: Toàn quyền quản trị tài liệu và nhân sự trong phòng ban.'}
                {accessLevel === 'Manager' && 'Quản lý phê duyệt hồ sơ và xem báo cáo phòng ban.'}
                {accessLevel === 'Standard' && 'Quyền truy cập tài liệu phòng ban và thư mục cá nhân.'}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Họ và tên nhân sự <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email doanh nghiệp <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nguyen.van.an@acme.com"
                className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mật khẩu ban đầu <span className="text-rose-500">*</span></span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Tự tạo mật khẩu</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg pl-3 pr-9 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Số điện thoại liên hệ <span className="text-slate-400 font-normal">(Tuỳ chọn)</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0912 345 678"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Job Title / Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chức danh công việc (Job Title)
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="VD: Head of Engineering, HR Manager..."
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Storage Quota */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Dung lượng cấp phát cá nhân (GB)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={quotaGB}
                  onChange={(e) => setQuotaGB(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
                <span className="text-xs text-slate-500 font-medium">GB</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Hạn mức lưu trữ tài liệu cá nhân trên Cloud DMS.</p>
            </div>
          </div>

          {/* Options & Security checklist */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Thiết lập bảo mật & Cấp phát tài khoản</span>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendWelcomeEmail}
                onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
              />
              <span className="text-xs text-slate-700">
                Gửi email chào mừng kèm thông tin đăng nhập và mật khẩu khởi tạo
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requirePasswordReset}
                onChange={(e) => setRequirePasswordReset(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
              />
              <span className="text-xs text-slate-700">
                Yêu cầu đổi mật khẩu và thiết lập xác thực 2 bước (2FA) trong lần đăng nhập đầu tiên
              </span>
            </label>
          </div>

          {/* Call to action footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-blue-500" />
              <span>Tài khoản sẽ được kích hoạt ngay và cộng vào tổng số License seats của Tenant.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tạo tài khoản Department Admin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
