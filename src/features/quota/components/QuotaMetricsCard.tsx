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
          className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all cursor-pointer"
          title="Tải lại số liệu"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
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
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl">
              <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Chờ duyệt
              </span>
              <span className="text-2xl font-extrabold text-amber-900 block mt-1.5">
                {metrics.pendingRequests}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã duyệt
              </span>
              <span className="text-2xl font-extrabold text-emerald-900 block mt-1.5">
                {metrics.approvedRequests + metrics.partiallyApprovedRequests}
              </span>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200/60 rounded-2xl">
              <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" /> Đã từ chối
              </span>
              <span className="text-2xl font-extrabold text-rose-900 block mt-1.5">
                {metrics.rejectedRequests}
              </span>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl">
              <span className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Thời gian duyệt
              </span>
              <span className="text-2xl font-extrabold text-blue-900 block mt-1.5">
                {metrics.averageDecisionTimeHours > 0 ? `${metrics.averageDecisionTimeHours}h` : '—'}
              </span>
            </div>
          </div>

          {/* Cảnh báo lỗi tạo thư mục nếu có */}
          {metrics.failedFolderProvisioningCount > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <FolderX className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Có <strong>{metrics.failedFolderProvisioningCount}</strong> tài khoản gặp sự cố khởi tạo thư mục lưu trữ (Hệ thống đang tự động thử lại ngầm).
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
