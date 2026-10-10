// Plays Memory robot through the real interface: the family and its
// playground in the satchel; order matters, by taps on the corners next to
// the robot (touch taps with TEST_PHONE=1), with the boxes filling, the dead
// end said at once, Undo, and taps away from those corners and on a full
// budget doing nothing; the keyboard (Enter on a corner, the arrow keys, focus
// kept on the board); the long strips far from the wall cancelling round a
// loop; a hint marking its corner and hints alone finishing a hard puzzle;
// and the playground's loops, numerals and Clear. Same environment variables
// as the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE,
// TEST_URL, TEST_PHONE=1 for a phone viewport). Screenshots go in
// test-results/robot/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/robot/', import.meta.url);
const shot = async name => { await page.waitForTimeout(300); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const walk = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board?.walk, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="robot"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// A touch tap's click can land a moment after the tap resolves, so checks that follow a tap retry briefly.
async function eventually(check) { let last; for (let k = 0; k < 30; k++) { try { return await check(); } catch (e) { last = e; await page.waitForTimeout(100); } } throw last; }
const centre = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = ([x, y]) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
const corner = d => page.locator(`[data-focus="mr-${d}"]`);
const memory = () => page.locator('.mr-memory b').innerText();
const NAMES = {E: 'east', N: 'north', W: 'west', S: 'south'};
// Moves by tapping the corner next to the robot, one at a time.
async function tapWalk(id, letters) {
  for (const d of letters) {
    const before = await walk(id) || '';
    const target = corner(d);
    assert.equal(await target.getAttribute('aria-label'), `Move ${NAMES[d]}`);
    await tapAt(await centre(target));
    await eventually(async () => assert.equal(await walk(id), before + d));
  }
}
const solved = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const button = name => page.getByRole('button', {name, exact: true});

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Robot QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const family = page.locator('.satchel-family[data-view-key="family-robot"]');
  assert.equal(await family.getAttribute('open'), '', 'the newest family starts open');
  assert.equal(await family.locator('.family-ink-symbol').innerText(), '⟲');
  assert.equal(await family.locator('[data-id="robot-playground"]').count(), 1);
  assert.equal(await family.locator('[data-id^="robot-"]').count(), 13);

  // Order matters: north first is a dead end at once; Undo; east then north solves.
  const P1 = 'robot-01';
  await open(P1); await fit('order matters'); await shot('01-start');
  assert.equal(await page.locator('.mr-slot').count(), 2);
  assert.equal(await page.locator('.mr-step').count(), 4, 'four corners next to the robot');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no task line on the board');
  await tapWalk(P1, 'N');
  assert.equal(await memory(), '0');
  await page.locator('.feedback.deadend', {hasText: 'Too few moves are left. Undo.'}).waitFor();
  assert.equal(await page.locator('.mr-played').count(), 1, 'a box fills');
  await tapWalk(P1, 'E');
  assert.equal(await page.locator('.mr-step').count(), 0, 'no corners once the moves are spent');
  // A tap on the robot or a far square does nothing.
  await tapAt(await centre(page.locator('.mr-robot')));
  await page.waitForTimeout(300);
  assert.equal(await walk(P1), 'NE', 'a full budget refuses more moves');
  await shot('01-spent');
  await button('↶ Undo').click(); await button('↶ Undo').click();
  await eventually(async () => assert.equal(await walk(P1), ''));
  await tapAt(await centre(page.locator('.mr-flag')));
  await page.waitForTimeout(300);
  assert.equal(await walk(P1), '', 'a corner two blocks away is not a move');
  await tapWalk(P1, 'EN');
  await solved();
  assert.equal(await memory(), '1');
  await fit('solved'); await shot('01-solved');

  // The keyboard: Enter on a corner, then the arrow keys; focus stays on the board.
  const P3 = 'robot-03';
  await open(P3);
  await corner('E').focus(); await page.keyboard.press('Enter');
  await eventually(async () => assert.equal(await walk(P3), 'E'));
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'mr-E', 'focus returns to the same corner');
  for (const k of ['ArrowUp', 'ArrowLeft']) await page.keyboard.press(k);
  await eventually(async () => assert.equal(await walk(P3), 'ENW'));
  assert.ok((await page.evaluate(() => document.activeElement?.dataset.focus || '')).startsWith('mr-'), 'focus stays on a corner');
  assert.match(await page.locator('.mr-puzzle [role=status]').innerText(), /^Memory 1\. At 0 across, 1 up\. 1 move left\.$/);
  await page.keyboard.press('ArrowDown');
  await solved();
  assert.equal(await walk(P3), 'ENWS');

  // Far from the wall: four squares shade going up, two stay when the loop closes.
  const P8 = 'robot-08';
  await open(P8);
  await tapWalk(P8, 'EN');
  assert.equal(await page.locator('.sg-cell.mr-pos').count(), 4);
  assert.equal(await memory(), '4');
  assert.equal(await page.locator('[data-focus="mr-E"]').count(), 0, 'no corner off the board');
  await shot('08-long-strip');
  await tapWalk(P8, 'WWSE');
  await solved();
  assert.equal(await page.locator('.sg-cell.mr-pos').count(), 2, 'the strips cancel outside the loop');
  await fit('far from the wall'); await shot('08-solved');

  // A hint marks its corner; hints alone finish a hard puzzle.
  const P10 = 'robot-10';
  await open(P10);
  await tapWalk(P10, 'EEEN');
  await button('Hint').click(); await button('Hint').click();
  await page.locator('.hint-card', {hasText: 'Move west.'}).waitFor();
  assert.equal(await page.locator('.mr-step.hinted').getAttribute('aria-label'), 'Move west');
  await fit('hinted'); await shot('10-hinted');
  await button('Restart').click();
  for (let i = 0; i < 3; i++) await button('Hint').click();
  for (let s = 0; s < 20 && !await page.locator('#completion-heading').count(); s++) await button('Apply hint').click();
  await solved();
  assert.equal((await walk(P10)).length, 6);

  // Negative memory over the wall.
  const P11 = 'robot-11';
  await open(P11);
  await tapWalk(P11, 'WNN');
  assert.equal(await memory(), '−2');
  assert.equal(await page.locator('.sg-cell.mr-neg').count(), 2);
  await fit('over the wall'); await shot('11-blue');

  // The playground: a loop twice shows its numeral; Clear; no hints.
  const PG = 'robot-playground';
  await open(PG);
  assert.equal(await button('Hint').count(), 0, 'no hints in the playground');
  assert.equal(await page.locator('.mr-goal').count(), 0);
  await tapWalk(PG, 'ENWSENWS');
  assert.equal(await page.locator('.mr-num').textContent(), '2');
  assert.equal(await memory(), '2');
  await tapWalk(PG, 'WNNEEESS');
  await fit('playground'); await shot('playground');
  await button('Clear').click();
  await eventually(async () => assert.equal(await walk(PG), ''));
  assert.equal(await page.locator('.mr-trail').count(), 0);

  // How to play has the rules and one worked step.
  await open(P1);
  await button('How to play').click();
  const help = page.locator('dialog');
  await help.locator('.mr-help').waitFor();
  assert.match(await help.innerText(), /arrow keys/);
  await shot('help');
  await help.getByRole('button', {name: 'Done', exact: true}).click();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
