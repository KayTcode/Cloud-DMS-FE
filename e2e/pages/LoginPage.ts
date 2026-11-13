import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: 'Đăng nhập tài khoản' })).toBeVisible();
  }

  async login(email: string, pass: string) {
    const emailInput = this.page.locator('input[type="email"]');
    const passwordInput = this.page.locator('input[type="password"]');

    await emailInput.fill(email);
    await passwordInput.fill(pass);
    await this.page.getByRole('button', { name: 'Đăng nhập' }).click();
  }

  async expectErrorMessage(messageSnippet: string) {
    const alert = this.page.locator('.bg-rose-500\\/10');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(messageSnippet);
  }
}

