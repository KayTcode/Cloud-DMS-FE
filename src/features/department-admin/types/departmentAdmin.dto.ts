/**
 * Department Admin DTOs matching Backend API Clean Architecture Models
 */

export interface UserStorageQuotaDto {
  userId: string;
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  quotaBytes: number;
  usedBytes: number;
  fileCount?: number;
  availableBytes: number;
  usagePercentage: number;
}


export interface DepartmentUsersQuotaSummaryDto {
  departmentId: string;
  departmentName: string;
  departmentQuotaBytes: number;
  departmentUsedBytes: number;
  totalAllocatedToUsersBytes: number;
  unallocatedDepartmentQuotaBytes: number;
  users: UserStorageQuotaDto[];
}

export interface CreateEmployeePayload {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  password?: string;
  storageQuotaBytes?: number;
}

export interface AllocateUserQuotaPayload {
  quotaBytes: number;
}

export interface SetupDepartmentPayload {
  name: string;
  code: string;
  description?: string;
  adminPersonalQuotaGB?: number;
  adminPersonalQuotaBytes?: number;
}

export interface DepartmentSetupInfoDto {
  assignedQuotaBytes: number;
  assignedQuotaGB: number;
  adminName: string;
  tenantName?: string;
  hasDepartment: boolean;
  departmentId?: string | null;
}

export interface DepartmentDto {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  isActive: boolean;
  departmentAdminName?: string;
  departmentAdminEmail?: string;
  membersCount?: number;
}

export interface DepartmentEmployeeDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phoneNumber?: string;
  isActive: boolean;
  emailConfirmed: boolean;
  roles: string[];
  departmentId?: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface DepartmentAuditLogDto {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorEmail?: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | string;
  details: string;
  tenantId?: string;
  tenantName?: string;
}

