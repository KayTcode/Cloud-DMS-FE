import { describe, expect, it } from 'vitest';
import { mergeOwnerFileStats, OwnerFileStatsDto } from './departmentApi';
import { UserStorageQuotaDto } from '../types';

describe('mergeOwnerFileStats', () => {
  const mockUsers: UserStorageQuotaDto[] = [
    {
      userId: 'user-1',
      fullName: 'User One',
      email: 'u1@example.com',
      departmentId: 'dept-1',
      departmentName: 'Engineering',
      quotaBytes: 1000,
      usedBytes: 500,
      availableBytes: 500,
      usagePercentage: 50,
    },
    {
      userId: 'USER-2',
      fullName: 'User Two',
      email: 'u2@example.com',
      departmentId: 'dept-1',
      departmentName: 'Engineering',
      quotaBytes: 2000,
      usedBytes: 1000,
      availableBytes: 1000,
      usagePercentage: 50,
    },
    {
      userId: 'user-3',
      fullName: 'User Three',
      email: 'u3@example.com',
      departmentId: 'dept-1',
      departmentName: 'Engineering',
      quotaBytes: 3000,
      usedBytes: 0,
      availableBytes: 3000,
      usagePercentage: 0,
    },
  ];

  it('merges file counts by userId correctly and case-insensitively', () => {
    const stats: OwnerFileStatsDto[] = [
      { userId: 'user-1', fileCount: 42, totalBytes: 12345 },
      { userId: 'user-2', fileCount: 15, totalBytes: 6789 },
    ];

    const result = mergeOwnerFileStats(mockUsers, stats);

    expect(result).toHaveLength(3);
    expect(result[0].fileCount).toBe(42);
    expect(result[1].fileCount).toBe(15);
    expect(result[2].fileCount).toBe(0); // missing in stats -> 0
    expect(result[0].fullName).toBe('User One');
    expect(result[0].quotaBytes).toBe(1000);
  });

  it('handles null, undefined, or empty stats by setting fileCount to 0 for all users', () => {
    const resultNull = mergeOwnerFileStats(mockUsers, null);
    expect(resultNull.map((u) => u.fileCount)).toEqual([0, 0, 0]);

    const resultUndefined = mergeOwnerFileStats(mockUsers, undefined);
    expect(resultUndefined.map((u) => u.fileCount)).toEqual([0, 0, 0]);

    const resultEmpty = mergeOwnerFileStats(mockUsers, []);
    expect(resultEmpty.map((u) => u.fileCount)).toEqual([0, 0, 0]);
  });
});
