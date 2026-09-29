import React from 'react';
import { useTenantContext } from '@/context/TenantContext';
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
} from '@/features/tenants/views';

export const TenantPortal: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    tenant,
    events,
    users,
    targetDeptForCreate,
    isSubscriptionModalOpen,
    setIsSubscriptionModalOpen,
    isImpersonateModalOpen,
    setIsImpersonateModalOpen,
    handleSuspendToggle,
    handleDownloadBackup,
    handleConfirmImpersonate,
    handleOpenCreateDepartmentUser,
    handleUserCreated,
    handleUpdateTenant,
  } = useTenantContext();

  return (
    <>
      {/* Top Tenant Profile & Actions Banner */}
      <TenantBanner
        tenant={tenant}
        onSuspendToggle={handleSuspendToggle}
        onManageSubscriptions={() => setIsSubscriptionModalOpen(true)}
        onNavigateToTenants={() => setActiveTab('overview')}
      />

      {/* Internal Navigation Tabs */}
      <TenantTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Dynamic Tab Views */}
      <div className="tab-content-area">
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

        {activeTab === 'users' && (
          <TenantUsersView
            users={users}
            onBackToOverview={() => setActiveTab('overview')}
            onCreateDepartmentUser={() => handleOpenCreateDepartmentUser()}
          />
        )}

        {activeTab === 'departments' && (
          <TenantDepartmentsView
            onBackToOverview={() => setActiveTab('overview')}
            onCreateDepartmentUser={(dept) => handleOpenCreateDepartmentUser(dept)}
          />
        )}

        {activeTab === 'create-department-user' && (
          <CreateDepartmentUserView
            onBack={() => setActiveTab('departments')}
            onUserCreated={handleUserCreated}
            defaultDepartment={targetDeptForCreate}
          />
        )}

        {activeTab === 'storage' && (
          <TenantStorageView
            tenant={tenant}
            onBackToOverview={() => setActiveTab('overview')}
            onCreateDepartmentUser={(dept) => handleOpenCreateDepartmentUser(dept)}
          />
        )}

        {activeTab === 'activity' && (
          <TenantActivityView
            events={events}
            onBackToOverview={() => setActiveTab('overview')}
          />
        )}

        {activeTab === 'settings' && (
          <TenantSettingsView
            tenant={tenant}
            onUpdateTenant={handleUpdateTenant}
            onBackToOverview={() => setActiveTab('overview')}
          />
        )}
      </div>

      {/* Modals */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        tenant={tenant}
      />

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
