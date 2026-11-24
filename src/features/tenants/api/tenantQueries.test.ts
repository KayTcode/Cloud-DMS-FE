import { describe, expect, it } from 'vitest';
import { mergeTenantFilesSummary, TenantOverviewSummary, TenantFilesSummaryDto } from './tenantQueries';

describe('mergeTenantFilesSummary', () => {
  const mockOverview: TenantOverviewSummary = {
    tenantId: 'tenant-123',
    tenantName: 'Acme Corp',
    tenantCode: 'ACME',
    isActive: true,
    storageQuotaBytes: 10737418240, // 10 GB
    allocatedToDepartmentsBytes: 5368709120, // 5 GB
    unallocatedBytes: 5368709120,
    availableBytes: 5368709120,
    usagePercentage: 50,
    usersCount: 25,
    departmentsCount: 4,
    totalFilesCount: 0,
    actualStorageUsedBytes: 2147483648, // 2 GB
    fileCategories: {
      documentsBytes: 0,
      documentsCount: 0,
      mediaBytes: 0,
      mediaCount: 0,
      archivesBytes: 0,
      archivesCount: 0,
      othersBytes: 0,
      othersCount: 0,
    },
  };

  it('merges totalFilesCount and fileCategories from filesSummary', () => {
    const filesSummary: TenantFilesSummaryDto = {
      tenantId: 'tenant-123',
      totalFilesCount: 150,
      actualFilesBytes: 2000000000,
      fileCategories: {
        documentsBytes: 1000000000,
        documentsCount: 80,
        mediaBytes: 800000000,
        mediaCount: 40,
        archivesBytes: 150000000,
        archivesCount: 20,
        othersBytes: 50000000,
        othersCount: 10,
      },
    };

    const merged = mergeTenantFilesSummary(mockOverview, filesSummary);

    expect(merged).not.toBeNull();
    expect(merged!.totalFilesCount).toBe(150);
    expect(merged!.fileCategories.documentsCount).toBe(80);
    expect(merged!.fileCategories.documentsBytes).toBe(1000000000);
    expect(merged!.fileCategories.mediaCount).toBe(40);
    expect(merged!.fileCategories.archivesCount).toBe(20);
    expect(merged!.fileCategories.othersCount).toBe(10);
    // Core fields remain intact
    expect(merged!.tenantName).toBe('Acme Corp');
    expect(merged!.usersCount).toBe(25);
    expect(merged!.actualStorageUsedBytes).toBe(2147483648);
  });

  it('handles null filesSummary without breaking', () => {
    const merged = mergeTenantFilesSummary(mockOverview, null);

    expect(merged).not.toBeNull();
    expect(merged!.totalFilesCount).toBe(0);
    expect(merged!.fileCategories.documentsCount).toBe(0);
    expect(merged!.tenantId).toBe('tenant-123');
  });

  it.each([0, 1073741824])('uses file bytes when Core usage is lower (%i bytes)', (coreBytes) => {
    const merged = mergeTenantFilesSummary(
      { ...mockOverview, actualStorageUsedBytes: coreBytes },
      { actualFilesBytes: 2147483648 }
    );

    expect(merged!.actualStorageUsedBytes).toBe(2147483648);
  });

  it('keeps Core usage when it is greater than file bytes', () => {
    const merged = mergeTenantFilesSummary(mockOverview, { actualFilesBytes: 1073741824 });

    expect(merged!.actualStorageUsedBytes).toBe(mockOverview.actualStorageUsedBytes);
  });

  it.each([null, undefined, {}])('keeps Core usage when file bytes are unavailable (%j)', (filesSummary) => {
    const merged = mergeTenantFilesSummary(mockOverview, filesSummary);

    expect(merged!.actualStorageUsedBytes).toBe(mockOverview.actualStorageUsedBytes);
  });

  it('returns null if overview is null', () => {
    expect(mergeTenantFilesSummary(null, null)).toBeNull();
  });
});
