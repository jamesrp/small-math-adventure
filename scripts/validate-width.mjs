// Checks the Snug spinners pack (dist/families/width/width.json) without the
// mechanic's own arithmetic: its own exact numbers a + b√r (BigInt fractions)
// for the corners and dots, convexity and equal star diagonals, which points
// may centre which gap; then, for every full shape the child can make, the
// width measured a different way (the shape's boundary sampled densely and
// projected, not the support function), so that the shapes of constant width
// are exactly the mechanic's solves and exactly the solution witness, and
// every other one wobbles visibly. Also: every compass miss is visible,
// corners and dots are far enough apart to tap, hints alone solve from fresh
// and after every wrong first move, illegal moves are refused, forged saves
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
function exact(params) {
  const K = Field(params.field.r), tx = K.read(params.field.tx), ty = K.read(params.field.ty);
  const pts = {...params.corners, ...(params.pins || {})};
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
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 20; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}

// The table in docs/width/README.md: corner letters in order, and the answer.
const TABLE = {
  'width-01': ['ABC', 'CAB', 'easy'],
  'width-02': ['ABC', 'CAB', 'easy'],
  'width-03': ['ABCDE', 'DEABC', 'easy'],
  'width-04': ['ABCDE', 'DEABC', 'medium'],
  'width-05': ['BEADC', 'DCBEA', 'medium'],
  'width-06': ['DACEB', 'EBDAC', 'medium'],
  'width-07': ['CEBAD', 'ADCEB', 'hard'],
  'width-08': ['EBDCA', 'CAEBD', 'hard'],
  'width-09': ['ADCEB', 'EBADC', 'hard']
};
const WOBBLE_PX = 8, MISS_PX = 6, APART_PX = 30;

function checkPuzzle(p) {
  const q = p.parameters, E = exact(q), order = q.order, n = order.length, k = (n - 1) / 2;
  const [letters, answer, level] = TABLE[p.id];
  assert.equal(order.join(''), letters, `${p.id}: corners as in the table`);
  assert.equal(p.difficulty_level, level, `${p.id}: level`);
  assert.deepEqual(p.solution.arcs, [...answer], `${p.id}: the witness is the table's answer`);
  assert.ok(n % 2 === 1 && n >= 3, `${p.id}: an odd number of corners`);
  // A convex polygon, counterclockwise: every other corner strictly left of each side.
  for (let i = 0; i < n; i++) for (const id of order) if (id !== order[i] && id !== order[(i + 1) % n]) assert.equal(E.cross(order[i], order[(i + 1) % n], id), 1, `${p.id}: convex at ${order[i]}${order[(i + 1) % n]}`);
  // Equal star diagonals: each corner to the two corners k and k + 1 on.
  const w2 = E.d2(order[0], order[k]);
  for (let i = 0; i < n; i++) for (const j of [k, k + 1]) assert.ok(E.K.zero(E.K.sub(E.d2(order[i], order[(i + j) % n]), w2)), `${p.id}: star diagonal ${order[i]}${order[(i + j) % n]}`);
  // Which points may centre which gap (exactly as far from both ends).
  const joins = order.map((a, i) => { const b = order[(i + 1) % n]; return E.ids.filter(c => c !== a && c !== b && E.K.zero(E.K.sub(E.d2(c, a), E.d2(c, b)))); });
  joins.forEach((list, i) => assert.deepEqual([...list].sort(), [...exactOf(p).gaps[i].joins].sort(), `${p.id}: gap ${i} centres agree with the mechanic`));
  // Every centre on the inner side of its gap or on its line, so arcs bulge out.
  joins.forEach((list, i) => list.forEach(c => assert.ok(E.cross(order[i], order[(i + 1) % n], c) >= 0, `${p.id}: ${c} inside for gap ${i}`)));
  // Every full shape: the sampled width is constant exactly for the witness.
  const {s} = layoutOf(p), w = Math.sqrt(E.K.num(w2) * 1), snug = [];
  let least = Infinity, shapes = 0;
  const each = (i, arcs) => {
    if (i === n) {
      shapes++;
      const {range, drift} = wobble(boundary(E.pos, order, arcs), 720, Math.PI / 2 - (q.turn || 0) * Math.PI / 180);
      const solved = mechanicFor(p).solved(p, {arcs});
      if (range < 1e-4 * w) { snug.push(arcs.join(',')); assert.ok(solved, `${p.id}: ${arcs} has constant width, so it is a solve`); }
      else { assert.ok(!solved, `${p.id}: ${arcs} wobbles, so it is not a solve`); least = Math.min(least, drift * s); }
      return;
    }
    for (const c of joins[i]) each(i + 1, [...arcs, c]);
  };
  each(0, []);
  assert.deepEqual(snug, [answer.split('').join(',')], `${p.id}: exactly one full shape has constant width, the witness`);
  assert.ok(least >= WOBBLE_PX, `${p.id}: every other full shape's top rail moves at least ${WOBBLE_PX} px from where it started (${least.toFixed(1)})`);
  // Every miss is visible: a circle round a point through one end passes the other by enough.
  let miss = Infinity;
  order.forEach((a, i) => { const b = order[(i + 1) % n]; for (const c of E.ids) if (c !== a && c !== b && !joins[i].includes(c)) { const [A, B, C] = [a, b, c].map(E.pos); miss = Math.min(miss, Math.abs(Math.hypot(C[0] - A[0], C[1] - A[1]) - Math.hypot(C[0] - B[0], C[1] - B[1])) * s); } });
  assert.ok(miss >= MISS_PX, `${p.id}: every miss shows by at least ${MISS_PX} px (${miss.toFixed(1)})`);
  // Points far enough apart to tap.
  let apart = Infinity;
  E.ids.forEach((u, i) => E.ids.slice(i + 1).forEach(v => { const [P, Q] = [u, v].map(E.pos); apart = Math.min(apart, Math.hypot(P[0] - Q[0], P[1] - Q[1]) * s); }));
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
  refuse(p, fresh, {type: 'clear', gap: 0}, 'an unknown move');
  if (fresh.board.arcs[0]) refuse(p, fresh, {type: 'arc', gap: 0, at: fresh.board.arcs[0]}, 'the centre the arc already has');
  // Forged saves.
  const solvedArcs = [...answer];
  const forged = [
    [{arcs: solvedArcs, done: true}, 'a forged done beside the arcs'],
    [{arcs: fresh.board.arcs, done: true}, 'a forged done on the start'],
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
  return {shapes, least: Number(least.toFixed(1)), miss: Number(miss.toFixed(1)), hintSteps: Math.max(...steps)};
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
  const playground = pack.puzzles.find(p => p.band === 'playground');
  assert.ok(playground && playground.parameters.mode === 'playground', 'a playground');
  report[playground.id] = checkPlayground(playground);
  return report;
}
export default validateWidth;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateWidth(), null, 2));
