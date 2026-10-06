import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Sliders,
} from 'lucide-react';
import { DepartmentMember, DepartmentInfo } from '../types';

interface StaffManagementViewProps {
  members: DepartmentMember[];
  department: DepartmentInfo;
  onEditQuota: (member: DepartmentMember) => void;
  onAddMember: () => void;
  onToggleStatus: (memberId: string) => void;
  searchFilter: string;
  onSearchChange: (q: string) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  members,
  department,
  onEditQuota,
  onAddMember,
  onToggleStatus,
  searchFilter,
  onSearchChange,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const subTeams = Array.from(new Set(members.map((m) => m.subTeam)));

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.role.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesTeam = selectedTeam === 'all' || m.subTeam === selectedTeam;

    const percent = (m.usedSpaceGB / m.allocatedQuotaGB) * 100;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'warning' && percent >= 80) ||
      (selectedStatus === 'active' && m.status === 'active') ||
      (selectedStatus === 'paused' && m.status === 'paused');

    return matchesSearch && matchesTeam && matchesStatus;
  });

  const warningCount = members.filter(
    (m) => (m.usedSpaceGB / m.allocatedQuotaGB) * 100 >= 80
  ).length;

  const totalUsedSpace = members.reduce((acc, m) => acc + m.usedSpaceGB, 0);
  const totalAllocated = members.reduce((acc, m) => acc + m.allocatedQuotaGB, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý nhân viên phòng {department.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi phân quyền, kiểm soát dung lượng lưu trữ cá nhân và hồ sơ nhân sự
          </p>
        </div>

        <button
          onClick={onAddMember}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm nhân viên</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Tổng nhân sự
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {members.length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {members.filter((m) => m.status === 'active').length} đang hoạt động
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Tổng cấp phát nhân viên
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {totalAllocated} GB
            </span>
            <span className="text-xs text-slate-400 font-medium">/ {department.totalAllocatedGB} GB trần</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Đã tiêu thụ thực tế
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {totalUsedSpace} GB
            </span>
            <span className="text-xs text-blue-600 font-medium">
              ~{Math.round(totalUsedSpace / (members.length || 1))} GB / người
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Cảnh báo hạn mức
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tabular-nums ${
                warningCount > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {warningCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">nhân sự &gt; 80%</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, chức danh..."
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap">Nhóm:</span>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Tất cả nhóm ({members.length})</option>
            {subTeams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <span className="text-slate-500 font-medium whitespace-nowrap ml-2">Trạng thái:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Tất cả</option>
            <option value="warning">Cận hạn mức (&gt;80%)</option>
            <option value="active">Đang hoạt động</option>
            <option value="paused">Tạm dừng</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-4 text-center w-14 font-semibold">STT</th>
                <th className="py-3.5 px-6">Nhân viên</th>
                <th className="py-3.5 px-6">Chức vụ & Nhóm</th>
                <th className="py-3.5 px-6">Dung lượng / Hạn mức</th>
                <th className="py-3.5 px-6">Số tệp tin</th>
                <th className="py-3.5 px-6">Lần cuối hoạt động</th>
                <th className="py-3.5 px-6">Trạng thái</th>
                <th className="py-3.5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy nhân viên phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => {
                  const percent = Math.round(
                    (member.usedSpaceGB / member.allocatedQuotaGB) * 100
                  );
                  const isHigh = percent >= 90;
                  const isMedium = percent >= 80 && percent < 90;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500 font-medium text-xs">
                        {index + 1}
                      </td>

                      {/* Name & Email (Hyperlink) */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${member.avatarColor} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}
                          >
                            {member.avatarInitials}
                          </div>
                          <div>
                            <button
                              onClick={() => onEditQuota(member)}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left cursor-pointer inline-flex items-center gap-1"
                              title="Bấm để xem và điều chỉnh hạn mức nhân viên"
                            >
                              <span>{member.name}</span>
                            </button>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Team */}
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-800">
                          {member.role}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {member.subTeam}
                        </div>
                      </td>

                      {/* Quota Progress */}
                      <td className="py-3.5 px-6 min-w-[200px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-semibold text-slate-700">
                              {member.usedSpaceGB} GB / {member.allocatedQuotaGB} GB
                            </span>
                            <span
                              className={`font-bold tabular-nums ${
                                isHigh
                                  ? 'text-rose-600'
                                  : isMedium
                                  ? 'text-amber-600'
                                  : 'text-blue-600'
                              }`}
                            >
                              {percent}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isHigh
                                  ? 'bg-rose-500'
                                  : isMedium
                                  ? 'bg-amber-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* File Count */}
                      <td className="py-3.5 px-6 font-semibold text-slate-700 tabular-nums font-mono">
                        {member.fileCount.toLocaleString()} tệp
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-6 text-slate-500 text-[11px]">
                        {member.lastActive}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-6">
                        {member.status === 'paused' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Tạm ngưng
                          </span>
                        ) : isHigh ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Cận hạn mức
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEditQuota(member)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-100/80 rounded-md transition-colors cursor-pointer"
                          >
                            Hạn mức
                          </button>
                          <button
                            onClick={() => onToggleStatus(member.id)}
                            title={member.status === 'paused' ? 'Kích hoạt lại' : 'Tạm dừng đồng bộ'}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
