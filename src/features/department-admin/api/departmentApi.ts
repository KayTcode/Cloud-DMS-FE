import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import {
  DepartmentUsersQuotaSummaryDto,
  UserStorageQuotaDto,
  DepartmentEmployeeDto,
  PaginatedResult,
  CreateEmployeePayload,
  CreateEmployeeResult,
  AllocateUserQuotaPayload,
  SetupDepartmentPayload,
  DepartmentDto,
  DepartmentSetupInfoDto,
  DepartmentAuditLogDto,
  OffboardEmployeePayload,
  OffboardEmployeeResultDto,
} from '../types';

export interface OwnerFileStatsDto {
  userId: string;
  fileCount: number;
  totalBytes?: number;
}

/**
 * Gộp số file theo từng nhân viên (nếu thiếu hoặc không tìm thấy, mặc định 0).
 */
export function mergeOwnerFileStats(
  users: UserStorageQuotaDto[],
  stats?: OwnerFileStatsDto[] | null
): UserStorageQuotaDto[] {
  const map = new Map<string, number>();
  if (Array.isArray(stats)) {
    for (const s of stats) {
      if (s && s.userId) {
        map.set(String(s.userId).toLowerCase(), Number(s.fileCount || 0));
      }
    }
  }

  return users.map((u) => ({
    ...u,
    fileCount: map.get(String(u.userId || '').toLowerCase()) ?? 0,
  }));
}

export const departmentApi = {
  /**
   * Lấy danh sách nhật ký hoạt động của nhân viên thuộc phòng ban
   * Khớp BE: GET /api/department/{departmentId}/logs
   */
  getDepartmentLogs: async (
    departmentId: string,
    pageNumber: number = 1,
    pageSize: number = 50,
    searchTerm?: string,
    action?: string
  ): Promise<PaginatedResult<DepartmentAuditLogDto>> => {
    const params: Record<string, any> = { pageNumber, pageSize };
    if (searchTerm && searchTerm.trim()) {
      params.searchTerm = searchTerm.trim();
    }
    if (action && action.trim() && action !== 'all') {
      params.action = action.trim();
    }
    const res: any = await apiClient.get(API_ENDPOINTS.DEPARTMENT.LOGS(departmentId), { params });
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Lấy tổng quan Quota phòng ban và danh sách Quota của từng nhân viên
   * Khớp BE: Core GET /api/department/{departmentId}/quota/users song song File GET /api/department/{departmentId}/files/owner-stats
   */
  getQuotaSummary: async (departmentId: string): Promise<DepartmentUsersQuotaSummaryDto> => {
    const [resQuota, resStats] = await Promise.allSettled([
      apiClient.get(API_ENDPOINTS.DEPARTMENT.QUOTA_USERS(departmentId)),
      apiClient.get(API_ENDPOINTS.DEPARTMENT.OWNER_FILE_STATS(departmentId)),
    ]);

    if (resQuota.status === 'rejected') {
      throw resQuota.reason;
    }

    const quotaRaw: any = resQuota.value;
    const quotaData: DepartmentUsersQuotaSummaryDto = quotaRaw?.value ?? quotaRaw?.data ?? quotaRaw;

    let statsList: OwnerFileStatsDto[] = [];
    if (resStats.status === 'fulfilled') {
      const statsRaw: any = resStats.value;
      const unwrapped = statsRaw?.value ?? statsRaw?.data ?? statsRaw;
      if (Array.isArray(unwrapped)) {
        statsList = unwrapped;
      }
    }

    if (quotaData && Array.isArray(quotaData.users)) {
      return {
        ...quotaData,
        users: mergeOwnerFileStats(quotaData.users, statsList),
      };
    }

    return quotaData;
  },

  /**
   * Lấy danh sách nhân viên phòng ban phân trang
   * Khớp BE: GET /api/department/{departmentId}/employees
   */
  getEmployees: async (
    departmentId: string,
    pageNumber: number = 1,
    pageSize: number = 50,
    searchTerm?: string,
    // Mặc định chỉ lấy nhân viên đang làm việc. Backend có bộ lọc IsActive nhưng là tuỳ
    // chọn, và trước đây frontend không bao giờ truyền, nên người đã offboard vẫn nằm
    // nguyên trong danh sách y như người đang làm. Truyền false để xem cả người đã nghỉ.
    includeInactive: boolean = false
  ): Promise<PaginatedResult<DepartmentEmployeeDto>> => {
    const params: Record<string, any> = { pageNumber, pageSize };
    if (!includeInactive) {
      params.isActive = true;
    }
    if (searchTerm && searchTerm.trim()) {
      params.searchTerm = searchTerm.trim();
    }
    const res: any = await apiClient.get(API_ENDPOINTS.DEPARTMENT.EMPLOYEES(departmentId), { params });
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Điều chỉnh hạn mức Quota cá nhân cho nhân viên
   * Khớp BE: PUT /api/department/{departmentId}/quota/users/{userId}
   */
  allocateUserQuota: async (
    departmentId: string,
    userId: string,
    quotaBytes: number
  ): Promise<UserStorageQuotaDto> => {
    const payload: AllocateUserQuotaPayload = { quotaBytes };
    const res: any = await apiClient.put(
      API_ENDPOINTS.DEPARTMENT.ALLOCATE_USER_QUOTA(departmentId, userId),
      payload
    );
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Tạo nhân viên mới trong phòng ban (Mời qua Email với token 48h)
   * Khớp BE: POST /api/department/{departmentId}/employees
   */
  createEmployee: async (
    departmentId: string,
    payload: CreateEmployeePayload
  ): Promise<CreateEmployeeResult> => {
    const res: any = await apiClient.post(
      API_ENDPOINTS.DEPARTMENT.EMPLOYEES(departmentId),
      payload
    );
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Vô hiệu hóa tài khoản Nhân viên và Bàn giao Tài sản số về Kho chung phòng ban (Phương án A: Read-Only Snapshot)
   * Khớp BE: POST /api/department/{departmentId}/employees/offboard
   */
  offboardEmployee: async (
    departmentId: string,
    payload: OffboardEmployeePayload
  ): Promise<OffboardEmployeeResultDto> => {
    const res: any = await apiClient.post(
      API_ENDPOINTS.DEPARTMENT.EMPLOYEES_OFFBOARD(departmentId),
      payload
    );
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Lấy thông tin ví Quota ban đầu của Trưởng phòng trước khi khởi tạo phòng ban
   * Khớp BE: GET /api/department/setup-info
   */
  getSetupInfo: async (): Promise<DepartmentSetupInfoDto> => {
    const res: any = await apiClient.get(API_ENDPOINTS.DEPARTMENT.SETUP_INFO);
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Trưởng phòng tự thiết lập phòng ban từ ví Quota ban đầu
   * Khớp BE: POST /api/department/setup
   */
  setupDepartment: async (payload: SetupDepartmentPayload): Promise<DepartmentDto> => {
    const res: any = await apiClient.post(API_ENDPOINTS.DEPARTMENT.SETUP, payload);
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Trưởng phòng cập nhật thời hạn lưu trữ tệp tin mặc định cho phòng ban của mình
   * Khớp BE: PUT /api/department/retention-policy
   */
  setRetentionPolicy: async (retentionDays: number): Promise<string> => {
    const res: any = await apiClient.put(API_ENDPOINTS.DEPARTMENT.RETENTION_POLICY, { retentionDays });
    return res?.value ?? res?.data ?? res;
  },
};

// GET /department/{deptId}/quota/breakdown
export interface DepartmentQuotaBreakdownDto {
  totalBytes: number;
  leadBytes: number;
  employeesBytes: number;
  sharedBytes: number;
  freeBytes: number;
}
export const getQuotaBreakdown = (deptId: string): Promise<DepartmentQuotaBreakdownDto> =>
  apiClient.get(API_ENDPOINTS.DEPARTMENT.QUOTA_BREAKDOWN(deptId))
    .then((r: any) => r?.value ?? r?.data ?? r);

// GET /department/{deptId}/quota/shared
export const getSharedStoreQuotaApi = (deptId: string): Promise<{
  quotaBytes: number;
  usedBytes: number;
  uploadableBytes?: number;
}> =>
  apiClient.get(API_ENDPOINTS.DEPARTMENT.SHARED_QUOTA(deptId));

// PUT /department/{deptId}/quota/shared
export const setSharedStoreQuotaApi = (deptId: string, quotaBytes: number): Promise<void> =>
  apiClient.put(API_ENDPOINTS.DEPARTMENT.SHARED_QUOTA(deptId), { quotaBytes });
