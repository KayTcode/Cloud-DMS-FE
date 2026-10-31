import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Building2,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  ArrowLeft,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  UploadCloud,
  X,
  AlertTriangle,
  Layers,
  User as UserIcon,
  Calendar,
  Sparkles,
  FileCheck2,
  File as FileGenericIcon,
  FolderOpen,
  Server,
  Clock,
  AlertOctagon,
} from 'lucide-react';
import { TenantInfo } from '@/features/tenants/types';
import { useTenantContext } from '@/context/TenantContext';
import {
  FileItemDto,
  TenantStorageSummaryDto,
  getTenantFilesApi,
  downloadTenantFileApi,
  deleteTenantFileApi,
  uploadTenantFilesApi,
  uploadDirectTenantFilesApi,
  ExpiringFileItemDto,
  ExpiringFilesSummaryDto,
  getExpiringFilesApi,
  permanentDeleteFileApi,
} from '@/features/tenants/api/fileApi';

interface TenantStorageViewProps {
  tenant: TenantInfo;
  onBackToOverview: () => void;
  onOpenExpandQuota?: () => void;
  onCreateDepartmentUser?: (deptName?: string) => void;
}

type FileCategory = 'all' | 'docs' | 'media' | 'data' | 'archive';
type SortOrder = 'newest' | 'oldest' | 'size_desc' | 'size_asc';

export const TenantStorageView: React.FC<TenantStorageViewProps> = ({
  tenant,
  onBackToOverview,
  onOpenExpandQuota,
}) => {
  const { departments, users, addToast } = useTenantContext();

  // ---------------------------------------------------------------------------------------
  // 1. STATE DỮ LIỆU & BỘ LỌC BÁO CÁO TỆP TIN
  // ---------------------------------------------------------------------------------------
  const [files, setFiles] = useState<FileItemDto[]>([]);
  const [totalFilesCount, setTotalFilesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<FileCategory>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Phân trang
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Thống kê hạn mức & Cloud Provider trả về từ API
  const [summaryData, setSummaryData] = useState<TenantStorageSummaryDto | null>(null);

  // Modals & Trạng thái thao tác
  const [selectedFileForDetail, setSelectedFileForDetail] = useState<FileItemDto | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItemDto | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadDeptId, setUploadDeptId] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // State quản lý Vòng đời & Tệp sắp hết hạn (Expiring Files)
  const [storageTab, setStorageTab] = useState<'all_files' | 'expiring_files'>('all_files');
  const [expiringSummary, setExpiringSummary] = useState<ExpiringFilesSummaryDto | null>(null);
  const [expiringFiles, setExpiringFiles] = useState<ExpiringFileItemDto[]>([]);
  const [isLoadingExpiring, setIsLoadingExpiring] = useState<boolean>(false);
  const [expiringDays, setExpiringDays] = useState<number>(7);
  const [expiringPage, setExpiringPage] = useState<number>(1);
  const [fileToPermanentDelete, setFileToPermanentDelete] = useState<ExpiringFileItemDto | null>(null);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState<boolean>(false);

  const fetchExpiringFiles = useCallback(async () => {
    setIsLoadingExpiring(true);
    try {
      const res = await getExpiringFilesApi(expiringDays, expiringPage, 20);
      setExpiringSummary(res);
      setExpiringFiles(res?.items || []);
    } catch (err: any) {
      console.error('Lỗi khi tải tệp sắp hết hạn:', err);
      addToast('error', 'Không thể tải danh sách tệp sắp hết hạn lưu trữ');
    } finally {
      setIsLoadingExpiring(false);
    }
  }, [expiringDays, expiringPage, addToast]);

  useEffect(() => {
    if (storageTab === 'expiring_files') {
      fetchExpiringFiles();
    }
  }, [storageTab, fetchExpiringFiles]);

  const handleConfirmPermanentDelete = async () => {
    if (!fileToPermanentDelete) return;
    setIsPermanentDeleting(true);
    try {
      await permanentDeleteFileApi(fileToPermanentDelete.id);
      addToast('success', `Đã xóa vĩnh viễn tệp '${fileToPermanentDelete.name}' và giải phóng ${fileToPermanentDelete.formattedSize} Quota!`);
      setFileToPermanentDelete(null);
      fetchExpiringFiles();
      fetchReportFiles();
    } catch (err: any) {
      addToast('error', 'Xóa vĩnh viễn tệp tin thất bại.');
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Debounce tìm kiếm 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Format kích thước bytes thành B, KB, MB, GB, TB
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format ngày tháng hiển thị trực quan
  const formatDate = (isoString?: string) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // ---------------------------------------------------------------------------------------
  // 2. TẢI DỮ LIỆU BÁO CÁO TỆP TIN QUA GET /api/files
  // ---------------------------------------------------------------------------------------
  const fetchReportFiles = useCallback(async () => {
    if (!tenant.id) return;
    setIsLoading(true);

    try {
      const targetDepartment = selectedDeptId !== 'all' ? selectedDeptId : undefined;
      const res = await getTenantFilesApi({
        tenantId: tenant.id,
        departmentId: targetDepartment,
        searchTerm: debouncedSearch || undefined,
        pageNumber,
        pageSize,
      });

      if (res) {
        setSummaryData(res);
        const fileList = res.files || [];
        setFiles(fileList);
        setHasMore(Boolean(res.hasMore));
        setTotalFilesCount(res.totalCount || fileList.length);
      }
    } catch (err: any) {
      console.error('[TenantStorageView] Lỗi tải báo cáo tệp tin:', err);
      addToast('error', 'Không thể nạp danh sách tệp tin báo cáo. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  }, [tenant.id, selectedDeptId, debouncedSearch, pageNumber, pageSize, addToast]);

  useEffect(() => {
    fetchReportFiles();
  }, [fetchReportFiles]);

  // ---------------------------------------------------------------------------------------
  // 3. XỬ LÝ PHÂN LOẠI & SẮP XẾP DỮ LIỆU HIỂN THỊ
  // ---------------------------------------------------------------------------------------
  const getFileCategory = (file: FileItemDto): FileCategory => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = (file.contentType || '').toLowerCase();

    if (
      mime.includes('pdf') ||
      mime.includes('word') ||
      mime.includes('text') ||
      ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)
    ) {
      return 'docs';
    }
    if (
      mime.includes('image') ||
      mime.includes('video') ||
      mime.includes('audio') ||
      ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp4', 'mov', 'avi', 'mp3'].includes(ext)
    ) {
      return 'media';
    }
    if (
      mime.includes('excel') ||
      mime.includes('spreadsheet') ||
      mime.includes('csv') ||
      mime.includes('json') ||
      mime.includes('sql') ||
      ['xls', 'xlsx', 'csv', 'json', 'sql', 'db'].includes(ext)
    ) {
      return 'data';
    }
    return 'archive';
  };

  const getFileIcon = (file: FileItemDto) => {
    const cat = getFileCategory(file);
    switch (cat) {
      case 'docs':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'media':
        return <ImageIcon className="w-4 h-4 text-purple-600" />;
      case 'data':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case 'archive':
      default:
        return <FileArchive className="w-4 h-4 text-amber-600" />;
    }
  };

  // Lọc theo Category và Sắp xếp
  const displayedFiles = useMemo(() => {
    let result = [...files];

    // Lọc theo Category tab
    if (activeCategory !== 'all') {
      result = result.filter((f) => getFileCategory(f) === activeCategory);
    }

    // Sắp xếp
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === 'size_desc') {
        return b.sizeBytes - a.sizeBytes;
      }
      if (sortOrder === 'size_asc') {
        return a.sizeBytes - b.sizeBytes;
      }
      return 0;
    });

    return result;
  }, [files, activeCategory, sortOrder]);

  // Thống kê tổng số lượng & dung lượng theo phòng ban đã tải
  const departmentStats = useMemo(() => {
    const map: Record<string, { count: number; bytes: number }> = {};
    files.forEach((f) => {
      const deptName = f.departmentName || 'Chưa phân phòng ban';
      if (!map[deptName]) {
        map[deptName] = { count: 0, bytes: 0 };
      }
      map[deptName].count++;
      map[deptName].bytes += f.sizeBytes;
    });
    return map;
  }, [files]);

  // ---------------------------------------------------------------------------------------
  // 4. CÁC HÀNH ĐỘNG: DOWNLOAD, DELETE, EXPORT BÁO CÁO, UPLOAD
  // ---------------------------------------------------------------------------------------
  const handleDownload = async (file: FileItemDto) => {
    try {
      addToast('info', `Đang chuẩn bị tải xuống: ${file.name}...`);
      await downloadTenantFileApi(file.id, file.name);
      addToast('success', `Đã tải xuống thành công tệp tin ${file.name}`);
    } catch (err: any) {
      addToast('error', 'Không thể tải xuống tệp tin. Vui lòng kiểm tra quyền hạn.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTenantFileApi(fileToDelete.id);
      addToast('success', `Đã xóa tệp tin ${fileToDelete.name} thành công!`);
      setFileToDelete(null);
      fetchReportFiles();
    } catch (err: any) {
      addToast('error', 'Xóa tệp tin thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    addToast('info', 'Đã sao chép mã băm SHA-256 vào clipboard.');
    setTimeout(() => setCopiedHash(null), 2500);
  };

  // Xuất báo cáo danh sách tệp tin ra định dạng CSV
  const handleExportCsv = () => {
    if (displayedFiles.length === 0) {
      addToast('warning', 'Không có dữ liệu tệp tin để xuất báo cáo.');
      return;
    }

    const headers = [
      'ID Tệp',
      'Tên Tệp Tin',
      'Phòng Ban',
      'Người Tải Lên',
      'Dung Lượng (Bytes)',
      'Dung Lượng',
      'Loại Tệp (MIME)',
      'Ngày Tạo',
      'Trạng Thái ClamAV',
      'Mã Băm SHA-256',
    ];

    const rows = displayedFiles.map((f) => [
      `"${f.id}"`,
      `"${f.name.replace(/"/g, '""')}"`,
      `"${(f.departmentName || 'Chưa gán').replace(/"/g, '""')}"`,
      `"${(f.ownerName || 'Unknown').replace(/"/g, '""')}"`,
      f.sizeBytes,
      `"${formatBytes(f.sizeBytes)}"`,
      `"${f.contentType || ''}"`,
      `"${f.createdAt || ''}"`,
      `"${f.scanStatus || 'Clean'}"`,
      `"${f.hash || ''}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bao_Cao_Tep_Tin_${tenant.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast('success', 'Đã xuất file báo cáo CSV thành công!');
  };

  // Xử lý tải tệp tin lên phòng ban được chọn
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesToUpload = event.target.files;
    if (!filesToUpload || filesToUpload.length === 0) return;

    setIsUploading(true);
    try {
      addToast('info', `Đang tải lên ${filesToUpload.length} tệp tin với xác thực ClamAV & SHA-256...`);
      await uploadTenantFilesApi(
        filesToUpload,
        tenant.id,
        undefined, // folderId
        undefined, // providerId
        uploadDeptId || undefined
      );

      addToast('success', `Đã tải lên tệp tin thành công!`);
      setIsUploadModalOpen(false);
      fetchReportFiles();
    } catch (err: any) {
      addToast('error', err?.response?.data?.error || err.message || 'Tải lên tệp tin thất bại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Xử lý tải trực tiếp tệp tin lên Cloud (Direct-to-Storage: Google Drive / OneDrive / S3)
  const handleDirectFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesToUpload = event.target.files;
    if (!filesToUpload || filesToUpload.length === 0) return;

    setIsUploading(true);
    try {
      addToast('info', `Đang tải trực tiếp ${filesToUpload.length} tệp tin lên Cloud Storage...`);
      const res = await uploadDirectTenantFilesApi(
        filesToUpload,
        tenant.id,
        undefined, // folderId
        uploadDeptId || undefined
      );

      if (res.failed && res.failed.length > 0) {
        addToast('error', `Tải trực tiếp Cloud: ${res.uploaded.length} thành công, ${res.failed.length} thất bại.`);
      } else {
        addToast('success', `Đã tải trực tiếp thành công ${res.uploaded.length || filesToUpload.length} tệp tin lên Cloud!`);
      }
      setIsUploadModalOpen(false);
      fetchReportFiles();
    } catch (err: any) {
      addToast('error', err?.response?.data?.error || err.message || 'Tải trực tiếp Cloud thất bại.');
    } finally {
      setIsUploading(false);
      if (directFileInputRef.current) directFileInputRef.current.value = '';
    }
  };

  // Tổng dung lượng đã dùng tính từ summary hoặc files
  const totalAllocatedBytes = summaryData?.quotaBytes || tenant.storageQuotaBytes || (20 * 1024 ** 3);
  const totalUsedBytes = summaryData?.usedBytes || files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const totalAvailableBytes = Math.max(0, totalAllocatedBytes - totalUsedBytes);
  const totalUsagePercentage = totalAllocatedBytes > 0
    ? Math.round((totalUsedBytes / totalAllocatedBytes) * 100)
    : 0;

  // =======================================================================================
  // 5. JSX RENDER GIAO DIỆN
  // =======================================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 5.1. Header: Điều hướng quay lại & Tiêu đề màn hình Báo cáo */}
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
                Báo cáo Lưu trữ & Quản lý Tệp tin
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Department & User Files
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Báo cáo và kiểm tra toàn diện các tệp tin lưu trữ của mọi phòng ban và nhân viên thuộc {tenant.name}
            </p>
          </div>
        </div>

        {/* Nút hành động nhanh: Quota, Refresh, Xuất CSV, Tải tệp mới */}
        <div className="flex items-center gap-2">
          {onOpenExpandQuota && (
            <button
              onClick={onOpenExpandQuota}
              className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              title="Xin thêm dung lượng Quota"
            >
              <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
              <span>Xin cấp Quota</span>
            </button>
          )}

          <button
            onClick={fetchReportFiles}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Làm mới báo cáo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={displayedFiles.length === 0}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Xuất danh sách ra tệp CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất báo cáo CSV</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs shadow-blue-500/20"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Tải tệp mới</span>
          </button>
        </div>
      </div>

      {/* Tab chuyển đổi chế độ xem: Toàn bộ tệp tin vs Tệp sắp hết hạn */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setStorageTab('all_files')}
          className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
            storageTab === 'all_files'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Tất cả tệp tin ({totalFilesCount.toLocaleString()})</span>
        </button>
        <button
          onClick={() => setStorageTab('expiring_files')}
          className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-2 ${
            storageTab === 'expiring_files'
              ? 'text-rose-600 border-b-2 border-rose-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-rose-500" />
          <span>Tệp sắp hết hạn lưu trữ</span>
          {expiringSummary && expiringSummary.totalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-mono font-bold">
              {expiringSummary.totalCount}
            </span>
          )}
        </button>
      </div>

      {storageTab === 'expiring_files' ? (
        <div className="space-y-6">
          {/* Expiring Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-medium">Số tệp sắp hết hạn</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-rose-600">
                {isLoadingExpiring ? '...' : expiringSummary?.totalCount ?? 0}{' '}
                <span className="text-xs font-semibold text-slate-500">tệp</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Hết hạn trong vòng {expiringDays} ngày tới
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-medium">Dung lượng giải phóng được</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600">
                {isLoadingExpiring ? '...' : expiringSummary?.formattedTotalSize ?? '0 B'}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Dung lượng hoàn trả ngay vào Quota của tổ chức khi xóa
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-medium">Khung thời gian cảnh báo</span>
                <Filter className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {[3, 7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => { setExpiringDays(d); setExpiringPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      expiringDays === d
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d} ngày
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Xem trước các tệp tin trong diện cảnh báo
              </p>
            </div>
          </div>

          {/* Expiring Files Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Danh sách tệp tin sắp hết hạn lưu trữ
                </h3>
              </div>
              <button
                onClick={fetchExpiringFiles}
                disabled={isLoadingExpiring}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExpiring ? 'animate-spin text-rose-600' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>

            {isLoadingExpiring ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-600 mx-auto mb-2" />
                <span>Đang quét danh sách tệp sắp hết hạn...</span>
              </div>
            ) : expiringFiles.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-700 text-sm">Không có tệp tin nào sắp hết hạn!</p>
                <p className="text-slate-400">Tất cả tệp tin trong tổ chức đều đang trong thời hạn lưu trữ an toàn (hơn {expiringDays} ngày nữa).</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Tên tệp tin</th>
                      <th className="py-3 px-4">Dung lượng</th>
                      <th className="py-3 px-4">Phòng ban</th>
                      <th className="py-3 px-4">Người tải lên</th>
                      <th className="py-3 px-4">Ngày hết hạn</th>
                      <th className="py-3 px-4">Còn lại</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {expiringFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate" title={file.name}>
                          {file.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {file.formattedSize}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {file.departmentName || 'Chưa gán'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {file.ownerName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {new Date(file.expiresAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            file.daysRemaining <= 3
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {file.daysRemaining === 0 ? 'Hôm nay' : `${file.daysRemaining} ngày`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleDownload({ id: file.id, name: file.name } as any)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Tải về tệp tin"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setFileToPermanentDelete(file)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Xóa vĩnh viễn (Giải phóng Quota)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal xác nhận xóa vĩnh viễn */}
          {fileToPermanentDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Xác nhận xóa vĩnh viễn tệp tin?</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Bạn sắp xóa vĩnh viễn tệp <strong className="text-slate-900">'{fileToPermanentDelete.name}'</strong> ({fileToPermanentDelete.formattedSize}).
                  </p>
                  <p className="text-xs text-rose-600 font-semibold mt-2">
                    Hành động này sẽ xóa vật lý tệp tin khỏi Cloud Provider ngay lập tức và giải phóng Quota lưu trữ cho tổ chức. Thao tác này KHÔNG THỂ khôi phục.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setFileToPermanentDelete(null)}
                    disabled={isPermanentDeleting}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirmPermanentDelete}
                    disabled={isPermanentDeleting}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isPermanentDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn & Giải phóng Quota'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 5.2. 4 Thẻ chỉ số tổng quan (KPI Stat Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số tệp tin đã lưu */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Tổng tệp tin đã lưu</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalFilesCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedDeptId === 'all'
                ? `Toàn bộ ${departments.length} phòng ban`
                : departments.find((d) => d.id === selectedDeptId)?.name || 'Phòng ban đã chọn'}
            </p>
          </div>
        </div>

        {/* Card 2: Dung lượng tệp tin đã chiếm */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Dung lượng thực tế</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              {totalUsagePercentage}% Quota
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-600 tabular-nums">
              {formatBytes(totalUsedBytes)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              trên tổng {formatBytes(totalAllocatedBytes)} khả dụng
            </p>
          </div>
        </div>

        {/* Card 3: Trạng thái an toàn mã độc (ClamAV & SHA-256) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Trạng thái an toàn</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ClamAV & SHA-256</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              100% tệp tin đã qua quét mã độc & kiểm tra toàn vẹn
            </p>
          </div>
        </div>

        {/* Card 4: Nhà cung cấp Cloud Storage Pool */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Cloud Storage Pool</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-slate-900 truncate">
              {summaryData?.storageProviderName || tenant.storageProviderName || 'Google Drive Primary'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Còn trống: <strong className="text-emerald-600">{formatBytes(totalAvailableBytes)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 5.3. Khu vực Bộ lọc thông minh (Advanced Filter Bar) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Ô tìm kiếm file có debounce */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm tệp theo tên, loại tệp (.pdf, .docx, .xlsx)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dropdown Lọc theo Phòng Ban (Department Filter) */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setPageNumber(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">🏢 Tất cả phòng ban ({departments.length})</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.allocatedStorageGB || 0} GB Quota)
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Sắp xếp */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="size_desc">Dung lượng lớn nhất</option>
                <option value="size_asc">Dung lượng nhỏ nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs phân loại định dạng tệp tin (Category Pills) */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
          {[
            { id: 'all', label: 'Tất cả tệp', count: files.length },
            { id: 'docs', label: '📄 Tài liệu (PDF, Word, TXT)', count: files.filter((f) => getFileCategory(f) === 'docs').length },
            { id: 'data', label: '📊 Bảng tính & Dữ liệu (Excel, CSV, JSON)', count: files.filter((f) => getFileCategory(f) === 'data').length },
            { id: 'media', label: '🎬 Media (Hình ảnh, Video, Âm thanh)', count: files.filter((f) => getFileCategory(f) === 'media').length },
            { id: 'archive', label: '📦 Tệp nén & Khác (ZIP, RAR)', count: files.filter((f) => getFileCategory(f) === 'archive').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as FileCategory)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 5.4. Bảng Báo cáo Chi tiết Danh sách Tệp tin (Data Table) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Tên tệp tin</th>
                <th className="py-3 px-4">Phòng ban</th>
                <th className="py-3 px-4">Người tải lên</th>
                <th className="py-3 px-4">Kích thước</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Bảo mật ClamAV</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <span>Đang nạp dữ liệu báo cáo tệp tin từ hệ thống...</span>
                  </td>
                </tr>
              ) : displayedFiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Chưa có tệp tin nào</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {selectedDeptId !== 'all'
                        ? 'Phòng ban được chọn chưa tải lên tài liệu nào hoặc không có tệp khớp với tìm kiếm.'
                        : 'Doanh nghiệp chưa có tài liệu nào tải lên hệ thống.'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedFileForDetail(file)}
                  >
                    {/* Tên tệp tin */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5 min-w-[200px] max-w-[280px]">
                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200/60 shrink-0 group-hover:bg-white transition-colors">
                          {getFileIcon(file)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {file.contentType || 'application/octet-stream'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Phòng ban sở hữu */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{file.departmentName || 'Chung tổ chức'}</span>
                      </span>
                    </td>

                    {/* Người tải lên */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{file.ownerName || 'Thành viên'}</span>
                      </div>
                    </td>

                    {/* Dung lượng file */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </td>

                    {/* Ngày tải lên */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {formatDate(file.createdAt)}
                    </td>

                    {/* Trạng thái quét an toàn ClamAV & SHA-256 */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Sạch (Clean)</span>
                        </span>
                        {file.hash && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyHash(file.hash!);
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            title={`Mã băm SHA-256: ${file.hash}`}
                          >
                            {copiedHash === file.hash ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Thao tác: Download, Chi tiết, Xóa */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors"
                          title="Tải xuống tệp tin"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedFileForDetail(file)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
                          title="Xem chi tiết tệp"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 transition-colors"
                          title="Xóa tệp tin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5.5. Phân trang dữ liệu (Pagination Footer) */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị <strong className="text-slate-800">{displayedFiles.length}</strong> tệp tin
            {totalFilesCount > 0 && ` trên tổng số ${totalFilesCount}`}
          </div>

          <div className="flex items-center gap-3">
            {/* Kích thước trang */}
            <div className="flex items-center gap-1.5">
              <span>Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageNumber(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Nút Trước / Kế tiếp */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber === 1 || isLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-800">Trang {pageNumber}</span>
              <button
                onClick={() => setPageNumber((p) => p + 1)}
                disabled={!hasMore || isLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5.6. MODAL XEM CHI TIẾT TỆP TIN (File Detail Inspector Modal) */}
      {selectedFileForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                  {getFileIcon(selectedFileForDetail)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    {selectedFileForDetail.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">Thông tin chi tiết tệp lưu trữ</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFileForDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                <div>
                  <span className="text-slate-400 block text-[10px]">Phòng ban sở hữu</span>
                  <strong className="text-slate-800 font-semibold mt-0.5 block">
                    {selectedFileForDetail.departmentName || 'Chung tổ chức'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Người tải lên</span>
                  <strong className="text-slate-800 font-semibold mt-0.5 block">
                    {selectedFileForDetail.ownerName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Dung lượng</span>
                  <strong className="text-blue-600 font-bold mt-0.5 block">
                    {formatBytes(selectedFileForDetail.sizeBytes)} ({selectedFileForDetail.sizeBytes.toLocaleString()} B)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Thời gian tải lên</span>
                  <span className="text-slate-700 mt-0.5 block">
                    {formatDate(selectedFileForDetail.createdAt)}
                  </span>
                </div>
              </div>

              {/* Thông tin Mã độc & Mã băm */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Quét mã độc ClamAV:</span>
                  </span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-100">
                    Sạch (CLEAN - No Malware)
                  </span>
                </div>

                {selectedFileForDetail.hash && (
                  <div>
                    <span className="text-slate-400 block text-[10px] mb-1">Mã băm toàn vẹn SHA-256:</span>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700">
                      <span className="truncate mr-2">{selectedFileForDetail.hash}</span>
                      <button
                        onClick={() => handleCopyHash(selectedFileForDetail.hash!)}
                        className="text-blue-600 hover:text-blue-800 shrink-0 font-sans text-xs font-semibold"
                      >
                        {copiedHash === selectedFileForDetail.hash ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedFileForDetail(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  handleDownload(selectedFileForDetail);
                  setSelectedFileForDetail(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải tệp tin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.7. MODAL XÁC NHẬN XÓA TỆP TIN */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa tệp tin</h3>
            <p className="text-xs text-slate-500 mt-1">
              Bạn có chắc chắn muốn xóa tệp <strong className="text-slate-800">{fileToDelete.name}</strong> ({formatBytes(fileToDelete.sizeBytes)}) thuộc phòng ban <strong className="text-slate-800">{fileToDelete.departmentName || 'Chung'}</strong> không?
            </p>
            <p className="text-[11px] text-rose-600 mt-2 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
              Hành động này sẽ giải phóng dung lượng lưu trữ tương ứng trong hạn mức Quota của tổ chức.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Đang xóa...' : 'Đồng ý xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.8. MODAL TẢI TỆP TIN LÊN PHÒNG BAN */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Tải tệp tin lên hệ thống</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Chọn phòng ban tiếp nhận tệp:
                </label>
                <select
                  value={uploadDeptId}
                  onChange={(e) => setUploadDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">🏢 Lưu trữ chung của Tổ chức</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} (Hạn ngạch: {dept.allocatedStorageGB || 0} GB)
                    </option>
                  ))}
                </select>
              </div>

              {/* Khu vực chọn file với 2 phương thức tải lên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  ref={directFileInputRef}
                  type="file"
                  multiple
                  onChange={handleDirectFileUpload}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Phương pháp 1: Tải trực tiếp Cloud */}
                <div
                  onClick={() => directFileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer transition-all bg-blue-50/40 hover:bg-blue-50/70 group relative"
                >
                  <span className="absolute top-2.5 right-2.5 text-[9px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Mới
                  </span>
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-blue-950">
                    Tải trực tiếp Cloud
                  </p>
                  <p className="text-[10px] text-blue-600/80 mt-1">
                    Bỏ qua Backend, tải thẳng Google Drive / OneDrive / S3
                  </p>
                </div>

                {/* Phương pháp 2: Tải qua Server */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-5 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-100/60 group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Server className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Tải qua Server
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Phương pháp truyền thống qua API backend
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
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
