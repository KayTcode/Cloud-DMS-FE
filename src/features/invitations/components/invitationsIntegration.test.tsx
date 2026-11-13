import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantUsersView } from '@/features/tenants/views/TenantUsersView';
import { invitationsApi } from '../api/invitationsApi';
import type { PendingInvitationDto } from '../types/invitation.types';

const addToast = vi.fn();

vi.mock('@/context/TenantContext', () => ({
  useTenantContext: () => ({ departments: [], isLoadingData: false, addToast, toasts: [], handleDismissToast: vi.fn() }),
}));

vi.mock('../api/invitationsApi', () => ({
  invitationsApi: { getPending: vi.fn(), resend: vi.fn(), cancel: vi.fn() },
}));

const invitation = (over: Partial<PendingInvitationDto> = {}): PendingInvitationDto => ({
  userId: 'u1',
  fullName: 'Nguyễn Văn A',
  email: 'a@example.com',
  roleName: 'Employee',
  tenantId: 't1',
  tenantName: 'Tenant 1',
  departmentId: 'd1',
  departmentName: 'Phòng Kế toán',
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

const renderHost = () =>
  render(<TenantUsersView users={[]} onBackToOverview={vi.fn()} onCreateDepartmentUser={vi.fn()} />);

const openCancelAndConfirm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'Hủy lời mời' }));
  await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));
};

describe('pending invitations wired into a portal view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invitationsApi.getPending).mockResolvedValue(page([invitation()]));
  });

  it('shows a success toast carrying the new expiry after a resend', async () => {
    vi.mocked(invitationsApi.resend).mockResolvedValue({
      targetUserId: 'u1',
      email: 'a@example.com',
      newExpiresAt: '2026-12-25T10:00:00Z',
      message: 'Đã gửi lại lời mời.',
    });
    const user = userEvent.setup();
    renderHost();
    expect(screen.getByText('Lời mời đang chờ')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Gửi lại' }));
    await waitFor(() => expect(addToast).toHaveBeenCalledTimes(1));
    const [type, msg] = addToast.mock.calls[0];
    expect(type).toBe('success');
    expect(msg).toContain('Đã gửi lại lời mời.');
    expect(msg).toMatch(/Hạn mới/);
    expect(msg).toMatch(/2025|2026/);
    expect(invitationsApi.resend).toHaveBeenCalledWith('u1');
  });

  it('shows the hard-delete message when cleanupAction is HARD_DELETED', async () => {
    vi.mocked(invitationsApi.cancel).mockResolvedValue({
      targetUserId: 'u1',
      email: 'a@example.com',
      cleanupAction: 'HARD_DELETED',
      message: 'server',
    });
    const user = userEvent.setup();
    renderHost();
    await openCancelAndConfirm(user);
    await waitFor(() => expect(addToast).toHaveBeenCalledTimes(1));
    const [type, msg] = addToast.mock.calls[0];
    expect(type).toBe('success');
    expect(msg).toMatch(/xóa hoàn toàn/);
    expect(msg).not.toMatch(/vô hiệu hóa/);
  });

  it('shows the unlink message when cleanupAction is UNLINKED_FORMER_EMPLOYEE', async () => {
    vi.mocked(invitationsApi.cancel).mockResolvedValue({
      targetUserId: 'u1',
      email: 'a@example.com',
      cleanupAction: 'UNLINKED_FORMER_EMPLOYEE',
      message: 'server',
    });
    const user = userEvent.setup();
    renderHost();
    await openCancelAndConfirm(user);
    await waitFor(() => expect(addToast).toHaveBeenCalledTimes(1));
    const [type, msg] = addToast.mock.calls[0];
    expect(type).toBe('success');
    expect(msg).toMatch(/gỡ liên kết/);
    expect(msg).toMatch(/vô hiệu hóa/);
    expect(msg).not.toMatch(/xóa hoàn toàn/);
  });

  it('removes the cancelled row from the table after confirming', async () => {
    vi.mocked(invitationsApi.cancel).mockResolvedValue({
      targetUserId: 'u1',
      email: 'a@example.com',
      cleanupAction: 'HARD_DELETED',
      message: 'server',
    });
    vi.mocked(invitationsApi.getPending)
      .mockResolvedValueOnce(page([invitation()]))
      .mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderHost();
    expect(await screen.findByText('a@example.com')).toBeInTheDocument();
    await openCancelAndConfirm(user);
    await waitFor(() => expect(screen.queryByText('a@example.com')).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(invitationsApi.cancel).toHaveBeenCalledTimes(1);
  });

  it('surfaces the interceptor error message when cancel is forbidden', async () => {
    vi.mocked(invitationsApi.cancel).mockRejectedValue(new Error('Bạn không có quyền hủy lời mời này.'));
    const user = userEvent.setup();
    renderHost();
    await openCancelAndConfirm(user);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Bạn không có quyền hủy lời mời này\./)).toBeInTheDocument();
    // No success toast, row still present, modal closed so the banner is visible.
    expect(addToast.mock.calls.every(([t]) => t !== 'success')).toBe(true);
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xác nhận hủy' })).not.toBeInTheDocument();
  });

  it('cannot be dismissed with Escape while the cancel request is in flight', async () => {
    let release!: (v: never) => void;
    vi.mocked(invitationsApi.cancel).mockReturnValue(new Promise((r) => { release = r as never; }));
    const user = userEvent.setup();
    renderHost();
    await openCancelAndConfirm(user);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Xác nhận hủy' })).toBeInTheDocument();
    release({ targetUserId: 'u1', email: 'a@example.com', cleanupAction: 'HARD_DELETED', message: '' } as never);
    await waitFor(() => expect(addToast).toHaveBeenCalled());
  });
});
