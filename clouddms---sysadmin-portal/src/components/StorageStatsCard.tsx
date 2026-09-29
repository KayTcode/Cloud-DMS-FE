import React, { useState } from 'react';
import {
  HardDrive,
  Database,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  FileText,
  Video,
  Archive,
  Layers,
  Sparkles,
  Info,
  Sliders,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { TenantInfo } from '../types';

interface StorageStatsCardProps {
  tenant: TenantInfo;
  onNavigateToStorage?: () => void;
  onExpandStorage?: () => void;
}

export const StorageStatsCard: React.FC<StorageStatsCardProps> = ({
  tenant,
  onNavigateToStorage,
  onExpandStorage,
}) => {
  const [unit, setUnit] = useState<'GB' | 'TB'>('GB');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Conversion: 1 TB = 1024 GB
  const totalAllocatedGB = tenant.diskAllocatedTB * 1024; // 5120 GB
  const totalUsedGB = tenant.diskUsedTB * 1024; // 2457.6 GB
  const freeGB = totalAllocatedGB - totalUsedGB; // 2662.4 GB
  const percentUsed = Math.round((totalUsedGB / totalAllocatedGB) * 100);
  const percentFree = 100 - percentUsed;

  // Breakdown categories
  const categories = [
    {
      id: 'docs',
      name: 'Tài liệu & Hồ sơ (PDF/DOC)',
      gb: 1120.4,
      tb: 1.09,
      color: 'bg-blue-600',
      textColor: 'text-blue-600',
      lightBg: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: FileText,
      filesCount: '142,500 tệp',
    },
    {
      id: 'media',
      name: 'Media & Video nội bộ',
      gb: 784.8,
      tb: 0.77,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      lightBg: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      icon: Video,
      filesCount: '38,200 tệp',
    },
    {
      id: 'database',
      name: 'CSDL Snapshot & Logs',
      gb: 384.8,
      tb: 0.38,
      color: 'bg-cyan-500',
      textColor: 'text-cyan-600',
      lightBg: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      icon: Database,
      filesCount: '41,424 tệp',
    },
    {
      id: 'archive',
      name: 'Lưu trữ lạnh & Backup',
      gb: 167.6,
      tb: 0.16,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      lightBg: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: Archive,
      filesCount: '18,000 tệp',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Header Row: Title, Unit Switcher & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Kho lưu trữ tổng (Managed Storage Pool)
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                NVMe Primary Pool
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Thống kê dung lượng đã dùng trên toàn hệ thống kho của {tenant.name}
            </p>
          </div>
        </div>

        {/* Unit Toggle and Expand button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Unit Toggle Pill */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setUnit('GB')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                unit === 'GB'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              GB
            </button>
            <button
              onClick={() => setUnit('TB')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                unit === 'TB'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              TB
            </button>
          </div>

          {onExpandStorage && (
            <button
              onClick={onExpandStorage}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer flex items-center gap-1"
            >
              <span>Mở rộng</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5">
        {/* Card 1: Used Capacity */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50/70 to-slate-50 border border-blue-100/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Dung lượng đã dùng</span>
            <span className="text-[10px] font-bold text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-100">
              {percentUsed}%
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {unit === 'GB'
                ? `${totalUsedGB.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} GB`
                : `${tenant.diskUsedTB.toFixed(2)} TB`}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              trên tổng {unit === 'GB' ? `${totalAllocatedGB.toLocaleString()} GB` : `${tenant.diskAllocatedTB.toFixed(1)} TB`}
            </div>
          </div>
        </div>

        {/* Card 2: Free Available Capacity */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-100/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Dung lượng còn trống</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-100">
              {percentFree}%
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums">
              {unit === 'GB'
                ? `${freeGB.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} GB`
                : `${(freeGB / 1024).toFixed(2)} TB`}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Khả dụng cho tải lên mới
            </div>
          </div>
        </div>

        {/* Card 3: Growth velocity */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tốc độ gia tăng</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              +4.8 GB<span className="text-xs font-normal text-slate-500">/ngày</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Dự kiến đầy sau <span className="font-semibold text-slate-700">~554 ngày</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Files & Inodes */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tệp & Thư mục</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {tenant.filesCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              trong {tenant.directoriesCount.toLocaleString()} thư mục
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Multi-Color Progress Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span>Phân bổ dung lượng chi tiết theo loại dữ liệu</span>
            <span className="text-[11px] font-normal text-slate-400">
              (Rê chuột vào từng phân đoạn để xem chi tiết)
            </span>
          </div>
          <span className="font-bold text-blue-600 tabular-nums text-xs">
            {percentUsed}% / 100%
          </span>
        </div>

        {/* The visual progress bar with segments */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-slate-200/70 shadow-inner">
          {categories.map((cat) => {
            const widthPct = (cat.gb / totalAllocatedGB) * 100;
            const isHovered = activeCategory === cat.id;

            return (
              <div
                key={cat.id}
                onMouseEnter={() => setActiveCategory(cat.id)}
                onMouseLeave={() => setActiveCategory(null)}
                style={{ width: `${widthPct}%` }}
                className={`${cat.color} h-full first:rounded-l-full transition-all duration-300 relative group cursor-pointer ${
                  isHovered ? 'brightness-110 scale-y-110 shadow-sm z-10' : ''
                }`}
                title={`${cat.name}: ${cat.gb} GB (${widthPct.toFixed(1)}%)`}
              />
            );
          })}
          {/* Free space segment */}
          <div
            onMouseEnter={() => setActiveCategory('free')}
            onMouseLeave={() => setActiveCategory(null)}
            style={{ width: `${percentFree}%` }}
            className="bg-slate-200/70 h-full rounded-r-full transition-all hover:bg-slate-300/80 cursor-pointer"
            title={`Còn trống: ${freeGB.toFixed(1)} GB (${percentFree}%)`}
          />
        </div>
      </div>

      {/* Categories Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isHovered = activeCategory === cat.id;

          return (
            <div
              key={cat.id}
              onMouseEnter={() => setActiveCategory(cat.id)}
              onMouseLeave={() => setActiveCategory(null)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                isHovered
                  ? `${cat.borderColor} ${cat.lightBg} shadow-2xs`
                  : 'border-slate-100 hover:border-slate-200 bg-slate-50/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cat.color} shrink-0`} />
                <span className="text-xs font-semibold text-slate-800 truncate" title={cat.name}>
                  {cat.name}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {unit === 'GB' ? `${cat.gb.toLocaleString()} GB` : `${cat.tb} TB`}
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums font-mono">
                  {((cat.gb / totalAllocatedGB) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {cat.filesCount}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Footer Action / Storage Node status */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Đồng bộ 3 vùng sẵn sàng (Multi-AZ HA)</span>
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="text-slate-500 font-mono text-[11px]">
            IOPS: 12,500 | Throughput: 450 MB/s
          </span>
        </div>

        {onNavigateToStorage && (
          <button
            onClick={onNavigateToStorage}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Quản lý chi tiết ổ đĩa & phân vùng</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
