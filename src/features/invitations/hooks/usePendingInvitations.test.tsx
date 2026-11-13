import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePendingInvitations } from './usePendingInvitations';
import { invitationsApi } from '../api/invitationsApi';
import type { PendingInvitationDto } from '../types/invitation.types';

vi.mock('../api/invitationsApi', () => ({
  invitationsApi: {
    getPending: vi.fn(),
    resend: vi.fn(),
    cancel: vi.fn(),
  },
}));

const mocked = vi.mocked(invitationsApi);

const row = (id: string): PendingInvitationDto => ({
  userId: id,
  fullName: `User ${id}`,
  email: `${id}@example.com`,
  roleName: 'Employee',
  tenantId: null,
  tenantName: null,
  departmentId: null,
  departmentName: null,
  quotaBytes: 0,
  createdAt: '2026-01-01T00:00:00Z',
  lastInvitationSentAt: null,
  tokenExpiresAt: '2026-01-02T00:00:00Z',
  isExpired: false,
});

const page = (items: PendingInvitationDto[], pageNumber = 1, totalPages = 1, totalCount = items.length) => ({
  items,
  pageNumber,
  totalPages,
  totalCount,
  hasPreviousPage: pageNumber > 1,
  hasNextPage: pageNumber < totalPages,
});

describe('usePendingInvitations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads the first page on mount', async () => {
    mocked.getPending.mockResolvedValue(page([row('a'), row('b')], 1, 1, 2));

    const { result } = renderHook(() => usePendingInvitations());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.error).toBeNull();
    expect(mocked.getPending).toHaveBeenCalledWith(
      expect.objectContaining({ pageNumber: 1, pageSize: 20 }),
    );
  });

  it('exposes the error message when loading fails', async () => {
    mocked.getPending.mockRejectedValue(new Error('Máy chủ đang bận'));

    const { result } = renderHook(() => usePendingInvitations());

    await waitFor(() => expect(result.current.error).toBe('Máy chủ đang bận'));
    expect(result.current.isLoading).toBe(false);
  });

  it('reloads after a successful resend', async () => {
    mocked.getPending.mockResolvedValue(page([row('a')]));
    const dto = { targetUserId: 'a', email: 'a@example.com', newExpiresAt: '2026-02-01T00:00:00Z', message: 'ok' };
    mocked.resend.mockResolvedValue(dto);

    const { result } = renderHook(() => usePendingInvitations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mocked.getPending).toHaveBeenCalledTimes(1);

    let returned;
    await act(async () => {
      returned = await result.current.resend('a');
    });

    expect(mocked.resend).toHaveBeenCalledWith('a');
    expect(returned).toEqual(dto);
    expect(mocked.getPending).toHaveBeenCalledTimes(2);
  });

  it('reloads after a successful cancel', async () => {
    mocked.getPending.mockResolvedValue(page([row('a'), row('b')], 1, 1, 2));
    const dto = { targetUserId: 'a', email: 'a@example.com', cleanupAction: 'HARD_DELETED' as const, message: 'ok' };
    mocked.cancel.mockResolvedValue(dto);

    const { result } = renderHook(() => usePendingInvitations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let returned;
    await act(async () => {
      returned = await result.current.cancel('a');
    });

    expect(mocked.cancel).toHaveBeenCalledWith('a');
    expect(returned).toEqual(dto);
    expect(mocked.getPending).toHaveBeenCalledTimes(2);
    expect(result.current.pageNumber).toBe(1);
  });

  it('steps back a page when the last row of a non-first page is cancelled', async () => {
    // pageNumber 2, trang chỉ còn 1 hàng -> sau cancel, pageNumber === 1
    mocked.getPending.mockImplementation(async (f) =>
      f?.pageNumber === 2 ? page([row('z')], 2, 2, 21) : page([row('a')], 1, 1, 20),
    );
    mocked.cancel.mockResolvedValue({
      targetUserId: 'z',
      email: 'z@example.com',
      cleanupAction: 'HARD_DELETED',
      message: 'ok',
    });

    const { result } = renderHook(() => usePendingInvitations({ pageNumber: 2 }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.pageNumber).toBe(2);
    expect(mocked.getPending).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.cancel('z');
    });

    await waitFor(() => expect(result.current.pageNumber).toBe(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Exactly one extra fetch, and it is for page 1 (no reload of the emptied page 2).
    expect(mocked.getPending).toHaveBeenCalledTimes(2);
    expect(mocked.getPending).toHaveBeenLastCalledWith(expect.objectContaining({ pageNumber: 1 }));
  });

  it('does not reload when cancel rejects', async () => {
    mocked.getPending.mockResolvedValue(page([row('a')], 2, 2, 21));
    mocked.cancel.mockRejectedValue(new Error('Không thể hủy lời mời'));

    const { result } = renderHook(() => usePendingInvitations({ pageNumber: 2 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.cancel('a')).rejects.toThrow('Không thể hủy lời mời');
    });

    expect(result.current.error).toBe('Không thể hủy lời mời');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.pageNumber).toBe(2);
    expect(mocked.getPending).toHaveBeenCalledTimes(1);
  });

  it('issues a single fetch with the new term on page 1 when searching from a later page', async () => {
    vi.useFakeTimers();
    try {
      mocked.getPending.mockResolvedValue(page([row('a')], 3, 3, 41));

      const { result } = renderHook(() => usePendingInvitations({ pageNumber: 3 }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mocked.getPending).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.setSearchTerm('a');
      });
      // Let any in-flight request resolve, but stay inside the 300ms debounce window.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(mocked.getPending).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(mocked.getPending).toHaveBeenCalledTimes(2);
      expect(mocked.getPending).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchTerm: 'a', pageNumber: 1 }),
      );
      expect(result.current.pageNumber).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
