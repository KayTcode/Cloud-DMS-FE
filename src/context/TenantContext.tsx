import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  ActiveTab,
  NavItem,
  TenantInfo,
  TenantEvent,
  TenantUser,
} from '@/features/tenants/types';
import { initialTenant, initialEvents } from '@/data/tenantMockData';
import { ToastMessage } from '@/types/common.types';
import { useAuth } from '@/context/AuthContext';
import {
  toggleSuspendTenant,
  createTenantUser,
  createDepartmentAdminApi,
  allocateDepartmentQuotaApi,
  getTenantDepartments,
  getTenantUsers,
  getTenantStorageQuota,
  TenantQuotaData,
  exportTenantBackup,
  updateTenantSettings,
} from '@/features/tenants/api';
import { CreateDepartmentAdminPayload, Department } from '@/features/tenants/types';
import { notificationApi, NotificationDto } from '@/features/notifications';

interface TenantContextType {
  // Navigation & Tabs
  activeNav: NavItem;
  setActiveNav: (nav: NavItem) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  targetDeptForCreate: string | undefined;
  setTargetDeptForCreate: (dept?: string) => void;

  // Search & Mobile Shell
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;

  // Notifications & Drawer
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  notificationCount: number;
  notifications: NotificationDto[];
  notificationsLoading: boolean;
  notificationsHasMore: boolean;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Modals & Impersonation
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (open: boolean) => void;
  isImpersonateModalOpen: boolean;
  setIsImpersonateModalOpen: (open: boolean) => void;
  isImpersonating: boolean;

  // Real Data
  tenant: TenantInfo;
  events: TenantEvent[];
  users: TenantUser[];
  departments: Department[];
  quotaData: TenantQuotaData | null;
  isLoadingData: boolean;
  isLoadingDepartments: boolean;
  refreshDepartments: () => Promise<void>;
  refreshTenantData: (targetIdOverride?: string) => Promise<void>;
  setCurrentTenantId: (id: string, initialMeta?: Partial<TenantInfo>) => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
  handleDismissToast: (id: string) => void;

  // Actions
  handleSuspendToggle: () => Promise<void>;
  handleDownloadBackup: () => Promise<void>;
  handleConfirmImpersonate: () => void;
  handleExitImpersonate: () => void;
  handleOpenCreateDepartmentUser: (deptName?: string) => void;
  handleUserCreated: (newUser: TenantUser) => Promise<void>;
  handleCreateDepartmentAdmin: (payload: CreateDepartmentAdminPayload) => Promise<boolean>;
  handleAllocateDepartmentQuota: (departmentId: string, quotaGB: number) => Promise<boolean>;
  handleUpdateTenant: (updated: Partial<TenantInfo>) => Promise<void>;
  handleSelectNav: (nav: NavItem) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();

  const getInitialNav = useCallback((role?: string): NavItem => {
    switch (role) {
      case 'SystemAdmin':
        return 'hub'; // SysAdmin: Trung tâm điều khiển / Chọn chức năng (0 API load ban đầu)
      case 'TenantAdmin':
        return 'hub'; // TenantAdmin: Màn hình chọn chức năng (0 API load ban đầu)
      case 'DepartmentAdmin':
        return 'hub'; // DeptAdmin: Trung tâm điều khiển (0 API load ban đầu)
      case 'User':
      case 'Employee':
      default:
        return 'dashboard'; // User: Tài liệu & My Drive
    }
  }, []);

  const [activeNav, setActiveNav] = useState<NavItem>(() => getInitialNav(authUser?.role));

  useEffect(() => {
    if (authUser?.role) {
      const initial = getInitialNav(authUser.role);
      setActiveNav(initial);
      if (authUser.role === 'TenantAdmin' || authUser.role === 'DepartmentAdmin') {
        setActiveTab('hub');
      }
    }
  }, [authUser?.role, getInitialNav]);

  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    authUser?.role === 'TenantAdmin' ? 'hub' : 'overview'
  );
  const [tenant, setTenant] = useState<TenantInfo>(initialTenant);
  const [events, setEvents] = useState<TenantEvent[]>(initialEvents);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [quotaData, setQuotaData] = useState<TenantQuotaData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState<boolean>(false);
  const [targetDeptForCreate, setTargetDeptForCreate] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsHasMore, setNotificationsHasMore] = useState(false);
  const notificationsPageRef = useRef(1);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isImpersonateModalOpen, setIsImpersonateModalOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'warning' | 'info' | 'error', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSuspendToggle = async () => {
    const newStatus = await toggleSuspendTenant(tenant.id, tenant.status);
    setTenant((prev) => ({ ...prev, status: newStatus }));

    addToast(
      newStatus === 'ACTIVE' ? 'success' : 'warning',
      `Tenant ${tenant.name} has been ${newStatus.toLowerCase()}.`
    );

    const newEvent: TenantEvent = {
      id: `evt-${Date.now()}`,
      text: `Tenant status changed to ${newStatus}`,
      timeAgo: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    };
    setEvents((prev) => [newEvent, ...prev]);
  };

  /**
   * Fetches real Quota, Departments, and Users for a Tenant from Database
   */
  const refreshTenantData = useCallback(async (targetIdOverride?: string) => {
    const targetId = targetIdOverride || authUser?.tenantId || tenant.id;
    if (!targetId || targetId === '11111111-1111-1111-1111-111111111111') {
      return;
    }

    setIsLoadingData(true);
    setIsLoadingDepartments(true);

    try {
      const [quotaRes, deptsRes, usersRes] = await Promise.allSettled([
        getTenantStorageQuota(targetId),
        getTenantDepartments(targetId),
        getTenantUsers(targetId),
      ]);

      let loadedQuota: TenantQuotaData | null = null;
      if (quotaRes.status === 'fulfilled' && quotaRes.value) {
        loadedQuota = quotaRes.value;
        setQuotaData(loadedQuota);
      }

      let loadedDepts: Department[] = [];
      if (deptsRes.status === 'fulfilled') {
        loadedDepts = deptsRes.value;
        setDepartments(loadedDepts);
      }

      let loadedUsers: TenantUser[] = [];
      if (usersRes.status === 'fulfilled') {
        loadedUsers = usersRes.value;
        setUsers(loadedUsers);
      }

      // Sync headcount in departments from real users list
      if (loadedDepts.length > 0 && loadedUsers.length > 0) {
        const syncedDepts = loadedDepts.map((d) => {
          const matchCount = loadedUsers.filter((u) => u.department === d.name).length;
          return {
            ...d,
            headCount: matchCount > 0 ? matchCount : d.headCount,
          };
        });
        setDepartments(syncedDepts);
      }

      // Update tenant info state
      setTenant((prev) => {
        const qBytes = loadedQuota?.storageQuotaBytes ?? prev.storageQuotaBytes ?? 0;
        const uBytes = loadedQuota?.storageUsedBytes ?? prev.storageUsedBytes ?? 0;
        const allocDeptsBytes = loadedQuota?.allocatedToDepartmentsBytes
          ?? loadedDepts.reduce((acc, d) => acc + (d.storageQuotaBytes ?? ((d.allocatedStorageGB || 0) * (1024 ** 3))), 0);
        const effectiveAllocatedBytes = Math.max(allocDeptsBytes, uBytes);
        const availBytes = Math.max(0, qBytes - effectiveAllocatedBytes);
        const usagePct = qBytes > 0 ? Math.round((effectiveAllocatedBytes / qBytes) * 100) : 0;

        const allocatedTB = Number((qBytes / (1024 ** 4)).toFixed(3));
        const usedTB = Number((effectiveAllocatedBytes / (1024 ** 4)).toFixed(3));

        return {
          ...prev,
          id: targetId,
          name: loadedQuota?.tenantName || prev.name,
          licenseUsed: loadedUsers.length,
          departmentsCount: loadedDepts.length,
          diskAllocatedTB: allocatedTB > 0 ? allocatedTB : prev.diskAllocatedTB,
          diskUsedTB: usedTB > 0 ? usedTB : prev.diskUsedTB,
          storageQuotaBytes: qBytes,
          storageUsedBytes: uBytes,
          allocatedToDepartmentsBytes: effectiveAllocatedBytes,
          availableBytes: availBytes,
          storageProviderName: loadedQuota?.storageProviderName,
          usagePercentage: usagePct,
        };
      });
    } catch (err) {
      console.error('[TenantContext] Error refreshing real tenant data:', err);
    } finally {
      setIsLoadingData(false);
      setIsLoadingDepartments(false);
    }
  }, [authUser?.tenantId, tenant.id]);

  const refreshDepartments = async () => {
    setIsLoadingDepartments(true);
    try {
      const depts = await getTenantDepartments(tenant.id);
      setDepartments(depts);
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  const setCurrentTenantId = useCallback((id: string, initialMeta?: Partial<TenantInfo>) => {
    if (initialMeta) {
      setTenant((prev) => ({
        ...prev,
        ...initialMeta,
        id,
      }));
    } else {
      setTenant((prev) => ({ ...prev, id }));
    }
    refreshTenantData(id);
  }, [refreshTenantData]);

  // Initial load when tenantId is available from Auth user (e.g. Tenant Admin)
  useEffect(() => {
    const isRegularUser = authUser?.role === 'User' || authUser?.role === 'Employee';
    if (!isRegularUser) {
      if (authUser?.tenantId && authUser.tenantId !== tenant.id) {
        setCurrentTenantId(authUser.tenantId);
      } else if (authUser?.tenantId) {
        refreshTenantData(authUser.tenantId);
      }
    }
  }, [authUser?.tenantId, authUser?.role, setCurrentTenantId, refreshTenantData]);

  const handleDownloadBackup = async () => {
    addToast('info', `Preparing database backup export for ${tenant.name}...`);
    const result = await exportTenantBackup(tenant.id);
    setTimeout(() => {
      addToast('success', `Database backup ready: ${result.filename} (1.2 GB)`);
    }, 1200);
  };

  const handleConfirmImpersonate = () => {
    setIsImpersonating(true);
    addToast('success', `Active session switched: Impersonating ${tenant.contactEmail}`);
  };

  const handleExitImpersonate = () => {
    setIsImpersonating(false);
    addToast('info', 'Exited impersonation mode. Returned to System Admin session.');
  };

  const handleOpenCreateDepartmentUser = (deptName?: string) => {
    setTargetDeptForCreate(deptName);
    setActiveTab('create-department-user');
  };

  const handleUserCreated = async (newUser: TenantUser) => {
    const created = await createTenantUser(tenant.id, {
      name: newUser.name,
      email: newUser.email,
      department: newUser.department,
      role: newUser.role,
    });

    setUsers((prev) => [created, ...prev]);
    setTenant((prev) => ({
      ...prev,
      licenseUsed: prev.licenseUsed + 1,
    }));

    const newEvent: TenantEvent = {
      id: `evt-${Date.now()}`,
      text: `User ${created.name} added to ${created.department} department`,
      timeAgo: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'user',
    };
    setEvents((prev) => [newEvent, ...prev]);

    addToast(
      'success',
      `Đã tạo tài khoản thành công cho ${created.name} thuộc phòng ban ${created.department}!`
    );
    setActiveTab('users');
  };

  const handleCreateDepartmentAdmin = async (payload: CreateDepartmentAdminPayload): Promise<boolean> => {
    try {
      const createdAdmin = await createDepartmentAdminApi(tenant.id, payload);

      // Update Users list
      setUsers((prev) => [createdAdmin, ...prev]);

      // If assigned to a department, update the department lead/admin info
      if (payload.departmentId) {
        setDepartments((prev) =>
          prev.map((dept) => {
            if (dept.id === payload.departmentId || dept.name === payload.departmentId) {
              return {
                ...dept,
                lead: createdAdmin.name,
                adminEmail: createdAdmin.email,
                headCount: dept.headCount + 1,
              };
            }
            return dept;
          })
        );
      }

      setTenant((prev) => ({
        ...prev,
        licenseUsed: prev.licenseUsed + 1,
      }));

      const deptLabel = payload.departmentId ? `phòng ban ${createdAdmin.department}` : 'Tenant (Chưa gán phòng ban)';
      const newEvent: TenantEvent = {
        id: `evt-${Date.now()}`,
        text: `Department Admin ${createdAdmin.name} (${createdAdmin.email}) được tạo cho ${deptLabel}`,
        timeAgo: 'Just now',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'user',
      };
      setEvents((prev) => [newEvent, ...prev]);

      addToast('success', `Đã gửi thư mời kích hoạt tài khoản Department Admin cho ${createdAdmin.name} qua email thành công!`);
      setActiveTab('departments');
      return true;
    } catch (err: any) {
      addToast('error', err.message || 'Lỗi khi tạo Department Admin');
      return false;
    }
  };

  const handleAllocateDepartmentQuota = async (departmentId: string, quotaGB: number): Promise<boolean> => {
    try {
      const quotaBytes = Math.round(quotaGB * 1024 * 1024 * 1024);
      await allocateDepartmentQuotaApi(tenant.id, departmentId, quotaBytes);

      setDepartments((prev) =>
        prev.map((d) => (d.id === departmentId ? { ...d, allocatedStorageGB: quotaGB } : d))
      );

      const targetDept = departments.find((d) => d.id === departmentId);
      const deptName = targetDept?.name || 'Phòng ban';

      addToast('success', `Đã cập nhật Quota lưu trữ cho phòng ban ${deptName}: ${quotaGB} GB thành công!`);

      const newEvent: TenantEvent = {
        id: `evt-${Date.now()}`,
        text: `Điều chỉnh hạn mức lưu trữ phòng ban ${deptName} lên ${quotaGB} GB`,
        timeAgo: 'Just now',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'storage',
      };
      setEvents((prev) => [newEvent, ...prev]);
      return true;
    } catch (err: any) {
      console.error('[TenantContext] Lỗi khi cấp Quota cho phòng ban:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Không thể cập nhật Quota phòng ban.';
      addToast('error', errMsg);
      return false;
    }
  };

  const handleUpdateTenant = async (updated: Partial<TenantInfo>) => {
    await updateTenantSettings(tenant.id, updated);
    setTenant((prev) => ({ ...prev, ...updated }));
    addToast('success', 'Đã lưu cấu hình Tenant thành công!');
  };

  const handleSelectNav = (nav: NavItem) => {
    setActiveNav(nav);
    if (authUser?.role === 'TenantAdmin') {
      switch (nav) {
        case 'hub':
          setActiveTab('hub');
          break;
        case 'dashboard':
          setActiveTab('overview');
          break;
        case 'tenants':
          setActiveTab('departments');
          break;
        case 'audit-logs':
          setActiveTab('activity');
          break;
        case 'settings':
          setActiveTab('settings');
          break;
      }
    }
  };

  // Polling số chưa đọc mỗi 60 giây khi đã đăng nhập
  useEffect(() => {
    if (!authUser) return;

    const fetchUnreadCount = async () => {
      try {
        const count = await notificationApi.unreadCount();
        setNotificationCount(count);
      } catch {
        // Giữ số cũ, không toast
      }
    };

    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(intervalId);
  }, [authUser]);

  const refreshNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const [page, count] = await Promise.all([
        notificationApi.list(1, 20),
        notificationApi.unreadCount(),
      ]);
      notificationsPageRef.current = 1;
      setNotifications(page.items);
      setNotificationsHasMore(page.hasNextPage);
      setNotificationCount(count);
    } catch {
      // Giữ nguyên
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const loadMoreNotifications = useCallback(async () => {
    const nextPage = notificationsPageRef.current + 1;
    setNotificationsLoading(true);
    try {
      const page = await notificationApi.list(nextPage, 20);
      notificationsPageRef.current = nextPage;
      setNotifications((prev) => [...prev, ...page.items]);
      setNotificationsHasMore(page.hasNextPage);
    } catch {
      // Giữ nguyên
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    // Cập nhật lạc quan
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.isRead ? { ...n, isRead: true } : n))
    );
    setNotificationCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationApi.markRead(id);
    } catch {
      // Rollback nếu lỗi
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
      setNotificationCount((prev) => prev + 1);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setNotificationCount(0);
      addToast('success', 'Đã đánh dấu tất cả là đã đọc.');
    } catch {
      addToast('error', 'Không thể đánh dấu tất cả đã đọc.');
    }
  }, [addToast]);

  return (
    <TenantContext.Provider
      value={{
        activeNav,
        setActiveNav,
        activeTab,
        setActiveTab,
        targetDeptForCreate,
        setTargetDeptForCreate,
        searchQuery,
        setSearchQuery,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isNotificationOpen,
        setIsNotificationOpen,
        notificationCount,
        notifications,
        notificationsLoading,
        notificationsHasMore,
        refreshNotifications,
        loadMoreNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        isSubscriptionModalOpen,
        setIsSubscriptionModalOpen,
        isImpersonateModalOpen,
        setIsImpersonateModalOpen,
        isImpersonating,
        tenant,
        events,
        users,
        departments,
        quotaData,
        isLoadingData,
        isLoadingDepartments,
        refreshDepartments,
        refreshTenantData,
        setCurrentTenantId,
        toasts,
        addToast,
        handleDismissToast,
        handleSuspendToggle,
        handleDownloadBackup,
        handleConfirmImpersonate,
        handleExitImpersonate,
        handleOpenCreateDepartmentUser,
        handleUserCreated,
        handleCreateDepartmentAdmin,
        handleAllocateDepartmentQuota,
        handleUpdateTenant,
        handleSelectNav,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
};
