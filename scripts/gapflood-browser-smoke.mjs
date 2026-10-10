// Plays the Gaps group of Meeting roads through the real interface on the
// shared graph board: the group in the satchel; drawing by taps, a slide round
// the whole triangle with the route passing on, Undo handing the pen back, a
// road tap, taking a route back by tapping a dot on it, Enter and arrow keys;
// a flood and its gap; Can't refused and right (on the tree with a tap on
// where all three routes meet, a wrong tap first; the ladder's columns); Best
// refused and right with each dot's steps from a home; every gap 0; a slide
// that runs on past the finished triangle without flooding; and the 6 x 6
// puzzle's 12,348 triangles staying quick. Same environment variables as the
// other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone with touch). Screenshots go in test-results/gapflood/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/gapflood/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.gf-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const dot = id => page.locator(`.gb-node[data-node="${id}"]`);
const road = i => page.locator(`.gb-hit[data-gb-edge="${i}"]`);
const chip = s => page.locator(`.gf-chip.t${s}`);
const told = () => page.locator('.gf-told').innerText();
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
// Taps land at a control's centre through real hit-testing, as in the flow
// and meeting suites: a straight road has a zero-width box.
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const taps = async list => { for (const id of list.split(' ')) await tap(dot(id)); };
let cdp = null;
async function slide(list) {
  const points = [];
  for (const id of list.split(' ')) points.push(await center(dot(id)));
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
  // Headless Chromium makes no click from a tap that lands the instant a
  // touch drag ends; a finger takes longer than this to come back.
  await page.waitForTimeout(400);
}
const press = name => page.getByRole('button', {name, exact: true});
const roadOf = async (a, b) => (await page.evaluate(() => [...document.querySelectorAll('.gb-hit')].map(h => [Number(h.dataset.gbEdge), h.getAttribute('aria-label')]))).find(([, label]) => label.startsWith(`Road from ${a} to ${b}`))[0];
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Gaps QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const family = page.locator('[data-view-key="family-meeting"]');
  if ((await family.getAttribute('open')) === null) await family.locator('summary').click();
  assert.equal(await family.locator('.library-group h2').innerText(), 'Gaps', 'a Gaps group in Meeting roads');
  assert.equal(await family.locator('.library-group .puzzle-card').count(), 10);

  // Puzzle 1: taps, a slide round the triangle, a road, taking back, Can't refused, a flood.
  const P = 'gapflood-01';
  await open(P); await fit('first');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Make a gap of 1 or more.');
  assert.equal(await chip('AB').getAttribute('aria-pressed'), 'true', 'AB starts chosen');
  assert.equal(await press('Best').count(), 0, 'no Best here');
  await taps('10');
  assert.deepEqual((await board(P)).routes.AB, ['00', '10'], 'a tap on the next dot draws');
  assert.equal(await dot('01').getAttribute('role'), 'img', 'a step away from B is not offered');
  await slide('10 20 21 22');
  const b1 = await board(P);
  assert.deepEqual([b1.routes.AB, b1.routes.BC], [['00', '10', '20'], ['20', '21', '22']], 'a slide finishes AB and draws BC on from B');
  assert.equal(await chip('CA').getAttribute('aria-pressed'), 'true', 'CA is chosen next');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(P)).routes.BC, ['20', '21'], 'Undo takes back BC’s last step');
  assert.equal(await chip('BC').getAttribute('aria-pressed'), 'true', 'and hands the pen back to BC');
  await taps('22');
  assert.deepEqual((await board(P)).routes.BC, ['20', '21', '22'], 'so one tap takes the step again');
  assert.equal(await chip('CA').getAttribute('aria-pressed'), 'true');
  await tap(road(await roadOf('1 across, 2 up', '2 across, 2 up')));
  assert.deepEqual((await board(P)).routes.CA, ['22', '12'], 'a tap on a road draws along it');
  await taps('11 10');
  assert.deepEqual((await board(P)).routes.CA, ['22', '12', '11', '10']);
  await taps('12');
  assert.deepEqual((await board(P)).routes.CA, ['22', '12'], 'a tap on a dot of the route takes it back to there');
  await press('Can’t').click();
  assert.equal(await told(), 'It can be done.');
  assert.equal(await press('Can’t').isDisabled(), true, 'Can’t waits for a change');
  await taps('02 01 00');
  assert.equal(await chip('CA').getAttribute('aria-pressed'), 'false', 'a finished triangle lets taps flood');
  await shot('drawn');
  await taps('02');
  await done(); await fit('flooded');
  assert.equal(await page.locator('.gb-node.source .gb-badge').textContent(), '2', 'the gap is shown on the dot');
  await page.waitForTimeout(1300);
  await shot('flooded');

  // Puzzle 2: the tree. Can't, then a tap on where all three routes meet.
  const T = 'gapflood-02';
  await open(T); await fit('tree');
  assert.equal(await page.locator('.gb-node.can-go').count(), 1, 'one step offered: the routes are forced');
  await press('Can’t').click();
  assert.equal(await press('Can’t').getAttribute('aria-pressed'), 'true');
  assert.equal(await told(), 'Tap where all three routes meet.');
  await taps('d');
  assert.equal((await board(T)).told, 'miss');
  assert.equal(await told(), 'The three routes don’t all meet there.');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'a wrong dot does not solve');
  await taps('c');
  await done();
  assert.ok(await page.locator('.gf-glow').count() > 0, 'the tripod glows');
  assert.equal(await page.locator('.gb-node.centre').count(), 1, 'its centre is ringed');
  await shot('tree');

  // Puzzle 4: keys, a flood that is short, changing a route, a flood that is enough.
  const R = 'gapflood-04';
  await open(R); await fit('grid');
  await dot('10').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(R)).routes.AB, ['00', '10'], 'Enter on a dot draws');
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight']) await page.keyboard.press(k);
  assert.deepEqual((await board(R)).routes.AB, ['00', '10', '20', '30', '40'], 'arrow keys draw');
  for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowUp');
  assert.deepEqual((await board(R)).routes.BC, ['40', '41', '42', '43', '44'], 'and pass on to BC');
  await slide('44 34 33 23 22 12 11 01 00');
  assert.equal((await board(R)).routes.CA.length, 9);
  await taps('01');
  assert.equal(await page.locator('.gb-node.source .gb-badge').textContent(), '1');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'a gap of 1 is not enough');
  await chip('CA').click();
  await taps('34');
  assert.deepEqual((await board(R)).routes.CA, ['44', '34'], 'CA taken back after choosing it');
  assert.equal((await board(R)).flood, null, 'the flood goes with the change');
  await slide('34 24 14 04 03 02 01 00');
  await taps('03');
  await done();
  assert.equal(await page.locator('.gb-node.source .gb-badge').textContent(), '3');

  // Puzzle 5: the ladder. Can't is right and the columns are ringed.
  await open('gapflood-05'); await fit('ladder');
  await press('Can’t').click();
  await done();
  assert.equal(await told(), 'Two routes cross every column.');
  assert.equal(await page.locator('.gf-column').count(), 17);
  await shot('ladder');

  // Puzzle 9: Best refused, then right with each dot's steps from a home.
  const B = 'gapflood-09';
  await open(B); await fit('best');
  assert.equal(await press('Best').isDisabled(), true, 'Best waits for a flood');
  await slide('00 10 20 30 40 41 42');
  await slide('42 32 33 34 24');
  await slide('24 14 04 03 02 01 00');
  await taps('02');
  await press('Best').click();
  assert.equal(await told(), 'A bigger gap is possible.');
  assert.equal(await press('Best').isDisabled(), true);
  await taps('03');
  await press('Best').click();
  await done(); await fit('best solved');
  assert.equal(await told(), 'Every dot is within 3 steps of A, B or C.');
  assert.equal(await page.locator('.gb-node.far').count(), 2, 'ochre rings only where a gap of 3 can be made');
  await page.waitForTimeout(1300);
  await shot('best');

  // Puzzle 3: every gap 0, by a slide that runs on past A without flooding.
  const Z = 'gapflood-03';
  await open(Z);
  await slide('00 10 20 30 40 41 42 43 44');
  await slide('44 43 42 41 40 30 20 10 00 01 02');
  await done();
  assert.equal((await board(Z)).flood, null, 'a slide does not flood');
  assert.equal(await page.locator('.gb-node.centre').count(), 1, 'the tripod’s centre: B');

  // Puzzle 10: 12,348 triangles, still quick to hint and to check Best.
  const W = 'gapflood-10';
  await open(W); await fit('big grid');
  let t0 = Date.now();
  await page.locator('[data-action=hint]').click();
  await page.locator('.hint-card, [data-action=apply-hint], .hint-text').first().waitFor({timeout: 3000}).catch(() => {});
  const hintMs = Date.now() - t0;
  assert.ok(hintMs < 1500, `the first hint comes quickly (${hintMs} ms)`);
  await slide('00 10 20 30 40 50 60 61 62 63 64 65 66 56 46 36 26 16 06 05 04 03 02 01 00');
  assert.deepEqual(Object.values((await board(W)).routes).map(r => r.length), [8, 11, 8], 'one slide draws all three routes');
  await taps('66');
  assert.equal(await page.locator('.gb-node.source .gb-badge').textContent(), '5');
  t0 = Date.now();
  await press('Best').click();
  await done();
  const bestMs = Date.now() - t0;
  assert.ok(bestMs < 1500, `Best is checked quickly (${bestMs} ms)`);
  assert.equal(await page.locator('.gb-node.far').count(), 2);
  await fit('big grid solved');
  console.log(JSON.stringify({hintMs, bestMs}));

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
