/**
 * Centralized API endpoints matching .NET Web API routes
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh-token',
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
    DEPARTMENTS: (tenantId: string) => `/tenants/${tenantId}/departments`,
    STORAGE: (tenantId: string) => `/tenants/${tenantId}/storage`,
    ACTIVITY: (tenantId: string) => `/tenants/${tenantId}/activity`,
    SETTINGS: (tenantId: string) => `/tenants/${tenantId}/settings`,
  },
} as const;
