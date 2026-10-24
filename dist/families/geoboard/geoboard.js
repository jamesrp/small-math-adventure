// Geoboard (worksheet Week 57, area from dots). A band is stretched round
// pegs on a square lattice of dots to make a lattice polygon: one closed
// outline whose sides never cross or touch, except two sides in a row at
// their shared corner. The app lights the outline dots (every dot on a side,
// corners included) and the inside dots, and reads the area, I (inside dots)
// and B (outline dots).
//
// Pick's theorem: for such a polygon, area = I + B/2 − 1. Each hole cut by a
// separate band strictly inside adds 1: area = I + B/2 − 1 + h. Its engine is
// the seam lemma: cut a polygon along a segment holding k dots, and the k − 2
// middle dots move from inside to the outline of both pieces, while the ends
// stay on the outline, so I + B/2 − 1 adds. So any two of area, I and B fix
// the third, and a pair whose third value is no count of dots (B < 3, or I
// not a whole number) is impossible: that count is the certificate of Can't.
// Puzzles name two of the three, never ask for the third, and check every
// target on the actual board.
import {esc} from '../../expansion-controls.js';
import {gridOf, squareBoard, wireSquare, UNIT} from '../../sq-grid.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isSafeInteger;
export const MODES = ['target', 'pair', 'every', 'cut', 'playground'];
export const QUANTITIES = ['area', 'inside', 'outline'];
export const PLAY_SIZES = [5, 7, 9];
const MAX_CORNERS = 40;
const MAX_VALUE = 40;

/* ------------------------------------------------------------------ *
 * Dots. A dot is [x, y]: x across from the left, y up from the bottom
 * row, as on the worksheet. Saves and moves number it y · w + x.
 * ------------------------------------------------------------------ */
export const sizeOf = (q, b) => q.mode === 'playground' ? {w: b.size, h: b.size} : {w: q.w, h: q.h};
export const xyOf = (s, d) => [d % s.w, Math.floor(d / s.w)];
export const dotOf = (s, [x, y]) => y * s.w + x;
const isDot = (s, d) => int(d) && d >= 0 && d < s.w * s.h;
const ptsOf = (s, loop) => loop.map(d => xyOf(s, d));

/* ------------------------------------------------------------------ *
 * Lattice geometry, in whole numbers.
 * ------------------------------------------------------------------ */
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const between = (p, a, b) => Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
export const onSegment = (p, a, b) => cross(a, b, p) === 0 && between(p, a, b);
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
// Do the closed segments ab and cd share a point?
export function meet(a, b, c, d) {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b);
}
// Where two meeting segments meet (for drawing the refusal).
function meetPoint(a, b, c, d) {
  for (const p of [c, d]) if (onSegment(p, a, b)) return p;
  for (const p of [a, b]) if (onSegment(p, c, d)) return p;
  const t = cross(c, d, a) / (cross(c, d, a) - cross(c, d, b));
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}
// Two sides in a row, a → b → c, overlap only when the band turns straight
// back along itself (or does not move).
const turnsBack = (a, b, c) => cross(a, b, c) === 0 && (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) <= 0;
// Twice the area enclosed by a loop of points (shoelace).
export const area2 = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0));
// Is p strictly inside the loop? p must not lie on it (even-odd crossings).
export function inside(p, pts) {
  let odd = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[j], b = pts[i];
    if ((a[1] > p[1]) === (b[1] > p[1])) continue;
    const lhs = (p[0] - a[0]) * (b[1] - a[1]), rhs = (p[1] - a[1]) * (b[0] - a[0]);
    if (b[1] > a[1] ? lhs < rhs : lhs > rhs) odd = !odd;
  }
  return odd;
}
const onLoop = (p, pts) => pts.some((a, i) => onSegment(p, a, pts[(i + 1) % pts.length]));
// Corners where the band really turns (a peg it passes straight is not one).
export const cornerCount = pts => pts.filter((p, i) => cross(pts[(i + pts.length - 1) % pts.length], p, pts[(i + 1) % pts.length]) !== 0).length;

// The first clash among paths (closed loops and at most one open band): two
// sides that cross or touch, other than two sides in a row at their shared
// corner. Returns {sides: [[a, b], [c, d]], at} or null.
export function clashOf(paths) {
  const sides = [];
  paths.forEach((path, k) => {
    const n = path.pts.length, m = path.closed ? n : n - 1;
    for (let i = 0; i < m; i++) sides.push({k, i, n, closed: path.closed, a: path.pts[i], b: path.pts[(i + 1) % n]});
  });
  for (let x = 0; x < sides.length; x++) for (let y = x + 1; y < sides.length; y++) {
    const s = sides[x], t = sides[y];
    if (s.k === t.k) {
      const follows = (u, v) => (u.i + 1) % u.n === v.i && (u.closed || u.i + 1 === v.i);
      if (follows(s, t) || follows(t, s)) {
        const [u, v] = follows(s, t) ? [s, t] : [t, s];
        if (turnsBack(u.a, u.b, v.b)) return {sides: [[u.a, u.b], [v.a, v.b]], at: onSegment(v.b, u.a, u.b) ? v.b : u.a};
        // In a triangle each side follows both others; the third pair is checked as well.
        if (!(follows(s, t) && follows(t, s))) continue;
        if (turnsBack(v.a, v.b, u.b)) return {sides: [[u.a, u.b], [v.a, v.b]], at: u.a};
        continue;
      }
    }
    if (meet(s.a, s.b, t.a, t.b)) return {sides: [[s.a, s.b], [t.a, t.b]], at: meetPoint(s.a, s.b, t.a, t.b)};
  }
  return null;
}

// What is wrong with a set of bands, or null. `loops` are closed (the first
// is the outline, the rest holes), `open` is the band being stretched.
export function problemOf(s, loops, open, holes) {
  if (!Array.isArray(loops) || !Array.isArray(open)) return {why: 'shape'};
  if ([...loops, open].some(l => !Array.isArray(l) || l.length > MAX_CORNERS || !l.every(d => isDot(s, d)))) return {why: 'shape'};
  if (loops.some(l => l.length < 3)) return {why: 'shape'};
  if (!holes && (loops.length > 1 || (loops.length && open.length))) return {why: 'holes'};
  const pts = loops.map(l => ptsOf(s, l)), path = ptsOf(s, open);
  const clash = clashOf([...pts.map(p => ({pts: p, closed: true})), ...(path.length ? [{pts: path, closed: false}] : [])]);
  if (clash) return {why: 'clash', ...clash};
  if (pts.some(p => area2(p) === 0)) return {why: 'flat'};
  // Holes lie strictly inside the outline and outside one another. With no
  // sides meeting, one corner decides where a whole band lies.
  for (let i = 1; i <= pts.length; i++) {
    const first = i < pts.length ? pts[i][0] : path[0];
    if (!first || (i === pts.length && !(pts.length && path.length))) continue;
    if (pts.some((l, j) => j !== i && onLoop(first, l))) return {why: 'clash', at: first};
    if (!inside(first, pts[0])) return {why: 'outside', at: first};
    for (let j = 1; j < pts.length; j++) if (j !== i && inside(first, pts[j])) return {why: 'nested', at: first};
  }
  return null;
}
// Lattice dots on the bands: outline dots, and inside dots (in the region:
// inside the outline and outside every hole).
export function dotsOf(s, loops) {
  const pts = loops.map(l => ptsOf(s, l)), outline = [], insideDots = [];
  for (let d = 0; d < s.w * s.h; d++) {
    const p = xyOf(s, d);
    if (pts.some(l => onLoop(p, l))) outline.push(d);
    else if (pts.reduce((odd, l) => odd !== inside(p, l), false)) insideDots.push(d);
  }
  return {outline, inside: insideDots};
}
// The record of closed bands: area, inside dots, outline dots and holes.
export function recordOf(s, loops) {
  if (!loops.length) return null;
  const pts = loops.map(l => ptsOf(s, l)), {outline, inside: insideDots} = dotsOf(s, loops);
  const area = (area2(pts[0]) - pts.slice(1).reduce((t, l) => t + area2(l), 0)) / 2;
  return {area, inside: insideDots.length, outline: outline.length, holes: loops.length - 1};
}
export const matches = (goal, rec) => Boolean(rec) && Object.keys(goal).every(k => rec[k] === goal[k]);

/* ------------------------------------------------------------------ *
 * Pick counts: the value a goal forces for the quantity it leaves out,
 * and whether any band can have it.
 * ------------------------------------------------------------------ */
export const hiddenOf = goal => QUANTITIES.find(k => goal[k] === undefined);
export function forcedOf(goal) {
  const {area: A, inside: I, outline: B} = goal, k = hiddenOf(goal);
  return k === 'area' ? I + B / 2 - 1 : k === 'inside' ? A - B / 2 + 1 : 2 * (A - I + 1);
}
// A band has a positive area in halves, a whole number of inside dots, and at
// least three outline dots (its corners).
export const countable = (k, v) => k === 'area' ? v > 0 && Number.isInteger(2 * v) : k === 'inside' ? Number.isInteger(v) && v >= 0 : Number.isInteger(v) && v >= 3;
const halfStep = v => typeof v === 'number' && Number.isInteger(2 * v) && v >= 0 && v <= MAX_VALUE;
export const rightClaim = (goal, v) => v === forcedOf(goal) && !countable(hiddenOf(goal), v);

/* ------------------------------------------------------------------ *
 * Cuts: a straight cut between two outline dots of a given shape, lying
 * inside it and touching its outline only at its ends.
 * ------------------------------------------------------------------ */
export const shapeOf = q => q.shape.map(p => [...p]);
export function cutProblem(q, a, b) {
  const s = sizeOf(q), pts = shapeOf(q);
  if (!isDot(s, a) || !isDot(s, b) || a === b) return {why: 'ends'};
  const A = xyOf(s, a), B = xyOf(s, b);
  if (!onLoop(A, pts) || !onLoop(B, pts)) return {why: 'ends'};
  for (let i = 0; i < pts.length; i++) {
    const u = pts[i], v = pts[(i + 1) % pts.length];
    if (!meet(A, B, u, v)) continue;
    const at = meetPoint(A, B, u, v);
    const inner = (onSegment(u, A, B) && !same(u, A) && !same(u, B)) || (onSegment(v, A, B) && !same(v, A) && !same(v, B));
    const along = cross(A, B, u) === 0 && cross(A, B, v) === 0;
    const crossing = !onSegment(A, u, v) && !onSegment(B, u, v) && !inner;
    if (inner || along || crossing) return {why: 'touch', at};
  }
  // Clear of the outline between its ends, the cut is all inside or all outside.
  if (!inside([A[0] + B[0], A[1] + B[1]], pts.map(([x, y]) => [2 * x, 2 * y]))) return {why: 'outside', at: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]};
  return null;
}
// The two pieces of a cut, as loops of points: along the outline from a to b,
// and from b back to a.
export function piecesOf(q, a, b) {
  const s = sizeOf(q), pts = shapeOf(q), A = xyOf(s, a), B = xyOf(s, b), ring = [];
  pts.forEach((u, i) => {
    const v = pts[(i + 1) % pts.length];
    ring.push(u);
    const mids = [A, B].filter(p => onSegment(p, u, v) && !same(p, u) && !same(p, v));
    mids.sort((p, r) => Math.hypot(p[0] - u[0], p[1] - u[1]) - Math.hypot(r[0] - u[0], r[1] - u[1]));
    ring.push(...mids);
  });
  const ia = ring.findIndex(p => same(p, A)), ib = ring.findIndex(p => same(p, B)), n = ring.length;
  const arc = (from, to) => { const out = []; for (let i = from; ; i = (i + 1) % n) { out.push(ring[i]); if (i === to) return out; } };
  return [arc(ia, ib), arc(ib, ia)];
}
const loopDots = (s, pts) => pts.map(p => dotOf(s, p));
export const pieceRecords = (q, cut) => piecesOf(q, ...cut).map(pts => recordOf(sizeOf(q), [loopDots(sizeOf(q), pts)]));
const cutSolves = (q, cut) => Boolean(cut) && pieceRecords(q, cut).every(r => matches(q.piece, r));
// The dots strictly between the ends of a cut: inside dots of the whole that
// become outline dots of both pieces.
export function seamDots(q, a, b) {
  const s = sizeOf(q), A = xyOf(s, a), B = xyOf(s, b), out = [];
  for (let d = 0; d < s.w * s.h; d++) { const p = xyOf(s, d); if (onSegment(p, A, B) && !same(p, A) && !same(p, B)) out.push(d); }
  return out;
}

/* ------------------------------------------------------------------ *
 * Boards (the saves).
 * target:     {loops, open, claimed, refused}   claimed/refused: a Can't value or null
 * pair:       {loops, open, found}              found: [triangle or null, four-sided or null]
 * every:      {loops, open, found, told, done}  found: loops of area q.goal.area, one per record
 * cut:        {cut}                             cut: [a, b] with a < b, or null
 * playground: {size, loops, open}
 * ------------------------------------------------------------------ */
const holesOn = q => q.mode === 'playground' || Boolean(q.holes);
const bandKeys = {target: 'claimed,loops,open,refused', pair: 'found,loops,open', every: 'done,found,loops,open,told', playground: 'loops,open,size'};
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'cut') return {cut: null};
  if (q.mode === 'playground') return {size: q.size, loops: [], open: []};
  if (q.mode === 'pair') return {loops: [], open: [], found: [null, null]};
  if (q.mode === 'every') return {loops: [], open: [], found: [], told: null, done: false};
  return {loops: [], open: [], claimed: null, refused: null};
}
const closedRecord = (s, b) => b.loops.length && !b.open.length ? recordOf(s, b.loops) : null;
const recordKey = r => `${r.inside},${r.outline}`;
const foundRecords = (s, found) => found.map(l => recordOf(s, [l]));
// The slot (0 triangle, 1 four-sided) a pair shape fills, or -1.
function pairSlot(q, s, loops) {
  if (loops.length !== 1) return -1;
  const rec = recordOf(s, loops), n = cornerCount(ptsOf(s, loops[0]));
  return matches(q.goal, rec) && (n === 3 || n === 4) ? n - 3 : -1;
}
function validFound(q, s, b) {
  if (q.mode === 'pair') {
    if (!Array.isArray(b.found) || b.found.length !== 2) return false;
    if (!b.found.every((l, k) => l === null || (problemOf(s, [l], [], false) === null && pairSlot(q, s, [l]) === k))) return false;
    const k = b.open.length ? -1 : pairSlot(q, s, b.loops);
    return k < 0 || b.found[k] !== null;
  }
  if (!Array.isArray(b.found) || !b.found.every(l => problemOf(s, [l], [], false) === null && recordOf(s, [l]).area === q.goal.area)) return false;
  const recs = foundRecords(s, b.found), keys = recs.map(recordKey), all = q.records.map(([i, o]) => `${i},${o}`);
  if (!keys.every(k => all.includes(k)) || new Set(keys).size !== keys.length || !recs.every((r, k) => k === 0 || recs[k - 1].inside < r.inside)) return false;
  const rec = closedRecord(s, b);
  if (rec && rec.area === q.goal.area && !keys.includes(recordKey(rec))) return false;
  if (b.told !== null && b.told !== 'more') return false;
  if (typeof b.done !== 'boolean' || (b.done && (keys.length !== all.length || b.told !== null))) return false;
  return b.told !== 'more' || keys.length < all.length;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'cut') return Object.keys(b).join() === 'cut' && (b.cut === null || (Array.isArray(b.cut) && b.cut.length === 2 && b.cut[0] < b.cut[1] && cutProblem(q, ...b.cut) === null));
  if (Object.keys(b).sort().join() !== bandKeys[q.mode]) return false;
  if (q.mode === 'playground' && !PLAY_SIZES.includes(b.size)) return false;
  const s = sizeOf(q, b);
  if (problemOf(s, b.loops, b.open, holesOn(q)) !== null) return false;
  if (q.mode === 'pair' || q.mode === 'every') return validFound(q, s, b);
  if (q.mode === 'target') {
    const claimOk = v => v === null || (q.cant && halfStep(v));
    if (!claimOk(b.claimed) || !claimOk(b.refused) || (b.claimed !== null && b.refused !== null)) return false;
    // A claim is made beside a band the child has tried.
    if (b.claimed !== null && (!rightClaim(q.goal, b.claimed) || !closedRecord(s, b))) return false;
    if (b.refused !== null && rightClaim(q.goal, b.refused)) return false;
  }
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'cut') return cutSolves(q, b.cut);
  if (q.mode === 'pair') return b.found.every(l => l !== null);
  if (q.mode === 'every') return b.done;
  return b.claimed !== null || matches(q.goal, closedRecord(sizeOf(q), b));
}

/* ------------------------------------------------------------------ *
 * Moves
 * dot {at}: start a band (or, inside a shape that allows them, a hole),
 *   stretch the band to a dot, close it at its first corner, or take back
 *   its last corner.
 * corner {loop, index, to}: move a corner of a closed band to another dot.
 * clear, cant {value}, all, cut {a, b}, size {size}.
 * ------------------------------------------------------------------ */
// The bands after a band move, or {problem} when sides would cross or touch.
export function bandMove(q, b, action) {
  const s = sizeOf(q, b), holes = holesOn(q), {loops, open} = b;
  let next = null;
  if (action.type === 'clear') return loops.length || open.length ? {loops: [], open: []} : null;
  if (action.type === 'dot') {
    const d = action.at;
    if (!isDot(s, d)) return null;
    if (!open.length) {
      if (!loops.length) return {loops, open: [d]};
      if (!holes || !dotsOf(s, loops).inside.includes(d)) return null;
      next = {loops, open: [d]};
    } else if (d === open.at(-1)) return {loops, open: open.slice(0, -1)};
    else if (d === open[0] && open.length >= 3) next = {loops: [...loops, open], open: []};
    else if (open.length >= MAX_CORNERS) return null;
    else next = {loops, open: [...open, d]};
  } else if (action.type === 'corner') {
    const {loop: k, index: i, to} = action;
    if (open.length || !int(k) || k < 0 || k >= loops.length || !int(i) || i < 0 || i >= loops[k].length || !isDot(s, to) || to === loops[k][i]) return null;
    next = {loops: loops.map((l, j) => j === k ? l.map((d, m) => m === i ? to : d) : l), open};
  } else return null;
  const problem = problemOf(s, next.loops, next.open, holes);
  return problem ? {problem} : next;
}
const BAND_MOVES = ['dot', 'corner', 'clear'];
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q.mode === 'cut') {
    if (action.type !== 'cut') return null;
    const cut = [action.a, action.b].sort((x, y) => x - y);
    if (cutProblem(q, ...cut) || (b.cut && b.cut[0] === cut[0] && b.cut[1] === cut[1])) return null;
    return {cut};
  }
  if (BAND_MOVES.includes(action.type)) {
    const bands = bandMove(q, b, action);
    if (!bands || bands.problem) return null;
    const next = {...b, ...bands};
    const s = sizeOf(q, b);
    if (q.mode === 'target') return {...next, refused: null};
    if (q.mode === 'pair') {
      const k = next.open.length ? -1 : pairSlot(q, s, next.loops);
      return k >= 0 && next.found[k] === null ? {...next, found: next.found.map((l, j) => j === k ? [...next.loops[0]] : l)} : next;
    }
    if (q.mode === 'every') {
      const rec = closedRecord(s, next);
      if (!rec || rec.area !== q.goal.area || foundRecords(s, next.found).some(r => recordKey(r) === recordKey(rec))) return next;
      const found = [...next.found, [...next.loops[0]]].map(l => ({l, r: recordOf(s, [l])})).sort((x, y) => x.r.inside - y.r.inside).map(x => x.l);
      return {...next, found, told: null};
    }
    return next;
  }
  if (action.type === 'cant' && q.mode === 'target' && q.cant) {
    const v = action.value;
    // Can't comes after an attempt: a closed band on the board.
    if (!halfStep(v) || v === b.refused || !closedRecord(sizeOf(q), b)) return null;
    return rightClaim(q.goal, v) ? {...b, claimed: v, refused: null} : {...b, refused: v};
  }
  if (action.type === 'all' && q.mode === 'every' && b.told !== 'more') {
    return b.found.length === q.records.length ? {...b, told: null, done: true} : {...b, told: 'more'};
  }
  if (action.type === 'size' && q.mode === 'playground') return PLAY_SIZES.includes(action.size) && action.size !== b.size ? {size: action.size, loops: [], open: []} : null;
  return null;
}

/* ------------------------------------------------------------------ *
 * Hints. Each puzzle carries witness shapes (parameters.witnesses, each a
 * list of loops of [x, y]: the outline, then any holes); the hints aim at
 * the placement of one, moved anywhere on the board, nearest the bands
 * already there: keep a band that is on its way, take back corners that
 * are not, move a corner of a closed band onto the witness, or clear and
 * build it corner by corner. Memoised per board state.
 * ------------------------------------------------------------------ */
const words = (n, one) => `${n} ${n === 1 ? one : `${one}s`}`;
export function stepWords(dx, dy) {
  const parts = [dx ? `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}` : '', dy ? `${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}` : ''].filter(Boolean);
  return parts.join(' and ');
}
const dotWords = ([x, y]) => x === 0 && y === 0 ? 'the bottom left dot' : `the dot ${x} across and ${y} up from the bottom left`;
// Every placement of each witness on the board, as loops of dot numbers.
const placementCache = new Map();
function placements(q, s, witnesses) {
  const key = JSON.stringify([s, witnesses]);
  if (placementCache.has(key)) return placementCache.get(key);
  const out = [];
  for (const w of witnesses) {
    const all = w.flat(), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    for (let dy = -Math.min(...ys); dy <= s.h - 1 - Math.max(...ys); dy++) for (let dx = -Math.min(...xs); dx <= s.w - 1 - Math.max(...xs); dx++) {
      out.push(w.map(loop => loop.map(([x, y]) => dotOf(s, [x + dx, y + dy]))));
    }
  }
  placementCache.set(key, out);
  return out;
}
// The fewest corners that differ between a closed band and a witness loop
// with as many corners, over every starting corner and both directions.
function alignments(loop, target) {
  const n = loop.length, out = [];
  if (target.length !== n) return out;
  for (let r = 0; r < n; r++) for (const dir of [1, -1]) {
    const map = loop.map((_, i) => target[((r + dir * i) % n + n) % n]);
    out.push({map, miss: loop.filter((d, i) => d !== map[i]).length});
  }
  return out.sort((x, y) => x.miss - y.miss);
}
const sameLoop = (loop, target) => alignments(loop, target).some(a => a.miss === 0);
// Is the open band a start of the witness loop (from some corner, either way)?
function prefixNext(open, target) {
  const n = target.length;
  for (let r = 0; r < n; r++) for (const dir of [1, -1]) {
    if (open.every((d, i) => i < n && d === target[((r + dir * i) % n + n) % n])) return open.length === n ? open[0] : target[((r + dir * open.length) % n + n) % n];
  }
  return undefined;
}
function buildHint(q, b, witnesses) {
  const s = sizeOf(q, b), list = placements(q, s, witnesses), {loops, open} = b;
  const fits = P => loops.length <= P.length && loops.every((l, i) => sameLoop(l, P[i]));
  if (open.length) {
    for (const P of list) {
      if (!fits(P) || loops.length >= P.length) continue;
      const next = prefixNext(open, P[loops.length]);
      if (next === undefined) continue;
      if (next === open[0] && open.length === P[loops.length].length) return {type: 'move', action: {type: 'dot', at: next}, text: 'Close the band at its first corner.', dots: [next]};
      const [x0, y0] = xyOf(s, open.at(-1)), [x1, y1] = xyOf(s, next);
      return {type: 'move', action: {type: 'dot', at: next}, text: `Stretch the band ${stepWords(x1 - x0, y1 - y0)}.`, dots: [next]};
    }
    return {type: 'move', action: {type: 'dot', at: open.at(-1)}, text: 'Take back the last corner.', dots: [open.at(-1)]};
  }
  for (const P of list) if (fits(P) && loops.length < P.length) {
    const start = P[loops.length][0];
    return {type: 'move', action: {type: 'dot', at: start}, text: `${loops.length ? 'Start a hole at' : 'Start the band at'} ${dotWords(xyOf(s, start))}.`, dots: [start]};
  }
  // Move one corner of a closed band onto the nearest witness.
  const options = [];
  for (const P of list) {
    if (loops.length > P.length) continue;
    let total = 0;
    const each = loops.map((l, k) => { const al = alignments(l, P[k]); total += al.length ? al[0].miss : Infinity; return al; });
    if (total < Infinity) options.push({each, total});
  }
  // Only a placement nearest the bands: each move then brings the bands one
  // corner nearer a witness, so following the hints always ends.
  const best = Math.min(...options.map(o => o.total));
  for (const {each, total} of options) for (const [k, als] of each.entries()) for (const al of als) {
    if (total !== best) break;
    if (!al.miss || al.miss !== als[0].miss) continue;
    for (let i = 0; i < loops[k].length; i++) {
      if (loops[k][i] === al.map[i]) continue;
      const action = {type: 'corner', loop: k, index: i, to: al.map[i]}, next = bandMove(q, b, action);
      if (!next || next.problem) continue;
      const [x0, y0] = xyOf(s, loops[k][i]), [x1, y1] = xyOf(s, al.map[i]);
      return {type: 'move', action, text: `Move a corner ${stepWords(x1 - x0, y1 - y0)}.`, dots: [loops[k][i], al.map[i]]};
    }
  }
  return {type: 'move', action: {type: 'clear'}, text: 'Clear the bands and start again.', button: 'clear'};
}
const fmt = v => { const whole = Math.floor(v), half = v - whole ? '½' : ''; return whole || !half ? `${whole}${half}` : half; };
const NOUN = {area: 'area', inside: 'inside dot', outline: 'outline dot'};
// "area 6", "2 outline dots", "1 inside dot".
const amount = (k, v) => k === 'area' ? `area ${fmt(v)}` : `${fmt(v)} ${NOUN[k]}${v === 1 ? '' : 's'}`;
const REASON = {outline: 'Every band has at least 3 outline dots.', inside: 'Inside dots come in whole numbers.', area: 'Every band has some area.'};
// An impossible goal (Pick's number is no count of dots).
const impossible = q => q.mode === 'target' && Boolean(q.cant) && !countable(hiddenOf(q.goal), forcedOf(q.goal));
// The band an impossible goal's hints build towards: closed, and matching the
// goal in the quantity its attempt names (area 6 in puzzle 8, 3 outline dots in 10).
const relevant = (q, b) => { const rec = closedRecord(sizeOf(q, b), b); return Boolean(rec && q.attempt && rec[q.attempt.match] === q.goal[q.attempt.match]); };
// Pick's count for the goal, without the reason or Can't.
function countText(goal, k, v) {
  const val = {...goal, [k]: v}, given = QUANTITIES.filter(x => x !== k).map(x => amount(x, goal[x])).join(' and ');
  return `With ${given}, Pick’s rule needs ${amount(k, v)}: ${fmt(val.inside)} + ${fmt(val.outline)} ÷ 2 − 1 = ${fmt(val.area)}.`;
}
function plan(p, b) {
  const q = p.parameters, s = sizeOf(q, b);
  if (q.mode === 'cut') {
    const w = q.witnesses[0], [a, c] = w.cut.map(pt => dotOf(s, pt));
    return {type: 'move', action: {type: 'cut', a: Math.min(a, c), b: Math.max(a, c)}, text: w.text, dots: [a, c]};
  }
  if (impossible(q)) {
    // An impossible goal: build the authored attempt until the band is
    // relevant, then Pick's count alone (applying it fills the goal's empty
    // box), and only then the reason with Can't.
    const k = hiddenOf(q.goal), v = forcedOf(q.goal), view = ui(p);
    if (!relevant(q, b)) { const step = buildHint(q, b, q.attempt.shapes); return {...step, text: `${q.attempt.text} ${step.text}`}; }
    if (!view.cant) return {type: 'move', action: {type: 'count'}, text: countText(q.goal, k, v)};
    return {type: 'move', action: {type: 'cant', value: v}, text: `${REASON[k]} ${view.value === v ? 'Press Can’t.' : `Set ${fmt(v)}, then press Can’t.`}`, button: 'cant'};
  }
  if (q.mode === 'every') {
    const have = new Set(foundRecords(s, b.found).map(recordKey)), left = q.witnesses.filter(w => !have.has(w.record.join()));
    if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.', button: 'all'};
    return buildHint(q, b, left.flatMap(w => w.shapes));
  }
  if (q.mode === 'pair') return buildHint(q, b, q.witnesses.filter((w, k) => b.found[w.slot] === null).flatMap(w => w.shapes));
  return buildHint(q, b, q.witnesses);
}
const hintMemo = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  // An impossible goal's last two hints depend on whether Can't is open.
  const view = ui(p), key = `${p.id}|${JSON.stringify(b)}${impossible(q) ? `|${view.cant}|${view.value}` : ''}`;
  if (!hintMemo.has(key)) { if (hintMemo.size > 400) hintMemo.clear(); hintMemo.set(key, plan(p, b)); }
  return hintMemo.get(key);
}

/* ------------------------------------------------------------------ *
 * View state, outside the save: the corner held (picked up), the first
 * end of a cut, and Can't with its value.
 * ------------------------------------------------------------------ */
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {held: null, pick: null, cant: false, value: null}); return uiState.get(p.id); }
const calm = p => Object.assign(ui(p), {held: null, pick: null, cant: false, value: null});

// What a tap on a dot does: {move}, {ui}, {refuse: problem} or null.
export function tapAction(q, b, view, d) {
  if (q.mode === 'cut') {
    const s = sizeOf(q);
    if (!onLoop(xyOf(s, d), shapeOf(q))) return null;
    if (view.pick === null) return {ui: {pick: d}};
    if (view.pick === d) return {ui: {pick: null}};
    const problem = cutProblem(q, view.pick, d);
    return problem ? {refuse: {...problem, sides: [[xyOf(s, view.pick), xyOf(s, d)]]}} : {move: {type: 'cut', a: Math.min(view.pick, d), b: Math.max(view.pick, d)}};
  }
  const tryMove = action => { const next = bandMove(q, b, action); return !next ? null : next.problem ? {refuse: next.problem, action} : {move: action}; };
  // A hold counts only while its corner is still there (Undo or a hint may
  // have taken the band away).
  const held = view.held && !b.open.length && b.loops[view.held[0]]?.[view.held[1]] !== undefined ? view.held : null;
  if (held) {
    const [k, i] = held;
    if (b.loops[k][i] === d) return {ui: {held: null}};
    return tryMove({type: 'corner', loop: k, index: i, to: d});
  }
  if (b.open.length) return tryMove({type: 'dot', at: d});
  for (const [k, l] of b.loops.entries()) { const i = l.indexOf(d); if (i >= 0) return {ui: {held: [k, i]}}; }
  return tryMove({type: 'dot', at: d});
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
const f = n => Number(n.toFixed(2));
const gridFor = s => gridOf({cols: s.w - 1, rows: s.h - 1});
// Board drawing position of a lattice point (y up) on the square grid (y down).
const at = (s, [x, y]) => [f(x * UNIT), f((s.h - 1 - y) * UNIT)];
const pathD = (s, loops) => loops.map(l => `M${l.map(p => at(s, p).join(',')).join('L')}Z`).join('');
const polyline = (s, pts) => pts.map(p => at(s, p).join(',')).join(' ');
export const ICONS = {
  area: '<svg class="geo-icon" viewBox="0 0 20 20" aria-hidden="true"><rect class="geo-i-area" x="4" y="4" width="12" height="12"/></svg>',
  inside: '<svg class="geo-icon" viewBox="0 0 20 20" aria-hidden="true"><rect class="geo-i-box" x="4.5" y="4.5" width="11" height="11" rx="1.5"/><circle class="geo-i-pip" cx="10" cy="10" r="2"/></svg>',
  outline: '<svg class="geo-icon" viewBox="0 0 20 20" aria-hidden="true"><circle class="geo-i-ring" cx="10" cy="10" r="6.2"/><circle class="geo-i-pip" cx="10" cy="10" r="2"/></svg>',
  holes: '<svg class="geo-icon" viewBox="0 0 20 20" aria-hidden="true"><path class="geo-i-area" fill-rule="evenodd" d="M3 3H17V17H3ZM7.5 7.5V12.5H12.5V7.5Z"/></svg>',
  goal: '<svg class="geo-icon" viewBox="0 0 20 20" aria-hidden="true"><circle class="geo-i-goal" cx="10" cy="10" r="7"/><circle class="geo-i-goal" cx="10" cy="10" r="3.5"/><circle class="geo-i-dot" cx="10" cy="10" r="1.2"/></svg>',
  band: '<svg class="geo-icon" viewBox="0 0 20 20" aria-hidden="true"><path class="geo-i-band" d="M3.5 15.5L6 4.5L16 7L14 16Z"/></svg>',
  piece: k => `<svg class="geo-icon" viewBox="0 0 20 20" aria-hidden="true"><rect class="geo-i-piece geo-p${k}" x="3.5" y="3.5" width="13" height="13" rx="2"/></svg>`,
  pieces: '<svg class="geo-icon geo-icon-wide" viewBox="0 0 30 20" aria-hidden="true"><path class="geo-i-band geo-i-fill" d="M2.5 16.5L8 3.5H27.5L22 16.5Z"/><path class="geo-i-seam" d="M5 16.5L25 3.5"/></svg>'
};
const LABEL = {area: 'Area', inside: 'Inside dots', outline: 'Outline dots', holes: 'Holes'};

// A small picture of a band (the shelf of shapes found).
export function mini(s, loop, label) {
  const pts = ptsOf(s, loop), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), span = Math.max(x1 - x0, y1 - y0, 1), pad = .45;
  const dots = [];
  // Sizes in board units, so a dot is about 1.5 px and the band 2 px in the 48 px picture.
  const px = (span + 2 * pad) / 48;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) dots.push(`<circle cx="${x}" cy="${y1 - y + y0}" r="${f(1.5 * px)}"/>`);
  return `<svg class="geo-mini" viewBox="${f(x0 - pad)} ${f(y0 - pad)} ${f(x1 - x0 + 2 * pad)} ${f(y1 - y0 + 2 * pad)}" role="img" aria-label="${esc(label)}"><polygon class="geo-mini-fill" points="${pts.map(([x, y]) => `${x},${y1 - y + y0}`).join(' ')}" style="stroke-width:${f(2 * px)}"/><g class="geo-mini-dots">${dots.join('')}</g></svg>`;
}

// The board. opts: {s, loops, open, fills: [{loops, cls}], marks, seam, held,
// first, hinted: Set of dots, act(d) -> {label} or null, solved, label}
function boardSvg(opts) {
  const {s} = opts, g = gridFor(s), pts = l => ptsOf(s, l);
  const fills = (opts.fills || []).map(fl => `<path class="geo-fill ${fl.cls}" d="${pathD(s, fl.loops)}"/>`).join('');
  const bands = opts.loops.map(l => `<polygon class="geo-band" points="${polyline(s, pts(l))}"/>`).join('') + (opts.open.length > 1 ? `<polyline class="geo-band geo-open" points="${polyline(s, pts(opts.open))}"/>` : '');
  const seam = opts.seam ? `<line class="geo-seam" x1="${at(s, opts.seam[0])[0]}" y1="${at(s, opts.seam[0])[1]}" x2="${at(s, opts.seam[1])[0]}" y2="${at(s, opts.seam[1])[1]}"/>` : '';
  const marks = [];
  for (const d of opts.marks?.outline || []) { const [x, y] = at(s, xyOf(s, d)); marks.push(`<circle class="geo-ring${opts.marks.changed?.includes(d) ? ' changed' : ''}" cx="${x}" cy="${y}" r="${f(UNIT * .24)}"/>`); }
  for (const d of opts.marks?.inside || []) { const [x, y] = at(s, xyOf(s, d)), r = UNIT * .2; marks.push(`<rect class="geo-box" x="${f(x - r)}" y="${f(y - r)}" width="${f(2 * r)}" height="${f(2 * r)}" rx="${f(r * .25)}"/>`); }
  const spot = (d, cls, r) => { const [x, y] = at(s, xyOf(s, d)); return `<circle class="${cls}" cx="${x}" cy="${y}" r="${f(UNIT * r)}"/>`; };
  const extra = [opts.first !== undefined ? spot(opts.first, 'geo-first', .3) : '', opts.end !== undefined ? spot(opts.end, 'geo-end', .17) : '', opts.held !== undefined ? spot(opts.held, 'geo-held', .33) : ''].join('');
  const dotOfK = k => { const [x, yd] = g.points[k]; return (s.h - 1 - yd) * s.w + x; };
  return squareBoard(g, {
    cls: `geo-board${opts.solved ? ' solved' : ''}`, label: opts.label, stroke: !opts.solved,
    under: fills,
    over: `${bands}${seam}<g class="geo-marks">${marks.join('')}</g>${extra}<g class="geo-ghost" aria-hidden="true"></g><g class="geo-refuse" aria-hidden="true"></g>`,
    point: k => {
      const d = dotOfK(k), look = opts.act?.(d);
      return {cls: `${opts.hinted?.has(d) ? 'hinted' : ''}${look ? ' live' : ''}${opts.corners?.has(d) ? ' corner' : ''}`, act: Boolean(look), label: look?.label};
    }
  });
}
const dotName = (s, d) => { const [x, y] = xyOf(s, d); return `Dot ${x} across, ${y} up`; };

// The record table: a goal row (two of the three, or all three and a
// hidden hole count) and one row per band or piece.
function recordTable(cols, rows, hiddenCell) {
  const head = `<tr><td></td>${cols.map(k => `<th scope="col" aria-label="${LABEL[k]}">${ICONS[k]}</th>`).join('')}</tr>`;
  const body = rows.map(r => `<tr class="${r.cls}"><th scope="row" aria-label="${esc(r.label)}">${r.icon}</th>${cols.map(k => {
    if (r.goal && hiddenCell && k === hiddenCell.key) return `<td class="geo-cell geo-hidden">${hiddenCell.html}</td>`;
    const v = r.values?.[k], goal = r.compare?.[k], cls = v === undefined || v === null ? 'empty' : goal === undefined ? '' : v === goal ? 'match' : 'miss';
    return `<td class="geo-cell ${cls}">${v === undefined || v === null ? '' : fmt(v)}</td>`;
  }).join('')}</tr>`).join('');
  return `<table class="geo-record">${head}${body}</table>`;
}
const button = (label, action, focus, opts = {}) => {
  const data = action.ui ? `data-action="mechanic-ui" data-ui='${esc(JSON.stringify(action.ui))}'` : `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"`;
  return `<button type="button" class="secondary geo-button ${opts.cls || ''}${opts.hinted ? ' hinted' : ''}" ${data} data-focus="${focus}"${opts.toggle ? ` data-toggle="${opts.toggle}"` : ''}${opts.pressed !== undefined ? ` aria-pressed="${opts.pressed}"` : ''}${opts.label ? ` aria-label="${esc(opts.label)}"` : ''} ${opts.disabled ? 'disabled' : ''}>${label}</button>`;
};
// Pick's rule with the numbers in: the argument shown after a right claim,
// the claimed number outlined.
function equation(goal, k, v) {
  const val = {...goal, [k]: v}, n = x => `<span class="geo-eq-n${x === k ? ' claim' : ''}">${ICONS[x]}${fmt(val[x])}</span>`;
  return `<span class="geo-eq" role="img" aria-label="${fmt(val.inside)} + ${fmt(val.outline)} ÷ 2 − 1 = ${fmt(val.area)}">${n('inside')} + ${n('outline')} ÷ 2 − 1 = ${n('area')}</span>`;
}
// One short refusal for a wrong claim: no rule worked out, no right number.
const refusalText = (goal, k, v) => v === forcedOf(goal) ? 'It can be done.' : `${amount(k, v).replace(/^a/, 'A')} ${k === 'area' || v === 1 ? 'doesn’t' : 'don’t'} fit Pick’s rule.`;
function renderBands(p, a) {
  const q = p.parameters, b = a.board, s = sizeOf(q, b), done = solved(p, b), view = ui(p), play = q.mode === 'playground';
  const h = !play && !done && a.hintLevel >= 2 ? hint(p, b) : null;
  // While a hole is being stretched the closed bands keep their counts.
  const rec = closedRecord(s, b), shown = rec || (b.loops.length ? recordOf(s, b.loops) : null), dots = shown ? dotsOf(s, b.loops) : null;
  const heldDot = view.held && !b.open.length ? b.loops[view.held[0]]?.[view.held[1]] : undefined;
  const corners = new Set(b.open.length ? [] : b.loops.flat());
  const act = done ? null : d => {
    const t = tapAction(q, b, view, d);
    if (!t) return null;
    const what = t.ui ? (t.ui.held ? 'Pick up this corner' : 'Put the corner down') : t.refuse ? 'Not allowed' : t.move.type === 'corner' ? 'Move the corner here' : b.open.length ? (d === b.open.at(-1) ? 'Take back this corner' : d === b.open[0] && b.open.length >= 3 ? 'Close the band' : 'Stretch the band here') : b.loops.length ? 'Start a hole here' : 'Start the band here';
    const state = dots?.outline.includes(d) ? ', outline' : dots?.inside.includes(d) ? ', inside' : '';
    return {label: `${dotName(s, d)}${state}. ${what}`};
  };
  const svg = boardSvg({
    s, loops: b.loops, open: b.open, solved: done, act, corners, hinted: new Set(h?.dots || []),
    fills: b.loops.length ? [{loops: b.loops.map(l => ptsOf(s, l)), cls: 'geo-shape'}] : [],
    marks: dots, first: b.open.length >= 3 ? b.open[0] : undefined, end: b.open.length ? b.open.at(-1) : undefined, held: heldDot,
    label: `Geoboard, ${s.w} by ${s.h} dots`
  });
  const cols = [...QUANTITIES, ...(holesOn(q) && (q.mode === 'playground' || q.goal.area !== undefined && hiddenOf(q.goal) === undefined) ? ['holes'] : [])];
  const goal = q.goal || null, live = shown ? {...shown} : null;
  // Can't: the quantity the goal leaves out becomes a stepper.
  const k = goal && q.cant ? hiddenOf(goal) : null;
  const stepping = k && view.cant && !done && rec;
  const hiddenCell = stepping ? {key: k, html: `<span class="geo-step">${button('−', {ui: {step: -1}}, 'geo-down', {label: 'Less', disabled: !view.value})}<b aria-live="polite">${view.value === null ? '?' : fmt(view.value)}</b>${button('+', {ui: {step: 1}}, 'geo-up', {label: 'More'})}</span>`}
    : goal && q.holes && cols.includes('holes') ? {key: 'holes', html: done ? fmt(rec.holes) : '?'} : null;
  const rows = [];
  if (goal) rows.push({goal: true, cls: 'geo-goal', label: 'Goal', icon: ICONS.goal, values: goal});
  rows.push({cls: 'geo-live', label: 'This band', icon: ICONS.band, values: live || {}, compare: goal || {}});
  const table = recordTable(cols, rows, hiddenCell);
  // Buttons.
  const btns = [];
  if (!done && q.mode === 'target' && q.cant) {
    // Can't waits for an attempt: a closed band on the board.
    const claimNow = view.cant && view.value !== null, locked = !rec || (claimNow && view.value === b.refused);
    // Focus: opening Can't moves it to +; after a claim it falls back to the board.
    btns.push(button('Can’t', claimNow ? {type: 'cant', value: view.value} : {ui: {cant: !view.cant}}, claimNow ? 'geo-claim' : view.cant ? 'geo-cant-open' : 'geo-up', {cls: 'geo-cant', pressed: Boolean(view.cant), hinted: h?.button === 'cant', disabled: locked, toggle: 'geo-cant'}));
  }
  if (!done && q.mode === 'every') btns.push(button('That’s all', {type: 'all'}, 'geo-all', {cls: 'geo-all', hinted: h?.button === 'all', disabled: b.told === 'more'}));
  if (!done) btns.push(button('Clear', {type: 'clear'}, 'geo-clear', {hinted: h?.button === 'clear', disabled: !b.loops.length && !b.open.length}));
  const sizes = play ? `<div class="geo-sizes" role="group" aria-label="Board">${PLAY_SIZES.map(n => button(`${n}`, {type: 'size', size: n}, `geo-size-${n}`, {cls: 'geo-size', pressed: b.size === n, label: `${n} by ${n} dots`})).join('')}</div>` : '';
  // Notes: a refused claim, the argument after a right one, That's all.
  let note = '';
  if (q.mode === 'target' && b.refused !== null) note = `<p class="geo-note">${refusalText(goal, k, b.refused)}</p>`;
  if (q.mode === 'target' && b.claimed !== null) note = `<p class="geo-proof">${equation(goal, k, b.claimed)}<span>${REASON[k]}</span></p>`;
  if (q.mode === 'every' && b.told === 'more') note = '<p class="geo-note">There is another.</p>';
  let shelf = '';
  if (q.mode === 'pair') {
    const here = pairSlot(q, s, b.open.length ? [] : b.loops);
    shelf = `<ol class="geo-shelf geo-slots" aria-label="Shapes to make">${[3, 4].map((n, i) => `<li class="${b.found[i] ? 'found' : ''}${here === i ? ' here' : ''}">${b.found[i] ? mini(s, b.found[i], `${n === 3 ? 'Triangle' : 'Four-sided shape'}, made`) : `<svg class="geo-mini geo-slot" viewBox="0 0 20 20" role="img" aria-label="${n === 3 ? 'Triangle' : 'Four-sided shape'}, not made yet"><polygon points="${n === 3 ? '3,17 17,17 9,3' : '3,15 7,4 17,6 15,17'}"/></svg>`}</li>`).join('')}</ol>`;
  }
  if (q.mode === 'every' && (b.found.length || done)) {
    const recs = foundRecords(s, b.found), here = rec && rec.area === goal.area ? recordKey(rec) : null;
    const chip = (r, pic, cls = '') => `<li class="${cls}${recordKey(r) === here ? ' here' : ''}">${pic}<span class="geo-chip-n">${ICONS.inside}${fmt(r.inside)} ${ICONS.outline}${fmt(r.outline)}</span></li>`;
    const nextI = q.records.length, nextB = 2 * goal.area - 2 * nextI + 2;
    const after = done ? chip({inside: nextI, outline: nextB}, '<svg class="geo-mini geo-slot" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4L16 16M16 4L4 16"/></svg>', 'struck') : '';
    shelf = `<ol class="geo-shelf geo-records" aria-label="Counts found: ${recs.map(r => `${r.inside} inside and ${r.outline} outline`).join('; ')}${done ? `; not ${nextI} inside and ${nextB} outline` : ''}">${recs.map((r, i) => chip(r, mini(s, b.found[i], `${r.inside} inside, ${r.outline} outline`))).join('')}${after}</ol>${done ? `<p class="geo-proof"><span>${REASON.outline}</span></p>` : ''}`;
  }
  const refusal = q.mode === 'target' && b.refused !== null ? refusalText(goal, k, b.refused) : '';
  const status = [refusal, shown ? `Area ${fmt(shown.area)}, ${words(shown.inside, 'inside dot')}, ${words(shown.outline, 'outline dot')}${shown.holes ? `, ${words(shown.holes, 'hole')}` : ''}.` : '', b.open.length ? `${b.loops.length ? 'Hole' : 'Band'} with ${words(b.open.length, 'corner')}.` : shown ? '' : 'No band.', heldDot !== undefined ? 'A corner is picked up.' : '', b.told === 'more' ? 'There is another.' : ''].filter(Boolean).join(' ');
  return `<div class="geo-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="geoboard">${sizes}<div class="geo-top">${table}<span class="geo-buttons">${btns.join('')}</span></div><div class="geo-stage" style="--geo-w:${s.w}">${svg}</div>${note}${shelf}<p class="sr-only geo-status" role="status">${esc(status)}</p></div>`;
}

function renderCut(p, a) {
  const q = p.parameters, b = a.board, s = sizeOf(q), done = solved(p, b), view = ui(p);
  const h = !done && a.hintLevel >= 2 ? hint(p, b) : null;
  const shape = shapeOf(q), whole = loopDots(s, shape), wholeDots = dotsOf(s, [whole]);
  const pieces = b.cut ? piecesOf(q, ...b.cut) : null, seam = b.cut ? seamDots(q, ...b.cut) : [];
  const marks = b.cut ? {outline: [...wholeDots.outline, ...seam], inside: wholeDots.inside.filter(d => !seam.includes(d)), changed: seam} : wholeDots;
  const act = done ? null : d => {
    const t = tapAction(q, b, view, d);
    if (!t) return null;
    return {label: `${dotName(s, d)}, outline. ${t.ui ? (t.ui.pick === null ? 'Let go of this end' : 'Start a cut here') : t.refuse ? 'Not allowed' : 'Cut to here'}`};
  };
  const svg = boardSvg({
    s, loops: [whole], open: [], solved: done, act, hinted: new Set(h?.dots || []),
    fills: pieces ? pieces.map((pc, i) => ({loops: [pc], cls: `geo-p${i}`})) : [{loops: [shape], cls: 'geo-shape'}],
    marks, seam: b.cut ? b.cut.map(d => xyOf(s, d)) : null, held: view.pick ?? undefined,
    label: `Geoboard, ${s.w} by ${s.h} dots, with a shape to cut`
  });
  const recs = b.cut ? pieceRecords(q, b.cut) : null;
  const rows = [{goal: true, cls: 'geo-goal', label: 'Goal for each piece', icon: ICONS.pieces, values: q.piece}];
  if (recs) recs.forEach((r, i) => rows.push({cls: 'geo-live', label: `Piece ${i + 1}`, icon: ICONS.piece(i), values: r, compare: q.piece}));
  else rows.push({cls: 'geo-live', label: 'Whole shape', icon: ICONS.band, values: recordOf(s, [whole])});
  const table = recordTable(QUANTITIES, rows, null);
  const status = recs ? `Pieces: ${recs.map(r => `area ${fmt(r.area)}, ${words(r.inside, 'inside dot')}, ${words(r.outline, 'outline dot')}`).join('; ')}.` : 'Not cut yet.';
  return `<div class="geo-puzzle mode-cut${done ? ' solved' : ''}" data-mechanic-wire="geoboard"><div class="geo-top">${table}</div><div class="geo-stage" style="--geo-w:${s.w}">${svg}</div><p class="sr-only geo-status" role="status">${esc(status)}</p></div>`;
}
const render = (p, a) => p.parameters.mode === 'cut' ? renderCut(p, a) : renderBands(p, a);

/* ------------------------------------------------------------------ *
 * Taps, drags and keys. A refused side or cut flashes red on the board
 * with a cross where it would meet the band; nothing changes.
 * ------------------------------------------------------------------ */
const SVGNS = 'http://www.w3.org/2000/svg';
function draw(layer, s, segments, point, cls) {
  layer.replaceChildren();
  for (const [u, v] of segments) {
    const line = document.createElementNS(SVGNS, 'line'), [x1, y1] = at(s, u), [x2, y2] = at(s, v);
    Object.entries({x1, y1, x2, y2, class: cls}).forEach(([k, val]) => line.setAttribute(k, val));
    layer.append(line);
  }
  if (point) {
    const [x, y] = at(s, point), r = UNIT * .16, mark = document.createElementNS(SVGNS, 'path');
    mark.setAttribute('d', `M${f(x - r)},${f(y - r)}L${f(x + r)},${f(y + r)}M${f(x + r)},${f(y - r)}L${f(x - r)},${f(y + r)}`);
    mark.setAttribute('class', 'geo-x');
    layer.append(mark);
  }
}
const REFUSED = {clash: 'Sides can’t cross or touch.', touch: 'A cut can’t touch the outline.', outside: 'That goes outside the shape.', nested: 'Holes can’t go inside holes.', flat: 'The band needs some area.', ends: '', holes: '', shape: ''};
// The sides a refused band move would have made: the stretch, or the two
// sides at a moved corner.
export function triedSides(s, b, action) {
  if (action?.type === 'dot' && b.open.length) return [[xyOf(s, b.open.at(-1)), xyOf(s, action.at)]];
  if (action?.type === 'corner') {
    const loop = b.loops[action.loop], n = loop.length, to = xyOf(s, action.to);
    return [[xyOf(s, loop[(action.index + n - 1) % n]), to], [to, xyOf(s, loop[(action.index + 1) % n])]];
  }
  return [];
}
function refuse(root, s, problem, tried) {
  const layer = root.querySelector('.geo-refuse'), status = root.querySelector('.geo-status');
  if (!layer) return;
  // Draw the side or cut that was tried; the clash point gets a cross.
  draw(layer, s, tried.length ? tried : problem.sides || [], problem.at, 'geo-tried');
  if (status) status.textContent = REFUSED[problem.why] || 'Not allowed.';
}
function wire(root, p, api) {
  const q = p.parameters, board = () => api.attempt().board, s = sizeOf(q, board()), g = gridFor(s);
  const svg = root.querySelector('[data-sg-board]');
  if (!svg) return;
  const dotOfK = k => { const [x, yd] = g.points[k]; return (s.h - 1 - yd) * s.w + x; };
  const run = d => {
    if (solved(p, board())) return null;
    const t = tapAction(q, board(), ui(p), d);
    if (!t) return null;
    if (t.ui) { api.ui(t.ui); return null; }
    if (t.refuse) { refuse(root, s, t.refuse, t.action ? triedSides(s, board(), t.action) : t.refuse.sides || []); return null; }
    return t.move;
  };
  wireSquare(root, g, {point: k => run(dotOfK(k))}, api.apply);
  // Arrow keys move the keyboard focus from dot to dot.
  svg.addEventListener('keydown', e => {
    const step = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]}[e.key], here = e.target.closest('[data-sg-point]');
    if (!step || !here || e.altKey || e.ctrlKey || e.metaKey) return;
    let [x, y] = xyOf(s, dotOfK(Number(here.dataset.sgPoint)));
    for (;;) {
      x += step[0]; y += step[1];
      if (x < 0 || y < 0 || x >= s.w || y >= s.h) return;
      const k = g.pointIndex.get(`${x},${s.h - 1 - y}`), el = svg.querySelector(`[data-sg-point="${k}"][role="button"]`);
      if (el) { e.preventDefault(); el.focus(); return; }
    }
  });
  const toBoard = e => { const m = svg.getScreenCTM?.(); if (!m) return null; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const r = pt.matrixTransform(m.inverse()); return [r.x / UNIT, s.h - 1 - r.y / UNIT]; };
  const nearest = ([x, y], reach = .45) => { const rx = Math.round(x), ry = Math.round(y); return rx >= 0 && ry >= 0 && rx < s.w && ry < s.h && Math.hypot(x - rx, y - ry) < reach ? dotOf(s, [rx, ry]) : null; };
  // A tap between dots goes to the nearest dot (within half a square), if
  // that dot does something; a tap on a dot is the shared grid's.
  let gap = null;
  svg.addEventListener('pointerdown', e => {
    gap = e.button > 0 || !e.isPrimary || e.target.closest('[data-sg-point]') ? null : {pointer: e.pointerId, x: e.clientX, y: e.clientY};
  });
  svg.addEventListener('pointerup', e => {
    const press = gap;
    gap = null;
    if (!press || e.pointerId !== press.pointer || Math.hypot(e.clientX - press.x, e.clientY - press.y) >= 12) return;
    const pos = toBoard(e), d = pos ? nearest(pos, .5) : null;
    if (d === null) return;
    const [x, y] = xyOf(s, d);
    if (!svg.querySelector(`[data-sg-point="${g.pointIndex.get(`${x},${s.h - 1 - y}`)}"][role="button"]`)) return;
    const action = run(d);
    if (action) api.apply(action);
  });
  if (q.mode === 'cut') return;
  // Dragging a corner of a closed band to another dot moves it there.
  let drag = null;
  svg.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-sg-point]'), b = board();
    if (!el || e.button > 0 || !e.isPrimary || b.open.length || solved(p, b)) return;
    const d = dotOfK(Number(el.dataset.sgPoint)), k = b.loops.findIndex(l => l.includes(d));
    if (k < 0) return;
    drag = {pointer: e.pointerId, x: e.clientX, y: e.clientY, loop: k, index: b.loops[k].indexOf(d), from: d, to: null, moved: false};
    svg.setPointerCapture?.(e.pointerId);
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pointer) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 12) return;
    drag.moved = true;
    const pos = toBoard(e);
    if (!pos) return;
    const d = nearest(pos), b = board(), loop = b.loops[drag.loop], n = loop.length;
    drag.to = d;
    const tip = d === null ? pos : xyOf(s, d), prev = xyOf(s, loop[(drag.index + n - 1) % n]), next = xyOf(s, loop[(drag.index + 1) % n]);
    const result = d === null || d === drag.from ? null : bandMove(q, b, {type: 'corner', loop: drag.loop, index: drag.index, to: d});
    root.querySelector('.geo-refuse')?.replaceChildren();
    draw(root.querySelector('.geo-ghost'), s, [[prev, tip], [tip, next]], null, result?.problem ? 'geo-tried' : 'geo-pull');
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const {moved, to, from, loop, index} = drag;
    drag = null;
    root.querySelector('.geo-ghost')?.replaceChildren();
    if (!moved || e.type !== 'pointerup' || to === null || to === from) return;
    const action = {type: 'corner', loop, index, to}, result = bandMove(q, board(), action);
    if (!result) return;
    if (result.problem) { refuse(root, s, result.problem, triedSides(s, board(), action)); return; }
    api.apply(action);
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}

export const geoboardMechanics = {
  geoboard: {
    fresh, valid, solved, hint, render, wire,
    move(p, b, action) {
      // Applying the Pick's-count hint of an impossible goal fills the goal's
      // empty box with that number; the board stays as it is.
      if (object(action) && action.type === 'count') {
        const q = p.parameters;
        if (!impossible(q) || !valid(p, b) || solved(p, b) || !relevant(q, b)) return null;
        Object.assign(ui(p), {held: null, pick: null, cant: true, value: forcedOf(q.goal)});
        return b;
      }
      const next = move(p, b, action);
      if (next) calm(p);
      return next;
    },
    ui(p, payload) {
      if (!object(payload)) return;
      const view = ui(p);
      if ('held' in payload) view.held = Array.isArray(payload.held) && payload.held.every(int) ? payload.held : null;
      if ('pick' in payload) view.pick = int(payload.pick) ? payload.pick : null;
      if (typeof payload.cant === 'boolean') Object.assign(view, {cant: payload.cant, value: null, held: null});
      if (payload.step === 1 || payload.step === -1) view.value = view.value === null ? (payload.step > 0 ? 0 : null) : Math.min(MAX_VALUE, Math.max(0, view.value + payload.step / 2));
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back moves, never what was learned: the shapes and records
    // found stay, a refused Can't stays refused, and That's all keeps waiting.
    carry(p, from, to) {
      const q = p.parameters;
      // A corner held, a cut begun or Can't open belongs to the board undone.
      calm(p);
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'pair' && Array.isArray(from.found)) return {...to, found: from.found.map((l, k) => l || to.found[k])};
      if (q.mode === 'every' && Array.isArray(from.found)) return {...to, found: from.found, told: from.told};
      if (q.mode === 'target' && from.refused !== null && from.refused !== undefined) return {...to, refused: from.refused};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'geoboard',
  family: {id: 'geoboard', symbol: '∷'},
  mechanics: geoboardMechanics,
  pack: new URL('./geoboard.json', import.meta.url).href,
  css: new URL('./geoboard.css', import.meta.url).href,
  focus: '.geo-board [data-sg-point][role="button"]'
};
