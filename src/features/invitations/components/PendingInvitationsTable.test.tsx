import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PendingInvitationsTable } from './PendingInvitationsTable';
import { usePendingInvitations } from '../hooks/usePendingInvitations';
import type { PendingInvitationDto } from '../types/invitation.types';

vi.mock('../hooks/usePendingInvitations', () => ({ usePendingInvitations: vi.fn() }));

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

const makeInvitation = (over: Partial<PendingInvitationDto> = {}): PendingInvitationDto => ({
  userId: 'u1',
  fullName: 'Nguyễn Văn A',
  email: 'a@example.com',
  roleName: 'Employee',
  tenantId: 't1',
  tenantName: 'Tenant 1',
  departmentId: 'd1',
  departmentName: 'Phòng Kế toán',
  quotaBytes: 5 * 1024 ** 3,
  createdAt: '2026-11-01T00:00:00Z',
  lastInvitationSentAt: null,
  tokenExpiresAt: hoursFromNow(48),
  isExpired: false,
  ...over,
});

const mockHook = (over: Record<string, unknown> = {}) => {
  const state = {
    items: [makeInvitation()],
    totalCount: 1,
    pageNumber: 1,
    totalPages: 1,
    isLoading: false,
    error: null,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    setPageNumber: vi.fn(),
    reload: vi.fn(),
    resend: vi.fn().mockResolvedValue({}),
    cancel: vi.fn(),
    ...over,
  };
  vi.mocked(usePendingInvitations).mockReturnValue(state as never);
  return state;
};

describe('PendingInvitationsTable', () => {
  beforeEach(() => {
    vi.mocked(usePendingInvitations).mockReset();
  });

  it('renders one row per pending invitation with email and role', async () => {
    mockHook({
      items: [
        makeInvitation(),
        makeInvitation({ userId: 'u2', email: 'b@example.com', roleName: 'DepartmentAdmin' }),
      ],
    });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
    expect(screen.getByText('Employee')).toBeInTheDocument();
    expect(screen.getByText('b@example.com')).toBeInTheDocument();
    expect(screen.getByText('DepartmentAdmin')).toBeInTheDocument();
    expect(screen.getAllByText('5.0 GB')).toHaveLength(2);
  });

  it('shows the expired badge when isExpired is true even if tokenExpiresAt is in the future', async () => {
    mockHook({ items: [makeInvitation({ isExpired: true, tokenExpiresAt: hoursFromNow(72) })] });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    expect(screen.getByText('Đã hết hạn')).toBeInTheDocument();
    expect(screen.queryByText(/Đang chờ/)).not.toBeInTheDocument();
  });

  it('disables the resend button while the 120s cooldown is active', async () => {
    mockHook({
      items: [makeInvitation({ lastInvitationSentAt: new Date(Date.now() - 10_000).toISOString() })],
    });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Gửi lại/ })).toBeDisabled();
  });

  it('enables the resend button when lastInvitationSentAt is null', async () => {
    const hook = mockHook({ items: [makeInvitation({ lastInvitationSentAt: null })] });
    const user = userEvent.setup();
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Gửi lại/ });
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(hook.resend).toHaveBeenCalledWith('u1');
  });

  it('calls onCancelRequested with the row when the cancel button is clicked', async () => {
    const hook = mockHook();
    const row = hook.items[0];
    const onCancelRequested = vi.fn();
    const user = userEvent.setup();
    render(<PendingInvitationsTable onCancelRequested={onCancelRequested} />);
    await user.click(within(screen.getAllByRole('row')[1]).getByRole('button', { name: /Hủy/ }));
    expect(onCancelRequested).toHaveBeenCalledWith(row);
    expect(hook.cancel).not.toHaveBeenCalled();
  });

  it('renders the empty state when there are no pending invitations', async () => {
    mockHook({ items: [], totalCount: 0 });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    expect(screen.getByText('Không có lời mời nào đang chờ.')).toBeInTheDocument();
  });

  it('treats a zone-less lastInvitationSentAt as UTC when computing the cooldown', async () => {
    const zoneless = new Date(Date.now() - 10_000).toISOString().slice(0, -1);
    mockHook({ items: [makeInvitation({ lastInvitationSentAt: zoneless })] });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Gửi lại/ })).toBeDisabled();
  });

  it('renders the error as an alert above the table while keeping stale rows', async () => {
    mockHook({ error: 'Không thể tải danh sách.' });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Không thể tải danh sách.');
    expect(alert.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
  });

  it('wires the search input straight to setSearchTerm', async () => {
    const hook = mockHook();
    const user = userEvent.setup();
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    await user.type(screen.getByRole('searchbox'), 'x');
    expect(hook.setSearchTerm).toHaveBeenCalledWith('x');
  });

  // Important 2 — a double click must not fire two resends.
  it('fires exactly one resend when the same row is clicked twice in a row', async () => {
    let release!: (v: unknown) => void;
    const hook = mockHook({
      items: [makeInvitation({ lastInvitationSentAt: null })],
      resend: vi.fn(() => new Promise((r) => { release = r; })),
    });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Gửi lại/ });

    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(hook.resend).toHaveBeenCalledTimes(1);
    expect(btn).toBeDisabled();

    await act(async () => {
      release({ targetUserId: 'u1', email: 'a@example.com', newExpiresAt: '', message: 'ok' });
    });
    expect(hook.resend).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Gửi lại/ })).toBeEnabled();
  });

  it('leaves the other rows resendable while one row is in flight', async () => {
    let release!: (v: unknown) => void;
    const hook = mockHook({
      items: [
        makeInvitation(),
        makeInvitation({ userId: 'u2', email: 'b@example.com' }),
      ],
      resend: vi.fn(() => new Promise((r) => { release = r; })),
    });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    const rows = screen.getAllByRole('row');
    fireEvent.click(within(rows[1]).getByRole('button', { name: /Gửi lại/ }));
    expect(within(rows[2]).getByRole('button', { name: /Gửi lại/ })).toBeEnabled();
    fireEvent.click(within(rows[2]).getByRole('button', { name: /Gửi lại/ }));
    expect(hook.resend.mock.calls.map((args) => args[0])).toEqual(['u1', 'u2']);
    await act(async () => {
      release({ targetUserId: 'u1', email: 'a@example.com', newExpiresAt: '', message: 'ok' });
    });
  });

  // Important 3 — the SystemAdmin list spans tenants, so the row must name its organisation.
  it('renders the tenant name in its own column, before the department column', async () => {
    mockHook({ items: [makeInvitation({ tenantName: 'Công ty A' })] });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Họ tên',
      'Email',
      'Vai trò',
      'Tổ chức',
      'Phòng ban',
      'Hạn mức',
      'Trạng thái',
      'Hành động',
    ]);
    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(cells[3]).toHaveTextContent('Công ty A');
    expect(cells[4]).toHaveTextContent('Phòng Kế toán');
  });

  it('falls back to a dash when an invitation carries no tenant name', async () => {
    mockHook({ items: [makeInvitation({ tenantName: null })] });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(cells[3]).toHaveTextContent('—');
  });

  // Important 5 — a failed load must not be reported as "nothing pending".
  it('offers a retry instead of the empty state when the load failed with no rows', async () => {
    const hook = mockHook({ items: [], totalCount: 0, error: 'Không thể tải danh sách.' });
    const user = userEvent.setup();
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    expect(screen.queryByText(/Không có lời mời nào đang chờ/)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải danh sách.');
    // There is no list below, so the stale-list hint would be false here.
    expect(screen.queryByText(/có thể đã cũ/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(hook.reload).toHaveBeenCalledTimes(1);
  });

  it('keeps the stale-list hint when the load failed but rows are still shown', async () => {
    mockHook({ error: 'Không thể tải danh sách.' });
    render(<PendingInvitationsTable onCancelRequested={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/có thể đã cũ/);
    expect(screen.queryByRole('button', { name: /Thử lại/ })).not.toBeInTheDocument();
  });
});
