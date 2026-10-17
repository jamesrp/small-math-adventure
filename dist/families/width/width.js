// Snug spinners (Week 59): give a curved shape its arcs, one across each gap
// between neighbouring corners, by choosing where each arc is centred. When
// every gap has its arc, the shape turns between two rails: the bottom rail
// stays put and the top rail rests on the shape. A top rail that never moves
// shows the shape has the same width every way round; the turn where it moves
// shows that it does not.
//
// Every choice is exact. Corners and dots are points of Q(√r) (surd.js), an
// arc may be centred on a point only when that point is exactly as far from
// both ends of the gap, and a shape is a solve exactly when every arc is
// centred on a corner and all the arcs have the same radius: the Reuleaux
// polygon of the given corners. Floating point is used only to draw and to
// choose which turn to stop at when showing a failure.
import {esc} from '../../expansion-controls.js';
import {geometry} from './surd.js';

const TAU = 2 * Math.PI;
const SIZE = 360, MID = 180, FLOOR = 334, RAIL = 7, REACH = 154;
const POINT_REACH = 17, GAP_REACH = 22;
const STEPS = 720;

const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isPlayground = p => p.parameters.mode === 'playground';
const fix = x => Math.round(x * 100) / 100;

// ---------------------------------------------------------------------------
// The exact layer: which points may centre which gap, and the solve test.

const exactMemo = new WeakMap();
export function exactOf(p) {
  const q = p.parameters;
  let e = exactMemo.get(q);
  if (e) return e;
  const g = geometry(q.field, {...q.corners, ...(q.pins || {})});
  const order = q.order, n = order.length, points = [...order, ...Object.keys(q.pins || {})];
  const gaps = order.map((a, i) => {
    const b = order[(i + 1) % n];
    const joins = points.filter(c => c !== a && c !== b && g.F.eq(g.d2(c, a), g.d2(c, b)));
    return {a, b, joins, r2: Object.fromEntries(joins.map(c => [c, g.d2(c, a)]))};
  });
  e = {g, order, n, points, gaps};
  exactMemo.set(q, e);
  return e;
}
// A point may centre a gap's arc when it is exactly as far from both ends.
export const joinable = (p, gap, at) => Boolean(exactOf(p).gaps[gap]?.joins.includes(at));
const complete = arcs => arcs.every(c => c != null);
// The solve: every arc centred on a corner, every radius the same (exactly).
export function snug(p, arcs) {
  const e = exactOf(p);
  if (!Array.isArray(arcs) || arcs.length !== e.n || !complete(arcs)) return false;
  if (!arcs.every((c, i) => e.order.includes(c) && joinable(p, i, c))) return false;
  const r0 = e.gaps[0].r2[arcs[0]];
  return arcs.every((c, i) => e.g.F.eq(e.gaps[i].r2[c], r0));
}

// ---------------------------------------------------------------------------
// The float layer: positions, arcs, the support function and the width.

export function arcOf(c, a, b) {
  const rho = Math.hypot(a[0] - c[0], a[1] - c[1]);
  const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
  let span = Math.atan2(b[1] - c[1], b[0] - c[0]) - a0;
  while (span < -1e-12) span += TAU;
  while (span >= TAU - 1e-12) span -= TAU;
  return {c, rho, a0, span};
}
const within = (arc, t) => { const d = (((t - arc.a0) % TAU) + TAU) % TAU; return d <= arc.span + 1e-12; };
// The support function h(u) = max of x·u over the shape, and a point where
// the maximum is reached (where a rail perpendicular to u touches).
export function support(shape, ux, uy) {
  if (shape.ellipse) {
    const {c, a, b} = shape.ellipse, k = Math.hypot(a * ux, b * uy);
    return {h: c[0] * ux + c[1] * uy + k, at: [c[0] + a * a * ux / k, c[1] + b * b * uy / k]};
  }
  let h = -Infinity, at = null;
  for (const pt of shape.corners) { const v = pt[0] * ux + pt[1] * uy; if (v > h) { h = v; at = pt; } }
  const t = Math.atan2(uy, ux);
  for (const arc of shape.arcs) {
    if (!arc || !within(arc, t)) continue;
    const v = arc.c[0] * ux + arc.c[1] * uy + arc.rho;
    if (v > h + 1e-12) { h = v; at = [arc.c[0] + arc.rho * ux, arc.c[1] + arc.rho * uy]; }
  }
  return {h, at};
}
// Turned by α (counterclockwise), the shape's "up" is u = (sin α, cos α).
export const widthAt = (shape, alpha) => { const ux = Math.sin(alpha), uy = Math.cos(alpha); return support(shape, ux, uy).h + support(shape, -ux, -uy).h; };

const layoutMemo = new WeakMap();
function arcSamples(arc, k = 24) { return Array.from({length: k + 1}, (_, j) => { const t = arc.a0 + arc.span * j / k; return [arc.c[0] + arc.rho * Math.cos(t), arc.c[1] + arc.rho * Math.sin(t)]; }); }
// Positions in the plane, the centre G of the corners and the drawing scale,
// chosen so that every shape the puzzle allows fits in either view.
export function layoutOf(p) {
  const q = p.parameters;
  let L = layoutMemo.get(q);
  if (L) return L;
  const e = exactOf(p);
  const xy = Object.fromEntries(e.points.map(id => [id, e.g.xy(id)]));
  const G = [0, 1].map(k => e.order.reduce((sum, id) => sum + xy[id][k], 0) / e.n);
  const turn = (q.turn || 0) * Math.PI / 180, c = Math.cos(turn), sn = Math.sin(turn), all = [];
  e.points.forEach(id => all.push(xy[id]));
  e.gaps.forEach(gap => gap.joins.forEach(k => all.push(...arcSamples(arcOf(xy[k], xy[gap.a], xy[gap.b])))));
  const R = Math.max(...all.map(pt => Math.hypot(pt[0] - G[0], pt[1] - G[1]))), s = REACH / R;
  // The build view centres the box round everything that can be drawn;
  // `home` is where G sits on the board then.
  const xs = all.map(pt => c * (pt[0] - G[0]) - sn * (pt[1] - G[1])), ys = all.map(pt => sn * (pt[0] - G[0]) + c * (pt[1] - G[1]));
  const home = [MID - s * (Math.min(...xs) + Math.max(...xs)) / 2, MID + s * (Math.min(...ys) + Math.max(...ys)) / 2];
  L = {xy, G, R, s, turn, home};
  layoutMemo.set(q, L);
  return L;
}
export function shapeOf(p, arcs) {
  const e = exactOf(p), {xy} = layoutOf(p);
  return {corners: e.order.map(id => xy[id]), arcs: arcs.map((c, i) => c == null ? null : arcOf(xy[c], xy[e.gaps[i].a], xy[e.gaps[i].b]))};
}

// Where to stop when the shape is not snug: the turn (from the starting
// position, within half a turn) where the gap between the rails has changed
// the most. Memoised per board.
const verdictMemo = new Map();
export function verdictOf(p, arcs) {
  const key = `${p.id}|${p.revision}|${arcs.join(',')}`;
  if (verdictMemo.has(key)) return verdictMemo.get(key);
  const shape = shapeOf(p, arcs), {turn} = layoutOf(p), w0 = widthAt(shape, turn);
  let worst = 0, at = 0;
  for (let k = 1; k < STEPS; k++) {
    const th = Math.PI * k / STEPS, d = Math.abs(widthAt(shape, turn + th) - w0);
    if (d > worst + 1e-12) { worst = d; at = th; }
  }
  const v = {ok: snug(p, arcs), w0, worst, at};
  if (verdictMemo.size > 400) verdictMemo.clear();
  verdictMemo.set(key, v);
  return v;
}

// ---------------------------------------------------------------------------
// Drawing: math coordinates (y up) to the board (y down), turned by α.

const placer = (G, s, alpha, cx, cy) => {
  const c = Math.cos(alpha), sn = Math.sin(alpha);
  return pt => [cx + s * (c * (pt[0] - G[0]) - sn * (pt[1] - G[1])), cy - s * (sn * (pt[0] - G[0]) + c * (pt[1] - G[1]))];
};
const P = pt => `${fix(pt[0])} ${fix(pt[1])}`;
// A corner's letter, a little inside the shape from the corner.
const inward = (at, G, pt, k = 13) => { const c = at(pt), g = at(G), d = Math.hypot(g[0] - c[0], g[1] - c[1]) || 1; return [c[0] + k * (g[0] - c[0]) / d, c[1] + k * (g[1] - c[1]) / d]; };
// The outline: arcs where there are arcs, straight chords elsewhere. An arc
// turns counterclockwise round its centre, which on the board (y down) is
// SVG's sweep flag 0.
function outline(shape, at, s, alpha) {
  if (shape.ellipse) {
    const {c, a, b} = shape.ellipse, rot = fix(-alpha * 180 / Math.PI), p1 = at([c[0] + a, c[1]]), p2 = at([c[0] - a, c[1]]);
    return `M${P(p1)}A${fix(a * s)} ${fix(b * s)} ${rot} 1 0 ${P(p2)}A${fix(a * s)} ${fix(b * s)} ${rot} 1 0 ${P(p1)}Z`;
  }
  const n = shape.corners.length;
  let d = `M${P(at(shape.corners[0]))}`;
  for (let i = 0; i < n; i++) {
    const end = at(shape.corners[(i + 1) % n]), arc = shape.arcs[i];
    d += arc ? `A${fix(arc.rho * s)} ${fix(arc.rho * s)} 0 ${arc.span > Math.PI + 1e-9 ? 1 : 0} 0 ${P(end)}` : `L${P(end)}`;
  }
  return `${d}Z`;
}
const piece = (arc, a, b, at, s) => arc ? `M${P(at(a))}A${fix(arc.rho * s)} ${fix(arc.rho * s)} 0 ${arc.span > Math.PI + 1e-9 ? 1 : 0} 0 ${P(at(b))}` : `M${P(at(a))}L${P(at(b))}`;

// One frame of the spin: the shape turned by θ past its starting turn,
// resting on the floor; the top rail rests on its top. `lift` in [0, 1]
// slides it from where the build view drew it (0) down to the floor (1).
export function spinFrame(shape, G, s, turn, theta, lift = 1, home = [MID, MID]) {
  const alpha = turn + theta, ux = Math.sin(alpha), uy = Math.cos(alpha);
  const up = support(shape, ux, uy), down = support(shape, -ux, -uy);
  const rest = FLOOR - s * (down.h + G[0] * ux + G[1] * uy);
  const at = placer(G, s, alpha, home[0] + (MID - home[0]) * lift, home[1] + (rest - home[1]) * lift);
  return {at, alpha, d: outline(shape, at, s, alpha), width: up.h + down.h, top: FLOOR - s * (up.h + down.h), touch: [at(up.at), at(down.at)]};
}

// ---------------------------------------------------------------------------
// View-only state, kept outside the save: the chosen gap, a compass miss,
// whether a full shape is shown built or spinning, and the replay count.
// Each is tied to the board it was chosen on, so any move or Undo resets it.

const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {replay: 0}); return uiState.get(p.id); };
const keyOf = b => (b.arcs || []).map(c => c ?? '-').join(',');

function selected(p, b, hinted) {
  const u = ui(p), key = keyOf(b);
  if (u.sel?.key === key) return u.sel.gap;
  if (hinted) return hinted.gap;
  const empty = b.arcs.findIndex(c => c == null);
  return empty >= 0 ? empty : null;
}
function viewOf(p, a) {
  const b = a.board;
  if (!complete(b.arcs)) return 'build';
  const u = ui(p);
  return u.view?.key === keyOf(b) ? u.view.mode : 'spin';
}

// ---------------------------------------------------------------------------
// Mechanic hooks for the puzzles.

function fresh(p) {
  if (isPlayground(p)) return {shape: 0};
  return {arcs: (p.parameters.start || p.parameters.order.map(() => null)).slice()};
}
function valid(p, b) {
  if (!object(b)) return false;
  if (isPlayground(p)) return Object.keys(b).length === 1 && Number.isInteger(b.shape) && b.shape >= 0 && b.shape < p.parameters.shapes.length;
  const e = exactOf(p);
  if (Object.keys(b).length !== 1 || !Array.isArray(b.arcs) || b.arcs.length !== e.n) return false;
  return b.arcs.every((c, i) => c === null || (typeof c === 'string' && joinable(p, i, c)));
}
const solved = (p, b) => !isPlayground(p) && valid(p, b) && snug(p, b.arcs);
function move(p, b, action) {
  if (!object(action) || !valid(p, b)) return null;
  if (isPlayground(p)) {
    if (action.type !== 'shape' || !Number.isInteger(action.shape) || action.shape === b.shape || action.shape < 0 || action.shape >= p.parameters.shapes.length) return null;
    return {shape: action.shape};
  }
  if (action.type !== 'arc' || !Number.isInteger(action.gap) || typeof action.at !== 'string') return null;
  if (!joinable(p, action.gap, action.at) || b.arcs[action.gap] === action.at) return null;
  const arcs = b.arcs.slice();
  arcs[action.gap] = action.at;
  return {arcs};
}
const hintMemo = new Map();
function hint(p, b) {
  if (isPlayground(p)) return {type: 'note'};
  if (!valid(p, b)) return {type: 'note'};
  if (snug(p, b.arcs)) return {type: 'done'};
  const key = `${p.id}|${keyOf(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  const e = exactOf(p), want = p.solution.arcs;
  // A wrong arc first, then the first gap with none.
  let gap = b.arcs.findIndex((c, i) => c != null && c !== want[i]);
  if (gap < 0) gap = b.arcs.findIndex(c => c == null);
  const {a, b: end} = e.gaps[gap];
  const out = {type: 'move', action: {type: 'arc', gap, at: want[gap]}, gap, text: `Centre the arc from ${a} to ${end} on ${want[gap]}.`};
  if (hintMemo.size > 400) hintMemo.clear();
  hintMemo.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Rendering a puzzle.

const nameOf = (p, id) => p.parameters.names?.[id] || `Corner ${id}`;
const gapName = (p, i) => { const {a, b} = exactOf(p).gaps[i]; return `${a} to ${b}`; };

function buildSvg(p, a, hinted) {
  const b = a.board, e = exactOf(p), L = layoutOf(p), {xy, G, s, turn, home} = L;
  const at = placer(G, s, turn, home[0], home[1]), shape = shapeOf(p, b.arcs), u = ui(p), key = keyOf(b);
  const sel = selected(p, b, hinted), miss = u.miss?.key === key && u.miss.gap === sel ? u.miss : null;
  const full = complete(b.arcs);
  const parts = [`<rect class="wd-paper" x="0" y="0" width="${SIZE}" height="${SIZE}" rx="14"/>`];
  parts.push(`<path class="wd-fill${full ? ' full' : ''}" d="${outline(shape, at, s, turn)}"/>`);
  // The chosen gap glows under its chord or arc.
  if (sel != null) parts.push(`<path class="wd-glow" d="${piece(shape.arcs[sel], xy[e.gaps[sel].a], xy[e.gaps[sel].b], at, s)}"/>`);
  if (hinted) parts.push(`<path class="wd-hint-gap" d="${piece(shape.arcs[hinted.gap], xy[e.gaps[hinted.gap].a], xy[e.gaps[hinted.gap].b], at, s)}"/>`);
  e.gaps.forEach((gap, i) => {
    const arc = shape.arcs[i];
    parts.push(`<path class="${arc ? 'wd-arc' : 'wd-chord'}" d="${piece(arc, xy[gap.a], xy[gap.b], at, s)}"/>`);
  });
  // The chosen arc's compass: its centre and the two radii it was drawn with.
  if (sel != null && b.arcs[sel] && !miss) {
    const c = at(xy[b.arcs[sel]]);
    for (const end of [e.gaps[sel].a, e.gaps[sel].b]) parts.push(`<path class="wd-leg" d="M${P(c)}L${P(at(xy[end]))}"/>`);
  }
  // A compass that misses: round the tapped point from the first end, past
  // the second end, and the gap between that circle and the second end.
  if (miss) {
    const gap = e.gaps[miss.gap], c = xy[miss.at], A = xy[gap.a], B = xy[gap.b];
    const arc = arcOf(c, A, B), over = 0.22, from = arc.a0, to = arc.a0 + arc.span + over;
    const k = 32, pts = Array.from({length: k + 1}, (_, j) => { const t = from + (to - from) * j / k; return at([c[0] + arc.rho * Math.cos(t), c[1] + arc.rho * Math.sin(t)]); });
    const tb = Math.atan2(B[1] - c[1], B[0] - c[0]), onCircle = at([c[0] + arc.rho * Math.cos(tb), c[1] + arc.rho * Math.sin(tb)]);
    parts.push(`<path class="wd-leg" d="M${P(at(c))}L${P(at(A))}"/>`);
    parts.push(`<path class="wd-miss" d="M${pts.map(P).join('L')}"/>`);
    parts.push(`<path class="wd-short" d="M${P(onCircle)}L${P(at(B))}"/>`);
  }
  // Hit areas for the gaps, under the points.
  e.gaps.forEach((gap, i) => {
    const arc = shape.arcs[i], label = `${arc ? `Arc from ${gapName(p, i)}, centred on ${nameOf(p, b.arcs[i]).replace(/^Corner /, '')}` : `Gap from ${gapName(p, i)}`}${sel === i ? ', chosen' : ''}`;
    parts.push(`<path class="wd-hit wd-gap" role="button" tabindex="0" data-gap="${i}" data-focus="wd-gap-${i}" aria-pressed="${sel === i}" aria-label="${esc(label)}" d="${piece(arc, xy[gap.a], xy[gap.b], at, s)}"/>`);
  });
  const centre = sel != null ? b.arcs[sel] : null, ends = sel != null ? [e.gaps[sel].a, e.gaps[sel].b] : [];
  for (const id of Object.keys(p.parameters.pins || {})) {
    const [x, y] = at(xy[id]);
    const cls = ['wd-pt', 'wd-pin', id === centre ? 'centre' : '', miss?.at === id ? 'missed' : ''].join(' ');
    parts.push(`<g class="${cls}" role="button" tabindex="0" data-pt="${esc(id)}" data-focus="wd-pt-${esc(id)}" aria-label="${esc(nameOf(p, id))}"><circle class="wd-pad" cx="${fix(x)}" cy="${fix(y)}" r="${POINT_REACH}"/><circle class="wd-dot" cx="${fix(x)}" cy="${fix(y)}" r="5.5"/></g>`);
  }
  for (const id of e.order) {
    const [x, y] = at(xy[id]);
    const cls = ['wd-pt', 'wd-corner', id === centre ? 'centre' : '', ends.includes(id) ? 'end' : '', miss?.at === id ? 'missed' : '', hinted?.action.at === id ? 'hinted' : ''].join(' ');
    parts.push(`<g class="${cls}" role="button" tabindex="0" data-pt="${esc(id)}" data-focus="wd-pt-${esc(id)}" aria-label="${esc(nameOf(p, id))}"><circle class="wd-pad" cx="${fix(x)}" cy="${fix(y)}" r="${POINT_REACH}"/><circle class="wd-disc" cx="${fix(x)}" cy="${fix(y)}" r="12.5"/><text x="${fix(x)}" y="${fix(y)}">${esc(id)}</text></g>`);
  }
  return {svg: `<svg class="wd-board" data-view="build" viewBox="0 0 ${SIZE} ${SIZE}" role="group" aria-label="Corners and gaps">${parts.join('')}</svg>`, sel, miss};
}

function railsSvg(top, cls = '') {
  return `<rect class="wd-rail wd-floor" x="6" y="${FLOOR}" width="${SIZE - 12}" height="${RAIL}" rx="3"/><rect class="wd-rail wd-top${cls}" x="6" y="${fix(top - RAIL)}" width="${SIZE - 12}" height="${RAIL}" rx="3"/>`;
}
function spinSvg(p, a, hinted) {
  const b = a.board, e = exactOf(p), {G, s, turn, xy} = layoutOf(p), shape = shapeOf(p, b.arcs), v = verdictOf(p, b.arcs);
  const start = spinFrame(shape, G, s, turn, 0), end = v.ok ? start : spinFrame(shape, G, s, turn, v.at);
  const parts = [`<rect class="wd-paper" x="0" y="0" width="${SIZE}" height="${SIZE}" rx="14"/>`];
  // Final-frame marks: other turns of a snug shape between the same rails,
  // or the band between where the top rail started and where it is now.
  const fin = [];
  if (v.ok) {
    for (const k of [1, 2, 3]) fin.push(`<path class="wd-ghost" d="${spinFrame(shape, G, s, turn, k * Math.PI / 4).d}"/>`);
  } else {
    const y0 = Math.min(start.top, end.top), y1 = Math.max(start.top, end.top);
    fin.push(`<rect class="wd-band" x="6" y="${fix(y0 - RAIL)}" width="${SIZE - 12}" height="${fix(y1 - y0)}"/>`);
  }
  parts.push(`<g class="wd-final">${fin.join('')}</g>`);
  parts.push(`<path class="wd-shape" d="${end.d}"/>`);
  parts.push(`<path class="wd-start" d="M6 ${fix(start.top - RAIL / 2)}H${SIZE - 6}"/>`);
  parts.push(railsSvg(end.top, v.ok ? ' snug' : ''));
  parts.push(`<g class="wd-final">${end.touch.map(([x, y]) => `<circle class="wd-touch${v.ok ? ' snug' : ''}" cx="${fix(x)}" cy="${fix(y)}" r="4.5"/>`).join('')}</g>`);
  if (hinted) {
    const gap = e.gaps[hinted.gap], [x, y] = end.at(xy[hinted.action.at]);
    parts.push(`<g class="wd-final"><path class="wd-hint-gap" d="${piece(shape.arcs[hinted.gap], xy[gap.a], xy[gap.b], end.at, s)}"/><circle class="wd-hint-ring" cx="${fix(x)}" cy="${fix(y)}" r="13"/></g>`);
  }
  e.order.forEach(id => { const [x, y] = inward(end.at, G, xy[id]); parts.push(`<text class="wd-letter" data-letter="${esc(id)}" x="${fix(x)}" y="${fix(y)}">${esc(id)}</text>`); });
  // Tap an arc to change it.
  e.gaps.forEach((gap, i) => {
    parts.push(`<path class="wd-hit wd-gap" role="button" tabindex="0" data-gap="${i}" data-focus="wd-gap-${i}" aria-label="${esc(`Arc from ${gapName(p, i)}, centred on ${nameOf(p, b.arcs[i]).replace(/^Corner /, '')}`)}" d="${piece(shape.arcs[i], xy[gap.a], xy[gap.b], end.at, s)}"/>`);
  });
  return `<svg class="wd-board" data-view="spin" viewBox="0 0 ${SIZE} ${SIZE}" role="group" aria-label="The shape between two rails">${parts.join('')}</svg>`;
}

function renderPuzzle(p, a) {
  const b = a.board, done = snug(p, b.arcs), view = viewOf(p, a);
  const hinted = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const full = complete(b.arcs);
  const spinPayload = esc(JSON.stringify({view: 'spin'}));
  const bar = `<div class="wd-bar"><button type="button" class="secondary wd-spin" data-action="mechanic-ui" data-ui="${spinPayload}" data-focus="wd-spin"${full ? '' : ' disabled'} aria-label="${view === 'spin' ? 'Spin again' : 'Spin'}"><span aria-hidden="true">↻</span> Spin</button></div>`;
  let svg, status;
  if (view === 'spin') {
    svg = spinSvg(p, a, hinted);
    const v = verdictOf(p, b.arcs);
    status = v.ok ? 'The shape turns all the way round and the top rail never moves.' : `Turned ${Math.round(v.at * 180 / Math.PI)} degrees, the top rail has moved ${widthAt(shapeOf(p, b.arcs), layoutOf(p).turn + v.at) > v.w0 ? 'up' : 'down'}.`;
  } else {
    const built = buildSvg(p, a, hinted);
    svg = built.svg;
    const sel = built.sel;
    status = sel == null ? 'Choose a gap.' : built.miss ? `A circle round ${nameOf(p, built.miss.at).replace(/^Corner /, '')} from ${exactOf(p).gaps[sel].a} misses ${exactOf(p).gaps[sel].b}.` : `Gap from ${gapName(p, sel)} chosen${b.arcs[sel] ? `, centred on ${nameOf(p, b.arcs[sel]).replace(/^Corner /, '')}` : ''}.`;
  }
  return `<div class="wd-puzzle${done ? ' solved' : ''}" data-mechanic-wire="width" data-view="${view}">${bar}${svg}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// ---------------------------------------------------------------------------
// The playground: ready-made shapes turned by hand between closing rails.

const playMemo = new WeakMap();
function playShapes(p) {
  const q = p.parameters;
  let list = playMemo.get(q);
  if (list) return list;
  list = q.shapes.map(sh => {
    if (sh.ellipse) return {name: sh.name, shape: {ellipse: {c: [0, 0], a: sh.ellipse[0], b: sh.ellipse[1]}}, G: [0, 0]};
    const corners = sh.corners, n = corners.length;
    const arcs = (sh.centres || corners.map(() => null)).map((c, i) => c ? arcOf(c, corners[i], corners[(i + 1) % n]) : null);
    const G = sh.mark || [0, 1].map(k => corners.reduce((sum, pt) => sum + pt[k], 0) / n);
    return {name: sh.name, shape: {corners, arcs}, G};
  });
  playMemo.set(q, list);
  return list;
}
// The turn, and the highest and lowest the top rail has been, for the shape
// on the board; a new shape starts unturned.
function playUi(p, b) {
  const u = ui(p);
  if (u.shape !== b.shape) { const top = playFrame(playShapes(p)[b.shape], 0).top; Object.assign(u, {shape: b.shape, turn: 0, hi: top, lo: top}); }
  return u;
}
function notePlay(p, u) {
  if (u.shape == null) return;
  const f = playFrame(playShapes(p)[u.shape], u.turn);
  u.hi = Math.min(u.hi, f.top);
  u.lo = Math.max(u.lo, f.top);
}
const PLAY_SCALE = 3.2, PLAY_STEP = 5;
function playFrame(item, deg) { return spinFrame(item.shape, item.G, PLAY_SCALE, 0, deg * Math.PI / 180); }
function iconOf(item) {
  const sh = item.shape, k = 0.3, at = placer(item.G, k, 0, 20, 20);
  return `<svg class="wd-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="${outline(sh, at, k, 0)}"/></svg>`;
}
function renderPlay(p, a) {
  const b = a.board, list = playShapes(p), item = list[b.shape], u = playUi(p, b);
  const f = playFrame(item, u.turn), start = playFrame(item, 0);
  const mark = f.at(item.G);
  const hi = Math.min(u.hi, f.top), lo = Math.max(u.lo, f.top);
  const picker = `<div class="wd-bar wd-shapes" role="group" aria-label="Shape">${list.map((it, k) => `<button type="button" class="secondary wd-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'shape', shape: k}))}" data-focus="wd-pick-${k}" aria-pressed="${k === b.shape}" aria-label="${esc(it.name)}"${k === b.shape ? ' disabled' : ''}>${iconOf(it)}</button>`).join('')}</div>`;
  const parts = [`<rect class="wd-paper" x="0" y="0" width="${SIZE}" height="${SIZE}" rx="14"/>`];
  // The gap gauge: dashed lines at the highest and lowest the top rail has been.
  parts.push(`<rect class="wd-band soft" x="6" y="${fix(hi - RAIL)}" width="${SIZE - 12}" height="${lo - hi < 0.5 ? 0 : fix(lo - hi)}"/>`);
  parts.push(`<path class="wd-start" d="M6 ${fix(start.top - RAIL / 2)}H${SIZE - 6}"/>`);
  parts.push(`<path class="wd-shape" d="${f.d}"/>`);
  parts.push(railsSvg(f.top));
  parts.push(`<circle class="wd-mark" cx="${fix(mark[0])}" cy="${fix(mark[1])}" r="4.5"/><text class="wd-mark-label" x="${fix(mark[0] + 9)}" y="${fix(mark[1] - 8)}">O</text>`);
  const board = `<svg class="wd-board wd-turnable" data-view="play" viewBox="0 0 ${SIZE} ${SIZE}" role="slider" tabindex="0" data-focus="wd-turn" aria-label="${esc(`${item.name}, turned`)}" aria-valuemin="0" aria-valuemax="359" aria-valuenow="${((u.turn % 360) + 360) % 360}" aria-valuetext="${((u.turn % 360) + 360) % 360} degrees">${parts.join('')}</svg>`;
  const turns = `<div class="wd-bar wd-turns"><button type="button" class="secondary wd-turn-button" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({turn: 15}))}" data-focus="wd-turn-left" aria-label="Turn left"><span aria-hidden="true">↺</span></button><button type="button" class="secondary wd-turn-button" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({turn: -15}))}" data-focus="wd-turn-right" aria-label="Turn right"><span aria-hidden="true">↻</span></button></div>`;
  return `<div class="wd-puzzle wd-play" data-mechanic-wire="width" data-view="play">${picker}${board}${turns}<p class="sr-only" role="status">${esc(`${item.name}, turned ${((u.turn % 360) + 360) % 360} degrees.`)}</p></div>`;
}


// ---------------------------------------------------------------------------
// Gestures. A tap goes to the nearest corner or dot within reach (they sit on
// top), and otherwise to the nearest gap or arc within reach. The spin plays
// once for each new full shape, and again on Spin.

let seen = null;
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function toBoard(svg, x, y) {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const pt = new DOMPoint(x, y).matrixTransform(m.inverse());
  return [pt.x, pt.y];
}
function nearest(svg, at, view) {
  let best = null, near = POINT_REACH;
  if (view === 'build') for (const el of svg.querySelectorAll('.wd-pt')) {
    const c = el.querySelector('.wd-pad'), d = Math.hypot(at[0] - Number(c.getAttribute('cx')), at[1] - Number(c.getAttribute('cy')));
    if (d < near) { near = d; best = {pt: el.dataset.pt}; }
  }
  if (best) return best;
  near = GAP_REACH;
  for (const el of svg.querySelectorAll('.wd-gap')) {
    const len = el.getTotalLength?.() || 0, k = Math.max(8, Math.ceil(len / 6));
    for (let j = 0; j <= k; j++) {
      const q = el.getPointAtLength(len * j / k), d = Math.hypot(at[0] - q.x, at[1] - q.y);
      if (d < near) { near = d; best = {gap: Number(el.dataset.gap)}; }
    }
  }
  return best;
}
function act(p, api, target) {
  const a = api.attempt(), b = a.board, u = ui(p), key = keyOf(b), view = viewOf(p, a);
  if (!target || snug(p, b.arcs)) return;
  if (target.gap != null) {
    u.sel = {gap: target.gap, key};
    u.miss = null;
    if (view === 'spin') u.view = {mode: 'build', key};
    api.ui({});
    return;
  }
  if (view !== 'build') return;
  const hinted = a.hintLevel >= 2 ? hint(p, b) : null, gap = selected(p, b, hinted?.type === 'move' ? hinted : null);
  if (gap == null) return;
  const {a: from, b: to} = exactOf(p).gaps[gap];
  if (target.pt === from || target.pt === to) return;
  if (!joinable(p, gap, target.pt)) { u.miss = {gap, at: target.pt, key}; u.sel = {gap, key}; api.ui({}); return; }
  if (b.arcs[gap] === target.pt) return;
  u.miss = null;
  u.sel = null;
  u.view = null;
  api.apply({type: 'arc', gap, at: target.pt});
}

function animate(root, p, a) {
  const svg = root.querySelector('svg[data-view="spin"]');
  const shape = shapeOf(p, a.board.arcs), {G, s, turn, xy, home} = layoutOf(p), v = verdictOf(p, a.board.arcs);
  const el = {shape: svg.querySelector('.wd-shape'), top: svg.querySelector('.wd-top'), letters: [...svg.querySelectorAll('.wd-letter')]};
  const lift = 450, spin = v.ok ? 2600 : Math.max(700, 1700 * v.at / Math.PI), goal = v.ok ? TAU : v.at;
  const ease = t => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  let stop = false, t0 = null;
  const draw = (theta, up) => {
    const f = spinFrame(shape, G, s, turn, theta, up, home);
    el.shape.setAttribute('d', f.d);
    el.top.setAttribute('y', fix((up < 1 ? -RAIL + (f.top + RAIL) * up : f.top) - RAIL));
    el.letters.forEach(t => { const [x, y] = inward(f.at, G, xy[t.dataset.letter]); t.setAttribute('x', fix(x)); t.setAttribute('y', fix(y)); });
  };
  const finish = () => { if (stop) return; stop = true; draw(goal === TAU ? 0 : goal, 1); root.classList.remove('wd-anim'); };
  root.classList.add('wd-anim');
  draw(0, 0);
  svg.addEventListener('pointerdown', finish, {capture: true, once: true});
  const step = now => {
    if (stop || !svg.isConnected) return;
    t0 ??= now;
    const t = now - t0;
    if (t < lift) draw(0, ease(t / lift));
    else if (t < lift + spin) draw(goal * ease((t - lift) / spin), 1);
    else { finish(); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function wirePuzzle(root, p, api) {
  const svg = root.querySelector('svg.wd-board');
  if (!svg) return;
  const view = svg.dataset.view;
  svg.addEventListener('click', e => {
    const at = toBoard(svg, e.clientX, e.clientY);
    if (at) act(p, api, nearest(svg, at, view));
  });
  svg.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target.closest?.('[data-gap],[data-pt]');
    if (!el) return;
    e.preventDefault();
    act(p, api, el.dataset.pt ? {pt: el.dataset.pt} : {gap: Number(el.dataset.gap)});
  });
  if (view !== 'spin') return;
  const a = api.attempt(), key = `${p.id}|${keyOf(a.board)}|${ui(p).replay}`, before = seen;
  seen = key;
  if (before === key || reduced() || typeof requestAnimationFrame !== 'function') return;
  animate(root, p, a);
}

function wirePlay(root, p, api) {
  const svg = root.querySelector('svg.wd-turnable');
  if (!svg) return;
  const b = api.attempt().board, item = playShapes(p)[b.shape], u = playUi(p, b);
  const els = {shape: svg.querySelector('.wd-shape'), top: svg.querySelector('.wd-top'), mark: svg.querySelector('.wd-mark'), label: svg.querySelector('.wd-mark-label'), band: svg.querySelector('.wd-band')};
  const centre = () => { const f = playFrame(item, u.turn); return f.at(item.G); };
  let drag = null;
  const show = deg => {
    const f = playFrame(item, deg), m = f.at(item.G);
    els.shape.setAttribute('d', f.d);
    els.top.setAttribute('y', fix(f.top - RAIL));
    els.mark.setAttribute('cx', fix(m[0])); els.mark.setAttribute('cy', fix(m[1]));
    els.label.setAttribute('x', fix(m[0] + 9)); els.label.setAttribute('y', fix(m[1] - 8));
    notePlay(p, u);
    els.band.setAttribute('y', fix(u.hi - RAIL));
    els.band.setAttribute('height', u.lo - u.hi < 0.5 ? 0 : fix(u.lo - u.hi));
  };
  // Drag round the shape to turn it; the angle is measured round where the
  // mark O was when the drag began.
  const angle = (at, c) => Math.atan2(-(at[1] - c[1]), at[0] - c[0]);
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    const at = toBoard(svg, e.clientX, e.clientY), c = centre();
    if (!at) return;
    drag = {id: e.pointerId, c, last: angle(at, c), total: 0, turn: u.turn};
    svg.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const at = toBoard(svg, e.clientX, e.clientY);
    if (!at) return;
    const now = angle(at, drag.c), d = now - drag.last;
    drag.last = now;
    drag.total += Math.atan2(Math.sin(d), Math.cos(d));
    const deg = Math.round(drag.turn + drag.total * 180 / Math.PI);
    if (deg !== u.turn) { u.turn = deg; show(deg); }
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    api.ui({});
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('keydown', e => {
    const k = {ArrowLeft: PLAY_STEP, ArrowUp: PLAY_STEP, ArrowRight: -PLAY_STEP, ArrowDown: -PLAY_STEP}[e.key];
    if (!k || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    api.ui({turn: k});
  });
}

function uiHook(p, payload) {
  if (!object(payload)) return;
  const u = ui(p);
  if (payload.view === 'spin') { u.replay = (u.replay || 0) + 1; u.view = null; u.sel = null; u.miss = null; }
  if (Number.isInteger(payload.turn) && Math.abs(payload.turn) <= 90) { u.turn = (u.turn || 0) + payload.turn; if (isPlayground(p)) notePlay(p, u); }
}

export const widthMechanics = {
  width: {
    fresh, valid, solved, move, hint,
    render: (p, a) => isPlayground(p) ? renderPlay(p, a) : renderPuzzle(p, a),
    wire: (root, p, api) => isPlayground(p) ? wirePlay(root, p, api) : wirePuzzle(root, p, api),
    ui: uiHook,
    reset: p => { uiState.delete(p.id); seen = null; },
    noHint: isPlayground
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'width',
  family: {id: 'width', symbol: '◬'},
  mechanics: widthMechanics,
  pack: new URL('./width.json', import.meta.url).href,
  css: new URL('./width.css', import.meta.url).href,
  focus: '.wd-spin:not([disabled]),.wd-gap[role=button],.wd-pt[role=button],.wd-turnable'
};
