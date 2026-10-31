export type QuotaRequestStatus =
  | 'Pending'
  | 'Approved'
  | 'PartiallyApproved'
  | 'Rejected'
  | 'Cancelled';

export type QuotaHistoryEventType =
  | 'InitialGrant'
  | 'RequestApproved'
  | 'TemporaryExpired'
  | 'ManualAdjust';

export interface QuotaRequestDto {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole?: string;
  approverId: string;
  approverName: string;
  quotaType: string;
  currentQuotaBytes: number;
  requestedAdditionalBytes: number;
  approvedAdditionalBytes?: number | null;
  isTemporary: boolean;
  expiresAt?: string | null;
  reason: string;
  status: QuotaRequestStatus;
  createdAt: string;
  decidedAt?: string | null;
  rejectionReason?: string | null;
  escalatedForOverdue: boolean;
}

export interface PendingQuotaRequestDto extends QuotaRequestDto {
  requesterDepartmentId?: string | null;
  requesterDepartmentName?: string | null;
  sourceRemainingBytes: number | null;
  viewerOwnsSource: boolean;
  viewerHasPendingRequest: boolean;
}

export interface QuotaHistoryDto {
  id: string;
  accountId: string;
  accountEmail: string;
  accountName: string;
  quotaRequestId?: string | null;
  eventType: QuotaHistoryEventType;
  oldQuotaBytes: number;
  newQuotaBytes: number;
  deltaBytes: number;
  note?: string | null;
  occurredAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface QuotaFeatureMetricsDto {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  partiallyApprovedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  averageDecisionTimeHours: number;
  failedFolderProvisioningCount: number;
}

export interface CreateQuotaRequestPayload {
  requestedAdditionalBytes: number;
  isTemporary: boolean;
  expiresAt?: string | null;
  reason: string;
}

export interface GetQuotaHistoryFilter {
  accountId?: string;
  quotaRequestId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface DecideQuotaRequestPayload {
  approvedAdditionalBytes: number;
  storageProviderId?: string;
}
