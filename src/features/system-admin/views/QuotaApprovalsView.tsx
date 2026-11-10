import React from 'react';
import { QuotaRequestsView } from './QuotaRequestsView';

interface QuotaApprovalsViewProps {
  onAddToast?: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
}

/**
 * @deprecated Đã hợp nhất vào QuotaRequestsView. Component này được giữ lại để tương thích ngược.
 */
export const QuotaApprovalsView: React.FC<QuotaApprovalsViewProps> = () => {
  return <QuotaRequestsView />;
};
