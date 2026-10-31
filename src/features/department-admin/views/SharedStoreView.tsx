import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, Files, Trash2 } from 'lucide-react';
import { useDepartment } from '../context/DepartmentContext';
import { useAuth } from '@/context/AuthContext';
import { DriveView } from '@/features/user/views/DriveView';
import { DriveTrashView } from '@/features/user/views/DriveTrashView';
import { MoveFolderModal } from '@/features/user/components/MoveFolderModal';
import { folderApi } from '@/features/user/api/folderApi';
import { driveApi, formatBytes } from '@/features/user/api/driveApi';
import { getDepartmentFilesApi } from '@/features/tenants/api/fileApi';
import { FolderDto, BreadcrumbItem } from '@/features/user/types/folder.types';
import { DriveItem, DriveFilter, FileType, UserProfile } from '@/features/user/types';

export const SharedStoreView: React.FC = () => {
  const { departmentId } = useDepartment();
  const { user: authUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'files' | 'trash'>('files');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [apiFolders, setApiFolders] = useState<FolderDto[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [movingFolder, setMovingFolder] = useState<FolderDto | null>(null);
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DriveFilter>('all');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const deptId = departmentId || '';

  const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ type, message: msg });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch folders
  const fetchFolders = useCallback(async (folderId: string | null) => {
    if (!deptId) return;
    try {
      let res;
      if (folderId === null) {
        res = await folderApi.getRoot('DepartmentShared', deptId);
        setBreadcrumb([]);
      } else {
        res = await folderApi.getChildren(folderId);
        setBreadcrumb(res.breadcrumb);
      }
      setApiFolders(res.folders);
    } catch (err) {
      console.error('Lỗi nạp thư mục kho chung:', err);
    }
  }, [deptId]);

  // Fetch drive items (files)
  const fetchDriveItems = useCallback(async (folderId: string | null) => {
    if (!deptId) return;
    try {
      const res = await getDepartmentFilesApi(deptId, folderId || undefined, 1, 100, searchQuery.trim() || undefined);
      const files: DriveItem[] = (res.files || []).map((f) => {
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
          type: 'file' as const,
          fileType: fType,
          extension: ext || 'file',
          size: f.sizeBytes,
          sizeFormatted: formatBytes(f.sizeBytes),
          updatedAt: f.createdAt ? new Date(f.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật',
          createdAt: f.createdAt ? new Date(f.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật',
          owner: { name: f.ownerName || 'Phòng ban', email: '' },
          parentId: f.folderId || null,
          starred: false,
          trashed: false,
          sharedWith: [],
          tags: [],
          contentSnippet: '',
        };
      });
      setDriveItems(files);
    } catch (err) {
      console.error('Lỗi nạp files kho chung:', err);
      setDriveItems([]);
    }
  }, [deptId, searchQuery]);

  useEffect(() => {
    fetchFolders(currentFolderId);
    fetchDriveItems(currentFolderId);
  }, [currentFolderId, fetchFolders, fetchDriveItems]);

  const handleNavigateFolder = (id: string | null) => {
    setCurrentFolderId(id);
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await folderApi.renameFolder(folderId, { name: newName });
      await fetchFolders(currentFolderId);
      showNotification('Đã đổi tên thư mục thành công!', 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Đổi tên thư mục thất bại.', 'error');
    }
  };

  const handleMoveFolder = (folder: FolderDto) => {
    setMovingFolder(folder);
  };

  const handleConfirmMove = async (targetFolderId: string | null) => {
    if (!movingFolder) return;
    try {
      await folderApi.moveFolder(movingFolder.id, { targetParentFolderId: targetFolderId });
      await fetchFolders(currentFolderId);
      showNotification(`Đã di chuyển thư mục "${movingFolder.name}" thành công!`, 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Di chuyển thư mục thất bại.', 'error');
    } finally {
      setMovingFolder(null);
    }
  };

  const handleTrashFolder = async (folderId: string) => {
    try {
      await folderApi.trashFolder(folderId);
      await fetchFolders(currentFolderId);
      showNotification('Đã chuyển thư mục vào thùng rác.', 'info');
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Không thể xóa thư mục.', 'error');
    }
  };

  const handleUploadFiles = async (fileList: FileList) => {
    try {
      await driveApi.uploadFiles(fileList, currentFolderId);
      await fetchDriveItems(currentFolderId);
      showNotification('Tải lên tệp thành công!', 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Tải lên thất bại.', 'error');
    }
  };

  const handleUploadDirectFiles = async (fileList: FileList) => {
    try {
      await driveApi.uploadDirectFiles(fileList, currentFolderId);
      await fetchDriveItems(currentFolderId);
      showNotification('Tải lên trực tiếp thành công!', 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Tải lên trực tiếp thất bại.', 'error');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !deptId) return;
    try {
      await folderApi.createFolder({
        name: newFolderName.trim(),
        parentFolderId: currentFolderId,
        driveKind: 'DepartmentShared',
        driveOwnerId: deptId,
      });
      setNewFolderName('');
      setIsNewFolderOpen(false);
      await fetchFolders(currentFolderId);
      showNotification('Đã tạo thư mục mới!', 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Tạo thư mục thất bại.', 'error');
    }
  };

  const currentUser: UserProfile = {
    id: authUser?.id || '',
    fullName: authUser?.fullName || 'Trưởng phòng',
    email: authUser?.email || '',
    jobTitle: 'DepartmentAdmin',
    department: '',
    role: authUser?.role || 'DepartmentAdmin',
    phone: '',
    location: '',
    timezone: 'Asia/Ho_Chi_Minh',
    language: 'vi',
    avatarUrl: '',
    storageQuotaGB: 0,
    storageUsedGB: 0,
    twoFactorEnabled: false,
    joinedDate: '',
    lastLogin: '',
  };

  if (!deptId) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Chưa thiết lập phòng ban.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Kho chung phòng ban</h2>
            <p className="text-xs text-slate-500">Tài liệu và thư mục dùng chung cho toàn bộ phòng ban</p>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : notification.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200'
          : 'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'files' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Files className="w-3.5 h-3.5" />
          Tập tin
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'trash' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Thùng rác
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'files' && (
        // TODO: replace with shared-store scoped file listing when BE endpoint available
        <DriveView
          items={driveItems}
          currentUser={currentUser}
          currentFolderId={currentFolderId}
          setCurrentFolderId={setCurrentFolderId}
          searchQuery={searchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onUploadFile={undefined}
          onUploadDirectFile={undefined}
          onOpenNewFolderModal={() => setIsNewFolderOpen(true)}
          onOpenFilePreview={() => {}}
          onToggleStar={() => {}}
          onDeleteFile={async (id) => {
            try {
              await driveApi.moveToTrash(id);
              await fetchDriveItems(currentFolderId);
              showNotification('Đã chuyển tệp vào thùng rác.', 'info');
            } catch {
              showNotification('Không thể xoá tệp.', 'error');
            }
          }}
          onShareItem={() => {}}
          onDownloadItem={async (item) => {
            try {
              await driveApi.downloadFile(item.id, item.name);
            } catch {
              showNotification('Không thể tải xuống tệp.', 'error');
            }
          }}
          folders={apiFolders}
          breadcrumb={breadcrumb}
          onNavigateFolder={handleNavigateFolder}
          onRenameFolder={handleRenameFolder}
          onMoveFolder={handleMoveFolder}
          onTrashFolder={handleTrashFolder}
          driveKind="DepartmentShared"
          driveOwnerId={deptId}
        />
      )}

      {activeTab === 'trash' && (
        <DriveTrashView driveKind="DepartmentShared" driveOwnerId={deptId} />
      )}

      {/* New Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tạo thư mục mới</h3>
              <button onClick={() => setIsNewFolderOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Tên thư mục..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setIsNewFolderOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">Huỷ</button>
                <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50">Tạo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Folder Modal */}
      <MoveFolderModal
        isOpen={!!movingFolder}
        item={movingFolder ? { id: movingFolder.id, name: movingFolder.name, type: 'folder' } : null}
        driveKind="DepartmentShared"
        driveOwnerId={deptId}
        onClose={() => setMovingFolder(null)}
        onMove={handleConfirmMove}
      />
    </div>
  );
};
