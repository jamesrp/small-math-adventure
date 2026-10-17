// Checks the Mirror Couriers bounce words pack (dist/families/aims/aims.json)
// by methods unlike the mechanic's. The mechanic (dist/families/aims/fold.js)
// unfolds: it mirrors the start and end of a shot in each wall it crosses, in
// whole-number oblique coordinates. Here instead:
//  - a billiard simulator moves a point inside the room in ordinary Euclidean
//    coordinates and reflects its velocity at each wall, with exact arithmetic
//    in Q(√3) (numbers a + b√3, a and b fractions of BigInts);
//  - for rectangles, the cutting sequence of the straight shot: the times it
//    crosses the lines x = kW and y = jH, sorted;
//  - which words some rectangle can make, by linear programming (exact
//    Fourier–Motzkin elimination) instead of the balanced-word test.
// It recomputes every puzzle's solving shots and compares them with the
// mechanic shot by shot; checks every impossibility for every rectangle and
// every start (not only the window's aim points), the certificate walls by
// unfolding the room itself, and how often random taps solve a certificate;
// replays the witnesses; checks that hints alone solve every puzzle from a
// fresh board, after a wrong shot, after a corner hit, after a refused claim
// or Check and after Undo; and rejects illegal moves and forged saves.
// Run: node scripts/validate-aims.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {answers, seams, judge, certificate, frameAims} from '../dist/families/aims/aims.js';
import {fold, rectangleWord} from '../dist/families/aims/fold.js';
import {loadPack} from './packs.mjs';

// --- Exact numbers ------------------------------------------------------------
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
// A fraction n/d of BigInts, d > 0, in lowest terms.
const fr = (n, d = 1n) => { n = BigInt(n); d = BigInt(d); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return [n / g, d / g]; };
const fAdd = (a, b) => fr(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const fSub = (a, b) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const fMul = (a, b) => fr(a[0] * b[0], a[1] * b[1]);
const fDiv = (a, b) => fr(a[0] * b[1], a[1] * b[0]);
const fSign = a => (a[0] > 0n ? 1 : a[0] < 0n ? -1 : 0);
// Q(√3): [a, b] is a + b√3.
const K = (a, b = 0) => [typeof a === 'object' ? a : fr(a), typeof b === 'object' ? b : fr(b)];
const kAdd = (x, y) => [fAdd(x[0], y[0]), fAdd(x[1], y[1])];
const kSub = (x, y) => [fSub(x[0], y[0]), fSub(x[1], y[1])];
const kMul = (x, y) => [fAdd(fMul(x[0], y[0]), fMul(fr(3), fMul(x[1], y[1]))), fAdd(fMul(x[0], y[1]), fMul(x[1], y[0]))];
const kDiv = (x, y) => {
  const norm = fSub(fMul(y[0], y[0]), fMul(fr(3), fMul(y[1], y[1]))), conj = [y[0], fr(-y[1][0], y[1][1])], top = kMul(x, conj);
  return [fDiv(top[0], norm), fDiv(top[1], norm)];
};
function kSign([a, b]) {
  const sa = fSign(a), sb = fSign(b);
  if (sb === 0) return sa;
  if (sa === 0 || sa === sb) return sa || sb;
  const a2 = fMul(a, a), b2 = fMul(fr(3), fMul(b, b));
  return fSign(fSub(a2, b2)) > 0 ? sa : sb;
}
const kEq = (x, y) => kSign(kSub(x, y)) === 0;
const kLess = (x, y) => kSign(kSub(x, y)) < 0;
const vSub = (p, q) => [kSub(p[0], q[0]), kSub(p[1], q[1])];
const vAdd = (p, q) => [kAdd(p[0], q[0]), kAdd(p[1], q[1])];
const vScale = (t, p) => [kMul(t, p[0]), kMul(t, p[1])];
const vCross = (p, q) => kSub(kMul(p[0], q[1]), kMul(p[1], q[0]));
const vDot = (p, q) => kAdd(kMul(p[0], q[0]), kMul(p[1], q[1]));
const ONE = K(1), ZERO = K(0), HALF = K(fr(1, 2)), HALF_R3 = K(0, fr(1, 2));

// --- Rooms in Euclidean coordinates ------------------------------------------------
// Corners in order; wall i runs from corner i to corner i + 1 and the letters
// go A (bottom), D (right), C (top), B (left), as on the worksheet.
const LETTERS = ['A', 'D', 'C', 'B'];
const rectRoom = (W, H) => ({W, H, corners: [[K(0), K(0)], [K(W), K(0)], [K(W), K(H)], [K(0), K(H)]]});
// The 60° rhombus with side S: (S, 0) along the bottom, (S/2, S√3/2) up the left side.
const rhombusRoom = S => ({S, corners: [[K(0), K(0)], [K(S), K(0)], [K(fr(3 * S, 2)), K(0, fr(S, 2))], [K(fr(S, 2)), K(0, fr(S, 2))]]});
const EUCLID = {square: rectRoom(10, 10), wide: rectRoom(20, 10), rhombus: rhombusRoom(15)};
// The app's whole-number points: (x, y) in rectangles; (s, t) means s·(1, 0) + t·(1/2, √3/2) in the rhombus.
const place = (room, [x, y]) => (room === 'rhombus' ? [kAdd(K(x), kMul(K(y), HALF)), kMul(K(y), HALF_R3)] : [K(x), K(y)]);

// The billiard: from the start, move with velocity end − start for time 1,
// reflecting the velocity at each wall. Returns the word, the crossing times,
// the time of a corner hit (or null) and whether the end is strictly inside.
export function bounce(room, start, end, limit = 60) {
  const P = room.corners, word = [], times = [];
  let p = start, v = vSub(end, start), now = ZERO, last = -1;
  for (let k = 0; k < limit; k++) {
    let best = null;
    for (let i = 0; i < 4; i++) {
      if (i === last) continue;
      const a = P[i], e = vSub(P[(i + 1) % 4], a), den = vCross(v, e);
      if (kSign(den) === 0) continue;
      const w = vSub(a, p), t = kDiv(vCross(w, e), den), u = kDiv(vCross(w, v), den);
      if (kSign(t) <= 0 || kSign(u) < 0 || kSign(kSub(u, ONE)) > 0) continue;
      if (!best || kLess(t, best.t)) best = {t, u, i, e};
    }
    // A shot that does not move (its end at its start) meets no wall.
    if (!best && kSign(v[0]) === 0 && kSign(v[1]) === 0) return {word: '', times, corner: null, inside: true};
    const at = kAdd(now, best.t);
    if (kLess(ONE, at)) return {word: word.join(''), times, corner: null, inside: true};
    if (kEq(at, ONE)) return {word: word.join(''), times, corner: null, inside: false};
    if (kSign(best.u) === 0 || kEq(best.u, ONE)) return {word: word.join(''), times, corner: at, inside: false};
    word.push(LETTERS[best.i]); times.push(at);
    p = vAdd(p, vScale(best.t, v));
    v = vSub(vScale(kDiv(kMul(K(2), vDot(v, best.e)), vDot(best.e, best.e)), best.e), v);
    now = at; last = best.i;
  }
  throw new Error('too many bounces');
}
export const simulate = (room, start, end) => bounce(EUCLID[room], place(room, start), place(room, end));

// Rectangles again: the straight shot crosses x = kW (B for even k, D for
// odd) and y = jH (A for even j, C for odd); sort the crossing times. Two at
// once is a corner.
export function cutting(W, H, [x0, y0], [x1, y1]) {
  const events = [];
  const lines = (a, b, step, even, odd) => {
    if (a === b) return;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    for (let k = Math.ceil(lo / step); k * step <= hi; k++) {
      const c = k * step;
      if (c === a) continue;
      events.push({n: c - a, d: b - a, letter: k % 2 === 0 ? even : odd});
    }
  };
  lines(x0, x1, W, 'B', 'D');
  lines(y0, y1, H, 'A', 'C');
  for (const e of events) if (e.d < 0) { e.n = -e.n; e.d = -e.d; }
  events.sort((a, b) => a.n * b.d - b.n * a.d);
  let word = '';
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.n === e.d) return {word, corner: false, inside: false};
    if (events[i + 1] && e.n * events[i + 1].d === events[i + 1].n * e.d) return {word, corner: true, inside: false};
    word += e.letter;
  }
  return {word, corner: false, inside: true};
}

// --- Which words a rectangle makes, by linear programming -------------------------
// Stretching the copies changes no word, so take the unit square. Mirror so
// the shot goes right and up; it starts at (x0, y0) inside, with slope r. Its
// k-th crossing of an up-down line (k = 0, 1, …) is after going 1 + k − x0
// across, and of a side line after 1 + j − y0 up, so a crossing of the k-th
// vertical line before the j-th horizontal one means r(1 + k − x0) < 1 + j − y0.
// With u = r·x0 every condition is linear in (r, u, y0): r > 0, 0 < u < r,
// 0 < y0 < 1, one strict inequality per change of direction in the word, and
// one more so that the word's last crossing comes before the next one of the
// other kind (the shot ends between them).
function feasible(rows) {
  // rows: {a: [r, u, y0], c, strict} meaning a·z < c (all strict here).
  let list = rows;
  for (const v of [2, 1]) {
    const pos = list.filter(r => r.a[v] > 0), neg = list.filter(r => r.a[v] < 0), out = list.filter(r => r.a[v] === 0);
    for (const P of pos) for (const N of neg) {
      const m = -N.a[v], n = P.a[v];
      out.push({a: P.a.map((x, i) => m * x + n * N.a[i]), c: m * P.c + n * N.c});
    }
    list = out;
  }
  let lo = null, hi = null;
  const better = (x, y, sign) => (y === null || sign * (x[0] * y[1] - y[0] * x[1]) > 0);
  for (const r of list) {
    const a = r.a[0];
    if (a === 0) { if (!(0 < r.c)) return false; continue; }
    const bound = a > 0 ? [r.c, a] : [-r.c, -a];
    if (a > 0) { if (better(bound, hi, -1)) hi = bound; } else if (better(bound, lo, 1)) lo = bound;
  }
  return lo === null || hi === null || lo[0] * hi[1] < hi[0] * lo[1];
}
const lpMemo = new Map();
export function lpRectangle(word) {
  if (!/^[ABCD]*$/.test(word)) return false;
  for (const fam of ['AC', 'BD']) {
    const s = [...word].filter(c => fam.includes(c));
    if (s.some((c, i) => i && c === s[i - 1])) return false;
  }
  const pattern = [...word].map(c => ('AC'.includes(c) ? 'H' : 'V')).join('');
  if (!pattern.includes('H') || !pattern.includes('V')) return true;
  if (lpMemo.has(pattern)) return lpMemo.get(pattern);
  const rows = [
    {a: [-1, 0, 0], c: 0}, {a: [0, -1, 0], c: 0}, {a: [-1, 1, 0], c: 0}, {a: [0, 0, -1], c: 0}, {a: [0, 0, 1], c: 1}
  ];
  let k = 0, j = 0;
  const seq = [...pattern].map(c => (c === 'V' ? {v: true, n: k++} : {v: false, n: j++}));
  for (let i = 1; i < seq.length; i++) {
    const [x, y] = [seq[i - 1], seq[i]];
    if (x.v === y.v) continue;
    // vertical line kk before horizontal line jj: r(1 + kk) − u + y0 < 1 + jj
    const [V, H, first] = x.v ? [x, y, 'V'] : [y, x, 'H'];
    if (first === 'V') rows.push({a: [1 + V.n, -1, 1], c: 1 + H.n});
    else rows.push({a: [-(1 + V.n), 1, -1], c: -(1 + H.n)});
  }
  // And the shot ends before its next crossing of the other kind.
  const last = seq.at(-1);
  if (last.v) rows.push({a: [1 + last.n, -1, 1], c: 1 + j});
  else rows.push({a: [-(1 + k), 1, -1], c: -(1 + last.n)});
  const ok = feasible(rows);
  lpMemo.set(pattern, ok);
  return ok;
}

// --- The aim points and windows, from their definitions ----------------------------
// Square: centres of the 2-by-2 cells (odd, odd). Wide room: centres of the
// 4-by-2 cells. Rhombus: centroids of the triangles cut by the lines of a
// side-3 lattice and its short diagonals.
const aimOK = {
  square: ([x, y]) => Math.abs(x % 2) === 1 && Math.abs(y % 2) === 1,
  wide: ([x, y]) => ((x % 4) + 4) % 4 === 2 && Math.abs(y % 2) === 1,
  rhombus: ([s, t]) => { const a = ((s % 3) + 3) % 3, b = ((t % 3) + 3) % 3; return a === b && a !== 0; }
};
const SIZE = {square: [10, 10], wide: [20, 10]};
function windowAims(room, f) {
  const out = [];
  if (room === 'rhombus') {
    for (let t = -200; t <= 200; t++) for (let s = -200; s <= 200; s++) if (aimOK.rhombus([s, t]) && 2 * s + t > f[0] && 2 * s + t < f[1] && t > f[2] && t < f[3]) out.push([s, t]);
    return out;
  }
  const [W, H] = SIZE[room];
  for (let y = f[2] * H; y <= (f[3] + 1) * H; y++) for (let x = f[0] * W; x <= (f[1] + 1) * W; x++) if (aimOK[room]([x, y]) && x > f[0] * W && x < (f[1] + 1) * W && y > f[2] * H && y < (f[3] + 1) * H) out.push([x, y]);
  return out;
}
function roomStarts(room) {
  const out = [];
  if (room === 'rhombus') { for (let t = 1; t < 15; t++) for (let s = 1; s < 15; s++) if (aimOK.rhombus([s, t])) out.push([s, t]); return out; }
  const [W, H] = SIZE[room];
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) if (aimOK[room]([x, y])) out.push([x, y]);
  return out;
}
const key = w => `${w.start}|${w.end}`;
const fourWalls = w => w.length === 4 && new Set(w).size === 4;
const goal = (q, w) => (q.mode === 'design' ? w.length > 0 && !lpRectangle(w) && (!q.four || fourWalls(w)) : w === q.word);

// Every solving shot of a puzzle, by the simulator, and every shot compared
// with the mechanic's fold (word, crossing times, corner and inside).
function solveAll(q, stats) {
  const out = [];
  const starts = q.movable ? roomStarts(q.room) : [q.start];
  for (const s of starts) for (const e of windowAims(q.room, q.frame)) {
    const r = simulate(q.room, s, e), m = fold(q.room, s, e);
    stats.shots++;
    assert.equal(m.word, r.word, `fold and the simulator agree on ${q.room} ${s}→${e}`);
    assert.equal(Boolean(m.corner), Boolean(r.corner), `corner ${q.room} ${s}→${e}`);
    assert.equal(m.inside, r.inside, `inside ${q.room} ${s}→${e}`);
    m.crossings.forEach((c, i) => assert.ok(kEq(K(fr(c.at[0], c.at[1])), r.times[i]), `crossing times ${q.room} ${s}→${e}`));
    if (m.corner) { stats.corners++; assert.ok(kEq(K(fr(m.corner.at[0], m.corner.at[1])), r.corner)); }
    if (q.room !== 'rhombus') {
      const c = cutting(...SIZE[q.room], s, e);
      assert.equal(c.word, r.word, `the cutting sequence agrees on ${q.room} ${s}→${e}`);
      assert.equal(c.corner, Boolean(r.corner));
    }
    if (!r.corner && r.inside && goal(q, r.word)) out.push({start: s, end: e});
  }
  return out;
}

// --- Playing through the engine ---------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// Undo as the app does it: the mechanic's carry keeps a refusal.
const undoApp = (p, a) => { const next = undo(a); return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 12; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    assert.ok(h.text && h.text.length < 260, `${p.id} ${label}: a hint sentence`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// A shot from the board's start whose word is not the goal (and not a corner).
function wrongShot(p, b) {
  const q = p.parameters;
  return frameAims(q.room, q.frame).find(e => { const r = simulate(q.room, b.start, e); return !r.corner && r.inside && r.word.length && !goal(q, r.word); });
}
function cornerShot(p, b) {
  const q = p.parameters;
  return frameAims(q.room, q.frame).find(e => simulate(q.room, b.start, e).corner);
}

// --- Expected answers ---------------------------------------------------------------------
const EXPECT = {
  'aims-01': {word: 'DC', count: 10, level: 'easy'},
  'aims-02': {word: 'CBA', count: 20, level: 'easy'},
  'aims-03': {word: 'AB', count: 34, level: 'easy'},
  'aims-04': {word: 'ACB', count: 3, level: 'medium'},
  'aims-05': {word: 'ABA', count: 0, level: 'medium', cant: true},
  'aims-06': {word: 'ABA', count: 1172, level: 'medium', cant: true},
  'aims-07': {word: 'DCB', count: 20, level: 'medium'},
  'aims-08': {count: 64, level: 'medium'},
  'aims-09': {word: 'BDC', count: 3, level: 'hard'},
  'aims-10': {word: 'CABA', count: 0, level: 'hard', cant: true},
  'aims-11': {count: 45, level: 'hard', four: true}
};

export async function validateAims() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/aims/aims.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-71')), 'the worksheet week');
  assert.equal(pack.puzzles.length, 11);
  assert.deepEqual(Object.keys(EXPECT), pack.puzzles.map(p => p.id));
  const stats = {shots: 0, corners: 0, hintSteps: 0, refusedClaims: 0, forged: 0, illegal: 0};

  // The worksheet's checked rhombus example (adult guide, Problem 2): side 4,
  // start (11/4, √3/4), aimed at (2, 0), bounces A, B, A.
  const guide = rhombusRoom(4), gs = [K(fr(11, 4)), K(0, fr(1, 4))], gd = vSub([K(2), K(0)], gs);
  assert.equal(bounce(guide, gs, vAdd(gs, vScale(K(fr(11, 2)), gd))).word, 'ABA', 'the guide’s rhombus shot is ABA');

  // Rectangle words: the linear program against the balanced-word test, on
  // every word of up to 8 letters.
  let words = 0, rect = 0;
  const grow = w => (w.length === 8 ? [] : ['A', 'B', 'C', 'D'].map(c => w + c));
  for (let level = [''], n = 0; n < 8; n++) {
    level = level.flatMap(grow);
    for (const w of level) { const lp = lpRectangle(w); assert.equal(rectangleWord(w), lp, `rectangle word ${w}`); words++; if (lp) rect++; }
  }
  // Every rectangle word up to 4 letters is made by some square shot (and none else).
  const made = new Set();
  for (const s of roomStarts('square')) for (const e of windowAims('square', [-4, 4, -4, 4])) { const c = cutting(10, 10, s, e); if (!c.corner && c.inside && c.word.length <= 4) made.add(c.word); }
  for (let level = [''], n = 0; n < 4; n++) { level = level.flatMap(grow); for (const w of level) assert.equal(made.has(w), lpRectangle(w), `the square makes ${w} exactly when the program says so`); }

  // Stretching: every square shot from every start into a 5 × 5 window has
  // the same word as the shot doubled across in the wide room.
  let stretched = 0;
  for (const s of roomStarts('square')) for (const e of windowAims('square', [-2, 2, -2, 2])) {
    const a = cutting(10, 10, s, e), b = cutting(20, 10, [2 * s[0], s[1]], [2 * e[0], e[1]]);
    assert.deepEqual(a, b, `stretch ${s}→${e}`); stretched++;
  }

  for (const p of pack.puzzles) {
    const q = p.parameters, x = EXPECT[p.id];
    assert.equal(p.mechanic, 'aims'); assert.equal(p.libraryFamily, 'billiard'); assert.equal(p.group, 'Bounce words');
    assert.equal(p.familyTitle, 'Mirror Couriers'); assert.equal(p.band, 'all'); assert.equal(p.difficulty_level, x.level);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    for (const f of ['objective', 'visibleObjective', 'controls', 'idea', 'provenance', 'prerequisites']) assert.ok(typeof p[f] === 'string' && p[f].length > 10, `${p.id}: ${f}`);
    assert.ok(p.hints.length >= 3, `${p.id}: three hints`);
    for (const f of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[f], `${p.id}: parent ${f}`);
    assert.doesNotMatch(p.hints[0], /press can|can’t be|impossible|cannot/i, `${p.id}: the first hint does not give away Can’t`);
    assert.ok(!/\b[ABCD]{2,}\b/.test(p.title), `${p.id}: the title names no word`);
    assert.ok(p.visibleObjective.split(/[.!?]/).filter(Boolean).length === 1, `${p.id}: one short objective`);
    assert.doesNotMatch(p.controls.split('.')[0], /drag|tap|press/i, `${p.id}: How to play opens with the mathematics`);
    if (x.word) assert.equal(q.word, x.word);
    assert.equal(Boolean(q.cant), Boolean(x.cant));

    // The solving shots, recomputed.
    const mine = solveAll(q, stats), theirs = answers(q);
    assert.equal(mine.length, x.count, `${p.id}: ${mine.length} solving shots`);
    assert.deepEqual(new Set(mine.map(key)), new Set(theirs.map(key)), `${p.id}: the same solving shots as the mechanic`);
    if (q.mode === 'design') assert.equal(p.solution.shots, x.count);
    if (x.count) assert.equal(p.solution.shots, x.count);

    // Remakes: the given shot has the word, and stretched (or squeezed) it is a solving shot.
    if (q.mode === 'remake') {
      const g = q.given, [Wg] = SIZE[g.room], [Wp] = SIZE[q.room];
      assert.equal(simulate(g.room, g.start, g.end).word, q.word, `${p.id}: the given shot`);
      const map = ([u, v]) => [(u * Wp) / Wg, v], ms = map(g.start), me = map(g.end);
      assert.ok(Number.isInteger(me[0]) && aimOK[q.room](me) && ms[0] === q.start[0] && ms[1] === q.start[1], `${p.id}: the given shot maps onto an aim from the start`);
      assert.ok(mine.some(w => key(w) === key({start: ms, end: me})), `${p.id}: the stretched shot solves`);
      const direct = mine.filter(w => { const d = [w.end[0] - w.start[0], w.end[1] - w.start[1]], gd2 = [g.end[0] - g.start[0], g.end[1] - g.start[1]]; return d[0] * gd2[1] === d[1] * gd2[0] && d[0] * gd2[0] >= 0; });
      assert.equal(direct.length, 0, `${p.id}: aiming the same way as the given shot does not solve`);
    }

    // Impossibility: no rectangle, from any start, makes the word (not only
    // these aim points), and the certificate walls are found by unfolding.
    if (q.cant) {
      const rectangle = q.room !== 'rhombus';
      assert.equal(lpRectangle(q.word), false, `${p.id}: no rectangle makes ${q.word}`);
      assert.equal(x.count === 0, rectangle, `${p.id}: impossible exactly in a rectangle`);
      const room = EUCLID[q.room];
      let poly = room.corners;
      const faces = [poly];
      for (const c of q.word) {
        const i = LETTERS.indexOf(c), a = poly[i], e = vSub(poly[(i + 1) % 4], a);
        poly = poly.map(pt => { const w = vSub(pt, a), t = kDiv(vDot(w, e), vDot(e, e)); return vSub(vScale(K(2), vAdd(a, vScale(t, e))), pt); });
        faces.push(poly);
      }
      const iWord = [...q.word].findIndex((c, i) => q.word.indexOf(c, i + 1) > i && [...q.word.slice(i + 1, q.word.indexOf(c, i + 1))].every(d => !(c === 'A' || c === 'C' ? 'AC' : 'BD').includes(d)));
      const jWord = q.word.indexOf(q.word[iWord], iWord + 1);
      assert.ok(iWord >= 0, `${p.id}: the repeated letter`);
      const wall = f => { const i = LETTERS.indexOf(q.word[iWord]); return [faces[f][i], faces[f][(i + 1) % 4]]; };
      const [s1, s2] = [wall(iWord), wall(jWord)], dir = vSub(s1[1], s1[0]);
      const onLine = pt => kSign(vCross(dir, vSub(pt, s1[0]))) === 0;
      assert.equal(onLine(s2[0]) && onLine(s2[1]), rectangle, `${p.id}: the two ${q.word[iWord]} walls lie on one line exactly in a rectangle`);
      if (rectangle) {
        const ids = certificate(q).map(s => s.id), mineIds = [s1, s2].map(([a, b]) => { const pa = [a[0][0][0], a[1][0][0]].map(Number), pb = [b[0][0][0], b[1][0][0]].map(Number); const [u, v] = pa[0] < pb[0] || (pa[0] === pb[0] && pa[1] < pb[1]) ? [pa, pb] : [pb, pa]; return `${u[0]},${u[1]},${v[0]},${v[1]}`; });
        assert.deepEqual(new Set(ids), new Set(mineIds), `${p.id}: the certificate walls`);
        assert.deepEqual(p.solution.walls, [...ids].sort());
      }
    }

    // Witness replay.
    let a = freshAttempt(p);
    assert.ok(validBoard(p, a.board) && !isSolved(p, a.board), `${p.id}: starts valid and unsolved`);
    if (p.solution.possible === false) {
      const h = nextHint(p, a);
      a = play(p, a, h.action);
      a = play(p, a, {type: 'claim', walls: p.solution.walls});
    } else {
      if (q.movable && String(p.solution.start) !== String(a.board.start)) a = play(p, a, {type: 'start', start: p.solution.start});
      a = play(p, a, {type: 'aim', end: p.solution.end});
      if (q.mode === 'design') a = play(p, a, {type: 'check'});
    }
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    refuse(p, a, {type: 'aim', end: frameAims(q.room, q.frame)[0]}, 'a move after the solve');

    // Hints alone, from fresh and after wrong moves.
    const fresh = freshAttempt(p);
    stats.hintSteps += hintsSolve(p, fresh, 'from fresh');
    const wrongEnd = wrongShot(p, fresh.board), wrong = play(p, fresh, {type: 'aim', end: wrongEnd});
    stats.hintSteps += hintsSolve(p, wrong, 'after a wrong shot');
    const cornerEnd = cornerShot(p, fresh.board);
    if (cornerEnd) {
      const c = play(p, fresh, {type: 'aim', end: cornerEnd});
      assert.ok(nextHint(p, c).text.startsWith('That shot hits a corner.'), `${p.id}: the hint names the corner`);
      stats.hintSteps += hintsSolve(p, c, 'after a corner hit');
    }
    if (q.movable) {
      const other = roomStarts(q.room).find(s => String(s) !== String(q.start));
      stats.hintSteps += hintsSolve(p, play(p, wrong, {type: 'start', start: other}), 'after moving the start');
    }

    // Claims: before a shot, wrong pairs (refused once, kept through Undo), right ones.
    if (q.cant) {
      refuse(p, fresh, {type: 'claim', walls: certificate(q).map(s => s.id).sort()}, 'Can’t before a shot');
      const list = seams(q, wrong.board);
      let right = 0, total = 0;
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        total++;
        const next = move(p, wrong, {type: 'claim', walls: [list[i].id, list[j].id]});
        assert.ok(next, `${p.id}: any two walls can be claimed`);
        if (isSolved(p, next.board)) { right++; continue; }
        assert.equal(next.board.refused.shown, true);
        if (total <= 3) {
          stats.refusedClaims++;
          refuse(p, next, {type: 'claim', walls: certificate(q).map(s => s.id).sort()}, 'a second claim on the same shot');
          const back = undoApp(p, next);
          assert.deepEqual(back.board.refused, {...next.board.refused, shown: false}, `${p.id}: Undo keeps the refusal, without its words`);
          assert.notEqual(mechanicFor(p).render(p, back), mechanicFor(p).render(p, next), `${p.id}: Undo changes the screen`);
          refuse(p, back, {type: 'claim', walls: certificate(q).map(s => s.id).sort()}, 'a claim after Undo of a refusal');
          stats.hintSteps += hintsSolve(p, next, 'after a refused claim');
          stats.hintSteps += hintsSolve(p, back, 'after Undo of a refused claim');
        }
      }
      assert.equal(right, x.count === 0 ? 1 : 0, `${p.id}: exactly the certificate pair is accepted`);
      // Random two-tap sequences on the walls, as a child tapping at random.
      let seed = 71, solvedTaps = 0;
      const rnd = n => { // mulberry32
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
      };
      for (let k = 0; k < 4000; k++) {
        const i = rnd(list.length); let j = rnd(list.length - 1); if (j >= i) j++;
        const next = move(p, wrong, {type: 'claim', walls: [list[i].id, list[j].id]});
        if (next && isSolved(p, next.board)) solvedTaps++;
      }
      stats[`${p.id} certificate`] = {walls: list.length, pairs: total, randomTapSolves: `${solvedTaps} of 4000`};
      assert.ok(solvedTaps / 4000 < 0.02, `${p.id}: random taps rarely solve the certificate`);
    }
    // Check: refused once per shot, kept through Undo.
    if (q.mode === 'design') {
      refuse(p, fresh, {type: 'check'}, 'Check before a shot');
      if (cornerEnd) refuse(p, play(p, fresh, {type: 'aim', end: cornerEnd}), {type: 'check'}, 'Check on a corner hit');
      const no = play(p, wrong, {type: 'check'});
      assert.ok(!isSolved(p, no.board) && no.board.refused.shown, `${p.id}: a wrong Check is refused`);
      refuse(p, no, {type: 'check'}, 'Check twice on one shot');
      const back = undoApp(p, no);
      assert.equal(back.board.refused?.shown, false, `${p.id}: Undo keeps the refused Check`);
      refuse(p, back, {type: 'check'}, 'Check again after Undo');
      stats.hintSteps += hintsSolve(p, no, 'after a refused Check');
      stats.hintSteps += hintsSolve(p, back, 'after Undo of a refused Check');
    }

    // Illegal moves.
    const b = fresh.board, aimsHere = frameAims(q.room, q.frame);
    const illegal = [
      [{type: 'aim', end: [b.start[0] + 1, b.start[1]]}, 'an end off the aim points'],
      [{type: 'aim', end: [10000, 10000]}, 'an end outside the window'],
      [{type: 'aim', end: 'here'}, 'an end that is not a point'],
      [{type: 'aim', end: [1.5, 1]}, 'a fractional end'],
      [{type: 'jump'}, 'an unknown move'],
      [{type: 'check'}, q.mode === 'design' ? 'Check before a shot' : 'Check outside a design puzzle'],
      [{type: 'claim', walls: ['0,0,10,0', '0,0,10,0']}, 'a claim of one wall twice'],
      [null, 'no move']
    ];
    if (!q.movable) illegal.push([{type: 'start', start: roomStarts(q.room).find(s => String(s) !== String(q.start))}, 'moving a fixed start']);
    else illegal.push([{type: 'start', start: [-1, -1]}, 'a start outside the room'], [{type: 'start', start: [...b.start]}, 'a start that does not move']);
    for (const [action, why] of illegal) { refuse(p, fresh, action, why); stats.illegal++; }
    const shotA = play(p, fresh, {type: 'aim', end: wrongEnd});
    refuse(p, shotA, {type: 'aim', end: wrongEnd}, 'the same end again'); stats.illegal++;
    if (!q.cant) { refuse(p, shotA, {type: 'claim', walls: ['a', 'b']}, 'Can’t where there is none'); stats.illegal++; }
    if (q.cant) { refuse(p, shotA, {type: 'claim', walls: ['1,1,2,2', seams(q, shotA.board)[0].id].sort()}, 'a claim of a wall not drawn'); stats.illegal++; }
    if (q.mode !== 'design') { refuse(p, shotA, {type: 'check'}, 'Check outside a design puzzle'); stats.illegal++; }

    // Forged saves.
    const sol = p.solution, solvedBoard = a.board;
    const forged = [
      [{...b, extra: 1}, 'an extra field'],
      [{...b, end: [b.start[0] + 1, b.start[1]]}, 'an end off the aim points'],
      [{...b, end: aimsHere[0].map(v => v + 100000)}, 'an end outside the window'],
      [{...b, start: [0, 0]}, 'a start on a corner'],
      [{...b, start: 'x'}, 'a start that is not a point'],
      ['board', 'a string'],
      [null, 'nothing']
    ];
    if (!q.movable) forged.push([{...b, start: roomStarts(q.room).find(s => String(s) !== String(q.start))}, 'a moved fixed start']);
    if (q.mode === 'design') {
      forged.push(
        [{...b, end: wrongEnd, done: true}, 'a forged done on a rectangle word'],
        [{...b, done: true}, 'done with no shot'],
        [{...b, end: sol.end, refused: {why: 'rect', shown: true}}, 'a refusal of a word no rectangle makes'],
        [{...b, end: wrongEnd, refused: {why: 'right', shown: true}}, 'a refusal with an unknown reason'],
        [{...solvedBoard, refused: {why: 'rect', shown: false}}, 'done and refused at once'],
        [{...b, done: 'yes'}, 'a done that is not true or false']
      );
      const why = q.four && !fourWalls(simulate(q.room, b.start, wrongEnd).word) ? 'four' : 'rect';
      forged.push([{...b, end: wrongEnd, refused: {why: why === 'four' ? 'rect' : 'four', shown: true}}, 'a refusal with the wrong reason']);
      if (cornerEnd) forged.push([{...b, end: cornerEnd, refused: {why: 'rect', shown: true}}, 'a refused Check on a corner hit']);
    }
    if (q.cant) {
      const list = seams(q, shotA.board), cert = certificate(q).map(s => s.id).sort();
      const notCert = [list[0].id, list[1].id].sort();
      forged.push(
        [{...b, claimed: cert}, 'a claim with no shot'],
        [{...shotA.board, claimed: notCert}, 'a claimed pair that is not the certificate'],
        [{...shotA.board, claimed: cert, refused: {walls: notCert, why: judge(q, notCert), shown: true}}, 'a claim both kept and refused'],
        [{...shotA.board, refused: {walls: notCert, why: judge(q, notCert) === 'line' ? 'walls' : 'line', shown: true}}, 'a refusal with the wrong reason'],
        [{...shotA.board, refused: {walls: cert, why: 'walls', shown: true}}, 'a refusal of the right pair'],
        [{...shotA.board, refused: {walls: notCert, why: judge(q, notCert)}}, 'a refusal missing a field'],
        [{...shotA.board, claimed: [cert[1], cert[0]]}, 'a claim out of order']
      );
      if (x.count) forged.push([{...shotA.board, claimed: cert}, 'Can’t on a word the room can make']);
    } else if (q.mode !== 'design') forged.push([{...b, claimed: null}, 'a claim field without Can’t']);
    for (const [board, why] of forged) { assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`); stats.forged++; }
  }
  return {puzzles: pack.puzzles.length, words, rectangleWords: rect, stretchedShots: stretched, ...stats};
}
export default validateAims;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateAims(), null, 2));
