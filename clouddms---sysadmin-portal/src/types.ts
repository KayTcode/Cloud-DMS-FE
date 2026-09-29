export type ActiveTab = 'overview' | 'users' | 'departments' | 'storage' | 'activity' | 'settings' | 'create-department-user';

export type NavItem = 'dashboard' | 'tenants' | 'storage-providers' | 'audit-logs' | 'settings';

export interface TenantInfo {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PROVISIONING';
  plan: 'ENTERPRISE PLAN' | 'PRO PLAN' | 'STARTER';
  contactEmail: string;
  createdAt: string;
  licenseUsed: number;
  licenseLimit: number;
  departmentsCount: number;
  diskUsedTB: number;
  diskAllocatedTB: number;
  filesCount: number;
  directoriesCount: number;
}

export interface TenantEvent {
  id: string;
  text: string;
  timeAgo: string;
  timestamp: string;
  type: 'user' | 'document' | 'storage' | 'system';
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'Active' | 'Pending' | 'Suspended';
  lastActive: string;
}

export interface Department {
  id: string;
  name: string;
  headCount: number;
  lead: string;
  allocatedStorageGB: number;
}
