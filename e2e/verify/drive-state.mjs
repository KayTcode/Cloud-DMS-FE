/**
 * Xác minh trạng thái thật của Google Drive qua OAuth2.
 * Chạy: node e2e/verify/drive-state.mjs <folderId|root> [--account=1|2]
 * In: danh sách con của thư mục (name\tmimeType\tid), rồi DRIVE_LIMIT=<bytes>
 *
 * Env:
 *   GDRIVE_OAUTH_CONFIG_JSON  — dùng khi --account=1 hoặc không có --account
 *   GDRIVE_OAUTH2_CONFIG_JSON — dùng khi --account=2
 */
import https from 'https';

const args = process.argv.slice(2);
const folderId = args.find(a => !a.startsWith('--')) || 'root';
const accountArg = args.find(a => a.startsWith('--account='));
const account = accountArg ? Number(accountArg.split('=')[1]) : 1;
const configEnvKey = account === 2 ? 'GDRIVE_OAUTH2_CONFIG_JSON' : 'GDRIVE_OAUTH_CONFIG_JSON';

const oauthCfg = JSON.parse(process.env[configEnvKey] || '{}');
const { client_id, client_secret, refresh_token } = oauthCfg;
if (!client_id || !client_secret || !refresh_token) {
  console.error(`Thiếu ${configEnvKey} (cần client_id, client_secret, refresh_token)`);
  process.exit(1);
}

function req(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
    };
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch { /* */ }
        resolve({ status: res.statusCode, json, text: body });
      });
    });
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}

// 1. Đổi refresh_token → access_token
const tokenRes = await req('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: 'refresh_token' }).toString(),
});
if (tokenRes.status !== 200 || !tokenRes.json?.access_token) {
  console.error('Lấy access_token thất bại:', tokenRes.text);
  process.exit(1);
}
const accessToken = tokenRes.json.access_token;
const auth = { Authorization: `Bearer ${accessToken}` };

// 2. Dung lượng Drive
const aboutRes = await req('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user(emailAddress)', {
  headers: auth,
});
if (aboutRes.status !== 200) {
  console.error('Gọi Drive about thất bại:', aboutRes.text);
  process.exit(1);
}
const quota = aboutRes.json.storageQuota;
const driveLimit = Number(quota.limit);
const driveUsage = Number(quota.usage);
console.log(`Email: ${aboutRes.json.user?.emailAddress}`);
console.log(`DRIVE_USAGE=${driveUsage}`);

// 3. Danh sách con của thư mục
const parentQuery = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
const filesRes = await req(
  `https://www.googleapis.com/drive/v3/files?q=${parentQuery}&fields=files(id,name,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  { headers: auth },
);
if (filesRes.status !== 200) {
  console.error('Gọi Drive files thất bại:', filesRes.text);
  process.exit(1);
}
const files = filesRes.json.files || [];
if (files.length === 0) {
  console.log('(thư mục rỗng hoặc không tồn tại)');
} else {
  console.log('name\tmimeType\tid');
  for (const f of files) {
    console.log(`${f.name}\t${f.mimeType}\t${f.id}`);
  }
}

console.log(`DRIVE_LIMIT=${driveLimit}`);
