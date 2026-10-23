// Plays Seed plots through the real interface on the shared square grid:
// seeds planted by taps and keys, squares grown by taps and by one slide, a
// seed carried by a slide, the square and tray shaking at a tap that can do
// nothing, Can't asked to spread and then accepted with its fence, every seed
// needed with the small plots, the finishes with Clear and That's all, a rock
// with no control, a click with no pointer (assistive technology) and the
// playground's sizes and Regrow. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone viewport with touch slides). Screenshots go in
// test-results/seeds/.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const {puzzles} = JSON.parse(await readFile(new URL('../dist/families/seeds/seeds.json', import.meta.url), 'utf8'));
const byId = id => puzzles.find(p => p.id === id);
const out = new URL('../test-results/seeds/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.sd-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// A touch tap's click can land a moment after the tap resolves, so checks that follow a tap retry briefly.
async function eventually(check) { let last; for (let k = 0; k < 30; k++) { try { return await check(); } catch (e) { last = e; await page.waitForTimeout(100); } } throw last; }
// Square numbers in reading order of the plot's own squares.
function sq(id, list) {
  const q = byId(id).parameters, cells = q.cells || Array.from({length: q.cols * q.rows}, (_, i) => [i % q.cols, Math.floor(i / q.cols)]);
  return list.map(([x, y]) => cells.findIndex(c => c[0] === x && c[1] === y));
}
const seedsOf = async id => (await board(id))?.seeds || [];
const grownOf = async id => (await board(id))?.grown || [];
const centre = async i => { const b = await page.locator(`[data-sg-cell="${i}"]`).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = ([x, y]) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
const tap = async i => tapAt(await centre(i));
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
const fence = () => page.locator('.sd-fence b').innerText().then(Number);
const button = name => page.locator('.sd-button', {hasText: name});
const note = text => page.locator('.sd-note', {hasText: text}).waitFor({timeout: 3000});
async function tapEach(id, list, check) { for (const i of sq(id, list)) { await tap(i); await page.waitForTimeout(phone ? 120 : 40); } if (check) await eventually(check); }

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Seeds QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Three seeds: plant by taps and a key, grow by a tap and a slide, the shake, the diagonal fills.
  const A = 'seeds-01';
  await open(A); await fit('three seeds');
  await tapEach(A, [[0, 0], [1, 1]], async () => assert.deepEqual(await seedsOf(A), sq(A, [[0, 0], [1, 1]])));
  assert.equal(await fence(), 8);
  await tap(sq(A, [[1, 0]])[0]);
  await eventually(async () => assert.deepEqual(await grownOf(A), sq(A, [[1, 0]])));
  assert.equal(await fence(), 8, 'two neighbours: the fence stays');
  await page.locator(`[data-sg-cell="${sq(A, [[2, 2]])[0]}"]`).focus(); await page.keyboard.press('Enter');
  await eventually(async () => assert.equal((await seedsOf(A)).length, 3));
  assert.equal(await page.locator('.sd-tray i.on').count(), 0, 'the tray is empty');
  await tap(sq(A, [[0, 2]])[0]);
  await eventually(async () => assert.match(await page.locator('.sd-tray').getAttribute('class'), /nudge/, 'a tap that can do nothing shakes the tray'));
  await shot('three-seeds-growing');
  await slide(...sq(A, [[2, 1], [2, 2], [1, 2]]));
  await eventually(async () => assert.equal((await grownOf(A)).length, 3), 'a slide grows each square in turn');
  await tapEach(A, [[0, 1], [2, 0]]);
  await tap(sq(A, [[0, 2]])[0]);
  await done();
  await shot('three-seeds-solved');

  // Three for sixteen: Can't with seeds touching, a seed carried by a slide, then Can't with its fence.
  const C = 'seeds-05';
  await open(C); await fit('three for sixteen');
  await tapEach(C, [[0, 0], [1, 0], [3, 3]], async () => assert.equal((await seedsOf(C)).length, 3));
  assert.equal(await fence(), 10);
  await button('Can’t').click();
  await note('Spread the seeds out first.');
  assert.equal(await button('Can’t').isDisabled(), true, 'a told claim waits for a change');
  await slide(...sq(C, [[1, 0], [2, 0], [2, 1]]));
  await eventually(async () => assert.deepEqual(await seedsOf(C), sq(C, [[0, 0], [2, 1], [3, 3]])));
  assert.equal(await page.locator('.sd-note').count(), 0, 'new seeds clear the answer');
  assert.equal(await fence(), 12);
  await button('Can’t').click();
  await done();
  await note('Growing never makes the fence longer.');
  await shot('cant-certificate');

  // A rock: no control on it, and its sides count in the full plot's fence.
  const R = 'seeds-08';
  await open(R); await fit('a rock');
  assert.equal(await page.locator('[data-sg-cell]').count(), 15, 'the rock takes no seed');
  assert.match(await page.locator('.sd-fence').innerText(), /0\s*\/\s*20/);

  // Every seed needed: a spare seed shows in the small plots, then the middles of the sides.
  const N = 'seeds-06';
  await open(N); await fit('every seed needed');
  await tapEach(N, [[0, 0], [1, 1], [2, 2], [2, 0]], async () => assert.equal((await seedsOf(N)).length, 4));
  await tapEach(N, [[1, 0], [2, 1], [1, 2]]);
  await slide(...sq(N, [[0, 1], [0, 2]]));
  await eventually(async () => assert.equal((await grownOf(N)).length, 5));
  await note('A seed isn’t needed.');
  assert.equal(await page.locator('.sd-minis li').count(), 4);
  assert.ok(await page.locator('.sd-minis li.full').count() > 0, 'a spare seed’s plot is full');
  await shot('needed-spare');
  await tapEach(N, [[0, 0], [1, 1], [2, 2], [2, 0]], async () => assert.deepEqual(await seedsOf(N), []));
  await tapEach(N, [[1, 0], [0, 1], [2, 1], [1, 2]], async () => assert.equal((await seedsOf(N)).length, 4));
  await tapEach(N, [[0, 0], [2, 0], [0, 2], [2, 2], [1, 1]]);
  await done();
  await shot('needed-solved');

  // How many squares?: finishes join the chips, That's all too soon, Clear, all four.
  const F = 'seeds-03';
  await open(F); await fit('finishes');
  await tapEach(F, [[0, 0], [1, 0], [2, 0]]);
  await eventually(async () => assert.equal(await page.locator('.sd-chips li').count(), 1));
  await button('That’s all').click();
  await note('There’s another.');
  await button('Clear').click();
  await eventually(async () => assert.deepEqual(await seedsOf(F), []));
  await tapEach(F, [[0, 0], [2, 0], [1, 1]]);
  await tap(sq(F, [[1, 0]])[0]);
  await slide(...sq(F, [[0, 1], [1, 1], [2, 1]]));
  await eventually(async () => assert.equal(await page.locator('.sd-chips li.here').innerText(), '6'));
  await button('Clear').click();
  await tapEach(F, [[0, 0], [1, 0], [0, 1], [1, 1]]);
  await eventually(async () => assert.equal(await page.locator('.sd-chips li').count(), 3), 'three seeds and a grown square: 4');
  await button('Clear').click();
  await tapEach(F, [[0, 0], [1, 1], [2, 2], [1, 0], [0, 1], [2, 1], [1, 2], [2, 0], [0, 2]]);
  await eventually(async () => assert.equal(await page.locator('.sd-chips li').count(), 4));
  await shot('finishes-all');
  await button('That’s all').click();
  await done();

  // The playground: a size, a click with no pointer, Regrow, Clear.
  const G = 'seeds-playground';
  await open(G); await fit('playground');
  await page.locator('.sd-size').first().click();
  await eventually(async () => assert.equal((await board(G)).size, 4));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('[data-sg-cell="0"]').dispatchEvent(new MouseEvent('click', {bubbles: true})));
  await eventually(async () => assert.deepEqual((await board(G)).seeds, [0]));
  await tap(5);
  await eventually(async () => assert.deepEqual((await board(G)).seeds, [0, 5]));
  await slide(1, 0, 4);
  await eventually(async () => assert.deepEqual((await board(G)).grown, [1, 4]));
  assert.equal(await fence(), 8);
  await shot('playground');
  await button('Regrow').click();
  await eventually(async () => assert.deepEqual((await board(G)).grown, []));
  await button('Clear').click();
  await eventually(async () => assert.deepEqual((await board(G)).seeds, []));
  assert.equal(await page.locator('[data-action="hint"]').count(), 0, 'no hints in the playground');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, screenshots: 'test-results/seeds/'}, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  console.error(error);
  console.log(JSON.stringify({passed: false, errors}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
