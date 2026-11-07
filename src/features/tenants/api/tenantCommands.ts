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

/**
 * Query: Đọc cấu hình Tenant hiện tại (bao gồm cờ cho phép tải tệp chưa quét virus)
 * Khớp BE: GET /api/tenants/{tenantId}/settings
 *
 * Lưu ý: không bọc catch-và-coi-như-thành-công như các hàm phía trên trong file
 * này (đó là mock fallback tạm cho các màn hình khác). F8 yêu cầu hiện toast lỗi
 * thật khi API lỗi, nên lỗi được throw ra để UI xử lý.
 */
export interface TenantSettingsDto {
  // Fix 10: real backend controller field is `allowUnscannedLargeFileDownload`,
  // not `allowUnscannedDownload`.
  allowUnscannedLargeFileDownload: boolean;
  [key: string]: unknown;
}

export async function getTenantSettings(tenantId: string): Promise<TenantSettingsDto> {
  const response = await apiClient.get<any, any>(API_ENDPOINTS.TENANTS.SETTINGS(tenantId));
  return (response?.value || response?.data || response) as TenantSettingsDto;
}

/**
 * Command: Bật/tắt cho phép tải tệp chưa được quét virus (quá lớn để quét) trong Tenant
 * Khớp BE: PUT /api/tenants/{tenantId}/settings/unscanned-download { allow }
 *
 * Cố ý KHÔNG áp dụng mẫu "mock fallback khi offline" (catch -> trả về true) như các
 * hàm update* khác trong file này: yêu cầu F8 là phải hiện toast lỗi thật khi thất bại,
 * nên lỗi được throw lên để component xử lý.
 */
export async function setUnscannedDownloadPolicy(tenantId: string, allow: boolean): Promise<void> {
  await apiClient.put(API_ENDPOINTS.TENANTS.TENANT_UNSCANNED_DOWNLOAD(tenantId), { allow });
}

/**
 * Command: Cấp / Điều chỉnh Quota lưu trữ cho Phòng ban
 * Khớp BE: AllocateDepartmentStorageQuotaCommand -> PUT /api/tenant/{tenantId}/departments/{departmentId}/quota
 */
export async function allocateDepartmentQuotaApi(
  tenantId: string,
  departmentId: string,
  quotaBytes: number
): Promise<{ departmentId: string; storageQuotaBytes: number; storageQuotaGB: number }> {
  const response = await apiClient.put<any, any>(
    API_ENDPOINTS.TENANTS.DEPARTMENT_QUOTA(tenantId, departmentId),
    { quotaBytes }
  );
  return response?.value || response?.data || response;
}

export interface OffboardDepartmentAdminPayload {
  departmentAdminId: string;
  targetUserId?: string | null;
  newAdminEmail?: string | null;
  newAdminFirstName?: string | null;
  newAdminLastName?: string | null;
  newAdminPhoneNumber?: string | null;
  handoverReason?: string | null;
  scenario?: string | null;
}

export interface OffboardDepartmentAdminResult {
  offboardedUserId: string;
  targetUserId: string | null;
  handoverFolderId: string | null;
  handoverFolderName: string | null;
  sharedFolderId: string | null;
  sharedFilesCount: number;
  sharedBytes: number;
  quotaToNewLeadBytes: number;
  quotaToSharedBytes: number;
  transferredFilesCount: number;
  transferredBytes: number;
  transferredFoldersCount: number;
  abortedUploadSessionsCount: number;
  isNewDepartmentLeadAssigned: boolean;
  offboardedAt: string;
}

/**
 * Command: Vô hiệu hóa Trưởng phòng và Chuyển giao toàn bộ dữ liệu & Quota
 * Khớp BE: OffboardDepartmentAdminCommand -> POST /api/tenant/{tenantId}/department-admins/offboard
 */
export async function offboardDepartmentAdminApi(
  tenantId: string,
  payload: OffboardDepartmentAdminPayload
): Promise<OffboardDepartmentAdminResult> {
  const response = await apiClient.post<any, any>(
    API_ENDPOINTS.TENANTS.DEPARTMENT_ADMINS_OFFBOARD(tenantId),
    payload
  );
  return response?.value || response?.data || response;
}

/**
 * Command: Bổ nhiệm Trưởng phòng cho Phòng ban Khuyết Lead & Bàn giao Kho Tạm giữ
 * Khớp BE: POST /api/tenant/{tenantId}/departments/{departmentId}/assign-lead
 */
export interface EmployeeDepartmentTransferResult {
  userId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  transferredFilesCount: number;
  transferredBytes: number;
  handoverFolderId?: string | null;
}

/**
 * Command: Chuyển nhân viên sang Phòng ban khác
 * Khớp BE: POST /api/tenant/{tenantId}/users/{userId}/transfer-department
 */
export async function transferEmployeeDepartment(
  tenantId: string,
  userId: string,
  targetDepartmentId: string
): Promise<EmployeeDepartmentTransferResult> {
  const response = await apiClient.post<any, any>(
    API_ENDPOINTS.TENANTS.TRANSFER_DEPARTMENT(tenantId, userId),
    { targetDepartmentId }
  );
  return response?.value || response?.data || response;
}

export async function assignVacantDepartmentLeadApi(
  tenantId: string,
  departmentId: string,
  payload: import('@/features/tenants/types').AssignVacantDepartmentLeadPayload
): Promise<import('@/features/tenants/types').AssignVacantDepartmentLeadResultDto> {
  const response = await apiClient.post<any, any>(
    API_ENDPOINTS.TENANTS.DEPARTMENT_ADMINS_ASSIGN_VACANT_LEAD(tenantId, departmentId),
    payload
  );
  return response?.value || response?.data || response;
}

/**
 * Command: Vô hiệu hóa Nhân viên và Chuyển giao toàn bộ dữ liệu về Kho chung phòng ban (cấp Quản trị Tổ chức - Tenant Admin)
 * Khớp BE: OffboardEmployeeCommand -> POST /api/tenant/{tenantId}/employees/offboard
 */
export async function offboardEmployeeByTenantApi(
  tenantId: string,
  payload: import('@/features/department-admin/types').OffboardEmployeePayload
): Promise<import('@/features/department-admin/types').OffboardEmployeeResultDto> {
  const response = await apiClient.post<any, any>(
    API_ENDPOINTS.TENANTS.EMPLOYEES_OFFBOARD(tenantId),
    payload
  );
  return response?.value || response?.data || response;
}
