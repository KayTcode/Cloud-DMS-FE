import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { MainLayout } from '@/layouts';
import { SystemAdminPortal } from '@/features/system-admin';
import { TenantPortal } from '@/features/tenants';
import { DepartmentAdminPortal } from '@/features/department-admin';
import { UserPortal } from '@/features/user';
import { LoginPage, AcceptInvitationPage, GoogleOAuthCallback } from '@/features/auth';

import { OneDriveOAuthCallback } from '@/features/system-admin/components/OneDriveOAuthCallback';

/**
 * AppContent: Handles authentication gate & role-based portal rendering
 */
const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // If path is OneDrive OAuth callback
  if (window.location.pathname.startsWith('/oauth/onedrive/callback')) {
    return <OneDriveOAuthCallback />;
  }

  // If path is Google OAuth callback
  if (
    window.location.pathname.startsWith('/auth/google/callback') ||
    window.location.pathname.startsWith('/oauth/google/callback')
  ) {
    return <GoogleOAuthCallback />;
  }

  // If path is /accept-invitation, render AcceptInvitationPage
  if (window.location.pathname.startsWith('/accept-invitation')) {
    return <AcceptInvitationPage />;
  }

  // If not authenticated, render LoginPage
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // Render Portal according to User Role
  const renderPortalByRole = () => {
    switch (user.role) {
      case 'SystemAdmin':
        return <SystemAdminPortal />;
      case 'TenantAdmin':
        return <TenantPortal />;
      case 'DepartmentAdmin':
        return <DepartmentAdminPortal />;
      case 'User':
      case 'Employee':
      default:
        return <UserPortal />;
    }
  };

  return (
    <TenantProvider>
      <MainLayout>
        {renderPortalByRole()}
      </MainLayout>
    </TenantProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}


