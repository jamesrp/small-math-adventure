// Glued squares (Week 64): the two board options it added (stable seam marks,
// an unrolled strip with no spreading), straight trips and block words, the
// gluings that work and the bound, gluing and Can't with the dots, corner
// groups in the child's own colours and That's all, Undo keeping a refusal,
// hints, the playground, forged saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {surfaceOf, develop, planeBoard, cornerClasses} from '../dist/portal-board.js';
import G, {tripOf, dotOf, gluedSurface, goalTrips, solutionsOf, longestOf, fullGluingsOf, cornerCycles, cornerMatches, groupsOf, fixedSurface, allCorners, playS, playStart, GROUP_COLOURS} from '../dist/families/glued/glued.js';
import {loadPack} from '../scripts/packs.mjs';

const glued = JSON.parse(await readFile(new URL('../dist/families/glued/glued.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const M = G.mechanics.glued;
const byId = id => glued.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const glueAll = (p, a, w) => {
  for (const kind of p.parameters.sides) for (const s of Object.keys(p.parameters.squares)) if (w[kind][s] !== null && a.board[kind][s] !== w[kind][s]) a = play(p, a, {type: 'glue', side: kind, from: s, to: w[kind][s]});
  return a;
};
// Undo as the app does it, with the mechanic's carry.
const undoCarry = (p, a) => { const next = undo(a); return {...next, board: M.carry(p, a.board, next.board)}; };
const L = {right: {A: 'B', B: 'A', C: 'C'}, up: {A: 'C', B: 'B', C: 'A'}};

test('board: stable marks keep each glued side’s look while other sides change', () => {
  const squares = {A: [0, 0], B: [2, 0], C: [0, 2]};
  const one = surfaceOf({squares, right: {A: 'B', B: null, C: null}, up: {A: null, B: null, C: null}, stableMarks: true});
  const two = surfaceOf({squares, right: {A: 'B', B: 'C', C: null}, up: {A: 'C', B: null, C: null}, stableMarks: true});
  const look = (S, s, side) => S.marks.find(m => m.s === s && m.side === side);
  assert.deepEqual([look(one, 'A', 'right').shape, look(one, 'A', 'right').colour], [look(two, 'A', 'right').shape, look(two, 'A', 'right').colour]);
  assert.equal(look(two, 'B', 'left').shape, look(two, 'A', 'right').shape, 'partners share a mark');
  // Without the option the first run takes the first look, as before.
  const plain = surfaceOf({squares, right: {A: null, B: 'C', C: null}, up: {A: null, B: null, C: null}});
  assert.equal(plain.marks[0].k, 0);
});

test('board: spread false places only the anchors (an unrolled strip)', () => {
  const S = surfaceOf({squares: {A: [0, 0], B: [1, 0], C: [0, 1]}, ...L});
  const anchors = [{s: 'A', X: 0, Y: 0}, {s: 'B', X: 1, Y: 0}];
  assert.equal(develop(S, anchors, [-3, -3, 3, 3], {spread: false}).placed.size, 2);
  assert.ok(develop(S, anchors, [-3, -3, 3, 3]).placed.size > 2, 'spreading is still the default');
  const svg = planeBoard(S, {anchors, spread: false, show: [[0, 0], [2, 1]], min: 1, margin: 0});
  assert.equal((svg.match(/class="pb-square/g) || []).length, 2);
});

test('trips: a block lands on the same spot of some square; walls and corners stop it', () => {
  const p = byId('glued-04'), q = p.parameters;
  const S = gluedSurface(q, L), t = tripOf(S, dotOf(q, 'A'), [1, 1]);
  assert.deepEqual(t.blocks.map(b => b.s), ['B', 'C', 'A'], 'Problem 7 on the L');
  assert.equal(t.home, 3);
  assert.deepEqual(t.crossings.map(c => `${c.kind}:${c.from}${c.to}`), ['right:AB', 'up:BB', 'right:BA', 'up:AC', 'right:CC', 'up:CA']);
  const open = tripOf(gluedSurface(q, {right: {A: 'B', B: null, C: null}, up: {A: null, B: null, C: null}}), dotOf(q, 'A'), [1, 1]);
  assert.equal(open.stop, 'wall');
  assert.equal(open.home, null);
  // Problem 8 on the L: A alone in one block, B and C in two.
  const p8 = byId('glued-05').parameters, S8 = gluedSurface(p8, L);
  assert.deepEqual(['A', 'B', 'C'].map(s => tripOf(S8, dotOf(p8, s), [2, 1]).home), [1, 2, 2]);
  // Problem 9's two right and three up from a corner-free start meets a corner.
  const corner = tripOf(surfaceOf({squares: {A: [0, 0], B: [1, 0], C: [0, 1]}, ...L}), {s: 'A', x: [1, 4], y: [1, 2]}, [1, 2]);
  assert.equal(corner.stop, 'corner');
});

test('the fast enumeration agrees with drawn trips on every full gluing', () => {
  for (const id of ['glued-04', 'glued-05', 'glued-09']) {
    const p = byId(id), q = p.parameters;
    const all = fullGluingsOf(q, () => true);
    assert.equal(all.length, 36);
    for (const g of all) {
      const drawn = goalTrips(q, g);
      drawn.forEach(t => assert.ok(t.home !== null && t.home <= 3, `${id}: home within three blocks`));
      const works = drawn.every((t, k) => t.home === q.trips[k].blocks);
      assert.equal(solutionsOf(q).some(s => JSON.stringify([s.right, s.up]) === JSON.stringify([g.right, g.up])), works, `${id}: ${JSON.stringify(g)}`);
    }
  }
  assert.equal(solutionsOf(byId('glued-07').parameters).length, 0, 'four blocks on three squares: none');
  assert.equal(longestOf(byId('glued-07').parameters).length, 12);
  assert.equal(solutionsOf(byId('glued-11').parameters).length, 0, 'five blocks on four squares: none');
});

test('gluing: a side glued again leaves its old partner; only the puzzle’s sides glue', () => {
  const p = byId('glued-01');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'glue', side: 'up', from: 'A', to: 'B'}), null, 'tops are fixed here');
  a = play(p, a, {type: 'glue', side: 'right', from: 'A', to: 'B'}, {type: 'glue', side: 'right', from: 'C', to: 'B'});
  assert.deepEqual(a.board.right, {A: null, B: null, C: 'B'});
  a = glueAll(p, a, {right: {A: 'B', B: 'C', C: 'A'}});
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'glue', side: 'right', from: 'A', to: 'A'}), null, 'nothing moves after a solve');
});

test('Can’t: only after a gluing, with every dot; a wrong one is refused through Undo', () => {
  const p = byId('glued-07'), dots = ['A', 'B', 'C'];
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'cant', dots}), null, 'not before an attempt');
  a = play(p, a, {type: 'glue', side: 'right', from: 'A', to: 'B'});
  assert.equal(move(p, a, {type: 'cant', dots: ['A', 'B']}), null, 'every dot');
  const right = play(p, a, {type: 'cant', dots: ['C', 'A', 'B']});
  assert.ok(isSolved(p, right.board) && right.board.claimed);
  // After the claim the beads show three dots for four blocks.
  const html = view(p, right);
  assert.equal((html.match(/class="on lettered/g) || []).length, 3);
  assert.match(html, /<i class="on lettered home">A<\/i><i class="none">/, "the start’s dot last, then no dot");
  assert.equal((html.match(/class="none"/g) || []).length, 1);

  const q = byId('glued-04');
  let b = play(q, freshAttempt(q), {type: 'glue', side: 'up', from: 'A', to: 'B'});
  const wrong = play(q, b, {type: 'cant', dots: ['A', 'B', 'C']});
  assert.equal(wrong.board.told, 'way');
  assert.match(view(q, wrong), /There is a way\./);
  assert.match(view(q, wrong), /data-focus="gl-cant"[^>]*disabled/, 'Can’t is shut');
  const back = undoCarry(q, wrong);
  assert.equal(back.board.told, 'way', 'Undo keeps the refusal');
  assert.equal(move(q, back, {type: 'cant', dots: ['A', 'B', 'C']}), null);
  const again = play(q, back, {type: 'glue', side: 'right', from: 'A', to: 'B'});
  assert.equal(again.board.told, null, 'a new gluing lifts it');
});

test('the Can’t view: the dots become controls, tapped dots are ringed', () => {
  const p = byId('glued-07');
  M.reset(p);
  let a = play(p, freshAttempt(p), {type: 'glue', side: 'right', from: 'A', to: 'B'});
  assert.doesNotMatch(view(p, a), /gl-dot-hit/);
  M.ui(p, {claiming: true});
  let html = view(p, a);
  assert.equal((html.match(/gl-dot-hit/g) || []).length, 3);
  assert.doesNotMatch(html, /gl-side-hit/, 'sides wait while the dots are open');
  M.ui(p, {picked: ['B']});
  html = view(p, a);
  assert.equal((html.match(/gl-ring picked/g) || []).length, 1);
  // A new gluing closes the dots.
  a = play(p, a, {type: 'glue', side: 'up', from: 'B', to: 'C'});
  assert.doesNotMatch(view(p, a), /gl-dot-hit/);
  M.reset(p);
});

test('corners: matches cross one glued side; chains go round each point; the child’s own colours', () => {
  const p = byId('glued-06'), S = fixedSurface(p.parameters);
  assert.deepEqual(cornerClasses(S).map(c => c.corners.length), [12]);
  for (const cycle of cornerCycles(S)) cycle.forEach((k, i) => assert.ok(cornerMatches(S, k).includes(cycle[(i + 1) % cycle.length]), `${k} meets the next corner`));
  // No colour until the child joins corners; then colours in the order joined.
  let a = freshAttempt(p);
  assert.doesNotMatch(view(p, a), /gl-wedge g\d/, 'no colours before a join');
  a = play(p, a, {type: 'link', a: 'C:00', b: 'C:10'}, {type: 'link', a: 'A:00', b: 'B:10'});
  const g = groupsOf(S, a.board.links);
  assert.equal(g.colourOf('C:00'), 0);
  assert.equal(g.colourOf('A:00'), 1);
  assert.equal(g.colourOf('A:11'), undefined);
  a = play(p, a, {type: 'link', a: 'A:00', b: 'C:01'});
  assert.equal(groupsOf(S, a.board.links).colourOf('A:00'), 1, 'a growing group keeps its colour');
  assert.equal(move(p, a, {type: 'link', a: 'A:00', b: 'A:10'}), null, 'A’s two lower corners don’t meet');
  assert.equal(move(p, a, {type: 'link', a: 'B:10', b: 'A:00'}), null, 'already one group');
  assert.ok(GROUP_COLOURS.length >= 8, 'enough colours for sixteen corners');
});

test('That’s all: refused while corners in two groups meet, through Undo; then the rosettes', () => {
  const p = byId('glued-03');
  const early = play(p, freshAttempt(p), {type: 'link', a: 'A:10', b: 'B:00'}, {type: 'all'});
  assert.equal(early.board.told, 'more');
  assert.match(view(p, early), /Some corners still meet\./);
  assert.equal(move(p, early, {type: 'all'}), null);
  const back = undoCarry(p, early);
  assert.equal(back.board.told, 'more', 'Undo keeps the refusal');
  let b = back;
  for (const [x, y] of [['A:11', 'B:01'], ['A:11', 'A:10'], ['A:00', 'B:10'], ['A:01', 'B:11'], ['A:00', 'A:01']]) b = play(p, b, {type: 'link', a: x, b: y});
  assert.equal(b.board.told, null, 'a join lifts the refusal');
  b = play(p, b, {type: 'all'});
  assert.ok(isSolved(p, b.board));
  const html = view(p, b);
  assert.equal((html.match(/class="gl-rose"/g) || []).length, 2, 'one rosette per point');
  assert.equal((html.match(/gl-rose-wedge/g) || []).length, 8);
  // The L: one rosette, twelve corners in three rings.
  const l = byId('glued-06');
  let c = freshAttempt(l);
  for (let k = 0; k < 40 && !isSolved(l, c.board); k++) c = play(l, c, nextHint(l, c).action);
  assert.equal((view(l, c).match(/gl-rose-wedge/g) || []).length, 12);
});

test('hints: from every puzzle’s start they reach a solve, quickly, and never begin with a claim', () => {
  for (const p of glued.puzzles.filter(p => p.band !== 'playground')) {
    let a = freshAttempt(p), steps = 0;
    assert.notEqual(nextHint(p, a).action.type, 'cant', p.id);
    while (!isSolved(p, a.board)) {
      const t0 = performance.now(), h = nextHint(p, a);
      assert.ok(performance.now() - t0 < 100, `${p.id}: a hint in under 100 ms`);
      if (h.action.type === 'cant') assert.match(h.text, /twice/, `${p.id}: the reason before Can’t`);
      a = play(p, a, h.action);
      assert.ok(++steps < 40, p.id);
    }
  }
});

test('the playground: surfaces, arrows and starts; never solved and no Hint', () => {
  const p = byId('glued-playground'), q = p.parameters;
  let a = freshAttempt(p);
  assert.ok(M.noHint(p));
  assert.equal(nextHint(p, a).type, 'done');
  assert.equal(a.board.dir, 0);
  a = play(p, a, {type: 'start', s: 'A', i: 1, j: 1});
  assert.equal(tripOf(playS(q, a.board), playStart(q, a.board), [1, 0]).home, 2, 'the L’s bottom row: two blocks right');
  a = play(p, a, {type: 'start', s: 'C', i: 1, j: 1});
  assert.equal(tripOf(playS(q, a.board), playStart(q, a.board), [1, 0]).home, 1, 'its top row: one');
  a = play(p, a, {type: 'start', s: 'A', i: 0, j: 0}, {type: 'dir', k: 2});
  assert.equal(tripOf(playS(q, a.board), playStart(q, a.board), [1, 1]).stop, 'corner', 'one right and one up from a corner cell meets a corner');
  assert.match(view(p, a), /The trip reaches a corner\./);
  a = play(p, a, {type: 'surface', id: 'twist'});
  assert.deepEqual(a.board.start, q.start, 'a new surface starts again');
  assert.equal(isSolved(p, a.board), false);
  assert.equal(move(p, a, {type: 'start', s: 'Z', i: 0, j: 0}), null);
});

test('forged saves are rejected', () => {
  const p = byId('glued-04'), b = freshAttempt(p).board;
  for (const f of [{...b, claimed: true}, {...b, told: 'way', right: {...b.right, A: 'A'}, extra: 1}, {...b, right: {A: 'B', B: 'B', C: null}}, {...b, up: {A: 'D', B: null, C: null}}]) assert.equal(validBoard(p, f), false);
  const c = byId('glued-07'), cb = freshAttempt(c).board;
  assert.equal(validBoard(c, {...cb, told: 'way'}), false, 'no refusal on a puzzle that can’t be done');
  assert.equal(validBoard(c, {...cb, claimed: true}), false, 'no claim without a gluing');
  assert.equal(validBoard(c, {...cb, right: {...cb.right, A: 'B'}, claimed: true}), true, 'a claim after a gluing');
  const k = byId('glued-03'), kb = freshAttempt(k).board;
  assert.equal(validBoard(k, {...kb, done: true}), false);
  assert.equal(validBoard(k, {...kb, links: [['A:00', 'A:11']]}), false);
});

test('every puzzle renders; one short objective; no counts; focus targets', () => {
  for (const p of glued.puzzles) {
    M.reset(p);
    const a = freshAttempt(p), html = view(p, a), q = p.parameters;
    assert.match(html, /gl-puzzle/, p.id);
    assert.doesNotMatch(html, /\b\d+ (found|of \d+)\b/i, `${p.id}: no found count`);
    if (p.visibleObjective) assert.ok(html.includes(p.visibleObjective), `${p.id}: the one objective`);
    if (q.mode === 'glue') {
      assert.equal((html.match(/gl-side-hit/g) || []).length, Object.keys(q.squares).length * 2 * q.sides.length, `${p.id}: a control for every side that glues`);
      assert.match(html, /data-focus="gl-cant"[^>]*disabled/, `${p.id}: Can’t waits for a gluing`);
      assert.equal((html.match(/class="gl-trip"/g) || []).length, q.trips.length);
      assert.doesNotMatch(html, /gl-wedge/);
    }
    if (q.mode === 'corners') assert.equal((html.match(/gl-corner-hit/g) || []).length, 4 * Object.keys(q.squares).length, `${p.id}: a control for every corner`);
    if (q.mode === 'playground') assert.equal((html.match(/class="secondary gl-dir"/g) || []).length, 8);
    assert.ok(new RegExp(G.focus.split(',').map(s => s.slice(1)).join('|')).test(html), `${p.id}: something takes focus`);
  }
  // Hint level 2 marks the next pair of sides, or the next two corners.
  const p = byId('glued-01');
  assert.equal((view(p, {...freshAttempt(p), hintLevel: 2}).match(/gl-side-line hinted/g) || []).length, 2);
  const c = byId('glued-03');
  assert.equal((view(c, {...freshAttempt(c), hintLevel: 2}).match(/gl-wedge[^"]*hinted/g) || []).length, 2);
});

test('all corners and squares stay in the drawn room', () => {
  for (const p of glued.puzzles.filter(p => p.parameters.mode === 'corners')) {
    const S = fixedSurface(p.parameters);
    assert.equal(allCorners(S).length, 4 * S.ids.length);
    assert.equal(cornerCycles(S).flat().length, 4 * S.ids.length, `${p.id}: every corner in one chain`);
  }
});
