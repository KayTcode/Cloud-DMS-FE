import axiosClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import {
  SystemTenant,
  SystemActivityItem,
  StorageProviderItem,
  AuditLogEntry,
  SystemMetricsSummary,
  AdminUserDto,
  PaginatedResult,
  GetUsersQueryFilter,
  GetTenantsQueryFilter,
  TenantQuotaAllocationListResponse,
  TenantStorageQuotaResponse,
} from '../types';

/**
 * Định dạng dung lượng byte sang chuỗi hiển thị dễ đọc (KB, MB, GB, TB)
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 GB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get paginated and filterable list of all system users directly from database
 * Backend Endpoint: GET /api/admin/users
 */
export const getAdminUsersApi = async (
  query?: GetUsersQueryFilter
): Promise<PaginatedResult<AdminUserDto>> => {
  const params = new URLSearchParams();
  // Tìm kiếm
  if (query?.searchTerm) params.append('SearchTerm', query.searchTerm);
  // Lọc theo vai trò
  if (query?.roleId) params.append('RoleId', query.roleId);
  // Lọc theo tenant
  if (query?.tenantId) params.append('TenantId', query.tenantId);
  // Lọc theo phòng ban
  if (query?.departmentId) params.append('DepartmentId', query.departmentId);
  // Lọc theo trạng thái
  if (query?.isActive !== undefined) params.append('IsActive', String(query.isActive));
  // Phân trang
  if (query?.pageNumber) params.append('PageNumber', String(query.pageNumber));
  if (query?.pageSize) params.append('PageSize', String(query.pageSize));

  const response: any = await axiosClient.get(`/admin/users?${params.toString()}`);

  // Format ngày tháng để hiển thị đẹp hơn
  const formatUserDates = (items: AdminUserDto[]) => {
    return items.map((u) => {
      let createdFormatted = u.createdAt;
      try {
        const dateObj = new Date(u.createdAt);
        if (!isNaN(dateObj.getTime())) {
          createdFormatted = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          });
        }
      } catch {
        // Keep original
      }
      return {
        ...u,
        createdAt: createdFormatted,
      };
    });
  };
  // Lấy danh sách user
  if (response?.value?.items) {
    return {
      ...response.value,
      items: formatUserDates(response.value.items),
    };
  }

  if (response?.data?.items) {
    return {
      ...response.data,
      items: formatUserDates(response.data.items),
    };
  }

  if (response?.items) {
    return {
      ...response,
      items: formatUserDates(response.items),
    };
  }

  return {
    items: [],
    pageNumber: 1,
    totalPages: 1,
    totalCount: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
};

/**
 * Get user detail by ID from database
 * Backend Endpoint: GET /api/admin/users/{id}
 */
export const getAdminUserByIdApi = async (id: string): Promise<AdminUserDto | null> => {
  const response: any = await axiosClient.get(`/admin/users/${id}`);
  if (response?.value) return response.value;
  if (response?.data) return response.data;
  return response || null;
};

/**
 * Get all tenants for SysAdmin management with pagination, search and status filter.
 * Backend Endpoint: GET /api/admin/tenants
 */
export const getSystemTenantsApi = async (
  query?: GetTenantsQueryFilter
): Promise<PaginatedResult<SystemTenant>> => {
  try {
    const params = new URLSearchParams();
    if (query?.pageNumber) params.append('PageNumber', String(query.pageNumber));
    if (query?.pageSize) params.append('PageSize', String(query.pageSize));
    if (query?.searchTerm) params.append('SearchTerm', query.searchTerm.trim());
    if (query?.statusFilter && query.statusFilter !== 'All') params.append('StatusFilter', query.statusFilter.trim());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response: any = await axiosClient.get(`/admin/tenants${queryString}`);

    const rawData = response?.value ?? response?.data ?? response;
    const items = rawData?.items ?? (Array.isArray(rawData) ? rawData : []);

    const mappedItems: SystemTenant[] = items.map((t: any) => {
      const qBytes = Number(t.storageQuotaBytes || 0);
      const uBytes = Number(t.storageUsedBytes || 0);
      const usagePct = qBytes > 0 ? Math.round((uBytes / qBytes) * 100) : 0;
      return {
        id: t.id,
        name: t.name,
        tenantCode: t.code || t.tenantCode,
        plan: 'Enterprise',
        usersAssigned: t.usersCount || 0,
        storageQuotaBytes: qBytes,
        actualStorageUsedBytes: uBytes,
        storageAllocated: formatBytes(qBytes),
        storageUsed: formatBytes(uBytes),
        storageDisplay: `${formatBytes(uBytes)} / ${formatBytes(qBytes)}`,
        createdDate: t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo',
        status: t.isActive ? 'Active' : 'Suspended',
        adminEmail: t.adminEmail,
        adminId: t.adminId,
        adminFullName: t.adminFullName,
        adminPhoneNumber: t.adminPhoneNumber,
        storageProviderName: t.storageProviderName || 'Cloud Storage Pool',
        usagePercentage: usagePct,
        isInterimManaged: !!t.isInterimManaged,
        vacantAdminUserId: t.vacantAdminUserId || null,
        interimManagedByUserId: t.interimManagedByUserId || null,
        interimStartedAt: t.interimStartedAt || null,
        departmentsCount: t.departmentsCount || 0,
        hasPendingInvitation: !!t.hasPendingInvitation,
      };
    });

    return {
      items: mappedItems,
      pageNumber: rawData?.pageNumber || query?.pageNumber || 1,
      totalPages: rawData?.totalPages || 1,
      totalCount: rawData?.totalCount !== undefined ? rawData.totalCount : mappedItems.length,
      hasPreviousPage: !!rawData?.hasPreviousPage,
      hasNextPage: !!rawData?.hasNextPage,
    };
  } catch (error) {
    console.error('Lỗi tải danh sách Tenants:', error);
    return {
      items: [],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }
};

/**
 * Lấy danh sách tenants dạng phẳng (array) cho các widget Dashboard
 */
export const getSystemTenantsListApi = async (
  query?: GetTenantsQueryFilter
): Promise<SystemTenant[]> => {
  const result = await getSystemTenantsApi(query);
  return result.items;
};

/**
 * Get system metrics summary
 */
export const getSystemMetricsApi = async (): Promise<SystemMetricsSummary> => {
  try {
    const response: any = await axiosClient.get('/admin/metrics');
    if (response?.value) return response.value;
    if (response?.data) return response.data;
  } catch {
    // Fallback
  }
  return {
    totalTenants: 0,
    activeUsers: 0,
    onlineUsers: 0,
    storageUsedTB: 0,
    storageLimitTB: 0,
    activeProviders: 0,
  };
};

/**
 * Get system activities
 */
export const getSystemActivitiesApi = async (): Promise<SystemActivityItem[]> => {
  try {
    const response: any = await axiosClient.get('/admin/activities');
    if (response?.value) return response.value;
    if (response?.data) return response.data;
  } catch {
    // Fallback
  }
  return [];
};

/**
 * Get storage providers from database and format capacities
 */
export const getStorageProvidersApi = async (): Promise<StorageProviderItem[]> => {
  try {
    const response: any = await axiosClient.get('/admin/storage-providers');
    const items = response?.value || response?.data || response;
    if (Array.isArray(items)) {
      return items.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.typeName || (p.type === 1 ? 'Google Drive' : p.type === 2 ? 'OneDrive' : 'Local Storage'),
        status: (p.status || 'Connected') as 'Connected' | 'Degraded' | 'Offline',
        storageUsed: formatBytes(p.usedCapacityBytes || 0),
        capacity: formatBytes(p.totalCapacityBytes || 0),
        latency: '28ms',
        region: 'Cloud Storage Pool',
        totalCapacityBytes: p.totalCapacityBytes,
        usedCapacityBytes: p.usedCapacityBytes,
        availableCapacityBytes: p.availableCapacityBytes,
        allocatedToTenantsBytes: p.allocatedToTenantsBytes,
        unallocatedCapacityBytes: p.unallocatedCapacityBytes,
        externalUsedBytes: p.externalUsedBytes,
        systemUsedBytes: p.systemUsedBytes,
        migrationReservedBytes: p.migrationReservedBytes,
        isActive: p.isActive,
        migrationReadOnly: p.migrationReadOnly,
        migrationRetainedBytes: p.migrationRetainedBytes,
        availableToGrantBytes: p.availableToGrantBytes,
        rootFolderId: p.rootFolderId,
        accountEmail: p.accountEmail ?? null,
        tenantsCount: p.tenantsCount || 0,
        createdAt: p.createdAt,
        lastSyncAt: p.lastSyncAt,
      }));
    }
  } catch {
    // Fallback
  }
  return [];
};

/**
 * Get available quota of a storage provider
 */
export const getStorageProviderAvailableQuotaApi = async (
  providerId: string
): Promise<any> => {
  const response: any = await axiosClient.get(`/admin/storage-providers/${providerId}/available-quota`);
  return response?.value || response?.data || response;
};

/**
 * Get allocated storage quota and usage of a specific tenant
 */
export const getTenantStorageQuotaApi = async (
  tenantId: string
): Promise<any> => {
  const response: any = await axiosClient.get(`/admin/tenants/${tenantId}/quota`);
  return response?.value || response?.data || response;
};

/**
 * Get system audit logs directly from backend
 * Backend Endpoint: GET /api/admin/audit-logs
 */
export const getAuditLogsApi = async (
  pageNumber: number = 1,
  pageSize: number = 50,
  searchTerm?: string
): Promise<AuditLogEntry[]> => {
  const response: any = await axiosClient.get('/admin/audit-logs', {
    params: { pageNumber, pageSize, searchTerm: searchTerm || undefined }
  });

  let items: any[] = [];
  if (response?.items && Array.isArray(response.items)) {
    items = response.items;
  } else if (response?.value?.items && Array.isArray(response.value.items)) {
    items = response.value.items;
  } else if (response?.data?.items && Array.isArray(response.data.items)) {
    items = response.data.items;
  } else if (Array.isArray(response)) {
    items = response;
  } else if (response?.value && Array.isArray(response.value)) {
    items = response.value;
  } else if (response?.isFailure) {
    throw new Error(response.error || 'Không thể tải nhật ký kiểm toán hệ thống.');
  }

  return items.map((item: any) => ({
    id: String(item.id || ''),
    timestamp: item.timestamp || item.createdAt || '',
    action: item.action || '',
    actor: item.actor || item.actorEmail || 'Hệ thống',
    ipAddress: item.ipAddress || 'Unknown',
    status: (item.status === 'FAILED' ? 'FAILED' : item.status === 'WARNING' ? 'WARNING' : 'SUCCESS') as 'SUCCESS' | 'WARNING' | 'FAILED',
    details: item.details || '',
  }));
};

/**
 * Lấy danh sách phân bổ quota theo nhà cung cấp lưu trữ của một tenant
 * Backend Endpoint: GET /api/admin/tenants/{tenantId}/quota-allocations
 */
export const getTenantQuotaAllocationsApi = (tenantId: string): Promise<TenantStorageQuotaResponse> =>
  axiosClient.get(API_ENDPOINTS.ADMIN_QUOTA_ALLOC.GET(tenantId));

/**
 * Tệp đã yêu cầu xoá vĩnh viễn nhưng kho lưu trữ đám mây chưa xoá xong — vẫn chiếm dung lượng
 * thật. `failureCode` cho biết phải sửa gì: STORAGE_CREDENTIAL_INVALID là credential provider
 * sai, STORAGE_DELETE_FORBIDDEN là thiếu quyền xoá.
 * Backend Endpoint: GET /api/admin/storage-providers/pending-deletes
 */
export interface PendingCloudDelete {
  fileId: string;
  tenantId: string;
  fileName: string;
  sizeBytes: number;
  deletedAt?: string | null;
  providerName?: string | null;
  providerAccountEmail?: string | null;
  failureCode?: string | null;
  attemptCount: number;
  lastAttemptAt?: string | null;
}

export const getPendingCloudDeletesApi = async (): Promise<PendingCloudDelete[]> => {
  const response: any = await axiosClient.get('/admin/storage-providers/pending-deletes');
  const items = response?.value ?? response?.data ?? response;
  return Array.isArray(items) ? items : [];
};
