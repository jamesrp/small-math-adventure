// The service worker answers a cached file from memory, not by handing the
// cached response on. A cached body streams to the page through a pipe, and on
// a busy machine Chromium now and then aborts that stream (net::ERR_ABORTED,
// "Body reading completed" in its trace), which stopped the app at start-up
// (scripts/reload-stress.mjs, docs/VALIDATION.md, October 24). Read in the
// worker, a failed read is seen there: the worker reads once more, then asks
// the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
const scope = 'https://jamesrp.github.io/small-math-adventure/';

// dist/sw.js against a stand-in worker global whose cache holds `files`
// (path → body, or a list of bodies and errors to give out read by read).
// `art` is what the art cache already holds and `online` what the network
// gives for art (path → body); other network requests answer 'network'.
function worker(files, { art = {}, online = {} } = {}) {
  const listeners = {}, reads = [], network = [], stored = [];
  const media = (body, headers = { 'Content-Type': 'audio/mpeg' }) => ({ status: 200, headers: new Map(Object.entries(headers)), arrayBuffer: async () => new TextEncoder().encode(body).buffer, clone() { return this; } });
  const entry = path => {
    const plan = files[path];
    if (plan === undefined) return undefined;
    return { status: 200, statusText: 'OK', headers: { 'Content-Type': 'text/javascript' }, arrayBuffer: async () => {
      reads.push(path);
      const next = Array.isArray(plan) ? plan.shift() : plan;
      if (next instanceof Error) throw next;
      return new TextEncoder().encode(next).buffer;
    } };
  };
  const pathOf = request => new URL(typeof request === 'string' ? request : request.url, scope).pathname.replace('/small-math-adventure/', '') || 'index.html';
  const cache = { match: async request => entry(pathOf(request)), put: async () => {}, addAll: async () => {} };
  const artCache = { put: async key => { stored.push(pathOf(key)); } };
  class Response { constructor(body, init) { this.body = body == null ? null : new TextDecoder().decode(body); this.init = init; } }
  vm.runInNewContext(source, { self: { location: new URL('sw.js', scope), addEventListener: (type, fn) => { listeners[type] = fn; }, clients: { claim: async () => {} }, skipWaiting() {} }, URL, Response,
    caches: { open: async name => name.includes('-art-') ? artCache : cache, match: async key => art[pathOf(key)] === undefined ? undefined : media(art[pathOf(key)]), keys: async () => [] },
    fetch: async request => { const path = pathOf(request); network.push(path); return online[path] === undefined ? 'network' : media(online[path]); } });
  return {
    reads, network, stored,
    async get(path, mode = 'cors', headers = {}) {
      let answer;
      listeners.fetch({ request: { url: new URL(path, scope).href, method: 'GET', mode, headers: new Map(Object.entries(headers)) }, respondWith: promise => { answer = promise; } });
      return answer;
    },
  };
}

test('the worker answers a cached file from memory, with its status and headers', async () => {
  const w = worker({ 'families/stars/stars.js': 'export default 1;' });
  const answer = await w.get('families/stars/stars.js');
  assert.equal(answer.body, 'export default 1;');
  assert.deepEqual(JSON.parse(JSON.stringify(answer.init)), { status: 200, statusText: 'OK', headers: { 'Content-Type': 'text/javascript' } });
  assert.deepEqual(w.reads, ['families/stars/stars.js']); assert.deepEqual(w.network, []);
});

test('a cached read that fails is read once more, then the network is asked', async () => {
  const once = worker({ 'families/meeting/meeting.js': [new TypeError('Failed to fetch'), 'export default 2;'] });
  assert.equal((await once.get('families/meeting/meeting.js')).body, 'export default 2;');
  assert.deepEqual(once.reads, ['families/meeting/meeting.js', 'families/meeting/meeting.js']); assert.deepEqual(once.network, []);
  const twice = worker({ 'families/orchard/orchard.js': [new TypeError('Failed to fetch'), new TypeError('Failed to fetch')] });
  assert.equal(await twice.get('families/orchard/orchard.js'), 'network');
  assert.deepEqual(twice.network, ['families/orchard/orchard.js']);
});

test('a page opens from the cached index.html, and files the cache lacks come from the network', async () => {
  const w = worker({ 'index.html': '<!doctype html>' });
  assert.equal((await w.get('#play/road4-ferry-seats-k1/ferry-seats', 'navigate')).body, '<!doctype html>');
  assert.equal(await w.get('click-echo.js'), 'network');
});

test('art voice and video still go to the art cache, with byte ranges cut from the cached file', async () => {
  const voice = worker({}, { art: { 'art/voice/hops/hello.mp3': '0123456789' } });
  const part = await voice.get('art/voice/hops/hello.mp3', 'no-cors', { range: 'bytes=2-5' });
  assert.equal(part.body, '2345');
  assert.equal(part.init.status, 206);
  assert.equal(part.init.headers['Content-Range'], 'bytes 2-5/10');
  assert.equal(part.init.headers['Content-Type'], 'audio/mpeg');
  assert.equal((await voice.get('art/voice/hops/hello.mp3', 'no-cors', { range: 'bytes=20-' })).init.status, 416);
  assert.deepEqual(voice.reads, []); assert.deepEqual(voice.network, []);
  // A video seen for the first time is fetched whole, kept, and its range cut from it.
  const video = worker({}, { online: { 'art/scenes/ferry.mp4': 'abcdefghij' } });
  assert.equal((await video.get('art/scenes/ferry.mp4', 'no-cors', { range: 'bytes=-3' })).body, 'hij');
  assert.deepEqual(video.network, ['art/scenes/ferry.mp4']); assert.deepEqual(video.stored, ['art/scenes/ferry.mp4']);
});
