// Plays Area traps through the real interface: splits by tapping squares and
// by Enter, a join by its dot, Undo, a split that gains nothing, taps near a
// join dot going where they are seen to land, Best refused and kept refused
// across one Undo that also takes back the split, then accepted with its
// savings drawn; painting by taps and a finger stroke, Can't closed until the
// painting fits, refused with a pause on a painting that is not the closest
// (one Undo takes back the claim and the last tap, and the same painting is
// refused again), accepted on the closest with its
// signs; the same pause on a target that can be met; sliding the grid by a
// drag, by arrow buttons and by arrow keys; and the playground's shapes and
// Clear. Same environment variables as
// the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone with touch). Screenshots go in
// test-results/covers/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/covers/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.cv-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const center = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async locator => tapAt(...await center(locator));
const piece = k => page.locator(`.cv-board [data-sg-piece="${k}"]`);
const cell = i => page.locator(`.cv-board [data-sg-cell="${i}"]`);
const button = name => page.getByRole('button', {name, exact: true});
const told = () => page.locator('.cv-told').innerText();
const onBoard = () => page.evaluate(() => Boolean(document.activeElement?.closest('.cv-board, .cv-bar')) && !/Can’t|Best/.test(document.activeElement?.textContent || ''));
// A finger or mouse drag through a list of points.
let cdp = null;
async function drag(points) {
  if (!phone) {
    await page.mouse.move(...points[0]); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(...p, {steps: 8});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', points[0]);
  for (let k = 1; k < points.length; k++) for (let s = 1; s <= 8; s++) {
    const [x1, y1] = points[k - 1], [x2, y2] = points[k];
    await touch('touchMove', [x1 + (x2 - x1) * s / 8, y1 + (y2 - y1) * s / 8]);
  }
  await touch('touchEnd', points.at(-1));
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Covers QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: splits by tap and by Enter, a wasted split and its join, Undo.
  const T = 'covers-01';
  await open(T); await fit('triangle');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Make the gap 2 or less.');
  assert.equal(await page.locator('.cv-slots i').count(), 4, 'four slots');
  await tap(piece('0,0'));
  assert.deepEqual((await board(T)).splits, ['0,0,0'], 'a tap splits a square');
  assert.equal(await page.locator('.cv-slots i.on').count(), 1);
  assert.equal(await page.locator('.cv-num.in').innerText(), '6', 'a blank square changes nothing');
  await tap(page.locator('.cv-board [data-sg-point]').first());
  assert.deepEqual((await board(T)).splits, [], 'its dot joins it again');
  await piece('6,0').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(T)).splits, ['3,0,0'], 'Enter splits');
  assert.equal(await onBoard(), true, 'focus stays on the board');
  assert.equal(await page.locator('.cv-num.in').innerText(), '6¼');
  assert.equal(await page.locator('.cv-num.cov').innerText(), '9¾');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(T)).splits, [], 'Undo takes the split back');
  for (const k of ['6,0', '4,2', '2,4', '0,6']) await tap(piece(k));
  await done(); await fit('triangle solved');
  await shot('split-solved');

  // Puzzle 4: the first split of the plus changes nothing; its quarters do.
  const P = 'covers-04';
  await open(P);
  await tap(piece('4,0'));
  assert.equal(await page.locator('.cv-num.cov').innerText(), '5', 'the first split gains nothing');
  // The join dot's reach is drawn. A tap 10 px from its centre, on the
  // bottom-right quarter, lands on the drawn dot and joins; a tap just past
  // the drawn edge splits the quarter.
  const reach = page.locator('.cv-board .cv-join .sg-reach'), rb = await reach.boundingBox();
  const dot = [rb.x + rb.width / 2, rb.y + rb.height / 2], r = rb.width / 2, diag = Math.SQRT1_2;
  assert.ok(!/^(none|transparent|rgba\(0, 0, 0, 0\))$/.test(await reach.evaluate(e => getComputedStyle(e).fill)), 'the reach is drawn');
  assert.ok(r > 10, `the drawn dot reaches past 10 px (${r.toFixed(1)} px)`);
  await tapAt(dot[0] + 10 * diag, dot[1] + 10 * diag);
  assert.deepEqual((await board(P)).splits, [], 'a tap on the drawn dot joins');
  await tap(piece('4,0'));
  await tapAt(dot[0] + (r + 4) * diag, dot[1] + (r + 4) * diag);
  assert.deepEqual((await board(P)).splits, ['1,0,0', '3,1,1'], 'a tap just past the drawn dot splits the quarter');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(P)).splits, ['1,0,0']);
  await tap(piece('4,0'));
  assert.deepEqual((await board(P)).splits, ['1,0,0', '2,0,1'], 'a tap on a quarter splits the quarter');
  assert.equal(await page.locator('.cv-num.cov').evaluate(e => e.textContent), '41316', 'three blank sixteenths come off the cover');
  assert.equal(await page.locator('.cv-num.cov .cv-frac').count(), 1, 'the sixteenths are stacked');
  await shot('plus-quarters');

  // Puzzle 6: Best refused, kept refused across Undo, then accepted.
  const B = 'covers-06';
  await open(B); await fit('hexagon');
  await tap(piece('2,0'));
  await button('Best').click();
  assert.equal(await told(), 'A smaller cover is possible.');
  assert.equal(await button('Best').isDisabled(), true, 'Best waits for a smaller cover');
  assert.equal(await onBoard(), true, 'focus leaves Best for the board');
  // Best left the splits as they were, so one Undo takes back the claim and
  // the split together.
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual(await board(B), {splits: [], refused: 15.5, done: false}, 'Undo takes back the claim and the split, not the refusal');
  assert.equal(await button('Best').isDisabled(), true);
  assert.equal(await told(), 'A smaller cover is possible.');
  assert.equal(await page.locator('[data-action="undo"]').isDisabled(), true, 'with nothing left to take back, Undo greys out');
  await tap(piece('0,0')); await tap(piece('6,6'));
  await button('Best').click();
  await done(); await fit('best solved');
  assert.equal(await page.locator('.cv-gain').count(), 12, 'each yellow square shows its saving');
  assert.equal(await page.locator('.cv-ring').count(), 2, 'the two splits are ringed');
  await shot('best-solved');

  // Puzzle 7: paint to fit, Can't too early, then on the closest painting.
  const C = 'covers-07';
  await open(C); await fit('paint');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Match the colours with area exactly 6.');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a painting that fits');
  // A stroke along the bottom-left green squares, then taps.
  await drag([await center(cell(24)), await center(cell(25)), await center(cell(26)), await center(cell(27))]);
  assert.deepEqual((await board(C)).painted, [24, 25, 26, 27], 'a stroke paints the squares it crosses');
  for (const i of [30, 31, 32, 33, 14, 15, 20, 21, 2, 12, 16]) await tap(cell(i));
  assert.equal(await button('Can’t').isDisabled(), false, 'the painting fits');
  assert.equal(await page.locator('.cv-pick').count(), 0, 'no numbers to tap');
  await shot('paint-fits');
  await button('Can’t').click();
  assert.equal(await told(), 'Get closer first.');
  assert.equal(await button('Can’t').isDisabled(), true, 'paused until the painting changes');
  assert.equal(await onBoard(), true, 'focus goes to the board, not Can’t');
  await shot('paint-closer');
  // Can't left the painting as it was, so one Undo also takes back the last
  // tap; the pause goes with that painting, as it would for a new stroke.
  const painting = (await board(C)).painted;
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual(await board(C), {painted: painting.filter(i => i !== 16), paused: false, done: false}, 'Undo takes back the claim and the last tap');
  assert.equal(await page.locator('.cv-told').count(), 0);
  await tap(cell(16));
  assert.equal(await button('Can’t').isDisabled(), false, 'the same painting again');
  await button('Can’t').click();
  assert.equal(await told(), 'Get closer first.', 'is refused again');
  for (const i of [3, 8, 13, 18, 17, 22]) await tap(cell(i));
  assert.equal(await page.locator('.cv-told').count(), 0, 'a stroke lifts the pause');
  await button('Can’t').click();
  await done(); await fit('paint solved');
  assert.equal(await page.locator('.cv-sign').count(), 3, 'a minus on the clear small square of each yellow square');
  await shot('paint-solved');

  // Puzzle 3: Can't on a target that can be met gets the same pause.
  const E = 'covers-03';
  await open(E);
  for (const i of [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 4]) await tap(cell(i));
  await button('Can’t').click();
  assert.equal(await told(), 'Get closer first.');
  assert.equal(await button('Can’t').isDisabled(), true);
  await tap(cell(1));
  await done();

  // Puzzle 5: a drag, arrow keys and buttons slide the grid.
  const S = 'covers-05';
  await open(S); await fit('slide');
  const svg = page.locator('[data-cv-slide]'), box = await svg.boundingBox(), unit = box.width / (5 * 10 + 4) * 10;
  const [cx, cy] = await center(svg);
  await drag([[cx, cy], [cx, cy - unit * .3]]);
  assert.deepEqual((await board(S)).at, [1, 2], 'a drag slides the grid a quarter square');
  assert.equal(await page.locator('.cv-num.cov').innerText(), '12', 'and the gap gets worse');
  await svg.focus(); await page.keyboard.press('ArrowDown');
  assert.deepEqual((await board(S)).at, [1, 3], 'an arrow key slides it');
  await button('Slide the grid up').click();
  assert.deepEqual((await board(S)).at, [1, 2]);
  await shot('slide-worse');
  await button('Slide the grid up').click();
  await done(); await fit('slide solved');
  await shot('slide-solved');

  // The playground: shapes, splits, Clear.
  const G = 'covers-playground';
  await open(G); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await button('Plus').click();
  assert.equal((await board(G)).shape, 'plus');
  await tap(piece('4,4')); await tap(piece('4,4'));
  assert.deepEqual((await board(G)).splits, ['1,1,0', '2,2,1']);
  await shot('playground');
  await button('Clear').click();
  assert.deepEqual((await board(G)).splits, []);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
