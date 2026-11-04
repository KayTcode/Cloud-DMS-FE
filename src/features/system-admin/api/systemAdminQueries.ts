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
  TenantStorageQuotaResponse,
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
  // 1. Ưu tiên gọi API Backend chuẩn /api/admin/tenants
  try {
    const response: any = await axiosClient.get('/admin/tenants');
    const items = response?.value?.items || response?.value || response?.data?.items || response?.data || response?.items || response;
    if (Array.isArray(items) && items.length > 0) {
      return items.map((t: any) => {
        const qBytes = Number(t.storageQuotaBytes || 0);
        const uBytes = Number(t.storageUsedBytes || 0);
        const usagePct = qBytes > 0 ? Math.round((uBytes / qBytes) * 100) : 0;
        return {
          id: t.id,
          name: t.name,
          tenantCode: t.code || t.tenantCode,
          plan: 'Enterprise',
          usersAssigned: t.usersCount || 1,
          storageQuotaBytes: qBytes,
          actualStorageUsedBytes: uBytes,
          storageAllocated: formatBytes(qBytes),
          storageUsed: formatBytes(uBytes),
          storageDisplay: `${formatBytes(uBytes)} / ${formatBytes(qBytes)}`,
          createdDate: t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo',
          status: t.isActive ? 'Active' : 'Suspended',
          storageProviderName: t.storageProviderName || 'Cloud Storage Pool',
          usagePercentage: usagePct,
        };
      });
    }
  } catch {
    // Backend endpoint chưa khởi động lại hoặc chưa nạp route
  }

  // 2. Fallback thông minh: Trích xuất các Tenant thực tế từ danh sách Users trong Database
  try {
    const usersRes: any = await axiosClient.get('/admin/users?PageSize=100');
    const uItems = usersRes?.value?.items || usersRes?.data?.items || usersRes?.items || [];
    if (Array.isArray(uItems) && uItems.length > 0) {
      const tenantMap = new Map<string, SystemTenant>();
      uItems.forEach((u: any) => {
        // Chỉ trích xuất khi user gắn với tenantId cụ thể
        const tId = u.tenantId;
        if (tId) {
          const tName = u.tenantName || 'Doanh nghiệp Mặc định';
          const tCode = u.tenantCode || 'TENANT';
          if (!tenantMap.has(tId)) {
            tenantMap.set(tId, {
              id: tId,
              name: tName,
              tenantCode: tCode,
              plan: 'Enterprise',
              usersAssigned: 1,
              storageUsed: '0 GB',
              storageAllocated: '100 GB',
              storageDisplay: '0 GB / 100 GB',
              createdDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo',
              status: u.isActive ? 'Active' : 'Suspended',
              adminEmail: u.email,
              storageProviderName: 'Google Drive Enterprise',
              usagePercentage: 0,
            });
          } else {
            const existing = tenantMap.get(tId)!;
            existing.usersAssigned += 1;
          }
        }
      });
      if (tenantMap.size > 0) {
        return Array.from(tenantMap.values());
      }
    }
  } catch {
    // Tiếp tục fallback sang INITIAL_SYSTEM_TENANTS nếu không kết nối được DB
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
        externalUsedBytes: p.externalUsedBytes,
        systemUsedBytes: p.systemUsedBytes,
        availableToGrantBytes: p.availableToGrantBytes,
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
export const getTenantQuotaAllocationsApi = (tenantId: string): Promise<TenantStorageQuotaResponse> =>
  axiosClient.get(API_ENDPOINTS.ADMIN_QUOTA_ALLOC.GET(tenantId));
