export type PlanType = 'Starter' | 'Business' | 'Enterprise';
export type TenantStatus = 'Active' | 'Suspended';

export interface SystemTenant {
  id: string;
  name: string;
  plan: PlanType;
  usersAssigned: number;
  storageUsed: string; // e.g. "2.4 TB"
  storageAllocated: string; // e.g. "5 TB"
  storageDisplay: string; // e.g. "2.4 TB / 5 TB"
  createdDate: string; // e.g. "Jan 12, 2024"
  status: TenantStatus;
  adminEmail?: string;
  region?: string;
}

/**
 * User DTO mapped 1-1 with CleanArchCqrs.Application.Features.SystemAdmin.DTOs.UserDto
 */
export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  tenantId?: string;
  tenantName?: string;
  tenantCode?: string;
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface GetUsersQueryFilter {
  searchTerm?: string;
  roleId?: string;
  tenantId?: string;
  departmentId?: string;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateAdminUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roleIds?: string[];
  tenantId?: string;
  departmentId?: string;
}

export interface UpdateAdminUserPayload {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
}

export interface AssignUserRolesPayload {
  roleIds: string[];
  tenantId?: string;
  departmentId?: string;
}

export interface ResetPasswordPayload {
  newPassword: string;
}

export interface ChangeUserStatusPayload {
  isActive: boolean;
}

export interface SystemActivityItem {
  id: string;
  title: string;
  timeAgo: string;
  actor: string;
  type?: 'upgrade' | 'provider' | 'suspend' | 'security' | 'backup';
}

export interface StorageProviderItem {
  id: string;
  name: string;
  type: string;
  status: 'Connected' | 'Degraded' | 'Offline';
  storageUsed: string;
  capacity: string;
  latency: string;
  region: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
}

export interface SystemMetricsSummary {
  totalTenants: number;
  activeUsers: number;
  onlineUsers: number;
  storageUsedTB: number;
  storageLimitTB: number;
  activeProviders: number;
}

export interface StorageGrowthPoint {
  month: string;
  value: number;
  display: string;
}

export interface CreateSystemTenantPayload {
  name: string;
  plan: PlanType;
  usersAssigned: number;
  storageAllocated: string;
  adminEmail?: string;
  region?: string;
}
