import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  HardDrive,
  Users,
  FolderLock,
  Clock,
  Download,
  Eye,
  Folder,
  FileText,
  ChevronRight,
  AlertTriangle,
  Loader2,
  UserPlus,
  Sliders,
  UserX,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DepartmentDetail } from '@/features/tenants/types';
import { DepartmentProvider, useDepartment } from '@/features/department-admin/context/DepartmentContext';
import { SharedStoreView } from '@/features/department-admin/views/SharedStoreView';
import { getHeldLeadDriveChildren } from '@/features/tenants/api/tenantQueries';
import { driveApi, formatBytes } from '@/features/user/api/driveApi';
import { PendingQuotaTable } from '@/features/quota';
import { AddMemberModal } from '@/features/department-admin/components/AddMemberModal';
import { EditQuotaModal } from '@/features/department-admin/components/EditQuotaModal';
import { OffboardEmployeeModal } from '@/features/department-admin/components/OffboardEmployeeModal';
import { CreateEmployeePayload } from '@/features/department-admin/types';

interface InterimManagementPanelProps {
  department: DepartmentDetail;
  onRefresh: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

type InterimTab = 'shared-store' | 'staff-quota' | 'held-files' | 'quota-requests';

interface HeldBreadcrumbItem {
  id: string;
  name: string;
}

interface HeldDriveItem {
  id: string;
  name: string;
  sizeBytes?: number;
  folderId?: string | null;
  createdAt?: string;
}

interface HeldFolderItem {
  id: string;
  name: string;
  parentFolderId?: string | null;
  isPendingHandover?: boolean;
}

// Inner component inside DepartmentProvider
const InterimPanelInner: React.FC<InterimManagementPanelProps> = ({
  department,
  onRefresh,
  onShowToast,
}) => {
  const { user } = useAuth();
  const {
    summary,
    employees,
    isLoading: isLoadingDept,
    refreshData: refreshDeptData,
    allocateQuota,
    createEmployee,
  } = useDepartment();

  const [activeTab, setActiveTab] = useState<InterimTab>('shared-store');
  const tenantId = user?.tenantId || '';

  // Held files state
  const [heldCurrentFolderId, setHeldCurrentFolderId] = useState<string | null>(null);
  const [heldFolders, setHeldFolders] = useState<HeldFolderItem[]>([]);
  const [heldFiles, setHeldFiles] = useState<HeldDriveItem[]>([]);
  const [heldBreadcrumb, setHeldBreadcrumb] = useState<HeldBreadcrumbItem[]>([]);
  const [isLoadingHeld, setIsLoadingHeld] = useState<boolean>(false);
  const [heldError, setHeldError] = useState<string | null>(null);

  // Modals for Staff & Quota
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMemberForQuota, setSelectedMemberForQuota] = useState<any | null>(null);
  const [selectedMemberForOffboard, setSelectedMemberForOffboard] = useState<any | null>(null);

  // Catch NotVacant errors and trigger onRefresh
  const handleApiError = useCallback(
    (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || '';
      if (typeof msg === 'string' && msg.includes('Phòng ban đang có Trưởng phòng')) {
        onShowToast?.('error', msg);
        onRefresh();
      } else {
        onShowToast?.('error', msg || 'Đã xảy ra lỗi.');
      }
    },
    [onRefresh, onShowToast]
  );

  // Fetch held files
  const fetchHeldLeadDrive = useCallback(
    async (folderId: string | null) => {
      if (!tenantId || !department.id) return;
      setIsLoadingHeld(true);
      setHeldError(null);
      try {
        const res = await getHeldLeadDriveChildren(tenantId, department.id, folderId || undefined);
        setHeldFolders(res?.childFolders || []);
        setHeldFiles(res?.files || []);
        setHeldBreadcrumb(res?.breadcrumb || []);
      } catch (err: any) {
        handleApiError(err);
        setHeldError('Không thể tải tệp tin của Trưởng phòng cũ.');
      } finally {
        setIsLoadingHeld(false);
      }
    },
    [tenantId, department.id, handleApiError]
  );

  useEffect(() => {
    if (activeTab === 'held-files' && department.hasHeldLeadFiles) {
      fetchHeldLeadDrive(heldCurrentFolderId);
    }
  }, [activeTab, heldCurrentFolderId, department.hasHeldLeadFiles, fetchHeldLeadDrive]);

  const handleDownloadHeldFile = async (file: HeldDriveItem) => {
    try {
      await driveApi.downloadFile(file.id, file.name);
      onShowToast?.('success', `Đang tải xuống tệp '${file.name}'...`);
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleSaveMemberQuota = async (userId: string, quotaBytes: number) => {
    try {
      await allocateQuota(userId, quotaBytes);
      onShowToast?.('success', 'Đã cập nhật hạn mức dung lượng nhân viên thành công.');
      setSelectedMemberForQuota(null);
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleAddMember = async (payload: CreateEmployeePayload) => {
    try {
      await createEmployee(payload);
      onShowToast?.('success', `Đã tạo nhân viên và gửi email kích hoạt tới ${payload.email}.`);
      setIsAddMemberOpen(false);
    } catch (err) {
      handleApiError(err);
    }
  };

  const availableDeptGB = summary
    ? Math.max(0, Math.round(((summary.unallocatedDepartmentQuotaBytes || 0) / (1024 ** 3)) * 100) / 100)
    : 0;

  return (
    <div className="mt-8 space-y-5">
      {/* Banner Đang tạm quản lý */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>Đang tạm quản lý</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200/80 text-amber-900 border border-amber-300">
                  Interim Manager
                </span>
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Phòng ban chưa có Trưởng phòng. Bạn đang tạm thời quản lý phòng này.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 border-b border-amber-200/70 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('shared-store')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'shared-store'
                ? 'bg-white text-blue-700 border-t-2 border-x border-t-blue-600 border-x-amber-200 shadow-2xs'
                : 'text-amber-900/80 hover:text-amber-950 hover:bg-amber-100/50'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Kho chung</span>
          </button>

          <button
            onClick={() => setActiveTab('staff-quota')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'staff-quota'
                ? 'bg-white text-blue-700 border-t-2 border-x border-t-blue-600 border-x-amber-200 shadow-2xs'
                : 'text-amber-900/80 hover:text-amber-950 hover:bg-amber-100/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Nhân viên & Quota</span>
          </button>

          {department.hasHeldLeadFiles && (
            <button
              onClick={() => setActiveTab('held-files')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'held-files'
                  ? 'bg-white text-blue-700 border-t-2 border-x border-t-blue-600 border-x-amber-200 shadow-2xs'
                  : 'text-amber-900/80 hover:text-amber-950 hover:bg-amber-100/50'
              }`}
            >
              <FolderLock className="w-3.5 h-3.5 text-amber-600" />
              <span>Tệp của Trưởng phòng cũ</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('quota-requests')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'quota-requests'
                ? 'bg-white text-blue-700 border-t-2 border-x border-t-blue-600 border-x-amber-200 shadow-2xs'
                : 'text-amber-900/80 hover:text-amber-950 hover:bg-amber-100/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Yêu cầu quota</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Kho chung */}
      {activeTab === 'shared-store' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <SharedStoreView />
        </div>
      )}

      {/* Tab 2: Nhân viên & Quota */}
      {activeTab === 'staff-quota' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Quản lý Nhân sự & Phân bổ Hạn mức</h4>
              <p className="text-xs text-slate-500">
                Tạm quyền quản lý danh sách nhân viên và cấp phát dung lượng Quota cho phòng ban khuyết.
              </p>
            </div>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm nhân viên mới</span>
            </button>
          </div>

          {isLoadingDept ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <span className="text-xs font-medium">Đang tải danh sách nhân sự...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Phòng chưa có nhân viên nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Nhân viên</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Dung lượng Quota</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{emp.fullName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{emp.email}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            emp.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {emp.isActive ? 'Đang hoạt động' : 'Chờ kích hoạt'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {emp.storageQuotaBytes ? formatBytes(emp.storageQuotaBytes) : '0 B'}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        <button
                          onClick={() =>
                            setSelectedMemberForQuota({
                              id: emp.id,
                              name: emp.fullName,
                              email: emp.email,
                              allocatedQuotaGB: Math.round(((emp.storageQuotaBytes || 0) / (1024 ** 3)) * 100) / 100,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                          title="Điều chỉnh Quota cá nhân"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Hạn mức</span>
                        </button>
                        <button
                          onClick={() =>
                            setSelectedMemberForOffboard({
                              id: emp.id,
                              name: emp.fullName,
                              email: emp.email,
                              allocatedQuotaGB: Math.round(((emp.storageQuotaBytes || 0) / (1024 ** 3)) * 100) / 100,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer transition-colors"
                          title="Vô hiệu hóa & Bàn giao tài sản số"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Nghỉ việc</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Tệp của Trưởng phòng cũ (Chỉ đọc) */}
      {activeTab === 'held-files' && department.hasHeldLeadFiles && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          {/* Banner chỉ đọc */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-blue-800 font-semibold">
            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Tệp của Trưởng phòng cũ chỉ được xem và tải.</span>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto pb-1">
            <button
              onClick={() => setHeldCurrentFolderId(null)}
              className={`hover:text-blue-600 font-medium cursor-pointer ${
                heldCurrentFolderId === null ? 'text-slate-900 font-bold' : ''
              }`}
            >
              Gốc Kho tạm giữ
            </button>
            {heldBreadcrumb.map((bc) => (
              <React.Fragment key={bc.id}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  onClick={() => setHeldCurrentFolderId(bc.id)}
                  className={`hover:text-blue-600 truncate cursor-pointer ${
                    heldCurrentFolderId === bc.id ? 'text-slate-900 font-bold' : ''
                  }`}
                >
                  {bc.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Held Items List */}
          {isLoadingHeld ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <span className="text-xs font-medium">Đang tải tệp tin Trưởng phòng cũ...</span>
            </div>
          ) : heldError ? (
            <div className="py-8 text-center text-xs text-rose-600 font-medium">{heldError}</div>
          ) : heldFolders.length === 0 && heldFiles.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Thư mục này hiện không có tệp tin hoặc thư mục nào.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
              {heldFolders.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setHeldCurrentFolderId(f.id)}
                  className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 truncate">{f.name}</span>
                    {f.isPendingHandover && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        Chờ bàn giao
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}

              {heldFiles.map((f) => (
                <div
                  key={f.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 truncate">{f.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {f.sizeBytes ? formatBytes(f.sizeBytes) : '0 B'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadHeldFile(f)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                    title="Tải tệp này"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Yêu cầu Quota */}
      {activeTab === 'quota-requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Danh sách yêu cầu phê duyệt Quota</h4>
            <p className="text-xs text-slate-500">
              Phê duyệt hoặc từ chối các yêu cầu tăng dung lượng của nhân viên trong phòng ban khuyết.
            </p>
          </div>
          <PendingQuotaTable
            onDecisionSuccess={() => {
              refreshDeptData();
              onRefresh();
            }}
          />
        </div>
      )}

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        departmentName={department.name}
        availableQuotaGB={availableDeptGB}
        onAdd={handleAddMember}
      />

      <EditQuotaModal
        isOpen={!!selectedMemberForQuota}
        member={selectedMemberForQuota}
        departmentName={department.name}
        deptAvailableGB={availableDeptGB}
        onClose={() => setSelectedMemberForQuota(null)}
        onSave={handleSaveMemberQuota}
      />

      <OffboardEmployeeModal
        isOpen={!!selectedMemberForOffboard}
        onClose={() => setSelectedMemberForOffboard(null)}
        employee={selectedMemberForOffboard as any}
        department={{ id: department.id, name: department.name } as any}
        departmentMembers={[]}
        custodianUserId=""
        onSuccess={() => {
          refreshDeptData();
          onRefresh();
        }}
      />
    </div>
  );
};

export const InterimManagementPanel: React.FC<InterimManagementPanelProps> = (props) => {
  return (
    <DepartmentProvider departmentIdOverride={props.department.id}>
      <InterimPanelInner {...props} />
    </DepartmentProvider>
  );
};

