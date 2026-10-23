// Plays Moving piles through the real interface on the shared graph board:
// picking a pile and moving by taps and by keyboard, where a picked pile can
// go, a slide that carries a counter several roads (a mouse drag, or a touch
// drag with TEST_PHONE=1), red move dots and Undo, the marks after a solve,
// placing a design and "Fewer moves would do.", the cards with both refused
// Bests kept off through Undo and the right claim, the ring, and the
// playground's maps and tools. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone viewport). Screenshots go in test-results/piles/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/piles/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.pl-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const place = id => page.locator(`.gb-node[data-node="${id}"]`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const go = async (from, to) => { await tap(place(from)); await tap(place(to)); };
const undo = () => page.locator('[data-action="undo"]').click();
const panel = () => page.locator('.pl-puzzle').innerHTML();
// A slide is a real touch drag on a phone and a mouse drag on a desktop,
// from place to place through their centres. Taps and slides scroll their
// place into view first, as a child would, since the cards push the board
// below the fold on a phone.
let cdp = null;
async function slide(...ids) {
  const points = [];
  await page.locator('.pl-map').scrollIntoViewIfNeeded();
  for (const id of ids) points.push(await center(place(id)));
  if (!phone) {
    await page.mouse.move(...points[0]); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(...p, {steps: 8});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', points[0]);
  for (let k = 1; k < points.length; k++) for (let s = 1; s <= 8; s++) {
    const [x1, y1] = points[k - 1], [x2, y2] = points[k];
    await touch('touchMove', [x1 + (x2 - x1) * s / 8, y1 + (y2 - y1) * s / 8]);
  }
  // The finger rests before lifting: a lift while still moving starts a
  // fling, and Chromium then swallows the next tap as the one that stops it.
  await page.waitForTimeout(150); await touch('touchEnd', points.at(-1));
}
const count = selector => page.locator(selector).count();
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Piles QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-piles"] .family-ink-symbol').innerText(), '⁖', 'in the satchel');

  // Two counters: pick a pile, see where it can go, move by tap and by keys.
  const A = 'piles-01';
  await open(A); await fit('two counters');
  assert.equal(await count('.pl-pip'), 2, 'two move dots');
  assert.equal(await count('.pl-told'), 0, 'no objective line on a move puzzle');
  await tap(place('0'));
  assert.equal(await count('.gb-node.picked'), 1, 'the pile is picked');
  assert.equal(await count('.gb-node.can-go'), 1, 'one place it can go');
  await tap(place('0'));
  assert.equal(await count('.gb-node.picked'), 0, 'a second tap lets go');
  await shot('first');
  await go('0', '1');
  assert.deepEqual((await board(A)).log, [['0', '1']], 'two taps move one counter');
  assert.equal(await count('.pl-pip.used'), 1);
  await place('3').focus(); await page.keyboard.press('Enter');
  await place('2').focus(); await page.keyboard.press('Enter');
  await done();
  assert.equal(await count('.pl-flow'), 2, 'each crossed road shows its count');
  await shot('first-solved');

  // Nearest first: the trap overruns the dots; Undo takes moves back one at a time.
  const N = 'piles-03';
  await open(N);
  await go('3', '2');
  await slide('0', '1', '2', '3', '4', '5');
  assert.equal((await board(N)).log.length, 6, 'a slide is one move a road');
  assert.equal(await count('.pl-pip.over'), 2, 'two red dots');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'not solved');
  await shot('nearest-over');
  for (let k = 6; k > 0; k--) { const before = await panel(); await undo(); assert.notEqual(await panel(), before, 'each Undo changes the board'); }
  assert.deepEqual((await board(N)).log, []);
  await slide('0', '1', '2'); await slide('3', '4', '5');
  await done();

  // Three from one end: slides and taps; the solve marks are the gap counts.
  const T = 'piles-02';
  await open(T); await fit('three from one end');
  await slide('0', '1', '2', '3'); await slide('0', '1', '2'); await go('0', '1'); await go('5', '4');
  await done();
  assert.deepEqual(await page.locator('.pl-flow text').evaluateAll(els => els.map(e => e.textContent)), ['3', '2', '1', '1'], 'roads carried 3, 2, 1 and 1');
  await shot('three-solved');

  // Design: place the counters, then move; a start that needs fewer is told.
  const D = 'piles-09';
  await open(D); await fit('design');
  assert.match(await page.locator('.board-panel').innerText(), /no fewer/, 'one objective line');
  assert.equal(await count('.pl-tray-dot'), 4);
  for (const id of ['0', '2', '4']) await tap(place(id));
  assert.equal(await count('.pl-tray-dot'), 1, 'the tray shows what is left');
  await shot('design-placing');
  await tap(place('5'));
  await go('5', '4'); await go('4', '5'); await go('2', '3'); await slide('0', '1', '2');
  assert.equal(await page.locator('.pl-told').innerText(), 'Fewer moves would do.');
  await shot('design-fewer');
  await page.locator('[data-action="restart"]').click();
  for (const id of ['0', '0', '4', '5']) await tap(place(id));
  await slide('0', '1', '2', '3'); await slide('0', '1', '2');
  await done();

  // Cards: a near pair is refused, Best stays off through Undo, the right claim solves.
  const C = 'piles-10';
  await open(C); await fit('cards');
  const card = k => page.locator('.pl-card').nth(k), best = page.locator('.pl-best');
  await tap(card(2)); await tap(card(6));
  assert.equal(await best.isDisabled(), true, 'Best waits for the rings');
  await go('0', '1'); await go('4', '3');
  assert.equal(await best.isDisabled(), false);
  await best.click();
  assert.equal(await page.locator('.pl-told').innerText(), 'Another pair takes more moves.');
  assert.equal(await best.isDisabled(), true, 'a refused pair keeps Best off');
  await shot('cards-refused');
  await undo();
  assert.equal(await count('.pl-told'), 0, 'Undo takes the line away');
  assert.equal(await best.isDisabled(), true, 'and keeps Best off');
  await tap(card(0)); await tap(card(7));
  await slide('0', '1', '2'); await slide('0', '1', '2'); await slide('4', '3', '2'); await go('4', '3'); await go('3', '2');
  await shot('cards-pair');
  await best.click();
  await done();
  assert.equal(await count('.pl-flow'), 4, 'four roads, two counters each');

  // The ring: both ways round from 0.
  const R = 'piles-11';
  await open(R); await fit('ring');
  await go('0', '1'); await slide('0', '1', '2'); await go('0', '5'); await slide('0', '5', '4');
  await done();
  await shot('ring-solved');

  // The playground: maps, tools, moves counted since the last addition, Clear.
  const G = 'piles-playground';
  await open(G); await fit('playground');
  assert.equal(await page.getByRole('button', {name: 'Hint', exact: true}).count(), 0, 'no Hint');
  for (const id of ['0', '0', '1']) await tap(place(id));
  await page.getByRole('button', {name: 'Rings', exact: true}).click();
  for (const id of ['3', '4', '4']) await tap(place(id));
  await page.getByRole('button', {name: 'Move', exact: true}).click();
  await slide('1', '2', '3');
  assert.equal((await board(G)).work, 2);
  await shot('playground');
  await page.getByRole('button', {name: 'Ring', exact: true}).click();
  assert.deepEqual((await board(G)).counters, [0, 0, 0, 0, 0, 0], 'a new map starts empty');
  await page.getByRole('button', {name: 'Counters', exact: true}).click();
  await tap(place('0'));
  await page.getByRole('button', {name: 'Move', exact: true}).click();
  await go('0', '5');
  assert.deepEqual((await board(G)).counters, [0, 0, 0, 0, 0, 1], 'the ring joins 0 and 5');
  await page.locator('.pl-clear').click();
  assert.equal(await page.locator('.pl-clear').isDisabled(), true, 'nothing left to clear');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
