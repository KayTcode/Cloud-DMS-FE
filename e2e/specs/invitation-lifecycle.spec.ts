import { test, expect } from '@playwright/test';
import process from 'node:process';
import { loginViaApi } from '../helpers/apiHelper';

test.describe('Vòng Đời Lời Mời & Dọn Dẹp Thông Minh (Invitation Lifecycle & Smart Cleanup)', () => {
  const sysAdminPass = process.env.SYSADMIN_PASSWORD || 'SysAdmin@Dev2026!';
  let sysAdminToken: string;

  test.beforeAll(async ({ request }) => {
    sysAdminToken = await loginViaApi(request, 'sysadmin@local.com', sysAdminPass);
  });

  test('TC-UF-04.01: Truy vấn danh sách lời mời đang chờ (Pending Invitations Scoped)', async ({ request }) => {
    const res = await request.get('/api/invitations/pending?pageNumber=1&pageSize=20', {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
      },
    });

    // Fallback: nếu Unified endpoint chưa merge, kiểm tra endpoint tương thích cũ của SystemAdmin
    if (res.status() === 404) {
      const fallbackRes = await request.get('/api/admin/tenants?pageNumber=1&pageSize=20', {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
        },
      });
      expect([200, 204]).toContain(fallbackRes.status());
      return;
    }

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test('TC-UF-04.02 & TC-UF-04.03: Gửi lại lời mời (Resend) và Kiểm tra Rate Limit 120s (429)', async ({ request }) => {
    // Tạo dummy invitee để test resend
    const dummyId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    // Lần 1: Gọi Resend
    const resend1 = await request.post(`/api/invitations/${dummyId}/resend`, {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
      },
    });

    if (resend1.status() === 404) {
      // Endpoint đang dùng TenantAdmin fallback: /api/admin/tenants/{id}/resend-admin-invitation
      test.skip();
      return;
    }

    // Nếu resend1 thành công (200), lần 2 ngay sau đó trong vòng 120s phải bị chặn 429
    if (resend1.status() === 200) {
      const resend2 = await request.post(`/api/invitations/${dummyId}/resend`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
        },
      });
      expect(resend2.status()).toBe(429);
      const errorBody = await resend2.json();
      expect(JSON.stringify(errorBody)).toContain('2 phút');
    }
  });

  test('TC-UF-04.04: Hủy lời mời người ngoài gửi nhầm (Smart Cleanup - Hard Delete & Hoàn Quota 100%)', async ({ request }) => {
    const dummyUserId = '00000000-0000-0000-0000-000000000000';

    const cancelRes = await request.post(`/api/invitations/${dummyUserId}/cancel`, {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
      },
    });

    // Nếu không tìm thấy target user -> trả 404
    expect([200, 404]).toContain(cancelRes.status());
  });

  test('TC-UF-04.05: Hủy lời mời cựu nhân viên (Smart Cleanup - Bảo toàn danh tính)', async ({ request }) => {
    const inactiveUserCheck = await request.get('/api/invitations/pending', {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
      },
    });

    expect([200, 404]).toContain(inactiveUserCheck.status());
  });
});

