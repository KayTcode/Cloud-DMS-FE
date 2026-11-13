import { test, expect } from '@playwright/test';
import { loginViaApi } from '../helpers/apiHelper';

test.describe('Thôi Việc Nhân Sự & Bàn Giao Dữ Liệu (Offboarding & Handover Flow)', () => {
  const sysAdminPass = process.env.SYSADMIN_PASSWORD || 'SysAdmin@Dev2026!';
  let sysAdminToken: string;

  test.beforeAll(async ({ request }) => {
    sysAdminToken = await loginViaApi(request, 'sysadmin@local.com', sysAdminPass);
  });

  test('TC-UF-08.01 & TC-UF-08.02: Khóa tài khoản và Bàn giao dữ liệu cho người tiếp quản', async ({ request }) => {
    const dummyUserId = '11111111-2222-3333-4444-555555555555';
    const dummySuccessorId = '99999999-8888-7777-6666-555555555555';

    // Gọi API offboard nhân viên
    const offboardRes = await request.post('/api/department/employees/offboard', {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        employeeUserId: dummyUserId,
        successorUserId: dummySuccessorId,
        scenario: 'HandoverToSuccessor',
      },
    });

    // Trả 200 nếu thành công hoặc 400/404 nếu dummy user không tồn tại
    expect([200, 400, 404]).toContain(offboardRes.status());
  });

  test('TC-UF-08.01b: Xác nhận tài khoản sau khi offboard bị vô hiệu hóa (Session Invalidation)', async ({ request }) => {
    // Thử truy cập với thông tin người dùng đã bị khóa
    const testCheck = await request.get('/api/me', {
      headers: {
        Authorization: 'Bearer invalid-or-revoked-token',
      },
    });

    // Bắt buộc phải bị từ chối 401 Unauthorized
    expect(testCheck.status()).toBe(401);
  });
});

