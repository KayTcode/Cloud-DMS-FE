import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadModule(path) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, console });
  return exports;
}

const { planUpload, LARGE_FILE_THRESHOLD_BYTES } = loadModule('src/services/upload/large/uploadRouting.ts');
const { detectBlockedSignature } = loadModule('src/services/upload/large/fileSignature.ts');
const { folderNameCandidate } = loadModule('src/services/upload/large/folderNaming.ts');

assert.equal(LARGE_FILE_THRESHOLD_BYTES, 104857600);

assert.equal(planUpload([{ size: 104857600, relativePath: 'a.mp4' }]).mode, 'zip-single');
assert.equal(planUpload([{ size: 104857601, relativePath: 'a.mp4' }]).mode, 'large-single');

assert.equal(
  planUpload([{ size: 50 * 2 ** 20, relativePath: 'a.mp4' }, { size: 50 * 2 ** 20, relativePath: 'b.mp4' }]).mode,
  'zip-package'
);

const manySmall = Array.from({ length: 1001 }, (_, i) => ({ size: 10, relativePath: `f${i}.txt` }));
assert.equal(planUpload(manySmall).mode, 'tree');

// Flat files, count <= 1000 but total size exceeds threshold ⇒ must route to 'tree', not 'zip-package'.
assert.equal(
  planUpload([{ size: 100 * 2 ** 20, relativePath: 'a.mp4' }, { size: 100 * 2 ** 20, relativePath: 'b.mp4' }]).mode,
  'tree'
);

// Review Focus 5
const focus5 = planUpload(
  [
    { size: 200 * 2 ** 20, relativePath: 'P/big.mov' },
    { size: 10, relativePath: 'P/a/x.txt' },
  ],
  ['P/empty']
);
assert.equal(focus5.mode, 'tree');
assert.equal(focus5.root, 'P');
assert.ok(focus5.folders.includes('P'));
assert.ok(focus5.folders.includes('P/a'));
assert.ok(focus5.folders.includes('P/empty'));
assert.ok(focus5.folders.indexOf('P') < focus5.folders.indexOf('P/a'));
const bigItem = focus5.items.find((i) => i.relativePath === 'P/big.mov');
const txtItem = focus5.items.find((i) => i.relativePath === 'P/a/x.txt');
assert.equal(bigItem.route, 'large');
assert.equal(txtItem.route, 'zip-file');

// Fix 1: small folder selection (under size/count thresholds) must still
// route to 'zip-package', not 'tree', just like the flat multi-file case.
const smallFolder = planUpload(
  [
    { size: 10, relativePath: 'P/a.txt' },
    { size: 20, relativePath: 'P/b.txt' },
  ],
  ['P']
);
assert.equal(smallFolder.mode, 'zip-package');

assert.equal(detectBlockedSignature(Uint8Array.of(0x4d, 0x5a, 0, 0)), 'PE');
assert.equal(
  detectBlockedSignature(Uint8Array.of(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70)),
  null
);

assert.equal(folderNameCandidate('Dự án', 2), 'Dự án (2)');
assert.equal(folderNameCandidate('X', 0), 'X');
assert.equal(folderNameCandidate('X', 1), 'X (1)');

console.log('PASS: upload routing, file signature detection, folder naming candidates');
