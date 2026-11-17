import { Page, expect } from '@playwright/test';

export class StorageProviderPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.getByText('Nhà cung cấp Lưu trữ (Storage Pools)').click({ timeout: 15_000 });
    await expect(this.page.getByRole('button', { name: 'Kết Nối Cloud Provider' })).toBeVisible({ timeout: 15_000 });
  }

  async openConnectModal() {
    // Điều hướng từ AdminHubView: thẻ là <div onClick>, không phải <button>
    await this.navigate();
    await this.page.getByRole('button', { name: 'Kết Nối Cloud Provider' }).click();
    await expect(this.page.getByText('Kết Nối Cloud Storage Provider')).toBeVisible({ timeout: 10_000 });
  }

  async openConnectModalFromPage() {
    await this.page.getByRole('button', { name: 'Kết Nối Cloud Provider' }).click();
    await expect(this.page.getByText('Kết Nối Cloud Storage Provider')).toBeVisible({ timeout: 10_000 });
  }

  async fillGoogleDrive(configJson: string, name: string) {
    // Điền tên provider
    await this.page.locator('input[placeholder="VD: Google Drive - Pool Khoa CNTT"]').fill(name);
    // Điền JSON credentials vào textarea
    await this.page.locator('textarea[placeholder*="Dán nội dung"]').fill(configJson);
  }

  async clickTest() {
    await this.page.getByRole('button', { name: 'Kiểm tra kết nối' }).click();
    // Chờ kết quả kiểm tra (thành công hoặc thất bại) — dùng first() tránh strict mode
    await expect(
      this.page.getByText(/Tổng dung lượng|lỗi|thất bại|error|invalid/i).first()
    ).toBeVisible({ timeout: 30_000 });
  }

  async readReportedCapacity(): Promise<{ total: number; used: number }> {
    // Scope vào trong modal để không match với provider list cards bên ngoài
    const modal = this.page.locator('[role="dialog"], .fixed.inset-0').last();
    const totalText = await modal.getByText(/Tổng dung lượng/).first().textContent();
    const usedText = await modal.getByText(/Đã dùng:/).first().textContent();

    const totalGB = parseFloat(totalText?.match(/[\d.]+/)?.[0] ?? '0');
    const usedGB = parseFloat(usedText?.match(/[\d.]+/)?.[0] ?? '0');

    return {
      total: Math.round(totalGB * 1024 * 1024 * 1024),
      used: Math.round(usedGB * 1024 * 1024 * 1024),
    };
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Lưu & Kích Hoạt' }).click();
    // Chờ modal đóng
    await expect(this.page.getByText('Kết Nối Cloud Storage Provider')).not.toBeVisible({ timeout: 20_000 });
  }

  async readListedCapacity(name: string): Promise<{ total: number; used: number }> {
    const card = this.page.getByText(name).first().locator('../..').locator('..');
    const text = await card.textContent();
    // UI format: "Tổng dung lượng thật: 15.0 GB" and "Đã sử dụng: 3.9 GB / 15.0 GB (26%)"
    const totalMatch = text?.match(/Tổng dung lượng thật[:\s]+([\d.]+)\s*GB/);
    const usedMatch = text?.match(/Đã sử dụng[:\s]+([\d.]+)\s*GB/);
    const toBytes = (gb: string) => Math.round(parseFloat(gb) * 1024 * 1024 * 1024);
    return {
      total: totalMatch ? toBytes(totalMatch[1]) : 0,
      used: usedMatch ? toBytes(usedMatch[1]) : 0,
    };
  }
}
