import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { api } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function mockRequests() {
  const calls = [];
  globalThis.fetch = (url, options) => new Promise(resolve => {
    calls.push({ url, options, finish: (data = [], status = 200) => resolve(new Response(JSON.stringify(data), { status })) });
  });
  return calls;
}

test('parallel reads share a request, completed results are not globally cached', async () => {
  const calls = mockRequests();
  const first = api('/clients');
  const second = api('/clients');
  assert.equal(calls.length, 1);
  calls[0].finish([{ id: 1 }]);
  assert.deepEqual(await first, await second);
  const fresh = api('/clients');
  assert.equal(calls.length, 2);
  calls[1].finish([{ id: 2 }]);
  assert.deepEqual(await fresh, [{ id: 2 }]);
});

test('different dates do not share a request', async () => {
  const calls = mockRequests();
  const first = api('/availability?date=2026-10-16');
  const second = api('/availability?date=2026-10-17');
  assert.equal(calls.length, 2);
  calls.forEach(call => call.finish());
  await Promise.all([first, second]);
});

test('failed reads can be retried', async () => {
  const calls = mockRequests();
  const failed = api('/retry');
  calls[0].finish({ error: 'Unavailable' }, 503);
  await assert.rejects(failed, { status: 503 });
  const retry = api('/retry');
  assert.equal(calls.length, 2);
  calls[1].finish();
  await retry;
});

test('mutations are never deduplicated', async () => {
  const calls = mockRequests();
  const first = api('/bookings', { workplaceId: 1 });
  const second = api('/bookings', { workplaceId: 2 });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, 'POST');
  calls.forEach(call => call.finish());
  await Promise.all([first, second]);
});

test('a mutation invalidates pending reads without letting old completions evict new reads', async () => {
  const calls = mockRequests();
  const old = api('/auth/me');
  const mutation = api('/auth/login', {});
  calls[1].finish();
  await mutation;
  const fresh = api('/auth/me');
  assert.equal(calls.length, 3);
  calls[0].finish({ id: 1 });
  await old;
  const shared = api('/auth/me');
  assert.equal(calls.length, 3);
  calls[2].finish({ id: 2 });
  assert.deepEqual(await fresh, { id: 2 });
  assert.deepEqual(await shared, { id: 2 });
});
