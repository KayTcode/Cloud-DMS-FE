import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import { packageForStorage, extractStorageZip } from '@/services/upload/storageZip';
import { CloudDirectUploader, DirectUploadProgress } from '@/services/upload/CloudDirectUploader';
import { downloadViaLink } from '@/services/download/linkDownload';
import {
  DriveItem,
  FileType,
  PersonalStorageQuotaDto,
  SharedFileItem,
  SharedFileListResponse,
  SharedByMeFileItem,
  SharedByMeFileListResponse,
  SharedByMeRecipient,
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
  const sizeBytes = dto.originalSizeBytes ?? dto.sizeBytes ?? dto.size ?? 0;

  return {
    id: dto.id,
    archiveKind: dto.archiveKind,
    originalSizeBytes: dto.originalSizeBytes,
    name,
    type: 'file',
    fileType: dto.archiveKind === 'folder' || dto.archiveKind === 'batch' ? 'folder' : fileType,
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
    metadata: dto.metadata || null,
    department: dto.departmentName || '',
    authorName: dto.authorName || undefined,
    isSharedLink: dto.isSharedLink ?? undefined,
    isSharedToDepartment: dto.isSharedToDepartment ?? undefined,
    scanStatus: dto.scanStatus ?? null,
  };
};

export const mapSharedFileItemDto = (dto: any): SharedFileItem => {
  const name = dto.name || dto.fileName || 'Tệp không tên';
  const { type: fileType, ext } = detectFileType(name, dto.contentType);
  const sizeBytes = dto.originalSizeBytes ?? dto.sizeBytes ?? dto.size ?? 0;
  const sharedAt = dto.sharedAt || dto.createdAt || new Date().toISOString();

  return {
    id: dto.id,
    archiveKind: dto.archiveKind,
    originalSizeBytes: dto.originalSizeBytes,
    name,
    type: 'file',
    fileType: dto.archiveKind === 'folder' || dto.archiveKind === 'batch' ? 'folder' : fileType,
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
    metadata: dto.metadata ? {
      ...dto.metadata,
      releaseYear: dto.metadata.issueYear || dto.metadata.releaseYear || 0,
      issueYear: dto.metadata.issueYear || dto.metadata.releaseYear || 0,
    } : null,
  };
};

export const mapSharedByMeFileItemDto = (dto: any): SharedByMeFileItem => {
  const name = dto.name || dto.fileName || 'Tệp không tên';
  const { type: fileType, ext } = detectFileType(name, dto.contentType);
  const sizeBytes = dto.originalSizeBytes ?? dto.sizeBytes ?? dto.size ?? 0;
  const latestSharedAt = dto.latestSharedAt || dto.createdAt || new Date().toISOString();

  const recipients: SharedByMeRecipient[] = (dto.recipients || []).map((r: any) => ({
    recipientId: r.recipientId || r.id,
    name: r.name || r.email || 'Người dùng',
    email: r.email || '',
    role: r.role || 'Viewer',
    expiresAt: r.expiresAt || null,
    sharedAt: r.sharedAt || new Date().toISOString(),
  }));

  return {
    id: dto.id,
    archiveKind: dto.archiveKind,
    originalSizeBytes: dto.originalSizeBytes,
    name,
    type: 'file',
    fileType: dto.archiveKind === 'folder' || dto.archiveKind === 'batch' ? 'folder' : fileType,
    extension: ext,
    size: sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt).toLocaleDateString('vi-VN') : '',
    createdAt: dto.createdAt ? new Date(dto.createdAt).toLocaleDateString('vi-VN') : '',
    scanStatus: dto.scanStatus || 'Clean',
    storageProvider: dto.storageProviderName || undefined,
    storageProviderType: dto.storageProviderType || undefined,
    department: dto.departmentName || undefined,
    title: dto.title || dto.metadata?.title || null,
    author: dto.author || dto.metadata?.author || null,
    totalRecipients: dto.totalRecipients ?? recipients.length,
    latestSharedAt,
    latestSharedAtFormatted: new Date(latestSharedAt).toLocaleDateString('vi-VN') + ' ' + new Date(latestSharedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    recipients,
    metadata: dto.metadata ? {
      ...dto.metadata,
      releaseYear: dto.metadata.issueYear || dto.metadata.releaseYear || 0,
      issueYear: dto.metadata.issueYear || dto.metadata.releaseYear || 0,
    } : null,
  };
};

export const driveApi = {
  /**
   * Tìm kiếm lai (từ khoá + vector) trên mọi tài liệu người dùng được phép đọc.
   * Khớp BE: GET /api/files/search?q=...&mode=hybrid
   *
   * Khác hẳn `getDriveItems`: endpoint kia chỉ lọc theo TÊN trong danh sách thư mục, nên
   * không bao giờ tìm được theo nội dung tài liệu. Endpoint này đọc chỉ mục nội dung
   * (MySQL full-text + vector Qdrant) nên tìm được theo thứ nằm bên trong tệp.
   */
  searchFiles: async (
    query: string,
    folderId?: string | null,
    mode: 'hybrid' | 'keyword' | 'semantic' = 'hybrid'
  ): Promise<{ items: DriveItem[]; degraded: boolean; warnings: string[]; modeUsed: string }> => {
    const res: any = await apiClient.get('/files/search', {
      params: {
        q: query.trim(),
        mode,
        folderId: folderId || undefined,
        pageSize: 50,
      },
    });
    // Phản hồi có thể bị bọc nhiều tầng tuỳ interceptor (res, res.data, res.value) và
    // danh sách có thể nằm ở 'items' hoặc chính là mảng gốc. Dò lần lượt thay vì giả định
    // một hình dạng duy nhất.
    const candidates = [res, res?.data, res?.value, res?.data?.value, res?.value?.data];
    let data: any = null;
    let hits: any[] = [];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (Array.isArray(candidate)) {
        hits = candidate;
        data = { items: candidate };
        break;
      }
      if (Array.isArray(candidate.items)) {
        hits = candidate.items;
        data = candidate;
        break;
      }
    }
    if (data === null) {
      console.warn('[search] khong doc duoc danh sach ket qua tu phan hoi:', res);
      data = {};
    }

    const items: DriveItem[] = hits.map((hit) => {
      const mapped = mapFileEntryToDriveItem({
        id: hit.fileId,
        name: hit.name,
        contentType: hit.contentType,
        sizeBytes: hit.sizeBytes,
        scanStatus: hit.scanStatus,
        authorName: hit.author,
        metadata: hit.title || hit.author || hit.keywords ? {
          id: '',
          fileEntryId: hit.fileId,
          title: hit.title || hit.name,
          author: hit.author || '',
          releaseYear: 0,
          issueYear: 0,
          keywords: hit.keywords || null,
          abstract: hit.snippet || null,
        } : null,
      });
      // Đoạn trích là thứ cho người dùng thấy VÌ SAO tệp này khớp — không có nó thì kết
      // quả tìm theo nội dung trông y hệt tìm theo tên.
      return { ...mapped, contentSnippet: hit.snippet || undefined };
    });

    return {
      items,
      degraded: Boolean(data?.degraded),
      warnings: Array.isArray(data?.warnings) ? data.warnings : [],
      modeUsed: data?.modeUsed ?? mode,
    };
  },

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
    formData.append('transparent', 'true');
    selection.forEach((f) => {
      formData.append('files', f);
      formData.append('relativePaths', f.webkitRelativePath || f.name);
    });
    formData.append('compression', 'fastest');
    directories.forEach((directory) => formData.append('directories', directory));
    const root = selection[0]?.webkitRelativePath?.split('/')[0] || directories[0]?.split('/')[0];
    formData.append('name', root ? `${root}.zip` : `package-${Date.now()}.zip`);
    if (folderId) formData.append('folderId', folderId);

    const res: any = await apiClient.post('/files/packages', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600000 });
    return { uploaded: [res?.value ?? res?.data ?? res], failed: [], allSucceeded: true };
  },

  // Upload files using Direct-to-Storage (Google Drive / OneDrive / S3 - New Method)
  uploadDirectFiles: async (files: FileList | File[], folderId?: string | null,
    onProgress?: (fileName: string, progress: DirectUploadProgress) => void): Promise<any> => {
    const selection = Array.from(files);
    const packaged = await packageForStorage(selection);
    const result = await CloudDirectUploader.upload({ file: packaged.file, folderId,
      archiveKind: packaged.archiveKind, logicalName: packaged.logicalName,
      onProgress: progress => onProgress?.(packaged.logicalName, progress) });
    return { uploaded: [{ id: result.fileId, name: packaged.logicalName,
      archiveKind: packaged.archiveKind, sizeBytes: packaged.originalSize }], failed: [], allSucceeded: true };
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

  // The server chooses a streaming ZIP/member link for large files, with unscanned acknowledgement.
  // Bounded packages fall back to authenticated extraction/local package download.
  downloadFile: async (
    fileId: string,
    fileName = 'download',
    archiveKind?: string | null,
    confirmUnscanned?: () => Promise<boolean>
  ): Promise<void> => {
    const confirmUnscannedResolved =
      confirmUnscanned ??
      (async () =>
        typeof window !== 'undefined'
          ? window.confirm(
              'Tệp này quá lớn để quét virus. Hệ thống đã chặn các loại tệp thực thi, nhưng không thể đảm bảo tệp an toàn. Chỉ mở nếu bạn tin người gửi.'
            )
          : false);

    {
      try {
        await downloadViaLink(fileId, { confirmUnscanned: confirmUnscannedResolved });
        return;
      } catch (error: any) {
        if (error?.code !== 'USE_PACKAGE_DOWNLOAD') throw error;
        // fall through to the legacy path below
      }
    }

    const folderPackage = archiveKind === 'folder' || archiveKind === 'batch';
    let destination: any = null;
    if (folderPackage && typeof (window as any).showDirectoryPicker === 'function') {
      try {
        new DecompressionStream('deflate-raw' as CompressionFormat);
        destination = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      } catch (error: any) { if (error.name === 'AbortError') return; }
    }
    const res: any = await apiClient.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([res]);
    if (destination) { await extractStorageZip(blob, destination); return; }
    if (folderPackage) fileName += '.zip';
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getSharedChildren: async (folderId?: string, pageNumber = 1, pageSize = 20): Promise<{
    folders: { id: string; name: string; parentId: string | null }[];
    files: SharedFileListResponse;
    totalFolders: number;
  }> => {
    const res: any = await apiClient.get('/drive/shared/children', {
      params: { folderId, pageNumber, pageSize },
    });
    const data = res?.value ?? res?.data ?? res;
    return {
      folders: data.folders ?? [],
      totalFolders: data.totalFolders ?? 0,
      files: { ...data.files, items: (data.files?.items ?? []).map(mapSharedFileItemDto) },
    };
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

  getSharedByMeFiles: async (params?: {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    fileType?: string;
    recipientEmail?: string;
    sortBy?: string;
    sortDirection?: string;
  }): Promise<SharedByMeFileListResponse> => {
    try {
      const res: any = await apiClient.get('/files/shared-by-me', {
        params: {
          pageNumber: params?.pageNumber ?? 1,
          pageSize: params?.pageSize ?? 20,
          searchTerm: params?.searchTerm?.trim() || undefined,
          fileType: params?.fileType || undefined,
          recipientEmail: params?.recipientEmail?.trim() || undefined,
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
      const items = rawItems.map(mapSharedByMeFileItemDto);

      return {
        items,
        totalCount: data?.totalCount ?? items.length,
        pageNumber: data?.pageNumber ?? 1,
        pageSize: data?.pageSize ?? 20,
        hasMore: Boolean(data?.hasMore),
      };
    } catch (error) {
      console.error('Lỗi khi tải danh sách tệp tin tôi đã chia sẻ:', error);
      throw error;
    }
  },

  getArchiveTree: async (fileId: string): Promise<ArchiveMember[]> => {
    const res: any = await apiClient.get(`/files/${fileId}/archive`);
    return res?.value ?? res?.data ?? res;
  },
  downloadArchiveMember: async (fileId: string, memberId: string, name: string): Promise<void> => {
    await downloadViaLink(fileId, { confirmUnscanned: async () => window.confirm(
      'Tệp này chưa được quét virus. Chỉ tải xuống nếu bạn tin tưởng người gửi. Tiếp tục?') }, memberId);
  },
  getShareCandidates: async (fileId: string, query: string, signal?: AbortSignal): Promise<ShareCandidate[]> => {
    const res: any = await apiClient.get(`/files/${fileId}/share-candidates`, { params: { q: query }, signal });
    return res?.value ?? res?.data ?? res;
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

  // Rename a file (PATCH /api/files/{fileId})
  renameFile: async (fileId: string, name: string): Promise<any> => {
    const res: any = await apiClient.patch(`/files/${fileId}`, { name });
    return res?.value ?? res?.data ?? res;
  },

  // Chia sẻ tệp tin lên Kho chung Phòng ban
  shareToDepartment: async (fileId: string, targetFolderId: string | null): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.FILES.DEPARTMENT_SHARE(fileId), { targetFolderId });
  },

  // Thu hồi chia sẻ tệp tin khỏi Kho chung Phòng ban
  unshareFromDepartment: async (fileId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.FILES.DEPARTMENT_SHARE(fileId));
  },

  // Backward compatibility alias for share
  shareItem: async (itemId: string, emails: string[]): Promise<void> => {
    if (emails.length > 0) {
      await apiClient.post(`/files/${itemId}/share`, { email: emails[0], role: 'Viewer' });
    }
  },
};

export interface ShareCandidate { id: string; email: string; name: string; }

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
