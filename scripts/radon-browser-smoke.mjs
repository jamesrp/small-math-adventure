// Plays Stretch bands through the real interface on the shared square grid:
// colouring letters by tapping their discs, Meet shelving a split with no
// verdict, taking one off, That's all judging the shelf and its lock through
// Undo (one press takes back the claim with the Meet before it), a split
// drawn apart at least 200px wide, two letters on one point tapped near the
// edge each disc shows, Enter on a disc, placing D
// by tapping a place, an arrow key and a letter's own disc, Check's
// refusals with the ringed goal split, every place for C with its crosses and
// three splits apart, the two boards with choosing and moving and a shared
// split drawn on both, hints up to Apply hint, the playground's Move tool,
// where focus lands after a move, and no page overflow. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/radon/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/radon/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.sb-puzzle').first().waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const told = () => page.locator('.sb-told').innerText();
const button = name => page.getByRole('button', {name, exact: true});
const stage = '.sb-stage';
const disc = (l, scope = stage) => page.locator(`${scope} .sb-disc[data-sg-piece="${l}"]`).first();
// Any letter's disc, a control or not, and its visible circle.
const letter = (l, scope = stage) => page.locator(`${scope} .sb-disc`).filter({has: page.locator('text.sb-letter', {hasText: new RegExp(`^${l}$`)})}).first();
const face = (l, scope = stage) => letter(l, scope).locator('.sb-face');
const spot = (index, scope = stage) => page.locator(`${scope} .sb-spot[data-sg-point="${index}"]`);
const centre = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
// Taps land at a point through real hit-testing.
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(phone ? 750 : 30); };
const tap = async locator => tapAt(await centre(locator));
const focused = () => page.evaluate(() => { const e = document.activeElement; return {cls: e?.getAttribute('class') || '', text: e?.textContent?.trim() || '', focus: e?.dataset?.focus || ''}; });
const notThatsAll = async label => assert.notEqual((await focused()).text, 'That’s all', `${label}: focus is not on That’s all`);
const undoButton = () => page.locator('[data-action="undo"]').click();
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Bands QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: colour by tapping, Meet shelves with no verdict, That's all
  // judges the shelf.
  const E = 'radon-01';
  await open(E); await fit('every');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Find every split whose bands meet.');
  assert.equal(await page.locator(`${stage} .sb-band`).count(), 0, 'no bands');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a shelf');
  await tap(disc('C')); await tap(disc('D'));
  assert.deepEqual((await board(E)).groups, [0, 0, 1, 1], 'a tap switches a letter’s colour');
  await button('Meet').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(E)).shelf, ['AB|CD'], 'Meet puts the split on the shelf');
  assert.equal(await page.locator('.sb-band').count(), 0, 'with no bands and no verdict');
  assert.equal(await page.locator('.sb-told').count(), 0);
  assert.equal(await page.locator('.sb-take').count(), 1);
  await notThatsAll('after Meet');
  assert.match((await focused()).cls, /sb-disc|sb-button/, 'focus on the board or a move button');
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for the shelf to change');
  await notThatsAll('after a wrong That’s all');
  await tap(disc('A'));
  await button('Meet').click();
  assert.deepEqual((await board(E)).shelf, ['AB|CD', 'ACD|B']);
  await button('That’s all').click();
  assert.equal(await told(), 'This one doesn’t meet.');
  assert.equal(await page.locator('.sb-take.ringed').count(), 1, 'the split that misses is marked on the shelf');
  assert.equal(await page.locator('.sb-mini.sb-big .sb-shape').count(), 1, 'and drawn apart: the triangle of A, C and D without B');
  await shot('apart');
  // The claim press draws nothing of its own once Undo keeps its refusal, so
  // one Undo takes it back with the Meet before it; the shelf it leaves keeps
  // its own refusal.
  await undoButton();
  assert.deepEqual((await board(E)).shelf, ['AB|CD'], 'Undo takes back the claim and the Meet before it');
  assert.deepEqual((await board(E)).groups, [1, 0, 1, 1], 'but not the colours');
  assert.equal(await page.locator('.sb-take.ringed').count(), 0, 'the split apart goes with it');
  assert.deepEqual((await board(E)).refused, {kind: 'more'}, 'Undo keeps the refusal of that shelf');
  assert.equal(await told(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true);
  await button('Meet').click(); await button('That’s all').click();
  assert.deepEqual((await board(E)).refused, {kind: 'apart', key: 'ACD|B'}, 'the same shelf is refused again');
  await page.locator('.sb-take.ringed').scrollIntoViewIfNeeded();
  await tap(page.locator('.sb-take.ringed'));
  assert.deepEqual((await board(E)).shelf, ['AB|CD'], 'tapping a split on the shelf takes it off');
  await tap(disc('A'));
  await disc('C').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(E)).groups, [0, 0, 0, 1], 'Enter on a disc switches it');
  await button('Meet').click();
  assert.deepEqual((await board(E)).shelf, ['AB|CD', 'ABC|D']);
  await button('That’s all').click();
  await done(); await fit('solved');
  await shot('two-found');

  // Puzzle 8: A and D share a point; a tap goes to the disc it lands on.
  const S = 'radon-08';
  await open(S); await fit('shared');
  const [ax, ay] = await centre(face('A')), [dx, dy] = await centre(face('D')), r = (await face('A').boundingBox()).width / 2;
  const toward = (x1, y1, x2, y2, t) => { const len = Math.hypot(x2 - x1, y2 - y1); return [x1 + (x2 - x1) / len * t, y1 + (y2 - y1) / len * t]; };
  await tapAt(toward(ax, ay, dx, dy, r * .85));
  assert.deepEqual((await board(S)).groups, [1, 0, 0, 0], 'A’s edge next to D switches A');
  await tapAt(toward(dx, dy, ax, ay, r * .85));
  assert.deepEqual((await board(S)).groups, [1, 0, 0, 1], 'D’s edge next to A switches D');
  await tapAt(toward(dx, dy, ax, ay, -r * .5));
  assert.deepEqual((await board(S)).groups, [1, 0, 0, 0], 'D’s far side switches D');
  await button('Meet').click();
  assert.deepEqual((await board(S)).shelf, ['A|BCD']);
  await shot('shared');

  // Puzzle 2: Check refuses, then D inside.
  const P = 'radon-02';
  await open(P); await fit('place');
  assert.equal(await page.locator('.sb-goal .sb-chip').count(), 1);
  await button('Check').click();
  assert.equal(await told(), 'This one doesn’t meet.');
  assert.equal(await page.locator('.sb-chip.ringed').count(), 1, 'the goal split is ringed');
  assert.equal(await page.locator(`${stage} .sb-band`).count(), 2, 'its bands are drawn apart');
  assert.equal(await button('Check').isDisabled(), true, 'Check waits for a move');
  await undoButton();
  assert.equal((await board(P)).refused, true, 'Undo keeps the refusal');
  await shot('place-refused');
  // Tap D onto A's disc: D moves there, the two share the point.
  await tap(face('A'));
  assert.deepEqual((await board(P)).at, [1, 1], 'a tap on A’s disc puts D on A');
  await button('Check').click();
  assert.equal(await told(), 'This one meets too.');
  await tap(spot(17));
  assert.deepEqual((await board(P)).at, [2, 3], 'a tap on a place moves D');
  assert.equal((await focused()).focus, 'sb-spot-0-17', 'focus stays on the board');
  await page.keyboard.press('ArrowDown');
  assert.deepEqual((await board(P)).at, [2, 2], 'an arrow key moves D');
  await button('Check').click();
  await done(); await fit('place solved');
  await shot('place-solved');

  // Puzzle 9: four splits, D on B, tapped on B's disc.
  const F = 'radon-09';
  await open(F);
  assert.equal(await page.locator('.sb-goal .sb-chip').count(), 4);
  await tap(face('B'));
  assert.deepEqual((await board(F)).at, [5, 1]);
  await button('Check').click();
  await done();

  // Puzzle 6: every place for C.
  const L = 'radon-06';
  await open(L); await fit('locus');
  await tap(spot(27));
  assert.deepEqual((await board(L)).missed, [[4, 3]]);
  assert.equal(await told(), 'No split meets.');
  assert.equal(await page.locator('.sb-shelf .sb-mini.sb-big').count(), 3, 'the three splits drawn apart');
  for (const w of await page.locator('.sb-mini.sb-big').evaluateAll(els => els.map(e => e.getBoundingClientRect().width))) assert.ok(w >= 200, `a split apart is drawn at least 200px wide (${w})`);
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a find');
  await shot('locus-miss');
  await tap(spot(26));
  assert.deepEqual((await board(L)).found, [[4, 2]]);
  assert.equal(await page.locator(`${stage} .sb-band`).count(), 2, 'the split that meets is drawn');
  assert.equal(await page.locator(`${stage} .sb-spot.missed`).count(), 1, 'the cross stays');
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  await notThatsAll('locus');
  await tap(spot(52)); await tap(spot(0));
  assert.equal(await page.locator(`${stage} .sb-spot.found`).count(), 3);
  await button('That’s all').click();
  await done(); await fit('locus solved');

  // Puzzle 3: the first hint, a wrong shelf refused, Undo taking back the
  // claim with the Meet, the same shelf refused again, then hints up to Apply
  // hint.
  const T = 'radon-03';
  await open(T);
  await button('Hint').click();
  assert.equal(await page.locator('.hint-card').innerText(), 'Is any dot inside the triangle of the other three?', 'the first hint is the puzzle’s own');
  await tap(disc('B')); await button('Meet').click(); await button('That’s all').click();
  assert.equal(await told(), 'This one doesn’t meet.');
  const big = await page.locator('.sb-mini.sb-big').evaluateAll(els => els.map(e => e.getBoundingClientRect().width));
  assert.ok(big.length === 1 && big[0] >= 200, `the split apart is drawn at least 200px wide (${big})`);
  await undoButton();
  assert.deepEqual((await board(T)).shelf, [], 'Undo takes back the claim and the Meet before it');
  assert.deepEqual((await board(T)).groups, [0, 1, 0, 0], 'but not the colours');
  assert.equal((await board(T)).refused, null, 'an empty shelf has no refusal');
  assert.equal(await button('That’s all').isDisabled(), true);
  await button('Meet').click(); await button('That’s all').click();
  assert.deepEqual((await board(T)).refused, {kind: 'apart', key: 'ACD|B'}, 'the same shelf is refused again');
  assert.equal(await button('That’s all').isDisabled(), true);
  for (let i = 0; i < 3 && !(await button('Apply hint').count()); i++) await button('Hint').click();
  assert.match(await page.locator('.sb-take').first().getAttribute('class'), /hinted/, 'the hint marks the split to take off');
  for (let i = 0; i < 8 && !(await page.locator('#completion-heading').count()); i++) await button('Apply hint').click();
  await done();

  // Puzzle 10: two boards.
  const W = 'radon-10';
  await open(W); await fit('two boards');
  const second = '.sb-half[data-sb-board="1"]';
  await button('Check').click();
  assert.equal(await told(), 'This split meets on both.');
  assert.equal(await page.locator('.sb-half .sb-band').count(), 4, 'drawn on both boards');
  await tap(disc('1:A', second));
  assert.match(await disc('1:A', second).getAttribute('class'), /chosen/, 'a tap chooses a letter');
  await tap(spot(8, second));
  const after = await board(W);
  assert.deepEqual(after.boards[1].A, [1, 2], 'a tap on a place moves the chosen letter');
  assert.equal(after.refused, false);
  await tap(disc('1:B', second));
  await disc('1:B', second).focus(); await page.keyboard.press('ArrowLeft');
  assert.deepEqual((await board(W)).boards[1].B, [4, 3], 'an arrow key moves the chosen letter');
  await page.keyboard.press('ArrowRight');
  await tap(spot(1, second));
  assert.deepEqual((await board(W)).boards[1].B, [0, 1]);
  await button('Check').click();
  await done(); await fit('two boards solved');
  await shot('pair-solved');

  // The playground.
  const G = 'radon-playground';
  await open(G); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await tap(disc('0:A'));
  assert.deepEqual((await board(G)).groups, [1, 0, 1, 1]);
  await button('Move').click();
  assert.equal(await button('Move').getAttribute('aria-pressed'), 'true');
  await tap(disc('0:B'));
  await tap(spot(24));
  assert.deepEqual((await board(G)).at.B, [3, 3], 'Move, a letter, a place');
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
