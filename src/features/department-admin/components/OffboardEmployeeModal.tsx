import React, { useState } from 'react';
import {
  X,
  UserX,
  Mail,
  UserCheck,
  ShieldAlert,
  HardDrive,
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
import { useAuth } from '@/context/AuthContext';

interface OffboardEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: DepartmentMember | null;
  department: DepartmentInfo;
  departmentMembers: DepartmentMember[];
  custodianUserId: string;
  onSuccess: (result: OffboardEmployeeResultDto) => void;
}

export const OffboardEmployeeModal: React.FC<OffboardEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  department,
  departmentMembers,
  custodianUserId,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
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

    if (scenario === 'DEPARTMENT_HEAD_CUSTODY' && !custodianUserId) {
      setError('Không xác định được tài khoản Trưởng phòng tiếp nhận.');
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
    } else if (scenario === 'DEPARTMENT_HEAD_CUSTODY') {
      const effectiveAdminId = department.adminId || currentUser?.id;
      if (!effectiveAdminId) {
        setError('Không xác định được tài khoản Trưởng phòng để tiếp nhận tạm giữ dữ liệu.');
        return;
      }
      if (effectiveAdminId === employee.id) {
        setError('Trưởng phòng không thể tự bàn giao cho chính mình khi thôi việc.');
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
            : scenario === 'DEPARTMENT_HEAD_CUSTODY'
              ? (custodianUserId || department.adminId || currentUser?.id || null)
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
                    Quota có thể cấp lại cho nhân viên:{' '}
                    <strong className="text-emerald-600">
                      +{formatBytes(result.returnedQuotaBytes ?? 0)}
                    </strong>
                  </div>
                  <div>
                    Quota giữ cho dữ liệu bàn giao: <strong>{formatBytes(result.retainedQuotaBytes ?? 0)}</strong>
                  </div>
                  <div>
                    Quota giữ chỗ upload đã giải phóng: <strong>{formatBytes(result.releasedUploadReservationBytes ?? 0)}</strong>
                  </div>
                  <div>
                    Chế độ tiếp quản:{' '}
                    <strong className="text-blue-600">{scenario === 'DEPARTMENT_HEAD_CUSTODY'
                      ? 'Trưởng phòng quản lý tại Kho chung'
                      : 'Quyền Chỉ đọc kế thừa trên thư mục'}</strong>
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
              {/* Thông tin Nhân viên nghỉ việc */}
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 flex items-center gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold text-rose-900">
                  Nhân viên nghỉ việc: <strong>{employee.name}</strong>
                </span>
              </div>

              {/* Lựa chọn Kịch bản bàn giao */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Hình thức Kế nhiệm & Bàn giao:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Kịch bản 1: Đồng nghiệp cùng phòng */}
                  <button
                    type="button"
                    onClick={() => {
                      setScenario('DESIGNATED_PEER');
                      setTargetUserId('');
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center transition-all cursor-pointer ${
                      scenario === 'DESIGNATED_PEER'
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <UserCheck
                        className={`w-3.5 h-3.5 ${
                          scenario === 'DESIGNATED_PEER' ? 'text-blue-600' : 'text-slate-500'
                        }`}
                      />
                      <span>Đồng nghiệp Cùng phòng</span>
                    </div>
                  </button>

                  {/* Kịch bản 2: Trưởng phòng Custody */}
                  <button
                    type="button"
                    onClick={() => {
                      setScenario('DEPARTMENT_HEAD_CUSTODY');
                      setTargetUserId('');
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center transition-all cursor-pointer ${
                      scenario === 'DEPARTMENT_HEAD_CUSTODY'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <ShieldAlert
                        className={`w-3.5 h-3.5 ${
                          scenario === 'DEPARTMENT_HEAD_CUSTODY'
                            ? 'text-indigo-600'
                            : 'text-slate-500'
                        }`}
                      />
                      <span>Trưởng phòng Tạm giữ</span>
                    </div>
                  </button>

                  {/* Kịch bản 3: Mời nhân sự mới qua Gmail */}
                  <button
                    type="button"
                    onClick={() => {
                      setScenario('INVITE_NEW_EMPLOYEE');
                      setTargetUserId('');
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center transition-all cursor-pointer ${
                      scenario === 'INVITE_NEW_EMPLOYEE'
                        ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Mail
                        className={`w-3.5 h-3.5 ${
                          scenario === 'INVITE_NEW_EMPLOYEE' ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      />
                      <span>Mời Nhân sự Mới</span>
                    </div>
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
                </div>
              )}

              {scenario === 'DEPARTMENT_HEAD_CUSTODY' && (
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/90 flex items-center gap-2 text-xs font-semibold text-amber-950">
                  <HardDrive className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Lưu trữ tài sản vào Thư mục Bàn giao do Trưởng phòng quản lý</span>
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

