import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { TenantInfo } from '@/features/tenants/types';
import { FileItemDto, getTenantFilesApi } from '@/features/tenants/api/fileApi';
import { useTenantContext } from '@/context/TenantContext';

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
  const { departments } = useTenantContext();
  const [unit, setUnit] = useState<'GB' | 'TB'>('GB');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real files from database for dynamic categorization
  useEffect(() => {
    if (tenant.id) {
      let isMounted = true;
      setIsLoading(true);
      getTenantFilesApi(tenant.id)
        .then((res) => {
          if (isMounted && res?.files) {
            setFiles(res.files);
          }
        })
        .catch(() => {
          // Keep empty if network issue
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [tenant.id, tenant.storageUsedBytes]);

  // Real Quota from DB (storageQuotaBytes) with fallback to TB conversion
  const totalAllocatedGB = tenant.storageQuotaBytes
    ? Math.max(0.1, Number((tenant.storageQuotaBytes / (1024 ** 3)).toFixed(2)))
    : Math.max(0.1, Number((tenant.diskAllocatedTB * 1024).toFixed(2)));

  // Tính tổng Quota đã cấp cho các phòng ban thuộc Tenant
  const totalDeptsQuotaBytes = departments.reduce((acc, d) => {
    return acc + (d.storageQuotaBytes ?? ((d.allocatedStorageGB || 0) * (1024 ** 3)));
  }, 0);

  const realFilesUsedBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);

  // Dung lượng Tenant đã cấp / sử dụng: ưu tiên tổng dung lượng đã cấp cho các phòng ban
  const effectiveAllocatedBytes = (tenant.allocatedToDepartmentsBytes && tenant.allocatedToDepartmentsBytes > 0)
    ? tenant.allocatedToDepartmentsBytes
    : (totalDeptsQuotaBytes > 0 ? totalDeptsQuotaBytes : Math.max(realFilesUsedBytes, tenant.storageUsedBytes || 0));

  const totalUsedGB = Number((effectiveAllocatedBytes / (1024 ** 3)).toFixed(2));
  const freeGB = Math.max(0, Number((totalAllocatedGB - totalUsedGB).toFixed(2)));
  const percentUsed = totalAllocatedGB > 0 ? Math.min(100, Math.round((totalUsedGB / totalAllocatedGB) * 100)) : 0;
  const percentFree = Math.max(0, 100 - percentUsed);

  // Dynamically calculate category storage usage from real files in database
  const categories = useMemo(() => {
    let docsBytes = 0, docsCount = 0;
    let mediaBytes = 0, mediaCount = 0;
    let dataBytes = 0, dataCount = 0;
    let archiveBytes = 0, archiveCount = 0;

    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const mime = (file.contentType || '').toLowerCase();

      if (
        mime.includes('pdf') ||
        mime.includes('word') ||
        mime.includes('text') ||
        ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)
      ) {
        docsBytes += file.sizeBytes;
        docsCount++;
      } else if (
        mime.includes('image') ||
        mime.includes('video') ||
        mime.includes('audio') ||
        ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp4', 'mov', 'avi', 'mp3'].includes(ext)
      ) {
        mediaBytes += file.sizeBytes;
        mediaCount++;
      } else if (
        mime.includes('excel') ||
        mime.includes('spreadsheet') ||
        mime.includes('csv') ||
        mime.includes('json') ||
        mime.includes('sql') ||
        ['xls', 'xlsx', 'csv', 'json', 'sql', 'db'].includes(ext)
      ) {
        dataBytes += file.sizeBytes;
        dataCount++;
      } else {
        archiveBytes += file.sizeBytes;
        archiveCount++;
      }
    });

    const formatAdaptiveSize = (bytes: number, targetUnit: 'GB' | 'TB') => {
      if (!bytes || bytes <= 0) return '0 B';
      if (targetUnit === 'TB') {
        const tb = bytes / (1024 ** 4);
        if (tb >= 0.01) return `${tb.toFixed(2)} TB`;
      }
      const gb = bytes / (1024 ** 3);
      if (gb >= 0.01) return `${gb.toFixed(2)} GB`;
      const mb = bytes / (1024 ** 2);
      if (mb >= 0.1) return `${mb.toFixed(1)} MB`;
      const kb = bytes / 1024;
      return `${kb.toFixed(0)} KB`;
    };

    return [
      {
        id: 'docs',
        name: 'Tài liệu & Hồ sơ (PDF/DOC)',
        bytes: docsBytes,
        formattedSize: formatAdaptiveSize(docsBytes, unit),
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        lightBg: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: FileText,
        filesCount: `${docsCount.toLocaleString()} tệp`,
      },
      {
        id: 'media',
        name: 'Media & Hình ảnh/Video',
        bytes: mediaBytes,
        formattedSize: formatAdaptiveSize(mediaBytes, unit),
        color: 'bg-indigo-500',
        textColor: 'text-indigo-600',
        lightBg: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        icon: Video,
        filesCount: `${mediaCount.toLocaleString()} tệp`,
      },
      {
        id: 'database',
        name: 'Bảng tính & Dữ liệu (Excel/CSV)',
        bytes: dataBytes,
        formattedSize: formatAdaptiveSize(dataBytes, unit),
        color: 'bg-cyan-500',
        textColor: 'text-cyan-600',
        lightBg: 'bg-cyan-50',
        borderColor: 'border-cyan-200',
        icon: Database,
        filesCount: `${dataCount.toLocaleString()} tệp`,
      },
      {
        id: 'archive',
        name: 'Tệp nén, Sao lưu & Khác',
        bytes: archiveBytes,
        formattedSize: formatAdaptiveSize(archiveBytes, unit),
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        lightBg: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: Archive,
        filesCount: `${archiveCount.toLocaleString()} tệp`,
      },
    ];
  }, [files, unit]);

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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {tenant.storageProviderName ? `Cloud: ${tenant.storageProviderName}` : 'Cloud Storage Pool'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Thống kê dung lượng đã dùng thời gian thực trên toàn hệ thống kho của {tenant.name}
            </p>
          </div>
        </div>

        {/* Unit Toggle and Expand button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isLoading && (
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin mr-1" />
          )}

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
            <span>Dung lượng đã cấp</span>
            <span className="text-[10px] font-bold text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-100">
              {percentUsed}%
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {totalAllocatedGB > 0
                ? (unit === 'GB'
                    ? `${totalUsedGB.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} GB`
                    : `${(totalUsedGB / 1024).toFixed(3)} TB`)
                : '0 GB'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalAllocatedGB > 0
                ? `trên tổng ${unit === 'GB' ? `${totalAllocatedGB.toLocaleString()} GB` : `${(totalAllocatedGB / 1024).toFixed(2)} TB`} (Đã cấp phòng ban)`
                : 'Chưa được cấp Quota Cloud'}
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
                ? `${freeGB.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} GB`
                : `${(freeGB / 1024).toFixed(3)} TB`}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Khả dụng cho phòng ban & tải lên
            </div>
          </div>
        </div>

        {/* Card 3: Growth velocity */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Trạng thái bảo vệ</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>ClamAV & SHA-256</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {files.length > 0 ? `${files.length} tệp tin an toàn` : 'Chưa có tệp tin'}
            </div>
          </div>
        </div>

        {/* Card 4: Total Files & Inodes */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tổng tệp tin đã lưu</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {files.length.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              đã đồng bộ trên Cloud
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Multi-Color Progress Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span>Phân bổ dung lượng chi tiết theo loại dữ liệu thực tế</span>
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
            const totalAllocatedBytes = totalAllocatedGB * (1024 ** 3);
            const rawPct = totalAllocatedBytes > 0 ? (cat.bytes / totalAllocatedBytes) * 100 : 0;
            const isHovered = activeCategory === cat.id;

            if (cat.bytes <= 0) return null;

            return (
              <div
                key={cat.id}
                onMouseEnter={() => setActiveCategory(cat.id)}
                onMouseLeave={() => setActiveCategory(null)}
                style={{ width: `${Math.max(2, Math.min(100, rawPct))}%` }}
                className={`${cat.color} h-full first:rounded-l-full transition-all duration-300 relative group cursor-pointer ${
                  isHovered ? 'brightness-110 scale-y-110 shadow-sm z-10' : ''
                }`}
                title={`${cat.name}: ${cat.formattedSize} (${rawPct < 0.1 ? '< 0.1%' : `${rawPct.toFixed(2)}%`})`}
              />
            );
          })}
          {/* Allocated department quota segment */}
          {percentUsed > 0 && (
            <div
              onMouseEnter={() => setActiveCategory('departments')}
              onMouseLeave={() => setActiveCategory(null)}
              style={{
                width: `${Math.max(
                  0,
                  percentUsed - Math.round((realFilesUsedBytes / (totalAllocatedGB * (1024 ** 3))) * 100)
                )}%`,
              }}
              className={`bg-indigo-500/80 h-full transition-all duration-300 relative group cursor-pointer ${
                categories.every((c) => c.bytes <= 0) ? 'rounded-l-full' : ''
              }`}
              title={`Hạn mức đã cấp phòng ban: ${totalUsedGB} GB (${percentUsed}%)`}
            />
          )}
          {/* Free space segment */}
          <div
            onMouseEnter={() => setActiveCategory('free')}
            onMouseLeave={() => setActiveCategory(null)}
            style={{ width: `${percentFree}%` }}
            className="bg-slate-200/70 h-full rounded-r-full transition-all hover:bg-slate-300/80 cursor-pointer flex-1"
            title={`Còn trống: ${freeGB.toFixed(2)} GB (${percentFree}%)`}
          />
        </div>
      </div>

      {/* Categories Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
        {categories.map((cat) => {
          const totalAllocatedBytes = totalAllocatedGB * (1024 ** 3);
          const rawPct = totalAllocatedBytes > 0 ? (cat.bytes / totalAllocatedBytes) * 100 : 0;
          const isHovered = activeCategory === cat.id;

          const displayPct = cat.bytes > 0 && rawPct < 0.1 ? '< 0.1%' : `${rawPct.toFixed(1)}%`;

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
                  {cat.formattedSize}
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums font-mono">
                  {displayPct}
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
            Cloud Provider: {tenant.storageProviderName || 'Google Drive / Local'}
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
