import { describe, expect, it } from 'vitest';
import { operationStatusPath, waitForOperation } from './pendingOperation';

describe('operationStatusPath', () => {
  it('uses statusUrl from Core and strips the /api prefix', () => {
    expect(operationStatusPath({ operationId: 'a', statusUrl: '/api/admin-operations/a' })).toBe('/admin-operations/a');
  });
  it('falls back to File operations', () => {
    expect(operationStatusPath({ operationId: 'b' })).toBe('/operations/b');
  });
});

describe('waitForOperation', () => {
  it('polls the given path until Applied', async () => {
    const seen: string[] = [];
    const statuses = ['Pending', 'Applied'] as const;
    const result = await waitForOperation('/admin-operations/x', {
      get: async (path) => { seen.push(path); return { status: statuses[seen.length - 1] }; },
      sleep: async () => {},
    });
    expect(result).toBe('Applied');
    expect(seen).toEqual(['/admin-operations/x', '/admin-operations/x']);
  });
});
