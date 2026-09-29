import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  ActiveTab,
  NavItem,
  TenantInfo,
  TenantEvent,
  TenantUser,
} from '@/features/tenants/types';
import { initialTenant, initialEvents, mockUsers } from '@/data/tenantMockData';
import { ToastMessage } from '@/types/common.types';
import {
  toggleSuspendTenant,
  createTenantUser,
  exportTenantBackup,
  updateTenantSettings,
} from '@/features/tenants/api';

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
  clearNotifications: () => void;

  // Modals & Impersonation
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (open: boolean) => void;
  isImpersonateModalOpen: boolean;
  setIsImpersonateModalOpen: (open: boolean) => void;
  isImpersonating: boolean;

  // Data
  tenant: TenantInfo;
  events: TenantEvent[];
  users: TenantUser[];

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
  handleUpdateTenant: (updated: Partial<TenantInfo>) => Promise<void>;
  handleSelectNav: (nav: NavItem) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeNav, setActiveNav] = useState<NavItem>('tenants');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [tenant, setTenant] = useState<TenantInfo>(initialTenant);
  const [events, setEvents] = useState<TenantEvent[]>(initialEvents);
  const [users, setUsers] = useState<TenantUser[]>(mockUsers);
  const [targetDeptForCreate, setTargetDeptForCreate] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(1);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isImpersonateModalOpen, setIsImpersonateModalOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'info' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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

  const handleUpdateTenant = async (updated: Partial<TenantInfo>) => {
    await updateTenantSettings(tenant.id, updated);
    setTenant((prev) => ({ ...prev, ...updated }));
    addToast('success', 'Đã lưu cấu hình Tenant thành công!');
  };

  const handleSelectNav = (nav: NavItem) => {
    setActiveNav(nav);
    if (nav !== 'tenants') {
      addToast('info', `Navigated to ${nav.replace('-', ' ')}. Click Tenants to return.`);
    }
  };

  const clearNotifications = () => {
    setNotificationCount(0);
    addToast('info', 'All notifications marked as read.');
  };

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
        clearNotifications,
        isSubscriptionModalOpen,
        setIsSubscriptionModalOpen,
        isImpersonateModalOpen,
        setIsImpersonateModalOpen,
        isImpersonating,
        tenant,
        events,
        users,
        toasts,
        addToast,
        handleDismissToast,
        handleSuspendToggle,
        handleDownloadBackup,
        handleConfirmImpersonate,
        handleExitImpersonate,
        handleOpenCreateDepartmentUser,
        handleUserCreated,
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
