import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Minus,
} from 'lucide-react';
import { StorageProviderItem, AdminUserDto, QuotaAllocationPartDto } from '../types';
import { addTenantQuotaApi, reduceTenantQuotaApi } from '../api/systemAdminCommands';
import {
  getTenantStorageQuotaApi,
  getStorageProviderAvailableQuotaApi,
  getStorageProvidersApi,
  getTenantQuotaAllocationsApi,
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

  // Allocation table state
  const [allocations, setAllocations] = useState<QuotaAllocationPartDto[]>([]);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);
  const [reducingId, setReducingId] = useState<string | null>(null);
  const [reduceGB, setReduceGB] = useState<number>(1);
  const [isReducing, setIsReducing] = useState(false);
  const [reduceError, setReduceError] = useState<string | null>(null);

  // Helper formatting for bytes → GB / TB
  const formatGB = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
    return `${gb.toFixed(1)} GB`;
  };

  // Helper formatting for GB numbers (no bytes input)
  const formatGBNum = (gb: number): string => {
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(1)} TB (${gb.toLocaleString()} GB)`;
    }
    return `${gb.toLocaleString()} GB`;
  };

  const reloadAllocations = useCallback(async () => {
    if (!tenantUser?.tenantId) return;
    setIsLoadingAllocations(true);
    try {
      const res = await getTenantQuotaAllocationsApi(tenantUser.tenantId);
      setAllocations(res?.parts ?? []);
    } catch {
      setAllocations([]);
    } finally {
      setIsLoadingAllocations(false);
    }
  }, [tenantUser]);

  useEffect(() => {
    if (!isOpen || !tenantUser) return;

    setErrorMessage(null);
    setIsLoading(true);

    const quotaPromise = tenantUser.tenantId
      ? getTenantStorageQuotaApi(tenantUser.tenantId).catch(() => null)
      : Promise.resolve(null);

    const allocationsPromise = tenantUser.tenantId
      ? getTenantQuotaAllocationsApi(tenantUser.tenantId).catch(() => null)
      : Promise.resolve(null);

    Promise.all([
      getStorageProvidersApi().catch(() => initialProviders),
      quotaPromise,
      allocationsPromise,
    ])
      .then(([freshProviders, tenantQuota, allocationRes]) => {
        const validProviders: StorageProviderItem[] =
          freshProviders && freshProviders.length > 0 ? freshProviders : initialProviders;
        setActiveProviders(validProviders);

        if (tenantQuota) {
          setCurrentQuota(tenantQuota);
          if (tenantQuota.storageQuotaBytes && tenantQuota.storageQuotaBytes > 0) {
            setQuotaGB(Math.round(tenantQuota.storageQuotaBytes / (1024 * 1024 * 1024)));
          }
        }

        setAllocations(allocationRes?.parts ?? []);

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

  const handleReduce = async (allocationId: string) => {
    if (!tenantUser.tenantId) return;
    setIsReducing(true);
    setReduceError(null);
    try {
      await reduceTenantQuotaApi(tenantUser.tenantId, { bytes: reduceGB * 1024 * 1024 * 1024 });
      setReducingId(null);
      setReduceGB(1);
      await reloadAllocations();
      onSuccess(`Đã giảm quota thành công.`);
    } catch (err: any) {
      setReduceError(err?.response?.data?.message || err.message || 'Lỗi khi giảm Quota.');
    } finally {
      setIsReducing(false);
    }
  };

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
      const bytes = quotaGB * 1024 * 1024 * 1024;
      await addTenantQuotaApi(tenantUser.tenantId, {
        storageProviderId: selectedProviderId,
        bytes,
      });

      const providerObj = activeProviders.find((p) => p.id === selectedProviderId);
      await reloadAllocations();
      onSuccess(`Đã cấp thêm thành công ${quotaGB} GB (${providerObj?.name || 'Cloud'}) cho Tenant ${tenantUser.tenantName || tenantUser.fullName}!`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Lỗi khi cấp Quota.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
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

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">
            {/* Tenant Info Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Đại diện Tenant Admin:</span>
                <span className="font-bold text-slate-800">{tenantUser.fullName} ({tenantUser.email})</span>
              </div>
              {currentQuota && (
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Tổng hạn mức hiện tại:</span>
                  <span className="font-mono font-bold text-indigo-600">
                    {formatGB(currentQuota.storageQuotaBytes)}
                  </span>
                </div>
              )}
            </div>

            {/* Section 1: Allocation Table */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Phân bổ hiện tại
              </label>

              {isLoadingAllocations || (isLoading && allocations.length === 0) ? (
                <div className="flex items-center justify-center p-6 text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Đang tải phân bổ...</span>
                </div>
              ) : allocations.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center">
                  Chưa có phân bổ nào cho Tenant này.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Tài khoản</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Đã cấp</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Đã chia</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Đã dùng</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((alloc) => (
                        <React.Fragment key={alloc.allocationId}>
                          <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 font-medium text-slate-800">{alloc.storageProviderName}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-700">{formatGB(alloc.grantedBytes)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-500">{formatGB(alloc.allocatedToChildrenBytes)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-500">{formatGB(alloc.usedBytes)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setReducingId(reducingId === alloc.allocationId ? null : alloc.allocationId);
                                  setReduceGB(1);
                                  setReduceError(null);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                                Giảm
                              </button>
                            </td>
                          </tr>
                          {reducingId === alloc.allocationId && (
                            <tr className="bg-rose-50/40 border-b border-rose-100">
                              <td colSpan={5} className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-600 shrink-0">Giảm:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={reduceGB}
                                    onChange={(e) => setReduceGB(Number(e.target.value))}
                                    className="w-24 px-2.5 py-1.5 text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-500"
                                  />
                                  <span className="text-[11px] text-slate-500">GB</span>
                                  <button
                                    type="button"
                                    disabled={isReducing || reduceGB <= 0}
                                    onClick={() => handleReduce(alloc.allocationId)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {isReducing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                    Xác nhận
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setReducingId(null); setReduceError(null); }}
                                    className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                                {reduceError && (
                                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-600">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    <span>{reduceError}</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: Add quota form */}
            <form onSubmit={handleSubmit} className="space-y-5 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 mt-3">
                  Cấp thêm từ tài khoản lưu trữ
                </label>
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
                      {formatGBNum(providerAvailable.availableToAllocateGB)}
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
                    <span>Đã phân bổ cho các Tenant khác: {formatGBNum(providerAvailable.alreadyAllocatedGB)}</span>
                    <span>Tổng Cloud: {formatGBNum(providerAvailable.totalGB)}</span>
                  </div>
                </div>
              )}

              {/* Input Quota in GB */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  2. Nhập Dung Lượng Thêm (GB)
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
                  Đóng
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
                  <span>{isSubmitting ? 'Đang cấp...' : 'Cấp Thêm Quota'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
