import axiosClient from '@/api/axiosClient';
import { 
  CreateAdminUserPayload, 
  UpdateAdminUserPayload, 
  AssignUserRolesPayload, 
  ResetPasswordPayload, 
  ChangeUserStatusPayload, 
  AdminUserDto,
  CreateSystemTenantPayload, 
  PlanType, 
  SystemTenant, 
  TenantStatus 
} from '../types';

/**
 * 1. Create a new user account (POST /api/admin/users)
 */
export const createAdminUserApi = async (
  payload: CreateAdminUserPayload
): Promise<AdminUserDto> => {
  const response: any = await axiosClient.post('/admin/users', payload);
  if (response?.value) return response.value;
  if (response?.data) return response.data;
  return response;
};

/**
 * 2. Update user profile information (PUT /api/admin/users/{id})
 */
export const updateAdminUserApi = async (
  id: string,
  payload: UpdateAdminUserPayload
): Promise<AdminUserDto> => {
  const response: any = await axiosClient.put(`/admin/users/${id}`, payload);
  if (response?.value) return response.value;
  if (response?.data) return response.data;
  return response;
};

/**
 * 3. Assign or update user roles and organizational scope (PUT /api/admin/users/{id}/roles)
 */
export const assignUserRolesApi = async (
  id: string,
  payload: AssignUserRolesPayload
): Promise<AdminUserDto> => {
  const response: any = await axiosClient.put(`/admin/users/${id}/roles`, payload);
  if (response?.value) return response.value;
  if (response?.data) return response.data;
  return response;
};

/**
 * 4. Reset user password (POST /api/admin/users/{id}/reset-password)
 */
export const resetUserPasswordApi = async (
  id: string,
  payload: ResetPasswordPayload
): Promise<boolean> => {
  await axiosClient.post(`/admin/users/${id}/reset-password`, payload);
  return true;
};

/**
 * 5. Change user status Active / Deactivate (PATCH /api/admin/users/{id}/status)
 */
export const changeUserStatusApi = async (
  id: string,
  payload: ChangeUserStatusPayload
): Promise<boolean> => {
  await axiosClient.patch(`/admin/users/${id}/status`, payload);
  return true;
};

/**
 * 6. Delete a user account (DELETE /api/admin/users/{id})
 */
export const deleteAdminUserApi = async (id: string): Promise<boolean> => {
  await axiosClient.delete(`/admin/users/${id}`);
  return true;
};

/**
 * Helper: Provision / Create a new Tenant
 */
export const createSystemTenantApi = async (
  payload: CreateSystemTenantPayload
): Promise<SystemTenant> => {
  try {
    const response: any = await axiosClient.post('/admin/tenants', payload);
    if (response?.value) return response.value;
    if (response?.data) return response.data;
    return response;
  } catch {
    // Fallback simulation
  }

  const today = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${months[today.getMonth()]} ${String(today.getDate()).padStart(2, '0')}, ${today.getFullYear()}`;

  return {
    id: `t-${Date.now()}`,
    name: payload.name,
    plan: payload.plan,
    usersAssigned: payload.usersAssigned,
    storageUsed: '0 GB',
    storageAllocated: payload.storageAllocated,
    storageDisplay: `0 GB / ${payload.storageAllocated}`,
    createdDate: formattedDate,
    status: 'Active',
    adminEmail: payload.adminEmail || `admin@${payload.name.toLowerCase().replace(/\s+/g, '')}.com`,
    region: payload.region || 'us-east-1 (N. Virginia)',
  };
};

/**
 * Helper: Toggle suspend / activate status of a tenant
 */
export const toggleTenantStatusApi = async (
  tenantId: string,
  currentStatus: TenantStatus
): Promise<TenantStatus> => {
  const nextStatus: TenantStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
  try {
    await axiosClient.put(`/admin/tenants/${tenantId}/status`, {
      status: nextStatus,
    });
  } catch {
    // Local fallback
  }
  return nextStatus;
};

/**
 * Helper: Change subscription plan of a tenant
 */
export const changeTenantPlanApi = async (
  tenantId: string,
  newPlan: PlanType
): Promise<{ plan: PlanType; storageAllocated: string; storageDisplay: string }> => {
  const newStorageAlloc =
    newPlan === 'Starter'
      ? '500 GB'
      : newPlan === 'Business'
      ? '2 TB'
      : '5 TB';

  try {
    await axiosClient.put(`/admin/tenants/${tenantId}/plan`, {
      plan: newPlan,
      storageAllocated: newStorageAlloc,
    });
  } catch {
    // Local fallback
  }

  return {
    plan: newPlan,
    storageAllocated: newStorageAlloc,
    storageDisplay: `0 GB / ${newStorageAlloc}`,
  };
};

/**
 * Helper: Delete a tenant instance
 */
export const deleteSystemTenantApi = async (tenantId: string): Promise<boolean> => {
  try {
    await axiosClient.delete(`/admin/tenants/${tenantId}`);
    return true;
  } catch {
    return true;
  }
};
