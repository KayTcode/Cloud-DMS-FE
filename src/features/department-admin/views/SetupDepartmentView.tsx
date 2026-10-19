import React, { useState, useEffect } from 'react';
import { Building2, HardDrive, ShieldCheck, ArrowRight, Sparkles, AlertCircle, Info } from 'lucide-react';
import { useDepartment } from '../context/DepartmentContext';
import { useAuth } from '@/context/AuthContext';
import { departmentApi } from '../api';

export const SetupDepartmentView: React.FC = () => {
  const { setupDepartment, isMutating } = useDepartment();
  const { updateUser } = useAuth();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [personalQuotaGB, setPersonalQuotaGB] = useState<number>(2);
  const [assignedQuotaGB, setAssignedQuotaGB] = useState<number>(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSetupInfo = async () => {
      try {
        const info = await departmentApi.getSetupInfo();
        if (isMounted && (info?.hasDepartment || info?.departmentId)) {
          const resolvedDeptId = info.departmentId;
          if (resolvedDeptId) {
            updateUser({ departmentId: resolvedDeptId });
            return;
          }
        }
        if (isMounted && typeof info?.assignedQuotaGB === 'number' && info.assignedQuotaGB > 0) {
          const quota = Math.max(1, Math.round(info.assignedQuotaGB));
          setAssignedQuotaGB(quota);
          setPersonalQuotaGB((prev) => Math.min(prev, quota));
        }
      } catch (err) {
        console.warn('[SetupDepartmentView] Không thể tải thông tin setup-info, giữ hạn mức mặc định:', err);
      }
    };

    fetchSetupInfo();
    return () => {
      isMounted = false;
    };
  }, [updateUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên phòng ban');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('Vui lòng nhập mã phòng ban');
      return;
    }

    try {
      await setupDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        adminPersonalQuotaGB: personalQuotaGB > 0 ? personalQuotaGB : undefined,
      });
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        err?.message ||
        data?.error ||
        (Array.isArray(data?.errors) && data.errors.length > 0 ? data.errors[0] : null) ||
        data?.detail ||
        data?.message ||
        (err?.response?.status === 403
          ? 'Tài khoản không đủ quyền hạn thực hiện thiết lập (403 Forbidden).'
          : 'Không thể thiết lập phòng ban. Vui lòng kiểm tra lại thông tin.');
      setErrorMessage(msg);
      console.error('[SetupDepartmentView] Lỗi thiết lập phòng ban:', err);
    }
  };

  const remainingForEmployeesGB = Math.max(0, assignedQuotaGB - personalQuotaGB);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Khởi tạo Cơ cấu Tổ chức</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Thiết lập Phòng ban của bạn</h2>
            <p className="text-xs text-blue-100 max-w-md leading-relaxed">
              Tài khoản của bạn đã được kích hoạt thành công. Hãy hoàn tất bước thiết lập ban đầu để khởi tạo phòng ban, thư mục gốc và kích hoạt cổng quản trị.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          {/* Tên phòng ban */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên phòng ban *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Phòng Công nghệ Thông tin, Ban Kế toán..."
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Mã phòng ban */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mã phòng ban (Code) *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: DEPT_IT, ACC, HR..."
              className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Mã phòng ban là duy nhất trong tổ chức và dùng làm định danh tiền tố dữ liệu.
            </p>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mô tả nhiệm vụ phòng ban (Tùy chọn)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chức năng, phạm vi hoạt động của phòng ban..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Hạn mức cá nhân giữ lại */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Hạn mức cá nhân giữ lại cho Trưởng phòng
                </span>
              </div>
              <span className="text-xs font-bold font-mono text-blue-600">
                {personalQuotaGB} GB
              </span>
            </div>

            <input
              type="range"
              min={1}
              max={assignedQuotaGB}
              step={1}
              value={personalQuotaGB}
              onChange={(e) => setPersonalQuotaGB(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Tối thiểu: 1 GB</span>
              <span>Khuyến nghị: 2 GB - {Math.min(5, assignedQuotaGB)} GB</span>
              <span>Tối đa: {assignedQuotaGB} GB (Tổng ví được cấp)</span>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span>Tổng hạn mức phòng ban được cấp: <strong className="text-slate-700 font-mono">{assignedQuotaGB} GB</strong>. </span>
                <span>Ngân sách còn lại cho nhân viên: <strong className="text-emerald-600 font-mono">{remainingForEmployeesGB} GB</strong>.</span>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isMutating}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMutating ? (
              <span>Đang khởi tạo phòng ban...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Hoàn tất & Kích hoạt Cổng Quản trị</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
