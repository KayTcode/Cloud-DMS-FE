import apiClient from '@/api/axiosClient';
import { CloudDirectUploader, DirectUploadProgress } from '@/services/upload/CloudDirectUploader';
import {
  DriveItem,
  FileType,
  FileTextResult,
  PersonalStorageQuotaDto,
  PreviewResult,
  TrashFileListResponse,
} from '../types';

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const detectFileType = (fileName: string, mimeType?: string): { type: FileType; ext: string } => {
  const parts = fileName ? fileName.split('.') : [];
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';

  if (['pdf'].includes(ext)) return { type: 'pdf', ext };
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return { type: 'docx', ext };
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return { type: 'sheet', ext };
  if (['ppt', 'pptx', 'key'].includes(ext)) return { type: 'slide', ext };
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) return { type: 'image', ext };
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return { type: 'archive', ext };
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'html', 'css', 'yaml', 'yml', 'sql', 'c', 'cpp', 'cs'].includes(ext)) {
    return { type: 'code', ext };
  }
  return { type: 'other', ext: ext || 'file' };
};

export const mapFileEntryToDriveItem = (dto: any, isTrash = false): DriveItem => {
  const name = dto.name || dto.fileName || 'Tệp không tên';
  const { type: fileType, ext } = detectFileType(name, dto.contentType);
  const sizeBytes = dto.sizeBytes ?? dto.size ?? 0;

  return {
    id: dto.id,
    name,
    type: 'file',
    fileType,
    extension: ext,
    size: sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    updatedAt: dto.deletedAt
      ? new Date(dto.deletedAt).toLocaleDateString('vi-VN') + ' ' + new Date(dto.deletedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : dto.updatedAt
      ? new Date(dto.updatedAt).toLocaleDateString('vi-VN')
      : new Date(dto.createdAt || Date.now()).toLocaleDateString('vi-VN'),
    createdAt: dto.createdAt
      ? new Date(dto.createdAt).toLocaleDateString('vi-VN')
      : new Date().toLocaleDateString('vi-VN'),
    deletedAt: dto.deletedAt
      ? new Date(dto.deletedAt).toLocaleDateString('vi-VN') + ' ' + new Date(dto.deletedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : undefined,
    deletedBy: dto.deletedByName || undefined,
    storageProvider: dto.storageProviderName || dto.storageProvider || undefined,
    owner: {
      name: dto.ownerName || 'Tôi',
      email: dto.ownerEmail || '',
    },
    parentId: dto.folderId || null,
    starred: Boolean(dto.isStarred),
    trashed: isTrash || Boolean(dto.isDeleted),
    sharedWith: dto.isShared ? ['shared'] : (dto.sharedWith || []),
    tags: [dto.contentType?.split('/')[1]?.toUpperCase() || ext?.toUpperCase() || 'FILE'],
    department: dto.departmentName || '',
    previewUrl: dto.previewUrl,
  };
};

export const driveApi = {
  // Fetch files and folders for current user (My Drive) from dedicated endpoint
  getDriveItems: async (folderId?: string | null, searchTerm?: string, filter?: string): Promise<DriveItem[]> => {
    try {
      const res: any = await apiClient.get('/users/me/files', {
        params: {
          folderId: folderId || undefined,
          searchTerm: searchTerm?.trim() || undefined,
          filter: filter || undefined,
          pageSize: 100,
        },
      });
      const data = res?.value ?? res?.data ?? res;
      const fileList = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.files)
        ? data.files
        : [];

      return fileList.map((item: any) => mapFileEntryToDriveItem(item, false));
    } catch (error) {
      console.error('Lỗi khi tải danh sách tệp tin:', error);
      return [];
    }
  },

  // Upload files to current directory (Traditional / Legacy Stream through Backend)
  uploadFiles: async (files: FileList | File[], folderId?: string | null): Promise<any> => {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    if (folderId) formData.append('folderId', folderId);

    const res: any = await apiClient.post('/files/upload', formData);
    return res?.value ?? res?.data ?? res;
  },

  // Upload files using Direct-to-Storage (Google Drive / OneDrive / S3 - New Method)
  uploadDirectFiles: async (
    files: FileList | File[],
    folderId?: string | null,
    onProgress?: (fileName: string, progress: DirectUploadProgress) => void
  ): Promise<any> => {
    const fileArray = Array.from(files);
    const uploaded: any[] = [];
    const failed: any[] = [];

    for (const file of fileArray) {
      try {
        const result = await CloudDirectUploader.upload({
          file,
          folderId: folderId || null,
          onProgress: (p) => onProgress?.(file.name, p),
        });
        uploaded.push({
          id: result.fileId,
          fileName: file.name,
          name: file.name,
          sizeBytes: file.size,
          size: file.size,
          documentVersion: result.documentVersion,
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) {
        failed.push({
          fileName: file.name,
          fileSize: file.size,
          error: err?.message || 'Tải trực tiếp lên Cloud thất bại',
        });
      }
    }

    return {
      uploaded,
      failed,
      allSucceeded: failed.length === 0,
      totalFiles: fileArray.length,
    };
  },

  // Create folder
  createFolder: async (name: string, parentId?: string | null): Promise<DriveItem> => {
    const res: any = await apiClient.post('/folders', {
      name,
      parentId: parentId || null,
    });
    return res?.value ?? res?.data ?? res;
  },

  // Toggle star
  toggleStar: async (itemId: string, starred: boolean): Promise<void> => {
    await apiClient.put(`/files/${itemId}/star`, { starred });
  },

  // Move to trash (Soft Delete - DELETE /api/files/{id})
  moveToTrash: async (itemId: string): Promise<any> => {
    const key = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return await apiClient.delete(`/files/${itemId}`, {
      headers: { 'Idempotency-Key': key },
    });
  },

  // Restore from trash (POST /api/files/{id}/restore)
  restoreFile: async (itemId: string): Promise<any> => {
    const key = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return await apiClient.post(`/files/${itemId}/restore`, null, {
      headers: { 'Idempotency-Key': key },
    });
  },

  // Permanently delete (DELETE /api/files/{id}/permanent)
  deletePermanently: async (itemId: string): Promise<any> => {
    const key = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return await apiClient.delete(`/files/${itemId}/permanent`, {
      headers: { 'Idempotency-Key': key },
    });
  },

  // Fetch trash files list with summary (GET /api/files/trash)
  getTrashFiles: async (
    pageNumber = 1,
    pageSize = 50,
    searchTerm?: string,
    departmentId?: string
  ): Promise<TrashFileListResponse> => {
    try {
      const res: any = await apiClient.get('/files/trash', {
        params: {
          pageNumber,
          pageSize,
          searchTerm: searchTerm || undefined,
          departmentId: departmentId || undefined,
        },
      });
      const data = res?.value ?? res?.data ?? res;
      const rawItems = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.files)
        ? data.files
        : [];

      return {
        items: rawItems.map((dto: any) => mapFileEntryToDriveItem(dto, true)),
        totalCount: data?.totalCount ?? rawItems.length,
        pageNumber: data?.pageNumber ?? pageNumber,
        pageSize: data?.pageSize ?? pageSize,
        totalSizeBytes: data?.totalTrashSizeBytes ?? data?.totalSizeBytes ?? 0,
        hasMore: data?.hasMore ?? false,
      };
    } catch (error) {
      console.error('Lỗi khi tải thùng rác:', error);
      return {
        items: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize,
        totalSizeBytes: 0,
        hasMore: false,
      };
    }
  },

  // Get file preview (GET /api/files/{id}/preview, with fallback to POST /api/files/{id}/preview)
  getFilePreview: async (fileId: string): Promise<PreviewResult> => {
    try {
      const res: any = await apiClient.get(`/files/${fileId}/preview`);
      const preview = res?.value ?? res?.data ?? res;
      if (preview && preview.status === 'ready') {
        return preview;
      }
      // If pending or no url, trigger request preview to ensure background worker renders it
      if (!preview || preview.status === 'pending') {
        await apiClient.post(`/files/${fileId}/preview`).catch(() => {});
      }
      return preview ?? { status: 'pending', documentVersion: 0, reason: 'PENDING' };
    } catch (error: any) {
      // If 404/unavailable or not yet triggered, trigger preview request
      try {
        const postRes: any = await apiClient.post(`/files/${fileId}/preview`);
        return postRes?.value ?? postRes?.data ?? postRes;
      } catch (innerErr: any) {
        return {
          status: 'unavailable',
          documentVersion: 0,
          reason: innerErr?.message || 'Xem trước không khả dụng',
        };
      }
    }
  },

  // Trigger preview generation explicitly (POST /api/files/{id}/preview)
  requestFilePreview: async (fileId: string): Promise<PreviewResult> => {
    const res: any = await apiClient.post(`/files/${fileId}/preview`);
    return res?.value ?? res?.data ?? res;
  },

  // Get extracted text chunks (GET /api/files/{id}/text)
  getFileText: async (
    fileId: string,
    limit = 20,
    cursor?: string | null
  ): Promise<FileTextResult> => {
    try {
      const res: any = await apiClient.get(`/files/${fileId}/text`, {
        params: { limit, cursor: cursor || undefined },
      });
      return res?.value ?? res?.data ?? res;
    } catch (error: any) {
      return {
        status: 'unavailable',
        documentVersion: 0,
        items: [],
        reason: error?.message || 'Không thể trích xuất văn bản.',
      };
    }
  },

  // Download file securely with Bearer token (GET /api/files/{id}/download)
  downloadFile: async (fileId: string, fileName = 'download'): Promise<void> => {
    const res: any = await apiClient.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([res]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Share item
  shareItem: async (itemId: string, emails: string[]): Promise<void> => {
    await apiClient.post(`/files/${itemId}/share`, { emails });
  },
};

export const userApi = {
  // Lấy hạn mức dung lượng lưu trữ cá nhân
  getMyQuota: async (): Promise<PersonalStorageQuotaDto> => {
    const res: any = await apiClient.get('/users/me/quota');
    return res?.value ?? res?.data ?? res;
  },

  getProfile: async () => {
    const res: any = await apiClient.get('/users/profile');
    return res?.value ?? res?.data ?? res;
  },

  updateProfile: async (payload: any) => {
    const res: any = await apiClient.put('/users/profile', payload);
    return res?.value ?? res?.data ?? res;
  },

  requestQuotaIncrease: async (payload: { requestedGB: number; reason: string }) => {
    const res: any = await apiClient.post('/users/request-quota', payload);
    return res?.value ?? res?.data ?? res;
  },
};
