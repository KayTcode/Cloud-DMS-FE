import React, { useState } from 'react';
import {
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import { TenantInfo } from '@/features/tenants/types';
import { useTenantContext } from '@/context/TenantContext';

interface StorageStatsCardProps {
  tenant: TenantInfo;
}

export const StorageStatsCard: React.FC<StorageStatsCardProps> = ({
  tenant,
}) => {
  const { departments } = useTenantContext();
  const [unit, setUnit] = useState<'GB' | 'TB'>('GB');

  // Real Quota from DB (storageQuotaBytes) with fallback to TB conversion
  const totalAllocatedGB = tenant.storageQuotaBytes
    ? Math.max(0.1, Number((tenant.storageQuotaBytes / (1024 ** 3)).toFixed(2)))
    : Math.max(0.1, Number((tenant.diskAllocatedTB * 1024).toFixed(2)));

  // Tính tổng Quota đã cấp cho các phòng ban thuộc Tenant
  const totalDeptsQuotaBytes = departments.reduce((acc, d) => {
    return acc + (d.storageQuotaBytes ?? ((d.allocatedStorageGB || 0) * (1024 ** 3)));
  }, 0);

  const realFilesUsedBytes = tenant.storageUsedBytes
    ?? (tenant.fileCategories
      ? (tenant.fileCategories.documentsBytes + tenant.fileCategories.mediaBytes + tenant.fileCategories.archivesBytes + tenant.fileCategories.othersBytes)
      : 0);

  // Dung lượng Tenant đã cấp / sử dụng: ưu tiên tổng dung lượng đã cấp cho các phòng ban
  const effectiveAllocatedBytes = (tenant.allocatedToDepartmentsBytes && tenant.allocatedToDepartmentsBytes > 0)
    ? tenant.allocatedToDepartmentsBytes
    : (totalDeptsQuotaBytes > 0 ? totalDeptsQuotaBytes : Math.max(realFilesUsedBytes, tenant.storageUsedBytes || 0));

  const totalUsedGB = Number((effectiveAllocatedBytes / (1024 ** 3)).toFixed(2));
  const freeGB = Math.max(0, Number((totalAllocatedGB - totalUsedGB).toFixed(2)));
  const percentUsed = totalAllocatedGB > 0 ? Math.min(100, Math.round((totalUsedGB / totalAllocatedGB) * 100)) : 0;
  const percentFree = Math.max(0, 100 - percentUsed);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Header Row: Title, Unit Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Kho lưu trữ tổng (Managed Storage Pool)
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {tenant.storageProviderName ? `Cloud: ${tenant.storageProviderName}` : 'Cloud Storage Pool'}
              </span>
            </div>
          </div>
        </div>

        {/* Unit Toggle Pill */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs font-semibold text-slate-600 self-start sm:self-auto">
          <button
            onClick={() => setUnit('GB')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              unit === 'GB'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            GB
          </button>
          <button
            onClick={() => setUnit('TB')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              unit === 'TB'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            TB
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards: 2 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
        {/* Card 1: Used Capacity */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-slate-50 border border-blue-100/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Dung lượng đã cấp</span>
            <span className="text-[10px] font-bold text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-100">
              {percentUsed}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {totalAllocatedGB > 0
                ? (unit === 'GB'
                    ? `${totalUsedGB.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} GB`
                    : `${(totalUsedGB / 1024).toFixed(3)} TB`)
                : '0 GB'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalAllocatedGB > 0
                ? `trên tổng ${unit === 'GB' ? `${totalAllocatedGB.toLocaleString()} GB` : `${(totalAllocatedGB / 1024).toFixed(2)} TB`}`
                : 'Chưa được cấp Quota Cloud'}
            </div>
          </div>
        </div>

        {/* Card 2: Free Available Capacity */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-100/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Dung lượng còn trống</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-100">
              {percentFree}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tabular-nums">
              {unit === 'GB'
                ? `${freeGB.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} GB`
                : `${(freeGB / 1024).toFixed(3)} TB`}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Khả dụng cấp phát
            </div>
          </div>
        </div>
      </div>

      {/* Quick Footer Action / Storage Node status */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-slate-700">Hệ thống lưu trữ hoạt động ổn định</span>
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="text-slate-500 font-mono text-[11px]">
            Cloud Provider: {tenant.storageProviderName || 'Default Local Storage'}
          </span>
        </div>
      </div>
    </div>
  );
};
