import React, { useState } from 'react';
import {
  ArrowLeft,
  Database,
  HardDrive,
  PlusCircle,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { TenantInfo } from '../types';
import { useTenantContext } from '@/context/TenantContext';
import {
  PendingQuotaTable,
  RequestQuotaModal,
} from '@/features/quota';
import { DepartmentQuotaHistoryTable, DepartmentExpiringFilesTable } from '../components';

interface TenantQuotaViewProps {
  tenant: TenantInfo;
  onBackToOverview: () => void;
}

export const TenantQuotaView: React.FC<TenantQuotaViewProps> = ({
  tenant,
  onBackToOverview,
}) => {
  const { addToast, refreshTenantData, departments } = useTenantContext();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [topUpBytes, setTopUpBytes] = useState<number | undefined>(undefined);
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'history' | 'expiring'>('pending');

  const formatBytesToGB = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 0;
    return Math.round((bytes / 1024 ** 3) * 10) / 10;
  };

  const formatBytesDetail = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const gb = bytes / 1024 ** 3;
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / 1024 ** 2;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const totalQuotaGB = formatBytesToGB(tenant.storageQuotaBytes) || (tenant.diskAllocatedTB ? tenant.diskAllocatedTB * 1024 : 100);
  const usedStorageGB = formatBytesToGB(tenant.storageUsedBytes) || (tenant.diskUsedTB ? tenant.diskUsedTB * 1024 : 0);
  const allocatedToDeptsGB = formatBytesToGB(tenant.allocatedToDepartmentsBytes) || 0;
  const availablePoolGB = formatBytesToGB(tenant.availableBytes) || Math.max(0, totalQuotaGB - allocatedToDeptsGB);

  const percentUsed = totalQuotaGB > 0 ? Math.min(100, Math.round((usedStorageGB / totalQuotaGB) * 100)) : 0;
  const percentAllocated = totalQuotaGB > 0 ? Math.min(100, Math.round((allocatedToDeptsGB / totalQuotaGB) * 100)) : 0;

  const handleRequestCreated = () => {
    setIsRequestModalOpen(false);
    addToast('success', 'Đã gửi yêu cầu tăng hạn mức lưu trữ Tenant lên System Admin!');
    refreshTenantData(tenant.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToOverview}
            className="w-9 h-9 rounded-full border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Quay lại Tổng quan"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Quản lý Hạn mức Quota & Phê duyệt
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                Tenant Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Phê duyệt các yêu cầu tăng dung lượng từ Trưởng phòng ban hoặc gửi yêu cầu xin thêm hạn ngạch cho Doanh nghiệp {tenant.name}
            </p>
          </div>
        </div>

        {/* Nút gửi yêu cầu tăng Quota Tenant lên SystemAdmin */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setTopUpBytes(undefined); setIsRequestModalOpen(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Xin thêm hạn ngạch Doanh nghiệp</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng hạn mức Tenant */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Tổng hạn mức Doanh nghiệp</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {totalQuotaGB}{' '}
            <span className="text-xs font-semibold text-slate-500">GB</span>
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Gói {tenant.plan || 'Doanh nghiệp'}</span>
          </div>
        </div>

        {/* Card 2: Đã cấp cho các Phòng ban */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Đã phân phối các phòng</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {allocatedToDeptsGB}{' '}
            <span className="text-xs font-semibold text-slate-500">GB</span>
            <span className="text-xs font-semibold text-slate-400 ml-2">({percentAllocated}%)</span>
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${percentAllocated}%` }}
            />
          </div>
        </div>

        {/* Card 3: Dung lượng thực tế đã dùng */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Thực tế đã tải lên</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {usedStorageGB}{' '}
            <span className="text-xs font-semibold text-slate-500">GB</span>
            <span className="text-xs font-semibold text-slate-400 ml-2">({percentUsed}%)</span>
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                percentUsed > 85 ? 'bg-rose-500' : percentUsed > 60 ? 'bg-amber-500' : 'bg-purple-600'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>

        {/* Card 4: Quota Pool còn trống */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Pool còn khả dụng</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">
            {availablePoolGB}{' '}
            <span className="text-xs font-semibold text-slate-500">GB</span>
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Có thể cấp thêm cho các phòng</span>
          </div>
        </div>
      </div>

      {/* 2.5 Multi-Provider Storage Drives Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Nguồn Lưu Trữ Doanh Nghiệp (Drive Storage Pools)
                </h3>
                {tenant.allocations && tenant.allocations.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    {tenant.allocations.length} Drive
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Chi tiết hạn mức theo từng tài khoản Cloud Storage do System Admin cấp phát cho Doanh nghiệp
              </p>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Điều phối tự động thông minh (FIFO)</span>
          </div>
        </div>

        {(!tenant.allocations || tenant.allocations.length === 0) ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Tenant hiện đang sử dụng Cloud Provider chính: <strong>{tenant.storageProviderName || 'Google Drive Primary'}</strong> (Tổng {totalQuotaGB} GB).
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {tenant.allocations.map((alloc) => {
              const freeBytes = Math.max(0, alloc.grantedBytes - alloc.allocatedToChildrenBytes);
              const pAlloc = alloc.grantedBytes > 0 ? Math.min(100, Math.round((alloc.allocatedToChildrenBytes / alloc.grantedBytes) * 100)) : 0;
              const isGoogle = (alloc.storageProviderName || '').toLowerCase().includes('google') || alloc.storageProviderType === 1;
              const isOneDrive = (alloc.storageProviderName || '').toLowerCase().includes('onedrive') || alloc.storageProviderType === 2;

              return (
                <div
                  key={alloc.allocationId}
                  className="p-4 rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 hover:shadow-xs hover:border-blue-300 transition-all space-y-3"
                >
                  {/* Top info */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isGoogle
                          ? 'bg-amber-50 text-amber-600 border border-amber-200/60'
                          : isOneDrive
                          ? 'bg-sky-50 text-sky-600 border border-sky-200/60'
                          : 'bg-indigo-50 text-indigo-600 border border-indigo-200/60'
                      }`}>
                        {isGoogle ? <HardDrive className="w-4.5 h-4.5" /> : isOneDrive ? <Database className="w-4.5 h-4.5" /> : <Layers className="w-4.5 h-4.5" />}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-xs text-slate-800 block truncate" title={alloc.storageProviderName}>
                          {alloc.storageProviderName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {isGoogle ? 'Google Drive' : isOneDrive ? 'OneDrive' : 'Cloud Storage'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-extrabold text-slate-900 font-mono">
                        {formatBytesDetail(alloc.grantedBytes)}
                      </span>
                    </div>
                  </div>

                  {/* Dual metric progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${pAlloc}%` }}
                        title={`Đã phân bổ cho phòng ban: ${pAlloc}%`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                      <span>Đã cấp PB: <strong className="text-slate-700">{pAlloc}%</strong></span>
                      <span className="text-emerald-600 font-semibold">Khả dụng: {formatBytesDetail(freeBytes)}</span>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                    <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Đã chia phòng ban:</span>
                      <strong className="text-slate-700 font-mono">{formatBytesDetail(alloc.allocatedToChildrenBytes)}</strong>
                    </div>
                    <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Tệp thực tế dùng:</span>
                      <strong className="text-slate-700 font-mono">{formatBytesDetail(alloc.usedBytes)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Sub Tabs & Content */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'pending'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Yêu cầu chờ phê duyệt</span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Lịch sử cấp phát Quota</span>
          </button>
          <button
            onClick={() => setActiveSubTab('expiring')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'expiring'
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Tệp sắp hết hạn các phòng</span>
          </button>
        </div>

        {activeSubTab === 'pending' ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info className="w-4 h-4 text-blue-600" />
                <span>
                  Tenant Admin phê duyệt yêu cầu từ Trưởng phòng hoặc nhân viên. Yêu cầu quá hạn 7 ngày sẽ hiển thị cờ cảnh báo.
                </span>
              </div>
            </div>
            <PendingQuotaTable
              onRequestTopUp={(bytes) => { setTopUpBytes(bytes); setIsRequestModalOpen(true); }}
              onDecisionSuccess={() => {
                addToast('success', 'Đã ghi nhận quyết định phê duyệt thành công.');
                refreshTenantData(tenant.id);
              }}
            />
          </div>
        ) : activeSubTab === 'history' ? (
          <DepartmentQuotaHistoryTable tenantId={tenant.id} onShowToast={(msg, type) => addToast(type === 'info' ? 'success' : type, msg)} />
        ) : (
          <DepartmentExpiringFilesTable
            tenantId={tenant.id}
            departments={departments}
            onShowToast={(msg, type) => addToast(type === 'info' ? 'success' : type, msg)}
            onQuotaChanged={() => refreshTenantData(tenant.id)}
          />
        )}
      </div>

      {/* Request Quota Modal */}
      <RequestQuotaModal
        isOpen={isRequestModalOpen}
        initialRequestedBytes={topUpBytes}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={handleRequestCreated}
      />
    </div>
  );
};
