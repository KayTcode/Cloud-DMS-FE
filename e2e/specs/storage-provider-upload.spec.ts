import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { getInvitationLink } from '../helpers/invitationPrompt';
import { LoginPage } from '../pages/LoginPage';
import { AcceptInvitationPage } from '../pages/AcceptInvitationPage';
import { TenantAdminPage } from '../pages/TenantAdminPage';
import { DepartmentAdminPage } from '../pages/DepartmentAdminPage';
import { DepartmentSetupPage } from '../pages/DepartmentSetupPage';
import { DrivePage } from '../pages/DrivePage';
import { Page } from '@playwright/test';

const TENANT_ID = '7373545f-c3e4-43cc-bf74-548758ca7979';
const TA_EMAIL = 'smartbuyfpttechnology@gmail.com';
const TA_PASSWORD = 'Thanhedo2002@@';
const DA_EMAIL = 'anhthichemquaroi@gmail.com';
const DA_PASSWORD = 'Thanhedo2002@@';
const FILE_NAME = 'nghiem-thu.txt';
const FILE_CONTENT = 'Nghiem thu Cloud-DMS Google Drive upload 2026-11-14';

function dbQuery(sql: string): string {
  const dbPass = process.env.DB_PASS;
  if (!dbPass) throw new Error('Thiếu DB_PASS');
  return execSync(
    `mysql --host=127.0.0.1 --port=3307 --user=dms_service "--password=${dbPass}" cloud_dms --batch --skip-column-names -e "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8', timeout: 10000 }
  ).trim();
}

async function uploadAndGetFileEntryId(page: Page, fileName: string): Promise<string> {
  const drive = new DrivePage(page);
  await drive.uploadFile(fileName, FILE_CONTENT);

  // Truy vấn FileEntry vừa tạo
  const row = dbQuery(
    `SELECT Id FROM FileEntries ` +
    `WHERE TenantId = '${TENANT_ID}' AND Name = '${fileName}' ` +
    `ORDER BY CreatedAt DESC LIMIT 1;`
  );
  return row.trim();
}

test.describe('Storage Provider Upload — Google Drive', () => {
  test('Tải tệp lên thật trên Google Drive', async ({ page }) => {
    // ── Bước 1: Tenant Admin kích hoạt lời mời ───────────────────────────
    const tenantAdminLink = await getInvitationLink('Tenant Admin', 'TENANT_ADMIN_INVITE_LINK');
    const acceptTA = new AcceptInvitationPage(page);
    await acceptTA.goto(tenantAdminLink);
    await acceptTA.accept(TA_PASSWORD);

    // ── Bước 2: Đăng nhập với tư cách Tenant Admin ───────────────────────
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TA_EMAIL, TA_PASSWORD);

    // ── Bước 3: Mời Department Admin với ví 2 GiB ────────────────────────
    const taPage = new TenantAdminPage(page);
    await taPage.navigateToDepartments();
    await taPage.inviteDepartmentAdmin({
      fullName: 'Nghiem Thu DA',
      email: DA_EMAIL,
      quotaGb: 2,
    });
    await taPage.logout();

    // ── Bước 4: Department Admin kích hoạt lời mời ───────────────────────
    const deptAdminLink = await getInvitationLink('Department Admin', 'DEPT_ADMIN_INVITE_LINK');
    const acceptDA = new AcceptInvitationPage(page);
    await acceptDA.goto(deptAdminLink);
    await acceptDA.accept(DA_PASSWORD);

    // ── Bước 5: Department Admin thiết lập phòng ban + ví cá nhân 1 GiB ─
    const setupPage = new DepartmentSetupPage(page);
    await setupPage.setup('Phong Nghiem Thu', 'PNT', 30);

    // ── Bước 6: Tải lên tệp nghiệm thu ───────────────────────────────────
    const fileId = await uploadAndGetFileEntryId(page, FILE_NAME);
    expect(fileId, 'FILE_ENTRY_ID phải có giá trị sau khi tải lên').toBeTruthy();
    console.log(`FILE_ENTRY_ID=${fileId}`);
  });
});
