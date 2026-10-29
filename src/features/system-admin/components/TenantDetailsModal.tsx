import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  ExternalLink, 
  Loader2, 
  HardDrive, 
  Users, 
  Building2, 
  Calendar, 
  Mail, 
  Phone, 
  Database,
  Layers,
  Sliders,
  Plus,
  Minus,
  RotateCcw,
  Check,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { SystemTenant, PlanType, StorageProviderItem } from '../types';
import { 
  getTenantStorageQuota, 
  getTenantUsers, 
  getTenantDepartments, 
  TenantQuotaData 
} from '@/features/tenants/api';
import { QuotaFeatureToggle } from '@/features/quota';
import { allocateTenantStorageQuotaApi } from '../api/systemAdminCommands';
import { 
  getStorageProviderAvailableQuotaApi, 
  getStorageProvidersApi 
} from '../api/systemAdminQueries';

interface TenantDetailsModalProps {
  tenant: SystemTenant | null;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onChangePlan: (id: string, newPlan: PlanType) => void;
  onOpenPortal?: (tenant: SystemTenant) => void;
  onQuotaUpdated?: (tenantId: string, newQuotaBytes: number) => void;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  onClose,
  onToggleStatus,
  onChangePlan,
  onOpenPortal,
  onQuotaUpdated,
}) => {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'overview' | 'quota'>('overview');

  // Loading & Base Data
  const [isLoading, setIsLoading] = useState(false);
  const [realQuota, setRealQuota] = useState<TenantQuotaData | null>(null);
  const [realUsersCount, setRealUsersCount] = useState<number | null>(null);
  const [realDepartmentsCount, setRealDepartmentsCount] = useState<number | null>(null);

  // Quota Adjustment States
  const [quotaGB, setQuotaGB] = useState<number>(0);
  const [isSavingQuota, setIsSavingQuota] = useState(false);
  const [quotaSuccessMessage, setQuotaSuccessMessage] = useState<string | null>(null);
  const [quotaErrorMessage, setQuotaErrorMessage] = useState<string | null>(null);
  const [providers, setProviders] = useState<StorageProviderItem[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [providerAvailable, setProviderAvailable] = useState<{
    totalGB: number;
    cloudFreeGB: number;
    alreadyAllocatedGB: number;
    availableToAllocateGB: number;
  } | null>(null);

  // Load tenant stats & providers
  useEffect(() => {
    if (!tenant?.id) return;

    let isMounted = true;
    setIsLoading(true);
    setQuotaSuccessMessage(null);
    setQuotaErrorMessage(null);
    setActiveTab('overview');

    Promise.allSettled([
      getTenantStorageQuota(tenant.id),
      getTenantUsers(tenant.id),
      getTenantDepartments(tenant.id),
      getStorageProvidersApi(),
    ]).then(([quotaRes, usersRes, deptsRes, providersRes]) => {
      if (!isMounted) return;

      let initialQuotaBytes = 0;
      let initialProviderId = '';

      if (quotaRes.status === 'fulfilled' && quotaRes.value) {
        setRealQuota(quotaRes.value);
        initialQuotaBytes = quotaRes.value.storageQuotaBytes || 0;
        initialProviderId = quotaRes.value.storageProviderId || '';
      } else {
        setRealQuota(null);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value) {
        setRealUsersCount(usersRes.value.length);
      } else {
        setRealUsersCount(null);
      }

      if (deptsRes.status === 'fulfilled' && deptsRes.value) {
        setRealDepartmentsCount(deptsRes.value.length);
      } else {
        setRealDepartmentsCount(null);
      }

      let validProviders: StorageProviderItem[] = [];
      if (providersRes.status === 'fulfilled' && Array.isArray(providersRes.value)) {
        validProviders = providersRes.value;
        setProviders(validProviders);
      }

      // Initialize quotaGB
      const currentGB = initialQuotaBytes > 0 
        ? Math.round(initialQuotaBytes / (1024 * 1024 * 1024)) 
        : 10;
      setQuotaGB(currentGB);

      // Determine selected provider
      if (initialProviderId && validProviders.some(p => p.id === initialProviderId)) {
        setSelectedProviderId(initialProviderId);
      } else if (validProviders.length > 0) {
        setSelectedProviderId(validProviders[0].id);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

  // Load available quota of selected provider
  useEffect(() => {
    if (!selectedProviderId) {
      setProviderAvailable(null);
      return;
    }

    let isMounted = true;
    getStorageProviderAvailableQuotaApi(selectedProviderId)
      .then((res) => {
        if (!isMounted || !res) return;
        setProviderAvailable({
          totalGB: Math.round(res.totalCapacityBytes / (1024 * 1024 * 1024)),
          cloudFreeGB: Math.round(res.cloudFreeBytes / (1024 * 1024 * 1024)),
          alreadyAllocatedGB: Math.round(res.alreadyAllocatedBytes / (1024 * 1024 * 1024)),
          availableToAllocateGB: Math.round(res.availableToAllocateBytes / (1024 * 1024 * 1024)),
        });
      })
      .catch((err) => {
        console.error('Failed to get provider available quota:', err);
        if (isMounted) setProviderAvailable(null);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProviderId]);

  if (!tenant) return null;

  // Real calculations
  const quotaBytes = realQuota?.storageQuotaBytes || 0;
  const currentQuotaGB = Math.round(quotaBytes / (1024 * 1024 * 1024));
  
  // Quota đã cấp cho các phòng ban
  const allocatedToDeptsBytes = realQuota?.allocatedToDepartmentsBytes || 0;
  // Quota còn lại sau khi cấp cho các phòng ban
  const unallocatedBytes = realQuota?.unallocatedBytes ?? Math.max(0, quotaBytes - allocatedToDeptsBytes);
  // Dữ liệu file thực tế trong kho lưu trữ
  const actualPhysicalUsedBytes = realQuota?.actualStorageUsedBytes || 0;

  // Tỷ lệ % Quota đã phân bổ cho các phòng ban
  const usagePercentage = quotaBytes > 0 
    ? Math.min(100, Math.round((allocatedToDeptsBytes / quotaBytes) * 100)) 
    : 0;

  const storageQuotaDisplay = quotaBytes > 0 ? formatBytes(quotaBytes) : 'Chưa cấp Quota';
  const remainingQuotaDisplay = formatBytes(unallocatedBytes);
  const allocatedToDeptsDisplay = formatBytes(allocatedToDeptsBytes);

  // Boundaries for Quota Adjustment
  // Min: Không được nhỏ hơn mức Quota đã cấp cho các phòng ban hoặc dữ liệu file thực tế
  const minRequiredBytes = Math.max(allocatedToDeptsBytes, actualPhysicalUsedBytes);
  const minGB = Math.max(1, Math.ceil(minRequiredBytes / (1024 * 1024 * 1024)));
  
  // Available pool from provider
  const providerRemainingGB = providerAvailable?.availableToAllocateGB ?? 1000;
  // If tenant is on this provider, they can increase by providerRemainingGB
  const maxGB = Math.max(minGB + 50, currentQuotaGB + providerRemainingGB);

  // Delta calculations
  const isTenantSuspended = tenant.status !== 'Active';
  const deltaGB = quotaGB - currentQuotaGB;
  const isChanged = quotaGB !== currentQuotaGB;
  const isBelowMin = quotaGB < minGB;
  const isAboveMax = providerAvailable ? (deltaGB > providerAvailable.availableToAllocateGB) : false;
  const canSave = isChanged && !isBelowMin && !isAboveMax && !isSavingQuota && !isTenantSuspended;

  // Simulated metrics for Tab 2
  const newQuotaBytes = quotaGB * 1024 * 1024 * 1024;
  const simulatedRemainingBytes = Math.max(0, newQuotaBytes - allocatedToDeptsBytes);
  const simulatedUsagePercentage = newQuotaBytes > 0
    ? Math.min(100, Math.round((allocatedToDeptsBytes / newQuotaBytes) * 100))
    : 0;

  // Stepper handlers
  const handleStepQuota = (amount: number) => {
    if (isTenantSuspended) return;
    setQuotaGB((prev) => {
      const next = prev + amount;
      return Math.max(minGB, Math.min(maxGB, next));
    });
    setQuotaSuccessMessage(null);
    setQuotaErrorMessage(null);
  };

  const handleResetQuota = () => {
    if (isTenantSuspended) return;
    setQuotaGB(currentQuotaGB || 10);
    setQuotaSuccessMessage(null);
    setQuotaErrorMessage(null);
  };

  // Submit quota change to backend
  const handleSaveQuota = async () => {
    if (!tenant?.id) return;
    if (isTenantSuspended) {
      setQuotaErrorMessage(`Tenant '${tenant.name}' hiện đang bị vô hiệu hóa (${tenant.status}). Vui lòng kích hoạt lại Tenant trước khi điều chỉnh Quota.`);
      return;
    }
    const providerId = selectedProviderId || realQuota?.storageProviderId;
    if (!providerId) {
      setQuotaErrorMessage('Chưa xác định Cloud Storage Provider để cấp Quota.');
      return;
    }

    if (isBelowMin) {
      setQuotaErrorMessage(`Hạn mức không thể nhỏ hơn dung lượng đã phân bổ cho các phòng ban (${allocatedToDeptsDisplay}).`);
      return;
    }

    if (isAboveMax) {
      setQuotaErrorMessage(`Vượt quá dung lượng khả dụng của Cloud Provider (${providerRemainingGB} GB).`);
      return;
    }

    setIsSavingQuota(true);
    setQuotaErrorMessage(null);
    setQuotaSuccessMessage(null);

    try {
      const targetBytes = quotaGB * 1024 * 1024 * 1024;
      await allocateTenantStorageQuotaApi(tenant.id, {
        storageProviderId: providerId,
        quotaBytes: targetBytes,
      });

      // Refetch updated quota
      const updated = await getTenantStorageQuota(tenant.id);
      if (updated) {
        setRealQuota(updated);
        setQuotaGB(Math.round(updated.storageQuotaBytes / (1024 * 1024 * 1024)));
      }

      // Refetch provider availability
      if (providerId) {
        getStorageProviderAvailableQuotaApi(providerId)
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
          .catch(() => {});
      }

      setQuotaSuccessMessage(`Đã cập nhật hạn mức Quota thành công: ${quotaGB} GB!`);
      if (onQuotaUpdated) {
        onQuotaUpdated(tenant.id, targetBytes);
      }
    } catch (err: any) {
      setQuotaErrorMessage(err?.response?.data?.message || err.message || 'Lỗi khi cập nhật Quota.');
    } finally {
      setIsSavingQuota(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl sm:max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm shadow-2xs">
              {tenant.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {tenant.name}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    tenant.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-rose-50 text-rose-500 border border-rose-100'
                  }`}
                >
                  {tenant.status}
                </span>
                {isLoading && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-normal">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang đồng bộ DB...</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                {tenant.tenantCode ? (
                  <span className="font-semibold text-slate-600">Mã: {tenant.tenantCode} · </span>
                ) : null}
                <span>ID: {tenant.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-slate-50/40 gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tổng quan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quota')}
            className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
              activeTab === 'quota'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Quản lý Quota</span>
            {isChanged && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                Chưa lưu
              </span>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* ========================================================================= */}
          {/* TAB 1: TỔNG QUAN (OVERVIEW)                                               */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              {/* Key Specs Grid - 100% Real Data from Database */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Storage Quota */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Hạn mức Quota
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                    {isLoading ? '...' : storageQuotaDisplay}
                  </span>
                </div>

                {/* Quota còn lại sau khi cấp cho phòng ban */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Quota còn lại
                  </span>
                  <span className="text-sm font-bold text-blue-600 mt-1 block font-mono">
                    {isLoading ? '...' : remainingQuotaDisplay}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                    Đã cấp PB: {isLoading ? '...' : allocatedToDeptsDisplay}
                  </span>
                </div>

                {/* Users Count */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Nhân sự (Users)
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                    {isLoading ? '...' : (realUsersCount !== null ? `${realUsersCount} người` : '1 người')}
                  </span>
                </div>

                {/* Departments Count */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Phòng ban
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                    {isLoading ? '...' : (realDepartmentsCount !== null ? `${realDepartmentsCount} phòng` : '0 phòng')}
                  </span>
                </div>
              </div>

              {/* Storage Bar - Real Percentage & Provider with Quick Link */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                    <span>Mức phân bổ Quota phòng ban</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-600 font-medium">
                      {allocatedToDeptsDisplay} / {storageQuotaDisplay} ({usagePercentage}%)
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('quota')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      <span>Tăng/Giảm</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercentage >= 90
                        ? 'bg-rose-500'
                        : usagePercentage >= 80
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>
                    Kho lưu trữ: <strong className="text-slate-700">{realQuota?.storageProviderName || 'Cloud Storage Pool'}</strong>
                  </span>
                  <span>
                    Quota chưa cấp: <strong className="text-slate-700">{remainingQuotaDisplay}</strong>
                  </span>
                </div>
              </div>

              {/* Real Organization & Account Metadata */}
              <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email quản trị viên:</span>
                  </span>
                  <span className="font-medium text-slate-800 font-mono">{tenant.adminEmail || 'Chưa cập nhật'}</span>
                </div>

                {tenant.phoneNumber && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Số điện thoại:</span>
                    </span>
                    <span className="font-medium text-slate-800 font-mono">{tenant.phoneNumber}</span>
                  </div>
                )}

                {tenant.departmentName && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Phòng ban trực thuộc:</span>
                    </span>
                    <span className="font-medium text-slate-800">{tenant.departmentName}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ngày tạo tài khoản:</span>
                  </span>
                  <span className="font-medium text-slate-800">{tenant.createdDate || 'Gần đây'}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mô hình phân vùng:</span>
                  </span>
                  <span className="font-mono text-blue-600 font-medium">Multi-Tenant Database Isolation</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Tiêu chuẩn bảo mật:</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    JWT Auth · Role-Based Access Control (RBAC)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: QUẢN LÝ QUOTA (QUOTA MANAGEMENT)                                   */}
          {/* ========================================================================= */}
          {activeTab === 'quota' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              
              {/* Alert Banners */}
              {quotaSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{quotaSuccessMessage}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setQuotaSuccessMessage(null)}
                    className="text-emerald-600 hover:text-emerald-800 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {quotaErrorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-medium">{quotaErrorMessage}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setQuotaErrorMessage(null)}
                    className="text-rose-600 hover:text-rose-800 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Warning: Tenant is Suspended / Inactive */}
              {isTenantSuspended && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Tenant đang bị vô hiệu hóa / tạm ngưng ({tenant.status})</span>
                    <span className="text-amber-800">
                      Hệ thống không cho phép tăng hoặc giảm Quota khi Tenant chưa được kích hoạt. Vui lòng bấm <strong>&quot;Kích hoạt lại&quot;</strong> ở góc dưới trước khi thực hiện.
                    </span>
                  </div>
                </div>
              )}

              {/* Provider & Current State Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Hạn mức hiện tại:</span>
                  <span className="font-bold text-slate-800 text-sm font-mono">{currentQuotaGB} GB</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Quota còn lại (chưa cấp):</span>
                  <span className="font-bold text-blue-600 text-sm font-mono">{remainingQuotaDisplay}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Đã cấp PB: {allocatedToDeptsDisplay}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[11px]">Cloud Provider:</span>
                  <span className="font-semibold text-slate-700 truncate block">
                    {realQuota?.storageProviderName || 'Google Drive Primary'}
                  </span>
                </div>
              </div>

              {/* Quota Adjustment Main Controller */}
              <div className={`p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4 ${
                isTenantSuspended ? 'opacity-60 pointer-events-none select-none' : ''
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Điều chỉnh Hạn mức Quota</span>
                  </label>
                  {isChanged && !isTenantSuspended && (
                    <button
                      type="button"
                      onClick={handleResetQuota}
                      className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Khôi phục ({currentQuotaGB} GB)</span>
                    </button>
                  )}
                </div>

                {/* Big Stepper Input */}
                <div className="flex items-center justify-center gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => handleStepQuota(-5)}
                    disabled={quotaGB <= minGB || isSavingQuota || isTenantSuspended}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                    title="Giảm 5 GB"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="relative flex items-center justify-center">
                    <input
                      type="number"
                      min={minGB}
                      max={maxGB}
                      disabled={isTenantSuspended}
                      value={quotaGB}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setQuotaGB(isNaN(val) ? 0 : val);
                        setQuotaSuccessMessage(null);
                        setQuotaErrorMessage(null);
                      }}
                      className="w-32 sm:w-40 h-12 text-center text-2xl font-bold font-mono text-slate-900 border-2 border-blue-500/80 rounded-xl bg-blue-50/20 focus:outline-hidden focus:border-blue-600 focus:ring-3 focus:ring-blue-100 transition-all pr-8 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="absolute right-3 text-xs font-bold text-slate-400 font-mono pointer-events-none">
                      GB
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStepQuota(5)}
                    disabled={quotaGB >= maxGB || isSavingQuota || isTenantSuspended}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                    title="Tăng 5 GB"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Presets Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Phím tắt tăng / giảm nhanh:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[-10, -5].map((delta) => {
                      const target = quotaGB + delta;
                      const disabled = target < minGB || isSavingQuota;
                      return (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => handleStepQuota(delta)}
                          disabled={disabled}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          {delta} GB
                        </button>
                      );
                    })}

                    {[5, 10, 20, 50, 100].map((delta) => {
                      const target = quotaGB + delta;
                      const disabled = target > maxGB || isSavingQuota;
                      return (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => handleStepQuota(delta)}
                          disabled={disabled}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          +{delta} GB
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-2 pt-2">
                  <input
                    type="range"
                    min={minGB}
                    max={maxGB}
                    step={1}
                    value={quotaGB}
                    onChange={(e) => {
                      setQuotaGB(parseInt(e.target.value, 10));
                      setQuotaSuccessMessage(null);
                      setQuotaErrorMessage(null);
                    }}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Min: {minGB} GB (Đã cấp PB)</span>
                    <span className="font-bold text-slate-700">Mới: {quotaGB} GB</span>
                    <span>Max: {maxGB} GB (Cloud Free)</span>
                  </div>
                </div>

                {/* Live Preview Impact Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      <span>Dự báo sau khi áp dụng:</span>
                    </span>
                    
                    {/* Delta Badge */}
                    {deltaGB > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono">
                        +{deltaGB} GB (+{Math.round((deltaGB / (currentQuotaGB || 1)) * 100)}%)
                      </span>
                    ) : deltaGB < 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 font-mono">
                        {deltaGB} GB ({Math.round((deltaGB / (currentQuotaGB || 1)) * 100)}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600 font-mono">
                        Giữ nguyên ({currentQuotaGB} GB)
                      </span>
                    )}
                  </div>

                  {/* Simulated Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Phân bổ PB sau khi đổi:</span>
                      <span className="font-bold text-slate-700">
                        {allocatedToDeptsDisplay} / {quotaGB} GB ({simulatedUsagePercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          simulatedUsagePercentage >= 90
                            ? 'bg-rose-500'
                            : simulatedUsagePercentage >= 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${simulatedUsagePercentage}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono text-right">
                      Dự kiến Quota còn lại: <strong className="text-blue-600 font-bold">{formatBytes(simulatedRemainingBytes)}</strong>
                    </div>
                  </div>
                </div>

                {/* Validation warnings */}
                {isBelowMin && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Không thể hạ Quota nhỏ hơn dung lượng đã phân bổ cho các phòng ban ({allocatedToDeptsDisplay}).</span>
                  </div>
                )}

                {isAboveMax && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Vượt quá dung lượng còn trống của Cloud Storage Provider ({providerRemainingGB} GB).</span>
                  </div>
                )}

                {/* Save Quota Action Button */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleResetQuota}
                    disabled={!isChanged || isSavingQuota}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Hủy thay đổi
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveQuota}
                    disabled={!canSave}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSavingQuota ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu Quota...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Lưu thay đổi Quota</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Policy Toggle: Request Quota Feature Flag */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Chính sách yêu cầu Quota của Tenant
                </span>
                <QuotaFeatureToggle
                  tenantId={tenant.id}
                  tenantName={tenant.name}
                />
              </div>

            </div>
          )}
        </div>

        {/* Modal Fixed Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStatus(tenant.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                tenant.status === 'Active'
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
            >
              {tenant.status === 'Active' ? 'Khóa Tenant' : 'Kích hoạt lại'}
            </button>

            {onOpenPortal && (
              <button
                onClick={() => {
                  onOpenPortal(tenant);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                title="Truy cập sâu vào Workspace quản trị của Tenant này"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Vào Portal Tenant</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
