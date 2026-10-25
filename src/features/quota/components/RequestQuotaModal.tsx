import React, { useState } from 'react';
import { X, HardDrive, Calendar, AlertCircle, Info, Sparkles } from 'lucide-react';
import { quotaApi } from '../api/quotaApi';
import { QuotaRequestDto } from '../types/quota.types';
import { GB_IN_BYTES, bytesToGB, checkAvailability } from '../utils/quotaAvailability';

interface RequestQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuotaBytes?: number;
  maxAvailableBytes?: number | null;
  onSuccess: (request: QuotaRequestDto) => void;
}

const MAX_GB = 500;
const MAX_TEMPORARY_DAYS = 90;

export const RequestQuotaModal: React.FC<RequestQuotaModalProps> = ({
  isOpen,
  onClose,
  maxAvailableBytes,
  onSuccess,
}) => {
  const [requestedGB, setRequestedGB] = useState<number>(5);
  const [isTemporary, setIsTemporary] = useState<boolean>(false);
  const [expiresDate, setExpiresDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Giới hạn ngày cho tạm thời
  const today = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + MAX_TEMPORARY_DAYS);
  const maxDate = maxDateObj.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!requestedGB || requestedGB <= 0) {
      setErrorMessage('Vui lòng nhập dung lượng muốn xin thêm lớn hơn 0 GB.');
      return;
    }

    if (requestedGB > MAX_GB) {
      setErrorMessage(`Dung lượng yêu cầu tối đa là ${MAX_GB} GB.`);
      return;
    }

    const availability = checkAvailability(Math.round(requestedGB * GB_IN_BYTES), maxAvailableBytes);
    if (!availability.ok) {
      setErrorMessage(availability.message!);
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Vui lòng nêu rõ lý do cần tăng dung lượng lưu trữ.');
      return;
    }

    let formattedExpiresAt: string | null = null;
    if (isTemporary) {
      if (!expiresDate) {
        setErrorMessage('Vui lòng chọn ngày hết hạn cho gói tạm thời.');
        return;
      }
      const expDate = new Date(expiresDate);
      expDate.setHours(23, 59, 59, 999);
      formattedExpiresAt = expDate.toISOString();
    }

    try {
      setIsLoading(true);
      const newRequest = await quotaApi.createRequest({
        requestedAdditionalBytes: Math.round(requestedGB * GB_IN_BYTES),
        isTemporary,
        expiresAt: formattedExpiresAt,
        reason: reason.trim(),
      });

      onSuccess(newRequest);
      onClose();
    } catch (err: any) {
      console.error('Lỗi gửi yêu cầu tăng quota:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Không thể gửi yêu cầu tăng quota. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = (gb: number) => {
    setRequestedGB(gb);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-quota-title"
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 id="request-quota-title" className="font-bold text-slate-900 text-base">
                Yêu cầu cấp thêm dung lượng
              </h3>
              <p className="text-xs text-slate-500">
                Gửi yêu cầu đến người quản lý trực tiếp để phê duyệt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Nhập dung lượng xin thêm */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Dung lượng muốn xin thêm (GB)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={MAX_GB}
                step={1}
                required
                value={requestedGB || ''}
                onChange={(e) => setRequestedGB(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                placeholder="Nhập số GB cần thêm..."
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                GB
              </span>
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Chọn nhanh:
              </span>
              {[2, 5, 10, 20, 50].map((gb) => (
                <button
                  type="button"
                  key={gb}
                  onClick={() => handleQuickAdd(gb)}
                  disabled={maxAvailableBytes != null && gb * GB_IN_BYTES > maxAvailableBytes}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    requestedGB === gb
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  +{gb} GB
                </button>
              ))}
            </div>

            {maxAvailableBytes != null ? (
              <div className="mt-2 p-2.5 bg-blue-50/60 rounded-xl flex items-start gap-2 text-[11px] text-blue-700">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Hạn mức còn trống của cấp trên: {bytesToGB(maxAvailableBytes)} GB.
                </span>
              </div>
            ) : (
              <div className="mt-2 p-2.5 bg-slate-50 rounded-xl flex items-start gap-2 text-[11px] text-slate-500">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Không thể xác minh hạn mức còn trống của cấp trên lúc này — yêu cầu vẫn được gửi, nhưng có thể bị từ chối nếu vượt quá.
                </span>
              </div>
            )}
          </div>

          {/* Loại yêu cầu: Vĩnh viễn hay Tạm thời */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-800 block">
                  Thời hạn dung lượng
                </label>
                <span className="text-[11px] text-slate-500">
                  {isTemporary ? 'Cấp tạm thời có ngày hết hạn' : 'Cấp vĩnh viễn không hết hạn'}
                </span>
              </div>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTemporary(false)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    !isTemporary
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vĩnh viễn
                </button>
                <button
                  type="button"
                  onClick={() => setIsTemporary(true)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    isTemporary
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tạm thời
                </button>
              </div>
            </div>

            {/* Chọn ngày hết hạn nếu là tạm thời */}
            {isTemporary && (
              <div className="pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Ngày hết hạn (tối đa 90 ngày)
                </label>
                <input
                  type="date"
                  min={today}
                  max={maxDate}
                  required={isTemporary}
                  value={expiresDate}
                  onChange={(e) => setExpiresDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
                <span className="text-[11px] text-amber-600 mt-1 block">
                  * Hết ngày này, phần dung lượng được cấp tạm thời sẽ tự động thu hồi.
                </span>
              </div>
            )}
          </div>

          {/* Lý do xin tăng */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Lý do yêu cầu <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mô tả mục đích sử dụng (ví dụ: Lưu trữ hồ sơ thiết kế dự án mới, lưu video sự kiện...)"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="p-2.5 bg-blue-50/60 rounded-xl flex items-start gap-2 text-[11px] text-blue-700">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span>
              Yêu cầu sẽ được chuyển đến người quản lý trực tiếp duyệt. Bạn chỉ có thể gửi 1 yêu cầu trong khi đang chờ duyệt.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <span>Gửi yêu cầu</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
