import React, { useState } from 'react';
import { ArrowLeft, UserPlus, Building2, Shield, Check, Info } from 'lucide-react';
import { mockDepartments } from '../data/mockData';
import { TenantUser } from '../types';

interface CreateDepartmentUserViewProps {
  onBack: () => void;
  onUserCreated: (newUser: TenantUser) => void;
  defaultDepartment?: string;
}

export const CreateDepartmentUserView: React.FC<CreateDepartmentUserViewProps> = ({
  onBack,
  onUserCreated,
  defaultDepartment,
}) => {
  const [department, setDepartment] = useState(defaultDepartment || mockDepartments[0].name);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Staff Member');
  const [accessLevel, setAccessLevel] = useState<'Standard' | 'Manager' | 'Admin'>('Standard');
  const [quotaGB, setQuotaGB] = useState('50');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [requirePasswordReset, setRequirePasswordReset] = useState(true);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    const newUser: TenantUser = {
      id: `usr-${Date.now()}`,
      name: fullName.trim(),
      email: email.trim(),
      department: department,
      role: `${role} (${accessLevel})`,
      status: 'Active',
      lastActive: 'Just now',
    };

    onUserCreated(newUser);
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
        <span className="text-slate-600 font-medium">Tạo tài khoản phòng ban</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Tạo tài khoản cho Department (Phòng ban)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cấp phát tài khoản người dùng, phân quyền truy cập và hạn mức lưu trữ theo phòng ban.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Hủy
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chọn Phòng ban (Department) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
                >
                  {mockDepartments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} ({dept.headCount} nhân sự • Quota: {dept.allocatedStorageGB} GB)
                    </option>
                  ))}
                  <option value="Executive Management">Executive Management</option>
                  <option value="Customer Success">Customer Success</option>
                  <option value="Product & Design">Product & Design</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                Tài khoản sẽ được kế thừa chính sách bảo mật của phòng ban này.
              </p>
            </div>

            {/* Access Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cấp độ phân quyền (Access Level)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Standard', 'Manager', 'Admin'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setAccessLevel(level)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      accessLevel === level
                        ? 'bg-blue-50/80 border-blue-500 text-blue-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {level === 'Standard' && 'Thành viên'}
                    {level === 'Manager' && 'Trưởng nhóm'}
                    {level === 'Admin' && 'Quản trị viên'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {accessLevel === 'Standard' && 'Quyền truy cập tài liệu phòng ban và thư mục cá nhân.'}
                {accessLevel === 'Manager' && 'Quản lý phê duyệt hồ sơ và xem báo cáo phòng ban.'}
                {accessLevel === 'Admin' && 'Toàn quyền cấu hình bộ nhớ và phân quyền trong phòng ban.'}
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

            {/* Job Title / Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chức danh công việc (Job Title)
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="VD: Senior Legal Associate, Lead Engineer..."
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
              <p className="text-[11px] text-slate-400 mt-1">Trừ trực tiếp vào tổng quota của phòng ban.</p>
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
                Gửi email chào mừng kèm link kích hoạt và thiết lập mật khẩu một lần (SSO/Magic link)
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
                Yêu cầu đổi mật khẩu và bật xác thực 2 bước (2FA) trong lần đăng nhập đầu tiên
              </span>
            </label>
          </div>

          {/* Call to action footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-blue-500" />
              <span>Tài khoản sẽ được kích hoạt ngay và cộng vào tổng số License seats.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Tạo tài khoản phòng ban</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
