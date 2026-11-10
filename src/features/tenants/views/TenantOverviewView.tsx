import React, { useState } from 'react';
import {
  Users,
  Building2,
  HardDrive,
  Files,
  UserPlus,
  Download,
  UserCheck,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Crown,
  AlertTriangle,
  FolderPlus,
  Send,
} from 'lucide-react';
import { TenantInfo, TenantEvent } from '@/features/tenants/types';
import { StorageStatsCard } from '../components/StorageStatsCard';
import { RequestQuotaModal } from '@/features/quota';
import { useTenantContext } from '@/context/TenantContext';

interface TenantOverviewViewProps {
  tenant: TenantInfo;
  events: TenantEvent[];
  onImpersonate: () => void;
  onDownloadBackup: () => void;
  onNavigateTab: (tab: 'departments') => void;
  onCreateDepartmentUser: () => void;
}

export const TenantOverviewView: React.FC<TenantOverviewViewProps> = ({
  tenant,
  events,
  onImpersonate,
  onDownloadBackup,
  onNavigateTab,
  onCreateDepartmentUser,
}) => {
  const { addToast, refreshTenantData, departments } = useTenantContext();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const handleRequestCreated = () => {
    setIsRequestModalOpen(false);
    addToast('success', 'Đã gửi yêu cầu tăng hạn mức lưu trữ Tenant lên System Admin!');
    refreshTenantData(tenant.id);
  };

  // Quota & Storage calculations from real backend data
  const totalAllocatedBytes = tenant.storageQuotaBytes || (tenant.diskAllocatedTB * (1024 ** 4));
  const allocatedToDeptsBytes = tenant.allocatedToDepartmentsBytes ?? departments.reduce((acc, d) => {
    return acc + (d.storageQuotaBytes ?? ((d.allocatedStorageGB || 0) * (1024 ** 3)));
  }, 0);
  const percentAllocated = totalAllocatedBytes > 0
    ? Math.min(100, Math.round((allocatedToDeptsBytes / totalAllocatedBytes) * 100))
    : 0;

  const formatStorageDisplay = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 GB';
    const tb = bytes / (1024 ** 4);
    if (tb >= 1) return `${tb.toFixed(2)} TB`;
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(0)} GB`;
  };

  // Human Resources & Seat calculation
  const seatPercent = tenant.licenseLimit > 0
    ? Math.min(100, Math.round((tenant.licenseUsed / tenant.licenseLimit) * 100))
    : 0;

  // Departments structure metrics
  const vacantDepartmentsCount = departments.filter((d) => d.isVacant || !d.lead || d.lead === 'Chưa chỉ định').length;
  const activeLeadsCount = Math.max(0, departments.length - vacantDepartmentsCount);

  // Files count from real BE
  const totalFiles = tenant.totalFilesCount ?? tenant.filesCount ?? 0;

  return (
    <div className="space-y-5 mt-3 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* TẦNG 1: 4 THẺ KPI CHỈ SỐ CỐT LÕI (Chuẩn Google Workspace / Drive)         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tài khoản Nhân sự & Ghế ngồi */}
        <div
          onClick={() => onNavigateTab('departments')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">Nhân sự & Ghế ngồi</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {tenant.licenseUsed.toLocaleString()}
              <span className="text-sm font-normal text-slate-400 ml-1.5 font-sans">
                / {tenant.licenseLimit.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span>Tỷ lệ lấp đầy gói cước</span>
              <span className="font-bold text-slate-700 tabular-nums">{seatPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  seatPercent > 90 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${seatPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 2: Cơ cấu Phòng ban Trực thuộc */}
        <div
          onClick={() => onNavigateTab('departments')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">Cơ cấu Phòng ban</span>
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {tenant.departmentsCount || departments.length}
              <span className="text-sm font-normal text-slate-400 ml-1.5 font-sans">phòng</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 truncate">
                <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{activeLeadsCount} có Trưởng phòng</span>
              </span>
              {vacantDepartmentsCount > 0 ? (
                <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded text-[10px] shrink-0 border border-amber-200/80">
                  {vacantDepartmentsCount} khuyết Lead
                </span>
              ) : (
                <span className="text-emerald-600 font-medium text-[10px] shrink-0">
                  Đủ quản trị
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 3: Hạn mức Quota Toàn sàn */}
        <div
          onClick={() => setIsRequestModalOpen(true)}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">Hạn mức Quota Tổng</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {formatStorageDisplay(totalAllocatedBytes)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span>Đã cấp cho các phòng ban</span>
              <span className="font-bold text-slate-700 tabular-nums">{percentAllocated}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${percentAllocated}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 4: Kho Tài liệu & Tệp tin */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">Kho Tài liệu & Tệp tin</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Files className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {totalFiles.toLocaleString()}
              <span className="text-sm font-normal text-slate-400 ml-1.5 font-sans">tệp tin</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="truncate">Lưu trữ trên Cloud</span>
              <span className="text-slate-700 font-medium font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                {tenant.storageProviderName || 'Local Storage'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TẦNG 2 & 3: BỨC TRANH LƯU TRỮ, PHÒNG BAN & TRUNG TÂM ĐIỀU HÀNH            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CỘT TRÁI (8/12): Storage Card + Bảng Tóm tắt Phòng ban */}
        <div className="lg:col-span-8 space-y-5">
          {/* Thẻ thống kê chi tiết dung lượng lưu trữ Tenant (Đã dọn dẹp mock) */}
          <StorageStatsCard tenant={tenant} />

          {/* Bảng Tóm tắt Cơ cấu Phòng ban Trực thuộc */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Cơ cấu các phòng ban trực thuộc
                  </h3>
                  <p className="text-xs text-slate-500">
                    Danh sách phòng ban, Trưởng phòng phụ trách và hạn mức Quota phân bổ
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('departments')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                <span>Xem chi tiết</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Departments Table or Empty State */}
            {departments.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-700 mb-1">Chưa có phòng ban nào được thiết lập</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Doanh nghiệp chưa có phòng ban trực thuộc. Hãy tạo phòng ban để phân bổ Quota và nhân sự.
                </p>
                <button
                  onClick={() => onNavigateTab('departments')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Tạo phòng ban đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Phòng ban</th>
                      <th className="py-2.5 px-3">Trưởng phòng</th>
                      <th className="py-2.5 px-3 text-center">Nhân sự</th>
                      <th className="py-2.5 px-3">Hạn mức Quota</th>
                      <th className="py-2.5 px-3 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {departments.slice(0, 5).map((dept) => {
                      const deptQuotaGB = dept.allocatedStorageGB > 0
                        ? dept.allocatedStorageGB
                        : (dept.storageQuotaBytes ? Number((dept.storageQuotaBytes / (1024 ** 3)).toFixed(1)) : 0);
                      const isVacant = dept.isVacant || !dept.lead || dept.lead === 'Chưa chỉ định';

                      return (
                        <tr
                          key={dept.id}
                          onClick={() => onNavigateTab('departments')}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                              <span>{dept.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {isVacant ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-medium">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                <span>Khuyết Lead</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                                <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="truncate max-w-[130px]">{dept.lead}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-semibold text-slate-700 tabular-nums">
                              {dept.headCount}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1">người</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                                {deptQuotaGB > 0 ? `${deptQuotaGB} GB` : 'Chưa cấp'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="inline-flex items-center text-slate-400 group-hover:text-blue-600 transition-colors">
                              <ArrowUpRight className="w-4 h-4" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {departments.length > 5 && (
                  <div className="text-center pt-3 border-t border-slate-100">
                    <button
                      onClick={() => onNavigateTab('departments')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Xem thêm {departments.length - 5} phòng ban khác →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (4/12): Thao tác nhanh & Nhật ký hoạt động */}
        <div className="lg:col-span-4 space-y-5">
          {/* Khối Thao tác Quản trị Nhanh */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-800 tracking-tight uppercase mb-3.5">
              Thao tác nhanh
            </h4>

            <div className="space-y-2.5">
              {/* Thêm nhân viên mới */}
              <button
                onClick={onCreateDepartmentUser}
                className="w-full border border-blue-200/80 bg-blue-50/50 rounded-xl p-3 flex items-center gap-3 hover:bg-blue-50 hover:border-blue-300 transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-blue-900 group-hover:text-blue-700 transition-colors block">
                    Thêm nhân viên mới
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">Cấp tài khoản & gán vào phòng ban</span>
                </div>
              </button>

              {/* Quản lý & Tạo phòng ban */}
              <button
                onClick={() => onNavigateTab('departments')}
                className="w-full border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors block">
                    Cơ cấu phòng ban
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate">Tạo phòng, bổ nhiệm & cấp quota</span>
                </div>
              </button>

              {/* Xin thêm Quota Doanh nghiệp */}
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors block">
                    Xin thêm Quota Doanh nghiệp
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate">Gửi yêu cầu tăng bộ nhớ lên System Admin</span>
                </div>
              </button>

              {/* Đăng nhập ủy quyền (Impersonate) */}
              <button
                onClick={onImpersonate}
                className="w-full border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors block">
                    Đăng nhập ủy quyền
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate">Truy cập giao diện với vai trò Owner</span>
                </div>
              </button>

              {/* Tải tệp sao lưu dữ liệu */}
              <button
                onClick={onDownloadBackup}
                className="w-full border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors block">
                    Tải tệp tin sao lưu dữ liệu
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate">Sao lưu dữ liệu doanh nghiệp</span>
                </div>
              </button>
            </div>
          </div>

          {/* Khối Sự kiện hoạt động gần đây (Nhật ký thực từ CSDL) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-800 tracking-tight uppercase">
                  Hoạt động gần đây
                </h4>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                {events.length > 0 ? `${events.length} sự kiện` : ''}
              </span>
            </div>

            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2 border border-slate-100">
                    <Clock className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">Chưa có hoạt động nào được ghi nhận</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                    Các thao tác phân bổ Quota, tạo phòng ban và quản trị sẽ hiển thị tại đây.
                  </p>
                </div>
              ) : (
                events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-3 text-xs p-2 rounded-lg hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <span className="text-slate-700 leading-snug line-clamp-2" title={event.text}>
                        {event.text}
                      </span>
                    </div>
                    <span className="text-slate-400 tabular-nums shrink-0 text-[11px] whitespace-nowrap mt-0.5">
                      {event.timeAgo}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal gửi yêu cầu cấp thêm Quota */}
      <RequestQuotaModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={handleRequestCreated}
      />
    </div>
  );
};
