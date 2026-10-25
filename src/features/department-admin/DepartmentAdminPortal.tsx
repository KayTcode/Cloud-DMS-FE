import React, { useState, useEffect } from 'react';
import {
  DepartmentHubView,
  DepartmentFilesView,
  DepartmentLogsView,
  StaffManagementView,
  SetupDepartmentView,
  DepartmentStorageReportView,
  DepartmentQuotaView,
} from './views';
import {
  AddMemberModal,
  EditQuotaModal,
} from './components';
import {
  DepartmentMember,
  DepartmentInfo,
  DepartmentNavTab,
  CreateEmployeePayload,
} from './types';
import { DepartmentProvider, useDepartment } from './context/DepartmentContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantContext } from '@/context/TenantContext';
import { bytesToGB, gbToBytes } from './utils/quotaUtils';

const DepartmentAdminPortalContent: React.FC = () => {
  const { user } = useAuth();
  const { activeNav, setActiveNav } = useTenantContext();
  const {
    hasDepartment,
    summary,
    employees,
    isLoading,
    refreshData,
    allocateQuota,
    createEmployee,
  } = useDepartment();

  const [activeTab, setActiveTab] = useState<DepartmentNavTab>('hub');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedMemberForQuota, setSelectedMemberForQuota] = useState<DepartmentMember | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Toast / Status notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Sync activeNav from Sidebar with activeTab
  useEffect(() => {
    if (activeNav === 'hub') {
      setActiveTab('hub');
    } else if (activeNav === 'dashboard') {
      setActiveTab('files');
    } else if (activeNav === 'trash') {
      setActiveTab('trash');
    } else if (activeNav === 'tenants') {
      setActiveTab('staff');
    } else if (activeNav === 'audit-logs') {
      setActiveTab('logs');
    } else if (activeNav === 'storage-providers') {
      setActiveTab('quota');
    }
  }, [activeNav]);

  const handleNavigateTab = (tab: DepartmentNavTab) => {
    setActiveTab(tab);
    if (tab === 'hub') {
      setActiveNav('hub');
    } else if (tab === 'files') {
      setActiveNav('dashboard');
    } else if (tab === 'trash') {
      setActiveNav('trash');
    } else if (tab === 'staff') {
      setActiveNav('tenants');
    } else if (tab === 'logs') {
      setActiveNav('audit-logs');
    } else if (tab === 'quota') {
      setActiveNav('storage-providers');
    }
  };

  // If department not yet set up -> render Self-Setup View
  if (!hasDepartment) {
    return <SetupDepartmentView />;
  }

  // Map summary to DepartmentInfo
  const departmentInfo: DepartmentInfo = {
    id: user?.departmentId || summary?.departmentId || '',
    name: summary?.departmentName || 'Phòng ban',
    tenantName: 'Tổ chức Doanh nghiệp',
    adminName: user?.fullName || 'Trưởng phòng',
    adminRole: 'Department Admin',
    adminEmail: user?.email || '',
    totalAllocatedGB: bytesToGB(summary?.departmentQuotaBytes),
    tenantPoolLimitGB: bytesToGB(summary?.departmentQuotaBytes),
    usedSpaceGB: bytesToGB(summary?.departmentUsedBytes),
    filesStorageGB: bytesToGB(summary?.departmentUsedBytes),
    backupsStorageGB: 0,
    otherStorageGB: 0,
    growthDeltaSinceAprGB: 0,
  };

  // Map summary.users + employees to DepartmentMember list
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

  const members: DepartmentMember[] = (summary?.users || []).map((u, idx) => {
    const words = (u.fullName || u.email).trim().split(' ');
    const initials =
      words.length > 1
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : (u.fullName || 'NV').slice(0, 2).toUpperCase();

    const matchingEmp = employees.find((e) => e.id === u.userId || e.email.toLowerCase() === u.email.toLowerCase());
    const role = matchingEmp?.roles?.[0] || 'Employee';

    return {
      id: u.userId,
      name: u.fullName || u.email,
      email: u.email,
      role: role === 'DepartmentAdmin' ? 'Trưởng phòng' : 'Nhân viên',
      subTeam: summary?.departmentName || 'Phòng ban',
      allocatedQuotaGB: bytesToGB(u.quotaBytes),
      usedSpaceGB: bytesToGB(u.usedBytes),
      fileCount: u.fileCount || (u as any).FileCount || 0,

      lastActive: matchingEmp?.isActive ? 'Đang hoạt động' : 'Chờ kích hoạt',
      status: u.usagePercentage >= 90 ? 'warning' : 'active',
      avatarInitials: initials,
      avatarColor: colors[idx % colors.length],
    };
  });

  // Handlers
  const handleSaveMemberQuota = async (memberId: string, newQuotaGB: number) => {
    try {
      await allocateQuota(memberId, gbToBytes(newQuotaGB));
      const targetMember = members.find((m) => m.id === memberId);
      showNotification(
        'success',
        `Đã cập nhật hạn mức cho ${targetMember?.name || 'thành viên'} lên ${newQuotaGB} GB.`
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Không thể cập nhật hạn mức. Vui lòng kiểm tra lại.';
      showNotification('error', msg);
      throw err;
    }
  };

  const handleAddMember = async (payload: CreateEmployeePayload) => {
    try {
      await createEmployee(payload);
      showNotification(
        'success',
        `Đã tạo tài khoản và gửi email mời kích hoạt (48 giờ) tới ${payload.email}.`
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Không thể thêm nhân viên. Vui lòng kiểm tra lại.';
      showNotification('error', msg);
      throw err;
    }
  };

  const availableDeptGB = bytesToGB(summary?.unallocatedDepartmentQuotaBytes);

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

      {/* Main Content Router */}
      <div className="tab-content-area">
        {/* 1. MÀN HÌNH KHỞI TẠO: TRUNG TÂM ĐIỀU KHIỂN VỚI CÁC NÚT ĐỂ NGƯỜI DÙNG TỰ CHỌN */}
        {activeTab === 'hub' && (
          <DepartmentHubView
            department={departmentInfo}
            membersCount={members.length}
            availableQuotaGB={availableDeptGB}
            onNavigateTab={handleNavigateTab}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            onRefreshData={refreshData}
            isLoading={isLoading}
          />
        )}

        {/* 2. CHỨC NĂNG 1: QUẢN LÝ TÀI LIỆU & TẢI TỆP LÊN & THÙNG RÁC PHÒNG BAN */}
        {(activeTab === 'files' || activeTab === 'trash') && (
          <DepartmentFilesView
            department={departmentInfo}
            availableQuotaGB={availableDeptGB}
            initialTab={activeTab === 'trash' ? 'trash' : 'files'}
            onBackToHub={() => handleNavigateTab('hub')}
            onQuotaUpdated={refreshData}
            onAddToast={showNotification}
            onTabChange={(tab) => {
              if (tab === 'trash') setActiveNav('trash');
              else setActiveNav('dashboard');
            }}
            onNavigateToReport={() => handleNavigateTab('report')}
          />
        )}

        {/* 3. CHỨC NĂNG 2: QUẢN LÝ NHÂN SỰ PHÒNG BAN */}
        {activeTab === 'staff' && (
          <StaffManagementView
            members={members}
            department={departmentInfo}
            onEditQuota={(m) => setSelectedMemberForQuota(m)}
            onAddMember={() => setIsAddMemberOpen(true)}
            onToggleStatus={() => {}}
            searchFilter={searchQuery}
            onSearchChange={setSearchQuery}
            onBackToHub={() => handleNavigateTab('hub')}
          />
        )}

        {/* 4. CHỨC NĂNG 3: NHẬT KÝ HOẠT ĐỘNG NHÂN VIÊN */}
        {activeTab === 'logs' && (
          <DepartmentLogsView
            department={departmentInfo}
            members={members}
            onBackToHub={() => handleNavigateTab('hub')}
          />
        )}

        {/* 5. CHỨC NĂNG 4: BÁO CÁO & KIỂM TOÁN TỆP TIN NHÂN VIÊN */}
        {activeTab === 'report' && (
          <DepartmentStorageReportView
            department={departmentInfo}
            members={members}
            onBackToHub={() => handleNavigateTab('hub')}
            onAddToast={showNotification}
          />
        )}

        {/* 6. CHỨC NĂNG 5: YÊU CẦU & PHÊ DUYỆT HẠN MỨC QUOTA */}
        {activeTab === 'quota' && (
          <DepartmentQuotaView
            department={departmentInfo}
            availableQuotaGB={availableDeptGB}
            onBackToHub={() => handleNavigateTab('hub')}
            onQuotaUpdated={refreshData}
            onShowToast={showNotification}
          />
        )}
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        departmentName={departmentInfo.name}
        availableQuotaGB={availableDeptGB}
        onAdd={handleAddMember}
      />

      <EditQuotaModal
        isOpen={!!selectedMemberForQuota}
        member={selectedMemberForQuota}
        departmentName={departmentInfo.name}
        deptAvailableGB={availableDeptGB}
        onClose={() => setSelectedMemberForQuota(null)}
        onSave={handleSaveMemberQuota}
      />
    </div>
  );
};

export const DepartmentAdminPortal: React.FC = () => {
  return (
    <DepartmentProvider>
      <DepartmentAdminPortalContent />
    </DepartmentProvider>
  );
};

export default DepartmentAdminPortal;
