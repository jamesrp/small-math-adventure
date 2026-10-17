// Shortest routes (worksheet Week 21, "The shortest route that touches a
// line"), a group inside Mirror Couriers. A route goes straight from its
// start to one point of a river (or wall), then straight to its finish.
//
// Heron's theorem: for A and B strictly on one side of a line, fold B's side
// of the route over the line to B′. Every route A–M–B is as long as A–M–B′,
// so at least as long as the straight segment AB′, with equality only where
// AB′ crosses the line. The best contact is unique, and it is the only one
// whose fold is straight. Its consequences on the boards: a finish and its
// mirror image tie at every contact; the starts whose best contact is P are
// the ray from P away from B′; equal shortest ropes and shared contacts are
// independent; a stretch of the river that still holds the best contact
// keeps it, and one that doesn't has its best at the end nearest the
// crossing (the length is strictly convex along the line); two walls unfold
// twice; and round a block a taut route bends only at corners.
//
// Every dot and every best contact sits on a grid point, so routes are
// compared exactly: a route's length is a sum of square roots of whole
// numbers (surdSign below), and the fold's straightness is an integer cross
// product. The board never shows a length. The fold appears only when the
// child presses Fold, and every claim is judged against the child's own
// folded board.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isSafeInteger;
const isPt = v => Array.isArray(v) && v.length === 2 && v.every(int);
const same = (p, q) => p[0] === q[0] && p[1] === q[1];
const range = (a, b) => Array.from({length: Math.max(0, b - a + 1)}, (_, i) => a + i);
const byPlace = (p, q) => p[0] - q[0] || p[1] - q[1];
const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);
export const MODES = ['route', 'every', 'walls', 'block', 'playground'];
// Refusals are kept for the whole try; past this many the claim stays off
// until Restart (a bound for saves, far beyond play).
const MAX_REFUSALS = 500;

// --- Exact lengths ---------------------------------------------------------
// A length is a list of whole numbers under square roots. Write each √n as
// k√s with s squarefree: square roots of distinct squarefree numbers are
// linearly independent over the rationals, so two sums are equal exactly
// when every s has the same total coefficient. Otherwise the difference is
// not zero, and bounding each √s between consecutive multiples of 2^-bits,
// with more bits until the bounds agree, finds its sign.
const roots = new Map();
export function rootOf(n) {
  if (!int(n) || n < 0) throw new RangeError('a whole number');
  if (roots.has(n)) return roots.get(n);
  let k = 1, s = n;
  for (let d = 2; d * d <= s; d++) while (s % (d * d) === 0) { s /= d * d; k *= d; }
  const out = n === 0 ? [0, 1] : [k, s];
  if (roots.size > 20000) roots.clear();
  roots.set(n, out);
  return out;
}
function isqrt(n) {
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n)))) + 1n;
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) break; x = y; }
  while (x * x > n) x -= 1n;
  while ((x + 1n) * (x + 1n) <= n) x += 1n;
  return x;
}
// The sign of Σ c·√s over a map s → c (whole numbers).
export function surdSign(terms) {
  const list = [...terms].filter(([, c]) => c !== 0n);
  if (!list.length) return 0;
  for (let bits = 32n; ; bits *= 2n) {
    let lo = 0n, hi = 0n;
    for (const [s, c] of list) {
      const r = isqrt(BigInt(s) << (2n * bits));
      if (c > 0n) { lo += c * r; hi += c * (r + 1n); } else { lo += c * (r + 1n); hi += c * r; }
    }
    if (lo > 0n) return 1;
    if (hi < 0n) return -1;
  }
}
// Compare the lengths Σ√a and Σ√b: -1, 0 or 1.
export function compareLengths(a, b) {
  const terms = new Map(), add = (n, sign) => { const [k, s] = rootOf(n); if (k) terms.set(s, (terms.get(s) ?? 0n) + BigInt(sign * k)); };
  for (const n of a) add(n, 1);
  for (const n of b) add(n, -1);
  return surdSign(terms);
}

// --- Geometry --------------------------------------------------------------
// A line is {dir: 'h', at} (the river y = at) or {dir: 'v', at} (the wall
// x = at). A contact is a whole number along it.
export const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
export const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export const mirror = (line, [x, y]) => line.dir === 'h' ? [x, 2 * line.at - y] : [2 * line.at - x, y];
export const pointOn = (line, k) => line.dir === 'h' ? [k, line.at] : [line.at, k];
export const along = (line, [x, y]) => line.dir === 'h' ? x : y;
export const side = (line, pt) => Math.sign(line.dir === 'h' ? pt[1] - line.at : pt[0] - line.at);
// The stretches where a route may touch: the windows, or from end mark to end mark.
export const stretches = line => line.windows ?? [[line.from, line.to]];
export const contacts = line => stretches(line).flatMap(([a, b]) => range(a, b));
export const allowedAt = (line, k) => int(k) && stretches(line).some(([a, b]) => a <= k && k <= b);
// The legs of the route S–M–F through contact k, as squared lengths.
export const legs = (line, S, F, k) => { const M = pointOn(line, k); return [d2(S, M), d2(M, F)]; };
// Where the straight segment from S to the folded finish F′ crosses the line:
// a fraction [num, den] along it.
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
export const offset = (line, [x, y]) => line.dir === 'h' ? y - line.at : x - line.at;
export function foldContact(line, S, F) {
  const hs = Math.abs(offset(line, S)), hf = Math.abs(offset(line, F));
  const s = along(line, S), f = along(line, F), num = s * (hs + hf) + (f - s) * hs, den = hs + hf, g = gcd(num, den) || 1;
  return [num / g, den / g];
}
// The fold of S–M–F is straight exactly when M lies on S–F′.
export const straight = (line, S, F, k) => orient(S, pointOn(line, k), mirror(line, F)) === 0;
// The best allowed contact for S–F. Along the line the length is strictly
// convex with its least value at the fold's contact, so each stretch's best
// is the fold's contact when it is inside and otherwise the stretch's end
// nearest it; the stretches' candidates are then compared exactly. Returns
// [num, den]; den 1 is a grid point.
const bests = new Map();
export function bestContact(line, S, F) {
  const key = JSON.stringify([line, S, F]);
  if (bests.has(key)) return bests.get(key);
  const [num, den] = foldContact(line, S, F);
  let best;
  if (stretches(line).some(([a, b]) => a * den <= num && num <= b * den)) best = [num, den];
  else {
    for (const k of stretches(line).map(([a, b]) => num < a * den ? a : b)) {
      if (!best || compareLengths(legs(line, S, F, k), legs(line, S, F, best[0])) < 0) best = [k, 1];
    }
  }
  if (bests.size > 5000) bests.clear();
  bests.set(key, best);
  return best;
}
export const isBest = (line, S, F, k) => { const [num, den] = bestContact(line, S, F); return den === 1 && num === k; };
// Is k the best contact of its own stretch?
export const stretchBest = (line, S, F, k) => {
  const own = stretches(line).find(([a, b]) => a <= k && k <= b);
  return !!own && isBest({dir: line.dir, at: line.at, windows: [own]}, S, F, k);
};
// The shortest rope from S to F, squared, when the fold's contact is allowed.
export const ropeSquared = (line, S, F) => d2(S, mirror(line, F));

// Two walls: the river-like lines y = lower and y = upper, touched once each.
export const wallLine = (q, wall) => ({dir: 'h', at: q.walls[wall], from: q.walls.from, to: q.walls.to});
export const otherWall = wall => wall === 'lower' ? 'upper' : 'lower';
// The route A → first wall → second wall → B, unfolded twice: B folds over
// the second wall, then the second leg and B's image fold over the first.
export function unfoldWalls(q, touches) {
  const A = q.dots.A, B = q.dots.B, [t1, t2] = touches, w1 = wallLine(q, t1.wall), M1 = pointOn(w1, t1.at);
  if (!t2) return {points: [A, M1, mirror(w1, B)], image: mirror(w1, B)};
  const w2 = wallLine(q, t2.wall), M2 = mirror(w1, pointOn(w2, t2.at)), image = mirror(w1, mirror(w2, B));
  return {points: [A, M1, M2, image], image, wall2: 2 * w1.at - w2.at};
}
// The best route for one order: straight from A to the double image, with
// its two contacts (fractions along the walls).
export function wallsBest(q, first) {
  const A = q.dots.A, B = q.dots.B, w1 = wallLine(q, first), w2 = wallLine(q, otherWall(first));
  const image = mirror(w1, mirror(w2, B)), y2 = 2 * w1.at - w2.at, dy = image[1] - A[1], dx = image[0] - A[0];
  const at = y => { const num = A[0] * dy + dx * (y - A[1]), g = gcd(num, dy) || 1; return [num / g * Math.sign(dy), Math.abs(dy) / g]; };
  return {first, rope: d2(A, image), image, at: [at(w1.at), at(y2)]};
}
const wallsLegs = (q, touches) => {
  const A = q.dots.A, B = q.dots.B, M1 = pointOn(wallLine(q, touches[0].wall), touches[0].at), M2 = pointOn(wallLine(q, touches[1].wall), touches[1].at);
  return [d2(A, M1), d2(M1, M2), d2(M2, B)];
};

// A block: the open rectangle is forbidden; its edge may be touched or
// followed. A route bends only at its corners.
export const cornersOf = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// Does the segment P–Q meet the open rectangle? Clip it to the closed
// rectangle (Liang–Barsky, in exact fractions); what is left either runs
// along the edge or has its middle strictly inside.
export function crossesBlock(rect, P, Q) {
  const [x0, y0, x1, y1] = rect, dx = Q[0] - P[0], dy = Q[1] - P[1];
  let lo = [0, 1], hi = [1, 1];
  const less = (a, b) => a[0] * b[1] < b[0] * a[1];
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const t = p < 0 ? [-q, -p] : [q, p];
    if (p < 0) { if (less(hi, t)) return false; if (less(lo, t)) lo = t; } else { if (less(t, lo)) return false; if (less(t, hi)) hi = t; }
    return true;
  };
  if (![clip(-dx, P[0] - x0), clip(dx, x1 - P[0]), clip(-dy, P[1] - y0), clip(dy, y1 - P[1])].every(Boolean)) return false;
  if (!less(lo, hi)) return false;
  // The middle of the clipped part, doubled: P·2 + (lo + hi)·d, over a common denominator.
  const den = lo[1] * hi[1], t = lo[0] * hi[1] + hi[0] * lo[1];
  const mx = 2 * P[0] * den + t * dx, my = 2 * P[1] * den + t * dy;
  return mx > 2 * x0 * den && mx < 2 * x1 * den && my > 2 * y0 * den && my < 2 * y1 * den;
}
export const blockPoints = (q, path) => [q.dots.A, ...path.map(i => cornersOf(q.rect)[i]), q.dots.B];
export const blockLegs = (q, path) => { const pts = blockPoints(q, path); return pts.slice(1).map((pt, i) => d2(pts[i], pt)); };
export const blockLegal = (q, path) => { const pts = blockPoints(q, path); return pts.slice(1).every((pt, i) => !crossesBlock(q.rect, pts[i], pt)); };
// Every route round the block through distinct corners (at most four), and
// the shortest ones.
const blockMemo = new Map();
export function blockRoutes(q) {
  const key = JSON.stringify([q.rect, q.dots]);
  if (blockMemo.has(key)) return blockMemo.get(key);
  const all = [], grow = path => {
    if (path.length && blockLegal(q, path)) all.push(path);
    if (path.length === 4) return;
    for (let i = 0; i < 4; i++) if (!path.includes(i)) {
      const pts = blockPoints(q, path), last = pts[pts.length - 2];
      if (!crossesBlock(q.rect, last, cornersOf(q.rect)[i])) grow([...path, i]);
    }
  };
  grow([]);
  let shortest = [];
  for (const path of all) {
    const c = shortest.length ? compareLengths(blockLegs(q, path), blockLegs(q, shortest[0])) : -1;
    if (c < 0) shortest = [path]; else if (c === 0) shortest.push(path);
  }
  const out = {all, shortest};
  blockMemo.set(key, out);
  return out;
}

// --- Puzzles ---------------------------------------------------------------
// Parameters: {mode, view: [x0, y0, x1, y1], dots: {A: [x, y], …}} and
//   route: line, routes ([start, finish] letters), claim, guesses (contacts
//          of the dashed routes, for 'shorter'), move (the letter the child
//          moves) and place ([x0, y0, x1, y1], where it may go);
//   every: line, finish, p (P's contact), place;
//   walls: walls {lower, upper, from, to};
//   block: rect, axis (the fold line y = axis);
//   playground: line (the finish's mirror image is drawn and moves with it).
// Coordinates are (across, up), with the river at y = 0 or the wall at x = 0.
export function slice(q, b) {
  if (q.mode === 'route') return q.move ? {contacts: b.contacts, at: b.at} : {contacts: b.contacts};
  if (q.mode === 'every') return {starts: b.starts};
  if (q.mode === 'walls') return {touches: b.touches};
  if (q.mode === 'block') return {shelf: b.shelf};
  return null;
}
export const dotsOf = (q, b) => q.mode === 'route' && q.move ? {...q.dots, [q.move]: b.at} : q.mode === 'playground' ? {...b.dots} : q.dots;
const inBox = ([x0, y0, x1, y1], [x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const occupied = (q, dots, pt) => Object.values(dots).some(d => same(d, pt));
export const routeOf = (q, b, i) => { const dots = dotsOf(q, b); return [dots[q.routes[i][0]], dots[q.routes[i][1]]]; };

// What a claim on this board says: {ok: true}, or a refusal {why, mark} that
// is final when it ends the attempt. `pick` is the route a 'less' claim names.
export function judge(q, s, pick = null) {
  if (q.mode === 'route') {
    const b = {contacts: s.contacts, at: s.at}, line = q.line;
    const route = i => routeOf(q, b, i);
    const firstNotBest = () => q.routes.findIndex((_, i) => !isBest(line, ...route(i), s.contacts[i]));
    if (q.claim === 'shorter') {
      const mine = legs(line, ...route(0), s.contacts[0]);
      const beaten = q.guesses.findIndex(g => compareLengths(mine, legs(line, ...route(0), g)) >= 0);
      return beaten < 0 ? {ok: true} : {why: 'beaten', mark: beaten};
    }
    // Contacts the child can see differ: say so first. Then every route
    // must be shortest before ropes are compared, so a refusal never tells
    // whether a letter is in the right place.
    if (q.claim === 'share' && s.contacts[0] !== s.contacts[1]) return {why: 'apart'};
    // Windows: a stretch's best end that loses to the other stretch's is a
    // final choice between the two candidates.
    if (line.windows) {
      const [S, F] = route(0), k = s.contacts[0];
      if (isBest(line, S, F, k)) return {ok: true};
      return stretchBest(line, S, F, k) ? {why: 'window', final: true} : {why: 'shorter', mark: 0};
    }
    const bent = firstNotBest();
    if (bent >= 0) return {why: q.claim === 'share' ? 'bends' : 'shorter', mark: bent};
    if (q.claim === 'tie') {
      const [r0, r1] = [0, 1].map(i => ropeSquared(line, ...route(i)));
      if (r0 !== r1) return {why: 'unequal'};
    }
    if (q.claim === 'less') {
      const ropes = [0, 1].map(i => ropeSquared(line, ...route(i)));
      return ropes[pick] < ropes[1 - pick] ? {ok: true} : {why: 'longer', mark: pick, final: true};
    }
    return {ok: true};
  }
  if (q.mode === 'every') {
    const B = q.dots[q.finish], wrong = s.starts.find(S => !isBest(q.line, S, B, q.p));
    if (wrong) return {why: 'misses', mark: wrong};
    return s.starts.length === everyAnswer(q).length ? {ok: true} : {why: 'more'};
  }
  if (q.mode === 'walls') {
    // The order is the child's choice of two, so a wrong one is final.
    const first = s.touches[0].wall;
    if (wallsWinner(q) !== first) return {why: 'order', final: true};
    return compareLengths(wallsLegs(q, s.touches), [wallsBest(q, first).rope]) === 0 ? {ok: true} : {why: 'shorter'};
  }
  // The shelf settles over against under, so a wrong one ends the try.
  if (q.mode === 'block') {
    const {shortest} = blockRoutes(q);
    if (s.shelf.some(path => !shortest.some(r => eq(r, path)))) return {why: 'long', final: true};
    return s.shelf.length === shortest.length ? {ok: true} : {why: 'more', final: true};
  }
  return {why: 'none'};
}
// Every grid start in the place box whose best contact with the finish is P.
const everyMemo = new Map();
export function everyAnswer(q) {
  const key = JSON.stringify([q.line, q.dots, q.finish, q.p, q.place]);
  if (everyMemo.has(key)) return everyMemo.get(key);
  const B = q.dots[q.finish], out = [];
  for (let x = q.place[0]; x <= q.place[2]; x++) for (let y = q.place[1]; y <= q.place[3]; y++) {
    const S = [x, y];
    if (side(q.line, S) === side(q.line, B) && !occupied(q, q.dots, S) && isBest(q.line, S, B, q.p)) out.push(S);
  }
  everyMemo.set(key, out);
  return out;
}
export const wallsWinner = q => wallsBest(q, 'lower').rope < wallsBest(q, 'upper').rope ? 'lower' : 'upper';

// The positions the moving letter may take, and the ones that solve.
export const placeSpots = q => {
  const out = [];
  for (let x = q.place[0]; x <= q.place[2]; x++) for (let y = q.place[1]; y <= q.place[3]; y++) {
    const pt = [x, y];
    if (side(q.line, pt) === side(q.line, q.dots.A) && !Object.entries(q.dots).some(([l, d]) => l !== q.move && same(d, pt))) out.push(pt);
  }
  return out;
};
const solutionMemo = new Map();
export function placeSolutions(q) {
  const key = JSON.stringify(q);
  if (solutionMemo.has(key)) return solutionMemo.get(key);
  const out = placeSpots(q).filter(at => {
    const b = {at}, [S0, F0] = routeOf(q, b, 0), [S1, F1] = routeOf(q, b, 1);
    if (q.claim === 'tie') return ropeSquared(q.line, S0, F0) === ropeSquared(q.line, S1, F1);
    const [n0, d0] = bestContact(q.line, S0, F0), [n1, d1] = bestContact(q.line, S1, F1);
    return n0 * d1 === n1 * d0;
  }).map(at => {
    const b = {at};
    return {at, contacts: q.routes.map((_, i) => bestContact(q.line, ...routeOf(q, b, i)))};
  });
  solutionMemo.set(key, out);
  return out;
}

// --- Boards ----------------------------------------------------------------
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'route') return {contacts: q.routes.map(() => null), ...(q.move ? {at: [...q.dots[q.move]]} : {}), folded: false, refused: [], told: false, pick: null, lost: false, done: false};
  if (q.mode === 'every') return {starts: [], folded: false, refused: [], told: false, done: false};
  if (q.mode === 'walls') return {touches: [], seen: [], folded: false, refused: [], told: false, lost: false, done: false};
  if (q.mode === 'block') return {path: [], shelf: [], folded: false, refused: [], told: false, lost: false, done: false};
  return {at: q.start, dots: {A: [...q.dots.A], B: [...q.dots.B]}, folded: false};
}
const keys = (b, list) => Object.keys(b).length === list.length && list.every(k => Object.hasOwn(b, k));
const ready = (q, b) => {
  if (q.mode === 'route') return b.contacts.every(int);
  if (q.mode === 'every') return b.starts.length > 0;
  if (q.mode === 'walls') return b.touches.length === 2;
  if (q.mode === 'block') return b.shelf.length > 0;
  return false;
};
const refusalFor = (b, s) => b.refused.find(r => eq(r.state, s)) ?? null;

function validParams(q) {
  if (!object(q) || !MODES.includes(q.mode) || !Array.isArray(q.view) || q.view.length !== 4 || !q.view.every(int) || !object(q.dots)) return false;
  return Object.values(q.dots).every(isPt);
}
function validSlice(q, s) {
  if (q.mode === 'route') {
    if (!Array.isArray(s.contacts) || s.contacts.length !== q.routes.length || !s.contacts.every(k => k === null || allowedAt(q.line, k))) return false;
    if (q.move) {
      if (!isPt(s.at) || !inBox(q.place, s.at) || side(q.line, s.at) !== side(q.line, q.dots.A)) return false;
      if (Object.entries(q.dots).some(([l, d]) => l !== q.move && same(d, s.at))) return false;
    } else if (Object.hasOwn(s, 'at')) return false;
    return true;
  }
  if (q.mode === 'every') {
    if (!Array.isArray(s.starts) || !s.starts.every(isPt)) return false;
    if (s.starts.some((S, i) => i && byPlace(s.starts[i - 1], S) >= 0)) return false;
    return s.starts.every(S => inBox(q.place, S) && side(q.line, S) === side(q.line, q.dots[q.finish]) && !occupied(q, q.dots, S));
  }
  if (q.mode === 'walls') {
    const t = s.touches;
    if (!Array.isArray(t) || t.length > 2) return false;
    if (!t.every(x => object(x) && keys(x, ['wall', 'at']) && ['lower', 'upper'].includes(x.wall) && int(x.at) && x.at >= q.walls.from && x.at <= q.walls.to)) return false;
    return t.length < 2 || t[0].wall !== t[1].wall;
  }
  if (q.mode === 'block') {
    if (!Array.isArray(s.shelf)) return false;
    const routes = blockRoutes(q).all;
    if (!s.shelf.every(path => routes.some(r => eq(r, path)))) return false;
    return new Set(s.shelf.map(x => JSON.stringify(x))).size === s.shelf.length;
  }
  return false;
}
const refusalOk = (q, r) => object(r) && keys(r, r.mark === undefined ? ['state', 'why'] : ['state', 'why', 'mark']) && validSlice(q, r.state) && ready(q, r.state) && (() => {
  const j = judge(q, r.state);
  return !j.ok && !j.final && j.why === r.why && eq(j.mark, r.mark);
})();

function valid(p, b) {
  const q = p.parameters;
  if (!validParams(q) || !object(b)) return false;
  if (q.mode === 'playground') {
    if (!keys(b, ['at', 'dots', 'folded']) || !allowedAt(q.line, b.at) || typeof b.folded !== 'boolean' || !object(b.dots) || !keys(b.dots, ['A', 'B'])) return false;
    const {A, B} = b.dots;
    return [A, B].every(d => isPt(d) && inBox(q.place, d) && side(q.line, d) > 0) && !same(A, B);
  }
  const list = {route: ['contacts', 'folded', 'refused', 'told', 'pick', 'lost', 'done', ...(q.move ? ['at'] : [])], every: ['starts', 'folded', 'refused', 'told', 'done'], walls: ['touches', 'seen', 'folded', 'refused', 'told', 'lost', 'done'], block: ['path', 'shelf', 'folded', 'refused', 'told', 'lost', 'done']}[q.mode];
  if (!keys(b, list) || typeof b.folded !== 'boolean' || typeof b.done !== 'boolean' || typeof b.told !== 'boolean' || !Array.isArray(b.refused) || b.refused.length > MAX_REFUSALS) return false;
  const s = slice(q, b);
  if (!validSlice(q, s)) return false;
  if (q.mode === 'block') {
    if (!Array.isArray(b.path) || !b.path.every(i => int(i) && i >= 0 && i < 4) || new Set(b.path).size !== b.path.length) return false;
    const pts = blockPoints(q, b.path).slice(0, -1);
    if (pts.slice(1).some((pt, i) => crossesBlock(q.rect, pts[i], pt))) return false;
  }
  if (!b.refused.every(r => refusalOk(q, r))) return false;
  if (new Set(b.refused.map(r => JSON.stringify(r.state))).size !== b.refused.length) return false;
  // The refusal note shows only for a refusal of this very board.
  if (b.told && !refusalFor(b, s)) return false;
  // A claim is made on a folded, complete board; done only when it is right,
  // and a final refusal only when it is final.
  if (q.mode !== 'every' && typeof b.lost !== 'boolean') return false;
  const lost = b.lost === true;
  // The finish a Less rope claim chose is saved with the claim, and only then.
  if (q.mode === 'route') {
    const picked = q.claim === 'less' && (b.done || lost);
    if (picked ? !(int(b.pick) && b.pick >= 0 && b.pick < 2) : b.pick !== null) return false;
  }
  // Two walls: the orders folded so far, each at most once; a claim needs both.
  if (q.mode === 'walls') {
    if (!Array.isArray(b.seen) || !b.seen.every(w => ['lower', 'upper'].includes(w)) || new Set(b.seen).size !== b.seen.length) return false;
    if ((b.done || lost) && b.seen.length < 2) return false;
  }
  if (b.done || lost) {
    if (!b.folded || !ready(q, b) || (b.done && lost)) return false;
    const j = judge(q, s, q.mode === 'route' ? b.pick : null);
    if (b.done && !j.ok) return false;
    if (lost && !j.final) return false;
  }
  return true;
}
const solved = (p, b) => valid(p, b) && b.done === true;

// --- Moves -----------------------------------------------------------------
const record = (b, s, j) => ({...b, told: true, refused: [...b.refused, {state: s, why: j.why, ...(j.mark === undefined ? {} : {mark: j.mark})}]});
function claim(q, b, action) {
  if (!claimable(q, b)) return null;
  const s = slice(q, b);
  let pick = null;
  if (q.mode === 'route' && q.claim === 'less') {
    pick = action.route;
    if (!int(pick) || pick < 0 || pick > 1) return null;
  }
  const j = judge(q, s, pick);
  if (j.ok) return q.mode === 'route' ? {...b, pick, done: true} : {...b, done: true};
  if (j.final) return q.mode === 'route' ? {...b, pick, lost: true} : {...b, lost: true};
  return record(b, s, j);
}
// A claim needs a folded, complete board that has not been refused, room in
// the record, and with two walls a folded route in each order this try.
function claimable(q, b) {
  if (!b.folded || !ready(q, b) || b.refused.length >= MAX_REFUSALS || refusalFor(b, slice(q, b))) return false;
  return q.mode !== 'walls' || b.seen.length === 2;
}
// Every move but Fold and a claim clears the refusal note. With two walls,
// a folded route touching both walls records its order as seen.
function move(p, b, action) {
  const q = p.parameters;
  let next = step(p, b, action);
  if (!next || !object(action) || q.mode === 'playground') return next;
  if (!['fold', 'claim', 'again'].includes(action.type)) next = {...next, told: false};
  if (q.mode === 'walls' && !next.lost && !next.done && next.folded && next.touches.length === 2 && !next.seen.includes(next.touches[0].wall)) next = {...next, seen: [...next.seen, next.touches[0].wall]};
  return next;
}
function step(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (isLost(q, b)) return action.type === 'again' && keys(action, ['type']) ? fresh(p) : null;
  if (action.type === 'fold' && keys(action, ['type'])) return {...b, folded: !b.folded};
  if (action.type === 'claim') return keys(action, q.mode === 'route' && q.claim === 'less' ? ['type', 'route'] : ['type']) ? claim(q, b, action) : null;
  if (q.mode === 'playground') {
    if (action.type === 'touch' && keys(action, ['type', 'at']) && allowedAt(q.line, action.at) && action.at !== b.at) return {...b, at: action.at};
    if (action.type === 'move' && keys(action, ['type', 'dot', 'at']) && ['A', 'B'].includes(action.dot) && isPt(action.at)) {
      const other = b.dots[action.dot === 'A' ? 'B' : 'A'];
      if (!inBox(q.place, action.at) || side(q.line, action.at) <= 0 || same(other, action.at) || same(b.dots[action.dot], action.at)) return null;
      return {...b, dots: {...b.dots, [action.dot]: [...action.at]}};
    }
    return null;
  }
  if (q.mode === 'route') {
    if (action.type === 'touch' && keys(action, ['type', 'route', 'at']) && int(action.route) && action.route >= 0 && action.route < q.routes.length && allowedAt(q.line, action.at)) {
      if (b.contacts[action.route] === action.at) return null;
      const contacts = [...b.contacts]; contacts[action.route] = action.at;
      return {...b, contacts};
    }
    if (action.type === 'move' && q.move && keys(action, ['type', 'at']) && isPt(action.at)) {
      const next = {...b, at: [...action.at]};
      return !same(b.at, action.at) && validSlice(q, slice(q, next)) ? next : null;
    }
    return null;
  }
  if (q.mode === 'every') {
    if (action.type !== 'start' || !keys(action, ['type', 'at']) || !isPt(action.at)) return null;
    const at = action.at, has = b.starts.some(S => same(S, at));
    const starts = has ? b.starts.filter(S => !same(S, at)) : [...b.starts, [...at]].sort(byPlace);
    const next = {...b, starts};
    return validSlice(q, slice(q, next)) ? next : null;
  }
  if (q.mode === 'walls') {
    if (action.type !== 'touch' || !keys(action, ['type', 'wall', 'at']) || !['lower', 'upper'].includes(action.wall) || !int(action.at) || action.at < q.walls.from || action.at > q.walls.to) return null;
    const i = b.touches.findIndex(t => t.wall === action.wall);
    let touches;
    if (i < 0) touches = [...b.touches, {wall: action.wall, at: action.at}];
    else if (b.touches[i].at === action.at) touches = b.touches.filter((_, j) => j !== i);
    else touches = b.touches.map((t, j) => j === i ? {wall: t.wall, at: action.at} : t);
    return {...b, touches};
  }
  if (q.mode === 'block') {
    if (action.type === 'corner' && keys(action, ['type', 'i']) && int(action.i) && action.i >= 0 && action.i < 4) {
      if (b.path.at(-1) === action.i) return {...b, path: b.path.slice(0, -1)};
      if (b.path.includes(action.i)) return null;
      const pts = blockPoints(q, b.path);
      if (crossesBlock(q.rect, pts[pts.length - 2], cornersOf(q.rect)[action.i])) return null;
      return {...b, path: [...b.path, action.i]};
    }
    if (action.type === 'keep' && keys(action, ['type'])) {
      if (!b.path.length || !blockLegal(q, b.path) || b.shelf.some(r => eq(r, b.path))) return null;
      return {...b, shelf: [...b.shelf, [...b.path]]};
    }
    if (action.type === 'drop' && keys(action, ['type', 'i']) && int(action.i) && action.i >= 0 && action.i < b.shelf.length) return {...b, shelf: b.shelf.filter((_, j) => j !== action.i)};
    return null;
  }
  return null;
}
// Undo takes back moves, never a refusal or a final answer: refusals stay in
// the record (the claim stays off on that board, and Undo clears only the
// note), and a try ended by a wrong final choice stays ended until Again or
// Restart (Undo is off then; see noUndo).
const isLost = (q, b) => q.mode !== 'every' && q.mode !== 'playground' && b.lost === true;
function carry(p, from, to) {
  const q = p.parameters;
  if (q.mode === 'playground' || !object(from) || !object(to) || !Array.isArray(from.refused)) return to;
  if (isLost(q, from)) return from;
  const next = {...to, refused: from.refused, told: false};
  return q.mode === 'walls' && Array.isArray(from.seen) ? {...next, seen: from.seen} : next;
}

// --- Hints -----------------------------------------------------------------
// Hints walk to a solve from any board: fold, move the letter to the nearest
// spot that works, touch each route at its best contact, then claim. They
// never name an answer before the child has a board to compare it with.
const NAMES = {h: 'river', v: 'wall'};
const across = (q, k) => q.line.dir === 'h' ? k - q.view[0] : k - q.view[1];
const near = (from, list) => [...list].sort((s, t) => d2(from, s) - d2(from, t) || byPlace(s, t))[0];
const routeName = (q, i) => `${q.routes[i][0]} to ${q.routes[i][1]}`;
function routeHint(q, b) {
  const line = q.line, where = NAMES[line.dir];
  if (b.lost) return {type: 'move', action: {type: 'again'}, text: 'Press Again.'};
  if (!b.folded) return {type: 'move', action: {type: 'fold'}, text: `Fold: the finish flips over the ${where}, and the rope keeps its length.`};
  let at = b.at, targets;
  if (q.move) {
    const sols = placeSolutions(q), here = sols.find(s => same(s.at, b.at));
    if (!here) {
      const go = near(b.at, sols.map(s => s.at));
      const [[S0, F0], [S1]] = q.routes;
      return {type: 'move', action: {type: 'move', at: go}, text: q.claim === 'tie'
        ? `${q.move}′ must be as far from ${S1} as ${F0}′ is. Make the same right triangle, with its two steps the other way round.`
        : `${q.move}′ must sit on the straight line from ${S1} through the place where the shortest route from ${S0} to ${F0} touches.`};
    }
    at = here.at; targets = here.contacts.map(([n]) => n);
  } else targets = q.routes.map((_, i) => bestContact(line, ...routeOf(q, {at}, i))[0]);
  for (let i = 0; i < q.routes.length; i++) {
    if (b.contacts[i] === targets[i]) continue;
    const [S, F] = routeOf(q, {at}, i), [num, den] = foldContact(line, S, F), outside = !(den === 1 && num === targets[i]);
    const text = outside
      ? `The straight line from ${q.routes[i][0]} to ${q.routes[i][1]}′ crosses where you can’t touch. On each side of that crossing, the nearer the touch, the shorter the route: of the two stretch ends nearest it, this one is shorter.`
      : `${q.routes.length > 1 ? `${routeName(q, i)}: t` : 'T'}ouch where the straight line from ${q.routes[i][0]} to ${q.routes[i][1]}′ crosses the ${where}.`;
    return {type: 'move', action: {type: 'touch', route: i, at: targets[i]}, text};
  }
  if (q.claim === 'less') {
    const ropes = [0, 1].map(i => ropeSquared(line, ...routeOf(q, b, i))), win = ropes[0] < ropes[1] ? 0 : 1;
    return {type: 'move', action: {type: 'claim', route: win}, text: `Both ropes are straight now. The one to ${q.routes[win][1]}′ is shorter: press Less rope: ${q.routes[win][1]}.`};
  }
  return {type: 'move', action: {type: 'claim'}, text: `Press ${CLAIM_LABEL[q.claim]}.`};
}
function everyHint(q, b) {
  if (!b.folded) return {type: 'move', action: {type: 'fold'}, text: `Fold: ${q.finish} flips over the river.`};
  const B = q.dots[q.finish], wrong = b.starts.find(S => !isBest(q.line, S, B, q.p));
  if (wrong) return {type: 'move', action: {type: 'start', at: wrong}, text: `This start’s straight line to ${q.finish}′ misses P. Take it away.`};
  const missing = everyAnswer(q).filter(S => !b.starts.some(T => same(S, T)));
  if (missing.length) return {type: 'move', action: {type: 'start', at: near(q.line.dir === 'h' ? [q.p, q.line.at] : [q.line.at, q.p], missing)}, text: `Starts that work lie on the straight line from ${q.finish}′ through P, past P.`};
  return {type: 'move', action: {type: 'claim'}, text: 'Press That’s all.'};
}
// Two walls: fold a route in each order (a complete route as it stands, then
// the worse order first), then make the better order's route straight and
// claim.
function wallsHint(q, b) {
  if (b.lost) return {type: 'move', action: {type: 'again'}, text: 'Press Again.'};
  const t = b.touches;
  if (t.length === 2 && !b.folded && !b.seen.includes(t[0].wall)) return {type: 'move', action: {type: 'fold'}, text: 'Fold to see this order unfolded.'};
  const win = wallsWinner(q), lose = otherWall(win), order = [lose, win].find(o => !b.seen.includes(o)) ?? win, last = b.seen.length === 2;
  const clamp = k => Math.min(Math.max(k, q.walls.from), q.walls.to);
  const [c1, c2] = wallsBest(q, order).at.map(([n, d]) => clamp(Math.round(n / d))), second = otherWall(order);
  if (t.length && t[0].wall !== order) return {type: 'move', action: {type: 'touch', wall: t[0].wall, at: t[0].at}, text: last ? `Start with the ${win} wall: folding B twice that way lands nearer A. Take this touch away.` : `To try the ${order} wall first, take this touch away.`};
  if (!t.length || t[0].at !== c1) return {type: 'move', action: {type: 'touch', wall: order, at: c1}, text: last ? `Touch the ${order} wall here first.` : `Try the ${order} wall first: touch it here.`};
  if (t.length < 2 || t[1].at !== c2) return {type: 'move', action: {type: 'touch', wall: second, at: c2}, text: `Then touch the ${second} wall here.`};
  if (!b.folded) return {type: 'move', action: {type: 'fold'}, text: last ? 'Fold to see the whole route straight.' : 'Fold to see this order unfolded.'};
  return {type: 'move', action: {type: 'claim'}, text: 'Press Shortest.'};
}
function blockHint(q, b) {
  if (b.lost) return {type: 'move', action: {type: 'again'}, text: 'Press Again.'};
  const {shortest} = blockRoutes(q), wrong = b.shelf.findIndex(path => !shortest.some(r => eq(r, path)));
  if (wrong >= 0) return {type: 'move', action: {type: 'drop', i: wrong}, text: 'This route is longer than the shortest. Take it off the shelf.'};
  const missing = shortest.find(r => !b.shelf.some(path => eq(path, r)));
  if (missing) {
    if (eq(b.path, missing)) return {type: 'move', action: {type: 'keep'}, text: 'Keep this route.'};
    if (b.path.length < missing.length && eq(b.path, missing.slice(0, b.path.length))) return {type: 'move', action: {type: 'corner', i: missing[b.path.length]}, text: 'Pull the rope tight round the block: bend at this corner.'};
    return {type: 'move', action: {type: 'corner', i: b.path.at(-1)}, text: 'Take back the last corner.'};
  }
  if (!b.folded) return {type: 'move', action: {type: 'fold'}, text: 'Fold along the line through A and B.'};
  return {type: 'move', action: {type: 'claim'}, text: 'Press That’s all.'};
}
const hintMemo = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart to reset the board.'};
  if (solved(p, b)) return {type: 'done'};
  if (q.mode === 'playground') return {type: 'note'};
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  const out = q.mode === 'route' ? routeHint(q, b) : q.mode === 'every' ? everyHint(q, b) : q.mode === 'walls' ? wallsHint(q, b) : blockHint(q, b);
  if (hintMemo.size > 400) hintMemo.clear();
  hintMemo.set(key, out);
  return out;
}

// --- View state ------------------------------------------------------------
// Which route a tap on the river sets (two-route puzzles), and which letter
// the playground holds. Neither is saved.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {route: 0, held: null}); return uiState.get(p.id); };
function uiHook(p, payload) {
  if (!object(payload)) return;
  const q = p.parameters, s = ui(p);
  if (int(payload.route) && q.mode === 'route' && payload.route >= 0 && payload.route < q.routes.length) s.route = payload.route;
  if (Object.hasOwn(payload, 'held') && q.mode === 'playground') s.held = ['A', 'B'].includes(payload.held) && s.held !== payload.held ? payload.held : null;
}

// --- Drawing ---------------------------------------------------------------
// One SVG in grid units of U, with a button over every point a tap can use.
// Each button covers its whole grid cell, so a tap goes to the nearest point.
const U = 40;
export const CLAIM_LABEL = {shorter: 'Shorter', shortest: 'Shortest', less: 'Less rope', tie: 'Same rope', share: 'Same place'};
const SAY = {
  beaten: 'Not shorter than this one.', shorter: 'There is a shorter one.', unequal: 'Not the same rope.', apart: 'They touch at different places.',
  bends: 'This one bends.', misses: 'This one’s shortest route misses P.', more: 'There is another.', order: 'The other order is shorter.', long: 'A kept route isn’t shortest.',
  window: 'The other stretch has a shorter route.', other: 'Fold a route in the other order too.'
};
const prime = (letter, n = 1) => `${letter}${n === 2 ? '″' : '′'}`;
// Two walls: the board grows to hold the folded route and, after the
// claim, both orders' double images.
function viewOf(q, b) {
  const pts = [];
  if (b.folded && b.touches.length) pts.push(...unfoldWalls(q, b.touches).points);
  if (b.done || b.lost) pts.push(wallsBest(q, 'lower').image, wallsBest(q, 'upper').image);
  let [x0, y0, x1, y1] = q.view;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y - 1); y1 = Math.max(y1, y + 1); }
  return [x0, y0, x1, y1];
}
function frame(view) {
  const [x0, y0, x1, y1] = view, cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  const X = x => (x - x0 + 0.5) * U, Y = y => (y1 - y + 0.5) * U;
  return {view, cols, rows, X, Y, xy: ([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`, left: x => `${((x - x0 + 0.5) / cols * 100).toFixed(3)}%`, top: y => `${((y1 - y + 0.5) / rows * 100).toFixed(3)}%`};
}
const polyline = (f, pts, cls, extra = '') => `<polyline class="${cls}" points="${pts.map(f.xy).join(' ')}" ${extra}/>`;
const seg = (f, P, Q, cls) => `<line class="${cls}" x1="${f.X(P[0]).toFixed(1)}" y1="${f.Y(P[1]).toFixed(1)}" x2="${f.X(Q[0]).toFixed(1)}" y2="${f.Y(Q[1]).toFixed(1)}"/>`;
function paper(f) {
  const [x0, y0, x1, y1] = f.view, lines = [];
  for (let x = x0; x <= x1; x++) lines.push(seg(f, [x, y0 - 0.5], [x, y1 + 0.5], 'fd-grid'));
  for (let y = y0; y <= y1; y++) lines.push(seg(f, [x0 - 0.5, y], [x1 + 0.5, y], 'fd-grid'));
  return lines.join('');
}
// The far side of a line: the half of the view a fold lands in.
function farSide(f, line, nearSign) {
  const [x0, y0, x1, y1] = f.view;
  const box = line.dir === 'h' ? (nearSign > 0 ? [x0 - .5, y0 - .5, x1 + .5, line.at] : [x0 - .5, line.at, x1 + .5, y1 + .5]) : (nearSign > 0 ? [x0 - .5, y0 - .5, line.at, y1 + .5] : [line.at, y0 - .5, x1 + .5, y1 + .5]);
  const [a, c, b2, d] = box;
  return `<rect class="fd-far" x="${f.X(a).toFixed(1)}" y="${f.Y(d).toFixed(1)}" width="${((b2 - a) * U).toFixed(1)}" height="${((d - c) * U).toFixed(1)}"/>`;
}
function lineDrawing(f, line, cls = 'fd-river') {
  const ends = [line.from ?? Math.min(...stretches(line).map(s => s[0])), line.to ?? Math.max(...stretches(line).map(s => s[1]))];
  const P = k => pointOn(line, k), tick = (k, len) => { const [x, y] = P(k); return line.dir === 'h' ? seg(f, [x, y - len], [x, y + len], 'fd-end') : seg(f, [x - len, y], [x + len, y], 'fd-end'); };
  const [vx0, vy0, vx1, vy1] = f.view, lo = line.dir === 'h' ? vx0 - .5 : vy0 - .5, hi = line.dir === 'h' ? vx1 + .5 : vy1 + .5;
  if (!line.windows) return `${seg(f, P(lo), P(hi), `${cls} closed`)}${seg(f, P(ends[0]), P(ends[1]), cls)}${tick(ends[0], .3)}${tick(ends[1], .3)}`;
  return `${seg(f, P(lo), P(hi), `${cls} closed`)}${line.windows.map(([a, b]) => `${seg(f, P(a), P(b), `${cls} window`)}${tick(a, .3)}${tick(b, .3)}`).join('')}`;
}
const ticks = (f, line) => contacts(line).map(k => { const [x, y] = pointOn(line, k); return `<circle class="fd-tick" cx="${f.X(x).toFixed(1)}" cy="${f.Y(y).toFixed(1)}" r="3.2"/>`; }).join('');
function letter(f, name, pt, cls = '') {
  return `<g class="fd-letter ${cls}"><circle cx="${f.X(pt[0]).toFixed(1)}" cy="${f.Y(pt[1]).toFixed(1)}" r="${(.36 * U).toFixed(1)}"/><text x="${f.X(pt[0]).toFixed(1)}" y="${(f.Y(pt[1]) + .15 * U).toFixed(1)}">${esc(name)}</text></g>`;
}
const ring = (f, pt, cls) => `<circle class="${cls}" cx="${f.X(pt[0]).toFixed(1)}" cy="${f.Y(pt[1]).toFixed(1)}" r="${(.52 * U).toFixed(1)}"/>`;
const dot = (f, pt, cls, r = .15) => `<circle class="${cls}" cx="${f.X(pt[0]).toFixed(1)}" cy="${f.Y(pt[1]).toFixed(1)}" r="${(r * U).toFixed(1)}"/>`;
// A circle round C through P, clipped to the board (the rope swung round).
const arc = (f, C, P, cls) => `<circle class="${cls}" cx="${f.X(C[0]).toFixed(1)}" cy="${f.Y(C[1]).toFixed(1)}" r="${(Math.sqrt(d2(C, P)) * U).toFixed(1)}"/>`;
// A line from P through Q, carried to the edge of the view.
function ray(f, P, Q, cls) {
  const [x0, y0, x1, y1] = f.view, dx = Q[0] - P[0], dy = Q[1] - P[1];
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (x1 + .5 - P[0]) / dx); if (dx < 0) t = Math.min(t, (x0 - .5 - P[0]) / dx);
  if (dy > 0) t = Math.min(t, (y1 + .5 - P[1]) / dy); if (dy < 0) t = Math.min(t, (y0 - .5 - P[1]) / dy);
  return seg(f, P, [P[0] + t * dx, P[1] + t * dy], cls);
}
const button = (f, pt, attrs, label, cls = '') => `<button type="button" class="fd-pt ${cls}" style="left:${f.left(pt[0])};top:${f.top(pt[1])}" ${attrs} aria-label="${esc(label)}"></button>`;
const placeWords = (f, [x, y]) => `${x - f.view[0]} across, ${y - f.view[1]} up`;
const boardHtml = (f, svg, buttons, label, cls = '') => `<div class="fd-board${cls ? ` ${cls}` : ''}" data-fd-board style="--cols:${f.cols};--rows:${f.rows}" role="group" aria-label="${esc(label)}"><svg viewBox="0 0 ${f.cols * U} ${f.rows * U}" aria-hidden="true">${svg}</svg>${buttons}</div>`;
const moveAttr = action => `data-fd-move="${esc(JSON.stringify(action))}"`;
const hinted = (h, test) => h && h.type === 'move' && test(h.action);
const control = (label, action, enabled, h, extra = '', focus = `fd-${action.type}`) => `<button type="button" class="secondary fd-button${hinted(h, a => a.type === action.type && (a.route === undefined || a.route === action.route)) ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${focus}" ${enabled ? '' : 'disabled'} ${extra}>${esc(label)}</button>`;
const foldButton = (b, h) => control(b.folded ? 'Unfold' : 'Fold', {type: 'fold'}, true, h, `aria-pressed="${b.folded}"`);
const noteHtml = (text, good = false) => text ? `<p class="fd-note${good ? ' good' : ''}" role="status">${esc(text)}</p>` : '<p class="fd-note" role="status"></p>';

function renderRoute(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), lost = b.lost === true, f = frame(q.view), line = q.line;
  const dots = dotsOf(q, b), sel = Math.min(ui(p).route, q.routes.length - 1), s = slice(q, b), refusal = refusalFor(b, s), told = b.told ? refusal : null;
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const colors = ['r0', 'r1'], parts = [paper(f), farSide(f, line, side(line, dots.A)), lineDrawing(f, line)];
  // The dashed routes to beat, and the routes the child has made.
  for (const [i, g] of (q.guesses ?? []).entries()) {
    const [S, F] = routeOf(q, b, 0), M = pointOn(line, g);
    parts.push(polyline(f, b.folded ? [S, M, mirror(line, F)] : [S, M, F], `fd-guess${told?.why === 'beaten' && told.mark === i ? ' marked' : ''}`));
  }
  parts.push(ticks(f, line));
  q.routes.forEach((_, i) => {
    const [S, F] = routeOf(q, b, i), k = b.contacts[i];
    if (k === null) return;
    const M = pointOn(line, k);
    if (b.folded) parts.push(seg(f, M, F, `fd-leg ${colors[i]} faint`), polyline(f, [S, M, mirror(line, F)], `fd-route ${colors[i]} folded`));
    else parts.push(polyline(f, [S, M, F], `fd-route ${colors[i]}`));
    parts.push(dot(f, M, `fd-contact ${colors[i]}`));
  });
  // The certificate after a right claim (or a final wrong one): the rope
  // swung round A, or the straight line the windows cut off.
  if ((done || lost) && (q.claim === 'less' || q.claim === 'tie')) {
    const ropes = q.routes.map((_, i) => routeOf(q, b, i)), shorter = q.claim === 'less' ? (ropeSquared(line, ...ropes[0]) < ropeSquared(line, ...ropes[1]) ? 0 : 1) : 0;
    parts.push(arc(f, ropes[shorter][0], mirror(line, ropes[shorter][1]), 'fd-arc'));
  }
  if ((done || lost) && line.windows) {
    const [S, F] = routeOf(q, b, 0), [k] = bestContact(line, S, F);
    parts.push(seg(f, S, mirror(line, F), 'fd-straight'));
    if (lost) parts.push(polyline(f, [S, pointOn(line, k), mirror(line, F)], 'fd-route r1 flipped'));
  }
  if (b.folded) {
    const finishes = [...new Set(q.routes.map(r => r[1]))];
    for (const name of finishes) parts.push(letter(f, prime(name), mirror(line, dots[name]), 'image'));
  }
  const finishOf = i => dots[q.routes[i][1]];
  if (q.routes.length > 1 && !done && !lost) parts.push(ring(f, finishOf(sel), `fd-chosen ${colors[sel]}`));
  if (lost && b.pick !== null) parts.push(ring(f, finishOf(b.pick), 'fd-mark'));
  if (told && ['shorter', 'bends'].includes(told.why) && q.routes.length > 1) parts.push(ring(f, finishOf(told.mark), 'fd-mark'));
  for (const [name, pt] of Object.entries(dots)) parts.push(letter(f, name, pt, name === q.move ? 'moving' : ''));
  // Buttons: the river's contacts, the letters that choose a route, and the
  // places the moving letter can go.
  const buttons = [];
  const hintedAt = hinted(h, x => x.type === 'touch') ? h.action : null, hintedMove = hinted(h, x => x.type === 'move') ? h.action.at : null;
  const hintedRoute = hinted(h, x => (x.type === 'touch' || x.type === 'claim') && int(x.route)) ? h.action.route : null;
  if (!done && !lost) {
    for (const k of contacts(line)) {
      const pt = pointOn(line, k), mine = q.routes.map((_, i) => b.contacts[i] === k ? routeName(q, i) : null).filter(Boolean);
      buttons.push(button(f, pt, `${moveAttr({type: 'touch', route: sel, at: k})} data-focus="fd-c-${k}"`, `${NAMES[line.dir]} at ${across(q, k)}${mine.length ? `, route ${mine.join(' and ')} touches here` : ''}`, `fd-on-line${hintedAt?.at === k && hintedAt.route === sel ? ' hinted' : ''}`));
    }
    if (q.routes.length > 1) q.routes.forEach((r, i) => {
      const others = q.routes.filter((_, j) => j !== i);
      const pick = [r[1], r[0]].find(l => !others.some(o => o.includes(l)));
      if (pick) buttons.push(button(f, dots[pick], `data-fd-pick="${i}" data-focus="fd-l-${pick}" aria-pressed="${sel === i}"`, `${pick}: choose route ${routeName(q, i)}`, `fd-on-letter${hintedRoute === i && i !== sel ? ' hinted' : ''}`));
    });
    if (q.move) for (const pt of placeSpots(q)) if (!same(pt, b.at)) buttons.push(button(f, pt, `${moveAttr({type: 'move', at: pt})} data-focus="fd-p-${pt.join('_')}"`, `Move ${q.move} to ${placeWords(f, pt)}`, `fd-free${hintedMove && same(hintedMove, pt) ? ' hinted' : ''}`));
  }
  // Less rope names its finish on the button: one button per finish, apart
  // from the route chosen for touching.
  const can = claimable(q, b), claims = q.claim === 'less'
    ? q.routes.map((r, i) => control(`${CLAIM_LABEL.less}: ${r[1]}`, {type: 'claim', route: i}, can, h, '', `fd-claim-${i}`)).join('')
    : control(CLAIM_LABEL[q.claim], {type: 'claim'}, can, h);
  const tools = done ? '' : lost ? `<div class="fd-tools">${control('Again', {type: 'again'}, true, h)}</div>`
    : `<div class="fd-tools">${foldButton(b, h)}${b.folded ? claims : ''}</div>`;
  const note = !lost ? (told ? SAY[told.why] : '') : q.claim === 'less' ? `The rope to ${q.routes[1 - b.pick][1]} is shorter.` : SAY.window;
  const status = q.routes.map((_, i) => `Route ${routeName(q, i)}${b.contacts[i] === null ? ' has no contact yet' : ` touches the ${NAMES[line.dir]} at ${across(q, b.contacts[i])}`}.`).join(' ') + (b.folded ? ' Folded.' : '') + (q.move ? ` ${q.move} at ${placeWords(f, b.at)}.` : '');
  return `<div class="fd-puzzle" data-mechanic-wire="folds">${boardHtml(f, parts.join(''), buttons.join(''), `Board with a ${NAMES[line.dir]}`)}${tools}${noteHtml(note)}<p class="sr-only">${esc(status)}</p></div>`;
}

function renderEvery(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), f = frame(q.view), line = q.line, B = q.dots[q.finish], P = pointOn(line, q.p);
  const s = slice(q, b), refusal = refusalFor(b, s), told = b.told ? refusal : null, h = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const parts = [paper(f), farSide(f, line, side(line, B)), lineDrawing(f, line)];
  if (done) parts.push(ray(f, mirror(line, B), P, 'fd-straight'));
  parts.push(b.folded ? seg(f, P, B, 'fd-leg r0 faint') + seg(f, P, mirror(line, B), 'fd-leg r0 folded') : seg(f, P, B, 'fd-leg r0'));
  for (const S of b.starts) parts.push(seg(f, S, P, 'fd-leg r0 thin'));
  for (const S of b.starts) parts.push(dot(f, S, 'fd-start', .2));
  if (told?.why === 'misses') parts.push(ring(f, told.mark, 'fd-mark'));
  parts.push(`<g class="fd-p">${dot(f, P, 'fd-pmark', .17)}<text x="${f.X(P[0]).toFixed(1)}" y="${(f.Y(P[1]) + (line.dir === 'h' ? .62 : .15) * U).toFixed(1)}" dx="${line.dir === 'v' ? (-.45 * U * side(line, B)).toFixed(1) : 0}">P</text></g>`);
  if (b.folded) parts.push(letter(f, prime(q.finish), mirror(line, B), 'image'));
  for (const [name, pt] of Object.entries(q.dots)) parts.push(letter(f, name, pt));
  const buttons = [], hintedAt = hinted(h, x => x.type === 'start') ? h.action.at : null;
  if (!done) for (let x = q.place[0]; x <= q.place[2]; x++) for (let y = q.place[1]; y <= q.place[3]; y++) {
    const pt = [x, y];
    if (side(line, pt) !== side(line, B) || occupied(q, q.dots, pt)) continue;
    const on = b.starts.some(S => same(S, pt));
    buttons.push(button(f, pt, `${moveAttr({type: 'start', at: pt})} data-focus="fd-s-${x}_${y}" aria-pressed="${on}"`, `${on ? 'Start' : 'Empty'} at ${placeWords(f, pt)}`, `fd-free${on ? ' on' : ''}${hintedAt && same(hintedAt, pt) ? ' hinted' : ''}`));
  }
  const tools = done ? '' : `<div class="fd-tools">${foldButton(b, h)}${b.folded ? control('That’s all', {type: 'claim'}, claimable(q, b), h) : ''}</div>`;
  const status = `${b.starts.length ? `Starts at ${b.starts.map(S => placeWords(f, S)).join('; ')}.` : 'No starts yet.'}${b.folded ? ' Folded.' : ''}`;
  return `<div class="fd-puzzle" data-mechanic-wire="folds">${boardHtml(f, parts.join(''), buttons.join(''), 'Board with a river')}${tools}${noteHtml(told ? SAY[told.why] : '')}<p class="sr-only">${esc(status)}</p></div>`;
}

function renderWalls(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), f = frame(viewOf(q, b)), A = q.dots.A, B = q.dots.B, t = b.touches;
  const s = slice(q, b), refusal = refusalFor(b, s), told = b.told ? refusal : null, h = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const lower = wallLine(q, 'lower'), upper = wallLine(q, 'upper'), [vx0, vy0, vx1, vy1] = f.view;
  const outside = `<rect class="fd-far" x="0" y="0" width="${f.cols * U}" height="${f.Y(upper.at).toFixed(1)}"/><rect class="fd-far" x="0" y="${f.Y(lower.at).toFixed(1)}" width="${f.cols * U}" height="${((lower.at - vy0 + .5) * U).toFixed(1)}"/>`;
  const parts = [paper(f), outside, lineDrawing(f, lower, 'fd-wall'), lineDrawing(f, upper, 'fd-wall'), ticks(f, lower), ticks(f, upper)];
  void vx0; void vx1; void vy1;
  if (t.length) {
    const pts = [A, ...t.map(x => pointOn(wallLine(q, x.wall), x.at)), ...(t.length === 2 ? [B] : [])];
    if (b.folded) {
      const u = unfoldWalls(q, t);
      if (u.wall2 !== undefined) parts.push(seg(f, [vx0 - .5, u.wall2], [vx1 + .5, u.wall2], 'fd-wall image'));
      parts.push(polyline(f, pts, 'fd-route r0 faint'), polyline(f, t.length === 2 ? u.points : u.points, 'fd-route r0 folded'), letter(f, prime('B', t.length), u.image, 'image'));
    } else parts.push(polyline(f, pts, 'fd-route r0'));
    for (const x of t) parts.push(dot(f, pointOn(wallLine(q, x.wall), x.at), 'fd-contact r0'));
  }
  if (done || b.lost) for (const w of ['lower', 'upper']) {
    const best = wallsBest(q, w);
    if (!b.folded || t[0]?.wall !== w) parts.push(seg(f, A, best.image, 'fd-straight'), letter(f, prime('B', 2), best.image, 'image other'));
  }
  parts.push(letter(f, 'A', A), letter(f, 'B', B));
  const buttons = [], hintedAt = hinted(h, x => x.type === 'touch') ? h.action : null;
  if (!done && !b.lost) for (const w of ['lower', 'upper']) for (let k = q.walls.from; k <= q.walls.to; k++) {
    const pt = pointOn(wallLine(q, w), k), i = t.findIndex(x => x.wall === w && x.at === k);
    buttons.push(button(f, pt, `${moveAttr({type: 'touch', wall: w, at: k})} data-focus="fd-${w}-${k}"`, `${w === 'lower' ? 'Lower' : 'Upper'} wall at ${k - f.view[0]}${i >= 0 ? `, touched ${i ? 'second' : 'first'}` : ''}`, `fd-on-line${hintedAt && hintedAt.wall === w && hintedAt.at === k ? ' hinted' : ''}`));
  }
  const tools = done ? '' : b.lost ? `<div class="fd-tools">${control('Again', {type: 'again'}, true, h)}</div>`
    : `<div class="fd-tools">${foldButton(b, h)}${b.folded ? control('Shortest', {type: 'claim'}, claimable(q, b), h) : ''}</div>`;
  const note = b.lost ? SAY.order : told ? SAY[told.why] : !done && b.folded && t.length === 2 && b.seen.length < 2 ? SAY.other : '';
  const status = t.length ? `The route touches ${t.map(x => `the ${x.wall} wall at ${x.at - f.view[0]}`).join(', then ')}.` : 'No touches yet.';
  return `<div class="fd-puzzle" data-mechanic-wire="folds">${boardHtml(f, parts.join(''), buttons.join(''), 'Board with two walls')}${tools}${noteHtml(note)}<p class="sr-only">${esc(status + (b.folded ? ' Folded.' : ''))}</p></div>`;
}

function thumb(q, path, i, still, h) {
  const f = frame(q.view), [x0, y0, x1, y1] = q.rect;
  const svg = `<rect class="fd-block" x="${f.X(x0)}" y="${f.Y(y1)}" width="${(x1 - x0) * U}" height="${(y1 - y0) * U}"/>${polyline(f, blockPoints(q, path), 'fd-route r1')}${dot(f, q.dots.A, 'fd-thumb-dot', .3)}${dot(f, q.dots.B, 'fd-thumb-dot', .3)}`;
  const picture = `<svg viewBox="0 0 ${f.cols * U} ${f.rows * U}" aria-hidden="true">${svg}</svg>`, name = `Kept route ${i + 1}, round ${path.length} ${path.length === 1 ? 'corner' : 'corners'}`;
  if (still) return `<span class="fd-chip still" role="img" aria-label="${esc(name)}">${picture}</span>`;
  return `<button type="button" class="fd-chip${hinted(h, a => a.type === 'drop' && a.i === i) ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'drop', i}))}" data-focus="fd-chip-${i}" aria-label="${esc(name)}. Tap to take it off the shelf.">${picture}</button>`;
}
// The shortest route bending only at corners on the other side of the line
// through A and B from the only shortest route, or null when there is a tie.
function otherSide(q) {
  const {all, shortest} = blockRoutes(q);
  if (shortest.length !== 1) return null;
  const sideOf = path => Math.sign(cornersOf(q.rect)[path[0]][1] - q.axis), mine = sideOf(shortest[0]);
  const others = all.filter(path => path.every(i => Math.sign(cornersOf(q.rect)[i][1] - q.axis) === -mine));
  return others.reduce((best, path) => !best || compareLengths(blockLegs(q, path), blockLegs(q, best)) < 0 ? path : best, null);
}
function renderBlock(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), lost = b.lost === true, over = done || lost, f = frame(q.view), [x0, y0, x1, y1] = q.rect, corners = cornersOf(q.rect);
  const s = slice(q, b), refusal = refusalFor(b, s), told = b.told ? refusal : null, h = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const flip = ([x, y]) => [x, 2 * q.axis - y];
  const parts = [paper(f), `<rect class="fd-block" x="${f.X(x0)}" y="${f.Y(y1)}" width="${(x1 - x0) * U}" height="${(y1 - y0) * U}"/>`];
  for (const path of b.shelf) parts.push(polyline(f, blockPoints(q, path), 'fd-route r1 kept'));
  const pts = blockPoints(q, b.path), legal = blockLegal(q, b.path);
  // Folded, every kept route and the route in hand flip over the line
  // through A and B (dashed), so a route on one side lies over or around
  // one on the other. After a solve with one shortest route, the best route
  // round the other side is flipped too: it lies outside the kept one.
  if (b.folded) {
    parts.push(seg(f, [f.view[0] - .5, q.axis], [f.view[2] + .5, q.axis], 'fd-foldline'));
    for (const path of b.shelf) parts.push(polyline(f, blockPoints(q, path).map(flip), 'fd-route r1 flipped'));
    if (b.path.length && !over) parts.push(polyline(f, pts.map(flip), 'fd-route r0 flipped'));
    if (over) {
      const other = otherSide(q);
      if (other) parts.push(polyline(f, blockPoints(q, other).map(flip), 'fd-route r0 flipped'));
    }
  }
  if (!over) parts.push(polyline(f, pts.slice(0, -1), 'fd-route r0'), seg(f, pts[pts.length - 2], q.dots.B, `fd-route r0${legal ? '' : ' blocked'}`));
  // A lost try draws every shortest route, so the flipped routes can be
  // compared with them.
  if (lost) for (const path of blockRoutes(q).shortest) parts.push(polyline(f, blockPoints(q, path), 'fd-route r0'));
  for (const [i, c] of corners.entries()) parts.push(dot(f, c, `fd-corner${b.path.includes(i) ? ' on' : ''}`, .14));
  parts.push(letter(f, 'A', q.dots.A), letter(f, 'B', q.dots.B));
  const buttons = [], hintedAt = hinted(h, x => x.type === 'corner') ? h.action.i : null;
  if (!over) for (const [i, c] of corners.entries()) buttons.push(button(f, c, `${moveAttr({type: 'corner', i})} data-focus="fd-k-${i}"`, `Corner ${['bottom left', 'bottom right', 'top right', 'top left'][i]}${b.path.includes(i) ? `, bend ${b.path.indexOf(i) + 1}` : ''}`, `fd-on-line${hintedAt === i ? ' hinted' : ''}`));
  const shelf = b.shelf.length ? `<div class="fd-shelf" role="group" aria-label="Kept routes">${b.shelf.map((path, i) => thumb(q, path, i, over, h)).join('')}</div>` : '';
  const keepable = b.path.length > 0 && legal && !b.shelf.some(r => eq(r, b.path));
  const tools = done ? '' : lost ? `<div class="fd-tools">${control('Again', {type: 'again'}, true, h)}</div>`
    : `<div class="fd-tools">${control('Keep', {type: 'keep'}, keepable, h)}${foldButton(b, h)}${b.folded ? control('That’s all', {type: 'claim'}, claimable(q, b), h) : ''}</div>`;
  const status = `The route bends at ${b.path.length} ${b.path.length === 1 ? 'corner' : 'corners'}${legal ? '' : ' and its last part crosses the block'}. ${b.shelf.length} kept.${b.folded ? ' Folded.' : ''}`;
  return `<div class="fd-puzzle" data-mechanic-wire="folds">${boardHtml(f, parts.join(''), buttons.join(''), 'Board with a block')}${tools}${shelf}${noteHtml(lost ? SAY[judge(q, s).why] : told ? SAY[told.why] : '')}<p class="sr-only">${esc(status)}</p></div>`;
}

function renderPlayground(p, a) {
  const q = p.parameters, b = a.board, f = frame(q.view), line = q.line, {A, B} = b.dots, C = mirror(line, B), M = pointOn(line, b.at), held = ui(p).held;
  const parts = [paper(f), farSide(f, line, 1), lineDrawing(f, line), ticks(f, line)];
  parts.push(polyline(f, [A, M, C], 'fd-route r1'));
  parts.push(b.folded ? seg(f, M, B, 'fd-leg r0 faint') + polyline(f, [A, M, C], 'fd-route r0 folded') : polyline(f, [A, M, B], 'fd-route r0'));
  parts.push(dot(f, M, 'fd-contact r0'));
  if (held) parts.push(ring(f, b.dots[held], 'fd-chosen r0'));
  parts.push(letter(f, 'A', A), letter(f, 'B', B), letter(f, 'C', C, 'mirrored'));
  const buttons = [];
  for (const k of contacts(line)) buttons.push(button(f, pointOn(line, k), `${moveAttr({type: 'touch', at: k})} data-fd-drag data-focus="fd-c-${k}"`, `River at ${across(q, k)}${k === b.at ? ', the routes touch here' : ''}`, `fd-on-line${k === b.at ? ' on' : ''}`));
  for (const name of ['A', 'B']) buttons.push(button(f, b.dots[name], `data-fd-hold="${name}" data-focus="fd-l-${name}" aria-pressed="${held === name}"`, `${name}: pick up to move`, 'fd-on-letter'));
  if (held) for (let x = q.place[0]; x <= q.place[2]; x++) for (let y = q.place[1]; y <= q.place[3]; y++) {
    const pt = [x, y];
    if (side(line, pt) > 0 && !same(pt, A) && !same(pt, B)) buttons.push(button(f, pt, `${moveAttr({type: 'move', dot: held, at: pt})} data-focus="fd-p-${x}_${y}"`, `Put ${held} at ${placeWords(f, pt)}`, 'fd-free'));
  }
  const tools = `<div class="fd-tools">${foldButton(b, null)}</div>`;
  return `<div class="fd-puzzle" data-mechanic-wire="folds">${boardHtml(f, parts.join(''), buttons.join(''), 'Board with a river', 'drag')}${tools}<p class="sr-only" role="status">${esc(`The routes touch the river at ${across(q, b.at)}.${b.folded ? ' Folded.' : ''}`)}</p></div>`;
}
// A try ended by a wrong final choice keeps Undo off until Again.
const locked = new Set();
function render(p, a) {
  const q = p.parameters;
  if (valid(p, a.board) && isLost(q, a.board)) locked.add(p.id); else locked.delete(p.id);
  if (!valid(p, a.board)) return '<div class="fd-puzzle" data-mechanic-wire="folds"><p class="fd-note">Restart to reset the board.</p></div>';
  return q.mode === 'route' ? renderRoute(p, a) : q.mode === 'every' ? renderEvery(p, a) : q.mode === 'walls' ? renderWalls(p, a) : q.mode === 'block' ? renderBlock(p, a) : renderPlayground(p, a);
}

// --- Wiring ----------------------------------------------------------------
// Taps on the board go through the module, so an illegal tap shakes the
// point. In the playground a finger slides the contact along the river, and
// the arrow keys step it.
let drag = null, swallow = false;
const shake = el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
function contactFrom(boardEl, q, clientX, clientY) {
  const r = boardEl.getBoundingClientRect(), [x0, y0, x1, y1] = q.view, cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  const k = q.line.dir === 'h' ? Math.round(x0 - .5 + (clientX - r.left) / r.width * cols) : Math.round(y1 + .5 - (clientY - r.top) / r.height * rows);
  const list = contacts(q.line);
  return Math.min(Math.max(k, list[0]), list.at(-1));
}
function onDragMove(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const boardEl = document.querySelector('[data-mechanic-wire="folds"] [data-fd-board]');
  if (!boardEl) return;
  const k = contactFrom(boardEl, drag.q, e.clientX, e.clientY);
  if (k !== drag.api.attempt().board.at) drag.api.apply({type: 'touch', at: k});
  e.preventDefault();
}
function onDragEnd(e) { if (drag && e.pointerId === drag.pointer) { drag = null; swallow = true; setTimeout(() => { swallow = false; }, 0); } }
let listening = false;
function wire(root, p, api) {
  const q = p.parameters;
  if (q.mode === 'playground') {
    if (!listening && typeof document !== 'undefined') { document.addEventListener('pointermove', onDragMove, {passive: false}); for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, onDragEnd); listening = true; }
    root.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-fd-drag]');
      if (!el || e.button > 0 || !e.isPrimary) return;
      drag = {pointer: e.pointerId, q, api};
      const action = JSON.parse(el.dataset.fdMove);
      if (action.at !== api.attempt().board.at) api.apply(action);
      e.preventDefault();
    });
    root.addEventListener('keydown', e => {
      const el = e.target.closest('[data-fd-drag]');
      const step = {ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1}[e.key];
      if (!el || !step) return;
      e.preventDefault();
      const list = contacts(q.line), k = Math.min(Math.max(api.attempt().board.at + step, list[0]), list.at(-1));
      if (k !== api.attempt().board.at) api.apply({type: 'touch', at: k});
      document.querySelector(`[data-mechanic-wire="folds"] [data-focus="fd-c-${k}"]`)?.focus();
    });
  }
  root.addEventListener('click', e => {
    if (swallow) { swallow = false; return; }
    const el = e.target.closest('[data-fd-move],[data-fd-pick],[data-fd-hold]');
    if (!el || !root.contains(el) || el.disabled) return;
    if (el.dataset.fdPick !== undefined) { api.ui({route: Number(el.dataset.fdPick)}); return; }
    if (el.dataset.fdHold !== undefined) { api.ui({held: el.dataset.fdHold}); return; }
    let action;
    try { action = JSON.parse(el.dataset.fdMove); } catch { return; }
    if (!move(p, api.attempt().board, action)) { if (!(q.mode === 'playground' && action.type === 'touch')) shake(el); return; }
    if (q.mode === 'playground' && action.type === 'move') ui(p).held = null;
    api.apply(action);
  });
}

export const foldMechanics = {
  folds: {
    fresh, valid, solved, move, hint, render, wire, carry,
    ui: uiHook,
    reset: p => { uiState.delete(p.id); },
    noHint: p => p.parameters.mode === 'playground',
    noUndo: p => p.parameters.mode === 'playground' || locked.has(p.id)
  }
};
// For the validator and tests.
export {fresh as freshBoard, valid as validFold, solved as solvedFold, move as moveFold, hint as hintFold, carry as carryFold, slice as sliceOf};

// The family seam entry (dist/families.js). The puzzles join Mirror Couriers
// as its Shortest routes group, so the module adds no satchel family.
export default {
  id: 'folds',
  mechanics: foldMechanics,
  pack: new URL('./folds.json', import.meta.url).href,
  css: new URL('./folds.css', import.meta.url).href,
  focus: '[data-mechanic-wire="folds"] .fd-pt:not(:disabled),[data-mechanic-wire="folds"] .fd-button:not(:disabled)'
};
