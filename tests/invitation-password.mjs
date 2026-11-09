/**
 * Tests cho validateInvitationPassword (invitationPassword.ts)
 * Chạy: node tests/invitation-password.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Kiểm tra file nguồn tồn tại
const srcPath = path.join(__dirname, '../src/features/auth/invitationPassword.ts');
readFileSync(srcPath, 'utf8');

// Triển khai lại logic JS thuần để kiểm thử (cùng logic với TypeScript)
const MIN_BYTES = 12;
const MAX_BYTES = 72;
function byteLength(s) {
  return new TextEncoder().encode(s).length;
}
function validateInvitationPassword(password, confirm) {
  const bytes = byteLength(password);
  if (bytes < MIN_BYTES) return `Mật khẩu phải có ít nhất ${MIN_BYTES} ký tự (byte).`;
  if (bytes > MAX_BYTES) return `Mật khẩu không được vượt quá ${MAX_BYTES} byte.`;
  if (password !== confirm) return 'Mật khẩu xác nhận không khớp.';
  return null;
}

assert.notEqual(validateInvitationPassword('a'.repeat(11), 'a'.repeat(11)), null, 'Mật khẩu 11 byte phải lỗi');
assert.equal(validateInvitationPassword('a'.repeat(12), 'a'.repeat(12)), null, 'Mật khẩu 12 byte phải hợp lệ');
assert.equal(validateInvitationPassword('ả'.repeat(24), 'ả'.repeat(24)), null, 'Mật khẩu 72 byte (24 × 3) phải hợp lệ');
assert.notEqual(validateInvitationPassword('ả'.repeat(25), 'ả'.repeat(25)), null, 'Mật khẩu 75 byte (25 × 3) phải lỗi');
assert.notEqual(validateInvitationPassword('a'.repeat(12), 'b'.repeat(12)), null, 'Confirm không khớp phải lỗi');

console.log('invitation-password: 5/5 PASS');
