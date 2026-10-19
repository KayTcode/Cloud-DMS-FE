import React, { useState, useEffect } from 'react';
import { 
  X, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Layers, 
  PieChart, 
  TrendingUp 
} from 'lucide-react';
import { StorageProviderItem, AdminUserDto } from '../types';
import { allocateTenantStorageQuotaApi } from '../api/systemAdminCommands';
import { 
  getTenantStorageQuotaApi, 
  getStorageProviderAvailableQuotaApi,
  getStorageProvidersApi 
} from '../api/systemAdminQueries';

interface AllocateQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantUser: AdminUserDto | null;
  providers: StorageProviderItem[];
  onSuccess: (message: string) => void;
}

export const AllocateQuotaModal: React.FC<AllocateQuotaModalProps> = ({
  isOpen,
  onClose,
  tenantUser,
  providers: initialProviders = [],
  onSuccess,
}) => {
  const [activeProviders, setActiveProviders] = useState<StorageProviderItem[]>(initialProviders);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [quotaGB, setQuotaGB] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current quota state
  const [currentQuota, setCurrentQuota] = useState<{
    storageQuotaBytes: number;
    storageUsedBytes: number;
    storageProviderName?: string;
  } | null>(null);

  // Available quota state of selected provider
  const [providerAvailable, setProviderAvailable] = useState<{
    totalGB: number;
    cloudFreeGB: number;
    alreadyAllocatedGB: number;
    availableToAllocateGB: number;
  } | null>(null);

  // Helper formatting for GB / TB
  const formatGB = (gb: number): string => {
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(1)} TB (${gb.toLocaleString()} GB)`;
    }
    return `${gb.toLocaleString()} GB`;
  };

  useEffect(() => {
    if (!isOpen || !tenantUser) return;

    setErrorMessage(null);
    setIsLoading(true);

    const quotaPromise = tenantUser.tenantId
      ? getTenantStorageQuotaApi(tenantUser.tenantId).catch(() => null)
      : Promise.resolve(null);

    // Concurrently load fresh providers and tenant's current quota directly from backend
    Promise.all([
      getStorageProvidersApi().catch(() => initialProviders),
      quotaPromise,
    ])
      .then(([freshProviders, tenantQuota]) => {
        const validProviders: StorageProviderItem[] = 
          freshProviders && freshProviders.length > 0 ? freshProviders : initialProviders;
        setActiveProviders(validProviders);

        if (tenantQuota) {
          setCurrentQuota(tenantQuota);
          if (tenantQuota.storageQuotaBytes && tenantQuota.storageQuotaBytes > 0) {
            setQuotaGB(Math.round(tenantQuota.storageQuotaBytes / (1024 * 1024 * 1024)));
          }
        }

        // Determine which provider to select:
        // Prioritize the tenant's current provider ONLY if it exists in validProviders
        let targetId = '';
        if (
          tenantQuota?.storageProviderId &&
          validProviders.some((p: StorageProviderItem) => p.id === tenantQuota.storageProviderId)
        ) {
          targetId = tenantQuota.storageProviderId;
        } else if (validProviders.length > 0) {
          targetId = validProviders[0].id;
        }

        setSelectedProviderId(targetId);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, tenantUser]);

  useEffect(() => {
    if (!selectedProviderId) {
      setProviderAvailable(null);
      return;
    }

    getStorageProviderAvailableQuotaApi(selectedProviderId)
      .then((res) => {
        if (res) {
          setProviderAvailable({
            totalGB: Math.round(res.totalCapacityBytes / (1024 * 1024 * 1024)),
            cloudFreeGB: Math.round(res.cloudFreeBytes / (1024 * 1024 * 1024)),
            alreadyAllocatedGB: Math.round(res.alreadyAllocatedBytes / (1024 * 1024 * 1024)),
            availableToAllocateGB: Math.round(res.availableToAllocateBytes / (1024 * 1024 * 1024)),
          });
        }
      })
      .catch((err) => {
        console.error('Failed to get provider available quota:', err);
        setProviderAvailable(null);
      });
  }, [selectedProviderId]);

  if (!isOpen || !tenantUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantUser.tenantId) {
      setErrorMessage('Tài khoản này chưa được gán vào Tenant nào.');
      return;
    }

    if (!selectedProviderId) {
      setErrorMessage('Vui lòng chọn một Cloud Storage Provider.');
      return;
    }

    if (quotaGB <= 0) {
      setErrorMessage('Dung lượng cấp phải lớn hơn 0 GB.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const quotaBytes = quotaGB * 1024 * 1024 * 1024;
      await allocateTenantStorageQuotaApi(tenantUser.tenantId, {
        storageProviderId: selectedProviderId,
        quotaBytes,
      });

      const providerObj = activeProviders.find((p) => p.id === selectedProviderId);
      onSuccess(`Đã cấp thành công ${quotaGB} GB (${providerObj?.name || 'Cloud'}) cho Tenant ${tenantUser.tenantName || tenantUser.fullName}!`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Lỗi khi cấp Quota.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProvider = activeProviders.find((p) => p.id === selectedProviderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Cấp Quota Cho Tenant Admin
              </h3>
              <p className="text-xs text-slate-500">
                Phân bổ hạn mức lưu trữ Cloud cho tổ chức: <strong className="text-slate-700">{tenantUser.tenantName || 'Tenant'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tenant Info Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Đại diện Tenant Admin:</span>
              <span className="font-bold text-slate-800">{tenantUser.fullName} ({tenantUser.email})</span>
            </div>
            {currentQuota && (
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Hạn mức hiện tại:</span>
                <span className="font-mono font-bold text-indigo-600">
                  {Math.round(currentQuota.storageQuotaBytes / (1024 * 1024 * 1024))} GB
                </span>
              </div>
            )}
          </div>

          {/* Select Cloud Storage Provider */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              1. Chọn Cloud Storage Provider
            </label>

            {isLoading ? (
              <div className="flex items-center justify-center p-6 text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Đang tải danh sách Cloud Provider...</span>
              </div>
            ) : activeProviders.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Hiện chưa có Cloud Storage Provider nào được kết nối. Vui lòng kết nối Google Drive hoặc OneDrive tại mục &quot;Storage Providers&quot; trước khi cấp Quota.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {activeProviders.map((p) => {
                  const isSelected = p.id === selectedProviderId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProviderId(p.id);
                        setErrorMessage(null);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">Loại: {p.type}</div>
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <span className="text-slate-400 text-[11px] block">Tổng dung lượng</span>
                        <span className="font-mono font-semibold text-slate-700">{p.capacity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Space in Selected Provider */}
          {providerAvailable && (
            <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between font-medium text-blue-900">
                <span>Dung lượng khả dụng có thể cấp:</span>
                <strong className="font-bold text-blue-700 font-mono">
                  {formatGB(providerAvailable.availableToAllocateGB)}
                </strong>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      providerAvailable.totalGB > 0
                        ? (providerAvailable.alreadyAllocatedGB / providerAvailable.totalGB) * 100
                        : 0
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-blue-600">
                <span>Đã phân bổ cho các Tenant khác: {formatGB(providerAvailable.alreadyAllocatedGB)}</span>
                <span>Tổng Cloud: {formatGB(providerAvailable.totalGB)}</span>
              </div>
            </div>
          )}

          {/* Input Quota in GB */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              2. Nhập Hạn Mức Cấp Cho Tenant (GB)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max={providerAvailable?.availableToAllocateGB || 1000000}
                required
                value={quotaGB}
                onChange={(e) => {
                  setQuotaGB(Number(e.target.value));
                  setErrorMessage(null);
                }}
                className="w-full px-3.5 py-2.5 text-base font-bold font-mono text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              <span className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-sm">
                GB
              </span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-2">
            {[5, 10, 20, 50, 100].map((gb) => (
              <button
                key={gb}
                type="button"
                onClick={() => setQuotaGB(gb)}
                className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                  quotaGB === gb
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {gb} GB
              </button>
            ))}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading || activeProviders.length === 0 || !selectedProviderId}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Đang cấp...' : 'Xác Nhận Cấp Quota'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
