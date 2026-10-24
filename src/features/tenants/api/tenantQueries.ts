import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import { TenantInfo, TenantUser, Department, TenantEvent } from '@/features/tenants/types';
import { initialTenant, initialEvents } from '@/data/tenantMockData';

export interface TenantQuotaData {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  storageProviderId?: string;
  storageProviderName?: string;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  allocatedToDepartmentsBytes?: number;
  availableBytes: number;
  usagePercentage: number;
}

/**
 * Query: Lấy hạn mức Quota Cloud và dung lượng đã dùng của Tenant trực tiếp từ Database
 * Khớp BE: GetTenantStorageQuotaQuery -> GET /api/admin/tenants/{tenantId}/quota
 */
export async function getTenantStorageQuota(tenantId: string): Promise<TenantQuotaData | null> {
  try {
    const res: any = await apiClient.get(`/admin/tenants/${tenantId}/quota`);
    const data = res?.value || res?.data || res;
    if (data && (typeof data.storageQuotaBytes === 'number' || data.tenantId)) {
      const qBytes = Number(data.storageQuotaBytes || 0);
      const uBytes = Number(data.storageUsedBytes || 0);
      const allocDeptsBytes = Number(data.allocatedToDepartmentsBytes || 0);
      const effectiveAllocated = Math.max(allocDeptsBytes, uBytes);
      const availBytes = Number(data.availableBytes ?? Math.max(0, qBytes - effectiveAllocated));
      const usagePct = Number(data.usagePercentage ?? (qBytes > 0 ? Math.round((effectiveAllocated / qBytes) * 100) : 0));

      return {
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        tenantCode: data.tenantCode,
        storageProviderId: data.storageProviderId,
        storageProviderName: data.storageProviderName,
        storageQuotaBytes: qBytes,
        storageUsedBytes: uBytes,
        allocatedToDepartmentsBytes: allocDeptsBytes,
        availableBytes: availBytes,
        usagePercentage: usagePct,
      };
    }
    return null;
  } catch (error) {
    console.warn('[Tenant] Lỗi khi lấy Quota của Tenant:', error);
    return null;
  }
}

/**
 * Query: Lấy thông tin chi tiết của Tenant
 */
export async function getTenantDetails(tenantId: string): Promise<TenantInfo> {
  try {
    const data = await apiClient.get<any, TenantInfo>(API_ENDPOINTS.TENANTS.DETAIL(tenantId));
    return data;
  } catch (error) {
    return { ...initialTenant, id: tenantId };
  }
}

/**
 * Query: Lấy danh sách Users thuộc Tenant trực tiếp từ Database
 * Khớp BE: GetUsersWithPaginationQuery -> GET /api/admin/users?tenantId={tenantId}
 */
export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  try {
    const res: any = await apiClient.get('/admin/users', {
      params: {
        TenantId: tenantId,
        PageSize: 100,
      },
    });
    const raw = res?.value || res?.data || res;
    const items = raw?.items || (Array.isArray(raw) ? raw : []);
    if (Array.isArray(items)) {
      return items.map((u: any) => ({
        id: u.id,
        name: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        department: u.departmentName || 'Chưa gán phòng ban',
        role: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles.join(', ') : 'User',
        status: u.isActive ? 'Active' : 'Suspended',
        lastActive: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo',
      }));
    }
    return [];
  } catch (error) {
    console.warn('[Tenant] Lỗi khi lấy danh sách users:', error);
    return [];
  }
}

/**
 * Query: Lấy danh sách phòng ban của Tenant trực tiếp từ Database
 * Khớp BE: GetDepartmentsQuery -> GET /api/tenant/{tenantId}/departments
 */
export async function getTenantDepartments(tenantId: string): Promise<Department[]> {
  try {
    const res: any = await apiClient.get(API_ENDPOINTS.TENANTS.DEPARTMENTS(tenantId));
    const raw = res?.value || res?.data || res;
    const items = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
    if (items && items.length > 0) {
      return items.map((d: any) => {
        const quotaBytes = Number(d.storageQuotaBytes ?? d.StorageQuotaBytes ?? 0);
        let quotaGB = 0;
        if (typeof d.allocatedStorageGB === 'number') {
          quotaGB = d.allocatedStorageGB;
        } else if (typeof d.AllocatedStorageGB === 'number') {
          quotaGB = d.AllocatedStorageGB;
        } else if (quotaBytes > 0) {
          quotaGB = Number((quotaBytes / (1024 ** 3)).toFixed(2));
        }

        const usedBytes = Number(d.storageUsedBytes ?? d.StorageUsedBytes ?? 0);

        return {
          id: d.id,
          name: d.name,
          headCount: typeof d.headCount === 'number' ? d.headCount : (d.users?.length || 0),
          lead: d.lead || 'Chưa chỉ định',
          allocatedStorageGB: quotaGB,
          storageQuotaBytes: quotaBytes,
          storageUsedBytes: usedBytes,
          adminId: d.adminId || d.AdminId,
          adminEmail: d.adminEmail,
          adminIsActive: d.adminIsActive ?? d.AdminIsActive ?? true,
        };
      });
    }
    return [];
  } catch (error) {
    console.warn('[Tenant] Không gọi được API getTenantDepartments:', error);
    return [];
  }
}

export interface TenantAuditLogDto {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorEmail?: string;
  departmentId?: string;
  departmentName?: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | string;
  details: string;
  tenantId?: string;
  tenantName?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Query: Lấy nhật ký audit logs của toàn bộ Tenant (hỗ trợ lọc theo phòng ban, nhân sự, hành động)
 * Khớp BE: GET /api/tenants/{tenantId}/activity
 */
export async function getTenantAuditLogs(
  tenantId: string,
  pageNumber: number = 1,
  pageSize: number = 20,
  searchTerm?: string,
  action?: string,
  departmentId?: string
): Promise<PaginatedResult<TenantAuditLogDto>> {
  const params: Record<string, any> = { pageNumber, pageSize };
  if (searchTerm && searchTerm.trim()) params.searchTerm = searchTerm.trim();
  if (action && action.trim() && action !== 'all') params.action = action.trim();
  if (departmentId && departmentId.trim() && departmentId !== 'all') params.departmentId = departmentId.trim();

  const res: any = await apiClient.get(API_ENDPOINTS.TENANTS.ACTIVITY(tenantId), { params });
  return res?.value ?? res?.data ?? res;
}

/**
 * Query: Lấy nhật ký audit logs/events của Tenant
 * Khớp BE: GetTenantEventsQuery
 */
export async function getTenantEvents(tenantId: string): Promise<TenantEvent[]> {
  try {
    const data = await apiClient.get<any, TenantEvent[]>(API_ENDPOINTS.TENANTS.ACTIVITY(tenantId));
    return data;
  } catch (error) {
    return initialEvents;
  }
}

