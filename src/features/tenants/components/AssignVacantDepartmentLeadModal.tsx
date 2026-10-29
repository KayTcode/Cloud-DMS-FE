import React, { useState } from 'react';
import {
  X,
  Crown,
  Mail,
  UserCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FolderSync,
  HardDrive,
  UserPlus,
  ArrowRight,
  Info
} from 'lucide-react';
import { Department, TenantUser, AssignVacantDepartmentLeadResultDto } from '@/features/tenants/types';
import { assignVacantDepartmentLeadApi } from '@/features/tenants/api/tenantCommands';
import apiClient from '@/api/axiosClient';

interface AssignVacantDepartmentLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  tenantId: string;
  users: TenantUser[];
  onSuccess: (result: AssignVacantDepartmentLeadResultDto) => void;
}

type PromotionMode = 'INTERNAL_PROMOTION' | 'INVITE_EMAIL';

export const AssignVacantDepartmentLeadModal: React.FC<AssignVacantDepartmentLeadModalProps> = ({
  isOpen,
  onClose,
  department,
  tenantId,
  users,
  onSuccess,
}) => {
  const [mode, setMode] = useState<PromotionMode>('INTERNAL_PROMOTION');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminLastName, setNewAdminLastName] = useState('');
  const [newAdminPhoneNumber, setNewAdminPhoneNumber] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssignVacantDepartmentLeadResultDto | null>(null);

  // Danh sách nhân viên thực sự trong phòng ban lấy thời gian thực từ Database
  const [liveEmployees, setLiveEmployees] = useState<TenantUser[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Fetch danh sách nhân viên đang active thuộc phòng ban trực tiếp từ DB khi mở Modal
  React.useEffect(() => {
    if (!isOpen || !department?.id) return;

    let isMounted = true;
    setIsLoadingEmployees(true);

    apiClient
      .get(`/tenants/${tenantId}/users`, {
        params: {
          TenantId: tenantId,
          DepartmentId: department.id,
          IsActive: true,
          PageSize: 100,
        },
      })
      .then((res: any) => {
        if (!isMounted) return;
        const raw = res?.value || res?.data || res;
        const items = raw?.items || (Array.isArray(raw) ? raw : []);
        if (Array.isArray(items)) {
          // Chỉ lấy nhân viên thông thường (Employee / User), loại bỏ hoàn toàn Trưởng phòng cũ/mới và Admin
          const filtered: TenantUser[] = items
            .filter((u: any) => {
              const isActive = u.isActive !== false;
              const hasAdminRole = Array.isArray(u.roles) && u.roles.some((r: string) => r.includes('Admin'));
              return isActive && !hasAdminRole;
            })
            .map((u: any) => ({
              id: u.id,
              name: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              email: u.email,
              department: u.departmentName || department.name,
              role: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles.join(', ') : 'Employee',
              status: 'Active',
              lastActive: 'Just now',
            }));

          setLiveEmployees(filtered);
        }
      })
      .catch((err) => {
        console.warn('Không thể tải danh sách nhân viên từ DB, dùng danh sách dự phòng:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingEmployees(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, department?.id, tenantId, department?.name]);

  if (!isOpen || !department) return null;

  // Danh sách nhân viên ưu tiên từ live API; fallback lọc từ context nhưng bắt buộc loại trừ Admin
  const departmentEmployees = liveEmployees.length > 0
    ? liveEmployees
    : users.filter(
        (u) =>
          u.department === department.name &&
          u.status === 'Active' &&
          !u.role.includes('Admin') &&
          u.id !== department.adminId
      );

  // Tính dung lượng Quota tạm giữ dạng GB
  const vacantQuotaGB = department.vacantLeadQuotaBytes
    ? (department.vacantLeadQuotaBytes / (1024 * 1024 * 1024)).toFixed(1)
    : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'INTERNAL_PROMOTION') {
      if (!targetUserId) {
        setError('Vui lòng chọn một nhân viên trong phòng ban để thăng chức làm Trưởng phòng.');
        return;
      }
    } else {
      if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
        setError('Vui lòng nhập địa chỉ Email hợp lệ của Trưởng phòng mới.');
        return;
      }
      if (!newAdminFirstName.trim() || !newAdminLastName.trim()) {
        setError('Vui lòng nhập đầy đủ Họ và Tên của Trưởng phòng mới.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload = {
        departmentId: department.id,
        targetUserId: mode === 'INTERNAL_PROMOTION' ? targetUserId : null,
        newAdminEmail: mode === 'INVITE_EMAIL' ? newAdminEmail.trim() : null,
        newAdminFirstName: mode === 'INVITE_EMAIL' ? newAdminFirstName.trim() : null,
        newAdminLastName: mode === 'INVITE_EMAIL' ? newAdminLastName.trim() : null,
        newAdminPhoneNumber: mode === 'INVITE_EMAIL' && newAdminPhoneNumber.trim() ? newAdminPhoneNumber.trim() : null,
      };

      const res = await assignVacantDepartmentLeadApi(tenantId, department.id, payload);
      setResult(res);
      onSuccess(res);
    } catch (err: any) {
      console.error('Lỗi khi bổ nhiệm Trưởng phòng khuyết:', err);
      const apiError = err?.response?.data?.errors?.[0] || err?.response?.data?.message || err?.message || 'Đã xảy ra lỗi trong quá trình xử lý.';
      setError(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setResult(null);
    setError(null);
    setTargetUserId('');
    setNewAdminEmail('');
    setNewAdminFirstName('');
    setNewAdminLastName('');
    setNewAdminPhoneNumber('');
    setMode('INTERNAL_PROMOTION');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bổ nhiệm Trưởng phòng & Bàn giao Kho
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Phòng ban: <strong className="text-blue-700">{department.name}</strong> (Khuyết Lead)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Màn hình thông báo kết quả thành công */}
          {result ? (
            <div className="space-y-5 py-2">
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950">
                  <div className="font-bold text-sm text-emerald-900 mb-1">
                    Bổ nhiệm & Chuyển giao thành công!
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    Trưởng phòng mới đã được thiết lập thành công cho phòng ban <strong>{result.departmentName}</strong>. 
                    {result.isInternalPromotion 
                      ? ' Nhân viên đã được nâng cấp quyền Trưởng phòng và làm mới phiên đăng nhập.'
                      : ' Thư mời kích hoạt tài khoản kèm mật khẩu tạm đã được gửi tới Gmail của Trưởng phòng mới.'}
                  </p>
                </div>
              </div>

              {/* Chi tiết bàn giao */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800 border-b border-slate-200/70 pb-2 flex items-center gap-2">
                  <FolderSync className="w-4 h-4 text-blue-600" />
                  <span>Biên bản chuyển giao tài nguyên</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Trưởng phòng mới:</span>
                    <strong className="text-slate-900 truncate block">{result.newDepartmentAdminName}</strong>
                    <span className="text-[10px] text-slate-500 font-mono truncate block">{result.newDepartmentAdminEmail}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Hình thức bổ nhiệm:</span>
                    <strong className="text-blue-700 block">
                      {result.isInternalPromotion ? 'Thăng chức nội bộ' : 'Mời qua Email'}
                    </strong>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {result.isInvitationEmailSent ? 'Đã gửi Gmail kích hoạt' : 'Kích hoạt tức thì'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Tài liệu bàn giao:</span>
                    <strong className="text-slate-900 block">{result.transferredFilesCount} files</strong>
                    <span className="text-[10px] text-slate-500">
                      {(result.transferredBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Hạn mức Quota tổng:</span>
                    <strong className="text-emerald-700 block">
                      {(result.newAdminTotalQuotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
                    </strong>
                    <span className="text-[10px] text-slate-500">Kế thừa nguyên trạng</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Context Banner: Kho tạm giữ & Hạn mức kế thừa */}
              <div className="bg-blue-50/80 border border-blue-200/90 rounded-xl p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    <span>Kho lưu trữ & Quota bàn giao nguyên trạng</span>
                  </span>
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] font-mono">
                    {vacantQuotaGB} GB kế thừa
                  </span>
                </div>
                <p className="text-[11px] text-blue-900/80 leading-relaxed">
                  Trưởng phòng mới sẽ kế thừa trọn vẹn <strong>{vacantQuotaGB} GB Quota</strong> và toàn bộ thư mục tài liệu từ giai đoạn tạm giữ. 
                  TenantAdmin chỉ bàn giao nguyên trạng, không can thiệp điều chỉnh quota cá nhân.
                </p>
                <div className="flex items-center gap-2 text-[10px] text-blue-800/70 pt-1 border-t border-blue-200/60">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Trưởng phòng mới sau khi nhận chức sẽ toàn quyền quản lý và chia sẻ quota nội bộ cho nhân viên.</span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="font-medium">{error}</div>
                </div>
              )}

              {/* Mode Selection Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">
                  Chọn hình thức Bổ nhiệm Trưởng phòng:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('INTERNAL_PROMOTION')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      mode === 'INTERNAL_PROMOTION'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                      <UserCheck className={`w-4 h-4 ${mode === 'INTERNAL_PROMOTION' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>Thăng chức Nội bộ</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Chọn 1 nhân viên hiện tại trong phòng ban lên làm Trưởng phòng.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('INVITE_EMAIL')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      mode === 'INVITE_EMAIL'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                      <Mail className={`w-4 h-4 ${mode === 'INVITE_EMAIL' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>Mời qua Email</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Gửi thư mời kích hoạt tài khoản Lead mới qua Gmail (48h).
                    </p>
                  </button>
                </div>
              </div>

              {/* Form Fields theo từng Mode */}
              {mode === 'INTERNAL_PROMOTION' ? (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="text-xs font-bold text-slate-800 block">
                    Danh sách nhân viên trong phòng ban ({departmentEmployees.length}):
                  </label>
                  {departmentEmployees.length === 0 ? (
                    <div className="text-center py-4 px-3 bg-white rounded-lg border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">
                        Phòng ban hiện chưa có nhân viên nào đang hoạt động.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMode('INVITE_EMAIL')}
                        className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Chuyển sang hình thức Mời qua Email</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- Chọn nhân viên được thăng chức --</option>
                      {departmentEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email}) - {emp.role}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Nhân viên được chọn sẽ nhận vai trò <strong>DepartmentAdmin</strong> ngay lập tức, phiên đăng nhập được làm mới tức thì và nhận toàn bộ kho tài liệu.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Họ đệm <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newAdminFirstName}
                        onChange={(e) => setNewAdminFirstName(e.target.value)}
                        placeholder="Nguyễn Văn"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Tên <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newAdminLastName}
                        onChange={(e) => setNewAdminLastName(e.target.value)}
                        placeholder="An"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Địa chỉ Email mời <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="truongphong.moi@acme.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Số điện thoại liên hệ (tùy chọn)
                    </label>
                    <input
                      type="tel"
                      value={newAdminPhoneNumber}
                      onChange={(e) => setNewAdminPhoneNumber(e.target.value)}
                      placeholder="0912345678"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (mode === 'INTERNAL_PROMOTION' && departmentEmployees.length === 0)}
                  className="px-4.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Xác nhận Bổ nhiệm & Bàn giao</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
