import { test, expect } from '@playwright/test';
import process from 'node:process';
import { LoginPage } from '../pages/LoginPage';
import { AcceptInvitationPage } from '../pages/AcceptInvitationPage';
import { SystemAdminPage } from '../pages/SystemAdminPage';
import { TenantAdminPage } from '../pages/TenantAdminPage';
import { DepartmentSetupPage } from '../pages/DepartmentSetupPage';
import { DepartmentAdminPage } from '../pages/DepartmentAdminPage';
import { DrivePage } from '../pages/DrivePage';
import { getInvitationLink } from '../helpers/invitationPrompt';

/**
 * KỊCH BẢN TỔNG DUYỆT ĐƯỜNG DEMO CLOUD-DMS (7 BƯỚC LIÊN HOÀN)
 * Chạy tuần tự 100% trên môi trường thật (Kong Gateway https://localhost:8443)
 */
test.describe.serial('Đường Demo Cloud-DMS (7 Bước Liên Hoàn)', () => {
  const timestamp = Date.now().toString().slice(-4);
  const tenantCode = `DEMO${timestamp}`;
  const tenantName = `Công ty Thử nghiệm ${timestamp}`;
  const defaultPassword = 'P@ssword12345!';

  const adminEmail = `anhiuemmatrui+admin_${timestamp}@gmail.com`;
  const deptAdminEmail = `anhiuemmatrui+tp_${timestamp}@gmail.com`;
  const employeeEmail = `anhiuemmatrui+nv_${timestamp}@gmail.com`;

  test('Bước 1: System Admin đăng nhập hệ thống qua Gateway 8443', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Mật khẩu sysadmin đọc từ env hoặc default dev password
    const sysAdminPass = process.env.SYSADMIN_PASSWORD || 'SysAdmin@Dev2026!';
    await loginPage.login('sysadmin@local.com', sysAdminPass);

    // Xác nhận vào đúng System Admin Portal
    await expect(page.getByText('System Admin')).toBeVisible({ timeout: 15_000 });
  });

  test('Bước 2: System Admin tạo Tenant và mời Tenant Admin', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const sysAdminPage = new SystemAdminPage(page);

    await loginPage.goto();
    const sysAdminPass = process.env.SYSADMIN_PASSWORD || 'SysAdmin@Dev2026!';
    await loginPage.login('sysadmin@local.com', sysAdminPass);

    await sysAdminPage.navigateToTenants();
    await sysAdminPage.createTenantWithAdmin({
      tenantName: tenantName,
      firstName: 'Quản Trị',
      lastName: 'Nguyễn',
      email: adminEmail,
      quotaGb: 50,
    });

    await sysAdminPage.logout();
  });

  test('Bước 3: Tenant Admin kích hoạt tài khoản và đăng nhập', async ({ page }) => {
    const acceptPage = new AcceptInvitationPage(page);
    const inviteUrl = await getInvitationLink(`Tenant Admin (${adminEmail})`, 'TENANT_ADMIN_INVITE_URL');

    await acceptPage.goto(inviteUrl);
    await acceptPage.accept(defaultPassword);

    // Đăng nhập với tài khoản Tenant Admin vừa tạo
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminEmail, defaultPassword);

    // Xác nhận vào đúng Tenant Portal
    await expect(page.getByText('Trung tâm điều khiển')).toBeVisible({ timeout: 15_000 });
  });

  test('Bước 4: Tenant Admin mời Trưởng phòng và Trưởng phòng Tự thiết lập phòng ban', async ({ page }) => {
    // 4.1. Tenant Admin mời Trưởng phòng
    const loginPage = new LoginPage(page);
    const tenantAdminPage = new TenantAdminPage(page);

    await loginPage.goto();
    await loginPage.login(adminEmail, defaultPassword);

    await tenantAdminPage.navigateToDepartments();
    await tenantAdminPage.inviteDepartmentAdmin({
      fullName: 'Lê Thị Hồng',
      email: deptAdminEmail,
      quotaGb: 20,
    });
    await tenantAdminPage.logout();

    // 4.2. Trưởng phòng nhận thư và kích hoạt
    const acceptPage = new AcceptInvitationPage(page);
    const inviteUrl = await getInvitationLink(`Trưởng phòng (${deptAdminEmail})`, 'DEPT_ADMIN_INVITE_URL');

    await acceptPage.goto(inviteUrl);
    await acceptPage.accept(defaultPassword);

    // 4.3. Trưởng phòng đăng nhập -> Màn hình Self-Setup
    await loginPage.goto();
    await loginPage.login(deptAdminEmail, defaultPassword);

    const setupPage = new DepartmentSetupPage(page);
    await setupPage.setup('Phòng Kinh doanh', `KD${timestamp}`, 30);

    // Xác nhận đã vào Cổng Trưởng phòng sau khi setup
    await expect(page.getByText('Phòng Kinh doanh')).toBeVisible({ timeout: 15_000 });
  });

  test('Bước 5: Trưởng phòng mời Nhân viên & Nhân viên Tải tệp lên Drive', async ({ page }) => {
    // 5.1. Trưởng phòng mời nhân viên Nam
    const loginPage = new LoginPage(page);
    const deptAdminPage = new DepartmentAdminPage(page);

    await loginPage.goto();
    await loginPage.login(deptAdminEmail, defaultPassword);

    await deptAdminPage.navigateToStaff();
    await deptAdminPage.inviteEmployee({
      firstName: 'Nam',
      lastName: 'Phạm Văn',
      email: employeeEmail,
      quotaGb: 2,
    });
    await deptAdminPage.logout();

    // 5.2. Nhân viên Nam nhận thư và kích hoạt
    const acceptPage = new AcceptInvitationPage(page);
    const inviteUrl = await getInvitationLink(`Nhân viên (${employeeEmail})`, 'EMPLOYEE_INVITE_URL');

    await acceptPage.goto(inviteUrl);
    await acceptPage.accept(defaultPassword);

    // 5.3. Nhân viên đăng nhập vào Drive
    await loginPage.goto();
    await loginPage.login(employeeEmail, defaultPassword);

    const drivePage = new DrivePage(page);
    const fileName = `baocao_${timestamp}.txt`;
    await drivePage.uploadFile(fileName, 'Báo cáo doanh số kinh doanh kiểm thử tự động');

    // Chờ ClamAV quét hoàn tất
    await page.waitForTimeout(3000);
  });

  test('Bước 6: Nhân viên chia sẻ tệp cho Trưởng phòng quyền Viewer', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(employeeEmail, defaultPassword);

    const drivePage = new DrivePage(page);
    const fileName = `baocao_${timestamp}.txt`;

    await drivePage.openShareModal(fileName);
    await drivePage.shareFile(deptAdminEmail, 'Viewer');
    await drivePage.logout();

    // Trưởng phòng đăng nhập kiểm tra
    await loginPage.goto();
    await loginPage.login(deptAdminEmail, defaultPassword);

    // Điều hướng vào mục "Được chia sẻ với tôi"
    await page.getByRole('button', { name: /Được chia sẻ|Shared/i }).click();
    await expect(page.getByText(fileName)).toBeVisible({ timeout: 15_000 });
  });
});

