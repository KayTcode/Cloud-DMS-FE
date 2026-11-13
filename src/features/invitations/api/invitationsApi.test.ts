import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }));

vi.mock('@/api/axiosClient', () => ({ default: { get: mockGet, post: mockPost } }));

import { invitationsApi } from './invitationsApi';

describe('invitationsApi', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('getPending normalizes an empty payload to a safe PagedResult', async () => {
    mockGet.mockResolvedValue(undefined);
    const res = await invitationsApi.getPending();
    expect(res.items).toEqual([]);
    expect(res.totalCount).toBe(0);
  });

  it('getPending unwraps a Result-wrapped payload', async () => {
    mockGet.mockResolvedValue({ value: { items: [{ userId: 'u1' }], totalCount: 1 } });
    expect((await invitationsApi.getPending()).items).toHaveLength(1);
  });

  it('getPending sends the default paging params', async () => {
    mockGet.mockResolvedValue({ items: [], totalCount: 0 });
    await invitationsApi.getPending();
    expect(mockGet).toHaveBeenCalledWith('/invitations/pending', {
      params: { tenantId: undefined, departmentId: undefined, searchTerm: undefined, pageNumber: 1, pageSize: 20 },
    });
  });

  it('getPending sends an empty searchTerm as undefined', async () => {
    mockGet.mockResolvedValue({ items: [], totalCount: 0 });
    await invitationsApi.getPending({ searchTerm: '' });
    expect(mockGet.mock.calls[0][1].params.searchTerm).toBeUndefined();
  });

  it('resend posts to the resend route', async () => {
    mockPost.mockResolvedValue({ targetUserId: 'u1' });
    await invitationsApi.resend('u1');
    expect(mockPost).toHaveBeenCalledWith('/invitations/u1/resend');
  });

  it('cancel returns the cleanup action', async () => {
    mockPost.mockResolvedValue({ cleanupAction: 'HARD_DELETED' });
    expect((await invitationsApi.cancel('u1')).cleanupAction).toBe('HARD_DELETED');
  });
});
