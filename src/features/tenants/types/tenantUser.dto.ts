export type UserStatus = 'Active' | 'Pending' | 'Suspended';

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: UserStatus;
  lastActive: string;
}

export interface CreateTenantUserRequest {
  name: string;
  email: string;
  department: string;
  role: string;
}

export interface CreateDepartmentAdminPayload {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  departmentId?: string; // Optional: Có thể gán hoặc để trống
  storageQuotaBytes?: number;
}

export interface Department {
  id: string;
  name: string;
  headCount: number;
  lead: string;
  adminId?: string;
  adminIsActive?: boolean;
  allocatedStorageGB: number;
  adminEmail?: string;
  storageQuotaBytes?: number;
  storageUsedBytes?: number;
  vacantLeadQuotaBytes?: number;
  interimHandoverFolderId?: string;
  isVacant?: boolean;
}

export interface DepartmentMember {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  isActive: boolean;
}

export interface DepartmentDetail {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  quotaBytes: number;
  usedBytes: number;
  isVacant: boolean;
  lead?: DepartmentMember | null;
  employees: DepartmentMember[];
  hasHeldLeadFiles: boolean;
}

export interface AssignVacantDepartmentLeadPayload {
  departmentId: string;
  targetUserId?: string | null;
  newAdminEmail?: string | null;
  newAdminFirstName?: string | null;
  newAdminLastName?: string | null;
  newAdminPhoneNumber?: string | null;
}

export interface AssignVacantDepartmentLeadResultDto {
  departmentId: string;
  departmentName: string;
  newDepartmentAdminId: string;
  newDepartmentAdminName: string;
  newDepartmentAdminEmail: string;
  isInternalPromotion: boolean;
  isInvitationEmailSent: boolean;
  transferredFolderId?: string | null;
  transferredFilesCount: number;
  transferredBytes: number;
  newAdminTotalQuotaBytes: number;
  quotaToNewLeadBytes: number;
  assignedAt: string;
}
