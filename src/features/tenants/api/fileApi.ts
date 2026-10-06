import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';

export interface FileItemDto {
  id: string;
  tenantId: string;
  ownerId: string;
  ownerName: string;
  folderId?: string | null;
  name: string;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  hash?: string | null;
  scanStatus: string;
  storageProviderId?: string | null;
  storageProviderName?: string | null;
  storageProviderType?: string | null;
  createdAt: string;
}

export interface TenantStorageSummaryDto {
  tenantId: string;
  tenantName: string;
  quotaBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercentage: number;
  storageProviderId?: string | null;
  storageProviderName?: string | null;
  storageProviderType?: string | null;
  files: FileItemDto[];
}

export async function uploadTenantFilesApi(
  files: FileList | File[],
  tenantId?: string,
  folderId?: string,
  storageProviderId?: string,
  userId?: string
): Promise<FileItemDto[]> {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append('files', f));
  if (tenantId) formData.append('tenantId', tenantId);
  if (folderId) formData.append('folderId', folderId);
  if (storageProviderId) formData.append('storageProviderId', storageProviderId);

  // Auto fallback to current authenticated user ID if not provided explicitly
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    try {
      const authUserStr = localStorage.getItem('auth_user');
      if (authUserStr) {
        const authUser = JSON.parse(authUserStr);
        effectiveUserId = authUser?.id;
      }
    } catch {
      // Ignore
    }
  }
  if (effectiveUserId) formData.append('userId', effectiveUserId);

  const response = await apiClient.post<any, any>(API_ENDPOINTS.FILES.UPLOAD, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  // Handle both standard Result wrapper and raw array
  if (response?.value) return response.value;
  if (Array.isArray(response)) return response;
  return response?.data || [];
}

export async function getTenantFilesApi(tenantId?: string, folderId?: string): Promise<TenantStorageSummaryDto> {
  const response = await apiClient.get<any, any>(API_ENDPOINTS.FILES.LIST, {
    params: { tenantId, folderId },
  });

  if (response?.value) return response.value;
  return response?.data || response;
}

export async function downloadTenantFileApi(fileId: string, fileName: string): Promise<void> {
  const response = await apiClient.get(API_ENDPOINTS.FILES.DOWNLOAD(fileId), {
    responseType: 'blob',
  });

  const blob = new Blob([response as any]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteTenantFileApi(fileId: string): Promise<boolean> {
  const response = await apiClient.delete<any, any>(API_ENDPOINTS.FILES.DELETE(fileId));
  return response?.value ?? true;
}
