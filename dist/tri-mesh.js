// Boards made of any triangles: a big triangle cut into little triangles of
// any shapes and sizes (Week 16's three-colour triangles), or a polygon cut
// by its diagonals (Week 14's triangulations). A family gives the points and
// the triangles; this module finds the edges, which triangles share them and
// which lie on the outside, draws the board as one SVG with any point, edge
// or triangle as a control, and leaves the wiring to tri-grid.js's wireTri,
// so taps behave exactly as on the lattice boards. It never names a family.
// See docs/tri-grid.md.
import {esc} from './expansion-controls.js';
import {UNIT} from './tri-grid.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const area2 = (p, [a, b, c]) => (p[b][0] - p[a][0]) * (p[c][1] - p[a][1]) - (p[c][0] - p[a][0]) * (p[b][1] - p[a][1]);
export const edgeKey = (a, b) => a < b ? `${a},${b}` : `${b},${a}`;

// A mesh spec: {points: [[x, y], ...], cells: [[a, b, c], ...]}. Points are
// in triangle-edge units with y pointing up; cells list three point numbers.
// Each edge may border at most two cells, and no cell may be flat.
export function validMeshSpec(spec) {
  if (!object(spec) || !Array.isArray(spec.points) || !Array.isArray(spec.cells) || spec.points.length < 3 || !spec.cells.length) return false;
  if (!spec.points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) return false;
  const n = spec.points.length, uses = new Map();
  for (const c of spec.cells) {
    if (!Array.isArray(c) || c.length !== 3 || !c.every(k => integer(k) && k >= 0 && k < n) || new Set(c).size < 3) return false;
    if (Math.abs(area2(spec.points, c)) < 1e-9) return false;
    for (let j = 0; j < 3; j++) {
      const key = edgeKey(c[j], c[(j + 1) % 3]);
      uses.set(key, (uses.get(key) || 0) + 1);
      if (uses.get(key) > 2) return false;
    }
  }
  return true;
}

const cache = new Map();
// The mesh: cells turned counterclockwise; edges as [a, b] with a < b;
// edgeCells[e] the one or two cells beside edge e; cellEdges[i] the edges of
// cell i, opposite its corners in order; outer[e] whether e is on the
// outside; nbr[i] the cells across cell i's edges; around[k] the cells at
// point k; xy and centre the drawing positions (y down), box the drawing's
// extent; and shortest, the shortest edge, which sets how big points are drawn.
export function meshOf(spec) {
  const key = JSON.stringify(spec);
  if (cache.has(key)) return cache.get(key);
  const points = spec.points.map(p => [...p]);
  const cells = spec.cells.map(c => area2(points, c) > 0 ? [...c] : [c[0], c[2], c[1]]);
  const index = new Map(), edges = [], edgeCells = [];
  const cellEdges = cells.map((c, i) => [1, 2, 0].map((j, t) => {
    // The edge opposite corner t joins the other two corners.
    const a = c[j], b = c[(j + 1) % 3], k = edgeKey(a, b);
    let e = index.get(k);
    if (e === undefined) { e = edges.length; index.set(k, e); edges.push(a < b ? [a, b] : [b, a]); edgeCells.push([]); }
    edgeCells[e].push(i);
    return e;
  }));
  const outer = edgeCells.map(list => list.length === 1);
  const nbr = cells.map((_, i) => cellEdges[i].flatMap(e => edgeCells[e].filter(j => j !== i)));
  const around = points.map(() => []);
  cells.forEach((c, i) => c.forEach(k => around[k].push(i)));
  const xy = points.map(([x, y]) => [x * UNIT, -y * UNIT]);
  const centre = cells.map(c => [0, 1].map(d => c.reduce((s, k) => s + xy[k][d], 0) / 3));
  const xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  const shortest = Math.min(...edges.map(([a, b]) => Math.hypot(xy[a][0] - xy[b][0], xy[a][1] - xy[b][1])));
  const m = {points, cells, edges, index, edgeCells, cellEdges, outer, nbr, around, xy, centre, box, shortest};
  cache.set(key, m);
  return m;
}
export const edgeOf = (m, a, b) => m.index.get(edgeKey(a, b));

const f = n => Number(n.toFixed(2));
const pts = list => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
export const meshCellPoints = (m, i) => pts(m.cells[i].map(k => m.xy[k]));
// The outside edges as one path.
const outline = m => m.edges.map((e, k) => m.outer[k] ? `M${pts([m.xy[e[0]], m.xy[e[1]]]).replace(' ', 'L')}` : '').join('');

// The board. `opts.cell(i)` returns {cls, label, act, dot} for triangle i;
// `opts.edge(e)` returns {cls, label, act} for edges to mark or make
// controls (data-tg-edge); `opts.point(k)` returns {cls, label, act, text}
// for points to draw, with `text` a letter inside the point. `opts.pip` and
// `opts.reach` set the drawn and the tappable radius of a point as fractions
// of a triangle edge (or `opts.pipPx` a radius on screen); both shrink to
// fit the shortest edge. `opts.under` is SVG below the edges and `opts.over`
// SVG above them and the outline; `opts.picture` draws an
// icon or goal card with no controls.
// The drawn radius of a point, for marks that sit beside one. With
// `pipPx`, points keep about that radius on screen at the board's usual
// 440px width, so small boards show their triangles, not their dots.
export function pipRadius(m, opts = {}) {
  const want = opts.pipPx ? opts.pipPx * (m.box[2] + UNIT * .8) / 440 : (opts.pip ?? .11) * UNIT;
  return Math.min(want, m.shortest * .3);
}
export function meshBoard(m, opts = {}) {
  const cell = opts.cell || (() => ({})), edge = opts.edge || (() => null), point = opts.point || (() => null);
  const looks = m.cells.map((_, i) => cell(i) || {}), edgeLooks = m.edges.map((_, e) => edge(e));
  const base = m.cells.map((_, i) => `<polygon class="tg-cell tm-cell ${looks[i].cls || ''}" points="${meshCellPoints(m, i)}" data-cell="${i}"/>`).join('');
  const line = (e, cls, extra = '') => `<line class="${cls}" x1="${f(m.xy[m.edges[e][0]][0])}" y1="${f(m.xy[m.edges[e][0]][1])}" x2="${f(m.xy[m.edges[e][1]][0])}" y2="${f(m.xy[m.edges[e][1]][1])}"${extra}/>`;
  const lines = m.edges.map((_, e) => m.outer[e] && !edgeLooks[e] ? '' : line(e, `tm-line ${m.outer[e] ? 'outer' : ''} ${edgeLooks[e]?.cls || ''}`)).join('');
  const dots = looks.map((look, i) => look.dot ? `<circle class="tg-dot ${look.dot === true ? '' : look.dot}" cx="${f(m.centre[i][0])}" cy="${f(m.centre[i][1])}" r="${f(Math.min(UNIT * .12, m.shortest * .1))}"/>` : '').join('');
  const cellHits = looks.map((look, i) => look.act ? `<polygon class="tg-hit" points="${meshCellPoints(m, i)}" role="button" tabindex="0" aria-label="${esc(look.label || `Triangle ${i + 1}`)}" data-tg-cell="${i}" data-focus="tg-cell-${i}"/>` : '').join('');
  const edgeHits = edgeLooks.map((look, e) => look?.act ? line(e, 'tm-edge-hit', ` role="button" tabindex="0" aria-label="${esc(look.label || 'Edge')}" data-tg-edge="${e}" data-focus="tg-edge-${e}"`) : '').join('');
  const pip = pipRadius(m, opts), reach = Math.max(pip, Math.min((opts.reach ?? .3) * UNIT, m.shortest * .46));
  const marks = m.points.map((_, k) => {
    const look = point(k);
    if (!look) return '';
    const [x, y] = m.xy[k];
    const control = look.act ? ` role="button" tabindex="0" aria-label="${esc(look.label || 'Point')}" data-tg-point="${k}" data-focus="tg-point-${k}"` : '';
    const text = look.text ? `<text class="tg-letter" y="${f(pip * .36)}" font-size="${f(pip * 1.1)}" aria-hidden="true">${esc(look.text)}</text>` : '';
    return `<g class="tg-point ${look.cls || ''}" transform="translate(${f(x)},${f(y)})"${control}><circle class="tg-reach" r="${f(reach)}"/><circle class="tg-pip" r="${f(pip)}"/>${text}</g>`;
  }).join('');
  const [x, y, w, h] = m.box, pad = Math.max(reach, UNIT * .2) + UNIT * .05;
  const role = opts.picture ? 'role="img"' : 'role="group" data-tg-board';
  return `<svg class="tg-board tm-board ${opts.cls || ''}" viewBox="${f(x - pad)} ${f(y - pad)} ${f(w + 2 * pad)} ${f(h + 2 * pad)}" style="--tg-aspect:${f((w + 2 * pad) / (h + 2 * pad))}" ${role} aria-label="${esc(opts.label || 'Board')}">${base}${opts.under || ''}${lines}<path class="tg-edge" d="${outline(m)}"/>${dots}${opts.over || ''}${cellHits}${edgeHits}<g class="tg-points">${marks}</g></svg>`;
}
