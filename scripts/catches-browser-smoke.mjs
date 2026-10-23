// Plays Catch and mark through the real interface: taps into the first
// and second catch, a full second catch greying the other tiles, taking a
// tile out of a tray, a refused Can't with its swap and an accepted one with
// its certificate, Undo keeping the refusal, the shelf and That's all, the
// bag chips, the sort bins and catalog, focus after taps, a solve by
// keyboard, Apply hint, the playground's steppers and piles, and no page
// overflow.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// SHOTS=<dir> also saves tablet (1024 px) and phone (375 px) screenshots.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
let page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.ct-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const tile = i => page.locator(`.ct-bag [data-focus="ct-tile-${i}"]`);
const tap = async locator => { const b = await locator.boundingBox(); if (phone) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
const taps = async (...tiles) => { for (const i of tiles) await tap(tile(i)); };
const told = () => page.locator('.ct-told').innerText();
const button = name => page.getByRole('button', {name, exact: true});
const A = 0, B = 1, C = 2, D = 3, E = 4, F = 5, G = 6;

const profile = async name => { await page.goto(base); await page.locator('#nickname').fill(name); await page.locator('#profile-form button[type=submit]').click(); };

try {
  await profile('Catches QA');
  await page.locator('.caravan-nav [data-action=library]').click();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-catches"] .family-ink-symbol').innerText(), '⊙');

  // Puzzle 1: the first catch, then the second; a full catch; a tray tap; the goal.
  await open('catches-01'); await fit('catches-01');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no objective line: the goal shows the task');
  assert.equal(await page.locator('.ct-tray.active').getAttribute('aria-label'), 'First catch');
  await taps(A, B);
  assert.equal(await page.locator('.ct-tile.marked .ct-dot').count(), 2, 'the first catch is dotted');
  assert.equal(await page.locator('.ct-tray.active').getAttribute('aria-label'), 'Second catch', 'taps move on to the second catch');
  await taps(C, D, E);
  assert.equal(await page.locator('button.ct-tile[disabled]').count(), 3, 'a full second catch greys the tiles outside it');
  assert.equal(await page.locator('.ct-tile.caught').count(), 3);
  await tap(page.locator('.ct-tray[aria-label="Second catch"] [data-focus="ct-out-2-4"]'));
  assert.deepEqual((await board('catches-01')).second, [C, D], 'a tray tap takes the tile out');
  await tap(tile(A));
  await done();
  assert.equal(await page.locator('.ct-goal.met').count(), 1);

  // Puzzle 3: Can't refused with its swap, kept through Undo, then accepted on the closest catch.
  await open('catches-03'); await fit('catches-03');
  assert.ok(await button('Can’t').isDisabled(), 'off until both catches are full');
  await taps(A, B, C, A, B, D);
  await button('Can’t').click();
  assert.equal(await told(), 'A plain tile could swap in.');
  assert.ok(await button('Can’t').isDisabled(), 'once per arrangement');
  await taps(B, E);
  assert.equal(await page.locator('.ct-told').count(), 0, 'the refusal goes with the catches');
  await page.locator('[data-action=undo]').click();
  await page.locator('[data-action=undo]').click();
  assert.deepEqual((await board('catches-03')).second, [A, B, D]);
  assert.equal(await told(), 'A plain tile could swap in.', 'Undo brings the refusal back with its catches');
  await page.locator('[data-action=undo]').click();
  assert.equal(await page.locator('.ct-told').count(), 0, 'one more press takes back the tap before it');
  // By keyboard: B out, D and E in.
  for (const i of [D, B, E]) { await tile(i).focus(); await page.keyboard.press('Enter'); }
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('ct-tile') || document.activeElement?.classList.contains('ct-cant')), 'focus stays on the board');
  assert.deepEqual([...(await board('catches-03')).second].sort(), [A, D, E]);
  await button('Can’t').click(); await done();
  assert.equal(await told(), 'Every plain tile is in the second catch.');
  assert.equal(await page.locator('.ct-slot.proof').count(), 2, 'the two plain tiles are ringed');

  // Puzzle 4: the shelf, That's all refused and kept through Undo, then solved.
  await open('catches-04'); await fit('catches-04');
  assert.ok(await button('That’s all').isDisabled(), 'off with an empty shelf');
  await taps(A, B, C, D, E, A, B, C, D);
  assert.equal(await page.locator('.ct-shelf .case-kept').count(), 1);
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  assert.ok(await button('That’s all').isDisabled());
  await page.locator('[data-action=undo]').click();
  assert.ok(await button('That’s all').isDisabled(), 'Undo keeps the refusal');
  assert.equal(await page.locator('.ct-shelf .case-kept').count(), 1, 'Undo keeps the shelf');
  assert.deepEqual((await board('catches-04')).second, [A, B, C], 'the same press takes back the tap before That’s all');
  await taps(F);
  assert.equal(await page.locator('.ct-shelf .case-kept').count(), 2);
  await button('That’s all').click(); await done();
  assert.equal(await page.locator('.ct-catalog .case-kept.no').count(), 3, 'none, one and two dots are faded');

  // Puzzle 6: bag chips, ticks, a bag too small.
  await open('catches-06'); await fit('catches-06');
  assert.equal(await page.locator('.ct-bag-chip[aria-pressed="true"]').innerText(), '8');
  await taps(A, B, C, D, E, A, B, C, F, G);
  assert.equal(await page.locator('.ct-bag-chip.found').count(), 1);
  await button('Bag of 20').click();
  assert.equal(await page.locator('.ct-bag .ct-tile').count(), 20);
  assert.deepEqual((await board('catches-06')).second, [], 'a new bag starts the second catch again');
  assert.equal(await page.locator('.ct-bag-chip.found').count(), 1, 'no tick without a catch of its own');
  await taps(A, B, C, F, G);
  assert.equal(await page.locator('.ct-bag-chip.found').count(), 2);
  await button('Bag of 6').click();
  assert.equal(await page.locator('.ct-bag .ct-tile').count(), 6);
  assert.deepEqual((await board('catches-06')).first, [A, B, C, D, E], 'the first catch stays');
  for (let k = 0; k < 40 && !(await page.locator('#completion-heading').count()); k++) { for (let j = 0; j < 3; j++) await button('Hint').click(); await button('Apply hint').click(); }
  await done();
  assert.equal(await page.locator('.ct-bag-chip.no').count(), 1, 'the bag of 6 is faded');

  // Puzzle 7: catches land in bins by their dots; hints finish the list; the catalog.
  await open('catches-07'); await fit('catches-07');
  assert.equal(await page.locator('.case-bin').count(), 3, 'every bin from the start');
  await taps(C, D);
  assert.equal(await page.locator('.case-bin[data-bin="0"] .case-kept').count(), 1);
  await taps(D, A);
  assert.equal(await page.locator('.case-bin[data-bin="1"] .case-kept.current').count(), 1, 'the catch on the board is outlined');
  for (let k = 0; k < 40 && !(await page.locator('#completion-heading').count()); k++) { for (let j = 0; j < 3; j++) await button('Hint').click(); await button('Apply hint').click(); }
  await done();
  assert.deepEqual(await page.locator('.case-catalog .case-bin').evaluateAll(bins => bins.map(b => b.querySelectorAll('.case-kept').length)), [3, 6, 1]);

  // The playground: steppers, random catches, piles.
  await open('catches-playground'); await fit('catches-playground');
  assert.equal(await button('Hint').count(), 0);
  assert.equal(await page.locator('.ct-pile').count(), 3);
  await button('Catch 10').click();
  await button('Catch').click();
  assert.equal((await board('catches-playground')).rounds.length, 11);
  assert.equal(await page.locator('.ct-pebbles i').count(), 11);
  assert.equal(await page.locator('.ct-tile.marked').count(), 2, 'the last first catch shows on the bag');
  await page.getByRole('button', {name: '2nd catch: more'}).click();
  assert.equal((await board('catches-playground')).rounds.length, 0, 'a new size clears the piles');
  assert.equal(await page.locator('.ct-pile').count(), 3);
  for (let k = 0; k < 6; k++) await button('Catch 10').click();
  assert.ok(await button('Catch').isDisabled(), 'sixty catches at most');
  await button('Clear').click();
  assert.equal(await page.locator('.ct-pebbles i').count(), 0);

  if (process.env.SHOTS) {
    const dir = process.env.SHOTS.replace(/\/?$/, '/');
    await mkdir(dir, {recursive: true});
    for (const [w, h, tag] of [[1024, 768, 'tablet'], [375, 812, 'phone']]) {
      // A fresh profile for each size, so every puzzle starts empty.
      const shots = await browser.newContext({viewport: {width: w, height: h}, hasTouch: phone});
      page = await shots.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await profile(`Catches ${tag}`);
      for (const id of ['catches-01', 'catches-03', 'catches-05', 'catches-06', 'catches-09', 'catches-10', 'catches-11', 'catches-playground']) {
        await open(id);
        if (id === 'catches-01') await taps(A, B, A, C);
        if (id === 'catches-03') await taps(A, B, C, A, B, D);
        if (id === 'catches-03') await button('Can’t').click();
        if (id === 'catches-05') await taps(A, B, C, D, E, A, F, G, 7);
        if (id === 'catches-06' || id === 'catches-10') await taps(0, 1, 2, 3, 4, 5, 0, 1);
        if (id === 'catches-09') { await taps(0, 1, 2, 3, 4, 5, 0, 1, 6, 7, 8, 9); await button('Can’t').click(); }
        if (id === 'catches-11') for (let k = 0; k < 9; k++) { for (let j = 0; j < 3; j++) await button('Hint').click(); await button('Apply hint').click(); }
        if (id === 'catches-playground') { await button('Catch 10').click(); await button('Catch 10').click(); }
        await fit(`${id}, ${tag}`);
        await page.screenshot({path: `${dir}${id}-${tag}.png`, fullPage: true});
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
