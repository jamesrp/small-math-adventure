// Plays Copying bags through the real interface: drawing by tapping counters
// (by keyboard too) and watching the copy join the bag, the goal bag, Again,
// a make puzzle solved; Keep (by keyboard too), a repeat, an early That's all and Undo; a history puzzle and
// the catalog after a hint solve; yellow counters; and the playground's rules,
// runs and columns, up to a hundred runs. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// viewport). Screenshots go in test-results/copies/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/copies/', import.meta.url);
const shot = async name => { await page.waitForTimeout(900); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="copies"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const counter = id => page.locator(`.copy-bag button[data-counter="${id}"]`);
const bag = () => page.locator('.copy-bag button[data-counter]').evaluateAll(cs => cs.map(c => c.dataset.counter));
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const button = name => page.getByRole('button', {name, exact: true});
const refused = () => page.getByText('That move is not allowed').count();
async function hintSolve() {
  const hint = page.getByRole('button', {name: 'Hint', exact: true});
  for (let i = 0; i < 3; i++) await hint.click();
  const apply = page.getByRole('button', {name: 'Apply hint', exact: true});
  for (let s = 0; !await page.locator('#completion-heading').count() && s < 150; s++) await apply.click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Copy QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  // Which family is newest (and starts open) is checked by families-browser-smoke.mjs.
  assert.equal(await page.locator('.satchel-family[data-view-key="family-copies"]').count(), 1, 'in the satchel');

  // Make a bag: a copy joins after each draw; Again.
  const P1 = 'copies-01';
  await open(P1); await fit('make'); await shot('01-start');
  assert.deepEqual(await bag(), ['R1', 'B1']);
  assert.equal(await page.getByRole('img', {name: 'The bag to make: 2 red, 3 blue'}).count(), 1, 'the goal bag');
  await counter('R1').focus(); await page.keyboard.press('Enter');
  assert.deepEqual(await bag(), ['R1', 'R2', 'B1'], 'red 2 joins');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'counter-R1', 'keyboard focus stays on red 1');
  await tap(counter('R2'));
  assert.deepEqual((await board(P1)).draws, ['R1', 'R2']);
  await tap(counter('B1'));
  assert.equal(await counter('B1').isDisabled(), true, 'three draws, then the bag is still');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'three red and two blue');
  await button('Again').click();
  assert.deepEqual(await bag(), ['R1', 'B1']);
  await tap(counter('B1')); await tap(counter('B2')); await tap(counter('R1'));
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  await fit('make solved'); await shot('01-solved');

  // Every bag: Keep, a repeat lights up, That's all early, Undo.
  const P2 = 'copies-02';
  await open(P2);
  await counter('R1').focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'copy-keep', 'a full row hands keyboard focus to Keep');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board(P2)).kept, ['RRRRB']);
  assert.deepEqual((await board(P2)).draws, [], 'Keep empties the draws');
  for (const id of ['R1', 'R2', 'R3']) await tap(counter(id));
  assert.equal(await button('Keep').isDisabled(), true, 'the same bag again');
  assert.equal(await page.locator('.case-kept.current').count(), 1);
  await button('Again').click();
  await button('That’s all').click();
  await page.getByText('There’s another.').waitFor();
  assert.equal(await button('That’s all').isDisabled(), true, 'not twice in a row');
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board(P2)).missed, false, 'Undo takes it back');
  await fit('every bag'); await shot('02-shelf');

  // Two reds in three: a hint solve, then the catalog of 24.
  const P7 = 'copies-07';
  await open(P7);
  assert.equal(await page.locator('.case-bin').count(), 3, 'a column per colour order');
  await hintSolve();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 24);
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 6);
  assert.deepEqual(await page.locator('.case-catalog .copy-reds').allTextContents(), ['3 red', '2 red', '1 red', 'no red']);
  await fit('two reds'); await shot('07-solved');

  // Three colours.
  const P9 = 'copies-09';
  await open(P9);
  assert.deepEqual(await bag(), ['R1', 'B1', 'Y1']);
  await tap(counter('Y1'));
  assert.deepEqual(await bag(), ['R1', 'B1', 'Y1', 'Y2'], 'yellow 2 joins');
  await hintSolve();
  assert.equal((await board(P9)).kept.length, 12);
  await fit('three colours'); await shot('09-solved');

  // The playground: a run by hand, Finish, 10 runs, another rule, Clear.
  const PG = 'copies-playground';
  await open(PG);
  for (const id of ['R1', 'R2', 'B1']) await tap(counter(id));
  await button('Finish').click();
  assert.equal((await board(PG)).runs.length, 1, 'a finished run is filed');
  assert.deepEqual(await bag(), ['R1', 'B1'], 'after a finished run the bag is back to one of each');
  assert.equal((await board(PG)).draws.length, 4, 'the finished run stays in the draw row');
  await button('10 runs').click();
  assert.equal((await board(PG)).runs.length, 11);
  assert.equal(await page.locator('.copy-dot').count(), 11);
  await fit('playground'); await shot('playground');
  await button('Just put back').click();
  assert.deepEqual(await board(PG), {rule: 'return', draws: [], runs: []});
  assert.equal(await button('Just put back').getAttribute('aria-pressed'), 'true');
  await tap(counter('R1'));
  assert.deepEqual(await bag(), ['R1', 'B1'], 'no copy now');
  await button('Just put back').click();
  assert.equal(await refused(), 0, 'tapping the chosen rule again is quiet');
  await button('Draw').click();
  assert.equal((await board(PG)).draws.length, 2);
  await button('Clear').click();
  assert.deepEqual((await board(PG)).runs, []);
  await button('10 runs').focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('Enter');
  assert.equal((await board(PG)).runs.length, 100);
  assert.equal(await button('10 runs').isDisabled(), true, 'a hundred runs at most');
  assert.equal(await button('Draw').isDisabled(), true);
  assert.equal(await counter('R1').isDisabled(), true, 'the bag is still');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'copy-clear', 'keyboard focus stays among the buttons');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
