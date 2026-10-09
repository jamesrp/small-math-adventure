// Plays the Week 1 encore groups of Rhombus gardens through the real
// interface: the three group headings in the satchel; a duel won by copying
// (You first, then each rhombus opposite mine, laid by taps and by a slide)
// and a duel lost and played again; fewest blocks with the tools, a hexagon
// by its yellow dot, a slide that picks its own block, lifting, Clear and
// the over-budget count; red trapezoids with Can't refused and accepted,
// That's all too soon, and three re-cuts home with a pair that makes no
// hexagon. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// viewport with touch). Screenshots go in test-results/blocks/.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {gridOf, placements} from '../dist/tri-grid.js';
import {turnedPiece, winningSpots, openSpots, fillWithin, pieceKey, hexagonPairs} from '../dist/families/blocks/blockmath.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const {puzzles} = JSON.parse(await readFile(new URL('../dist/families/blocks/blocks.json', import.meta.url), 'utf8'));
const byId = id => puzzles.find(p => p.id === id), gridFor = id => gridOf(byId(id).parameters.board);
const out = new URL('../test-results/blocks/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.bk-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const button = text => page.locator('.bk-action', {hasText: text});
// A touch tap's state can land a moment after the tap, so checks that follow a tap retry briefly.
async function eventually(check) { let last; for (let k = 0; k < 30; k++) { try { return await check(); } catch (e) { last = e; await page.waitForTimeout(100); } } throw last; }
// The centre of a triangle on screen, through the svg's own transform.
const centre = async i => {
  await page.locator('.bk-board').scrollIntoViewIfNeeded();
  return page.evaluate(i => {
    const el = document.querySelector(`[data-tg-cell="${i}"]`) || document.querySelector(`.bk-board .tg-cell[data-cell="${i}"]`), m = el.ownerSVGElement.getScreenCTM();
    const pts = [...el.points].map(p => p.matrixTransform(m));
    return [pts.reduce((n, p) => n + p.x, 0) / pts.length, pts.reduce((n, p) => n + p.y, 0) / pts.length];
  }, i);
};
const tapAt = ([x, y]) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
const tap = async i => tapAt(await centre(i));
const tapPoint = async k => { const el = page.locator(`[data-tg-point="${k}"]`); await el.scrollIntoViewIfNeeded(); const b = await el.boundingBox(); await tapAt([b.x + b.width / 2, b.y + b.height / 2]); };
// Taps a piece's triangles one after the other, then waits for it to land.
async function lay(id, cells) {
  const before = (await board(id))?.pieces?.length ?? 0;
  for (const c of cells) await tap(c);
  await eventually(async () => assert.ok((await board(id)).pieces.some(p => pieceKey(p) === pieceKey(cells)), `${id}: ${cells} laid`));
  return before;
}
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
// A piece's triangles in an order a finger can follow, each next to the last.
const path = (g, piece) => { const order = [piece.find(c => piece.filter(d => g.nbr[c].includes(d)).length === 1) ?? piece[0]]; while (order.length < piece.length) order.push(piece.find(c => !order.includes(c) && g.nbr[order.at(-1)].includes(c))); return order; };

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Blocks QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const satchel = page.locator('details[data-view-key="family-rhombus"]');
  if (!(await satchel.evaluate(d => d.open))) await satchel.locator('summary').click();
  for (const heading of ['Rhombus duel', 'Fewest blocks', 'Red trapezoids']) await satchel.locator('h2', {hasText: heading}).waitFor();

  // Big hexagon: You first, then copy every rhombus, by taps and by a slide.
  const D = 'blueduel-07', gd = gridFor(D);
  await open(D); await fit('duel');
  assert.equal(await page.locator('.bk-status').innerText(), 'Who goes first?');
  assert.equal(await page.locator('[data-tg-cell]').count(), 0, 'no triangles to tap before choosing');
  await button('You first').click();
  await eventually(async () => assert.equal((await board(D)).pieces.length, 1));
  await shot('duel-app-first');
  let slid = false;
  for (let turn = 0; turn < 20 && !(await page.locator('#completion-heading').count()); turn++) {
    const b = await board(D), mine = turnedPiece(gd, b.pieces.at(-1)), count = b.pieces.length;
    if (!slid) { await slide(...mine); slid = true; } else for (const c of mine) await tap(c);
    await eventually(async () => assert.ok((await board(D)).pieces.length > count || await page.locator('#completion-heading').count()));
  }
  await done();

  // The strip: Me first in the wrong place loses; Play again; then the middle wins.
  const S = 'blueduel-02', gs = gridFor(S), [middle] = winningSpots(gs, []);
  await open(S);
  await button('Me first').click();
  await eventually(async () => assert.equal((await board(S)).first, 'you'));
  const wrong = openSpots(gs, []).find(s => pieceKey(s) !== pieceKey(middle));
  await lay(S, wrong);
  while ((await board(S)).pieces.length < 3 && openSpots(gs, (await board(S)).pieces).length) await lay(S, openSpots(gs, (await board(S)).pieces)[0]);
  await eventually(async () => assert.match(await page.locator('.bk-status').innerText(), /I win/));
  await shot('duel-lost');
  await button('Play again').click();
  await eventually(async () => assert.equal((await board(S)).first, null));
  await button('Me first').click();
  await lay(S, middle);
  const rest = openSpots(gs, (await board(S)).pieces);
  await lay(S, turnedPiece(gs, (await board(S)).pieces.at(-1)).every(c => rest.flat().includes(c)) ? turnedPiece(gs, (await board(S)).pieces.at(-1)) : rest[0]);
  await done();

  // Hexagon of two: the hexagon by its yellow dot, a slide that picks a rhombus, lifting, Clear, the count.
  const F = 'blockfill-05', gf = gridFor(F), best = fillWithin(gf, [], 6);
  await open(F); await fit('fewest');
  await page.locator('[data-focus="bk-tool-hexagon"]').click();
  await eventually(async () => assert.equal(await page.locator('[data-focus="bk-tool-hexagon"]').getAttribute('aria-pressed'), 'true'));
  const hexes = best.filter(p => p.length === 6);
  for (const hex of hexes) {
    const k = gf.points.findIndex((_, j) => gf.around[j].length === 6 && gf.around[j].every(c => hex.includes(c)));
    const before = (await board(F))?.pieces?.length ?? 0;
    await tapPoint(k);
    await eventually(async () => assert.equal((await board(F)).pieces.length, before + 1));
  }
  const [r1, ...rs] = best.filter(p => p.length === 2);
  await slide(...r1);
  await eventually(async () => assert.equal((await board(F)).pieces.length, 4, 'a slide across two triangles lays a rhombus with the hexagon chosen'));
  assert.equal(await page.locator('[data-focus="bk-tool-rhombus"]').getAttribute('aria-pressed'), 'true', 'the tool follows the slide');
  await tap(r1[0]);
  await eventually(async () => assert.equal((await board(F)).pieces.length, 3, 'a tap on a block lifts it'));
  await button('Clear').click();
  await eventually(async () => assert.equal((await board(F)).pieces.length, 0));
  await page.locator('[data-focus="bk-tool-triangle"]').click();
  for (const c of [0, 1, 2]) { await tap(c); }
  await eventually(async () => assert.equal((await board(F)).pieces.length, 3, 'triangles go down with one tap each'));
  await page.locator('[data-focus="bk-tool-hexagon"]').click();
  await button('Clear').click();
  await eventually(async () => assert.equal((await board(F)).pieces.length, 0));
  for (const hex of hexes) { const k = gf.points.findIndex((_, j) => gf.around[j].length === 6 && gf.around[j].every(c => hex.includes(c))); await tapPoint(k); }
  await page.locator('[data-focus="bk-tool-rhombus"]').click();
  await lay(F, r1); await lay(F, rs[0]);
  assert.match(await page.locator('.bk-counter').innerText(), /5\s*\/\s*6/);
  await shot('fewest');
  await lay(F, rs[1]);
  await done();

  // Red arrow: Can't is refused; then fill it.
  const A = 'redfill-01', ga = gridFor(A);
  await open(A);
  await button('Can’t').click();
  await eventually(async () => assert.equal(await page.locator('.bk-note').innerText(), 'It can be done.'));
  const fillA = fillWithin(ga, [], 4, ['trapezoid']);
  await slide(...path(ga, fillA[0]));
  await eventually(async () => assert.equal((await board(A)).pieces.length, 1, 'a slide lays a trapezoid'));
  assert.equal(await page.locator('.bk-note').count(), 0, 'the note goes after a change');
  for (const piece of fillA.slice(1)) await lay(A, piece);
  await done();

  // Red hexagon: Can't is right.
  await open('redfill-03');
  await button('Can’t').click();
  await done();

  // Two ways: That's all too soon, then both.
  const W = 'redfill-04', gw = gridFor(W), first = fillWithin(gw, [], 3, ['trapezoid']);
  await open(W);
  for (const piece of first) await lay(W, piece);
  await button('That’s all').click();
  await eventually(async () => assert.match(await page.locator('.bk-puzzle').innerText(), /There’s another\./));
  await button('Clear').click();
  await eventually(async () => assert.equal((await board(W)).pieces.length, 0));
  const second = placements(gw, 'trapezoid').filter(p => !first.some(q => pieceKey(q) === pieceKey(p)));
  const other = fillWithin(gw, [second.find(p => fillWithin(gw, [p], 3, ['trapezoid']))], 3, ['trapezoid']);
  for (const piece of other) await lay(W, piece);
  await eventually(async () => assert.equal((await board(W)).found.length, 2));
  await fit('two ways');
  await shot('two-ways');
  await button('That’s all').click();
  await done();

  // Odd way home: a ring pair makes no hexagon; the middle re-cut three times comes home.
  const Hm = 'redfill-06', gh = gridFor(Hm);
  await open(Hm); await fit('odd way home');
  const start = byId(Hm).parameters.start, [pair] = hexagonPairs(gh, start);
  const ring = start.filter(p => !pair.includes(pieceKey(p)));
  await tap(ring[0][0]); await tap(ring[1][0]);
  await eventually(async () => assert.equal(await page.locator('.bk-note').innerText(), 'Those two don’t make a hexagon.'));
  for (let k = 0; k < 3; k++) {
    const now = (await board(Hm))?.pieces ?? start, [[x, y]] = hexagonPairs(gh, now), moves = (await board(Hm))?.path?.length ?? 1;
    await tap(Number(x.split('.')[0])); await tap(Number(y.split('.')[0]));
    if (k < 2) await eventually(async () => assert.equal((await board(Hm)).path.length, moves + 1));
    if (k === 1) await shot('odd-way-home');
  }
  await done();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, screenshots: 'test-results/blocks/'}, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  console.error(error);
  console.log(JSON.stringify({passed: false, errors}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
