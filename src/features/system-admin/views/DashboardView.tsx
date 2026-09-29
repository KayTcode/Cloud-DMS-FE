import React from 'react';
import { Database, Users, HardDrive, Cloud } from 'lucide-react';
import { SystemTenant, SystemActivityItem } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StorageGrowthChart } from '../components/StorageGrowthChart';
import { SystemHealthCard } from '../components/SystemHealthCard';
import { RecentTenantsCard } from '../components/RecentTenantsCard';
import { RecentActivitiesCard } from '../components/RecentActivitiesCard';
import { NavItem } from '@/features/tenants/types';

interface DashboardViewProps {
  tenants: SystemTenant[];
  activities: SystemActivityItem[];
  onNavigateNav: (nav: NavItem) => void;
  onSelectTenant: (tenant: SystemTenant) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tenants,
  activities,
  onNavigateNav,
  onSelectTenant,
}) => {
  return (
    <div className="space-y-6">
      {/* 4 Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Total Tenants"
          value={String(tenants.length || 24)}
          subtitle="Active SaaS companies"
          icon={<Database className="w-4 h-4 text-blue-600 stroke-[2.2]" />}
          iconBgColor="bg-blue-50"
        />

        <MetricCard
          title="Active Users"
          value="1,847"
          subtitle="Online right now: 312"
          icon={<Users className="w-4 h-4 text-emerald-600 stroke-[2.2]" />}
          iconBgColor="bg-emerald-50"
        />

        <MetricCard
          title="Total Storage Used"
          value="4.2 TB / 10 TB"
          subtitle="42% usage rate"
          icon={<HardDrive className="w-4 h-4 text-amber-600 stroke-[2.2]" />}
          iconBgColor="bg-amber-50"
        />

        <MetricCard
          title="Connected Providers"
          value="3 Active"
          subtitle="AWS S3, Drive, OneDrive"
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

      {/* Bottom Row: Recent Tenant Administrations & Recent System Activities */}
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
            activities={activities}
            onViewAllLogs={() => onNavigateNav('audit-logs')}
          />
        </div>
      </div>
    </div>
  );
};
