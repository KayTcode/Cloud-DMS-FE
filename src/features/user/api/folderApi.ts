import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import {
  FolderChildrenResponse,
  FolderDto,
  TrashFolderItem,
  CreateFolderPayload,
  RenameFolderPayload,
  MoveFolderPayload,
} from '../types/folder.types';

export const folderApi = {
  getRoot: (driveKind: string, driveOwnerId: string) =>
    apiClient.get<FolderChildrenResponse>(API_ENDPOINTS.FOLDERS.ROOT(driveKind, driveOwnerId))
      .then((r) => r.data),

  getChildren: (folderId: string) =>
    apiClient.get<FolderChildrenResponse>(API_ENDPOINTS.FOLDERS.CHILDREN(folderId))
      .then((r) => r.data),

  createFolder: (payload: CreateFolderPayload) =>
    apiClient.post<FolderDto>(API_ENDPOINTS.FOLDERS.CREATE, payload)
      .then((r) => r.data),

  renameFolder: (folderId: string, payload: RenameFolderPayload) =>
    apiClient.put<FolderDto>(API_ENDPOINTS.FOLDERS.RENAME(folderId), payload)
      .then((r) => r.data),

  moveFolder: (folderId: string, payload: MoveFolderPayload) =>
    apiClient.put<FolderDto>(API_ENDPOINTS.FOLDERS.MOVE(folderId), payload)
      .then((r) => r.data),

  trashFolder: (folderId: string) =>
    apiClient.put(API_ENDPOINTS.FOLDERS.TRASH(folderId))
      .then((r) => r.data),

  restoreFolder: (folderId: string) =>
    apiClient.put(API_ENDPOINTS.FOLDERS.RESTORE(folderId))
      .then((r) => r.data),

  purgeFolder: (folderId: string) =>
    apiClient.delete(API_ENDPOINTS.FOLDERS.PURGE(folderId))
      .then((r) => r.data),

  getTrash: (driveKind: string, driveOwnerId: string) =>
    apiClient.get<TrashFolderItem[]>(API_ENDPOINTS.FOLDERS.TRASH_LIST(driveKind, driveOwnerId))
      .then((r) => r.data),

  emptyTrash: (driveKind: string, driveOwnerId: string) =>
    apiClient.delete(API_ENDPOINTS.FOLDERS.EMPTY_TRASH(driveKind, driveOwnerId))
      .then((r) => r.data),
};
