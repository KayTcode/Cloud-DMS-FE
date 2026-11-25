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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Vô hiệu hóa Quản trị viên
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {tenant.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {tenant.tenantCode ? `Mã: ${tenant.tenantCode} · ` : ''}ID: {tenant.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {result ? (
            /* Result View: Hiển thị sau khi chuyển giao thành công */
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Chuyển giao quyền quản trị thành công!
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  {result.message}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-400">Tổ chức:</span>
                  <span className="font-semibold text-slate-800">{tenant.name}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-400">Hình thức:</span>
                  <span className="font-semibold text-blue-600">
                    {result.isInterimManaged ? 'System Admin tiếp quản lâm thời' : 'Mời Quản trị viên mới'}
                  </span>
                </div>
                {result.invitationTokenExpiresAt && (
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Thời hạn kích hoạt:</span>
                    <span className="font-semibold text-amber-600">48 Giờ</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400">Tài sản số & Quota PB:</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Bảo toàn 100%
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          ) : (
            /* Form View */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Alert thông báo bảo toàn dữ liệu (Gọn gàng & Chuyên nghiệp) */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="leading-relaxed">
                  Toàn bộ tệp tin và Quota lưu trữ của các phòng ban được <strong>bảo toàn nguyên vẹn 100%</strong>.
                </span>
              </div>

              {/* Thông tin Quản trị viên cần vô hiệu hóa */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                    {adminName.substring(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">Quản trị viên bị vô hiệu hóa:</div>
                    <div className="text-xs font-bold text-slate-900 truncate">{adminName}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{adminEmail}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-rose-50 text-rose-600 border border-rose-200/60 shrink-0">
                  Thu hồi quyền
                </span>
              </div>

              {/* Lựa chọn phương thức chuyển giao */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Phương thức tiếp quản quản trị:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Scenario 1: InterimTakeover */}
                  <div
                    onClick={() => setScenario('InterimTakeover')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scenario === 'InterimTakeover'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-950 ring-2 ring-blue-500/20 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 font-bold text-xs">
                      <Building2 className={`w-4 h-4 ${scenario === 'InterimTakeover' ? 'text-blue-600' : 'text-slate-500'}`} />
                      <span>Tiếp quản lâm thời</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      System Admin tạm quyền điều hành tổ chức trong khi chờ nhân sự mới.
                    </p>
                  </div>

                  {/* Scenario 2: InviteNewTenantAdmin */}
                  <div
                    onClick={() => setScenario('InviteNewTenantAdmin')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scenario === 'InviteNewTenantAdmin'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-950 ring-2 ring-blue-500/20 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 font-bold text-xs">
                      <Mail className={`w-4 h-4 ${scenario === 'InviteNewTenantAdmin' ? 'text-blue-600' : 'text-slate-500'}`} />
                      <span>Bổ nhiệm qua Email</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Gửi thư mời kèm mã kích hoạt 48 giờ qua Gmail cho Quản trị viên mới.
                    </p>
                  </div>

                </div>
              </div>

              {/* Form fields khi chọn mời Admin mới qua Email */}
              {scenario === 'InviteNewTenantAdmin' && (
                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Thông tin Quản trị viên mới</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Họ & Tên đệm *</label>
                      <input
                        type="text"
                        required
                        value={newAdminLastName}
                        onChange={(e) => setNewAdminLastName(e.target.value)}
                        placeholder="Nguyễn Văn"
                        className="mt-1 w-full px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Tên *</label>
                      <input
                        type="text"
                        required
                        value={newAdminFirstName}
                        onChange={(e) => setNewAdminFirstName(e.target.value)}
                        placeholder="An"
                        className="mt-1 w-full px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Email kích hoạt *</label>
                    <input
                      type="email"
                      required
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="admin.moi@congty.com"
                      className="mt-1 w-full px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Số điện thoại (tùy chọn)</label>
                    <input
                      type="tel"
                      value={newAdminPhoneNumber}
                      onChange={(e) => setNewAdminPhoneNumber(e.target.value)}
                      placeholder="0912345678"
                      className="mt-1 w-full px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* Lý do chuyển giao */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block">
                  Lý do chuyển giao / Ghi chú (tùy chọn):
                </label>
                <textarea
                  rows={2}
                  value={handoverReason}
                  onChange={(e) => setHandoverReason(e.target.value)}
                  placeholder="Ghi chú lý do thay đổi để lưu vết nhật ký hệ thống..."
                  className="mt-1 w-full px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                />
              </div>

              {/* Alert báo lỗi nếu có */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isLoading ? 'Đang xử lý...' : 'Xác nhận chuyển giao'}</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
