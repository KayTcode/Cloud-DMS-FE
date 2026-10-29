export type ActiveTab =
  | 'hub'
  | 'overview'
  | 'users'
  | 'departments'
  | 'activity'
  | 'settings'
  | 'quota'
  | 'create-department-user';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PROVISIONING';

export type TenantPlan = 'ENTERPRISE PLAN' | 'PRO PLAN' | 'STARTER';

export interface FileCategoryBreakdown {
  documentsBytes: number;
  documentsCount: number;
  mediaBytes: number;
  mediaCount: number;
  archivesBytes: number;
  archivesCount: number;
  othersBytes: number;
  othersCount: number;
}

export interface TenantInfo {
  id: string;
  name: string;
  status: TenantStatus;
  plan: TenantPlan;
  contactEmail: string;
  createdAt: string;
  licenseUsed: number;
  licenseLimit: number;
  departmentsCount: number;
  diskUsedTB: number;
  diskAllocatedTB: number;
  filesCount: number;
  directoriesCount: number;
  storageQuotaBytes?: number;
  storageUsedBytes?: number;
  allocatedToDepartmentsBytes?: number;
  unallocatedBytes?: number;
  availableBytes?: number;
  storageProviderId?: string;
  storageProviderName?: string;
  usagePercentage?: number;
  totalFilesCount?: number;
  fileCategories?: FileCategoryBreakdown;
}

export interface TenantEvent {
  id: string;
  text: string;
  timeAgo: string;
  timestamp: string;
  type: 'user' | 'document' | 'storage' | 'system';
}

export interface TenantSettingsUpdateDto {
  name?: string;
  contactEmail?: string;
  plan?: TenantPlan;
}

export interface SubscriptionDto {
  plan: TenantPlan;
  status: 'Active' | 'Past Due' | 'Cancelled';
  priceMonthly: number;
  renewalDate: string;
  billingCycle: 'monthly' | 'annually';
  seatLimit: number;
  seatsUsed: number;
  storageLimitTB: number;
  features: string[];
}

