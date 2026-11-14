import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { StorageProviderPage } from '../pages/StorageProviderPage';

// Dung lượng thật tài khoản Drive 1 (giá trị xác nhận bằng drive-state.mjs)
const DRIVE1_LIMIT = 16106127360;

test.describe('Nghiệm thu kịch bản 4 bước', () => {
  test('Bước 1: trang Storage Providers hiển thị dung lượng và thêm được storage 2', async ({ page }) => {
    const login = new LoginPage(page);
    const providers = new StorageProviderPage(page);

    await login.goto();
    await login.login('kayt1206.js@gmail.com', process.env.SYSADMIN_PASSWORD!);

    // Điều hướng vào trang Storage Providers (click card "Nhà cung cấp Lưu trữ" trên AdminHub)
    await page.getByText('Nhà cung cấp Lưu trữ (Storage Pools)').click({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Kết Nối Cloud Provider' })).toBeVisible({ timeout: 15_000 });

    // Xác nhận provider 1 hiển thị đúng dung lượng thật
    await expect(page.getByText('Nghiem Thu GDrive OAuth').first()).toBeVisible({ timeout: 10_000 });
    const shown = await providers.readListedCapacity('Nghiem Thu GDrive OAuth');
    expect(shown.total).toBe(DRIVE1_LIMIT);

    // Thêm storage 2 nếu chưa có
    const storage2AlreadyExists = await page.getByRole('heading', { name: 'Storage 2' }).isVisible();
    if (!storage2AlreadyExists) {
      await providers.openConnectModalFromPage();
      await providers.fillGoogleDrive(process.env.GDRIVE_OAUTH2_CONFIG_JSON!, 'Storage 2');
      await providers.clickTest();
      await providers.submit();
    }

    // Xác nhận storage 2 xuất hiện trong danh sách
    await expect(page.getByRole('heading', { name: 'Storage 2' })).toBeVisible({ timeout: 15_000 });

    // Lấy STORAGE2_PROVIDER_ID qua API
    const apiResp = await page.request.get('https://localhost:8443/api/admin/storage-providers');
    if (apiResp.ok()) {
      const list = await apiResp.json() as Array<{ id: string; name: string; isActive: boolean }>;
      const storage2 = list.find(p => p.name === 'Storage 2' && p.isActive);
      if (storage2) console.log(`STORAGE2_PROVIDER_ID=${storage2.id}`);
    }
  });
});
