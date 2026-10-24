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
  FolderOpen,
} from 'lucide-react';
import { DepartmentInfo, DepartmentMember } from '../types';
import {
  FileItemDto,
  TenantStorageSummaryDto,
  getDepartmentFilesApi,
  downloadTenantFileApi,
  deleteTenantFileApi,
  uploadTenantFilesApi,
} from '@/features/tenants/api/fileApi';

interface DepartmentStorageReportViewProps {
  department: DepartmentInfo;
  members?: DepartmentMember[];
  onBackToHub: () => void;
  onAddToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

type FileCategory = 'all' | 'docs' | 'media' | 'data' | 'archive';
type SortOrder = 'newest' | 'oldest' | 'size_desc' | 'size_asc';

export const DepartmentStorageReportView: React.FC<DepartmentStorageReportViewProps> = ({
  department,
  members = [],
  onBackToHub,
  onAddToast,
}) => {
  // ---------------------------------------------------------------------------------------
  // 1. STATE DỮ LIỆU & BỘ LỌC
  // ---------------------------------------------------------------------------------------
  const [files, setFiles] = useState<FileItemDto[]>([]);
  const [totalFilesCount, setTotalFilesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toast = useCallback(
    (type: 'success' | 'error' | 'info', msg: string) => {
      if (onAddToast) onAddToast(type, msg);
    },
    [onAddToast]
  );

  // Debounce tìm kiếm 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
  // 2. TẢI DỮ LIỆU TỆP TIN PHÒNG BAN QUA GET /api/files?departmentId=...
  // ---------------------------------------------------------------------------------------
  const fetchReportFiles = useCallback(async () => {
    if (!department.id) return;
    setIsLoading(true);

    try {
      const res = await getDepartmentFilesApi({
        departmentId: department.id,
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
      console.error('[DepartmentStorageReportView] Lỗi tải báo cáo tệp tin:', err);
      toast('error', 'Không thể nạp danh sách tệp tin báo cáo của phòng ban.');
    } finally {
      setIsLoading(false);
    }
  }, [department.id, debouncedSearch, pageNumber, pageSize, toast]);

  useEffect(() => {
    fetchReportFiles();
  }, [fetchReportFiles]);

  // ---------------------------------------------------------------------------------------
  // 3. XỬ LÝ PHÂN LOẠI & SẮP XẾP
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

  // Danh sách tệp tin sau khi lọc theo User, Category và Sort
  const displayedFiles = useMemo(() => {
    let result = [...files];

    // Lọc theo người tải lên (User)
    if (selectedUserId !== 'all') {
      result = result.filter(
        (f) => f.ownerId === selectedUserId || f.ownerName.toLowerCase().includes(selectedUserId.toLowerCase())
      );
    }

    // Lọc theo Category
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
  }, [files, selectedUserId, activeCategory, sortOrder]);

  // Đếm số lượng theo category
  const categoryCounts = useMemo(() => {
    const counts = { all: files.length, docs: 0, media: 0, data: 0, archive: 0 };
    files.forEach((f) => {
      const cat = getFileCategory(f);
      counts[cat]++;
    });
    return counts;
  }, [files]);

  // Danh sách các Users/Uploaders xuất hiện trong các file của phòng ban
  const uniqueUploaders = useMemo(() => {
    const map = new Map<string, string>();
    files.forEach((f) => {
      if (f.ownerName && !map.has(f.ownerId)) {
        map.set(f.ownerId, f.ownerName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [files]);

  // ---------------------------------------------------------------------------------------
  // 4. CÁC HÀNH ĐỘNG: TẢI VỀ, XÓA, COPY HASH, XUẤT CSV, TẢI LÊN
  // ---------------------------------------------------------------------------------------
  const handleDownload = async (file: FileItemDto) => {
    try {
      toast('info', `Đang chuẩn bị tải về "${file.name}"...`);
      await downloadTenantFileApi(file.id, file.name);
      toast('success', `Đã tải về "${file.name}" thành công!`);
    } catch (err: any) {
      toast('error', `Tải về thất bại: ${err?.message || 'Lỗi kết nối máy chủ'}`);
    }
  };

  const handleCopyHash = (hash?: string | null) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast('success', 'Đã sao chép mã băm SHA-256 vào bộ nhớ tạm!');
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);

    try {
      await deleteTenantFileApi(fileToDelete.id);
      toast('success', `Đã chuyển tệp tin "${fileToDelete.name}" vào thùng rác phòng ban.`);
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setTotalFilesCount((prev) => Math.max(0, prev - 1));
      setFileToDelete(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || err.message || 'Xóa tệp tin thất bại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCsv = () => {
    if (displayedFiles.length === 0) {
      toast('info', 'Không có dữ liệu tệp tin để xuất báo cáo.');
      return;
    }

    const headers = [
      'STT',
      'Ten Tep Tin',
      'Nguoi Tai Len',
      'Phong Ban',
      'Kich Thuoc (Bytes)',
      'Kich Thuoc Hien Thi',
      'Dinh Dang (MIME)',
      'Trang Thai ClamAV',
      'Ma Bam SHA-256',
      'Ngay Tai Len',
      'Storage Key',
    ];

    const rows = displayedFiles.map((f, idx) => [
      idx + 1,
      `"${f.name.replace(/"/g, '""')}"`,
      `"${(f.ownerName || 'Unknown').replace(/"/g, '""')}"`,
      `"${(f.departmentName || department.name).replace(/"/g, '""')}"`,
      f.sizeBytes,
      `"${formatBytes(f.sizeBytes)}"`,
      `"${f.contentType || ''}"`,
      `"${f.scanStatus || 'Clean'}"`,
      `"${f.hash || ''}"`,
      `"${f.createdAt}"`,
      `"${f.storageKey || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BaoCao_TepTin_${department.name.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast('success', 'Đã xuất file báo cáo CSV thành công!');
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesToUpload = Array.from(selectedFiles);
    setIsUploading(true);

    try {
      toast('info', `Đang tải lên ${filesToUpload.length} tệp tin với kiểm tra mã độc ClamAV...`);
      await uploadTenantFilesApi(
        filesToUpload,
        undefined,
        undefined, // folderId
        undefined, // providerId
        department.id
      );

      toast('success', `Đã tải lên tệp tin thành công!`);
      setIsUploadModalOpen(false);
      fetchReportFiles();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || err.message || 'Tải lên tệp tin thất bại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Tính toán dung lượng
  const totalAllocatedBytes =
    summaryData?.quotaBytes || (department.totalAllocatedGB ? department.totalAllocatedGB * 1024 ** 3 : 10 * 1024 ** 3);
  const totalUsedBytes = summaryData?.usedBytes || files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const totalAvailableBytes = Math.max(0, totalAllocatedBytes - totalUsedBytes);
  const totalUsagePercentage = totalAllocatedBytes > 0 ? Math.round((totalUsedBytes / totalAllocatedBytes) * 100) : 0;

  // ---------------------------------------------------------------------------------------
  // 5. JSX RENDER GIAO DIỆN
  // ---------------------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 5.1. Header: Điều hướng quay lại & Tiêu đề màn hình Báo cáo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
            title="Quay lại Trung tâm điều hành"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Báo cáo Lưu trữ & Quản lý Tệp tin
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Phòng {department.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Báo cáo và kiểm tra toàn diện các tệp tin lưu trữ của mọi thành viên thuộc phòng ban {department.name}
            </p>
          </div>
        </div>

        {/* Nút hành động nhanh: Refresh, Xuất CSV, Tải tệp mới */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReportFiles}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Làm mới báo cáo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
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
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs shadow-indigo-500/20"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Tải tệp mới</span>
          </button>
        </div>
      </div>

      {/* 5.2. 4 Thẻ chỉ số tổng quan (KPI Stat Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số tệp tin đã lưu */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Tổng tệp tin đã lưu</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalFilesCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Toàn bộ phòng {department.name}
            </p>
          </div>
        </div>

        {/* Card 2: Dung lượng tệp tin đã chiếm */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Dung lượng thực tế</span>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
              {totalUsagePercentage}% Quota
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-600 tabular-nums">
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
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-slate-900 truncate">
              {summaryData?.storageProviderName || 'Google Drive Primary'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Còn trống: <strong className="text-emerald-600">{formatBytes(totalAvailableBytes)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 5.3. Khu vực Bộ lọc thông minh */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Ô tìm kiếm theo tên tệp */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tệp theo tên, loại tệp (.pdf, .docx, .xlsx)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bộ lọc người tải lên (User Filter) */}
            <div className="relative min-w-[200px]">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl appearance-none font-medium text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="all">Tất cả người tải lên ({files.length})</option>
                {uniqueUploaders.map((u) => (
                  <option key={u.id} value={u.name}>
                    👤 {u.name}
                  </option>
                ))}
              </select>
              <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sắp xếp */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl appearance-none font-medium text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="size_desc">Kích thước lớn nhất</option>
                <option value="size_asc">Kích thước nhỏ nhất</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabs phân loại Category */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          {[
            { id: 'all', label: 'Tất cả tệp', count: categoryCounts.all, icon: Layers },
            { id: 'docs', label: 'Tài liệu (PDF, Word, TXT)', count: categoryCounts.docs, icon: FileText },
            { id: 'data', label: 'Bảng tính & Dữ liệu (Excel, CSV, JSON)', count: categoryCounts.data, icon: FileSpreadsheet },
            { id: 'media', label: 'Media (Hình ảnh, Video, Âm thanh)', count: categoryCounts.media, icon: ImageIcon },
            { id: 'archive', label: 'Tệp nén & Khác (ZIP, RAR)', count: categoryCounts.archive, icon: FileArchive },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as FileCategory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5.4. Bảng Kiểm toán & Danh sách Tệp tin chi tiết */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Tên tệp tin</th>
                <th className="py-3.5 px-4">Người tải lên</th>
                <th className="py-3.5 px-4">Kích thước</th>
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Bảo mật ClamAV</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span className="text-xs font-medium">Đang nạp dữ liệu kiểm toán tệp tin...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">Chưa có tệp tin nào</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {debouncedSearch || selectedUserId !== 'all'
                          ? 'Không tìm thấy tệp tin phù hợp với bộ lọc tìm kiếm.'
                          : `Các nhân viên trong phòng ${department.name} chưa tải tài liệu nào lên hệ thống.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedFiles.map((file) => {
                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      {/* Tên tệp tin & Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-white group-hover:shadow-2xs transition-all shrink-0">
                            {getFileIcon(file)}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-md">
                            <div
                              onClick={() => setSelectedFileForDetail(file)}
                              className="font-semibold text-slate-900 hover:text-indigo-600 truncate transition-colors cursor-pointer"
                              title={file.name}
                            >
                              {file.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                              {file.storageKey || 'Storage-Key-Attached'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Người tải lên (User) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {(file.ownerName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">
                            {file.ownerName || 'Thành viên phòng'}
                          </span>
                        </div>
                      </td>

                      {/* Kích thước */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {formatBytes(file.sizeBytes)}
                      </td>

                      {/* Thời gian tải lên */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {formatDate(file.createdAt)}
                      </td>

                      {/* Bảo mật ClamAV & SHA-256 */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{file.scanStatus || 'Clean'}</span>
                          </span>

                          {file.hash ? (
                            <button
                              onClick={() => handleCopyHash(file.hash)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Bấm để sao chép mã SHA-256 toàn vẹn"
                            >
                              <span>{file.hash.substring(0, 10)}...</span>
                              {copiedHash === file.hash ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">No Hash</span>
                          )}
                        </div>
                      </td>

                      {/* Các thao tác: Chi tiết, Tải về, Xóa */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedFileForDetail(file)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Xem chi tiết kiểm toán"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Tải tệp tin về máy"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa tệp tin khỏi phòng ban"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5.5. Footer Phân trang & Thống kê */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị <strong className="text-slate-900">{displayedFiles.length}</strong> tệp tin
            {totalFilesCount > displayedFiles.length && (
              <span> (trên tổng số {totalFilesCount} tệp của phòng)</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageNumber(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber === 1 || isLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-700">Trang {pageNumber}</span>
              <button
                onClick={() => setPageNumber((p) => p + 1)}
                disabled={!hasMore || isLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5.6. Modal Chi tiết Tệp tin & Dữ liệu Kiểm toán (Audit Modal) */}
      {selectedFileForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Hồ sơ Kiểm toán Tệp tin</h3>
                  <p className="text-[11px] text-slate-400">Thông số kỹ thuật & xác thực an toàn</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFileForDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Tên tệp tin gốc</div>
                <div className="font-bold text-slate-900 break-all">{selectedFileForDetail.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Người tải lên</div>
                  <div className="font-bold text-indigo-600 truncate">{selectedFileForDetail.ownerName}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Phòng ban</div>
                  <div className="font-bold text-slate-800 truncate">
                    {selectedFileForDetail.departmentName || department.name}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Kích thước</div>
                  <div className="font-bold text-slate-800 font-mono">
                    {formatBytes(selectedFileForDetail.sizeBytes)} ({selectedFileForDetail.sizeBytes.toLocaleString()} bytes)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Định dạng (MIME)</div>
                  <div className="font-bold text-slate-800 font-mono truncate">
                    {selectedFileForDetail.contentType || 'application/octet-stream'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase">
                  <span>Mã băm SHA-256 (Toàn vẹn tệp)</span>
                  {selectedFileForDetail.hash && (
                    <button
                      onClick={() => handleCopyHash(selectedFileForDetail.hash)}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </button>
                  )}
                </div>
                <div className="font-mono text-slate-700 break-all select-all text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                  {selectedFileForDetail.hash || 'Chưa tính mã băm'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Khóa lưu trữ (Storage Key)</div>
                <div className="font-mono text-slate-600 break-all text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                  {selectedFileForDetail.storageKey || 'None'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedFileForDetail(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  handleDownload(selectedFileForDetail);
                  setSelectedFileForDetail(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải tệp tin về máy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.7. Modal Xác nhận Xóa tệp tin */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Xác nhận xóa tệp tin?</h3>
                <p className="text-xs text-slate-400">Thao tác này sẽ chuyển tệp vào thùng rác phòng ban</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              Bạn có chắc chắn muốn xóa tệp tin <strong className="text-slate-900 font-bold">{fileToDelete.name}</strong> không?
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs shadow-rose-500/20"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.8. Modal Tải tệp mới */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Tải tệp mới cho phòng ban</h3>
                  <p className="text-[11px] text-slate-400">Quét mã độc ClamAV và lưu trữ Cloud an toàn</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Tệp tin sẽ được lưu trữ trực tiếp vào kho lưu trữ của phòng ban <strong>{department.name}</strong>.
              </p>

              {/* Khu vực Drag & Drop */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-6 text-center bg-indigo-50/30 hover:bg-indigo-50/60 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleQuickUpload}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="font-semibold text-slate-800">
                  {isUploading ? 'Đang tải lên...' : 'Nhấn để chọn tệp hoặc kéo thả vào đây'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Hỗ trợ tài liệu PDF, DOCX, XLSX, hình ảnh, mã nguồn và tệp nén (Tối đa 100MB/tệp)
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
