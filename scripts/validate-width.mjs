// Checks the Snug spinners pack (dist/families/width/width.json) without the
// mechanic's own arithmetic: its own exact numbers a + b√r (BigInt fractions)
// for the corners, dots and spots, convexity and equal star diagonals, which
// points may centre which gap; then, for every full shape the child can make,
// the width measured a different way (the shape's boundary sampled densely
// and projected, not the support function), so that the shapes of constant
// width are exactly the mechanic's solves and exactly the solution witness,
// and every other one wobbles visibly. In the hard puzzles, where the child
// first puts a missing corner on one of several spots, the same for every
// spot: exactly one spot gives a snug shape, every other spot leaves a
// compass that misses, and the cost of trying every spot is reported. Also:
// every compass miss is visible, points are far enough apart to tap, hints
// alone solve from fresh and after every wrong first move without their text
// naming the centre or spot, illegal moves are refused, forged saves
// (including a forged done) are rejected, and the playground's shapes are or
// are not of constant width as its notes say.
// Run: node scripts/validate-width.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {exactOf, layoutOf} from '../dist/families/width/width.js';
import {loadPack} from './packs.mjs';

// ---------------------------------------------------------------------------
// Exact numbers a + b√r, as [[an, ad], [bn, bd]] with BigInt parts.
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };
const q = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d); return [n / g, d / g]; };
const qa = (x, y) => q(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
const qm = (x, y) => q(x[0] * y[0], x[1] * y[1]);
const qneg = x => [-x[0], x[1]];
const qread = s => { const [n, d = '1'] = s.split('/'); return q(BigInt(n), BigInt(d)); };
function Field(r) {
  const R = [BigInt(r), 1n];
  const read = s => { const [a, b = '0'] = String(s).split('|'); return [qread(a), qread(b)]; };
  const add = (x, y) => [qa(x[0], y[0]), qa(x[1], y[1])];
  const neg = x => [qneg(x[0]), qneg(x[1])];
  const mul = (x, y) => [qa(qm(x[0], y[0]), qm(R, qm(x[1], y[1]))), qa(qm(x[0], y[1]), qm(x[1], y[0]))];
  const zero = x => x[0][0] === 0n && x[1][0] === 0n;
  // Sign of a + b√r: compare a² with r·b² when a and b differ in sign.
  const sign = x => {
    const sa = Math.sign(Number(x[0][0])), sb = Math.sign(Number(x[1][0]));
    if (!sb) return sa;
    if (!sa || sa === sb) return sb;
    const d = qa(qm(x[0], x[0]), qneg(qm(R, qm(x[1], x[1]))));
    return d[0] > 0n ? sa : d[0] < 0n ? sb : 0;
  };
  const num = x => Number(x[0][0]) / Number(x[0][1]) + Number(x[1][0]) / Number(x[1][1]) * Math.sqrt(r);
  return {read, add, neg, mul, zero, sign, num, sub: (x, y) => add(x, neg(y))};
}
function exact(params, spot = null) {
  const K = Field(params.field.r), tx = K.read(params.field.tx), ty = K.read(params.field.ty);
  const pts = {...params.corners, ...(params.pins || {}), ...(params.spots || {}), ...(spot ? {[params.open]: params.spots[spot]} : {})};
  const at = Object.fromEntries(Object.entries(pts).map(([id, [x, y]]) => [id, [K.read(x), K.read(y)]]));
  const d2 = (u, v) => { const dx = K.sub(at[u][0], at[v][0]), dy = K.sub(at[u][1], at[v][1]); return K.add(K.mul(tx, K.mul(dx, dx)), K.mul(ty, K.mul(dy, dy))); };
  const cross = (u, v, w) => K.sign(K.sub(K.mul(K.sub(at[v][0], at[u][0]), K.sub(at[w][1], at[u][1])), K.mul(K.sub(at[v][1], at[u][1]), K.sub(at[w][0], at[u][0]))));
  const pos = id => [K.num(at[id][0]) * Math.sqrt(K.num(tx)), K.num(at[id][1]) * Math.sqrt(K.num(ty))];
  return {K, at, d2, cross, pos, ids: Object.keys(pts)};
}

// ---------------------------------------------------------------------------
// Width by sampling: the boundary as a dense polygon (every arc cut into many
// short chords), projected on each of many directions.
function boundary(pos, order, centres, perArc = 600) {
  const n = order.length, pts = [];
  for (let i = 0; i < n; i++) {
    const a = pos(order[i]), b = pos(order[(i + 1) % n]);
    pts.push(a);
    if (!centres[i]) continue;
    const c = pos(centres[i]), r = Math.hypot(a[0] - c[0], a[1] - c[1]);
    const t0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
    let span = Math.atan2(b[1] - c[1], b[0] - c[0]) - t0;
    while (span <= 0) span += 2 * Math.PI;
    for (let k = 1; k < perArc; k++) { const t = t0 + span * k / perArc; pts.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]); }
  }
  return pts;
}
// `start` is the direction across the rails before the shape turns (the
// board's up, turned back by the puzzle's display turn): `drift` is how far
// the gap moves from its starting size, which is what the spin shows.
function wobble(pts, dirs = 720, start = Math.PI / 2) {
  const across = t => { const ux = Math.cos(t), uy = Math.sin(t); let a = Infinity, b = -Infinity; for (const p of pts) { const v = p[0] * ux + p[1] * uy; if (v < a) a = v; if (v > b) b = v; } return b - a; };
  const w0 = across(start);
  let lo = Infinity, hi = -Infinity, drift = 0;
  for (let k = 0; k < dirs; k++) { const w = across(start + Math.PI * k / dirs); lo = Math.min(lo, w); hi = Math.max(hi, w); drift = Math.max(drift, Math.abs(w - w0)); }
  return {lo, hi, range: hi - lo, drift};
}

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// Hint text points at the reasoning: it never names the centre or the spot
// (the board rings it from the second level).
function hintText(p, h, label) {
  const named = h.action.type === 'corner' ? [h.action.at, p.parameters.names[h.action.at]] : [h.action.at];
  for (const name of named) assert.ok(!new RegExp(`\\b${name}\\b`).test(h.text), `${p.id} ${label}: the hint “${h.text}” does not name ${name}`);
  assert.ok(h.text.length > 20 && /\?$/.test(h.text), `${p.id} ${label}: the hint asks a question`);
}
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 20; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    hintText(p, h, label);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}

// The table in docs/width/README.md: corner letters in order, the answer,
// the level, and (hard puzzles) the missing corner.
const TABLE = {
  'width-01': ['ABC', 'CAB', 'easy'],
  'width-02': ['ABC', 'CAB', 'easy'],
  'width-03': ['ABCDE', 'DEABC', 'easy'],
  'width-04': ['ABCDE', 'DEABC', 'medium'],
  'width-05': ['BEADC', 'DCBEA', 'medium'],
  'width-06': ['DACEB', 'EBDAC', 'medium'],
  'width-07': ['DAECB', 'CBDAE', 'hard', 'E'],
  'width-08': ['CEADB', 'DBCEA', 'hard', 'B'],
  'width-09': ['CEBAD', 'ADCEB', 'hard', 'A']
};
const WOBBLE_PX = 8, MISS_PX = 6, APART_PX = 30;

// Shared checks for one placement of the corners (all of them there).
function cornersOf(p, E, order, label) {
  const n = order.length, k = (n - 1) / 2;
  for (let i = 0; i < n; i++) for (const id of order) if (id !== order[i] && id !== order[(i + 1) % n]) assert.equal(E.cross(order[i], order[(i + 1) % n], id), 1, `${p.id}${label}: convex at ${order[i]}${order[(i + 1) % n]}`);
  return E.d2(order[0], order[k]);
}
const starEqual = (p, E, order, w2) => { const n = order.length, k = (n - 1) / 2; for (let i = 0; i < n; i++) for (const j of [k, k + 1]) if (!E.K.zero(E.K.sub(E.d2(order[i], order[(i + j) % n]), w2))) return false; return true; };
// Which points may centre which gap (exactly as far from both ends); and
// every full shape's sampled width.
function joinsOf(E, order, centres) { const n = order.length; return order.map((a, i) => { const b = order[(i + 1) % n]; return centres.filter(c => c !== a && c !== b && E.K.zero(E.K.sub(E.d2(c, a), E.d2(c, b)))); }); }
function eachFull(p, E, order, joins, s, board, w) {
  const out = {shapes: 0, snug: [], least: Infinity};
  const each = (i, arcs) => {
    if (i === order.length) {
      out.shapes++;
      const {range, drift} = wobble(boundary(E.pos, order, arcs), 720, Math.PI / 2 - (p.parameters.turn || 0) * Math.PI / 180);
      const solved = mechanicFor(p).solved(p, board(arcs));
      if (range < 1e-4 * w) { out.snug.push(arcs.join(',')); assert.ok(solved, `${p.id}: ${JSON.stringify(board(arcs))} has constant width, so it is a solve`); }
      else { assert.ok(!solved, `${p.id}: ${JSON.stringify(board(arcs))} wobbles, so it is not a solve`); out.least = Math.min(out.least, drift * s); }
      return;
    }
    for (const c of joins[i]) each(i + 1, [...arcs, c]);
  };
  each(0, []);
  return out;
}
function missOf(E, order, joins, ids, s) {
  let miss = Infinity;
  order.forEach((a, i) => { const b = order[(i + 1) % order.length]; for (const c of ids) if (c !== a && c !== b && !joins[i].includes(c)) { const [A, B, C] = [a, b, c].map(E.pos); miss = Math.min(miss, Math.abs(Math.hypot(C[0] - A[0], C[1] - A[1]) - Math.hypot(C[0] - B[0], C[1] - B[1])) * s); } });
  return miss;
}
function apartOf(E, ids, s) { let apart = Infinity; ids.forEach((u, i) => ids.slice(i + 1).forEach(v => { const [P, Q] = [u, v].map(E.pos); apart = Math.min(apart, Math.hypot(P[0] - Q[0], P[1] - Q[1]) * s); })); return apart; }
// The shape, up to turning and mirroring: its side lengths round it.
function sidesOf(E, order) { const n = order.length; return order.map((a, i) => { const [P, Q] = [a, order[(i + 1) % n]].map(E.pos); return Math.hypot(P[0] - Q[0], P[1] - Q[1]); }); }

function checkPuzzle(p) {
  const q = p.parameters;
  if (q.mode === 'place') return checkPlace(p);
  const E = exact(q), order = q.order, n = order.length;
  const [letters, answer, level] = TABLE[p.id];
  assert.equal(order.join(''), letters, `${p.id}: corners as in the table`);
  assert.equal(p.difficulty_level, level, `${p.id}: level`);
  assert.deepEqual(p.solution, {arcs: [...answer]}, `${p.id}: the witness is the table's answer`);
  assert.ok(n % 2 === 1 && n >= 3, `${p.id}: an odd number of corners`);
  const w2 = cornersOf(p, E, order, '');
  assert.ok(starEqual(p, E, order, w2), `${p.id}: equal star diagonals`);
  const joins = joinsOf(E, order, E.ids);
  joins.forEach((list, i) => assert.deepEqual([...list].sort(), [...exactOf(p).gaps[i].joins].sort(), `${p.id}: gap ${i} centres agree with the mechanic`));
  // Every centre on the inner side of its gap or on its line, so arcs bulge out.
  joins.forEach((list, i) => list.forEach(c => assert.ok(E.cross(order[i], order[(i + 1) % n], c) >= 0, `${p.id}: ${c} inside for gap ${i}`)));
  const {s} = layoutOf(p), w = Math.sqrt(E.K.num(w2));
  const full = eachFull(p, E, order, joins, s, arcs => ({arcs}), w);
  assert.deepEqual(full.snug, [answer.split('').join(',')], `${p.id}: exactly one full shape has constant width, the witness`);
  assert.ok(full.least >= WOBBLE_PX, `${p.id}: every other full shape's top rail moves at least ${WOBBLE_PX} px from where it started (${full.least.toFixed(1)})`);
  const miss = missOf(E, order, joins, E.ids, s), apart = apartOf(E, E.ids, s);
  assert.ok(miss >= MISS_PX, `${p.id}: every miss shows by at least ${MISS_PX} px (${miss.toFixed(1)})`);
  assert.ok(apart >= APART_PX, `${p.id}: points at least ${APART_PX} px apart (${apart.toFixed(1)})`);

  // Play: the witness, hints from fresh and after every wrong first move.
  const fresh = freshAttempt(p);
  assert.equal(validBoard(p, fresh.board), true, `${p.id}: fresh board is valid`);
  assert.equal(isSolved(p, fresh.board), false, `${p.id}: not solved at the start`);
  if (q.start) assert.deepEqual(fresh.board.arcs, q.start, `${p.id}: the repair starts from its arcs`);
  else assert.ok(fresh.board.arcs.every(c => c === null), `${p.id}: a build starts empty`);
  let a = fresh;
  answer.split('').forEach((c, i) => { if (a.board.arcs[i] !== c) a = play(p, a, {type: 'arc', gap: i, at: c}); });
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  assert.ok(!/\bon [A-E]\b/.test(p.hints[0]), `${p.id}: the first hint does not name a centre`);
  const steps = [hintsSolve(p, fresh, 'from fresh')];
  joins.forEach((list, i) => list.forEach(c => { if (c !== answer[i] && fresh.board.arcs[i] !== c) steps.push(hintsSolve(p, play(p, fresh, {type: 'arc', gap: i, at: c}), `after ${c} on gap ${i}`)); }));
  // Illegal moves.
  const end = order[1], nonJoin = E.ids.find(c => c !== order[0] && c !== order[1] && !joins[0].includes(c));
  refuse(p, fresh, {type: 'arc', gap: 0, at: end}, 'an end of the gap as centre');
  if (nonJoin) refuse(p, fresh, {type: 'arc', gap: 0, at: nonJoin}, `a centre not equally far from both ends (${nonJoin})`);
  refuse(p, fresh, {type: 'arc', gap: n, at: answer[0]}, 'a gap that does not exist');
  refuse(p, fresh, {type: 'arc', gap: -1, at: answer[0]}, 'a negative gap');
  refuse(p, fresh, {type: 'arc', gap: 0, at: 'Z'}, 'an unknown point');
  refuse(p, fresh, {type: 'arc', gap: '0', at: answer[0]}, 'a gap that is not a number');
  refuse(p, fresh, {type: 'shape', shape: 1}, 'a playground move');
  refuse(p, fresh, {type: 'corner', at: 's1'}, 'placing a corner where none is missing');
  refuse(p, fresh, {type: 'clear', gap: 0}, 'an unknown move');
  if (fresh.board.arcs[0]) refuse(p, fresh, {type: 'arc', gap: 0, at: fresh.board.arcs[0]}, 'the centre the arc already has');
  // Forged saves.
  const solvedArcs = [...answer];
  const forged = [
    [{arcs: solvedArcs, done: true}, 'a forged done beside the arcs'],
    [{arcs: fresh.board.arcs, done: true}, 'a forged done on the start'],
    [{arcs: solvedArcs, corner: null}, 'a corner key on a puzzle with every corner'],
    [{done: true}, 'done without arcs'],
    [{arcs: solvedArcs.slice(1)}, 'too few arcs'],
    [{arcs: [...solvedArcs, null]}, 'too many arcs'],
    [{arcs: solvedArcs.map((c, i) => i === 0 ? order[1] : c)}, 'an arc centred on its own end'],
    [{arcs: solvedArcs.map((c, i) => i === 0 ? 'Z' : c)}, 'an unknown centre'],
    [{arcs: solvedArcs.map((c, i) => i === 0 ? 3 : c)}, 'a centre that is not a name'],
    [{arcs: 'DEABC'}, 'arcs that are not a list'],
    [null, 'no board'], [[], 'a list for a board']
  ];
  if (nonJoin) forged.push([{arcs: solvedArcs.map((c, i) => i === 0 ? nonJoin : c)}, 'a centre that misses']);
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return {shapes: full.shapes, least: Number(full.least.toFixed(1)), miss: Number(miss.toFixed(1)), hintSteps: Math.max(...steps), sides: sidesOf(E, order)};
}

// A hard puzzle: one corner missing, and spots where it might go.
function checkPlace(p) {
  const q = p.parameters, order = q.order, n = order.length, X = q.open, spots = Object.keys(q.spots), right = p.solution.corner;
  const [letters, answer, level, open] = TABLE[p.id];
  assert.equal(order.join(''), letters, `${p.id}: corners as in the table`);
  assert.equal(p.difficulty_level, level, `${p.id}: level`);
  assert.equal(X, open, `${p.id}: the missing corner`);
  assert.deepEqual(p.solution.arcs, [...answer], `${p.id}: the witness arcs are the table's answer`);
  assert.ok(n === 5 && !q.corners[X] && Object.keys(q.corners).length === 4 && !q.pins, `${p.id}: four corners given, no dots`);
  assert.ok(spots.length >= 4 && spots.length <= 8 && spots.includes(right), `${p.id}: a handful of spots, the witness among them`);
  const {s} = layoutOf(p), at = k => order[(order.indexOf(X) + k + n) % n], c1 = at(2), c2 = at(3);
  const Efix = exact(q), w2 = Efix.d2(at(-1), c1), w = Math.sqrt(Efix.K.num(w2));
  // The three star diagonals that do not touch X are already equal.
  for (const [u, v] of [[at(1), c2], [at(-1), at(1)]]) assert.ok(Efix.K.zero(Efix.K.sub(Efix.d2(u, v), w2)), `${p.id}: star diagonal ${u}${v} given`);
  const snugAll = [], report = {};
  let apart = Infinity, miss = Infinity, sides = null;
  for (const spot of spots) {
    const E = exact(q, spot), ids = [...order];
    cornersOf(p, E, order, ` (${X} on ${spot})`);
    const joins = joinsOf(E, order, ids);
    joins.forEach((list, i) => assert.deepEqual([...list].sort(), [...exactOf(p, spot).gaps[i].joins].sort(), `${p.id}: on ${spot}, gap ${i} centres agree with the mechanic`));
    const onBoth = E.K.zero(E.K.sub(E.d2(X, c1), w2)) && E.K.zero(E.K.sub(E.d2(X, c2), w2));
    assert.equal(onBoth, spot === right, `${p.id}: ${spot} is the width from ${c1} and ${c2} exactly when it is the witness`);
    if (spot === right) { assert.ok(starEqual(p, E, order, w2), `${p.id}: equal star diagonals with ${X} on ${spot}`); sides = sidesOf(E, order); }
    const full = eachFull(p, E, order, joins, s, arcs => ({corner: spot, arcs}), w);
    full.snug.forEach(arcs => snugAll.push(`${spot}:${arcs}`));
    if (spot !== right) assert.ok(full.shapes === 0 || full.least >= WOBBLE_PX, `${p.id}: any full shape on ${spot} wobbles visibly`);
    miss = Math.min(miss, missOf(E, order, joins, ids, s));
    // The evidence against a wrong spot: arcs whose corner across misses.
    const arcsOfX = order.map((_, i) => i).filter(i => order[i] === X || order[(i + 1) % n] === X || answer[i] === X);
    const fails = arcsOfX.filter(i => !joins[i].includes(answer[i]));
    if (spot !== right) assert.ok(fails.length >= 1, `${p.id}: some arc misses on ${spot}`);
    report[spot] = spot === right ? 'snug' : {missing: fails.map(i => `${order[i]}${order[(i + 1) % n]} on ${answer[i]}`), fullShapes: full.shapes, tapsToReject: arcsOfX.length - fails.length + 1};
    const E2 = exact(q, spot);
    apart = Math.min(apart, apartOf(E2, [...order.filter(id => id !== X), ...spots.filter(t => t !== spot), X], s));
  }
  assert.deepEqual(snugAll, [`${right}:${answer.split('').join(',')}`], `${p.id}: exactly one spot and one set of arcs make a snug shape, the witness`);
  assert.ok(miss >= MISS_PX, `${p.id}: every miss shows by at least ${MISS_PX} px (${miss.toFixed(1)})`);
  assert.ok(apart >= APART_PX, `${p.id}: corners and spots at least ${APART_PX} px apart (${apart.toFixed(1)})`);

  // Play.
  const fresh = freshAttempt(p);
  assert.deepEqual(Object.keys(fresh.board).sort(), ['arcs', 'corner'], `${p.id}: the save is {corner, arcs}`);
  assert.equal(fresh.board.corner, null, `${p.id}: the corner starts off the board`);
  answer.split('').forEach((c, i) => { const touches = order[i] === X || order[(i + 1) % n] === X || c === X; assert.equal(fresh.board.arcs[i], touches ? null : c, `${p.id}: arc ${i} at the start`); });
  assert.equal(validBoard(p, fresh.board), true, `${p.id}: fresh board is valid`);
  assert.equal(isSolved(p, fresh.board), false, `${p.id}: not solved at the start`);
  let a = play(p, fresh, {type: 'corner', at: right});
  answer.split('').forEach((c, i) => { if (a.board.arcs[i] !== c) a = play(p, a, {type: 'arc', gap: i, at: c}); });
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  assert.ok(!spots.some(t => p.hints[0].includes(q.names[t])), `${p.id}: the first hint names no spot`);
  const steps = [hintsSolve(p, fresh, 'from fresh')];
  for (const spot of spots.filter(t => t !== right)) {
    // A wrong spot, then every arc its corner across can draw there.
    let b = play(p, fresh, {type: 'corner', at: spot});
    steps.push(hintsSolve(p, b, `after ${spot}`));
    exactOf(p, spot).gaps.forEach((gap, i) => { if (gap.joins.includes(answer[i]) && b.board.arcs[i] !== answer[i]) b = play(p, b, {type: 'arc', gap: i, at: answer[i]}); });
    steps.push(hintsSolve(p, b, `after ${spot} and its arcs`));
    // Moving the corner takes away the arcs that touch it, and Undo would bring them back.
    const moved = play(p, b, {type: 'corner', at: right});
    moved.board.arcs.forEach((c, i) => { if (order[i] === X || order[(i + 1) % n] === X || answer[i] === X) assert.equal(c, null, `${p.id}: moving ${X} clears arc ${i}`); });
  }
  // Illegal moves.
  refuse(p, fresh, {type: 'corner', at: 'Z'}, 'an unknown spot');
  refuse(p, fresh, {type: 'corner', at: order[0] === X ? order[1] : order[0]}, 'a corner name for a spot');
  refuse(p, fresh, {type: 'corner'}, 'no spot');
  refuse(p, play(p, fresh, {type: 'corner', at: right}), {type: 'corner', at: right}, 'the spot the corner is on');
  const gx = order.indexOf(X), gAcross = answer.indexOf(X);
  refuse(p, fresh, {type: 'arc', gap: gx, at: answer[gx]}, 'an arc to the missing corner before it is placed');
  refuse(p, fresh, {type: 'arc', gap: gAcross, at: X}, 'an arc centred on the missing corner before it is placed');
  refuse(p, play(p, fresh, {type: 'corner', at: right}), {type: 'arc', gap: gAcross, at: right}, 'a spot as a centre');
  refuse(p, fresh, {type: 'shape', shape: 1}, 'a playground move');
  // Forged saves.
  const wrong = spots.find(t => t !== right);
  for (const [board, why] of [
    [{corner: right, arcs: [...answer], done: true}, 'a forged done beside the witness'],
    [{arcs: [...answer]}, 'arcs without the corner'],
    [{corner: 'Z', arcs: fresh.board.arcs}, 'an unknown spot'],
    [{corner: X, arcs: fresh.board.arcs}, 'a corner name for the spot'],
    [{corner: 3, arcs: fresh.board.arcs}, 'a spot that is not a name'],
    [{corner: null, arcs: [...answer]}, 'arcs to a corner not placed'],
    [{corner: wrong, arcs: [...answer]}, 'the witness arcs on a wrong spot'],
    [{corner: right, arcs: answer.split('').slice(1)}, 'too few arcs'],
    [{corner: right, arcs: answer.split('').map((c, i) => i === gAcross ? right : c)}, 'a spot as a centre'],
    [null, 'no board']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  // The cost of a blind sweep: every spot tried, each wrong one until a compass misses.
  const wrongs = spots.filter(t => t !== right);
  const sweep = {spots: spots.length, spinsOnWrongSpots: wrongs.reduce((k, t) => k + report[t].fullShapes, 0), worstTaps: wrongs.reduce((k, t) => k + 1 + report[t].tapsToReject, 0) + 1 + 3};
  return {spot: right, apart: Number(apart.toFixed(1)), miss: Number(miss.toFixed(1)), hintSteps: Math.max(...steps), spots: report, sweep, sides};
}

function checkPlayground(p) {
  const m = mechanicFor(p), q = p.parameters;
  assert.equal(m.noHint(p), true, `${p.id}: no Hint`);
  const fresh = freshAttempt(p);
  assert.deepEqual(fresh.board, {shape: 0});
  assert.equal(isSolved(p, fresh.board), false, `${p.id}: never solved`);
  let a = fresh;
  for (let k = 1; k < q.shapes.length; k++) { a = play(p, a, {type: 'shape', shape: k}); assert.equal(isSolved(p, a.board), false); }
  refuse(p, a, {type: 'shape', shape: a.board.shape}, 'the same shape');
  refuse(p, a, {type: 'shape', shape: q.shapes.length}, 'a shape past the list');
  refuse(p, a, {type: 'arc', gap: 0, at: 'A'}, 'an arc in the playground');
  for (const [board, why] of [[{shape: -1}, 'a negative shape'], [{shape: 1.5}, 'a fractional shape'], [{shape: 0, done: true}, 'a forged done'], [{arcs: []}, 'a puzzle board']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  // Constant width, by sampling, as the notes say.
  const out = {};
  for (const sh of q.shapes) {
    let pts;
    if (sh.ellipse) pts = Array.from({length: 4000}, (_, k) => { const t = 2 * Math.PI * k / 4000; return [sh.ellipse[0] * Math.cos(t), sh.ellipse[1] * Math.sin(t)]; });
    else { const ids = sh.corners.map((_, i) => String(i)), pos = id => sh.corners[Number(id)]; pts = sh.centres ? boundary(c => typeof c === 'string' ? pos(c) : c, ids, sh.centres) : sh.corners; }
    const {lo, hi, range} = wobble(pts);
    out[sh.name] = [Number(lo.toFixed(3)), Number(hi.toFixed(3))];
    const constant = ['Disk', 'Curved triangle', 'Curved pentagon', 'Lopsided curved pentagon'].includes(sh.name);
    if (constant) assert.ok(range < 0.02, `${p.id}: ${sh.name} has constant width (${range})`);
    else assert.ok(range > 5, `${p.id}: ${sh.name} does not (${range})`);
    assert.ok(Math.abs(hi - 60) < 0.05 || sh.name === 'Oval' || sh.name === 'Square' || sh.name === 'Triangle', `${p.id}: ${sh.name} is 60 wide`);
  }
  // The worksheet's numbers: square 60 to 60√2, triangle 30√3 to 60, oval 40 to 60.
  assert.ok(Math.abs(out.Square[0] - 60) < 0.05 && Math.abs(out.Square[1] - 60 * Math.SQRT2) < 0.05, 'square 60 to 60√2');
  assert.ok(Math.abs(out.Triangle[0] - 30 * Math.sqrt(3)) < 0.05 && Math.abs(out.Triangle[1] - 60) < 0.05, 'triangle 30√3 to 60');
  assert.ok(Math.abs(out.Oval[0] - 40) < 0.05 && Math.abs(out.Oval[1] - 60) < 0.05, 'oval 40 to 60');
  return out;
}

export async function validateWidth() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/width/width.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-59')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-59.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'width');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const p of pack.puzzles) {
    assert.ok(p.id.startsWith('width-') && p.mechanic === 'width', `${p.id}: id and mechanic`);
    assert.ok(typeof p.title === 'string' && p.title.length > 2, `${p.id}: title`);
    for (const field of ['objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 10, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && Array.isArray(p.hints) && p.hints.length, `${p.id}: rules and hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent?.[field], `${p.id}: parent ${field}`);
    assert.ok(Array.isArray(p.parent.sourceIds) && p.parent.sourceIds.length && p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: parent sources`);
    assert.ok(p.visibleObjective.length < 80, `${p.id}: one short objective at most`);
    assert.match(p.controls, /^A shape’s width is the gap between two parallel rails/, `${p.id}: How to play opens with the mathematics`);
    assert.ok(!/across from|opposite corner|third corner/i.test(`${p.title} ${p.visibleObjective} ${p.controls} ${p.hints[0]}`), `${p.id}: no answer in the title, How to play or first hint`);
  }
  const report = {};
  for (const p of puzzles) report[p.id] = checkPuzzle(p);
  // No two puzzles share a shape, except the build-and-repair pairs on the
  // equilateral triangle (the only curved triangle) and the regular pentagon.
  const shapeKey = sides => { const r = sides.map(x => x / Math.max(...sides)), keys = []; for (let k = 0; k < r.length; k++) for (const seq of [r, [...r].reverse()]) keys.push(seq.slice(k).concat(seq.slice(0, k)).map(x => x.toFixed(4)).join(',')); return keys.sort()[0]; };
  const byShape = new Map();
  for (const p of puzzles) { const key = shapeKey(report[p.id].sides); byShape.set(key, [...(byShape.get(key) || []), p.id]); delete report[p.id].sides; }
  assert.deepEqual([...byShape.values()].filter(ids => ids.length > 1), [['width-01', 'width-02'], ['width-03', 'width-04']], 'only the triangle and the regular pentagon are used twice (a build and a repair)');
  const playground = pack.puzzles.find(p => p.band === 'playground');
  assert.ok(playground && playground.parameters.mode === 'playground', 'a playground');
  report[playground.id] = checkPlayground(playground);
  return report;
}
export default validateWidth;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateWidth(), null, 2));
