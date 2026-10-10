// Plays Squares (a group in Tile gardens) through the real interface on the
// shared square grid: the group and its Playground in the satchel; squares
// placed by two taps, by a slide and by a cell tapped twice; taps on either
// side of a shared edge and beside a square (contested points); lifting;
// Done, its refusal and Undo keeping it; Can't off until a try, its tabs,
// refusals, the 3s that fit and the claim; Enter and focus after moves; the
// four puzzle's shelf; sizing by tap, slide and arrow keys with Cut; the
// playground; and no page overflow. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1
// for a 375-pixel phone with touch). Screenshots go in test-results/squares/,
// or SHOTS if set.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1280, height: 900}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS ? pathToFileURL(process.env.SHOTS.replace(/\/?$/, '/')) : new URL('../test-results/squares/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : '-desktop'}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
let cols = 0;
const open = async (id, c) => { cols = c; await page.goto(`${base}/#play/${id}`); await page.locator('.sq-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const cell = (x, y) => page.locator(`.sq-board polygon.sg-cell[data-cell="${y * cols + x}"]`);
const box = async (x, y) => cell(x, y).boundingBox();
// A tap at a point of a cell: (fx, fy) from its top-left, 0.5 for the middle.
async function tapAt(x, y, fx = .5, fy = .5) {
  const b = await box(x, y), px = b.x + b.width * fx, py = b.y + b.height * fy;
  if (phone) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
}
const tapCell = (x, y) => tapAt(x, y);
let cdp = null;
async function slide(from, to) {
  const a = await box(...from), b = await box(...to);
  const p = [a.x + a.width / 2, a.y + a.height / 2], q = [b.x + b.width / 2, b.y + b.height / 2];
  if (!phone) {
    await page.mouse.move(...p); await page.mouse.down();
    await page.mouse.move(...q, {steps: 12});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', p);
  for (let s = 1; s <= 12; s++) await touch('touchMove', [p[0] + (q[0] - p[0]) * s / 12, p[1] + (q[1] - p[1]) * s / 12]);
  await touch('touchEnd', q);
}
// Two taps, corner to corner.
const square = async (x1, y1, x2, y2) => { await tapCell(x1, y1); await tapCell(x2, y2); };
const button = name => page.getByRole('button', {name, exact: true});
const undoButton = () => page.locator('[data-action="undo"]').click();
const tab = (dir, k) => page.locator(`.sq-tab[data-sq-line="${dir}:${k}"]`);
const tapTab = async (dir, k) => { const b = await tab(dir, k).boundingBox(); const px = b.x + b.width / 2, py = b.y + b.height / 2; if (phone) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py); };
const note = () => page.locator('.sq-note').innerText();
const focused = () => page.evaluate(() => { const e = document.activeElement; return {inBoard: Boolean(e?.closest('.sq-board')), cls: e?.getAttribute('class') || '', focus: e?.dataset?.focus || ''}; });
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Squares QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const tile = page.locator('[data-view-key="family-tile"]');
  if (!(await tile.getAttribute('open'))) await tile.locator('summary').click();
  assert.equal(await tile.locator('.library-group h2', {hasText: 'Squares'}).count(), 1, 'a Squares group in Tile gardens');
  assert.equal(await tile.locator('[data-id="squares-01"]').count(), 1);
  await tile.locator('.satchel-playground').click();
  await page.locator('.sq-puzzle.mode-playground').waitFor();

  /* ----- Puzzle 4, 6 by 5: placing, contested taps, Done refused, Undo. */
  const F = 'squares-04';
  await open(F, 6); await fit('fewest');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Fill it with as few squares as you can.');
  assert.ok(await page.locator('.sq-done').isDisabled(), 'Done waits for a full board');
  await square(0, 0, 2, 2);
  assert.deepEqual((await board(F)).sq, [[0, 0, 3]], 'two taps make a square');
  await slide([3, 0], [5, 2]);
  assert.deepEqual((await board(F)).sq, [[0, 0, 3], [3, 0, 3]], 'a slide makes a square');
  // Either side of the shared edge lifts the square drawn there.
  await tapAt(2, 1, .9, .5);
  assert.deepEqual((await board(F)).sq, [[3, 0, 3]], 'just left of the edge lifts the left square');
  await undoButton();
  await tapAt(3, 1, .1, .5);
  assert.deepEqual((await board(F)).sq, [[0, 0, 3]], 'just right of the edge lifts the right square');
  await undoButton();
  assert.equal((await board(F)).sq.length, 2);
  // Just below a square is the empty cell there: a corner, not a lift.
  await tapAt(0, 3, .5, .1);
  assert.equal((await board(F)).sq.length, 2, 'a tap beside a square lifts nothing');
  assert.equal(await page.locator('.sq-board .sg-cell.corner').count(), 1, 'the corner is marked');
  await tapCell(0, 3);
  assert.deepEqual((await board(F)).sq.at(-1), [0, 3, 1], 'the same cell twice: a 1 by 1');
  await page.locator('.sq-board [data-sg-piece="0-3"]').focus(); await page.keyboard.press('Enter');
  assert.equal((await board(F)).sq.length, 2, 'Enter on a square lifts it');
  // The rule's six: a 5 by 5 and five 1s, then Done.
  await page.locator('.sq-clear').click();
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.focus === 'sq-clear'), false, 'focus leaves the disabled Clear');
  await slide([0, 0], [4, 4]);
  for (let y = 0; y < 5; y++) { await tapCell(5, y); await tapCell(5, y); }
  assert.equal((await board(F)).sq.length, 6);
  await shot('fewest-rule');
  await page.locator('.sq-done').click();
  assert.equal((await board(F)).fewer, 6, 'Done on six is refused');
  assert.equal(await note(), 'Fewer squares fit.');
  assert.ok(await page.locator('.sq-done').isDisabled(), 'and stays answered');
  assert.equal(await page.locator('#completion-heading').count(), 0);
  await undoButton();
  assert.equal((await board(F)).fewer, 6, 'Undo keeps the refusal');
  assert.ok(await page.locator('.sq-done').isDisabled());
  await shot('fewest-refused');
  await page.locator('.sq-clear').click();
  await square(0, 0, 2, 2); await square(3, 0, 5, 2);
  await square(0, 3, 1, 4); await square(2, 3, 3, 4);
  // The last by keyboard: Enter on two corners.
  await page.locator(`.sq-board [data-sg-cell="${3 * 6 + 4}"]`).focus(); await page.keyboard.press('Enter');
  await page.locator(`.sq-board [data-sg-cell="${4 * 6 + 5}"]`).focus(); await page.keyboard.press('Enter');
  assert.equal((await board(F)).sq.length, 5);
  let f = await focused();
  assert.ok(f.inBoard || /sq-button/.test(f.cls), `focus after a move is on the board or a move control (${f.cls})`);
  assert.notEqual(f.focus, 'sq-cant');
  await page.locator('.sq-done').click();
  await done(); await fit('fewest solved');
  await shot('fewest-solved');

  /* ----- Puzzle 7, 5 by 5: Can't after a try, tabs, refusals, the claim. */
  const C = 'squares-07';
  await open(C, 5); await fit('fill');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no objective');
  assert.ok(await page.locator('.sq-cant').isDisabled(), 'Can’t waits for a try');
  await square(0, 0, 2, 2);
  f = await focused();
  assert.notEqual(f.focus, 'sq-cant', 'focus after a move is never on Can’t');
  await page.locator('.sq-cant').click();
  assert.equal(await page.locator('.sq-tab').count(), 10, 'a tab per row and per column');
  await tapTab('row', 0);
  assert.equal(await page.locator('.sq-tab.on').count(), 1);
  await tapTab('row', 1);
  assert.equal(await note(), 'One 3 by 3 square can cross both.');
  await tapTab('col', 4);
  assert.equal(await note(), 'One 3 by 3 square can cross both.', 'a row and a column always meet');
  await tapTab('row', 0);
  assert.equal(await page.locator('.sq-tab.on').count(), 0, 'a second tap drops a line');
  await tapTab('row', 2);
  assert.equal(await note(), 'One 3 by 3 square fits.', 'row 3 alone: too few, and nothing can join');
  assert.equal(await page.locator('.sq-ghost').count(), 1, 'the 3 that fits, dashed');
  await shot('fill-too-few');
  await tapTab('row', 2);
  assert.deepEqual((await board(C)).claim, null, 'nothing is claimed yet');
  await tapTab('row', 0);
  await tab('row', 3).focus(); await page.keyboard.press('Enter');
  await done(); await fit('fill claimed');
  assert.deepEqual((await board(C)).claim, {dir: 'row', at: [0, 3]});
  assert.equal(await page.locator('.sq-band').count(), 2, 'the lines stay shaded');
  assert.equal(await page.locator('.sq-ghost').count(), 1);
  assert.equal(await page.locator('.sq-board .sg-piece').count(), 1, 'over the child’s own try');
  await shot('fill-claimed');

  /* ----- Puzzle 5, 6 by 5: even rows refused, two 3s fit, then fill. */
  const S = 'squares-05';
  await open(S, 6);
  await square(0, 0, 2, 2);
  await page.locator('.sq-cant').click();
  await tapTab('row', 0);
  assert.equal(await note(), '2s can fill that row.');
  await tapTab('col', 0); await tapTab('col', 3);
  assert.equal(await note(), 'Two 3 by 3 squares fit.');
  assert.equal(await page.locator('.sq-ghost').count(), 2);
  await page.locator('.sq-cant').click();
  assert.equal(await page.locator('.sq-tab').count(), 0, 'Can’t again closes the tabs');
  await square(3, 0, 5, 2);
  await tapCell(0, 3); await tapCell(0, 3);
  assert.deepEqual((await board(S)).sq.at(-1), [0, 3, 2], 'one cell twice: the smallest allowed square');
  await slide([2, 3], [3, 4]); await slide([5, 4], [4, 3]);
  await done(); await fit('fill solved');
  await shot('fill-solved');

  /* ----- Puzzle 1: four 3s, the shelf. */
  const Q = 'squares-01';
  await open(Q, 12); await fit('four');
  for (const x of [0, 3, 6, 9]) await tapCell(x, 0);
  assert.deepEqual((await board(Q)).found, ['12x3']);
  assert.equal(await page.locator('.sq-slot:not(.empty)').count(), 1, 'kept on the shelf');
  assert.equal(await page.locator('.sq-last').count(), 1, 'the last square ringed');
  await shot('four-strip');
  await page.locator('.sq-board [data-sg-piece="9-0"]').click();
  assert.equal((await board(Q)).sq.length, 3);
  await tapCell(11, 11);
  assert.deepEqual((await board(Q)).sq.at(-1), [9, 9, 3], 'a tap near the edge keeps the square on the board');
  await page.locator('.sq-clear').click();
  for (const [x, y] of [[0, 0], [3, 0], [0, 3], [3, 3]]) await tapCell(x, y);
  await done(); await fit('four solved');

  /* ----- Puzzle 6: size by tap, Cut, keep; a slide; arrow keys. */
  const D = 'squares-06';
  await open(D, 12); await fit('design');
  assert.ok(await page.locator('.sq-cutbutton').isDisabled(), 'nothing to cut yet');
  await tapCell(8, 5);
  assert.deepEqual([(await board(D)).w, (await board(D)).h], [9, 6]);
  assert.equal(await page.locator('.sq-cuts').count(), 0, 'no cuts before Cut');
  await page.locator('.sq-cutbutton').click();
  assert.deepEqual((await board(D)).found, [[9, 6]]);
  assert.equal(await page.locator('.sq-slot:not(.empty)').count(), 1);
  await shot('design-cut');
  await slide([8, 5], [11, 8]);
  assert.deepEqual([(await board(D)).w, (await board(D)).h], [12, 9], 'a slide moves the corner');
  await page.locator('.sq-cutbutton').click();
  await tapCell(5, 2);
  await page.locator(`.sq-board [data-sg-cell="${2 * 12 + 5}"]`).focus();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  assert.deepEqual([(await board(D)).w, (await board(D)).h], [4, 3], 'arrow keys move the corner');
  await page.keyboard.press('ArrowLeft');
  f = await focused();
  assert.ok(f.inBoard, 'focus stays on the board after a key move');
  await page.locator('.sq-cutbutton').click();
  await done(); await fit('design solved');
  await shot('design-solved');

  /* ----- Puzzles 9 and 12. */
  await open('squares-09', 12);
  assert.equal(await page.locator('.sq-recipe .sq-group').count(), 3, 'the card');
  await shot('recipe');
  await tapCell(6, 2); await page.locator('.sq-cutbutton').click();
  assert.equal(await page.locator('#completion-heading').count(), 0, '7 by 3 is not it');
  await tapCell(7, 2); await page.locator('.sq-cutbutton').click();
  await done();
  await open('squares-12', 15); await fit('kinds');
  await tapCell(12, 7); await page.locator('.sq-cutbutton').click();
  await done(); await fit('kinds solved');
  await shot('kinds-solved');

  /* ----- Puzzle 11: a big board. */
  await open('squares-11', 13); await fit('13 by 11');
  await slide([0, 0], [6, 6]); await slide([7, 0], [12, 5]);
  await shot('fewest-13x11');

  /* ----- The playground. */
  const G = 'squares-play';
  await open(G, 15); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await page.locator('.sq-cutbutton').click(); await page.locator('.sq-cutbutton').click();
  assert.equal((await board(G)).n, 2);
  await tapCell(12, 7);
  assert.deepEqual([(await board(G)).w, (await board(G)).h, (await board(G)).n], [13, 8, 0]);
  for (let k = 0; k < 3; k++) await page.locator('.sq-cutbutton').click();
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
