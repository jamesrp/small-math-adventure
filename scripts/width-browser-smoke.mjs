// Plays Snug spinners through the real interface: the first gap chosen on a
// fresh board, a compass that misses (nothing saved), a tap on a gap's own
// end (ignored), a dot that sits on a gap's dashed line (the dot wins), a tap
// on a gap's line between dots (the gap wins), a corner at the end of the
// chosen gap tapped through its disc, Enter on a corner, the spin of a full
// shape that is not snug (the band and the dashed start line), tapping an arc
// in the spin to change it, a solve, Undo back to a full shape, Spin again,
// hints with Apply hint, a repair puzzle, the busiest board on a small
// phone, focus after keyboard moves, and the playground: choosing shapes,
// Undo, dragging and keys to turn, and the band for a square but not a disk.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/width/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/width/', import.meta.url);
const pack = JSON.parse(await readFile(new URL('../dist/families/width/width.json', import.meta.url), 'utf8'));
const puzzle = id => pack.puzzles.find(p => p.id === id);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.wd-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 8000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const view = () => page.locator('.wd-puzzle').getAttribute('data-view');
// The spin animation runs once per new full shape; wait for its end.
const settled = () => page.waitForFunction(() => !document.querySelector('.wd-puzzle.wd-anim'), null, {timeout: 8000});
const point = id => page.locator(`.wd-pt[data-pt="${id}"] .wd-pad`);
// Scroll the board into view before reading positions (the phone is short).
const show = () => page.locator('svg.wd-board').evaluate(el => el.scrollIntoView({block: 'nearest'}));
const centre = async locator => { await show(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async locator => tapAt(await centre(locator));
// A point a fraction of the way along a gap's line or arc, in page pixels.
const along = async (gap, f) => { await show(); return page.evaluate(([gap, f]) => {
  const el = document.querySelector(`.wd-gap[data-gap="${gap}"]`), q = el.getPointAtLength(el.getTotalLength() * f), m = el.getScreenCTM();
  const pt = new DOMPoint(q.x, q.y).matrixTransform(m);
  return [pt.x, pt.y];
}, [gap, f]); };
// The point of a gap's line or arc furthest from every corner and dot.
const clear = async gap => { await show(); return page.evaluate(gap => {
  const el = document.querySelector(`.wd-gap[data-gap="${gap}"]`), len = el.getTotalLength(), m = el.getScreenCTM();
  const pads = [...document.querySelectorAll('.wd-pad')].map(c => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]);
  let best = null, far = -1;
  for (let k = 1; k < 40; k++) {
    const q = el.getPointAtLength(len * k / 40), d = Math.min(...pads.map(([x, y]) => Math.hypot(q.x - x, q.y - y)));
    if (d > far) { far = d; best = q; }
  }
  const pt = new DOMPoint(best.x, best.y).matrixTransform(m);
  return [pt.x, pt.y];
}, gap); };
const selected = () => page.evaluate(() => Number(document.querySelector('.wd-gap[aria-pressed="true"]')?.dataset.gap ?? -1));
const undo = () => page.locator('[data-action="undo"]').click();
const hint = () => page.locator('[data-action="hint"]').click();
const active = () => page.evaluate(() => { const a = document.activeElement; return {cls: a?.getAttribute('class') || a?.tagName, focus: a?.dataset?.focus || ''}; });
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Width QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // ---- Puzzle 1: the triangle, built by hand.
  await open('width-01');
  assert.equal(await view(), 'build');
  assert.equal(await selected(), 0, 'the first gap is chosen on a fresh board');
  assert.equal(await page.locator('.wd-spin').isDisabled(), true, 'Spin waits for a full shape');
  const box = await page.locator('svg.wd-board').boundingBox();
  assert.ok(box.width <= 381 && box.height <= 381, `compact board (${box.width}×${box.height})`);
  await fit('fresh triangle');
  // A dot halfway along another side is not the same distance from A and B:
  // the compass misses, and nothing is saved.
  await tap(point('mBC'));
  await page.locator('.wd-miss').waitFor();
  assert.equal(await page.locator('.wd-short').count(), 1, 'the miss shows how far the circle is from B');
  assert.deepEqual((await board('width-01')).arcs, [null, null, null], 'a miss is not a move');
  assert.equal(await page.locator('[data-action="undo"]').isDisabled(), true, 'a miss leaves nothing to undo');
  await shot('01-miss');
  // A tap on an end of the chosen gap does nothing.
  await tap(point('A'));
  assert.deepEqual((await board('width-01')).arcs, [null, null, null], 'an end of the gap is not a centre');
  // The dot halfway from A to B sits on the gap's dashed line: a tap on it
  // centres the arc there (the dot is on top), and the next empty gap is chosen.
  await tap(point('mAB'));
  await page.waitForFunction(() => document.querySelector('.wd-arc'));
  assert.deepEqual((await board('width-01')).arcs, ['mAB', null, null], 'the dot on the line centres the arc');
  assert.equal(await selected(), 1, 'the next empty gap is chosen');
  // A tap on the line from C to A between its corner and its dot chooses that gap.
  await tapAt(await along(2, 0.22));
  assert.equal(await selected(), 2, 'a tap on a gap line chooses the gap');
  // A tap just inside corner B's disc, where the disc covers the end of the
  // gap from B to C, goes to the corner: centre the arc from C to A on B.
  const [bx, by] = await centre(point('B'));
  await tapAt([bx + 6, by - 3]);
  await page.waitForFunction(() => document.querySelectorAll('.wd-arc').length === 2);
  assert.deepEqual((await board('width-01')).arcs, ['mAB', null, 'B'], 'the corner disc wins over the gap line under it');
  // Enter on corner A centres the last gap (B to C); the full shape spins.
  await page.locator('.wd-pt[data-pt="A"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.wd-puzzle')?.dataset.view === 'spin');
  assert.deepEqual((await board('width-01')).arcs, ['mAB', 'A', 'B']);
  const f1 = await active();
  assert.ok(/wd-spin|wd-gap|wd-pt/.test(f1.cls), `focus after a keyboard move stays on the board's controls (${f1.cls})`);
  await settled();
  assert.equal(await page.locator('.wd-band').count(), 1, 'a shape that is not snug shows how far the top rail moved');
  assert.equal(await page.locator('.wd-top.snug').count(), 0);
  assert.equal(await page.locator('#completion-heading').count(), 0, 'not a solve');
  await shot('01-wobble');
  // Tap the half circle in the spin to change it.
  await tapAt(await along(0, 0.5));
  await page.waitForFunction(() => document.querySelector('.wd-puzzle')?.dataset.view === 'build');
  assert.equal(await selected(), 0, 'tapping an arc in the spin chooses its gap');
  await tap(point('C'));
  await done();
  assert.deepEqual((await board('width-01')).arcs, ['C', 'A', 'B']);
  assert.equal(await view(), 'spin');
  await settled();
  assert.equal(await page.locator('.wd-top.snug').count(), 1, 'the snug shape keeps its top rail');
  assert.equal(await page.locator('.wd-ghost').count(), 3, 'other turns between the same rails');
  await shot('01-snug');

  // ---- Undo and Spin on a fresh copy of puzzle 1.
  await page.locator('[data-action="replay"]').click();
  await page.waitForFunction(() => document.querySelector('.wd-puzzle')?.dataset.view === 'build');
  for (const [gap, at] of [[0, 'mAB'], [1, 'A'], [2, 'B']]) {
    if (await selected() !== gap) await tapAt(await clear(gap));
    await tap(point(at));
  }
  await settled();
  // Change a full shape into another full shape, then Undo: the old one spins.
  await tapAt(await along(1, 0.5));
  await tap(point('mBC'));
  await page.waitForFunction(() => document.querySelector('.wd-puzzle')?.dataset.view === 'spin');
  assert.deepEqual((await board('width-01')).arcs, ['mAB', 'mBC', 'B']);
  const before = await page.locator('.wd-shape').getAttribute('d');
  await undo();
  await page.waitForFunction(() => document.querySelector('.wd-puzzle')?.dataset.view === 'spin');
  assert.deepEqual((await board('width-01')).arcs, ['mAB', 'A', 'B'], 'Undo takes back the last arc');
  await settled();
  assert.notEqual(await page.locator('.wd-shape').getAttribute('d'), before, 'Undo visibly changes the shape');
  await settled();
  await page.locator('.wd-spin').click();
  await page.waitForFunction(() => document.querySelector('.wd-puzzle.wd-anim'), null, {timeout: 3000});
  await settled();
  // Hints: the third offers Apply hint, which re-centres the half circle.
  await hint(); await hint(); await hint();
  await page.locator('.wd-hint-gap').waitFor();
  assert.match(await page.locator('.hint-card').innerText(), /Centre the arc from A to B on C\./);
  await page.locator('[data-action="apply-hint"]').click();
  await done();

  // ---- Puzzle 2: a repair. It spins at once and is not snug.
  await open('width-02');
  assert.equal(await view(), 'spin');
  await settled();
  assert.equal(await page.locator('.wd-band').count(), 1);
  await shot('02-start');
  const p2 = puzzle('width-02');
  for (const [gap, at] of p2.solution.arcs.entries()) {
    if ((await board('width-02')).arcs[gap] === at) continue;
    if (await view() === 'spin') { await settled(); await tapAt(await along(gap, 0.5)); }
    if (await selected() !== gap) await tapAt(await clear(gap));
    await tap(point(at));
  }
  await done();

  // ---- Puzzle 9 (hard): the busiest build board, with a miss, on the phone.
  await open('width-09');
  const p9 = puzzle('width-09');
  await tap(point(p9.parameters.order[2]));
  await page.locator('.wd-miss').waitFor();
  await fit('kite with a miss');
  const b9 = await page.locator('svg.wd-board').boundingBox(), spin9 = await page.locator('.wd-spin').boundingBox();
  assert.ok(b9.width <= 381, 'compact board');
  if (phone) assert.ok(b9.height + spin9.height < 667, 'the board and Spin fit a small phone');
  await shot('09-miss');
  // Solve by tapping, in a mixed order.
  for (const gap of [4, 0, 3, 1, 2]) {
    if (await view() === 'spin') { await settled(); await tapAt(await along(gap, 0.5)); }
    if (await selected() !== gap) await tapAt(await clear(gap));
    await tap(point(p9.solution.arcs[gap]));
  }
  await done();
  await settled();
  await shot('09-snug');

  // ---- Hints alone solve puzzle 5 from a wrong start.
  await open('width-05');
  await tap(point(`m${puzzle('width-05').parameters.order[0]}${puzzle('width-05').parameters.order[1]}`));
  for (let k = 0; k < 3; k++) await hint();
  for (let k = 0; k < 8 && !(await page.locator('#completion-heading').count()); k++) {
    await page.locator('[data-action="apply-hint"]').click();
    await page.waitForTimeout(80);
  }
  await done();

  // ---- The playground.
  await open('width-playground');
  assert.equal(await page.locator('.wd-pick').count(), puzzle('width-playground').parameters.shapes.length);
  assert.equal(await page.locator('[data-action="hint"]').count(), 0, 'no hints in the playground');
  const slider = page.locator('svg.wd-turnable');
  await slider.focus();
  for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowLeft');
  assert.equal(await slider.getAttribute('aria-valuenow'), '30', 'arrow keys turn the shape');
  const band = async () => Number(await page.locator('.wd-band.soft').getAttribute('height'));
  assert.equal(await band(), 0, 'the disk keeps the top rail still');
  // The square: turning it lifts the rail, and the band shows how far.
  await page.locator('.wd-pick[aria-label="Square"]').click();
  assert.equal((await board('width-playground')).shape, 2);
  assert.equal(await slider.getAttribute('aria-valuenow'), '0', 'a new shape starts unturned');
  await page.locator('.wd-turn-button[aria-label="Turn left"]').click();
  await page.locator('.wd-turn-button[aria-label="Turn left"]').click();
  await page.locator('.wd-turn-button[aria-label="Turn left"]').click();
  assert.equal(await page.locator('svg.wd-turnable').getAttribute('aria-valuenow'), '45');
  assert.ok(await band() > 50, 'the square lifts the top rail');
  await shot('play-square');
  // Drag round the curved triangle to turn it.
  await page.locator('.wd-pick[aria-label="Curved triangle"]').click();
  const sb = await page.locator('svg.wd-turnable').boundingBox();
  const cx = sb.x + sb.width / 2, cy = sb.y + sb.height * 0.6, r = sb.width * 0.35;
  const path = Array.from({length: 13}, (_, k) => { const t = k * Math.PI / 24; return [cx + r * Math.cos(t), cy - r * Math.sin(t)]; });
  if (phone) {
    const cdp = await context.newCDPSession(page);
    const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
    await touch('touchStart', path[0]);
    for (const pt of path.slice(1)) await touch('touchMove', pt);
    await touch('touchEnd', path.at(-1));
  } else {
    await page.mouse.move(...path[0]); await page.mouse.down();
    for (const pt of path.slice(1)) await page.mouse.move(...pt, {steps: 3});
    await page.mouse.up();
  }
  await page.waitForTimeout(100);
  const turned = Number(await page.locator('svg.wd-turnable').getAttribute('aria-valuenow'));
  assert.ok(turned > 20 && turned < 120, `a drag turns the shape (${turned})`);
  assert.ok(await band() < 0.5, 'the curved triangle keeps the top rail still');
  await shot('play-curved');
  await undo();
  assert.equal((await board('width-playground')).shape, 2, 'Undo brings back the square');
  await fit('playground');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Snug spinners browser smoke passed (${phone ? 'phone' : 'desktop'}).`);
} finally {
  await browser.close();
}
