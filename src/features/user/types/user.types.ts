export interface PersonalStorageQuotaDto {
  userId: string;
  fullName: string;
  quotaBytes: number;
  usedBytes: number;
  availableBytes: number;
  uploadableBytes?: number;
  usagePercent: number;
  departmentName?: string;
}

export interface DepartmentQuota {
  id: string;
  departmentName: string;
  allocatedQuotaGB: number;
  usedSpaceGB: number;
  availableSpaceGB: number;
  usagePercent: number;
  color?: string;
}


export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  role: 'SystemAdmin' | 'TenantAdmin' | 'DepartmentAdmin' | 'User' | 'Employee' | string;
  phone: string;
  location: string;
  timezone: string;
  language: string;
  avatarUrl: string;
  storageQuotaGB: number;
  storageUsedGB: number;
  twoFactorEnabled: boolean;
  joinedDate: string;
  lastLogin: string;
}

export interface UserActivity {
  id: string;
  action: 'upload' | 'download' | 'share' | 'delete' | 'edit_profile' | 'update_quota';
  targetName: string;
  timestamp: string;
  ipAddress: string;
  device: string;
}

export type UserNavTab = 'documents' | 'shared' | 'trash' | 'storage' | 'profile';
