// Plays Voting and agendas through the real interface: a knockout by taps
// with the mat and the lit cards, Can't with a refused and an accepted group,
// Undo after a refusal, writing and taking off letters on a blank card and
// Vote with its line, the line by taps, by a drag (a mouse drag, or a touch
// drag with TEST_PHONE=1) and by arrow keys, the moved dots and Vote's lines,
// adding a voter, Can't on the line, and the playground. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone viewport).
// Screenshots go in test-results/votes/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/votes/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.vt-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const letter = x => page.locator(`.vt-letter[data-focus="vt-letter-${x}"]`);
const voter = i => page.locator(`.vt-voter[data-focus="vt-voter-${i}"]`);
const tick = x => page.locator(`.vt-tick[data-vt-tick="${x}"]`);
const told = () => page.locator('.vt-told').innerText();
const count = selector => page.locator(selector).count();
const undo = () => page.locator('[data-action="undo"]').click();
let cdp = null;
// A drag from one element's centre to another's, by mouse or by touch.
async function drag(from, to) {
  await from.scrollIntoViewIfNeeded();
  const a = await center(from), b = await center(to);
  // The drop applies after the release, so wait a moment before reading the save.
  if (!phone) { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b, {steps: 10}); await page.mouse.up(); await page.waitForTimeout(100); return; }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let s = 1; s <= 10; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 10, a[1] + (b[1] - a[1]) * s / 10]);
  await page.waitForTimeout(150); await touch('touchEnd', b); await page.waitForTimeout(100);
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Votes QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-votes"] .family-ink-symbol').innerText(), '≻', 'in the satchel');

  // A knockout: A and B vote, the cards light up, then C wins.
  await open('votes-01'); await fit('three cards');
  assert.equal(await count('.puzzle-goal'), 0, 'no objective line on a knockout');
  assert.equal(await count('.vt-tok.ghost'), 1, 'the goal letter waits under the crown');
  await tap(letter('A')); await tap(letter('B'));
  assert.equal(await count('.vt-l.pick'), 3, 'each card lights its pick');
  assert.equal(await count('.vt-side.win'), 1);
  await shot('knockout');
  await tap(letter('C'));
  assert.equal(await told(), 'C wins.');
  assert.equal(await letter('A').isDisabled(), true, 'played letters are off');
  await undo(); await undo(); await undo();
  for (const x of 'CBA') await tap(letter(x));
  await done();
  assert.equal((await board('votes-01')).order, 'CBA');

  // Can't: a refused group stays refused through Undo, then the top cycle.
  await open('votes-12'); await fit('a false group');
  await tap(letter('A'));
  await tap(page.locator('.vt-cant'));
  assert.equal(await count('.vt-puzzle.claiming'), 1);
  for (const x of 'ABCD') await tap(letter(x));
  assert.equal(await count('.vt-letter.chosen'), 4);
  await tap(page.locator('.vt-check'));
  assert.equal(await told(), 'E beats D.');
  assert.equal(await count('.vt-puzzle.claiming'), 0, 'a refusal lets go of the taps');
  await undo();
  assert.equal((await board('votes-12')).order, '', 'one Undo takes back the refusal and the letter');
  assert.deepEqual((await board('votes-12')).shut, ['ABCD']);
  await tap(page.locator('.vt-cant'));
  for (const x of 'ABCD') await tap(letter(x));
  assert.equal(await page.locator('.vt-check').isDisabled(), true, 'Check stays off for a refused group');
  await tap(letter('D'));
  await shot('group');
  await tap(page.locator('.vt-check'));
  await done();
  assert.equal(await count('.vt-pairs li'), 6, 'A, B and C each beat D and E');
  await shot('group-solved');

  // Cards: write, take off, Vote and its line, then the table.
  await open('votes-03'); await fit('fill one card');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Make C win every knockout.');
  for (const x of 'ABC') await tap(letter(x));
  await tap(page.locator('.vt-vote'));
  assert.equal(await told(), 'B wins when B waits.');
  assert.equal(await page.locator('.vt-vote').isDisabled(), true, 'Vote is off until a letter changes');
  await tap(page.locator('.vt-l.written', {hasText: 'B'}));
  assert.equal((await board('votes-03')).fill[0], 'AC', 'B comes off and C moves up');
  await tap(letter('B'));
  await shot('cards');
  await tap(page.locator('.vt-vote'));
  await done();
  assert.equal(await count('.vt-table li'), 3);

  // Three blank cards: choose a card by its next space.
  await open('votes-13'); await fit('waiting wins');
  await tap(page.locator('.vt-l.next').nth(2));
  await tap(letter('C'));
  assert.deepEqual((await board('votes-13')).fill, ['', '', 'C'], 'the tapped card is written');

  // The line: tap a voter and a spot, a drag, arrow keys, the dots and Vote.
  await open('votes-04'); await fit('move one favourite');
  assert.equal(await count('.vt-pips i'), 1);
  await tap(page.locator('.vt-vote'));
  assert.equal(await told(), '4 wins.');
  assert.equal(await count('.vt-tick.won'), 1, 'the winner is ringed');
  await tap(voter(0));
  assert.equal(await count('.vt-voter.picked'), 1);
  await tap(tick(8));
  assert.deepEqual((await board('votes-04')).at, [8, 2, 4, 7, 10]);
  assert.equal(await count('.vt-voter.ghost'), 1, 'a mark where V1 started');
  await drag(voter(1), tick(7));
  assert.deepEqual((await board('votes-04')).at, [8, 7, 4, 7, 10], 'a drag moves V2');
  assert.equal(await count('.vt-pips i.over'), 1, 'a red dot past the allowance');
  await shot('line');
  await tap(page.locator('.vt-vote'));
  assert.equal(await told(), 'Fewer moves would do.');
  await voter(1).focus(); await page.keyboard.press('ArrowLeft');
  assert.deepEqual((await board('votes-04')).at, [8, 6, 4, 7, 10], 'the arrow key moves V2 one spot');
  await tap(voter(1)); await tap(tick(2));
  assert.equal(await count('.vt-pips i.used'), 1);
  await tap(page.locator('.vt-vote'));
  await done();
  assert.equal(await count('.vt-tick.crowned'), 1);

  // Adding a voter, and Can't on the line.
  await open('votes-09'); await fit('a fifth voter');
  assert.equal(await count('.vt-tray .vt-voter'), 1, 'V5 waits above the line');
  await tap(tick(6)); await tap(page.locator('.vt-vote'));
  assert.equal(await told(), '6 wins.');
  await tap(voter(4)); await tap(tick(5)); await tap(page.locator('.vt-vote'));
  await done();
  await open('votes-15');
  await tap(page.locator('.vt-cant'));
  for (const i of [1, 2, 3]) await tap(voter(i));
  await tap(page.locator('.vt-check'));
  assert.equal(await told(), 'They aren’t all on one side of 8.');
  await tap(page.locator('.vt-cant'));
  for (const i of [0, 1, 2]) await tap(voter(i));
  await tap(page.locator('.vt-check'));
  await done();
  assert.match(await page.locator('.vt-why').innerText(), /V1, V2 and V3 all pick 7 over 8\./);
  await shot('line-cant');

  // The playground: write three cards, run a knockout, Again.
  await open('votes-playground'); await fit('playground');
  assert.equal(await count('[data-action="hint"]'), 0, 'no Hint in the playground');
  for (const word of ['ABC', 'BCA', 'CAB']) for (const x of word) await tap(letter(x));
  for (const x of 'ABC') await tap(letter(x));
  assert.equal(await count('.vt-final.won'), 1, 'the knockout runs');
  await shot('playground');
  await tap(page.locator('.vt-again'));
  assert.equal((await board('votes-playground')).order, '');
  await tap(page.locator('.vt-size', {hasText: '5 voters'}));
  assert.equal(await count('.vt-card'), 5);
  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Voting and agendas browser smoke passed${phone ? ' (phone)' : ''}.`);
} finally {
  await browser.close();
}
