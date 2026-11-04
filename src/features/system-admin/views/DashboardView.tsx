import React from 'react';
import { Building2, Users, Server, Cloud } from 'lucide-react';
import { SystemTenant, SystemActivityItem, StorageProviderItem, AuditLogEntry } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StoragePoolDistributionCard } from '../components/StoragePoolDistributionCard';
import { TenantCapacityAlertsCard } from '../components/TenantCapacityAlertsCard';
import { RecentTenantsCard } from '../components/RecentTenantsCard';
import { RecentActivitiesCard } from '../components/RecentActivitiesCard';
import { NavItem } from '@/features/tenants/types';
import { QuotaMetricsCard } from '@/features/quota';

interface DashboardViewProps {
  tenants: SystemTenant[];
  activities: SystemActivityItem[];
  providers?: StorageProviderItem[];
  auditLogs?: AuditLogEntry[];
  totalUsersCount?: number;
  onNavigateNav: (nav: NavItem) => void;
  onSelectTenant: (tenant: SystemTenant) => void;
}

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 GB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  tenants = [],
  activities = [],
  providers = [],
  auditLogs = [],
  totalUsersCount = 0,
  onNavigateNav,
  onSelectTenant,
}) => {
  // 1. Số liệu Doanh nghiệp
  const activeTenantsCount = tenants.filter((t) => t.status === 'Active').length;
  const suspendedTenantsCount = tenants.length - activeTenantsCount;

  // 2. Tính toán Bể chứa Cloud và Quota phân bổ toàn sàn
  const totalStorageCapacityBytes = providers.reduce(
    (acc, p) => acc + (p.totalCapacityBytes || 0),
    0
  );
  const totalAllocatedBytes = providers.reduce(
    (acc, p) => acc + (p.allocatedToTenantsBytes || 0),
    0
  );
  const totalUnallocatedBytes = Math.max(0, totalStorageCapacityBytes - totalAllocatedBytes);
  const allocatedPercent = totalStorageCapacityBytes > 0
    ? Math.min(100, Math.round((totalAllocatedBytes / totalStorageCapacityBytes) * 100))
    : 0;

  // 3. Hoạt động kiểm toán thật trích xuất từ Audit Logs API (nếu có)
  const displayActivities: SystemActivityItem[] =
    auditLogs.length > 0
      ? auditLogs.slice(0, 5).map((log) => ({
          id: log.id,
          title: `${log.action} - ${log.details}`,
          timeAgo: log.timestamp,
          actor: log.actor,
          type: log.status === 'SUCCESS' ? 'upgrade' : 'security',
        }))
      : activities;

  return (
    <div className="space-y-6">
      {/* 4 Thẻ Chỉ số KPI Cốt lõi — 100% Đồng bộ nghiệp vụ Cloud-DMS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Tổ chức / Doanh nghiệp"
          value={`${tenants.length} Doanh nghiệp`}
          subtitle={`${activeTenantsCount} Đang hoạt động • ${suspendedTenantsCount} Tạm ngưng`}
          icon={<Building2 className="w-4 h-4 text-blue-600 stroke-[2.2]" />}
          iconBgColor="bg-blue-50"
        />

        <MetricCard
          title="Tổng số Người dùng"
          value={`${totalUsersCount.toLocaleString()} tài khoản`}
          subtitle="Tài khoản nhân viên trên toàn hệ thống"
          icon={<Users className="w-4 h-4 text-emerald-600 stroke-[2.2]" />}
          iconBgColor="bg-emerald-50"
        />

        <MetricCard
          title="Hạn mức Quota Toàn sàn"
          value={
            totalStorageCapacityBytes > 0
              ? `${formatBytes(totalAllocatedBytes)} / ${formatBytes(totalStorageCapacityBytes)}`
              : '0 GB / 0 GB'
          }
          subtitle={`Đã cấp phát: ${allocatedPercent}% tổng dung lượng Cloud`}
          icon={<Server className="w-4 h-4 text-indigo-600 stroke-[2.2]" />}
          iconBgColor="bg-indigo-50"
        />

        <MetricCard
          title="Dung lượng Trống Cấp mới"
          value={`${formatBytes(totalUnallocatedBytes)} khả dụng`}
          subtitle="Sẵn sàng phân bổ cho Doanh nghiệp mới"
          icon={<Cloud className="w-4 h-4 text-sky-600 stroke-[2.2]" />}
          iconBgColor="bg-sky-50"
        />
      </div>

      {/* Khối Chỉ số Phê duyệt Quota (Live API: /api/admin/quota-requests/metrics) */}
      <QuotaMetricsCard />

      {/* Hàng giữa: Phân bổ Bể lưu trữ Cloud & Sức khỏe Quota Doanh nghiệp */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <StoragePoolDistributionCard
            providers={providers}
            onManageProviders={() => onNavigateNav('storage-providers')}
          />
        </div>
        <div className="lg:col-span-4">
          <TenantCapacityAlertsCard
            tenants={tenants}
            providers={providers}
            onSelectTenant={onSelectTenant}
            onViewAllTenants={() => onNavigateNav('tenants')}
          />
        </div>
      </div>

      {/* Hàng dưới: Bảng Doanh nghiệp chuẩn hóa & Nhật ký kiểm toán thời gian thực */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <RecentTenantsCard
            tenants={tenants}
            onViewAllTenants={() => onNavigateNav('tenants')}
            onSelectTenant={onSelectTenant}
          />
        </div>
        <div className="lg:col-span-4">
          <RecentActivitiesCard
            activities={displayActivities}
            onViewAllLogs={() => onNavigateNav('audit-logs')}
          />
        </div>
      </div>
    </div>
  );
};
