// Ball triangles (worksheet Week 61, triangles on a ball). Three corners sit
// on the dots of a globe, every 15° of latitude and longitude. A side is the
// shorter great-circle arc between two corners; a corner's size is the angle
// between its two sides on the surface; the triangle is the smaller region
// inside the three sides. Corners that are opposite, or all on one great
// circle, make no triangle and are refused.
//
// Girard's theorem: a triangle covers (A + B + C − 180°)/720° of the ball. So
// its corners always add up to more than 180°, and three right corners cover
// exactly 1/8. A pole N with A and B on the equator makes corners N, 90°, 90°
// and covers N/720: half of the lune between the meridians through A and B.
//
// Everything is decided exactly. Every coordinate of a dot is in the field
// Q(√2, √3) (cos 15° = (√6 + √2)/4), so the tests below compare elements of
// that field and never use a tolerance (a float estimate only picks which
// multiple of 15° to test, and skips the test when it is far from every one):
// a corner is a right angle when
// (V×P)·(V×Q) = 0, a corner is 15k° when its squared cosine matches, and the
// area is k/48 of the ball when the Van Oosterom–Strackee half-angle
// tan(E/2) = |a·(b×c)| / (1 + a·b + b·c + c·a) gives E = 15k°.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MODES = ['right', 'fraction', 'records', 'playground'];
const DEG = Math.PI / 180;

// --- Exact numbers in Q(√2, √3) ------------------------------------------------
// x = (a + b√2 + c√3 + d√6) / q with BigInt a, b, c, d and q > 0.
function gcd(a, b) { if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) [a, b] = [b, a % b]; return a; }
// Fractions are reduced only once the denominator grows large; the values are the same either way.
const BIG = 1n << 96n;
function reduce(n, q) {
  if (q < BIG) return {n, q};
  let g = q;
  for (const c of n) { if (g === 1n) break; if (c !== 0n) g = gcd(g, c); }
  return g > 1n ? {n: n.map(c => c / g), q: q / g} : {n, q};
}
export const K = (a = 0, b = 0, c = 0, d = 0, q = 1) => reduce([BigInt(a), BigInt(b), BigInt(c), BigInt(d)], BigInt(q));
export const kAdd = (x, y) => reduce(x.n.map((c, i) => c * y.q + y.n[i] * x.q), x.q * y.q);
export const kNeg = x => ({n: x.n.map(c => -c), q: x.q});
export const kSub = (x, y) => kAdd(x, kNeg(y));
export function kMul(x, y) {
  const [a1, b1, c1, d1] = x.n, [a2, b2, c2, d2] = y.n;
  return reduce([
    a1 * a2 + 2n * b1 * b2 + 3n * c1 * c2 + 6n * d1 * d2,
    a1 * b2 + b1 * a2 + 3n * (c1 * d2 + d1 * c2),
    a1 * c2 + c1 * a2 + 2n * (b1 * d2 + d1 * b2),
    a1 * d2 + d1 * a2 + b1 * c2 + c1 * b2
  ], x.q * y.q);
}
export const kZero = x => x.n.every(c => c === 0n);
const sgn = v => v > 0n ? 1 : v < 0n ? -1 : 0;
// The sign of u + v√k for integers u, v.
function sign2(u, v, k) {
  const su = sgn(u), sv = sgn(v);
  if (su === 0) return sv;
  if (sv === 0 || su === sv) return su;
  return su * sgn(u * u - k * v * v);
}
// The sign of x = P + √2 Q, with P = a + c√3 and Q = b + d√3.
export function kSign(x) {
  const [a, b, c, d] = x.n, sp = sign2(a, c, 3n), sq = sign2(b, d, 3n);
  if (sp === 0) return sq;
  if (sq === 0 || sp === sq) return sp;
  // P² − 2Q² = (a² + 3c² − 2b² − 6d²) + (2ac − 4bd)√3
  return sp * sign2(a * a + 3n * c * c - 2n * b * b - 6n * d * d, 2n * a * c - 4n * b * d, 3n);
}
export const kFloat = x => (Number(x.n[0]) + Number(x.n[1]) * Math.SQRT2 + Number(x.n[2]) * Math.sqrt(3) + Number(x.n[3]) * Math.sqrt(6)) / Number(x.q);
const ONE = K(1), TWO = K(2);

// cos 15k° for k = 0..6, in quarters: 1, (√6+√2)/4, √3/2, √2/2, 1/2, (√6−√2)/4, 0.
const COS = [K(4, 0, 0, 0, 4), K(0, 1, 0, 1, 4), K(0, 0, 2, 0, 4), K(0, 2, 0, 0, 4), K(2, 0, 0, 0, 4), K(0, -1, 0, 1, 4), K(0)];
export function cosK(t) {
  t = ((t % 360) + 360) % 360;
  if (t <= 90) return COS[t / 15];
  if (t <= 180) return kNeg(COS[(180 - t) / 15]);
  if (t <= 270) return kNeg(COS[(t - 180) / 15]);
  return COS[(360 - t) / 15];
}
export const sinK = t => cosK(90 - t);

// --- The grid ------------------------------------------------------------------
// A dot is [lat, lon] in degrees: lat from −90 to 90, lon from 0 to 345, both
// multiples of 15; a pole has lon 0.
export const keyOf = p => `${p[0]},${p[1]}`;
export const samePoint = (p, q) => p[0] === q[0] && p[1] === q[1];
export const isPole = p => Math.abs(p[0]) === 90;
export function isPoint(p) {
  if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isInteger)) return false;
  const [lat, lon] = p;
  if (lat % 15 || lon % 15 || lat < -90 || lat > 90 || lon < 0 || lon >= 360) return false;
  return Math.abs(lat) !== 90 || lon === 0;
}
export const GRID = (() => { const out = [[90, 0]]; for (let lat = 75; lat >= -75; lat -= 15) for (let lon = 0; lon < 360; lon += 15) out.push([lat, lon]); out.push([-90, 0]); return out; })();
export const antipode = ([lat, lon]) => isPole([lat, lon]) ? [-lat, 0] : [-lat, (lon + 180) % 360];
export const vec = ([lat, lon]) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const exactCache = new Map();
export function exact(p) {
  const k = keyOf(p);
  if (!exactCache.has(k)) { const c = cosK(p[0]); exactCache.set(k, [kMul(c, cosK(p[1])), kMul(c, sinK(p[1])), sinK(p[0])]); }
  return exactCache.get(k);
}
const GRIDV = GRID.map(vec);

// --- Vectors -------------------------------------------------------------------
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const len = u => Math.hypot(u[0], u[1], u[2]);
const unit = u => { const l = len(u) || 1; return [u[0] / l, u[1] / l, u[2] / l]; };
const add = (u, v, s = 1) => [u[0] + s * v[0], u[1] + s * v[1], u[2] + s * v[2]];
const scale = (u, s) => [u[0] * s, u[1] * s, u[2] * s];
export const kDot = (u, v) => kAdd(kAdd(kMul(u[0], v[0]), kMul(u[1], v[1])), kMul(u[2], v[2]));
export const kCross = (u, v) => [kSub(kMul(u[1], v[2]), kMul(u[2], v[1])), kSub(kMul(u[2], v[0]), kMul(u[0], v[2])), kSub(kMul(u[0], v[1]), kMul(u[1], v[0]))];
export const kDet = (a, b, c) => kDot(a, kCross(b, c));
// The angle between two dots along the surface, in degrees (for drawing and hints only).
export const arcDeg = (p, q) => Math.acos(Math.max(-1, Math.min(1, dot(vec(p), vec(q))))) / DEG;

// --- Exact triangle facts ------------------------------------------------------
// The size of the corner at V between the sides to P and Q, as a whole number
// of degrees when it is exactly 15k°, else null; `approx` is for display.
function floatCorner(v, p, q) {
  const n1 = cross(v, p), n2 = cross(v, q);
  return Math.acos(Math.max(-1, Math.min(1, dot(n1, n2) / (len(n1) * len(n2))))) / DEG;
}
function exactCorner(V, P, Q, approx) {
  const k = Math.round(approx / 15);
  if (k < 1 || k > 11 || Math.abs(approx - 15 * k) > 1e-6) return null;
  const vp = kDot(V, P), vq = kDot(V, Q), n = kSub(kDot(P, Q), kMul(vp, vq));
  if (k === 6) return kZero(n) ? 90 : null;
  const c = cosK(15 * k), m = kMul(kSub(ONE, kMul(vp, vp)), kSub(ONE, kMul(vq, vq)));
  return kZero(kSub(kMul(n, n), kMul(kMul(c, c), m))) && kSign(n) === kSign(c) ? 15 * k : null;
}
// The excess E = A + B + C − 180° as a number of 15° steps when it is exact
// (then the triangle covers steps/48 of the ball), else null.
function exactExcess(a, b, c, approx) {
  const k = Math.round(approx / 15);
  if (k < 1 || k > 23 || Math.abs(approx - 15 * k) > 1e-6) return null;
  let T = kDet(a, b, c);
  if (kSign(T) < 0) T = kNeg(T);
  const D = kAdd(ONE, kAdd(kDot(a, b), kAdd(kDot(b, c), kDot(c, a)))), D2 = kMul(D, D), T2 = kMul(T, T), S = kAdd(D2, T2);
  const cosOk = kZero(kSub(kSub(D2, T2), kMul(cosK(15 * k), S))), sinOk = kZero(kSub(kMul(TWO, kMul(T, D)), kMul(sinK(15 * k), S)));
  return cosOk && sinOk ? k : null;
}
const factCache = new Map();
// Facts about three dots in order: whether they make a triangle, each corner
// (exact degrees or null, and an approximation), and the exact excess steps.
export function triangleFacts(points) {
  const key = points.map(keyOf).join(' ');
  if (factCache.has(key)) return factCache.get(key);
  if (factCache.size > 4000) factCache.clear();
  const E = points.map(exact), F = points.map(vec);
  let facts = {ok: false};
  if (new Set(points.map(keyOf)).size === 3 && !kZero(kDet(...E))) {
    const approx = [0, 1, 2].map(i => floatCorner(F[i], F[(i + 1) % 3], F[(i + 2) % 3]));
    const corners = [0, 1, 2].map(i => ({deg: exactCorner(E[i], E[(i + 1) % 3], E[(i + 2) % 3], approx[i]), approx: approx[i]}));
    const ex = approx[0] + approx[1] + approx[2] - 180;
    facts = {ok: true, corners, excess: exactExcess(...E, ex), approxExcess: ex};
  }
  factCache.set(key, facts);
  return facts;
}
export const pointsOf = (q, corners) => q.letters.map(x => corners[x]);
export const factsOf = (q, corners) => triangleFacts(pointsOf(q, corners));
export const sumOf = record => record.reduce((s, c) => s + c, 0);
// A record whose corners add up to 180° or less leaves no area: no triangle on the ball has it.
export const flat = record => sumOf(record) <= 180;
const recordKey = list => [...list].sort((x, y) => y - x).join(',');
// The records the triangle's exact corners match, in shelf order.
export function matches(q, corners) {
  const f = factsOf(q, corners);
  if (!f.ok || f.corners.some(c => c.deg === null)) return [];
  const mine = recordKey(f.corners.map(c => c.deg));
  return q.records.map((r, i) => recordKey(r) === mine ? i : -1).filter(i => i >= 0);
}
export const targetSteps = q => 48 * q.fraction[0] / q.fraction[1];
export const fractionText = q => `${q.fraction[0]}/${q.fraction[1]}`;

// --- Boards --------------------------------------------------------------------
// right, fraction: {corners}
// records: {corners, built, cant, shown, over}
// playground: {corners, pairs}
// `built` lists the records made, each with the corners that made it, and
// `cant` those claimed right; `shown` is the record whose argument is drawn
// after a right Can't, until the next move. `over` is a record a wrong Can't
// named: that attempt is over ("There is a way."), and only Again (a fresh
// start) or Restart follows. Can't needs a triangle other than the starting
// one, so the argument is drawn round the child's own attempt.
const freeOf = q => q.letters.filter(x => !q.locked.includes(x));
export const madeOf = b => b.built.map(e => e.record);
const cloneCorners = c => Object.fromEntries(Object.entries(c).map(([x, p]) => [x, [...p]]));
export const sameCorners = (c, d) => Object.keys(c).every(x => samePoint(c[x], d[x]));
export const atStart = (q, b) => sameCorners(b.corners, q.start);
const openOf = (q, b) => q.records.map((r, i) => i).filter(i => !madeOf(b).includes(i) && !b.cant.includes(i));
// Whether Can't can be pressed: a records board still in play, not the starting triangle, with a set open.
export const canClaim = (q, b) => q.mode === 'records' && b.over === null && !atStart(q, b) && openOf(q, b).length > 0;
const triangle = (q, corners) => triangleFacts(pointsOf(q, corners)).ok;
function validCorners(q, c) {
  if (!object(c) || Object.keys(c).sort().join() !== [...q.letters].sort().join()) return false;
  if (!q.letters.every(x => isPoint(c[x])) || q.locked.some(x => !samePoint(c[x], q.start[x]))) return false;
  return triangle(q, c);
}
function fresh(p) {
  const q = p.parameters, corners = cloneCorners(q.start);
  if (q.mode === 'records') return {corners, built: [], cant: [], shown: null, over: null};
  if (q.mode === 'playground') return {corners, pairs: []};
  return {corners};
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || !validCorners(q, b.corners)) return false;
  if (q.mode === 'right' || q.mode === 'fraction') return Object.keys(b).join() === 'corners';
  if (q.mode === 'playground') return Object.keys(b).sort().join() === 'corners,pairs' && Array.isArray(b.pairs) && b.pairs.every(x => q.letters.includes(x)) && new Set(b.pairs).size === b.pairs.length;
  if (Object.keys(b).sort().join() !== 'built,cant,corners,over,shown') return false;
  const n = q.records.length, isIndex = i => Number.isInteger(i) && i >= 0 && i < n;
  const list = l => Array.isArray(l) && l.every(isIndex) && new Set(l).size === l.length;
  // A record made keeps the corners that made it, and they must make it.
  if (!Array.isArray(b.built) || !b.built.every(e => object(e) && Object.keys(e).sort().join() === 'corners,record' && isIndex(e.record) && validCorners(q, e.corners) && matches(q, e.corners).includes(e.record))) return false;
  const made = madeOf(b);
  if (!list(made) || !list(b.cant) || made.some(i => b.cant.includes(i))) return false;
  // Only a record with no area is a right Can't.
  if (b.cant.some(i => !flat(q.records[i]))) return false;
  // Only a set that can be made, and is not made yet, ends an attempt.
  if (b.over !== null && !(isIndex(b.over) && !flat(q.records[b.over]) && !made.includes(b.over))) return false;
  if (b.shown !== null && !b.cant.includes(b.shown)) return false;
  // A claim, right or wrong, comes after a move: never on the starting triangle; and a board shows one of them at most.
  if ((b.over !== null || b.shown !== null) && atStart(q, b)) return false;
  if (b.over !== null && b.shown !== null) return false;
  // A record the triangle matches is kept the moment it is made.
  return matches(q, b.corners).every(i => made.includes(i));
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'records') return b.over === null && q.records.every((r, i) => madeOf(b).includes(i) || b.cant.includes(i));
  const f = factsOf(q, b.corners);
  if (q.mode === 'right') return f.corners.every(c => c.deg === 90);
  return f.excess === targetSteps(q);
}
// A wrong Can't ends the attempt and Again starts a fresh one. The engine
// asks noUndo straight after this hook, for the board it is committing, so
// those two moves keep no history: no Undo steps back over an end.
const sealed = new Set();
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null;
  if (q.mode === 'records' && b.over !== null) next = action.type === 'again' ? fresh(p) : null;
  else if (action.type === 'place') {
    const x = action.corner, to = action.to;
    if (!q.letters.includes(x) || q.locked.includes(x) || !isPoint(to) || samePoint(b.corners[x], to)) return null;
    const corners = {...cloneCorners(b.corners), [x]: [...to]};
    if (!triangle(q, corners)) return null;
    next = {...b, corners};
    if (q.mode === 'records') {
      const made = matches(q, corners).filter(i => !madeOf(b).includes(i));
      next = {...next, built: [...b.built, ...made.map(record => ({record, corners: cloneCorners(corners)}))], shown: null};
    }
  } else if (action.type === 'cant' && q.mode === 'records') {
    const i = action.record;
    if (!canClaim(q, b) || !openOf(q, b).includes(i)) return null;
    next = flat(q.records[i]) ? {...b, cant: [...b.cant, i], shown: i} : {...b, shown: null, over: i};
  } else if (action.type === 'pair' && q.mode === 'playground') {
    const x = action.corner;
    if (!q.letters.includes(x)) return null;
    const on = !b.pairs.includes(x);
    next = {...b, pairs: q.letters.filter(y => y === x ? on : b.pairs.includes(y))};
  }
  if (next) {
    const state = ui(p);
    if (action.type === 'place') state.chosen = action.corner;
    state.claiming = false;
    if (q.mode === 'records' && (next.over !== null || action.type === 'again')) sealed.add(p.id); else sealed.delete(p.id);
  }
  return next;
}

// --- Solutions and hints -------------------------------------------------------
// Every labelled placement of the corners that solves a puzzle (for each
// record that can be made, in records puzzles), found once per puzzle: by a
// floating-point search over the free corners' dots, each kept only when the
// exact test agrees. Locked corners keep their places.
// `near(a, b, c)` is the floating-point screen on the corners' vectors in
// letter order; `exactly(corners)` decides.
function assignments(q, near, exactly) {
  const free = freeOf(q), out = [], at = q.letters.map(x => q.locked.includes(x) ? GRID.findIndex(pt => samePoint(pt, q.start[x])) : -1);
  if (free.length > 2) throw new Error('search more than two free corners structurally');
  const slot = q.letters.map((x, i) => at[i] < 0 ? free.indexOf(x) : -1), ids = [...at], n = GRID.length;
  const visit = () => {
    if (ids[0] === ids[1] || ids[1] === ids[2] || ids[0] === ids[2] || !near(GRIDV[ids[0]], GRIDV[ids[1]], GRIDV[ids[2]])) return;
    const corners = {[q.letters[0]]: [...GRID[ids[0]]], [q.letters[1]]: [...GRID[ids[1]]], [q.letters[2]]: [...GRID[ids[2]]]};
    if (exactly(corners)) out.push(corners);
  };
  const first = slot.indexOf(0), second = slot.indexOf(1);
  if (first < 0) visit();
  else for (let i = 0; i < n; i++) {
    ids[first] = i;
    if (second < 0) visit();
    else for (let j = 0; j < n; j++) { ids[second] = j; visit(); }
  }
  return out;
}
function floatExcess(a, b, c) {
  const T = Math.abs(dot(a, cross(b, c)));
  return T < 1e-12 ? 0 : 2 * Math.atan2(T, 1 + dot(a, b) + dot(b, c) + dot(c, a)) / DEG;
}
// Triangles with corners g°, 90°, 90° (two right corners): the g° corner is a
// pole, and the other two lie on its equator g° apart. These are the only
// triangles on this grid whose corners are all multiples of 15°. Each is
// confirmed exactly: P·Q = P·R = 0 and Q·R = cos g.
const recordCache = new Map();
export function recordTriangles(g) {
  if (recordCache.has(g)) return recordCache.get(g);
  const out = new Map(), cg = cosK(g);
  GRID.forEach((P, i) => {
    const eq = GRID.filter((X, j) => Math.abs(dot(GRIDV[i], GRIDV[j])) < 1e-9 && kZero(kDot(exact(P), exact(X))));
    for (const Q of eq) for (const R of eq) {
      if (keyOf(Q) >= keyOf(R) || Math.abs(arcDeg(Q, R) - g) > 1e-6 || !kZero(kSub(kDot(exact(Q), exact(R)), cg))) continue;
      const set = [P, Q, R], key = set.map(keyOf).sort().join(' ');
      if (!out.has(key)) out.set(key, set);
    }
  });
  recordCache.set(g, [...out.values()]);
  return recordCache.get(g);
}
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const solutionCache = new Map();
export function solutionsOf(p) {
  if (solutionCache.has(p.id)) return solutionCache.get(p.id);
  const q = p.parameters;
  let out;
  if (q.mode === 'right') out = assignments(q, (a, b, c) => Math.abs(dot(a, b)) < 1e-9 && Math.abs(dot(b, c)) < 1e-9 && Math.abs(dot(c, a)) < 1e-9, c => factsOf(q, c).corners?.every(x => x.deg === 90));
  else if (q.mode === 'fraction') {
    const k = targetSteps(q);
    out = assignments(q, (a, b, c) => Math.abs(floatExcess(a, b, c) - 15 * k) < 1e-6, c => { const pts = pointsOf(q, c); return exactExcess(...pts.map(exact), floatExcess(...pts.map(vec))) === k; });
  } else if (q.mode === 'records') {
    out = q.records.map(r => {
      if (flat(r)) return [];
      // Only records with two right corners can be made on this grid; the build checks every record.
      const g = r.every(x => x === 90) ? 90 : r.find(x => x !== 90), list = [];
      if (r.filter(x => x === 90).length < 2) return list;
      for (const set of recordTriangles(g)) for (const perm of PERMS) {
        const corners = Object.fromEntries(q.letters.map((x, k) => [x, set[perm[k]]]));
        if (q.locked.every(x => samePoint(corners[x], q.start[x]))) list.push(corners);
      }
      return list;
    });
  } else out = [];
  solutionCache.set(p.id, out);
  return out;
}
// The solution needing the fewest corner moves from here (then the shortest
// distance), and a legal first move toward it.
function nearest(q, corners, sols) {
  let best = null;
  for (const s of sols) {
    const diff = q.letters.filter(x => !samePoint(corners[x], s[x]));
    if (!diff.length) continue;
    const cost = diff.length * 1000 + diff.reduce((t, x) => t + arcDeg(corners[x], s[x]), 0);
    if (best && cost >= best.cost) continue;
    for (const x of diff) {
      const next = {...corners, [x]: s[x]};
      if (!q.letters.some(y => y !== x && samePoint(corners[y], s[x])) && triangle(q, next)) { best = {cost, corner: x, to: s[x]}; break; }
    }
  }
  return best;
}
const steps = (n, plus, minus) => `${Math.abs(n)} ${Math.abs(n) === 1 ? 'step' : 'steps'} ${n > 0 ? plus : minus}`;
// Where to move a corner, in steps of one dot north, south, east or west.
export function whereWords(from, to) {
  if (isPole(to)) return `to the ${to[0] > 0 ? 'north' : 'south'} pole`;
  if (isPole(from)) return `off the pole, ${steps((to[0] - from[0]) / 15, 'north', 'south')}`;
  const dLat = (to[0] - from[0]) / 15, dLon = (((to[1] - from[1]) % 360 + 540) % 360 - 180) / 15;
  return [dLat ? steps(dLat, 'north', 'south') : '', dLon ? steps(dLon, 'east', 'west') : ''].filter(Boolean).join(' and ');
}
const placeHint = (b, best) => ({type: 'move', action: {type: 'place', corner: best.corner, to: best.to}, text: `Move ${best.corner} ${whereWords(b.corners[best.corner], best.to)}.`});
export const recordWords = r => `${r.slice(0, -1).map(c => `${c}°`).join(', ')} and ${r.at(-1)}°`;
const memoHints = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = `${p.id} ${JSON.stringify(b)}`;
  if (memoHints.has(key)) return memoHints.get(key);
  if (memoHints.size > 400) memoHints.clear();
  let out = {type: 'done'};
  if (q.mode !== 'records') { const best = nearest(q, b.corners, solutionsOf(p)); if (best) out = placeHint(b, best); }
  else if (b.over !== null) out = {type: 'move', action: {type: 'again'}, text: 'Press Again, then make that set.'};
  else {
    const open = openOf(q, b), makeable = open.filter(i => !flat(q.records[i]));
    const best = makeable.length ? nearest(q, b.corners, makeable.flatMap(i => solutionsOf(p)[i])) : null;
    if (best) out = placeHint(b, best);
    else if (open.length && atStart(q, b)) {
      // On the starting triangle, before a claim: one step for a free corner.
      const x = freeOf(q)[0], moves = GRID.filter(pt => arcDeg(pt, b.corners[x]) < 15.001 && !samePoint(pt, b.corners[x]));
      const to = moves.find(pt => triangle(q, {...b.corners, [x]: pt}) && !q.letters.some(y => samePoint(b.corners[y], pt)));
      if (to) out = {type: 'move', action: {type: 'place', corner: x, to}, text: `Make a triangle: move ${x} ${whereWords(b.corners[x], to)}.`};
    } else if (open.length) {
      const i = open[0], r = q.records[i];
      out = {type: 'move', action: {type: 'cant', record: i}, text: `${recordWords(r)} add up to ${sumOf(r)}°. Every triangle you make adds up to more. Press Can’t, then tap that set.`};
    }
  }
  memoHints.set(key, out);
  return out;
}

// --- View state ----------------------------------------------------------------
// The chosen corner, the way the ball faces ({lat, lon} at the middle of the
// picture), and whether Can't is waiting for a record: view state, outside the save.
const uiState = new Map();
function ui(p) {
  if (!uiState.has(p.id)) { const q = p.parameters; uiState.set(p.id, {chosen: freeOf(q)[0], view: {lat: q.view[0], lon: q.view[1]}, claiming: false, turnedFor: null}); }
  return uiState.get(p.id);
}
export const clampLat = lat => Math.max(-90, Math.min(90, lat));
export const turned = (view, dLat, dLon) => ({lat: clampLat(view.lat + dLat), lon: ((view.lon + dLon) % 360 + 360) % 360});

// --- Drawing -------------------------------------------------------------------
// An orthographic picture of the ball, 200 units square, seen from far away
// above the point `view`. Screen x runs east and y north at that point.
export const BOX = 200, CX = 100, CY = 100, RADIUS = 92;
export function frameOf(view) {
  const f = view.lat * DEG, l = view.lon * DEG;
  return {e: [-Math.sin(l), Math.cos(l), 0], n: [-Math.sin(f) * Math.cos(l), -Math.sin(f) * Math.sin(l), Math.cos(f)], d: [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)]};
}
export const screenOf = (F, v) => [CX + RADIUS * dot(v, F.e), CY - RADIUS * dot(v, F.n), dot(v, F.d)];
// The point of the ball under a spot of the picture (front side), or null.
export function ballAt(F, x, y) {
  const X = (x - CX) / RADIUS, Y = (CY - y) / RADIUS, r2 = X * X + Y * Y;
  if (r2 > 1) return null;
  return add(add(scale(F.e, X), scale(F.n, Y)), scale(F.d, Math.sqrt(1 - r2)));
}
const f1 = n => Number(n.toFixed(1));
// Points along the shorter great-circle arc from u to v, every `step` degrees.
function arcPoints(u, v, step = 2) {
  const t = Math.acos(Math.max(-1, Math.min(1, dot(u, v)))), n = Math.max(1, Math.ceil(t / DEG / step)), s = Math.sin(t);
  const out = [];
  for (let k = 0; k <= n; k++) { const a = k / n; out.push(s < 1e-9 ? u : add(scale(u, Math.sin((1 - a) * t) / s), scale(v, Math.sin(a * t) / s))); }
  return out;
}
// A line of points split into its front and back runs, cut where it meets the rim.
function runs(F, points) {
  const front = [], back = [];
  let run = null, side = null;
  for (let i = 0; i < points.length; i++) {
    const z = dot(points[i], F.d), s = z >= 0;
    if (side === null) { side = s; run = [screenOf(F, points[i])]; continue; }
    if (s !== side) {
      const z0 = dot(points[i - 1], F.d), m = unit(add(points[i - 1], add(points[i], points[i - 1], -1), z0 / (z0 - z)));
      const cut = screenOf(F, unit(add(m, F.d, -dot(m, F.d))));
      run.push(cut);
      (side ? front : back).push(run);
      run = [cut];
      side = s;
    }
    run.push(screenOf(F, points[i]));
  }
  if (run?.length > 1) (side ? front : back).push(run);
  return {front, back};
}
const pathOf = list => list.map(r => `M${r.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}`).join('');
// The front part of a convex region bounded by great-circle arcs through
// `verts`, closed along the rim where it passes behind.
export function regionPath(F, verts) {
  const ring = verts.flatMap((v, i) => arcPoints(v, verts[(i + 1) % verts.length]).slice(0, -1));
  const z = ring.map(p => dot(p, F.d));
  if (z.every(t => t <= 0)) return '';
  const start = z.findIndex(t => t > 0), out = [];
  let exit = null;
  for (let k = 0; k <= ring.length; k++) {
    const i = (start + k) % ring.length, p = ring[i], s = z[i] > 0;
    if (k > 0) {
      const j = (start + k - 1) % ring.length, was = z[j] > 0;
      if (s !== was) {
        const m = unit(add(ring[j], add(p, ring[j], -1), z[j] / (z[j] - z[i]))), rim = unit(add(m, F.d, -dot(m, F.d)));
        if (was) { out.push(rim); exit = rim; }
        else { if (exit) out.push(...arcPoints(exit, rim, 3).slice(1, -1)); out.push(rim); exit = null; }
      }
    }
    if (s && k < ring.length) out.push(p);
  }
  return `M${out.map(p => { const [x, y] = screenOf(F, p); return `${f1(x)} ${f1(y)}`; }).join('L')}Z`;
}
function graticule(F) {
  let lines = '', equator = '';
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts = [];
    for (let lon = 0; lon <= 360; lon += 5) pts.push(vec([lat, lon]));
    const d = pathOf(runs(F, pts).front);
    if (lat === 0) equator = d; else lines += d;
  }
  for (let lon = 0; lon < 180; lon += 15) {
    const pts = [], c = Math.cos(lon * DEG), s = Math.sin(lon * DEG);
    for (let t = 0; t <= 360; t += 5) pts.push([Math.cos(t * DEG) * c, Math.cos(t * DEG) * s, Math.sin(t * DEG)]);
    lines += pathOf(runs(F, pts).front);
  }
  return `<path class="gl-lines" d="${lines}"/><path class="gl-equator" d="${equator}"/>`;
}
// The true corner on the surface: an arc of radius r degrees round V between
// the two sides, or a small square when the corner is exactly right.
function cornerMark(F, v, p, q, right) {
  const tp = unit(add(p, v, -dot(p, v))), tq = unit(add(q, v, -dot(q, v)));
  const r = Math.min(10, 0.34 * Math.min(Math.acos(dot(v, p)), Math.acos(dot(v, q))) / DEG) * DEG;
  const at = dir => add(scale(v, Math.cos(r)), scale(dir, Math.sin(r)));
  let pts;
  if (right) pts = [at(tp), add(scale(v, Math.cos(r * 1.414)), scale(unit(add(tp, tq)), Math.sin(r * 1.414))), at(tq)];
  else {
    const w = unit(add(tq, tp, -dot(tp, tq))), t = Math.acos(Math.max(-1, Math.min(1, dot(tp, tq)))), n = Math.max(2, Math.ceil(t / DEG / 6));
    pts = Array.from({length: n + 1}, (_, k) => at(add(scale(tp, Math.cos(t * k / n)), scale(w, Math.sin(t * k / n)))));
  }
  return pathOf(runs(F, pts).front);
}
// The eight regions of the three great circles of a triangle: X Y Z with X
// one of A and its opposite A*, and so on. The pair at A (its lune holding the
// triangle, and the opposite lune) covers the regions where the B and C
// choices agree.
export function cellsOf(points) {
  const out = [];
  for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1]) out.push({signs: [i, j, k], verts: [i ? antipode(points[0]) : points[0], j ? antipode(points[1]) : points[1], k ? antipode(points[2]) : points[2]]});
  return out;
}
export const covers = (corner, signs) => { const [i, j, k] = signs; return corner === 0 ? j === k : corner === 1 ? i === k : i === j; };
export function coverCounts(pairs) { return cellsOf([[0, 0], [0, 0], [0, 0]]).map(c => pairs.filter(x => covers(x, c.signs)).length); }

function globeInner(p, b, view, opts = {}) {
  const q = p.parameters, F = frameOf(view), pts = pointsOf(q, b.corners), V = pts.map(vec), facts = triangleFacts(pts);
  const shown = q.mode === 'playground' ? b.pairs.map(x => q.letters.indexOf(x)) : [];
  let cells = '', counts = '', circles = '';
  if (shown.length) {
    const cs = cellsOf(pts);
    for (const i of shown) cells += cs.filter(c => covers(i, c.signs)).map(c => `<path class="gl-cell" d="${regionPath(F, c.verts.map(vec))}"/>`).join('');
    for (const c of cs) {
      const n = shown.filter(i => covers(i, c.signs)).length, m = unit(c.verts.map(vec).reduce((s, v) => add(s, v), [0, 0, 0])), [x, y, z] = screenOf(F, m);
      if (n && z > 0.15) counts += `<text class="gl-count" x="${f1(x)}" y="${f1(y + 4)}">${n}</text>`;
    }
    for (let i = 0; i < 3; i++) {
      const a = V[(i + 1) % 3], c = V[(i + 2) % 3], n = unit(cross(a, c)), w = unit(cross(n, a)), ring = [];
      for (let t = 0; t <= 360; t += 4) ring.push(add(scale(a, Math.cos(t * DEG)), scale(w, Math.sin(t * DEG))));
      circles += pathOf(runs(F, ring).front);
    }
  }
  const region = facts.ok ? regionPath(F, V) : '';
  let sides = '', backSides = '';
  for (let i = 0; i < 3; i++) { const r = runs(F, arcPoints(V[i], V[(i + 1) % 3])); sides += pathOf(r.front); backSides += pathOf(r.back); }
  const marks = facts.ok ? V.map((v, i) => {
    const d = cornerMark(F, v, V[(i + 1) % 3], V[(i + 2) % 3], facts.corners[i].deg === 90);
    return d ? `<path class="gl-mark${facts.corners[i].deg === 90 ? ' right' : ''}" d="${d}"/>` : '';
  }).join('') : '';
  const dots = GRIDV.map((v, i) => { const [x, y, z] = screenOf(F, v); return z > 0.08 ? `<circle class="gl-dot" cx="${f1(x)}" cy="${f1(y)}" r="${z > 0.4 ? 1.5 : 1.1}"/>` : ''; }).join('');
  let target = '';
  if (opts.hintTo) { const [x, y, z] = screenOf(F, vec(opts.hintTo)); if (z > 0) target = `<circle class="gl-target" cx="${f1(x)}" cy="${f1(y)}" r="10"/>`; }
  const discs = q.letters.map((x, i) => {
    const [sx, sy, z] = screenOf(F, V[i]);
    const cls = ['gl-corner', z < 0 ? 'behind' : '', q.locked.includes(x) ? 'locked' : '', x === opts.chosen ? 'chosen' : '', x === opts.hintCorner ? 'hinted' : ''].filter(Boolean).join(' ');
    return `<g class="${cls}" data-corner="${x}" transform="translate(${f1(sx)} ${f1(sy)})"><circle class="gl-halo" r="10.5"/><circle class="gl-disc" r="7.6"/><text y="3.3">${x}</text></g>`;
  });
  // Corners behind the ball are drawn first, faint, so a front corner covers them.
  const order = V.map((v, i) => [dot(v, F.d), i]).sort((m, n) => m[0] - n[0]).map(([, i]) => discs[i]).join('');
  return `<circle class="gl-ball-face" cx="${CX}" cy="${CY}" r="${RADIUS}"/>${graticule(F)}${cells}${circles ? `<path class="gl-circle" d="${circles}"/>` : ''}${region ? `<path class="gl-region${q.mode === 'playground' && shown.length ? ' faint' : ''}" d="${region}"/>` : ''}<path class="gl-back" d="${backSides}"/><path class="gl-side" d="${sides}"/>${marks ? `<g class="gl-marks">${marks}</g>` : ''}<g class="gl-dots">${dots}</g>${counts}${target}<circle class="gl-rim" cx="${CX}" cy="${CY}" r="${RADIUS}"/>${order}`;
}

// A corner's true size, drawn flat: two rays at the angle, as a paper corner shows it.
function wedge(deg, right) {
  const t = deg * DEG, x = 17 + 15 * Math.cos(t), y = 27 - 15 * Math.sin(t), r = 6, ax = 17 + r * Math.cos(t), ay = 27 - r * Math.sin(t);
  const mark = right ? `<path class="gl-wedge-right" d="M23 27V21H17"/>` : `<path class="gl-wedge-arc" d="M23 27A${r} ${r} 0 0 0 ${f1(ax)} ${f1(ay)}"/>`;
  return `<svg class="gl-wedge" viewBox="0 0 34 30" aria-hidden="true" focusable="false"><path class="gl-wedge-fill" d="M17 27L32 27A15 15 0 0 0 ${f1(x)} ${f1(y)}Z"/>${mark}<path class="gl-wedge-ray" d="M32 27H17L${f1(x)} ${f1(y)}"/></svg>`;
}
// A size that is not a whole number of degrees, to one decimal, or to more
// when one decimal would print a whole number (≈90.02°, never ≈90.0°).
export function approxText(x) {
  for (let d = 1; d <= 8; d++) { const t = x.toFixed(d); if (!/\.0+$/.test(t)) return t; }
  return x.toFixed(8);
}
const degText = c => c.deg !== null ? `${c.deg}°` : `≈${approxText(c.approx)}°`;
const degWords = c => c.deg !== null ? `${c.deg} degrees` : `about ${approxText(c.approx)} degrees`;
export function placeWords(pt) {
  if (isPole(pt)) return `at the ${pt[0] > 0 ? 'north' : 'south'} pole`;
  const [lat, lon] = pt, ew = lon === 0 || lon === 180 ? `${lon}°` : lon < 180 ? `${lon}° east` : `${360 - lon}° west`;
  return lat === 0 ? `on the equator at ${ew}` : `at ${Math.abs(lat)}° ${lat > 0 ? 'north' : 'south'}, ${ew}`;
}
function cards(p, b, facts, chosen, hintCorner, done) {
  const q = p.parameters;
  return `<div class="gl-cards" role="group" aria-label="Corners">${q.letters.map((x, i) => {
    const c = facts.corners[i], locked = q.locked.includes(x), inner = `<span class="gl-card-top"><span class="gl-letter">${x}</span>${wedge(c.approx, c.deg === 90)}</span><span class="gl-deg${c.deg === null ? ' approx' : ''}">${degText(c)}</span>`;
    const label = `Corner ${x}, ${degWords(c)}${locked ? ', stays put' : ''}`;
    if (locked || done) return `<div class="gl-card${locked ? ' locked' : ''}" role="img" aria-label="${label}">${inner}</div>`;
    return `<button type="button" class="gl-card${x === hintCorner && x !== chosen ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({chosen: x})}' data-focus="gl-card-${x}" aria-pressed="${x === chosen}" aria-label="${label}">${inner}</button>`;
  }).join('')}</div>`;
}
const TURNS = [['left', 'Turn left', 'M14 5L7 12L14 19'], ['up', 'Turn up', 'M5 14L12 7L19 14'], ['down', 'Turn down', 'M5 10L12 17L19 10'], ['right', 'Turn right', 'M10 5L17 12L10 19']];
const turnButtons = () => `<div class="gl-turns" role="group" aria-label="Turn the ball">${TURNS.map(([id, label, d]) => `<button type="button" class="gl-turn" data-action="mechanic-ui" data-ui='${JSON.stringify({turn: id})}' data-focus="gl-turn-${id}" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg></button>`).join('')}</div>`;
// The sets, then Can't (or Again once a wrong Can't has ended the attempt).
// Sets become buttons only while Can't is pressed and can be.
function shelf(p, b, state, act, done) {
  const q = p.parameters, can = !done && canClaim(q, b), claiming = state.claiming && can;
  const hintRecord = act?.type === 'cant' ? act.record : null;
  const items = q.records.map((r, i) => {
    const made = madeOf(b).includes(i), cant = b.cant.includes(i), over = b.over === i;
    const cls = `gl-record${made ? ' made' : ''}${cant ? ' cant' : ''}${over ? ' refused' : ''}${hintRecord === i ? ' hinted' : ''}`;
    const inner = r.map(c => `<span>${c}°</span>`).join('');
    const label = `${recordWords(r)}${made ? ', made' : cant ? ', can’t be made' : over ? ', there is a way' : ''}`;
    if (claiming && !made && !cant) return `<button type="button" class="${cls} pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'cant', record: i}))}" data-focus="gl-record-${i}" aria-label="${label}">${inner}</button>`;
    return `<div class="${cls}" role="img" aria-label="${label}">${inner}</div>`;
  }).join('');
  const button = done ? '' : b.over !== null
    ? `<button type="button" class="gl-again${act?.type === 'again' ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'again'}))}" data-focus="gl-again">Again</button>`
    : `<button type="button" class="gl-cant${hintRecord !== null && !claiming ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !claiming})}' data-focus="gl-cant" aria-pressed="${claiming}" ${can ? '' : 'disabled'}>Can’t</button>`;
  return `<div class="gl-shelf"><div class="gl-records" role="group" aria-label="Sets of corners">${items}</div>${button}</div>`;
}
// The argument for a right Can't: the record's corners laid side by side
// reach a straight line and no further; the child's triangle's corners pass
// it, and the part past the line is its area.
// Each part carries its corner's letter (the child's) or size (the set's).
// The corners turn anticlockwise from the right end of the line, one after
// another. What passes the line is shaded in sun; past a whole turn the fan
// winds inward, smaller each time round, so no part hides another.
// Past a whole turn the radius shrinks by `wind` over the fan, at least 16 a
// turn (sums stay below 540°), so each label sits in its own part's ring.
export const FAN = {cx: 64, cy: 56, r: 48, wind: 24, font: 12, inset: 8};
export function fanRadius(total, t) { return total > 360 ? FAN.r - FAN.wind * t / total : FAN.r; }
function fan(degs, cls, label, names) {
  const total = degs.reduce((s, d) => s + d, 0), {cx, cy} = FAN;
  const at = (t, r = fanRadius(total, t)) => [cx + r * Math.cos(t * DEG), cy - r * Math.sin(t * DEG)];
  const sector = (a, b) => { const n = Math.max(1, Math.ceil((b - a) / 3)); return `M${cx} ${cy}${Array.from({length: n + 1}, (_, k) => at(a + (b - a) * k / n)).map(([x, y]) => `L${f1(x)} ${f1(y)}`).join('')}Z`; };
  let parts = '', ticks = '', marks = '', t = 0;
  degs.forEach((d, i) => {
    parts += `<path class="gl-fan-part p${i}" d="${sector(t, t + d)}"/>`;
    if (t + d > 180 && t + d < total - 1e-9) { const [x, y] = at(t + d); ticks += `M${cx} ${cy}L${f1(x)} ${f1(y)}`; }
    const mid = t + d / 2, r = total > 360 ? fanRadius(total, mid) - FAN.inset : 31, [tx, ty] = at(mid, r);
    if (d * DEG * r >= String(names[i]).length * 0.62 * FAN.font) marks += `<text class="gl-fan-name" x="${f1(tx)}" y="${f1(ty + 0.36 * FAN.font)}">${names[i]}</text>`;
    t += d;
  });
  const extra = total > 180 ? `<path class="gl-fan-extra" d="${sector(180, Math.min(total, 360))}${total > 360 ? sector(360, total) : ''}"/>${ticks ? `<path class="gl-fan-tick" d="${ticks}"/>` : ''}` : '';
  // The picture reaches as far below the line as the fan does.
  const depth = total <= 180 ? 0 : total >= 270 ? FAN.r : FAN.r * Math.sin((total - 180) * DEG), height = Math.max(62, Math.ceil(cy + depth + 6));
  return `<svg class="gl-fan ${cls}" viewBox="0 0 128 ${height}" role="img" aria-label="${label}">${parts}${extra}<path class="gl-fan-line" d="M4 ${cy}H124"/>${marks}</svg>`;
}
function argument(p, b, facts) {
  const q = p.parameters, r = q.records[b.shown], mine = facts.corners.map(c => c.deg ?? c.approx), sum = mine.reduce((s, c) => s + c, 0);
  const sumText = facts.corners.every(c => c.deg !== null) ? `${sum}°` : `about ${approxText(sum)}°`;
  return `<div class="gl-argument">${fan(mine, 'mine', `Your triangle’s corners side by side: ${sumText}, past a straight line`, q.letters)}${fan(r, 'record', `${recordWords(r)} side by side: ${sumOf(r)}°, no further than a straight line`, r.map(c => `${c}°`))}</div>`;
}
const LUNE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2C6 7 6 17 12 22C18 17 18 7 12 2Z"/></svg>';
function pairButtons(p, b) {
  const q = p.parameters;
  return `<div class="gl-pairs" role="group" aria-label="Lune pairs">${q.letters.map(x => `<button type="button" class="gl-pair" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'pair', corner: x}))}" data-focus="gl-pair-${x}" aria-pressed="${b.pairs.includes(x)}" aria-label="Pair at ${x}">${LUNE}<span>${x}</span></button>`).join('')}</div>`;
}
const depthOf = (view, pt) => dot(vec(pt), frameOf(view).d);
const viewOn = pt => ({lat: clampLat(Math.round(pt[0] * 0.75 / 15) * 15), lon: pt[1]});
function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), over = q.mode === 'records' && b.over !== null, state = ui(p), facts = factsOf(q, b.corners);
  const h = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const hintCorner = act?.type === 'place' ? act.corner : null, hintTo = act?.type === 'place' ? act.to : null;
  // A marked dot on the far side turns the ball toward it, once.
  if (hintTo && state.turnedFor !== keyOf(hintTo) && depthOf(state.view, hintTo) < 0.3) { state.view = viewOn(hintTo); state.turnedFor = keyOf(hintTo); }
  const chosen = done || over ? null : state.chosen;
  const label = `Ball. ${q.letters.map(x => `${x} ${placeWords(b.corners[x])}`).join('; ')}.${chosen ? ` ${chosen} is chosen: arrow keys move it, and Shift with an arrow turns the ball.` : ''}`;
  const globe = `<div class="gl-ball" data-gl-ball tabindex="0" role="application" aria-roledescription="ball" aria-label="${esc(label)}" data-focus="gl-ball" data-view="${state.view.lat},${state.view.lon}"><svg viewBox="0 0 ${BOX} ${BOX}" aria-hidden="true" focusable="false">${globeInner(p, b, state.view, {chosen, hintCorner, hintTo})}</svg></div>`;
  const told = over ? '<p class="gl-told">There is a way.</p>' : '';
  const status = `${q.letters.map((x, i) => `${x} ${degWords(facts.corners[i])}`).join(', ')}.${q.mode === 'records' && b.built.length ? ` Made: ${madeOf(b).map(i => recordWords(q.records[i])).join('; ')}.` : ''}${over ? ` ${recordWords(q.records[b.over])}: there is a way. Press Again.` : ''}${q.mode === 'records' && b.shown !== null ? ` ${recordWords(q.records[b.shown])} can’t be made.` : ''}`;
  // The sets and Can't, the corners' sizes, the ball, then its turns; the
  // words for a wrong Can't sit under the sets, the argument for a right one
  // under the ball.
  return `<div class="gl-puzzle${done ? ' solved' : ''}${over ? ' over' : ''}${q.mode === 'records' ? ' records' : ''}" data-mechanic-wire="globe">${q.mode === 'records' ? shelf(p, b, state, act, done) : ''}${told}${cards(p, b, facts, chosen, hintCorner, done || over)}${globe}${turnButtons()}${q.mode === 'playground' ? pairButtons(p, b) : ''}${q.mode === 'records' && b.shown !== null ? argument(p, b, facts) : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// --- Taps, drags and keys ------------------------------------------------------
// A tap goes to what is drawn on top there: a front corner's disc (the one
// nearest the viewer first), then the faint disc of a corner behind the ball
// (drawn over the front dots, so a tap on it chooses that corner and turns
// the ball to it), then the nearer of the nearest front corner and the
// nearest front dot within reach. A drag that starts on a front corner
// carries it from dot to dot; any other drag turns the ball.
const DISC = 9, CORNER_REACH = 10.5, DOT_REACH = 13;
export function tapTarget(q, corners, view, x, y) {
  const F = frameOf(view);
  const all = q.letters.map(c => { const [sx, sy, z] = screenOf(F, vec(corners[c])); return {c, d: Math.hypot(sx - x, sy - y), z}; });
  const hits = all.filter(h => h.z > 0 && h.d <= CORNER_REACH);
  const onDisc = hits.filter(h => h.d <= DISC).sort((m, n) => n.z - m.z || m.d - n.d);
  if (onDisc.length) return {corner: onDisc[0].c};
  const back = all.filter(h => h.z <= 0 && h.d <= DISC).sort((m, n) => n.z - m.z || m.d - n.d);
  if (back.length) return {corner: back[0].c, behind: true};
  let best = null;
  GRIDV.forEach((v, i) => { const [sx, sy, z] = screenOf(F, v), d = Math.hypot(sx - x, sy - y); if (z > 0.08 && d <= DOT_REACH && (!best || d < best.d)) best = {d, dot: GRID[i]}; });
  const near = hits.sort((m, n) => m.d - n.d)[0];
  if (near && (!best || near.d <= best.d)) return {corner: near.c};
  return best ? {dot: best.dot} : null;
}
// What a tap does: choose a free corner, or move the chosen corner to a dot.
export function tapAction(q, corners, chosen, target) {
  if (!target) return null;
  if (target.corner) return q.locked.includes(target.corner) ? null : target.behind ? {choose: target.corner, turn: true} : {choose: target.corner};
  const here = q.letters.find(x => samePoint(corners[x], target.dot));
  if (here) return q.locked.includes(here) ? null : {choose: here};
  return chosen && !q.locked.includes(chosen) ? {move: {type: 'place', corner: chosen, to: target.dot}} : null;
}
// Arrow keys move the chosen corner one dot north, south, east or west.
export function keyStep(view, from, key) {
  const [lat, lon] = from;
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const up = key === 'ArrowUp' ? 15 : -15, next = lat + up;
    if (Math.abs(lat) === 90) return next * Math.sign(lat) > 90 ? null : [next, (Math.round(view.lon / 15) * 15 + 360) % 360];
    return Math.abs(next) === 90 ? [next, 0] : Math.abs(next) > 90 ? null : [next, lon];
  }
  if (key === 'ArrowLeft' || key === 'ArrowRight') return isPole(from) ? null : [lat, (lon + (key === 'ArrowRight' ? 15 : -15) + 360) % 360];
  return null;
}
// Where an arrow key takes a corner: the next dot that way where it makes a
// triangle and meets no other corner, hopping over any that don't (so B in
// puzzle 1 crosses A's meridian); null when there is none.
export function keyTarget(q, corners, view, x, key) {
  let at = corners[x];
  for (let k = 0; k < 24; k++) {
    at = keyStep(view, at, key);
    if (!at || samePoint(at, corners[x])) return null;
    const next = {...corners, [x]: at};
    if (!q.letters.some(y => y !== x && samePoint(corners[y], at)) && triangle(q, next)) return at;
  }
  return null;
}
const TURN_KEYS = {ArrowLeft: [0, 15], ArrowRight: [0, -15], ArrowUp: [-15, 0], ArrowDown: [15, 0]};
const TURN_BUTTONS = {left: [0, 15], right: [0, -15], up: [-15, 0], down: [15, 0]};
let gesture = null, listening = false;
function svgPoint(svg, e) { const m = svg.getScreenCTM(); if (!m) return null; const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return [pt.x, pt.y]; }
function redraw(g, board, view) { g.svg.innerHTML = globeInner(g.p, board, view, {chosen: g.corner || ui(g.p).chosen}); }
function onMove(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  const at = svgPoint(g.svg, e);
  if (!at) return;
  if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return;
  g.moved = true;
  const q = g.p.parameters;
  if (g.kind === 'corner') {
    const F = frameOf(g.view), v = ballAt(F, ...at);
    if (!v) return;
    let best = null;
    GRIDV.forEach((u, i) => { const d = dot(u, v); if (dot(u, F.d) > 0.05 && (!best || d > best.d)) best = {d, pt: GRID[i]}; });
    if (!best || samePoint(best.pt, g.to)) return;
    const corners = {...g.board.corners, [g.corner]: best.pt};
    if (q.letters.some(x => x !== g.corner && samePoint(g.board.corners[x], best.pt)) || !triangle(q, corners)) return;
    g.to = best.pt;
    redraw(g, {...g.board, corners}, g.view);
    return;
  }
  // Turning: the surface follows the pointer.
  const k = 1 / (RADIUS * DEG) * (BOX / g.svg.getBoundingClientRect().width);
  g.now = turned(g.view, (e.clientY - g.y) * k, -(e.clientX - g.x) * k / Math.max(0.35, Math.cos(g.view.lat * DEG)));
  if (!g.frame) g.frame = requestAnimationFrame(() => { g.frame = null; redraw(g, g.board, g.now); });
}
function onEnd(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  gesture = null;
  if (g.frame) cancelAnimationFrame(g.frame);
  const q = g.p.parameters, state = ui(g.p);
  if (e.type === 'pointercancel') { g.api.ui({}); return; }
  if (g.kind === 'corner') {
    if (g.moved && !samePoint(g.to, g.board.corners[g.corner])) { state.chosen = g.corner; g.api.apply({type: 'place', corner: g.corner, to: g.to}); }
    else if (g.moved) g.api.ui({chosen: g.corner});
    else g.api.ui({chosen: g.corner});
    return;
  }
  if (g.moved) { g.api.ui({view: g.now || g.view}); return; }
  if (g.done) return;
  const action = tapAction(q, g.board.corners, state.chosen, tapTarget(q, g.board.corners, g.view, ...g.start));
  if (action?.choose) g.api.ui({chosen: action.choose, ...(action.turn ? {view: viewOn(g.board.corners[action.choose])} : {})});
  else if (action?.move) g.api.apply(action.move);
}
// No corner moves once the puzzle is solved or a wrong Can't has ended the attempt.
const stopped = (p, b) => solved(p, b) || (p.parameters.mode === 'records' && b.over !== null);
function wire(root, p, api) {
  const box = root.querySelector('[data-gl-ball]'), svg = box?.querySelector('svg'), q = p.parameters;
  if (!svg) return;
  if (!listening) {
    document.addEventListener('pointermove', onMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, onEnd);
    listening = true;
  }
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    const at = svgPoint(svg, e);
    if (!at) return;
    const b = api.attempt().board, done = stopped(p, b), state = ui(p), target = done ? null : tapTarget(q, b.corners, state.view, ...at);
    const free = target?.corner && !target.behind && !q.locked.includes(target.corner);
    gesture = {p, api, svg, board: b, view: {...state.view}, pointer: e.pointerId, x: e.clientX, y: e.clientY, start: at, moved: false, done, kind: free ? 'corner' : 'turn', corner: free ? target.corner : null, to: free ? b.corners[target.corner] : null};
    svg.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    // The ball takes focus, so focus after the move stays on the board.
    box.focus({preventScroll: true});
  });
  box.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || !e.key.startsWith('Arrow')) return;
    const b = api.attempt().board, state = ui(p);
    e.preventDefault();
    if (e.shiftKey) { const [dLat, dLon] = TURN_KEYS[e.key]; api.ui({view: turned(state.view, dLat, dLon)}); return; }
    if (stopped(p, b) || !state.chosen || q.locked.includes(state.chosen)) return;
    const to = keyTarget(q, b.corners, state.view, state.chosen, e.key);
    if (!to) return;
    // Keep the corner in sight.
    if (depthOf(state.view, to) < 0.25) state.view = viewOn(to);
    api.apply({type: 'place', corner: state.chosen, to});
  });
}

export const globeMechanics = {
  globe: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const q = p.parameters, state = ui(p);
      if (q.letters.includes(payload.chosen) && !q.locked.includes(payload.chosen)) state.chosen = payload.chosen;
      if (object(payload.view) && Number.isFinite(payload.view.lat) && Number.isFinite(payload.view.lon)) state.view = turned(payload.view, 0, 0);
      if (TURN_BUTTONS[payload.turn]) { const [dLat, dLon] = TURN_BUTTONS[payload.turn]; state.view = turned(state.view, dLat, dLon); }
      if (typeof payload.claiming === 'boolean') state.claiming = payload.claiming;
    },
    reset: p => { uiState.delete(p.id); sealed.delete(p.id); },
    // Undo takes back moves, never a set made or a right Can't: the board goes
    // back with every set made and claimed kept, and with the argument that
    // board showed, so undoing a claim takes its argument away and undoing a
    // move after it brings it back; every Undo visibly changes the board. A
    // wrong Can't keeps no history (noUndo), so Undo never steps back over it.
    carry(p, from, to) {
      if (p.parameters.mode !== 'records' || !object(from) || !object(to)) return to;
      ui(p).claiming = false;
      const cant = [...from.cant];
      return {...to, built: from.built.map(e => ({record: e.record, corners: cloneCorners(e.corners)})), cant, shown: to.shown !== null && cant.includes(to.shown) ? to.shown : null};
    },
    noUndo: p => sealed.has(p.id),
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'globe',
  family: {id: 'globe', symbol: '◍'},
  mechanics: globeMechanics,
  pack: new URL('./globe.json', import.meta.url).href,
  css: new URL('./globe.css', import.meta.url).href,
  // After a claim the ball takes focus (the first match in page order wins, so only the ball is named).
  focus: '[data-gl-ball]'
};
