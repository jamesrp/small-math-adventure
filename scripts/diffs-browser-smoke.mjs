// Plays Gap rings through the real interface: building towers by tapping
// cells and floors (at their edges too, where cells meet), the live gaps on
// the arrows, Enter on a focused cell, a solve; Can't with marks, refused and
// then accepted, with focus kept off Can't; That's all with There is another;
// a run with a ring taken back from the row; the three-tower loop; no page
// overflow; and, on a phone, the size of the child's blocks and floors, of
// the towers to mark and of the letters. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// with touch). Screenshots go in test-results/diffs/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/diffs/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.df-board').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
// A tap at a point of a control, through real hit-testing: dy is the fraction of its height from the top.
const tapAt = async (locator, dy = 0.5) => { const b = await locator.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height * dy; if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const cell = (i, h) => page.locator(`.df-edit [data-focus="df-${i}-${h}"]`);
// Build a ring on the left, tapping each tower's cell near its top or bottom edge in turn.
async function build(ring) {
  let k = 0;
  for (const [i, h] of ring.entries()) {
    const now = await page.locator(`.df-edit .df-st.s${i} .df-foot b`).innerText();
    if (now === String(h)) continue;
    await tapAt(cell(i, h), k++ % 2 ? 0.08 : 0.92);
  }
}
const gapsShown = () => page.locator('.df-edit .df-gap').allInnerTexts();
// On a phone: the child's blocks and floors are 40 px wide, and 40 px tall up
// to a cap of 2 (at least 24 px above it); the letters under the towers are
// 13 px or more.
async function phoneSizes(label, tall) {
  if (!phone) return;
  const z = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll('.df-edit button.df-cell, .df-edit button.df-floor')].map(el => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }),
    text: [...document.querySelectorAll('.df-foot i')].map(el => parseFloat(getComputedStyle(el).fontSize))
  }));
  for (const [w, h] of z.buttons) assert.ok(w >= 40 && h >= tall, `${label}: a block or floor is ${Math.round(w)}×${Math.round(h)} px`);
  assert.ok(Math.min(...z.text) >= 12.9, `${label}: letters 13 px or more`);
}
const focusKey = () => page.evaluate(() => document.activeElement?.dataset?.focus || document.activeElement?.className || '');
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Gap rings QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-diffs"] .family-ink-symbol').innerText(), 'Δ');

  // Make: live gaps, edge taps, Enter on a focused cell, a solve.
  await open('diffs-05'); await fit('diffs-05');
  await phoneSizes('cap 4', 24);
  await build([1, 4, 2]);
  assert.deepEqual((await gapsShown()).slice(0, 2), ['3', '2'], 'gaps from A to B and B to C');
  assert.equal((await gapsShown())[2], '', 'no gap until D is built');
  // Every cell's own centre and edges land on that cell, not its neighbour.
  const missed = await page.evaluate(() => [...document.querySelectorAll('.df-edit button.df-cell, .df-edit button.df-floor')].filter(el => { const r = el.getBoundingClientRect(); return [0.1, 0.5, 0.9].some(f => document.elementFromPoint(r.x + r.width / 2, r.y + r.height * f) !== el); }).length);
  assert.equal(missed, 0, 'taps hit the cell under them');
  await cell(3, 1).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board('diffs-05')).old, [1, 4, 2, 1]);
  assert.match(await focusKey(), /df-3-1/, 'focus stays on the board after a move');
  await shot('make');
  await tapAt(page.locator('.df-edit [data-focus="df-3-0"]'));
  await done();
  assert.deepEqual((await board('diffs-05')).old, [1, 4, 2, 0]);

  // Can't: refused with the wrong marks, accepted with the odd gaps.
  await open('diffs-06'); await fit('diffs-06');
  assert.ok(await page.locator('.df-cant').isDisabled(), 'Can’t waits for a whole ring');
  await build([0, 1, 0, 1]);
  await tapAt(page.locator('.df-cant'));
  assert.equal(await page.locator('.df-pick').count(), 4, 'the towers on the right can be marked');
  if (phone) for (const b of await page.locator('.df-pick').evaluateAll(els => els.map(el => el.getBoundingClientRect().width))) assert.ok(b >= 40, `a tower to mark is ${Math.round(b)} px wide`);
  await tapAt(page.locator('.df-pick.s0'));
  await tapAt(page.locator('.df-cant'));
  await page.locator('.df-note.bad').waitFor();
  assert.equal(await page.locator('.df-note.bad').innerText(), 'Those don’t rule it out.');
  assert.equal(await page.locator('.df-pick').count(), 0, 'the refusal clears the taps');
  assert.ok(await page.locator('.df-cant').isDisabled(), 'Can’t waits for a change');
  assert.doesNotMatch(await focusKey(), /cant|all/, 'focus is not left on Can’t');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board('diffs-06')).refused, [0], 'Undo keeps the refusal');
  await build([0, 1, 0, 2]);
  await tapAt(page.locator('.df-cant'));
  await tapAt(page.locator('.df-pick.s1'));
  assert.equal(await page.locator('.df-cant').getAttribute('aria-label'), 'Can’t: check marks');
  await shot('cant-marks');
  await tapAt(page.locator('.df-cant'));
  await done();
  assert.deepEqual((await board('diffs-06')).claim, [1]);
  await shot('cant-done');

  // Every: There is another, then That's all with every ring.
  await open('diffs-07');
  await phoneSizes('cap 2', 40);
  await build([0, 0, 1, 1]);
  await tapAt(page.locator('.df-all'));
  assert.equal(await page.locator('.df-note.bad').innerText(), 'There is another.');
  assert.ok(await page.locator('.df-all').isDisabled());
  for (const r of [[1, 1, 2, 2], [1, 1, 0, 0], [2, 2, 1, 1]]) await build(r);
  assert.equal(await page.locator('.df-found li').count(), 4);
  await shot('every');
  await tapAt(page.locator('.df-all'));
  await done();

  // Grow: a ring joins the row, a dead end is taken back from the row.
  await open('diffs-08'); await fit('diffs-08');
  assert.equal(await page.locator('.df-run .slot').count(), 4);
  await build([1, 1, 1, 1]);
  await build([1, 2, 1, 2]);
  assert.equal((await board('diffs-08')).run.length, 2);
  await shot('grow');
  await tapAt(page.locator('.df-lift'));
  assert.deepEqual((await board('diffs-08')).draft, [1, 2, 1, 2], 'the ring comes back to change');
  // Changing it one tower at a time: (0, 1, 0, 1) joins when its last tower is set.
  for (const r of [[0, 1, 0, 1], [0, 0, 1, 1], [0, 0, 0, 1]]) await build(r);
  await done();
  assert.deepEqual((await board('diffs-08')).run, [[0, 0, 0, 1], [0, 0, 1, 1], [0, 1, 0, 1], [1, 1, 1, 1]]);

  // The three-tower loop.
  await open('diffs-09'); await fit('diffs-09');
  for (const r of [[0, 1, 1], [1, 1, 0], [1, 0, 1]]) await build(r);
  await done();
  assert.equal(await page.locator('.df-mini.loop').count(), 2);
  await shot('loop');

  // The longest run's board and the playground fit.
  for (const id of ['diffs-12', 'diffs-playground']) { await open(id); await fit(id); }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
