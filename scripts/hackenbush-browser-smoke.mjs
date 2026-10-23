// Plays Pebble Duel's Stalks group through the real interface: How to play;
// a refused tap on a segment of my colour; a lost duel from the low cut, Undo
// taking back the cut and my reply as one, and the win; four boards with a
// wrong choice, Try again and the right choices; every reply to my three
// first cuts with a lost one and Try again; rounds with three wins from new
// boards; building a balance with +, repeated and double taps on one + that
// stays put, Undo one step at a time, taking a segment off, a Check that is
// played out, Back, Check waiting, and the solve; the two-spot build; focus
// after each kind of tap; the controls in view without scrolling; and fit at
// phone and tablet sizes. Same environment variables as the other browser
// suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a
// phone with touch). Screenshots go in test-results/hackenbush/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {gameSolve, replay, bestClaim, winningMoves, moves, buildHint} from '../dist/families/hackenbush/hackenbush.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const pack = JSON.parse(await readFile(new URL('../dist/families/hackenbush/hackenbush.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const out = new URL('../test-results/hackenbush/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] [data-mechanic-wire]`).waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const seg = (s, k) => page.locator(`[data-mechanic-wire] .hb-seg[data-s="${s}"][data-k="${k}"]`);
const press = name => page.getByRole('button', {name, exact: true});
const status = () => page.locator('[data-mechanic-wire] .hb-status').innerText();
// Taps go through real hit-testing at a point of the control, by touch on a
// phone and by mouse otherwise.
const tapAt = async (locator, fx = .5, fy = .5) => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); const x = b.x + b.width * fx, y = b.y + b.height * fy; if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(40); };
const tap = locator => tapAt(locator);
const focused = () => page.evaluate(() => { const e = document.activeElement; return {tag: e?.tagName, id: e?.id || '', cls: typeof e?.className === 'string' ? e.className : '', focus: e?.dataset?.focus || ''}; });
const onBoard = f => /hb-seg|hb-add|hb-button/.test(f.cls) || f.focus === 'hb-status' || f.id === 'completion-heading';
// The controls are in view without scrolling, from the top of the page.
const inView = async (locator, label) => { await page.evaluate(() => scrollTo(0, 0)); const b = await locator.first().boundingBox(); const h = await page.evaluate(() => innerHeight); assert.ok(b && b.y >= 0 && b.y + b.height <= h, `${label}: in view (${b && Math.round(b.y + b.height)} of ${h})`); };
const message = () => page.locator('.feedback').innerText();
const checks = [];

// Cut by tapping a segment, at varied points of it.
let tapCount = 0;
async function cut(m, label) {
  const at = [[.5, .5], [.3, .7], [.7, .35]][tapCount++ % 3];
  await tapAt(seg(m.stalk, m.at), ...at);
  const f = await focused();
  assert.ok(onBoard(f) || f.tag === 'BUTTON', `${label}: focus lands on the board (${JSON.stringify(f)})`);
}
// Play the game in progress to its end with the solver's cuts (or a choice first).
async function playGame(p, label) {
  let b = await board(p.id);
  if (b.first === null) await tap(page.locator(`[data-focus="hb-claim-${bestClaim(b.start)}"]`));
  for (let i = 0; i < 20; i++) {
    b = await board(p.id);
    if (replay(b).winner !== null) break;
    await cut(gameSolve(p, b), `${label} cut ${i + 1}`);
  }
  b = await board(p.id);
  return replay(b).winner;
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Stalk QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').waitFor();

  // BB and R: How to play; a refused tap; the low cut loses; Undo; the win.
  let p = byId('hackenbush-01'), b;
  await open(p.id); await fit('BB and R, fresh');
  assert.equal(await status(), 'Your turn');
  await page.locator('[data-action="demo"]').first().click();
  assert.match(await page.locator('dialog').innerText(), /Blue cuts one blue segment and Red one red segment; everything above a cut falls off\. Whoever has nothing to cut loses\./);
  await press('Done').click();
  await shot('duel-fresh');
  await tap(seg(1, 0));
  assert.match(await message(), /not allowed/, 'a red segment is not yours to cut');
  assert.deepEqual((await board(p.id)).turns, [], 'nothing moved');
  await cut({stalk: 0, at: 0}, 'the low cut');
  assert.equal(await status(), 'You have nothing to cut. I win.');
  assert.equal(await page.locator('.hb-seg.fell').count(), 1, 'my cut is drawn dashed');
  await shot('duel-lost'); await fit('a lost duel');
  await tap(page.locator('[data-action="undo"]'));
  assert.deepEqual((await board(p.id)).turns, [], 'Undo takes back the cut and my reply as one');
  await cut({stalk: 0, at: 1}, 'the top cut');
  assert.equal(await status(), 'Your turn');
  await cut({stalk: 0, at: 0}, 'the last cut');
  await done(); checks.push('BB and R: a refused tap, the low cut loses, Undo, the top cut wins');

  // Four boards: a wrong choice, Try again, then the right choices.
  p = byId('hackenbush-02');
  await open(p.id); await fit('four boards, fresh');
  await inView(press('Go second'), 'four boards, the choices');
  await shot('boards-choice');
  await tap(page.locator('[data-focus="hb-claim-R"]'));
  let f = await focused(); assert.ok(onBoard(f), `focus after a choice (${JSON.stringify(f)})`);
  assert.equal(await playGame(p, 'Red on B'), 'opponent', 'Red loses on B');
  await inView(press('Try again'), 'four boards, after a loss');
  await tap(press('Try again'));
  for (let round = 0; round < 4; round++) {
    assert.equal(await playGame(p, `board ${round + 1}`), 'you');
    if (round === 2) { await shot('boards-won'); await fit('a board won'); }
    if (round < 3) await tap(press('Next board'));
  }
  await done(); checks.push('four boards: a wrong choice, Try again, and the right choice on each');

  // Every reply from BR, BR and R: a lost reply, Try again, then each first cut.
  p = byId('hackenbush-04');
  await open(p.id); await fit('every reply, fresh');
  b = await board(p.id);
  assert.equal(b.colour, 'R');
  assert.equal(await page.locator('.hb-key').getAttribute('aria-label'), 'You are Red. I am Blue.');
  await shot('replies');
  await cut({stalk: 2, at: 0}, 'a losing reply');
  assert.equal(await playGame(p, 'after a losing reply'), 'opponent');
  await tap(press('Try again'));
  for (let round = 0; round < 3; round++) {
    assert.equal(await playGame(p, `first cut ${round + 1}`), 'you');
    if (round < 2) { await inView(press('Next first cut'), 'every reply, a game won'); await tap(press('Next first cut')); }
  }
  await done(); checks.push('every reply: a lost reply, Try again, and a win against each of three first cuts');

  // BRR and RB as Red: the winning cut, by taps.
  p = byId('hackenbush-05');
  await open(p.id);
  assert.equal(await playGame(p, 'BRR and RB'), 'you');
  await done(); checks.push('BRR and RB: the top R of BRR wins');

  // Rounds: three wins from new boards.
  p = byId('hackenbush-08');
  await open(p.id); await fit('rounds, fresh');
  for (let game = 0; game < 6 && !await page.locator('#completion-heading').count(); game++) {
    if ((await board(p.id)).first !== null) await tap(press('New board'));
    if (game === 1) await shot('round');
    assert.equal(await playGame(p, `round game ${game + 1}`), 'you');
  }
  await done(); checks.push('rounds: three wins from new boards');

  // Balance BRB: build R, Check is played out, Back, Check waits, then R and BRR.
  p = byId('hackenbush-06');
  await open(p.id); await fit('build, fresh');
  await inView(press('Check'), 'build, fresh');
  // The + buttons stay put: three taps at one point make three reds, a quick
  // double tap makes two blues, and Undo takes them back one at a time.
  const at = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const [rx, ry] = await at(page.locator('[data-focus="hb-add-0-R"]'));
  for (let k = 0; k < 3; k++) { if (phone) await page.touchscreen.tap(rx, ry); else await page.mouse.click(rx, ry); await page.waitForTimeout(40); }
  assert.deepEqual((await board(p.id)).built, ['RRR', ''], 'three taps at one point on red + make three reds');
  const [bx, by] = await at(page.locator('[data-focus="hb-add-1-B"]'));
  if (phone) { await page.touchscreen.tap(bx, by); await page.touchscreen.tap(bx, by); } else await page.mouse.click(bx, by, {clickCount: 2});
  await page.waitForTimeout(80);
  assert.deepEqual((await board(p.id)).built, ['RRR', 'BB'], 'a double tap on blue + makes two blues');
  await shot('build-repeat');
  const undoButton = page.locator('[data-action="undo"]');
  for (const want of [['RRR', 'B'], ['RRR', ''], ['RR', ''], ['R', ''], ['', '']]) {
    await tap(undoButton);
    assert.deepEqual((await board(p.id)).built, want, `Undo back to ${want.join(' and ')}`);
  }
  assert.equal(await undoButton.isDisabled(), true, 'nothing left to undo');
  await tap(page.locator('[data-focus="hb-add-0-R"]'));
  f = await focused(); assert.ok(onBoard(f), `focus after + (${JSON.stringify(f)})`);
  await tap(page.locator('[data-focus="hb-add-0-B"]'));
  assert.deepEqual((await board(p.id)).built, ['RB', '']);
  await tap(seg(1, 1));
  assert.deepEqual((await board(p.id)).built, ['R', ''], 'a tap on a built segment takes it off');
  await tap(seg(0, 0));
  assert.match(await message(), /not allowed/, 'the given stalk stays');
  await shot('build');
  await tap(press('Check'));
  assert.match(await status(), /^I can win going first\./);
  await shot('build-playout'); await fit('a play-out');
  for (let i = 0; i < 8 && !await press('Back').count(); i++) {
    const h = buildHint(p, await board(p.id));
    await cut(h.action, `play-out ${i + 1}`);
  }
  assert.match(await status(), /^You have nothing to cut\. I win\./);
  await inView(press('Back'), 'play-out over');
  await tap(press('Back'));
  assert.deepEqual((await board(p.id)).built, ['R', ''], 'Back keeps the built stalks');
  assert.equal(await press('Check').isDisabled(), true, 'Check waits for a change');
  await tap(page.locator('[data-action="undo"]'));
  assert.ok(await press('Back').count(), 'Undo takes back Back');
  await tap(press('Back'));
  for (const c of 'BRR') await tap(page.locator(`[data-focus="hb-add-1-${c}"]`));
  assert.equal(await press('Check').isDisabled(), false);
  await shot('build-balanced');
  await tap(press('Check'));
  await done(); checks.push('build: + stays put under repeated and double taps, Undo, take off, a Check played out, Back and its Undo, Check waits, R and BRR balance BRB');

  // Two spots for four stalks: R and RB.
  p = byId('hackenbush-09');
  await open(p.id); await fit('two spots, fresh');
  await inView(press('Check'), 'two spots, fresh');
  await tap(page.locator('[data-focus="hb-add-0-R"]'));
  for (const c of 'RB') await tap(page.locator(`[data-focus="hb-add-1-${c}"]`));
  await shot('build-two-spots'); await fit('two spots, built');
  await inView(press('Check'), 'two spots, built');
  await tap(press('Check'));
  await done(); checks.push('two spots: R and RB balance BR, BR, BRR and BRR');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, checks, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
