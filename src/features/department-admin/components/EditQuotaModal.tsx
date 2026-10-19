import React, { useState, useEffect } from 'react';
import { X, Sliders, AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import { DepartmentMember } from '../types';

interface EditQuotaModalProps {
  member: DepartmentMember | null;
  departmentName: string;
  deptAvailableGB: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberId: string, newQuotaGB: number) => Promise<void>;
}

export const EditQuotaModal: React.FC<EditQuotaModalProps> = ({
  member,
  departmentName,
  deptAvailableGB,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !member) return null;

  const [quota, setQuota] = useState<number>(member.allocatedQuotaGB);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setQuota(member.allocatedQuotaGB);
      setErrorMessage(null);
    }
  }, [member]);

  const minQuota = Math.max(1, Math.ceil(member.usedSpaceGB));
  const quotaDifference = quota - member.allocatedQuotaGB;
  const maxAllowable = Math.max(member.allocatedQuotaGB, member.allocatedQuotaGB + deptAvailableGB);

  const isExceedingDept = quotaDifference > deptAvailableGB;
  const isLowerThanUsed = quota < member.usedSpaceGB;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLowerThanUsed) {
      setErrorMessage(`Không thể hạ hạn mức xuống thấp hơn dung lượng người dùng đã tải lên (${member.usedSpaceGB} GB).`);
      return;
    }

    if (isExceedingDept) {
      setErrorMessage(`Phòng ban không còn đủ hạn mức để cấp thêm ${quotaDifference} GB.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(member.id, quota);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Không thể cập nhật hạn mức. Vui lòng kiểm tra lại.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const newPercent = quota > 0 ? Math.round((member.usedSpaceGB / quota) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Điều chỉnh hạn mức lưu trữ</h3>
              <p className="text-xs text-slate-500">Phòng ban: {departmentName} · Thành viên: {member.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Member Overview Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Email:</span>
              <strong className="text-slate-800 font-mono">{member.email}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Đã dùng thực tế:</span>
              <strong className="text-slate-800 font-mono">{member.usedSpaceGB} GB</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hạn mức hiện tại:</span>
              <strong className="text-slate-800 font-mono">{member.allocatedQuotaGB} GB</strong>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
              <span className="text-slate-500">Quỹ phòng ban còn trống:</span>
              <strong className="text-emerald-700 font-mono">+{deptAvailableGB} GB</strong>
            </div>
          </div>

          {/* Slider & Number Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700">Hạn mức mới đề xuất:</label>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-blue-600 font-mono text-base">{quota} GB</span>
                <span className={`text-[11px] font-semibold ${newPercent >= 90 ? 'text-rose-600' : 'text-slate-500'}`}>
                  ({newPercent}% dung lượng)
                </span>
              </div>
            </div>

            <input
              type="range"
              min={minQuota}
              max={Math.max(minQuota + 10, maxAllowable)}
              step={1}
              value={quota}
              onChange={(e) => setQuota(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Tối thiểu: {minQuota} GB</span>
              <span>Khả dụng tối đa: {maxAllowable} GB</span>
            </div>
          </div>

          {/* Warning / Validation Notice */}
          {isExceedingDept && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Yêu cầu tăng thêm +{quotaDifference} GB vượt quá dung lượng phòng ban còn lại ({deptAvailableGB} GB).
              </span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isExceedingDept || isLowerThanUsed || isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                'Đang lưu...'
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Cập nhật hạn mức</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
