import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import {
  DepartmentUsersQuotaSummaryDto,
  UserStorageQuotaDto,
  DepartmentEmployeeDto,
  PaginatedResult,
  CreateEmployeePayload,
  AllocateUserQuotaPayload,
  SetupDepartmentPayload,
  DepartmentDto,
  DepartmentSetupInfoDto,
  DepartmentAuditLogDto,
  OffboardEmployeePayload,
  OffboardEmployeeResultDto,
} from '../types';

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
   * Khớp BE: GET /api/department/{departmentId}/quota/users
   */
  getQuotaSummary: async (departmentId: string): Promise<DepartmentUsersQuotaSummaryDto> => {
    const res: any = await apiClient.get(API_ENDPOINTS.DEPARTMENT.QUOTA_USERS(departmentId));
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Lấy danh sách nhân viên phòng ban phân trang
   * Khớp BE: GET /api/department/{departmentId}/employees
   */
  getEmployees: async (
    departmentId: string,
    pageNumber: number = 1,
    pageSize: number = 50,
    searchTerm?: string
  ): Promise<PaginatedResult<DepartmentEmployeeDto>> => {
    const params: Record<string, any> = { pageNumber, pageSize };
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
  ): Promise<DepartmentEmployeeDto> => {
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
