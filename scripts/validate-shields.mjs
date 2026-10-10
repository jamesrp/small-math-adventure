// Checks the Portal shields pack (dist/families/shields/shields.json): content
// fields, sources and the copy rules; every answer recomputed by methods unlike
// the mechanic's (shots traced through the room piece by piece in exact
// fractions, every primitive direction up to 16 steps either way instead of
// classes modulo 8, every set of up to four of the room's crosses tried in
// turn instead of a search over the crosses on shots, and two shots tested for a
// common point by intersecting their pieces in the room, translated by whole
// rooms, instead of solving for whole-room differences); the card's finite
// check and the theorem in all three rooms; witnesses played as moves; a
// Fewest or Can't claim and its shots taken freely and judged only at the last
// shot, against the independent answers; hint chains from fresh, after wrong
// shields, inside a wrong claim, after a refused Fewest or Can't, after crossing
// shots, and through the shown taps; Undo keeping refusals; illegal moves;
// forged saves; the playground.
// Run: node scripts/validate-shields.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

const N = 8;
// --- Exact fractions ----------------------------------------------------------
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const F = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return {n: n / g, d: d / g}; };
const add = (x, y) => F(x.n * y.d + y.n * x.d, x.d * y.d);
const sub = (x, y) => F(x.n * y.d - y.n * x.d, x.d * y.d);
const mul = (x, y) => F(x.n * y.n, x.d * y.d);
const div = (x, y) => F(x.n * y.d, x.d * y.n);
const cmp = (x, y) => x.n * y.d - y.n * x.d;
const isInt = x => x.d === 1;
const I = n => F(n);
const ZERO = I(0), ROOM = I(N);
const modN = n => ((n % N) + N) % N;

// --- A shot traced through the room ------------------------------------------
// From S at the room's corner, piece by piece: each piece runs from where the
// shot is to the edge it leaves by; there it comes back in at the opposite
// edge. Lattice crosses on a piece are found by stepping the whole-number
// x (or y) values along it. The shot stops at the first T (or, with no T, the
// first return to S). Returns its pieces (room coordinates, fractions), the
// crosses it passes in order, and its length as a multiple of [a, b].
const traces = new Map();
function trace(T, [a, b]) {
  const key = `${T}|${a},${b}`;
  if (traces.has(key)) return traces.get(key);
  let x = ZERO, y = ZERO, s = ZERO;
  const pieces = [], crosses = [];
  let end = null;
  for (let guard = 0; guard < 200 && !end; guard++) {
    // Come back in through the opposite edge.
    if (a < 0 && cmp(x, ZERO) === 0) x = ROOM;
    if (a > 0 && cmp(x, ROOM) === 0) x = ZERO;
    if (b < 0 && cmp(y, ZERO) === 0) y = ROOM;
    if (b > 0 && cmp(y, ROOM) === 0) y = ZERO;
    const out = [];
    if (a) out.push(div(sub(a > 0 ? ROOM : ZERO, x), I(a)));
    if (b) out.push(div(sub(b > 0 ? ROOM : ZERO, y), I(b)));
    const len = out.reduce((m, v) => cmp(v, m) < 0 ? v : m);
    const x1 = add(x, mul(len, I(a))), y1 = add(y, mul(len, I(b)));
    // Lattice points strictly after the piece's start, up to its end.
    const found = [];
    if (a) {
      const lo = Math.min(x.n / x.d, x1.n / x1.d), hi = Math.max(x.n / x.d, x1.n / x1.d);
      for (let X = Math.ceil(lo); X <= Math.floor(hi); X++) {
        const t = div(sub(I(X), x), I(a)), Y = add(y, mul(t, I(b)));
        if (cmp(t, ZERO) > 0 && isInt(Y)) found.push({t, X, Y: Y.n});
      }
    } else if (isInt(x)) {
      const lo = Math.min(y.n / y.d, y1.n / y1.d), hi = Math.max(y.n / y.d, y1.n / y1.d);
      for (let Y = Math.ceil(lo); Y <= Math.floor(hi); Y++) {
        const t = div(sub(I(Y), y), I(b));
        if (cmp(t, ZERO) > 0) found.push({t, X: x.n, Y});
      }
    }
    found.sort((p, q) => cmp(p.t, q.t));
    let stopAt = len;
    for (const pt of found) {
      const c = [modN(pt.X), modN(pt.Y)];
      if (T && c[0] === T[0] && c[1] === T[1]) { end = 'T'; stopAt = pt.t; break; }
      if (!c[0] && !c[1]) { end = 'S'; stopAt = pt.t; break; }
      crosses.push(`${c[0]},${c[1]}`);
    }
    const ex = add(x, mul(stopAt, I(a))), ey = add(y, mul(stopAt, I(b)));
    pieces.push([[x, y], [ex, ey]]);
    s = add(s, stopAt);
    [x, y] = [ex, ey];
  }
  assert.ok(end, `shot ${a},${b} stops`);
  // With [a, b] primitive the length is a whole number of steps of [a, b].
  assert.ok(isInt(s), `shot ${a},${b} ends at a lattice point`);
  const out = {pieces, crosses, end, length: s.n, plane: [s.n * a, s.n * b]};
  traces.set(key, out);
  return out;
}
const primitive = ([a, b]) => (a || b) && gcd(a, b) === 1;
// Every direction with both parts at most R, kept when it is a shot of the
// room (reaches T first; with no T, comes back to S).
function directions(T, R = 16) {
  const out = [];
  for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) if (primitive([a, b]) && trace(T, [a, b]).end === (T ? 'T' : 'S')) out.push([a, b]);
  return out;
}

// --- Fewest shields over every set of crosses --------------------------------
// Crosses are numbered 8i + j, and each shot becomes the set of numbers it
// passes. Every set of 1, 2, 3, then 4 of the room's crosses is tried.
const num = k => { const [i, j] = k.split(',').map(Number); return 8 * i + j; };
const fewestMemo = new Map();
function fewestByMask(T, shots) {
  const key = JSON.stringify([T, shots]);
  if (!fewestMemo.has(key)) fewestMemo.set(key, fewestOver(T, shots));
  return fewestMemo.get(key);
}
function fewestOver(T, shots) {
  const sets = [...new Map(shots.map(d => { const c = trace(T, d).crosses.map(num); return [c.slice().sort((x, y) => x - y).join(), new Set(c)]; })).values()];
  const cells = [];
  for (let n = 0; n < 64; n++) { const [i, j] = [n >> 3, n & 7]; if ((i || j) && !(T && i === T[0] && j === T[1])) cells.push(n); }
  for (let k = 1; k <= 4; k++) {
    const found = [], pick = [];
    const rec = start => {
      if (pick.length === k) { if (sets.every(s => pick.some(n => s.has(n)))) found.push(pick.map(n => [n >> 3, n & 7])); return; }
      for (let i = start; i < cells.length; i++) { pick.push(cells[i]); rec(i + 1); pick.pop(); }
    };
    rec(0);
    if (found.length) return {k, sets: found};
  }
  return {k: Infinity, sets: []};
}
const blocks = (T, shots, shields) => { const have = new Set(shields.map(([i, j]) => `${i},${j}`)); return shots.every(d => trace(T, d).crosses.some(c => have.has(c))); };

// --- Do two shots share a point other than S and T? ---------------------------
// Intersect every piece of one with every piece of the other moved by whole
// rooms (so a point on an edge meets its copy on the opposite edge), exactly.
function sharePoint(T, d1, d2) {
  const P = trace(T, d1).pieces, Q = trace(T, d2).pieces;
  const fixed = ([x, y]) => isInt(x) && isInt(y) && ((!modN(x.n) && !modN(y.n)) || (T && modN(x.n) === T[0] && modN(y.n) === T[1]));
  for (const [p0, p1] of P) for (const [q0r, q1r] of Q) for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
    const q0 = [add(q0r[0], I(dx)), add(q0r[1], I(dy))], q1 = [add(q1r[0], I(dx)), add(q1r[1], I(dy))];
    const r = [sub(p1[0], p0[0]), sub(p1[1], p0[1])], s = [sub(q1[0], q0[0]), sub(q1[1], q0[1])];
    const cross = (u, v) => sub(mul(u[0], v[1]), mul(u[1], v[0]));
    const den = cross(r, s), w = [sub(q0[0], p0[0]), sub(q0[1], p0[1])];
    const inUnit = t => cmp(t, ZERO) >= 0 && cmp(t, I(1)) <= 0;
    if (den.n !== 0) {
      const t = div(cross(w, s), den), u = div(cross(w, r), den);
      if (inUnit(t) && inUnit(u)) { const pt = [add(p0[0], mul(t, r[0])), add(p0[1], mul(t, r[1]))]; if (!fixed(pt)) return true; }
    } else if (cross(w, r).n === 0) {
      // On one line: project onto r and look at the overlap.
      const rr = add(mul(r[0], r[0]), mul(r[1], r[1]));
      const proj = v => div(add(mul(v[0], r[0]), mul(v[1], r[1])), rr);
      const t0 = proj(w), t1 = proj([sub(q1[0], p0[0]), sub(q1[1], p0[1])]);
      const lo = cmp(t0, t1) < 0 ? t0 : t1, hi = cmp(t0, t1) < 0 ? t1 : t0;
      const a = cmp(lo, ZERO) > 0 ? lo : ZERO, b = cmp(hi, I(1)) < 0 ? hi : I(1);
      if (cmp(a, b) < 0) return true;
      if (cmp(a, b) === 0) { const pt = [add(p0[0], mul(a, r[0])), add(p0[1], mul(a, r[1]))]; if (!fixed(pt)) return true; }
    }
  }
  return false;
}
const disjoint = (T, list) => list.every((d, x) => list.every((e, y) => y <= x || !sharePoint(T, d, e)));
// The largest set of the given shots, pairwise sharing only S and T.
function packing(T, shots) {
  let best = [];
  const rec = (start, chosen) => {
    if (chosen.length > best.length) best = chosen.slice();
    for (let i = start; i < shots.length; i++) if (chosen.every(d => !sharePoint(T, d, shots[i]))) { chosen.push(shots[i]); rec(i + 1, chosen); chosen.pop(); }
  };
  rec(0, []);
  return best;
}

// --- The table in docs/shields/README.md --------------------------------------
const C = [4, 4], E = [4, 0];
const CORNERS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
const TABLE = {
  'shields-01': {level: 'easy', mode: 'fewest', T: C, fewest: 2, arrangements: 6},
  'shields-02': {level: 'easy', mode: 'fewest', T: C, fewest: 4, arrangements: 81},
  'shields-03': {level: 'easy', mode: 'fewest', T: C, fewest: 2, arrangements: 2},
  'shields-04': {level: 'easy', mode: 'fewest', T: C, fewest: 4, arrangements: 9},
  'shields-05': {level: 'medium', mode: 'fewest', T: C, fewest: 3, arrangements: 21},
  'shields-06': {level: 'medium', mode: 'budget', T: C, fewest: 4, arrangements: 1, budget: 4, only: [[2, 2], [2, 6], [6, 2], [6, 6]]},
  'shields-07': {level: 'medium', mode: 'budget', T: C, fewest: 4, budget: 3, cant: true},
  'shields-08': {level: 'hard', mode: 'fewest', T: null, fewest: 2, arrangements: 1, only: [[4, 0], [4, 4]]},
  'shields-09': {level: 'hard', mode: 'fewest', T: null, fewest: 3, arrangements: 1, only: [[0, 4], [4, 0], [4, 4]]},
  'shields-10': {level: 'hard', mode: 'fewest', T: E, fewest: 4, arrangements: 1, only: [[2, 0], [2, 4], [6, 0], [6, 4]]}
};
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// The app's Undo (dist/main.js): the engine's undo, then the mechanic's carry.
const undoApp = (p, a) => { const next = undo(a); return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
// A move by tapping what the board shows: the hinted point must be drawn as
// an acting control in its view.
function shownTap(p, a, action) {
  const html = mechanicFor(p).render(p, {...a, hintLevel: 0});
  if (action.type === 'shield') return html.includes(`data-pb-point="o,${action.at[0]},${action.at[1]}" data-pb-view="room" role="button"`);
  if (action.type === 'pick') return html.includes(`data-pb-point="${action.at[0]},${action.at[1]}" data-pb-view="plane" role="button"`);
  return new RegExp(`data-move="${action.type === 'fewest' ? '\\{&quot;type&quot;:&quot;fewest&quot;\\}' : '\\{&quot;type&quot;:&quot;cant&quot;\\}'}"[^>]*aria-pressed="[a-z]+" >`).test(html);
}
// Follow the hints to a solve, each through a control the board shows.
// Each hint is timed after one untimed call has warmed the caches, against a
// generous limit, so a loaded machine does not fail the run.
function hintsSolve(p, a, label) {
  let n = 0;
  nextHint(p, a);
  for (; !isSolved(p, a.board) && n < 60; n++) {
    const t0 = performance.now(), h = nextHint(p, a), dt = performance.now() - t0;
    assert.ok(dt < 250, `${p.id} ${label}: a quick hint (${dt.toFixed(1)} ms)`);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(h.text && h.text.length < 200, `${p.id} ${label}: a short hint`);
    assert.ok(shownTap(p, a, h.action), `${p.id} ${label}: the hinted ${h.action.type} is on the board`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return n;
}
// The unrolled view's part of a rendered board.
const planeOf = html => html.slice(html.indexOf('data-pb-view-board="plane"'));
const withShields = (p, a, list) => list.reduce((b, at) => play(p, b, {type: 'shield', at}), a);
const keyOf = ([i, j]) => `${i},${j}`;
const dirOf = ([u, v]) => { const g = gcd(u, v); return [u / g, v / g]; };
// The copies the board lets a child tap in a claim, in page order, and the
// number of shots the claim's prompt asks for.
function shownCopies(p, a) {
  const html = mechanicFor(p).render(p, {...a, hintLevel: 0});
  const shown = [...html.matchAll(/data-pb-point="(-?\d+),(-?\d+)" data-pb-view="plane" role="button"/g)].map(m => [Number(m[1]), Number(m[2])]);
  const ask = html.match(/class="sh-prompt">Tap (\d+) shots/);
  return {shown, need: ask ? Number(ask[1]) : 0, html};
}
// The first two of the chosen shots, in the order chosen, that share a point.
const firstClash = (T, list) => { for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) if (sharePoint(T, list[x], list[y])) return [list[x], list[y]]; return null; };
// Tap copies in turn: every tap before the last is taken as it is, untold.
function tapAll(p, a, list) {
  for (const at of list.slice(0, -1)) {
    a = play(p, a, {type: 'pick', at});
    assert.equal(a.board.note, null, `${p.id}: a shot before the last is not judged`);
    assert.ok(!isSolved(p, a.board));
  }
  return play(p, a, {type: 'pick', at: list.at(-1)});
}

export async function validateShields() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/shields/shields.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-70')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-70.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'shields');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // The theorems, over every direction up to 16 steps either way.
  const theorems = {};
  for (const [name, T, mids, packs] of [['centre', C, [[2, 2], [2, 6], [6, 2], [6, 6]], CORNERS], ['none', null, [[0, 4], [4, 0], [4, 4]], [[1, 0], [0, 1], [1, 1]]], ['edge', E, [[2, 0], [2, 4], [6, 0], [6, 4]], [[1, 0], [-1, 0], [1, 2], [-1, 2]]]]) {
    const shots = directions(T);
    // The halfway point of every shot is one of the halfway crosses.
    for (const d of shots) { const L = trace(T, d).length; assert.equal(L % 2, 0); const h = [modN(d[0] * L / 2), modN(d[1] * L / 2)]; assert.ok(mids.some(m => keyOf(m) === keyOf(h)), `${name}: ${d} is halfway at a halfway cross`); assert.ok(trace(T, d).crosses.includes(keyOf(h))); }
    assert.ok(blocks(T, shots, mids), `${name}: the halfway crosses stop every shot`);
    const best = fewestByMask(T, shots);
    assert.equal(best.k, mids.length, `${name}: fewest`);
    assert.deepEqual(best.sets.map(s => s.map(keyOf).sort()), [mids.map(keyOf).sort()], `${name}: only the halfway crosses`);
    assert.ok(disjoint(T, packs), `${name}: the packing shots share only S${T ? ' and T' : ''}`);
    theorems[name] = {shots: shots.length, fewest: best.k};
  }
  // The card's finite check: the corner shots and the shots to (2, 6), (6, 2),
  // (6, −2) and (10, 2) in the worksheet's room leave only the midpoints.
  const cardShots = [...CORNERS, [1, 3], [3, 1], [3, -1], [5, 1]];
  for (const d of cardShots) assert.equal(trace(C, d).end, 'T');
  assert.deepEqual(fewestByMask(C, cardShots).sets.map(s => s.map(keyOf).sort()), [['2,2', '2,6', '6,2', '6,6']], 'the card’s finite check');

  const M = mechanicFor(pack.puzzles[0]);
  let hintSteps = 0, setsTried = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'shields');
    assert.ok(p.id.startsWith('shields-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok((p.visibleObjective.match(/[.?!]/g) || []).length <= 1, `${p.id}: at most one sentence on the board`);
    assert.ok(!/where does|where will|predict|which copy/i.test(p.visibleObjective + p.objective), `${p.id}: no prediction quiz`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p) === M, `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    assert.equal(nextHint(p, fresh).type, q.mode === 'playground' ? 'done' : 'move', `${p.id}: a first hint`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }

    const row = TABLE[p.id];
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    assert.deepEqual(q.T, row.T, `${p.id}: the room`);
    assert.deepEqual(q.room, {squares: {o: [0, 0]}, right: {o: 'o'}, up: {o: 'o'}, n: N, lattice: 'crosses'}, `${p.id}: one square glued to itself`);
    const T = q.T, shots = q.shots || directions(T);
    for (const d of q.shots || []) assert.equal(trace(T, d).end, T ? 'T' : 'S', `${p.id}: ${d} is a shot`);
    // The answer, by bitmask over every cross.
    const best = fewestByMask(T, shots);
    assert.equal(best.k, row.fewest, `${p.id}: fewest`);
    assert.equal(p.solution.fewest, best.k, `${p.id}: solution fewest`);
    if (row.arrangements) assert.equal(best.sets.length, row.arrangements, `${p.id}: arrangements`);
    if (row.arrangements) assert.equal(p.solution.arrangements, best.sets.length);
    if (row.only) assert.deepEqual(best.sets.map(s => s.map(keyOf).sort()), [row.only.map(keyOf).sort()], `${p.id}: the only arrangement`);
    assert.ok(best.sets.some(s => s.map(keyOf).sort().join() === p.solution.witness.map(keyOf).sort().join()), `${p.id}: the witness is a fewest arrangement`);
    // The certificate: shots of the puzzle sharing only S and T, as many as needed.
    const cert = q.certificate;
    assert.equal(cert.length, row.cant ? row.budget + 1 : row.fewest, `${p.id}: certificate size`);
    for (const d of cert) assert.ok(shots.some(e => keyOf(e) === keyOf(d)) || (!q.shots && trace(T, d).end === (T ? 'T' : 'S')), `${p.id}: certificate shot ${d} is a shot of the puzzle`);
    assert.ok(disjoint(T, cert), `${p.id}: the certificate shares only S and T`);
    // No larger packing among the drawn shots (weak duality made exact).
    if (q.shots) assert.equal(packing(T, q.shots).length, best.k, `${p.id}: largest packing of drawn shots`);
    // Budget puzzles say the budget; fewest puzzles show no count.
    if (q.mode === 'budget') {
      assert.equal(q.budget, row.budget);
      assert.ok(p.visibleObjective.includes(String(row.budget)), `${p.id}: the budget is the question`);
    } else {
      assert.ok(!/\d/.test(p.visibleObjective), `${p.id}: no count on the board`);
      assert.ok(!new RegExp(`\\b${WORDS[best.k]}\\b`, 'i').test(p.title), `${p.id}: the title doesn’t name the fewest`);
    }
    assert.ok(!/can[’']t/i.test(p.hints[0]) && !/can[’']t/i.test(p.title), `${p.id}: the first hint and title don’t say Can’t`);
    for (const [i, j] of row.only || []) assert.ok(!p.hints[0].includes(`${i} across, ${j} up`), `${p.id}: the first hint doesn’t place a shield`);

    // Puzzle 4's grown-up extension adds two shots; then only the halfway crosses work.
    if (p.id === 'shields-04') {
      const more = [[3, -1], [5, 1]];
      assert.ok(more.every(([a, b]) => p.parent.extension.includes(`(${a}, ${b < 0 ? '−' + -b : b})`)), `${p.id}: the extension names its shots`);
      assert.deepEqual(fewestByMask(T, [...q.shots, ...more]).sets.map(s => s.map(keyOf).sort()), [row.only ? row.only.map(keyOf) : ['2,2', '2,6', '6,2', '6,6']], `${p.id}: the extension forces the halfway crosses`);
    }
    hintSteps += checkMoves(p, fresh, row, best, shots);
    setsTried += checkRandomSets(p, fresh, row, best, shots);
    checkForgeries(p, fresh, row, best);
  }
  return {shieldPuzzles: puzzles.length, theorems, hintSteps, setsTried};
}

// Every move judged against the independent answers.
function checkMoves(p, fresh, row, best, shots) {
  const q = p.parameters, T = q.T, kind = q.mode === 'fewest' ? 'fewest' : 'cant';
  let n = 0;
  n += hintsSolve(p, fresh, 'from fresh');
  // Illegal moves on a fresh board.
  refuse(p, fresh, {type: 'shield', at: [0, 0]}, 'a shield on S');
  if (T) refuse(p, fresh, {type: 'shield', at: T}, 'a shield on T');
  refuse(p, fresh, {type: 'shield', at: [8, 1]}, 'a shield off the room');
  refuse(p, fresh, {type: 'shield', at: [1.5, 2]}, 'a shield between crosses');
  refuse(p, fresh, {type: 'shield', at: '1,2'}, 'a shield named as text');
  refuse(p, fresh, {type: kind}, `${kind} on an empty board`);
  refuse(p, fresh, {type: kind === 'fewest' ? 'cant' : 'fewest'}, 'the other claim');
  refuse(p, fresh, {type: 'pick', at: trace(T, q.certificate[0]).plane}, 'a shot tapped before a claim');
  refuse(p, fresh, {type: 'room', room: 'none'}, 'a room change outside the playground');
  refuse(p, fresh, {type: 'aim', at: [4, 4]}, 'an aim outside the playground');

  // A stray shield, then hints.
  const stray = play(p, fresh, {type: 'shield', at: [0, 1]});
  n += hintsSolve(p, stray, 'after a stray shield');
  // Toggling a shield off.
  assert.deepEqual(play(p, stray, {type: 'shield', at: [0, 1]}).board.shields, [], `${p.id}: a second tap takes a shield off`);

  const witness = p.solution.witness;
  if (q.mode === 'fewest') {
    // Too many shields: Fewest starts a claim like any other; only its last
    // shot is told “Fewer can do it.”, and that count stays refused, through Undo.
    const extra = [0, 1], big = withShields(p, fresh, [...witness, extra]);
    assert.ok(blocks(T, shots, big.board.shields));
    const over = play(p, big, {type: 'fewest'});
    assert.equal(over.board.claim, 'fewest', `${p.id}: Fewest at a count above the fewest starts a claim`);
    assert.equal(over.board.note, null, `${p.id}: pressing Fewest judges nothing`);
    const {shown, need} = shownCopies(p, over);
    assert.equal(need, Math.min(best.k + 1, shown.length), `${p.id}: one shot per shield`);
    n += hintsSolve(p, over, 'inside a Fewest with too many shields');
    const told = tapAll(p, over, shown.slice(0, need));
    assert.equal(told.board.note, 'fewer', `${p.id}: “Fewer can do it.” at the last shot`);
    assert.equal(told.board.claim, null);
    assert.ok(!isSolved(p, told.board));
    refuse(p, told, {type: 'fewest'}, 'Fewest again at the refused count');
    const back = undoApp(p, told);
    assert.equal(back.board.fewer, best.k + 1, `${p.id}: Undo keeps the refusal`);
    assert.equal(back.board.claim, null, `${p.id}: Undo doesn’t reopen the refused claim`);
    refuse(p, back, {type: 'fewest'}, 'Fewest after Undo at the refused count');
    n += hintsSolve(p, told, 'after a refused Fewest');
    // Fewest while a shot gets through.
    const open = withShields(p, fresh, witness.slice(1));
    assert.ok(!blocks(T, shots, open.board.shields));
    refuse(p, open, {type: 'fewest'}, 'Fewest while a shot gets through');
    // A right Fewest: crosses rest, the picks are judged by the independent crossing test.
    const claim = play(p, withShields(p, fresh, witness), {type: 'fewest'});
    assert.equal(claim.board.claim, 'fewest');
    refuse(p, claim, {type: 'shield', at: [0, 1]}, 'a shield while a claim is open');
    n += checkPicks(p, claim, best.k);
    // Fewest again goes back to the shields.
    assert.equal(play(p, claim, {type: 'fewest'}).board.claim, null);
    // After a solve nothing moves.
    let done = claim;
    for (const d of q.certificate) done = play(p, done, {type: 'pick', at: trace(T, d).plane});
    assert.ok(isSolved(p, done.board), `${p.id}: the certificate solves`);
    refuse(p, done, {type: 'fewest'}, 'Fewest after a solve');
    refuse(p, done, {type: 'shield', at: [0, 1]}, 'a shield after a solve');
  } else if (!row.cant) {
    // A possible budget: Can't starts a claim; its last shot is told “There is
    // a way.”, once and for good, through Undo.
    const tried = play(p, fresh, {type: 'shield', at: [0, 1]});
    const claimed = play(p, tried, {type: 'cant'});
    assert.equal(claimed.board.claim, 'cant', `${p.id}: Can’t starts a claim`);
    assert.equal(claimed.board.note, null, `${p.id}: pressing Can’t judges nothing`);
    const {shown, need} = shownCopies(p, claimed);
    assert.equal(need, row.budget + 1);
    n += hintsSolve(p, claimed, 'inside a wrong Can’t');
    const told = tapAll(p, claimed, shown.slice(0, need));
    assert.equal(told.board.note, 'way', `${p.id}: “There is a way.” at the last shot`);
    assert.equal(told.board.claim, null);
    refuse(p, told, {type: 'cant'}, 'Can’t again');
    const back = undoApp(p, told);
    assert.equal(back.board.way, true, `${p.id}: Undo keeps the refusal`);
    assert.equal(back.board.claim, null, `${p.id}: Undo doesn’t reopen the refused claim`);
    refuse(p, back, {type: 'cant'}, 'Can’t after Undo');
    n += hintsSolve(p, told, 'after a refused Can’t');
    // No more shields than the budget; a full board of the right ones solves.
    const full = withShields(p, fresh, [[0, 1], [0, 2], [0, 3], [1, 0]].slice(0, row.budget));
    refuse(p, full, {type: 'shield', at: [5, 5]}, 'a shield past the budget');
    assert.ok(isSolved(p, withShields(p, fresh, witness).board), `${p.id}: the witness solves`);
  } else {
    // An impossible budget: Can't needs an attempt first; the picks are the proof.
    refuse(p, fresh, {type: 'cant'}, 'Can’t before any shield');
    assert.notEqual(nextHint(p, fresh).action.type, 'cant', `${p.id}: the first hint is not Can’t`);
    for (const set of [[[2, 2], [2, 6], [6, 2]], [[1, 1], [1, 3], [3, 1]]]) assert.ok(!blocks(T, shots, set));
    const claim = play(p, withShields(p, fresh, [[2, 2], [2, 6], [6, 2]]), {type: 'cant'});
    assert.equal(claim.board.claim, 'cant');
    n += checkPicks(p, claim, row.budget + 1);
    const tried = play(p, fresh, {type: 'shield', at: [5, 1]});
    n += hintsSolve(p, tried, 'after one shield');
    const full = withShields(p, fresh, [[0, 1], [0, 2], [0, 3]]);
    refuse(p, full, {type: 'shield', at: [5, 5]}, 'a shield past the budget');
  }
  return n;
}

// In a right claim: every shot that can be tapped is taken, crossing or not,
// until the last; the last is judged by the independent crossing test, and
// two that cross are named and every shot cleared, for good through Undo;
// hints solve from crossing shots and from a dead end of shots.
function checkPicks(p, claim, need) {
  const q = p.parameters, T = q.T;
  const {shown, need: asked} = shownCopies(p, claim);
  assert.equal(asked, need, `${p.id}: the claim asks for ${need} shots`);
  assert.ok(shown.length >= need, `${p.id}: enough shots to tap`);
  if (q.shots) assert.deepEqual(shown.map(keyOf).sort(), q.shots.map(d => keyOf(trace(T, d).plane)).sort(), `${p.id}: exactly the drawn shots can be tapped`);
  // The certificate's ends are on the board.
  for (const d of q.certificate) assert.ok(shown.some(at => keyOf(at) === keyOf(trace(T, d).plane)), `${p.id}: ${d} can be tapped`);
  // Each tapped copy names the first-T shot along it.
  for (const at of shown) { const d = dirOf(at); assert.deepEqual(trace(T, d).plane, at, `${p.id}: ${at} is the first ${T ? 'T' : 'S'} along its line`); }
  let n = 0;
  const cert = q.certificate, [first] = cert, a1 = play(p, claim, {type: 'pick', at: trace(T, first).plane});
  assert.deepEqual(a1.board.picks, [first]);
  // Before the last shot, a crossing shot is taken like any other.
  let crossedEarly = false;
  for (const at of shown) {
    const d = dirOf(at), next = move(p, a1, {type: 'pick', at});
    if (keyOf(d) === keyOf(first)) { assert.deepEqual(next.board.picks, [], `${p.id}: a second tap drops a shot`); continue; }
    if (need <= 2) continue;
    assert.deepEqual(next.board.picks, [first, d], `${p.id}: ${d} is taken untold`);
    assert.equal(next.board.note, null);
    if (!crossedEarly && sharePoint(T, first, d)) { crossedEarly = true; n += hintsSolve(p, next, 'with two crossing shots chosen'); }
  }
  // The last shot: the certificate less its last, then each shown shot.
  const base = cert.slice(0, need - 1).reduce((a, d) => play(p, a, {type: 'pick', at: trace(T, d).plane}), claim);
  assert.equal(base.board.picks.length, need - 1);
  let crossTold = false;
  for (const at of shown) {
    const d = dirOf(at), next = play(p, base, {type: 'pick', at});
    if (base.board.picks.some(x => keyOf(x) === keyOf(d))) { assert.equal(next.board.picks.length, need - 2, `${p.id}: a second tap drops a shot`); continue; }
    const clash = firstClash(T, [...base.board.picks, d]);
    if (!clash) { assert.ok(isSolved(p, next.board), `${p.id}: ${d} misses every chosen shot, and the claim is proved`); continue; }
    assert.deepEqual(next.board.note, {cross: clash}, `${p.id}: ${d} is the last shot and two cross: ${JSON.stringify(clash)}`);
    assert.deepEqual(next.board.picks, [], `${p.id}: crossing shots are all cleared`);
    assert.equal(next.board.claim, claim.board.claim, `${p.id}: the claim stays open`);
    assert.ok(!isSolved(p, next.board));
    const back = undoApp(p, next);
    assert.deepEqual(back.board.picks, [], `${p.id}: Undo doesn’t bring crossing shots back`);
    assert.equal(back.board.claim, claim.board.claim);
    if (!crossTold) {
      crossTold = true;
      const html = mechanicFor(p).render(p, {...next, hintLevel: 0});
      assert.ok(html.includes('Those two cross.') && html.includes('sh-clash'), `${p.id}: the crossings are told and ringed`);
      n += hintsSolve(p, next, 'after crossing shots');
    }
  }
  // Shots that are not copies of the target, or too far, are refused.
  refuse(p, claim, {type: 'pick', at: [1, 1]}, 'a tap that is no copy of the target');
  refuse(p, claim, {type: 'pick', at: [0, 0]}, 'S itself');
  refuse(p, claim, {type: 'pick', at: T ? [T[0] + 8 * 20, T[1]] : [8 * 20, 0]}, 'a copy far outside the view');
  // A dead end: shots no two crossing that can't be extended, chosen greedily
  // from the last shown copy backwards; hints take one back and finish.
  let greedy = claim;
  for (const at of shown.slice().reverse()) {
    const d = dirOf(at);
    if (greedy.board.picks.length < need - 1 && !greedy.board.picks.some(x => sharePoint(T, x, d))) greedy = play(p, greedy, {type: 'pick', at});
  }
  n += hintsSolve(p, greedy, 'after a greedy choice of shots');
  // Undo of a pick goes back to the claim; Undo of the claim back to the shields.
  assert.equal(undoApp(p, a1).board.claim, claim.board.claim);
  assert.equal(undoApp(p, claim).board.claim, null);
  return n;
}

// Random shield sets: the board says a shot gets through exactly when the
// traced shots say so; a claim is judged at its last shot exactly as the
// fewest count and the crossing test say.
function checkRandomSets(p, fresh, row, best, shots) {
  const q = p.parameters, T = q.T, M = mechanicFor(p);
  let seed = 7 + p.number;
  const rand = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const cells = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if ((i || j) && !(T && i === T[0] && j === T[1])) cells.push([i, j]);
  let tried = 0;
  for (let r = 0; r < 60; r++) {
    const size = 1 + rand(q.mode === 'budget' ? q.budget : 5);
    const set = [];
    // Half the sets lean on the halfway crosses, half are anywhere.
    while (set.length < size) { const c = r % 2 && best.sets[0] ? (rand(3) ? best.sets[0][rand(best.sets[0].length)] : cells[rand(cells.length)]) : cells[rand(cells.length)]; if (!set.some(x => keyOf(x) === keyOf(c))) set.push(c); }
    const a = withShields(p, fresh, set), blocked = blocks(T, shots, set);
    const html = M.render(p, {...a, hintLevel: 0}), status = html.match(/role="status">([^<]*)</)[1];
    assert.equal(status.includes('No shot gets through.'), blocked, `${p.id}: ${JSON.stringify(set)} ${blocked ? 'stops' : 'lets through'} every shot`);
    if (!blocked) {
      // The shot the app fires really gets through.
      const named = planeOf(html).match(/class="sh-shot escape" x1="0" y1="0" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/);
      assert.ok(named, `${p.id}: a shot is drawn getting through`);
      const end = [Number(named[1]), 0 - Number(named[2])], g = gcd(end[0], end[1]), d = [end[0] / g, end[1] / g];
      assert.deepEqual(trace(T, d).plane, end, `${p.id}: the drawn shot ends at its first ${T ? 'T' : 'S'}`);
      assert.ok(!trace(T, d).crosses.some(c => set.some(x => keyOf(x) === c)), `${p.id}: the drawn shot misses every shield`);
    }
    if (q.mode === 'fewest') {
      const next = move(p, a, {type: 'fewest'});
      if (!blocked) assert.equal(next, null);
      else {
        assert.equal(next.board.claim, 'fewest', `${p.id}: Fewest at ${set.length} starts a claim`);
        judgeClaim(p, next, set.length === best.k, 'fewer', `Fewest at ${set.length}`);
      }
    } else {
      assert.equal(isSolved(p, a.board), blocked, `${p.id}: solved exactly when every shot stops`);
      if (!blocked) judgeClaim(p, play(p, a, {type: 'cant'}), Boolean(row.cant), 'way', `Can’t at ${set.length}`);
    }
    tried++;
  }
  return tried;
}

// Tap the first shown copies, as many as the claim asks: a wrong claim is told
// `wrong` at the last; a right one is proved unless two of the shots cross.
function judgeClaim(p, a, right, wrong, label) {
  const T = p.parameters.T, {shown, need} = shownCopies(p, a), list = shown.slice(0, need);
  const told = tapAll(p, a, list);
  if (!right) { assert.equal(told.board.note, wrong, `${p.id}: ${label} is refused at the last shot`); assert.equal(told.board.claim, null); return; }
  const clash = firstClash(T, list.map(dirOf));
  if (clash) assert.deepEqual(told.board.note, {cross: clash}, `${p.id}: ${label}: two cross`);
  else assert.ok(isSolved(p, told.board), `${p.id}: ${label}: proved`);
}

// Saves the app may make (an open claim, shots freely chosen) and saves it
// must refuse.
function checkForgeries(p, fresh, row, best) {
  const q = p.parameters, T = q.T, b = fresh.board, bad = [];
  const w = p.solution.witness.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  // Two shots of the puzzle that share a point other than S and T.
  const pool = q.shots || directions(T, 3);
  const crossing = pool.flatMap(d => pool.filter(e => keyOf(e) !== keyOf(d) && sharePoint(T, d, e)).map(e => [d, e]))[0];
  // A full set of shots: these first, then others of the puzzle, `n` in all.
  const fill = (first, n) => [...first, ...[...q.certificate, ...pool].filter((d, k, all) => all.findIndex(e => keyOf(e) === keyOf(d)) === k && !first.some(e => keyOf(e) === keyOf(d)))].slice(0, n);
  const good = [];
  bad.push([{...b, extra: 1}, 'an extra field']);
  bad.push([{...b, shields: [[0, 1], [0, 1]]}, 'a shield twice']);
  bad.push([{...b, shields: [[0, 2], [0, 1]]}, 'shields out of order']);
  bad.push([{...b, shields: [[0, 0]]}, 'a shield on S']);
  if (T) bad.push([{...b, shields: [T]}, 'a shield on T']);
  bad.push([{...b, shields: [[8, 1]]}, 'a shield off the room']);
  bad.push([{...b, shields: [[1, 1.5]]}, 'a shield between crosses']);
  bad.push([{...b, picks: [q.certificate[0]]}, 'a tapped shot without a claim']);
  bad.push([{...b, note: 'way'}, 'a refusal never made']);
  bad.push([{...b, fewer: 1}, 'a Fewest refusal below the fewest']);
  if (q.mode === 'fewest') bad.push([{...b, shields: w.slice(1), claim: 'fewest', picks: q.certificate.slice(0, w.length - 1)}, 'Fewest with shots getting through']);
  if (q.mode === 'fewest') {
    const big = [...w, [0, 1]].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    good.push([{...b, shields: big, claim: 'fewest'}, 'a Fewest claim with more shields than needed, not yet judged']);
    good.push([{...b, shields: w, claim: 'fewest', picks: crossing && best.k > 2 ? crossing : []}, 'a Fewest claim with shots still being chosen']);
    bad.push([{...b, shields: big, claim: 'fewest', picks: fill([], Math.min(big.length, q.shots ? q.shots.length : big.length))}, 'Fewest with more shields than needed, every shot tapped']);
    bad.push([{...b, shields: w, claim: 'fewest', fewer: best.k}, 'Fewest at a count refused before']);
    bad.push([{...b, claim: 'cant', shields: [[0, 1]]}, 'Can’t in a fewest puzzle']);
    bad.push([{...b, way: true}, 'a Can’t refusal in a fewest puzzle']);
    // Two shots that cross, among the picks.
    if (crossing && best.k >= 2) bad.push([{...b, shields: w, claim: 'fewest', picks: fill(crossing, best.k)}, 'two crossing shots among all the shots']);
    if (crossing) bad.push([{...b, shields: w, claim: 'fewest', picks: [q.certificate[0]], note: {cross: crossing}}, 'crossing shots told but not cleared']);
    bad.push([{...b, shields: w, claim: 'fewest', picks: [...q.certificate, q.certificate[0]]}, 'more shots than shields']);
    bad.push([{...b, shields: w, claim: 'fewest', picks: [[2, 2]]}, 'a direction that is no shot']);
    if (q.shots && T) bad.push([{...b, shields: w, claim: 'fewest', picks: [[7, 1]].filter(d => !q.shots.some(e => keyOf(e) === keyOf(d)))}, 'a shot that is not drawn']);
  } else {
    bad.push([{...b, shields: [[0, 1], [0, 2], [0, 3], [1, 0], [1, 2]].slice(0, q.budget + 1)}, 'more shields than the budget']);
    bad.push([{...b, claim: 'fewest', shields: w.slice(0, q.budget)}, 'Fewest in a budget puzzle']);
    bad.push([{...b, fewer: 5}, 'a Fewest refusal in a budget puzzle']);
    if (row.cant) {
      bad.push([{...b, claim: 'cant'}, 'Can’t with no attempt']);
      bad.push([{...b, way: true}, '“There is a way” where there is none']);
      good.push([{...b, shields: [[0, 1]], claim: 'cant', picks: crossing}, 'a Can’t claim with shots still being chosen']);
      bad.push([{...b, shields: [[0, 1]], claim: 'cant', picks: fill(crossing, q.budget + 1)}, 'two crossing shots among all the shots']);
    } else {
      good.push([{...b, shields: [[0, 1]], claim: 'cant'}, 'a Can’t claim, not yet judged']);
      bad.push([{...b, shields: [[0, 1]], claim: 'cant', picks: fill([], q.budget + 1)}, 'a wrong Can’t with every shot tapped']);
      bad.push([{...b, shields: [[0, 1]], claim: 'cant', way: true}, 'Can’t again after “There is a way.”']);
      bad.push([{...b, note: 'way'}, 'a told without its lock']);
    }
  }
  for (const [board, why] of good) assert.equal(validBoard(p, board), true, `${p.id}: accepts ${why}`);
  for (const [board, why] of bad) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkPlayground(p, fresh) {
  const q = p.parameters, M = mechanicFor(p);
  assert.equal(M.noHint(p), true, `${p.id}: no Hint`);
  const rooms = Object.entries(q.rooms);
  assert.deepEqual(rooms.map(([, r]) => r.T), [C, null, E], `${p.id}: the three rooms`);
  for (const [name, r] of rooms) {
    let a = name === fresh.board.room ? fresh : play(p, fresh, {type: 'room', room: name});
    const goal = r.T || [0, 0];
    // Aim at the copies two right, two up: the shot stops at its first target.
    const far = [goal[0] + 16, goal[1] + 16], shot = play(p, a, {type: 'aim', at: far});
    const html = planeOf(M.render(p, {...shot, hintLevel: 0})), line = html.match(/class="sh-shot (escape|stopped)" x1="0" y1="0" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/);
    const g = gcd(far[0], far[1]), d = [far[0] / g, far[1] / g];
    assert.deepEqual([Number(line[2]), 0 - Number(line[3])], trace(r.T, d).plane, `${p.id}: ${name}: a shot aimed at ${far} stops at its first ${r.T ? 'T' : 'S'}`);
    // A shield on its first cross stops it there.
    const c = trace(r.T, d).crosses[0].split(',').map(Number), stopped = play(p, shot, {type: 'shield', at: c});
    const line2 = planeOf(M.render(p, {...stopped, hintLevel: 0})).match(/class="sh-shot stopped" x1="0" y1="0" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/);
    assert.ok(line2, `${p.id}: ${name}: a stopped shot`);
    // Aims past the limit drop the oldest.
    let many = a;
    const targets = [];
    for (let X = -2; X <= 2 && targets.length < 10; X++) for (let Y = -2; Y <= 2 && targets.length < 10; Y++) { const at = [goal[0] + 8 * X, goal[1] + 8 * Y]; if ((at[0] || at[1])) { const gg = gcd(...at), dd = [at[0] / gg, at[1] / gg]; if (trace(r.T, dd).end === (r.T ? 'T' : 'S')) targets.push(at); } }
    for (const at of targets) many = play(p, many, {type: 'aim', at});
    assert.equal(many.board.aims.length, Math.min(8, targets.length), `${p.id}: ${name}: at most eight aims`);
    assert.ok(!isSolved(p, many.board), `${p.id}: never solved`);
    refuse(p, a, {type: 'aim', at: [1, 2]}, 'an aim at no copy of the target');
    refuse(p, a, {type: 'shield', at: [0, 0]}, 'a shield on S');
    refuse(p, a, {type: 'fewest'}, 'Fewest in the playground');
    refuse(p, a, {type: 'cant'}, 'Can’t in the playground');
  }
  refuse(p, fresh, {type: 'room', room: 'moon'}, 'an unknown room');
  refuse(p, fresh, {type: 'room', room: fresh.board.room}, 'the same room');
  for (const [board, why] of [[{...fresh.board, room: 'moon'}, 'an unknown room'], [{...fresh.board, aims: [[1, 1]]}, 'an aim at no copy'], [{...fresh.board, shields: [[4, 4]]}, 'a shield on T'], [{...fresh.board, claim: 'fewest'}, 'a claim in the playground'], [{...fresh.board, aims: Array.from({length: 9}, (_, k) => [4 + 8 * k, 4])}, 'more than eight aims']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export default validateShields;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateShields(), null, 2));
