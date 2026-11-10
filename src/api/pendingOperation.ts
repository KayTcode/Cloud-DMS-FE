/**
 * pendingOperation.ts — Chờ operation bất đồng bộ hoàn thành (202 Accepted).
 * Poll GET /operations/<id> cho đến khi status = 'Applied' hoặc 'Failed'.
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

/**
 * Poll GET /operations/<operationId> cho đến khi trạng thái = 'Applied' hoặc 'Failed'.
 * Mặc định: kiểm tra mỗi 1000ms, tối đa 30 lần.
 *
 * @throws Error khi status = 'Failed' hoặc hết lượt poll
 */
export async function waitForOperation(
  operationId: string,
  deps: WaitDeps,
  options?: WaitOptions
): Promise<'Applied'> {
  const intervalMs = options?.intervalMs ?? 1000;
  const maxAttempts = options?.maxAttempts ?? 30;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await deps.get(`/operations/${operationId}`);
    if (result.status === 'Applied') {
      return 'Applied';
    }
    if (result.status === 'Failed') {
      throw new Error('Thay đổi quyền không áp dụng được. Vui lòng thử lại.');
    }
    // Còn Pending — chờ trước khi thử lại (trừ lần cuối)
    if (attempt < maxAttempts - 1) {
      await deps.sleep(intervalMs);
    }
  }

  throw new Error('Thay đổi đang được xử lý. Vui lòng tải lại trang sau ít phút.');
}
