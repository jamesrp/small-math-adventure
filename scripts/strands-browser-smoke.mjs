// Plays Strands through the real interface on the shared portal board: bead
// slides in the cylinder and in the unrolled view (across the seam and past
// the other strand's spot), arrow keys on a focused bead, Done and Back (and a
// quick double tap on Done), the cylinder's width side by side, a
// claim sent with crossings to spare, Undo keeping it, hints up to the
// fewest, copies of red tapped and untapped (contested taps between two
// copies go to the nearer), a claim with no copies refused, Undo taking it
// back with the move before it and the same claim refused again, then the
// right one; hints marked on the board and applied; three ends chosen
// and dropped on a B, dragged along the rim and moved by keys (contested
// taps between ends on one B go to the nearer); Can't without the attempt,
// a wrong strand (each taken back by Undo with the move before it and
// refused again), the strand in the middle and its gaps; where focus goes
// after a move or a claim; the feedback line in sight on a phone; the
// playground's twists; no page overflow. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// with touch). Screenshots go in test-results/strands/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1280, height: 860}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/strands/', import.meta.url);
// A full-page screenshot drops Chromium's touch emulation ((pointer:coarse)
// then answers false): on a phone it is turned back on, on a kept session.
const shot = async name => {
  await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
  if (phone) { cdp ||= await context.newCDPSession(page); await cdp.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 1}); }
};
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.st-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const button = name => page.getByRole('button', {name, exact: true});
const told = () => page.locator('.st-told').innerText();
const active = selector => page.evaluate(s => document.activeElement?.matches(s) ?? false, selector);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
// A point of a view in its own drawing units (x right, y = −row), on screen.
const at = (view, x, y) => page.evaluate(([view, x, y]) => {
  const svg = document.querySelector(view === 'room' ? '.st-room' : '.st-lift'), m = svg.getScreenCTM();
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
}, [view, x, y]);
const roomBead = (strand, row) => page.locator(`.st-room [data-st-bead="${strand},${row}"][role="button"]`);
const liftBead = (strand, row) => page.locator(`.st-lift [data-st-bead="${strand},${row}"]`);
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async locator => tapAt(await center(locator));
// A slide is a touch drag on a phone and a mouse drag on a desktop.
let cdp = null;
async function slide(points) {
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
// Done, Can't and Back are one slot: a press within 350 ms of the last is
// taken for a double tap and dropped (data-toggle, dist/main.js), so the suite
// leaves 400 ms between them, as a child's separate presses would.
let lastSlot = -Infinity;
const sinceSlot = async ms => { const wait = lastSlot + ms - Date.now(); if (wait > 0) await page.waitForTimeout(wait); };
const slot = async name => { await sinceSlot(400); await button(name).click(); lastSlot = Date.now(); };
async function hintsFinish() {
  for (let i = 0; i < 3; i++) await button('Hint').click();
  let n = 0;
  while (!await page.locator('#completion-heading').count() && n++ < 60) await button('Apply hint').click();
  await done();
}
// The copies of the cylinder's columns: column c of the room.
const roomPoint = (c, row) => at('room', c, -row);

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Strands QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // No crossings needs no empty certificate dialog: Done completes directly.
  await open('strands-01');
  // On a phone the larger unrolled view of puzzle 1 is held to 168 px tall, so
  // the cylinder below it ends on a 390 × 844 screen.
  if (phone) assert.ok((await page.locator('.st-lift').boundingBox()).height <= 169, 'the unrolled view is at most 168 px tall on a phone');
  for (let i = 0; i < 3; i++) await button('Hint').click();
  for (let n = 0; n < 20 && !(await page.locator('.hint-card').innerText()).includes('No crossings are left. Press Done.'); n++) await button('Apply hint').click();
  assert.ok((await page.locator('.hint-card').innerText()).includes('No crossings are left. Press Done.'));
  await slot('Done');
  await done();
  assert.equal(await page.getByRole('button', {name: 'That’s all', exact: true}).count(), 0, 'there is no empty-copy confirmation');
  assert.equal((await board('strands-01')).done, true);

  // Puzzle 4: windings 0 and 2.
  const U = 'strands-04';
  await open(U); await fit('untangle');
  // The cylinder is 230 px wide on a phone too, and keeps its own column side by side.
  { const w = (await page.locator('.st-room').boundingBox()).width;
    assert.ok(w >= 220, `the cylinder is ${Math.round(w)} px wide`); }
  await shot('untangle-start');
  const text = await page.evaluate(() => { const el = document.querySelector('.st-puzzle').cloneNode(true); el.querySelectorAll('.sr-only').forEach(n => n.remove()); return el.textContent; });
  assert.ok(!/\d/.test(text), 'no number on screen: no count, no budget');
  // Done starts a claim and Back leaves it; nothing is checked until That's all.
  await slot('Done');
  assert.equal(await told(), 'Tap each red copy that blue must cross, then press That’s all.');
  assert.equal(await active('.st-copy-hit'), true, 'after Done, focus lands on a copy of red');
  assert.equal(await page.locator('.st-room [data-st-bead][role="button"]').count(), 0, 'beads rest during the claim');
  assert.equal((await board(U)).told, null, 'Done alone checks nothing');
  await slot('Back');
  assert.equal(await page.locator('.st-told').count(), 0);
  // A quick double tap on Done opens the claim once: Back is drawn where Done
  // was, and the second tap would close it again (data-toggle, dist/main.js).
  await sinceSlot(400);
  { const p = await center(button('Done')); await tapAt(p); await page.waitForTimeout(90); await tapAt(p); lastSlot = Date.now(); }
  assert.equal(await button('Back').count(), 1, 'a double tap on Done leaves the claim open');
  await slot('Back');
  assert.equal(await button('Done').count(), 1, 'Back after a pause leaves it');
  // A claim with crossings to spare: told once, Done waits, Undo keeps it.
  await slot('Done'); await button('That’s all').click();
  assert.equal(await told(), 'There is a way with fewer.');
  assert.equal(await button('Done').isDisabled(), true);
  assert.equal(await active('.st-puzzle .st-button'), false, 'focus is not left on a claim button');
  if (phone) assert.ok(await page.locator('.st-told').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'the feedback line is in sight on a phone');
  await undo();
  assert.equal((await board(U)).told, 'fewer', 'Undo keeps the refusal');
  // Slide blue's fourth bead in the room from column 3 left, over red's spot, to column 1.
  assert.equal((await board(U)).s[1][3], 3);
  await slide([await center(roomBead(1, 4)), await roomPoint(2, 4), await roomPoint(1, 4)]);
  assert.equal((await board(U)).s[1][3], 1, 'a room slide jumps past red’s spot to the column the finger reached');
  assert.equal((await board(U)).told, null, 'a move clears the refusal');
  if (phone) {
    // On a touch screen the unrolled view's beads are pictures (13 px apart on
    // a phone): a slide there moves nothing, and the cylinder's beads are 40 px.
    assert.equal(await page.evaluate(() => matchMedia('(pointer:coarse)').matches), true, 'the phone run emulates touch');
    await slide([await at('plane', 2, -2), await at('plane', 3, -2), await at('plane', 4, -2)]);
    assert.equal((await board(U)).s[1][1], 2, 'a touch slide in the unrolled view moves no bead');
    const sizes = await page.locator('.st-room [data-st-bead][role="button"] .st-bead-hit').evaluateAll(els => els.map(el => el.getBoundingClientRect().width));
    assert.ok(Math.min(...sizes) >= 40, `cylinder beads take taps 40 px across (${Math.round(Math.min(...sizes))})`);
  } else {
    // A slide in the unrolled view past a copy of red's spot, and back: blue's second bead 2 → 4 → 2.
    await slide([await center(liftBead(1, 2)), await at('plane', 3, -2), await at('plane', 4, -2)]);
    assert.equal((await board(U)).s[1][1], 4, 'a slide in the unrolled view');
    await slide([await center(liftBead(1, 2)), await at('plane', 2, -2)]);
    assert.equal((await board(U)).s[1][1], 2);
  }
  // Keys on a focused bead: right, then left; up goes to the next bead.
  await roomBead(1, 1).focus(); await page.keyboard.press('ArrowRight');
  assert.equal((await board(U)).s[1][0], 0, 'an arrow key moves the focused bead');
  assert.equal(await active('[data-focus="st-bead-1-1"]'), true, 'focus stays on the bead');
  await page.keyboard.press('ArrowLeft');
  assert.equal((await board(U)).s[1][0], -1);
  await page.keyboard.press('ArrowUp');
  assert.equal(await active('[data-focus="st-bead-1-2"]'), true, 'up goes to the next bead');
  // A move answers in well under 100 ms, timed in the page.
  const keyMs = await page.evaluate(() => {
    const el = document.querySelector('[data-focus="st-bead-1-1"]');
    el.focus();
    const t = performance.now();
    el.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    return performance.now() - t;
  });
  assert.equal((await board(U)).s[1][0], 0);
  assert.ok(keyMs < 100, `a key move redraws in ${keyMs.toFixed(1)} ms`);
  await page.locator('[data-focus="st-bead-1-1"]').focus(); await page.keyboard.press('ArrowLeft');
  // Bead moves the hints name, up to the fewest; the claim itself is the child's.
  for (let i = 0; i < 3; i++) await button('Hint').click();
  for (let n = 0; n < 12 && !(await page.locator('.hint-card').innerText()).includes('That’s all'); n++) await button('Apply hint').click();
  assert.ok((await page.locator('.hint-card').innerText()).includes('That’s all'), 'the hints reach the fewest');
  assert.ok((await page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id].moves, [key, U])) >= 3, 'several moves to the fewest');
  await shot('untangle-fewest');
  await slot('Done');
  // Red itself: tapped and untapped. A claim with no copies is refused.
  const xr = (await board(U)).s[0][3];
  await tapAt(await at('plane', xr + 0.3, -4));
  assert.equal(await page.locator('[data-st-copy="0"][aria-pressed="true"]').count(), 1, 'a tap marks the copy');
  await page.waitForTimeout(750);
  await tapAt(await at('plane', xr + 0.3, -4));
  assert.equal(await page.locator('[data-st-copy][aria-pressed="true"]').count(), 0, 'a second tap unmarks it');
  await button('That’s all').click();
  assert.equal(await told(), 'Blue must cross some copy of red.');
  // The claim press draws nothing of its own once Undo keeps its refusal, so
  // one press takes it back with the bead move before it, and the refusal
  // goes with those strands. Back on them, the same claim is refused again.
  const fewest = (await board(U)).s;
  await undo();
  assert.notDeepEqual((await board(U)).s, fewest, 'Undo takes back the claim and the bead move before it');
  assert.equal((await board(U)).told, null);
  assert.equal(await page.locator('.st-told').count(), 0);
  await button('Apply hint').click();
  assert.deepEqual((await board(U)).s, fewest, 'the hint makes that move again');
  await slot('Done'); await button('That’s all').click();
  assert.equal(await told(), 'Blue must cross some copy of red.', 'Undo doesn’t escape a wrong claim');
  assert.equal(await button('Done').isDisabled(), true, 'the claim waits for a move');
  // A bead out and back, then the claim with the copy blue must cross:
  // a tap beside the copies goes to the nearer, here copy one, not two.
  await roomBead(0, 1).focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft');
  await slot('Done');
  await page.waitForTimeout(750);
  await tapAt(await at('plane', xr + 4 + .8, -4));
  assert.equal(await page.locator('[data-st-copy="1"][aria-pressed="true"]').count(), 1, 'the nearer copy is marked');
  await shot('untangle-claim');
  await button('That’s all').click();
  await done();
  await shot('untangle-solved');

  // Puzzle 7: hints on the board, then applied.
  await open('strands-07');
  const hintMs = await page.evaluate(() => { const t = performance.now(); document.querySelector('[data-action="hint"]').click(); return performance.now() - t; });
  assert.ok(hintMs < 100, `a hint answers in ${hintMs.toFixed(1)} ms`);
  await button('Hint').click();
  assert.equal(await page.locator('.st-bead.hinted').count() >= 1, true, 'the hinted bead is marked');
  assert.equal(await page.locator('.st-target').count() >= 1, true, 'and where it goes');
  await hintsFinish();

  // Puzzle 11: three ends to place.
  const D = 'strands-11';
  await open(D); await fit('design');
  await shot('design-start');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a move');
  // Three ends on one B: a tap nearer the right disc chooses green.
  const C = {a: 2, N: 4, M: 8};
  await tapAt(await at('plane', C.a + .9 - .2, -C.M - 1.1));
  assert.equal(await page.locator('.st-end-button.green[aria-pressed="true"]').count(), 1, 'the nearer disc is chosen');
  // Then a B: green goes there.
  await tapAt(await at('plane', C.a + 4 * C.N, -C.M));
  assert.deepEqual((await board(D)).w, [0, 0, 4], 'a chosen end dropped on a B');
  // Drag blue's disc along the rim to two copies right.
  await slide([await at('plane', C.a - .45, -C.M - 1.1), await at('plane', C.a + 1, -C.M - 1.1), await at('plane', C.a + 2 * C.N, -C.M - 1.1)]);
  const after = (await board(D)).w;
  assert.equal(after[2], 4);
  assert.ok(after[0] === 2 || after[1] === 2, 'a dragged end follows to the nearest B');
  // The end buttons work with keys.
  const moved = after[0] === 2 ? 0 : 1, still = 1 - moved;
  await page.locator(`.st-end-button[data-st-end="${still}"]`).focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal((await board(D)).w[still], -1, 'an arrow key moves the focused end');
  await page.keyboard.press('ArrowRight');
  // Can't without the attempt (two pairs right, ends apart): told once, focus not on Can't.
  await slot('Can’t');
  assert.equal(await told(), 'Tap the strand whose end is in the middle.');
  assert.equal(await active('.st-end-button'), true, 'focus lands on a strand');
  await button('Red strand').click();
  assert.equal(await told(), 'First get two pairs right, with every end at a different B.');
  assert.equal(await active('.st-button'), false, 'focus is not left on Can’t');
  if (phone) assert.ok(await page.locator('.st-told').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'the feedback line is in sight on a phone');
  // One press takes back the claim with the key move before it.
  await undo();
  assert.equal((await board(D)).w[still], -1, 'Undo takes back the claim and the end move before it');
  assert.equal((await board(D)).told, null);
  await page.locator(`.st-end-button[data-st-end="${still}"]`).focus();
  await page.keyboard.press('ArrowRight');
  await slot('Can’t'); await button('Red strand').click();
  assert.equal(await told(), 'First get two pairs right, with every end at a different B.', 'the same claim on the same ends is refused again');
  assert.equal((await board(D)).told, 'two');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a move');
  await hintsFinish();
  await shot('design-solved');

  // Puzzle 12: once each is impossible.
  const I = 'strands-12';
  await open(I);
  // An end moved and back: no attempt, so no strand certifies it.
  await page.locator('.st-end-button[data-st-end="0"]').click();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft');
  assert.deepEqual((await board(I)).w, [0, 0, 0]);
  await slot('Can’t'); await button('Blue strand').click();
  assert.equal(await told(), 'First get two pairs right, with every end at a different B.');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'not solved');
  await page.locator('.st-end-button[data-st-end="1"]').click();
  for (let k = 0; k < 2; k++) await page.keyboard.press('ArrowRight');
  await page.locator('.st-end-button[data-st-end="2"]').click();
  for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowRight');
  assert.deepEqual((await board(I)).w, [0, 2, 4]);
  assert.equal(await page.locator('.st-pair.met').count(), 2, 'two pairs right');
  await slot('Can’t');
  assert.equal(await told(), 'Tap the strand whose end is in the middle.');
  await button('Red strand').click();
  assert.equal(await told(), 'Its end isn’t between the other two.');
  await undo();
  assert.deepEqual((await board(I)).w, [0, 2, 3], 'Undo takes back the claim and the end move before it');
  assert.equal((await board(I)).told, null);
  await page.locator('.st-end-button[data-st-end="2"]').focus(); await page.keyboard.press('ArrowRight');
  await slot('Can’t'); await button('Red strand').click();
  assert.equal(await told(), 'Its end isn’t between the other two.', 'the same claim on the same ends is refused again');
  assert.equal((await board(I)).told, 'miss');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a move');
  await page.locator('.st-end-button[data-st-end="2"]').focus();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight');
  assert.deepEqual((await board(I)).w, [0, 2, 4]);
  await slot('Can’t');
  await tapAt(await at('plane', C.a + 2 * C.N + .3, -C.M - 1.1));
  await done();
  assert.equal(await page.locator('.st-gap.inner').count(), 2, 'both inner gaps are drawn');
  assert.equal(await page.locator('.st-gap.outer').count(), 1, 'and the outer gap');
  await shot('design-cant');

  // The playground: twists, an end and a bead.
  const P = 'strands-playground';
  await open(P); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  const before = await board(P);
  await button('Twist right').click();
  assert.deepEqual((await board(P)).w, before.w.map(w => w + 1), 'a twist adds a turn to both');
  await button('Twist left').click();
  await page.locator('.st-end-button[data-st-end="1"]').click();
  await tapAt(await at('plane', C.a + 3 * C.N, -C.M));
  assert.equal((await board(P)).w[1], 3, 'an end dropped on a B');
  await slide([await center(roomBead(0, 4)), await roomPoint(3, 4)]);
  assert.equal(await page.locator('#completion-heading').count(), 0, 'never solved');
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
