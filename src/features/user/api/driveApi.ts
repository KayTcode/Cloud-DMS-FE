import axiosClient from '@/api/axiosClient';
import { DriveItem } from '../types';

export const driveApi = {
  // Fetch files and folders for current user
  getDriveItems: async (folderId?: string | null): Promise<DriveItem[]> => {
    try {
      const response = await axiosClient.get('/files', {
        params: { folderId: folderId || undefined },
      });
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data?.items && Array.isArray(data.items)) return data.items;
      return [];
    } catch {
      return [];
    }
  },

  // Upload files to current directory
  uploadFiles: async (files: FileList | File[], folderId?: string | null): Promise<DriveItem[]> => {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    if (folderId) formData.append('folderId', folderId);

    const response = await axiosClient.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Create folder
  createFolder: async (name: string, parentId?: string | null): Promise<DriveItem> => {
    const response = await axiosClient.post('/folders', {
      name,
      parentId: parentId || null,
    });
    return response.data;
  },

  // Toggle star
  toggleStar: async (itemId: string, starred: boolean): Promise<void> => {
    await axiosClient.put(`/files/${itemId}/star`, { starred });
  },

  // Move to trash
  moveToTrash: async (itemId: string): Promise<void> => {
    await axiosClient.delete(`/files/${itemId}`);
  },

  // Restore from trash
  restoreFile: async (itemId: string): Promise<void> => {
    await axiosClient.post(`/files/${itemId}/restore`);
  },

  // Move to trash or restore helper
  trashToggle: async (itemId: string, trashed: boolean): Promise<void> => {
    if (trashed) {
      await axiosClient.delete(`/files/${itemId}`);
    } else {
      await axiosClient.post(`/files/${itemId}/restore`);
    }
  },

  // Permanently delete (xóa hẳn khỏi Cloud và DB, giải phóng quota)
  deletePermanently: async (itemId: string): Promise<void> => {
    await axiosClient.delete(`/files/${itemId}/permanent`);
  },

  // Fetch trash files list
  getTrashFiles: async (pageNumber = 1, pageSize = 50, searchTerm?: string): Promise<any> => {
    const res = await axiosClient.get('/files/trash', {
      params: { pageNumber, pageSize, searchTerm }
    });
    return res.data?.value || res.data;
  },

  // Share item
  shareItem: async (itemId: string, emails: string[]): Promise<void> => {
    await axiosClient.post(`/files/${itemId}/share`, { emails });
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
