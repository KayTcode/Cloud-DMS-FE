import React, { useState } from 'react';
import {
  StorageOverviewView,
  StaffManagementView,
  RequestApprovalsView,
} from './views';
import {
  AddMemberModal,
  AdjustDepartmentModal,
  EditQuotaModal,
  RequestDetailsModal,
} from './components';
import {
  initialDepartment,
  initialMembers,
  initialRequests,
  initialAlerts,
  storageGrowthData,
} from './data/mockData';
import { DepartmentMember, QuotaRequest, DepartmentInfo, DepartmentNavTab } from './types';
import {
  Database,
  Users,
  CheckCircle2,
  Settings,
} from 'lucide-react';

export const DepartmentAdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DepartmentNavTab>('storage');
  const [department, setDepartment] = useState<DepartmentInfo>(initialDepartment);
  const [members, setMembers] = useState<DepartmentMember[]>(initialMembers);
  const [requests, setRequests] = useState<QuotaRequest[]>(initialRequests);
  const [alerts] = useState(initialAlerts);
  const [growthData] = useState(storageGrowthData);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedMemberForQuota, setSelectedMemberForQuota] = useState<DepartmentMember | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAdjustDeptOpen, setIsAdjustDeptOpen] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<QuotaRequest | null>(null);

  // Toast / Status notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;

  // Handlers
  const handleSaveMemberQuota = (memberId: string, newQuotaGB: number) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const percent = (m.usedSpaceGB / newQuotaGB) * 100;
          return {
            ...m,
            allocatedQuotaGB: newQuotaGB,
            status: percent >= 90 ? 'warning' : 'active',
          };
        }
        return m;
      })
    );
    const updatedMember = members.find((m) => m.id === memberId);
    showNotification(
      'success',
      `Đã cập nhật hạn mức cho ${updatedMember?.name || 'thành viên'} lên ${newQuotaGB} GB.`
    );
  };

  const handleAddMember = (
    newMemberData: Omit<DepartmentMember, 'id' | 'lastActive' | 'status' | 'fileCount' | 'usedSpaceGB'>
  ) => {
    const newMember: DepartmentMember = {
      ...newMemberData,
      id: `mem-${Date.now()}`,
      usedSpaceGB: 0,
      fileCount: 0,
      lastActive: 'Vừa tạo tài khoản',
      status: 'active',
    };
    setMembers((prev) => [newMember, ...prev]);
    showNotification(
      'success',
      `Đã thêm nhân viên ${newMember.name} vào phòng ban với hạn mức ${newMember.allocatedQuotaGB} GB.`
    );
  };

  const handleToggleMemberStatus = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const nextStatus = m.status === 'paused' ? 'active' : 'paused';
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
    const member = members.find((m) => m.id === memberId);
    showNotification(
      'info',
      `Đã chuyển trạng thái của ${member?.name} sang ${
        member?.status === 'paused' ? 'Đang hoạt động' : 'Tạm dừng đồng bộ'
      }.`
    );
  };

  const handleApproveRequest = (requestId: string, note?: string) => {
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return;

    if (targetReq.requestType === 'quota_increase' && targetReq.requestedQuotaGB) {
      handleSaveMemberQuota(targetReq.memberId, targetReq.requestedQuotaGB);
    }

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'approved',
            adminNote: note || 'Đã được phê duyệt bởi Department Admin.',
          };
        }
        return r;
      })
    );
    showNotification('success', `Đã phê duyệt yêu cầu #${requestId} của ${targetReq.memberName}`);
  };

  const handleRejectRequest = (requestId: string, reason?: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'rejected',
            adminNote: reason || 'Từ chối bởi Department Admin.',
          };
        }
        return r;
      })
    );
    showNotification('info', `Đã từ chối yêu cầu #${requestId}`);
  };

  const handleRequestMoreTenantQuota = (additionalGB: number, reason: string) => {
    setDepartment((prev) => ({
      ...prev,
      totalAllocatedGB: prev.totalAllocatedGB + additionalGB,
    }));
    showNotification(
      'success',
      `Đã gửi đề xuất xin cấp thêm +${additionalGB} GB tới Quản trị viên Tenant. Lý do: "${reason}"`
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast alert notice */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in zoom-in-95 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Department Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-2 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Tổng quan dung lượng</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Quản lý nhân viên ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Phê duyệt yêu cầu</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span>Phòng: <strong className="text-slate-800">{department.name}</strong></span>
          <span>·</span>
          <span>Tenant: <strong className="text-slate-800">{department.tenantName}</strong></span>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="tab-content-area">
        {activeTab === 'storage' && (
          <StorageOverviewView
            department={department}
            members={members}
            alerts={alerts}
            growthData={growthData}
            onOpenAdjustModal={() => setIsAdjustDeptOpen(true)}
            onEditMemberQuota={(m) => setSelectedMemberForQuota(m)}
            searchFilter={searchQuery}
          />
        )}

        {activeTab === 'staff' && (
          <StaffManagementView
            members={members}
            department={department}
            onEditQuota={(m) => setSelectedMemberForQuota(m)}
            onAddMember={() => setIsAddMemberOpen(true)}
            onToggleStatus={handleToggleMemberStatus}
            searchFilter={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {activeTab === 'requests' && (
          <RequestApprovalsView
            requests={requests}
            department={department}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onViewDetails={(req) => setSelectedRequestForDetails(req)}
            searchFilter={searchQuery}
          />
        )}
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        department={department}
        onAdd={handleAddMember}
      />

      <AdjustDepartmentModal
        isOpen={isAdjustDeptOpen}
        onClose={() => setIsAdjustDeptOpen(false)}
        department={department}
        onRequestMoreQuota={handleRequestMoreTenantQuota}
        onUpdateCeiling={() => showNotification('success', 'Đã lưu cấu hình ngưỡng cảnh báo.')}
      />

      <EditQuotaModal
        isOpen={!!selectedMemberForQuota}
        member={selectedMemberForQuota}
        department={department}
        onClose={() => setSelectedMemberForQuota(null)}
        onSave={handleSaveMemberQuota}
      />

      <RequestDetailsModal
        isOpen={!!selectedRequestForDetails}
        request={selectedRequestForDetails}
        department={department}
        onClose={() => setSelectedRequestForDetails(null)}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
      />
    </div>
  );
};
