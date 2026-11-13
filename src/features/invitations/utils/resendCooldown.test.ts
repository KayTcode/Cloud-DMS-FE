import { describe, it, expect } from 'vitest';
import { RESEND_COOLDOWN_MS, resendCooldownRemainingMs } from './resendCooldown';

const NOW = new Date('2026-11-13T10:00:00Z');

describe('resendCooldownRemainingMs', () => {
  it('returns 0 when the invitation was never resent', () => {
    expect(resendCooldownRemainingMs(null, NOW)).toBe(0);
  });
  it('returns 0 once 120s have fully elapsed', () => {
    expect(resendCooldownRemainingMs('2026-11-13T09:58:00Z', NOW)).toBe(0);
  });
  it('returns the remainder mid-cooldown', () => {
    expect(resendCooldownRemainingMs('2026-11-13T09:59:30Z', NOW)).toBe(90000);
  });
  it('clamps a future timestamp to the full cooldown', () => {
    expect(resendCooldownRemainingMs('2026-11-13T10:05:00Z', NOW)).toBe(RESEND_COOLDOWN_MS);
  });
  it('returns 0 for an unparseable timestamp', () => {
    expect(resendCooldownRemainingMs('not-a-date', NOW)).toBe(0);
  });
});
