/**
 * Kiểm tra bất biến số storage provider đang active.
 * Chạy: node e2e/verify/env-providers.mjs
 * In: bảng mọi provider kèm IsActive, và dòng cuối ACTIVE_COUNT=<n>
 */
import https from 'https';

const ORIGIN = 'https://localhost:8443';
const EMAIL = 'sysadmin@local.com';
const PASS = process.env.SYSADMIN_PASSWORD || 'Thanhedo2002@@';
const agent = new https.Agent({ rejectUnauthorized: false });

function req(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      agent,
    };
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch { /* */ }
        // Extract cookies from set-cookie header for session forwarding
        const rawCookies = res.headers['set-cookie'] || [];
        const cookies = rawCookies.map((c) => c.split(';')[0]);
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json, text: body, cookies });
      });
    });
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}

// 1. Lấy CSRF token
const csrfRes = await req(`${ORIGIN}/api/auth/csrf`, {
  headers: { Origin: ORIGIN },
});
if (!csrfRes.ok) throw new Error(`CSRF thất bại: HTTP ${csrfRes.status}`);
const csrfToken = csrfRes.json.requestToken;
const csrfCookie = csrfRes.cookies.join('; ');

// 2. Đăng nhập (phải forward cookie từ CSRF để vượt anti-CSRF)
const loginRes = await req(`${ORIGIN}/api/auth/login`, {
  method: 'POST',
  headers: {
    Origin: ORIGIN,
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': csrfToken,
    Cookie: csrfCookie,
  },
  body: JSON.stringify({ email: EMAIL, password: PASS }),
});
if (!loginRes.ok) throw new Error(`Đăng nhập thất bại: HTTP ${loginRes.status} — ${loginRes.text}`);
const token = loginRes.json.accessToken;

// 3. Lấy danh sách provider
const provRes = await req(`${ORIGIN}/api/admin/storage-providers`, {
  headers: { Authorization: `Bearer ${token}`, Origin: ORIGIN },
});
if (!provRes.ok) throw new Error(`Lấy providers thất bại: HTTP ${provRes.status}`);

const providers = Array.isArray(provRes.json) ? provRes.json : (provRes.json?.items ?? provRes.json?.data ?? []);
console.log('Id\tName\tType\tIsActive\tTotalCapacityBytes');
let activeCount = 0;
for (const p of providers) {
  const active = p.isActive ?? p.IsActive ?? false;
  if (active) activeCount++;
  const total = p.totalCapacityBytes ?? p.TotalCapacityBytes ?? 0;
  const type = p.type ?? p.Type ?? '?';
  const name = p.name ?? p.Name ?? '?';
  const id = p.id ?? p.Id ?? '?';
  console.log(`${id}\t${name}\t${type}\t${active}\t${total}`);
}
console.log(`ACTIVE_COUNT=${activeCount}`);
