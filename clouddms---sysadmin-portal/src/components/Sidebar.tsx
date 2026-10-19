import React from 'react';
import {
  LayoutGrid,
  Database,
  HardDrive,
  FileText,
  Settings,
  X
} from 'lucide-react';
import { NavItem } from '../types';

interface SidebarProps {
  activeNav: NavItem;
  onSelectNav: (nav: NavItem) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onSelectNav,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems: { id: NavItem; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'tenants', label: 'Tenants', icon: Database },
    { id: 'storage-providers', label: 'Storage Providers', icon: HardDrive },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top brand header */}
        <div>
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              {/* CloudDMS Icon */}
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  <path d="M12 13h.01" />
                  <path d="M12 16h.01" />
                </svg>
              </div>

              <div>
                <div className="font-bold text-slate-900 text-base leading-tight tracking-tight">
                  CloudDMS
                </div>
                <div className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mt-0.5">
                  SYSADMIN PORTAL
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation links */}
          <nav className="mt-8 px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectNav(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-[#EEF4FF] text-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom user profile card */}
        <div className="p-3">
          <div className="p-2.5 rounded-xl border border-slate-200/90 bg-white flex items-center gap-3 hover:border-slate-300 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                Alex Mercer
              </div>
              <div className="text-[11px] text-slate-400 font-normal truncate">
                System Admin
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
