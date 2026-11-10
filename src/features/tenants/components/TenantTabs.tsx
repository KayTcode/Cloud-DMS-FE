import React from 'react';
import { ActiveTab } from '@/features/tenants/types';
import { 
  LayoutGrid, 
  Building2, 
  Database, 
  Settings, 
  Compass 
} from 'lucide-react';

interface TenantTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const TenantTabs: React.FC<TenantTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'hub', label: 'Trung tâm điều khiển', icon: Compass },
    { id: 'overview', label: 'Tổng quan', icon: LayoutGrid },
    { id: 'departments', label: 'Cơ cấu Phòng ban', icon: Building2 },
    { id: 'quota', label: 'Hạn mức Quota', icon: Database },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="border-b border-slate-200/80 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1.5 pb-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'departments' && activeTab === 'create-department-user');

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
