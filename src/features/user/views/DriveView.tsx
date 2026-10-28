import React, { useState, useRef } from 'react';
import {
  Upload,
  FolderPlus,
  Grid,
  List,
  Folder,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Presentation,
  Star,
  Download,
  Share2,
  Trash2,
  RotateCcw,
  Eye,
  ChevronRight,
  ArrowUpDown,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  UploadCloud,
  Server,
  MoreHorizontal,
  Pencil,
  FolderOutput,
} from 'lucide-react';
import { DriveFilter, DriveItem, FileType, UserProfile } from '../types';
import { formatBytes } from '../api/driveApi';
import { FolderDto, BreadcrumbItem } from '../types/folder.types';
import { FolderBreadcrumb } from '../components/FolderBreadcrumb';

interface DriveViewProps {
  items: DriveItem[];
  currentUser: UserProfile;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  searchQuery: string;
  activeFilter: DriveFilter;
  setActiveFilter: (filter: DriveFilter) => void;
  trashItems: DriveItem[];
  trashTotalCount: number;
  trashTotalSizeBytes: number;
  isLoadingTrash: boolean;
  onUploadFile: (files: FileList) => void;
  onUploadDirectFile?: (files: FileList) => void;
  onOpenNewFolderModal: () => void;
  onOpenFilePreview: (file: DriveItem) => void;
  onToggleStar: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onRestoreFile: (id: string) => void;
  onPermanentDeleteFile: (id: string) => void;
  onShareItem: (item: DriveItem) => void;
  onDownloadItem: (item: DriveItem) => void;
  // Folder navigation props
  folders?: FolderDto[];
  breadcrumb?: BreadcrumbItem[];
  onNavigateFolder?: (id: string | null) => void;
  onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
  onMoveFolder?: (folder: FolderDto) => void;
  onTrashFolder?: (folderId: string) => void;
}

type SortField = 'name' | 'updatedAt' | 'size';

export const DriveView: React.FC<DriveViewProps> = ({
  items,
  currentUser,
  currentFolderId,
  setCurrentFolderId,
  searchQuery,
  activeFilter,
  setActiveFilter,
  trashItems,
  trashTotalCount,
  trashTotalSizeBytes,
  isLoadingTrash,
  onUploadFile,
  onUploadDirectFile,
  onOpenNewFolderModal,
  onOpenFilePreview,
  onToggleStar,
  onDeleteFile,
  onRestoreFile,
  onPermanentDeleteFile,
  onShareItem,
  onDownloadItem,
  folders: apiFolders = [],
  breadcrumb = [],
  onNavigateFolder,
  onRenameFolder,
  onMoveFolder,
  onTrashFolder,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Permanent Delete Confirmation State
  const [confirmPermanentItem, setConfirmPermanentItem] = useState<DriveItem | null>(null);

  // Folder rename state
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [folderMenuOpenId, setFolderMenuOpenId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Find current folder hierarchy
  const currentFolder = items.find((i) => i.id === currentFolderId && i.type === 'folder');

  // Determine current active source items
  const sourceItems = activeFilter === 'trash' ? trashItems : items;

  // Filter items based on active tab, search, and folder
  const filteredItems = sourceItems.filter((item) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const matchDept = item.department?.toLowerCase().includes(q);
      return matchName || matchTags || matchDept;
    }

    // In trash view, all items are already filtered by server
    if (activeFilter === 'trash') {
      return true;
    }

    // Starred filter
    if (activeFilter === 'starred') {
      return item.starred;
    }

    // Shared filter
    if (activeFilter === 'shared') {
      return (
        item.sharedWith?.length > 0 ||
        Boolean(item.owner.email && currentUser.email && item.owner.email !== currentUser.email)
      );
    }

    // Mine filter
    if (activeFilter === 'mine') {
      return (
        (!item.sharedWith || item.sharedWith.length === 0) &&
        (
          !item.owner.email ||
          !currentUser.email ||
          item.owner.email === currentUser.email ||
          (item.owner as any).id === currentUser.id ||
          item.owner.name === currentUser.fullName ||
          item.owner.name === 'Tôi'
        )
      );
    }

    // Recent filter
    if (activeFilter === 'recent') {
      return true;
    }

    // Folder navigation (for 'all')
    if (currentFolderId === null) {
      return item.parentId === null || !item.parentId;
    }
    return item.parentId === currentFolderId;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!searchQuery && a.type !== b.type && activeFilter !== 'trash') {
      return a.type === 'folder' ? -1 : 1;
    }

    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'size') {
      comparison = a.size - b.size;
    } else {
      comparison = a.updatedAt.localeCompare(b.updatedAt);
    }

    return sortAsc ? comparison : -comparison;
  });

  const folders = activeFilter === 'trash' ? [] : sortedItems.filter((i) => i.type === 'folder');
  const files = activeFilter === 'trash' ? sortedItems : sortedItems.filter((i) => i.type === 'file');

  const handleDragOver = (e: React.DragEvent) => {
    if (activeFilter === 'trash') return;
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (activeFilter === 'trash') return;
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFile(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFile(e.target.files);
      e.target.value = '';
    }
  };

  const handleDirectFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onUploadDirectFile) {
        onUploadDirectFile(e.target.files);
      } else {
        onUploadFile(e.target.files);
      }
      e.target.value = '';
    }
  };

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
        return <ImageIcon className="w-5 h-5 text-violet-500" />;
      case 'code':
        return <FileCode className="w-5 h-5 text-slate-700" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-amber-700" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-6 relative min-h-[calc(100vh-14rem)]"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={directFileInputRef}
        onChange={handleDirectFileInputChange}
        multiple
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-blue-50/95 border-2 border-dashed border-blue-500 rounded-2xl flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs">
          <Upload className="w-12 h-12 text-blue-600 animate-bounce mb-3" />
          <p className="text-lg font-bold text-blue-900">Thả tệp vào đây để tải lên CloudDMS</p>
          <p className="text-sm text-blue-600 mt-1">Hỗ trợ PDF, Word, Excel, Slide, Ảnh, Zip và mã nguồn</p>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 text-sm">
          {activeFilter === 'trash' ? (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-rose-800 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Thùng rác (Recycle Bin)
              </span>
            </div>
          ) : onNavigateFolder ? (
            <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={onNavigateFolder} />
          ) : (
            <>
              <button
                onClick={() => setCurrentFolderId(null)}
                className={`font-semibold transition-colors cursor-pointer ${
                  currentFolderId === null ? 'text-slate-900 text-lg' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                My Drive
              </button>
              {currentFolder && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-900 text-lg">{currentFolder.name}</span>
                </>
              )}
            </>
          )}

          {searchQuery && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium ml-2">
              Tìm kiếm: "{searchQuery}"
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {activeFilter !== 'trash' && (
            <>
              <button
                onClick={onOpenNewFolderModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium shadow-xs transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-slate-500" />
                <span>Thư mục mới</span>
              </button>

              {/* Nút 1: Tải trực tiếp Cloud (Phương pháp mới) */}
              <button
                onClick={() => directFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                title="Tải trực tiếp lên Cloud (Google Drive / OneDrive / S3) - Tốc độ cao, không nghẽn Server"
              >
                <UploadCloud className="w-4 h-4 stroke-[2.2]" />
                <span>Tải lên Cloud (Direct)</span>
                <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full tracking-wide">
                  Mới
                </span>
              </button>

              {/* Nút 2: Tải qua Server (Phương pháp cũ) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium shadow-xs transition-colors cursor-pointer"
                title="Tải tệp qua Backend Server (Phương pháp truyền thống)"
              >
                <Server className="w-4 h-4 text-slate-500" />
                <span>Tải qua Server</span>
              </button>
            </>
          )}

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

      {/* Filter Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              setActiveFilter('all');
              setCurrentFolderId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Tất cả tài liệu
          </button>
          <button
            onClick={() => setActiveFilter('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === 'mine'
                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Tài liệu của tôi
          </button>
          <button
            onClick={() => setActiveFilter('shared')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === 'shared'
                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Được chia sẻ
          </button>
          <button
            onClick={() => setActiveFilter('recent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === 'recent'
                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Gần đây
          </button>
          <button
            onClick={() => setActiveFilter('starred')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'starred'
                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>Có gắn dấu sao</span>
          </button>
          <button
            onClick={() => setActiveFilter('trash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'trash'
                ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-200'
                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50/50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Thùng rác</span>
            {trashTotalCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                {trashTotalCount}
              </span>
            )}
          </button>
        </div>

        {/* Sort Trigger */}
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span>Sắp xếp:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="bg-white border border-slate-200 text-slate-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="updatedAt">Ngày sửa đổi</option>
            <option value="name">Tên tệp (A-Z)</option>
            <option value="size">Kích thước</option>
          </select>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
            title="Đảo chiều sắp xếp"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TRASH BANNER (When in trash view) */}
      {activeFilter === 'trash' && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50/40 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-rose-950">
                Thùng rác đang chứa {trashTotalCount} tài liệu · Tổng dung lượng: {formatBytes(trashTotalSizeBytes)}
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Các tệp trong thùng rác có thể được khôi phục về danh mục ban đầu hoặc xóa vĩnh viễn để giải phóng hạn mức Quota lưu trữ.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoadingTrash && activeFilter === 'trash' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center my-8">
          <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Đang nạp danh sách thùng rác...</h3>
        </div>
      ) : (sortedItems.length === 0 && (activeFilter === 'trash' || apiFolders.length === 0)) ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center my-8">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
            activeFilter === 'trash' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {activeFilter === 'trash' ? (
              <Trash2 className="w-8 h-8 stroke-[1.8]" />
            ) : (
              <Upload className="w-8 h-8 stroke-[1.8]" />
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {activeFilter === 'trash'
              ? (searchQuery.trim() ? `Không tìm thấy tài liệu phù hợp với "${searchQuery}" trong thùng rác` : 'Thùng rác rỗng')
              : (searchQuery.trim() ? `Không tìm thấy tài liệu phù hợp với "${searchQuery}"` : 'Không tìm thấy tài liệu nào')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            {activeFilter === 'trash'
              ? (searchQuery.trim() ? 'Hãy thử kiểm tra lại từ khóa tìm kiếm.' : 'Không có tệp tin nào trong thùng rác của bạn hoặc phòng ban.')
              : (searchQuery.trim() ? 'Hãy thử kiểm tra lại chính tả hoặc tìm kiếm bằng từ khóa ngắn hơn.' : 'Kéo thả tệp từ máy tính của bạn vào đây hoặc nhấn vào nút "Tải tệp lên" để bắt đầu.')}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* API Folders Section (from backend) */}
          {activeFilter !== 'trash' && apiFolders.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Thư mục ({apiFolders.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {apiFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="bg-white rounded-xl p-4 border border-slate-200/90 hover:border-amber-400 hover:shadow-sm transition-all group flex items-center justify-between relative"
                  >
                    <div
                      onClick={() => onNavigateFolder && onNavigateFolder(folder.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Folder className="w-5 h-5 fill-current" />
                      </div>
                      <div className="min-w-0">
                        {renamingFolderId === folder.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                if (renameValue.trim() && onRenameFolder) {
                                  await onRenameFolder(folder.id, renameValue.trim());
                                }
                                setRenamingFolderId(null);
                              } else if (e.key === 'Escape') {
                                setRenamingFolderId(null);
                              }
                            }}
                            onBlur={async () => {
                              if (renameValue.trim() && onRenameFolder) {
                                await onRenameFolder(folder.id, renameValue.trim());
                              }
                              setRenamingFolderId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-semibold text-slate-900 border border-blue-400 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                            {folder.name}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400">{new Date(folder.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                    {/* Action menu */}
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderMenuOpenId(folderMenuOpenId === folder.id ? null : folder.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Tùy chọn"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {folderMenuOpenId === folder.id && (
                        <div
                          className="absolute right-0 top-7 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]"
                          onMouseLeave={() => setFolderMenuOpenId(null)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderMenuOpenId(null);
                              setRenamingFolderId(folder.id);
                              setRenameValue(folder.name);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Đổi tên
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderMenuOpenId(null);
                              if (onMoveFolder) onMoveFolder(folder);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                          >
                            <FolderOutput className="w-3.5 h-3.5" />
                            Di chuyển
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderMenuOpenId(null);
                              if (window.confirm(`Chuyển thư mục "${folder.name}" vào thùng rác?`)) {
                                if (onTrashFolder) onTrashFolder(folder.id);
                              }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xoá vào thùng rác
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Folders Section (from DriveItem list) */}
          {folders.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Thư mục ({folders.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onDoubleClick={() => setCurrentFolderId(folder.id)}
                    className="bg-white rounded-xl p-4 border border-slate-200/90 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Folder className="w-5 h-5 fill-current" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {folder.name}
                        </p>
                        <p className="text-[11px] text-slate-400">{folder.sizeFormatted}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {files.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {activeFilter === 'trash' ? `Tệp tin trong thùng rác (${files.length})` : `Tệp tin (${files.length})`}
              </h3>

              {viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => onOpenFilePreview(file)}
                      className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                        activeFilter === 'trash'
                          ? 'border-rose-100 hover:border-rose-300'
                          : 'border-slate-200/90 hover:border-blue-400'
                      }`}
                    >
                      {/* Card Content Top */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
                              {getFileIcon(file.fileType)}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors"
                                title={file.name}
                              >
                                {file.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {file.deletedAt ? `Xóa: ${file.deletedAt}` : `Tạo: ${file.createdAt}`}
                              </p>
                            </div>
                          </div>

                          {activeFilter !== 'trash' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleStar(file.id);
                              }}
                              className="text-slate-300 hover:text-amber-500 transition-colors shrink-0 p-1 cursor-pointer"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  file.starred ? 'fill-amber-400 text-amber-500' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Tags */}
                        {file.tags && file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {file.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span className="font-mono">{file.sizeFormatted}</span>

                        <div className="flex items-center gap-1.5">
                          {activeFilter === 'trash' ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRestoreFile(file.id);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold text-[11px]"
                                title="Khôi phục tệp tin"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Khôi phục</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmPermanentItem(file);
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Xóa vĩnh viễn"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShareItem(file);
                                }}
                                className="p-1 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
                                title="Chia sẻ liên kết"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDownloadItem(file);
                                }}
                                className="p-1 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
                                title="Tải về máy"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteFile(file.id);
                                }}
                                className="p-1 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                                title="Chuyển vào thùng rác"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[11px] bg-slate-50/50">
                          <th className="py-3.5 px-4 text-center w-14 font-semibold">STT</th>
                          <th className="py-3.5 px-6">Tên tài liệu</th>
                          <th className="py-3.5 px-6">Chủ sở hữu</th>
                          <th className="py-3.5 px-6">
                            {activeFilter === 'trash' ? 'Thời gian xóa' : 'Cập nhật lần cuối'}
                          </th>
                          <th className="py-3.5 px-6">Kích thước</th>
                          <th className="py-3.5 px-6 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {files.map((file, index) => (
                          <tr
                            key={file.id}
                            onClick={() => onOpenFilePreview(file)}
                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          >
                            <td className="py-3.5 px-4 text-center font-mono text-slate-500 font-medium text-xs">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-3">
                                {activeFilter !== 'trash' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleStar(file.id);
                                    }}
                                    className="text-slate-300 hover:text-amber-500 cursor-pointer"
                                  >
                                    <Star
                                      className={`w-4 h-4 ${
                                        file.starred ? 'fill-amber-400 text-amber-500' : ''
                                      }`}
                                    />
                                  </button>
                                )}
                                <div className="shrink-0">{getFileIcon(file.fileType)}</div>
                                <div>
                                  <span className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer">
                                    {file.name}
                                  </span>
                                  {file.tags.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                                      {file.tags.join(' · ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-slate-600">
                              <span className="font-medium text-slate-700">{file.owner.name}</span>
                              {file.deletedBy && (
                                <span className="block text-[10px] text-rose-600">
                                  Người xóa: {file.deletedBy}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-6 text-slate-500">
                              {file.deletedAt || file.updatedAt}
                            </td>
                            <td className="py-3.5 px-6 text-slate-600 font-mono">{file.sizeFormatted}</td>
                            <td className="py-3.5 px-6 text-right">
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-end gap-1"
                              >
                                {activeFilter === 'trash' ? (
                                  <>
                                    <button
                                      onClick={() => onRestoreFile(file.id)}
                                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Khôi phục về thư mục ban đầu"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Khôi phục</span>
                                    </button>
                                    <button
                                      onClick={() => setConfirmPermanentItem(file)}
                                      className="p-1.5 hover:bg-rose-50 rounded text-rose-600 transition-colors cursor-pointer"
                                      title="Xóa vĩnh viễn"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => onShareItem(file)}
                                      className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                                      title="Chia sẻ"
                                    >
                                      <Share2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => onDownloadItem(file)}
                                      className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                                      title="Tải về"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => onDeleteFile(file.id)}
                                      className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                                      title="Chuyển vào thùng rác"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Permanent Delete */}
      {confirmPermanentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Xóa vĩnh viễn tài liệu?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tài liệu <b>"{confirmPermanentItem.name}"</b> ({confirmPermanentItem.sizeFormatted}) sẽ bị xóa vĩnh viễn khỏi Cloud Storage và hoàn trả dung lượng lưu trữ Quota. Thao tác này <b>không thể hoàn tác</b>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmPermanentItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onPermanentDeleteFile(confirmPermanentItem.id);
                  setConfirmPermanentItem(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
