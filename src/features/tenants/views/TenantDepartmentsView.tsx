import React from 'react';
import { UserPlus } from 'lucide-react';
import { mockDepartments } from '@/data/tenantMockData';

interface TenantDepartmentsViewProps {
  onBackToOverview: () => void;
  onCreateDepartmentUser: (departmentName?: string) => void;
}

export const TenantDepartmentsView: React.FC<TenantDepartmentsViewProps> = ({
  onBackToOverview,
  onCreateDepartmentUser,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Configured Departments ({mockDepartments.length})</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active organizational units and allocated storage quotas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToOverview}
            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
          >
            Back to Overview
          </button>
          <button
            onClick={() => onCreateDepartmentUser()}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tạo tài khoản Department</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {mockDepartments.map((dept) => (
          <div
            key={dept.id}
            className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-blue-200 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-bold text-slate-900">{dept.name}</div>
                <button
                  onClick={() => onCreateDepartmentUser(dept.name)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 opacity-90 group-hover:opacity-100 cursor-pointer"
                  title={`Tạo tài khoản cho ${dept.name}`}
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Thêm User</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Lead: {dept.lead}</div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-200/60">
              <span className="text-slate-500">{dept.headCount} Members</span>
              <span className="font-semibold text-blue-600 tabular-nums">{dept.allocatedStorageGB} GB</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
