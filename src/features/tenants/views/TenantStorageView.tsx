import React, { useState } from 'react';
import {
  Building2,
  UserPlus,
} from 'lucide-react';
import { TenantInfo } from '@/features/tenants/types';
import { mockDepartments } from '@/data/tenantMockData';

interface TenantStorageViewProps {
  tenant: TenantInfo;
  onBackToOverview: () => void;
  onOpenExpandQuota?: () => void;
  onCreateDepartmentUser?: (deptName?: string) => void;
}

export const TenantStorageView: React.FC<TenantStorageViewProps> = ({
  tenant,
  onBackToOverview,
  onCreateDepartmentUser,
}) => {
  const [unit, setUnit] = useState<'GB' | 'TB'>('GB');

  // Departments storage breakdown
  const departmentUsage = [
    {
      name: 'Engineering & R&D',
      usedGB: 980,
      quotaGB: 1800,
      percent: 54,
      lead: 'Elena Rostova',
      members: 420,
      filesCount: '112,400 files',
      category: 'Kỹ thuật',
      color: 'bg-blue-600',
    },
    {
      name: 'Legal & Compliance',
      usedGB: 520,
      quotaGB: 850,
      percent: 61,
      lead: 'Marcus Vance',
      members: 68,
      filesCount: '46,800 files',
      category: 'Pháp chế',
      color: 'bg-indigo-600',
    },
    {
      name: 'Global Operations',
      usedGB: 410,
      quotaGB: 700,
      percent: 58,
      lead: 'Carlos Mendez',
      members: 260,
      filesCount: '34,200 files',
      category: 'Vận hành',
      color: 'bg-cyan-600',
    },
    {
      name: 'Corporate Finance',
      usedGB: 340,
      quotaGB: 600,
      percent: 56,
      lead: 'David Zhao',
      members: 110,
      filesCount: '24,000 files',
      category: 'Tài chính',
      color: 'bg-blue-600',
    },
    {
      name: 'Human Resources',
      usedGB: 207.6,
      quotaGB: 450,
      percent: 46,
      lead: 'Patricia Hayes',
      members: 142,
      filesCount: '22,724 files',
      category: 'Nhân sự',
      color: 'bg-emerald-600',
    },
  ];

  return (
    <div className="space-y-6 mt-5">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Quản lý kho lưu trữ phòng ban (Department Storage Pool)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Thống kê dung lượng Gigabyte (GB) đã dùng và phân bổ hạn ngạch lưu trữ cho từng phòng ban.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Unit Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setUnit('GB')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  unit === 'GB' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                GB
              </button>
              <button
                onClick={() => setUnit('TB')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  unit === 'TB' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                TB
              </button>
            </div>

            <button
              onClick={onBackToOverview}
              className="text-xs text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Về Overview
            </button>
          </div>
        </div>

        {/* 3 Department Highlight Cards */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-slate-800">
              Số lượng dung lượng các phòng ban đã dùng (Top Departments)
            </span>
            <span className="text-slate-400">
              Khối dữ liệu phân bổ theo đơn vị phòng ban
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {departmentUsage.slice(0, 3).map((dept, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-blue-200 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {dept.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {dept.members} nhân sự • Lead: {dept.lead}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200">
                      {dept.category}
                    </span>
                  </div>

                  <div className="mt-3.5 flex items-baseline justify-between">
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">
                      {unit === 'GB' ? `${dept.usedGB.toLocaleString()} GB` : `${(dept.usedGB / 1024).toFixed(2)} TB`}
                    </div>
                    <div className="text-xs text-slate-400">
                      / {unit === 'GB' ? `${dept.quotaGB.toLocaleString()} GB` : `${(dept.quotaGB / 1024).toFixed(1)} TB`}
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
                    <div className={`${dept.color} h-full rounded-full`} style={{ width: `${dept.percent}%` }} />
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{dept.filesCount}</span>
                  <span className="font-bold text-blue-600">{dept.percent}% used</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Storage Allocation Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Phân bổ dung lượng theo từng Phòng ban (Department Allocation)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi việc tiêu thụ dung lượng của từng bộ phận thuộc {tenant.name}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 hidden sm:block">
              Tổng cấp phát phòng ban:{' '}
              <strong className="text-slate-900 font-bold">
                {mockDepartments.reduce((acc, d) => acc + d.allocatedStorageGB, 0).toLocaleString()} GB
              </strong>
            </div>

            {onCreateDepartmentUser && (
              <button
                onClick={() => onCreateDepartmentUser()}
                className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tạo tài khoản Department</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Phòng ban (Department)</th>
                <th className="py-2.5 px-3">Trưởng bộ phận & Nhân sự</th>
                <th className="py-2.5 px-3">Đã dùng ({unit})</th>
                <th className="py-2.5 px-3">Hạn mức Quota ({unit})</th>
                <th className="py-2.5 px-3">Tiến độ tiêu thụ</th>
                <th className="py-2.5 px-3">Khả dụng</th>
                <th className="py-2.5 px-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentUsage.map((item, idx) => {
                const freeDeptGB = item.quotaGB - item.usedGB;

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-700 font-medium">{item.lead}</div>
                      <div className="text-[11px] text-slate-400">{item.members} nhân sự</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 tabular-nums">
                      {unit === 'GB'
                        ? `${item.usedGB.toLocaleString()} GB`
                        : `${(item.usedGB / 1024).toFixed(2)} TB`}
                    </td>
                    <td className="py-3 px-3 text-slate-500 tabular-nums font-medium">
                      {unit === 'GB'
                        ? `${item.quotaGB.toLocaleString()} GB`
                        : `${(item.quotaGB / 1024).toFixed(2)} TB`}
                    </td>
                    <td className="py-3 px-3 min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              item.percent > 75 ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                          {item.percent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums text-slate-600 font-mono text-[11px]">
                      +{unit === 'GB' ? `${freeDeptGB.toFixed(1)} GB` : `${(freeDeptGB / 1024).toFixed(2)} TB`}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {onCreateDepartmentUser && (
                        <button
                          onClick={() => onCreateDepartmentUser(item.name)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Thêm User</span>
                        </button>
                      )}
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
