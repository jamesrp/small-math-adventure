// Plays Meeting roads through the real interface on the shared graph board:
// steps by tapping dots and roads, a step back by tapping the dot just left, a
// slide, Undo across a slide, choosing walkers by button and by tapping their
// dot, Enter and arrow keys, a meeting that is too long with its dashed
// route, a solve, the find-every puzzles with Found already, There is another
// and That's all, closing roads with No dot works, refusals, and the
// playground's maps and Homes. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1
// for a phone with touch). Screenshots go in test-results/meeting/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/meeting/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.mt-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const dot = id => page.locator(`.gb-node[data-node="${id}"]`);
const road = i => page.locator(`.gb-hit[data-gb-edge="${i}"]`);
const chip = x => page.locator(`.mt-walker.t${x}`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
// Taps land at a control's centre through real hit-testing, as in the flow
// suite: a straight road has a zero-width box that Playwright treats as hidden.
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const taps = async ids => { for (const id of ids.split(' ')) await tap(dot(id)); };
// A slide is a touch drag on a phone (the board finds dots by position) and a
// mouse drag on a desktop.
let cdp = null;
async function slide(...ids) {
  const points = [];
  for (const id of ids) points.push(await center(dot(id)));
  if (!phone) {
    await page.mouse.move(...points[0]); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(...p, {steps: 8});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', points[0]);
  for (let k = 1; k < points.length; k++) for (let s = 1; s <= 8; s++) {
    const [x1, y1] = points[k - 1], [x2, y2] = points[k];
    await touch('touchMove', [x1 + (x2 - x1) * s / 8, y1 + (y2 - y1) * s / 8]);
  }
  await touch('touchEnd', points.at(-1));
}
const undoButton = () => page.locator('[data-action="undo"]').click();
// A road that is a control now, found by its accessible name.
const roadOf = async (a, b) => (await page.evaluate(() => [...document.querySelectorAll('.gb-hit')].map(h => [Number(h.dataset.gbEdge), h.getAttribute('aria-label')]))).find(([, label]) => label.startsWith(`Road from ${a} to ${b}`))[0];
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Meeting QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 2: taps, a step back, a slide, Undo, a road, choosing, keys.
  const P = 'meeting-02';
  await open(P); await fit('grid');
  assert.equal(await chip('A').getAttribute('aria-pressed'), 'true', 'A starts chosen');
  assert.equal(await page.locator('.puzzle-goal').count(), 0, 'no objective on the board');
  await taps('10');
  assert.deepEqual((await board(P)).walks.A, ['00', '10'], 'a tap on a neighbouring dot steps');
  await taps('00');
  assert.deepEqual((await board(P)).walks.A, ['00'], 'a tap on the dot just left steps back');
  await slide('00', '10', '11');
  assert.deepEqual((await board(P)).walks.A, ['00', '10', '11'], 'a slide walks dot by dot');
  await undoButton();
  assert.deepEqual((await board(P)).walks.A, ['00', '10'], 'Undo takes back the last step of a slide');
  await tap(road(await roadOf('1 across, 0 up', '1 across, 1 up')));
  assert.deepEqual((await board(P)).walks.A, ['00', '10', '11'], 'a tap on a road from the walker steps along it');
  assert.equal(await dot('33').getAttribute('role'), 'img', 'a far dot is not a control');
  await tap(dot('41'));
  assert.equal(await chip('B').getAttribute('aria-pressed'), 'true', 'a tap on another walker’s dot chooses it');
  await dot('31').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P)).walks.B, ['41', '31'], 'Enter on a dot steps');
  await dot('21').focus(); await page.keyboard.press('ArrowLeft');
  assert.deepEqual((await board(P)).walks.B, ['41', '31', '21'], 'an arrow key steps the chosen walker');
  await chip('A').click(); await page.keyboard.press('ArrowRight');
  assert.deepEqual((await board(P)).walks.A, ['00', '10', '11', '21'], 'arrow keys move the walker just chosen');
  // C walks to the same dot: A and C’s walks together are too long.
  await chip('C').click();
  await slide('14', '24', '23', '22', '21');
  assert.equal(await page.locator('.mt-told').innerText(), 'Too long for A and C.');
  assert.equal(await page.locator('.mt-proof').count(), 1, 'a shorter route is drawn');
  assert.equal(await page.locator('#completion-heading').count(), 0);
  await shot('too-long');
  await undoButton();
  assert.equal(await page.locator('.mt-proof').count(), 0, 'the dashed route goes when they part');
  // The meeting dot: one right and one up from A.
  await page.locator('[data-action="restart"]').click();
  await slide('00', '10', '11');
  await chip('B').click(); await slide('41', '31', '21', '11');
  await chip('C').click(); await slide('14', '13', '12', '11');
  await done(); await fit('solved');
  await shot('solved');

  // Puzzle 9: two crossroads, found already, there is another, That's all.
  const E = 'meeting-09';
  await open(E); await fit('crossroads');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Find every meeting dot.');
  await taps('x'); await chip('B').click(); await taps('x'); await chip('C').click(); await taps('x');
  assert.deepEqual((await board(E)).found, ['x'], 'a meeting dot is kept');
  assert.deepEqual((await board(E)).walks, {A: ['a'], B: ['b'], C: ['c']}, 'the walkers go home');
  assert.equal(await page.locator('.gb-node.found[data-node="x"]').count(), 1, 'a ring on the board');
  await page.getByRole('button', {name: 'That’s all', exact: true}).click();
  assert.equal(await page.locator('.mt-told').innerText(), 'There is another.');
  assert.equal(await page.getByRole('button', {name: 'That’s all', exact: true}).isDisabled(), true, 'That’s all waits for a new dot');
  await chip('A').click(); await taps('x'); await chip('B').click(); await taps('x'); await chip('C').click(); await taps('x');
  assert.equal(await page.locator('.mt-told').innerText(), 'Found already.');
  await chip('A').click(); await taps('y'); await chip('B').click(); await taps('y'); await chip('C').click(); await taps('y');
  assert.deepEqual((await board(E)).found, ['x', 'y']);
  await shot('two-found');
  await page.getByRole('button', {name: 'That’s all', exact: true}).click();
  await done();

  // Puzzle 10: the triangle has none, so That's all is right at once.
  await open('meeting-10');
  await taps('b'); await chip('C').click(); await taps('b');
  assert.equal(await page.locator('.mt-told').innerText(), 'Too long for A and C.', 'B is off the road from A to C');
  await page.getByRole('button', {name: 'That’s all', exact: true}).click();
  await done();

  // Puzzle 12: closing roads.
  const C = 'meeting-12';
  await open(C); await fit('close');
  const wrong = await roadOf('0 across, 0 up', '1 across, 0 up'), right = await roadOf('0 across, 1 up', '1 across, 1 up');
  await page.getByRole('button', {name: 'No dot works', exact: true}).click();
  assert.equal(await page.locator('.mt-told').innerText(), 'This dot still works.', 'with every road open a dot works');
  assert.equal(await page.locator('.gb-node.found[data-node="01"]').count(), 1, 'the meeting dot is shown');
  await tap(road(wrong));
  assert.deepEqual((await board(C)).closed, [wrong], 'a tap closes a road');
  assert.equal(await page.locator('.gb-bar').count(), 1, 'a bar across it');
  await tap(road(right));
  assert.deepEqual((await board(C)).closed, [wrong], 'one road only');
  assert.match(await page.locator('.feedback').innerText(), /not allowed/, 'a refusal says so');
  await shot('close-refused');
  await tap(road(wrong));
  assert.deepEqual((await board(C)).closed, [], 'a second tap opens it');
  await road(right).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', {name: 'No dot works', exact: true}).click();
  await done();
  await shot('close-solved');

  // The playground: maps and Homes.
  const G = 'meeting-playground';
  await open(G); await fit('playground');
  assert.equal(await page.getByRole('button', {name: 'Hint', exact: true}).count(), 0, 'no Hint');
  await page.getByRole('button', {name: 'Tree', exact: true}).click();
  assert.equal((await board(G)).map, 'tree');
  await page.getByRole('button', {name: 'Homes', exact: true}).click();
  await tap(dot('c'));
  await tap(dot('q'));
  assert.deepEqual((await board(G)).homes, {A: 'a', B: 'b', C: 'q'}, 'a home moves');
  await page.getByRole('button', {name: 'Homes', exact: true}).click();
  await chip('A').click(); await taps('u');
  await chip('C').click(); await taps('u');
  await chip('B').click(); await slide('b', 'w', 'v', 'u');
  assert.deepEqual((await board(G)).found, ['u'], 'the new meeting dot is kept');
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
