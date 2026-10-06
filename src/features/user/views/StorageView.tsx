import React from 'react';
import { Plus } from 'lucide-react';
import { DepartmentQuota } from '../types';

interface StorageViewProps {
  departmentQuotas: DepartmentQuota[];
  onOpenAdjustQuotas: () => void;
  onEditQuota: (quota: DepartmentQuota) => void;
}

export const StorageView: React.FC<StorageViewProps> = ({
  departmentQuotas,
  onOpenAdjustQuotas,
  onEditQuota,
}) => {
  const totalAllocatedGB = 1024; // 1.0 TB
  const usedSpaceGB = departmentQuotas.reduce((acc, curr) => acc + curr.usedSpaceGB, 0);
  const availableSpaceGB = totalAllocatedGB - usedSpaceGB;
  const usageRate = ((usedSpaceGB / totalAllocatedGB) * 100).toFixed(1);

  const alerts = departmentQuotas
    .filter((d) => d.usagePercent >= 80)
    .sort((a, b) => b.usagePercent - a.usagePercent);

  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Adjust Quotas Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Global Storage Overview</h2>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi dung lượng lưu trữ, phân bổ quota phòng ban và hạn mức cảnh báo
          </p>
        </div>
        <button
          onClick={onOpenAdjustQuotas}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Adjust Quotas</span>
        </button>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Allocated</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
            1.0 TB / 1,024 GB
          </p>
          <p className="text-xs text-slate-400 mt-2">Subscription Plan limit</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Used Space</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {usedSpaceGB} GB
          </p>
          <p className="text-xs font-semibold text-emerald-600 mt-2">
            {usageRate}% usage rate
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available Space</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {availableSpaceGB} GB
          </p>
          <p className="text-xs text-slate-400 mt-2">Remaining before freeze</p>
        </div>
      </div>

      {/* Middle Grid: Growth Chart & Capacity/Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Storage Growth */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Global Storage Growth (6 Months)</h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              +240 GB added since Apr
            </span>
          </div>

          <div className="h-52 w-full pt-4 relative flex flex-col justify-end">
            <svg className="w-full h-40 overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="growthGradientUser" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="20" x2="500" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" />

              <path
                d="M 10 95 C 100 85, 200 65, 300 50 C 400 35, 450 20, 480 15 L 480 110 L 10 110 Z"
                fill="url(#growthGradientUser)"
              />

              <path
                d="M 10 95 C 100 85, 200 65, 300 50 C 400 35, 450 20, 480 15"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.75"
                strokeLinecap="round"
              />

              <circle cx="480" cy="15" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            </svg>

            <div className="flex justify-between text-xs text-slate-400 mt-2 px-2">
              {months.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Disk Capacity & Alerts */}
        <div className="space-y-6">
          {/* Overall Disk Capacity */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Overall Disk Capacity</h3>
            
            <div className="flex flex-col items-center justify-center my-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#2563eb"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - 0.83)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-slate-900 leading-tight">83%</span>
                  <span className="text-[11px] text-slate-500 font-medium">Used</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Files / Document Storage</span>
                </div>
                <span className="font-bold text-slate-800">792 GB</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span>System Backups</span>
                </div>
                <span className="font-bold text-slate-800">58 GB</span>
              </div>
            </div>
          </div>

          {/* Storage Alerts & Warnings */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Storage Alerts & Warnings</h3>
            
            <div className="space-y-2.5">
              {alerts.map((alert) => {
                const isCrit = alert.usagePercent >= 90;
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg flex items-center gap-2.5 text-xs font-medium ${
                      isCrit
                        ? 'bg-red-50 text-red-700 border border-red-200/60'
                        : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isCrit ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="flex-1">
                      {isCrit
                        ? `${alert.departmentName} quota near limit (${alert.usagePercent}% of ${alert.allocatedQuotaGB}GB)`
                        : `${alert.departmentName} storage hit warning threshold (${alert.usagePercent}% of ${alert.allocatedQuotaGB}GB)`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Storage Allocation by Department Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Storage Allocation by Department</h3>
          <span className="text-xs text-slate-400">{departmentQuotas.length} phòng ban đang hoạt động</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[11px] bg-slate-50/50">
                <th className="py-3.5 px-4 text-center w-14 font-semibold">STT</th>
                <th className="py-3.5 px-6">Department Name</th>
                <th className="py-3.5 px-6">Allocated Quota</th>
                <th className="py-3.5 px-6">Used Space</th>
                <th className="py-3.5 px-6">Available Space</th>
                <th className="py-3.5 px-6 w-72">Usage Bar</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentQuotas.map((dept, index) => {
                const isOver90 = dept.usagePercent >= 90;
                return (
                  <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* STT */}
                    <td className="py-4 px-4 text-center font-mono text-slate-500 font-medium text-xs">
                      {index + 1}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onEditQuota(dept)}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left cursor-pointer inline-flex items-center gap-1"
                        title="Bấm để xem và chỉnh sửa hạn mức phòng ban"
                      >
                        <span>{dept.departmentName}</span>
                      </button>
                    </td>
                    <td className="py-4 px-6 text-slate-600">{dept.allocatedQuotaGB} GB</td>
                    <td className="py-4 px-6 text-slate-600">{dept.usedSpaceGB} GB</td>
                    <td className="py-4 px-6 text-slate-600">{dept.availableSpaceGB} GB</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-[11px] mb-1 text-slate-500">
                            <span>{dept.usedSpaceGB} GB / {dept.allocatedQuotaGB} GB</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver90 ? 'bg-red-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(dept.usagePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={`font-bold text-xs shrink-0 ${
                            isOver90 ? 'text-red-500' : 'text-blue-600'
                          }`}
                        >
                          {dept.usagePercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => onEditQuota(dept)}
                        className="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors text-xs cursor-pointer"
                      >
                        Edit Quota
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
