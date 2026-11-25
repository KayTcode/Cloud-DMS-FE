import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Loader2,
  X
} from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogsViewProps {
  logs: AuditLogEntry[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const formatTimestamp = (ts: string) => {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('sv-SE', { hour12: false }).replace('T', ' ');
  } catch {
    return ts;
  }
};

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  logs,
  isLoading = false,
  error = null,
  onRefresh,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'SUCCESS' | 'WARNING'>('All');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch =
        !filterQuery ||
        l.action.toLowerCase().includes(filterQuery.toLowerCase()) ||
        l.actor.toLowerCase().includes(filterQuery.toLowerCase()) ||
        l.details.toLowerCase().includes(filterQuery.toLowerCase()) ||
        l.ipAddress?.toLowerCase().includes(filterQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'SUCCESS' && l.status === 'SUCCESS') ||
        (statusFilter === 'WARNING' && l.status !== 'SUCCESS');

      return matchesSearch && matchesStatus;
    });
  }, [logs, filterQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedLogs = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleExportJson = () => {
    if (logs.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'SUCCESS') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Thành công
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
          Thất bại
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
        Cảnh báo
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Header (Google Drive Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Nhật Ký Kiểm Toán & Bảo Mật
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Truy vết toàn bộ lịch sử thao tác dữ liệu, đăng nhập quản trị và các sự kiện an toàn hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Làm mới dữ liệu từ máy chủ"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-full shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            disabled={logs.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-full shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất tệp nhật ký (JSON)</span>
          </button>
        </div>
      </div>

      {/* 2. Error Banner nếu có lỗi */}
      {error && (
        <div className="flex items-start justify-between gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Không thể tải dữ liệu nhật ký kiểm toán</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-full font-semibold transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Search Bar & Status Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => {
              setFilterQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo hành động, người thực hiện, địa chỉ IP..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">Trạng thái:</span>
          {(['All', 'SUCCESS', 'WARNING'] as const).map((s) => {
            const labels = {
              All: 'Tất cả',
              SUCCESS: 'Thành công',
              WARNING: 'Cảnh báo / Lỗi',
            };
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Main Audit Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 bg-slate-50/50">
                <th className="py-3 px-3 text-center w-12 font-semibold">STT</th>
                <th className="py-3 px-4 font-semibold">Thời gian</th>
                <th className="py-3 px-4 font-semibold">Hành động</th>
                <th className="py-3 px-4 font-semibold">Người thực hiện</th>
                <th className="py-3 px-4 font-semibold">Địa chỉ IP</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold">Chi tiết sự kiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-xs text-slate-500 font-medium">Đang tải nhật ký kiểm toán hệ thống...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-rose-500">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-rose-700">Tải dữ liệu thất bại</p>
                    <p className="text-xs mt-1 text-slate-500">{error}</p>
                    {onRefresh && (
                      <button
                        onClick={onRefresh}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-full font-medium transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử lại</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : pagedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">Không có nhật ký nào</p>
                    <p className="text-xs mt-1 text-slate-400">
                      {filterQuery || statusFilter !== 'All'
                        ? 'Không tìm thấy nhật ký phù hợp với bộ lọc hiện tại.'
                        : 'Hệ thống chưa ghi nhận sự kiện kiểm toán nào.'}
                    </p>
                  </td>
                </tr>
              ) : (
                pagedLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    title="Bấm để xem chi tiết đầy đủ của sự kiện này"
                  >
                    <td className="py-3.5 px-3 text-center font-mono text-slate-400 text-xs">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-blue-600 font-mono font-medium">
                      {log.actor}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {log.ipAddress}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(log.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-sm truncate">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Footer Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-t border-slate-200/80 text-xs text-slate-500 bg-white">
          <span>
            Hiển thị <strong>{pagedLogs.length}</strong> / <strong>{filtered.length}</strong> nhật ký
          </span>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Trang trước
            </button>
            <span className="px-2 text-slate-600">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>

      {/* 6. Modal Chi Tiết Nhật Ký (khi bấm vào 1 dòng) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Chi Tiết Sự Kiện Kiểm Toán</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Hành động:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedLog.action}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block mb-0.5">Người thực hiện:</span>
                  <span className="font-mono text-blue-600 font-semibold">{selectedLog.actor}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Địa chỉ IP:</span>
                  <span className="font-mono text-slate-800">{selectedLog.ipAddress}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Thời gian:</span>
                <span className="font-mono text-slate-700">{formatTimestamp(selectedLog.timestamp)}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Chi tiết nội dung:</span>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedLog.details}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
