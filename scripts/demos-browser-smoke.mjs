// Plays every How to play demo (dist/demo.js, docs/demos.md) in a real
// browser: for each mechanic, and each mode with a demo of its own, it opens
// the first puzzle, presses How to play and waits for the demo to finish. It
// checks that the demo plays to the end with no page error, fits the dialog
// on a phone, marks a control for every step (or says which steps it
// couldn't), and that Show again plays it once more. SCREENSHOTS=<dir> saves
// each finished demo; TEST_MECHANIC=<id> limits the run to one mechanic.
// Uses the same environment variables as browser-smoke.mjs.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {FAMILIES} from './packs.mjs';
import {mergePacks} from '../dist/families.js';
import {demoEntry} from '../dist/demo.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), only = process.env.TEST_MECHANIC, shots = process.env.SCREENSHOTS;
const width = Number(process.env.WIDTH || 390), height = Number(process.env.HEIGHT || 844);
if (shots) await mkdir(shots, {recursive: true});

const read = async url => JSON.parse(await readFile(url, 'utf8'));
const pack = mergePacks(await read(new URL('../dist/puzzles.json', import.meta.url)), await Promise.all(FAMILIES.filter(m => m.pack).map(m => read(new URL(m.pack)))));
// One case per demo: the first puzzle of each mechanic and of each mode a demo names.
const cases = [], missing = [], seen = new Set();
for (const p of pack.puzzles) {
  if (only && p.mechanic !== only) continue;
  const entry = demoEntry(p), key = `${p.mechanic}|${entry?.mode ?? ''}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (entry) cases.push({p, key}); else if (!missing.includes(p.mechanic)) missing.push(p.mechanic);
}

const errors = [], untapped = [], pages = Number(process.env.PAGES || 4);
async function worker(list) {
  const context = await browser.newContext({viewport: {width, height}, hasTouch: true});
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${page.url()}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`); });
  await page.goto(base);
  await page.locator('#nickname').fill('Demo QA');
  await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').waitFor();
  for (const {p, key} of list) {
    await page.goto(`${base}/#play/${p.id}`);
    await page.locator(`[data-puzzle-id="${p.id}"] .board-panel`).first().waitFor();
    await page.getByRole('button', {name: 'How to play', exact: true}).click();
    const help = page.locator('dialog'), demo = help.locator('.howto-demo');
    await help.waitFor();
    assert.equal(await demo.count(), 1, `${key}: How to play shows a demo`);
    await demo.and(page.locator('[data-played]')).waitFor({timeout: 30000});
    const fit = await demo.evaluate(node => {
      const slot = node.getBoundingClientRect(), frame = node.querySelector('.howto-frame').getBoundingClientRect();
      const dialog = node.closest('dialog');
      return {inside: frame.left >= slot.left - 1 && frame.right <= slot.right + 1, scroll: dialog.scrollWidth <= dialog.clientWidth + 1, height: frame.height};
    });
    assert.ok(fit.inside && fit.scroll, `${key}: the demo fits the dialog at ${width} px`);
    assert.ok(fit.height >= 60, `${key}: the demo board is drawn (${fit.height} px tall)`);
    const missed = await demo.getAttribute('data-untapped');
    if (missed) untapped.push(`${key}: ${missed}`);
    if (shots) await help.screenshot({path: `${shots}/${key.replace('|', '-').replace(/-$/, '')}.png`});
    await demo.evaluate(node => { delete node.dataset.played; });
    await help.getByRole('button', {name: 'Show again'}).click();
    await demo.and(page.locator('[data-played]')).waitFor({timeout: 30000});
    await help.getByRole('button', {name: 'Done', exact: true}).click();
    await help.waitFor({state: 'detached'});
  }
  await context.close();
}
try {
  const lists = Array.from({length: pages}, (_, i) => cases.filter((_, j) => j % pages === i));
  await Promise.all(lists.map(worker));
  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Demos browser smoke passed: ${cases.length} demos at ${width} × ${height}.`);
  if (untapped.length) console.log(`Steps with no control to mark: ${untapped.join('; ')}`);
  if (missing.length) console.log(`Mechanics without a demo (${missing.length}): ${missing.join(', ')}`);
} finally {
  await browser.close();
}
