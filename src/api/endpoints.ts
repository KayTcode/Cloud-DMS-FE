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
    DEPARTMENT_ADMINS_ASSIGN_VACANT_LEAD: (tenantId: string, departmentId: string) => `/tenant/${tenantId}/departments/${departmentId}/assign-lead`,
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
    SHARED: '/files/shared',
    SHARE: (id: string) => `/files/${id}/share`,
    REVOKE_SHARE: (id: string, recipientId: string) => `/files/${id}/share/${recipientId}`,
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
    SHARED_QUOTA: (deptId: string) => `/department/${deptId}/quota/shared`,
  },
  QUOTA: {
    REQUESTS: '/quota/requests',
    CANCEL: (id: string) => `/quota/requests/${id}/cancel`,
    PENDING_FOR_ME: '/quota/requests/pending-for-me',
    DECIDE: (id: string) => `/quota/requests/${id}/decide`,
    REJECT: (id: string) => `/quota/requests/${id}/reject`,
    HISTORY: '/quota/requests/history',
  },
  ADMIN_QUOTA: {
    TOGGLE_FEATURE: (tenantId: string) => `/admin/tenants/${tenantId}/quota-request-feature`,
    METRICS: '/admin/quota-requests/metrics',
    RETRY_FOLDER_PROVISIONING: (userId: string) => `/admin/users/${userId}/retry-folder-provisioning`,
  },
  FOLDERS: {
    CHILDREN: (folderId: string) => `/folders/${folderId}/children`,
    ROOT: (driveKind: string, driveOwnerId: string) =>
      `/folders/root?driveKind=${driveKind}&driveOwnerId=${driveOwnerId}`,
    CREATE: '/folders',
    RENAME: (folderId: string) => `/folders/${folderId}/rename`,
    MOVE: (folderId: string) => `/folders/${folderId}/move`,
    TRASH: (folderId: string) => `/folders/${folderId}/trash`,
    RESTORE: (folderId: string) => `/folders/${folderId}/restore`,
    PURGE: (folderId: string) => `/folders/${folderId}`,
    TRASH_LIST: (driveKind: string, driveOwnerId: string) =>
      `/folders/trash?driveKind=${driveKind}&driveOwnerId=${driveOwnerId}`,
    EMPTY_TRASH: (driveKind: string, driveOwnerId: string) =>
      `/folders/trash/empty?driveKind=${driveKind}&driveOwnerId=${driveOwnerId}`,
  },
  ADMIN_QUOTA_ALLOC: {
    GET: (tenantId: string) => `/admin/tenants/${tenantId}/quota`,
    GRANT: (tenantId: string) => `/admin/tenants/${tenantId}/quota/grant`,
    REDUCE: (tenantId: string) => `/admin/tenants/${tenantId}/quota/reduce`,
  },
  NOTIFICATIONS: {
    LIST: (pageNumber: number, pageSize: number) => `/notifications?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    UNREAD_COUNT: '/notifications/unread-count',
    READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
  },
} as const;
