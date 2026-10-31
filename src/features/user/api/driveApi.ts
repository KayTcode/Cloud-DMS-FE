import apiClient from '@/api/axiosClient';
import { CloudDirectUploader, DirectUploadProgress } from '@/services/upload/CloudDirectUploader';
import {
  DriveItem,
  FileType,
  FileTextResult,
  PersonalStorageQuotaDto,
  PreviewResult,
  SharedFileItem,
  SharedFileListResponse,
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

export const mapSharedFileItemDto = (dto: any): SharedFileItem => {
  const name = dto.name || dto.fileName || 'Tệp không tên';
  const { type: fileType, ext } = detectFileType(name, dto.contentType);
  const sizeBytes = dto.sizeBytes ?? dto.size ?? 0;
  const sharedAt = dto.sharedAt || dto.createdAt || new Date().toISOString();

  return {
    id: dto.id,
    name,
    type: 'file',
    fileType,
    extension: ext,
    size: sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    ownerId: dto.ownerId,
    owner: {
      name: dto.ownerName || 'Unknown',
      email: dto.ownerEmail || '',
    },
    sharedAt,
    sharedAtFormatted: new Date(sharedAt).toLocaleDateString('vi-VN') + ' ' + new Date(sharedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    expiresAt: dto.expiresAt,
    expiresAtFormatted: dto.expiresAt ? new Date(dto.expiresAt).toLocaleDateString('vi-VN') + ' ' + new Date(dto.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : undefined,
    permissionLevel: dto.permissionLevel || (dto.canWrite ? 'Editor' : 'Viewer'),
    canRead: dto.canRead ?? true,
    canWrite: Boolean(dto.canWrite),
    canDelete: Boolean(dto.canDelete),
    storageProvider: dto.storageProviderName || undefined,
    storageProviderType: dto.storageProviderType || undefined,
    department: dto.departmentName || undefined,
    createdAt: dto.createdAt ? new Date(dto.createdAt).toLocaleDateString('vi-VN') : '',
    scanStatus: dto.scanStatus || 'Clean',
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
  uploadFiles: async (files: FileList | File[], folderId?: string | null, directories: string[] = []): Promise<any> => {
    const formData = new FormData();
    const selection = Array.from(files);
    const packaged = directories.length > 0 || selection.length > 1 || selection.some((f) => !!f.webkitRelativePath);
    selection.forEach((f) => {
      formData.append('files', f);
      if (packaged) formData.append('relativePaths', f.webkitRelativePath || f.name);
    });
    if (packaged) {
      formData.append('compression', 'fastest');
      directories.forEach((directory) => formData.append('directories', directory));
      const root = selection[0]?.webkitRelativePath?.split('/')[0] || directories[0]?.split('/')[0];
      formData.append('name', root ? `${root}.zip` : `package-${Date.now()}.zip`);
    }
    if (folderId) formData.append('folderId', folderId);

    const res: any = await apiClient.post(packaged ? '/files/packages' : '/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600000 });
    if (packaged) return { uploaded: [res?.value ?? res?.data ?? res], failed: [], allSucceeded: true };
    return res?.value ?? res?.data ?? res;
  },

  // Upload files using Direct-to-Storage (Google Drive / OneDrive / S3 - New Method)
  uploadDirectFiles: async (
    files: FileList | File[],
    folderId?: string | null,
    onProgress?: (fileName: string, progress: DirectUploadProgress) => void
  ): Promise<any> => {
    const fileArray = Array.from(files);
    // Batches/folders must remain one indexed package, including when initiated from the Direct button.
    if (fileArray.length > 1 || fileArray.some((file) => !!file.webkitRelativePath))
      return driveApi.uploadFiles(fileArray, folderId);
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
  createFolder: async (
    name: string,
    parentId?: string | null,
    drive?: string,
    departmentId?: string
  ): Promise<DriveItem> => {
    const res: any = await apiClient.post('/folders', {
      name,
      parentId: parentId || null,
      drive: drive || (departmentId ? 'shared' : 'personal'),
      departmentId: departmentId || null,
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

  // Lấy danh sách tệp tin được chia sẻ với người dùng hiện tại
  getSharedFiles: async (params?: {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    fileType?: string;
    sharedBy?: string;
    sortBy?: string;
    sortDirection?: string;
  }): Promise<SharedFileListResponse> => {
    try {
      const res: any = await apiClient.get('/files/shared', {
        params: {
          pageNumber: params?.pageNumber ?? 1,
          pageSize: params?.pageSize ?? 20,
          searchTerm: params?.searchTerm?.trim() || undefined,
          fileType: params?.fileType || undefined,
          sharedBy: params?.sharedBy?.trim() || undefined,
          sortBy: params?.sortBy || 'date',
          sortDirection: params?.sortDirection || 'desc',
        },
      });
      const data = res?.value ?? res?.data ?? res;
      const rawItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      const items = rawItems.map(mapSharedFileItemDto);

      return {
        items,
        totalCount: data?.totalCount ?? items.length,
        pageNumber: data?.pageNumber ?? 1,
        pageSize: data?.pageSize ?? 20,
        hasMore: Boolean(data?.hasMore),
      };
    } catch (error) {
      console.error('Lỗi khi tải danh sách tệp tin chia sẻ:', error);
      throw error;
    }
  },

  getArchiveTree: async (fileId: string): Promise<ArchiveMember[]> => {
    const res: any = await apiClient.get(`/files/${fileId}/archive`);
    return res?.value ?? res?.data ?? res;
  },
  downloadArchiveMember: async (fileId: string, memberId: string, name: string): Promise<void> => {
    const blob: any = await apiClient.get(`/files/${fileId}/archive/${memberId}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  getFileShares: async (fileId: string): Promise<FileShareRecipient[]> => {
    const res: any = await apiClient.get(`/files/${fileId}/shares`);
    return res?.value ?? res?.data ?? res;
  },

  // Chia sẻ tệp tin cho đồng nghiệp trong tổ chức
  shareFile: async (fileId: string, email: string, role: string = 'Viewer', expiresAt?: string): Promise<any> => {
    const res: any = await apiClient.post(`/files/${fileId}/share`, {
      email,
      role,
      expiresAt: expiresAt || null,
    });
    return res?.value ?? res?.data ?? res;
  },

  // Thu hồi quyền chia sẻ tệp tin
  revokeShare: async (fileId: string, recipientId: string): Promise<any> => {
    const res: any = await apiClient.delete(`/files/${fileId}/share/${recipientId}`);
    return res?.value ?? res?.data ?? res;
  },

  // Backward compatibility alias for share
  shareItem: async (itemId: string, emails: string[]): Promise<void> => {
    if (emails.length > 0) {
      await apiClient.post(`/files/${itemId}/share`, { email: emails[0], role: 'Viewer' });
    }
  },
};

export interface FileShareRecipient {
  recipientId: string;
  email: string;
  name: string;
  role: 'Viewer' | 'Editor';
  expiresAt?: string;
}

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

export interface ArchiveMember {
  id: string;
  path: string;
  parentPath: string;
  name: string;
  isDirectory: boolean;
  sizeBytes: number;
}