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
// never made, and that no other corner prints as a whole number after ≈;
// that no straight run of one corner from a fraction puzzle's start passes an
// answer; hint chains from fresh, after a wrong move and after a wrong Can't;
// random Can't taps counted with retries (a wrong one ends the attempt, so
// there are none) and the share of states with one set left to claim; Undo
// keeping made sets and claims, never stepping back over an ended attempt,
// and visibly changing the board at every step of random walks; illegal
// moves; forged saves; and the playground's covering counts.
// Run: node scripts/validate-globe.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';
import {solutionsOf, triangleFacts, cellsOf, covers, coverCounts, approxText} from '../dist/families/globe/globe.js';

// The table in docs/globe/README.md: solutions counted as labelled
// placements of the corners (per set, for sets; 0 for a set that can't be made).
const TABLE = {
  'globe-01': {level: 'easy', mode: 'right', count: 2},
  'globe-02': {level: 'easy', mode: 'fraction', steps: 4, count: 6},
  'globe-03': {level: 'easy', mode: 'records', counts: [4, 0, 4]},
  'globe-04': {level: 'medium', mode: 'right', count: 2},
  'globe-05': {level: 'medium', mode: 'fraction', steps: 8, count: 624},
  'globe-06': {level: 'medium', mode: 'records', counts: [144, 144, 144]},
  'globe-07': {level: 'hard', mode: 'right', count: 8},
  'globe-08': {level: 'hard', mode: 'fraction', steps: 9, count: 72},
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
  let triangles = 0, flatTriples = 0, maxFlat = 0, minDet = Infinity, minExcess = Infinity, otherWhole = 0, nearWhole = {off: Infinity, x: null};
  const candidates = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) for (let k = j + 1; k < N; k++) {
    const det = fdet(i, j, k), y = Math.abs(det);
    if (y < 1e-9) { flatTriples++; maxFlat = Math.max(maxFlat, y); continue; }
    triangles++; minDet = Math.min(minDet, y);
    const A = fcorner(i, j, k, det), B = fcorner(j, k, i, det), C = fcorner(k, i, j, det);
    minExcess = Math.min(minExcess, A + B + C - 180);
    let fifteen = 0;
    for (const x of [A, B, C]) {
      if (nearStep(x, 1)) { if (nearStep(x, 15)) fifteen++; else otherWhole++; }
      else { const off = Math.abs(x - Math.round(x)); if (off < nearWhole.off) nearWhole = {off, x}; }
    }
    if (fifteen === 3) candidates.push([i, j, k, Math.round(A), Math.round(B), Math.round(C)]);
  }
  assert.equal(triangles, 3032624, 'every triangle of three dots');
  assert.ok(maxFlat < 1e-14 && minDet > 1e-4, `three dots on one great circle are told apart from a triangle (${maxFlat}, ${minDet})`);
  assert.equal(otherWhole, 0, 'no corner is a whole number of degrees other than a multiple of 15°');
  // Every inexact corner prints with at most two decimals, never a whole number after ≈: the corner nearest a
  // whole number is told in words, on the right side of it, and two decimals print no whole number from 0.005 off.
  const near = approxText(nearWhole.x), n = Math.round(nearWhole.x);
  assert.equal(near, `just ${nearWhole.x < n ? 'under' : 'over'} ${n}°`, `the corner nearest a whole number in words (${nearWhole.x})`);
  for (const x of [n - 0.0051, n + 0.0051, n - 0.051, n + 0.049, n + 0.5]) assert.match(approxText(x), /^≈\d+\.(\d?[1-9]|[1-9]\d?)°$|^just (under|over) \d+°$/, `at most two decimals, never a whole number (${x})`);
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
  return {triangles, flatTriples, fifteen, types: Object.fromEntries([...types].sort((m, n) => m[0] - n[0]).map(([g, n]) => [`${g},90,90`, n])), minExcess, nearWhole, ms: Math.round((cpu.user + cpu.system) / 1000)};
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
// Undo as the app does it: only with history and without noUndo, then carry.
const undoCarry = (p, a) => { const m = mechanicFor(p); if (!a.history.length || m.noUndo?.(p)) return a; const back = undo(a); return m.carry ? {...back, board: m.carry(p, a.board, back.board)} : back; };
const made = b => b.built.map(e => e.record);
const sum = r => r.reduce((s, x) => s + x, 0);
const atStart = (p, b) => p.parameters.letters.every(x => keyOf(b.corners[x]) === keyOf(p.parameters.start[x]));
const openSets = (p, b) => p.parameters.records.map((r, i) => i).filter(i => !made(b).includes(i) && !b.cant.includes(i));
const drawn = (p, a) => mechanicFor(p).render(p, a);
// A move that ends an attempt (a wrong Can't) or starts a fresh one (Again) keeps no history.
function checkSealed(p, a, label) {
  assert.equal(a.history.length, 0, `${p.id} ${label}: no history, so Undo can’t step back over the end`);
  assert.equal(mechanicFor(p).noUndo?.(p), true, `${p.id} ${label}: Undo is off`);
  assert.equal(undoCarry(p, a), a, `${p.id} ${label}: Undo does nothing`);
}
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 30; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: hint words`);
    if (h.action.type === 'cant') {
      const r = p.parameters.records[h.action.record];
      assert.ok(!atStart(p, a.board), `${p.id} ${label}: Can’t is hinted only after an attempt`);
      assert.ok(sum(r) <= 180, `${p.id} ${label}: Can’t is hinted only for a set adding up to 180° or less`);
      assert.match(h.text, /add up to \d+°\. Every triangle you make adds up to more\./, `${p.id} ${label}: the reason comes with the Can’t hint`);
      assert.ok(p.parameters.records.every((s, i) => made(a.board).includes(i) || a.board.cant.includes(i) || sum(s) <= 180), `${p.id} ${label}: Can’t is hinted once every set that can be made is made`);
    } else if (h.action.type === 'again') assert.notEqual(a.board.over, null, `${p.id} ${label}: Again is hinted only after a wrong Can’t`);
    else assert.ok(!/Can’t/.test(h.text), `${p.id} ${label}: a move hint does not mention Can’t`);
    const before = a;
    a = play(p, a, h.action);
    if (h.action.type === 'again') { assert.deepEqual(a.board, freshAttempt(p).board, `${p.id} ${label}: Again starts afresh`); checkSealed(p, a, `${label}, after Again`); continue; }
    assert.ok(p.parameters.mode !== 'records' || a.board.over === null, `${p.id} ${label}: a hint never ends the attempt`);
    // Undo always changes the board, and keeps what was made or claimed.
    const back = undoCarry(p, a);
    assert.notDeepEqual(back.board, a.board, `${p.id} ${label}: Undo changes the board`);
    assert.notEqual(drawn(p, back), drawn(p, a), `${p.id} ${label}: Undo changes the picture`);
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
// Straight runs: one free corner moved a dot at a time north, south, east or
// west from the start (over a pole and down the other side, as the arrow keys
// go). Returns the runs that pass an answer, as "B east 2".
function straightRuns(p, keys) {
  const q = p.parameters, out = [];
  const stepOf = ([lat, lon], [dl, dn]) => { const n = lat + dl; if (Math.abs(lat) === 90) return null; return Math.abs(n) > 90 ? null : Math.abs(n) === 90 ? [n, 0] : [n, ((lon + dn) % 360 + 360) % 360]; };
  for (const x of q.letters.filter(y => !q.locked.includes(y))) for (const [d, v] of Object.entries({north: [15, 0], south: [-15, 0], east: [0, 15], west: [0, -15]})) {
    let at = q.start[x];
    for (let k = 1; k < 24; k++) {
      at = stepOf(at, v);
      if (!at || keyOf(at) === keyOf(q.start[x])) break;
      const map = {...q.start, [x]: at};
      if (keys.has(mapKey(q, map))) { out.push(`${x} ${d} ${k}`); break; }
    }
  }
  return out;
}

function checkPlacements(p, row, every, runs) {
  const q = p.parameters, fresh = freshAttempt(p), mine = bruteSolutions(p, every);
  const theirs = new Set(solutionsOf(p).map(m => mapKey(q, m)));
  assert.equal(mine.size, row.count, `${p.id}: ${mine.size} solutions by brute force`);
  assert.deepEqual([...theirs].sort(), [...mine].sort(), `${p.id}: the mechanic finds the same solutions`);
  assert.equal(p.solution.count, row.count, `${p.id}: the pack’s count`);
  if (q.mode === 'fraction') {
    assert.equal(48 * q.fraction[0] / q.fraction[1], row.steps, `${p.id}: the fraction is ${row.steps} steps of 15°`);
    // A child sweeping one corner along a line from the start, dot by dot, never walks into the answer.
    runs[p.id] = straightRuns(p, mine);
    assert.deepEqual(runs[p.id], [], `${p.id}: no straight run of one corner from the start passes an answer`);
  }
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
  refuse(p, fresh, {type: 'again'}, 'Again, which this puzzle has not');
  refuse(p, fresh, {type: 'pair', corner: q.letters[0]}, 'a lune pair outside the playground');
  forgeries(p, fresh.board, [
    [{...fresh.board, done: true}, 'a forged done'],
    [{...fresh.board, built: []}, 'sets in a puzzle without them']
  ]);
  return steps;
}

// A random claimer, with retries: at each chance it taps one open set; a
// right claim is followed by a wiggle (a move that makes nothing) and the
// next claim. Every tap sequence is followed to its end: all the sets that
// can't be made claimed (a right run), or a wrong claim, which ends the
// attempt and leaves no retry in it.
function claimRuns(p, a) {
  const q = p.parameters;
  let right = 0, runs = 0;
  for (const i of openSets(p, a.board)) {
    const next = play(p, a, {type: 'cant', record: i});
    if (next.board.over !== null) {
      runs++;
      assert.equal(next.board.over, i, `${p.id}: the wrong claim is recorded`);
      checkSealed(p, next, 'after a wrong Can’t');
      for (const x of q.letters) for (const to of [[15, 15], [-30, 105], [0, 135]]) refuse(p, next, {type: 'place', corner: x, to}, 'a move after a wrong Can’t');
      for (let j = 0; j < q.records.length; j++) refuse(p, next, {type: 'cant', record: j}, 'a retry after a wrong Can’t');
      continue;
    }
    if (!openSets(p, next.board).some(j => sum(q.records[j]) <= 180)) { right++; runs++; continue; }
    const deeper = claimRuns(p, wrongMove(p, next).next);
    right += deeper.right; runs += deeper.runs;
  }
  return {right, runs};
}
// States of a shelf with Can't open: each set that can be made, made or not,
// and each that can't, claimed or not, short of a solve. Forced: one set left,
// so a claim has one tap; forced right: that set is one that can't be made.
function forcedShare(p) {
  const q = p.parameters, sets = q.records.map((r, i) => i), flats = sets.filter(i => sum(q.records[i]) <= 180);
  let states = 0, forced = 0, forcedRight = 0;
  for (let mask = 0; mask < 1 << sets.length; mask++) {
    const done = sets.filter(i => mask >> i & 1);
    if (done.length === sets.length) continue;
    states++;
    const open = sets.filter(i => !done.includes(i));
    if (open.length === 1) { forced++; if (flats.includes(open[0])) forcedRight++; }
  }
  return {states, forced, forcedRight};
}
// Random walks of moves, right claims and Undos, then Undo all the way back:
// every Undo changes the board and the picture, keeps what was made and
// claimed, and the history never holds an ended attempt.
function undoWalks(p, walks = 12, length = 14) {
  const q = p.parameters, free = q.letters.filter(x => !q.locked.includes(x));
  let seed = 61, undos = 0;
  const rand = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * n); };
  for (let w = 0; w < walks; w++) {
    let a = freshAttempt(p);
    for (let k = 0; k < length && !isSolved(p, a.board); k++) {
      const flats = openSets(p, a.board).filter(i => sum(q.records[i]) <= 180), roll = rand(10);
      let next = null;
      if (roll < 2 && a.history.length) { next = undoCarry(p, a); assert.notEqual(drawn(p, next), drawn(p, a), `${p.id}: Undo mid-walk changes the picture`); undos++; }
      else if (roll < 4 && flats.length && !atStart(p, a.board)) next = move(p, a, {type: 'cant', record: flats[rand(flats.length)]});
      else if (roll < 5) { const sols = solutionsOf(p).flat(), s = sols[rand(sols.length)], x = free[rand(free.length)]; next = move(p, a, {type: 'place', corner: x, to: s[x]}); }
      else { const x = free[rand(free.length)], at = a.board.corners[x], nb = GRID.filter(g => keyOf(g) !== keyOf(at) && Math.abs(g[0] - at[0]) <= 15 && (Math.abs(g[0]) === 90 || Math.abs(at[0]) === 90 || Math.abs(((g[1] - at[1]) % 360 + 540) % 360 - 180) <= 15)); next = move(p, a, {type: 'place', corner: x, to: nb[rand(nb.length)]}); }
      if (next) a = next;
    }
    for (const h of a.history) assert.equal(h.board.over, null, `${p.id}: the history never holds an ended attempt`);
    while (a.history.length) {
      const back = undoCarry(p, a);
      assert.notDeepEqual(back.board, a.board, `${p.id}: every Undo changes the board`);
      assert.notEqual(drawn(p, back), drawn(p, a), `${p.id}: every Undo changes the picture`);
      assert.deepEqual(made(back.board), made(a.board), `${p.id}: Undo keeps the sets made`);
      assert.deepEqual(back.board.cant, a.board.cant, `${p.id}: Undo keeps right claims`);
      assert.ok(validBoard(p, back.board), `${p.id}: the board after Undo is valid`);
      a = back; undos++;
    }
  }
  return undos;
}

function checkRecords(p, row, every, shares) {
  const q = p.parameters, fresh = freshAttempt(p), mine = bruteSolutions(p, every), theirs = solutionsOf(p);
  assert.deepEqual(mine.map(s => s.size), row.counts, `${p.id}: solutions for each set by brute force`);
  q.records.forEach((r, i) => {
    assert.deepEqual(theirs[i].map(m => mapKey(q, m)).sort(), [...mine[i]].sort(), `${p.id}: the mechanic finds the same triangles for ${r}`);
    const flat = sum(r) <= 180;
    assert.equal(flat, mine[i].size === 0, `${p.id}: ${r} can’t be made exactly when it adds up to 180° or less`);
    assert.deepEqual(p.solution.records[i], flat ? {cant: true, sum: sum(r)} : {witness: p.solution.records[i].witness, count: row.counts[i]}, `${p.id}: the pack’s solution for ${r}`);
  });
  assert.ok(theirs.filter(s => s.length).length >= 2, `${p.id}: at least two sets can be made, so a first claim is a choice among three`);
  assert.equal(nextHint(p, fresh).action.type, 'place', `${p.id}: the first hint moves a corner`);
  // Can't waits for an attempt.
  for (let i = 0; i < q.records.length; i++) refuse(p, fresh, {type: 'cant', record: i}, 'Can’t on a fresh board');
  refuse(p, fresh, {type: 'again'}, 'Again before a wrong Can’t');
  let steps = hintsSolve(p, fresh, 'from fresh');
  const wrong = wrongMove(p, fresh), tried = wrong.next;
  steps += hintsSolve(p, tried, 'after a wrong move');
  // Random claims at the first chance, with retries.
  const runs = claimRuns(p, tried), forced = forcedShare(p);
  shares[p.id] = {firstChance: `${runs.right}/${runs.runs}`, ...forced};
  assert.ok(runs.right < runs.runs, `${p.id}: a random claim can fail`);
  // A wrong Can't: one short refusal; the attempt is over, and Again starts afresh.
  const bad = openSets(p, tried.board).find(i => sum(q.records[i]) > 180);
  const over = play(p, tried, {type: 'cant', record: bad});
  assert.equal(over.board.over, bad, `${p.id}: the wrong claim names the set`);
  assert.deepEqual(over.board.cant, [], `${p.id}: a wrong claim records no claim`);
  assert.ok(!isSolved(p, over.board), `${p.id}: an ended attempt is not a solve`);
  assert.match(drawn(p, over), /<p class="gl-told">There is a way\.<\/p>/, `${p.id}: There is a way.`);
  assert.match(drawn(p, over), /class="gl-record refused"/, `${p.id}: the set is marked on the shelf`);
  assert.doesNotMatch(drawn(p, over), /class="gl-cant/, `${p.id}: no Can’t once the attempt is over`);
  checkSealed(p, over, 'after a wrong Can’t');
  const again = play(p, over, {type: 'again'});
  assert.deepEqual(again.board, fresh.board, `${p.id}: Again starts afresh`);
  checkSealed(p, again, 'after Again');
  for (let i = 0; i < q.records.length; i++) refuse(p, again, {type: 'cant', record: i}, 'Can’t on the fresh start after Again');
  steps += hintsSolve(p, over, 'after a wrong Can’t');
  // A wrong Can't after a set is made loses the set too.
  const witness = theirs.findIndex(s => s.length);
  let built = null, target = null;
  for (const s of theirs[witness]) {
    for (const order of [q.letters, [...q.letters].reverse()]) {
      let a = tried;
      for (const x of order) if (keyOf(a.board.corners[x]) !== keyOf(s[x])) { const n = move(p, a, {type: 'place', corner: x, to: s[x]}); if (n) a = n; }
      if (made(a.board).includes(witness)) { built = a; target = s; break; }
    }
    if (built) break;
  }
  assert.ok(built, `${p.id}: a witness makes its set by moves`);
  const back = undoCarry(p, built);
  assert.ok(made(back.board).includes(witness), `${p.id}: Undo keeps a set made`);
  for (let i = 0; i < q.records.length; i++) if (made(built.board).includes(i)) refuse(p, built, {type: 'cant', record: i}, 'Can’t on a set already made');
  const other = openSets(p, built.board).find(i => sum(q.records[i]) > 180);
  if (other !== undefined) { const lost = play(p, built, {type: 'cant', record: other}); assert.deepEqual(play(p, lost, {type: 'again'}).board, fresh.board, `${p.id}: Again after a wrong Can’t clears the sets made`); }
  // A right Can't, then Undo: the claim stays and its argument goes; undoing a move after it brings the argument back.
  for (const i of openSets(p, tried.board).filter(j => sum(q.records[j]) <= 180)) {
    const c = play(p, tried, {type: 'cant', record: i});
    assert.equal(c.board.shown, i, `${p.id}: the argument is drawn for ${q.records[i]}`);
    assert.match(drawn(p, c), /gl-argument/);
    const b1 = undoCarry(p, c);
    assert.deepEqual(b1.board.cant, [i], `${p.id}: Undo keeps a right claim`);
    assert.equal(b1.board.shown, null, `${p.id}: Undo takes the argument away`);
    refuse(p, c, {type: 'cant', record: i}, 'the same claim twice');
    const m = wrongMove(p, c).next, b2 = undoCarry(p, m);
    assert.equal(b2.board.shown, i, `${p.id}: undoing a move after a claim brings its argument back`);
    const b3 = undoCarry(p, b2);
    assert.equal(b3.board.shown, null, `${p.id}: and the next Undo takes it away`);
    assert.notEqual(drawn(p, b3), drawn(p, b2), `${p.id}: so that Undo shows a change`);
  }
  const undos = undoWalks(p);
  refuse(p, tried, {type: 'cant', record: q.records.length}, 'a set that is not there');
  refuse(p, tried, {type: 'cant', record: '0'}, 'a set named by a string');
  // Forged saves.
  const flatIndex = q.records.findIndex(r => sum(r) <= 180), t = tried.board, other2 = q.records.findIndex((r, i) => i !== witness && theirs[i].length);
  const forged = [
    [{...t, done: true}, 'a forged done'],
    [{...t, built: [{record: witness, corners: t.corners}]}, 'a set made with corners that don’t make it'],
    [{...t, built: [witness]}, 'a set made without its corners'],
    [{...t, built: [{record: witness, corners: target}, {record: witness, corners: target}]}, 'a set made twice'],
    [{...t, cant: [witness]}, 'a claim on a set that can be made'],
    [{...t, over: flatIndex >= 0 ? flatIndex : q.records.length}, 'an ended attempt on a set that can’t be made'],
    [{...t, over: 'x'}, 'an ended attempt on no set'],
    [{...t, corners: target, built: [{record: witness, corners: target}], over: witness}, 'an ended attempt on a set already made'],
    [{...fresh.board, over: witness}, 'an ended attempt on the starting triangle'],
    [{...t, shown: 0}, 'an argument for a set not claimed'],
    [{...t, corners: target}, 'corners that make a set not recorded'],
    [{...t, tried: true}, 'an extra field'],
    [{...t, refused: null, told: false}, 'fields from an earlier save']
  ];
  if (flatIndex >= 0) forged.push([{...fresh.board, cant: [flatIndex], shown: flatIndex}, 'an argument on the starting triangle'], [{...t, cant: [flatIndex], shown: flatIndex, over: witness}, 'an argument and an ended attempt']);
  if (other2 >= 0) forged.push([{...t, built: [{record: other2, corners: target}]}, 'corners that make a different set']);
  forgeries(p, t, forged);
  if (flatIndex >= 0) assert.ok(validBoard(p, {...fresh.board, cant: [flatIndex]}), `${p.id}: a claim kept after Undo back to the start is a real board`);
  // A full forged shelf is still checked: made sets need their own corners.
  const allMade = {...t, corners: target, built: q.records.map((r, i) => theirs[i].length ? {record: i, corners: theirs[i][0]} : null).filter(Boolean), cant: q.records.map((r, i) => i).filter(i => !theirs[i].length)};
  assert.ok(validBoard(p, allMade) && isSolved(p, allMade), `${p.id}: a shelf whose every set carries corners that make it is a real solve`);
  forgeries(p, t, [[{...allMade, built: allMade.built.map(e => ({...e, corners: t.corners}))}, 'a full shelf without the corners that make it']]);
  return {steps, undos};
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
  let hintSteps = 0, undoSteps = 0;
  const shares = {}, runs = {};
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
    assert.ok(!/\b(can.t|none|impossible|only|no|pole|tilted|side)\b/i.test(p.title), `${p.id}: the title does not give the answer away`);
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
    if (q.mode === 'records') { const r = checkRecords(p, row, every, shares); hintSteps += r.steps; undoSteps += r.undos; }
    else hintSteps += checkPlacements(p, row, every, runs);
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
  return {puzzles: puzzles.length, triangles: every.triangles, allMultiplesOf15: every.fifteen.length, types: every.types, smallestExcess: Number(every.minExcess.toFixed(4)), cornerNearestWhole: {degrees: every.nearWhole.x, shown: approxText(every.nearWhole.x)}, straightRunsToAnswer: runs, claims: shares, hintSteps, undoSteps, slowSigns, triangleCpuMs: every.ms};
}
export default validateGlobe;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateGlobe(), null, 2));
