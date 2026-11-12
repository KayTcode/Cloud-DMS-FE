import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from '@/api/endpoints';

describe('API_ENDPOINTS.INVITATIONS', () => {
  it('builds the resend route without an /api prefix', () => {
    expect(API_ENDPOINTS.INVITATIONS.RESEND('abc')).toBe('/invitations/abc/resend');
  });
  it('builds the cancel route', () => {
    expect(API_ENDPOINTS.INVITATIONS.CANCEL('abc')).toBe('/invitations/abc/cancel');
  });
  it('exposes the pending route', () => {
    expect(API_ENDPOINTS.INVITATIONS.PENDING).toBe('/invitations/pending');
  });
});
