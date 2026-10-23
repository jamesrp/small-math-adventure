// The mathematics of Missing square (worksheet Week 93, squaring a
// rectangle): paper shapes on the square grid, straight cuts along grid
// lines, quarter turns, and the searches the hints and the build use.
//
// A shape is a list of squares [x, y] (x across, y down). A straight cut
// follows one whole grid line across a piece and must leave exactly two
// pieces. A quarter turn is clockwise on the screen. The average-side square
// of an a by b rectangle (a < b, a + b even) has side m = (a + b)/2 and holds
// the rectangle with one square of side d = (b − a)/2 left over, since
// m² − ab = d². See docs/reshape/README.md.

export const cellKey = ([x, y]) => `${x},${y}`;
// Shapes recur all through a search, so the work on each is remembered by
// its squares in order.
function memo(fn) {
  const cache = new Map(), seen = new WeakMap();
  return cells => {
    let v = seen.get(cells);
    if (v !== undefined) return v;
    const k = String(cells);
    v = cache.get(k);
    if (v === undefined) { if (cache.size > 20000) cache.clear(); v = fn(cells); cache.set(k, v); }
    seen.set(cells, v);
    return v;
  };
}

/* --------------------------------------------------------------------- *
 * Shapes and quarter turns
 * --------------------------------------------------------------------- */
// Shifted so the smallest x and y are 0, keeping the order of the squares.
export function shift(cells) {
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]);
}
const byReading = (a, b) => a[1] - b[1] || a[0] - b[0];
export const norm = cells => shift(cells).sort(byReading);
export const shapeKey = cells => norm(cells).map(cellKey).join(' ');
// r quarter turns clockwise of a shifted shape, square for square: the i-th
// square of the result is where the i-th square of `cells` goes.
export function turnCells(cells, r) {
  let out = shift(cells);
  for (let k = 0; k < ((r % 4) + 4) % 4; k++) {
    const maxY = Math.max(...out.map(c => c[1]));
    out = out.map(([x, y]) => [maxY - y, x]);
  }
  return out;
}
// The fewest quarter turns that give the same footprint as r turns (a
// rectangle has two, a square one).
export function canonTurn(cells, r) {
  const want = shapeKey(turnCells(cells, r));
  for (let k = 0; k < 4; k++) if (shapeKey(turnCells(cells, k)) === want) return k;
  return 0;
}
export const turnsOf = cells => [0, 1, 2, 3].filter(r => canonTurn(cells, r) === r);
// The same key however the shape is turned (a rectangle's is its sides).
export const turnKey = memo(cells => {
  const r = rectOf(cells);
  return r ? `R${Math.max(r[2], r[3])}x${Math.min(r[2], r[3])}` : [0, 1, 2, 3].map(t => shapeKey(turnCells(cells, t))).sort()[0];
});
// Width and height of a shape.
export function sizeOf(cells) {
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  return [Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1];
}
// [x, y, w, h] when the squares fill a rectangle exactly, else null.
export function rectOf(cells) {
  if (!cells.length) return null;
  let x = Infinity, y = Infinity, X = -Infinity, Y = -Infinity;
  for (const [u, v] of cells) { if (u < x) x = u; if (u > X) X = u; if (v < y) y = v; if (v > Y) Y = v; }
  const w = X - x + 1, h = Y - y + 1;
  if (w * h !== cells.length) return null;
  const seen = new Uint8Array(w * h);
  for (const [u, v] of cells) { const i = (v - y) * w + u - x; if (seen[i]) return null; seen[i] = 1; }
  return [x, y, w, h];
}
export const rectCells = (x, y, w, h) => { const out = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([x + i, y + j]); return out; };
// "6x2": a rectangle's sides, longer first (a turned rectangle is the same one).
export const rectKey = (w, h) => `${Math.max(w, h)}x${Math.min(w, h)}`;
export const keyRect = key => key.split('x').map(Number);

function connected(cells) {
  if (!cells.length) return false;
  const set = new Set(cells.map(cellKey)), seen = new Set([cellKey(cells[0])]), stack = [cells[0]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = cellKey([x + dx, y + dy]);
      if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, y + dy]); }
    }
  }
  return seen.size === set.size;
}
export {connected};

/* --------------------------------------------------------------------- *
 * The start shape: an a by b rectangle, or the square with a corner gone
 * --------------------------------------------------------------------- */
// {w, h} is a rectangle w across and h down; {w, h, notch: s} takes an s by
// s square from its top-right corner (the average-side square with its
// missing square).
export function startCells(home) {
  return rectCells(0, 0, home.w, home.h).filter(([x, y]) => !(home.notch && x >= home.w - home.notch && y < home.notch));
}

/* --------------------------------------------------------------------- *
 * Straight cuts
 * --------------------------------------------------------------------- */
// The squares of `cells` on each side of a grid line: dir 'h' is the line
// y = k (above it, then below), 'v' the line x = k (left, then right). A cut
// is legal when it leaves exactly two pieces. Returns two lists of indices
// into `cells`, or null.
export function splitBy(cells, dir, k) {
  const a = [], b = [];
  cells.forEach((c, i) => ((dir === 'h' ? c[1] : c[0]) < k ? a : b).push(i));
  if (!a.length || !b.length) return null;
  if (!rectOf(cells) && (!connected(a.map(i => cells[i])) || !connected(b.map(i => cells[i])))) return null;
  return [a, b];
}
// Every legal straight cut of a shape with its two sides: [{dir, k, a, b}].
const cutsOfShape = memo(cells => {
  const out = [], xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  for (const [dir, lo, hi] of [['h', Math.min(...ys), Math.max(...ys)], ['v', Math.min(...xs), Math.max(...xs)]]) for (let k = lo + 1; k <= hi; k++) {
    const parts = splitBy(cells, dir, k);
    if (parts) out.push({dir, k, a: parts[0], b: parts[1], A: parts[0].map(j => cells[j]), B: parts[1].map(j => cells[j])});
  }
  return out;
});
// Every legal straight cut of a shape: [{dir, k}].
export const linesOf = cells => cutsOfShape(cells).map(({dir, k}) => ({dir, k}));
// Where a cut line runs across a shape: [x1, y1, x2, y2] in grid points.
export function lineSpan(cells, dir, k) {
  const set = new Set(cells.map(cellKey));
  if (dir === 'h') {
    const xs = cells.filter(([x, y]) => y === k && set.has(cellKey([x, k - 1]))).map(c => c[0]);
    return [Math.min(...xs), k, Math.max(...xs) + 1, k];
  }
  const ys = cells.filter(([x, y]) => x === k && set.has(cellKey([k - 1, y]))).map(c => c[1]);
  return [k, Math.min(...ys), k, Math.max(...ys) + 1];
}

// Whether a set of pieces (lists of squares) can come from `start` by
// straight cuts: some legal cut of the whole keeps every piece on one side,
// and each side splits the same way.
export function cutReachable(start, pieces) {
  if (pieces.length === 1) return shapeKey(pieces[0]) === shapeKey(start) && pieces[0].length === start.length && pieces[0].every(c => start.some(s => s[0] === c[0] && s[1] === c[1]));
  const owner = new Map();
  pieces.forEach((p, i) => p.forEach(c => owner.set(cellKey(c), i)));
  if (owner.size !== start.length || !start.every(c => owner.has(cellKey(c)))) return false;
  for (const {dir, k} of linesOf(start)) {
    const [a, b] = splitBy(start, dir, k), sideA = a.map(i => start[i]), sideB = b.map(i => start[i]);
    const inA = new Set(sideA.map(c => owner.get(cellKey(c)))), inB = new Set(sideB.map(c => owner.get(cellKey(c))));
    if ([...inA].some(i => inB.has(i))) continue;
    if (cutReachable(sideA, [...inA].map(i => pieces[i])) && cutReachable(sideB, [...inB].map(i => pieces[i]))) return true;
  }
  return false;
}

/* --------------------------------------------------------------------- *
 * Fitting pieces into a region (exact cover, turning allowed)
 * --------------------------------------------------------------------- */
// The ways a shape can be turned, each as squares in reading order.
const formsOf = memo(cells => turnsOf(cells).map(r => {
  const t = turnCells(cells, r).sort(byReading);
  return {r, t, w: Math.max(...t.map(c => c[0])) + 1, h: Math.max(...t.map(c => c[1])) + 1};
}));
// Fill `region` (a list of squares) exactly with every shape in `shapes`,
// each turned as needed. Returns [{r, x, y}] per shape (the turned shape's
// top-left corner), or null.
export function cover(region, shapes) {
  const total = shapes.reduce((s, p) => s + p.length, 0);
  if (total !== region.length) return null;
  if (!region.length) return [];
  const x0 = Math.min(...region.map(c => c[0])), y0 = Math.min(...region.map(c => c[1]));
  const W = Math.max(...region.map(c => c[0])) - x0 + 1, H = Math.max(...region.map(c => c[1])) - y0 + 1;
  const free = new Uint8Array(W * H), order = region.map(([x, y]) => (y - y0) * W + x - x0).sort((a, b) => a - b);
  order.forEach(i => { free[i] = 1; });
  const forms = shapes.map(p => formsOf(shift(p))), keys = shapes.map(turnKey), used = shapes.map(() => false), out = shapes.map(() => null);
  if (!forms.every(list => list.some(({w, h}) => w <= W && h <= H))) return null;
  let left = region.length;
  const go = at => {
    if (!left) return true;
    while (!free[order[at]]) at++;
    const fx = order[at] % W, fy = Math.floor(order[at] / W), tried = new Set();
    for (let i = 0; i < shapes.length; i++) {
      if (used[i] || tried.has(keys[i])) continue;
      tried.add(keys[i]);
      for (const {r, t, w, h} of forms[i]) {
        const ox = fx - t[0][0], oy = fy - t[0][1];
        if (ox < 0 || oy < 0 || ox + w > W || oy + h > H) continue;
        const at2 = t.map(([x, y]) => (oy + y) * W + ox + x);
        if (!at2.every(j => free[j])) continue;
        at2.forEach(j => { free[j] = 0; }); used[i] = true; left -= at2.length; out[i] = {r, x: ox + x0, y: oy + y0};
        if (go(at + 1)) return true;
        at2.forEach(j => { free[j] = 1; }); used[i] = false; left += at2.length; out[i] = null;
      }
    }
    return false;
  };
  return go(0) ? out : null;
}

// Every way to cut `pieces` (lists of squares) with at most `budget` more
// straight cuts, one per set of shapes (up to turning), breadth first, each
// with the first cut that leads there: [{pieces, first: {piece, dir, k} | null}].
// `piece` is the index of the piece cut in the list given.
export function partitions(pieces, budget) {
  const key = list => list.map(turnKey).sort().join('|');
  const seen = new Set([key(pieces)]), out = [{pieces, first: null}];
  let frontier = out.slice();
  for (let c = 0; c < budget; c++) {
    const next = [];
    for (const state of frontier) state.pieces.forEach((p, i) => {
      for (const {dir, k, A, B} of cutsOfShape(p)) {
        const list = [...state.pieces.slice(0, i), A, B, ...state.pieces.slice(i + 1)];
        const kk = key(list);
        if (seen.has(kk)) continue;
        seen.add(kk);
        const item = {pieces: list, first: state.first || {piece: i, dir, k}};
        next.push(item); out.push(item);
      }
    });
    frontier = next;
  }
  return out;
}

/* --------------------------------------------------------------------- *
 * Squares that need pieces of their own (the certificate for Can't)
 * --------------------------------------------------------------------- */
// Two squares of a region can share one rectangular piece when the
// rectangle they span lies inside the region.
export function shareable(region, a, b) {
  const set = region instanceof Set ? region : new Set(region.map(cellKey));
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!set.has(cellKey([x, y]))) return false;
  return true;
}
// Squares no two of which can share a piece: every rectangular piece holds
// at most one, so filling the region takes at least that many pieces.
export function apart(region, list) {
  const set = new Set(region.map(cellKey));
  if (!list.every(c => set.has(cellKey(c))) || new Set(list.map(cellKey)).size !== list.length) return false;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (shareable(set, list[i], list[j])) return false;
  return true;
}
// The most squares of a region that pairwise can't share a piece (a largest
// clique of the "can't share" graph, by branch and bound).
export function mostApart(region) {
  const set = new Set(region.map(cellKey)), n = region.length;
  const clash = region.map(a => region.map(b => a !== b && !shareable(set, a, b)));
  let best = [];
  const grow = (chosen, candidates) => {
    if (chosen.length > best.length) best = chosen.slice();
    if (chosen.length + candidates.length <= best.length) return;
    candidates.forEach((c, i) => grow([...chosen, c], candidates.slice(i + 1).filter(d => clash[c][d])));
  };
  grow([], Array.from({length: n}, (_, i) => i));
  return best.map(i => region[i]);
}

