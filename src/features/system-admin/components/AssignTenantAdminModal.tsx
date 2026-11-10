import React, { useState } from 'react';
import {
  X,
  Mail,
  UserPlus,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Info,
  Clock,
  Sparkles,
  Phone,
  FileText
} from 'lucide-react';
import {
  SystemTenant,
  AssignTenantAdminResultDto,
} from '../types';
import { assignVacantTenantAdminApi } from '../api/systemAdminCommands';

interface AssignTenantAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: SystemTenant | null;
  onSuccess: (result: AssignTenantAdminResultDto) => void;
}

export const AssignTenantAdminModal: React.FC<AssignTenantAdminModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [note, setNote] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssignTenantAdminResultDto | null>(null);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ Email của Quản trị viên mới.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Vui lòng nhập đầy đủ Họ và Tên của Quản trị viên mới.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await assignVacantTenantAdminApi(tenant.id, {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        note: note.trim() || undefined,
      });

      setResult(res);
      onSuccess(res);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Có lỗi xảy ra khi phát hành lời mời bổ nhiệm Quản trị viên.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhoneNumber('');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Bổ nhiệm Quản trị viên Doanh nghiệp
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Doanh nghiệp: <span className="font-semibold text-slate-700 dark:text-slate-200">{tenant.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {result ? (
            /* Result View */
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Đã Phát Hành Thư Mời Thành Công!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-md mx-auto">
                  Thư mời bổ nhiệm kèm đường dẫn kích hoạt bảo mật đã được gửi tới hòm thư cá nhân của Quản trị viên mới.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-left text-xs space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Email người nhận:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{result.newAdminEmail}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    <Clock className="w-3 h-3" /> Chờ người nhận kích hoạt (48h)
                  </span>
                </div>
                {result.invitationExpiresAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Hạn chót kích hoạt:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {new Date(result.invitationExpiresAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
                {result.note && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-0.5">
                    <span className="text-slate-500">Ghi chú bổ nhiệm:</span>
                    <span className="text-slate-700 dark:text-slate-300 italic">{result.note}</span>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 max-w-md mx-auto text-left">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  Sau khi Quản trị viên mới kích hoạt mật khẩu thành công qua Gmail, hệ thống sẽ tự động chuyển giao toàn bộ thẩm quyền điều hành và kết thúc trạng thái tiếp quản lâm thời.
                </span>
              </div>
            </div>
          ) : (
            /* Form View */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Security & Protocol Notice */}
              <div className="bg-blue-50/80 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200/60 dark:border-blue-800/40 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  <p className="font-semibold mb-0.5">Quy trình Bổ nhiệm An toàn qua Email (Zero File Transfer)</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Hệ thống sẽ gửi thư điện tử chứa liên kết kích hoạt bảo mật (thời hạn 48 giờ) tới địa chỉ Email được chỉ định. Nếu là cựu nhân sự cũ, tài khoản sẽ được tái kích hoạt liền mạch và bảo toàn định danh.
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Họ & Tên đệm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="An"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  Email mời kích hoạt <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin.doanhnghiep@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Số điện thoại liên hệ (Tùy chọn)
                </label>
                <input
                  type="tel"
                  placeholder="0912 345 678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Ghi chú điều hành / Quyết định bổ nhiệm (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Bổ nhiệm theo Quyết định số 102/QĐ-HĐQT của Ban điều hành..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang phát hành thư mời...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Gửi thư mời bổ nhiệm (48h)
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer for Result View */}
        {result && (
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity"
            >
              Đóng và Tiếp tục
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

