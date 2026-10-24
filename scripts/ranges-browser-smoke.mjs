// Plays Ruler strips through the real interface: dragging a strip's end, a
// tap on its row, Undo across a drag, arrow keys and Home/End with focus kept
// on the board, Can't off until a try, Can't and Widest with no verdict on
// the press and judged by two pins (a wrong pair refused; Undo keeps the
// refusal only where the strips found it, so one press takes back the refused
// pin with the move before it, and the same pins are refused again), widening
// a band by its handles against the app's attack, a tap taking a band's right
// end down onto its left end, gaps pinned (the cross pairing, the same A
// twice), A twice in a join, a locked total stopping a drag, contested presses
// where a band's ends meet the strip's end in the playground, no overflow,
// and on a phone 44 px reaches and 13 px numbers. Same environment variables
// as the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE,
// TEST_URL, TEST_PHONE=1 for a phone with touch). Screenshots go in test-results/ranges/.
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
  const svg = document.querySelector('[data-rg-board]'), hit = svg.querySelector(`[data-rg-row="${s}"]`);
  hit.scrollIntoView({block: 'nearest'});
  const m = svg.getScreenCTM(), pt = svg.createSVGPoint();
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
// The focused element's key, or BUTTON when a button has focus (claim buttons
// carry the board's key so that focus returns to the board after a press).
const focused = () => page.evaluate(() => { const el = document.activeElement; return el?.tagName === 'BUTTON' ? 'BUTTON' : el?.dataset?.focus || el?.className?.baseVal || el?.tagName; });
const button = name => page.locator('.rg-button', {hasText: name});
// On a phone each control's reach (the part of its card row that a press
// sends to it) is at least 44 px both ways, and numbers and letters 13 px.
async function phoneSizes(label) {
  if (!phone) return;
  const z = await page.evaluate(() => {
    const scale = document.querySelector('[data-rg-board]').getScreenCTM().a;
    return {reach: [...document.querySelectorAll('.rg-reach')].map(r => { const b = r.getBoundingClientRect(); return Math.min(b.width, b.height); }), text: [...document.querySelectorAll('.rg-mark,.rg-letter,.rg-num')].map(t => parseFloat(getComputedStyle(t).fontSize) * scale)};
  });
  assert.ok(z.reach.length && Math.min(...z.reach) >= 44, `${label}: every reach 44 px or more (${Math.round(Math.min(...z.reach))})`);
  assert.ok(Math.min(...z.text) >= 12.9, `${label}: numbers and letters 13 px (${Math.min(...z.text).toFixed(1)})`);
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Ranges QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-ranges"] .family-ink-symbol').innerText(), '↔');

  // Puzzle 1: a drag, Undo, a tap, a wrong Can't with no verdict on the press,
  // its pins refused, one Undo taking back the pin and the tap before it, the
  // same pins refused again, then a break.
  await open('ranges-01'); await fit('puzzle 1');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a try');
  await drag('A', 5, 4);
  assert.equal((await board('ranges-01')).len.A, 4, 'a drag sets A');
  await page.locator('[data-action="undo"]').click();
  assert.equal((await board('ranges-01')).len.A, 5, 'Undo takes back the whole drag');
  await drag('A', 5, 9);
  assert.equal((await board('ranges-01')).len.A, 6, 'a drag past the band stops at its end');
  await button('Can’t').click();
  const c1 = await board('ranges-01');
  assert.deepEqual([c1.cant, c1.told], [true, null], 'Can’t gives no verdict on the press');
  assert.equal(await page.locator('.rg-note').innerText(), 'Pin the shortest and the longest join.', 'the same words as on a board that holds');
  assert.match(await focused(), /rg-knob|rg-card/, 'focus leaves Can’t for the board');
  await button('Pin').click();
  await tap('A', 4);
  await button('Pin').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'A join can be shorter.', '8 and 10 are refused');
  // Undo keeps the refusal while the strips are where it found them, which
  // looks just like the refusal, so the press goes on to take back the tap.
  await page.locator('[data-action="undo"]').click();
  const u1 = await board('ranges-01');
  assert.deepEqual([u1.len, u1.pins, u1.told], [{A: 6, B: 4}, [{A: 6, B: 4}], null], 'one Undo takes back the refused pin and the tap to 4');
  assert.equal(await page.locator('.rg-note').count(), 0, 'the refusal goes with the tap');
  assert.equal(await page.locator('.rg-pin').count(), 1, 'and the first pin is back');
  await tap('A', 4);
  await button('Pin').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'A join can be shorter.', 'the same pins are refused again');
  await tap('B', 2.2);
  assert.deepEqual((await board('ranges-01')).len, {A: 4, B: 3}, 'taps set lengths, held inside the band');
  await done(); await shot('01-broken');

  // Puzzle 4: keys, a right Can't, the two extreme joins.
  await open('ranges-04');
  await page.locator('.rg-knob[data-focus="rg-knob-A"]').focus(); await page.keyboard.press('ArrowRight');
  assert.equal((await board('ranges-04')).len.A, 5, 'an arrow key moves a focused end');
  assert.equal(await focused(), 'rg-knob-A', 'focus stays on the end');
  await page.keyboard.press('Home');
  await page.locator('.rg-knob[data-focus="rg-knob-B"]').focus(); await page.keyboard.press('Home');
  assert.deepEqual((await board('ranges-04')).len, {A: 4, B: 4});
  await button('Can’t').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'Pin the shortest and the longest join.');
  assert.equal(await page.locator('.rg-pin').count(), 0, 'nothing is pinned or marked for the child');
  assert.match(await focused(), /rg-knob/, 'focus goes to the board, not Can’t');
  await button('Pin').click();
  assert.equal(await page.locator('.rg-pin').count(), 1, 'the shortest join is pinned');
  assert.match(await focused(), /rg-knob/, 'focus goes back to the strips after a pin');
  await page.locator('.rg-knob[data-focus="rg-knob-A"]').focus(); await page.keyboard.press('End');
  await button('Pin').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'A join can be longer.', 'a wrong pair of pins is refused');
  assert.equal(await page.locator('.rg-pin').count(), 0, 'the refusal clears the pins');
  await shot('04-refused');
  await page.locator('[data-action="undo"]').click();
  const u4 = await board('ranges-04');
  assert.deepEqual([u4.len, u4.pins, u4.told], [{A: 4, B: 4}, [{A: 4, B: 4}], null], 'one Undo takes back the refused pin and End');
  assert.equal(await page.locator('.rg-note').count(), 0, 'the refusal goes with End');
  assert.equal(await page.locator('.rg-pin').count(), 1, 'and the shortest join’s pin is back');
  await page.locator('.rg-knob[data-focus="rg-knob-A"]').focus(); await page.keyboard.press('End');
  await button('Pin').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'A join can be longer.', 'the same pins are refused again');
  assert.equal(await page.locator('.rg-pin').count(), 0, 'and the pins clear');
  // A first pin that is neither extreme is not judged unasked.
  await button('Pin').click();
  assert.equal(await page.locator('.rg-pin').count(), 1);
  assert.equal(await page.locator('.feedback').innerText(), '', 'one pin is not judged alone');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await page.locator('.rg-pin').count(), 0);
  await page.locator('.rg-knob[data-focus="rg-knob-A"]').focus(); await page.keyboard.press('Home');
  await button('Pin').click();
  await page.locator('.rg-knob[data-focus="rg-knob-A"]').focus(); await page.keyboard.press('End');
  await page.locator('.rg-knob[data-focus="rg-knob-B"]').focus(); await page.keyboard.press('End');
  await button('Pin').click();
  await done(); await shot('04-cant');

  // Puzzle 5: the band's handles, the app's attack, Widest judged by its pins.
  const key = async (s, k) => { await page.locator(`.rg-knob[data-focus="rg-knob-${s}"]`).focus(); await page.keyboard.press(k); };
  await open('ranges-05'); await fit('puzzle 5');
  assert.equal(await page.locator('.rg-end.broken').count(), 1, 'the app shows a join that escapes');
  assert.equal(await page.locator('.rg-knob[data-focus="rg-knob-A"]').count(), 0, 'the strips are the app’s before Widest');
  assert.equal(await button('Widest').isDisabled(), true, 'Widest waits for a try');
  await drag('B', 6, 5, 0.3);
  assert.deepEqual((await board('ranges-05')).card, [5, 5], 'a drag on the band’s right end');
  await page.locator('[data-action="undo"]').click();
  await tap('B', 5, 0.3);
  assert.deepEqual((await board('ranges-05')).card, [5, 5], 'a tap on the left end’s own unit takes the right end down to it');
  assert.equal(await page.locator('.rg-end.broken').count(), 0, 'nothing escapes 5 to 5');
  await button('Widest').click();
  assert.deepEqual([(await board('ranges-05')).claim, (await board('ranges-05')).told], [true, null], 'Widest gives no verdict on the press');
  assert.equal(await page.locator('.rg-note').innerText(), 'Pin the shortest and the longest join.');
  await key('A', 'Home'); await button('Pin').click();
  await key('A', 'End'); await button('Pin').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'The band can be wider.', '8 and 9 are off the window’s left edge');
  await page.locator('[data-action="undo"]').click();
  const u5 = await board('ranges-05');
  assert.deepEqual([u5.len, u5.pins, u5.told, u5.claim], [{A: 3, B: 5}, [{A: 3, B: 5}], null, true], 'one Undo takes back the refused pin and End, not Widest');
  assert.equal(await page.locator('.rg-note').count(), 0, 'the refusal goes with End');
  await key('A', 'End'); await button('Pin').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'The band can be wider.', 'the same pins are refused again');
  await tap('B', 4, 0.3);
  const b5 = await board('ranges-05');
  assert.deepEqual([b5.card, b5.claim], [[4, 5], false], 'a tap left of the band moves its left end and takes Widest back');
  await button('Widest').click();
  const m5 = await board('ranges-05');
  assert.ok(m5.len.A + m5.len.B > 7 && m5.len.A + m5.len.B < 9, 'after Widest the strips start between the edges');
  await key('A', 'Home'); await key('B', 'Home'); await button('Pin').click();
  await key('A', 'End'); await key('B', 'End'); await button('Pin').click();
  await done(); await shot('05-widest');

  // Puzzle 6: two separate strips, the cross pairing.
  await open('ranges-06'); await fit('puzzle 6'); await phoneSizes('puzzle 6');
  await tap('A', 15); await tap('B', 10); await button('Pin').click();
  await tap('A', 13); await button('Pin').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'A gap can be smaller.', '5 and 3 are refused');
  await tap('A', 15); await button('Pin').click();
  await tap('A', 13); await tap('B', 12); await button('Pin').click();
  await done(); await shot('06-cross');

  // Puzzle 7: gaps kept as bars.
  await open('ranges-07');
  await tap('A', 6); await tap('B', 4);
  assert.equal(await page.locator('.rg-kept').count(), 0, 'no gap is marked before a pin');
  await button('Pin').click();
  assert.equal(await page.locator('.rg-kept').count(), 2, 'a pin keeps both pairs’ gaps');
  await tap('A', 5); await button('Pin').click();
  assert.equal(await page.locator('.rg-note').innerText(), 'A gap can be smaller.');
  await tap('A', 6); await button('Pin').click();
  await tap('A', 4); await tap('B', 6);
  await button('Pin').click();
  await done(); await shot('07-gaps');

  // Puzzle 8: A twice in the join; its band's ends by drag and tap.
  await open('ranges-08'); await fit('puzzle 8'); await phoneSizes('puzzle 8');
  await drag('A', 6, 5, 0.3); await tap('A', 3, 0.3);
  assert.deepEqual((await board('ranges-08')).card, [3, 5]);
  await button('Widest').click(); await phoneSizes('puzzle 8 after Widest');
  await key('A', 'Home'); await key('B', 'Home'); await button('Pin').click();
  await key('A', 'End'); await key('B', 'End'); await button('Pin').click();
  await done(); await shot('08-twice');

  // Puzzle 9: a locked total stops A at 9.
  await open('ranges-09'); await fit('puzzle 9');
  await drag('A', 8, 12);
  assert.deepEqual((await board('ranges-09')).len, {A: 9, B: 3}, 'A stops at 9 and B moves with it');
  await button('Pin').click();
  await tap('B', 5);
  await button('Pin').click();
  await done(); await shot('09-total');

  // The playground: where a band's two ends meet, the press side picks; lower
  // in the row, the strip's end is nearer.
  await open('ranges-playground'); await fit('playground'); await phoneSizes('playground');
  await page.locator('.rg-handle[data-focus="rg-card-A-hi"]').focus(); await page.keyboard.press('Home');
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
