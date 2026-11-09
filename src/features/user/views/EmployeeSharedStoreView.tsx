import React, { useState, useEffect, useCallback } from 'react';
import { DriveView } from './DriveView';
import { folderApi } from '../api/folderApi';
import { FolderDto, BreadcrumbItem } from '../types/folder.types';
import { DriveItem, UserProfile } from '../types';
import { driveApi, mapFileEntryToDriveItem } from '../api/driveApi';
import { useAuth } from '@/context/AuthContext';
import { UNSCANNED_DOWNLOAD_DISABLED_MESSAGE } from '@/services/download/linkDownload';

interface EmployeeSharedStoreViewProps {
  currentUser: UserProfile;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const EmployeeSharedStoreView: React.FC<EmployeeSharedStoreViewProps> = ({
  currentUser,
  onShowToast,
}) => {
  const { user: authUser } = useAuth();
  const departmentId = authUser?.departmentId;

  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [downloadsDisabled, setDownloadsDisabled] = useState(false);

  const fetchSharedStore = useCallback(async (folderId: string | null) => {
    if (!departmentId) return;
    try {
      const res = await folderApi.getDriveChildren('shared', {
        departmentId,
        folderId: folderId ?? undefined,
      });
      setFolders(res.folders);
      setBreadcrumb(res.breadcrumb);
      if (res.files) {
        setDriveItems(res.files.map((f: any) => mapFileEntryToDriveItem(f, false)));
      }
    } catch (error) {
      console.error('Lỗi nạp Kho chung:', error);
      onShowToast('Không thể nạp danh sách Kho chung.', 'error');
    }
  }, [departmentId, onShowToast]);

  useEffect(() => {
    fetchSharedStore(currentFolderId);
  }, [currentFolderId, fetchSharedStore]);

  if (!departmentId) {
    return null;
  }

  const handleNavigateFolder = (id: string | null) => {
    setCurrentFolderId(id);
  };

  const handleDownloadItem = async (item: DriveItem, confirmUnscanned?: () => Promise<boolean>) => {
    try {
      onShowToast(`Đang chuẩn bị tải xuống "${item.name}"...`, 'info');
      await driveApi.downloadFile(item.id, item.name, item.archiveKind, confirmUnscanned);
      onShowToast(`Tải xuống "${item.name}" thành công!`, 'success');
    } catch (error: any) {
      if (error?.message === UNSCANNED_DOWNLOAD_DISABLED_MESSAGE) setDownloadsDisabled(true);
      onShowToast(error?.message || 'Không thể tải tệp tin về máy.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-800">
        <span>Bạn chỉ có quyền xem và tải tệp trong Kho chung.</span>
      </div>
      <DriveView
      items={driveItems}
      currentUser={currentUser}
      currentFolderId={currentFolderId}
      setCurrentFolderId={setCurrentFolderId}
      searchQuery=""
      activeFilter="all"
      setActiveFilter={() => {}}
      onOpenNewFolderModal={() => {}}
      onOpenFilePreview={() => {}}
      onToggleStar={() => {}}
      onDeleteFile={() => {}}
      onShareItem={() => {}}
      onDownloadItem={handleDownloadItem}
      folders={folders}
      breadcrumb={breadcrumb}
      onNavigateFolder={handleNavigateFolder}
      isReadOnly={true}
      readOnlyBannerText="Kho chung chỉ cho phép xem và tải tệp."
      driveKind="DepartmentShared"
      downloadsDisabled={downloadsDisabled}
      downloadsDisabledReason={UNSCANNED_DOWNLOAD_DISABLED_MESSAGE}
    />
    </div>
  );
};
