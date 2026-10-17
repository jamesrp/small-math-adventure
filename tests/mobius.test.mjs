// Seams (Week 38) and the portal board's reversing seam: specs with flip,
// marks, corners, lattice points across a turned side, the views that refuse
// it, and every translation surface unchanged; closed edges and pieces of
// bands, cuts and holes; the parity rule; dots, Can't and its certificate;
// seams, cuts and holes; hints and their CPU time; Undo; saves; rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {surfaceOf, validSurfaceSpec, canonical, validPoint, step, place, lift, shoot, develop, roomSpots, roomFromRows, cornerClasses, roomBoard} from '../dist/portal-board.js';
import {topology, shapeFrom, specOf, surfaceFor, arrowFlips, comesHomeFlipped, cantOpen, certified, reachable, pathFrom, mobiusMechanics} from '../dist/families/mobius/mobius.js';
import {loadPack} from '../scripts/packs.mjs';

const mobius = JSON.parse(await readFile(new URL('../dist/families/mobius/mobius.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => mobius.puzzles.find(p => p.id === id);
const M = mobiusMechanics.mobius;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const one = (n, seam, cuts = [], extra = {}) => ({strips: 1, len: 2, n, layout: [[0, 0]], seams: [seam], cuts, ...extra});

// --- The board's reversing seam -------------------------------------------------------------
// Two squares in a row, B's right side glued to A's left side turned over.
const strip = flip => ({squares: {A: [0, 0], B: [1, 0]}, right: {A: 'B', B: 'A'}, n: 4, ...(flip ? {flip: {B: true}} : {})});

test('board: a spec may turn a right side over', () => {
  assert.ok(validSurfaceSpec(strip(true)));
  assert.ok(validSurfaceSpec({...strip(false), flip: {B: false}}));
  assert.ok(!validSurfaceSpec({...strip(false), flip: {Z: true}}), 'a square that is not there');
  assert.ok(!validSurfaceSpec({...strip(false), flip: {B: 'yes'}}), 'not a boolean');
  assert.ok(!validSurfaceSpec({...strip(false), flip: []}), 'not a map');
  assert.ok(!validSurfaceSpec({squares: {A: [0, 0]}, flip: {A: true}}), 'a wall cannot be turned');
  const S = surfaceOf(strip(true));
  assert.ok(S.flipped && S.flip.right.B && S.flip.left.A && !S.flip.right.A);
});

test('board: surfaces with no reversing seam are as they were', () => {
  for (const spec of [roomFromRows(['ABC', 'DHE', 'FGI']), {...roomFromRows(['ab', 'cd', 'ef'], {wrapY: false}), n: 6, lattice: 'crosses'}, {squares: {a: [0, 0], b: [1, 0], c: [0, 1]}, right: {a: 'b', b: 'a', c: 'c'}, up: {a: 'c', c: 'a', b: 'b'}}, strip(false)]) {
    const S = surfaceOf(spec);
    assert.equal(S.flipped, false);
    assert.ok(S.edges.every(e => !('reversed' in e)), 'no edge says reversed');
    assert.ok(S.marks.every(m => !('reversed' in m)), 'no mark says reversed');
    assert.ok(S.marks.every((m, i) => i % 2 === 1 || m.along === S.marks[i + 1].along), 'marks sit at the same place on both runs');
  }
  // The plain strip: an inner side between A and B, a seam with marks halfway.
  const S = surfaceOf(strip(false));
  assert.deepEqual(S.edges.filter(e => e.kind === 'seam').map(e => `${e.s}${e.side}`).sort(), ['Aleft', 'Bright']);
  assert.deepEqual(S.marks.map(m => [m.s, m.side, m.along]), [['B', 'right', .5], ['A', 'left', .5]]);
  assert.doesNotThrow(() => lift(S, {s: 'A', i: 0, j: 0}, [[1, 0]]));
});

test('board: marks show the turn, and corners and points cross it turned over', () => {
  const S = surfaceOf(strip(true));
  assert.deepEqual(S.edges.filter(e => e.reversed).map(e => `${e.s}${e.side}`).sort(), ['Aleft', 'Bright']);
  // B's lower quarter meets A's upper quarter.
  assert.deepEqual(S.marks.map(m => [m.s, m.side, m.along, m.reversed]), [['B', 'right', .25, true], ['A', 'left', .75, true]]);
  // Corners: B's lower right corner is A's upper left, and so on.
  const classes = cornerClasses(S).map(c => c.corners.map(({s, c: [x, y]}) => `${s}${x}${y}`).sort().join(' ')).sort();
  assert.deepEqual(classes, ['A00 B11', 'A01 B10', 'A10 B00', 'A11 B01']);
  // Cells: B's cell at height j continues in A's cell at height n - 1 - j.
  assert.deepEqual(canonical(S, {s: 'B', i: 4, j: 0}), {s: 'A', i: 0, j: 3});
  assert.deepEqual(canonical(S, {s: 'A', i: -1, j: 1}), {s: 'B', i: 3, j: 2});
  assert.deepEqual(canonical(S, {s: 'A', i: 4, j: 1}), {s: 'B', i: 0, j: 1}, 'the inner side is not turned');
  assert.deepEqual(step(S, place(S, {s: 'B', i: 3, j: 0}), [1, 0]), {s: 'A', i: 0, j: 3, X: 2, Y: 0});
  // Crosses: B's right side at height j is A's left side at height n - j.
  const C = surfaceOf({...strip(true), lattice: 'crosses'});
  assert.deepEqual(canonical(C, {s: 'B', i: 4, j: 1}), {s: 'A', i: 0, j: 3});
  assert.ok(validPoint(C, {s: 'A', i: 0, j: 1}) && !validPoint(C, {s: 'B', i: 4, j: 1}));
  const spots = roomSpots(C, {s: 'A', i: 0, j: 1}).map(([x, y]) => [x, -y]);
  assert.deepEqual(spots, [[0, 1], [8, 3]], 'a cross on the seam is drawn on both ends, turned');
  // The unrolled view, lifts and straight shots refuse a turned surface.
  assert.throws(() => lift(S, {s: 'A', i: 0, j: 0}, [[1, 0]]), RangeError);
  assert.throws(() => shoot(C, {s: 'A', i: 0, j: 1}, [1, 0]), RangeError);
  assert.throws(() => develop(S, [{s: 'A', X: 0, Y: 0}], [0, 0, 2, 0]), RangeError);
  assert.match(roomBoard(S, {}), /<svg class="pb-board pb-room/);
});

test('board: a square with its right side turned over and its top glued straight is a Klein bottle', () => {
  const S = surfaceOf({squares: {A: [0, 0]}, right: {A: 'A'}, up: {A: 'A'}, flip: {A: true}, n: 4});
  // One point of four corners: V - E + F = 1 - 2 + 1 = 0.
  assert.deepEqual(cornerClasses(S).map(c => c.corners.length), [4]);
  assert.deepEqual(canonical(S, {s: 'A', i: 4, j: 0}), {s: 'A', i: 0, j: 3}, 'across the side, turned');
  assert.deepEqual(canonical(S, {s: 'A', i: 1, j: 4}), {s: 'A', i: 1, j: 0}, 'across the top, straight');
});

test('board: wall corners chain into one closed edge for an odd number of turned seams', () => {
  // A circle of K one-square strips, walls top and bottom: follow wall sides
  // through the corner classes and count the chains.
  for (let K = 1; K <= 4; K++) for (let code = 0; code < 2 ** K; code++) {
    const seams = Array.from({length: K}, (_, k) => (code >> k) & 1 ? 'R' : 'M'), sh = shapeFrom({strips: K, len: 1, n: 1, layout: Array.from({length: K}, (_, k) => [2 * k, 0])});
    const S = surfaceOf(specOf(sh, seams)), parent = new Map();
    const find = x => { while (parent.get(x) !== x) x = parent.get(x); return x; };
    const sides = S.ids.flatMap(s => ['up', 'down'].map(side => `${s}${side}`));
    for (const x of sides) parent.set(x, x);
    for (const cl of cornerClasses(S)) {
      const on = cl.corners.map(({s, c: [, y]}) => `${s}${y ? 'up' : 'down'}`);
      for (const x of on) parent.set(find(x), find(on[0]));
    }
    const chains = new Set(sides.map(find)).size, odd = seams.filter(m => m === 'R').length % 2 === 1;
    assert.equal(chains, odd ? 1 : 2, `${seams.join('')}: closed edges from the board’s corners`);
    assert.equal(topology(sh, seams, []).circles.length, chains, `${seams.join('')}: the mechanic agrees`);
  }
});

// --- Bands --------------------------------------------------------------------------------------
test('bands: A has two closed edges, B one; cuts and holes', () => {
  const T = (n, seam, cuts, holes, spots) => topology(shapeFrom(one(n, seam, cuts, {spots: spots || []})), [seam], cuts, holes || []);
  assert.equal(T(4, 'M', []).circles.length, 2);
  assert.equal(T(4, 'R', []).circles.length, 1);
  assert.deepEqual(T(4, 'M', [2]).sorted, [2, 2], 'A cut down the middle: two bands');
  assert.deepEqual(T(4, 'R', [2]).sorted, [2], 'B cut down the middle: one band, two edges');
  assert.deepEqual(T(6, 'R', [2, 4]).sorted, [2, 1], 'B cut in thirds: an annulus and a Möbius band');
  assert.deepEqual(T(4, 'R', [1, 2, 3]).sorted, [2, 2], 'four lanes, R: two annuli');
  assert.deepEqual(T(6, 'M', [2, 4]).sorted, [2, 2, 2]);
  const spots = [{x: 2, y: 2}, {x: 4, y: 3}, {x: 3, y: 4}];
  assert.deepEqual(T(4, 'R', [], [0, 1], spots).sorted, [3], 'two holes add two edges');
  assert.deepEqual(T(4, 'M', [], [0, 2], spots).sorted, [3], 'a notch adds none');
  // The cut's two sides are one closed edge on B, two on A.
  const B = T(4, 'R', [2]), A = T(4, 'M', [2]);
  assert.equal(B.circleOf.get('0:2d'), B.circleOf.get('0:2u'));
  assert.notEqual(A.circleOf.get('0:2d'), A.circleOf.get('0:2u'));
});

test('bands: the parity rule and the carried arrow', () => {
  const sh = shapeFrom({strips: 4, len: 2, n: 2, layout: [[0, 2], [3, 2], [0, 0], [3, 0]]});
  for (let code = 0; code < 16; code++) {
    const seams = Array.from({length: 4}, (_, k) => (code >> k) & 1 ? 'R' : 'M');
    assert.equal(topology(sh, seams, []).circles.length, comesHomeFlipped(seams) ? 1 : 2);
  }
  assert.deepEqual(arrowFlips(['R', 'M', 'R', 'M']), [false, true, true, false]);
  assert.equal(comesHomeFlipped(['R', 'R', 'R']), true);
});

// --- Dots ---------------------------------------------------------------------------------------
test('dots: four dots match the rings, a fifth is refused, a dot lifts', () => {
  const p = byId('mobius-01');
  let a = play(p, freshAttempt(p), ...['0:0u:1', '0:0u:2', '0:4d:1'].map(seg => ({type: 'dot', seg})));
  assert.ok(!isSolved(p, a.board));
  a = play(p, a, {type: 'dot', seg: '0:4d:5'});
  assert.ok(isSolved(p, a.board), 'two on the bottom edge, two on the top');
  const b = play(p, freshAttempt(p), ...['0:0u:1', '0:0u:2', '0:0u:3', '0:4d:1'].map(seg => ({type: 'dot', seg})));
  assert.equal(move(p, b, {type: 'dot', seg: '0:4d:2'}), null, 'no fifth dot');
  assert.equal(play(p, b, {type: 'dot', seg: '0:0u:3'}).board.dots.length, 3);
});

test('dots: Can’t needs four dots, a tap on each closed edge, and stays refused through Undo', () => {
  const p = byId('mobius-05'), q = p.parameters;
  const fresh = freshAttempt(p);
  assert.ok(!cantOpen(q, fresh.board));
  let a = play(p, fresh, ...['0:0u:1', '0:0u:2', '0:4d:3', '0:2d:3'].map(seg => ({type: 'dot', seg})));
  assert.ok(cantOpen(q, a.board));
  // One tap on the walls only misses the cut; two on one closed edge (top and bottom) twice.
  for (const flags of [['0:0u:0'], ['0:0u:0', '0:4d:0'], ['0:0u:0', '0:2d:0', '0:2u:0']]) {
    const r = move(p, a, {type: 'cant', flags});
    assert.equal(r.board.told, 'flags', JSON.stringify(flags));
    assert.ok(cantOpen(q, r.board), 'Can’t stays open');
  }
  const right = play(p, a, {type: 'cant', flags: ['0:2u:6', '0:4d:0']});
  assert.equal(isSolved(p, right.board), true, 'solved is a boolean (saves need one)');
  assert.equal(right.completed, true);
  assert.deepEqual(right.board.claimed, ['0:2u:6', '0:4d:0'], 'the taps are kept');
  assert.ok(certified(topology(shapeFrom(q), q.seams, q.cuts), right.board.claimed));
  // On a band that can do it: "There is a way.", kept through Undo while the dots are the same.
  const p4 = byId('mobius-04');
  let b = play(p4, freshAttempt(p4), ...['0:0u:1', '0:0u:2', '0:4d:3', '0:2d:3'].map(seg => ({type: 'dot', seg})));
  b = play(p4, b, {type: 'cant', flags: ['0:0u:0', '0:2u:0']});
  assert.equal(b.board.told, 'way');
  assert.deepEqual(b.board.flags, ['0:0u:0', '0:2u:0'], 'the certificate stays drawn');
  assert.equal(move(p4, b, {type: 'cant', flags: ['0:0u:0', '0:2u:0']}), null);
  const u = undo(b), back = {...u, board: M.carry(p4, b.board, u.board)};
  assert.equal(back.board.told, 'way', 'Undo keeps the refusal');
  assert.deepEqual(back.board.flags, [], 'and takes back the flags, so the board changes');
  assert.ok(validBoard(p4, back.board));
  const u2 = undo(back), back2 = {...u2, board: M.carry(p4, back.board, u2.board)};
  assert.equal(back2.board.told, null, 'a dot taken back changes the board');
  assert.ok(!cantOpen(p4.parameters, back2.board), 'and three dots don’t open Can’t');
});

test('dots: forged saves, including a forged claim', () => {
  const p = byId('mobius-02'), b = freshAttempt(p).board, four = ['0:0u:1', '0:0u:2', '0:0u:3', '0:4d:1'];
  for (const f of [{...b, claimed: true}, {...b, claimed: ['0:0u:0']}, {...b, dots: four, claimed: ['0:0u:0', '0:4d:0']}, {...b, dots: four, told: 'way'}, {...b, dots: four, flags: ['0:4d:5']}, {...b, dots: four, told: 'flags', flags: ['0:4d:5']}, {...b, dots: [...four, '0:4d:2']}, {...b, dots: ['0:2u:0']}, {...b, x: 1}]) assert.equal(validBoard(p, f), false, JSON.stringify(f));
  assert.equal(validBoard(p, {...b, dots: four, claimed: ['0:4d:5']}), true, 'a real claim');
});

// --- Seams, cuts and holes ----------------------------------------------------------------------
test('seams: the dots pin each seam, and a fixed seam stays', () => {
  const p = byId('mobius-06'), fresh = freshAttempt(p);
  assert.deepEqual(reachable(p).filter(b => isSolved(p, b)).map(b => b.seams.join('')), ['RMR']);
  const a = play(p, fresh, {type: 'seam', k: 0}, {type: 'seam', k: 2});
  assert.ok(isSolved(p, a.board));
  const p10 = byId('mobius-10');
  assert.equal(move(p10, freshAttempt(p10), {type: 'seam', k: 2}), null, 'the padlocked seam');
  assert.equal(validBoard(p10, {seams: ['R', 'M', 'M', 'R']}), false);
});

test('pieces: a cut runs on round an R band, locks the seam and tapes back; holes keep to the budget', () => {
  const p = byId('mobius-11'), fresh = freshAttempt(p);
  let a = play(p, fresh, {type: 'seam', k: 0}, {type: 'cut', h: 3});
  assert.deepEqual(a.board.cuts, [1, 3], 'one cut, both heights');
  assert.ok(isSolved(p, a.board));
  const m = play(p, fresh, {type: 'cut', h: 2});
  assert.equal(move(p, m, {type: 'seam', k: 0}), null, 'no seam change while cut');
  assert.deepEqual(play(p, m, {type: 'cut', h: 2}).board.cuts, [], 'tapes back');
  const p8 = byId('mobius-08');
  const full = play(p8, freshAttempt(p8), {type: 'hole', i: 0}, {type: 'hole', i: 1}, {type: 'hole', i: 3});
  assert.equal(move(p8, full, {type: 'hole', i: 2}), null, 'the budget');
  assert.ok(!isSolved(p8, full.board), 'R with two holes and a notch: three edges');
  assert.ok(isSolved(p8, play(p8, full, {type: 'hole', i: 3}, {type: 'hole', i: 2}).board), 'R with three holes: four');
  assert.equal(validBoard(p, {seams: ['R'], cuts: [1], holes: []}), false, 'a cut on B goes both ways');
  assert.equal(validBoard(p8, {seams: ['R'], cuts: [], holes: [0, 1, 2, 3]}), false, 'past the budget');
});

// --- Hints ---------------------------------------------------------------------------------------
test('hints solve every puzzle from fresh, quickly, and never start with Can’t', () => {
  let worst = 0;
  for (const p of mobius.puzzles.filter(p => p.band !== 'playground')) {
    let a = freshAttempt(p), steps = 0;
    const first = nextHint(p, a);
    assert.equal(first.type, 'move');
    assert.notEqual(first.action.type, 'cant');
    while (!isSolved(p, a.board)) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      worst = Math.max(worst, (u.user + u.system) / 1000);
      a = play(p, a, h.action);
      assert.ok(++steps < 30, `${p.id}: hints finish`);
    }
  }
  assert.ok(worst < 100, `slowest hint ${worst} ms of CPU`);
  // Searches from every board of the largest puzzle stay quick.
  const p = byId('mobius-12'), t = process.cpuUsage();
  for (const b of reachable(p)) pathFrom(p, b);
  const u = process.cpuUsage(t);
  assert.ok((u.user + u.system) / 1000 < 1500, 'every board of puzzle 12 searched');
});

// --- Rendering ------------------------------------------------------------------------------------
test('rendering: controls, lamps, Can’t taps hide the colours, and the solved band', () => {
  const p = byId('mobius-02');
  let a = play(p, freshAttempt(p), ...['0:0u:1', '0:0u:2', '0:0u:3', '0:4d:1'].map(seg => ({type: 'dot', seg})));
  let html = view(p, a);
  assert.match(html, /data-mechanic-wire="mobius"/);
  assert.match(html, /mb-dot rose/, 'dots on one closed edge share a colour');
  assert.equal((html.match(/data-pb-point="seg:/g) || []).length, 16, 'one control per edge segment');
  M.ui(p, {claiming: true});
  html = view(p, a);
  assert.ok(!/mb-dot rose/.test(html) && /mb-dot plain/.test(html), 'Can’t hides the colours');
  assert.match(html, /That’s all/);
  M.ui(p, {flag: '0:4d:2'});
  a = play(p, a, {type: 'cant', flags: ['0:4d:2']});
  html = view(p, a);
  assert.ok(!/data-pb-point=/.test(html), 'no controls once solved');
  assert.match(html, /mb-ring-x/, 'the extra ring is crossed out');
  assert.match(html, /mb-arrow home flipped/, 'the arrow comes home flipped');
  M.reset(p);
  // "There is a way." keeps the certificate's flags drawn; Undo takes them back and keeps the words.
  const p4 = byId('mobius-04');
  let w = play(p4, freshAttempt(p4), ...['0:0u:1', '0:0u:2', '0:4d:3', '0:2d:3'].map(seg => ({type: 'dot', seg})), {type: 'cant', flags: ['0:0u:0', '0:2u:0']});
  html = view(p4, w);
  assert.equal((html.match(/class="mb-flag"/g) || []).length, 2);
  assert.match(html, /There is a way\./);
  const u = undo(w);
  html = view(p4, {...u, board: M.carry(p4, w.board, u.board)});
  assert.equal((html.match(/class="mb-flag"/g) || []).length, 0, 'Undo visibly changes the board');
  assert.match(html, /There is a way\./);
  M.reset(p4);
  // Lamps: a tap lights a whole closed edge.
  const p6 = byId('mobius-06');
  M.ui(p6, {lamps: ['0:2d']});
  html = view(p6, freshAttempt(p6));
  assert.equal((html.match(/mb-lit rose/g) || []).length, 3, 'the top of strip 1 lights round three strips');
  M.reset(p6);
  // Pieces: seams, scissors, spots and lines are controls; cut pieces are tinted.
  const p12 = byId('mobius-12');
  html = view(p12, play(p12, freshAttempt(p12), {type: 'seam', k: 0}, {type: 'cut', h: 2}));
  assert.match(html, /data-pb-point="spot:0"/);
  assert.match(html, /data-pb-point="line:2"/);
  assert.ok(!/data-pb-point="seam:0"/.test(html), 'the seam is locked while cut');
  assert.match(html, /mb-tint t1/);
  // The playground: three shapes, never solved.
  const pg = byId('mobius-playground');
  assert.equal(M.noHint(pg), true);
  html = view(pg, play(pg, freshAttempt(pg), {type: 'shape', id: 'four'}));
  assert.equal((html.match(/data-pb-point="seam:/g) || []).length, 4);
});
