/**
 * `LargeFileUploader` — bộ máy upload file lớn: chia phần, song song (S3) hoặc
 * tuần tự theo offset (Google/OneDrive resumable), thử lại có backoff, tạm
 * dừng/tiếp tục, xin lại link hết hạn, nhận diện giới hạn nhà cung cấp, và
 * heartbeat định kỳ.
 *
 * File này KHÔNG import gì — mọi phụ thuộc (gọi API thật, fetch, sha256,
 * sleep, now) được truyền vào qua `transport` trong constructor, theo quy
 * ước kiến trúc của dự án. Loại dependency cụ thể (LargeSession,
 * UploadSessionStatus, ApiCodeError) được mô tả lại dưới dạng cấu trúc ở đây
 * để tránh import trực tiếp từ `largeUploadApi.ts`.
 */

/** Cấu trúc tối thiểu cần dùng từ `LargeSession` (import thật ở nơi gọi). */
export interface MinimalLargeSession {
  sessionId: string;
  fileId: string;
  documentVersion: number;
  expiresAt: string;
  protocol: 'S3Multipart' | 'ResumableUri';
  directUploadUrl?: string | null;
  partSizeBytes: number;
  totalParts?: number;
  maxConcurrency: number;
}

/** Cấu trúc tối thiểu cần dùng từ `UploadSessionStatus`. */
export interface MinimalUploadSessionStatus {
  completedPartNumbers: number[];
}

export interface LargeUploadTransport {
  begin(): Promise<MinimalLargeSession>;
  presign(partNumber: number, sha256: string | null): Promise<string>;
  putPart(
    url: string,
    body: Blob,
    headers: Record<string, string>,
    signal: AbortSignal
  ): Promise<{ status: number; etag: string | null; body?: string }>;
  putChunk(
    url: string,
    body: Blob,
    contentRange: string,
    signal: AbortSignal
  ): Promise<{ status: number; rangeHeader: string | null; retryAfter: number | null }>;
  queryOffset(url: string, total: number): Promise<number>;
  status(): Promise<MinimalUploadSessionStatus>;
  heartbeat(uploaded: number): Promise<void>;
  complete(): Promise<{ fileId: string; documentVersion: number }>;
  abort(): Promise<void>;
  sha256Base64(blob: Blob): Promise<string>;
  sleep(ms: number): Promise<void>;
  now(): number;
}

export type UploadState =
  | 'sending'
  | 'paused'
  | 'provider-limited'
  | 'completing'
  | 'done'
  | 'error'
  | 'cancelled';

export type UploadEvent =
  | { type: 'progress'; uploaded: number; total: number; bytesPerSecond: number }
  | { type: 'state'; state: UploadState; error?: { code: string; message: string } };

const MAX_RETRIES = 5;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];
const HEARTBEAT_INTERVAL_MS = 60_000;

function hasExpiredLinkBody(body: string | undefined | null): boolean {
  if (!body) return false;
  return body.includes('Request has expired') || body.includes('AccessDenied');
}

/** Thông tin một "lỗi đặc biệt" phát hiện được từ exception/response. */
interface SpecialError {
  providerLimited?: boolean;
  retryAfterSeconds?: number;
  code?: string;
  message?: string;
}

function detectSpecialError(err: unknown): SpecialError | null {
  const anyErr = err as { code?: string; status?: number; retryAfterSeconds?: number; message?: string } | null;
  if (!anyErr) return null;
  if (anyErr.code === 'PROVIDER_LIMITED' || anyErr.status === 429 || anyErr.status === 503) {
    return { providerLimited: true, retryAfterSeconds: anyErr.retryAfterSeconds, code: anyErr.code };
  }
  if (anyErr.code === 'UPLOAD_SESSION_EXPIRED') {
    return { code: 'UPLOAD_SESSION_EXPIRED', message: anyErr.message };
  }
  if (anyErr.code === 'BLOCKED_FILE_TYPE' || anyErr.code === 'UPLOAD_OBJECT_MISMATCH') {
    return { code: anyErr.code, message: anyErr.message };
  }
  return null;
}

export class LargeFileUploader {
  private readonly file: Blob & { size: number };
  private session: MinimalLargeSession;
  private readonly transport: LargeUploadTransport;
  private readonly onEvent: (e: UploadEvent) => void;

  private completedParts = new Set<number>();
  private uploaded = 0;
  private total: number;
  private state: UploadState = 'sending';
  private paused = false;
  private cancelled = false;
  private abortController = new AbortController();
  private lastHeartbeatAt = 0;
  private partUrlCache = new Map<number, string>();

  constructor(
    file: Blob & { size: number },
    session: MinimalLargeSession,
    transport: LargeUploadTransport,
    onEvent: (e: UploadEvent) => void
  ) {
    this.file = file;
    this.session = session;
    this.transport = transport;
    this.onEvent = onEvent;
    this.total = file.size;
  }

  get uploadedBytes(): number {
    return this.uploaded;
  }

  private emitProgress(): void {
    this.onEvent({ type: 'progress', uploaded: this.uploaded, total: this.total, bytesPerSecond: 0 });
  }

  private emitState(state: UploadState, error?: { code: string; message: string }): void {
    this.state = state;
    this.onEvent({ type: 'state', state, error });
  }

  private async maybeHeartbeat(): Promise<void> {
    if (this.state !== 'sending') return;
    const now = this.transport.now();
    if (now - this.lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
      this.lastHeartbeatAt = now;
      await this.transport.heartbeat(this.uploaded);
    }
  }

  async start(): Promise<void> {
    this.emitState('sending');
    if (this.session.protocol === 'S3Multipart') {
      await this.runS3();
    } else {
      await this.runResumable();
    }
  }

  pause(): void {
    this.paused = true;
    this.emitState('paused');
  }

  async resume(): Promise<void> {
    this.paused = false;
    this.abortController = new AbortController();
    this.emitState('sending');
    if (this.session.protocol === 'S3Multipart') {
      await this.runS3();
    } else {
      await this.runResumable();
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
    this.abortController.abort();
    await this.transport.abort();
    this.emitState('cancelled');
  }

  // -------------------------------------------------------------------------
  // S3 multipart: tải song song tối đa maxConcurrency phần.
  // -------------------------------------------------------------------------

  private async runS3(): Promise<void> {
    const status = await this.transport.status();
    const alreadyDone = status.completedPartNumbers ?? [];
    for (const partNumber of alreadyDone) {
      if (!this.completedParts.has(partNumber)) {
        this.completedParts.add(partNumber);
        this.uploaded += this.partSize(partNumber);
      }
    }
    if (this.uploaded > 0) this.emitProgress();

    const totalParts = this.session.totalParts ?? Math.ceil(this.total / this.session.partSizeBytes);
    const pending: number[] = [];
    for (let p = 1; p <= totalParts; p++) {
      if (!this.completedParts.has(p)) pending.push(p);
    }

    const concurrency = Math.max(1, this.session.maxConcurrency);
    let cursor = 0;
    let stop = false;
    let terminalError: { code: string; message: string } | null = null;

    const worker = async (): Promise<void> => {
      while (true) {
        if (stop || this.cancelled || this.paused) return;
        const idx = cursor;
        cursor++;
        if (idx >= pending.length) return;
        const partNumber = pending[idx];
        const result = await this.uploadPartWithRetry(partNumber);
        if (result === 'cancelled') {
          stop = true;
          return;
        }
        if (result === 'paused-out') {
          stop = true;
          this.emitState('paused');
          return;
        }
        if (result === 'provider-limited') {
          stop = true;
          return;
        }
        if (typeof result === 'object') {
          stop = true;
          terminalError = result;
          return;
        }
        // success
        if (!this.completedParts.has(partNumber)) {
          this.completedParts.add(partNumber);
          this.uploaded += this.partSize(partNumber);
          this.emitProgress();
        }
        await this.maybeHeartbeat();
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, pending.length || 1) }, () => worker());
    await Promise.all(workers);

    if (this.cancelled) return;
    if (this.paused) return;
    if (terminalError) {
      this.emitState('error', terminalError);
      return;
    }
    if (this.state === 'provider-limited') return;
    if (this.completedParts.size >= totalParts) {
      await this.finishUpload();
    }
  }

  private partSize(partNumber: number): number {
    const totalParts = this.session.totalParts ?? Math.ceil(this.total / this.session.partSizeBytes);
    if (partNumber === totalParts) {
      const rem = this.total - this.session.partSizeBytes * (totalParts - 1);
      return rem > 0 ? rem : this.session.partSizeBytes;
    }
    return this.session.partSizeBytes;
  }

  private sliceForPart(partNumber: number): Blob {
    const start = (partNumber - 1) * this.session.partSizeBytes;
    const end = Math.min(start + this.session.partSizeBytes, this.total);
    return this.file.slice(start, end);
  }

  /**
   * Upload một phần với thử lại tối đa MAX_RETRIES lần (1s,2s,4s,8s,16s).
   * Link hết hạn (403 + body đặc trưng, quá expiresAt) → xin presign mới,
   * KHÔNG tính vào số lượt thử lại.
   * Trả 'success' | 'paused-out' | 'cancelled' | 'provider-limited' | { code, message }.
   */
  private async uploadPartWithRetry(
    partNumber: number
  ): Promise<'success' | 'paused-out' | 'cancelled' | 'provider-limited' | { code: string; message: string }> {
    let attempt = 0;
    const blob = this.sliceForPart(partNumber);
    const sha256 = await this.transport.sha256Base64(blob);

    while (true) {
      if (this.cancelled) return 'cancelled';
      if (this.paused) return 'paused-out';

      let url = this.partUrlCache.get(partNumber);
      if (!url) {
        url = await this.transport.presign(partNumber, sha256);
        this.partUrlCache.set(partNumber, url);
      }

      try {
        const res = await this.transport.putPart(
          url,
          blob,
          { 'x-amz-checksum-sha256': sha256 },
          this.abortController.signal
        );

        if (res.status === 403 && hasExpiredLinkBody(res.body) && Date.now() > new Date(this.session.expiresAt).getTime()) {
          // Link quá expiresAt: xin link mới, không tính lượt thử lại.
          this.partUrlCache.delete(partNumber);
          continue;
        }

        if (res.status >= 200 && res.status < 300) {
          return 'success';
        }

        if (res.status === 429 || res.status === 503) {
          this.emitState('provider-limited');
          await this.transport.sleep(1000);
          this.emitState('sending');
          continue;
        }

        attempt++;
        if (attempt > MAX_RETRIES) {
          return 'paused-out';
        }
        await this.transport.sleep(RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
        continue;
      } catch (err) {
        const special = detectSpecialError(err);
        if (special?.providerLimited) {
          this.emitState('provider-limited');
          const waitMs = special.retryAfterSeconds ? special.retryAfterSeconds * 1000 : 1000;
          await this.transport.sleep(waitMs);
          this.emitState('sending');
          continue;
        }
        if (special?.code === 'UPLOAD_SESSION_EXPIRED') {
          return { code: special.code, message: special.message ?? special.code };
        }
        if (special?.code === 'BLOCKED_FILE_TYPE' || special?.code === 'UPLOAD_OBJECT_MISMATCH') {
          return { code: special.code, message: special.message ?? special.code };
        }

        attempt++;
        if (attempt > MAX_RETRIES) {
          return 'paused-out';
        }
        await this.transport.sleep(RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
        continue;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Resumable (Google/OneDrive): queryOffset rồi gửi tuần tự từng chunk.
  // -------------------------------------------------------------------------

  private async runResumable(): Promise<void> {
    const url = this.session.directUploadUrl ?? '';
    let offset = await this.queryOffsetWithRetry(url);
    this.uploaded = offset;
    this.emitProgress();

    while (offset < this.total) {
      if (this.cancelled) return;
      if (this.paused) {
        this.emitState('paused');
        return;
      }

      const end = Math.min(offset + this.session.partSizeBytes, this.total);
      const chunk = this.file.slice(offset, end);
      const contentRange = `bytes ${offset}-${end - 1}/${this.total}`;

      const result = await this.sendChunkWithRetry(url, chunk, contentRange);
      if (result === 'cancelled') return;
      if (result === 'paused-out') {
        this.emitState('paused');
        return;
      }
      if (result === 'provider-limited') return;
      if (typeof result === 'object') {
        this.emitState('error', result);
        return;
      }

      offset = end;
      this.uploaded = offset;
      this.emitProgress();
      await this.maybeHeartbeat();
    }

    await this.finishUpload();
  }

  private async queryOffsetWithRetry(url: string): Promise<number> {
    let attempt = 0;
    while (true) {
      try {
        return await this.transport.queryOffset(url, this.total);
      } catch {
        attempt++;
        if (attempt >= MAX_RETRIES) return 0;
        await this.transport.sleep(RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
      }
    }
  }

  private async sendChunkWithRetry(
    url: string,
    chunk: Blob,
    contentRange: string
  ): Promise<'success' | 'paused-out' | 'cancelled' | 'provider-limited' | { code: string; message: string }> {
    let attempt = 0;
    while (true) {
      if (this.cancelled) return 'cancelled';
      if (this.paused) return 'paused-out';
      try {
        const res = await this.transport.putChunk(url, chunk, contentRange, this.abortController.signal);
        if (res.status >= 200 && res.status < 300) return 'success';
        if (res.status === 429 || res.status === 503) {
          this.emitState('provider-limited');
          await this.transport.sleep(res.retryAfter ? res.retryAfter * 1000 : 1000);
          this.emitState('sending');
          continue;
        }
        attempt++;
        if (attempt > MAX_RETRIES) return 'paused-out';
        await this.transport.sleep(RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
        continue;
      } catch (err) {
        const special = detectSpecialError(err);
        if (special?.providerLimited) {
          this.emitState('provider-limited');
          const waitMs = special.retryAfterSeconds ? special.retryAfterSeconds * 1000 : 1000;
          await this.transport.sleep(waitMs);
          this.emitState('sending');
          continue;
        }
        if (special?.code === 'UPLOAD_SESSION_EXPIRED') {
          return { code: special.code, message: special.message ?? special.code };
        }
        if (special?.code === 'BLOCKED_FILE_TYPE' || special?.code === 'UPLOAD_OBJECT_MISMATCH') {
          return { code: special.code, message: special.message ?? special.code };
        }
        attempt++;
        if (attempt > MAX_RETRIES) return 'paused-out';
        await this.transport.sleep(RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
        continue;
      }
    }
  }

  private async finishUpload(): Promise<void> {
    this.emitState('completing');
    try {
      await this.transport.complete();
      this.emitState('done');
    } catch (err) {
      const special = detectSpecialError(err);
      this.emitState('error', { code: special?.code ?? 'COMPLETE_FAILED', message: special?.message ?? 'complete failed' });
    }
  }
}
