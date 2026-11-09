export type UserRole = 'SystemAdmin' | 'TenantAdmin' | 'DepartmentAdmin' | 'User' | 'Employee';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId?: string | null;
  departmentId?: string | null;
  permissions: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface MeResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string | null;
  roles: string[];
  tenantId: string | null;
  departmentId: string | null;
  permissions: string[];
}
