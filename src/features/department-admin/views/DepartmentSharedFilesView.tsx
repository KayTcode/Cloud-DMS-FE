import React, { useState } from 'react';
import { SharedFilesView } from '@/features/user/views/SharedFilesView';
import { ArchiveBrowser } from '@/features/user/components/ArchiveBrowser';
import { driveApi } from '@/features/user/api/driveApi';
import { DriveItem } from '@/features/user/types';
import { apiErrorMessage } from '../utils/apiErrorMessage';

interface Props {
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const DepartmentSharedFilesView: React.FC<Props> = ({ onShowToast }) => {
  const [archive, setArchive] = useState<DriveItem | null>(null);

  const download = async (file: DriveItem) => {
    try {
      await driveApi.downloadFile(file.id, file.name, file.archiveKind);
      onShowToast(`Tải xuống "${file.name}" thành công!`, 'success');
    } catch (error) {
      onShowToast(apiErrorMessage(error, 'Không thể tải tệp được chia sẻ.'), 'error');
    }
  };

  const open = (file: DriveItem) => {
    if (file.archiveKind === 'folder' || file.archiveKind === 'batch'
        || (!file.archiveKind && file.name.toLowerCase().endsWith('.zip'))) {
      setArchive(file);
    } else {
      void download(file);
    }
  };

  return <>
    <SharedFilesView onOpenFilePreview={open} onDownloadItem={download} onShowToast={onShowToast} />
    {archive && <ArchiveBrowser key={archive.id} file={archive}
      onClose={() => setArchive(null)} onDownloadPackage={() => void download(archive)} />}
  </>;
};
