import React, { useEffect, useState } from 'react';
import { useTenantContext } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { TenantBanner, TenantTabs, ImpersonateModal, SubscriptionModal } from '@/features/tenants/components';
import {
  TenantOverviewView,
  CreateDepartmentUserView,
  TenantDepartmentsView,
  TenantDepartmentDetailView,
  TenantSettingsView,
  TenantHubView,
  TenantQuotaView,
} from '@/features/tenants/views';
import { ActiveTab } from '@/features/tenants/types';
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
  initialTab?: ActiveTab;
}

export const TenantPortal: React.FC<TenantPortalProps> = ({ tenantId: propTenantId, initialTab }) => {
  // ---------------------------------------------------------------------------------------
  // 1. LẤY STATE VÀ SERVICE METHODS TỪ GLOBAL TENANT CONTEXT
  // ---------------------------------------------------------------------------------------
  const {
    activeTab, // Tab con nội bộ đang chọn ('overview', 'departments', ...)
    setActiveTab, // Hàm chuyển đổi tab con
    tenant, // Thông tin DTO chi tiết của Tenant hiện hành
    events, // Danh sách sự kiện / Activity logs nội bộ
    users, // Danh sách nhân viên thuộc Tenant
    targetDeptForCreate, // Phòng ban được chọn khi bấm nút "Thêm nhân viên vào phòng này"
    isSubscriptionModalOpen, // Trạng thái mở modal Gói cước (Subscription)
    setIsSubscriptionModalOpen,
    isImpersonateModalOpen, // Trạng thái mở modal Mạo danh (Impersonate)
    setIsImpersonateModalOpen,
    handleSuspendToggle, // Service khóa/mở khóa Tenant
    handleDownloadBackup, // Service tải tệp tin sao lưu dữ liệu
    handleConfirmImpersonate, // Service xác nhận đăng nhập hộ vào Tenant
    handleOpenCreateDepartmentUser, // Service mở form tạo tài khoản nhân viên theo phòng ban
    handleUserCreated, // Callback sau khi tạo nhân viên thành công
    handleUpdateTenant, // Service cập nhật cấu hình Tenant
    setCurrentTenantId, // Hàm set ID Tenant hiện hành vào Context
    refreshTenantData, // Service nạp lại toàn bộ dữ liệu Tenant từ API Backend
  } = useTenantContext();

  const { user } = useAuth();
  const [openedDepartmentId, setOpenedDepartmentId] = useState<string | null>(null);
  const effectiveTenantId = propTenantId || user?.tenantId;

  // Tự động chuyển tab ban đầu nếu có prop initialTab (ví dụ SysAdmin bấm vào Quản lý Phòng ban)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, setActiveTab]);

  // Tenant Admin chỉ quản lý theo Phòng ban (Department), tự động chuyển hướng nếu activeTab là users
  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'activity') {
      setActiveTab('departments');
    }
  }, [activeTab, setActiveTab]);

  // ---------------------------------------------------------------------------------------
  // 3. EFFECT ĐỒNG BỘ DỮ LIỆU TENANT (Tương tự Data Binding / Load Entity by ID)
  // - Khi ở Tab 'hub': KHÔNG nạp dữ liệu gì từ API (0 API load ban đầu).
  // - Khi người dùng chuyển sang các tab nghiệp vụ: Tự động nạp thông tin Tenant tương ứng từ BE.
  // ---------------------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'departments') {
      setOpenedDepartmentId(null);
    }
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
        <div className="space-y-3 mb-4">
          {/* Nút quay lại Menu chức năng chính */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveTab('hub')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full shadow-2xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Trung tâm điều khiển Doanh nghiệp</span>
            </button>
          </div>

          {/* Khung hiển thị thông tin tóm tắt & các thao tác nhanh của Tenant */}
          <TenantBanner
            tenant={tenant}
            onSuspendToggle={handleSuspendToggle}
            onManageSubscriptions={() => setIsSubscriptionModalOpen(true)}
            onNavigateToTenants={() => setActiveTab('hub')}
          />

          {/* Thanh chuyển Tab điều hướng nhanh giữa các chức năng con */}
          <TenantTabs activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
        </div>
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

          {/* Tab 3: Quản lý cơ cấu các phòng ban (Departments) */}
          {(activeTab === 'departments' || activeTab === 'users') && (
            openedDepartmentId ? (
              <TenantDepartmentDetailView
                tenantId={effectiveTenantId ?? undefined}
                departmentId={openedDepartmentId}
                onBack={() => setOpenedDepartmentId(null)}
                onCreateUser={() => handleOpenCreateDepartmentUser(openedDepartmentId)}
              />
            ) : (
              <TenantDepartmentsView
                onBackToOverview={() => setActiveTab('overview')}
                onCreateDepartmentUser={(dept) => handleOpenCreateDepartmentUser(dept)}
                onOpenDepartment={(deptId) => setOpenedDepartmentId(deptId)}
              />
            )
          )}

          {/* Tab 3B: Form tạo mới nhân viên cho một phòng ban cụ thể */}
          {activeTab === 'create-department-user' && (
            <CreateDepartmentUserView
              onBack={() => setActiveTab('departments')}
              onUserCreated={handleUserCreated}
              defaultDepartment={targetDeptForCreate}
            />
          )}

          {/* Tab 4B: Quản lý Hạn mức & Phê duyệt Quota */}
          {activeTab === 'quota' && <TenantQuotaView tenant={tenant} onBackToOverview={() => setActiveTab('overview')} />}

          {/* Tab 6: Cài đặt cấu hình riêng của Tenant (Tên, logo, liên hệ) */}
          {activeTab === 'settings' && (
            <TenantSettingsView tenant={tenant} onUpdateTenant={handleUpdateTenant} onBackToOverview={() => setActiveTab('overview')} />
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* 4.4. CÁC MODAL HỘP THOẠI CỦA TENANT                                                */}
      {/* --------------------------------------------------------------------------------- */}
      {/* Modal nâng cấp gói cước dịch vụ (Starter, Business, Enterprise) */}
      <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} tenant={tenant} />

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
