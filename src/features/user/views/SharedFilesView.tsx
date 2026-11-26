import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Folder,
  Search,
  Grid,
  List,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Presentation,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  HardDrive,
  Calendar,
  User,
  Users,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Filter,
} from 'lucide-react';
import { SharedFileItem, FileType, DriveItem } from '../types';
import { driveApi } from '../api/driveApi';
import { SharedFolderBrowser } from '../components/SharedFolderBrowser';
import { SharedByMeView } from '../components/SharedByMeView';
import { DocumentDetailsModal } from '@/features/document-submission';

export interface SharedFilesViewProps {
  onOpenItem?: (file: DriveItem) => void;
  onDownloadItem?: (item: DriveItem) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type SortField = 'date' | 'name' | 'size';

export const SharedFilesView: React.FC<SharedFilesViewProps> = ({
  onOpenItem,
  onDownloadItem,
  onShowToast,
}) => {
  const [items, setItems] = useState<SharedFileItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageSize] = useState<number>(16);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [sharedByFilter, setSharedByFilter] = useState<string>('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMetadataFileId, setSelectedMetadataFileId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'with-me' | 'by-me'>('with-me');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageNumber(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch shared files from API
  const fetchSharedFiles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await driveApi.getSharedFiles({
        pageNumber,
        pageSize,
        searchTerm: debouncedSearch || undefined,
        fileType: selectedFileType !== 'all' ? selectedFileType : undefined,
        sharedBy: sharedByFilter || undefined,
        sortBy: sortField,
        sortDirection: sortAsc ? 'asc' : 'desc',
      });

      setItems(response.items);
      setTotalCount(response.totalCount);
      setHasMore(Boolean(response.hasMore));
    } catch (error: any) {
      console.error('Lỗi nạp tệp tin chia sẻ:', error);
      const msg = error?.response?.data?.error
        || error?.response?.data?.message
        || 'Không thể tải danh sách tệp tin chia sẻ từ máy chủ.';
      setErrorMessage(msg);
      if (onShowToast) {
        onShowToast(msg, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [pageNumber, pageSize, debouncedSearch, selectedFileType, sharedByFilter, sortField, sortAsc, onShowToast]);

  useEffect(() => {
    fetchSharedFiles();
  }, [fetchSharedFiles]);

  const toDriveItem = (item: SharedFileItem): DriveItem => {
    return {
      id: item.id,
      archiveKind: item.archiveKind,
      originalSizeBytes: item.originalSizeBytes,
      name: item.name,
      type: 'file',
      fileType: item.fileType,
      extension: item.extension,
      size: item.size,
      sizeFormatted: item.sizeFormatted,
      updatedAt: item.sharedAtFormatted,
      createdAt: item.createdAt,
      storageProvider: item.storageProvider,
      owner: item.owner,
      parentId: null,
      starred: false,
      trashed: false,
      sharedWith: ['me'],
      tags: [item.fileType?.toUpperCase() || 'FILE'],
      department: item.department,
      scanStatus: (item.scanStatus as DriveItem['scanStatus']) ?? null,
    };
  };

  const handlePreview = (item: SharedFileItem) => {
    const driveItem = toDriveItem(item);
    if (onOpenItem) {
      onOpenItem(driveItem);
    } else {
      void driveApi.downloadFile(item.id, item.name);
    }
  };

  const handleDownload = (item: SharedFileItem) => {
    const driveItem = toDriveItem(item);
    if (onDownloadItem) {
      onDownloadItem(driveItem);
    } else {
      void driveApi.downloadFile(item.id, item.name);
    }
  };

  const getFileIcon = (fileType?: FileType) => {
    switch (fileType) {
      case 'folder':
        return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'sheet':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'slide':
        return <Presentation className="w-5 h-5 text-amber-500" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-purple-500" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-amber-600" />;
      case 'code':
        return <FileCode className="w-5 h-5 text-cyan-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  const getPermissionBadge = (level: string, canWrite: boolean, canDelete: boolean) => {
    if (canDelete || level === 'Owner') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldAlert className="w-3 h-3 text-purple-600" />
          Đồng sở hữu
        </span>
      );
    }
    if (canWrite || level === 'Editor') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          Chỉnh sửa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <ShieldCheck className="w-3 h-3 text-blue-600" />
        Người xem
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasActiveFilters = Boolean(debouncedSearch || selectedFileType !== 'all' || sharedByFilter);

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & SUB-TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        {/* Title & Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/70 shadow-2xs">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                {activeSubTab === 'with-me' ? 'Được chia sẻ với tôi' : 'Tệp tôi đã chia sẻ'}
              </h1>
              {activeSubTab === 'with-me' && totalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                  {totalCount}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeSubTab === 'with-me'
                ? 'Các tệp tin và thư mục do đồng nghiệp trong tổ chức chia sẻ với bạn'
                : 'Quản lý danh sách các tệp tin bạn đã chia sẻ và thu hồi quyền truy cập của người nhận'}
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher: Được chia sẻ với tôi / Tôi đã chia sẻ */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('with-me')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'with-me'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Được chia sẻ với tôi</span>
            {totalCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px] text-slate-500 font-mono">
                {totalCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('by-me')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'by-me'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tôi đã chia sẻ</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'by-me' ? (
        <SharedByMeView
          onOpenItem={onOpenItem}
          onDownloadItem={onDownloadItem}
          onShowToast={onShowToast}
        />
      ) : (
        <>
          {/* Search Capsule Bar & View Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-medium">
              Hiển thị <span className="font-bold text-slate-700">{items.length}</span> tệp tin được chia sẻ
            </div>
            <div className="flex items-center gap-2.5 flex-1 max-w-xl justify-end">
              {/* Capsule Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tệp được chia sẻ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-full transition-all text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchSharedFiles()}
                disabled={isLoading}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                title="Làm mới danh sách"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              {/* Google Drive View Switcher Pill */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/60 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#C2E7FF] text-[#001D35] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Xem dạng lưới"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[#C2E7FF] text-[#001D35] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Xem dạng danh sách"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

      {/* 2. FILTER CHIPS BAR (Flat Pills Google Drive Style) */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* File Type Filter Chip */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedFileType}
              onChange={(e) => {
                setSelectedFileType(e.target.value);
                setPageNumber(1);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all cursor-pointer shadow-2xs"
            >
              <option value="all">Loại tệp: Tất cả</option>
              <option value="pdf">Tài liệu PDF (.pdf)</option>
              <option value="docx">Văn bản Word (.docx)</option>
              <option value="sheet">Bảng tính Excel (.xlsx)</option>
              <option value="slide">Thuyết trình PowerPoint (.pptx)</option>
              <option value="image">Hình ảnh (.png, .jpg)</option>
              <option value="archive">Tệp nén (.zip, .rar)</option>
            </select>
          </div>

          {/* Shared By Filter Chip */}
          <div className="relative inline-flex items-center">
            <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Người chia sẻ..."
              value={sharedByFilter}
              onChange={(e) => {
                setSharedByFilter(e.target.value);
                setPageNumber(1);
              }}
              className="pl-7 pr-3 py-1.5 text-xs font-medium rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all w-36 sm:w-44 shadow-2xs"
            />
            {sharedByFilter && (
              <button
                onClick={() => setSharedByFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort By Filter Chip */}
          <div className="inline-flex items-center gap-1 bg-white border border-slate-200/80 rounded-full px-2 py-1 shadow-2xs">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-1 text-xs font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              title="Sắp xếp theo"
            >
              <option value="date">Ngày chia sẻ</option>
              <option value="name">Tên tệp</option>
              <option value="size">Dung lượng</option>
            </select>

            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="p-1 text-slate-500 hover:text-slate-900 rounded-full transition-colors cursor-pointer"
              title={sortAsc ? 'Tăng dần (A-Z, nhỏ tới lớn)' : 'Giảm dần (Z-A, mới nhất)'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFileType('all');
                setSharedByFilter('');
                setPageNumber(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Counter Info */}
        <div className="text-[11px] text-slate-500">
          Hiển thị <span className="font-semibold text-slate-700">{items.length}</span> / <span className="font-semibold text-slate-700">{totalCount}</span> tệp
        </div>
      </div>

      {/* 3. SHARED FOLDER BROWSER (Flat Style) */}
      <SharedFolderBrowser
        onOpenFile={handlePreview}
        onDownloadFile={handleDownload}
      />

      {/* 4. MAIN CONTENT AREA */}
      {isLoading ? (
        // Loading Skeletons
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100" />
                  <div className="w-16 h-5 rounded-full bg-slate-100" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="w-6 h-6 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden animate-pulse">
            <div className="h-10 bg-slate-50 border-b border-slate-100" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 border-b border-slate-50 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-slate-100" />
                  <div className="h-4 bg-slate-100 rounded w-48" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-20" />
              </div>
            ))}
          </div>
        )
      ) : errorMessage ? (
        // Error State
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-rose-900">Không thể tải danh sách tệp tin chia sẻ</h3>
          <p className="text-xs text-rose-600 max-w-md mx-auto">{errorMessage}</p>
          <button
            onClick={() => fetchSharedFiles()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại ngay</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        // Flat Empty State (Google Drive Style: Không viền hộp xám bao quanh)
        <div className="py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto shadow-2xs">
            <Share2 className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-800">
              {hasActiveFilters
                ? 'Không tìm thấy tệp tin phù hợp'
                : 'Chưa có tài liệu nào được chia sẻ với bạn'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {hasActiveFilters
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc làm mới bộ lọc định dạng.'
                : 'Khi đồng nghiệp hoặc người quản lý chia sẻ tài liệu với bạn, danh sách tệp tin và quyền truy cập sẽ xuất hiện tại đây.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFileType('all');
                setSharedByFilter('');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-full transition-colors cursor-pointer"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((file) => (
            <div
              key={file.id}
              className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs"
            >
              {/* Card Top */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getPermissionBadge(file.permissionLevel, file.canWrite, file.canDelete)}
                    {file.expiresAtFormatted && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 font-medium">
                        Hết hạn: {file.expiresAtFormatted.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4
                    className="text-xs font-bold text-slate-800 line-clamp-2 hover:text-blue-600 cursor-pointer"
                    title={file.metadata?.title || file.name}
                    onClick={() => handlePreview(file)}
                  >
                    {file.metadata?.title || file.name}
                  </h4>
                  {file.metadata?.title && file.metadata.title.trim().toLowerCase() !== file.name.trim().toLowerCase() && (
                    <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5" title={file.name}>
                      {file.name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span>{file.sizeFormatted}</span>
                    <span>•</span>
                    <span className="uppercase text-[10px] font-mono tracking-wider">{file.extension}</span>
                  </div>
                </div>

                {/* Owner info */}
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    {file.owner.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-700 truncate">{file.owner.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{file.owner.email}</p>
                  </div>
                </div>
              </div>

              {/* Card Bottom: Metadata & Actions */}
              <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span>{file.sharedAtFormatted.split(' ')[0]}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePreview(file)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Mở / Tải xuống"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Tải xuống"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List / Table View
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-3 px-4">Tên tệp</th>
                  <th className="py-3 px-3">Người chia sẻ</th>
                  <th className="py-3 px-3">Quyền hạn</th>
                  <th className="py-3 px-3">Dung lượng</th>
                  <th className="py-3 px-3">Ngày chia sẻ</th>
                  <th className="py-3 px-3">Lưu trữ</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((file) => (
                  <tr key={file.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* File Name & Icon */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {getFileIcon(file.fileType)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer truncate max-w-xs sm:max-w-sm"
                            title={file.metadata?.title || file.name}
                            onClick={() => handlePreview(file)}
                          >
                            {file.metadata?.title || file.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            {file.metadata?.title && file.metadata.title.trim().toLowerCase() !== file.name.trim().toLowerCase() && (
                              <span className="font-mono truncate" title={file.name}>
                                {file.name}
                              </span>
                            )}
                            <span className="uppercase font-mono">{file.extension}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Shared by */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {file.owner.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 truncate">{file.owner.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{file.owner.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Permission */}
                    <td className="py-3 px-3">
                      {getPermissionBadge(file.permissionLevel, file.canWrite, file.canDelete)}
                    </td>

                    {/* Size */}
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {file.sizeFormatted}
                    </td>

                    {/* Shared Date */}
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {file.sharedAtFormatted}
                    </td>

                    {/* Storage Provider */}
                    <td className="py-3 px-3 text-slate-500">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                        <HardDrive className="w-3 h-3 text-slate-400" />
                        {file.storageProvider || 'Cloud Storage'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handlePreview(file)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Mở / Tải xuống"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Tải xuống"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-1">
          <div className="text-xs text-slate-500">
            Trang <span className="font-semibold text-slate-700">{pageNumber}</span> / <span className="font-semibold text-slate-700">{totalPages}</span> (Tổng {totalCount} tệp tin)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1 || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200/80 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>

            <span className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-full border border-blue-100">
              {pageNumber}
            </span>

            <button
              onClick={() => setPageNumber((p) => p + 1)}
              disabled={pageNumber >= totalPages || !hasMore || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200/80 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      </>
      )}

      {/* Modal xem chi tiết siêu dữ liệu tài liệu */}
      <DocumentDetailsModal
        isOpen={Boolean(selectedMetadataFileId)}
        fileId={selectedMetadataFileId}
        onClose={() => setSelectedMetadataFileId(null)}
      />
    </div>
  );
};
