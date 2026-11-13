import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Sliders,
  Database,
  HardDrive,
  Users,
  ShieldAlert,
  UserX,
  FileText,
} from 'lucide-react';
import { DepartmentMember, DepartmentInfo } from '../types';
import { useDepartment } from '../context/DepartmentContext';
import { formatBytes } from '../utils/quotaUtils';
import { useToast } from '@/hooks/useToast';
import {
  PendingInvitationsTable,
  resendToastMessage,
  cancelToastMessage,
} from '@/features/invitations';

interface StaffManagementViewProps {
  members: DepartmentMember[];
  department: DepartmentInfo;
  onEditQuota: (member: DepartmentMember) => void;
  onAddMember: () => void;
  onToggleStatus: (memberId: string) => void;
  onOffboardMember?: (member: DepartmentMember) => void;
  searchFilter: string;
  onSearchChange: (q: string) => void;
  onBackToHub?: () => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  members,
  department,
  onEditQuota,
  onAddMember,
  onToggleStatus,
  onOffboardMember,
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

    const percent = m.allocatedQuotaGB > 0 ? (m.usedSpaceGB / m.allocatedQuotaGB) * 100 : 0;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'warning' && percent >= 80) ||
      (selectedStatus === 'active' && m.status === 'active') ||
      (selectedStatus === 'paused' && m.status === 'paused');

    return matchesSearch && matchesTeam && matchesStatus;
  });

  const warningCount = members.filter(
    (m) => m.allocatedQuotaGB > 0 && (m.usedSpaceGB / m.allocatedQuotaGB) * 100 >= 80
  ).length;

  const totalUsedSpace = members.reduce((acc, m) => acc + m.usedSpaceGB, 0);
  const totalAllocated = members.reduce((acc, m) => acc + m.allocatedQuotaGB, 0);
  const activeCount = members.filter((m) => m.status === 'active').length;

  const { summary, departmentId } = useDepartment();
  const { toast } = useToast();
  const quotaBytes = summary?.departmentQuotaBytes ?? (department.totalAllocatedGB * 1024 * 1024 * 1024);
  const allocatedPercent = quotaBytes > 0
    ? Math.min(100, Math.round(((totalAllocated * 1024 * 1024 * 1024) / quotaBytes) * 100))
    : 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. HÀNG 4 THẺ KPI CHỈ SỐ NHÂN SỰ CỐT LÕI (Chuẩn Google Drive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng nhân sự */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Tổng số nhân sự</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
            {members.length}
            <span className="text-sm font-normal text-slate-400 ml-1.5 font-sans">người</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Đang làm việc:</span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
              {activeCount} tài khoản hoạt động
            </span>
          </div>
        </div>

        {/* Card 2: Quota đã cấp cho nhân viên */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Đã cấp nhân viên</span>
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
            {totalAllocated}
            <span className="text-sm font-normal text-slate-400 ml-1 font-sans">/ {department.totalAllocatedGB} GB</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span>Tỷ lệ phân phối</span>
              <span className="font-bold text-slate-700 tabular-nums">{allocatedPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${allocatedPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Đã tiêu thụ thực tế */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Tiêu thụ thực tế</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
            {totalUsedSpace}
            <span className="text-sm font-normal text-slate-400 ml-1.5 font-sans">GB</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Bình quân nhân sự:</span>
            <span className="text-slate-700 font-semibold font-mono text-[10px]">
              ~{members.length > 0 ? (totalUsedSpace / members.length).toFixed(1) : 0} GB / người
            </span>
          </div>
        </div>

        {/* Card 4: Cảnh báo hạn mức */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Cảnh báo đầy kho</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${warningCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {warningCount}
            <span className="text-sm font-normal text-slate-400 ml-1.5 font-sans">nhân sự</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tình trạng dung lượng:</span>
            <span className={`font-semibold text-[10px] px-2 py-0.5 rounded-full ${
              warningCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {warningCount > 0 ? 'Cần nâng Quota' : 'Ổn định'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. THANH TÌM KIẾM, BỘ LỌC & THÊM MỚI (GOOGLE DRIVE STYLE) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Ô tìm kiếm viên thuốc */}
        <div className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên nhân viên, email, chức danh..."
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200/80 rounded-full text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Bộ lọc dropdown & Nút thêm nhân viên */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium whitespace-nowrap">Nhóm:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-full text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="all">Tất cả ({members.length})</option>
              {subTeams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium whitespace-nowrap">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-full text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="warning">Cận hạn mức (&gt;80%)</option>
              <option value="active">Đang hoạt động</option>
              <option value="paused">Tạm dừng</option>
            </select>
          </div>

          <button
            onClick={onAddMember}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0 ml-auto md:ml-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm nhân viên</span>
          </button>
        </div>
      </div>

      {/* 3. BẢNG DANH SÁCH NHÂN VIÊN PHÒNG BAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 text-center w-12 font-semibold">STT</th>
                <th className="py-3 px-4">Nhân viên</th>
                <th className="py-3 px-4">Chức danh & Nhóm</th>
                <th className="py-3 px-4 min-w-[200px]">Hạn mức Quota</th>
                <th className="py-3 px-4 text-center">Tệp tin</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy nhân viên phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => {
                  const percent = member.allocatedQuotaGB > 0
                    ? Math.round((member.usedSpaceGB / member.allocatedQuotaGB) * 100)
                    : 0;
                  const isHigh = percent >= 90;
                  const isMedium = percent >= 80 && percent < 90;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-medium">
                        {index + 1}
                      </td>

                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${member.avatarColor || 'bg-blue-600'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            {member.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => onEditQuota(member)}
                              className="font-bold text-slate-800 hover:text-blue-600 transition-colors text-left cursor-pointer truncate block"
                              title="Bấm để điều chỉnh hạn mức Quota"
                            >
                              {member.name}
                            </button>
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Team */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-700">
                          {member.role}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {member.subTeam}
                        </div>
                      </td>

                      {/* Quota Progress Bar */}
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700 tabular-nums">
                        {member.fileCount.toLocaleString()}
                        <span className="text-[10px] text-slate-400 ml-1 font-normal">tệp</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {member.status === 'paused' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Tạm dừng
                          </span>
                        ) : isHigh ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                            Đầy bộ nhớ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditQuota(member)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-100/80 rounded-full transition-colors cursor-pointer"
                          >
                            Hạn mức
                          </button>
                          <button
                            onClick={() => onToggleStatus(member.id)}
                            title={member.status === 'paused' ? 'Kích hoạt lại' : 'Tạm dừng đồng bộ'}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          {onOffboardMember && member.role !== 'Trưởng phòng' && (
                            <button
                              onClick={() => onOffboardMember(member)}
                              title="Vô hiệu hóa & Bàn giao tài sản số"
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Lời mời đang chờ */}
      <section className="mt-6 space-y-3" aria-labelledby="pending-invitations-heading">
        <h3 id="pending-invitations-heading" className="text-sm font-bold text-slate-900">
          Lời mời đang chờ
        </h3>
        <PendingInvitationsTable
          departmentId={departmentId ?? undefined}
          onResent={(r) => toast.success(resendToastMessage(r))}
          onCancelled={(r) => toast.success(cancelToastMessage(r))}
        />
      </section>
    </div>
  );
};
