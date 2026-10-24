import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';

export interface MultipartUploadSessionResponse {
  sessionId: string;
  fileId: string;
  documentVersion: number;
  expiresAt: string;
  reservedBytes: number;
  protocol: 'S3Multipart' | 'ResumableUri' | string;
  directUploadUrl?: string | null;
  recommendedChunkSizeBytes: number;
}

export interface DirectUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface DirectUploadOptions {
  file: File;
  folderId?: string | null;
  replaceFileId?: string | null;
  onProgress?: (progress: DirectUploadProgress) => void;
  signal?: AbortSignal;
}

export interface DirectUploadResult {
  fileId: string;
  documentVersion: number;
  sessionId: string;
}

const DEFAULT_CHUNK_SIZE = 3276800; // 3.2MB

export class CloudDirectUploader {
  /**
   * Khởi tạo phiên tải trực tiếp và upload file lên Cloud Storage (Google Drive, OneDrive hoặc S3)
   */
  static async upload(options: DirectUploadOptions): Promise<DirectUploadResult> {
    const { file, folderId, replaceFileId, onProgress, signal } = options;

    // 1. Tạo session tải lên từ Backend
    const idempotencyKey = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const sessionResponse = await apiClient.post<any, any>(
      API_ENDPOINTS.FILES.UPLOAD_SESSIONS,
      {
        fileName: file.name,
        sizeBytes: file.size,
        folderId: folderId || null,
        replaceFileId: replaceFileId || null,
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        signal,
      }
    );

    const session: MultipartUploadSessionResponse =
      sessionResponse?.value || sessionResponse?.data || sessionResponse;

    if (!session || !session.sessionId) {
      throw new Error('Failed to initiate upload session.');
    }

    try {
      if (session.protocol === 'ResumableUri' && session.directUploadUrl) {
        // 2A. Luồng Resumable Upload (Google Drive / Microsoft OneDrive)
        return await this.uploadResumable(file, session, onProgress, signal);
      } else {
        // 2B. Luồng S3 Multipart Upload
        return await this.uploadS3Multipart(file, session, onProgress, signal);
      }
    } catch (error) {
      // Nếu có lỗi, cố gắng hủy session trên backend
      try {
        await apiClient.delete(API_ENDPOINTS.FILES.UPLOAD_SESSION_ABORT(session.sessionId));
      } catch {
        // Bỏ qua lỗi hủy phiên
      }
      throw error;
    }
  }

  /**
   * Tải lên Resumable (Google Drive / OneDrive) bằng từng chunk PUT với header Content-Range
   */
  private static async uploadResumable(
    file: File,
    session: MultipartUploadSessionResponse,
    onProgress?: (progress: DirectUploadProgress) => void,
    signal?: AbortSignal
  ): Promise<DirectUploadResult> {
    const uploadUrl = session.directUploadUrl!;
    const totalSize = file.size;
    const chunkSize = session.recommendedChunkSizeBytes || DEFAULT_CHUNK_SIZE;
    let offset = 0;
    let cloudFileId: string | null = null;

    while (offset < totalSize) {
      if (signal?.aborted) {
        throw new Error('Upload aborted by user.');
      }

      const chunkEnd = Math.min(offset + chunkSize, totalSize);
      const chunk = file.slice(offset, chunkEnd);
      const contentRange = `bytes ${offset}-${chunkEnd - 1}/${totalSize}`;

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': contentRange,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: chunk,
        signal,
      });

      if (!response.ok && response.status !== 308) {
        // 308 Resume Incomplete là mã chuẩn của Google Drive Resumable
        const errorText = await response.text();
        throw new Error(`Cloud upload chunk failed [${response.status}]: ${errorText}`);
      }

      offset = chunkEnd;
      if (onProgress) {
        onProgress({
          loaded: offset,
          total: totalSize,
          percentage: Math.round((offset / totalSize) * 100),
        });
      }

      // Khi chunk cuối hoàn thành, Cloud (Google Drive / OneDrive) sẽ trả về thông tin file (chứa id)
      if (response.status === 200 || response.status === 201) {
        try {
          const json = await response.json();
          cloudFileId = json.id || json.name || null;
        } catch {
          // Response body có thể rỗng hoặc không phải JSON
        }
      }
    }

    // 3. Hoàn tất phiên tải lên trên Backend với CloudFileId
    const completeResponse = await apiClient.post<any, any>(
      API_ENDPOINTS.FILES.UPLOAD_SESSION_COMPLETE(session.sessionId),
      {
        cloudFileId: cloudFileId || null,
        parts: null,
      },
      { signal }
    );

    const result = completeResponse?.value || completeResponse?.data || completeResponse;
    return {
      fileId: result?.fileId || session.fileId,
      documentVersion: result?.documentVersion || session.documentVersion,
      sessionId: session.sessionId,
    };
  }

  /**
   * Tải lên S3 Multipart
   */
  private static async uploadS3Multipart(
    file: File,
    session: MultipartUploadSessionResponse,
    onProgress?: (progress: DirectUploadProgress) => void,
    signal?: AbortSignal
  ): Promise<DirectUploadResult> {
    const totalSize = file.size;
    const chunkSize = Math.max(5 * 1024 * 1024, session.recommendedChunkSizeBytes || DEFAULT_CHUNK_SIZE);
    const totalParts = Math.ceil(totalSize / chunkSize);
    const parts: { number: number; eTag: string }[] = [];
    let uploadedBytes = 0;

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      if (signal?.aborted) {
        throw new Error('Upload aborted by user.');
      }

      // Xin Pre-signed URL cho Part
      const presignResponse = await apiClient.post<any, any>(
        API_ENDPOINTS.FILES.UPLOAD_SESSION_PRESIGN_PART(session.sessionId, partNumber),
        {},
        { signal }
      );
      const presignData = presignResponse?.value || presignResponse?.data || presignResponse;
      const partUrl = presignData.url || presignData;

      const start = (partNumber - 1) * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const chunk = file.slice(start, end);

      const putResponse = await fetch(partUrl, {
        method: 'PUT',
        body: chunk,
        signal,
      });

      if (!putResponse.ok) {
        throw new Error(`S3 part ${partNumber} upload failed [${putResponse.status}]`);
      }

      const eTag = putResponse.headers.get('ETag')?.replace(/"/g, '') || `etag-part-${partNumber}`;
      parts.push({ number: partNumber, eTag });

      uploadedBytes += end - start;
      if (onProgress) {
        onProgress({
          loaded: uploadedBytes,
          total: totalSize,
          percentage: Math.round((uploadedBytes / totalSize) * 100),
        });
      }
    }

    // Hoàn tất phiên S3 multipart
    const completeResponse = await apiClient.post<any, any>(
      API_ENDPOINTS.FILES.UPLOAD_SESSION_COMPLETE(session.sessionId),
      {
        parts,
      },
      { signal }
    );

    const result = completeResponse?.value || completeResponse?.data || completeResponse;
    return {
      fileId: result?.fileId || session.fileId,
      documentVersion: result?.documentVersion || session.documentVersion,
      sessionId: session.sessionId,
    };
  }
}
