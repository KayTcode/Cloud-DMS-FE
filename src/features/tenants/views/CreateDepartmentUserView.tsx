import React, { useState } from 'react';
import { ArrowLeft, UserPlus, Building2, Shield, Check, Info, Mail, Loader2, HardDrive, Layers, AlertCircle, Cloud } from 'lucide-react';
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
  const { tenant, departments, handleCreateDepartmentAdmin, handleUserCreated } = useTenantContext();

  const [selectedDeptId, setSelectedDeptId] = useState<string>(defaultDepartment || '');
  const [selectedStorageProviderId, setSelectedStorageProviderId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('Department Administrator');
  const [quotaGB, setQuotaGB] = useState('10');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [requirePasswordReset, setRequirePasswordReset] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quota còn trống (chưa phân bổ cho các phòng ban) của Tenant
  const unallocatedBytes = tenant.unallocatedBytes !== undefined
    ? tenant.unallocatedBytes
    : (tenant.availableBytes !== undefined
      ? tenant.availableBytes
      : Math.max(0, (tenant.storageQuotaBytes || 0) - (tenant.allocatedToDepartmentsBytes || 0)));
  const unallocatedQuotaGB = Number((unallocatedBytes / (1024 ** 3)).toFixed(1));

  const selectedDept = departments.find((d) => d.id === selectedDeptId);
  const deptAllocatedGB = selectedDept?.allocatedStorageGB || 0;

  const chosenAlloc = tenant.allocations?.find((a) => a.storageProviderId === selectedStorageProviderId);
  const chosenProviderFreeBytes = chosenAlloc
    ? Math.max(0, chosenAlloc.grantedBytes - chosenAlloc.allocatedToChildrenBytes)
    : 0;
  const chosenProviderFreeGB = Number((chosenProviderFreeBytes / (1024 ** 3)).toFixed(1));

  // Hạn mức khả dụng tối đa phụ thuộc vào việc chọn nguồn Provider hay chọn tự động
  const maxAllowedGB = selectedStorageProviderId
    ? chosenProviderFreeGB
    : (selectedDept ? deptAllocatedGB : unallocatedQuotaGB);

  const quotaNum = Number(quotaGB);
  const isOverQuota = !isNaN(quotaNum) && maxAllowedGB > 0 && quotaNum > maxAllowedGB;

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

    const quotaVal = Number(quotaGB);
    if (!isNaN(quotaVal) && quotaVal > 0) {
      if (selectedStorageProviderId && quotaVal > chosenProviderFreeGB) {
        setErrorMessage(`Hạn mức yêu cầu (${quotaVal} GB) vượt quá dung lượng khả dụng của Drive "${chosenAlloc?.storageProviderName}" (Khả dụng còn: ${chosenProviderFreeGB} GB).`);
        return;
      }
      if (!selectedStorageProviderId && maxAllowedGB > 0 && quotaVal > maxAllowedGB) {
        setErrorMessage(`Hạn mức yêu cầu (${quotaVal} GB) vượt quá dung lượng khả dụng tối đa (${maxAllowedGB} GB).`);
        return;
      }
    }

    // Split First & Last Name
    const nameParts = trimmedName.split(' ');
    const firstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[0] : 'Member';

    setIsSubmitting(true);
    try {
      const storageQuotaBytes = !isNaN(quotaVal) && quotaVal > 0
        ? Math.round(quotaVal * 1024 * 1024 * 1024)
        : undefined;

      // Auto-assign as Department Admin via Email Invitation
      const success = await handleCreateDepartmentAdmin({
        email: email.trim(),
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber.trim() || undefined,
        departmentId: selectedDeptId ? selectedDeptId : undefined,
        storageQuotaBytes: storageQuotaBytes,
        storageProviderId: selectedStorageProviderId ? selectedStorageProviderId : undefined,
      });

      if (!success) {
        setIsSubmitting(false);
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

            {/* Department Role Badge (Fixed as Department Admin) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cấp độ quyền hạn tài khoản
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50/60 border border-blue-200 rounded-lg text-blue-800 text-xs font-semibold">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Department Administrator (Quản trị viên phòng ban)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tài khoản tự động nhận quyền Quản trị viên phòng ban (Department Admin) trong tổ chức.
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
                onChange={(e) => setFullName(e.target.value)}
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

            {/* Account Activation & Email Invitation Banner */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-blue-900">
                    Kích hoạt tài khoản qua Thư mời Email
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Quản trị viên không cần tự tạo mật khẩu. Hệ thống sẽ khởi tạo tài khoản ở trạng thái chờ kích hoạt và tự động gửi email kèm mã xác thực (hiệu lực 48 giờ) để Trưởng phòng tự kích hoạt và thiết lập mật khẩu cá nhân.
                  </p>
                </div>
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

            {/* Storage Quota & Provider Source */}
            <div className="space-y-4 md:col-span-2 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Hạn mức Quota & Nguồn Lưu Trữ (Storage Provider)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Chỉ định dung lượng và nguồn Cloud Storage cấp cho Trưởng phòng
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right bg-white sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-slate-200/70">
                  <span className="text-[11px] text-slate-500">Khả dụng cho phép: </span>
                  <span className="text-xs font-bold font-mono text-emerald-600">
                    {maxAllowedGB} GB
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2.5 border-t border-slate-200/70">
                {/* Quota Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Dung lượng cấp phát cá nhân (GB) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quotaGB}
                      onChange={(e) => setQuotaGB(e.target.value)}
                      className={`w-full text-xs border rounded-lg px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all font-mono ${
                        isOverQuota
                          ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 text-rose-700 font-bold'
                          : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                    <span className="text-xs text-slate-500 font-medium">GB</span>
                  </div>
                  {isOverQuota ? (
                    <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Vượt quá dung lượng khả dụng ({maxAllowedGB} GB). Vui lòng điều chỉnh lại.</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Hạn mức lưu trữ tài liệu cá nhân của Trưởng phòng trên Cloud DMS.
                    </p>
                  )}
                </div>

                {/* Storage Provider Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Chỉ định Nguồn Lưu Trữ (Drive Provider)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedStorageProviderId}
                      onChange={(e) => setSelectedStorageProviderId(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
                    >
                      <option value="">⚡ Tự động phân bổ (FIFO - Theo chính sách hệ thống)</option>
                      {tenant.allocations && tenant.allocations.map((alloc) => {
                        const freeBytes = Math.max(0, alloc.grantedBytes - alloc.allocatedToChildrenBytes);
                        const freeGB = Number((freeBytes / (1024 ** 3)).toFixed(1));
                        return (
                          <option key={alloc.storageProviderId} value={alloc.storageProviderId}>
                            ☁️ {alloc.storageProviderName} (Còn trống: {freeGB} GB)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {selectedStorageProviderId
                      ? `Quota sẽ được trích trực tiếp từ ${chosenAlloc?.storageProviderName || 'Drive đã chọn'}.`
                      : 'Hệ thống tự động trích quota từ các Drive khả dụng theo thời gian nạp.'}
                  </p>
                </div>
              </div>

              {/* Multi-Drive Breakdown Cards */}
              {tenant.allocations && tenant.allocations.length > 0 && (
                <div className="pt-3 border-t border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Các Drive khả dụng của Doanh nghiệp ({tenant.allocations.length}):</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Bấm vào Drive để chọn nhanh</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tenant.allocations.map((alloc) => {
                      const freeBytes = Math.max(0, alloc.grantedBytes - alloc.allocatedToChildrenBytes);
                      const freeGB = Number((freeBytes / (1024 ** 3)).toFixed(1));
                      const grantedGB = Number((alloc.grantedBytes / (1024 ** 3)).toFixed(1));
                      const isSelected = selectedStorageProviderId === alloc.storageProviderId;

                      return (
                        <div
                          key={alloc.allocationId}
                          onClick={() => setSelectedStorageProviderId(isSelected ? '' : alloc.storageProviderId)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50/90 border-blue-400 ring-1 ring-blue-400/40 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-800 truncate" title={alloc.storageProviderName}>
                              {alloc.storageProviderName}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold shrink-0">
                                Đã chọn
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Khả dụng:</span>
                            <span className="font-mono font-bold text-emerald-600">{freeGB} GB</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.round(((alloc.grantedBytes - freeBytes) / (alloc.grantedBytes || 1)) * 100))}%`
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                            <span>Tổng: {grantedGB} GB</span>
                            <span>Đã chia: {Number(((alloc.grantedBytes - freeBytes) / (1024 ** 3)).toFixed(1))} GB</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
              <span>Tài khoản sẽ ở trạng thái chờ kích hoạt cho đến khi Trưởng phòng xác nhận qua email.</span>
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
                disabled={isSubmitting || isOverQuota}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi thư mời...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Gửi thư mời Department Admin</span>
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
