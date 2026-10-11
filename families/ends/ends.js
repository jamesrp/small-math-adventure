// Ways out (worksheet Week 68, "How many ways out"). A map of dots and roads
// goes on forever. Blocking a dot takes it and every road touching it away,
// and the open dots fall into pieces. A piece that goes on forever is a
// forever piece; a piece that stops is trapped. The most forever pieces that
// finitely many blocks can ever make is the number of ends of the map.
//
// - A line, a ladder and a strip of three rows have two ends: put all the
//   blocks in a box of columns; outside it there are only two tails, each in
//   one piece, and every forever piece reaches a tail.
// - The square grid has one end: outside a box round every block, the ring
//   road joins everything, so there is only ever one forever piece.
// - A T of ladders has three ends: three tails outside a box round the
//   junction and the blocks.
// - The tree where every dot has three roads has infinitely many ends. A
//   block splits its piece into at most three, so m blocks make at most
//   2m + 1 pieces, exactly 2m + 1 when no two blocks touch and nothing is
//   trapped.
//
// Forever is decided by that continuation rule, never by the window's edge:
// pieces are found in a box round the blocks (and the map's junction), and a
// piece is forever when it reaches outside the box. On the tree, a piece is
// forever when it reaches a dot off the paths from the centre to the blocks.
//
// The flat maps are unions of bands of the square grid, panned by dragging.
// The tree is drawn in the Poincaré disk (edge length ln 3, all angles 120°,
// the edges of the {∞, 3} tiling); dragging moves it by hyperbolic
// translations, so any dot can be brought to the middle.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const PLAY_CAP = 40;
export const SHOWN = [null, 'pieces', 'can', 'cant'];
const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const say = n => NUMBER[n] || String(n);
const f = n => Number(n.toFixed(3));

// --- Flat maps ------------------------------------------------------------------
// {kind: 'flat', bands: [{x: [lo, hi], y: [lo, hi]}], view: {w, h, cx, cy}, pan: 'x' | 'xy'}
// A band is a rectangle of grid dots; null is no end. Roads join dots one step
// apart across or down. y counts down the screen.
export const keyOf = (x, y) => `${x},${y}`;
export const xyOf = d => d.split(',').map(Number);
const FLAT_DOT = /^-?\d+,-?\d+$/;
const within = (r, v) => (r[0] === null || v >= r[0]) && (r[1] === null || v <= r[1]);
export const flatHas = (m, x, y) => m.bands.some(b => within(b.x, x) && within(b.y, y));
const STEPS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export function flatNeighbours(m, d) {
  const [x, y] = xyOf(d);
  return STEPS.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => flatHas(m, a, b)).map(([a, b]) => keyOf(a, b));
}
// The hull of the bands' finite ends on one axis: the map's junction lies in it.
function axisCore(m, axis) {
  const ends = m.bands.flatMap(b => b[axis].filter(v => v !== null));
  return ends.length ? [Math.min(...ends), Math.max(...ends)] : null;
}
// The box round every block and the map's junction (rows the map spans, the
// columns of the T's stem). With nothing to hold, a box at `at`.
export function boxOf(m, blocks, at = [0, 0]) {
  const pts = blocks.map(xyOf);
  const axis = (i, name) => {
    const vals = pts.map(p => p[i]), core = axisCore(m, name);
    if (core) vals.push(...core);
    return vals.length ? [Math.min(...vals), Math.max(...vals)] : [at[i], at[i]];
  };
  return {x: axis(0, 'x'), y: axis(1, 'y')};
}
const grow = (r, n = 1) => ({x: [r.x[0] - n, r.x[1] + n], y: [r.y[0] - n, r.y[1] + n]});
const inside = (r, x, y) => x >= r.x[0] && x <= r.x[1] && y >= r.y[0] && y <= r.y[1];
// Pieces of the dots in rectangle Q that `skip` leaves open, joined by roads in Q.
function components(m, Q, skip) {
  const pieceOf = new Map(), pieces = [];
  for (let y = Q.y[0]; y <= Q.y[1]; y++) for (let x = Q.x[0]; x <= Q.x[1]; x++) {
    const d = keyOf(x, y);
    if (!flatHas(m, x, y) || skip(d, x, y) || pieceOf.has(d)) continue;
    const dots = [], stack = [d];
    pieceOf.set(d, pieces.length);
    while (stack.length) {
      const u = stack.pop();
      dots.push(u);
      for (const v of flatNeighbours(m, u)) {
        const [a, b] = xyOf(v);
        if (!inside(Q, a, b) || skip(v, a, b) || pieceOf.has(v)) continue;
        pieceOf.set(v, pieces.length);
        stack.push(v);
      }
    }
    pieces.push({dots});
  }
  return {pieces, pieceOf};
}
// A dot of `window` (a rectangle, for drawing) beyond the ring round the box
// joins the piece of the ring dot it reaches by walking straight toward the
// box: that walk stays outside the box and on the map, along its row on the
// strips, down the T's stem, and round a corner of the ring on the grid.
function joinWindow(m, Q, window, pieceOf) {
  if (!window) return;
  const clamp = (v, r) => Math.min(Math.max(v, r[0]), r[1]);
  for (let y = window.y[0]; y <= window.y[1]; y++) for (let x = window.x[0]; x <= window.x[1]; x++) {
    if (inside(Q, x, y) || !flatHas(m, x, y)) continue;
    const ring = keyOf(clamp(x, Q.x), clamp(y, Q.y));
    if (pieceOf.has(ring)) pieceOf.set(keyOf(x, y), pieceOf.get(ring));
  }
}
// The pieces left by the blocks, found in the box round the blocks with a ring
// of dots round it. Outside the box the map is only tails or the grid's
// outside, each in one piece and each going on forever, and the ring holds a
// stretch of every one, so a piece is forever exactly when it reaches outside
// the box. Dots of `window` beyond the ring join the tail they lie on.
export function flatPieces(m, blocks, window = null) {
  const R = boxOf(m, blocks), Q = grow(R), blocked = new Set(blocks);
  const {pieces, pieceOf} = components(m, Q, d => blocked.has(d));
  for (const piece of pieces) piece.forever = piece.dots.some(d => { const [x, y] = xyOf(d); return !inside(R, x, y); });
  joinWindow(m, Q, window, pieceOf);
  return {pieces, pieceOf, box: R};
}
// The pieces outside a box: the tails (or the grid's ring road) that every
// forever piece must reach. Their number for the box round the junction alone
// is the map's number of ends.
export function outsidePieces(m, box, window = null) {
  const Q = grow(box), found = components(m, Q, (d, x, y) => inside(box, x, y));
  joinWindow(m, Q, window, found.pieceOf);
  return found;
}
export const flatEnds = m => outsidePieces(m, boxOf(m, [])).pieces.length;

// --- The tree -------------------------------------------------------------------
// Every dot has three roads, labelled a, b and c. The centre is "o"; another dot
// is the word of road labels from the centre, never the same label twice in a
// row (the group Z2 * Z2 * Z2, whose Cayley graph this is).
const WORD = /^[abc]+$/;
export const treeIsDot = d => d === 'o' || (typeof d === 'string' && WORD.test(d) && !/(.)\1/.test(d));
export const parentOf = d => d.length === 1 ? 'o' : d.slice(0, -1);
export const depthOf = d => d === 'o' ? 0 : d.length;
export function treeNeighbours(d) {
  if (d === 'o') return ['a', 'b', 'c'];
  return [...'abc'].map(x => x === d.at(-1) ? parentOf(d) : d + x);
}
// The road label from d to its neighbour n.
const labelTo = (d, n) => n === 'o' ? d : depthOf(n) > depthOf(d) ? n.at(-1) : d.at(-1);
export function treeDistance(u, v) {
  const a = u === 'o' ? '' : u, b = v === 'o' ? '' : v;
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  return a.length + b.length - 2 * k;
}
// Pieces left by the blocks. H is the union of the paths from the centre to
// the blocks. A dot off H hangs on a branch with no block in it, so its piece
// goes on forever; a piece is trapped exactly when it stays inside H. Pieces
// are found in H and its neighbours; any other dot (`extra`, for drawing)
// joins the piece of the first of those on its way to the centre.
export function treePieces(blocks, extra = []) {
  const blocked = new Set(blocks), H = new Set(['o']);
  for (const b of blocks) for (let d = b; d !== 'o'; d = parentOf(d)) H.add(d);
  const region = new Set(H);
  for (const d of H) for (const n of treeNeighbours(d)) region.add(n);
  const pieceOf = new Map(), pieces = [];
  for (const d of [...region].sort(treeOrder)) {
    if (blocked.has(d) || pieceOf.has(d)) continue;
    const dots = [], stack = [d];
    pieceOf.set(d, pieces.length);
    while (stack.length) {
      const u = stack.pop();
      dots.push(u);
      for (const v of treeNeighbours(u)) if (region.has(v) && !blocked.has(v) && !pieceOf.has(v)) { pieceOf.set(v, pieces.length); stack.push(v); }
    }
    pieces.push({dots, forever: dots.some(u => !H.has(u))});
  }
  for (const d of extra) {
    if (pieceOf.has(d) || blocked.has(d)) continue;
    let u = d;
    while (!region.has(u)) u = parentOf(u);
    pieceOf.set(d, pieceOf.get(u));
  }
  return {pieces, pieceOf};
}
const treeOrder = (u, v) => depthOf(u) - depthOf(v) || (u < v ? -1 : u > v ? 1 : 0);

// --- Maps in common -------------------------------------------------------------
export const isDot = (m, d) => {
  if (m.kind === 'tree') return treeIsDot(d);
  if (typeof d !== 'string' || !FLAT_DOT.test(d)) return false;
  const [x, y] = xyOf(d);
  return keyOf(x, y) === d && flatHas(m, x, y);
};
export const neighbours = (m, d) => m.kind === 'tree' ? treeNeighbours(d) : flatNeighbours(m, d);
const flatOrder = (u, v) => { const [a, b] = xyOf(u), [c, d] = xyOf(v); return b - d || a - c; };
export const sortDots = (m, list) => [...list].sort(m.kind === 'tree' ? treeOrder : flatOrder);
export const distance = (m, u, v) => { if (m.kind === 'tree') return treeDistance(u, v); const [a, b] = xyOf(u), [c, d] = xyOf(v); return Math.abs(a - c) + Math.abs(b - d); };
export function piecesOf(m, blocks, extra) { return m.kind === 'tree' ? treePieces(blocks, extra) : flatPieces(m, blocks, extra); }
export function counts(m, blocks) {
  const {pieces} = piecesOf(m, blocks);
  const forever = pieces.filter(p => p.forever).length;
  return {forever, trapped: pieces.length - forever};
}
export const endsOf = m => m.kind === 'tree' ? Infinity : flatEnds(m);
export const meets = (goal, c) => (goal.forever === undefined || c.forever === goal.forever) && (goal.trapped === undefined || c.trapped === goal.trapped);
// A goal no blocks can reach: more forever pieces than the map has ends, or,
// on the tree, more than 2m + 1 with m blocks.
export function impossible(q) {
  if (q.mode !== 'goal' || q.goal.forever === undefined) return false;
  return q.map.kind === 'tree' ? q.goal.forever > 2 * q.budget + 1 : q.goal.forever > endsOf(q.map);
}

// --- Boards ---------------------------------------------------------------------
// goal: {blocks, shown}   playground: {map, blocks, shown}
// `blocks` lists the blocked dots in reading order (the tree: by depth). `shown`
// is null, 'pieces' after Check (kept until a change), 'can' after a Can't
// that is wrong (the goal can be reached) and 'cant' after one that is right.
// Can't answers only after a Check with at least one block, so its box is
// drawn round blocks the child has just tried.
const canCant = b => b.shown === 'pieces' && b.blocks.length > 0;
const mapFor = (p, b) => p.parameters.mode === 'playground' ? p.parameters.maps[b.map] : p.parameters.map;
const capOf = p => p.parameters.mode === 'playground' ? PLAY_CAP : p.parameters.budget;
function fresh(p) {
  const q = p.parameters;
  return q.mode === 'playground' ? {map: Object.keys(q.maps)[0], blocks: [], shown: null} : {blocks: [], shown: null};
}
function valid(p, b) {
  const q = p.parameters, play = q.mode === 'playground';
  if (!object(b) || Object.keys(b).sort().join() !== (play ? 'blocks,map,shown' : 'blocks,shown')) return false;
  if (play && (typeof b.map !== 'string' || !Object.hasOwn(q.maps, b.map))) return false;
  const m = mapFor(p, b);
  if (!Array.isArray(b.blocks) || b.blocks.length > capOf(p) || !b.blocks.every(d => isDot(m, d))) return false;
  if (new Set(b.blocks).size !== b.blocks.length || sortDots(m, b.blocks).some((d, i) => d !== b.blocks[i])) return false;
  if (!SHOWN.includes(b.shown)) return false;
  if (play) return b.shown === null || b.shown === 'pieces';
  if (b.shown === 'cant') return b.blocks.length > 0 && impossible(q);
  if (b.shown === 'can') return b.blocks.length > 0 && !impossible(q);
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode !== 'goal' || !valid(p, b)) return false;
  if (b.shown === 'cant') return true;
  return b.shown === 'pieces' && meets(q.goal, counts(q.map, b.blocks));
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const m = mapFor(p, b);
  if (action.type === 'block' || action.type === 'unblock') {
    const d = action.dot, has = b.blocks.includes(d);
    if (!isDot(m, d)) return null;
    if (action.type === 'block' && (has || b.blocks.length >= capOf(p))) return null;
    if (action.type === 'unblock' && !has) return null;
    return {...b, blocks: action.type === 'block' ? sortDots(m, [...b.blocks, d]) : b.blocks.filter(x => x !== d), shown: null};
  }
  // Check and Can't wait for a change before they answer again.
  if (action.type === 'check') return b.shown === 'pieces' ? null : {...b, shown: 'pieces'};
  if (action.type === 'cant') return q.mode !== 'goal' || !canCant(b) ? null : {...b, shown: impossible(q) ? 'cant' : 'can'};
  if (action.type === 'map' && q.mode === 'playground') {
    return typeof action.map === 'string' && Object.hasOwn(q.maps, action.map) && action.map !== b.map ? {map: action.map, blocks: [], shown: null} : null;
  }
  return null;
}

// --- Hints ----------------------------------------------------------------------
// Flat maps: the solution closest to the blocks, among the pack's solutions and
// their copies moved along the map (along rows on the line, ladder and strip,
// anywhere on the grid; the T has no moves). Take off a block that is not in
// it, then block a dot it needs, then Check. Each step brings the blocks one
// closer to some solution, so hints always finish.
function translates(m, pattern, blocks) {
  const shift = shiftOf(m), out = [pattern];
  if (!shift) return out;
  for (const b of blocks) for (const d of pattern) {
    const [bx, by] = xyOf(b), [px, py] = xyOf(d), tx = bx - px, ty = by - py;
    if ((tx || ty) && (shift === 'xy' || ty === 0)) out.push(pattern.map(u => { const [x, y] = xyOf(u); return keyOf(x + tx, y + ty); }));
  }
  return out;
}
// Copies along rows when every band runs both ways across, anywhere when the
// map is the whole grid.
export const shiftOf = m => m.kind !== 'flat' || !m.bands.every(b => b.x[0] === null && b.x[1] === null) ? null : m.bands.every(b => b.y[0] === null && b.y[1] === null) ? 'xy' : 'x';
export function nearestSolution(q, blocks) {
  const have = new Set(blocks);
  let best = null, cost = Infinity;
  for (const pattern of q.patterns) for (const w of translates(q.map, pattern, blocks)) {
    const c = blocks.filter(d => !w.includes(d)).length + w.filter(d => !have.has(d)).length;
    if (c < cost) { best = w; cost = c; }
  }
  return best;
}
const DIRS = [['right', 'left'], ['down', 'up']];
function steps(n, dir) { return `${n === 1 ? 'one step' : `${say(n)} steps`} ${dir}`; }
function flatWhere(m, d, blocks) {
  const [x, y] = xyOf(d);
  const near = sortDots(m, blocks).reduce((best, b) => !best || distance(m, b, d) < distance(m, best, d) ? b : best, null);
  const [bx, by] = xyOf(near), dx = x - bx, dy = y - by;
  const parts = [dx ? steps(Math.abs(dx), DIRS[0][dx > 0 ? 0 : 1]) : '', dy ? steps(Math.abs(dy), DIRS[1][dy > 0 ? 0 : 1]) : ''].filter(Boolean);
  return `${parts.join(' and ')} ${dx && !dy ? 'of' : 'from'} a block`;
}
function flatStep(p, blocks) {
  const q = p.parameters, m = q.map, w = nearestSolution(q, blocks);
  const extra = blocks.find(d => !w.includes(d));
  if (extra !== undefined) return {action: {type: 'unblock', dot: extra}, text: 'Take a block off.'};
  const missing = sortDots(m, w.filter(d => !blocks.includes(d)));
  if (!missing.length) return null;
  // Block next to a block first, so the words can say where; the first block
  // nearest the start, where the map opens.
  const from = blocks.length ? blocks : [keyOf(...m.start)];
  const add = missing.reduce((best, d) => Math.min(...from.map(b => distance(m, b, d))) < Math.min(...from.map(b => distance(m, b, best))) ? d : best);
  return {action: {type: 'block', dot: add}, text: blocks.length ? `Block the dot ${flatWhere(m, add, blocks)}.` : p.hints[1]};
}
// The tree: no two blocks may touch and nothing may be trapped; then each block
// adds two forever pieces. Take off a block that breaks this, or block the
// first dot (nearest the centre) that keeps it, then Check.
function goodAdd(blocks) {
  const set = new Set(blocks), queue = ['o'], seen = new Set(queue);
  for (let k = 0; k < queue.length; k++) {
    const d = queue[k];
    if (!set.has(d) && !treeNeighbours(d).some(n => set.has(n)) && treePieces([...blocks, d]).pieces.every(pc => pc.forever)) return d;
    for (const n of treeNeighbours(d)) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }
  return null;
}
const deepest = list => list.reduce((best, d) => treeOrder(d, best) > 0 ? d : best);
function treeStep(p, blocks) {
  const q = p.parameters, set = new Set(blocks);
  const touching = blocks.filter(d => treeNeighbours(d).some(n => set.has(n)));
  if (touching.length) { const d = deepest(touching); return {action: {type: 'unblock', dot: d}, text: 'Two blocks touch. Take one off.'}; }
  const trapped = treePieces(blocks).pieces.find(pc => !pc.forever);
  if (trapped) {
    const d = deepest(blocks.filter(b => treeNeighbours(b).some(n => trapped.dots.includes(n))));
    return {action: {type: 'unblock', dot: d}, text: 'A piece is trapped. Take off a block next to it.'};
  }
  if (blocks.length >= q.budget) return null;
  const d = goodAdd(blocks), near = blocks.length ? Math.min(...blocks.map(b => treeDistance(b, d))) : 0;
  return {action: {type: 'block', dot: d}, text: !blocks.length ? (d === 'o' ? 'Block the centre dot.' : p.hints[1]) : `Block a dot ${say(near)} roads from a block.`};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode !== 'goal' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  // A goal no blocks can reach: first a try (the pack's `trial` blocks, unless
  // the child has blocked elsewhere) and a Check with the authored reason, and
  // only then Can't.
  if (impossible(q)) {
    const trial = q.trial || [startDot(q.map)], next = trial.find(d => !b.blocks.includes(d));
    if (!b.blocks.length || (b.shown !== 'pieces' && next && b.blocks.length < q.budget && b.blocks.every(d => trial.includes(d)))) {
      return {type: 'move', action: {type: 'block', dot: next}, text: !b.blocks.length ? p.hints[0] : q.map.kind === 'flat' ? `Block the dot ${flatWhere(q.map, next, b.blocks)}.` : 'Block the marked dot.'};
    }
    if (b.shown !== 'pieces') return {type: 'move', action: {type: 'check'}, text: p.hints[1]};
    return {type: 'move', action: {type: 'cant'}, text: p.hints[2]};
  }
  const step = q.map.kind === 'tree' ? treeStep(p, b.blocks) : flatStep(p, b.blocks);
  return step ? {type: 'move', ...step} : {type: 'move', action: {type: 'check'}, text: 'Press Check.'};
}

// --- The disk -------------------------------------------------------------------
// Isometries of the Poincaré disk as z ↦ (a z + b) / (b̄ z + ā), with |a|² − |b|² = 1.
const cmul = (u, v) => [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]];
const cadd = (u, v) => [u[0] + v[0], u[1] + v[1]];
const cbar = u => [u[0], -u[1]];
const cdiv = (u, v) => { const n = v[0] * v[0] + v[1] * v[1]; return [(u[0] * v[0] + u[1] * v[1]) / n, (u[1] * v[0] - u[0] * v[1]) / n]; };
export const IDENTITY = {a: [1, 0], b: [0, 0]};
export const compose = (M, N) => ({a: cadd(cmul(M.a, N.a), cmul(M.b, cbar(N.b))), b: cadd(cmul(M.a, N.b), cmul(M.b, cbar(N.a)))});
export const image = (M, z) => cdiv(cadd(cmul(M.a, z), M.b), cadd(cmul(cbar(M.b), z), cbar(M.a)));
const turn = t => ({a: [Math.cos(t / 2), Math.sin(t / 2)], b: [0, 0]});
const push = L => ({a: [Math.cosh(L / 2), 0], b: [Math.sinh(L / 2), 0]});
// The translation taking 0 to z, along the diameter through z.
export const toward = z => { const s = 1 / Math.sqrt(1 - z[0] * z[0] - z[1] * z[1]); return {a: [s, 0], b: [z[0] * s, z[1] * s]}; };
const normal = M => { const s = Math.sqrt(M.a[0] ** 2 + M.a[1] ** 2 - M.b[0] ** 2 - M.b[1] ** 2); return {a: [M.a[0] / s, M.a[1] / s], b: [M.b[0] / s, M.b[1] / s]}; };
// Edge length ln 3 makes the {∞, 3} tiling: the tree with all angles 120°.
export const EDGE = Math.log(3);
const ANGLE = {a: -Math.PI / 2, b: Math.PI / 6, c: 5 * Math.PI / 6};
// From a dot's frame to its neighbour along road x: out along x, then turned
// so that road x points back along the way it came.
export const STEP = Object.fromEntries([...'abc'].map(x => [x, compose(compose(turn(ANGLE[x]), push(EDGE)), turn(Math.PI - ANGLE[x]))]));
const norm2 = z => z[0] * z[0] + z[1] * z[1];
// A view is the dot drawn nearest the middle and the frame it is drawn with.
// After a pan the view moves to whichever neighbour is nearer the middle, so
// the frame never holds a long product.
export function settle(view) {
  let {focus, frame} = view;
  frame = normal(frame);
  for (let guard = 0; guard < 64; guard++) {
    const here = norm2(image(frame, [0, 0]));
    const next = treeNeighbours(focus).map(n => ({n, frame: compose(frame, STEP[labelTo(focus, n)])})).find(c => norm2(image(c.frame, [0, 0])) < here - 1e-12);
    if (!next) break;
    focus = next.n; frame = normal(next.frame);
  }
  return {focus, frame};
}
const conf = z => 1 - norm2(z);
// Dots and roads to draw: out from the focus while dots are still visible.
export function diskLayout(view, limit = 0.02) {
  const {focus, frame} = settle(view), dots = new Map([[focus, {frame, z: image(frame, [0, 0])}]]), roads = [], queue = [focus];
  for (let k = 0; k < queue.length; k++) {
    const d = queue[k], at = dots.get(d);
    if (conf(at.z) < limit) continue;
    for (const n of treeNeighbours(d)) {
      if (dots.has(n)) continue;
      const fr = compose(at.frame, STEP[labelTo(d, n)]);
      dots.set(n, {frame: fr, z: image(fr, [0, 0])});
      roads.push([d, n]);
      queue.push(n);
    }
  }
  return {dots, roads, focus};
}
// The geodesic between two points: an arc of a circle meeting the rim at right angles.
function geodesic(p, q) {
  const P = z => `${f(100 * z[0])} ${f(100 * z[1])}`, det = p[0] * q[1] - p[1] * q[0];
  if (Math.abs(det) < 1e-5) return `M${P(p)}L${P(q)}`;
  const sp = (norm2(p) + 1) / 2, sq = (norm2(q) + 1) / 2, cx = (sp * q[1] - sq * p[1]) / det, cy = (p[0] * sq - q[0] * sp) / det;
  const r = Math.sqrt(Math.max(cx * cx + cy * cy - 1, 1e-9)), sweep = (p[0] - cx) * (q[1] - cy) - (p[1] - cy) * (q[0] - cx) > 0 ? 1 : 0;
  return `M${P(p)}A${f(100 * r)} ${f(100 * r)} 0 0 ${sweep} ${P(q)}`;
}

// --- View state -----------------------------------------------------------------
// Where the map is panned and which dot has the keyboard, kept outside the save.
const uiState = new Map();
const mapKey = (p, b) => p.parameters.mode === 'playground' ? b.map : 'map';
// The view of the map on screen; the playground keeps one per map. `ui` acts
// on the one drawn last.
function viewOf(p, b) {
  if (!uiState.has(p.id)) uiState.set(p.id, {maps: {}, current: null});
  const all = uiState.get(p.id), k = mapKey(p, b), m = mapFor(p, b);
  if (!all.maps[k]) all.maps[k] = {map: m, view: startView(m), cursor: startDot(m)};
  all.current = k;
  return all.maps[k];
}
const finite = (...n) => n.every(Number.isFinite);
const validView = (m, v) => object(v) && (m.kind === 'tree' ? treeIsDot(v.focus) && object(v.frame) && Array.isArray(v.frame.a) && Array.isArray(v.frame.b) && finite(...v.frame.a, ...v.frame.b) : finite(v.cx, v.cy) && (v.z === undefined || (finite(v.z) && v.z >= 1 && v.z <= 8)));
export const startView = m => m.kind === 'tree' ? {focus: 'o', frame: IDENTITY} : {cx: m.view.cx, cy: m.view.cy};
export const startDot = m => m.kind === 'tree' ? 'o' : keyOf(...m.start);
// The visible part of a flat map, and the part drawn round it so a drag shows
// dots before the board is redrawn. A view may be zoomed out (z > 1) to show a
// certificate whole.
const sizeOf = (m, v) => [m.view.w * (v.z || 1), m.view.h * (v.z || 1)];
const shown = (m, v) => { const [w, h] = sizeOf(m, v); return {x: [v.cx - w / 2, v.cx + w / 2], y: [v.cy - h / 2, v.cy + h / 2]}; };
const drawn = (m, v) => { const s = shown(m, v), [w, h] = sizeOf(m, v), mx = m.pan === 'xy' ? Math.ceil(w / 2) : w, my = m.pan === 'xy' ? Math.ceil(h / 2) : 1; return {x: [Math.floor(s.x[0] - mx), Math.ceil(s.x[1] + mx)], y: [Math.floor(s.y[0] - my), Math.ceil(s.y[1] + my)]}; };
const seen = (m, v, d) => { const [x, y] = xyOf(d), s = shown(m, v); return x >= s.x[0] + 0.3 && x <= s.x[1] - 0.3 && y >= s.y[0] + 0.3 && y <= s.y[1] - 0.3; };
// The T's view never rises above where it starts; the strips only slide across.
function clampView(m, v) {
  const z = v.z && v.z > 1 ? {z: v.z} : {};
  if (m.pan !== 'xy') return {cx: v.cx, cy: m.view.cy, ...z};
  const lowest = m.view.minY === undefined ? -Infinity : m.view.minY + m.view.h * ((v.z || 1) - 1) / 2;
  return {cx: v.cx, cy: Math.max(lowest, v.cy), ...z};
}
// Pan a flat view just enough to show a dot.
function showDot(m, v, d) {
  if (seen(m, v, d)) return v;
  const [x, y] = xyOf(d), s = shown(m, v), [w, h] = sizeOf(m, v);
  const cx = x < s.x[0] + 0.3 ? x - 0.7 + w / 2 : x > s.x[1] - 0.3 ? x + 0.7 - w / 2 : v.cx;
  const cy = y < s.y[0] + 0.3 ? y - 0.7 + h / 2 : y > s.y[1] - 0.3 ? y + 0.7 - h / 2 : v.cy;
  return clampView(m, {...v, cx, cy});
}
// A view of a certificate: the box, the ring of dots round it and a little
// paper, zoomed out only as far as that needs.
function fitBox(m, B) {
  const R = grow(B), w = R.x[1] - R.x[0] + 1.4, h = m.pan === 'xy' ? R.y[1] - R.y[0] + 1.4 : 0;
  const z = Math.min(8, Math.max(1, w / m.view.w, h / m.view.h));
  return clampView(m, {cx: (R.x[0] + R.x[1]) / 2, cy: m.pan === 'xy' ? (R.y[0] + R.y[1]) / 2 : m.view.cy, z});
}
// Bring a tree dot to the middle of the disk.
function centreOn(view, d) {
  const {dots} = diskLayout(view, 0.002);
  const at = dots.get(d);
  if (!at) {
    // Far away: rebuild the view from the dot itself.
    return {focus: d, frame: IDENTITY};
  }
  return settle({focus: view.focus, frame: compose(toward([-at.z[0], -at.z[1]]), settle(view).frame)});
}

// --- Drawing --------------------------------------------------------------------
const PALETTE = 6;
// Colours for forever pieces: pieces that share a block get different ones.
function colours(m, pieces, pieceOf, blocks) {
  const touch = pieces.map(() => new Set());
  for (const b of blocks) {
    const near = [...new Set(neighbours(m, b).map(n => pieceOf.get(n)).filter(i => i !== undefined && pieces[i].forever))];
    for (const i of near) for (const j of near) if (i !== j) touch[i].add(j);
  }
  // Each piece its own colour while the palette lasts; after that, one that no
  // piece across a block from it has.
  const out = new Map();
  let n = 0;
  pieces.forEach((pc, i) => {
    if (!pc.forever) return;
    const used = new Set([...touch[i]].map(j => out.get(j)));
    let c = n++ % PALETTE;
    for (let k = 0; k < PALETTE && used.has(c); k++) c = (c + 1) % PALETTE;
    out.set(i, c);
  });
  return out;
}
function dotLabel(m, d) {
  if (m.kind === 'tree') return d === 'o' ? 'Centre dot' : `Dot ${say(depthOf(d))} ${depthOf(d) === 1 ? 'road' : 'roads'} from the centre, by roads ${[...d].join(' ')}`;
  const [x, y] = xyOf(d), [sx, sy] = m.start, dx = x - sx, dy = y - sy;
  const parts = [dx ? `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}` : '', dy ? `${Math.abs(dy)} ${dy > 0 ? 'down' : 'up'}` : ''].filter(Boolean);
  return parts.length ? `Dot ${parts.join(', ')} from the start` : 'Start dot';
}
// What every drawn dot shows: blocked, the piece it is in, the certificate.
function paint(p, b, view, extra) {
  const q = p.parameters, m = mapFor(p, b), done = solved(p, b);
  const reveal = b.shown === 'pieces', cert = b.shown === 'cant';
  const out = {piece: new Map(), colour: new Map(), trapped: new Set(), outside: null, box: null, labels: new Map()};
  if (reveal) {
    const {pieces, pieceOf} = piecesOf(m, b.blocks, extra);
    const col = colours(m, pieces, pieceOf, b.blocks);
    let n = 0;
    const number = new Map();
    pieces.forEach((pc, i) => { if (pc.forever) number.set(i, ++n); });
    for (const [d, i] of pieceOf) {
      if (pieces[i].forever) { out.colour.set(d, col.get(i)); out.labels.set(d, `forever piece ${number.get(i)}`); } else { out.trapped.add(d); out.labels.set(d, 'trapped'); }
      out.piece.set(d, i);
    }
  }
  if (cert && m.kind === 'flat') {
    out.box = boxOf(m, b.blocks);
    const {pieces, pieceOf} = outsidePieces(m, out.box, extra);
    for (const [d, i] of pieceOf) { out.colour.set(d, i % PALETTE); out.piece.set(d, i); out.labels.set(d, `outside the box, piece ${i + 1}`); }
    out.outside = pieces.length;
  }
  out.done = done;
  return out;
}
const rect = r => ({x: [r.x[0], r.x[1]], y: [r.y[0], r.y[1]]});

function flatInner(p, b, view, ctx) {
  const m = mapFor(p, b), R = drawn(m, view), blocked = new Set(b.blocks);
  const dots = [];
  for (let y = R.y[0]; y <= R.y[1]; y++) for (let x = R.x[0]; x <= R.x[1]; x++) if (flatHas(m, x, y)) dots.push(keyOf(x, y));
  const look = paint(p, b, view, rect(R));
  const roadCls = (u, v) => {
    if (blocked.has(u) || blocked.has(v)) return null;
    if (look.colour.has(u) && look.piece.get(u) === look.piece.get(v) && look.colour.has(v)) return `ends-road ends-on ends-c${look.colour.get(u)}`;
    if (look.trapped.has(u)) return 'ends-road trap';
    return 'ends-road';
  };
  let roads = '';
  for (const d of dots) {
    const [x, y] = xyOf(d);
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (!flatHas(m, x + dx, y + dy)) continue;
      const cls = roadCls(d, keyOf(x + dx, y + dy));
      if (cls) roads += `<line class="${cls}" x1="${x}" y1="${y}" x2="${x + dx}" y2="${y + dy}"/>`;
    }
  }
  let over = '', under = `<rect class="ends-paper" x="${R.x[0] - 1}" y="${R.y[0] - 1}" width="${R.x[1] - R.x[0] + 2}" height="${R.y[1] - R.y[0] + 2}"/>`;
  if (look.box) {
    const B = look.box;
    under += `<rect class="ends-box" x="${B.x[0] - 0.42}" y="${B.y[0] - 0.42}" width="${B.x[1] - B.x[0] + 0.84}" height="${B.y[1] - B.y[0] + 0.84}" rx="0.18"/>`;
    // The ring road just outside the box, where the map has one.
    const ring = [];
    for (let x = B.x[0] - 1; x <= B.x[1] + 1; x++) ring.push([x, B.y[0] - 1]);
    for (let y = B.y[0]; y <= B.y[1] + 1; y++) ring.push([B.x[1] + 1, y]);
    for (let x = B.x[1]; x >= B.x[0] - 1; x--) ring.push([x, B.y[1] + 1]);
    for (let y = B.y[1]; y >= B.y[0]; y--) ring.push([B.x[0] - 1, y]);
    if (ring.every(([x, y]) => flatHas(m, x, y))) over = `<path class="ends-ring" d="M${ring.map(([x, y]) => `${x} ${y}`).join('L')}Z"/>`;
  }
  const hinted = ctx.hintDot, cursor = ctx.cursor;
  const nodes = dots.map(d => {
    const [x, y] = xyOf(d), isBlocked = blocked.has(d), vis = seen(m, view, d);
    const cls = ['ends-dot', isBlocked ? 'blocked' : '', look.colour.has(d) ? `ends-on ends-c${look.colour.get(d)}` : '', look.trapped.has(d) ? 'trap' : '', d === hinted ? 'hinted' : '', d === cursor && ctx.active ? 'cursor' : ''].filter(Boolean).join(' ');
    const label = `${dotLabel(m, d)}${isBlocked ? ', blocked' : ''}${look.labels.has(d) ? `, ${look.labels.get(d)}` : ''}`;
    const role = vis && ctx.active ? `role="button" tabindex="${d === cursor ? 0 : -1}" aria-label="${esc(label)}"${d === cursor ? ' data-focus="ends-cursor"' : ''}` : 'aria-hidden="true"';
    const mark = isBlocked ? `<circle class="ends-stone" r="0.3"/><circle class="ends-stone-ring" r="0.19"/>` : `<circle class="ends-pip" r="0.16"/>`;
    return `<g class="${cls}" data-dot="${d}" transform="translate(${x} ${y})" ${role}><circle class="ends-hit" r="0.48"/>${mark}</g>`;
  }).join('');
  return `${under}${roads}${over}${nodes}`;
}
function flatSvg(p, b, view, ctx) {
  const m = mapFor(p, b), s = shown(m, view);
  const [w, h] = sizeOf(m, view);
  return `<svg class="ends-board ends-flat" viewBox="${f(s.x[0])} ${f(s.y[0])} ${f(w)} ${f(h)}" role="group" aria-label="${esc(m.name)}, going on forever. Drag to look around." data-ends-board>${flatInner(p, b, view, ctx)}</svg>`;
}

// Tree dots big enough to tap are controls; the rest are pictures.
const TAP = 0.3;
export const treeTargets = new Map();
function treeInner(p, b, view, ctx) {
  const m = mapFor(p, b), blocked = new Set(b.blocks), {dots, roads} = diskLayout(view);
  const look = paint(p, b, view, [...dots.keys()]);
  const targets = [];
  let paths = '';
  for (const [u, v] of roads) {
    if (blocked.has(u) || blocked.has(v)) continue;
    const zu = dots.get(u).z, zv = dots.get(v).z, mid = conf([(zu[0] + zv[0]) / 2, (zu[1] + zv[1]) / 2]);
    const cls = look.colour.has(u) && look.colour.has(v) && look.piece.get(u) === look.piece.get(v) ? ` ends-on ends-c${look.colour.get(u)}` : look.trapped.has(u) && look.trapped.has(v) ? ' trap' : '';
    paths += `<path class="ends-road${cls}" style="stroke-width:${f(Math.max(0.5, (cls ? 6 : 3) * mid))}px" d="${geodesic(zu, zv)}"/>`;
  }
  const nodes = [...dots.entries()].sort(([, a], [, c]) => norm2(c.z) - norm2(a.z)).map(([d, {z}]) => {
    const k = conf(z), isBlocked = blocked.has(d), control = k >= TAP && ctx.active;
    if (k < 0.03 && !isBlocked) return '';
    const x = f(100 * z[0]), y = f(100 * z[1]);
    if (control) targets.push({d, x: 100 * z[0], y: 100 * z[1], r: 16 * k});
    const cls = ['ends-dot', isBlocked ? 'blocked' : '', look.colour.has(d) ? `ends-on ends-c${look.colour.get(d)}` : '', look.trapped.has(d) ? 'trap' : '', d === ctx.hintDot ? 'hinted' : '', d === ctx.cursor && control ? 'cursor' : ''].filter(Boolean).join(' ');
    const label = `${dotLabel(m, d)}${isBlocked ? ', blocked' : ''}${look.labels.has(d) ? `, ${look.labels.get(d)}` : ''}`;
    const role = control ? `role="button" tabindex="${d === ctx.cursor ? 0 : -1}" aria-label="${esc(label)}"${d === ctx.cursor ? ' data-focus="ends-cursor"' : ''}` : 'aria-hidden="true"';
    const mark = isBlocked ? `<circle class="ends-stone" r="${f(11 * k)}"/><circle class="ends-stone-ring" r="${f(7 * k)}"/>` : `<circle class="ends-pip" r="${f(7.5 * k)}"/>`;
    return `<g class="${cls}" data-dot="${d}" transform="translate(${x} ${y})" ${role}>${control ? `<circle class="ends-hit" r="${f(16 * k)}"/>` : ''}${mark}</g>`;
  }).join('');
  treeTargets.set(p.id, targets);
  return `<circle class="ends-rim" r="100"/>${paths}${nodes}`;
}
function treeSvg(p, b, view, ctx) {
  return `<svg class="ends-board ends-tree" viewBox="-103 -103 206 206" role="group" aria-label="Tree where every dot has three roads, going on forever. Drag to look around." data-ends-board>${treeInner(p, b, view, ctx)}</svg>`;
}

// Small pictures of the maps for the playground's buttons.
function mapIcon(m) {
  if (m.kind === 'tree') {
    const {dots, roads} = diskLayout({focus: 'o', frame: IDENTITY}, 0.12);
    return `<svg class="ends-icon" viewBox="-104 -104 208 208" aria-hidden="true"><circle class="ends-icon-rim" r="100"/>${roads.map(([u, v]) => `<path class="ends-icon-road" d="${geodesic(dots.get(u).z, dots.get(v).z)}"/>`).join('')}</svg>`;
  }
  const xs = [-2, 3], ys = m.pan === 'xy' ? [m.view.cy - 2, m.view.cy + 2] : [Math.min(...m.bands.map(b => b.y[0])), Math.max(...m.bands.map(b => b.y[1]))];
  const lines = [];
  for (let y = Math.floor(ys[0]); y <= ys[1]; y++) for (let x = xs[0]; x <= xs[1]; x++) {
    if (!flatHas(m, x, y)) continue;
    if (flatHas(m, x + 1, y) && x < xs[1]) lines.push(`M${x} ${y}h1`);
    if (flatHas(m, x, y + 1) && y + 1 <= ys[1]) lines.push(`M${x} ${y}v1`);
  }
  const h = Math.max(ys[1] - ys[0], 0);
  return `<svg class="ends-icon" viewBox="${xs[0] - 0.6} ${f(ys[0] - 0.6 - (4 - h) / 2)} 6.2 5.2" aria-hidden="true"><path class="ends-icon-road" d="${lines.join('')}"/></svg>`;
}

const button = (label, action, cls, enabled, hinted, extra = '') => `<button type="button" class="secondary ends-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="ends-${action.type}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;
function render(p, a, ctx = {}) {
  const q = p.parameters, b = a.board, m = mapFor(p, b), done = solved(p, b), play = q.mode === 'playground';
  const state = viewOf(p, b), h = !play && a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.action;
  const hintDot = act && (act.type === 'block' || act.type === 'unblock') ? act.dot : null;
  // Keep the keyboard's dot and a marked dot in sight; show a certificate whole,
  // once, and go back to the usual size after it.
  if (m.kind === 'flat') {
    const cert = b.shown === 'cant' ? b.blocks.join(' ') : null;
    if (cert !== null && state.cert !== cert) state.view = fitBox(m, boxOf(m, b.blocks));
    if (cert === null && state.view.z) state.view = clampView(m, {cx: state.view.cx, cy: state.view.cy});
    state.cert = cert;
    if (hintDot) state.view = showDot(m, state.view, hintDot);
    if (!seen(m, state.view, state.cursor) || !isDot(m, state.cursor)) state.cursor = nearestShown(m, state.view);
  } else {
    if (hintDot && !diskVisible(state.view, hintDot)) state.view = centreOn(state.view, hintDot);
    if (!diskVisible(state.view, state.cursor)) state.cursor = settle(state.view).focus;
  }
  const view = {active: !done, cursor: state.cursor, hintDot};
  const board = m.kind === 'tree' ? treeSvg(p, b, state.view, view) : flatSvg(p, b, state.view, view);
  const used = b.blocks.length, cap = capOf(p);
  const slots = play ? '' : `<span class="ends-slots" role="img" aria-label="${used} of ${cap} ${cap === 1 ? 'block' : 'blocks'} used">${Array.from({length: cap}, (_, k) => `<i class="${k < used ? 'ends-used' : ''}"></i>`).join('')}</span>`;
  const check = button('Check', {type: 'check'}, 'ends-check', b.shown !== 'pieces', act?.type === 'check');
  const cant = play ? '' : button('Can’t', {type: 'cant'}, 'ends-cant', canCant(b), act?.type === 'cant');
  const maps = play ? `<div class="ends-maps" role="group" aria-label="Map">${Object.entries(q.maps).map(([id, mm]) => `<button type="button" class="secondary ends-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'map', map: id}))}" data-focus="ends-map-${id}" aria-pressed="${b.map === id}" aria-label="${esc(mm.name)}">${mapIcon(mm)}</button>`).join('')}</div>` : '';
  const bar = done ? '' : `<div class="ends-bar">${slots}${check}${cant}</div>`;
  // Back to the start, once the map has been dragged away from it.
  const home = away(m, state.view) ? `<button type="button" class="ends-home" data-action="mechanic-ui" data-ui='{"home":true}' data-focus="ends-home" aria-label="Back to the start"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/></svg></button>` : '';
  const c = b.shown === 'pieces' ? counts(m, b.blocks) : null;
  const ends = b.shown === 'cant' && m.kind === 'flat' ? outsidePieces(m, boxOf(m, b.blocks)).pieces.length : null;
  const told = c ? `${c.forever} forever ${c.forever === 1 ? 'piece' : 'pieces'}${c.trapped ? `, ${c.trapped} trapped` : ''}.` : b.shown === 'can' ? 'It can be done.' : ends !== null ? `Outside the box: ${ends} ${ends === 1 ? 'piece' : 'pieces'}.` : '';
  const status = `${play ? `${used} blocked` : `${used} of ${cap} blocks used`}.${told ? ` ${told}` : ''}`;
  return `<div class="ends-puzzle${done ? ' solved' : ''}" data-mechanic-wire="ends">${maps}${bar}<div class="ends-stage${m.kind === 'tree' ? ' disk' : ''}"><div class="ends-frame">${board}</div>${home}</div>${told ? `<p class="ends-told">${esc(told)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const away = (m, v) => m.kind === 'tree' ? v.focus !== 'o' || norm2(image(v.frame, [0, 0])) > 0.01 : Math.abs(v.cx - m.view.cx) > 0.5 || Math.abs(v.cy - m.view.cy) > 0.5 || (v.z || 1) > 1;
function nearestShown(m, v) {
  const s = shown(m, v);
  let best = null, score = Infinity;
  for (let y = Math.ceil(s.y[0] + 0.3); y <= s.y[1] - 0.3; y++) for (let x = Math.ceil(s.x[0] + 0.3); x <= s.x[1] - 0.3; x++) {
    if (!flatHas(m, x, y)) continue;
    const c = Math.hypot(x - v.cx, y - v.cy);
    if (c < score) { best = keyOf(x, y); score = c; }
  }
  return best || keyOf(Math.round(v.cx), Math.round(v.cy));
}
function diskVisible(view, d) {
  const at = diskLayout(view).dots.get(d);
  return Boolean(at) && conf(at.z) >= TAP;
}

// --- Taps, drags and keys -------------------------------------------------------
// A press that moves less than a few pixels is a tap on the dot under it; a
// longer one pans the map. Pans redraw the board in place while the finger
// moves and are kept in view state when it lifts.
let drag = null, listening = false, lastPress = 0;
const SLOP = 7;
function svgPoint(svg, e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function dotAt(p, b, svg, e) {
  const m = mapFor(p, b), {x, y} = svgPoint(svg, e);
  if (m.kind === 'flat') {
    const gx = Math.round(x), gy = Math.round(y);
    return flatHas(m, gx, gy) && Math.hypot(x - gx, y - gy) <= 0.5 ? keyOf(gx, gy) : null;
  }
  // The nearest tappable dot, within twice its drawn reach: small dots near
  // the rim still get a target a finger can hit.
  let best = null, score = Infinity;
  for (const t of treeTargets.get(p.id) || []) { const s = Math.hypot(t.x - x, t.y - y); if (s <= Math.max(2 * t.r, 6) && s < score) { best = t.d; score = s; } }
  return best;
}
const toggle = (b, d) => ({type: b.blocks.includes(d) ? 'unblock' : 'block', dot: d});
function pan(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < SLOP) return;
  if (!drag.moved) { drag.moved = true; try { drag.svg.setPointerCapture(e.pointerId); } catch { /* the pointer may already be gone */ } drag.svg.classList.add('panning'); }
  const {p, b, m, svg} = drag;
  if (m.kind === 'flat') {
    const [w, h] = sizeOf(m, drag.start), scale = w / svg.getBoundingClientRect().width;
    drag.view = clampView(m, {...drag.start, cx: drag.start.cx - dx * scale, cy: drag.start.cy - (m.pan === 'xy' ? dy * scale : 0)});
    const s = shown(m, drag.view);
    svg.setAttribute('viewBox', `${f(s.x[0])} ${f(s.y[0])} ${f(w)} ${f(h)}`);
    // Redraw round the new middle once the drag nears the edge of what was drawn.
    if (Math.abs(drag.view.cx - drag.drawnAt.cx) > w * (m.pan === 'xy' ? 0.3 : 0.6) || Math.abs(drag.view.cy - drag.drawnAt.cy) > h * 0.3) {
      svg.innerHTML = flatInner(p, b, drag.view, {active: false});
      drag.drawnAt = drag.view;
    }
  } else {
    const box = svg.getBoundingClientRect(), r = box.width / 2 * 100 / 103;
    const disk = (cx, cy) => { let z = [(cx - box.left - box.width / 2) / r, (cy - box.top - box.height / 2) / r]; const n = Math.sqrt(norm2(z)); if (n > 0.96) z = [z[0] * 0.96 / n, z[1] * 0.96 / n]; return z; };
    const z0 = disk(drag.x, drag.y), z1 = disk(e.clientX, e.clientY);
    drag.view = settle({focus: drag.start.focus, frame: compose(compose(toward(z1), toward([-z0[0], -z0[1]])), drag.start.frame)});
    if (!drag.frame) drag.frame = requestAnimationFrame(() => { drag.frame = 0; if (drag) svg.innerHTML = treeInner(p, b, drag.view, {active: false}); });
  }
}
function lift(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  if (d.frame) cancelAnimationFrame(d.frame);
  if (d.moved) { d.api.ui({view: d.view}); return; }
  if (e.type === 'pointercancel') return;
  const dot = dotAt(d.p, d.api.attempt().board, d.svg, e);
  if (!dot) return;
  viewOf(d.p, d.api.attempt().board).cursor = dot;
  d.api.apply(toggle(d.api.attempt().board, dot));
}
const ARROWS = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1]};
// Arrow keys move the keyboard's dot along a road, panning to keep it in sight.
export function arrowTarget(m, view, cursor, key) {
  const dir = ARROWS[key];
  if (!dir) return null;
  if (m.kind === 'flat') {
    const [x, y] = xyOf(cursor), n = [x + dir[0], y + dir[1]];
    return flatHas(m, ...n) ? keyOf(...n) : null;
  }
  const {dots} = diskLayout(view), from = dots.get(cursor)?.z;
  if (!from) return null;
  let best = null, score = 0.35;
  for (const n of treeNeighbours(cursor)) {
    const to = dots.get(n)?.z;
    if (!to) continue;
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1, s = ((to[0] - from[0]) * dir[0] + (to[1] - from[1]) * dir[1]) / len;
    if (s > score) { best = n; score = s; }
  }
  return best;
}
function wire(root, p, api) {
  const svg = root.querySelector('[data-ends-board]');
  if (!svg) return;
  if (!listening) { document.addEventListener('pointermove', pan); document.addEventListener('pointerup', lift); document.addEventListener('pointercancel', lift); listening = true; }
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || drag) return;
    const b = api.attempt().board, m = mapFor(p, b), state = viewOf(p, b);
    lastPress = Date.now();
    drag = {pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false, svg, p, b, m, api, start: state.view, view: state.view, drawnAt: state.view, frame: 0};
  });
  // A click with no press before it (assistive technology) is a tap too.
  svg.addEventListener('click', e => {
    if (Date.now() - lastPress < 1000) return;
    const d = e.target.closest('[data-dot]')?.dataset.dot, b = api.attempt().board;
    if (d && e.target.closest('[role="button"]') && !solved(p, b)) { viewOf(p, b).cursor = d; api.apply(toggle(b, d)); }
  });
  svg.addEventListener('keydown', e => {
    const b = api.attempt().board, state = viewOf(p, b), m = mapFor(p, b);
    if (solved(p, b)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      const d = e.target.closest('[data-dot]')?.dataset.dot;
      if (!d) return;
      e.preventDefault();
      state.cursor = d;
      api.apply(toggle(b, d));
      return;
    }
    if (!ARROWS[e.key] || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const next = arrowTarget(m, state.view, state.cursor, e.key);
    if (!next) return;
    api.ui({cursor: next, view: m.kind === 'flat' ? showDot(m, state.view, next) : centreOn(state.view, next)});
  });
}

export const endsMechanics = {
  ends: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      const all = uiState.get(p.id), now = all?.maps[all.current];
      if (!object(payload) || !now) return;
      if (payload.home) { now.view = startView(now.map); now.cursor = startDot(now.map); return; }
      if (validView(now.map, payload.view)) now.view = payload.view;
      if (typeof payload.cursor === 'string' && isDot(now.map, payload.cursor)) now.cursor = payload.cursor;
    },
    reset: p => { uiState.delete(p.id); treeTargets.delete(p.id); },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'ends',
  family: {id: 'ends', symbol: '∞'},
  mechanics: endsMechanics,
  pack: new URL('./ends.json', import.meta.url).href,
  css: new URL('./ends.css', import.meta.url).href,
  focus: '.ends-dot[tabindex="0"],.ends-button:not([disabled]),.ends-home'
};
