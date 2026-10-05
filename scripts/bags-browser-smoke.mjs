// Plays Fair bags through the real interface: drawing pairs by tapping
// counters (by keyboard too), Keep, a repeat, Again, an early That's all and
// Undo; rules set row by row with the pairs moving between piles, solved at
// once; the fewest-skips Done and its note; the busiest bag's flips; hint
// solves; and the playground up to its sixty draws. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone viewport).
// Screenshots go in test-results/bags/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/bags/', import.meta.url);
const shot = async name => { await page.waitForTimeout(900); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="bags"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const counter = id => page.locator(`.case-bag button[data-counter="${id}"]`);
const at = i => page.locator(`.case-bag button[data-at="${i}"]`);
const choice = (cls, shape) => page.locator(`[data-focus="set-${cls}-${shape}"]`);
const pile = shape => page.locator(`.case-bin[data-bin="${shape}"] .case-kept`);
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
  await page.goto(base); await page.locator('#nickname').fill('Bag QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  // Which family is newest (and starts open) is checked by families-browser-smoke.mjs.
  assert.equal(await page.locator('.satchel-family[data-view-key="family-bags"]').count(), 1, 'in the satchel');

  // Every pair: draw, Keep, a repeat, Again, That's all early, Undo.
  const P1 = 'bags-01';
  await open(P1); await fit('every pair'); await shot('01-start');
  assert.equal(await button('Keep').isDisabled(), true);
  await counter('R2').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P1)).draw, ['R2']);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'counter-1', 'keyboard focus stays on the counter');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board(P1)).draw, ['R2', 'R2'], 'the same counter twice');
  assert.equal(await counter('B1').isDisabled(), true, 'two draws only');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'bag-keep', 'a full draw hands keyboard focus to Keep');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.case-bin[data-bin="R2"] .case-kept').count(), 1, 'filed under its first counter');
  assert.deepEqual((await board(P1)).draw, [], 'Keep empties the draw');
  assert.equal(await counter('B1').isDisabled(), false);
  await tap(counter('R2')); await tap(counter('R2'));
  assert.equal(await button('Keep').isDisabled(), true, 'kept once');
  assert.equal(await page.locator('.case-kept.current[data-key="R2R2"]').count(), 1, 'the kept pair lights up');
  await tap(page.locator('.case-kept.current'));
  assert.equal(await refused(), 0, 'kept pairs are pictures');
  await button('Again').click();
  await button('That’s all').click();
  await page.getByText('There’s another.').waitFor();
  assert.equal(await button('That’s all').isDisabled(), true, 'not twice in a row');
  await tap(counter('B1')); await tap(counter('R1')); await button('Keep').click();
  assert.equal(await page.locator('.case-bin[data-bin="B1"] .case-kept').count(), 1);
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(P1)).draw, ['B1', 'R1'], 'Undo takes the Keep back');
  await fit('every pair shelf'); await shot('01-shelf');
  await hintSolve();
  assert.equal((await board(P1)).kept.length, 9);
  await fit('every pair solved'); await shot('01-solved');

  // Rules: whole colour pairs move between piles; a working rule solves.
  const P2 = 'bags-02';
  await open(P2);
  assert.equal(await pile('X').count(), 16, 'everything starts skipped');
  await tap(choice('RR', 'S')); await tap(choice('RB', 'S')); await tap(choice('BR', 'C'));
  assert.equal(await page.locator('#completion-heading').count(), 0, 'eight squares, four circles, four skips');
  await tap(choice('BB', 'C'));
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal((await board(P2)).rule, 'SSCC');

  const P3 = 'bags-03';
  await open(P3);
  assert.deepEqual([await pile('S').count(), await pile('C').count(), await pile('X').count()], [12, 4, 0], 'the first counter’s colour decides');
  assert.equal(await choice('RR', 'S').getAttribute('aria-pressed'), 'true');
  await tap(choice('RR', 'S'));
  assert.equal(await refused(), 0, 'tapping the chosen shape again is quiet');
  await choice('RB', 'C').focus(); await page.keyboard.press('Enter');
  assert.deepEqual([await pile('S').count(), await pile('C').count()], [9, 7], 'red-blue brings three pairs');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'set-RB-C', 'keyboard focus stays on the choice');
  await shot('03-uneven');
  await tap(choice('RR', 'X')); await tap(choice('BR', 'S'));
  assert.equal(await page.locator('#completion-heading').count(), 0, 'three squares, four circles');
  await tap(choice('BB', 'X'));
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal((await board(P3)).rule, 'XCSX');
  await fit('rule solved'); await shot('03-solved');

  const P5 = 'bags-05';
  await open(P5);
  assert.equal(await pile('X').count(), 12, 'no counter twice: twelve pairs');
  await tap(choice('RR', 'S')); await tap(choice('RB', 'C')); await tap(choice('BR', 'C'));
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal((await board(P5)).rule, 'SCCX', 'blue-blue never comes, so its skip skips nothing');

  // Fewest skips: von Neumann's rule gets the note; a better rule solves.
  const P6 = 'bags-06';
  await open(P6);
  assert.equal(await button('Done').isDisabled(), true, 'no Done on an unfair rule');
  await tap(choice('RR', 'X')); await tap(choice('BB', 'X'));
  await button('Done').click();
  await page.getByText('You can skip fewer.').waitFor();
  assert.equal(await button('Done').isDisabled(), true);
  await shot('06-note');
  await tap(choice('RR', 'S'));
  assert.equal(await page.getByText('You can skip fewer.').count(), 0, 'a change clears the note');
  await tap(choice('RB', 'C'));
  assert.equal(await page.locator('#completion-heading').count(), 0, 'a fair rule waits for Done');
  await button('Done').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal((await board(P6)).rule, 'SCCX');

  // Busiest bag: the rule is set; flips re-sort the piles.
  const P4 = 'bags-04';
  await open(P4);
  assert.equal(await choice('RB', 'S').isDisabled(), true, 'the rule is set');
  assert.equal(await pile('S').count() + await pile('C').count(), 6);
  await button('Done').click();
  await page.getByText('The skip pile can be smaller.').waitFor();
  await tap(at(0));
  assert.equal((await board(P4)).colours, 'BRRB');
  assert.equal(await pile('S').count() + await pile('C').count(), 8, 'two of each');
  await button('Done').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  await fit('busiest'); await shot('04-solved');

  // Two bags and six counters by hints.
  for (const id of ['bags-07', 'bags-08']) {
    await open(id);
    await hintSolve();
    await fit(id); await shot(`${id.slice(-2)}-solved`);
  }
  assert.equal((await board('bags-07')).rule[0], (await board('bags-07')).rule[3] === 'S' ? 'C' : 'S', 'red-red against blue-blue');

  // The playground: flip, add, take away, a rule, random draws, Clear.
  const PG = 'bags-playground';
  await open(PG);
  await tap(at(3));
  assert.equal((await board(PG)).colours, 'RRRR');
  assert.equal(await at(3).getAttribute('aria-label'), 'fourth counter, red');
  await page.getByRole('button', {name: 'One counter more'}).click();
  await page.getByRole('button', {name: 'One counter more'}).click();
  assert.equal(await page.locator('.case-bag button.case-counter').count(), 6);
  await page.getByRole('button', {name: 'One counter fewer'}).click();
  assert.equal((await board(PG)).colours, 'RRRRB');
  await button('Draw 10').click();
  assert.equal((await board(PG)).draws.length, 10);
  assert.equal(await page.locator('.case-bin .case-kept').count(), 10);
  await tap(choice('RR', 'S'));
  assert.equal((await board(PG)).draws.length, 10, 'a new rule re-sorts');
  await button('Draw').click();
  assert.equal((await board(PG)).draws.length, 11);
  await fit('playground'); await shot('playground');
  await button('Clear').click();
  assert.deepEqual((await board(PG)).draws, []);
  await button('Draw 10').focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('Enter');
  assert.equal((await board(PG)).draws.length, 60);
  assert.equal(await button('Draw 10').isDisabled(), true, 'sixty draws at most');
  assert.equal(await button('Draw').isDisabled(), true);
  assert.equal(await page.evaluate(() => document.activeElement?.matches('.case-counter')), false, 'keyboard focus never lands on a counter');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
