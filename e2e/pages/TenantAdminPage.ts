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

  async openDepartmentDetail(deptName: string) {
    await this.page.getByText(deptName).first().click();
  }

  async expectInterimManagementBanner() {
    await expect(this.page.getByText('Đang tạm quản lý')).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByText('Phòng ban chưa có Trưởng phòng. Bạn đang tạm thời quản lý phòng này.')).toBeVisible();
  }

  async addEmployeeInInterim(params: { email: string; firstName: string; lastName: string; quotaGb?: number }) {
    await this.page.getByRole('button', { name: /Nhân viên & Quota/i }).click();
    await this.page.getByRole('button', { name: /Thêm nhân viên mới/i }).click();

    await this.page.locator('input[type="email"]').fill(params.email);
    await this.page.locator('input[placeholder*="Văn"]').first().fill(params.firstName);
    await this.page.locator('input[placeholder*="Nguyễn"]').first().fill(params.lastName);
    if (params.quotaGb) {
      const quotaInput = this.page.locator('input[type="number"]').first();
      await quotaInput.fill(params.quotaGb.toString());
    }
    await this.page.getByRole('button', { name: /Tạo nhân viên|Lưu/i }).click();
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

