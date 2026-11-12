import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PendingInvitationsTable } from './PendingInvitationsTable';
import { invitationsApi } from '../api/invitationsApi';
import type { PendingInvitationDto } from '../types/invitation.types';

vi.mock('../api/invitationsApi', () => ({
  invitationsApi: { getPending: vi.fn(), resend: vi.fn(), cancel: vi.fn() },
}));

const invitation = (over: Partial<PendingInvitationDto> = {}): PendingInvitationDto => ({
  userId: 'u1',
  fullName: 'Nguyễn Văn A',
  email: 'a@example.com',
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

describe('PendingInvitationsTable reloadToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invitationsApi.getPending).mockResolvedValue(page([invitation()]));
  });

  it('refetches exactly once when the host bumps reloadToken', async () => {
    const { rerender } = render(<PendingInvitationsTable reloadToken={0} />);
    expect(await screen.findByText('a@example.com')).toBeInTheDocument();
    expect(invitationsApi.getPending).toHaveBeenCalledTimes(1);

    rerender(<PendingInvitationsTable reloadToken={1} />);
    await waitFor(() => expect(invitationsApi.getPending).toHaveBeenCalledTimes(2));

    // A re-render that does not change the token must not refetch again.
    rerender(<PendingInvitationsTable reloadToken={1} />);
    await waitFor(() => expect(screen.getByText('a@example.com')).toBeInTheDocument());
    expect(invitationsApi.getPending).toHaveBeenCalledTimes(2);
  });

  it('does not refetch on mount for the initial token value', async () => {
    render(<PendingInvitationsTable reloadToken={7} />);
    expect(await screen.findByText('a@example.com')).toBeInTheDocument();
    expect(invitationsApi.getPending).toHaveBeenCalledTimes(1);
  });
});
