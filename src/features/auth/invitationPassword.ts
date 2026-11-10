/**
 * Quy tắc xác thực mật khẩu lời mời (khớp AcceptInvitationCommandHandler phía backend).
 * Độ dài: 12–72 byte UTF-8.
 */

const MIN_BYTES = 12;
const MAX_BYTES = 72;

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * Kiểm tra mật khẩu khi chấp nhận lời mời.
 * @returns null nếu hợp lệ, chuỗi thông báo lỗi tiếng Việt nếu không hợp lệ.
 */
export function validateInvitationPassword(password: string, confirm: string): string | null {
  const bytes = byteLength(password);
  if (bytes < MIN_BYTES) {
    return `Mật khẩu phải có ít nhất ${MIN_BYTES} ký tự (byte).`;
  }
  if (bytes > MAX_BYTES) {
    return `Mật khẩu không được vượt quá ${MAX_BYTES} byte.`;
  }
  if (password !== confirm) {
    return 'Mật khẩu xác nhận không khớp.';
  }
  return null;
}
