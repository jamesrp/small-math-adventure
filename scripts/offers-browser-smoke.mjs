// Plays Take it or pass through the real interface: Take/Pass switches by tap
// and keyboard, a wrong Best plan refused without saying where, a right one
// and its towers; three offers with lines that open when a first offer is
// passed; every best plan kept with That's all; cards where plans A and B
// differ, one refused, and the two-plan cards after; a ticket tried in the
// bag, refused for its plan and for the goal, then kept, with the catalog of
// every ticket; and the playground, with no Undo, its bag fixed during a
// round, its last offer that must be taken and its thirty rounds. Same environment variables
// as the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE,
// TEST_URL, TEST_PHONE=1 for a phone viewport). Screenshots go in
// test-results/offers/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/offers/', import.meta.url);
const shot = async name => { await page.waitForTimeout(900); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="offers"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const flipSwitch = k => page.locator(`button[data-focus="off-flip${k}"]`);
const offerCard = key => page.locator(`button[data-focus="off-card-${key}"]`);
const center = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
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
  await page.goto(base); await page.locator('#nickname').fill('Offer QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-offers"]').count(), 1, 'in the satchel');

  // Two offers from 0, 4 and 6: a wrong Best plan is refused without saying which switch is wrong.
  const P1 = 'offers-01';
  await open(P1); await fit('two offers'); await shot('01-start');
  assert.equal(await page.locator('.off-switch').count(), 3);
  assert.equal(await page.locator('.off-card').count(), 9);
  assert.equal(await page.locator('.off-t.taken').count(), 9, 'every card lights the offer taken');
  assert.equal(await page.locator('.off-tower').count(), 0, 'no totals before a solve');
  await button('Best plan').click();
  await page.getByText('Another plan scores more.').waitFor();
  assert.equal(await page.locator('.better').count(), 0, 'no row is pointed out');
  assert.equal(await button('Best plan').isDisabled(), true, 'one claim per plan');
  await shot('01-wrong');
  await flipSwitch(0).focus(); await page.keyboard.press('Enter');
  assert.equal((await board(P1)).plan, 'PTT');
  assert.equal(await focused(), 'off-flip0', 'focus stays on the switch');
  assert.equal(await flipSwitch(0).textContent(), 'Pass');
  assert.equal(await page.getByText('Another plan scores more.').count(), 0, 'a switch clears the refusal');
  assert.equal(await page.locator('[aria-label="0, 4: takes 4"] .off-t.unseen').count(), 0);
  await button('Best plan').click();
  await solved();
  assert.equal(await page.locator('figure.off-towers').count(), 3, 'two towers per row');
  assert.equal(await page.locator('figure.off-towers[aria-label="First 4: taking scores 12, passing at most 10"]').count(), 1);
  assert.equal(await flipSwitch(1).isDisabled(), true, 'no moves after a solve');
  await fit('two offers solved'); await shot('01-solved');

  // Three offers: a line's switch opens when its first offer is passed; a hint solve.
  const P6 = 'offers-06';
  await open(P6);
  assert.equal(await page.locator('.off-switch').count(), 12);
  assert.equal(await page.locator('.off-line.shut').count(), 9, 'every line shut while every first offer is taken');
  assert.equal(await flipSwitch(3).isDisabled(), true);
  await tap(flipSwitch(0));
  assert.equal(await page.locator('.off-line.shut').count(), 6);
  await tap(flipSwitch(3));
  assert.equal((await board(P6)).plan, 'PTTPTTTTTTTT');
  assert.equal(await page.locator('[aria-label="0, 0, 6: takes 6"]').count(), 1);
  await fit('three offers'); await shot('06-start');
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board(P6)).plan, 'PTTTTTTTTTTT', 'Undo takes back a switch');
  await hintSolve();
  assert.equal((await board(P6)).plan.slice(0, 3), 'PPT');
  assert.equal(await page.locator('figure.off-towers[aria-label="First 4: taking scores 36, passing at most 40"]').count(), 1);
  await fit('three offers solved'); await shot('06-solved');

  // Every best plan for 0, 3 and 6: Keep, That's all too early, the other plan.
  const P4 = 'offers-04';
  await open(P4);
  await button('Keep').click();
  await page.getByText('Another plan scores more.').waitFor();
  assert.equal(await button('Keep').isDisabled(), true);
  await tap(flipSwitch(0)); await button('Keep').click();
  assert.deepEqual((await board(P4)).kept, ['PTT']);
  assert.equal(await page.locator('.case-shelf .case-kept').count(), 1);
  assert.equal(await button('Keep').isDisabled(), true, 'no Keep twice');
  await button('That’s all').click();
  await page.getByText('There’s another.').waitFor();
  await shot('04-another');
  await tap(flipSwitch(1)); await button('Keep').click();
  await button('That’s all').click();
  await solved();
  await fit('every best plan'); await shot('04-solved');

  // Where plans A and B differ: a card refused, a card kept, a hint solve, the two-plan cards.
  const P5 = 'offers-05';
  await open(P5);
  assert.equal(await page.locator('button.off-card').count(), 27);
  await tap(offerCard('6-0-0'));
  await page.getByText('A and B score the same on 6 0 0.').waitFor();
  assert.equal(await offerCard('6-0-0').evaluate(e => e.classList.contains('refused')), true);
  assert.equal(await refused(), 0);
  await tap(offerCard('4-0-0'));
  assert.deepEqual((await board(P5)).kept, ['4-0-0']);
  assert.equal(await offerCard('4-0-0').isDisabled(), true);
  assert.equal(await page.getByText('A and B score the same on 6 0 0.').count(), 0, 'a keep clears the note');
  await fit('differ'); await shot('05-start');
  await hintSolve();
  assert.equal(await page.locator('.off-card.two').count(), 27);
  assert.equal(await page.locator('.off-card.two.yes').count(), 5);
  assert.equal(await page.locator('figure.off-towers[aria-label="Where they differ, A scores 20 and B 24"]').count(), 1);
  await fit('differ solved'); await shot('05-solved');

  // A tie with 1 and 9: Keep needs a best plan for the bag; a ticket refused, one kept, and the catalog of every ticket.
  const P8 = 'offers-08';
  await open(P8);
  assert.equal(await button('Keep').isDisabled(), true, 'nothing to keep before a ticket');
  await tap(page.locator('button[data-focus="off-pick6"]'));
  assert.equal(await page.locator('.off-bag').getAttribute('aria-label'), 'The bag: 1, 6, 9');
  assert.equal(await page.locator('.off-card').count(), 9);
  await tap(flipSwitch(1));
  assert.equal((await board(P8)).plan, 'TPT', 'the switches explore');
  await button('Keep').click();
  await page.getByText('Another plan scores more.').waitFor();
  assert.equal(await button('Keep').isDisabled(), true);
  assert.equal(await focused(), 'off-pick6', 'focus rests on the ticket in the bag, where Enter does nothing');
  await tap(flipSwitch(1)); await tap(flipSwitch(0));
  assert.equal((await board(P8)).plan, 'PTT');
  await button('Keep').click();
  await page.getByText('No tie.').waitFor();
  assert.equal(await button('Keep').isDisabled(), true);
  await shot('08-refused');
  await page.locator('button[data-focus="off-pick5"]').focus(); await page.keyboard.press('Enter');
  assert.equal((await board(P8)).plan, 'TTT', 'a new ticket starts the switches again');
  assert.equal(await page.getByText('No tie.').count(), 0);
  await tap(flipSwitch(0)); await button('Keep').click();
  assert.deepEqual((await board(P8)).kept, ['5']);
  await button('That’s all').click();
  await page.getByText('There’s another.').waitFor();
  await hintSolve();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 19);
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 2);
  await fit('a tie'); await shot('08-solved');

  // A middle that flips: a hint solve and the catalog's columns.
  await open('offers-10');
  await hintSolve();
  assert.deepEqual(await page.locator('.case-catalog .case-bin-label').allTextContents(), ['Passed first and second', 'Passed first, a tie second', 'Passed first, taken second', 'Taken first and second']);
  await fit('a flip'); await shot('09-solved');

  // The playground: Pass shows the next offer, the last must be taken, rounds pile by score, thirty at most.
  const PG = 'offers-playground';
  await open(PG);
  assert.equal(await page.locator('.off-counters').getAttribute('aria-label'), '2 offers left');
  assert.equal(await page.locator('[data-action="undo"]').isDisabled(), true, 'no Undo: a passed offer is gone for good');
  await button('Draw').click();
  assert.equal((await board(PG)).offers.length, 1);
  assert.equal(await page.getByRole('button', {name: 'Bag 0, 2, 6'}).isDisabled(), true, 'the bag stays fixed during a round');
  assert.equal(await page.getByRole('button', {name: '3 offers'}).isDisabled(), true);
  await button('Pass').click();
  assert.equal(await button('Pass').isDisabled(), true, 'the last offer must be taken');
  assert.equal(await page.locator('.off-counters').getAttribute('aria-label'), '1 offer left');
  await fit('playground'); await shot('playground-last');
  await button('Take').click();
  let pg = await board(PG);
  assert.equal(pg.rounds.length, 1); assert.equal(pg.rounds[0][2], 1, 'the second offer taken');
  assert.equal(await page.locator('.case-bin .case-kept').count(), 1);
  await page.getByRole('button', {name: '3 offers'}).click();
  assert.deepEqual(await board(PG), {bag: 0, n: 3, offers: [], rounds: []}, 'changing the offers clears the piles');
  for (let i = 0; i < 30; i++) { await button('Draw').click(); await button('Take').click(); }
  pg = await board(PG);
  assert.equal(pg.rounds.length, 30);
  assert.ok(pg.rounds.every(r => r.length === 4 && r[3] === 0), 'every round took its first offer');
  assert.equal(await page.locator('.case-bin .case-kept').count(), 30);
  assert.equal(await page.locator('.case-bin .off-t.unseen').count(), 60, 'two unseen offers per round, faded');
  assert.equal(await button('Draw').isDisabled(), true, 'thirty rounds at most');
  await page.getByText('Thirty rounds. Clear the piles to play more.').waitFor();
  await fit('playground full'); await shot('playground');
  await page.getByRole('button', {name: 'Bag 0, 2, 6'}).click();
  assert.deepEqual(await board(PG), {bag: 1, n: 3, offers: [], rounds: []}, 'a new bag clears the piles');
  await button('Draw').click(); await button('Take').click();
  await button('Clear').click();
  assert.deepEqual((await board(PG)).rounds, []);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
