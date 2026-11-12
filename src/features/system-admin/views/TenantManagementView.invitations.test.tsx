import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantManagementView } from './TenantManagementView';
import { invitationsApi } from '@/features/invitations/api/invitationsApi';
import {
  resendVacantTenantAdminInvitationApi,
  cancelVacantTenantAdminInvitationApi,
} from '../api/systemAdminCommands';
import type { AdminUserDto } from '../types';
import type { PendingInvitationDto } from '@/features/invitations';

const addToast = vi.fn();

vi.mock('@/context/TenantContext', () => ({
  useTenantContext: () => ({ addToast, toasts: [], handleDismissToast: vi.fn() }),
}));

vi.mock('@/features/quota', () => ({
  quotaApi: { retryFolderProvisioning: vi.fn() },
}));

vi.mock('../api/systemAdminCommands', () => ({
  resendVacantTenantAdminInvitationApi: vi.fn(),
  cancelVacantTenantAdminInvitationApi: vi.fn(),
}));

vi.mock('@/features/invitations/api/invitationsApi', () => ({
  invitationsApi: { getPending: vi.fn(), resend: vi.fn(), cancel: vi.fn() },
}));

const pendingTenantAdmin: AdminUserDto = {
  id: 'legacy-1',
  email: 'admin@congty-a.vn',
  firstName: 'A',
  lastName: 'Admin',
  fullName: 'Admin A',
  isActive: false,
  roles: ['TenantAdmin'],
  permissions: [],
  tenantId: 't1',
  tenantName: 'Công ty A',
  createdAt: '2026-11-01',
};

const invitation = (over: Partial<PendingInvitationDto> = {}): PendingInvitationDto => ({
  userId: 'u1',
  fullName: 'Admin A',
  email: 'admin@congty-a.vn',
  roleName: 'TenantAdmin',
  tenantId: 't1',
  tenantName: 'Công ty A',
  departmentId: null,
  departmentName: null,
  quotaBytes: 1024 ** 3,
  createdAt: '2026-11-01T00:00:00Z',
  lastInvitationSentAt: null,
  tokenExpiresAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
  isExpired: false,
  ...over,
});

const page = (items: PendingInvitationDto[]) => ({
  items,
  pageNumber: 1,
  totalPages: 1,
  totalCount: items.length,
  hasPreviousPage: false,
  hasNextPage: false,
});

const renderView = (onRefreshUsers = vi.fn()) => {
  render(
    <TenantManagementView
      users={[pendingTenantAdmin]}
      totalCount={1}
      currentPage={1}
      totalPages={1}
      searchQuery=""
      onPageChange={vi.fn()}
      onOpenCreateModal={vi.fn()}
      onSelectUser={vi.fn()}
      onOpenEditModal={vi.fn()}
      onToggleStatus={vi.fn()}
      onDeleteUser={vi.fn()}
      onRefreshUsers={onRefreshUsers}
    />,
  );
  return { onRefreshUsers };
};

describe('TenantManagementView: legacy and new invitation UIs stay in sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invitationsApi.getPending).mockResolvedValue(page([invitation()]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reloads the pending-invitations table after a legacy resend', async () => {
    vi.mocked(resendVacantTenantAdminInvitationApi).mockResolvedValue({
      targetUserEmail: 'admin@congty-a.vn',
    } as never);
    const user = userEvent.setup();
    renderView();
    expect(await screen.findByText('admin@congty-a.vn')).toBeInTheDocument();
    expect(invitationsApi.getPending).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTitle('Gửi lại thư mời kích hoạt qua Email'));

    await waitFor(() => expect(invitationsApi.getPending).toHaveBeenCalledTimes(2));
  });

  it('reloads the pending-invitations table after a legacy cancel', async () => {
    vi.mocked(cancelVacantTenantAdminInvitationApi).mockResolvedValue({
      smartCleanupApplied: true,
    } as never);
    const user = userEvent.setup();
    const { onRefreshUsers } = renderView();
    expect(await screen.findByText('admin@congty-a.vn')).toBeInTheDocument();
    expect(invitationsApi.getPending).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTitle('Hủy lời mời'));

    await waitFor(() => expect(invitationsApi.getPending).toHaveBeenCalledTimes(2));
    expect(onRefreshUsers).toHaveBeenCalled();
  });

  it('refreshes the legacy list after the new table cancels an invitation', async () => {
    vi.mocked(invitationsApi.cancel).mockResolvedValue({
      targetUserId: 'u1',
      email: 'admin@congty-a.vn',
      cleanupAction: 'HARD_DELETED',
      message: 'Đã hủy lời mời.',
    });
    const user = userEvent.setup();
    const { onRefreshUsers } = renderView();
    await user.click(await screen.findByRole('button', { name: 'Hủy lời mời' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    await waitFor(() => expect(onRefreshUsers).toHaveBeenCalled());
    expect(addToast).toHaveBeenCalledWith('success', expect.stringContaining('xóa hoàn toàn'));
  });
});
