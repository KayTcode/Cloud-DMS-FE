/**
 * pendingOperation.ts — Chờ operation bất đồng bộ hoàn thành (202 Accepted).
 * Poll GET statusPath (do Core hoặc File trả) cho đến khi status = 'Applied' hoặc 'Failed'.
 */

export type OperationStatus = 'Pending' | 'Applied' | 'Failed';

export interface WaitDeps {
  get: (path: string) => Promise<{ status: OperationStatus }>;
  sleep: (ms: number) => Promise<void>;
}

export interface WaitOptions {
  intervalMs?: number;
  maxAttempts?: number;
}

/** Đường dẫn trạng thái: statusUrl do Core trả (/api/admin-operations/{id}) hoặc mặc định File (/operations/{id}). */
export function operationStatusPath(body: { operationId: string; statusUrl?: string | null }): string {
  const url = body.statusUrl?.trim();
  if (!url) return `/operations/${body.operationId}`;
  return url.startsWith('/api/') ? url.slice(4) : url;
}

/**
 * Poll GET statusPath cho đến khi trạng thái = 'Applied' hoặc 'Failed'.
 * Mặc định: kiểm tra mỗi 1000ms, tối đa 30 lần.
 *
 * @throws Error khi status = 'Failed' hoặc hết lượt poll
 */
export async function waitForOperation(
  statusPath: string,
  deps: WaitDeps,
  options?: WaitOptions
): Promise<'Applied'> {
  const intervalMs = options?.intervalMs ?? 1000;
  const maxAttempts = options?.maxAttempts ?? 30;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await deps.get(statusPath);
    if (result.status === 'Applied') {
      return 'Applied';
    }
    if (result.status === 'Failed') {
      throw new Error('Thao tác không hoàn tất. Vui lòng thử lại.');
    }
    // Còn Pending — chờ trước khi thử lại (trừ lần cuối)
    if (attempt < maxAttempts - 1) {
      await deps.sleep(intervalMs);
    }
  }

  throw new Error('Thay đổi đang được xử lý. Vui lòng tải lại trang sau ít phút.');
}
