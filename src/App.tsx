import React from 'react';
import { TenantProvider } from '@/context/TenantContext';
import { MainLayout } from '@/layouts';
import { TenantPortal } from '@/features/tenants';

/**
 * App Shell: Connects Context Provider, MainLayout and Feature Slice
 */
export default function App() {
  return (
    <TenantProvider>
      <MainLayout>
        <TenantPortal />
      </MainLayout>
    </TenantProvider>
  );
}
