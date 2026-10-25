import React from 'react';
import {
  UploadCloud,
  Users,
  FileText,
  Building2,
  HardDrive,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  RefreshCw,
  FolderTree,
  Sparkles,
  Trash2,
  Database,
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
      title: 'Quản lý Tài liệu & Upload File',
      subtitle: 'Department Documents & File Storage',
      description:
        'Tải tệp tin lên kho lưu trữ đám mây của phòng ban với quy trình quét mã độc ClamAV, kiểm tra Quota và mã băm SHA-256 toàn vẹn.',
      icon: UploadCloud,
      color: 'blue',
      gradient: 'from-blue-600 to-indigo-600',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
      badge: 'Kho tài liệu & Tải lên',
      actionText: 'Vào Kho Tài liệu & Upload',
      statLabel: 'Dung lượng đã dùng',
      statValue: `${department.usedSpaceGB} / ${department.totalAllocatedGB} GB`,
    },
    {
      id: 'trash' as DepartmentNavTab,
      title: 'Thùng rác Phòng ban',
      subtitle: 'Department Recycle Bin & Recovery',
      description:
        'Xem và phục hồi các tài liệu đã xóa của phòng ban hoặc xóa vĩnh viễn để giải phóng dung lượng Quota lưu trữ.',
      icon: Trash2,
      color: 'rose',
      gradient: 'from-rose-600 to-pink-600',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200/60',
      badge: 'Thùng rác & Phục hồi',
      actionText: 'Xem Thùng rác Phòng ban',
      statLabel: 'Tối ưu bộ nhớ',
      statValue: 'Khôi phục / Xóa vĩnh viễn',
    },
    {
      id: 'staff' as DepartmentNavTab,
      title: 'Quản lý Nhân sự & Phân quyền Quota',
      subtitle: 'Staff Directory & Member Allocation',
      description:
        'Quản lý hồ sơ nhân viên trong phòng ban, mời nhân viên mới qua thư mời kích hoạt và điều chỉnh hạn ngạch lưu trữ cá nhân theo thời gian thực.',
      icon: Users,
      color: 'emerald',
      gradient: 'from-emerald-600 to-teal-600',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      badge: 'Nhân sự & Hạn mức',
      actionText: 'Quản lý Nhân sự',
      statLabel: 'Tổng số thành viên',
      statValue: `${membersCount} nhân viên`,
    },
    {
      id: 'logs' as DepartmentNavTab,
      title: 'Nhật ký Hoạt động Nhân viên',
      subtitle: 'Employee Activity Logs & Audit Trail',
      description:
        'Truy vết toàn bộ nhật ký thao tác của các thành viên trong phòng ban: lịch sử tải tệp, tải xuống, thay đổi hạn ngạch và các tác vụ hệ thống.',
      icon: FileText,
      color: 'amber',
      gradient: 'from-amber-600 to-orange-600',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60',
      badge: 'Audit & Giám sát',
      actionText: 'Xem Nhật ký Hoạt động',
      statLabel: 'Trạng thái giám sát',
      statValue: 'Ghi log tự động 24/7',
    },
    {
      id: 'report' as DepartmentNavTab,
      title: 'Báo cáo & Kiểm toán Tệp tin',
      subtitle: 'Department Storage & User Files Audit',
      description:
        'Kiểm tra và đối soát toàn diện mọi tệp tin do nhân viên trong phòng tải lên: xem người upload, dung lượng, chứng nhận ClamAV, mã SHA-256 và xuất báo cáo CSV.',
      icon: HardDrive,
      color: 'indigo',
      gradient: 'from-indigo-600 to-purple-600',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      badge: 'Kiểm toán & Báo cáo',
      actionText: 'Xem Báo cáo Tệp tin',
      statLabel: 'Kiểm tra tệp nhân viên',
      statValue: 'Báo cáo chi tiết + CSV',
    },
    {
      id: 'quota' as DepartmentNavTab,
      title: 'Yêu cầu & Phê duyệt Quota',
      subtitle: 'Storage Quota Requests & Approvals',
      description:
        'Phê duyệt các yêu cầu tăng dung lượng của nhân viên trong phòng ban và gửi yêu cầu nâng hạn ngạch phòng ban lên Quản trị viên Doanh nghiệp.',
      icon: Database,
      color: 'purple',
      gradient: 'from-purple-600 to-indigo-600',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200/60',
      badge: 'Quota & Phê duyệt',
      actionText: 'Quản lý & Duyệt Quota',
      statLabel: 'Hạn mức phòng ban',
      statValue: `${department.totalAllocatedGB} GB`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER: THÔNG TIN TỔNG QUAN PHÒNG BAN */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DEPARTMENT PORTAL • {department.name.toUpperCase()}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Trung tâm Điều hành Phòng {department.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Chào mừng <strong className="text-white">{department.adminName}</strong>. Hãy chọn chức năng bạn cần thao tác: tải tài liệu phòng ban, quản lý nhân viên và hạn mức, hoặc theo dõi nhật ký hoạt động.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              onClick={onRefreshData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Đồng bộ lại dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              onClick={onOpenAddMember}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Mời nhân viên</span>
            </button>
          </div>
        </div>

        {/* Info stats pill strip */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Phòng ban: <strong className="text-white">{department.name}</strong></span>
          </div>
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Nhân sự: <strong className="text-white">{membersCount} người</strong></span>
          </div>
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Đã dùng: <strong className="text-white">{department.usedSpaceGB} / {department.totalAllocatedGB} GB ({percentUsed}%)</strong></span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Còn trống: <strong className="text-white">{availableQuotaGB} GB</strong></span>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC CÁC NÚT & THẺ CHỨC NĂNG CHÍNH ĐỂ NGƯỜI DÙNG TỰ CHỌN */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Danh mục Chức năng Phòng ban
            </h2>
            <p className="text-xs text-slate-500">
              Chọn chức năng để bắt đầu làm việc hoặc sử dụng các phím tắt nhanh
            </p>
          </div>
        </div>

        {/* 6 Large Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigateTab(card.id)}
                className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-6 flex flex-col justify-between shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
              >
                {/* Subtle top color gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 duration-200 ${card.iconBg}`}
                    >
                      <Icon className="w-6 h-6 stroke-[2]" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 mb-2.5">
                    {card.subtitle}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {card.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3 font-medium">
                    <span>{card.statLabel}:</span>
                    <strong className="text-slate-800 font-semibold">{card.statValue}</strong>
                  </div>

                  <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                    <span>{card.actionText}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. LỐI TẮT HƯỚNG DẪN & THAO TÁC NHANH */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs">
              Thao tác nhanh cho Trưởng phòng ban
            </p>
            <p className="text-slate-500 text-[11px]">
              Bạn luôn có thể quay lại màn hình chọn chức năng này bất kỳ lúc nào từ thanh điều hướng ở mỗi trang.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('files')}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 hover:text-blue-600 text-slate-700 font-medium transition-colors cursor-pointer shadow-2xs"
          >
            Tải tệp ngay
          </button>
          <button
            onClick={() => onNavigateTab('staff')}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 hover:text-blue-600 text-slate-700 font-medium transition-colors cursor-pointer shadow-2xs"
          >
            Xem Nhân viên
          </button>
          <button
            onClick={() => onNavigateTab('logs')}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 hover:text-blue-600 text-slate-700 font-medium transition-colors cursor-pointer shadow-2xs"
          >
            Xem Logs
          </button>
        </div>
      </div>
    </div>
  );
};
