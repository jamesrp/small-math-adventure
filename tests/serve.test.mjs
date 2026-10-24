// The local server (scripts/serve.mjs) that the browser suites use: a missing
// file is a 404, but a read that fails for another reason is retried and then
// reported as a 500 with its error code, never passed off as a missing file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { distHandler } from '../scripts/serve.mjs';

const root = resolve('/srv/app');
const fail = code => Object.assign(new Error(code), { code });
async function ask(handler, url) {
  const res = { status: 0, headers: {}, body: '', writeHead(status, headers) { this.status = status; this.headers = headers || {}; }, end(body = '') { this.body = String(body); } };
  await handler({ url, headers: {} }, res);
  return res;
}

test('the dev server: 200 for a file, 404 only for a missing one', async () => {
  const seen = [], logged = [];
  const handler = distHandler({ root, previews: null, onResponse: r => seen.push(r), log: m => logged.push(m), read: async file => { if (file === resolve(root, 'main.js')) return Buffer.from('x'); throw fail('ENOENT'); } });
  assert.equal((await ask(handler, '/main.js')).status, 200);
  assert.equal((await ask(handler, '/nope.js')).status, 404);
  assert.deepEqual(seen.map(r => [r.path, r.status]), [['/main.js', 200], ['/nope.js', 404]]);
  assert.deepEqual(logged, [], 'a missing file is not an error');
});

test('the dev server retries a read that fails for another reason, then answers 500 with the code', async () => {
  let tries = 0;
  const flaky = distHandler({ root, previews: null, log: () => {}, read: async () => { if (++tries < 3) throw fail('EMFILE'); return Buffer.from('ok'); } });
  const res = await ask(flaky, '/families/stars/stars.js');
  assert.equal(res.status, 200); assert.equal(res.body, 'ok'); assert.equal(tries, 3, 'two transient failures, then the file');
  const seen = [], logged = [];
  const broken = distHandler({ root, previews: null, onResponse: r => seen.push(r), log: m => logged.push(m), read: async () => { throw fail('EIO'); } });
  const bad = await ask(broken, '/families/stars/stars.js');
  assert.equal(bad.status, 500); assert.match(bad.body, /EIO/);
  assert.deepEqual(seen, [{ path: '/families/stars/stars.js', status: 500, code: 'EIO' }]);
  assert.deepEqual(logged, ['serve: /families/stars/stars.js: EIO']);
});
