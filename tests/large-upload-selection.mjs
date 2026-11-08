import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { File } from 'node:buffer';
import ts from 'typescript';

// uploadSelection.ts imports planUpload/detectBlockedSignature/folderNameCandidate
// via relative paths. We load those modules first with `vm`, then give
// uploadSelection.ts's transpiled `require(...)` calls a shim that returns the
// already-loaded exports objects, so everything still runs in a single vm
// sandbox without a real module loader (same spirit as F1's loadModule).
function transpile(path) {
  return ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
}

function loadModule(path, resolve = {}) {
  const exportsObj = {};
  const moduleObj = { exports: exportsObj };
  const require_ = (spec) => {
    const key = spec.replace(/^\.\//, '').replace(/^@\/services\/upload\/large\//, '');
    if (resolve[key]) return resolve[key];
    throw new Error(`No shim for require('${spec}') while loading ${path}`);
  };
  const context = {
    exports: exportsObj,
    module: moduleObj,
    require: require_,
    console,
    Promise,
    Map,
    Array,
    Math,
    Error,
    Uint8Array,
    File,
  };
  vm.runInNewContext(transpile(path), context);
  return moduleObj.exports;
}

const uploadRouting = loadModule('src/services/upload/large/uploadRouting.ts');
const fileSignature = loadModule('src/services/upload/large/fileSignature.ts');
const folderNaming = loadModule('src/services/upload/large/folderNaming.ts');
const uploadManagerContext = {}; // only type imports, no runtime members needed

const { uploadSelection } = loadModule('src/services/upload/large/uploadSelection.ts', {
  uploadRouting,
  fileSignature,
  folderNaming,
  UploadManagerContext: uploadManagerContext,
});

function makeFile(name, size, relativePath) {
  const bytes = size > 0 ? new Uint8Array(size) : new Uint8Array(0);
  const file = new File([bytes], name);
  Object.defineProperty(file, 'size', { value: size });
  if (relativePath) Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
  return file;
}

function headOf(bytes) {
  return async () => new Uint8Array(bytes);
}

const TARGET = { folderId: 'root-1' };
const LARGE = uploadRouting.LARGE_FILE_THRESHOLD_BYTES;

// --- single_large_goesToEnqueue ---
{
  const file = makeFile('movie.mp4', LARGE + 1);
  const enqueued = [];
  const result = await uploadSelection([file], [], TARGET, {
    uploadZip: async () => { throw new Error('should not zip'); },
    enqueueLarge: async (f, t) => { enqueued.push([f, t]); return 'id-1'; },
    createFolder: async () => { throw new Error('should not create folder'); },
    reportPendingCount: () => {},
    readHead: headOf([0, 0, 0, 0]),
  });
  assert.equal(result.mode, 'large-single');
  assert.equal(enqueued.length, 1);
  assert.equal(result.items[0].ok, true);
  console.log('PASS: single_large_goesToEnqueue');
}

// --- large_exeSignature_blockedBeforeSession ---
{
  const file = makeFile('tool.exe', LARGE + 1);
  let enqueueCalled = false;
  const result = await uploadSelection([file], [], TARGET, {
    uploadZip: async () => { throw new Error('should not zip'); },
    enqueueLarge: async () => { enqueueCalled = true; return 'id'; },
    createFolder: async () => { throw new Error('should not create folder'); },
    reportPendingCount: () => {},
    readHead: headOf([0x4d, 0x5a, 0, 0]),
  });
  assert.equal(enqueueCalled, false);
  assert.equal(result.items[0].ok, false);
  assert.equal(result.items[0].error.code, 'BLOCKED_FILE_TYPE');
  console.log('PASS: large_exeSignature_blockedBeforeSession');
}

// --- tree_mixedFolder_createsEmptySubfolderAndRoutesEach ---
{
  const big = makeFile('big.mov', LARGE + 10, 'P/big.mov');
  const small = makeFile('x.txt', 10, 'P/a/x.txt');
  const createdFolders = [];
  const zipped = [];
  const enqueued = [];
  const result = await uploadSelection([big, small], ['P/empty'], TARGET, {
    uploadZip: async (files, dirs, t) => { zipped.push([files, dirs, t]); },
    enqueueLarge: async (f, t) => { enqueued.push([f, t]); },
    createFolder: async (name, parentId) => {
      const id = `folder-${name}-${parentId}`;
      createdFolders.push({ name, parentId, id });
      return { id };
    },
    reportPendingCount: () => {},
    readHead: headOf([0, 0, 0, 0]),
  });
  assert.equal(result.mode, 'tree');
  assert.equal(createdFolders.filter((f) => f.name === 'P').length, 1);
  assert.ok(createdFolders.some((f) => f.name === 'empty'));
  assert.ok(createdFolders.some((f) => f.name === 'a'));
  assert.equal(zipped.length, 1);
  assert.equal(enqueued.length, 1);
  const bigResult = result.items.find((i) => i.relativePath === 'P/big.mov');
  const smallResult = result.items.find((i) => i.relativePath === 'P/a/x.txt');
  assert.equal(bigResult.ok, true);
  assert.equal(smallResult.ok, true);
  console.log('PASS: tree_mixedFolder_createsEmptySubfolderAndRoutesEach');
}

// --- tree_rootNameTaken_usesSuffix1 ---
{
  const small = makeFile('big.mov', LARGE + 10, 'P/big.mov');
  let rootAttempts = 0;
  const result = await uploadSelection([small], [], TARGET, {
    uploadZip: async () => { throw new Error('should not zip'); },
    enqueueLarge: async () => {},
    createFolder: async (name, parentId) => {
      if (name === 'P') {
        rootAttempts += 1;
        throw new Error('Đã có thư mục cùng tên trong vị trí này.');
      }
      return { id: `folder-${name}` };
    },
    reportPendingCount: () => {},
    readHead: headOf([0, 0, 0, 0]),
  });
  // first attempt 'P' (attempt 0) fails as duplicate, second attempt 'P (1)' succeeds
  assert.equal(rootAttempts, 1);
  assert.ok(!result.error);
  console.log('PASS: tree_rootNameTaken_usesSuffix1');
}

// --- smallFolder_routesToZipPackage_notTree (Fix 1) ---
{
  const a = makeFile('a.txt', 100, 'P/a.txt');
  const b = makeFile('b.txt', 100, 'P/b.txt');
  const zipped = [];
  const result = await uploadSelection([a, b], [], TARGET, {
    uploadZip: async (files, dirs, t) => { zipped.push([files, dirs, t]); },
    enqueueLarge: async () => { throw new Error('should not enqueue'); },
    createFolder: async () => { throw new Error('should not create folder'); },
    reportPendingCount: () => {},
    readHead: headOf([0, 0, 0, 0]),
  });
  assert.equal(result.mode, 'zip-package');
  assert.equal(zipped.length, 1);
  console.log('PASS: smallFolder_routesToZipPackage_notTree');
}

// --- tree_zipFile_sentWithBareFileName (Fix 2) ---
{
  const small = makeFile('x.txt', 10, 'P/a/x.txt');
  const big = makeFile('big.mov', LARGE + 10, 'P/big.mov');
  const zipCalls = [];
  const result = await uploadSelection([small, big], [], TARGET, {
    uploadZip: async (files) => { zipCalls.push(files[0]); },
    enqueueLarge: async () => {},
    createFolder: async (name, parentId) => ({ id: `folder-${name}-${parentId}` }),
    reportPendingCount: () => {},
    readHead: headOf([0, 0, 0, 0]),
  });
  assert.equal(result.mode, 'tree');
  assert.equal(zipCalls.length, 1);
  const sentFile = zipCalls[0];
  assert.equal(sentFile.name, 'x.txt');
  assert.ok(!sentFile.name.includes('/'));
  assert.equal(sentFile.webkitRelativePath, undefined);
  console.log('PASS: tree_zipFile_sentWithBareFileName');
}

// --- msiSignature_onlyBlockedWithMsiExtension (Fix 11) ---
{
  const oleHeader = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0];
  const docFile = makeFile('report.doc', LARGE + 1);
  const docResult = await uploadSelection([docFile], [], TARGET, {
    uploadZip: async () => { throw new Error('should not zip'); },
    enqueueLarge: async () => 'id',
    createFolder: async () => { throw new Error('should not create folder'); },
    reportPendingCount: () => {},
    readHead: headOf(oleHeader),
  });
  assert.equal(docResult.items[0].ok, true);

  const msiFile = makeFile('installer.msi', LARGE + 1);
  const msiResult = await uploadSelection([msiFile], [], TARGET, {
    uploadZip: async () => { throw new Error('should not zip'); },
    enqueueLarge: async () => { throw new Error('should not enqueue'); },
    createFolder: async () => { throw new Error('should not create folder'); },
    reportPendingCount: () => {},
    readHead: headOf(oleHeader),
  });
  assert.equal(msiResult.items[0].ok, false);
  assert.equal(msiResult.items[0].error.code, 'BLOCKED_FILE_TYPE');
  console.log('PASS: msiSignature_onlyBlockedWithMsiExtension');
}

// --- tree_nonDuplicateError_stops ---
{
  const small = makeFile('x.txt', LARGE + 1, 'P/x.txt');
  let folderCalls = 0;
  const result = await uploadSelection([small], [], TARGET, {
    uploadZip: async () => { throw new Error('should not be called'); },
    enqueueLarge: async () => { throw new Error('should not be called'); },
    createFolder: async () => {
      folderCalls += 1;
      const err = new Error('boom');
      err.code = 'SOME_OTHER_ERROR';
      throw err;
    },
    reportPendingCount: () => {},
    readHead: headOf([0, 0, 0, 0]),
  });
  assert.equal(folderCalls, 1);
  assert.ok(result.error);
  assert.equal(result.items.length, 0);
  console.log('PASS: tree_nonDuplicateError_stops');
}

// --- tree_maxThreeConcurrent ---
{
  const files = Array.from({ length: 6 }, (_, i) => makeFile(`f${i}.txt`, Math.floor(LARGE / 3), `P/f${i}.txt`));
  let active = 0;
  let maxActive = 0;
  const result = await uploadSelection(files, [], TARGET, {
    uploadZip: async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    },
    enqueueLarge: async () => {},
    createFolder: async (name) => ({ id: `folder-${name}` }),
    reportPendingCount: () => {},
    readHead: headOf([0, 0, 0, 0]),
  });
  assert.ok(maxActive <= 3, `maxActive was ${maxActive}`);
  assert.equal(result.items.length, 6);
  console.log('PASS: tree_maxThreeConcurrent');
}

// --- tree_reportsPendingCountDownToZero ---
{
  const files = Array.from({ length: 4 }, (_, i) => makeFile(`f${i}.txt`, Math.floor(LARGE / 2), `P/f${i}.txt`));
  const reported = [];
  await uploadSelection(files, [], TARGET, {
    uploadZip: async () => {},
    enqueueLarge: async () => {},
    createFolder: async (name) => ({ id: `folder-${name}` }),
    reportPendingCount: (n) => reported.push(n),
    readHead: headOf([0, 0, 0, 0]),
  });
  assert.equal(reported[0], 4);
  assert.equal(reported[reported.length - 1], 0);
  for (let i = 1; i < reported.length; i++) {
    assert.ok(reported[i] <= reported[i - 1]);
  }
  console.log('PASS: tree_reportsPendingCountDownToZero');
}

console.log('PASS: all large-upload-selection tests');
