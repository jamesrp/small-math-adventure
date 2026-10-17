// Plays Shrink strips through the real interface: tiles of the strip chosen
// by two taps and by a slide, a far tap refused, seams placed by taps at
// contested points of a row (beside a join, on a ghost slot, at the ends) and
// by keyboard, Shrink with focus moving to the new row, a fork of stuck rows
// and a solve; every way on several pieces with Keep, That's all, its refusal
// kept through Undo and a kept way taken back; a flipped tile repaired; the
// playground grown; the busiest board at 375 px; and focus after moves. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in SHOTS, or test-results/shrink/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
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

  // Puzzle 4: every way, Keep, That's all and its refusal, Undo.
  P = 'shrink-04';
  await open(P); await fit('pieces');
  assert.equal(await button('Keep').isDisabled(), true, 'nothing to keep before seams');
  await tapSlot('ABAB', 2.2);
  await tap(button('Keep'));
  assert.deepEqual((await board(P)).shelf, [[0, 1]], 'Keep shelves the way unjudged');
  assert.equal(await page.locator('.sk-told').count(), 0, 'and says nothing');
  assert.doesNotMatch(await focused(), /sk-keep|sk-all|^BODY$/, 'focus goes back to the board after Keep');
  await tap(button('That’s all'));
  assert.equal(await page.locator('.sk-told').innerText(), 'One of these gets stuck.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for the shelf to change');
  assert.doesNotMatch(await focused(), /sk-all|^BODY$/, 'focus is not left on That’s all');
  await page.locator('[data-action="undo"]').click(); await settle();
  assert.equal(await page.locator('.sk-told').count(), 0, 'Undo takes the note away');
  assert.equal(await button('That’s all').isDisabled(), true, 'but the refusal stands');
  await tap(page.locator('button.sk-kept').first());
  assert.deepEqual((await board(P)).shelf, [], 'a tap on the shelf takes a way back');
  assert.equal(await button('That’s all').isDisabled(), false);
  // Show that ABAB with the first tile alone is stuck, then keep the right ways.
  await tap(button('Shrink'));
  await tapSlot('BBB', 2.8); await tapSlot('BBB', 2.2);
  assert.equal(await page.locator('.sk-row[aria-label^="BBB"].stuck').count(), 1);
  await tapSlot('ABAB', 2.8); await tap(button('Keep'));
  await tap(page.locator('.sk-pick').nth(1));
  assert.equal(await page.locator('.sk-row[aria-label^="BAB"]').count(), 1, 'a tap on a piece brings it to the work area');
  await tapSlot('BAB', 2.8); await tap(button('Keep'));
  await tapSlot('BAB', 2.2); await tap(button('Keep'));
  await tap(button('That’s all'));
  assert.equal(await page.locator('.sk-told').innerText(), 'There is another.');
  await shot('seams-another');
  await tap(page.locator('.sk-pick').nth(2));
  await tapSlot('ABBAABBA', 2.8); await tap(button('Keep'));
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
  await tap(button('Keep')); await tap(button('That’s all'));
  assert.equal(await page.locator('.sk-told').innerText(), 'One of these gets stuck.');
  await tap(page.locator('button.sk-kept').first());
  await tap(pieceTile(4));
  assert.equal((await board(P)).flip, 4, 'flipping another tile puts the first back');
  await tapSlot('AABBAABA', 1.8); await tap(button('Shrink'));
  assert.equal(await page.locator('.sk-row[aria-label^="BABAA"]').count(), 1);
  await shot('repair');
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
  const norm = o => JSON.stringify(Object.keys(o).sort().reduce((m, k) => (m[k] = o[k], m), {}));
  for (const m of witness) {
    if (m.type === 'select') { await tap(tile(m.a)); await tap(tile(m.b)); continue; }
    const want = norm(m);
    const i = await page.evaluate(want => [...document.querySelectorAll('[data-mechanic-wire="shrink"] [data-move]')].findIndex(el => { const o = JSON.parse(el.dataset.move); return JSON.stringify(Object.keys(o).sort().reduce((x, k) => (x[k] = o[k], x), {})) === want; }), want);
    assert.ok(i >= 0, `a control for ${want}`);
    const target = page.locator('[data-mechanic-wire="shrink"] [data-move]').nth(i);
    if (m.type === 'shrink') await tap(target);
    else { await target.scrollIntoViewIfNeeded(); const b = await target.boundingBox(); const at = await target.evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--at')) / 100); await tapAt(b.x + b.width * at, b.y + b.height / 2); }
    await fit(`puzzle 10 after ${want}`);
  }
  await done();
  const wide = await page.locator('[data-mechanic-wire="shrink"]').boundingBox();
  assert.ok(wide.width <= (phone ? 375 : 600), 'the board fits');
  const tiny = await page.locator('.sk-row .sk-tile').evaluateAll(els => Math.min(...els.map(e => e.getBoundingClientRect().width)));
  assert.ok(tiny >= (phone ? 13 : 20), `tiles stay legible (${tiny.toFixed(1)} px)`);
  await shot('busiest');

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
