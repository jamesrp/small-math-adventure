// Plays Three decks through the real interface: marking the winner of every
// pair (by keyboard too), the smaller card saying which is bigger and a wrong
// deck greyed; puzzle 3's question and the cycle; a possible Can't puzzle; a
// card tried in the empty place, Keep naming the win it misses, and the
// catalog; a swap kept and one refused, with a hint solve and the catalog of
// swaps; Can't refused and right with its certificates; two-tap swaps by
// keyboard, a re-pick in the same deck, a pick Undo forgets, and a solve;
// pinned cards; and the playground up to its sixty rounds. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1
// for a phone viewport). Screenshots go in test-results/decks/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/decks/', import.meta.url);
const shot = async name => { await page.waitForTimeout(900); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="decks"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const card = v => page.locator(`button.deck-card[data-card="${v}"]`);
const pair = (cell, side) => page.locator(`button[data-focus="pair-${cell}-${side}"]`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const button = name => page.getByRole('button', {name, exact: true});
const focused = () => page.evaluate(() => document.activeElement?.dataset.focus);
const refused = () => page.getByText('That move is not allowed').count();
const solved = () => page.locator('#completion-heading').waitFor({timeout: 5000});
async function hintSolve() {
  const hint = page.getByRole('button', {name: 'Hint', exact: true});
  for (let i = 0; i < 3; i++) await hint.click();
  const apply = page.getByRole('button', {name: 'Apply hint', exact: true});
  for (let s = 0; !await page.locator('#completion-heading').count() && s < 150; s++) await apply.click();
  await solved();
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Deck QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  // Which family is newest (and starts open) is checked by families-browser-smoke.mjs.
  assert.equal(await page.locator('.satchel-family[data-view-key="family-decks"]').count(), 1, 'in the satchel');

  // A against B: tap the bigger card of every pair, by keyboard too.
  const P1 = 'decks-01';
  await open(P1); await fit('pairs'); await shot('01-start');
  assert.equal(await button('A wins more pairs').isDisabled(), true, 'nothing to choose before every pair is marked');
  // The first pair is A’s 2 against B’s 1: tapping the 1 says which is bigger.
  await tap(pair(0, 1));
  await page.getByText('2 is bigger than 1.').waitFor();
  assert.equal(await refused(), 0);
  assert.deepEqual((await board(P1)).marked, [], 'the smaller card is never marked');
  await shot('01-refused');
  await pair(0, 0).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P1)).marked, [0]);
  assert.match(await focused(), /^pair-1-/, 'keyboard focus moves to the next open pair');
  assert.equal(await page.locator('.deck-cell.win-A').count(), 1, 'the pair is tinted in A’s colour');
  const winners = [[1, 1], [2, 1], [3, 0], [4, 1], [5, 1], [6, 0], [7, 0], [8, 0]];
  for (const [cell, side] of winners.slice(0, 6)) await tap(pair(cell, side));
  await shot('01-marking');
  for (const [cell, side] of winners.slice(6)) await tap(pair(cell, side));
  assert.equal(await page.locator('.deck-cell.win-A').count(), 5); assert.equal(await page.locator('.deck-cell.win-B').count(), 4);
  assert.equal(await page.getByText('2 is bigger than 1.').count(), 0, 'a mark clears the note');
  await button('B wins more pairs').click();
  await page.getByText('Count again.').waitFor();
  assert.equal(await button('B wins more pairs').isDisabled(), true, 'the deck refused greys');
  await button('A wins more pairs').click();
  await solved();
  await fit('pairs solved'); await shot('01-solved');

  // C against A, then: does any deck beat both others?
  const P3 = 'decks-03';
  await open(P3);
  for (const [cell, side] of [[0, 0], [1, 1], [2, 1], [3, 0], [4, 0], [5, 1], [6, 0], [7, 0], [8, 1]]) await tap(pair(cell, side));
  await button('C wins more pairs').click();
  await page.getByText('Does any deck beat both others?').waitFor();
  assert.equal(await page.locator('.deck-loop > span').count(), 3, 'A beats B, B beats C and C beats A');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'A does', 'focus moves to the question');
  await shot('03-ask');
  await page.getByRole('button', {name: 'A does'}).click();
  await page.getByText('C beats A.').waitFor();
  assert.equal(await page.getByRole('button', {name: 'A does'}).isDisabled(), true);
  await page.getByRole('button', {name: 'No deck does'}).click();
  await solved();
  await page.getByText('No deck beats both others').waitFor();
  await fit('cycle'); await shot('03-solved');

  // Split four cards evenly: Can't refused, then one swap.
  const P4 = 'decks-04';
  await open(P4); await shot('04-start');
  await button('Can’t').click();
  await page.getByText('Keep looking.').waitFor();
  await tap(card(2)); await tap(card(4));
  await solved();
  assert.deepEqual((await board(P4)).decks, [[1, 4], [2, 3]]);
  await fit('four cards'); await shot('04-solved');

  // A missing card: no verdicts until Keep; 9 refused with the win it misses; the catalog.
  const P6 = 'decks-06';
  await open(P6);
  assert.equal(await button('Keep').isDisabled(), true, 'nothing tried yet');
  await tap(page.getByRole('button', {name: 'Try 9'}));
  assert.equal((await board(P6)).value, 9);
  assert.equal(await page.locator('.deck-card.trial b').textContent(), '9', 'the empty place shows the card tried');
  assert.equal(await page.locator('.deck-verdict').count(), 0, 'the grids don’t say who beats whom');
  await button('Keep').click();
  await page.getByText('C doesn’t beat A.').waitFor();
  assert.equal(await button('Keep').isDisabled(), true, 'Keep greys until the card changes');
  await shot('06-refused');
  await tap(page.getByRole('button', {name: 'Try 2'}));
  assert.equal(await page.getByText('C doesn’t beat A.').count(), 0, 'a new card clears the note');
  await button('Keep').click();
  assert.deepEqual((await board(P6)).kept, ['2']);
  await button('That’s all').click();
  await page.getByText('There’s another.').waitFor();
  await tap(page.getByRole('button', {name: 'Try 4'})); await button('Keep').click();
  await button('That’s all').click();
  await solved();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 5);
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 2);
  await fit('menu solved'); await shot('06-solved');

  // Every swap: a swap kept swaps back; one refused stays until Swap back; hint solve and the catalog.
  const P5 = 'decks-05';
  await open(P5);
  await tap(card(9)); await tap(card(1));
  assert.deepEqual((await board(P5)).swap, [9, 1]);
  assert.equal(await card(4).isDisabled(), true, 'one swap at a time');
  assert.equal(await page.locator('.deck-card.waiting').count(), 4, 'the others wait');
  await shot('05-swapped');
  await button('Keep').click();
  assert.deepEqual(await board(P5), {swap: null, kept: ['9-1'], claimed: false, missed: false, wrong: false});
  assert.equal(await card(4).isDisabled(), false, 'Keep swaps back');
  await tap(card(8)); await tap(card(4));
  assert.deepEqual((await board(P5)).swap, [4, 8], 'a B card tapped first');
  await button('Keep').click();
  await page.getByText('B doesn’t beat A.').waitFor();
  await button('Swap back').click();
  assert.equal((await board(P5)).swap, null);
  await hintSolve();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 9);
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 5);
  await fit('swaps solved'); await shot('05-solved');

  // Split six cards evenly: Can't is right, with every split.
  await open('decks-07');
  await button('Can’t').click();
  await solved();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 10, 'every split with 1 in A');
  await fit('splits'); await shot('07-solved');

  // Make a cycle: Can't refused; two-tap swaps by keyboard; a re-pick; a solve.
  const P9 = 'decks-09';
  await open(P9); await shot('09-start');
  await button('Can’t').click();
  await page.getByText('Keep looking.').waitFor();
  assert.equal(await button('Can’t').isDisabled(), true);
  await card(4).focus(); await page.keyboard.press('Enter');
  assert.equal(await card(4).getAttribute('aria-pressed'), 'true', 'picked');
  assert.equal(await focused(), 'card-4', 'keyboard focus stays on the card');
  await card(1).focus(); await page.keyboard.press('Enter');
  assert.equal(await card(1).getAttribute('aria-pressed'), 'true', 'a card in the same deck is picked instead');
  assert.equal(await card(4).getAttribute('aria-pressed'), 'false');
  await card(5).focus(); await page.keyboard.press('Enter');
  assert.deepEqual(await board(P9), {decks: [[3, 6, 9], [1, 2, 8], [4, 5, 7]], cant: false}, '1 and 5 swap; the refusal clears');
  assert.equal(await focused(), 'card-5', 'keyboard focus follows the card');
  assert.equal(await page.getByText('Keep looking.').count(), 0);
  await shot('09-swapped');
  await tap(card(2)); await tap(card(2));
  assert.equal(await page.locator('.deck-card.picked').count(), 0, 'tapping the picked card puts it down');
  await tap(card(2));
  await page.locator('[data-action="undo"]').click();
  assert.equal(await page.locator('.deck-card.picked').count(), 0, 'Undo forgets the pick');
  assert.deepEqual((await board(P9)).decks, [[3, 6, 9], [2, 5, 8], [1, 4, 7]]);
  await tap(card(1)); await tap(card(5));
  await tap(card(2)); await tap(card(6));
  await solved();
  assert.deepEqual((await board(P9)).decks, [[2, 3, 9], [1, 6, 8], [4, 5, 7]]);
  await fit('cycle solved'); await shot('09-solved');

  // 9, 8 and 7 stay put: the pins are pictures; Keep names the wins missing; a hint solve and the catalog of 90.
  await open('decks-08');
  for (const v of [9, 8, 7]) assert.equal(await card(v).count(), 0, `${v} stays put`);
  await button('Keep').click();
  await page.getByText('A doesn’t beat B. B doesn’t beat C.').waitFor();
  await shot('08-start');
  await hintSolve();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 90);
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 3);
  await fit('every deal'); await shot('08-solved');

  // Two-card decks and three big wins: Can't with its certificates.
  await open('decks-10');
  await button('Can’t').click();
  await solved();
  assert.equal(await page.locator('.deck-cell.lost').count(), 4, 'card 1’s pairs ringed in its two grids');
  await fit('two-card decks'); await shot('10-solved');
  await open('decks-12');
  await button('Can’t').click();
  await solved();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 15, 'every cycle');
  await fit('big wins'); await shot('12-solved');

  // The playground: rounds piled by the winner, a match and a swap clear them, sixty at most.
  const PG = 'decks-playground';
  await open(PG);
  await button('Draw 10').click();
  assert.equal((await board(PG)).rounds.length, 10);
  assert.equal(await page.locator('.case-bin .case-kept').count(), 10);
  await fit('playground'); await shot('playground');
  await page.getByRole('button', {name: 'C against A'}).click();
  assert.deepEqual((await board(PG)).rounds, [], 'a new match clears the rounds');
  assert.equal(await page.locator('.deck-grid figcaption').textContent(), 'C against A');
  await button('Draw 10').click();
  await tap(card(2)); await tap(card(1));
  assert.deepEqual(await board(PG), {decks: [[1, 4, 9], [2, 6, 8], [3, 5, 7]], match: 2, rounds: []}, 'a swap clears the rounds');
  await button('Draw 10').focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('Enter');
  assert.equal((await board(PG)).rounds.length, 60);
  assert.equal(await button('Draw 10').isDisabled(), true, 'sixty rounds at most');
  await button('Clear').click();
  assert.deepEqual((await board(PG)).rounds, []);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
