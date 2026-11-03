import { useState, useCallback } from 'react';
import { DocumentDetailsDto } from '../types';

export interface UseDocumentModalsOptions {
  onRefresh?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useDocumentModals(options: UseDocumentModalsOptions = {}) {
  const { onRefresh, onShowToast } = options;

  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [detailsFileId, setDetailsFileId] = useState<string | null>(null);

  const [replaceState, setReplaceState] = useState<{
    isOpen: boolean;
    fileId: string | null;
    fileName: string;
  }>({
    isOpen: false,
    fileId: null,
    fileName: '',
  });

  const [editState, setEditState] = useState<{
    isOpen: boolean;
    details: DocumentDetailsDto | null;
  }>({
    isOpen: false,
    details: null,
  });

  const [extendState, setExtendState] = useState<{
    isOpen: boolean;
    details: DocumentDetailsDto | null;
  }>({
    isOpen: false,
    details: null,
  });

  const openSubmission = useCallback(() => setIsSubmissionOpen(true), []);
  const closeSubmission = useCallback(() => setIsSubmissionOpen(false), []);

  const openDetails = useCallback((fileId: string) => setDetailsFileId(fileId), []);
  const closeDetails = useCallback(() => setDetailsFileId(null), []);

  const openReplace = useCallback((fileId: string, fileName: string) => {
    setDetailsFileId(null);
    setReplaceState({ isOpen: true, fileId, fileName });
  }, []);
  const closeReplace = useCallback(() => {
    setReplaceState({ isOpen: false, fileId: null, fileName: '' });
  }, []);

  const openEdit = useCallback((details: DocumentDetailsDto) => {
    setDetailsFileId(null);
    setEditState({ isOpen: true, details });
  }, []);
  const closeEdit = useCallback(() => {
    setEditState({ isOpen: false, details: null });
  }, []);

  const openExtend = useCallback((details: DocumentDetailsDto) => {
    setDetailsFileId(null);
    setExtendState({ isOpen: true, details });
  }, []);
  const closeExtend = useCallback(() => {
    setExtendState({ isOpen: false, details: null });
  }, []);

  const handleSuccess = useCallback(
    (msg?: string) => {
      if (onRefresh) onRefresh();
      if (onShowToast && msg) onShowToast(msg, 'success');
    },
    [onRefresh, onShowToast]
  );

  return {
    openSubmission,
    closeSubmission,
    openDetails,
    closeDetails,
    openReplace,
    closeReplace,
    openEdit,
    closeEdit,
    openExtend,
    closeExtend,

    containerProps: {
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
      onSuccess: handleSuccess,
    },
  };
}

