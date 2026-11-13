import { Page, expect } from '@playwright/test';

export class AcceptInvitationPage {
  constructor(private page: Page) {}

  async goto(inviteUrlOrToken: string) {
    if (inviteUrlOrToken.startsWith('http')) {
      await this.page.goto(inviteUrlOrToken);
    } else {
      await this.page.goto(`/accept-invitation?token=${inviteUrlOrToken}`);
    }
  }

  async accept(password: string) {
    // Chờ màn hình xác thực token sẵn sàng
    await expect(this.page.getByText('Thông tin kích hoạt')).toBeVisible({ timeout: 15_000 });

    const newPassInput = this.page.getByPlaceholder('Tối thiểu 12 ký tự');
    const confirmPassInput = this.page.getByPlaceholder('Nhập lại mật khẩu');

    await newPassInput.fill(password);
    await confirmPassInput.fill(password);

    await this.page.getByRole('button', { name: 'Đặt mật khẩu & Kích hoạt tài khoản' }).click();

    // Chờ thông báo thành công
    await expect(this.page.getByText('Kích hoạt tài khoản thành công!')).toBeVisible({ timeout: 15_000 });
  }
}

