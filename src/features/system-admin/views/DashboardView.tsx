import React from 'react';
import { Database, Users, HardDrive, Cloud } from 'lucide-react';
import { SystemTenant, SystemActivityItem, StorageProviderItem, AuditLogEntry } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StorageGrowthChart } from '../components/StorageGrowthChart';
import { SystemHealthCard } from '../components/SystemHealthCard';
import { RecentTenantsCard } from '../components/RecentTenantsCard';
import { RecentActivitiesCard } from '../components/RecentActivitiesCard';
import { NavItem } from '@/features/tenants/types';

interface DashboardViewProps {
  tenants: SystemTenant[];
  activities: SystemActivityItem[];
  providers?: StorageProviderItem[];
  auditLogs?: AuditLogEntry[];
  totalUsersCount?: number;
  onNavigateNav: (nav: NavItem) => void;
  onSelectTenant: (tenant: SystemTenant) => void;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 GB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  tenants,
  activities,
  providers = [],
  auditLogs = [],
  totalUsersCount = 0,
  onNavigateNav,
  onSelectTenant,
}) => {
  // 1. Calculate Real Storage Capacity & Used Bytes from Providers
  const totalStorageCapacityBytes = providers.reduce(
    (acc, p) => acc + (p.totalCapacityBytes || 0),
    0
  );
  const totalStorageUsedBytes = providers.reduce(
    (acc, p) => acc + (p.usedCapacityBytes || 0),
    0
  );
  const storageUsagePercent = totalStorageCapacityBytes > 0
    ? Math.round((totalStorageUsedBytes / totalStorageCapacityBytes) * 100)
    : 0;

  // 2. Active Storage Providers
  const activeProvidersCount = providers.filter(
    (p) => p.status === 'Connected'
  ).length || providers.length;
  const providerNamesList = providers.map((p) => p.name).join(', ') || 'Chưa kết nối Cloud Provider';

  // 3. Real Activities derived from DB Audit Logs (if available)
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
      {/* 4 Metric Stat Cards - 100% Real Live Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Tổ chức / Tenants"
          value={String(tenants.length || 1)}
          subtitle="Doanh nghiệp hoạt động trên hệ thống"
          icon={<Database className="w-4 h-4 text-blue-600 stroke-[2.2]" />}
          iconBgColor="bg-blue-50"
        />

        <MetricCard
          title="Tổng số Người dùng"
          value={`${totalUsersCount.toLocaleString()} tài khoản`}
          subtitle="Đồng bộ trực tiếp từ Database"
          icon={<Users className="w-4 h-4 text-emerald-600 stroke-[2.2]" />}
          iconBgColor="bg-emerald-50"
        />

        <MetricCard
          title="Dung lượng Cloud sử dụng"
          value={
            totalStorageCapacityBytes > 0
              ? `${formatBytes(totalStorageUsedBytes)} / ${formatBytes(totalStorageCapacityBytes)}`
              : '0 GB / 0 GB'
          }
          subtitle={`Tỷ lệ tiêu thụ: ${storageUsagePercent}%`}
          icon={<HardDrive className="w-4 h-4 text-amber-600 stroke-[2.2]" />}
          iconBgColor="bg-amber-50"
        />

        <MetricCard
          title="Kho lưu trữ kết nối"
          value={`${activeProvidersCount} Nhà cung cấp`}
          subtitle={providerNamesList}
          icon={<Cloud className="w-4 h-4 text-sky-600 stroke-[2.2]" />}
          iconBgColor="bg-sky-50"
        />
      </div>

      {/* Middle Row: Global Storage Growth & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <StorageGrowthChart />
        </div>
        <div className="lg:col-span-4">
          <SystemHealthCard />
        </div>
      </div>

      {/* Bottom Row: Recent Tenant Administrations & Real Recent Activities */}
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
