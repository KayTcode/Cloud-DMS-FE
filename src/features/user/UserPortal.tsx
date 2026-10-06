import React, { useState } from 'react';
import {
  DriveView,
  StorageView,
  ProfileView,
} from './views';
import {
  AdjustQuotaModal,
  FilePreviewModal,
  NewFolderModal,
  ShareModal,
} from './components';
import {
  INITIAL_DEPARTMENT_QUOTAS,
  INITIAL_DRIVE_ITEMS,
  INITIAL_USER,
  INITIAL_USER_ACTIVITIES,
} from './data/mockData';
import {
  DepartmentQuota,
  DriveItem,
  FileType,
  UserActivity,
  UserProfile,
  UserNavTab,
} from './types';
import {
  HardDrive,
  FolderLock,
  User,
  Search,
} from 'lucide-react';

export const UserPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<UserNavTab>('documents');
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USER);
  const [driveItems, setDriveItems] = useState<DriveItem[]>(INITIAL_DRIVE_ITEMS);
  const [departmentQuotas, setDepartmentQuotas] = useState<DepartmentQuota[]>(
    INITIAL_DEPARTMENT_QUOTAS
  );
  const [activities, setActivities] = useState<UserActivity[]>(INITIAL_USER_ACTIVITIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Modals state
  const [previewFile, setPreviewFile] = useState<DriveItem | null>(null);
  const [shareItem, setShareItem] = useState<DriveItem | null>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isAdjustQuotaOpen, setIsAdjustQuotaOpen] = useState(false);
  const [selectedDeptForQuota, setSelectedDeptForQuota] = useState<DepartmentQuota | null>(null);

  // Notification Banner State
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const detectFileType = (fileName: string, mimeType: string): { type: FileType; ext: string } => {
    const parts = fileName.split('.');
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';

    if (ext === 'pdf') return { type: 'pdf', ext };
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return { type: 'docx', ext };
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return { type: 'sheet', ext };
    if (['ppt', 'pptx', 'key'].includes(ext)) return { type: 'slide', ext };
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) return { type: 'image', ext };
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return { type: 'archive', ext };
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'html', 'css', 'yaml', 'yml', 'sql'].includes(ext)) {
      return { type: 'code', ext };
    }
    return { type: 'other', ext: ext || 'file' };
  };

  const handleUploadFiles = async (fileList: FileList) => {
    const newItems: DriveItem[] = [];
    let addedBytes = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const { type: fileType, ext } = detectFileType(file.name, file.type);
      addedBytes += file.size;

      const newItem: DriveItem = {
        id: `file-${Date.now()}-${i}`,
        name: file.name,
        type: 'file',
        fileType,
        extension: ext,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        updatedAt: 'Vừa xong',
        createdAt: new Date().toLocaleDateString('vi-VN'),
        owner: {
          name: currentUser.fullName,
          email: currentUser.email,
        },
        parentId: currentFolderId,
        starred: false,
        trashed: false,
        sharedWith: [],
        tags: [currentUser.department, ext.toUpperCase()],
        department: currentUser.department,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      };

      newItems.push(newItem);
    }

    setDriveItems((prev) => [...newItems, ...prev]);

    const addedGB = addedBytes / (1024 * 1024 * 1024);
    setCurrentUser((prev) => ({
      ...prev,
      storageUsedGB: parseFloat((prev.storageUsedGB + addedGB).toFixed(2)),
    }));

    const newActivity: UserActivity = {
      id: `act-${Date.now()}`,
      action: 'upload',
      targetName: fileList.length === 1 ? fileList[0].name : `${fileList.length} tệp tin`,
      timestamp: 'Vừa xong',
      ipAddress: '118.69.182.20',
      device: 'Trình duyệt Web',
    };
    setActivities((prev) => [newActivity, ...prev]);

    showNotification(`Đã tải lên thành công ${fileList.length} tệp tin!`, 'success');
  };

  const handleCreateFolder = (name: string, department: string) => {
    const newFolder: DriveItem = {
      id: `folder-${Date.now()}`,
      name,
      type: 'folder',
      size: 0,
      sizeFormatted: '0 mục',
      updatedAt: 'Vừa xong',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      owner: {
        name: currentUser.fullName,
        email: currentUser.email,
      },
      parentId: currentFolderId,
      starred: false,
      trashed: false,
      sharedWith: [],
      tags: [department],
      department,
    };

    setDriveItems((prev) => [newFolder, ...prev]);
    showNotification(`Đã tạo thư mục "${name}" thành công!`, 'success');
  };

  const handleToggleStar = (id: string) => {
    setDriveItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const starred = !item.starred;
          showNotification(starred ? 'Đã thêm vào mục gắn dấu sao' : 'Đã bỏ dấu sao', 'info');
          return { ...item, starred };
        }
        return item;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setDriveItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, trashed: true };
        }
        return item;
      })
    );
    showNotification('Đã chuyển tài liệu vào thùng rác', 'info');
  };

  const handleDownloadItem = (item: DriveItem) => {
    showNotification(`Đang tải xuống "${item.name}"...`, 'info');
  };

  const handleSaveDepartmentQuota = (deptId: string, newQuotaGB: number) => {
    setDepartmentQuotas((prev) =>
      prev.map((q) => {
        if (q.id === deptId) {
          const used = q.usedSpaceGB;
          const available = Math.max(0, newQuotaGB - used);
          const usagePercent = Math.round((used / newQuotaGB) * 100);
          return {
            ...q,
            allocatedQuotaGB: newQuotaGB,
            availableSpaceGB: available,
            usagePercent,
          };
        }
        return q;
      })
    );
    showNotification('Đã cập nhật hạn mức lưu trữ phòng ban thành công!', 'success');
  };

  const handleUpdateUserProfile = (updated: Partial<UserProfile>) => {
    setCurrentUser((prev) => ({ ...prev, ...updated }));
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in zoom-in-95 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* User Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-2.5 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FolderLock className="w-4 h-4" />
            <span>Tài liệu & My Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Dung lượng lưu trữ</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Hồ sơ & Bảo mật</span>
          </button>
        </div>

        {/* Search input in toolbar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Tab View */}
      <div className="tab-content-area">
        {activeTab === 'documents' && (
          <DriveView
            items={driveItems}
            currentUser={currentUser}
            currentFolderId={currentFolderId}
            setCurrentFolderId={setCurrentFolderId}
            searchQuery={searchQuery}
            onUploadFile={handleUploadFiles}
            onOpenNewFolderModal={() => setIsNewFolderOpen(true)}
            onOpenFilePreview={(file) => setPreviewFile(file)}
            onToggleStar={handleToggleStar}
            onDeleteFile={handleDeleteItem}
            onShareItem={(item) => setShareItem(item)}
            onDownloadItem={handleDownloadItem}
          />
        )}

        {activeTab === 'storage' && (
          <StorageView
            departmentQuotas={departmentQuotas}
            onOpenAdjustQuotas={() => {
              setSelectedDeptForQuota(null);
              setIsAdjustQuotaOpen(true);
            }}
            onEditQuota={(quota) => {
              setSelectedDeptForQuota(quota);
              setIsAdjustQuotaOpen(true);
            }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            onUpdateProfile={handleUpdateUserProfile}
            activities={activities}
            onShowToast={showNotification}
            onGoToDrive={() => setActiveTab('documents')}
          />
        )}
      </div>

      {/* Modals */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onToggleStar={handleToggleStar}
        onDelete={handleDeleteItem}
        onDownload={handleDownloadItem}
        onShare={(item) => setShareItem(item)}
      />

      <ShareModal
        item={shareItem}
        onClose={() => setShareItem(null)}
        onShareSuccess={(msg) => showNotification(msg, 'success')}
      />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
        userDepartment={currentUser.department}
      />

      <AdjustQuotaModal
        isOpen={isAdjustQuotaOpen}
        onClose={() => setIsAdjustQuotaOpen(false)}
        quotas={departmentQuotas}
        selectedDeptQuota={selectedDeptForQuota}
        onSaveQuota={handleSaveDepartmentQuota}
      />
    </div>
  );
};
