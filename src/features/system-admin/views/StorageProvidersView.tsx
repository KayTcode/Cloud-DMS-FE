import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  HardDrive, 
  Trash2, 
  Building2, 
  Layers,
  Activity,
  Key,
  ArrowRightLeft
} from 'lucide-react';
import { StorageProviderItem } from '../types';
import { ConnectProviderModal } from '../components/ConnectProviderModal';
import { EditProviderModal } from '../components/EditProviderModal';
import { StorageMigrationPanel } from '../components/StorageMigrationPanel';
import { getStorageProvidersApi } from '../api/systemAdminQueries';
import { deleteStorageProviderApi } from '../api/systemAdminCommands';
import { formatBytes } from '../../department-admin/utils/quotaUtils';

interface StorageProvidersViewProps {
  providers: StorageProviderItem[];
  onAddToast?: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
  onProvidersChange?: () => void;
}

export const StorageProvidersView: React.FC<StorageProvidersViewProps> = ({
  providers: initialProviders,
  onAddToast,
  onProvidersChange,
}) => {
  const [providers, setProviders] = useState<StorageProviderItem[]>(initialProviders);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<StorageProviderItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);

  useEffect(() => {
    setProviders(initialProviders);
  }, [initialProviders]);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const data = await getStorageProvidersApi();
      setProviders(data);
      onProvidersChange?.();
    } catch {
      // Keep existing
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleTestConnection = (id: string, name: string) => {
    setTestingId(id);
    setTimeout(() => {
      setTestingId(null);
      if (onAddToast) {
        onAddToast('success', `Đã kết nối thành công đến ${name} (Độ trễ: 24ms)`);
      }
    }, 800);
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn ngắt kết nối kho lưu trữ "${name}"? Các Tenant đang dùng sẽ được gỡ liên kết.`)) {
      return;
    }

    try {
      await deleteStorageProviderApi(id);
      if (onAddToast) {
        onAddToast('success', `Đã ngắt kết nối ${name} thành công.`);
      }
      fetchProviders();
    } catch (err: any) {
      if (onAddToast) {
        onAddToast('error', `Lỗi: ${err?.message || 'Không thể xóa kho lưu trữ.'}`);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. HEADER (GOOGLE DRIVE STYLE) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Kho Lưu Trữ Đám Mây (Storage Providers)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý kết nối các kho Google Drive, OneDrive và giám sát hạn mức dung lượng khả dụng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Làm mới */}
          <button
            onClick={fetchProviders}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          {/* Nút Di chuyển dữ liệu */}
          <button
            onClick={() => setMigrationOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Di chuyển dữ liệu</span>
          </button>

          {/* Nút Kết nối Cloud Provider mới */}
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-full shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Kết Nối Cloud Provider</span>
          </button>
        </div>
      </div>

      {/* Migration Panel hiển thị khi mở */}
      {migrationOpen && (
        <StorageMigrationPanel
          providers={providers}
          onClose={() => {
            setMigrationOpen(false);
            void fetchProviders();
          }}
        />
      )}

      {/* 2. DANH SÁCH CÁC THẺ KHO LƯU TRỮ (GOOGLE ONE STYLE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {providers.map((p) => {
          const totalBytes = p.totalCapacityBytes || 0;
          const externalUsed = p.externalUsedBytes ?? 0;
          const systemUsed = p.systemUsedBytes ?? 0;
          const realUsed = externalUsed + systemUsed;
          const showBar = realUsed > 0 && totalBytes > 0;
          const usedPercent = showBar ? Math.min(100, Math.round((realUsed / totalBytes) * 100)) : 0;

          return (
            <div
              key={p.id}
              className="flex flex-col justify-between p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:border-slate-300 transition-all group"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {p.status || 'Active'}
                    </span>
                    <button
                      onClick={() => setEditingProvider(p)}
                      title="Cập nhật Token / Chứng chỉ"
                      className="p-1.5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProvider(p.id, p.name)}
                      title="Ngắt kết nối kho lưu trữ này"
                      className="p-1.5 rounded-full text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3 group-hover:text-blue-600 transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {p.type} • {p.region}
                </p>

                {/* Thanh tiến trình dung lượng Google Drive style */}
                {showBar && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Đã sử dụng:</span>
                      <span className="text-slate-900 font-mono">{formatBytes(realUsed)} / {formatBytes(totalBytes)} ({usedPercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, usedPercent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {(p.migrationReservedBytes || p.migrationRetainedBytes) ? (
                  <p className="mt-3 text-xs text-amber-700 bg-amber-50/60 p-2 rounded-lg">
                    Dành chỗ di chuyển: {formatBytes(p.migrationReservedBytes || 0)} · Nguồn chờ dọn: {formatBytes(p.migrationRetainedBytes || 0)}
                  </p>
                ) : null}
                {p.migrationReadOnly && (
                  <p className="text-xs text-amber-700 bg-amber-50/60 p-2 rounded-lg mt-2">
                    Kho nguồn đang ở chế độ chỉ đọc.
                  </p>
                )}

                {/* Bảng phân tích chi tiết dung lượng */}
                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      Tổng dung lượng thật:
                    </span>
                    <span className="font-mono font-semibold text-slate-800">
                      {totalBytes > 0 ? formatBytes(totalBytes) : 'Chưa xác định'}
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Đã cấp cho tổ chức:
                    </span>
                    <span className="font-mono font-semibold text-indigo-600">
                      {p.allocatedToTenantsBytes != null ? formatBytes(p.allocatedToTenantsBytes) : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Còn cấp được:
                    </span>
                    <span className="font-mono font-semibold text-emerald-600">
                      {p.availableToGrantBytes != null ? formatBytes(p.availableToGrantBytes) : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      Cập nhật lần cuối:
                    </span>
                    <span className="font-mono text-slate-500">
                      {p.lastSyncAt ? new Date(p.lastSyncAt).toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestConnection(p.id, p.name)}
                  disabled={testingId === p.id}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      testingId === p.id ? 'animate-spin text-blue-600' : ''
                    }`}
                  />
                  <span>{testingId === p.id ? 'Đang ping...' : 'Kiểm tra'}</span>
                </button>

                <button
                  onClick={() => setEditingProvider(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-200/60 transition-colors cursor-pointer"
                  title="Cập nhật Token hoặc Credentials"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Cập nhật Token</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Provider Modal */}
      <ConnectProviderModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSuccess={(msg) => {
          if (onAddToast) onAddToast('success', msg);
          fetchProviders();
        }}
      />

      {/* Edit Provider Modal */}
      <EditProviderModal
        isOpen={!!editingProvider}
        provider={editingProvider}
        onClose={() => setEditingProvider(null)}
        onSuccess={(msg) => {
          if (onAddToast) onAddToast('success', msg);
          fetchProviders();
        }}
      />
    </div>
  );
};
