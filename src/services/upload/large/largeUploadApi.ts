/**
 * Thin wrapper for the large-file-transfer upload session API.
 *
 * Built on `largeUploadClient` (src/api/largeUploadClient.ts) — a second
 * axios instance that reuses the SAME auth/idempotency request logic and
 * the SAME single-flight 401 refresh-token rotation as the shared
 * `apiClient` (src/api/axiosClient.ts), so a token expiring mid-session
 * (sessions can live up to an hour, with heartbeats roughly every 60s and
 * many sequential calls) is transparently refreshed exactly like any other
 * `apiClient` caller gets today. The only difference from `apiClient` is
 * that non-401 errors with a backend `code` field surface as `ApiCodeError`
 * instead of a plain `Error`, so callers can branch on specific codes like
 * `UPLOAD_SESSION_EXPIRED` / `TOO_MANY_ACTIVE_UPLOADS` / `BLOCKED_EXTENSION`.
 *
 * Because `largeUploadClient`'s response interceptor already returns
 * `response.data` on success (mirroring `apiClient`) and already rejects
 * with `ApiCodeError`/`Error` on failure, every function below is a plain
 * passthrough — no local try/catch needed.
 */
import { largeUploadClient } from '@/api/largeUploadClient';
import { API_ENDPOINTS } from '@/api/endpoints';

export { ApiCodeError } from '@/api/largeUploadClient';

// ---------------------------------------------------------------------------
// Types matching the backend contract (camelCase mirror of the C# DTOs)
// ---------------------------------------------------------------------------

export type ArchiveKind = 'file' | 'folder' | 'batch' | null;

export interface BeginLargeRequest {
  fileName: string;
  sizeBytes: number;
  folderId?: string | null;
  replaceFileId?: string | null;
  drive?: string | null;
  departmentId?: string | null;
  archiveKind: ArchiveKind;
}

/** Mirrors `MultipartUploadSessionDto` (C#) field-for-field, camelCased. */
export interface LargeSession {
  sessionId: string;
  fileId: string;
  documentVersion: number;
  expiresAt: string;
  reservedBytes: number;
  protocol: 'S3Multipart' | 'ResumableUri';
  directUploadUrl?: string;
  recommendedChunkSizeBytes: number;
  isLargeFile: boolean;
  partSizeBytes: number;
  totalParts?: number;
  maxConcurrency: number;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
}

/** Mirrors `UploadSessionStatusDto` (C#) field-for-field, camelCased. */
export interface UploadSessionStatus {
  sessionId: string;
  fileId: string;
  fileName: string;
  sizeBytes: number;
  status: string;
  protocol: string;
  partSizeBytes: number;
  totalParts?: number;
  completedPartNumbers: number[];
  receivedBytes: number;
  expiresAt: string;
  absoluteExpiresAt: string;
  folderId?: string | null;
}

export interface PresignPartResult {
  url: string;
  expiresAt: string;
}

export interface HeartbeatResult {
  expiresAt: string;
}

export interface ResumeSessionResult {
  directUploadUrl: string | null;
  partSizeBytes: number;
  protocol: string;
  maxConcurrency: number;
}

export interface CompleteSessionResult {
  fileId: string;
  documentVersion: number;
}

export interface DownloadLinkResult {
  url: string;
  expiresAt: string;
  mode: 'direct' | 'proxied';
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function beginLargeSession(
  req: BeginLargeRequest,
  idempotencyKey: string,
  signal?: AbortSignal
): Promise<LargeSession> {
  const res: any = await largeUploadClient.post(API_ENDPOINTS.FILES.UPLOAD_SESSIONS, req, {
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  });
  return res;
}

export interface ProxyUploadPartResult {
  confirmedBytes: number;
  isComplete: boolean;
}

/**
 * Đẩy một phần dữ liệu QUA BACKEND thay vì PUT thẳng lên provider.
 *
 * Cần cho Google Drive: phiên resumable do backend tạo nên Google không trả header CORS cho
 * origin của trang web, mọi PUT từ trình duyệt bị chặn ngay (405 + thiếu
 * Access-Control-Allow-Origin) nên file trên 100 MB không upload được.
 *
 * Backend trả 501 `PROXY_UPLOAD_NOT_SUPPORTED` với provider cho PUT trực tiếp (S3,
 * OneDrive); khi đó người gọi quay về đường presign.
 */
export async function uploadPartViaServer(
  sessionId: string,
  partNumber: number,
  offset: number,
  body: Blob,
  signal?: AbortSignal
): Promise<ProxyUploadPartResult> {
  const res: any = await largeUploadClient.put(
    `/files/upload-sessions/${sessionId}/parts/${partNumber}?offset=${offset}`,
    body,
    { signal, headers: { 'Content-Type': 'application/octet-stream' } }
  );
  return res;
}

export async function presignPart(
  sessionId: string,
  partNumber: number,
  checksumSha256: string | null,
  signal?: AbortSignal
): Promise<PresignPartResult> {
  const res: any = await largeUploadClient.post(
    API_ENDPOINTS.FILES.UPLOAD_SESSION_PRESIGN_PART(sessionId, partNumber),
    { checksumSha256 },
    { signal }
  );
  return res;
}

export async function heartbeat(sessionId: string, uploadedBytes: number): Promise<HeartbeatResult> {
  const res: any = await largeUploadClient.post(
    API_ENDPOINTS.FILES.UPLOAD_SESSION_HEARTBEAT(sessionId),
    { uploadedBytes }
  );
  return res;
}

export async function getSession(sessionId: string): Promise<UploadSessionStatus> {
  const res: any = await largeUploadClient.get(API_ENDPOINTS.FILES.UPLOAD_SESSION(sessionId));
  return res;
}

export async function listPendingSessions(): Promise<UploadSessionStatus[]> {
  const res: any = await largeUploadClient.get(API_ENDPOINTS.FILES.UPLOAD_SESSIONS_PENDING);
  return res;
}

export async function resumeSession(sessionId: string): Promise<ResumeSessionResult> {
  const res: any = await largeUploadClient.post(API_ENDPOINTS.FILES.UPLOAD_SESSION_RESUME(sessionId), null);
  return res;
}

export async function completeSession(sessionId: string): Promise<CompleteSessionResult> {
  const res: any = await largeUploadClient.post(API_ENDPOINTS.FILES.UPLOAD_SESSION_COMPLETE(sessionId), {});
  return res;
}

export async function abortSession(sessionId: string): Promise<void> {
  await largeUploadClient.delete(API_ENDPOINTS.FILES.UPLOAD_SESSION_ABORT(sessionId));
}

export async function createDownloadLink(
  fileId: string,
  acknowledgeUnscanned: boolean,
  archiveMemberId?: string
): Promise<DownloadLinkResult> {
  const res: any = await largeUploadClient.post(API_ENDPOINTS.FILES.DOWNLOAD_LINK(fileId), {
    acknowledgeUnscanned,
    ...(archiveMemberId ? { archiveMemberId } : {}),
  });
  return res;
}
