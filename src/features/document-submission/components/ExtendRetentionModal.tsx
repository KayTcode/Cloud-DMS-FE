import React, { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import { documentApi } from '../api/documentApi';
import { DocumentDetailsDto } from '../types/document.types';

interface ExtendRetentionModalProps {
  details: DocumentDetailsDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const EXTEND_OPTIONS = [
  { label: '+30 ngày (1 tháng)', value: 30 },
  { label: '+60 ngày (2 tháng)', value: 60 },
  { label: '+90 ngày (3 tháng)', value: 90 },
  { label: '+180 ngày (6 tháng)', value: 180 },
  { label: '+365 ngày (1 năm)', value: 365 },
  { label: 'Tùy chỉnh...', value: -1 },
];

export const ExtendRetentionModal: React.FC<ExtendRetentionModalProps> = ({
  details,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedOption, setSelectedOption] = useState<number>(30);
  const [customDays, setCustomDays] = useState<number>(45);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !details) return null;

  const additionalDays = selectedOption === -1 ? customDays : selectedOption;

  // Tính toán ngày hết hạn mới
  const currentExpiry = details.expiresAt ? new Date(details.expiresAt) : new Date();
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiryDate = new Date(baseDate);
  newExpiryDate.setDate(newExpiryDate.getDate() + additionalDays);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (additionalDays <= 0) {
      setErrorMessage('Số ngày gia hạn thêm phải lớn hơn 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await documentApi.extendRetention({
        fileId: details.fileId,
        additionalDays,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Đã có lỗi xảy ra khi gia hạn thời hạn lưu trữ.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Gia Hạn Lưu Trữ Tài Liệu</h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{details.fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Trạng thái hiện tại & Ngày hết hạn mới */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Hạn lưu trữ hiện tại:</span>
              <span className="font-semibold text-slate-900">
                {details.expiresAt ? new Date(details.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn'}
              </span>
            </div>
            <div className="flex justify-between items-center text-blue-700 font-medium pt-1 border-t border-slate-200">
              <span>Hạn lưu trữ mới sau gia hạn:</span>
              <span className="font-bold text-blue-800 text-sm">
                {newExpiryDate.toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          {/* Chọn số ngày gia hạn */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Chọn khoảng thời gian muốn cộng thêm
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EXTEND_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setSelectedOption(opt.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all cursor-pointer ${
                    selectedOption === opt.value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {selectedOption === -1 && (
              <div className="flex items-center gap-2 pt-2.5">
                <span className="text-xs text-slate-600">Số ngày thêm:</span>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={customDays}
                  onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value)))}
                  className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
                <span className="text-xs text-slate-500">ngày</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            * Sau khi gia hạn thành công, mốc cảnh báo 7 ngày trước khi hết hạn sẽ tự động được thiết lập lại cho chu kỳ mới.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang gia hạn...' : `Gia hạn (+${additionalDays} ngày)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

