import { Page, expect } from '@playwright/test';

export class SystemAdminPage {
  constructor(private page: Page) {}

  async navigateToTenants() {
    // Click menu Tổ chức / Tenants
    await this.page.getByRole('button', { name: /Tổ chức/i }).click();
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
    await expect(this.page.getByRole('heading', { name: 'Khởi tạo Tổ chức Doanh nghiệp' })).toBeVisible();

    await this.page.locator('input[placeholder*="Công ty TNHH"]').fill(params.tenantName);

    // Chọn Storage Provider nếu có
    const providerSelect = this.page.locator('select').first();
    const optionCount = await providerSelect.locator('option').count();
    if (optionCount > 1) {
      await providerSelect.selectOption({ index: 1 });
    }

    if (params.quotaGb) {
      const quotaInput = this.page.locator('input[placeholder="50"]');
      if (await quotaInput.isVisible()) {
        await quotaInput.fill(params.quotaGb.toString());
      }
    }

    await this.page.getByPlaceholder('Văn A').fill(params.firstName);
    await this.page.getByPlaceholder('Nguyễn').fill(params.lastName);
    await this.page.getByPlaceholder('admin@tenant.com').fill(params.email);

    await this.page.getByRole('button', { name: 'Khởi tạo Tenant & Gửi thư mời' }).click();

    // Chờ modal đóng
    await expect(this.page.getByRole('heading', { name: 'Khởi tạo Tổ chức Doanh nghiệp' })).not.toBeVisible({ timeout: 20_000 });
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

