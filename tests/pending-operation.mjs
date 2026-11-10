/**
 * tests/pending-operation.mjs
 * Test cho waitForOperation (pendingOperation.ts).
 * Chạy: node tests/pending-operation.mjs
 */

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dùng tsx/ts-node để import TypeScript hoặc import compiled JS
// Vì dự án dùng Vite + TS, ta dùng dynamic import với tsx
// Nếu không có tsx, chạy: npx tsx tests/pending-operation.mjs

let waitForOperation;
try {
  // Thử import trực tiếp (cần tsx hoặc ts-node trong PATH)
  const mod = await import('../src/api/pendingOperation.ts');
  waitForOperation = mod.waitForOperation;
} catch (e) {
  console.error('Không thể import pendingOperation.ts:', e.message);
  console.error('Chạy: npx tsx tests/pending-operation.mjs');
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// --- appliedAfterTwoPolls ---
await test('appliedAfterTwoPolls: get gọi 3 lần, resolve Applied', async () => {
  const calls = [];
  const statuses = ['Pending', 'Pending', 'Applied'];
  let i = 0;

  const deps = {
    get: async (path) => {
      calls.push(path);
      return { status: statuses[i++] };
    },
    sleep: async () => {},
  };

  const result = await waitForOperation('op-123', deps);
  assert(result === 'Applied', `Kết quả phải là 'Applied', nhận được '${result}'`);
  assert(calls.length === 3, `get phải được gọi 3 lần, thực tế ${calls.length}`);
  assert(calls.every(p => p === '/operations/op-123'), `Path sai: ${calls}`);
});

// --- failedRejects ---
await test('failedRejects: get trả Failed → reject với "không áp dụng được"', async () => {
  const deps = {
    get: async () => ({ status: 'Failed' }),
    sleep: async () => {},
  };

  let threw = false;
  try {
    await waitForOperation('op-456', deps);
  } catch (err) {
    threw = true;
    assert(
      err.message.includes('không áp dụng được'),
      `Message sai: "${err.message}"`
    );
  }
  assert(threw, 'Phải throw khi status = Failed');
});

// --- timeoutRejects ---
await test('timeoutRejects: luôn Pending, maxAttempts=3 → reject "đang được xử lý", sleep gọi 2 lần', async () => {
  const sleepCalls = [];
  const deps = {
    get: async () => ({ status: 'Pending' }),
    sleep: async (ms) => { sleepCalls.push(ms); },
  };

  let threw = false;
  try {
    await waitForOperation('op-789', deps, { maxAttempts: 3, intervalMs: 1000 });
  } catch (err) {
    threw = true;
    assert(
      err.message.includes('đang được xử lý'),
      `Message sai: "${err.message}"`
    );
  }
  assert(threw, 'Phải throw khi hết lượt');
  assert(sleepCalls.length === 2, `sleep phải gọi 2 lần, thực tế ${sleepCalls.length}`);
  assert(sleepCalls.every(ms => ms === 1000), `sleep phải gọi với 1000ms, nhận ${sleepCalls}`);
});

// --- Kết quả ---
console.log('');
console.log(`Kết quả: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
