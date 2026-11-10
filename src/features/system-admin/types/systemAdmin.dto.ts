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
  adminId?: string;
  adminFullName?: string;
  region?: string;
  tenantCode?: string;
  phoneNumber?: string;
  departmentName?: string;
  storageProviderName?: string;
  storageQuotaBytes?: number;
  actualStorageUsedBytes?: number;
  usagePercentage?: number;

  // Tiếp quản lâm thời & Khuyết Admin
  isInterimManaged?: boolean;
  vacantAdminUserId?: string | null;
  interimManagedByUserId?: string | null;
  interimStartedAt?: string | null;
}

export type TenantAdminOffboardScenario = 'InterimTakeover' | 'InviteNewTenantAdmin';

export interface OffboardTenantAdminPayload {
  tenantAdminId: string;
  scenario: TenantAdminOffboardScenario;
  newAdminEmail?: string;
  newAdminFirstName?: string;
  newAdminLastName?: string;
  newAdminPhoneNumber?: string;
  reassignedUserId?: string;
  reason?: string;
}

export interface OffboardTenantAdminResult {
  tenantId: string;
  offboardedAdminId: string;
  scenario: number;
  isInterimManaged: boolean;
  newTenantAdminId?: string | null;
  invitationTokenExpiresAt?: string | null;
  completedAt: string;
  message: string;
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
  migrationReadOnly?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateAdminUserPayload {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  tenantName?: string;
  plan?: PlanType;
  roleIds?: string[];
  tenantId?: string;
  storageProviderId?: string;
  storageQuotaBytes?: number;
}

export interface CreateEmployeePayload {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  password?: string;
  storageQuotaBytes?: number;
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
  isActive?: boolean;
  migrationReservedBytes?: number;
  migrationRetainedBytes?: number;
  migrationReadOnly?: boolean;
  id: string;
  name: string;
  type: string;
  status: 'Connected' | 'Degraded' | 'Offline';
  storageUsed: string;
  capacity: string;
  latency: string;
  region: string;
  totalCapacityBytes?: number;
  usedCapacityBytes?: number;
  availableCapacityBytes?: number;
  allocatedToTenantsBytes?: number;
  unallocatedCapacityBytes?: number;
  externalUsedBytes?: number;
  systemUsedBytes?: number;
  availableToGrantBytes?: number;
  rootFolderId?: string;
  tenantsCount?: number;
  createdAt?: string;
  lastSyncAt?: string;
}

export type StorageProviderTypeEnum = 0 | 1 | 2; // 0 = Local, 1 = GoogleDrive, 2 = OneDrive

export interface ConnectStorageProviderPayload {
  name: string;
  type: StorageProviderTypeEnum;
  configJson: string;
}

export interface TestConnectionPayload {
  type: StorageProviderTypeEnum;
  configJson: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  totalCapacityBytes: number;
  usedCapacityBytes: number;
  availableCapacityBytes: number;
  latencyMs: number;
}

export interface StorageProviderAvailableQuotaResponse {
  providerId: string;
  providerName: string;
  type: number;
  totalCapacityBytes: number;
  cloudUsedBytes: number;
  cloudFreeBytes: number;
  alreadyAllocatedBytes: number;
  availableToAllocateBytes: number;
}

export interface TenantStorageQuotaResponse {
  tenantId: string;
  tenantName: string;
  tenantCode?: string;
  storageProviderId?: string;
  storageProviderName?: string;
  storageProviderType?: number;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  availableBytes?: number;
  usagePercentage?: number;
  allocatedToDepartmentsBytes?: number;
  allocations: QuotaAllocationPartDto[];
}

export interface AllocateTenantQuotaPayload {
  storageProviderId: string;
  quotaBytes: number;
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

export interface QuotaAllocationPartDto {
  allocationId: string;
  storageProviderId: string;
  storageProviderName: string;
  storageProviderType: number;
  grantedBytes: number;
  allocatedToChildrenBytes: number;
  usedBytes: number;
}

/** @deprecated Use TenantStorageQuotaResponse */
export type TenantQuotaAllocationListResponse = TenantStorageQuotaResponse;

export interface AllocateTenantQuotaAddPayload {
  storageProviderId: string;
  bytes: number;
}

export interface ReduceTenantQuotaPayload {
  bytes: number;
}

// ==========================================
// Bổ nhiệm Quản trị viên Doanh nghiệp mới (Assign Vacant Tenant Admin)
// ==========================================

export interface AssignTenantAdminPayload {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  note?: string;
}

export interface AssignTenantAdminResultDto {
  tenantId: string;
  tenantName: string;
  newAdminUserId: string;
  newAdminEmail: string;
  status: string;
  invitationExpiresAt: string;
  note?: string;
  assignedAt: string;
}

export interface ResendTenantAdminInvitationResultDto {
  tenantId: string;
  targetUserEmail: string;
  status: string;
  newExpiresAt: string;
  resentAt: string;
}

export interface CancelTenantAdminInvitationResultDto {
  tenantId: string;
  cancelledUserEmail: string;
  status: string;
  cancelledAt: string;
  smartCleanupApplied: boolean;
}

