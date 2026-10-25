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
  availableBytes?: number;
  storageProviderId?: string;
  storageProviderName?: string;
  usagePercentage?: number;
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

