// Plays Card totals through the real interface: cards into trays and out
// again, a full tray, the strip and its stacked tokens, a route by taps and
// keyboard, taps in page order refused, a finished route that misses a
// total, a step back, Undo keeping the refusal, a solve; the most puzzles with shaded dots and the evenly spaced refusal; the
// find-every puzzle with Found already, There is another and That's all;
// the one-card fit; and the playground. Taps land at a control's centre
// through real hit-testing. Same environment variables as the other browser
// suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a
// phone with touch). Screenshots go in test-results/sumsets/ (or SHOTS_DIR).
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS_DIR ? new URL(`file://${process.env.SHOTS_DIR.replace(/\/?$/, '/')}`) : new URL('../test-results/sumsets/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.ss-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const cardOf = (t, k) => page.locator(`.ss-tray.t${t} .ss-card[data-focus="ss-${t}-${k}"]`);
const dot = (i, j) => page.locator(`.ss-dot[data-focus="ss-dot-${i}-${j}"]`);
const tap = async locator => {
  const b = await locator.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
  if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
};
// A tap near the edge of a control still hits that control, not its neighbour.
const tapEdge = async (locator, dx) => {
  const b = await locator.boundingBox(), x = b.x + (dx < 0 ? 2 : b.width - 2), y = b.y + b.height / 2;
  if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
};
const cards = async (t, ...ks) => { for (const k of ks) await tap(cardOf(t, k)); };
const walk = async (...cells) => { for (const [i, j] of cells) await tap(dot(i, j)); };
const told = () => page.locator('.ss-told').innerText();
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Totals QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 4: three and three.
  const P = 'sumsets-04';
  await open(P); await fit('three and three');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'As few totals as you can, all on one route.');
  await cards('A', 0, 1, 3);
  assert.deepEqual((await board(P)).A, [0, 1, 3]);
  assert.equal(await cardOf('A', 5).isDisabled(), true, 'a full tray takes no more');
  await tapEdge(cardOf('A', 3), -1);
  assert.deepEqual((await board(P)).A, [0, 1], 'a tap at the left edge of a card hits that card');
  await tapEdge(cardOf('A', 3), 1);
  assert.deepEqual((await board(P)).A, [0, 1, 3], 'and at its right edge');
  await cards('B', 0, 1, 2);
  assert.equal(await page.locator('.ss-strip').getAttribute('aria-label'), 'Totals: 0, 1, 2, 3, 4, 5');
  assert.ok(await page.locator('.ss-token.k2').count() > 0, 'shared totals stack');
  await shot('trays');
  assert.equal(await page.locator('.ss-dot.can-go').count(), 0, 'nothing marks the next dot');
  assert.equal(await page.locator('button.ss-dot').count(), 9, 'every dot is a control');
  // Taps in page order reach the corner without making a route.
  await walk([2, 0], [2, 1], [2, 2]);
  assert.equal(await told(), 'Step right or up from the bottom-left dot.');
  assert.deepEqual((await board(P)).route, [], 'the refusal clears the taps');
  // Neighbouring dots meet halfway: a tap goes to the nearer one.
  await tapEdge(dot(0, 0), 1);
  await tapEdge(dot(0, 1), -1);
  assert.deepEqual((await board(P)).route, [[0, 0], [0, 1]], 'taps on either side of the boundary between two dots');
  await tap(dot(0, 0));
  assert.deepEqual((await board(P)).route, [], 'a tap on the first dot takes back every tap');
  await walk([0, 0], [0, 1], [0, 2], [1, 2]);
  await tap(dot(1, 2));
  assert.equal((await board(P)).route.length, 3, 'a tap on the last dot takes it back');
  await tap(dot(1, 2));
  await dot(2, 2).focus(); await page.keyboard.press('Enter');
  assert.equal(await told(), 'Not on the route: 4.');
  assert.equal(await page.locator('.ss-token.off').count(), 1, 'the missed total is ringed');
  assert.deepEqual((await board(P)).route, []);
  assert.equal(await page.locator('#completion-heading').count(), 0);
  await shot('missed');
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board(P)).route.length, 4, 'Undo brings back the taps');
  assert.equal(await told(), 'Not on the route: 4.', 'and keeps the refusal');
  await cards('A', 3, 2);
  assert.deepEqual((await board(P)).route, [], 'a card clears the route');
  assert.equal(await page.locator('.ss-told').count(), 0, 'and the refusal');
  await walk([0, 0], [1, 0], [1, 1]);
  assert.deepEqual((await board(P)).route, [[0, 0], [1, 0], [1, 1]]);
  const focused = await page.evaluate(() => document.activeElement?.className || '');
  assert.match(focused, /ss-dot|ss-card/, 'focus stays on the board');
  await walk([2, 1], [2, 2]);
  await done(); await fit('solved');
  await shot('solved');

  // Puzzle 9: four and four, most.
  const M = 'sumsets-09';
  await open(M); await fit('four and four');
  await cards('A', 0, 1, 2, 3); await cards('B', 0, 4, 8, 9);
  assert.ok(await page.locator('.ss-dot.repeat').count() > 0, 'shared totals are shaded');
  await shot('most-repeats');
  await cards('A', 2, 3, 8, 9); await cards('B', 4, 8, 9, 2, 4, 6);
  await done();

  // Puzzle 6: evenly spaced trays.
  await open('sumsets-06');
  await cards('A', 0, 1, 3); await cards('B', 0, 4, 8);
  assert.equal(await told(), 'A is not evenly spaced.');
  await cards('A', 3, 2);
  await done();

  // Puzzle 5: find every B.
  const E = 'sumsets-05';
  await open(E); await fit('every');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Find every B with 4 totals.');
  await cards('B', 0, 3);
  assert.deepEqual((await board(E)).found, [[0, 3]]);
  assert.equal(await page.locator('.ss-pair').count(), 1, 'the found row');
  await page.getByRole('button', {name: 'That’s all', exact: true}).click();
  assert.equal(await told(), 'There is another.');
  assert.equal(await page.getByRole('button', {name: 'That’s all', exact: true}).isDisabled(), true);
  const after = await page.evaluate(() => document.activeElement?.className || '');
  assert.doesNotMatch(after, /ss-button/, 'focus leaves That’s all for the board');
  await cards('B', 0, 0);
  assert.equal(await told(), 'Found already.');
  for (let t = 1; t <= 6; t++) await cards('B', t - 1, t + 2, t, t + 3);
  await shot('every-found');
  assert.equal((await board(E)).found.length, 7);
  await page.getByRole('button', {name: 'That’s all', exact: true}).click();
  await done();

  // Puzzle 7: one A card fits every total on one route.
  const F = 'sumsets-07';
  await open(F);
  await cards('A', 2, 5);
  await walk([0, 0], [0, 1], [0, 2], [1, 2]);
  assert.match(await told(), /^Not on the route: /);
  await cards('A', 5);
  await walk([0, 0], [0, 1], [0, 2]);
  await done();

  // The playground.
  const G = 'sumsets-playground';
  await open(G); await fit('playground');
  assert.equal(await page.getByRole('button', {name: 'Hint', exact: true}).count(), 0, 'no Hint');
  await cards('A', 0, 2, 4, 6, 8, 9); await cards('B', 1, 3, 5, 7, 9, 0);
  assert.equal(await cardOf('A', 1).isDisabled(), true, 'six cards at most');
  await walk([0, 0], [1, 0]);
  await fit('playground full');
  await shot('playground');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
