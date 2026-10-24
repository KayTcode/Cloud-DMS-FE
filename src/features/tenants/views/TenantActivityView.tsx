import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Download,
  ArrowLeft,
  UploadCloud,
  FileDown,
  HardDrive,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  Filter,
} from 'lucide-react';
import { useTenantContext } from '@/context/TenantContext';
import { getTenantAuditLogs, TenantAuditLogDto } from '../api';
import { TenantEvent } from '@/features/tenants/types';

interface TenantActivityViewProps {
  events?: TenantEvent[];
  onBackToOverview: () => void;
}

export const TenantActivityView: React.FC<TenantActivityViewProps> = ({
  onBackToOverview,
}) => {
  const { tenant, departments } = useTenantContext();
  const tenantId = tenant?.id || '';

  const [filterQuery, setFilterQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [pageNumber, setPageNumber] = useState<number>(1);
  const pageSize = 20;

  const [logs, setLogs] = useState<TenantAuditLogDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filterQuery);
      setPageNumber(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [filterQuery]);

  // Load audit logs from real backend API for this Tenant
  const fetchLogs = useCallback(async () => {
    if (!tenantId) {
      setError('Không xác định được mã Tenant để tải nhật ký hoạt động.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getTenantAuditLogs(
        tenantId,
        pageNumber,
        pageSize,
        debouncedSearch,
        actionFilter === 'all' ? undefined : actionFilter,
        selectedDepartmentId === 'all' ? undefined : selectedDepartmentId
      );

      const items = res?.items ?? [];
      setLogs(items);
      setTotalCount(res?.totalCount ?? items.length);
      setTotalPages(res?.totalPages ?? Math.max(1, Math.ceil((res?.totalCount ?? items.length) / pageSize)));
    } catch (err: any) {
      console.error('Failed to load tenant logs:', err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Không thể tải dữ liệu nhật ký hoạt động của doanh nghiệp. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tenantId, pageNumber, pageSize, debouncedSearch, actionFilter, selectedDepartmentId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleActionFilterChange = (act: string) => {
    setActionFilter(act);
    setPageNumber(1);
  };

  const handleDepartmentFilterChange = (deptId: string) => {
    setSelectedDepartmentId(deptId);
    setPageNumber(1);
  };

  const handleExportJson = () => {
    if (logs.length === 0) return;
    const exportData = {
      tenant: tenant.name,
      tenantId: tenantId,
      departmentFilter: selectedDepartmentId === 'all' ? 'Tất cả phòng ban' : selectedDepartmentId,
      exportedAt: new Date().toISOString(),
      totalRecords: logs.length,
      logs: logs,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nhat-ky-doanh-nghiep-${tenant.name || 'tenant'}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Chưa xác định';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return timestamp;
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  const getActionBadge = (actionStr: string) => {
    const act = (actionStr || '').toLowerCase();
    if (act.includes('upload')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <UploadCloud className="w-3 h-3 text-blue-600" />
          <span>Tải lên file</span>
        </span>
      );
    }
    if (act.includes('download') || act.includes('read') || act.includes('view')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FileDown className="w-3 h-3 text-emerald-600" />
          <span>Tải / Xem file</span>
        </span>
      );
    }
    if (act.includes('quota')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <HardDrive className="w-3 h-3 text-purple-600" />
          <span>Đổi Quota</span>
        </span>
      );
    }
    if (act.includes('employee') || act.includes('member') || act.includes('user')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
          <Users className="w-3 h-3 text-teal-600" />
          <span>Nhân sự</span>
        </span>
      );
    }
    if (act.includes('delete') || act.includes('purge') || act.includes('bin')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span>Xóa tệp tin</span>
        </span>
      );
    }
    if (act.includes('restore') || act.includes('lifecycle')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span>Khôi phục tệp</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <span>{actionStr || 'Hệ thống'}</span>
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const st = (status || '').toUpperCase();
    if (st === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
          <AlertCircle className="w-3 h-3" />
          <span>Thất bại</span>
        </span>
      );
    }
    if (st === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Clock className="w-3 h-3" />
          <span>Cảnh báo</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        <span>Thành công</span>
      </span>
    );
  };

  // Quick stats derived from loaded list & total
  const uploadCount = logs.filter((l) => (l.action || '').toLowerCase().includes('upload')).length;
  const adminOpsCount = logs.filter((l) => {
    const act = (l.action || '').toLowerCase();
    return act.includes('quota') || act.includes('employee') || act.includes('member');
  }).length;
  const distinctDeptsCount = new Set(logs.map((l) => l.departmentName).filter(Boolean)).size;

  return (
    <div className="space-y-6 mt-4">
      {/* 1. HEADER & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToOverview}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 rounded-lg shadow-2xs transition-all cursor-pointer mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Quay lại Tổng quan Doanh nghiệp</span>
          </button>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Nhật Ký Hoạt Động Doanh Nghiệp ({tenant?.name || 'Tenant'})</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              Toàn tổ chức
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi và kiểm toán toàn bộ lịch sử thao tác của các phòng ban và thành viên: Tải lên, tải xuống, thay đổi hạn ngạch và tác vụ hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Tải lại dữ liệu mới nhất"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất Nhật ký (JSON)</span>
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Tổng số thao tác
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {totalCount} bản ghi
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Tải lên tài liệu
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {uploadCount} lượt
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Hạn mức & Nhân sự
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {adminOpsCount} lượt
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Phòng ban phát sinh
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {distinctDeptsCount || departments.length} phòng ban
            </div>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-700 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchLogs()}
            className="px-3 py-1 bg-white border border-rose-300 font-semibold rounded-md hover:bg-rose-100 transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 3. BẢNG NHẬT KÝ THAO TÁC */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Search & Filters Bar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Box */}
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Tìm nhân viên, email, chi tiết thao tác..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Department Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Phòng ban:</span>
              </span>
              <select
                value={selectedDepartmentId}
                onChange={(e) => handleDepartmentFilterChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Tất cả phòng ban</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'Tất cả hành vi' },
              { id: 'upload', label: 'Tải lên' },
              { id: 'download', label: 'Tải / Đọc file' },
              { id: 'delete', label: 'Xóa tệp tin' },
              { id: 'quota', label: 'Hạn ngạch' },
              { id: 'employee', label: 'Nhân sự' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => handleActionFilterChange(f.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  actionFilter === f.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 bg-slate-50/30">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Nhân sự thực hiện</th>
                <th className="py-3 px-4">Phòng ban</th>
                <th className="py-3 px-4">Hành vi</th>
                <th className="py-3 px-5">Chi tiết thao tác</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 font-mono text-[11px]">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-7 h-7 mx-auto text-blue-500 mb-2 animate-spin" />
                    <p className="font-semibold text-slate-700 text-xs">Đang tải nhật ký hoạt động doanh nghiệp...</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Vui lòng chờ trong giây lát</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-xs">Không tìm thấy bản ghi hoạt động nào</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Chưa có thao tác nào được ghi nhận hoặc hãy thử chọn bộ lọc phòng ban / hành vi khác
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 text-center font-mono text-slate-400 text-xs">
                      {(pageNumber - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">{log.actor}</span>
                        {log.actorEmail && (
                          <span className="text-[11px] text-slate-400 block font-mono">{log.actorEmail}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.departmentName ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span>{log.departmentName}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Toàn tổ chức</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 max-w-md leading-relaxed break-words">
                      {log.details || '—'}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200/80 bg-slate-50/40 flex items-center justify-between text-xs text-slate-600">
            <div>
              Trang <span className="font-semibold text-slate-900">{pageNumber}</span> trên{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span> (Tổng {totalCount} bản ghi)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-md font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
              <button
                onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                disabled={pageNumber >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-md font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
