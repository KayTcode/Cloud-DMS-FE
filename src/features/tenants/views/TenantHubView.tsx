import React from 'react';
import {
  Building2,
  Users,
  HardDrive,
  LayoutGrid,
  FileText,
  Settings,
  UserPlus,
  CreditCard,
  Download,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Layers,
  Database
} from 'lucide-react';
import { ActiveTab, TenantInfo } from '@/features/tenants/types';

interface TenantHubViewProps {
  tenant: TenantInfo;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenCreateDepartmentUser: () => void;
  onOpenSubscriptionModal: () => void;
  onDownloadBackup: () => void;
}

interface TenantCardConfig {
  id: ActiveTab;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badge: string;
  actionText: string;
}

export const TenantHubView: React.FC<TenantHubViewProps> = ({
  tenant,
  onNavigateTab,
  onOpenCreateDepartmentUser,
  onOpenSubscriptionModal,
  onDownloadBackup,
}) => {
  const cards: TenantCardConfig[] = [
    {
      id: 'departments',
      title: 'Cơ cấu Phòng ban & Tổ chức',
      subtitle: 'Departments & Organization Structure',
      description: 'Quản lý cơ cấu phòng ban trực thuộc, bổ nhiệm Trưởng phòng ban (Department Admin) và phân bổ hạn mức lưu trữ Cloud riêng cho từng phòng.',
      icon: Building2,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      badge: 'Cơ cấu tổ chức',
      actionText: 'Quản lý Phòng ban',
    },
    {
      id: 'users',
      title: 'Quản lý Nhân viên & Thành viên',
      subtitle: 'Members & Employee Accounts',
      description: 'Xem và quản lý danh sách nhân sự của doanh nghiệp, cấp tài khoản thành viên mới, phân công vào phòng ban và theo dõi trạng thái hoạt động.',
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
      badge: 'Nhân sự & Phân quyền',
      actionText: 'Quản lý Nhân viên',
    },
    {
      id: 'overview',
      title: 'Báo cáo & Thống kê Tổng quan',
      subtitle: 'Tenant Overview & Performance Metrics',
      description: 'Xem các biểu đồ tổng hợp tài nguyên, tổng số lượng tệp tin, thư mục, mức độ tăng trưởng dữ liệu và tiến độ gói dịch vụ.',
      icon: LayoutGrid,
      iconBg: 'bg-violet-50 text-violet-600 border-violet-200/60',
      badge: 'Báo cáo số liệu',
      actionText: 'Xem Báo cáo Tổng quan',
    },
    {
      id: 'activity',
      title: 'Nhật ký Thao tác Doanh nghiệp',
      subtitle: 'Activity Logs & Audit Trail',
      description: 'Truy vết toàn bộ lịch sử hoạt động nội bộ: thêm sửa nhân sự, thay đổi hạn ngạch dung lượng và các tác vụ hệ thống của doanh nghiệp.',
      icon: FileText,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60',
      badge: 'Lịch sử hoạt động',
      actionText: 'Xem Nhật ký Hoạt động',
    },
    {
      id: 'quota',
      title: 'Yêu cầu & Phê duyệt Quota',
      subtitle: 'Storage Quota Requests & Approvals',
      description: 'Phê duyệt các yêu cầu tăng dung lượng từ Trưởng phòng ban hoặc nhân viên, và gửi yêu cầu nâng hạn ngạch doanh nghiệp lên System Admin.',
      icon: Database,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
      badge: 'Quota & Phê duyệt',
      actionText: 'Quản lý & Duyệt Quota',
    },
    {
      id: 'settings',
      title: 'Cài đặt & Cấu hình Doanh nghiệp',
      subtitle: 'Tenant Profile & Configuration',
      description: 'Tùy chỉnh thông tin hồ sơ doanh nghiệp, email đầu mối liên hệ quản trị, quản lý gói cước và xuất tệp sao lưu dữ liệu dự phòng.',
      icon: Settings,
      iconBg: 'bg-slate-100 text-slate-700 border-slate-200/80',
      badge: 'Hồ sơ & Thiết lập',
      actionText: 'Cài đặt Doanh nghiệp',
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* 1. HERO BANNER CHÀO MỪNG DOANH NGHIỆP */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white shadow-md border border-slate-700/60">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 -mb-10 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-blue-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Không gian Quản trị Doanh nghiệp (Tenant Workspace)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>{tenant.name || 'Doanh Nghiệp'}</span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-medium">
                {tenant.status || 'ACTIVE'}
              </span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Chào mừng bạn đến với trung tâm điều hành {tenant.name || 'doanh nghiệp'}. Vui lòng lựa chọn chức năng bên dưới để bắt đầu làm việc. Hệ thống sẽ tải dữ liệu theo từng tác vụ của bạn.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCreateDepartmentUser}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-900/30 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Nhân viên</span>
            </button>
            <button
              onClick={onOpenSubscriptionModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold backdrop-blur-md border border-white/20 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Gói cước</span>
            </button>
            <button
              onClick={onDownloadBackup}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer"
              title="Sao lưu dữ liệu doanh nghiệp"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sao lưu</span>
            </button>
          </div>
        </div>

        {/* Thanh trạng thái nhanh */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Gói: {tenant.plan || 'ENTERPRISE'}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Phân vùng bảo mật độc lập</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Kho lưu trữ Cloud chuyên biệt</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Tải dữ liệu On-Demand tối ưu</span>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC CÁC NÚT & THẺ CHỨC NĂNG CHÍNH */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Danh Mục Chức Năng Doanh Nghiệp
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Chọn chức năng bạn muốn làm việc để bắt đầu thao tác dữ liệu
            </p>
          </div>
        </div>

        {/* Grid các thẻ tính năng */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigateTab(card.id)}
                className="group relative flex flex-col justify-between p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden hover:-translate-y-0.5"
              >
                {/* Dải hiệu ứng hover trên đầu card */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Card Header: Icon & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${card.iconBg}`}>
                      <Icon className="w-6 h-6 stroke-[2]" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                      {card.badge}
                    </span>
                  </div>

                  {/* Tiêu đề & phụ đề */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mb-2">
                    {card.subtitle}
                  </p>

                  {/* Mô tả chi tiết */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-6">
                    {card.description}
                  </p>
                </div>

                {/* Footer Action Button */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                  <span>{card.actionText}</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. LỐI TẮT HƯỚNG DẪN / GHI CHÚ NHANH */}
      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            💡
          </div>
          <div>
            <p className="font-semibold text-slate-800">
              Điều hướng thông minh cho Quản trị viên Doanh nghiệp
            </p>
            <p className="text-slate-500 text-[11px]">
              Bạn có thể dễ dàng quay lại màn hình chọn chức năng này bất kỳ lúc nào từ thanh điều hướng ở mỗi trang.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('departments')}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Xem Phòng ban
          </button>
          <button
            onClick={() => onNavigateTab('overview')}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Xem Tổng quan
          </button>
        </div>
      </div>
    </div>
  );
};
