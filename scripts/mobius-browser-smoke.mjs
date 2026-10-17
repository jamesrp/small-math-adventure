// Plays Seams (Week 38, Möbius bands) through the real interface: dots on
// edge places (a tap just inside one place beside the next, taps either side
// of a cut, Enter on a place), dots lit by closed edge, a solve, Can't after
// four dots with the colours hidden, "There is a way." with its flags, Undo
// taking back the flags and keeping the words, Can't alone on B once dots are
// on the top and the bottom (the extra ring crossed out, the arrow home
// flipped), a certificate that taps one closed edge twice refused without a
// save and cleared by Undo, no piece tints on dots puzzles, lamps lighting a
// whole closed edge, seams toggled and undone, a solved circle lit like its
// rings, a fixed seam, cuts and the scissors taping back, holes and notches
// (taps that fall between a hole or notch and an edge or line go to the
// nearer one drawn), hints applied to a finish, focus after every kind of
// move, and the playground's bands and arrow; no page overflow. Same environment variables
// as the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE,
// TEST_URL, TEST_PHONE=1 for a phone with touch). Screenshots go in
// test-results/mobius/ (or SHOTS).
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1280, height: 900}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS ? new URL(`file://${process.env.SHOTS.replace(/\/?$/, '/')}`) : new URL('../test-results/mobius/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : '-desktop'}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] .mb-puzzle`).waitFor(); await page.evaluate(() => scrollTo(0, 0)); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const seg = k => page.locator(`[data-pb-point="seg:${k}"]`);
const lamp = k => page.locator(`[data-pb-point="lamp:${k}"]`);
const seam = k => page.locator(`[data-pb-point="seam:${k}"]`);
const line = h => page.locator(`[data-focus="mb-line-${h}"]`);
const scissors = h => page.locator(`[data-focus="mb-scissors-${h}"]`);
const spot = i => page.locator(`[data-pb-point="spot:${i}"]`);
const button = name => page.getByRole('button', {name, exact: true});
const cant = () => button('Can’t');
const told = () => page.locator('.mb-told');
const count = sel => page.locator(sel).count();
const focused = () => page.evaluate(() => { const el = document.activeElement; return {cls: el?.getAttribute('class') || '', focus: el?.dataset?.focus || '', text: el?.textContent?.trim() || '', tag: el?.tagName || ''}; });
const onBoard = async label => {
  const f = await focused();
  assert.match(f.cls, /mb-hit/, `${label}: focus is on the board (${JSON.stringify(f)})`);
  assert.doesNotMatch(f.text, /Can’t|That’s all/, `${label}: focus is not on Can’t or That’s all`);
};
// Taps land at a point through real hit-testing: the centre of a control, or
// a point given as fractions of its box (0, 0 the top left).
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async (locator, fx = .5, fy = .5) => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); await tapAt(b.x + b.width * fx, b.y + b.height * fy); };
const dots = async (...keys) => { for (const k of keys) await tap(seg(k)); };
const undo = () => page.locator('[data-action="undo"]').click();
// A tap at band coordinates (X along the strip, Y up), through the board's own transform.
const tapLattice = async (X, Y) => {
  const svg = page.locator('.mb-band svg.mb-room');
  await svg.scrollIntoViewIfNeeded();
  const [x, y] = await svg.evaluate((el, [x, y]) => { const m = el.getScreenCTM(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }, [X, -Y]);
  await tapAt(x, y);
};
async function hintsFinish() {
  for (let i = 0; i < 3; i++) await button('Hint').click();
  let n = 0;
  while (!await page.locator('#completion-heading').count() && n++ < 60) await button('Apply hint').click();
  await done();
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Band QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1, band A: dots light their closed edge; a tap just inside one
  // segment beside the next; two dots on each closed edge solve it.
  const P1 = 'mobius-01';
  await open(P1); await fit('puzzle 1'); await shot('01-start');
  assert.ok(await cant().isDisabled(), 'Can’t waits for four dots');
  assert.equal(await count('[data-pb-point^="seg:"]'), 16, 'a control on each edge segment');
  await tap(seg('0:4d:1'), .9, .5);
  assert.deepEqual((await board(P1)).dots, ['0:4d:1'], 'the segment tapped, not its neighbour');
  await onBoard('after a dot');
  // Enter on a place puts a dot there and takes it off again.
  await seg('0:4d:3').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P1)).dots, ['0:4d:1', '0:4d:3'], 'Enter places a dot');
  assert.equal((await focused()).focus, 'mb-seg-0:4d:3', 'focus stays on the place');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board(P1)).dots, ['0:4d:1'], 'Enter takes it off');
  await tap(seg('0:0u:2'));
  assert.equal(await count('.mb-dot.rose'), 1);
  assert.equal(await count('.mb-dot.leaf'), 1, 'A’s two closed edges take two colours');
  await dots('0:4d:5', '0:0u:6');
  await done(); await shot('01-solved');
  assert.equal(await count('.mb-arrow.home'), 1, 'the arrow comes home');
  assert.equal(await count('.mb-arrow.home.flipped'), 0, 'not flipped on A');

  // Puzzle 1 again: Can't on a picture that can be done. "There is a way."
  // keeps its flags; Undo takes them back and keeps the words; a dot lifts it.
  await page.locator('[data-action="replay"]').click();
  await page.locator('[data-pb-point^="seg:"]').first().waitFor();
  await dots('0:4d:1', '0:4d:3', '0:4d:5');
  assert.ok(await cant().isDisabled(), 'no Can’t before four dots');
  await tap(seg('0:0u:2'));
  assert.ok(!await cant().isDisabled(), 'Can’t after four dots that don’t match');
  await tap(cant());
  assert.equal(await cant().getAttribute('aria-pressed'), 'true');
  assert.equal(await count('.mb-dot.plain'), 4, 'the colours hide while Can’t is open');
  assert.ok(await button('That’s all').isDisabled(), 'That’s all waits for a tap');
  await tap(seg('0:4d:0')); await tap(seg('0:0u:7'));
  assert.equal(await seg('0:0u:7').getAttribute('aria-pressed'), 'true');
  assert.equal(await count('.mb-flag'), 2);
  await shot('01-claiming');
  await tap(button('That’s all'));
  assert.equal(await told().innerText(), 'There is a way.');
  assert.ok(await cant().isDisabled(), 'Can’t is shut after "There is a way."');
  assert.equal(await count('.mb-flag'), 2, 'the certificate stays drawn');
  await onBoard('after There is a way.');
  await shot('01-way');
  await undo();
  assert.equal(await told().innerText(), 'There is a way.', 'Undo keeps the refusal');
  assert.equal(await count('.mb-flag'), 0, 'Undo takes back the flags');
  assert.ok(await cant().isDisabled());
  await undo();
  assert.equal(await told().count(), 0, 'a dot taken back lifts it');
  assert.equal((await board(P1)).dots.length, 3);

  // Puzzle 2, band B: every dot takes one colour; Can't waits for dots on
  // the top and the bottom edge, then claims by itself.
  const P2 = 'mobius-02';
  await open(P2); await fit('puzzle 2');
  await dots('0:4d:1', '0:4d:3', '0:4d:5', '0:4d:6');
  assert.ok(await cant().isDisabled(), 'Can’t waits for a dot on the bottom edge too');
  await tap(seg('0:4d:6')); await tap(seg('0:0u:2'));
  assert.equal(await count('.mb-dot.rose'), 4, 'B’s dots share one colour');
  assert.ok(!await cant().isDisabled(), 'Can’t once dots are on the top and the bottom');
  assert.equal(await cant().getAttribute('aria-pressed'), null, 'here Can’t is the claim, not a toggle');
  await shot('02-ready');
  await tap(cant());
  await done();
  assert.deepEqual((await board(P2)).claimed, [], JSON.stringify(await board(P2)));
  assert.equal(await count('.mb-ring-x'), 1, 'the extra ring is crossed out');
  assert.equal(await count('.mb-lit.rose'), 2, 'the one closed edge is drawn, top and bottom');
  assert.equal(await count('.mb-arrow.home.flipped'), 1, 'the arrow comes home flipped');
  await shot('02-claimed');

  // Puzzle 4, B cut down the middle: taps either side of the cut choose that side.
  const P4 = 'mobius-04';
  await open(P4); await fit('puzzle 4'); await shot('04-start');
  await tap(seg('0:2u:3'), .5, .85);
  await tap(seg('0:2d:3'), .5, .15);
  assert.deepEqual((await board(P4)).dots, ['0:2u:3', '0:2d:3'], 'each side of the cut takes its own taps');
  assert.equal(await count('.mb-dot.rose'), 2, 'the two sides of the cut are one closed edge');
  await dots('0:0u:1', '0:4d:6');
  await done(); await shot('04-solved');

  // Puzzle 5: a certificate that taps one closed edge twice is refused in
  // words that are not saved; taps toggle; Undo after a refusal takes back a
  // dot and the words; then hints finish.
  const P5 = 'mobius-05';
  await open(P5); await fit('puzzle 5');
  assert.equal(await count('.mb-tint'), 0, 'no piece tints on a dots puzzle');
  await dots('0:4d:1', '0:0u:2', '0:4d:5', '0:0u:6');
  await tap(cant());
  await tap(seg('0:4d:0')); await tap(seg('0:0u:3'));
  await tap(button('That’s all'));
  assert.equal(await told().innerText(), 'Tap each closed edge once.');
  assert.equal(await cant().getAttribute('aria-pressed'), 'false', 'the refusal closes the taps');
  assert.equal(await count('.mb-flag'), 0);
  assert.ok(!await cant().isDisabled(), 'Can’t stays open after this refusal');
  await onBoard('after a refused certificate');
  assert.deepEqual(Object.keys(await board(P5)).sort(), ['claimed', 'dots', 'flags', 'told']);
  assert.equal((await board(P5)).told, null, 'the refusal is not saved');
  await tap(cant());
  assert.equal(await told().count(), 0, 'opening Can’t again drops the words');
  await tap(seg('0:2u:3')); await tap(seg('0:2u:3'));
  assert.ok(await button('That’s all').isDisabled(), 'a second tap takes a flag back');
  await tap(seg('0:4d:0'));
  await tap(button('That’s all'));
  assert.equal(await told().innerText(), 'Tap each closed edge once.', 'one closed edge missed');
  await shot('05-refused');
  await undo();
  assert.equal(await told().count(), 0, 'Undo drops the words');
  assert.equal((await board(P5)).dots.length, 3, 'and takes back a dot');
  await hintsFinish(); await shot('05-solved');
  assert.equal(await count('.mb-ring-x'), 1);

  // Puzzle 9: three closed edges and four rings, by hints.
  await open('mobius-09'); await fit('puzzle 9'); await shot('09-start');
  await hintsFinish(); await shot('09-solved');

  // Puzzle 6: lamps light a whole closed edge and toggle; seams toggle; Undo.
  const P6 = 'mobius-06';
  await open(P6); await fit('puzzle 6'); await shot('06-start');
  await tap(lamp('0:2d'));
  assert.equal(await count('.mb-lit.rose'), 3, 'one tap lights the closed edge round three strips');
  assert.equal((await focused()).focus, 'mb-lamp-0:2d', 'focus stays on the lamp');
  await tap(lamp('1:0u'));
  assert.equal(await count('.mb-lit.leaf'), 3, 'the other closed edge');
  await tap(lamp('2:2d'));
  assert.equal(await count('.mb-lit.rose'), 0, 'a tap on a lit closed edge turns it off');
  await tap(seam(0));
  assert.deepEqual((await board(P6)).seams, ['R', 'M', 'M']);
  assert.equal(await count('.mb-seam.r'), 1);
  assert.equal(await count('.mb-lit'), 6, 'the light follows the new closed edge');
  await onBoard('after a seam');
  await undo();
  assert.deepEqual((await board(P6)).seams, ['M', 'M', 'M'], 'Undo turns the seam back');
  assert.equal(await count('.mb-seam.r'), 0);
  await tap(button('Carry an arrow round'));
  assert.equal(await count('.mb-arrow.start'), 1);
  assert.equal((await focused()).focus, 'mb-arrow');
  await tap(seam(0)); await tap(seam(2));
  await done(); await shot('06-solved');
  assert.deepEqual((await board(P6)).seams, ['R', 'M', 'R']);
  assert.equal(await count('.mb-lit.rose'), 3, 'solved: the stars’ closed edge lights');
  assert.equal(await count('.mb-lit.leaf'), 3, 'and the diamonds’');
  assert.equal(await count('.mb-ring.rose') + await count('.mb-ring.leaf'), 2, 'like their rings');

  // Puzzle 10: a fixed seam has no control; hints finish from a wrong change.
  const P10 = 'mobius-10';
  await open(P10); await fit('puzzle 10');
  assert.deepEqual((await page.locator('.mb-seam text').allTextContents()), ['R', 'R', 'R', 'R'], 'four R seams at the start');
  assert.equal(await seam(2).count(), 0, 'the fixed seam has no control');
  assert.equal(await count('.mb-lock'), 1);
  await tap(lamp('0:2d'));
  assert.equal(await count('.mb-lit.rose'), 4, 'four R seams: two closed edges, alternating top and bottom');
  await tap(button('Carry an arrow round'));
  await fit('puzzle 10 busy'); await shot('10-busy');
  await tap(seam(1));
  await hintsFinish(); await shot('10-solved');
  assert.deepEqual((await board(P10)).seams, ['M', 'R', 'R', 'M']);

  // Puzzle 7: a cut locks the seam and the scissors tape it back; on B the
  // cut runs on round to the other line.
  const P7 = 'mobius-07';
  await open(P7); await fit('puzzle 7'); await shot('07-start');
  await tap(line(2), .5, .5);
  assert.deepEqual((await board(P7)).cuts, [2]);
  assert.ok(await count('.mb-tint') > 0, 'a pieces puzzle tints its pieces');
  assert.equal(await seam(0).count(), 0, 'the seam is locked while cut');
  assert.equal(await scissors(2).getAttribute('aria-pressed'), 'true');
  await onBoard('after a cut');
  await tap(scissors(2));
  assert.deepEqual((await board(P7)).cuts, [], 'the scissors tape it back');
  await tap(seam(0));
  await tap(line(4), .5, .5);
  await done(); await shot('07-solved');
  assert.deepEqual(await board(P7), {seams: ['R'], cuts: [2, 4], holes: []});

  // Puzzle 8: a tap on the wall at the notch lights the edge, a tap just
  // inside punches the notch; B with both holes and the notch falls short.
  const P8 = 'mobius-08';
  await open(P8); await fit('puzzle 8'); await shot('08-start');
  await tapLattice(4, 4);
  assert.deepEqual((await board(P8)).holes, [], 'a tap on the wall at the notch is not the notch');
  assert.equal(await count('.mb-lit.rose'), 1, 'it lights the top edge');
  await tapLattice(4, 3.75);
  assert.deepEqual((await board(P8)).holes, [2], 'a tap just inside the notch punches it');
  await onBoard('after a notch');
  await tap(seam(0)); await tap(spot(0)); await tap(spot(1));
  assert.deepEqual(await board(P8), {seams: ['R'], cuts: [], holes: [0, 1, 2]});
  assert.equal(await count('#completion-heading'), 0, 'B with every hole: three closed edges');
  await tap(spot(2));
  assert.deepEqual((await board(P8)).holes, [0, 1], 'a tap fills the notch');
  await hintsFinish(); await shot('08-solved');
  assert.deepEqual((await board(P8)).seams, ['M']);

  // Puzzle 12: a tap on a hole's rim where it meets a line's target punches
  // the hole; then hints finish.
  const P12 = 'mobius-12';
  await open(P12); await fit('puzzle 12');
  await tap(spot(0), .5, .95);
  assert.deepEqual(await board(P12), {seams: ['M'], cuts: [], holes: [0]}, 'the hole, not the line beside it');
  await tap(line(4), .9, .5);
  assert.deepEqual((await board(P12)).cuts, [4]);
  await fit('puzzle 12 busy'); await shot('12-busy');
  await undo();
  assert.deepEqual((await board(P12)).cuts, [], 'Undo tapes the cut');
  // Between the side of a cut and a punched hole: each tap goes to the nearer
  // one drawn (B cut at a third: the side over the lower cut at 2.21; the
  // middle hole's rim at 2.49).
  await undo();
  await tap(seam(0)); await tap(line(2)); await tap(spot(1));
  assert.deepEqual(await board(P12), {seams: ['R'], cuts: [2, 4], holes: [1]});
  await tapLattice(6, 2.21 + .06 * 1.5);
  assert.deepEqual((await board(P12)).holes, [1], 'just over the cut side: not the hole');
  assert.ok(await count('.mb-lit') > 0, 'it lights the cut side');
  await tapLattice(6, 2.45);
  assert.deepEqual((await board(P12)).holes, [], 'just under the hole’s rim: the hole');
  await shot('12-contested');
  await hintsFinish(); await shot('12-solved');
  await open('mobius-11'); await fit('puzzle 11'); await hintsFinish();
  await open('mobius-03'); await fit('puzzle 3');
  assert.equal(await count('.mb-tint'), 0, 'cut A’s two pieces are not tinted');
  await hintsFinish();

  // The playground: bands, the arrow, cuts and holes.
  const PG = 'mobius-playground';
  await open(PG); await fit('playground'); await shot('playground-start');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  assert.equal(await count('.mb-pick'), 3);
  await tap(page.locator('.mb-pick[aria-label="Three strips"]'));
  assert.equal((await board(PG)).shape, 'three');
  assert.equal((await focused()).focus, 'mb-shape-three', 'focus stays on the band picked');
  await tap(button('Carry an arrow round'));
  assert.equal(await count('.mb-arrow.home'), 1);
  assert.equal(await count('.mb-arrow.home.flipped'), 0);
  await tap(seam(1));
  assert.equal(await count('.mb-arrow.home.flipped'), 1, 'one R seam: home flipped');
  await tap(seam(2));
  assert.equal(await count('.mb-arrow.home.flipped'), 0, 'two: not flipped');
  await tap(lamp('0:2d'));
  await fit('playground three'); await shot('playground-three');
  await tap(page.locator('.mb-pick[aria-label="One strip"]'));
  await tap(seam(0)); await tap(line(2)); await tap(spot(1));
  assert.deepEqual(await board(PG), {shape: 'one', seams: ['R'], cuts: [2, 4], holes: [1]});
  assert.ok(await button('Carry an arrow round').isDisabled(), 'no arrow on a cut band');
  await fit('playground one'); await shot('playground-one');
  await tap(page.locator('.mb-pick[aria-label="Four strips"]'));
  assert.equal(await count('[data-pb-point^="seam:"]'), 4);
  await fit('playground four'); await shot('playground-four');
  assert.deepEqual(errors, []);
  console.log(`Seams browser smoke passed (${phone ? 'phone' : 'desktop'}).`);
} finally {
  await browser.close();
}
