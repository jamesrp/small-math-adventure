// Plays Ticket shuffles through the real interface: drawing by tapping a
// ticket, by tapping a cup in an allowed slot, by tapping the lifted cup
// itself and by a drag (a touch drag with TEST_PHONE=1); a cup outside the
// ticket cup ignored; Again; Keep, a repeat, an early That's all and a kept
// story tapped back onto the cups; a rows puzzle and a stories-for puzzle
// solved by hints with their catalogs; the design puzzle's toggles, a failed
// Try it and a solve; and the playground. Same environment variables as the
// other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone viewport). Screenshots go in test-results/shuffles/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/shuffles/', import.meta.url);
const shot = async name => { await page.waitForTimeout(900); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="shuffles"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const cup = h => page.locator(`[data-cup="${h}"]`);
// The cups as a row, read from the board's labels ("Slot 1: cup C").
const row = () => page.locator('[data-cup]').evaluateAll(cups => cups.map(c => c.getAttribute('aria-label').match(/cup ([A-F])/)[1]).join(''));
const ticket = (step, t) => page.locator(`[data-focus="ticket-${step}-${t}"]`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const button = name => page.locator('.case-action', {hasText: name});
let cdp = null;
async function drag(from, to) {
  const [a, b] = [await center(from), await center(to)];
  if (!phone) { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b, {steps: 8}); await page.mouse.up(); return; }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let s = 1; s <= 8; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 8, a[1] + (b[1] - a[1]) * s / 8]);
  await touch('touchEnd', b);
  // A tap straight after a touch drag reads as a double tap; a child's next
  // tap comes later than a script's.
  await page.waitForTimeout(400);
}
const refused = () => page.getByText('That move is not allowed').count();
async function hintSolve() {
  const hint = page.getByRole('button', {name: 'Hint', exact: true});
  for (let i = 0; i < 3; i++) await hint.click();
  const apply = page.getByRole('button', {name: 'Apply hint', exact: true});
  for (let s = 0; !await page.locator('#completion-heading').count() && s < 150; s++) await apply.click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Shuffle QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  // Which family is newest (and starts open) is checked by families-browser-smoke.mjs.
  assert.equal(await page.locator('.satchel-family[data-view-key="family-shuffles"]').count(), 1, 'in the satchel');

  // Make C A B: tickets, cups, the lifted cup itself, a drag, Again.
  const P1 = 'shuffles-01';
  await open(P1); await fit('make a row'); await shot('01-start');
  assert.equal(await cup(0).getAttribute('aria-pressed'), 'true', 'slot 1 is lifted first');
  await ticket(0, 2).focus(); await page.keyboard.press('Enter');
  assert.equal(await row(), 'BAC', 'ticket 2 swaps slots 1 and 2');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'ticket-1-2', 'the keyboard moves on to the next ticket cup');
  assert.equal(await ticket(0, 2).getAttribute('aria-pressed'), 'true', 'the drawn ticket stays pressed');
  assert.equal(await cup(1).getAttribute('aria-pressed'), 'true', 'then slot 2 is lifted');
  assert.equal(await cup(0).getAttribute('aria-disabled'), 'true', 'slot 1 is not in the second ticket cup');
  await tap(cup(0));
  assert.equal(await row(), 'BAC', 'a cup outside the ticket cup does nothing');
  assert.equal(await refused(), 0);
  await tap(cup(2));
  assert.equal(await row(), 'BCA', 'tapping the cup in slot 3 draws ticket 3');
  assert.deepEqual((await board(P1)).story, [2, 3]);
  assert.equal(await page.locator('#completion-heading').count(), 0);
  await button('Again').click();
  assert.equal(await row(), 'ABC');
  await drag(cup(0), cup(2));
  assert.equal(await row(), 'CBA', 'a drag from the lifted cup draws the other cup’s ticket');
  await tap(cup(1));
  assert.deepEqual((await board(P1)).story, [3, 2], 'tapping the lifted cup draws its own slot');
  await button('Again').click();
  await tap(ticket(0, 3)); await tap(ticket(1, 3));
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal(await row(), 'CAB');
  await fit('make a row solved'); await shot('01-solved');

  // Every story: Keep files it under its order, an early That's all, Load.
  const P2 = 'shuffles-02';
  await open(P2);
  assert.equal(await page.locator('.case-bin').count(), 6, 'a column for every order from the start');
  assert.equal(await button('Keep').isDisabled(), true);
  await tap(ticket(0, 1)); await tap(ticket(1, 2));
  await button('Keep').click();
  assert.equal(await page.locator('.case-bin[data-bin="ABC"] .case-kept').count(), 1, '1, 2 leaves A B C');
  assert.equal(await button('Keep').isDisabled(), true, 'kept once');
  await button('That’s all').click();
  await page.getByText('There’s another.').waitFor();
  assert.equal(await button('That’s all').isDisabled(), true, 'not twice in a row');
  await button('Again').click();
  await tap(cup(2)); await tap(cup(2)); await button('Keep').click();
  assert.equal(await page.locator('.case-bin[data-bin="CAB"] .case-kept').count(), 1);
  await tap(page.locator('[data-case="12"]'));
  assert.deepEqual((await board(P2)).story, [1, 2], 'a kept story plays again');
  await tap(page.locator('[data-case="12"]'));
  assert.equal(await refused(), 0, 'tapping the kept story already on the cups is quiet');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(P2)).story, [3, 3], 'Undo takes the load back');
  await fit('every story'); await shot('02-shelf');

  // Never itself: no ticket for a slot's own number; a hint solve; the catalog.
  const P5 = 'shuffles-05';
  await open(P5);
  assert.equal(await ticket(0, 1).count(), 0, 'no ticket 1 in the first cup');
  assert.equal(await cup(0).getAttribute('aria-pressed'), 'true');
  await tap(cup(0));
  assert.equal(await refused(), 0, 'the lifted cup has no ticket of its own here, so a tap does nothing');
  assert.deepEqual((await board(P5)).story, []);
  await drag(cup(0), cup(2));
  assert.deepEqual((await board(P5)).story, [3], 'a drag from the lifted cup still draws');
  await hintSolve();
  assert.deepEqual((await board(P5)).kept.sort(), ['BCA', 'CAB']);
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 2);
  assert.equal(await page.locator('.case-catalog .case-kept.no').count(), 4);
  await fit('never itself'); await shot('05-solved');

  // Any slot: the four stories for A B C, and every story in the catalog.
  const P6 = 'shuffles-06';
  await open(P6);
  await hintSolve();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 27);
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 4);
  await fit('any slot'); await shot('06-solved');

  // Design: every ticket in every cup fails; puzzle 8's rule passes.
  const P9 = 'shuffles-09';
  await open(P9);
  assert.equal(await page.locator('span.case-cup').count(), 4, 'the cups are a picture');
  await tap(page.locator('span.case-cup').first());
  assert.equal(await refused(), 0);
  await button('Try it').focus(); await page.keyboard.press('Enter');
  await page.getByText('These make the same order.').waitFor();
  assert.equal(await button('Try it').isDisabled(), true);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'ticket-0-1', 'focus moves to the first ticket');
  await shot('09-verdict');
  for (const [step, t] of [[1, 1], [2, 1], [2, 2]]) await tap(ticket(step, t));
  assert.equal(await page.getByText('These make the same order.').count(), 0, 'a change clears the verdict');
  assert.equal(await ticket(2, 1).getAttribute('aria-pressed'), 'false');
  assert.deepEqual((await board(P9)).sets, [[1, 2, 3, 4], [2, 3, 4], [3, 4]]);
  await button('Try it').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 24);
  await fit('design'); await shot('09-solved');

  // The playground: Never itself with four cups, Draw finishes a story.
  await open('shuffles-playground');
  await page.getByRole('button', {name: 'Never itself'}).click();
  await page.getByRole('button', {name: '4 cups'}).click();
  assert.equal(await cup(3).count(), 1);
  assert.equal(await page.locator('.case-bin').count(), 24);
  await tap(ticket(0, 2));
  await button('Draw').click();
  assert.equal((await board('shuffles-playground')).story.length, 3);
  await button('Keep').click();
  const kept = (await board('shuffles-playground')).kept;
  assert.equal(kept.length, 1);
  assert.equal(await page.locator('.case-kept').count(), 1);
  await page.getByRole('button', {name: '4 cups'}).click();
  assert.equal(await refused(), 0, 'tapping the chosen count again is quiet');
  await fit('playground'); await shot('playground');
  await button('Clear').click();
  assert.deepEqual((await board('shuffles-playground')).kept, []);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
