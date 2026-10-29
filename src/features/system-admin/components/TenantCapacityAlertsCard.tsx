import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, ArrowRight, Activity, CloudCheck } from 'lucide-react';
import { SystemTenant, StorageProviderItem } from '../types';

interface TenantCapacityAlertsCardProps {
  tenants: SystemTenant[];
  providers?: StorageProviderItem[];
  onSelectTenant?: (tenant: SystemTenant) => void;
  onViewAllTenants?: () => void;
}

const parseStorageUsagePercent = (tenant: SystemTenant): number => {
  if (typeof tenant.usagePercentage === 'number') {
    return tenant.usagePercentage;
  }
  // Thử tính từ chuỗi "2.4 TB / 5 TB" hoặc storageUsed / storageAllocated
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

export const TenantCapacityAlertsCard: React.FC<TenantCapacityAlertsCardProps> = ({
  tenants = [],
  providers = [],
  onSelectTenant,
  onViewAllTenants,
}) => {
  // 1. Phân loại Tenant theo mức sử dụng Quota
  const tenantsWithUsage = tenants.map((t) => ({
    ...t,
    calculatedUsagePct: parseStorageUsagePercent(t),
  }));

  // Lọc các Tenant tiệm cận ngưỡng nguy hiểm (>= 80%)
  const highUsageTenants = tenantsWithUsage
    .filter((t) => t.calculatedUsagePct >= 80)
    .sort((a, b) => b.calculatedUsagePct - a.calculatedUsagePct);

  // 2. Tỷ lệ Trạng thái Doanh nghiệp
  const activeCount = tenants.filter((t) => t.status === 'Active').length;
  const suspendedCount = tenants.length - activeCount;
  const activePct = tenants.length > 0 ? Math.round((activeCount / tenants.length) * 100) : 100;

  // 3. Trạng thái Cloud Storage
  const connectedProviders = providers.filter((p) => p.status === 'Connected').length;
  const isAllConnected = providers.length > 0 && connectedProviders === providers.length;

  return (
    <div className="flex flex-col justify-between h-full p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-50 text-amber-600">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Sức khỏe Quota & Cảnh báo
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Real-time Guard
          </span>
        </div>

        {/* Section 1: Cảnh báo Doanh nghiệp chạm ngưỡng Quota */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Cảnh báo Ngưỡng Quota (≥80%)
            </span>
            {highUsageTenants.length > 0 && (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100">
                {highUsageTenants.length} Doanh nghiệp
              </span>
            )}
          </div>

          {highUsageTenants.length > 0 ? (
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {highUsageTenants.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {t.name}
                      </span>
                      {t.tenantCode && (
                        <span className="text-[10px] font-mono px-1 py-0.2 bg-white text-slate-600 rounded border border-slate-200">
                          {t.tenantCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>Đã dùng: <strong className="text-slate-800">{t.storageUsed}</strong> / {t.storageAllocated}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-rose-600 block">
                      {t.calculatedUsagePct}%
                    </span>
                    {onSelectTenant && (
                      <button
                        onClick={() => onSelectTenant(t)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <span>Nâng Quota</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-800 font-medium">
                Tất cả Doanh nghiệp đều đang nằm trong ngưỡng dung lượng an toàn (&lt;80%).
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Tỷ lệ Trạng thái Doanh nghiệp */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
            <span>Trạng thái Doanh nghiệp ({tenants.length})</span>
            <span className="font-mono text-slate-700">
              <strong className="text-emerald-600">{activeCount} Hoạt động</strong>
              {suspendedCount > 0 && (
                <span className="text-rose-500 ml-1.5">• {suspendedCount} Tạm khóa</span>
              )}
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${activePct}%` }}
              className="h-full bg-emerald-500"
              title={`Hoạt động: ${activeCount}`}
            />
            <div
              style={{ width: `${100 - activePct}%` }}
              className="h-full bg-rose-400"
              title={`Tạm ngưng: ${suspendedCount}`}
            />
          </div>
        </div>

        {/* Section 3: Tình trạng Đồng bộ Cloud Storage */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              Hạ tầng Lưu trữ Cloud
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                isAllConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAllConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isAllConnected ? 'Đồng bộ ổn định' : `${connectedProviders}/${providers.length} Sẵn sàng`}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mt-1">
            Google Drive API &amp; Microsoft Graph API OAuth 2.0 Token được kiểm soát tự động.
          </p>
        </div>
      </div>

      {/* Footer link to Tenants */}
      {onViewAllTenants && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-right">
          <button
            onClick={onViewAllTenants}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            <span>Xem danh sách Doanh nghiệp</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
