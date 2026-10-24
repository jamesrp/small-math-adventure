// Plays Shrink strips through the real interface: tiles of the strip chosen
// by two taps and by a slide, a far tap refused, seams placed by taps at
// contested points of a row (beside a join, on a ghost slot, at the ends) and
// by keyboard, Shrink with focus moving to the new row, a fork of stuck rows
// and a solve; every way on several pieces with Keep, That's all, its refusal
// kept through Undo and a kept way taken back; a flipped tile repaired; the
// playground grown; the busiest board at 375 px, with the legal trees of
// puzzle 10 that go deepest and have the most rows, and puzzle 1's ABA tree
// with Keep and That's all in reach; and focus after moves. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in SHOTS, or test-results/shrink/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {shrinkWord, marked, wayAllowed, fits} from '../dist/families/shrink/shrink.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS ? `${process.env.SHOTS.replace(/\/$/, '')}/` : new URL('../test-results/shrink/', import.meta.url).pathname;
const shot = name => page.screenshot({path: `${out}${name}${phone ? '-phone' : ''}.png`, fullPage: true});
const pack = JSON.parse(await readFile(new URL('../dist/families/shrink/shrink.json', import.meta.url), 'utf8'));
const saved = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id], [key, id]);
const board = async id => (await saved(id))?.board;
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="shrink"]').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const settle = () => page.waitForTimeout(60);
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await settle(); };
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); await tapAt(b.x + b.width / 2, b.y + b.height / 2); };
const button = name => page.getByRole('button', {name, exact: true});
const tile = i => page.locator(`[data-sk-i="${i}"]`);
// Rows by their accessible names, which start with their letters.
const row = word => page.locator(`.sk-row[aria-label^="${word}"]`).first();
// A point in a row: x in slots (0 is the left ghost slot, tile i is slot
// i + 1, a slot is one unit wide), y at the middle.
async function pointIn(word, slot) {
  const r = row(word); await r.scrollIntoViewIfNeeded();
  const b = await r.boundingBox(), n = Number(await r.evaluate(el => getComputedStyle(el).getPropertyValue('--n')));
  return [b.x + b.width * slot / n, b.y + b.height / 2];
}
const tapSlot = async (word, slot) => tapAt(...await pointIn(word, slot));
const focused = () => page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName || '');
let cdp = null;
async function slide(from, to) {
  const center = async l => { const b = await l.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const a = await center(from), b = await center(to);
  if (!phone) {
    await page.mouse.move(...a); await page.mouse.down();
    await page.mouse.move(b[0], b[1], {steps: 12}); await page.mouse.up();
  } else {
    cdp ||= await context.newCDPSession(page);
    const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
    await touch('touchStart', a);
    for (let s = 1; s <= 12; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 12, a[1] + (b[1] - a[1]) * s / 12]);
    await touch('touchEnd', b);
    await page.waitForTimeout(400);
  }
  await settle();
}
// The deepest legal tree of a row, as moves: each way allowed placed, and
// each unmarked one shrunk, down to rows of one tile.
function deepest(w, path = '', extra = {}) {
  const out = [];
  for (const s of [0, 1]) {
    if (!wayAllowed(w, s)) continue;
    out.push({type: 'seam', at: path, s, ...extra});
    if (!marked(w, s).length) out.push({type: 'shrink', at: path, s, ...extra}, ...deepest(shrinkWord(w, s), path + s, extra));
  }
  return out;
}
// The moves that take a real row to one tile, from way s at the top.
function downTo(w, s, extra = {}, path = '') {
  const out = [];
  for (;;) {
    out.push({type: 'seam', at: path, s, ...extra}, {type: 'shrink', at: path, s, ...extra});
    w = shrinkWord(w, s); path += s;
    if (w.length === 1) return out;
    s = w.length === 2 ? (w[0] === w[1] ? 1 : 0) : [0, 1].find(t => fits(w, t));
  }
}
const norm = o => JSON.stringify(Object.keys(o).sort().reduce((m, k) => (m[k] = o[k], m), {}));
// Plays a move through the board: a seam by a tap on its join's line, Shrink
// and the rest by a tap on the button.
async function playMove(m) {
  if (m.type === 'select') { await tap(tile(m.a)); await tap(tile(m.b)); return; }
  const want = norm(m);
  const i = await page.evaluate(want => [...document.querySelectorAll('[data-mechanic-wire="shrink"] [data-move]')].findIndex(el => { const o = JSON.parse(el.dataset.move); return JSON.stringify(Object.keys(o).sort().reduce((x, k) => (x[k] = o[k], x), {})) === want; }), want);
  assert.ok(i >= 0, `a control for ${want}`);
  const target = page.locator('[data-mechanic-wire="shrink"] [data-move]').nth(i);
  if (m.type !== 'seam') return tap(target);
  await target.scrollIntoViewIfNeeded();
  const b = await target.boundingBox(), at = await target.evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--at')) / 100);
  await tapAt(b.x + b.width * at, b.y + b.height / 2);
}
// The tree is readable: no overflow, tiles wide enough and never overlapping.
async function readable(label, least) {
  await fit(label);
  const rows = await page.locator('.sk-row').evaluateAll(rows => rows.map(r => [...r.querySelectorAll('.sk-tile')].map(t => t.getBoundingClientRect()).map(b => [b.left, b.right])));
  const widths = rows.flat().map(([l, r]) => r - l);
  assert.ok(Math.min(...widths) >= least, `${label}: tiles at least ${least} px wide (${Math.min(...widths).toFixed(1)})`);
  for (const row of rows) for (let i = 1; i < row.length; i++) assert.ok(row[i][0] >= row[i - 1][1] - 0.5, `${label}: tiles don't overlap`);
  return rows.length;
}
// The way placed on the row at a path of a board's tree.
const wayAt = (tree, path) => { let node = tree; for (const c of path) node = node.k[Number(c)]; return node.s; };

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Shrink QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 2: choosing tiles, seams, Shrink, a stuck fork, a solve.
  let P = 'shrink-02';
  await open(P); await fit('strip');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Choose at most 6 tiles that get stuck.', 'one objective');
  assert.equal(await page.locator('.sk-told').count(), 0, 'nothing said on a fresh board');
  await tap(tile(0));
  assert.equal(await tile(0).getAttribute('aria-pressed'), 'true', 'a tap marks the first tile');
  await tap(tile(7));
  assert.equal(await page.locator('.sk-told').innerText(), 'At most 6 tiles.', 'eight tiles are too many');
  assert.equal((await board(P)).sel, null, 'and nothing is chosen');
  await tap(tile(0)); await tap(tile(3));
  assert.deepEqual((await board(P)).sel, [0, 3], 'two taps choose a run');
  assert.equal(await page.locator('.sk-told').count(), 0, 'the refusal goes with the next tap');
  // ABAB: slots 0 (ghost) 1–4 (tiles) 5 (ghost). Join g sits at slot line g + 1.
  await tapSlot('ABAB', 2.8);
  assert.equal((await board(P)).tree.s, 0, 'a tap on the right of tile 2 goes to the join after it (paired from the first tile)');
  await tapSlot('ABAB', 2.2);
  assert.equal((await board(P)).tree.s, 1, 'a tap on its left goes to the join before it');
  await tapSlot('ABAB', 0.3);
  assert.equal((await board(P)).tree.s, 0, 'a tap on the empty left ghost slot goes to the left end');
  await tapSlot('ABAB', 4.3);
  assert.equal((await board(P)).tree.s, 1, 'a tap on the left of the last tile goes to the join before it');
  await tapSlot('ABAB', 5.6);
  assert.equal((await board(P)).tree.s, 0, 'a tap on the empty right ghost slot goes to the right end');
  await tapSlot('ABAB', 2.2);
  assert.equal(await page.locator('.sk-row[aria-label^="ABAB"] .sk-tile.ghost').count(), 2, 'leaving the first tile alone gives a ghost at each end');
  await tap(button('Shrink'));
  assert.equal(await page.locator('.sk-row[aria-label^="BBB"]').count(), 1, 'Shrink makes the row below');
  assert.match(await focused(), /sk-gap/, 'focus moves to the new row');
  await page.keyboard.press('Enter');
  await tapSlot('BBB', 2.8);
  await tapSlot('BBB', 2.2);
  assert.equal(await page.locator('.sk-row[aria-label^="BBB"].stuck').count(), 1, 'BBB is stuck both ways');
  assert.ok(!(await saved(P)).completed, 'but ABAB is not: one way is untried');
  await tapSlot('ABAB', 2.8);
  await tap(button('Shrink'));
  assert.equal(await page.locator('.sk-row[aria-label^="AA,"], .sk-row[aria-label="AA"]').count(), 1, 'ABAB paired shrinks to AA');
  assert.equal(await page.locator('.sk-kids.fork').count(), 1, 'the two shrunk rows side by side');
  await shot('impostor-fork');
  // Undo takes back the Shrink, visibly.
  await page.locator('[data-action="undo"]').click(); await settle();
  assert.equal(await page.locator('.sk-row[aria-label^="AA,"], .sk-row[aria-label="AA"]').count(), 0, 'Undo takes back the Shrink');
  assert.equal(await button('Shrink').count(), 1, 'and offers it again');
  // A slide chooses five tiles; seams by keyboard; the solve.
  await slide(tile(1), tile(5));
  assert.deepEqual((await board(P)).sel, [1, 5], 'a slide chooses the tiles between');
  const gaps = page.locator('.sk-row[aria-label^="BABAB"] .sk-gap');
  await gaps.nth(1).focus(); await page.keyboard.press('Enter');
  assert.equal(wayAt((await board(P)).tree, ''), 1, 'Enter on a join places the seams');
  assert.match(await focused(), /sk-gap/, 'focus stays on the joins');
  await tap(button('Shrink'));
  await tapSlot('AAA', 2.8); await tapSlot('AAA', 2.2);
  await tapSlot('BABAB', 2.8); await tap(button('Shrink'));
  await tapSlot('BBB', 2.8); await tapSlot('BBB', 2.2);
  await done();
  assert.equal(await page.locator('.sk-strip .sk-tile.caught').count(), 5, 'the chosen tiles are marked');
  await fit('solved strip');
  await shot('impostor-solved');

  // Puzzle 4: every way; Keep only once the rows reach one tile; That's all,
  // its refusal and Undo.
  P = 'shrink-04';
  await open(P); await fit('pieces');
  assert.equal(await page.locator('.sk-row.fresh').count(), 1, 'an untouched row shows its joins');
  assert.equal(await button('Keep').isDisabled(), true, 'nothing to keep before seams');
  await tapSlot('ABAB', 2.2);
  assert.equal(await button('Keep').isDisabled(), true, 'seams alone are not enough to keep');
  await tap(button('Shrink'));
  await tapSlot('BBB', 2.8); await tapSlot('BBB', 2.2);
  assert.equal(await page.locator('.sk-row[aria-label^="BBB"].stuck').count(), 1);
  assert.equal(await button('Keep').isDisabled(), true, 'a way that gets stuck is never kept');
  assert.equal(await page.locator('.sk-row[aria-label^="ABAB"] .sk-mark').count(), 0, 'ABAB marks nothing on top');
  // A tap nearer a seam (after tile 3) than the other way's join (before it)
  // still moves the seams to the other way.
  await tapSlot('ABAB', 3.65);
  assert.equal((await board(P)).trees[0].s, 0, 'a tap away from the seams moves them to the other way');
  await tapSlot('ABAB', 3.1);
  assert.equal((await board(P)).trees[0].s, 0, 'a tap right on a seam leaves it');
  for (const m of downTo('ABAB', 0, {piece: 0}).slice(1)) { assert.equal(await button('Keep').isDisabled(), true, 'Keep waits for one tile'); await playMove(m); }
  assert.equal(await button('Keep').isDisabled(), false, 'Keep once the rows reach one tile');
  await tap(button('Keep'));
  assert.deepEqual((await board(P)).shelf, [[0, 0]], 'Keep shelves the way');
  assert.equal(await page.locator('.sk-told').count(), 0, 'and says nothing');
  assert.doesNotMatch(await focused(), /sk-keep|sk-all|^BODY$/, 'focus goes back to the board after Keep');
  await tap(button('That’s all'));
  assert.equal(await page.locator('.sk-told').innerText(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for the shelf to change');
  assert.doesNotMatch(await focused(), /sk-all|^BODY$/, 'focus is not left on That’s all');
  await page.locator('[data-action="undo"]').click(); await settle();
  assert.equal(await page.locator('.sk-told').count(), 0, 'Undo takes the note away');
  assert.equal(await button('That’s all').isDisabled(), true, 'but the refusal stands');
  await tap(page.locator('button.sk-kept').first());
  assert.deepEqual((await board(P)).shelf, [], 'a tap on the shelf takes a way back');
  assert.equal((await board(P)).refused, false, 'and lifts the refusal');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all needs something kept');
  await tap(button('Keep'));
  await tap(page.locator('.sk-pick').nth(1));
  assert.equal(await page.locator('.sk-row[aria-label^="BAB"]').count(), 1, 'a tap on a piece brings it to the work area');
  for (const s0 of [0, 1]) { for (const m of downTo('BAB', s0, {piece: 1})) await playMove(m); await tap(button('Keep')); }
  await tap(button('That’s all'));
  assert.equal(await page.locator('.sk-told').innerText(), 'There is another.');
  await shot('seams-another');
  // Reloaded, the work area shows the piece of the last move.
  await page.reload(); await page.locator('[data-mechanic-wire="shrink"]').waitFor();
  assert.equal(await page.locator('.sk-pick.on').getAttribute('aria-label'), 'BAB', 'after a reload, the piece worked on last');
  await tap(page.locator('.sk-pick').nth(2));
  for (const m of downTo('ABBAABBA', 0, {piece: 2})) await playMove(m);
  await tap(button('Keep'));
  await tap(button('That’s all'));
  await done();
  await fit('seams solved');

  // Puzzle 3: a refused flip, then the fix.
  P = 'shrink-03';
  await open(P);
  const pieceTile = i => page.locator('.sk-piece button.sk-tile').nth(i);
  await tap(pieceTile(2));
  assert.equal((await board(P)).flip, 2, 'a tap flips a tile');
  assert.equal(await page.locator('.sk-row .sk-tile.flipped').count(), 1, 'the flip shows in the row below');
  assert.equal(await button('Keep').isDisabled(), true, 'a flip alone is not enough to keep');
  await tap(pieceTile(4));
  assert.equal((await board(P)).flip, 4, 'flipping another tile puts the first back');
  await tapSlot('AABBAABA', 1.8); await tap(button('Shrink'));
  assert.equal(await page.locator('.sk-row[aria-label^="BABAA"]').count(), 1);
  assert.equal(await button('Keep').isDisabled(), true, 'one shrink is not one tile');
  for (const m of downTo('BABAA', 0, {}, '1')) await playMove(m);
  await shot('repair');
  assert.equal(await button('Keep').isDisabled(), false, 'Keep once the piece reaches one tile');
  await tap(button('Keep')); await tap(button('That’s all'));
  await done();

  // The playground: grow five rows and switch the top tile.
  P = 'shrink-playground';
  await open(P);
  assert.equal(await button('Hint').count(), 0, 'no hints in the playground');
  assert.equal((await page.locator('.feedback').innerText().catch(() => '')).trim(), '', 'no message');
  for (let i = 0; i < 4; i++) await tap(button('Grow'));
  assert.equal(await page.locator('.sk-grown').count(), 5);
  assert.equal(await button('Grow').isDisabled(), true, 'five rows at most');
  await tap(page.locator('.sk-grown button.sk-tile'));
  assert.equal(await page.locator('.sk-grown').last().getAttribute('aria-label'), 'BAABABBAABBABAAB', 'start from B');
  await fit('playground');
  await shot('playground');

  // Puzzle 10, the busiest board, played to its end at this width.
  P = 'shrink-10';
  await open(P);
  const witness = pack.puzzles.find(p => p.id === P).solution.moves;
  for (const m of witness) { await playMove(m); await fit(`puzzle 10 after ${norm(m)}`); }
  await done();
  const wide = await page.locator('[data-mechanic-wire="shrink"]').boundingBox();
  assert.ok(wide.width <= (phone ? 375 : 760), 'the board fits');
  const tiny = await page.locator('.sk-row .sk-tile').evaluateAll(els => Math.min(...els.map(e => e.getBoundingClientRect().width)));
  assert.ok(tiny >= (phone ? 13 : 20), `tiles stay legible (${tiny.toFixed(1)} px)`);
  await shot('busiest');

  // The deepest legal tree on the busiest puzzle: fifteen tiles, every way
  // shrunk to one tile (seven rows, one fork), at this width.
  await page.locator('[data-action="replay"], [data-action="restart"]').first().click(); await settle();
  const long = 'ABBABAABABBABAAB'.slice(0, 15);
  assert.equal(pack.puzzles.find(p => p.id === P).parameters.strip.slice(0, 15), long);
  await playMove({type: 'select', a: 0, b: 14});
  for (const m of deepest(long)) await playMove(m);
  assert.equal(await readable('the deepest tree of puzzle 10', phone ? 13 : 20), 7, 'seven rows');
  assert.equal(await page.locator('.sk-kids.fork').count(), 1, 'one fork');
  assert.equal(await page.locator('button.sk-shrink').count(), 0, 'nothing left to shrink');
  await shot('deepest');
  // The tree with the most rows on this strip: tiles 1 to 12, nine rows.
  await playMove({type: 'select', a: 0, b: 11});
  for (const m of deepest(long.slice(0, 12))) await playMove(m);
  assert.equal(await readable('the tallest tree of puzzle 10', phone ? 13 : 20), 9, 'nine rows');
  assert.equal(await page.locator('.sk-kids.fork').count(), 1, 'one fork');
  await shot('tallest');

  // The deepest tree on puzzle 1's ABA, with Keep and That's all still reachable.
  P = 'shrink-01';
  await open(P);
  for (const m of deepest('ABA', '', {piece: 0})) await playMove(m);
  await readable('the deepest tree of ABA', 20);
  for (const name of ['Keep', 'That’s all']) {
    const control = button(name);
    await control.scrollIntoViewIfNeeded();
    const b = await control.boundingBox(), h = await page.evaluate(() => innerHeight);
    assert.ok(b && b.y >= -0.5 && b.y + b.height <= h + 0.5, `${name} can be brought into view`);
  }
  await shot('deepest-aba');

  // Tap targets on a 390 x 844 phone and an 820 x 1180 tablet: strip and
  // piece tiles at least 40 px wide and 44 tall, pieces and kept pictures 44
  // tall, and the other way's joins on a row with seams at least 44 px (32 on
  // puzzle 10's fourteen tiles on a phone); rows grow on the tablet.
  const sized = phone ? [[390, 844, 'phone'], [820, 1180, 'tablet']] : [];
  const restartIfPlayed = async () => { const again = page.locator('[data-action="replay"], [data-action="restart"]').first(); if (await again.count()) { await again.click(); await settle(); } };
  for (const [w, h, label] of sized) {
    await page.setViewportSize({width: w, height: h});
    const least = async sel => {
      const boxes = await page.locator(sel).evaluateAll(els => els.map(e => { const b = e.getBoundingClientRect(); return [b.width, b.height]; }));
      assert.ok(boxes.length, `${label}: something to measure (${sel})`);
      return {w: Math.min(...boxes.map(b => b[0])), h: Math.min(...boxes.map(b => b[1]))};
    };
    const offJoins = async word => (await least(`.sk-row[aria-label^="${word}"] .sk-gap:not(.on)`)).w;
    for (const id of ['shrink-05', 'shrink-10']) {
      await open(id); await restartIfPlayed();
      const t = await least('.sk-strip button.sk-tile');
      assert.ok(t.w >= 40 && t.h >= 44, `${label} ${id}: strip tiles ${t.w.toFixed(1)} x ${t.h.toFixed(1)}`);
    }
    await playMove({type: 'select', a: 3, b: 16}); await playMove({type: 'seam', at: '', s: 1});
    const long = await offJoins('ABAABABBABAABA');
    assert.ok(long >= (label === 'phone' ? 32 : 44), `${label} puzzle 10: the other way's joins ${long.toFixed(1)} px`);
    await fit(`${label} puzzle 10`);
    await shot(`sizes-${label}-10`);
    await open('shrink-03'); await restartIfPlayed();
    const piece = await least('.sk-piece button.sk-tile');
    assert.ok(piece.w >= 40 && piece.h >= 44, `${label}: piece tiles ${piece.w.toFixed(1)} x ${piece.h.toFixed(1)}`);
    await open('shrink-09'); await restartIfPlayed();
    await playMove({type: 'flip', i: 0}); await playMove({type: 'seam', at: '', s: 0});
    const eight = await offJoins('BABBAABB');
    assert.ok(eight >= 44, `${label}: the other way's joins on eight tiles ${eight.toFixed(1)} px`);
    const slot8 = await page.locator('.sk-row[aria-label^="BABBAABB"]').evaluate(r => r.getBoundingClientRect().width / 10);
    assert.ok(slot8 >= (label === 'phone' ? 34 : 54), `${label}: eight tiles' slots ${slot8.toFixed(1)} px`);
    await open('shrink-01'); await restartIfPlayed();
    for (const m of downTo('ABA', 0, {piece: 0})) await playMove(m);
    await tap(button('Keep'));
    const picks = await least('button.sk-pick'), kept = await least('button.sk-kept');
    assert.ok(picks.h >= 44 && picks.w >= 44 && kept.h >= 44, `${label}: pieces ${picks.h} and kept pictures ${kept.h} px tall`);
    await shot(`sizes-${label}`);
  }
  if (sized.length) await page.setViewportSize({width: 375, height: 667});

  // Drawn on a wide screen and then narrowed to 320 px without a redraw (as
  // the review-layout suite does), puzzle 10 still fits: the bleed into the
  // panel's padding is measured again on resize, and the … fits its column.
  const back = page.viewportSize();
  await page.setViewportSize({width: 1280, height: 720});
  await open('shrink-10'); await restartIfPlayed();
  await page.setViewportSize({width: 320, height: 844}); await settle();
  await fit('puzzle 10 narrowed to 320 px');
  await page.setViewportSize({width: 1280, height: 720});
  await playMove({type: 'select', a: 0, b: 14});
  for (const m of deepest('ABBABAABABBABAA')) await playMove(m);
  await page.setViewportSize({width: 320, height: 844}); await settle();
  await fit('puzzle 10\'s deepest tree narrowed to 320 px');
  await shot('narrowed-320');
  await page.setViewportSize(back);

  // A hint marks its tap, never a certificate's next tap without being asked.
  P = 'shrink-07';
  await open(P);
  assert.equal(await page.locator('.sk-puzzle .hinted').count(), 0, 'nothing marks the next tap');
  await tap(button('Hint')); await tap(button('Hint'));
  assert.ok(await page.locator('.sk-puzzle .hinted').count() > 0, 'a second hint marks the tiles');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone}, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
