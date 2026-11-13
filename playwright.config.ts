import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình Playwright E2E cho Cloud-DMS
 * Mọi yêu cầu đi qua Kong Gateway tại https://localhost:8443
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'https://localhost:8443',
    // Bắt buộc bỏ qua lỗi chứng chỉ SSL tự ký của Kong
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
});

