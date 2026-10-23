// Plays Prime bags through the real interface: choosing tokens and keeping
// values, Keep off with the kept value ringed when the other 2 is chosen,
// That's all refused and kept through Undo, a solve; splitting with a refused
// key, keys off from the card up, the shelf, a quick second tap on the key
// that finishes a run landing on nothing, and New run; a design with "A bag
// with a smaller = number makes 8 values.", 44 px − buttons, a token taken out
// dropping kept values and Undo giving them back, a solve; keyboard play,
// Apply hint, the playground, readable tray tokens and no page overflow.
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
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.pb-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const tap = async locator => { const b = await locator.boundingBox(); if (phone) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
const token = i => page.locator('.pb-bag .pb-token').nth(i);
const button = name => page.getByRole('button', {name, exact: true});
const told = () => page.locator('.pb-told').innerText();
const value = () => page.locator('.pb-value').innerText();
const tray = () => page.locator('.pb-tray .pb-item b').allInnerTexts();
// Choose exactly the tokens at these places, then Keep.
async function keepChoice(places) {
  const chosen = await page.locator('.pb-bag .pb-token').evaluateAll(list => list.map((x, i) => (x.getAttribute('aria-pressed') === 'true' ? i : -1)).filter(i => i >= 0));
  for (const i of [...chosen.filter(i => !places.includes(i)), ...places.filter(i => !chosen.includes(i))]) await tap(token(i));
  await tap(page.locator('.pb-keep'));
}

try {
  await page.goto(base); await page.locator('#nickname').fill('Bags QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').click();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-primes"] .family-ink-symbol').innerText(), '∏');

  // Puzzle 2: three 2s. Choosing, Keep, the other 2, That's all refused and kept through Undo.
  await open('primes-02'); await fit('primes-02');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Keep every value the bag can make.');
  assert.equal(await value(), '1', 'nothing chosen makes 1');
  await tap(page.locator('.pb-keep'));
  await tap(token(0));
  assert.equal(await value(), '2');
  await tap(page.locator('.pb-keep'));
  assert.deepEqual(await tray(), ['1', '2']);
  await tap(token(0)); await tap(token(1));
  assert.equal(await value(), '2', 'the other 2 makes 2 too');
  assert.ok(await page.locator('.pb-keep').isDisabled(), 'Keep is off for a value kept');
  assert.equal(await page.locator('.pb-item.now b').innerText(), '2', 'the kept 2 is ringed');
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  assert.ok(await button('That’s all').isDisabled());
  await page.locator('[data-action=undo]').click();
  assert.ok(await button('That’s all').isDisabled(), 'Undo keeps the refusal');
  assert.deepEqual(await tray(), ['1', '2'], 'Undo keeps the tray');
  await keepChoice([0, 1]); await keepChoice([0, 1, 2]);
  assert.deepEqual(await tray(), ['1', '2', '4', '8']);
  assert.ok(!(await button('That’s all').isDisabled()), 'a new value lifts the refusal');
  await button('That’s all').click(); await done();

  // Puzzle 3: splitting 12.
  await open('primes-03'); await fit('primes-03');
  const key = d => page.locator(`.pb-key[data-focus="pb-key-${d}"]`);
  await tap(key(5));
  assert.equal(await told(), '5 doesn’t split 12.');
  assert.equal(await page.locator('.pb-key.marked').innerText(), '5');
  assert.deepEqual((await board('primes-03')).steps, [], 'a refused key changes nothing');
  await tap(key(3));
  assert.equal(await page.locator('.pb-told').count(), 0, 'the refusal went with the board');
  assert.deepEqual(await page.locator('.pb-cards > *').allInnerTexts(), ['3', '4']);
  assert.equal(await page.locator('.pb-cards .pb-prime').count(), 1, '3 is a round token');
  assert.ok(await key(4).isDisabled(), 'keys from the card up are off');
  const last = await key(2).boundingBox();
  await tap(key(2));
  // A quick second tap where the finishing key was lands on nothing: New run
  // stays where it was instead of rising into the keypad's place.
  if (phone) await page.touchscreen.tap(last.x + last.width / 2, last.y + last.height / 2); else await page.mouse.click(last.x + last.width / 2, last.y + last.height / 2);
  assert.equal((await board('primes-03')).steps.length, 2, 'a second tap on the finishing key changes nothing');
  assert.deepEqual(await page.locator('.pb-cards > *').allInnerTexts(), ['3', '2', '2'], 'the finished tokens stay');
  assert.equal(await page.locator('.pb-run').count(), 1);
  assert.equal(await page.locator('.pb-run .pb-pair').innerText(), '3 × 4');
  const mini = await page.locator('.pb-run .pb-mini i').first().boundingBox();
  assert.ok(mini.width >= 21 && mini.height >= 21, `shelf tokens are readable (${mini.width} px)`);
  assert.equal(await page.locator('.pb-run.now').count(), 1);
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  await button('New run').click();
  await tap(key(2));
  assert.equal(await page.locator('.pb-card.selected').innerText(), '6', 'the card that can split is chosen');
  await tap(key(2));
  assert.equal(await page.locator('.pb-run').count(), 2);
  await button('That’s all').click(); await done();

  // Puzzle 8: choosing a card among several.
  await open('primes-08');
  await tap(key(6));
  await tap(page.locator('.pb-card').nth(1));
  assert.equal(await page.locator('.pb-card.selected').count(), 1);
  assert.equal(await page.locator('.pb-pad').getAttribute('aria-label'), 'Split 6');
  assert.equal(await page.locator('.pb-card.selected').getAttribute('aria-label'), '6');
  await fit('primes-08');

  // Puzzle 13: a design refused as not the smallest, a token out and Undo, a solve.
  await open('primes-13'); await fit('primes-13');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Build a bag that makes exactly 8 values, with its = number as small as you can, and keep them all.');
  for (const x of [2, 3, 5]) await tap(page.getByRole('button', {name: `Put a ${x} in the bag`}));
  assert.equal(await page.locator('.pb-total').innerText(), '= 30');
  for (const box of await page.locator('.pb-drop').evaluateAll(list => list.map(x => x.getBoundingClientRect()).map(r => [r.width, r.height]))) assert.ok(box[0] >= 44 && box[1] >= 44, `− buttons are at least 44 px (${box})`);
  for (const places of [[], [0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]]) await keepChoice(places);
  assert.deepEqual(await tray(), ['1', '2', '3', '5', '6', '10', '15', '30']);
  await button('That’s all').click();
  assert.equal(await told(), 'A bag with a smaller = number makes 8 values.');
  await tap(page.getByRole('button', {name: 'Take a 5 out of the bag'}));
  assert.deepEqual(await tray(), ['1', '2', '3', '6'], 'values that need the 5 go');
  assert.equal(await page.locator('.pb-told').count(), 0);
  await page.locator('[data-action=undo]').click();
  assert.deepEqual(await tray(), ['1', '2', '3', '5', '6', '10', '15', '30'], 'Undo gives them back');
  assert.equal(await told(), 'A bag with a smaller = number makes 8 values.', 'with the refusal');
  await tap(page.getByRole('button', {name: 'Take a 5 out of the bag'}));
  await tap(page.getByRole('button', {name: 'Put a 2 in the bag'})); await tap(page.getByRole('button', {name: 'Put a 2 in the bag'}));
  assert.equal(await page.locator('.pb-total').innerText(), '= 24');
  assert.deepEqual(await tray(), ['1', '2', '3', '6'], 'adding tokens keeps kept values');
  for (const places of [[0, 1], [0, 1, 2], [0, 1, 3], [0, 1, 2, 3]]) await keepChoice(places);
  await button('That’s all').click(); await done();

  // Puzzle 1 by keyboard, then Apply hint on puzzle 9.
  await open('primes-01');
  await page.locator('.pb-keep').focus(); await page.keyboard.press('Enter');
  await token(0).focus(); await page.keyboard.press('Enter');
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('pb-token')), 'focus stays on the token after a choice');
  await page.locator('.pb-keep').focus(); await page.keyboard.press('Enter');
  await token(1).focus(); await page.keyboard.press('Enter');
  await page.locator('.pb-keep').focus(); await page.keyboard.press('Enter');
  await token(0).focus(); await page.keyboard.press('Enter');
  await page.locator('.pb-keep').focus(); await page.keyboard.press('Enter');
  assert.deepEqual(await tray(), ['1', '2', '3', '6']);
  await page.locator('.pb-all').focus(); await page.keyboard.press('Enter'); await done();
  await open('primes-09');
  for (let k = 0; k < 3; k++) await button('Hint').click();
  await button('Apply hint').click();
  assert.deepEqual((await board('primes-09')).bag, [1, 0, 0, 0], 'the hint put a 2 in the bag');

  // The playground.
  await open('primes-playground'); await fit('primes-playground');
  assert.equal(await button('Hint').count(), 0);
  assert.equal(await button('That’s all').count(), 0);
  for (const x of [2, 2, 3]) await tap(page.getByRole('button', {name: `Put a ${x} in the bag`}));
  await keepChoice([0, 2]);
  assert.deepEqual(await tray(), ['6']);

  if (process.env.SHOTS) {
    const dir = process.env.SHOTS.replace(/\/?$/, '/');
    await mkdir(dir, {recursive: true});
    for (const [w, h, tag] of [[1024, 768, 'tablet'], [375, 812, 'phone']]) {
      await page.setViewportSize({width: w, height: h});
      for (const id of ['primes-02', 'primes-03', 'primes-08', 'primes-11', 'primes-12', 'primes-14', 'primes-playground']) {
        await open(id);
        if (await button('Restart').count()) await button('Restart').click();
        const steps = {'primes-02': 4, 'primes-03': 3, 'primes-08': 5, 'primes-11': 15, 'primes-12': 9, 'primes-14': 14}[id] || 0;
        for (let k = 0; k < steps; k++) { for (let j = 0; j < 3; j++) await button('Hint').click(); await button('Apply hint').click(); }
        if (id === 'primes-03') await tap(page.locator('.pb-key[data-focus="pb-key-5"]'));
        if (id === 'primes-playground') for (const x of [2, 3, 3, 5, 7]) await tap(page.getByRole('button', {name: `Put a ${x} in the bag`}));
        await fit(`${id}, ${tag}`);
        await page.screenshot({path: `${dir}${id}-${tag}.png`, fullPage: true});
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
