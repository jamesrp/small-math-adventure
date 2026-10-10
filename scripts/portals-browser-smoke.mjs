// Plays Portal rooms through the real interface on the shared portal board:
// steps by tapping squares in the room and in the unrolled view, the arrow
// pad, arrow keys, Enter on a square, finger slides in both views, Undo, a
// walk to stars through other copies and back, beads and Can't, every square
// with Found already, There is another and That's all, the two-pawn trade
// with its gap, corner and erase discs with the slide budget, hints marked on
// the board and applied, a wall in the plain room and the tube, and the
// playground's rooms; no page overflow at phone width. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/portals/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/portals/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.pt-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const room = s => page.locator(`.pb-room [data-pb-point="${s},0,0"]`);
const plane = (u, v) => page.locator(`.pb-plane [data-pb-point="${u},${v}"]`);
const arrow = d => page.locator(`.pb-arrow[data-pb-dir="${d}"]`);
const vertex = k => page.locator(`.pb-vertex[data-pb-vertex="${k}"]`);
const button = name => page.getByRole('button', {name, exact: true});
const told = () => page.locator('.pt-told').innerText();
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
// Taps land at a control's centre through real hit-testing.
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const arrows = async word => { for (const d of word) await tap(arrow(d)); };
// A slide is a touch drag on a phone and a mouse drag on a desktop; the board
// finds squares by position.
let cdp = null;
async function slide(locators) {
  const points = [];
  for (const l of locators) points.push(await center(l));
  if (!phone) {
    await page.mouse.move(...points[0]); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(...p, {steps: 8});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', points[0]);
  for (let k = 1; k < points.length; k++) for (let s = 1; s <= 8; s++) {
    const [x1, y1] = points[k - 1], [x2, y2] = points[k];
    await touch('touchMove', [x1 + (x2 - x1) * s / 8, y1 + (y2 - y1) * s / 8]);
  }
  await touch('touchEnd', points.at(-1));
}
const undo = () => page.locator('[data-action="undo"]').click();
// Hint three times, then Apply hint until the puzzle is solved.
async function hintsFinish() {
  for (let i = 0; i < 3; i++) await button('Hint').click();
  let n = 0;
  while (!await page.locator('#completion-heading').count() && n++ < 60) await button('Apply hint').click();
  await done();
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Portal QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: taps in both views, the pad, keys, Undo, a slide on the unrolled view.
  const A = 'portals-01';
  await open(A); await fit('walk');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no objective: the star shows the task');
  assert.equal(await page.locator('.pb-room .pb-mark').count(), 4, 'two pairs of matching marks');
  assert.equal(await page.locator('.pb-room .pb-edge.seam.sun').count(), 6, 'the left and right seams in the colour of their marks');
  await tap(room('E'));
  assert.equal((await board(A)).trip, 'R', 'a tap on a square next to the pawn in the room');
  await tap(plane(3, 1));
  assert.equal((await board(A)).trip, 'RR', 'a tap on the next square in the unrolled view, across the portal');
  assert.equal(await page.locator('.pb-room .pb-trail-portal').count(), 2, 'the room’s trail breaks at the portal');
  await tap(arrow('R'));
  assert.equal((await board(A)).trip, 'RRR', 'an arrow');
  await arrow('U').focus(); await page.keyboard.press('ArrowUp');
  assert.equal((await board(A)).trip, 'RRRU', 'an arrow key');
  await undo();
  assert.equal((await board(A)).trip, 'RRR', 'Undo');
  await room('B').focus(); await page.keyboard.press('Enter');
  assert.equal((await board(A)).trip, 'RRRU', 'Enter on a square');
  await tap(room('E'));
  assert.equal((await board(A)).trip, 'RRRU', 'a square that is not next to the pawn does nothing');
  assert.equal(await room('E').getAttribute('role'), null, 'and is not a control');
  for (let i = 0; i < 2; i++) await button('Hint').click();
  assert.equal(await page.locator('.pb-arrow.hinted').count(), 1, 'the second hint marks an arrow');
  await shot('walk-hint');
  await slide([plane(4, 2), plane(4, 3), plane(4, 4)]);
  await done(); await fit('walk solved');
  assert.equal((await board(A)).trip, 'RRRUUU', 'a slide steps square by square');
  await shot('walk-solved');

  // Puzzle 5: a slide in the room, then home through two other copies.
  const B = 'portals-05';
  await open(B);
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Collect both stars, then come back to the ringed H.');
  await slide([room('H'), room('B'), room('A')]);
  assert.equal((await board(B)).trip, 'UL', 'a slide in the room');
  await undo(); await undo();
  await arrows('RRRUUU');
  assert.equal(await page.locator('.pt-star.got').count(), 1, 'one star');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'on H, but not in the first copy');
  await shot('stars-away');
  await arrow('L').focus();
  for (const k of ['ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowDown']) await page.keyboard.press(k);
  await done();

  // Puzzle 2: every square in two steps.
  const C = 'portals-02';
  await open(C); await fit('every');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Find every square exactly two steps away.');
  assert.equal(await page.locator('.pt-beads i').count(), 2);
  await tap(room('E')); await tap(room('D'));
  assert.deepEqual((await board(C)).found, ['D'], 'two steps right ring D through the portal');
  assert.equal((await board(C)).trip, '', 'the pawn goes home');
  assert.equal(await page.locator('.pt-found').count(), 1, 'a ring on D');
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a new ring');
  await arrows('RR');
  assert.equal(await told(), 'Found already.');
  await arrows('LU');
  assert.deepEqual((await board(C)).found, ['D', 'A']);
  assert.doesNotMatch(await page.locator('.pt-puzzle').innerText(), /\b\d+ (found|of)\b/, 'no count');
  await hintsFinish();
  await shot('every-solved');

  // Puzzle 7: walls, no unrolled view.
  await open('portals-07');
  assert.equal(await page.locator('.pb-plane').count(), 0, 'no unrolled view without portals');
  await tap(arrow('R'));
  assert.equal(await arrow('R').isDisabled(), true, 'a wall');

  // Puzzle 3: beads and Can't.
  const D = 'portals-03';
  await open(D);
  await button('Can’t').click();
  assert.equal(await told(), 'There is a way.');
  assert.equal(await button('Can’t').isDisabled(), true);
  await tap(arrow('U'));
  assert.equal(await page.locator('.pt-beads i.on').count(), 1, 'a bead per step');
  assert.equal(await page.locator('.pt-told').count(), 0, 'a step clears it');
  await arrows('UU');
  await done();

  // Puzzle 12: Can't, and the checkerboard after it.
  await open('portals-12');
  await button('Can’t').click();
  await done();
  assert.ok(await page.locator('.pb-point.dark').count() > 0, 'the checkerboard shows');
  await shot('checkerboard');

  // Puzzle 4: the trade can't happen.
  const E = 'portals-04';
  await open(E); await fit('trade');
  await tap(arrow('R'));
  assert.equal((await board(E)).trip, 'R');
  assert.equal(await page.locator('.pt-pawn').count(), 4, 'two pawns in each view');
  assert.equal(await page.locator('.pt-gap').count(), 1, 'the gap between them');
  await shot('trade');
  await button('Can’t').click();
  await done();

  // Puzzle 9: a tap next to the blue pawn moves both.
  const F = 'portals-09';
  await open(F);
  await tap(room('O'));
  assert.equal((await board(F)).trip, 'L', 'a tap beside the second pawn');
  await arrow('L').focus();
  for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowUp']) await page.keyboard.press(k);
  await done();

  // Puzzle 8: corner and erase discs.
  const G = 'portals-08';
  await open(G); await fit('shrink');
  assert.equal(await arrow('R').count(), 0, 'no pad on a trip to change');
  for (const k of [6, 5, 4]) await tap(vertex(k));
  assert.equal((await board(G)).trip, 'RRRLUUULLDDD', 'three slides');
  assert.ok(await page.locator('.pb-vertex.cancel[data-pb-vertex="3"]').count(), 'an erase disc where a step goes straight back');
  await vertex(3).focus(); await page.keyboard.press('Enter');
  assert.equal((await board(G)).trip, 'RRUUULLDDD', 'Enter erases the pair');
  await shot('shrink');
  await undo();
  assert.equal((await board(G)).trip, 'RRRLUUULLDDD');
  await hintsFinish();
  assert.equal((await board(G)).trip, '');

  // Puzzle 10: the slide budget, hints on the board.
  const H = 'portals-10';
  await open(H); await fit('turn');
  await tap(vertex(3)); await tap(vertex(3));
  assert.deepEqual([(await board(H)).trip, (await board(H)).slides], ['RRRUUU', 2], 'a slide there and back uses two');
  assert.equal(await page.locator('.pt-beads i.on').count(), 2);
  await button('Hint').click(); await button('Hint').click();
  assert.match(await page.locator('.hint-card').innerText(), /Undo/, 'too few slides left');
  await page.locator('[data-action="rescue"]').click();
  assert.deepEqual([(await board(H)).trip, (await board(H)).slides], ['RRURUU', 1], 'the rescue goes back to where eight slides are enough');
  for (const k of [2, 1, 4, 3, 2, 5, 4, 3]) await tap(vertex(k));
  await done();
  assert.equal((await board(H)).trip, 'UUURRR', 'the guide’s nine slides');
  await shot('turn-solved');

  // Puzzle 11: Can't, from the finishing copy.
  await open('portals-11');
  await button('Can’t').click();
  await done();

  // The playground: rooms, a wall at the tube's top.
  const P = 'portals-playground';
  await open(P); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await button('Tube').click();
  assert.equal((await board(P)).room, 'tube3');
  await tap(arrow('U'));
  assert.equal(await arrow('U').isDisabled(), true, 'the tube’s top is a wall');
  await arrows('RRRR');
  assert.equal((await board(P)).trip, 'URRRR', 'round and round the tube');
  await shot('tube');
  await button('Big portal room').click();
  assert.deepEqual(await board(P), {room: 'torus4', trip: ''});
  await arrows('RRRR');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'never solved');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
