// Plays Joining strips through the real interface: choosing a strip, halving
// it by tapping it again, joining equal strips, an unequal join refused with
// both strips marked, the free bench's cut lines (tapped exactly on the line
// between two squares), Keep with its two refusals, That's all, Flip,
// matching, a wrong Can't judged after halving both rows and kept through
// Undo, a right Can't with the goal halved, keyboard focus after moves, and the playground's + and −.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// SHOTS=<dir> also saves phone (375 px) and desktop screenshots of each puzzle.
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
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.jn-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const strip = (i, side = 'bench') => page.locator(`[data-focus="jn-${side}-${i}"].jn-strip`);
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async locator => { const b = await locator.boundingBox(); await tapAt(b.x + b.width / 2, b.y + b.height / 2); };
const told = () => page.locator('.jn-told').innerText();
const bench = async id => (await board(id)).bench.join(',');
const button = name => page.getByRole('button', {name, exact: true});

try {
  await page.goto(base); await page.locator('#nickname').fill('Strips QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').click();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-joins"] .family-ink-symbol').innerText(), '▤');

  // Joining and halving: 4, 3, 3 to 6, 1, 1, 1, 1.
  await open('joins-06'); await fit('joins-06');
  assert.equal(await page.locator('.jn-goal .jn-strip').count(), 5, 'the goal is drawn');
  await tap(strip(1)); assert.equal(await strip(1).getAttribute('aria-pressed'), 'true', 'a tap chooses');
  await tap(strip(2)); assert.equal(await bench('joins-06'), '6,4', 'two 3s join');
  await tap(strip(1)); await tap(strip(0));
  assert.equal(await told(), 'Only equal strips join.');
  assert.equal(await page.locator('.jn-strip.marked').count(), 2, 'both strips are marked');
  assert.equal(await bench('joins-06'), '6,4', 'nothing moved');
  assert.equal(await strip(1).getAttribute('aria-pressed'), 'true', 'the 4 stays chosen');
  await tap(strip(1));
  assert.equal(await bench('joins-06'), '6,2,2', 'tapping the chosen 4 again halves it');
  assert.equal(await page.locator('.jn-told').count(), 0, 'the refusal is gone');
  // Keyboard: Enter twice on a strip halves it; focus stays on a strip.
  await strip(1).focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  assert.equal(await bench('joins-06'), '6,2,1,1');
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('jn-strip')), 'focus stays on the board');
  await tap(strip(2)); await tap(strip(2));
  assert.equal(await told(), 'Only even strips halve.', 'halving a 1 is refused, not ignored');
  // A wrong Can't: judged only when both rows are halved, then refused and kept through Undo.
  await button('Can’t').click();
  assert.equal(await told(), 'Halve every even strip in both rows.');
  assert.equal(await page.locator('.jn-strip.hinted, .jn-strip.chosen').count(), 0, 'no next tap is marked');
  await tap(strip(0)); await tap(strip(0));
  assert.equal(await bench('joins-06'), '3,3,2,1,1');
  await tap(strip(2)); await tap(strip(2));
  assert.equal((await board('joins-06')).claim, 'halving', 'not judged yet');
  await tap(strip(0, 'goal')); await tap(strip(0, 'goal'));
  assert.equal(await told(), 'There is a way.');
  assert.equal((await board('joins-06')).goal.join(','), '6,1,1,1,1', 'the goal comes back whole');
  assert.ok(await button('Can’t').isDisabled());
  await page.locator('[data-action=undo]').click();
  assert.ok(await button('Can’t').isDisabled(), 'Undo keeps the refusal');
  assert.equal(await told(), 'There is a way.');
  await tap(strip(0)); await tap(strip(1)); await done();

  // The free bench: cut lines at every join between squares.
  await open('joins-02'); await fit('joins-02');
  await tap(strip(0));
  assert.equal(await page.locator('.jn-cut').count(), 4, 'a 5 shows four cut lines');
  const b = await strip(0).boundingBox();
  await tapAt(b.x + b.width * 2 / 5, b.y + b.height / 2);
  assert.equal(await bench('joins-02'), '3,2', 'the tap on the line between squares 2 and 3 cuts there');
  await tap(strip(0)); const c = await strip(0).boundingBox();
  await tapAt(c.x + c.width / 3, c.y + 4);
  assert.equal(await bench('joins-02'), '2,2,1', 'a cut near the top edge of the strip');
  await button('Keep').click();
  assert.equal(await page.locator('.jn-thumb').count(), 1);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'jn-keep', 'focus stays on Keep');
  await button('Keep').click();
  assert.equal(await told(), 'Kept already.'); assert.equal(await page.locator('.jn-thumb.again').count(), 1, 'the copy is ringed');
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  assert.ok(await button('That’s all').isDisabled());
  assert.ok(await page.evaluate(() => !/That’s all|Can’t/.test(document.activeElement?.textContent || '')), 'focus is not on That’s all');
  await tap(strip(1)); await tap(strip(2));
  assert.equal(await bench('joins-02'), '3,2', 'any two strips join on the free bench');
  await page.locator('[data-action=undo]').click();
  assert.ok(await button('That’s all').isDisabled(), 'Undo keeps the refusal');
  assert.equal(await page.locator('.jn-thumb').count(), 1, 'Undo keeps the shelf');

  // A collection that does not fit is refused by marking the strips at fault.
  await open('joins-03');
  await tap(strip(0)); const d = await strip(0).boundingBox(); await tapAt(d.x + d.width * 4 / 7, d.y + d.height / 2);
  assert.equal(await bench('joins-03'), '4,3');
  await button('Keep').click();
  assert.equal(await told(), 'Only odd strips.'); assert.equal(await page.locator('.jn-strip.marked').count(), 1);

  // Flip.
  await open('joins-08');
  await page.getByRole('button', {name: 'Flip rows and columns'}).click();
  assert.equal(await bench('joins-08'), '1,1,1,1,1,1,1,1');
  await button('Keep').click(); assert.equal(await told(), 'Too many strips.');

  // Matching.
  await open('joins-05'); await fit('joins-05');
  await page.getByRole('button', {name: '3, 3, 1, 1', exact: true}).click();
  await tap(strip(0)); await tap(strip(1)); await tap(strip(1)); await tap(strip(2));
  assert.equal((await board('joins-05')).paired.length, 1);
  assert.equal(await page.getByRole('img', {name: '3, 3, 1, 1 pairs with 6, 2'}).count(), 1);
  await page.getByRole('button', {name: '7, 1', exact: true}).click();
  assert.equal((await board('joins-05')).paired.length, 2, '7, 1 pairs at once');

  // A right Can't: the child halves both rows.
  await open('joins-07'); await fit('joins-07');
  await tap(strip(0)); await tap(strip(0));
  await button('Can’t').click();
  assert.equal(await told(), 'Halve every even strip in both rows.');
  assert.equal(await page.locator('button.jn-strip.goal').count(), 2, 'the goal is tappable now');
  await tap(strip(0, 'goal')); await tap(strip(0, 'goal'));
  await tap(strip(0, 'goal')); await tap(strip(0, 'goal'));
  assert.equal((await board('joins-07')).goal.join(','), '3,3,3,3');
  assert.equal((await board('joins-07')).claim, 'halving', 'judged only at the last halving');
  await tap(strip(2)); await tap(strip(2)); await done();
  assert.equal(await told(), 'The odd strips differ.');
  assert.equal(await page.locator('.jn-strip.off').count(), 8);

  // The playground.
  await open('joins-playground'); await fit('joins-playground');
  assert.equal(await button('Hint').count(), 0);
  await page.getByRole('button', {name: 'Add a 1'}).click();
  assert.equal(await bench('joins-playground'), '3,3,1,1,1,1,1');
  await page.getByRole('button', {name: 'Take away a 1'}).click();
  await tap(strip(0)); await tap(strip(1));
  assert.equal(await bench('joins-playground'), '6,1,1,1,1');

  if (process.env.SHOTS) {
    const dir = process.env.SHOTS.replace(/\/?$/, '/');
    await mkdir(dir, {recursive: true});
    for (const [w, h, tag] of [[375, 812, 'phone'], [1280, 900, 'desktop']]) {
      await page.setViewportSize({width: w, height: h});
      for (const id of ['joins-01', 'joins-05', 'joins-07', 'joins-08', 'joins-09', 'joins-11', 'joins-playground']) {
        await open(id);
        await fit(`${id}, ${tag}`);
        if (id === 'joins-09') { await tap(strip(0)); }
        if (id === 'joins-11') { for (let k = 0; k < 7; k++) { if (!await strip(0).count()) break; const list = await bench(id); const i = list.split(',').findIndex(x => Number(x) % 2 === 0); if (i < 0) break; await tap(strip(i)); await tap(strip(i)); } }
        await page.screenshot({path: `${dir}${id}-${tag}.png`, fullPage: true});
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
