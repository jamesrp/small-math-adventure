// Plays Trios through the real interface: third tiles with the rule rows
// after a wrong tap, trios through a ringed tile with There is another and
// That's all, splits in trays, Can't with a tapped trio (nothing marks the
// tiles to tap; refused when it can be done, and kept through Undo, which
// takes back the tile before the claim too, and Restart; each wrong trio
// refused; drawn as dishes when right),
// dimmed cards that light their pair among the 27, colours and counts, the
// game against the app, and the playground's 9, 27 and 81. Taps go through
// real hit-testing at card corners and on the lines between tiles; keyboard
// focus after a move stays on the board. Same environment variables as the
// other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone with touch). Screenshots go in test-results/trios/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {third, trios, triosIn, splits, designs, opposite} from '../dist/families/trios/trios.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const pack = JSON.parse(await readFile(new URL('../dist/families/trios/trios.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const out = new URL('../test-results/trios/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.tr-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const card = id => page.locator(`.tr-card[data-focus="tr-card-${id}"]`);
const told = () => page.locator('.tr-told').innerText();
const button = name => page.getByRole('button', {name, exact: true});
// Taps at a point of a control through real hit-testing: its centre, or a
// point just inside a rounded corner, where a trio line passes under it or a
// neighbour is close.
const at = async (locator, where = 'centre') => {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  return where === 'corner' ? [b.x + 6, b.y + 6] : where === 'far' ? [b.x + b.width - 6, b.y + b.height - 6] : [b.x + b.width / 2, b.y + b.height / 2];
};
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async (locator, where) => tapAt(...await at(locator, where));
const taps = async (ids, where) => { for (const id of ids) await tap(card(id), where); };
const focusIsOnBoard = () => page.evaluate(() => { const el = document.activeElement; return Boolean(el?.closest('.tr-board, .tr-trays, .tr-decks')) || el?.id === 'completion-heading'; });
const focusName = () => page.evaluate(() => document.activeElement?.textContent?.trim() || document.activeElement?.className);
// Tiles: shape + 3 × fill.
const T = {CO: 0, TO: 1, SO: 2, CH: 3, TH: 4, SH: 5, CF: 6, TF: 7, SF: 8};
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Trios QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: a wrong tap shows the rule row by row; the right tap moves on.
  const P1 = byId('trios-01');
  await open(P1.id); await fit('third tile');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Tap the tile that makes a trio.');
  assert.equal(await page.locator('.tr-card.given').count(), 2, 'two ringed tiles');
  await tap(card(T.SF), 'corner');
  assert.equal((await board(P1.id)).miss, T.SF, 'a tap at a tile’s corner picks that tile');
  assert.equal(await page.locator('.tr-row.no').count(), 1, 'one ✗ row: shapes');
  assert.equal(await page.locator('.tr-row.ok').count(), 1, 'one ✓ row: fills');
  assert.equal(await page.locator('.tr-line.bad').count(), 1, 'the three are joined');
  await shot('third-wrong');
  // A tap in the ring's middle, on the line, does nothing.
  const ring = await page.locator('.tr-board').boundingBox();
  await tapAt(ring.x + ring.width / 2, ring.y + ring.height / 2);
  assert.equal((await board(P1.id)).miss, T.SF, 'the empty middle is not a target');
  for (const [x, y] of P1.parameters.pairs) await tap(card(third(2, x, y)), 'far');
  await done(); await fit('third tile solved');

  // Puzzle 2: trios through the ringed tile; That's all too soon; focus.
  const P2 = byId('trios-02'), c = P2.parameters.centre;
  await open(P2.id);
  await taps([T.CH, T.CF]);
  assert.deepEqual((await board(P2.id)).found, ['3.6'], 'a trio is kept');
  assert.equal(await page.locator('.tr-line.good').count(), 1, 'and drawn through the ringed tile');
  await taps([T.TO, T.TH]);
  assert.equal(await page.locator('.tr-card.missed').count(), 2, 'a pair that is not a trio is marked');
  await button('That’s all').focus(); await page.keyboard.press('Enter');
  assert.equal(await told(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a new trio');
  assert.ok(await focusIsOnBoard(), `focus after That’s all is on the board (${await focusName()})`);
  await taps([T.CF, T.CH]);
  assert.equal(await told(), 'Found already.');
  assert.equal(await page.locator('.tr-count, .tr-tally').count(), 0, 'no found-count');
  for (const k of ['1.2', '4.8', '5.7']) await taps(k.split('.').map(Number));
  assert.equal((await board(P2.id)).found.length, 4);
  await shot('through-four');
  await button('That’s all').click();
  await done();
  assert.equal(c, T.CO);

  // Puzzle 4: trays; a tray tile comes out; a split is kept; found already.
  const P4 = byId('trios-04');
  await open(P4.id); await fit('splits');
  await taps([T.CO, T.TO, T.CH]);
  assert.equal(await page.locator('.tr-tray.no').count(), 1, 'a full tray that is not a trio');
  await tap(page.locator(`[data-focus="tr-tray-${T.CH}"]`));
  assert.deepEqual((await board(P4.id)).trays, [[T.CO, T.TO], [], []], 'a tap on a tray tile takes it out');
  assert.ok(await focusIsOnBoard(), 'focus stays with the tiles and trays');
  await taps([T.SO, T.CH, T.TH, T.SH, T.CF, T.TF, T.SF]);
  assert.equal((await board(P4.id)).found.length, 1, 'the split by fill is kept');
  await taps([T.CH, T.TH, T.SH, T.CO, T.TO, T.SO, T.CF, T.TF, T.SF]);
  assert.equal(await told(), 'Found already.');
  await shot('split-kept');
  for (const s of splits()) await taps(s.flat());
  await button('That’s all').click();
  await done();

  // Puzzle 3: four can be done, so Can't is refused, through Undo and Restart.
  const P3 = byId('trios-03');
  await open(P3.id);
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a full try');
  await taps([T.CO, T.TO, T.SO, T.CH]);
  assert.equal(await page.locator('.tr-line.bad, .tr-card.in-bad').count(), 0, 'the trio is not shown');
  assert.equal(await told(), 'There is a trio.', 'but reported');
  await button('Can’t').click();
  assert.equal(await told(), 'Tap the trio.');
  await taps([T.CO, T.TO, T.SO]);
  assert.equal(await told(), 'There is a way.');
  assert.equal(await button('Can’t').isDisabled(), true);
  assert.ok(await focusIsOnBoard(), 'focus after the claim is on the board');
  // Undo of the claim keeps its refusal and leaves the same try, so one press
  // goes on to take back the tile before it.
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(P3.id)).chosen, [T.CO, T.TO, T.SO], 'Undo takes back the claim and the tile before it');
  assert.equal((await board(P3.id)).told, 'way', 'Undo keeps the refusal');
  assert.equal(await page.locator('.tr-told').count(), 0, 'the refusal is said once: its line goes');
  await taps([T.CH]);
  assert.equal(await button('Can’t').isDisabled(), true, 'the same try still can’t claim');
  assert.equal(await told(), 'There is a trio.', 'afterwards the usual note');
  await page.locator('[data-action="restart"]').click();
  assert.equal((await board(P3.id)).told, 'way', 'Restart keeps it too');
  assert.equal(await button('Can’t').isDisabled(), true);
  await taps([T.CO, T.TO, T.CH, T.TH]);
  await done();

  // Puzzle 5: five can't be done. Nothing marks the tiles to tap, any tile
  // can be tapped, each wrong claim is refused and clears the taps, and the
  // right trio solves.
  const P5 = byId('trios-05');
  await open(P5.id); await fit('five');
  await page.locator('[data-action="hint"]').click();
  assert.doesNotMatch(await page.locator('.hint-card').innerText(), /Can’t/, 'the first hint is not Can’t');
  await taps([T.CO, T.TO, T.CH, T.TH, T.SF]);
  assert.doesNotMatch(await page.locator('.hint-card').innerText(), /Press Can’t/, 'the level-1 hint after a try gives the reason, not Press Can’t');
  const trio = triosIn(2, [T.CO, T.TO, T.CH, T.TH, T.SF])[0];
  await button('Can’t').click();
  assert.equal(await page.locator('.tr-card.claimable, .tr-card.hinted, .tr-card.claim-picked, .tr-card.in-bad, .tr-line').count(), 0, 'nothing marks the tiles to tap');
  assert.equal(await page.locator('button.tr-card').count(), 9, 'every tile can be tapped');
  await taps([T.CO, T.TO, T.SO]);
  assert.equal(await told(), 'Not a trio in your five.', 'a trio that is not among the five is refused');
  assert.equal(await page.locator('.tr-card.claim-picked').count(), 0, 'the refusal clears the taps');
  assert.equal(await button('Can’t').getAttribute('aria-pressed'), 'false');
  assert.ok(await focusIsOnBoard(), 'focus after a wrong claim is on the board, not Can’t');
  await button('Can’t').click();
  await taps([T.CO, T.TO, T.CH]);
  assert.equal(await told(), 'Not a trio.', 'a second wrong claim is refused the same way');
  assert.equal(await page.locator('.tr-card.claim-picked').count(), 0);
  await shot('five-not');
  // Undo leaves Can't mode and its picks.
  await button('Can’t').click();
  await taps([T.CO]);
  assert.equal(await page.locator('.tr-card.claim-picked').count(), 1);
  await page.locator('[data-action="undo"]').click();
  assert.equal(await page.locator('.tr-card.claim-picked').count(), 0, 'Undo clears the picks');
  assert.equal(await button('Can’t').getAttribute('aria-pressed'), 'false', 'and Can’t mode');
  await button('Can’t').click();
  await taps(trio, 'corner');
  await done(); await fit('five solved');
  assert.equal(await page.locator('.tr-dish').count(), 5, 'four dishes and the pairs inside');
  await shot('five-dishes');

  // Puzzle 9: 27 cards; a dimmed card lights its pair; keys choose.
  const P9 = byId('trios-09');
  await open(P9.id); await fit('nine');
  await taps([0, 1]);
  const blocked = third(3, 0, 1);
  assert.match(await card(blocked).getAttribute('class'), /\bdim\b/);
  await tap(card(blocked), 'corner');
  assert.equal(await page.locator('.tr-card.pair-lit').count(), 2, 'the two chosen cards that rule it out');
  assert.equal(await page.locator('.tr-strip').count(), 1, 'with the rule rows');
  assert.deepEqual((await board(P9.id)).chosen, [0, 1], 'a dimmed card is not chosen');
  await card(13).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P9.id)).chosen, [0, 1, 13], 'Enter on a card chooses it');
  assert.ok(await focusIsOnBoard(), 'focus stays on the cards');
  // A tap responds quickly: the card's state changes within a frame or two.
  const t0 = Date.now(); await tap(card(13)); await page.locator(`.tr-card[data-focus="tr-card-13"]:not(.chosen)`).waitFor(); const ms = Date.now() - t0;
  assert.ok(ms < 1000, `a tap answers in ${ms} ms`);
  await shot('nine-why');
  const nine = P9.solution.witness;
  for (const i of (await board(P9.id)).chosen.filter(i => !nine.includes(i))) await tap(card(i));
  for (const i of nine) if (!(await board(P9.id)).chosen.includes(i)) await tap(card(i));
  await done();

  // Puzzle 10: stuck at eight: every other card is dimmed.
  const P10 = byId('trios-10');
  await open(P10.id); await fit('stuck');
  assert.equal(await page.locator('.tr-card.dim').count(), 19, 'nineteen dimmed cards');
  await shot('stuck-eight');

  // Puzzle 7: two colours, Can't with a one-colour trio, the colours lined up.
  const P7 = byId('trios-07');
  await open(P7.id);
  const two = [0, 0, 1, 0, 0, 1, 1, 1, 0];
  for (let t = 0; t < 9; t++) for (let k = 0; k <= two[t]; k++) await tap(card(t));
  assert.deepEqual((await board(P7.id)).paint, two);
  assert.equal(await told(), 'A trio is all one colour.');
  assert.equal(await page.locator('.tr-line, .tr-card.in-bad').count(), 0, 'reported, not shown');
  const yellow = trios(2).find(t => t.every(i => two[i] === 0));
  await button('Can’t').click();
  await taps(yellow);
  await done();
  assert.equal(await page.locator('.tr-class').count(), 2);
  await shot('two-colours');

  // Puzzle 11: counts change by taps; a design solves.
  const P11 = byId('trios-11');
  await open(P11.id); await fit('counts');
  assert.match(await card(0).getAttribute('aria-label'), /^One open circle/);
  const design = designs(3, 'card')[0];
  for (let t = 0; t < 9; t++) for (let k = 0; k < design[t]; k++) await tap(card(t));
  await done();
  await shot('counts');

  // Puzzle 12: the game; the app answers at once; a losing turn says nothing until asked.
  const P12 = byId('trios-12');
  await open(P12.id); await fit('game');
  await tap(card(T.TH));
  let turns = (await board(P12.id)).turns;
  assert.equal(turns.length, 2, 'the app answers');
  assert.equal(await page.locator('.tr-card.theirs').count(), 1);
  assert.equal(await page.locator('.feedback').innerText(), '', 'no message after a turn');
  // Answer with the opposite until they own a trio.
  while (!(await page.locator('#completion-heading').count())) {
    turns = (await board(P12.id)).turns;
    await tap(card(opposite(turns[0], turns.at(-1))));
  }
  await done(); await shot('game-won');

  // The playground: decks, a dimmed card, Clear, no Hint.
  const G = 'trios-playground';
  await open(G); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await taps([0, 1]);
  await tap(card(2), 'corner');
  assert.equal(await page.locator('.tr-card.pair-lit').count(), 2);
  await button('81').click();
  assert.deepEqual(await board(G), {deck: 4, chosen: []});
  await fit('81 cards');
  await taps([0, 1, 3]);
  await tap(card(third(4, 0, 1)), 'far');
  assert.equal(await page.locator('.tr-card.pair-lit').count(), 2, 'a tap at the far corner of a dense grid card hits it');
  await shot('playground-81');
  await button('Clear').click();
  assert.deepEqual((await board(G)).chosen, []);
  await button('27').click();
  assert.equal((await board(G)).deck, 3);
  assert.ok(await focusIsOnBoard(), 'focus stays on the deck buttons');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
