// A first visit that fails to start shows one screen with Try again (the
// classic script before main.js in dist/index.html). Each case runs in a fresh
// browser profile with no service worker, as on a first visit:
// - a family module that fails to fetch (its dynamic import in families.js
//   rejects): the screen and its button appear; with the module unblocked,
//   Try again reloads into the app;
// - a module in main.js's static graph that answers 404, and one that throws
//   while it runs: the same screen;
// - puzzles.json that fails to fetch (main.js's own catch): the same screen
//   with the same words, and a save written in another tab leaves it there;
// - a normal start never shows it, nor do an error, a rejection and a failed
//   script after the first render;
// - a slow start (a family module and puzzles.json held back, with a save
//   written in another tab while main.js waits) never shows it.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a 390 × 844 phone with
// touch). Screenshots go in ignored test-results/boot-failure/.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {SAVE_KEY} from '../dist/storage.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, '');
const results = new URL(`../test-results/boot-failure/`, import.meta.url);
await mkdir(results, {recursive: true});
const HEADING = 'The Lantern Caravan didn’t load.';
const checks = [];
const ok = text => { checks.push(text); console.log(`ok - ${text}`); };

// A fresh profile. `routes` maps a URL glob to a handler; each page records
// whether the start-up screen was ever on it and every uncaught error.
async function fresh(routes = {}) {
  const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1024, height: 768}, hasTouch: phone, serviceWorkers: 'block'});
  for (const [glob, handler] of Object.entries(routes)) await context.route(glob, handler);
  await context.addInitScript(() => {
    window.__sawStartupScreen = false;
    new MutationObserver(() => { if (document.querySelector('.startup-failed')) window.__sawStartupScreen = true; }).observe(document, {childList: true, subtree: true});
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return {context, page, errors};
}
const screen = page => page.locator('.startup-failed');
async function failed(page, name) {
  await page.getByRole('heading', {name: HEADING, exact: true}).waitFor({timeout: 60000});
  const button = page.getByRole('button', {name: 'Try again', exact: true});
  await button.waitFor();
  const box = await button.boundingBox();
  assert.ok(box.height >= 44 && box.width >= 44, `${name}: Try again is at least 44 px (${box.width} × ${box.height})`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${name}: no horizontal overflow`);
  await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, results).pathname});
  return page.locator('#app').innerText();
}
async function started(page) {
  await page.locator('#nickname').waitFor({timeout: 60000});
  assert.equal(await screen(page).count(), 0);
}
const familyModule = '**/families/stars/stars.js';

try {
  // A family module that fails to fetch, then Try again once it is back.
  let blocked = true;
  let run = await fresh({[familyModule]: route => blocked ? route.abort('internetdisconnected') : route.continue()});
  await run.page.goto(base);
  const words = await failed(run.page, 'family-module');
  assert.ok(run.errors.some(message => message.includes('stars.js')), 'the failed import is reported');
  assert.equal(await run.page.evaluate(key => localStorage.getItem(key), SAVE_KEY), null, 'nothing is saved');
  blocked = false;
  await run.page.getByRole('button', {name: 'Try again', exact: true}).click();
  await started(run.page);
  ok('a family module that fails to fetch shows the screen, and Try again starts the app once it loads');
  await run.context.close();

  // A static module that answers 404, and one that throws while it runs.
  run = await fresh({'**/road-ui.js': route => route.fulfill({status: 404, body: 'Not found'})});
  await run.page.goto(base);
  assert.equal(await failed(run.page, 'static-404'), words);
  ok('a module in the static graph that answers 404 shows the same screen');
  await run.context.close();
  run = await fresh({'**/view-state.js': async route => { const response = await route.fetch(); route.fulfill({response, body: `${await response.text()}\nthrow new Error('view-state failed while running');`}); }});
  await run.page.goto(base);
  assert.equal(await failed(run.page, 'module-throws'), words);
  assert.ok(run.errors.some(message => message.includes('view-state failed while running')));
  ok('a module that throws while it runs shows the same screen');
  await run.context.close();

  // puzzles.json fails: main.js's catch shows the same screen with the same
  // words, and a save written in another tab does not draw over it.
  run = await fresh({'**/puzzles.json': route => route.abort('connectionreset')});
  await run.page.goto(base);
  assert.equal(await failed(run.page, 'puzzle-pack'), words);
  const other = await run.context.newPage();
  await other.goto(base);
  await other.evaluate(key => localStorage.setItem(key, '{"schemaVersion":1,"profiles":[],"activeProfileId":null}'), SAVE_KEY);
  await run.page.waitForTimeout(500);
  assert.equal(await run.page.locator('#app').innerText(), words, 'the screen stays after a save in another tab');
  ok('puzzles.json that fails to fetch shows the same screen and words, and a save in another tab leaves it');
  await run.context.close();

  // A normal start, then errors after the first render.
  run = await fresh();
  await run.page.goto(base);
  await started(run.page);
  assert.deepEqual(run.errors, []);
  await run.page.evaluate(() => {
    setTimeout(() => { throw new Error('after the first render'); });
    Promise.reject(new Error('rejected after the first render'));
    const script = document.createElement('script');
    script.src = './missing-after-start.js';
    document.body.append(script);
  });
  await run.page.waitForTimeout(1000);
  assert.equal(run.errors.length, 2, 'both late errors were uncaught');
  await started(run.page);
  assert.equal(await run.page.evaluate(() => window.__sawStartupScreen), false);
  ok('a normal start, and an error, a rejection and a failed script after the first render, never show the screen');
  await run.context.close();

  // A slow start: a family module held back 1.5 s and puzzles.json 2.5 s,
  // with a save written in another tab while main.js waits for the pack.
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  let packAsked;
  const asked = new Promise(resolve => { packAsked = resolve; });
  run = await fresh({
    [familyModule]: async route => { await wait(1500); await route.continue(); },
    '**/puzzles.json': async route => { packAsked(); await wait(2500); await route.continue(); },
    '**/other-tab.html': route => route.fulfill({contentType: 'text/html', body: '<!doctype html><title>Other tab</title>'})
  });
  const going = run.page.goto(base);
  await asked;
  const tab = await run.context.newPage();
  await tab.goto(`${base}/other-tab.html`);
  await tab.evaluate(key => localStorage.setItem(key, '{"schemaVersion":1,"profiles":[],"activeProfileId":null}'), SAVE_KEY);
  await going;
  await started(run.page);
  assert.equal(await run.page.evaluate(() => window.__sawStartupScreen), false);
  assert.deepEqual(run.errors, []);
  ok('a slow start (a family module and puzzles.json late, a save from another tab meanwhile) never shows the screen');
  await run.context.close();

  await writeFile(new URL(`report${phone ? '-phone' : ''}.json`, results), JSON.stringify({passed: true, phone, checks}, null, 2));
} finally {
  await browser.close();
}
