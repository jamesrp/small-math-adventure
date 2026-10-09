// Plays Shuffle machines (a group in Cup swaps) through the real interface:
// the group and its playground in the satchel; a given machine turned until
// every cup is home, the cups gliding, each loop taking its colour as it
// closes and each turn bringing the lower row up; a machine made by two taps, a drag (a touch drag with TEST_PHONE=1)
// and the keyboard, a swap starting the run again, a refused Can't; a Can't
// that is right, with its catalog; an undo puzzle, A turned, a wrong machine
// turned, an edit that keeps A's turn, the answer's lower row all home; every machine on three cups with an
// early That's all and a kept machine tapped back; the slowest machine on
// seven cups, That's the most too early, then solved by hints; and the
// playground with seven cups. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone viewport). Screenshots go in
// test-results/machines/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/machines/', import.meta.url);
const shot = async name => { await page.waitForTimeout(900); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="machines"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const cup = h => page.locator(`.mach-lower [data-cup="${h}"]`);
const rowText = row => page.locator(`.mach-${row} .cup-identity b`).allTextContents().then(x => x.join(''));
const center = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const button = name => page.getByRole('button', {name, exact: true});
const focused = () => page.evaluate(() => document.activeElement?.dataset.focus);
const solved = () => page.locator('#completion-heading').waitFor({timeout: 5000});
let cdp = null;
async function drag(from, to) {
  const [a, b] = [await center(from), await center(to)];
  if (!phone) { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b, {steps: 8}); await page.mouse.up(); return; }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let s = 1; s <= 8; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 8, a[1] + (b[1] - a[1]) * s / 8]);
  await touch('touchEnd', b);
  // Chromium drops a synthetic tap that follows a touch drag too closely.
  await page.waitForTimeout(600);
}
const swap = async (i, j) => { await tap(cup(i)); await tap(cup(j)); };
const turn = async (k = 1) => { for (let i = 0; i < k; i++) await tap(button('Turn')); };
async function hintSolve() {
  const hint = page.getByRole('button', {name: 'Hint', exact: true});
  for (let i = 0; i < 3; i++) await hint.click();
  const apply = page.getByRole('button', {name: 'Apply hint', exact: true});
  for (let s = 0; !await page.locator('#completion-heading').count() && s < 150; s++) await apply.click();
  await solved();
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Machine QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const family = page.locator('.satchel-family[data-view-key="family-swap"]');
  await family.locator('summary').click();
  assert.equal(await family.locator('h2', {hasText: 'Shuffle machines'}).count(), 1, 'a group in Cup swaps');
  assert.equal(await family.locator('[data-id="machines-playground"]').count(), 1, 'its playground is Cup swaps’ Playground');
  assert.equal(await family.locator('[data-id^="machines-"]').count(), 13);

  // A given machine: the cups glide, loops colour as they close, the run stops at home.
  const P1 = 'machines-01';
  await open(P1); await fit('turn a machine'); await shot('01-start');
  assert.equal(await page.locator('.mach-arrow').count(), 5);
  assert.equal(await page.locator('.mach-arrow.loop').count(), 0, 'no colour before a run');
  assert.equal(await cup(0).getAttribute('aria-disabled'), 'true', 'the machine is given');
  assert.equal(await rowText('lower'), 'CEABD');
  await turn();
  assert.equal(await rowText('top'), 'CEABD', 'a turn brings the lower row up');
  assert.equal(await rowText('lower'), 'ADCEB', 'and the lower row shows the next turn');
  if (!await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)) assert.ok(await page.evaluate(() => document.getAnimations().length > 0), 'the cups glide');
  await turn();
  assert.equal(await page.locator('.mach-arrow.loop-0').count(), 2, 'A and C are home: their loop takes its colour');
  assert.equal(await page.locator('.mach-arrow.loop-1').count(), 0);
  await turn(); await shot('01-three');
  assert.equal(await page.locator('.mach-arrow.loop-1').count(), 3);
  await button('Cups home').click();
  assert.equal((await board(P1)).turns, 0);
  await button('Turn').focus();
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); assert.equal(await focused(), 'mach-turn', 'focus stays on Turn'); }
  await page.keyboard.press('Enter');
  await solved();
  assert.equal(await page.locator('.mach-count', {hasText: 'Every cup home after 6 turns'}).count(), 1);
  await fit('turned'); await shot('01-solved');

  // Making a machine: taps, a drag and the keyboard swap the lower row; a swap restarts the run.
  const P2 = 'machines-02';
  await open(P2);
  await swap(0, 1);
  assert.equal((await board(P2)).machine, 'BACD', 'two taps swap');
  await turn();
  await drag(cup(1), cup(2));
  assert.deepEqual([(await board(P2)).machine, (await board(P2)).turns], ['BCAD', 0], 'a drag swaps, and the run starts again');
  await tap(button('Can’t'));
  await page.getByText('Keep looking.').waitFor();
  assert.equal(await button('Can’t').isDisabled(), true);
  assert.equal(await focused(), 'mach-turn', 'focus moves on to the next action');
  await cup(2).focus(); await page.keyboard.press('Enter'); await cup(3).focus(); await page.keyboard.press('Enter');
  assert.equal((await board(P2)).machine, 'BCDA', 'the keyboard swaps');
  assert.equal(await page.getByText('Keep looking.').count(), 0, 'a swap clears the refusal');
  await turn(4);
  assert.equal(await page.locator('.mach-count', {hasText: 'Every cup home after 4 turns'}).count(), 1, 'a loop of four is not the answer');
  assert.equal(await button('Turn').isDisabled(), true, 'the run stops at home');
  await swap(2, 3); await turn(3);
  await solved(); await fit('three turns'); await shot('02-solved');

  // Can't is right: no machine moves just one cup. Nothing under "1 cup moves".
  await open('machines-04');
  await tap(button('Can’t'));
  await solved();
  assert.equal(await page.locator('.case-catalog .case-bin', {has: page.locator('h3', {hasText: /^1 cup moves$/})}).locator('li').count(), 0);
  await fit('just one cup'); await shot('04-solved');

  // Undo: turn A, try a machine, edit it (A's turn stays), then the right one.
  const P6 = 'machines-06';
  await open(P6);
  await tap(button('Turn A'));
  assert.equal(await page.locator('.mach-fixed.turned').count(), 1);
  await tap(button('Turn your machine'));
  await page.locator('.case-note', {hasText: 'Not every cup is home.'}).waitFor();
  await swap(0, 3);
  assert.equal((await board(P6)).stage, 1, 'an edit takes back your turn, not A’s');
  await shot('06-after-a');
  for (const [i, j] of [[1, 2], [2, 3]]) await swap(i, j);
  assert.equal((await board(P6)).machine, 'DCAB');
  assert.equal(await rowText('lower'), 'ABCD', 'the answer sends every cup home');
  await tap(button('Turn your machine'));
  await solved(); await fit('undo'); await shot('06-solved');

  // Every machine on three cups: Keep, an early That's all, a kept machine tapped back, then hints.
  const P7 = 'machines-07';
  await open(P7);
  await tap(button('Keep')); await swap(0, 1); await tap(button('Keep'));
  assert.deepEqual((await board(P7)).kept, ['ABC', 'BAC']);
  assert.equal(await button('Keep').isDisabled(), true, 'kept once');
  await tap(button('That’s all'));
  await page.getByText('There’s another.').waitFor();
  await tap(page.locator('button[data-case="ABC"]'));
  assert.equal((await board(P7)).machine, 'ABC', 'a kept machine goes back on the board');
  await hintSolve();
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 6);
  await fit('every machine'); await shot('07-solved');

  // The slowest machine on seven cups: That's the most too early, then hints.
  const P11 = 'machines-11';
  await open(P11); await fit('seven cups');
  await swap(0, 1); await turn(2); await tap(button('Keep'));
  await tap(button('That’s the most'));
  await page.getByText('A slower machine exists.').waitFor();
  await hintSolve();
  assert.ok((await board(P11)).kept.length >= 2);
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 1, 'one split takes 12');
  await fit('slowest'); await shot('11-solved');

  // The playground: seven cups, Mix, Straight arrows, a run.
  const PG = 'machines-playground';
  await open(PG);
  await tap(page.getByRole('button', {name: '7 cups'}));
  assert.equal(await page.locator('.mach-lower [data-cup]').count(), 7);
  await tap(button('Mix'));
  assert.notEqual((await board(PG)).machine, 'ABCDEFG');
  await turn();
  assert.equal((await board(PG)).turns, 1);
  await fit('playground'); await shot('playground');
  await tap(button('Straight arrows'));
  assert.deepEqual(await board(PG), {cups: 7, machine: 'ABCDEFG', turns: 0});
  assert.equal(await page.getByRole('button', {name: 'Hint', exact: true}).count(), 0, 'no hints in the playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
