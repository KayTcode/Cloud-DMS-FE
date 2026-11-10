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
  Layers,
  ClipboardCheck
} from 'lucide-react';
import { NavItem } from '@/features/tenants/types';

interface AdminHubViewProps {
  onNavigate: (nav: NavItem) => void;
  onOpenCreateTenantModal: () => void;
}

interface FeatureCardConfig {
  id: NavItem;
  title: string;
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
      description: 'Quản lý doanh nghiệp, cấp tài khoản Quản trị viên Tenant và phân bổ hạn mức lưu trữ.',
      icon: Building2,
      iconBg: 'bg-blue-50 text-blue-600',
      iconColor: 'text-blue-600',
      badge: 'Cốt lõi',
      actionText: 'Mở quản lý',
    },
    {
      id: 'quota-requests',
      title: 'Duyệt Yêu cầu Hạn mức (Quota)',
      description: 'Tiếp nhận, kiểm tra và phê duyệt các đề xuất cấp thêm dung lượng từ các Doanh nghiệp.',
      icon: ClipboardCheck,
      iconBg: 'bg-amber-50 text-amber-600',
      iconColor: 'text-amber-600',
      badge: 'Phê duyệt',
      actionText: 'Xem yêu cầu',
    },
    {
      id: 'dashboard',
      title: 'Tổng quan & Báo cáo',
      description: 'Giám sát chỉ số tài nguyên, biểu đồ tăng trưởng lưu trữ và tình trạng vận hành toàn sàn.',
      icon: LayoutGrid,
      iconBg: 'bg-indigo-50 text-indigo-600',
      iconColor: 'text-indigo-600',
      badge: 'Báo cáo',
      actionText: 'Xem tổng quan',
    },
    {
      id: 'storage-providers',
      title: 'Nhà cung cấp Lưu trữ (Storage Pools)',
      description: 'Quản lý và giám sát kết nối các kho Google Drive, OneDrive, S3, MinIO và máy chủ cục bộ.',
      icon: HardDrive,
      iconBg: 'bg-emerald-50 text-emerald-600',
      iconColor: 'text-emerald-600',
      badge: 'Hạ tầng',
      actionText: 'Cấu hình kho',
    },
    {
      id: 'audit-logs',
      title: 'Nhật ký Kiểm toán & Bảo mật',
      description: 'Truy vết toàn bộ lịch sử thao tác dữ liệu, đăng nhập quản trị và sự kiện an ninh hệ thống.',
      icon: FileText,
      iconBg: 'bg-rose-50 text-rose-600',
      iconColor: 'text-rose-600',
      badge: 'Bảo mật',
      actionText: 'Xem nhật ký',
    },
    {
      id: 'settings',
      title: 'Cài đặt & Cấu hình Hệ thống',
      description: 'Thiết lập chính sách bảo mật 2FA, đồng bộ sao lưu và cấu hình tham số vận hành chung.',
      icon: Settings,
      iconBg: 'bg-purple-50 text-purple-600',
      iconColor: 'text-purple-600',
      badge: 'Hệ thống',
      actionText: 'Mở cài đặt',
    },
  ];

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-150">
      {/* 1. GOOGLE DRIVE STYLE HERO HEADER */}
      <div className="p-6 sm:p-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Trung tâm Điều hành Hệ thống • Cloud DMS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Bảng Điều Khiển Quản Trị Viên
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Chọn một phân hệ chức năng bên dưới để xem báo cáo hoặc quản trị tài nguyên theo nhu cầu.
          </p>
        </div>

        {/* Nút Tạo nhanh chuẩn Google Drive Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenCreateTenantModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo Tổ chức mới</span>
          </button>
        </div>
      </div>

      {/* 2. LƯỚI CÁC THẺ PHÂN HỆ CHỨC NĂNG */}
      <div>
        <div className="mb-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Danh mục chức năng
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigate(card.id)}
                className="group relative flex flex-col justify-between p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:bg-slate-50/40 hover:shadow-xs transition-all duration-150 cursor-pointer"
              >
                <div>
                  {/* Card Header: Icon tròn & Badge */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 duration-150 ${card.iconBg}`}>
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                      {card.badge}
                    </span>
                  </div>

                  {/* Tiêu đề & Mô tả ngắn gọn 1 câu */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>

                {/* Footer Action link */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                  <span>{card.actionText}</span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. THANH THÔNG TIN BẢO ĐẢM HỆ THỐNG */}
      <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Kiến trúc đa người thuê (Multi-Tenant)</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Bảo mật phân quyền RBAC & Mã hóa dữ liệu</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Kho lưu trữ đám mây lai (Hybrid Cloud Storage)</span>
        </div>
      </div>
    </div>
  );
};
