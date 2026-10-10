// Plays Fair shares through the real interface: cards dragged and tapped into
// trays, arrow keys, Fair and its refusal with one person's counts, That's all
// with There is another and the catalog, Can't with the pairing and the cut,
// shapes given by drag and tap with a swap, Can't with Check, the knife by tap
// and slide, both rounds of cut and choose, and focus after moves. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/shares/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/shares/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.sh-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const settle = () => page.waitForTimeout(60);
let cdp = null;
// A drag from one element's centre to another's, by mouse or by touch.
async function drag(from, to) {
  const a = await center(from), b = await center(to);
  if (!phone) {
    await page.mouse.move(...a); await page.mouse.down();
    await page.mouse.move(b[0], b[1], {steps: 10}); await page.mouse.up();
  } else {
    cdp ||= await context.newCDPSession(page);
    const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
    await touch('touchStart', a);
    for (let s = 1; s <= 10; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 10, a[1] + (b[1] - a[1]) * s / 10]);
    await touch('touchEnd', b);
    // Chrome drops a tap that follows a fast touch drag too closely; a
    // person's next tap comes later than this.
    await page.waitForTimeout(400);
  }
  await settle();
}
const card = id => page.locator(`.sh-card[data-sh-good="${id}"]`);
const tray = id => page.locator(`[data-sh-zone="${id}"]`).first();
const item = id => page.locator(`.sh-item[data-sh-good="${id}"]`);
const person = id => page.locator(`.sh-person[data-sh-zone="${id}"]`);
const button = name => page.getByRole('button', {name, exact: true});
const focusedClass = () => page.evaluate(() => document.activeElement?.className || '');
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Shares QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: a drag, a tap then a tray, arrow keys, a refused Fair, a solve.
  let P = 'shares-01';
  await open(P); await fit('trays');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Share the cards so nobody would swap.', 'one objective');
  assert.equal(await button('Fair').isDisabled(), true, 'Fair waits for every card');
  await drag(card('R1'), tray('B'));
  assert.equal((await board(P)).at.R1, 'B', 'a drag puts a card in a tray');
  await tap(card('R2'));
  assert.equal(await card('R2').getAttribute('aria-pressed'), 'true', 'a tap lifts a card');
  assert.equal(await card('R3').evaluate(e => e.tagName), 'SPAN', 'the other cards rest');
  await tap(tray('B'));
  assert.equal((await board(P)).at.R2, 'B', 'a tap on a tray puts the lifted card there');
  await card('R3').focus(); await page.keyboard.press('ArrowRight');
  assert.equal((await board(P)).at.R3, 'B', 'an arrow key sends a card to the right tray');
  assert.match(await focusedClass(), /sh-card/, 'focus stays on the card after a key move');
  await card('B1').focus(); await page.keyboard.press('ArrowLeft');
  await button('Fair').click();
  assert.equal(await page.locator('.sh-told').innerText(), 'A would swap.');
  assert.equal(await page.locator('.sh-view').count(), 2, 'A’s count under each tray');
  assert.match(await focusedClass(), /sh-card/, 'focus goes back to the board after Fair');
  await shot('refused');
  for (const id of ['R1', 'R2', 'R3']) await drag(card(id), tray('A'));
  await drag(card('B1'), tray('B'));
  assert.equal(await page.locator('.sh-told').count(), 0, 'a move clears the refusal');
  await button('Fair').click(); await done();

  // Puzzle 4: That's all refused, ways found, Found already, the catalog.
  P = 'shares-04';
  await open(P);
  await button('That’s all').click();
  assert.equal(await page.locator('.sh-told').innerText(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a new way');
  assert.doesNotMatch(await focusedClass(), /sh-all|sh-cant/, 'focus is not left on That’s all');
  const ways = [['A', 'A', 'A', 'B'], ['A', 'A', 'B', 'B'], ['A', 'B', 'A', 'B'], ['B', 'A', 'A', 'B']];
  const ids = ['R1', 'R2', 'R3', 'B1'];
  for (const [k, way] of ways.entries()) {
    for (const [i, owner] of way.entries()) if ((await board(P)).at[ids[i]] !== owner) await drag(card(ids[i]), tray(owner));
      await button('Fair').click();
    assert.equal((await board(P)).found.length, k + 1, `way ${k + 1} kept`);
    if (k === 0) {
      assert.equal(await page.locator('.sh-found li').count(), 1, 'a thumbnail');
      await drag(card('R1'), tray('B')); await drag(card('R1'), tray('A'));
      await button('Fair').click();
      assert.equal(await page.locator('.sh-told').innerText(), 'Found already.');
      await page.locator('[data-action="undo"]').click();
      assert.equal((await board(P)).found.length, 1, 'Undo keeps the way found');
    }
  }
  await shot('every');
  await button('That’s all').click(); await done();
  assert.equal(await page.locator('.sh-catalog td.fair').count(), 2, 'the catalog after That’s all');
  await shot('catalog');

  // Puzzle 2: Can't after an attempt, pairing by two taps, the cut, a solve.
  P = 'shares-02';
  await open(P); await fit('three reds');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for an attempt');
  await drag(card('R1'), tray('U')); await drag(card('R2'), tray('U')); await drag(card('R3'), tray('V'));
  await button('Can’t').click();
  assert.equal(await page.locator('.sh-puzzle .hinted').count(), 0, 'nothing marks the next tap');
  await tap(card('R1')); await tap(card('R2'));
  assert.equal(await page.locator('.sh-told').innerText(), 'One from each tray.', 'a pair from one tray is refused');
  assert.equal(await page.locator('.sh-card.picked, .sh-card.paired').count(), 0, 'and the taps clear');
  assert.equal((await board(P)).claim, null);
  await tap(card('R1')); await tap(card('R3'));
  const claim = (await board(P)).claim;
  assert.equal(claim.odd, 'R2', 'the card left over');
  assert.equal(await page.locator('.sh-told').innerText(), 'One left over.');
  await shot('pairing');
  await button('Cut').click();
  await tap(card('R2'));
  assert.deepEqual(Object.keys((await board(P)).at).sort(), ['R1', 'R2a', 'R2b', 'R3']);
  await drag(page.locator('.sh-card[data-sh-good="R2b"]'), tray('V'));
  await drag(card('R3'), tray('U'));
  await shot('halves');
  await drag(card('R3'), tray('V'));
  await button('Fair').click(); await done();

  // Puzzle 6: shapes by drag and tap, a swap, a refused group, Can't with Check.
  P = 'shares-06';
  await open(P); await fit('favourites');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Give everyone a favourite.');
  await drag(item('circle'), person('A'));
  assert.equal((await board(P)).at.circle, 'A', 'a drag gives a shape');
  await tap(item('triangle')); await tap(person('A'));
  const swap = await board(P);
  assert.equal(swap.at.triangle, 'A'); assert.equal(swap.at.circle, null, 'giving A another shape sends the circle back');
  await drag(item('circle'), person('C'));
  await button('Can’t').click();
  await tap(person('A')); await tap(person('D'));
  await button('Check').click();
  assert.equal(await page.locator('.sh-told').innerText(), '2 people, 4 shapes.', 'a group with enough shapes is refused');
  assert.match(await focusedClass(), /sh-item|sh-person/, 'focus goes back to the board after Check');
  await shot('refused-group');
  await button('Can’t').click();
  for (const x of ['A', 'B', 'C']) await tap(person(x));
  await button('Check').click(); await done();
  assert.equal(await page.locator('.sh-told').innerText(), '3 people, 2 shapes.');
  await shot('short-group');

  // Puzzle 3: everyone a favourite.
  P = 'shares-03';
  await open(P);
  for (const [s, x] of [['circle', 'B'], ['triangle', 'A'], ['square', 'C'], ['diamond', 'D']]) await drag(item(s), person(x));
  await done();

  // Puzzle 7: the knife by tap and by slide, a cut that isn't equal, the star, round two.
  P = 'shares-07';
  await open(P); await fit('strip');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'the board carries the duel’s goal');
  assert.equal(await page.locator('.sh-goal').innerText(), 'Cut so you get half, whichever piece B takes.');
  const strip = page.locator('.sh-strip');
  const at = async k => { const b = await strip.boundingBox(); return [b.x + b.width * k / 12, b.y + b.height / 2]; };
  { const [x, y] = await at(6.3); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); }
  await settle();
  assert.equal(await page.locator('.sh-gap[aria-pressed="true"]').getAttribute('aria-label'), 'Knife after 6 squares', 'a tap rests the knife on the nearest join');
  await button('Cut').click();
  assert.equal((await board(P)).r1.star, false);
  assert.equal(await page.locator('.sh-told').innerText(), 'Not equal for you.');
  assert.equal(await page.locator('.sh-worth').count(), 2, 'your count under each piece');
  await shot('unequal');
  // A slide: the knife follows and rests where the finger stops.
  const [x0, y0] = await at(1), [x1, y1] = await at(4.2);
  if (!phone) { await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move(x1, y1, {steps: 8}); await page.mouse.up(); }
  else {
    cdp ||= await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x0, y: y0}]});
    for (let s = 1; s <= 8; s++) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x0 + (x1 - x0) * s / 8, y: y0}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  }
  await settle();
  assert.equal(await page.locator('.sh-gap[aria-pressed="true"]').getAttribute('aria-label'), 'Knife after 4 squares', 'a slide moves the knife');
  await button('Cut').click();
  assert.equal((await board(P)).r1.star, true, 'an equal cut');
  assert.equal(await page.locator('.sh-star').count(), 1, 'a star');
  assert.equal(await page.locator('.sh-goal').innerText(), 'Take a piece.');
  await shot('round-two');
  await tap(page.locator('button.sh-piece').nth(1));
  assert.equal(await page.locator('.sh-told').innerText(), 'The other piece is more for you.');
  await tap(page.locator('button.sh-piece').nth(0)); await done();

  // Puzzle 10: keyboard on a join, then Cut.
  P = 'shares-10';
  await open(P); await fit('strip 10');
  await page.locator('.sh-gap').nth(3).focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.sh-gap[aria-pressed="true"]').getAttribute('aria-label'), 'Knife after 4 squares', 'Enter on a join places the knife');
  await button('Cut').click();
  assert.equal((await board(P)).r1.star, true);
  await shot('duel-10');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone}, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
