// Plays Pairs that stay through the real interface: a one-sided claim told
// who says no, a right claim by taps and by a drag, Stays with its dotted
// certificate, a wrong Stays held until a blocking pair is tapped (Undo keeps
// it held), pairing by taps, keeping, There's another, Undo keeping the shelf,
// That's all, one-strip repairs by tapping and dragging strip places with the
// changed strip marked, Can't and its reason (two blocking pairs with no letter
// in common, tapped by the child), designing strips, the first hint, and the
// playground's sizes. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/matching/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/matching/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.sm-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const letter = x => page.locator(`.sm-token[data-sm="${x}"]`);
const place = (o, r) => page.locator(`.sm-cell[data-sm="${o}:${r}"]`);
const told = async () => (await page.locator('.sm-told').allInnerTexts()).join(' ');
const press = name => page.getByRole('button', {name, exact: true}).click();
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const taps = async (...xs) => { for (const x of xs) await tap(x.includes(':') ? place(...x.split(':')) : letter(x)); };
// A drag from one control onto another: a touch drag on a phone, a mouse drag on a desktop.
let cdp = null;
async function drag(from, to) {
  await from.scrollIntoViewIfNeeded();
  const a = await center(from), b = await center(to);
  if (!phone) { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b, {steps: 8}); await page.mouse.up(); return; }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let s = 1; s <= 8; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 8, a[1] + (b[1] - a[1]) * s / 8]);
  // Rest before lifting, as a finger placing a letter does. Lifted mid-flick,
  // the emulated finger sometimes loses the next tap's click, even after a drag
  // that changes nothing (likely Chrome stopping a fling with that tap).
  await page.waitForTimeout(150);
  await touch('touchEnd', b);
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Pairs QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: B wants X, but X says no; A and Y block.
  const P1 = 'matching-01';
  await open(P1); await fit('check');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Press Stays, or tap a circle and a square that would both rather be together.');
  assert.equal(await page.locator('.sm-cell[data-sm]').count(), 0, 'strips are fixed');
  await taps('B');
  assert.equal(await letter('B').getAttribute('aria-pressed'), 'true', 'a tap chooses a letter');
  await taps('X');
  assert.equal(await told(), 'X says no.');
  assert.equal((await board(P1)).said, 'BX');
  assert.equal(await page.locator('.sm-links .claim.no').count(), 1, 'the claim is dashed');
  assert.equal(await page.locator('.sm-cell.keep').count(), 1, 'X’s partner is ringed');
  await shot('says-no');
  await taps('A', 'X');
  assert.equal((await board(P1)).said, 'BX', 'a partner tapped is a new choice, not a claim');
  await press('Stays');
  assert.equal(await told(), 'Can’t stay.');
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board(P1)).said, 'BX', 'Undo takes back the Stays');
  await page.locator('[data-action="restart"]').click();
  await drag(letter('Y'), letter('A'));
  await done(); await fit('check solved');

  // Puzzle 2: every wish meets a no; the certificate draws them.
  await open('matching-02');
  await press('Stays');
  await done();
  assert.equal(await page.locator('.sm-links .wish').count(), 2, 'B wants X and Y wants A');
  await shot('stays');

  // Puzzle 3: one strip at a time.
  const P3 = 'matching-03';
  await open(P3); await fit('repair');
  await press('Can’t');
  assert.equal(await told(), 'One strip can do it.');
  await taps('B:0', 'B:1');
  assert.deepEqual((await board(P3)).strip, {owner: 'B', order: 'XY'}, 'two taps on a strip swap them');
  assert.equal(await page.locator('.sm-cell.changed').count(), 2, 'the changed strip is marked');
  assert.equal(await place('B', 0).getAttribute('class').then(c => c.includes('changed')), true);
  await drag(place('A', 0), place('A', 1));
  assert.deepEqual((await board(P3)).strip, {owner: 'A', order: 'XY'}, 'a drag swaps, and B’s strip goes back');
  assert.equal(await place('B', 0).innerText(), 'Y');
  assert.equal(await place('B', 0).getAttribute('class').then(c => c.includes('changed')), false, 'B’s mark goes back too');
  assert.equal(await place('A', 0).getAttribute('class').then(c => c.includes('changed')), true);
  await shot('changed');
  await press('Stays');
  await done();

  // Puzzle 4: Can't, with two blocking pairs and no letter in common.
  await open('matching-04');
  await taps('A:0', 'A:1');
  await press('Stays');
  assert.equal(await told(), 'Can’t stay.');
  await press('Can’t');
  assert.equal(await told(), 'Tap two pairs that would both switch and share no letter.');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'Can’t alone is no solve');
  assert.equal(await page.locator('.sm-links .claim').count(), 0, 'no blocking pair is drawn for the child');
  assert.equal(await page.getByRole('button', {name: 'Can’t', exact: true}).count(), 0);
  assert.equal(await place('A', 0).count(), 0, 'the strips are fixed');
  assert.equal(await page.locator('.sm-cell[aria-label="A’s choice 1: Y"]').count(), 1, 'the printed strips come back');
  await taps('A', 'Y');
  assert.equal(await page.locator('.sm-links .claim.yes').count(), 1);
  await shot('cant-reason');
  await drag(letter('X'), letter('B'));
  await done(); await fit('cant');
  assert.equal(await page.locator('.sm-why').innerText(), 'One strip can change only one of these.');
  assert.equal(await page.locator('.sm-links .claim.yes').count(), 2);
  await shot('cant');

  // Puzzle 10: a wrong Stays holds the pairing; keeping; There's another; Undo; That's all.
  const E = 'matching-10';
  await open(E); await fit('every');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Find every pairing that can stay.');
  assert.equal(await page.getByRole('button', {name: 'That’s all', exact: true}).isDisabled(), true);
  await taps('A', 'Z');
  assert.equal((await board(E)).pairing, 'ZYWX', 'taps pair; A’s old partner Y goes to B');
  await press('Stays');
  assert.equal((await board(E)).pending, true);
  assert.equal(await page.locator('.sm-board.held').count(), 1);
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board(E)).pending, true, 'Undo does not lift the hold');
  assert.equal((await board(E)).pairing, 'ZYWX', 'nor take back the move that made the pairing');
  assert.equal(await page.locator('[data-action="undo"]').isDisabled(), true, 'with nothing it can take back, Undo greys out');
  assert.equal(await told(), 'Can’t stay. Tap a circle and a square that would both rather be together.');
  await taps('C', 'X');
  assert.equal(await told(), 'C and X say no. Tap a circle and a square that would both rather be together.');
  assert.equal((await board(E)).pending, true, 'still held');
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board(E)).said, null, 'Undo takes back the wrong claim');
  await taps('A', 'W');
  assert.equal((await board(E)).pending, false, 'a blocking pair releases it');
  assert.equal(await page.locator('.sm-links .claim.yes').count(), 1);
  await shot('released');
  await taps('A', 'W');
  assert.equal((await board(E)).pairing, 'WYZX');
  await drag(letter('B'), letter('X'));
  assert.equal((await board(E)).pairing, 'WXZY', 'a drag pairs too');
  await taps('C', 'Y');
  assert.equal((await board(E)).pairing, 'WXYZ');
  await press('Stays');
  assert.deepEqual((await board(E)).kept, ['WXYZ']);
  assert.equal(await page.locator('.case-kept').count(), 1, 'kept on the shelf');
  assert.equal(await page.getByRole('button', {name: 'Stays', exact: true}).isDisabled(), true, 'found already');
  await press('That’s all');
  assert.equal(await told(), 'There’s another.');
  await taps('C', 'Z');
  await press('Stays');
  await taps('A', 'X');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(E)).kept, ['WXYZ', 'WXZY'], 'Undo keeps the shelf');
  await taps('A', 'X');
  await press('Stays');
  await taps('C', 'Y');
  await press('Stays');
  await shot('every-four');
  assert.doesNotMatch(await page.locator('.board-panel').innerText(), /\b4\b.*(found|kept)|kept: \d/i, 'no count shown');
  await press('That’s all');
  await done(); await fit('every solved');

  // Puzzle 6: design strips so both pairings stay.
  const D = 'matching-06';
  await open(D); await fit('design');
  await press('Stays'); await press('That’s all');
  assert.equal(await told(), 'Only one can stay.');
  await drag(place('B', 0), place('B', 1));
  assert.deepEqual((await board(D)).kept, [], 'a new strip clears the shelf');
  await taps('X:0', 'X:1');
  await press('Stays'); await taps('A', 'Y'); await press('Stays');
  await press('That’s all');
  await done();
  await shot('design');

  // Puzzle 9: the first hint is the puzzle's own.
  await open('matching-09');
  await press('Hint');
  await page.getByText('Every circle wants X first. Whom does X want?').waitFor();

  // The playground: sizes, no Hint.
  const G = 'matching-playground';
  await open(G); await fit('playground');
  assert.equal(await page.getByRole('button', {name: 'Hint', exact: true}).count(), 0, 'no Hint');
  await page.getByRole('button', {name: 'Four pairs', exact: true}).click();
  assert.equal((await board(G)).size, 4);
  assert.equal(await letter('D').count(), 1);
  await fit('playground four');
  await taps('A:0', 'A:3');
  assert.equal((await board(G)).lists.A, 'ZXYW');
  await page.getByRole('button', {name: 'Two pairs', exact: true}).click();
  await press('Stays');
  assert.equal((await board(G)).pending, false);
  assert.deepEqual((await board(G)).kept, ['XY']);
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
