import React from 'react';
import { PendingQuotaTable } from '@/features/quota';

interface QuotaApprovalsViewProps {
  onAddToast: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
}

export const QuotaApprovalsView: React.FC<QuotaApprovalsViewProps> = ({ onAddToast }) => (
  <div className="space-y-4">
    <h2 className="text-lg font-bold text-slate-900">Duyệt yêu cầu quota</h2>
    <PendingQuotaTable
      onShowToast={(message, type) => onAddToast(type, message)}
      onDecisionSuccess={() => onAddToast('success', 'Đã ghi nhận quyết định phê duyệt thành công.')}
    />
  </div>
);
