import React, { useState, useEffect, useCallback } from 'react';
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
  INITIAL_USER,
  INITIAL_USER_ACTIVITIES,
} from './data/mockData';
import {
  DepartmentQuota,
  DriveFilter,
  DriveItem,
  PersonalStorageQuotaDto,
  TrashFileListResponse,
  UserActivity,
  UserProfile,
  UserNavTab,
} from './types';
import {
  HardDrive,
  FolderLock,
  User,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { driveApi, userApi } from './api/driveApi';
import { useTenantContext } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

export const UserPortal: React.FC = () => {
  const { user: authUser } = useAuth();
  const { activeNav, setActiveNav, searchQuery, setSearchQuery } = useTenantContext();
  const [activeTab, setActiveTab] = useState<UserNavTab>('documents');
  const [activeFilter, setActiveFilter] = useState<DriveFilter>('all');
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USER);

  useEffect(() => {
    if (authUser) {
      setCurrentUser((prev) => ({
        ...prev,
        id: authUser.id || prev.id,
        fullName: authUser.fullName || prev.fullName,
        email: authUser.email || prev.email,
        role: authUser.role || prev.role,
      }));
    }
  }, [authUser]);

  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [trashResponse, setTrashResponse] = useState<TrashFileListResponse>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 50,
    totalSizeBytes: 0,
    hasMore: false,
  });
  const [personalQuota, setPersonalQuota] = useState<PersonalStorageQuotaDto | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);
  const [departmentQuotas, setDepartmentQuotas] = useState<DepartmentQuota[]>(
    INITIAL_DEPARTMENT_QUOTAS
  );
  const [activities, setActivities] = useState<UserActivity[]>(INITIAL_USER_ACTIVITIES);
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
    }, 4000);
  };

  // Nạp danh sách file từ backend (My Drive)
  const fetchDriveItems = useCallback(async (folderId: string | null = null, search?: string) => {
    try {
      setIsLoadingItems(true);
      const items = await driveApi.getDriveItems(folderId, search);
      setDriveItems(items);
    } catch (error) {
      console.error('Lỗi nạp tệp tin:', error);
      showNotification('Không thể nạp danh sách tệp tin từ máy chủ.', 'error');
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  // Nạp danh sách thùng rác thực tế từ backend (GET /api/files/trash)
  const fetchTrashFiles = useCallback(async (searchTerm?: string) => {
    try {
      setIsLoadingTrash(true);
      const res = await driveApi.getTrashFiles(1, 100, searchTerm);
      setTrashResponse(res);
    } catch (error) {
      console.error('Lỗi nạp thùng rác:', error);
      showNotification('Không thể nạp danh sách thùng rác từ máy chủ.', 'error');
    } finally {
      setIsLoadingTrash(false);
    }
  }, []);

  // Nạp hạn mức dung lượng cá nhân từ backend
  const fetchPersonalQuota = useCallback(async () => {
    try {
      const quota = await userApi.getMyQuota();
      if (quota) {
        setPersonalQuota(quota);
        const quotaBytes = (quota as any)?.quotaBytes ?? (quota as any)?.QuotaBytes ?? 0;
        const usedBytes = (quota as any)?.usedBytes ?? (quota as any)?.UsedBytes ?? 0;
        const quotaGB = parseFloat((quotaBytes / (1024 * 1024 * 1024)).toFixed(2));
        const usedGB = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(2));
        const deptName = quota.departmentName || (quota as any)?.DepartmentName;
        setCurrentUser((prev) => ({
          ...prev,
          fullName: quota.fullName || (quota as any)?.FullName || prev.fullName,
          department: deptName || prev.department,
          storageQuotaGB: quotaGB,
          storageUsedGB: usedGB,
        }));
      }
    } catch (error) {
      console.warn('Không thể nạp hạn mức Quota từ máy chủ:', error);
    }
  }, []);

  // Đồng bộ trạng thái điều hướng khi người dùng bấm Menu bên trái (Sidebar)
  useEffect(() => {
    if (activeNav === 'trash') {
      setActiveTab('documents');
      setActiveFilter('trash');
    } else if (activeNav === 'dashboard') {
      setActiveTab('documents');
      setActiveFilter('all');
    } else if (activeNav === 'storage-providers') {
      setActiveTab('storage');
    } else if (activeNav === 'settings') {
      setActiveTab('profile');
    }
  }, [activeNav]);

  const handleFilterChange = (filter: DriveFilter) => {
    setActiveFilter(filter);
    if (filter === 'trash') {
      setActiveNav('trash');
    } else if (activeNav === 'trash') {
      setActiveNav('dashboard');
    }
  };

  // Tự động load dữ liệu khi thay đổi tab lọc, thư mục hoặc từ khóa tìm kiếm
  useEffect(() => {
    if (activeFilter === 'trash') {
      fetchTrashFiles(searchQuery);
    } else {
      fetchDriveItems(currentFolderId, searchQuery);
    }
  }, [activeFilter, currentFolderId, fetchTrashFiles, fetchDriveItems, searchQuery]);

  useEffect(() => {
    fetchPersonalQuota();
    fetchTrashFiles(); // Nạp số lượng tài liệu trong thùng rác để hiển thị badge số lượng
  }, [fetchPersonalQuota, fetchTrashFiles]);

  // Xử lý tải lên tệp tin
  const handleUploadFiles = async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;

    try {
      showNotification(`Đang tải lên ${fileList.length} tệp tin...`, 'info');
      const result = await driveApi.uploadFiles(fileList, currentFolderId);

      // Refresh lại danh sách files và Quota
      await fetchDriveItems(currentFolderId);
      await fetchPersonalQuota();

      const uploadedFiles = result?.uploaded ?? result?.successfulFiles ?? [];
      const failedFiles = result?.failed ?? result?.failedFiles ?? [];
      const successCount = uploadedFiles.length;
      const failedCount = failedFiles.length;

      if (failedCount > 0 && successCount === 0) {
        const errorDetail = failedFiles.map((f: any) => `${f.fileName}: ${f.error}`).join('; ');
        showNotification(
          `Tải lên thất bại: ${errorDetail}`,
          'error'
        );
      } else if (failedCount > 0 && successCount > 0) {
        const errorDetail = failedFiles.map((f: any) => `${f.fileName}: ${f.error}`).join('; ');
        showNotification(
          `Tải lên: ${successCount} thành công, ${failedCount} thất bại (${errorDetail}).`,
          'error'
        );
      } else {
        showNotification(`Đã tải lên thành công ${successCount || fileList.length} tệp tin!`, 'success');
      }

      const newActivity: UserActivity = {
        id: `act-${Date.now()}`,
        action: 'upload',
        targetName: fileList.length === 1 ? fileList[0].name : `${fileList.length} tệp tin`,
        timestamp: 'Vừa xong',
        ipAddress: 'Client IP',
        device: 'Trình duyệt Web',
      };
      setActivities((prev) => [newActivity, ...prev]);
    } catch (error: any) {
      console.error('Lỗi upload file:', error);
      const errMsg = error?.response?.data?.message || error?.message || 'Tải lên tệp tin thất bại.';
      showNotification(`Lỗi: ${errMsg}`, 'error');
    }
  };

  // Xử lý tải lên trực tiếp Cloud (Direct-to-Storage)
  const handleUploadDirectFiles = async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;

    try {
      showNotification(`Đang khởi tạo tải trực tiếp ${fileList.length} tệp tin lên Cloud...`, 'info');
      const result = await driveApi.uploadDirectFiles(fileList, currentFolderId);

      // Refresh lại danh sách files và Quota
      await fetchDriveItems(currentFolderId);
      await fetchPersonalQuota();

      const uploadedFiles = result?.uploaded ?? [];
      const failedFiles = result?.failed ?? [];
      const successCount = uploadedFiles.length;
      const failedCount = failedFiles.length;

      if (failedCount > 0 && successCount === 0) {
        const errorDetail = failedFiles.map((f: any) => `${f.fileName}: ${f.error}`).join('; ');
        showNotification(
          `Tải trực tiếp Cloud thất bại: ${errorDetail}`,
          'error'
        );
      } else if (failedCount > 0 && successCount > 0) {
        const errorDetail = failedFiles.map((f: any) => `${f.fileName}: ${f.error}`).join('; ');
        showNotification(
          `Tải trực tiếp Cloud: ${successCount} thành công, ${failedCount} thất bại (${errorDetail}).`,
          'error'
        );
      } else {
        showNotification(`Đã tải trực tiếp thành công ${successCount || fileList.length} tệp tin lên Cloud!`, 'success');
      }

      const newActivity: UserActivity = {
        id: `act-${Date.now()}`,
        action: 'upload',
        targetName: fileList.length === 1 ? `[Cloud Direct] ${fileList[0].name}` : `[Cloud Direct] ${fileList.length} tệp tin`,
        timestamp: 'Vừa xong',
        ipAddress: 'Client IP (Direct)',
        device: 'Trình duyệt Web',
      };
      setActivities((prev) => [newActivity, ...prev]);
    } catch (error: any) {
      console.error('Lỗi upload direct file:', error);
      const errMsg = error?.response?.data?.message || error?.message || 'Tải lên trực tiếp Cloud thất bại.';
      showNotification(`Lỗi Cloud Direct: ${errMsg}`, 'error');
    }
  };

  // Xử lý tạo thư mục mới
  const handleCreateFolder = async (name: string, department: string) => {
    try {
      await driveApi.createFolder(name, currentFolderId);
      await fetchDriveItems(currentFolderId);
      showNotification(`Đã tạo thư mục "${name}" thành công!`, 'success');
    } catch (error: any) {
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
    }
  };

  // Xử lý gắn dấu sao
  const handleToggleStar = async (id: string) => {
    const item = driveItems.find((i) => i.id === id);
    if (!item) return;
    const newStarred = !item.starred;

    setDriveItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, starred: newStarred } : i))
    );

    try {
      await driveApi.toggleStar(id, newStarred);
      showNotification(newStarred ? 'Đã thêm vào mục gắn dấu sao' : 'Đã bỏ dấu sao', 'info');
    } catch (error) {
      console.warn('Endpoint toggleStar chưa hỗ trợ, giữ thay đổi local UI');
    }
  };

  // Xử lý xóa mềm tệp tin (chuyển vào thùng rác - DELETE /api/files/{id})
  const handleDeleteItem = async (id: string) => {
    try {
      await driveApi.moveToTrash(id);
      // Loại bỏ khỏi danh sách My Drive
      setDriveItems((prev) => prev.filter((item) => item.id !== id));
      showNotification('Đã chuyển tài liệu vào thùng rác.', 'info');
      await fetchPersonalQuota();
      // Nếu đang mở xem thùng rác, nạp lại thùng rác
      if (activeFilter === 'trash') {
        await fetchTrashFiles();
      }
    } catch (error: any) {
      console.error('Lỗi khi xóa tài liệu:', error);
      const errMsg = error?.response?.data?.message || error?.message || 'Không thể xóa tài liệu.';
      showNotification(errMsg, 'error');
    }
  };

  // Xử lý khôi phục tệp tin từ thùng rác (POST /api/files/{id}/restore)
  const handleRestoreFile = async (id: string) => {
    try {
      await driveApi.restoreFile(id);
      // Loại bỏ khỏi danh sách thùng rác
      setTrashResponse((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
        totalCount: Math.max(0, prev.totalCount - 1),
      }));
      showNotification('Đã khôi phục tài liệu từ thùng rác về thư mục thành công!', 'success');
      await fetchPersonalQuota();
      await fetchDriveItems(currentFolderId);
    } catch (error: any) {
      console.error('Lỗi khi khôi phục tài liệu:', error);
      const errMsg = error?.response?.data?.message || error?.message || 'Khôi phục tài liệu thất bại.';
      showNotification(errMsg, 'error');
    }
  };

  // Xử lý xóa vĩnh viễn tệp tin (DELETE /api/files/{id}/permanent)
  const handlePermanentDelete = async (id: string) => {
    try {
      await driveApi.deletePermanently(id);
      // Loại bỏ khỏi danh sách thùng rác
      setTrashResponse((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
        totalCount: Math.max(0, prev.totalCount - 1),
      }));
      showNotification('Đã xóa vĩnh viễn tài liệu và giải phóng hạn mức Quota!', 'success');
      await fetchPersonalQuota();
    } catch (error: any) {
      console.error('Lỗi khi xóa vĩnh viễn:', error);
      const errMsg = error?.response?.data?.message || error?.message || 'Không thể xóa vĩnh viễn tài liệu.';
      showNotification(errMsg, 'error');
    }
  };

  // Xử lý tải xuống tệp tin an toàn (GET /api/files/{id}/download)
  const handleDownloadItem = async (item: DriveItem) => {
    try {
      showNotification(`Đang chuẩn bị tải xuống "${item.name}"...`, 'info');
      await driveApi.downloadFile(item.id, item.name);
      showNotification(`Tải xuống "${item.name}" thành công!`, 'success');
    } catch (error: any) {
      console.error('Lỗi tải tệp tin:', error);
      showNotification('Không thể tải tệp tin về máy.', 'error');
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setActiveTab('documents');
              setActiveFilter('all');
              setActiveNav('dashboard');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'documents' && activeFilter !== 'trash'
                ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FolderLock className="w-4 h-4" />
            <span>Tài liệu & My Drive</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('documents');
              setActiveFilter('trash');
              setActiveNav('trash');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'documents' && activeFilter === 'trash'
                ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs'
                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50/50'
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Thùng rác</span>
            {trashResponse.totalCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold">
                {trashResponse.totalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('storage');
              setActiveNav('storage-providers');
            }}
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
            onClick={() => {
              setActiveTab('profile');
              setActiveNav('settings');
            }}
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
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeFilter === 'trash' ? "Tìm trong thùng rác..." : "Tìm kiếm tài liệu..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
            activeFilter={activeFilter}
            setActiveFilter={handleFilterChange}
            trashItems={trashResponse.items}
            trashTotalCount={trashResponse.totalCount}
            trashTotalSizeBytes={trashResponse.totalSizeBytes}
            isLoadingTrash={isLoadingTrash}
            onUploadFile={handleUploadFiles}
            onUploadDirectFile={handleUploadDirectFiles}
            onOpenNewFolderModal={() => setIsNewFolderOpen(true)}
            onOpenFilePreview={(file) => setPreviewFile(file)}
            onToggleStar={handleToggleStar}
            onDeleteFile={handleDeleteItem}
            onRestoreFile={handleRestoreFile}
            onPermanentDeleteFile={handlePermanentDelete}
            onShareItem={(item) => setShareItem(item)}
            onDownloadItem={handleDownloadItem}
          />
        )}

        {activeTab === 'storage' && (
          <StorageView
            personalQuota={personalQuota}
            onRefresh={fetchPersonalQuota}
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
