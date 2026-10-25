// Area traps (worksheet Week 48, inside and outside covers). A fixed shape
// lies over a grid of squares. A square is whole when the shape fills it,
// partial when the shape covers some of it but not all, and outside when the
// shape misses it or only touches an edge or a corner. The whole squares
// bound the shape's area from below (the inside), and the whole and partial
// squares together bound it from above (the cover); the gap between them is
// the area of the partial squares.
//
// Three kinds of puzzle, each with the app colouring the squares and drawing
// both bounds, so counting is never the task:
// - split: split squares into four (nested splits allowed) to reach a gap
//   within a budget, or make the cover or the gap as small as a budget allows
//   and claim Best. A split can only raise the inside and lower the cover, and
//   it removes at most its own square's uncertainty; a split can gain nothing
//   and still open children that do.
// - paint: paint small squares so each big square is whole, partial or
//   outside as marked and the area meets a target, or claim Can't from the
//   painting that comes as close to the target as the marks allow. With w
//   whole and p partial squares the area is strictly between w and w + p.
// - slide: slide a grid over a fixed shape to reach target bounds. Moving the
//   grid is not refining it, so a move can make the bounds worse.
// Squares are classified exactly: the shape is clipped against each square
// with rational arithmetic and the clipped area compared with 0 and with the
// square's area.
import {esc} from '../../expansion-controls.js';
import {gridOf, squareBoard, wireSquare, UNIT} from '../../sq-grid.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = Number.isSafeInteger;
export const MODES = ['split', 'paint', 'slide', 'playground'];

/* ------------------------------------------------------------------ *
 * Exact rationals (BigInt numerator and denominator).
 * ------------------------------------------------------------------ */
const big = BigInt;
// Fractions are left unreduced: the clipping below takes at most four steps,
// so the numbers stay small, and comparisons cross-multiply.
const Q = (n, d = 1n) => d < 0n ? [-n, -d] : [n, d];
const qadd = (a, b) => Q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const qsub = (a, b) => Q(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const qmul = (a, b) => Q(a[0] * b[0], a[1] * b[1]);
const qdiv = (a, b) => Q(a[0] * b[1], a[1] * b[0]);
const qcmp = (a, b) => { const s = a[0] * b[1] - b[0] * a[1]; return s > 0n ? 1 : s < 0n ? -1 : 0; };
// A number with a power-of-two denominator (every coordinate and square side
// here), read exactly.
export function exact(x) {
  let d = 1;
  while (!Number.isInteger(x * d)) { d *= 2; if (d > 2 ** 20) throw new Error(`not dyadic: ${x}`); }
  return Q(big(x * d), big(d));
}
// The shape clipped to a rectangle (Sutherland–Hodgman against each side),
// and the area of what is left.
function clipTo(poly, x0, x1, y0, y1) {
  const sides = [
    [p => qcmp(p[0], x0) >= 0, (p, q) => [x0, qadd(p[1], qmul(qdiv(qsub(x0, p[0]), qsub(q[0], p[0])), qsub(q[1], p[1])))]],
    [p => qcmp(p[0], x1) <= 0, (p, q) => [x1, qadd(p[1], qmul(qdiv(qsub(x1, p[0]), qsub(q[0], p[0])), qsub(q[1], p[1])))]],
    [p => qcmp(p[1], y0) >= 0, (p, q) => [qadd(p[0], qmul(qdiv(qsub(y0, p[1]), qsub(q[1], p[1])), qsub(q[0], p[0]))), y0]],
    [p => qcmp(p[1], y1) <= 0, (p, q) => [qadd(p[0], qmul(qdiv(qsub(y1, p[1]), qsub(q[1], p[1])), qsub(q[0], p[0]))), y1]]
  ];
  let pts = poly;
  for (const [inside, cut] of sides) {
    if (!pts.length) return [];
    const out = [];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length], a = inside(p), b = inside(q);
      if (a) out.push(p);
      if (a !== b) out.push(cut(p, q));
    });
    pts = out;
  }
  return pts;
}
function areaOf(pts) {
  let s = Q(0n);
  pts.forEach(([a, b], i) => { const [c, d] = pts[(i + 1) % pts.length]; s = qadd(s, qsub(qmul(a, d), qmul(b, c))); });
  return Q(s[0] < 0n ? -s[0] : s[0], s[1] * 2n);
}
// Per shape: its exact corners, its bounding box and the squares classified
// so far.
const shapes = new WeakMap();
const shapeInfo = shape => {
  if (!shapes.has(shape)) {
    const xs = shape.map(v => v[0]), ys = shape.map(v => v[1]);
    shapes.set(shape, {pts: shape.map(([x, y]) => [exact(x), exact(y)]), box: [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], seen: new Map()});
  }
  return shapes.get(shape);
};
// 'whole', 'part' or 'out' for the square [x, x + s] × [y, y + s]. A square
// clear of the shape's bounding box (or only touching it) is out at once;
// any other is clipped exactly.
export function squareStatus(shape, x, y, s) {
  const info = shapeInfo(shape), key = `${x},${y},${s}`;
  if (info.seen.has(key)) return info.seen.get(key);
  const [x0, x1, y0, y1] = info.box;
  let st;
  if (x + s <= x0 || x >= x1 || y + s <= y0 || y >= y1) st = 'out';
  else {
    const X = exact(x), Y = exact(y), S = exact(s);
    const a = areaOf(clipTo(info.pts, X, qadd(X, S), Y, qadd(Y, S)));
    st = a[0] === 0n ? 'out' : qcmp(a, qmul(S, S)) === 0 ? 'whole' : 'part';
  }
  info.seen.set(key, st);
  return st;
}
// The shape's exact area, as [numerator, denominator] numbers.
export function shapeArea(shape) {
  const [n, d] = areaOf(shapeInfo(shape).pts);
  let x = n < 0n ? -n : n, y = d;
  while (y) [x, y] = [y, x % y];
  return [Number(n / x), Number(d / x)];
}

/* ------------------------------------------------------------------ *
 * Numbers for the bar: wholes and power-of-two fractions.
 * ------------------------------------------------------------------ */
const GLYPHS = {'1/2': '½', '1/4': '¼', '3/4': '¾', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞'};
export function fmt(v) {
  const whole = Math.floor(v + 1e-9), rest = v - whole;
  if (rest < 1e-9) return String(whole);
  let d = 2;
  while (Math.abs(rest * d - Math.round(rest * d)) > 1e-9) d *= 2;
  const n = Math.round(rest * d), frac = GLYPHS[`${n}/${d}`] || `${n}⁄${d}`;
  return whole ? `${whole}${GLYPHS[`${n}/${d}`] ? '' : ' '}${frac}` : frac;
}
// Words for screen readers and hints.
export function words(v) {
  const whole = Math.floor(v + 1e-9), rest = v - whole;
  if (rest < 1e-9) return String(whole);
  let d = 2;
  while (Math.abs(rest * d - Math.round(rest * d)) > 1e-9) d *= 2;
  const n = Math.round(rest * d), names = {2: 'half', 4: 'quarter', 8: 'eighth', 16: 'sixteenth'};
  const frac = d === 2 ? 'a half' : `${n} ${names[d]}${n > 1 ? 's' : ''}`;
  return whole ? `${whole} and ${frac}` : frac;
}

/* ------------------------------------------------------------------ *
 * Split: squares as a quadtree. A node "x,y,d" is the square of side 1/2^d
 * at column x, row y of the grid at depth d.
 * ------------------------------------------------------------------ */
export const nodeKey = (x, y, d) => `${x},${y},${d}`;
export const parseNode = key => key.split(',').map(Number);
export const childrenOf = key => { const [x, y, d] = parseNode(key); return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => nodeKey(2 * x + a, 2 * y + b, d + 1)); };
export const parentOf = key => { const [x, y, d] = parseNode(key); return d ? nodeKey(x >> 1, y >> 1, d - 1) : null; };
const isNodeKey = key => typeof key === 'string' && /^\d+,\d+,\d+$/.test(key);
const sortNodes = list => [...list].sort((a, b) => { const [x1, y1, d1] = parseNode(a), [x2, y2, d2] = parseNode(b); return d1 - d2 || y1 - y2 || x1 - x2; });
// Every square of a board down to its deepest level, with its status.
const trees = new Map();
export function treeOf(q) {
  const key = JSON.stringify([q.shape, q.cols, q.rows, q.depth]);
  if (trees.has(key)) return trees.get(key);
  const nodes = new Map(), roots = [];
  const visit = (x, y, d) => {
    const side = 1 / 2 ** d, k = nodeKey(x, y, d);
    nodes.set(k, {key: k, x, y, d, side, area: side * side, status: squareStatus(q.shape, x * side, y * side, side)});
    if (d < q.depth) childrenOf(k).forEach(c => visit(...parseNode(c)));
  };
  for (let y = 0; y < q.rows; y++) for (let x = 0; x < q.cols; x++) { roots.push(nodeKey(x, y, 0)); visit(x, y, 0); }
  const tree = {nodes, roots};
  trees.set(key, tree);
  return tree;
}
export function leavesOf(q, splits) {
  const set = new Set(splits), out = [];
  const walk = k => set.has(k) ? childrenOf(k).forEach(walk) : out.push(k);
  treeOf(q).roots.forEach(walk);
  return out;
}
// Inside (whole squares), cover (whole and partial squares) and gap. Areas
// are sums of powers of 1/4, which floating point adds exactly.
export function boundsOf(q, splits) {
  const {nodes} = treeOf(q);
  let inside = 0, cover = 0;
  for (const k of leavesOf(q, splits)) { const n = nodes.get(k); if (n.status === 'whole') inside += n.area; if (n.status !== 'out') cover += n.area; }
  return {inside, cover, gap: cover - inside};
}
const measureOf = (b, m) => m === 'cover' ? b.cover : m === 'inside' ? -b.inside : b.gap;
// A set of splits is well formed when every split square is on the board,
// above the deepest level, and its parent is split too.
function validSplits(q, splits, budget) {
  if (!Array.isArray(splits) || !splits.every(isNodeKey) || new Set(splits).size !== splits.length) return false;
  if (JSON.stringify(sortNodes(splits)) !== JSON.stringify(splits) || (budget !== undefined && splits.length > budget)) return false;
  const {nodes} = treeOf(q), set = new Set(splits);
  return splits.every(k => nodes.has(k) && nodes.get(k).d < q.depth && (parentOf(k) === null || set.has(parentOf(k))));
}
// Every set of splits within the budget that splits only partial squares,
// with its measure. Splitting a whole or outside square never helps, so
// these are all the plans worth aiming at.
const planCache = new Map();
export function plansOf(q) {
  const key = JSON.stringify([q.shape, q.cols, q.rows, q.depth, q.budget, q.goal]);
  if (planCache.has(key)) return planCache.get(key);
  const {nodes, roots} = treeOf(q), order = [...nodes.keys()], index = new Map(order.map((k, i) => [k, i]));
  const open = k => nodes.get(k).d < q.depth && nodes.get(k).status === 'part';
  // What splitting a square adds to the inside and takes off the cover.
  const gain = new Map([...nodes.keys()].filter(open).map(k => {
    const kids = childrenOf(k).map(c => nodes.get(c));
    return [k, [kids.filter(c => c.status === 'whole').reduce((s, c) => s + c.area, 0), kids.filter(c => c.status === 'out').reduce((s, c) => s + c.area, 0)]];
  }));
  const m = q.goal.kind === 'best' ? q.goal.measure : 'gap', start = boundsOf(q, []), all = [];
  (function grow(set, avail, last, inside, cover) {
    all.push({splits: set, value: measureOf({inside, cover, gap: cover - inside}, m)});
    if (set.length >= q.budget) return;
    for (const k of avail) {
      if (index.get(k) <= last) continue;
      const next = avail.filter(a => a !== k).concat(childrenOf(k).filter(c => nodes.has(c) && open(c))), [gi, gc] = gain.get(k);
      grow([...set, k], next.sort((a, b) => index.get(a) - index.get(b)), index.get(k), inside + gi, cover - gc);
    }
  })([], roots.filter(open), -1, start.inside, start.cover);
  const best = Math.min(...all.map(s => s.value));
  const keep = q.goal.kind === 'best' ? all.filter(s => s.value === best) : all.filter(s => s.value <= q.goal.gap);
  const plans = {best: m === 'inside' ? -best : best, good: keep.map(s => ({splits: sortNodes(s.splits), value: s.value})), count: all.length};
  planCache.set(key, plans);
  return plans;
}

/* ------------------------------------------------------------------ *
 * Paint: each big square is k × k small squares (k = 2).
 * ------------------------------------------------------------------ */
export const K = 2;
export const paintGrid = q => gridOf({cols: q.cols * K, rows: q.rows * K});
const MARKS = {W: 'whole', P: 'part', O: 'out'};
export const patternOf = q => q.pattern.flatMap(row => [...row].map(c => MARKS[c]));
// The small squares of big square b, in reading order.
export function squaresOf(q, b) {
  const bx = b % q.cols, by = Math.floor(b / q.cols), w = q.cols * K, out = [];
  for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) out.push((by * K + j) * w + bx * K + i);
  return out;
}
export const bigOf = (q, i) => { const w = q.cols * K, x = i % w, y = Math.floor(i / w); return Math.floor(y / K) * q.cols + Math.floor(x / K); };
export function paintStatus(q, painted) {
  const set = new Set(painted);
  return patternOf(q).map((_, b) => { const n = squaresOf(q, b).filter(i => set.has(i)).length; return n === 0 ? 'out' : n === K * K ? 'whole' : 'part'; });
}
// Whether every big square is as its mark says.
export const fits = (q, painted) => paintStatus(q, painted).join() === patternOf(q).join();
export const paintArea = painted => painted.length / (K * K);
export const patternBounds = q => { const marks = patternOf(q), w = marks.filter(m => m === 'whole').length, p = marks.filter(m => m === 'part').length; return {inside: w, cover: w + p, gap: p}; };
const meets = (t, v) => t.op === '<' ? v < t.value : t.op === '>' ? v > t.value : v === t.value;
// Which bound stops the target, or null when some shape can meet it. With
// the marks fixed the area is strictly between the inside and the cover, and
// every area strictly between them is some shape's.
export function stopper(q) {
  const {inside: w, cover: c} = patternBounds(q), t = q.target;
  if (c === w) return meets(t, w) ? null : t.op === '<' || (t.op === '=' && t.value < w) ? 'inside' : 'cover';
  if (t.op === '<') return t.value <= w ? 'inside' : null;
  if (t.op === '>') return t.value >= c ? 'cover' : null;
  return t.value <= w ? 'inside' : t.value >= c ? 'cover' : null;
}
// The painting that comes as close to an impossible target as the marks
// allow: every partial square painted all but one small square (when the
// cover stops the target) or just one (when the inside does). Can't is a
// claim about that painting, and it is the certificate.
export const extremeCount = stop => stop === 'cover' ? K * K - 1 : 1;
export function cantHolds(q, painted) {
  const stop = stopper(q);
  if (!stop || !fits(q, painted)) return false;
  const set = new Set(painted), want = extremeCount(stop);
  return patternOf(q).every((m, b) => m !== 'part' || squaresOf(q, b).filter(i => set.has(i)).length === want);
}
// A painting that keeps the marks and meets the target, as the number of
// small squares in each partial big square (1 to K² − 1), nearest to the
// counts painted now. Null when there is none at this grid.
const paintPlans = new Map();
export function paintPlan(q, painted) {
  const marks = patternOf(q), parts = marks.map((m, b) => m === 'part' ? b : -1).filter(b => b >= 0);
  const set = new Set(painted), now = parts.map(b => squaresOf(q, b).filter(i => set.has(i)).length);
  const key = JSON.stringify([q.pattern, q.target, now]);
  if (paintPlans.has(key)) return paintPlans.get(key);
  const w = marks.filter(m => m === 'whole').length;
  let best = null;
  (function choose(k, counts, total) {
    if (k === parts.length) {
      if (!meets(q.target, w + total / (K * K))) return;
      const cost = counts.reduce((s, c, i) => s + Math.abs(c - now[i]), 0);
      if (!best || cost < best.cost) best = {cost, counts: [...counts]};
      return;
    }
    for (let c = 1; c < K * K; c++) choose(k + 1, [...counts, c], total + c);
  })(0, [], 0);
  const plan = best ? new Map(parts.map((b, i) => [b, best.counts[i]])) : null;
  paintPlans.set(key, plan);
  return plan;
}

/* ------------------------------------------------------------------ *
 * Slide: a grid of unit squares shifted by (ox, oy) / steps.
 * ------------------------------------------------------------------ */
// The squares whose corners are at (i + ox/s, j + oy/s) that can meet the
// window, with their status.
const slideCache = new Map();
export function slideCells(q, at) {
  const key = JSON.stringify([q.shape, q.width, q.height, q.steps, at]);
  if (slideCache.has(key)) return slideCache.get(key);
  const [ox, oy] = at, s = q.steps, out = [];
  for (let j = -1; j <= q.height; j++) for (let i = -1; i <= q.width; i++) {
    const x = i + ox / s, y = j + oy / s;
    out.push({i, j, x, y, status: squareStatus(q.shape, x, y, 1)});
  }
  slideCache.set(key, out);
  return out;
}
export function slideBounds(q, at) {
  const cells = slideCells(q, at), inside = cells.filter(c => c.status === 'whole').length, cover = cells.filter(c => c.status !== 'out').length;
  return {inside, cover, gap: cover - inside};
}
const goalMet = (g, b) => (g.inside === undefined || b.inside >= g.inside) && (g.cover === undefined || b.cover <= g.cover) && (g.gap === undefined || b.gap <= g.gap);
export const slideScale = q => { let top = 0; for (let oy = 0; oy < q.steps; oy++) for (let ox = 0; ox < q.steps; ox++) top = Math.max(top, slideBounds(q, [ox, oy]).cover); return top; };
const NUDGES = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]};
const wrap = (v, s) => ((v % s) + s) % s;
// Fewest nudges from each offset to one that meets the goal (breadth first).
const routeCache = new Map();
export function slideRoutes(q) {
  const key = JSON.stringify([q.shape, q.width, q.height, q.steps, q.goal]);
  if (routeCache.has(key)) return routeCache.get(key);
  const s = q.steps, dist = new Map(), queue = [];
  for (let oy = 0; oy < s; oy++) for (let ox = 0; ox < s; ox++) if (goalMet(q.goal, slideBounds(q, [ox, oy]))) { dist.set(`${ox},${oy}`, 0); queue.push([ox, oy]); }
  for (let k = 0; k < queue.length; k++) {
    const [ox, oy] = queue[k];
    for (const [dx, dy] of Object.values(NUDGES)) {
      const n = [wrap(ox + dx, s), wrap(oy + dy, s)], nk = n.join();
      if (!dist.has(nk)) { dist.set(nk, dist.get(`${ox},${oy}`) + 1); queue.push(n); }
    }
  }
  routeCache.set(key, dist);
  return dist;
}

/* ------------------------------------------------------------------ *
 * Boards
 * ------------------------------------------------------------------ */
// split (reach): {splits}; split (best): {splits, refused, done};
// paint: {painted, paused, done}; slide: {at};
// playground: {shape, splits}.
export const playShape = (q, b) => ({...q.shapes[b.shape], goal: {kind: 'free'}});
const splitParams = (p, b) => p.parameters.mode === 'playground' ? playShape(p.parameters, b) : p.parameters;
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {shape: Object.keys(q.shapes)[0], splits: []};
  if (q.mode === 'paint') return {painted: [], paused: false, done: false};
  if (q.mode === 'slide') return {at: [...q.start]};
  return q.goal.kind === 'best' ? {splits: [], refused: null, done: false} : {splits: []};
}
const keysAre = (b, list) => Object.keys(b).sort().join() === [...list].sort().join();
const sortedSquares = (list, n) => Array.isArray(list) && list.every(i => integer(i) && i >= 0 && i < n) && list.every((i, k) => k === 0 || i > list[k - 1]);
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'playground') return keysAre(b, ['shape', 'splits']) && typeof b.shape === 'string' && Object.hasOwn(q.shapes, b.shape) && validSplits(playShape(q, b), b.splits);
  if (q.mode === 'slide') return keysAre(b, ['at']) && Array.isArray(b.at) && b.at.length === 2 && b.at.every(v => integer(v) && v >= 0 && v < q.steps);
  if (q.mode === 'paint') {
    if (!keysAre(b, ['painted', 'paused', 'done']) || typeof b.paused !== 'boolean' || typeof b.done !== 'boolean') return false;
    if (!sortedSquares(b.painted, q.cols * q.rows * K * K)) return false;
    // Can't is kept only on the closest painting; a refused Can't pauses a
    // painting that fits, is not the closest and does not meet the target.
    if (b.done && (b.paused || !cantHolds(q, b.painted))) return false;
    if (b.paused && (!fits(q, b.painted) || cantHolds(q, b.painted) || meets(q.target, paintArea(b.painted)))) return false;
    return true;
  }
  if (q.goal.kind === 'best') {
    if (!keysAre(b, ['splits', 'refused', 'done']) || typeof b.done !== 'boolean' || !validSplits(q, b.splits, q.budget)) return false;
    const best = plansOf(q).best, now = measureOf(boundsOf(q, b.splits), q.goal.measure);
    if (b.refused !== null && !(typeof b.refused === 'number' && Number.isFinite(b.refused) && b.refused > best && Number.isInteger(b.refused * 4 ** q.depth))) return false;
    return !b.done || now === best;
  }
  return keysAre(b, ['splits']) && validSplits(q, b.splits, q.budget);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'paint') return b.done || (fits(q, b.painted) && meets(q.target, paintArea(b.painted)));
  if (q.mode === 'slide') return goalMet(q.goal, slideBounds(q, b.at));
  if (q.goal.kind === 'best') return b.done;
  return boundsOf(q, b.splits).gap <= q.goal.gap;
}
// Whether Best can be pressed: not after a refusal until the measure beats it.
const bestOpen = (q, b) => b.refused === null || measureOf(boundsOf(q, b.splits), q.goal.measure) < b.refused;
function splitMove(q, b, action, budget) {
  const set = new Set(b.splits), {nodes} = treeOf(q), k = action.node;
  if (action.type === 'split') {
    if (!isNodeKey(k) || !nodes.has(k) || set.has(k) || nodes.get(k).d >= q.depth) return null;
    if (parentOf(k) !== null && !set.has(parentOf(k))) return null;
    if (budget !== undefined && set.size >= budget) return null;
    return sortNodes([...set, k]);
  }
  if (action.type === 'join') {
    if (!isNodeKey(k) || !set.has(k) || childrenOf(k).some(c => set.has(c))) return null;
    return b.splits.filter(s => s !== k);
  }
  return undefined;
}
function move(p, b, action) {
  const q0 = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q0.mode === 'playground') {
    if (action.type === 'shape') return typeof action.shape === 'string' && Object.hasOwn(q0.shapes, action.shape) && action.shape !== b.shape ? {shape: action.shape, splits: []} : null;
    if (action.type === 'clear') return b.splits.length ? {...b, splits: []} : null;
    const splits = splitMove(playShape(q0, b), b, action);
    return splits ? {...b, splits} : null;
  }
  if (q0.mode === 'slide') {
    const s = q0.steps;
    if (action.type === 'nudge' && Object.hasOwn(NUDGES, action.way)) { const [dx, dy] = NUDGES[action.way]; return {at: [wrap(b.at[0] + dx, s), wrap(b.at[1] + dy, s)]}; }
    if (action.type === 'slide' && Array.isArray(action.at) && action.at.length === 2 && action.at.every(v => integer(v) && v >= 0 && v < s) && action.at.join() !== b.at.join()) return {at: [...action.at]};
    return null;
  }
  if (q0.mode === 'paint') {
    if (action.type === 'paint') {
      const n = q0.cols * q0.rows * K * K, list = action.squares;
      if (!Array.isArray(list) || !list.length || !list.every(i => integer(i) && i >= 0 && i < n) || new Set(list).size !== list.length || typeof action.on !== 'boolean') return null;
      const set = new Set(b.painted);
      for (const i of list) action.on ? set.add(i) : set.delete(i);
      const painted = [...set].sort((x, y) => x - y);
      if (painted.join() === b.painted.join()) return null;
      // A new stroke lifts the pause after a refused Can't.
      return {...b, painted, paused: false};
    }
    if (action.type === 'cant') {
      // Can't is a claim about the child's own painting, so it waits for one
      // that fits the marks. It holds only on the painting as close to the
      // target as the marks allow; any other gets the same refusal on every
      // puzzle, which says nothing about whether the target can be met.
      if (!keysAre(action, ['type']) || b.paused || !fits(q0, b.painted)) return null;
      return cantHolds(q0, b.painted) ? {...b, done: true} : {...b, paused: true};
    }
    return null;
  }
  if (q0.goal.kind === 'best' && action.type === 'best') {
    if (!bestOpen(q0, b)) return null;
    const now = measureOf(boundsOf(q0, b.splits), q0.goal.measure);
    return now === plansOf(q0).best ? {...b, done: true} : {...b, refused: now};
  }
  const splits = splitMove(q0, b, action, q0.budget);
  return splits ? {...b, splits} : null;
}

/* ------------------------------------------------------------------ *
 * Hints
 * ------------------------------------------------------------------ */
const ROWS = ['top', 'bottom'], COLS = ['left', 'right'];
export function nodeWords(key) {
  const [x, y, d] = parseNode(key);
  if (d === 0) return `the square in row ${y + 1}, column ${x + 1}`;
  const [px, py] = parseNode(parentOf(key)).slice(0, 2);
  const corner = `${ROWS[y % 2]}-${COLS[x % 2]}`;
  if (d === 1) return `the ${corner} quarter of the square in row ${py + 1}, column ${px + 1}`;
  return `the ${corner} part of ${nodeWords(parentOf(key))}`;
}
const hintCache = new Map();
function splitHint(p, b) {
  const q = p.parameters, key = `${p.id}|${JSON.stringify(b)}`;
  if (hintCache.has(key)) return hintCache.get(key);
  let h;
  const plans = plansOf(q), have = new Set(b.splits);
  if (q.goal.kind === 'best' && measureOf(boundsOf(q, b.splits), q.goal.measure) === plans.best && bestOpen(q, b)) h = {type: 'move', action: {type: 'best'}, text: 'Press Best.'};
  else {
    // The plan that keeps the most of the splits made so far.
    let aim = null, cost = Infinity;
    for (const plan of plans.good) {
      const c = plan.splits.filter(k => !have.has(k)).length + b.splits.filter(k => !plan.splits.includes(k)).length;
      if (c < cost) { aim = plan.splits; cost = c; }
    }
    const extra = sortNodes(b.splits.filter(k => !aim.includes(k))).reverse().find(k => childrenOf(k).every(c => !have.has(c)));
    if (extra) h = {type: 'move', action: {type: 'join', node: extra}, text: `Join ${nodeWords(extra)} again.`};
    else {
      const next = sortNodes(aim.filter(k => !have.has(k)))[0];
      h = next ? {type: 'move', action: {type: 'split', node: next}, text: `Split ${nodeWords(next)}.`} : {type: 'done'};
    }
  }
  hintCache.set(key, h);
  return h;
}
const SMALL = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export function squareWords(q, i) {
  const big = bigOf(q, i), at = squaresOf(q, big).indexOf(i);
  return `the ${SMALL[at]} small square of row ${Math.floor(big / q.cols) + 1}, column ${big % q.cols + 1}`;
}
// Hints lead to a painting that fits the marks first. For a target that can
// be met they then move the partial squares toward the nearest painting that
// meets it; for one that can't, they move them toward the closest painting,
// saying why it is the closest, and only then name Can't.
const toggle = (q, i, on, extra = '') => ({type: 'move', action: {type: 'paint', squares: [i], on}, text: `${on ? 'Paint' : 'Clear'} ${squareWords(q, i)}.${extra}`, square: i});
function paintHint(p, b) {
  const q = p.parameters, stop = stopper(q), marks = patternOf(q), set = new Set(b.painted), full = K * K;
  for (const [big, mark] of marks.entries()) {
    const sq = squaresOf(q, big), on = sq.filter(i => set.has(i));
    if (mark === 'out' && on.length) return toggle(q, on[0], false);
    if (mark === 'whole' && on.length < full) return toggle(q, sq.find(i => !set.has(i)), true);
    if (mark === 'part' && !on.length) return toggle(q, sq[0], true);
    if (mark === 'part' && on.length === full) return toggle(q, on.at(-1), false);
  }
  if (stop) {
    const {inside, cover} = patternBounds(q), want = extremeCount(stop);
    for (const [big, mark] of marks.entries()) {
      if (mark !== 'part') continue;
      const sq = squaresOf(q, big), on = sq.filter(i => set.has(i));
      if (on.length < want) return toggle(q, sq.find(i => !set.has(i)), true, ' A yellow square can have three painted and stay yellow.');
      if (on.length > want) return toggle(q, on.at(-1), false, ' A yellow square needs only one painted to stay yellow.');
    }
    const why = stop === 'cover'
      ? `Every yellow square holds all the paint it can, and the area is still under ${fmt(cover)}.`
      : `Every yellow square is down to one painted small square, and the area is still over ${fmt(inside)}.`;
    return {type: 'move', action: {type: 'cant'}, text: `${why} Press Can’t.`};
  }
  const plan = paintPlan(q, b.painted);
  for (const [big, want] of plan) {
    const sq = squaresOf(q, big), on = sq.filter(i => set.has(i));
    if (on.length > want) return toggle(q, on.at(-1), false);
    if (on.length < want) return toggle(q, sq.find(i => !set.has(i)), true);
  }
  return {type: 'done'};
}
function slideHint(p, b) {
  const q = p.parameters, routes = slideRoutes(q), here = routes.get(b.at.join());
  for (const [way, [dx, dy]] of Object.entries(NUDGES)) {
    const n = [wrap(b.at[0] + dx, q.steps), wrap(b.at[1] + dy, q.steps)];
    if (routes.get(n.join()) === here - 1) return {type: 'move', action: {type: 'nudge', way}, text: `Slide the grid one step ${way}.`};
  }
  return {type: 'done'};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  return q.mode === 'paint' ? paintHint(p, b) : q.mode === 'slide' ? slideHint(p, b) : splitHint(p, b);
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
const f = n => Number(n.toFixed(3));
const STATUS_WORDS = {whole: 'green, all in the shape', part: 'yellow, partly in the shape', out: 'blank'};
const shapePath = (shape, scale) => `M${shape.map(([x, y]) => `${f(x * scale)},${f(y * scale)}`).join('L')}Z`;
const pct = (v, top) => `${f(Math.max(0, Math.min(100, v / top * 100)))}%`;
// A number on the bar: a whole and a fraction, the fraction stacked when it
// has no glyph of its own (sixteenths).
const barNumber = v => {
  const text = fmt(v), m = text.match(/^(?:(\d+) )?(\d+)⁄(\d+)$/);
  return m ? `${m[1] || ''}<span class="cv-frac"><span>${m[2]}</span><span>${m[3]}</span></span>` : text;
};
// The bar: the inside in green from 0, the partial squares in yellow after
// it, the cover where the yellow ends. `goal` draws a target over it and
// `pin` marks a painted area.
export function ruler({inside, cover, top, goal = null, pin = null}) {
  const gap = cover - inside, label = (v, cls, side) => `<span class="cv-num ${cls} ${side}" style="left:${pct(v, top)}" aria-hidden="true">${barNumber(v)}</span>`;
  const nums = gap > 0 ? label(inside, 'in', 'before') + label(cover, 'cov', 'after') : label(inside, 'in', 'mid');
  let over = '';
  if (goal?.gap !== undefined) over += `<i class="cv-bracket" style="left:${pct(inside, top)};width:${pct(goal.gap, top)}"></i>`;
  if (goal?.cover !== undefined) over += `<i class="cv-notch" style="left:${pct(goal.cover, top)}"></i>`;
  if (goal?.inside !== undefined) over += `<i class="cv-notch" style="left:${pct(goal.inside, top)}"></i>`;
  if (goal?.op === '<') over += `<i class="cv-zone open-right" style="left:0;width:${pct(goal.value, top)}"></i>`;
  if (goal?.op === '>') over += `<i class="cv-zone open-left" style="left:${pct(goal.value, top)};width:${pct(top - goal.value, top)}"></i>`;
  if (goal?.op === '=') over += `<i class="cv-notch" style="left:${pct(goal.value, top)}"></i>`;
  const needle = pin === null ? '' : `<i class="cv-needle" style="left:${pct(pin, top)}"></i><span class="cv-tag" style="left:${pct(pin, top)}" aria-hidden="true">${fmt(pin)}</span>`;
  return `<div class="cv-ruler${pin === null ? '' : ' with-pin'}" style="--top:${top}"><div class="cv-track" aria-hidden="true"><i class="cv-in" style="width:${pct(inside, top)}"></i><i class="cv-part" style="left:${pct(inside, top)};width:${pct(gap, top)}"></i>${over}${needle}</div><div class="cv-nums">${nums}</div></div>`;
}
const slots = (used, budget, hinted) => `<span class="cv-slots${hinted ? ' hinted' : ''}" role="img" aria-label="${used} of ${budget} ${budget === 1 ? 'split' : 'splits'} used">${Array.from({length: budget}, (_, k) => `<i class="${k < used ? 'on' : ''}"></i>`).join('')}</span>`;
const claimButton = (label, action, enabled, hinted, cls = '') => `<button type="button" class="secondary cv-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="cv-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const said = text => text ? `<p class="cv-told">${esc(text)}</p>` : '';
const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
const boundsWords = b => `Inside ${words(b.inside)}, cover ${words(b.cover)}, gap ${words(b.gap)}.`;

// The split board, drawn on the shared square grid at its finest level. Each
// unsplit square is a piece named by its top-left finest square, so a split
// keeps focus on its top-left quarter. The dot in the middle of a split
// square whose quarters are not split joins it again.
function splitBoard(q, splits, opts = {}) {
  const D = q.depth, n = 2 ** D, g = gridOf({cols: q.cols * n, rows: q.rows * n}), {nodes} = treeOf(q);
  const set = new Set(splits), leaves = leavesOf(q, splits);
  const piece = k => { const nd = nodes.get(k), m = 2 ** (D - nd.d), cells = []; for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) cells.push(g.at(nd.x * m + i, nd.y * m + j)); return cells; };
  const keyOf = k => { const nd = nodes.get(k), m = 2 ** (D - nd.d); return `${nd.x * m},${nd.y * m}`; };
  const can = opts.active && (opts.budget === undefined || set.size < opts.budget);
  const pieces = leaves.map(k => {
    const nd = nodes.get(k), splittable = opts.active && nd.d < D;
    return {cells: piece(k), key: keyOf(k), cls: `cv-leaf ${nd.status}`, act: splittable, label: `${nodeWords(k).replace(/^the /, '')}, ${STATUS_WORDS[nd.status]}${splittable ? (can ? '. Split it' : '. No splits left') : ''}`};
  });
  const joinAt = new Map(splits.filter(k => childrenOf(k).every(c => !set.has(c))).map(k => { const nd = nodes.get(k), m = 2 ** (D - nd.d); return [`${nd.x * m + m / 2},${nd.y * m + m / 2}`, k]; }));
  const scale = UNIT * n;
  const ring = opts.ringed ? [...opts.ringed].filter(k => set.has(k)).map(k => { const nd = nodes.get(k), s = nd.side * scale; return `<rect class="cv-ring" x="${f(nd.x * s)}" y="${f(nd.y * s)}" width="${f(s)}" height="${f(s)}"/>`; }).join('') : '';
  const hint = opts.hinted && !set.has(opts.hinted) ? (() => { const nd = nodes.get(opts.hinted), s = nd.side * scale; return `<rect class="cv-hint" x="${f(nd.x * s + 1)}" y="${f(nd.y * s + 1)}" width="${f(s - 2)}" height="${f(s - 2)}"/>`; })() : '';
  const gains = opts.gains ? [...opts.gains].map(([k, v]) => { const nd = nodes.get(k), s = nd.side * scale; return `<text class="cv-gain" x="${f((nd.x + .5) * s)}" y="${f((nd.y + .5) * s + s * .09)}">${fmt(v)}</text>`; }).join('') : '';
  return squareBoard(g, {
    cls: `cv-board cv-split d${D}${opts.picture ? ' cv-mini' : ''}`, label: opts.label || 'Shape on a grid of squares', picture: opts.picture, pad: opts.picture ? .2 : .25,
    pieces,
    point: k => {
      const node = joinAt.get(g.points[k].join());
      if (!node || !opts.active) return null;
      return {cls: `cv-join${opts.hinted === node ? ' hinted' : ''}`, act: true, label: `Join ${nodeWords(node)} again`};
    },
    over: `<path class="cv-shape" d="${shapePath(q.shape, scale)}"/>${ring}${hint}${gains}`
  });
}
// After a right Best: what splitting each partial square once saves, in the
// puzzle's measure. A split saves at most its own square's share, and at one
// level the shares add, so the best plan takes the largest.
export function gainsOf(q) {
  const {nodes, roots} = treeOf(q), out = new Map();
  for (const k of roots) {
    if (nodes.get(k).status !== 'part') continue;
    const kids = childrenOf(k).map(c => nodes.get(c)), whole = kids.filter(c => c.status === 'whole').reduce((s, c) => s + c.area, 0), outside = kids.filter(c => c.status === 'out').reduce((s, c) => s + c.area, 0);
    out.set(k, q.goal.measure === 'cover' ? outside : q.goal.measure === 'inside' ? whole : whole + outside);
  }
  return out;
}
function renderSplit(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), bounds = boundsOf(q, b.splits);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.action;
  const hinted = act && (act.type === 'split' || act.type === 'join') ? act.node : null;
  const best = q.goal.kind === 'best';
  const ringed = done && best ? new Set(b.splits) : null;
  const board = splitBoard(q, b.splits, {active: !done, budget: q.budget, hinted, ringed, gains: done && best ? gainsOf(q) : null});
  const bar = done ? '' : `<div class="cv-bar">${slots(b.splits.length, q.budget, false)}${best ? claimButton('Best', {type: 'best'}, bestOpen(q, b), act?.type === 'best', 'cv-claim') : ''}</div>`;
  // The refusal is said while it holds, until the board beats the refused value.
  const told = best && !done && !bestOpen(q, b) ? (q.goal.measure === 'cover' ? 'A smaller cover is possible.' : 'A smaller gap is possible.') : '';
  const goal = q.goal.kind === 'reach' ? {gap: q.goal.gap} : null;
  const words2 = `${b.splits.length} of ${q.budget} splits used. ${boundsWords(bounds)}${told ? ` ${told}` : ''}`;
  return `<div class="cv-puzzle${done ? ' solved' : ''}" data-mechanic-wire="covers">${bar}<div class="cv-stage">${board}</div>${ruler({...bounds, top: q.cols * q.rows, goal})}${said(told)}${status(words2)}</div>`;
}
// The shape buttons' pictures never change, so each is drawn once.
const pictures = new WeakMap();
const pictureOf = s => { if (!pictures.has(s)) pictures.set(s, splitBoard({...s, depth: 0, goal: {kind: 'free'}}, [], {picture: true, label: s.name})); return pictures.get(s); };
function renderPlayground(p, a) {
  const q0 = p.parameters, b = a.board, q = playShape(q0, b), bounds = boundsOf(q, b.splits);
  const picks = `<div class="cv-shapes" role="group" aria-label="Shape">${Object.entries(q0.shapes).map(([id, s]) => `<button type="button" class="secondary cv-pick-shape" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'shape', shape: id}))}" data-focus="cv-shape-${id}" aria-pressed="${b.shape === id}" aria-label="${esc(s.name)}">${pictureOf(s)}</button>`).join('')}</div>`;
  const clear = claimButton('Clear', {type: 'clear'}, b.splits.length > 0, false, 'cv-clear');
  return `<div class="cv-puzzle" data-mechanic-wire="covers">${picks}<div class="cv-bar">${clear}</div><div class="cv-stage">${splitBoard(q, b.splits, {active: true})}</div>${ruler({...bounds, top: q.cols * q.rows})}${status(boundsWords(bounds))}</div>`;
}

// The paint board: small squares on the shared grid, each big square framed
// and tinted with the mark it must end with (green all painted, yellow
// partly painted, blank clear), painted squares grey, and the frame dashed
// while the big square does not match its mark. After a right Can't the
// argument is drawn on the child's own painting: a plus on each painted small square of a
// yellow square (each adds to the inside), or a minus on each clear one
// (each is missing from the cover).
function paintBoard(q, b, opts = {}) {
  const g = paintGrid(q), marks = patternOf(q), now = paintStatus(q, b.painted), set = new Set(b.painted), scale = UNIT * K;
  const frames = marks.map((m, big) => {
    const x = (big % q.cols) * scale, y = Math.floor(big / q.cols) * scale;
    const off = !opts.done && now[big] !== m;
    return `<rect class="cv-big ${m}${off ? ' off' : ''}" x="${x + 1}" y="${y + 1}" width="${scale - 2}" height="${scale - 2}"/>`;
  }).join('');
  const signs = opts.argue ? g.cells.map((_, i) => {
    if (marks[bigOf(q, i)] !== 'part' || set.has(i) !== (opts.argue === 'inside')) return '';
    const [cx, cy] = g.centre[i];
    return `<text class="cv-sign" x="${f(cx)}" y="${f(cy + 3.2)}">${opts.argue === 'inside' ? '+' : '−'}</text>`;
  }).join('') : '';
  return squareBoard(g, {
    cls: 'cv-board cv-paint', label: 'Small squares to paint', stroke: opts.active,
    cell: i => {
      const on = set.has(i), m = marks[bigOf(q, i)];
      return {cls: on ? 'ink' : `mark-${m}`, act: opts.active, label: `${squareWords(q, i).replace(/^the /, '')}, ${on ? 'painted' : 'clear'}; its big square should be ${m === 'whole' ? 'all painted' : m === 'part' ? 'partly painted' : 'clear'}`};
    },
    over: frames + signs + (opts.hinted === null || opts.hinted === undefined ? '' : (() => { const [cx, cy] = g.centre[opts.hinted]; return `<rect class="cv-hint" x="${f(cx - UNIT / 2 + 1)}" y="${f(cy - UNIT / 2 + 1)}" width="${UNIT - 2}" height="${UNIT - 2}"/>`; })())
  });
}
const TARGET_WORDS = {'<': 'less than', '>': 'more than', '=': 'exactly'};
function renderPaint(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), pb = patternBounds(q), area = paintArea(b.painted);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.action;
  const open = !done && !b.paused && fits(q, b.painted);
  const argue = b.done ? stopper(q) : null;
  const board = paintBoard(q, b, {active: !done, hinted: act?.type === 'paint' ? act.squares[0] : null, done, argue});
  const cant = done ? '' : `<div class="cv-bar">${claimButton('Can’t', {type: 'cant'}, open, act?.type === 'cant', 'cv-claim')}</div>`;
  const told = b.paused ? 'Get closer first.' : '';
  const bar = ruler({...pb, top: q.cols * q.rows, goal: {op: q.target.op, value: q.target.value}, pin: area});
  const words2 = `Area ${words(area)}. Inside ${words(pb.inside)}, cover ${words(pb.cover)}. Target: ${TARGET_WORDS[q.target.op]} ${words(q.target.value)}.${told ? ` ${told}` : ''}`;
  return `<div class="cv-puzzle${done ? ' solved' : ''}" data-mechanic-wire="covers">${cant}<div class="cv-stage">${board}</div>${bar}${said(told)}${status(words2)}</div>`;
}

// The slide board: the window, the grid's squares coloured for this offset
// (clipped to the window), the grid lines, and the fixed shape on top.
export function slideLayer(q, at) {
  return slideCells(q, at).map(c => `<rect class="cv-cell ${c.status}" x="${f(c.x * UNIT)}" y="${f(c.y * UNIT)}" width="${UNIT}" height="${UNIT}"/>`).join('');
}
function slideBoard(q, at, id) {
  const w = q.width * UNIT, h = q.height * UNIT, clip = `cv-clip-${esc(id)}`;
  return `<svg class="cv-board cv-slide" viewBox="-2 -2 ${w + 4} ${h + 4}" style="--sg-aspect:${f((w + 4) / (h + 4))}" role="group" tabindex="0" aria-label="Grid over a shape. Drag the grid or use the arrow keys to slide it" data-cv-slide data-focus="cv-slide-board"><defs><clipPath id="${clip}"><rect x="0" y="0" width="${w}" height="${h}"/></clipPath></defs><rect class="cv-window" x="0" y="0" width="${w}" height="${h}"/><g clip-path="url(#${clip})"><g class="cv-cells">${slideLayer(q, at)}</g></g><path class="cv-shape" d="${shapePath(q.shape, UNIT)}"/><rect class="cv-frame" x="0" y="0" width="${w}" height="${h}"/></svg>`;
}
const ARROWS = {left: '←', up: '↑', down: '↓', right: '→'};
function renderSlide(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), bounds = slideBounds(q, b.at);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const nudges = done ? '' : `<div class="cv-bar cv-nudges" role="group" aria-label="Slide the grid">${Object.keys(ARROWS).map(way => `<button type="button" class="secondary cv-button cv-nudge${h?.action?.way === way ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'nudge', way}))}" data-focus="cv-nudge-${way}" aria-label="Slide the grid ${way}">${ARROWS[way]}</button>`).join('')}</div>`;
  return `<div class="cv-puzzle${done ? ' solved' : ''}" data-mechanic-wire="covers">${nudges}<div class="cv-stage cv-slide-stage">${slideBoard(q, b.at, p.id)}</div><div class="cv-slide-bar">${ruler({...bounds, top: slideScale(q), goal: q.goal})}</div>${status(boundsWords(bounds))}</div>`;
}
function render(p, a) {
  const mode = p.parameters.mode;
  return mode === 'playground' ? renderPlayground(p, a) : mode === 'paint' ? renderPaint(p, a) : mode === 'slide' ? renderSlide(p, a) : renderSplit(p, a);
}

/* ------------------------------------------------------------------ *
 * Taps, strokes, drags and keys
 * ------------------------------------------------------------------ */
// The unsplit square whose top-left finest square is (fx, fy).
export function leafAt(q, splits, key) {
  const [fx, fy] = key.split(',').map(Number), D = q.depth;
  let k = nodeKey(fx >> D, fy >> D, 0);
  const set = new Set(splits);
  while (set.has(k)) { const d = parseNode(k)[2] + 1; if (d > D) break; k = nodeKey(fx >> (D - d), fy >> (D - d), d); }
  return k;
}
function wire(root, p, api) {
  const q0 = p.parameters, now = () => api.attempt().board;
  if (q0.mode === 'split' || q0.mode === 'playground') {
    const qOf = () => splitParams(p, now()), D = qOf().depth, n = 2 ** D;
    const g = gridOf({cols: qOf().cols * n, rows: qOf().rows * n});
    wireSquare(root, g, {
      piece: key => ({type: 'split', node: leafAt(qOf(), now().splits, key)}),
      point: k => {
        const b = now(), [px, py] = g.points[k], set = new Set(b.splits);
        const node = b.splits.find(s => { const [x, y, d] = parseNode(s), m = 2 ** (D - d); return x * m + m / 2 === px && y * m + m / 2 === py && childrenOf(s).every(c => !set.has(c)); });
        return node ? {type: 'join', node} : null;
      }
    }, api.apply);
    return;
  }
  if (q0.mode === 'paint') {
    const g = paintGrid(q0);
    wireSquare(root, g, {
      cell: i => ({type: 'paint', squares: [i], on: !now().painted.includes(i)}),
      stroke: cells => ({type: 'paint', squares: cells, on: !now().painted.includes(cells[0])}),
      preview: () => 'ok'
    }, api.apply);
    return;
  }
  if (q0.mode !== 'slide') return;
  const svg = root.querySelector('[data-cv-slide]');
  if (!svg) return;
  const layer = svg.querySelector('.cv-cells'), bar = root.querySelector('.cv-slide-bar'), s = q0.steps;
  const show = at => {
    layer.innerHTML = slideLayer(q0, at);
    if (bar) bar.innerHTML = ruler({...slideBounds(q0, at), top: slideScale(q0), goal: q0.goal});
  };
  let drag = null;
  const units = e => { const m = svg.getScreenCTM?.(); if (!m) return null; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const r = pt.matrixTransform(m.inverse()); return [r.x / UNIT, r.y / UNIT]; };
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary || solved(p, now())) return;
    const at = units(e);
    if (!at) return;
    drag = {id: e.pointerId, from: at, start: [...now().at], at: [...now().at]};
    svg.setPointerCapture?.(e.pointerId);
    svg.classList.add('dragging');
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const at = units(e);
    if (!at) return;
    const next = [wrap(drag.start[0] + Math.round((at[0] - drag.from[0]) * s), s), wrap(drag.start[1] + Math.round((at[1] - drag.from[1]) * s), s)];
    if (next.join() !== drag.at.join()) { drag.at = next; show(next); }
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    svg.classList.remove('dragging');
    if (e.type === 'pointerup' && d.at.join() !== d.start.join()) api.apply({type: 'slide', at: d.at});
    else show(d.start);
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  const KEYS = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'};
  svg.addEventListener('keydown', e => {
    if (!KEYS[e.key] || e.altKey || e.ctrlKey || e.metaKey || solved(p, now())) return;
    e.preventDefault();
    api.apply({type: 'nudge', way: KEYS[e.key]});
  });
}

const help = p => {
  const mode = p.parameters.mode;
  const key = '<p class="cv-key"><span class="cv-chip whole"></span> all in the shape <span class="cv-chip part"></span> partly in it <span class="cv-chip out"></span> not in it</p>';
  return mode === 'paint' ? '<p class="cv-key"><span class="cv-chip whole"></span> all painted <span class="cv-chip part"></span> partly painted <span class="cv-chip out"></span> none painted <span class="cv-chip grey"></span> paint</p>' : key;
};

export const coversMechanics = {
  covers: {
    fresh, valid, solved, move, hint, render, wire, help,
    // Undo takes back moves, not a claim: a refused Best keeps its value, and
    // a refused Can't keeps its pause while the painting is the same.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'paint') return {...to, paused: to.paused || (from.paused === true && from.painted?.join() === to.painted.join())};
      if (q.mode === 'split' && q.goal.kind === 'best') return {...to, refused: from.refused, done: false};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'covers',
  family: {id: 'covers', symbol: '⊡', area: 'shapes', region: 'shape'},
  mechanics: coversMechanics,
  pack: new URL('./covers.json', import.meta.url).href,
  css: new URL('./covers.css', import.meta.url).href,
  focus: '.cv-puzzle [data-sg-piece],.cv-puzzle [data-sg-cell],.cv-puzzle [data-cv-slide],.cv-puzzle .cv-nudge'
};
