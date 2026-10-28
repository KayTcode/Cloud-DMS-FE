import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import {
  CreateQuotaRequestPayload,
  DecideQuotaRequestPayload,
  GetQuotaHistoryFilter,
  PagedResult,
  QuotaFeatureMetricsDto,
  QuotaHistoryDto,
  QuotaRequestDto,
} from '../types/quota.types';

export const quotaApi = {
  // Gửi yêu cầu tăng quota lưu trữ (Employee / DeptAdmin / TenantAdmin)
  createRequest: async (payload: CreateQuotaRequestPayload): Promise<QuotaRequestDto> => {
    const res: any = await apiClient.post(API_ENDPOINTS.QUOTA.REQUESTS, payload);
    return res?.value ?? res?.data ?? res;
  },

  // Hủy yêu cầu đang chờ duyệt (Pending) của chính mình
  cancelRequest: async (requestId: string): Promise<void> => {
    const res: any = await apiClient.post(API_ENDPOINTS.QUOTA.CANCEL(requestId));
    return res?.value ?? res?.data ?? res;
  },

  // Lấy danh sách yêu cầu đang chờ chính người dùng hiện tại duyệt (DeptAdmin / TenantAdmin)
  getPendingForMe: async (): Promise<QuotaRequestDto[]> => {
    const res: any = await apiClient.get(API_ENDPOINTS.QUOTA.PENDING_FOR_ME);
    const data = res?.value ?? res?.data ?? res;
    return Array.isArray(data) ? data : [];
  },

  // Duyệt đủ hoặc duyệt một phần yêu cầu
  decideRequest: async (requestId: string, payload: DecideQuotaRequestPayload): Promise<QuotaRequestDto> => {
    const res: any = await apiClient.post(API_ENDPOINTS.QUOTA.DECIDE(requestId), payload);
    return res?.value ?? res?.data ?? res;
  },

  // Từ chối yêu cầu (bắt buộc nhập lý do)
  rejectRequest: async (requestId: string, rejectionReason: string): Promise<QuotaRequestDto> => {
    const res: any = await apiClient.post(API_ENDPOINTS.QUOTA.REJECT(requestId), {
      rejectionReason,
    });
    return res?.value ?? res?.data ?? res;
  },

  // Xem lịch sử thay đổi quota (phân quyền tự động theo role)
  getHistory: async (filter?: GetQuotaHistoryFilter): Promise<PagedResult<QuotaHistoryDto>> => {
    const res: any = await apiClient.get(API_ENDPOINTS.QUOTA.HISTORY, {
      params: {
        accountId: filter?.accountId || undefined,
        quotaRequestId: filter?.quotaRequestId || undefined,
        fromDate: filter?.fromDate || undefined,
        toDate: filter?.toDate || undefined,
        page: filter?.page ?? 1,
        pageSize: filter?.pageSize ?? 20,
      },
    });
    const data = res?.value ?? res?.data ?? res;
    return {
      items: data?.items ?? [],
      totalCount: data?.totalCount ?? 0,
      page: data?.page ?? 1,
      pageSize: data?.pageSize ?? 20,
      totalPages: data?.totalPages ?? 1,
      hasPreviousPage: Boolean(data?.hasPreviousPage),
      hasNextPage: Boolean(data?.hasNextPage),
    };
  },

  // SystemAdmin: Bật/tắt tính năng theo từng Tenant (Feature Flag)
  setFeatureEnabled: async (tenantId: string, enabled: boolean): Promise<void> => {
    const res: any = await apiClient.put(API_ENDPOINTS.ADMIN_QUOTA.TOGGLE_FEATURE(tenantId), {
      enabled,
    });
    return res?.value ?? res?.data ?? res;
  },

  // SystemAdmin: Lấy số liệu thống kê yêu cầu quota toàn hệ thống
  getMetrics: async (fromDate?: string, toDate?: string): Promise<QuotaFeatureMetricsDto> => {
    const res: any = await apiClient.get(API_ENDPOINTS.ADMIN_QUOTA.METRICS, {
      params: {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      },
    });
    return res?.value ?? res?.data ?? res;
  },

  // SystemAdmin: Thử lại tạo folder Cloud cho user bị lỗi
  retryFolderProvisioning: async (userId: string): Promise<any> => {
    const res: any = await apiClient.post(API_ENDPOINTS.ADMIN_QUOTA.RETRY_FOLDER_PROVISIONING(userId));
    return res?.value ?? res?.data ?? res;
  },
};
