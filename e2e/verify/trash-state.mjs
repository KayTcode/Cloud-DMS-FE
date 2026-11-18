/**
 * Xác minh thùng rác thật qua Kong Gateway bằng tài khoản người dùng.
 * Chạy: node e2e/verify/trash-state.mjs [--drive=personal|shared] [--departmentId=<guid>]
 *
 * In: danh sách mục trong thùng rác (kind\tname\tdaysLeft\tsizeBytes\tid),
 *     rồi kết quả probe các route cũ để đối chiếu.
 *
 * Env:
 *   DMS_EMAIL     — email đăng nhập
 *   DMS_PASSWORD  — mật khẩu
 *   DMS_ORIGIN    — mặc định https://localhost:8443
 *
 * Script chỉ đọc, không tạo/xoá/sửa dữ liệu.
 */
import https from 'https';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const origin = process.env.DMS_ORIGIN || 'https://localhost:8443';
const email = process.env.DMS_EMAIL;
const password = process.env.DMS_PASSWORD;
const drive = arg('drive', 'personal');
const departmentId = arg('departmentId', '');

if (!email || !password) {
  console.error('Thiếu DMS_EMAIL hoặc DMS_PASSWORD trong môi trường.');
  process.exit(1);
}
if (!['personal', 'shared'].includes(drive)) {
  console.error('--drive phải là personal hoặc shared.');
  process.exit(1);
}
if (drive === 'shared' && !departmentId) {
  console.error('--drive=shared cần kèm --departmentId=<guid>.');
  process.exit(1);
}

// Kong dùng chứng chỉ tự ký ở môi trường dev.
const agent = new https.Agent({ rejectUnauthorized: false });

/** Cookie jar tối thiểu: antiforgery yêu cầu gửi lại cookie của GET /auth/csrf. */
const jar = new Map();
const cookieHeader = () =>
  [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
const storeCookies = (res) => {
  for (const line of res.headers['set-cookie'] || []) {
    const [pair] = line.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
};

function request(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, origin);
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = https.request(
      {
        agent,
        method,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        headers: {
          Origin: origin,
          ...(jar.size ? { Cookie: cookieHeader() } : {}),
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          storeCookies(res);
          let json = null;
          try { json = raw ? JSON.parse(raw) : null; } catch { /* không phải JSON */ }
          resolve({ status: res.statusCode, json, raw });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const main = async () => {
  const csrf = await request('GET', '/api/auth/csrf');
  if (csrf.status !== 200 || !csrf.json?.requestToken) {
    console.error(`Không lấy được CSRF token: HTTP ${csrf.status}`);
    process.exit(1);
  }

  const login = await request('POST', '/api/auth/login', {
    headers: { 'X-CSRF-TOKEN': csrf.json.requestToken },
    body: { email, password },
  });
  if (login.status !== 200 || !login.json?.accessToken) {
    console.error(`Đăng nhập thất bại: HTTP ${login.status} ${login.json?.message ?? login.raw.slice(0, 200)}`);
    process.exit(1);
  }
  const auth = { Authorization: `Bearer ${login.json.accessToken}` };
  console.log(`Đăng nhập OK (role=${login.json.role ?? '?'})\n`);

  const query = `?drive=${drive}${departmentId ? `&departmentId=${departmentId}` : ''}`;
  const trash = await request('GET', `/api/drive/trash${query}`, { headers: auth });
  console.log(`GET /api/drive/trash${query} → HTTP ${trash.status}`);

  if (trash.status !== 200) {
    console.error(`  ${trash.raw.slice(0, 300)}`);
    process.exit(1);
  }

  const items = trash.json?.value ?? trash.json ?? [];
  const kindName = (k) => (typeof k === 'string' ? k.toLowerCase() : k === 1 ? 'file' : 'folder');
  console.log(`  ${items.length} mục trong thùng rác`);
  if (items.length) {
    console.log('  kind\tdaysLeft\tsizeBytes\tname');
    for (const it of items) {
      console.log(`  ${kindName(it.kind)}\t${it.daysLeft}\t\t${it.sizeBytes}\t\t${it.name}`);
    }
  }

  console.log('\nĐối chiếu các route frontend từng gọi sai:');
  for (const path of [
    '/api/folders/trash?driveKind=Personal',
    '/api/folders/trash/empty',
  ]) {
    const res = await request('GET', path, { headers: auth });
    console.log(`  GET ${path} → HTTP ${res.status}`);
  }

  console.log('\nKỳ vọng: /api/drive/trash = 200 kèm mục đã xoá; /api/folders/trash = 404.');
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
