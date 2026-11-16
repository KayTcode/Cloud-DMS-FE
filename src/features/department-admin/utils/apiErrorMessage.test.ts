import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from './apiErrorMessage';

const FALLBACK = 'Không thể thêm nhân viên. Vui lòng kiểm tra lại.';

describe('apiErrorMessage', () => {
  // axiosClient's interceptor rejects every failure as a plain Error, so the server's
  // message only ever arrives in `err.message`. This is the case that was being dropped.
  it('returns the message of a plain Error rejected by the interceptor', () => {
    const err = new Error("Email 'a@b.com' đã tồn tại trong hệ thống.");
    expect(apiErrorMessage(err, FALLBACK)).toBe("Email 'a@b.com' đã tồn tại trong hệ thống.");
  });

  it('joins nothing and keeps a multi-line message intact', () => {
    const err = new Error('Dòng 1\nDòng 2');
    expect(apiErrorMessage(err, FALLBACK)).toBe('Dòng 1\nDòng 2');
  });

  it('prefers response.data.detail when a raw axios error reaches it', () => {
    const err = { response: { data: { detail: 'chi tiết', message: 'thông điệp' } }, message: 'request failed' };
    expect(apiErrorMessage(err, FALLBACK)).toBe('chi tiết');
  });

  it('falls back to response.data.message before err.message', () => {
    const err = { response: { data: { message: 'thông điệp' } }, message: 'request failed' };
    expect(apiErrorMessage(err, FALLBACK)).toBe('thông điệp');
  });

  it('uses the fallback when nothing usable is present', () => {
    expect(apiErrorMessage({}, FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage(new Error('   '), FALLBACK)).toBe(FALLBACK);
  });
});
