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
  openEdit: (target: string | DocumentDetailsDto) => void;
  openExtend: (target: string | DocumentDetailsDto) => void;
  replaceState: {
    isOpen: boolean;
    fileId: string | null;
    fileName: string;
  };
  closeReplace: () => void;
  editState: {
    isOpen: boolean;
    details: DocumentDetailsDto | null;
    fileId?: string | null;
  };
  closeEdit: () => void;
  extendState: {
    isOpen: boolean;
    details: DocumentDetailsDto | null;
    fileId?: string | null;
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

      {/* 2. Modal Chi tiết thông tin tệp */}
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
        onSuccess={() => onSuccess('Đã thay thế tệp và bảo toàn 100% thông tin tệp!')}
      />

      {/* 4. Modal Sửa thông tin tệp */}
      <EditDocumentMetadataModal
        isOpen={editState.isOpen}
        details={editState.details}
        fileId={editState.fileId}
        onClose={closeEdit}
        onSuccess={() => onSuccess('Cập nhật thông tin tài liệu thành công!')}
      />

      {/* 5. Modal Gia hạn thời hạn lưu trữ */}
      <ExtendRetentionModal
        isOpen={extendState.isOpen}
        details={extendState.details}
        fileId={extendState.fileId}
        onClose={closeExtend}
        onSuccess={() => onSuccess('Gia hạn thời hạn lưu trữ thành công!')}
      />
    </>
  );
};

