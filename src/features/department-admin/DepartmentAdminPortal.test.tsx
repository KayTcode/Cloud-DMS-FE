import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const navigation = vi.hoisted(() => ({ activeNav: 'hub', setActiveNav: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'manager', departmentId: 'dept', role: 'DepartmentAdmin' } }),
}));
vi.mock('@/context/TenantContext', () => ({ useTenantContext: () => ({ ...navigation }) }));
vi.mock('./context/DepartmentContext', () => ({
  DepartmentProvider: ({ children }: React.PropsWithChildren) => children,
  useDepartment: () => ({ hasDepartment: true, summary: { users: [] }, employees: [] }),
}));
vi.mock('./views', () => ({
  DepartmentHubView: ({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) => (
    <div>
      <div>Department hub</div>
      <button onClick={() => onNavigateTab?.('shared')}>Open received shares</button>
    </div>
  ),
  DepartmentFilesView: () => <div>Personal files</div>,
  DepartmentLogsView: () => null,
  StaffManagementView: () => null,
  SetupDepartmentView: () => null,
  DepartmentStorageReportView: () => null,
  DepartmentQuotaView: () => null,
  SharedStoreView: () => <div>Department store</div>,
}));
vi.mock('./components', () => ({
  AddMemberModal: () => null,
  EditQuotaModal: () => null,
  OffboardEmployeeModal: () => null,
  DepartmentBanner: () => null,
  DepartmentTabs: ({ onTabChange }: { onTabChange: (tab: string) => void }) =>
    <button onClick={() => onTabChange('shared')}>Open received shares</button>,
}));
vi.mock('./views/DepartmentSharedFilesView', () => ({
  DepartmentSharedFilesView: () => <div>Received files and folders</div>,
}));

import { DepartmentAdminPortal } from './DepartmentAdminPortal';

describe('Department Manager received-share navigation', () => {
  beforeEach(() => { navigation.activeNav = 'dashboard'; vi.clearAllMocks(); });

  it('switches from the current screen when the sidebar selects shared', () => {
    const { rerender } = render(<DepartmentAdminPortal />);
    expect(screen.getByText('Personal files')).toBeInTheDocument();
    navigation.activeNav = 'shared';
    rerender(<DepartmentAdminPortal />);
    expect(screen.getByText('Received files and folders')).toBeInTheDocument();
    expect(screen.queryByText('Personal files')).not.toBeInTheDocument();
    navigation.activeNav = 'shared-store';
    rerender(<DepartmentAdminPortal />);
    expect(screen.getByText('Department store')).toBeInTheDocument();
    expect(screen.queryByText('Received files and folders')).not.toBeInTheDocument();
  });

  it('keeps sidebar navigation synchronized when the internal tab is selected', () => {
    navigation.activeNav = 'hub';
    render(<DepartmentAdminPortal />);
    fireEvent.click(screen.getByText('Open received shares'));
    expect(navigation.setActiveNav).toHaveBeenCalledWith('shared');
    expect(screen.getByText('Received files and folders')).toBeInTheDocument();
  });
});
