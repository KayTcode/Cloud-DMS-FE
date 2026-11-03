import apiClient from '@/api/axiosClient';
import {
  DocumentDetailsDto,
  DocumentSubmissionResultDto,
  ExtendRetentionPayload,
  ReplaceDocumentFilePayload,
  UpdateDocumentMetadataPayload,
  UploadDocumentPayload,
} from '../types';

export const documentApi = {
  /**
   * Nộp tài liệu 1 bước nguyên tử kèm siêu dữ liệu (Multipart Form)
   */
  uploadWithMetadata: async (
    payload: UploadDocumentPayload,
    onProgress?: (percent: number) => void
  ): Promise<DocumentSubmissionResultDto> => {
    const formData = new FormData();
    formData.append('file', payload.file);

    // Gửi folderId nếu là GUID hợp lệ (bỏ qua các virtual folder ID như 'drive-personal', 'drive-shared')
    const rawFolderId = payload.parentFolderId || (payload as any).folderId;
    const isGuid = (val?: string | null): boolean => {
      if (!val) return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
    };

    if (rawFolderId && isGuid(rawFolderId)) {
      formData.append('folderId', rawFolderId.trim());
      formData.append('parentFolderId', rawFolderId.trim());
    }
    if (payload.retentionDays !== undefined && payload.retentionDays !== null) {
      formData.append('retentionDays', payload.retentionDays.toString());
    }

    formData.append('title', payload.title.trim());

    // Gửi cả issueYear và releaseYear để khớp với C# Backend UploadDocumentWithMetadataRequest
    const year = payload.releaseYear || (payload as any).issueYear || new Date().getFullYear();
    formData.append('issueYear', year.toString());
    formData.append('releaseYear', year.toString());

    const month = payload.releaseMonth !== undefined && payload.releaseMonth !== null
      ? payload.releaseMonth
      : (payload as any).issueMonth;
    if (month !== undefined && month !== null && month !== '') {
      formData.append('issueMonth', month.toString());
      formData.append('releaseMonth', month.toString());
    }

    const day = payload.releaseDay !== undefined && payload.releaseDay !== null
      ? payload.releaseDay
      : (payload as any).issueDay;
    if (day !== undefined && day !== null && day !== '') {
      formData.append('issueDay', day.toString());
      formData.append('releaseDay', day.toString());
    }

    if (payload.keywords?.trim()) {
      formData.append('keywords', payload.keywords.trim());
    }
    if (payload.abstract?.trim()) {
      formData.append('abstract', payload.abstract.trim());
    }
    if (payload.description?.trim()) {
      formData.append('description', payload.description.trim());
    }

    const res: any = await apiClient.post('/documents/upload-with-metadata', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
      timeout: 300000,
    });

    return res?.value ?? res?.data ?? res;
  },

  /**
   * Thay thế tệp vật lý mới, xóa sạch tệp cũ trên Cloud S3, giữ nguyên 100% siêu dữ liệu
   */
  replaceFile: async (
    payload: ReplaceDocumentFilePayload,
    onProgress?: (percent: number) => void
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('newFile', payload.newFile);

    const res: any = await apiClient.put(`/documents/${payload.fileId}/replace-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
      timeout: 300000,
    });

    return res?.value ?? res?.data ?? res;
  },

  /**
   * Cập nhật siêu dữ liệu tài liệu (Giữ nguyên tệp vật lý trên S3)
   */
  updateMetadata: async (payload: UpdateDocumentMetadataPayload): Promise<any> => {
    const { fileId, ...body } = payload;
    const year = payload.releaseYear || (payload as any).issueYear;
    const month = payload.releaseMonth || (payload as any).issueMonth;
    const day = payload.releaseDay || (payload as any).issueDay;

    const requestBody = {
      ...body,
      issueYear: year,
      releaseYear: year,
      issueMonth: month,
      releaseMonth: month,
      issueDay: day,
      releaseDay: day,
    };
    const res: any = await apiClient.put(`/documents/${fileId}/metadata`, requestBody);
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Gia hạn thời hạn lưu trữ tài liệu
   */
  extendRetention: async (payload: ExtendRetentionPayload): Promise<any> => {
    const res: any = await apiClient.post(`/documents/${payload.fileId}/extend-retention`, {
      additionalDays: payload.additionalDays,
    });
    return res?.value ?? res?.data ?? res;
  },

  /**
   * Lấy chi tiết tài liệu kèm siêu dữ liệu và trạng thái vòng đời
   */
  getDocumentDetails: async (fileId: string): Promise<DocumentDetailsDto> => {
    const res: any = await apiClient.get(`/documents/${fileId}`);
    const raw = res?.value ?? res?.data ?? res;
    if (!raw) return raw;

    // Chuẩn hóa metadata nếu Backend trả về flat fields hoặc nested metadata
    const metadata = raw.metadata || ((raw.metadataId || raw.title) ? {
      id: raw.metadataId || raw.id || '',
      fileEntryId: raw.fileId || fileId,
      author: raw.author || raw.ownerName || '',
      title: raw.title || raw.name || raw.fileName || '',
      otherTitle: raw.otherTitle || null,
      releaseYear: raw.issueYear || raw.releaseYear || 0,
      releaseMonth: raw.issueMonth || raw.releaseMonth || null,
      releaseDay: raw.issueDay || raw.releaseDay || null,
      releaseDateFormatted: raw.releaseDateFormatted || (raw.issueYear
        ? (raw.issueDay && raw.issueMonth
          ? `${raw.issueDay}/${raw.issueMonth}/${raw.issueYear}`
          : raw.issueMonth
            ? `${raw.issueMonth}/${raw.issueYear}`
            : `Năm ${raw.issueYear}`)
        : ''),
      keywords: raw.keywords || null,
      abstract: raw.abstract || null,
      description: raw.description || null,
    } : null);

    const now = new Date().getTime();
    const expires = raw.expiresAt ? new Date(raw.expiresAt).getTime() : null;
    const computedDaysRemaining = expires ? Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24))) : null;

    return {
      fileId: raw.fileId || fileId,
      fileName: raw.name || raw.fileName || '',
      contentType: raw.contentType || '',
      sizeBytes: raw.sizeBytes || 0,
      uploadedAt: raw.createdAt || raw.uploadedAt || '',
      parentFolderId: raw.folderId || null,
      driveKind: raw.driveKind || 'Personal',
      retentionDays: raw.retentionDays || null,
      expiresAt: raw.expiresAt || null,
      daysRemaining: raw.daysRemaining !== undefined && raw.daysRemaining !== null ? raw.daysRemaining : computedDaysRemaining,
      metadata: metadata,
      ...raw,
    };
  },
};
