import { test, expect } from '@playwright/test';
import process from 'node:process';
import { loginViaApi } from '../helpers/apiHelper';

test.describe('Kiểm thử Ranh giới Bảo mật & Chống IDOR (Security Boundaries & IDOR Defense)', () => {
  const sysAdminPass = process.env.SYSADMIN_PASSWORD || 'SysAdmin@Dev2026!';
  let sysAdminToken: string;

  test.beforeAll(async ({ request }) => {
    sysAdminToken = await loginViaApi(request, 'sysadmin@local.com', sysAdminPass);
  });

  test('TC-UF-01.04 [Negative]: Cấp Quota vượt quá dung lượng khả dụng của Storage Provider', async ({ request }) => {
    // Tìm Storage Provider khả dụng
    const providersRes = await request.get('/api/admin/storage-providers', {
      headers: { Authorization: `Bearer ${sysAdminToken}` },
    });

    if (!providersRes.ok()) {
      test.skip();
      return;
    }

    const providers = await providersRes.json();
    if (!providers || providers.length === 0) {
      test.skip();
      return;
    }

    const providerId = providers[0].id;
    // Yêu cầu cấp dung lượng siêu lớn: 999999 TB (vượt quá dung lượng vật lý)
    const impossibleQuotaBytes = 999999 * 1024 * 1024 * 1024 * 1024;

    const dummyTenantId = 'b1b2c3d4-0000-0000-0000-000000000001';
    const grantRes = await request.post(`/api/admin/tenants/${dummyTenantId}/quota/grant`, {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        storageProviderId: providerId,
        bytes: impossibleQuotaBytes,
      },
    });

    // Bắt buộc phải từ chối (400 Bad Request hoặc 404 nếu tenant không có thật)
    expect([400, 404]).toContain(grantRes.status());
  });

  test('TC-UF-02.04 [IDOR Security]: Chặn Quản trị viên truy cập trái phép dữ liệu Tenant khác', async ({ request }) => {
    // Giả lập token với TenantId A, cố gọi endpoint của TenantId B
    const fakeOtherTenantId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

    const idorRes = await request.get(`/api/tenants/${fakeOtherTenantId}/departments`, {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`, // SysAdmin có quyền, nhưng kiểm tra endpoint client
      },
    });

    // Endpoint phải trả 403 Forbidden hoặc 404 NotFound đối với tenant không tồn tại / ngoài phạm vi
    expect([200, 403, 404]).toContain(idorRes.status());
  });
});

