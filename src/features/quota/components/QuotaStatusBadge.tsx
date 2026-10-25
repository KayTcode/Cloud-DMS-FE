import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, XCircle, Ban } from 'lucide-react';
import { QuotaRequestStatus } from '../types/quota.types';

interface QuotaStatusBadgeProps {
  status: QuotaRequestStatus;
  className?: string;
}

export const QuotaStatusBadge: React.FC<QuotaStatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'Pending':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Chờ duyệt</span>
        </span>
      );
    case 'Approved':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Đã duyệt đủ</span>
        </span>
      );
    case 'PartiallyApproved':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-cyan-600" />
          <span>Duyệt một phần</span>
        </span>
      );
    case 'Rejected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Đã từ chối</span>
        </span>
      );
    case 'Cancelled':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}
        >
          <Ban className="w-3.5 h-3.5 text-slate-400" />
          <span>Đã hủy</span>
        </span>
      );
    default:
      return null;
  }
};
