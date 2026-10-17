// Corners: angles and rings, rings the same after turning or flipping, the
// rings each find-every puzzle asks for, fillings and the smallest one, the
// folded corner, moves and their limits, That's all and Can't with their
// refusals kept through Undo, the opened drawings and their regions, the
// erasure rule, hints (and how long they take), saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {cornerMechanics, totalOf, foldOf, canonOf, sameRing, answersOf, fillsOf, possible, smallestRing, judgeShelf, judgeCant, planToward, coneOf, piecePoints, startsOf, piecesOf, facesOf, holdsOn, isTree, nearestLine, treeMap} from '../dist/families/corners/corners.js';
import corners from '../dist/families/corners/corners.js';
import {loadPack} from '../scripts/packs.mjs';

const json = JSON.parse(await readFile(new URL('../dist/families/corners/corners.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => json.puzzles.find(p => p.id === id);
const ring = n => byId(`corners-ring-${String(n).padStart(2, '0')}`), tree = n => byId(`corners-tree-${String(n).padStart(2, '0')}`);
const mech = cornerMechanics.corners;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next && next !== b, `${JSON.stringify(action)} is legal`); return next; }, a);
const add = s => [...s].map(piece => ({type: 'add', piece}));
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const undoMove = (p, a) => { const next = undo(a); return {...next, board: mech.carry(p, a.board, next.board)}; };
const told = html => html.match(/<p class="cr-told">([^<]*)<\/p>/)?.[1] ?? null;

test('angles, folds and rings the same after turning or flipping', () => {
  assert.equal(totalOf([...'TSP']), 258);
  assert.equal(foldOf([...'SSS']), 'point');
  assert.equal(foldOf([...'SSSS']), 'flat');
  assert.equal(foldOf([...'PPPP']), 'over');
  assert.equal(canonOf([...'TSTT']), canonOf([...'TTST']), 'turning');
  assert.ok(sameRing([...'SSTTT'], [...'TTTSS']), 'flipping');
  assert.ok(!sameRing([...'SSTTT'], [...'STSTT']), 'two orders of two squares and three triangles');
  assert.ok(!sameRing([...'SSTT'], [...'STST']));
});

test('the rings each find-every puzzle asks for', () => {
  assert.deepEqual(answersOf({menu: ['T'], goal: 'point'}), ['TTT', 'TTTT', 'TTTTT']);
  assert.deepEqual(answersOf({menu: ['T', 'S'], goal: 'flat'}), ['SSSS', 'SSTTT', 'STSTT', 'TTTTTT']);
  assert.equal(answersOf({menu: ['T', 'S'], goal: 'point'}).length, 11);
  assert.equal(answersOf({menu: ['T', 'S', 'P'], goal: 'point'}).length, 25);
  assert.deepEqual(answersOf({menu: ['T', 'S', 'P'], goal: 'flat'}), ['SSSS', 'SSTTT', 'STSTT', 'TTTTTT'], 'no flat ring has a pentagon');
  assert.deepEqual(answersOf({menu: ['T', 'S', 'P'], goal: 'point', count: 5}), ['PTTTT', 'STTTT', 'TTTTT']);
  for (const p of json.puzzles.filter(p => p.parameters.mode === 'every')) assert.deepEqual(answersOf(p.parameters), p.solution.rings, p.id);
});

test('fillings: the smallest one decides', () => {
  const q = {mode: 'make', menu: ['T', 'S', 'P'], locked: ['P', 'P'], count: 4};
  assert.deepEqual(fillsOf(q), ['TT']);
  assert.ok(possible(q));
  const r = {mode: 'make', menu: ['T', 'S', 'P'], locked: ['S', 'S'], count: 5};
  assert.deepEqual(fillsOf(r), []);
  assert.ok(!possible(r));
  assert.deepEqual(smallestRing(r), [...'SSTTT']);
  assert.equal(judgeCant(r, [...'SSTTT']), null, 'the smallest ring proves it');
  assert.deepEqual(judgeCant(r, [...'SSTST']), {kind: 'smaller', index: 3}, 'a bigger corner doesn’t');
  assert.deepEqual(judgeCant(q, [...'PPTT']), {kind: 'folds'});
});

test('judging a shelf', () => {
  const q = ring(1).parameters;
  assert.deepEqual(judgeShelf(q, [[...'TTT']]), {kind: 'more'});
  assert.deepEqual(judgeShelf(q, [[...'TTT'], [...'TTTTTT']]), {kind: 'off', index: 1});
  assert.equal(judgeShelf(q, [[...'TTTT'], [...'TTT'], [...'TTTTT']]), null, 'any order');
});

test('the folded corner has the right face angles', () => {
  for (const w of ['TTT', 'SSS', 'PPP', 'STST', 'TTTTP', 'SSST']) {
    const {e, th} = coneOf([...w]);
    e.forEach((u, i) => {
      const v = e[(i + 1) % e.length], cos = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
      assert.ok(Math.abs(Math.acos(cos) - th[i]) < 1e-9, `${w}: face ${i}`);
    });
  }
  // A corner's polygon is regular: equal sides.
  const pts = piecePoints('P', 30);
  const sides = pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length][0] - p[0], pts[(i + 1) % pts.length][1] - p[1]));
  assert.ok(sides.every(s => Math.abs(s - sides[0]) < 1e-9));
  assert.deepEqual(startsOf([...'TSP']), [0, 60, 150]);
});

test('moves: adding, taking out, folding and the fixed corners', () => {
  const p = ring(2), a = freshAttempt(p);
  assert.deepEqual(a.board.ring, ['S', 'S', 'S']);
  assert.equal(move(p, a, {type: 'take', index: 0}), null, 'a fixed corner stays');
  assert.equal(move(p, a, {type: 'fold'}), null, 'only a full ring folds');
  const b = play(p, a, ...add('S'), {type: 'fold'});
  assert.equal(b.board.fold, 'flat');
  assert.equal(move(p, b, {type: 'add', piece: 'T'}), null, 'four places');
  const c = play(p, b, {type: 'unfold'}, {type: 'take', index: 3}, ...add('P'), {type: 'fold'});
  assert.equal(c.board.fold, 'over');
  assert.equal(move(p, c, {type: 'unfold'}), null, 'an overlap is already flat');
  const d = play(p, c, {type: 'take', index: 3}, ...add('T'), {type: 'fold'});
  assert.ok(isSolved(p, d.board), 'a triangle folds');
});

test('That’s all: a whole shelf, one refusal, kept through Undo', () => {
  const p = ring(4), a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'all'}), null, 'nothing kept');
  let b = play(p, a, ...add('SSSS'), {type: 'keep'});
  assert.equal(move(p, b, {type: 'keep'}).board.again, 0, 'Already on the shelf');
  b = play(p, b, {type: 'all'});
  assert.deepEqual(b.board.refused, {kind: 'more'});
  assert.equal(told(view(p, b)), 'There is another.');
  assert.equal(move(p, b, {type: 'all'}), null, 'off until the shelf changes');
  const back = undoMove(p, b);
  assert.deepEqual(back.board.refused, {kind: 'more'}, 'Undo keeps the answer');
  assert.equal(told(view(p, back)), null, 'and takes the words away, so the board changes');
  assert.match(view(p, back), /cr-all"[^>]*disabled/, 'That’s all stays off');
  // A ring that doesn't belong is named and ringed.
  let c = play(p, a, ...add('SSST'), {type: 'keep'}, {type: 'all'});
  assert.deepEqual(c.board.refused, {kind: 'off', index: 0});
  assert.equal(told(view(p, c)), 'This one folds to a point.');
  assert.match(view(p, c), /cr-shelf-item ringed/);
  c = play(p, c, {type: 'drop', index: 0});
  assert.equal(c.board.refused, null, 'a changed shelf clears it');
  // The whole shelf.
  let d = a;
  for (const w of ['SSSS', 'TTTSS', 'TSTST', 'TTTTTT']) d = play(p, d, ...(d.board.ring.length ? [...d.board.ring.map(() => ({type: 'take', index: 0}))] : []), ...add(w), {type: 'keep'});
  d = play(p, d, {type: 'all'});
  assert.ok(isSolved(p, d.board));
  assert.equal((view(p, d).match(/cr-mini/g) || []).length >= 4, true, 'the shelf drawn folded');
});

test('Can’t: after a fold, on the smallest ring; refusals kept through Undo', () => {
  const p = ring(6), a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'cant'}), null, 'not on a fresh board');
  const full = play(p, a, ...add('TST'));
  assert.equal(move(p, full, {type: 'cant'}), null, 'not before a fold');
  const refused = play(p, full, {type: 'fold'}, {type: 'cant'});
  assert.deepEqual(refused.board.refused, {kind: 'smaller', index: 3});
  assert.equal(told(view(p, refused)), 'This corner could be smaller.');
  assert.match(view(p, refused), /data-cr-take="3" data-ringed="1"/);
  const back = undoMove(p, refused);
  assert.deepEqual(back.board.refused, refused.board.refused, 'Undo keeps it');
  assert.notEqual(view(p, back), view(p, refused), 'and the board changes');
  assert.equal(move(p, back, {type: 'cant'}), null);
  const right = play(p, back, {type: 'take', index: 3}, ...add('T'), {type: 'fold'}, {type: 'cant'});
  assert.ok(isSolved(p, right.board));
  assert.equal(told(view(p, right)), 'Even the smallest corners make a whole turn.');
  // The same refusal on a puzzle that can fold.
  const q = ring(5), r = play(q, freshAttempt(q), ...add('SP'), {type: 'fold'}, {type: 'cant'});
  assert.equal(told(view(q, r)), 'This corner could be smaller.');
});

test('hints: a useful first hint, the reason before Can’t, and quick', () => {
  for (const p of json.puzzles.filter(p => p.band !== 'playground')) {
    let a = freshAttempt(p), steps = 0;
    const first = nextHint(p, a);
    assert.equal(first.type, 'move', p.id);
    assert.ok(!['all', 'cant'].includes(first.action.type), `${p.id}: never a claim first`);
    let reason = false;
    for (; !isSolved(p, a.board) && steps < 60; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time)`);
      if (h.action.type === 'fold' && /smallest/.test(h.text)) reason = true;
      if (h.action.type === 'cant') assert.ok(reason, `${p.id}: the reason first`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
  const p = ring(1), h = nextHint(p, play(p, freshAttempt(p), ...add('TTT')));
  assert.equal(h.text, 'This ring folds to a point and isn’t on the shelf. Press Keep.');
  // A tap takes well under 100 ms, a hint included.
  const big = ring(9);
  let a = freshAttempt(big);
  for (const w of ['SSS', 'TTT']) a = play(big, a, ...a.board.ring.map(() => ({type: 'take', index: 0})), ...add(w), {type: 'keep'});
  const t = process.cpuUsage();
  for (let i = 0; i < 20; i++) { const b = {...a, hintLevel: 2}; view(big, b); move(big, b, {type: 'add', piece: 'S'}); }
  const u = process.cpuUsage(t);
  assert.ok((u.user + u.system) / 1000 / 20 < 50, 'a render and a move');
});

test('planning toward a ring keeps what fits', () => {
  assert.deepEqual(planToward([...'TT'], ['TTT']), {type: 'add', piece: 'T'});
  assert.deepEqual(planToward([...'TS'], ['TTT']), {type: 'take', index: 1});
  assert.deepEqual(planToward([...'STT'], ['TTS']), {type: 'done'}, 'turned is the same');
  assert.deepEqual(planToward([...'SS'], ['TTT'], 2), null, 'fixed corners that don’t fit');
});

test('trees: regions, pieces and the erasure rule', () => {
  const q = tree(2).parameters;
  assert.equal(facesOf(q, []).closed.length, 5);
  assert.equal(piecesOf(q, []).count, 1);
  // Erasing the outer square's bottom line opens one region.
  const one = facesOf(q, [0]);
  assert.equal(one.closed.length, 4);
  assert.ok(!holdsOn(facesOf(q, []), 0), 'a line on a loop');
  // After the outer square goes, the spokes hold the corners on.
  const ring4 = facesOf(q, [0, 1, 2, 3]);
  assert.ok(holdsOn(ring4, 8), 'a spoke is the only way to its corner');
  assert.equal(piecesOf(q, [0, 1, 2, 3, 8]).count, 2);
  assert.ok(isTree(q, [0, 1, 2, 3, 4]));
  assert.ok(!isTree(q, [0, 1, 2, 3, 8]), 'a cut is no tree');
  // Opened octahedron: 7 regions.
  assert.equal(facesOf(tree(3).parameters, []).closed.length, 7);
});

test('trees: taps go to the nearest line', () => {
  const p = tree(2), q = p.parameters, g = treeMap(q);
  // Near corner A, between the bottom line (0) and the spoke to E (8).
  const [ax, ay] = g.pos.A;
  assert.equal(nearestLine(q, [ax + 8, ay - 1]), 0, 'just above the bottom line');
  assert.equal(nearestLine(q, [ax + 6, ay - 5]), 8, 'on the spoke');
  assert.equal(nearestLine(q, [ax + 1, ay - 8]), 3, 'just right of the left line');
});

test('trees: moves, hints and saves', () => {
  const p = tree(1);
  let a = freshAttempt(p);
  a = play(p, a, {type: 'line', line: 3}, {type: 'line', line: 4});
  assert.equal(piecesOf(p.parameters, a.board.erased).count, 1);
  a = play(p, a, {type: 'line', line: 5});
  assert.equal(piecesOf(p.parameters, a.board.erased).count, 2, 'the centre is cut off');
  assert.match(view(p, a), /gb-node cut/);
  const h = nextHint(p, a);
  assert.equal(h.text, 'Some dots are cut off. Draw this line back.');
  a = play(p, a, h.action);
  assert.deepEqual(a.board.erased, [3, 4]);
  a = play(p, a, {type: 'line', line: 0});
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /gb-stroke tree/);
  assert.equal(validBoard(p, {erased: [2, 1]}), false);
  assert.equal(validBoard(p, {erased: [], done: true}), false);
});

test('the playground: free building, no hint, never solved', () => {
  const p = byId('corners-playground');
  assert.equal(mech.noHint(p), true);
  const a = play(p, freshAttempt(p), ...add('SSS'), {type: 'fold'});
  assert.equal(a.board.fold, 'point');
  assert.ok(!isSolved(p, a.board));
  assert.match(view(p, a), /cr-folded-board/);
});

test('rendering: the objective, the controls and no counts', () => {
  for (const p of json.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-mechanic-wire="corners"/, p.id);
    if (p.parameters.mode === 'every') {
      assert.match(html, /cr-all"[^>]*disabled/, `${p.id}: That’s all off at the start`);
      assert.ok(!/found|\d+ of \d+ rings/.test(html), `${p.id}: no found-count`);
    }
    if (p.parameters.mode === 'make') assert.match(html, /cr-cant"[^>]*disabled/, `${p.id}: Can’t off at the start`);
  }
  // How to play opens with the operation.
  assert.match(ring(9).controls, /^Corners of triangles and squares, all with the same side, lie flat round a point/);
  assert.match(tree(1).controls, /^An opened drawing is a solid seen through one face/);
  // The focus fallback selects only controls.
  assert.ok(corners.focus.split(',').every(s => /button\.[\w-]+:not\(\[disabled\]\)|\[data-cr-take\]|\[data-cr-unfold\]|\.gb-hit/.test(s)));
  assert.ok(!/cr-all|cr-cant/.test(corners.focus), 'never a claim');
});
