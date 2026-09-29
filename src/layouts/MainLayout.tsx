import React, { ReactNode } from 'react';
import { UserCheck } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { NotificationDrawer } from './NotificationDrawer';
import { ToastContainer } from '@/components/common/Toast';
import { useTenantContext } from '@/context/TenantContext';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const {
    activeNav,
    handleSelectNav,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    searchQuery,
    setSearchQuery,
    isNotificationOpen,
    setIsNotificationOpen,
    notificationCount,
    clearNotifications,
    isImpersonating,
    handleExitImpersonate,
    tenant,
    toasts,
    handleDismissToast,
  } = useTenantContext();

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
              className="ml-auto bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-bold px-3 py-1 rounded transition-colors cursor-pointer"
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
        <TopHeader
          title={`Tenants > ${tenant.name}`}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          notificationCount={notificationCount}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* System Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onClear={clearNotifications}
      />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};
