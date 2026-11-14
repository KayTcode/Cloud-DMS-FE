/**
 * Xác minh trạng thái hạn mức của một tenant qua DB.
 * Chạy: node e2e/verify/tenant-quota-state.mjs <tenantId>
 * In:
 *   TENANT_QUOTA=<bytes>
 *   ALLOC <ownerKind> <providerName> <grantedBytes> <usedBytes>
 *   EXTFOLDER <nodeId> <externalFolderId>
 */
import { execSync } from 'child_process';

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Usage: node tenant-quota-state.mjs <tenantId>');
  process.exit(1);
}

const DB_PASS = process.env.DB_PASS;
if (!DB_PASS) { console.error('Thiếu DB_PASS'); process.exit(1); }

function dbQuery(sql) {
  return execSync(
    `mysql --host=127.0.0.1 --port=3307 --user=dms_service "--password=${DB_PASS}" cloud_dms --batch --skip-column-names -e "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8', timeout: 10000 }
  ).trim();
}

const ownerKindLabel = { 0: 'Tenant', 1: 'Department', 2: 'User' };

// Tenant quota
const tenantRow = dbQuery(`SELECT StorageQuotaBytes FROM Tenants WHERE Id = '${tenantId}';`);
if (!tenantRow) { console.error('Không tìm thấy tenant'); process.exit(1); }
console.log(`TENANT_QUOTA=${tenantRow.trim()}`);

// Allocations
const allocRows = dbQuery(
  `SELECT qa.OwnerKind, sp.Name, qa.GrantedBytes, qa.UsedBytes ` +
  `FROM QuotaAllocations qa ` +
  `JOIN StorageProviders sp ON sp.Id = qa.StorageProviderId ` +
  `WHERE qa.TenantId = '${tenantId}' ORDER BY qa.OwnerKind, qa.CreatedAt;`
);
for (const line of allocRows.split('\n').filter(Boolean)) {
  const [kind, name, granted, used] = line.split('\t');
  console.log(`ALLOC ${ownerKindLabel[kind] ?? kind} "${name}" ${granted} ${used}`);
}

// External folders
const folderRows = dbQuery(
  `SELECT NodeId, ExternalFolderId FROM ExternalFolders WHERE TenantId = '${tenantId}' ORDER BY CreatedAt;`
);
for (const line of folderRows.split('\n').filter(Boolean)) {
  const [nodeId, extId] = line.split('\t');
  console.log(`EXTFOLDER ${nodeId} ${extId}`);
}
