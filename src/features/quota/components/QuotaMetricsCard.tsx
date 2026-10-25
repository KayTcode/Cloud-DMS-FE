import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderX,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { quotaApi } from '../api/quotaApi';
import { QuotaFeatureMetricsDto } from '../types/quota.types';

export const QuotaMetricsCard: React.FC = () => {
  const [metrics, setMetrics] = useState<QuotaFeatureMetricsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const data = await quotaApi.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Lỗi tải thống kê Quota:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Chỉ số Quota & Cấp phát dung lượng</h3>
            <p className="text-xs text-slate-400">Thống kê toàn sàn trên tất cả doanh nghiệp</p>
          </div>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={isLoading}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Tải lại số liệu"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400">
          <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
          <span>Đang nạp số liệu thống kê...</span>
        </div>
      ) : metrics ? (
        <div className="mt-4 space-y-4">
          {/* 4 Cards con */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
              <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" /> Chờ duyệt
              </span>
              <span className="text-xl font-bold text-amber-800 block mt-1">
                {metrics.pendingRequests}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã duyệt
              </span>
              <span className="text-xl font-bold text-emerald-800 block mt-1">
                {metrics.approvedRequests + metrics.partiallyApprovedRequests}
              </span>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl">
              <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" /> Đã từ chối
              </span>
              <span className="text-xl font-bold text-rose-800 block mt-1">
                {metrics.rejectedRequests}
              </span>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl">
              <span className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-blue-600" /> Thời gian duyệt
              </span>
              <span className="text-xl font-bold text-blue-800 block mt-1">
                {metrics.averageDecisionTimeHours > 0 ? `${metrics.averageDecisionTimeHours}h` : '—'}
              </span>
            </div>
          </div>

          {/* Cảnh báo lỗi tạo Folder nếu có */}
          {metrics.failedFolderProvisioningCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <FolderX className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Có <strong>{metrics.failedFolderProvisioningCount}</strong> tài khoản bị lỗi tạo Folder trên Cloud (Đang chờ job nền thử lại).
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-slate-400">Chưa có dữ liệu thống kê</div>
      )}
    </div>
  );
};
