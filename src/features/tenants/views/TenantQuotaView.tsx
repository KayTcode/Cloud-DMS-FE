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
  QuotaHistoryTable,
  RequestQuotaModal,
} from '@/features/quota';

interface TenantQuotaViewProps {
  tenant: TenantInfo;
  onBackToOverview: () => void;
}

export const TenantQuotaView: React.FC<TenantQuotaViewProps> = ({
  tenant,
  onBackToOverview,
}) => {
  const { addToast, refreshTenantData } = useTenantContext();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [topUpBytes, setTopUpBytes] = useState<number | undefined>(undefined);
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'history'>('pending');

  const formatBytesToGB = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 0;
    return Math.round((bytes / 1024 ** 3) * 10) / 10;
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
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
            title="Quay lại Tổng quan"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Quản lý Hạn mức Quota & Phê duyệt
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Tenant Approver
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Phê duyệt các yêu cầu tăng dung lượng từ Trưởng phòng ban hoặc gửi yêu cầu xin thêm hạn ngạch cho Doanh nghiệp {tenant.name}
            </p>
          </div>
        </div>

        {/* Nút gửi yêu cầu tăng Quota Tenant lên SystemAdmin */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setTopUpBytes(undefined); setIsRequestModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
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
        ) : (
          <QuotaHistoryTable />
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
