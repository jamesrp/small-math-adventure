// Plays Pebble Duel's Star race and Every start through the real interface:
// choosing who starts, tapping reachable squares (and their edges), a refused
// tap on a square the token cannot reach, a lost game, Same start again and
// its practice win, the hint's rings on lost starts, three wins from new
// starts on the rook and queen boards; marking squares on the 11-by-11 queen
// board with That's all, There is another and its lock, a practice game from a
// tapped square, and a wrong That's all played out at once and clearing the
// marks; the pile builder, Keep, a second Keep, a practice game with lifted
// pebbles, and a wrong That's all played out and clearing the shelf; focus
// after each kind of move; the move controls in view without scrolling; and
// fit at phone and tablet sizes. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/rookrace/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {squareWins, raceSolve, keyOf} from '../dist/families/rookrace/rookrace.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
let page = await context.newPage();
const errors = [], listen = pg => { pg.on('pageerror', e => errors.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
listen(page);
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const pack = JSON.parse(await readFile(new URL('../dist/families/rookrace/rookrace.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const out = new URL('../test-results/rookrace/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] [data-mechanic-wire]`).waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const cell = (x, y) => page.locator(`[data-mechanic-wire] .rr-cell[data-x="${x}"][data-y="${y}"]`);
const press = name => page.getByRole('button', {name, exact: true});
// Taps go through real hit-testing at a point of the control (its centre by
// default), by touch on a phone and by mouse otherwise.
const tapAt = async (locator, fx = .5, fy = .5) => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); const x = b.x + b.width * fx, y = b.y + b.height * fy; if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(40); };
const tap = locator => tapAt(locator);
const focused = () => page.evaluate(() => { const e = document.activeElement; return {tag: e?.tagName, id: e?.id || '', cls: e?.className || '', focus: e?.dataset?.focus || ''}; });
const onBoard = f => /rr-cell|rr-button|primary/.test(f.cls) || f.focus === 'rr-status' || f.id === 'completion-heading';
// The move controls are in view without scrolling, from the top of the page.
const inView = async (locator, label) => { await page.evaluate(() => scrollTo(0, 0)); const b = await locator.first().boundingBox(); const h = await page.evaluate(() => innerHeight); assert.ok(b && b.y >= 0 && b.y + b.height <= h, `${label}: the control is in view (${b && Math.round(b.y + b.height)} of ${h})`); };
const message = () => page.locator('.feedback').innerText();
const checks = [];

// Win one race game from the current state with the solver's choices, by tapping.
async function winGame(p, label) {
  let b = await board(p.id);
  if (b.first === null) {
    const first = squareWins(p.parameters, b.at) ? 'you' : 'opponent';
    await tap(page.locator(`[data-focus="rr-choose-${first}"]`));
    const f = await focused();
    assert.ok(onBoard(f), `${label}: focus lands on the board after choosing (${JSON.stringify(f)})`);
  }
  for (let i = 0; i < 30; i++) {
    b = await board(p.id);
    if (b.at[0] === 0 && b.at[1] === 0) break;
    const [x, y] = raceSolve(p, b).to;
    await tapAt(cell(x, y), i % 2 ? .12 : .5, i % 2 ? .88 : .5);
    const f = await focused();
    assert.ok(onBoard(f), `${label}: focus stays on the board or the next control (${JSON.stringify(f)})`);
  }
  b = await board(p.id);
  assert.equal(b.turns.at(-1).player, 'you', `${label}: the child reached the star`);
}
// New starts and wins until the streak is full.
async function finishStreak(p, label) {
  for (let game = 0; game < 4 && !await page.locator('#completion-heading').count(); game++) {
    if ((await board(p.id)).first !== null) await tap(press('New start'));
    await winGame(p, `${label} ${game + 1}`);
  }
  await done();
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Rook QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').waitFor();

  // Star race on the 8-by-8 rook board.
  let p = byId('rookrace-03');
  await open(p.id); await fit('rook race, fresh');
  const width = (await page.locator('.rr-board').boundingBox()).width;
  assert.ok(width <= 384, `the board is compact (${width}px)`);
  await page.locator('[data-action="demo"]').first().click();
  assert.match(await page.locator('dialog').innerText(), /A turn slides the token straight left or straight down/);
  await press('Done').click();
  // Choose the wrong side on purpose: perfect play then wins. On the child's
  // turn, a square the token cannot reach is refused and nothing moves.
  let b = await board(p.id);
  await tap(page.locator(`[data-focus="rr-choose-${squareWins(p.parameters, b.at) ? 'opponent' : 'you'}"]`));
  b = await board(p.id);
  if (b.at[0] && b.at[1]) {
    await tap(cell(b.at[0] - 1, b.at[1] - 1));
    assert.match(await message(), /not allowed/, 'a diagonal is refused on the rook board');
    assert.deepEqual((await board(p.id)).turns, b.turns, 'nothing moved');
    checks.push('rook: a diagonal tap is refused');
  }
  for (let i = 0; i < 30; i++) { b = await board(p.id); if (b.at[0] === 0 && b.at[1] === 0) break; await tap(cell(...raceSolve(p, b).to)); }
  assert.equal((await board(p.id)).turns.at(-1).player, 'opponent', 'the wrong side loses');
  assert.match(await page.locator('.rr-status').innerText(), /reached the star/);
  await tap(press('Same start again'));
  await winGame(p, 'practice');
  assert.match(await page.locator('.rr-status').innerText(), /Wins count from a new start/);
  assert.equal((await board(p.id)).streak, 0, 'a practice win does not count');
  checks.push('rook: a lost game, then a practice win that does not count');
  if ((await board(p.id)).first !== null) await tap(press('New start'));
  await winGame(p, 'rook game');
  await shot('rook-won'); await fit('rook race, after a win');
  await finishStreak(p, 'rook game'); checks.push('rook: three wins from new starts');

  // Star race on the 8-by-8 queen board: a lost game, the hint's ring, then three wins.
  p = byId('rookrace-05');
  await open(p.id);
  await inView(press('Me first'), 'queen race, fresh'); await inView(press('You first'), 'queen race, fresh');
  // Lose (going second) from first-player starts until a second-player start comes up.
  for (let i = 0; i < 12; i++) {
    b = await board(p.id);
    if (!squareWins(p.parameters, b.at)) break;
    await tap(press('You first'));
    for (let t = 0; t < 30; t++) { if (!await page.locator('.rr-cell.target').count()) break; await tap(page.locator('.rr-cell.target').first()); }
    await tap(press('New start'));
  }
  b = await board(p.id);
  const lostStart = b.start;
  await tap(press('Me first'));
  for (let i = 0; i < 30; i++) { b = await board(p.id); if (b.at[0] === 0 && b.at[1] === 0) break; await tap(page.locator('.rr-cell.target').first()); }
  assert.equal((await board(p.id)).turns.at(-1).player, 'opponent', 'going first from a second-player square loses');
  assert.equal((await board(p.id)).streak, 0);
  await inView(press('Same start again'), 'queen race, lost'); await inView(press('New start'), 'queen race, lost');
  checks.push('the move controls are in view on the busiest boards');
  await tap(press('New start'));
  if ((await board(p.id)).first === null) await tap(press('Me first'));
  await press('Hint').click(); await press('Hint').click();
  assert.equal(await cell(...lostStart).evaluate(e => e.classList.contains('lost')), true, 'the second hint rings the lost start');
  await shot('queen-hint'); await fit('queen race with hint rings');
  checks.push('queen: a wrong choice loses, and the hint rings it');
  b = await board(p.id);
  if (!(b.at[0] === 0 && b.at[1] === 0)) for (let i = 0; i < 30; i++) { b = await board(p.id); if (b.at[0] === 0 && b.at[1] === 0) break; await tap(cell(...raceSolve(p, b).to)); }
  await finishStreak(p, 'queen game'); checks.push('queen: three wins from new starts');

  // Every start on the 11-by-11 queen board.
  p = byId('everystart-06');
  const q = p.parameters, answers = p.solution.secondSquares;
  // (Its controls in view are checked below with a short name: Rook QA puts
  // the top bar on two lines, and then the 11-by-11 board is a short scroll.)
  await open(p.id); await fit('queen marks, fresh');
  // Mark a wrong square and three right ones, tapping near the edges where squares meet.
  await tapAt(cell(5, 2), .9, .1);
  for (const [i, [x, y]] of answers.slice(0, 3).entries()) await tapAt(cell(x, y), [.08, .92, .5][i], [.92, .08, .5][i]);
  assert.deepEqual((await board(p.id)).marked.length, 4, 'taps at a square’s edge mark that square');
  let f = await focused();
  assert.match(f.focus, /^rr-cell-/, 'focus stays on the marked square');
  // With squares missing, That's all says only "There is another.", wrong mark or not.
  await tap(press('That’s all'));
  assert.deepEqual((await board(p.id)).refused, {more: true});
  assert.match(await page.locator('.es-note').innerText(), /^There is another\.$/);
  assert.equal(await press('That’s all').isDisabled(), true, 'That’s all waits for a change');
  assert.doesNotMatch(await page.locator('[data-mechanic-wire]').innerText(), /\d+ (more|left)/, 'no count');
  // A practice game: Play, tap the square to start from, You first.
  await tap(press('Play'));
  assert.match(await page.locator('.es-status').innerText(), /Tap a square to start from\./);
  f = await focused(); assert.match(f.focus, /^rr-cell-/, `focus on a square to start from (${JSON.stringify(f)})`);
  await tap(cell(6, 1));
  await tap(press('You first'));
  assert.match(await page.locator('.es-status').innerText(), /I moved .*\. Your turn/);
  for (let i = 0; i < 30; i++) { if (!await page.locator('.rr-cell.target').count()) break; await tap(page.locator('.rr-cell.target').last()); }
  await tap(press('Back'));
  assert.equal((await board(p.id)).marked.length, 4, 'practice leaves the marks');
  checks.push('queen marks: There is another, its lock, a practice game from a tapped square');
  // Every answer marked, and the wrong one too: That's all plays it out at once, I win, and the marks are cleared.
  for (const [x, y] of answers.slice(3)) await tap(cell(x, y));
  await tap(press('That’s all'));
  assert.equal((await board(p.id)).play.kind, 'out');
  assert.match(await page.locator('.es-label').innerText(), /^Whoever starts from the ringed square can win\. I go first\.$/);
  assert.equal(await press('Back').count(), 0, 'the play-out cannot be left');
  assert.equal(await cell(5, 2).evaluate(e => e.classList.contains('flag')), true, 'the wrong square is ringed');
  await shot('queen-playout'); await fit('queen play-out');
  for (let i = 0; i < 30; i++) { if (!await page.locator('.rr-cell.target').count()) break; await tap(page.locator('.rr-cell.target').last()); }
  assert.match(await page.locator('.es-status').innerText(), /^I reached the star\. The marks are cleared\.$/, 'the app wins the play-out');
  assert.deepEqual((await board(p.id)).marked, [], 'and the marks are cleared');
  await tap(press('Back'));
  for (const [x, y] of answers) await tap(cell(x, y));
  await tap(press('That’s all'));
  await done(); checks.push('queen marks: a wrong That’s all is played out and clears the marks; solve');

  // Every start with piles of 1 to 7.
  p = byId('everystart-05');
  await open(p.id); await fit('piles, fresh');
  const setStart = async start => { for (const [i, n] of start.split(',').entries()) await tap(page.locator(`[data-focus="es-slot-${i}-${n}"]`)); };
  await setStart('3,2,1');
  f = await focused(); assert.equal(f.focus, 'es-slot-2-1', 'focus stays on the slot');
  await tap(press('Keep')); await tap(press('Keep'));
  assert.match(await page.locator('.es-note').innerText(), /Already on the shelf\./);
  assert.deepEqual((await board(p.id)).shelf, ['1,2,3']);
  await setStart('2,2,5'); await tap(press('Keep'));
  // A practice game from the start being built: lift two pebbles from the right pile, Take.
  await tap(press('Play'));
  await tap(press('Me first'));
  const right = page.locator('.es-bowl').nth(2).locator('button.es-pebble');
  await tap(right.nth(3));
  await tap(press('Take 2'));
  assert.match(await page.locator('.es-status').innerText(), /I took \d+ from the (left|middle|right) pile\./);
  f = await focused(); assert.ok(/es-pebble|primary/.test(f.cls) || f.focus === 'es-status', `focus after a take (${JSON.stringify(f)})`);
  await shot('piles-practice'); await fit('piles practice');
  await tap(press('Back'));
  await tap(press('That’s all'));
  assert.deepEqual((await board(p.id)).refused, {more: true});
  // Keep every answer as well: That's all plays 2, 2 and 5 out, and then the shelf is cleared.
  for (const start of p.solution.secondStarts.slice(1)) { await setStart(start); await tap(press('Keep')); }
  await shot('piles-full-shelf'); await fit('piles, full shelf');
  const note = await page.locator('.es-note').boundingBox(), all = await press('That’s all').boundingBox(), shelf = await page.locator('.es-shelf').boundingBox();
  assert.ok(note.y > all.y && note.y < shelf.y, 'the line about That’s all sits between the buttons and the shelf');
  await tap(press('That’s all'));
  assert.deepEqual((await board(p.id)).refused, {wrong: '2,2,5'});
  assert.match(await page.locator('.es-label').innerText(), /^Whoever starts from 2, 2 and 5 can win\. I go first\.$/);
  for (let i = 0; i < 30; i++) {
    if (/took the last pebble/.test(await page.locator('.es-status').innerText())) break;
    await tap(page.locator('button.es-pebble:not([disabled])').last());
    const take = page.locator('[data-focus="es-take"]'); if (await take.count()) await tap(take);
  }
  assert.match(await page.locator('.es-status').innerText(), /I took the last pebble\. The shelf is cleared\./, 'the app wins the play-out');
  await tap(press('Back'));
  assert.deepEqual((await board(p.id)).shelf, [], 'the shelf is cleared');
  for (const start of p.solution.secondStarts) { await setStart(start); await tap(press('Keep')); }
  await tap(press('That’s all'));
  await done(); checks.push('piles: keep, again, practice, There is another, play-out and clearing, solve');

  // A short name keeps the top bar on one line, and then every state of the
  // 11-by-11 board has its controls (and, in a play-out, its bottom row) in view.
  page = await (await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone})).newPage(); listen(page);
  await page.goto(base); await page.locator('#nickname').fill('Maya'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').waitFor();
  p = byId('everystart-06');
  await open(p.id); await inView(press('That’s all'), 'short name, queen marks, fresh');
  for (const [x, y] of [[5, 2], ...answers]) await tap(cell(x, y));
  await inView(press('That’s all'), 'short name, queen marks, marked');
  await tap(press('Play')); await inView(press('Back'), 'short name, practice, choosing a square');
  await tap(cell(6, 1)); await inView(press('You first'), 'short name, practice, choosing who starts');
  await tap(press('You first')); await inView(page.locator('.rr-board'), 'short name, practice game'); await inView(press('Back'), 'short name, practice game');
  for (let i = 0; i < 30; i++) { if (!await page.locator('.rr-cell.target').count()) break; await tap(page.locator('.rr-cell.target').last()); }
  await inView(press('Back'), 'short name, practice over'); await tap(press('Back'));
  await tap(press('That’s all')); assert.equal((await board(p.id)).play.kind, 'out');
  await inView(page.locator('.rr-board'), 'short name, play-out');
  for (let i = 0; i < 30; i++) { if (!await page.locator('.rr-cell.target').count()) break; await tap(page.locator('.rr-cell.target').last()); }
  await inView(press('Back'), 'short name, play-out over');
  await shot('queen-short-name-playout-over');
  checks.push('queen marks, short name: the controls and the board are in view in every state');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, checks, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
