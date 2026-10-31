export interface DepartmentMember {
  id: string;
  name: string;
  email: string;
  role: string;
  subTeam: string;
  allocatedQuotaGB: number;
  usedSpaceGB: number;
  fileCount: number;
  lastActive: string;
  status: 'active' | 'warning' | 'paused';
  avatarInitials: string;
  avatarColor: string;
}

export interface QuotaRequest {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberRole: string;
  requestType: 'quota_increase' | 'folder_access' | 'external_sharing' | 'archive_retrieval';
  currentQuotaGB?: number;
  requestedQuotaGB?: number;
  folderTarget?: string;
  reason: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  urgency: 'low' | 'medium' | 'high';
  adminNote?: string;
}

export interface StorageGrowthPoint {
  month: string;
  usedGB: number;
  allocatedGB: number;
}

export interface StorageAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  message: string;
  targetId?: string;
  timestamp: string;
}

export interface DepartmentInfo {
  id?: string;
  name: string;
  code?: string;
  tenantName: string;
  adminName: string;
  adminRole: string;
  adminEmail: string;
  totalAllocatedGB: number;
  tenantPoolLimitGB: number;
  usedSpaceGB: number;
  filesStorageGB: number;
  backupsStorageGB: number;
  otherStorageGB: number;
  growthDeltaSinceAprGB: number;
  retentionDays?: number;
}

export type DepartmentNavTab = 'hub' | 'files' | 'trash' | 'staff' | 'logs' | 'storage' | 'settings' | 'report' | 'quota' | 'shared-store';

export interface DepartmentActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  actorEmail?: string;
  action: 'upload' | 'download' | 'delete' | 'quota_change' | 'member_invited' | 'login' | 'system';
  details: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}
