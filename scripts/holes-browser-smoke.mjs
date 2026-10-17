// Plays Holes (a group in Lantern Wires) through the real interface: the
// group in the satchel beside Lamplighter; the square solved by taps, one of
// them just inside the diagonal; the ring's Can't: off before a tap, a wrong
// face refused with one note, the lock kept through Undo while the note
// goes, a tap reopening it and the hole tapped near its rim; a strip by the
// keyboard alone, focus staying on the board; a schedule by taps on dashed
// lines (at their middles, and near a dot where three meet, which adds
// none) with the loop going out too soon, Undo and a finish; the busiest
// schedule board at phone width; a race won by taps and a nested race
// claimed with Can't, a wrong set refused on Check and the right one
// accepted; a puzzle finished by hints. No page overflow anywhere. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a 375 × 667 phone).
// Screenshots go in test-results/holes/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/holes/', import.meta.url);
const shot = async name => { await page.waitForTimeout(300); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board ?? null, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="holes"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const button = name => page.getByRole('button', {name, exact: true});
// On a phone, the busiest boards leave Can't and Check (or the tile track)
// and the Undo row in sight without scrolling (with a one-line header).
const inSight = async (locator, label) => { if (!phone) return; await page.evaluate(() => scrollTo(0, 0)); assert.ok(await locator.first().evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), `${label} is in sight on a phone`); };
const solved = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const status = () => page.locator('[data-mechanic-wire="holes"] [role=status]').innerText();
const focused = () => page.evaluate(() => ({focus: document.activeElement?.dataset?.focus || '', tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') || ''}));
// A tap at a point of the board given in board units (the SVG's own
// coordinates), so taps can land exactly where targets meet.
async function tapAt(x, y) {
  const at = await page.evaluate(([x, y]) => {
    const svg = document.querySelector('[data-mechanic-wire="holes"] .hl-svg'), m = svg.getScreenCTM(), p = svg.createSVGPoint();
    p.x = x; p.y = y;
    const q = p.matrixTransform(m);
    return [q.x, q.y];
  }, [x, y]);
  if (phone) await page.touchscreen.tap(at[0], at[1]); else await page.mouse.click(at[0], at[1]);
  await page.waitForTimeout(60);
}
// Board-unit points: a triangle's centre, a point a share of the way from
// one triangle's centre towards a wire's middle, a wire's middle.
const geometry = () => page.evaluate(() => {
  const svg = document.querySelector('[data-mechanic-wire="holes"] .hl-svg');
  const tris = [...svg.querySelectorAll('polygon.hl-tri')].map(p => p.getAttribute('points').split(' ').map(s => s.split(',').map(Number)));
  const holes = [...svg.querySelectorAll('polygon.hl-hole')].map(p => p.getAttribute('points').split(' ').map(s => s.split(',').map(Number)));
  return {tris, holes};
});
const centre = pts => [0, 1].map(d => pts.reduce((s, p) => s + p[d], 0) / pts.length);
const toward = (a, b, share) => [a[0] + (b[0] - a[0]) * share, a[1] + (b[1] - a[1]) * share];
async function tapTri(t, share = 0, toCorner = null) {
  const g = await geometry(), c = centre(g.tris[t]);
  const target = toCorner === null ? c : toward(c, toCorner(g.tris[t]), share);
  await tapAt(...target);
}
const placeMiddle = async e => page.evaluate(e => { const l = document.querySelector(`[data-mechanic-wire="holes"] [data-tg-edge="${e}"]`); const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(a => Number(l.getAttribute(a))); return [(x1 + x2) / 2, (y1 + y2) / 2]; }, e);
async function hintSolve() {
  for (let i = 0; i < 3; i++) await button('Hint').click();
  for (let s = 0; !await page.locator('#completion-heading').count() && s < 40; s++) await button('Apply hint').click();
  await solved();
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Holes'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const family = page.locator('.satchel-family[data-view-key="family-toggle"]');
  await family.locator('summary').click();
  assert.equal(await family.locator('h2', {hasText: 'Holes'}).count(), 1, 'a group in Lantern Wires');
  assert.equal(await family.locator('h2', {hasText: 'Lamplighter'}).count(), 1, 'Lamplighter is still there');
  assert.equal(await family.locator('[data-id^="holes-"]').count(), 12);
  await shot('satchel');

  // The square: a tap just inside the diagonal fills the triangle it is in.
  await open('holes-01'); await fit('square'); await shot('01-start');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Make every wire dark.', 'one short line for the goal');
  await tapTri(0, .9, pts => centre([pts[0], pts[2]]));
  assert.deepEqual((await board('holes-01')).taps, [0], 'the tap near the diagonal goes to the triangle it is in');
  assert.match((await focused()).focus, /^hl-cell-\d+$/, 'focus stays on the board');
  await tapTri(1);
  await solved(); await fit('square solved'); await shot('01-solved');

  // The ring: Can't is off before a tap; a wrong face is refused; Undo keeps
  // the lock and the note goes; a tap reopens it; the hole is tapped near its rim.
  await open('holes-04'); await fit('ring');
  assert.ok(await button('Can’t').isDisabled(), 'Can’t waits for a tap');
  await tapTri(2);
  assert.ok(!await button('Can’t').isDisabled());
  await button('Can’t').click();
  assert.equal(await page.locator('[data-mechanic-wire="holes"].pointing').count(), 1);
  assert.equal((await focused()).tag.toLowerCase(), 'svg', 'Can’t sends focus to the board');
  assert.equal(await page.locator('[data-tg-piece="hole-0"]').count(), 1, 'the hole is a button after Can’t');
  await shot('04-pointing');
  await tapTri(16);
  await page.locator('.hl-note', {hasText: 'That one doesn’t keep it lit.'}).waitFor();
  assert.ok(await button('Can’t').isDisabled(), 'Can’t stays off after a refusal');
  assert.notEqual((await focused()).label, 'Can’t');
  await shot('04-refused');
  await button('↶ Undo').click();
  assert.equal(await page.locator('.hl-note').count(), 0, 'Undo takes the note away');
  assert.deepEqual(await board('holes-04'), {taps: [2], cant: null, refused: {face: 16, shown: false}}, 'and keeps the lock');
  assert.ok(await button('Can’t').isDisabled());
  await tapTri(6);
  assert.ok(!await button('Can’t').isDisabled(), 'a tap reopens Can’t');
  await button('Can’t').click();
  const g = await geometry();
  await tapAt(...toward(centre(g.holes[0]), g.holes[0][0], .85));
  await solved();
  assert.equal(await page.locator('.hl-ring').count(), 1, 'the hole ringed');
  assert.ok(await page.locator('.hl-shade').count() >= 2, 'the faces inside shaded');
  assert.match(await status(), /^The hole stays inside the loop/);
  await fit('ring solved'); await shot('04-solved');

  // A strip by the keyboard alone: Tab to a tile, Enter and Space tap, focus
  // stays on the tile.
  await open('holes-02');
  await page.locator('[data-tg-cell="1"]').focus();
  await page.keyboard.press('Enter');
  assert.deepEqual((await board('holes-02')).taps, [1]);
  assert.equal((await focused()).focus, 'hl-cell-1', 'focus stays on the tile tapped');
  await page.keyboard.press('Tab'); await page.keyboard.press(' ');
  assert.deepEqual((await board('holes-02')).taps, [1, 2]);
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await solved();

  // A schedule: dashed lines tapped at their middles; a tap near a dot where
  // two dashed lines meet adds none; the loop goes out too soon; Undo.
  await open('holes-09'); await fit('first loop'); await shot('09-start');
  const wires = await page.evaluate(() => [...document.querySelectorAll('[data-mechanic-wire="holes"] [data-tg-edge]')].map(l => ({e: Number(l.dataset.tgEdge), dots: l.getAttribute('aria-label').match(/\d+/g).map(Number).sort((a, b) => a - b).join()})));
  assert.equal(wires.length, 6, 'six dashed places');
  const edge = (a, b) => wires.find(w => w.dots === [a, b].sort((x, y) => x - y).join()).e;
  const dot = await page.evaluate(() => { const c = [...document.querySelectorAll('[data-mechanic-wire="holes"] .hl-dot')][1]; return [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]; });
  await tapAt(dot[0], dot[1] + 0.8);
  assert.deepEqual(await board('holes-09'), {steps: []}, 'a tap at a dot adds no wire');
  // Dots are named from 1 in reading order: the top row 1–4, the bottom row 5–8.
  const small = edge(3, 8);
  await tapAt(...await placeMiddle(small));
  assert.deepEqual(await board('holes-09'), {steps: [{edge: small}]});
  assert.equal(await page.locator('.hl-glow.sun').count(), 3, 'the first loop lights');
  await tapTri(5);
  assert.equal(await page.locator('.feedback', {hasText: 'It went out too soon. Undo.'}).count(), 1);
  assert.equal(await page.locator('.hl-out').count(), 3, 'its trace stays');
  await shot('09-too-soon');
  await button('↶ Undo').click();
  await button('↶ Undo').click();
  // A loop round three triangles: the wire across, the two it needs, then the three tiles.
  for (const [a, b] of [[2, 7], [3, 7], [3, 8]]) await tapAt(...await placeMiddle(edge(a, b)));
  assert.equal((await board('holes-09')).steps.length, 3);
  assert.equal(await page.locator('.hl-glow.sun').count(), 5, 'the loop round three lights');
  for (const t of [5, 3]) await tapTri(t);
  assert.match(await status(), /2 tiles of 3 filled/);
  await tapTri(4);
  await solved(); await fit('first loop solved'); await shot('09-solved');

  // The busiest schedule: every wire in and the marked tile reached.
  await open('holes-10'); await fit('ring of wires');
  assert.equal(await page.locator('[data-tg-edge]').count(), 19);
  const gapLabel = 'Add the wire between dots 1 and 2';
  await tapAt(...await placeMiddle(await page.locator(`[aria-label="${gapLabel}"]`).getAttribute('data-tg-edge')));
  assert.equal(await page.locator('.hl-glow.sun').count(), 12, 'the gap lights the whole rim round the hole');
  assert.equal(await page.locator('.feedback').innerText(), '', 'nothing under the board yet');
  const feedbackBox = await page.locator('.feedback').boundingBox();
  assert.ok(!feedbackBox || feedbackBox.height < 2, `the empty line under the board takes no room (${feedbackBox?.height})`);
  await shot('10-round-the-hole');
  await inSight(page.locator('.hl-track'), 'the tile track'); await inSight(button('↶ Undo'), 'Undo');
  const box = await page.locator('.hl-svg').boundingBox();
  assert.ok(box.width <= 382, `the board is at most about 380 px wide (${box.width})`);
  await button('↶ Undo').click();
  await hintSolve(); await fit('ring of wires solved'); await shot('10-solved');

  // A race won by taps.
  await open('holes-11'); await fit('wheel');
  for (const t of [0, 2, 3, 4, 5]) await tapTri(t);
  await solved(); await shot('11-solved');

  // The nested race: a fill, Can't, a wrong set refused on Check, the right one.
  await open('holes-12'); await fit('big race');
  assert.ok(await button('Can’t').isDisabled());
  await tapTri(1);
  await button('Can’t').click();
  assert.ok(await button('Check').isDisabled(), 'Check waits for a tap');
  for (const t of [4, 5, 6]) await tapTri(t);
  assert.equal(await page.locator('.hl-pick').count(), 3, 'tapped tiles are ringed, nothing else');
  await shot('12-picking');
  await inSight(button('Check'), 'Check'); await inSight(button('↶ Undo'), 'Undo');
  await button('Check').click();
  await page.locator('.hl-note', {hasText: 'Those tiles don’t fill the pink loop.'}).waitFor();
  assert.equal(await page.locator('.hl-pick').count(), 0, 'the refusal clears the taps');
  assert.notEqual((await focused()).label, 'Check');
  assert.ok(await button('Can’t').isDisabled());
  await tapTri(2);
  await button('Can’t').click();
  for (const t of [4, 5, 6, 7, 8]) await tapTri(t);
  await button('Check').click();
  await solved(); await fit('big race solved'); await shot('12-solved');

  // A Can't puzzle finished by hints.
  await open('holes-07');
  await hintSolve(); await shot('07-solved');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`holes browser smoke passed${phone ? ' (phone)' : ''}`);
} finally {
  await browser.close();
}
