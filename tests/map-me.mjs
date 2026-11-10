/**
 * Test cho mapMe() — chạy: node tests/map-me.mjs
 * Không cần build, dùng pure JS inline để tránh phụ thuộc TypeScript.
 */

// --- Inline implementation (mirror of mapMe.ts) ---
const ROLE_PRIORITY = ['SystemAdmin', 'TenantAdmin', 'DepartmentAdmin', 'Employee'];

function mapMe(me) {
  const validRoles = new Set(ROLE_PRIORITY);
  let resolvedRole = 'Employee';
  if (me.role && validRoles.has(me.role)) {
    resolvedRole = me.role;
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

// --- Test helpers ---
let passed = 0;
let failed = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// --- Tests ---

console.log('map-me tests:');

// usesServerRole
{
  const me = {
    userId: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B',
    role: 'TenantAdmin', roles: ['Employee', 'TenantAdmin'],
    tenantId: 't1', departmentId: null, permissions: [],
  };
  const result = mapMe(me);
  assert('usesServerRole', result.role === 'TenantAdmin', `got ${result.role}`);
}

// fallsBackToHighestRole
{
  const me = {
    userId: 'u2', email: 'b@c.com', firstName: 'B', lastName: 'C',
    role: null, roles: ['Employee', 'DepartmentAdmin'],
    tenantId: null, departmentId: 'd1', permissions: [],
  };
  const result = mapMe(me);
  assert('fallsBackToHighestRole', result.role === 'DepartmentAdmin', `got ${result.role}`);
}

// unknownRoleBecomesEmployee
{
  const me = {
    userId: 'u3', email: 'c@d.com', firstName: 'C', lastName: 'D',
    role: 'Auditor', roles: [],
    tenantId: null, departmentId: null, permissions: [],
  };
  const result = mapMe(me);
  assert('unknownRoleBecomesEmployee', result.role === 'Employee', `got ${result.role}`);
}

// fullNameFallsBackToEmail
{
  const me = {
    userId: 'u4', email: 'noname@test.com', firstName: '', lastName: '',
    role: 'Employee', roles: ['Employee'],
    tenantId: null, departmentId: null, permissions: [],
  };
  const result = mapMe(me);
  assert('fullNameFallsBackToEmail', result.fullName === 'noname@test.com', `got "${result.fullName}"`);
}

// copiesTenantDepartmentPermissions
{
  const me = {
    userId: 'u5', email: 'e@f.com', firstName: 'E', lastName: 'F',
    role: 'TenantAdmin', roles: ['TenantAdmin'],
    tenantId: 'tenant-99', departmentId: 'dept-42', permissions: ['read', 'write'],
  };
  const result = mapMe(me);
  assert('copiesTenantDepartmentPermissions - id',
    result.id === 'u5', `id=${result.id}`);
  assert('copiesTenantDepartmentPermissions - tenantId',
    result.tenantId === 'tenant-99', `tenantId=${result.tenantId}`);
  assert('copiesTenantDepartmentPermissions - departmentId',
    result.departmentId === 'dept-42', `departmentId=${result.departmentId}`);
  assert('copiesTenantDepartmentPermissions - permissions',
    JSON.stringify(result.permissions) === JSON.stringify(['read', 'write']),
    `permissions=${JSON.stringify(result.permissions)}`);
}

// --- Summary ---
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
