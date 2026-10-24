import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Phone, HardDrive, Sparkles, AlertTriangle } from 'lucide-react';
import { CreateEmployeePayload } from '../types';
import { gbToBytes } from '../utils/quotaUtils';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName: string;
  availableQuotaGB: number;
  onAdd: (payload: CreateEmployeePayload) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  departmentName,
  availableQuotaGB,
  onAdd,
}) => {
  if (!isOpen) return null;

  const maxQuota = Math.max(0, Math.floor(availableQuotaGB));
  const minQuota = maxQuota > 0 ? 1 : 0;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [quotaGB, setQuotaGB] = useState<number>(maxQuota);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuotaGB(maxQuota);
      setErrorMessage(null);
    }
  }, [isOpen, maxQuota]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ họ, tên và email nhân viên.');
      return;
    }

    if (maxQuota <= 0) {
      setErrorMessage('Phòng ban không còn dung lượng khả dụng để cấp cho nhân viên mới.');
      return;
    }

    if (quotaGB > availableQuotaGB) {
      setErrorMessage(
        `Hạn mức cấp (${quotaGB} GB) vượt quá dung lượng khả dụng của phòng ban (${availableQuotaGB} GB).`
      );
      return;
    }

    if (quotaGB < minQuota) {
      setErrorMessage(`Hạn mức tối thiểu phải từ ${minQuota} GB.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        storageQuotaBytes: gbToBytes(quotaGB),
      });
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Không thể thêm nhân viên. Vui lòng kiểm tra lại.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Mời nhân viên vào phòng ban</h3>
              <p className="text-xs text-slate-500">Phòng ban: {departmentName}</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Email Invitation Banner */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Thư mời kích hoạt bảo mật (48 giờ):</strong> Tài khoản nhân viên sẽ được tạo ở trạng thái chờ kích hoạt. Hệ thống sẽ gửi email kèm liên kết bảo mật để nhân viên tự tạo mật khẩu lần đầu.
            </div>
          </div>

          {/* Họ và Tên */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ & Tên đệm *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nguyễn Văn"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên nhân viên *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="An"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email nhân viên *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="an.nguyen@company.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số điện thoại (Tùy chọn)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0912 345 678"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Hạn mức cấp ban đầu */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>Hạn mức lưu trữ ban đầu:</span>
              </div>
              <span className="font-bold text-blue-600 font-mono text-sm">{quotaGB} GB</span>
            </div>
            <input
              type="range"
              min={minQuota}
              max={Math.max(minQuota, maxQuota)}
              step={1}
              value={quotaGB}
              disabled={maxQuota <= 0}
              onChange={(e) => setQuotaGB(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>Tối thiểu: {minQuota} GB</span>
              <span>Khả dụng tối đa: {availableQuotaGB} GB</span>
            </div>
            {maxQuota <= 0 && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Phòng ban đã hết dung lượng lưu trữ khả dụng để cấp cho nhân viên mới. Vui lòng yêu cầu Quản trị viên cấp thêm Quota cho phòng ban.
                </span>
              </div>
            )}
          </div>

          {/* Buttons */}
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
              disabled={isSubmitting || maxQuota <= 0}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Đang gửi thư mời...' : 'Gửi thư mời nhân viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
