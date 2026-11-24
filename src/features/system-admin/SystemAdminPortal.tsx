import React, { useState, useEffect, useCallback } from 'react';
import { useTenantContext } from '@/context/TenantContext';
import {
  SystemTenant,
  SystemActivityItem,
  StorageProviderItem,
  AuditLogEntry,
  PlanType,
  CreateSystemTenantPayload,
} from './types';
import {
  getSystemTenantsApi,
  getSystemTenantsListApi,
  getSystemActivitiesApi,
  getStorageProvidersApi,
  getAuditLogsApi
} from './api/systemAdminQueries';
import {
  createSystemTenantApi,
  toggleTenantStatusApi,
  changeTenantPlanApi,
} from './api/systemAdminCommands';
import {
  DashboardView,
  TenantManagementView,
  StorageProvidersView,
  AuditLogsView,
  SettingsView,
  AdminHubView,
  QuotaRequestsView
} from './views';
import {
  CreateTenantModal,
  TenantDetailsModal
} from './components';
import { TenantPortal } from '@/features/tenants/TenantPortal';
import { ArrowLeft } from 'lucide-react';

// =========================================================================================
// SYSTEM ADMIN PORTAL (MÀN HÌNH ĐIỀU HÀNH DÀNH CHO ADMIN TOÀN HỆ THỐNG)
// -----------------------------------------------------------------------------------------
// Mental Model cho BE Developer:
// - Component này đóng vai trò như một "Master Controller" kết hợp "View Router" ở tầng FE.
// - Nó quản lý State (Bộ nhớ đệm DTO/ViewModel), kết nối Global State (Context),
//   và kích hoạt các Service API (Queries/Commands) để render ra các Sub-View tương ứng.
// =========================================================================================

export const SystemAdminPortal: React.FC = () => {
  // ---------------------------------------------------------------------------------------
  // 1. GLOBAL STATE (Tương đương Dependency Injection / Session Context trong BE)
  // - activeNav: Tab hiện tại đang chọn trên Sidebar (ví dụ: 'dashboard', 'tenants', ...)
  // - setActiveNav: Hàm chuyển tab
  // - searchQuery: Từ khóa tìm kiếm nhập từ thanh TopHeader
  // - addToast: Notification Service để hiện thông báo Pop-up (Success/Error)
  // ---------------------------------------------------------------------------------------
  const {
    activeNav,
    setActiveNav,
    searchQuery,
    addToast,
  } = useTenantContext();

  // ---------------------------------------------------------------------------------------
  // 2. LOCAL STATE / VIEWMODEL CACHE
  // ---------------------------------------------------------------------------------------
  // Dữ liệu danh sách Tổ chức (Tenants) & Phân trang trực tiếp từ GET /api/admin/tenants
  const [tenants, setTenants] = useState<SystemTenant[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  // Dữ liệu cho các phần khác (Nhật ký hoạt động, Cấu hình Storage, Audit Logs)
  const [activities, setActivities] = useState<SystemActivityItem[]>([]);
  const [providers, setProviders] = useState<StorageProviderItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);

  // State quản lý Trạng thái bật/tắt của các Dialog / Pop-up (Modals)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQuickTenant, setSelectedQuickTenant] = useState<SystemTenant | null>(null);
  const [deepDetailTenantId, setDeepDetailTenantId] = useState<string | null>(null);
  const [deepPortalTab, setDeepPortalTab] = useState<string | undefined>(undefined);

  // ---------------------------------------------------------------------------------------
  // 3. API SERVICE METHODS
  // ---------------------------------------------------------------------------------------

  // [Query API] Lấy danh sách Tổ chức (Tenants) với Phân trang, Tìm kiếm & Lọc trạng thái
  // URL Backend: GET /api/admin/tenants?pageNumber=...&pageSize=10&searchTerm=...
  const fetchTenants = useCallback(async (page: number, search: string) => {
    setIsLoadingTenants(true);
    try {
      const result = await getSystemTenantsApi({
        pageNumber: page,
        pageSize: 10,
        searchTerm: search,
      });
      setTenants(result.items);
      setCurrentPage(result.pageNumber);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      console.error('Error fetching system tenants:', err);
    } finally {
      setIsLoadingTenants(false);
    }
  }, []);

  // ---------------------------------------------------------------------------------------
  // 4. SIDE-EFFECT CONTROLLER
  // ---------------------------------------------------------------------------------------

  // Trigger 1: Khi người dùng đang ở Tab 'tenants' HOẶC đổi trang HOẶC gõ Search
  useEffect(() => {
    if (activeNav === 'tenants') {
      fetchTenants(currentPage, searchQuery);
    }
  }, [activeNav, fetchTenants, currentPage, searchQuery]);

  // [Query API] Tải danh sách nhà cung cấp lưu trữ (S3, Azure, Google Drive, Local, MinIO)
  const refreshProviders = useCallback(async () => {
    try {
      const pList = await getStorageProvidersApi();
      setProviders(pList);
    } catch (err) {
      console.error('Failed to load storage providers:', err);
    }
  }, []);

  // [Query API] Tải toàn bộ dữ liệu thống kê cho Dashboard View (Gộp 4 API bằng Promise.all)
  const loadDashboardData = useCallback(async () => {
    try {
      const [tList, aList, pList, lList] = await Promise.all([
        getSystemTenantsListApi(),
        getSystemActivitiesApi(),
        getStorageProvidersApi(),
        getAuditLogsApi().catch(() => []),
      ]);
      setTenants(tList);
      setActivities(aList);
      setProviders(pList);
      setAuditLogs(lList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, []);

  // [Query API] Tải danh sách nhật ký kiểm toán hệ thống từ backend
  const fetchAuditLogs = useCallback(async () => {
    setIsLoadingAuditLogs(true);
    setAuditLogsError(null);
    try {
      const logs = await getAuditLogsApi(1, 100);
      setAuditLogs(logs);
    } catch (err: any) {
      const msg = err.message || 'Không thể tải nhật ký kiểm toán hệ thống.';
      setAuditLogsError(msg);
      setAuditLogs([]);
    } finally {
      setIsLoadingAuditLogs(false);
    }
  }, []);

  // Trigger 2: Chỉ khi bấm vào Tab 'dashboard' thì mới kích hoạt nạp thống kê
  useEffect(() => {
    if (activeNav === 'dashboard') {
      loadDashboardData();
    }
  }, [activeNav, loadDashboardData]);

  // Trigger 3: Chỉ khi bấm vào Tab 'storage-providers' thì mới fetch danh sách Provider
  useEffect(() => {
    if (activeNav === 'storage-providers') {
      refreshProviders();
    }
  }, [activeNav, refreshProviders]);

  // Trigger 4: Chỉ khi bấm vào Tab 'audit-logs' thì mới fetch lịch sử kiểm toán hệ thống
  useEffect(() => {
    if (activeNav === 'audit-logs') {
      fetchAuditLogs();
    }
  }, [activeNav, fetchAuditLogs]);

  // Trigger 5: Tự động nạp Storage Providers khi mở CreateTenantModal nếu chưa có
  useEffect(() => {
    if (isCreateModalOpen && providers.length === 0) {
      refreshProviders();
    }
  }, [isCreateModalOpen, providers.length, refreshProviders]);

  // ---------------------------------------------------------------------------------------
  // 5. COMMAND HANDLERS
  // ---------------------------------------------------------------------------------------

  // [POST API] Tạo Doanh nghiệp (Tenant) mới -> POST /api/admin/tenants
  const handleCreateTenant = async (payload: CreateSystemTenantPayload) => {
    try {
      const newTenant = await createSystemTenantApi(payload);
      addToast('success', `Đã tạo thành công tổ chức ${newTenant.name || payload.name}!`);

      // Ghi log hoạt động phía client để hiển thị tức thời (Optimistic UI Update)
      const newActivity: SystemActivityItem = {
        id: `act-${Date.now()}`,
        title: `Tổ chức ${newTenant.name || payload.name} đã được khởi tạo`,
        timeAgo: 'Vừa xong',
        actor: 'System Admin',
        type: 'upgrade',
      };
      setActivities((prev) => [newActivity, ...prev]);

      // Tải lại trang 1 để thấy bản ghi vừa tạo
      fetchTenants(1, '');
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi tạo tổ chức.');
    }
  };

  // Mở màn hình quản trị sâu (Deep Portal) của một Tenant cụ thể
  const handleOpenDeepPortal = (tenant: SystemTenant, targetTab?: string) => {
    setDeepDetailTenantId(tenant.id);
    setDeepPortalTab(targetTab || 'departments');
    setActiveNav('tenants');
  };

  // =======================================================================================
  // 6. JSX RENDER (Tương đương View Engine / Switch-Case điều hướng màn hình con)
  // - FE ở đây là SPA (Single Page Application): Không reload lại toàn bộ trang web
  //   mà dựa vào biến `activeNav` để quyết định Component (Sub-view) nào được hiển thị ra DOM.
  // - Props truyền vào các component con giống như truyền ViewModel và Action Delegate/Callback trong C#.
  // =======================================================================================
  return (
    <div className="system-admin-portal">
      {/* --------------------------------------------------------------------------------- */}
      {/* THANH ĐIỀU HƯỚNG QUAY LẠI HUB (Google Drive Breadcrumb style)                    */}
      {/* --------------------------------------------------------------------------------- */}
      {activeNav !== 'hub' && !deepDetailTenantId && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setActiveNav('hub')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full transition-all cursor-pointer shadow-2xs"
            title="Quay về bảng chọn chức năng chính"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Trung tâm điều khiển</span>
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* SUB-VIEW 0: Màn hình Trung tâm Điều khiển (Bảng chọn chức năng - 0 API load)      */}
      {/* --------------------------------------------------------------------------------- */}
      {(activeNav === 'hub' || !activeNav) && (
        <AdminHubView
          onNavigate={(nav) => setActiveNav(nav)}
          onOpenCreateTenantModal={() => setIsCreateModalOpen(true)}
        />
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* SUB-VIEW 1: Màn hình Tổng quan Dashboard (Thống kê tài nguyên & Hoạt động)        */}
      {/* --------------------------------------------------------------------------------- */}
      {activeNav === 'dashboard' && (
        <DashboardView
          tenants={tenants}
          activities={activities}
          providers={providers}
          auditLogs={auditLogs}
          totalUsersCount={totalCount}
          onNavigateNav={setActiveNav}
          onSelectTenant={(t) => setSelectedQuickTenant(t)}
        />
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* SUB-VIEW 2: Màn hình Quản lý Người dùng & Tenant                                 */}
      {/* Điều kiện: Đang ở tab 'tenants' VÀ không xem chi tiết sâu của 1 Tenant cụ thể     */}
      {/* --------------------------------------------------------------------------------- */}
      {activeNav === 'tenants' && !deepDetailTenantId && (
        <TenantManagementView
          tenants={tenants}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          searchQuery={searchQuery}
          onPageChange={(page) => setCurrentPage(page)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onSelectTenant={(t) => setSelectedQuickTenant(t)}
          onRefreshTenants={() => fetchTenants(currentPage, searchQuery)}
        />
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* SUB-VIEW 2B: Chế độ Drill-down (Xem sâu vào một Tenant cụ thể)                     */}
      {/* Hiển thị TenantPortal con với đầy đủ quyền quản lý nội bộ của Tenant đó           */}
      {/* --------------------------------------------------------------------------------- */}
      {activeNav === 'tenants' && deepDetailTenantId && (
        <div className="space-y-4">
          <button
            onClick={() => setDeepDetailTenantId(null)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách tài khoản</span>
          </button>

          <TenantPortal tenantId={deepDetailTenantId} initialTab={deepPortalTab as any} />
        </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* SUB-VIEW 3: Màn hình Quản lý Nhà cung cấp lưu trữ (S3, Azure, Google Drive, ...)  */}
      {/* --------------------------------------------------------------------------------- */}
      {activeNav === 'storage-providers' && (
        <StorageProvidersView
          providers={providers}
          onAddToast={addToast}
          onProvidersChange={refreshProviders}
        />
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* SUB-VIEW 3b: Màn hình Phê duyệt Yêu cầu Quota của Tenant (Quota Requests)          */}
      {/* --------------------------------------------------------------------------------- */}
      {(activeNav === 'quota-requests' || activeNav === 'quota-approvals') && (
        <QuotaRequestsView />
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* SUB-VIEW 4: Màn hình Nhật ký kiểm toán hệ thống (Audit Logs)                       */}
      {/* --------------------------------------------------------------------------------- */}
      {activeNav === 'audit-logs' && (
        <AuditLogsView
          logs={auditLogs}
          isLoading={isLoadingAuditLogs}
          error={auditLogsError}
          onRefresh={fetchAuditLogs}
        />
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* SUB-VIEW 5: Màn hình Cấu hình hệ thống (Settings)                                 */}
      {/* --------------------------------------------------------------------------------- */}
      {activeNav === 'settings' && (
        <SettingsView onAddToast={addToast} />
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* 7. DIALOGS & POP-UPS (CÁC MODAL FORM NHẬP LIỆU)                                    */}
      {/* Chỉ hiển thị đè lên màn hình khi biến isOpen === true                             */}
      {/* --------------------------------------------------------------------------------- */}
      <CreateTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTenant}
        providers={providers}
      />

      <TenantDetailsModal
        tenant={selectedQuickTenant}
        onClose={() => setSelectedQuickTenant(null)}
        onToggleStatus={(tenantId) => toggleTenantStatusApi(tenantId, selectedQuickTenant?.status || 'Active')}
        onChangePlan={(tenantId, plan) => changeTenantPlanApi(tenantId, plan)}
        onOpenPortal={handleOpenDeepPortal}
        onQuotaUpdated={() => {
          loadDashboardData();
          getStorageProvidersApi().then(setProviders).catch(() => { });
          addToast('success', 'Hạn mức Quota của Tenant đã được cập nhật!');
        }}
      />
    </div>
  );
};
