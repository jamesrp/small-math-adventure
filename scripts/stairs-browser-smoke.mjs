// Plays Staircases, a group in Memory robot, through the real interface: the
// group under Memory robot's levels in the satchel; taps on the dots (touch
// taps with TEST_PHONE=1), a tap between two dots going to the nearer, a tap
// on a corner of the trail taking the walk back, a tap away from every dot
// doing nothing; a drag from the robot and back over the trail; Fewest off
// until the flag; a staircase with too many turns, whose windows are always
// refused, with the refusal drawn until the next tap; the fewest turns and
// the right windows solving, drawn; Undo; the keyboard (Enter on a dot, the
// arrow keys, Enter on a column) with focus on the board, never on Fewest;
// hints marking a dot, a corner to go back to and the windows, and hints
// alone finishing the hardest staircase; an exact length kept, the same path
// again, a second path; and the busiest boards of the hardest puzzles fitting
// a 375 × 667 phone. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone).
// Screenshots go in test-results/stairs/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1280, height: 800}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/stairs/', import.meta.url);
const shot = async name => { await page.waitForTimeout(250); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const walk = async id => (await board(id))?.walk ?? '';
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="stairs"].st-puzzle').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// A touch tap's click can land a moment after the tap resolves, so checks that follow a tap retry briefly.
async function eventually(check) { let last; for (let k = 0; k < 30; k++) { try { return await check(); } catch (e) { last = e; await page.waitForTimeout(100); } } throw last; }
const tapAt = ([x, y]) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
const button = name => page.getByRole('button', {name, exact: true});
const solved = () => page.locator('#completion-heading').waitFor({timeout: 5000});
// Where a corner (x across, y up) of the board is on the screen.
const at = (x, y) => page.evaluate(([x, y]) => {
  const svg = document.querySelector('svg.st-board[data-sg-board]'), b = svg.viewBox.baseVal, rows = Math.round((b.height + 2 * b.y) / 10);
  const p = svg.createSVGPoint(); p.x = x * 10; p.y = (rows - y) * 10;
  const r = p.matrixTransform(svg.getScreenCTM());
  return [r.x, r.y];
}, [x, y]);
const block = () => page.evaluate(() => { const svg = document.querySelector('svg.st-board[data-sg-board]'); return svg.getScreenCTM().a * 10; });
async function tapCorner(id, x, y, expect) {
  await page.locator('svg.st-board[data-sg-board]').scrollIntoViewIfNeeded();
  await tapAt(await at(x, y));
  if (expect !== undefined) await eventually(async () => assert.equal(await walk(id), expect));
}
// Taps the dots of a walk, one straight piece at a time.
const STEP = {E: [1, 0], N: [0, 1], W: [-1, 0]};
async function tapWalk(id, word) {
  let x = 0, y = 0, done = '';
  const prefix = await walk(id);
  for (const c of prefix) { x += STEP[c][0]; y += STEP[c][1]; }
  for (let i = 0; i < word.length;) {
    let j = i; while (word[j] === word[i]) j++;
    const s = j - i; x += STEP[word[i]][0] * s; y += STEP[word[i]][1] * s; done += word.slice(i, j);
    const dot = page.locator(`[data-go="${x},${y}"]`);
    assert.equal(await dot.count(), 1, `a dot at ${x},${y}`);
    await tapCorner(id, x, y);
    // A path that fills the last box on the flag is kept, and the robot starts again.
    await eventually(async () => { const now = await board(id); assert.ok(now.walk === prefix + done || (now.walk === '' && now.kept === prefix + done) || (now.kept && now.walk === prefix + done), `${prefix + done}: ${JSON.stringify(now)}`); });
    i = j;
  }
}
// A drag through screen points, as a mouse or a finger.
async function drag(points) {
  if (!phone) {
    await page.mouse.move(...points[0]); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(...p, {steps: 6});
    await page.mouse.up();
    return;
  }
  const cdp = await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', points[0]);
  for (let k = 1; k < points.length; k++) for (let s = 1; s <= 6; s++) {
    const [x0, y0] = points[k - 1], [x1, y1] = points[k];
    await touch('touchMove', [x0 + (x1 - x0) * s / 6, y0 + (y1 - y0) * s / 6]);
  }
  await touch('touchEnd', points.at(-1));
  await cdp.detach();
}
const tapColumns = async (...cols) => { for (const c of cols) { const r = page.locator(`[data-window="${c}"]`); await r.scrollIntoViewIfNeeded(); const b = await r.boundingBox(); await tapAt([b.x + b.width / 2, b.y + b.height * .15]); await page.waitForTimeout(120); } };
const focused = () => page.evaluate(() => document.activeElement?.dataset.focus || document.activeElement?.id || document.activeElement?.tagName);

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Stairs QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const family = page.locator('.satchel-family[data-view-key="family-robot"]');
  assert.equal(await family.locator('.family-ink-symbol').innerText(), '⟲');
  assert.equal(await family.locator('[data-id^="robot-"]').count(), 13, 'Memory robot keeps its playground and twelve puzzles');
  assert.equal(await family.locator('[data-id^="stairs-"]').count(), 9);
  assert.equal(await family.locator('.library-group h2').textContent(), 'Staircases');

  // Puzzle 1: dots, a tap between two dots, a cut back, a tap off every dot.
  const P1 = 'stairs-01';
  await open(P1); await fit('fresh'); await shot('01-fresh');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Reach the flag with the fewest turns.');
  assert.equal(await page.locator('.st-fewest').isDisabled(), true, 'Fewest is off until the flag');
  assert.equal(await page.locator('.st-go').count(), 4, 'right 1, 2 or 3, or up 1');
  const u = await block();
  let [x, y] = await at(1, 0);
  await tapAt([x + .38 * u, y]); // between the dots at 1 and 2 across, nearer 1
  await eventually(async () => assert.equal(await walk(P1), 'E', 'a tap goes to the nearest corner'));
  await tapCorner(P1, 0, 1); // in the strip, but no dot: a staircase never goes left
  await page.waitForTimeout(300);
  assert.equal(await walk(P1), 'E', 'a tap away from every dot does nothing');
  await tapWalk(P1, 'NENEN');
  assert.equal(await walk(P1), 'ENENEN');
  await tapCorner(P1, 1, 1, 'EN');
  assert.equal(await page.locator('.st-trail-case').getAttribute('points'), '0,30 10,30 10,20');
  // Too many turns: every claim is refused; the refused columns stay until the next tap.
  await tapWalk(P1, 'ENENEEE');
  assert.equal(await walk(P1), 'ENENENEEE');
  assert.equal(await page.locator('.st-fewest').isDisabled(), false);
  await button('Fewest').click();
  assert.equal(await page.locator('.st-wins li').count(), 4, 'six turns need four windows');
  assert.equal(await page.locator('.st-column.on, .st-window-on, .st-window-hint').count(), 0, 'nothing marks which columns work');
  await tapColumns(0, 2, 4);
  assert.equal(await page.locator('.st-column.on').count(), 3);
  await tapColumns(5);
  await page.locator('.st-note', {hasText: 'A flat piece can cross two of these.'}).waitFor();
  assert.equal(await page.locator('.st-window-told').count(), 4);
  assert.equal(await page.locator('.st-column.on').count(), 0, 'the taps clear');
  assert.equal((await board(P1)).windows, null);
  await fit('refused'); await shot('01-refused');
  await tapColumns(0);
  assert.equal(await page.locator('.st-window-told').count(), 0, 'the next tap clears the refusal');
  // Undo takes back the last piece and leaves Fewest.
  await button('↶ Undo').click();
  await eventually(async () => assert.equal(await walk(P1), 'ENENEN'));
  assert.equal(await page.locator('.st-column').count(), 0);
  // Start again and make 2 turns: the windows are the first and last columns.
  await tapCorner(P1, 0, 0, '');
  await tapWalk(P1, 'EEENNNEEE');
  await button('Fewest').click();
  assert.equal(await page.locator('.st-wins li').count(), 2);
  await tapColumns(0, 4);
  await page.locator('.st-note').waitFor();
  await tapColumns(0, 5);
  await solved();
  assert.deepEqual((await board(P1)).windows, [0, 5]);
  assert.equal(await page.locator('.st-window-on.proved').count(), 2);
  assert.equal(await page.locator('.st-flat').count(), 2);
  assert.equal(await page.locator('[data-action="open-puzzle"][data-id="stairs-02"]').count(), 1, 'Next puzzle stays in the group');
  await fit('solved'); await shot('01-solved');

  // Puzzle 2: drags from the robot and back over the trail; the keyboard.
  const P2 = 'stairs-02';
  await open(P2);
  await drag([await at(0, 0), await at(2, 0), await at(2, 3)]);
  await eventually(async () => assert.equal(await walk(P2), 'EENNN', 'a drag from the robot'));
  await drag([await at(2, 3), await at(2, 1)]);
  await eventually(async () => assert.equal(await walk(P2), 'EEN', 'dragged back over the trail'));
  await drag([await at(5, 5), await at(6, 6)]);
  await page.waitForTimeout(300);
  assert.equal(await walk(P2), 'EEN', 'a drag away from the trail moves nothing');
  await page.locator('[data-go="2,3"]').focus(); await page.keyboard.press('Enter');
  await eventually(async () => assert.equal(await walk(P2), 'EENNN'));
  assert.match(await focused(), /^st-go-|^st-board$/, 'focus stays on the board');
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowRight']) await page.keyboard.press(k);
  await eventually(async () => assert.equal(await walk(P2), 'EENNNEEEEENNNEE'));
  assert.equal(await focused(), 'st-board', 'on the flag, focus is on the board, not on Fewest');
  assert.match(await page.locator('.st-puzzle [role=status]').innerText(), /^At 9 across, 6 up\. 4 turns\.$/);
  await page.keyboard.press('ArrowLeft');
  assert.equal(await walk(P2), 'EENNNEEEEENNNEE', 'no left steps in a staircase');
  // Hints at the flag ring Fewest, then the windows.
  await button('Hint').click(); await button('Hint').click();
  await page.locator('.hint-card', {hasText: 'Press Fewest and tap columns 1, 5 and 9'}).waitFor();
  assert.equal(await page.locator('.st-fewest.hinted').count(), 1);
  await page.locator('.st-fewest').focus(); await page.keyboard.press('Enter');
  await page.locator('.st-column').first().waitFor();
  assert.equal(await page.locator('.st-window-hint').count(), 3);
  await shot('02-hinted-windows');
  for (const c of [0, 4, 8]) { await page.locator(`[data-window="${c}"]`).focus(); await page.keyboard.press('Enter'); }
  await solved();
  assert.equal(await focused(), 'completion-heading');

  // Puzzle 4: a hint marks the corner to go back to.
  const P4 = 'stairs-04';
  await open(P4);
  await tapWalk(P4, 'ENENEN');
  await button('Hint').click(); await button('Hint').click();
  await page.locator('.hint-card', {hasText: /^Take the trail back to/}).waitFor();
  assert.equal(await page.locator('.st-back-hint').count(), 1);
  await fit('back hint'); await shot('04-back-hint');

  // Puzzle 5, the worksheet's: the busiest claim fits; hints alone finish it.
  const P5 = 'stairs-05';
  await open(P5);
  for (let s = 0; s < 40 && !(await page.locator('.st-fewest:not([disabled])').count()); s++) {
    const dots = page.locator('.st-go');
    const n = await dots.count();
    const go = await dots.nth(n - 1).getAttribute('data-go');
    const [gx, gy] = go.split(',').map(Number);
    await tapCorner(P5, gx, gy);
    await page.waitForTimeout(80);
  }
  assert.ok(await page.locator('.st-fewest:not([disabled])').count(), 'reached the flag');
  await button('Fewest').click();
  const slots = await page.locator('.st-wins li').count();
  await tapColumns(...[0, 3, 6, 10, 14, 1, 2, 4, 5, 7, 8].slice(0, slots - 1));
  await fit('busiest');
  const box = await page.locator('svg.st-board').boundingBox(), tools = await page.locator('.st-tools').boundingBox();
  assert.ok(box.width <= 381, `the board is at most 380px wide (${box.width})`);
  if (phone) assert.ok(tools.y + tools.height - box.y <= 667, 'the board, Fewest and its slots fit on the phone screen at once');
  await shot('05-busiest');
  await button('Restart').click();
  await page.locator('.st-column').waitFor({state: 'detached'});
  for (let i = 0; i < 3; i++) await button('Hint').click();
  for (let s = 0; s < 30 && !await page.locator('#completion-heading').count(); s++) await button('Apply hint').click();
  await solved();
  assert.equal((await walk(P5)).length, 28);
  await fit('solved'); await shot('05-solved');

  // Puzzle 6: an exact length, kept; the same path again; a second path.
  const P6 = 'stairs-06';
  await open(P6);
  assert.equal(await page.locator('.st-slot').count(), 9);
  assert.equal(await page.locator('.st-fewest').count(), 0);
  await tapWalk(P6, 'EEEENNN');
  assert.equal(await page.locator('.st-played').count(), 7);
  assert.equal(await page.locator('#completion-heading').count(), 0, 'the flag before the last box');
  await tapCorner(P6, 4, 1, 'EEEEN');
  await tapWalk(P6, 'NWNE');
  await eventually(async () => assert.deepEqual(await board(P6), {walk: '', kept: 'EEEENNWNE'}));
  assert.equal(await page.locator('.st-ghost').count(), 1);
  assert.equal(await page.locator('.st-played').count(), 0, 'the boxes empty for a second path');
  await shot('06-kept');
  await tapWalk(P6, 'EEEENNWNE');
  await page.locator('.st-note', {hasText: 'That’s the same path.'}).waitFor();
  assert.equal(await page.locator('.st-go').count(), 0, 'no dots once the boxes are full');
  await fit('same path'); await shot('06-same');
  await button('↶ Undo').click();
  await eventually(async () => assert.equal(await walk(P6), 'EEEENNWN'));
  await tapCorner(P6, 4, 1, 'EEEEN');
  await tapWalk(P6, 'WNEN');
  await solved();
  await fit('second path'); await shot('06-solved');

  // Puzzle 8: twenty-seven boxes, the busiest exact board, fit the phone.
  const P8 = 'stairs-08';
  await open(P8);
  await tapWalk(P8, 'EEEEENWWWWNEEEENWWWWWNEEEE');
  await fit('27 boxes');
  const rows = await page.locator('.st-boxes').boundingBox();
  assert.ok(rows.height < 110, `three rows of boxes (${rows.height})`);
  await shot('08-busiest');
  await tapWalk(P8, 'E');
  await eventually(async () => assert.equal((await board(P8)).kept.length, 27));

  // How to play opens with the mathematics and has one small picture.
  await open(P1);
  await button('How to play').click();
  const help = page.locator('dialog');
  await help.locator('.st-help svg').waitFor();
  assert.match(await help.innerText(), /A staircase goes only right and up along the streets\. A turn is a corner where it changes direction/);
  await shot('help');
  await help.getByRole('button', {name: 'Done', exact: true}).click();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
