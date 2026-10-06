import axiosClient from '@/api/axiosClient';
import { DriveItem } from '../types';

export const driveApi = {
  // Fetch files and folders for current user (optionally by folderId)
  getDriveItems: async (folderId?: string | null): Promise<DriveItem[]> => {
    try {
      const response = await axiosClient.get('/api/drive/items', {
        params: { folderId: folderId || undefined },
      });
      return response.data;
    } catch {
      return [];
    }
  },

  // Upload files to current directory
  uploadFiles: async (files: FileList | File[], folderId?: string | null): Promise<DriveItem[]> => {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    if (folderId) formData.append('folderId', folderId);

    const response = await axiosClient.post('/api/drive/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Create folder
  createFolder: async (name: string, parentId?: string | null): Promise<DriveItem> => {
    const response = await axiosClient.post('/api/drive/folders', {
      name,
      parentId: parentId || null,
    });
    return response.data;
  },

  // Toggle star
  toggleStar: async (itemId: string, starred: boolean): Promise<void> => {
    await axiosClient.put(`/api/drive/items/${itemId}/star`, { starred });
  },

  // Move to trash or restore
  trashToggle: async (itemId: string, trashed: boolean): Promise<void> => {
    await axiosClient.put(`/api/drive/items/${itemId}/trash`, { trashed });
  },

  // Permanently delete
  deletePermanently: async (itemId: string): Promise<void> => {
    await axiosClient.delete(`/api/drive/items/${itemId}`);
  },

  // Share item
  shareItem: async (itemId: string, emails: string[]): Promise<void> => {
    await axiosClient.post(`/api/drive/items/${itemId}/share`, { emails });
  },
};

export const userApi = {
  getProfile: async () => {
    const response = await axiosClient.get('/api/users/profile');
    return response.data;
  },

  updateProfile: async (payload: any) => {
    const response = await axiosClient.put('/api/users/profile', payload);
    return response.data;
  },

  requestQuotaIncrease: async (payload: { requestedGB: number; reason: string }) => {
    const response = await axiosClient.post('/api/users/request-quota', payload);
    return response.data;
  },
};
