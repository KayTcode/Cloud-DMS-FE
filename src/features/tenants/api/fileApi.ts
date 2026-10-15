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
  totalCount?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface FileUploadFailureDto {
  fileName: string;
  fileSize: number;
  error: string;
}

export interface MultipleFileUploadResultDto {
  uploaded: FileItemDto[];
  failed: FileUploadFailureDto[];
  allSucceeded: boolean;
  totalFiles: number;
}

export async function uploadTenantFilesApi(
  files: FileList | File[],
  _tenantId?: string,
  folderId?: string,
  _storageProviderId?: string,
  _userId?: string
): Promise<MultipleFileUploadResultDto> {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append('files', f));
  if (folderId) formData.append('folderId', folderId);

  const response = await apiClient.post<any, any>(API_ENDPOINTS.FILES.UPLOAD, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const data = response?.value || response?.data || response;
  if (data?.uploaded) return data;
  if (Array.isArray(data)) return { uploaded: data, failed: [], allSucceeded: true, totalFiles: data.length };
  return { uploaded: [], failed: [], allSucceeded: true, totalFiles: 0 };
}

export async function getTenantFilesApi(
  tenantId?: string, 
  folderId?: string,
  pageNumber: number = 1,
  pageSize: number = 20,
  searchTerm?: string,
  departmentId?: string
): Promise<TenantStorageSummaryDto> {
  const params: Record<string, any> = {
    pageNumber,
    pageSize,
  };
  if (tenantId) params.tenantId = tenantId;
  if (departmentId) params.departmentId = departmentId;
  if (folderId) params.folderId = folderId;
  if (searchTerm) params.searchTerm = searchTerm;

  const response = await apiClient.get<any, any>(API_ENDPOINTS.FILES.LIST, {
    params,
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
