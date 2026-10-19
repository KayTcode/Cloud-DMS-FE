import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { TenantBanner } from './components/TenantBanner';
import { TenantTabs } from './components/TenantTabs';
import { OverviewView } from './components/OverviewView';
import { UsersView } from './components/UsersView';
import { DepartmentsView } from './components/DepartmentsView';
import { CreateDepartmentUserView } from './components/CreateDepartmentUserView';
import { StorageView } from './components/StorageView';
import { ActivityView } from './components/ActivityView';
import { SettingsView } from './components/SettingsView';
import { SysadminDashboardView } from './components/SysadminDashboardView';
import { SubscriptionModal } from './components/SubscriptionModal';
import { ImpersonateModal } from './components/ImpersonateModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ToastContainer, ToastMessage } from './components/Toast';
import { initialTenant, initialEvents, mockUsers } from './data/mockData';
import { ActiveTab, NavItem, TenantInfo, TenantEvent, TenantUser } from './types';
import { UserCheck, X } from 'lucide-react';

export default function App() {
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

  const addToast = (type: 'success' | 'warning' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSuspendToggle = () => {
    const newStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
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

  const handleDownloadBackup = () => {
    addToast('info', 'Preparing database backup export for Acme Corporation...');
    setTimeout(() => {
      addToast(
        'success',
        'Database backup download started: tnt_acme_89f81_backup_20260928.sql.gz (1.2 GB)'
      );
    }, 1200);
  };

  const handleConfirmImpersonate = () => {
    setIsImpersonating(true);
    addToast('success', 'Active session switched: Impersonating admin@acme.com');
  };

  const handleExitImpersonate = () => {
    setIsImpersonating(false);
    addToast('info', 'Exited impersonation mode. Returned to System Admin session.');
  };

  const handleOpenCreateDepartmentUser = (deptName?: string) => {
    setTargetDeptForCreate(deptName);
    setActiveTab('create-department-user');
  };

  const handleUserCreated = (newUser: TenantUser) => {
    setUsers((prev) => [newUser, ...prev]);
    setTenant((prev) => ({
      ...prev,
      licenseUsed: prev.licenseUsed + 1,
    }));

    const newEvent: TenantEvent = {
      id: `evt-${Date.now()}`,
      text: `User ${newUser.name} added to ${newUser.department} department`,
      timeAgo: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'user',
    };
    setEvents((prev) => [newEvent, ...prev]);

    addToast('success', `Đã tạo tài khoản thành công cho ${newUser.name} thuộc phòng ban ${newUser.department}!`);
    setActiveTab('users');
  };

  const handleSelectNav = (nav: NavItem) => {
    setActiveNav(nav);
    if (nav !== 'tenants') {
      addToast('info', `Navigated to ${nav.replace('-', ' ')}. Click Tenants to return.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex">
      {/* Impersonation active top alert banner */}
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
              className="ml-auto bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-bold px-3 py-1 rounded transition-colors"
            >
              Exit Impersonation
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 lg:pl-64 ${isImpersonating ? 'pt-9' : ''}`}>
        {/* Top Header */}
        <TopHeader
          title={
            activeNav === 'dashboard'
              ? 'Dashboard > Storage & System Overview'
              : activeNav === 'tenants'
              ? 'Tenants > Acme Corporation'
              : `Sysadmin > ${activeNav.replace('-', ' ').toUpperCase()}`
          }
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNotifications={() => {
            setIsNotificationOpen(true);
            setNotificationCount(0);
          }}
          notificationCount={notificationCount}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1440px] w-full mx-auto">
          {activeNav === 'dashboard' ? (
            <SysadminDashboardView
              tenant={tenant}
              onNavigateToTenant={() => {
                setActiveNav('tenants');
                setActiveTab('overview');
              }}
              onCreateDepartmentUser={(dept) => {
                setActiveNav('tenants');
                handleOpenCreateDepartmentUser(dept);
              }}
            />
          ) : activeNav === 'tenants' ? (
            <>
              {/* Tenant Banner Header */}
              <TenantBanner
                tenant={tenant}
                onSuspendToggle={handleSuspendToggle}
                onManageSubscriptions={() => setIsSubscriptionModalOpen(true)}
                onNavigateToTenants={() => addToast('info', 'You are viewing Acme Corporation.')}
              />

              {/* Navigation Tabs */}
              <TenantTabs
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab)}
              />

              {/* Tab View Content */}
              {activeTab === 'overview' && (
                <OverviewView
                  tenant={tenant}
                  events={events}
                  onImpersonate={() => setIsImpersonateModalOpen(true)}
                  onDownloadBackup={handleDownloadBackup}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onCreateDepartmentUser={() => handleOpenCreateDepartmentUser()}
                />
              )}

              {activeTab === 'create-department-user' && (
                <CreateDepartmentUserView
                  defaultDepartment={targetDeptForCreate}
                  onBack={() => setActiveTab('departments')}
                  onUserCreated={handleUserCreated}
                />
              )}

              {activeTab === 'users' && (
                <UsersView
                  users={users}
                  onBackToOverview={() => setActiveTab('overview')}
                  onCreateDepartmentUser={() => handleOpenCreateDepartmentUser()}
                />
              )}

              {activeTab === 'departments' && (
                <DepartmentsView
                  onBackToOverview={() => setActiveTab('overview')}
                  onCreateDepartmentUser={(dept) => handleOpenCreateDepartmentUser(dept)}
                />
              )}

              {activeTab === 'storage' && (
                <StorageView
                  tenant={tenant}
                  onBackToOverview={() => setActiveTab('overview')}
                  onCreateDepartmentUser={(dept) => handleOpenCreateDepartmentUser(dept)}
                />
              )}

              {activeTab === 'activity' && (
                <ActivityView onBackToOverview={() => setActiveTab('overview')} />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  tenant={tenant}
                  onUpdateTenant={(updated) => {
                    setTenant((prev) => ({ ...prev, ...updated }));
                    addToast('success', 'Tenant settings updated.');
                  }}
                  onBackToOverview={() => setActiveTab('overview')}
                />
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center max-w-xl mx-auto mt-12 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {activeNav.replace('-', ' ')}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                This sysadmin section is currently synchronized with the cluster.
              </p>
              <button
                onClick={() => setActiveNav('tenants')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Return to Tenants &gt; Acme Corporation
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        tenant={tenant}
      />

      {/* Impersonation Modal */}
      <ImpersonateModal
        isOpen={isImpersonateModalOpen}
        onClose={() => setIsImpersonateModalOpen(false)}
        tenant={tenant}
        onConfirm={handleConfirmImpersonate}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onClear={() => {
          setNotificationCount(0);
          addToast('info', 'All notifications cleared.');
        }}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
