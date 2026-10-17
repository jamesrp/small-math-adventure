// Plays Mirror Couriers bounce words through the real interface: a tap that
// hits a corner, a tap between four aim points, Undo, a drag that solves, the
// arrow keys and where focus goes, Can't with wall taps (a refusal kept
// through Undo, a tap near a corner where walls meet, the right pair and its
// line), Escape and Enter on walls, dragging the start in the rhombus and the
// rhombus refusing the square's walls, hints with Apply hint, a remake with
// Stretch, Check refused and accepted, the busiest board of the hardest
// puzzle at phone size, How to play, and Mirror Couriers' own puzzles and
// Sight lines still opening. Same environment variables as the other browser
// suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a
// 375 × 667 phone with touch). Screenshots go in test-results/aims/, or in
// SHOT_DIR when it is set.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOT_DIR ? `${process.env.SHOT_DIR.replace(/\/$/, '')}/` : new URL('../test-results/aims/', import.meta.url).pathname;
const shot = name => page.screenshot({path: `${out}${name}${phone ? '-phone' : ''}.png`, fullPage: true});
const attempt = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id], [key, id]);
const board = async id => (await attempt(id))?.board;
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="aims"] .am-board').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const note = () => page.locator('.am-note').innerText();
const noNote = async label => assert.equal(await page.locator('.am-note').count(), 0, label);
const button = name => page.getByRole('button', {name, exact: true});
const focused = () => page.evaluate(() => { const e = document.activeElement; return e?.dataset?.focus || e?.id || e?.tagName; });
const pack = await (await fetch(`${base}/families/aims/aims.json`)).json();
const params = id => pack.puzzles.find(p => p.id === id).parameters;

// A point of the app's plane (rhombus points in its slanted coordinates) on
// screen, through the play window's paper, which spans the window's frame.
async function spot(id, pt) {
  const q = params(id);
  return page.evaluate(([q, pt]) => {
    const R3 = Math.sqrt(3), svg = document.querySelector('.am-board'), paper = svg.querySelector('.am-paper');
    const size = {square: [10, 10], wide: [20, 10]}[q.room], f = q.frame;
    const [X0, X1, Y0, Y1] = q.room === 'rhombus' ? [f[0] / 2, f[1] / 2, (f[2] * R3) / 2, (f[3] * R3) / 2] : [f[0] * size[0], (f[1] + 1) * size[0], f[2] * size[1], (f[3] + 1) * size[1]];
    const [x, y] = q.room === 'rhombus' ? [pt[0] + pt[1] / 2, (pt[1] * R3) / 2] : pt;
    const px = +paper.getAttribute('x') + ((x - X0) / (X1 - X0)) * +paper.getAttribute('width'), py = +paper.getAttribute('y') + ((Y1 - y) / (Y1 - Y0)) * +paper.getAttribute('height');
    const p = svg.createSVGPoint(); p.x = px; p.y = py;
    const s = p.matrixTransform(svg.getScreenCTM());
    return [s.x, s.y];
  }, [q, pt]);
}
const tapXY = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async (id, pt) => tapXY(await spot(id, pt));
const wall = async (id, seam) => { const n = seam.split(',').map(Number); return tap(id, [(n[0] + n[2]) / 2, (n[1] + n[3]) / 2]); };
// A drag: a mouse drag on a desktop, a touch drag on a phone, where the end
// rides 34 px above the finger, so the finger stops 34 px below the target.
let cdp = null;
async function drag(from, to) {
  const target = phone ? [to[0], to[1] + 34] : to;
  if (!phone) {
    await page.mouse.move(...from); await page.mouse.down();
    await page.mouse.move(...target, {steps: 10}); await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', from);
  for (let s = 1; s <= 10; s++) await touch('touchMove', [from[0] + ((target[0] - from[0]) * s) / 10, from[1] + ((target[1] - from[1]) * s) / 10]);
  await touch('touchEnd', target);
}
async function hintsToSolve() {
  for (let i = 0; i < 3; i++) if (await button('Hint').count()) await button('Hint').click();
  for (let k = 0; k < 8 && !(await page.locator('#completion-heading').count()); k++) await button('Apply hint').click();
  await done();
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Aims QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('[data-view-key="family-billiard"] h2', {hasText: 'Bounce words'}).count(), 1, 'the group in Mirror Couriers');

  // Puzzle 1: a corner, a contested tap, Undo, a drag that solves.
  const P1 = 'aims-01';
  await open(P1); await fit('puzzle 1');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Make a shot with this word.');
  assert.equal(await page.locator('.am-row.goal .am-tile').allInnerTexts().then(t => t.join('')), 'DC');
  await tap(P1, [15, 15]);
  assert.deepEqual((await board(P1)).end, [15, 15]);
  assert.equal(await note(), 'That shot hits a corner.');
  assert.equal(await page.locator('.am-tile.corner').count(), 1);
  assert.equal(await page.locator('.am-board .am-corner').count(), 1, 'a ring at the corner');
  assert.equal(await focused(), 'am-board', 'focus stays on the board after a tap');
  await tap(P1, [10.6, 10.3]);
  assert.deepEqual((await board(P1)).end, [11, 11], 'a tap near a corner goes to the nearest aim point');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(P1)).end, [15, 15], 'Undo');
  await drag(await spot(P1, [7, 3]), await spot(P1, [17, 13]));
  await done(); await fit('puzzle 1 solved');
  assert.deepEqual((await board(P1)).end, [17, 13], 'the drag ends the shot where it is let go');
  await shot('01-solved');

  // Puzzle 2: arrow keys.
  const P2 = 'aims-02';
  await open(P2);
  await page.locator('.am-board').focus();
  await page.keyboard.press('ArrowRight');
  assert.deepEqual((await board(P2)).end, [7, 5], 'an arrow sets the end next to the start');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp');
  assert.deepEqual((await board(P2)).end, [7, 9]);
  assert.equal(await focused(), 'am-board', 'keys keep focus on the board');

  // Puzzle 5: Can't in the square.
  const P5 = 'aims-05';
  await open(P5); await fit('puzzle 5');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a shot');
  await tap(P5, [3, -7]);
  assert.equal(await page.locator('.am-row.now .am-tile').allInnerTexts().then(t => t.join('')), 'A');
  await button('Can’t').click();
  assert.equal(await button('Can’t').getAttribute('aria-pressed'), 'true');
  assert.equal(await note(), 'Tap two walls.');
  assert.equal(await page.locator('.am-pick').count(), 24);
  assert.equal(await page.locator('.am-pick.picked').count(), 0, 'no wall is marked before it is tapped');
  await wall(P5, '0,0,10,0');
  assert.equal(await page.locator('.am-pick.picked').count(), 1);
  await wall(P5, '0,0,10,0');
  assert.equal(await page.locator('.am-pick.picked').count(), 0, 'a second tap on the same wall lets it go');
  await wall(P5, '0,0,10,0'); await wall(P5, '10,0,20,0');
  assert.equal(await note(), 'Not the A walls ABA needs.');
  assert.deepEqual((await board(P5)).refused.walls, ['0,0,10,0', '10,0,20,0']);
  assert.equal(await button('Can’t').isDisabled(), true, 'one claim per shot');
  assert.notEqual(await focused(), 'am-cant', 'focus leaves Can’t');
  await shot('05-refused');
  await page.locator('[data-action="undo"]').click();
  await noNote('Undo hides the refusal');
  assert.equal((await board(P5)).refused.shown, false, 'and keeps it');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t still waits for a new shot');
  await tap(P5, [-3, -7]);
  assert.equal(await button('Can’t').isDisabled(), false);
  await button('Can’t').click();
  await wall(P5, '0,0,10,0');
  await tap(P5, [-0.8, 0.3]); // near the corner where A, B and two copies’ walls meet: the nearest is the A wall to the left
  await done(); await fit('puzzle 5 solved');
  assert.deepEqual((await board(P5)).claimed, ['-10,0,0,0', '0,0,10,0']);
  assert.equal(await page.locator('.am-proof').count(), 1, 'the line through both walls');
  assert.equal(await note(), 'Both A walls lie on one line.');
  await shot('05-solved');

  // Puzzle 10: keyboard on walls, Escape, and the hint chain to the claim.
  const P10 = 'aims-10';
  await open(P10);
  await tap(P10, [10, 15]);
  await button('Can’t').click();
  await page.locator('.am-pick').first().focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.am-pick.picked').count(), 1, 'Enter picks a wall');
  assert.equal(await page.locator('.am-pick.picked').evaluate(e => e === document.activeElement), true, 'focus stays on the picked wall');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.am-pick').count(), 0, 'Escape puts the walls away');
  await page.locator('[data-action="restart"]').click();
  await button('Hint').click();
  const first = await page.locator('.hint-card').innerText();
  assert.doesNotMatch(first, /Can’t/, 'the first hint does not say Can’t');
  await hintsToSolve();
  assert.ok((await board(P10)).claimed, 'the hints end in the claim');

  // Puzzle 6: the rhombus; drag the start, the square’s walls are refused.
  const P6 = 'aims-06';
  await open(P6); await fit('puzzle 6');
  await drag(await spot(P6, [7, 7]), await spot(P6, [4, 4]));
  assert.deepEqual((await board(P6)).start, [4, 4], 'the start is dragged');
  await tap(P6, [19, 4]);
  assert.equal(await page.locator('.am-row.now .am-tile').allInnerTexts().then(t => t.join('')), 'D');
  await button('Can’t').click();
  const seams = await page.locator('.am-pick').evaluateAll(list => list.map(e => e.dataset.seam));
  await wall(P6, seams[0]); await wall(P6, seams[1]);
  assert.match(await note(), /^Not (on one line|the A walls ABA needs)\.$/);
  assert.equal(await page.locator('#completion-heading').count(), 0);
  await shot('06-refused');
  await hintsToSolve();
  assert.equal(await page.locator('.am-row.now .am-tile').allInnerTexts().then(t => t.join('')), 'ABA');

  // Puzzle 7: a remake, then Stretch.
  const P7 = 'aims-07';
  await open(P7); await fit('puzzle 7');
  assert.equal(await page.locator('.am-given').count(), 1);
  assert.equal(await button('Stretch').count(), 0, 'Stretch only after the solve');
  await tap(P7, pack.puzzles.find(p => p.id === P7).solution.end);
  await done();
  await button('Stretch').click();
  assert.equal(await page.locator('.am-given.stretched').count(), 1);
  assert.equal(await button('Stretch').getAttribute('aria-pressed'), 'true');
  await page.waitForTimeout(1100); await shot('07-stretched'); await fit('stretched');

  // Puzzle 8: Check refused, kept through Undo, then accepted.
  const P8 = 'aims-08';
  await open(P8);
  assert.equal(await button('Check').isDisabled(), true);
  await tap(P8, [22, 7]);
  assert.equal(await page.locator('.am-row.now .am-tile').allInnerTexts().then(t => t.join('')), 'D');
  await button('Check').click();
  assert.equal(await note(), 'A rectangle can make it too.');
  assert.equal(await button('Check').isDisabled(), true);
  await page.locator('[data-action="undo"]').click();
  await noNote('Undo hides the refused Check');
  assert.equal(await button('Check').isDisabled(), true, 'Check still waits for a new shot');
  await hintsToSolve();

  // Puzzle 11, the busiest board: a long shot at phone size.
  const P11 = 'aims-11';
  await open(P11);
  await tap(P11, [70, -38]);
  const box = await page.locator('.am-board').boundingBox(), vw = page.viewportSize().width;
  assert.ok(box.width <= 381 && box.x >= 0 && box.x + box.width <= vw, 'the board fits');
  await fit('puzzle 11 with a long shot');
  const check = await page.locator('.am-check').boundingBox();
  assert.ok(check.x >= 0 && check.x + check.width <= vw, 'Check is on screen across');
  await shot('11-long');
  await hintsToSolve();

  // How to play shows the folded room and its copies.
  await open(P1);
  await page.getByRole('button', {name: 'How to play'}).click();
  assert.equal(await page.locator('dialog .am-help svg').count(), 2);
  await page.keyboard.press('Escape');

  // Mirror Couriers’ own puzzles and Sight lines still open.
  await page.goto(`${base}/#play/billiard-01`); await page.locator('#main h1, .puzzle-card, main').first().waitFor();
  await page.goto(`${base}/#play/orchard-01`); await page.locator('[data-mechanic-wire="orchard"]').waitFor();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
