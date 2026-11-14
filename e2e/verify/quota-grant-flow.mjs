/**
 * Nghiệm thu cấp và điều chỉnh hạn mức tenant qua API.
 * Chạy: node e2e/verify/quota-grant-flow.mjs <tenantId> <providerId>
 *
 * Thực hiện 3 thao tác tuần tự và in:
 *   STEP <tên> <httpStatus> <quotaBytes>
 *
 * Env: SYSADMIN_PASSWORD — mật khẩu sysadmin
 */
import https from 'https';

// providerId mặc định là f3816d26 (provider mà tenant 7373545f thực sự dùng)
const [tenantId, providerId = 'f3816d26-84a8-4b10-8987-64f89a3faaca'] = process.argv.slice(2);
if (!tenantId || !providerId) {
  console.error('Usage: node quota-grant-flow.mjs <tenantId> <providerId>');
  process.exit(1);
}

const SYSADMIN_EMAIL = 'sysadmin@local.com';
const SYSADMIN_PASSWORD = process.env.SYSADMIN_PASSWORD;
if (!SYSADMIN_PASSWORD) {
  console.error('Thiếu SYSADMIN_PASSWORD');
  process.exit(1);
}

// Kong gateway dùng self-signed cert
const agent = new https.Agent({ rejectUnauthorized: false });

let cookieJar = '';

function req(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://localhost:8443',
        'Referer': 'https://localhost:8443/',
        ...(cookieJar ? { Cookie: cookieJar } : {}),
        ...(opts.headers || {}),
      },
      agent,
    };
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch { /* */ }
        // Cập nhật cookie jar từ Set-Cookie
        const setCookies = res.headers['set-cookie'] || [];
        for (const c of setCookies) {
          const kv = c.split(';')[0];
          if (!cookieJar.includes(kv.split('=')[0])) {
            cookieJar = cookieJar ? `${cookieJar}; ${kv}` : kv;
          }
        }
        resolve({ status: res.statusCode, json, text: body, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (opts.body) {
      const bodyStr = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
      r.write(bodyStr);
    }
    r.end();
  });
}

const BASE = 'https://localhost:8443';

// 0. GET /api/auth/csrf để lấy CSRF token + cookie
const csrfRes = await req(`${BASE}/api/auth/csrf`, {});
if (csrfRes.status !== 200 || !csrfRes.json?.requestToken) {
  console.error('Lấy CSRF token thất bại:', csrfRes.text);
  process.exit(1);
}
const csrfToken = csrfRes.json.requestToken;

// 1. Login với CSRF token
const loginRes = await req(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'X-CSRF-TOKEN': csrfToken },
  body: { email: SYSADMIN_EMAIL, password: SYSADMIN_PASSWORD },
});
if (loginRes.status !== 200 || !loginRes.json?.accessToken) {
  console.error('Login thất bại:', loginRes.text);
  process.exit(1);
}
const token = loginRes.json.accessToken;
const auth = { Authorization: `Bearer ${token}` };

// Helper gọi API và in STEP
async function step(name, method, path, body) {
  const res = await req(`${BASE}${path}`, { method, headers: auth, body });
  const quota = res.json?.storageQuotaBytes ?? res.json?.StorageQuotaBytes ?? '?';
  console.log(`STEP ${name} ${res.status} ${quota}`);
  if (res.status >= 400) {
    console.error(`  Content-Type: ${res.headers['content-type']}`);
    console.error(`  Body: "${res.text.substring(0, 500)}"`);
  }
  return res;
}

const QUOTA_BASE = `/api/admin/tenants/${tenantId}/quota`;
const FOUR_GIB = 4294967296;
const FIVE_GIB = 5368709120;

// Bước 0: Khôi phục quota về 5 GiB (từ 1 GiB hiện tại — do reduce nhầm ở session trước)
const currentRes = await req(`${BASE}${QUOTA_BASE}`, { headers: auth });
const currentQuota = currentRes.json?.storageQuotaBytes ?? currentRes.json?.StorageQuotaBytes ?? 0;
console.log(`CURRENT_QUOTA=${currentQuota}`);
if (currentQuota < FIVE_GIB) {
  const restoreBytes = FIVE_GIB - currentQuota;
  await step('restore→5GiB', 'POST', `${QUOTA_BASE}/grant`, { storageProviderId: providerId, bytes: restoreBytes });
}

// Step 1: Grant thêm 5 GiB (tổng thành 10 GiB)
await step('grant+5GiB', 'POST', `${QUOTA_BASE}/grant`, { storageProviderId: providerId, bytes: FIVE_GIB });

// Step 2: Điều chỉnh về 7 GiB (PUT giảm từ 10 → 7)
await step('adjust→7GiB', 'PUT', QUOTA_BASE, { storageProviderId: providerId, quotaBytes: 7 * 1024 * 1024 * 1024 });

// Step 3: Reduce 2 GiB (tổng còn 5 GiB)
await step('reduce-2GiB', 'POST', `${QUOTA_BASE}/reduce`, { bytes: 2 * 1024 * 1024 * 1024 });
