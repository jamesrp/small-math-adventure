// Plays Running totals through the real interface: cards tapped into the next
// empty turn, a turn picked and changed or traded, Enter on a focused card,
// dragging a card onto a turn, between turns and back to the cards, a solve;
// Can't refused (with Undo going past the refusal) and then accepted; an every
// puzzle with There is another and That's all; the playground's trays; focus
// kept on the board; and no page overflow. Same environment variables as the
// other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone with touch). Screenshots go in test-results/totals/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone, reducedMotion: 'reduce'});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/totals/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.rt-board').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const tap = async locator => { const b = await locator.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const card = v => page.locator(`.rt-hand [data-tt-card="${v}"]`).first();
const slot = i => page.locator(`.rt-board [data-tt-slot="${i}"]`);
const lastRow = () => page.locator('.rt-cell.last').allInnerTexts();
const focusKey = () => page.evaluate(() => document.activeElement?.dataset?.focus || document.activeElement?.className || '');
// A pointer drag from one control to another, in small steps.
async function drag(from, to) {
  const a = await from.boundingBox(), b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(a.x + a.width / 2 + (b.x + b.width / 2 - a.x - a.width / 2) * k / 8, a.y + a.height / 2 + (b.y + b.height / 2 - a.y - a.height / 2) * k / 8);
  await page.mouse.up();
  await page.waitForTimeout(60);
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Running totals QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-totals"] .family-ink-symbol').innerText(), 'Σ');

  // Make: cards go into the next empty turn; a picked turn trades with another; a solve.
  await open('totals-03'); await fit('totals-03');
  await tap(card(3)); await tap(card(1)); await tap(card(0));
  assert.deepEqual((await board('totals-03')).lane, [3, 1, 0]);
  assert.deepEqual(await lastRow(), ['3', '7', '11'], 'tray 2 reads 3, 7, 11');
  assert.equal(await page.locator('.rt-cell.last.bad').count(), 1, 'the missed total is marked');
  await shot('make');
  await tap(slot(0));
  assert.equal(await slot(0).getAttribute('aria-pressed'), 'true', 'a tapped turn is picked');
  await tap(slot(1));
  await done();
  assert.deepEqual((await board('totals-03')).lane, [1, 3, 0]);

  // Keys and drags: Enter on a focused card, then a card dragged onto a turn, between turns and back.
  await open('totals-05'); await fit('totals-05');
  await card(1).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board('totals-05')).lane, [1, null, null, null]);
  assert.match(await focusKey(), /^rt-/, 'focus stays on the board after a move');
  await drag(card(3), slot(2));
  assert.deepEqual((await board('totals-05')).lane, [1, null, 3, null], 'a card dragged onto a turn');
  await drag(slot(2), slot(1));
  assert.deepEqual((await board('totals-05')).lane, [1, 3, null, null], 'a card dragged to an empty turn moves there');
  await drag(slot(0), slot(1));
  assert.deepEqual((await board('totals-05')).lane, [3, 1, null, null], 'two cards trade');
  await drag(slot(1), page.locator('.rt-hand'));
  assert.deepEqual((await board('totals-05')).lane, [3, null, null, null], 'a card dragged back to the cards');
  // Pick a full turn and tap a card to change it.
  await tap(slot(0)); await tap(card(0));
  assert.deepEqual((await board('totals-05')).lane, [0, null, null, null], 'a picked turn changes card');
  // Tap the picked turn again to take its card back.
  await tap(slot(0)); await tap(slot(0));
  assert.deepEqual((await board('totals-05')).lane, [null, null, null, null], 'a picked turn tapped again gives its card back');
  for (const v of [0, 1, 3, 0]) await tap(card(v));
  await done();

  // Can't: refused on a lane that is not biggest first, Undo goes past the refusal, then accepted.
  await open('totals-07'); await fit('totals-07');
  assert.ok(await page.locator('.rt-cant').isDisabled(), 'Can’t waits for a full lane');
  for (const v of [2, 1, 2, 0, 0]) await tap(card(v));
  await tap(page.locator('.rt-cant'));
  await page.locator('.rt-note.bad').waitFor();
  assert.equal(await page.locator('.rt-note.bad').innerText(), 'That doesn’t rule it out.');
  assert.ok(await page.locator('.rt-cant').isDisabled(), 'Can’t waits for a change');
  assert.doesNotMatch(await focusKey(), /cant/, 'focus is not left on Can’t');
  await shot('cant-refused');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board('totals-07')).lane, [2, 1, 2, 0, null], 'one Undo goes past the refusal to the last card');
  await tap(card(0));
  assert.equal((await board('totals-07')).refused, false);
  await tap(slot(1)); await tap(slot(2));
  assert.deepEqual((await board('totals-07')).lane, [2, 2, 1, 0, 0]);
  await tap(page.locator('.rt-cant'));
  await done();
  assert.equal((await board('totals-07')).claim, 'most');
  assert.equal(await page.locator('.rt-note').innerText(), '21 is the most.');
  await shot('cant-done');

  // Every: a start, its cards, There is another, then every start and That's all.
  await open('totals-08'); await fit('totals-08');
  // The start buttons are at least 44 px, in at most two rows.
  const chips = await page.locator('.rt-chip').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return {w: r.width, h: r.height, top: Math.round(r.top)}; }));
  assert.equal(chips.length, 9);
  assert.ok(chips.every(c => c.w >= 43.5 && c.h >= 43.5), 'start buttons are 44 px');
  assert.ok(new Set(chips.map(c => c.top)).size <= 2, 'start buttons in at most two rows');
  if (phone) assert.equal(new Set(chips.map(c => c.top)).size, 2, 'two rows on a phone');
  await tap(page.locator('.rt-chip', {hasText: '4'}));
  for (const v of [0, 3, 0, 5]) await tap(card(v));
  assert.deepEqual((await board('totals-08')).found, [4]);
  await tap(page.locator('.rt-all'));
  assert.equal(await page.locator('.rt-note.bad').innerText(), 'There is another.');
  assert.ok(await page.locator('.rt-all').isDisabled());
  for (const s of [0, 1, 2, 3]) { await tap(page.locator('.rt-chip', {hasText: String(s)})); await tap(slot(0)); await tap(card(4 - s)); }
  assert.deepEqual((await board('totals-08')).found, [0, 1, 2, 3, 4]);
  assert.equal(await page.locator('.rt-chip.found').count(), 5);
  await shot('every');
  await tap(page.locator('.rt-all'));
  await done();

  // Three trays and the hard boards fit.
  await open('totals-10'); await fit('totals-10');
  for (const v of [1, 2, 0, 2, 0]) await tap(card(v));
  await done();
  await shot('three-trays');
  await open('totals-12'); await fit('totals-12');

  // The playground: three trays of six 1s.
  await open('totals-playground'); await fit('totals-playground');
  assert.equal(await page.locator('[data-action="hint"]').count(), 0, 'no Hint in the playground');
  await tap(page.locator('.rt-trayn').nth(2));
  for (let k = 0; k < 6; k++) await tap(card(1));
  assert.deepEqual(await lastRow(), ['1', '4', '10', '20', '35', '56']);
  await shot('playground');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
