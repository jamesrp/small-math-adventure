// Plays Stretch bands through the real interface on the shared square grid:
// colouring letters by tapping their discs, Meet and its answers, the shelf,
// That's all with There is another and its lock through Undo, two letters on
// one point tapped near the edge each disc shows, Enter on a disc, placing D
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

  // Puzzle 1: colour by tapping, Meet, the shelf, That's all.
  const E = 'radon-01';
  await open(E); await fit('every');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Find every split whose bands meet.');
  assert.equal(await page.locator(`${stage} .sb-band`).count(), 0, 'no bands before Meet');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a try');
  await tap(disc('C')); await tap(disc('D'));
  assert.deepEqual((await board(E)).groups, [0, 0, 1, 1], 'a tap switches a letter’s colour');
  assert.equal(await page.locator(`${stage} .sb-band`).count(), 0, 'still no bands while colouring');
  await button('Meet').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(E)).found, ['AB|CD'], 'a split that meets goes on the shelf');
  assert.equal(await page.locator(`${stage} .sb-band`).count(), 2, 'its two bands are drawn');
  assert.equal(await page.locator(`${stage} .sb-meet`).count(), 1, 'with a ring where they meet');
  assert.equal(await page.locator('.sb-shelf .sb-mini').count(), 1);
  assert.equal(await page.locator('.sb-found-count, .sb-slot').count(), 0, 'no count, no slots');
  await notThatsAll('after Meet');
  assert.match((await focused()).cls, /sb-disc|sb-button/, 'focus on the board or a move button');
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a new find');
  await notThatsAll('after a wrong That’s all');
  await tap(disc('A'));
  assert.equal(await page.locator(`${stage} .sb-band`).count(), 0, 'bands go when a colour changes');
  await button('Meet').click();
  assert.equal(await told(), 'They don’t meet.');
  await shot('apart');
  await undoButton(); await undoButton();
  assert.equal((await board(E)).more, true, 'Undo keeps There is another');
  assert.equal(await button('That’s all').isDisabled(), true);
  await disc('C').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(E)).groups, [0, 0, 0, 1], 'Enter on a disc switches it');
  await button('Meet').click();
  assert.deepEqual((await board(E)).found, ['AB|CD', 'ABC|D']);
  await shot('two-found');
  await button('That’s all').click();
  await done(); await fit('solved');

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
  assert.equal(await page.locator(`${stage} .sb-meet`).count(), 1, 'A alone meets the triangle at the shared point');
  assert.deepEqual((await board(S)).found, ['A|BCD']);
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
  assert.equal(await page.locator('.sb-shelf .sb-mini').count(), 3, 'the three splits drawn apart');
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

  // Puzzle 3: hints up to Apply hint, the reason before That's all.
  const T = 'radon-03';
  await open(T);
  await button('Hint').click();
  assert.equal(await page.locator('.hint-card').innerText(), 'With three dots, what splits are there?', 'the first hint is the puzzle’s own');
  await button('Hint').click(); await button('Hint').click();
  await button('Apply hint').click();
  await button('Apply hint').click();
  assert.equal((await board(T)).told, 'apart', 'the hints try a split first');
  assert.match(await page.locator('.hint-card').innerText(), /no split meets/);
  await button('Apply hint').click();
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
