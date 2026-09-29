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
  resetUserPasswordApi,
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
  SettingsView 
} from './views';
import { 
  CreateTenantModal, 
  TenantDetailsModal,
  EditUserModal,
  ResetPasswordModal
} from './components';
import { TenantPortal } from '@/features/tenants/TenantPortal';
import { ArrowLeft } from 'lucide-react';

export const SystemAdminPortal: React.FC = () => {
  const {
    activeNav,
    setActiveNav,
    searchQuery,
    addToast,
  } = useTenantContext();

  // Users Data & Pagination
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Other Sections Data
  const [tenants, setTenants] = useState<SystemTenant[]>([]);
  const [activities, setActivities] = useState<SystemActivityItem[]>([]);
  const [providers, setProviders] = useState<StorageProviderItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modals & Selection States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null);
  const [resettingUser, setResettingUser] = useState<AdminUserDto | null>(null);
  const [selectedQuickTenant, setSelectedQuickTenant] = useState<SystemTenant | null>(null);
  const [deepDetailTenantId, setDeepDetailTenantId] = useState<string | null>(null);

  // 1. Fetch Users with Pagination & Search
  const fetchUsers = useCallback(async (page: number, search: string) => {
    setIsLoadingUsers(true);
    try {
      const result = await getAdminUsersApi({
        pageNumber: page,
        pageSize: 10,
        searchTerm: search,
      });
      setUsers(result.items);
      setCurrentPage(result.pageNumber);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi tải danh sách người dùng.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsers(currentPage, searchQuery);
  }, [fetchUsers, currentPage, searchQuery]);

  // 2. Load other modules data
  useEffect(() => {
    const loadOverviewData = async () => {
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
    };
    loadOverviewData();
  }, []);

  // Handlers for User / Tenant CRUD
  const handleCreateUser = async (payload: CreateAdminUserPayload, plan: PlanType) => {
    try {
      const newUser = await createAdminUserApi(payload);
      addToast('success', `Đã tạo thành công tài khoản cho ${newUser.fullName} (${newUser.email})!`);
      
      // Also log activity
      const newActivity: SystemActivityItem = {
        id: `act-${Date.now()}`,
        title: `Account ${newUser.fullName} created (${plan} plan)`,
        timeAgo: 'Just now',
        actor: 'alex.mercer',
        type: 'upgrade',
      };
      setActivities((prev) => [newActivity, ...prev]);

      fetchUsers(1, '');
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi tạo tài khoản.');
    }
  };

  const handleUpdateUser = async (id: string, payload: UpdateAdminUserPayload) => {
    try {
      const updated = await updateAdminUserApi(id, payload);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
      );
      addToast('success', `Đã cập nhật thông tin người dùng ${updated.fullName}!`);
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi cập nhật người dùng.');
    }
  };

  const handleResetPassword = async (id: string, newPassword: string) => {
    try {
      await resetUserPasswordApi(id, { newPassword });
      addToast('success', 'Đã đặt lại mật khẩu thành công!');
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi đặt lại mật khẩu.');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      await changeUserStatusApi(userId, { isActive: nextStatus });
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

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userEmail}"?`)) {
      try {
        await deleteAdminUserApi(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        addToast('info', `Đã xóa tài khoản "${userEmail}".`);
      } catch (err: any) {
        addToast('error', err.message || 'Lỗi khi xóa tài khoản.');
      }
    }
  };

  const handleOpenDeepPortal = (user: AdminUserDto | SystemTenant) => {
    setDeepDetailTenantId(user.id);
    setActiveNav('tenants');
  };

  return (
    <div className="system-admin-portal">
      {/* 1. Dashboard View */}
      {activeNav === 'dashboard' && (
        <DashboardView
          tenants={tenants}
          activities={activities}
          onNavigateNav={setActiveNav}
          onSelectTenant={(t) => setSelectedQuickTenant(t)}
        />
      )}

      {/* 2. Tenant & User Management OR Deep Tenant Detail Portal */}
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
            // Map user to quick tenant preview
            setSelectedQuickTenant({
              id: u.tenantId || u.id,
              name: u.tenantName || u.fullName,
              plan: 'Enterprise',
              usersAssigned: 120,
              storageUsed: '420 GB',
              storageAllocated: '5 TB',
              storageDisplay: '420 GB / 5 TB',
              createdDate: u.createdAt,
              status: u.isActive ? 'Active' : 'Suspended',
              adminEmail: u.email,
              region: 'us-east-1 (N. Virginia)',
            });
          }}
          onOpenEditModal={(u) => setEditingUser(u)}
          onOpenResetPasswordModal={(u) => setResettingUser(u)}
          onToggleStatus={handleToggleUserStatus}
          onDeleteUser={handleDeleteUser}
          onOpenPortal={handleOpenDeepPortal}
        />
      )}

      {activeNav === 'tenants' && deepDetailTenantId && (
        <div className="space-y-4">
          <button
            onClick={() => setDeepDetailTenantId(null)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Accounts</span>
          </button>

          <TenantPortal />
        </div>
      )}

      {/* 3. Storage Providers View */}
      {activeNav === 'storage-providers' && (
        <StorageProvidersView
          providers={providers}
          onAddToast={addToast}
        />
      )}

      {/* 4. Audit Logs View */}
      {activeNav === 'audit-logs' && (
        <AuditLogsView logs={auditLogs} />
      )}

      {/* 5. Settings View */}
      {activeNav === 'settings' && (
        <SettingsView onAddToast={addToast} />
      )}

      {/* Modals */}
      <CreateTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateUser}
      />

      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onUpdate={handleUpdateUser}
      />

      <ResetPasswordModal
        user={resettingUser}
        isOpen={!!resettingUser}
        onClose={() => setResettingUser(null)}
        onReset={handleResetPassword}
      />

      <TenantDetailsModal
        tenant={selectedQuickTenant}
        onClose={() => setSelectedQuickTenant(null)}
        onToggleStatus={(tenantId) => toggleTenantStatusApi(tenantId, selectedQuickTenant?.status || 'Active')}
        onChangePlan={(tenantId, plan) => changeTenantPlanApi(tenantId, plan)}
        onOpenPortal={handleOpenDeepPortal}
      />
    </div>
  );
};
