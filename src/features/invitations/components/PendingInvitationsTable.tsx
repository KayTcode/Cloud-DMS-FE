import React, { useEffect, useState } from 'react';
import { Badge, Button, Input } from '@/components/common';
import { LoadingSpinner } from '@/components/feedback';
import { formatQuotaAuto } from '@/utils/quotaUnitUtils';
import { usePendingInvitations } from '../hooks/usePendingInvitations';
import { resendCooldownRemainingMs } from '../utils/resendCooldown';
import { normalizeUtcTimestamp } from '../utils/normalizeUtcTimestamp';
import type {
  CancelInvitationResultDto,
  PendingInvitationDto,
  ResendInvitationResultDto,
} from '../types/invitation.types';
import { InvitationStatusBadge } from './InvitationStatusBadge';
import { CancelInvitationModal } from './CancelInvitationModal';

interface PendingInvitationsTableProps {
  tenantId?: string;
  departmentId?: string;
  /**
   * When supplied, the host drives the confirmation and the table opens no modal of its own.
   * When omitted, the table renders CancelInvitationModal itself.
   */
  onCancelRequested?: (inv: PendingInvitationDto) => void;
  onResent?: (result: ResendInvitationResultDto) => void;
  onCancelled?: (result: CancelInvitationResultDto) => void;
}

const cooldownMs = (inv: PendingInvitationDto, now: Date) =>
  resendCooldownRemainingMs(normalizeUtcTimestamp(inv.lastInvitationSentAt), now);

export const PendingInvitationsTable: React.FC<PendingInvitationsTableProps> = ({
  tenantId,
  departmentId,
  onCancelRequested,
  onResent,
  onCancelled,
}) => {
  const {
    items,
    totalCount,
    pageNumber,
    totalPages,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    setPageNumber,
    resend,
    cancel,
  } = usePendingInvitations({ tenantId, departmentId });

  // Re-render once a second while any row is cooling down so the countdown label ticks.
  const [, setTick] = useState(0);
  const now = new Date();
  const anyCooling = items.some((inv) => cooldownMs(inv, now) > 0);
  useEffect(() => {
    if (!anyCooling) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [anyCooling]);

  const handleResend = async (userId: string) => {
    try {
      const result = await resend(userId);
      onResent?.(result);
    } catch {
      // The hook has already recorded the message in `error`, shown in the banner.
    }
  };

  const [invitationToCancel, setInvitationToCancel] = useState<PendingInvitationDto | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelClick = (inv: PendingInvitationDto) => {
    if (onCancelRequested) onCancelRequested(inv);
    else setInvitationToCancel(inv);
  };

  const handleConfirmCancel = async (userId: string) => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      const result = await cancel(userId);
      setInvitationToCancel(null);
      onCancelled?.(result);
    } catch {
      // The hook has already recorded the message in `error`; close so the banner is visible.
      setInvitationToCancel(null);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-slate-500">
          Có <span className="font-semibold text-amber-600">{totalCount}</span> lời mời đang chờ
        </p>
        <div className="w-full sm:w-72">
          <Input
            type="search"
            placeholder="Tìm theo tên hoặc email..."
            aria-label="Tìm kiếm lời mời"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="m-4 sm:m-5 p-4 rounded-xl border-2 border-rose-300 bg-rose-50 text-rose-800 text-sm font-semibold"
        >
          {error}
          <span className="block mt-1 text-xs font-normal">
            Danh sách bên dưới có thể đã cũ.
          </span>
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <LoadingSpinner text="Đang tải danh sách lời mời..." />
      ) : items.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Không có lời mời nào đang chờ.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Họ tên</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Phòng ban</th>
                <th className="py-3 px-4">Hạn mức</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((inv) => {
                const remainingSec = Math.ceil(cooldownMs(inv, now) / 1000);
                return (
                  <tr key={inv.userId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{inv.fullName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{inv.email}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline">{inv.roleName}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{inv.departmentName ?? '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{formatQuotaAuto(inv.quotaBytes)}</td>
                    <td className="py-3.5 px-4">
                      <InvitationStatusBadge
                        isExpired={inv.isExpired}
                        tokenExpiresAt={inv.tokenExpiresAt}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={remainingSec > 0}
                          onClick={() => handleResend(inv.userId)}
                        >
                          {remainingSec > 0 ? `Gửi lại (${remainingSec}s)` : 'Gửi lại'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleCancelClick(inv)}>
                          Hủy lời mời
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Button
            size="sm"
            variant="outline"
            disabled={pageNumber <= 1 || isLoading}
            onClick={() => setPageNumber(pageNumber - 1)}
          >
            Trang trước
          </Button>
          <span>
            Trang {pageNumber} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pageNumber >= totalPages || isLoading}
            onClick={() => setPageNumber(pageNumber + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}

      {!onCancelRequested && (
        <CancelInvitationModal
          invitation={invitationToCancel}
          isSubmitting={isCancelling}
          // A request in flight must not be dismissed by Escape, the backdrop or the header X.
          onClose={isCancelling ? () => {} : () => setInvitationToCancel(null)}
          onConfirm={handleConfirmCancel}
        />
      )}
    </div>
  );
};
