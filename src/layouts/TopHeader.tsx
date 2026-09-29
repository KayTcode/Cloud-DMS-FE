import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';

interface TopHeaderProps {
  title?: string;
  onToggleMobileMenu?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNotifications?: () => void;
  notificationCount?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title = 'Tenants > Acme Corporation',
  onToggleMobileMenu,
  searchQuery,
  onSearchChange,
  onOpenNotifications,
  notificationCount = 1,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left title & mobile menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
          {title}
        </h1>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search systems, logs or tenants..."
            className="w-full bg-slate-50/70 hover:bg-slate-100/60 focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 rounded-lg pl-9 pr-4 py-2 border border-slate-200/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="w-9 h-9 rounded-full border border-slate-200/90 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors relative cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white absolute top-2 right-2" />
          )}
        </button>

        {/* All Systems OK Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold tracking-wider whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>ALL SYSTEMS OK</span>
        </div>
      </div>
    </header>
  );
};
