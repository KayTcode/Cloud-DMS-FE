import React, { useState, useEffect } from 'react';
import {
  X,
  UserX,
  Mail,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Building2,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import {
  SystemTenant,
  AdminUserDto,
  TenantAdminOffboardScenario,
  OffboardTenantAdminResult,
} from '../types';
import { offboardTenantAdminApi } from '../api/systemAdminCommands';
import { getTenantUsers } from '@/features/tenants/api';

interface OffboardTenantAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: SystemTenant | null;
  currentAdminUser?: AdminUserDto | null;
  onSuccess: (result: OffboardTenantAdminResult) => void;
}

export const OffboardTenantAdminModal: React.FC<OffboardTenantAdminModalProps> = ({
  isOpen,
  onClose,
  tenant,
  currentAdminUser,
  onSuccess,
}) => {
  const [scenario, setScenario] = useState<TenantAdminOffboardScenario>('InterimTakeover');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminLastName, setNewAdminLastName] = useState('');
  const [newAdminPhoneNumber, setNewAdminPhoneNumber] = useState('');
  const [handoverReason, setHandoverReason] = useState('Miễn nhiệm / Chuyển giao quản trị');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OffboardTenantAdminResult | null>(null);

  const [resolvedAdminId, setResolvedAdminId] = useState<string | null>(currentAdminUser?.id || tenant?.adminId || null);
  const [resolvedAdminName, setResolvedAdminName] = useState<string>(
    currentAdminUser?.fullName || tenant?.adminFullName || tenant?.name || 'Quản trị viên hiện tại'
  );
  const [resolvedAdminEmail, setResolvedAdminEmail] = useState<string>(
    currentAdminUser?.email || tenant?.adminEmail || 'N/A'
  );

  useEffect(() => {
    if (!isOpen || !tenant?.id) return;

    if (currentAdminUser?.id) {
      setResolvedAdminId(currentAdminUser.id);
      setResolvedAdminName(currentAdminUser.fullName || tenant.adminFullName || tenant.name);
      setResolvedAdminEmail(currentAdminUser.email || tenant.adminEmail || 'N/A');
      return;
    }

    if (tenant.adminId) {
      setResolvedAdminId(tenant.adminId);
      setResolvedAdminName(tenant.adminFullName || tenant.name);
      setResolvedAdminEmail(tenant.adminEmail || 'N/A');
      return;
    }

    // Tự động tìm TenantAdmin từ API nếu modal chưa nhận được ID
    getTenantUsers(tenant.id)
      .then((users) => {
        const found =
          users.find(
            (u) =>
              (u.role && u.role.includes('TenantAdmin')) ||
              (tenant.adminEmail && u.email?.toLowerCase() === tenant.adminEmail.toLowerCase())
          ) || users[0];

        if (found) {
          setResolvedAdminId(found.id);
          setResolvedAdminName(found.name || tenant.name);
          setResolvedAdminEmail(found.email);
        }
      })
      .catch((err) => console.warn('[Offboard] Tra cứu Quản trị viên thất bại:', err));
  }, [isOpen, tenant?.id, currentAdminUser, tenant?.adminId, tenant?.adminEmail, tenant?.adminFullName, tenant?.name]);

  if (!isOpen || !tenant) return null;

  const adminName = resolvedAdminName || currentAdminUser?.fullName || tenant.adminFullName || tenant.name;
  const adminEmail = resolvedAdminEmail || currentAdminUser?.email || tenant.adminEmail || 'N/A';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let adminId = resolvedAdminId || currentAdminUser?.id || tenant.adminId;
    if (!adminId) {
      try {
        const users = await getTenantUsers(tenant.id);
        const found =
          users.find(
            (u) =>
              (u.role && u.role.includes('TenantAdmin')) ||
              (tenant.adminEmail && u.email?.toLowerCase() === tenant.adminEmail.toLowerCase())
          ) || users[0];
        if (found) {
          adminId = found.id;
          setResolvedAdminId(found.id);
        }
      } catch {
        // ignore
      }
    }

    if (!adminId) {
      setError('Không thể xác định mã ID của Quản trị viên Doanh nghiệp hiện tại để vô hiệu hóa.');
      return;
    }

    if (scenario === 'InviteNewTenantAdmin') {
      if (!newAdminEmail.trim()) {
        setError('Vui lòng nhập Email của Quản trị viên mới.');
        return;
      }
      if (!newAdminFirstName.trim() || !newAdminLastName.trim()) {
        setError('Vui lòng nhập đầy đủ Họ và Tên của Quản trị viên mới.');
        return;
      }
      if (newAdminEmail.trim().toLowerCase() === adminEmail.toLowerCase()) {
        setError('Email mời Quản trị viên mới không được trùng với tài khoản đang bị vô hiệu hóa.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await offboardTenantAdminApi(tenant.id, {
        tenantAdminId: adminId,
        scenario,
        newAdminEmail: scenario === 'InviteNewTenantAdmin' ? newAdminEmail.trim() : undefined,
        newAdminFirstName: scenario === 'InviteNewTenantAdmin' ? newAdminFirstName.trim() : undefined,
        newAdminLastName: scenario === 'InviteNewTenantAdmin' ? newAdminLastName.trim() : undefined,
        newAdminPhoneNumber: scenario === 'InviteNewTenantAdmin' ? newAdminPhoneNumber.trim() : undefined,
        reason: handoverReason.trim() || undefined,
      });

      setResult(res);
      onSuccess(res);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Có lỗi xảy ra khi thực hiện vô hiệu hóa Quản trị viên.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Vô hiệu hóa Quản trị viên Tổ chức (TenantAdmin)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Doanh nghiệp: <span className="font-semibold text-slate-700 dark:text-slate-200">{tenant.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {result ? (
            /* Result View */
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Chuyển giao Quyền Quản trị Thành công!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-md mx-auto">
                  {result.message}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã Tổ chức:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{result.tenantId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hình thức:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {result.isInterimManaged ? 'System Admin Tiếp quản lâm thời' : 'Bổ nhiệm / Mời Quản trị viên mới'}
                  </span>
                </div>
                {result.invitationTokenExpiresAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hạn kích hoạt:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">48 Giờ</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-slate-500">Tài sản số & Quota phòng ban:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Bảo toàn 100%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium rounded-xl text-sm transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          ) : (
            /* Form View */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Zero File Transfer Architecture Banner */}
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
                <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">ĐẶC TÍNH KIẾN TRÚC: ZERO FILE TRANSFER BY DESIGN</p>
                  <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                    TenantAdmin không sở hữu Drive cá nhân hay lưu trữ file trực tiếp. 100% tệp tin và Quota lưu trữ của các phòng ban bên dưới được bảo toàn nguyên vẹn, không có bất kỳ file nào bị di chuyển hay thất thoát.
                  </p>
                </div>
              </div>

              {/* Current Admin Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quản trị viên cần vô hiệu hóa:</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{adminName}</div>
                    <div className="text-xs text-slate-500 font-mono">{adminEmail}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-2xs font-semibold rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
                  Sẽ bị thu hồi quyền ngay lập tức
                </span>
              </div>

              {/* Scenario Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Chọn Phương thức Chuyển giao Quyền Quản trị:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Scenario 1: InterimTakeover */}
                  <div
                    onClick={() => setScenario('InterimTakeover')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scenario === 'InterimTakeover'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 font-bold text-xs text-slate-900 dark:text-white">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      System Admin Tiếp quản Lâm thời
                    </div>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Chưa có người thay thế ngay. Tổ chức chuyển sang chế độ khuyết Admin do System Admin trực tiếp tạm quyền điều hành.
                    </p>
                  </div>

                  {/* Scenario 2: InviteNewTenantAdmin */}
                  <div
                    onClick={() => setScenario('InviteNewTenantAdmin')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scenario === 'InviteNewTenantAdmin'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 font-bold text-xs text-slate-900 dark:text-white">
                      <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Mời Quản trị viên Mới qua Email
                    </div>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Sinh Token kích hoạt 48 giờ và gửi email qua Gmail cho Quản trị viên mới để thiết lập tài khoản.
                    </p>
                  </div>

                </div>
              </div>

              {/* Form fields for Scenario: InviteNewTenantAdmin */}
              {scenario === 'InviteNewTenantAdmin' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Thông tin Quản trị viên Mới
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400">Họ & Tên đệm *</label>
                      <input
                        type="text"
                        required
                        value={newAdminLastName}
                        onChange={(e) => setNewAdminLastName(e.target.value)}
                        placeholder="Nguyễn Văn"
                        className="mt-1 w-full px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400">Tên *</label>
                      <input
                        type="text"
                        required
                        value={newAdminFirstName}
                        onChange={(e) => setNewAdminFirstName(e.target.value)}
                        placeholder="An"
                        className="mt-1 w-full px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400">Email kích hoạt *</label>
                    <input
                      type="email"
                      required
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="admin.moi@congty.com"
                      className="mt-1 w-full px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400">Số điện thoại (tùy chọn)</label>
                    <input
                      type="tel"
                      value={newAdminPhoneNumber}
                      onChange={(e) => setNewAdminPhoneNumber(e.target.value)}
                      placeholder="0912345678"
                      className="mt-1 w-full px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Handover Reason */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lý do chuyển giao / Ghi chú điều hành:
                </label>
                <textarea
                  rows={2}
                  value={handoverReason}
                  onChange={(e) => setHandoverReason(e.target.value)}
                  placeholder="Nhập lý do thay đổi nhân sự để lưu vết Audit Log..."
                  className="mt-1 w-full px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xác nhận Vô hiệu hóa & Chuyển giao
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};

