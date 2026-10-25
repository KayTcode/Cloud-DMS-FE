import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { quotaApi } from '../api/quotaApi';

interface QuotaFeatureToggleProps {
  tenantId: string;
  tenantName: string;
  initialEnabled?: boolean;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const QuotaFeatureToggle: React.FC<QuotaFeatureToggleProps> = ({
  tenantId,
  tenantName,
  initialEnabled = false,
  onShowToast,
}) => {
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleToggle = async () => {
    const nextState = !enabled;
    try {
      setIsLoading(true);
      await quotaApi.setFeatureEnabled(tenantId, nextState);
      setEnabled(nextState);
      onShowToast?.(
        nextState
          ? `Đã kích hoạt tính năng Yêu cầu Quota cho ${tenantName}.`
          : `Đã tạm ngưng tính năng Yêu cầu Quota cho ${tenantName}.`,
        'success'
      );
    } catch (err: any) {
      console.error('Lỗi cập nhật Feature Flag:', err);
      const msg = err?.response?.data?.error || err?.message || 'Không thể cập nhật cấu hình tính năng.';
      onShowToast?.(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">Tính năng Yêu cầu tăng Quota</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {enabled ? 'Đang bật' : 'Đang tắt'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cho phép nhân viên và các quản trị viên trong tổ chức <strong className="text-slate-700">{tenantName}</strong> gửi yêu cầu xin thêm dung lượng lưu trữ lên cấp trên duyệt.
            </p>
          </div>
        </div>

        {/* Toggle button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleToggle}
          className={`cursor-pointer transition-colors p-1 disabled:opacity-50`}
          title={enabled ? 'Nhấn để tắt tính năng' : 'Nhấn để bật tính năng'}
        >
          {enabled ? (
            <ToggleRight className="w-10 h-10 text-emerald-600 hover:text-emerald-700 transition-transform active:scale-95" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-slate-300 hover:text-slate-400 transition-transform active:scale-95" />
          )}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span>
          Mặc định hệ thống luôn tắt tính năng này khi mới tạo Tenant nhằm kiểm soát chặt chẽ dung lượng Cloud.
        </span>
      </div>
    </div>
  );
};
