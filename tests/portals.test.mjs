// The shared portal board (exact rationals, surfaces as data, seam marks,
// steps and lifts, straight shots, unrolling, the plane window, trip moves,
// drawing) and Portal rooms (Week 41): walks, every square in two steps,
// exact trips home, the trade, erasing and sliding, the playground, Can't
// and That's all, hints, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoToSolvable} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {Q, surfaceOf, validSurfaceSpec, canonical, validPoint, step, lift, shoot, develop, planeWindow, tripMove, tripApply, tripMoves, stepsOf, wordOf, roomBoard, planeBoard, arrowPad, roomSpots, planeKey, place, copyOf} from '../dist/portal-board.js';
import {reachIn, exactPossible, tradePossible, tradeRoute, shrinkPossible, editReach, tripLift, copyIndex, copyWords, checkerboard, surfaceFor, roomFromRows as room} from '../dist/families/portals/portals.js';
import {loadPack} from '../scripts/packs.mjs';

const portals = JSON.parse(await readFile(new URL('../dist/families/portals/portals.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => portals.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const walk = word => [...word].map(dir => ({type: 'step', dir}));
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});

const T3 = room(['ABC', 'DHE', 'FGI']);
const torus = surfaceOf(T3);
// Week 75: a cylinder two squares round and three tall, n = 2, crosses.
const cylinder = surfaceOf({...room(['ab', 'cd', 'ef'], {wrapY: false}), n: 2, lattice: 'crosses'});
// Week 64: three squares in an L, glued so that a corner does not close up.
const ell = surfaceOf({squares: {a: [0, 0], b: [1, 0], c: [0, 1]}, right: {a: 'b', b: 'a', c: 'c'}, up: {a: 'c', c: 'a', b: 'b'}});
// Week 70: one square, its sides glued straight across, on a 4 × 4 lattice of crosses.
const square4 = surfaceOf({squares: {o: [0, 0]}, right: {o: 'o'}, up: {o: 'o'}, n: 4, lattice: 'crosses'});

test('exact rationals: lowest terms, arithmetic, comparison', () => {
  assert.deepEqual(Q(2, 4), [1, 2]);
  assert.deepEqual(Q(3, -6), [-1, 2]);
  assert.deepEqual(Q([1, 2], 3), [1, 6]);
  assert.deepEqual(Q.add([1, 3], [1, 6]), [1, 2]);
  assert.deepEqual(Q.sub(1, [1, 3]), [2, 3]);
  assert.deepEqual(Q.mul([2, 3], [3, 4]), [1, 2]);
  assert.deepEqual(Q.div([1, 2], [1, 4]), [2, 1]);
  assert.equal(Q.cmp([1, 3], [1, 2]), -1);
  assert.ok(Q.eq([2, 4], [1, 2]) && Q.isInt([4, 1]) && Q.floor([-1, 2]) === -1);
  assert.ok(Q.valid(3) && Q.valid([1, 2]) && !Q.valid([2, 4]) && !Q.valid([1, 0]) && !Q.valid(0.5));
  assert.throws(() => Q(1, 0));
});

test('surfaces as data: a torus, a cylinder, three glued squares and one square are specs', () => {
  for (const spec of [T3, cylinder.spec, ell.spec, square4.spec]) assert.ok(validSurfaceSpec(spec));
  assert.ok(!validSurfaceSpec({squares: {a: [0, 0], b: [0, 0]}}), 'two squares in one place');
  assert.ok(!validSurfaceSpec({squares: {a: [0, 0], b: [1, 0]}, right: {a: 'b', b: 'b'}}), 'two squares glued to one side');
  assert.ok(!validSurfaceSpec({squares: {a: [0, 0]}, right: {a: 'z'}}), 'a square that is not there');
  assert.ok(!validSurfaceSpec({squares: {a: [0, 0]}, lattice: 'hexes'}));
  assert.ok(torus.abelian && cylinder.abelian && square4.abelian);
  assert.ok(!ell.abelian, 'the L’s corners do not all close up');
  // Edges: a 3 × 3 torus has 12 inner sides and 12 seam sides, no walls.
  const count = (s, kind) => s.edges.filter(e => e.kind === kind).length;
  assert.deepEqual([count(torus, 'inner'), count(torus, 'seam'), count(torus, 'wall')], [24, 12, 0]);
  assert.deepEqual([count(cylinder, 'seam'), count(cylinder, 'wall')], [6, 4], 'a cylinder: walls along its top and bottom');
  assert.equal(count(surfaceOf(room(['ABC', 'DHE', 'FGI'], {wrapX: false, wrapY: false})), 'wall'), 12);
});

test('seam marks pair each run of glued edges with its partner, at the same place along it', () => {
  // Two runs on the torus: the right side of the right column with the left side of the left column, and top with bottom.
  assert.equal(torus.marks.length, 4);
  const [r, l, u, d] = torus.marks;
  assert.deepEqual([r.side, l.side, u.side, d.side], ['right', 'left', 'up', 'down']);
  assert.ok(r.shape === l.shape && r.colour === l.colour && u.shape === d.shape && u.shape !== r.shape);
  assert.equal(torus.at[r.s][1], torus.at[l.s][1], 'the same height');
  assert.equal(torus.at[u.s][0], torus.at[d.s][0], 'the same column');
  // The one-square room marks its own sides.
  assert.deepEqual(square4.marks.map(m => [m.s, m.side]), [['o', 'right'], ['o', 'left'], ['o', 'up'], ['o', 'down']]);
  // A drawn picture of the room repeats each mark once per side.
  const svg = roomBoard(torus, {});
  assert.equal((svg.match(/class="pb-mark /g) || []).length, 4);
  assert.equal((svg.match(/class="pb-edge seam sun"/g) || []).length, 6, 'left and right seams in the colour of their mark');
  assert.equal((svg.match(/class="pb-edge seam sky"/g) || []).length, 6, 'top and bottom seams in theirs');
  assert.ok(torus.marks.every(m => m.along === 1.5), 'each mark halfway along its run of three');
});

test('steps cross seams, stop at walls, and keep exact copies in the plane', () => {
  const H = place(torus, {s: 'H', i: 0, j: 0});
  assert.equal(step(torus, step(torus, H, [1, 0]), [1, 0]).s, 'D', 'through E and the portal to D');
  const L = lift(torus, {s: 'H', i: 0, j: 0}, stepsOf('RRRUUU'));
  assert.equal(L.end.s, 'H');
  assert.deepEqual(L.endCopy, [3, 3], 'the copy up and to the right, in square units');
  assert.deepEqual(copyIndex(torus, L.end), [1, 1]);
  assert.deepEqual(L.copies, [[0, 0], [3, 0], [3, 3]], 'the first copy, the one to the right, then the one above that');
  const plain = surfaceOf(room(['ABC', 'DHE', 'FGI'], {wrapX: false, wrapY: false}));
  assert.equal(lift(plain, {s: 'H', i: 0, j: 0}, stepsOf('RRU')).blocked, 1);
  // Crosses: a point on a glued edge lives in the square to its right, and steps across.
  assert.deepEqual(canonical(square4, {s: 'o', i: 4, j: 1}), {s: 'o', i: 0, j: 1});
  assert.ok(validPoint(square4, {s: 'o', i: 0, j: 3}) && !validPoint(square4, {s: 'o', i: 4, j: 0}));
  const c = lift(square4, {s: 'o', i: 3, j: 0}, stepsOf('RRRRRU'));
  assert.deepEqual([c.end.i, c.end.j, ...c.endCopy], [0, 1, 2, 0]);
  assert.deepEqual(planeKey(square4, c.end), [8, 1]);
  // The cylinder: round and round sideways, a wall at the top.
  const y = lift(cylinder, {s: 'e', i: 0, j: 0}, stepsOf('RRRRUUUUUUU'));
  assert.equal(y.blocked, 10, 'six lattice steps up a cylinder three squares of two steps tall');
  assert.deepEqual(y.endCopy, [2, 0]);
  // The L: a lift built square by square goes on through the glued edges.
  const e = lift(ell, {s: 'a', i: 0, j: 0}, stepsOf('RRUU'));
  assert.deepEqual(e.points.map(p => p.s), ['a', 'b', 'a', 'c', 'a']);
  assert.deepEqual([e.end.X, e.end.Y], [2, 2]);
});

test('straight shots of rational slope go through seams, stop at a target, a wall or a cone point', () => {
  // From H's centre along (1, 1) for three steps: the diagonal crosses through corners into H of copy (3, 3).
  const s = shoot(torus, {s: 'H', i: 0, j: 0}, [1, 1], {length: 3});
  assert.equal(s.stop, 'length');
  assert.deepEqual([s.end.s, s.end.X - torus.at.H[0], s.end.Y - torus.at.H[1]], ['H', 3, 3]);
  assert.deepEqual(s.t, [3, 1]);
  // Slope 1/2 from a corner of the one-square room: crosses the side at the middle.
  const t = shoot(square4, {s: 'o', i: 0, j: 0}, [2, 1], {length: 2});
  assert.deepEqual(t.pieces.map(p => [p.a, p.b]), [[[[0, 1], [0, 1]], [[4, 1], [2, 1]]]]);
  assert.deepEqual([t.end.x, t.end.y, t.end.X], [[4, 1], [2, 1], 0], 'a shot that ends on a side reports it in the square it came through');
  // A target, met halfway along a piece.
  const hit = shoot(square4, {s: 'o', i: 0, j: 0}, [1, 3], {targets: [{s: 'o', i: 1, j: 3}, {s: 'o', i: 2, j: 2}]});
  assert.deepEqual([hit.stop, hit.target, hit.t], ['target', 0, [1, 1]]);
  // A wall stops a shot; on the L, the corner where the squares don't close up stops it too.
  const plain = surfaceOf(room(['ABC', 'DHE', 'FGI'], {wrapX: false, wrapY: false}));
  assert.equal(shoot(plain, {s: 'H', i: 0, j: 0}, [1, 0]).stop, 'wall');
  assert.equal(shoot(ell, {s: 'a', x: [1, 2], y: [1, 2]}, [1, 1]).stop, 'corner');
  assert.equal(shoot(torus, {s: 'H', x: 0, y: 0}, [1, 1], {corners: 'stop'}).stop, 'corner');
});

test('unrolling: the torus fills the plane with copies, the L meets itself along cuts', () => {
  const d = develop(torus, torus.ids.map(s => ({s, X: torus.at[s][0], Y: torus.at[s][1]})), [-3, -3, 5, 5]);
  assert.equal(d.placed.size, 81);
  assert.equal(d.at(4, 4), 'H');
  assert.equal(d.cut.length, 0);
  const l = develop(ell, [{s: 'a', X: 0, Y: 0}], [-2, -2, 2, 2]);
  assert.equal(l.placed.size, 25);
  assert.ok(l.cut.length > 0, 'a cut where two spreads meet with different squares');
  const cyl = develop(cylinder, [{s: 'e', X: 0, Y: 0}], [-2, -2, 3, 4]);
  assert.ok(cyl.walls.length > 0 && cyl.cut.length === 0);
  assert.equal(cyl.at(0, 3), undefined, 'nothing above the cylinder’s top');
});

test('the plane window holds what it is shown, grows to a minimum, and follows the focus past a maximum', () => {
  assert.deepEqual(planeWindow(torus, {show: [[1, 1]], min: 7}), [-2, -2, 4, 4]);
  const w = planeWindow(torus, {show: [[1, 1], [4, 4]], min: 7});
  assert.ok(w[0] <= 1 && w[2] >= 4 && w[2] - w[0] === 6 && w[3] - w[1] === 6);
  assert.deepEqual(planeWindow(torus, {show: [[0, 0], [30, 0]], focus: [30, 0], min: 7, max: 11}), [25, -5, 35, 5]);
});

test('trip moves: erase a step and its way back, slide a corner; the ends never move', () => {
  const s = stepsOf('RUUDL');
  assert.deepEqual(tripMoves(s), [{at: 1, kind: 'slide'}, {at: 3, kind: 'cancel'}, {at: 4, kind: 'slide'}]);
  assert.equal(tripMove(s, 2), null, 'two steps the same way');
  assert.equal(wordOf(tripApply(s, 3)), 'RUL');
  assert.equal(wordOf(tripApply(s, 1)), 'URUDL');
  for (const w of editReach('RRRUUULLLDDD').keys()) assert.deepEqual(tripLift(torus, 'H', w).endCopy, [0, 0]);
  assert.equal(editReach('RRRUUU').get('UUURRR'), 9);
  assert.equal(editReach('RRRUUU').get('RURURU'), 3);
  assert.equal(editReach('RRRUUULLLDDD').get(''), 9);
  assert.ok(!editReach('RRRUUULLL').has(''));
  assert.ok(editReach('RRRUUULLL').has('UUU'));
});

test('drawing: points are controls only where they act; pictures have none; the pad disables arrows', () => {
  const svg = roomBoard(torus, {point: pt => ({text: pt.s, act: pt.s === 'E', label: `${pt.s}. Step right`})});
  assert.equal((svg.match(/role="button"/g) || []).length, 1);
  assert.match(svg, /data-pb-point="E,0,0" data-pb-view="room" role="button" tabindex="0" aria-label="E. Step right"/);
  assert.equal((svg.match(/data-pb-point=/g) || []).length, 9);
  assert.doesNotMatch(roomBoard(torus, {picture: true}), /data-pb-point/);
  // Crosses on seams are drawn on both sides, one control each place.
  assert.equal(roomSpots(square4, {s: 'o', i: 0, j: 0}).length, 4);
  const plane = planeBoard(torus, {show: [[1, 1]], min: 5, key: 't'});
  assert.match(plane, /data-pb-window="-1,-1,3,3"/);
  assert.equal((plane.match(/data-pb-point=/g) || []).length, 25);
  assert.match(plane, /class="pb-edge copy sun"/, 'outlines between copies in the seam colours');
  assert.match(plane, /class="pb-edge copy sky"/);
  const strip = planeBoard(cylinder, {show: [[0, 0]], min: 5});
  assert.match(strip, /viewBox="-4\.25 -6\.25 10\.5 6\.5"/, 'a cylinder’s unrolled view is cropped to its strip');
  const pad = arrowPad({dir: d => ({act: d !== 'L', hinted: d === 'U'})});
  assert.match(pad, /data-pb-dir="L"[^>]*disabled/);
  assert.match(pad, /pb-arrow pb-U hinted/);
  assert.equal(copyOf(torus, 'H', 4, 4).join(), '3,3');
});

test('the puzzles’ answers: every square in two, trips home, trades and shrinks', () => {
  const S = surfaceFor(byId('portals-02').parameters);
  assert.equal(reachIn(S, 'H', 2).length, 9);
  assert.deepEqual(reachIn(surfaceFor(byId('portals-07').parameters), 'H', 2), ['A', 'C', 'H', 'F', 'I']);
  assert.ok(exactPossible(byId('portals-03').parameters) && exactPossible(byId('portals-06').parameters));
  assert.ok(!exactPossible(byId('portals-12').parameters));
  assert.ok(checkerboard(surfaceFor(byId('portals-12').parameters)) && !checkerboard(S));
  assert.ok(!tradePossible(byId('portals-04').parameters));
  assert.equal(tradeRoute(surfaceFor(byId('portals-09').parameters), ['F', 'P'], ['P', 'F']).length, 4);
  assert.ok(shrinkPossible(byId('portals-08').parameters) && shrinkPossible(byId('portals-10').parameters));
  assert.ok(!shrinkPossible(byId('portals-11').parameters));
  assert.equal(copyWords([0, 0]), 'first copy');
  assert.equal(copyWords([1, -2]), 'copy 1 right, 2 down');
});

test('walks: stars in named copies, home in the first copy, steps through portals and not walls', () => {
  const p = byId('portals-05'), a = freshAttempt(p);
  const out = play(p, a, ...walk('RRRUUU'));
  assert.ok(!isSolved(p, out.board), 'on H, but in another copy');
  assert.ok(isSolved(p, play(p, out, ...walk('LLLDDD')).board));
  assert.ok(isSolved(p, play(p, a, ...walk('DDDUUURRRLLLUUUDDD')).board), 'any trip that collects both and comes home');
  assert.equal(move(p, play(p, a, ...walk('RRRUUULLLDDD')), {type: 'step', dir: 'R'}), null, 'no steps after a solve');
  assert.equal(move(p, a, {type: 'cant'}), null, 'no Can’t on a walk to stars');
  assert.equal(move(p, a, {type: 'step', dir: 'X'}), null);
  const e = byId('portals-07'), b = play(e, freshAttempt(e), {type: 'step', dir: 'R'});
  assert.equal(move(e, b, {type: 'step', dir: 'R'}), null, 'a wall');
});

test('exactly k steps home: the beads cap the trip; Can’t is checked; a dead end hints Undo', () => {
  const p = byId('portals-03'), a = freshAttempt(p);
  assert.ok(isSolved(p, play(p, a, ...walk('DDD')).board));
  const miss = play(p, a, ...walk('RUL'));
  assert.ok(!isSolved(p, miss.board));
  assert.equal(move(p, miss, {type: 'step', dir: 'R'}), null, 'no fourth step');
  const told = play(p, a, {type: 'cant'});
  assert.equal(told.board.told, 'way');
  assert.equal(move(p, told, {type: 'cant'}), null);
  assert.equal(play(p, told, {type: 'step', dir: 'U'}).board.told, null, 'a step clears it');
  const stuck = play(p, a, ...walk('RU'));
  assert.equal(nextHint(p, stuck).type, 'deadend');
  assert.equal(undoToSolvable(p, stuck).board.trip, 'R');
  const q = byId('portals-12');
  assert.ok(isSolved(q, play(q, freshAttempt(q), {type: 'cant'}).board), 'no odd trip home on the 4 × 4 torus');
  assert.match(view(q, play(q, freshAttempt(q), {type: 'cant'})), /pb-point dark/, 'the checkerboard shows after Can’t');
});

test('every square in two steps: rings, found already, there is another, That’s all', () => {
  const p = byId('portals-02');
  let a = freshAttempt(p);
  const one = view(p, play(p, a, ...walk('R')));
  assert.doesNotMatch(one, /data-pb-dir="[RULD]"[^>]*disabled/, 'every arrow still works after the first step');
  assert.match(one, /data-pb-point="D,0,0" data-pb-view="room" role="button"/, 'and D, across the portal, can be tapped');
  a = play(p, a, ...walk('RR'));
  assert.deepEqual([a.board.found, a.board.trip], [['D'], '']);
  const again = play(p, a, ...walk('RR'));
  assert.deepEqual(again.board.told, {kind: 'again', s: 'D'});
  const more = play(p, a, {type: 'all'});
  assert.deepEqual(more.board.told, {kind: 'more'});
  assert.equal(move(p, more, {type: 'all'}), null);
  for (const w of ['LL', 'UU', 'DD', 'RU', 'LU', 'LD', 'RD']) a = play(p, a, ...walk(w));
  assert.ok(!isSolved(p, play(p, a, {type: 'all'}).board), 'H is not ringed yet');
  a = play(p, a, ...walk('RL'));
  assert.ok(isSolved(p, play(p, a, {type: 'all'}).board));
  assert.equal(undo(a).board.found.length, 8, 'Undo takes back a ring');
});

test('the trade: never on three wide, half a room apart on four', () => {
  const p = byId('portals-04'), a = freshAttempt(p);
  for (const w of ['R', 'RR', 'UL', 'RRRUUU']) assert.ok(!isSolved(p, play(p, a, ...walk(w)).board));
  assert.ok(isSolved(p, play(p, a, {type: 'cant'}).board));
  const h = nextHint(p, play(p, a, ...walk('R')));
  assert.deepEqual(h.action, {type: 'cant'});
  assert.match(h.text, /gap between them never changes/);
  const q = byId('portals-09'), b = freshAttempt(q);
  assert.match(view(q, b), /data-pb-point="O,0,0" data-pb-view="room" role="button" tabindex="0" aria-label="O\. Step left"/, 'a square next to the blue pawn is a control too');
  assert.ok(isSolved(q, play(q, b, ...walk('RDRD')).board));
  assert.equal(play(q, b, {type: 'cant'}).board.told, 'way');
});

test('erasing and sliding: the moves, the slide budget, Can’t with the finishing copy', () => {
  const p = byId('portals-10'), a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'slide', at: 2}), null, 'two steps the same way');
  assert.equal(move(p, a, {type: 'cancel', at: 3}), null, 'not a there-and-back pair');
  const one = play(p, a, {type: 'slide', at: 3});
  assert.deepEqual([one.board.trip, one.board.slides], ['RRURUU', 1]);
  assert.equal(nextHint(p, play(p, one, {type: 'slide', at: 3})).type, 'deadend', 'nine slides are needed and seven are left');
  const s = byId('portals-08');
  let b = freshAttempt(s);
  assert.equal(move(s, b, {type: 'cancel', at: 3}), null);
  b = play(s, b, {type: 'slide', at: 6});
  assert.equal(b.board.trip, 'RRRUULULLDDD');
  const z = byId('portals-11');
  assert.ok(isSolved(z, play(z, freshAttempt(z), {type: 'cant'}).board));
  assert.equal(play(s, freshAttempt(s), {type: 'cant'}).board.told, 'way');
});

test('the playground: four rooms, walls and portals, never solved and no Hint', () => {
  const p = byId('portals-playground'), a = freshAttempt(p);
  assert.equal(a.board.room, 'torus3');
  const tube = play(p, a, {type: 'room', room: 'tube3'});
  const up = play(p, tube, ...walk('U'));
  assert.equal(move(p, up, {type: 'step', dir: 'U'}), null, 'the tube’s top is a wall');
  assert.ok(play(p, tube, ...walk('RRRRRR')));
  assert.ok(!isSolved(p, play(p, a, ...walk('RRR')).board));
  assert.equal(nextHint(p, a).type, 'done');
  assert.match(view(p, a), /aria-label="Big portal room"/);
});

test('forged saves are rejected', () => {
  const bad = [
    ['portals-01', {trip: 'RRRUUUR', told: null, claimed: false}],
    ['portals-01', {trip: '', told: null, claimed: true}],
    ['portals-03', {trip: 'RRRR', told: null, claimed: false}],
    ['portals-03', {trip: '', told: null, claimed: true}],
    ['portals-12', {trip: '', told: 'way', claimed: false}],
    ['portals-02', {trip: '', found: ['H', 'H'], told: null, done: false}],
    ['portals-07', {trip: '', found: ['B'], told: null, done: false}],
    ['portals-02', {trip: '', found: ['H'], told: null, done: true}],
    ['portals-10', {trip: 'UUURRR', told: null, claimed: false, slides: 3}],
    ['portals-10', {trip: 'RRURUU', told: null, claimed: false, slides: 2}],
    ['portals-08', {trip: 'LLL', told: null, claimed: false}],
    ['portals-playground', {room: 'moon', trip: ''}]
  ];
  for (const [id, board] of bad) assert.equal(validBoard(byId(id), board), false, `${id}: ${JSON.stringify(board)}`);
  assert.equal(validBoard(byId('portals-10'), {trip: 'RRURUU', told: null, claimed: false, slides: 3}), true, 'a slide there, back, and on');
});

test('every puzzle renders its room and views; objectives stay off the board unless needed', () => {
  for (const p of portals.puzzles) {
    const a = freshAttempt(p), html = view(p, a), q = p.parameters;
    assert.match(html, /pt-puzzle/, p.id);
    assert.match(html, /pb-board pb-room/, p.id);
    assert.equal(/pb-plane/.test(html), q.room !== undefined ? surfaceFor(q).edges.some(e => e.kind === 'seam') : true, `${p.id}: the unrolled view when there are portals`);
    if (q.mode === 'shrink') assert.match(html, /data-pb-vertex="\d+" data-focus/, `${p.id}: corner controls`);
    else assert.equal((html.match(/data-pb-dir=/g) || []).length, 4, `${p.id}: four arrows`);
    assert.doesNotMatch(html, /\b\d+ (found|of \d+ found)\b/i, `${p.id}: no found count`);
    if (p.visibleObjective) assert.ok(html.includes(p.visibleObjective.replace(/’/g, '’')), `${p.id}: the one objective`);
  }
  // A solved walk keeps its views and drops the pad.
  const p = byId('portals-01'), done = play(p, freshAttempt(p), ...walk('RRRUUU'));
  assert.doesNotMatch(view(p, done), /data-pb-dir/);
  assert.match(view(p, done), /pt-star got/);
  // The trade draws the gap; hint level 2 marks the next arrow.
  const t = byId('portals-04');
  assert.match(view(t, freshAttempt(t)), /pt-gap/);
  assert.match(view(byId('portals-01'), {...freshAttempt(p), hintLevel: 2}), /pb-arrow pb-R hinted/);
});
