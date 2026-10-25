import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Filter, 
  ChevronDown, 
  Check, 
  ShieldAlert, 
  Trash2,
  ExternalLink,
  Edit,
  KeyRound,
  Building2,
  ShieldCheck,
  UserCheck,
  HardDrive,
  FolderSync,
} from 'lucide-react';
import { AdminUserDto, PlanType, TenantStatus } from '../types';
import { quotaApi } from '@/features/quota';

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
  onOpenResetPasswordModal: (user: AdminUserDto) => void;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onDeleteUser: (userId: string, userEmail: string) => void;
  onOpenAllocateQuotaModal?: (user: AdminUserDto) => void;
}

export const TenantManagementView: React.FC<TenantManagementViewProps> = ({
  users,
  totalCount,
  currentPage,
  totalPages,
  searchQuery,
  onPageChange,
  onOpenCreateModal,
  onSelectUser,
  onOpenEditModal,
  onOpenResetPasswordModal,
  onToggleStatus,
  onDeleteUser,
  onOpenAllocateQuotaModal,
}) => {
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [retryingUserId, setRetryingUserId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  // Filtered calculation (if client filtering on current page or server-side)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchQuery ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.tenantName && u.tenantName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && u.isActive) ||
        (statusFilter === 'Suspended' && !u.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

  const resetFilters = () => {
    setStatusFilter('All');
    onPageChange(1);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Tenant & Account Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage organization tenants, lead administrators, permissions and credentials
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Provision Tenant / User</span>
        </button>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
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

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200/80 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none transition-colors cursor-pointer"
            >
              <span>Status: {statusFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {statusDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs">
                {(['All', 'Active', 'Suspended'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setStatusDropdownOpen(false);
                      onPageChange(1);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                      statusFilter === status
                        ? 'text-blue-600 font-semibold bg-blue-50/50'
                        : 'text-slate-700'
                    }`}
                  >
                    <span>{status}</span>
                    {statusFilter === status && (
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reset Filters Link */}
        {statusFilter !== 'All' && (
          <button
            onClick={resetFilters}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Data Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[380px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 bg-slate-50/30">
                <th className="py-3.5 px-3 text-center w-14 font-semibold">STT</th>
                <th className="py-3.5 px-5 font-semibold">User / Tenant Name</th>
                <th className="py-3.5 px-4 font-semibold">Email & Phone</th>
                <th className="py-3.5 px-4 font-semibold">Organization</th>
                <th className="py-3.5 px-4 font-semibold">Roles</th>
                <th className="py-3.5 px-4 font-semibold">Created Date</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No accounts found</p>
                    <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* STT */}
                    <td className="py-3.5 px-3 text-center font-mono text-slate-500 font-medium text-xs">
                      {(currentPage - 1) * 10 + index + 1}
                    </td>

                    {/* User / Tenant Name (Hyperlink) */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {u.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <button
                            onClick={() => onSelectUser(u)}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left cursor-pointer inline-flex items-center gap-1"
                            title="Bấm để xem chi tiết tài khoản"
                          >
                            <span>{u.fullName}</span>
                          </button>
                          {u.tenantCode && (
                            <span className="block text-[10px] font-mono text-slate-400 font-normal">
                              Code: {u.tenantCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{u.email}</div>
                      <div className="text-[11px] text-slate-400">{u.phoneNumber || 'No phone'}</div>
                    </td>

                    {/* Organization / Tenant */}
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.tenantName || 'Global System'}</span>
                      </div>
                      {u.departmentName && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Dept: {u.departmentName}
                        </div>
                      )}
                    </td>

                    {/* Roles */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length > 0 ? (
                          u.roles.map((r) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-semibold font-mono"
                            >
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">User</span>
                        )}
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-600 font-normal">
                      {u.createdAt}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-rose-50 text-rose-500 border border-rose-100'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    {/* Actions: Direct action buttons instead of ... dropdown */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Profile */}
                        <button
                          onClick={() => onOpenEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin tài khoản"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Cấp Quota Cloud */}
                        {onOpenAllocateQuotaModal && (
                          <button
                            onClick={() => onOpenAllocateQuotaModal(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Cấp phát Quota Cloud"
                          >
                            <HardDrive className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => onOpenResetPasswordModal(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Đặt lại mật khẩu"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {/* Thử lại khởi tạo thư mục Cloud */}
                        <button
                          onClick={() => handleRetryProvisioning(u.id)}
                          disabled={retryingUserId === u.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Thử lại khởi tạo thư mục Cloud"
                        >
                          <FolderSync className={`w-4 h-4 ${retryingUserId === u.id ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>

                        {/* Suspend / Activate */}
                        <button
                          onClick={() => onToggleStatus(u.id, u.isActive)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            u.isActive
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={u.isActive ? 'Tạm dừng tài khoản' : 'Kích hoạt tài khoản'}
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => onDeleteUser(u.id, u.email)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/80 text-xs text-slate-500 bg-white">
          <span>
            Total: <strong>{totalCount}</strong> users registered across organizations
          </span>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Previous
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-lg font-medium transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
