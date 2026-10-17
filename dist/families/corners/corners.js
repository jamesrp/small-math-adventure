// Corners (worksheet Week 56: corners of a solid, Euler's formula and the
// angular gap). One satchel family, two groups.
//
// Rings. Corners of regular triangles (60°), squares (90°) and pentagons
// (108°), every shape with the same side, lie flat around a point, side to
// side. Fold joins the first corner's free side to the last one's. A ring of
// three or more of these corners folds into a pointed corner with no dents
// exactly when its angles add to less than a full turn (each angle is less
// than the sum of the others, so the convex corner exists); it lies flat when
// they make a full turn, and it overlaps when they make more. The missing part
// of the turn is the corner's gap. With triangles and squares, 11 rings fold
// to a point and 4 lie flat; no ring with a pentagon lies flat. A ring with
// some corners fixed and the rest free folds exactly when it folds with the
// smallest corner on offer in every free place, so that ring is the
// certificate for Can't.
//
// Trees. An opened drawing is a convex solid seen through one face that has
// been taken out: a connected plane drawing whose closed regions are the other
// faces. Erasing a line with two different spaces on its sides keeps every dot
// joined and removes exactly one region; erasing one with the same space on
// both sides cuts the drawing in two. Erasing down to a tree takes as many
// erasures as there are regions, and a tree has one line fewer than dots, so
// dots − lines + regions is 1 in the opened drawing and V − E + F is 2 on the
// solid (worksheet Problem 7).
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keysAre = (b, list) => object(b) && Object.keys(b).sort().join() === [...list].sort().join();
const isBool = v => typeof v === 'boolean';
const f = n => Number(n.toFixed(2));
const RAD = Math.PI / 180;

// --- Corners and rings ---------------------------------------------------------
export const PIECES = {
  T: {sides: 3, angle: 60, name: 'triangle'},
  S: {sides: 4, angle: 90, name: 'square'},
  P: {sides: 5, angle: 108, name: 'pentagon'}
};
export const LETTERS = ['T', 'S', 'P'];
export const TURN = 360;
// Rings stop at eight corners: enough to pass a full turn with triangles.
export const MAX_RING = 8;
export const totalOf = ring => ring.reduce((sum, c) => sum + PIECES[c].angle, 0);
// What Fold does with a ring of three or more corners.
export const foldOf = ring => { const t = totalOf(ring); return t < TURN ? 'point' : t === TURN ? 'flat' : 'over'; };
// A ring read from any corner, either way round, is the same ring.
export function variantsOf(ring) {
  const out = [], n = ring.length;
  for (const r of [ring, [...ring].reverse()]) for (let k = 0; k < n; k++) out.push([...r.slice(k), ...r.slice(0, k)]);
  return out;
}
const canonCache = new Map();
export function canonOf(ring) {
  const key = ring.join('');
  if (!canonCache.has(key)) canonCache.set(key, variantsOf(ring).map(r => r.join('')).sort()[0]);
  return canonCache.get(key);
}
export const sameRing = (a, b) => a.length === b.length && canonOf(a) === canonOf(b);
const ringWords = ring => ring.map(c => PIECES[c].name).join(', ');

// Every ring a find-every puzzle asks for, as canonical strings: rings of the
// menu's corners with the goal's fold (and the goal's number of corners).
const answerCache = new Map();
export function answersOf(q) {
  const key = JSON.stringify([q.menu, q.goal, q.count || 0]);
  if (answerCache.has(key)) return answerCache.get(key);
  const out = new Set();
  (function grow(ring) {
    if (ring.length >= 3 && (!q.count || ring.length === q.count) && foldOf(ring) === q.goal) out.add(canonOf(ring));
    if (totalOf(ring) >= TURN || ring.length >= (q.count || MAX_RING)) return;
    for (const c of q.menu) grow([...ring, c]);
  })([]);
  const list = [...out].sort((a, b) => a.length - b.length || a.localeCompare(b));
  answerCache.set(key, list);
  return list;
}
// Make: the fixed corners come first; the other places are free.
export const smallestOf = q => q.menu.reduce((a, c) => PIECES[c].angle < PIECES[a].angle ? c : a);
export const freeCount = q => q.count - q.locked.length;
export const smallestRing = q => [...q.locked, ...Array(freeCount(q)).fill(smallestOf(q))];
// The goal can be met exactly when it is met with the smallest corner in every
// free place: a bigger corner only adds to the total.
export const possible = q => foldOf(smallestRing(q)) === 'point';
// The free corners (as sorted strings) that fold the ring to a point.
const fillCache = new Map();
export function fillsOf(q) {
  const key = JSON.stringify([q.locked, q.count, q.menu]);
  if (fillCache.has(key)) return fillCache.get(key);
  const out = new Set();
  (function grow(free) {
    if (free.length === freeCount(q)) { if (foldOf([...q.locked, ...free]) === 'point') out.add([...free].sort().join('')); return; }
    for (const c of q.menu) grow([...free, c]);
  })([]);
  const list = [...out].sort();
  fillCache.set(key, list);
  return list;
}

// --- Rings: boards ---------------------------------------------------------------
// every: {ring, fold, shelf, again, refused, shown, done}
// make: {ring, fold, refused, shown, claimed}     playground: {ring, fold}
// `fold` is what the last Fold did to this ring (cleared by any change).
// `again` points at the shelf's copy of a ring kept twice. `refused` is a
// claim's answer: That's all's {kind: 'off', index} (a kept ring that doesn't
// belong) or {kind: 'more'}, or Can't's {kind: 'folds'} or {kind: 'smaller',
// index}; it locks the claim until the shelf (That's all) or the ring (Can't)
// changes. `shown` is whether its words are on the board: Undo clears the
// words and keeps the lock.
const MODES = ['every', 'make', 'playground'];
const capOf = q => q.count || MAX_RING;
const lockedOf = q => q.mode === 'make' ? q.locked.length : 0;
function freshRing(p) {
  const q = p.parameters;
  if (q.mode === 'every') return {ring: [], fold: null, shelf: [], again: null, refused: null, shown: false, done: false};
  if (q.mode === 'make') return {ring: [...q.locked], fold: null, refused: null, shown: false, claimed: false};
  return {ring: [], fold: null};
}
const isRing = (q, ring) => Array.isArray(ring) && ring.length <= capOf(q) && ring.every(c => q.menu.includes(c) || false);
// That's all judges the whole shelf: the first kept ring that doesn't belong,
// else whether one is missing.
export function judgeShelf(q, shelf) {
  const answers = answersOf(q), index = shelf.findIndex(r => !answers.includes(canonOf(r)));
  if (index >= 0) return {kind: 'off', index};
  return shelf.length < answers.length ? {kind: 'more'} : null;
}
// Can't is judged on the ring on the board: one that folds is refused; one
// with a free corner bigger than the smallest on offer doesn't show that no
// ring folds; a ring with the smallest corner in every free place that still
// doesn't fold proves it.
export function judgeCant(q, ring) {
  if (foldOf(ring) === 'point') return {kind: 'folds'};
  const small = smallestOf(q), index = ring.findIndex((c, i) => i >= q.locked.length && c !== small);
  return index >= 0 ? {kind: 'smaller', index} : null;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function validRing(p, b) {
  const q = p.parameters;
  if (!object(b) || !MODES.includes(q.mode)) return false;
  const fields = q.mode === 'every' ? ['ring', 'fold', 'shelf', 'again', 'refused', 'shown', 'done'] : q.mode === 'make' ? ['ring', 'fold', 'refused', 'shown', 'claimed'] : ['ring', 'fold'];
  if (!keysAre(b, fields) || !isRing(q, b.ring)) return false;
  if (q.mode === 'make' && !q.locked.every((c, i) => b.ring[i] === c)) return false;
  // A fold belongs to a ring that can be folded: three corners or more, every place filled.
  if (b.fold !== null && (!['point', 'flat', 'over'].includes(b.fold) || !foldable(q, b.ring) || b.fold !== foldOf(b.ring))) return false;
  if (q.mode === 'playground') return true;
  if (!isBool(b.shown) || (b.shown && b.refused === null)) return false;
  if (q.mode === 'make') {
    if (!isBool(b.claimed)) return false;
    if (b.refused !== null && (b.refused.kind !== 'smaller' || b.ring.length !== q.count || !same(b.refused, judgeCant(q, b.ring)))) return false;
    if (b.claimed && (b.refused !== null || b.ring.length !== q.count || b.fold === null || judgeCant(q, b.ring) !== null)) return false;
    return true;
  }
  if (!isBool(b.done) || !Array.isArray(b.shelf) || !b.shelf.every(r => isRing(q, r) && keepable(q, r))) return false;
  if (new Set(b.shelf.map(canonOf)).size !== b.shelf.length) return false;
  if (b.again !== null && !(Number.isInteger(b.again) && b.again >= 0 && b.again < b.shelf.length && sameRing(b.shelf[b.again], b.ring))) return false;
  if (b.refused !== null && (b.done || !b.shelf.length || !same(b.refused, judgeShelf(q, b.shelf)))) return false;
  if (b.done && (b.refused !== null || judgeShelf(q, b.shelf) !== null)) return false;
  return true;
}
const foldable = (q, ring) => ring.length >= 3 && (q.mode !== 'make' || ring.length === q.count);
const keepable = (q, ring) => ring.length >= 3 && (!q.count || ring.length === q.count);
function solvedRing(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !validRing(p, b)) return false;
  if (q.mode === 'every') return b.done;
  return b.fold === 'point' || b.claimed;
}
// A change to the ring clears its fold, a shelf copy pointer and (in make)
// a Can't answer.
function withRing(q, b, ring) {
  const next = {...b, ring, fold: null};
  if (q.mode === 'every') next.again = null;
  if (q.mode === 'make') { next.refused = null; next.shown = false; }
  return next;
}
function moveRing(p, b, action) {
  const q = p.parameters;
  if (!validRing(p, b) || solvedRing(p, b) || !object(action)) return null;
  switch (action.type) {
    case 'add':
      if (!q.menu.includes(action.piece) || b.ring.length >= capOf(q)) return null;
      return withRing(q, b, [...b.ring, action.piece]);
    case 'take': {
      const i = action.index;
      if (!Number.isInteger(i) || i < lockedOf(q) || i >= b.ring.length) return null;
      return withRing(q, b, b.ring.filter((_, j) => j !== i));
    }
    case 'fold':
      if (b.fold !== null || !foldable(q, b.ring)) return null;
      return {...b, fold: foldOf(b.ring)};
    case 'unfold':
      return b.fold === 'point' || b.fold === 'flat' ? {...b, fold: null} : null;
    case 'keep': {
      if (q.mode !== 'every' || b.again !== null || !keepable(q, b.ring)) return null;
      const at = b.shelf.findIndex(r => sameRing(r, b.ring));
      if (at >= 0) return {...b, again: at};
      return {...b, shelf: [...b.shelf, [...b.ring]], again: null, refused: null, shown: false};
    }
    case 'drop': {
      const i = action.index;
      if (q.mode !== 'every' || !Number.isInteger(i) || i < 0 || i >= b.shelf.length) return null;
      return {...b, shelf: b.shelf.filter((_, j) => j !== i), again: null, refused: null, shown: false};
    }
    case 'all': {
      if (q.mode !== 'every' || !b.shelf.length || b.refused !== null) return null;
      const verdict = judgeShelf(q, b.shelf);
      return verdict ? {...b, refused: verdict, shown: true, again: null} : {...b, done: true, again: null};
    }
    case 'cant': {
      // Can't is pressed on a full ring that has been folded and didn't close.
      if (q.mode !== 'make' || b.refused !== null || b.ring.length !== q.count || b.fold === null) return null;
      const verdict = judgeCant(q, b.ring);
      return verdict ? {...b, refused: verdict, shown: true} : {...b, claimed: true};
    }
    default:
      return null;
  }
}

// --- Rings: hints ------------------------------------------------------------------
// The longest start of `target` that `ring` holds in order, by a greedy match.
function embedding(ring, target) {
  const used = [];
  let k = 0;
  for (let i = 0; i < ring.length && k < target.length; i++) if (ring[i] === target[k]) { used.push(i); k++; }
  return {k, used};
}
// The fewest adds and take-outs from `ring` to some reading of one of `targets`:
// keep a run of the ring that starts the target, take out the rest, then add.
// `from` is the first place that may be taken out (fixed corners stay).
export function planToward(ring, targets, from = 0) {
  let best = null;
  for (const t of targets) for (const v of variantsOf([...t])) {
    if (!ring.slice(0, from).every((c, i) => v[i] === c)) continue;
    const {k, used} = embedding(ring, v), cost = ring.length - k + v.length - k;
    if (!best || cost < best.cost) best = {cost, target: v, k, used};
  }
  if (!best) return null;
  const extra = ring.findIndex((_, i) => i >= from && !best.used.includes(i));
  if (extra >= 0) return {type: 'take', index: extra};
  if (best.k < best.target.length) return {type: 'add', piece: best.target[best.k]};
  return {type: 'done'};
}
const a = c => PIECES[c].name === 'triangle' ? 'a triangle' : PIECES[c].name === 'square' ? 'a square' : 'a pentagon';
// A step on the ring itself: taking out needs the ring laid flat first.
function ringStep(b, step) {
  if (step.type === 'take' && (b.fold === 'point' || b.fold === 'flat')) return {type: 'move', action: {type: 'unfold'}, text: 'Tap the folded corner to lay it flat.', mark: 'unfold'};
  if (step.type === 'take') return {type: 'move', action: step, text: `Take out this ${PIECES[b.ring[step.index]].name}.`, mark: `take-${step.index}`};
  return {type: 'move', action: step, text: `Add ${a(step.piece)}.`, mark: `add-${step.piece}`};
}
const goalWords = q => q.goal === 'flat' ? 'lies flat' : 'folds to a point';
const notWords = ring => ({point: 'it folds to a point', flat: 'it lies flat', over: 'its corners overlap'})[foldOf(ring)];
function everyHint(q, b) {
  const answers = answersOf(q), kept = b.shelf.map(canonOf);
  const wrong = kept.findIndex(c => !answers.includes(c));
  if (wrong >= 0) {
    const r = b.shelf[wrong], why = keepable(q, r) && foldOf(r) !== q.goal ? `: ${notWords(r)}` : '';
    return {type: 'move', action: {type: 'drop', index: wrong}, text: `Take this ring off the shelf${why}.`, mark: `shelf-${wrong}`};
  }
  const left = answers.filter(c => !kept.includes(c));
  if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Every ring is on the shelf. Press That’s all.', mark: 'all'};
  if (keepable(q, b.ring) && left.includes(canonOf(b.ring)) && b.again === null) return {type: 'move', action: {type: 'keep'}, text: `This ring ${goalWords(q)} and isn’t on the shelf. Press Keep.`, mark: 'keep'};
  // The ring on the board is never a missing answer here (that would be Keep),
  // so the plan always has a step.
  return ringStep(b, planToward(b.ring, left));
}
function makeHint(q, b) {
  const L = q.locked.length, free = b.ring.slice(L), small = smallestOf(q);
  if (possible(q)) {
    // Toward the closing fill that keeps most of the child's free corners.
    const fills = fillsOf(q).map(s => [...s]);
    const overlap = fill => { const pool = [...fill]; let n = 0; for (const c of free) { const j = pool.indexOf(c); if (j >= 0) { pool.splice(j, 1); n++; } } return n; };
    const fill = fills.reduce((top, s) => overlap(s) > overlap(top) ? s : top, fills[0]);
    const pool = [...fill], extra = free.findIndex(c => { const j = pool.indexOf(c); if (j >= 0) { pool.splice(j, 1); return false; } return true; });
    if (extra >= 0) return ringStep(b, {type: 'take', index: L + extra});
    if (pool.length) return ringStep(b, {type: 'add', piece: pool.find(c => c === small) || pool[0]});
    return {type: 'move', action: {type: 'fold'}, text: 'Press Fold.', mark: 'fold'};
  }
  // No ring like this folds: build the one that shows it, fold it, then Can't.
  const big = free.findIndex(c => c !== small);
  if (big >= 0) return ringStep(b, {type: 'take', index: L + big});
  if (b.ring.length < q.count) return ringStep(b, {type: 'add', piece: small});
  if (b.fold === null) return {type: 'move', action: {type: 'fold'}, text: `Fold it. ${PIECES[small].name === 'triangle' ? 'Triangles are' : 'Squares are'} the smallest corners here, and even with them the corners ${foldOf(b.ring) === 'flat' ? 'make a whole turn' : 'go past a whole turn'}.`, mark: 'fold'};
  return {type: 'move', action: {type: 'cant'}, text: `Any other corner in a free place is bigger, so no ring like this folds to a point. Press Can’t.`, mark: 'cant'};
}
const hintCache = new Map();
function hintRing(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !validRing(p, b) || solvedRing(p, b)) return {type: 'done'};
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (hintCache.has(key)) return hintCache.get(key);
  const h = q.mode === 'every' ? everyHint(q, b) : makeHint(q, b);
  if (hintCache.size > 4000) hintCache.clear();
  hintCache.set(key, h);
  return h;
}

// --- Rings: drawing ----------------------------------------------------------------
// The flat ring: corner i fills the wedge from s_i to s_i + angle_i around
// the point, the first starting at the ray to the right, counterclockwise.
export const EDGE = 30;
const COLOURS = {T: [239, 199, 110], S: [156, 201, 222], P: [231, 162, 143]};
// A regular polygon with one corner at the origin and its first side along
// `start` (degrees, counterclockwise, y up).
export function piecePoints(c, start, L = EDGE) {
  const n = PIECES[c].sides, pts = [[0, 0]];
  let d = start * RAD;
  for (let k = 1; k < n; k++) { const [x, y] = pts[k - 1]; pts.push([x + L * Math.cos(d), y + L * Math.sin(d)]); d += 2 * Math.PI / n; }
  return pts;
}
export const startsOf = ring => { const out = []; let s = 0; for (const c of ring) { out.push(s); s += PIECES[c].angle; } return out; };
const svgPts = (pts, k = 1, [dx, dy] = [0, 0]) => pts.map(([x, y]) => `${f(dx + x * k)},${f(dy - y * k)}`).join(' ');
// The wedge of the turn from angle `from` to `to` (degrees, counterclockwise).
const wedgePath = (r, from, to) => {
  const large = to - from > 180 ? 1 : 0, [x1, y1] = [r * Math.cos(from * RAD), -r * Math.sin(from * RAD)], [x2, y2] = [r * Math.cos(to * RAD), -r * Math.sin(to * RAD)];
  return `M0,0 L${f(x1)},${f(y1)} A${f(r)},${f(r)} 0 ${large} 0 ${f(x2)},${f(y2)} Z`;
};
const arcPath = (r, from, to) => {
  const large = to - from > 180 ? 1 : 0, [x1, y1] = [r * Math.cos(from * RAD), -r * Math.sin(from * RAD)], [x2, y2] = [r * Math.cos(to * RAD), -r * Math.sin(to * RAD)];
  return `M${f(x1)},${f(y1)} A${f(r)},${f(r)} 0 ${large} 0 ${f(x2)},${f(y2)}`;
};

// The folded corner. Its edges are unit vectors e_i from the apex on a small
// circle of angular radius r; neighbours are θ_i apart when the azimuths
// differ by 2 asin(sin(θ_i / 2) / sin r). Either the azimuths go once round
// (the circle's centre inside the corner) or the longest side's azimuth equals
// the others' together (centre outside); r comes from bisection. A ring that
// makes a full turn lies flat (r = 90°). Returns the faces in 3D.
export function coneOf(ring) {
  const th = ring.map(c => PIECES[c].angle * RAD), n = th.length, total = th.reduce((s, t) => s + t, 0);
  let e;
  if (Math.abs(total - 2 * Math.PI) < 1e-9) {
    let s = 0; e = th.map(t => { const v = [Math.cos(s), Math.sin(s), 0]; s += t; return v; });
  } else {
    const m = th.indexOf(Math.max(...th)), steps = r => th.map(t => 2 * Math.asin(Math.min(1, Math.sin(t / 2) / Math.sin(r))));
    const lo0 = th[m] / 2 + 1e-12, around = steps(lo0).reduce((s, x) => s + x, 0) >= 2 * Math.PI;
    const gap = r => { const d = steps(r); return around ? d.reduce((s, x) => s + x, 0) - 2 * Math.PI : d.reduce((s, x, i) => i === m ? s : s + x, 0) - d[m]; };
    let lo = lo0, hi = Math.PI / 2;
    for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if ((gap(mid) > 0) === around) lo = mid; else hi = mid; }
    const r = (lo + hi) / 2, d = steps(r), az = new Array(n);
    // Walk round from the corner after the longest side (from the first when the centre is inside).
    const first = around ? 0 : (m + 1) % n;
    az[first] = 0;
    for (let k = 0; k < n - 1; k++) { const i = (first + k) % n; az[(i + 1) % n] = az[i] + d[i]; }
    e = az.map(t => [Math.sin(r) * Math.cos(t), Math.sin(r) * Math.sin(t), -Math.cos(r)]);
  }
  return {e, th};
}
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const norm = u => { const l = Math.hypot(...u) || 1; return u.map(x => x / l); };
const add3 = (u, v, k = 1) => u.map((x, i) => x + v[i] * k);
// Rotate u about a unit axis by angle t (Rodrigues).
const rotate = (u, axis, t) => { const c = Math.cos(t), s = Math.sin(t), k = dot(axis, u), x = cross(axis, u); return u.map((ui, i) => ui * c + x[i] * s + axis[i] * k * (1 - c)); };
// The faces of the folded corner, oriented with the corner pointing up and its
// first edge to the right, seen from above at `tilt` degrees above the
// horizon. Each face: its corner letter, screen points (y down), whether its
// outside faces the viewer, a shade and a depth.
const coneCache = new Map();
export function foldedFaces(ring, L = EDGE, tilt = 72) {
  const key = `${ring.join('')}|${L}|${tilt}`;
  if (coneCache.has(key)) return coneCache.get(key);
  let {e} = coneOf(ring);
  const n = ring.length;
  // Turn the corner so the inside points straight down (a flat ring stays flat).
  const inside = norm(e.reduce((s, v) => add3(s, v), [0, 0, 0])), down = [0, 0, -1];
  if (Math.abs(dot(inside, down)) < 1 - 1e-9 && Math.hypot(inside[0], inside[1]) > 1e-9 && foldOf(ring) === 'point') {
    const axis = norm(cross(inside, down)), t = Math.acos(Math.max(-1, Math.min(1, dot(inside, down))));
    e = e.map(v => rotate(v, axis, t));
  }
  const spin = -Math.atan2(e[0][1], e[0][0]);
  e = e.map(v => rotate(v, [0, 0, 1], spin));
  const w = [0, -Math.cos(tilt * RAD), Math.sin(tilt * RAD)], up = [0, Math.sin(tilt * RAD), Math.cos(tilt * RAD)];
  const light = norm([-0.45, -0.35, 0.82]), centre = norm(e.reduce((s, v) => add3(s, v), [0, 0, 0]));
  const faces = ring.map((c, i) => {
    const u = e[i], v = e[(i + 1) % n], sides = PIECES[c].sides;
    const w2 = norm(add3(v, u, -dot(u, v)));
    // Walk the regular polygon in the plane of u and v.
    const flat = piecePoints(c, 0, L), pts = flat.map(([x, y]) => add3(u.map(k => k * x), w2, y));
    let nrm = norm(cross(u, v));
    if (foldOf(ring) === 'point' ? dot(nrm, centre) > 0 : nrm[2] < 0) nrm = nrm.map(k => -k);
    const outside = dot(nrm, w) > 0, lit = Math.max(0, dot(outside ? nrm : nrm.map(k => -k), light));
    const screen = pts.map(p => [dot(p, [1, 0, 0]), -dot(p, up)]);
    const depth = pts.reduce((s, p) => s + dot(p, w), 0) / sides;
    return {c, i, screen, outside, shade: (outside ? 0.84 : 0.7) + 0.24 * lit, depth};
  });
  coneCache.set(key, faces);
  return faces;
}
const tint = (c, k) => `rgb(${COLOURS[c].map(x => Math.round(Math.min(255, x * k))).join(',')})`;

// --- Rings: rendering --------------------------------------------------------------
const SHAPE_ICON = {
  T: '<polygon points="12,3.5 21.5,20 2.5,20"/>',
  S: '<rect x="4" y="4" width="16" height="16"/>',
  P: '<polygon points="12,2.6 21.4,9.4 17.8,20.4 6.2,20.4 2.6,9.4"/>'
};
const icon = c => `<svg class="cr-icon cr-${c}" viewBox="0 0 24 24" aria-hidden="true">${SHAPE_ICON[c]}</svg>`;
const button = (label, action, cls, enabled, marked, extra = '') => `<button type="button" class="secondary cr-button ${cls}${marked ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="cr-${action.type}${action.piece || ''}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;
// The flat ring on its board, with each free corner a control.
function flatSvg(q, b, opts) {
  const {ring} = b, starts = startsOf(ring), total = totalOf(ring), L = lockedOf(q);
  const live = !opts.done, over = total > TURN && ring.length >= 1;
  const pieces = ring.map((c, i) => {
    const pts = svgPts(piecePoints(c, starts[i])), past = starts[i] + PIECES[c].angle > TURN + 1e-9;
    const locked = i < L, take = live && !locked;
    const cls = `cr-piece cr-${c}${locked ? ' locked' : ''}${past ? ' past' : ''}${opts.mark === `take-${i}` ? ' hinted' : ''}`;
    const label = `${PIECES[c].name} corner, ${i + 1} of ${ring.length}${locked ? ', fixed' : ''}${take ? '. Take it out' : ''}`;
    return `<polygon class="${cls}" points="${pts}" ${take ? `role="button" tabindex="0" data-cr-take="${i}" data-focus="cr-piece-${i}"` : 'role="img"'} aria-label="${esc(label)}"/>`;
  }).join('');
  // A pin on each fixed corner.
  const pins = ring.slice(0, L).map((c, i) => { const pts = piecePoints(c, starts[i]), [x, y] = pts.reduce(([sx, sy], [px, py]) => [sx + px / pts.length, sy + py / pts.length], [0, 0]); return `<circle class="cr-pin" cx="${f(x)}" cy="${f(-y)}" r="2.6"/>`; }).join('');
  const gap = ring.length && total < TURN ? `<path class="cr-gap" d="${wedgePath(EDGE, total, TURN)}"/>` : '';
  const lap = over ? `<path class="cr-lap" d="${arcPath(EDGE * 1.1, 0, total - TURN)}"/><line class="cr-lap-ray" x1="0" y1="0" x2="${f(EDGE * 1.18)}" y2="0"/>` : '';
  return `<svg class="cr-board${over ? ' overlapping' : ''}${b.fold === 'over' ? ' refused' : ''}" viewBox="-52 -52 104 104" role="group" aria-label="Corners laid flat round the point">
${gap}<circle class="cr-turn" r="${EDGE}"/>${pieces}${pins}${lap}<circle class="cr-point" r="1.6"/></svg>`;
}
function foldedSvg(ring, opts) {
  const faces = foldedFaces(ring), xs = faces.flatMap(fc => fc.screen.map(p => p[0])), ys = faces.flatMap(fc => fc.screen.map(p => p[1]));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min(1.2, 92 / Math.max(x1 - x0, y1 - y0)), dx = -(x0 + x1) / 2 * k, dy = -(y0 + y1) / 2 * k;
  const polys = [...faces].sort((u, v) => u.depth - v.depth).map(fc => `<polygon class="cr-face cr-${fc.c}${fc.outside ? '' : ' inner'}" points="${fc.screen.map(([x, y]) => `${f(dx + x * k)},${f(dy + y * k)}`).join(' ')}" style="fill:${tint(fc.c, fc.shade)}"/>`).join('');
  const apex = `<circle class="cr-apex" cx="${f(dx)}" cy="${f(dy)}" r="1.5"/>`;
  const control = opts.live ? `role="button" tabindex="0" data-cr-unfold="1" data-focus="cr-folded" aria-label="${esc(`${opts.flat ? 'Ring lying flat' : 'Folded corner'}: ${ringWords(ring)}. Lay it flat`)}"` : `role="img" aria-label="${esc(`${opts.flat ? 'Ring lying flat' : 'Folded corner'}: ${ringWords(ring)}`)}"`;
  return `<svg class="cr-board cr-folded-board${opts.flat ? ' is-flat' : ''}${opts.mark === 'unfold' ? ' hinted' : ''}" viewBox="-52 -52 104 104" ${control}><g class="cr-folded">${polys}${opts.flat ? '' : apex}</g></svg>`;
}
// Small pictures for the shelf: the ring laid flat, or folded once judged.
function miniSvg(ring, folded) {
  if (folded && foldOf(ring) !== 'over') {
    const faces = foldedFaces(ring), xs = faces.flatMap(fc => fc.screen.map(p => p[0])), ys = faces.flatMap(fc => fc.screen.map(p => p[1]));
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], k = 90 / Math.max(x1 - x0, y1 - y0, 40);
    const dx = -(x0 + x1) / 2 * k, dy = -(y0 + y1) / 2 * k;
    return `<svg class="cr-mini" viewBox="-50 -50 100 100" aria-hidden="true">${[...faces].sort((u, v) => u.depth - v.depth).map(fc => `<polygon class="cr-face cr-${fc.c}" points="${fc.screen.map(([x, y]) => `${f(dx + x * k)},${f(dy + y * k)}`).join(' ')}" style="fill:${tint(fc.c, fc.shade)}"/>`).join('')}</svg>`;
  }
  const starts = startsOf(ring);
  return `<svg class="cr-mini" viewBox="-50 -50 100 100" aria-hidden="true">${ring.map((c, i) => `<polygon class="cr-piece cr-${c}" points="${svgPts(piecePoints(c, starts[i], 30))}"/>`).join('')}<circle class="cr-point" r="2"/></svg>`;
}
const SAYS = {
  over: 'They overlap.', flat: 'It lies flat.', again: 'Already on the shelf.', more: 'There is another.',
  smaller: 'This corner could be smaller.'
};
function offWords(q, ring) { const fold = foldOf(ring); return fold === 'flat' ? 'This one lies flat.' : fold === 'over' ? 'This one overlaps.' : 'This one folds to a point.'; }
function renderRing(p, att) {
  const q = p.parameters, b = att.board, done = solvedRing(p, b), live = !done;
  const hinted = att.hintLevel >= 2 && live && q.mode !== 'playground' ? hintRing(p, b) : null, mark = hinted?.mark || '';
  const full = b.ring.length >= capOf(q);
  const folded = b.fold === 'point' || b.fold === 'flat';
  const adds = q.menu.map(c => button(icon(c), {type: 'add', piece: c}, `cr-add cr-${c}`, live && !full, mark === `add-${c}`, `aria-label="Add ${a(c)} corner"`)).join('');
  const slots = q.count ? `<span class="cr-slots" role="img" aria-label="${b.ring.length} of ${q.count} corners">${Array.from({length: q.count}, (_, i) => `<i class="${i < b.ring.length ? 'on' : ''}${i < lockedOf(q) ? ' fixed' : ''}"></i>`).join('')}</span>` : '';
  const board = folded ? foldedSvg(b.ring, {live, flat: b.fold === 'flat', mark}) : flatSvg(q, b, {done, mark});
  let actions = '';
  if (live) {
    actions += button('Fold', {type: 'fold'}, 'cr-move cr-fold', b.fold === null && foldable(q, b.ring), mark === 'fold');
    if (q.mode === 'every') actions += button('Keep', {type: 'keep'}, 'cr-move cr-keep', b.again === null && keepable(q, b.ring), mark === 'keep') + button('That’s all', {type: 'all'}, 'cr-claim cr-all', b.shelf.length > 0 && b.refused === null, mark === 'all');
    if (q.mode === 'make') actions += button('Can’t', {type: 'cant'}, 'cr-claim cr-cant', b.refused === null && b.ring.length === q.count && b.fold !== null, mark === 'cant');
  }
  // Words only where the board can't say it.
  let told = '';
  if (b.fold === 'over') told = SAYS.over;
  else if (b.fold === 'flat' && live) told = SAYS.flat;
  if (q.mode === 'every' && b.again !== null) told = SAYS.again;
  if (b.shown && b.refused) told = b.refused.kind === 'off' ? offWords(q, b.shelf[b.refused.index]) : SAYS[b.refused.kind];
  if (q.mode === 'make' && b.claimed) told = `Even the smallest corners ${foldOf(b.ring) === 'flat' ? 'make a whole turn' : 'go past a whole turn'}.`;
  const ringed = q.mode === 'make' && b.shown && b.refused?.kind === 'smaller' ? b.refused.index : null;
  const boardHtml = ringed === null ? board : board.replace(`data-cr-take="${ringed}"`, `data-cr-take="${ringed}" data-ringed="1"`);
  const shelf = q.mode === 'every' && b.shelf.length ? `<ul class="cr-shelf" aria-label="Shelf">${b.shelf.map((r, i) => {
    const ring = (b.again === i) || (b.shown && b.refused?.kind === 'off' && b.refused.index === i);
    const label = `Ring of ${ringWords(r)}${done ? '' : '. Take it off the shelf'}`;
    return `<li>${done ? `<span class="cr-shelf-item" role="img" aria-label="${esc(label)}">${miniSvg(r, true)}</span>` : `<button type="button" class="cr-shelf-item${ring ? ' ringed' : ''}${mark === `shelf-${i}` ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'drop', index: i}))}" data-focus="cr-shelf-${i}" aria-label="${esc(label)}">${miniSvg(r, false)}</button>`}</li>`;
  }).join('')}</ul>` : '';
  const state = !b.ring.length ? 'No corners yet.' : `Corners: ${ringWords(b.ring)}. ${({point: 'They leave a gap.', flat: 'They make a whole turn.', over: 'They overlap.'})[foldOf(b.ring)]}${folded ? ` ${b.fold === 'flat' ? 'It lies flat.' : 'Folded to a point.'}` : ''}`;
  const status = `${state}${q.mode === 'every' ? ` ${b.shelf.length ? `Shelf: ${b.shelf.map(r => ringWords(r)).join('; ')}.` : 'The shelf is empty.'}` : ''}${told ? ` ${told}` : ''}${done && q.mode === 'make' && b.claimed ? ' No ring like this folds to a point.' : ''}`;
  const top = live ? `<div class="cr-bar cr-adds">${adds}${slots}</div>` : '';
  return `<div class="cr-puzzle${done ? ' solved' : ''}" data-mechanic-wire="corners">${top}${boardHtml}${actions ? `<div class="cr-bar cr-actions">${actions}</div>` : ''}${told ? `<p class="cr-told">${esc(told)}</p>` : ''}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function wireRing(root, p, api) {
  const act = el => {
    if (!el) return null;
    if (el.dataset.crTake !== undefined) return {type: 'take', index: Number(el.dataset.crTake)};
    if (el.dataset.crUnfold !== undefined) return {type: 'unfold'};
    return null;
  };
  root.addEventListener('click', e => { const action = act(e.target.closest('[data-cr-take],[data-cr-unfold]')); if (action) api.apply(action); });
  root.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key)) return;
    const action = act(e.target.closest('[data-cr-take],[data-cr-unfold]'));
    if (!action) return;
    e.preventDefault();
    api.apply(action);
  });
}

// --- Trees: the opened drawing --------------------------------------------------
// A map is {nodes: {id: [x%, y%]}, edges: [[u, v], …], aspect}. The board is
// {erased: [edge indices, ascending]}.
export const treeMap = q => graphOf({nodes: q.nodes, edges: q.edges, aspect: q.aspect, scale: .5});
const present = (q, erased) => q.edges.map((_, i) => i).filter(i => !erased.includes(i));
// Pieces of the drawing with the lines left: a piece number for every dot.
export function piecesOf(q, erased) {
  const ids = Object.keys(q.nodes), parent = Object.fromEntries(ids.map(id => [id, id]));
  const find = id => parent[id] === id ? id : (parent[id] = find(parent[id]));
  for (const i of present(q, erased)) { const [u, v] = q.edges[i]; parent[find(u)] = find(v); }
  const roots = [...new Set(ids.map(find))];
  return {of: Object.fromEntries(ids.map(id => [id, roots.indexOf(find(id))])), count: roots.length};
}
// The faces of the drawing by tracing: from a line walked u → v, turn at v to
// the next line round v. Each walk goes round one region; a piece's outer walk
// goes the other way round (negative area). Returns the walks with their
// lines' sides, the closed regions (walks with positive area) and the space on
// each side of every line left ('out' for the outside).
const faceCache = new Map();
export function facesOf(q, erased) {
  const key = JSON.stringify([q.nodes, q.edges, erased]);
  if (faceCache.has(key)) return faceCache.get(key);
  const g = treeMap(q), pos = g.pos, ids = Object.keys(q.nodes), lines = present(q, erased);
  const around = Object.fromEntries(ids.map(id => [id, []]));
  for (const i of lines) { const [u, v] = q.edges[i]; around[u].push({to: v, i}); around[v].push({to: u, i}); }
  const angle = (from, to) => Math.atan2(-(pos[to][1] - pos[from][1]), pos[to][0] - pos[from][0]);
  for (const id of ids) around[id].sort((x, y) => angle(id, x.to) - angle(id, y.to));
  const seen = new Set(), walks = [], side = {};
  for (const i of lines) for (const [u0, v0] of [q.edges[i], [...q.edges[i]].reverse()]) {
    if (seen.has(`${u0}>${v0}>${i}`)) continue;
    const walk = {dots: [], lines: [], area: 0};
    let u = u0, v = v0, j = i;
    do {
      seen.add(`${u}>${v}>${j}`); walk.dots.push(u); walk.lines.push(j);
      (side[j] ||= []).push(walks.length);
      const list = around[v], at = list.findIndex(x => x.to === u && x.i === j), next = list[(at - 1 + list.length) % list.length];
      u = v; v = next.to; j = next.i;
    } while (!(u === u0 && v === v0 && j === i));
    for (let k = 0; k < walk.dots.length; k++) { const [x1, y1] = pos[walk.dots[k]], [x2, y2] = pos[walk.dots[(k + 1) % walk.dots.length]]; walk.area += x1 * (-y2) - x2 * (-y1); }
    walk.area /= 2;
    walks.push(walk);
  }
  const closed = walks.map((w, k) => w.area > 1e-9 ? k : -1).filter(k => k >= 0);
  // The space round a piece's outer walk: the smallest closed region of
  // another piece that holds it, else the outside.
  const pieces = piecesOf(q, erased), inPoly = ([x, y], dots) => { let c = false; for (let a = 0, b = dots.length - 1; a < dots.length; b = a++) { const [xa, ya] = pos[dots[a]], [xb, yb] = pos[dots[b]]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) c = !c; } return c; };
  const space = walks.map((w, k) => {
    if (w.area > 1e-9) return k;
    const piece = pieces.of[w.dots[0]], holders = closed.filter(c => pieces.of[walks[c].dots[0]] !== piece && inPoly(pos[w.dots[0]], walks[c].dots));
    return holders.length ? holders.reduce((s, c) => walks[c].area < walks[s].area ? c : s) : 'out';
  });
  const out = {walks, closed, sides: Object.fromEntries(lines.map(i => [i, side[i].map(k => space[k])])), walkSides: side};
  faceCache.set(key, out);
  return out;
}
// A line with the same walk on both sides holds a piece on: erasing it cuts.
export const holdsOn = (faces, i) => faces.walkSides[i][0] === faces.walkSides[i][1];
export const isTree = (q, erased) => piecesOf(q, erased).count === 1 && present(q, erased).length === Object.keys(q.nodes).length - 1;
const validErased = (q, list) => Array.isArray(list) && list.every((i, k) => Number.isInteger(i) && i >= 0 && i < q.edges.length && (k === 0 || i > list[k - 1]));
const freshTree = () => ({erased: []});
const validTree = (p, b) => keysAre(b, ['erased']) && validErased(p.parameters, b.erased);
const solvedTree = (p, b) => validTree(p, b) && isTree(p.parameters, b.erased);
function moveTree(p, b, action) {
  const q = p.parameters;
  if (!validTree(p, b) || solvedTree(p, b) || !object(action) || action.type !== 'line') return null;
  const i = action.line;
  if (!Number.isInteger(i) || i < 0 || i >= q.edges.length) return null;
  return {erased: b.erased.includes(i) ? b.erased.filter(j => j !== i) : [...b.erased, i].sort((x, y) => x - y)};
}
// Hints: first draw back a line that joins two pieces; then erase a line
// between the outside and a closed region, as the worksheet guide's route does.
function hintTree(p, b) {
  const q = p.parameters;
  if (!validTree(p, b) || solvedTree(p, b)) return {type: 'done'};
  const pieces = piecesOf(q, b.erased);
  if (pieces.count > 1) {
    const back = [...b.erased].reverse().find(i => { const [u, v] = q.edges[i]; return pieces.of[u] !== pieces.of[v]; });
    return {type: 'move', action: {type: 'line', line: back}, text: 'Some dots are cut off. Draw this line back.', line: back};
  }
  const faces = facesOf(q, b.erased);
  const peel = present(q, b.erased).find(i => !holdsOn(faces, i) && faces.sides[i].includes('out')) ?? present(q, b.erased).find(i => !holdsOn(faces, i));
  return {type: 'move', action: {type: 'line', line: peel}, text: 'Erase a line with the outside on one side and a shaded region on the other.', line: peel};
}
function renderTree(p, att) {
  const q = p.parameters, b = att.board, g = treeMap(q), done = solvedTree(p, b);
  const hinted = att.hintLevel >= 2 && !done ? hintTree(p, b) : null;
  const pieces = piecesOf(q, b.erased), faces = facesOf(q, b.erased);
  // The biggest piece is the drawing; dots in any other piece are cut off.
  const size = {};
  for (const id of Object.keys(q.nodes)) size[pieces.of[id]] = (size[pieces.of[id]] || 0) + 1;
  const main = Object.keys(size).map(Number).reduce((top, k) => size[k] > size[top] ? k : top, pieces.of[Object.keys(q.nodes)[0]]);
  const regions = faces.closed.map(k => `<polygon class="ct-region" points="${faces.walks[k].dots.map(id => `${f(g.pos[id][0])},${f(g.pos[id][1])}`).join(' ')}"/>`).join('');
  const sideWords = i => { const s = faces.sides[i]; return holdsOn(faces, i) ? ', the same space on both sides' : s.includes('out') ? ', between the outside and a shaded region' : ', between two shaded regions'; };
  const board = graphBoard(g, {
    cls: `ct-map${done ? ' tree' : ''}`, label: 'Opened drawing',
    under: `<g class="ct-regions">${regions}</g>`,
    node: id => ({text: '', cls: pieces.of[id] !== main ? 'cut' : '', label: `Dot ${id}${pieces.of[id] !== main ? ', cut off' : ''}`}),
    edge: i => {
      const gone = b.erased.includes(i), [u, v] = q.edges[i];
      return {cls: [gone ? 'erased' : '', hinted?.line === i ? 'hinted' : ''].join(' '), act: !done, strokes: done && !gone ? ['tree'] : [], label: `Line from ${u} to ${v}${gone ? ', erased. Draw it back' : `${sideWords(i)}. Erase it`}`};
    }
  });
  const status = `${faces.closed.length ? `${faces.closed.length} shaded ${faces.closed.length === 1 ? 'region' : 'regions'}.` : 'No shaded region.'} ${pieces.count === 1 ? 'Every dot is joined.' : 'Some dots are cut off.'}${done ? ' A tree.' : ''}`;
  return `<div class="ct-puzzle${done ? ' solved' : ''}" data-mechanic-wire="corners">${board}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// A tap anywhere on a line's wide hit area goes to the nearest line, so where
// the hit areas of lines meeting at a dot overlap, the line under the finger wins.
// Keys go to the focused line, as wireGraph does; a dot is not a control, so a
// tap on it does nothing.
function wireTree(root, p, api) {
  const q = p.parameters, svg = root.querySelector('[data-gb-board]');
  if (!svg) return;
  svg.addEventListener('click', e => {
    const hit = e.target.closest?.('[data-gb-edge]');
    if (!hit || !svg.contains(hit)) return;
    const m = svg.getScreenCTM?.();
    if (!m || !e.clientX && !e.clientY) { api.apply({type: 'line', line: Number(hit.dataset.gbEdge)}); return; }
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    api.apply({type: 'line', line: nearestLine(q, [pt.x, pt.y])});
  });
  svg.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key)) return;
    const hit = e.target.closest?.('[data-gb-edge]');
    if (!hit) return;
    e.preventDefault();
    api.apply({type: 'line', line: Number(hit.dataset.gbEdge)});
  });
}
// The line nearest a point of the board (in board units).
export function nearestLine(q, [x, y]) {
  const g = treeMap(q);
  let best = 0, dist = Infinity;
  q.edges.forEach(([u, v], i) => {
    const [x1, y1] = g.pos[u], [x2, y2] = g.pos[v], dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(x - x1 - t * dx, y - y1 - t * dy);
    if (d < dist) { dist = d; best = i; }
  });
  return best;
}

// --- Mechanics and the family seam ----------------------------------------------
export const cornerMechanics = {
  corners: {
    fresh: freshRing, valid: validRing, solved: solvedRing, move: moveRing, hint: hintRing, render: renderRing, wire: wireRing,
    // Undo takes back moves, never a claim's answer: a refused That's all
    // stays locked while the shelf is the same, and a refused Can't while the
    // ring is the same. The words go, so the board still changes.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to) || !from.refused || to.refused) return to;
      if (q.mode === 'every' && same(from.shelf, to.shelf)) return {...to, refused: from.refused, shown: false, again: null};
      if (q.mode === 'make' && same(from.ring, to.ring)) return {...to, refused: from.refused, shown: false};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  },
  'corner-trees': {fresh: freshTree, valid: validTree, solved: solvedTree, move: moveTree, hint: hintTree, render: renderTree, wire: wireTree}
};

export default {
  id: 'corners',
  family: {id: 'corners', symbol: '∡'},
  mechanics: cornerMechanics,
  pack: new URL('./corners.json', import.meta.url).href,
  css: new URL('./corners.css', import.meta.url).href,
  focus: '[data-mechanic-wire="corners"] button.cr-add:not([disabled]),[data-mechanic-wire="corners"] [data-cr-take],[data-mechanic-wire="corners"] [data-cr-unfold],[data-mechanic-wire="corners"] button.cr-move:not([disabled]),[data-mechanic-wire="corners"] .gb-hit'
};
