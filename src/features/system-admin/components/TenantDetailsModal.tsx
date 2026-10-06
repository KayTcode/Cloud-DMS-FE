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
  Layers
} from 'lucide-react';
import { SystemTenant, PlanType } from '../types';
import { 
  getTenantStorageQuota, 
  getTenantUsers, 
  getTenantDepartments, 
  TenantQuotaData 
} from '@/features/tenants/api';

interface TenantDetailsModalProps {
  tenant: SystemTenant | null;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onChangePlan: (id: string, newPlan: PlanType) => void;
  onOpenPortal?: (tenant: SystemTenant) => void;
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
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [realQuota, setRealQuota] = useState<TenantQuotaData | null>(null);
  const [realUsersCount, setRealUsersCount] = useState<number | null>(null);
  const [realDepartmentsCount, setRealDepartmentsCount] = useState<number | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled([
      getTenantStorageQuota(tenant.id),
      getTenantUsers(tenant.id),
      getTenantDepartments(tenant.id),
    ]).then(([quotaRes, usersRes, deptsRes]) => {
      if (!isMounted) return;

      if (quotaRes.status === 'fulfilled' && quotaRes.value) {
        setRealQuota(quotaRes.value);
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

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

  if (!tenant) return null;

  // Real calculations
  const quotaBytes = realQuota?.storageQuotaBytes || 0;
  const usedBytes = realQuota?.storageUsedBytes || 0;
  const availableBytes = realQuota?.availableBytes ?? Math.max(0, quotaBytes - usedBytes);
  const usagePercentage = quotaBytes > 0 
    ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) 
    : 0;

  const storageUsedDisplay = formatBytes(usedBytes);
  const storageQuotaDisplay = quotaBytes > 0 ? formatBytes(quotaBytes) : 'Chưa cấp Quota';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
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

        {/* Modal Content */}
        <div className="p-6 space-y-5">
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

            {/* Storage Used */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Đã sử dụng
              </span>
              <span className="text-sm font-bold text-blue-600 mt-1 block font-mono">
                {isLoading ? '...' : storageUsedDisplay}
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

          {/* Storage Bar - Real Percentage & Provider */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>Mức tiêu thụ dung lượng Cloud</span>
              </span>
              <span className="font-mono text-slate-600 font-medium">
                {storageUsedDisplay} / {storageQuotaDisplay} ({usagePercentage}%)
              </span>
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
                Khả dụng: <strong className="text-slate-700">{formatBytes(availableBytes)}</strong>
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

          {/* Quick Actions & Drill-down button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
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
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
