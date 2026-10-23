// Preview links (scripts/preview.mjs) in a real browser. Lays out a folder like
// gh-pages, with the live app at /small-math-adventure/ and a preview at
// /small-math-adventure/preview/suite-check/, serves it with scripts/serve.mjs
// and checks, each in a fresh browser profile:
//  - saves made in the preview never reach the live app and the other way
//    round, and Clear in one leaves the other alone;
//  - once the live worker is installed, the preview still loads its own files
//    from the network, and offline it gets no live page in their place;
//  - the preview registers no worker and opens no caches, and the live app
//    stays ready for offline play;
//  - with the worker that is live today (before its ./preview/ pass-through is
//    deployed) the preview opens in the live page shell but still runs its own
//    code with its own saves.
// Starts its own server (PORT, default 4193); uses the same browser environment
// variables as browser-smoke.mjs. Results go in ignored test-results/preview/.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {waitForOffline} from './browser-offline.mjs';
import {buildPreview, DIST} from './preview.mjs';
import {saveKeys} from '../dist/storage.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const results = new URL('../test-results/preview/', import.meta.url), site = fileURLToPath(new URL('site/', results));
const shot = name => fileURLToPath(new URL(`${name}.png`, results));
const item = 'suite-check', LIVE = saveKeys(null), MINE = saveKeys(item);
const port = Number(process.env.PORT || 4193), origin = `http://127.0.0.1:${port}`;
// Today's live worker is this one without its pass-through line.
const passThrough = '||url.pathname.startsWith(PREVIEWS)';

await rm(site, {recursive: true, force: true});
for (const app of ['small-math-adventure', 'deployed/small-math-adventure']) {
  await cp(DIST, `${site}${app}`, {recursive: true});
  await buildPreview(item, {to: `${site}${app}/preview/${item}`});
}
const worker = await readFile(`${site}deployed/small-math-adventure/sw.js`, 'utf8');
assert.ok(worker.includes(passThrough), 'the live worker has its pass-through');
await writeFile(`${site}deployed/small-math-adventure/sw.js`, worker.replace(passThrough, ''));

const server = spawn(process.execPath, [fileURLToPath(new URL('serve.mjs', import.meta.url))], {env: {...process.env, SERVE_ROOT: site, PORT: String(port)}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('exit', code => reject(new Error(`serve.mjs exited (${code})`))); });
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const report = {checks: [], errors: []};
const check = text => { report.checks.push(text); console.log(`ok - ${text}`); };

async function fresh(app = 'small-math-adventure') {
  const context = await browser.newContext({viewport: {width: 1024, height: 768}});
  const page = await context.newPage(), responses = [];
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => responses.push({url: response.url(), worker: response.fromServiceWorker()}));
  const live = `${origin}/${app}/`, preview = `${live}preview/${item}/`;
  const names = keys => page.evaluate(key => (JSON.parse(localStorage.getItem(key) || 'null')?.profiles || []).map(p => p.name), keys.save);
  const keys = () => page.evaluate(() => Object.keys(localStorage).sort());
  const open = async (url, wait = '#app > *') => { responses.length = 0; await page.goto(url); await page.locator(wait).first().waitFor(); };
  async function explorer(name, keys) {
    await page.locator('#nickname').fill(name);
    await page.locator('#profile-form button[type=submit]').click();
    await page.waitForFunction(([key, name]) => JSON.parse(localStorage.getItem(key) || 'null')?.profiles?.some(p => p.name === name), [keys.save, name]);
  }
  async function solveFirstCups() {
    await page.goto(`${page.url().split('#')[0]}#play/swap-k1-01`);
    await page.locator('[data-action=swap-pair]').first().click();
    await page.getByRole('heading', {name: 'Solved', exact: true}).waitFor();
  }
  async function grownUps() {
    await page.getByRole('button', {name: 'Grown-ups', exact: true}).click();
    await page.getByRole('button', {name: 'I’m a grown-up', exact: true}).click();
    await page.locator('.parent-layout').waitFor();
  }
  async function clear() {
    await grownUps();
    await page.getByRole('button', {name: 'Clear all local data', exact: true}).click();
    await page.getByRole('button', {name: 'Clear adventure data', exact: true}).click();
    await page.locator('#nickname').waitFor();
  }
  const workers = () => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => ({scope: r.scope, script: (r.active || r.waiting || r.installing)?.scriptURL})));
  const cacheNames = () => page.evaluate(() => caches.keys());
  // Every file the page fetched from this site came from the preview's folder, over the network.
  function ownFiles(expectWorker = false) {
    const mine = responses.filter(r => r.url.startsWith(origin));
    assert.ok(mine.some(r => r.url === `${preview}main.js`) && mine.some(r => r.url === `${preview}preview.js`), 'the preview loaded its own scripts');
    for (const r of mine) {
      assert.ok(r.url.startsWith(preview), `${r.url} is outside the preview`);
      if (!expectWorker) assert.equal(r.worker, false, `${r.url} came from a service worker`);
    }
    return mine.length;
  }
  return {context, page, live, preview, names, keys, open, explorer, solveFirstCups, grownUps, clear, workers, cacheNames, ownFiles};
}

try {
  await mkdir(results, {recursive: true});

  // 1. Live first, then the preview, in one browser profile.
  {
    const b = await fresh(), {page} = b;
    await b.open(b.live, '#nickname');
    await b.explorer('Lila', LIVE);
    await waitForOffline(page);
    const liveSave = await page.evaluate(key => localStorage.getItem(key), LIVE.save);
    const liveWorker = [{scope: b.live, script: `${b.live}sw.js`}];
    assert.deepEqual(await b.workers(), liveWorker);
    const liveCaches = await b.cacheNames();

    await b.open(b.preview, '#nickname');
    assert.equal(await page.title(), `Preview ${item} · The Lantern Caravan`);
    const files = b.ownFiles();
    check(`with the live worker installed, the preview loaded its own ${files} files from the network`);
    assert.equal(await page.locator('#app').innerText().then(text => text.includes('Lila')), false);
    assert.deepEqual(await b.names(MINE), []);
    await b.explorer('Pia', MINE);
    await b.solveFirstCups();
    const previewSave = JSON.parse(await page.evaluate(key => localStorage.getItem(key), MINE.save));
    assert.deepEqual(previewSave.profiles.map(p => p.name), ['Pia']);
    assert.equal(previewSave.profiles[0].attempts['swap-k1-01'].completed, true);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), LIVE.save), liveSave, 'the live save is untouched');
    for (const key of await b.keys()) assert.ok([LIVE.save, LIVE.backup, MINE.save, MINE.backup].includes(key), key);
    check('an explorer and a solve in the preview are saved under its own key; the live save is byte-for-byte unchanged');

    await b.grownUps();
    assert.equal(await page.locator('#offline-status').innerText(), 'Preview copy · online only');
    await page.locator('.install-panel').screenshot({path: shot('preview-grown-ups-install')});
    assert.deepEqual(await b.workers(), liveWorker);
    assert.deepEqual(await b.cacheNames(), liveCaches);
    check('the preview registered no worker, opened no caches, and says it is online only');

    await b.open(`${b.live}#profiles`);
    const text = await page.locator('#app').innerText();
    assert.ok(text.includes('Lila') && !text.includes('Pia'), 'the live app lists only its own explorer');
    assert.deepEqual(await b.names(LIVE), ['Lila']);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), LIVE.save), liveSave);
    await waitForOffline(page);
    await page.screenshot({path: shot('live-after-preview')});
    check('the live app shows only Lila and is still ready for offline play');

    // Live saves never reach the preview: a second live explorer stays out of it.
    await page.locator('details.caravan-add-profile > summary').click();
    await b.explorer('Lou', LIVE);
    await b.open(`${b.preview}#profiles`);
    const previewText = await page.locator('#app').innerText();
    assert.ok(previewText.includes('Pia') && !previewText.includes('Lila') && !previewText.includes('Lou'));
    check('a new live explorer does not appear in the preview');

    await b.clear();
    assert.deepEqual(await b.keys(), [LIVE.save, LIVE.backup].sort());
    assert.deepEqual(await b.names(LIVE), ['Lila', 'Lou']);
    await b.explorer('Pia', MINE);
    await b.open(b.live);
    await b.clear();
    assert.deepEqual(await b.keys(), [MINE.save]);
    assert.deepEqual(await b.names(MINE), ['Pia']);
    check('Clear in the preview leaves the live saves, and Clear in the live app leaves the preview save');

    await b.context.setOffline(true);
    await page.reload();
    await page.locator('#nickname').waitFor();
    await assert.rejects(page.goto(b.preview), /ERR_INTERNET_DISCONNECTED|net::/);
    await b.context.setOffline(false);
    check('offline, the live app still opens and the preview URL gets no live page in its place');
    await b.context.close();
  }

  // 2. Preview first, before any worker, then the live app, then the preview again.
  {
    const b = await fresh(), {page} = b;
    await b.open(b.preview, '#nickname');
    await b.explorer('Pia', MINE);
    assert.deepEqual(await b.workers(), []);
    await b.open(b.live, '#nickname');
    assert.deepEqual(await b.names(LIVE), []);
    await b.explorer('Lila', LIVE);
    await waitForOffline(page);
    await b.open(b.preview);
    assert.equal(await page.title(), `Preview ${item} · The Lantern Caravan`);
    b.ownFiles();
    await page.screenshot({path: shot('preview-map')});
    assert.deepEqual(await b.names(MINE), ['Pia']);
    assert.deepEqual(await b.names(LIVE), ['Lila']);
    assert.deepEqual(await b.workers(), [{scope: b.live, script: `${b.live}sw.js`}]);
    check('a preview opened before the live app registers nothing, and after the live worker installs it still loads its own files and save');
    await b.context.close();
  }

  // 3. The worker that is live today, before the pass-through is deployed.
  {
    const b = await fresh('deployed/small-math-adventure'), {page} = b;
    await b.open(b.live, '#nickname');
    await b.explorer('Lila', LIVE);
    await waitForOffline(page);
    await b.open(b.preview, '#nickname');
    assert.equal(await page.title(), 'The Lantern Caravan', 'today\'s worker answers with its cached live page');
    b.ownFiles(true);
    await b.explorer('Pia', MINE);
    assert.deepEqual(await b.names(LIVE), ['Lila']);
    assert.deepEqual(await b.names(MINE), ['Pia']);
    assert.deepEqual(await b.workers(), [{scope: b.live, script: `${b.live}sw.js`}]);
    check('with today\'s live worker the preview opens in the cached live page, but runs its own code with its own save and registers nothing');
    await b.context.close();
  }

  assert.deepEqual(report.errors, []);
  console.log(`Preview suite passed: ${report.checks.length} checks.`);
} finally {
  await writeFile(new URL('report.json', results), JSON.stringify(report, null, 2) + '\n').catch(() => {});
  await browser.close();
  server.kill();
}
