// Plays Hidden sides through the real interface: drawing sides by tapping
// them (by keyboard too) with the other side covered, turning the card over
// and sorting the side, a wrong pile, a repeat, an early That's all and Undo;
// a design by switches with Try it and its notes; Keep refusing a cup that
// doesn't tie and showing its red sides; a hint solve with the catalog of 63;
// whole cards with Can't and its catalog, copies, and + and − by keyboard;
// and the playground up to its sixty draws, with nothing covered. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone viewport).
// Screenshots go in test-results/sides/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/sides/', import.meta.url);
const shot = async name => { await page.waitForTimeout(900); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="sides"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const side = n => page.locator(`button.side-face[data-focus="side-${n}"]`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const button = name => page.getByRole('button', {name, exact: true});
const focused = () => page.evaluate(() => document.activeElement?.dataset.focus);
const refused = () => page.getByText('That move is not allowed').count();
const sortTo = c => page.getByRole('button', {name: `Keep it: ${c} underneath`, exact: true});
async function hintSolve() {
  const hint = page.getByRole('button', {name: 'Hint', exact: true});
  for (let i = 0; i < 3; i++) await hint.click();
  const apply = page.getByRole('button', {name: 'Apply hint', exact: true});
  for (let s = 0; !await page.locator('#completion-heading').count() && s < 150; s++) await apply.click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Side QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  // Which family is newest (and starts open) is checked by families-browser-smoke.mjs.
  assert.equal(await page.locator('.satchel-family[data-view-key="family-sides"]').count(), 1, 'in the satchel');

  // Red shows: draw, the other side covered, turn it over, sort, a repeat, That's all early, Undo.
  const P1 = 'sides-01';
  await open(P1); await fit('red shows'); await shot('01-start');
  assert.equal(await sortTo('red').isDisabled(), true);
  await side(3).focus(); await page.keyboard.press('Enter');
  assert.equal((await board(P1)).shown, 3);
  assert.equal(await side(4).textContent(), '?', 'the other side is covered');
  assert.equal(await sortTo('blue').isDisabled(), true, 'no sorting before the card is turned over');
  assert.equal(await focused(), 'side-4', 'a side that can be sorted hands keyboard focus to the covered side');
  await shot('01-drawn');
  await page.keyboard.press('Enter');
  assert.equal((await board(P1)).looked, true);
  assert.equal(await side(4).textContent(), '4', 'turned over');
  assert.equal(await focused(), 'side-keepR', 'then to the first pile');
  await shot('01-turned');
  await page.keyboard.press('Enter');
  assert.equal((await board(P1)).kept.length, 0, 'the wrong pile is refused');
  await sortTo('blue').click();
  assert.deepEqual((await board(P1)).kept, ['3']);
  assert.equal(await page.locator('.case-bin[data-bin="B"] .case-kept').count(), 1, 'with blue underneath');
  await tap(side(3));
  await tap(side(4));
  assert.equal(await sortTo('blue').isDisabled(), true, 'kept once');
  assert.equal(await page.locator('.case-kept.current[data-key="3"]').count(), 1);
  await tap(side(3));
  assert.equal(await refused(), 0, 'tapping the side showing is quiet');
  await tap(side(5)); await tap(side(6));
  assert.equal(await sortTo('blue').isDisabled(), true, 'blue shows: not this puzzle');
  await button('That’s all').click();
  await page.getByText('There’s another.').waitFor();
  assert.equal(await button('That’s all').isDisabled(), true, 'not twice in a row');
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board(P1)).missed, false, 'Undo takes it back');
  for (const n of [1, 2]) { await tap(side(n)); await tap(side(n + (n === 1 ? 1 : -1))); await sortTo('red').click(); }
  await button('That’s all').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal(await page.locator('.case-bin[data-bin="R"] .case-kept').count(), 2, 'two red sides hide red');
  await fit('red shows solved'); await shot('01-solved');

  // Only 1 and 3: the others can't be drawn.
  await open('sides-03');
  assert.equal(await side(2).isDisabled(), true, 'side 2 is not in the cup');
  assert.equal(await side(5).isDisabled(), true);
  assert.equal(await page.getByRole('img', {name: 'In the cup: sides 1, 3'}).count(), 1, 'the cup');
  await shot('03-start');

  // A design: switches, Try it and its notes.
  const P4 = 'sides-04';
  await open(P4);
  assert.equal(await page.locator('.case-bins').count(), 0, 'nothing sorted before Try it');
  await button('Try it').click();
  await page.getByText('Not a tie.').waitFor();
  assert.equal(await button('Try it').isDisabled(), true);
  await shot('04-not-yet');
  await side(1).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P4)).cup, [2, 3, 4, 5, 6]);
  assert.equal(await side(1).getAttribute('aria-pressed'), 'false');
  assert.equal(await focused(), 'side-1', 'keyboard focus stays on the switch');
  assert.equal(await page.getByText('Not a tie.').count(), 0, 'a change clears the note');
  await button('Try it').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  await fit('design solved'); await shot('04-solved');

  // Every tie: Keep refuses a cup that doesn't tie; a hint solve and the catalog.
  const P7 = 'sides-07';
  await open(P7);
  await button('Keep').click();
  await page.getByText('Not a tie.').waitFor();
  assert.equal(await page.locator('.case-bins[aria-label="Red sides in the cup, by the colour underneath"] .case-kept').count(), 3, 'the refused cup’s red sides, sorted');
  assert.equal(await button('Keep').isDisabled(), true, 'Keep greys until the cup changes');
  await shot('07-refused');
  await tap(side(2));
  assert.equal(await button('Keep').isDisabled(), false);
  await button('Keep').click();
  assert.deepEqual((await board(P7)).kept, ['13456']);
  await hintSolve();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 63);
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 16);
  await fit('every tie'); await shot('07-solved');

  // Whole cards: one of each at most, Try it, Can't and the catalog of seven tables.
  const P8 = 'sides-08';
  await open(P8);
  await button('Try it').click();
  await page.getByText('Not a tie.').waitFor();
  assert.equal(await page.getByRole('button', {name: 'One red card more'}).isDisabled(), true, 'one of each card at most');
  await button('Can’t').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 7, 'the seven tables');
  await fit('whole cards'); await shot('08-solved');

  // Copies: Can't is refused; + and − by keyboard; a tie.
  const P9 = 'sides-09';
  await open(P9);
  await button('Can’t').click();
  await page.getByText('Keep looking.').waitFor();
  const more = page.getByRole('button', {name: 'One red and blue card more'});
  await more.focus();
  for (let i = 0; i < 2; i++) await page.keyboard.press('Enter');
  assert.deepEqual((await board(P9)).counts, [2, 3, 1]);
  assert.equal(await focused(), 'side-count1-less', 'three copies: focus moves to the same card’s −');
  await page.keyboard.press('Enter');
  await page.getByRole('button', {name: 'One red card fewer'}).click();
  await button('Try it').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.deepEqual((await board(P9)).counts, [1, 2, 1]);
  await fit('copies'); await shot('09-solved');

  // The playground: switches, random draws in three piles, the sixty-draw limit.
  const PG = 'sides-playground';
  await open(PG);
  await tap(side(2));
  assert.deepEqual((await board(PG)).cup, [1, 3, 4, 5, 6]);
  await button('Draw 10').click();
  assert.equal((await board(PG)).draws.length, 10);
  assert.equal(await page.locator('.side-face.under').count(), 0, 'nothing is covered in the playground');
  assert.equal(await page.locator('.case-bin .case-kept').count(), 10);
  await fit('playground'); await shot('playground');
  await tap(side(2));
  assert.deepEqual((await board(PG)).draws, [], 'a new cup clears the piles');
  await button('Draw 10').focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('Enter');
  assert.equal((await board(PG)).draws.length, 60);
  assert.equal(await button('Draw 10').isDisabled(), true, 'sixty draws at most');
  assert.equal(await page.evaluate(() => document.activeElement?.matches('.side-face')), false, 'keyboard focus never lands on a side');
  await button('Clear').click();
  assert.deepEqual((await board(PG)).draws, []);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
