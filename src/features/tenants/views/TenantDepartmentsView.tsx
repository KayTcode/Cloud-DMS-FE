import React from 'react';
import { UserPlus, Building2, Crown, Mail, ShieldAlert, RefreshCw, Loader2 } from 'lucide-react';
import { useTenantContext } from '@/context/TenantContext';

interface TenantDepartmentsViewProps {
  onBackToOverview: () => void;
  onCreateDepartmentUser: (departmentIdOrName?: string) => void;
}

export const TenantDepartmentsView: React.FC<TenantDepartmentsViewProps> = ({
  onBackToOverview,
  onCreateDepartmentUser,
}) => {
  const { departments, users, isLoadingDepartments, refreshDepartments } = useTenantContext();

  // Find Department Admins who are not yet assigned to any specific department
  const unassignedAdmins = users.filter(
    (u) =>
      u.role.includes('DepartmentAdmin') &&
      (!u.department || u.department === 'Chưa gán phòng ban' || u.department === 'Chưa phân bổ')
  );

  return (
    <div className="space-y-5 mt-5">
      {/* Unassigned Department Admins Section if any exist */}
      {unassignedAdmins.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Department Admins chưa chỉ định phòng ban ({unassignedAdmins.length})</span>
          </div>
          <p className="text-[11px] text-amber-700 mb-3">
            Các tài khoản quản trị viên này đã được tạo tại cấp Tenant nhưng chưa được liên kết với phòng ban cụ thể.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {unassignedAdmins.map((admin) => (
              <div
                key={admin.id}
                className="bg-white p-3 rounded-lg border border-amber-200/80 flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{admin.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{admin.email}</div>
                </div>
                <button
                  onClick={() => onCreateDepartmentUser()}
                  className="text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded cursor-pointer shrink-0 transition-colors"
                >
                  Gán phòng ban
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Configured Departments Grid */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Configured Departments ({departments.length})</h3>
              {isLoadingDepartments && (
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Đang tải từ DB...</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Active organizational units and allocated storage quotas from Database.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshDepartments()}
              disabled={isLoadingDepartments}
              className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:bg-slate-50 transition-colors"
              title="Tải lại dữ liệu từ Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDepartments ? 'animate-spin text-blue-600' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              onClick={onBackToOverview}
              className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Back to Overview
            </button>
            <button
              onClick={() => onCreateDepartmentUser()}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tạo tài khoản Department Admin</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-blue-200 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{dept.name}</span>
                  </div>
                  <button
                    onClick={() => onCreateDepartmentUser(dept.id)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 opacity-90 group-hover:opacity-100 cursor-pointer"
                    title={`Tạo Admin cho ${dept.name}`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Thêm User</span>
                  </button>
                </div>
                
                <div className="mt-2.5 space-y-1">
                  <div className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>Lead / Admin: <strong className="text-slate-900">{dept.lead}</strong></span>
                  </div>
                  {dept.adminEmail && (
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5 text-slate-400" />
                      <span>{dept.adminEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium">{dept.headCount} Members</span>
                <span className="font-semibold text-blue-600 tabular-nums">{dept.allocatedStorageGB} GB</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
