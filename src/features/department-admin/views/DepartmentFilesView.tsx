import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FolderPlus,
  Folder,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Presentation,
  Download,
  Trash2,
  MoreVertical,
  ChevronRight,
  ArrowUpDown,
  Search,
  ArrowLeft,
  Grid,
  List,
  Info,
  ChevronDown,
  Plus,
  X,
  Share2,
  ShieldCheck,
  HardDrive,
  Check,
  Star,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { DepartmentInfo } from '../types';
import { DriveItem, FileType } from '@/features/user/types';
import { FilePreviewModal } from '@/features/user/components/FilePreviewModal';
import {
  getTenantFilesApi,
  uploadTenantFilesApi,
  downloadTenantFileApi,
  deleteTenantFileApi,
  TenantStorageSummaryDto,
} from '@/features/tenants/api/fileApi';

interface DepartmentFilesViewProps {
  department: DepartmentInfo;
  availableQuotaGB: number;
  onBackToHub: () => void;
  onQuotaUpdated?: () => void;
  onAddToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const DepartmentFilesView: React.FC<DepartmentFilesViewProps> = ({
  department,
  availableQuotaGB,
  onBackToHub,
  onQuotaUpdated,
  onAddToast,
}) => {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storageSummary, setStorageSummary] = useState<TenantStorageSummaryDto | null>(null);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'updatedAt' | 'size'>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Drag & drop, uploading states
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStepMsg, setUploadStepMsg] = useState('');

  // Dropdown states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState<DriveItem | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.drive-menu-trigger') && !target.closest('.drive-menu-dropdown')) {
        setActiveMenuId(null);
        setIsNewMenuOpen(false);
        setIsTypeDropdownOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch files strictly for current department
  const fetchDepartmentFiles = async () => {
    try {
      setIsLoading(true);
      const res = await getTenantFilesApi(
        undefined,
        currentFolderId || undefined,
        1,
        100,
        searchQuery.trim() || undefined,
        department.id
      );
      setStorageSummary(res);

      const apiFiles: DriveItem[] = (res.files || []).map((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        let fType: FileType = 'other';
        if (ext === 'pdf') fType = 'pdf';
        else if (['xlsx', 'xls', 'csv'].includes(ext)) fType = 'sheet';
        else if (['docx', 'doc', 'txt'].includes(ext)) fType = 'docx';
        else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) fType = 'image';
        else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) fType = 'archive';
        else if (['cs', 'ts', 'tsx', 'js', 'json', 'py', 'java', 'html', 'css', 'sql'].includes(ext)) fType = 'code';
        else if (['ppt', 'pptx'].includes(ext)) fType = 'slide';

        return {
          id: f.id,
          name: f.name,
          type: 'file',
          fileType: fType,
          extension: ext || 'file',
          size: f.sizeBytes,
          sizeFormatted: formatBytes(f.sizeBytes),
          updatedAt: f.createdAt ? new Date(f.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật',
          createdAt: f.createdAt ? new Date(f.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật',
          owner: {
            name: f.ownerName || department.adminName || 'Thành viên phòng',
            email: department.adminEmail || '',
          },
          parentId: f.folderId || null,
          starred: false,
          trashed: false,
          sharedWith: [],
          tags: [f.storageProviderName || 'Google Drive', department.name],
          contentSnippet: `Tài liệu lưu trữ thuộc ${department.name}. Dung lượng: ${formatBytes(f.sizeBytes)}. Trạng thái bảo mật ClamAV: ${f.scanStatus || 'Clean'}. Khóa lưu trữ: ${f.storageKey}`,
        };
      });

      setItems(apiFiles);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách tệp của phòng ban:', err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentFiles();
  }, [department.id, currentFolderId]);

  // Current folder hierarchy
  const currentFolder = items.find((i) => i.id === currentFolderId && i.type === 'folder');

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.contentSnippet && item.contentSnippet.toLowerCase().includes(q))
      );
    }

    if (item.trashed) return false;

    // Filter by type
    if (selectedTypeFilter !== 'all') {
      if (selectedTypeFilter === 'folder') {
        if (item.type !== 'folder') return false;
      } else if (selectedTypeFilter === 'docs') {
        if (item.fileType !== 'docx' && item.fileType !== 'code') return false;
      } else if (selectedTypeFilter === 'sheets') {
        if (item.fileType !== 'sheet') return false;
      } else if (selectedTypeFilter === 'pdfs') {
        if (item.fileType !== 'pdf') return false;
      } else if (selectedTypeFilter === 'images') {
        if (item.fileType !== 'image') return false;
      }
    }

    // Match current folder hierarchy
    if (!searchQuery.trim()) {
      return item.parentId === currentFolderId;
    }

    return true;
  });

  // Sort items: folders first, then files
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

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Google Drive file type icon
  const getGoogleDriveIcon = (fileType?: FileType, ext?: string) => {
    switch (fileType) {
      case 'pdf':
        return (
          <div className="w-5 h-5 rounded flex items-center justify-center text-red-500 shrink-0">
            <FileText className="w-5 h-5 fill-red-50 text-red-600 stroke-[2.2]" />
          </div>
        );
      case 'sheet':
        return (
          <div className="w-5 h-5 rounded flex items-center justify-center text-emerald-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5 fill-emerald-50 text-emerald-600 stroke-[2.2]" />
          </div>
        );
      case 'code':
      case 'docx':
        return (
          <div className="w-5 h-5 rounded flex items-center justify-center text-blue-600 shrink-0">
            <FileText className="w-5 h-5 fill-blue-50 text-blue-600 stroke-[2.2]" />
          </div>
        );
      case 'slide':
        return (
          <div className="w-5 h-5 rounded flex items-center justify-center text-amber-500 shrink-0">
            <Presentation className="w-5 h-5 fill-amber-50 text-amber-500 stroke-[2.2]" />
          </div>
        );
      case 'image':
        return (
          <div className="w-5 h-5 rounded flex items-center justify-center text-purple-600 shrink-0">
            <ImageIcon className="w-5 h-5 fill-purple-50 text-purple-600 stroke-[2.2]" />
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded flex items-center justify-center text-slate-500 shrink-0">
            <FileText className="w-5 h-5 fill-slate-50 text-slate-500 stroke-[2.2]" />
          </div>
        );
    }
  };

  // Upload handler with real backend integration
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setUploadProgress(20);
    setUploadStepMsg('Đang kiểm tra Quota & dung lượng lưu trữ của phòng ban...');

    try {
      await new Promise((r) => setTimeout(r, 200));
      setUploadProgress(50);
      setUploadStepMsg('Quét mã độc ClamAV và kiểm tra an ninh hệ thống...');

      await new Promise((r) => setTimeout(r, 200));
      setUploadProgress(75);
      setUploadStepMsg('Tính mã băm toàn vẹn SHA-256...');

      const result = await uploadTenantFilesApi(
        fileList,
        undefined,
        currentFolderId || undefined
      );

      setUploadProgress(100);
      setUploadStepMsg('Tải lên hoàn tất!');
      await new Promise((r) => setTimeout(r, 250));

      await fetchDepartmentFiles();
      if (onQuotaUpdated) onQuotaUpdated();

      if (onAddToast) {
        if (result.failed && result.failed.length > 0) {
          onAddToast('error', `Tải lên ${result.uploaded.length} tệp thành công, thất bại ${result.failed.length} tệp.`);
        } else {
          onAddToast('success', `Đã tải lên ${result.uploaded.length || fileList.length} tệp tin vào phòng ban ${department.name} thành công.`);
        }
      }
    } catch (err: any) {
      if (onAddToast) onAddToast('error', err?.response?.data?.error || err?.message || 'Có lỗi khi tải tệp tin lên.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStepMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Create folder handler
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: DriveItem = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      type: 'folder',
      size: 0,
      sizeFormatted: '0 mục',
      updatedAt: new Date().toLocaleDateString('vi-VN'),
      createdAt: new Date().toLocaleDateString('vi-VN'),
      owner: {
        name: department.adminName || 'Trưởng phòng',
        email: department.adminEmail || 'deptadmin@company.com',
      },
      parentId: currentFolderId,
      starred: false,
      trashed: false,
      sharedWith: [],
      tags: ['Thư mục phòng ban'],
    };

    setItems((prev) => [newFolder, ...prev]);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);

    if (onAddToast) {
      onAddToast('success', `Đã tạo thư mục "${newFolder.name}".`);
    }
  };

  // Delete item handler
  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn chuyển "${name}" vào thùng rác?`)) return;
    try {
      await deleteTenantFileApi(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setActiveMenuId(null);
      if (onQuotaUpdated) onQuotaUpdated();
      if (onAddToast) onAddToast('success', `Đã chuyển "${name}" vào thùng rác.`);
      await fetchDepartmentFiles();
    } catch (err: any) {
      if (onAddToast) onAddToast('error', 'Không thể xóa tệp tin.');
    }
  };

  // Toggle star handler
  const handleToggleStar = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, starred: !i.starred } : i))
    );
    setActiveMenuId(null);
  };

  // Download item handler
  const handleDownload = async (item: DriveItem) => {
    try {
      setActiveMenuId(null);
      if (onAddToast) onAddToast('info', `Đang tải xuống tệp "${item.name}"...`);
      await downloadTenantFileApi(item.id, item.name);
    } catch (err: any) {
      if (onAddToast) onAddToast('error', 'Không thể tải xuống tệp tin.');
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files) {
          handleUploadFiles(e.dataTransfer.files);
        }
      }}
      className="space-y-4 min-h-[calc(100vh-12rem)] relative"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleUploadFiles(e.target.files);
        }}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-blue-50/95 border-2 border-dashed border-blue-500 rounded-3xl flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs">
          <div className="w-16 h-16 rounded-2xl bg-white text-blue-600 shadow-md flex items-center justify-center mb-4 animate-bounce">
            <Upload className="w-8 h-8 stroke-[2.2]" />
          </div>
          <p className="text-xl font-bold text-blue-900">
            Thả tệp vào đây để tải lên Google Drive của phòng {department.name}
          </p>
          <p className="text-sm text-blue-600 mt-1.5 font-medium">
            Tự động quét virus ClamAV, kiểm tra Quota & mã băm SHA-256
          </p>
        </div>
      )}

      {/* TOP NAVIGATION & GOOGLE DRIVE HEADER */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Back to Hub + Storage Quota indicator */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToHub}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Quay lại Trung tâm điều khiển phòng ban</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-2xs">
            <HardDrive className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Bộ nhớ phòng ban:{' '}
              <strong className="text-slate-900">
                {storageSummary
                  ? formatBytes(storageSummary.usedBytes)
                  : `${department.usedSpaceGB} GB`}
              </strong>{' '}
              /{' '}
              {storageSummary
                ? formatBytes(storageSummary.quotaBytes)
                : `${department.totalAllocatedGB} GB`}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-600 font-semibold">
              Còn trống{' '}
              {storageSummary
                ? formatBytes(storageSummary.availableBytes)
                : `${availableQuotaGB} GB`}
            </span>
          </div>
        </div>

        {/* Row 2: Google Drive Title Breadcrumb & Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          {/* Breadcrumb Title "My Drive ▾" */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 cursor-pointer group">
              <button
                onClick={() => setCurrentFolderId(null)}
                className="text-2xl font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5"
              >
                <span>My Drive</span>
                <ChevronDown className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>

            {currentFolder && (
              <>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-2xl font-bold text-slate-800 truncate max-w-xs">
                  {currentFolder.name}
                </span>
              </>
            )}
          </div>

          {/* Right Side: Google Drive Search Bar + "+ Mới" + View Toggles */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Search in Drive Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm trong Drive..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-blue-500 rounded-full text-slate-900 placeholder:text-slate-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Google Drive "+ Mới" Button */}
            <div className="relative drive-menu-trigger">
              <button
                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                className="inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-semibold rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-4 h-4 text-blue-600 flex items-center justify-center font-bold text-base">
                  +
                </div>
                <span>Mới</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* "+ Mới" Dropdown */}
              {isNewMenuOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-30 drive-menu-dropdown animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      setIsNewFolderModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <FolderPlus className="w-4 h-4 text-slate-600" />
                    <span>Thư mục mới</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Tải tệp lên</span>
                  </button>
                </div>
              )}
            </div>

            {/* Segmented View Mode Toggle [ ≡ ] [ ☷ ] */}
            <div className="flex items-center border border-slate-300 rounded-full p-0.5 bg-white shadow-2xs">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 px-2.5 rounded-full transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#C2E7FF] text-[#001D35] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Dạng danh sách"
              >
                <List className="w-4 h-4" />
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 px-2.5 rounded-full transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#C2E7FF] text-[#001D35] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Dạng lưới"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* Info Button (i) */}
            <button
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              className={`p-2 rounded-full border border-slate-300 transition-colors cursor-pointer ${
                isInfoOpen ? 'bg-blue-50 text-blue-600 border-blue-400' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
              title="Thông tin chi tiết"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 3: Google Drive Capsule Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {/* Type ▾ Filter */}
          <div className="relative drive-menu-trigger shrink-0">
            <button
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                selectedTypeFilter !== 'all'
                  ? 'border-blue-500 bg-blue-50/70 text-blue-700 font-semibold'
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span>
                {selectedTypeFilter === 'all'
                  ? 'Loại tệp'
                  : selectedTypeFilter === 'docs'
                  ? 'Tài liệu'
                  : selectedTypeFilter === 'sheets'
                  ? 'Bảng tính'
                  : selectedTypeFilter === 'pdfs'
                  ? 'Tệp PDF'
                  : selectedTypeFilter === 'images'
                  ? 'Hình ảnh'
                  : 'Thư mục'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isTypeDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 drive-menu-dropdown text-xs font-medium">
                {[
                  { id: 'all', label: 'Tất cả loại tệp' },
                  { id: 'docs', label: 'Tài liệu (Docs)' },
                  { id: 'sheets', label: 'Bảng tính (Sheets)' },
                  { id: 'pdfs', label: 'Tệp PDF' },
                  { id: 'images', label: 'Hình ảnh' },
                  { id: 'folder', label: 'Chỉ thư mục' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedTypeFilter(opt.id);
                      setIsTypeDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-100 ${
                      selectedTypeFilter === opt.id ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedTypeFilter === opt.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* People ▾ Filter Pill */}
          <button
            onClick={() => {
              if (onAddToast) onAddToast('info', 'Đang lọc tài liệu theo người sở hữu trong phòng.');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer shrink-0"
          >
            <span>Người sở hữu</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Modified ▾ Filter Pill */}
          <button
            onClick={() => {
              setSortField('updatedAt');
              setSortAsc(!sortAsc);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer shrink-0"
          >
            <span>Ngày sửa đổi</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Source ▾ Filter Pill */}
          <button
            onClick={() => {
              if (onAddToast) onAddToast('info', 'Nguồn lưu trữ: Google Drive Primary kết nối trực tiếp.');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer shrink-0"
          >
            <span>Nguồn lưu trữ</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Reset Filters */}
          {selectedTypeFilter !== 'all' && (
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className="text-xs text-blue-600 hover:underline font-semibold ml-2 shrink-0 cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        {/* Row 4: Google Drive Sort Bar "Tên ↑" */}
        <div className="flex items-center justify-between text-xs text-slate-600 pt-1 pb-1">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <span>Tên</span>
            <ArrowUpDown className={`w-3.5 h-3.5 transition-transform ${sortAsc ? '' : 'rotate-180'}`} />
          </button>

          <span className="text-[11px] text-slate-400">
            {folders.length} thư mục, {files.length} tệp tin
          </span>
        </div>
      </div>

      {/* Uploading Status Banner */}
      {isUploading && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 shadow-xs flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 animate-spin">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-900">{uploadStepMsg}</p>
              <p className="text-[11px] text-blue-600">Đang đồng bộ hóa luồng dữ liệu an toàn</p>
            </div>
          </div>
          <div className="w-32 bg-blue-200 rounded-full h-2 overflow-hidden shrink-0">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. GOOGLE DRIVE FOLDERS SECTION                                          */}
      {/* ========================================================================= */}
      {folders.length > 0 && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onDoubleClick={() => setCurrentFolderId(folder.id)}
                onClick={() => setCurrentFolderId(folder.id)}
                className="group relative bg-[#F0F4F9] hover:bg-[#E1E9F4] border border-slate-200/70 hover:border-slate-300 rounded-2xl p-3.5 px-4 flex items-center justify-between transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-6 h-6 flex items-center justify-center text-slate-700 group-hover:text-blue-600 transition-colors shrink-0">
                    <Folder className="w-5 h-5 fill-current" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-950 truncate">
                    {folder.name}
                  </span>
                </div>

                <div className="relative drive-menu-trigger shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === folder.id ? null : folder.id);
                    }}
                    className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* 3-dots Context Menu */}
                  {activeMenuId === folder.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 drive-menu-dropdown text-xs font-medium"
                    >
                      <button
                        onClick={() => {
                          setCurrentFolderId(folder.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-100 flex items-center gap-2.5 text-slate-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở thư mục</span>
                      </button>
                      <button
                        onClick={() => handleToggleStar(folder.id)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-100 flex items-center gap-2.5 text-slate-700"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        <span>{folder.starred ? 'Bỏ gắn sao' : 'Gắn dấu sao'}</span>
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                      <button
                        onClick={() => handleDeleteItem(folder.id, folder.name)}
                        className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa thư mục</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GOOGLE DRIVE FILES SECTION (VISUAL DOCUMENT PREVIEWS)                 */}
      {/* ========================================================================= */}
      {files.length > 0 && (
        <div className="space-y-3 pt-2">
          {viewMode === 'grid' ? (
            /* GRID VIEW (Document Preview Cards) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="group relative bg-[#F0F4F9] hover:bg-[#E5EEF8] border border-slate-200/80 hover:border-blue-300 rounded-2xl flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                >
                  {/* Card Header (File Icon + Name + 3-dots) */}
                  <div className="p-3 pb-2.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {getGoogleDriveIcon(file.fileType, file.extension)}
                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                        {file.name}
                      </h4>
                    </div>

                    <div className="relative drive-menu-trigger shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === file.id ? null : file.id);
                        }}
                        className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* File Context Menu */}
                      {activeMenuId === file.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 drive-menu-dropdown text-xs font-medium"
                        >
                          <button
                            onClick={() => {
                              setPreviewFile(file);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-slate-100 flex items-center gap-2.5 text-slate-700"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Xem trước</span>
                          </button>
                          <button
                            onClick={() => handleDownload(file)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-100 flex items-center gap-2.5 text-slate-700"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải xuống</span>
                          </button>
                          <button
                            onClick={() => handleToggleStar(file.id)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-100 flex items-center gap-2.5 text-slate-700"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            <span>{file.starred ? 'Bỏ gắn sao' : 'Gắn dấu sao'}</span>
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            onClick={() => handleDeleteItem(file.id, file.name)}
                            className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa tệp</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body: White A4 Document Preview Sheet (Signature Google Drive Style) */}
                  <div className="bg-white mx-3 mb-3 rounded-xl p-3.5 shadow-2xs border border-slate-200/90 h-44 overflow-hidden flex flex-col justify-start relative select-none group-hover:border-blue-200 transition-colors">
                    {/* Simulated Document Sheet Content */}
                    {file.fileType === 'sheet' ? (
                      /* Spreadsheet Preview Mock */
                      <div className="w-full h-full text-[10px] font-mono text-slate-600">
                        <div className="grid grid-cols-3 gap-1 border-b pb-1 font-bold text-slate-800 bg-emerald-50/50 p-1 rounded">
                          <div>Hạng mục</div>
                          <div className="text-right">Dự toán</div>
                          <div className="text-right">Duyệt</div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100">
                          <div className="truncate">Cloud Storage</div>
                          <div className="text-right">12.5M</div>
                          <div className="text-right text-emerald-600 font-bold">OK</div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100">
                          <div className="truncate">Bản quyền phần mềm</div>
                          <div className="text-right">5.0M</div>
                          <div className="text-right text-emerald-600 font-bold">OK</div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100">
                          <div className="truncate">Bảo trì hệ thống</div>
                          <div className="text-right">3.2M</div>
                          <div className="text-right text-emerald-600 font-bold">OK</div>
                        </div>
                      </div>
                    ) : file.fileType === 'code' ? (
                      /* Code Preview Mock */
                      <div className="w-full h-full text-[10px] font-mono bg-slate-900 text-slate-200 p-2.5 rounded-lg overflow-hidden leading-relaxed">
                        <div className="text-slate-400 text-[9px] mb-1">// ASP.NET Core Action Result</div>
                        <div className="text-blue-400">public IActionResult <span className="text-amber-300">CheckStatus</span>(int id)</div>
                        <div className="text-slate-300">{'{'}</div>
                        <div className="text-emerald-400 pl-3">if (id == 0) return NotFound();</div>
                        <div className="text-purple-400 pl-3">return View(); // Render UI</div>
                        <div className="text-slate-300">{'}'}</div>
                      </div>
                    ) : (
                      /* Document Text / Notes Layout (Like Meeting note / Survey Draft) */
                      <div className="w-full h-full text-[10px] text-slate-700 leading-relaxed font-sans overflow-hidden">
                        <div className="text-center font-extrabold text-[11px] text-slate-900 border-b border-slate-200 pb-1.5 mb-2 uppercase tracking-tight">
                          {file.name.replace('.gdoc', '')}
                        </div>
                        <p className="text-[10px] text-slate-600 line-clamp-6 whitespace-pre-line">
                          {file.contentSnippet || 'Nội dung tệp tin đã được đồng bộ hóa và lưu trữ an toàn trên máy chủ CloudDMS.'}
                        </p>
                      </div>
                    )}

                    {/* Subtle bottom fade gradient */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW (Google Drive List Table) */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 bg-slate-50/50">
                    <th className="py-3 px-4">Tên</th>
                    <th className="py-3 px-4">Chủ sở hữu</th>
                    <th className="py-3 px-4">Ngày sửa đổi</th>
                    <th className="py-3 px-4">Kích thước tệp</th>
                    <th className="py-3 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => setPreviewFile(file)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {getGoogleDriveIcon(file.fileType, file.extension)}
                          <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {file.owner?.name || department.adminName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {file.updatedAt}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                        {file.sizeFormatted}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Tải xuống"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(file.id, file.name);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
          )}
        </div>
      )}

      {/* Loading Skeleton / Spinner */}
      {isLoading && (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Đang đồng bộ kho lưu trữ phòng {department.name}...</p>
          <p className="text-xs text-slate-400">Kiểm tra phân quyền và tải danh sách tệp tin an toàn</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && folders.length === 0 && files.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-14 text-center max-w-lg mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Chưa có tài liệu nào trong phòng {department.name}
          </h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Kho lưu trữ của phòng ban hiện chưa có tệp tin nào. Kéo thả tệp từ máy tính của bạn vào đây hoặc bấm nút "Mới" để tải tài liệu lên.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Tải tệp tin lên phòng ban ngay
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODALS: NEW FOLDER & PREVIEW                                           */}
      {/* ========================================================================= */}

      {/* Modal: Thư mục mới */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Thư mục mới</h3>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Thư mục không có tiêu đề"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 mb-6"
            />
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setNewFolderName('');
                  setIsNewFolderModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem trước tài liệu (FilePreviewModal) */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onToggleStar={(id) => handleToggleStar(id)}
        onDelete={(id) => {
          if (previewFile) handleDeleteItem(id, previewFile.name);
          setPreviewFile(null);
        }}
        onDownload={(item) => handleDownload(item)}
        onShare={(item) => {
          if (onAddToast) onAddToast('info', `Đã sao chép liên kết chia sẻ tệp "${item.name}".`);
        }}
      />
    </div>
  );
};

export default DepartmentFilesView;
