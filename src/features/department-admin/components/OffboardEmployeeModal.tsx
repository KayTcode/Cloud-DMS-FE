import React, { useState } from 'react';
import {
  X,
  UserX,
  Mail,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FolderSync,
} from 'lucide-react';
import { DepartmentMember, DepartmentInfo } from '../types';
import { departmentApi } from '../api';
import {
  OffboardEmployeePayload,
  OffboardEmployeeResultDto,
  EmployeeHandoverScenario,
} from '../types/departmentAdmin.dto';
import { formatBytes } from '../utils/quotaUtils';

interface OffboardEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: DepartmentMember | null;
  department: DepartmentInfo;
  departmentMembers: DepartmentMember[];
  onSuccess: (result: OffboardEmployeeResultDto) => void;
}

export const OffboardEmployeeModal: React.FC<OffboardEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  department,
  departmentMembers,
  onSuccess,
}) => {
  const [scenario, setScenario] = useState<EmployeeHandoverScenario>('DESIGNATED_PEER');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeeFirstName, setNewEmployeeFirstName] = useState('');
  const [newEmployeeLastName, setNewEmployeeLastName] = useState('');
  const [newEmployeePhoneNumber, setNewEmployeePhoneNumber] = useState('');
  const [handoverReason, setHandoverReason] = useState('Nghỉ việc / Chuyển giao công tác');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OffboardEmployeeResultDto | null>(null);

  if (!isOpen || !employee) return null;

  // Lọc danh sách đồng nghiệp cùng phòng đang Active (loại trừ chính người bị offboard và tài khoản tạm ngưng)
  const availablePeers = departmentMembers.filter(
    (m) => m.id !== employee.id && m.status !== 'paused'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!department.id) {
      setError('Không xác định được mã phòng ban.');
      return;
    }

    if (scenario === 'DESIGNATED_PEER') {
      if (!targetUserId) {
        setError('Vui lòng chọn Đồng nghiệp cùng phòng ban để tiếp quản bàn giao.');
        return;
      }
      if (targetUserId === employee.id) {
        setError('Không thể bàn giao cho chính nhân viên đang thôi việc.');
        return;
      }
    } else if (scenario === 'INVITE_NEW_EMPLOYEE') {
      if (!newEmployeeEmail.trim() || !newEmployeeEmail.includes('@')) {
        setError('Vui lòng nhập địa chỉ Email hợp lệ của nhân sự mới.');
        return;
      }
      if (!newEmployeeFirstName.trim() || !newEmployeeLastName.trim()) {
        setError('Vui lòng nhập đầy đủ Họ và Tên của nhân sự mới.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload: OffboardEmployeePayload = {
        employeeId: employee.id,
        targetUserId:
          scenario === 'DESIGNATED_PEER'
            ? targetUserId
            : null,
        newEmployeeEmail:
          scenario === 'INVITE_NEW_EMPLOYEE' ? newEmployeeEmail.trim() : null,
        newEmployeeFirstName:
          scenario === 'INVITE_NEW_EMPLOYEE' ? newEmployeeFirstName.trim() : null,
        newEmployeeLastName:
          scenario === 'INVITE_NEW_EMPLOYEE' ? newEmployeeLastName.trim() : null,
        newEmployeePhoneNumber:
          scenario === 'INVITE_NEW_EMPLOYEE' && newEmployeePhoneNumber.trim()
            ? newEmployeePhoneNumber.trim()
            : null,
        handoverReason: handoverReason.trim() || null,
      };

      const res = await departmentApi.offboardEmployee(department.id, payload);
      setResult(res);
      onSuccess(res);
    } catch (err: any) {
      console.error('Lỗi khi thực thi Offboard Nhân viên:', err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Đã xảy ra lỗi trong quá trình vô hiệu hóa và bàn giao dữ liệu nhân viên.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setResult(null);
      setTargetUserId('');
      setNewEmployeeEmail('');
      setNewEmployeeFirstName('');
      setNewEmployeeLastName('');
      setNewEmployeePhoneNumber('');
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
                Vô hiệu hóa Nhân viên & Bàn giao Tài sản số
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
                    Tài khoản của nhân viên đã bị khóa tức thì, toàn bộ token đăng nhập và phiên tải tệp dở dang đã được thu hồi.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                  Chi tiết kết quả bàn giao dữ liệu:
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    Thư mục bàn giao:{' '}
                    <strong className="text-slate-900">{result.handoverFolderName}</strong>
                  </div>
                  <div>
                    Tệp tin đã chuyển giao:{' '}
                    <strong className="text-slate-900">{result.transferredFilesCount} files</strong>
                  </div>
                  <div>
                    Thư mục đã chuyển giao:{' '}
                    <strong className="text-slate-900">{result.transferredFoldersCount} folders</strong>
                  </div>
                  <div>
                    Phiên upload đã hủy:{' '}
                    <strong className="text-slate-900">{result.abortedUploadSessionsCount}</strong>
                  </div>
                  <div>
                    Quota hoàn trả về phòng ban:{' '}
                    <strong className="text-emerald-600">
                      +{formatBytes(result.reclaimedQuotaBytes)}
                    </strong>
                  </div>
                  <div>
                    Chế độ tiếp quản:{' '}
                    <strong className="text-blue-600">Bản chụp Chỉ đọc (Read-only)</strong>
                  </div>
                  <div>
                    Thời gian hoàn tất:{' '}
                    <strong className="text-slate-900">
                      {new Date(result.offboardedAt).toLocaleTimeString()}
                    </strong>
                  </div>
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
              {/* Thông tin Nhân viên sắp thôi việc */}
              <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>
                      Nhân viên thôi việc: <strong>{employee.name}</strong>
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-700 font-mono mt-0.5 ml-5.5">
                    {employee.email} • {employee.role}
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <div>
                    Hạn mức Quota cá nhân:{' '}
                    <strong className="text-rose-700 font-mono font-bold">
                      {employee.allocatedQuotaGB} GB
                    </strong>
                  </div>
                  <div className="text-emerald-600 font-medium">
                    Sẽ hoàn trả 100% về Quỹ chung phòng ban
                  </div>
                </div>
              </div>

              {/* Policy Banner: Phương án A - Read-Only Snapshot */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/90 text-xs text-indigo-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-indigo-900">
                    Chính sách Bản chụp Chỉ đọc (Read-only Snapshot Policy)
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    Dữ liệu được bàn giao về Kho chung phòng ban trong Thư mục Bàn giao Chỉ đọc. Người tiếp nhận chỉ có quyền xem và tải về; Quota cá nhân của người nhận không bị xáo trộn. Người tiếp nhận muốn làm tiếp sẽ sao chép tệp sang kho cá nhân của mình.
                  </p>
                </div>
              </div>

              {/* Lựa chọn Kịch bản bàn giao */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Hình thức Tiếp nhận & Kế thừa Dữ liệu:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Kịch bản 1: Đồng nghiệp cùng phòng */}
                  <button
                    type="button"
                    onClick={() => {
                      setScenario('DESIGNATED_PEER');
                      setTargetUserId('');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${scenario === 'DESIGNATED_PEER'
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <UserCheck
                          className={`w-3.5 h-3.5 ${scenario === 'DESIGNATED_PEER' ? 'text-blue-600' : 'text-slate-500'
                            }`}
                        />
                        <span>Đồng nghiệp Cùng phòng</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Chỉ định 1 nhân viên trong phòng tiếp quản và tra cứu công việc.
                      </p>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded w-fit">
                      Khuyên dùng
                    </span>
                  </button>

                  {/* Kịch bản 2: Trưởng phòng Custody */}
                  <button
                    type="button"
                    onClick={() => {
                      setScenario('DEPARTMENT_HEAD_CUSTODY');
                      setTargetUserId('');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${scenario === 'DEPARTMENT_HEAD_CUSTODY'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <ShieldAlert
                          className={`w-3.5 h-3.5 ${scenario === 'DEPARTMENT_HEAD_CUSTODY'
                              ? 'text-indigo-600'
                              : 'text-slate-500'
                            }`}
                        />
                        <span>Trưởng phòng Tạm giữ</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Dữ liệu lưu tại Kho chung do Trưởng phòng trực tiếp quản lý.
                      </p>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded w-fit">
                      Chuyên môn
                    </span>
                  </button>

                  {/* Kịch bản 3: Mời nhân sự mới qua Gmail */}
                  <button
                    type="button"
                    onClick={() => {
                      setScenario('INVITE_NEW_EMPLOYEE');
                      setTargetUserId('');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${scenario === 'INVITE_NEW_EMPLOYEE'
                        ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Mail
                          className={`w-3.5 h-3.5 ${scenario === 'INVITE_NEW_EMPLOYEE' ? 'text-amber-600' : 'text-slate-500'
                            }`}
                        />
                        <span>Mời Nhân sự Mới</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Gửi Gmail mời nhân sự tuyển dụng bên ngoài tiếp nhận công việc.
                      </p>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded w-fit">
                      Tuyển dụng mới
                    </span>
                  </button>
                </div>
              </div>

              {/* Form Chi tiết tùy theo kịch bản */}
              {scenario === 'DESIGNATED_PEER' && (
                <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-2">
                  <label className="text-xs font-bold text-blue-950 block">
                    Chọn Đồng nghiệp cùng phòng ban tiếp nhận bàn giao:
                  </label>
                  {availablePeers.length === 0 ? (
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      Phòng ban hiện chưa có đồng nghiệp nào khác đang hoạt động. Vui lòng chọn{' '}
                      <strong>Trưởng phòng Tạm giữ</strong> hoặc <strong>Mời Nhân sự Mới</strong>.
                    </div>
                  ) : (
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 cursor-pointer"
                    >
                      <option value="">-- Chọn đồng nghiệp tiếp nhận --</option>
                      {availablePeers.map((peer) => (
                        <option key={peer.id} value={peer.id}>
                          {peer.name} ({peer.email}) - {peer.role}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[11px] text-blue-700 pt-1">
                    * Đồng nghiệp giữ nguyên vai trò Nhân viên, được cấp quyền Chỉ đọc (Xem/Tải về); Quota cá nhân hoàn toàn không bị ảnh hưởng.
                  </p>
                </div>
              )}

              {scenario === 'DEPARTMENT_HEAD_CUSTODY' && (
                <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200/80 space-y-2">
                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Trưởng phòng tiếp nhận tạm giữ tài sản số:</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-indigo-200 text-xs text-slate-800">
                    <div>
                      Trưởng phòng quản lý: <strong>{department.adminName}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {department.adminEmail}
                    </div>
                  </div>
                  <p className="text-[11px] text-indigo-700 pt-1">
                    * Toàn bộ tài liệu được gom về Thư mục Bàn giao tại Kho chung phòng ban. Kho cá nhân của Trưởng phòng hoàn toàn sạch sẽ, không bị trộn lẫn dữ liệu.
                  </p>
                </div>
              )}

              {scenario === 'INVITE_NEW_EMPLOYEE' && (
                <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-3">
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-600" />
                    <span>Thông tin Nhân sự Mới (Mời qua Gmail):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Email nhận lời mời <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmployeeEmail}
                        onChange={(e) => setNewEmployeeEmail(e.target.value)}
                        placeholder="new_employee@gmail.com"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={newEmployeePhoneNumber}
                        onChange={(e) => setNewEmployeePhoneNumber(e.target.value)}
                        placeholder="0901234567"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Họ & Tên đệm <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newEmployeeLastName}
                        onChange={(e) => setNewEmployeeLastName(e.target.value)}
                        placeholder="Nguyễn Văn"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Tên <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newEmployeeFirstName}
                        onChange={(e) => setNewEmployeeFirstName(e.target.value)}
                        placeholder="Bình"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-700 pt-1">
                    * Hệ thống sẽ gửi email kích hoạt (thời hạn 48 giờ). Sau khi kích hoạt tài khoản, nhân sự mới sẽ tự động được cấp quyền truy cập chỉ đọc vào thư mục bàn giao.
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

