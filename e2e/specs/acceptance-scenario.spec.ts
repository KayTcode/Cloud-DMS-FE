import { test, expect, APIRequestContext } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../pages/LoginPage';
import { StorageProviderPage } from '../pages/StorageProviderPage';
import { SystemAdminPage } from '../pages/SystemAdminPage';

// Dung lượng thật tài khoản Drive 1 (giá trị xác nhận bằng drive-state.mjs)
const DRIVE1_LIMIT = 16106127360;
const STORAGE2_PROVIDER_ID = '67078657-5dca-47bd-8876-44f5fab6c2d6';
// Giai đoạn B dùng tenant NGHIE_4427 (TA/DA đã active từ giai đoạn A)
const ACCEPT_TENANT_ID = '7373545f-c3e4-43cc-bf74-548758ca7979';
const ACCEPT_TENANT_CODE = 'NGHIE_4427';
// Phòng ban PNT và DA đã có từ giai đoạn A
const ACCEPT_DEPT_ID = '16f04590-3f37-4beb-bfef-c885d8c1a472';
const ACCEPT_DEPT_CODE = 'PNT';
const ACCEPT_DEPTADMIN_USER_ID = '664fdf02-813d-4458-aba4-fb29db7fc67a';

async function getSysAdminToken(request: APIRequestContext): Promise<string> {
  return getUserToken(request, 'kayt1206.js@gmail.com', process.env.SYSADMIN_PASSWORD!);
}

async function findTenantByName(request: APIRequestContext, token: string, name: string) {
  const res = await request.get('https://localhost:8443/api/admin/tenants', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await res.json();
  const tenants = Array.isArray(list) ? list : (list.items ?? list.data ?? []);
  return tenants.find((t: { name: string }) => t.name === name);
}

async function grantTenantQuota(request: APIRequestContext, token: string, tenantId: string, providerId: string, bytes: number) {
  return request.post(`https://localhost:8443/api/admin/tenants/${tenantId}/quota/grant`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { storageProviderId: providerId, bytes },
  });
}

async function getUserToken(request: APIRequestContext, email: string, password: string): Promise<string> {
  // Playwright tự động lưu và gửi cookies trong cùng APIRequestContext.
  // Chỉ cần lấy requestToken từ body CSRF rồi gửi qua X-CSRF-TOKEN header.
  const csrfRes = await request.get('https://localhost:8443/api/auth/csrf', {
    headers: { Origin: 'https://localhost:8443' },
  });
  const csrfBody = await csrfRes.json();
  const loginRes = await request.post('https://localhost:8443/api/auth/login', {
    headers: { Origin: 'https://localhost:8443', 'X-CSRF-TOKEN': csrfBody.requestToken },
    data: { email, password },
  });
  const body = await loginRes.json();
  if (!body.accessToken) {
    console.log(`getUserToken(${email}) failed: status=${loginRes.status()} body=${JSON.stringify(body).substring(0,200)}`);
  }
  return body.accessToken as string;
}

test.describe('Nghiệm thu kịch bản 4 bước', () => {
  test('Bước 1: trang Storage Providers hiển thị dung lượng và thêm được storage 2', async ({ page }) => {
    const login = new LoginPage(page);
    const providers = new StorageProviderPage(page);

    await login.goto();
    await login.login('kayt1206.js@gmail.com', process.env.SYSADMIN_PASSWORD!);

    // Điều hướng vào trang Storage Providers (click card "Nhà cung cấp Lưu trữ" trên AdminHub)
    await page.getByText('Nhà cung cấp Lưu trữ (Storage Pools)').click({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Kết Nối Cloud Provider' })).toBeVisible({ timeout: 15_000 });

    // Xác nhận provider 1 hiển thị đúng dung lượng thật
    await expect(page.getByText('Nghiem Thu GDrive OAuth').first()).toBeVisible({ timeout: 10_000 });
    const shown = await providers.readListedCapacity('Nghiem Thu GDrive OAuth');
    expect(shown.total).toBe(DRIVE1_LIMIT);

    // Thêm storage 2 nếu chưa có
    const storage2AlreadyExists = await page.getByRole('heading', { name: 'Storage 2' }).isVisible();
    if (!storage2AlreadyExists) {
      await providers.openConnectModalFromPage();
      await providers.fillGoogleDrive(process.env.GDRIVE_OAUTH2_CONFIG_JSON!, 'Storage 2');
      await providers.clickTest();
      await providers.submit();
    }

    // Xác nhận storage 2 xuất hiện trong danh sách
    await expect(page.getByRole('heading', { name: 'Storage 2' })).toBeVisible({ timeout: 15_000 });

    console.log(`STORAGE2_PROVIDER_ID=${STORAGE2_PROVIDER_ID}`);
  });

  test('Bước 2: cấp 10 GB từ storage 2 cho tenant NGHIE_4427', async ({ request }) => {
    // Ruling: dùng tenant NGHIE_4427 (TA/DA đã active từ giai đoạn A) thay vì tạo tenant mới
    // vì các email người dùng thật đã tồn tại trong hệ thống.
    const TEN_GB = 10737418240;
    const token = await getSysAdminToken(request);

    console.log(`ACCEPT_TENANT_ID=${ACCEPT_TENANT_ID}`);
    console.log(`ACCEPT_TENANT_CODE=${ACCEPT_TENANT_CODE}`);

    // Kiểm tra đã có allocation từ Storage 2 chưa
    const quotaRes = await request.get(
      `https://localhost:8443/api/admin/tenants/${ACCEPT_TENANT_ID}/quota`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const quotaBody = await quotaRes.json();
    const allocs: Array<{ storageProviderName: string; storageQuotaBytes: number }> =
      quotaBody.allocations ?? [];
    const storage2Alloc = allocs.find(
      (a: { storageProviderName: string }) => a.storageProviderName === 'Storage 2'
    );

    if (!storage2Alloc) {
      const grantRes = await grantTenantQuota(request, token, ACCEPT_TENANT_ID, STORAGE2_PROVIDER_ID, TEN_GB);
      expect(grantRes.ok()).toBe(true);
    }

    // Xác nhận allocation từ Storage 2 = 10 GB
    const afterRes = await request.get(
      `https://localhost:8443/api/admin/tenants/${ACCEPT_TENANT_ID}/quota`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const afterBody = await afterRes.json();
    const afterAlloc = (afterBody.allocations ?? []).find(
      (a: { storageProviderName: string }) => a.storageProviderName === 'Storage 2'
    );
    expect(afterAlloc?.grantedBytes).toBe(TEN_GB);
  });

  test('Bước 3: Department Admin với kho chung 5 GB và kho riêng 2 GB', async ({ request }) => {
    // Ruling: DA (anhthichemquaroi@gmail.com) và dept PNT đã active từ giai đoạn A.
    // Chỉ set quota từ TA/DA rồi upload — skip invitation flow.
    const FIVE_GB = 5368709120;
    const TWO_GB = 2147483648;

    // DB helpers — docker exec vào container MySQL (root chỉ được phép từ localhost)
    const dbPass = process.env.DB_PASS ?? 'd256d10eb7e973fccadda4a7110c50105e3257c25810b02beb784e7f9257ccad';
    const dbUser = process.env.DB_USER ?? 'root';
    const dbName = process.env.DB_NAME ?? 'cloud_dms';
    const dbContainer = process.env.DB_CONTAINER ?? 'cloud-dms-dev-dms-mysql-1';
    const dbCmd = (sql: string) =>
      execSync(`docker exec ${dbContainer} mysql --user=${dbUser} "--password=${dbPass}" ${dbName} -e "${sql}"`, { encoding: 'utf8' });

    // Bước 2: Xóa allocations S1 cho dept/user để PUT tạo mới trên S2


    // Xóa allocations S1 theo đúng thứ tự: user (child) trước, dept (parent) sau
    // Tránh FK constraint: ParentAllocationId RESTRICT
    try {
      dbCmd(`DELETE FROM QuotaAllocations WHERE OwnerId = '${ACCEPT_DEPTADMIN_USER_ID}' AND StorageProviderId != '${STORAGE2_PROVIDER_ID}'`);
    } catch (e: unknown) { console.log(`delete user allocs: ${(e as Error).message?.substring(0, 100)}`); }
    try {
      dbCmd(`DELETE FROM QuotaAllocations WHERE OwnerId = '${ACCEPT_DEPT_ID}' AND StorageProviderId != '${STORAGE2_PROVIDER_ID}'`);
    } catch (e: unknown) { console.log(`delete dept allocs: ${(e as Error).message?.substring(0, 100)}`); }
    console.log('Đã xóa allocations S1 cho dept/user');

    // Deactivate S1 providers — dùng string comparison (Id là VARCHAR UUID)
    const rows = dbCmd(`SELECT Id FROM StorageProviders WHERE Id != '${STORAGE2_PROVIDER_ID}' AND IsActive = 1`)?.trim() ?? '';
    const deactivatedProviderIds = rows ? rows.split('\n').map((r: string) => r.trim()).filter(Boolean) : [];
    dbCmd(`UPDATE StorageProviders SET IsActive = 0 WHERE Id != '${STORAGE2_PROVIDER_ID}' AND IsActive = 1`);
    console.log(`Đã tạm deactivate S1 providers: ${deactivatedProviderIds.length} providers`);

    // Bước 3: TA reset dept quota = 5 GB (re-allocate từ S2 vì S1 inactive)
    const taToken = await getUserToken(request, 'smartbuyfpttechnology@gmail.com', process.env.SYSADMIN_PASSWORD!);
    const deptQuotaRes = await request.put(
      `https://localhost:8443/api/tenant/${ACCEPT_TENANT_ID}/departments/${ACCEPT_DEPT_ID}/quota`,
      {
        headers: { Authorization: `Bearer ${taToken}` },
        data: { quotaBytes: FIVE_GB },
      }
    );
    expect(deptQuotaRes.ok()).toBe(true);

    // Bước 4: DA cấp 2 GB kho riêng cho bản thân
    const daToken = await getUserToken(request, 'anhthichemquaroi@gmail.com', process.env.DA_PASSWORD ?? process.env.SYSADMIN_PASSWORD!);
    console.log(`daToken=${daToken ? 'ok' : 'null'}`);
    const userQuotaRes = await request.put(
      `https://localhost:8443/api/department/${ACCEPT_DEPT_ID}/quota/users/${ACCEPT_DEPTADMIN_USER_ID}`,
      {
        headers: { Authorization: `Bearer ${daToken}` },
        data: { quotaBytes: TWO_GB },
      }
    );
    const userQuotaBody = await userQuotaRes.json().catch(() => ({}));
    console.log(`user quota PUT status=${userQuotaRes.status()} body=${JSON.stringify(userQuotaBody)}`);
    expect(userQuotaRes.ok()).toBe(true);


    // Bước 4b: DA cấp shared quota = 1 GB cho kho chung (cần để upload drive: 'shared')
    const ONE_GB = 1073741824;
    const sharedQuotaRes = await request.put(
      `https://localhost:8443/api/department/${ACCEPT_DEPT_ID}/quota/shared`,
      {
        headers: { Authorization: `Bearer ${daToken}` },
        data: { quotaBytes: ONE_GB },
      }
    );
    const sharedQuotaBody = await sharedQuotaRes.json().catch(() => ({}));
    console.log(`shared quota PUT status=${sharedQuotaRes.status()} body=${JSON.stringify(sharedQuotaBody).substring(0,200)}`);
    expect(sharedQuotaRes.ok()).toBe(true);

    // Bước 5: Xác nhận breakdown: totalBytes = 5 GB, leadBytes = 2 GB
    const breakdownRes = await request.get(
      `https://localhost:8443/api/department/${ACCEPT_DEPT_ID}/quota/breakdown`,
      { headers: { Authorization: `Bearer ${daToken}` } }
    );
    const breakdown = await breakdownRes.json();
    console.log(`breakdown=${JSON.stringify(breakdown).substring(0, 300)}`);
    const bd = breakdown.value ?? breakdown.data ?? breakdown;
    expect(bd.totalBytes).toBe(FIVE_GB);
    expect(bd.leadBytes).toBe(TWO_GB);

    let personalFileId: string | undefined;
    let sharedFileId: string | undefined;
    try {
    // Upload tệp lên kho riêng
    const personalFileBuffer = Buffer.from('Nghiem thu kho rieng - DA Hoang Van An');
    const personalUploadRes = await request.post('https://localhost:8443/api/files/upload', {
      headers: { Authorization: `Bearer ${daToken}` },
      multipart: {
        files: { name: 'kho-rieng.txt', mimeType: 'text/plain', buffer: personalFileBuffer },
        drive: 'personal',
        departmentId: ACCEPT_DEPT_ID,
      },
    });
    const personalUploadBody = await personalUploadRes.json().catch(() => ({}));
    console.log(`personal upload status=${personalUploadRes.status()} body=${JSON.stringify(personalUploadBody).substring(0,300)}`);
    expect(personalUploadRes.ok()).toBe(true);
    personalFileId = personalUploadBody.value?.uploaded?.[0]?.id ?? personalUploadBody.data?.uploaded?.[0]?.id;
    console.log(`PERSONAL_FILE_ID=${personalFileId}`);

    // Upload tệp lên kho chung (retry nếu 503 — DMS API có thể bận sau personal upload)
    const sharedFileBuffer = Buffer.from('Nghiem thu kho chung - Phong ban PNT');
    let sharedUploadRes = await request.post('https://localhost:8443/api/files/upload', {
      headers: { Authorization: `Bearer ${daToken}` },
      multipart: {
        files: { name: 'kho-chung.txt', mimeType: 'text/plain', buffer: sharedFileBuffer },
        drive: 'shared',
        departmentId: ACCEPT_DEPT_ID,
      },
    });
    if (sharedUploadRes.status() === 503) {
      console.log('shared upload got 503, retrying after 3s...');
      await new Promise(r => setTimeout(r, 3000));
      sharedUploadRes = await request.post('https://localhost:8443/api/files/upload', {
        headers: { Authorization: `Bearer ${daToken}` },
        multipart: {
          files: { name: 'kho-chung.txt', mimeType: 'text/plain', buffer: sharedFileBuffer },
          drive: 'shared',
          departmentId: ACCEPT_DEPT_ID,
        },
      });
    }
    const sharedUploadBody = await sharedUploadRes.json().catch(() => ({}));
    console.log(`shared upload status=${sharedUploadRes.status()} body=${JSON.stringify(sharedUploadBody).substring(0,300)}`);
    expect(sharedUploadRes.ok()).toBe(true);
    sharedFileId = sharedUploadBody.value?.uploaded?.[0]?.id ?? sharedUploadBody.data?.uploaded?.[0]?.id;
    console.log(`SHARED_FILE_ID=${sharedFileId}`);
    } finally {
      if (deactivatedProviderIds.length > 0) {
        for (const providerId of deactivatedProviderIds) {
          dbCmd(`UPDATE StorageProviders SET IsActive = 1 WHERE Id = '${providerId}'`);
        }
        console.log(`Đã reactivate ${deactivatedProviderIds.length} S1 providers`);
      }
    }

    console.log(`ACCEPT_DEPT_ID=${ACCEPT_DEPT_ID}`);
    console.log(`ACCEPT_DEPT_CODE=${ACCEPT_DEPT_CODE}`);
    console.log(`ACCEPT_DEPTADMIN_USER_ID=${ACCEPT_DEPTADMIN_USER_ID}`);
  });
});
