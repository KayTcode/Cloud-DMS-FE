// Run from the frontend root: node tests/folder-creation-contracts.mjs
// Executes the actual TS API and handlers in isolation; HTTP is mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText;
const calls = [];
const response = { value: { folders: [{ id: 'real-id', name: 'Saved folder' }], breadcrumb: [] } };
const api = {
  get: async (url, options) => { calls.push({ url, options }); return response; },
  post: async (url, payload) => { calls.push({ url, payload }); return { value: { id: 'real-id' } }; },
};
const exports = {};
vm.runInNewContext(compile(fs.readFileSync('src/features/user/api/folderApi.ts', 'utf8')), {
  exports, require: name => {
    if (name === '@/api/axiosClient') return { default: api };
    if (name === '@/api/endpoints') return { API_ENDPOINTS: { FOLDERS: { CREATE: '/folders' } } };
    throw new Error(`Unexpected import: ${name}`);
  },
});
const folders = exports.folderApi;
assert.equal((await folders.getRoot('Personal', 'user')).folders[0].id, 'real-id');
assert.equal(calls.at(-1).url, '/drive/children');
assert.equal(calls.at(-1).options.params.drive, 'personal');
assert.equal(calls.at(-1).options.params.departmentId, undefined);
await folders.getRoot('DepartmentShared', 'dept');
assert.equal(calls.at(-1).options.params.drive, 'shared');
assert.equal(calls.at(-1).options.params.departmentId, 'dept');
await folders.getChildren('child');
assert.equal(calls.at(-1).options.params.folderId, 'child');
assert.equal(calls.at(-1).options.params.drive, 'personal');
await folders.getChildren('shared-child', 'DepartmentShared', 'dept');
assert.equal(calls.at(-1).options.params.folderId, 'shared-child');
assert.equal(calls.at(-1).options.params.departmentId, 'dept');
await folders.createFolder({ name: 'New', parentFolderId: null, driveKind: 'DepartmentShared', driveOwnerId: 'dept' });
assert.equal(calls.at(-1).payload.drive, 'shared');
assert.equal(calls.at(-1).payload.departmentId, 'dept');
assert.equal(calls.at(-1).payload.parentId, null);

function handler(file, name, context) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(initializer, `${name} must exist`);
  return vm.runInNewContext(compile(`const extracted = ${initializer.getText(ast)}; extracted;`), context);
}

const notifications = [];
const refreshes = [];
let rejected = false;
const portal = handler('src/features/user/UserPortal.tsx', 'handleCreateFolder', {
  currentFolderId: 'parent',
  driveApi: { createFolder: async (name, parent) => {
    if (rejected) throw { response: { data: { detail: 'Duplicate folder' } } };
    assert.equal(parent, 'parent'); return { id: 'real-id', name };
  } },
  fetchDriveItems: async () => refreshes.push('files'),
  fetchFolders: async () => refreshes.push('folders'),
  showNotification: (message, type) => notifications.push({ message, type }),
  setDriveItems: () => assert.fail('Never manufacture a synthetic folder'),
});
await portal('Saved folder', 'Engineering');
assert.deepEqual(refreshes, ['files', 'folders']);
assert.equal(notifications.at(-1).type, 'success');
rejected = true;
await assert.rejects(() => portal('Saved folder', 'Engineering'));
assert.equal(notifications.at(-1).type, 'error');
assert.equal(notifications.at(-1).message, 'Duplicate folder');
assert.equal(refreshes.length, 2);

let resolve;
let fail = false;
let closed = 0;
const names = [];
const errors = [];
const pending = new Promise(done => { resolve = done; });
const modal = handler('src/features/user/components/NewFolderModal.tsx', 'handleSubmit', {
  folderName: ' New folder ', dept: 'Engineering', parentFolderId: 'parent', isSubmitting: false,
  setIsSubmitting() {}, setError: error => errors.push(error), setFolderName: name => names.push(name),
  onClose: () => closed++,
  onCreateFolder: async () => { if (fail) throw new Error('Forbidden'); await pending; },
});
const submission = modal({ preventDefault() {} });
assert.equal(closed, 0, 'Keep modal open until server succeeds');
assert.equal(names.length, 0, 'Preserve name while request is pending');
resolve();
await submission;
assert.equal(closed, 1);
assert.deepEqual(names, ['']);
fail = true;
await modal({ preventDefault() {} });
assert.equal(closed, 1, 'Rejected request must not close modal');
assert.equal(names.length, 1, 'Rejected request must not clear the entered name');
assert.equal(errors.at(-1), 'Forbidden');
console.log('PASS: root/nested drive contracts, create scope, success refresh, failure propagation, and asynchronous modal behavior');
