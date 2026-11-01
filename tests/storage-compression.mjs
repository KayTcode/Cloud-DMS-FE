import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { File } from 'node:buffer';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/upload/storageZip.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { exports, Blob, File, Response, CompressionStream, DecompressionStream, TextEncoder, TextDecoder, console });
const { packageForStorage, extractStorageZip, safeArchivePath } = exports;
const missing = () => new DOMException('Missing', 'NotFoundError');
class Directory {
  directories = new Map(); files = new Map();
  async getDirectoryHandle(name, options) {
    if (!this.directories.has(name)) { if (!options?.create) throw missing(); this.directories.set(name, new Directory()); }
    return this.directories.get(name);
  }
  async getFileHandle(name, options) {
    if (!this.files.has(name)) { if (!options?.create) throw missing(); this.files.set(name, null); }
    return { createWritable: async () => ({ write: async bytes => this.files.set(name, bytes), close: async () => {}, abort: async () => {} }) };
  }
}
const original = new File(['Original document'], 'report.txt', { type: 'text/plain' });
const single = await packageForStorage([original]);
assert.equal(single.archiveKind, 'file'); assert.equal(single.logicalName, 'report.txt');
assert.equal(single.originalSize, 17);
const unicode = await packageForStorage([new File(['Unicode'], 'cafe\u0301.txt')]);
assert.equal(unicode.logicalName, 'café.txt');
const target = new Directory(); await extractStorageZip(single.file, target);
assert.equal(new TextDecoder().decode(target.files.get('report.txt')), 'Original document');
await assert.rejects(() => extractStorageZip(single.file, target), /đã tồn tại/);
for (const path of ['../escape', '/absolute', 'root/../escape', 'root\\escape', 'C:/file'])
  assert.throws(() => safeArchivePath(path));
const nested = new File(['Nested'], 'child.txt');
Object.defineProperty(nested, 'webkitRelativePath', { value: 'Project/sub/child.txt' });
const folder = await packageForStorage([nested], ['Project', 'Project/sub', 'Project/empty']);
assert.equal(folder.archiveKind, 'folder'); assert.equal(folder.logicalName, 'Project');
const output = new Directory(); await extractStorageZip(folder.file, output);
assert.ok(output.directories.get('Project').directories.has('empty'));
assert.equal(new TextDecoder().decode(output.directories.get('Project').directories.get('sub').files.get('child.txt')), 'Nested');
const empty = await packageForStorage([], ['Empty']);
const emptyTarget = new Directory(); await extractStorageZip(empty.file, emptyTarget);
assert.ok(emptyTarget.directories.has('Empty'));
const batch = await packageForStorage([original, new File(['Other'], 'other.txt')]);
assert.equal(batch.archiveKind, 'batch');
await assert.rejects(() => packageForStorage([original, original]), /Trùng/);
const damaged = new Uint8Array(await single.file.arrayBuffer());
damaged[30 + new TextEncoder().encode('report.txt').length] ^= 1;
await assert.rejects(() => extractStorageZip(new Blob([damaged]), new Directory()));
// Optional fixture for the independent .NET interoperability probe; never writes to cloud storage.
if (process.env.ZIP_INTEROP_FIXTURE) fs.writeFileSync(process.env.ZIP_INTEROP_FIXTURE, new Uint8Array(await folder.file.arrayBuffer()));
if (process.env.ZIP_SERVER_FIXTURE) {
  const serverTarget = new Directory();
  await extractStorageZip(new Blob([fs.readFileSync(process.env.ZIP_SERVER_FIXTURE)]), serverTarget);
  assert.equal(new TextDecoder().decode(serverTarget.directories.get('Server').files.get('report.txt')), 'x'.repeat(1000));
  assert.ok(serverTarget.directories.get('Server').directories.has('empty'));
  console.log('PASS: .NET Fastest ZIP extracts to original contents in browser codec');
}
console.log('PASS: single/batch/folder ZIPs, original bytes, empty folders, duplicate/traversal rejection, corruption and overwrite protection');
