// Plays Fold and stretch (the Ruler strips group from Week 92) through the
// real interface: the group in the satchel, dragging and tapping markers and
// bands, a pair kept on the shelf, That's all refused and kept through Undo,
// a claim broken by a tap, Can't with wrong and right pins, the widest band
// set by keys with Widest and its pin, goal chips met, Apply hint, focus
// after moves, the handle's and the marker's lanes after Widest, no page
// overflow, and on a phone 44 px reaches and 13 px numbers.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// SHOTS=<dir> also saves tablet (1024 px) and phone (375 px) screenshots.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.tn-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const button = name => page.getByRole('button', {name, exact: true});
const note = () => page.locator('.tn-note').innerText();
// Where a position (in units, or on the enlarged 0–1 ruler) is on the start
// row, in page pixels: 13 units down, or a height fraction of the row.
async function spot(v, zoom = false, frac = null) {
  const svg = page.locator('.tn-board'), b = await svg.boundingBox(), [, , w, h] = (await svg.getAttribute('viewBox')).split(' ').map(Number);
  const x = 14 + (zoom ? v * 160 : v * 10), row = page.locator('.tn-hit');
  const y = frac === null ? 13 : Number(await row.getAttribute('y')) + frac * Number(await row.getAttribute('height'));
  return {x: b.x + x / w * b.width, y: b.y + y / h * b.height};
}
const tapAt = async (v, zoom, frac) => { const {x, y} = await spot(v, zoom, frac); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
// On a phone each control's reach (the part of the start row that a press
// sends to it) is at least 44 px both ways, and the numbers 13 px.
async function phoneSizes(label) {
  if (!phone) return;
  const z = await page.evaluate(() => {
    const scale = document.querySelector('.tn-board').getScreenCTM().a;
    return {reach: [...document.querySelectorAll('.tn-reach')].map(r => { const b = r.getBoundingClientRect(); return Math.min(b.width, b.height); }), text: [...document.querySelectorAll('.tn-mark,.tn-rowlabel')].map(t => parseFloat(getComputedStyle(t).fontSize) * scale)};
  });
  assert.ok(z.reach.length && Math.min(...z.reach) >= 44, `${label}: every reach 44 px or more (${Math.round(Math.min(...z.reach))})`);
  assert.ok(Math.min(...z.text) >= 12.9, `${label}: numbers 13 px (${Math.min(...z.text).toFixed(1)})`);
}
async function drag(from, to, zoom) {
  const a = await spot(from, zoom), b = await spot(to, zoom);
  if (phone) {
    // Touch drags as pointer events through the page.
    await page.evaluate(([a, b]) => {
      const el = document.elementFromPoint(a.x, a.y), opts = (x, y) => ({pointerId: 7, isPrimary: true, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, button: 0});
      el.dispatchEvent(new PointerEvent('pointerdown', opts(a.x, a.y)));
      for (let k = 1; k <= 6; k++) document.dispatchEvent(new PointerEvent('pointermove', opts(a.x + (b.x - a.x) * k / 6, a.y)));
      document.dispatchEvent(new PointerEvent('pointerup', opts(b.x, b.y)));
    }, [a, b]);
  } else {
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let k = 1; k <= 6; k++) await page.mouse.move(a.x + (b.x - a.x) * k / 6, a.y);
    await page.mouse.up();
  }
}

try {
  await page.goto(base); await page.locator('#nickname').fill('Folds QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').click();
  const ruler = page.locator('.satchel-family[data-view-key="family-ranges"]');
  await ruler.locator('summary').click();
  assert.equal(await ruler.locator('.library-group h2', {hasText: 'Fold and stretch'}).count(), 1, 'the group is in Ruler strips');

  // Puzzle 1: drag a marker, tap the other, a pair on the shelf; That’s all refused and kept through Undo.
  await open('tent-01'); await fit('tent-01'); await phoneSizes('tent-01');
  assert.equal(await page.locator('.tn-shelf').count(), 0, 'no shelf, and no slot per answer, before a find');
  await drag(2, 3);
  assert.deepEqual((await board('tent-01')).at, [96, 160], 'the yellow marker dragged from 2 to 3');
  await tapAt(13);
  assert.deepEqual((await board('tent-01')).at, [96, 416], 'a tap moves the nearer marker');
  assert.equal(await page.locator('.tn-item').innerText(), '3 and 13');
  assert.equal(await page.locator('.tn-meet').count(), 1, 'the meeting is ringed');
  await button('That’s all').click();
  assert.equal(await note(), 'There is another.');
  assert.ok(await button('That’s all').isDisabled());
  await page.locator('[data-action=undo]').click();
  assert.ok(await button('That’s all').isDisabled(), 'Undo keeps the refusal');
  assert.equal(await page.locator('.tn-item').count(), 1, 'Undo keeps the shelf');
  // Keys: a focused marker moves one unit.
  await page.locator('.tn-knob.m-sun').focus(); await page.keyboard.press('ArrowRight');
  assert.equal((await board('tent-01')).at[0], 128);
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('tn-knob')), 'focus stays on a marker after a key move');

  // Puzzle 2: a tap in the middle of the band breaks the claim.
  await open('tent-02'); await fit('tent-02');
  await tapAt(8); await done();
  assert.equal(await page.locator('.tn-dot.broken').count(), 1, 'the landing outside the window is red');

  // Puzzle 3: Can’t, a wrong pair of pins refused, the right pair accepted.
  await open('tent-03'); await fit('tent-03');
  assert.ok(await button('Can’t').isDisabled(), 'Can’t waits for a try');
  await tapAt(11);
  await button('Can’t').click();
  assert.equal(await note(), 'Pin the lowest and the highest landing.');
  await button('Pin').click();
  assert.equal(await page.locator('.feedback').innerText(), '', 'one pin is not judged');
  await tapAt(13); await button('Pin').click();
  assert.equal(await note(), 'A start lands lower.');
  await tapAt(12); await button('Pin').click();
  assert.equal(await note(), 'Pin the lowest and the highest landing.', 'the line comes back once a new pin replaces the refusal');
  await page.locator('[data-action=undo]').click();
  await tapAt(15); await button('Pin').click(); await tapAt(10); await button('Pin').click();
  await done();
  assert.equal(await page.locator('.tn-span').count(), 1);

  // Puzzle 9: the band’s end by keys, Widest, the marker to the end, Pin.
  await open('tent-09'); await fit('tent-09');
  assert.equal(await page.locator('.tn-dot.broken').count(), 1, 'the app shows a start that escapes');
  assert.ok(await button('Widest').isDisabled(), 'Widest waits for the band to move');
  await page.locator('.tn-handle').focus();
  for (let k = 0; k < 8; k++) await page.keyboard.press('ArrowLeft');
  assert.equal((await board('tent-09')).hi, 8, 'the band is 0 to 1/4');
  assert.equal(await page.locator('.tn-dot.broken').count(), 0, 'nothing escapes');
  await button('Widest').click(); await phoneSizes('tent-09 after Widest');
  assert.equal(await note(), 'Pin the start that lands farthest.');
  // The handle's lane is above the marker's: a tap low in the row on the
  // band's end moves the marker there, not the band.
  await tapAt(0.25, true, 0.8);
  assert.deepEqual([(await board('tent-09')).at, (await board('tent-09')).hi], [8, 8], 'the marker’s lane takes the tap');
  await tapAt(0.125, true, 0.2);
  assert.deepEqual([(await board('tent-09')).at, (await board('tent-09')).hi, (await board('tent-09')).claim], [4, 4, false], 'the handle’s lane moves the band, which takes Widest back');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual([(await board('tent-09')).at, (await board('tent-09')).hi], [8, 8]);
  await button('Pin').click(); await done();

  // Puzzle 6: the band's two handles split the row at the band's middle.
  await open('tent-06'); await fit('tent-06'); await phoneSizes('tent-06');
  const band6 = (await board('tent-06')).band;
  await tapAt(12, false, 0.9);
  assert.deepEqual((await board('tent-06')).band, [band6[0], 384], 'a tap right of the middle, low in the row, moves the right end');
  await tapAt(1, false, 0.1);
  assert.deepEqual((await board('tent-06')).band, [32, 384], 'a tap left of the middle moves the left end');

  // Puzzle 5: no goal met at the start; dragging the band half a unit meets it.
  await open('tent-05'); await fit('tent-05');
  assert.equal(await page.locator('.tn-goal.met').count(), 0);
  await drag(7.5, 8);
  assert.equal((await board('tent-05')).lo, 240, 'the band dragged by half a unit');
  await done();

  // Puzzle 11: Apply hint finds a band and That’s all ends it.
  await open('tent-11'); await fit('tent-11');
  for (let k = 0; k < 9; k++) { for (let j = 0; j < 3; j++) await button('Hint').click(); await button('Apply hint').click(); }
  await done();
  assert.equal(await page.locator('.tn-item').count(), 8);

  if (process.env.SHOTS) {
    const dir = process.env.SHOTS.replace(/\/?$/, '/');
    await mkdir(dir, {recursive: true});
    for (const [w, h, tag] of [[1024, 768, 'tablet'], [375, 812, 'phone']]) {
      await page.setViewportSize({width: w, height: h});
      for (const id of ['tent-01', 'tent-03', 'tent-05', 'tent-06', 'tent-07', 'tent-09', 'tent-10', 'tent-11']) {
        // A fresh board each time.
        await open(id); if (await button('Restart').count()) await button('Restart').click();
        if (id === 'tent-01') { await tapAt(5); await tapAt(11); }
        if (id === 'tent-03') { await tapAt(11); await button('Can’t').click(); }
        if (id === 'tent-11') { await tapAt(4); await tapAt(1.5); }
        await fit(`${id}, ${tag}`);
        await page.screenshot({path: `${dir}${id}-${tag}.png`, fullPage: true});
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
