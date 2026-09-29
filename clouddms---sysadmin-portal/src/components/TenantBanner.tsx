import React from 'react';
import { TenantInfo } from '../types';

interface TenantBannerProps {
  tenant: TenantInfo;
  onSuspendToggle: () => void;
  onManageSubscriptions: () => void;
  onNavigateToTenants?: () => void;
}

export const TenantBanner: React.FC<TenantBannerProps> = ({
  tenant,
  onSuspendToggle,
  onManageSubscriptions,
  onNavigateToTenants,
}) => {
  return (
    <div>
      {/* Breadcrumb line */}
      <div className="flex items-center gap-2 text-xs mb-1">
        <button
          onClick={onNavigateToTenants}
          className="text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
        >
          Tenants
        </button>
        <span className="text-slate-400">/</span>
        <span className="text-slate-500 font-medium">{tenant.name}</span>
      </div>

      {/* Title & Action Buttons Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {tenant.name}
        </h2>

        <div className="flex items-center gap-3">
          <button
            onClick={onSuspendToggle}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
          >
            {tenant.status === 'ACTIVE' ? 'Suspend Tenant' : 'Activate Tenant'}
          </button>

          <button
            onClick={onManageSubscriptions}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs cursor-pointer"
          >
            Manage Subscriptions
          </button>
        </div>
      </div>

      {/* Tenant Meta Profile Card */}
      <div className="mt-5 p-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Organization Avatar Letter */}
        <div className="w-14 h-14 rounded-xl bg-blue-50/80 text-blue-600 font-bold text-2xl flex items-center justify-center shrink-0 select-none">
          {tenant.name.charAt(0)}
        </div>

        {/* Organization Details */}
        <div className="min-w-0 flex-1">
          {/* Name & Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900">
              {tenant.name}
            </h3>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide border ${
                tenant.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {tenant.status}
            </span>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded tracking-wide bg-blue-50 text-blue-600 border border-blue-200">
              {tenant.plan}
            </span>
          </div>

          {/* Contact, Creation Date, Tenant ID */}
          <div className="mt-1.5 flex flex-wrap items-center gap-y-1 text-xs text-slate-500">
            <span>
              Contact:{' '}
              <a
                href={`mailto:${tenant.contactEmail}`}
                className="text-slate-600 hover:text-blue-600 hover:underline"
              >
                {tenant.contactEmail}
              </a>
            </span>
            <span className="mx-2 text-slate-300">•</span>
            <span>Created: {tenant.createdAt}</span>
            <span className="mx-2 text-slate-300">•</span>
            <span>
              ID: <span className="font-mono text-slate-600">{tenant.id}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
