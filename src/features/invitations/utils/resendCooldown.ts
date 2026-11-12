export const RESEND_COOLDOWN_MS = 120000;

/**
 * Milliseconds left before an invitation may be resent, computed from its
 * `lastInvitationSentAt`. Returns 0 when never sent or when the timestamp
 * cannot be parsed, and never more than RESEND_COOLDOWN_MS.
 */
export function resendCooldownRemainingMs(
  lastInvitationSentAt: string | null,
  now: Date = new Date(),
): number {
  if (lastInvitationSentAt === null) return 0;
  const remaining =
    new Date(lastInvitationSentAt).getTime() + RESEND_COOLDOWN_MS - now.getTime();
  // `!(x > 0)` also catches NaN from an unparseable timestamp.
  if (!(remaining > 0)) return 0;
  return Math.min(remaining, RESEND_COOLDOWN_MS);
}
