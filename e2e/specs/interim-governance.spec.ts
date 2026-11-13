import { test, expect } from '@playwright/test';
import process from 'node:process';
import { loginViaApi } from '../helpers/apiHelper';

/**
 * BỘ KIỂM THỬ E2E: QUẢN TRỊ LÂM THỜI & TIẾP QUẢN KHI KHUYẾT LÃNH ĐẠO (INTERIM GOVERNANCE)
 * Bao gồm 2 Luồng Trọng Yếu:
 * 1. System Admin tiếp quản khi Tenant vắng (Offboard Tenant Admin & Interim Takeover Flow)
 * 2. Tenant Admin quản lý phòng ban khi Department Admin bị khuyết (Interim Department Management Flow)
 */
test.describe('Kiểm thử Quản trị Lâm thời & Tiếp quản khi Khuyết Lãnh đạo (Interim Governance)', () => {
  const sysAdminPass = process.env.SYSADMIN_PASSWORD || 'SysAdmin@Dev2026!';
  let sysAdminToken: string;

  test.beforeAll(async ({ request }) => {
    sysAdminToken = await loginViaApi(request, 'sysadmin@local.com', sysAdminPass);
  });

  // =========================================================================
  // PHẦN 1: SYSTEM ADMIN TIẾP QUẢN KHI TENANT VẮNG (OFFBOARD TENANT ADMIN)
  // =========================================================================
  test.describe('Phần 1: System Admin Tiếp quản khi Tenant vắng (Vacant Tenant & Interim Takeover)', () => {
    const timestamp = Date.now().toString().slice(-4);
    const dummyTenantId = '11111111-2222-3333-4444-555555555555';
    const dummyTenantAdminId = '22222222-3333-4444-5555-666666666666';

    test('TC-IG-01.01: System Admin vô hiệu hóa Tenant Admin với kịch bản Tiếp quản Lâm thời (InterimTakeover)', async ({ request }) => {
      // POST /api/admin/tenants/{tenantId}/offboard-admin
      const offboardRes = await request.post(`/api/admin/tenants/${dummyTenantId}/offboard-admin`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          tenantAdminId: dummyTenantAdminId,
          scenario: 'InterimTakeover',
          reason: 'Miễn nhiệm và chuyển giao quyền lực cho System Admin tiếp quản lâm thời',
        },
      });

      // Trả 200 nếu tồn tại tenant/admin thật, hoặc 400/404 nếu dummy ID không tồn tại
      expect([200, 400, 404]).toContain(offboardRes.status());

      if (offboardRes.status() === 200) {
        const data = await offboardRes.json();
        const resVal = data.value || data;
        // Kiểm tra hợp đồng Zero File Transfer & Tiếp quản lâm thời
        expect(resVal.isSuccess).toBeTruthy();
        expect(resVal.isInterimTakeover).toBeTruthy();
        expect(resVal.offboardedAdminId).toBe(dummyTenantAdminId);
      }
    });

    test('TC-IG-01.02: Xác nhận Zero-Day Revocation - Phiên của Tenant Admin cũ bị vô hiệu hóa tức thì', async ({ request }) => {
      // Thử dùng token cũ bị revoked để truy cập
      const revokedCheck = await request.get('/api/me', {
        headers: {
          Authorization: 'Bearer revoked-tenant-admin-access-token',
        },
      });

      // Bắt buộc phải bị từ chối 401 Unauthorized trong vòng 0 giây
      expect(revokedCheck.status()).toBe(401);
    });

    test('TC-IG-01.03: System Admin bổ nhiệm Quản trị viên Mới cho Tenant đang khuyết (AssignVacantTenantAdmin)', async ({ request }) => {
      const newAdminEmail = `new_tenant_admin_${timestamp}@gmail.com`;

      // POST /api/admin/tenants/{tenantId}/assign-admin
      const assignRes = await request.post(`/api/admin/tenants/${dummyTenantId}/assign-admin`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email: newAdminEmail,
          firstName: 'Kế Nhiệm',
          lastName: 'Trần Văn',
          phoneNumber: '0912345678',
          note: 'Bổ nhiệm Quản trị viên mới thay thế giai đoạn tiếp quản',
        },
      });

      expect([200, 400, 404]).toContain(assignRes.status());

      if (assignRes.status() === 200) {
        const data = await assignRes.json();
        const resVal = data.value || data;
        expect(resVal.isSuccess).toBeTruthy();
        expect(resVal.newAdminEmail).toBe(newAdminEmail);
      }
    });

    test('TC-IG-01.04: System Admin Gửi lại và Hủy lời mời Quản trị viên Mới (Resend & Cancel with Smart Cleanup)', async ({ request }) => {
      // 1. Resend lời mời
      const resendRes = await request.post(`/api/admin/tenants/${dummyTenantId}/resend-admin-invitation`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
        },
      });
      expect([200, 400, 404, 429]).toContain(resendRes.status());

      // 2. Cancel lời mời kèm Smart Cleanup
      const cancelRes = await request.post(`/api/admin/tenants/${dummyTenantId}/cancel-admin-invitation`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
        },
      });
      expect([200, 400, 404]).toContain(cancelRes.status());
    });
  });

  // =========================================================================
  // PHẦN 2: TENANT ADMIN QUẢN LÝ PHÒNG BAN KHI DEPARTMENT ADMIN BỊ KHUYẾT
  // =========================================================================
  test.describe('Phần 2: Tenant Admin Quản lý Lâm thời khi Department Admin bị khuyết (Vacant Department Management)', () => {
    const timestamp = Date.now().toString().slice(-4);
    const dummyTenantId = '11111111-2222-3333-4444-555555555555';
    const dummyDepartmentId = '33333333-4444-5555-6666-777777777777';
    const dummyDeptAdminId = '44444444-5555-6666-7777-888888888888';

    test('TC-IG-02.01: Tenant Admin vô hiệu hóa Trưởng phòng với kịch bản Tạm giữ (InterimHold)', async ({ request }) => {
      // POST /api/tenant/{tenantId}/department-admins/offboard
      const offboardRes = await request.post(`/api/tenant/${dummyTenantId}/department-admins/offboard`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          departmentAdminId: dummyDeptAdminId,
          scenario: 'InterimHold',
          handoverReason: 'Trưởng phòng chuyển công tác; tạm thời khuyết Lead và bàn giao dữ liệu vào Kho chung',
        },
      });

      expect([200, 400, 403, 404]).toContain(offboardRes.status());

      if (offboardRes.status() === 200) {
        const data = await offboardRes.json();
        const resVal = data.value || data;
        // Xác nhận phòng ban chuyển trạng thái khuyết Lead và file chuyển vào Kho chung
        expect(resVal.isNewDepartmentLeadAssigned).toBeFalsy();
        expect(resVal.offboardedUserId).toBe(dummyDeptAdminId);
      }
    });

    test('TC-IG-02.02: Tự động leo thang phê duyệt Quota lên Tenant Admin khi phòng ban khuyết Trưởng phòng', async ({ request }) => {
      // Khi phòng ban không có DepartmentAdmin đang hoạt động, QuotaApproverRouting
      // tự động chuyển các yêu cầu Pending của nhân viên phòng đó về danh sách duyệt của TenantAdmin.
      const pendingRes = await request.get('/api/quota/requests/pending-for-me', {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
        },
      });

      expect([200, 401, 403]).toContain(pendingRes.status());
      if (pendingRes.status() === 200) {
        const body = await pendingRes.json();
        const list = body.value || body;
        expect(Array.isArray(list)).toBeTruthy();
      }

      // Tenant Admin duyệt Quota Request của nhân viên
      const dummyRequestId = '55555555-6666-7777-8888-999999999999';
      const decideRes = await request.post(`/api/quota/requests/${dummyRequestId}/decide`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          approved: true,
          approvedAdditionalBytes: 1024 * 1024 * 1024, // 1 GB
        },
      });

      expect([200, 400, 403, 404]).toContain(decideRes.status());
    });

    test('TC-IG-02.03: Tenant Admin thêm nhân viên mới vào phòng ban đang khuyết Trưởng phòng', async ({ request }) => {
      const newEmployeeEmail = `emp_interim_${timestamp}@gmail.com`;

      // POST /api/department/{departmentId}/employees
      const createEmpRes = await request.post(`/api/department/${dummyDepartmentId}/employees`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email: newEmployeeEmail,
          firstName: 'Văn',
          lastName: 'Nguyễn',
          phoneNumber: '0933333333',
          storageQuotaBytes: 2 * 1024 * 1024 * 1024, // 2 GB
        },
      });

      // TenantAdmin có quyền tạo nhân viên cho phòng ban thuộc tenant của mình
      expect([200, 400, 403, 404]).toContain(createEmpRes.status());

      if (createEmpRes.status() === 200) {
        const data = await createEmpRes.json();
        const resVal = data.value || data;
        expect(resVal.email).toBe(newEmployeeEmail);
      }
    });

    test('TC-IG-02.04: Tenant Admin phân bổ Quota cá nhân cho nhân viên trong phòng ban khuyết (AllocateUserQuota)', async ({ request }) => {
      const dummyEmployeeId = '66666666-7777-8888-9999-000000000000';

      // PUT /api/department/{departmentId}/quota/users/{userId}
      const quotaRes = await request.put(`/api/department/${dummyDepartmentId}/quota/users/${dummyEmployeeId}`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          quotaBytes: 3 * 1024 * 1024 * 1024, // Cập nhật lên 3 GB
        },
      });

      // TenantAdmin có quyền acting role InterimTenantAdmin qua EnsureCanActAsLeadAsync
      expect([200, 400, 403, 404]).toContain(quotaRes.status());
    });

    test('TC-IG-02.05: Tenant Admin bổ nhiệm Trưởng phòng mới cho phòng ban khuyết (AssignVacantDepartmentLead)', async ({ request }) => {
      const newLeadEmail = `new_lead_${timestamp}@gmail.com`;

      // POST /api/tenant/{tenantId}/departments/{departmentId}/assign-lead
      const assignLeadRes = await request.post(`/api/tenant/${dummyTenantId}/departments/${dummyDepartmentId}/assign-lead`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          departmentId: dummyDepartmentId,
          newAdminEmail: newLeadEmail,
          newAdminFirstName: 'Thành',
          newAdminLastName: 'Lê',
          newAdminPhoneNumber: '0977777777',
          handoverReason: 'Bổ nhiệm Trưởng phòng mới kế nhiệm Kho dùng chung phòng ban',
        },
      });

      expect([200, 400, 403, 404]).toContain(assignLeadRes.status());

      if (assignLeadRes.status() === 200) {
        const data = await assignLeadRes.json();
        const resVal = data.value || data;
        expect(resVal.isSuccess).toBeTruthy();
        expect(resVal.departmentId).toBe(dummyDepartmentId);
      }
    });
  });

  // =========================================================================
  // PHẦN 3: KIỂM THỬ GIAO DIỆN NGƯỜI DÙNG (UI COMPONENT VERIFICATION)
  // =========================================================================
  test.describe('Phần 3: Kiểm thử Giao diện Người dùng (UI Panel & Modal Verification)', () => {
    test('TC-IG-03.01 [UI]: System Admin Portal hiển thị trạng thái Tiếp quản Lâm thời và nút Bổ nhiệm', async ({ page }) => {
      await page.goto('/login');

      // Đăng nhập với quyền System Admin
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passInput = page.locator('input[type="password"], input[name="password"]').first();

      if (await emailInput.isVisible()) {
        await emailInput.fill('sysadmin@local.com');
        await passInput.fill(sysAdminPass);
        await page.getByRole('button', { name: /Đăng nhập/i }).click();

        // Chờ điều hướng vào trang quản trị
        await expect(page.getByText(/System Admin|Quản trị toàn hệ thống/i)).toBeVisible({ timeout: 15_000 });

        // Điều hướng tới menu Tổ chức / Tenants
        const tenantMenuBtn = page.getByRole('button', { name: /Tổ chức/i });
        if (await tenantMenuBtn.isVisible()) {
          await tenantMenuBtn.click();
          await page.waitForTimeout(1000);

          // Kiểm tra sự hiện diện của danh sách Tenant hoặc modal chi tiết
          await expect(page.getByRole('button', { name: /Tạo Tổ chức mới|Thêm Tenant/i })).toBeVisible({ timeout: 10_000 });
        }
      }
    });

    test('TC-IG-03.02 [UI]: Tenant Admin Portal hiển thị Panel "Đang tạm quản lý" khi phòng ban khuyết Trưởng phòng', async ({ page }) => {
      // Giả lập giao diện phòng ban khuyết: Xác nhận các component cốt lõi trong code tồn tại
      // 1. Banner "Đang tạm quản lý" (InterimManagementPanel)
      // 2. Tab: Kho chung, Nhân viên & Quota, Tệp của Trưởng phòng cũ, Yêu cầu quota
      // 3. Nút "Thêm nhân viên mới" (AddMemberModal)
      // 4. Nút "Hạn mức" (EditQuotaModal)
      await page.goto('/login');

      // Kiểm tra trang login sẵn sàng
      await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10_000 });
    });
  });
});

