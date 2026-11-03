import React from 'react';
import { DocumentSubmissionModal } from './DocumentSubmissionModal';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { ReplaceDocumentFileModal } from './ReplaceDocumentFileModal';
import { EditDocumentMetadataModal } from './EditDocumentMetadataModal';
import { ExtendRetentionModal } from './ExtendRetentionModal';
import { DocumentDetailsDto } from '../types/document.types';

export interface DocumentModalsContainerProps {
  parentFolderId?: string | null;
  isSubmissionOpen: boolean;
  closeSubmission: () => void;
  detailsFileId: string | null;
  closeDetails: () => void;
  openReplace: (fileId: string, fileName: string) => void;
  openEdit: (details: DocumentDetailsDto) => void;
  openExtend: (details: DocumentDetailsDto) => void;
  replaceState: {
    isOpen: boolean;
    fileId: string | null;
    fileName: string;
  };
  closeReplace: () => void;
  editState: {
    isOpen: boolean;
    details: DocumentDetailsDto | null;
  };
  closeEdit: () => void;
  extendState: {
    isOpen: boolean;
    details: DocumentDetailsDto | null;
  };
  closeExtend: () => void;
  onSuccess: (message?: string) => void;
}

export const DocumentModalsContainer: React.FC<DocumentModalsContainerProps> = ({
  parentFolderId,
  isSubmissionOpen,
  closeSubmission,
  detailsFileId,
  closeDetails,
  openReplace,
  openEdit,
  openExtend,
  replaceState,
  closeReplace,
  editState,
  closeEdit,
  extendState,
  closeExtend,
  onSuccess,
}) => {
  return (
    <>
      {/* 1. Modal Nộp tài liệu 1 bước */}
      <DocumentSubmissionModal
        isOpen={isSubmissionOpen}
        onClose={closeSubmission}
        parentFolderId={parentFolderId}
        onSuccess={() => onSuccess('Nộp tài liệu mới thành công!')}
      />

      {/* 2. Modal Chi tiết siêu dữ liệu */}
      <DocumentDetailsModal
        isOpen={Boolean(detailsFileId)}
        fileId={detailsFileId}
        onClose={closeDetails}
        onOpenReplaceModal={openReplace}
        onOpenEditModal={openEdit}
        onOpenExtendModal={openExtend}
      />

      {/* 3. Modal Thay thế tệp mới */}
      <ReplaceDocumentFileModal
        isOpen={replaceState.isOpen}
        fileId={replaceState.fileId}
        currentFileName={replaceState.fileName}
        onClose={closeReplace}
        onSuccess={() => onSuccess('Đã thay thế tệp và bảo toàn 100% siêu dữ liệu!')}
      />

      {/* 4. Modal Sửa siêu dữ liệu */}
      <EditDocumentMetadataModal
        isOpen={editState.isOpen}
        details={editState.details}
        onClose={closeEdit}
        onSuccess={() => onSuccess('Cập nhật siêu dữ liệu tài liệu thành công!')}
      />

      {/* 5. Modal Gia hạn thời hạn lưu trữ */}
      <ExtendRetentionModal
        isOpen={extendState.isOpen}
        details={extendState.details}
        onClose={closeExtend}
        onSuccess={() => onSuccess('Gia hạn thời hạn lưu trữ thành công!')}
      />
    </>
  );
};

