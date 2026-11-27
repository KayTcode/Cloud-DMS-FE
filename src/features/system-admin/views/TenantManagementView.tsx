import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search,
  ShieldAlert, 
  Building2, 
  Clock, 
  MailCheck, 
  UserX, 
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { AdminUserDto, SystemTenant } from '../types';
import { quotaApi } from '@/features/quota';
import {
  resendVacantTenantAdminInvitationApi,
  cancelVacantTenantAdminInvitationApi
} from '../api/systemAdminCommands';
import { getSystemTenantsApi } from '../api/systemAdminQueries';
import { OffboardTenantAdminModal } from '../components/OffboardTenantAdminModal';
import { useToast } from '@/hooks/useToast';
import {
  PendingInvitationsTable,
  resendToastMessage,
  cancelToastMessage,
  invitationsApi,
  type PendingInvitationDto,
} from '@/features/invitations';

interface TenantManagementViewProps {
  tenants?: SystemTenant[];
  users?: AdminUserDto[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
  onPageChange: (page: number) => void;
  onOpenCreateModal: () => void;
  onSelectTenant?: (tenant: SystemTenant) => void;
  onSelectUser?: (user: AdminUserDto) => void;
  onOpenEditModal?: (user: AdminUserDto) => void;
  onToggleStatus?: (userId: string, currentStatus: boolean) => void;
  onDeleteUser?: (userId: string, userEmail: string) => void;
  onOpenAllocateQuotaModal?: (user: AdminUserDto) => void;
  onRefreshUsers?: () => void;
  onRefreshTenants?: () => void;
}

export const TenantManagementView: React.FC<TenantManagementViewProps> = ({
  tenants,
  users = [],
  totalCount,
  currentPage,
  totalPages,
  searchQuery,
  onSearchChange,
  onPageChange,
  onOpenCreateModal,
  onSelectTenant,
  onSelectUser,
  onOpenEditModal,
  onToggleStatus,
  onDeleteUser,
  onOpenAllocateQuotaModal,
  onRefreshUsers,
  onRefreshTenants,
}) => {
  const { toast } = useToast();
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'All' | 'Interim' | 'Pending' | 'Active' | 'Suspended'>('All');
  const [offboardTargetTenant, setOffboardTargetTenant] = useState<SystemTenant | null>(null);
  const [resendingTenantId, setResendingTenantId] = useState<string | null>(null);
  const [cancellingTenantId, setCancellingTenantId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [invitationsReloadToken, setInvitationsReloadToken] = useState(0);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitationDto[]>([]);

  // Tập hợp danh sách email và userId đang có lời mời chờ kích hoạt
  const pendingEmailsSet = useMemo(() => {
    const set = new Set<string>();
    pendingInvitations.forEach((inv) => {
      if (inv.email) set.add(inv.email.trim().toLowerCase());
    });
    return set;
  }, [pendingInvitations]);

  const pendingUserIdsSet = useMemo(() => {
    const set = new Set<string>();
    pendingInvitations.forEach((inv) => {
      if (inv.userId) set.add(inv.userId);
    });
    return set;
  }, [pendingInvitations]);

  const pendingInvitationMap = useMemo(() => {
    const map = new Map<string, PendingInvitationDto>();
    pendingInvitations.forEach((inv) => {
      if (inv.email) map.set(inv.email.trim().toLowerCase(), inv);
      if (inv.userId) map.set(inv.userId, inv);
    });
    return map;
  }, [pendingInvitations]);

  // Kiểm tra một row có đang ở trạng thái chờ kích hoạt lời mời hay không
  const checkIsPending = (item: any) => {
    if (item.isInterimManaged) return false;
    const emailKey = item.email ? item.email.trim().toLowerCase() : '';
    const idKey = item.id || '';
    const isPendingByInvite = (emailKey && pendingEmailsSet.has(emailKey)) || (idKey && pendingUserIdsSet.has(idKey));
    const isLegacyPendingAdmin = !item.isActive && Array.isArray(item.roles) && item.roles.includes('TenantAdmin') && !!item.tenantId;
    return Boolean(isPendingByInvite || isLegacyPendingAdmin);
  };

  // Fallback tự fetch danh sách tenants nếu component cha chưa kịp truyền
  const [localTenants, setLocalTenants] = useState<SystemTenant[]>(tenants || []);

  useEffect(() => {
    if (tenants && tenants.length > 0) {
      setLocalTenants(tenants);
    } else {
      getSystemTenantsApi()
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setLocalTenants(res);
          }
        })
        .catch(() => {});
    }
  }, [tenants]);

  const effectiveTenants = (tenants && tenants.length > 0) ? tenants : localTenants;
  const effectiveSearch = searchQuery || localSearch;

  const handleOpenOffboard = (item: any) => {
    const rawT = item.rawTenant || effectiveTenants.find((t) => t.id === item.tenantId || t.id === item.id);
    if (rawT) {
      setOffboardTargetTenant(rawT);
    } else {
      setOffboardTargetTenant({
        id: item.tenantId || item.id,
        name: item.tenantName || item.fullName,
        plan: 'Enterprise',
        usersAssigned: 1,
        storageUsed: '0 B',
        storageAllocated: '0 B',
        storageDisplay: '0 B / 0 B',
        createdDate: item.createdAt,
        status: item.isActive ? 'Active' : 'Suspended',
        adminEmail: item.email,
        adminFullName: item.fullName,
        adminPhoneNumber: item.phoneNumber,
        isInterimManaged: item.isInterimManaged,
      });
    }
  };

  const handleResendAdminInvitation = async (tenantId?: string, email?: string, userId?: string) => {
    const actionKey = tenantId || userId || email || '';
    try {
      setResendingTenantId(actionKey);
      let targetEmail = email;
      if (tenantId) {
        try {
          const res = await resendVacantTenantAdminInvitationApi(tenantId);
          if (res?.targetUserEmail) targetEmail = res.targetUserEmail;
        } catch (err: any) {
          if (userId) {
            await invitationsApi.resend(userId);
          } else {
            throw err;
          }
        }
      } else if (userId) {
        await invitationsApi.resend(userId);
      }

      setActionNotice({
        type: 'success',
        message: `Đã gửi lại thư mời Quản trị viên mới tới ${targetEmail || email || 'người dùng'}. Thời hạn kích hoạt được gia hạn 48 giờ!`,
      });
      setInvitationsReloadToken((t) => t + 1);
      if (onRefreshTenants) onRefreshTenants();
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || err?.response?.data?.error || err.message || 'Lỗi khi gửi lại thư mời.',
      });
    } finally {
      setResendingTenantId(null);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleCancelAdminInvitation = async (tenantId?: string, email?: string, userId?: string) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn hủy lời mời Quản trị viên cho tài khoản "${email}"?\n\n` +
      '• Nếu là tài khoản người ngoài được tạo mới do gửi nhầm, hệ thống sẽ XÓA HẲN tài khoản khỏi CSDL để giữ sạch hệ thống.\n' +
      '• Nếu là cựu nhân sự cũ, tài khoản vẫn được bảo toàn danh tính và chỉ gỡ liên kết khỏi Doanh nghiệp.'
    );
    if (!confirmed) return;

    const actionKey = tenantId || userId || email || '';
    try {
      setCancellingTenantId(actionKey);
      let smartClean = false;
      if (tenantId) {
        try {
          const res = await cancelVacantTenantAdminInvitationApi(tenantId);
          smartClean = Boolean(res?.smartCleanupApplied);
        } catch (err: any) {
          if (userId) {
            const res = await invitationsApi.cancel(userId);
            smartClean = res?.cleanupAction === 'HARD_DELETED';
          } else {
            throw err;
          }
        }
      } else if (userId) {
        const res = await invitationsApi.cancel(userId);
        smartClean = res?.cleanupAction === 'HARD_DELETED';
      }

      setActionNotice({
        type: 'success',
        message: `Đã hủy lời mời thành công cho ${email}. ${smartClean ? '(Đã xóa tài khoản khỏi CSDL)' : ''}`,
      });
      setInvitationsReloadToken((t) => t + 1);
      if (onRefreshTenants) onRefreshTenants();
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || err?.response?.data?.error || err.message || 'Lỗi khi hủy lời mời.',
      });
    } finally {
      setCancellingTenantId(null);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Nguồn dữ liệu bảng: Lấy trực tiếp từ Tenants (chuẩn Single Source of Truth)
  const allRows = useMemo(() => {
    if (effectiveTenants && effectiveTenants.length > 0) {
      return effectiveTenants.map((t) => {
        const hasPending = !!t.hasPendingInvitation;
        const depCount = t.departmentsCount || 0;
        return {
          id: t.id,
          tenantId: t.id,
          tenantName: t.name,
          tenantCode: t.tenantCode,
          fullName: t.isInterimManaged
            ? 'Khuyết Quản trị viên'
            : (t.adminFullName || 'Chưa thiết lập Quản trị viên'),
          email: t.isInterimManaged
            ? 'System Admin tạm quyền'
            : (t.adminEmail || 'Chưa có email'),
          phoneNumber: t.adminPhoneNumber || t.phoneNumber || '',
          departmentName: depCount > 0 ? `${depCount} phòng ban` : undefined,
          roles: t.isInterimManaged ? ['Tiếp quản lâm thời'] : ['TenantAdmin'],
          createdAt: t.createdDate || 'Mới tạo',
          isActive: t.status === 'Active',
          isInterimManaged: !!t.isInterimManaged,
          vacantAdminUserId: t.vacantAdminUserId,
          departmentsCount: depCount,
          hasPendingInvitation: hasPending,
          rawTenant: t,
        };
      });
    }

    // Fallback cho unit tests cũ truyền users prop (loại bỏ hoàn toàn 'Toàn cơ quan')
    return users.map((u) => {
      const depName = (u.departmentName && u.departmentName !== 'Toàn cơ quan') ? u.departmentName : undefined;
      return {
        id: u.id,
        tenantId: u.tenantId || u.id,
        tenantName: u.tenantName || u.fullName,
        tenantCode: u.tenantCode,
        fullName: u.fullName,
        email: u.email,
        phoneNumber: u.phoneNumber || '',
        departmentName: depName,
        roles: u.roles,
        createdAt: u.createdAt,
        isActive: u.isActive,
        isInterimManaged: false,
        departmentsCount: depName ? 1 : 0,
        hasPendingInvitation: false,
        rawUser: u,
      };
    });
  }, [effectiveTenants, users]);

  // Đếm số lượng tiếp quản lâm thời để hiện badge trên tab
  const interimCount = useMemo(() => {
    return allRows.filter((r) => r.isInterimManaged).length;
  }, [allRows]);

  // Đếm số lượng tài khoản/tổ chức đang chờ kích hoạt lời mời
  const pendingCount = useMemo(() => {
    return allRows.filter((r) => checkIsPending(r)).length;
  }, [allRows, pendingEmailsSet, pendingUserIdsSet]);

  // Lọc theo từ khóa tìm kiếm và trạng thái
  const combinedRows = useMemo(() => {
    return allRows.filter((item) => {
      const matchesSearch =
        !effectiveSearch ||
        item.fullName?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        item.email?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        item.tenantName?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        item.tenantCode?.toLowerCase().includes(effectiveSearch.toLowerCase());

      const isPending = checkIsPending(item);

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Interim' && item.isInterimManaged) ||
        (statusFilter === 'Pending' && isPending) ||
        (statusFilter === 'Active' && item.isActive && !item.isInterimManaged && !isPending) ||
        (statusFilter === 'Suspended' && !item.isActive && !isPending);

      return matchesSearch && matchesStatus;
    });
  }, [allRows, effectiveSearch, statusFilter, pendingEmailsSet, pendingUserIdsSet]);

  // Handler mở chi tiết khi click vào một Doanh nghiệp
  const handleSelectRow = (item: any) => {
    if (item.rawTenant && onSelectTenant) {
      onSelectTenant(item.rawTenant);
    } else if (item.tenantId && onSelectTenant) {
      const found = effectiveTenants.find((t) => t.id === item.tenantId);
      if (found) {
        onSelectTenant(found);
        return;
      }
      if (onSelectUser) {
        onSelectUser(item.rawUser || (item as any));
      }
    } else if (onSelectUser) {
      onSelectUser(item.rawUser || (item as any));
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. TOP HEADER (GOOGLE DRIVE STYLE) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Quản lý Tổ chức & Quản trị viên
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách doanh nghiệp, tài khoản quản trị viên tổ chức và quyền hạn truy cập
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefreshUsers && (
            <button
              onClick={() => {
                onRefreshUsers();
                getSystemTenantsApi()
                  .then((res: any) => {
                    const list = Array.isArray(res) ? res : res?.items;
                    if (list) setLocalTenants(list);
                  })
                  .catch(() => {});
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full shadow-2xs transition-colors cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          )}

          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-full shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo Tổ chức mới</span>
          </button>
        </div>
      </div>

      {/* 2. ACTION NOTIFICATION BANNER */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-2xs ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. TOOLBAR: GOOGLE DRIVE SEARCH BAR & FILTER CHIPS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
        {/* Search Input dạng viên thuốc lớn */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={effectiveSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            placeholder="Tìm theo tên tổ chức, quản trị viên, email..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Filter Chips dạng viên thuốc chuẩn Material 3 */}
        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">Trạng thái:</span>
          {(['All', 'Interim', 'Active', 'Suspended'] as const).map((status) => {
            const labels = {
              All: 'Tất cả',
              Interim: `Tiếp quản lâm thời${interimCount > 0 ? ` (${interimCount})` : ''}`,
              Active: 'Đang hoạt động',
              Suspended: 'Tạm ngưng',
            };
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  onPageChange(1);
                }}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
                  isActive
                    ? status === 'Interim'
                      ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
                      : 'bg-blue-600 text-white border-blue-600 font-semibold'
                    : status === 'Interim' && interimCount > 0
                      ? 'bg-purple-50 text-purple-700 border-purple-200/90 hover:bg-purple-100/70 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {status === 'Interim' && (
                  <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                )}
                <span>{labels[status]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN DATA TABLE (CLEAN SURFACE STYLE) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 bg-slate-50/50">
                <th className="py-3 px-3 text-center w-12 font-semibold">STT</th>
                <th className="py-3 px-4 font-semibold">Tổ chức & Quản trị viên</th>
                <th className="py-3 px-4 font-semibold">Email & Điện thoại</th>
                <th className="py-3 px-4 font-semibold">Phòng ban</th>
                <th className="py-3 px-4 font-semibold">Vai trò</th>
                <th className="py-3 px-4 font-semibold">Ngày tạo</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {combinedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-600">Không tìm thấy tổ chức nào</p>
                    <p className="text-xs mt-1 text-slate-400">Hãy thử đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc trạng thái.</p>
                  </td>
                </tr>
              ) : (
                combinedRows.map((item, index) => {
                  const isInterim = item.isInterimManaged;
                  const isPendingTenantAdmin = checkIsPending(item);
                  const matchedInvite = (item.email ? pendingInvitationMap.get(item.email.trim().toLowerCase()) : null) ||
                                        (item.id ? pendingInvitationMap.get(item.id) : null);
                  const effectiveUserId = matchedInvite?.userId || item.id;
                  const actionKey = item.tenantId || effectiveUserId || item.email || '';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors group ${
                        isInterim
                          ? 'bg-purple-50/25 hover:bg-purple-50/50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3.5 px-3 text-center font-mono text-slate-400 text-xs">
                        {(currentPage - 1) * 10 + index + 1}
                      </td>

                      {/* Tổ chức & Quản trị viên */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isInterim
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-600'
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleSelectRow(item)}
                              className={`font-bold transition-colors text-left cursor-pointer inline-flex items-center gap-1.5 ${
                                isInterim
                                  ? 'text-purple-950 hover:text-purple-700'
                                  : 'text-slate-900 hover:text-blue-600'
                              }`}
                              title="Bấm để xem chi tiết doanh nghiệp"
                            >
                              <span>{item.tenantName}</span>
                              {isInterim && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                  Tiếp quản
                                </span>
                              )}
                            </button>
                            <div className="text-[11px] text-slate-500 font-normal flex items-center gap-1.5">
                              {isInterim ? (
                                <span className="text-purple-800 font-medium">Khuyết Quản trị viên</span>
                              ) : (
                                <span>Admin: {item.fullName}</span>
                              )}
                              {item.tenantCode && (
                                <span className="text-[10px] font-mono text-slate-400">({item.tenantCode})</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Số điện thoại */}
                      <td className="py-3.5 px-4">
                        {isInterim ? (
                          <div>
                            <div className="text-purple-900 font-semibold flex items-center gap-1 text-xs">
                              <AlertCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>System Admin tạm quyền</span>
                            </div>
                            <div className="text-[11px] text-slate-400 italic">Chưa bàn giao Quản trị viên mới</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-slate-800 font-medium">{item.email}</div>
                            <div className="text-[11px] text-slate-400">{item.phoneNumber || 'Chưa cập nhật SĐT'}</div>
                          </div>
                        )}
                      </td>

                      {/* Phòng ban: Nếu chưa có phòng ban nào (departmentsCount = 0), hiện rõ ràng 'Chưa có phòng ban' */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.departmentsCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">
                              {item.departmentName || `${item.departmentsCount} phòng ban`}
                            </span>
                            {isInterim && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Khuyết Lead
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] inline-flex items-center gap-1">
                            Chưa có phòng ban
                          </span>
                        )}
                      </td>

                      {/* Vai trò */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {isInterim ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                              Tiếp quản lâm thời
                            </span>
                          ) : item.roles && item.roles.length > 0 ? (
                            item.roles.map((r: string) => (
                              <span
                                key={r}
                                className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold"
                              >
                                {r}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">Người dùng</span>
                          )}
                        </div>
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3.5 px-4 text-slate-500 font-normal">
                        {item.createdAt}
                      </td>

                      {/* Trạng thái: Tiếp quản lâm thời (Purple) vs Chờ kích hoạt (Amber) */}
                      <td className="py-3.5 px-4">
                        {isInterim ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/90 shadow-2xs"
                            title="Tổ chức đang khuyết Admin, System Admin trực tiếp tạm quyền điều hành"
                          >
                            <ShieldAlert className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>Tiếp quản lâm thời</span>
                          </span>
                        ) : isPendingTenantAdmin ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                            title="Đã gửi thư mời qua Gmail, chờ người dùng kích hoạt (48h)"
                          >
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Chờ kích hoạt</span>
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                            }`}
                          >
                            {item.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isInterim ? (
                            /* Thao tác cho Tenant Tiếp quản lâm thời: Quản lý phòng ban & Bổ nhiệm Lead */
                            <button
                              type="button"
                              onClick={() => handleSelectRow(item)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              title="Xem chi tiết doanh nghiệp để bổ nhiệm Trưởng phòng khuyết hoặc mời Admin mới"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Quản lý phòng ban</span>
                            </button>
                          ) : isPendingTenantAdmin ? (
                            <>
                              <button
                                onClick={() => handleResendAdminInvitation(item.tenantId, item.email, effectiveUserId)}
                                disabled={resendingTenantId === actionKey || cancellingTenantId === actionKey}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                                title="Gửi lại thư mời kích hoạt qua Email"
                              >
                                {resendingTenantId === actionKey ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                ) : (
                                  <MailCheck className="w-3.5 h-3.5 text-blue-600" />
                                )}
                                <span>Gửi lại</span>
                              </button>

                              <button
                                onClick={() => handleCancelAdminInvitation(item.tenantId, item.email, effectiveUserId)}
                                disabled={resendingTenantId === actionKey || cancellingTenantId === actionKey}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                                title="Hủy lời mời"
                              >
                                {cancellingTenantId === actionKey ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                ) : (
                                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>Hủy</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {/* Xem chi tiết & Quản lý Quota */}
                              <button
                                type="button"
                                onClick={() => handleSelectRow(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                title="Xem chi tiết doanh nghiệp & điều chỉnh Quota"
                              >
                                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Chi tiết & Quota</span>
                              </button>

                              {/* Miễn nhiệm / Chuyển giao Quản trị viên */}
                              <button
                                type="button"
                                onClick={() => handleOpenOffboard(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer shrink-0"
                                title="Miễn nhiệm / Chuyển giao Quản trị viên (Tiếp quản hoặc Mời Admin mới)"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PHÂN TRANG (GOOGLE DRIVE CLEAN FOOTER) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-t border-slate-200/80 text-xs text-slate-500 bg-white">
          <span>
            Tổng cộng: <strong className="text-slate-900">{combinedRows.length}</strong> tổ chức & tài khoản trên hệ thống
          </span>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Trang trước
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-7 h-7 rounded-full font-medium transition-colors cursor-pointer text-xs ${
                  currentPage === page
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>

      {/* Lời mời đang chờ */}
      <section className="mt-6 space-y-3" aria-labelledby="pending-invitations-heading">
        <h3 id="pending-invitations-heading" className="text-sm font-bold text-slate-900">
          Lời mời đang chờ
        </h3>
        <PendingInvitationsTable
          reloadToken={invitationsReloadToken}
          onItemsLoaded={setPendingInvitations}
          onResent={(r) => {
            toast.success(resendToastMessage(r));
            setInvitationsReloadToken((t) => t + 1);
            onRefreshUsers?.();
          }}
          onCancelled={(r) => {
            toast.success(cancelToastMessage(r));
            setInvitationsReloadToken((t) => t + 1);
            onRefreshUsers?.();
          }}
        />
      </section>

      {/* Modal Miễn nhiệm / Tiếp quản / Mời Admin mới */}
      <OffboardTenantAdminModal
        isOpen={!!offboardTargetTenant}
        onClose={() => setOffboardTargetTenant(null)}
        tenant={offboardTargetTenant}
        onSuccess={() => {
          setOffboardTargetTenant(null);
          if (onRefreshTenants) onRefreshTenants();
          if (onRefreshUsers) onRefreshUsers();
          toast.success('Đã chuyển giao quyền quản trị viên thành công!');
        }}
      />
    </div>
  );
};
