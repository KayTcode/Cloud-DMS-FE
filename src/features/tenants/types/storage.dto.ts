/**
 * Storage statistics and quota breakdown DTOs matching .NET Storage Service
 */

export interface StorageBreakdownCategory {
  id: string;
  name: string;
  gb: number;
  tb: number;
  color: string;
  textColor: string;
  lightBg: string;
  borderColor: string;
  filesCount: string;
}

export interface DepartmentStorageUsage {
  name: string;
  usedGB: number;
  quotaGB: number;
  percent: number;
  lead: string;
  members: number;
  filesCount: string;
  category: string;
  color: string;
}

export interface StorageStats {
  tenantId: string;
  totalAllocatedTB: number;
  totalUsedTB: number;
  totalAllocatedGB: number;
  totalUsedGB: number;
  freeGB: number;
  percentUsed: number;
  percentFree: number;
  categories: StorageBreakdownCategory[];
  departments: DepartmentStorageUsage[];
}
