import { driveApi } from '@/features/user/api/driveApi';
import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import { CloudDirectUploader, DirectUploadProgress } from '@/services/upload/CloudDirectUploader';
import { LARGE_FILE_THRESHOLD_BYTES } from '@/services/upload/large/uploadRouting';

export interface FileItemDto {
  archiveKind?: 'file' | 'folder' | 'batch' | null;
  originalSizeBytes?: number | null;
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
  departmentId?: string | null;
  departmentName?: string | null;
  expiresAt?: string | null;
}

export interface FolderItemDto {
  id: string;
  name: string;
  parentFolderId?: string | null;
  departmentId?: string | null;
  ownerId?: string | null;
  cloudFolderId?: string | null;
  createdAt: string;
}

export interface TenantStorageSummaryDto {
  departmentId?: string;
  departmentName?: string;
  tenantId?: string;
  tenantName?: string;
  quotaBytes?: number;
  usedBytes?: number;
  availableBytes?: number;
  usagePercentage?: number;
  storageProviderId?: string | null;
  storageProviderName?: string | null;
  storageProviderType?: string | null;
  files: FileItemDto[];
  folders?: FolderItemDto[];
  totalCount?: number;
  pageNumber?: number;
  pageSize?: number;
  hasMore?: boolean;
  sharedFolderName?: string;
  personalFolderName?: string;
  currentUserId?: string;
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

export interface ExpiringFileItemDto {
  archiveKind?: 'file' | 'folder' | 'batch' | null;
  originalSizeBytes?: number | null;
  id: string;
  name: string;
  sizeBytes: number;
  formattedSize: string;
  contentType: string;
  createdAt: string;
  expiresAt: string;
  daysRemaining: number;
  ownerId: string;
  ownerName: string;
  departmentId?: string | null;
  departmentName?: string | null;
}

export interface ExpiringFilesSummaryDto {
  totalCount: number;
  totalSizeBytes: number;
  formattedTotalSize: string;
  items: ExpiringFileItemDto[];
  pageNumber: number;
  pageSize: number;
  hasMore: boolean;
}

export async function uploadTenantFilesApi(
  files: FileList | File[],
  _tenantId?: string,
  folderId?: string,
  _storageProviderId?: string,
  _userId?: string
): Promise<MultipleFileUploadResultDto> {
  const selection = Array.from(files);
  const oversized = selection.find((file) => file.size > LARGE_FILE_THRESHOLD_BYTES);
  if (oversized) {
    throw new Error(
      `Tệp "${oversized.name}" vượt ngưỡng ${LARGE_FILE_THRESHOLD_BYTES} byte, vui lòng dùng luồng tải file lớn (uploadSelection) thay vì gọi uploadTenantFilesApi trực tiếp.`
    );
  }
  if (selection.length > 1 || selection.some((file) => !!file.webkitRelativePath))
    return driveApi.uploadFiles(selection, folderId);
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append('files', f));
  if (folderId) formData.append('folderId', folderId);

  const response = await apiClient.post<any, any>(API_ENDPOINTS.FILES.UPLOAD, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600000 });

  const data = response?.value || response?.data || response;
  if (data?.uploaded) return data;
  if (Array.isArray(data)) return { uploaded: data, failed: [], allSucceeded: true, totalFiles: data.length };
  return { uploaded: [], failed: [], allSucceeded: true, totalFiles: 0 };
}

/**
 * Tải lên trực tiếp đám mây (Google Drive / OneDrive / S3) không qua máy chủ Backend (Phương pháp mới)
 */
export async function uploadDirectTenantFilesApi(
  files: FileList | File[],
  tenantId?: string,
  folderId?: string,
  _storageProviderId?: string,
  _userId?: string,
  onProgress?: (fileName: string, progress: DirectUploadProgress) => void
): Promise<MultipleFileUploadResultDto> {
  const selection = Array.from(files);
  const oversized = selection.find((file) => file.size > LARGE_FILE_THRESHOLD_BYTES);
  if (oversized) {
    throw new Error(
      `Tệp "${oversized.name}" vượt ngưỡng ${LARGE_FILE_THRESHOLD_BYTES} byte, vui lòng dùng luồng tải file lớn (uploadSelection) thay vì gọi uploadDirectTenantFilesApi trực tiếp.`
    );
  }
  return driveApi.uploadDirectFiles(files, folderId, onProgress);
}

export interface GetTenantFilesParams {
  tenantId?: string;
  departmentId?: string;
  folderId?: string;
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
}

export async function getTenantFilesApi(
  tenantIdOrParams?: string | GetTenantFilesParams, 
  folderId?: string,
  pageNumber: number = 1,
  pageSize: number = 20,
  searchTerm?: string,
  departmentId?: string
): Promise<TenantStorageSummaryDto> {
  const params: Record<string, any> = {};

  if (typeof tenantIdOrParams === 'object' && tenantIdOrParams !== null) {
    if (tenantIdOrParams.tenantId) params.tenantId = tenantIdOrParams.tenantId;
    if (tenantIdOrParams.departmentId) params.departmentId = tenantIdOrParams.departmentId;
    if (tenantIdOrParams.folderId) params.folderId = tenantIdOrParams.folderId;
    if (tenantIdOrParams.searchTerm) params.searchTerm = tenantIdOrParams.searchTerm;
    params.pageNumber = tenantIdOrParams.pageNumber ?? 1;
    params.pageSize = tenantIdOrParams.pageSize ?? 20;
  } else {
    if (tenantIdOrParams) params.tenantId = tenantIdOrParams;
    if (departmentId) params.departmentId = departmentId;
    if (folderId) params.folderId = folderId;
    if (searchTerm) params.searchTerm = searchTerm;
    params.pageNumber = pageNumber;
    params.pageSize = pageSize;
  }

  const response = await apiClient.get<any, any>(API_ENDPOINTS.FILES.LIST, {
    params,
  });

  if (response?.value) return response.value;
  return response?.data || response;
}

export interface GetDepartmentFilesParams {
  departmentId: string;
  folderId?: string;
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
}

export async function getDepartmentFilesApi(
  departmentIdOrParams: string | GetDepartmentFilesParams,
  folderId?: string,
  pageNumber: number = 1,
  pageSize: number = 20,
  searchTerm?: string
): Promise<TenantStorageSummaryDto> {
  let deptId = '';
  const params: Record<string, any> = {};

  if (typeof departmentIdOrParams === 'object' && departmentIdOrParams !== null) {
    deptId = departmentIdOrParams.departmentId;
    if (departmentIdOrParams.folderId) params.folderId = departmentIdOrParams.folderId;
    if (departmentIdOrParams.searchTerm) params.searchTerm = departmentIdOrParams.searchTerm;
    params.pageNumber = departmentIdOrParams.pageNumber ?? 1;
    params.pageSize = departmentIdOrParams.pageSize ?? 20;
  } else {
    deptId = departmentIdOrParams;
    if (folderId) params.folderId = folderId;
    if (searchTerm) params.searchTerm = searchTerm;
    params.pageNumber = pageNumber;
    params.pageSize = pageSize;
  }

  const response = await apiClient.get<any, any>(API_ENDPOINTS.DEPARTMENT.FILES(deptId), {
    params,
  });

  if (response?.value) return response.value;
  return response?.data || response;
}

export async function downloadTenantFileApi(
  fileId: string,
  fileName: string,
  archiveKind?: string | null,
  confirmUnscanned?: () => Promise<boolean>
): Promise<void> {
  return driveApi.downloadFile(fileId, fileName, archiveKind, confirmUnscanned);
}

export async function deleteTenantFileApi(fileId: string): Promise<boolean> {
  const key = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const response = await apiClient.delete<any, any>(API_ENDPOINTS.FILES.DELETE(fileId), {
    headers: { 'Idempotency-Key': key },
  });
  return response?.value ?? true;
}

/**
 * Xóa vĩnh viễn tệp tin (Hard Delete) để giải phóng ngay lập tức Quota lưu trữ
 * Khớp BE: DELETE /api/files/{id}/permanent
 */
export async function permanentDeleteFileApi(fileId: string): Promise<boolean> {
  const key = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const response = await apiClient.delete<any, any>(API_ENDPOINTS.FILES.PERMANENT_DELETE(fileId), {
    headers: { 'Idempotency-Key': key },
  });
  return response?.value ?? true;
}

/**
 * Lấy danh sách tệp tin sắp hết hạn lưu trữ của toàn Tenant (dành cho TenantAdmin)
 * Khớp BE: GET /api/files/expiring
 */
export async function getExpiringFilesApi(
  days: number = 7,
  pageNumber: number = 1,
  pageSize: number = 20,
  departmentId?: string
): Promise<ExpiringFilesSummaryDto> {
  const params: any = { days, pageNumber, pageSize };
  if (departmentId && departmentId !== 'all') {
    params.departmentId = departmentId;
  }
  const response = await apiClient.get<any, any>(API_ENDPOINTS.FILES.EXPIRING, {
    params,
  });
  return response?.value ?? response?.data ?? response;
}

/**
 * Lấy danh sách tệp tin sắp hết hạn lưu trữ của chính User hiện tại
 * Khớp BE: GET /api/files/my-expiring
 */
export async function getMyExpiringFilesApi(
  days: number = 7,
  pageNumber: number = 1,
  pageSize: number = 20
): Promise<ExpiringFilesSummaryDto> {
  const response = await apiClient.get<any, any>(API_ENDPOINTS.FILES.MY_EXPIRING, {
    params: { days, pageNumber, pageSize },
  });
  return response?.value ?? response?.data ?? response;
}
