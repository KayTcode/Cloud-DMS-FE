import { Page, expect } from '@playwright/test';

export class TenantAdminPage {
  constructor(private page: Page) {}

  async navigateToDepartments() {
    await this.page.getByRole('button', { name: 'Cơ cấu Phòng ban' }).click();
    await expect(this.page.getByRole('button', { name: 'Thêm Trưởng phòng mới' })).toBeVisible({ timeout: 15_000 });
  }

  async inviteDepartmentAdmin(params: {
    fullName: string;
    email: string;
    quotaGb: number;
  }) {
    await this.page.getByRole('button', { name: 'Thêm Trưởng phòng mới' }).click();

    // Chờ màn hình CreateDepartmentUserView
    await expect(this.page.getByRole('heading', { name: /Mời Quản trị viên Phòng ban/i })).toBeVisible();

    await this.page.locator('input[placeholder*="Nguyễn Văn A"]').fill(params.fullName);
    await this.page.locator('input[type="email"]').fill(params.email);

    const quotaInput = this.page.locator('input[placeholder="10"], input[type="number"]').first();
    await quotaInput.fill(params.quotaGb.toString());

    await this.page.getByRole('button', { name: 'Gửi thư mời Department Admin' }).click();

    // Chờ quay về danh sách phòng ban
    await expect(this.page.getByRole('button', { name: 'Thêm Trưởng phòng mới' })).toBeVisible({ timeout: 20_000 });
  }

  async logout() {
    const logoutBtn = this.page.getByRole('button', { name: /Đăng xuất/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      const userMenu = this.page.locator('[data-testid="user-menu"], .rounded-full').first();
      await userMenu.click();
      await this.page.getByText('Đăng xuất').click();
    }
    await expect(this.page.getByRole('heading', { name: 'Đăng nhập tài khoản' })).toBeVisible({ timeout: 15_000 });
  }
}

