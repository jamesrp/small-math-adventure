// Plays Glued squares through the real interface: taps on sides to glue them
// (including a tap near where two sides' targets meet), a gluing that solves,
// Undo, Enter on sides, where focus goes after a move, Can't without the
// longest trip (the refusal every puzzle gives), the trip's landings tapped
// out of order and then in order, the beads lettered from the trip, "There is
// a way." kept through Undo until a new gluing, a double tap on Can't, corners joined by taps (including taps beside a corner shared
// by two squares), puzzle 10's corner targets, a wrong That's all refused through Undo, the rosettes,
// hints applied to a finish, and the playground's surfaces, arrows and
// starts; no page overflow. Same environment variables as the other browser
// suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a
// phone with touch). Screenshots go in test-results/glued/ (or SHOTS).
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1280, height: 900}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS ? new URL(`file://${process.env.SHOTS.replace(/\/?$/, '/')}`) : new URL('../test-results/glued/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : '-desktop'}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] .gl-puzzle`).waitFor(); await page.evaluate(() => scrollTo(0, 0)); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const side = (s, d) => page.locator(`[data-pb-point="side,${s},${d}"]`);
const dot = s => page.locator(`[data-pb-point="dot,${s}"]`);
const corner = k => page.locator(`[data-pb-point="corner,${k}"]`);
const button = name => page.getByRole('button', {name, exact: true});
const cant = () => page.locator('.gl-cant');
const told = () => page.locator('.gl-told');
const focused = () => page.evaluate(() => { const el = document.activeElement; return {cls: el?.getAttribute('class') || '', focus: el?.dataset?.focus || '', text: el?.textContent?.trim() || ''}; });
// Taps land at a point through real hit-testing: the centre of a control, or
// a point given as fractions of its box (0, 0 the top left).
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async (locator, fx = .5, fy = .5) => { const b = await locator.boundingBox(); await tapAt(b.x + b.width * fx, b.y + b.height * fy); };
const glue = async (a, b) => { await tap(side(...a)); await tap(side(...b)); };
// Two taps 90 ms apart at one point: a quick double tap.
// Can't is a data-toggle slot: a press within 350 ms of the last is taken for
// a double tap and dropped (dist/main.js), so the suite leaves 400 ms between
// its presses, as a child's separate presses would.
let lastCant = -Infinity;
const sinceCant = async () => { const wait = lastCant + 400 - Date.now(); if (wait > 0) await page.waitForTimeout(wait); };
const pressCant = async () => { await sinceCant(); await tap(cant()); lastCant = Date.now(); };
const doubleTap = async locator => { await sinceCant(); const b = await locator.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2; await tapAt(x, y); await page.waitForTimeout(90); await tapAt(x, y); lastCant = Date.now(); };
const undo = () => page.locator('[data-action="undo"]').click();
async function hintsFinish() {
  for (let i = 0; i < 3; i++) await button('Hint').click();
  let n = 0;
  while (!await page.locator('#completion-heading').count() && n++ < 60) await button('Apply hint').click();
  await done();
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Glue QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: glue right sides by taps; a tap near where two sides meet; Undo.
  const P1 = 'glued-01';
  await open(P1); await fit('puzzle 1'); await shot('01-start');
  assert.equal(await page.locator('.puzzle-goal, .lr-goal, .gl-puzzle').first().count(), 1);
  assert.ok(await cant().isDisabled(), 'Can’t waits for a gluing');
  assert.equal(await side('A', 'up').count(), 0, 'tops don’t glue here');
  // A's right-side target, tapped close to the line where it meets the top's
  // target: the nearer side, the right one, is chosen.
  await tap(side('A', 'right'), .8, .2);
  assert.equal(await side('A', 'right').getAttribute('aria-pressed'), 'true', 'the nearer side is chosen');
  assert.equal(await page.locator('.gl-side.could').count(), 3, 'the left sides it can be glued to');
  await tap(side('B', 'left'));
  assert.deepEqual((await board(P1)).right, {A: 'B', B: null, C: null});
  const after = await focused();
  assert.match(after.cls, /gl-side-hit/, 'focus stays on the board after a gluing');
  assert.equal(await page.locator('.pb-room .pb-mark').count(), 2, 'one pair of marks for one gluing');
  await glue(['B', 'right'], ['C', 'left']);
  await shot('01-two');
  await glue(['A', 'left'], ['C', 'right']);
  await done(); await shot('01-solved');
  assert.deepEqual((await board(P1)).right, {A: 'B', B: 'C', C: 'A'});
  await page.locator('[data-action="replay"]').click();
  await page.locator('.gl-side-hit').first().waitFor();
  // Gluing a side again takes it from its old partner; Undo gives it back.
  await glue(['A', 'right'], ['B', 'left']);
  await glue(['C', 'right'], ['B', 'left']);
  assert.deepEqual((await board(P1)).right, {A: null, B: null, C: 'B'});
  await undo();
  assert.deepEqual((await board(P1)).right, {A: 'B', B: null, C: null});

  // Puzzle 4: Enter on sides; Can't without the longest trip; hints finish.
  const P4 = 'glued-04', refusal = 'The taps must follow the trip to every dot and home.';
  await open(P4); await fit('puzzle 4');
  await side('A', 'up').focus(); await page.keyboard.press('Enter');
  await side('C', 'down').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P4)).up, {A: 'C', B: null, C: null}, 'Enter glues');
  assert.match((await focused()).cls, /gl-side-hit/, 'focus after a keyboard gluing');
  await pressCant();
  assert.equal(await cant().getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.gl-dot-hit').count(), 3, 'every dot is a control');
  assert.equal(await page.locator('.gl-side-hit').count(), 0, 'the sides wait');
  await shot('04-dots');
  for (const s of ['B', 'A']) await tap(dot(s));
  assert.equal((await board(P4)).told, null, 'no claim until every dot');
  // A ringed dot taps back off.
  await tap(dot('A'));
  assert.equal(await dot('A').getAttribute('aria-pressed'), 'false', 'a ringed dot taps back off');
  for (const s of ['A', 'C']) await tap(dot(s));
  assert.equal(await told().innerText(), refusal);
  assert.ok(!await cant().isDisabled(), 'Can’t stays open after this refusal');
  assert.doesNotMatch((await focused()).text, /Can’t/, 'focus is not on Can’t');
  await shot('04-refused');
  await glue(['A', 'right'], ['B', 'left']);
  assert.equal(await told().count(), 0, 'a new gluing clears it');
  // A quick double tap on Can't opens the dots once; it doesn't close them again.
  await doubleTap(cant());
  assert.equal(await cant().getAttribute('aria-pressed'), 'true', 'a double tap leaves the dots open');
  await pressCant();
  assert.equal(await cant().getAttribute('aria-pressed'), 'false', 'a later press closes them');
  await hintsFinish(); await shot('04-solved');

  // Puzzle 2: the trip lands on every dot, tapped in order, but the puzzle can
  // be done: "There is a way.", kept through Undo until a new gluing.
  const P2 = 'glued-02';
  await open(P2); await fit('puzzle 2');
  await glue(['A', 'right'], ['B', 'left']); await glue(['B', 'right'], ['C', 'left']); await glue(['C', 'right'], ['A', 'left']);
  await pressCant();
  for (const s of ['B', 'C', 'A']) await tap(dot(s));
  assert.equal(await told().innerText(), 'There is a way.');
  assert.ok(await cant().isDisabled(), 'Can’t is shut after "There is a way."');
  await undo();
  assert.equal(await told().innerText(), 'There is a way.', 'Undo keeps the refusal');
  assert.ok(await cant().isDisabled());
  await glue(['A', 'right'], ['A', 'left']);
  assert.equal(await told().count(), 0, 'a new gluing lifts it');
  assert.ok(!await cant().isDisabled());

  // Puzzle 7: the reviewer's repro is refused; the longest trip's landings,
  // tapped in order, claim; the beads show them.
  const P7 = 'glued-07';
  await open(P7); await fit('puzzle 7');
  assert.ok(await cant().isDisabled(), 'no Can’t before an attempt');
  await glue(['C', 'up'], ['B', 'down']);
  await pressCant();
  for (const s of ['C', 'A', 'B']) await tap(dot(s));
  assert.equal(await told().innerText(), refusal, 'a trip that stops at once is no certificate');
  for (const s of ['A', 'B', 'C']) await glue([s, 'right'], [s, 'left']);
  await glue(['A', 'up'], ['C', 'down']); await glue(['B', 'up'], ['A', 'down']);
  assert.deepEqual((await board(P7)).up, {A: 'C', B: 'A', C: 'B'});
  await pressCant();
  for (const s of ['B', 'C']) await tap(dot(s));
  assert.deepEqual(await page.locator('.gl-beads').first().locator('i.lettered').allInnerTexts(), ['B', 'C'], 'the beads take the taps in order');
  await tap(dot('A'));
  assert.equal(await told().innerText(), refusal, 'out of order');
  await pressCant();
  for (const s of ['C', 'B', 'A']) await tap(dot(s));
  await done();
  assert.ok((await board(P7)).claimed);
  const beads = page.locator('.gl-beads').first();
  assert.deepEqual(await beads.locator('i.lettered').allInnerTexts(), ['C', 'B', 'A'], 'the beads read the trip’s landings');
  assert.equal(await beads.locator('i.home').innerText(), 'A');
  assert.equal(await beads.locator('i.none').count(), 1, 'and a bead with no dot');
  await shot('07-claimed');
  // From the start again, the hints build the longest trip and then claim.
  await page.locator('[data-action="replay"]').click();
  await page.locator('.gl-side-hit').first().waitFor();
  await hintsFinish();

  // Puzzle 9: three trips from one dot.
  await open('glued-09'); await fit('puzzle 9'); await shot('09-start');
  await hintsFinish(); await shot('09-solved');

  // Puzzle 3: corners joined by taps beside a shared corner; a wrong That's all.
  const P3 = 'glued-03';
  await open(P3); await fit('puzzle 3'); await shot('03-start');
  assert.equal(await page.locator('.gl-wedge[class*=" g"]').count(), 0, 'no colours before a join');
  // A's lower-right and B's lower-left corners meet at one drawn point; taps
  // just either side of the line between them choose the corner on that side.
  await tap(corner('A:10'), .9, .85);
  assert.equal(await corner('A:10').getAttribute('aria-pressed'), 'true');
  await tap(corner('B:00'), .1, .85);
  assert.deepEqual((await board(P3)).links, [['A:10', 'B:00']]);
  assert.equal(await corner('B:00').getAttribute('aria-pressed'), 'true', 'the second corner stays chosen');
  assert.equal(await page.locator('.gl-wedge.g0').count(), 2, 'the new group takes the first colour');
  await button('That’s all').click();
  assert.equal(await told().innerText(), 'Some corners still meet.');
  assert.ok(await button('That’s all').isDisabled());
  assert.doesNotMatch((await focused()).text, /That’s all/);
  await shot('03-refused');
  await undo();
  assert.equal(await told().innerText(), 'Some corners still meet.', 'Undo keeps the refusal');
  // A's lower-right corner meets its own upper-right corner (A's top is
  // glued to its bottom): tap one, then the other.
  await tap(corner('A:10'));
  await tap(corner('A:11'));
  assert.equal(await told().count(), 0, 'a join lifts it');
  await hintsFinish();
  assert.equal(await page.locator('.gl-rose').count(), 2, 'a rosette for each point');
  await shot('03-solved');

  // Puzzle 6: the L's corners, finished by hints: one rosette of three rings.
  await open('glued-06'); await fit('puzzle 6'); await shot('06-start');
  await hintsFinish();
  assert.equal(await page.locator('.gl-rose').count(), 1);
  assert.equal(await page.locator('.gl-rose-wedge').count(), 12);
  await shot('06-solved');
  // Puzzle 10: three squares across with D on B's top, glued there, so each
  // corner's target is about 40 px on a 375 px phone (33 px in a row of four).
  await open('glued-10'); await fit('puzzle 10'); await shot('10-start');
  // The drawn squares, since a corner's own hit shape may reach past its square.
  const [a00, b01, d00] = await Promise.all(['A:00', 'B:01', 'D:00'].map(k => corner(k).locator(':scope > .pb-hit').boundingBox()));
  assert.ok(Math.min(a00.width, a00.height) >= 39.5, `puzzle 10's corner targets are ${Math.round(a00.width)} px`);
  assert.ok(Math.abs(d00.y + d00.height - b01.y) < 1 && Math.abs(d00.x - b01.x) < 1, 'D is drawn on B’s top');
  await hintsFinish();
  assert.equal(await page.locator('.gl-rose').count(), 2); await shot('10-solved');

  // The playground: surfaces, arrows, starts.
  const PG = 'glued-playground';
  await open(PG); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  assert.equal(await page.locator('.gl-dir').count(), 8);
  await tap(page.locator('[data-pb-point="C,1,1"]'));
  assert.match(await page.locator('.gl-puzzle [role=status]').innerText(), /Home after 1 block\./, 'the L’s top row: one block right');
  await page.locator('.gl-dir[aria-label="1 right, 1 up"]').click();
  assert.equal((await focused()).focus, 'gl-dir-2', 'focus stays on the arrow');
  await tap(page.locator('[data-pb-point="A,0,0"]'));
  assert.match(await page.locator('.gl-puzzle [role=status]').innerText(), /reaches a corner/);
  await shot('playground-corner');
  await page.locator('.gl-pick[aria-label="Four squares, two tops crossed"]').click();
  assert.equal((await board(PG)).surface, 'twist');
  await page.locator('.gl-dir[aria-label="2 right, 1 up"]').click();
  await fit('playground twist'); await shot('playground-twist');
  assert.deepEqual(errors, []);
  console.log(`Glued squares browser smoke passed (${phone ? 'phone' : 'desktop'}).`);
} finally {
  await browser.close();
}
