// Plays Nearest dots through the real interface: taps that put down and take
// away dots, a drag that moves one (one Undo), regions hidden until Check and
// hidden again by a change, a full set of slots, keys (arrows, Enter, Delete),
// a solve, Can't waiting for a checked try, a refused segment and a right
// one, a refused Fewest kept across Undo, Hint with Apply hint, and the
// playground's live regions. Same environment variables as the other browser
// suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a
// phone with touch). Screenshots go in test-results/sites/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/sites/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.st-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const H = ([x, y]) => [2 * x, 2 * y];
// The screen point of a grid point given in squares.
const spot = z => page.evaluate(([u, v]) => {
  const svg = document.querySelector('[data-st-board]'), m = svg.getScreenCTM(), pt = svg.createSVGPoint();
  pt.x = u; pt.y = -v;
  const r = pt.matrixTransform(m);
  return [r.x, r.y];
}, H(z));
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async z => { await tapAt(await spot(z)); await page.waitForTimeout(30); };
const press = async name => { const b = page.locator(`.st-puzzle button:has-text("${name}")`); await b.click(); await page.waitForTimeout(30); };
const cells = () => page.locator('.st-cells .st-fill').count();
let cdp = null;
async function drag(from, to) {
  const [a, b] = [await spot(from), await spot(to)];
  if (!phone) {
    await page.mouse.move(...a); await page.mouse.down();
    await page.mouse.move(...b, {steps: 10});
    await page.mouse.up();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let s = 1; s <= 10; s++) await touch('touchMove', [a[0] + (b[0] - a[0]) * s / 10, a[1] + (b[1] - a[1]) * s / 10]);
  await touch('touchEnd', b);
}
const undoButton = async () => { await page.locator('[data-action="undo"]').click(); await page.waitForTimeout(30); };
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Sites QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.match(await page.locator('[data-view-key="family-sites"]').innerText(), /Nearest dots/);

  // Puzzle 2: a strip. Taps, a drag, Undo, Check, a change, a full set of slots.
  let P = 'sites-02';
  await open(P); await fit('strip');
  assert.match(await page.locator('body').innerText(), /Make A’s region exactly the shaded part\./);
  await tap([1, 0]);
  assert.deepEqual((await board(P)).dots, [H([1, 0])], 'a tap puts a dot down');
  await tap([1, 0]);
  assert.deepEqual((await board(P)).dots, [], 'a tap on the dot takes it away');
  await tap([1, 0]);
  await drag([1, 0], [2, 0]);
  assert.deepEqual((await board(P)).dots, [H([2, 0])], 'a drag moves the dot');
  await undoButton();
  assert.deepEqual((await board(P)).dots, [H([1, 0])], 'Undo takes back the whole drag');
  await drag([1, 0], [2, 0]);
  assert.equal(await cells(), 0, 'no regions before Check');
  await press('Check');
  assert.ok(await cells() > 0, 'Check shows the regions');
  assert.equal(await page.locator('.st-check').isDisabled(), true, 'Check waits for a change');
  const focused = await page.evaluate(() => document.activeElement?.className?.baseVal ?? document.activeElement?.className);
  assert.match(String(focused), /st-board/, 'after Check, focus is on the board');
  await shot('strip-checked');
  await tap([-2, 0]);
  assert.equal(await cells(), 0, 'a change hides the regions again');
  await tap([0, 2]);
  assert.deepEqual((await board(P)).dots, [H([-2, 0]), H([2, 0])], 'no dot past the slots');
  await press('Check'); await done();
  assert.ok(await cells() > 0, 'the solved map stays shown');
  await shot('strip-solved');

  // Keys on puzzle 1: Enter shows the ring, arrows move it, Enter puts down, Delete takes away.
  P = 'sites-01';
  await open(P);
  await page.locator('[data-st-board]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.st-cursor').count(), 1, 'the first Enter shows the ring');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board(P)).dots, [[2, 0]], 'Enter puts a dot at the ring');
  assert.match(await page.locator('.st-puzzle [role=status]').innerText(), /Cursor .*a dot\./);
  await page.keyboard.press('Delete');
  assert.deepEqual((await board(P)).dots, [], 'Delete takes it away');
  for (let k = 0; k < 2; k++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board(P)).dots, [[4, 0]]);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board(P)).dots, [[2, 0]], 'Enter picks up and drops a dot');
  await page.locator('.st-check').click(); await page.waitForTimeout(30);
  assert.equal(await page.locator('#completion-heading').count(), 0, 'a dot 1 square right of the middle is not a solve');
  // Hint with Apply hint finishes it.
  for (let k = 0; k < 3; k++) { await page.locator('[data-action="hint"]').click(); await page.waitForTimeout(30); }
  assert.match(await page.locator('.hint-card').innerText(), /Move the dot to the spot 2 squares right of A\./);
  await page.locator('[data-action="apply-hint"]').click(); await page.waitForTimeout(30);
  await page.locator('[data-action="hint"]').click(); await page.waitForTimeout(30);
  await page.locator('[data-action="apply-hint"]').click();
  await done();

  // Puzzle 10: Can't waits for a checked try, refuses a wrong segment, accepts P–Q.
  P = 'sites-10';
  await open(P); await fit('take R');
  assert.equal(await page.locator('.st-cant').isDisabled(), true, 'Can’t waits for a try');
  await tap([0, 0]);
  assert.equal(await page.locator('.st-cant').isDisabled(), true, 'and for Check');
  await press('Check');
  assert.equal(await page.locator('.st-ring.bad').count(), 2, 'P and Q are lost');
  await page.locator('.st-cant').click();
  assert.equal(await page.locator('.st-cant').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.st-pick').count(), 3, 'A, P and Q can be tapped');
  // The places take Enter from the keyboard.
  await page.locator('.st-pick[aria-label="A"]').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(30);
  assert.equal(await page.locator('.st-pick[aria-label="A, chosen"]').count(), 1, 'Enter chooses A');
  await page.locator('.st-pick[aria-label="P"]').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(30);
  assert.deepEqual((await board(P)).refused, [0, 1], 'A–P is refused');
  assert.equal(await page.locator('.st-told').innerText(), 'Misses R.');
  assert.equal(await page.locator('.st-cert.bad').count(), 1, 'the wrong segment is drawn');
  assert.notEqual(await page.evaluate(() => document.activeElement?.classList.contains('st-cant')), true, 'focus is not on Can’t');
  await shot('take-refused');
  await page.locator('.st-cant').click();
  await page.locator('.st-pick[aria-label="P"]').click();
  await page.locator('.st-pick[aria-label="Q"]').click();
  await done();
  assert.equal(await page.locator('.st-cert.good').count(), 1, 'the segment through R is drawn');
  assert.ok(await cells() > 0, 'over the child’s own try');
  await shot('take-cant');

  // Puzzle 8: Fewest refused with four dots, and still refused after Undo.
  P = 'sites-08';
  await open(P);
  for (const z of [[0, 2], [2, -2], [-2, -2], [0, -2]]) await tap(z);
  await press('Check');
  await page.locator('.st-fewest').click(); await page.waitForTimeout(30);
  assert.equal(await page.locator('.st-told').innerText(), 'Fewer dots can.');
  assert.equal((await board(P)).fewer, 4);
  await undoButton();
  assert.equal((await board(P)).fewer, 4, 'Undo keeps the refusal');
  assert.equal(await page.locator('.st-fewest').isDisabled(), true, 'Fewest stays refused with four');
  await tap([0, -2]);
  await press('Check');
  await page.locator('.st-fewest').click();
  await done();
  assert.ok(await page.locator('.st-arg-line').count() >= 3, 'the argument is drawn');
  await shot('fit-done');

  // Puzzle 6: a point tie is marked, and touching counts.
  P = 'sites-06';
  await open(P);
  await tap([0, -2]); await press('Check');
  assert.equal(await page.locator('.st-tie.four.bad').count(), 1, 'the four-way place is marked');
  assert.equal(await page.locator('#completion-heading').count(), 0);
  await drag([0, -2], [0, -2.5]);
  await press('Check'); await done();

  // The playground: regions always shown and redrawn while a dot moves.
  P = 'sites-playground';
  await open(P); await fit('playground');
  assert.ok(await cells() >= 2, 'regions from the start');
  assert.equal(await page.locator('.st-check').count(), 0, 'no Check');
  await tap([0, 2]);
  assert.equal((await board(P)).dots.length, 3);
  await drag([0, 2], [0, -2]);
  assert.deepEqual((await board(P)).dots.at(-1), H([0, -2]));
  assert.equal(await page.locator('[data-action="hint"]').count(), 0, 'no Hint in the playground');
  await shot('playground');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Nearest dots browser smoke passed${phone ? ' (phone)' : ''}.`);
} finally {
  await browser.close();
}
