// The shared graph board: places joined by links or arrows, drawn as one SVG,
// with every node and link a native-feeling control. Families that work on a
// graph (route packing, cheapest networks, and later path reduction, bracing
// frames and scheduling) describe what each node and link looks like and what
// tapping it does; this module draws it, wires taps, keys and drag strokes,
// and leaves every rule to the family. It never names a family. See
// docs/graph-board.md.
import {esc} from './expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const NODE_R = 5.6;
const ARROW = 3.4, BAR = 4.2;

// A graph from a puzzle's parameters: node positions are percentages of the
// board box ([x, y], like Chip firing), edges are [u, v] or [u, v, weight],
// or [u, v, weight, bend] for a curved edge (two bridges between the same
// pair of places drawn side by side; see edgeGeometry). `directed` draws every
// edge as an arrow from u to v; `scale` shrinks the nodes, arrowheads and tags
// of a crowded map (1 is the default size).
const graphs = new Map();
export function graphOf(spec) {
  const cacheKey = JSON.stringify(spec);
  if (graphs.has(cacheKey)) return graphs.get(cacheKey);
  const aspect = spec.aspect || 1.4, height = 100 / aspect;
  const ids = Object.keys(spec.nodes), index = Object.fromEntries(ids.map((id, i) => [id, i]));
  const pos = Object.fromEntries(ids.map(id => [id, [spec.nodes[id][0], spec.nodes[id][1] * height / 100]]));
  const edges = spec.edges.map(([u, v, w, bend], i) => ({i, u, v, w: w ?? null, ...(bend ? {bend} : {})}));
  const g = {ids, index, pos, edges, directed: Boolean(spec.directed), aspect, height, k: spec.scale || 1};
  graphs.set(cacheKey, g);
  return g;
}
export const validGraphSpec = spec => object(spec) && object(spec.nodes) && Object.values(spec.nodes).every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)) && Array.isArray(spec.edges) && spec.edges.every(e => Array.isArray(e) && Object.hasOwn(spec.nodes, e[0]) && Object.hasOwn(spec.nodes, e[1]) && e[0] !== e[1] && (e[3] === undefined || Number.isFinite(e[3])));

// Geometry of one edge: its ends pulled back from the node circles, the
// midpoint, and the unit direction and normal. A curved edge (`bend`, in board
// units) is a quadratic curve whose control point `c` sits `bend` from the
// straight edge's middle along its normal, so bends of 12 and -12 draw two
// parallel bridges bulging to either side; `m` is then the curve's midpoint
// and `d` its direction there.
export function edgeGeometry(g, e) {
  const [x1, y1] = g.pos[e.u], [x2, y2] = g.pos[e.v], len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const d = [(x2 - x1) / len, (y2 - y1) / len], n = [-d[1], d[0]], pull = (NODE_R + 1) * g.k;
  if (e.bend) {
    const c = [(x1 + x2) / 2 + n[0] * e.bend, (y1 + y2) / 2 + n[1] * e.bend];
    const toward = ([x, y], [px, py]) => { const l = Math.hypot(px - x, py - y) || 1; return [x + (px - x) / l * pull, y + (py - y) / l * pull]; };
    const a = toward([x1, y1], c), b = toward([x2, y2], c), chord = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const dm = [(b[0] - a[0]) / chord, (b[1] - a[1]) / chord];
    return {a, b, c, m: [(a[0] + 2 * c[0] + b[0]) / 4, (a[1] + 2 * c[1] + b[1]) / 4], d: dm, n: [-dm[1], dm[0]], len, bend: e.bend};
  }
  const a = [x1 + d[0] * pull, y1 + d[1] * pull], b = [x2 - d[0] * pull, y2 - d[1] * pull];
  return {a, b, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d, n, len};
}
const f = n => Number(n.toFixed(2));
const pt = ([x, y]) => `${f(x)},${f(y)}`;
// One stroke along an edge: a line, or a path along a curved edge.
const edgeStroke = (cls, a, b, c) => c ? `<path class="${cls}" d="M${pt(a)} Q${pt(c)} ${pt(b)}" fill="none"` : `<line class="${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"`;
// A short stroke along a list of node ids (a route, a loop, a leak).
export function pathThrough(g, nodes, cls) {
  return nodes.length > 1 ? `<polyline class="${cls}" points="${nodes.map(id => pt(g.pos[id])).join(' ')}"/>` : '';
}

// The board. `opts.node(id)` and `opts.edge(i)` return how each one looks:
//   {cls, label, text, badge, act}  where `act` true makes it a control
//   (aria-label `label`, data-gb-node / data-gb-edge for wireGraph).
// Edges may also return `tag` (a price drawn on the link), `bar` (a closure
// mark across it) and `strokes` (extra classes drawn over the link, such as a
// route colour). `opts.under` and `opts.over` are SVG drawn below the links
// and above them (below the nodes). `opts.slide` marks a board where a finger
// slides from dot to dot: touch then draws instead of scrolling the page.
// (Browsers ignore touch-action on the shapes inside an svg, so it is the
// whole board or nothing.)
export function graphBoard(g, opts = {}) {
  const edge = opts.edge || (() => ({})), node = opts.node || (() => ({}));
  const links = g.edges.map(e => {
    const look = edge(e.i) || {}, {a, b, c, m, d, n} = edgeGeometry(g, e), A = ARROW * g.k, W = BAR * g.k;
    // The arrowhead follows the edge's direction where it arrives.
    const [hd, hn] = c ? (([x, y]) => { const l = Math.hypot(x, y) || 1; return [[x / l, y / l], [-y / l, x / l]]; })([b[0] - c[0], b[1] - c[1]]) : [d, n];
    const head = g.directed ? `<polygon class="gb-head" points="${pt(b)} ${pt([b[0] - hd[0] * A + hn[0] * A * .62, b[1] - hd[1] * A + hn[1] * A * .62])} ${pt([b[0] - hd[0] * A - hn[0] * A * .62, b[1] - hd[1] * A - hn[1] * A * .62])}"/>` : '';
    const lineEnd = g.directed ? [b[0] - hd[0] * A * .8, b[1] - hd[1] * A * .8] : b;
    const strokes = (look.strokes || []).map(cls => `${edgeStroke(`gb-stroke ${cls}`, a, lineEnd, c)}/>`).join('');
    const bar = look.bar ? `<line class="gb-bar" x1="${f(m[0] - n[0] * W)}" y1="${f(m[1] - n[1] * W)}" x2="${f(m[0] + n[0] * W)}" y2="${f(m[1] + n[1] * W)}"/>` : '';
    const tag = look.tag !== undefined && look.tag !== null ? `<g class="gb-tag" transform="translate(${pt(m)}) scale(${g.k})"><rect x="-4.3" y="-3.6" width="8.6" height="7.2" rx="2.4"/><text y="1.75">${esc(look.tag)}</text></g>` : '';
    const hit = look.act ? `${edgeStroke('gb-hit', a, b, c)} role="button" tabindex="0" aria-label="${esc(look.label || `${e.u} to ${e.v}`)}" data-gb-edge="${e.i}" data-focus="gb-edge-${e.i}"/>` : '';
    return `<g class="gb-edge ${look.cls || ''}" data-edge="${e.i}">${edgeStroke('gb-line', a, lineEnd, c)}/>${strokes}${head}${bar}${tag}${hit}</g>`;
  }).join('');
  const nodes = g.ids.map(id => {
    const look = node(id) || {}, [x, y] = g.pos[id];
    const control = look.act ? `role="button" tabindex="0" aria-label="${esc(look.label || id)}" data-gb-node="${esc(id)}" data-focus="gb-node-${esc(id)}"` : `role="img" aria-label="${esc(look.label || id)}"`;
    const badge = look.badge ? `<g class="gb-badge" transform="translate(${f(NODE_R * .78)},${f(-NODE_R * .78)})"><circle r="2.9"/><text y="1.15">${look.badge}</text></g>` : '';
    return `<g class="gb-node ${look.cls || ''}" transform="translate(${f(x)},${f(y)})${g.k === 1 ? '' : ` scale(${g.k})`}" data-node="${esc(id)}" ${control}><circle class="gb-reach" r="${NODE_R + 2.2}"/><circle class="gb-dot" r="${NODE_R}"/><text class="gb-label" y="${f(NODE_R * .36)}">${look.text ?? esc(id)}</text>${badge}</g>`;
  }).join('');
  return `<svg class="gb-board${opts.slide ? ' gb-slide' : ''} ${opts.cls || ''}" viewBox="-2 -2 104 ${f(g.height + 4)}" role="group" aria-label="${esc(opts.label || 'Map')}" data-gb-board>${opts.under || ''}<g class="gb-edges">${links}</g>${opts.over || ''}<g class="gb-nodes">${nodes}</g></svg>`;
}

// A small picture of the map, for a row of answers already found: every link
// thin, and the links that `opts.edge(i)` gives a class (such as `on`) drawn
// over them. A picture, never a control.
export function graphMini(g, opts = {}) {
  const edge = opts.edge || (() => '');
  const lines = g.edges.map(e => {
    const [x1, y1] = g.pos[e.u], [x2, y2] = g.pos[e.v];
    if (e.bend) { const {c} = edgeGeometry(g, e); return `${edgeStroke(`gb-mini-line ${edge(e.i) || ''}`, [x1, y1], [x2, y2], c)}/>`; }
    return `<line class="gb-mini-line ${edge(e.i) || ''}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
  }).join('');
  const dots = g.ids.map(id => `<circle class="gb-mini-dot" cx="${f(g.pos[id][0])}" cy="${f(g.pos[id][1])}" r="${f(NODE_R * .75 * g.k)}"/>`).join('');
  return `<svg class="gb-mini ${opts.cls || ''}" viewBox="-6 -6 112 ${f(g.height + 12)}" role="img" aria-label="${esc(opts.label || 'Map')}">${lines}${dots}</svg>`;
}

// Taps, keys and drag strokes. `handlers.node(id)` and `handlers.edge(i)` turn
// a tap into a move (or null for none); with `handlers.stroke`, a press on a
// node followed by a slide across others sends node(id) for each node entered,
// one move at a time, so Undo takes a stroke back step by step. With
// `handlers.nearest`, a tap where the wide hit areas of several links overlap
// (two curved bridges between one pair of places, say) goes to the link drawn
// nearest the finger rather than the one drawn last.
function nearestEdge(board, x, y) {
  const hits = document.elementsFromPoint(x, y).filter(el => el.dataset?.gbEdge !== undefined && board.contains(el));
  if (hits.length < 2) return hits[0] || null;
  const at = new DOMPoint(x, y).matrixTransform(board.getScreenCTM().inverse());
  const away = hit => {
    const line = hit.closest('.gb-edge')?.querySelector('.gb-line') || hit, total = line.getTotalLength();
    let best = Infinity;
    for (let k = 0; k <= 40; k++) { const q = line.getPointAtLength(total * k / 40); best = Math.min(best, Math.hypot(q.x - at.x, q.y - at.y)); }
    return best;
  };
  return hits.reduce((top, hit) => away(hit) < away(top) ? hit : top);
}
let stroke = null;
function strokeMove(e) {
  if (!stroke || e.pointerId !== stroke.pointer) return;
  const id = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-gb-node]')?.dataset.gbNode;
  if (!id || id === stroke.last) return;
  if (!stroke.moved) { stroke.moved = true; const first = stroke.handlers.node(stroke.last); if (first) stroke.apply(first); }
  stroke.last = id;
  const action = stroke.handlers.node(id);
  if (action) stroke.apply(action);
}
function strokeEnd(e) {
  if (!stroke || e.pointerId !== stroke.pointer) return;
  stroke.done = true;
  // The click that follows a slide belongs to the stroke, not to a tap.
  setTimeout(() => { if (stroke?.done) stroke = null; }, 0);
}
let listening = false;
export function wireGraph(root, handlers, apply) {
  const board = root.querySelector('[data-gb-board]');
  if (!board) return;
  const act = control => {
    if (control.dataset.gbNode !== undefined) return handlers.node?.(control.dataset.gbNode);
    if (control.dataset.gbEdge !== undefined) return handlers.edge?.(Number(control.dataset.gbEdge));
    return null;
  };
  board.addEventListener('click', e => {
    let control = e.target.closest('[data-gb-node],[data-gb-edge]');
    if (!control || !board.contains(control)) return;
    if (handlers.nearest && control.dataset.gbEdge !== undefined && e.detail > 0) control = nearestEdge(board, e.clientX, e.clientY) || control;
    if (stroke?.moved) { stroke = null; return; }
    stroke = null;
    const action = act(control);
    if (action) apply(action);
  });
  board.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key)) return;
    const control = e.target.closest('[data-gb-node],[data-gb-edge]');
    if (!control) return;
    e.preventDefault();
    const action = act(control);
    if (action) apply(action);
  });
  if (!handlers.stroke) return;
  if (!listening) { document.addEventListener('pointermove', strokeMove); document.addEventListener('pointerup', strokeEnd); document.addEventListener('pointercancel', strokeEnd); listening = true; }
  if (stroke && !stroke.done) { stroke.handlers = handlers; stroke.apply = apply; }
  board.addEventListener('pointerdown', e => {
    const id = e.target.closest('[data-gb-node]')?.dataset.gbNode;
    if (id === undefined || e.button > 0) return;
    stroke = {pointer: e.pointerId, last: id, moved: false, done: false, handlers, apply};
  });
}
