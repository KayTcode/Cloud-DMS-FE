import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../pages/LoginPage';
import { StorageProviderPage } from '../pages/StorageProviderPage';
import { SystemAdminPage } from '../pages/SystemAdminPage';

const SYSADMIN_EMAIL = 'sysadmin@local.com';
const DRIVE_LIMIT = 16106127360;

function findTenantByNameInDb(name: string): { id: string; storageQuotaBytes: number } | undefined {
  const DB_PASS = process.env.DB_PASS;
  if (!DB_PASS) return undefined;
  try {
    const out = execSync(
      `mysql --host=127.0.0.1 --port=3307 --user=dms_service "--password=${DB_PASS}" cloud_dms --batch --skip-column-names -e "SELECT Id, StorageQuotaBytes FROM Tenants WHERE Name = '${name.replace(/'/g, "\\'")}' ORDER BY CreatedAt DESC LIMIT 1;"`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    if (!out) return undefined;
    const [id, quota] = out.split('\t');
    return { id: id.trim(), storageQuotaBytes: Number(quota.trim()) };
  } catch {
    return undefined;
  }
}

test.describe('Storage Provider — Google Drive OAuth', () => {
  test('Thêm tài khoản Google Drive bằng OAuth', async ({ page }) => {
    const configJson = process.env.GDRIVE_OAUTH_CONFIG_JSON!;
    expect(configJson, 'thiếu GDRIVE_OAUTH_CONFIG_JSON').toBeTruthy();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(SYSADMIN_EMAIL, process.env.SYSADMIN_PASSWORD!);
    const providers = new StorageProviderPage(page);
    await providers.openConnectModal();
    await providers.fillGoogleDrive(configJson, 'Nghiem Thu GDrive OAuth');
    await providers.clickTest();

    const { total } = await providers.readReportedCapacity();
    expect(total).toBe(DRIVE_LIMIT);

    await providers.submit();
    await expect(page.getByRole('heading', { name: 'Nghiem Thu GDrive OAuth' }).first()).toBeVisible({ timeout: 15_000 });

    // In PROVIDER_ID để task sau dùng
    const token = await page.evaluate(() => localStorage.getItem('token') ?? sessionStorage.getItem('token'));
    const res = await page.request.get('/api/admin/storage-providers', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    const created = list.find((p: any) => (p.name ?? p.Name) === 'Nghiem Thu GDrive OAuth');
    if (created) console.log(`PROVIDER_ID=${created.id ?? created.Id}`);
  });

  test('Tạo tổ chức với một provider thì tự cấp hạn mức trên Google Drive', async ({ page }) => {
    const FIVE_GIB = 5368709120;
    const stamp = Date.now().toString().slice(-5);
    const tenantName = `Nghiem Thu Drive ${stamp}`;

    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(SYSADMIN_EMAIL, process.env.SYSADMIN_PASSWORD!);
    const admin = new SystemAdminPage(page);
    await admin.navigateToTenants();
    await admin.createTenantWithAdmin({
      tenantName,
      firstName: 'Nghiem',
      lastName: 'Thu',
      email: `ta${stamp}@example.com`,
      quotaGb: 5,
    });

    const tenant = findTenantByNameInDb(tenantName);
    expect(tenant, `Không tìm thấy tenant "${tenantName}" trong DB`).toBeTruthy();
    expect(tenant!.storageQuotaBytes).toBe(FIVE_GIB);
    console.log(`TENANT_ID=${tenant!.id}`);
  });

  test('Từ chối refresh token sai và không tạo provider rác', async ({ page }) => {
    const configJson = process.env.GDRIVE_OAUTH_CONFIG_JSON!;
    expect(configJson, 'thiếu GDRIVE_OAUTH_CONFIG_JSON').toBeTruthy();

    // Đăng nhập để lấy token và đếm số provider trước
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(SYSADMIN_EMAIL, process.env.SYSADMIN_PASSWORD!);
    const token = await page.evaluate(() => localStorage.getItem('token') ?? sessionStorage.getItem('token'));
    const before = await page.request.get('/api/admin/storage-providers', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const beforeData = await before.json();
    const beforeList = Array.isArray(beforeData) ? beforeData : (beforeData?.items ?? beforeData?.data ?? []);
    const countBefore = beforeList.length;

    // Điền credentials sai (sửa một ký tự refresh_token)
    const badConfig = JSON.parse(configJson);
    badConfig.refresh_token = badConfig.refresh_token.slice(0, -1) + 'X';

    const providers = new StorageProviderPage(page);
    await providers.openConnectModal();
    await providers.fillGoogleDrive(JSON.stringify(badConfig), 'Provider Loi Test');
    await providers.clickTest();

    // Phải có thông báo lỗi
    await expect(page.getByText(/lỗi|thất bại|error|invalid/i)).toBeVisible({ timeout: 15_000 });

    // Số provider không được tăng (không submit khi test thất bại)
    const after = await page.request.get('/api/admin/storage-providers', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const afterData = await after.json();
    const afterList = Array.isArray(afterData) ? afterData : (afterData?.items ?? afterData?.data ?? []);
    expect(afterList.length).toBe(countBefore);
  });
});
