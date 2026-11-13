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

  async openTenantDetail(tenantName: string) {
    await this.page.getByText(tenantName).first().click();
    await expect(this.page.getByRole('heading', { name: /Chi tiết Tổ chức/i })).toBeVisible({ timeout: 10_000 });
  }

  async offboardTenantAdminInterim() {
    await this.page.getByRole('button', { name: /Vô hiệu hóa Quản trị viên/i }).click();
    await expect(this.page.getByRole('heading', { name: /Vô hiệu hóa Quản trị viên/i })).toBeVisible({ timeout: 5_000 });

    // Chọn kịch bản Tiếp quản Lâm thời (mặc định)
    const interimRadio = this.page.locator('input[value="InterimTakeover"]');
    if (await interimRadio.isVisible()) {
      await interimRadio.check();
    }

    await this.page.getByRole('button', { name: /Xác nhận Tiếp quản|Vô hiệu hóa/i }).click();
  }

  async expectInterimManagementBanner() {
    await expect(this.page.getByText('Chế độ Tiếp quản Lâm thời (Interim Management)')).toBeVisible({ timeout: 10_000 });
  }

  async assignVacantTenantAdmin(params: { email: string; firstName: string; lastName: string; phone?: string }) {
    await this.page.getByRole('button', { name: /Bổ nhiệm Quản trị viên mới/i }).click();
    await expect(this.page.getByRole('heading', { name: /Bổ nhiệm Quản trị viên/i })).toBeVisible({ timeout: 5_000 });

    await this.page.locator('input[type="email"]').fill(params.email);
    await this.page.locator('input[placeholder*="Văn"]').first().fill(params.firstName);
    await this.page.locator('input[placeholder*="Nguyễn"]').first().fill(params.lastName);
    if (params.phone) {
      await this.page.locator('input[type="tel"]').fill(params.phone);
    }

    await this.page.getByRole('button', { name: /Phát hành thư mời/i }).click();
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

