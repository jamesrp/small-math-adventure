// Preview copies for testers (scripts/preview.mjs): their own save keys, no
// service worker, and a live worker that leaves ./preview/ to the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, rmSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {SAVE_KEY, BACKUP_KEY, REPAIR_KEY, saveKeys} from '../dist/storage.js';
import {PREVIEW} from '../dist/preview.js';
import {buildPreview, checkItem, previewModule, previewUrl, rename, retitle, DIST} from '../scripts/preview.mjs';

test('the live app keeps its save keys; each preview has its own', () => {
  assert.equal(PREVIEW, null);
  assert.equal(SAVE_KEY, 'small-math-adventure:saves:v1');
  assert.equal(BACKUP_KEY, 'small-math-adventure:previous:v1');
  assert.equal(REPAIR_KEY, 'small-math-adventure:before-repair:v1');
  const live = Object.values(saveKeys(null)), a = Object.values(saveKeys('road-ferry')), b = Object.values(saveKeys('road-ferry-2'));
  assert.equal(new Set([...live, ...a, ...b]).size, 9);
  for (const key of [...a, ...b]) assert.ok(key.startsWith('small-math-adventure:preview:'), key);
});

test('preview names are short lowercase slugs', () => {
  for (const ok of ['a', 'shares-fix', 'wave-9', 'x'.repeat(40)]) assert.equal(checkItem(ok), ok);
  for (const bad of ['', 'Shares', '-a', 'a-', 'a/b', '../a', 'a b', 'a.b', 'x'.repeat(41), null, 3]) assert.throws(() => checkItem(bad), /preview name/);
  assert.equal(previewUrl('shares-fix'), 'https://jamesrp.github.io/small-math-adventure/preview/shares-fix/');
  assert.match(previewModule('shares-fix'), /^export const PREVIEW = "shares-fix";$/m);
});

test('a preview names itself in the tab and the manifest', () => {
  assert.equal(retitle('<head><title>The Lantern Caravan</title></head>', 'x'), '<head><title>Preview x · The Lantern Caravan</title></head>');
  assert.throws(() => retitle('<head></head>', 'x'), /one <title>/);
  const manifest = JSON.parse(rename(JSON.stringify({id: './', name: 'The Lantern Caravan', short_name: 'Lantern Caravan', start_url: './', scope: './'}), 'x'));
  assert.deepEqual(manifest, {id: './', name: 'Preview x · The Lantern Caravan', short_name: 'Preview x', start_url: './', scope: './'});
});

test('a built preview is dist without a worker, with its own keys', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'preview-test-'));
  try {
    const out = await buildPreview('unit-check', {to: join(dir, 'preview', 'unit-check')});
    assert.equal(existsSync(join(out, 'sw.js')), false);
    for (const file of ['main.js', 'puzzles.json', 'families.js', 'art/manifest.json']) {
      assert.deepEqual(await readFile(join(out, file)), await readFile(join(DIST, file)), file);
    }
    assert.match(await readFile(join(out, 'index.html'), 'utf8'), /<title>Preview unit-check · The Lantern Caravan<\/title>/);
    assert.equal(JSON.parse(await readFile(join(out, 'manifest.webmanifest'), 'utf8')).scope, './');
    const built = await import(pathToFileURL(join(out, 'storage.js')).href);
    assert.deepEqual([built.SAVE_KEY, built.BACKUP_KEY], ['small-math-adventure:preview:unit-check:saves:v1', 'small-math-adventure:preview:unit-check:previous:v1']);
    await assert.rejects(buildPreview('unit-check', {to: join(DIST, 'preview', 'unit-check')}), /inside dist/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

// Runs dist/sw.js against a stand-in for the worker global and reports which
// requests it answers. A request it leaves alone goes to the network.
async function workerAnswers(source, scope) {
  const listeners = {};
  const cache = {match: async () => undefined, put: async () => {}, addAll: async () => {}};
  const self = {location: new URL('sw.js', scope), addEventListener: (type, fn) => { listeners[type] = fn; }, clients: {claim: async () => {}}};
  vm.runInNewContext(source, {self, URL, Response: class {}, caches: {open: async () => cache, match: async () => undefined, keys: async () => []}, fetch: async () => 'network'});
  return async (path, mode = 'no-cors') => {
    let answered = false;
    listeners.fetch({request: {url: new URL(path, scope).href, method: 'GET', mode, headers: new Map()}, respondWith: async response => { answered = true; await response; }});
    return answered;
  };
}

test('the live worker leaves preview requests to the network and still answers its own', async () => {
  const source = await readFile(join(DIST, 'sw.js'), 'utf8');
  for (const scope of ['https://jamesrp.github.io/small-math-adventure/', 'http://127.0.0.1:4187/']) {
    const answers = await workerAnswers(source, scope);
    for (const path of ['preview/shares-fix/', 'preview/shares-fix/index.html', 'preview/shares-fix/main.js', 'preview/x/art/keeper/snooze/idle.webp', 'preview/x/art/clip.mp4']) {
      assert.equal(await answers(path, path.endsWith('/') ? 'navigate' : 'no-cors'), false, `${scope}${path}`);
    }
    for (const path of ['', 'index.html', 'main.js', 'preview.js', 'previews/x/', 'art/keeper/snooze/idle.webp', 'art/clip.mp4']) {
      assert.equal(await answers(path, path === '' ? 'navigate' : 'no-cors'), true, `${scope}${path}`);
    }
  }
  // The worker before the pass-through answered a preview's page with the live one.
  const before = source.replace('||url.pathname.startsWith(PREVIEWS)', '');
  assert.notEqual(before, source);
  assert.equal(await (await workerAnswers(before, 'https://jamesrp.github.io/small-math-adventure/'))('preview/shares-fix/', 'navigate'), true);
});

test('the production deploy keeps preview copies and never builds one', async () => {
  const deploy = await readFile(new URL('../scripts/deploy.mjs', import.meta.url), 'utf8');
  assert.match(deploy, /'--exclude=\/preview\/'/);
  assert.doesNotMatch(deploy, /preview\.mjs'|buildPreview/);
});
