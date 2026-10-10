// Plays Card machines through the real interface: one objective line on every
// puzzle; arrows placed by dragging a chip onto a circle, by tapping the chip
// and then the circle, and by Enter; Escape puts a chip down; a tap switches a
// circle's mark; Test with its row on a wrong machine, waiting while the
// machine still gets that row wrong, and a solve on a right one; Restart
// keeping Test's rows; Hint up to Apply hint; pairs split by the R and B keys,
// typed letters and Backspace; Can't cancelled by Escape, a wrong circle
// refused and the right one accepted, on the drawn machine and on the child's
// own once it passes; a machine that passes and then rows and endings that
// show fewer circles are not enough; rows typed with the keyboard; and the
// playground's −, +, Mix and bench row. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/cardmachines/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/cardmachines/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.cm-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const chip = (s, card) => page.locator(`[data-chip="${s},${card}"]`);
const circle = i => page.locator(`[data-circle="${i}"]`);
const button = name => page.getByRole('button', {name, exact: true});
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
// Playwright's own tap and click wait for the target to be visible and still.
const tap = locator => (phone ? locator.tap() : locator.click());
// A drag is a mouse drag on a desktop and a touch drag on a phone.
let cdp = null;
async function drag(from, to) {
  const a = await center(from), b = await center(to), steps = 10;
  if (!phone) {
    await page.mouse.move(...a); await page.mouse.down();
    await page.mouse.move(...b, {steps}); await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let s = 1; s <= steps; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps]);
  await touch('touchEnd', b);
}
// Each arrow by tapping its chip and then its circle.
async function place(list) { for (const [s, card, t] of list) { await tap(chip(s, card)); await tap(circle(t)); } }
const testButton = () => page.locator('.cm-test-button');
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Machines QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.ok(await page.locator('.caravan-library').innerText().then(t => t.includes('Card machines')), 'the satchel lists Card machines');
  // At most one objective line on each puzzle: the page's or the board's.
  const goals = async () => await page.locator('.puzzle-goal').count() + await page.locator('.cm-goal').count();
  for (let n = 0; n <= 11; n++) { await open(n ? `cardmachines-${String(n).padStart(2, '0')}` : 'cardmachines-playground'); assert.ok(await goals() <= 1, `puzzle ${n}: one objective line`); }

  // Puzzle 1: drag, tap-tap, Enter, Escape, marks, Test.
  const P = 'cardmachines-01';
  await open(P); await fit('build');
  assert.equal(await page.locator('.puzzle-goal').innerText(), '✓ when the last card is blue.');
  assert.equal(await testButton().isDisabled(), true, 'Test waits for every arrow');
  await drag(chip(0, 'R'), circle(0));
  assert.deepEqual((await board(P)).arrows[0], [0, null], 'a drag onto a circle points the arrow there');
  await tap(chip(0, 'B'));
  assert.equal(await chip(0, 'B').getAttribute('aria-pressed'), 'true', 'a tap picks up a chip');
  await page.keyboard.press('Escape');
  assert.equal(await chip(0, 'B').getAttribute('aria-pressed'), 'false', 'Escape puts it down');
  await tap(chip(0, 'B')); await tap(circle(1));
  assert.deepEqual((await board(P)).arrows[0], [0, 1], 'tap the chip, then the circle');
  assert.equal(await page.locator('.cm-chip.armed').count(), 0, 'placing an arrow puts the chip down');
  await chip(1, 'R').focus(); await page.keyboard.press('Enter');
  await circle(0).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P)).arrows[1], [0, null], 'Enter on the chip, then on the circle');
  await drag(chip(1, 'B'), circle(1));
  assert.deepEqual((await board(P)).arrows, [[0, 1], [0, 1]]);
  await shot('build-placed');
  await testButton().click();
  assert.deepEqual((await board(P)).tests, ['B'], 'every circle × is wrong first on B');
  assert.equal(await page.locator('.cm-test').count(), 1);
  assert.equal(await page.locator('.cm-test.off').count(), 1, 'the machine disagrees on the row shown');
  assert.equal(await page.locator('.cm-marker.trace').count(), 1, 'the row’s end on the machine');
  assert.equal(await testButton().isDisabled(), true, 'one Test per machine');
  await shot('build-test');
  await tap(circle(0));
  assert.equal(await testButton().isDisabled(), true, 'Test waits while the machine still gets B wrong');
  await tap(circle(0));
  assert.equal(await testButton().isDisabled(), true, 'the tested machine again: Test still waits');
  await tap(circle(1));
  assert.deepEqual((await board(P)).marks, [false, true], 'a tap switches the mark');
  assert.equal(await page.locator('.cm-test.off').count(), 0, 'the new machine gets B right');
  await testButton().click();
  await done(); await fit('build solved');

  // Puzzle 2: Restart keeps the rows Test showed.
  const R = 'cardmachines-02';
  await open(R);
  await place([[0, 'R', 0], [0, 'B', 0], [1, 'R', 1], [1, 'B', 1]]);
  await testButton().click();
  assert.deepEqual((await board(R)).tests, ['R']);
  await button('Restart').click();
  assert.deepEqual((await board(R)).tests, ['R'], 'Restart keeps the rows Test showed');
  assert.equal((await board(R)).presses, 1, 'and the count of presses');
  assert.deepEqual((await board(R)).arrows, [[null, null], [null, null]], 'the arrows start again');
  assert.equal(await page.locator('.cm-test').count(), 1);

  // Puzzle 5: Hint up to Apply hint, with the hinted chip marked on the board.
  const H = 'cardmachines-05';
  await open(H);
  await button('Hint').click(); await button('Hint').click();
  assert.ok(await page.locator('.cm-chip.hinted').count() === 1 && await page.locator('.cm-circle.hinted').count() === 1, 'the hinted chip and circle are marked');
  await button('Hint').click(); await button('Apply hint').click();
  assert.deepEqual((await board(H)).arrows[0], [1, null], 'Apply hint places circle 1’s R arrow on circle 2');

  // Puzzle 4: Can't and Escape, a wrong circle, keys and letters, the right circle.
  const S = 'cardmachines-04';
  await open(S); await fit('split');
  assert.equal(await page.locator('.cm-pair').count(), 4);
  assert.equal(await page.locator('.cm-pair.split').count(), 1, 'no cards and R are split already');
  await button('Can’t').click();
  assert.equal(await page.locator('svg.cm-machine.claim').count(), 1, 'Can’t makes the circles buttons');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('svg.cm-machine.claim').count(), 0, 'Escape cancels');
  await button('Can’t').click(); await tap(circle(1));
  assert.equal((await board(S)).refused[1], true, 'R and R R can be split');
  assert.equal(await page.locator('.cm-told').innerText(), 'Keep looking.');
  await page.locator('.cm-end').nth(1).click();
  await page.keyboard.press('b'); await page.keyboard.press('Backspace'); await page.keyboard.press('r');
  assert.equal((await board(S)).ends[1], 'R', 'letters and Backspace type the ending');
  assert.equal((await board(S)).refused[1], false, 'a new ending clears the refusal');
  assert.equal(await page.locator('.cm-pair.split').count(), 2, 'one ✓ and one ×');
  await tap(page.locator('.cm-end').nth(2));
  await button('Can’t').click(); await tap(circle(0));
  assert.equal((await board(S)).refused[2], true, 'R R and B don’t stop on circle 1');
  await button('Can’t').click(); await tap(circle(2));
  assert.equal((await board(S)).cant[2], true, 'both stop on circle 3');
  assert.equal(await page.locator('.cm-cant-mark .cm-at').first().innerText(), '3', 'the circle is drawn with the claim');
  assert.equal(await page.locator('.cm-machine').count(), 1, 'no second machine');
  await shot('split-cant');
  await tap(page.locator('.cm-end').nth(3)); await button('Can’t').click(); await tap(circle(0));
  await done(); await fit('split solved');

  // Puzzle 6: build the machine, then split pairs and name circles on it.
  const T = 'cardmachines-06';
  await open(T);
  assert.equal(await page.locator('.cm-goal').innerText(), '✓ when the last two cards are red then blue.');
  assert.equal(await goals(), 1, 'one objective line while building');
  assert.equal(await page.locator('.cm-pair').count(), 0, 'the pairs wait for the machine');
  await place([[0, 'R', 1], [0, 'B', 0], [1, 'R', 1], [1, 'B', 2], [2, 'R', 1], [2, 'B', 0]]);
  await tap(circle(2));
  await testButton().click();
  assert.equal(await page.locator('.cm-goal').innerText(), 'Add the same cards to both rows to get one ✓ and one ×.');
  assert.equal(await goals(), 1, 'one objective line once the machine passes');
  assert.equal(await page.locator('.cm-pair').count(), 4);
  assert.equal(await page.locator('[data-chip]').count(), 0, 'the machine is locked once it passes');
  await fit('split after building');
  await button('Add B').click();
  assert.equal(await page.locator('.cm-pair.split').count(), 1, 'B splits no cards from R');
  await tap(page.locator('.cm-end').nth(1)); await button('Can’t').click(); await tap(circle(1));
  assert.equal((await board(T)).cant[1], true, 'R and B R both stop on circle 2 of this machine');
  await shot('split-own');
  await tap(page.locator('.cm-end').nth(2)); await button('Add B').click();
  await tap(page.locator('.cm-end').nth(3)); await button('Can’t').click(); await tap(circle(0));
  await done();

  // Puzzle 9: a machine that passes, then rows and an ending.
  const F = 'cardmachines-09';
  await open(F);
  assert.equal(await page.locator('.cm-rows').count(), 0, 'rows wait for the machine');
  assert.equal(await page.locator('.cm-goal').innerText(), '✓ when two red cards have come next to each other.');
  await place([[0, 'R', 1], [0, 'B', 0], [1, 'R', 2], [1, 'B', 0], [2, 'R', 2], [2, 'B', 2]]);
  await tap(circle(2));
  await testButton().click();
  assert.equal(await page.locator('.cm-goal').innerText(), 'Show 2 circles are not enough for ✓ when two red cards have come next to each other.');
  assert.equal(await goals(), 1, 'one objective line once the machine passes');
  assert.equal(await page.locator('[data-chip]').count(), 0, 'the machine is locked once it passes');
  assert.equal(await page.locator('.cm-row').nth(0).getAttribute('aria-pressed'), 'true', 'row 1 is chosen first');
  await fit('prove');
  await page.locator('.cm-row').nth(1).click(); await button('Add R').click();
  await page.locator('.cm-row').nth(2).click(); await button('Add R').click(); await button('Add R').click();
  assert.deepEqual((await board(F)).rows, ['', 'R', 'RR']);
  assert.equal(await page.locator('.cm-marker.d3').count(), 1, 'each row’s marker on the machine');
  await page.locator('.cm-end').nth(0).click();
  assert.equal(await page.locator('.cm-marker.d1').count() + await page.locator('.cm-marker.d2').count(), 2, 'the chosen pair’s two markers');
  await shot('prove');
  await button('Add R').click();
  await done(); await fit('prove solved');

  // Puzzle 11: rows and endings by keyboard.
  const E = 'cardmachines-11';
  await open(E); await fit('equal');
  assert.match(await page.locator('.puzzle-goal').innerText(), /^Show 3 circles are not enough/);
  const type = async (locator, keys) => { await locator.click(); for (const k of keys) await page.keyboard.press(k); };
  await type(page.locator('.cm-row').nth(1), ['r']);
  await type(page.locator('.cm-row').nth(2), ['r', 'r']);
  await type(page.locator('.cm-row').nth(3), ['r', 'r', 'b', 'Backspace', 'r']);
  assert.deepEqual((await board(E)).rows, ['', 'R', 'RR', 'RRR']);
  await type(page.locator('.cm-end').nth(3), ['b']);
  await type(page.locator('.cm-end').nth(4), ['b']);
  await type(page.locator('.cm-end').nth(5), ['b', 'b']);
  await done();

  // The playground.
  const G = 'cardmachines-playground';
  await open(G); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await page.getByRole('button', {name: 'More circles'}).click();
  assert.equal((await board(G)).marks.length, 3);
  await drag(chip(2, 'R'), circle(0));
  assert.equal((await board(G)).arrows[2][0], 0);
  await page.getByRole('button', {name: 'Fewer circles'}).click();
  assert.equal((await board(G)).marks.length, 2);
  await button('Add R').click(); await button('Add B').click(); await button('Add R').click();
  assert.equal((await board(G)).row, 'RBR');
  await button('Take back a card').click();
  assert.equal((await board(G)).row, 'RB');
  assert.equal(await page.locator('.cm-marker.trace').count(), 1);
  const before = JSON.stringify((await board(G)).arrows);
  for (let n = 0; n < 6 && JSON.stringify((await board(G)).arrows) === before; n++) await button('Mix').click();
  assert.notEqual(JSON.stringify((await board(G)).arrows), before, 'Mix makes a new machine');
  await shot('playground');
  await button('Clear the row').click();
  assert.equal((await board(G)).row, '');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
