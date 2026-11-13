import { describe, it, expect } from 'vitest';
import { cancelToastMessage, resendToastMessage } from './invitationMessages';
import type {
  CancelInvitationResultDto,
  InvitationCleanupAction,
  ResendInvitationResultDto,
} from '../types/invitation.types';

const SERVER_MESSAGE = 'Đã hủy lời mời gửi tới a@example.com.';

const cancelResult = (
  over: Partial<CancelInvitationResultDto> = {},
): CancelInvitationResultDto => ({
  targetUserId: 'u1',
  email: 'a@example.com',
  cleanupAction: 'HARD_DELETED',
  message: SERVER_MESSAGE,
  ...over,
});

const resendResult = (
  over: Partial<ResendInvitationResultDto> = {},
): ResendInvitationResultDto => ({
  targetUserId: 'u1',
  email: 'a@example.com',
  newExpiresAt: '2026-12-25T10:00:00Z',
  message: 'Đã gửi lại lời mời.',
  ...over,
});

describe('cancelToastMessage', () => {
  it('keeps the server message and appends the hard-delete clause for HARD_DELETED', () => {
    const msg = cancelToastMessage(cancelResult({ cleanupAction: 'HARD_DELETED' }));
    expect(msg).toContain(SERVER_MESSAGE);
    expect(msg).toMatch(/xóa hoàn toàn/);
    expect(msg).not.toMatch(/gỡ liên kết/);
    expect(msg).not.toMatch(/giữ lại/);
  });

  it('keeps the server message and appends the unlink clause for UNLINKED_FORMER_EMPLOYEE', () => {
    const msg = cancelToastMessage(cancelResult({ cleanupAction: 'UNLINKED_FORMER_EMPLOYEE' }));
    expect(msg).toContain(SERVER_MESSAGE);
    expect(msg).toMatch(/gỡ liên kết/);
    expect(msg).toMatch(/vô hiệu hóa/);
    expect(msg).not.toMatch(/xóa hoàn toàn/);
  });

  it('claims no outcome for an unrecognised cleanupAction such as HARD_DELETE', () => {
    const msg = cancelToastMessage(
      cancelResult({ cleanupAction: 'HARD_DELETE' as InvitationCleanupAction }),
    );
    expect(msg).toBe(SERVER_MESSAGE);
    expect(msg).not.toMatch(/xóa hoàn toàn/);
    expect(msg).not.toMatch(/gỡ liên kết/);
    expect(msg).not.toMatch(/giữ lại/);
  });

  it('claims no outcome for UNLINK_ACCOUNT, the audit-log spelling', () => {
    const msg = cancelToastMessage(
      cancelResult({ cleanupAction: 'UNLINK_ACCOUNT' as InvitationCleanupAction }),
    );
    expect(msg).toBe(SERVER_MESSAGE);
    expect(msg).not.toMatch(/gỡ liên kết/);
    expect(msg).not.toMatch(/xóa hoàn toàn/);
  });

  it('falls back to the cleanup clause alone when the server sends no message', () => {
    const msg = cancelToastMessage(cancelResult({ message: '' }));
    expect(msg).toMatch(/^Tài khoản/);
    expect(msg).toMatch(/xóa hoàn toàn/);
  });
});

describe('resendToastMessage', () => {
  it('appends the new expiry when newExpiresAt is parseable', () => {
    const msg = resendToastMessage(resendResult());
    expect(msg).toContain('Đã gửi lại lời mời.');
    expect(msg).toMatch(/Hạn mới/);
    expect(msg).toMatch(/2026/);
  });

  it('treats a zone-less newExpiresAt as UTC', () => {
    const msg = resendToastMessage(resendResult({ newExpiresAt: '2026-12-25T10:00:00' }));
    expect(msg).toMatch(/Hạn mới/);
  });

  it('returns the server message alone when newExpiresAt cannot be parsed', () => {
    const msg = resendToastMessage(resendResult({ newExpiresAt: 'không-phải-ngày' }));
    expect(msg).toBe('Đã gửi lại lời mời.');
    expect(msg).not.toMatch(/Hạn mới/);
  });

  it('returns the server message alone when newExpiresAt is empty', () => {
    const msg = resendToastMessage(resendResult({ newExpiresAt: '' }));
    expect(msg).toBe('Đã gửi lại lời mời.');
  });
});
