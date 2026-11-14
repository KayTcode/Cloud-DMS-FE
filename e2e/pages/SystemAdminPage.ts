import { Page, expect } from '@playwright/test';

export class SystemAdminPage {
  constructor(private page: Page) {}

  async navigateToTenants() {
    // Click card "Quản lý Tổ chức & Tài khoản" trong AdminHubView (là <div>, không phải <button>)
    await this.page.getByText('Quản lý Tổ chức & Tài khoản').click({ timeout: 15_000 });
    await expect(this.page.getByRole('button', { name: 'Tạo Tổ chức mới' })).toBeVisible({ timeout: 15_000 });
  }

  async createTenantWithAdmin(params: {
    tenantName: string;
    firstName: string;
    lastName: string;
    email: string;
    quotaGb?: number;
  }) {
    await this.page.getByRole('button', { name: 'Tạo Tổ chức mới' }).click();

    // Chờ Modal hiện ra
    await expect(this.page.getByRole('heading', { name: /Khởi tạo Tổ chức/i })).toBeVisible();

    await this.page.locator('input[placeholder*="Acme Corp"], input[placeholder*="Công ty TNHH"]').first().fill(params.tenantName);

    // Scope vào modal để tránh match selector ngoài modal
    const modal = this.page.locator('[role="dialog"], .fixed.inset-0').last();

    // Chờ provider options load (lazy fetch trong useEffect khi modal mở)
    const providerSelect = modal.locator('select').first();
    try {
      // Chờ ít nhất 2 option xuất hiện trong select (placeholder + 1 provider)
      await expect(providerSelect.locator('option').nth(1)).toBeAttached({ timeout: 8000 });
    } catch { /* nếu không load được provider, bỏ qua */ }

    const optionCount = await providerSelect.locator('option').count();
    if (optionCount > 1) {
      await providerSelect.selectOption({ index: 1 });
    }

    if (params.quotaGb) {
      const quotaInput = modal.locator('input[placeholder="50"]');
      if (await quotaInput.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await quotaInput.fill(params.quotaGb.toString());
      }
    }

    await this.page.getByPlaceholder('Văn A').fill(params.firstName);
    await this.page.getByPlaceholder('Nguyễn').fill(params.lastName);
    await this.page.getByPlaceholder('admin@tenant.com').fill(params.email);

    await this.page.getByRole('button', { name: 'Khởi tạo Tenant & Gửi thư mời' }).click();

    // Chờ modal đóng
    await expect(this.page.getByRole('heading', { name: /Khởi tạo Tổ chức/i })).not.toBeVisible({ timeout: 20_000 });
  }

  async logout() {
    const logoutBtn = this.page.getByRole('button', { name: /Đăng xuất/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      // Menu user profile
      const userMenu = this.page.locator('[data-testid="user-menu"], .rounded-full').first();
      await userMenu.click();
      await this.page.getByText('Đăng xuất').click();
    }
    await expect(this.page.getByRole('heading', { name: 'Đăng nhập tài khoản' })).toBeVisible({ timeout: 15_000 });
  }
}

