import React, { useState, useEffect } from 'react';
import { X, HardDrive, AlertCircle, Loader2, Check, Sparkles } from 'lucide-react';
import { Department } from '@/features/tenants/types';
import { useTenantContext } from '@/context/TenantContext';

interface AllocateDepartmentQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
}

export const AllocateDepartmentQuotaModal: React.FC<AllocateDepartmentQuotaModalProps> = ({
  isOpen,
  onClose,
  department,
}) => {
  const { tenant, handleAllocateDepartmentQuota } = useTenantContext();
  const [quotaGB, setQuotaGB] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (department) {
      setQuotaGB(department.allocatedStorageGB || 50);
      setErrorMsg(null);
    }
  }, [department]);

  if (!isOpen || !department) return null;

  // Quota còn trống (chưa phân bổ cho các phòng ban) của Tenant (unallocatedQuota)
  const unallocatedBytes = tenant.unallocatedBytes !== undefined
    ? tenant.unallocatedBytes
    : (tenant.availableBytes !== undefined
      ? tenant.availableBytes
      : Math.max(0, (tenant.storageQuotaBytes || 0) - (tenant.allocatedToDepartmentsBytes || 0)));

  const unallocatedQuotaGB = Number((unallocatedBytes / (1024 ** 3)).toFixed(1));
  const currentDeptQuotaGB = department.allocatedStorageGB || 0;
  // Hạn mức tối đa có thể cấp cho phòng ban này = hạn mức hiện tại + quota còn trống chưa phân bổ
  const maxPossibleQuotaGB = Number((currentDeptQuotaGB + unallocatedQuotaGB).toFixed(1));

  const presets = [10, 25, 50, 100, 250, 500];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quotaGB <= 0) {
      setErrorMsg('Hạn mức Quota phải lớn hơn 0 GB.');
      return;
    }

    const additionalQuotaNeeded = quotaGB - currentDeptQuotaGB;
    if (additionalQuotaNeeded > unallocatedQuotaGB) {
      setErrorMsg(`Không đủ Quota khả dụng. Quota Tenant chưa phân bổ là ${unallocatedQuotaGB} GB (Tối đa có thể cấp cho phòng ban này: ${maxPossibleQuotaGB} GB).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const success = await handleAllocateDepartmentQuota(department.id, quotaGB);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi cấp Quota cho phòng ban.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Cấp Quota Lưu Trữ Phòng Ban</h3>
              <p className="text-[11px] text-slate-500">{department.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current & Tenant Info */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Hạn mức hiện tại:</span>
              <span className="font-semibold text-slate-900">{currentDeptQuotaGB} GB</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Quota chưa phân bổ (Unallocated):</span>
              <span className="font-semibold text-emerald-600">{unallocatedQuotaGB} GB</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Trưởng phòng phụ trách:</span>
              <span className="font-medium text-slate-700">{department.lead}</span>
            </div>
          </div>

          {/* Input Quota */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hạn mức Quota mới (GB) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={quotaGB}
                onChange={(e) => setQuotaGB(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                GB
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Dung lượng này sẽ được cấp cho phòng ban. Tối đa có thể cấp: <span className="font-semibold text-slate-700">{maxPossibleQuotaGB} GB</span> ({currentDeptQuotaGB} GB hiện tại + {unallocatedQuotaGB} GB chưa phân bổ).
            </p>
          </div>

          {/* Preset Buttons */}
          <div>
            <span className="text-[11px] font-medium text-slate-500 block mb-1.5">Chọn nhanh hạn mức:</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setQuotaGB(preset)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                    quotaGB === preset
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {preset} GB
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Xác nhận cấp Quota</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
