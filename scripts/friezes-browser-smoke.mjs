// Plays Footprint borders through the real interface: dragging the copy (a
// live preview, one move on release), arrow keys, Undo; putting and taking
// away Fs, including taps on a repeat and taps just either side of the middle
// line; the copy's buttons and where focus lands after them; moving Fs;
// Can't with its two taps, a refusal that stays through Undo and through an
// edit and back, and a right claim with its argument on another border;
// Can't by Tab and Enter down the page, refused, then Restart; no claim with
// a row empty; Can't for every half-turn with the forms; Shortest refused,
// kept after a slide away and back, and right the other way; Shortest
// refused both ways, with the board's note to Restart; the half-turn's
// point among drawn dots, and Restart after a wrong one; and the playground's
// lengths. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1
// for a phone with touch). Screenshots go in test-results/friezes/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/friezes/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.fz-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const told = () => page.locator('.fz-told').innerText();
const focused = () => page.evaluate(() => document.activeElement?.dataset?.focus || document.activeElement?.tagName);
// Board points (places are 30 wide, rows 15 above and below the middle line)
// to page points, through the board's own transform.
const SW = 30;
const client = (x, y) => page.evaluate(([x, y]) => { const svg = document.querySelector('.fz-board'), m = svg.getScreenCTM(), p = svg.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(m); return [q.x, q.y]; }, [x, y]);
const placeAt = (c, r, dx = 0, dy = 0) => [(c + 0.5) * SW + dx, (r === 0 ? -15 : 15) + dy];
async function tapAt([x, y]) { const [px, py] = await client(x, y); if (phone) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py); }
const tapPlace = (c, r, dx, dy) => tapAt(placeAt(c, r, dx, dy));
// A drag along the board: a mouse drag on a desktop, a touch drag on a phone.
let cdp = null;
async function drag(places, {release = true} = {}) {
  const [x0, y0] = await client(...placeAt(0, 0, 0, 8)), [x1] = await client(...placeAt(places, 0, 0, 8));
  if (!phone) {
    await page.mouse.move(x0, y0); await page.mouse.down();
    for (let s = 1; s <= 10; s++) await page.mouse.move(x0 + (x1 - x0) * s / 10, y0 + s % 2);
    if (release) await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', x0, y0);
  for (let s = 1; s <= 10; s++) await touch('touchMove', x0 + (x1 - x0) * s / 10, y0);
  if (release) await touch('touchEnd', x1, y0);
}
const endDrag = async () => { if (!phone) await page.mouse.up(); else await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}); };
const button = name => page.getByRole('button', {name, exact: true});
const press = async name => { await button(name).click(); };
const form = name => page.locator(`.fz-form[aria-label="${name} F"]`);
const undoButton = () => page.locator('[data-action="undo"]').click();
const restartButton = () => page.locator('[data-action="restart"]').click();

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Friezes QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family summary', {hasText: 'Footprint borders'}).count(), 1, 'the family is in the satchel');

  // Puzzle 1: a drag shows the copy as it goes and is one slide on release.
  const P1 = 'friezes-01';
  await open(P1); await fit('first slide');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Slide the copy until it matches.');
  assert.equal(await page.locator('.fz-tools').count(), 0, 'no buttons to show');
  await drag(1, {release: false});
  assert.ok(await page.locator('.fz-c.miss').count() > 0, 'the preview shows misses as it goes');
  await endDrag();
  assert.deepEqual((await board(P1)).copy, {s: 1, f: 1, u: 1}, 'a drag of one place is one slide');
  await undoButton();
  assert.deepEqual((await board(P1)).copy, {s: 1, f: 1, u: 0}, 'Undo takes the slide back');
  await page.locator('.fz-board').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  assert.equal(await focused(), 'fz-board', 'focus stays on the board after a key');
  assert.equal(await page.locator('.fz-c.miss').count() > 0, true);
  await page.keyboard.press('ArrowRight');
  await done(); await fit('solved'); await shot('slide-solved');

  // Puzzle 2 by keyboard: slides by arrow keys, Shortest, Enter on two Fs.
  const P2 = 'friezes-02';
  await open(P2);
  await page.locator('.fz-board').focus();
  for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowRight');
  await page.getByRole('button', {name: 'Shortest'}).click();
  await page.locator('[data-fz-slot="0,0"]').focus(); await page.keyboard.press('Enter');
  await page.locator('[data-fz-slot="4,0"]').focus(); await page.keyboard.press('Enter');
  assert.equal(await told(), 'There’s a nearer one.');
  assert.equal(await focused(), 'fz-board', 'after a refused claim, focus is on the board');
  assert.equal(await page.getByRole('button', {name: 'Shortest'}).isDisabled(), true, 'Shortest is off with the copy here');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('button', {name: 'Shortest'}).isDisabled(), true, 'slid away and back, it is off again');
  assert.equal(await told(), 'Shortest was refused with the copy here.');
  // Refused at the shortest slide both ways: the board points to Restart.
  const wrongShortest = async () => {
    await page.getByRole('button', {name: 'Shortest'}).click();
    await page.locator('[data-fz-slot="0,0"]').focus(); await page.keyboard.press('Enter');
    await page.locator('[data-fz-slot="4,0"]').focus(); await page.keyboard.press('Enter');
  };
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  await wrongShortest();
  assert.doesNotMatch(await told(), /Restart/, 'one way refused: no Restart note');
  await page.locator('.fz-board').focus();
  for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowLeft');
  assert.deepEqual((await board(P2)).copy, {s: 1, f: 1, u: -2});
  await wrongShortest();
  assert.match(await told(), /Shortest slide was refused both ways\. Restart to try again\.$/, 'both ways refused: the board says to Restart');
  await page.locator('.fz-board').focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await told(), 'Shortest slide was refused both ways. Restart to try again.', 'and still after a slide');
  await shot('shortest-stuck');
  await restartButton();
  assert.deepEqual((await board(P2)).refused, [], 'Restart clears them');
  await page.locator('.fz-board').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.getByRole('button', {name: 'Shortest'}).click();
  await page.locator('[data-fz-slot="0,0"]').focus(); await page.keyboard.press('Enter');
  await page.locator('[data-fz-slot="2,0"]').focus(); await page.keyboard.press(' ');
  await done();

  // Puzzle 3: build, flip, glide, then Can't (wrong, kept through Undo; then right).
  const P3 = 'friezes-03';
  await open(P3); await fit('a glide');
  assert.equal(await form('as-drawn').getAttribute('aria-pressed'), 'true', 'the as-drawn F starts chosen');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for an attempt');
  await tapPlace(0, 0, 0, 13);
  assert.deepEqual((await board(P3)).cell, [[0, null], [null, null]], 'a tap just above the middle line puts an F in the top row');
  await tapPlace(0, 0);
  assert.deepEqual((await board(P3)).cell, [[null, null], [null, null]], 'a tap on the same F takes it away');
  await tapPlace(0, 0);
  await form('flipped-down').click();
  assert.equal(await form('flipped-down').getAttribute('aria-pressed'), 'true');
  await tapPlace(3, 1, 0, -13);
  assert.deepEqual((await board(P3)).cell, [[0, null], [null, 2]], 'a tap on a repeat, just below the middle line, changes the cell');
  await page.locator('.fz-tool.fz-flip').click();
  assert.equal(await focused(), 'fz-flip', 'focus stays on the flip button');
  assert.deepEqual((await board(P3)).copy, {s: 1, f: -1, u: 0});
  await drag(1);
  assert.deepEqual((await board(P3)).shown, [0], 'the glide matches');
  await press('Can’t');
  assert.equal(await told(), 'Tap an F, then where it lands.');
  assert.equal(await page.locator('[data-fz-copy] .fz-c').count(), 0, 'the copy is hidden while pointing');
  await tapPlace(0, 0);
  assert.equal(await page.locator('.fz-pick').count(), 1, 'the F is picked');
  assert.equal(await page.locator('.fz-hint').count(), 0, 'no hint rings the answer');
  await tapPlace(1, 1);
  assert.equal(await told(), 'It doesn’t land there.');
  assert.equal(await button('Can’t').isDisabled(), true, 'the refusal stands');
  assert.notEqual(await focused(), 'fz-claim-1', 'focus is not on Can’t');
  await shot('cant-refused');
  await undoButton();
  assert.equal((await board(P3)).refused.length, 1, 'Undo keeps the refusal');
  assert.equal(await button('Can’t').isDisabled(), true, 'and Can’t stays off');
  assert.equal(await told(), 'A claim was refused on this border.', 'Undo takes the refusal’s words away and says why Can’t is off');
  // Changing the border and changing it back brings the refusal back with it.
  await tapPlace(1, 0); await tapPlace(1, 0);
  assert.equal((await board(P3)).refused.length, 1, 'the refusal is kept with its border');
  await drag(-1); await drag(1);
  assert.equal(await button('Can’t').isDisabled(), true, 'back on that border, with the flip tried again, Can’t stays off');
  // Another border that works: an F of each other form beside them.
  await form('flipped-across').click(); await tapPlace(1, 0);
  await form('half-turned').click(); await tapPlace(0, 1);
  assert.deepEqual((await board(P3)).cell, [[0, 1], [3, 2]]);
  assert.deepEqual((await board(P3)).shown, [0], 'the copy, gliding where it was, matches the new border');
  await drag(-1); // the flip alone, on this border
  await press('Can’t');
  await tapPlace(2, 0); // the repeat of the as-drawn F, one cell along
  await tapPlace(2, 1, 0, -12);
  await done(); await fit('glide solved');
  assert.equal(await page.locator('.fz-ring.bad').count(), 1, 'the gap is ringed');
  await shot('cant-solved');

  // Puzzle 4: pick up an F and put it down.
  const P4 = 'friezes-04';
  await open(P4); await fit('move one');
  await tapPlace(0, 0);
  assert.equal(await page.locator('.fz-held').count(), 1, 'the F is held');
  await tapPlace(1, 0);
  assert.deepEqual((await board(P4)).cell, [[null, 0], [2, null]], 'it moves');
  await page.locator('.fz-tool.fz-flip').click();
  await page.locator('.fz-board').focus(); await page.keyboard.press('ArrowRight');
  // Down the page by keyboard: Can't, then Tab and Enter on the first two
  // places. The place after an F is beside it, not where the flip puts it.
  await press('Can’t');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'page order does not solve it');
  assert.equal((await board(P4)).refused.length, 1, 'it is judged and refused');
  // Restart clears the refusal; then the right claim.
  await restartButton();
  assert.deepEqual((await board(P4)).refused, [], 'Restart clears it');
  await tapPlace(0, 0); await tapPlace(1, 0);
  await page.locator('.fz-tool.fz-flip').click();
  await drag(1);
  await press('Can’t');
  await tapPlace(1, 0); await tapPlace(1, 1);
  await done();

  // Puzzle 6: no half-turn, by one F and the form it becomes.
  const P6 = 'friezes-06';
  await open(P6);
  // Fs in one row: the turn is tried, and Can't stays off.
  await tapPlace(0, 0); await form('half-turned').click(); await tapPlace(1, 0);
  await page.locator('.fz-tool.fz-turn').click();
  assert.equal(await button('Can’t').isDisabled(), true, 'no claim with a row empty');
  assert.equal(await told(), 'A border needs an F in each row.');
  await page.locator('.fz-tool.fz-turn').click(); await tapPlace(1, 0);
  await form('flipped-down').click(); await tapPlace(0, 1);
  await page.locator('.fz-tool.fz-flip').click();
  assert.deepEqual((await board(P6)).shown, [0]);
  await page.locator('.fz-tool.fz-flip').click();
  await page.locator('.fz-tool.fz-turn').click();
  assert.equal(await focused(), 'fz-turn', 'focus stays on Turn');
  await press('Can’t');
  assert.equal(await form('half-turned').isDisabled(), true, 'the forms wait for an F');
  await tapPlace(0, 0);
  assert.equal(await told(), 'Tap an F, then what it becomes.');
  await form('flipped-across').click();
  assert.equal(await told(), 'That doesn’t rule out every half-turn.');
  assert.match(String(await focused()), /^fz-(form|board|flip|turn)/, 'focus on the board or its controls');
  await shot('family-refused');
  await tapPlace(1, 1); await tapPlace(1, 1); // put and take away: a changed border, then the same one
  await page.locator('.fz-tool.fz-turn').click(); await page.locator('.fz-tool.fz-flip').click();
  assert.deepEqual((await board(P6)).shown, [0], 'the flip again');
  await page.locator('.fz-tool.fz-flip').click(); await page.locator('.fz-tool.fz-turn').click();
  assert.equal(await button('Can’t').isDisabled(), true, 'back on the refused border, Can’t stays off');
  // Another answer: a second column like the first.
  await form('as-drawn').click(); await tapPlace(1, 0);
  await form('flipped-down').click(); await tapPlace(1, 1);
  await page.locator('.fz-tool.fz-turn').click(); await page.locator('.fz-tool.fz-flip').click();
  assert.deepEqual((await board(P6)).shown, [0], 'the flip on the new border');
  await page.locator('.fz-tool.fz-flip').click(); await page.locator('.fz-tool.fz-turn').click();
  await press('Can’t');
  await tapPlace(0, 0); await form('half-turned').click();
  await done(); await fit('flip, no turn');
  await shot('family-solved');

  // Puzzle 7: Shortest, a pair too far and the right pair.
  const P7 = 'friezes-07';
  await open(P7); await fit('slide and glide');
  await drag(4);
  assert.deepEqual((await board(P7)).copy, {s: 1, f: 1, u: 4});
  await page.getByRole('button', {name: 'Shortest'}).first().click();
  await tapPlace(0, 0); await tapPlace(1, 0);
  assert.equal(await told(), 'It can’t land there.');
  await drag(-1); await drag(1);
  assert.equal(await page.getByRole('button', {name: 'Shortest'}).first().isDisabled(), true, 'back where it was refused, Shortest is off');
  await page.locator('.fz-board').focus();
  for (let k = 0; k < 8; k++) await page.keyboard.press('ArrowLeft');
  assert.deepEqual((await board(P7)).copy, {s: 1, f: 1, u: -4});
  await page.getByRole('button', {name: 'Shortest'}).first().click();
  await tapPlace(0, 0); await tapPlace(4, 0, -12);
  assert.equal((await board(P7)).done.length, 1, 'the slide is shown shortest');
  await page.locator('.fz-tool.fz-flip').click();
  await drag(2);
  assert.deepEqual((await board(P7)).copy, {s: 1, f: -1, u: -2});
  await page.getByRole('button', {name: 'Shortest'}).click();
  await tapPlace(0, 0); await tapPlace(-2, 1);
  await done(); await fit('slide and glide solved');
  await shot('shortest-solved');

  // Puzzle 10: both flips, then the point, tapped off the crossing a little.
  const P10 = 'friezes-10';
  await open(P10); await fit('crossing');
  await form('flipped-across').click(); await tapPlace(1, 0);
  await form('as-drawn').click(); await tapPlace(2, 0);
  await form('half-turned').click(); await tapPlace(1, 1);
  await form('flipped-down').click(); await tapPlace(2, 1);
  await page.locator('.fz-tool.fz-flip').click(); await page.locator('.fz-tool.fz-flip').click();
  await page.locator('.fz-tool.fz-mirror').click();
  assert.deepEqual((await board(P10)).shown, [0, 1]);
  await press('Turn here');
  assert.equal(await told(), 'Tap the point.');
  assert.equal(await page.locator('.fz-cand').count(), 15, 'every point along the middle line is drawn as a choice');
  await fit('turn here'); await shot('centre-choosing');
  await tapAt([2.5 * SW + 4, 2]);
  assert.equal(await told(), 'That turn doesn’t match.', 'a point half a place off');
  assert.equal(await page.locator('.fz-point.bad').count(), 1);
  await shot('centre-refused');
  // Restart clears the refusal; build again.
  await restartButton();
  await form('flipped-across').click(); await tapPlace(1, 0);
  await form('as-drawn').click(); await tapPlace(2, 0);
  await form('half-turned').click(); await tapPlace(1, 1);
  await form('flipped-down').click(); await tapPlace(2, 1);
  await page.locator('.fz-tool.fz-flip').click(); await page.locator('.fz-tool.fz-flip').click();
  await page.locator('.fz-tool.fz-mirror').click();
  assert.deepEqual((await board(P10)).shown, [0, 1], 'both flips again');
  await press('Turn here');
  await tapAt([2 * SW + 6, -3]); // nearer the crossing than the half places either side
  await done(); await fit('centre');
  assert.equal(await page.locator('.fz-point.good').count(), 1);
  await shot('centre-solved');

  // Puzzle 11 at its busiest: a cell of 6 with the copy flipped.
  await open('friezes-11'); await page.locator('.fz-tool.fz-flip').click(); await drag(3); await fit('a longer border');
  await shot('long-glide');

  // The playground: lengths, buttons, edits; no Hint.
  const G = 'friezes-playground';
  await open(G); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await page.locator('.fz-period', {hasText: '5'}).click();
  assert.equal((await board(G)).cell[0].length, 5);
  await tapPlace(0, 0); await form('flipped-down').click(); await tapPlace(0, 1);
  await page.locator('.fz-tool.fz-flip').click();
  assert.equal(await page.locator('.fz-c.hit').count() > 0, true, 'the flip matches');
  await page.locator('.fz-tool.fz-mirror').click(); await page.locator('.fz-tool.fz-turn').click();
  await drag(2);
  assert.deepEqual((await board(G)).copy, {s: 1, f: 1, u: 2});
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
