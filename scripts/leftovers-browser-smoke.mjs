// Plays Square leftovers through the real interface: the card in hand and
// its square, bundling by Bundle alone and by sliding across a rectangle of
// counters (a mouse drag, or a touch drag with TEST_PHONE=1), a wrong-size
// choice and an early stop answered on the board, placing by tapping a bin and
// by dragging a card, That's all refused and locked through Undo and then
// accepted with the empty bins marked, a find with "There's another." and a
// card taken back out, the tell puzzles with a failed Try, a refused and a
// right Can't and a win, and the playground. Same environment variables as
// the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone viewport). Screenshots go in test-results/leftovers/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(process.env.TEST_STACK ? e.stack : e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/leftovers/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.lo-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const card = n => page.locator(`button.lo-card[data-lo-card="${n}"]`);
const bin = r => page.locator(`.lo-bin-drop[data-lo-bin="${r}"]`);
const counter = i => page.locator(`.lo-work [data-sg-cell="${i}"]`);
const bundle = () => tap(page.locator('.lo-bundle'));
const claim = () => tap(page.locator('.lo-claim'));
const undo = () => page.locator('[data-action="undo"]').click();
const count = selector => page.locator(selector).count();
const text = () => page.locator('.lo-puzzle').innerText();
// A drag through the given points: a real touch drag on a phone, a mouse drag on a desktop.
let cdp = null;
async function drag(points) {
  if (!phone) {
    await page.mouse.move(...points[0]); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(...p, {steps: 10});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', points[0]);
  for (let k = 1; k < points.length; k++) for (let s = 1; s <= 10; s++) {
    const [x1, y1] = points[k - 1], [x2, y2] = points[k];
    await touch('touchMove', [x1 + (x2 - x1) * s / 10, y1 + (y2 - y1) * s / 10]);
  }
  // The finger rests before lifting, so Chromium does not start a fling.
  await page.waitForTimeout(150); await touch('touchEnd', points.at(-1));
}
const slide = async (from, to) => { await page.locator('.lo-work svg').scrollIntoViewIfNeeded(); await drag([await center(counter(from)), await center(counter(to))]); };
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Leftovers QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-leftovers"] .family-ink-symbol').innerText(), '⊟', 'in the satchel');

  // Bundles of 4: card 0 is in hand and goes in bin 0; card 1 goes in bin 1.
  const A = 'leftovers-01';
  await open(A); await fit('bundles of 4');
  assert.equal(await count('h1.puzzle-goal'), 0, 'no objective line on a sort');
  assert.equal(await count('.lo-bin'), 4, 'four bins');
  assert.equal(await page.locator('.lo-bar .lo-card').innerText(), '0', 'card 0 in hand');
  await tap(bin(0));
  assert.equal(await page.locator('.lo-bar .lo-card').innerText(), '1', 'card 1 in hand next');
  await tap(bin(1));
  // Card 2: Bundle with nothing chosen takes the next bundle and finishes it.
  await bundle();
  assert.equal(await count('.lo-counter.taken'), 4);
  assert.equal(await page.locator('.lo-bundle').isDisabled(), true, 'Bundle is off with nothing left to bundle');
  await tap(bin(0));
  // Card 3: three counters chosen are not a bundle of 4.
  await shot('sort-start');
  await tap(counter(0)); await tap(counter(1)); await tap(counter(2));
  assert.equal(await count('.lo-counter.chosen'), 3, 'three counters chosen by taps');
  await bundle();
  assert.match(await text(), /Bundles of 4\./);
  assert.equal(await count('.lo-counter.taken'), 0, 'nothing bundled');
  // A slide from counter 0 to counter 4 chooses the 2 by 2 square: one bundle.
  await slide(0, 4);
  assert.equal(await count('.lo-counter.chosen'), 4, 'the rectangle is chosen');
  await bundle();
  assert.equal(await count('.lo-counter.taken'), 4, 'one bundle');
  await shot('sort-bundled');
  // Stopping now is answered on the board.
  await tap(bin(1));
  assert.match(await text(), /Another bundle fits\./);
  assert.equal((await board(A)).where[3], null, 'card 3 stays in the row');
  await bundle();
  assert.equal(await count('.lo-counter.left'), 1, 'one counter left over, ringed');
  // Drag card 3 onto the wrong bin, then That's all.
  await card(3).scrollIntoViewIfNeeded();
  await drag([await center(card(3)), await center(page.locator('.lo-bin[data-lo-drop="3"]'))]);
  assert.equal((await board(A)).where[3], 3, 'the drag put card 3 in bin 3');
  await claim();
  assert.match(await text(), /A card is in the wrong bin\./);
  assert.equal(await page.locator('.lo-claim').isDisabled(), true, 'That’s all is off for this arrangement');
  await shot('sort-refused');
  await undo();
  assert.equal((await board(A)).where[3], null, 'Undo takes back the drag, not the claim');
  assert.equal((await board(A)).shut.length, 1, 'the refusal stays');
  await tap(card(3)); await tap(bin(3));
  assert.equal(await page.locator('.lo-claim').isDisabled(), true, 'still off for the same arrangement');
  await tap(card(3)); await tap(bin(1));
  await claim();
  await done();
  assert.equal(await count('.lo-bin.never'), 2, 'bins 2 and 3 are marked empty');
  await shot('sort-solved');

  // Bundles of 11: the biggest board of bins.
  await open('leftovers-10'); await fit('bundles of 11');
  assert.equal(await count('.lo-bin'), 11);
  // No rectangle inside a 10 by 10 square is whole bundles of 11.
  await tap(card(10));
  await slide(0, 99);
  assert.equal(await count('.lo-counter.chosen'), 100, 'the whole square is chosen');
  await bundle();
  assert.match(await text(), /Bundles of 11\./);
  assert.equal(await count('.lo-counter.chosen'), 0, 'the choice is let go');
  await bundle(); await bundle();
  assert.equal(await count('.lo-counter.taken'), 22, 'Bundle takes the next bundle');
  await shot('sort-eleven');

  // Bundles of 15, find leftover 1: one bin, "There's another.", taking a card out.
  const F = 'leftovers-09';
  await open(F); await fit('find');
  assert.equal(await page.locator('h1.puzzle-goal').innerText(), 'Find every card that leaves 1.');
  assert.equal(await count('.lo-bin'), 1);
  await tap(card(1)); await tap(bin(1));
  await tap(card(14)); await tap(bin(1));
  await claim();
  assert.match(await text(), /There’s another\./);
  await tap(card(13)); await tap(bin(1));
  await claim();
  assert.match(await text(), /A card here doesn’t belong\./);
  await tap(card(13)); await tap(page.locator('.lo-row-drop'));
  assert.equal((await board(F)).where[13], null, 'card 13 back in the row');
  assert.match(await text(), /There’s another\./, 'this set was refused already');
  assert.equal(await page.locator('.lo-claim').isDisabled(), true);
  await shot('find-another');
  await tap(card(4)); await tap(bin(1)); await tap(card(11)); await tap(bin(1));
  await claim();
  await done();

  // One size: a failed Try shows the matching pair; Can't is refused; 11 wins.
  const T = 'leftovers-08';
  await open(T); await fit('one size');
  assert.equal(await page.locator('.lo-try').isDisabled(), true);
  await tap(page.locator('.lo-size-button', {hasText: /^7$/}));
  await tap(page.locator('.lo-try'));
  assert.equal(await count('.lo-card.pair'), 2, 'two cards match');
  assert.equal(await page.locator('.lo-tries li').getAttribute('aria-label'), 'Bundles of 7: cards 3 and 4 both leave 2.');
  await tap(page.locator('.lo-cant'));
  assert.match(await text(), /There is a way\./);
  await shot('tell-try');
  await tap(page.locator('.lo-size-button', {hasText: /^7$/}));
  await tap(page.locator('.lo-size-button', {hasText: /^11$/}));
  await tap(page.locator('.lo-try'));
  await done();
  await shot('tell-solved');

  // One more card: no size works, and the catalog shows a match for each.
  const C = 'leftovers-11';
  await open(C);
  await tap(page.locator('.lo-size-button', {hasText: /^12$/}));
  await tap(page.locator('.lo-try'));
  await tap(page.locator('.lo-cant'));
  await done();
  assert.equal(await count('.lo-catalog li'), 11);
  await shot('tell-cant');

  // Two sizes: a failed pair, then 10 and 11.
  const W = 'leftovers-12';
  await open(W); await fit('two sizes');
  for (const m of [2, 3]) await tap(page.locator('.lo-size-button', {hasText: new RegExp(`^${m}$`)}));
  assert.equal(await page.locator('.lo-size-button', {hasText: /^4$/}).isDisabled(), true, 'two sizes at most');
  await tap(page.locator('.lo-try'));
  assert.equal(await count('.lo-card.pair'), 2);
  await shot('tell-two');
  for (const m of [2, 3, 10, 11]) await tap(page.locator('.lo-size-button', {hasText: new RegExp(`^${m}$`)}));
  await tap(page.locator('.lo-try'));
  await done();

  // Hints outline the next thing at level 2.
  await open('leftovers-05');
  const hint = page.getByRole('button', {name: 'Hint', exact: true});
  await hint.click(); await hint.click();
  assert.ok(await count('.lo-puzzle .hinted') >= 1, 'level 2 outlines something');
  await shot('hint');

  // The playground: side and size steppers, a strip, Clear.
  const G = 'leftovers-playground';
  await open(G); await fit('playground');
  assert.equal(await page.getByRole('button', {name: 'Hint', exact: true}).count(), 0, 'no Hint');
  for (let k = 0; k < 7; k++) await tap(page.getByRole('button', {name: 'More rows', exact: true}));
  for (let k = 0; k < 3; k++) await tap(page.getByRole('button', {name: 'More in a bundle', exact: true}));
  assert.deepEqual([(await board(G)).side, (await board(G)).size], [10, 7]);
  await slide(0, 96);
  assert.equal(await count('.lo-counter.chosen'), 70, 'a 10 by 7 strip');
  await bundle();
  assert.equal(await count('.lo-counter.taken'), 70);
  await shot('playground');
  await tap(page.locator('.lo-clear'));
  assert.equal(await page.locator('.lo-clear').isDisabled(), true, 'nothing left to clear');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
