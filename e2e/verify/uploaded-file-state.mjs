/**
 * Xác minh tệp đã tải lên tồn tại thật trên Google Drive.
 * Chạy: node e2e/verify/uploaded-file-state.mjs <fileEntryId>
 * In:
 *   OBJECT_KEY=<storageObjectKey>
 *   SIZE_DB=<bytes>
 *   SIZE_DRIVE=<bytes>
 *   DRIVE_OK=<true|false>
 *
 * Env: DB_PASS, GDRIVE_OAUTH_CONFIG_JSON
 */
import https from 'https';
import { execSync } from 'child_process';

const fileEntryId = process.argv[2];
if (!fileEntryId) {
  console.error('Usage: node uploaded-file-state.mjs <fileEntryId>');
  process.exit(1);
}

const DB_PASS = process.env.DB_PASS;
if (!DB_PASS) { console.error('Thiếu DB_PASS'); process.exit(1); }

const oauthCfg = JSON.parse(process.env.GDRIVE_OAUTH_CONFIG_JSON || '{}');
const { client_id, client_secret, refresh_token } = oauthCfg;
if (!client_id || !client_secret || !refresh_token) {
  console.error('Thiếu GDRIVE_OAUTH_CONFIG_JSON');
  process.exit(1);
}

function dbQuery(sql) {
  return execSync(
    `mysql --host=127.0.0.1 --port=3307 --user=dms_service "--password=${DB_PASS}" cloud_dms --batch --skip-column-names -e "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8', timeout: 10000 }
  ).trim();
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

// 1. Lấy StorageKey + SizeBytes từ DB
const row = dbQuery(
  `SELECT StorageKey, SizeBytes FROM FileEntries WHERE Id = '${fileEntryId}';`
);
if (!row) {
  console.error(`Không tìm thấy FileEntry với Id=${fileEntryId}`);
  process.exit(1);
}
const [storageKey, sizeDb] = row.split('\t');
console.log(`OBJECT_KEY=${storageKey.trim()}`);
console.log(`SIZE_DB=${sizeDb.trim()}`);

// 2. Lấy access_token từ refresh_token
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

// 3. Lấy metadata tệp từ Google Drive theo storageKey (file ID)
const fileRes = await req(
  `https://www.googleapis.com/drive/v3/files/${storageKey.trim()}?fields=id,name,size,trashed&supportsAllDrives=true`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
);

if (fileRes.status !== 200 || fileRes.json?.trashed) {
  console.log('SIZE_DRIVE=0');
  console.log('DRIVE_OK=false');
  if (fileRes.status !== 200) {
    console.error('Drive API error:', fileRes.status, fileRes.text);
  }
} else {
  const sizeDrive = Number(fileRes.json.size ?? 0);
  console.log(`SIZE_DRIVE=${sizeDrive}`);
  console.log(`DRIVE_OK=${sizeDrive === Number(sizeDb.trim())}`);
}
