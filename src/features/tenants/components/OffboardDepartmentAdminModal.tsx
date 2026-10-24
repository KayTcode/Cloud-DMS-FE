import React, { useState } from 'react';
import {
  X,
  UserX,
  Mail,
  UserCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  FolderSync,
  HardDrive
} from 'lucide-react';
import { Department, TenantUser } from '@/features/tenants/types';
import { offboardDepartmentAdminApi, OffboardDepartmentAdminResult } from '@/features/tenants/api/tenantCommands';

interface OffboardDepartmentAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  tenantId: string;
  users: TenantUser[];
  onSuccess: (result: OffboardDepartmentAdminResult) => void;
}

type ScenarioType = 'INVITE_EMAIL' | 'INTERIM_TENANT_ADMIN' | 'DESIGNATED_EMPLOYEE';

export const OffboardDepartmentAdminModal: React.FC<OffboardDepartmentAdminModalProps> = ({
  isOpen,
  onClose,
  department,
  tenantId,
  users,
  onSuccess,
}) => {
  const [scenario, setScenario] = useState<ScenarioType>('INVITE_EMAIL');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminLastName, setNewAdminLastName] = useState('');
  const [newAdminPhoneNumber, setNewAdminPhoneNumber] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [handoverReason, setHandoverReason] = useState('Nghỉ việc / Chuyển giao công tác');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OffboardDepartmentAdminResult | null>(null);

  if (!isOpen || !department) return null;

  // Tìm tài khoản Trưởng phòng hiện tại dựa trên adminId, adminEmail hoặc tên lead
  const currentAdmin = department.adminId
    ? users.find((u) => u.id === department.adminId) || {
        id: department.adminId,
        name: department.lead,
        email: department.adminEmail || '',
        department: department.name,
        role: 'DepartmentAdmin',
        status: (department.adminIsActive !== false ? 'Active' : 'Suspended') as 'Active' | 'Suspended',
        lastActive: 'Just now',
      }
    : users.find(
        (u) =>
          (department.adminEmail && u.email.toLowerCase() === department.adminEmail.toLowerCase()) ||
          (u.role.includes('DepartmentAdmin') && u.department === department.name)
      );

  const isAdminActive = currentAdmin ? currentAdmin.status === 'Active' : (department.adminIsActive !== false);

  // Danh sách TenantAdmin (dành cho Kịch bản 2)
  const tenantAdmins = users.filter((u) => u.role.includes('TenantAdmin') && u.status === 'Active');

  // Danh sách Nhân viên cùng phòng ban (dành cho Kịch bản 3)
  const departmentEmployees = users.filter(
    (u) =>
      u.department === department.name &&
      u.id !== currentAdmin?.id &&
      u.status === 'Active'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentAdmin?.id) {
      setError('Không xác định được ID tài khoản Trưởng phòng hiện tại để tiến hành vô hiệu hóa.');
      return;
    }

    if (!isAdminActive) {
      setError('Tài khoản Trưởng phòng cần vô hiệu hóa không tồn tại hoặc đã bị khóa trước đó.');
      return;
    }

    if (scenario === 'INVITE_EMAIL') {
      if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
        setError('Vui lòng nhập địa chỉ Email hợp lệ của Trưởng phòng mới.');
        return;
      }
      if (!newAdminFirstName.trim() || !newAdminLastName.trim()) {
        setError('Vui lòng nhập đầy đủ Họ và Tên của Trưởng phòng mới.');
        return;
      }
    } else {
      if (!targetUserId) {
        setError(
          scenario === 'INTERIM_TENANT_ADMIN'
            ? 'Vui lòng chọn Quản trị viên Tenant tiếp nhận tạm thời.'
            : 'Vui lòng chọn Nhân viên trong phòng ban để thăng chức làm Trưởng phòng mới.'
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload = {
        departmentAdminId: currentAdmin.id,
        targetUserId: scenario !== 'INVITE_EMAIL' ? targetUserId : null,
        newAdminEmail: scenario === 'INVITE_EMAIL' ? newAdminEmail.trim() : null,
        newAdminFirstName: scenario === 'INVITE_EMAIL' ? newAdminFirstName.trim() : null,
        newAdminLastName: scenario === 'INVITE_EMAIL' ? newAdminLastName.trim() : null,
        newAdminPhoneNumber: scenario === 'INVITE_EMAIL' && newAdminPhoneNumber.trim() ? newAdminPhoneNumber.trim() : null,
        handoverReason: handoverReason.trim() || null,
      };

      const res = await offboardDepartmentAdminApi(tenantId, payload);
      setResult(res);
      onSuccess(res);
    } catch (err: any) {
      console.error('Lỗi khi thực thi Offboard Department Admin:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Đã xảy ra lỗi trong quá trình vô hiệu hóa và bàn giao dữ liệu.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setResult(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Vô hiệu hóa Trưởng phòng & Bàn giao Dữ liệu
              </h3>
              <p className="text-xs text-slate-500">
                Phòng ban: <strong className="text-slate-700">{department.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {result ? (
            /* Thông báo kết quả thành công */
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-emerald-800 text-sm">
                    Vô hiệu hóa & Bàn giao thành công!
                  </div>
                  <p className="text-emerald-700">
                    Tài khoản của Trưởng phòng cũ đã bị khóa, toàn bộ token và phiên tải dở dang đã bị thu hồi.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                  Chi tiết kết quả bàn giao:
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>Thư mục bàn giao: <strong className="text-slate-900">{result.handoverFolderName}</strong></div>
                  <div>Tệp tin đã chuyển giao: <strong className="text-slate-900">{result.transferredFilesCount} files</strong></div>
                  <div>Thư mục đã chuyển giao: <strong className="text-slate-900">{result.transferredFoldersCount} folders</strong></div>
                  <div>Phiên upload đã hủy: <strong className="text-slate-900">{result.abortedUploadSessionsCount}</strong></div>
                  <div>Bổ nhiệm Trưởng phòng mới: <strong className="text-emerald-600">{result.isNewDepartmentLeadAssigned ? 'Có (Đã bổ nhiệm)' : 'Chưa (Tạm khuyết)'}</strong></div>
                  <div>Thời gian hoàn tất: <strong className="text-slate-900">{new Date(result.offboardedAt).toLocaleTimeString()}</strong></div>
                </div>
              </div>

              <div className="text-right pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Thông tin Trưởng phòng hiện tại sắp nghỉ */}
              <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Trưởng phòng nghỉ việc: <strong>{department.lead}</strong></span>
                  </div>
                  <div className="text-[11px] text-rose-700 font-mono mt-0.5 ml-5.5">
                    {department.adminEmail || 'Email chưa cập nhật'}
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <div>
                    Trạng thái:{' '}
                    <strong className={isAdminActive ? 'text-emerald-700' : 'text-rose-700 font-bold'}>
                      {isAdminActive ? 'Đang hoạt động' : 'Đã khóa / Chưa kích hoạt'}
                    </strong>
                  </div>
                  <div className={isAdminActive ? 'text-rose-500 font-medium' : 'text-slate-500 font-medium'}>
                    {isAdminActive ? 'Sẽ bị vô hiệu hóa tức thì' : 'Không thể vô hiệu hóa lại'}
                  </div>
                </div>
              </div>

              {/* Lựa chọn Kịch bản bàn giao */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Hình thức Kế nhiệm & Bàn giao:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Kịch bản 1: Mời qua Email */}
                  <button
                    type="button"
                    onClick={() => {
                      setScenario('INVITE_EMAIL');
                      setTargetUserId('');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      scenario === 'INVITE_EMAIL'
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Mail className={`w-3.5 h-3.5 ${scenario === 'INVITE_EMAIL' ? 'text-blue-600' : 'text-slate-500'}`} />
                        <span>Mời Trưởng phòng Mới</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Gửi Gmail mời tài khoản mới bên ngoài tiếp quản và nhận dữ liệu.
                      </p>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded w-fit">
                      Khuyên dùng
                    </span>
                  </button>

                  {/* Kịch bản 3: Thăng chức nhân viên */}
                  <button
                    type="button"
                    onClick={() => {
                      setScenario('DESIGNATED_EMPLOYEE');
                      setTargetUserId('');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      scenario === 'DESIGNATED_EMPLOYEE'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <UserCheck className={`w-3.5 h-3.5 ${scenario === 'DESIGNATED_EMPLOYEE' ? 'text-indigo-600' : 'text-slate-500'}`} />
                        <span>Thăng chức Nhân viên</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Chỉ định 1 nhân viên cùng phòng lên làm Trưởng phòng mới.
                      </p>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded w-fit">
                      Nội bộ phòng
                    </span>
                  </button>

                  {/* Kịch bản 2: TenantAdmin giữ tạm */}
                  <button
                    type="button"
                    onClick={() => {
                      setScenario('INTERIM_TENANT_ADMIN');
                      setTargetUserId(tenantAdmins[0]?.id || '');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      scenario === 'INTERIM_TENANT_ADMIN'
                        ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <ShieldAlert className={`w-3.5 h-3.5 ${scenario === 'INTERIM_TENANT_ADMIN' ? 'text-amber-600' : 'text-slate-500'}`} />
                        <span>TenantAdmin Tạm giữ</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Nắm giữ tài liệu tạm thời khi chưa có Trưởng phòng mới.
                      </p>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded w-fit">
                      Tạm khuyết Lead
                    </span>
                  </button>
                </div>
              </div>

              {/* Form Chi tiết tùy theo kịch bản */}
              {scenario === 'INVITE_EMAIL' && (
                <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-3">
                  <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Thông tin Trưởng phòng Mới (Mời qua Gmail):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Email nhận lời mời <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="new_lead@gmail.com"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={newAdminPhoneNumber}
                        onChange={(e) => setNewAdminPhoneNumber(e.target.value)}
                        placeholder="0901234567"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Họ & Tên đệm <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdminLastName}
                        onChange={(e) => setNewAdminLastName(e.target.value)}
                        placeholder="Nguyễn Văn"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Tên <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdminFirstName}
                        onChange={(e) => setNewAdminFirstName(e.target.value)}
                        placeholder="An"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-blue-700 pt-1">
                    * Hệ thống sẽ gửi email kích hoạt (thời hạn 48 giờ). Sau khi kích hoạt, người này có toàn quyền Trưởng phòng và kế thừa toàn bộ tài liệu bàn giao.
                  </p>
                </div>
              )}

              {scenario === 'DESIGNATED_EMPLOYEE' && (
                <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200/80 space-y-2">
                  <label className="text-xs font-bold text-indigo-950 block">
                    Chọn Nhân viên trong phòng ban để thăng chức:
                  </label>
                  {departmentEmployees.length === 0 ? (
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      Phòng ban hiện chưa có nhân viên nào khác. Vui lòng chọn <strong>Mời qua Email</strong> hoặc <strong>TenantAdmin Tạm giữ</strong>.
                    </div>
                  ) : (
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 cursor-pointer"
                    >
                      <option value="">-- Chọn nhân viên kế nhiệm --</option>
                      {departmentEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email}) - {emp.role}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[11px] text-indigo-700 pt-1">
                    * Nhân viên được chọn sẽ ngay lập tức được cấp vai trò Trưởng phòng (DepartmentAdmin) và tiếp quản toàn bộ tài sản số.
                  </p>
                </div>
              )}

              {scenario === 'INTERIM_TENANT_ADMIN' && (
                <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-2">
                  <label className="text-xs font-bold text-amber-950 block">
                    Chọn Quản trị viên Tổ chức (TenantAdmin) nắm giữ tạm thời:
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Chọn TenantAdmin tiếp nhận --</option>
                    {tenantAdmins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-amber-700 pt-1">
                    * Dữ liệu sẽ được lưu trong thư mục riêng của TenantAdmin. Phòng ban tạm thời ở trạng thái khuyết Trưởng phòng.
                  </p>
                </div>
              )}

              {/* Lý do bàn giao */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Lý do bàn giao & vô hiệu hóa:
                </label>
                <input
                  type="text"
                  value={handoverReason}
                  onChange={(e) => setHandoverReason(e.target.value)}
                  placeholder="Nghỉ việc / Chuyển công tác..."
                  className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xử lý bàn giao...</span>
                    </>
                  ) : (
                    <>
                      <FolderSync className="w-3.5 h-3.5" />
                      <span>Xác nhận Vô hiệu hóa & Bàn giao</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
