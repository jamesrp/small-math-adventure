// Plays Mixed-up cups through the real interface: swapping cups by two taps,
// by a drag (a touch drag with TEST_PHONE=1) and from the keyboard; Keep and
// a repeat; an early That's all; a kept row tapped back onto the cups; a
// pinned cup; the hoops and columns; a solve with its catalog; and the
// playground. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// viewport). Screenshots go in test-results/mixup/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/mixup/', import.meta.url);
const shot = async name => { await page.waitForTimeout(900); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="mixup"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const cup = h => page.locator(`[data-cup="${h}"]`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const button = name => page.locator('.case-action', {hasText: name});
let cdp = null;
async function drag(from, to) {
  const [a, b] = [await center(from), await center(to)];
  if (!phone) { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b, {steps: 8}); await page.mouse.up(); return; }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let s = 1; s <= 8; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 8, a[1] + (b[1] - a[1]) * s / 8]);
  await touch('touchEnd', b);
}
const swap = async (i, j) => { await tap(cup(i)); await tap(cup(j)); };
const row = async id => (await board(id)).row;
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Cups QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-mixup"]').getAttribute('open'), '', 'the newest family starts open');

  // Three cups: two taps swap, a drag swaps, Keep, a repeat, an early That's all.
  const P1 = 'mixup-01';
  await open(P1); await fit('three cups'); await shot('01-start');
  assert.equal(await button('Keep').isDisabled(), true, 'ABC can’t be kept');
  await tap(cup(0));
  assert.equal(await cup(0).getAttribute('aria-pressed'), 'true', 'the first tap picks a cup');
  await tap(cup(1));
  assert.equal(await row(P1), 'BAC', 'the second tap swaps');
  await drag(cup(1), cup(2));
  assert.equal(await row(P1), 'BCA', 'a drag swaps');
  assert.equal(await page.locator('.case-home.at-home').count(), 0, 'no cup at home');
  await button('Keep').click();
  assert.deepEqual((await board(P1)).kept, ['BCA']);
  assert.equal(await button('Keep').isDisabled(), true, 'a kept row can’t be kept again');
  assert.equal(await page.locator('.case-kept.current').count(), 1, 'the kept row on the board is marked');
  await button('That’s all').click();
  await page.getByText('There’s another.').waitFor();
  assert.equal(await button('That’s all').isDisabled(), true, 'not twice in a row');
  await shot('01-another');
  // Keyboard: Enter on one cup, then another.
  await cup(0).focus(); await page.keyboard.press('Enter');
  await cup(1).focus(); await page.keyboard.press('Enter');
  assert.equal(await row(P1), 'CBA', 'the keyboard swaps');
  await swap(1, 2);
  assert.equal(await row(P1), 'CAB');
  await button('Keep').click(); await button('That’s all').click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal(await page.locator('.case-catalog .case-kept').count(), 6, 'the catalog shows all six rows');
  assert.equal(await page.locator('.case-catalog .case-kept.yes').count(), 2);
  await fit('three cups solved'); await shot('01-solved');

  // A kept row taps back onto the cups.
  const P5 = 'mixup-05';
  await open(P5);
  await swap(0, 1); await swap(2, 3); await button('Keep').click();
  await swap(0, 2);
  assert.equal(await row(P5), 'DABC');
  await tap(page.locator('[data-case="BADC"]'));
  assert.equal(await row(P5), 'BADC', 'tapping a kept row loads it');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await row(P5), 'DABC', 'Undo takes the load back');
  await fit('four cups');

  // A pinned cup stays put.
  const P9 = 'mixup-09';
  await open(P9);
  assert.equal(await cup(0).getAttribute('aria-disabled'), 'true');
  await tap(cup(0)); await tap(cup(1));
  assert.equal(await row(P9), 'EBCDA', 'the pinned cup does not move');
  assert.equal(await cup(1).getAttribute('aria-pressed'), 'true', 'the tap on the pinned cup was ignored');
  await tap(cup(1));
  await swap(1, 4); await swap(2, 3); await button('Keep').click();
  await swap(1, 2); await button('Keep').click();
  assert.deepEqual((await board(P9)).kept, ['EADCB', 'EDACB']);
  await fit('five cups'); await shot('09-columns');

  // The hoops: rows with A or B at home, the overlap in the middle.
  const P6 = 'mixup-06';
  await open(P6);
  for (const [i, j] of [[0, 1], [2, 3]]) await swap(i, j);
  assert.equal(await row(P6), 'ABCD');
  await button('Keep').click();
  await swap(2, 3); await button('Keep').click();
  await swap(1, 2); await button('Keep').click();
  await swap(1, 3); await button('Keep').click();
  await swap(0, 1); await swap(1, 2); await button('Keep').click();
  assert.deepEqual((await board(P6)).kept, ['ABCD', 'ABDC', 'ADBC', 'ACBD', 'CBAD']);
  assert.equal(await page.locator('.case-hoop-part.both .case-kept').count(), 2, 'two rows in both hoops');
  assert.ok(await page.locator('.case-hoop-part.left .case-kept').count() >= 1);
  await fit('hoops'); await shot('06-hoops');

  // Hints solve a puzzle in the browser.
  const P7 = 'mixup-07';
  await open(P7);
  const hint = page.getByRole('button', {name: 'Hint', exact: true});
  for (let i = 0; i < 3; i++) await hint.click();
  const apply = page.getByRole('button', {name: 'Apply hint', exact: true});
  for (let s = 0; !await page.locator('#completion-heading').count() && s < 120; s++) await apply.click();
  await page.locator('#completion-heading').waitFor({timeout: 5000});
  assert.equal(await page.locator('.case-bin[data-bin] .case-kept').count(), 8);
  await fit('exactly one'); await shot('07-solved');

  // The playground.
  await open('mixup-playground');
  await page.getByRole('button', {name: '5 cups'}).click();
  assert.equal(await cup(4).count(), 1);
  await button('Keep').click(); await swap(0, 1); await button('Keep').click(); await swap(2, 3); await swap(3, 4); await button('Keep').click();
  await button('Shuffle').click();
  assert.equal((await board('mixup-playground')).kept.length, 3);
  assert.equal(await page.locator('.case-bin').count(), 6, 'columns for 0 to 5 at home');
  await fit('playground'); await shot('playground');
  await button('Clear').click();
  assert.deepEqual((await board('mixup-playground')).kept, []);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
