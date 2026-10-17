// Plays Bridge Courier's Islands group through the real interface: walks by
// tapping islands and curved bridges, taps at contested points between two
// bridges of one pair (they go to the bridge drawn nearest), Done judged as a
// whole, No walk with its certificate and refusal, a new bridge and Fewest on
// Königsberg, the star delivery, keyboard focus, and the board's fit. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a 375 px phone). Screenshots
// go in SHOTS (default test-results/islands/).
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1280, height: 860}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const {puzzles} = JSON.parse(await readFile(new URL('../dist/families/islands/islands.json', import.meta.url), 'utf8'));
const {bridgesOf, finishOnce} = await import('../dist/families/islands/islands.js');
const out = process.env.SHOTS ? new URL(`file://${process.env.SHOTS.replace(/\/?$/, '/')}`) : new URL('../test-results/islands/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}-${phone ? 375 : 1280}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const byId = id => puzzles.find(p => p.id === id);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.isl-puzzle').waitFor(); await page.locator('.isl-map').scrollIntoViewIfNeeded(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
  const map = await page.locator('.isl-map').boundingBox();
  assert.ok(map.width <= 381, `${label}: a compact board (${map.width} px)`);
  const bar = await page.locator('.isl-bar').boundingBox().catch(() => null);
  if (bar) assert.ok(bar.y + bar.height - map.y <= 600, `${label}: the board and its buttons fit a phone screen together`);
};
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const island = async id => tapAt(await center(page.locator(`.isl-map .gb-node[data-node="${id}"]`)));
// A point on bridge i's drawn road, `frac` of the way along it, in viewport pixels.
const pointOn = (i, frac) => page.evaluate(([i, frac]) => {
  const line = document.querySelector(`.isl-map .gb-edge[data-edge="${i}"] .gb-line`), q = line.getPointAtLength(line.getTotalLength() * frac);
  const pt = new DOMPoint(q.x, q.y).matrixTransform(line.getScreenCTM());
  return [pt.x, pt.y];
}, [i, frac]);
const bridge = async (i, frac = .5) => tapAt(await pointOn(i, frac));
const hitsAt = ([x, y]) => page.evaluate(([x, y]) => document.elementsFromPoint(x, y).filter(el => el.dataset?.gbEdge !== undefined).map(el => Number(el.dataset.gbEdge)), [x, y]);
// A contested point: inside the tap areas of both bridges i and j, nearer to i,
// and where j's area lies on top (j is drawn later), so the topmost target alone
// would be wrong.
async function contested(i, j) {
  for (const frac of [.5, .4, .3, .2, .15, .1, .07, .05, .03]) {
    const [a, b] = [await pointOn(i, frac), await pointOn(j, frac)], at = [a[0] + (b[0] - a[0]) * .3, a[1] + (b[1] - a[1]) * .3];
    const hits = await hitsAt(at);
    if (hits.includes(i) && hits.includes(j) && hits[0] === Math.max(i, j)) return at;
  }
  return null;
}
const button = name => page.locator('.isl-puzzle .isl-button', {hasText: name});
const say = () => page.locator('.isl-say').innerText();
const B = (id, u, v, k = 0) => bridgesOf(byId(id).parameters).map(([x, y], i) => [x, y, i]).filter(([x, y]) => (x === u && y === v) || (x === v && y === u))[k][2];
const focusInBoard = () => page.evaluate(() => Boolean(document.activeElement?.closest('.isl-map') || document.activeElement?.matches('.isl-button.again')));

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Islands QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  // The group sits in Bridge Courier.
  const library = await page.locator('.caravan-library').innerHTML();
  assert.match(library, /<h2>Islands<\/h2>/, 'the Islands group heading');

  // Two and one: double bridges, contested taps, Done as a whole.
  const T = 'islands-02';
  await open(T); await fit('two and one');
  assert.equal(await button('No walk').isDisabled(), true, 'no claim on a fresh board');
  assert.equal(await button('Done').isDisabled(), true);
  await island('B');
  const [ab0, ab1] = [B(T, 'A', 'B', 0), B(T, 'A', 'B', 1)], near = await contested(ab0, ab1);
  await tapAt(near || await pointOn(ab0, .5));
  assert.deepEqual((await board(T)).path, [ab0], 'a tap crosses the bridge drawn under it, nearest where two tap areas meet');
  await island('B');
  assert.deepEqual((await board(T)).path, [ab0, ab1], 'tapping the island across crosses the bridge with its counter');
  assert.equal(await page.locator('.isl-counter').count(), 1, 'counters are picked up');
  await bridge(B(T, 'B', 'C'));
  assert.deepEqual((await board(T)).colored, ['B'], 'a walk over every bridge colours its start');
  await button('Done').click();
  assert.equal(await say(), 'There is another.');
  assert.equal(await button('Done').isDisabled(), true, 'Done waits for a change');
  assert.equal(await page.locator('.isl-say').evaluate(el => /\d/.test(el.textContent)), false, 'no count');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await page.locator('.isl-say').isHidden(), true, 'Undo takes the answer away');
  assert.equal(await button('Done').isDisabled(), true, 'and keeps Done shut');
  await button('Color').click();
  await island('C');
  await button('Done').click();
  await done();
  assert.equal(await page.locator('.isl-map .gb-node.lit').count(), 2, 'the odd islands are lit');
  assert.equal(await page.locator('.isl-map .gb-badge').count(), 3, 'every island shows its bridges');

  // Königsberg as it is: walk by curved roads, keyboard, No walk refused, then certified.
  const K = 'islands-09';
  await open(K); await fit('Königsberg fresh');
  assert.equal(await page.locator('.isl-map path.gb-line').count(), 4, 'two double bridges, drawn as four curves');
  await island('B');
  await tapAt(await contested(B(K, 'A', 'B', 0), B(K, 'A', 'B', 1)) || await pointOn(B(K, 'A', 'B', 0), .3));
  assert.deepEqual((await board(K)).path, [B(K, 'A', 'B', 0)], 'the A–B tap');
  await page.locator(`.gb-hit[data-gb-edge="${B(K, 'A', 'C', 1)}"]`).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(K)).path.at(-1), B(K, 'A', 'C', 1), 'Enter crosses a bridge');
  assert.ok(await focusInBoard(), 'focus stays on the map after a keyboard move');
  for (const [u, v, k] of [['C', 'D'], ['D', 'A'], ['A', 'B', 1], ['B', 'D']]) await bridge(B(K, u, v, k), .4);
  assert.equal((await board(K)).path.length, 6, 'six bridges walked');
  assert.equal(await page.locator('.isl-counter').count(), 1, 'one counter left');
  await fit('Königsberg busiest'); await shot('koenigsberg-walked');
  await button('No walk').click();
  assert.match(await say(), /Tap every island a walk would have to start or end on\./);
  assert.equal(await page.locator('.isl-map .gb-node.hinted').count(), 0, 'nothing tinted for the certificate');
  for (const id of ['A', 'B', 'D']) await island(id);
  assert.equal(await page.locator('.isl-map .gb-node.picked').count(), 3);
  await shot('koenigsberg-claim');
  await button('Check').click();
  assert.equal(await say(), 'There is another.');
  assert.equal(await page.locator('.isl-map .gb-node.picked').count(), 0, 'a refusal clears the taps');
  assert.ok(await focusInBoard(), 'focus goes to the map, not to No walk');
  assert.equal(await button('No walk').isDisabled(), true, 'No walk waits for a new walk');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await button('No walk').isDisabled(), true, 'Undo keeps the lock');
  await button('Again').click();
  await island('D'); await island('C');
  await button('No walk').click();
  for (const id of ['C', 'A', 'D', 'B']) await island(id);
  await button('Check').click();
  await done();
  assert.equal(await page.locator('.isl-map .gb-node.lit').count(), 4, 'the certificate is lit');
  assert.match(await say(), /A walk has only two ends\./);
  await shot('koenigsberg-solved');

  // Königsberg comes back: three A–B bridges side by side, taps reach each one.
  const F = 'islands-10';
  await open(F);
  assert.equal(await button('Bridge').getAttribute('aria-pressed'), 'true', 'Bridge is the starting tool');
  await island('A'); await island('B'); await island('C'); await island('D');
  assert.deepEqual((await board(F)).added, [['A', 'B'], ['C', 'D']]);
  assert.equal(await page.locator('.isl-map .gb-edge.new').count(), 2, 'new bridges are dashed');
  await button('Walk').click();
  const fq = byId(F).parameters, all = bridgesOf(fq, (await board(F)).added);
  // Three A–B bridges: the new one runs straight between the two curves, close
  // enough that their tap areas overlap. A tap there goes to the nearer road.
  const abs = all.map(([u, v], i) => [u, v, i]).filter(([u, v]) => u === 'A' && v === 'B').map(([, , i]) => i);
  assert.equal(abs.length, 3);
  await island('B');
  let checked = 0;
  for (const [i, j] of [[abs[0], abs[2]], [abs[2], abs[1]], [abs[1], abs[2]]]) {
    const at = await contested(i, j);
    if (!at) continue;
    checked++;
    await tapAt(at);
    assert.deepEqual((await board(F)).path, [i], `a contested tap between bridges ${i} and ${j} crosses ${i}, the nearer`);
    await page.locator('[data-action="undo"]').click();
  }
  assert.ok(checked >= 2, `contested points were tapped (${checked})`);
  await button('Again').click();
  const route = finishOnce(all, 'A', 0, 'A');
  await island('A');
  // The three A–B bridges are each tapped at their own middle.
  const order = [...route];
  for (let k = 0; k < order.length - 2; k++) await bridge(order[k], .5);
  assert.deepEqual((await board(F)).path, order.slice(0, -2), 'every tap reached the bridge drawn under it');
  await fit('Königsberg comes back busiest'); await shot('koenigsberg-new-bridges');
  for (const i of order.slice(-2)) await bridge(i, .5);
  await button('Fewest').click();
  for (const id of ['A', 'B', 'C', 'D']) await island(id);
  await button('Check').click();
  await done();
  assert.match(await say(), /A new bridge has only two ends\./);

  // Square with a cross: a new bridge across the middle bends around it.
  const S = 'islands-07';
  await open(S);
  await island('A'); await island('E');
  assert.equal(await page.locator('.isl-map .gb-edge.new path.gb-line').count(), 1, 'the new diagonal curves around C');
  assert.equal(await button('Walk').getAttribute('aria-pressed'), 'true', 'with the bridge built, the next taps walk');
  const sq = byId(S).parameters, sAll = bridgesOf(sq, (await board(S)).added), sWalk = finishOnce(sAll, 'B', 0);
  await island('B');
  for (const i of sWalk.slice(0, 6)) await bridge(i, .45);
  await fit('square busiest'); await shot('square-new-bridge');
  for (const i of sWalk.slice(6)) await bridge(i, .45);
  await done();

  // Star delivery: repeats show, Fewest with the dead ends.
  const D = 'islands-11';
  await open(D);
  await island('B');
  for (const id of ['A', 'B', 'C', 'B', 'D', 'B']) await island(id);
  assert.equal(await page.locator('.isl-map .gb-tag').count(), 3, 'every bridge crossed twice');
  await button('Fewest').click();
  for (const id of ['A', 'C', 'D']) await island(id);
  await fit('star busiest'); await shot('star-claim');
  await button('Check').click();
  await done();
  assert.match(await say(), /Each dead end’s bridge is crossed twice\./);

  // The add-a-bridge star, for a picture of a fresh add puzzle with its new bridge.
  await open('islands-03');
  await island('C'); await island('D');
  await shot('star-add');

  // Bridge Courier itself: a doomed start says nothing until Hint.
  await page.goto(`${base}/#play/route-07`); await page.locator('.network-graph').waitFor();
  await page.locator(`[data-action="expansion-move"][data-move='{"vertex":"A"}']`).click();
  assert.equal((await page.locator('.feedback').innerText()).trim(), '', 'no dead-end message unasked');
  assert.equal(await page.locator('.feedback.deadend').count(), 0);
  await page.locator('[data-action="hint"]').click();
  assert.match(await page.locator('.hint-card').innerText(), /cannot finish/, 'Hint tells it');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Islands browser smoke passed${phone ? ' (phone)' : ''}.`);
} finally {
  await browser.close();
}
