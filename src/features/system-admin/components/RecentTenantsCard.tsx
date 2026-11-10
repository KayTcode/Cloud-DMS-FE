import React from 'react';
import { Building2, ArrowUpRight } from 'lucide-react';
import { SystemTenant } from '../types';

interface RecentTenantsCardProps {
  tenants: SystemTenant[];
  onViewAllTenants: () => void;
  onSelectTenant?: (tenant: SystemTenant) => void;
}

const parseStorageUsagePercent = (tenant: SystemTenant): number => {
  if (typeof tenant.usagePercentage === 'number') {
    return tenant.usagePercentage;
  }
  try {
    const parseUnit = (str?: string): number => {
      if (!str) return 0;
      const parts = str.trim().split(/\s+/);
      const val = parseFloat(parts[0]);
      if (isNaN(val)) return 0;
      const unit = (parts[1] || 'GB').toUpperCase();
      if (unit.startsWith('T')) return val * 1024;
      if (unit.startsWith('M')) return val / 1024;
      return val;
    };
    const used = parseUnit(tenant.storageUsed);
    const alloc = parseUnit(tenant.storageAllocated);
    if (alloc > 0) {
      return Math.min(100, Math.round((used / alloc) * 100));
    }
  } catch {
    // Fallback
  }
  return 0;
};

export const RecentTenantsCard: React.FC<RecentTenantsCardProps> = ({
  tenants,
  onViewAllTenants,
  onSelectTenant,
}) => {
  // Show first 5 tenants matching the dashboard overview
  const displayTenants = tenants.slice(0, 5);

  return (
    <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-blue-50 text-blue-600">
            <Building2 className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Doanh nghiệp mới nhất
            </h3>
            <p className="text-xs text-slate-400">
              Danh sách các tổ chức đăng ký và hạn mức Quota đã cấp phát
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllTenants}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
        >
          <span>Xem tất cả</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500">
              <th className="pb-3 px-3 text-center w-10 font-semibold">#</th>
              <th className="pb-3 px-3 font-semibold">Mã DN</th>
              <th className="pb-3 pr-4 font-semibold">Tên Doanh nghiệp</th>
              <th className="pb-3 px-4 font-semibold">Kho lưu trữ</th>
              <th className="pb-3 px-4 font-semibold min-w-[170px]">Hạn mức Quota & Sử dụng</th>
              <th className="pb-3 pl-4 font-semibold text-right">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {displayTenants.map((t, index) => {
              const usagePct = parseStorageUsagePercent(t);
              const isHighUsage = usagePct >= 80;

              return (
                <tr
                  key={t.id}
                  onClick={() => onSelectTenant && onSelectTenant(t)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs">
                    {index + 1}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                      {t.tenantCode || `DN-${index + 1}`}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors block">
                      {t.name}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {t.adminEmail || `${t.usersAssigned || 1} tài khoản`}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-600 font-medium text-xs">
                      {t.storageProviderName || t.region || 'Cloud Storage Pool'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-700 font-semibold">
                          {t.storageUsed || '0 B'}
                        </span>
                        <span className="text-slate-400">
                          / {t.storageAllocated || '10 GB'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, usagePct)}%` }}
                          className={`h-full rounded-full transition-all ${
                            isHighUsage ? 'bg-rose-500' : 'bg-blue-600'
                          }`}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                        t.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                      }`}
                    >
                      {t.status === 'Active' ? 'Hoạt động' : 'Tạm khóa'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
