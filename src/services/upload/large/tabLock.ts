/**
 * Runs `run()` while holding a per-session Web Locks lock, so only one browser tab
 * acts on a given upload session at a time. Calls `onBusy()` instead when another
 * tab already holds the lock. Falls back to running immediately when the Web Locks
 * API is unavailable.
 */
export async function withSessionLock(
  sessionId: string,
  run: () => Promise<void>,
  onBusy: () => void
): Promise<void> {
  const locks = (navigator as any)?.locks;
  if (!locks || typeof locks.request !== 'function') {
    await run();
    return;
  }

  let ran = false;
  let busy = false;

  await locks.request('upload-' + sessionId, { ifAvailable: true }, async (lock: unknown) => {
    if (!lock) {
      busy = true;
      return;
    }
    ran = true;
    await run();
  });

  if (busy && !ran) {
    onBusy();
  }
}
