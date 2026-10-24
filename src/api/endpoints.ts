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
    DEPARTMENT_ADMINS_OFFBOARD: (tenantId: string) => `/tenant/${tenantId}/department-admins/offboard`,
    STORAGE: (tenantId: string) => `/tenants/${tenantId}/storage`,
    ACTIVITY: (tenantId: string) => `/tenants/${tenantId}/activity`,
    SETTINGS: (tenantId: string) => `/tenants/${tenantId}/settings`,
  },
  FILES: {
    UPLOAD: '/files/upload',
    UPLOAD_SESSIONS: '/files/upload-sessions',
    UPLOAD_SESSION_COMPLETE: (id: string) => `/files/upload-sessions/${id}/complete`,
    UPLOAD_SESSION_PRESIGN_PART: (id: string, partNumber: number) => `/files/upload-sessions/${id}/parts/${partNumber}/url`,
    UPLOAD_SESSION_ABORT: (id: string) => `/files/upload-sessions/${id}`,
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
    FILES: (deptId: string) => `/department/${deptId}/files`,
    LOGS: (deptId: string) => `/department/${deptId}/logs`,
  },
} as const;
