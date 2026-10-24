// Plays Ways out through the real interface: taps that block and unblock
// dots, drags that pan the endless map (and the tree in its disk), the
// button back to the start, Check with its counts, Can't right (with the box,
// the tails and the ring road drawn, only after a Check with a block) and
// wrong, hints that try and Check before Can't, the block budget, Undo, the
// keyboard (arrow keys along the roads, Enter to block), solves on the line,
// the ladder, the grid and the tree, and the playground's maps. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/ends/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
const pack = JSON.parse(await readFile(new URL('../dist/families/ends/ends.json', import.meta.url), 'utf8'));
const hintsOf = id => pack.puzzles.find(p => p.id === id).hints;
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/ends/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.ends-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const dot = id => page.locator(`.ends-dot[data-dot="${id}"]`);
const told = () => page.locator('.ends-told').innerText();
const button = name => page.getByRole('button', {name, exact: true});
const viewBox = () => page.locator('[data-ends-board]').getAttribute('viewBox');
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async locator => tapAt(await center(locator));
const taps = async ids => { for (const id of ids.split(' ')) await tap(dot(id)); };
// A drag by (dx, dy) pixels from a point: a mouse drag on a desktop, a touch
// drag on a phone.
let cdp = null;
async function drag([x, y], dx, dy) {
  const steps = 12;
  if (!phone) {
    await page.mouse.move(x, y); await page.mouse.down();
    for (let s = 1; s <= steps; s++) await page.mouse.move(x + dx * s / steps, y + dy * s / steps);
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, px, py) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x: px, y: py}]});
  await touch('touchStart', x, y);
  for (let s = 1; s <= steps; s++) await touch('touchMove', x + dx * s / steps, y + dy * s / steps);
  await touch('touchEnd', x + dx, y + dy);
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Ways QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1, the line: taps, Check, a drag, the button back to the start, a solve.
  const L = 'ends-01';
  await open(L); await fit('line');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Trap exactly 2 pieces.');
  assert.equal(await page.locator('.ends-home').count(), 0, 'no button back while at the start');
  await taps('0,0');
  assert.deepEqual((await board(L)).blocks, ['0,0'], 'a tap blocks a dot');
  assert.equal(await page.locator('.ends-slots i.ends-used').count(), 1, 'a slot fills');
  await taps('0,0');
  assert.deepEqual((await board(L)).blocks, [], 'a second tap takes the block off');
  await taps('-1,0 0,0');
  await button('Check').click();
  assert.equal(await told(), '2 forever pieces.', 'two blocks side by side trap nothing');
  assert.equal(await page.locator('.ends-dot.ends-c0').count() > 0 && await page.locator('.ends-dot.ends-c1').count() > 0, true, 'the two tails are coloured');
  assert.equal(await button('Check').isDisabled(), true, 'Check waits for a change');
  assert.equal(await page.locator('#completion-heading').count(), 0);
  await shot('line-checked');
  // Drag the line left by three dots: dot 6 comes into view and can be blocked.
  const before = await viewBox(), step = (await dot('1,0').boundingBox()).x - (await dot('0,0').boundingBox()).x;
  await drag(await center(dot('2,0')), -3 * step, 0);
  assert.notEqual(await viewBox(), before, 'a drag pans the map');
  assert.deepEqual((await board(L)).blocks, ['-1,0', '0,0'], 'a drag blocks nothing');
  assert.equal(await page.locator('.ends-told').count(), 1, 'a drag changes nothing on the board');
  await taps('6,0');
  assert.deepEqual((await board(L)).blocks, ['-1,0', '0,0', '6,0'], 'a dot dragged into view can be blocked');
  assert.equal(await page.locator('.ends-told').count(), 0, 'a change clears the pieces');
  await page.locator('.ends-home').click();
  assert.equal(await viewBox(), before, 'back to the start');
  assert.equal(await page.locator('.ends-home').count(), 0);
  await page.locator('[data-action="restart"]').click();
  await taps('-2,0 0,0 2,0');
  await button('Check').click();
  await done(); await fit('line solved');
  assert.equal(await told(), '2 forever pieces, 2 trapped.');
  assert.equal(await page.locator('.ends-dot.trap').count(), 2, 'the trapped dots are marked');
  await shot('line-solved');

  // Puzzle 2, the ladder: one block is not enough; the budget; a rung splits it.
  const D = 'ends-02';
  await open(D); await fit('ladder');
  await taps('0,0');
  await button('Check').click();
  assert.equal(await told(), '1 forever piece.', 'the other rail goes round one block');
  // Dots and rails at least 44 px apart (7 columns on a phone, not 9).
  const [x00, y00] = await center(dot('0,0')), [x10] = await center(dot('1,0')), [, y01] = await center(dot('0,1'));
  assert.ok(x10 - x00 >= 44 && y01 - y00 >= 44, `ladder dots ${Math.round(x10 - x00)} px apart, rails ${Math.round(y01 - y00)} px`);
  await taps('3,0');
  assert.deepEqual((await board(D)).blocks, ['0,0', '3,0'], 'two blocks fill the slots');
  // With the slots full an open dot is not a control: a tap on it changes
  // nothing, says nothing and pulses the slots.
  assert.match(await dot('0,1').getAttribute('class'), /\boff\b/, 'an open dot is off');
  assert.doesNotMatch(await dot('3,0').getAttribute('class'), /\boff\b/, 'a blocked dot is not');
  await taps('0,1');
  assert.deepEqual((await board(D)).blocks, ['0,0', '3,0'], 'a third block is not placed');
  assert.equal((await page.locator('.feedback').innerText().catch(() => '')).trim(), '', 'and no refusal is shown');
  assert.match(await page.locator('.ends-slots').getAttribute('class'), /ends-pulse/, 'the slots pulse');
  await page.locator('.ends-dot[tabindex="0"]').focus();
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.dot), '3,0', 'the keyboard’s dot stays on the last block');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.dot), '3,1', 'the keyboard walks onto an open dot');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board(D)).blocks, ['0,0', '3,0'], 'Enter on an open dot does nothing either');
  await taps('3,0');
  await taps('0,1');
  await button('Check').click();
  await done();
  assert.equal(await told(), '2 forever pieces.');

  // Puzzle 7: Can't waits for a Check with a block; a wrong Can't.
  await open('ends-07');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t is off at the start');
  await taps('-1,0');
  assert.equal(await button('Can’t').isDisabled(), true, 'and before a Check');
  await button('Check').click();
  assert.equal(await button('Can’t').isDisabled(), false, 'on after a Check with a block');
  await button('Can’t').click();
  assert.equal(await told(), 'It can be done.');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a change');
  await taps('1,0');
  await button('Check').click();
  assert.equal(await button('Can’t').isDisabled(), false);

  // Puzzle 4: the hints try a block and Check, with the authored reason, before Can't.
  const H = hintsOf('ends-04'), card = () => page.locator('.hint-card').innerText();
  await open('ends-04');
  await button('Hint').click();
  assert.equal(await card(), H[0], 'the first hint is the authored try');
  await button('Hint').click();
  assert.equal(await page.locator('.ends-dot.hinted[data-dot="0,0"]').count(), 1, 'the second level marks a dot to try');
  await taps('0,0');
  assert.equal(await card(), H[1], 'after a block: the reason, and Check');
  assert.equal(await page.locator('.ends-check.hinted').count(), 1);
  await button('Check').click();
  assert.equal(await card(), H[2], 'after a Check: Can’t');
  assert.equal(await page.locator('.ends-cant.hinted').count(), 1);
  await button('Can’t').click();
  await done();
  assert.equal(await told(), 'Outside the box: 2 pieces.');

  // Puzzle 6: a right Can't on the ladder draws the box and the two tails.
  await open('ends-06');
  await taps('-1,0 -1,1 1,0 1,1');
  await button('Check').click();
  assert.equal(await told(), '2 forever pieces, 1 trapped.');
  await button('Can’t').click();
  await done();
  assert.equal(await told(), 'Outside the box: 2 pieces.');
  assert.equal(await page.locator('.ends-box').count(), 1, 'the box round the blocks');
  assert.equal(await page.locator('.ends-ring').count(), 0, 'no ring road on a ladder');
  assert.ok(await page.locator('.ends-dot.ends-c0').count() && await page.locator('.ends-dot.ends-c1').count(), 'the two tails');
  await shot('ladder-cant');

  // Puzzle 3, the grid: the keyboard moves along roads and blocks.
  const G = 'ends-03';
  await open(G); await fit('grid');
  await page.locator('.ends-dot[tabindex="0"]').focus();
  assert.equal(await page.locator('.ends-dot[tabindex="0"]').getAttribute('data-dot'), '0,0', 'the keyboard starts at the start dot');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  assert.deepEqual((await board(G)).blocks, ['0,-1', '-1,0', '1,0', '0,1'], 'arrow keys and Enter block the four neighbours');
  await button('Check').click();
  await done();
  assert.equal(await told(), '1 forever piece, 1 trapped.');
  // Seven arrow presses to the right keep the keyboard's dot in sight.
  await open('ends-11');
  await page.locator('.ends-dot[tabindex="0"]').focus();
  for (let k = 0; k < 7; k++) await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.ends-dot[tabindex="0"]').getAttribute('data-dot'), '7,0', 'the keyboard walks off the first view');
  assert.ok(await page.locator('.ends-dot[data-dot="7,0"][role="button"]').count(), 'and the map pans to keep it in sight');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.dot), '7,0', 'focus stays on it');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board('ends-11')).blocks, ['7,0']);

  // Puzzle 10: a right Can't on the grid draws the box and the ring road.
  await open('ends-10');
  await taps('-2,0 -1,0 0,0 1,0 2,0');
  await button('Check').click();
  assert.equal(await told(), '1 forever piece.', 'a wall does not split the grid');
  await drag(await center(dot('2,2')), -150, 0);
  await button('Can’t').click();
  await done();
  assert.equal(await told(), 'Outside the box: 1 piece.');
  assert.equal(await page.locator('.ends-ring').count(), 1, 'the ring road outside the box');
  const frame = await page.locator('.ends-frame').boundingBox(), ring = await page.locator('.ends-ring').boundingBox();
  assert.ok(ring.x >= frame.x && ring.y >= frame.y && ring.x + ring.width <= frame.x + frame.width && ring.y + ring.height <= frame.y + frame.height, 'the whole ring road is in view, round both ends of the wall');
  await shot('grid-cant');

  // Puzzle 8, the T: a solve at the junction.
  await open('ends-08'); await fit('T');
  await taps('0,1 1,1 0,0');
  await button('Check').click();
  await done();
  assert.equal(await told(), '3 forever pieces.');
  await shot('tee-solved');

  // Puzzle 5, the tree: the pitfall, a drag of the disk, the keyboard, a solve.
  const T = 'ends-05';
  await open(T); await fit('tree');
  await taps('a b c');
  await button('Check').click();
  assert.equal(await told(), '6 forever pieces, 1 trapped.', 'three blocks round the centre trap it');
  await shot('tree-trapped');
  await page.locator('[data-action="restart"]').click();
  const at = async id => center(dot(id));
  const [x0, y0] = await at('ab');
  await drag(await at('a'), 0, 60);
  const [x1, y1] = await at('ab');
  assert.ok(Math.hypot(x1 - x0, y1 - y0) > 20, 'a drag moves the tree');
  assert.equal(await page.locator('.ends-home').count(), 1, 'the button back appears');
  await taps('ab');
  assert.deepEqual((await board(T)).blocks, ['ab'], 'a tap after a drag blocks');
  await page.locator('.ends-home').click();
  await page.locator('.ends-dot[tabindex="0"]').focus();
  assert.equal(await page.locator('.ends-dot[tabindex="0"]').getAttribute('data-dot'), 'o', 'the keyboard starts at the centre');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  const cursor = await page.locator('.ends-dot[tabindex="0"]').getAttribute('data-dot');
  assert.ok(['b', 'c'].includes(cursor), `an arrow key moves along a road (${cursor})`);
  await page.locator('.ends-home').click();
  await taps('ba');
  await button('Check').click();
  await done();
  assert.equal(await told(), '7 forever pieces.');
  await shot('tree-solved');

  // The playground: maps, blocks and Check; no Hint.
  const P = 'ends-playground';
  await open(P); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  assert.equal(await button('Can’t').count(), 0, 'no Can’t');
  await button('Tree').click();
  assert.equal((await board(P)).map, 'tree');
  await taps('o');
  await button('Check').click();
  assert.equal(await told(), '3 forever pieces.');
  await button('T of three ladders').click();
  assert.deepEqual(await board(P), {map: 'tee', blocks: [], shown: null}, 'a new map starts clear');
  await taps('0,1 1,1');
  await button('Check').click();
  assert.equal(await told(), '2 forever pieces.');
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
