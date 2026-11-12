import React from 'react';
import { Badge } from '@/components/common';
import { normalizeUtcTimestamp } from '../utils/normalizeUtcTimestamp';

interface InvitationStatusBadgeProps {
  isExpired: boolean;
  tokenExpiresAt: string;
}

const HOUR_MS = 3600_000;

export const InvitationStatusBadge: React.FC<InvitationStatusBadgeProps> = ({
  isExpired,
  tokenExpiresAt,
}) => {
  // The server decides expiry; the client clock only feeds the "remaining" hint.
  if (isExpired) return <Badge variant="danger">Đã hết hạn</Badge>;

  const expiresMs = new Date(normalizeUtcTimestamp(tokenExpiresAt) as string).getTime();
  const hoursLeft = Math.ceil((expiresMs - Date.now()) / HOUR_MS);

  return (
    <Badge variant="warning">
      Đang chờ{hoursLeft > 0 ? ` (còn ${hoursLeft} giờ)` : ''}
    </Badge>
  );
};
