import React, { useState } from 'react';
import { UserPlus, Building2, Crown, Mail, ShieldAlert, RefreshCw, Loader2, HardDrive, UserX } from 'lucide-react';
import { useTenantContext } from '@/context/TenantContext';
import { Department } from '@/features/tenants/types';
import { AllocateDepartmentQuotaModal, OffboardDepartmentAdminModal, AssignVacantDepartmentLeadModal } from '@/features/tenants/components';

interface TenantDepartmentsViewProps {
  onBackToOverview: () => void;
  onCreateDepartmentUser: (departmentIdOrName?: string) => void;
}

export const TenantDepartmentsView: React.FC<TenantDepartmentsViewProps> = ({
  onBackToOverview,
  onCreateDepartmentUser,
}) => {
  const { tenant, departments, users, isLoadingDepartments, refreshDepartments, refreshTenantData, addToast } = useTenantContext();
  const [selectedDeptForQuota, setSelectedDeptForQuota] = useState<Department | null>(null);
  const [selectedDeptForOffboard, setSelectedDeptForOffboard] = useState<Department | null>(null);
  const [selectedDeptForAssignLead, setSelectedDeptForAssignLead] = useState<Department | null>(null);

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
              onClick={() => {
                refreshDepartments();
                refreshTenantData();
              }}
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

        {departments.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 mt-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-700">
              Chưa có phòng ban nào được thiết lập trong tổ chức
            </div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 mb-3">
              Hãy tạo phòng ban và chỉ định tài khoản Department Admin đầu tiên để bắt đầu phân quyền và lưu trữ tài liệu.
            </p>
            <button
              onClick={() => onCreateDepartmentUser()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tạo tài khoản Department Admin</span>
            </button>
          </div>
        ) : (
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
                  
                  <div className="mt-2.5 space-y-1.5">
                    {(() => {
                      const hasActiveLead = dept.lead && dept.lead !== 'Chưa chỉ định' && dept.lead !== 'N/A' && dept.adminIsActive !== false;
                      return (
                        <div className="text-[11px] text-slate-600 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <Crown className={`w-3 h-3 shrink-0 ${hasActiveLead ? 'text-amber-500' : 'text-slate-300'}`} />
                            <span className="truncate">
                              Lead / Admin:{' '}
                              {hasActiveLead ? (
                                <strong className="text-slate-900">{dept.lead}</strong>
                              ) : (
                                <span className="text-amber-600 font-semibold italic">Khuyết Lead</span>
                              )}
                            </span>
                          </div>

                          {hasActiveLead ? (
                            <button
                              onClick={() => setSelectedDeptForOffboard(dept)}
                              className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                              title="Bổ nhiệm Trưởng phòng mới kế nhiệm / Bàn giao toàn bộ dữ liệu"
                            >
                              <UserX className="w-2.5 h-2.5" />
                              <span>Kế nhiệm</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedDeptForAssignLead(dept)}
                              className="text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                              title="Bổ nhiệm Trưởng phòng mới và tiếp nhận kho dữ liệu tạm giữ"
                            >
                              <Crown className="w-2.5 h-2.5 text-amber-300" />
                              <span>Bổ nhiệm Lead</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {dept.vacantLeadQuotaBytes ? (
                      <div className="text-[10px] text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <HardDrive className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        <span>Kho tạm giữ: {(dept.vacantLeadQuotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB chờ bàn giao</span>
                      </div>
                    ) : null}

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
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-blue-600 tabular-nums">{dept.allocatedStorageGB} GB</span>
                    <button
                      onClick={() => setSelectedDeptForQuota(dept)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-md transition-colors cursor-pointer"
                      title="Cấp / Điều chỉnh Quota lưu trữ cho phòng ban này"
                    >
                      <HardDrive className="w-3 h-3 text-slate-500 hover:text-blue-600" />
                      <span>Cấp Quota</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal điều chỉnh Quota phòng ban */}
      <AllocateDepartmentQuotaModal
        isOpen={!!selectedDeptForQuota}
        onClose={() => setSelectedDeptForQuota(null)}
        department={selectedDeptForQuota}
      />

      {/* Modal Vô hiệu hóa Trưởng phòng & Bổ nhiệm Kế nhiệm */}
      <OffboardDepartmentAdminModal
        isOpen={!!selectedDeptForOffboard}
        onClose={() => setSelectedDeptForOffboard(null)}
        department={selectedDeptForOffboard}
        tenantId={tenant?.id || ''}
        users={users}
        onSuccess={() => {
          refreshDepartments();
          refreshTenantData();
          addToast('success', 'Bàn giao dữ liệu và cập nhật Trưởng phòng kế nhiệm thành công!');
        }}
      />

      {/* Modal Bổ nhiệm Trưởng phòng cho Phòng ban Khuyết Lead */}
      <AssignVacantDepartmentLeadModal
        isOpen={!!selectedDeptForAssignLead}
        onClose={() => setSelectedDeptForAssignLead(null)}
        department={selectedDeptForAssignLead}
        tenantId={tenant?.id || ''}
        users={users}
        onSuccess={() => {
          refreshDepartments();
          refreshTenantData();
          addToast('success', 'Bổ nhiệm Trưởng phòng mới và chuyển giao kho tài liệu thành công!');
        }}
      />
    </div>
  );
};

