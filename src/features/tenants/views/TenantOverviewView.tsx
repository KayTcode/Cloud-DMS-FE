import React from 'react';
import { UserCheck, Download, UserPlus } from 'lucide-react';
import { TenantInfo, TenantEvent } from '@/features/tenants/types';
import { StorageStatsCard } from '../components/StorageStatsCard';

interface TenantOverviewViewProps {
  tenant: TenantInfo;
  events: TenantEvent[];
  onImpersonate: () => void;
  onDownloadBackup: () => void;
  onNavigateTab: (tab: 'users' | 'departments' | 'storage' | 'activity') => void;
  onCreateDepartmentUser: () => void;
}

export const TenantOverviewView: React.FC<TenantOverviewViewProps> = ({
  tenant,
  events,
  onImpersonate,
  onDownloadBackup,
  onNavigateTab,
  onCreateDepartmentUser,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
      {/* Left Column (Stats & Storage) */}
      <div className="lg:col-span-8 space-y-5">
        {/* Top 2 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Total User Accounts Card */}
          <div
            onClick={() => onNavigateTab('users')}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
          >
            <h4 className="text-xs font-semibold text-slate-800 tracking-tight">
              Total User Accounts
            </h4>
            <div className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight mt-2.5">
              {tenant.licenseUsed.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-2.5">
              License Limit: {tenant.licenseLimit.toLocaleString()} seats
            </p>
          </div>

          {/* Configured Departments Card */}
          <div
            onClick={() => onNavigateTab('departments')}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
          >
            <h4 className="text-xs font-semibold text-slate-800 tracking-tight">
              Configured Departments
            </h4>
            <div className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight mt-2.5">
              {tenant.departmentsCount}
            </div>
            <p className="text-xs text-slate-400 mt-2.5">
              HR, Legal, Finance, etc.
            </p>
          </div>
        </div>

        {/* Managed Storage Pool Statistics Card */}
        <StorageStatsCard
          tenant={tenant}
          onNavigateToStorage={() => onNavigateTab('storage')}
          onExpandStorage={() => onNavigateTab('storage')}
        />
      </div>

      {/* Right Column (Quick Actions & Recent Events) */}
      <div className="lg:col-span-4 space-y-5">
        {/* Quick Admin Actions Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <h4 className="text-xs font-semibold text-slate-800 tracking-tight mb-3.5">
            Quick Admin Actions
          </h4>

          <div className="space-y-2.5">
            {/* Create Department User Button */}
            <button
              onClick={onCreateDepartmentUser}
              className="w-full border border-blue-200 bg-blue-50/40 rounded-lg p-3 flex items-center gap-3 hover:bg-blue-50 hover:border-blue-300 transition-all text-left group cursor-pointer"
            >
              <div className="w-6 h-6 rounded bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-blue-900 group-hover:text-blue-700 transition-colors block">
                  Tạo tài khoản Department
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  Cấp tài khoản & phân quyền theo phòng ban
                </span>
              </div>
            </button>

            {/* Impersonate Button */}
            <button
              onClick={onImpersonate}
              className="w-full border border-slate-200/90 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group cursor-pointer"
            >
              <div className="w-6 h-6 flex items-center justify-center text-blue-600 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                Impersonate Tenant Owner
              </span>
            </button>

            {/* Download Backup Button */}
            <button
              onClick={onDownloadBackup}
              className="w-full border border-slate-200/90 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group cursor-pointer"
            >
              <div className="w-6 h-6 flex items-center justify-center text-blue-600 shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                Download Tenant Database Backup
              </span>
            </button>
          </div>
        </div>

        {/* Recent Tenant Events Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-xs font-semibold text-slate-800 tracking-tight">
              Recent Tenant Events
            </h4>
            <button
              onClick={() => onNavigateTab('activity')}
              className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-slate-600 truncate flex-1" title={event.text}>
                  {event.text}
                </span>
                <span className="text-slate-400 tabular-nums shrink-0 text-[11px]">
                  {event.timeAgo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
