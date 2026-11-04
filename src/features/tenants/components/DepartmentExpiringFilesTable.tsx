import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Clock,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowLeft,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import {
  getExpiringFilesApi,
  downloadTenantFileApi,
  permanentDeleteFileApi,
  ExpiringFilesSummaryDto,
  ExpiringFileItemDto,
} from '../api/fileApi';

export interface DepartmentExpiringFilesTableProps {
  tenantId: string;
  departmentId?: string; // Khóa theo 1 phòng ban cụ thể (khi ở trang chi tiết phòng)
  departmentName?: string;
  departments?: { id: string; name: string; lead?: string }[]; // Danh sách phòng ban
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onQuotaChanged?: () => void;
}

export const DepartmentExpiringFilesTable: React.FC<DepartmentExpiringFilesTableProps> = ({
  tenantId,
  departmentId: lockedDepartmentId,
  departmentName: lockedDepartmentName,
  departments = [],
  onShowToast,
  onQuotaChanged,
}) => {
  const onShowToastRef = useRef(onShowToast);
  useEffect(() => {
    onShowToastRef.current = onShowToast;
  });

  // Khi có lockedDepartmentId -> luôn ở chế độ xem chi tiết phòng ban đó
  // Khi không có -> mặc định ở chế độ Master (danh sách phòng ban, selectedDeptId = null)
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(lockedDepartmentId || null);
  const [daysThreshold, setDaysThreshold] = useState<number>(7);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const pageSize = 15;

  // Dữ liệu tổng hợp toàn Tenant (dùng để tính số tệp sắp hết hạn theo từng phòng ban ở màn hình Master)
  const [allExpiringSummary, setAllExpiringSummary] = useState<ExpiringFilesSummaryDto | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState<boolean>(false);

  // Dữ liệu chi tiết của phòng ban đang chọn (hoặc toàn bộ)
  const [detailSummary, setDetailSummary] = useState<ExpiringFilesSummaryDto | null>(null);
  const [files, setFiles] = useState<ExpiringFileItemDto[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<ExpiringFileItemDto | null>(null);

  // Đồng bộ lockedDepartmentId nếu thay đổi từ component cha
  useEffect(() => {
    if (lockedDepartmentId) {
      setSelectedDeptId(lockedDepartmentId);
    }
  }, [lockedDepartmentId]);

  // 1. Tải dữ liệu tổng hợp toàn Tenant để thống kê theo từng phòng ban ở màn hình Master
  const fetchAllSummary = useCallback(async () => {
    if (!tenantId || lockedDepartmentId) return;
    try {
      setIsLoadingAll(true);
      const res = await getExpiringFilesApi(daysThreshold, 1, 200, undefined);
      setAllExpiringSummary(res);
    } catch (err: any) {
      console.error('Lỗi nạp tổng hợp tệp sắp hết hạn:', err);
    } finally {
      setIsLoadingAll(false);
    }
  }, [tenantId, daysThreshold, lockedDepartmentId]);

  useEffect(() => {
    fetchAllSummary();
  }, [fetchAllSummary]);

  // Map số lượng tệp và dung lượng sắp hết hạn theo từng phòng ban
  const deptStats = useMemo(() => {
    const stats: Record<string, { count: number; totalSizeBytes: number }> = {};
    if (!allExpiringSummary?.items) return stats;

    for (const item of allExpiringSummary.items) {
      const deptId = item.departmentId || 'unassigned';
      if (!stats[deptId]) {
        stats[deptId] = { count: 0, totalSizeBytes: 0 };
      }
      stats[deptId].count += 1;
      stats[deptId].totalSizeBytes += item.sizeBytes || 0;
    }
    return stats;
  }, [allExpiringSummary]);

  // 2. Tải danh sách tệp chi tiết khi đã chọn 1 phòng ban (hoặc khi lockedDepartmentId)
  const fetchDetailFiles = useCallback(async () => {
    if (!tenantId) return;
    if (!lockedDepartmentId && selectedDeptId === null) return;

    try {
      setIsLoadingDetail(true);
      setError(null);
      const targetDept = lockedDepartmentId || (selectedDeptId !== 'all' ? selectedDeptId! : undefined);
      const res = await getExpiringFilesApi(daysThreshold, pageNumber, pageSize, targetDept);
      setDetailSummary(res);
      setFiles(res?.items ?? []);
    } catch (err: any) {
      console.error('Lỗi khi nạp tệp sắp hết hạn của phòng ban:', err);
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Không thể tải danh sách tệp tin sắp hết hạn.';
      setError(msg);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [tenantId, lockedDepartmentId, selectedDeptId, daysThreshold, pageNumber, pageSize]);

  useEffect(() => {
    fetchDetailFiles();
  }, [fetchDetailFiles]);

  const handleDownload = async (file: ExpiringFileItemDto) => {
    try {
      onShowToastRef.current?.(`Đang tải về bản sao lưu: ${file.name}...`, 'info');
      await downloadTenantFileApi(file.id, file.name, file.archiveKind);
      onShowToastRef.current?.(`Đã tải về thành công tệp ${file.name}`, 'success');
    } catch (err) {
      onShowToastRef.current?.('Lỗi khi tải tệp tin.', 'error');
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!confirmDeleteFile) return;
    try {
      setDeletingFileId(confirmDeleteFile.id);
      await permanentDeleteFileApi(confirmDeleteFile.id);
      onShowToastRef.current?.(`Đã xóa vĩnh viễn tệp '${confirmDeleteFile.name}' và hoàn trả Quota lưu trữ.`, 'success');
      setConfirmDeleteFile(null);
      fetchDetailFiles();
      fetchAllSummary();
      onQuotaChanged?.();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Không thể xóa tệp tin.';
      onShowToastRef.current?.(msg, 'error');
    } finally {
      setDeletingFileId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getDaysBadge = (days: number) => {
    if (days <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
          Đã quá hạn
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
          Còn {days} ngày
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Còn {days} ngày
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        Còn {days} ngày
      </span>
    );
  };

  // Xác định tên phòng ban đang chọn để hiển thị
  const currentDeptName = useMemo(() => {
    if (lockedDepartmentName) return lockedDepartmentName;
    if (selectedDeptId === 'all') return 'Toàn bộ Tổ chức (Tất cả phòng ban)';
    const found = departments.find((d) => d.id === selectedDeptId);
    return found ? found.name : 'Phòng ban';
  }, [lockedDepartmentName, selectedDeptId, departments]);

  const totalPages = detailSummary ? Math.max(1, Math.ceil(detailSummary.totalCount / pageSize)) : 1;

  // =========================================================================================
  // VIEW 1: MASTER VIEW — DANH SÁCH CÁC PHÒNG BAN (Khi chưa chọn phòng ban cụ thể)
  // =========================================================================================
  if (!lockedDepartmentId && selectedDeptId === null) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-5 p-5 animate-in fade-in duration-200">
        {/* Header Master */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/80 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>Rà soát Tệp tin sắp hết hạn theo Phòng ban</span>
                {allExpiringSummary && allExpiringSummary.totalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold font-mono">
                    {allExpiringSummary.totalCount} tệp sắp đến hạn
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn một phòng ban bên dưới để xem chi tiết danh sách tệp tin sắp/đã hết hạn lưu trữ của phòng đó.
              </p>
            </div>
          </div>

          {/* Time threshold selector & Refresh */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Hạn trong:</span>
              {[3, 7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDaysThreshold(d)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${daysThreshold === d
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchAllSummary()}
              disabled={isLoadingAll}
              className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Tải lại số liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAll ? 'animate-spin text-rose-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Thẻ tổng hợp Toàn bộ Tenant */}
        <div
          onClick={() => {
            setSelectedDeptId('all');
            setPageNumber(1);
          }}
          className="p-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200/80 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                Xem toàn bộ tệp tin trong Doanh nghiệp (Tất cả phòng ban)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng hợp tất cả {allExpiringSummary?.totalCount ?? 0} tệp tin với tổng dung lượng{' '}
                {allExpiringSummary?.formattedTotalSize ?? '0 B'} sắp hết hạn trong toàn tổ chức.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform self-end sm:self-auto">
            <span>Xem tất cả</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Grid danh sách các phòng ban */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách các Phòng ban ({departments.length})
            </span>
            <span className="text-xs text-slate-400">Bấm vào phòng ban để xem chi tiết tệp</span>
          </div>

          {departments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Chưa có phòng ban nào trong doanh nghiệp.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => {
                const stat = deptStats[dept.id] || { count: 0, totalSizeBytes: 0 };
                const hasExpiring = stat.count > 0;

                return (
                  <div
                    key={dept.id}
                    onClick={() => {
                      setSelectedDeptId(dept.id);
                      setPageNumber(1);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group hover:shadow-xs ${hasExpiring
                        ? 'bg-rose-50/20 border-rose-200/90 hover:border-rose-400'
                        : 'bg-white border-slate-200/90 hover:border-slate-300'
                      }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasExpiring ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                              }`}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs truncate max-w-[170px]" title={dept.name}>
                            {dept.name}
                          </h4>
                        </div>

                        {hasExpiring ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{stat.count} tệp</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>An toàn</span>
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate">
                        Trưởng phòng: <span className="font-medium text-slate-700">{dept.lead || 'Chưa gán'}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        {hasExpiring ? `Dung lượng: ${formatBytes(stat.totalSizeBytes)}` : '0 tệp sắp hết hạn'}
                      </span>
                      <span className="font-bold text-xs text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        <span>Chi tiết</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================================
  // VIEW 2: DETAIL VIEW — CHI TIẾT TỆP TIN SẮP HẾT HẠN CỦA PHÒNG BAN ĐÃ CHỌN
  // =========================================================================================
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/40">
        <div className="flex items-center gap-3">
          {/* Nút quay lại danh sách phòng ban (chỉ hiện khi không bị khóa cứng) */}
          {!lockedDepartmentId && (
            <button
              onClick={() => setSelectedDeptId(null)}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Quay lại danh sách các phòng ban"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm">
                Tệp tin sắp hết hạn — {currentDeptName}
              </h3>
              {detailSummary && detailSummary.totalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold font-mono">
                  {detailSummary.totalCount} tệp
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Rà soát các tệp tin sắp hoặc đã hết hạn của phòng ban này để sao lưu hoặc xóa giải phóng Quota.
            </p>
          </div>
        </div>

        {/* Bộ lọc phòng ban & thời gian */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Dropdown chuyển đổi nhanh phòng ban khác */}
          {!lockedDepartmentId && departments.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDeptId || 'all'}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value === 'all' ? 'all' : e.target.value);
                  setPageNumber(1);
                }}
                className="bg-transparent text-slate-700 font-semibold text-xs focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">Tất cả phòng ban</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bộ chọn ngưỡng ngày */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Hạn trong:</span>
            {[3, 7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDaysThreshold(d);
                  setPageNumber(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${daysThreshold === d
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                {d} ngày
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchDetailFiles()}
            disabled={isLoadingDetail}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDetail ? 'animate-spin text-rose-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Thống kê nhanh */}
      {detailSummary && detailSummary.totalCount > 0 && (
        <div className="px-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-rose-50/60 border border-rose-200/60 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-900">Tổng số tệp tin sắp hết hạn:</span>
            <span className="text-sm font-bold text-rose-700 font-mono">{detailSummary.totalCount} tệp</span>
          </div>
          <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">Dung lượng có thể giải phóng:</span>
            <span className="text-sm font-bold text-amber-700 font-mono">{detailSummary.formattedTotalSize}</span>
          </div>
        </div>
      )}

      {/* Bảng dữ liệu chi tiết */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12">STT</th>
              <th className="py-3 px-4">Tên tệp tin</th>
              {selectedDeptId === 'all' && <th className="py-3 px-4">Phòng ban</th>}
              <th className="py-3 px-4">Người tải lên</th>
              <th className="py-3 px-4">Dung lượng</th>
              <th className="py-3 px-4">Hạn lưu trữ</th>
              <th className="py-3 px-3 text-center">Còn lại</th>
              <th className="py-3 px-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingDetail ? (
              <tr>
                <td colSpan={selectedDeptId === 'all' ? 8 : 7} className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-rose-500" />
                  <p className="font-semibold text-slate-600 text-xs">Đang kiểm tra tệp tin của phòng ban...</p>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={selectedDeptId === 'all' ? 8 : 7} className="py-10 text-center text-rose-500">
                  <AlertTriangle className="w-7 h-7 mx-auto mb-2 text-rose-500" />
                  <p className="font-bold text-slate-800 text-xs">{error}</p>
                  <button
                    onClick={() => fetchDetailFiles()}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử lại</span>
                  </button>
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={selectedDeptId === 'all' ? 8 : 7} className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 stroke-[1.5]" />
                  <p className="font-bold text-slate-700 text-sm">Không có tệp tin nào sắp hết hạn!</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tất cả tệp tin trong {currentDeptName} đều đang trong thời hạn lưu trữ an toàn (hơn {daysThreshold} ngày nữa).
                  </p>
                </td>
              </tr>
            ) : (
              files.map((file, idx) => (
                <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs">
                    {(pageNumber - 1) * pageSize + idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 max-w-xs">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  {selectedDeptId === 'all' && (
                    <td className="py-3 px-4 whitespace-nowrap">
                      {file.departmentName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{file.departmentName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa gán</span>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-slate-700 font-medium">{file.ownerName || '—'}</span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 font-semibold">
                    {file.formattedSize}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                    {new Date(file.expiresAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {getDaysBadge(file.daysRemaining)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownload(file)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
                        title="Tải về sao lưu trước khi hết hạn"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span>Sao lưu</span>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteFile(file)}
                        disabled={deletingFileId === file.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                        title="Xóa vĩnh viễn và hoàn trả Quota"
                      >
                        <Trash2 className="w-3 h-3 text-rose-600" />
                        <span>Xóa Quota</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Trang <span className="font-semibold text-slate-800">{pageNumber}</span> trên{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span> (Tổng {detailSummary?.totalCount ?? 0} tệp)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1 || isLoadingDetail}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>
            <button
              onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              disabled={pageNumber >= totalPages || isLoadingDetail}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa vĩnh viễn */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Xác nhận xóa tệp tin hết hạn</h4>
                <p className="text-xs text-slate-500">Hành động này sẽ tiêu hủy tệp tin vật lý và giải phóng Quota ngay lập tức.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 font-mono">
              <div>
                <span className="text-slate-400">Tên tệp: </span>
                <span className="text-slate-800 font-bold">{confirmDeleteFile.name}</span>
              </div>
              <div>
                <span className="text-slate-400">Dung lượng hoàn trả: </span>
                <span className="text-rose-600 font-bold">{confirmDeleteFile.formattedSize}</span>
              </div>
              <div>
                <span className="text-slate-400">Phòng ban: </span>
                <span className="text-slate-700">{confirmDeleteFile.departmentName || currentDeptName}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteFile(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deletingFileId === confirmDeleteFile.id}
                onClick={handleConfirmPermanentDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {deletingFileId === confirmDeleteFile.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa vĩnh viễn & Giải phóng Quota</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
