import { Page, expect } from '@playwright/test';

export class DepartmentSetupPage {
  constructor(private page: Page) {}

  async expectSetupScreen() {
    await expect(this.page.getByRole('heading', { name: 'Thiết lập Phòng ban của bạn' })).toBeVisible({ timeout: 15_000 });
  }

  async setup(name: string, code: string, retentionDays: number = 30) {
    await this.expectSetupScreen();

    const nameInput = this.page.getByPlaceholder('VD: Phòng Công nghệ Thông tin, Ban Kế toán...');
    const codeInput = this.page.getByPlaceholder('VD: DEPT_IT, ACC, HR...');

    await nameInput.fill(name);
    await codeInput.fill(code);

    const retentionInput = this.page.locator('input[type="number"]').first();
    await retentionInput.fill(retentionDays.toString());

    await this.page.getByRole('button', { name: 'Hoàn tất & Kích hoạt Cổng Quản trị' }).click();

    // Chờ điều hướng vào Hub/Dashboard của phòng ban
    await expect(this.page.getByText('Thiết lập Phòng ban của bạn')).not.toBeVisible({ timeout: 15_000 });
  }
}

