// Plays Cops and robbers through the real interface: the satchel; How to
// play; C put down, taken back with Undo and put down again, then a catch
// within the moves shown; C staying by a tap on its own dot; R kept away on
// the square, with a caught R taken back; the ring of five, where C tries
// another move; the house's Can't played out as R, and a wrong Can't on the
// triangle with a tail, caught and restarted; a road added, taken away by a
// tap on it, the refusal of a second road, Play and the catch; a pentagon's
// Can't after a road; folds with a refused fold and its line, a refused Can't
// and the right one; two cops planned with C1, C2 and Go; the playground's
// maps and sides; focus after each kind of tap; and fit at phone and desktop
// sizes. Same environment variables as the other browser suites
// (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone
// with touch). Screenshots go in test-results/cops/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {copsMechanics, sceneOf, gameOf} from '../dist/families/cops/cops.js';
import * as game from '../dist/families/cops/game.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const pack = JSON.parse(await readFile(new URL('../dist/families/cops/cops.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const out = new URL('../test-results/cops/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] [data-mechanic-wire]`).waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const press = name => page.getByRole('button', {name, exact: true});
const dot = x => page.locator(`[data-mechanic-wire] [data-gb-node="${x}"]`);
const chip = k => page.locator(`[data-mechanic-wire] .cp-chip[data-focus="cp-chip-${k}"]`);
const told = async () => (await page.locator('.cp-told').count()) ? page.locator('.cp-told').innerText() : '';
const at = name => page.locator(`.cp-glide[data-token="${name}"]`).getAttribute('data-at');
// Taps go through real hit-testing at the centre of the control, by touch on
// a phone and by mouse otherwise.
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(phone ? 250 : 40); };
const focused = () => page.evaluate(() => { const e = document.activeElement; return {tag: e?.tagName || '', cls: e?.getAttribute('class') || '', focus: e?.dataset?.focus || '', id: e?.id || ''}; });
const focusOk = async label => {
  const f = await focused();
  assert.notEqual(f.tag, 'BODY', `${label}: focus is not on the page body`);
  assert.match(`${f.cls} ${f.focus} ${f.id}`, /gb-node|gb-hit|cp-|completion/, `${label}: focus on the board or a move control (${JSON.stringify(f)})`);
};
const inView = async (locator, label) => { await page.evaluate(() => scrollTo(0, 0)); const b = await locator.first().boundingBox(); const h = await page.evaluate(() => innerHeight); assert.ok(b && b.y >= 0 && b.y + b.height <= h, `${label}: in view without scrolling (${b && Math.round(b.y + b.height)} of ${h})`); };
const checks = [];

// One step of the app's own hint, made by taps on the board and buttons.
async function step(p, label) {
  const b = await board(p.id), h = copsMechanics[p.mechanic].hint(p, b);
  if (h.type !== 'move') return h;
  const a = h.action;
  if (['start', 'move', 'r'].includes(a.type)) await tap(dot(a.at ?? a.to));
  else if (['add', 'remove'].includes(a.type)) { await tap(dot(a.road[0])); await tap(dot(a.road[1])); }
  else if (a.type === 'fold') { await tap(dot(a.v)); await tap(dot(a.u)); }
  else if (a.type === 'go') { await tap(chip('C1')); await tap(dot(a.c1)); await tap(chip('C2')); await tap(dot(a.c2)); await tap(press('Go')); }
  else await tap(press({play: 'Play', edit: 'Roads', cant: 'Can’t'}[a.type]));
  await focusOk(`${label}: ${a.type}`);
  assert.notDeepEqual(await board(p.id), b, `${label}: the ${a.type} tap made a move`);
  return h;
}
async function finish(p, label, seen = async () => {}) {
  for (let i = 0; i < 60 && !await page.locator('#completion-heading').count(); i++) { const h = await step(p, `${label} ${i + 1}`); await seen(); if (h.type !== 'move') break; }
  await done();
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Cops QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // The satchel: the symbol, the playground, the puzzles and two groups.
  const family = page.locator('.satchel-family[data-view-key="family-cops"]');
  if (!(await family.evaluate(el => el.open))) await family.locator('summary').click();
  assert.equal(await family.locator('.family-ink-symbol').innerText(), '◐');
  assert.equal(await family.locator('.satchel-playground').count(), 1);
  const bands = await family.locator('.library-band h2').allInnerTexts();
  assert.ok(bands.includes('Folds') && bands.includes('Two cops'), `groups Folds and Two cops (${bands})`);
  await fit('satchel'); await family.screenshot({path: new URL(`satchel${phone ? '-phone' : ''}.png`, out).pathname});

  // Path of five: How to play; C put down, Undo, C again; the catch.
  let p = byId('cops-01');
  await open(p.id); await fit('path of five, fresh');
  await page.locator('[data-action="demo"]').first().click();
  assert.match(await page.locator('dialog').innerText(), /Tap a dot to put C there\. Then tap a dot next to C to move, or C’s own dot to stay\./);
  await press('Done').click();
  assert.equal(await page.locator('.cp-tray.cC').count(), 1, 'C waits to be put down');
  await shot('catch-fresh');
  await tap(dot('a')); await focusOk('C put down');
  assert.equal(await at('C'), 'a'); assert.equal(await at('R'), 'e', 'R starts as far away as it can');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual(await board(p.id), {start: null, moves: [], cant: null}, 'Undo takes C back up');
  await tap(dot('c'));
  assert.equal(await at('R'), 'a', 'from the middle, R takes an end');
  await tap(dot('b')); assert.equal(await at('C'), 'b');
  await shot('catch-moving'); await fit('path of five, moving');
  await tap(dot('a')); await done();
  assert.match(await told(), /^C caught R\.$/);
  await shot('catch-solved'); checks.push('path of five: Undo of a start, catch in two');

  // Path of seven: C stays by a tap on its own dot; Undo; the catch.
  p = byId('cops-02');
  await open(p.id); await tap(dot('d'));
  const r0 = await at('R');
  await tap(dot('d'));
  assert.equal(await page.locator('.cp-token.cC.stayed').count(), 1, 'C stays and shows it');
  assert.deepEqual((await board(p.id)).moves, ['d']);
  assert.equal(await page.locator('.cp-pips i.on').count(), 1, 'staying uses a move');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(p.id)).moves, []); assert.equal(await at('R'), r0);
  await finish(p, 'path of seven'); assert.equal((await board(p.id)).moves.length, 3);
  checks.push('path of seven: staying, Undo, catch in three');

  // Square: R next to C is caught; Undo; R kept away until every C move is answered.
  p = byId('cops-04');
  await open(p.id); await fit('square, fresh');
  assert.equal(await page.locator('.cp-tray.cR').count(), 1, 'R waits to be put down');
  const G4 = gameOf(p.parameters), c4 = sceneOf(p, {answers: []}).cop, next = G4.ids[G4.nb[c4].find(x => x !== c4)];
  await tap(dot(next));
  assert.match(await told(), /^C caught R\.$/, 'R next to C is caught');
  await shot('escape-caught');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(p.id)).answers, []);
  await step(p, 'square place'); await shot('escape-reply'); await fit('square, replying');
  await finish(p, 'square');
  assert.match(await told(), /^R gets away forever\.$/);
  await shot('escape-solved'); checks.push(`square: caught and Undo, away forever in ${(await board(p.id)).answers.length} answers`);

  // Ring of five.
  p = byId('cops-06');
  await open(p.id); await finish(p, 'ring of five');
  checks.push(`ring of five: away forever in ${(await board(p.id)).answers.length} answers`);

  // The house: Can't, then R answers every C move; C goes back and tries another move.
  p = byId('cops-08');
  await open(p.id); await inView(press('Can’t'), 'house, Can’t');
  await shot('cant-fresh');
  await tap(press('Can’t')); await focusOk('after Can’t');
  assert.equal(await page.locator('.cp-tray.cR').count(), 1, 'after Can’t the child plays R');
  let jumped = false;
  const jump = async () => { if (/^C tries another move\.$/.test(await told())) { if (!jumped) await shot('escape-jump'); jumped = true; } };
  await finish(p, 'house', jump);
  assert.ok(jumped, 'C tries another move');
  assert.equal((await board(p.id)).start, null, 'C was never put down');
  checks.push(`house: Can’t, away forever in ${(await board(p.id)).cant.length} answers, with a jump`);

  // Triangle with a tail: a wrong Can't is caught; Restart; the catch.
  p = byId('cops-07');
  await open(p.id); await tap(press('Can’t'));
  for (let i = 0; i < 12 && !/^C caught R\.$/.test(await told()); i++) {
    const s = sceneOf(p, await board(p.id)), x = [...s.taps.values()].at(-1).at;
    await tap(dot(x));
  }
  assert.match(await told(), /^C caught R\.$/);
  await page.locator('[data-action=hint]').first().click(); await page.locator('[data-action=hint]').first().click();
  assert.match(await page.locator('.hint-card p').first().innerText(), /C can always catch R here\. Restart and catch R\./);
  await shot('cant-wrong');
  await page.locator('[data-action="restart"]').first().click();
  assert.deepEqual(await board(p.id), {start: null, moves: [], cant: null});
  await finish(p, 'triangle with a tail'); checks.push('triangle with a tail: a wrong Can’t caught, Restart, catch');

  // Square and a new road: add, take away by tapping the road, refuse a second, Play, catch.
  p = byId('cops-09');
  await open(p.id); await fit('roads, fresh');
  await tap(dot('a')); assert.equal(await page.locator('.gb-node.picked').count(), 1, 'a dot is chosen');
  await tap(dot('c')); assert.deepEqual((await board(p.id)).added, [['a', 'c']]);
  await shot('roads-added');
  await tap(dot('b')); await tap(dot('d'));
  assert.match(await told(), /^No more new roads\.$/); assert.equal((await board(p.id)).added.length, 1);
  await tap(page.locator('[data-mechanic-wire] .gb-hit').first()); await focusOk('road taken away');
  assert.deepEqual((await board(p.id)).added, [], 'a tap on the new road takes it away');
  await finish(p, 'square and a road');
  assert.equal((await board(p.id)).play, true);
  checks.push('square and a road: add, refuse, take away, Play, catch');

  // Pentagon and a new road: a road, then Can't, then R answers.
  p = byId('cops-10');
  await open(p.id);
  assert.equal(await press('Can’t').isDisabled(), true, 'Can’t waits for the road');
  await tap(dot('a')); await tap(dot('c'));
  await tap(press('Can’t'));
  await finish(p, 'pentagon and a road'); checks.push('pentagon and a road: Can’t, away forever');
  p = byId('cops-11');
  await open(p.id); await finish(p, 'pentagon and two roads'); checks.push('pentagon and two roads: two roads, Play, catch');

  // Folds: a refused fold names the dot missed; then fold down to one dot.
  p = byId('cops-fold-01');
  await open(p.id); await fit('folds, fresh');
  await tap(dot('a')); await tap(dot('b'));
  assert.match(await told(), /^b can’t reach f\.$/); assert.deepEqual((await board(p.id)).folds, []);
  await shot('fold-refused');
  await tap(dot('a'));
  assert.equal(await page.locator('.gb-node.picked').count(), 0, 'a second tap lets the dot go');
  await finish(p, 'folds');
  assert.equal(await page.locator('.gb-node.gone').count(), 5); await shot('fold-solved');
  checks.push('fold down: refused fold, then one dot');
  // A refused Can't stands; fold until stuck; Can't.
  p = byId('cops-fold-02');
  await open(p.id); await tap(press('Can’t'));
  assert.match(await told(), /^There is a fold\.$/); assert.equal(await press('Can’t').isDisabled(), true);
  await shot('fold-cant-refused');
  await finish(p, 'pentagon with a road');
  assert.equal((await board(p.id)).claim, 'stuck');
  checks.push('fold stuck: refused Can’t, folds, Can’t');

  // Two cops: plan C1 and C2, see the plan, Go.
  p = byId('cops-two-01');
  await open(p.id); await fit('two cops, fresh');
  const h2 = copsMechanics.copstwo.hint(p, await board(p.id)).action;
  await tap(chip('C1')); await tap(dot(h2.c1));
  assert.equal(await chip('C2').getAttribute('aria-pressed'), 'true', 'C2 is chosen next');
  await tap(dot(h2.c2));
  assert.equal(await page.locator('.cp-token.ghost').count(), [h2.c1, h2.c2].filter(x => x !== 'a').length, 'the plan shows');
  await shot('two-planned'); await inView(press('Go'), 'two cops, Go');
  await tap(press('Go')); await focusOk('after Go');
  assert.deepEqual((await board(p.id)).moves, [[h2.c1, h2.c2]]);
  await finish(p, 'two cops on six'); await shot('two-solved'); checks.push('two cops on six: plan, Go, catch in three');
  p = byId('cops-two-02');
  await open(p.id); await finish(p, 'two cops on eight'); assert.equal((await board(p.id)).moves.length, 4); checks.push('two cops on eight: catch in four');

  // The playground: maps, then R against the app's C, then C.
  p = byId('cops-playground');
  await open(p.id); await fit('playground');
  assert.equal(await page.locator('.cp-pick').count(), 5);
  const row = await page.locator('.cp-pick').evaluateAll(els => new Set(els.map(e => Math.round(e.getBoundingClientRect().top))).size);
  assert.equal(row, 1, 'the maps sit in one row');
  await tap(page.locator('[data-focus="cp-map-ring"]')); await focusOk('map chosen');
  assert.equal((await board(p.id)).map, 'ring');
  await tap(page.locator('[data-focus="cp-side-robber"]'));
  assert.equal(await page.locator('.cp-tray.cR').count(), 1);
  const Gs = gameOf(p.parameters.maps.ring), cs = game.copStart(Gs), rs = game.escapePlaces(Gs, cs)[0];
  await tap(dot(Gs.ids[rs]));
  assert.notEqual(await at('C'), Gs.ids[cs], 'the app’s C moves');
  await shot('playground-robber'); await fit('playground, R');
  await tap(page.locator('[data-focus="cp-map-tree"]')); await tap(page.locator('[data-focus="cp-side-cop"]'));
  assert.deepEqual(await board(p.id), {map: 'tree', side: 'cop', moves: []}, 'a new map and side start a new game');
  const Gt = gameOf(p.parameters.maps.tree), ct = game.bestStarts(Gt)[0];
  await tap(dot(Gt.ids[ct]));
  for (let i = 0; i < 20 && !/^C caught R\.$/.test(await told()); i++) {
    const s = sceneOf(p, await board(p.id));
    await tap(dot(Gt.ids[game.copMoves(Gt, s.cop, s.robber)[0]]));
  }
  assert.match(await told(), /^C caught R\.$/); await shot('playground-caught');
  checks.push('playground: maps in a row, R on the ring, C catches on the tree');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, checks, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
