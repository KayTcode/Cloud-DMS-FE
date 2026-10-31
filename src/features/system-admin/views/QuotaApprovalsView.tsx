import React, { useCallback } from 'react';
import { PendingQuotaTable } from '@/features/quota';

interface QuotaApprovalsViewProps {
  onAddToast: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
}

export const QuotaApprovalsView: React.FC<QuotaApprovalsViewProps> = ({ onAddToast }) => {
  // Giữ danh tính hàm ổn định để PendingQuotaTable không tải lại liên tục.
  const handleShowToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => onAddToast(type, message),
    [onAddToast]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Duyệt yêu cầu quota</h2>
      <PendingQuotaTable onShowToast={handleShowToast} />
    </div>
  );
};
