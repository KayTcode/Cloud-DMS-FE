import React, { useState } from 'react';
import {
  User,
  Mail,
  Briefcase,
  Building,
  Phone,
  MapPin,
  Clock,
  Shield,
  Key,
  HardDrive,
  Camera,
  Save,
  Trash,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { UserActivity, UserProfile } from '../types';

interface ProfileViewProps {
  currentUser: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  activities: UserActivity[];
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
  onGoToDrive: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateProfile,
  activities,
  onShowToast,
  onGoToDrive,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'storage' | 'security' | 'activity'>('info');

  // Form State
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle);
  const [department, setDepartment] = useState(currentUser.department);
  const [phone, setPhone] = useState(currentUser.phone);
  const [location, setLocation] = useState(currentUser.location);
  const [timezone, setTimezone] = useState(currentUser.timezone);
  const [language, setLanguage] = useState(currentUser.language);
  const [twoFactor, setTwoFactor] = useState(currentUser.twoFactorEnabled);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle Save
  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      fullName,
      jobTitle,
      department,
      phone,
      location,
      timezone,
      language,
    });
    onShowToast('Cập nhật hồ sơ người dùng thành công!', 'success');
  };

  // Handle Avatar Change
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      onUpdateProfile({ avatarUrl: imageUrl });
      onShowToast('Đã cập nhật ảnh đại diện mới!', 'success');
    }
  };

  // Password submit
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      onShowToast('Vui lòng điền đầy đủ thông tin mật khẩu', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast('Mật khẩu mới không trùng khớp', 'error');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onShowToast('Đổi mật khẩu tài khoản thành công!', 'success');
  };

  const usagePercent = Math.round((currentUser.storageUsedGB / (currentUser.storageQuotaGB || 1)) * 100);

  const initials = currentUser.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Profile Header Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar with Upload button */}
            <div className="relative group">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl tracking-tight shadow-sm ring-1 ring-blue-200">
                  {initials}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow cursor-pointer transition-transform hover:scale-110"
                title="Thay đổi ảnh đại diện"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* User Meta */}
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">{currentUser.fullName}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{currentUser.jobTitle}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {currentUser.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Bộ phận: {currentUser.department}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Gia nhập: {currentUser.joinedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Drive Storage CTA */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 md:w-72 shrink-0">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700">Dung lượng cá nhân</span>
              <span className="font-bold text-blue-600">{usagePercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>{currentUser.storageUsedGB} GB đã dùng</span>
              <span>Hạn mức: {currentUser.storageQuotaGB} GB</span>
            </div>
            <button
              onClick={onGoToDrive}
              className="mt-3 w-full py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Xem tài liệu của tôi</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'info'
                ? 'bg-blue-50 text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Thông tin cá nhân</span>
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-blue-50 text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Bộ nhớ & Dung lượng Drive</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-blue-50 text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Bảo mật & Đăng nhập</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-blue-50 text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Nhật ký hoạt động</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Personal Info Form */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900">Chi tiết tài khoản người dùng</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật thông tin hồ sơ của bạn trên hệ thống CloudDMS
            </p>
          </div>

          <form onSubmit={handleSaveInfo} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Họ và tên đầy đủ
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email công ty (Không thể thay đổi)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 text-slate-500 border border-slate-200 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chức danh / Vị trí
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phòng ban trực thuộc
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="Engineering">Engineering (Bộ phận Kỹ thuật)</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR (Nhân sự)</option>
                    <option value="Finance">Finance (Tài chính)</option>
                    <option value="Legal">Legal (Pháp chế)</option>
                    <option value="Operations">Operations (Vận hành)</option>
                    <option value="Design">Design (Thiết kế)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Số điện thoại liên lạc
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vị trí văn phòng
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Múi giờ làm việc
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="GMT+7 (Asia/Ho_Chi_Minh)">GMT+7 (Asia/Ho_Chi_Minh)</option>
                    <option value="GMT+8 (Asia/Singapore)">GMT+8 (Asia/Singapore)</option>
                    <option value="GMT+9 (Asia/Tokyo)">GMT+9 (Asia/Tokyo)</option>
                    <option value="GMT-7 (America/Los_Angeles)">GMT-7 (America/Los_Angeles)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ngôn ngữ giao diện
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="Tiếng Việt (Vietnamese)">Tiếng Việt (Vietnamese)</option>
                  <option value="English (United States)">English (United States)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu thay đổi hồ sơ</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Storage & Drive Quota */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Chi tiết phân bổ dung lượng cá nhân
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Bạn đang sử dụng {currentUser.storageUsedGB} GB trên tổng số {currentUser.storageQuotaGB} GB được cấp phát
            </p>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-3">
              <div style={{ width: '45%' }} className="bg-red-500 h-full" title="Tài liệu PDF & Văn bản (14.2 GB)" />
              <div style={{ width: '25%' }} className="bg-amber-500 h-full" title="Dữ liệu nén & Bản sao lưu (7.8 GB)" />
              <div style={{ width: '18%' }} className="bg-blue-500 h-full" title="Bảng tính & Slides (5.2 GB)" />
              <div style={{ width: '12%' }} className="bg-violet-500 h-full" title="Hình ảnh & Khác (1.4 GB)" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">Tài liệu & PDF</p>
                  <p className="text-slate-400 text-[11px]">14.2 GB (45%)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-amber-500 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">Bản sao lưu & Zip</p>
                  <p className="text-slate-400 text-[11px]">7.8 GB (25%)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-blue-500 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">Bảng tính & Slides</p>
                  <p className="text-slate-400 text-[11px]">5.2 GB (18%)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-violet-500 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">Hình ảnh & Media</p>
                  <p className="text-slate-400 text-[11px]">1.4 GB (12%)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">Yêu cầu mở rộng dung lượng cá nhân</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Nếu bạn sắp hết hạn mức {currentUser.storageQuotaGB} GB, gửi yêu cầu đến Quản trị viên phòng ban để nâng cấp.
                </p>
                <button
                  onClick={() => onShowToast('Đã gửi yêu cầu nâng hạn mức đến Department Admin!', 'info')}
                  className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Gửi yêu cầu nâng cấp
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">Dọn dẹp Thùng rác</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Xóa vĩnh viễn các tệp trong thùng rác để giải phóng ngay dung lượng lưu trữ khả dụng.
                </p>
                <button
                  onClick={() => onShowToast('Thùng rác đã được dọn sạch hoàn toàn!', 'success')}
                  className="mt-3 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Dọn sạch thùng rác
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Login */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Xác thực 2 bước (2FA)</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    BẬT
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Bảo vệ tài khoản CloudDMS của bạn bằng mã OTP xác thực qua ứng dụng Authenticator.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setTwoFactor(!twoFactor);
                onShowToast(twoFactor ? 'Đã tắt 2FA' : 'Đã kích hoạt 2FA thành công!', 'info');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                twoFactor
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {twoFactor ? 'Quản lý 2FA' : 'Bật 2FA ngay'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">Đổi mật khẩu tài khoản</h3>
            <p className="text-xs text-slate-500 mb-6">
              Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Cập nhật mật khẩu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Activity Log */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Nhật ký hoạt động tài khoản</h3>
          <p className="text-xs text-slate-500 mb-6">
            Ghi lại các thao tác tải lên, tải xuống, chia sẻ và thay đổi bảo mật của bạn
          </p>

          <div className="divide-y divide-slate-100 text-xs">
            {activities.map((act) => (
              <div key={act.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {act.action === 'upload' && 'Tải lên tài liệu: '}
                      {act.action === 'download' && 'Tải xuống tệp: '}
                      {act.action === 'share' && 'Chia sẻ thư mục: '}
                      {act.action === 'edit_profile' && 'Cập nhật hồ sơ: '}
                      {act.action === 'update_quota' && 'Điều chỉnh hạn mức: '}
                      <span className="text-blue-600">{act.targetName}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {act.device} · IP: {act.ipAddress}
                    </p>
                  </div>
                </div>
                <span className="text-slate-400 text-[11px] shrink-0">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
