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
// erasures as there are regions, and a tree has one line fewer than dots
// (take off an end dot with its line until one dot is left), so
// dots − lines + regions is 1 in the opened drawing and V − E + F is 2 on the
// solid (worksheet Problem 7).
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keysAre = (b, list) => object(b) && Object.keys(b).sort().join() === [...list].sort().join();
const isBool = v => typeof v === 'boolean';
const f = n => Number(n.toFixed(2));
const RAD = Math.PI / 180;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

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
// The fold a puzzle asks for: 'point' unless it says 'flat'.
export const goalOf = q => q.goal || 'point';

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
// A pointed corner can be made exactly when it is made with the smallest
// corner in every free place: a bigger corner only adds to the total. A flat
// ring needs the total exactly, so it is found by trying the fillings.
export const possible = q => goalOf(q) === 'point' ? foldOf(smallestRing(q)) === 'point' : fillsOf(q).length > 0;
// The free corners (as sorted strings) that give the ring the goal's fold.
const fillCache = new Map();
export function fillsOf(q) {
  const key = JSON.stringify([q.locked, q.count, q.menu, goalOf(q)]);
  if (fillCache.has(key)) return fillCache.get(key);
  const out = new Set();
  (function grow(free) {
    if (free.length === freeCount(q)) { if (foldOf([...q.locked, ...free]) === goalOf(q)) out.add([...free].sort().join('')); return; }
    for (const c of q.menu) grow([...free, c]);
  })([]);
  const list = [...out].sort();
  fillCache.set(key, list);
  return list;
}

// --- Rings: boards ---------------------------------------------------------------
// every: {ring, fold, shelf, refused, shown, done}
// make: {ring, fold, refused, shown, claimed}     playground: {ring, fold}
// `fold` is what the last Fold did to this ring (cleared by any change).
// `refused` is a claim's answer: That's all's {kind: 'off', index} (a kept
// ring that doesn't belong), {kind: 'same', pair} (one ring kept twice) or
// {kind: 'more'}, or Can't's {kind: 'no'} (the same on every ring that isn't
// the proof, whether or not the puzzle can be done); it locks the claim until
// the shelf (That's all) or the ring (Can't) changes. `shown` is whether its
// words are on the board: Undo clears the words and keeps the lock.
const MODES = ['every', 'make', 'playground'];
const capOf = q => q.count || MAX_RING;
const lockedOf = q => q.mode === 'make' ? q.locked.length : 0;
function freshRing(p) {
  const q = p.parameters;
  if (q.mode === 'every') return {ring: [], fold: null, shelf: [], refused: null, shown: false, done: false};
  if (q.mode === 'make') return {ring: [...q.locked], fold: null, refused: null, shown: false, claimed: false};
  return {ring: [], fold: null};
}
const isRing = (q, ring) => Array.isArray(ring) && ring.length <= capOf(q) && ring.every(c => q.menu.includes(c) || false);
// That's all judges the whole shelf: the first kept ring that doesn't belong,
// else the first ring kept twice (turned or flipped), else whether one is
// missing.
export function judgeShelf(q, shelf) {
  const answers = answersOf(q), keys = shelf.map(canonOf);
  const off = keys.findIndex(k => !answers.includes(k));
  if (off >= 0) return {kind: 'off', index: off};
  const twice = keys.findIndex((k, j) => keys.indexOf(k) < j);
  if (twice >= 0) return {kind: 'same', pair: [keys.indexOf(keys[twice]), twice]};
  return shelf.length < answers.length ? {kind: 'more'} : null;
}
// Can't is judged on the ring on the board. Only the ring with the smallest
// corner on offer in every free place, folded flat or overlapping, shows that
// no ring like it folds to a point; every other ring gets the same refusal.
export const isProof = (q, ring) => goalOf(q) === 'point' && ring.length === q.count && ring.every((c, i) => c === (i < q.locked.length ? q.locked[i] : smallestOf(q))) && foldOf(ring) !== 'point';
export const judgeCant = (q, ring) => isProof(q, ring) ? null : {kind: 'no'};
// Keep is off while the ring on the board is, corner for corner, the ring
// just kept (so a second tap doesn't shelve it again). It says nothing about
// rings that are the same after turning or flipping.
const justKept = b => b.shelf.length > 0 && same(b.shelf.at(-1), b.ring);
function validRing(p, b) {
  const q = p.parameters;
  if (!object(b) || !MODES.includes(q.mode)) return false;
  const fields = q.mode === 'every' ? ['ring', 'fold', 'shelf', 'refused', 'shown', 'done'] : q.mode === 'make' ? ['ring', 'fold', 'refused', 'shown', 'claimed'] : ['ring', 'fold'];
  if (!keysAre(b, fields) || !isRing(q, b.ring)) return false;
  if (q.mode === 'make' && !q.locked.every((c, i) => b.ring[i] === c)) return false;
  // A fold belongs to a ring that can be folded: three corners or more, every place filled.
  if (b.fold !== null && (!['point', 'flat', 'over'].includes(b.fold) || !foldable(q, b.ring) || b.fold !== foldOf(b.ring))) return false;
  if (q.mode === 'playground') return true;
  if (!isBool(b.shown) || (b.shown && b.refused === null)) return false;
  if (q.mode === 'make') {
    if (!isBool(b.claimed)) return false;
    if (b.refused !== null && (b.ring.length !== q.count || b.fold === goalOf(q) || !same(b.refused, judgeCant(q, b.ring)))) return false;
    if (b.claimed && (b.refused !== null || b.ring.length !== q.count || b.fold === null || !isProof(q, b.ring))) return false;
    return true;
  }
  if (!isBool(b.done) || !Array.isArray(b.shelf) || !b.shelf.every(r => isRing(q, r) && keepable(q, r))) return false;
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
  return b.fold === goalOf(q) || b.claimed;
}
// A change to the ring clears its fold and (in make) a Can't answer. A That's
// all answer belongs to the shelf, so it stays.
function withRing(q, b, ring) {
  const next = {...b, ring, fold: null};
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
    case 'keep':
      // Any ring of the right size goes on the shelf, a copy turned or flipped too: That's all judges.
      if (q.mode !== 'every' || !keepable(q, b.ring) || justKept(b)) return null;
      return {...b, shelf: [...b.shelf, [...b.ring]], refused: null, shown: false};
    case 'drop': {
      const i = action.index;
      if (q.mode !== 'every' || !Number.isInteger(i) || i < 0 || i >= b.shelf.length) return null;
      return {...b, shelf: b.shelf.filter((_, j) => j !== i), refused: null, shown: false};
    }
    case 'all': {
      if (q.mode !== 'every' || !b.shelf.length || b.refused !== null) return null;
      const verdict = judgeShelf(q, b.shelf);
      return verdict ? {...b, refused: verdict, shown: true} : {...b, done: true};
    }
    case 'cant':
      // Can't is pressed on a full ring that has been folded and didn't meet the goal.
      if (q.mode !== 'make' || b.refused !== null || b.ring.length !== q.count || b.fold === null) return null;
      return isProof(q, b.ring) ? {...b, claimed: true} : {...b, refused: judgeCant(q, b.ring), shown: true};
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
// A step on the ring itself: taking out needs the ring laid flat first. The
// words name a shape, not a place, so they make sense before the second hint
// marks the corner.
function ringStep(b, step) {
  if (step.type === 'take' && (b.fold === 'point' || b.fold === 'flat')) return {type: 'move', action: {type: 'unfold'}, text: 'Tap the folded corner to lay it flat.', mark: 'unfold'};
  if (step.type === 'take') return {type: 'move', action: step, text: `Take out ${a(b.ring[step.index])}.`, mark: `take-${step.index}`};
  return {type: 'move', action: step, text: `Add ${a(step.piece)}.`, mark: `add-${step.piece}`};
}
const goalWords = goal => goal === 'flat' ? 'lies flat' : 'folds to a point';
const FOLD_WORDS = {point: 'folds to a point', flat: 'lies flat', over: 'overlaps'};
function everyHint(q, b) {
  const answers = answersOf(q), kept = b.shelf.map(canonOf);
  const wrong = kept.findIndex(c => !answers.includes(c));
  if (wrong >= 0) return {type: 'move', action: {type: 'drop', index: wrong}, text: `One ring on the shelf ${FOLD_WORDS[foldOf(b.shelf[wrong])]}. Take it off.`, mark: `shelf-${wrong}`};
  const twice = kept.findIndex((c, j) => kept.indexOf(c) < j);
  if (twice >= 0) return {type: 'move', action: {type: 'drop', index: twice}, text: 'Two rings on the shelf are the same ring. Take one off.', mark: `shelf-${twice}`};
  const left = answers.filter(c => !kept.includes(c));
  if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Every ring is on the shelf. Press That’s all.', mark: 'all'};
  if (keepable(q, b.ring) && left.includes(canonOf(b.ring))) return {type: 'move', action: {type: 'keep'}, text: `This ring ${goalWords(q.goal)} and isn’t on the shelf. Press Keep.`, mark: 'keep'};
  // The ring on the board is never a missing answer here (that would be Keep),
  // so the plan always has a step.
  return ringStep(b, planToward(b.ring, left));
}
function makeHint(q, b) {
  const L = q.locked.length, free = b.ring.slice(L), small = smallestOf(q);
  if (possible(q)) {
    // Toward the filling that keeps most of the child's free corners.
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
const onCircle = (r, t) => [f(r * Math.cos(t * RAD)), f(-r * Math.sin(t * RAD))];
// The wedge of the turn from angle `from` to `to` (degrees, counterclockwise).
const wedgePath = (r, from, to) => {
  const large = to - from > 180 ? 1 : 0, [x1, y1] = onCircle(r, from), [x2, y2] = onCircle(r, to);
  return `M0,0 L${x1},${y1} A${f(r)},${f(r)} 0 ${large} 0 ${x2},${y2} Z`;
};
// The overlap past a whole turn, from the ray to the right: the first lap on
// one circle and anything past a second whole turn on a circle just outside
// it (eight pentagons go 504° past), each drawn in arcs of at most 180°.
export function lapPath(over) {
  let d = '';
  for (let lap = 0; lap * TURN < over - 1e-9; lap++) {
    const r = EDGE * 1.1 + lap * 5, end = Math.min(over, (lap + 1) * TURN);
    let t = lap * TURN;
    d += `${d ? ' ' : ''}M${onCircle(r, t).join(',')}`;
    while (t < end - 1e-9) { const next = Math.min(end, t + 180); d += ` A${f(r)},${f(r)} 0 0 0 ${onCircle(r, next).join(',')}`; t = next; }
  }
  return d;
}

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
// The reading of a ring that comes first in the alphabet, turning it only
// (a flipped ring is drawn flipped), so a ring turned round is drawn alike.
export const turnedOf = ring => { let best = ring; for (let k = 1; k < ring.length; k++) { const r = [...ring.slice(k), ...ring.slice(0, k)]; if (r.join('') < best.join('')) best = r; } return best; };
// The direction to look from that shows every face as much as possible: the
// centre of the smallest cap of the sphere holding the faces' outward
// directions (fixed by two or three of them). Seen from there every face of a
// pointed corner faces the viewer. For a ring of equal corners it is the
// cone's axis; when the cone's centre falls outside the corner (as for a
// pentagon and two triangles) the axis would hide a face, and this doesn't.
function viewOf(N) {
  const n = N.length, cands = [...N];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    cands.push(norm(add3(N[i], N[j])));
    for (let k = j + 1; k < n; k++) { let d = norm(cross(add3(N[j], N[i], -1), add3(N[k], N[i], -1))); if (dot(d, N[i]) < 0) d = d.map(x => -x); cands.push(d); }
  }
  let best = N[0], top = -Infinity;
  for (const d of cands) { const v = Math.min(...N.map(m => dot(m, d))); if (v > top + 1e-12) { top = v; best = d; } }
  return best;
}
// The faces of the folded corner, seen from outside along that direction,
// with the first face (in the turned reading) straight below the corner. Each
// face: its corner letter, screen points (y down), whether its outside faces
// the viewer, a shade and a depth.
const coneCache = new Map();
export function foldedFaces(ring, L = EDGE) {
  const read = turnedOf(ring), key = `${read.join('')}|${L}`;
  if (coneCache.has(key)) return coneCache.get(key);
  const {e} = coneOf(read), n = read.length, flat = foldOf(read) === 'flat';
  const inside = norm(e.reduce((s, v) => add3(s, v), [0, 0, 0]));
  // Outward normals point away from the inside of the corner (up for a flat ring).
  const normals = e.map((u, i) => { const m = norm(cross(u, e[(i + 1) % n])); return (flat ? m[2] < 0 : dot(m, inside) > 0) ? m.map(x => -x) : m; });
  let view = flat ? [0, 0, 1] : viewOf(normals);
  // Walk each regular polygon in the plane of its two edges.
  const pts = read.map((c, i) => { const u = e[i], v = e[(i + 1) % n], w = norm(add3(v, u, -dot(u, v))); return piecePoints(c, 0, L).map(([x, y]) => add3(u.map(k => k * x), w, y)); });
  const mid = pts[0].reduce((s, p) => add3(s, p, 1 / pts[0].length), [0, 0, 0]);
  let up = norm(add3(mid, view, -dot(mid, view))).map(x => -x);
  // Tip the view a little (at most 18°) so the corner looks raised, as far as
  // every face still shows at least 22% of itself.
  if (!flat) {
    const least = d => Math.min(...normals.map(m => dot(m, d)));
    const tipped = [18, 15, 12, 9, 6, 3].flatMap(deg => [-1, 1].map(s => norm(add3(view.map(x => x * Math.cos(deg * RAD)), up, s * Math.sin(deg * RAD))))).find(d => least(d) >= .22);
    if (tipped) { view = tipped; up = norm(add3(up, view, -dot(up, view))); }
  }
  const right = cross(up, view);
  const light = norm(add3(add3(view, up, .6), right, -.45));
  const faces = read.map((c, i) => ({
    c, i, screen: pts[i].map(p => [dot(p, right), -dot(p, up)]), outside: dot(normals[i], view) > 0,
    shade: 0.8 + 0.26 * Math.max(0, dot(normals[i], light)), depth: pts[i].reduce((s, p) => s + dot(p, view), 0) / pts[i].length,
    seen: dot(normals[i], view)
  }));
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
  const lap = over ? `<path class="cr-lap" d="${lapPath(total - TURN)}"/><line class="cr-lap-ray" x1="0" y1="0" x2="${f(EDGE * 1.18)}" y2="0"/>` : '';
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
  return `<svg class="cr-mini" viewBox="-50 -50 100 100" aria-hidden="true">${ring.map((c, i) => `<polygon class="cr-piece cr-${c}${starts[i] + PIECES[c].angle > TURN + 1e-9 ? ' past' : ''}" points="${svgPts(piecePoints(c, starts[i], 30))}"/>`).join('')}<circle class="cr-point" r="2"/></svg>`;
}
const SAYS = {
  over: 'They overlap.', flat: 'It lies flat.', more: 'There is another.', same: 'These two are the same ring.',
  no: 'That ring doesn’t show it.'
};
const offWords = ring => `This one ${FOLD_WORDS[foldOf(ring)]}.`;
// The solved shelf as the case check: one row for each number of corners,
// the child's rings in order of their total, each row ending with the
// smallest ring of its size too big for the goal (for a pointed corner the
// first that reaches a whole turn, for a flat ring the first past one), so
// every bigger ring of that size misses too; the last row is the first size
// whose smallest ring is already too big.
const failCache = new Map();
export function firstMiss(q, n) {
  const key = JSON.stringify([q.menu, q.goal, n]);
  if (failCache.has(key)) return failCache.get(key);
  let best = null;
  (function grow(ring) {
    if (ring.length === n) {
      const fold = foldOf(ring), misses = q.goal === 'point' ? fold !== 'point' : fold === 'over', t = totalOf(ring), c = canonOf(ring);
      if (misses && (!best || t < best.t || (t === best.t && c < best.c))) best = {t, c};
      return;
    }
    for (const c of q.menu) grow([...ring, c]);
  })([]);
  const out = best ? [...best.c] : null;
  failCache.set(key, out);
  return out;
}
export function caseRows(q, shelf) {
  const rows = [], sizes = q.count ? [q.count] : Array.from({length: MAX_RING - 2}, (_, i) => i + 3);
  const order = (x, y) => totalOf(x) - totalOf(y) || canonOf(x).localeCompare(canonOf(y));
  for (const n of sizes) {
    const kept = shelf.filter(r => r.length === n).sort(order), small = Array(n).fill(smallestOf(q));
    const last = q.goal === 'point' ? foldOf(small) !== 'point' : foldOf(small) === 'over';
    if (!kept.length && !last) continue;
    rows.push({n, kept, miss: firstMiss(q, n)});
    if (last) break;
  }
  return rows;
}
const NUMBER_WORDS = ['', '', '', 'three', 'four', 'five', 'six', 'seven', 'eight'];
function casesHtml(q, shelf) {
  return `<section class="cr-shelf-box cr-cases" aria-label="Shelf, by number of corners">${caseRows(q, shelf).map(row => `<ul class="cr-row" aria-label="Rings of ${NUMBER_WORDS[row.n]} corners">${row.kept.map(r => `<li><span class="cr-shelf-item" role="img" aria-label="${esc(`Ring of ${ringWords(r)}`)}">${miniSvg(r, true)}</span></li>`).join('')}${row.miss ? `<li><span class="cr-shelf-item misses" role="img" aria-label="${esc(`Ring of ${ringWords(row.miss)}: it ${FOLD_WORDS[foldOf(row.miss)]}`)}">${miniSvg(row.miss, false)}</span></li>` : ''}</ul>`).join('')}</section>`;
}
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
    if (q.mode === 'every') actions += button('Keep', {type: 'keep'}, 'cr-move cr-keep', keepable(q, b.ring) && !justKept(b), mark === 'keep') + button('That’s all', {type: 'all'}, 'cr-claim cr-all', b.shelf.length > 0 && b.refused === null, mark === 'all');
    if (q.mode === 'make') actions += button('Can’t', {type: 'cant'}, 'cr-claim cr-cant', b.refused === null && b.ring.length === q.count && b.fold !== null, mark === 'cant');
  }
  // Words under the board are about the ring on the board; That's all's
  // answer is about the shelf, so it sits on the shelf.
  let told = '';
  if (live && b.fold === 'over') told = SAYS.over;
  else if (live && b.fold === 'flat') told = SAYS.flat;
  if (q.mode === 'make' && b.shown && b.refused) told = SAYS.no;
  if (q.mode === 'make' && b.claimed) told = `Even the smallest corners ${foldOf(b.ring) === 'flat' ? 'make a whole turn' : 'go past a whole turn'}.`;
  const verdict = q.mode === 'every' && b.shown ? b.refused : null;
  const shelfTold = !verdict ? '' : verdict.kind === 'off' ? offWords(b.shelf[verdict.index]) : SAYS[verdict.kind];
  const marked = i => verdict?.kind === 'off' ? verdict.index === i : verdict?.kind === 'same' ? verdict.pair.includes(i) : false;
  let shelf = '';
  if (q.mode === 'every' && b.shelf.length) {
    shelf = done ? casesHtml(q, b.shelf) : `<section class="cr-shelf-box" aria-label="Shelf">${shelfTold ? `<p class="cr-shelf-told">${esc(shelfTold)}</p>` : ''}<ul class="cr-shelf">${b.shelf.map((r, i) => {
      const label = `Ring of ${ringWords(r)}${marked(i) ? ', marked' : ''}. Take it off the shelf`;
      return `<li><button type="button" class="cr-shelf-item${marked(i) ? ' ringed' : ''}${mark === `shelf-${i}` ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'drop', index: i}))}" data-focus="cr-shelf-${i}" aria-label="${esc(label)}">${miniSvg(r, false)}</button></li>`;
    }).join('')}</ul></section>`;
  }
  const state = !b.ring.length ? 'No corners yet.' : `Corners: ${ringWords(b.ring)}. ${({point: 'They leave a gap.', flat: 'They make a whole turn.', over: 'They overlap.'})[foldOf(b.ring)]}${folded ? ` ${b.fold === 'flat' ? 'It lies flat.' : 'Folded to a point.'}` : ''}`;
  const status = `${state}${q.mode === 'every' ? ` ${b.shelf.length ? `Shelf: ${b.shelf.map(r => ringWords(r)).join('; ')}.` : 'The shelf is empty.'}` : ''}${told ? ` ${told}` : ''}${shelfTold ? ` ${shelfTold}` : ''}${done && q.mode === 'make' && b.claimed ? ' No ring like this folds to a point.' : ''}`;
  const top = live ? `<div class="cr-bar cr-adds">${adds}${slots}</div>` : '';
  return `<div class="cr-puzzle${done ? ' solved' : ''}" data-mechanic-wire="corners">${top}${board}${actions ? `<div class="cr-bar cr-actions">${actions}</div>` : ''}${told ? `<p class="cr-told">${esc(told)}</p>` : ''}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
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
// A map is {nodes: {id: [x%, y%]}, edges: [[u, v], …], aspect}, with
// `leaves: true` when the drawing is to be taken down to one dot. The board is
// {erased: [edge indices, ascending]}, and with leaves also {gone: [[dot,
// line], …]}: the end dots taken off once a tree is left, in order, each with
// its one line.
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
const inPoly = (pos, [x, y], dots) => { let c = false; for (let a = 0, b = dots.length - 1; a < dots.length; b = a++) { const [xa, ya] = pos[dots[a]], [xb, yb] = pos[dots[b]]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) c = !c; } return c; };
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
  const pieces = piecesOf(q, erased);
  const space = walks.map((w, k) => {
    if (w.area > 1e-9) return k;
    const piece = pieces.of[w.dots[0]], holders = closed.filter(c => pieces.of[walks[c].dots[0]] !== piece && inPoly(pos, pos[w.dots[0]], walks[c].dots));
    return holders.length ? holders.reduce((s, c) => walks[c].area < walks[s].area ? c : s) : 'out';
  });
  const out = {walks, closed, sides: Object.fromEntries(lines.map(i => [i, side[i].map(k => space[k])])), walkSides: side};
  faceCache.set(key, out);
  return out;
}
// Each closed region's tint: the first face of the whole drawing that it
// holds, so when two regions become one, one tint takes over. Every face of
// these drawings is convex, so the middle of its corners is inside it.
export const TINTS = 7;
const tintCache = new Map();
export function tintsOf(q, erased) {
  const key = JSON.stringify([q.nodes, q.edges, erased]);
  if (tintCache.has(key)) return tintCache.get(key);
  const pos = treeMap(q).pos, start = facesOf(q, []), now = facesOf(q, erased), owner = {};
  start.closed.forEach((k0, n) => {
    const dots = [...new Set(start.walks[k0].dots)], c = dots.reduce(([x, y], id) => [x + pos[id][0] / dots.length, y + pos[id][1] / dots.length], [0, 0]);
    const holders = now.closed.filter(k => inPoly(pos, c, now.walks[k].dots));
    if (!holders.length) return;
    const k = holders.reduce((s, h) => now.walks[h].area < now.walks[s].area ? h : s);
    if (owner[k] === undefined || n < owner[k]) owner[k] = n;
  });
  tintCache.set(key, owner);
  return owner;
}
// A line with the same walk on both sides holds a piece on: erasing it cuts.
export const holdsOn = (faces, i) => faces.walkSides[i][0] === faces.walkSides[i][1];
export const isTree = (q, erased) => piecesOf(q, erased).count === 1 && present(q, erased).length === Object.keys(q.nodes).length - 1;
const validErased = (q, list) => Array.isArray(list) && list.every((i, k) => Number.isInteger(i) && i >= 0 && i < q.edges.length && (k === 0 || i > list[k - 1]));
const freshTree = p => p.parameters.leaves ? {erased: [], gone: []} : {erased: []};
const goneOf = b => b.gone || [];
// The one line left at a dot that is still on the board, or null.
export function endLine(q, b, id) {
  if (!Object.hasOwn(q.nodes, id) || goneOf(b).some(([d]) => d === id)) return null;
  const used = new Set([...b.erased, ...goneOf(b).map(([, line]) => line)]);
  const at = q.edges.map((_, i) => i).filter(i => !used.has(i) && q.edges[i].includes(id));
  return at.length === 1 ? at[0] : null;
}
function validTree(p, b) {
  const q = p.parameters;
  if (!keysAre(b, q.leaves ? ['erased', 'gone'] : ['erased']) || !validErased(q, b.erased)) return false;
  if (!q.leaves) return true;
  if (!Array.isArray(b.gone)) return false;
  if (!b.gone.length) return true;
  // End dots come off a tree, one at a time, each with its one line, and one dot stays.
  if (!isTree(q, b.erased) || b.gone.length > Object.keys(q.nodes).length - 1) return false;
  for (let k = 0; k < b.gone.length; k++) {
    const item = b.gone[k];
    if (!Array.isArray(item) || item.length !== 2 || endLine(q, {erased: b.erased, gone: b.gone.slice(0, k)}, item[0]) !== item[1]) return false;
  }
  return true;
}
const leftOf = (q, b) => Object.keys(q.nodes).length - goneOf(b).length;
const solvedTree = (p, b) => validTree(p, b) && (p.parameters.leaves ? leftOf(p.parameters, b) === 1 : isTree(p.parameters, b.erased));
// Taking dots off starts once a tree is left; from then on the lines stay as
// they are (Undo goes back).
const leafing = (q, b) => Boolean(q.leaves) && isTree(q, b.erased);
function moveTree(p, b, action) {
  const q = p.parameters;
  if (!validTree(p, b) || solvedTree(p, b) || !object(action)) return null;
  if (action.type === 'line') {
    const i = action.line;
    if (leafing(q, b) || !Number.isInteger(i) || i < 0 || i >= q.edges.length) return null;
    const erased = b.erased.includes(i) ? b.erased.filter(j => j !== i) : [...b.erased, i].sort((x, y) => x - y);
    return q.leaves ? {erased, gone: []} : {erased};
  }
  if (action.type === 'dot') {
    if (!leafing(q, b) || typeof action.id !== 'string') return null;
    const line = endLine(q, b, action.id);
    return line === null ? null : {erased: b.erased, gone: [...b.gone, [action.id, line]]};
  }
  return null;
}
// Hints: first draw back a line that joins two pieces; then erase a line
// between the outside and a closed region, as the worksheet guide's route
// does; once a tree is left (with leaves), take off an end dot.
function hintTree(p, b) {
  const q = p.parameters;
  if (!validTree(p, b) || solvedTree(p, b)) return {type: 'done'};
  if (leafing(q, b)) {
    const id = Object.keys(q.nodes).find(id => endLine(q, b, id) !== null);
    return {type: 'move', action: {type: 'dot', id}, text: 'Take off an end dot with its line.', dot: id};
  }
  const pieces = piecesOf(q, b.erased);
  if (pieces.count > 1) {
    const back = [...b.erased].reverse().find(i => { const [u, v] = q.edges[i]; return pieces.of[u] !== pieces.of[v]; });
    return {type: 'move', action: {type: 'line', line: back}, text: 'Some dots are cut off. Draw a line back to join them.', line: back};
  }
  const faces = facesOf(q, b.erased);
  const peel = present(q, b.erased).find(i => !holdsOn(faces, i) && faces.sides[i].includes('out')) ?? present(q, b.erased).find(i => !holdsOn(faces, i));
  return {type: 'move', action: {type: 'line', line: peel}, text: 'Erase a line with the outside on one side and a shaded region on the other.', line: peel};
}
function renderTree(p, att) {
  const q = p.parameters, b = att.board, g = treeMap(q), done = solvedTree(p, b), taking = leafing(q, b);
  const hinted = att.hintLevel >= 2 && !done ? hintTree(p, b) : null;
  const pieces = piecesOf(q, b.erased), faces = facesOf(q, b.erased), tints = tintsOf(q, b.erased), tree = isTree(q, b.erased);
  const gone = new Set(goneOf(b).map(([id]) => id)), goneLines = new Set(goneOf(b).map(([, line]) => line));
  // The biggest piece is the drawing; dots in any other piece are cut off.
  const size = {};
  for (const id of Object.keys(q.nodes)) size[pieces.of[id]] = (size[pieces.of[id]] || 0) + 1;
  const main = Object.keys(size).map(Number).reduce((top, k) => size[k] > size[top] ? k : top, pieces.of[Object.keys(q.nodes)[0]]);
  const regions = faces.closed.map(k => `<polygon class="ct-region ct-tint-${(tints[k] ?? 0) % TINTS}" points="${faces.walks[k].dots.map(id => `${f(g.pos[id][0])},${f(g.pos[id][1])}`).join(' ')}"/>`).join('');
  const sideWords = i => { const s = faces.sides[i]; return holdsOn(faces, i) ? ', the same space on both sides' : s.includes('out') ? ', between the outside and a shaded region' : ', between two shaded regions'; };
  const board = graphBoard(g, {
    cls: `ct-map${done ? ' tree' : ''}${taking && !done ? ' ct-leafing' : ''}`, label: 'Opened drawing',
    under: `<g class="ct-regions">${regions}</g>`,
    node: id => {
      if (gone.has(id)) return {text: '', cls: 'gone', label: `Dot ${id}, taken off`};
      const end = taking && !done && endLine(q, b, id) !== null, cut = pieces.of[id] !== main;
      return {text: '', cls: [cut ? 'cut' : '', hinted?.dot === id ? 'hinted' : ''].join(' '), act: taking && !done, label: `Dot ${id}${cut ? ', cut off' : ''}${end ? ', an end dot. Take it off with its line' : ''}`};
    },
    edge: i => {
      const erased = b.erased.includes(i), off = goneLines.has(i), [u, v] = q.edges[i];
      if (off) return {cls: 'gone', act: false, label: `Line from ${u} to ${v}, taken off`};
      return {cls: [erased ? 'erased' : '', hinted?.line === i ? 'hinted' : ''].join(' '), act: !done && !taking, strokes: tree && !erased ? ['tree'] : [], label: `Line from ${u} to ${v}${erased ? `, erased${taking ? '' : '. Draw it back'}` : taking ? '' : `${sideWords(i)}. Erase it`}`};
    }
  });
  // The status names what is erased and taken off, so every move is heard; no counts.
  const status = [
    b.erased.length ? `Erased: ${b.erased.map(i => q.edges[i].join('')).join(', ')}.` : 'Nothing erased.',
    gone.size ? `Taken off: ${goneOf(b).map(([id]) => id).join(', ')}.` : '',
    pieces.count === 1 ? 'Every dot is joined.' : 'Some dots are cut off.',
    faces.closed.length ? 'Some of the drawing is shaded.' : 'Nothing is shaded.',
    tree ? 'A tree.' : '', done && q.leaves ? 'One dot is left.' : ''
  ].filter(Boolean).join(' ');
  return `<div class="ct-puzzle${done ? ' solved' : ''}" data-mechanic-wire="corners">${board}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// A tap anywhere on a line's wide hit area goes to the nearest line, so where
// the hit areas of lines meeting at a dot overlap, the line under the finger
// wins. Once end dots are being taken off, the lines are no longer controls
// and a tap goes to the nearest dot left. Keys go to the focused line or dot.
function wireTree(root, p, api) {
  const q = p.parameters, svg = root.querySelector('[data-gb-board]');
  if (!svg) return;
  const at = e => { const m = svg.getScreenCTM?.(); if (!m || !e.clientX && !e.clientY) return null; const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return [pt.x, pt.y]; };
  svg.addEventListener('click', e => {
    if (svg.classList.contains('ct-leafing')) {
      const point = at(e), left = [...svg.querySelectorAll('[data-gb-node]')].map(el => el.dataset.gbNode);
      const id = point ? nearestDot(q, left, point) : e.target.closest?.('[data-gb-node]')?.dataset.gbNode;
      // Focus the dot first, so focus stays on the board after the move.
      if (id) { svg.querySelector(`[data-gb-node="${CSS.escape(id)}"]`)?.focus({preventScroll: true}); api.apply({type: 'dot', id}); }
      return;
    }
    const hit = e.target.closest?.('[data-gb-edge]');
    if (!hit || !svg.contains(hit)) return;
    const point = at(e);
    api.apply({type: 'line', line: point ? nearestLine(q, point) : Number(hit.dataset.gbEdge)});
  });
  svg.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key)) return;
    const control = e.target.closest?.('[data-gb-edge],[data-gb-node]');
    if (!control) return;
    e.preventDefault();
    api.apply(control.dataset.gbNode !== undefined ? {type: 'dot', id: control.dataset.gbNode} : {type: 'line', line: Number(control.dataset.gbEdge)});
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
// The dot nearest a point among `ids`, within a fingertip (12 board units).
export function nearestDot(q, ids, [x, y]) {
  const g = treeMap(q);
  let best = null, dist = 12;
  for (const id of ids) { const d = Math.hypot(g.pos[id][0] - x, g.pos[id][1] - y); if (d < dist) { dist = d; best = id; } }
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
      if (q.mode === 'every' && same(from.shelf, to.shelf)) return {...to, refused: from.refused, shown: false};
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
  focus: '[data-mechanic-wire="corners"] button.cr-add:not([disabled]),[data-mechanic-wire="corners"] [data-cr-take],[data-mechanic-wire="corners"] [data-cr-unfold],[data-mechanic-wire="corners"] button.cr-move:not([disabled]),[data-mechanic-wire="corners"] .gb-hit,[data-mechanic-wire="corners"] [data-gb-node]'
};
