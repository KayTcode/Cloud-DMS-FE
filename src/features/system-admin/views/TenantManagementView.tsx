import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search,
  Filter, 
  ChevronDown, 
  Check, 
  ShieldAlert, 
  Trash2,
  Building2, 
  Clock, 
  MailCheck, 
  UserX, 
  Loader2,
  FolderSync,
  RefreshCw,
  MoreVertical,
  UserCheck
} from 'lucide-react';
import { AdminUserDto } from '../types';
import { quotaApi } from '@/features/quota';
import {
  resendVacantTenantAdminInvitationApi,
  cancelVacantTenantAdminInvitationApi
} from '../api/systemAdminCommands';

interface TenantManagementViewProps {
  users: AdminUserDto[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  onSearchChange?: (q: string) => void;
  onPageChange: (page: number) => void;
  onOpenCreateModal: () => void;
  onSelectUser: (user: AdminUserDto) => void;
  onOpenEditModal: (user: AdminUserDto) => void;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onDeleteUser: (userId: string, userEmail: string) => void;
  onOpenAllocateQuotaModal?: (user: AdminUserDto) => void;
  onRefreshUsers?: () => void;
}

export const TenantManagementView: React.FC<TenantManagementViewProps> = ({
  users,
  totalCount,
  currentPage,
  totalPages,
  searchQuery,
  onSearchChange,
  onPageChange,
  onOpenCreateModal,
  onSelectUser,
  onOpenEditModal,
  onToggleStatus,
  onDeleteUser,
  onOpenAllocateQuotaModal,
  onRefreshUsers,
}) => {
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [retryingUserId, setRetryingUserId] = useState<string | null>(null);
  const [resendingTenantId, setResendingTenantId] = useState<string | null>(null);
  const [cancellingTenantId, setCancellingTenantId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  const effectiveSearch = searchQuery || localSearch;

  const handleRetryProvisioning = async (userId: string) => {
    try {
      setRetryingUserId(userId);
      await quotaApi.retryFolderProvisioning(userId);
      setActionNotice({ type: 'success', message: 'Đã gửi yêu cầu khởi tạo lại thư mục lưu trữ thành công!' });
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.detail || err?.response?.data?.message || 'Khởi tạo lại thư mục thất bại.',
      });
    } finally {
      setRetryingUserId(null);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleResendAdminInvitation = async (tenantId: string, email: string) => {
    try {
      setResendingTenantId(tenantId);
      const res = await resendVacantTenantAdminInvitationApi(tenantId);
      setActionNotice({
        type: 'success',
        message: `Đã gửi lại thư mời Quản trị viên mới tới ${res.targetUserEmail || email}. Thời hạn kích hoạt được gia hạn 48 giờ!`,
      });
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

  const handleCancelAdminInvitation = async (tenantId: string, email: string) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn hủy lời mời Quản trị viên cho tài khoản "${email}"?\n\n` +
      '• Nếu là tài khoản người ngoài được tạo mới do gửi nhầm, hệ thống sẽ XÓA HẲN tài khoản khỏi CSDL để giữ sạch hệ thống.\n' +
      '• Nếu là cựu nhân sự cũ, tài khoản vẫn được bảo toàn danh tính và chỉ gỡ liên kết khỏi Doanh nghiệp.'
    );
    if (!confirmed) return;

    try {
      setCancellingTenantId(tenantId);
      const res = await cancelVacantTenantAdminInvitationApi(tenantId);
      setActionNotice({
        type: 'success',
        message: `Đã hủy lời mời thành công cho ${email}. ${res.smartCleanupApplied ? '(Đã xóa tài khoản khỏi CSDL)' : ''}`,
      });
      if (onRefreshUsers) {
        onRefreshUsers();
      }
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

  // Filtered calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !effectiveSearch ||
        u.fullName.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        (u.tenantName && u.tenantName.toLowerCase().includes(effectiveSearch.toLowerCase())) ||
        (u.tenantCode && u.tenantCode.toLowerCase().includes(effectiveSearch.toLowerCase()));

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && u.isActive) ||
        (statusFilter === 'Suspended' && !u.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [users, effectiveSearch, statusFilter]);

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
              onClick={onRefreshUsers}
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
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">Trạng thái:</span>
          {(['All', 'Active', 'Suspended'] as const).map((status) => {
            const labels = {
              All: 'Tất cả',
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
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {labels[status]}
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-600">Không tìm thấy tài khoản nào</p>
                    <p className="text-xs mt-1 text-slate-400">Hãy thử đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc trạng thái.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => {
                  const isPendingTenantAdmin = !u.isActive && u.roles.includes('TenantAdmin') && !!u.tenantId;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-3 text-center font-mono text-slate-400 text-xs">
                        {(currentPage - 1) * 10 + index + 1}
                      </td>

                      {/* Tổ chức & Quản trị viên */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => onSelectUser(u)}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer inline-flex items-center gap-1.5"
                              title="Xem chi tiết doanh nghiệp"
                            >
                              <span>{u.tenantName || u.fullName}</span>
                            </button>
                            <div className="text-[11px] text-slate-500 font-normal flex items-center gap-1.5">
                              <span>Admin: {u.fullName}</span>
                              {u.tenantCode && (
                                <span className="text-[10px] font-mono text-slate-400">({u.tenantCode})</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Số điện thoại */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">{u.email}</div>
                        <div className="text-[11px] text-slate-400">{u.phoneNumber || 'Chưa cập nhật SĐT'}</div>
                      </td>

                      {/* Phòng ban */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {u.departmentName || <span className="text-slate-400 italic">Toàn cơ quan</span>}
                      </td>

                      {/* Vai trò */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length > 0 ? (
                            u.roles.map((r) => (
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
                        {u.createdAt}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">
                        {isPendingTenantAdmin ? (
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
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                            }`}
                          >
                            {u.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPendingTenantAdmin ? (
                            <>
                              <button
                                onClick={() => handleResendAdminInvitation(u.tenantId!, u.email)}
                                disabled={resendingTenantId === u.tenantId || cancellingTenantId === u.tenantId}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                                title="Gửi lại thư mời kích hoạt qua Email"
                              >
                                {resendingTenantId === u.tenantId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                ) : (
                                  <MailCheck className="w-3.5 h-3.5 text-blue-600" />
                                )}
                                <span>Gửi lại</span>
                              </button>

                              <button
                                onClick={() => handleCancelAdminInvitation(u.tenantId!, u.email)}
                                disabled={resendingTenantId === u.tenantId || cancellingTenantId === u.tenantId}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                                title="Hủy lời mời"
                              >
                                {cancellingTenantId === u.tenantId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                ) : (
                                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>Hủy</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Thử lại khởi tạo thư mục Cloud */}
                              <button
                                onClick={() => handleRetryProvisioning(u.id)}
                                disabled={retryingUserId === u.id}
                                className="p-1.5 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                                title="Thử lại khởi tạo thư mục Cloud"
                              >
                                <FolderSync className={`w-4 h-4 ${retryingUserId === u.id ? 'animate-spin text-emerald-600' : ''}`} />
                              </button>

                              {/* Tạm ngưng / Kích hoạt */}
                              <button
                                onClick={() => onToggleStatus(u.id, u.isActive)}
                                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                  u.isActive
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={u.isActive ? 'Tạm dừng tài khoản' : 'Kích hoạt lại tài khoản'}
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>

                              {/* Xóa tài khoản */}
                              <button
                                onClick={() => onDeleteUser(u.id, u.email)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa tài khoản này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
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
            Tổng cộng: <strong className="text-slate-900">{totalCount}</strong> tài khoản trên hệ thống
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
    </div>
  );
};
