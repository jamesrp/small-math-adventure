// Plays Missing square (a group in Tile gardens) through the real interface
// on the shared square grid: the group in the satchel; the lone shape chosen
// with its cut lines; a cut by a tap and by Enter; pieces dragged onto the
// grid, put by a tap and turned by a second tap and by Turn; a blocked tap
// that only shakes; a piece dragged home and one brought back by its empty
// place; a wrong cut, Tape and Undo; a rebuild with the shelf, a refused
// That's all kept through Undo, Tape and the second rectangle; Can't off
// until a try, its refusal and the claim; arrow keys; focus after moves;
// and no page overflow. Same environment variables as the other browser
// suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for
// a 375-pixel phone with touch). Screenshots go in test-results/reshape/, or
// SHOTS if set.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {geometry} from '../dist/families/reshape/reshape.js';
import {lineSpan} from '../dist/families/reshape/cutmath.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1280, height: 900}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS ? pathToFileURL(process.env.SHOTS.replace(/\/?$/, '/')) : new URL('../test-results/reshape/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : '-desktop'}.png`, out).pathname, fullPage: true});
const pack = JSON.parse(await readFile(new URL('../dist/families/reshape/reshape.json', import.meta.url), 'utf8'));
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
let G = null, current = null;
const open = async id => { current = id; G = geometry(pack.puzzles.find(p => p.id === id).parameters); await page.goto(`${base}/#play/${id}`); await page.locator('.rs-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// Board squares: [x, y] of the start shape (home) or of the grid (mat).
const homeIndex = ([x, y]) => G.home.findIndex(c => c[0] === x && c[1] === y);
const at = (where, xy) => where === 'home' ? G.ofHome(homeIndex(xy)) : G.ofMat(xy);
const cell = (where, xy) => page.locator(`.rs-board polygon.sg-cell[data-cell="${at(where, xy)}"]`);
async function tapAt(locator) {
  const b = await locator.boundingBox(), px = b.x + b.width / 2, py = b.y + b.height / 2;
  if (phone) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
}
const tap = (where, xy) => tapAt(cell(where, xy));
let cdp = null;
async function slide(from, to) {
  const a = await cell(...from).boundingBox(), b = await cell(...to).boundingBox();
  const p = [a.x + a.width / 2, a.y + a.height / 2], q = [b.x + b.width / 2, b.y + b.height / 2];
  if (!phone) {
    await page.mouse.move(...p); await page.mouse.down();
    await page.mouse.move(...q, {steps: 16});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', p);
  for (let s = 1; s <= 16; s++) await touch('touchMove', [p[0] + (q[0] - p[0]) * s / 16, p[1] + (q[1] - p[1]) * s / 16]);
  await touch('touchEnd', q);
}
const cutLine = (piece, dir, k) => page.locator(`.rs-cut[data-rs-cut="${piece}:${dir}:${k}"]`);
// A tap a little inside the first square along a cut line, about a tenth of
// a square from the line: the board reads the press point and cuts there.
async function tapCut(piece, dir, k) {
  const cells = (await board(current)).pieces.find(p => p.cells[0] === piece).cells.map(i => G.home[i]);
  const [x1, y1] = lineSpan(cells, dir, k), b = await cell('home', dir === 'h' ? [x1, k] : [k, y1]).boundingBox();
  const px = b.x + b.width * (dir === 'v' ? .1 : .5), py = b.y + b.height * (dir === 'h' ? .1 : .5);
  if (phone) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
}
const undoButton = () => page.locator('[data-action="undo"]').click();
const note = () => page.locator('.rs-note').innerText();
const placed = async id => (await board(id)).pieces.filter(p => p.at).map(p => [p.cells[0], ...p.at]);
const focused = () => page.evaluate(() => { const e = document.activeElement; return {inBoard: Boolean(e?.closest('.rs-board')), cls: e?.getAttribute('class') || '', focus: e?.dataset?.focus || ''}; });
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Missing square QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const tile = page.locator('[data-view-key="family-tile"]');
  if (!(await tile.getAttribute('open'))) await tile.locator('summary').click();
  assert.equal(await tile.locator('.library-group h2', {hasText: 'Missing square'}).count(), 1, 'a Missing square group in Tile gardens');
  assert.equal(await tile.locator('.library-group', {hasText: 'Missing square'}).locator('.puzzle-card').count(), 12);
  await tile.locator('[data-id="reshape-01"]').click();
  await page.locator('.rs-puzzle').waitFor();

  /* ----- Puzzle 2, 6 by 2: cut by a tap, drag, put by a tap, solve. */
  const A = 'reshape-02';
  await open(A); await fit('6 by 2');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Fit every piece in the square, leaving one square uncovered.');
  assert.equal(await page.locator('.rs-cut').count(), 6, 'the lone shape is chosen, with a line at every place it can be cut');
  assert.equal(await page.locator('.rs-snip.on').count(), 1, 'one cut');
  assert.ok(await page.locator('.rs-turn').isDisabled(), 'nothing to turn');
  assert.ok(await page.locator('.rs-tape').isDisabled(), 'nothing to tape');
  await shot('square-fresh');
  await tapCut(0, 'v', 4);
  assert.equal((await board(A)).pieces.length, 2, 'a tap on a line cuts there');
  assert.equal(await page.locator('.rs-cut').count(), 0, 'no cuts left, no lines');
  assert.equal(await page.locator('.rs-snip.on').count(), 0);
  // Drag the 4 by 2 into the square's bottom rows by its top-left square.
  await slide(['home', [0, 0]], ['mat', [0, 2]]);
  assert.deepEqual(await placed(A), [[0, 0, 2, 0]], 'a slide puts the square held under the finger');
  await shot('square-dragged');
  // Choose the 2 by 2 and tap the grid where its corner goes.
  await tap('home', [4, 0]);
  assert.equal(await page.locator('.rs-board .sg-piece.chosen').count(), 1, 'a tap chooses a piece');
  await tap('mat', [2, 2]);
  assert.deepEqual(await placed(A), [[0, 0, 2, 0]], 'a tap on a covered square changes nothing');
  assert.equal(await page.locator('.rs-board .sg-piece.chosen').count(), 1, 'the 4 by 2 is chosen now');
  await tap('home', [4, 0]);
  await tap('mat', [3, 0]);
  assert.deepEqual((await placed(A)).sort(), [[0, 0, 2, 0], [4, 2, 0, 0]], 'a tap near the edge keeps the piece on the grid');
  await done(); await fit('6 by 2 solved');
  assert.equal(await page.locator('.rs-hole-ring').count(), 1, 'the square left over is ringed');
  assert.equal(await page.locator('.rs-hole-num').textContent(), '2');
  await shot('square-solved');

  /* ----- Puzzle 3, 5 by 1: Enter on a line, turning by a second tap and by Turn. */
  const B = 'reshape-03';
  await open(B);
  await cutLine(0, 'v', 3).focus(); await page.keyboard.press('Enter');
  assert.equal((await board(B)).pieces.length, 2, 'Enter on a line cuts');
  await tap('home', [0, 0]); await tap('mat', [0, 2]);
  await tap('home', [3, 0]); await tap('mat', [0, 0]);
  assert.deepEqual((await placed(B)).sort(), [[0, 0, 2, 0], [3, 0, 0, 0]]);
  await tap('mat', [0, 0]);
  assert.deepEqual((await placed(B)).sort(), [[0, 0, 2, 0], [3, 0, 0, 1]], 'a second tap on a chosen piece turns it');
  await done();
  // Turn by the button, and a blocked turn that only shakes.
  await open('reshape-01');
  // The whole 4 by 2 can't go in the 3 by 3: a tap there only shakes it.
  await tap('mat', [1, 1]);
  assert.deepEqual(await placed('reshape-01'), [], 'no room: nothing moves');
  assert.equal(await page.locator('.rs-board .sg-piece.chosen.shake0, .rs-board .sg-piece.chosen.shake1').count(), 1, 'the piece shakes');
  await tapCut(0, 'v', 3);
  await tap('home', [0, 0]); await tap('mat', [0, 0]);
  assert.ok(!(await page.locator('.rs-turn').isDisabled()), 'Turn is on for a chosen piece on the grid');
  await page.locator('.rs-turn').click();
  assert.deepEqual(await placed('reshape-01'), [[0, 0, 0, 1]], 'Turn turns it where it is');
  let f = await focused();
  assert.notEqual(f.focus, 'rs-tape', 'focus after a move is not on Tape');
  // Drag a piece home, and bring one back by its empty place.
  await slide(['mat', [0, 0]], ['home', [1, 1]]);
  assert.deepEqual(await placed('reshape-01'), [], 'a piece dragged up goes home');
  await tap('home', [0, 0]); await tap('mat', [0, 0]);
  await tap('home', [0, 0]);
  assert.deepEqual(await placed('reshape-01'), [], 'a tap on its empty place brings it back');
  // A wrong cut, Tape, and Undo.
  await undoButton(); await undoButton(); await undoButton(); await undoButton(); await undoButton(); await undoButton();
  assert.equal((await board('reshape-01')).pieces.length, 1, 'Undo back to the whole shape');
  await tapCut(0, 'v', 2);
  assert.ok(!(await page.locator('.rs-tape').isDisabled()));
  await page.locator('.rs-tape').click();
  assert.equal((await board('reshape-01')).pieces.length, 1, 'Tape joins the pieces');
  assert.equal(await page.locator('.rs-cut').count(), 4, 'and the shape is chosen again');
  await undoButton();
  assert.equal((await board('reshape-01')).pieces.length, 2, 'Undo takes Tape back');

  /* ----- Puzzle 7: rebuild, the shelf, a refused That's all, Tape, the second rectangle. */
  const R = 'reshape-07';
  await open(R); await fit('rebuild');
  assert.ok(await page.locator('.rs-all').isDisabled(), 'That’s all waits for a rectangle');
  await tapCut(0, 'h', 2);
  await slide(['home', [0, 2]], ['mat', [0, 0]]);
  await slide(['home', [0, 0]], ['mat', [4, 0]]);
  assert.deepEqual((await board(R)).found, ['6x2'], 'a rectangle made goes on the shelf');
  assert.equal(await page.locator('.rs-slot').count(), 1);
  assert.equal(await page.locator('.rs-made').count(), 1, 'outlined with its sides');
  await shot('rebuild-made');
  await page.locator('.rs-all').click();
  assert.equal(await note(), 'There’s another.');
  assert.ok(await page.locator('.rs-all').isDisabled(), 'That’s all waits for a new rectangle');
  await undoButton();
  assert.equal((await board(R)).no, true, 'Undo keeps the refusal');
  assert.deepEqual((await board(R)).found, ['6x2'], 'and the shelf');
  await page.locator('.rs-tape').click();
  await tapCut(0, 'h', 1);
  await slide(['home', [0, 1]], ['mat', [0, 1]]);
  await tap('home', [0, 0]); await tap('mat', [2, 1]);
  assert.deepEqual((await board(R)).found, ['6x2', '4x3']);
  assert.equal((await board(R)).no, false, 'a new rectangle lifts the refusal');
  await shot('rebuild-second');
  await page.locator('.rs-all').click();
  await done(); await fit('rebuild solved');

  /* ----- Puzzle 10: Can't after a try, a refusal, the claim. */
  const C = 'reshape-10';
  await open(C); await fit('cant');
  assert.ok(await page.locator('.rs-cant').isDisabled(), 'Can’t waits for a try');
  await tapCut(0, 'h', 2);
  f = await focused();
  assert.notEqual(f.focus, 'rs-cant', 'focus after a move is never on Can’t');
  await page.locator('.rs-cant').click();
  assert.equal(await page.locator('.rs-cut').count(), 0, 'no cutting while picking');
  await tap('mat', [3, 1]);
  await tap('mat', [2, 1]);
  assert.equal(await note(), 'One piece can cover both.');
  assert.equal(await page.locator('.rs-board .sg-cell.clash').count(), 2, 'both squares marked');
  await shot('cant-refused');
  await tap('mat', [3, 1]);
  assert.equal(await page.locator('.rs-pick').count(), 0, 'a second tap drops a square');
  await tap('mat', [3, 1]); await tap('mat', [1, 3]); await tap('mat', [5, 3]);
  assert.deepEqual((await board(C)).claim, null, 'nothing claimed yet');
  await tap('mat', [3, 5]);
  await done(); await fit('cant claimed');
  assert.deepEqual((await board(C)).claim, [[3, 1], [1, 3], [5, 3], [3, 5]]);
  assert.equal(await page.locator('.rs-pick.kept').count(), 4);
  await shot('cant-claimed');

  /* ----- Puzzle 11: a pinwheel by keys and drags; arrow keys. */
  const P = 'reshape-11';
  await open(P); await fit('pinwheel');
  await tapCut(0, 'h', 2);
  await tap('home', [0, 0]); await tapCut(0, 'v', 5);
  await tap('home', [0, 2]); await tapCut(20, 'v', 5);
  assert.equal((await board(P)).pieces.length, 4);
  // Top: 5 by 2 at (0, 0); right: turned at (5, 0); bottom: at (2, 5); left: turned at (0, 2).
  await tap('home', [0, 0]); await tap('mat', [0, 0]);
  await tap('home', [5, 0]); await tap('mat', [5, 0]);
  assert.deepEqual((await placed(P)).find(p => p[0] === 5), [5, 5, 0, 1], 'a tap turns a piece that only fits turned');
  // The bottom piece goes one square short, then an arrow key slides it.
  await tap('home', [0, 2]); await tap('mat', [1, 5]);
  assert.deepEqual((await placed(P)).find(p => p[0] === 20), [20, 1, 5, 0]);
  await cell('mat', [1, 5]).focus();
  await page.keyboard.press('ArrowRight');
  assert.deepEqual((await placed(P)).find(p => p[0] === 20), [20, 2, 5, 0], 'an arrow key moves the chosen piece');
  await tap('home', [5, 2]); await tap('mat', [0, 2]);
  await done(); await fit('pinwheel solved');
  await shot('pinwheel-solved');

  /* ----- Puzzle 12: a big rebuild board. */
  await open('reshape-12'); await fit('12');
  await shot('rebuild-12');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
