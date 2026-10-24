// Corners: angles and rings, rings the same after turning or flipping, the
// rings each find-every puzzle asks for, fillings and the smallest one, the
// folded corner, moves and their limits, That's all (with a ring kept twice)
// and Can't with their refusals kept through Undo, the solved shelf's rows,
// the opened drawings and their regions and tints, the erasure rule, end dots
// taken off a tree, hints (and how long they take), saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {cornerMechanics, totalOf, foldOf, canonOf, sameRing, answersOf, fillsOf, possible, smallestRing, judgeShelf, judgeCant, isProof, planToward, coneOf, foldedFaces, piecePoints, startsOf, lapPath, caseRows, piecesOf, facesOf, tintsOf, holdsOn, isTree, endLine, leafTap, TREE_NOTE, nearestLine, nearestDot, treeMap} from '../dist/families/corners/corners.js';
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
const shelfTold = html => html.match(/<p class="cr-shelf-told">([^<]*)<\/p>/)?.[1] ?? null;
const ringed = html => [...html.matchAll(/cr-shelf-item ringed[^>]*aria-label="Ring of ([^"]*), marked\./g)].map(m => m[1]);
const clear = (p, a) => { let b = a; if (b.board.fold === 'point' || b.board.fold === 'flat') b = play(p, b, {type: 'unfold'}); const L = p.parameters.locked?.length || 0; while (b.board.ring.length > L) b = play(p, b, {type: 'take', index: b.board.ring.length - 1}); return b; };
const build = (p, a, w) => play(p, clear(p, a), ...add(w.slice(p.parameters.locked?.length || 0)));

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
  assert.ok(isProof(r, [...'SSTTT']));
  assert.deepEqual(judgeCant(r, [...'SSTST']), {kind: 'no'}, 'a bigger corner doesn’t, and nothing says which');
  assert.deepEqual(judgeCant(q, [...'PPTT']), {kind: 'no'}, 'the same answer where a ring folds');
  assert.deepEqual(judgeCant(q, [...'PPSS']), {kind: 'no'});
  // A flat goal: found by trying the fillings, and not the smallest one.
  const flat = ring(5).parameters;
  assert.equal(flat.goal, 'flat');
  assert.deepEqual(fillsOf(flat), ['SST']);
  assert.ok(possible(flat));
  assert.equal(foldOf(smallestRing(flat)), 'point', 'the smallest filling folds up');
  assert.deepEqual(judgeCant(flat, smallestRing(flat)), {kind: 'no'});
});

test('judging a shelf', () => {
  const q = ring(1).parameters;
  assert.deepEqual(judgeShelf(q, [[...'TTT']]), {kind: 'more'});
  assert.deepEqual(judgeShelf(q, [[...'TTT'], [...'TTTTTT']]), {kind: 'off', index: 1});
  assert.equal(judgeShelf(q, [[...'TTTT'], [...'TTT'], [...'TTTTT']]), null, 'any order');
  assert.deepEqual(judgeShelf(q, [[...'TTT'], [...'TTTT'], [...'TTT']]), {kind: 'same', pair: [0, 2]}, 'a ring kept twice');
  assert.deepEqual(judgeShelf(q, [[...'TTT'], [...'TTT'], [...'TTTTTT']]), {kind: 'off', index: 2}, 'a ring that doesn’t belong first');
  const r9 = ring(9).parameters;
  assert.deepEqual(judgeShelf(r9, [[...'SSTT'], [...'TSST']]), {kind: 'same', pair: [0, 1]}, 'turned is the same ring');
  assert.deepEqual(judgeShelf(r9, [[...'SSTT'], [...'STST']]), {kind: 'more'}, 'two orders are two rings');
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
  // Seen from outside, every face shows, and a ring turned round is drawn alike.
  for (const w of ['PTT', 'TTT', 'SSP', 'TSTP', 'TTTTP', 'STSTT']) {
    const faces = foldedFaces([...w]);
    assert.ok(faces.every(fc => fc.outside && fc.seen > .2), `${w}: every face shows`);
  }
  assert.deepEqual(foldedFaces([...'PTT']), foldedFaces([...'TPT']), 'PTT and TPT are drawn alike');
});

test('the overlap arc: at most 180° a piece, a second lap outside the first', () => {
  const pieces = d => d.split('M').filter(Boolean).map(run => (run.match(/A/g) || []).length);
  assert.deepEqual(pieces(lapPath(90)), [1]);
  assert.deepEqual(pieces(lapPath(288)), [2], 'six pentagons: two pieces');
  assert.deepEqual(pieces(lapPath(360)), [2], 'eight squares: a whole lap');
  assert.deepEqual(pieces(lapPath(504)), [2, 1], 'eight pentagons: a lap and 144° more outside it');
  // Every point on the board.
  for (const over of [36, 288, 360, 396, 504]) for (const [, x, y] of lapPath(over).matchAll(/(-?[\d.]+),(-?[\d.]+)/g)) assert.ok(Math.abs(x) < 52 && Math.abs(y) < 52, `${over}: ${x},${y} on the board`);
  // Each arc ends where the circle says.
  const end = lapPath(396).split(' A').at(-1).split(' ').at(-1).split(',').map(Number);
  assert.ok(Math.abs(end[0] - 38 * Math.cos(36 * Math.PI / 180)) < .02 && Math.abs(end[1] + 38 * Math.sin(36 * Math.PI / 180)) < .02, 'seven pentagons end at 36° on the outer circle');
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

test('That’s all: a whole shelf, one refusal on the shelf, kept through Undo', () => {
  const p = ring(4), a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'all'}), null, 'nothing kept');
  let b = play(p, a, ...add('SSSS'), {type: 'keep'});
  assert.equal(move(p, b, {type: 'keep'}), null, 'Keep is off while the ring is the one just kept');
  b = play(p, b, {type: 'all'});
  assert.deepEqual(b.board.refused, {kind: 'more'});
  assert.equal(shelfTold(view(p, b)), 'There is another.', 'on the shelf');
  assert.equal(told(view(p, b)), null, 'not under the board');
  assert.equal(move(p, b, {type: 'all'}), null, 'off until the shelf changes');
  const back = undoMove(p, b);
  assert.deepEqual(back.board.refused, {kind: 'more'}, 'Undo keeps the answer');
  assert.equal(shelfTold(view(p, back)), null, 'and takes the words away, so the board changes');
  assert.match(view(p, back), /cr-all"[^>]*disabled/, 'That’s all stays off');
  // A ring that doesn't belong is named and ringed.
  let c = play(p, a, ...add('SSST'), {type: 'keep'}, {type: 'all'});
  assert.deepEqual(c.board.refused, {kind: 'off', index: 0});
  assert.equal(shelfTold(view(p, c)), 'This one folds to a point.');
  assert.deepEqual(ringed(view(p, c)), ['square, square, square, triangle']);
  c = play(p, c, {type: 'drop', index: 0});
  assert.equal(c.board.refused, null, 'a changed shelf clears it');
  // The whole shelf.
  let d = a;
  for (const w of ['SSSS', 'TTTSS', 'TSTST', 'TTTTTT']) d = build(p, d, w), d = play(p, d, {type: 'keep'});
  d = play(p, d, {type: 'all'});
  assert.ok(isSolved(p, d.board));
  assert.match(view(p, d), /cr-cases/, 'the shelf drawn as the case check');
});

test('a copy kept over a refusal: one thing marked at a time, never a stale verdict', () => {
  // The review's case, Rings 9: SSTT and SSSS kept, That's all, then TSST kept.
  const p = ring(9);
  let a = build(p, freshAttempt(p), 'SSTT');
  a = play(p, a, {type: 'keep'});
  a = play(p, build(p, a, 'SSSS'), {type: 'keep'}, {type: 'all'});
  assert.equal(shelfTold(view(p, a)), 'This one lies flat.');
  assert.deepEqual(ringed(view(p, a)), ['square, square, square, square']);
  a = play(p, build(p, a, 'TSST'), {type: 'keep'});
  assert.equal(a.board.shelf.length, 3, 'the copy goes on the shelf');
  assert.equal(shelfTold(view(p, a)), null, 'the old answer goes with the old shelf');
  assert.deepEqual(ringed(view(p, a)), [], 'nothing marked');
  a = play(p, a, {type: 'all'});
  assert.equal(shelfTold(view(p, a)), 'This one lies flat.');
  assert.deepEqual(ringed(view(p, a)), ['square, square, square, square'], 'only the ring it describes');
  a = play(p, a, {type: 'drop', index: 1}, {type: 'all'});
  assert.equal(shelfTold(view(p, a)), 'Two of these are the same ring.');
  assert.deepEqual(ringed(view(p, a)), [], 'which two is left to the child');
  assert.ok(!/, marked/.test(view(p, a)), 'no ring is marked in words either');
  assert.equal(move(p, a, {type: 'all'}), null, 'locked while the shelf is the same');
  // After "There is another." too.
  let b = play(p, build(p, freshAttempt(p), 'SSTT'), {type: 'keep'}, {type: 'all'});
  assert.equal(shelfTold(view(p, b)), 'There is another.');
  b = play(p, build(p, b, 'TSST'), {type: 'keep'});
  assert.equal(shelfTold(view(p, b)), null);
  assert.deepEqual(ringed(view(p, b)), []);
  b = play(p, b, {type: 'all'});
  assert.deepEqual(b.board.refused, {kind: 'same', pair: [0, 1]});
  // A hint takes one copy off.
  const h = nextHint(p, b);
  assert.deepEqual(h.action, {type: 'drop', index: 1});
  assert.equal(h.text, 'Two rings on the shelf are the same ring. Take one off.');
});

test('the solved shelf: rows by number of corners, each ending with its smallest ring too big for the goal', () => {
  const rows = q => caseRows(q, answersOf(q).map(r => [...r])).map(({n, kept, miss}) => [n, kept.map(r => r.join('')).join(' '), miss ? miss.join('') : null]);
  assert.deepEqual(rows(ring(9).parameters), [
    [3, 'TTT STT SST SSS', null],
    [4, 'TTTT STTT SSTT STST SSST', 'SSSS'],
    [5, 'TTTTT STTTT', 'SSTTT'],
    [6, '', 'TTTTTT']
  ]);
  assert.deepEqual(rows(ring(1).parameters), [[3, 'TTT', null], [4, 'TTTT', null], [5, 'TTTTT', null], [6, '', 'TTTTTT']]);
  assert.deepEqual(rows(ring(3).parameters), [[3, 'SSS PSS PPS PPP', null], [4, '', 'SSSS']]);
  assert.deepEqual(rows(ring(7).parameters), [[5, 'TTTTT STTTT PTTTT', 'SSTTT']]);
  assert.deepEqual(rows(ring(4).parameters), [[4, 'SSSS', null], [5, 'SSTTT STSTT', 'SSSTT'], [6, 'TTTTTT', 'STTTTT'], [7, '', 'TTTTTTT']]);
});

test('Can’t: after a fold, on the smallest ring; one refusal everywhere, kept through Undo', () => {
  const p = ring(6), a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'cant'}), null, 'not on a fresh board');
  const full = play(p, a, ...add('TST'));
  assert.equal(move(p, full, {type: 'cant'}), null, 'not before a fold');
  const refused = play(p, full, {type: 'fold'}, {type: 'cant'});
  assert.deepEqual(refused.board.refused, {kind: 'no'});
  assert.equal(told(view(p, refused)), 'That ring doesn’t show it.');
  assert.ok(!/data-ringed/.test(view(p, refused)), 'no corner marked');
  const back = undoMove(p, refused);
  assert.deepEqual(back.board.refused, refused.board.refused, 'Undo keeps it');
  assert.notEqual(view(p, back), view(p, refused), 'and the board changes');
  assert.equal(move(p, back, {type: 'cant'}), null);
  const right = play(p, back, {type: 'take', index: 3}, ...add('T'), {type: 'fold'}, {type: 'cant'});
  assert.ok(isSolved(p, right.board));
  assert.equal(told(view(p, right)), 'Even the smallest corners make a whole turn.');
  // The same words, nothing marked, on puzzles that can be done.
  for (const [q, w] of [[ring(2), 'SSSS'], [ring(2), 'SSSP'], [ring(5), 'TTSSS'], [ring(5), 'TTTTT']]) {
    const r = play(q, build(q, freshAttempt(q), w), {type: 'fold'}, {type: 'cant'});
    assert.equal(told(view(q, r)), 'That ring doesn’t show it.', `${q.id} ${w}`);
    assert.ok(!/data-ringed/.test(view(q, r)));
  }
  // A flat goal is met by a flat fold.
  const q = ring(5), flat = play(q, build(q, freshAttempt(q), 'TTSTS'), {type: 'fold'});
  assert.ok(isSolved(q, flat.board));
  // No overlap words once solved.
  const r8 = ring(8), over = play(r8, build(r8, freshAttempt(r8), 'PSSS'), {type: 'fold'}, {type: 'cant'});
  assert.equal(told(view(r8, over)), 'Even the smallest corners go past a whole turn.');
  const every = ring(9);
  let e = freshAttempt(every);
  for (const w of answersOf(every.parameters)) e = play(every, build(every, e, w), {type: 'keep'});
  e = play(every, build(every, e, 'PPPP'.replace(/P/g, 'S') + 'S'), {type: 'fold'});
  e = play(every, play(every, e, {type: 'take', index: 4}), {type: 'add', piece: 'T'}, {type: 'fold'}, {type: 'all'});
  assert.ok(isSolved(every, e.board));
  assert.equal(told(view(every, e)), null, '“They overlap.” is gone from the solved screen');
});

test('the first shape button in every place solves no Make puzzle', () => {
  for (const p of json.puzzles.filter(p => p.parameters.mode === 'make')) {
    const q = p.parameters, w = [...q.locked, ...Array(q.count - q.locked.length).fill(q.menu[0])].join('');
    let a = play(p, build(p, freshAttempt(p), w), {type: 'fold'});
    if (!isSolved(p, a.board)) a = play(p, a, {type: 'cant'});
    assert.ok(!isSolved(p, a.board), p.id);
  }
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
  // Hint words make sense before the second level marks anything: a shape, not “this”.
  const r6 = ring(6), take = nextHint(r6, play(r6, freshAttempt(r6), ...add('TSP')));
  assert.equal(take.text, 'Take out a square.');
  const t1 = tree(1), cut = play(t1, freshAttempt(t1), {type: 'line', line: 3}, {type: 'line', line: 4}, {type: 'line', line: 5});
  assert.equal(nextHint(t1, cut).text, 'Some dots are cut off. Draw a line back to join them.');
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
  // Erasing the left half of the bottom side opens one region, and the dot on that side hangs by its other line.
  const one = facesOf(q, [0]);
  assert.equal(one.closed.length, 4);
  assert.ok(!holdsOn(facesOf(q, []), 0), 'a line on a loop');
  assert.ok(holdsOn(one, 1), 'the other half holds the dot on');
  assert.equal(piecesOf(q, [0, 1]).count, 2, 'erasing both halves cuts the dot off');
  // After the outer square goes, the spokes hold the corners on.
  const ring4 = facesOf(q, [0, 2, 3, 4]);
  assert.ok(holdsOn(ring4, 9), 'a spoke is the only way to its corner');
  assert.equal(piecesOf(q, [0, 2, 3, 4, 9]).count, 2);
  assert.ok(isTree(q, [0, 2, 3, 4, 5]));
  assert.ok(!isTree(q, [0, 2, 3, 4, 9]), 'a cut is no tree');
  // Opened octahedron: 7 regions.
  assert.equal(facesOf(tree(3).parameters, []).closed.length, 7);
});

test('trees: each region its own tint, so a merge shows', () => {
  const q = tree(3).parameters, tints = erased => facesOf(q, erased).closed.map(k => tintsOf(q, erased)[k]).sort();
  assert.deepEqual(tints([]), [0, 1, 2, 3, 4, 5, 6]);
  // An inner line between two regions: one tint takes over both.
  const inner = q.edges.findIndex(([u, v]) => u === 'D' && v === 'E'), after = tints([inner]);
  assert.equal(after.length, 6);
  assert.ok(after.every(t => tints([]).includes(t)));
  const html = view(tree(3), {...freshAttempt(tree(3)), board: {erased: [inner], gone: []}});
  assert.equal(new Set(html.match(/cn-tint-\d/g)).size, 6, 'six tints drawn');
});

test('trees: end dots come off a tree with their lines, down to one dot', () => {
  const p = tree(3), q = p.parameters, route = p.solution.route;
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {erased: [], gone: []});
  assert.equal(move(p, a, {type: 'dot', id: 'A'}), null, 'not before a tree');
  a = play(p, a, ...route.map(line => ({type: 'line', line})));
  assert.ok(isTree(q, a.board.erased) && !isSolved(p, a.board), 'a tree, not yet one dot');
  assert.match(view(p, a), /cn-leafing/);
  assert.equal(move(p, a, {type: 'line', line: route[0]}), null, 'the lines stay once a tree is left');
  const ends = Object.keys(q.nodes).filter(id => endLine(q, a.board, id) !== null), inner = Object.keys(q.nodes).find(id => !ends.includes(id));
  assert.ok(ends.length >= 2);
  assert.equal(move(p, a, {type: 'dot', id: inner}), null, 'a dot with two lines stays');
  const h = nextHint(p, a);
  assert.equal(h.text, 'Take off an end dot with its line.');
  for (let k = 0; k < 5; k++) a = play(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board), 'one dot left');
  assert.equal(a.board.gone.length, 5);
  assert.equal(validBoard(p, {erased: [], gone: [['A', 0]]}), false, 'no dot off before a tree');
  // Taps go to the nearest dot left.
  const g = treeMap(q);
  assert.equal(nearestDot(q, ['A', 'B'], [g.pos.A[0] + 3, g.pos.A[1] + 2]), 'A');
  assert.equal(nearestDot(q, ['A'], [50, 50]), null, 'too far from any dot');
});

test('trees: a tap that takes no end dot off says the rule, until the board changes', () => {
  const p = tree(3), q = p.parameters, g = treeMap(q), trees = cornerMechanics['corner-trees'];
  const a = play(p, freshAttempt(p), ...p.solution.route.map(line => ({type: 'line', line})));
  const ends = Object.keys(q.nodes).filter(id => endLine(q, a.board, id) !== null), inner = Object.keys(q.nodes).find(id => !ends.includes(id));
  // Where a tap in the end-dot stage goes: an end dot comes off; a dot with
  // more lines, or a line away from the dots, is refused; elsewhere, nothing.
  assert.deepEqual(leafTap(q, a.board, g.pos[ends[0]]), {dot: ends[0]});
  assert.deepEqual(leafTap(q, a.board, [g.pos[inner][0] + 3, g.pos[inner][1] - 2]), {refuse: inner});
  const af = q.edges.findIndex(([u, v]) => u === 'A' && v === 'F'), mid = [0, 1].map(k => (g.pos.A[k] + g.pos.F[k]) / 2);
  assert.ok(!a.board.erased.includes(af) && nearestDot(q, Object.keys(q.nodes), mid) === null, 'a line’s middle, away from the dots');
  assert.deepEqual(leafTap(q, a.board, mid), {refuse: null}, 'a tap on a line is refused');
  assert.equal(leafTap(q, a.board, [2, 2]), null, 'a tap on neither does nothing');
  // The words state the rule and mark nothing.
  assert.equal(TREE_NOTE, 'Only an end dot comes off.');
  trees.reset(p);
  assert.equal(told(view(p, a)), null, 'nothing said before a tap');
  trees.ui(p, {note: 'end', at: JSON.stringify(a.board)});
  const html = view(p, a);
  assert.equal(told(html), TREE_NOTE);
  assert.match(html, /role="status">[^<]*Only an end dot comes off\./, 'heard as well');
  assert.doesNotMatch(html, /gb-node[^"]*hinted/, 'no dot marked');
  assert.equal(told(view(p, a)), TREE_NOTE, 'said while the board is the same');
  // Cleared by the next move, and it doesn't come back with the board.
  const b = play(p, a, {type: 'dot', id: ends[0]});
  assert.equal(told(view(p, b)), null, 'the next move clears it');
  assert.equal(told(view(p, a)), null, 'and it is gone');
  // Cleared by Undo, by a restart and by any other ui payload.
  trees.ui(p, {note: 'end', at: JSON.stringify(b.board)});
  assert.equal(told(view(p, b)), TREE_NOTE);
  assert.equal(told(view(p, undo(b))), null, 'Undo clears it');
  trees.ui(p, {note: 'end', at: JSON.stringify(a.board)}); trees.reset(p);
  assert.equal(told(view(p, a)), null, 'a restart clears it');
  trees.ui(p, {note: 'end', at: JSON.stringify(a.board)}); trees.ui(p, {note: 'other'});
  assert.equal(told(view(p, a)), null, 'an unknown note clears it');
  // Not said before a tree is left or once one dot is left.
  trees.ui(p, {note: 'end', at: JSON.stringify(freshAttempt(p).board)});
  assert.equal(told(view(p, freshAttempt(p))), null, 'not while lines are erased');
  trees.reset(p);
});

test('trees: taps go to the nearest line', () => {
  const p = tree(2), q = p.parameters, g = treeMap(q);
  // Near corner A, between the bottom line (0) and the spoke to E (8).
  const [ax, ay] = g.pos.A;
  assert.equal(nearestLine(q, [ax + 8, ay - 1]), 0, 'just above the bottom line');
  assert.equal(nearestLine(q, [ax + 6, ay - 5]), 9, 'on the spoke');
  assert.equal(nearestLine(q, [ax + 1, ay - 8]), 4, 'just right of the left line');
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
  assert.equal(h.text, 'Some dots are cut off. Draw a line back to join them.');
  assert.ok(!/\d/.test(view(p, a).match(/role="status">([^<]*)/)[1]), 'the status has no count');
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
  assert.ok(corners.focus.split(',').every(s => /button\.[\w-]+:not\(\[disabled\]\)|\[data-cr-take\]|\[data-cr-unfold\]|\.gb-hit|\[data-gb-node\]/.test(s)));
  assert.ok(!/cr-all|cr-cant/.test(corners.focus), 'never a claim');
});
