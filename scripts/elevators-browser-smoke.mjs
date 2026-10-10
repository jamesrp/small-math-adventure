// Plays Doubling elevators through the real interface: the move buttons and
// their names, taps on the rings and elsewhere on the board, arrow keys, moves
// refused at the ground, the top level and the edge of the window, the move
// slots, Undo, a dead end, a farthest puzzle, a solve by hints and the
// playground with Clear. Same environment variables as the other browser
// suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a
// phone viewport with touch). Screenshots go in test-results/elevators/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/elevators/', import.meta.url);
const shot = async name => { await page.waitForTimeout(400); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const word = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board.word ?? '', [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="elevators"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const button = name => page.getByRole('button', {name, exact: true});
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
// A child's next tap comes after the car has finished sliding.
const tap = async locator => { await page.waitForTimeout(300); const b = await locator.boundingBox(); await tapAt(b.x + b.width / 2, b.y + b.height / 2); };
const ring = dir => page.locator(`.elv-dest[data-dir="${dir}"]`);
const refused = () => page.getByText('That move is not allowed').count();
const filled = () => page.locator('.elv-played').count();
const empty = () => page.locator('.elv-slot').count();
const keys = async letters => { for (const c of letters) await page.keyboard.press({U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight'}[c]); };
const solved = () => page.locator('#completion-heading').count();
async function hintSolve() {
  const hint = button('Hint');
  for (let i = 0; i < 3; i++) await hint.click();
  for (let s = 0; !await solved() && s < 40; s++) await button('Apply hint').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Elevator QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-elevators"] [data-id]').count(), 13, 'the playground and twelve puzzles in the satchel');

  // Three: the buttons, the slots, a refused Down, a tap on the right ring.
  const P1 = 'elevators-01';
  await open(P1); await fit('three'); await shot('01-start');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no objective line over a flag');
  assert.equal(await empty(), 3);
  assert.equal(await button('Down').isDisabled(), true, 'no going below the ground');
  assert.equal(await button('Right 1').isEnabled(), true);
  await button('Right 1').click();
  assert.equal(await word(P1), 'R');
  assert.equal(await filled(), 1); assert.equal(await empty(), 2);
  await tap(ring('R'));
  assert.equal(await word(P1), 'RR', 'a tap on the right ring steps right');
  await tap(page.locator('.elv-car-body'));
  assert.equal(await word(P1), 'RR', 'a tap on the car does nothing');
  await tap(page.locator('.elv-here'));
  assert.equal(await word(P1), 'RR', 'a tap on the car does nothing');
  await button('Up').click();
  assert.equal(await button('Up').isDisabled(), true, 'the top level');
  assert.equal(await button('Right 2').isEnabled(), false, 'the budget is spent');
  assert.equal(await page.locator('.elv-dest').count(), 0, 'no rings once the budget is spent');
  await page.getByText('Too few moves are left. Undo.').waitFor();
  await page.locator('[data-action="undo"]').click();
  assert.equal(await word(P1), 'RR');
  await button('Right 1').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  await fit('three solved'); await shot('01-solved');

  // Sixteen: arrow keys on the board, a refused key at the ground, a tap away
  // from every ring, the button names at each level, both trips.
  const P5 = 'elevators-05';
  await open(P5);
  await page.locator('.elv-field').focus();
  await keys('D');
  assert.equal(await word(P5), '', 'Down on the ground is ignored');
  assert.equal(await refused(), 0);
  await keys('UUU');
  assert.equal(await word(P5), 'UUU');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'elevator-board', 'the board keeps the focus');
  assert.equal(await button('Right 8').count(), 1, 'the right button names the step on level 3');
  assert.equal(await button('Left 8').isDisabled(), true, 'a step of 8 left would leave the window');
  assert.equal(await ring('L').count(), 0);
  const svg = await page.locator('[data-elv-svg]').boundingBox();
  await tapAt(svg.x + svg.width - 4, svg.y + svg.height - 30);
  assert.equal(await word(P5), 'UUU', 'a tap far from every ring does nothing');
  assert.equal(await refused(), 0);
  await tap(ring('R'));
  assert.equal(await word(P5), 'UUUR');
  assert.equal(await page.locator('svg[preserveAspectRatio="none"] .elv-trail').count(), 1, 'the step is an arc');
  await shot('05-climb');
  await keys('RDDD');
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal(await word(P5), 'UUURRDDD');
  await button('Replay').click();
  assert.equal(await word(P5), '');
  await page.locator('.elv-field').focus();
  await keys('UURRRRDD');
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal(await word(P5), 'UURRRRDD', 'the other eight-move trip solves too');

  // Twenty-three: a wasted move is a dead end; the hint marks the move, and hints finish.
  const P9 = 'elevators-09';
  await open(P9);
  await button('Right 1').click();
  await page.getByText('Too few moves are left. Undo.').waitFor();
  await page.locator('[data-action="undo"]').click();
  await button('Hint').click();
  await page.getByText('Try going past the flag.').waitFor();
  await button('Hint').click();
  await page.locator('.hint-card').getByText('Go up.').waitFor();
  assert.equal(await page.locator('.elv-move.hinted').getAttribute('aria-label'), 'Up');
  assert.equal(await page.locator('.elv-dest.hinted').getAttribute('data-dir'), 'U');
  await shot('09-hint');
  await button('Hint').click();
  for (let s = 0; !await solved() && s < 20; s++) await button('Apply hint').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal(await word(P9), 'UUURRRDDDL');
  await fit('twenty-three solved'); await shot('09-solved');

  // Farthest in nine: one line of goal, no flag; 20 on the ground is not enough.
  const P8 = 'elevators-08';
  await open(P8);
  assert.equal((await page.locator('.puzzle-goal').innerText()).trim(), 'Go as far right as you can.');
  assert.equal(await page.locator('.elv-flag').count(), 0);
  await page.locator('.elv-field').focus();
  await keys('UURRRRRDD');
  assert.equal(await solved(), 0, 'ending at 20 does not solve');
  await page.getByText('Some trip goes farther. Undo.').waitFor();
  await shot('08-short');
  for (let i = 0; i < 9; i++) await page.locator('[data-action="undo"]').click();
  assert.equal(await word(P8), '');
  await page.locator('.elv-field').focus();
  await keys('UUURRRDDD');
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  await fit('farthest solved'); await shot('08-solved');

  // Sixty-three on the densest board: hints alone.
  const P11 = 'elevators-11';
  await open(P11); await fit('sixty-three');
  await hintSolve();
  assert.equal((await word(P11)).length, 13);
  await shot('11-solved');

  // The playground: moves, no Hint, Clear and Undo.
  const PG = 'elevators-playground';
  await open(PG);
  assert.equal(await button('Hint').count(), 0);
  assert.equal(await button('Clear').isDisabled(), true);
  await page.locator('.elv-field').focus();
  await keys('UUUUURRDDDDD');
  assert.equal(await word(PG), 'UUUUURRDDDDD');
  assert.equal(await filled(), 12);
  await shot('playground');
  await button('Clear').click();
  assert.equal(await word(PG), '');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await word(PG), 'UUUUURRDDDDD', 'Undo brings the trip back');
  await fit('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
