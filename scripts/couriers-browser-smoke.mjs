// Plays Mirror Couriers (base mechanic `billiard`) through the real interface:
// dragging and tapping the room's corner (no path until Launch), the arrow
// keys on the corner, Launch, Can't and the corner map with taps between dots
// going to the nearer one, refusals that clear the taps and come back with
// Undo, "There is a way." with its lock, the halfway claim for the start
// corner, find every with Keep and That's all, aiming by tapping a crossing
// and the fold, the first crossing, keyboard focus after each move, 44 px
// buttons and no overflow on the busiest boards. Same environment variables
// as the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE,
// TEST_URL, TEST_PHONE=1 for a 375 × 667 phone with touch). Screenshots go in
// SHOTS_DIR, or test-results/couriers/.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({ viewport: phone ? { width: 375, height: 667 } : { width: 1280, height: 860 }, hasTouch: phone });
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS_DIR ? pathToFileURL(process.env.SHOTS_DIR.replace(/\/?$/, '/')) : new URL('../test-results/couriers/', import.meta.url);
const shot = name => page.screenshot({ path: new URL(`${name}${phone ? '-phone' : '-desktop'}.png`, out).pathname, fullPage: true });
const attempt = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id], [key, id]);
const board = async id => (await attempt(id))?.board;
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="billiard"]').waitFor(); };
const solved = () => page.locator('#completion-heading').waitFor({ timeout: 5000 });
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const status = async () => (await page.locator('.cr-status').count()) ? (await page.locator('.cr-status').innerText()).trim() : '';
const button = name => page.locator('.cr-controls button', { hasText: new RegExp(`^${name}$`) });
const focused = () => page.evaluate(() => document.activeElement?.dataset?.focus || document.activeElement?.id || document.activeElement?.tagName);

// Screen point of an SVG user point on a board.
const screen = (selector, x, y) => page.locator(selector).evaluate((svg, [x, y]) => { const q = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [x, y]);
let cdp = null;
async function press(points) {
  if (!phone) {
    await page.mouse.move(...points[0]); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(...p, { steps: 6 });
    return () => page.mouse.up();
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', points[0]);
  for (let k = 1; k < points.length; k++) for (let s = 1; s <= 6; s++) {
    const [x1, y1] = points[k - 1], [x2, y2] = points[k];
    await touch('touchMove', [x1 + (x2 - x1) * s / 6, y1 + (y2 - y1) * s / 6]);
  }
  return () => touch('touchEnd', points.at(-1));
}
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
// The room board: grid point (w, h) of a cols × rows grid, 40 units a square.
const corner = (rows, w, h) => screen('[data-cr-room]', w * 40, (rows - h) * 40);
async function drag(rows, from, to, check) {
  await page.locator('[data-cr-room]').scrollIntoViewIfNeeded();
  const release = await press([await corner(rows, ...from), await corner(rows, ...to)]);
  if (check) await check();
  await release();
}
// A map dot or sheet crossing by its data-at.
const dotCentre = async at => { const node = page.locator(`[data-at="${at}"]`); await node.scrollIntoViewIfNeeded(); const [cx, cy] = await node.evaluate(n => [Number(n.dataset.cx), Number(n.dataset.cy)]); return screen('svg[data-cr-map],svg[data-cr-sheet]', cx, cy); };
const tapDot = async at => tapAt(await dotCentre(at));
async function minButton() {
  return page.locator('.expansion-board button:visible').evaluateAll(nodes => Math.min(...nodes.map(n => { const r = n.getBoundingClientRect(); return Math.min(r.width, r.height); })));
}
async function boardFits(label) {
  await fit(label);
  const box = await page.locator('[data-mechanic-wire="billiard"]').boundingBox();
  assert.ok(box.width <= 381, `${label}: board ${box.width} px wide`);
  if (phone) assert.ok(box.height <= 667 - 60, `${label}: board and controls fit a phone screen (${Math.round(box.height)} px)`);
  assert.ok(await minButton() >= 43.9, `${label}: 44 px buttons`);
}

try {
  await mkdir(out, { recursive: true });
  await page.goto(base); await page.locator('#nickname').fill('Courier QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.lr-overview').waitFor();

  // 1. Shape the room (top right after 2 bounces, 6 by 6 grid).
  await open('billiard-04');
  await boardFits('billiard-04 fresh'); await shot('04-fresh');
  assert.equal(await page.locator('.cr-path').count(), 0, 'no path before Launch');
  await drag(6, [1, 1], [2, 2]);
  assert.equal(await page.locator('.cr-path').count(), 0, 'no path after a drag');
  assert.equal(await page.locator('[data-room="handle"]').getAttribute('aria-valuetext'), '2 wide, 2 high');
  await button('Launch').click();
  assert.equal(await status(), 'Top right after 0 bounces.');
  assert.equal((await attempt('billiard-04')).moves, 1, 'a launch is the move');
  await page.waitForTimeout(400); await shot('04-launched');
  // While dragging, the old path hides; the path is drawn only by Launch.
  await drag(6, [2, 2], [4, 2], async () => assert.equal(await page.locator('.cr-flight:visible').count(), 0, 'path hidden while dragging'));
  assert.equal(await page.locator('.cr-path').count(), 0);
  assert.equal((await attempt('billiard-04')).moves, 1, 'dragging is not a move');
  // Keyboard on the corner.
  await page.locator('[data-room="handle"]').focus(); await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('[data-room="handle"]').getAttribute('aria-valuetext'), '3 wide, 2 high');
  assert.equal(await focused(), 'cr-corner');
  // Can't on a possible board: claim the two-bounce corners, hear "There is a way."
  await button('Can’t').focus(); await page.keyboard.press('Enter');
  await page.locator('svg[data-cr-map]').waitFor();
  assert.match(await focused(), /^cr-at-/, 'focus moves into the map');
  assert.equal(await page.locator('.cr-bounces').count(), 0, 'no bounce counts before the claim');
  await tapDot('1,3'); await tapDot('3,1');
  assert.equal(await page.locator('.cr-dot.chosen').count(), 2);
  await button('That’s all').focus(); await page.keyboard.press('Enter');
  assert.equal(await status(), 'There is a way.');
  assert.equal(await focused(), 'cr-corner', 'focus goes to the room corner when the map closes');
  assert.equal(await button('Can’t').isDisabled(), true);
  // Undo reopens the map with the taps and keeps the lock.
  await page.getByRole('button', { name: /Undo/ }).click();
  assert.equal(await page.locator('.cr-dot.chosen').count(), 2, 'Undo brings the taps back');
  assert.equal(await status(), 'There is a way.');
  assert.equal(await page.locator('.cr-dot[aria-disabled="true"]').count() > 0, true);
  await tapDot('2,2');
  assert.equal(await page.locator('.cr-dot.chosen').count(), 2, 'a locked map ignores taps');
  assert.equal(await page.locator('.feedback').innerText().catch(() => ''), '', 'no error message from a locked tap');
  await button('Can’t').click();
  await page.locator('[data-cr-room]').waitFor();
  assert.equal(await button('Can’t').isDisabled(), true, 'the lock stays');
  await drag(6, [3, 2], [3, 1]);
  await button('Launch').focus(); await page.keyboard.press('Enter');
  await solved();
  await page.waitForTimeout(2200); await shot('04-solved');

  // 2. An impossible target: top right after 3 bounces.
  await open('billiard-17');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t needs a launch first');
  await button('Launch').click();
  await button('Can’t').click();
  await page.locator('svg[data-cr-map]').waitFor();
  await boardFits('billiard-17 map');
  // A tap between two dots, nearer (1,4) than (1,3), goes to (1,4).
  const [ax, ay] = await dotCentre('1,4'), [bx, by] = await dotCentre('1,3');
  await tapAt([ax + (bx - ax) * .4, ay + (by - ay) * .4]);
  assert.deepEqual((await board('billiard-17')).cert, [[1, 4]], 'the nearer dot takes a tap between two');
  await tapDot('2,3'); await tapDot('1,1');
  await shot('17-claim');
  await button('That’s all').click();
  assert.equal(await status(), 'This one isn’t 3 bounces.');
  assert.equal(await page.locator('.cr-dot.chosen').count(), 0, 'a refusal clears the taps');
  assert.equal(await page.locator('.cr-dot.refused').count(), 1);
  await page.getByRole('button', { name: /Undo/ }).click();
  assert.equal(await page.locator('.cr-dot.chosen').count(), 3, 'Undo brings the taps back');
  assert.equal(await status(), 'This one isn’t 3 bounces.', 'with the refusal');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a change');
  await tapDot('1,1');
  // Keyboard: arrows move between dots, Enter taps.
  await page.locator('[data-at="2,3"]').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
  assert.equal(await focused(), 'cr-at-3-2');
  await page.keyboard.press('Enter');
  assert.equal(await focused(), 'cr-at-3-2', 'focus stays on the tapped dot');
  await tapDot('4,1');
  await button('That’s all').click();
  await solved();
  assert.equal(await page.locator('.cr-proof').count(), 1);
  assert.ok(await page.locator('.cr-bounces').count() >= 36, 'every corner’s bounces after the claim');
  await page.waitForTimeout(1000); await shot('17-proof');

  // 3. Back to the start: a copy of the start corner, then a corner on the way.
  await open('billiard-16');
  await drag(6, [1, 1], [3, 2]); await button('Launch').click();
  await button('Can’t').click(); await page.locator('svg[data-cr-map]').waitFor();
  assert.equal(await button('That’s all').count(), 0, 'the second tap is the claim');
  await tapDot('1,1'); await tapDot('2,2');
  assert.equal(await status(), 'That corner folds to the top right.');
  await tapDot('4,2'); await tapDot('2,1');
  await solved();
  assert.ok(await page.locator('.cr-half').count() >= 9);
  await page.waitForTimeout(1000); await shot('16-proof');

  // 4. Every one-bounce room: Keep, That's all, no counter.
  await open('billiard-15');
  const keep = async (w, h) => { await drag(6, (await board('billiard-15')).room || [1, 1], [w, h]); await button('Keep').click(); };
  await drag(6, [1, 1], [2, 1]); await button('Launch').click();
  assert.equal(await status(), 'Bottom right after 1 bounce.');
  for (const [w, h] of [[2, 1], [4, 2], [6, 3], [1, 2], [2, 4]]) await keep(w, h);
  assert.doesNotMatch(await page.locator('.board-panel').innerText(), /\d+\s*(of|\/)\s*\d+/, 'no found-count');
  await button('That’s all').click();
  assert.equal(await status(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true);
  await shot('15-shelf');
  await keep(3, 6);
  await button('That’s all').click();
  await solved();
  assert.equal(await page.locator('.cr-twice').count(), 1);
  await shot('15-solved');

  // 5. Aim by tapping a crossing; the line folds into the path.
  await open('billiard-05');
  assert.equal(await button('Launch').isDisabled(), true, 'Launch waits for an aim');
  await tapDot('2,2');
  assert.equal((await attempt('billiard-05')).moves, 0, 'choosing an aim is not a move');
  await button('Launch').click();
  assert.equal(await status(), 'Top right after 0 bounces.');
  await tapDot('3,2');
  assert.equal(await page.locator('.cr-folded').count(), 0, 'a new aim hides the old path');
  await button('Launch').click();
  await solved();
  assert.ok(await page.locator('.cr-tile').count() >= 4);
  await page.waitForTimeout(900); await shot('05-folding');
  await page.waitForTimeout(2600); await shot('05-folded');

  // 6. The first crossing.
  await open('billiard-13');
  await tapDot('1,0');
  assert.equal(await status(), 'The line doesn’t go there.');
  await tapDot('3,2');
  await solved();
  await page.waitForTimeout(3000); await shot('13-solved');

  // 7. The busiest boards fit, with their controls on screen.
  await open('billiard-18');
  await drag(8, [1, 1], [8, 7]); await button('Launch').click();
  await button('Can’t').click(); await page.locator('svg[data-cr-map]').waitFor();
  for (const at of ['1,9', '3,7', '7,3', '9,1', '5,5']) await tapDot(at);
  await boardFits('billiard-18 map'); await shot('18-map');
  await open('billiard-03'); await drag(10, [1, 1], [10, 6]); await button('Launch').click(); await page.waitForTimeout(2200);
  await solved(); await boardFits('billiard-03 solved'); await shot('03-solved');
  await open('billiard-11'); await tapDot('5,5'); await button('Launch').click();
  assert.equal(await status(), 'Top right after 0 bounces.', 'aiming past an earlier crossing stops there');
  await page.waitForTimeout(2600); await boardFits('billiard-11 launched'); await shot('11-early-corner');
  await open('billiard-07'); await drag(6, [1, 1], [4, 3]); await button('Launch').click(); await solved(); await page.waitForTimeout(2200); await boardFits('billiard-07'); await shot('07-solved');

  // 8. Reload keeps the attempt.
  await open('billiard-08'); await drag(6, [1, 1], [3, 3]); await button('Launch').click();
  const before = await attempt('billiard-08');
  await page.reload(); await page.locator('[data-mechanic-wire="billiard"]').waitFor();
  assert.deepEqual((await attempt('billiard-08')).board, before.board);
  assert.equal(await status(), 'Top right after 0 bounces.');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, phone, screenshots: out.pathname }, null, 2));
} finally {
  await browser.close();
}
