import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import {
  TenantStatus,
  CreateTenantUserRequest,
  TenantUser,
  TenantSettingsUpdateDto,
} from '@/features/tenants/types';

/**
 * Command: Đổi trạng thái hoạt động Tenant (Active <-> Suspended)
 * Khớp BE: ChangeTenantStatusCommand
 */
export async function toggleSuspendTenant(tenantId: string, currentStatus: TenantStatus): Promise<TenantStatus> {
  const newStatus: TenantStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  try {
    await apiClient.post(API_ENDPOINTS.TENANTS.STATUS(tenantId), { status: newStatus });
  } catch (error) {
    console.warn('[API Offline] Tạm thời xử lý mock cho toggleSuspendTenant:', error);
  }
  return newStatus;
}

/**
 * Command: Tạo User mới thuộc Tenant & Department
 * Khớp BE: CreateTenantUserCommand
 */
export async function createTenantUser(tenantId: string, request: CreateTenantUserRequest): Promise<TenantUser> {
  try {
    const response = await apiClient.post<any, TenantUser>(API_ENDPOINTS.TENANTS.USERS(tenantId), request);
    return response;
  } catch (error) {
    console.warn('[API Offline] Tạm thời xử lý mock cho createTenantUser:', error);
    // Mock created user response
    return {
      id: `usr-${Date.now()}`,
      name: request.name,
      email: request.email,
      department: request.department,
      role: request.role,
      status: 'Active',
      lastActive: 'Just now',
    };
  }
}

/**
 * Command: Tạo tài khoản Department Administrator (DepartmentId là tuỳ chọn)
 * Khớp BE: POST /api/tenant/{tenantId}/department-admins
 */
export async function createDepartmentAdminApi(
  tenantId: string,
  request: import('@/features/tenants/types').CreateDepartmentAdminPayload
): Promise<TenantUser> {
  try {
    const response = await apiClient.post<any, any>(
      API_ENDPOINTS.TENANTS.DEPARTMENT_ADMINS(tenantId),
      request
    );
    
    // Map UserDto returned from Backend to TenantUser
    const data = response.data || response;
    return {
      id: data.id || `usr-${Date.now()}`,
      name: data.fullName || `${request.firstName} ${request.lastName}`.trim(),
      email: data.email || request.email,
      department: data.departmentName || 'Chưa gán phòng ban',
      role: 'DepartmentAdmin',
      status: data.isActive !== false ? 'Active' : 'Pending',
      lastActive: 'Just now',
    };
  } catch (error) {
    console.warn('[API Offline/Fallback] Tạm thời fallback mock cho createDepartmentAdminApi:', error);
    return {
      id: `usr-${Date.now()}`,
      name: `${request.firstName} ${request.lastName}`.trim(),
      email: request.email,
      department: request.departmentId || 'Chưa gán phòng ban',
      role: 'DepartmentAdmin',
      status: 'Active',
      lastActive: 'Just now',
    };
  }
}

/**
 * Command: Xuất bản sao lưu dữ liệu Tenant (Backup)
 * Khớp BE: ExportTenantBackupCommand
 */
export async function exportTenantBackup(tenantId: string): Promise<{ downloadUrl: string; filename: string }> {
  try {
    const response = await apiClient.post(API_ENDPOINTS.TENANTS.BACKUP(tenantId));
    return response as any;
  } catch (error) {
    console.warn('[API Offline] Tạm thời xử lý mock cho exportTenantBackup:', error);
    return {
      downloadUrl: '#',
      filename: `tnt_${tenantId}_backup_${new Date().toISOString().slice(0, 10)}.sql.gz`,
    };
  }
}

/**
 * Command: Cập nhật gói thuê bao Tenant
 * Khớp BE: UpdateTenantSubscriptionCommand
 */
export async function updateTenantSubscription(tenantId: string, plan: string): Promise<boolean> {
  try {
    await apiClient.put(API_ENDPOINTS.TENANTS.SUBSCRIPTION(tenantId), { plan });
    return true;
  } catch (error) {
    console.warn('[API Offline] Tạm thời xử lý mock cho updateTenantSubscription:', error);
    return true;
  }
}

/**
 * Command: Cập nhật cấu hình thông tin Tenant
 * Khớp BE: UpdateTenantSettingsCommand
 */
export async function updateTenantSettings(tenantId: string, settings: TenantSettingsUpdateDto): Promise<boolean> {
  try {
    await apiClient.put(API_ENDPOINTS.TENANTS.SETTINGS(tenantId), settings);
    return true;
  } catch (error) {
    console.warn('[API Offline] Tạm thời xử lý mock cho updateTenantSettings:', error);
    return true;
  }
}
