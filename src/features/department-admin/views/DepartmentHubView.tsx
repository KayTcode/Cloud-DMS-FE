import React from 'react';
import {
  UploadCloud,
  Users,
  FileText,
  Building2,
  HardDrive,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  RefreshCw,
  FolderTree,
  Sparkles,
  Database,
  Crown,
  Layers,
} from 'lucide-react';
import { DepartmentInfo, DepartmentNavTab } from '../types';

interface DepartmentHubViewProps {
  department: DepartmentInfo;
  membersCount: number;
  availableQuotaGB: number;
  onNavigateTab: (tab: DepartmentNavTab) => void;
  onOpenAddMember: () => void;
  onRefreshData: () => void;
  isLoading?: boolean;
}

export const DepartmentHubView: React.FC<DepartmentHubViewProps> = ({
  department,
  membersCount,
  availableQuotaGB,
  onNavigateTab,
  onOpenAddMember,
  onRefreshData,
  isLoading = false,
}) => {
  const percentUsed = department.totalAllocatedGB > 0
    ? Math.min(100, Math.round((department.usedSpaceGB / department.totalAllocatedGB) * 100))
    : 0;

  const cards = [
    {
      id: 'files' as DepartmentNavTab,
      title: 'Kho Tài liệu & Upload File',
      description: 'Tải lên, quản lý và tổ chức kho tài liệu số của phòng ban theo cấu trúc thư mục.',
      icon: UploadCloud,
      color: 'blue',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
      badge: 'Tài liệu & Tải lên',
      actionText: 'Vào Kho Tài liệu',
      statLabel: 'Đã lưu trữ',
      statValue: `${department.usedSpaceGB} / ${department.totalAllocatedGB} GB`,
    },
    {
      id: 'shared-store' as DepartmentNavTab,
      title: 'Kho Chung Phòng Ban',
      description: 'Không gian lưu trữ dùng chung cho toàn bộ nhân viên trong phòng cùng truy cập và chia sẻ.',
      icon: FolderTree,
      color: 'indigo',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      badge: 'Kho chia sẻ chung',
      actionText: 'Mở Kho Chung',
      statLabel: 'Phân quyền',
      statValue: 'Cộng tác nội bộ',
    },
    {
      id: 'staff' as DepartmentNavTab,
      title: 'Quản lý Nhân sự & Quota',
      description: 'Quản lý danh sách nhân viên, mời nhân sự mới và điều chỉnh hạn ngạch lưu trữ cá nhân.',
      icon: Users,
      color: 'emerald',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      badge: 'Nhân sự & Hạn mức',
      actionText: 'Quản lý Nhân sự',
      statLabel: 'Tổng thành viên',
      statValue: `${membersCount} nhân viên`,
    },
    {
      id: 'quota' as DepartmentNavTab,
      title: 'Hạn mức & Phê duyệt Quota',
      description: 'Phê duyệt yêu cầu tăng dung lượng của nhân viên và xin thêm hạn mức từ doanh nghiệp.',
      icon: Database,
      color: 'purple',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200/60',
      badge: 'Quota & Phê duyệt',
      actionText: 'Quản lý & Duyệt Quota',
      statLabel: 'Hạn mức phòng',
      statValue: `${department.totalAllocatedGB} GB`,
    },
    {
      id: 'logs' as DepartmentNavTab,
      title: 'Nhật ký Hoạt động Phòng ban',
      description: 'Truy vết toàn bộ lịch sử thao tác tải tệp, tải xuống, thay đổi hạn ngạch và tác vụ hệ thống.',
      icon: FileText,
      color: 'amber',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60',
      badge: 'Kiểm toán 24/7',
      actionText: 'Xem Nhật ký',
      statLabel: 'Giám sát',
      statValue: 'Tự động ghi nhận',
    },
    {
      id: 'report' as DepartmentNavTab,
      title: 'Báo cáo & Kiểm toán Tệp tin',
      description: 'Xem chi tiết danh sách tệp tin do nhân viên tải lên, đối soát dung lượng và xuất file CSV.',
      icon: ShieldCheck,
      color: 'teal',
      iconBg: 'bg-teal-50 text-teal-600 border-teal-200/60',
      badge: 'Báo cáo & Xuất file',
      actionText: 'Xem Báo cáo',
      statLabel: 'Định dạng',
      statValue: 'Chi tiết + CSV',
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. SURFACE HEADER: THÔNG TIN TỔNG QUAN PHÒNG BAN (GOOGLE WORKSPACE STYLE) */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Phòng ban</span>
            <span>/</span>
            <span className="text-slate-600 font-medium truncate">{department.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Trung tâm Điều hành Phòng {department.name}
            </h1>
            {department.adminName && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                <Crown className="w-3 h-3 text-amber-500" />
                <span>Trưởng phòng: {department.adminName}</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Dưới đây là bức tranh toàn cảnh và các chức năng quản trị tài liệu, nhân sự và hạn mức lưu trữ phòng ban.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            onClick={onRefreshData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Đồng bộ lại dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={onOpenAddMember}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Mời nhân viên</span>
          </button>
        </div>
      </div>

      {/* 2. HÀNG 4 THẺ KPI CHỈ SỐ CỐT LÕI (Chuẩn Google Drive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Nhân sự phòng ban */}
        <div
          onClick={() => onNavigateTab('staff')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">Nhân sự phòng ban</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {membersCount}
              <span className="text-sm font-normal text-slate-400 ml-1.5 font-sans">nhân viên</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tài khoản nhân sự</span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
              Đang hoạt động
            </span>
          </div>
        </div>

        {/* KPI 2: Hạn mức Quota phòng ban */}
        <div
          onClick={() => onNavigateTab('quota')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">Hạn mức Quota Phòng</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {department.usedSpaceGB}
              <span className="text-sm font-normal text-slate-400 ml-1 font-sans">/ {department.totalAllocatedGB} GB</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span>Đã tiêu thụ</span>
              <span className="font-bold text-slate-700 tabular-nums">{percentUsed}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentUsed > 85 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Khả dụng cấp thêm */}
        <div
          onClick={() => onNavigateTab('quota')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">Dung lượng Khả dụng</span>
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {availableQuotaGB}
              <span className="text-sm font-normal text-slate-400 ml-1.5 font-sans">GB</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Sẵn sàng phân bổ</span>
            <span className="text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full text-[10px]">
              Kho đệm phòng
            </span>
          </div>
        </div>

        {/* KPI 4: Kho Chung Phòng Ban */}
        <div
          onClick={() => onNavigateTab('shared-store')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">Kho Chung Phòng</span>
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FolderTree className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Kho dùng chung
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Lưu trữ nội bộ</span>
            <span className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
              Toàn phòng ban
            </span>
          </div>
        </div>
      </div>

      {/* 3. KHU VỰC CÁC THẺ CHỨC NĂNG CHÍNH (GOOGLE WORKSPACE CARDS) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
              Danh mục Chức năng Quản trị
            </h2>
            <p className="text-xs text-slate-500">
              Chọn chức năng để bắt đầu làm việc hoặc phân quyền lưu trữ
            </p>
          </div>
        </div>

        {/* 6 Clean Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigateTab(card.id)}
                className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 duration-150 ${card.iconBg}`}>
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1.5 mb-3">
                    {card.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
                    <span>{card.statLabel}:</span>
                    <strong className="text-slate-800 font-semibold">{card.statValue}</strong>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                    <span>{card.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. PHÍM TẮT NHANH PHÍA DƯỚI */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs">
              Thao tác nhanh cho Trưởng phòng ban
            </p>
            <p className="text-slate-400 text-[11px]">
              Bạn luôn có thể chuyển đổi giữa các chức năng ngay tại thanh Tab trên cùng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('files')}
            className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-blue-600 text-slate-700 font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Kho Tài liệu
          </button>
          <button
            onClick={() => onNavigateTab('staff')}
            className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-blue-600 text-slate-700 font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Xem Nhân viên
          </button>
          <button
            onClick={() => onNavigateTab('quota')}
            className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-blue-600 text-slate-700 font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Duyệt Quota
          </button>
        </div>
      </div>
    </div>
  );
};
