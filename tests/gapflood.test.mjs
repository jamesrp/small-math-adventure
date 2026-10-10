// Meeting roads gaps: routes held to shortest, gaps and floods, drawing and
// taking back, the chosen route passing on, taps on dots and roads, arrow
// keys, every gap 0, a gap of k, Can't with the tripod and the ladder's
// columns, Best with the homes' steps, hints, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {gapMechanics, isRoute, nextSteps, gapAt, floodOf, thinness, allRoutes, triangles, bestOf, coverOf, homeSteps, columnSides, centreOf, forcedCentre, fatDots, penOf, dotAction, roadAction, arrowAction, goodTriangles, stepWords} from '../dist/families/gapflood/gapflood.js';
import {loadPack} from '../scripts/packs.mjs';

const gaps = JSON.parse(await readFile(new URL('../dist/families/gapflood/gapflood.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = n => gaps.puzzles.find(p => p.number === n);
const mech = gapMechanics.gapflood;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const SIDES3 = ['AB', 'BC', 'CA'];
const draw = (side, dots) => dots.split(' ').map(to => ({type: 'draw', side, to}));
// The chosen route is view state; each view starts from a fresh one, as opening a puzzle does.
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const pen = (p, a) => { const html = playView(p, a, {pack, selected: null, message: ''}); return html.match(/gf-chip t(\w+)[^"]*" data-action="mechanic-ui" data-ui='[^']*' data-focus="[^"]*" aria-pressed="true"/)?.[1] || null; };

test('routes are held to shortest; gaps are measured along every road', () => {
  const p = byId(4), q = p.parameters;
  assert.deepEqual(allRoutes(q, 'AB').length, 1);
  assert.equal(allRoutes(q, 'CA').length, 70);
  assert.ok(isRoute(q, 'CA', ['44', '34', '24']));
  assert.equal(isRoute(q, 'CA', ['44', '45']), false, 'off the map');
  assert.equal(isRoute(q, 'CA', ['44', '34', '44']), false, 'back again');
  assert.equal(isRoute(q, 'AB', ['00', '01']), false, 'away from B');
  assert.deepEqual(nextSteps(q, 'CA', ['44']).sort(), ['34', '43']);
  const routes = {AB: ['00', '10', '20', '30', '40'], BC: ['40', '41', '42', '43', '44'], CA: ['44', '34', '24', '14', '04', '03', '02', '01', '00']};
  assert.equal(gapAt(q, routes, '04'), 4, 'the top left corner');
  assert.equal(gapAt(q, routes, '02'), 2, 'two steps down to A');
  assert.equal(gapAt(q, routes, '00'), 0, 'A is on two routes');
  assert.equal(gapAt(q, routes, '22'), null, 'off the routes');
  // Along the coloured roads alone, (1, 4) would be 5 from AB; across the middle it is 3 from BC.
  assert.equal(gapAt(q, routes, '14'), 3);
  assert.deepEqual(thinness(q, routes), {gap: 4, at: ['04']});
  const fl = floodOf(q, routes, '03');
  assert.equal(fl.gap, 3);
  assert.deepEqual(fl.arrive, ['00'], 'the flood meets AB at A; the right side is 4 steps away');
  assert.ok(fl.lit.includes('12') && !fl.lit.includes('00'));
  assert.equal(bestOf(q), 4);
  assert.equal(coverOf(q), 4);
});

test('trees, ladders, the ring and the grid: the biggest gaps and their certificates', () => {
  const tree = byId(2).parameters;
  assert.equal(bestOf(tree), 0);
  for (const s of ['AB', 'BC', 'CA']) assert.equal(allRoutes(tree, s).length, 1, `${s} is forced on a tree`);
  assert.deepEqual(centreOf(Object.fromEntries(['AB', 'BC', 'CA'].map(s => [s, allRoutes(tree, s)[0]]))), ['c'], 'the tripod’s centre');
  const ladder = byId(5).parameters;
  assert.equal(bestOf(ladder), 1);
  assert.deepEqual(columnSides(ladder).map(c => c.sides.length), [2, 2, 2, 3, 2, 2, 2, 2], 'two routes cross every column');
  const ring = byId(6).parameters;
  assert.equal(bestOf(ring), 3);
  assert.equal(homeSteps(ring).h9, 3);
  assert.equal(bestOf(byId(9).parameters), 3);
  const big = byId(10).parameters;
  assert.deepEqual(SIDES3.map(s => allRoutes(big, s).length), [7, 252, 7], 'off the corners every route has choices');
  assert.equal(bestOf(big), 5);
  assert.equal(coverOf(big), 5, 'the homes’ covering pins the biggest gap');
  assert.deepEqual(fatDots(big).sort(), ['55', '66'], 'only two of the four dots 5 steps from every home reach it');
  assert.equal(goodTriangles(big).length, 74);
  for (const t of triangles(big).filter((_, k) => k % 97 === 0)) assert.equal(t.gap, thinness(big, t.routes).gap, 'the quick search agrees with gap by gap');
  assert.deepEqual(fatDots(byId(8).parameters).sort(), ['33', '44']);
  assert.equal(forcedCentre(tree), 'c');
  assert.deepEqual(goodTriangles(byId(7).parameters).length, 2, 'two tripods through the meeting dot');
  assert.equal(stepWords(ring, 'h12', 'h11'), 'to 11 o’clock');
  assert.equal(stepWords(byId(4).parameters, '00', '10'), 'one step right');
});

test('drawing: steps nearer the end, taking back to a dot, the chosen route passing on round the triangle', () => {
  const p = byId(1), q = p.parameters;
  mech.reset(p);
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'draw', side: 'AB', to: '01'}), null, 'up from A is longer than shortest');
  assert.equal(move(p, a, {type: 'draw', side: 'AB', to: '20'}), null, 'along no road');
  a = play(p, a, ...draw('AB', '10'));
  assert.equal(pen(p, a), 'AB');
  a = play(p, a, ...draw('AB', '20'));
  assert.equal(penOf(q, a.board, null), 'BC', 'with none chosen, the first unfinished route');
  assert.equal(pen(p, a), 'BC', 'a finished route passes the pen to the next, which starts where it ended');
  a = play(p, a, ...draw('BC', '21 22'));
  assert.equal(pen(p, a), 'CA');
  a = play(p, a, ...draw('CA', '12 02 01'));
  assert.deepEqual(dotAction(q, a.board, 'CA', '12'), {type: 'cut', side: 'CA', to: '12'}, 'a tap on the route takes it back to there');
  assert.deepEqual(dotAction(q, a.board, 'CA', '00'), {type: 'draw', side: 'CA', to: '00'});
  assert.equal(dotAction(q, a.board, 'CA', '01'), null, 'the end keeps the route');
  const back = play(p, a, {type: 'cut', side: 'CA', to: '22'});
  assert.deepEqual(back.board.routes.CA, ['22'], 'back to its home');
  a = play(p, a, ...draw('CA', '00'));
  assert.equal(pen(p, a), null, 'a finished triangle lets taps flood');
  assert.deepEqual(dotAction(q, a.board, null, '02'), {type: 'flood', at: '02'});
  assert.equal(dotAction(q, a.board, null, '11'), null, 'a dot off the routes');
  // With a route chosen, its own dots take it back and other routes’ dots flood.
  assert.deepEqual(dotAction(q, a.board, 'CA', '02'), {type: 'cut', side: 'CA', to: '02'});
  assert.deepEqual(dotAction(q, a.board, 'AB', '02'), {type: 'flood', at: '02'});
  // Choosing a route by its button, and letting go again.
  mech.ui(p, {pen: 'AB'});
  assert.equal(pen(p, a), 'AB');
  mech.ui(p, {pen: 'AB'});
  assert.equal(pen(p, a), null);
});

test('roads and arrow keys draw and take back too', () => {
  const p = byId(4), q = p.parameters, a = play(p, freshAttempt(p), ...draw('CA', '34'));
  const road = (u, v) => q.roads.findIndex(r => r.join() === `${u},${v}` || r.join() === `${v},${u}`);
  assert.deepEqual(roadAction(q, a.board, 'CA', road('24', '34')), {type: 'draw', side: 'CA', to: '24'});
  assert.deepEqual(roadAction(q, a.board, 'CA', road('34', '44')), {type: 'cut', side: 'CA', to: '44'});
  assert.equal(roadAction(q, a.board, 'CA', road('00', '10')), null, 'a road away from the end');
  assert.deepEqual(arrowAction(q, a.board, 'CA', 'ArrowLeft'), {type: 'draw', side: 'CA', to: '24'});
  assert.deepEqual(arrowAction(q, a.board, 'CA', 'ArrowDown'), {type: 'draw', side: 'CA', to: '33'});
  assert.deepEqual(arrowAction(q, a.board, 'CA', 'ArrowRight'), {type: 'cut', side: 'CA', to: '44'}, 'back the way it came');
  assert.equal(arrowAction(q, a.board, 'CA', 'ArrowUp'), null, 'no road that way');
  const t = byId(2);
  assert.deepEqual(arrowAction(t.parameters, freshAttempt(t).board, 'AB', 'ArrowRight'), {type: 'draw', side: 'AB', to: 'i'});
  assert.deepEqual(arrowAction(t.parameters, freshAttempt(t).board, 'BC', 'ArrowLeft'), {type: 'draw', side: 'BC', to: 'd'}, 'a diagonal road counts');
});

test('every gap 0 solves when the triangle is finished; a gap of k solves when flooded', () => {
  const z = byId(3);
  let a = play(z, freshAttempt(z), ...draw('AB', '10 20 30 40'), ...draw('BC', '41 42 43 44'), ...draw('CA', '34 24 14 04 03 02 01'));
  assert.equal(isSolved(z, a.board), false, 'not yet finished');
  a = play(z, a, ...draw('CA', '00'));
  assert.equal(isSolved(z, a.board), false, 'a gap of 4 at the top left');
  a = play(z, a, {type: 'cut', side: 'CA', to: '44'}, ...draw('CA', '43 42 41 40 30 20 10 00'));
  assert.ok(isSolved(z, a.board), 'CA through B');
  assert.match(view(z, a), /data-node="40"[^>]*class="[^"]*\bcentre\b|class="[^"]*\bcentre\b[^"]*"[^>]*data-node="40"/, 'the tripod’s centre, B, is ringed');
  assert.match(view(z, a), /gf-glow/, 'its roads glow');

  const r = byId(4);
  a = play(r, freshAttempt(r), ...draw('AB', '10 20 30 40'), ...draw('BC', '41 42 43 44'), ...draw('CA', '34 24 14 04 03 02 01 00'));
  assert.equal(move(r, freshAttempt(r), {type: 'flood', at: '00'}), null, 'no flood before the triangle is drawn');
  assert.doesNotMatch(view(r, a), /Take AB back to here/, 'reopened with the triangle finished, no route is chosen');
  assert.match(view(r, a), /0 across, 4 up, on CA. Flood it/, 'and a tap floods');
  const one = play(r, a, {type: 'flood', at: '01'});
  assert.equal(isSolved(r, one.board), false, 'a gap of 1');
  assert.match(view(r, one), /gb-badge[^>]*><circle r="2.9"\/><text y="1.15">1</);
  const four = play(r, one, {type: 'flood', at: '04'});
  assert.ok(isSolved(r, four.board), 'a gap of 4 is 2 or more');
  const html = view(r, four);
  assert.match(html, /class="gf-flood d0"/, 'the flood’s roads');
  assert.match(html, /meet/, 'where it meets another route');
  const changed = play(r, one, {type: 'cut', side: 'CA', to: '04'});
  assert.equal(changed.board.flood, null, 'a change to a route clears the flood');
});

test('Can’t: refused with “It can be done.” until a route changes; right on the tree and the ladder, with certificates', () => {
  const r = byId(4);
  let a = play(r, freshAttempt(r), {type: 'cant'});
  assert.equal(a.board.told, 'can');
  assert.match(view(r, a), /It can be done\./);
  assert.match(view(r, a), /data-focus="gf-cant" disabled/);
  assert.equal(move(r, a, {type: 'cant'}), null);
  a = play(r, a, ...draw('CA', '34'));
  assert.equal(a.board.told, null, 'a route changed');

  const t = byId(2);
  assert.equal(move(t, freshAttempt(t), {type: 'cant'}), null, 'on a tree Can’t comes with a tap');
  mech.reset(t);
  let fresh = view(t, freshAttempt(t), true);
  assert.match(fresh, /data-ui='\{"claiming":true\}'[^>]*aria-pressed="false">Can’t/, 'Can’t is a button that waits for the tap');
  mech.ui(t, {claiming: true});
  fresh = view(t, freshAttempt(t), true);
  assert.match(fresh, /Tap where all three routes meet\./);
  assert.match(fresh, /aria-pressed="true">Can’t/);
  assert.match(fresh, /aria-label="[^"]*All three routes meet here" data-gb-node="b"/, 'every dot can be chosen');
  const miss = play(t, freshAttempt(t), {type: 'cant', at: 'b'});
  assert.equal(miss.board.told, 'miss');
  assert.equal(isSolved(t, miss.board), false);
  assert.match(view(t, miss, true), /The three routes don’t all meet there\./);
  const right = play(t, miss, {type: 'cant', at: 'c'});
  assert.ok(isSolved(t, right.board));
  mech.ui(t, {claiming: false});
  const html = view(t, right);
  assert.match(html, /gf-glow/, 'the tripod glows, drawn for the child when the routes were not');
  assert.equal((html.match(/class="gf-trail/g) || []).length, 16, 'eight roads, each on two routes');
  assert.match(html, /class="gb-node centre"[^>]*data-node="c"/, 'and the centre the child tapped is ringed');

  const l = byId(5);
  const ladder = play(l, freshAttempt(l), {type: 'cant'});
  assert.ok(isSolved(l, ladder.board));
  const lv = view(l, ladder);
  assert.match(lv, /Two routes cross every column\./);
  assert.equal((lv.match(/class="gf-column/g) || []).length, 17, 'eight columns with two rings, one with three');
});

test('Best: refused with “A bigger gap is possible.” until a new flood; right with each dot’s steps from a home', () => {
  const p = byId(9);
  let a = play(p, freshAttempt(p), ...draw('AB', '10 20 30 40 41 42'), ...draw('BC', '32 33 34 24'), ...draw('CA', '14 04 03 02 01 00'));
  assert.equal(move(p, freshAttempt(p), {type: 'best'}), null, 'Best needs a flood');
  a = play(p, a, {type: 'flood', at: '02'});
  a = play(p, a, {type: 'best'});
  assert.equal(a.board.told, 'bigger');
  assert.match(view(p, a), /A bigger gap is possible\./);
  assert.equal(move(p, a, {type: 'best'}), null, 'not again on the same flood');
  a = play(p, a, {type: 'flood', at: '03'});
  assert.equal(a.board.told, null);
  a = play(p, a, {type: 'best'});
  assert.ok(isSolved(p, a.board));
  const html = view(p, a);
  assert.match(html, /Every dot is within 3 steps of A, B or C\./);
  assert.match(html, /class="gb-node lit d3 far"[^>]*>.*?<text class="gb-label"[^>]*>3</, 'the farthest dots are 3 steps from a home');
  assert.doesNotMatch(html, /gf-flood/, 'the certificate replaces the flood');
});

test('hints: the authored nudge, then take back, draw, flood and claim; alone they solve every puzzle', () => {
  for (const q of gaps.puzzles) assert.ok(typeof q.hints[0] === 'string' && q.hints[0].length > 10 && q.hints[0].length < 160, `${q.id}: an authored first nudge`);
  const p = byId(4);
  const fresh = freshAttempt(p);
  assert.equal(nextHint(p, fresh).text, 'Draw AB one step right.');
  const thin = play(p, fresh, ...draw('CA', '43 42 41 40'));
  const h = nextHint(p, thin);
  assert.equal(h.action.type, 'cut');
  assert.match(h.text, /^Take CA back/);
  const tree = byId(2);
  const th = nextHint(tree, play(tree, freshAttempt(tree), ...draw('AB', 'i')));
  assert.equal(th.text, 'On a tree each pair of homes has only one route, and the three routes share every road. Press Can’t and tap where all three meet.', 'the reason comes with Can’t');
  assert.deepEqual(th.action, {type: 'cant', at: 'c'});
  const ladder = byId(5);
  assert.equal(nextHint(ladder, play(ladder, freshAttempt(ladder), ...draw('AB', '10'))).text, 'Two routes cross every column, and a column is one rung, so no gap can be 2. Press Can’t.');
  const ring = byId(6);
  assert.match(nextHint(ring, freshAttempt(ring)).text, /^Draw AB to 11 o’clock\.$/);
  for (const q of gaps.puzzles) {
    let a = freshAttempt(q), n = 0;
    while (!isSolved(q, a.board) && n++ < 80) { const x = nextHint(q, a); assert.equal(x.type, 'move', `${q.id}: ${x.text}`); a = play(q, a, x.action); }
    assert.ok(isSolved(q, a.board), `${q.id}: hints alone solve it`);
  }
});

test('Undo takes back a flood, a step and a claim, and hands the pen back', () => {
  const p = byId(1);
  mech.reset(p);
  const ab = play(p, freshAttempt(p), ...draw('AB', '10 20'));
  assert.equal(pen(p, ab), 'BC', 'AB finished passes the pen on');
  const back = undo(ab), carried = {...back, board: mech.carry(p, ab.board, back.board)};
  assert.deepEqual(carried.board.routes.AB, ['00', '10']);
  assert.equal(pen(p, carried), 'AB', 'after Undo the pen is back on AB');
  assert.match(playView(p, carried, {pack, selected: null, message: ''}), /aria-label="[^"]*Draw AB here" data-gb-node="20"/, 'so one tap takes the step again');
  mech.reset(p);
  let a = play(p, freshAttempt(p), ...draw('AB', '10 20'), ...draw('BC', '21 22'), ...draw('CA', '12 02 01 00'), {type: 'flood', at: '12'});
  assert.equal(a.board.flood, '12');
  assert.equal(undo(a).board.flood, null);
  assert.deepEqual(undo(undo(a)).board.routes.CA, ['22', '12', '02', '01']);
});

test('forged saves are rejected', () => {
  const p = byId(6), fresh = freshAttempt(p).board;
  assert.equal(validBoard(p, {...fresh, routes: {...fresh.routes, AB: ['h12', 'h2']}}), false, 'along no road');
  assert.equal(validBoard(p, {...fresh, routes: {...fresh.routes, BC: ['h6', 'h7']}}), false, 'away from C');
  assert.equal(validBoard(p, {...fresh, flood: 'h12'}), false, 'a flood before the triangle');
  assert.equal(validBoard(p, {...fresh, done: true}), false, 'Best with no flood');
  assert.equal(validBoard(p, {...fresh, told: 'can'}), false, 'Can’t in a Best puzzle');
  const t = byId(2);
  assert.ok(validBoard(t, {...freshAttempt(t).board, done: true}), 'a right Can’t');
  assert.equal(validBoard(byId(4), {...freshAttempt(byId(4)).board, done: true}), false, 'a Can’t that is wrong');
  assert.ok(validBoard(t, {...freshAttempt(t).board, told: 'miss'}), 'a tap that missed the centre');
  assert.equal(validBoard(t, {...freshAttempt(t).board, told: 'miss', done: true}), false);
  assert.equal(validBoard(byId(4), {...freshAttempt(byId(4)).board, told: 'miss'}), false, 'a missed centre off the tree');
});

test('every puzzle renders its map, homes and route buttons, with one short objective', () => {
  const objectives = {zero: 'Make every gap 0.', best: 'Make the biggest gap you can.'};
  for (const p of gaps.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /gf-puzzle/, p.id);
    assert.match(html, /gb-board/, p.id);
    assert.match(html, /aria-label="Route AB"/, p.id);
    assert.equal(p.visibleObjective, objectives[p.parameters.goal] || `Make a gap of ${p.parameters.k} or more.`, p.id);
    assert.equal(/gf-cant/.test(html), p.parameters.goal === 'reach', `${p.id}: Can’t only where a gap is asked for`);
    assert.equal(/gf-best/.test(html), p.parameters.goal === 'best', `${p.id}: Best only in Best puzzles`);
    assert.doesNotMatch(html, /\d+ of \d+/, `${p.id}: no counts`);
  }
  const p = byId(4), html = view(p, freshAttempt(p));
  assert.match(html, /data-gb-node="10"/, 'the next step can be tapped');
  assert.doesNotMatch(html, /data-gb-node="22"/, 'a dot with nothing to do is not a control');
  assert.match(html, /gb-node home pen tAB/, 'the chosen route’s end is ringed');
});
