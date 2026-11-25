import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Users,
  UserX,
  Download,
  Eye,
  Search,
  X,
  Grid,
  List,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Presentation,
  Folder,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MoreVertical,
  Check,
} from 'lucide-react';
import { SharedByMeFileItem, SharedByMeRecipient, FileType, DriveItem } from '../types';
import { driveApi } from '../api/driveApi';
import { ShareModal } from './ShareModal';
import { DocumentDetailsModal } from '@/features/document-submission';

export interface SharedByMeViewProps {
  onOpenFilePreview?: (file: DriveItem) => void;
  onDownloadItem?: (item: DriveItem) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type SortField = 'date' | 'name' | 'size';

export const SharedByMeView: React.FC<SharedByMeViewProps> = ({
  onOpenFilePreview,
  onDownloadItem,
  onShowToast,
}) => {
  const [items, setItems] = useState<SharedByMeFileItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [recipientEmailFilter, setRecipientEmailFilter] = useState<string>('');

  // Sorting & View mode
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modal states
  const [shareManageFile, setShareManageFile] = useState<DriveItem | null>(null);
  const [detailsFileId, setDetailsFileId] = useState<string | null>(null);
  const [confirmRevokeAllFile, setConfirmRevokeAllFile] = useState<SharedByMeFileItem | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [revokingRecipientId, setRevokingRecipientId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageNumber(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch shared-by-me files
  const fetchSharedByMeFiles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await driveApi.getSharedByMeFiles({
        pageNumber,
        pageSize,
        searchTerm: debouncedSearch || undefined,
        fileType: selectedFileType !== 'all' ? selectedFileType : undefined,
        recipientEmail: recipientEmailFilter || undefined,
        sortBy: sortField,
        sortDirection: sortAsc ? 'asc' : 'desc',
      });

      setItems(response.items);
      setTotalCount(response.totalCount);
      setHasMore(Boolean(response.hasMore));
    } catch (error: any) {
      console.error('Lỗi nạp tệp tin tôi đã chia sẻ:', error);
      const msg = error?.response?.data?.error
        || error?.response?.data?.message
        || 'Không thể tải danh sách tệp tin bạn đã chia sẻ từ máy chủ.';
      setErrorMessage(msg);
      if (onShowToast) onShowToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pageNumber, pageSize, debouncedSearch, selectedFileType, recipientEmailFilter, sortField, sortAsc, onShowToast]);

  useEffect(() => {
    fetchSharedByMeFiles();
  }, [fetchSharedByMeFiles]);

  const toDriveItem = (item: SharedByMeFileItem): DriveItem => {
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
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
      storageProvider: item.storageProvider,
      owner: { name: 'Tôi', email: '' },
      parentId: null,
      starred: false,
      trashed: false,
      sharedWith: item.recipients.map((r) => r.email),
      tags: [],
      department: item.department,
      metadata: item.metadata,
      scanStatus: item.scanStatus as any,
    };
  };

  const handleDownload = (item: SharedByMeFileItem) => {
    const driveItem = toDriveItem(item);
    if (onDownloadItem) {
      onDownloadItem(driveItem);
    } else {
      void driveApi.downloadFile(item.id, item.name);
    }
  };

  const handlePreview = (item: SharedByMeFileItem) => {
    const driveItem = toDriveItem(item);
    if (onOpenFilePreview) {
      onOpenFilePreview(driveItem);
    } else {
      handleDownload(item);
    }
  };

  // Thu hồi quyền 1 người nhận cụ thể
  const handleRevokeSingle = async (file: SharedByMeFileItem, recipient: SharedByMeRecipient) => {
    try {
      setRevokingRecipientId(recipient.recipientId);
      await driveApi.revokeShare(file.id, recipient.recipientId);
      if (onShowToast) {
        onShowToast(`Đã thu hồi quyền truy cập của ${recipient.name || recipient.email} thành công!`, 'success');
      }
      await fetchSharedByMeFiles();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Thu hồi quyền chia sẻ thất bại.';
      if (onShowToast) onShowToast(msg, 'error');
    } finally {
      setRevokingRecipientId(null);
    }
  };

  // Thu hồi toàn bộ quyền của tệp
  const handleRevokeAll = async () => {
    if (!confirmRevokeAllFile) return;
    try {
      setIsRevoking(true);
      let successCount = 0;
      for (const recipient of confirmRevokeAllFile.recipients) {
        try {
          await driveApi.revokeShare(confirmRevokeAllFile.id, recipient.recipientId);
          successCount++;
        } catch (e) {
          console.error('Lỗi khi thu hồi người nhận:', recipient.email, e);
        }
      }
      if (onShowToast) {
        onShowToast(`Đã thu hồi toàn bộ ${successCount} người nhận của tệp "${confirmRevokeAllFile.name}".`, 'success');
      }
      setConfirmRevokeAllFile(null);
      await fetchSharedByMeFiles();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Có lỗi khi thu hồi chia sẻ.';
      if (onShowToast) onShowToast(msg, 'error');
    } finally {
      setIsRevoking(false);
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

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasActiveFilters = Boolean(debouncedSearch || selectedFileType !== 'all' || recipientEmailFilter);

  return (
    <div className="space-y-4">
      {/* 1. FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên tệp hoặc tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and View Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* File Type Filter */}
          <select
            value={selectedFileType}
            onChange={(e) => {
              setSelectedFileType(e.target.value);
              setPageNumber(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="all">Mọi loại tệp</option>
            <option value="pdf">Tài liệu PDF (.pdf)</option>
            <option value="docx">Văn bản Word (.docx)</option>
            <option value="sheet">Bảng tính Excel (.xlsx)</option>
            <option value="image">Hình ảnh</option>
            <option value="archive">Tệp nén (.zip, .rar)</option>
          </select>

          {/* Sort Field */}
          <button
            type="button"
            onClick={() => {
              if (sortField === 'date') setSortAsc(!sortAsc);
              else {
                setSortField('date');
                setSortAsc(false);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
              sortField === 'date'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Ngày chia sẻ</span>
            <ArrowUpDown className="w-3 h-3 opacity-60" />
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchSharedByMeFiles()}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem danh sách"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng lưới"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Đang tải danh sách tệp tin bạn đã chia sẻ...</p>
          <p className="text-xs text-slate-400">Kiểm tra thông tin người nhận và quyền hạn truy cập</p>
        </div>
      ) : errorMessage ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 max-w-lg mx-auto my-8">
          <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-rose-500" />
          <p className="font-semibold text-sm mb-1">{errorMessage}</p>
          <button
            onClick={() => fetchSharedByMeFiles()}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Share2 className="w-8 h-8 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {hasActiveFilters ? 'Không tìm thấy tệp nào phù hợp' : 'Bạn chưa chia sẻ tệp tin nào'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {hasActiveFilters
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc loại tệp.'
              : 'Khi bạn chia sẻ tệp cho đồng nghiệp trong tổ chức, thông tin tệp và quyền truy cập của người nhận sẽ hiển thị tại đây để bạn tiện quản lý và thu hồi.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* TABLE VIEW (Khuyên dùng - hiển thị trực tiếp danh sách người nhận & nút thu hồi nhanh) */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Tệp tin</th>
                  <th className="py-3 px-4 min-w-[280px]">Đang chia sẻ với</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Dung lượng</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((file) => (
                  <tr key={file.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Tên tệp & Metadata */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/60 shrink-0 mt-0.5">
                          {getFileIcon(file.fileType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-bold text-slate-900 truncate hover:text-blue-600 transition-colors cursor-pointer text-xs"
                            title={file.title || file.name}
                            onClick={() => handlePreview(file)}
                          >
                            {file.title || file.name}
                          </p>
                          {file.title && file.title.trim().toLowerCase() !== file.name.trim().toLowerCase() && (
                            <p className="text-[10px] text-slate-400 font-mono truncate" title={file.name}>
                              {file.name}
                            </p>
                          )}
                          {file.department && (
                            <span className="inline-block mt-0.5 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                              {file.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Danh sách Người nhận & Quyền hạn */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {file.recipients.map((recipient) => (
                            <div
                              key={recipient.recipientId}
                              className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-[11px] text-slate-700 transition-colors"
                              title={`${recipient.name} (${recipient.email}) - Quyền: ${recipient.role === 'Editor' ? 'Chỉnh sửa' : 'Xem'}`}
                            >
                              <span className="truncate max-w-[140px] font-medium">
                                {recipient.name || recipient.email}
                              </span>
                              <span
                                className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                  recipient.role === 'Editor'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {recipient.role === 'Editor' ? 'Sửa' : 'Xem'}
                              </span>
                              {/* Nút thu hồi riêng từng người */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevokeSingle(file, recipient);
                                }}
                                disabled={revokingRecipientId === recipient.recipientId}
                                className="p-0.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                title={`Thu hồi quyền của ${recipient.name || recipient.email}`}
                              >
                                {revokingRecipientId === recipient.recipientId ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                        {file.recipients.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">Không có người nhận trực tiếp</span>
                        )}
                      </div>
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {file.latestSharedAtFormatted}
                    </td>

                    {/* Dung lượng */}
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {file.sizeFormatted}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Nút Quản lý chia sẻ */}
                        <button
                          type="button"
                          onClick={() => setShareManageFile(toDriveItem(file))}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          title="Quản lý chi tiết người nhận"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Quản lý</span>
                        </button>

                        {/* Nút Thu hồi toàn bộ */}
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeAllFile(file)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hủy chia sẻ tệp này với tất cả mọi người"
                        >
                          <UserX className="w-4 h-4" />
                        </button>

                        {/* Tải xuống */}
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Tải xuống tệp"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Chi tiết siêu dữ liệu */}
                        <button
                          type="button"
                          onClick={() => setDetailsFileId(file.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Xem chi tiết tài liệu"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW (Dạng thẻ trực quan) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 shrink-0">
                      {getFileIcon(file.fileType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-xs font-bold text-slate-900 truncate hover:text-blue-600 cursor-pointer transition-colors"
                        title={file.title || file.name}
                        onClick={() => handlePreview(file)}
                      >
                        {file.title || file.name}
                      </h4>
                      {file.title && file.title.trim().toLowerCase() !== file.name.trim().toLowerCase() && (
                        <p className="text-[10px] text-slate-400 font-mono truncate">{file.name}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShareManageFile(toDriveItem(file))}
                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Quản lý chia sẻ"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span>{file.sizeFormatted}</span>
                  <span>{file.latestSharedAtFormatted}</span>
                </div>
              </div>

              {/* Recipients Footer on Card */}
              <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                    Chia sẻ ({file.recipients.length}):
                  </span>
                  <div className="flex items-center -space-x-1 overflow-hidden">
                    {file.recipients.slice(0, 3).map((r) => (
                      <span
                        key={r.recipientId}
                        className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center border border-white"
                        title={`${r.name} (${r.email})`}
                      >
                        {r.name.charAt(0).toUpperCase()}
                      </span>
                    ))}
                    {file.recipients.length > 3 && (
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center border border-white">
                        +{file.recipients.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShareManageFile(toDriveItem(file))}
                    className="px-2 py-0.8 text-[10px] font-bold text-blue-600 hover:bg-blue-100/60 rounded-md transition-colors"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRevokeAllFile(file)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                    title="Thu hồi toàn bộ"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. PAGINATION */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <p>
            Hiển thị <span className="font-semibold text-slate-800">{(pageNumber - 1) * pageSize + 1}</span> -{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(pageNumber * pageSize, totalCount)}
            </span>{' '}
            trong <span className="font-semibold text-slate-800">{totalCount}</span> tệp đã chia sẻ
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber === 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
              {pageNumber} / {totalPages}
            </span>
            <button
              onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              disabled={pageNumber >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. MODALS */}
      {/* Modal Quản lý phân quyền & Thu hồi chi tiết */}
      {shareManageFile && (
        <ShareModal
          key={shareManageFile.id}
          item={shareManageFile}
          onClose={() => setShareManageFile(null)}
          onShareSuccess={(msg) => {
            if (onShowToast) onShowToast(msg, 'success');
          }}
          onChanged={() => {
            fetchSharedByMeFiles();
          }}
        />
      )}

      {/* Modal Xác nhận thu hồi toàn bộ */}
      {confirmRevokeAllFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Thu hồi chia sẻ tệp</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{confirmRevokeAllFile.name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Bạn có chắc chắn muốn hủy chia sẻ tệp này với <strong>tất cả {confirmRevokeAllFile.recipients.length} người nhận</strong>? 
              Sau khi thu hồi, những người này sẽ không còn quyền xem hoặc chỉnh sửa tệp này nữa.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmRevokeAllFile(null)}
                disabled={isRevoking}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleRevokeAll}
                disabled={isRevoking}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isRevoking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isRevoking ? 'Đang thu hồi...' : 'Thu hồi toàn bộ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết metadata tài liệu */}
      {detailsFileId && (
        <DocumentDetailsModal
          fileId={detailsFileId}
          isOpen={Boolean(detailsFileId)}
          onClose={() => setDetailsFileId(null)}
        />
      )}
    </div>
  );
};
export default SharedByMeView;
