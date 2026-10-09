// Plays Polygon cuts through the real interface: two taps that draw a line,
// a neighbouring corner that moves the choice, a crossing that is refused
// and says why, erasing, That's all too soon and then right, flips by tap
// and by key, the flip counter and goal card, a flip back to a visited way
// refused on a tour, an odd way home, a long collection with its sorted
// row, an octagon, and the playground's shapes and tools. A click with no
// pointer before it (assistive technology) still works. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone viewport with
// touch). Screenshots go in test-results/cuts/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {polygonOf, fillings, keyOf} from '../dist/families/cuts/polygon.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/cuts/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.ct-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const LETTERS = 'ABCDEFGH';
const corner = k => page.locator(`[data-tg-point="${k}"]`);
const middle = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tapAt = ([x, y]) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
const tapCorner = async name => tapAt(await middle(corner(LETTERS.indexOf(name))));
// The middle of a line's tap target, through the svg's own transform.
const lineAt = d => page.evaluate(d => {
  const el = document.querySelector(`[data-tg-edge="${d}"]`);
  el.ownerSVGElement.scrollIntoView({block: 'nearest'});
  const m = el.ownerSVGElement.getScreenCTM(), p = el.ownerSVGElement.createSVGPoint();
  p.x = (el.x1.baseVal.value + el.x2.baseVal.value) / 2; p.y = (el.y1.baseVal.value + el.y2.baseVal.value) / 2;
  const q = p.matrixTransform(m);
  return [q.x, q.y];
}, d);
const index = (n, name) => polygonOf(n).names.indexOf(name);
const tapLine = async (n, name) => tapAt(await lineAt(index(n, name)));
// A touch tap's state can land a moment after the tap, so checks that follow a tap retry briefly.
async function eventually(check) { let last; for (let k = 0; k < 30; k++) { try { return await check(); } catch (e) { last = e; await page.waitForTimeout(100); } } throw last; }
const drawLine = async (id, name) => {
  const before = (await board(id))?.diags?.length ?? 0;
  await tapCorner(name[0]); await eventually(async () => assert.equal(await corner(LETTERS.indexOf(name[0])).getAttribute('aria-label'), `Corner ${name[0]}, chosen`));
  await tapCorner(name[1]); await eventually(async () => assert.equal((await board(id)).diags.length, before + 1, `${id}: ${name} drawn`));
};
const tail = async id => (await board(id)).path.at(-1);
const flipTo = async (id, n, name) => { const was = (await board(id)).path.length; await tapLine(n, name); await eventually(async () => assert.equal((await board(id)).path.length, was + 1, `${id}: flip ${name}`)); };

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Cuts QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  // The newest family starts open; open this one if a newer family has taken its place.
  const satchel = page.locator('details[data-view-key="family-cuts"]');
  if (!(await satchel.evaluate(d => d.open))) await satchel.locator('summary').click();
  await page.locator('.caravan-library').getByText('Polygon cuts', {exact: true}).first().waitFor();

  // Keep the line: A then B moves the choice; B–D crosses and is refused; A–D draws a way.
  const K = 'cuts-01';
  await open(K); await fit('keep the line');
  assert.equal(await page.locator('[data-tg-point]').count(), 5);
  assert.equal(await page.locator('.ct-line.kept').count(), 1);
  await tapCorner('A'); await eventually(async () => assert.equal(await corner(0).getAttribute('aria-label'), 'Corner A, chosen'));
  await tapCorner('B'); await eventually(async () => assert.equal(await corner(1).getAttribute('aria-label'), 'Corner B, chosen', 'a neighbour moves the choice'));
  await tapCorner('D');
  await eventually(async () => assert.equal(await page.locator('.ct-note').innerText(), 'Lines can’t cross.'));
  assert.equal(await page.locator('.ct-refused').count(), 1);
  await shot('keep-the-line-crossing');
  await drawLine(K, 'AD');
  await eventually(async () => assert.deepEqual((await board(K)).found, ['AC AD']));
  assert.equal(await page.locator('.ct-note').count(), 0, 'the note goes after a move');
  await page.locator('.ct-action', {hasText: 'That’s all'}).click();
  await eventually(async () => assert.match(await page.locator('.ct-puzzle').innerText(), /There’s another\./));
  await tapLine(5, 'AD');
  await eventually(async () => assert.equal((await board(K)).diags.length, 1, 'a tap on a line erases it'));
  await drawLine(K, 'CE');
  await eventually(async () => assert.equal((await board(K)).found.length, 2));
  await shot('keep-the-line-two');
  await page.locator('.ct-action', {hasText: 'That’s all'}).click();
  await done();

  // Fan to fan: flips by tap and by key, the counter, the goal card.
  const F = 'cuts-05';
  await open(F); await fit('fan to fan');
  assert.equal(await page.locator('[data-tg-point]').count(), 0, 'corners are not controls in a flip puzzle');
  assert.equal(await page.locator('.ct-card.goal').count(), 1);
  await flipTo(F, 6, 'BF');
  assert.equal(await tail(F), 'AE BD BE');
  await page.locator(`[data-tg-edge="${index(6, 'BE')}"]`).focus(); await page.keyboard.press('Enter');
  await eventually(async () => assert.equal(await tail(F), 'AD AE BD'));
  assert.match(await page.locator('.ct-counter').innerText(), /Flips\s*2\s*\/\s*3/);
  await shot('fan-to-fan');
  await flipTo(F, 6, 'BD');
  await done();

  // Round the pentagon: a flip back is refused with a note; five flips home.
  const R = 'cuts-03';
  await open(R); await fit('round the pentagon');
  await flipTo(R, 5, 'AC');
  await tapLine(5, 'BD');
  await eventually(async () => assert.equal(await page.locator('.ct-note').innerText(), 'You’ve been there.'));
  assert.equal((await board(R)).path.length, 2);
  for (const name of ['AD', 'BD', 'BE']) await flipTo(R, 5, name);
  assert.equal(await page.locator('.ct-trail li').count(), 5);
  await shot('round-the-pentagon');
  await flipTo(R, 5, 'CE');
  await done();

  // An odd way home: out and back is not enough; round a pentagon ring is.
  const H = 'cuts-06';
  await open(H); await fit('odd way home');
  assert.equal(await page.locator('.ct-card.home').count(), 1);
  await flipTo(H, 6, 'AC'); await flipTo(H, 6, 'BD');
  assert.equal(await tail(H), 'AC AD AE');
  assert.equal(await page.locator('#completion-heading').count(), 0);
  for (const name of ['AC', 'AD', 'BD', 'BE']) await flipTo(H, 6, name);
  await shot('odd-way-home');
  await flipTo(H, 6, 'CE');
  await done();

  // Fourteen ways: draw every way; the row groups them 5, 2, 2, 5.
  const W = 'cuts-08', P6 = polygonOf(6);
  await open(W);
  for (const ds of fillings(P6)) {
    if ((await board(W))?.diags?.length) { await page.locator('.ct-action', {hasText: 'Clear'}).click(); await eventually(async () => assert.equal((await board(W)).diags.length, 0)); }
    for (const name of keyOf(P6, ds).split(' ')) await drawLine(W, name);
  }
  await eventually(async () => assert.equal((await board(W)).found.length, 14));
  assert.deepEqual(await page.locator('.ct-group').evaluateAll(gs => gs.map(g => g.querySelectorAll('.ct-mini').length)), [5, 2, 2, 5]);
  await fit('fourteen ways');
  await shot('fourteen-ways');
  await page.locator('.ct-action', {hasText: 'That’s all'}).click();
  await done();

  // Octagon to a fan: eight corners fit, and three flips finish the fan.
  const O = 'cuts-09';
  await open(O); await fit('octagon');
  await shot('octagon-to-a-fan');
  for (const name of ['DH', 'DG', 'DF']) await flipTo(O, 8, name);
  await done();

  // The playground: the octagon, lines drawn, Erase, Flip, and a click with no pointer.
  const G = 'cuts-playground';
  await open(G); await fit('playground');
  await page.locator('[data-focus="ct-size-8"]').click();
  await eventually(async () => assert.equal((await board(G)).n, 8));
  for (const name of ['AC', 'AD', 'AE']) await drawLine(G, name);
  await tapLine(8, 'AD');
  await eventually(async () => assert.deepEqual((await board(G)).diags.map(d => polygonOf(8).names[d]), ['AC', 'AE', 'CE'], 'Flip is the first tool'));
  await page.locator('[data-focus="ct-tool-erase"]').click();
  await eventually(async () => assert.equal(await page.locator('[data-focus="ct-tool-erase"]').getAttribute('aria-pressed'), 'true'));
  await tapLine(8, 'CE');
  await eventually(async () => assert.equal((await board(G)).diags.length, 2));
  await page.waitForTimeout(800);
  await page.evaluate(() => { document.querySelector('[data-tg-point="5"]').dispatchEvent(new MouseEvent('click', {bubbles: true})); });
  await page.evaluate(() => { document.querySelector('[data-tg-point="7"]').dispatchEvent(new MouseEvent('click', {bubbles: true})); });
  await eventually(async () => assert.equal((await board(G)).diags.length, 3, 'clicks with no pointer draw FH'));
  await shot('playground-octagon');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, screenshots: 'test-results/cuts/'}, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  console.error(error);
  console.log(JSON.stringify({passed: false, errors}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
