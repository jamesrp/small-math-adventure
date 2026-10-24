// Plays Snug spinners through the real interface: the first gap chosen on a
// fresh board, a compass that misses (nothing saved), a tap on a gap's own
// end (ignored), a dot that sits on a gap's dashed line (the dot wins), a tap
// on the line clear of that dot's pad (the gap wins), a tap on a gap's line
// between dots (the gap wins), a corner at the end of the chosen gap tapped
// through its disc, taps beside every short gap outside the shape and on its
// line between the pads (the gap wins), 40 px pads and gap areas on a phone,
// Enter on a corner, the spin of a full shape that is
// not snug (the band and the dashed start line), a tap during the spin (it
// ends the spin and does nothing else), a tap inside the spun shape (nothing), tapping an arc in the spin to change
// it, a solve, Undo back to a full shape, Spin again, Spin with reduced
// motion, hints with Apply hint, a repair puzzle, the busiest board on a
// small phone, a missing corner (no gap chosen until it is placed, spots, a
// wrong spot and the compass that misses, moving the corner, Undo, the ringed
// spot of a hint, a solve), taps along the middle of every line of the hard
// puzzles with the corner on each spot (no spot takes them), focus
// after keyboard moves, and the playground: choosing shapes (each button
// shows its corners), Undo, dragging and keys to turn, and the band for a
// square but not a disk.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/width/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {joinable} from '../dist/families/width/width.js';
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
// A point's drawn mark (its pad, clipped by its neighbours, may not be centred on it).
const point = id => page.locator(`.wd-pt[data-pt="${id}"] circle`);
// A gap's line or arc (invisible; its element also holds the gap's part of the board).
const LINE = gap => `.wd-gap[data-gap="${gap}"] .wd-gap-line`;
// Scroll the board into view before reading positions (the phone is short).
const show = () => page.locator('svg.wd-board').evaluate(el => el.scrollIntoView({block: 'nearest'}));
const centre = async locator => { await show(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async locator => tapAt(await centre(locator));
// A point a fraction of the way along a gap's line or arc, in page pixels.
const along = async (gap, f) => { await show(); return page.evaluate(([gap, f]) => {
  const el = document.querySelector(`.wd-gap[data-gap="${gap}"] .wd-gap-line`), q = el.getPointAtLength(el.getTotalLength() * f), m = el.getScreenCTM();
  const pt = new DOMPoint(q.x, q.y).matrixTransform(m);
  return [pt.x, pt.y];
}, [gap, f]); };
// A place a tap chooses the gap: the point of its line or arc furthest from
// every corner and dot when no pad covers it, else beside the line outside
// the shape (a short gap's line can be all pads).
const clear = async gap => { await show(); return page.evaluate(gap => {
  const el = document.querySelector(`.wd-gap[data-gap="${gap}"] .wd-gap-line`), len = el.getTotalLength(), m = el.getScreenCTM();
  const pads = [...document.querySelectorAll('.wd-pt')].map(g => [Number(g.dataset.x), Number(g.dataset.y)]);
  const lands = q => { const pt = new DOMPoint(q.x, q.y).matrixTransform(m); return document.elementFromPoint(pt.x, pt.y)?.closest('[data-gap]')?.dataset.gap === String(gap) ? [pt.x, pt.y] : null; };
  const onLine = Array.from({length: 39}, (_, k) => el.getPointAtLength(len * (k + 1) / 40)).sort((a, b) => Math.min(...pads.map(([x, y]) => Math.hypot(b.x - x, b.y - y))) - Math.min(...pads.map(([x, y]) => Math.hypot(a.x - x, a.y - y))));
  const cx = pads.reduce((t, [x]) => t + x, 0) / pads.length, cy = pads.reduce((t, [, y]) => t + y, 0) / pads.length, mid = el.getPointAtLength(len / 2);
  const out = [30, 45, 20].map(d => { const n = Math.hypot(mid.x - cx, mid.y - cy) || 1; return {x: mid.x + (mid.x - cx) / n * d, y: mid.y + (mid.y - cy) / n * d}; });
  for (const q of [...onLine, ...out]) { const hit = lands(q); if (hit) return hit; }
  return null;
}, gap); };
// A point beside a gap outside the shape, `d` board units out from its line
// at a fraction f along it, in page pixels.
const beside = async (gap, f, d) => { await show(); return page.evaluate(([gap, f, d]) => {
  const el = document.querySelector(`.wd-gap[data-gap="${gap}"] .wd-gap-line`), len = el.getTotalLength(), m = el.getScreenCTM();
  const pads = [...document.querySelectorAll('.wd-corner')].map(g => [Number(g.dataset.x), Number(g.dataset.y)]);
  const cx = pads.reduce((t, [x]) => t + x, 0) / pads.length, cy = pads.reduce((t, [, y]) => t + y, 0) / pads.length;
  const q = el.getPointAtLength(len * f), a = el.getPointAtLength(0), b = el.getPointAtLength(len), l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let n = [(b.y - a.y) / l, -(b.x - a.x) / l];
  if (n[0] * (q.x - cx) + n[1] * (q.y - cy) < 0) n = [-n[0], -n[1]];
  const pt = new DOMPoint(q.x + n[0] * d, q.y + n[1] * d).matrixTransform(m);
  return [pt.x, pt.y];
}, [gap, f, d]); };
// A point at `d` board units along a gap's line or arc from its start (or
// from its end when d is negative), in page pixels.
const fromEnd = async (gap, d) => { await show(); return page.evaluate(([gap, d]) => {
  const el = document.querySelector(`.wd-gap[data-gap="${gap}"] .wd-gap-line`), len = el.getTotalLength(), q = el.getPointAtLength(d >= 0 ? d : len + d), m = el.getScreenCTM();
  const pt = new DOMPoint(q.x, q.y).matrixTransform(m);
  return [pt.x, pt.y];
}, [gap, d]); };
// Gaps (as drawn now) shorter than `most` board units, with their lengths.
const shortGaps = most => page.evaluate(most => [...document.querySelectorAll('.wd-gap .wd-gap-line')].map(el => [Number(el.closest('.wd-gap').dataset.gap), el.getTotalLength()]).filter(([, len]) => len < most), most);
// Tap beside a gap outside the shape (near each end, and at its middle) and
// on its line wherever no pad covers it: each tap chooses the gap and changes
// nothing else.
const swept = [];
async function sweepGap(id, gap, len) {
  const before = JSON.stringify(await board(id));
  const free = await page.evaluate(gap => {
    const el = document.querySelector(`.wd-gap[data-gap="${gap}"] .wd-gap-line`), len = el.getTotalLength(), pads = [...document.querySelectorAll('.wd-pad')];
    const ring = q => [[0, 0], ...Array.from({length: 8}, (_, k) => [4 * Math.cos(k * Math.PI / 4), 4 * Math.sin(k * Math.PI / 4)])].map(([dx, dy]) => new DOMPoint(q.x + dx, q.y + dy));
    return Array.from({length: 19}, (_, k) => len * (k + 1) / 20).filter(d => ring(el.getPointAtLength(d)).every(at => pads.every(pad => !pad.isPointInFill(at))));
  }, gap);
  const taps = [await beside(gap, 0.2, 30), await beside(gap, 0.5, 30), await beside(gap, 0.8, 30), ...await Promise.all(free.map(d => fromEnd(gap, d)))];
  swept.push(`${id} gap ${gap} (${len.toFixed(0)} units): ${taps.length} taps (${free.length} on the line)`);
  for (const at of taps) {
    const other = await page.evaluate(gap => [...document.querySelectorAll('.wd-gap')].map(el => Number(el.dataset.gap)).find(g => g !== gap), gap);
    // Without scrolling: the taps were measured with the board where it is.
    await page.evaluate(other => document.querySelector(`.wd-gap[data-gap="${other}"]`).focus({preventScroll: true}), other); await page.keyboard.press('Enter');
    assert.equal(await selected(), other, `${id}: another gap chosen first`);
    await tapAt(at);
    assert.equal(await selected(), gap, `${id}: a tap at ${at.map(Math.round)} beside or on gap ${gap} (${len.toFixed(0)} long) chooses the gap`);
    assert.equal(await page.locator('.wd-miss').count(), 0, `${id}: no compass drawn by a tap on gap ${gap}`);
    assert.equal(JSON.stringify(await board(id)), before, `${id}: a tap on gap ${gap} is not a move`);
  }
}
// On a phone every point's pad and every gap's area is 40 px or more where
// no other point is within 44 board units (the hard puzzles' spots may be
// nearer each other; their pads split the room halfway).
async function phonePads(label) {
  if (!phone) return;
  const z = await page.evaluate(() => {
    const scale = document.querySelector('svg.wd-board').getScreenCTM().a, pts = [...document.querySelectorAll('.wd-pt')].map(g => [g, Number(g.dataset.x), Number(g.dataset.y)]);
    const pads = pts.filter(([g, x, y]) => pts.every(([h, u, v]) => h === g || Math.hypot(u - x, v - y) >= 44)).map(([g]) => { const b = g.querySelector('.wd-pad').getBoundingClientRect(); return Math.min(b.width, b.height); });
    return {scale, pads, areas: [...document.querySelectorAll('.wd-gap-area')].length};
  });
  assert.ok(z.pads.length && Math.min(...z.pads) >= 40, `${label}: pads 40 px or more (${Math.round(Math.min(...z.pads))} at ${z.scale.toFixed(2)} px a unit)`);
}
const selected = () => page.evaluate(() => Number(document.querySelector('.wd-gap[aria-pressed="true"]')?.dataset.gap ?? -1));
// Taps along the middle of every line drawn now (away from the corners):
// each chooses its line and changes nothing, so no spot beside a line takes
// its taps.
async function probeLines(id) {
  const before = JSON.stringify(await board(id));
  await show();
  const targets = await page.evaluate(() => {
    // Points on a line inside a corner's or a dot's pad go to that point, and
    // so may a touch within a few units of its edge; a spot's pad never reaches a line.
    const pads = [...document.querySelectorAll('.wd-corner .wd-pad, .wd-pin .wd-pad')];
    const ring = q => [[0, 0], ...Array.from({length: 8}, (_, k) => [4 * Math.cos(k * Math.PI / 4), 4 * Math.sin(k * Math.PI / 4)])].map(([dx, dy]) => new DOMPoint(q.x + dx, q.y + dy));
    return [...document.querySelectorAll('.wd-gap .wd-gap-line')].flatMap(el => {
      const len = el.getTotalLength(), m = el.getScreenCTM(), gap = Number(el.closest('.wd-gap').dataset.gap);
      return Array.from({length: 9}, (_, k) => el.getPointAtLength(len * (0.2 + 0.075 * k))).filter(q => ring(q).every(at => pads.every(pad => !pad.isPointInFill(at)))).map(q => { const pt = new DOMPoint(q.x, q.y).matrixTransform(m); return [gap, pt.x, pt.y]; });
    });
  });
  for (const [gap, x, y] of targets) {
    await tapAt([x, y]);
    assert.equal(await selected(), gap, `${id}: a tap on the middle of line ${gap} chooses it (board ${before})`);
    assert.equal(JSON.stringify(await board(id)), before, `${id}: a tap on line ${gap} moves nothing`);
  }
  return targets.length;
}
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
  await phonePads('fresh triangle');
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
  // A tap on the line from B to C clear of its dot's pad chooses the gap, not the dot.
  await page.locator('.wd-gap[data-gap="0"]').focus(); await page.keyboard.press('Enter');
  const besideDot = await page.evaluate(() => { const el = document.querySelector('.wd-gap[data-gap="1"] .wd-gap-line'), len = el.getTotalLength(), q = el.getPointAtLength(len / 2 + 30), pt = new DOMPoint(q.x, q.y).matrixTransform(el.getScreenCTM()); return [pt.x, pt.y]; });
  await tapAt(besideDot);
  assert.equal(await selected(), 1, 'a tap on the line clear of a dot’s pad chooses the gap');
  assert.deepEqual((await board('width-01')).arcs, ['mAB', null, null], 'and is not a move');
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
  // Change a gap to make a new full shape, and tap during its spin: the spin
  // ends on its last frame and nothing else happens.
  await tapAt(await along(1, 0.5));
  await page.waitForFunction(() => document.querySelector('.wd-puzzle')?.dataset.view === 'build');
  await tap(point('mBC'));
  await page.waitForFunction(() => document.querySelector('.wd-puzzle.wd-anim'), null, {timeout: 3000});
  await page.waitForTimeout(150);
  await tapAt(await along(0, 0.5));
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.wd-puzzle.wd-anim').count(), 0, 'a tap during the spin ends it');
  assert.equal(await view(), 'spin', 'and stays on the spin, on its last frame');
  assert.equal(await page.locator('.wd-band').count(), 1, 'the verdict is shown');
  assert.deepEqual((await board('width-01')).arcs, ['mAB', 'mBC', 'B'], 'the tap is not a move');
  await undo();
  await settled();
  // A tap in the middle of the shape, away from its arcs, does nothing.
  await show();
  const middle = await page.evaluate(() => { const r = [...document.querySelectorAll('.wd-letter')].map(t => t.getBoundingClientRect()); return [r.reduce((s, b) => s + b.x + b.width / 2, 0) / r.length, r.reduce((s, b) => s + b.y + b.height / 2, 0) / r.length]; });
  await tapAt(middle);
  assert.equal(await view(), 'spin', 'a tap in the middle of the spun shape changes nothing');
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
  // With reduced motion, Spin still answers: the shape rests unturned for a
  // moment (no verdict), then the last frame appears, without movement.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.locator('.wd-spin').click();
  await page.waitForFunction(() => document.querySelector('.wd-puzzle.wd-anim'), null, {timeout: 1000});
  assert.equal(await page.locator('.wd-band').isVisible(), false, 'no verdict at first');
  await settled();
  assert.equal(await page.locator('.wd-band').isVisible(), true, 'then the verdict');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  // Hints: the third offers Apply hint, which re-centres the half circle.
  await hint(); await hint(); await hint();
  await page.locator('.wd-hint-gap').waitFor();
  assert.match(await page.locator('.hint-card').innerText(), /The arc from A to B is centred on a dot\. Which corner could the compass reach both A and B from\?/);
  assert.equal(await page.locator('.wd-corner.hinted[data-pt="C"]').count() + await page.locator('.wd-hint-ring').count(), 1, 'the board rings the centre');
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

  // ---- Short gaps: taps beside them outside the shape, and on their lines between the pads, choose the gap.
  for (const id of ['width-04', 'width-05', 'width-06']) {
    await open(id);
    const gaps = await shortGaps(110);
    if (id === 'width-06') assert.ok(gaps.length >= 1, 'puzzle 6 has a short gap');
    for (const [gap, len] of gaps) await sweepGap(id, gap, len);
  }
  // ---- Puzzle 6: the short gap EB, with a miss, on the phone.
  await open('width-06');
  const p6 = puzzle('width-06'), eb = p6.parameters.order.findIndex((c, i) => `${c}${p6.parameters.order[(i + 1) % 5]}` === 'EB');
  await tap(point(p6.parameters.order[2]));
  await page.locator('.wd-miss').waitFor();
  await fit('long and short with a miss');
  await phonePads('long and short');
  const b6 = await page.locator('svg.wd-board').boundingBox(), spin6 = await page.locator('.wd-spin').boundingBox();
  assert.ok(b6.width <= 381, 'compact board');
  if (phone) assert.ok(b6.height + spin6.height < 667, 'the board and Spin fit a small phone');
  await shot('06-miss');
  // Solve by tapping, in a mixed order, choosing the short gap EB beside it, outside the shape.
  for (const gap of [eb, 4, 0, 3, 1, 2].filter((g, i, all) => all.indexOf(g) === i)) {
    if (await view() === 'spin') { await settled(); await tapAt(await along(gap, 0.5)); }
    if (await selected() !== gap) await tapAt(gap === eb ? await beside(gap, 0.5, 30) : await clear(gap));
    assert.equal(await selected(), gap);
    await tap(point(p6.solution.arcs[gap]));
  }
  await done();
  await settled();
  await shot('06-snug');

  // ---- Hard: a missing corner.
  const p7 = puzzle('width-07'), q7 = p7.parameters, X = q7.open, right = p7.solution.corner, spots = Object.keys(q7.spots);
  const k7 = j => q7.order[(q7.order.indexOf(X) + j + 5) % 5], gx = q7.order.indexOf(X), gPrev = (gx + 4) % 5, gAcross = p7.solution.arcs.indexOf(X);
  await open('width-07');
  assert.equal(await page.locator('.wd-spot').count(), spots.length, 'every spot');
  assert.equal(await selected(), -1, 'no gap is chosen before the corner is placed');
  assert.equal(await page.locator('.wd-open').count(), 1, 'a dotted line where the corner goes');
  assert.equal(await page.locator('.wd-spin').isDisabled(), true);
  await shot('07-fresh');
  await phonePads('missing corner');
  // A wrong spot on the circle round the corner whose arc reaches X from
  // before it: that arc draws, the one after X misses, and the miss is not saved.
  const wrong = spots.find(s => s !== right && joinable(p7, gPrev, k7(2), s) && !joinable(p7, gx, k7(3), s));
  assert.ok(wrong, 'a spot on one circle only');
  await tap(point(wrong));
  await page.locator(`.wd-corner[data-pt="${X}"]`).waitFor();
  assert.equal((await board('width-07')).corner, wrong);
  assert.equal(await page.locator('.wd-open').count(), 0);
  assert.notEqual(await selected(), -1, 'a gap is chosen once the corner is placed');
  await page.locator(`.wd-gap[data-gap="${gx}"]`).focus(); await page.keyboard.press('Enter');
  await tap(point(k7(3)));
  await page.locator('.wd-miss').waitFor();
  assert.equal(await page.locator('.wd-short').count(), 1);
  assert.deepEqual((await board('width-07')).arcs, q7.start, 'the miss is not saved');
  await shot('07-miss');
  await page.locator(`.wd-gap[data-gap="${gPrev}"]`).focus(); await page.keyboard.press('Enter');
  await tap(point(k7(2)));
  await page.waitForFunction(([g, c]) => JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')).profiles[0].attempts['width-07'].board.arcs[g] === c, [gPrev, k7(2)]);
  // Hint: the second level rings the right spot.
  await hint(); await hint();
  await page.locator(`.wd-spot.hinted[data-pt="${right}"]`).waitFor();
  assert.equal((await page.locator('.hint-card').innerText()).includes(`Can corner ${X}’s arcs have the same radius as the two already drawn, from here?`), true, 'the hint after a placement is a nudge');
  // Move the corner: its arcs go with it; Undo brings them back.
  const beforeMove = await board('width-07');
  await tap(point(right));
  await page.waitForFunction(r => JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')).profiles[0].attempts['width-07'].board.corner === r, right);
  assert.deepEqual((await board('width-07')).arcs, q7.start, 'moving the corner takes away its arcs');
  await undo();
  assert.deepEqual(await board('width-07'), beforeMove, 'Undo puts the corner and its arcs back');
  await tap(point(right));
  // Build the three arcs by tapping, then the shape spins snug.
  for (const gap of [gPrev, gx, gAcross]) {
    if (await selected() !== gap) await tapAt(await clear(gap));
    await tap(point(p7.solution.arcs[gap]));
  }
  await done();
  await settled();
  assert.equal(await page.locator('.wd-top.snug').count(), 1);
  await fit('missing corner solved');
  await shot('07-snug');
  // The other hard puzzles' short gaps, with the corner in place.
  for (const id of ['width-07', 'width-08', 'width-09']) {
    await open(id);
    if (await page.locator('#completion-heading').count()) { await page.locator('[data-action="replay"]').click(); await page.locator('.wd-spot').first().waitFor(); }
    await tap(point(puzzle(id).solution.corner));
    await page.locator(`.wd-corner[data-pt="${puzzle(id).parameters.open}"]`).waitFor();
    for (const [gap, len] of await shortGaps(110)) await sweepGap(id, gap, len);
  }
  // ---- Hard: with the corner off the board, on each spot in turn, and on
  // the right spot with its two arcs drawn, taps along the middle of every
  // line choose that line; no spot beside it takes them.
  const probed = [];
  for (const id of ['width-07', 'width-08', 'width-09']) {
    const p = puzzle(id), q = p.parameters, X = q.open, right = p.solution.corner, gx = q.order.indexOf(X), gPrev = (gx + 4) % 5;
    await open(id);
    await page.locator('[data-action="restart"]').click();
    await page.locator('.wd-open').waitFor({state: 'attached'});
    let taps = await probeLines(id);
    for (const spot of [...Object.keys(q.spots).filter(t => t !== right), right]) {
      await tap(point(spot));
      await page.waitForFunction(([id, spot]) => JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')).profiles[0].attempts[id].board.corner === spot, [id, spot]);
      taps += await probeLines(id);
    }
    for (const gap of [gPrev, gx]) {
      await page.locator(`.wd-gap[data-gap="${gap}"]`).focus(); await page.keyboard.press('Enter');
      await tap(point(p.solution.arcs[gap]));
      await page.waitForFunction(([id, gap, c]) => JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')).profiles[0].attempts[id].board.arcs[gap] === c, [id, gap, p.solution.arcs[gap]]);
    }
    taps += await probeLines(id);
    probed.push(`${id}: ${taps} taps`);
  }

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
  // Each shape's button shows its corners: three for the curved triangle, five for the curved pentagons.
  for (const [name, k] of [['Curved triangle', 3], ['Curved pentagon', 5], ['Lopsided curved pentagon', 5], ['Square', 4], ['Disk', 0]]) assert.equal(await page.locator(`.wd-pick[aria-label="${name}"] .wd-icon circle`).count(), k, `${name} button`);
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
  assert.ok(swept.some(line => line.startsWith('width-06')), 'puzzle 6’s short gap was swept');
  console.log(`Short gaps tapped beside the shape and on their lines between the pads:\n  ${swept.join('\n  ')}`);
  console.log(`Hard puzzles, taps along the middle of every line with the corner off the board, on each spot, and on the right spot with two arcs:\n  ${probed.join('\n  ')}`);
  console.log(`Snug spinners browser smoke passed (${phone ? 'phone' : 'desktop'}).`);
} finally {
  await browser.close();
}
