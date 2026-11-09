import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { Blob } from 'node:buffer';
import ts from 'typescript';

const exportsObj = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('src/services/upload/large/LargeFileUploader.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: exportsObj, Blob, Set, Map, Promise, console, Error, AbortController, Date, Math }
);
const { LargeFileUploader } = exportsObj;

const PART_SIZE = 8;
const TOTAL = 80;

function makeFile() {
  return new Blob([new Uint8Array(TOTAL).fill(1)]);
}

function baseSession(overrides = {}) {
  return {
    sessionId: 'sess-1',
    fileId: 'file-1',
    documentVersion: 1,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    reservedBytes: TOTAL,
    protocol: 'S3Multipart',
    directUploadUrl: undefined,
    recommendedChunkSizeBytes: PART_SIZE,
    isLargeFile: true,
    partSizeBytes: PART_SIZE,
    totalParts: 10,
    maxConcurrency: 4,
    idleExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    absoluteExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    ...overrides,
  };
}

class ApiCodeError extends Error {
  constructor(code, status, message, retryAfterSeconds) {
    super(message || code);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Fake transport recording calls; sleep resolves immediately (fake clock via `now`). */
function makeTransport(overrides = {}) {
  let clock = 0;
  const calls = {
    putPart: [],
    putChunk: [],
    presign: [],
    heartbeat: [],
    complete: 0,
    abort: 0,
    queryOffset: [],
    status: 0,
  };
  const inFlight = { current: 0, max: 0 };

  const transport = {
    calls,
    inFlight,
    async begin() {
      return baseSession();
    },
    async presign(partNumber, _sha256) {
      calls.presign.push(partNumber);
      return `https://upload/part-${partNumber}`;
    },
    async putPart(url, _body, headers, _signal) {
      inFlight.current++;
      inFlight.max = Math.max(inFlight.max, inFlight.current);
      try {
        calls.putPart.push({ url, headers });
        if (overrides.putPart) return await overrides.putPart(url, headers, calls.putPart.length);
        return { status: 200, etag: 'etag-' + calls.putPart.length };
      } finally {
        inFlight.current--;
      }
    },
    async putChunk(url, _body, contentRange, _signal) {
      calls.putChunk.push({ url, contentRange });
      if (overrides.putChunk) return await overrides.putChunk(contentRange);
      return { status: 200, rangeHeader: null, retryAfter: null };
    },
    async queryOffset(url, total) {
      calls.queryOffset.push({ url, total });
      if (overrides.queryOffset) return overrides.queryOffset();
      return 0;
    },
    async status() {
      calls.status++;
      if (overrides.status) return overrides.status();
      return { completedPartNumbers: [] };
    },
    async heartbeat(uploaded) {
      calls.heartbeat.push(uploaded);
    },
    async complete() {
      calls.complete++;
      return { fileId: 'file-1', documentVersion: 2 };
    },
    async abort() {
      calls.abort++;
    },
    async sha256Base64(_blob) {
      return 'c2hhMjU2';
    },
    async sleep(_ms) {
      return Promise.resolve();
    },
    now() {
      return clock;
    },
    advanceClock(ms) {
      clock += ms;
    },
  };
  return transport;
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

await run('s3_uploadsAllPartsWithChecksumThenCompletes', async () => {
  const transport = makeTransport();
  const events = [];
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, (e) => events.push(e));
  await uploader.start();
  assert.equal(transport.calls.putPart.length, 10);
  for (const call of transport.calls.putPart) {
    assert.ok(call.headers['x-amz-checksum-sha256']);
  }
  assert.equal(transport.calls.complete, 1);
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.equal(stateEvents[stateEvents.length - 1].state, 'done');
});

await run('s3_neverExceedsConcurrency', async () => {
  const transport = makeTransport();
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, () => {});
  await uploader.start();
  assert.ok(transport.inFlight.max <= 4);
});

await run('s3_skipsPartsReportedCompletedByServer', async () => {
  const transport = makeTransport({ status: () => ({ completedPartNumbers: [1, 2, 3] }) });
  const events = [];
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, (e) => events.push(e));
  const progressEvents = [];
  const uploader2 = new LargeFileUploader(makeFile(), baseSession(), transport, (e) => {
    events.push(e);
    if (e.type === 'progress') progressEvents.push(e);
  });
  await uploader2.start();
  assert.equal(transport.calls.putPart.length, 7);
  assert.ok(progressEvents.length > 0);
  assert.equal(progressEvents[0].uploaded, 24);
});

await run('s3_lostResponseRetry_countsProgressOnce', async () => {
  const calls = { putPart: [] };
  const inFlight = { current: 0, max: 0 };
  const attemptsByPart = new Map();
  const custom = {
    calls,
    inFlight,
    async begin() {
      return baseSession();
    },
    async presign(partNumber) {
      return `https://upload/part-${partNumber}`;
    },
    async putPart(url, _body, headers, _signal) {
      const partNumber = Number(url.split('part-')[1]);
      calls.putPart.push({ url, headers });
      if (partNumber === 5) {
        const attempt = (attemptsByPart.get(5) || 0) + 1;
        attemptsByPart.set(5, attempt);
        if (attempt <= 5) {
          throw new Error('network lost');
        }
      }
      return { status: 200, etag: 'etag' };
    },
    async queryOffset() {
      return 0;
    },
    async status() {
      return { completedPartNumbers: [] };
    },
    async heartbeat() {},
    async complete() {
      return { fileId: 'file-1', documentVersion: 2 };
    },
    async abort() {},
    async sha256Base64() {
      return 'c2hhMjU2';
    },
    async sleep() {
      return Promise.resolve();
    },
    now() {
      return 0;
    },
  };
  const events = [];
  const uploader = new LargeFileUploader(makeFile(), baseSession(), custom, (e) => events.push(e));
  await uploader.start();
  assert.equal(uploader.uploadedBytes, 80);
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.equal(stateEvents[stateEvents.length - 1].state, 'done');
});

await run('s3_expiredUrl_refreshesWithoutConsumingRetry', async () => {
  const presignCountByPart = new Map();
  let part2Attempts = 0;
  const transport = {
    async begin() {
      return baseSession();
    },
    async presign(partNumber) {
      presignCountByPart.set(partNumber, (presignCountByPart.get(partNumber) || 0) + 1);
      return `https://upload/part-${partNumber}`;
    },
    async putPart(url, _body, _headers, _signal) {
      const partNumber = Number(url.split('part-')[1]);
      if (partNumber === 2) {
        part2Attempts++;
        if (part2Attempts <= 6) {
          const err = new Error('Request has expired');
          err.status403 = true;
          err.body = 'Request has expired';
          return { status: 403, etag: null, body: 'Request has expired' };
        }
      }
      return { status: 200, etag: 'etag' };
    },
    async queryOffset() {
      return 0;
    },
    async status() {
      return { completedPartNumbers: [] };
    },
    async heartbeat() {},
    async complete() {
      return { fileId: 'file-1', documentVersion: 2 };
    },
    async abort() {},
    async sha256Base64() {
      return 'c2hhMjU2';
    },
    async sleep() {
      return Promise.resolve();
    },
    now() {
      return 0;
    },
  };
  const events = [];
  const session = baseSession({ expiresAt: new Date(Date.now() - 1000).toISOString() });
  const uploader = new LargeFileUploader(makeFile(), session, transport, (e) => events.push(e));
  await uploader.start();
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.equal(stateEvents[stateEvents.length - 1].state, 'done');
  assert.equal(presignCountByPart.get(2), 7);
});

await run('s3_expiredUrl_perPartExpiry_realSessionStillLongLived', async () => {
  // Fix 5: the real bug only shows up when the SESSION is nowhere near its
  // own (long-lived) expiry but the PART's own short-lived presigned URL
  // has expired. The old code compared against session.expiresAt, which
  // this test deliberately keeps 1 hour out, so a buggy implementation
  // would never treat part 2's 403 as "expired link" and would burn real
  // retry attempts (eventually pausing instead of recovering).
  const presignCountByPart = new Map();
  let part2Attempts = 0;
  const transport = {
    async begin() {
      return baseSession();
    },
    async presign(partNumber) {
      const count = (presignCountByPart.get(partNumber) || 0) + 1;
      presignCountByPart.set(partNumber, count);
      // Part 2's own presigned URL is already expired (short-lived, 10-min
      // window) even though the session itself is fine for another hour.
      const expiresAt =
        partNumber === 2
          ? new Date(Date.now() - 1000).toISOString()
          : new Date(Date.now() + 3600_000).toISOString();
      return { url: `https://upload/part-${partNumber}`, expiresAt };
    },
    async putPart(url, _body, _headers, _signal) {
      const partNumber = Number(url.split('part-')[1]);
      if (partNumber === 2) {
        part2Attempts++;
        if (part2Attempts <= 6) {
          return { status: 403, etag: null, body: 'Request has expired' };
        }
      }
      return { status: 200, etag: 'etag' };
    },
    async queryOffset() {
      return 0;
    },
    async status() {
      return { completedPartNumbers: [] };
    },
    async heartbeat() {},
    async complete() {
      return { fileId: 'file-1', documentVersion: 2 };
    },
    async abort() {},
    async sha256Base64() {
      return 'c2hhMjU2';
    },
    async sleep() {
      return Promise.resolve();
    },
    now() {
      return 0;
    },
  };
  const events = [];
  // Session itself expires in an hour — realistic, nowhere near expired.
  const session = baseSession({ expiresAt: new Date(Date.now() + 3600_000).toISOString() });
  const uploader = new LargeFileUploader(makeFile(), session, transport, (e) => events.push(e));
  await uploader.start();
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.equal(stateEvents[stateEvents.length - 1].state, 'done');
  // Re-presigned every time (free retry), not just once.
  assert.equal(presignCountByPart.get(2), 7);
});

await run('resumable_308_treatedAsProgressNotFailure', async () => {
  // Fix 4: Google answers every non-final chunk PUT with 308 "Resume
  // Incomplete" — this must be treated as progress, using the rangeHeader
  // to compute the next offset, not as a failure to retry/pause on.
  const session = baseSession({ protocol: 'ResumableUri', directUploadUrl: 'https://upload/resumable', partSizeBytes: 40 });
  let call = 0;
  const transport = makeTransport({
    queryOffset: () => 0,
    putChunk: (contentRange) => {
      call++;
      if (call === 1) {
        // First chunk (bytes 0-39/80): server confirms receipt up to byte 39.
        return { status: 308, rangeHeader: 'bytes=0-39', retryAfter: null };
      }
      return { status: 200, rangeHeader: null, retryAfter: null };
    },
  });
  const events = [];
  const uploader = new LargeFileUploader(makeFile(), session, transport, (e) => events.push(e));
  await uploader.start();
  assert.equal(transport.calls.putChunk.length, 2);
  assert.equal(transport.calls.putChunk[1].contentRange, 'bytes 40-79/80');
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.equal(stateEvents[stateEvents.length - 1].state, 'done');
  assert.ok(!stateEvents.some((e) => e.state === 'error'));
});

await run('s3_presignTransientFailure_retriesThenSucceeds', async () => {
  // Fix 3: presign() failing (rejecting) must be retried with the same
  // backoff as putPart, not left to reject start() with no state change.
  let presignAttempts = 0;
  const transport = {
    async begin() {
      return baseSession();
    },
    async presign(partNumber) {
      if (partNumber === 4) {
        presignAttempts++;
        if (presignAttempts <= 2) {
          throw new Error('network blip');
        }
      }
      return `https://upload/part-${partNumber}`;
    },
    async putPart(url) {
      return { status: 200, etag: 'etag' };
    },
    async queryOffset() {
      return 0;
    },
    async status() {
      return { completedPartNumbers: [] };
    },
    async heartbeat() {},
    async complete() {
      return { fileId: 'file-1', documentVersion: 2 };
    },
    async abort() {},
    async sha256Base64() {
      return 'c2hhMjU2';
    },
    async sleep() {
      return Promise.resolve();
    },
    now() {
      return 0;
    },
  };
  const events = [];
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, (e) => events.push(e));
  await uploader.start();
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.equal(stateEvents[stateEvents.length - 1].state, 'done');
  assert.equal(presignAttempts, 3);
});

await run('s3_statusCallFailsRepeatedly_pausesInsteadOfHanging', async () => {
  // Fix 3: transport.status() failing at session start (before any part is
  // attempted) must go through the same retry-then-pause path as a part
  // failure — not reject start() silently with no state transition.
  let statusAttempts = 0;
  const transport = {
    async begin() {
      return baseSession();
    },
    async presign(partNumber) {
      return `https://upload/part-${partNumber}`;
    },
    async putPart() {
      return { status: 200, etag: 'etag' };
    },
    async queryOffset() {
      return 0;
    },
    async status() {
      statusAttempts++;
      throw new Error('503 from server');
    },
    async heartbeat() {},
    async complete() {
      return { fileId: 'file-1', documentVersion: 2 };
    },
    async abort() {},
    async sha256Base64() {
      return 'c2hhMjU2';
    },
    async sleep() {
      return Promise.resolve();
    },
    now() {
      return 0;
    },
  };
  const events = [];
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, (e) => events.push(e));
  await uploader.start();
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.equal(stateEvents[stateEvents.length - 1].state, 'paused');
  assert.ok(statusAttempts > 1);
});

await run('pause_thenImmediateResume_doesNotSurfaceWrongTabError', async () => {
  // Fix 6: pause() must abort in-flight requests so nothing is left
  // "draining" by the time the caller tries to resume right after.
  let putPartCalls = 0;
  let abortSignalSeenAborted = false;
  const transport = {
    async begin() {
      return baseSession();
    },
    async presign(partNumber) {
      return `https://upload/part-${partNumber}`;
    },
    async putPart(url, _body, _headers, signal) {
      putPartCalls++;
      if (putPartCalls === 1) {
        // Simulate an in-flight request that only rejects once aborted.
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            abortSignalSeenAborted = true;
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }
      return { status: 200, etag: 'etag' };
    },
    async queryOffset() {
      return 0;
    },
    async status() {
      return { completedPartNumbers: [] };
    },
    async heartbeat() {},
    async complete() {
      return { fileId: 'file-1', documentVersion: 2 };
    },
    async abort() {},
    async sha256Base64() {
      return 'c2hhMjU2';
    },
    async sleep() {
      return Promise.resolve();
    },
    now() {
      return 0;
    },
  };
  const events = [];
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, (e) => events.push(e));
  const startPromise = uploader.start();
  await new Promise((r) => setTimeout(r, 5));
  uploader.pause();
  await new Promise((r) => setTimeout(r, 5));
  await uploader.resume();
  await startPromise.catch(() => {});
  assert.ok(abortSignalSeenAborted, 'pause() should abort the in-flight request');
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.ok(!stateEvents.some((e) => e.state === 'error'));
  assert.equal(stateEvents[stateEvents.length - 1].state, 'done');
});

await run('s3_fiveFailures_pausesNotAborts', async () => {
  let part3Attempts = 0;
  let abortCalled = 0;
  const transport = {
    async begin() {
      return baseSession();
    },
    async presign(partNumber) {
      return `https://upload/part-${partNumber}`;
    },
    async putPart(url, _body, _headers, _signal) {
      const partNumber = Number(url.split('part-')[1]);
      if (partNumber === 3) {
        part3Attempts++;
        throw new Error('boom');
      }
      return { status: 200, etag: 'etag' };
    },
    async queryOffset() {
      return 0;
    },
    async status() {
      return { completedPartNumbers: [] };
    },
    async heartbeat() {},
    async complete() {
      return { fileId: 'file-1', documentVersion: 2 };
    },
    async abort() {
      abortCalled++;
    },
    async sha256Base64() {
      return 'c2hhMjU2';
    },
    async sleep() {
      return Promise.resolve();
    },
    now() {
      return 0;
    },
  };
  const events = [];
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, (e) => events.push(e));
  await uploader.start();
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.equal(stateEvents[stateEvents.length - 1].state, 'paused');
  assert.equal(abortCalled, 0);
  assert.equal(part3Attempts, 6);
});

await run('resumable_queriesOffsetAndContinues', async () => {
  const session = baseSession({ protocol: 'ResumableUri', directUploadUrl: 'https://upload/resumable' });
  const transport = makeTransport({ queryOffset: () => 40 });
  const uploader = new LargeFileUploader(makeFile(), session, transport, () => {});
  await uploader.start();
  assert.ok(transport.calls.putChunk.length > 0);
  assert.equal(transport.calls.putChunk[0].contentRange, 'bytes 40-47/80');
});

await run('providerLimited_setsStateAndHonorsRetryAfter', async () => {
  let attempts = 0;
  let sleptMs = [];
  const transport = {
    async begin() {
      return baseSession();
    },
    async presign(partNumber) {
      return `https://upload/part-${partNumber}`;
    },
    async putPart(url, _body, _headers, _signal) {
      attempts++;
      if (attempts === 1) {
        throw new ApiCodeError('PROVIDER_LIMITED', 429, 'limited', 3);
      }
      return { status: 200, etag: 'etag' };
    },
    async queryOffset() {
      return 0;
    },
    async status() {
      return { completedPartNumbers: [] };
    },
    async heartbeat() {},
    async complete() {
      return { fileId: 'file-1', documentVersion: 2 };
    },
    async abort() {},
    async sha256Base64() {
      return 'c2hhMjU2';
    },
    async sleep(ms) {
      sleptMs.push(ms);
      return Promise.resolve();
    },
    now() {
      return 0;
    },
  };
  const events = [];
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, (e) => events.push(e));
  await uploader.start();
  const stateEvents = events.filter((e) => e.type === 'state');
  assert.ok(stateEvents.some((e) => e.state === 'provider-limited'));
  assert.ok(sleptMs.includes(3000));
  const last = stateEvents[stateEvents.length - 1];
  assert.equal(last.state, 'done');
});

await run('heartbeat_sentEvery60s', async () => {
  const transport = makeTransport();
  let resolvePutPart;
  let callCount = 0;
  transport.putPart = async (url, _body, headers, _signal) => {
    callCount++;
    transport.calls.putPart.push({ url, headers });
    if (callCount === 1) {
      // Simulate time passing by advancing fake clock before resolving.
      transport.advanceClock(60_000);
    }
    return { status: 200, etag: 'etag' };
  };
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, () => {});
  await uploader.start();
  assert.ok(transport.calls.heartbeat.length >= 1);
});

await run('cancel_callsAbort', async () => {
  let blockFirst = true;
  const transport = {
    async begin() {
      return baseSession();
    },
    async presign(partNumber) {
      return `https://upload/part-${partNumber}`;
    },
    async putPart(url, _body, _headers, _signal) {
      if (blockFirst) {
        blockFirst = false;
        await new Promise(() => {}); // never resolves, simulating in-flight request
      }
      return { status: 200, etag: 'etag' };
    },
    async queryOffset() {
      return 0;
    },
    async status() {
      return { completedPartNumbers: [] };
    },
    async heartbeat() {},
    async complete() {
      return { fileId: 'file-1', documentVersion: 2 };
    },
    abortCalled: 0,
    async abort() {
      this.abortCalled++;
    },
    async sha256Base64() {
      return 'c2hhMjU2';
    },
    async sleep() {
      return Promise.resolve();
    },
    now() {
      return 0;
    },
  };
  const uploader = new LargeFileUploader(makeFile(), baseSession(), transport, () => {});
  const startPromise = uploader.start();
  await new Promise((r) => setTimeout(r, 10));
  await uploader.cancel();
  assert.equal(transport.abortCalled, 1);
});

console.log('ALL PASS: LargeFileUploader behavior suite');
