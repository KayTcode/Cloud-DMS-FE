import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { getTenantDepartments } from '@/features/tenants/api/tenantQueries';
import {
  transferEmployeeDepartment,
  EmployeeDepartmentTransferResult,
} from '@/features/tenants/api/tenantCommands';
import { Department } from '@/features/tenants/types/tenantUser.dto';

interface TransferEmployeeDepartmentModalProps {
  tenantId: string;
  userId: string;
  userName: string;
  currentDepartmentId: string;
  onClose: () => void;
  onSuccess: (result: EmployeeDepartmentTransferResult) => void;
}

export const TransferEmployeeDepartmentModal: React.FC<TransferEmployeeDepartmentModalProps> = ({
  tenantId,
  userId,
  userName,
  currentDepartmentId,
  onClose,
  onSuccess,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<EmployeeDepartmentTransferResult | null>(null);

  useEffect(() => {
    setIsLoadingDepts(true);
    setFetchError(null);
    getTenantDepartments(tenantId)
      .then((depts) => {
        const filtered = depts.filter(
          (d) => d.id !== currentDepartmentId && !d.isVacant
        );
        setDepartments(filtered);
        if (filtered.length > 0) {
          setSelectedDeptId(filtered[0].id);
        }
      })
      .catch(() => {
        setFetchError('Không tải được danh sách phòng ban.');
      })
      .finally(() => {
        setIsLoadingDepts(false);
      });
  }, [tenantId, currentDepartmentId]);

  const handleConfirm = async () => {
    if (!selectedDeptId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await transferEmployeeDepartment(tenantId, userId, selectedDeptId);
      setSuccessResult(result);
    } catch (err: any) {
      setError(err?.message ?? 'Đã xảy ra lỗi khi chuyển phòng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    if (successResult) {
      onSuccess(successResult);
    }
  };

  const targetDept = departments.find((d) => d.id === successResult?.toDepartmentId);
  const transferredGB = successResult
    ? (successResult.transferredBytes / 1024 ** 3).toFixed(2)
    : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Title */}
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="text-base font-bold text-slate-900">Đổi phòng cho nhân viên</h2>
        </div>
        <p className="text-sm text-slate-600">
          Nhân viên: <span className="font-semibold text-slate-800">{userName}</span>
        </p>

        {successResult ? (
          /* Success view */
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
              Đã chuyển <span className="font-semibold">{successResult.transferredFilesCount} tệp</span>{' '}
              ({transferredGB} GB) sang phòng{' '}
              <span className="font-semibold">{targetDept?.name ?? successResult.toDepartmentId}</span>.
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleDone}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Xong
              </button>
            </div>
          </div>
        ) : (
          /* Form view */
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>
                Toàn bộ tệp của nhân viên sẽ được bàn giao vào Kho chung phòng hiện tại. Nhân viên sang phòng mới với kho trống và hạn mức 0.
              </span>
            </div>

            {/* Fetch error */}
            {fetchError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {fetchError}
              </p>
            )}

            {/* Department selector */}
            {isLoadingDepts ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải danh sách phòng ban...</span>
              </div>
            ) : departments.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Không có phòng ban khác để chuyển.</p>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Chọn phòng ban mới
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting || departments.length === 0 || !selectedDeptId}
                title={departments.length === 0 ? 'Không có phòng ban khác để chuyển.' : undefined}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Đổi phòng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
