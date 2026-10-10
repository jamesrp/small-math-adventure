// Plays Ruler strips through the real interface: dragging a strip's end, a
// tap on its row, Undo across a drag, arrow keys and Home/End with focus kept
// on the board, Can't off until a try, a wrong Can't kept through Undo, a
// right Can't with its two extreme joins, widening a band by its handles
// against the app's attack, Widest refused and accepted, gaps kept as bars,
// a locked total stopping a drag, contested presses where a band's ends meet
// the strip's end in the playground, and no overflow. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/ranges/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/ranges/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.rg-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// The screen point of unit v in strip s's card row, at a height fraction of the row.
const at = (s, v, frac = 0.5) => page.evaluate(([s, v, frac]) => {
  const svg = document.querySelector('[data-rg-board]'), hit = svg.querySelector(`[data-rg-row="${s}"]`), m = svg.getScreenCTM(), pt = svg.createSVGPoint();
  pt.x = 7 + v * 10; pt.y = Number(hit.getAttribute('y')) + frac * Number(hit.getAttribute('height'));
  const r = pt.matrixTransform(m);
  return [r.x, r.y];
}, [s, v, frac]);
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const tap = async (s, v, frac) => tapAt(await at(s, v, frac));
let cdp = null;
async function drag(s, from, to, frac = 0.5) {
  const a = await at(s, from, frac), b = await at(s, to, frac);
  if (!phone) { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b, {steps: 10}); await page.mouse.up(); return; }
  cdp ||= await context.newCDPSession(page);
  const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await touch('touchStart', a);
  for (let k = 1; k <= 10; k++) await touch('touchMove', [a[0] + (b[0] - a[0]) * k / 10, a[1] + (b[1] - a[1]) * k / 10]);
  await touch('touchEnd', b);
}
const focused = () => page.evaluate(() => document.activeElement?.dataset?.focus || document.activeElement?.className?.baseVal || document.activeElement?.tagName);
const button = name => page.locator('.rg-button', {hasText: name});
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Ranges QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-ranges"] .family-ink-symbol').innerText(), '↔');

  // Puzzle 1: a drag, Undo, a tap, a wrong Can't kept through Undo, a break.
  await open('ranges-01'); await fit('puzzle 1');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a try');
  await drag('A', 5, 4);
  assert.equal((await board('ranges-01')).len.A, 4, 'a drag sets A');
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board('ranges-01')).len.A, 5, 'Undo takes back the whole drag');
  await drag('A', 5, 9);
  assert.equal((await board('ranges-01')).len.A, 6, 'a drag past the band stops at its end');
  await button('Can’t').click();
  assert.equal((await board('ranges-01')).cant, 'no');
  assert.equal(await page.locator('.rg-note').innerText(), 'It can break.');
  assert.notEqual(await focused(), 'rg-cant', 'focus leaves Can’t');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await button('Can’t').isDisabled(), true, 'Undo keeps the refusal');
  assert.equal((await board('ranges-01')).cant, 'no');
  await tap('A', 4); await tap('B', 2.2);
  assert.deepEqual((await board('ranges-01')).len, {A: 4, B: 3}, 'taps set lengths, held inside the band');
  await done(); await shot('01-broken');

  // Puzzle 4: keys, a right Can't, the two extreme joins.
  await open('ranges-04');
  await page.locator('[data-focus="rg-knob-A"]').focus(); await page.keyboard.press('ArrowRight');
  assert.equal((await board('ranges-04')).len.A, 5, 'an arrow key moves a focused end');
  assert.equal(await focused(), 'rg-knob-A', 'focus stays on the end');
  await page.keyboard.press('Home');
  await page.locator('[data-focus="rg-knob-B"]').focus(); await page.keyboard.press('Home');
  assert.deepEqual((await board('ranges-04')).len, {A: 4, B: 4});
  await button('Can’t').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'Show the shortest and the longest join.');
  assert.equal(await page.locator('.rg-pin').count(), 1, 'the shortest join is pinned at the press');
  assert.match(await focused(), /^rg-knob|rg-knob/, 'focus goes to the board, not Can’t');
  await page.locator('[data-focus="rg-knob-A"]').focus(); await page.keyboard.press('End');
  await page.locator('[data-focus="rg-knob-B"]').focus(); await page.keyboard.press('End');
  await done(); await shot('04-cant');

  // Puzzle 5: the band's handles, the app's attack, Widest refused and accepted.
  await open('ranges-05'); await fit('puzzle 5');
  assert.equal(await page.locator('.rg-end.broken').count(), 1, 'the app shows a join that escapes');
  assert.equal(await page.locator('[data-focus="rg-knob-A"]').count(), 0, 'the strips are the app’s before Widest');
  await drag('B', 6, 5, 0.3);
  assert.deepEqual((await board('ranges-05')).card, [5, 5], 'a drag on the band’s right end');
  assert.equal(await page.locator('.rg-end.broken').count(), 0, 'nothing escapes 5 to 5');
  await button('Widest').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'It can be wider.');
  assert.equal(await button('Widest').isDisabled(), true, 'the answer waits for a change');
  await tap('B', 4, 0.3);
  assert.deepEqual((await board('ranges-05')).card, [4, 5], 'a tap left of the band moves its left end');
  await button('Widest').click();
  assert.equal((await board('ranges-05')).claim, 'yes');
  await page.locator('[data-focus="rg-knob-A"]').waitFor();
  const b5 = await board('ranges-05'), other = b5.len.A === 3 ? {A: 4, B: 5} : {A: 3, B: 4};
  await tap('A', other.A); await tap('B', other.B);
  await done(); await shot('05-widest');

  // Puzzle 6: gaps kept as bars.
  await open('ranges-06');
  await tap('A', 6);
  assert.equal(await page.locator('.rg-kept').count(), 2, 'the top pair’s gap is kept at once');
  await tap('B', 4);
  assert.equal(await page.locator('.rg-kept').count(), 3);
  await tap('A', 4); await tap('B', 6);
  await done(); await shot('06-gaps');

  // Puzzle 8: a locked total stops A at 9.
  await open('ranges-08'); await fit('puzzle 8');
  await drag('A', 8, 12);
  assert.deepEqual((await board('ranges-08')).len, {A: 9, B: 3}, 'A stops at 9 and B moves with it');
  await tap('B', 5);
  await done(); await shot('08-total');

  // The playground: where a band's two ends meet, the press side picks; lower
  // in the row, the strip's end is nearer.
  await open('ranges-playground'); await fit('playground');
  await page.locator('[data-focus="rg-card-A-hi"]').focus(); await page.keyboard.press('Home');
  assert.deepEqual((await board('ranges-playground')).cards.A, [2, 2], 'Home takes the right end down to the left end');
  assert.equal((await board('ranges-playground')).len.A, 2, 'the strip stays inside its band');
  await tap('A', 4, 0.15);
  assert.deepEqual((await board('ranges-playground')).cards.A, [2, 4], 'the press right of the meeting ends moves the right end');
  await tap('A', 2.6, 0.62);
  assert.equal((await board('ranges-playground')).len.A, 3, 'a press low in the row moves the strip’s end');
  await fit('playground after moves'); await shot('playground');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
