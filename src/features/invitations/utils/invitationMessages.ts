import type {
  CancelInvitationResultDto,
  ResendInvitationResultDto,
} from '../types/invitation.types';
import { normalizeUtcTimestamp } from './normalizeUtcTimestamp';

/** Toast text after a resend: the server's message, plus the new expiry when parseable. */
export function resendToastMessage(result: ResendInvitationResultDto): string {
  const iso = normalizeUtcTimestamp(result.newExpiresAt);
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return result.message;
  return `${result.message} Hạn mới: ${date.toLocaleString('vi-VN')}.`;
}

/** Toast text after a cancel; the branch is the server's `cleanupAction`, never inferred. */
export function cancelToastMessage(result: CancelInvitationResultDto): string {
  return result.cleanupAction === 'HARD_DELETED'
    ? `Đã hủy lời mời gửi tới ${result.email}: tài khoản, vai trò và hạn mức lưu trữ đã được xóa hoàn toàn.`
    : `Đã hủy lời mời gửi tới ${result.email}: tài khoản được giữ lại, đã gỡ liên kết khỏi tổ chức/phòng ban và vô hiệu hóa.`;
}
