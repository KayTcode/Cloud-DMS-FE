import React, { useState } from 'react';
import { UserPlus, Building2, Crown, Mail, ShieldAlert, RefreshCw, Loader2, HardDrive, UserX, ArrowRight } from 'lucide-react';
import { useTenantContext } from '@/context/TenantContext';
import { Department } from '@/features/tenants/types';
import { AllocateDepartmentQuotaModal, OffboardDepartmentAdminModal, AssignVacantDepartmentLeadModal } from '@/features/tenants/components';

interface TenantDepartmentsViewProps {
  onBackToOverview: () => void;
  onCreateDepartmentUser: (departmentIdOrName?: string) => void;
  onOpenDepartment?: (departmentId: string) => void;
}

export const TenantDepartmentsView: React.FC<TenantDepartmentsViewProps> = ({
  onBackToOverview,
  onCreateDepartmentUser,
  onOpenDepartment,
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
    <div className="space-y-5 mt-4 animate-in fade-in duration-150">
      {/* 1. KHỐI CẢNH BÁO TRƯỞNG PHÒNG CHƯA GÁN (NẾU CÓ) */}
      {unassignedAdmins.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Trưởng phòng (Department Admins) chưa chỉ định phòng ban ({unassignedAdmins.length})</span>
          </div>
          <p className="text-xs text-amber-800/80 mb-3">
            Các tài khoản quản trị viên này đã được tạo tại cấp Doanh nghiệp nhưng chưa được liên kết với phòng ban cụ thể.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unassignedAdmins.map((admin) => (
              <div
                key={admin.id}
                className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{admin.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">{admin.email}</div>
                </div>
                <button
                  onClick={() => onCreateDepartmentUser()}
                  className="text-[11px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full cursor-pointer shrink-0 transition-colors"
                >
                  Gán phòng
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. KHỐI DANH SÁCH PHÒNG BAN CHÍNH */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Cơ Cấu Phòng Ban Trực Thuộc ({departments.length})
              </h3>
              {isLoadingDepartments && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải...</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Các đơn vị phòng ban, tài khoản quản trị viên phụ trách và hạn mức Quota lưu trữ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                refreshDepartments();
                refreshTenantData();
              }}
              disabled={isLoadingDepartments}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-1.5 rounded-full border border-slate-200/80 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
              title="Làm mới danh sách từ CSDL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDepartments ? 'animate-spin text-blue-600' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              onClick={() => onCreateDepartmentUser()}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Thêm Trưởng phòng mới</span>
            </button>
          </div>
        </div>

        {departments.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 mt-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              Chưa có phòng ban nào được thiết lập trong tổ chức
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Hãy tạo phòng ban và chỉ định tài khoản Department Admin đầu tiên để bắt đầu phân quyền và lưu trữ tài liệu.
            </p>
            <button
              onClick={() => onCreateDepartmentUser()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tạo phòng ban & Admin</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-5">
            {departments.map((dept) => {
              const quotaBytes = dept.storageQuotaBytes || 0;
              const usedBytes = dept.storageUsedBytes || 0;
              const quotaGB = (quotaBytes / (1024 ** 3)).toFixed(1);
              const usedGB = (usedBytes / (1024 ** 3)).toFixed(1);
              const pct = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0;
              const hasActiveLead = dept.lead && dept.lead !== 'Chưa chỉ định' && dept.lead !== 'N/A' && dept.adminIsActive !== false;

              return (
                <div
                  key={dept.id}
                  className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top: Name & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          {onOpenDepartment ? (
                            <button
                              onClick={() => onOpenDepartment(dept.id)}
                              className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors truncate cursor-pointer text-left block"
                              title={`Xem chi tiết phòng ban ${dept.name}`}
                            >
                              {dept.name}
                            </button>
                          ) : (
                            <span className="text-sm font-bold text-slate-900 truncate block">{dept.name}</span>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">
                            {dept.headCount || 0} thành viên
                          </span>
                        </div>
                      </div>

                      {dept.isVacant && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          Khuyết Lead
                        </span>
                      )}
                    </div>

                    {/* Middle: Lead & Status */}
                    <div className="mt-4 p-3 bg-slate-50/70 rounded-xl space-y-1.5 border border-slate-100">
                      <div className="text-xs text-slate-600 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Crown className={`w-3.5 h-3.5 shrink-0 ${hasActiveLead ? 'text-amber-500' : 'text-slate-300'}`} />
                          <span className="truncate">
                            {hasActiveLead ? (
                              <strong className="text-slate-900">{dept.lead}</strong>
                            ) : (
                              <span className="text-amber-600 font-semibold italic">Chưa có Trưởng phòng</span>
                            )}
                          </span>
                        </div>

                        {hasActiveLead ? (
                          <button
                            onClick={() => setSelectedDeptForOffboard(dept)}
                            className="text-[10px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                            title="Bổ nhiệm Trưởng phòng kế nhiệm / Bàn giao dữ liệu"
                          >
                            <UserX className="w-2.5 h-2.5" />
                            <span>Kế nhiệm</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedDeptForAssignLead(dept)}
                            className="text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-0.5 rounded-full cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                            title="Bổ nhiệm Trưởng phòng mới"
                          >
                            <Crown className="w-2.5 h-2.5 text-amber-300" />
                            <span>Bổ nhiệm</span>
                          </button>
                        )}
                      </div>

                      {dept.adminEmail && (
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{dept.adminEmail}</span>
                        </div>
                      )}
                    </div>

                    {/* Single Clean Google One Storage Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Dung lượng:</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {usedGB} GB / {quotaGB} GB ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.max(3, pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => onOpenDepartment?.(dept.id)}
                      className="font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Xem chi tiết</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onCreateDepartmentUser(dept.id)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                        title="Thêm nhân viên vào phòng này"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedDeptForQuota(dept)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                        title="Điều chỉnh Quota lưu trữ cho phòng ban"
                      >
                        <HardDrive className="w-3 h-3" />
                        <span>Cấp Quota</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
