import React, { useEffect, useRef, useState } from 'react';
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
  /**
   * Bumped by a host that mutates the same invitations through another UI (the legacy
   * vacant-TenantAdmin buttons): every change reloads this list so no stale row is left
   * behind. The value itself is never read, only its change.
   */
  reloadToken?: number | string;
}

const cooldownMs = (inv: PendingInvitationDto, now: Date) =>
  resendCooldownRemainingMs(normalizeUtcTimestamp(inv.lastInvitationSentAt), now);

export const PendingInvitationsTable: React.FC<PendingInvitationsTableProps> = ({
  tenantId,
  departmentId,
  onCancelRequested,
  onResent,
  onCancelled,
  reloadToken,
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
    reload,
    resend,
    cancel,
  } = usePendingInvitations({ tenantId, departmentId });

  // `reload` is re-created whenever the filter changes, so the effect must key off the
  // token alone; the ref keeps the mount run and unrelated re-renders from refetching.
  const lastReloadToken = useRef(reloadToken);
  useEffect(() => {
    if (lastReloadToken.current === reloadToken) return;
    lastReloadToken.current = reloadToken;
    void reload();
  }, [reloadToken, reload]);

  // Re-render once a second while any row is cooling down so the countdown label ticks.
  const [, setTick] = useState(0);
  const now = new Date();
  const anyCooling = items.some((inv) => cooldownMs(inv, now) > 0);
  useEffect(() => {
    if (!anyCooling) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [anyCooling]);

  // The resend button's cooldown comes from the server's `lastInvitationSentAt`, which does
  // not move until the post-resend reload lands — so a second click inside that window would
  // POST again. The ref is the guard (read synchronously, immune to a held Enter key); the
  // state only drives the button's spinner.
  const resendingIdsRef = useRef<Set<string>>(new Set());
  const [resendingIds, setResendingIds] = useState<string[]>([]);

  const handleResend = async (userId: string) => {
    if (resendingIdsRef.current.has(userId)) return;
    resendingIdsRef.current.add(userId);
    setResendingIds([...resendingIdsRef.current]);
    let result: ResendInvitationResultDto | null = null;
    try {
      result = await resend(userId);
    } catch {
      // The hook has already recorded the message in `error`, shown in the banner.
    } finally {
      resendingIdsRef.current.delete(userId);
      setResendingIds([...resendingIdsRef.current]);
    }
    // Outside the try: a throw from the host's toast callback is the host's bug, not a
    // failed resend.
    if (result) onResent?.(result);
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
    let result: CancelInvitationResultDto | null = null;
    try {
      result = await cancel(userId);
    } catch {
      // The hook has already recorded the message in `error`; the modal closes either way
      // so the banner is visible.
    } finally {
      setInvitationToCancel(null);
      setIsCancelling(false);
    }
    // Outside the try: a throw from the host's toast callback must not be misreported as a
    // failed cancel.
    if (result) onCancelled?.(result);
  };

  const hasRows = items.length > 0;

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
          {hasRows && (
            <span className="block mt-1 text-xs font-normal">
              Danh sách bên dưới có thể đã cũ.
            </span>
          )}
        </div>
      )}

      {isLoading && !hasRows ? (
        <LoadingSpinner text="Đang tải danh sách lời mời..." />
      ) : !hasRows ? (
        error ? (
          // Nothing was loaded, so we know nothing about what is pending: no empty-state claim.
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">Không tải được danh sách lời mời.</p>
            <div className="mt-3 flex justify-center">
              <Button size="sm" variant="outline" onClick={() => void reload()}>
                Thử lại
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-slate-500">
            Không có lời mời nào đang chờ.
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Họ tên</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Tổ chức</th>
                <th className="py-3 px-4">Phòng ban</th>
                <th className="py-3 px-4">Hạn mức</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((inv) => {
                const remainingSec = Math.ceil(cooldownMs(inv, now) / 1000);
                const isResending = resendingIds.includes(inv.userId);
                return (
                  <tr key={inv.userId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{inv.fullName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{inv.email}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline">{inv.roleName}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{inv.tenantName ?? '—'}</td>
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
                          isLoading={isResending}
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
