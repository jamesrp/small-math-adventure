// Plays Nesting cards through the real interface: taps that choose, refuse
// with a line to the chosen card and put back, taps at the gap between two
// cards and on a card a line crosses, pinned cards, extend decks done and
// stuck, drags into rows (onto a card in a row, at the edges where two rows
// meet, and back to the cards) with no tap after a drag, number keys, a rows
// solve, the find-every puzzle with Found already, There is another and
// That's all (and where focus goes), the five-picture deck at phone width, and
// the playground. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// with touch). Screenshots go in test-results/nests/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/nests/', import.meta.url);
const pack = JSON.parse(await readFile(new URL('../dist/families/nests/nests.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.ns-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// Cards by their pictures as letters ('0' is the empty card).
const index = (id, d, s) => (byId(id).parameters.decks?.[d] ?? byId(id).parameters.choices[d]).cards.indexOf(s === '0' ? '' : s);
const card = (id, d, s) => page.locator(`.ns-puzzle .ns-card[data-deck="${d}"][data-card="${index(id, d, s)}"]`);
const names = (id, d, list) => list.map(i => (byId(id).parameters.decks[d].cards[i] || '0')).sort().join(' ');
const box = locator => locator.boundingBox();
const center = async locator => { const b = await box(locator); return [b.x + b.width / 2, b.y + b.height / 2]; };
// Taps land through real hit-testing at a point, as a finger or mouse would.
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); await tapAt(...await center(locator)); };
const taps = async (id, d, list) => { for (const s of list.split(' ')) await tap(card(id, d, s)); };
let cdp = null;
// A drag is a mouse drag on a desktop and a touch drag on a phone.
// The target is a function giving the drop point, measured after any scroll.
async function dragTo(from, to) {
  await from.scrollIntoViewIfNeeded();
  const [x1, y1] = await center(from), [x2, y2] = await to();
  if (!phone) {
    await page.mouse.move(x1, y1); await page.mouse.down();
    await page.mouse.move(x2, y2, {steps: 12});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', x1, y1);
  for (let s = 1; s <= 12; s++) await touch('touchMove', x1 + (x2 - x1) * s / 12, y1 + (y2 - y1) * s / 12);
  await touch('touchEnd', x2, y2);
}
const row = r => page.locator(`.ns-puzzle .ns-row[data-row="${r}"]`);
const focusKey = () => page.evaluate(() => document.activeElement?.dataset?.focus || document.activeElement?.id || document.activeElement?.className || '');
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Nests QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 2: choose, refuse with a line, put back, contested points, reach.
  const R = 'nests-02';
  await open(R); await fit('eight cards');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no objective: the circles show the goal');
  assert.equal(await page.locator('.ns-pips i').count(), 3);
  await taps(R, 0, 'A');
  assert.equal(await card(R, 0, 'A').getAttribute('aria-pressed'), 'true');
  await taps(R, 0, 'AC');
  assert.deepEqual((await board(R)).decks[0], {chosen: [index(R, 0, 'A')], out: [index(R, 0, 'AC')]}, 'refused and marked');
  assert.equal(await page.locator('.ns-links .ns-link.try').count(), 1, 'a line to the circle');
  assert.match(await card(R, 0, 'A').getAttribute('class'), /blocker/);
  // Two cards side by side: a point just outside one card, in the gap, goes to the nearer card.
  const [b0, b1] = [await box(card(R, 0, '0')), await box(card(R, 0, 'B'))];
  assert.ok(Math.abs(b0.y - b1.y) < 1 && b1.x > b0.x, 'the empty card and the triangle sit side by side');
  await tapAt(b0.x + b0.width + 3, b0.y + b0.height / 2);
  assert.deepEqual((await board(R)).decks[0].out, [index(R, 0, 'AC'), index(R, 0, '0')].sort((x, y) => x - y), 'the gap next to the empty card is the empty card’s');
  await tapAt(b1.x - 3, b1.y + b1.height / 2);
  assert.ok((await board(R)).decks[0].chosen.includes(index(R, 0, 'B')), 'the gap next to the triangle is the triangle’s');
  await tapAt(b1.x + 2, b1.y + 2);
  assert.ok(!(await board(R)).decks[0].chosen.includes(index(R, 0, 'B')), 'a corner of the triangle card puts it back');
  await taps(R, 0, 'B AB');
  assert.equal(await page.locator('.ns-links .ns-link.try').count(), 2, 'lines to both chosen cards it holds');
  // A line from the circle-and-triangle card to the circle runs over the triangle-and-square card; a tap there is that card's.
  const [lx, ly] = await center(card(R, 0, 'BC'));
  assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.ns-card')?.dataset.card, [lx, ly]), String(index(R, 0, 'BC')), 'the card under the line is hit');
  await tapAt(lx, ly);
  assert.ok((await board(R)).decks[0].out.includes(index(R, 0, 'BC')), 'the triangle-and-square card is tried and nests with the triangle');
  await shot('refused');
  await taps(R, 0, 'A');
  assert.equal(names(R, 0, (await board(R)).decks[0].chosen), 'B');
  await card(R, 0, 'A').focus(); await page.keyboard.press('Enter');
  assert.equal(await focusKey(), `ns-card-0-${index(R, 0, 'A')}`, 'focus stays on the card');
  await taps(R, 0, 'C');
  await done(); await fit('reach solved');

  // Puzzle 4: pinned cards, a deck done with its lines, stuck, solved.
  const X = 'nests-04';
  await open(X); await fit('three decks');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Add as many cards as you can.');
  await tap(card(X, 0, 'ABC'));
  assert.deepEqual((await board(X)).decks[0].chosen, [index(X, 0, 'ABC')], 'a pinned card stays');
  await taps(X, 0, 'AC 0 B A BC AB C');
  assert.equal(await page.locator('.ns-deck[data-deck="0"].done').count(), 1);
  assert.ok(await page.locator('.ns-links .ns-link.proof').count() >= 6, 'every refused card’s line');
  await taps(X, 1, 'AC 0 B ABC AB C');
  await taps(X, 2, 'C AC BC ABC 0 A B');
  assert.equal(await page.locator('.ns-deck[data-deck="2"] .ns-told').innerText(), 'Another way fits more cards.');
  await shot('stuck');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await page.locator('.ns-deck[data-deck="2"] .ns-told').innerText(), 'Another way fits more cards.', 'Undo takes back the tap, not the answer');
  assert.deepEqual((await board(X)).stuck, [2]);
  await taps(X, 2, 'C');
  assert.equal(await page.locator('.ns-deck[data-deck="2"] .ns-told').count(), 0, 'putting back a chosen card clears it');
  await taps(X, 2, 'AC BC C B');
  await done(); await fit('extend solved');
  await shot('extend-solved');

  // Puzzle 3: drags into rows, a break, the edges where rows meet, back to the cards, keys, a solve.
  const B = 'nests-03';
  await open(B); await fit('rows of four');
  assert.equal(await page.locator('.ns-row.new').count(), 1, 'a dashed row to start');
  await taps(B, 0, 'A B');
  await dragTo(card(B, 0, '0'), () => center(row(0)));
  assert.deepEqual((await board(B)).rows, [[index(B, 0, '0')]], 'dropped on the dashed row: a new row');
  assert.deepEqual((await board(B)).decks[0].chosen.length, 2, 'a drag is not a tap');
  await dragTo(card(B, 0, 'AB'), () => center(card(B, 0, '0')));
  assert.deepEqual((await board(B)).rows, [[index(B, 0, '0'), index(B, 0, 'AB')]], 'dropped on a card in a row: that row');
  // Just inside the bottom edge of row 1 and just inside the top edge of the new row below it.
  const r0 = await box(row(0)), r1 = await box(row(1));
  assert.ok(r1.y - (r0.y + r0.height) < 10, 'the rows nearly touch');
  await dragTo(card(B, 0, 'A'), async () => { const r = await box(row(0)); return [r.x + r.width - 12, r.y + r.height - 3]; });
  assert.deepEqual((await board(B)).rows, [[index(B, 0, '0'), index(B, 0, 'A'), index(B, 0, 'AB')]], 'the bottom edge of row 1 is row 1, and the row sorts itself');
  await dragTo(card(B, 0, 'B'), async () => { const r = await box(row(1)); return [r.x + r.width - 12, r.y + 3]; });
  assert.deepEqual((await board(B)).rows, [[index(B, 0, '0'), index(B, 0, 'A'), index(B, 0, 'AB')], [index(B, 0, 'B')]], 'the top edge of the dashed row starts row 2');
  await done();
  await shot('rows-solved');
  await page.locator('[data-action="replay"]').click();
  await page.locator('.ns-puzzle').waitFor();
  assert.deepEqual((await board(B)).rows, [], 'Replay starts again');
  await taps(B, 0, 'A B');
  await card(B, 0, 'B').focus(); await page.keyboard.press('1');
  assert.deepEqual((await board(B)).rows, [[index(B, 0, 'B')]], 'a number key puts the card in that row');
  assert.equal(await focusKey(), `ns-card-0-${index(B, 0, 'B')}`, 'focus follows the card into the row');
  await card(B, 0, 'AB').focus(); await page.keyboard.press('1');
  await card(B, 0, 'A').focus(); await page.keyboard.press('1');
  assert.equal(await page.locator('.ns-row.many.broken .ns-break').count(), 1, 'a bar between the two one-picture cards');
  await shot('rows-break');
  await card(B, 0, 'A').focus(); await page.keyboard.press('0');
  assert.deepEqual((await board(B)).rows, [[index(B, 0, 'B'), index(B, 0, 'AB')]], '0 takes it out');
  await dragTo(card(B, 0, 'AB'), () => center(page.locator('.ns-tray.drop')));
  assert.deepEqual((await board(B)).rows, [[index(B, 0, 'B')]], 'dragged back to the cards');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(B)).rows, [[index(B, 0, 'B'), index(B, 0, 'AB')]], 'Undo puts it back in the row');

  // Puzzle 5: find every, Found already, There is another, That's all; focus never on That's all.
  const E = 'nests-05';
  await open(E); await fit('find every');
  await taps(E, 0, 'A B C');
  assert.equal(await page.locator('.ns-found-set').count(), 1, 'kept below');
  assert.equal(await page.locator('.ns-card.chosen').count(), 0, 'the cards go back');
  await taps(E, 0, 'C A B');
  assert.equal(await page.locator('.ns-puzzle > .ns-told').innerText(), 'Found already.');
  await page.getByRole('button', {name: 'That’s all', exact: true}).click();
  assert.equal(await page.locator('.ns-puzzle > .ns-told').innerText(), 'There is another.');
  assert.equal(await page.getByRole('button', {name: 'That’s all', exact: true}).isDisabled(), true);
  assert.notEqual(await focusKey(), 'ns-all', 'focus leaves That’s all');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(E)).told, {kind: 'more'}, 'Undo keeps the answer');
  await taps(E, 0, 'AB');
  assert.notEqual(await focusKey(), 'ns-all');
  await taps(E, 0, 'AC BC');
  assert.equal((await board(E)).found.length, 2);
  assert.equal(await page.getByRole('button', {name: 'That’s all', exact: true}).isDisabled(), false);
  await shot('every-two');
  await page.getByRole('button', {name: 'That’s all', exact: true}).click();
  await done();

  // Puzzle 10 and 12: the sixteen-card rows and the five-picture deck fit a phone.
  for (const id of ['nests-10', 'nests-12']) {
    await open(id); await fit(id);
    const size = await box(page.locator('.ns-card').first());
    assert.ok(size.width >= 40, `${id}: cards ${size.width.toFixed(0)} px wide`);
  }
  await open('nests-10');
  await taps('nests-10', 0, 'AB');
  await dragTo(card('nests-10', 0, 'AB'), () => center(row(0)));
  await dragTo(card('nests-10', 0, 'A'), () => center(row(0)));
  assert.deepEqual((await board('nests-10')).rows, [[index('nests-10', 0, 'A'), index('nests-10', 0, 'AB')]]);
  assert.equal(await page.locator('.ns-row.one').count(), 1, 'a filled mark');
  await fit('sixteen in rows');
  await shot('sixteen-rows');

  // The playground: decks, no Hint.
  const G = 'nests-playground';
  await open(G); await fit('playground');
  assert.equal(await page.getByRole('button', {name: 'Hint', exact: true}).count(), 0, 'no Hint');
  await page.getByRole('button', {name: '16 cards', exact: true}).click();
  assert.equal(await page.locator('.ns-card').count(), 16);
  assert.equal((await board(G)).pick, 2);
  const ab = page.locator(`.ns-puzzle .ns-card[data-deck="0"][data-card="${index(G, 2, 'AB')}"]`);
  await tap(ab);
  assert.deepEqual((await board(G)).decks[0].chosen, [index(G, 2, 'AB')]);
  await dragTo(ab, () => center(row(0)));
  assert.deepEqual((await board(G)).rows, [[index(G, 2, 'AB')]]);
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
