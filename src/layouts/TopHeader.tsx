import React from 'react';
import { Search, Bell, Menu, ShieldCheck, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// =========================================================================================
// TOP HEADER (THANH TIÊU ĐỀ VÀ THANH CÔNG CỤ TRÊN CÙNG)
// -----------------------------------------------------------------------------------------
// Mental Model cho BE Developer:
// - Đóng vai trò như một "Global Request Toolbar".
// - Chứa ô Search Box dùng cơ chế Two-Way Binding:
//     Khi gõ chữ -> Kích hoạt `onSearchChange` cập nhật `searchQuery` trong Global Context.
//     Từ đó, các Component con (như SystemAdminPortal) lắng nghe biến `searchQuery` này
//     và tự động gửi request API có kèm `?searchTerm=...` xuống Backend.
// - Hiển thị huy hiệu định danh vai trò (Role Badge), chuông thông báo và trạng thái kết nối máy chủ.
// =========================================================================================

interface TopHeaderProps {
  title?: string;                              // Tiêu đề trang động truyền từ MainLayout
  onToggleMobileMenu?: () => void;             // Callback bật/tắt menu trên di động
  searchQuery: string;                         // Chuỗi tìm kiếm hiện tại từ Context
  onSearchChange: (query: string) => void;     // Callback cập nhật chuỗi tìm kiếm
  onOpenNotifications?: () => void;            // Callback mở ngăn kéo thông báo
  notificationCount?: number;                  // Số lượng thông báo chưa đọc
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  onToggleMobileMenu,
  searchQuery,
  onSearchChange,
  onOpenNotifications,
  notificationCount = 1,
}) => {
  const { user } = useAuth();
  const isSysAdmin = user?.role === 'SystemAdmin';

  const defaultTitle = isSysAdmin
    ? 'System Admin Portal'
    : 'Tenant Management > Acme Corp';

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* --------------------------------------------------------------------------------- */}
      {/* 1. KHỐI TIÊU ĐỀ TRANG & NÚT MENU MOBILE                                           */}
      {/* --------------------------------------------------------------------------------- */}
      <div className="flex items-center gap-3">
        {/* Nút Hamburger menu (chỉ hiện trên màn hình điện thoại) */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tiêu đề trang được xác định động theo Role và Tab hiện hành */}
        <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
          {title || defaultTitle}
        </h1>
      </div>

      {/* --------------------------------------------------------------------------------- */}
      {/* 2. Ô TÌM KIẾM TOÀN CỤC (GLOBAL SEARCH BOX)                                        */}
      {/* - Dữ liệu nhập vào đây lập tức đồng bộ lên Context và trigger API fetch ở các View */}
      {/* --------------------------------------------------------------------------------- */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search systems, logs or tenants..."
            className="w-full bg-slate-50/70 hover:bg-slate-100/60 focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 rounded-lg pl-9 pr-4 py-2 border border-slate-200/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      {/* --------------------------------------------------------------------------------- */}
      {/* 3. CÁC NÚT ĐIỀU KHIỂN & TRẠNG THÁI BÊN PHẢI                                      */}
      {/* --------------------------------------------------------------------------------- */}
      <div className="flex items-center gap-3">
        {/* Badge nhận diện Vai trò (Role Badge) */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold ${
          isSysAdmin
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : user?.role === 'TenantAdmin'
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : user?.role === 'DepartmentAdmin'
            ? 'bg-purple-50 border-purple-200 text-purple-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {isSysAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
          <span>
            {isSysAdmin
              ? 'System Admin'
              : user?.role === 'TenantAdmin'
              ? 'Tenant Admin'
              : user?.role === 'DepartmentAdmin'
              ? 'Dept Admin'
              : 'Team Member'}
          </span>
        </div>

        {/* Nút Chuông thông báo (kèm chấm đỏ nếu có thông báo mới) */}
        <button
          onClick={onOpenNotifications}
          className="w-9 h-9 rounded-full border border-slate-200/90 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors relative cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white absolute top-2 right-2" />
          )}
        </button>

        {/* Trạng thái kết nối Server (ONLINE) */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold tracking-wider whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>ONLINE</span>
        </div>
      </div>
    </header>
  );
};
