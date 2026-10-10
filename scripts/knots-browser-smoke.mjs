// Plays Knot colours through the real interface: taps that cycle an arc's
// colour, Enter on a focused arc, crossing rings that work or clash, taps at
// every crossing reaching the arc on top, the nine crossings, One colour only
// refused (no crossing all different, no clash yet, an arc not forced) and
// kept on the child's chain with a row of clashes from every crossing, Can't
// refused and kept on the chain from the dots, finding every trefoil
// colouring with Found already, There is another, Undo and That's all, every
// colouring of the before and after pictures, a hint chain applied to the
// end, the stevedore knot's button on a 375 by 740 screen, and the
// playground. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a
// 375-pixel phone with touch). Screenshots go in test-results/knots/, or
// SHOTS_DIR.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {certificate, chains, claimCheck, completions} from '../dist/families/knots/knots.js';
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
// A tap at a crossing, or between its centre and the end of an arc stopping
// there, reaches the arc on top (nothing, when that arc is given), never an
// arc that stops there.
async function crossingTaps(label, q) {
  const bad = await page.evaluate(q => {
    const svgs = [...document.querySelectorAll('.kn-frame svg.kn-board')], locked = q.locked || q.arcs.map(() => null), out = [];
    const far = (x, p) => Math.hypot(p[0] - x.at[0], p[1] - x.at[1]);
    q.crossings.forEach((x, i) => {
      const svg = svgs[q.frames ? x.pic : 0];
      svg.scrollIntoView({block: 'center'});
      const m = svg.getScreenCTM(), want = locked[x.over] === null ? String(x.over) : undefined;
      const points = [x.at, ...x.under.map(a => { const d = q.arcs[a].d, e = far(x, d[0]) < far(x, d.at(-1)) ? d[0] : d.at(-1); return [x.at[0] + (e[0] - x.at[0]) * 0.6, x.at[1] + (e[1] - x.at[1]) * 0.6]; })];
      points.forEach(([u, v], k) => {
        const got = document.elementFromPoint(u * m.a + v * m.c + m.e, u * m.b + v * m.d + m.f)?.closest('[data-arc]')?.dataset.arc;
        if (got !== want) out.push({crossing: i + 1, point: k ? `toward arc ${x.under[k - 1] + 1}` : 'centre', got, want});
      });
    });
    return out;
  }, q);
  assert.deepEqual(bad, [], `${label}: a tap at a crossing reaches the arc on top`);
}
const told = async () => (await page.locator('.kn-told').count()) ? (await page.locator('.kn-told').innerText()).trim() : '';

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
  await crossingTaps('nine crossings', q);
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

  // Puzzle 2: the trefoil. One colour only on a blank board is refused for
  // want of a crossing all different; three colours solve it.
  P = 'knots-02';
  await open(P); await fit('trefoil');
  assert.equal(await goal(), 'Use more than one colour.');
  await crossingTaps('trefoil', params(P));
  await button('One colour only').click();
  assert.equal(await told(), 'No crossing is all different.');
  assert.equal(await button('One colour only').isDisabled(), true, 'one claim until the colours change');
  await colourTo(P, [0, 1, 2]);
  await done();
  await shot('02-solved');

  // Puzzle 6: the figure-eight. A crossing all different alone is no chain
  // yet; the chain built arc by arc to a clash is kept, with a row of clashes
  // from every crossing.
  P = 'knots-06'; q = params(P);
  await open(P); await fit('figure-eight');
  await crossingTaps('figure-eight', q);
  await button('One colour only').click();
  assert.equal(await told(), 'No crossing is all different.');
  const chain6 = certificate(q, 0), start6 = chain6.order.slice(0, 3);
  await colourTo(P, chain6.colours.map((c, i) => start6.includes(i) ? c : null));
  await shot('06-trying');
  await button('One colour only').click();
  assert.equal(await told(), 'No clash yet.', 'the same words as on a knot where the claim is false');
  for (const i of chain6.order.slice(3)) await colourTo(P, chain6.colours.map((c, j) => j === i ? c : null));
  assert.ok(await page.locator('.kn-frame .kn-cross.clash').count() >= 1, 'the clash is on the board');
  await button('One colour only').click();
  await done();
  assert.equal(await page.locator('.kn-frame .kn-cross.seed').count(), 1, 'the starting crossing is ringed');
  assert.equal(await page.locator('.kn-clashes li').count(), q.crossings.length, 'a clash from each crossing');
  assert.equal((await page.locator('.kn-clashes').innerText()).trim(), '', 'the row has no words');
  assert.equal(await page.locator('.kn-clashes .kn-cross.clash').count(), q.crossings.length);
  await shot('06-certificate');

  // Puzzle 9: the cinquefoil. An arc the chain does not force is ringed.
  P = 'knots-09'; q = params(P);
  await open(P); await fit('cinquefoil');
  await crossingTaps('cinquefoil', q);
  const chain9 = certificate(q, 0), start9 = chain9.order.slice(0, 3);
  const [odd, wrong] = q.arcs.flatMap((_, i) => start9.includes(i) ? [] : [0, 1, 2].map(v => [i, v])).find(([i, v]) => claimCheck(q, chain9.colours.map((c, j) => start9.includes(j) ? c : j === i ? v : null)).reason === 'loose');
  await colourTo(P, chain9.colours.map((c, j) => start9.includes(j) ? c : j === odd ? wrong : null));
  await button('One colour only').click();
  assert.equal(await told(), 'Ringed arcs aren’t forced.');
  assert.equal(await page.locator(`.kn-arc.loose[data-arc="${odd}"]`).count(), 1, 'the arc is ringed');
  await shot('09-loose');

  // Puzzle 4: the bend whose dots can't be met. Can't on a blank board is
  // refused; the chain from the dots is kept.
  P = 'knots-04'; q = params(P);
  await open(P); await fit('bend');
  assert.equal(await goal(), 'Match the end dots.');
  await crossingTaps('bend', q);
  await button('Can’t').click();
  assert.equal(await told(), 'No clash yet.');
  const [chain4] = chains(q);
  for (const i of chain4.order) await colourTo(P, chain4.colours.map((c, j) => j === i ? c : null));
  await button('Can’t').click();
  await done();
  assert.ok(await page.locator('.kn-frame :is(.kn-cross,.kn-end).clash').count() >= 1, 'the clash is on the board');
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

  // Puzzle 7: before and after; every way with matched dots.
  P = 'knots-07'; q = params(P);
  await open(P); await fit('pair');
  assert.equal(await goal(), 'Find every way to colour both pictures with matching dots.');
  assert.equal(await page.locator('.kn-pair .kn-board').count(), 2);
  await crossingTaps('pair', q);
  await shot('07-start');
  const ways = completions(q);
  assert.equal(ways.length, 9);
  await colourTo(P, ways[1]);
  await shot('07-one');
  for (const c of ways) await colourTo(P, c);
  assert.equal(await page.locator('.kn-shelf.wide li').count(), 9);
  await button('That’s all').click();
  await done();
  await shot('07-solved');

  // Puzzle 12: the slide, solved by hints applied to the end.
  P = 'knots-12';
  await open(P); await fit('slide');
  await crossingTaps('slide', params(P));
  await shot('12-start');
  for (let n = 0; n < 40 && !(await page.locator('#completion-heading').count()); n++) {
    await button('Hint').click();
    if (await button('Apply hint').count()) await button('Apply hint').click();
  }
  await done();
  await shot('12-solved');

  // Puzzle 11: the three-twist knot, its chain found by hints to the end.
  P = 'knots-11';
  await open(P); await fit('three twists');
  await crossingTaps('three twists', params(P));
  for (let n = 0; n < 40 && !(await page.locator('#completion-heading').count()); n++) {
    await button('Hint').click();
    if (await button('Apply hint').count()) await button('Apply hint').click();
  }
  await done();
  assert.equal(await page.locator('.kn-clashes li').count(), params(P).crossings.length);
  await shot('11-solved');

  // Puzzle 10, mid-way, for the screenshots; and the granny knot's crossings.
  P = 'knots-10';
  await open(P); await fit('stevedore');
  await crossingTaps('stevedore', params(P));
  await colourTo(P, [null, null, null, null, 1, 0]);
  await shot('10-trying');
  await open('knots-08'); await crossingTaps('granny', params('knots-08'));
  await open('knots-05'); await crossingTaps('every', params('knots-05'));
  await open('knots-03'); await crossingTaps('bend', params('knots-03'));
  if (phone) {
    // On a 375 by 740 screen the whole stevedore knot and its One colour only
    // button fit on the screen together.
    await page.setViewportSize({width: 375, height: 740});
    await open('knots-10');
    await button('One colour only').scrollIntoViewIfNeeded();
    const [boardBox, buttonBox] = [await page.locator('.kn-frame .kn-board').boundingBox(), await button('One colour only').boundingBox()];
    assert.ok(boardBox.y >= -1 && buttonBox.y + buttonBox.height <= 741, `board top ${boardBox.y}, button bottom ${buttonBox.y + buttonBox.height}`);
    await tapArc(0);
    await button('One colour only').tap();
    assert.equal(await told(), 'No crossing is all different.');
    await shot('10-small-screen');
    await page.setViewportSize({width: 375, height: 812});
  }

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
  for (const [k, knot] of params(P).knots.entries()) {
    await page.getByRole('button', {name: knot.name, exact: true}).click();
    assert.equal((await board(P)).knot, k);
    await crossingTaps(`playground ${knot.name}`, knot);
  }
  await page.getByRole('button', {name: 'Granny knot', exact: true}).click();
  await fit('granny');
  await shot('playground-granny');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
