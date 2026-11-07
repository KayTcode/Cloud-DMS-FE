import React from 'react';
import { ConfirmDialog } from './ConfirmDialog';

export interface UnscannedDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * Confirmation dialog shown before downloading a file that hasn't finished
 * (or can't finish, due to size) virus scanning yet. Modeled on the generic
 * `ConfirmDialog`, with the fixed copy and button labels this feature's
 * spec requires.
 */
export const UnscannedDownloadDialog: React.FC<UnscannedDownloadDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Tệp chưa được quét virus"
    message="Tệp này chưa được quét virus (có thể do quá lớn để quét). Bạn vẫn muốn tải về?"
    confirmText="Tôi hiểu, tải về"
    cancelText="Huỷ"
    variant="warning"
    isLoading={isLoading}
  />
);
