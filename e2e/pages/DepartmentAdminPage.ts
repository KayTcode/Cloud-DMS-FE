import { Page, expect } from '@playwright/test';

export class DepartmentAdminPage {
  constructor(private page: Page) {}

  async navigateToStaff() {
    await this.page.getByRole('button', { name: /Nhân sự|Thành viên|staff/i }).click();
    await expect(this.page.getByRole('button', { name: 'Thêm nhân viên' })).toBeVisible({ timeout: 15_000 });
  }

  async inviteEmployee(params: {
    firstName: string;
    lastName: string;
    email: string;
    quotaGb: number;
  }) {
    await this.page.getByRole('button', { name: 'Thêm nhân viên' }).click();

    // Chờ AddMemberModal
    await expect(this.page.getByRole('heading', { name: /Thêm nhân viên mới/i })).toBeVisible();

    await this.page.getByPlaceholder('Văn A').fill(params.firstName);
    await this.page.getByPlaceholder('Nguyễn').fill(params.lastName);
    await this.page.getByPlaceholder('nhanvien@congty.com').fill(params.email);

    const quotaInput = this.page.locator('input[type="number"]').first();
    await quotaInput.fill(params.quotaGb.toString());

    await this.page.getByRole('button', { name: 'Gửi thư mời nhân viên' }).click();

    // Chờ modal đóng
    await expect(this.page.getByRole('heading', { name: /Thêm nhân viên mới/i })).not.toBeVisible({ timeout: 15_000 });
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

