// A new version of the app while it is open: the waiting offline copy shows a
// small banner on the map and a line with Reload in Grown-ups, never on a
// puzzle; Reload asks the waiting worker to take over (SKIP_WAITING) and
// reloads that tab only, so another tab mid-puzzle keeps its board.
// The suite serves dist/ itself on UPDATE_PORT (default: any free port) and
// changes sw.js's cache name when it says so, as a deploy does. Environment:
// PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, UPDATE_PORT.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { waitForOffline } from './browser-offline.mjs';

const root = resolve(import.meta.dirname, '../dist');
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', webm: 'video/webm', mp4: 'video/mp4' };
let version = 0;
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + sep)) throw new Error('Invalid path');
    let body = await readFile(file);
    if (pathname === '/sw.js' && version) body = Buffer.from(String(body).replace(/^const CACHE='([^']+)'/, (_, name) => `const CACHE='${name}-v${version}'`));
    res.writeHead(200, { 'Content-Type': types[file.split('.').at(-1)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(done => server.listen(Number(process.env.UPDATE_PORT || 0), '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const output = new URL('../test-results/update/', import.meta.url);
await mkdir(output, { recursive: true });
const checks = [], errors = [];
const READY = 'A new version of the app is ready. Reload to start using it.';
try {
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  const map = await context.newPage();
  map.on('pageerror', error => errors.push(error.message));
  await map.goto(base); await map.locator('#nickname').fill('Update'); await map.locator('[name=band][value="23"]').check(); await map.locator('#profile-form button[type=submit]').click();
  await map.locator('.lr-overview').waitFor(); await waitForOffline(map);
  await map.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const caches = page => page.evaluate(async () => (await window.caches.keys()).filter(name => name.includes('-shell-')));
  const [before] = await caches(map);

  // A second tab in the middle of a puzzle.
  const tab = await context.newPage();
  tab.on('pageerror', error => errors.push(error.message));
  await tab.goto(`${base}/#play/swap-23-02`); await tab.locator('.board-panel').waitFor();
  await tab.locator('[data-action=swap-pair]').first().click();
  await tab.evaluate(() => { window.stillHere = true; });
  const board = () => tab.evaluate(() => { const s = JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')); return s.profiles[0].attempts['swap-23-02']; });
  const live = await board();
  assert.ok(live.moves > 0, 'the second tab has a puzzle in play');

  // A deploy: the next update check finds a new worker, which installs and waits.
  version = 1;
  await map.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
  await map.locator('.update-banner').waitFor({ timeout: 30000 });
  assert.equal(await map.locator('.update-banner').innerText().then(text => text.replace(/\s+/g, ' ').trim()), 'A new version is ready. Reload');
  const reload = map.locator('.update-banner [data-action=apply-update]'), box = await reload.boundingBox();
  assert.ok(box.width >= 44 && box.height >= 44, `Reload is ${box.width}×${box.height} px`);
  assert.equal(await map.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), true, 'the new copy waits');
  await map.screenshot({ path: new URL('map-banner-820.png', output).pathname });
  await map.setViewportSize({ width: 390, height: 844 }); await map.screenshot({ path: new URL('map-banner-390.png', output).pathname });
  assert.equal(await map.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'the banner fits a phone');
  await map.setViewportSize({ width: 820, height: 1180 });
  checks.push(`the map shows the banner by itself; Reload ${box.width}×${box.height} px`);
  assert.equal(await tab.locator('.update-banner').count(), 0, 'no banner on a puzzle');
  await tab.locator('[data-action=swap-pair]').first().click();
  assert.equal(await tab.locator('.update-banner').count(), 0, 'no banner after a move either');
  checks.push('no banner over a puzzle');

  // Grown-ups says so beside the offline status, with its own Reload.
  await map.getByRole('button', { name: 'Grown-ups', exact: true }).click(); await map.getByRole('button', { name: 'I’m a grown-up', exact: true }).click();
  await map.locator('.parent-layout').waitFor();
  assert.equal(await map.locator('#offline-status').innerText(), READY);
  assert.equal(await map.locator('.install-panel [data-action=apply-update]').count(), 1, 'Grown-ups has Reload');
  assert.equal(await map.locator('.update-banner').count(), 0, 'Grown-ups shows the line, not the banner');
  await map.locator('.install-panel').screenshot({ path: new URL('grown-ups-update.png', output).pathname });
  await map.locator('.caravan-nav [data-action=map]').click(); await map.locator('.update-banner').waitFor();
  checks.push('Grown-ups shows the update and its Reload');

  // Reload: the waiting copy takes over and this tab reloads into it.
  const tabBoard = await board();
  await Promise.all([map.waitForEvent('load', { timeout: 15000 }), reload.click()]);
  await map.locator('.lr-overview').waitFor();
  assert.equal(await map.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), false, 'nothing waits after Reload');
  assert.equal(await map.locator('.update-banner').count(), 0, 'the banner is gone');
  const after = await caches(map);
  assert.deepEqual(after, [`${before}-v1`], 'the new copy is in charge and the old cache is gone');
  checks.push('Reload hands over to the waiting copy and reloads that tab');
  assert.equal(await tab.evaluate(() => window.stillHere), true, 'the tab mid-puzzle was not reloaded');
  assert.deepEqual(await board(), tabBoard, 'its board is unchanged');
  await tab.locator('[data-action=swap-pair]').first().click();
  assert.equal(await tab.locator('.board-panel').count(), 1, 'and its puzzle still plays');
  checks.push('another tab mid-puzzle keeps its board');
  await context.close();

  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', output), JSON.stringify({ passed: true, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks }, null, 2));
} finally { await browser.close(); server.close(); }
