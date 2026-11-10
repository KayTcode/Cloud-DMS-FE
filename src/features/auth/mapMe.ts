import { AuthUser, MeResponse, UserRole } from '@/types/auth.types';

const ROLE_PRIORITY: UserRole[] = ['SystemAdmin', 'TenantAdmin', 'DepartmentAdmin', 'Employee'];

/**
 * Chuyển đổi MeResponse từ API thành AuthUser dùng trong AuthContext.
 * - id = userId
 * - fullName = (firstName + ' ' + lastName).trim() hoặc fallback về email
 * - role: dùng me.role nếu là UserRole hợp lệ,
 *         nếu không lấy role cao nhất trong me.roles theo thứ tự ưu tiên,
 *         không có thì mặc định 'Employee'
 */
export function mapMe(me: MeResponse): AuthUser {
  const validRoles = new Set<string>(ROLE_PRIORITY);

  // Xác định role
  let resolvedRole: UserRole = 'Employee';
  if (me.role && validRoles.has(me.role)) {
    resolvedRole = me.role as UserRole;
  } else {
    for (const r of ROLE_PRIORITY) {
      if (me.roles.includes(r)) {
        resolvedRole = r;
        break;
      }
    }
  }

  const fullName = `${me.firstName} ${me.lastName}`.trim() || me.email;

  return {
    id: me.userId,
    email: me.email,
    fullName,
    role: resolvedRole,
    tenantId: me.tenantId,
    departmentId: me.departmentId,
    permissions: me.permissions,
  };
}
