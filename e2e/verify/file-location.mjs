/**
 * Xác minh vị trí tệp trên Google Drive qua StorageObjectKey.
 * Chạy: node e2e/verify/file-location.mjs <fileEntryId>
 * In: PARENT_FOLDER_NAME=<tên folder cha> và PARENT_FOLDER_ID=<id>
 *
 * Env:
 *   DB_PASS                   — mật khẩu MySQL
 *   GDRIVE_OAUTH_CONFIG_JSON  — tài khoản Drive 1
 *   GDRIVE_OAUTH2_CONFIG_JSON — tài khoản Drive 2
 */
import https from 'https';
import { execSync } from 'child_process';

const fileEntryId = process.argv[2];
if (!fileEntryId) {
  console.error('Dùng: node file-location.mjs <fileEntryId>');
  process.exit(1);
}

const DB_PASS = process.env.DB_PASS ?? 'd256d10eb7e973fccadda4a7110c50105e3257c25810b02beb784e7f9257ccad';
const DB_USER = process.env.DB_USER ?? 'root';
const DB_NAME = process.env.DB_NAME ?? 'cloud_dms';
const DB_CONTAINER = process.env.DB_CONTAINER ?? 'cloud-dms-dev-dms-mysql-1';

function dbQuery(sql) {
  return execSync(
    `docker exec ${DB_CONTAINER} mysql --user=${DB_USER} "--password=${DB_PASS}" ${DB_NAME} --batch --skip-column-names -e "${sql.replace(/"/g, '\\"')}"`,
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

async function getAccessToken(configEnvKey) {
  const cfg = JSON.parse(process.env[configEnvKey] || '{}');
  const { client_id, client_secret, refresh_token } = cfg;
  if (!client_id) return null;
  const tokenRes = await req('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: 'refresh_token' }).toString(),
  });
  return tokenRes.json?.access_token ?? null;
}

async function findParentOnDrive(storageKey, accessToken) {
  const fileRes = await req(
    `https://www.googleapis.com/drive/v3/files/${storageKey}?fields=id,name,parents&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (fileRes.status !== 200) return null;
  const parents = fileRes.json?.parents ?? [];
  if (parents.length === 0) return null;
  const parentId = parents[0];
  const parentRes = await req(
    `https://www.googleapis.com/drive/v3/files/${parentId}?fields=id,name&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (parentRes.status !== 200) return null;
  return { id: parentId, name: parentRes.json?.name ?? '' };
}

// 1. Lấy StorageKey từ DB
const row = dbQuery(`SELECT StorageKey FROM FileEntries WHERE Id = '${fileEntryId}';`);
if (!row) {
  console.error(`Không tìm thấy FileEntry với Id=${fileEntryId}`);
  process.exit(1);
}
const storageKey = row.trim();
console.log(`STORAGE_KEY=${storageKey}`);

// 2. Thử account 1 rồi account 2
for (const envKey of ['GDRIVE_OAUTH_CONFIG_JSON', 'GDRIVE_OAUTH2_CONFIG_JSON']) {
  if (!process.env[envKey]) continue;
  const accessToken = await getAccessToken(envKey);
  if (!accessToken) continue;
  const parent = await findParentOnDrive(storageKey, accessToken);
  if (parent) {
    console.log(`PARENT_FOLDER_NAME=${parent.name}`);
    console.log(`PARENT_FOLDER_ID=${parent.id}`);
    console.log(`FOUND_ON=${envKey}`);
    process.exit(0);
  }
}

console.error('Không tìm thấy tệp trên Drive 1 hoặc Drive 2. Kiểm tra GDRIVE_OAUTH_CONFIG_JSON và GDRIVE_OAUTH2_CONFIG_JSON.');
process.exit(1);
