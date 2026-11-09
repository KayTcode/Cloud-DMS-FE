/**
 * Tests cho src/api/authClient.ts
 * Chạy: node tests/auth-client.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// --- Transpile TypeScript ---
const src = fs.readFileSync('src/api/authClient.ts', 'utf8');
const transpiled = ts.transpileModule(src, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  },
}).outputText;

// --- Web Storage Proxy ném lỗi khi bị chạm ---
function makeStorageProxy(name) {
  return new Proxy({}, {
    get(_, prop) {
      if (typeof prop === 'symbol') return undefined;
      throw new Error(`FORBIDDEN: ${name}.${String(prop)} bị chạm trong auth flow`);
    },
    set(_, prop) {
      throw new Error(`FORBIDDEN: ${name}.${String(prop)} bị set trong auth flow`);
    },
  });
}

// --- Fake BroadcastChannel-like factory ---
function makeChannelFactory() {
  const channels = {};
  return {
    create(name) {
      if (!channels[name]) channels[name] = { listeners: [], messages: [] };
      const ch = channels[name];
      const instance = {
        postMessage(m) { ch.messages.push(m); ch.listeners.forEach(l => l({ data: m })); },
        set onmessage(fn) { ch.listeners.push(fn); },
        get onmessage() { return ch.listeners[ch.listeners.length - 1] || null; },
      };
      return instance;
    },
    getMessages(name) { return channels[name]?.messages ?? []; },
    getChannel(name) { return channels[name]; },
    // helper: inject message into channel from "another tab"
    injectMessage(name, msg) {
      if (!channels[name]) channels[name] = { listeners: [], messages: [] };
      channels[name].listeners.forEach(l => l({ data: msg }));
    },
  };
}

// --- Fake LockManager ---
function makeLocks() {
  // Tuần tự: hàng đợi per tên
  const queues = {};
  return {
    async request(name, cb) {
      if (!queues[name]) queues[name] = Promise.resolve();
      const result = queues[name].then(() => cb());
      queues[name] = result.catch(() => {});
      return result;
    },
  };
}

// --- Fake fetch builder ---
function makeFetch(responses) {
  // responses: Array of { url?, method?, status, body, headers }
  const calls = [];
  let idx = 0;
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    const resp = responses[idx++];
    if (!resp) throw new Error(`Không có response giả lập cho call ${idx}: ${url}`);
    const status = resp.status ?? 200;
    const bodyStr = typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body ?? {});
    const headers = new Map(Object.entries(resp.headers ?? {}));
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get(k) { return headers.get(k.toLowerCase()) ?? headers.get(k) ?? null; },
      },
      async json() { return JSON.parse(bodyStr); },
      async text() { return bodyStr; },
    };
  };
  fetch.calls = calls;
  return fetch;
}

// --- Module loader ---
function loadModule(fetch, locks, channelFactory) {
  const exportsObj = {};
  const channelInstances = {};
  const createChannel = (name) => {
    if (!channelInstances[name]) channelInstances[name] = channelFactory.create(name);
    return channelInstances[name];
  };
  vm.runInNewContext(transpiled, {
    exports: exportsObj,
    require: (mod) => {
      if (mod === 'typescript') return ts;
      throw new Error(`require('${mod}') không được hỗ trợ trong test vm`);
    },
    console,
    Error,
    TypeError,
    RangeError,
    Promise,
    Map,
    Set,
    Date,
    setTimeout,
    clearTimeout,
    globalThis: {
      localStorage: makeStorageProxy('localStorage'),
      sessionStorage: makeStorageProxy('sessionStorage'),
    },
    localStorage: makeStorageProxy('localStorage'),
    sessionStorage: makeStorageProxy('sessionStorage'),
  });
  return { mod: exportsObj, createChannel, channelInstances };
}

function makeClient(fetchResponses, { origin = 'https://localhost:8443' } = {}) {
  const fetch = makeFetch(fetchResponses);
  const locks = makeLocks();
  const channelFactory = makeChannelFactory();
  const { mod, createChannel, channelInstances } = loadModule(fetch, locks, channelFactory);
  const client = mod.createAuthClient({ fetch, locks, createChannel, origin });
  return { client, fetch, channelFactory, channelInstances, mod };
}

// ============================================================
// Helpers
// ============================================================
function csrfResp(token = 'csrf-1') {
  return { status: 200, body: { requestToken: token } };
}
function loginOkResp(tok = 'tok-1') {
  return { status: 200, body: { accessToken: tok } };
}
function refreshOkResp(tok = 'tok-refresh-1') {
  return { status: 200, body: { accessToken: tok } };
}

// ============================================================
// Tests
// ============================================================
const tests = {};

tests['login_fetchesCsrfThenPostsWithHeader'] = async () => {
  const { client, fetch: f } = makeClient([
    csrfResp('csrf-1'),
    loginOkResp('tok-1'),
  ]);
  const result = await client.login('a@b.c', 'p');
  assert.equal(result, true, 'login phải trả true');
  assert.equal(client.accessToken(), 'tok-1', 'accessToken phải là tok-1');
  assert.equal(f.calls.length, 2, 'phải có đúng 2 lần fetch');
  // Call 1: GET CSRF
  assert.match(f.calls[0].url, /\/api\/auth\/csrf/);
  assert.equal((f.calls[0].init?.method ?? 'GET').toUpperCase(), 'GET');
  assert.equal(f.calls[0].init?.credentials, 'include');
  // Call 2: POST login
  assert.match(f.calls[1].url, /\/api\/auth\/login/);
  assert.equal(f.calls[1].init?.method?.toUpperCase(), 'POST');
  const body = JSON.parse(f.calls[1].init?.body ?? '{}');
  assert.equal(body.email, 'a@b.c');
  assert.equal(body.password, 'p');
  const headers = f.calls[1].init?.headers ?? {};
  const csrf = typeof headers.get === 'function' ? headers.get('X-CSRF-TOKEN') : headers['X-CSRF-TOKEN'];
  assert.equal(csrf, 'csrf-1', 'phải có X-CSRF-TOKEN: csrf-1');
};

tests['neverTouchesWebStorage'] = async () => {
  const { client } = makeClient([
    csrfResp(), loginOkResp('tok-a'),       // login
    csrfResp(), refreshOkResp('tok-b'),     // refresh
    csrfResp(), { status: 200, body: {} },  // logout
  ]);
  await client.login('x@y.z', 'pass');
  await client.refresh();
  await client.logout();
  // Nếu có chạm Storage sẽ ném lỗi trước đó
};

tests['concurrentRefresh_singleFlight'] = async () => {
  // Chỉ 1 cặp CSRF+refresh được gọi dù 2 lần refresh song song
  const { client, fetch: f } = makeClient([
    csrfResp(), loginOkResp('tok-0'),           // login
    csrfResp('csrf-r'), refreshOkResp('tok-r'), // 1 lần refresh
  ]);
  await client.login('a@b.c', 'p');
  const beforeCalls = f.calls.length;
  await Promise.all([client.refresh(), client.refresh()]);
  const refreshCalls = f.calls.slice(beforeCalls).filter(c =>
    typeof c.url === 'string' && c.url.includes('/auth/refresh')
  );
  assert.equal(refreshCalls.length, 1, 'chỉ 1 lần POST /auth/refresh');
};

tests['refresh401_stopsFurtherRefresh'] = async () => {
  const { client, fetch: f, channelFactory } = makeClient([
    csrfResp(), loginOkResp('tok-x'),
    csrfResp(), { status: 401, body: {} },   // refresh -> 401
  ]);
  await client.login('a@b.c', 'p');
  const r1 = await client.refresh();
  assert.equal(r1, false, 'refresh 401 phải trả false');
  // Kênh phải nhận logout
  const msgs = channelFactory.getMessages('cloud-dms-auth');
  assert.ok(msgs.some(m => m.type === 'logout'), 'kênh phải nhận {type:"logout"}');
  // Lần refresh thêm: false, không thêm fetch
  const callsBefore = f.calls.length;
  const r2 = await client.refresh();
  assert.equal(r2, false, 'refresh lần 2 phải false');
  assert.equal(f.calls.length, callsBefore, 'không thêm fetch sau khi đã logout');
};

tests['refresh503_keepsSessionAndThrows'] = async () => {
  const { client, mod } = makeClient([
    csrfResp(), loginOkResp('tok-keep'),
    csrfResp(), { status: 503, body: {} },
  ]);
  await client.login('a@b.c', 'p');
  let threw = null;
  try {
    await client.refresh();
  } catch (e) {
    threw = e;
  }
  assert.ok(threw, 'refresh 503 phải ném lỗi');
  assert.equal(threw.status, 503, 'AuthRequestError.status phải là 503');
  assert.equal(client.accessToken(), 'tok-keep', 'token cũ phải được giữ lại');
};

tests['logoutBroadcast_clearsOtherTab'] = async () => {
  const { client, channelFactory } = makeClient([
    csrfResp(), loginOkResp('tok-tab'),
  ]);
  await client.login('a@b.c', 'p');
  const events = [];
  client.onSessionEvent(type => events.push(type));
  // Inject logout từ "tab khác"
  channelFactory.injectMessage('cloud-dms-auth', { type: 'logout', epoch: 'e1' });
  // Cho microtask queue chạy
  await new Promise(r => setTimeout(r, 0));
  assert.equal(client.accessToken(), null, 'accessToken phải null sau logout broadcast');
  assert.ok(events.includes('logout'), 'listener phải nhận logout');
};

tests['rejectsNonHttpsOrigin'] = async () => {
  const fetch = makeFetch([]);
  const locks = makeLocks();
  const channelFactory = makeChannelFactory();
  const { mod } = loadModule(fetch, locks, channelFactory);
  assert.throws(
    () => mod.createAuthClient({ fetch, locks, createChannel: channelFactory.create.bind(channelFactory), origin: 'http://localhost:3000' }),
    TypeError,
    'phải ném TypeError khi origin không phải https'
  );
};

tests['login429_exposesRetryAfter'] = async () => {
  const { client, mod } = makeClient([
    csrfResp(),
    { status: 429, body: {}, headers: { 'retry-after': '60' } },
  ]);
  let err = null;
  try {
    await client.login('a@b.c', 'p');
  } catch (e) {
    err = e;
  }
  assert.ok(err, 'phải ném lỗi khi 429');
  assert.equal(err.status, 429);
  assert.equal(err.retryAfterSeconds, 60);
};

tests['acceptInvitation_postsTokenAndPassword'] = async () => {
  const { client, fetch: f } = makeClient([
    csrfResp('csrf-inv'),
    { status: 200, body: { accessToken: 'tok-inv' } },
  ]);
  const result = await client.acceptInvitation('t', 'pw');
  assert.equal(result, true);
  assert.equal(client.accessToken(), 'tok-inv');
  const body = JSON.parse(f.calls[1].init?.body ?? '{}');
  assert.equal(body.token, 't');
  assert.equal(body.newPassword, 'pw');
  const headers = f.calls[1].init?.headers ?? {};
  const csrf = typeof headers.get === 'function' ? headers.get('X-CSRF-TOKEN') : headers['X-CSRF-TOKEN'];
  assert.equal(csrf, 'csrf-inv');
};

tests['bootstrap_callsRefreshNotProfile'] = async () => {
  const { client, fetch: f } = makeClient([
    csrfResp('csrf-bs'),
    { status: 200, body: { accessToken: 'tok-b' } },
  ]);
  const result = await client.bootstrap();
  assert.equal(result, true, 'bootstrap phải trả true');
  assert.equal(client.accessToken(), 'tok-b', 'accessToken phải là tok-b');
  const hasMe = f.calls.some(c => typeof c.url === 'string' && c.url.includes('/auth/me'));
  assert.equal(hasMe, false, 'không được gọi /auth/me');
  const hasRefresh = f.calls.some(c => typeof c.url === 'string' && c.url.includes('/auth/refresh'));
  assert.equal(hasRefresh, true, 'phải gọi /auth/refresh');
};

// ============================================================
// Runner
// ============================================================
let passed = 0, failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${e.message}`);
    failed++;
  }
}
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
