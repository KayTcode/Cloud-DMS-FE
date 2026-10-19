import React, { useState } from 'react';
import {
  HardDrive,
  Building2,
  Users,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  UserPlus,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { TenantInfo } from '../types';

interface SysadminDashboardViewProps {
  tenant: TenantInfo;
  onNavigateToTenant: () => void;
  onCreateDepartmentUser: (deptName?: string) => void;
}

export const SysadminDashboardView: React.FC<SysadminDashboardViewProps> = ({
  tenant,
  onNavigateToTenant,
  onCreateDepartmentUser,
}) => {
  const [unit, setUnit] = useState<'GB' | 'TB'>('GB');

  // Total Organization Storage metrics
  const totalAllocatedGB = tenant.diskAllocatedTB * 1024; // 5,120 GB
  const totalUsedGB = tenant.diskUsedTB * 1024; // 2,457.6 GB
  const freeGB = totalAllocatedGB - totalUsedGB; // 2,662.4 GB
  const clusterUsagePercent = Math.round((totalUsedGB / totalAllocatedGB) * 100); // 48%

  // Department top storage usage cards (Replacing the 3 cloud hardware cards)
  const topDepartmentCards = [
    {
      name: 'Engineering & R&D',
      shortName: 'Engineering',
      category: 'Kỹ thuật & R&D',
      usedGB: 980.0,
      totalGB: 1800.0,
      percent: 54,
      lead: 'Elena Rostova',
      members: 420,
      filesCount: '112,400 files',
      growth: '+2.4 GB/ngày',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      barColor: 'bg-blue-600',
    },
    {
      name: 'Legal & Compliance',
      shortName: 'Legal',
      category: 'Pháp chế & Bảo mật',
      usedGB: 520.0,
      totalGB: 850.0,
      percent: 61,
      lead: 'Marcus Vance',
      members: 68,
      filesCount: '46,800 files',
      growth: '+1.1 GB/ngày',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      barColor: 'bg-indigo-600',
    },
    {
      name: 'Global Operations & Finance',
      shortName: 'Operations',
      category: 'Vận hành & Tài chính',
      usedGB: 750.0,
      totalGB: 1300.0,
      percent: 58,
      lead: 'Carlos Mendez & David Zhao',
      members: 370,
      filesCount: '58,200 files',
      growth: '+0.9 GB/ngày',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      barColor: 'bg-cyan-600',
    },
  ];

  // Full departments breakdown table (Replacing Tenants table)
  const departmentRows = [
    {
      id: 'dept-1',
      name: 'Engineering & R&D',
      lead: 'Elena Rostova',
      members: 420,
      usedGB: 980.0,
      quotaGB: 1800.0,
      percent: 54,
      growth: '+2.4 GB/ngày',
      status: 'Ổn định',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-blue-600',
    },
    {
      id: 'dept-2',
      name: 'Legal & Compliance',
      lead: 'Marcus Vance',
      members: 68,
      usedGB: 520.0,
      quotaGB: 850.0,
      percent: 61,
      growth: '+1.1 GB/ngày',
      status: 'Ổn định',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-indigo-600',
    },
    {
      id: 'dept-3',
      name: 'Global Operations',
      lead: 'Carlos Mendez',
      members: 260,
      usedGB: 410.0,
      quotaGB: 700.0,
      percent: 58,
      growth: '+0.5 GB/ngày',
      status: 'Ổn định',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-cyan-600',
    },
    {
      id: 'dept-4',
      name: 'Corporate Finance',
      lead: 'David Zhao',
      members: 110,
      usedGB: 340.0,
      quotaGB: 600.0,
      percent: 56,
      growth: '+0.4 GB/ngày',
      status: 'Ổn định',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-blue-600',
    },
    {
      id: 'dept-5',
      name: 'Human Resources (HR)',
      lead: 'Patricia Hayes',
      members: 142,
      usedGB: 207.6,
      quotaGB: 450.0,
      percent: 46,
      growth: '+0.2 GB/ngày',
      status: 'Khả dụng cao',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-emerald-600',
    },
    {
      id: 'dept-6',
      name: 'Product & Design',
      lead: 'Sophie Martin',
      members: 95,
      usedGB: 198.4,
      quotaGB: 380.0,
      percent: 52,
      growth: '+0.6 GB/ngày',
      status: 'Ổn định',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-purple-600',
    },
    {
      id: 'dept-7',
      name: 'Customer Success & Support',
      lead: 'Robert King',
      members: 105,
      usedGB: 120.0,
      quotaGB: 340.0,
      percent: 35,
      growth: '+0.3 GB/ngày',
      status: 'Khả dụng cao',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-teal-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Bảng điều khiển lưu trữ phòng ban (Department Storage Dashboard)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thống kê dung lượng GB đã dùng và phân bổ hạn ngạch lưu trữ theo từng phòng ban của {tenant.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Unit Toggle */}
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 shadow-2xs">
            <button
              onClick={() => setUnit('GB')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                unit === 'GB' ? 'bg-blue-600 text-white font-bold' : 'hover:text-slate-900'
              }`}
            >
              Xem số liệu GB
            </button>
            <button
              onClick={() => setUnit('TB')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                unit === 'TB' ? 'bg-blue-600 text-white font-bold' : 'hover:text-slate-900'
              }`}
            >
              Xem số liệu TB
            </button>
          </div>

          <button
            onClick={onNavigateToTenant}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <span>Vào hồ sơ {tenant.name}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hero Storage Pool Statistics Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Trạng thái lưu trữ: Bình thường (Optimal)
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Tổng kho lưu trữ các phòng ban (Organization Storage Pool)
              </h3>
              <p className="text-xs text-slate-500">
                Tổng dung lượng thực tế đang được {tenant.departmentsCount} phòng ban sử dụng trên hạn mức 5.0 TB.
              </p>
            </div>

            {/* Global big metrics */}
            <div className="flex items-center gap-6">
              <div className="text-left sm:text-right">
                <div className="text-xs text-slate-400 font-medium">Tổng hạn mức cấp phát</div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                  {unit === 'GB'
                    ? `${totalAllocatedGB.toLocaleString()} GB`
                    : `${tenant.diskAllocatedTB.toFixed(1)} TB`}
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200 hidden sm:block" />

              <div className="text-left sm:text-right">
                <div className="text-xs text-blue-600 font-semibold">Các phòng ban đã dùng</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 tabular-nums">
                  {unit === 'GB'
                    ? `${totalUsedGB.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} GB`
                    : `${tenant.diskUsedTB.toFixed(2)} TB`}
                </div>
              </div>
            </div>
          </div>

          {/* Master Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Tỷ lệ sử dụng toàn cơ quan: <strong className="text-slate-900">{clusterUsagePercent}%</strong>
              </span>
              <span className="text-emerald-600 font-semibold">
                Còn trống {unit === 'GB' ? `${freeGB.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} GB` : `${(freeGB / 1024).toFixed(2)} TB`} ({(100 - clusterUsagePercent)}%)
              </span>
            </div>

            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${clusterUsagePercent}%` }}
              />
            </div>
          </div>

          {/* 3 Department Storage Cards (Directly addressing the user's uploaded image) */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-slate-800">
                Dung lượng các phòng ban trọng điểm đã dùng
              </span>
              <span className="text-slate-400">
                Top 3 khối phòng ban có khối lượng dữ liệu lớn nhất
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topDepartmentCards.map((dept, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-blue-200 transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Department Name & Category Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm truncate" title={dept.name}>
                          {dept.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {dept.members} nhân sự • {dept.lead}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 bg-slate-50 text-slate-600 border-slate-200">
                        {dept.category}
                      </span>
                    </div>

                    {/* Big Numbers: Used / Total */}
                    <div className="mt-3.5 flex items-baseline justify-between">
                      <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                        {unit === 'GB'
                          ? `${dept.usedGB.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} GB`
                          : `${(dept.usedGB / 1024).toFixed(2)} TB`}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        / {unit === 'GB'
                          ? `${dept.totalGB.toLocaleString()} GB`
                          : `${(dept.totalGB / 1024).toFixed(1)} TB`}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden border border-slate-100">
                      <div
                        className={`${dept.barColor} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${dept.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Footer: Metadata & % used */}
                  <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">{dept.filesCount}</span>
                    <span className="font-bold text-blue-600 shrink-0">
                      {dept.percent}% used
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Full Department Storage Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                Phân bổ dung lượng theo từng Phòng ban (Department Allocation)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                {departmentRows.length} Phòng ban
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi định mức tiêu thụ bộ nhớ GB, hạn ngạch (quota) được cấp, số lượng tài khoản nhân sự và mức độ sử dụng theo từng phòng ban.
            </p>
          </div>

          <button
            onClick={() => onCreateDepartmentUser()}
            className="text-xs font-semibold px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5 shadow-2xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tạo tài khoản Department</span>
          </button>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Phòng ban (Department)</th>
                <th className="py-2.5 px-3">Trưởng bộ phận & Nhân sự</th>
                <th className="py-2.5 px-3">Đã sử dụng ({unit})</th>
                <th className="py-2.5 px-3">Hạn ngạch Quota ({unit})</th>
                <th className="py-2.5 px-3">Thanh tiến độ</th>
                <th className="py-2.5 px-3">Tốc độ tăng</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentRows.map((dept) => {
                const freeDeptGB = dept.quotaGB - dept.usedGB;

                return (
                  <tr
                    key={dept.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Department name */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{dept.name}</span>
                      </div>
                    </td>

                    {/* Lead & Member count */}
                    <td className="py-3.5 px-3">
                      <div className="text-slate-700 font-medium">{dept.lead}</div>
                      <div className="text-[11px] text-slate-400">{dept.members} nhân sự</div>
                    </td>

                    {/* Used amount */}
                    <td className="py-3.5 px-3 font-bold text-slate-900 tabular-nums">
                      {unit === 'GB'
                        ? `${dept.usedGB.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} GB`
                        : `${(dept.usedGB / 1024).toFixed(2)} TB`}
                    </td>

                    {/* Quota limit */}
                    <td className="py-3.5 px-3 text-slate-500 tabular-nums font-medium">
                      {unit === 'GB'
                        ? `${dept.quotaGB.toLocaleString()} GB`
                        : `${(dept.quotaGB / 1024).toFixed(1)} TB`}
                    </td>

                    {/* Progress Bar & Percent */}
                    <td className="py-3.5 px-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-100">
                          <div
                            className={`${dept.barColor} h-full rounded-full transition-all duration-300`}
                            style={{ width: `${dept.percent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 tabular-nums shrink-0">
                          {dept.percent}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Còn trống +{unit === 'GB' ? `${freeDeptGB.toFixed(1)} GB` : `${(freeDeptGB / 1024).toFixed(2)} TB`}
                      </div>
                    </td>

                    {/* Growth */}
                    <td className="py-3.5 px-3 text-slate-500 tabular-nums font-mono text-[11px]">
                      {dept.growth}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${dept.statusColor}`}
                      >
                        {dept.status}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => onCreateDepartmentUser(dept.name)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 border border-transparent hover:border-blue-200"
                        title={`Tạo tài khoản cho ${dept.name}`}
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Thêm User</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
