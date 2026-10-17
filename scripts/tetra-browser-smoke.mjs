// Plays Mirror twins through the real interface: turns by tapping corners
// (one with the turn animating, near a disc's edge), Enter on a corner, Undo;
// Can't with its traced arrows (not the same middle, other letters, a right
// claim, and a wrong one kept through Undo); one change by letter chips;
// changing an A on each; placing four letters; every pair with Found already,
// There is another and That's all; sorting with a refused That's all; the
// playground's Letters. Every puzzle is also solved through the interface by
// following its hints. Checks focus, page overflow and the board's size.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a 375 × 667 phone with
// touch); SHOTS_DIR moves the screenshots from test-results/tetra/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {mechanicFor} from '../dist/expansion.js';
import {tapsTo, labelsOf, turned} from '../dist/families/tetra/tetra.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone, reducedMotion: 'reduce'});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS_DIR ? `${process.env.SHOTS_DIR.replace(/\/$/, '')}/` : new URL('../test-results/tetra/', import.meta.url).pathname;
const tetra = JSON.parse(await readFile(new URL('../dist/families/tetra/tetra.json', import.meta.url), 'utf8'));
const byId = id => tetra.puzzles.find(p => p.id === id);
const shot = name => page.screenshot({path: `${out}${name}${phone ? '-phone' : ''}.png`, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="tetra"]').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const solvedNow = async () => await page.locator('#completion-heading').count() > 0;
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const told = () => page.locator('.tt-told').innerText();
const center = async locator => { const b = await locator.boundingBox(); assert.ok(b, 'a control on screen'); return [b.x + b.width / 2, b.y + b.height / 2]; };
// Taps go through real hit-testing at a point, as a finger would.
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); await tapAt(...await center(locator)); };
const corner = (side, k) => page.locator(`.tt-model.tt-${side} button.tt-corner.p${k}`);
const button = name => page.getByRole('button', {name, exact: true});
const undoButton = () => tap(page.locator('[data-action="undo"]'));
const pose = async id => (await board(id)).at.join('');
// Focus after a move is on a control of the board, never Can't, That's all or the page.
async function focusOnBoard(label) {
  if (phone) return;
  const where = await page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName} ${e.className}` : 'none'; });
  assert.match(where, /^BUTTON (tt-corner|tt-chip|tt-stack)/, `${label}: focus on the board (${where})`);
}
// A board that fits: at most about 430 px wide on a desktop, and on a phone
// the whole puzzle and its controls inside 667 px of height.
async function size(label) {
  const box = await page.locator('[data-mechanic-wire="tetra"]').boundingBox();
  for (const part of await page.locator('[data-mechanic-wire="tetra"] :is(.tt-pair,.tt-bench,.tt-cards)').all()) { const w = (await part.boundingBox()).width; if (!phone) assert.ok(w <= 440, `${label}: compact (${w} px)`); }
  if (phone) assert.ok(box.height <= 600, `${label}: fits a phone screen (${box.height} px)`);
  for (const b of await page.locator('[data-mechanic-wire="tetra"] button:visible').all()) {
    const r = await b.boundingBox();
    assert.ok(r.x >= 0 && r.x + r.width <= (phone ? 375 : 1024) + 1, `${label}: every control on screen`);
    assert.ok(r.width >= 34 && r.height >= 34, `${label}: controls big enough to tap (${r.width} × ${r.height})`);
  }
}
// One hint's move, made by tapping what a child would tap.
async function act(id, action) {
  const p = byId(id);
  if (action.type === 'turn' && p.parameters.mode === 'sort') {
    const card = page.locator(`.tt-stack:has([data-flip="${id}:card${action.card}"])`);
    if (!await card.evaluate(e => e.classList.contains('chosen'))) await tap(card);
    await tap(page.locator(`.tt-model.tt-bench button.tt-corner.p${action.at}`));
  } else if (action.type === 'turn') await tap(corner('right', action.at));
  else if (action.type === 'place') await tap(corner(action.side, action.at));
  else if (action.type === 'merge') { await tap(button(`Change ${action.drop}`)); await tap(button(`Change ${action.drop} to ${action.keep}`)); }
  else if (action.type === 'cant') { await tap(button('Can’t match')); for (const k of action.left) await tap(corner('left', k)); for (const k of action.right) await tap(corner('right', k)); }
  else if (action.type === 'all') await tap(button('That’s all'));
  else throw new Error(`no tap for ${JSON.stringify(action)}`);
}
async function solveByHints(id) {
  const p = byId(id), m = mechanicFor(p);
  for (let n = 0; n < 80 && !await solvedNow(); n++) {
    const h = m.hint(p, await board(id));
    if (h.type === 'deadend') { await undoButton(); continue; }
    await act(id, h.action);
  }
  await done();
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Tetra QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.family-ink-symbol', {hasText: '◬'}).count(), 1, 'the family’s symbol in the satchel');

  // Puzzle 1: turning, with the turn shown, Enter on a corner, Undo.
  const P1 = 'tetra-01';
  await open(P1); await fit('turn'); await size('turn');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no objective on the board');
  assert.equal(await page.locator('.tt-model.tt-left button').count(), 0, 'the other model is not a control');
  assert.equal(await page.locator('.tt-model.tt-right button.tt-corner').count(), 4, 'your four corners');
  await shot('turn-fresh');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await tap(corner('right', 1));
  const aboutTop = turned([0, 1, 2, 3], 1).join('');
  assert.equal(await pose(P1), aboutTop, 'a tap on the top corner turns round it');
  assert.equal(await page.locator('.tt-model.tt-right.tt-turning').count(), 1, 'the turn is shown');
  await page.waitForFunction(() => !document.querySelector('.tt-turning'), null, {timeout: 2000});
  await focusOnBoard('after a turn');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await undoButton();
  assert.equal(await pose(P1), '0123', 'Undo turns it back');
  // A tap near the top disc's lower edge, towards the middle, still turns round the top.
  const top = await corner('right', 1).boundingBox();
  await tapAt(top.x + top.width / 2, top.y + top.height * 0.88);
  assert.equal(await pose(P1), aboutTop, 'a tap at a disc’s edge hits that disc');
  await undoButton();
  await corner('right', 0).focus(); await page.keyboard.press('Enter');
  await done(); await fit('solved'); await shot('turn-solved');

  // Puzzle 3: Can't, refused for its form twice, then right.
  const P3 = 'tetra-03';
  await open(P3); await fit('twins');
  assert.equal(await button('Can’t match').isDisabled(), true, 'Can’t waits for a turn');
  await tap(corner('right', 0));
  assert.equal((await board(P3)).tried, true, 'a tap on the middle turns');
  await tap(button('Can’t match'));
  if (!phone) assert.equal(await page.evaluate(() => document.activeElement?.matches('.tt-left button.tt-corner.p1')), true, 'Can’t hands focus to the first corner to trace');
  assert.equal(await page.locator('.tt-model.tt-left button.tt-corner').count(), 3, 'the other model’s outer corners can be traced');
  assert.equal(await page.locator('.tt-corner.hinted').count(), 0, 'no tap is marked');
  await tap(corner('left', 1)); await tap(corner('left', 2));
  assert.equal(await page.locator('.tt-left .tt-arrow.drawing').count(), 1, 'an arrow from the first through the second');
  await tap(corner('right', 1)); await tap(corner('right', 2));
  assert.equal(await told(), 'Not the same letter in the middle.');
  await focusOnBoard('after a form refusal');
  await undoButton();
  assert.equal(await page.locator('.tt-told').count(), 0, 'Undo takes the message away');
  await undoButton();
  await tap(corner('right', 2));
  const R3 = labelsOf((await board(P3)).letters, (await board(P3)).at);
  assert.equal(R3[0], 'A', 'A in the middle of both');
  await tap(button('Can’t match'));
  // D then C on the other; on yours the wrong two.
  await tap(corner('left', 1)); await tap(corner('left', 2));
  const wrongTwo = [1, 2, 3].filter(k => R3[k] !== 'C').slice(0, 2);
  await tap(corner('right', wrongTwo[0])); await tap(corner('right', wrongTwo[1]));
  assert.equal(await told(), 'Follow the same letters on both.');
  await tap(button('Can’t match'));
  await tap(corner('left', 1)); await tap(corner('left', 2));
  await shot('cant-tracing');
  await tap(corner('right', R3.indexOf('D'))); await tap(corner('right', R3.indexOf('C')));
  await done();
  assert.equal(await page.locator('.tt-arrow.ok').count(), 2, 'both arrows drawn, opposite ways');
  await fit('cant solved'); await shot('cant-solved');

  // Puzzle 2: a wrong Can't, kept through Undo; then turning matches.
  const P2 = 'tetra-02';
  await open(P2);
  await tap(corner('right', 3));
  const R2 = labelsOf((await board(P2)).letters, (await board(P2)).at);
  await tap(button('Can’t match'));
  await tap(corner('left', 1)); await tap(corner('left', 2));
  await tap(corner('right', R2.indexOf('D'))); await tap(corner('right', R2.indexOf('C')));
  assert.equal(await told(), 'Same way round.');
  assert.equal(await page.locator('.tt-arrow.off').count(), 2, 'both arrows, the same way round');
  assert.equal(await button('Can’t match').isDisabled(), true, 'Can’t is off');
  await focusOnBoard('after a wrong claim');
  await shot('cant-refused');
  await undoButton();
  assert.equal(await page.locator('.tt-told').count(), 0, 'Undo changes the screen');
  assert.equal(await button('Can’t match').isDisabled(), true, 'and the claim stays');
  assert.equal((await board(P2)).claim.ok, false);
  const b2 = await board(P2);
  for (const k of tapsTo(byId(P2).parameters.left, labelsOf(b2.letters, b2.at))) await tap(corner('right', k));
  await done();

  // Puzzle 6: one change by the letter chips.
  const P6 = 'tetra-06';
  await open(P6); await fit('merge'); await size('merge');
  assert.equal(await page.locator('.puzzle-goal').innerText(), byId(P6).visibleObjective);
  await tap(button('Change D'));
  assert.equal(await page.locator('.tt-chip.lifted').count(), 1, 'the chip is lifted');
  await tap(button('Change D to C'));
  assert.deepEqual((await board(P6)).merged, ['D', 'C']);
  assert.equal(await page.locator('.tt-chip').count(), 0, 'one change only');
  await focusOnBoard('after a change');
  await tap(corner('right', 0));
  await done();

  // Puzzle 7: an A on each changed to D.
  const P7 = 'tetra-07';
  await open(P7); await fit('change');
  assert.equal(await page.locator('.tt-sticker').count(), 2, 'a D waits by each model');
  assert.equal(await page.locator('.tt-model.tt-right button.tt-corner').count(), 2, 'only your As can change');
  await tap(corner('left', 0)); await tap(corner('right', 2));
  assert.deepEqual((await board(P7)).placed, {left: 1, right: 1});
  await shot('change');
  await tap(corner('right', 1));
  await done();

  // Puzzle 9: four letters on blank corners, then Can't.
  const P9 = 'tetra-09';
  await open(P9); await fit('blank'); await size('blank');
  for (const k of [0, 1, 2, 3]) await tap(corner('right', k));
  assert.deepEqual((await board(P9)).letters, ['A', 'B', 'C', 'D']);
  assert.equal(await page.locator('.tt-sticker').count(), 0);
  await tap(corner('right', 0));
  const R9 = labelsOf((await board(P9)).letters, (await board(P9)).at);
  await tap(button('Can’t match'));
  await tap(corner('left', 1)); await tap(corner('left', 2));
  await tap(corner('right', R9.indexOf('D'))); await tap(corner('right', R9.indexOf('C')));
  await done();

  // Puzzle 8: every pair, with the shelf and That's all.
  const P8 = 'tetra-08';
  await open(P8); await fit('merges');
  assert.equal(await button('That’s all').isDisabled(), true, 'nothing on the shelf yet');
  await tap(button('Change C')); await tap(button('Change C to B'));
  assert.deepEqual((await board(P8)).found, ['BC'], 'B and C made the same match at once');
  assert.equal(await page.locator('.tt-found').count(), 1, 'on the shelf');
  await tap(button('Change B')); await tap(button('Change B to C'));
  assert.equal(await told(), 'Found already.');
  await tap(button('That’s all'));
  assert.equal(await told(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a new pair');
  await focusOnBoard('after a refused That’s all');
  await undoButton();
  assert.equal(await button('That’s all').isDisabled(), true, 'still after Undo');
  assert.equal(await page.locator('.tt-found').count(), 1, 'Undo keeps the shelf');
  await solveByHints(P8);
  await fit('merges solved'); await shot('merges-solved');

  // Puzzle 12: sorting eight models, That's all refused, then solved.
  const P12 = 'tetra-12';
  await open(P12); await fit('sort'); await size('sort');
  assert.equal(await page.locator('.tt-stack').count(), 8);
  await tap(page.locator('.tt-stack:has([data-flip="tetra-12:card3"])'));
  assert.equal(await page.locator('.tt-stack.chosen [data-flip="tetra-12:card3"]').count(), 1, 'a tap puts a model on the big board');
  const c3 = tapsTo(byId(P12).parameters.cards[0], byId(P12).parameters.cards[3]);
  for (const k of c3) await tap(page.locator(`.tt-model.tt-bench button.tt-corner.p${k}`));
  assert.equal(await page.locator('.tt-stack').count(), 7, 'two alike stack');
  await focusOnBoard('after a turn on the big board');
  await tap(button('That’s all'));
  assert.equal(await told(), 'Some can still match.');
  assert.equal(await button('That’s all').isDisabled(), true);
  await shot('sort-refused'); await size('sort refused');
  await solveByHints(P12);
  await fit('sort solved'); await shot('sort-solved');

  // Every other puzzle, solved through the interface by its hints.
  for (const p of tetra.puzzles.filter(p => p.band !== 'playground' && ![P1, P2, P3, P6, P7, P8, P9, P12].includes(p.id))) { await open(p.id); await fit(p.id); await size(p.id); await solveByHints(p.id); }

  // The playground: turn either model, change letters.
  const G = 'tetra-playground';
  await open(G); await fit('playground'); await size('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await tap(corner('left', 1));
  assert.equal((await board(G)).left.at.join(''), turned([0, 1, 2, 3], 1).join(''), 'the left model turns too');
  await tap(button('Letters'));
  assert.equal(await button('Letters').getAttribute('aria-pressed'), 'true');
  await tap(corner('right', 0));
  assert.equal(labelsOf((await board(G)).right.letters, (await board(G)).right.at)[0], 'B', 'a tap moves a corner on to the next letter');
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors, shots: out}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
