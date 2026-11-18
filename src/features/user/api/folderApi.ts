import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import {
  FolderChildrenResponse,
  FolderDto,
  CreateFolderPayload,
  RenameFolderPayload,
  MoveFolderPayload,
} from '../types/folder.types';

export const folderApi = {
  getRoot: (driveKind: string, driveOwnerId: string) =>
    apiClient.get<FolderChildrenResponse>(API_ENDPOINTS.DRIVE.CHILDREN, { params: {
      drive: driveKind.toLowerCase() === 'personal' ? 'personal' : 'shared',
      departmentId: driveKind.toLowerCase() === 'personal' ? undefined : driveOwnerId,
    } })
      .then((r: any) => r?.value ?? r),

  getChildren: (folderId: string, driveKind = 'Personal', driveOwnerId?: string) =>
    apiClient.get<FolderChildrenResponse>(API_ENDPOINTS.DRIVE.CHILDREN, { params: {
      folderId,
      drive: driveKind.toLowerCase() === 'personal' ? 'personal' : 'shared',
      departmentId: driveKind.toLowerCase() === 'personal' ? undefined : driveOwnerId,
    } })
      .then((r: any) => r?.value ?? r),

  getDriveChildren: (drive: 'personal' | 'shared', opts: { departmentId?: string; folderId?: string | null }) => {
    const params: Record<string, string> = { drive };
    if (opts.departmentId) params.departmentId = opts.departmentId;
    if (opts.folderId) params.folderId = opts.folderId;
    return apiClient.get<FolderChildrenResponse>(API_ENDPOINTS.DRIVE.CHILDREN, { params })
      .then((r: any) => r?.value ?? r);
  },

  confirmHandover: (folderId: string): Promise<{ movedFolders: number; movedFiles: number; totalBytes: number }> =>
    apiClient.post(API_ENDPOINTS.FOLDERS.CONFIRM_HANDOVER(folderId))
      .then((r: any) => r?.value ?? r),

  createFolder: (payload: CreateFolderPayload) =>
    apiClient.post<FolderDto>(API_ENDPOINTS.FOLDERS.CREATE, {
      name: payload.name, parentId: payload.parentFolderId,
      drive: payload.driveKind === 'Personal' ? 'personal' : 'shared',
      departmentId: payload.driveKind === 'Personal' ? null : payload.driveOwnerId,
    })
      .then((r: any) => r?.value ?? r),

  renameFolder: (folderId: string, payload: RenameFolderPayload) =>
    apiClient.patch<FolderDto>(API_ENDPOINTS.FOLDERS.RENAME(folderId), payload)
      .then((r: any) => r?.value ?? r),

  moveFolder: (folderId: string, payload: MoveFolderPayload) =>
    apiClient.post<FolderDto>(API_ENDPOINTS.FOLDERS.MOVE(folderId), payload)
      .then((r: any) => r?.value ?? r),

  // DELETE /folders/{id} là xoá mềm (vào thùng rác); xoá vĩnh viễn là {id}/purge.
  trashFolder: (folderId: string) =>
    apiClient.delete(API_ENDPOINTS.FOLDERS.TRASH(folderId)),

  // Thùng rác (liệt kê, khôi phục, xoá vĩnh viễn, dọn sạch) nằm ở `driveTrashApi`:
  // backend phục vụ api/drive/trash và api/folders/{id}/purge, không phải api/folders/trash.
};
