import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadModule(path) {
  const exportsObj = {};
  const context = { exports: exportsObj, module: { exports: exportsObj }, Promise, console, Error };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context
  );
  return exportsObj;
}

const {
  downloadViaLinkCore,
  UNSCANNED_DOWNLOAD_DISABLED_MESSAGE,
  TOO_MANY_DOWNLOADS_MESSAGE,
} = loadModule('src/services/download/linkDownloadCore.ts');

function codeError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function fakeDocument(clicks) {
  return {
    createElement: (tag) => {
      assert.equal(tag, 'a');
      const anchor = {
        href: '',
        click: () => clicks.push(anchor.href),
        remove: () => {},
      };
      return anchor;
    },
    body: { appendChild: () => {} },
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

await run('clean_clicksLinkOnce', async () => {
  const clicks = [];
  const createDownloadLink = async (fileId, ack) => {
    assert.equal(fileId, 'file-1');
    assert.equal(ack, false);
    return { url: 'https://cdn.example.com/file-1' };
  };
  await downloadViaLinkCore('file-1', { confirmUnscanned: async () => { throw new Error('should not be called'); } }, {
    createDownloadLink,
    document: fakeDocument(clicks),
  });
  assert.deepEqual(clicks, ['https://cdn.example.com/file-1']);
});

await run('unscanned_asksConfirmThenRetriesWithAck', async () => {
  const clicks = [];
  const calls = [];
  const createDownloadLink = async (fileId, ack) => {
    calls.push(ack);
    if (!ack) throw codeError('UNSCANNED_ACK_REQUIRED');
    return { url: 'https://cdn.example.com/file-2' };
  };
  let askedConfirm = false;
  await downloadViaLinkCore('file-2', {
    confirmUnscanned: async () => { askedConfirm = true; return true; },
  }, {
    createDownloadLink,
    document: fakeDocument(clicks),
  });
  assert.equal(askedConfirm, true);
  assert.deepEqual(calls, [false, true]);
  assert.deepEqual(clicks, ['https://cdn.example.com/file-2']);
});

await run('unscanned_userCancels_noClick', async () => {
  const clicks = [];
  const calls = [];
  const createDownloadLink = async (fileId, ack) => {
    calls.push(ack);
    if (!ack) throw codeError('UNSCANNED_ACK_REQUIRED');
    return { url: 'https://cdn.example.com/file-3' };
  };
  await downloadViaLinkCore('file-3', {
    confirmUnscanned: async () => false,
  }, {
    createDownloadLink,
    document: fakeDocument(clicks),
  });
  assert.deepEqual(calls, [false]);
  assert.deepEqual(clicks, []);
});

await run('policyDisabled_throwsFixedMessage', async () => {
  const clicks = [];
  const createDownloadLink = async () => { throw codeError('UNSCANNED_DOWNLOAD_DISABLED'); };
  await assert.rejects(
    () => downloadViaLinkCore('file-4', { confirmUnscanned: async () => true }, {
      createDownloadLink,
      document: fakeDocument(clicks),
    }),
    (err) => err.message === UNSCANNED_DOWNLOAD_DISABLED_MESSAGE
  );
  assert.deepEqual(clicks, []);

  const tooManyCreate = async () => { throw codeError('TOO_MANY_DOWNLOADS'); };
  await assert.rejects(
    () => downloadViaLinkCore('file-4b', { confirmUnscanned: async () => true }, {
      createDownloadLink: tooManyCreate,
      document: fakeDocument(clicks),
    }),
    (err) => err.message === TOO_MANY_DOWNLOADS_MESSAGE
  );
});

await run('packageFile_fallsBackToLegacy', async () => {
  const clicks = [];
  const createDownloadLink = async () => { throw codeError('USE_PACKAGE_DOWNLOAD'); };
  await assert.rejects(
    () => downloadViaLinkCore('file-5', { confirmUnscanned: async () => true }, {
      createDownloadLink,
      document: fakeDocument(clicks),
    }),
    (err) => err.code === 'USE_PACKAGE_DOWNLOAD'
  );
  assert.deepEqual(clicks, []);
});

await run('fixedMessages_matchSpecVerbatim', async () => {
  assert.equal(
    UNSCANNED_DOWNLOAD_DISABLED_MESSAGE,
    'Tổ chức của bạn không cho phép tải tệp chưa được quét virus.'
  );
  assert.equal(
    TOO_MANY_DOWNLOADS_MESSAGE,
    'Bạn đang tải quá nhiều tệp cùng lúc, vui lòng thử lại sau.'
  );
});

await run('unscanned_usesSuppliedConfirmUnscanned_notWindowConfirm', async () => {
  const clicks = [];
  const calls = [];
  const createDownloadLink = async (fileId, ack) => {
    calls.push(ack);
    if (!ack) throw codeError('UNSCANNED_ACK_REQUIRED');
    return { url: 'https://cdn.example.com/file-6' };
  };
  let dialogWasAsked = false;
  // Simulates a caller passing a real-dialog-backed confirmUnscanned
  // (e.g. DriveView's UnscannedDownloadDialog) instead of window.confirm.
  const confirmUnscanned = async () => { dialogWasAsked = true; return true; };
  await downloadViaLinkCore('file-6', { confirmUnscanned }, {
    createDownloadLink,
    document: fakeDocument(clicks),
  });
  assert.equal(dialogWasAsked, true);
  assert.deepEqual(calls, [false, true]);
  assert.deepEqual(clicks, ['https://cdn.example.com/file-6']);
});

console.log('PASS: downloadViaLink handles clean/unscanned-ack/disabled/rate-limit/package-fallback flows');
