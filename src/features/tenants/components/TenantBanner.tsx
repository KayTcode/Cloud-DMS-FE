import React from 'react';
import { ShieldAlert, UserPlus, Building2 } from 'lucide-react';
import { TenantInfo } from '@/features/tenants/types';

interface TenantBannerProps {
  tenant: TenantInfo;
  onSuspendToggle?: () => void;
  onManageSubscriptions?: () => void;
  onNavigateToTenants?: () => void;
  onAssignNewAdmin?: () => void;
}

export const TenantBanner: React.FC<TenantBannerProps> = ({
  tenant,
  onNavigateToTenants,
  onAssignNewAdmin,
}) => {
  const isActive = tenant.status === 'ACTIVE';

  return (
    <div className="space-y-3">
      {/* 1. COMPACT SURFACE HEADER (GOOGLE WORKSPACE STYLE) */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        {/* Left: Identity & Badges */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center shrink-0 border border-blue-100">
            {tenant.name ? tenant.name.charAt(0).toUpperCase() : <Building2 className="w-5 h-5" />}
          </div>

          <div className="min-w-0">
            {/* Breadcrumb line */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <button
                onClick={onNavigateToTenants}
                className="hover:text-blue-600 transition-colors font-medium cursor-pointer"
              >
                Doanh nghiệp
              </button>
              <span>/</span>
              <span className="text-slate-600 font-medium truncate">{tenant.name || 'Hồ sơ'}</span>
            </div>

            {/* Title & Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                {tenant.name}
              </h2>

              <span
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    : 'bg-amber-50 text-amber-700 border-amber-200/60'
                }`}
              >
                {isActive ? 'Đang hoạt động' : 'Tạm dừng'}
              </span>

              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Gói {tenant.plan || 'Doanh nghiệp'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BANNER TIẾP QUẢN LÂM THỜI (KHI KHUYẾT ADMIN) */}
      {tenant.isInterimManaged && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Chế độ tiếp quản lâm thời bởi System Admin
              </div>
              <div className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                Doanh nghiệp đang khuyết Quản trị viên Tenant. Toàn bộ quyền điều phối Phòng ban và Quota đang được System Admin tiếp quản trực tiếp.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => (onAssignNewAdmin ? onAssignNewAdmin() : undefined)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Bổ nhiệm Quản trị viên mới</span>
          </button>
        </div>
      )}
    </div>
  );
};
