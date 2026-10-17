// Checks the Ball triangles pack (dist/families/globe/globe.json) by methods
// unlike the mechanic's. The mechanic works in Q(√2, √3) as a + b√2 + c√3 +
// d√6, tests a corner by its squared cosine and an area by Van Oosterom and
// Strackee's formula. This file works in the same field through one
// generator, t = √2 + √3 with t⁴ = 10t² − 1, builds its sines and cosines by
// turning 45° back by 30°, tests a corner by its cotangent and an area by
// Girard's theorem (the three corners' turns multiplied together), and
// searches every placement and every triangle on the grid by brute force.
// It checks content fields and sources; every solution set; that on the grid
// only triangles with two right corners have every corner a whole number of
// degrees (all 3,032,624 triangles), so a set adding up to 180° or less is
// never made; hint chains from fresh, after a wrong move and after a wrong
// Can't; random Can't taps; Undo keeping made sets, claims and refusals with
// a visible change; illegal moves; forged saves; and the playground's
// covering counts. Run: node scripts/validate-globe.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';
import {solutionsOf, triangleFacts, cellsOf, covers, coverCounts} from '../dist/families/globe/globe.js';

// The table in docs/globe/README.md: solutions counted as labelled
// placements of the corners (per set, for sets; 0 for a set that can't be made).
const TABLE = {
  'globe-01': {level: 'easy', mode: 'right', count: 2},
  'globe-02': {level: 'easy', mode: 'fraction', steps: 4, count: 6},
  'globe-03': {level: 'easy', mode: 'records', counts: [4, 0]},
  'globe-04': {level: 'medium', mode: 'right', count: 2},
  'globe-05': {level: 'medium', mode: 'fraction', steps: 8, count: 624},
  'globe-06': {level: 'medium', mode: 'records', counts: [144, 144, 144]},
  'globe-07': {level: 'hard', mode: 'right', count: 8},
  'globe-08': {level: 'hard', mode: 'fraction', steps: 9, count: 624},
  'globe-09': {level: 'hard', mode: 'fraction', steps: 3, count: 16},
  'globe-10': {level: 'hard', mode: 'records', counts: [3744, 0, 3744]}
};

// --- Q(t), t = √2 + √3, t⁴ = 10t² − 1 ----------------------------------------
// An element is (c0 + c1 t + c2 t² + c3 t³) / 2^e with integer c; every
// coordinate here has a power of two below it.
const norm = ({c, e}) => {
  if (c.every(v => v === 0n)) return {c, e: 0};
  while (e > 0 && c.every(v => (v & 1n) === 0n)) { c = c.map(v => v >> 1n); e--; }
  return {c, e};
};
const el = (c, e = 0) => norm({c: [0, 1, 2, 3].map(i => BigInt(c[i] || 0)), e});
const ZERO = el([0]), ONE = el([1]);
function add(x, y) {
  const e = Math.max(x.e, y.e), sx = BigInt(e - x.e), sy = BigInt(e - y.e);
  return norm({c: x.c.map((v, i) => (v << sx) + (y.c[i] << sy)), e});
}
const neg = x => ({c: x.c.map(v => -v), e: x.e});
const sub = (x, y) => add(x, neg(y));
function mul(x, y) {
  const r = [0n, 0n, 0n, 0n, 0n, 0n, 0n];
  for (let i = 0; i < 4; i++) if (x.c[i]) for (let j = 0; j < 4; j++) r[i + j] += x.c[i] * y.c[j];
  // t⁴ = 10t² − 1, t⁵ = 10t³ − t, t⁶ = 99t² − 10.
  return norm({c: [r[0] - r[4] - 10n * r[6], r[1] - r[5], r[2] + 10n * r[4] + 99n * r[6], r[3] + 10n * r[5]], e: x.e + y.e});
}
const isZero = x => x.c.every(v => v === 0n);
const T = Math.SQRT2 + Math.sqrt(3);
const approx = x => (Number(x.c[0]) + T * (Number(x.c[1]) + T * (Number(x.c[2]) + T * Number(x.c[3])))) / 2 ** x.e;
// Newton's method from above settles on ⌊√n⌋.
function isqrt(n) { let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2)); for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; } }
const P = 400n, TP = isqrt(2n << (2n * P)) + isqrt(3n << (2n * P));
let slowSigns = 0;
function sign(x) {
  if (isZero(x)) return 0;
  const f = approx(x), scale = x.c.reduce((s, v, i) => s + Math.abs(Number(v)) * T ** i, 0) / 2 ** x.e;
  if (Math.abs(f) > 1e-9 * scale) return Math.sign(f);
  // t·2^P is known to within 2, so the sum below is (c0 + … + c3 t³)·2^(3P)
  // to within Σ|ci|·2i·4^(i−1)·2^(2P).
  slowSigns++;
  let v = 0n, err = 0n;
  for (let i = 0; i < 4; i++) { v += x.c[i] * TP ** BigInt(i) * (1n << (P * BigInt(3 - i))); err += (x.c[i] < 0n ? -x.c[i] : x.c[i]) * BigInt(2 * i) * 4n ** BigInt(Math.max(0, i - 1)); }
  err <<= 2n * P;
  assert.ok((v < 0n ? -v : v) > 2n * err, 'a sign is decided');
  return v > 0n ? 1 : -1;
}
const abs = x => sign(x) < 0 ? neg(x) : x;

// Sines and cosines of 15k°: 15° = 45° − 30°, then turned round 24 times.
const HALF = el([1], 1), R2H = el([0, -9, 0, 1], 2), R3H = el([0, 11, 0, -1], 2); // 1/2, √2/2, √3/2
const C15 = add(mul(R2H, R3H), mul(R2H, HALF)), S15 = sub(mul(R2H, R3H), mul(R2H, HALF));
const COS = [ONE], SIN = [ZERO];
for (let k = 1; k <= 24; k++) { COS.push(sub(mul(COS[k - 1], C15), mul(SIN[k - 1], S15))); SIN.push(add(mul(SIN[k - 1], C15), mul(COS[k - 1], S15))); }
const cosOf = d => COS[((d / 15) % 24 + 24) % 24], sinOf = d => SIN[((d / 15) % 24 + 24) % 24];

// --- The grid --------------------------------------------------------------------
const GRID = [[90, 0]];
for (let lat = 75; lat >= -75; lat -= 15) for (let lon = 0; lon < 360; lon += 15) GRID.push([lat, lon]);
GRID.push([-90, 0]);
const N = GRID.length, D = Math.PI / 180;
const keyOf = ([lat, lon]) => `${lat},${Math.abs(lat) === 90 ? 0 : ((lon % 360) + 360) % 360}`;
const INDEX = new Map(GRID.map((g, i) => [keyOf(g), i]));
const XV = GRID.map(([lat, lon]) => [mul(cosOf(lat), cosOf(lon)), mul(cosOf(lat), sinOf(lon)), sinOf(lat)]);
const FV = GRID.map(([lat, lon]) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)]);
const FDOT = new Float64Array(N * N);
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) FDOT[i * N + j] = FV[i][0] * FV[j][0] + FV[i][1] * FV[j][1] + FV[i][2] * FV[j][2];
const dotMemo = new Map();
function xdot(i, j) {
  const k = i < j ? i * N + j : j * N + i;
  if (!dotMemo.has(k)) { const a = XV[i], b = XV[j]; dotMemo.set(k, add(add(mul(a[0], b[0]), mul(a[1], b[1])), mul(a[2], b[2]))); }
  return dotMemo.get(k);
}
function xdet(i, j, k) {
  const [a, b, c] = [XV[i], XV[j], XV[k]];
  return add(sub(mul(a[0], sub(mul(b[1], c[2]), mul(b[2], c[1]))), mul(a[1], sub(mul(b[0], c[2]), mul(b[2], c[0])))), mul(a[2], sub(mul(b[0], c[1]), mul(b[1], c[0]))));
}
function fdet(i, j, k) {
  const [a, b, c] = [FV[i], FV[j], FV[k]];
  return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
}
// The corner at i between j and k: cos ∝ j·k − (i·j)(i·k), sin ∝ |det|.
const xcos = (i, j, k) => sub(xdot(j, k), mul(xdot(i, j), xdot(i, k)));
const fcorner = (i, j, k, det) => Math.atan2(Math.abs(det), FDOT[j * N + k] - FDOT[i * N + j] * FDOT[i * N + k]) / D;
// A corner is θ exactly when cot is cot θ: cos·sin θ = |det|·cos θ (θ strictly between 0° and 180°).
const cornerIs = (i, j, k, theta, y) => isZero(sub(mul(xcos(i, j, k), sinOf(theta)), mul(y, cosOf(theta))));
// Girard: the turns e^{iA}·e^{iB}·e^{iC} = e^{i(180° + E)}, where each turn is
// (cos + i|det|) over a positive real whose product is (1 − a·b²)(1 − b·c²)(1 − c·a²).
function excessIs(i, j, k, E, y) {
  const x1 = xcos(i, j, k), x2 = xcos(j, k, i), x3 = xcos(k, i, j), y2 = mul(y, y);
  const re = sub(mul(mul(x1, x2), x3), mul(y2, add(add(x1, x2), x3)));
  const im = sub(mul(y, add(add(mul(x1, x2), mul(x2, x3)), mul(x3, x1))), mul(y2, y));
  const sq = d => sub(ONE, mul(d, d)), S = mul(mul(sq(xdot(i, j)), sq(xdot(j, k))), sq(xdot(k, i)));
  return isZero(add(re, mul(S, cosOf(E)))) && isZero(add(im, mul(S, sinOf(E))));
}
const nearStep = (x, step, tol = 1e-7) => Math.abs(x - step * Math.round(x / step)) < tol;

function checkField() {
  for (let k = 0; k <= 24; k++) {
    assert.ok(Math.abs(approx(COS[k]) - Math.cos(15 * k * D)) < 1e-12 && Math.abs(approx(SIN[k]) - Math.sin(15 * k * D)) < 1e-12, `cos and sin of ${15 * k}°`);
    assert.ok(isZero(sub(add(mul(COS[k], COS[k]), mul(SIN[k], SIN[k])), ONE)), `cos² + sin² = 1 at ${15 * k}°`);
  }
  assert.ok(isZero(sub(COS[24], ONE)) && isZero(SIN[24]), 'twenty-four turns of 15° come back to the start');
  assert.ok(isZero(sub(mul(R2H, R2H), HALF)) && isZero(sub(mul(R3H, R3H), el([3], 2))), '√2/2 and √3/2 square correctly');
  for (const v of XV) assert.ok(isZero(sub(add(add(mul(v[0], v[0]), mul(v[1], v[1])), mul(v[2], v[2])), ONE)), 'every dot is on the unit ball');
  for (let i = 0; i < N; i++) for (const j of [0, 37, 133, N - 1]) assert.ok(Math.abs(approx(xdot(i, j)) - FDOT[i * N + j]) < 1e-12, 'exact and float dots agree');
  // Lagrange: cos² + det² = |i×j|²|i×k|², on a spread of triangles.
  for (let s = 0; s < 60; s++) {
    const i = (s * 37) % N, j = (s * 91 + 5) % N, k = (s * 53 + 11) % N;
    if (new Set([i, j, k]).size < 3) continue;
    const c = xcos(i, j, k), y = xdet(i, j, k), sq = d => sub(ONE, mul(d, d));
    assert.ok(isZero(sub(add(mul(c, c), mul(y, y)), mul(sq(xdot(i, j)), sq(xdot(i, k))))), 'Lagrange’s identity');
  }
}

// --- Every triangle on the grid --------------------------------------------------
// A float pass finds the triangles whose corners all sit within 1e-7° of a
// multiple of 15° and checks that no corner is that close to any other whole
// degree; the exact pass then confirms each corner and the area.
function everyTriangle() {
  const t0 = process.cpuUsage();
  let triangles = 0, flatTriples = 0, maxFlat = 0, minDet = Infinity, minExcess = Infinity, otherWhole = 0;
  const candidates = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) for (let k = j + 1; k < N; k++) {
    const det = fdet(i, j, k), y = Math.abs(det);
    if (y < 1e-9) { flatTriples++; maxFlat = Math.max(maxFlat, y); continue; }
    triangles++; minDet = Math.min(minDet, y);
    const A = fcorner(i, j, k, det), B = fcorner(j, k, i, det), C = fcorner(k, i, j, det);
    minExcess = Math.min(minExcess, A + B + C - 180);
    let fifteen = 0;
    for (const x of [A, B, C]) if (nearStep(x, 1)) { if (nearStep(x, 15)) fifteen++; else otherWhole++; }
    if (fifteen === 3) candidates.push([i, j, k, Math.round(A), Math.round(B), Math.round(C)]);
  }
  assert.equal(triangles, 3032624, 'every triangle of three dots');
  assert.ok(maxFlat < 1e-14 && minDet > 1e-4, `three dots on one great circle are told apart from a triangle (${maxFlat}, ${minDet})`);
  assert.equal(otherWhole, 0, 'no corner is a whole number of degrees other than a multiple of 15°');
  assert.ok(minExcess > 0.02, 'every triangle’s corners add up to more than 180°');
  // Exact: three dots on one great circle have det exactly 0 (a sample), and every candidate is exact.
  for (let s = 0, seen = 0; seen < 300 && s < 1e6; s++) {
    const i = (s * 7919) % N, j = (s * 104729 + 3) % N, k = (s * 1299709 + 7) % N;
    if (i === j || j === k || i === k || Math.abs(fdet(i, j, k)) >= 1e-9) continue;
    seen++; assert.ok(isZero(xdet(i, j, k)), 'three dots on one great circle have no triangle');
  }
  const types = new Map(), fifteen = [];
  for (const [i, j, k, A, B, C] of candidates) {
    const y = abs(xdet(i, j, k));
    assert.ok(cornerIs(i, j, k, A, y) && cornerIs(j, k, i, B, y) && cornerIs(k, i, j, C, y), `exact corners ${A}, ${B}, ${C}`);
    assert.ok(excessIs(i, j, k, A + B + C - 180, y), 'Girard’s area agrees with the corners');
    assert.ok([A, B, C].filter(x => x === 90).length >= 2, `only two right corners give corners that are all multiples of 15° (${A}, ${B}, ${C})`);
    const g = A + B + C - 180;
    types.set(g, (types.get(g) || 0) + 1);
    fifteen.push({v: [i, j, k], corners: [A, B, C]});
  }
  // Puzzle 7's note: each of the 528 triangles with three right corners has a corner on the equator.
  const octants = fifteen.filter(t => t.corners.every(c => c === 90));
  assert.equal(octants.length, 528, 'triangles with three right corners');
  assert.ok(octants.every(t => t.v.some(i => GRID[i][0] === 0)), 'every one has a corner on the equator');
  const cpu = process.cpuUsage(t0);
  return {triangles, flatTriples, fifteen, types: Object.fromEntries([...types].sort((m, n) => m[0] - n[0]).map(([g, n]) => [`${g},90,90`, n])), minExcess, ms: Math.round((cpu.user + cpu.system) / 1000)};
}

// --- Solutions by brute force ----------------------------------------------------
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const mapKey = (q, map) => q.letters.map(x => keyOf(map[x])).join(' ');
function placements(q) {
  const free = q.letters.filter(x => !q.locked.includes(x)), fixed = Object.fromEntries(q.locked.map(x => [x, INDEX.get(keyOf(q.start[x]))]));
  const out = [];
  const rec = (k, at) => {
    if (k === free.length) { out.push(q.letters.map(x => at[x])); return; }
    for (let i = 0; i < N; i++) rec(k + 1, {...at, [free[k]]: i});
  };
  rec(0, fixed);
  return out.filter(v => new Set(v).size === 3);
}
function bruteSolutions(p, every) {
  const q = p.parameters, keys = new Set();
  let nearMisses = 0;
  if (q.mode === 'records') {
    return q.records.map(r => {
      const want = [...r].sort().join(), set = new Set();
      for (const t of every.fifteen) {
        if ([...t.corners].sort().join() !== want) continue;
        for (const perm of PERMS) {
          const map = Object.fromEntries(q.letters.map((x, n) => [x, GRID[t.v[perm[n]]]]));
          if (q.locked.every(x => keyOf(map[x]) === keyOf(q.start[x]))) set.add(mapKey(q, map));
        }
      }
      return set;
    });
  }
  const steps = q.mode === 'fraction' ? 48 * q.fraction[0] / q.fraction[1] : null;
  for (const [i, j, k] of placements(q)) {
    const det = fdet(i, j, k);
    if (Math.abs(det) < 1e-9) continue;
    const A = fcorner(i, j, k, det), B = fcorner(j, k, i, det), C = fcorner(k, i, j, det);
    const y = () => abs(xdet(i, j, k));
    let ok = false;
    if (q.mode === 'right') { if ([A, B, C].every(x => Math.abs(x - 90) < 1e-7)) { ok = cornerIs(i, j, k, 90, y()) && cornerIs(j, k, i, 90, y()) && cornerIs(k, i, j, 90, y()); nearMisses += !ok; } }
    else if (Math.abs(A + B + C - 180 - 15 * steps) < 1e-7) { ok = excessIs(i, j, k, 15 * steps, y()); nearMisses += !ok; }
    if (ok) keys.add(q.letters.map((x, n) => keyOf(GRID[[i, j, k][n]])).join(' '));
  }
  assert.equal(nearMisses, 0, `${p.id}: no placement is within 1e-7° of the goal without reaching it`);
  return keys;
}

// --- Playing ---------------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const undoCarry = (p, a) => { const back = undo(a), carry = mechanicFor(p).carry; return carry ? {...back, board: carry(p, a.board, back.board)} : back; };
const made = b => b.built.map(e => e.record);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 30; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: hint words`);
    if (h.action.type === 'cant') {
      const r = p.parameters.records[h.action.record];
      assert.ok(a.board.tried, `${p.id} ${label}: Can’t is hinted only after an attempt`);
      assert.ok(r.reduce((s, x) => s + x, 0) <= 180, `${p.id} ${label}: Can’t is hinted only for a set adding up to 180° or less`);
      assert.match(h.text, /add up to \d+°\. Every triangle you make adds up to more\./, `${p.id} ${label}: the reason comes with the Can’t hint`);
      assert.ok(p.parameters.records.every((s, i) => made(a.board).includes(i) || a.board.cant.includes(i) || s.reduce((m, x) => m + x, 0) <= 180), `${p.id} ${label}: Can’t is hinted once every set that can be made is made`);
    } else assert.ok(!/Can’t/.test(h.text), `${p.id} ${label}: a move hint does not mention Can’t`);
    const before = a;
    a = play(p, a, h.action);
    // Undo always changes the board, and keeps what was made, claimed or refused.
    const back = undoCarry(p, a);
    assert.notDeepEqual(back.board, a.board, `${p.id} ${label}: Undo changes the board`);
    if (p.parameters.mode === 'records') {
      assert.deepEqual(made(back.board), made(a.board), `${p.id} ${label}: Undo keeps the sets made`);
      assert.deepEqual(back.board.cant, a.board.cant, `${p.id} ${label}: Undo keeps right claims`);
      assert.ok(validBoard(p, back.board), `${p.id} ${label}: the board after Undo is valid`);
      assert.deepEqual(back.board.corners, before.board.corners, `${p.id} ${label}: Undo puts the corners back`);
    }
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// The first legal move of a free corner (in grid order) that leaves the puzzle unsolved and, for sets, makes none.
function wrongMove(p, a) {
  const q = p.parameters;
  for (const x of q.letters.filter(y => !q.locked.includes(y))) for (const to of GRID) {
    const next = move(p, a, {type: 'place', corner: x, to});
    if (next && !isSolved(p, next.board) && (q.mode !== 'records' || made(next.board).length === made(a.board).length)) return {action: {type: 'place', corner: x, to}, next};
  }
  throw Error(`${p.id}: no wrong move`);
}

function checkPlacements(p, row, every) {
  const q = p.parameters, fresh = freshAttempt(p), mine = bruteSolutions(p, every);
  const theirs = new Set(solutionsOf(p).map(m => mapKey(q, m)));
  assert.equal(mine.size, row.count, `${p.id}: ${mine.size} solutions by brute force`);
  assert.deepEqual([...theirs].sort(), [...mine].sort(), `${p.id}: the mechanic finds the same solutions`);
  assert.equal(p.solution.count, row.count, `${p.id}: the pack’s count`);
  if (q.mode === 'fraction') assert.equal(48 * q.fraction[0] / q.fraction[1], row.steps, `${p.id}: the fraction is ${row.steps} steps of 15°`);
  // Each solution is solved as a board; a near one is not.
  for (const key of [...mine].slice(0, 12)) {
    const corners = Object.fromEntries(q.letters.map((x, n) => { const [lat, lon] = key.split(' ')[n].split(',').map(Number); return [x, [lat, lon]]; }));
    assert.ok(isSolved(p, {corners}), `${p.id}: ${key} solves`);
  }
  assert.equal(nextHint(p, fresh).action.type, 'place', `${p.id}: the first hint moves a corner`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  const wrong = wrongMove(p, fresh);
  steps += hintsSolve(p, wrong.next, 'after a wrong move');
  refuse(p, fresh, {type: 'cant', record: 0}, 'Can’t, which this puzzle has not');
  refuse(p, fresh, {type: 'pair', corner: q.letters[0]}, 'a lune pair outside the playground');
  forgeries(p, fresh.board, [
    [{...fresh.board, done: true}, 'a forged done'],
    [{...fresh.board, built: []}, 'sets in a puzzle without them']
  ]);
  return steps;
}

function checkRecords(p, row, every, shares) {
  const q = p.parameters, fresh = freshAttempt(p), mine = bruteSolutions(p, every), theirs = solutionsOf(p);
  assert.deepEqual(mine.map(s => s.size), row.counts, `${p.id}: solutions for each set by brute force`);
  q.records.forEach((r, i) => {
    assert.deepEqual(theirs[i].map(m => mapKey(q, m)).sort(), [...mine[i]].sort(), `${p.id}: the mechanic finds the same triangles for ${r}`);
    const flat = r.reduce((s, x) => s + x, 0) <= 180;
    assert.equal(flat, mine[i].size === 0, `${p.id}: ${r} can’t be made exactly when it adds up to 180° or less`);
    assert.deepEqual(p.solution.records[i], flat ? {cant: true, sum: r.reduce((s, x) => s + x, 0)} : {witness: p.solution.records[i].witness, count: row.counts[i]}, `${p.id}: the pack’s solution for ${r}`);
  });
  assert.equal(nextHint(p, fresh).action.type, 'place', `${p.id}: the first hint moves a corner`);
  // Can't waits for an attempt.
  for (let i = 0; i < q.records.length; i++) refuse(p, fresh, {type: 'cant', record: i}, 'Can’t on a fresh board');
  let steps = hintsSolve(p, fresh, 'from fresh');
  const wrong = wrongMove(p, fresh), tried = wrong.next;
  steps += hintsSolve(p, tried, 'after a wrong move');
  // Random Can't taps at the first chance: each open set tapped once.
  const open = q.records.map((r, i) => i).filter(i => !made(tried.board).includes(i));
  const right = open.filter(i => move(p, tried, {type: 'cant', record: i}).board.cant.includes(i));
  shares[p.id] = `${right.length}/${open.length}`;
  assert.ok(right.length < open.length, `${p.id}: a random Can’t tap can fail`);
  // A wrong Can't: one short refusal, kept through Undo until a corner moves; hints still solve.
  const bad = open.find(i => !right.includes(i));
  const told = play(p, tried, {type: 'cant', record: bad});
  assert.equal(told.board.refused, bad, `${p.id}: the refusal names the set`);
  assert.equal(told.board.told, true, `${p.id}: There is a way.`);
  assert.deepEqual(told.board.cant, [], `${p.id}: a wrong claim records nothing`);
  for (let i = 0; i < q.records.length; i++) refuse(p, told, {type: 'cant', record: i}, 'a second Can’t before a corner moves');
  const kept = undoCarry(p, told);
  assert.equal(kept.board.refused, bad, `${p.id}: Undo keeps the refusal`);
  assert.equal(kept.board.told, false, `${p.id}: Undo takes the words away, so the board changes`);
  assert.ok(validBoard(p, kept.board), `${p.id}: the kept refusal is a valid board`);
  for (let i = 0; i < q.records.length; i++) refuse(p, kept, {type: 'cant', record: i}, 'Can’t after Undo while the corners stay');
  steps += hintsSolve(p, told, 'after a wrong Can’t');
  steps += hintsSolve(p, kept, 'after Undo of a wrong Can’t');
  // A right Can't, then Undo: the claim stays, the drawing goes.
  for (const i of right) {
    const c = play(p, tried, {type: 'cant', record: i});
    assert.equal(c.board.shown, i, `${p.id}: the argument is drawn for ${q.records[i]}`);
    const back = undoCarry(p, c);
    assert.deepEqual(back.board.cant, [i], `${p.id}: Undo keeps a right claim`);
    assert.equal(back.board.shown, null, `${p.id}: Undo takes the drawing away`);
    refuse(p, c, {type: 'cant', record: i}, 'the same claim twice');
  }
  // Making a set, then Undo: the set stays made, the corners go back.
  const witness = theirs.findIndex(s => s.length);
  if (witness >= 0) {
    const target = theirs[witness][0];
    let a = tried;
    for (const x of q.letters) if (keyOf(a.board.corners[x]) !== keyOf(target[x])) { const n = move(p, a, {type: 'place', corner: x, to: target[x]}); if (n) a = n; }
    if (made(a.board).includes(witness)) {
      const back = undoCarry(p, a);
      assert.ok(made(back.board).includes(witness), `${p.id}: Undo keeps a set made`);
      for (let i = 0; i < q.records.length; i++) if (made(a.board).includes(i)) refuse(p, a, {type: 'cant', record: i}, 'Can’t on a set already made');
    }
  }
  refuse(p, tried, {type: 'cant', record: q.records.length}, 'a set that is not there');
  refuse(p, tried, {type: 'cant', record: '0'}, 'a set named by a string');
  // Forged saves.
  const target = theirs.find(s => s.length)[0], wit = theirs.findIndex(s => s.length), flatIndex = q.records.findIndex(r => r.reduce((s, x) => s + x, 0) <= 180);
  const t = tried.board, other = q.records.findIndex((r, i) => i !== wit && theirs[i].length);
  const forged = [
    [{...t, done: true}, 'a forged done'],
    [{...t, built: [{record: wit, corners: t.corners}]}, 'a set made with corners that don’t make it'],
    [{...t, built: [wit]}, 'a set made without its corners'],
    [{...t, built: [{record: wit, corners: target}, {record: wit, corners: target}]}, 'a set made twice'],
    [{...t, cant: [wit]}, 'a claim on a set that can be made'],
    [{...fresh.board, built: [{record: wit, corners: target}]}, 'a set made before any move'],
    [{...fresh.board, cant: flatIndex >= 0 ? [flatIndex] : [0]}, 'a claim before any move'],
    [{...t, refused: flatIndex >= 0 ? flatIndex : q.records.length}, 'a refusal of a set that can’t be made'],
    [{...t, told: true}, 'There is a way. without a refusal'],
    [{...t, shown: 0}, 'an argument for a set not claimed'],
    [{...t, corners: target}, 'corners that make a set not recorded'],
    [{...t, tried: 'yes'}, 'a tried flag that is not true or false']
  ];
  if (other >= 0) forged.push([{...t, built: [{record: other, corners: target}]}, 'corners that make a different set']);
  forgeries(p, t, forged);
  // A full forged shelf is still checked: made sets need their own corners.
  const allMade = {...t, corners: target, built: q.records.map((r, i) => theirs[i].length ? {record: i, corners: theirs[i][0]} : null).filter(Boolean), cant: q.records.map((r, i) => i).filter(i => !theirs[i].length)};
  const solvedForge = isSolved(p, allMade);
  assert.ok(validBoard(p, allMade) && solvedForge, `${p.id}: a shelf whose every set carries corners that make it is a real solve`);
  forgeries(p, t, [[{...allMade, built: allMade.built.map(e => ({...e, corners: t.corners}))}, 'a full shelf without the corners that make it']]);
  return steps;
}

function forgeries(p, board, list) {
  const q = p.parameters, x = q.letters.find(y => !q.locked.includes(y)), lockedX = q.locked[0];
  const base = [
    [null, 'no board'], [[], 'a list'], ['x', 'a word'], [{}, 'an empty board'],
    [{...board, corners: {...board.corners, [x]: [10, 0]}}, 'a corner off the dots'],
    [{...board, corners: {...board.corners, [x]: [0, 7.5]}}, 'a corner between dots'],
    [{...board, corners: {...board.corners, [x]: [105, 0]}}, 'a corner past the pole'],
    [{...board, corners: {...board.corners, [x]: [...board.corners[q.letters.find(y => y !== x)]]}}, 'two corners on one dot'],
    [{...board, corners: Object.fromEntries(Object.entries(board.corners).filter(([y]) => y !== x))}, 'a missing corner'],
    [{...board, corners: {...board.corners, Z: [0, 0]}}, 'an extra corner']
  ];
  if (lockedX) base.push([{...board, corners: {...board.corners, [lockedX]: lockedX === 'N' ? [75, 0] : [-30, 180]}}, 'a corner that stays put, moved']);
  // Three dots on one great circle, and two opposite.
  const [l0, l1] = q.letters.filter(y => y !== x);
  const p0 = board.corners[l0], opp = [-p0[0], Math.abs(p0[0]) === 90 ? 0 : (p0[1] + 180) % 360];
  base.push([{...board, corners: {...board.corners, [x]: opp}}, 'a corner opposite another']);
  for (const [b, why] of [...base, ...list]) assert.equal(validBoard(p, b), false, `${p.id}: rejects ${why}`);
}

function checkMoves(p) {
  const q = p.parameters, fresh = freshAttempt(p), x = q.letters.find(y => !q.locked.includes(y));
  for (const y of q.locked) refuse(p, fresh, {type: 'place', corner: y, to: [15, 15]}, `moving ${y}, which stays put`);
  refuse(p, fresh, {type: 'place', corner: x, to: fresh.board.corners[x]}, 'a move to where the corner is');
  refuse(p, fresh, {type: 'place', corner: x, to: [10, 0]}, 'a move off the dots');
  refuse(p, fresh, {type: 'place', corner: x, to: [90, 15]}, 'the pole at a second longitude');
  refuse(p, fresh, {type: 'place', corner: 'Q', to: [15, 15]}, 'an unknown corner');
  refuse(p, fresh, {type: 'place', corner: x, to: fresh.board.corners[q.letters.find(y => y !== x)]}, 'a move onto another corner');
  refuse(p, fresh, {type: 'fly'}, 'an unknown move');
  refuse(p, fresh, null, 'no move');
  // Moves that would leave no triangle: onto the great circle of the other two, or opposite one.
  const [l0, l1] = q.letters.filter(y => y !== x), i0 = INDEX.get(keyOf(fresh.board.corners[l0])), i1 = INDEX.get(keyOf(fresh.board.corners[l1]));
  const onCircle = GRID.findIndex((g, k) => k !== i0 && k !== i1 && isZero(xdet(i0, i1, k)));
  if (onCircle >= 0) refuse(p, fresh, {type: 'place', corner: x, to: GRID[onCircle]}, 'three corners on one great circle');
  const p0 = fresh.board.corners[l0];
  refuse(p, fresh, {type: 'place', corner: x, to: [-p0[0], Math.abs(p0[0]) === 90 ? 0 : (p0[1] + 180) % 360]}, 'a corner opposite another');
}

// --- The playground ----------------------------------------------------------------
// A cell's middle is in the lune pair at A when it is on the same side of the
// great circle AB as C and on the same side of AC as B, or on the other side of both.
function checkPlayground(p) {
  const q = p.parameters, fresh = freshAttempt(p);
  assert.equal(mechanicFor(p).noHint?.(p), true, 'the playground has no hints');
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vec = ([lat, lon]) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
  const area = vs => { const [a, b, c] = vs, det = Math.abs(dot(a, cross(b, c))); return 2 * Math.atan2(det, 1 + dot(a, b) + dot(b, c) + dot(c, a)) / (4 * Math.PI); };
  const triangles = [[[90, 0], [0, 0], [0, 90]], [[30, 0], [15, 45], [-15, 30]], [[60, 30], [0, 0], [-15, 120]], [[75, 300], [15, 15], [45, 90]]];
  for (const pts of triangles) {
    const V = pts.map(vec), cells = cellsOf(pts);
    const f = area(V);
    for (let mask = 0; mask < 8; mask++) {
      const pairs = [0, 1, 2].filter(i => mask >> i & 1), counts = coverCounts(pairs);
      cells.forEach((cell, n) => {
        const m = cell.verts.map(vec).reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
        const mine = pairs.filter(i => {
          const a = V[i], b = V[(i + 1) % 3], c = V[(i + 2) % 3], nb = cross(a, b), nc = cross(a, c);
          return Math.sign(dot(m, nb) * dot(c, nb)) === Math.sign(dot(m, nc) * dot(b, nc));
        }).length;
        assert.equal(counts[n], mine, `playground: the count on region ${cell.signs.join('')} with pairs ${pairs}`);
        assert.equal(counts[n], pairs.filter(i => covers(i, cell.signs)).length, 'playground: counts agree with the cover test');
      });
      if (mask === 7) {
        assert.deepEqual(counts, [3, 1, 1, 1, 1, 1, 1, 3], 'playground: the triangle and its opposite are covered three times, every other region once');
        const total = cells.reduce((s, cell, n) => s + counts[n] * area(cell.verts.map(vec)), 0);
        assert.ok(Math.abs(total - (1 + 4 * f)) < 1e-9, 'playground: the three pairs cover 1 + 4f of the ball');
        const sum = cells.reduce((s, cell) => s + area(cell.verts.map(vec)), 0);
        assert.ok(Math.abs(sum - 1) < 1e-9, 'playground: the eight regions cover the ball once');
      }
    }
  }
  let a = fresh;
  a = play(p, a, {type: 'pair', corner: 'A'});
  assert.deepEqual(a.board.pairs, ['A']);
  a = play(p, a, {type: 'pair', corner: 'C'});
  a = play(p, a, {type: 'pair', corner: 'B'});
  assert.deepEqual(a.board.pairs, ['A', 'B', 'C'], 'pairs are kept in letter order');
  a = play(p, a, {type: 'pair', corner: 'B'});
  assert.deepEqual(a.board.pairs, ['A', 'C'], 'a second tap takes a pair away');
  a = play(p, a, {type: 'place', corner: 'A', to: [60, 15]});
  assert.ok(!isSolved(p, a.board), 'the playground is never solved');
  refuse(p, fresh, {type: 'pair', corner: 'Z'}, 'an unknown pair');
  refuse(p, fresh, {type: 'cant', record: 0}, 'Can’t in the playground');
  forgeries(p, fresh.board, [
    [{...fresh.board, pairs: ['A', 'A']}, 'a pair twice'],
    [{...fresh.board, pairs: ['Q']}, 'an unknown pair'],
    [{...fresh.board, done: true}, 'a forged done']
  ]);
  checkMoves(p);
}

export async function validateGlobe() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/globe/globe.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind && s.id); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-61')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-61.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'globe');
  assert.ok(pack.families[0].sourceIds.every(id => pack.sources.some(s => s.id === id)), 'family sources');
  checkField();
  const every = everyTriangle();
  const playground = pack.puzzles.find(p => p.band === 'playground'), puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.ok(playground, 'a playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  let hintSteps = 0;
  const shares = {};
  for (const p of [playground, ...puzzles]) {
    const q = p.parameters;
    assert.equal(p.mechanic, 'globe');
    assert.equal(p.familyTitle, 'Ball triangles');
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.match(p.controls, /^A side is the shortest way between two corners/, `${p.id}: How to play opens with the mathematics`);
    assert.match(p.provenance, /Week 61|new/i, `${p.id}: provenance names its source`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    assert.ok(!/can.t|press/i.test(p.hints[0]), `${p.id}: the first hint is not a claim`);
    assert.ok(!/\b(can.t|none|impossible|only)\b/i.test(p.title), `${p.id}: the title does not give the answer away`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    assert.ok(q.letters.every(x => INDEX.has(keyOf(q.start[x]))), `${p.id}: the corners start on dots`);
    assert.ok(q.locked.every(x => q.letters.includes(x)), `${p.id}: locked corners are corners`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (p === playground) { checkPlayground(p); continue; }
    const row = TABLE[p.id];
    assert.equal(p.band, 'all');
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    assert.equal(q.mode, row.mode, `${p.id}: mode`);
    checkMoves(p);
    hintSteps += q.mode === 'records' ? checkRecords(p, row, every, shares) : checkPlacements(p, row, every);
    // The mechanic's corners on the solutions agree with the exact cotangent test.
    for (const m of solutionsOf(p).flat().slice(0, 40)) {
      const v = q.letters.map(x => INDEX.get(keyOf(m[x]))), det = fdet(...v), y = abs(xdet(...v)), facts = triangleFacts(q.letters.map(x => m[x]));
      facts.corners.forEach((c, n) => {
        const [i, j, k] = [v[n], v[(n + 1) % 3], v[(n + 2) % 3]], f = fcorner(i, j, k, det);
        if (c.deg !== null) assert.ok(cornerIs(i, j, k, c.deg, y), `${p.id}: the card’s ${c.deg}° is exact`);
        else assert.ok(!nearStep(f, 15), `${p.id}: a card marked ≈ is not a multiple of 15°`);
      });
    }
  }
  return {puzzles: puzzles.length, triangles: every.triangles, allMultiplesOf15: every.fifteen.length, types: every.types, smallestExcess: Number(every.minExcess.toFixed(4)), randomCantTaps: shares, hintSteps, slowSigns, triangleCpuMs: every.ms};
}
export default validateGlobe;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateGlobe(), null, 2));
