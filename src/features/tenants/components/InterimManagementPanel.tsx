import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { DepartmentProvider, useDepartment } from '@/features/department-admin/context/DepartmentContext';
import { SharedStoreView } from '@/features/department-admin/views/SharedStoreView';
import { StaffManagementView } from '@/features/department-admin/views/StaffManagementView';
import { DepartmentQuotaView } from '@/features/department-admin/views/DepartmentQuotaView';
import { RequestApprovalsView } from '@/features/department-admin/views/RequestApprovalsView';
import { DriveView } from '@/features/user/views/DriveView';
import { getHeldLeadDriveChildren } from '@/features/tenants/api/tenantQueries';
import { DepartmentDetail } from '@/features/tenants/types/tenantUser.dto';
import { DepartmentInfo, DepartmentMember, QuotaRequest } from '@/features/department-admin/types';
import { DriveItem } from '@/features/user/types';
import { FolderDto, BreadcrumbItem } from '@/features/user/types/folder.types';
import { bytesToGB } from '@/features/department-admin/utils/quotaUtils';
import { useAuth } from '@/context/AuthContext';

interface InterimManagementPanelProps {
  tenantId: string;
  detail: DepartmentDetail;
  onRefresh: () => void;
}

type TabKey = 'shared-store' | 'staff' | 'held-files' | 'quota-requests';

function isVacancyError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { message?: string; status?: number; response?: { status?: number } };
  const status = e.status ?? e.response?.status;
  if (status === 409 || status === 403) return true;
  if (e.message && e.message.includes('NotVacant')) return true;
  return false;
}

// Inner component that sits inside DepartmentProvider and can use useDepartment
interface PanelContentProps {
  tenantId: string;
  detail: DepartmentDetail;
  onRefresh: () => void;
}

const PanelContent: React.FC<PanelContentProps> = ({ tenantId, detail, onRefresh }) => {
  const { user: authUser } = useAuth();
  const { summary, employees, refreshData } = useDepartment();

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'shared-store', label: 'Kho chung' },
    { key: 'staff', label: 'Nhân viên & Quota' },
    ...(detail.hasHeldLeadFiles ? [{ key: 'held-files' as TabKey, label: 'Tệp của Trưởng phòng cũ' }] : []),
    { key: 'quota-requests', label: 'Yêu cầu quota' },
  ];

  const [activeTab, setActiveTab] = useState<TabKey>('shared-store');
  const [staffSearch, setStaffSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Held-lead drive state
  const [heldFolderId, setHeldFolderId] = useState<string | null>(null);
  const [heldFolders, setHeldFolders] = useState<FolderDto[]>([]);
  const [heldBreadcrumb, setHeldBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [heldItems, setHeldItems] = useState<DriveItem[]>([]);
  const [heldLoading, setHeldLoading] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  const handleVacancyError = useCallback(
    (err: unknown) => {
      if (isVacancyError(err)) {
        showToast('Phòng ban không còn khuyết Trưởng phòng. Đang làm mới...');
        onRefresh();
      }
    },
    [onRefresh, showToast],
  );

  const fetchHeldFiles = useCallback(
    async (folderId: string | null) => {
      setHeldLoading(true);
      try {
        const res = await getHeldLeadDriveChildren(tenantId, detail.id, folderId ?? undefined);
        setHeldFolders(res.folders);
        setHeldBreadcrumb(res.breadcrumb);
        setHeldItems((res.files ?? []) as unknown as DriveItem[]);
      } catch (err) {
        handleVacancyError(err);
      } finally {
        setHeldLoading(false);
      }
    },
    [tenantId, detail.id, handleVacancyError],
  );

  useEffect(() => {
    if (activeTab === 'held-files' && detail.hasHeldLeadFiles) {
      fetchHeldFiles(heldFolderId);
    }
  }, [activeTab, heldFolderId, detail.hasHeldLeadFiles, fetchHeldFiles]);

  // Build DepartmentInfo from context summary
  const departmentInfo: DepartmentInfo = {
    id: detail.id,
    name: detail.name,
    tenantName: '',
    adminName: authUser?.fullName ?? '',
    adminRole: 'TenantAdmin',
    adminEmail: authUser?.email ?? '',
    totalAllocatedGB: bytesToGB(summary?.departmentQuotaBytes ?? 0),
    tenantPoolLimitGB: bytesToGB(summary?.departmentQuotaBytes ?? 0),
    usedSpaceGB: bytesToGB(summary?.departmentUsedBytes ?? 0),
    filesStorageGB: bytesToGB(summary?.departmentUsedBytes ?? 0),
    backupsStorageGB: 0,
    otherStorageGB: 0,
    growthDeltaSinceAprGB: 0,
  };

  const colors = [
    'bg-blue-600',
    'bg-indigo-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-purple-600',
    'bg-rose-600',
    'bg-teal-600',
    'bg-cyan-600',
  ];

  const members: DepartmentMember[] = (summary?.users ?? []).map((u, idx) => {
    const words = (u.fullName || u.email).trim().split(' ');
    const initials =
      words.length > 1
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : (u.fullName || 'NV').slice(0, 2).toUpperCase();
    const matchingEmp = employees.find(
      (e) => e.id === u.userId || e.email.toLowerCase() === u.email.toLowerCase(),
    );
    const role = matchingEmp?.roles?.[0] || 'Employee';
    return {
      id: u.userId,
      name: u.fullName || u.email,
      email: u.email,
      role: role === 'DepartmentAdmin' ? 'Trưởng phòng' : 'Nhân viên',
      subTeam: detail.name,
      allocatedQuotaGB: bytesToGB(u.quotaBytes),
      usedSpaceGB: bytesToGB(u.usedBytes),
      fileCount: u.fileCount || (u as unknown as Record<string, number>)['FileCount'] || 0,
      lastActive: matchingEmp?.isActive ? 'Đang hoạt động' : 'Chờ kích hoạt',
      status: u.usagePercentage >= 90 ? 'warning' : 'active',
      avatarInitials: initials,
      avatarColor: colors[idx % colors.length],
    };
  });

  const emptyRequests: QuotaRequest[] = [];

  // currentUser for DriveView
  const driveCurrentUser = {
    id: authUser?.id ?? '',
    fullName: authUser?.fullName ?? '',
    email: authUser?.email ?? '',
    jobTitle: 'Tenant Admin',
    department: detail.name,
    role: 'TenantAdmin' as const,
    phone: '',
    location: '',
    timezone: '',
    language: '',
    avatarUrl: '',
    storageQuotaGB: 0,
    storageUsedGB: 0,
    twoFactorEnabled: false,
    joinedDate: '',
    lastLogin: '',
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Toast */}
      {toastMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-amber-900">Đang tạm quản lý</h3>
        <p className="text-xs text-amber-700 mt-0.5">
          Phòng ban chưa có Trưởng phòng. Bạn đang tạm thời quản lý phòng này.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'shared-store' && <SharedStoreView />}

          {activeTab === 'staff' && (
            <div className="space-y-6">
              <StaffManagementView
                members={members}
                department={departmentInfo}
                onEditQuota={() => {}}
                onAddMember={() => {}}
                onToggleStatus={() => {}}
                searchFilter={staffSearch}
                onSearchChange={setStaffSearch}
                onBackToHub={() => {}}
              />
              <DepartmentQuotaView
                department={departmentInfo}
                availableQuotaGB={departmentInfo.totalAllocatedGB - departmentInfo.usedSpaceGB}
                onBackToHub={() => {}}
                onQuotaUpdated={refreshData}
                onShowToast={(type, msg) => {
                  if (type === 'error') showToast(msg);
                }}
              />
            </div>
          )}

          {activeTab === 'held-files' && detail.hasHeldLeadFiles && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Tệp của Trưởng phòng cũ chỉ được xem và tải.</span>
              </div>
              {heldLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Đang tải tệp...</span>
                </div>
              ) : (
                <DriveView
                  items={heldItems}
                  currentUser={driveCurrentUser}
                  currentFolderId={heldFolderId}
                  setCurrentFolderId={setHeldFolderId}
                  searchQuery=""
                  activeFilter="all"
                  setActiveFilter={() => {}}
                  onOpenNewFolderModal={() => {}}
                  onOpenFilePreview={() => {}}
                  onToggleStar={() => {}}
                  onDeleteFile={() => {}}
                  onShareItem={() => {}}
                  onDownloadItem={() => {}}
                  folders={heldFolders}
                  breadcrumb={heldBreadcrumb}
                  onNavigateFolder={(id) => setHeldFolderId(id)}
                  isReadOnly
                  driveKind="DepartmentShared"
                />
              )}
            </div>
          )}

          {activeTab === 'quota-requests' && (
            <RequestApprovalsView
              requests={emptyRequests}
              department={departmentInfo}
              onApprove={() => {}}
              onReject={() => {}}
              onViewDetails={() => {}}
              searchFilter=""
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const InterimManagementPanel: React.FC<InterimManagementPanelProps> = ({
  tenantId,
  detail,
  onRefresh,
}) => {
  if (!detail.isVacant) return null;

  return (
    <DepartmentProvider departmentIdOverride={detail.id}>
      <PanelContent tenantId={tenantId} detail={detail} onRefresh={onRefresh} />
    </DepartmentProvider>
  );
};
