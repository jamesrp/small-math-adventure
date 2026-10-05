// Plays Rhombus gardens through the real interface on the shared triangle
// grid: a rhombus laid by sliding across two triangles, by two taps and by
// keys; a slide that cannot make a piece; lifting, also by a click with no
// pointer (assistive technology); Undo; the Dots tool with
// its dashed open place; flips against a budget; listing with That's all;
// chevrons; and the playground. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1
// for a phone viewport with touch slides). Screenshots go in test-results/rhombus/.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {gridOf, placements} from '../dist/tri-grid.js';
import {covers, maxPacking, flipRoute, cornerTiling, tilingKey} from '../dist/families/rhombus/lozenge.js';
import {hexagon} from '../dist/families/rhombus/rhombus.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const {puzzles} = JSON.parse(await readFile(new URL('../dist/families/rhombus/rhombus.json', import.meta.url), 'utf8'));
const byId = id => puzzles.find(p => p.id === id), gridFor = id => gridOf(byId(id).parameters.board);
const out = new URL('../test-results/rhombus/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.rh-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const cell = i => page.locator(`[data-tg-cell="${i}"]`);
const point = k => page.locator(`[data-tg-point="${k}"]`);
const sameSet = (a, b) => assert.equal(tilingKey(a || []), tilingKey(b));
// A touch tap's click can land a moment after the tap resolves, so checks that follow a tap retry briefly.
async function eventually(check) { let last; for (let k = 0; k < 30; k++) { try { return await check(); } catch (e) { last = e; await page.waitForTimeout(100); } } throw last; }
// The centre of a triangle on screen: the mean of its corners, through the svg's own transform.
const centre = i => page.evaluate(i => {
  const el = document.querySelector(`[data-tg-cell="${i}"]`) || document.querySelector(`.tg-cell[data-cell="${i}"]`), m = el.ownerSVGElement.getScreenCTM();
  const pts = [...el.points].map(p => p.matrixTransform(m));
  return [pts.reduce((n, p) => n + p.x, 0) / pts.length, pts.reduce((n, p) => n + p.y, 0) / pts.length];
}, i);
const pointAt = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = ([x, y]) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
const tap = async i => tapAt(await centre(i));
// A slide through the middles of the given triangles: a touch drag on a phone, a mouse drag otherwise.
let cdp = null;
async function slide(...cells) {
  const points = [];
  for (const i of cells) points.push(await centre(i));
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
// Slides a whole piece of four triangles in an order a finger can follow (each next to the last).
const path = (g, piece) => { const order = [piece.find(c => piece.filter(d => g.nbr[c].includes(d)).length === 1)]; while (order.length < piece.length) order.push(piece.find(c => !order.includes(c) && g.nbr[order.at(-1)].includes(c))); return order; };

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Rhombus QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Long hexagon: a slide, Undo, two taps, a tap to lift, keys, a slide that makes no piece.
  const L = 'rhombus-01', gl = gridFor(L), [first, ...rest] = covers(gl)[0];
  await open(L); await fit('long hexagon');
  await slide(...first);
  await eventually(async () => sameSet((await board(L)).pieces, [first]));
  await page.locator('[data-action="undo"]').click();
  await eventually(async () => sameSet((await board(L)).pieces, []));
  await tap(first[0]);
  await eventually(async () => assert.equal(await page.locator('.tg-cell.partner').count() + await page.locator('.tg-hit.partner').count() > 0, true, 'the partners of a tapped triangle glow'));
  await tap(first[1]);
  await eventually(async () => sameSet((await board(L)).pieces, [first]));
  await page.locator(`[data-tg-piece="${first.join('.')}"]`).click();
  await eventually(async () => sameSet((await board(L)).pieces, []));
  await cell(first[0]).focus(); await page.keyboard.press('Enter');
  await cell(first[1]).focus(); await page.keyboard.press(' ');
  await eventually(async () => sameSet((await board(L)).pieces, [first]));
  const [a, b] = rest[0], c = gl.nbr[b].find(x => x !== a && !first.includes(x));
  if (c !== undefined) { await slide(a, b, c); await eventually(async () => sameSet((await board(L)).pieces, [first])); }
  await shot('long-hexagon-one');
  for (const piece of rest) await slide(...piece);
  await done();
  await shot('long-hexagon-solved');

  // The bow tie: the most rhombi by slides, then the two middle dots.
  const B = 'rhombus-06', gb = gridFor(B), middle = gb.cells.map((_, i) => i).filter(i => gb.nbr[i].length === 3);
  await open(B); await fit('bow tie');
  for (const piece of maxPacking(gb)) await slide(...piece);
  await eventually(async () => assert.equal((await board(B)).pieces.length, 2));
  await page.locator('.rh-tool', {hasText: 'Dots'}).click();
  await eventually(async () => assert.equal(await page.locator('.rh-tool[aria-pressed="true"]', {hasText: 'Dots'}).count(), 1));
  await tap(middle[0]);
  await eventually(async () => assert.equal(await page.locator('.rh-open').count(), 1, 'a dashed rhombus shows a place with no dot'));
  await shot('bow-tie-dots');
  await tap(middle[1]);
  await done();
  await shot('bow-tie-solved');

  // First flips: tap the white dots along a shortest route.
  const F = 'rhombus-08', q = byId(F).parameters, gf = gridOf(q.board);
  await open(F); await fit('first flips');
  const route = flipRoute(gf, q.start, q.goal);
  assert.equal(await page.locator('[data-tg-cell]').count(), 0, 'flip puzzles have no triangle controls');
  await tapAt(await pointAt(point(route[0])));
  await eventually(async () => assert.equal((await board(F)).flips, 1));
  assert.match(await page.locator('.rh-counter').innerText(), /1\s*\/\s*4/);
  await shot('first-flips-one');
  for (const k of route.slice(1)) await tapAt(await pointAt(point(k)));
  await done();
  await shot('first-flips-solved');

  // Three ways: That's all too soon, then every filling.
  const T = 'rhombus-03', gt = gridFor(T), all = covers(gt);
  await open(T);
  for (const piece of all[0]) await slide(...piece);
  await page.locator('.rh-action', {hasText: 'That’s all'}).click();
  await page.locator('.rh-note', {hasText: 'There’s another.'}).waitFor();
  for (const t of all.slice(1)) {
    await page.locator('.rh-action', {hasText: 'Clear'}).click();
    for (const piece of t) await slide(...piece);
  }
  await eventually(async () => assert.equal(await page.locator('.rh-shelf li').count(), 3));
  await shot('three-ways-shelf');
  await page.locator('.rh-action', {hasText: 'That’s all'}).click();
  await done();

  // Purple pinwheel: chevrons by slides through four triangles.
  const P = 'rhombus-10', gp = gridFor(P), [pin] = covers(gp, 'chevron');
  await open(P); await fit('pinwheel');
  for (const piece of pin) await slide(...path(gp, piece));
  await done();
  await shot('pinwheel-solved');

  // Turn the wall: the biggest board fits and flips.
  await open('rhombus-12'); await fit('turn the wall');
  await shot('turn-the-wall');

  // The playground: a smaller hexagon, a flip, and back to an empty box.
  const G = 'rhombus-playground';
  await open(G); await fit('playground');
  await page.locator('[data-focus="rh-size-2"]').click();
  await eventually(async () => assert.equal((await board(G)).size, 2));
  const g2 = gridOf({outline: hexagon(2, 2, 2), turn: true});
  await eventually(async () => sameSet((await board(G)).pieces, cornerTiling(g2, 2, 2, 2)));
  await tapAt(await pointAt(page.locator('.rh-flip').first()));
  await eventually(async () => assert.notEqual(tilingKey((await board(G)).pieces), tilingKey(cornerTiling(g2, 2, 2, 2))));
  await page.locator('[data-focus="rh-size-2"]').click();
  await eventually(async () => sameSet((await board(G)).pieces, cornerTiling(g2, 2, 2, 2)));
  // A click with no pointer before it, as assistive technology sends, still works.
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('[data-tg-piece]').dispatchEvent(new MouseEvent('click', {bubbles: true})));
  await eventually(async () => assert.equal((await board(G)).pieces.length, 11));
  await shot('playground');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, screenshots: 'test-results/rhombus/'}, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  console.error(error);
  console.log(JSON.stringify({passed: false, errors}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
