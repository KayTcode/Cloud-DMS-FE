import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import type { PagedResult } from '@/types/common.types';
import type {
  CancelInvitationResultDto,
  GetPendingInvitationsFilter,
  PendingInvitationDto,
  ResendInvitationResultDto,
} from '../types/invitation.types';

export const invitationsApi = {
  // Lấy danh sách lời mời đang chờ kích hoạt (phân quyền tự động theo role)
  getPending: async (filter?: GetPendingInvitationsFilter): Promise<PagedResult<PendingInvitationDto>> => {
    const res: any = await apiClient.get(API_ENDPOINTS.INVITATIONS.PENDING, {
      params: {
        tenantId: filter?.tenantId || undefined,
        departmentId: filter?.departmentId || undefined,
        searchTerm: filter?.searchTerm || undefined,
        pageNumber: filter?.pageNumber ?? 1,
        pageSize: filter?.pageSize ?? 20,
      },
    });
    const data = res?.value ?? res?.data ?? res;
    return {
      items: data?.items ?? [],
      pageNumber: data?.pageNumber ?? 1,
      totalPages: data?.totalPages ?? 1,
      totalCount: data?.totalCount ?? 0,
      hasPreviousPage: Boolean(data?.hasPreviousPage),
      hasNextPage: Boolean(data?.hasNextPage),
    };
  },

  // Gửi lại lời mời kích hoạt
  resend: async (targetUserId: string): Promise<ResendInvitationResultDto> => {
    const res: any = await apiClient.post(API_ENDPOINTS.INVITATIONS.RESEND(targetUserId));
    return res?.value ?? res?.data ?? res;
  },

  // Hủy lời mời
  cancel: async (targetUserId: string): Promise<CancelInvitationResultDto> => {
    const res: any = await apiClient.post(API_ENDPOINTS.INVITATIONS.CANCEL(targetUserId));
    return res?.value ?? res?.data ?? res;
  },
};
