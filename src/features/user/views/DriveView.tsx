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
  Eye,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { DriveItem, FileType, UserProfile } from '../types';

interface DriveViewProps {
  items: DriveItem[];
  currentUser: UserProfile;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  searchQuery: string;
  onUploadFile: (files: FileList) => void;
  onOpenNewFolderModal: () => void;
  onOpenFilePreview: (file: DriveItem) => void;
  onToggleStar: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onShareItem: (item: DriveItem) => void;
  onDownloadItem: (item: DriveItem) => void;
}

type DriveFilter = 'all' | 'mine' | 'shared' | 'recent' | 'starred' | 'trash';
type SortField = 'name' | 'updatedAt' | 'size';

export const DriveView: React.FC<DriveViewProps> = ({
  items,
  currentUser,
  currentFolderId,
  setCurrentFolderId,
  searchQuery,
  onUploadFile,
  onOpenNewFolderModal,
  onOpenFilePreview,
  onToggleStar,
  onDeleteFile,
  onShareItem,
  onDownloadItem,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<DriveFilter>('all');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find current folder hierarchy
  const currentFolder = items.find((i) => i.id === currentFolderId && i.type === 'folder');

  // Filter items based on active tab, search, and folder
  const filteredItems = items.filter((item) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const matchDept = item.department?.toLowerCase().includes(q);
      return matchName || matchTags || matchDept;
    }

    // Trashed filter
    if (activeFilter === 'trash') {
      return item.trashed;
    }
    if (item.trashed) return false;

    // Starred filter
    if (activeFilter === 'starred') {
      return item.starred;
    }

    // Shared filter
    if (activeFilter === 'shared') {
      return item.sharedWith.length > 0 && item.owner.email !== currentUser.email;
    }

    // Mine filter
    if (activeFilter === 'mine') {
      return item.owner.email === currentUser.email;
    }

    // Recent filter
    if (activeFilter === 'recent') {
      return true;
    }

    // Folder navigation
    return item.parentId === currentFolderId;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!searchQuery && a.type !== b.type) {
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

  const folders = sortedItems.filter((i) => i.type === 'folder');
  const files = sortedItems.filter((i) => i.type === 'file');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
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
          {searchQuery && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium ml-2">
              Kết quả tìm kiếm: "{searchQuery}"
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewFolderModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            <span>Thư mục mới</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span>Tải tệp lên</span>
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
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Tất cả tài liệu
          </button>
          <button
            onClick={() => setActiveFilter('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === 'mine'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Tài liệu của tôi
          </button>
          <button
            onClick={() => setActiveFilter('shared')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === 'shared'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Được chia sẻ
          </button>
          <button
            onClick={() => setActiveFilter('recent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === 'recent'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Gần đây
          </button>
          <button
            onClick={() => setActiveFilter('starred')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'starred'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>Có gắn dấu sao</span>
          </button>
          <button
            onClick={() => setActiveFilter('trash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === 'trash'
                ? 'bg-red-50 text-red-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Thùng rác
          </button>
        </div>

        {/* Sort Trigger */}
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span>Sắp xếp:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="bg-white border border-slate-200 text-slate-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      {/* Main Content Area */}
      {sortedItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center my-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Không tìm thấy tài liệu nào</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Kéo thả tệp từ máy tính của bạn vào đây hoặc nhấn vào nút "Tải tệp lên" để bắt đầu lưu trữ tài liệu đám mây an toàn.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            Chọn tệp tải lên
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(folder.id);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-500 rounded cursor-pointer"
                        title="Gắn sao"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            folder.starred ? 'fill-amber-400 text-amber-500' : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(folder.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Xóa thư mục"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                Tài liệu & Tệp tin ({files.length})
              </h3>

              {viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => onOpenFilePreview(file)}
                      className="bg-white rounded-xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all group overflow-hidden cursor-pointer flex flex-col justify-between"
                    >
                      {/* Thumbnail / Header Preview */}
                      <div className="p-4 pb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                            {getFileIcon(file.fileType)}
                          </div>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {file.extension || 'file'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStar(file.id);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                file.starred ? 'fill-amber-400 text-amber-500' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* File Card Body Preview */}
                      <div className="px-4 py-2">
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {file.name}
                        </h4>
                        {file.contentSnippet ? (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-mono text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100/80">
                            {file.contentSnippet}
                          </p>
                        ) : file.previewUrl ? (
                          <div className="mt-1 h-20 w-full rounded overflow-hidden bg-slate-100">
                            <img
                              src={file.previewUrl}
                              alt={file.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-1">Đã mã hóa và xác thực đám mây</p>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span>{file.sizeFormatted}</span>
                        <div className="flex items-center gap-1.5">
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
                            className="p-1 hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer"
                            title="Xóa tệp"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                          <th className="py-3.5 px-6">Cập nhật lần cuối</th>
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
                            {/* STT */}
                            <td className="py-3.5 px-4 text-center font-mono text-slate-500 font-medium text-xs">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-3">
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
                            </td>
                            <td className="py-3.5 px-6 text-slate-500">{file.updatedAt}</td>
                            <td className="py-3.5 px-6 text-slate-600 font-mono">{file.sizeFormatted}</td>
                            <td className="py-3.5 px-6 text-right">
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-end gap-1"
                              >
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
                                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-4 h-4" />
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
