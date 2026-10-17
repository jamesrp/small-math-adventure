// Plays Chip firing through the real interface: That's all on a shelf puzzle
// (off with nothing shelved, one refusal kept through Undo and New run, focus
// off the claim), and the Still boards group: capacity (chips until a circle
// glows, a glowing circle firing, Most refused and kept, the argument drawn
// after a right claim) and the add-one cycle (a still start, chips added at A,
// the row of still boards, a start that comes back shelved, That's all opening
// the row, a wrong pair, There is another, taps at the edge of a board in the
// row, the solve). Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// with touch). Screenshots go in test-results/chips/, or SHOT_DIR.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1280, height: 900}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOT_DIR ? pathToFileURL(process.env.SHOT_DIR.replace(/\/?$/, '/')) : new URL('../test-results/chips/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] .chips-puzzle`).waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// Taps land through real hit-testing, by touch on a phone.
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async (locator, dx = 0.5, dy = 0.5) => { const b = await locator.boundingBox(); await tapAt(b.x + b.width * dx, b.y + b.height * dy); };
const circle = id => page.locator(`.chip-node[data-node="${id}"]`);
const taps = async ids => { for (const id of ids.split(' ')) await tap(id === '+' ? page.locator('.chip-drop') : circle(id)); };
const button = name => page.getByRole('button', {name, exact: true});
const thatsAll = () => button('That’s all');
const told = () => page.locator('.chip-feedback').innerText();
const focused = () => page.evaluate(() => { const e = document.activeElement; return e === document.body || !e ? 'body' : (e.dataset.focus || e.className || e.tagName); });
const undo = () => page.locator('[data-action="undo"]').click();
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Chips QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const satchel = page.locator('.satchel-family[data-view-key="family-chips"]');
  assert.equal(await satchel.locator('h2', {hasText: 'Still boards'}).count(), 1, 'the Still boards group is in the satchel');

  // Puzzle 3: That's all is judged as a whole and stays off until the shelf grows.
  const F = 'chips-03';
  await open(F); await fit('orders');
  assert.equal(await thatsAll().isDisabled(), true, 'That’s all is off with nothing shelved');
  await taps('A B A B');
  assert.deepEqual((await board(F)).found, ['ABAB']);
  await thatsAll().focus(); await page.keyboard.press('Enter');
  assert.equal(await told(), 'There is another.');
  assert.equal(await thatsAll().isDisabled(), true, 'That’s all waits for the shelf to change');
  assert.notEqual(await focused(), 'chip-all', 'focus leaves That’s all');
  assert.notEqual(await focused(), 'body', 'focus lands on a control');
  await undo();
  assert.equal(await told(), 'There is another.', 'Undo keeps the refusal');
  assert.equal(await thatsAll().isDisabled(), true);
  await undo();
  assert.equal((await board(F)).word, 'ABA', 'Undo then takes back a firing');
  assert.equal(await thatsAll().isDisabled(), true);
  await taps('B'); await button('New run').click();
  assert.equal(await thatsAll().isDisabled(), true, 'New run keeps the refusal');
  await taps('A B B A');
  assert.equal(await thatsAll().isDisabled(), false, 'a new order opens That’s all');
  assert.equal(await page.locator('.chip-feedback').count(), 0);
  await shot('orders-refused');

  // Still boards 1: capacity on the square with a diagonal.
  const C = 'chips-s01';
  await open(C); await fit('capacity');
  assert.equal(await button('Most').isDisabled(), true, 'Most waits for chips');
  await taps('A A');
  assert.equal(await circle('A').getAttribute('class').then(c => c.includes('ready')), false);
  await taps('A');
  assert.match(await circle('A').getAttribute('class'), /\bready\b/, 'A glows at its third chip');
  assert.equal(await button('Most').isDisabled(), true, 'no claim while a circle glows');
  await shot('capacity-glowing'); await fit('capacity, glowing');
  await taps('A');
  assert.equal((await board(C)).steps, 'aaaA', 'a tap on a glowing circle fires it');
  await circle('C').focus(); await page.keyboard.press('Enter');
  assert.equal((await board(C)).steps, 'aaaAc', 'Enter on a circle adds a chip');
  await button('Most').click();
  assert.equal(await told(), 'More chips fit.');
  assert.equal(await button('Most').isDisabled(), true, 'Most stays off on the same board');
  assert.notEqual(await focused(), 'chip-most'); assert.notEqual(await focused(), 'body');
  await undo();
  assert.equal(await told(), 'More chips fit.', 'Undo keeps a refused Most');
  await taps('A A');
  assert.equal(await page.locator('.chip-feedback').count(), 0, 'a new board lifts it');
  assert.deepEqual((await board(C)).steps, 'aaaAcaa');
  await button('Most').click();
  await done(); await fit('capacity solved');
  assert.equal(await page.locator('.chip-end:not(.bare)').count(), 5, 'each chip waits at a line end');
  assert.equal(await page.locator('.chip-end.bare').count(), 3, 'one bare line end at each circle');
  assert.equal(await page.locator('.chip-argued').innerText(), 'Every circle has one line with no chip.');
  await shot('capacity-solved');

  // Still boards 2: the add-one cycle on the triangle.
  const R = 'chips-s02';
  await open(R); await fit('cycle');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'one objective, on the board');
  assert.match(await page.locator('.chip-ask').innerText(), /Find every start that comes back/);
  assert.equal(await thatsAll().isDisabled(), true);
  // Start A 0 B 1: it comes back after three chips.
  await taps('B +');
  assert.equal(await circle('B').getAttribute('aria-disabled'), 'true', 'placing is over once a chip is added at A');
  await taps('+');
  assert.equal(await page.locator('.chip-drop').isDisabled(), true, 'no chip at A while A glows');
  await taps('A B');
  assert.equal(await page.locator('.chip-row .chip-rec').count(), 3, 'the start and two still boards');
  await shot('cycle-running'); await fit('cycle, running');
  await taps('+ A');
  assert.deepEqual((await board(R)).found, ['0,1'], 'the start came back and is saved');
  assert.equal(await page.locator('.chip-drop').count(), 0, 'the run is over');
  assert.equal(await page.locator('.chip-row .chip-loop').count(), 1);
  // From no chips the row runs into the loop.
  await button('New run').click();
  await taps('+ + A + + A B');
  assert.equal(await page.locator('.chip-row .chip-rec').count(), 5);
  assert.deepEqual((await board(R)).found, ['0,1'], 'a start that doesn’t come back is not saved');
  assert.equal(await page.locator('.chip-rec[data-chip-tap]').count(), 0, 'the row is not tappable before That’s all');
  await thatsAll().click();
  assert.equal(await page.locator('.chip-ask').innerText(), 'Tap two boards that go to the same board.');
  assert.equal(await page.locator('.chip-rec[data-chip-tap]').count(), 5);
  assert.equal(await page.locator('.chip-rec.tapped').count(), 0, 'nothing marks the boards before a tap');
  // A tap near the edge of a board in the row goes to that board, and a second tap on it takes it back.
  await tap(page.locator('.chip-rec[data-chip-tap="2"]'), 0.96, 0.5);
  assert.equal(await page.locator('.chip-rec.tapped').getAttribute('data-chip-tap'), '2');
  await tap(page.locator('.chip-rec[data-chip-tap="2"]'), 0.04, 0.5);
  assert.equal(await page.locator('.chip-rec.tapped').count(), 0);
  await tap(page.locator('.chip-rec[data-chip-tap="0"]'));
  await tap(page.locator('.chip-rec[data-chip-tap="1"]'));
  assert.equal(await told(), 'Those two don’t go to the same board.');
  assert.equal(await thatsAll().isDisabled(), true, 'one try per row');
  assert.equal(await focused(), 'chip-again', 'focus goes to New run');
  await undo();
  assert.equal(await told(), 'Those two don’t go to the same board.', 'Undo keeps the refused pair');
  await button('New run').click();
  assert.equal(await page.locator('.chip-feedback').count(), 0, 'a new row can be tried');
  await taps('+ + A + + A B');
  await thatsAll().click();
  await tap(page.locator('.chip-rec[data-chip-tap="0"]')); await tap(page.locator('.chip-rec[data-chip-tap="3"]'));
  assert.equal(await told(), 'There is another.', 'a right pair, with starts missing from the shelf');
  assert.equal(await thatsAll().isDisabled(), true);
  await shot('cycle-another'); await fit('cycle, another');
  // Shelve the other two, then claim from a row that runs into the loop.
  await button('New run').click(); await taps('A + A + + A B');
  await button('New run').click(); await taps('A B + A B + A +');
  assert.deepEqual((await board(R)).found, ['0,1', '1,0', '1,1']);
  assert.equal(await page.locator('.chip-feedback').count(), 0, 'the shelf changed');
  await button('New run').click(); await taps('+ + A + + A B');
  await thatsAll().focus(); await page.keyboard.press('Enter');
  assert.equal(await focused(), 'chip-row', 'focus moves to the row, not to a board in it');
  await page.keyboard.press('Tab');
  assert.equal(await focused(), 'chip-rec-0', 'Tab walks the row in order');
  await tap(page.locator('.chip-rec[data-chip-tap="3"]'));
  await shot('cycle-picking'); await fit('cycle, picking');
  await tap(page.locator('.chip-rec[data-chip-tap="0"]'));
  await done(); await fit('cycle solved');
  assert.equal(await page.locator('.chip-rec.merge').count(), 2, 'the two boards');
  assert.equal(await page.locator('.chip-rec.meet').count(), 2, 'and the board after each');
  assert.equal(await page.locator('.chip-argued').innerText(), 'The start runs into the loop and never comes back.');
  await shot('cycle-solved');

  // Hints reach the claim through Apply hint.
  await page.locator('[data-action="replay"]').click().catch(() => {});
  await open(R);
  if (!(await page.locator('#completion-heading').count())) {
    for (let i = 0; i < 3; i++) await button('Hint').click();
    for (let k = 0; k < 120 && !(await page.locator('#completion-heading').count()); k++) await button('Apply hint').click();
    await done();
  }
  assert.deepEqual(errors, []);
  console.log(`Passed Chip firing ${phone ? 'on a phone' : 'on a desktop'}: That’s all kept through Undo and New run, capacity with Most and its argument, and the add-one cycle with its row, refusals and the merge.`);
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
