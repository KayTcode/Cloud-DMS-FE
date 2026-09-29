import React from 'react';
import { ActiveTab } from '@/features/tenants/types';

interface TenantTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const TenantTabs: React.FC<TenantTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'departments', label: 'Departments' },
    { id: 'storage', label: 'Storage' },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="mt-6 border-b border-slate-200/90 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1.5 pb-2.5 min-w-max">
        {tabs.map((tab) => {
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'departments' && activeTab === 'create-department-user');

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border border-blue-200 bg-blue-50/70 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
