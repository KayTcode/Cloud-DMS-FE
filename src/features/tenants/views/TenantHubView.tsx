import React from 'react';
import {
  Building2,
  LayoutGrid,
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
      title: 'Cơ cấu Phòng ban & Nhân sự',
      description: 'Quản lý cơ cấu phòng ban trực thuộc, bổ nhiệm Trưởng phòng (Lead) và cấp phát dung lượng Quota.',
      icon: Building2,
      iconBg: 'bg-indigo-50 text-indigo-600',
      badge: 'Cơ cấu tổ chức',
      actionText: 'Quản lý phòng ban',
    },
    {
      id: 'overview',
      title: 'Báo cáo & Thống kê Tổng quan',
      description: 'Theo dõi tổng quan tài nguyên lưu trữ, số lượng tài khoản nhân sự và nhật ký hoạt động gần đây.',
      icon: LayoutGrid,
      iconBg: 'bg-blue-50 text-blue-600',
      badge: 'Báo cáo số liệu',
      actionText: 'Xem tổng quan',
    },
    {
      id: 'quota',
      title: 'Hạn mức Lưu trữ & Duyệt Quota',
      description: 'Phê duyệt đề xuất tăng dung lượng từ các phòng ban và gửi yêu cầu nâng hạn mức doanh nghiệp.',
      icon: Database,
      iconBg: 'bg-amber-50 text-amber-600',
      badge: 'Quota lưu trữ',
      actionText: 'Quản lý Quota',
    },
    {
      id: 'settings',
      title: 'Cài đặt & Cấu hình Doanh nghiệp',
      description: 'Cập nhật email liên hệ quản trị, giới hạn số lượng tài khoản nhân sự và chính sách tải tệp tin.',
      icon: Settings,
      iconBg: 'bg-purple-50 text-purple-600',
      badge: 'Thiết lập',
      actionText: 'Cài đặt chung',
    },
  ];

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-150">
      {/* 1. HERO HEADER CHÀO MỪNG DOANH NGHIỆP (GOOGLE WORKSPACE STYLE) */}
      <div className="p-6 sm:p-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Không gian Quản trị Doanh nghiệp</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>{tenant.name || 'Doanh Nghiệp'}</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold">
              {tenant.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
            </span>
          </h1>

          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Trung tâm điều hành doanh nghiệp {tenant.name}. Chọn một phân hệ bên dưới để bắt đầu quản trị phòng ban, tài nguyên và nhân sự.
          </p>
        </div>

        {/* Nút hành động nhanh dạng viên thuốc */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenCreateDepartmentUser}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm Nhân viên</span>
          </button>

          <button
            onClick={onOpenSubscriptionModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span>Gói cước</span>
          </button>

          <button
            onClick={onDownloadBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
            title="Sao lưu dữ liệu doanh nghiệp"
          >
            <Download className="w-4 h-4" />
            <span>Sao lưu</span>
          </button>
        </div>
      </div>

      {/* 2. LƯỚI CÁC THẺ PHÂN HỆ CHỨC NĂNG */}
      <div>
        <div className="mb-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Chức năng quản trị
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigateTab(card.id)}
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

                  {/* Tiêu đề & Mô tả */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5">
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

      {/* 3. THANH THÔNG TIN VẬN HÀNH */}
      <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Gói dịch vụ: <strong>{tenant.plan || 'ENTERPRISE'}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Không gian lưu trữ độc lập theo Tenant</span>
        </div>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Hỗ trợ phân quyền phân cấp 3 tầng (Tenant/Dept/User)</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Tải dữ liệu tức thời On-Demand</span>
        </div>
      </div>
    </div>
  );
};
