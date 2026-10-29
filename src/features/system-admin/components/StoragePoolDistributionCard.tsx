import React from 'react';
import { Cloud, HardDrive, Server, ArrowUpRight, Layers } from 'lucide-react';
import { StorageProviderItem } from '../types';

interface StoragePoolDistributionCardProps {
  providers: StorageProviderItem[];
  onManageProviders?: () => void;
}

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 GB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const StoragePoolDistributionCard: React.FC<StoragePoolDistributionCardProps> = ({
  providers = [],
  onManageProviders,
}) => {
  // Tính toán số liệu tổng hợp toàn sàn (Global Storage Pool)
  const totalPoolCapacity = providers.reduce(
    (acc, p) => acc + (p.totalCapacityBytes || 0),
    0
  );
  const totalAllocated = providers.reduce(
    (acc, p) => acc + (p.allocatedToTenantsBytes || 0),
    0
  );
  const totalActualUsed = providers.reduce(
    (acc, p) => acc + (p.usedCapacityBytes || 0),
    0
  );
  const totalUnallocated = Math.max(0, totalPoolCapacity - totalAllocated);

  const globalAllocatedPct = totalPoolCapacity > 0
    ? Math.min(100, Math.round((totalAllocated / totalPoolCapacity) * 100))
    : 0;
  const globalUsedPct = totalPoolCapacity > 0
    ? Math.min(100, Math.round((totalActualUsed / totalPoolCapacity) * 100))
    : 0;

  const getProviderIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('google')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
          <Cloud className="w-5 h-5" />
        </div>
      );
    }
    if (t.includes('onedrive')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
          <Cloud className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
        <Server className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="flex flex-col justify-between h-full p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-50 text-blue-600">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Phân bổ Bể lưu trữ Cloud (Storage Providers Pool)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Giám sát dung lượng thực tế, hạn mức Quota đã cấp và dung lượng còn trống trên từng Cloud Provider
            </p>
          </div>

          {onManageProviders && (
            <button
              onClick={onManageProviders}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer shrink-0 ml-2"
            >
              <span>Quản lý Kho lưu trữ</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Pool Summary Banner */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">
              Tổng Bể chứa Cloud: <span className="font-bold text-slate-900 font-mono">{formatBytes(totalPoolCapacity)}</span>
            </span>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                Dữ liệu thực tế: <strong className="text-slate-700 font-mono">{formatBytes(totalActualUsed)} ({globalUsedPct}%)</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                Đã cấp Quota DN: <strong className="text-slate-700 font-mono">{formatBytes(totalAllocated)} ({globalAllocatedPct}%)</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Còn trống để cấp mới: <strong className="text-emerald-700 font-mono">{formatBytes(totalUnallocated)}</strong>
              </span>
            </div>
          </div>

          {/* Stacked Visual Bar */}
          <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden flex mt-2.5">
            <div
              style={{ width: `${globalUsedPct}%` }}
              className="h-full bg-blue-600 transition-all duration-500"
              title={`Dữ liệu thực tế: ${formatBytes(totalActualUsed)}`}
            />
            <div
              style={{ width: `${Math.max(0, globalAllocatedPct - globalUsedPct)}%` }}
              className="h-full bg-indigo-400 transition-all duration-500"
              title={`Quota đã cấp phát: ${formatBytes(totalAllocated)}`}
            />
            <div
              style={{ width: `${Math.max(0, 100 - globalAllocatedPct)}%` }}
              className="h-full bg-emerald-400/80 transition-all duration-500"
              title={`Khả dụng còn trống: ${formatBytes(totalUnallocated)}`}
            />
          </div>
        </div>

        {/* Detailed Provider List */}
        <div className="mt-4 space-y-3.5">
          {providers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <HardDrive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>Chưa có Nhà cung cấp lưu trữ nào được kết nối trong hệ thống.</span>
            </div>
          ) : (
            providers.map((p) => {
              const cap = p.totalCapacityBytes || 0;
              const used = p.usedCapacityBytes || 0;
              const alloc = p.allocatedToTenantsBytes || 0;
              const unalloc = Math.max(0, (p.unallocatedCapacityBytes ?? (cap - alloc)));
              const allocPct = cap > 0 ? Math.min(100, Math.round((alloc / cap) * 100)) : 0;
              const usedPct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;

              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200/90 hover:bg-slate-50/50 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {getProviderIcon(p.type || p.name)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {p.name}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0">
                            {p.type}
                          </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                              p.status === 'Connected'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : p.status === 'Degraded'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            }`}
                          >
                            {p.status === 'Connected' ? 'Đã kết nối' : p.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Đang phục vụ <strong className="text-slate-700 font-medium">{p.tenantsCount || 0} Doanh nghiệp</strong> • Tổng pool: <span className="font-mono text-slate-700">{formatBytes(cap)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {allocPct}% Quota
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Đã cam kết
                      </span>
                    </div>
                  </div>

                  {/* Provider Mini Progress Bar */}
                  <div className="mt-2.5">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${usedPct}%` }}
                        className="h-full bg-blue-600"
                        title={`Thực tế: ${formatBytes(used)}`}
                      />
                      <div
                        style={{ width: `${Math.max(0, allocPct - usedPct)}%` }}
                        className="h-full bg-indigo-400"
                        title={`Quota đã cấp: ${formatBytes(alloc)}`}
                      />
                      <div
                        style={{ width: `${Math.max(0, 100 - allocPct)}%` }}
                        className="h-full bg-emerald-400/80"
                        title={`Khả dụng còn trống: ${formatBytes(unalloc)}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
                      <span>Đã cấp: <strong>{formatBytes(alloc)}</strong></span>
                      <span>Thực dùng: <strong>{formatBytes(used)}</strong></span>
                      <span className="text-emerald-600 font-semibold">Khả dụng: <strong>{formatBytes(unalloc)}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Cập nhật theo dữ liệu API Cloud Storage Providers thời gian thực</span>
        <span className="font-medium text-blue-600">
          {providers.filter((p) => p.status === 'Connected').length}/{providers.length} Hoạt động
        </span>
      </div>
    </div>
  );
};
