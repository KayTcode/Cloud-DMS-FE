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
  TenantQuotaAllocationListResponse,
} from '../types';
import {
  INITIAL_SYSTEM_TENANTS,
  SYSTEM_ACTIVITIES,
  STORAGE_PROVIDERS,
  AUDIT_LOGS
} from '@/data/sysAdminMockData';

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
 * Get all tenants for SysAdmin management
 */
export const getSystemTenantsApi = async (): Promise<SystemTenant[]> => {
  try {
    const response: any = await axiosClient.get('/admin/tenants');
    if (response?.value?.items || response?.value) return response.value.items || response.value;
    if (response?.data?.items || response?.data) return response.data.items || response.data;
    if (response?.items || Array.isArray(response)) return response.items || response;
  } catch {
    // Fallback if tenant-specific endpoint not yet created
  }
  return INITIAL_SYSTEM_TENANTS;
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
    totalTenants: 24,
    activeUsers: 1847,
    onlineUsers: 312,
    storageUsedTB: 4.2,
    storageLimitTB: 10.0,
    activeProviders: 3,
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
  return SYSTEM_ACTIVITIES;
};

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 GB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get storage providers from database and format capacities
 */
export const getStorageProvidersApi = async (): Promise<StorageProviderItem[]> => {
  try {
    const response: any = await axiosClient.get('/admin/storage-providers');
    const items = response?.value || response?.data || response;
    if (Array.isArray(items) && items.length > 0) {
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
        rootFolderId: p.rootFolderId,
        tenantsCount: p.tenantsCount || 0,
        createdAt: p.createdAt,
        lastSyncAt: p.lastSyncAt,
      }));
    }
  } catch {
    // Fallback to mock
  }
  return STORAGE_PROVIDERS;
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
 * Get system audit logs
 */
export const getAuditLogsApi = async (pageNumber: number = 1, pageSize: number = 50, searchTerm?: string): Promise<AuditLogEntry[]> => {
  try {
    const response: any = await axiosClient.get('/admin/audit-logs', {
      params: { pageNumber, pageSize, searchTerm: searchTerm || undefined }
    });
    if (response?.items && Array.isArray(response.items)) return response.items;
    if (response?.value?.items && Array.isArray(response.value.items)) return response.value.items;
    if (response?.data?.items && Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response)) return response;
  } catch (error) {
    console.warn('Backend API /admin/audit-logs error, falling back to cached logs.', error);
  }
  return AUDIT_LOGS;
};

/**
 * Lấy danh sách phân bổ quota theo nhà cung cấp lưu trữ của một tenant
 * Backend Endpoint: GET /api/admin/tenants/{tenantId}/quota-allocations
 */
export const getTenantQuotaAllocationsApi = (tenantId: string): Promise<TenantQuotaAllocationListResponse> =>
  axiosClient.get<TenantQuotaAllocationListResponse>(API_ENDPOINTS.ADMIN_QUOTA_ALLOC.LIST(tenantId))
    .then((r) => r.data);
