import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
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
  Clock,
  User,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Building2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { SharedFileItem, FileType, DriveItem } from '../types';
import { driveApi } from '../api/driveApi';

interface SharedFilesViewProps {
  onOpenFilePreview: (file: DriveItem) => void;
  onDownloadItem: (item: DriveItem) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type SortField = 'date' | 'name' | 'size';

export const SharedFilesView: React.FC<SharedFilesViewProps> = ({
  onOpenFilePreview,
  onDownloadItem,
  onShowToast,
}) => {
  const [items, setItems] = useState<SharedFileItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageSize] = useState<number>(15);
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
      onShowToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pageNumber, pageSize, debouncedSearch, selectedFileType, sharedByFilter, sortField, sortAsc, onShowToast]);

  useEffect(() => {
    fetchSharedFiles();
  }, [fetchSharedFiles]);

  const getFileIcon = (fileType?: FileType) => {
    switch (fileType) {
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldAlert className="w-3 h-3 text-purple-600" />
          Đồng sở hữu
        </span>
      );
    }
    if (canWrite || level === 'Editor') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          Chỉnh sửa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <ShieldCheck className="w-3 h-3 text-blue-600" />
        Người xem
      </span>
    );
  };

  const toDriveItem = (item: SharedFileItem): DriveItem => {
    return {
      id: item.id,
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
    };
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Tài liệu được chia sẻ với tôi
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Các tệp tin do đồng nghiệp và người quản lý trong tổ chức chia sẻ quyền truy cập
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSharedFiles()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng lưới"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm tệp theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* File Type Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedFileType}
              onChange={(e) => {
                setSelectedFileType(e.target.value);
                setPageNumber(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 cursor-pointer"
            >
              <option value="all">Tất cả định dạng</option>
              <option value="pdf">Tài liệu PDF (.pdf)</option>
              <option value="docx">Văn bản Word (.docx, .doc)</option>
              <option value="sheet">Bảng tính Excel / CSV (.xlsx, .csv)</option>
              <option value="slide">Thuyết trình PowerPoint (.pptx)</option>
              <option value="image">Hình ảnh (.png, .jpg, .webp)</option>
              <option value="archive">Tệp nén (.zip, .rar)</option>
            </select>
          </div>

          {/* Shared By Filter */}
          <div className="md:col-span-4 flex items-center gap-2">
            <div className="relative flex-1">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Người chia sẻ (tên/email)..."
                value={sharedByFilter}
                onChange={(e) => {
                  setSharedByFilter(e.target.value);
                  setPageNumber(1);
                }}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Sort Field & Order */}
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                title="Sắp xếp theo"
              >
                <option value="date">Ngày chia sẻ</option>
                <option value="name">Tên tệp</option>
                <option value="size">Dung lượng</option>
              </select>

              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title={sortAsc ? 'Tăng dần (A-Z, nhỏ tới lớn)' : 'Giảm dần (Z-A, mới nhất)'}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Status / Active Filter summary */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
          <div>
            Đang hiển thị <span className="font-semibold text-slate-700">{items.length}</span> / <span className="font-semibold text-slate-700">{totalCount}</span> tệp tin được chia sẻ
          </div>
          {(debouncedSearch || selectedFileType !== 'all' || sharedByFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFileType('all');
                setSharedByFilter('');
                setPageNumber(1);
              }}
              className="text-blue-600 hover:underline cursor-pointer font-medium"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        // Loading State: Skeletons
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-slate-100" />
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
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="h-10 bg-slate-50 border-b border-slate-200" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 border-b border-slate-100 px-4 flex items-center justify-between">
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
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-rose-900">Không thể tải danh sách tệp tin chia sẻ</h3>
          <p className="text-xs text-rose-600 max-w-md mx-auto">{errorMessage}</p>
          <button
            onClick={() => fetchSharedFiles()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại ngay</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Share2 className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-800">
              {debouncedSearch || selectedFileType !== 'all' || sharedByFilter
                ? 'Không tìm thấy tệp tin phù hợp với bộ lọc'
                : 'Chưa có tài liệu nào được chia sẻ với bạn'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {debouncedSearch || selectedFileType !== 'all' || sharedByFilter
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc làm mới bộ lọc định dạng tệp tin.'
                : 'Khi đồng nghiệp hoặc trưởng phòng ban chia sẻ tài liệu với tài khoản của bạn, danh sách tệp tin và quyền thao tác sẽ hiển thị tại đây.'}
            </p>
          </div>
          {(debouncedSearch || selectedFileType !== 'all' || sharedByFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFileType('all');
                setSharedByFilter('');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
              className="group bg-white rounded-xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
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
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                        Hết hạn: {file.expiresAtFormatted.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4
                    className="text-xs font-bold text-slate-800 line-clamp-2 hover:text-blue-600 cursor-pointer"
                    title={file.name}
                    onClick={() => onOpenFilePreview(toDriveItem(file))}
                  >
                    {file.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span>{file.sizeFormatted}</span>
                    <span>•</span>
                    <span className="uppercase text-[10px] font-mono tracking-wider">{file.extension}</span>
                  </div>
                </div>

                {/* Owner info */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {file.owner.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-700 truncate">{file.owner.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{file.owner.email}</p>
                  </div>
                </div>
              </div>

              {/* Card Bottom: Metadata and Actions */}
              <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span>{file.sharedAtFormatted.split(' ')[0]}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenFilePreview(toDriveItem(file))}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Mở / Tải xuống tệp"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDownloadItem(toDriveItem(file))}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Tải tệp tin xuống"
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
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
                  <tr key={file.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* File Name & Icon */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {getFileIcon(file.fileType)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer truncate max-w-xs sm:max-w-sm"
                            title={file.name}
                            onClick={() => onOpenFilePreview(toDriveItem(file))}
                          >
                            {file.name}
                          </p>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">{file.extension}</span>
                        </div>
                      </div>
                    </td>

                    {/* Shared by */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
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
                          onClick={() => onOpenFilePreview(toDriveItem(file))}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Mở / Tải xuống tệp"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownloadItem(toDriveItem(file))}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-1">
          <div className="text-xs text-slate-500">
            Trang <span className="font-semibold text-slate-700">{pageNumber}</span> / <span className="font-semibold text-slate-700">{totalPages}</span> (Tổng {totalCount} tệp tin)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1 || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>

            <span className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg border border-blue-100">
              {pageNumber}
            </span>

            <button
              onClick={() => setPageNumber((p) => p + 1)}
              disabled={pageNumber >= totalPages || !hasMore || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
