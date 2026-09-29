import React from 'react';
import { SystemTenant } from '../types';

interface RecentTenantsCardProps {
  tenants: SystemTenant[];
  onViewAllTenants: () => void;
  onSelectTenant?: (tenant: SystemTenant) => void;
}

export const RecentTenantsCard: React.FC<RecentTenantsCardProps> = ({
  tenants,
  onViewAllTenants,
  onSelectTenant,
}) => {
  // Show first 5 tenants matching the dashboard overview
  const displayTenants = tenants.slice(0, 5);

  return (
    <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          Recent Tenant Administrations
        </h3>
        <button
          onClick={onViewAllTenants}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          View all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500">
              <th className="pb-3 pr-4 font-semibold">Tenant Name</th>
              <th className="pb-3 px-4 font-semibold">Plan</th>
              <th className="pb-3 px-4 font-semibold">Users</th>
              <th className="pb-3 px-4 font-semibold">Storage Used</th>
              <th className="pb-3 pl-4 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {displayTenants.map((t) => (
              <tr
                key={t.id}
                onClick={() => onSelectTenant && onSelectTenant(t)}
                className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 pr-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {t.name}
                </td>
                <td className="py-3.5 px-4 text-slate-600 font-normal">
                  {t.plan}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">
                  {t.usersAssigned.toLocaleString()}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">
                  {t.storageUsed}
                </td>
                <td className="py-3.5 pl-4 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                      t.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-rose-50 text-rose-500 border border-rose-100'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
