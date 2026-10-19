import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { DepartmentInfo, DepartmentMember, StorageAlert, StorageGrowthPoint } from '../types';

interface StorageOverviewViewProps {
  department: DepartmentInfo;
  members: DepartmentMember[];
  alerts: StorageAlert[];
  growthData: StorageGrowthPoint[];
  onOpenAdjustModal: () => void;
  onEditMemberQuota: (member: DepartmentMember) => void;
  searchFilter?: string;
}

export const StorageOverviewView: React.FC<StorageOverviewViewProps> = ({
  department,
  members,
  alerts,
  growthData,
  onOpenAdjustModal,
  onEditMemberQuota,
  searchFilter = '',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<StorageGrowthPoint | null>(null);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.subTeam.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const usagePercent = Math.round((department.usedSpaceGB / department.totalAllocatedGB) * 100);
  const availableGB = department.totalAllocatedGB - department.usedSpaceGB;

  // SVG Chart math
  const chartHeight = 160;
  const chartWidth = 560;
  const paddingX = 40;
  const paddingY = 25;
  const minGB = 180;
  const maxGB = 360;

  const points = growthData.map((pt, i) => {
    const x = paddingX + (i / (growthData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((pt.usedGB - minGB) / (maxGB - minGB)) * (chartHeight - paddingY * 2);
    return { ...pt, x, y };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (pt.x - prev.x) / 2;
    const cpY2 = pt.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  // Donut chart math
  const donutRadius = 52;
  const circumference = 2 * Math.PI * donutRadius;
  const strokeDashoffset = circumference - (circumference * usagePercent) / 100;

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Global Storage Overview
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý dung lượng phòng ban, trần phân bổ & ngưỡng cảnh báo · Phòng {department.name}
          </p>
        </div>

        <button
          onClick={onOpenAdjustModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Adjust Quotas</span>
        </button>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Allocated */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Total Allocated
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {department.totalAllocatedGB} GB
            </span>
            <span className="text-base text-slate-400 font-semibold tabular-nums">
              / {department.tenantPoolLimitGB} GB
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Subscription Plan limit · Department Pool
          </div>
        </div>

        {/* Card 2: Used Space */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Used Space
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {department.usedSpaceGB} GB
            </span>
          </div>
          <div className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
            <span>{((department.usedSpaceGB / department.totalAllocatedGB) * 100).toFixed(1)}% usage rate</span>
          </div>
        </div>

        {/* Card 3: Available Space */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Available Space
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {availableGB} GB
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Dung lượng dự phòng còn lại
          </div>
        </div>
      </div>

      {/* Middle Row: Line Chart + Overall Disk Capacity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Growth Chart, 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">
              Global Storage Growth (6 Months)
            </h3>
            <span className="text-xs font-semibold text-blue-600">
              +{department.growthDeltaSinceAprGB} GB added since Apr
            </span>
          </div>

          {/* SVG Line Chart */}
          <div className="relative mt-6">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 overflow-visible"
            >
              <defs>
                <linearGradient id="growthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Light horizontal grid lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#f1f5f9" strokeWidth="1" />
              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="#f1f5f9" strokeWidth="1" />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#e2e8f0" strokeWidth="1" />

              {/* Area fill */}
              <path d={areaD} fill="url(#growthAreaGradient)" />

              {/* Main curve line */}
              <path
                d={pathD}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {points.map((pt, idx) => {
                const isLatest = idx === points.length - 1;
                return (
                  <g
                    key={pt.month}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isLatest ? 4 : 3}
                      className={isLatest ? 'fill-blue-600 stroke-white stroke-2' : 'fill-blue-500 opacity-60 group-hover:opacity-100 group-hover:r-4 transition-all'}
                    />
                    {isLatest && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={7}
                        className="stroke-blue-400/40 fill-none stroke-2 animate-ping"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between px-10 text-xs text-slate-400 font-medium mt-2">
              {growthData.map((d) => (
                <span key={d.month} className="tabular-nums">
                  {d.month}
                </span>
              ))}
            </div>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute z-10 -top-8 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-md shadow-lg pointer-events-none transform -translate-x-1/2 flex items-center gap-1.5"
                style={{
                  left: `${((hoveredPoint as any).x / chartWidth) * 100}%`,
                }}
              >
                <span>{hoveredPoint.month}:</span>
                <strong className="text-blue-300 font-bold">{hoveredPoint.usedGB} GB</strong>
                <span className="text-slate-400">({Math.round((hoveredPoint.usedGB / department.totalAllocatedGB) * 100)}%)</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tốc độ tăng trưởng trung bình: ~11 GB / tháng</span>
            <span className="text-slate-400">Dự báo chạm trần: Tháng 12/2026</span>
          </div>
        </div>

        {/* Right Column (Disk Capacity + Storage Alerts, 5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card: Overall Disk Capacity */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h3 className="font-bold text-slate-900 text-sm">
              Overall Disk Capacity
            </h3>

            <div className="mt-4 flex flex-col items-center">
              {/* Donut Chart */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={donutRadius}
                    className="stroke-slate-100"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={donutRadius}
                    className="stroke-blue-600 transition-all duration-700 ease-out"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    {usagePercent}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 -mt-0.5">
                    Used
                  </span>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="w-full mt-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 shrink-0"></span>
                    <span className="text-slate-600 font-medium">Files / Document Storage</span>
                  </div>
                  <span className="font-bold text-slate-800 tabular-nums font-mono">
                    {department.filesStorageGB} GB
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 shrink-0"></span>
                    <span className="text-slate-600 font-medium">System Backups</span>
                  </div>
                  <span className="font-bold text-slate-800 tabular-nums font-mono">
                    {department.backupsStorageGB} GB
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0"></span>
                    <span className="text-slate-600 font-medium">Code Builds & Artifacts</span>
                  </div>
                  <span className="font-bold text-slate-800 tabular-nums font-mono">
                    {department.otherStorageGB} GB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Storage Alerts & Warnings */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h3 className="font-bold text-slate-900 text-sm">
              Storage Alerts & Warnings
            </h3>

            <div className="mt-3.5 space-y-2.5">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg p-3 text-xs flex items-center justify-between border ${
                    alert.type === 'danger'
                      ? 'bg-rose-50 border-rose-100 text-rose-800'
                      : alert.type === 'warning'
                      ? 'bg-amber-50 border-amber-100 text-amber-900'
                      : 'bg-blue-50 border-blue-100 text-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        alert.type === 'danger'
                          ? 'bg-rose-500'
                          : alert.type === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    ></span>
                    <span className="font-medium">{alert.message}</span>
                  </div>
                  {alert.targetId ? (
                    <button
                      onClick={() => {
                        const mem = members.find((m) => m.id === alert.targetId);
                        if (mem) onEditMemberQuota(mem);
                      }}
                      className="text-[11px] font-semibold underline shrink-0 ml-2 hover:opacity-80"
                    >
                      Xem
                    </button>
                  ) : (
                    <button
                      onClick={onOpenAdjustModal}
                      className="text-[11px] font-semibold underline shrink-0 ml-2 hover:opacity-80"
                    >
                      Tăng trần
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Storage Allocation by Department / Member */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Storage Allocation by Staff Member
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân bổ hạn mức lưu trữ chi tiết cho từng thành viên và sub-team trong phòng ban
            </p>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị <strong className="text-slate-800">{filteredMembers.length}</strong> đối tượng
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-4 text-center w-14 font-semibold">STT</th>
                <th className="py-3.5 px-6">Staff Member</th>
                <th className="py-3.5 px-6">Allocated Quota</th>
                <th className="py-3.5 px-6">Used Space</th>
                <th className="py-3.5 px-6">Available Space</th>
                <th className="py-3.5 px-6 w-80">Usage Bar</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMembers.map((member, index) => {
                const percent = Math.round((member.usedSpaceGB / member.allocatedQuotaGB) * 100);
                const isOverLimit = percent >= 90;
                const available = Math.max(0, member.allocatedQuotaGB - member.usedSpaceGB);

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* STT */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500 font-medium text-xs">
                      {index + 1}
                    </td>

                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-full ${member.avatarColor} text-white font-bold text-[10px] flex items-center justify-center shrink-0`}
                        >
                          {member.avatarInitials}
                        </div>
                        <div>
                          <button
                            onClick={() => onEditMemberQuota(member)}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left cursor-pointer inline-flex items-center gap-1"
                            title="Bấm để điều chỉnh hạn mức nhân viên"
                          >
                            <span>{member.name}</span>
                          </button>
                          <div className="text-[11px] text-slate-400">
                            {member.role} · {member.subTeam}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-6 font-semibold text-slate-700 tabular-nums font-mono">
                      {member.allocatedQuotaGB} GB
                    </td>

                    <td className="py-3.5 px-6 font-semibold text-slate-800 tabular-nums font-mono">
                      {member.usedSpaceGB} GB
                    </td>

                    <td className="py-3.5 px-6 text-slate-600 tabular-nums font-mono">
                      {available} GB
                    </td>

                    <td className="py-3.5 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-600">
                            {member.usedSpaceGB} GB / {member.allocatedQuotaGB} GB
                          </span>
                          <span
                            className={`font-bold tabular-nums ${
                              isOverLimit ? 'text-rose-600' : 'text-blue-600'
                            }`}
                          >
                            {percent}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOverLimit ? 'bg-rose-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => onEditMemberQuota(member)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer hover:underline"
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
