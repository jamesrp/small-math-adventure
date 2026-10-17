// Plays Tower cities (the Towers group in Symbol Orchard) through the real
// interface: the group in the Orchard's list, swaps by tap and by drag, looking
// from an end, No row off until a swap, a right No row with its lanes and a
// wrong one refused across Undo (one press taking back the claim and the swap
// before it); heights by keypad and by typed digits, rings
// on numbers a full city misses, looking along a full line; No city after a
// height, a wrong line and the right one; every city with There is another,
// That's all and one more number; making a puzzle with the partner's second
// city and the budget; twin cities; focus after claims; no overflow. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/towers/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/towers/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.tw-board').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tower = i => page.locator(`.tw-tower[data-place="${i}"]`);
const cell = k => page.locator(`.tw-board [data-cell="${k}"]`);
const slot = s => page.locator(`.tw-board [data-focus="tw-slot-${s}"]`);
const button = name => page.getByRole('button', {name, exact: true});
const undoButton = () => page.locator('[data-action="undo"]').click();
const focusIsClaim = () => page.evaluate(() => Boolean(document.activeElement?.closest('.tw-no,.tw-all')));
// Slots run clockwise: above columns 0..n-1, right of rows n..2n-1, below columns 2n.., left of rows 3n..
const S = (n, side, i) => ['top', 'right', 'bottom', 'left'].indexOf(side) * n + i;
let cdp = null;
async function drag(from, to) {
  const [a, b] = [await center(from), await center(to)];
  if (!phone) { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b, {steps: 10}); await page.mouse.up(); return; }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let s = 1; s <= 10; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 10, a[1] + (b[1] - a[1]) * s / 10]);
  await touch('touchEnd', b);
}
// Swap towers by taps until the row reads `goal`.
async function rowTo(id, goal) {
  for (let i = 0; i < goal.length; i++) {
    const row = (await board(id)).row;
    if (row[i] === goal[i]) continue;
    await tap(tower(i)); await tap(tower(row.indexOf(goal[i])));
  }
}
// Heights square by square, alternating the keypad and typed digits.
async function cityTo(id, goal) {
  for (let k = 0; k < goal.length; k++) {
    if ((await board(id)).cells[k] === goal[k]) continue;
    await tap(cell(k));
    if (k % 2) await tap(page.locator('.tw-keypad button').filter({hasText: new RegExp(`^${goal[k]}$`)}));
    else await page.keyboard.press(String(goal[k]));
  }
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Towers QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.ok(await page.locator('.caravan-library').getByText('Towers', {exact: true}).count() >= 1, 'the Towers group is listed in the satchel');

  // Puzzle 2: looking, the authored first hint, No row off until a swap, a right No row.
  const R2 = 'towers-02';
  await open(R2); await fit('row of three');
  assert.equal(await button('No row').isDisabled(), true, 'No row waits for a swap');
  await tap(page.locator('[data-focus="tw-end-left"]'));
  assert.equal(await page.locator('.tw-tower.seen').count(), 2, 'from the left: the 2 and the 3');
  assert.equal(await page.locator('.tw-tower.hidden').count(), 1);
  await button('Hint').click();
  assert.match(await page.locator('.hint-card').innerText(), /Where must the 3 stand for the left end to see just 1\?/);
  await tap(tower(0)); await tap(tower(2));
  assert.deepEqual((await board(R2)).row, [3, 1, 2], 'a tap and a tap swap two towers');
  assert.equal((await board(R2)).tried, true);
  await shot('row-tried');
  await button('No row').click();
  await done();
  assert.equal(await page.locator('.tw-proof .tw-ghost').count(), 2, 'one place for the 3 from each end');
  assert.equal(await page.locator('.tw-proof .tw-miss').count(), 1, 'a cross under the child’s 3');
  await shot('row-no-row');

  // Puzzle 5: a drag, a wrong No row refused across Undo, keys, a solve.
  const R5 = 'towers-05';
  await open(R5); await fit('row of four');
  await drag(tower(0), tower(1));
  assert.deepEqual((await board(R5)).row, [1, 2, 4, 3], 'a drag swaps');
  await button('No row').click();
  assert.equal((await board(R5)).refused, true);
  assert.equal(await page.locator('.tw-note').innerText(), 'A row fits.');
  assert.equal(await button('No row').isDisabled(), true, 'refused once, for good');
  assert.equal(await focusIsClaim(), false, 'focus is not left on No row');
  // Undo of the claim keeps the refusal, which draws just as it does now, so
  // the same press takes back the swap.
  await undoButton();
  assert.deepEqual((await board(R5)).row, [2, 1, 4, 3], 'one Undo takes back the claim and the swap');
  assert.equal((await board(R5)).refused, true, 'but not the refusal');
  assert.equal(await page.locator('.tw-note').innerText(), 'A row fits.');
  assert.equal(await button('No row').isDisabled(), true, 'No row stays off');
  assert.equal(await page.locator('[data-action="undo"]').isDisabled(), true, 'back at the start, Undo greys out');
  await tower(0).focus(); await page.keyboard.press('Enter');
  assert.equal(await tower(0).getAttribute('aria-pressed'), 'true', 'Enter lifts a tower');
  await tower(1).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(R5)).row, [1, 2, 4, 3], 'Enter on another swaps');
  await rowTo(R5, [1, 4, 3, 2]);
  await done();

  // Puzzle 3: keypad and typed heights, rings on a full city that misses, a sight line.
  const C3 = 'towers-03';
  await open(C3); await fit('city 3 by 3');
  assert.equal(await page.locator('.tw-slot[data-action]').count(), 0, 'no sight lines on unfinished lines');
  await cityTo(C3, [1, 2, 3, 2, 3, 1, 3, 1, 2]);
  assert.ok(await page.locator('.tw-slot.off').count() > 0, 'a full city that misses numbers rings them');
  await tap(slot(S(3, 'right', 1)));
  assert.equal(await page.locator('.tw-side').count(), 1, 'the side view');
  assert.equal(await page.locator('.tw-city .latin-cell.seen').count(), 2, 'row 2 (2 3 1) from the right: the 1 and the 3');
  assert.equal(await page.locator('.tw-city .latin-cell.hidden').count(), 1, 'the 2 is hidden');
  assert.equal(await page.locator('.tw-side.from-end > :last-child').evaluate(e => e.classList.contains('tw-eye')), true, 'the eye on the right, the side looked from');
  await shot('city-look');
  await cityTo(C3, [2, 3, 1, 3, 1, 2, 1, 2, 3]);
  await done();

  // Puzzle 6: No city waits for a height; a wrong line; the right line.
  const C6 = 'towers-06';
  await open(C6); await fit('no city');
  assert.equal(await button('No city').isDisabled(), true, 'No city waits for a height');
  await tap(cell(0)); await page.keyboard.press('3');
  await button('No city').click();
  assert.equal(await page.locator('.tw-slot.pickable').count(), 12, 'every edge place is a target');
  await tap(slot(S(3, 'left', 1)));
  assert.equal(await page.locator('.tw-note').innerText(), 'No edge number rules this square out.');
  assert.equal(await page.locator('.latin-cell.could').count(), 1);
  assert.equal(await focusIsClaim(), false, 'focus is not left on No city');
  await button('No city').click();
  await tap(slot(S(3, 'left', 0)));
  await done();
  assert.equal(await page.locator('.latin-cell.ruled').count(), 3, 'row 1 crossed');
  assert.equal(await page.locator('.tw-slot.ruling').count(), 3, 'the three 2s ringed');
  await shot('city-no-city');

  // Puzzle 7: every city, There is another, That's all, one more number.
  const E7 = 'towers-07';
  await open(E7); await fit('every city');
  await cityTo(E7, [3, 1, 2, 1, 2, 3, 2, 3, 1]);
  assert.deepEqual((await board(E7)).found, ['312123231']);
  assert.equal(await page.locator('.tw-found li').count(), 1, 'kept below the grid');
  await button('That’s all').click();
  assert.equal(await page.locator('.tw-note').innerText(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true);
  assert.equal(await focusIsClaim(), false, 'focus is not left on That’s all');
  await cityTo(E7, [3, 2, 1, 1, 3, 2, 2, 1, 3]);
  await cityTo(E7, [3, 2, 1, 2, 1, 3, 1, 3, 2]);
  assert.equal(await page.locator('.tw-found li').count(), 3);
  await button('That’s all').click();
  assert.equal((await board(E7)).all, true);
  assert.equal(await focusIsClaim(), false);
  await shot('every-second-part');
  await tap(slot(S(3, 'top', 1)));
  await page.keyboard.press('2');
  assert.deepEqual((await board(E7)).extra, [S(3, 'top', 1), 2]);
  assert.equal(await page.locator('.tw-found li.dim').count(), 1, 'the city it rules out dims');
  await tap(page.locator('.tw-keypad button').filter({hasText: /^3$/}));
  await done();

  // Puzzle 8: the partner's second city and the budget.
  const D8 = 'towers-08';
  await open(D8); await fit('make a puzzle');
  await tap(slot(0)); await tap(slot(1));
  assert.equal(await slot(2).isDisabled(), true, 'the budget is full');
  assert.equal(await page.locator('.tw-second').count(), 1, 'another city fits');
  await tap(slot(0)); await tap(slot(1));
  assert.deepEqual((await board(D8)).shown, []);
  await tap(slot(S(3, 'right', 1)));
  assert.equal(await page.locator('.tw-second .tw-mc.marked').count() > 0, true, 'the squares where it differs are marked');
  await shot('design-second-city');
  await tap(slot(S(3, 'bottom', 1)));
  await done();

  // Puzzle 12: twins.
  const T12 = 'towers-12';
  await open(T12); await fit('twins');
  await cityTo(T12, [1, 2, 3, 4, 2, 4, 1, 3, 3, 1, 4, 2, 4, 3, 2, 1]);
  await done();
  await shot('twins-solved');

  // Puzzles 9, 10 and 11 at this width.
  for (const id of ['towers-09', 'towers-10', 'towers-11']) { await open(id); await fit(id); }
  await shot('design-4');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
