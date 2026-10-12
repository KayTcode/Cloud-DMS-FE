import React from 'react';
import { 
  Building2, 
  LayoutGrid, 
  HardDrive, 
  FileText, 
  Settings, 
  Plus, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Server,
  Activity,
  Layers
} from 'lucide-react';
import { NavItem } from '@/features/tenants/types';

interface AdminHubViewProps {
  onNavigate: (nav: NavItem) => void;
  onOpenCreateTenantModal: () => void;
}

interface FeatureCardConfig {
  id: NavItem;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badge: string;
  actionText: string;
}

export const AdminHubView: React.FC<AdminHubViewProps> = ({
  onNavigate,
  onOpenCreateTenantModal,
}) => {
  const featureCards: FeatureCardConfig[] = [
    {
      id: 'tenants',
      title: 'Quản lý Tổ chức & Tài khoản',
      subtitle: 'Tenants & Account Administration',
      description: 'Quản lý danh sách các doanh nghiệp, cấp mới tài khoản quản trị viên Tenant, phân bổ dung lượng lưu trữ (Quota) và kiểm soát trạng thái hoạt động.',
      icon: Building2,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
      iconColor: 'text-blue-600',
      badge: 'Quản trị cốt lõi',
      actionText: 'Mở Quản lý Tổ chức',
    },
    {
      id: 'dashboard',
      title: 'Tổng quan & Báo cáo Hệ thống',
      subtitle: 'System Metrics & Analytics',
      description: 'Theo dõi tổng quan tài nguyên hệ thống, dung lượng lưu trữ toàn sàn, tỷ lệ sử dụng, biểu đồ tăng trưởng và kiểm tra trạng thái vận hành của các dịch vụ.',
      icon: LayoutGrid,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      iconColor: 'text-indigo-600',
      badge: 'Giám sát tài nguyên',
      actionText: 'Xem Báo cáo Tổng quan',
    },
    {
      id: 'storage-providers',
      title: 'Nhà cung cấp Lưu trữ (Storage Pools)',
      subtitle: 'Cloud & Hybrid Storage Providers',
      description: 'Cấu hình và kết nối các nguồn lưu trữ đám mây bao gồm AWS S3, MinIO, Azure Blob, Microsoft OneDrive và Máy chủ lưu trữ cục bộ (Local Storage).',
      icon: HardDrive,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      iconColor: 'text-emerald-600',
      badge: 'Hạ tầng Cloud',
      actionText: 'Cấu hình Storage Providers',
    },
    {
      id: 'audit-logs',
      title: 'Nhật ký Kiểm toán & Bảo mật',
      subtitle: 'Audit Logs & Security Trail',
      description: 'Truy vết toàn bộ nhật ký thao tác dữ liệu, lịch sử cấp phát quyền, đăng nhập quản trị và các sự kiện bảo mật quan trọng trên toàn hệ thống.',
      icon: FileText,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60',
      iconColor: 'text-amber-600',
      badge: 'An toàn dữ liệu',
      actionText: 'Xem Nhật ký Kiểm toán',
    },
    {
      id: 'settings',
      title: 'Cài đặt & Cấu hình Hệ thống',
      subtitle: 'System Preferences & Policies',
      description: 'Thiết lập các chính sách giới hạn tải tệp, cấu hình máy chủ Email SMTP, thông số đồng bộ sao lưu và tùy chỉnh các tham số kỹ thuật toàn hệ thống.',
      icon: Settings,
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200/60',
      iconColor: 'text-purple-600',
      badge: 'Thiết lập toàn cục',
      actionText: 'Mở Cài đặt Hệ thống',
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* 1. HERO BANNER CHÀO MỪNG */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-md border border-slate-700/60">
        {/* Họa tiết trang trí nền */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 -mb-10 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-blue-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Trung tâm Điều hành Toàn hệ thống (Command Center)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Bảng Chọn Chức Năng Quản Trị
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Chào mừng bạn đến với hệ thống quản trị Cloud DMS. Vui lòng chọn một chức năng dưới đây để bắt đầu làm việc. Hệ thống sẽ tải dữ liệu tương ứng theo nhu cầu của bạn.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCreateTenantModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-900/30 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tạo nhanh Tổ chức mới</span>
            </button>
          </div>
        </div>

        {/* Thanh trạng thái nhanh hệ sinh thái */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Đám mây đa người thuê (Multi-Tenant)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Phân quyền RBAC & Mã hóa dữ liệu</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Tối ưu hóa tải dữ liệu On-Demand</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Hỗ trợ đa kho Hybrid Cloud Storage</span>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC CÁC NÚT & THẺ CHỨC NĂNG CHÍNH */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Danh Mục Chức Năng Quản Trị
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Chọn chức năng bạn muốn truy cập để bắt đầu xem và thao tác dữ liệu
            </p>
          </div>
        </div>

        {/* Grid các thẻ tính năng */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigate(card.id)}
                className="group relative flex flex-col justify-between p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden hover:-translate-y-0.5"
              >
                {/* Dải hiệu ứng hover trên đầu card */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Card Header: Icon & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${card.iconBg}`}>
                      <Icon className="w-6 h-6 stroke-[2]" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                      {card.badge}
                    </span>
                  </div>

                  {/* Tiêu đề & phụ đề */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
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
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                  <span>{card.actionText}</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
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
              Mẹo làm việc nhanh dành cho Quản trị viên
            </p>
            <p className="text-slate-500 text-[11px]">
              Bạn cũng có thể sử dụng cột menu bên trái (Sidebar) để chuyển đổi qua lại nhanh chóng giữa các phân hệ bất cứ lúc nào.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('tenants')}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Quản lý tài khoản
          </button>
          <button
            onClick={() => onNavigate('storage-providers')}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Kho lưu trữ Cloud
          </button>
        </div>
      </div>
    </div>
  );
};
