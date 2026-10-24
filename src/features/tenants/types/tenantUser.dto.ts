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
}
