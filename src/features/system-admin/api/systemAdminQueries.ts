import axiosClient from '@/api/axiosClient';
import { 
  SystemTenant, 
  SystemActivityItem, 
  StorageProviderItem, 
  AuditLogEntry, 
  SystemMetricsSummary,
  AdminUserDto,
  PaginatedResult,
  GetUsersQueryFilter
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
  if (query?.searchTerm) params.append('SearchTerm', query.searchTerm);
  if (query?.roleId) params.append('RoleId', query.roleId);
  if (query?.tenantId) params.append('TenantId', query.tenantId);
  if (query?.departmentId) params.append('DepartmentId', query.departmentId);
  if (query?.isActive !== undefined) params.append('IsActive', String(query.isActive));
  if (query?.pageNumber) params.append('PageNumber', String(query.pageNumber));
  if (query?.pageSize) params.append('PageSize', String(query.pageSize));

  const response: any = await axiosClient.get(`/admin/users?${params.toString()}`);
  
  // Format DateTime strings for clean display
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

/**
 * Get storage providers
 */
export const getStorageProvidersApi = async (): Promise<StorageProviderItem[]> => {
  try {
    const response: any = await axiosClient.get('/admin/storage-providers');
    if (response?.value) return response.value;
    if (response?.data) return response.data;
  } catch {
    // Fallback
  }
  return STORAGE_PROVIDERS;
};

/**
 * Get system audit logs
 */
export const getAuditLogsApi = async (): Promise<AuditLogEntry[]> => {
  try {
    const response: any = await axiosClient.get('/admin/audit-logs');
    if (response?.value?.items) return response.value.items;
    if (response?.data?.items) return response.data.items;
    if (Array.isArray(response)) return response;
  } catch {
    // Fallback
  }
  return AUDIT_LOGS;
};
