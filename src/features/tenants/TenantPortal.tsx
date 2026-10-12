import React, { useEffect } from 'react';
import { useTenantContext } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import {
  TenantBanner,
  TenantTabs,
  ImpersonateModal,
  SubscriptionModal,
} from '@/features/tenants/components';
import {
  TenantOverviewView,
  TenantUsersView,
  CreateDepartmentUserView,
  TenantDepartmentsView,
  TenantStorageView,
  TenantActivityView,
  TenantSettingsView,
  TenantHubView,
} from '@/features/tenants/views';
import { ArrowLeft } from 'lucide-react';

// =========================================================================================
// TENANT PORTAL (MÀN HÌNH ĐIỀU HÀNH DÀNH CHO QUẢN TRỊ VIÊN CỦA MỘT TENANT)
// -----------------------------------------------------------------------------------------
// Mental Model cho BE Developer:
// - Đóng vai trò như "Tenant Scope Controller" (Phạm vi dữ liệu gói gọn trong 1 Tenant / Doanh nghiệp).
// - Giải quyết Multi-tenancy:
//     + Nếu SysAdmin truy cập từ màn hình quản trị ngoài: Nhận `tenantId` qua `propTenantId` để xem chi tiết.
//     + Nếu là tài khoản TenantAdmin tự đăng nhập: Tự động lấy `user.tenantId` từ JWT Token / Claims.
// - Kích hoạt `refreshTenantData(effectiveTenantId)` để tải đồng bộ thông tin Tenant, phòng ban, nhân viên.
// - Điều phối các Sub-View bên trong (Overview, Users, Departments, Storage, Activity, Settings).
// =========================================================================================

interface TenantPortalProps {
  tenantId?: string; // ID của Tenant truyền vào khi SysAdmin soi dữ liệu của 1 Tenant cụ thể
}

export const TenantPortal: React.FC<TenantPortalProps> = ({ tenantId: propTenantId }) => {
  // ---------------------------------------------------------------------------------------
  // 1. RESOLVER TENANT ID HIỆU LỰC (Tương tự Tenant Identification Middleware trong BE)
  // ---------------------------------------------------------------------------------------
  const { user } = useAuth();
  // Ưu tiên propTenantId (nếu SysAdmin truyền vào), nếu không có thì lấy tenantId của User đang đăng nhập
  const effectiveTenantId = propTenantId || user?.tenantId;

  // ---------------------------------------------------------------------------------------
  // 2. LẤY STATE VÀ SERVICE METHODS TỪ GLOBAL TENANT CONTEXT
  // ---------------------------------------------------------------------------------------
  const {
    activeTab,                    // Tab con nội bộ đang chọn ('overview', 'users', 'departments', ...)
    setActiveTab,                 // Hàm chuyển đổi tab con
    tenant,                       // Thông tin DTO chi tiết của Tenant hiện hành
    events,                       // Danh sách sự kiện / Activity logs nội bộ
    users,                        // Danh sách nhân viên thuộc Tenant
    targetDeptForCreate,          // Phòng ban được chọn khi bấm nút "Thêm nhân viên vào phòng này"
    isSubscriptionModalOpen,      // Trạng thái mở modal Gói cước (Subscription)
    setIsSubscriptionModalOpen,
    isImpersonateModalOpen,       // Trạng thái mở modal Mạo danh (Impersonate)
    setIsImpersonateModalOpen,
    handleSuspendToggle,          // Service khóa/mở khóa Tenant
    handleDownloadBackup,         // Service tải tệp tin sao lưu dữ liệu
    handleConfirmImpersonate,     // Service xác nhận đăng nhập hộ vào Tenant
    handleOpenCreateDepartmentUser,// Service mở form tạo tài khoản nhân viên theo phòng ban
    handleUserCreated,            // Callback sau khi tạo nhân viên thành công
    handleUpdateTenant,           // Service cập nhật cấu hình Tenant
    setCurrentTenantId,           // Hàm set ID Tenant hiện hành vào Context
    refreshTenantData,            // Service nạp lại toàn bộ dữ liệu Tenant từ API Backend
  } = useTenantContext();

  // ---------------------------------------------------------------------------------------
  // 3. EFFECT ĐỒNG BỘ DỮ LIỆU TENANT (Tương tự Data Binding / Load Entity by ID)
  // - Khi ở Tab 'hub': KHÔNG nạp dữ liệu gì từ API (0 API load ban đầu).
  // - Khi người dùng chuyển sang các tab nghiệp vụ: Tự động nạp thông tin Tenant tương ứng từ BE.
  // ---------------------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab === 'hub') {
      return;
    }

    if (effectiveTenantId && effectiveTenantId !== tenant.id) {
      setCurrentTenantId(effectiveTenantId);
    } else if (effectiveTenantId) {
      refreshTenantData(effectiveTenantId);
    }
  }, [activeTab, effectiveTenantId, tenant.id, setCurrentTenantId, refreshTenantData]);

  // =======================================================================================
  // 4. JSX RENDER (Tương đương Tenant Sub-View Router)
  // - Khi activeTab === 'hub': Hiển thị màn hình trung tâm điều khiển (Bảng chọn chức năng).
  // - Khi ở các tab khác: Hiển thị thanh quay lại Hub, Banner, Tabs và màn hình nghiệp vụ chi tiết.
  // =======================================================================================
  return (
    <>
      {/* 4.0. SUB-VIEW 0: Màn hình Trung tâm Điều khiển Doanh nghiệp (0 API load ban đầu) */}
      {activeTab === 'hub' && (
        <TenantHubView
          tenant={tenant}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenCreateDepartmentUser={() => handleOpenCreateDepartmentUser()}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          onDownloadBackup={handleDownloadBackup}
        />
      )}

      {/* 4.1. CÁC MÀN HÌNH CHI TIẾT KHI ĐÃ CHỌN CHỨC NĂNG */}
      {activeTab !== 'hub' && (
        <>
          {/* Nút quay lại Menu chức năng chính */}
          <div className="mb-4">
            <button
              onClick={() => setActiveTab('hub')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Quay lại Trung tâm điều khiển Doanh nghiệp</span>
            </button>
          </div>

          {/* Khung hiển thị thông tin tóm tắt & các thao tác nhanh của Tenant */}
          <TenantBanner
            tenant={tenant}
            onSuspendToggle={handleSuspendToggle}
            onManageSubscriptions={() => setIsSubscriptionModalOpen(true)}
            onNavigateToTenants={() => setActiveTab('hub')}
          />
        </>
      )}

      {/* 4.3. Khu vực hiển thị nội dung của Tab con đang active */}
      {activeTab !== 'hub' && (
        <div className="tab-content-area">
          {/* Tab 1: Tổng quan số liệu Tenant (Dung lượng, Số user, Hoạt động gần đây) */}
          {activeTab === 'overview' && (
          <TenantOverviewView
            tenant={tenant}
            events={events}
            onImpersonate={() => setIsImpersonateModalOpen(true)}
            onDownloadBackup={handleDownloadBackup}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onCreateDepartmentUser={() => handleOpenCreateDepartmentUser()}
          />
        )}

        {/* Tab 2: Quản lý danh sách nhân viên thuộc Tenant */}
        {activeTab === 'users' && (
          <TenantUsersView
            users={users}
            onBackToOverview={() => setActiveTab('overview')}
            onCreateDepartmentUser={() => handleOpenCreateDepartmentUser()}
          />
        )}

        {/* Tab 3: Quản lý cơ cấu các phòng ban (Departments) */}
        {activeTab === 'departments' && (
          <TenantDepartmentsView
            onBackToOverview={() => setActiveTab('overview')}
            onCreateDepartmentUser={(dept) => handleOpenCreateDepartmentUser(dept)}
          />
        )}

        {/* Tab 3B: Form tạo mới nhân viên cho một phòng ban cụ thể */}
        {activeTab === 'create-department-user' && (
          <CreateDepartmentUserView
            onBack={() => setActiveTab('departments')}
            onUserCreated={handleUserCreated}
            defaultDepartment={targetDeptForCreate}
          />
        )}

        {/* Tab 4: Quản lý phân bổ dung lượng Cloud Storage cho từng phòng ban & tệp tin */}
        {activeTab === 'storage' && (
          <TenantStorageView
            tenant={tenant}
            onBackToOverview={() => setActiveTab('overview')}
            onCreateDepartmentUser={(dept) => handleOpenCreateDepartmentUser(dept)}
          />
        )}

        {/* Tab 5: Nhật ký thao tác của người dùng trong Tenant */}
        {activeTab === 'activity' && (
          <TenantActivityView
            events={events}
            onBackToOverview={() => setActiveTab('overview')}
          />
        )}

        {/* Tab 6: Cài đặt cấu hình riêng của Tenant (Tên, logo, liên hệ) */}
        {activeTab === 'settings' && (
          <TenantSettingsView
            tenant={tenant}
            onUpdateTenant={handleUpdateTenant}
            onBackToOverview={() => setActiveTab('overview')}
          />
        )}
      </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* 4.4. CÁC MODAL HỘP THOẠI CỦA TENANT                                                */}
      {/* --------------------------------------------------------------------------------- */}
      {/* Modal nâng cấp gói cước dịch vụ (Starter, Business, Enterprise) */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        tenant={tenant}
      />

      {/* Modal xác nhận đăng nhập ẩn danh (Impersonate) */}
      <ImpersonateModal
        isOpen={isImpersonateModalOpen}
        onClose={() => setIsImpersonateModalOpen(false)}
        tenant={tenant}
        onConfirm={handleConfirmImpersonate}
      />
    </>
  );
};

export default TenantPortal;
