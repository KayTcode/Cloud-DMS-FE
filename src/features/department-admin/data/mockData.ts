import { DepartmentInfo, DepartmentMember, QuotaRequest, StorageGrowthPoint, StorageAlert } from '../types';

export const initialDepartment: DepartmentInfo = {
  name: 'Phòng ban',
  tenantName: 'Tổ chức Doanh nghiệp',
  adminName: 'Trưởng phòng',
  adminRole: 'Department Admin',
  adminEmail: '',
  totalAllocatedGB: 0,
  tenantPoolLimitGB: 0,
  usedSpaceGB: 0,
  filesStorageGB: 0,
  backupsStorageGB: 0,
  otherStorageGB: 0,
  growthDeltaSinceAprGB: 0,
};

export const initialMembers: DepartmentMember[] = [];
export const initialRequests: QuotaRequest[] = [];
export const initialGrowthData: StorageGrowthPoint[] = [];
export const initialAlerts: StorageAlert[] = [];
