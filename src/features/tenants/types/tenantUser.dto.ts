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

export interface Department {
  id: string;
  name: string;
  headCount: number;
  lead: string;
  allocatedStorageGB: number;
}
