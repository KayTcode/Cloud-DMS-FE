import { Page, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

export class DrivePage {
  constructor(private page: Page) {}

  async uploadFile(fileName: string, content: string = 'Nội dung báo cáo demo Cloud-DMS') {
    // Tạo file tạm nếu chưa có
    const tempFilePath = path.join(process.cwd(), 'e2e', 'temp', fileName);
    fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
    fs.writeFileSync(tempFilePath, content, 'utf-8');

    // Nạp file vào hidden file input
    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tempFilePath);

    // Chờ tệp xuất hiện trong danh sách Drive
    await expect(this.page.getByText(fileName)).toBeVisible({ timeout: 20_000 });
  }

  async openShareModal(fileName: string) {
    // Tìm hàng hoặc card chứa tệp và mở menu chia sẻ
    const fileRow = this.page.locator(`text=${fileName}`).locator('xpath=ancestor::div[contains(@class, "group") or contains(@class, "flex")]').first();
    await fileRow.hover();

    const shareBtn = fileRow.locator('button[title*="Chia sẻ"], button:has-text("Chia sẻ")').first();
    if (await shareBtn.isVisible()) {
      await shareBtn.click();
    } else {
      // Click nút ba chấm
      const moreBtn = fileRow.locator('button:has(svg)').last();
      await moreBtn.click();
      await this.page.getByRole('button', { name: /Chia sẻ/i }).click();
    }

    await expect(this.page.getByRole('heading', { name: /Chia sẻ/i })).toBeVisible({ timeout: 10_000 });
  }

  async shareFile(email: string, role: 'Viewer' | 'Editor' = 'Viewer') {
    const emailInput = this.page.locator('input[placeholder*="email"], input[type="email"]').last();
    await emailInput.fill(email);

    const roleSelect = this.page.locator('select').last();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption(role);
    }

    await this.page.getByRole('button', { name: 'Chia sẻ' }).click();
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

