// Plays Routes and roadblocks through the real interface on the shared graph
// board: a route drawn by sliding a finger from dot to dot, a route drawn by
// taps, a route cleared by tapping it, the Roadblocks tool with its leak and
// sealed finish, keyboard activation, Undo across a slide, a stuck start, and
// the roadblock game won and lost. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1
// for a phone viewport). Screenshots go in test-results/flow/.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const {puzzles} = JSON.parse(await readFile(new URL('../dist/families/flow/flow.json', import.meta.url), 'utf8'));
const byId = id => puzzles.find(p => p.id === id);
const arcOf = (id, u, v) => byId(id).parameters.arcs.findIndex(([a, b]) => a === u && b === v);
const out = new URL('../test-results/flow/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.flow-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const dot = id => page.locator(`.gb-node[data-node="${id}"]`);
const arrow = i => page.locator(`.gb-hit[data-gb-edge="${i}"]`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
// A slide is a real touch drag on a phone (touch pointers are captured by the
// dot first pressed, so the board must find dots by position) and a mouse drag
// on a desktop.
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
const tool = name => page.locator('.flow-tool', {hasText: name}).click();
// Taps land at the control's centre through real hit-testing: a straight
// vertical or horizontal link has a zero-width box, which Playwright treats
// as hidden, though its 30-pixel hit stroke is easy to tap.
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Flow QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // The shortcut: a slide draws the trap route; tapping it clears it.
  const P = 'flow-02';
  await open(P); await fit('shortcut');
  assert.equal(await page.locator('.flow-tool[aria-pressed="true"]').innerText().then(t => t.includes('Routes')), true, 'Routes is the starting tool');
  await slide('s', 'A', 'B', 't');
  assert.deepEqual((await board(P)).routes, [['s', 'A', 'B', 't']], 'a slide draws a route dot by dot');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(P)).routes, [['s', 'A', 'B']], 'Undo takes back the last step of a slide');
  await tap(dot('t'));
  await tap(arrow(arcOf(P, 'A', 'B')));
  assert.deepEqual((await board(P)).routes, [], 'tapping a drawn arrow clears its route');
  // Two routes by taps and one by keyboard.
  await tap(dot('s')); await tap(dot('A')); await tap(dot('t'));
  await dot('s').focus(); await page.keyboard.press('Enter');
  await dot('B').focus(); await page.keyboard.press(' ');
  await tap(arrow(arcOf(P, 'B', 't')));
  assert.deepEqual((await board(P)).routes, [['s', 'A', 't'], ['s', 'B', 't']], 'taps, keys and a tap on the next arrow all draw');
  await shot('shortcut-routes');
  // Roadblocks: the leak follows the open way and the finish seals.
  await tool('Roadblocks');
  assert.equal(await page.locator('.flow-leak').count(), 1, 'a way through is shown');
  await tap(arrow(arcOf(P, 's', 'A')));
  assert.equal(await page.locator('.flow-finish.sealed').count(), 0);
  await tap(arrow(arcOf(P, 'A', 'B')));
  await tap(arrow(arcOf(P, 'A', 'B')));
  assert.deepEqual((await board(P)).closed, [arcOf(P, 's', 'A')], 'tapping a roadblock again opens it');
  await shot('shortcut-leak');
  await arrow(arcOf(P, 'B', 't')).focus(); await page.keyboard.press('Enter');
  await done();
  await shot('shortcut-solved');

  // Two crossings starts stuck; clearing the long route and drawing two routes solves it.
  const C = 'flow-09';
  await open(C);
  assert.equal(await page.locator('.gb-edge.routed').count(), 6, 'the stuck route is drawn');
  await tap(arrow(arcOf(C, 's', 'A')));
  await slide('s', 'A', 'C', 'D', 't');
  await slide('s', 'B', 'C', 'E', 't');
  await tool('Roadblocks');
  await tap(arrow(arcOf(C, 's', 'A'))); await tap(arrow(arcOf(C, 's', 'B')));
  await done();

  // The roadblock game on the shortcut: closing the shortcut first wins.
  const G = 'flow-12';
  await open(G); await fit('game');
  await page.getByRole('button', {name: 'I go first', exact: true}).click();
  await tap(arrow(arcOf(G, 's', 'A')));
  await page.locator('.flow-result .lost').waitFor();
  await shot('game-lost');
  await page.getByRole('button', {name: /Again/}).click();
  await page.getByRole('button', {name: 'I go first', exact: true}).click();
  await tap(arrow(arcOf(G, 'A', 'B')));
  assert.equal((await board(G)).closed.length, 2, 'the other side answers at once');
  const closed = (await board(G)).closed;
  // Close an arrow on the road the other side left open.
  const roads = [[arcOf(G, 's', 'A'), arcOf(G, 'A', 't')], [arcOf(G, 's', 'B'), arcOf(G, 'B', 't')]];
  const openRoad = roads.find(r => !r.some(i => closed.includes(i)));
  assert.ok(openRoad, 'one road is still open');
  await tap(arrow(openRoad[0]));
  await done();
  await shot('game-won');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
