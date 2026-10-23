// Plays Sliding numbers through the real interface: placing numbers and the
// refusal of a square with an empty square above or left of it, opening a
// gray corner, the larger number refused with both marked, a tile gliding
// into the ring, a missed goal and New run, a solve by keyboard, the shelf
// with That's all refused and kept through Undo, the order puzzle's two
// orders with one finish, Apply hint, focus after moves, the playground's
// boards, and no page overflow.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// SHOTS=<dir> also saves tablet (1024 px) and phone (375 px) screenshots.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.tq-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const cell = (r, c) => page.locator(`.tq-board [data-cell="${r}-${c}"]`);
const tap = async locator => { const b = await locator.boundingBox(); if (phone) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
const taps = async (...cells) => { for (const [r, c] of cells) await tap(cell(r, c)); };
const told = () => page.locator('.tq-told').innerText();
const button = name => page.getByRole('button', {name, exact: true});
const text = (r, c) => cell(r, c).innerText();

try {
  await page.goto(base); await page.locator('#nickname').fill('Slides QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').click();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-taquin"] .family-ink-symbol').innerText(), '◰');

  // Puzzle 1: placing, its refusal, opening, the smaller-number rule, a miss.
  await open('taquin-01'); await fit('taquin-01');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no objective line: the goal shows the task');
  assert.equal(await page.locator('.tq-tray').innerText(), '1');
  await tap(cell(1, 1));
  assert.equal(await told(), 'Numbers grow right and down.');
  assert.equal(await page.locator('.tq-cell.marked').count(), 2, 'the empty squares above and left are marked');
  assert.deepEqual((await board('taquin-01')).place, [], 'nothing placed');
  await taps([1, 0], [0, 1], [0, 2], [1, 1]);
  assert.equal(await page.locator('.tq-told').count(), 0, 'the refusal went with the board');
  assert.equal(await page.locator('.tq-tray').count(), 0, 'the tray empties');
  assert.equal(await page.locator('button.tq-cell.gray.corner').count(), 1);
  await tap(cell(0, 0));
  assert.equal(await page.locator('.tq-cell.ring').count(), 1);
  await tap(cell(0, 1));
  assert.equal(await told(), 'The smaller number slides.', 'the larger number is refused');
  assert.equal(await page.locator('.tq-cell.tile.marked').count(), 2);
  await tap(cell(1, 0));
  const glided = await page.evaluate(() => document.querySelector('.tq-board [data-cell="0-0"]').getAnimations().length);
  assert.equal(await text(0, 0), '1', '1 slid up');
  await tap(cell(1, 1));
  assert.equal(await page.locator('.tq-goals.miss').count(), 1, 'a finish of three over one misses the goal');
  assert.equal(await page.locator('.tq-cell.gone').count(), 1, 'the square that left stays drawn dashed');
  await button('New run').click();
  assert.deepEqual(await board('taquin-01'), {place: [], steps: [], reached: []});
  // A solve by keyboard: 1 2 over 3 4.
  for (const [r, c] of [[0, 1], [0, 2], [1, 0], [1, 1], [0, 0], [0, 1]]) { await cell(r, c).focus(); await page.keyboard.press('Enter'); }
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('tq-cell')), 'focus stays on a square button after a slide');
  await page.keyboard.press('Enter');
  if (!(await page.locator('#completion-heading').count())) { await cell(0, 2).focus(); await page.keyboard.press('Enter'); }
  await done();
  assert.equal(await page.locator('.tq-goal.met').count(), 1);

  // Puzzle 2: the shelf, That's all refused and kept through Undo.
  await open('taquin-02'); await fit('taquin-02');
  assert.ok(await button('That’s all').isDisabled(), 'off with an empty shelf');
  assert.ok(await button('New run').isDisabled(), 'off before anything happens');
  await taps([0, 1], [0, 2], [1, 0], [1, 1], [0, 0], [0, 1], [0, 2]);
  assert.equal(await page.locator('.tq-item').count(), 1);
  assert.equal(await page.locator('.tq-item.now').count(), 1, 'the start just found is ringed');
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  assert.ok(await button('That’s all').isDisabled());
  await button('New run').click();
  await page.locator('[data-action=undo]').click();
  assert.ok(await button('That’s all').isDisabled(), 'Undo keeps the refusal');
  assert.equal(await page.locator('.tq-item').count(), 1, 'Undo keeps the shelf');
  await button('New run').click();
  await taps([1, 0], [0, 1], [0, 2], [1, 1], [0, 0], [1, 0], [1, 1]);
  assert.equal(await page.locator('.tq-group').count(), 2, 'two finished shapes, two columns');
  assert.ok(!(await button('That’s all').isDisabled()), 'a new start lifts the refusal');
  // Apply hint.
  for (let k = 0; k < 3; k++) await button('Hint').click();
  await button('Apply hint').click();
  assert.equal((await board('taquin-02')).place.length + (await board('taquin-02')).steps.length, 0, 'the hint pressed New run');

  // Puzzle 3: two orders, one finish.
  await open('taquin-03'); await fit('taquin-03');
  assert.equal(await page.locator('.tq-tray').count(), 0, 'the start is given');
  await tap(cell(0, 0));
  assert.equal(await told(), 'Only a gray corner opens.');
  await taps([0, 1], [0, 2], [1, 0], [2, 0], [0, 0], [0, 1], [1, 1]);
  await button('New run').click();
  await taps([1, 0], [2, 0], [0, 1], [0, 2], [0, 0], [0, 1], [1, 1]);
  assert.equal(await page.getByRole('img', {name: 'Finished: rows 1 3, then 2'}).count(), 2, 'both orders finish 1 3 over 2');
  await button('That’s all').click(); await done();

  // The playground.
  await open('taquin-playground'); await fit('taquin-playground');
  assert.equal(await button('Hint').count(), 0);
  await page.getByRole('button', {name: 'Board 7'}).click();
  assert.equal((await board('taquin-playground')).shape, 6);
  assert.equal(await page.locator('.tq-board .tq-cell.gray').count(), 3);
  await taps([0, 2], [1, 1]);
  assert.equal(await text(1, 1), '2');

  if (process.env.SHOTS) {
    const dir = process.env.SHOTS.replace(/\/?$/, '/');
    await mkdir(dir, {recursive: true});
    for (const [w, h, tag] of [[1024, 768, 'tablet'], [375, 812, 'phone']]) {
      await page.setViewportSize({width: w, height: h});
      for (const id of ['taquin-01', 'taquin-02', 'taquin-03', 'taquin-04', 'taquin-05', 'taquin-08', 'taquin-09', 'taquin-10', 'taquin-playground']) {
        await open(id);
        if (id === 'taquin-05' || id === 'taquin-08') for (let k = 0; k < 18; k++) { for (let j = 0; j < 3; j++) await button('Hint').click(); await button('Apply hint').click(); }
        if (id === 'taquin-09') await taps([0, 2], [0, 3], [0, 1], [0, 2]);
        await fit(`${id}, ${tag}`);
        await page.screenshot({path: `${dir}${id}-${tag}.png`, fullPage: true});
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, glided: glided > 0}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
