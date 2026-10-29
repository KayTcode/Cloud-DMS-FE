import React, { ReactNode } from 'react';
import { UserCheck } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { NotificationDrawer } from './NotificationDrawer';
import { ToastContainer } from '@/components/common/Toast';
import { useTenantContext } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

// =========================================================================================
// MAIN LAYOUT (BỘ KHUNG GIAO DIỆN CHUẨN CỦA TOÀN BỘ HỆ THỐNG)
// -----------------------------------------------------------------------------------------
// Mental Model cho BE Developer:
// - Tương tự file `_Layout.cshtml` trong ASP.NET Core MVC hoặc master template (Blade/Thymeleaf).
// - Nó bao bọc lấy nội dung chính của mọi trang thông qua prop `children` (tương tự `@RenderBody()`).
// - Khung này tổ chức 4 thành phần cố định:
//     1. Top Banner (Cảnh báo mạo danh / Impersonation mode nếu đang đăng nhập hộ).
//     2. Sidebar (Cột Menu điều hướng bên trái, tự co giãn trên mobile/desktop).
//     3. TopHeader (Thanh tìm kiếm toàn cục, nút thông báo, badge hiển thị Role).
//     4. NotificationDrawer & ToastContainer (Ngăn kéo xem thông báo & các pop-up thông báo lỗi/thành công).
// =========================================================================================

interface MainLayoutProps {
  children: ReactNode; // Đại diện cho View con được lồng bên trong (giống @RenderBody())
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // ---------------------------------------------------------------------------------------
  // 1. LẤY THÔNG TIN ĐĂNG NHẬP HIỆN TẠI (Tương tự HttpContext.User trong .NET)
  // ---------------------------------------------------------------------------------------
  const { user } = useAuth();
  const role = user?.role || 'Employee';

  // ---------------------------------------------------------------------------------------
  // 2. LẤY TRẠNG THÁI TOÀN CỤC TỪ TENANT CONTEXT (Tương tự Global App State / Session Manager)
  // ---------------------------------------------------------------------------------------
  const {
    activeNav,             // Tab menu hiện đang được chọn
    handleSelectNav,       // Hàm kích hoạt khi click chọn tab trên menu
    isMobileMenuOpen,      // Trạng thái menu trên màn hình di động (Mở/Đóng)
    setIsMobileMenuOpen,
    searchQuery,           // Text tìm kiếm người dùng đang gõ trên Header
    setSearchQuery,
    isNotificationOpen,    // Trạng thái mở khay thông báo bên phải
    setIsNotificationOpen,
    notificationCount,     // Số lượng thông báo chưa đọc (hiển thị chấm đỏ)
    clearNotifications,    // Hàm xóa tất cả thông báo
    isImpersonating,       // Cờ hiệu xem SysAdmin có đang "đăng nhập ẩn danh" vào Tenant hay không
    handleExitImpersonate, // Hàm thoát chế độ đăng nhập ẩn danh
    tenant,                // Dữ liệu thông tin Tenant hiện hành
    toasts,                // Danh sách thông báo nổi (Toast notifications)
    handleDismissToast,    // Hàm đóng thông báo nổi
  } = useTenantContext();

  // ---------------------------------------------------------------------------------------
  // 3. RESOLVER TIÊU ĐỀ THEO VAI TRÒ & TAB (Tương tự Switch-case ViewBag.Title trong MVC)
  // - Dựa vào Role của người dùng và `activeNav` để hiển thị tiêu đề trang phù hợp trên TopHeader.
  // ---------------------------------------------------------------------------------------
  const getHeaderTitle = () => {
    if (role === 'TenantAdmin') {
      switch (activeNav) {
        case 'hub':
          return 'Trung tâm điều khiển';
        case 'tenants':
          return 'Phòng ban & Nhân viên';
        case 'audit-logs':
          return 'Nhật ký hoạt động';
        case 'dashboard':
          return 'Báo cáo & Thống kê';
        case 'settings':
          return 'Cài đặt Tenant';
        default:
          return 'Tenant Portal';
      }
    }

    if (role === 'DepartmentAdmin') {
      switch (activeNav) {
        case 'hub':
          return 'Trung tâm điều khiển';
        case 'dashboard':
          return 'Kho tài liệu & Upload';
        case 'tenants':
          return 'Quản lý nhân viên';
        case 'audit-logs':
          return 'Nhật ký nhân viên';
        default:
          return 'Department Portal';
      }
    }

    if (role === 'User' || role === 'Employee') {
      switch (activeNav) {
        case 'dashboard':
          return 'Tài liệu & My Drive';
        case 'trash':
          return 'Thùng rác';
        case 'storage-providers':
          return 'Dung lượng lưu trữ';
        case 'audit-logs':
          return 'Nhật ký hoạt động';
        case 'settings':
          return 'Hồ sơ & Cài đặt';
        default:
          return 'User Workspace';
      }
    }

    // Default SystemAdmin (Quản trị viên toàn hệ thống)
    switch (activeNav) {
      case 'hub':
        return 'Trung tâm điều khiển';
      case 'tenants':
        return 'Tenant & Account Management';
      case 'storage-providers':
        return 'Storage Providers';
      case 'quota-approvals':
        return 'Duyệt yêu cầu quota';
      case 'audit-logs':
        return 'System Audit Logs';
      case 'dashboard':
        return 'System Dashboard';
      case 'settings':
        return 'Platform Settings';
      default:
        return 'SysAdmin Portal';
    }
  };

  // ---------------------------------------------------------------------------------------
  // 4. BỐ CỤC KHUNG HTML (HTML LAYOUT SHELL)
  // ---------------------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex">
      {/* 4.1. Thanh cảnh báo khi SysAdmin đang ở chế độ Mạo Danh (Impersonation Banner) */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>
              IMPERSONATION ACTIVE: You are operating as{' '}
              <strong className="font-bold underline">{tenant.contactEmail}</strong> ({tenant.name}).
            </span>
            <button
              onClick={handleExitImpersonate}
              className="ml-auto bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-bold px-3 py-1 rounded transition-colors cursor-pointer"
            >
              Exit Impersonation
            </button>
          </div>
        </div>
      )}

      {/* 4.2. Cột Sidebar điều hướng bên trái */}
      <Sidebar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 4.3. Khối nội dung chính (Header trên cùng + Ruột trang ở giữa) */}
      <div className={`flex-1 flex flex-col min-w-0 lg:pl-64 ${isImpersonating ? 'pt-9' : ''}`}>
        {/* Thanh Header trên cùng */}
        <TopHeader
          title={getHeaderTitle()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          notificationCount={notificationCount}
        />

        {/* Thẻ <main> chứa ruột trang (children tương đương @RenderBody() trong MVC) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* 4.4. Ngăn kéo danh sách thông báo hệ thống (trượt ra từ bên phải) */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onClear={clearNotifications}
      />

      {/* 4.5. Khung hiển thị các Pop-up Toast thông báo (Thành công, Lỗi, Cảnh báo) */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};
