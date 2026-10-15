/**
 * Centralized API endpoints matching .NET Web API routes
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  TENANTS: {
    BASE: '/tenants',
    DETAIL: (id: string) => `/tenants/${id}`,
    STATUS: (id: string) => `/tenants/${id}/status`,
    BACKUP: (id: string) => `/tenants/${id}/backup`,
    SUBSCRIPTION: (id: string) => `/tenants/${id}/subscription`,
    USERS: (tenantId: string) => `/tenants/${tenantId}/users`,
    USER_DETAIL: (tenantId: string, userId: string) => `/tenants/${tenantId}/users/${userId}`,
    DEPARTMENTS: (tenantId: string) => `/tenant/${tenantId}/departments`,
    DEPARTMENT_QUOTA: (tenantId: string, departmentId: string) => `/tenant/${tenantId}/departments/${departmentId}/quota`,
    DEPARTMENT_ADMINS: (tenantId: string) => `/tenant/${tenantId}/department-admins`,
    STORAGE: (tenantId: string) => `/tenants/${tenantId}/storage`,
    ACTIVITY: (tenantId: string) => `/tenants/${tenantId}/activity`,
    SETTINGS: (tenantId: string) => `/tenants/${tenantId}/settings`,
  },
  FILES: {
    UPLOAD: '/files/upload',
    LIST: '/files',
    DOWNLOAD: (id: string) => `/files/${id}/download`,
    DELETE: (id: string) => `/files/${id}`,
  },
  DEPARTMENT: {
    SETUP: '/department/setup',
    SETUP_INFO: '/department/setup-info',
    QUOTA_USERS: (deptId: string) => `/department/${deptId}/quota/users`,
    ALLOCATE_USER_QUOTA: (deptId: string, userId: string) => `/department/${deptId}/quota/users/${userId}`,
    EMPLOYEES: (deptId: string) => `/department/${deptId}/employees`,
  },
} as const;
