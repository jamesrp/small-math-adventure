// Plays Pebble Duel's Buckets group through the real interface: How to play;
// building a move by taps (take, add to buckets on the left, End turn) and
// Cancel; a refused tap on a bucket right of the one taken from; a lost duel
// from refilling, Undo taking back the move and my reply as one, and the win
// by refilling nothing; 3, 3 and 1 won by refilling two buckets; every reply
// to my three first moves, with a lost one and Try again; who-starts rounds
// with a choice and three wins from new starts; Every start's cards with
// There is another and its lock, a practice game, a wrong That's all played
// out at once and clearing the marks, and the solve; the encore's taps that
// take 2 and add up to 3, and its rounds; focus after each kind of tap; the
// move controls in view without scrolling; and fit at phone and desktop
// sizes. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// with touch). Screenshots go in test-results/buckets/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {gameSolve, winningMoves, moves, after, moverWins, cardStart, PLAY} from '../dist/families/buckets/buckets.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const pack = JSON.parse(await readFile(new URL('../dist/families/buckets/buckets.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const out = new URL('../test-results/buckets/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] [data-mechanic-wire]`).waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const bucket = i => page.locator(`[data-mechanic-wire] .bk-bucket[data-i="${i - 1}"]`);
const press = name => page.getByRole('button', {name, exact: true});
const status = () => page.locator('[data-mechanic-wire] .bk-status').innerText();
// Taps go through real hit-testing at a point of the control (its centre by
// default), by touch on a phone and by mouse otherwise.
const tapAt = async (locator, fx = .5, fy = .5) => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); const x = b.x + b.width * fx, y = b.y + b.height * fy; if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(40); };
const tap = locator => tapAt(locator);
const focused = () => page.evaluate(() => { const e = document.activeElement; return {tag: e?.tagName, id: e?.id || '', cls: typeof e?.className === 'string' ? e.className : '', focus: e?.dataset?.focus || ''}; });
const onBoard = f => /bk-bucket|bk-card|bk-button/.test(f.cls) || f.focus === 'bk-status' || f.id === 'completion-heading';
// The move controls are in view without scrolling, from the top of the page.
const inView = async (locator, label) => { await page.evaluate(() => scrollTo(0, 0)); const b = await locator.first().boundingBox(); const h = await page.evaluate(() => innerHeight); assert.ok(b && b.y >= 0 && b.y + b.height <= h, `${label}: the control is in view (${b && Math.round(b.y + b.height)} of ${h})`); };
const message = () => page.locator('.feedback').innerText();
const checks = [];

// Make a move by taps: the bucket taken from (once a fish), each bucket on its
// left (once a fish added), then End turn. Taps land at varied points.
async function play(m, label) {
  for (let t = 0; t < m.take; t++) await tapAt(bucket(m.from), [.5, .15, .85][t % 3], [.5, .85, .2][t % 3]);
  for (const [i, n] of m.add.entries()) for (let t = 0; t < n; t++) await tapAt(bucket(i + 1), [.2, .8, .5][t % 3], [.2, .8, .5][t % 3]);
  let f = await focused();
  assert.ok(onBoard(f), `${label}: focus stays on the buckets while building (${JSON.stringify(f)})`);
  await tap(press('End turn'));
  f = await focused();
  assert.ok(onBoard(f), `${label}: focus lands on the board after End turn (${JSON.stringify(f)})`);
}
// Win the game in progress with the solver's moves, by tapping.
async function winGame(p, label) {
  const q = p.parameters;
  let b = await board(p.id);
  if (b.first === null) {
    await tap(page.locator(`[data-focus="bk-choose-${moverWins(q, b.pos) ? 'you' : 'opponent'}"]`));
    assert.ok(onBoard(await focused()), `${label}: focus lands on the board after choosing`);
  }
  for (let i = 0; i < 40; i++) {
    b = await board(p.id);
    if (b.pos.every(c => !c)) break;
    const a = gameSolve(p, b);
    await play(a, `${label} move ${i + 1}`);
  }
  b = await board(p.id);
  assert.equal(b.turns.at(-1).player, 'you', `${label}: the child took the last fish`);
}
async function finishStreak(p, label) {
  for (let game = 0; game < 5 && !await page.locator('#completion-heading').count(); game++) {
    if ((await board(p.id)).first !== null) await tap(press('New start'));
    await winGame(p, `${label} ${game + 1}`);
  }
  await done();
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Fish QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').waitFor();

  // 0, 0 and 1: How to play; a lost duel from refilling; Undo; the win.
  let p = byId('buckets-01');
  await open(p.id); await fit('0, 0 and 1, fresh');
  const width = (await page.locator('.bk-board').boundingBox()).width;
  assert.ok(width <= 380, `the board is compact (${width}px)`);
  await inView(press('End turn'), '0, 0 and 1, fresh');
  await page.locator('[data-action="demo"]').first().click();
  assert.match(await page.locator('dialog').innerText(), /A move takes one fish from a bucket and may add one fish to each bucket to its left\. Whoever takes the last fish wins\./);
  await press('Done').click();
  assert.equal(await press('End turn').isDisabled(), true, 'End turn waits for a tap');
  await tap(bucket(3)); await tap(bucket(1));
  assert.equal(await bucket(3).evaluate(e => e.classList.contains('taking')), true);
  assert.equal(await page.locator('.bk-fish.new').count(), 1, 'the added fish shows');
  await inView(press('End turn'), '0, 0 and 1, a move being built'); await inView(press('Cancel'), '0, 0 and 1, a move being built');
  await shot('building'); await fit('a move being built');
  await tap(press('End turn'));
  assert.match(await status(), /^I took the last fish\.$/, 'refilling loses');
  let f = await focused(); assert.ok(onBoard(f) || f.tag === 'BUTTON', `focus after a lost duel (${JSON.stringify(f)})`);
  await tap(page.locator('[data-action="undo"]'));
  assert.deepEqual((await board(p.id)).turns, [], 'Undo takes back the move and my reply as one');
  await tap(bucket(3)); await tap(press('End turn'));
  await done(); checks.push('0, 0 and 1: refilling loses, Undo, and refilling nothing wins');

  // 2, 1 and 1: Cancel, a refused tap, the opponent's last move drawn, a win by taps.
  p = byId('buckets-02');
  await open(p.id);
  await tap(bucket(3)); await tap(bucket(2)); await tap(press('Cancel'));
  assert.equal(await page.locator('.bk-bucket.taking').count(), 0, 'Cancel drops the move being built');
  assert.equal(await press('End turn').isDisabled(), true);
  await tap(bucket(1)); await tap(bucket(2));
  assert.match(await message(), /not allowed/, 'a bucket right of the one taken from is refused');
  assert.equal(await bucket(1).evaluate(e => e.classList.contains('taking')), true, 'the move being built stays');
  assert.deepEqual((await board(p.id)).turns, [], 'nothing moved');
  await tap(press('Cancel'));
  checks.push('2, 1 and 1: Cancel, and a refused tap on the right');
  await play({from: 3, take: 1, add: [0, 0, 0]}, 'a losing move');
  assert.match(await status(), /^I took 1 from bucket \d( and added 1 to buckets? [\d, and]+)?\. Your turn$/);
  assert.ok(await page.locator('.bk-fish.gone').count() === 1, 'the fish I took is drawn dashed');
  await shot('reply'); await fit('after my reply');
  await tap(page.locator('[data-action="undo"]'));
  await winGame(p, '2, 1 and 1'); await done(); checks.push('2, 1 and 1: my reply drawn, Undo, and a win by taps');

  // 3, 3 and 1: won only by refilling two buckets.
  let b;
  p = byId('buckets-05');
  await open(p.id);
  await play({from: 3, take: 1, add: [1, 0, 0]}, 'one refill');
  b = await board(p.id);
  assert.equal(moverWins(p.parameters, after(b.start, b.turns[0])), true, 'one refill leaves me a win');
  assert.equal(moverWins(p.parameters, b.pos), false, 'and I take it');
  await tap(page.locator('[data-action="undo"]'));
  await winGame(p, '3, 3 and 1'); await done(); checks.push('3, 3 and 1: won by refilling two buckets');

  // Every reply from 2 and 2: a lost game and Try again, then all three first moves.
  p = byId('buckets-03');
  await open(p.id);
  b = await board(p.id);
  const wrong = moves(p.parameters, b.pos).find(m => moverWins(p.parameters, after(b.pos, m)));
  await play(wrong, 'a wrong reply');
  for (let i = 0; i < 10 && (await board(p.id)).pos.some(Boolean); i++) await play(moves(p.parameters, (await board(p.id)).pos)[0], 'finishing a lost game');
  await inView(press('Try again'), 'every reply, lost');
  await tap(press('Try again'));
  for (let round = 0; round < 3; round++) {
    await winGame(p, `reply ${round + 1}`);
    if (round < 2) { await inView(press('Next first move'), 'every reply, won'); await tap(press('Next first move')); }
  }
  await done(); checks.push('every reply: a lost game, Try again, and each of three first moves');

  // Who starts, three buckets of 0 to 3.
  p = byId('buckets-06');
  await open(p.id); await fit('who starts, fresh');
  await inView(press('Me first'), 'who starts, fresh'); await inView(press('You first'), 'who starts, fresh');
  await shot('who-starts'); await finishStreak(p, 'three buckets'); checks.push('who starts: three wins from new starts');

  // Every start: two buckets of 0 to 3.
  p = byId('buckets-04');
  await open(p.id); await fit('cards, fresh');
  await inView(press('That’s all'), 'cards, fresh');
  const card = c => page.locator(`[data-focus="bk-card-${c}"]`);
  await tapAt(card(5), .9, .1); await tapAt(card(2), .1, .9);
  f = await focused(); assert.match(f.focus, /^bk-card-/, 'focus stays on the card');
  await tap(press('That’s all'));
  assert.deepEqual((await board(p.id)).refused, {more: true});
  assert.match(await page.locator('.bk-note').innerText(), /^There is another\.$/);
  assert.equal(await press('That’s all').isDisabled(), true, 'That’s all waits for a change');
  assert.doesNotMatch(await page.locator('[data-mechanic-wire]').innerText(), /\d+ (more|left)/, 'no count');
  await tap(press('Play'));
  assert.match(await status(), /Tap a card to start from\./);
  await tap(card(6)); await tap(press('You first'));
  assert.match(await status(), /I took .*\. Your turn/);
  await inView(press('End turn'), 'a practice game');
  for (let i = 0; i < 10; i++) {
    const play2 = (await board(p.id)).play;
    let pos = cardStart(play2.start);
    for (const t of play2.turns) pos = after(pos, t);
    if (pos.every(c => !c)) break;
    await play(winningMoves(PLAY, pos)[0] || moves(PLAY, pos)[0], `practice ${i + 1}`);
  }
  await tap(press('Back'));
  assert.deepEqual((await board(p.id)).marked, [2, 5], 'practice leaves the marks');
  checks.push('cards: There is another, its lock, a practice game');
  await tap(card(8)); await tap(card(10));
  await tap(press('That’s all'));
  assert.equal((await board(p.id)).play.kind, 'out');
  assert.match(await page.locator('.bk-label').innerText(), /^Whoever starts from 1 and 1 can win\. I go first\.$/);
  assert.equal(await press('Back').count(), 0, 'the play-out cannot be left');
  await shot('playout'); await fit('play-out');
  for (let i = 0; i < 10 && /Your turn/.test(await status()); i++) {
    const play2 = (await board(p.id)).play;
    let pos = cardStart(play2.start);
    for (const t of play2.turns) pos = after(pos, t);
    await play(moves(PLAY, pos)[0], `play-out ${i + 1}`);
  }
  assert.match(await status(), /^I took the last fish\. The marks are cleared\.$/);
  assert.deepEqual((await board(p.id)).marked, []);
  await tap(press('Back'));
  for (const c of p.solution.cards) await tap(card(c));
  await tap(press('That’s all'));
  await done(); checks.push('cards: a wrong That’s all is played out and clears the marks; solve');

  // The encore: 3 and 6, take 2 and add 1.
  p = byId('buckets-07');
  await open(p.id); await fit('encore, fresh');
  await tap(bucket(2)); await tap(bucket(2));
  assert.equal(await page.locator('.bk-fish.lift').count(), 2, 'a second tap takes another');
  for (let i = 0; i < 4; i++) await tap(bucket(1));
  assert.equal(await page.locator('.bk-fish.new').count(), 0, 'a fourth tap takes the added fish out');
  await tap(bucket(1));
  await inView(press('End turn'), 'encore, a move being built');
  await shot('encore-building'); await fit('encore, a move being built');
  await tap(press('End turn'));
  b = await board(p.id);
  assert.deepEqual(after(b.start, b.turns[0]), [4, 4], 'the taps made the move shown');
  await winGame(p, 'encore'); await done(); checks.push('encore: take 2, add 1, and win');
  p = byId('buckets-08');
  await open(p.id); await finishStreak(p, 'encore rounds'); checks.push('encore rounds: three wins from new starts');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, checks, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
