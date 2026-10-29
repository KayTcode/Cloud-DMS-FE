import React from 'react';
import {
  LayoutGrid,
  Database,
  HardDrive,
  FileText,
  Settings,
  X,
  LogOut,
  Building2,
  Users,
  FolderTree,
  Layers,
  Trash2,
  Share2,
  ClipboardCheck
} from 'lucide-react';
import { NavItem } from '@/features/tenants/types';
import { useAuth } from '@/context/AuthContext';

// =========================================================================================
// SIDEBAR (CỘT MENU ĐIỀU HƯỚNG BÊN TRÁI)
// -----------------------------------------------------------------------------------------
// Mental Model cho BE Developer:
// - Đóng vai trò như một "Authorization Menu Filter" kết hợp "Navigation Event Emitter".
// - Kiểm tra Role của User hiện tại (SystemAdmin, TenantAdmin, DepartmentAdmin, Employee)
//   để sinh ra cây menu (Nav Items) phù hợp theo quyền hạn (Role-Based Access Control).
// - Khi người dùng click chọn 1 mục menu: Nó bắn sự kiện `onSelectNav(item.id)` ra ngoài
//   để Global State cập nhật `activeNav`, từ đó kích hoạt các Controller/View tương ứng tải dữ liệu.
// =========================================================================================

interface SidebarProps {
  activeNav: NavItem;                  // Mã tab hiện tại đang được chọn (ví dụ: 'dashboard', 'tenants')
  onSelectNav: (nav: NavItem) => void; // Delegate/Event Callback báo ra ngoài khi user click chọn tab
  isMobileOpen?: boolean;              // Trạng thái mở menu trên giao diện điện thoại
  onCloseMobile?: () => void;          // Callback đóng menu điện thoại
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onSelectNav,
  isMobileOpen,
  onCloseMobile,
}) => {
  // ---------------------------------------------------------------------------------------
  // 1. KIỂM TRA PHÂN QUYỀN (Tương tự Role Authorization Checks trong BE Controller)
  // ---------------------------------------------------------------------------------------
  const { user, logout } = useAuth();
  const role = user?.role || 'Employee';
  const isSysAdmin = role === 'SystemAdmin';
  const isTenantAdmin = role === 'TenantAdmin';
  const isDeptAdmin = role === 'DepartmentAdmin';

  // Nhãn phụ hiển thị dưới Logo thương hiệu
  const getPortalLabel = () => {
    switch (role) {
      case 'SystemAdmin':
        return 'SYSADMIN PORTAL';
      case 'TenantAdmin':
        return 'TENANT PORTAL';
      case 'DepartmentAdmin':
        return 'DEPT ADMIN PORTAL';
      case 'User':
      case 'Employee':
      default:
        return 'USER WORKSPACE';
    }
  };

  // Tên hiển thị đầy đủ của chức vụ người dùng
  const getRoleTitle = () => {
    switch (role) {
      case 'SystemAdmin':
        return 'System Administrator';
      case 'TenantAdmin':
        return 'Tenant Administrator';
      case 'DepartmentAdmin':
        return 'Department Administrator';
      case 'User':
      case 'Employee':
      default:
        return 'Team Member';
    }
  };

  // ---------------------------------------------------------------------------------------
  // 2. SINH DANH SÁCH MENU THEO VAI TRÒ (Tương tự Menu Provider Service trong BE)
  // - Mỗi đối tượng gồm: id (Mã tab duy nhất), label (Tiêu đề menu), icon (Icon minh họa).
  // ---------------------------------------------------------------------------------------
  const getNavItems = (): { id: NavItem; label: string; icon: React.ComponentType<{ className?: string }> }[] => {
    // Menu cho Quản trị viên toàn hệ thống
    if (isSysAdmin) {
      return [
        { id: 'hub', label: 'Trung tâm điều khiển', icon: Layers },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        { id: 'tenants', label: 'Tenants', icon: Database },
        { id: 'quota-requests', label: 'Duyệt Quota', icon: ClipboardCheck },
        { id: 'storage-providers', label: 'Storage Providers', icon: HardDrive },
        { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }
    // Menu cho Quản trị viên Tenant (Công ty / Khách hàng doanh nghiệp)
    if (isTenantAdmin) {
      return [
        { id: 'hub', label: 'Trung tâm điều khiển', icon: Layers },
        { id: 'dashboard', label: 'Tenant Overview', icon: LayoutGrid },
        { id: 'shared', label: 'Được chia sẻ', icon: Share2 },
        { id: 'tenants', label: 'Phòng ban & Nhân viên', icon: Building2 },
        { id: 'audit-logs', label: 'Nhật ký hoạt động', icon: FileText },
        { id: 'settings', label: 'Cài đặt Tenant', icon: Settings },
      ];
    }
    // Menu cho Trưởng phòng ban (Department Admin)
    if (isDeptAdmin) {
      return [
        { id: 'hub', label: 'Trung tâm điều khiển', icon: Layers },
        { id: 'dashboard', label: 'Tài liệu & Upload', icon: FolderTree },
        { id: 'shared', label: 'Được chia sẻ', icon: Share2 },
        { id: 'trash', label: 'Thùng rác phòng ban', icon: Trash2 },
        { id: 'tenants', label: 'Quản lý nhân viên', icon: Users },
        { id: 'storage-providers', label: 'Hạn mức & Quota', icon: HardDrive },
        { id: 'audit-logs', label: 'Nhật ký nhân viên', icon: FileText },
      ];
    }
    // Menu cho Nhân viên thông thường (End User / Employee)
    return [
      { id: 'dashboard', label: 'Tài liệu & My Drive', icon: FolderTree },
      { id: 'shared', label: 'Được chia sẻ', icon: Share2 },
      { id: 'trash', label: 'Thùng rác', icon: Trash2 },
      { id: 'storage-providers', label: 'Dung lượng lưu trữ', icon: HardDrive },
      { id: 'audit-logs', label: 'Nhật ký hoạt động', icon: FileText },
      { id: 'settings', label: 'Hồ sơ & Cài đặt', icon: Settings },
    ];
  };

  const navItems = getNavItems();

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Top brand header */}
        <div>
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              {/* CloudDMS Icon */}
              <div
                className={`w-10 h-10 rounded-xl ${isSysAdmin
                    ? 'bg-blue-600'
                    : isTenantAdmin
                      ? 'bg-indigo-600'
                      : isDeptAdmin
                        ? 'bg-emerald-600'
                        : 'bg-violet-600'
                  } flex items-center justify-center text-white shadow-xs shrink-0`}
              >
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  <path d="M12 13h.01" />
                  <path d="M12 16h.01" />
                </svg>
              </div>

              <div>
                <div className="font-bold text-slate-900 text-base leading-tight tracking-tight">
                  CloudDMS
                </div>
                <div
                  className={`text-[10px] font-bold ${isSysAdmin
                      ? 'text-blue-600'
                      : isTenantAdmin
                        ? 'text-indigo-600'
                        : isDeptAdmin
                          ? 'text-emerald-600'
                          : 'text-violet-600'
                    } tracking-wider uppercase mt-0.5`}
                >
                  {getPortalLabel()}
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* ----------------------------------------------------------------------------- */}
          {/* 3. VÒNG LẶP RENDER CÁC MỤC MENU (Tương tự foreach item in navItems trong Razor) */}
          {/* - Kiểm tra isActive: Nếu tab đang chọn trùng với id của menu thì bôi màu nổi bật */}
          {/* - Khi click: Gọi callback onSelectNav(item.id) báo lên MainLayout & TenantContext */}
          {/* ----------------------------------------------------------------------------- */}
          <nav className="mt-8 px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id; // Đang chọn tab này hay không?

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectNav(item.id); // Bắn sự kiện chuyển tab ra ngoài
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${isActive
                      ? isSysAdmin
                        ? 'bg-[#EEF4FF] text-blue-600'
                        : isTenantAdmin
                          ? 'bg-indigo-50 text-indigo-600'
                          : isDeptAdmin
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-violet-50 text-violet-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive
                        ? isSysAdmin
                          ? 'text-blue-600'
                          : isTenantAdmin
                            ? 'text-indigo-600'
                            : isDeptAdmin
                              ? 'text-emerald-600'
                              : 'text-violet-600'
                        : 'text-slate-500'
                      }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ----------------------------------------------------------------------------- */}
        {/* 4. USER PROFILE FOOTER & NÚT ĐĂNG XUẤT (LOGOUT)                               */}
        {/* - Hiển thị Avatar viết tắt (Initials), Họ tên và Vai trò hiện tại             */}
        {/* - Nút Logout: Kích hoạt hàm logout() từ AuthContext để dọn dẹp JWT/Session    */}
        {/* ----------------------------------------------------------------------------- */}
        <div className="p-3 space-y-2">
          <div className="p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg ${isSysAdmin
                    ? 'bg-blue-100 text-blue-700'
                    : isTenantAdmin
                      ? 'bg-indigo-100 text-indigo-700'
                      : isDeptAdmin
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-violet-100 text-violet-700'
                  } font-bold text-xs flex items-center justify-center shrink-0`}
              >
                {getInitials(user?.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName || 'Người dùng'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate">
                  {getRoleTitle()}
                </div>
              </div>
            </div>

            {/* Nút Đăng Xuất (Xóa token & Chuyển hướng về Login) */}
            <button
              onClick={logout}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

