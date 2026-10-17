// Plays Mirror Couriers shortest routes through the real interface: the
// group and playground in the satchel; touching the river by tapping a
// point and the space beside it (a tap goes to the nearest point); Fold
// before any claim; a refused claim, its note cleared by Undo while the claim
// stays off; a solve; choosing a route by tapping its finish; a wrong final
// choice, with Undo off and Again; moving a letter; every start with That's
// all; two walls, whose board grows when folded; the block's shelf; keyboard
// taps and the focus after them; and the playground's slide and arrow keys.
// Checks that nothing overflows a 375-pixel phone and that the busiest
// boards fit one screen with their controls. Same environment variables as
// the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a 375 × 667 phone with touch); screenshots go in
// TEST_SHOTS or test-results/folds/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.TEST_SHOTS ? `${process.env.TEST_SHOTS.replace(/\/$/, '')}/` : new URL('../test-results/folds/', import.meta.url).pathname;
const shot = name => page.screenshot({path: `${out}${name}${phone ? '-phone' : ''}.png`, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="folds"]').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const note = () => page.locator('[data-mechanic-wire="folds"] .fd-note').textContent();
const button = name => page.locator('[data-mechanic-wire="folds"] .fd-button', {hasText: name}).first();
const pt = focus => page.locator(`[data-mechanic-wire="folds"] [data-focus="${focus}"]`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); await tapAt(...await center(locator)); };
// A tap a fraction of a cell to the side of a point, toward its neighbour.
const tapBeside = async (locator, dx, dy = 0) => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); await tapAt(b.x + b.width * (.5 + dx), b.y + b.height * (.5 + dy)); };
const press = async name => tap(button(name));
const undoButton = () => page.locator('[data-action="undo"]');
const focused = () => page.evaluate(() => { const el = document.activeElement; return {focus: el?.dataset?.focus ?? null, cls: el?.className ?? '', tag: el?.tagName}; });
// The board and its move controls fit one phone screen.
async function fitsScreen(label) {
  const top = await page.locator('[data-mechanic-wire="folds"] .fd-board').boundingBox(), tools = await page.locator('[data-mechanic-wire="folds"] .fd-tools').boundingBox();
  const width = (await page.locator('[data-mechanic-wire="folds"] .fd-board').boundingBox()).width;
  assert.ok(width <= 381, `${label}: the board is at most 380 px wide (${width})`);
  if (tools) assert.ok(tools.y + tools.height - top.y <= 667, `${label}: board and controls fit one screen (${tools.y + tools.height - top.y})`);
  else assert.ok(top.height <= 667, `${label}: the board fits one screen`);
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Folds QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const family = page.locator('details[data-view-key="family-billiard"]');
  if (!(await family.getAttribute('open'))) await family.locator('summary').click();
  assert.ok(await family.getByRole('heading', {name: 'Shortest routes'}).count(), 'the group heading');
  assert.equal(await family.locator('[data-id^="folds-"]').count(), 13, 'twelve puzzles and the playground');
  assert.equal(await family.locator('.satchel-playground[data-id="folds-playground"]').count(), 1, 'the playground button');

  // Puzzle 2: touch, a tap beside a point, Fold, a refusal, Undo, a solve.
  let P = 'folds-02';
  await open(P); await fit('shortest');
  assert.equal(await button('Shortest').count(), 0, 'no claim before Fold');
  assert.equal(await page.locator('[data-mechanic-wire="folds"] .fd-letter.image').count(), 0, 'no fold before Fold');
  await tap(pt('fd-c-5'));
  assert.deepEqual((await board(P)).contacts, [5], 'a tap on the river touches there');
  await tapBeside(pt('fd-c-6'), .42);
  assert.deepEqual((await board(P)).contacts, [6], 'a tap nearer 6 than 7 touches 6');
  await tapBeside(pt('fd-c-6'), -.42);
  assert.deepEqual((await board(P)).contacts, [6], 'and from the other side');
  await tapBeside(pt('fd-c-6'), 0, -.42);
  assert.deepEqual((await board(P)).contacts, [6], 'a tap just above the river still touches it');
  await press('Fold');
  assert.equal((await board(P)).folded, true);
  assert.equal(await page.locator('[data-mechanic-wire="folds"] .fd-letter.image').count(), 1, 'B′ appears');
  assert.equal((await focused()).focus, 'fd-fold', 'focus stays on Fold');
  await press('Shortest');
  assert.equal(await note(), 'There is a shorter one.');
  assert.equal(await button('Shortest').isDisabled(), true, 'the claim is off on a refused board');
  assert.match((await focused()).cls, /fd-pt|fd-button/, 'focus is on the board or its controls');
  await shot('refused');
  await undoButton().click();
  assert.equal((await board(P)).told, false, 'Undo clears the note');
  assert.equal((await board(P)).refused.length, 1, 'and keeps the refusal');
  assert.equal(await page.locator('[data-mechanic-wire="folds"] .fd-note').count() === 0 || (await note()) === '', true);
  assert.equal(await button('Shortest').isDisabled(), true, 'the claim stays off');
  await pt('fd-c-7').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P)).contacts, [7], 'Enter on a point touches it');
  assert.equal((await focused()).focus, 'fd-c-7', 'focus stays on the point');
  await press('Shortest'); await done();
  await shot('solved');

  // Puzzle 4: choose a route by its finish; a wrong final choice.
  P = 'folds-04';
  await open(P); await fit('less');
  await tap(pt('fd-c-7'));
  await tap(pt('fd-l-C'));
  assert.equal(await pt('fd-l-C').getAttribute('aria-pressed'), 'true', 'tapping C chooses its route');
  await tap(pt('fd-c-4'));
  assert.deepEqual((await board(P)).contacts, [7, 4]);
  await press('Fold');
  assert.equal(await page.locator('[data-mechanic-wire="folds"] .fd-letter.image').count(), 2, 'B′ and C′');
  await press('Less rope');
  assert.equal((await board(P)).pick, 1);
  assert.equal(await note(), 'The rope to B is shorter.');
  assert.equal(await undoButton().isDisabled(), true, 'Undo is off in a lost try');
  await shot('lost');
  await press('Again');
  assert.deepEqual((await board(P)).contacts, [null, null]);
  assert.equal(await undoButton().isDisabled(), true, 'a fresh board has nothing to undo');
  await tap(pt('fd-l-B')); await tap(pt('fd-c-7')); await tap(pt('fd-l-C')); await tap(pt('fd-c-4')); await press('Fold'); await tap(pt('fd-l-B'));
  await press('Less rope'); await done();
  await shot('less-solved');

  // Puzzle 7: move D, then make both routes.
  P = 'folds-07';
  await open(P); await fit('share');
  await tap(pt('fd-p-9_2'));
  assert.deepEqual((await board(P)).at, [9, 2], 'tapping an empty point moves D there');
  await tap(pt('fd-c-7')); await tap(pt('fd-l-D')); await tap(pt('fd-c-6'));
  await press('Fold'); await press('Same place');
  assert.equal(await note(), 'They touch at different places.');
  await tap(pt('fd-c-7'));
  assert.equal(await page.locator('[data-mechanic-wire="folds"] .fd-note').count() === 0 || (await note()) === '', true, 'a move clears the note');
  await press('Same place'); await done();

  // Puzzle 5: every start, judged as a whole.
  P = 'folds-05';
  await open(P); await fit('every');
  await tap(pt('fd-s-4_1')); await tap(pt('fd-s-2_2'));
  assert.equal(await pt('fd-s-4_1').getAttribute('aria-pressed'), 'true');
  await press('Fold'); await press('That’s all');
  assert.equal(await note(), 'There is another.');
  assert.equal(await page.locator('[data-mechanic-wire="folds"]').textContent().then(t => /\d/.test(t.replace(/Starts at.*$/s, ''))), false, 'no count on the board');
  await tapBeside(pt('fd-s-0_3'), .3, .3);
  assert.deepEqual((await board(P)).starts, [[0, 3], [2, 2], [4, 1]], 'a tap off-centre puts the start on the nearest point');
  await press('That’s all'); await done();
  await shot('every-solved');

  // Puzzle 10: two walls; the board grows when folded, and still fits.
  P = 'folds-10';
  await open(P); await fit('walls');
  await tap(pt('fd-lower-3')); await tap(pt('fd-upper-9'));
  assert.deepEqual((await board(P)).touches, [{wall: 'lower', at: 3}, {wall: 'upper', at: 9}]);
  const small = (await page.locator('[data-mechanic-wire="folds"] .fd-board').boundingBox()).height;
  await press('Fold'); await fit('walls folded');
  assert.ok((await page.locator('[data-mechanic-wire="folds"] .fd-board').boundingBox()).height > small, 'the folded board shows the double image');
  if (phone) await fitsScreen('walls folded');
  await shot('walls-folded');
  await press('Shortest'); await done(); await fit('walls solved');
  await shot('walls-solved');

  // Puzzle 12: the block, the shelf and That's all.
  P = 'folds-12';
  await open(P); await fit('block');
  await tap(pt('fd-k-0')); await tap(pt('fd-k-1'));
  assert.deepEqual((await board(P)).path, [0, 1]);
  await press('Keep');
  assert.equal(await page.locator('[data-mechanic-wire="folds"] .fd-chip').count(), 1, 'the route is on the shelf');
  assert.match((await focused()).cls, /fd-pt|fd-button|fd-chip/, 'focus after Keep stays on the board');
  await tap(pt('fd-k-1')); await tap(pt('fd-k-0'));
  assert.deepEqual((await board(P)).path, [], 'tapping the last corner takes it back');
  await tap(pt('fd-k-3')); await tap(pt('fd-k-2')); await tap(pt('fd-k-1')); await press('Keep');
  await press('Fold'); await press('That’s all');
  assert.equal(await note(), 'This one isn’t shortest.');
  assert.equal(await page.locator('[data-mechanic-wire="folds"] .fd-chip.marked').count(), 1);
  await tap(page.locator('[data-mechanic-wire="folds"] .fd-chip').nth(1));
  assert.equal((await board(P)).shelf.length, 1, 'tapping a kept route takes it off');
  await tap(pt('fd-k-1'));
  await press('Keep');
  if (phone) await fitsScreen('block with a shelf');
  await press('That’s all'); await done(); await fit('block solved');
  await shot('block-solved');

  // The playground: slide along the river, arrow keys, move a letter.
  P = 'folds-playground';
  await open(P); await fit('playground');
  const from = await center(pt('fd-c-4')), to = await center(pt('fd-c-8'));
  if (phone) {
    const cdp = await context.newCDPSession(page);
    const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
    await touch('touchStart', from);
    for (let s = 1; s <= 10; s++) await touch('touchMove', [from[0] + (to[0] - from[0]) * s / 10, from[1]]);
    await touch('touchEnd', to);
  } else {
    await page.mouse.move(...from); await page.mouse.down(); await page.mouse.move(...to, {steps: 10}); await page.mouse.up();
  }
  assert.equal((await board(P)).at, 8, 'a slide moves the contact');
  await pt('fd-c-8').focus(); await page.keyboard.press('ArrowLeft');
  assert.equal((await board(P)).at, 7, 'an arrow key steps it');
  assert.equal((await focused()).focus, 'fd-c-7', 'focus follows');
  await tap(pt('fd-l-A'));
  await tap(pt('fd-p-5_4'));
  assert.deepEqual((await board(P)).dots.A, [5, 4], 'A moves');
  await press('Fold');
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
