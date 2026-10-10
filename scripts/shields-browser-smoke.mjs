// Plays Portal shields through the real interface on the shared portal board:
// shields by tapping crosses in the room, including a cross where two shots
// cross and both copies of a cross on a seam; Enter on a cross; the shot the
// app fires drawn in both views; a claim judged only at its last shot: Fewest
// with too many shields told so then, and still refused after Undo; Fewest,
// then shots tapped as T copies in the unrolled view, two crossing shots
// cleared with their crossings marked, and the solve; Can't only after a try,
// refused for good at its last shot where there is a way, and right with three
// shields, with the four corner shots tapped; the room with
// no T and its seam crosses; hints marked on the board and applied; where
// focus goes after a claim; how long a tap takes; the playground's rooms and
// aimed shots; no page overflow. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone with touch). Screenshots go in test-results/shields/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/shields/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.sh-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const cross = (i, j, n = 0) => page.locator(`.sh-room [data-pb-point="o,${i},${j}"]`).nth(n);
const copy = (u, v) => page.locator(`.sh-plane [data-pb-point="${u},${v}"]`);
const button = name => page.getByRole('button', {name, exact: true});
const told = () => page.locator('.sh-told').innerText();
const untold = async () => (await page.locator('.sh-told').count()) === 0;
const status = () => page.locator('.sh-puzzle [role="status"]').innerText();
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
// Taps land where the child sees the target, through real hit-testing: the
// centre of the cross (or T) drawn, not the control's own box.
const tap = async locator => { const hit = locator.locator('.pb-hit'); await hit.scrollIntoViewIfNeeded(); const [x, y] = await center(hit); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const undo = () => page.locator('[data-action="undo"]').click();
const focusOnBoard = () => page.evaluate(() => document.activeElement?.matches('.sh-puzzle .pb-point.act') ?? false);
async function hintsFinish() {
  for (let i = 0; i < 3; i++) await button('Hint').click();
  let n = 0;
  while (!await page.locator('#completion-heading').count() && n++ < 40) await button('Apply hint').click();
  await done();
}
// The time from a real tap on a cross to the redrawn, laid-out board.
async function tapTime(i, j) {
  await page.evaluate(() => {
    const t = window.__tap = {};
    document.addEventListener('pointerdown', () => { t.down = performance.now(); }, {capture: true, once: true});
    new MutationObserver((_, o) => { document.body.offsetHeight; t.drawn = performance.now(); o.disconnect(); }).observe(document.body, {childList: true, subtree: true});
  });
  await tap(cross(i, j));
  await page.waitForFunction(() => window.__tap.drawn);
  return page.evaluate(() => window.__tap.drawn - window.__tap.down);
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Shields QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: three drawn shots.
  const A = 'shields-01';
  await open(A); await fit('three shots');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Stop every shot with as few shields as you can.');
  assert.ok(await page.locator('.sh-room .sh-shot.escape').count() >= 3, 'the shots getting through, in the room');
  assert.equal(await page.locator('.sh-plane .sh-shot.escape').count(), 3, 'and in the unrolled view, one line each');
  assert.equal(await button('Fewest').isDisabled(), true, 'nothing to claim yet');
  assert.equal(await page.locator('.sh-room [data-pb-point="o,0,0"][role="button"], .sh-room [data-pb-point="o,4,4"][role="button"]').count(), 0, 'S and T are not controls');
  // Where the two steep shots cross.
  await tap(cross(1, 3));
  assert.deepEqual((await board(A)).shields, [[1, 3]], 'a tap where two shots cross puts the shield there');
  assert.equal(await page.locator('.sh-plane .sh-shot.escape').count(), 1, 'one shield stops both steep shots');
  // A cross on the seam is one point drawn twice: either copy works.
  await tap(cross(0, 4, 1));
  assert.deepEqual((await board(A)).shields, [[0, 4], [1, 3]], 'the right-hand copy of a seam cross');
  assert.equal(await page.locator('.sh-room .sh-shield').count(), 3, 'a shield on the seam is drawn at both copies');
  await tap(cross(0, 4, 0));
  assert.deepEqual((await board(A)).shields, [[1, 3]], 'the left-hand copy takes it off');
  await cross(1, 1).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(A)).shields, [[1, 1], [1, 3]], 'Enter on a cross');
  assert.equal(await focusOnBoard(), true, 'focus stays on the board');
  assert.match(await status(), /No shot gets through\./);
  // Too many: pressing Fewest judges nothing; the last of three shots is told
  // “Fewer can do it.”, once, and Undo doesn't bring the claim back.
  await tap(cross(3, 1));
  await button('Fewest').click();
  assert.equal(await untold(), true, 'pressing Fewest says nothing yet');
  assert.equal(await page.locator('.sh-prompt').innerText(), 'Tap 3 shots that cross only at S and T.');
  await tap(copy(4, 12)); await tap(copy(12, 4));
  assert.equal(await untold(), true, 'two crossing shots before the last are not judged');
  await tap(copy(4, 4));
  assert.equal(await told(), 'Fewer can do it.');
  assert.equal(await button('Fewest').isDisabled(), true, 'refused at three');
  assert.equal(await focusOnBoard(), true, 'focus goes to the board, not a disabled button');
  await undo();
  assert.equal(await button('Fewest').isDisabled(), true, 'still refused at three after Undo');
  assert.equal(await page.locator('.sh-prompt').count(), 0, 'Undo doesn’t reopen the claim');
  await shot('fewer');
  await tap(cross(3, 1));
  assert.equal(await button('Fewest').isDisabled(), false, 'two shields can try again');
  // Four taps on and off one cross; the median, so one slow frame on a busy machine doesn't decide.
  const times = [];
  for (let k = 0; k < 4; k++) times.push(await tapTime(5, 5));
  times.sort((x, y) => x - y);
  const t = (times[1] + times[2]) / 2;
  assert.ok(t < 100, `a tap redraws in ${t.toFixed(1)} ms`);
  await button('Fewest').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.sh-prompt').innerText(), 'Tap 2 shots that cross only at S and T.');
  assert.equal(await focusOnBoard(), true, 'focus goes to a shot to tap, not to a button');
  assert.equal(await page.locator('.sh-room .pb-point.act').count(), 0, 'crosses rest during the claim');
  assert.equal(await page.locator('.sh-plane .pb-point.pick').count(), 3, 'the three drawn shots can be tapped');
  await tap(copy(4, 12));
  await tap(copy(12, 4));
  assert.equal(await told(), 'Those two cross.');
  assert.equal(await page.locator('.sh-plane .sh-clash').count(), 4, 'both crossings marked on both lines');
  assert.deepEqual((await board(A)).picks, [], 'crossing shots are cleared');
  assert.equal(await focusOnBoard(), true, 'focus stays on the board');
  await shot('crossing');
  await tap(copy(4, 12));
  await tap(copy(4, 4));
  await done(); await fit('solved');
  await shot('solved');

  // Puzzle 7: Can't only after a try, then the four corner shots.
  const C = 'shields-07';
  await open(C); await fit('three shields');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Stop every shot with 3 shields.');
  assert.equal(await button('Can’t').isDisabled(), true, 'a try first');
  assert.equal(await page.locator('.sh-plane .sh-shot.escape').count(), 1, 'the app fires one shot that gets through');
  await button('Hint').click();
  assert.match(await page.locator('.hint-card').innerText(), /Try three shields/, 'the first hint is a try');
  await tap(cross(2, 2)); await tap(cross(2, 6)); await tap(cross(6, 2));
  assert.equal(await page.locator('.sh-room .pb-point.act').count(), 3, 'a full budget leaves only the shields to take off');
  assert.match(await status(), /gets through/);
  await shot('three-open');
  await button('Can’t').focus(); await page.keyboard.press('Enter');
  assert.equal(await focusOnBoard(), true, 'focus leaves Can’t for the board');
  assert.equal(await page.locator('.sh-prompt').innerText(), 'Tap 4 shots that cross only at S and T.');
  for (const [u, v] of [[4, 4], [-4, 4], [4, -4]]) await tap(copy(u, v));
  assert.equal(await page.locator('#completion-heading').count(), 0, 'three shots are not yet the proof');
  await tap(copy(-4, -4));
  await done(); await fit('can’t solved');
  await shot('cant-solved');

  // Puzzle 6: four shields; Can't is refused for good.
  const B = 'shields-06';
  await open(B);
  await tap(cross(1, 1));
  await button('Can’t').click();
  assert.equal(await untold(), true, 'pressing Can’t says nothing yet');
  assert.equal(await page.locator('.sh-prompt').innerText(), 'Tap 5 shots that cross only at S and T.');
  for (const [u, v] of [[4, 4], [-4, 4], [4, -4], [-4, -4]]) await tap(copy(u, v));
  assert.equal(await untold(), true);
  await tap(copy(4, 12));
  assert.equal(await told(), 'There is a way.');
  assert.equal(await focusOnBoard(), true, 'focus goes to the board, not Can’t');
  assert.equal(await button('Can’t').isDisabled(), true);
  await undo();
  assert.equal(await button('Can’t').isDisabled(), true, 'Undo keeps the refusal');
  for (let i = 0; i < 2; i++) await button('Hint').click();
  assert.equal(await page.locator('.sh-room .pb-point.hinted').count(), 1, 'the second hint marks a cross');
  await hintsFinish();

  // Puzzle 9: back to S, seam crosses, S copies to tap.
  const D = 'shields-09';
  await open(D); await fit('back to S');
  await tap(cross(0, 4, 1)); await tap(cross(4, 0, 1)); await tap(cross(4, 4));
  assert.deepEqual((await board(D)).shields, [[0, 4], [4, 0], [4, 4]]);
  assert.match(await status(), /No shot gets through\./);
  await button('Fewest').click();
  assert.equal(await page.locator('.sh-prompt').innerText(), 'Tap 3 shots that cross only at S.');
  await tap(copy(8, 8)); await tap(copy(-8, -8));
  assert.equal(await untold(), true, 'not judged before the last shot');
  await tap(copy(8, 0));
  assert.equal(await told(), 'Those two cross.', 'a shot and its way back overlap');
  assert.deepEqual((await board(D)).picks, []);
  await tap(copy(8, 8)); await tap(copy(8, 0)); await tap(copy(0, 8));
  await done();
  await shot('back-to-s');

  // Puzzles 5, 8 and 10: the long shot, the drawn return shots, T on the edge.
  for (const id of ['shields-05', 'shields-08', 'shields-10']) { await open(id); await fit(id); await shot(id); }
  await hintsFinish();

  // The playground.
  const G = 'shields-playground';
  await open(G); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await tap(copy(12, 12));
  assert.deepEqual((await board(G)).aims, [[12, 12]]);
  assert.equal(await page.locator('.sh-plane .sh-shot.escape').getAttribute('x2'), '4', 'aimed at the T one copy right and up, it stops at the first T');
  await tap(copy(12, 4));
  assert.equal(await page.locator('.sh-plane .sh-shot.escape').count(), 2, 'two aimed shots');
  await tap(cross(1, 0));
  assert.equal(await page.locator('.sh-plane .sh-shot.stopped').count(), 0, 'a shield off the shots changes nothing');
  await tap(cross(1, 0));
  await tap(cross(3, 3));
  assert.equal(await page.locator('.sh-plane .sh-shot.stopped').count(), 1, 'a shield on one stops it');
  await page.getByRole('button', {name: 'No T', exact: true}).click();
  assert.equal((await board(G)).room, 'none');
  await tap(copy(8, 8));
  assert.equal(await page.locator('.sh-plane .sh-shot.escape').getAttribute('x2'), '8');
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, tapMs: Number(t.toFixed(1)), errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
