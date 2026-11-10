import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Check } from 'lucide-react';
import { TenantInfo } from '@/features/tenants/types';
import { getTenantSettings, setUnscannedDownloadPolicy } from '@/features/tenants/api/tenantCommands';

interface TenantSettingsViewProps {
  tenant: TenantInfo;
  onUpdateTenant: (updated: Partial<TenantInfo>) => void;
  onBackToOverview: () => void;
}

export const TenantSettingsView: React.FC<TenantSettingsViewProps> = ({
  tenant,
  onUpdateTenant,
  onBackToOverview,
}) => {
  const [email, setEmail] = useState(tenant.contactEmail);
  const [limit, setLimit] = useState(tenant.licenseLimit);
  const [saved, setSaved] = useState(false);

  const [allowUnscannedDownload, setAllowUnscannedDownload] = useState(false);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(true);
  const [isTogglingPolicy, setIsTogglingPolicy] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPolicy = useCallback(async () => {
    if (!tenant.id) return;
    setIsLoadingPolicy(true);
    try {
      const settings = await getTenantSettings(tenant.id);
      setAllowUnscannedDownload(Boolean(settings?.allowUnscannedLargeFileDownload));
    } catch (error) {
      console.error('Không thể nạp cấu hình tải tệp chưa quét virus:', error);
      showToast('error', 'Không thể nạp cấu hình tải tệp chưa quét virus.');
    } finally {
      setIsLoadingPolicy(false);
    }
  }, [tenant.id]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTenant({ contactEmail: email, licenseLimit: limit });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleToggleUnscannedDownload = async () => {
    if (isTogglingPolicy || !tenant.id) return;
    const nextValue = !allowUnscannedDownload;
    setIsTogglingPolicy(true);
    try {
      await setUnscannedDownloadPolicy(tenant.id, nextValue);
      setAllowUnscannedDownload(nextValue);
      showToast(
        'success',
        nextValue
          ? 'Đã cho phép tải tệp chưa được quét virus.'
          : 'Đã tắt cho phép tải tệp chưa được quét virus.'
      );
    } catch (error) {
      console.error('Không thể cập nhật cấu hình tải tệp chưa quét virus:', error);
      showToast('error', 'Cập nhật cấu hình tải tệp chưa quét virus thất bại. Vui lòng thử lại.');
    } finally {
      setIsTogglingPolicy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 mt-4 shadow-2xs max-w-2xl animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Cấu Hình Doanh Nghiệp</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập thông tin liên hệ quản trị, giới hạn số tài khoản và chính sách an toàn tệp tin
          </p>
        </div>
        <button
          onClick={onBackToOverview}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/80 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại</span>
        </button>
      </div>

      {toast && (
        <div
          className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 mt-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email Liên Hệ Quản Trị Viên Chính
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/50 focus:bg-white rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Giới Hạn Số Lượng Tài Khoản Nhân Sự (Seats Cap)
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full text-xs border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/50 focus:bg-white rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Mã Định Danh Doanh Nghiệp (UUID)
          </label>
          <input
            type="text"
            readOnly
            value={tenant.id}
            className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-500 font-mono cursor-not-allowed select-all"
          />
        </div>

        <div className="pt-3 pb-2 border-t border-slate-100 mt-4">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <label className="block text-xs font-semibold text-slate-800">
                Cho phép tải tệp quá lớn để quét virus (kèm cảnh báo an toàn)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Khi tắt, người dùng trong tổ chức sẽ không thể tải các tệp quá giới hạn quét virus tự động (TooLargeToScan).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={allowUnscannedDownload}
              disabled={isLoadingPolicy || isTogglingPolicy}
              onClick={handleToggleUnscannedDownload}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                allowUnscannedDownload ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  allowUnscannedDownload ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full transition-all shadow-xs hover:shadow-sm cursor-pointer"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Đã lưu cài đặt' : 'Lưu thay đổi'}</span>
          </button>
          {saved && (
            <span className="text-xs text-emerald-600 font-semibold">
              ✓ Cấu hình đã được lưu thành công
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
