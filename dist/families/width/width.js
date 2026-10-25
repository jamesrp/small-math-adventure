// Snug spinners (Week 59): give a curved shape its arcs, one across each gap
// between neighbouring corners, by choosing where each arc is centred. When
// every gap has its arc, the shape turns between two rails: the bottom rail
// stays put and the top rail rests on the shape. A top rail that never moves
// shows the shape has the same width every way round; the turn where it moves
// shows that it does not. In the hard puzzles one corner is missing: the
// child first puts it on one of a few spots, then builds the arcs.
//
// Every choice is exact. Corners, dots and spots are points of Q(√r)
// (surd.js), an arc may be centred on a point only when that point is exactly
// as far from both ends of the gap, and a shape is a solve exactly when every
// corner is in place, every arc is centred on a corner and all the arcs have
// the same radius: the Reuleaux polygon of the corners. Floating point is used
// only to draw and to choose which turn to stop at when showing a failure.
import {esc} from '../../expansion-controls.js';
import {geometry} from './surd.js';

const TAU = 2 * Math.PI;
const SIZE = 360, MID = 180, FLOOR = 334, RAIL = 7, REACH = 154;
// Drawn radius of each kind of point. What a tap reaches is drawn too, as
// invisible shapes, and a tap goes to the shape under it (wire): each point
// has a pad of radius PAD_R (about 45 px across on a 375 px phone, where the
// board is drawn at about 0.86), cut halfway to any nearer point and 2 units
// short of any gap's line it is not on, so a line beside a spot keeps its
// taps; each gap has its part of the board, the sector between the rays from
// the centre through its two corners, from GAP_IN inside its line out to the
// board's edge (in the spin, SPIN_OUT units past the arc). Points sit on top
// of gaps.
const MARK = {corner: [12.5, 14], dot: [5.5, 9], spot: [8, 8]};
const PAD_R = 26, GAP_IN = 25, SPIN_OUT = 30;
const STEPS = 720;

const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isPlayground = p => p.parameters.mode === 'playground';
const isPlace = p => typeof p.parameters.open === 'string';
const spotOf = (p, b) => isPlace(p) ? (b?.corner ?? null) : null;
const fix = x => Math.round(x * 100) / 100;

// ---------------------------------------------------------------------------
// The exact layer: which points may centre which gap, and the solve test.
// In a "place" puzzle one corner (`open`) is missing until the child puts it
// on one of the spots; everything exact then depends on that spot.

const exactMemo = new WeakMap();
export function exactOf(p, spot = null) {
  const q = p.parameters;
  let memo = exactMemo.get(q);
  if (!memo) { memo = new Map(); exactMemo.set(q, memo); }
  const placed = isPlace(p) && typeof spot === 'string' && Object.hasOwn(q.spots, spot) ? spot : null;
  let e = memo.get(placed ?? '');
  if (e) return e;
  const pts = {...q.corners, ...(q.pins || {})};
  if (placed) pts[q.open] = q.spots[placed];
  const g = geometry(q.field, pts);
  const order = q.order, n = order.length, points = [...order.filter(id => pts[id]), ...Object.keys(q.pins || {})];
  const gaps = order.map((a, i) => {
    const b = order[(i + 1) % n], live = Boolean(pts[a] && pts[b]);
    const joins = live ? points.filter(c => c !== a && c !== b && g.F.eq(g.d2(c, a), g.d2(c, b))) : [];
    return {a, b, live, joins, r2: Object.fromEntries(joins.map(c => [c, g.d2(c, a)]))};
  });
  e = {g, order, n, points, gaps, spot: placed};
  memo.set(placed ?? '', e);
  return e;
}
// A point may centre a gap's arc when it is exactly as far from both ends.
export const joinable = (p, gap, at, spot = null) => Boolean(exactOf(p, spot).gaps[gap]?.joins.includes(at));
const complete = arcs => arcs.every(c => c != null);
// The solve: every corner in place, every arc centred on a corner, every
// radius the same (exactly).
export function snug(p, arcs, spot = null) {
  const e = exactOf(p, spot);
  if (isPlace(p) && !e.spot) return false;
  if (!Array.isArray(arcs) || arcs.length !== e.n || !complete(arcs)) return false;
  if (!arcs.every((c, i) => e.order.includes(c) && joinable(p, i, c, spot))) return false;
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
// Positions in the plane, the centre G of the fixed corners and the drawing
// scale, chosen so that every shape the puzzle allows (with the missing corner
// on any spot) fits in either view. `pos(spot)` gives every position, with
// the missing corner on that spot.
export function layoutOf(p) {
  const q = p.parameters;
  let L = layoutMemo.get(q);
  if (L) return L;
  const all = {...q.corners, ...(q.pins || {}), ...(q.spots || {})}, g = geometry(q.field, all);
  const xy = Object.fromEntries(Object.keys(all).map(id => [id, g.xy(id)]));
  const fixed = q.order.filter(id => q.corners[id]);
  const G = [0, 1].map(k => fixed.reduce((sum, id) => sum + xy[id][k], 0) / fixed.length);
  const posMemo = new Map();
  const pos = spot => {
    const key = isPlace(p) && spot && xy[spot] ? spot : '';
    if (!posMemo.has(key)) posMemo.set(key, key ? {...xy, [q.open]: xy[key]} : xy);
    return posMemo.get(key);
  };
  // Everything that can be drawn while building, and everything that can
  // spin: a full shape. In a place puzzle only the right spot allows a full
  // shape (the builder and validator check this), so spots and the arcs a
  // wrong spot allows need only fit the build view, not every turn.
  const turn = (q.turn || 0) * Math.PI / 180, c = Math.cos(turn), sn = Math.sin(turn), pts = Object.values(xy), spun = [];
  for (const spot of isPlace(p) ? Object.keys(q.spots) : [null]) {
    const e = exactOf(p, spot), at = pos(spot), arcs = [];
    e.gaps.forEach(gap => gap.joins.forEach(k => arcs.push(...arcSamples(arcOf(at[k], at[gap.a], at[gap.b])))));
    pts.push(...arcs);
    if (isPlace(p) && e.gaps.every(gap => gap.joins.length)) spun.push(...e.order.map(id => at[id]), ...arcs);
  }
  const far = list => Math.max(...list.map(pt => Math.hypot(pt[0] - G[0], pt[1] - G[1])));
  // The build view centres the box round everything that can be drawn;
  // `home` is where G sits on the board then.
  const xs = pts.map(pt => c * (pt[0] - G[0]) - sn * (pt[1] - G[1])), ys = pts.map(pt => sn * (pt[0] - G[0]) + c * (pt[1] - G[1]));
  const half = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
  const R = spun.length ? Math.max(far(spun), half) : far(pts), s = REACH / R;
  const home = [MID - s * (Math.min(...xs) + Math.max(...xs)) / 2, MID + s * (Math.min(...ys) + Math.max(...ys)) / 2];
  L = {xy, G, R, s, turn, home, pos};
  layoutMemo.set(q, L);
  return L;
}
// The corners there are, in order, and the arc (or none) from each to the
// next; while a corner is missing, its neighbours are joined straight.
export function shapeOf(p, arcs, spot = null) {
  const e = exactOf(p, spot), xy = layoutOf(p).pos(e.spot), ids = e.order.filter(id => xy[id]);
  return {
    corners: ids.map(id => xy[id]),
    arcs: ids.map((id, k) => {
      const i = e.order.indexOf(id), next = ids[(k + 1) % ids.length], c = arcs?.[i];
      return e.order[(i + 1) % e.n] === next && c != null && xy[c] ? arcOf(xy[c], xy[id], xy[next]) : null;
    })
  };
}

// Where to stop when the shape is not snug: the turn (from the starting
// position, within half a turn) where the gap between the rails has changed
// the most. Memoised per board.
const verdictMemo = new Map();
export function verdictOf(p, arcs, spot = null) {
  const key = `${p.id}|${p.revision}|${spot ?? ''}|${arcs.join(',')}`;
  if (verdictMemo.has(key)) return verdictMemo.get(key);
  const shape = shapeOf(p, arcs, spot), {turn} = layoutOf(p), w0 = widthAt(shape, turn);
  let worst = 0, at = 0;
  for (let k = 1; k < STEPS; k++) {
    const th = Math.PI * k / STEPS, d = Math.abs(widthAt(shape, turn + th) - w0);
    if (d > worst + 1e-12) { worst = d; at = th; }
  }
  const v = {ok: snug(p, arcs, spot), w0, worst, at};
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
const keyOf = b => `${b.corner ?? ''}|${(b.arcs || []).map(c => c ?? '-').join(',')}`;

// The chosen gap: the one tapped, else the hint's, else the first empty one
// (none while a corner is still to be placed: the gap across from it is
// centred on that corner).
function selected(p, b, hinted) {
  const u = ui(p), key = keyOf(b), e = exactOf(p, spotOf(p, b)), live = i => Boolean(e.gaps[i]?.live);
  if (u.sel?.key === key && live(u.sel.gap)) return u.sel.gap;
  if (Number.isInteger(hinted?.gap)) return hinted.gap;
  if (isPlace(p) && !e.spot) return null;
  const empty = b.arcs.findIndex((c, i) => c == null && live(i));
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
  const arcs = (p.parameters.start || p.parameters.order.map(() => null)).slice();
  return isPlace(p) ? {corner: null, arcs} : {arcs};
}
function valid(p, b) {
  if (!object(b)) return false;
  const q = p.parameters;
  if (isPlayground(p)) return Object.keys(b).length === 1 && Number.isInteger(b.shape) && b.shape >= 0 && b.shape < q.shapes.length;
  if (isPlace(p)) {
    if (Object.keys(b).sort().join(',') !== 'arcs,corner') return false;
    if (b.corner !== null && !(typeof b.corner === 'string' && Object.hasOwn(q.spots, b.corner))) return false;
  } else if (Object.keys(b).length !== 1) return false;
  const e = exactOf(p, spotOf(p, b));
  if (!Array.isArray(b.arcs) || b.arcs.length !== e.n) return false;
  return b.arcs.every((c, i) => c === null || (typeof c === 'string' && e.gaps[i].joins.includes(c)));
}
const solved = (p, b) => !isPlayground(p) && valid(p, b) && snug(p, b.arcs, spotOf(p, b));
function move(p, b, action) {
  if (!object(action) || !valid(p, b)) return null;
  const q = p.parameters;
  if (isPlayground(p)) {
    if (action.type !== 'shape' || !Number.isInteger(action.shape) || action.shape === b.shape || action.shape < 0 || action.shape >= q.shapes.length) return null;
    return {shape: action.shape};
  }
  // Put the missing corner on a spot. Arcs that end at it, or are centred
  // on it, go with it.
  if (action.type === 'corner') {
    if (!isPlace(p) || typeof action.at !== 'string' || !Object.hasOwn(q.spots, action.at) || action.at === b.corner) return null;
    const {gaps} = exactOf(p);
    return {corner: action.at, arcs: b.arcs.map((c, i) => c === q.open || gaps[i].a === q.open || gaps[i].b === q.open ? null : c)};
  }
  if (action.type !== 'arc' || !Number.isInteger(action.gap) || typeof action.at !== 'string') return null;
  if (!joinable(p, action.gap, action.at, spotOf(p, b)) || b.arcs[action.gap] === action.at) return null;
  const arcs = b.arcs.slice();
  arcs[action.gap] = action.at;
  return isPlace(p) ? {corner: b.corner, arcs} : {arcs};
}
// Hints point at the reasoning; the board marks the gap and rings the centre
// (or the spot) from the second level, and the third offers Apply hint.
const hintMemo = new Map();
function hint(p, b) {
  if (isPlayground(p) || !valid(p, b)) return {type: 'note'};
  const spot = spotOf(p, b);
  if (snug(p, b.arcs, spot)) return {type: 'done'};
  const key = `${p.id}|${keyOf(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  const q = p.parameters, want = p.solution;
  let out;
  if (isPlace(p) && spot !== want.corner) {
    // A nudge that names no other corner and no distance: the board rings
    // the spot from the second level, and the third offers Apply hint.
    const X = q.open;
    out = {type: 'move', action: {type: 'corner', at: want.corner}, text: spot ? `Can corner ${X}’s arcs have the same radius as the two already drawn, from here?` : `Which spot lets corner ${X}’s arcs have the same radius as the two already drawn?`};
  } else {
    // A wrong arc first, then the first gap with none.
    let gap = b.arcs.findIndex((c, i) => c != null && c !== want.arcs[i]);
    if (gap < 0) gap = b.arcs.findIndex(c => c == null);
    const {a, b: end} = exactOf(p, spot).gaps[gap], now = b.arcs[gap];
    const ask = `Which corner could the compass reach both ${a} and ${end} from?`;
    out = {type: 'move', action: {type: 'arc', gap, at: want.arcs[gap]}, gap, text: now == null ? ask : q.pins?.[now] ? `The arc from ${a} to ${end} is centred on a dot. ${ask}` : `Look again at the arc from ${a} to ${end}. ${ask}`};
  }
  if (hintMemo.size > 400) hintMemo.clear();
  hintMemo.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Rendering a puzzle.

const nameOf = (p, id) => p.parameters.names?.[id] || `Corner ${id}`;
const shortName = (p, id) => nameOf(p, id).replace(/^Corner /, '');
const gapName = (p, i) => { const {a, b} = exactOf(p).gaps[i]; return `${a} to ${b}`; };
const pointSvg = (cls, id, kind, [x, y], label, inner, pad) => `<g class="wd-pt ${cls}" role="button" tabindex="0" data-pt="${esc(id)}" data-x="${fix(x)}" data-y="${fix(y)}" data-r="${MARK[kind][0]}" data-hit="${PAD_R}" data-focus="wd-pt-${esc(id)}" aria-label="${esc(label)}"><path class="wd-pad" d="${pad}"/>${inner}</g>`;
// A point's pad on the board: a disc PAD_R across, cut halfway to every other
// point and 2 units short of every line it is not on.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], dot = (a, b) => a[0] * b[0] + a[1] * b[1];
function clipHalf(poly, u, off) {
  const out = [];
  poly.forEach((p1, k) => {
    const p2 = poly[(k + 1) % poly.length], d1 = dot(p1, u) - off, d2 = dot(p2, u) - off;
    if (d1 <= 0) out.push(p1);
    if (d1 * d2 < 0) { const t = d1 / (d1 - d2); out.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]); }
  });
  return out;
}
const nearestOnSegment = (c, a, b) => { const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(c, a), ab) / (dot(ab, ab) || 1))); return [a[0] + ab[0] * t, a[1] + ab[1] * t]; };
function padPath(c, others, lines) {
  const n = 32, R = PAD_R / Math.cos(Math.PI / n);
  let poly = Array.from({length: n}, (_, k) => [c[0] + R * Math.cos(TAU * k / n), c[1] + R * Math.sin(TAU * k / n)]);
  for (const o of others) {
    const d = Math.hypot(o[0] - c[0], o[1] - c[1]);
    if (d > 0.01 && d < 2 * PAD_R) { const u = [(o[0] - c[0]) / d, (o[1] - c[1]) / d]; poly = clipHalf(poly, u, dot(c, u) + d / 2); }
  }
  for (const [a, b] of lines) {
    const qn = nearestOnSegment(c, a, b), d = Math.hypot(qn[0] - c[0], qn[1] - c[1]);
    if (d > 0.5 && d < PAD_R + 2) { const u = [(qn[0] - c[0]) / d, (qn[1] - c[1]) / d]; poly = clipHalf(poly, u, dot(c, u) + d - 2); }
  }
  return `M${poly.map(P).join('L')}Z`;
}
// A gap's part of the board: from GAP_IN inside its line, between the rays
// from the centre g through its corners a and b, out to the board's edge
// (or, given `out`, that many units beyond its line, so empty paper in the
// spin stays empty).
function gapArea(g, a, b, out) {
  const ab = sub(b, a), len = Math.hypot(ab[0], ab[1]) || 1, depth = Math.abs((g[0] - a[0]) * ab[1] - (g[1] - a[1]) * ab[0]) / len;
  const t = Math.min(0.6, GAP_IN / (depth || 1)), far = out == null ? -4 : -out / (depth || 1), toward = (p, f) => [p[0] + (g[0] - p[0]) * f, p[1] + (g[1] - p[1]) * f];
  let poly = [toward(a, t), toward(b, t), toward(b, far), toward(a, far)];
  for (const [u, off] of [[[1, 0], SIZE], [[-1, 0], 0], [[0, 1], SIZE], [[0, -1], 0]]) poly = clipHalf(poly, u, off);
  return `M${poly.map(P).join('L')}Z`;
}

// A compass round `at` that misses: drawn from the corner that stays put
// (the gap's first corner, or its other corner when the first is the one
// being placed), past the other end, with a short bar from the circle to the
// corner it missed. While placing a corner, the circle runs on past every
// spot, so it shows which spots it passes through.
function missSvg(p, e, xy, at, gapIndex, centre) {
  const q = p.parameters, gap = e.gaps[gapIndex], back = isPlace(p) && gap.a === q.open;
  const [from, to] = back ? [gap.b, gap.a] : [gap.a, gap.b], c = xy[centre], F = xy[from], T = xy[to], dir = back ? -1 : 1;
  const rho = Math.hypot(F[0] - c[0], F[1] - c[1]), angle = pt => Math.atan2(pt[1] - c[1], pt[0] - c[0]), t0 = angle(F);
  const off = pt => ((dir * (angle(pt) - t0)) % TAU + TAU) % TAU;
  let reach = off(T) + 0.22;
  if (isPlace(p) && (gap.a === q.open || gap.b === q.open)) for (const id of Object.keys(q.spots)) { const d = off(xy[id]); if (d < Math.PI) reach = Math.max(reach, d + 0.12); }
  const k = 40, pts = Array.from({length: k + 1}, (_, j) => { const t = t0 + dir * reach * j / k; return at([c[0] + rho * Math.cos(t), c[1] + rho * Math.sin(t)]); });
  const tb = angle(T), onCircle = at([c[0] + rho * Math.cos(tb), c[1] + rho * Math.sin(tb)]);
  return {from, to, centre, svg: `<path class="wd-leg" d="M${P(at(c))}L${P(at(F))}"/><path class="wd-miss" d="M${pts.map(P).join('L')}"/><path class="wd-short" d="M${P(onCircle)}L${P(at(T))}"/>`};
}

function buildSvg(p, a, hinted) {
  const b = a.board, q = p.parameters, e = exactOf(p, spotOf(p, b)), L = layoutOf(p), {G, s, turn, home} = L, xy = L.pos(e.spot);
  const at = placer(G, s, turn, home[0], home[1]), u = ui(p), key = keyOf(b);
  const sel = selected(p, b, hinted), missed = u.miss?.key === key && u.miss.gap === sel ? u.miss : null;
  const arcs = e.gaps.map((gap, i) => gap.live && b.arcs[i] ? arcOf(xy[b.arcs[i]], xy[gap.a], xy[gap.b]) : null);
  const hintArc = hinted?.action.type === 'arc' ? hinted : null, hintSpot = hinted?.action.type === 'corner' ? hinted.action.at : null;
  const parts = [`<rect class="wd-paper" x="0" y="0" width="${SIZE}" height="${SIZE}" rx="14"/>`];
  parts.push(`<path class="wd-fill${complete(b.arcs) ? ' full' : ''}" d="${outline(shapeOf(p, b.arcs, e.spot), at, s, turn)}"/>`);
  // While a corner is missing, a dotted line where it goes.
  if (isPlace(p) && !e.spot) {
    const n = e.n, o = e.order.indexOf(q.open);
    parts.push(`<path class="wd-open" d="M${P(at(xy[e.order[(o + n - 1) % n]]))}L${P(at(xy[e.order[(o + 1) % n]]))}"/>`);
  }
  // The chosen gap glows under its chord or arc.
  if (sel != null) parts.push(`<path class="wd-glow" d="${piece(arcs[sel], xy[e.gaps[sel].a], xy[e.gaps[sel].b], at, s)}"/>`);
  if (hintArc) parts.push(`<path class="wd-hint-gap" d="${piece(arcs[hintArc.gap], xy[e.gaps[hintArc.gap].a], xy[e.gaps[hintArc.gap].b], at, s)}"/>`);
  e.gaps.forEach((gap, i) => { if (gap.live) parts.push(`<path class="${arcs[i] ? 'wd-arc' : 'wd-chord'}" d="${piece(arcs[i], xy[gap.a], xy[gap.b], at, s)}"/>`); });
  // The chosen arc's compass: its centre and the two radii it was drawn with.
  if (sel != null && b.arcs[sel] && !missed) {
    const c = at(xy[b.arcs[sel]]);
    for (const end of [e.gaps[sel].a, e.gaps[sel].b]) parts.push(`<path class="wd-leg" d="M${P(c)}L${P(at(xy[end]))}"/>`);
  }
  const miss = missed ? missSvg(p, e, xy, at, missed.gap, missed.at) : null;
  if (miss) parts.push(miss.svg);
  // Each gap's part of the board, under the points; its line (invisible)
  // carries the focus ring.
  const g0 = at(L.G);
  e.gaps.forEach((gap, i) => {
    if (!gap.live) return;
    const label = `${arcs[i] ? `Arc from ${gapName(p, i)}, centred on ${shortName(p, b.arcs[i])}` : `Gap from ${gapName(p, i)}`}${sel === i ? ', chosen' : ''}`;
    parts.push(`<g class="wd-hit wd-gap" role="button" tabindex="0" data-gap="${i}" data-focus="wd-gap-${i}" aria-pressed="${sel === i}" aria-label="${esc(label)}"><path class="wd-gap-area" d="${gapArea(g0, at(xy[gap.a]), at(xy[gap.b]))}"/><path class="wd-gap-line" d="${piece(arcs[i], xy[gap.a], xy[gap.b], at, s)}"/></g>`);
  });
  const centre = sel != null ? b.arcs[sel] : null, ends = sel != null ? [e.gaps[sel].a, e.gaps[sel].b] : [];
  // Every point drawn now, and every line, for the pads.
  const shown = [...Object.keys(q.pins || {}), ...Object.keys(q.spots || {}).filter(id => id !== e.spot), ...e.order.filter(id => xy[id])].map(id => [id, at(xy[id])]);
  // Each line as drawn (a chord, or an arc as short chords), with its ends.
  const lines = e.gaps.flatMap((gap, i) => {
    if (!gap.live) return [];
    const pts = arcs[i] ? arcSamples(arcs[i]).map(at) : [at(xy[gap.a]), at(xy[gap.b])];
    return pts.slice(1).map((pt, k) => ({ends: [gap.a, gap.b], seg: [pts[k], pt]}));
  });
  const pad = (id, pt) => padPath(pt, shown.filter(([o]) => o !== id).map(([, xyo]) => xyo), lines.filter(l => !l.ends.includes(id)).map(l => l.seg));
  for (const id of Object.keys(q.pins || {})) {
    const pt = at(xy[id]);
    parts.push(pointSvg(['wd-pin', id === centre ? 'centre' : '', missed?.at === id ? 'missed' : ''].join(' '), id, 'dot', pt, nameOf(p, id), `<circle class="wd-dot" cx="${fix(pt[0])}" cy="${fix(pt[1])}" r="${MARK.dot[0]}"/>`, pad(id, pt)));
  }
  for (const id of Object.keys(q.spots || {})) {
    if (id === e.spot) continue;
    const pt = at(xy[id]);
    parts.push(pointSvg(['wd-spot', id === hintSpot ? 'hinted' : ''].join(' '), id, 'spot', pt, nameOf(p, id), `<circle class="wd-ring" cx="${fix(pt[0])}" cy="${fix(pt[1])}" r="${MARK.spot[0]}"/>`, pad(id, pt)));
  }
  for (const id of e.order) {
    if (!xy[id]) continue;
    const pt = at(xy[id]), label = id === q.open ? `Corner ${id}, on ${nameOf(p, e.spot).replace(/^Spot/, 'spot')}` : nameOf(p, id);
    parts.push(pointSvg(['wd-corner', id === centre ? 'centre' : '', ends.includes(id) ? 'end' : '', missed?.at === id ? 'missed' : '', hintArc?.action.at === id ? 'hinted' : ''].join(' '), id, 'corner', pt, label, `<circle class="wd-disc" cx="${fix(pt[0])}" cy="${fix(pt[1])}" r="${MARK.corner[0]}"/><text x="${fix(pt[0])}" y="${fix(pt[1])}">${esc(id)}</text>`, pad(id, pt)));
  }
  return {svg: `<svg class="wd-board" data-view="build" viewBox="0 0 ${SIZE} ${SIZE}" role="group" aria-label="Corners and gaps">${parts.join('')}</svg>`, sel, miss};
}

function railsSvg(top, cls = '') {
  return `<rect class="wd-rail wd-floor" x="6" y="${FLOOR}" width="${SIZE - 12}" height="${RAIL}" rx="3"/><rect class="wd-rail wd-top${cls}" x="6" y="${fix(top - RAIL)}" width="${SIZE - 12}" height="${RAIL}" rx="3"/>`;
}
function spinSvg(p, a, hinted) {
  const b = a.board, spot = spotOf(p, b), e = exactOf(p, spot), L = layoutOf(p), {G, s, turn} = L, xy = L.pos(e.spot);
  const shape = shapeOf(p, b.arcs, spot), v = verdictOf(p, b.arcs, spot);
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
  if (hinted?.action.type === 'arc') {
    const gap = e.gaps[hinted.gap], [x, y] = end.at(xy[hinted.action.at]);
    parts.push(`<g class="wd-final"><path class="wd-hint-gap" d="${piece(shape.arcs[hinted.gap], xy[gap.a], xy[gap.b], end.at, s)}"/><circle class="wd-hint-ring" cx="${fix(x)}" cy="${fix(y)}" r="13"/></g>`);
  }
  e.order.forEach(id => { const [x, y] = inward(end.at, G, xy[id]); parts.push(`<text class="wd-letter" data-letter="${esc(id)}" x="${fix(x)}" y="${fix(y)}">${esc(id)}</text>`); });
  // Tap an arc, or beside it, to change it: each arc's part of the board
  // reaches SPIN_OUT units past its bulge.
  const g0 = end.at(G);
  e.gaps.forEach((gap, i) => {
    const a0 = end.at(xy[gap.a]), b0 = end.at(xy[gap.b]), ab = sub(b0, a0), len = Math.hypot(ab[0], ab[1]) || 1, side = Math.sign(dot(sub(a0, g0), [ab[1], -ab[0]])) || 1;
    const bulge = Math.max(0, ...arcSamples(shape.arcs[i]).map(end.at).map(q => side * dot(sub(q, a0), [ab[1], -ab[0]]) / len));
    parts.push(`<g class="wd-hit wd-gap" role="button" tabindex="0" data-gap="${i}" data-focus="wd-gap-${i}" aria-label="${esc(`Arc from ${gapName(p, i)}, centred on ${shortName(p, b.arcs[i])}`)}"><path class="wd-gap-area" d="${gapArea(g0, a0, b0, bulge + SPIN_OUT)}"/><path class="wd-gap-line" d="${piece(shape.arcs[i], xy[gap.a], xy[gap.b], end.at, s)}"/></g>`);
  });
  return `<svg class="wd-board" data-view="spin" viewBox="0 0 ${SIZE} ${SIZE}" role="group" aria-label="The shape between two rails">${parts.join('')}</svg>`;
}

function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, spot = spotOf(p, b), done = snug(p, b.arcs, spot), view = viewOf(p, a);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, hinted = h?.type === 'move' ? h : null;
  const full = complete(b.arcs);
  const spinPayload = esc(JSON.stringify({view: 'spin'}));
  const bar = `<div class="wd-bar"><button type="button" class="secondary wd-spin" data-action="mechanic-ui" data-ui="${spinPayload}" data-focus="wd-spin"${full ? '' : ' disabled'} aria-label="${view === 'spin' ? 'Spin again' : 'Spin'}"><span aria-hidden="true">↻</span> Spin</button></div>`;
  let svg, status;
  if (view === 'spin') {
    svg = spinSvg(p, a, hinted);
    const v = verdictOf(p, b.arcs, spot);
    status = v.ok ? 'The shape turns all the way round and the top rail never moves.' : `Turned ${Math.round(v.at * 180 / Math.PI)} degrees, the top rail has moved ${widthAt(shapeOf(p, b.arcs, spot), layoutOf(p).turn + v.at) > v.w0 ? 'up' : 'down'}.`;
  } else {
    const built = buildSvg(p, a, hinted), sel = built.sel;
    svg = built.svg;
    const waiting = isPlace(p) && !spot ? `Corner ${q.open} is not on a spot yet.` : '';
    status = built.miss ? `A circle round ${shortName(p, built.miss.centre)} from ${built.miss.from} misses ${built.miss.to}.` : sel == null ? waiting || 'Choose a gap.' : `${waiting ? `${waiting} ` : ''}Gap from ${gapName(p, sel)} chosen${b.arcs[sel] ? `, centred on ${shortName(p, b.arcs[sel])}` : ''}.`;
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
// A shape's button: its outline, with a dot at each corner, so the curved
// triangle (three dots) and the curved pentagons (five) look different.
function iconOf(item) {
  const sh = item.shape, k = 0.45, at = placer(item.G, k, 0, 20, 20);
  const dots = (sh.corners || []).map(pt => { const [x, y] = at(pt); return `<circle cx="${fix(x)}" cy="${fix(y)}" r="2"/>`; }).join('');
  return `<svg class="wd-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="${outline(sh, at, k, 0)}"/>${dots}</svg>`;
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
// Gestures. A tap goes to what is drawn under it: a point's pad (on top), or
// a gap's part of the board (an arc's wide stroke in the spin). The spin
// plays once for each new full shape, and again on Spin; a tap or key during
// it ends it on its last frame.

let seen = null, running = null;
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function toBoard(svg, x, y) {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const pt = new DOMPoint(x, y).matrixTransform(m.inverse());
  return [pt.x, pt.y];
}
function targetOf(svg, el, view) {
  const t = el?.closest?.('[data-pt],[data-gap]');
  if (!t || !svg.contains(t)) return null;
  if (t.dataset.pt) return view === 'build' ? {pt: t.dataset.pt} : null;
  return {gap: Number(t.dataset.gap)};
}
function act(p, api, target) {
  const a = api.attempt(), b = a.board, q = p.parameters, spot = spotOf(p, b), u = ui(p), key = keyOf(b), view = viewOf(p, a);
  if (!target || snug(p, b.arcs, spot)) return;
  if (target.gap != null) {
    u.sel = {gap: target.gap, key};
    u.miss = null;
    if (view === 'spin') u.view = {mode: 'build', key};
    api.ui({});
    return;
  }
  if (view !== 'build') return;
  if (isPlace(p) && Object.hasOwn(q.spots, target.pt)) {
    u.miss = null; u.sel = null; u.view = null;
    api.apply({type: 'corner', at: target.pt});
    return;
  }
  const h = a.hintLevel >= 2 ? hint(p, b) : null, gap = selected(p, b, h?.type === 'move' ? h : null);
  if (gap == null) return;
  const {a: from, b: to} = exactOf(p, spot).gaps[gap];
  if (target.pt === from || target.pt === to) return;
  if (!joinable(p, gap, target.pt, spot)) { u.miss = {gap, at: target.pt, key}; u.sel = {gap, key}; api.ui({}); return; }
  if (b.arcs[gap] === target.pt) return;
  u.miss = null;
  u.sel = null;
  u.view = null;
  api.apply({type: 'arc', gap, at: target.pt});
}

// The spin: lift onto the floor, then turn (all the way round when snug, or
// to the stopping turn). With reduced motion there is no movement: the shape
// rests unturned between the rails for a moment, then the last frame appears.
function animate(root, svg, p, a, still) {
  const spot = spotOf(p, a.board), shape = shapeOf(p, a.board.arcs, spot), L = layoutOf(p), {G, s, turn, home} = L, xy = L.pos(spot), v = verdictOf(p, a.board.arcs, spot);
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
  const finish = () => {
    if (stop) return;
    stop = true;
    if (running?.svg === svg) running = null;
    if (!svg.isConnected) return;
    draw(goal === TAU ? 0 : goal, 1);
    root.classList.remove('wd-anim');
  };
  running = {svg, finish};
  root.classList.add('wd-anim');
  if (still) { draw(0, 1); setTimeout(finish, 700); return; }
  draw(0, 0);
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
  // A tap that ends the spin only ends it: its click lands on nothing.
  let swallow = false;
  svg.addEventListener('pointerdown', () => { swallow = false; if (running?.svg === svg) { running.finish(); swallow = true; } }, {capture: true});
  svg.addEventListener('click', e => {
    if (swallow) { swallow = false; return; }
    act(p, api, targetOf(svg, e.target, view));
  });
  svg.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target.closest?.('[data-gap],[data-pt]');
    if (!el) return;
    e.preventDefault();
    if (running?.svg === svg) { running.finish(); return; }
    act(p, api, el.dataset.pt ? {pt: el.dataset.pt} : {gap: Number(el.dataset.gap)});
  });
  if (view !== 'spin') return;
  const a = api.attempt(), key = `${p.id}|${keyOf(a.board)}|${ui(p).replay}`, before = seen;
  seen = key;
  if (before === key || typeof requestAnimationFrame !== 'function') return;
  animate(root, svg, p, a, reduced());
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
  family: {id: 'width', symbol: '⌓', area: 'geometry', region: 'shape'},
  mechanics: widthMechanics,
  pack: new URL('./width.json', import.meta.url).href,
  css: new URL('./width.css', import.meta.url).href,
  focus: '.wd-spin:not([disabled]),.wd-gap[role=button],.wd-pt[role=button],.wd-turnable'
};
