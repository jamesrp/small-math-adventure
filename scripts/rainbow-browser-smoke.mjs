// Plays Rainbow triangles through the real interface on the shared board of
// any triangles: taps and keys that change a dot's letter, the counter and
// a solve, stars for only rainbows (kept by Undo), That's all too soon and
// then right, walks through every door including one that starts in a
// rainbow, a Starred dots puzzle with no rainbow, peeks along the door search, running out of peeks and Start
// again, and the playground's fan with Doors on. A click with no pointer
// before it (assistive technology) still works. Same environment variables
// as the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE,
// TEST_URL, TEST_PHONE=1 for a phone viewport with touch). Screenshots go in
// test-results/rainbow/.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {boardOf, rainbows, doorsOf, cellDoors, fillings} from '../dist/families/rainbow/sperner.js';
import {peekPlan} from '../dist/families/rainbow/rainbow.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const {puzzles} = JSON.parse(await readFile(new URL('../dist/families/rainbow/rainbow.json', import.meta.url), 'utf8'));
const byId = id => puzzles.find(p => p.id === id);
const out = new URL('../test-results/rainbow/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.rb-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const dot = k => page.locator(`[data-tg-point="${k}"]`);
const middle = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = ([x, y]) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
const tapDot = async k => tapAt(await middle(dot(k)));
// The middle of a door's tap line, through the svg's own transform.
const doorAt = e => page.evaluate(e => {
  const el = document.querySelector(`[data-tg-edge="${e}"]`), m = el.ownerSVGElement.getScreenCTM(), p = el.ownerSVGElement.createSVGPoint();
  p.x = (el.x1.baseVal.value + el.x2.baseVal.value) / 2; p.y = (el.y1.baseVal.value + el.y2.baseVal.value) / 2;
  const q = p.matrixTransform(m);
  return [q.x, q.y];
}, e);
const cellAt = i => page.evaluate(i => {
  const el = document.querySelector(`[data-tg-cell="${i}"]`), m = el.ownerSVGElement.getScreenCTM();
  const pts = [...el.points].map(p => p.matrixTransform(m));
  return [pts.reduce((n, p) => n + p.x, 0) / 3, pts.reduce((n, p) => n + p.y, 0) / 3];
}, i);
// A touch tap's state can land a moment after the tap, so checks that follow a tap retry briefly.
async function eventually(check) { let last; for (let k = 0; k < 30; k++) { try { return await check(); } catch (e) { last = e; await page.waitForTimeout(100); } } throw last; }

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Rainbow QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  await page.locator('.caravan-library').getByText('Starred dots', {exact: true}).first().waitFor();

  // Move the rainbow: a tap moves it; its old place keeps a star; Undo keeps the star; a key does the same.
  const M = 'rainbow-01';
  await open(M); await fit('move the rainbow');
  assert.equal(await page.locator('[data-tg-point]').count(), 3, 'only the three side dots are controls');
  await tapDot(3);
  await eventually(async () => assert.deepEqual((await board(M)).found, [3, 1]));
  assert.equal(await page.locator('.tg-dot.rb-star').count(), 2);
  await page.locator('[data-action="undo"]').click();
  await eventually(async () => assert.deepEqual((await board(M)).found, [3, 1], 'Undo keeps the star'));
  await dot(1).focus(); await page.keyboard.press('Enter');
  await eventually(async () => assert.equal((await board(M)).labels[1], 'B'));
  await shot('move-the-rainbow');
  // Collect the rest: for each place still without a star, change dots to a lettering whose only rainbow is there.
  const mb = boardOf(byId(M).parameters.board), only = new Map();
  for (const labels of fillings(mb)) { const r = rainbows(mb.m, labels); if (r.length === 1 && !only.has(r[0])) only.set(r[0], labels); }
  for (let guard = 0; guard < 8 && !(await page.locator('#completion-heading').count()); guard++) {
    const b = await board(M), want = only.get(mb.m.cells.map((_, i) => i).find(i => !b.found.includes(i)));
    for (let k = 0; k < want.length; k++) {
      for (let n = 0; n < 3 && (await board(M)).labels[k] !== want[k]; n++) { const was = (await board(M)).labels; await tapDot(k); await eventually(async () => assert.notEqual((await board(M)).labels, was)); }
    }
  }
  await done();
  await shot('move-the-rainbow-solved');

  // Three rainbows: the middle dot goes R, B, Y; the counter follows.
  const T = 'rainbow-02';
  await open(T); await fit('three rainbows');
  await tapDot(5);
  await eventually(async () => assert.equal((await board(T)).labels[5], 'B'));
  assert.match(await page.locator('.rb-counter').innerText(), /Rainbows\s*1/);
  await page.locator('.rb-toggle').click();
  await eventually(async () => assert.ok(await page.locator('.rb-door').count() > 0, 'Doors shows the R–B edges'));
  await tapDot(5);
  await done();
  await shot('three-rainbows-solved');

  // Every count: That's all too soon, then 3 and 5.
  const C = 'rainbow-05';
  await open(C);
  await page.locator('.rb-action', {hasText: 'That’s all'}).click();
  await page.locator('.rb-note', {hasText: 'There’s another.'}).waitFor();
  await tapDot(5); await tapDot(5);
  await eventually(async () => assert.deepEqual((await board(C)).found, [1, 3]));
  await tapDot(1);
  await eventually(async () => assert.deepEqual((await board(C)).found, [1, 3, 5]));
  assert.equal(await page.locator('.rb-shelf li').count(), 3);
  await shot('every-count');
  await page.locator('.rb-action', {hasText: 'That’s all'}).click();
  await done();

  // Walks: in through each outside door, then from the rainbows no walk reached.
  for (const W of ['rainbow-03', 'rainbow-09']) {
    const q = byId(W).parameters, b = boardOf(q.board), labels = q.start, all = doorsOf(b.m, labels);
    await open(W); await fit(W);
    assert.equal(await page.locator('.rb-door').count(), all.length, `${W}: every door shows`);
    for (let guard = 0; guard < 40 && !(await page.locator('#completion-heading').count()); guard++) {
      const s = await board(W), used = new Set(s.walks.flat()), at = s.at;
      if (at >= 0) await tapAt(await doorAt(cellDoors(b.m, labels, at).find(e => !used.has(e))));
      else {
        const outside = all.find(e => b.m.outer[e] && !used.has(e));
        if (outside !== undefined) await tapAt(await doorAt(outside));
        else await tapAt(await cellAt(rainbows(b.m, labels).find(i => cellDoors(b.m, labels, i).every(e => !used.has(e)))));
      }
      await eventually(async () => { const n = await board(W); assert.notEqual(JSON.stringify(n), JSON.stringify(s)); });
      if (guard === 1) await shot(`${W}-walking`);
    }
    await done();
    await shot(`${W}-solved`);
  }

  // Starred dots: the starred bottom dot goes R, B, Y; with a Y there and on a side, no rainbow.
  const S = 'rainbow-s01';
  await open(S); await fit('no rainbow');
  assert.equal(await page.locator('.rb-star-mark').count(), 1);
  await tapDot(1);
  await eventually(async () => assert.equal((await board(S)).labels[1], 'B'));
  await tapDot(1);
  await eventually(async () => assert.equal((await board(S)).labels[1], 'Y'));
  await tapDot(3);
  await done();
  await shot('no-rainbow-solved');

  // Peeks: along the door search on the first board.
  const P = 'rainbow-10', pq = byId(P).parameters, pb = boardOf(pq.board);
  await open(P); await fit('hidden letters');
  assert.equal(await page.locator('.rb-hidden').count(), pb.m.points.length - 3);
  const seen = [...pb.corners];
  for (let k; (k = peekPlan(pb, pq.hidden[0], seen)) !== -1;) {
    await tapDot(k); seen.push(k);
    await eventually(async () => assert.equal((await board(P)).seen.length, seen.length - 3));
  }
  await done();
  await shot('hidden-letters-solved');

  // Running out of peeks row by row, then Start again hides another board.
  const Q = 'rainbow-11', qq = byId(Q).parameters;
  await open(Q); await fit('a walk that comes back');
  for (let k = 1; (await board(Q))?.seen?.length !== qq.budget; k++) {
    if (await dot(k).count()) { const before = (await board(Q))?.seen?.length || 0; await tapDot(k); await eventually(async () => assert.equal((await board(Q)).seen.length, before + 1)); }
  }
  assert.equal(await page.locator('[data-tg-point]').count(), 0, 'no peeks left');
  assert.match(await page.locator('.rb-counter strong').getAttribute('class'), /over/);
  await shot('out-of-peeks');
  await page.locator('.rb-action', {hasText: 'Start again'}).click();
  await eventually(async () => assert.deepEqual(await board(Q), {which: 1, seen: []}));

  // The playground: the fan, a middle dot, Doors; a click with no pointer still works.
  const G = 'rainbow-playground';
  await open(G); await fit('playground');
  await page.locator('[data-focus="rb-size-fan"]').click();
  await eventually(async () => assert.equal((await board(G)).board, 'fan'));
  await tapDot(6);
  await eventually(async () => assert.equal((await board(G)).labels[6], 'B'));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('[data-tg-point="7"]').dispatchEvent(new MouseEvent('click', {bubbles: true})));
  await eventually(async () => assert.equal((await board(G)).labels[7], 'B'));
  await page.locator('.rb-toggle').click();
  await eventually(async () => assert.ok(await page.locator('.rb-door').count() > 0));
  assert.match(await page.locator('.rb-counter').innerText(), /Rainbows\s*[13579]/);
  await shot('playground-fan');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, screenshots: 'test-results/rainbow/'}, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  console.error(error);
  console.log(JSON.stringify({passed: false, errors}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
