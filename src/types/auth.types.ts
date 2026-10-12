export type UserRole = 'SystemAdmin' | 'TenantAdmin' | 'DepartmentAdmin' | 'User' | 'Employee';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId?: string | null;
  permissions: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  tenantId?: string | null;
  permissions: string[];
}
