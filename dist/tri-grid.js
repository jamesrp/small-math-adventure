// The shared triangle grid: boards cut from the grid of unit triangles that
// pattern blocks fit, drawn as one SVG, with every triangle, piece and grid
// point able to act as a control. Families describe what each one looks like
// and what tapping it does; this module computes the geometry (cells,
// neighbours, grid points, where a piece fits), draws the board, and wires
// taps, keys and finger strokes. It never names a family. Rhombus gardens
// (Week 1) is the first user; the Week 1 encore's block game and Week 16's
// three-colour triangles can build on the same grid. See docs/tri-grid.md.
import {esc} from './expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
export const H = Math.sqrt(3) / 2;
// Drawing units per triangle edge, so text and marks have sensible sizes.
export const UNIT = 10;

// Grid points are [u, v]: u steps along a horizontal edge, v along the edge
// leaning up and to the right, so [u, v] sits at (u + v/2, √3/2 · v).
// A cell is [u, v, 0], the up triangle with corners [u, v], [u+1, v],
// [u, v+1], or [u, v, 1], the down triangle with corners [u+1, v],
// [u+1, v+1], [u, v+1]. Every edge joins an up triangle to a down one.
export const corners = ([u, v, o]) => o ? [[u + 1, v], [u + 1, v + 1], [u, v + 1]] : [[u, v], [u + 1, v], [u, v + 1]];
export const cellKey = ([u, v, o]) => `${u},${v},${o}`;
export const pointKey = ([u, v]) => `${u},${v}`;
export const touching = ([u, v, o]) => o ? [[u, v, 0], [u + 1, v, 0], [u, v + 1, 0]] : [[u, v, 1], [u - 1, v, 1], [u, v - 1, 1]];
// The cell whose three corners these are.
export function cellOf(points) {
  const u = Math.min(...points.map(p => p[0])), v = Math.min(...points.map(p => p[1]));
  return [u, v, points.some(p => p[0] === u && p[1] === v) ? 0 : 1];
}
// A sixth of a turn about [0, 0], and a mirror in the line u = v.
export const turnPoint = ([u, v]) => [0 - v, u + v];
export const mirrorPoint = ([u, v]) => [v, u];
const mapCell = (cell, f) => cellOf(corners(cell).map(f));

// The cells inside a polygon whose corners are grid points and whose sides
// follow grid lines (the worksheets' outlines), by testing each centre.
export function cellsInside(outline) {
  const inside = (x, y) => {
    let result = false;
    outline.forEach(([a, b], i) => {
      const [c, d] = outline[(i + 1) % outline.length];
      if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) result = !result;
    });
    return result;
  };
  const us = outline.map(p => p[0]), vs = outline.map(p => p[1]), out = [];
  for (let v = Math.min(...vs) - 1; v <= Math.max(...vs); v++) {
    for (let u = Math.min(...us) - Math.max(...vs) + Math.min(...vs) - 1; u <= Math.max(...us) + Math.max(...vs) - Math.min(...vs); u++) {
      for (const o of [0, 1]) {
        const c = corners([u, v, o]);
        if (inside(c.reduce((s, p) => s + p[0], 0) / 3, c.reduce((s, p) => s + p[1], 0) / 3)) out.push([u, v, o]);
      }
    }
  }
  return out;
}

// Pieces as cells near [0, 0]. Pattern blocks: the green triangle, the blue
// rhombus, the red trapezoid, the purple chevron of the 21st Century set and
// the yellow hexagon.
export const SHAPES = {
  triangle: [[0, 0, 0]],
  rhombus: [[0, 0, 0], [0, 0, 1]],
  trapezoid: [[0, 0, 0], [0, 0, 1], [1, 0, 0]],
  chevron: [[0, 0, 0], [0, 0, 1], [0, 1, 0], [-1, 1, 1]],
  hexagon: [[0, 0, 0], [-1, 0, 1], [0, -1, 1], [-1, 0, 0], [-1, -1, 1], [0, -1, 0]]
};

// A board from a puzzle's parameters: {outline: [[u, v], ...]} or
// {cells: [[u, v, o], ...]}, and `turn: true` to draw it a quarter turn
// round (grid lines then run up and down instead of across). Cells are
// numbered in reading order, top row first; families store moves and saves
// by these numbers, so a board's drawing can change without breaking saves.
const grids = new Map();
export function gridOf(spec) {
  const cacheKey = JSON.stringify(spec);
  if (grids.has(cacheKey)) return grids.get(cacheKey);
  const raw = spec.cells ? spec.cells.map(c => [...c]) : cellsInside(spec.outline);
  const turn = Boolean(spec.turn);
  const flat = ([u, v]) => [(u + v / 2) * UNIT, -H * v * UNIT];
  const draw = p => { const [x, y] = flat(p); return turn ? [-y, x] : [x, y]; };
  const centreOf = cell => { const c = corners(cell).map(draw); return [(c[0][0] + c[1][0] + c[2][0]) / 3, (c[0][1] + c[1][1] + c[2][1]) / 3]; };
  const cells = raw.sort((a, b) => { const [ax, ay] = centreOf(a), [bx, by] = centreOf(b); return Math.abs(ay - by) > 1e-6 ? ay - by : ax - bx; });
  const index = new Map(cells.map((c, i) => [cellKey(c), i]));
  const nbr = cells.map(c => touching(c).map(t => index.get(cellKey(t))).filter(j => j !== undefined).sort((a, b) => a - b));
  const pairs = [];
  cells.forEach((c, i) => { if (!c[2]) for (const j of nbr[i]) pairs.push(i < j ? [i, j] : [j, i]); });
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  // Grid points: every corner of a board cell, with the cells round it.
  const pointIndex = new Map(), points = [], around = [];
  cells.forEach((c, i) => corners(c).forEach(p => {
    const k = pointKey(p);
    if (!pointIndex.has(k)) { pointIndex.set(k, points.length); points.push(p); around.push([]); }
    around[pointIndex.get(k)].push(i);
  }));
  const xy = points.map(draw), centre = cells.map(centreOf);
  const all = cells.flatMap(c => corners(c).map(draw));
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  const g = {cells, index, nbr, pairs, points, pointIndex, around, xy, centre, box, turn, up: cells.map(c => c[2] === 0), draw};
  grids.set(cacheKey, g);
  return g;
}
export const validGridSpec = spec => object(spec) && (
  (Array.isArray(spec.outline) && spec.outline.length >= 3 && spec.outline.every(p => Array.isArray(p) && p.length === 2 && p.every(integer))) ||
  (Array.isArray(spec.cells) && spec.cells.length > 0 && spec.cells.every(c => Array.isArray(c) && c.length === 3 && c.every(integer) && (c[2] === 0 || c[2] === 1))));

// Where a piece fits: every turn (and, with `mirror`, every reflection) and
// every shift that keeps it inside the board, as sorted cell numbers.
const fits = new Map();
export function placements(g, shape, mirror = false) {
  const cacheKey = `${g.cells.map(cellKey).join(';')}|${shape}|${mirror}`;
  if (fits.has(cacheKey)) return fits.get(cacheKey);
  const base = SHAPES[shape];
  if (!base) throw Error(`Unknown shape ${shape}`);
  const forms = [];
  let form = base;
  for (let t = 0; t < 6; t++) {
    forms.push(form);
    if (mirror) forms.push(form.map(c => mapCell(c, mirrorPoint)));
    form = form.map(c => mapCell(c, turnPoint));
  }
  const seen = new Set(), out = [];
  for (const f of forms) {
    // Shift so the form's first cell lands on each board cell of its kind.
    const [fu, fv, fo] = f[0];
    for (const [u, v, o] of g.cells) {
      if (o !== fo) continue;
      const at = f.map(([a, b, c]) => g.index.get(cellKey([a - fu + u, b - fv + v, c])));
      if (at.some(i => i === undefined)) continue;
      const sorted = at.sort((a, b) => a - b), k = sorted.join(',');
      if (!seen.has(k)) { seen.add(k); out.push(sorted); }
    }
  }
  out.sort((a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; });
  fits.set(cacheKey, out);
  return out;
}

// The boundary of a set of cells as closed loops of grid points (one loop
// for a piece; a board with holes has more).
export function outlineOf(g, cellList) {
  const count = new Map();
  for (const i of cellList) {
    const c = corners(g.cells[i]);
    for (let k = 0; k < 3; k++) {
      const a = c[k], b = c[(k + 1) % 3], key = [pointKey(a), pointKey(b)].sort().join('|');
      count.set(key, (count.get(key) || 0) + 1);
    }
  }
  const next = new Map();
  for (const [key, n] of count) {
    if (n !== 1) continue;
    const [a, b] = key.split('|');
    next.set(a, [...(next.get(a) || []), b]);
    next.set(b, [...(next.get(b) || []), a]);
  }
  const loops = [], used = new Set();
  for (const start of next.keys()) {
    if (used.has(start)) continue;
    const loop = [start];
    used.add(start);
    let prev = null, here = start;
    for (;;) {
      const options = next.get(here).filter(p => p !== prev);
      const step = options.find(p => !used.has(p)) ?? options.find(p => p === start);
      if (!step || step === start) break;
      loop.push(step); used.add(step); prev = here; here = step;
    }
    loops.push(loop.map(k => k.split(',').map(Number)));
  }
  // Drop corners where the boundary goes straight on.
  return loops.map(loop => loop.filter((p, i) => {
    const a = loop[(i + loop.length - 1) % loop.length], b = loop[(i + 1) % loop.length];
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  }));
}

const f = n => Number(n.toFixed(2));
const pts = list => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
export const cellPoints = (g, i) => pts(corners(g.cells[i]).map(g.draw));
export const piecePoints = (g, cellList) => outlineOf(g, cellList).map(loop => pts(loop.map(g.draw)));
// A cell shrunk towards its centre (for a selection or a preview).
export function insetPoints(g, i, k = .72) {
  const [cx, cy] = g.centre[i];
  return pts(corners(g.cells[i]).map(g.draw).map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]));
}

// The board. `opts.cell(i)` returns how each triangle looks: {cls, label,
// act, dot}; `act` true makes it a control (aria-label `label`). `opts.pieces`
// is a list of {cells, cls, label, act, key}; an acting piece is a control
// with data-tg-piece=key. `opts.point(k)` returns {cls, label, act} for grid
// points that are controls or marked; others are not drawn. `opts.under` and
// `opts.over` are SVG drawn below the pieces and above them. `opts.stroke`
// marks a board where a finger draws across triangles instead of scrolling.
// `opts.picture` draws a small picture (an icon, a goal card) with no
// controls, which wireTri never mistakes for the board.
export function triBoard(g, opts = {}) {
  const cell = opts.cell || (() => ({})), point = opts.point || (() => null);
  const looks = g.cells.map((_, i) => cell(i) || {});
  const outline = outlineOf(g, g.cells.map((_, i) => i)).map(loop => `M${pts(loop.map(g.draw)).replace(/ /g, 'L')}Z`).join('');
  const base = g.cells.map((c, i) => `<polygon class="tg-cell ${c[2] ? 'down' : 'up'} ${looks[i].cls || ''}" points="${cellPoints(g, i)}" data-cell="${i}"/>`).join('');
  const pieces = (opts.pieces || []).map(p => piecePoints(g, p.cells).map(points => `<polygon class="tg-piece ${p.cls || ''}" points="${points}"/>`).join('')).join('');
  const dots = looks.map((look, i) => look.dot ? `<circle class="tg-dot ${look.dot === true ? '' : look.dot}" cx="${f(g.centre[i][0])}" cy="${f(g.centre[i][1])}" r="${f(UNIT * .12)}"/>` : '').join('');
  const cellHits = looks.map((look, i) => look.act ? `<polygon class="tg-hit" points="${cellPoints(g, i)}" role="button" tabindex="0" aria-label="${esc(look.label || `Triangle ${i + 1}`)}" data-tg-cell="${i}" data-focus="tg-cell-${i}"/>` : '').join('');
  const pieceHits = (opts.pieces || []).filter(p => p.act).map(p => piecePoints(g, p.cells).map(points => `<polygon class="tg-hit tg-piece-hit" points="${points}" role="button" tabindex="0" aria-label="${esc(p.label || 'Piece')}" data-tg-piece="${esc(p.key)}" data-focus="tg-piece-${esc(p.key)}"/>`).join('')).join('');
  const marks = g.points.map((_, k) => {
    const look = point(k);
    if (!look) return '';
    const [x, y] = g.xy[k];
    const control = look.act ? ` role="button" tabindex="0" aria-label="${esc(look.label || 'Point')}" data-tg-point="${k}" data-focus="tg-point-${k}"` : '';
    return `<g class="tg-point ${look.cls || ''}" transform="translate(${f(x)},${f(y)})"${control}><circle class="tg-reach" r="${f(UNIT * .3)}"/><circle class="tg-pip" r="${f(UNIT * .11)}"/></g>`;
  }).join('');
  const [x, y, w, h] = g.box, pad = UNIT * .35;
  const role = opts.picture ? 'role="img"' : 'role="group" data-tg-board';
  return `<svg class="tg-board${opts.stroke ? ' tg-stroking' : ''} ${opts.cls || ''}" viewBox="${f(x - pad)} ${f(y - pad)} ${f(w + 2 * pad)} ${f(h + 2 * pad)}" style="--tg-aspect:${f((w + 2 * pad) / (h + 2 * pad))}" ${role} aria-label="${esc(opts.label || 'Board')}">${base}${opts.under || ''}<g class="tg-pieces">${pieces}</g>${dots}${opts.over || ''}<path class="tg-edge" d="${outline}"/>${pieceHits}${cellHits}<g class="tg-points">${marks}</g></svg>`;
}

// Which cell a point of the drawing lies in, or null. With `core` < 1 the
// point must also lie in the middle part of the triangle, so a stroke that
// grazes a corner does not pick up the cells round it.
export function cellAt(g, x, y, core = 1) {
  const [fx, fy] = g.turn ? [y, -x] : [x, y];
  const v = -fy / (H * UNIT), u = fx / UNIT - v / 2;
  const bu = Math.floor(u), bv = Math.floor(v), du = u - bu, dv = v - bv;
  const o = du + dv > 1 ? 1 : 0;
  const bary = o ? [1 - du, 1 - dv, du + dv - 1] : [du, dv, 1 - du - dv];
  if (Math.min(...bary) < (1 - core) / 3) return null;
  const i = g.index.get(cellKey([bu, bv, o]));
  return i === undefined ? null : i;
}

// Taps, keys and strokes. `handlers.cell(i)`, `handlers.piece(key)` and
// `handlers.point(k)` turn a tap into a move (or null). With
// `handlers.stroke`, pressing on a cell and sliding across others collects
// the cells entered (through their middles only); `handlers.preview(cells)`
// says 'ok' or 'blocked' for the stroke so far, and `handlers.stroke(cells)`
// on release returns the move, if any. A stroke that never leaves its first
// cell is a tap.
let stroke = null;
const clientToBoard = (svg, x, y) => {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const p = svg.createSVGPoint();
  p.x = x; p.y = y;
  const q = p.matrixTransform(m.inverse());
  return [q.x, q.y];
};
function paint(s) {
  s.svg.querySelectorAll('.tg-hit.in-stroke').forEach(el => el.classList.remove('in-stroke', 'blocked'));
  if (s.cells.length < 2) return;
  const blocked = s.handlers.preview?.(s.cells) === 'blocked';
  for (const i of s.cells) s.svg.querySelector(`[data-tg-cell="${i}"]`)?.classList.add('in-stroke', ...(blocked ? ['blocked'] : []));
}
function strokeMove(e) {
  if (!stroke || e.pointerId !== stroke.pointer) return;
  const at = clientToBoard(stroke.svg, e.clientX, e.clientY);
  if (!at) return;
  const i = cellAt(stroke.g, at[0], at[1], .6);
  if (i === null || stroke.cells.includes(i)) return;
  stroke.cells.push(i);
  stroke.moved = true;
  paint(stroke);
}
function strokeEnd(e) {
  if (!stroke || e.pointerId !== stroke.pointer) return;
  const s = stroke;
  s.done = true;
  if (s.moved && e.type === 'pointerup') { const action = s.handlers.stroke(s.cells); s.cells = []; paint(s); if (action) s.apply(action); }
  // The click that follows a stroke belongs to it, not to a tap.
  setTimeout(() => { if (stroke === s) stroke = null; }, 0);
}
let listening = false;
export function wireTri(root, g, handlers, apply) {
  const svg = root.querySelector('[data-tg-board]');
  if (!svg) return;
  const act = control => {
    if (control.dataset.tgPoint !== undefined) return handlers.point?.(Number(control.dataset.tgPoint));
    if (control.dataset.tgPiece !== undefined) return handlers.piece?.(control.dataset.tgPiece);
    if (control.dataset.tgCell !== undefined) return handlers.cell?.(Number(control.dataset.tgCell));
    return null;
  };
  svg.addEventListener('click', e => {
    const control = e.target.closest('[data-tg-cell],[data-tg-piece],[data-tg-point]');
    if (!control || !svg.contains(control)) return;
    if (stroke?.moved) { stroke = null; return; }
    stroke = null;
    const action = act(control);
    if (action) apply(action);
  });
  svg.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key)) return;
    const control = e.target.closest('[data-tg-cell],[data-tg-piece],[data-tg-point]');
    if (!control) return;
    e.preventDefault();
    const action = act(control);
    if (action) apply(action);
  });
  if (!handlers.stroke) return;
  if (!listening) { document.addEventListener('pointermove', strokeMove); document.addEventListener('pointerup', strokeEnd); document.addEventListener('pointercancel', strokeEnd); listening = true; }
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || (stroke && !stroke.done)) return;
    const control = e.target.closest('[data-tg-cell]');
    if (!control) return;
    stroke = {pointer: e.pointerId, svg, g, cells: [Number(control.dataset.tgCell)], moved: false, done: false, handlers, apply};
  });
}
