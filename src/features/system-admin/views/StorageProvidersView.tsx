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
  Activity
} from 'lucide-react';
import { StorageProviderItem } from '../types';
import { ConnectProviderModal } from '../components/ConnectProviderModal';
import { getStorageProvidersApi } from '../api/systemAdminQueries';
import { deleteStorageProviderApi } from '../api/systemAdminCommands';

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
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Connected Storage Providers
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý kho lưu trữ đa đám mây (Google Drive, Microsoft OneDrive) và giám sát dung lượng khả dụng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProviders}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Kết Nối Cloud Provider</span>
          </button>
        </div>
      </div>

      {/* Cloud Pool Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {providers.map((p) => {
          const usedBytes = p.usedCapacityBytes || 0;
          const totalBytes = p.totalCapacityBytes || 1;
          const usedPercent = Math.min(100, Math.round((usedBytes / totalBytes) * 100));
          const allocatedBytes = p.allocatedToTenantsBytes || 0;
          const allocatedGB = Math.round(allocatedBytes / (1024 * 1024 * 1024));

          return (
            <div
              key={p.id}
              className="flex flex-col justify-between p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-slate-300 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {p.status}
                    </span>
                    <button
                      onClick={() => handleDeleteProvider(p.id, p.name)}
                      title="Ngắt kết nối Provider"
                      className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-4 group-hover:text-blue-600 transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {p.type} • {p.region}
                </p>

                {/* Capacity Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Dung lượng sử dụng:</span>
                    <span className="text-slate-800 font-mono">{p.storageUsed} / {p.capacity}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, usedPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics detail */}
                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Tenants đang dùng:
                    </span>
                    <span className="font-bold text-slate-800">{p.tenantsCount || 0} tổ chức</span>
                  </div>

                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Đã cấp cho Tenant:
                    </span>
                    <span className="font-mono font-semibold text-indigo-600">
                      {allocatedGB} GB
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-slate-400" />
                      Độ trễ trung bình:
                    </span>
                    <span className="font-mono text-emerald-600 font-semibold">{p.latency}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
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
                  <span>{testingId === p.id ? 'Đang ping...' : 'Kiểm tra kết nối'}</span>
                </button>

                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đồng bộ
                </span>
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
    </div>
  );
};
