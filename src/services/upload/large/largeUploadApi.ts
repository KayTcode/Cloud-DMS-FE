/**
 * Thin axios wrapper for the large-file-transfer upload session API.
 *
 * Deliberately bypasses the shared `apiClient` response interceptor
 * (src/api/axiosClient.ts), which normalizes every error into a plain
 * `Error` and discards the HTTP status / backend error `code`. This
 * module needs the original `code` field from the backend's error body
 * to build `ApiCodeError`, so it talks to axios directly and attaches
 * the same Bearer token the shared client uses.
 */
import axios, { AxiosError } from 'axios';
import { API_ENDPOINTS } from '@/api/endpoints';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api';

/**
 * Error thrown by every function in this module when the backend error
 * response body contains a `code` field (e.g. `UPLOAD_SESSION_EXPIRED`,
 * `TOO_MANY_ACTIVE_UPLOADS`, `BLOCKED_EXTENSION`, ...).
 */
export class ApiCodeError extends Error {
  code: string;
  status: number;
  retryAfterSeconds?: number;

  constructor(code: string, status: number, message?: string, retryAfterSeconds?: number) {
    super(message || code);
    this.name = 'ApiCodeError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function rethrow(error: unknown): never {
  const axiosError = error as AxiosError<any>;
  if (axiosError?.response) {
    const { status, data } = axiosError.response;
    const code = data?.code;
    if (code) {
      const retryAfterSeconds = data?.retryAfterSeconds ?? data?.retryAfterSecond ?? undefined;
      const message = data?.message || data?.detail || data?.title || code;
      throw new ApiCodeError(code, status, message, retryAfterSeconds);
    }
  }
  throw error;
}

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
  try {
    const res = await axios.post<LargeSession>(`${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD_SESSIONS}`, req, {
      headers: { ...authHeaders(), 'Idempotency-Key': idempotencyKey },
      signal,
    });
    return res.data;
  } catch (error) {
    return rethrow(error);
  }
}

export async function presignPart(
  sessionId: string,
  partNumber: number,
  checksumSha256: string | null,
  signal?: AbortSignal
): Promise<PresignPartResult> {
  try {
    const res = await axios.post<PresignPartResult>(
      `${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD_SESSION_PRESIGN_PART(sessionId, partNumber)}`,
      { checksumSha256 },
      { headers: authHeaders(), signal }
    );
    return res.data;
  } catch (error) {
    return rethrow(error);
  }
}

export async function heartbeat(sessionId: string, uploadedBytes: number): Promise<HeartbeatResult> {
  try {
    const res = await axios.post<HeartbeatResult>(
      `${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD_SESSION_HEARTBEAT(sessionId)}`,
      { uploadedBytes },
      { headers: authHeaders() }
    );
    return res.data;
  } catch (error) {
    return rethrow(error);
  }
}

export async function getSession(sessionId: string): Promise<UploadSessionStatus> {
  try {
    const res = await axios.get<UploadSessionStatus>(
      `${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD_SESSION(sessionId)}`,
      { headers: authHeaders() }
    );
    return res.data;
  } catch (error) {
    return rethrow(error);
  }
}

export async function listPendingSessions(): Promise<UploadSessionStatus[]> {
  try {
    const res = await axios.get<UploadSessionStatus[]>(
      `${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD_SESSIONS_PENDING}`,
      { headers: authHeaders() }
    );
    return res.data;
  } catch (error) {
    return rethrow(error);
  }
}

export async function resumeSession(sessionId: string): Promise<ResumeSessionResult> {
  try {
    const res = await axios.post<ResumeSessionResult>(
      `${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD_SESSION_RESUME(sessionId)}`,
      null,
      { headers: authHeaders() }
    );
    return res.data;
  } catch (error) {
    return rethrow(error);
  }
}

export async function completeSession(sessionId: string): Promise<CompleteSessionResult> {
  try {
    const res = await axios.post<CompleteSessionResult>(
      `${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD_SESSION_COMPLETE(sessionId)}`,
      {},
      { headers: authHeaders() }
    );
    return res.data;
  } catch (error) {
    return rethrow(error);
  }
}

export async function abortSession(sessionId: string): Promise<void> {
  try {
    await axios.delete<boolean>(`${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD_SESSION_ABORT(sessionId)}`, {
      headers: authHeaders(),
    });
  } catch (error) {
    return rethrow(error);
  }
}

export async function createDownloadLink(
  fileId: string,
  acknowledgeUnscanned: boolean
): Promise<DownloadLinkResult> {
  try {
    const res = await axios.post<DownloadLinkResult>(
      `${BASE_URL}${API_ENDPOINTS.FILES.DOWNLOAD_LINK(fileId)}`,
      { acknowledgeUnscanned },
      { headers: authHeaders() }
    );
    return res.data;
  } catch (error) {
    return rethrow(error);
  }
}
