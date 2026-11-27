import React from 'react';
import { Building2, UserPlus } from 'lucide-react';
import { DepartmentInfo } from '../types';

interface DepartmentBannerProps {
  department: DepartmentInfo;
  membersCount?: number;
  onOpenAddMember?: () => void;
  onNavigateToHub?: () => void;
}

export const DepartmentBanner: React.FC<DepartmentBannerProps> = ({
  department,
  onOpenAddMember,
  onNavigateToHub,
}) => {
  const initial = department.name ? department.name.charAt(0).toUpperCase() : 'P';

  return (
    <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: Identity */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center shrink-0 border border-blue-100">
          {department.name ? initial : <Building2 className="w-5 h-5" />}
        </div>

        <div className="min-w-0">
          {/* Breadcrumb line */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
            <button
              onClick={onNavigateToHub}
              className="hover:text-blue-600 transition-colors font-medium cursor-pointer"
            >
              Phòng ban
            </button>
            <span>/</span>
            <span className="text-slate-600 font-medium truncate">{department.name || 'Hồ sơ'}</span>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              {department.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Right: Quick Action Button */}
      {onOpenAddMember && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={onOpenAddMember}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs hover:shadow-sm cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Mời nhân viên</span>
          </button>
        </div>
      )}
    </div>
  );
};

