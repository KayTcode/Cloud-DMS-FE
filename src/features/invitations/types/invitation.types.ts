/**
 * Invitation lifecycle DTOs matching CleanArchCqrs invitation contracts (SPEC 5.1)
 */

export type InvitationCleanupAction = 'HARD_DELETED' | 'UNLINKED_FORMER_EMPLOYEE';

export interface PendingInvitationDto {
  userId: string;
  fullName: string;
  email: string;
  roleName: string;
  tenantId: string | null;
  tenantName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  quotaBytes: number;
  createdAt: string;
  lastInvitationSentAt: string | null;
  tokenExpiresAt: string;
  isExpired: boolean;
}

export interface ResendInvitationResultDto {
  targetUserId: string;
  email: string;
  newExpiresAt: string;
  message: string;
}

export interface CancelInvitationResultDto {
  targetUserId: string;
  email: string;
  cleanupAction: InvitationCleanupAction;
  message: string;
}

export interface GetPendingInvitationsFilter {
  tenantId?: string;
  departmentId?: string;
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
}
