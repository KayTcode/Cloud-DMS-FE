import React, { useState, useEffect, useCallback } from 'react';
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
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-5 shadow-2xs max-w-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Tenant Configuration</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure system parameters, administrative contacts, and seat limits.
          </p>
        </div>
        <button
          onClick={onBackToOverview}
          className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
        >
          Back to Overview
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
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Primary Contact Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            License Seats Cap
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tenant Unique Identifier (UUID)
          </label>
          <input
            type="text"
            readOnly
            value={tenant.id}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 font-mono cursor-not-allowed"
          />
        </div>

        <div className="pt-2 pb-2 border-t border-slate-100 mt-4">
          <div className="flex items-center justify-between mt-4">
            <div className="pr-4">
              <label className="block text-xs font-semibold text-slate-700">
                Cho phép tải tệp quá lớn để quét virus (kèm cảnh báo)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Khi tắt, người dùng trong tổ chức sẽ không thể tải các tệp quá lớn để quét virus (TooLargeToScan).
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
                className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                  allowUnscannedDownload ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            Save Changes
          </button>
          {saved && (
            <span className="text-xs text-emerald-600 font-semibold">
              ✓ Settings saved successfully
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
