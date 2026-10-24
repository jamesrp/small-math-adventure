// Plays Three-arm lines through the real interface: taps that move a
// junction, a drag that moves it (one Undo; on a phone the line rides above
// the finger), nothing judged until Check, a refused Check kept across Undo
// while its words go, taps on a circle's letter that go to the circle, Can't
// waiting for an attempt, two circles tapped (a refused pair and a right one,
// with the fans drawn), the ray of junctions marked by a slide off the board
// and judged by That's all (a refusal kept across Undo), Keep and Drop, keys,
// Hint (the idea, then the ring, then Apply hint), focus after moves, How to
// play, and the playground's live shared part. No page overflow anywhere,
// including the busiest board. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1
// for a 375 × 667 phone with touch); TEST_SHOTS names a folder for
// screenshots (default test-results/tropical/).
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.TEST_SHOTS ? pathToFileURL(`${process.env.TEST_SHOTS.replace(/\/$/, '')}/`) : new URL('../test-results/tropical/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.tr-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const solvedNow = async () => (await page.locator('#completion-heading').count()) > 0;
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const H = ([x, y]) => [2 * x, 2 * y];
// The screen point of a board point given in squares (it may be past the frame).
const spot = z => page.evaluate(([u, v]) => {
  const svg = document.querySelector('[data-tr-board]'), m = svg.getScreenCTM(), pt = svg.createSVGPoint();
  pt.x = 5 * u; pt.y = -5 * v;
  const r = pt.matrixTransform(m);
  return [r.x, r.y];
}, H(z));
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(40); };
const tap = async z => tapAt(await spot(z));
const centre = async selector => { const r = await page.locator(selector).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
const press = async name => { await page.locator(`.tr-puzzle button:has-text("${name}")`).click(); await page.waitForTimeout(40); };
const button = name => page.locator(`.tr-puzzle button:has-text("${name}")`);
const told = async () => ((await page.locator('.tr-told').count()) ? page.locator('.tr-told').innerText() : '');
const undoButton = async () => { await page.locator('[data-action="undo"]').click(); await page.waitForTimeout(40); };
// The board, its line of words and its buttons fit on the first screen.
const onScreen = async label => assert.ok(await page.evaluate(() => [...document.querySelectorAll('[data-tr-board], .tr-puzzle .tr-told, .tr-puzzle .tr-bar')].every(e => e.getBoundingClientRect().bottom + scrollY <= innerHeight + 0.5)), `${label}: board, words and buttons on the first screen`);
const focusedClass = () => page.evaluate(() => { const e = document.activeElement; return String(e?.className?.baseVal ?? e?.className ?? ''); });
let cdp = null;
// A drag between two board points (in squares). On a touch screen a dragged
// junction rides above the finger, so the finger goes `lift` squares below.
async function drag(from, to, {lift = 0, check} = {}) {
  const a = await spot(from), b = await spot([to[0], to[1] - (phone ? lift : 0)]);
  if (!phone) {
    await page.mouse.move(...a); await page.mouse.down();
    await page.mouse.move(...b, {steps: 12});
    if (check) await check(b);
    await page.mouse.up();
    await page.waitForTimeout(40);
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let s = 1; s <= 12; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 12, a[1] + (b[1] - a[1]) * s / 12]);
  if (check) await check(b);
  await touch('touchEnd', b);
  await page.waitForTimeout(40);
}
const LIFT = 1.2; // squares: the mechanic's 2.4 half-steps (at least 36 px)

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Tropical QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const family = page.locator('[data-view-key="family-tropical"]');
  assert.match(await family.innerText(), /Three-arm lines/);
  assert.match(await family.locator('.family-ink-symbol').innerText(), /∟/);

  // Puzzle 1: meet in a point. Taps, a drag, Undo, a refused Check kept across Undo, a solve.
  let P = 'tropical-01';
  await open(P); await fit('meet');
  const sizes = await page.evaluate(() => { const svg = document.querySelector('[data-tr-board]'); return {width: svg.getBoundingClientRect().width, square: svg.getScreenCTM().a * 10}; });
  console.log(`Board ${sizes.width.toFixed(0)} px, a square ${sizes.square.toFixed(1)} px.`);
  assert.ok(sizes.width <= 381, 'a compact board');
  assert.equal(await page.locator('[data-tr-board]').evaluate(e => getComputedStyle(e).webkitTapHighlightColor), 'rgba(0, 0, 0, 0)', 'no tap flash');
  assert.match(await page.locator('body').innerText(), /Make the two lines share only the ringed point\./);
  await tap([2, 2]);
  assert.deepEqual((await board(P)).at, H([2, 2]), 'a tap moves B');
  // The board takes focus from a click or a tap, so arrow keys move B next.
  assert.match(await focusedClass(), /tr-board/, `after a ${phone ? 'tap' : 'click'}, focus is on the board`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40);
  assert.deepEqual((await board(P)).at, H([3, 2]), 'ArrowRight after a tap moves B');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(40);
  assert.equal(await page.locator('.tr-shared, .tr-ring.good, .tr-ring.bad').count(), 0, 'nothing judged while B moves');
  // A tap a little off a crossing goes to the nearest one.
  const [x0, y0] = await spot([3, 2]);
  await tapAt([x0 + sizes.square * 0.3, y0 - sizes.square * 0.25]);
  assert.deepEqual((await board(P)).at, H([3, 2]), 'a tap near a crossing goes to it');
  await drag([3, 2], [6, 4], {lift: LIFT, check: async finger => {
    // Mid-drag the line is drawn where it will land, above the finger on a phone.
    const r = await page.locator('.tr-mover .tr-junction').boundingBox();
    const at = await spot([6, 4]);
    assert.ok(Math.abs(r.x + r.width / 2 - at[0]) < 2 && Math.abs(r.y + r.height / 2 - at[1]) < 2, 'the dragged junction shows where it lands');
    if (phone) assert.ok(r.y + r.height < finger[1] - 8, 'the junction is clear above the finger');
    assert.equal(await page.locator('.tr-b-name').count(), 0, 'B’s letter steps aside while dragging');
  }});
  assert.deepEqual((await board(P)).at, H([6, 4]), 'a drag moves B');
  await undoButton();
  assert.deepEqual((await board(P)).at, H([3, 2]), 'Undo takes back the whole drag');
  await tap([6, 4]);
  await press('Check');
  assert.equal(await told(), 'They share a whole stretch.');
  assert.equal(await page.locator('.tr-shared.bad').count(), 1, 'Check draws what they share');
  assert.equal(await button('Check').isDisabled(), true, 'Check waits for a change');
  assert.match(await focusedClass(), /tr-board/, 'after a refused Check, focus is on the board');
  await shot('meet-refused');
  await undoButton();
  assert.equal(await told(), '', 'Undo takes back the words');
  assert.equal(await button('Check').isDisabled(), true, 'but not the refusal');
  assert.equal((await board(P)).refused, true);
  await tap([6, 1]);
  assert.equal(await button('Check').isDisabled(), false, 'a move allows Check again');
  await press('Check'); await done();
  assert.equal(await page.locator('.tr-ring.good').count(), 1, 'the shared point is ringed');
  await shot('meet-solved');

  // Puzzle 2: share the stretch right from A, with the keyboard (around A, not through it).
  P = 'tropical-02';
  await open(P);
  await page.locator('[data-tr-board]').focus();
  for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowUp']) await page.keyboard.press(k);
  await page.waitForTimeout(40);
  assert.deepEqual((await board(P)).at, H([5, 4]), 'arrow keys move B a square at a time');
  assert.match(await focusedClass(), /tr-board/, 'focus stays on the board after a key move');
  for (const k of ['ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowUp']) await page.keyboard.press(k);
  await page.waitForTimeout(40);
  assert.match(await page.locator('.tr-puzzle [role=status]').textContent(), /B at 3 across, 4 up\./);
  await button('Check').focus(); await page.keyboard.press('Enter'); await done();

  // Puzzle 12: three circles. A tap on a letter goes to its circle; Can't after an attempt.
  P = 'tropical-12';
  await open(P); await fit('three circles'); await onScreen('three circles');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for an attempt');
  await tap([5, 4]);
  assert.match(await focusedClass(), /tr-board/, `after a ${phone ? 'tap' : 'click'} on puzzle 12, focus is on the board`);
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(40);
  assert.deepEqual((await board(P)).at, H([5, 5]), 'ArrowUp moves the junction, not the page');
  await tapAt(await centre('.tr-target[data-target="2"] .tr-name'));
  assert.deepEqual((await board(P)).at, H([6, 6]), 'a tap on R’s letter puts the junction on R');
  await tap([7, 5]);
  assert.deepEqual((await board(P)).at, H([7, 5]), 'a tap on Q’s circle puts the junction on Q');
  assert.equal(await button('Can’t').isDisabled(), false);
  await press('Check');
  assert.match(await told(), /^The line misses (P|R|P and R)\.$/);
  // Can't pressed straight after a refused Check asks for its taps; pressed again, the refusal is back.
  await press('Can’t');
  assert.equal(await told(), 'Tap two circles.', 'Can’t asks for two circles over a refused Check');
  // Can't is a data-toggle slot: a press within 350 ms of the last is taken
  // for a double tap and dropped (dist/main.js), so the suite waits.
  await page.waitForTimeout(400);
  await press('Can’t');
  assert.match(await told(), /^The line misses (P|R|P and R)\.$/);
  // Can't: every circle takes a tap; a tap away from the circles moves the junction.
  await tap([5, 5]);
  await press('Can’t');
  assert.equal(await button('Can’t').getAttribute('aria-pressed'), 'true');
  assert.equal(await told(), 'Tap two circles.');
  assert.equal(await page.locator('.tr-pick').count(), 3, 'all three circles can be tapped');
  assert.equal(await page.locator('.tr-hint, .tr-pick.picked').count(), 0, 'none is marked');
  await onScreen('Can’t pressed');
  await tapAt(await centre('.tr-target[data-target="1"] .tr-name'));
  assert.equal(await page.locator('.tr-pick.picked').count(), 1, 'a tap on Q’s letter picks Q');
  await tap([6, 6]);
  const refusedClaim = await board(P);
  assert.deepEqual(refusedClaim.said, [1, 2], 'Q and R: refused');
  assert.deepEqual(refusedClaim.claimed, [[1, 2]], 'that pair is refused at this place');
  assert.equal(await told(), 'The line misses R.');
  assert.equal(await page.locator('.tr-pick').count(), 0, 'the taps clear');
  assert.equal(await button('Can’t').isDisabled(), false, 'another pair can still be claimed here');
  assert.notEqual(await page.evaluate(() => document.activeElement?.classList?.contains('tr-cant')), true, 'focus is not on Can’t');
  await onScreen('a refused claim');
  await shot('three-circles-refused');
  // The same pair again only says the same thing.
  await press('Can’t'); await tap([7, 5]); await tap([6, 6]);
  assert.equal(await told(), 'The line misses R.');
  assert.deepEqual((await board(P)).claimed, [[1, 2]]);
  await undoButton();
  assert.equal(await told(), '', 'Undo takes back the words');
  assert.deepEqual((await board(P)).claimed, [[1, 2]], 'and keeps the refused pair');
  // A move lets go of Can't and its taps; then the right pair, by keyboard
  // for one of them.
  await tap([5, 4]);
  await press('Can’t');
  await tapAt(await centre('.tr-target[data-target="0"] .tr-name'));
  assert.equal(await page.locator('.tr-pick.picked').count(), 1);
  await tap([5, 5]);
  assert.deepEqual((await board(P)).at, H([5, 5]), 'a tap away from the circles moves the junction');
  assert.equal(await button('Can’t').getAttribute('aria-pressed'), 'false', 'and lets go of Can’t');
  assert.equal(await page.locator('.tr-pick').count(), 0);
  await press('Can’t');
  await page.locator('.tr-pick[data-pick="0"]').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(40);
  assert.equal(await page.locator('.tr-pick[aria-label="P, chosen"]').count(), 1, 'Enter picks P');
  await tap([7, 5]);
  await done();
  assert.equal(await page.locator('g.tr-fan.tr-fan-on').count(), 2, 'the two fans are drawn');
  assert.equal(await page.locator('.tr-ring.bad').count(), 1, 'R is ringed');
  await fit('the busiest board');
  await shot('three-circles-certificate');

  // Puzzle 11: Can't where a line exists is refused.
  P = 'tropical-11';
  await open(P);
  await tap([5, 5]); await press('Can’t'); await tap([2, 2]); await tap([5, 8]);
  assert.equal(await told(), 'There is a way.');
  assert.equal(await solvedNow(), false);
  await press('Check'); await done();

  // Puzzle 7: the ray of junctions. Keep, Drop, That's all refused and kept, a slide off the board.
  P = 'tropical-07';
  await open(P); await fit('every');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a mark');
  await tap([2, 4]); await press('Keep');
  assert.deepEqual((await board(P)).marks, [{from: H([2, 4])}]);
  assert.equal(await button('Keep').isDisabled(), true);
  await press('Drop');
  assert.deepEqual((await board(P)).marks, []);
  // A slide marks a stretch; That's all says there are more.
  await drag([2, 4], [0, 4]);
  assert.deepEqual((await board(P)).marks, [{from: H([2, 4]), to: H([0, 4])}], 'a slide marks the stretch');
  assert.deepEqual((await board(P)).at, H([2, 4]), 'a slide does not move the junction');
  await press('That’s all');
  assert.equal(await told(), 'There are more.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a change');
  await undoButton();
  assert.equal(await told(), '');
  assert.equal(await button('That’s all').isDisabled(), true, 'Undo keeps the refusal');
  await shot('every-stretch');
  // A slide on past the edge keeps the mark going; this one starts on P's
  // letter, up and to the left of P, and so starts at P.
  await drag([1.45, 4.475], [-1.2, 4.1]);
  const marks = (await board(P)).marks;
  assert.deepEqual(marks.at(-1), {from: H([2, 4]), dir: 'W'}, 'a slide off the board marks a ray');
  assert.equal(await button('That’s all').isDisabled(), false);
  await press('That’s all'); await done();
  await shot('every-solved');

  // Puzzle 8: a slide off the bottom edge marks the ray down; the buttons stay on the first screen.
  P = 'tropical-08';
  await open(P); await fit('upright'); await onScreen('upright');
  await drag([3, 2], [3, 0]);
  await press('That’s all');
  assert.equal(await told(), 'There are more.');
  await onScreen('upright, refused');
  await drag([3, 2], [3, -1.2]);
  assert.deepEqual((await board(P)).marks.at(-1), {from: H([3, 2]), dir: 'S'}, 'a slide off the bottom edge marks the ray down');
  await press('That’s all'); await done();

  // Puzzle 9: half-steps and a slant; a wrong stretch, Shift and an arrow key.
  P = 'tropical-09';
  await open(P); await fit('slant');
  await drag([2, 2], [5, 5]);
  assert.deepEqual((await board(P)).marks, [{from: H([2, 2]), to: H([5, 5])}]);
  await press('That’s all');
  assert.equal(await told(), 'This one doesn’t work.');
  assert.equal(await page.locator('.tr-ring.bad').count(), 1, 'a circle its line misses is ringed');
  await shot('slant-refused');
  await tap([5, 5]);
  assert.equal(await button('Drop').isDisabled(), false, 'the junction is on the mark');
  await press('Drop');
  await page.locator('[data-tr-board]').focus();
  await page.keyboard.press('Shift+PageUp'); await page.waitForTimeout(40);
  assert.deepEqual((await board(P)).marks, [{from: H([5, 5]), dir: 'NE'}], 'Shift and Page Up mark the ray up and to the right');
  await press('That’s all'); await done();

  // Puzzle 3: Hint gives the idea, then the ring, then Apply hint.
  P = 'tropical-03';
  await open(P);
  await page.locator('[data-action="hint"]').click(); await page.waitForTimeout(40);
  assert.match(await page.locator('.hint-card').innerText(), /Try P on each of the three arms/);
  await tap([4, 4]);
  assert.equal(await page.locator('.tr-hint').count(), 0, 'no ring at the first level');
  await page.locator('[data-action="hint"]').click(); await page.waitForTimeout(40);
  assert.equal(await page.locator('.tr-ring.tr-hint').count(), 1, 'the ring marks the place');
  assert.match(await page.locator('.tr-puzzle [role=status]').textContent(), /Hint: the junction to 2 across, 2 up\./);
  await page.locator('[data-action="hint"]').click(); await page.waitForTimeout(40);
  await page.locator('[data-action="apply-hint"]').click(); await page.waitForTimeout(40);
  await page.locator('[data-action="apply-hint"]').click();
  await done();

  // How to play opens with the mathematics and shows the pictures.
  P = 'tropical-10';
  await open(P); await fit('corner');
  await page.locator('[data-action="demo"]').first().click();
  const dialog = page.locator('dialog.modal');
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /A line is three arms from one junction/);
  assert.equal(await dialog.locator('.tr-picture').count(), 2);
  assert.equal(await dialog.evaluate(d => d.scrollWidth <= d.clientWidth + 1), true, 'the pictures fit');
  await shot('how-to-play');
  await page.keyboard.press('Escape');
  // Half-square boards draw junctions, rings and names smaller: the ring stops
  // short of B's junction half a square below it, and B's name, which would sit
  // on the ring, turns to down and to the right.
  await tap([0.5, 0]);
  assert.deepEqual((await board(P)).at, H([0.5, 0]), 'a tap in the corner lands on its half square');
  const corner = await page.evaluate(() => {
    const box = e => e.getBoundingClientRect(), ring = box(document.querySelector('.tr-ring.tr-goal')), junction = box(document.querySelector('.tr-mover .tr-junction')), name = box(document.querySelector('.tr-b-name'));
    return {ring, junction, name, gap: box(document.querySelector('[data-tr-board]')).width};
  });
  assert.ok(corner.junction.top >= corner.ring.bottom - 2, `the ring and B’s junction do not overlap (${corner.ring.bottom.toFixed(1)} and ${corner.junction.top.toFixed(1)})`);
  assert.ok(corner.name.left >= corner.junction.left && corner.name.top >= corner.junction.top, 'B’s name sits down and to the right beside the ring');
  await shot('corner-names');
  // Half a square left of the ring.
  await tap([0, 0.5]); await press('Check'); await done();
  await shot('corner-solved');

  // The playground: choose with a tap, move with a tap or a drag, the shared part live.
  P = 'tropical-playground';
  await open(P); await fit('playground');
  assert.equal(await page.locator('[data-action="hint"]').count(), 0, 'no Hint');
  assert.equal(await page.locator('.tr-shared-live .tr-ring').count(), 1, 'they share one point');
  await tap([1, 4]);
  assert.match(await page.locator('.tr-puzzle [role=status]').textContent(), /A is chosen\./, 'a tap on A chooses it');
  await tap([1, 2]);
  assert.deepEqual((await board(P)).a, H([1, 2]), 'a tap moves the chosen line');
  await drag([4, 2], [6, 2], {lift: LIFT, check: async () => {
    assert.equal(await page.locator('.tr-shared-live line.tr-thick').count(), 1, 'the shared stretch is drawn while dragging');
  }});
  assert.deepEqual((await board(P)).b, H([6, 2]), 'a drag moves B');
  await shot('playground');

  // A tablet held upright: the board grows to 560 px, the half squares of
  // puzzle 10 are at least 36 px apart, and the Undo row stays on the first
  // screen; a desktop keeps its 380 px (checked at the top of this suite).
  if (!phone) {
    await page.setViewportSize({width: 820, height: 1180});
    P = 'tropical-10';
    await open(P);
    const tablet = await page.evaluate(() => { const svg = document.querySelector('[data-tr-board]'); return {width: svg.getBoundingClientRect().width, half: svg.getScreenCTM().a * 5, tools: document.querySelector('.play-sidebar .tool-grid').getBoundingClientRect().bottom}; });
    console.log(`Tablet: board ${tablet.width.toFixed(0)} px, half squares ${tablet.half.toFixed(1)} px apart.`);
    assert.ok(tablet.width > 555 && tablet.width <= 561, `the board grows on a tablet (${tablet.width})`);
    assert.ok(tablet.half >= 36, 'half squares 36 px apart');
    assert.ok(tablet.tools <= 1180, 'the Undo row is on the first screen');
    await onScreen('tablet');
    await tap([0.5, 0]); await press('Check'); await done();
    await shot('tablet-corner');
    await open('tropical-01');
    await page.setViewportSize({width: 1180, height: 820}); await page.waitForTimeout(200);
    const turned = await page.evaluate(() => ({width: document.querySelector('[data-tr-board]').getBoundingClientRect().width, tools: document.querySelector('.play-sidebar .tool-grid').getBoundingClientRect().bottom}));
    assert.ok(turned.width >= 379 && turned.tools <= 820, `turned sideways, the board is measured again and keeps the Undo row in view (${turned.width}, ${turned.tools})`);
    await page.setViewportSize({width: 1024, height: 768});
  }

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Three-arm lines browser smoke passed${phone ? ' (phone)' : ''}.`);
} finally {
  await browser.close();
}
