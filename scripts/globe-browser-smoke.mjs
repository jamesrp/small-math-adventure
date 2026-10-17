// Plays Ball triangles through the real interface: a tap that moves the
// chosen corner to a dot, taps between a corner and the next dot (nearer the
// corner chooses it, nearer the dot moves there), a drag that carries a
// corner (one Undo), a drag that turns the ball, the turn buttons, arrow keys
// (and Shift to turn), focus after moves, a tap where a corner sits behind
// the ball, Hint (the first idea, then the marks, then Apply hint), a set
// made, a wrong Can't refused and kept across Undo, a right Can't with its
// argument drawn, the busiest board fitting a 375 × 667 phone, and the
// playground's lune pairs. Same environment variables as the other browser
// suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a
// 375 × 667 phone with touch). Screenshots go in test-results/globe/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const pack = JSON.parse(await readFile(new URL('../dist/families/globe/globe.json', import.meta.url), 'utf8'));
const out = new URL('../test-results/globe/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.gl-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const viewOf = async () => (await page.locator('[data-gl-ball]').getAttribute('data-view')).split(',').map(Number);
// The screen point of a dot, by the module's own projection and the ball's current view.
const spot = pt => page.evaluate(async ([lat, lon]) => {
  const G = await import('/families/globe/globe.js');
  const box = document.querySelector('[data-gl-ball]'), [vl, vo] = box.dataset.view.split(',').map(Number);
  const [x, y, z] = G.screenOf(G.frameOf({lat: vl, lon: vo}), G.vec([lat, lon]));
  const r = new DOMPoint(x, y).matrixTransform(box.querySelector('svg').getScreenCTM());
  return [r.x, r.y, z];
}, pt);
const between = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(40); };
const tap = async pt => tapAt(await spot(pt));
let cdp = null;
async function dragAt(a, b) {
  if (!phone) {
    await page.mouse.move(...a); await page.mouse.down();
    await page.mouse.move(...b, {steps: 12});
    await page.mouse.up();
  } else {
    cdp ||= await context.newCDPSession(page);
    const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
    await touch('touchStart', a);
    for (let s = 1; s <= 12; s++) await touch('touchMove', between(a, b, s / 12));
    await touch('touchEnd', b);
  }
  await page.waitForTimeout(60);
}
const press = async selector => { await page.locator(selector).click(); await page.waitForTimeout(40); };
const undoButton = () => press('[data-action="undo"]');
const focusClass = () => page.evaluate(() => document.activeElement?.className?.baseVal ?? document.activeElement?.className ?? '');
const told = () => page.locator('.gl-told').count();
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Globe QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.match(await page.locator('[data-view-key="family-globe"]').innerText(), /Ball triangles/);

  // Puzzle 1: taps, a contested tap, Undo, a drag, turning, keys, focus, Hint.
  let P = 'globe-01';
  await open(P); await fit('puzzle 1');
  const ballBox = await page.locator('[data-gl-ball]').boundingBox();
  if (!phone) assert.ok(ballBox.width <= 380, `the ball is at most 380 px wide (${ballBox.width})`);
  assert.equal(await page.locator('[data-gl-ball]').evaluate(e => getComputedStyle(e).webkitTapHighlightColor), 'rgba(0, 0, 0, 0)', 'no tap flash');
  assert.equal(await page.locator('.gl-ball .gl-ball-face').evaluate(e => getComputedStyle(e).fill) !== 'rgb(0, 0, 0)', true, 'family styles reach the ball');
  const dots = await page.evaluate(() => { const r = []; for (const c of document.querySelectorAll('.gl-dot')) { const b = c.getBoundingClientRect(); r.push([b.x, b.y]); } return r; });
  const gaps = dots.map(([x, y], i) => Math.min(...dots.filter((_, j) => j !== i).map(([u, v]) => Math.hypot(u - x, v - y))));
  console.log(`Ball ${ballBox.width.toFixed(0)} px; a dot’s nearest neighbour is ${[...gaps].sort((m, n) => m - n)[gaps.length >> 1].toFixed(1)} px away (median).`);
  await tap([0, 45]);
  assert.deepEqual((await board(P)).corners.B, [0, 45], 'a tap moves the chosen corner to the dot');
  assert.match(await focusClass(), /gl-ball/, 'after a tap, focus is on the ball');
  // Between B and the next dot east: nearer B chooses B, nearer the dot moves there.
  const [b0, d0] = [await spot([0, 45]), await spot([0, 60])];
  await tapAt(between(b0, d0, 0.3));
  assert.deepEqual((await board(P)).corners.B, [0, 45], 'a tap nearer the corner than the next dot does not move it');
  await tapAt(between(b0, d0, 0.85));
  assert.deepEqual((await board(P)).corners.B, [0, 60], 'a tap nearer the dot moves the corner there');
  await undoButton();
  assert.deepEqual((await board(P)).corners.B, [0, 45], 'Undo takes the move back');
  // A tap on N, which stays put, does nothing.
  await tap([90, 0]);
  assert.deepEqual((await board(P)).corners, {N: [90, 0], A: [0, 0], B: [0, 45]}, 'a tap on a corner that stays put changes nothing');
  // A drag carries B from dot to dot as one move.
  await dragAt(await spot([0, 45]), await spot([0, 75]));
  assert.deepEqual((await board(P)).corners.B, [0, 75], 'a drag moves the corner');
  await undoButton();
  assert.deepEqual((await board(P)).corners.B, [0, 45], 'one Undo takes back the whole drag');
  // A drag that starts away from the corners turns the ball and moves nothing.
  const view0 = await viewOf(), from = await spot([-45, 30]);
  await dragAt(from, [from[0] - 60, from[1]]);
  const view1 = await viewOf();
  assert.notDeepEqual(view1, view0, 'a drag on the ball turns it');
  assert.ok(view1[1] !== view0[1], 'a sideways drag turns the ball round its axis');
  assert.deepEqual((await board(P)).corners.B, [0, 45], 'turning moves no corner');
  const same = (x, y) => Math.abs(((x - y) % 360 + 540) % 360 - 180) < 1e-6;
  await press('[data-focus="gl-turn-left"]');
  assert.ok(same((await viewOf())[1], view1[1] + 15), 'Turn left shows the ball 15° further west');
  assert.match(await focusClass(), /gl-turn/, 'focus stays on the turn button');
  await press('[data-focus="gl-turn-up"]');
  assert.ok(same((await viewOf())[0], view1[0] - 15), 'Turn up');
  // Keys: arrows move B one dot; Shift turns.
  await page.locator('[data-gl-ball]').focus();
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40);
  assert.deepEqual((await board(P)).corners.B, [0, 60], 'ArrowRight moves B one dot east');
  assert.match(await focusClass(), /gl-ball/, 'after a key move, focus is on the ball');
  const v2 = await viewOf();
  await page.keyboard.press('Shift+ArrowDown'); await page.waitForTimeout(40);
  assert.ok(same((await viewOf())[0], Math.min(90, v2[0] + 15)), 'Shift with an arrow turns the ball');
  assert.deepEqual((await board(P)).corners.B, [0, 60], 'and moves nothing');
  assert.match(await focusClass(), /gl-ball/);
  await shot('right-corners');
  // Hint: the idea first, then the marks, then Apply hint.
  await press('[data-action="restart"]');
  await press('[data-action="hint"]');
  assert.equal(await page.locator('.hint-card p').innerText(), pack.puzzles.find(p => p.id === P).hints[0], 'the first hint is the idea');
  assert.equal(await page.locator('.gl-target, .gl-corner.hinted').count(), 0, 'no marks at the first level');
  await press('[data-action="hint"]');
  assert.equal(await page.locator('.gl-corner.hinted').count(), 1, 'the second level marks the corner');
  assert.equal(await page.locator('.gl-target').count(), 1, 'and its dot');
  assert.match(await page.locator('.hint-card p').innerText(), /^Move B /);
  await press('[data-action="hint"]');
  await press('[data-action="apply-hint"]');
  await done();

  // Puzzle 3: a set made, a wrong Can't refused and kept, a right Can't drawn.
  P = 'globe-03';
  await open(P); await fit('puzzle 3');
  assert.equal(await page.locator('.gl-cant').isDisabled(), true, 'Can’t waits for an attempt');
  assert.equal(await page.locator('.gl-record.pick').count(), 0);
  await tap([15, 60]);
  assert.equal(await page.locator('.gl-cant').isDisabled(), false, 'Can’t after a move');
  await press('.gl-cant');
  assert.equal(await page.locator('.gl-record.pick').count(), 2, 'every open set can be tapped');
  assert.equal(await page.locator('.gl-record.pick.hinted').count(), 0, 'nothing marks the right tap');
  await press('.gl-record.pick >> nth=0');
  assert.equal(await told(), 1, 'There is a way.');
  assert.equal(await page.locator('.gl-told').innerText(), 'There is a way.');
  assert.equal(await page.locator('.gl-cant').isDisabled(), true, 'no second claim until a corner moves');
  assert.match(await focusClass(), /gl-ball/, 'after a claim, focus is on the ball, not Can’t or a set');
  await shot('sets-refused');
  await undoButton();
  assert.equal(await told(), 0, 'Undo takes the words away');
  assert.equal(await page.locator('.gl-cant').isDisabled(), true, 'and keeps the refusal');
  assert.equal((await board(P)).refused, 0);
  await tap([0, 45]);
  assert.equal(await page.locator('.gl-record.made').count(), 1, 'the set is made');
  assert.deepEqual((await board(P)).built, [{record: 0, corners: {N: [90, 0], A: [0, 0], B: [0, 45]}}]);
  assert.equal(await page.locator('.gl-cant').isDisabled(), false, 'a move clears the refusal');
  await press('.gl-cant');
  assert.equal(await page.locator('.gl-record.pick').count(), 1);
  await press('.gl-record.pick');
  await done();
  assert.equal(await page.locator('.gl-argument .gl-fan').count(), 2, 'the argument: both sets of corners against a straight line');
  assert.equal(await page.locator('.gl-argument .gl-fan-extra').count(), 1, 'the triangle’s corners pass the line');
  await shot('sets-solved');

  // Puzzle 10: the busiest board (three sets, a right Can't and its argument) fits the screen.
  P = 'globe-10';
  await open(P);
  await tap([30, 30]);
  if (!(await board(P))?.tried) { await press('[data-focus="gl-card-C"]'); await tap([60, 30]); }
  assert.equal((await board(P)).tried, true);
  await press('.gl-cant');
  await press('.gl-record.pick >> nth=1');
  assert.deepEqual((await board(P)).cant, [1], 'a set adding up to 180° is claimed');
  assert.match(await focusClass(), /gl-ball/, 'after a right claim, focus is on the ball');
  assert.equal(await page.locator('.gl-argument').count(), 1);
  await fit('busiest');
  const busy = await page.locator('.gl-puzzle').boundingBox();
  if (phone) assert.ok(busy.height <= 667 - 16, `the busiest board fits a 375 × 667 screen (${busy.height.toFixed(0)} px)`);
  console.log(`Busiest board ${busy.width.toFixed(0)} × ${busy.height.toFixed(0)} px.`);
  await page.locator('.gl-puzzle').scrollIntoViewIfNeeded();
  await shot('busiest');
  await undoButton();
  assert.equal(await page.locator('.gl-argument').count(), 0, 'Undo takes the argument away');
  assert.deepEqual((await board(P)).cant, [1], 'and keeps the claim');

  // Puzzle 5: a fraction, made by Hint alone after a wrong move.
  P = 'globe-05';
  await open(P);
  await tap([15, 45]);
  for (let i = 0; i < 15 && !(await page.locator('#completion-heading').count()); i++) {
    await press('[data-action="hint"]');
    if (await page.locator('[data-action="apply-hint"]').count()) await press('[data-action="apply-hint"]');
  }
  await done();

  // The playground: lune pairs, counts, a corner behind the ball.
  P = 'globe-playground';
  await open(P); await fit('playground');
  assert.equal(await page.locator('[data-action="hint"]').count(), 0, 'no Hint in the playground');
  for (const x of ['A', 'B', 'C']) await press(`[data-focus="gl-pair-${x}"]`);
  assert.deepEqual((await board(P)).pairs, ['A', 'B', 'C']);
  assert.ok(await page.locator('.gl-count', {hasText: '3'}).count() >= 1, 'the triangle shows 3');
  assert.ok(await page.locator('.gl-count', {hasText: '1'}).count() >= 1, 'other regions show 1');
  await shot('playground');
  // Turn until C is behind the ball, choose A, and tap where C would be: the tap goes to a front dot.
  await press('[data-focus="gl-card-A"]');
  for (let i = 0; i < 12; i++) await press('[data-focus="gl-turn-left"]');
  const [cx, cy, cz] = await spot([0, 90]);
  assert.ok(cz < 0, 'C is behind the ball');
  await tapAt([cx, cy]);
  const after = await board(P);
  assert.deepEqual(after.corners.C, [0, 90], 'the corner behind the ball is not moved');
  assert.notDeepEqual(after.corners.A, [90, 0], 'the tap went to a front dot, for A');
  const [, , az] = await spot(after.corners.A);
  assert.ok(az > 0, 'A is now on a dot at the front');
  await dragAt(await spot(after.corners.A), await spot([after.corners.A[0], (after.corners.A[1] + 15) % 360]));
  assert.notDeepEqual((await board(P)).corners.A, after.corners.A, 'a corner drags in the playground');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Ball triangles browser smoke passed${phone ? ' (phone)' : ''}.`);
} finally {
  await browser.close();
}
