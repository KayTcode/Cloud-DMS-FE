import React, { useState } from 'react';
import { X, HardDrive, AlertTriangle, Check, Sliders } from 'lucide-react';
import { DepartmentMember, DepartmentInfo } from '../types';

interface EditQuotaModalProps {
  member: DepartmentMember | null;
  department: DepartmentInfo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberId: string, newQuotaGB: number) => void;
}

export const EditQuotaModal: React.FC<EditQuotaModalProps> = ({
  member,
  department,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !member) return null;

  const [quota, setQuota] = useState<number>(member.allocatedQuotaGB);
  const minQuota = Math.max(10, member.usedSpaceGB);
  const quotaDifference = quota - member.allocatedQuotaGB;
  const deptAvailable = department.totalAllocatedGB - department.usedSpaceGB;
  const maxAllowable = member.allocatedQuotaGB + deptAvailable;

  const isExceedingDept = quotaDifference > deptAvailable;
  const presets = [20, 35, 50, 70, 100];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExceedingDept) return;
    onSave(member.id, quota);
    onClose();
  };

  const newPercent = Math.round((member.usedSpaceGB / quota) * 100);

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
              <p className="text-xs text-slate-500">Thành viên: {member.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Member Overview Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Chức vụ:</span>
              <strong className="text-slate-800">{member.role}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Đã dùng thực tế:</span>
              <strong className="text-slate-800 font-mono">{member.usedSpaceGB} GB</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hạn mức hiện tại:</span>
              <strong className="text-slate-800 font-mono">{member.allocatedQuotaGB} GB</strong>
            </div>
          </div>

          {/* Slider & Number Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700">Hạn mức mới đề xuất:</label>
              <span className="font-bold text-blue-600 font-mono text-sm">{quota} GB</span>
            </div>

            <input
              type="range"
              min={minQuota}
              max={Math.max(120, maxAllowable)}
              value={quota}
              onChange={(e) => setQuota(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Tối thiểu: {minQuota} GB</span>
              <span>Khả dụng tối đa: {maxAllowable} GB</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn nhanh gói dung lượng chuẩn:
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {presets.map((preset) => {
                const disabled = preset < minQuota;
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={disabled}
                    onClick={() => setQuota(preset)}
                    className={`py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                      quota === preset
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : disabled
                        ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {preset}G
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quota Health Simulator */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Tỷ lệ chiếm dụng sau điều chỉnh:</span>
              <span
                className={`font-bold font-mono ${
                  newPercent >= 90
                    ? 'text-rose-600'
                    : newPercent >= 75
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {newPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  newPercent >= 90
                    ? 'bg-rose-500'
                    : newPercent >= 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, newPercent)}%` }}
              />
            </div>
          </div>

          {/* Exceed Department Warning */}
          {isExceedingDept && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Vượt quá hạn mức phòng ban!</strong>
                <p className="mt-0.5 text-[11px]">
                  Phòng ban chỉ còn dư {deptAvailable} GB khả dụng. Bạn cần xin Tenant cấp thêm trước.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isExceedingDept}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer ${
                isExceedingDept
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Xác nhận cập nhật</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
