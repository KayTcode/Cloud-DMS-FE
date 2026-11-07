/**
 * Dựng `LargeUploadTransport` thật: gọi API qua `largeUploadApi.ts`, gửi dữ
 * liệu trực tiếp tới provider (S3 presigned URL / Google-OneDrive resumable
 * URI) bằng `fetch`, và tính checksum bằng `crypto.subtle`.
 *
 * Đây là file DUY NHẤT trong Task F3 được phép import — các module khác
 * (LargeFileUploader.ts) nhận mọi phụ thuộc qua tham số, không import gì.
 * File này không có bộ kiểm thử Node (sẽ kiểm tay ở Task F9); nó chỉ cần
 * biên dịch kiểu (`tsc --noEmit`) sạch.
 */
import {
  beginLargeSession,
  presignPart,
  heartbeat,
  getSession,
  completeSession,
  abortSession,
  type BeginLargeRequest,
  type LargeSession,
  type UploadSessionStatus,
} from '@/services/upload/large/largeUploadApi';
import type { LargeUploadTransport } from '@/services/upload/large/LargeFileUploader';

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Dựng transport thật cho một phiên upload đã tồn tại (`session`).
 * `beginRequest` chỉ cần khi gọi lại `begin()` (ví dụ sau khi tạo phiên mới).
 */
export function createTransport(
  session: LargeSession,
  beginRequest: BeginLargeRequest,
  idempotencyKey: string
): LargeUploadTransport {
  return {
    async begin(): Promise<LargeSession> {
      return beginLargeSession(beginRequest, idempotencyKey);
    },

    async presign(partNumber: number, sha256: string | null): Promise<string> {
      const res = await presignPart(session.sessionId, partNumber, sha256);
      return res.url;
    },

    async putPart(
      url: string,
      body: Blob,
      headers: Record<string, string>,
      signal: AbortSignal
    ): Promise<{ status: number; etag: string | null; body?: string }> {
      const res = await fetch(url, { method: 'PUT', body, headers, signal });
      let bodyText: string | undefined;
      if (!res.ok) {
        try {
          bodyText = await res.text();
        } catch {
          bodyText = undefined;
        }
      }
      return { status: res.status, etag: res.headers.get('etag'), body: bodyText };
    },

    async putChunk(
      url: string,
      body: Blob,
      contentRange: string,
      signal: AbortSignal
    ): Promise<{ status: number; rangeHeader: string | null; retryAfter: number | null }> {
      const res = await fetch(url, {
        method: 'PUT',
        body,
        headers: { 'Content-Range': contentRange },
        signal,
      });
      const retryAfterHeader = res.headers.get('Retry-After');
      return {
        status: res.status,
        rangeHeader: res.headers.get('Range'),
        retryAfter: retryAfterHeader ? Number(retryAfterHeader) : null,
      };
    },

    async queryOffset(url: string, total: number): Promise<number> {
      // Google resumable: PUT rỗng với `Content-Range: bytes */total`, đọc header `Range` trả về.
      // OneDrive: GET để lấy `nextExpectedRanges`.
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Range': `bytes */${total}` },
      });
      if (res.status === 200 || res.status === 201) return total;
      const range = res.headers.get('Range');
      if (range) {
        const match = /bytes=0-(\d+)/.exec(range);
        if (match) return Number(match[1]) + 1;
      }
      // Phương án OneDrive dự phòng: GET để lấy nextExpectedRanges.
      try {
        const getRes = await fetch(url, { method: 'GET' });
        const data: { nextExpectedRanges?: string[] } = await getRes.json();
        const first = data.nextExpectedRanges?.[0];
        if (first) {
          const start = Number(first.split('-')[0]);
          if (!Number.isNaN(start)) return start;
        }
      } catch {
        // bỏ qua, coi như chưa nhận byte nào
      }
      return 0;
    },

    async status(): Promise<UploadSessionStatus> {
      return getSession(session.sessionId);
    },

    async heartbeat(uploaded: number): Promise<void> {
      await heartbeat(session.sessionId, uploaded);
    },

    async complete(): Promise<{ fileId: string; documentVersion: number }> {
      return completeSession(session.sessionId);
    },

    async abort(): Promise<void> {
      await abortSession(session.sessionId);
    },

    async sha256Base64(blob: Blob): Promise<string> {
      const buffer = await blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return toBase64(digest);
    },

    async sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    now(): number {
      return Date.now();
    },
  };
}
