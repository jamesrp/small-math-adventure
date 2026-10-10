// The shared square grid: boards of unit squares drawn as one SVG, with every
// square, grid line and grid point able to act as a control. Families say
// what each one looks like and what tapping it does; this module computes the
// geometry (squares, neighbours, edges, points, the boundary of any set of
// squares, its pieces and its holes, shapes up to turns and flips), draws the
// board, and wires taps, keys and finger strokes. It never names a family.
// Garden fences (Week 26) is the first user; Week 48's inside and outside
// covers and Week 54's partition strips can build on the same grid. See
// docs/sq-grid.md.
import {esc} from './expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
// Drawing units per square, so text and marks have sensible sizes.
export const UNIT = 10;

// A square is [x, y]: x counts across from the left, y down from the top.
// A grid point is [x, y], the top-left corner of square [x, y]. An edge is
// [x, y, 0], the side from point [x, y] to [x+1, y] (across), or [x, y, 1],
// the side from [x, y] to [x, y+1] (down).
export const cellKey = ([x, y]) => `${x},${y}`;
export const pointKey = ([x, y]) => `${x},${y}`;
export const edgeKey = ([x, y, d]) => `${x},${y},${d}`;
export const STEPS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
// The four sides of a square: top, right, bottom, left.
export const sidesOf = ([x, y]) => [[x, y, 0], [x + 1, y, 1], [x, y + 1, 0], [x, y, 1]];
// The two squares an edge lies between (above and below, or left and right).
export const edgeCells = ([x, y, d]) => d ? [[x - 1, y], [x, y]] : [[x, y - 1], [x, y]];
export const edgeEnds = ([x, y, d]) => d ? [[x, y], [x, y + 1]] : [[x, y], [x + 1, y]];
export const cornersOf = ([x, y]) => [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];

/* ------------------------------------------------------------------ *
 * Shapes: lists of squares, compared up to shifts, turns and flips.
 * ------------------------------------------------------------------ */
export function normalize(cells) {
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
// The eight turns and flips of a shape, each shifted to start at [0, 0].
export function symmetries(cells) {
  const out = [];
  for (let k = 0; k < 8; k++) out.push(normalize(cells.map(([x, y]) => {
    let [a, b] = k & 1 ? [y, x] : [x, y];
    if (k & 2) a = -a;
    if (k & 4) b = -b;
    return [a, b];
  })));
  return out;
}
const keyOf = cells => cells.map(cellKey).join(' ');
// The same key for a shape wherever it sits (shapeKey), and also however it
// is turned or flipped (freeKey).
export const shapeKey = cells => keyOf(normalize(cells));
export const freeKey = cells => symmetries(cells).map(keyOf).sort()[0];
export const cellsOfKey = key => key ? key.split(' ').map(s => s.split(',').map(Number)) : [];

/* ------------------------------------------------------------------ *
 * Boards
 * ------------------------------------------------------------------ */
// A board from a puzzle's parameters: {cols, rows} for a whole rectangle,
// and `cells: [[x, y], ...]` to keep only some of its squares. Squares are
// numbered in reading order, top row first; families store moves and saves
// by these numbers, so a board's drawing can change without breaking saves.
const grids = new Map();
export function gridOf(spec) {
  const cacheKey = JSON.stringify(spec);
  if (grids.has(cacheKey)) return grids.get(cacheKey);
  const {cols, rows} = spec;
  const raw = spec.cells ? spec.cells.map(c => [c[0], c[1]]) : Array.from({length: cols * rows}, (_, i) => [i % cols, Math.floor(i / cols)]);
  const cells = raw.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const index = new Map(cells.map((c, i) => [cellKey(c), i]));
  const at = (x, y) => index.get(cellKey([x, y]));
  const nbr = cells.map(([x, y]) => STEPS.map(([dx, dy]) => at(x + dx, y + dy)).filter(j => j !== undefined).sort((a, b) => a - b));
  const pairs = [];
  nbr.forEach((list, i) => list.forEach(j => { if (i < j) pairs.push([i, j]); }));
  // Edges and points: every side and corner of a board square, once each.
  const edgeIndex = new Map(), edges = [], pointIndex = new Map(), points = [];
  cells.forEach(c => {
    for (const e of sidesOf(c)) if (!edgeIndex.has(edgeKey(e))) { edgeIndex.set(edgeKey(e), edges.length); edges.push(e); }
    for (const p of cornersOf(c)) if (!pointIndex.has(pointKey(p))) { pointIndex.set(pointKey(p), points.length); points.push(p); }
  });
  // An edge's squares on the board (one for a side on the board's rim).
  const sides = edges.map(e => edgeCells(e).map(c => index.get(cellKey(c))).filter(i => i !== undefined));
  const draw = ([x, y]) => [x * UNIT, y * UNIT];
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  const box = [Math.min(...xs) * UNIT, Math.min(...ys) * UNIT, (Math.max(...xs) + 1 - Math.min(...xs)) * UNIT, (Math.max(...ys) + 1 - Math.min(...ys)) * UNIT];
  const g = {cols, rows, cells, index, at, nbr, pairs, edges, edgeIndex, sides, points, pointIndex, xy: points.map(draw), centre: cells.map(([x, y]) => [(x + .5) * UNIT, (y + .5) * UNIT]), box, draw};
  grids.set(cacheKey, g);
  return g;
}
export const validGridSpec = spec => object(spec) && integer(spec.cols) && integer(spec.rows) && spec.cols > 0 && spec.rows > 0 && spec.cols <= 30 && spec.rows <= 30 &&
  (spec.cells === undefined || (Array.isArray(spec.cells) && spec.cells.length > 0 && spec.cells.every(c => Array.isArray(c) && c.length === 2 && c.every(integer) && c[0] >= 0 && c[1] >= 0 && c[0] < spec.cols && c[1] < spec.rows) && new Set(spec.cells.map(cellKey)).size === spec.cells.length));

/* ------------------------------------------------------------------ *
 * Sets of squares: boundary, pieces, holes, outlines.
 * ------------------------------------------------------------------ */
const asSet = list => list instanceof Set ? list : new Set(list);
// The edges (numbers) with a square of the set on exactly one side: its
// boundary, holes included. Its length is the perimeter.
export function boundaryOf(g, list) {
  const set = asSet(list), out = [];
  g.edges.forEach((e, k) => {
    const [a, b] = edgeCells(e).map(c => set.has(g.index.get(cellKey(c))));
    if (a !== b) out.push(k);
  });
  return out;
}
export const perimeterOf = (g, list) => boundaryOf(g, list).length;
// Pairs of squares of the set that share a side.
export const sharedOf = (g, list) => { const set = asSet(list); return g.pairs.filter(([i, j]) => set.has(i) && set.has(j)).length; };
// The pieces the set falls into, joining squares that share a side (a
// corner is not enough), each as sorted square numbers, in order of their
// first square.
export function piecesOf(g, list) {
  const set = asSet(list), seen = new Set(), out = [];
  for (const start of [...set].sort((a, b) => a - b)) {
    if (seen.has(start)) continue;
    const piece = [start], stack = [start];
    seen.add(start);
    while (stack.length) for (const j of g.nbr[stack.pop()]) if (set.has(j) && !seen.has(j)) { seen.add(j); piece.push(j); stack.push(j); }
    out.push(piece.sort((a, b) => a - b));
  }
  return out;
}
// The holes of a set: groups of places not in it (board squares or not)
// that a path stepping across sides cannot leave without crossing the set.
// Each hole is a list of [x, y], in reading order.
export function holesOf(g, list) {
  const set = asSet(list);
  if (!set.size) return [];
  const sq = [...set].map(i => g.cells[i]), xs = sq.map(c => c[0]), ys = sq.map(c => c[1]);
  const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
  const filled = new Set(sq.map(cellKey)), outside = new Set([cellKey([x0, y0])]), stack = [[x0, y0]];
  const free = ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && !filled.has(cellKey([x, y]));
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of STEPS) { const c = [x + dx, y + dy]; if (free(c) && !outside.has(cellKey(c))) { outside.add(cellKey(c)); stack.push(c); } }
  }
  const seen = new Set(), holes = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = cellKey([x, y]);
    if (!free([x, y]) || outside.has(k) || seen.has(k)) continue;
    const hole = [[x, y]], stack2 = [[x, y]];
    seen.add(k);
    while (stack2.length) {
      const [a, b] = stack2.pop();
      for (const [dx, dy] of STEPS) { const c = [a + dx, b + dy]; if (free(c) && !seen.has(cellKey(c))) { seen.add(cellKey(c)); hole.push(c); stack2.push(c); } }
    }
    holes.push(hole.sort((p, q) => p[1] - q[1] || p[0] - q[0]));
  }
  return holes;
}
// The boundary as closed loops of grid points, each with the set on its
// left on screen. Each loop borders one empty region, the outside or one
// hole, so a piece with h holes has h + 1 loops; where two squares touch
// only at a corner, a loop passes through that corner twice.
export function outlineOf(g, list) {
  const set = asSet(list), next = new Map();
  const has = c => set.has(g.index.get(cellKey(c)));
  for (const i of set) {
    const [x, y] = g.cells[i];
    // Sides walked anticlockwise on screen (y down): left, bottom, right, top.
    if (!has([x - 1, y])) next.set(pointKey([x, y]), [...(next.get(pointKey([x, y])) || []), [x, y + 1]]);
    if (!has([x, y + 1])) next.set(pointKey([x, y + 1]), [...(next.get(pointKey([x, y + 1])) || []), [x + 1, y + 1]]);
    if (!has([x + 1, y])) next.set(pointKey([x + 1, y + 1]), [...(next.get(pointKey([x + 1, y + 1])) || []), [x + 1, y]]);
    if (!has([x, y - 1])) next.set(pointKey([x + 1, y]), [...(next.get(pointKey([x + 1, y])) || []), [x, y]]);
  }
  const used = new Set(), loops = [];
  const take = (from, to) => used.add(`${pointKey(from)}>${pointKey(to)}`);
  const unused = (from, to) => !used.has(`${pointKey(from)}>${pointKey(to)}`);
  for (const [startKey, outs] of next) for (const first of outs) {
    const start = startKey.split(',').map(Number);
    if (!unused(start, first)) continue;
    const loop = [start];
    let prev = start, here = first;
    take(prev, here);
    while (pointKey(here) !== startKey || loop.length < 2) {
      loop.push(here);
      const options = (next.get(pointKey(here)) || []).filter(to => unused(here, to));
      if (!options.length) break;
      // At a pinch, turn away from the set (right), keeping to one empty region.
      const [dx, dy] = [here[0] - prev[0], here[1] - prev[1]];
      const turn = to => { const [ex, ey] = [to[0] - here[0], to[1] - here[1]]; return dx * ey - dy * ex; };
      const step = options.sort((a, b) => turn(b) - turn(a))[0];
      take(here, step); prev = here; here = step;
    }
    // Drop corners where the boundary goes straight on.
    loops.push(loop.filter((p, i) => {
      const a = loop[(i + loop.length - 1) % loop.length], b = loop[(i + 1) % loop.length];
      return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
    }));
  }
  return loops;
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
const f = n => Number(n.toFixed(2));
const pts = list => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
export const cellPoints = (g, i) => pts(cornersOf(g.cells[i]).map(g.draw));
// A square shrunk towards its centre (for a tile, a selection or a preview).
export function insetPoints(g, i, k = .8) {
  const [cx, cy] = g.centre[i];
  return pts(cornersOf(g.cells[i]).map(g.draw).map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]));
}
export const pathOf = (g, list) => outlineOf(g, list).map(loop => `M${pts(loop.map(g.draw)).replace(/ /g, 'L')}Z`).join('');
const edgeLine = (g, k) => { const [[x1, y1], [x2, y2]] = edgeEnds(g.edges[k]).map(g.draw); return `x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"`; };

// The board. `opts.cell(i)` returns how each square looks: {cls, label, act,
// dot}; `act` true makes it a control (aria-label `label`). `opts.pieces` is
// a list of {cells, cls, label, act, key}, each drawn as one outline; an
// acting piece is a control with data-sg-piece=key. `opts.edge(k)` returns
// {cls, label, act} for edges to draw; others are not drawn. `opts.point(k)`
// does the same for grid points. `opts.under` and `opts.over` are SVG drawn
// below the pieces and above them. `opts.stroke` marks a board where a finger
// slides across squares instead of scrolling. `opts.picture` draws a small
// picture (an icon, a goal card) with no controls, which wireSquare never
// mistakes for the board.
export function squareBoard(g, opts = {}) {
  const cell = opts.cell || (() => ({})), edge = opts.edge || (() => null), point = opts.point || (() => null);
  const looks = g.cells.map((_, i) => cell(i) || {});
  const rim = pathOf(g, g.cells.map((_, i) => i));
  const base = g.cells.map((c, i) => `<polygon class="sg-cell ${looks[i].cls || ''}" points="${cellPoints(g, i)}" data-cell="${i}"/>`).join('');
  const pieces = (opts.pieces || []).map(p => `<path class="sg-piece ${p.cls || ''}" d="${pathOf(g, p.cells)}"/>`).join('');
  const dots = looks.map((look, i) => look.dot ? `<circle class="sg-dot ${look.dot === true ? '' : look.dot}" cx="${f(g.centre[i][0])}" cy="${f(g.centre[i][1])}" r="${f(UNIT * .14)}"/>` : '').join('');
  const edgeLooks = g.edges.map((_, k) => edge(k));
  const lines = edgeLooks.map((look, k) => look ? `<line class="sg-edge ${look.cls || ''}" ${edgeLine(g, k)}/>` : '').join('');
  const edgeHits = edgeLooks.map((look, k) => look?.act ? `<line class="sg-hit sg-edge-hit" ${edgeLine(g, k)} role="button" tabindex="0" aria-label="${esc(look.label || 'Edge')}" data-sg-edge="${k}" data-focus="sg-edge-${k}"/>` : '').join('');
  const cellHits = looks.map((look, i) => look.act ? `<polygon class="sg-hit" points="${cellPoints(g, i)}" role="button" tabindex="0" aria-label="${esc(look.label || `Square ${i + 1}`)}" data-sg-cell="${i}" data-focus="sg-cell-${i}"/>` : '').join('');
  const pieceHits = (opts.pieces || []).filter(p => p.act).map(p => `<path class="sg-hit sg-piece-hit" d="${pathOf(g, p.cells)}" role="button" tabindex="0" aria-label="${esc(p.label || 'Piece')}" data-sg-piece="${esc(p.key)}" data-focus="sg-piece-${esc(p.key)}"/>`).join('');
  const marks = g.points.map((_, k) => {
    const look = point(k);
    if (!look) return '';
    const [x, y] = g.xy[k];
    const control = look.act ? ` role="button" tabindex="0" aria-label="${esc(look.label || 'Point')}" data-sg-point="${k}" data-focus="sg-point-${k}"` : '';
    return `<g class="sg-point ${look.cls || ''}" transform="translate(${f(x)},${f(y)})"${control}><circle class="sg-reach" r="${f(UNIT * .3)}"/><circle class="sg-pip" r="${f(UNIT * .11)}"/></g>`;
  }).join('');
  const [x, y, w, h] = g.box, pad = UNIT * (opts.pad ?? .3);
  const role = opts.picture ? 'role="img"' : 'role="group" data-sg-board';
  return `<svg class="sg-board${opts.stroke ? ' sg-stroking' : ''} ${opts.cls || ''}" viewBox="${f(x - pad)} ${f(y - pad)} ${f(w + 2 * pad)} ${f(h + 2 * pad)}" style="--sg-aspect:${f((w + 2 * pad) / (h + 2 * pad))}" ${role} aria-label="${esc(opts.label || 'Board')}">${base}<path class="sg-rim" d="${rim}"/>${opts.under || ''}<g class="sg-pieces">${pieces}</g>${dots}<g class="sg-edges">${lines}</g>${opts.over || ''}${pieceHits}${cellHits}${edgeHits}<g class="sg-points">${marks}</g></svg>`;
}

// Which square a point of the drawing lies in, or null. With `core` < 1 the
// point must also lie in the middle part of the square, so a stroke that
// grazes a corner does not pick up the squares round it.
export function cellAt(g, x, y, core = 1) {
  const u = x / UNIT, v = y / UNIT, cx = Math.floor(u), cy = Math.floor(v);
  const margin = (1 - core) / 2;
  if (u - cx < margin || u - cx > 1 - margin || v - cy < margin || v - cy > 1 - margin) return null;
  const i = g.index.get(cellKey([cx, cy]));
  return i === undefined ? null : i;
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */
// Taps, keys and strokes. `handlers.cell(i)`, `handlers.piece(key)`,
// `handlers.edge(k)` and `handlers.point(k)` turn a tap into a move (or
// null). With `handlers.stroke`, pressing on a square and sliding across
// others collects the squares entered (through their middles only), in
// order; `handlers.preview(cells)` says 'ok' or 'blocked' for the stroke so
// far, or returns {show, blocked} to light other squares than the path, and
// `handlers.stroke(cells)` on release returns the move, if any. A stroke
// that never leaves its first square is a tap. Taps are read from the
// pointer itself, because a browser may drop the click after a touch; the
// click that follows is ignored, and a click with no pointer before it
// (assistive technology) still works.
let press = null, stroke = null, lastTap = -Infinity;
const clientToBoard = (svg, x, y) => {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const p = svg.createSVGPoint();
  p.x = x; p.y = y;
  const q = p.matrixTransform(m.inverse());
  return [q.x, q.y];
};
function paint(s) {
  s.svg.querySelectorAll('.sg-hit.in-stroke').forEach(el => el.classList.remove('in-stroke', 'blocked'));
  if (s.cells.length < 2) return;
  const said = s.handlers.preview?.(s.cells);
  const show = object(said) ? said.show || [] : s.cells, blocked = object(said) ? Boolean(said.blocked) : said === 'blocked';
  for (const i of show) s.svg.querySelector(`[data-sg-cell="${i}"]`)?.classList.add('in-stroke', ...(blocked ? ['blocked'] : []));
}
function pointerMove(e) {
  if (!stroke || e.pointerId !== stroke.pointer) return;
  const at = clientToBoard(stroke.svg, e.clientX, e.clientY);
  if (!at) return;
  const i = cellAt(stroke.g, at[0], at[1], .6);
  if (i === null || stroke.cells.at(-1) === i) return;
  // Sliding back over a square already in the stroke moves its end there.
  stroke.cells = stroke.cells.includes(i) ? stroke.cells.slice(0, stroke.cells.indexOf(i) + 1) : [...stroke.cells, i];
  stroke.moved = true;
  paint(stroke);
}
function pointerEnd(e) {
  const p = press?.pointer === e.pointerId ? press : null, s = stroke?.pointer === e.pointerId ? stroke : null;
  if (p) press = null;
  if (s) stroke = null;
  if (e.type !== 'pointerup') { if (s) { s.cells = []; paint(s); } return; }
  if (s?.moved) {
    // A stroke that slid back to its first square does nothing.
    lastTap = performance.now();
    const action = s.cells.length > 1 ? s.handlers.stroke(s.cells) : null;
    s.cells = []; paint(s);
    if (action) s.apply(action);
  } else if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 12) {
    lastTap = performance.now();
    const action = p.act();
    if (action) p.apply(action);
  }
}
let listening = false;
export function wireSquare(root, g, handlers, apply) {
  const svg = root.querySelector('[data-sg-board]');
  if (!svg) return;
  const controls = '[data-sg-cell],[data-sg-piece],[data-sg-edge],[data-sg-point]';
  const act = control => {
    if (control.dataset.sgPoint !== undefined) return handlers.point?.(Number(control.dataset.sgPoint));
    if (control.dataset.sgEdge !== undefined) return handlers.edge?.(Number(control.dataset.sgEdge));
    if (control.dataset.sgPiece !== undefined) return handlers.piece?.(control.dataset.sgPiece);
    if (control.dataset.sgCell !== undefined) return handlers.cell?.(Number(control.dataset.sgCell));
    return null;
  };
  svg.addEventListener('click', e => {
    if (performance.now() - lastTap < 700) return;
    const control = e.target.closest(controls);
    if (!control || !svg.contains(control)) return;
    const action = act(control);
    if (action) apply(action);
  });
  svg.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key)) return;
    const control = e.target.closest(controls);
    if (!control) return;
    e.preventDefault();
    const action = act(control);
    if (action) apply(action);
  });
  if (!listening) {
    document.addEventListener('pointermove', pointerMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, pointerEnd);
    listening = true;
  }
  svg.addEventListener('pointerdown', e => {
    // A second finger is ignored; a new first press replaces any press whose release was lost.
    if (e.button > 0 || !e.isPrimary) return;
    const control = e.target.closest(controls);
    if (!control || !svg.contains(control)) return;
    press = {pointer: e.pointerId, x: e.clientX, y: e.clientY, act: () => act(control), apply};
    stroke = handlers.stroke && control.dataset.sgCell !== undefined ? {pointer: e.pointerId, svg, g, cells: [Number(control.dataset.sgCell)], moved: false, handlers, apply} : null;
  });
}
