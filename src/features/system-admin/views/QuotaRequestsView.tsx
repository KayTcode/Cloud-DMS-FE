import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  History,
  Hourglass,
} from 'lucide-react';
import { useTenantContext } from '@/context/TenantContext';
import { 
  PendingQuotaTable, 
  QuotaHistoryTable, 
  quotaApi,
  QuotaFeatureMetricsDto 
} from '@/features/quota';

export const QuotaRequestsView: React.FC = () => {
  const { addToast } = useTenantContext();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [metrics, setMetrics] = useState<QuotaFeatureMetricsDto | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoadingMetrics(true);
      const data = await quotaApi.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.error('Lỗi nạp số liệu thống kê yêu cầu Quota:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleToast = (message: string, type: 'success' | 'error' | 'info') => {
    addToast(type === 'error' ? 'error' : type === 'info' ? 'info' : 'success', message);
    if (type === 'success') {
      fetchMetrics();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Phê Duyệt Hạn Mức Lưu Trữ (Quota)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  System Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tiếp nhận, kiểm tra và phê duyệt đề xuất cấp phát dung lượng lưu trữ từ các Doanh nghiệp
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchMetrics}
            disabled={isLoadingMetrics}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới số liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMetrics ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới chỉ số</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Metrics Cards (Google One Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chờ duyệt */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-amber-900">Đang chờ phê duyệt</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
              {metrics ? metrics.pendingRequests : pendingCount}
            </span>
            <span className="text-xs text-slate-400">yêu cầu</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1 font-medium">
            <Hourglass className="w-3 h-3" />
            <span>Cần quyết định cấp thêm</span>
          </p>
        </div>

        {/* Card 2: Đã phê duyệt */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Đã phê duyệt</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
              {metrics ? metrics.approvedRequests + metrics.partiallyApprovedRequests : 0}
            </span>
            <span className="text-xs text-slate-400">lượt</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {metrics ? `${metrics.approvedRequests} đủ · ${metrics.partiallyApprovedRequests} một phần` : '0 lượt'}
          </p>
        </div>

        {/* Card 3: Đã từ chối / Hủy */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Đã từ chối / Hủy</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-700 font-mono">
              {metrics ? metrics.rejectedRequests + metrics.cancelledRequests : 0}
            </span>
            <span className="text-xs text-slate-400">yêu cầu</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {metrics ? `${metrics.rejectedRequests} từ chối · ${metrics.cancelledRequests} hủy` : '0 yêu cầu'}
          </p>
        </div>

        {/* Card 4: Thời gian xử lý trung bình */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Thời gian phản hồi</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono">
              {metrics ? (Math.round(metrics.averageDecisionTimeHours * 10) / 10) : 0}
            </span>
            <span className="text-xs text-slate-400">giờ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Tổng tiếp nhận: <strong className="text-slate-800">{metrics?.totalRequests ?? 0}</strong> yêu cầu
          </p>
        </div>
      </div>

      {/* 3. Sub-tabs Navigation (Material 3 Tabs) */}
      <div className="border-b border-slate-200/80">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Yêu cầu chờ duyệt</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {pendingCount}
            </span>
            {activeTab === 'pending' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch sử & Biến động Quota toàn sàn</span>
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* 4. Tab Content */}
      <div>
        {activeTab === 'pending' ? (
          <PendingQuotaTable
            onShowToast={handleToast}
            onCountChange={setPendingCount}
          />
        ) : (
          <QuotaHistoryTable
            onShowToast={handleToast}
          />
        )}
      </div>
    </div>
  );
};
