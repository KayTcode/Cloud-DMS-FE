// Run with: node tests/offboarding-contracts.mjs
// Exercises actual TS handlers/API mapping with mocked HTTP; no backend or browser is required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText;
const modalSource = fs.readFileSync('src/features/department-admin/components/OffboardEmployeeModal.tsx', 'utf8');
const ast = ts.createSourceFile('modal.tsx', modalSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let submit;
const visit = node => {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleSubmit') submit = node.initializer;
  ts.forEachChild(node, visit);
};
visit(ast);
assert.ok(submit, 'The actual modal submit handler must exist');

async function submitScenario(scenario, overrides = {}) {
  const sent = [];
  const errors = [];
  const context = {
    scenario, department: { id: 'department' }, employee: { id: 'departing' },
    custodianUserId: 'department-admin', targetUserId: 'colleague',
    newEmployeeEmail: ' replacement@example.test ', newEmployeeFirstName: ' New ',
    newEmployeeLastName: ' Employee ', newEmployeePhoneNumber: '', handoverReason: ' Leaving ',
    setError: error => errors.push(error), setIsLoading() {}, setResult() {}, onSuccess() {},
    departmentApi: { offboardEmployee: async (id, payload) => { sent.push({ id, payload }); return {}; } },
    console, ...overrides,
  };
  const handler = vm.runInNewContext(compile(`const handler = ${submit.getText(ast)}; handler;`), context);
  await handler({ preventDefault() {} });
  return { sent, errors };
}

const custody = await submitScenario('DEPARTMENT_HEAD_CUSTODY');
assert.equal(custody.sent.length, 1);
assert.equal(custody.sent[0].payload.targetUserId, 'department-admin');
assert.equal(custody.sent[0].payload.newEmployeeEmail, null);
assert.equal((await submitScenario('DESIGNATED_PEER')).sent[0].payload.targetUserId, 'colleague');
const invitation = (await submitScenario('INVITE_NEW_EMPLOYEE')).sent[0].payload;
assert.equal(invitation.targetUserId, null);
assert.equal(invitation.newEmployeeEmail, 'replacement@example.test');
assert.equal(invitation.newEmployeeFirstName, 'New');
const missingCustodian = await submitScenario('DEPARTMENT_HEAD_CUSTODY', { custodianUserId: '' });
assert.equal(missingCustodian.sent.length, 0);
assert.ok(missingCustodian.errors.some(Boolean));
assert.equal((await submitScenario('DESIGNATED_PEER', { targetUserId: 'departing' })).sent.length, 0);

const calls = [];
let reject = false;
const api = { get: async (url, options) => {
  calls.push({ url, options });
  if (reject) throw new Error('Access revoked');
  return { value: { folders: [{ id: 'folder', name: 'Empty', parentId: 'handover' }], totalFolders: 1,
    files: { items: [{ id: 'file', name: 'report.zip', sizeBytes: 12, permissionLevel: 'Viewer',
      canRead: true, canWrite: false, canDelete: false, createdAt: '2026-11-01T00:00:00Z' }],
      totalCount: 1, pageNumber: 2, pageSize: 20, hasMore: false } } };
} };
const exports = {};
vm.runInNewContext(compile(fs.readFileSync('src/features/user/api/driveApi.ts', 'utf8')), {
  exports, require: name => {
    if (name === '@/api/axiosClient') return { default: api };
    if (name === '@/services/upload/CloudDirectUploader') return {};
    throw new Error(`Unexpected runtime import: ${name}`);
  }, console,
});
const children = await exports.driveApi.getSharedChildren('handover', 2);
assert.equal(calls[0].url, '/drive/shared/children');
assert.equal(calls[0].options.params.folderId, 'handover');
assert.equal(calls[0].options.params.pageNumber, 2);
assert.equal(children.folders[0].id, 'folder');
assert.equal(children.files.items[0].fileType, 'archive');
assert.equal(children.files.items[0].canWrite, false);
assert.equal(children.files.totalCount, 1);
reject = true;
await assert.rejects(() => exports.driveApi.getSharedChildren('handover'), /Access revoked/);
console.log('PASS: custody, colleague, invitation, invalid recipients, shared-folder mapping, and revoked-access errors');
