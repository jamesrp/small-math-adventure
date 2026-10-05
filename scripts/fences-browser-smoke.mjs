// Plays Garden fences through the real interface on the shared square grid:
// a row planted by one slide, taps and keys to plant and lift, a tile carried
// by a slide, a slide back to its start, the tray's shake when it is empty,
// claims told and solved, the row of gardens with Clear and That's all, the
// pond, the fence limit in Most, a garden that must reach every row and
// column, a limit on moves, the chips of Which fences?, a click with no
// pointer (assistive technology) and the playground's sizes. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone viewport with touch
// slides). Screenshots go in test-results/fences/.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const {puzzles} = JSON.parse(await readFile(new URL('../dist/families/fences/fences.json', import.meta.url), 'utf8'));
const byId = id => puzzles.find(p => p.id === id);
const out = new URL('../test-results/fences/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.gf-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// A touch tap's click can land a moment after the tap resolves, so checks that follow a tap retry briefly.
async function eventually(check) { let last; for (let k = 0; k < 30; k++) { try { return await check(); } catch (e) { last = e; await page.waitForTimeout(100); } } throw last; }
const sq = (id, list) => list.map(([x, y]) => y * (byId(id).parameters.cols || 6) + x);
const tiles = async id => (await board(id))?.tiles || [];
const centre = async i => { const b = await page.locator(`[data-sg-cell="${i}"]`).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = ([x, y]) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
const tap = async i => tapAt(await centre(i));
// A slide through the middles of the given squares: a touch drag on a phone, a mouse drag otherwise.
let cdp = null;
async function slide(...cells) {
  const points = [];
  for (const i of cells) points.push(await centre(i));
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
const fence = () => page.locator('.gf-fence b').innerText().then(Number);
const button = name => page.locator('.gf-button', {hasText: name});
const note = text => page.locator('.gf-note', {hasText: text}).waitFor({timeout: 3000});

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Fences QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Four tiles: a row by one slide, Clear, a square by taps, That's all too soon, lifting, keys.
  const F = 'fences-01', row = sq(F, [[0, 0], [1, 0], [2, 0], [3, 0]]), block = sq(F, [[0, 1], [1, 1], [0, 2], [1, 2]]);
  await open(F); await fit('four tiles');
  await slide(...row);
  await eventually(async () => assert.deepEqual(await tiles(F), row));
  assert.equal(await fence(), 10);
  await eventually(async () => assert.equal(await page.locator('.gf-shelf li').count(), 1));
  await button('Clear').click();
  await eventually(async () => assert.deepEqual(await tiles(F), []));
  for (const i of block) await tap(i);
  await eventually(async () => assert.equal((await tiles(F)).length, 4));
  assert.equal(await fence(), 8);
  await eventually(async () => assert.equal(await page.locator('.gf-shelf li').count(), 2));
  await button('That’s all').click();
  await note('There’s another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'a told claim waits for a change');
  await tap(block[3]);
  await eventually(async () => assert.equal((await tiles(F)).length, 3));
  await page.locator(`[data-sg-cell="${block[3]}"]`).focus(); await page.keyboard.press('Enter');
  await eventually(async () => assert.equal((await tiles(F)).length, 4));
  assert.equal(await page.locator('.gf-note').count(), 0, 'a change clears the answer');
  await shot('four-tiles-two-found');

  // A fence of ten: a row of five, a tile carried by a slide, a slide back to its start, the tray's shake.
  const T = 'fences-02', five = sq(T, [[0, 0], [1, 0], [2, 0], [3, 0]]), last = sq(T, [[0, 1]])[0];
  await open(T); await fit('a fence of ten');
  await slide(...five); await tap(last);
  await eventually(async () => assert.equal((await tiles(T)).length, 5));
  assert.equal(await fence(), 12);
  await tap(sq(T, [[3, 3]])[0]);
  await eventually(async () => assert.match(await page.locator('.gf-tray').getAttribute('class'), /nudge/, 'an empty tray shakes'));
  assert.equal((await tiles(T)).length, 5);
  const [end, nook] = sq(T, [[3, 0], [1, 1]]);
  await slide(end, sq(T, [[3, 1]])[0], end);
  await page.waitForTimeout(300);
  assert.ok((await tiles(T)).includes(end), 'a slide back to its start does nothing');
  await slide(end, sq(T, [[2, 1]])[0], nook);
  await done();
  assert.deepEqual(await tiles(T), sq(T, [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]]));
  await shot('fence-of-ten-solved');

  // Round the pond: no control on the pond, an open pond, Longest told, then sealed at a corner.
  const P = 'fences-08', pond = sq(P, [[2, 2]])[0];
  await open(P); await fit('round the pond');
  assert.equal(await page.locator(`[data-sg-cell="${pond}"]`).count(), 0, 'the pond takes no tile');
  const ring = sq(P, [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3], [3, 3]]);
  await slide(...sq(P, [[1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [1, 2]]));
  await eventually(async () => assert.deepEqual(await tiles(P), ring));
  assert.equal(await fence(), 16);
  await button('Longest').click();
  await note('There’s a longer fence.');
  await slide(sq(P, [[3, 3]])[0], sq(P, [[3, 4]])[0], sq(P, [[2, 4]])[0]);
  await eventually(async () => assert.equal(await fence(), 18));
  await shot('pond-sealed');
  await button('Longest').click();
  await done();

  // Most: rows planted by slides, the limit shown and passed, then the best block.
  const M = 'fences-06', R = y => sq(M, [[0, y], [1, y], [2, y]]);
  await open(M); await fit('most');
  for (const y of [0, 1, 2]) await slide(...R(y));
  await eventually(async () => assert.equal((await tiles(M)).length, 9));
  assert.match(await page.locator('.gf-fence').innerText(), /12\s*\/\s*14/);
  await button('Most').click();
  await note('More tiles fit.');
  await slide(...sq(M, [[3, 0], [4, 0], [5, 0]]));
  await eventually(async () => assert.equal(await fence(), 18));
  assert.match(await page.locator('.gf-fence').getAttribute('class'), /over/);
  assert.equal(await button('Most').isDisabled(), true, 'over the limit');
  await shot('most-over');
  for (const i of sq(M, [[3, 0], [4, 0], [5, 0]])) await tap(i);
  await slide(...R(3));
  await eventually(async () => assert.equal(await fence(), 14));
  await button('Most').click();
  await done();

  // Every row, every column: a block is refused until the garden reaches every row and column.
  const S = 'fences-05', at5 = (x, y) => y * 5 + x;
  await open(S); await fit('every row, every column');
  for (const y of [0, 1, 2]) await slide(at5(0, y), at5(1, y), at5(2, y), at5(3, y));
  await eventually(async () => assert.equal((await tiles(S)).length, 12));
  await note('Reach every row and every column.');
  assert.equal(await button('Shortest').isDisabled(), true);
  await slide(at5(3, 1), at5(3, 2), at5(3, 3), at5(2, 3), at5(1, 3), at5(0, 3));
  await slide(at5(2, 1), at5(3, 1), at5(4, 1), at5(4, 0));
  await eventually(async () => assert.equal(await fence(), 22, 'gaps in two columns'));
  await button('Shortest').click();
  await note('There’s a shorter fence.');
  await slide(at5(3, 2), at5(3, 1), at5(2, 1));
  await eventually(async () => assert.equal(await fence(), 18));
  await shot('every-row-column');
  await button('Shortest').click();
  await done();

  // Two moves: carries by slides, the moves left, a third tile refused with a shake, then the block.
  const V = 'fences-10', at = (x, y) => y * 5 + x;
  await open(V); await fit('two moves');
  assert.equal(await page.locator('.gf-moves i.on').count(), 2);
  assert.equal(await page.locator('.gf-tray').count(), 0, 'no tray while every tile is planted');
  await slide(at(0, 1), at(1, 1), at(2, 1), at(2, 2), at(2, 3));
  await eventually(async () => assert.equal(await page.locator('.gf-moves i.on').count(), 1));
  assert.equal(await page.locator('.sg-cell.home').count(), 1, 'the square a tile left');
  assert.equal(await fence(), 18);
  await slide(at(1, 1), at(2, 1), at(2, 2));
  await eventually(async () => assert.equal(await fence(), 14));
  await tap(at(3, 2));
  await eventually(async () => assert.match(await page.locator('.gf-moves').getAttribute('class'), /nudge/, 'no moves left: the moves shake'));
  assert.equal((await tiles(V)).length, 12);
  await shot('two-moves');
  await button('Shortest').click();
  await done();

  // Which fences: chips light and ring as the plot changes.
  const W = 'fences-04';
  await open(W); await fit('which fences');
  await slide(...sq(W, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]));
  await eventually(async () => assert.equal(await page.locator('.gf-chips li.found.here').innerText(), '12'));
  await button('Clear').click();
  await slide(...sq(W, [[0, 0], [1, 0], [1, 1], [0, 1], [0, 2]]));
  await eventually(async () => assert.equal(await page.locator('.gf-chips li.found').count(), 2));
  await shot('which-fences');
  await button('That’s all').click();
  await done();

  // The playground: a size, a click with no pointer before it, Clear.
  const G = 'fences-playground';
  await open(G); await fit('playground');
  await page.locator('.gf-size').first().click();
  await eventually(async () => assert.equal((await board(G)).size, 4));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('[data-sg-cell="5"]').dispatchEvent(new MouseEvent('click', {bubbles: true})));
  await eventually(async () => assert.deepEqual((await board(G)).tiles, [5]));
  await slide(6, 10, 9);
  await eventually(async () => assert.deepEqual((await board(G)).tiles, [5, 6, 9, 10]));
  assert.equal(await fence(), 8);
  await shot('playground');
  await button('Clear').click();
  await eventually(async () => assert.deepEqual((await board(G)).tiles, []));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, screenshots: 'test-results/fences/'}, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  console.error(error);
  console.log(JSON.stringify({passed: false, errors}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
