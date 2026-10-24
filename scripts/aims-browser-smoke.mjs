// Plays Mirror Couriers bounce words through the real interface: aiming
// draws only the straight aim over the launched shot, faded (a sweep with the
// button held shows no new word),
// Launch is the move (a corner hit, Undo, Enter on the board), arrow keys and
// where focus goes, Can't closed until a launch starts the word, wall taps (a
// refusal kept through Undo, a tap near a corner where walls meet, the right
// pair and its line), Can't and then Undo leaving the board live, Escape and
// Enter on walls, hints after a wrong shot trying the word's start first,
// dragging and tapping the start in the rhombus, a remake with Stretch,
// Check refused with a square shot and kept for the same word, the letters
// after a right Check, the busiest board of the hardest puzzle at phone size
// (the last shot's copies kept, faded, while aiming; a bigger window on a
// tablet) with its drawn argument, How to play, and Mirror Couriers' own puzzles and
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
const word = () => page.locator('.am-row.now .am-tile:not(.empty)').allInnerTexts().then(t => t.join(''));
// The aim waiting for Launch, from the Launch button.
const aim = async () => JSON.parse(await page.locator('.am-launch').getAttribute('data-move'));
const launch = async () => { await button('Launch').click(); };
const pack = await (await fetch(`${base}/families/aims/aims.json`)).json();
const params = id => pack.puzzles.find(p => p.id === id).parameters;
// Nothing of the aimed shot is drawn while aiming: only the launched shot,
// faded, with its word (`launched`, empty before the first launch).
async function onlyAim(label, launched = '') {
  assert.equal(await page.locator('.am-board .am-aim').count(), 1, `${label}: the aim line`);
  for (const sel of ['.am-hit', '.am-shot', '.am-wall.crossed', '.am-copy.passed', '.am-fold-path']) assert.equal(await page.locator(`[data-mechanic-wire="aims"] ${sel}:not(.last)`).count(), 0, `${label}: no ${sel} of the aim`);
  assert.equal(await word(), launched, `${label}: the launched word only`);
  assert.equal(await page.locator('.am-row.now .am-tile:not(.empty):not(.last)').count(), 0, `${label}: faded`);
}

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
const shoot = async (id, pt) => { await tap(id, pt); await launch(); };
const wall = async (id, seam) => { const n = seam.split(',').map(Number); return tap(id, [(n[0] + n[2]) / 2, (n[1] + n[3]) / 2]); };
// A drag: a mouse drag on a desktop, a touch drag on a phone, where the end
// rides 34 px above the finger, so the finger stops 34 px below the target.
// `during` runs with the button (or finger) still down.
let cdp = null;
async function drag(from, to, during = null) {
  const target = phone ? [to[0], to[1] + 34] : to;
  if (!phone) {
    await page.mouse.move(...from); await page.mouse.down();
    await page.mouse.move(...target, {steps: 10});
    if (during) await during();
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', from);
  for (let s = 1; s <= 10; s++) await touch('touchMove', [from[0] + ((target[0] - from[0]) * s) / 10, from[1] + ((target[1] - from[1]) * s) / 10]);
  if (during) await during();
  await touch('touchEnd', target);
}
async function hintTo(level) { for (let i = 0; i < level; i++) if (await button('Hint').count()) await button('Hint').click(); }
async function hintsToSolve() {
  await hintTo(3);
  for (let k = 0; k < 8 && !(await page.locator('#completion-heading').count()); k++) await button('Apply hint').click();
  await done();
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Aims QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('[data-view-key="family-billiard"] h2', {hasText: 'Bounce words'}).count(), 1, 'the group in Mirror Couriers');

  // Puzzle 1: aiming draws only the aim; Launch, a corner, Undo, Enter.
  const P1 = 'aims-01';
  await open(P1); await fit('puzzle 1');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Make a shot with this word.');
  assert.equal(await page.locator('.am-row.goal .am-tile').allInnerTexts().then(t => t.join('')), 'DC');
  assert.equal(await button('Launch').isDisabled(), true, 'nothing to launch yet');
  await tap(P1, [15, 15]);
  await onlyAim('a tap');
  assert.equal((await board(P1)).end, null, 'a tap only aims');
  assert.deepEqual((await aim()).end, [15, 15]);
  assert.equal(await page.locator('.am-board .am-corner').count(), 0, 'no corner ring before Launch');
  // A sweep with the button held across many aim points shows no word.
  let sweeps = 0;
  await drag(await spot(P1, [3, 1]), await spot(P1, [27, 21]), async () => { await onlyAim('a sweep'); sweeps++; });
  assert.equal(sweeps, 1);
  await tap(P1, [15, 15]);
  await launch();
  assert.deepEqual((await board(P1)).end, [15, 15]);
  assert.equal((await attempt(P1)).moves, 1, 'a launch is a move');
  assert.equal(await note(), 'That shot hits a corner.');
  assert.equal(await page.locator('.am-tile.corner').count(), 1);
  assert.equal(await page.locator('.am-board .am-corner').count(), 1, 'a ring at the corner');
  assert.equal(await focused(), 'am-board', 'focus goes to the board after Launch');
  await tap(P1, [10.6, 10.3]);
  assert.deepEqual((await aim()).end, [11, 11], 'a tap near a corner goes to the nearest aim point');
  await launch();
  assert.deepEqual((await board(P1)).end, [11, 11]);
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(P1)).end, [15, 15], 'Undo takes the launch back');
  assert.equal(await note(), 'That shot hits a corner.');
  await drag(await spot(P1, [7, 3]), await spot(P1, [17, 13]));
  assert.deepEqual((await aim()).end, [17, 13], 'the drag aims where it is let go');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'not solved before Launch');
  await page.locator('.am-board').focus(); await page.keyboard.press('Enter');
  await done(); await fit('puzzle 1 solved');
  assert.deepEqual((await board(P1)).end, [17, 13], 'Enter launches');
  await shot('01-solved');

  // Puzzle 2: arrow keys aim; Enter launches.
  const P2 = 'aims-02';
  await open(P2);
  await page.locator('.am-board').focus();
  await page.keyboard.press('ArrowRight');
  assert.deepEqual((await aim()).end, [7, 5], 'an arrow aims next to the start');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp');
  assert.deepEqual((await aim()).end, [7, 9]);
  assert.equal(await focused(), 'am-board', 'keys keep focus on the board');
  await onlyAim('arrow keys');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board(P2)).end, [7, 9]);
  assert.equal(await focused(), 'am-board');
  // After a launch, a sweep keeps the launched shot, faded, and shows nothing new.
  await shoot(P2, [17, 13]);
  const launched = await word(), hits = await page.locator('.am-board .am-hit').count();
  assert.equal(launched, 'DC'); assert.equal(hits, 2);
  let swept = 0;
  await drag(await spot(P2, [3, 1]), await spot(P2, [27, 21]), async () => {
    await onlyAim('a sweep after a launch', launched);
    assert.equal(await page.locator('.am-board .am-hit.last').count(), hits, 'the launched shot’s crossings, faded');
    swept++;
  });
  assert.equal(swept, 1);
  await onlyAim('after the sweep', launched);
  await page.locator('.am-board').focus(); await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-mechanic-wire="aims"] .last').count(), 0, 'Escape: the launched shot, unfaded');

  // Puzzle 5: Can't in the square.
  const P5 = 'aims-05';
  await open(P5); await fit('puzzle 5');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a launch');
  await shoot(P5, [3, -7]);
  assert.equal(await word(), 'A');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a launch that starts A, B');
  await shoot(P5, [-1, -9]);
  assert.equal(await word(), 'AB');
  assert.equal(await button('Can’t').isDisabled(), false);
  // Can't, then Undo: the board still aims and launches.
  await button('Can’t').click();
  assert.equal(await page.locator('.am-pick').count(), 24);
  await page.locator('[data-action="undo"]').click();
  assert.equal(await word(), 'A');
  assert.equal(await page.locator('.am-pick').count(), 0, 'Undo puts the walls away');
  await tap(P5, [-3, -9]);
  await onlyAim('after Can’t and Undo', 'A');
  await launch();
  assert.equal(await word(), 'AB', 'and Launch still works');
  await button('Can’t').click();
  assert.equal(await button('Can’t').getAttribute('aria-pressed'), 'true');
  assert.equal(await note(), 'Tap two walls.');
  assert.equal(await page.locator('.am-pick.picked').count(), 0, 'no wall is marked before it is tapped');
  await wall(P5, '0,0,10,0');
  assert.equal(await page.locator('.am-pick.picked').count(), 1);
  await wall(P5, '0,0,10,0');
  assert.equal(await page.locator('.am-pick.picked').count(), 0, 'a second tap on the same wall lets it go');
  await wall(P5, '0,0,10,0'); await wall(P5, '10,0,20,0');
  assert.equal(await note(), 'Those two don’t stop ABA.');
  assert.deepEqual((await board(P5)).refused.walls, ['0,0,10,0', '10,0,20,0']);
  assert.equal(await button('Can’t').isDisabled(), true, 'one claim per launch');
  assert.notEqual(await focused(), 'am-cant', 'focus leaves Can’t');
  await shot('05-refused');
  await page.locator('[data-action="undo"]').click();
  await noNote('Undo hides the refusal');
  assert.equal((await board(P5)).refused.shown, false, 'and keeps it');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t still waits for a new launch');
  await shoot(P5, [-1, -9]);
  assert.equal(await button('Can’t').isDisabled(), false);
  await button('Can’t').click();
  await wall(P5, '0,0,10,0');
  await tap(P5, [-0.8, 0.3]); // near the corner where A, B and two copies’ walls meet: the nearest is the A wall to the left
  await done(); await fit('puzzle 5 solved');
  assert.deepEqual((await board(P5)).claimed, ['-10,0,0,0', '0,0,10,0']);
  assert.equal(await page.locator('.am-proof').count(), 1, 'the line through both walls');
  assert.equal(await note(), 'Both A walls lie on one line.');
  await shot('05-solved');

  // Puzzle 10: keyboard on walls, Escape, hints after a wrong shot, the claim.
  const P10 = 'aims-10';
  await open(P10);
  await shoot(P10, [-2, 25]);
  assert.equal(await word(), 'CAB');
  await button('Can’t').click();
  const named = await page.locator('.am-pick').first().getAttribute('aria-label');
  assert.match(named, /^[ABCD] wall of (the room|the copy .+)$/, 'walls are named by copy');
  await page.locator('.am-pick').first().focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.am-pick.picked').count(), 1, 'Enter picks a wall');
  assert.equal(await page.locator('.am-pick.picked').evaluate(e => e === document.activeElement), true, 'focus stays on the picked wall');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.am-pick').count(), 0, 'Escape puts the walls away');
  await page.locator('[data-action="restart"]').click();
  await button('Hint').click();
  assert.doesNotMatch(await page.locator('.hint-card').innerText(), /Can’t/, 'the first hint does not say Can’t');
  await shoot(P10, [10, 15]);
  assert.equal(await word(), 'C');
  await hintTo(2);
  assert.match(await page.locator('.hint-card').innerText(), /Try C, then A, then B/, 'after a wrong shot the hint tries the word’s start');
  assert.equal(await page.locator('.am-board .am-hint').count() >= 1, true, 'the hinted spot is outlined');
  assert.equal(await page.locator('.am-launch.hinted').count(), 0, 'Launch is outlined only once the aim is there');
  await hintTo(1);
  await button('Apply hint').click();
  assert.equal(await word(), 'CAB');
  await hintsToSolve();
  assert.ok((await board(P10)).claimed, 'the hints end in the claim');

  // Puzzle 6: the rhombus; drag and tap the start, refusals there.
  const P6 = 'aims-06';
  await open(P6); await fit('puzzle 6');
  await drag(await spot(P6, [7, 7]), await spot(P6, [4, 4]));
  assert.deepEqual((await aim()).start, [4, 4], 'the start is dragged');
  assert.deepEqual((await board(P6)).start, [7, 7], 'and moves at Launch');
  await tap(P6, [4, 4]);
  const near = await aim();
  assert.ok(near.end && String(near.end) !== '4,4', 'a tap on the start aims beside it');
  await tap(P6, [19, 4]);
  await launch();
  assert.deepEqual((await board(P6)).start, [4, 4]);
  assert.equal(await word(), 'D');
  assert.equal(await button('Can’t').isDisabled(), true);
  await hintTo(3);
  assert.match(await page.locator('.hint-card').innerText(), /Try A, then B/);
  await button('Apply hint').click();
  assert.equal(await word(), 'AB');
  await button('Can’t').click();
  const seams = await page.locator('.am-pick').evaluateAll(list => list.map(e => e.dataset.seam));
  await wall(P6, seams[0]); await wall(P6, seams[1]);
  assert.match(await note(), /^(Not on one line|Those two don’t stop ABA)\.$/);
  assert.equal(await page.locator('#completion-heading').count(), 0);
  await shot('06-refused');
  await hintsToSolve();
  assert.equal(await word(), 'ABA');

  // Puzzle 7: a remake, then Stretch.
  const P7 = 'aims-07';
  await open(P7); await fit('puzzle 7');
  assert.equal(await page.locator('.am-given').count(), 1);
  assert.equal(await button('Stretch').count(), 0, 'Stretch only after the solve');
  await shoot(P7, pack.puzzles.find(p => p.id === P7).solution.end);
  await done();
  await button('Stretch').click();
  assert.equal(await page.locator('.am-given.stretched').count(), 1);
  assert.equal(await button('Stretch').getAttribute('aria-pressed'), 'true');
  await page.waitForTimeout(1100); await shot('07-stretched'); await fit('stretched');

  // Puzzle 8: Check refused with a square shot, kept for the same word and
  // through Undo; a right Check, a wrong pair of letters, then the two A’s.
  const P8 = 'aims-08';
  await open(P8);
  assert.equal(await button('Check').isDisabled(), true);
  await shoot(P8, [22, 7]);
  assert.equal(await word(), 'D');
  await button('Check').click();
  assert.equal(await note(), 'A square makes it too.');
  assert.equal(await page.locator('.am-proofbox .am-mini').getAttribute('aria-label'), 'A square shot with the word D');
  assert.equal(await button('Check').isDisabled(), true);
  await shot('08-evidence');
  await shoot(P8, [22, -5]);
  assert.equal(await word(), 'D');
  assert.equal(await button('Check').isDisabled(), true, 'Check stays off for the same word');
  await page.locator('[data-action="undo"]').click();
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board(P8)).refused?.shown, false);
  await noNote('Undo hides the refused Check');
  assert.equal(await button('Check').isDisabled(), true, 'Check still waits for a new word');
  await shoot(P8, [-11, -17]);
  assert.equal(await word(), 'ABAD');
  await button('Check').click();
  assert.equal(await note(), 'No rectangle makes it. Tap the two letters that show why.');
  assert.equal(await page.locator('button.am-tile').count(), 4);
  await tap(P8, [22, 7]);
  assert.equal(await page.locator('.am-board .am-aim').count(), 1);
  assert.equal(await page.locator('button.am-tile').count(), 4, 'the letters stay while aiming elsewhere');
  await page.locator('.am-board').focus(); await page.keyboard.press('Escape');
  assert.equal(await page.locator('.am-board .am-aim').count(), 0, 'Escape puts the aim back');
  await page.locator('button.am-tile').nth(1).click();
  assert.equal(await page.locator('button.am-tile.picked').count(), 1);
  assert.equal(await focused(), 'am-tile-1');
  await page.locator('button.am-tile').nth(3).click();
  assert.equal(await note(), 'Those two don’t show why.');
  assert.equal(await page.locator('button.am-tile').count(), 0, 'one pair per word');
  await shoot(P8, [-11, -14]);
  assert.equal(await word(), 'ABA');
  await button('Check').click();
  await page.locator('button.am-tile').nth(0).click(); await page.locator('button.am-tile').nth(2).click();
  await done(); await fit('puzzle 8 solved');
  assert.deepEqual((await board(P8)).pair, [0, 2]);
  assert.equal(await note(), 'In a rectangle the two A walls would lie on one line.');
  assert.equal(await page.locator('.am-proofbox .am-mini .am-proof').count(), 1);
  await shot('08-solved');

  // Puzzle 11, the busiest board: a long shot at phone size, then the argument.
  const P11 = 'aims-11';
  await open(P11);
  await shoot(P11, [70, -38]);
  const box = await page.locator('.am-board').boundingBox(), vw = page.viewportSize().width;
  assert.ok(box.width <= 381 && box.x >= 0 && box.x + box.width <= vw, 'the board fits');
  await fit('puzzle 11 with a long shot');
  const check = await page.locator('.am-check').boundingBox();
  assert.ok(check.x >= 0 && check.x + check.width <= vw, 'Check is on screen across');
  await shot('11-long');
  // Aiming the next shot: the rhombus copies of the last one stay, faded.
  const long = await word(), copies = await page.locator('.am-board .am-copy.passed').count();
  await tap(P11, [10, 5]);
  await onlyAim('the next aim in the rhombus', long);
  assert.equal(await page.locator('.am-board .am-copy.passed.last').count(), copies, 'the last shot’s copies, faded');
  await shot('11-aiming');
  // On a tablet the window is bigger.
  const size = page.viewportSize();
  await page.setViewportSize({width: 820, height: 1180});
  const wide = await page.locator('.am-board').boundingBox();
  assert.ok(wide.height >= 500, `a bigger window on a tablet (${wide.width} × ${wide.height})`);
  await fit('puzzle 11 on a tablet'); await shot('11-tablet');
  await page.setViewportSize(size);
  await page.locator('.am-board').focus(); await page.keyboard.press('Escape');
  await hintsToSolve();
  assert.match(await note(), /^In a rectangle, [ABCD] to [ABCD] is (steeper|flatter) than the diagonal and [ABCD] to [ABCD] is (flatter|steeper)\.$/);
  assert.equal(await page.locator('.am-proofbox .am-mini .am-diag').count(), 2);
  await fit('puzzle 11 solved'); await shot('11-solved');

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
