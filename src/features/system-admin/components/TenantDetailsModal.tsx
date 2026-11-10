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
  Sparkles,
  UserX,
  UserPlus,
  RefreshCw,
  Trash2,
  Clock
} from 'lucide-react';
import { OffboardTenantAdminModal } from './OffboardTenantAdminModal';
import { AssignTenantAdminModal } from './AssignTenantAdminModal';
import { SystemTenant, PlanType, StorageProviderItem } from '../types';
import {
  getTenantStorageQuota,
  getTenantUsers,
  getTenantDepartments,
  TenantQuotaData
} from '@/features/tenants/api';
import { QuotaFeatureToggle } from '@/features/quota';
import {
  allocateTenantStorageQuotaApi,
  resendVacantTenantAdminInvitationApi,
  cancelVacantTenantAdminInvitationApi
} from '../api/systemAdminCommands';
import {
  getStorageProviderAvailableQuotaApi,
  getStorageProvidersApi
} from '../api/systemAdminQueries';
import { QuotaUnitInput } from '@/components/common/QuotaUnitInput';
import {
  QuotaUnit,
  UNIT_BYTES,
  unitToBytes,
  bytesToUnit,
  formatQuotaAuto,
  formatQuotaWithUnit,
} from '@/utils/quotaUnitUtils';

interface TenantDetailsModalProps {
  tenant: SystemTenant | null;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onChangePlan: (id: string, newPlan: PlanType) => void;
  onOpenPortal?: (tenant: SystemTenant, targetTab?: string) => void;
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
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [realDepartmentsCount, setRealDepartmentsCount] = useState<number | null>(null);
  const [tenantDepartments, setTenantDepartments] = useState<any[]>([]);
  const [isOffboardModalOpen, setIsOffboardModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isResendingInvitation, setIsResendingInvitation] = useState(false);
  const [isCancellingInvitation, setIsCancellingInvitation] = useState(false);
  const [invitationActionMessage, setInvitationActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Quota Adjustment States
  const [quotaValue, setQuotaValue] = useState<number>(10);
  const [quotaUnit, setQuotaUnit] = useState<QuotaUnit>('GB');
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
        setTenantUsers(usersRes.value);
      } else {
        setRealUsersCount(null);
        setTenantUsers([]);
      }

      if (deptsRes.status === 'fulfilled' && deptsRes.value) {
        setRealDepartmentsCount(deptsRes.value.length);
        setTenantDepartments(deptsRes.value);
      } else {
        setRealDepartmentsCount(null);
        setTenantDepartments([]);
      }

      let validProviders: StorageProviderItem[] = [];
      if (providersRes.status === 'fulfilled' && Array.isArray(providersRes.value)) {
        validProviders = providersRes.value;
        setProviders(validProviders);
      }

      // Initialize quotaValue and quotaUnit
      const currentBytes = initialQuotaBytes > 0 ? initialQuotaBytes : 10 * UNIT_BYTES.GB;
      if (currentBytes >= UNIT_BYTES.TB) {
        setQuotaUnit('TB');
        setQuotaValue(bytesToUnit(currentBytes, 'TB'));
      } else if (currentBytes < UNIT_BYTES.GB) {
        setQuotaUnit('MB');
        setQuotaValue(bytesToUnit(currentBytes, 'MB'));
      } else {
        setQuotaUnit('GB');
        setQuotaValue(bytesToUnit(currentBytes, 'GB'));
      }

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
  const currentQuotaDisplay = quotaBytes > 0 ? formatQuotaAuto(quotaBytes) : 'Chưa cấp Quota';

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

  const storageQuotaDisplay = currentQuotaDisplay;
  const remainingQuotaDisplay = formatBytes(unallocatedBytes);
  const allocatedToDeptsDisplay = formatBytes(allocatedToDeptsBytes);

  // Boundaries for Quota Adjustment
  // Min: Không được nhỏ hơn mức Quota đã cấp cho các phòng ban hoặc dữ liệu file thực tế
  const minRequiredBytes = Math.max(allocatedToDeptsBytes, actualPhysicalUsedBytes);

  // Selected provider details & Available pool
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const providerRemainingGB = providerAvailable?.availableToAllocateGB ?? 1000;
  const providerRemainingBytes = providerRemainingGB * UNIT_BYTES.GB;

  // If tenant is on this provider, they can increase by providerRemainingBytes
  const maxAllowedBytes = providerAvailable
    ? Math.max(minRequiredBytes, quotaBytes + providerRemainingBytes)
    : Math.max(minRequiredBytes + 50 * UNIT_BYTES.GB, quotaBytes + 50 * UNIT_BYTES.GB);

  // Delta calculations - Không khóa nếu Tenant đang ở chế độ Tiếp quản lâm thời (Interim Management)
  const isTenantSuspended = (realQuota?.isActive === false || tenant.status === 'Suspended') && !tenant.isInterimManaged;
  const targetQuotaBytes = unitToBytes(quotaValue, quotaUnit);
  const deltaBytes = targetQuotaBytes - quotaBytes;
  const isChanged = targetQuotaBytes !== quotaBytes;
  const isBelowMin = targetQuotaBytes < minRequiredBytes;
  const isAboveMax = deltaBytes > providerRemainingBytes;
  const canSave = isChanged && !isBelowMin && !isAboveMax && !isSavingQuota && !isTenantSuspended && Boolean(selectedProviderId);

  // Simulated metrics for Tab 2
  const simulatedRemainingBytes = Math.max(0, targetQuotaBytes - allocatedToDeptsBytes);
  const simulatedUsagePercentage = targetQuotaBytes > 0
    ? Math.min(100, Math.round((allocatedToDeptsBytes / targetQuotaBytes) * 100))
    : 0;

  // Stepper handlers
  const handleStepDeltaBytes = (stepBytes: number) => {
    if (isTenantSuspended) return;
    const nextBytes = Math.max(minRequiredBytes, Math.min(maxAllowedBytes, targetQuotaBytes + stepBytes));
    setQuotaValue(bytesToUnit(nextBytes, quotaUnit));
    setQuotaSuccessMessage(null);
    setQuotaErrorMessage(null);
  };

  const handleResetQuota = () => {
    if (isTenantSuspended) return;
    const currentBytes = quotaBytes || 10 * UNIT_BYTES.GB;
    if (currentBytes >= UNIT_BYTES.TB) {
      setQuotaUnit('TB');
      setQuotaValue(bytesToUnit(currentBytes, 'TB'));
    } else if (currentBytes < UNIT_BYTES.GB) {
      setQuotaUnit('MB');
      setQuotaValue(bytesToUnit(currentBytes, 'MB'));
    } else {
      setQuotaUnit('GB');
      setQuotaValue(bytesToUnit(currentBytes, 'GB'));
    }
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
      const targetBytes = targetQuotaBytes;
      await allocateTenantStorageQuotaApi(tenant.id, {
        storageProviderId: providerId,
        quotaBytes: targetBytes,
      });

      // Refetch updated quota
      const updated = await getTenantStorageQuota(tenant.id);
      if (updated) {
        setRealQuota(updated);
        const newBytes = updated.storageQuotaBytes;
        setQuotaValue(bytesToUnit(newBytes, quotaUnit));
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
          .catch(() => { });
      }

      setQuotaSuccessMessage(`Đã cập nhật hạn mức Quota thành công: ${formatQuotaAuto(targetBytes)}!`);
      if (onQuotaUpdated) {
        onQuotaUpdated(tenant.id, targetBytes);
      }
    } catch (err: any) {
      setQuotaErrorMessage(err?.response?.data?.message || err.message || 'Lỗi khi cập nhật Quota.');
    } finally {
      setIsSavingQuota(false);
    }
  };

  // Tra cứu tài khoản Quản trị viên đang chờ kích hoạt (Pending) nếu có
  const pendingAdminUser = tenantUsers.find(
    (u: any) =>
      (u.role?.includes('TenantAdmin') || (Array.isArray(u.roles) && u.roles.includes('TenantAdmin'))) &&
      (u.status === 'Suspended' || u.isActive === false)
  );

  const handleResendInvitation = async () => {
    if (!tenant?.id) return;
    setIsResendingInvitation(true);
    setInvitationActionMessage(null);
    try {
      const res = await resendVacantTenantAdminInvitationApi(tenant.id);
      setInvitationActionMessage({
        type: 'success',
        text: `Đã phát hành lại thư mời mới thành công tới ${res.targetUserEmail}. Hạn kích hoạt được gia hạn 48 giờ.`,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Lỗi khi gửi lại thư mời.';
      setInvitationActionMessage({ type: 'error', text: msg });
    } finally {
      setIsResendingInvitation(false);
    }
  };

  const handleCancelInvitation = async () => {
    if (!tenant?.id) return;
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn hủy lời mời Quản trị viên này không?\n\n' +
      '• Nếu tài khoản được tạo mới từ người ngoài hệ thống (chưa từng kích hoạt), hệ thống sẽ XÓA HẲN tài khoản khỏi CSDL để bảo vệ tính toàn vẹn và sạch sẽ dữ liệu (Smart Cleanup).\n' +
      '• Nếu là cựu nhân sự cũ, tài khoản vẫn được bảo toàn danh tính và chỉ gỡ liên kết khỏi Doanh nghiệp.'
    );
    if (!confirmed) return;

    setIsCancellingInvitation(true);
    setInvitationActionMessage(null);
    try {
      const res = await cancelVacantTenantAdminInvitationApi(tenant.id);
      setInvitationActionMessage({
        type: 'success',
        text: `Đã hủy lời mời thành công. ${res.smartCleanupApplied ? '(Đã xóa sạch tài khoản khỏi CSDL theo cơ chế Smart Cleanup)' : ''}`,
      });
      // Refresh danh sách users
      const users = await getTenantUsers(tenant.id);
      setTenantUsers(users);
      setRealUsersCount(users.length);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Lỗi khi hủy lời mời.';
      setInvitationActionMessage({ type: 'error', text: msg });
    } finally {
      setIsCancellingInvitation(false);
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
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${tenant.status === 'Active'
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
            className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'overview'
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
            className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${activeTab === 'quota'
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
              {/* Alert thông báo sau thao tác gửi lại / hủy lời mời */}
              {invitationActionMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center justify-between border animate-in fade-in ${
                    invitationActionMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {invitationActionMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{invitationActionMessage.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvitationActionMessage(null)}
                    className="p-0.5 hover:opacity-70 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* TÌNH TRẠNG TIẾP QUẢN LÂM THỜI & BỔ NHIỆM ADMIN */}
              {tenant.isInterimManaged && (
                <div className="rounded-2xl border overflow-hidden shadow-xs transition-all">
                  {pendingAdminUser ? (
                    /* Trạng thái 1: Đang có lời mời chờ kích hoạt (48 giờ) */
                    <div className="p-4 bg-linear-to-r from-blue-50/90 to-indigo-50/80 border-blue-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-xl bg-blue-100 text-blue-600 mt-0.5">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-blue-950">
                                Lời mời Quản trị viên Doanh nghiệp đang chờ kích hoạt
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Thời hạn: 48h
                              </span>
                            </div>
                            <p className="text-[11px] text-blue-800/90 mt-0.5">
                              Người nhận: <strong className="text-blue-950">{pendingAdminUser.name}</strong> ({pendingAdminUser.email})
                            </p>
                          </div>
                        </div>

                        {/* Thao tác Gửi lại & Hủy */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isResendingInvitation || isCancellingInvitation}
                            onClick={handleResendInvitation}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Vô hiệu token cũ, sinh token mới và gửi lại Gmail gia hạn 48 giờ"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isResendingInvitation ? 'animate-spin' : ''}`} />
                            <span>Gửi lại lời mời</span>
                          </button>

                          <button
                            type="button"
                            disabled={isResendingInvitation || isCancellingInvitation}
                            onClick={handleCancelInvitation}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Hủy lời mời và xóa hẳn tài khoản người ngoài khỏi CSDL (Smart Cleanup)"
                          >
                            <Trash2 className={`w-3.5 h-3.5 ${isCancellingInvitation ? 'animate-spin' : ''}`} />
                            <span>Hủy lời mời</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-blue-700/80 bg-blue-100/50 p-2.5 rounded-lg border border-blue-200/50">
                        💡 <strong>Lưu ý:</strong> Khi người nhận kích hoạt mật khẩu thành công qua Gmail, hệ thống sẽ tự động gán toàn quyền điều hành doanh nghiệp và kết thúc trạng thái tiếp quản lâm thời.
                      </div>
                    </div>
                  ) : (
                    /* Trạng thái 2: Chưa mời Quản trị viên mới */
                    <div className="p-4 bg-linear-to-r from-amber-50 to-orange-50/70 border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-700 mt-0.5">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-amber-950">
                            Doanh nghiệp đang khuyết Quản trị viên (Tiếp quản Lâm thời)
                          </h4>
                          <p className="text-[11px] text-amber-800/90 mt-0.5 max-w-md">
                            System Admin đang tạm thời nắm quyền điều phối. Hãy mời Quản trị viên mới để bàn giao quyền điều hành cho Doanh nghiệp.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAssignModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-500/20 transition-colors shrink-0 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Mời Quản trị viên mới (Gmail)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

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
                    className={`h-full rounded-full transition-all duration-500 ${usagePercentage >= 90
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

              {/* Danh sách Phòng ban & Trạng thái Quản lý */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cơ cấu Phòng ban ({tenantDepartments.length})</span>
                  </span>
                  {onOpenPortal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenPortal(tenant, 'departments');
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      <span>Xem chi tiết trong Portal</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {tenantDepartments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">Chưa có phòng ban nào được thiết lập.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {tenantDepartments.map((dept) => {
                      const isDeptVacant = !!dept.isVacant;
                      return (
                        <div
                          key={dept.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${isDeptVacant
                              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                              : 'bg-slate-50 border-slate-100 text-slate-800'
                            }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold truncate">{dept.name}</span>
                              {isDeptVacant && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/80 text-amber-800 shrink-0">
                                  Khuyết Trưởng phòng
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>Mã: <code className="font-mono">{dept.code || 'N/A'}</code></span>
                              <span>·</span>
                              <span>Quota: <strong className="font-mono text-slate-700">{formatBytes(dept.storageQuotaBytes || ((dept.allocatedStorageGB || 0) * (1024 ** 3)))}</strong></span>
                              {isDeptVacant && dept.vacantLeadQuotaBytes ? (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-700 font-medium">Tạm giữ: {(dept.vacantLeadQuotaBytes / (1024 ** 3)).toFixed(1)} GB</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {isDeptVacant && onOpenPortal && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenPortal(tenant, 'departments');
                                onClose();
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Bổ nhiệm Trưởng phòng mới và tiếp nhận kho dữ liệu tạm giữ"
                            >
                              <span>Bổ nhiệm ngay</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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

              {/* Thông tin: Tiếp quản lâm thời */}
              {tenant.isInterimManaged && (
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Chế độ Tiếp quản Lâm thời (Interim Management)</span>
                    <span className="text-indigo-800">
                      Tổ chức đang khuyết Quản trị viên Doanh nghiệp. System Admin có toàn quyền trực tiếp điều phối Quota và phân bổ tài nguyên lưu trữ cho Doanh nghiệp.
                    </span>
                  </div>
                </div>
              )}

              {/* Provider & Current State Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Hạn mức hiện tại:</span>
                  <span className="font-bold text-slate-800 text-sm font-mono">{currentQuotaDisplay}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Quota còn lại (chưa cấp):</span>
                  <span className="font-bold text-blue-600 text-sm font-mono">{remainingQuotaDisplay}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Đã cấp PB: {allocatedToDeptsDisplay}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[11px]">Nguồn Cloud lưu trữ:</span>
                  <span className="font-semibold text-slate-700 truncate block">
                    {realQuota?.allocations && realQuota.allocations.length > 0
                      ? `${realQuota.allocations.length} tài khoản Cloud`
                      : (realQuota?.storageProviderName || 'Google Drive Primary')}
                  </span>
                </div>
              </div>

              {/* Multi-Provider Allocations Breakdown (if any) */}
              {realQuota?.allocations && realQuota.allocations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Các nguồn lưu trữ của Tenant ({realQuota.allocations.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Bấm vào thẻ để chọn nhanh nguồn
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {realQuota.allocations.map((alloc) => {
                      const isSelected = alloc.storageProviderId === selectedProviderId;
                      return (
                        <div
                          key={alloc.allocationId}
                          onClick={() => {
                            if (!isTenantSuspended && !isSavingQuota) {
                              setSelectedProviderId(alloc.storageProviderId);
                              setQuotaErrorMessage(null);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${isSelected
                            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
                              <HardDrive className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className="truncate">{alloc.storageProviderName}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800 shrink-0">
                              {formatBytes(alloc.grantedBytes)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-mono">
                            <span>Đã chia: {formatBytes(alloc.allocatedToChildrenBytes)}</span>
                            <span>Thực dùng: {formatBytes(alloc.usedBytes)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quota Adjustment Main Controller */}
              <div className={`p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4 ${isTenantSuspended ? 'opacity-60 pointer-events-none select-none' : ''
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
                      <span>Khôi phục ({currentQuotaDisplay})</span>
                    </button>
                  )}
                </div>

                {/* Cloud Storage Provider Selector Dropdown */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chọn Cloud Storage Provider nguồn:</span>
                    </label>
                    {providerAvailable && (
                      <span className="text-[11px] font-medium text-slate-500 font-mono">
                        Cloud trống: <strong className="text-blue-600 font-bold">{providerAvailable.availableToAllocateGB} GB</strong> / {providerAvailable.totalGB} GB
                      </span>
                    )}
                  </div>

                  <select
                    value={selectedProviderId}
                    onChange={(e) => {
                      setSelectedProviderId(e.target.value);
                      setQuotaErrorMessage(null);
                      setQuotaSuccessMessage(null);
                    }}
                    disabled={isTenantSuspended || isSavingQuota || providers.length === 0}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed shadow-2xs"
                  >
                    {providers.length === 0 ? (
                      <option value="">Không có Cloud Storage Provider nào</option>
                    ) : (
                      providers.map((p) => {
                        const existingAlloc = realQuota?.allocations?.find((a) => a.storageProviderId === p.id);
                        const note = existingAlloc ? ` [Đang có ${formatBytes(existingAlloc.grantedBytes)}]` : ' [Chưa cấp cho Tenant]';
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.type}){note}
                          </option>
                        );
                      })
                    )}
                  </select>

                  {providerAvailable && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5 px-0.5">
                      <span>Đã cấp cho các Tenant khác: {providerAvailable.alreadyAllocatedGB} GB</span>
                      <span>Tổng dung lượng Cloud: {providerAvailable.totalGB} GB</span>
                    </div>
                  )}
                </div>

                {/* Quota Unit Input (MB / GB / TB) */}
                <div className="pt-1">
                  <QuotaUnitInput
                    label="Hạn mức Quota điều chỉnh"
                    value={quotaValue}
                    unit={quotaUnit}
                    onChange={(val, u) => {
                      setQuotaValue(val);
                      setQuotaUnit(u);
                      setQuotaSuccessMessage(null);
                      setQuotaErrorMessage(null);
                    }}
                    maxBytes={maxAllowedBytes}
                    minBytes={minRequiredBytes}
                    disabled={isTenantSuspended || isSavingQuota}
                    helperText={`Tối thiểu: ${formatQuotaAuto(minRequiredBytes)} (Đã cấp PB / Tệp tin). Tối đa khả dụng: ${formatQuotaAuto(maxAllowedBytes)}.`}
                  />
                </div>

                {/* Quick Presets Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Phím tắt tăng / giảm nhanh:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: '-10 GB', delta: -10 * UNIT_BYTES.GB },
                      { label: '-5 GB', delta: -5 * UNIT_BYTES.GB },
                      { label: '-1 GB', delta: -1 * UNIT_BYTES.GB },
                      { label: '-500 MB', delta: -500 * UNIT_BYTES.MB },
                    ].map((btn) => {
                      const target = targetQuotaBytes + btn.delta;
                      const disabled = target < minRequiredBytes || isSavingQuota || isTenantSuspended;
                      return (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => handleStepDeltaBytes(btn.delta)}
                          disabled={disabled}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          {btn.label}
                        </button>
                      );
                    })}

                    {[
                      { label: '+500 MB', delta: 500 * UNIT_BYTES.MB },
                      { label: '+1 GB', delta: 1 * UNIT_BYTES.GB },
                      { label: '+5 GB', delta: 5 * UNIT_BYTES.GB },
                      { label: '+10 GB', delta: 10 * UNIT_BYTES.GB },
                      { label: '+20 GB', delta: 20 * UNIT_BYTES.GB },
                      { label: '+50 GB', delta: 50 * UNIT_BYTES.GB },
                      { label: '+100 GB', delta: 100 * UNIT_BYTES.GB },
                      { label: '+1 TB', delta: 1 * UNIT_BYTES.TB },
                    ].map((btn) => {
                      const target = targetQuotaBytes + btn.delta;
                      const disabled = target > maxAllowedBytes || isSavingQuota || isTenantSuspended;
                      return (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => handleStepDeltaBytes(btn.delta)}
                          disabled={disabled}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-2 pt-2">
                  <input
                    type="range"
                    min={minRequiredBytes}
                    max={maxAllowedBytes}
                    step={quotaUnit === 'MB' ? 100 * UNIT_BYTES.MB : UNIT_BYTES.GB}
                    value={targetQuotaBytes}
                    disabled={isTenantSuspended || isSavingQuota}
                    onChange={(e) => {
                      const b = Number(e.target.value);
                      setQuotaValue(bytesToUnit(b, quotaUnit));
                      setQuotaSuccessMessage(null);
                      setQuotaErrorMessage(null);
                    }}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Min: {formatQuotaAuto(minRequiredBytes)} (Đã cấp PB)</span>
                    <span className="font-bold text-slate-700">Mới: {formatQuotaAuto(targetQuotaBytes)}</span>
                    <span>Max: {formatQuotaAuto(maxAllowedBytes)} (Cloud Free)</span>
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
                    {deltaBytes > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono">
                        +{formatQuotaAuto(deltaBytes)} từ {selectedProvider?.name || 'Cloud'}
                      </span>
                    ) : deltaBytes < 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 font-mono">
                        -{formatQuotaAuto(Math.abs(deltaBytes))} (Thu hồi LIFO)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600 font-mono">
                        Giữ nguyên ({currentQuotaDisplay})
                      </span>
                    )}
                  </div>

                  {/* Simulated Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Phân bổ PB sau khi đổi:</span>
                      <span className="font-bold text-slate-700">
                        {allocatedToDeptsDisplay} / {formatQuotaAuto(targetQuotaBytes)} ({simulatedUsagePercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${simulatedUsagePercentage >= 90
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
                    <span>Vượt quá dung lượng còn trống của Cloud Storage Provider ({selectedProvider?.name || 'Cloud'}: còn {providerRemainingGB} GB).</span>
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${tenant.status === 'Active'
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
            >
              {tenant.status === 'Active' ? 'Khóa Tenant' : 'Kích hoạt lại'}
            </button>

            {/* Nút Vô hiệu hóa Quản trị viên (Offboard Tenant Admin) */}
            {!tenant.isInterimManaged ? (
              <button
                type="button"
                onClick={() => setIsOffboardModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                title="Vô hiệu hóa Quản trị viên tổ chức này và thực hiện chuyển giao quyền lực"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Offboard Quản trị viên</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  Đang tiếp quản lâm thời
                </span>
                {!pendingAdminUser && (
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                    title="Mời Quản trị viên mới qua Email"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Mời Admin mới</span>
                  </button>
                )}
              </div>
            )}

            {onOpenPortal && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenPortal(tenant, 'departments');
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors cursor-pointer"
                  title="Truy cập danh sách phòng ban để bổ nhiệm Trưởng phòng khuyết hoặc cấp Quota"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Quản lý Phòng ban (Khuyết Lead)</span>
                </button>

                <button
                  onClick={() => {
                    onOpenPortal(tenant, 'overview');
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  title="Truy cập sâu vào Workspace quản trị của Tenant này"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Vào Portal Tenant</span>
                </button>
              </>
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

      {/* Xác định Quản trị viên của Tenant */}
      {(() => {
        const detectedAdminUser = (() => {
          if (tenantUsers && tenantUsers.length > 0) {
            const found = tenantUsers.find(
              (u: any) =>
                (u.role && u.role.includes('TenantAdmin')) ||
                (Array.isArray(u.roles) && u.roles.includes('TenantAdmin')) ||
                (tenant?.adminEmail && u.email?.toLowerCase() === tenant.adminEmail.toLowerCase())
            );
            if (found) {
              return {
                id: found.id,
                email: found.email,
                fullName: found.name || tenant?.name,
              };
            }
          }
          if (tenant?.adminId) {
            return {
              id: tenant.adminId,
              email: tenant.adminEmail || '',
              fullName: tenant.adminFullName || tenant.name,
            };
          }
          if (tenant?.vacantAdminUserId) {
            return {
              id: tenant.vacantAdminUserId,
              email: tenant.adminEmail || '',
              fullName: tenant.name,
            };
          }
          return null;
        })();

        return isOffboardModalOpen && (
          <OffboardTenantAdminModal
            isOpen={isOffboardModalOpen}
            onClose={() => setIsOffboardModalOpen(false)}
            tenant={tenant}
            currentAdminUser={
              detectedAdminUser
                ? {
                  id: detectedAdminUser.id,
                  email: detectedAdminUser.email,
                  firstName: '',
                  lastName: '',
                  fullName: detectedAdminUser.fullName,
                  isActive: true,
                  roles: ['TenantAdmin'],
                  permissions: [],
                  createdAt: '',
                }
                : (tenant.adminEmail
                  ? {
                    id: tenant.adminId || '',
                    email: tenant.adminEmail,
                    firstName: '',
                    lastName: '',
                    fullName: tenant.name,
                    isActive: true,
                    roles: ['TenantAdmin'],
                    permissions: [],
                    createdAt: '',
                  }
                  : null)
            }
            onSuccess={(res) => {
              if (tenant) {
                tenant.isInterimManaged = res.isInterimManaged;
                tenant.vacantAdminUserId = res.offboardedAdminId;
              }
              setIsOffboardModalOpen(false);
            }}
          />
        );
      })()}

      {/* Modal Bổ nhiệm Quản trị viên mới qua Email */}
      {isAssignModalOpen && (
        <AssignTenantAdminModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          tenant={tenant}
          onSuccess={async (res) => {
            setIsAssignModalOpen(false);
            const users = await getTenantUsers(tenant.id);
            setTenantUsers(users);
            setRealUsersCount(users.length);
            setInvitationActionMessage({
              type: 'success',
              text: `Đã phát hành thư mời bổ nhiệm tới ${res.newAdminEmail} thành công (thời hạn 48 giờ).`,
            });
          }}
        />
      )}
    </div>
  );
};
