import React from 'react';
import { DepartmentNavTab } from '../types';
import {
  Compass,
  FolderOpen,
  FolderTree,
  Users,
  Database,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface DepartmentTabsProps {
  activeTab: DepartmentNavTab;
  onTabChange: (tab: DepartmentNavTab) => void;
}

export const DepartmentTabs: React.FC<DepartmentTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs: { id: DepartmentNavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'hub', label: 'Trung tâm điều khiển', icon: Compass },
    { id: 'files', label: 'Tài liệu phòng', icon: FolderOpen },
    { id: 'shared-store', label: 'Kho chung phòng', icon: FolderTree },
    { id: 'staff', label: 'Nhân sự & Quota', icon: Users },
    { id: 'quota', label: 'Hạn mức & Phê duyệt', icon: Database },
    { id: 'logs', label: 'Nhật ký hoạt động', icon: FileText },
    { id: 'report', label: 'Báo cáo kiểm toán', icon: ShieldCheck },
  ];

  return (
    <div className="border-b border-slate-200/80 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1.5 pb-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'files' && activeTab === 'trash');

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? 'border-blue-200/80 bg-blue-50 text-blue-700 shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

