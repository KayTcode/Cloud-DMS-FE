import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Inbox,
  Clock,
  Layers,
} from 'lucide-react';
import { getTenantAuditLogs, TenantAuditLogDto } from '../api/tenantQueries';

interface DepartmentQuotaHistoryTableProps {
  tenantId: string;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const DepartmentQuotaHistoryTable: React.FC<DepartmentQuotaHistoryTableProps> = ({
  tenantId,
  onShowToast,
}) => {
  const [logs, setLogs] = useState<TenantAuditLogDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDepartmentQuotaLogs = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      // Lọc theo action "quota"
      const res = await getTenantAuditLogs(
        tenantId,
        page,
        pageSize,
        searchTerm || undefined,
        'quota'
      );

      const items = res?.items ?? [];
      const deptQuotaItems = items.filter(
        (log) =>
          log.action.toLowerCase().includes('department') ||
          log.action.toLowerCase().includes('allocatedepartmentquota') ||
          log.details.toLowerCase().includes('phòng ban')
      );

      setLogs(deptQuotaItems.length > 0 ? deptQuotaItems : items);
      setTotalCount(res?.totalCount ?? items.length);
      setTotalPages(res?.totalPages ?? Math.max(1, Math.ceil((res?.totalCount ?? items.length) / pageSize)));
      setHasPrevious(res?.hasPreviousPage ?? page > 1);
      setHasNext(res?.hasNextPage ?? page < (res?.totalPages ?? 1));
    } catch (err: any) {
      console.error('Lỗi nạp lịch sử quota phòng ban:', err);
      onShowToast?.('Không thể tải lịch sử hạn mức phòng ban.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, page, pageSize, searchTerm, onShowToast]);

  useEffect(() => {
    fetchDepartmentQuotaLogs();
  }, [fetchDepartmentQuotaLogs]);

  const extractDepartmentName = (log: TenantAuditLogDto) => {
    if (log.departmentName) return log.departmentName;
    const match = log.details?.match(/phòng ban ['"]([^'"]+)['"]/i);
    if (match && match[1]) return match[1];
    return 'Phòng ban';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Lịch sử cấp phát Quota Phòng ban</h3>
            <p className="text-xs text-slate-500">
              Nhật ký kiểm toán biến động hạn mức lưu trữ các phòng ban ({totalCount} bản ghi)
            </p>
          </div>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo phòng ban, ghi chú..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-0 text-slate-700 focus:outline-none text-xs w-48"
            />
          </div>

          <button
            onClick={fetchDepartmentQuotaLogs}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
          <span>Đang tải nhật ký cấp phát quota phòng ban...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700">Chưa có bản ghi cấp phát nào</h4>
          <p className="text-xs text-slate-400 mt-1">
            Chưa có thao tác phân bổ hoặc điều chỉnh hạn mức phòng ban nào được thực hiện.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Phòng ban</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4">Thao tác</th>
                <th className="py-3 px-4">Nội dung thay đổi</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((row) => {
                const deptName = extractDepartmentName(row);
                const formattedTime = new Date(row.timestamp).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedTime}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {deptName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">{deptName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">
                        {row.actor || 'Quản trị viên'}
                      </span>
                      {row.actorEmail && (
                        <span className="text-slate-400 text-[11px] block">{row.actorEmail}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Layers className="w-3 h-3 text-purple-600" />
                        Phân bổ Phòng ban
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium max-w-md">
                      {row.details || '—'}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Thành công
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && logs.length > 0 && totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Trang {page} / {totalPages} (Tổng {totalCount} bản ghi)
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrevious}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!hasNext}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

