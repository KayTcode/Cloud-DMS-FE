import React, { useState, useEffect } from 'react';
import { X, Sliders, AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import { DepartmentMember } from '../types';
import { QuotaUnitInput } from '@/components/common';
import { QuotaUnit, unitToBytes, formatQuotaAuto, formatQuotaWithUnit } from '@/utils/quotaUnitUtils';

interface EditQuotaModalProps {
  member: DepartmentMember | null;
  departmentName: string;
  deptAvailableGB: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberId: string, newQuotaBytes: number) => Promise<void>;
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

  const [quotaValue, setQuotaValue] = useState<number>(member.allocatedQuotaGB);
  const [quotaUnit, setQuotaUnit] = useState<QuotaUnit>('GB');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setQuotaValue(member.allocatedQuotaGB);
      setQuotaUnit('GB');
      setErrorMessage(null);
    }
  }, [member]);

  const currentMemberBytes = (member.allocatedQuotaGB || 0) * (1024 ** 3);
  const usedBytes = (member.usedSpaceGB || 0) * (1024 ** 3);
  const maxAllowableBytes = currentMemberBytes + Math.max(0, deptAvailableGB * (1024 ** 3));

  const currentQuotaBytes = unitToBytes(quotaValue, quotaUnit);

  const isExceedingDept = currentQuotaBytes > maxAllowableBytes;
  const isLowerThanUsed = currentQuotaBytes < usedBytes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLowerThanUsed) {
      setErrorMessage(`Không thể hạ hạn mức xuống thấp hơn dung lượng người dùng đã tải lên (${member.usedSpaceGB} GB).`);
      return;
    }

    if (isExceedingDept) {
      setErrorMessage(`Hạn mức vượt quá tổng dung lượng phòng ban cho phép (${formatQuotaAuto(maxAllowableBytes)}).`);
      return;
    }

    if (currentQuotaBytes <= 0) {
      setErrorMessage('Hạn mức Quota phải lớn hơn 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(member.id, currentQuotaBytes);
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

  const newPercent = currentQuotaBytes > 0 ? Math.min(100, Math.round((usedBytes / currentQuotaBytes) * 100)) : 0;

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

          {/* Input Quota with Unit */}
          <div>
            <QuotaUnitInput
              value={quotaValue}
              unit={quotaUnit}
              onChange={(val, u) => {
                setQuotaValue(val);
                setQuotaUnit(u);
              }}
              maxBytes={maxAllowableBytes}
              minBytes={usedBytes}
              label="Hạn mức mới đề xuất"
              required
              helperText={`Dung lượng tối thiểu phải bằng dung lượng đã dùng (${formatQuotaAuto(usedBytes)}). Tối đa: ${formatQuotaAuto(maxAllowableBytes)}.`}
            />
          </div>

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
