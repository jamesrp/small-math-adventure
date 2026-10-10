// Plays Knot colours through the real interface: taps that cycle an arc's
// colour, Enter on a focused arc, crossing rings that work or clash, the nine
// crossings, One colour only refused and kept with its clash from a chosen
// crossing, Can't with the dots' clash, finding every trefoil colouring with
// Found already, There is another, Undo and That's all, the before and after
// pictures, a hint chain applied to the end, and the playground. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a 375-pixel phone with
// touch). Screenshots go in test-results/knots/, or SHOTS_DIR.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1280, height: 900}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS_DIR ? new URL(`file://${process.env.SHOTS_DIR.replace(/\/?$/, '/')}`) : new URL('../test-results/knots/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-375' : '-desktop'}.png`, out).pathname, fullPage: true});
const pack = JSON.parse(await readFile(new URL('../dist/families/knots/knots.json', import.meta.url), 'utf8'));
const params = id => pack.puzzles.find(p => p.id === id).parameters;
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.kn-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const button = name => page.getByRole('button', {name, exact: true});
// A point on an arc's cord far from every crossing, in page pixels, checked by
// hit-testing to land on that arc.
async function arcPoint(i) {
  await page.locator(`[data-arc="${i}"]`).scrollIntoViewIfNeeded();
  const q = await page.evaluate(i => {
    const path = document.querySelector(`[data-arc="${i}"] .kn-hit`), svg = path.ownerSVGElement, L = path.getTotalLength();
    const rings = [...svg.querySelectorAll('.kn-cross circle')].map(c => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]);
    let best = null;
    for (let k = 1; k < 40; k++) {
      const pt = path.getPointAtLength(L * k / 40), far = Math.min(99, ...rings.map(([x, y]) => Math.hypot(pt.x - x, pt.y - y)));
      if (!best || far > best.far) best = {pt, far};
    }
    const m = path.getScreenCTM(), x = best.pt.x * m.a + best.pt.y * m.c + m.e, y = best.pt.x * m.b + best.pt.y * m.d + m.f;
    return {x, y, on: document.elementFromPoint(x, y)?.closest('[data-arc]')?.dataset.arc};
  }, i);
  assert.equal(q.on, String(i), `arc ${i + 1} is the one under its own point`);
  return [q.x, q.y];
}
const tapArc = async i => { const [x, y] = await arcPoint(i); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
// Tap each arc until it shows the colour wanted (taps cycle red, blue, yellow).
async function colourTo(id, colours) {
  for (const [i, c] of colours.entries()) {
    if (c === null) continue;
    for (let n = 0; n < 3 && (await board(id)).colours[i] !== c; n++) await tapArc(i);
    assert.equal((await board(id)).colours[i], c, `${id}: arc ${i + 1} reaches its colour by tapping`);
  }
}
const goal = async () => (await page.locator('.puzzle-goal').count()) ? (await page.locator('.puzzle-goal').innerText()).trim() : '';
// The board's words a sighted player sees (the status line is for screen readers).
const text = () => page.evaluate(() => { const el = document.querySelector('.kn-puzzle').cloneNode(true); el.querySelectorAll('.sr-only').forEach(n => n.remove()); return el.textContent; });

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Knot QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: nine crossings. A tap cycles a colour; Enter does too; a wrong
  // colour clashes; the Latin square solves it.
  let P = 'knots-01', q = params(P);
  await open(P); await fit('nine crossings');
  assert.equal(await goal(), 'Make every crossing all one colour or all different.');
  assert.equal(await page.locator('.kn-arc.fixed[data-arc]').count(), 0, 'given arcs are not controls');
  await shot('01-start');
  const right = q.crossings.map(x => x.under[1]), answer = right.map(i => (3 - (q.locked[q.crossings.find(x => x.under[1] === i).over] + q.locked[q.crossings.find(x => x.under[1] === i).under[0]]) % 3) % 3);
  await tapArc(right[1]);
  assert.equal((await board(P)).colours[right[1]], 0, 'a tap colours an arc red');
  assert.equal(await page.locator('.kn-cross.clash').count(), 1, 'red, blue and red clash at the top crossing');
  await page.locator(`[data-arc="${right[1]}"]`).focus(); await page.keyboard.press('Enter');
  assert.equal((await board(P)).colours[right[1]], 1, 'Enter changes the colour');
  await shot('01-clash');
  await colourTo(P, q.arcs.map((_, i) => right.includes(i) ? answer[right.indexOf(i)] : null));
  await done();
  assert.equal(await page.locator('.kn-cross.ok').count(), 9);
  await shot('01-solved');

  // Puzzle 2: the trefoil. One colour only is refused; three colours solve it.
  P = 'knots-02';
  await open(P); await fit('trefoil');
  assert.equal(await goal(), 'Use more than one colour.');
  await button('One colour only').click();
  assert.match(await text(), /More than one colour works\./);
  assert.equal(await button('One colour only').isDisabled(), true, 'one claim until the colours change');
  await colourTo(P, [0, 1, 2]);
  await done();
  await shot('02-solved');

  // Puzzle 6: the figure-eight. Two colours clash; One colour only is kept and
  // shows the clash from a chosen crossing.
  P = 'knots-06'; q = params(P);
  await open(P); await fit('figure-eight');
  const x0 = q.crossings[0];
  await colourTo(P, q.arcs.map((_, i) => i === x0.over ? 0 : i === x0.under[0] ? 1 : null));
  await shot('06-trying');
  await button('One colour only').click();
  await done();
  assert.match(await text(), /Two colours here force a clash\./);
  assert.equal(await page.locator('[data-seed]').count(), q.crossings.length);
  assert.equal(await page.locator('[data-seed="0"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-seed="2"]').click();
  assert.equal(await page.locator('[data-seed="2"]').getAttribute('aria-pressed'), 'true', 'a tap on a crossing starts the clash there');
  assert.ok(await page.locator('.kn-cross.clash').count() >= 1, 'the clash is shown');
  await page.locator('[data-seed="3"]').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-seed="3"]').getAttribute('aria-pressed'), 'true', 'Enter on a crossing starts the clash there');
  await shot('06-certificate');

  // Puzzle 4: the bend whose dots can't be met.
  P = 'knots-04';
  await open(P); await fit('bend');
  assert.equal(await goal(), 'Match the end dots.');
  await button('Can’t').click();
  await done();
  assert.match(await text(), /The end dots force a clash\./);
  await shot('04-cant');

  // Puzzle 5: every trefoil colouring. Kept when made, found already, there
  // is another, Undo keeps the shelf, That's all.
  P = 'knots-05';
  await open(P); await fit('every');
  assert.equal(await goal(), 'Find every colouring.');
  await colourTo(P, [0, 0, 0]);
  assert.equal(await page.locator('.kn-shelf li').count(), 1, 'the colouring goes on the shelf');
  await button('That’s all').click();
  assert.match(await text(), /There is another\./);
  assert.equal(await button('That’s all').isDisabled(), true);
  await colourTo(P, [0, 1, 2]);
  assert.equal(await page.locator('.kn-shelf li').count(), 2);
  await page.locator('[data-action="undo"]').click();
  assert.equal(await page.locator('.kn-shelf li').count(), 2, 'Undo keeps the shelf');
  await colourTo(P, [0, 1, 2]);
  assert.match(await text(), /Found already\./);
  assert.doesNotMatch(await text(), /\d/, 'no numbers on the board');
  await shot('05-shelf');
  for (const c of ['111', '222', '021', '102', '120', '201', '210']) await colourTo(P, [...c].map(Number));
  assert.equal((await board(P)).found.length, 9);
  await button('That’s all').click();
  await done();
  await shot('05-solved');

  // Puzzle 7: before and after; matched dots.
  P = 'knots-07'; q = params(P);
  await open(P); await fit('pair');
  assert.equal(await page.locator('.kn-pair .kn-board').count(), 2);
  await shot('07-start');
  await colourTo(P, [0, 2, 0, 1, 0, 1]);
  await done();
  await shot('07-solved');

  // Puzzle 12: the slide, solved by hints applied to the end.
  P = 'knots-12';
  await open(P); await fit('slide');
  await shot('12-start');
  for (let n = 0; n < 40 && !(await page.locator('#completion-heading').count()); n++) {
    await button('Hint').click();
    if (await button('Apply hint').count()) await button('Apply hint').click();
  }
  await done();
  await shot('12-solved');

  // Puzzle 10, mid-way, for the screenshots.
  P = 'knots-10';
  await open(P); await fit('stevedore');
  await colourTo(P, [null, null, null, null, 1, 0]);
  await shot('10-trying');

  // The playground.
  P = 'knots-playground';
  await open(P); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await page.getByRole('button', {name: 'Trefoil', exact: true}).click();
  assert.equal((await board(P)).knot, 1);
  await colourTo(P, [0, 1, 2]);
  assert.equal(await page.locator('.kn-cross.ok').count(), 3);
  await shot('playground');
  await button('Clear').click();
  assert.ok((await board(P)).colours.every(c => c === null));
  await page.getByRole('button', {name: 'Granny knot', exact: true}).click();
  await fit('granny');
  await shot('playground-granny');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
