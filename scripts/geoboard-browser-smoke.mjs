// Plays Geoboard through the real interface on the shared square grid:
// stretching a band by taps, a refused side that touches the band (it flashes
// and nothing changes), taking back a corner, closing, picking up a corner
// and moving it, a corner drag, Undo, Enter and arrow keys, a solve; Can't
// waiting for a band, the stepper, a wrong claim kept by Undo and a right
// claim with its argument; That's all refused with no count shown; a cut with
// its seam dots and a refused cut; a hole; hints; the playground's sizes; and
// no page overflow. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// with touch). Screenshots go in test-results/geoboard/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/geoboard/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.geo-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// A dot that is a control now, by its accessible name.
const dot = ([x, y]) => page.locator(`.geo-board [data-sg-point][aria-label^="Dot ${x} across, ${y} up."], .geo-board [data-sg-point][aria-label^="Dot ${x} across, ${y} up,"]`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async pt => { await dot(pt).scrollIntoViewIfNeeded(); const [x, y] = await center(dot(pt)); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const taps = async (...pts) => { for (const pt of pts) await tap(pt); };
const band = async (...pts) => taps(...pts, pts[0]);
const button = name => page.locator('.geo-puzzle button', {hasText: name});
let cdp = null;
async function drag(from, to) {
  await page.locator('.geo-board').scrollIntoViewIfNeeded();
  // The target need not be a control, so it is found by its place on the board.
  const target = await page.evaluate(([x, y]) => {
    const svg = document.querySelector('.geo-board'), m = svg.getScreenCTM(), vb = svg.viewBox.baseVal, rows = Math.round((vb.height + vb.y * 2) / 10);
    const pt = svg.createSVGPoint(); pt.x = x * 10; pt.y = (rows - y) * 10;
    const r = pt.matrixTransform(m); return [r.x, r.y];
  }, to);
  const points = [await center(dot(from)), target];
  assert.ok(points.every(([, y]) => y > 0 && y < page.viewportSize().height), 'the drag is on screen');
  if (!phone) {
    await page.mouse.move(...points[0]); await page.mouse.down();
    await page.mouse.move(...points[1], {steps: 10});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', points[0]);
  for (let s = 1; s <= 10; s++) await touch('touchMove', [points[0][0] + (points[1][0] - points[0][0]) * s / 10, points[0][1] + (points[1][1] - points[0][1]) * s / 10]);
  await touch('touchEnd', points[1]);
}
const D = (w, [x, y]) => y * w + x;
const activeIsSafe = () => page.evaluate(() => { const el = document.activeElement; return !el?.closest?.('.geo-cant,.geo-all'); });
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Geoboard QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1 (4 × 4): taps, a refused side, take back, close, a corner, Undo, keys, a solve.
  const P1 = 'geoboard-01', w1 = 4;
  await open(P1); await fit('puzzle 1');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no objective: the goal row shows the task');
  assert.equal(await page.locator('.geo-record tr.geo-goal td.geo-cell.empty').count(), 1, 'the third count is not shown');
  await taps([0, 0], [2, 0], [2, 2]);
  assert.deepEqual((await board(P1)).open, [[0, 0], [2, 0], [2, 2]].map(p => D(w1, p)), 'taps stretch the band');
  await tap([1, 0]);
  assert.deepEqual((await board(P1)).open, [[0, 0], [2, 0], [2, 2]].map(p => D(w1, p)), 'a side that touches the band is refused');
  assert.equal(await page.locator('.geo-refuse .geo-tried').count(), 1, 'the refused side flashes');
  assert.equal(await page.locator('.geo-refuse .geo-x').count(), 1, 'with a cross where it touches');
  assert.equal(await page.locator('.geo-status').textContent(), 'Sides can’t cross or touch.');
  await tap([2, 2]);
  assert.equal((await board(P1)).open.length, 2, 'a tap on the last corner takes it back');
  await taps([2, 2], [0, 2], [0, 0]);
  let b = await board(P1);
  assert.deepEqual([b.loops.length, b.open.length], [1, 0], 'a tap on the first corner closes the band');
  assert.equal(await page.locator('.geo-board .geo-ring').count(), 8, 'eight outline rings');
  assert.equal(await page.locator('.geo-board .geo-box').count(), 1, 'one inside box');
  assert.equal(await page.locator('.geo-record tr.geo-live td.miss').count(), 1, 'outline 8 misses the goal');
  await tap([0, 0]);
  assert.equal(await page.locator('.geo-board .geo-held').count(), 1, 'a corner is picked up');
  await tap([1, 0]);
  assert.deepEqual((await board(P1)).loops[0][0], D(w1, [1, 0]), 'and moved');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(P1)).loops[0][0], D(w1, [0, 0]), 'Undo puts it back');
  await drag([2, 2], [3, 3]);
  assert.ok((await board(P1)).loops[0].includes(D(w1, [3, 3])), 'a corner drags to another dot');
  await page.locator('[data-action="undo"]').click();
  await button('Clear').click();
  assert.deepEqual((await board(P1)).loops, [], 'Clear');
  await dot([1, 0]).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P1)).open, [D(w1, [1, 0])], 'Enter taps a dot');
  assert.ok(await activeIsSafe(), 'focus stays on the board');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P1)).open, [D(w1, [1, 0]), D(w1, [2, 1])], 'arrow keys move between dots');
  await taps([1, 2], [0, 1], [1, 0]);
  await done();
  await shot('solved-diamond');

  // Puzzle 8: Can't waits for a band; the stepper; a wrong claim, Undo; a right claim.
  const P8 = 'geoboard-08', w8 = 7;
  await open(P8); await fit('puzzle 8');
  assert.ok(await button('Can’t').isDisabled(), 'Can’t waits for a band');
  await band([0, 0], [0, 1], [1, 3], [4, 1]);
  assert.ok(!(await button('Can’t').isDisabled()));
  await button('Can’t').click();
  assert.equal(await page.locator('.geo-step b').textContent(), '?');
  assert.ok(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'More'), 'opening Can’t moves focus to +');
  for (let i = 0; i < 7; i++) await page.getByRole('button', {name: 'More'}).click();
  assert.equal(await page.locator('.geo-step b').textContent(), '3');
  await shot('cant-stepper');
  await button('Can’t').click();
  assert.equal((await board(P8)).refused, 3, 'a wrong number is refused');
  assert.match(await page.locator('.geo-note').getAttribute('class'), /geo-note/);
  assert.ok(await activeIsSafe(), 'focus after a claim is not on Can’t');
  await page.locator('[data-action="undo"]').click();
  b = await board(P8);
  assert.deepEqual([b.refused, b.loops.length], [3, 1], 'Undo keeps the refusal');
  await button('Can’t').click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', {name: 'More'}).click();
  await button('Can’t').click();
  await done();
  assert.match(await page.locator('.geo-proof').textContent(), /Every band has at least 3 outline dots\./);
  await shot('cant-proof');

  // Puzzle 6: That's all too early; no count.
  const P6 = 'geoboard-06';
  await open(P6); await fit('puzzle 6');
  await band([0, 0], [3, 0], [3, 2], [0, 2]);
  assert.equal(await page.locator('.geo-shelf li').count(), 1, 'the pair of counts is kept');
  await button('That’s all').click();
  assert.equal(await page.locator('.geo-note').textContent(), 'There is another.');
  assert.ok(await button('That’s all').isDisabled(), 'That’s all waits for another pair');
  assert.ok(await activeIsSafe(), 'focus after That’s all is not on it');
  assert.doesNotMatch(await page.locator('.geo-puzzle').innerText(), /\bof 6\b|\/ ?6\b/, 'no found-count');
  await shot('every-refused');

  // Puzzle 4: a cut with its seam dot, a refused cut, the matching cut.
  const P4 = 'geoboard-04';
  await open(P4); await fit('puzzle 4');
  await taps([2, 0], [2, 2]);
  assert.equal(await page.locator('.geo-board .geo-ring.changed').count(), 1, 'the seam dot changes colour');
  await taps([0, 0], [4, 0]);
  assert.equal(await page.locator('.geo-status').textContent(), 'A cut can’t touch the outline.');
  await taps([0, 0], [0, 1], [4, 1]);
  await done();
  assert.equal(await page.locator('.geo-board .geo-ring.changed').count(), 3);
  await shot('cut-solved');

  // Puzzle 11: a hole.
  const P11 = 'geoboard-11';
  await open(P11); await fit('puzzle 11');
  await band([0, 0], [4, 0], [4, 4], [0, 4]);
  await band([1, 1], [3, 1], [3, 3], [1, 3]);
  await done();
  assert.equal((await board(P11)).loops.length, 2);
  await shot('hole');

  // Hints: the second level marks a dot, the third applies it.
  const P3 = 'geoboard-03';
  await open(P3);
  for (let i = 0; i < 3; i++) await page.getByRole('button', {name: 'Hint', exact: true}).click();
  assert.equal(await page.locator('.geo-board .sg-point.hinted').count(), 1, 'a hinted dot');
  await page.getByRole('button', {name: 'Apply hint'}).click();
  assert.equal((await board(P3)).open.length, 1, 'Apply hint starts the band');

  // The playground: sizes, no Hint.
  await open('geoboard-playground'); await fit('playground');
  assert.equal(await page.getByRole('button', {name: 'Hint', exact: true}).count(), 0, 'no Hint');
  await page.getByRole('button', {name: '9 by 9 dots'}).click();
  assert.equal((await board('geoboard-playground')).size, 9);
  await fit('playground 9 × 9');
  await band([0, 0], [8, 0], [8, 8], [0, 8]);
  await band([2, 2], [3, 2], [3, 3]);
  assert.equal((await board('geoboard-playground')).loops.length, 2, 'a hole in the playground');
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
