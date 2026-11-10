import React, { useState, useEffect, useCallback } from 'react';
import { useTenantContext } from '@/context/TenantContext';
import {
  SystemTenant,
  SystemActivityItem,
  StorageProviderItem,
  AuditLogEntry,
  PlanType,
  AdminUserDto,
  CreateAdminUserPayload,
  UpdateAdminUserPayload
} from './types';
import {
  getAdminUsersApi,
  getSystemTenantsApi,
  getSystemActivitiesApi,
  getStorageProvidersApi,
  getAuditLogsApi
} from './api/systemAdminQueries';
import {
  createAdminUserApi,
  updateAdminUserApi,
  changeUserStatusApi,
  deleteAdminUserApi,
  createSystemTenantApi,
  toggleTenantStatusApi,
  changeTenantPlanApi,
  deleteSystemTenantApi
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
  TenantDetailsModal,
  EditUserModal,
  AllocateQuotaModal
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
  // 2. LOCAL STATE / VIEWMODEL CACHE (Tương đương bộ nhớ DTO lưu tạm trên RAM của Controller)
  // ---------------------------------------------------------------------------------------
  // Dữ liệu danh sách người dùng & Phân trang (Pagination)
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false); // Flag cờ hiệu loading (để hiện spinner)

  // Dữ liệu cho các phần khác (Tenants, Nhật ký hoạt động, Cấu hình Storage, Audit Logs)
  const [tenants, setTenants] = useState<SystemTenant[]>([]);
  const [activities, setActivities] = useState<SystemActivityItem[]>([]);
  const [providers, setProviders] = useState<StorageProviderItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // State quản lý Trạng thái bật/tắt của các Dialog / Pop-up (Modals)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null);
  const [selectedQuickTenant, setSelectedQuickTenant] = useState<SystemTenant | null>(null);
  const [deepDetailTenantId, setDeepDetailTenantId] = useState<string | null>(null);
  const [deepPortalTab, setDeepPortalTab] = useState<string | undefined>(undefined);
  const [quotaUser, setQuotaUser] = useState<AdminUserDto | null>(null);

  // ---------------------------------------------------------------------------------------
  // 3. API SERVICE METHODS (Tương tự Service Layer gọi HTTP Client xuống Backend)
  // - Dùng useCallback: Để React ghi nhớ con trỏ hàm (function reference), không tạo lại hàm
  //   mỗi lần component re-render, giúp tối ưu hiệu năng và tránh re-run useEffect thừa thãi.
  // ---------------------------------------------------------------------------------------

  // [Query API] Lấy danh sách tài khoản quản trị viên với Phân trang & Tìm kiếm
  // URL Backend: GET /api/admin/users?pageNumber=...&pageSize=10&searchTerm=...
  const fetchUsers = useCallback(async (page: number, search: string) => {
    setIsLoadingUsers(true);
    try {
      const result = await getAdminUsersApi({
        pageNumber: page,
        pageSize: 10,
        searchTerm: search,
      });
      // Đổ dữ liệu từ BE DTO vào State
      setUsers(result.items);
      setCurrentPage(result.pageNumber);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // ---------------------------------------------------------------------------------------
  // 4. SIDE-EFFECT CONTROLLER (Tương đương Event Listener / Background Worker Trigger)
  // - useEffect lắng nghe sự thay đổi của các biến trong "Dependency Array" [...]
  // - Áp dụng kỹ thuật "Tab Lazy Fetching": Vào Tab nào thì MỚI gửi request tải dữ liệu Tab đó,
  //   không tải dồn dập toàn bộ hệ thống lúc mới đăng nhập (tiết kiệm băng thông BE).
  // ---------------------------------------------------------------------------------------

  // Trigger 1: Khi người dùng đang ở Tab 'tenants' HOẶC đổi trang (currentPage) HOẶC gõ Search (searchQuery)
  useEffect(() => {
    if (activeNav === 'tenants') {
      fetchUsers(currentPage, searchQuery);
    }
  }, [activeNav, fetchUsers, currentPage, searchQuery]);

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
  // Tương tự Task.WhenAll() trong C# .NET để thực hiện song song các truy vấn độc lập
  const loadDashboardData = useCallback(async () => {
    try {
      const [tList, aList, pList, lList] = await Promise.all([
        getSystemTenantsApi(),
        getSystemActivitiesApi(),
        getStorageProvidersApi(),
        getAuditLogsApi(),
      ]);
      setTenants(tList);
      setActivities(aList);
      setProviders(pList);
      setAuditLogs(lList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
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
      getAuditLogsApi().then(setAuditLogs).catch(() => { });
    }
  }, [activeNav]);

  // Trigger 5: Tự động nạp Storage Providers khi mở CreateTenantModal nếu chưa có
  useEffect(() => {
    if (isCreateModalOpen && providers.length === 0) {
      refreshProviders();
    }
  }, [isCreateModalOpen, providers.length, refreshProviders]);

  // ---------------------------------------------------------------------------------------
  // 5. COMMAND HANDLERS (Tương đương các API CUD: Create, Update, Delete)
  // - Gọi API xuống BE, sau đó cập nhật trực tiếp State ở Client hoặc fetch lại để đồng bộ UI.
  // ---------------------------------------------------------------------------------------

  // [POST API] Tạo tài khoản Admin Tenant mới -> POST /api/admin/users
  const handleCreateUser = async (payload: CreateAdminUserPayload) => {
    try {
      const newUser = await createAdminUserApi(payload);
      addToast('success', `Đã tạo thành công tài khoản cho ${newUser.fullName} (${newUser.email})!`);

      // Ghi log hoạt động phía client để hiển thị tức thời (Optimistic UI Update)
      const newActivity: SystemActivityItem = {
        id: `act-${Date.now()}`,
        title: `Account ${newUser.fullName} created`,
        timeAgo: 'Just now',
        actor: 'alex.mercer',
        type: 'upgrade',
      };
      setActivities((prev) => [newActivity, ...prev]);

      // Tải lại trang 1 để thấy bản ghi vừa tạo
      fetchUsers(1, '');
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi tạo tài khoản.');
    }
  };

  // [PUT API] Cập nhật thông tin người dùng -> PUT /api/admin/users/{id}
  const handleUpdateUser = async (id: string, payload: UpdateAdminUserPayload) => {
    try {
      const updated = await updateAdminUserApi(id, payload);
      // Cập nhật trực tiếp item trong mảng users mà không cần tốn 1 request GET lại
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
      );
      addToast('success', `Đã cập nhật thông tin người dùng ${updated.fullName}!`);
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi cập nhật người dùng.');
    }
  };



  // [PATCH/POST API] Khóa / Mở khóa tài khoản người dùng -> POST /api/admin/users/{id}/status
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      await changeUserStatusApi(userId, { isActive: nextStatus });
      // Cập nhật trạng thái trực tiếp trong danh sách để icon đổi màu ngay lập tức
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: nextStatus } : u))
      );
      addToast(
        nextStatus ? 'success' : 'warning',
        `Tài khoản đã được ${nextStatus ? 'kích hoạt' : 'tạm dừng'}.`
      );
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi đổi trạng thái tài khoản.');
    }
  };

  // [DELETE API] Xóa vĩnh viễn tài khoản người dùng -> DELETE /api/admin/users/{id}
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userEmail}"?`)) {
      try {
        await deleteAdminUserApi(userId);
        // Xóa item khỏi danh sách users trên giao diện
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        addToast('info', `Đã xóa tài khoản "${userEmail}".`);
      } catch (err: any) {
        addToast('error', err.message || 'Lỗi khi xóa tài khoản.');
      }
    }
  };

  // Mở màn hình quản trị sâu (Deep Portal) của một Tenant cụ thể
  const handleOpenDeepPortal = (userOrTenant: AdminUserDto | SystemTenant, targetTab?: string) => {
    let resolvedTenantId = userOrTenant.id;
    if ('tenantId' in userOrTenant && userOrTenant.tenantId) {
      resolvedTenantId = userOrTenant.tenantId;
    } else {
      const matched = tenants.find(
        (t) =>
          t.id === userOrTenant.id ||
          t.vacantAdminUserId === userOrTenant.id ||
          (t.adminEmail && (userOrTenant as any).email && t.adminEmail.toLowerCase() === (userOrTenant as any).email.toLowerCase())
      );
      if (matched) {
        resolvedTenantId = matched.id;
      }
    }

    setDeepDetailTenantId(resolvedTenantId);
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
          users={users}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          searchQuery={searchQuery}
          onPageChange={(page) => setCurrentPage(page)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onSelectUser={(u) => {
            // 1. Tìm Tenant thật tương ứng từ danh sách Doanh nghiệp
            const matchedTenant = tenants.find(
              (t) =>
                (u.tenantId && t.id === u.tenantId) ||
                (t.vacantAdminUserId && t.vacantAdminUserId === u.id) ||
                (t.adminEmail && u.email && t.adminEmail.toLowerCase() === u.email.toLowerCase()) ||
                (u.tenantName && t.name.toLowerCase() === u.tenantName.toLowerCase())
            );

            // 2. Phân giải Tenant ID thật: Không lấy u.id nếu u.tenantId rỗng do cựu admin đã bị offboard
            const resolvedTenantId = u.tenantId || matchedTenant?.id || u.id;
            const resolvedTenantName = matchedTenant?.name || u.tenantName || u.fullName;
            const resolvedStatus = matchedTenant?.status || (u.isActive ? 'Active' : 'Suspended');
            const resolvedIsInterim = matchedTenant?.isInterimManaged || (!u.tenantId && !u.isActive) || false;

            setSelectedQuickTenant({
              id: resolvedTenantId,
              name: resolvedTenantName,
              plan: matchedTenant?.plan || 'Enterprise',
              usersAssigned: matchedTenant?.usersAssigned || 1,
              storageUsed: matchedTenant?.storageUsed || '0 B',
              storageAllocated: matchedTenant?.storageAllocated || '0 B',
              storageDisplay: matchedTenant?.storageDisplay || 'Đang tải...',
              createdDate: matchedTenant?.createdDate || u.createdAt,
              status: resolvedStatus,
              adminEmail: matchedTenant?.adminEmail || u.email,
              adminId: u.id,
              adminFullName: u.fullName,
              region: matchedTenant?.region || 'Cloud Storage Pool',
              tenantCode: matchedTenant?.tenantCode || u.tenantCode,
              phoneNumber: u.phoneNumber,
              departmentName: u.departmentName,
              isInterimManaged: resolvedIsInterim,
              vacantAdminUserId: matchedTenant?.vacantAdminUserId || (!u.isActive ? u.id : null),
            });
          }}
          onOpenEditModal={(u) => setEditingUser(u)}
          onOpenAllocateQuotaModal={(u) => setQuotaUser(u)}
          onToggleStatus={handleToggleUserStatus}
          onDeleteUser={handleDeleteUser}
          onRefreshUsers={() => fetchUsers(currentPage, searchQuery)}
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
        <AuditLogsView logs={auditLogs} />
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
        onCreate={handleCreateUser}
        providers={providers}
      />

      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onUpdate={handleUpdateUser}
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

      <AllocateQuotaModal
        isOpen={!!quotaUser}
        onClose={() => setQuotaUser(null)}
        tenantUser={quotaUser}
        providers={providers}
        onSuccess={(msg) => {
          addToast('success', msg);
          fetchUsers(currentPage, searchQuery);
          getStorageProvidersApi().then(setProviders).catch(() => { });
        }}
      />
    </div>
  );
};
