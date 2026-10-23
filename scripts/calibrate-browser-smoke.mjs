// Plays Hidden machines (the Ruler strips group from Week 94) through the real
// interface: the group in the satchel, strips into the tray and Send, the
// slippery machine's reports, dials checked against every row, a win named,
// a lost round with its two machines and Again, no Undo in request rounds,
// pairs of hidden lengths on the shelf with That’s all refused and kept
// through Undo, a repair, the steepest and shallowest stretch pinned, Apply
// hint, focus after moves, and no page overflow.
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
// A fresh board each time: Replay after a solve, Restart otherwise.
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.cb-puzzle').waitFor(); for (const name of ['Replay', 'Restart']) if (await button(name).count()) { await button(name).click(); break; } await page.locator('.cb-puzzle:not(.solved)').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const button = name => page.getByRole('button', {name, exact: true});
const tap = async locator => { if (phone) await locator.tap(); else await locator.click(); };
const strip = s => page.locator(`.cb-strip-chip[aria-label^="${s},"]`);
const dial = (group, v) => page.locator(`.cb-dial[aria-label="${group}"] button`, {hasText: new RegExp(`^${v}$`)});
const note = () => page.locator('.cb-note').innerText();
const ticks = () => page.locator('.cb-board .cb-tick').count();
// Chip rows never leave one chip alone on a line, and a reference's arrows stay on one line.
async function noOrphans(label) {
  const bad = await page.evaluate(() => {
    const out = [];
    for (const row of document.querySelectorAll('.cb-chips')) {
      const lines = new Map();
      for (const chip of row.children) { const top = Math.round(chip.getBoundingClientRect().top); lines.set(top, (lines.get(top) || 0) + 1); }
      if (lines.size > 1 && [...lines.values()].some(n => n < 2)) out.push(row.parentElement.getAttribute('aria-label'));
    }
    return out;
  });
  assert.deepEqual(bad, [], `${label}: no chip alone on a line`);
}

try {
  await page.goto(base); await page.locator('#nickname').fill('Machines QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').click();
  const ruler = page.locator('.satchel-family[data-view-key="family-ranges"]');
  await ruler.locator('summary').click();
  assert.equal(await ruler.locator('.library-group h2', {hasText: 'Hidden machines'}).count(), 1, 'the group is in Ruler strips');

  // Puzzle 6: two different strips, the dials set to the one machine left, named.
  await open('calibrate-06'); await fit('calibrate-06');
  assert.equal(await page.locator('.cb-empty').count(), 2, 'two empty rows: the requests you have');
  assert.equal(await page.locator('.cb-board .cb-piece').count(), 0, 'nothing is drawn before a request');
  await tap(strip('A')); await tap(strip('C'));
  assert.deepEqual((await board('calibrate-06')).tray, ['C'], 'a one-strip tray swaps');
  await tap(strip('A')); await tap(button('Send'));
  assert.deepEqual((await board('calibrate-06')).requests, [['A']]);
  assert.equal(await page.locator('.cb-empty').count(), 1);
  assert.ok(await page.locator('[data-action=undo]').isDisabled(), 'no Undo in a request round');
  await tap(strip('B')); await tap(button('Send'));
  assert.ok(await strip('C').isDisabled(), 'the kit is off once every request is used');
  assert.equal(await ticks(), 0);
  assert.ok(await button('That’s the machine').isDisabled(), 'the dials start unset');
  await tap(dial('Copies', 3)); await tap(dial('Extra', 5));
  assert.ok(await button('That’s the machine').isDisabled(), 'off while a row has no tick');
  await tap(dial('Copies', 1)); await tap(dial('Extra', 6));
  assert.equal(await ticks(), 2, 'copies 1 and extra 6 meet both reports');
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('cb-chip')), 'focus stays on a dial after a move');
  await tap(button('That’s the machine')); await done();

  // Puzzle 6 again: the same strip twice loses, with two machines that fit, and Again.
  await open('calibrate-06');
  await tap(strip('B')); await tap(button('Send')); await tap(strip('B')); await tap(button('Send'));
  assert.equal(await note(), 'These both fit every report:');
  assert.equal(await page.locator('.cb-lost .cb-item').count(), 2);
  assert.equal(await page.locator('.cb-lost .cb-board .cb-tick').count(), 4, 'both machines drawn on both report rows, every row ticked');
  assert.equal(await button('That’s the machine').count(), 0, 'the round is over');
  await tap(button('Again'));
  assert.deepEqual((await board('calibrate-06')).requests, [], 'Again starts a new round');
  await fit('calibrate-06 lost');

  // Puzzle 8: a two-strip tray, and Apply hint to the end.
  await open('calibrate-08'); await fit('calibrate-08');
  await tap(strip('A')); await tap(strip('B'));
  assert.ok(await strip('C').isEnabled());
  await tap(strip('A'));
  assert.deepEqual((await board('calibrate-08')).tray, ['B'], 'a second tap takes a strip out');
  for (let k = 0; k < 6 && !(await page.locator('#completion-heading').count()); k++) { for (let j = 0; j < 3; j++) if (await button('Hint').count()) await button('Hint').click(); if (await button('Apply hint').count()) await button('Apply hint').click(); }
  await done();
  assert.deepEqual((await board('calibrate-08')).requests, [['B', 'C']]);

  // Puzzle 3: a pair on the shelf; That’s all refused and kept through Undo.
  await open('calibrate-03'); await fit('calibrate-03');
  assert.equal(await page.locator('.cb-shelf').count(), 0, 'no shelf, and no slot per answer, before a find');
  await tap(dial('Extra', 1)); await tap(dial('P', 6)); await tap(dial('Q', 9));
  assert.equal(await page.locator('.cb-item').innerText(), 'P 6, Q 9');
  await tap(button('That’s all'));
  assert.equal(await note(), 'There is another.');
  assert.ok(await button('That’s all').isDisabled());
  await tap(dial('Extra', 2));
  await page.locator('[data-action=undo]').click();
  assert.ok(await button('That’s all').isDisabled(), 'Undo keeps the refusal');
  assert.equal(await page.locator('.cb-item').count(), 1, 'Undo keeps the shelf');

  // Puzzle 9: a repair by changing one report by halves.
  await open('calibrate-09'); await fit('calibrate-09');
  await tap(page.locator('.cb-pair', {hasText: '6 → 16'}));
  await tap(page.getByRole('button', {name: 'Smaller report'})); await tap(page.getByRole('button', {name: 'Smaller report'}));
  assert.equal(await page.locator('.cb-item').innerText(), '6 → 15');
  assert.equal(await page.locator('.cb-plot .cb-line').count(), 1, 'the line shows when the points fit');

  // Puzzle 10: a wrong pair of pins refused, then the steepest and shallowest lines.
  await open('calibrate-10'); await fit('calibrate-10');
  const step = async (name, n) => { for (let k = 0; k < n; k++) await tap(page.getByRole('button', {name})); };
  await tap(button('Pin'));
  assert.equal(await page.locator('.feedback').innerText(), '', 'one pin is not judged');
  await step('Lower the report for length 2', 2); await step('Raise the report for length 4', 2); await tap(button('Pin'));
  assert.equal(await note(), 'A line can be shallower.');
  await tap(button('Pin')); await step('Raise the report for length 2', 4); await step('Lower the report for length 4', 4); await tap(button('Pin'));
  await done();
  assert.equal(await page.locator('.cb-pinned').count(), 2);

  if (process.env.SHOTS) {
    const dir = process.env.SHOTS.replace(/\/?$/, '/');
    await mkdir(dir, {recursive: true});
    for (const [w, h, tag] of [[1024, 768, 'tablet'], [375, 812, 'phone']]) {
      await page.setViewportSize({width: w, height: h});
      for (let n = 1; n <= 11; n++) {
        const id = `calibrate-${String(n).padStart(2, '0')}`;
        await open(id);
        if (id === 'calibrate-01') { await tap(strip('C')); await tap(button('Send')); }
        if (id === 'calibrate-06') { await tap(strip('A')); await tap(button('Send')); await tap(dial('Copies', 2)); await tap(dial('Extra', 2)); }
        if (id === 'calibrate-08') { await tap(strip('D')); await tap(button('Send')); }
        if (id === 'calibrate-02') { await tap(dial('Extra', 1)); await tap(dial('P', 3)); }
        if (id === 'calibrate-04') { await tap(dial('Extra', 4)); }
        if (id === 'calibrate-05') { await tap(page.locator('.cb-pair').first()); }
        if (id === 'calibrate-07') { await tap(dial('Extra', 4)); }
        if (id === 'calibrate-11') { await tap(page.getByRole('button', {name: 'Lower the report for length 2'})); await tap(button('Pin')); }
        await fit(`${id}, ${tag}`); await noOrphans(`${id}, ${tag}`);
        await page.screenshot({path: `${dir}${id}-${tag}.png`, fullPage: true});
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
