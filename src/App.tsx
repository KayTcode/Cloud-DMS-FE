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
import { UploadManagerProvider } from '@/services/upload/large/UploadManagerContext';
import { LargeUploadPanel } from '@/components/upload/LargeUploadPanel';

/**
 * AppContent: Handles authentication gate & role-based portal rendering
 */
const AppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span>Đang khởi động...</span>
      </div>
    );
  }

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

  // Nế u bấmđường dẫn chấp nhận lời mờihệ thống  vào 
  if (window.location.pathname.startsWith('/accept-invitation')) {
    return <AcceptInvitationPage />;
  }

  //Nếu chưa đăng nhập thì hiện trang đăng nhậpPage
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
  // 
  return (
    <UploadManagerProvider>
      <TenantProvider>
        <MainLayout>
          {renderPortalByRole()}
        </MainLayout>
      </TenantProvider>
      <LargeUploadPanel />
    </UploadManagerProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}


