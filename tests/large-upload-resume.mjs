import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { Blob } from 'node:buffer';
import crypto from 'node:crypto';
import ts from 'typescript';

function loadModule(path, extraGlobals = {}) {
  const exportsObj = {};
  const context = { exports: exportsObj, module: { exports: exportsObj }, Blob, Set, Map, Promise, console, Error, Date, Math, Uint8Array, ...extraGlobals };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context
  );
  return exportsObj;
}

const { fingerprintFile, matchesSaved } = loadModule('src/services/upload/large/resumeMatch.ts');

async function sha256Hex(blob) {
  const buf = Buffer.from(await blob.arrayBuffer());
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function baseSaved(overrides = {}) {
  return {
    sessionId: 'sess-1',
    fileName: 'report.pdf',
    size: 1000,
    lastModified: 123456,
    partSizeBytes: 8 * 1024 * 1024,
    fingerprint: 'abc123',
    folderId: null,
    savedAt: Date.now(),
    ...overrides,
  };
}

function baseCandidate(overrides = {}) {
  return {
    name: 'report.pdf',
    size: 1000,
    lastModified: 123456,
    ...overrides,
  };
}

async function run(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    throw err;
  }
}

await run('matches_whenAllEqual', async () => {
  const saved = baseSaved();
  const candidate = baseCandidate();
  assert.equal(matchesSaved(saved, candidate, 'abc123'), true);
});

await run('rejects_differentLastModified', async () => {
  const saved = baseSaved();
  const candidate = baseCandidate({ lastModified: 999 });
  assert.equal(matchesSaved(saved, candidate, 'abc123'), false);
});

await run('rejects_differentFingerprintSameSizeAndDate', async () => {
  const saved = baseSaved();
  const candidate = baseCandidate();
  assert.equal(matchesSaved(saved, candidate, 'xyz999'), false);
});

await run('rejects_differentSize', async () => {
  const saved = baseSaved();
  const candidate = baseCandidate({ size: 2000 });
  assert.equal(matchesSaved(saved, candidate, 'abc123'), false);
});

const MIB = 1024 * 1024;

await run('fingerprint_usesHeadAndTail', async () => {
  const size = 3 * MIB;
  const base = new Uint8Array(size).fill(7);

  const middleDiffers = new Uint8Array(base);
  middleDiffers[Math.floor(size / 2)] ^= 0xff;

  const tailDiffers = new Uint8Array(base);
  tailDiffers[size - 1] ^= 0xff;

  const blobA = new Blob([base]);
  const blobMiddle = new Blob([middleDiffers]);
  const blobTail = new Blob([tailDiffers]);

  const fpA = await fingerprintFile(blobA, sha256Hex);
  const fpMiddle = await fingerprintFile(blobMiddle, sha256Hex);
  const fpTail = await fingerprintFile(blobTail, sha256Hex);

  assert.equal(fpA, fpMiddle, 'middle-byte difference must not affect fingerprint');
  assert.notEqual(fpA, fpTail, 'tail-byte difference must affect fingerprint');
});

// --- tabLock ---

/**
 * Fake navigator.locks modeling the real Web Locks API's `ifAvailable: true`
 * semantics: if the named lock is already held, the callback is invoked
 * immediately with `null` instead of queuing.
 */
function makeFakeLocks() {
  const held = new Set();
  return {
    async request(name, _options, callback) {
      if (held.has(name)) {
        return callback(null);
      }
      held.add(name);
      try {
        return await callback({ name });
      } finally {
        held.delete(name);
      }
    },
  };
}

await run('tabLock_secondHolderGetsBusy', async () => {
  const fakeNavigator = { locks: makeFakeLocks() };
  const { withSessionLock } = loadModule('src/services/upload/large/tabLock.ts', { navigator: fakeNavigator });

  const runCalls = [];
  const busyCalls = [];

  let releaseFirst;
  const firstRunPromise = withSessionLock(
    'sess-1',
    () =>
      new Promise((resolve) => {
        runCalls.push('first');
        releaseFirst = resolve;
      }),
    () => busyCalls.push('first-busy')
  );

  // Give the first request a tick to acquire the lock before the second tries.
  await new Promise((r) => setTimeout(r, 0));

  const secondRunPromise = withSessionLock(
    'sess-1',
    async () => {
      runCalls.push('second');
    },
    () => busyCalls.push('second-busy')
  );

  await secondRunPromise;
  assert.deepEqual(runCalls, ['first']);
  assert.deepEqual(busyCalls, ['second-busy']);

  releaseFirst();
  await firstRunPromise;
});

await run('tabLock_runsImmediatelyWithoutWebLocks', async () => {
  const { withSessionLock } = loadModule('src/services/upload/large/tabLock.ts', { navigator: {} });
  let ran = false;
  let busy = false;
  await withSessionLock(
    'sess-2',
    async () => {
      ran = true;
    },
    () => {
      busy = true;
    }
  );
  assert.equal(ran, true);
  assert.equal(busy, false);
});

console.log('ALL PASS: large upload resume/fingerprint/tabLock suite');
