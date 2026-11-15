/**
 * In cây thư mục lồng nhau trên Google Drive từ một folder gốc.
 * Chạy: node e2e/verify/drive-tree.mjs <rootFolderId> [--account=1|2]
 * In: <độ sâu>\t<tên>\t<id>  cho mỗi node, rồi NODE_COUNT=<n>
 *
 * Env:
 *   GDRIVE_OAUTH_CONFIG_JSON  — dùng khi --account=1 hoặc không có --account
 *   GDRIVE_OAUTH2_CONFIG_JSON — dùng khi --account=2
 */
import https from 'https';

const args = process.argv.slice(2);
const rootFolderId = args.find(a => !a.startsWith('--')) || 'root';
const accountArg = args.find(a => a.startsWith('--account='));
const account = accountArg ? Number(accountArg.split('=')[1]) : 1;

const configEnv = account === 2 ? process.env.GDRIVE_OAUTH2_CONFIG_JSON : process.env.GDRIVE_OAUTH_CONFIG_JSON;
if (!configEnv) {
  const envKey = account === 2 ? 'GDRIVE_OAUTH2_CONFIG_JSON' : 'GDRIVE_OAUTH_CONFIG_JSON';
  console.error(`Thiếu ${envKey}`);
  process.exit(1);
}

const { client_id, client_secret, refresh_token } = JSON.parse(configEnv);
if (!client_id || !client_secret || !refresh_token) {
  console.error('JSON thiếu client_id, client_secret hoặc refresh_token');
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

// Lấy access_token
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

// Duyệt cây đệ quy (BFS)
let nodeCount = 0;

async function listChildren(folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await req(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100`,
    { headers: auth }
  );
  if (res.status !== 200) {
    console.error(`Drive API error ${res.status} for folder ${folderId}:`, res.text);
    return [];
  }
  return res.json.files || [];
}

async function traverse(folderId, depth) {
  const children = await listChildren(folderId);
  for (const child of children) {
    nodeCount++;
    console.log(`${depth}\t${child.name}\t${child.id}`);
    if (child.mimeType === 'application/vnd.google-apps.folder') {
      await traverse(child.id, depth + 1);
    }
  }
}

await traverse(rootFolderId, 0);
console.log(`NODE_COUNT=${nodeCount}`);
