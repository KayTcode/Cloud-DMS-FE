import React from 'react';
import { TenantProvider } from '@/context/TenantContext';
import { MainLayout } from '@/layouts';
import { SystemAdminPortal } from '@/features/system-admin';

/**
 * App Shell: Connects Context Provider, MainLayout and SystemAdminPortal Feature Slice
 */
export default function App() {
  return (
    <TenantProvider>
      <MainLayout>
        <SystemAdminPortal />
      </MainLayout>
    </TenantProvider>
  );
}

