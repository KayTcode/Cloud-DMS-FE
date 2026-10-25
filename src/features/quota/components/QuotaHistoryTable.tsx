import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  RefreshCw,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Inbox
} from 'lucide-react';
import { quotaApi } from '../api/quotaApi';
import { QuotaHistoryDto, QuotaHistoryEventType } from '../types/quota.types';

interface QuotaHistoryTableProps {
  accountId?: string;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const GB_IN_BYTES = 1024 * 1024 * 1024;

export const QuotaHistoryTable: React.FC<QuotaHistoryTableProps> = ({
  accountId,
  onShowToast,
}) => {
  const [items, setItems] = useState<QuotaHistoryDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await quotaApi.getHistory({
        accountId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize,
      });

      setItems(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setHasPrevious(res.hasPreviousPage);
      setHasNext(res.hasNextPage);
    } catch (err: any) {
      console.error('Lỗi nạp lịch sử quota:', err);
      onShowToast?.('Không thể tải lịch sử biến động dung lượng.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [accountId, fromDate, toDate, page, pageSize, onShowToast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getEventBadge = (eventType: QuotaHistoryEventType) => {
    switch (eventType) {
      case 'InitialGrant':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-3 h-3 text-purple-600" />
            Cấp ban đầu
          </span>
        );
      case 'RequestApproved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            Yêu cầu được duyệt
          </span>
        );
      case 'TemporaryExpired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <TrendingDown className="w-3 h-3 text-rose-600" />
            Hết hạn tạm thời
          </span>
        );
      case 'ManualAdjust':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Điều chỉnh trực tiếp
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Lịch sử thay đổi Quota</h3>
            <p className="text-xs text-slate-500">
              Nhật ký kiểm toán biến động dung lượng lưu trữ ({totalCount} bản ghi)
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[10px]">Từ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-0 text-slate-700 focus:outline-none text-xs"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[10px]">Đến:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-0 text-slate-700 focus:outline-none text-xs"
            />
          </div>

          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="p-1.5 text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Tải lại"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-10 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <span>Đang tải lịch sử...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700">Chưa có bản ghi lịch sử nào</h4>
          <p className="text-xs text-slate-400 mt-1">
            Chưa có biến động cấp phát hoặc thu hồi dung lượng trong khoảng thời gian này.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Tài khoản</th>
                <th className="py-3 px-4">Sự kiện</th>
                <th className="py-3 px-4">Trước</th>
                <th className="py-3 px-4">Sau</th>
                <th className="py-3 px-4">Biến động</th>
                <th className="py-3 px-4">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row) => {
                const oldGB = parseFloat((row.oldQuotaBytes / GB_IN_BYTES).toFixed(2));
                const newGB = parseFloat((row.newQuotaBytes / GB_IN_BYTES).toFixed(2));
                const deltaGB = parseFloat((row.deltaBytes / GB_IN_BYTES).toFixed(2));
                const isPositive = row.deltaBytes >= 0;

                const formattedTime = new Date(row.occurredAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formattedTime}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {row.accountName || 'Tài khoản'}
                      </span>
                      <span className="text-slate-400 text-[11px] block">
                        {row.accountEmail}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getEventBadge(row.eventType)}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {oldGB} GB
                    </td>

                    <td className="py-3 px-4 text-slate-900 font-bold">
                      {newGB} GB
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-bold inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs ${
                          isPositive
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-rose-700 bg-rose-50'
                        }`}
                      >
                        {isPositive ? `+${deltaGB}` : `${deltaGB}`} GB
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={row.note || ''}>
                      {row.note || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages} (Tổng {totalCount} bản ghi)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={!hasPrevious || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={!hasNext || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
