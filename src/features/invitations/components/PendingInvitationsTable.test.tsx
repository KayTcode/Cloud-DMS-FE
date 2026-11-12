import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
});
