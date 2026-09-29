import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import { TenantInfo, TenantUser, Department, TenantEvent } from '@/features/tenants/types';
import { initialTenant, mockUsers, mockDepartments, initialEvents } from '@/data/tenantMockData';

/**
 * Query: Lấy thông tin chi tiết của Tenant
 * Khớp BE: GetTenantDetailsQuery
 */
export async function getTenantDetails(tenantId: string): Promise<TenantInfo> {
  try {
    const data = await apiClient.get<any, TenantInfo>(API_ENDPOINTS.TENANTS.DETAIL(tenantId));
    return data;
  } catch (error) {
    console.warn('[API Offline] Sử dụng mock data cho getTenantDetails');
    return initialTenant;
  }
}

/**
 * Query: Lấy danh sách Users thuộc Tenant
 * Khớp BE: GetTenantUsersQuery
 */
export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  try {
    const data = await apiClient.get<any, TenantUser[]>(API_ENDPOINTS.TENANTS.USERS(tenantId));
    return data;
  } catch (error) {
    console.warn('[API Offline] Sử dụng mock data cho getTenantUsers');
    return mockUsers;
  }
}

/**
 * Query: Lấy danh sách phòng ban của Tenant
 * Khớp BE: GetTenantDepartmentsQuery
 */
export async function getTenantDepartments(tenantId: string): Promise<Department[]> {
  try {
    const data = await apiClient.get<any, Department[]>(API_ENDPOINTS.TENANTS.DEPARTMENTS(tenantId));
    return data;
  } catch (error) {
    console.warn('[API Offline] Sử dụng mock data cho getTenantDepartments');
    return mockDepartments;
  }
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
    console.warn('[API Offline] Sử dụng mock data cho getTenantEvents');
    return initialEvents;
  }
}
