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

/**
 * One clause per recognised outcome, so the toast states an outcome in exactly one place.
 * These are past tense (the cancel already happened); CancelInvitationModal's pre-action
 * warning is deliberately future-conditional copy and is not the same string.
 */
const CANCEL_CLEANUP_CLAUSES = {
  HARD_DELETED: 'Tài khoản, vai trò và hạn mức lưu trữ đã được xóa hoàn toàn.',
  UNLINKED_FORMER_EMPLOYEE:
    'Tài khoản được giữ lại, đã gỡ liên kết khỏi tổ chức/phòng ban và vô hiệu hóa.',
} as const;

const joinSentences = (...parts: string[]): string =>
  parts.map((p) => p.trim()).filter((p) => p.length > 0).join(' ');

/**
 * Toast text after a cancel: always the server's own `message`, with an outcome
 * clause appended only for a `cleanupAction` we actually recognise.
 *
 * SPEC is internally inconsistent here — §5.1's DTO says `HARD_DELETED` /
 * `UNLINKED_FORMER_EMPLOYEE` while EARS-18's audit-log constants are
 * `HARD_DELETE` / `UNLINK_ACCOUNT`. Cancel is irreversible, so an unrecognised
 * value must not be reported as either outcome: it falls through to the
 * server's message alone rather than guessing the least destructive one.
 */
export function cancelToastMessage(result: CancelInvitationResultDto): string {
  switch (result.cleanupAction) {
    case 'HARD_DELETED':
      return joinSentences(result.message, CANCEL_CLEANUP_CLAUSES.HARD_DELETED);
    case 'UNLINKED_FORMER_EMPLOYEE':
      return joinSentences(result.message, CANCEL_CLEANUP_CLAUSES.UNLINKED_FORMER_EMPLOYEE);
    default:
      return result.message;
  }
}
