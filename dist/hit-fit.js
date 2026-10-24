// Minimum on-screen tap sizes for the shared boards (graph-board.js,
// sq-grid.js, tri-grid.js with tri-mesh.js, portal-board.js). Those boards
// draw in board units, so on a phone a dot, a grid point and its hit area
// shrink together. After a board is drawn, its wire function calls
// fitTargets with the board's targets; this module measures the board's
// rendered scale and gives each point-like target (a dot, a grid point, a
// portal point) a transparent hit shape at least HIT pixels across where
// there is room. Where two targets would overlap, the room between them is
// split and the nearer one wins: two dots meet halfway, a road keeps the
// middle of its length from the dots at its ends, and a grid point leaves
// the middle of the cells round it to the cells. A small cell or piece
// widens into the room round it. Labels drawn
// smaller than TEXT pixels grow to TEXT where they fit. What is drawn keeps
// its size: hit shapes are transparent, and focus and hint rings stay on the
// drawn marks. The board refits when it changes size. It never names a
// family. See docs/graph-board.md ("Tap sizes").

export const HIT = 44;   // px across: the goal for a tap target on a phone
export const FLOOR = 40; // px across: the least a dot is left with where a road needs room
export const TEXT = 12;  // px: the floor for a label a child reads

const SIDES = 40;
const SVGNS = 'http://www.w3.org/2000/svg';
let clips = 0;

// Pixels per board unit, as the board is laid out (CSS transforms such as an
// entrance animation don't count). Boards scale uniformly ('meet').
export function scaleOf(svg) {
  const vb = svg?.viewBox?.baseVal;
  if (!vb || !vb.width || !vb.height) return 0;
  let w = svg.clientWidth, h = svg.clientHeight;
  if (!w || !h) { const r = svg.getBoundingClientRect(); w = r.width; h = r.height; }
  return w && h ? Math.min(w / vb.width, h / vb.height) : 0;
}

/* ---- Plane geometry, in board units --------------------------------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = a => Math.hypot(a[0], a[1]);
const unit = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
// A regular polygon round c whose edges stay at least r from c.
const circle = (c, r) => Array.from({length: SIDES}, (_, k) => {
  const t = 2 * Math.PI * k / SIDES, R = r / Math.cos(Math.PI / SIDES);
  return [c[0] + R * Math.cos(t), c[1] + R * Math.sin(t)];
});
// Keep the part of a convex polygon where p·n <= off.
function clip(poly, n, off) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k], q = poly[(k + 1) % poly.length], dp = dot(p, n) - off, dq = dot(q, n) - off;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
// Keep the points of poly no farther than `off` from c in direction u.
const clipToward = (poly, c, u, off) => clip(poly, u, dot(c, u) + off);
// The nearest point of a polyline to p.
function nearestOn(line, p) {
  let best = line[0], dist = len(sub(p, line[0]));
  for (let k = 0; k + 1 < line.length; k++) {
    const a = line[k], ab = sub(line[k + 1], a), l2 = dot(ab, ab) || 1, t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
    const q = [a[0] + ab[0] * t, a[1] + ab[1] * t], d = len(sub(p, q));
    if (d < dist) { dist = d; best = q; }
  }
  return {q: best, d: dist};
}
// The same distance without allocating, for the inner loops: to a polyline,
// or to a polygon's outline when `closed`.
function away(pts, closed, x, y) {
  let best = Infinity;
  const n = pts.length, m = closed ? n : n - 1;
  for (let k = 0; k < m; k++) {
    const a = pts[k], b = pts[(k + 1) % n], abx = b[0] - a[0], aby = b[1] - a[1], l2 = abx * abx + aby * aby || 1;
    let t = ((x - a[0]) * abx + (y - a[1]) * aby) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - a[0] - abx * t, dy = y - a[1] - aby * t, d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
const ring = list => [...list, list[0]];
function inside(poly, [x, y]) {
  let result = false;
  for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) {
    const [xi, yi] = poly[k], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
}
// Distance between two polygons given as vertex lists (0 when they touch).
function polyGap(a, b) {
  if (inside(b, a[0]) || inside(a, b[0])) return 0;
  let best = Infinity;
  for (const p of a) best = Math.min(best, nearestOn(ring(b), p).d);
  for (const p of b) best = Math.min(best, nearestOn(ring(a), p).d);
  return best;
}
// How thin a polygon is: its least width, or for a shape that bends (an L)
// twice its area over its perimeter, which follows the arms.
function thinness(poly) {
  if (poly.length < 3) return 0;
  let area = 0, per = 0, width = Infinity, turns = 0;
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k], q = poly[(k + 1) % poly.length], r = poly[(k + 2) % poly.length];
    area += p[0] * q[1] - q[0] * p[1];
    per += len(sub(q, p));
    const n = unit([q[1] - p[1], p[0] - q[0]]);
    width = Math.min(width, Math.max(...poly.map(v => Math.abs(dot(sub(v, p), n)))));
    const turn = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]);
    if (Math.abs(turn) > 1e-12) turns |= turn > 0 ? 1 : 2;
  }
  return turns === 3 ? Math.min(width, per ? 2 * Math.abs(area) / per : 0) : width;
}
const centroid = poly => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
const corners = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// How far apart two boxes are (0 when they overlap).
const boxGap = (a, b) => Math.hypot(Math.max(0, a[0] - b[2], b[0] - a[2]), Math.max(0, a[1] - b[3], b[1] - a[3]));
function boxNearest([x0, y0, x1, y1], p) {
  const q = [Math.max(x0, Math.min(x1, p[0])), Math.max(y0, Math.min(y1, p[1]))];
  return {q, d: len(sub(p, q))};
}

/* ---- Reading the board ------------------------------------------------------ */
// Board units from an element's own coordinates, through both screen
// matrices, so transforms on the element and its groups count.
function userMatrix(svg, el) {
  const a = svg.getScreenCTM?.(), b = el.getScreenCTM?.();
  return a && b ? a.inverse().multiply(b) : null;
}
const apply = (m, [x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
const factor = m => Math.hypot(m.a, m.b);
function bboxOf(svg, el) {
  const m = userMatrix(svg, el);
  if (!m) return null;
  let b;
  try { b = el.getBBox(); } catch { return null; }
  if (!b.width && !b.height) return null;
  const pts = corners([b.x, b.y, b.x + b.width, b.y + b.height]).map(p => apply(m, p));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return {box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], c: apply(m, [b.x + b.width / 2, b.y + b.height / 2]), r: Math.max(b.width, b.height) / 2 * factor(m)};
}
// A disc target: its centre, its drawn radius and its current reach.
function readDisc(svg, el, markSel, reachSel, act) {
  const mark = (markSel && el.querySelector(markSel)) || el, reach = (reachSel && el.querySelector(reachSel)) || mark;
  const a = bboxOf(svg, mark), b = reach === mark ? a : bboxOf(svg, reach);
  if (!a || !(a.r > 0)) return null;
  return {el, act, c: a.c, d: a.r, r0: Math.max(a.r, b?.r || 0), shown: reach !== mark && painted(reach), own: reach === mark};
}
// Whether a shape's fill shows (a reach a family draws on purpose).
function painted(el) {
  const st = getComputedStyle(el), fill = st.fill;
  return !(fill === 'none' || fill === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(fill) || Number(st.fillOpacity) === 0 || Number(st.opacity) === 0 || st.visibility === 'hidden');
}
// A stroke target (a road, an edge): its centre line.
function readSegment(svg, el) {
  const m = userMatrix(svg, el);
  if (!m) return null;
  let line;
  if (el.tagName === 'line') line = [[el.x1, el.y1], [el.x2, el.y2]].map(([x, y]) => apply(m, [x.baseVal.value, y.baseVal.value]));
  else if (typeof el.getTotalLength === 'function') {
    const total = el.getTotalLength();
    line = Array.from({length: 13}, (_, k) => { const p = el.getPointAtLength(total * k / 12); return apply(m, [p.x, p.y]); });
  } else return null;
  return {el, line};
}
// An area target (a cell, a piece): its outline.
function readArea(svg, el) {
  const m = userMatrix(svg, el);
  if (!m) return null;
  let poly;
  if (el.points && el.points.numberOfItems) poly = Array.from({length: el.points.numberOfItems}, (_, k) => { const p = el.points.getItem(k); return apply(m, [p.x, p.y]); });
  else if (el.tagName === 'rect') { const b = el.getBBox(); poly = corners([b.x, b.y, b.x + b.width, b.y + b.height]).map(p => apply(m, p)); }
  else if (typeof el.getTotalLength === 'function') { const total = el.getTotalLength(); poly = Array.from({length: 48}, (_, k) => { const p = el.getPointAtLength(total * k / 48); return apply(m, [p.x, p.y]); }); }
  else return null;
  if (poly.length < 3) return null;
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
  // A drawn hit shape inside its control (a group with the button role) can
  // be given a hit shape of its own beside it, in the group.
  const control = '[role=button],[role=checkbox],[role=radio],[tabindex]', up = el.parentElement;
  const host = !el.matches(control) && up && up !== svg && up.matches(control) ? up : null;
  return {el, poly, c: centroid(poly), thin: thinness(poly), box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], host, hm: host ? userMatrix(svg, host)?.inverse() : null};
}

// Other controls inside a board: anything focusable or acting that is not one
// of the targets being fitted (nor inside one), plus `extra`.
export function controlsIn(svg, targets, extra = '') {
  const own = new Set(targets);
  const sel = `[role=button],[role=checkbox],[role=radio],[tabindex]:not([tabindex="-1"]),a[href],[data-action]${extra ? `,${extra}` : ''}`;
  return [...svg.querySelectorAll(sel)].filter(el => !own.has(el) && !targets.some(t => t.contains(el) || el.contains(t)));
}

// How far past each side of the board the page is empty, up to half a tap:
// sampled along the visible part of each side, a point is empty when the
// element there holds the board (a panel's padding) or is the board's own.
function freeRoom(svg, view) {
  const free = (x, y) => { const el = document.elementFromPoint(x, y); return Boolean(el) && (el.contains(svg) || svg.contains(el)); };
  const span = (a, b, lo, hi) => { const from = Math.max(a, lo), to = Math.min(b, hi); return to - from < 4 ? [] : [0, .25, .5, .75, 1].map(t => from + 2 + (to - from - 4) * t); };
  const ys = span(view.top, view.bottom, 0, innerHeight), xs = span(view.left, view.right, 0, innerWidth);
  const steps = [.25, .5, .75, 1].map(t => t * HIT / 2);
  const reach = probe => { let best = 0; for (const d of steps) { if (!probe(d)) break; best = d; } return best; };
  return {
    left: ys.length ? reach(d => ys.every(y => free(view.left - d, y))) : 0,
    right: ys.length ? reach(d => ys.every(y => free(view.right + d, y))) : 0,
    top: xs.length ? reach(d => xs.every(x => free(x, view.top - d))) : 0,
    bottom: xs.length ? reach(d => xs.every(x => free(x, view.bottom + d))) : 0
  };
}

// Where the wide hit strokes of several straight edges overlap, a press goes
// to the edge nearest the finger (`hook` is the edges' dataset key).
export function nearestStroke(svg, control, e, hook) {
  if (!e.clientX && !e.clientY) return control;
  const hits = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el.dataset?.[hook] !== undefined && svg.contains(el));
  const lines = hits.filter(el => el.tagName === 'line');
  if (control.tagName !== 'line' || lines.length < 2) return control;
  const at = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  const away = el => {
    const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM()), a = new DOMPoint(el.x1.baseVal.value, el.y1.baseVal.value).matrixTransform(m), b = new DOMPoint(el.x2.baseVal.value, el.y2.baseVal.value).matrixTransform(m);
    const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((at.x - a.x) * dx + (at.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(at.x - a.x - t * dx, at.y - a.y - t * dy);
  };
  return lines.reduce((best, el) => away(el) < away(best) ? el : best, control);
}
/* ---- Fitting ----------------------------------------------------------------- */
// Fit a board's targets. `spec` lists elements:
//   discs     targets drawn as a dot or point; each gets a child hit shape
//             (class `hit-tap`) and its drawn mark keeps its size. `mark`
//             and `reach` select the drawn mark and the old hit circle.
//   inert     dots that are not targets: a disc stops halfway to them
//   segments  stroke targets (roads, edges); a disc at a segment's end gives
//             the segment the middle of its length. One drawn as a filled
//             shape counts as an area.
//   areas     cells and pieces; small ones widen. One that is itself the
//             control widens through the --hit-pad stroke width, up to
//             halfway to the nearest other area; one drawn inside its
//             control group gets a hit shape in the group that reaches out
//             wherever nothing else is nearer
//   pad       false: areas stay as drawn (they only bound the discs)
//   obstacles other controls on the board, which keep their own boxes
//   labels    [{el, max}]: text to raise to TEXT px, at most `max` units
//             of its own coordinates
// Returns false when the board is not laid out yet.
export function fitTargets(svg, spec) {
  // A board with nothing to tap or read is left alone.
  if (![spec.discs, spec.segments, spec.areas, spec.labels].some(list => list?.length)) return true;
  const s = scaleOf(svg);
  if (!s || !svg.getScreenCTM?.()) return false;
  const half = HIT / 2 / s, full = HIT / s;
  // A label grown for an earlier size starts again from its own size.
  for (const {el} of spec.labels || []) if (el.dataset.hitFont) { el.style.removeProperty('font-size'); delete el.dataset.hitFont; }
  const discs = (spec.discs || []).map(el => readDisc(svg, el, spec.mark, spec.reach, true)).filter(Boolean);
  const inert = (spec.inert || []).map(el => readDisc(svg, el, spec.mark, spec.reach, false)).filter(Boolean);
  // An edge drawn as a filled shape (a polygon round a gap) is an area.
  const closed = el => /^(polygon|rect|circle|ellipse)$/i.test(el.tagName);
  const segments = (spec.segments || []).filter(el => !closed(el)).map(el => readSegment(svg, el)).filter(Boolean);
  const areas = [...(spec.areas || []), ...(spec.segments || []).filter(closed)].map(el => readArea(svg, el)).filter(Boolean);
  const obstacles = (spec.obstacles || []).map(el => bboxOf(svg, el)).filter(Boolean);
  // Hit shapes may reach past the board's edge only into empty space round
  // it (the panel's padding, say), never over another element.
  const view = svg.getBoundingClientRect(), inv = svg.getScreenCTM().inverse(), room = freeRoom(svg, view);
  const [v0, v1] = [apply(inv, [view.left - room.left, view.top - room.top]), apply(inv, [view.right + room.right, view.bottom + room.bottom])];
  const vbox = [Math.min(v0[0], v1[0]), Math.min(v0[1], v1[1]), Math.max(v0[0], v1[0]), Math.max(v0[1], v1[1])];
  const labels = (spec.labels || []).map(({el, max}) => {
    const m = userMatrix(svg, el), size = parseFloat(getComputedStyle(el).fontSize);
    return m && size ? {el, max, size, k: factor(m) * s} : null;
  }).filter(Boolean);
  const local = discs.map(d => userMatrix(svg, d.el)?.inverse()), local2 = segments.map(g => userMatrix(svg, g.el)?.inverse());

  for (const d of discs) d.R = Math.max(d.r0, half);
  for (const d of inert) d.R = d.d;
  const all = [...discs, ...inert];
  // Which dot each end of a segment belongs to: the one it starts inside.
  const endOf = p => {
    let best = null, dist = Infinity;
    for (const d of all) { const e = len(sub(p, d.c)); if (e <= Math.max(d.r0, d.d * 1.5) && e < dist) { dist = e; best = d; } }
    return best;
  };
  for (const g of segments) {
    g.ends = [endOf(g.line[0]), endOf(g.line.at(-1))];
    let length = 0;
    for (let k = 0; k + 1 < g.line.length; k++) length += len(sub(g.line[k + 1], g.line[k]));
    g.span = length + (g.ends[0] ? len(sub(g.line[0], g.ends[0].c)) : 0) + (g.ends[1] ? len(sub(g.line.at(-1), g.ends[1].c)) : 0);
  }

  const shapes = discs.map(d => {
    const {c, R} = d;
    // Each cut keeps the points no farther than `off` from c in direction u.
    const cuts = [];
    // Two dots meet halfway.
    for (const o of all) {
      if (o === d) continue;
      const gap = len(sub(o.c, c));
      if (gap > 1e-6 && gap < R + o.R) cuts.push({u: unit(sub(o.c, c)), off: gap / 2});
    }
    for (const g of segments) {
      const at = g.ends[0] === d ? 0 : g.ends[1] === d ? 1 : -1;
      if (at >= 0) {
        // A road from this dot: the dot keeps its reach unless that would
        // leave the road shorter than a tap; then the room is split so the
        // dot and the road's middle come out about the same size. The dot
        // always keeps its drawn mark, and may take up to a quarter of the
        // road showing between the two marks if it needs that to stay
        // FLOOR px across; the road keeps the middle of what shows.
        const other = g.ends[1 - at], room = other ? other.R : 0;
        if (g.span - R - room >= full) continue;
        const start = at === 0 ? g.line[0] : g.line.at(-1), next = at === 0 ? g.line[1] : g.line.at(-2);
        const u = len(sub(start, c)) > 1e-6 ? unit(sub(start, c)) : unit(sub(next, start));
        const t = other?.act ? (g.span - half) / 3 : (g.span - room - half) / 2;
        const shows = Math.max(0, g.span - d.d - (other ? other.d : 0));
        cuts.push({u, off: Math.max(d.d, Math.min(R, t)), most: Math.min(R, d.d + shows / 4)});
      } else {
        // Another road passing by: halfway to it.
        const {q, d: gap} = nearestOn(g.line, c);
        if (gap > 1e-6 && gap < 2 * R) cuts.push({u: unit(sub(q, c)), off: Math.max(d.d, gap / 2)});
      }
    }
    // A cell that also acts keeps the part of it nearest its middle: the dot
    // and the cell come out about as wide along the line between them, and
    // the dot keeps at least the reach it had. A reach the board draws is
    // where the cell begins.
    for (const a of areas) {
      if (boxGap(a.box, [c[0], c[1], c[0], c[1]]) >= R || (!inside(a.poly, c) && nearestOn(ring(a.poly), c).d >= R)) continue;
      const gap = len(sub(a.c, c));
      if (gap > 1e-6) cuts.push({u: unit(sub(a.c, c)), off: d.shown ? d.r0 : Math.max(d.r0, Math.min(R, gap - R / 2))});
    }
    // Other controls keep their boxes, but a dot never shrinks below the
    // reach it had before fitting on their account (a box can be larger than
    // what the control paints).
    for (const o of obstacles) {
      const {q, d: gap} = boxNearest(o.box, c);
      if (gap > 1e-6 && gap < R) cuts.push({u: unit(sub(q, c)), off: Math.max(d.r0, gap)});
    }
    const build = () => {
      let poly = circle(c, R);
      for (const {u, off} of cuts) poly = clipToward(poly, c, u, off);
      // Nothing reaches past the board's edge.
      poly = clip(poly, [1, 0], vbox[2]); poly = clip(poly, [-1, 0], -vbox[0]);
      poly = clip(poly, [0, 1], vbox[3]); poly = clip(poly, [0, -1], -vbox[1]);
      return poly;
    };
    let poly = build();
    // Where a road cut leaves the dot thinner than FLOOR px along that road,
    // give the dot more of the road, up to its quarter.
    for (let round = 0; round < 2; round++) {
      let grew = false;
      for (const cut of cuts) {
        if (!(cut.most > cut.off) || poly.length < 3) continue;
        const along = poly.map(p => dot(p, cut.u)), short = (FLOOR + 1) / s - (Math.max(...along) - Math.min(...along));
        if (short > 1e-6) { cut.off = Math.min(cut.most, cut.off + short); grew = true; }
      }
      if (!grew) break;
      poly = build();
    }
    return poly;
  });

  // Roads whose wide hit strokes overlap split the overlap, nearest road
  // wins: a road's hit stroke is clipped to the band round it where no other
  // road is nearer, measured along its length on both sides. Two roads from
  // one dot meet on the line halfway between them, two roads side by side
  // (or two curves between the same two dots) halfway across the gap.
  for (const g of segments) {
    const xs = g.line.map(p => p[0]), ys = g.line.map(p => p[1]);
    g.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  const regions = segments.map(g => {
    const others = segments.filter(o => o !== g && boxGap(g.box, o.box) < full);
    const mine = q => { const d = nearestOn(g.line, q).d; return others.every(o => d <= nearestOn(o.line, q).d + 1e-9); };
    // Points along the road about every half a tap, and past each end as
    // far as the round cap of the hit stroke reaches.
    const pts = [];
    for (let k = 0; k + 1 < g.line.length; k++) {
      const a = g.line[k], b = g.line[k + 1], l = len(sub(b, a)), u = unit(sub(b, a)), m = Math.max(1, Math.ceil(l / half * (g.line.length > 2 ? 1 : 2)));
      for (let j = 0; j < m; j++) pts.push({p: [a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m], u});
    }
    const n = g.line.length, u0 = unit(sub(g.line[1], g.line[0])), u1 = unit(sub(g.line[n - 1], g.line[n - 2]));
    pts.push({p: g.line[n - 1], u: u1});
    const cap = (p, u, sign) => [1, .5].map(f => ({p: [p[0] + sign * u[0] * half * f, p[1] + sign * u[1] * half * f], u}));
    const samples = [...cap(g.line[0], u0, -1), ...pts, ...cap(g.line[n - 1], u1, 1).reverse()];
    let split = false;
    const left = [], right = [];
    for (const {p, u} of samples) {
      if (others.length && !mine(p)) { split = true; continue; }
      const v = [-u[1], u[0]];
      const width = sign => {
        const at = w => [p[0] + sign * v[0] * w, p[1] + sign * v[1] * w];
        if (!others.length || mine(at(half))) return half;
        let lo = 0, hi = half;
        for (let k = 0; k < 9; k++) { const mid = (lo + hi) / 2; if (mine(at(mid))) lo = mid; else hi = mid; }
        split = true;
        return lo;
      };
      const wl = width(1), wr = width(-1);
      left.push([p[0] + v[0] * wl, p[1] + v[1] * wl]); right.push([p[0] - v[0] * wr, p[1] - v[1] * wr]);
    }
    let poly = [...left, ...right.reverse()];
    // Nor past the board's edge, except into empty space.
    if (poly.some(([x, y]) => x < vbox[0] || x > vbox[2] || y < vbox[1] || y > vbox[3])) {
      poly = clip(poly, [1, 0], vbox[2]); poly = clip(poly, [-1, 0], -vbox[0]);
      poly = clip(poly, [0, 1], vbox[3]); poly = clip(poly, [0, -1], -vbox[1]);
      split = true;
    }
    return split && poly.length > 2 ? poly : null;
  });

  // Small areas widen by a transparent stroke, up to halfway to the nearest
  // other area and never over another control.
  const pads = areas.map(a => {
    if (spec.pad === false || a.host) return 0;
    let room = (full - a.thin) / 2;
    if (room <= 0) return 0;
    for (const b of areas) if (b !== a && boxGap(a.box, b.box) < 2 * room) room = Math.min(room, polyGap(a.poly, b.poly) / 2);
    for (const o of obstacles) if (boxGap(a.box, o.box) < room) room = Math.min(room, polyGap(a.poly, corners(o.box)));
    return room * s >= 1 ? room : 0;
  });
  // A small area inside its control gets a hit shape round it instead: out
  // to where it would be a tap across, wherever no other area, drawn dot,
  // road or control is nearer, within the board's free space. Found along
  // rays from its middle, through each corner and between.
  const taps = areas.map(a => {
    const most = (full - a.thin) / 2;
    if (spec.pad === false || !a.host || most * s < 1 || !inside(a.poly, a.c)) return null;
    const reach = 2 * most;
    const nearAreas = areas.filter(b => b !== a && boxGap(a.box, b.box) < reach);
    const nearDots = all.filter(o => boxGap(a.box, [o.c[0], o.c[1], o.c[0], o.c[1]]) < reach + o.d);
    const nearRoads = segments.filter(g => boxGap(a.box, g.box) < reach);
    const nearBoxes = obstacles.filter(o => boxGap(a.box, o.box) < reach);
    const ok = (x, y) => {
      if (x < vbox[0] || x > vbox[2] || y < vbox[1] || y > vbox[3]) return false;
      const d = away(a.poly, true, x, y);
      if (d > most) return false;
      for (const {box: [x0, y0, x1, y1]} of nearBoxes) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return false;
      for (const o of nearDots) if (Math.hypot(x - o.c[0], y - o.c[1]) - o.d < d) return false;
      for (const b of nearAreas) {
        const [x0, y0, x1, y1] = b.box;
        if (x - x1 > d || x0 - x > d || y - y1 > d || y0 - y > d) continue;
        if (away(b.poly, true, x, y) < d || inside(b.poly, [x, y])) return false;
      }
      for (const g of nearRoads) if (away(g.line, false, x, y) < d) return false;
      return true;
    };
    // How far a ray from the middle runs inside the area.
    const exit = u => {
      let best = Infinity;
      for (let k = 0; k < a.poly.length; k++) {
        const p = a.poly[k], e = sub(a.poly[(k + 1) % a.poly.length], p), w = sub(p, a.c), den = u[0] * e[1] - u[1] * e[0];
        if (Math.abs(den) < 1e-12) continue;
        const t = (w[0] * e[1] - w[1] * e[0]) / den, f = (w[0] * u[1] - w[1] * u[0]) / den;
        if (t > 0 && f >= -1e-9 && f <= 1 + 1e-9) best = Math.min(best, t);
      }
      return best;
    };
    const turn = 2 * Math.PI, angles = [...Array.from({length: 24}, (_, k) => turn * k / 24), ...a.poly.map(p => Math.atan2(p[1] - a.c[1], p[0] - a.c[0]))].map(t => (t + turn) % turn).sort((x, y) => x - y);
    let grew = false;
    const pts = angles.map(t => {
      const u = [Math.cos(t), Math.sin(t)], rb = exit(u), at = r => [a.c[0] + u[0] * r, a.c[1] + u[1] * r];
      if (!Number.isFinite(rb)) return a.c;
      let lo = rb, hi = rb + 3 * most;
      const fits = r => ok(a.c[0] + u[0] * r, a.c[1] + u[1] * r);
      if (fits(hi)) lo = hi;
      else for (let k = 0; k < 8; k++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
      if ((lo - rb) * s > .5) grew = true;
      return at(lo);
    });
    return grew ? pts : null;
  });

  // Writes, after every read.
  svg.classList.add('hit-fit');
  discs.forEach((d, k) => {
    const poly = shapes[k], m = local[k];
    let tap = d.el.querySelector(':scope > .hit-tap');
    // A dot whose drawn mark takes taps itself gets no hit shape where the
    // shape would not make it wider (points packed a tap apart or closer).
    const idle = d.own && poly.length > 2 && (thinness(poly) - 2 * d.r0) * s < 2;
    if (poly.length < 3 || !m || idle) { tap?.remove(); return; }
    if (!tap) { tap = document.createElementNS(SVGNS, 'path'); tap.setAttribute('class', 'hit-tap'); tap.setAttribute('aria-hidden', 'true'); d.el.prepend(tap); }
    tap.setAttribute('d', `M${poly.map(p => apply(m, p).map(v => v.toFixed(2)).join(',')).join('L')}Z`);
  });
  let defs = svg.querySelector(':scope > defs.hit-clips');
  segments.forEach((g, k) => {
    const poly = regions[k], m = local2[k];
    const old = g.el.getAttribute('clip-path')?.match(/^url\(#(hit-clip-\d+)\)$/)?.[1];
    if (!poly || !m) { if (old) { g.el.removeAttribute('clip-path'); svg.querySelector(`#${old}`)?.remove(); } return; }
    if (!defs) { defs = document.createElementNS(SVGNS, 'defs'); defs.setAttribute('class', 'hit-clips'); svg.prepend(defs); }
    let shape = old && defs.querySelector(`#${old} > path`);
    if (!shape) {
      const box = document.createElementNS(SVGNS, 'clipPath'), id = `hit-clip-${++clips}`;
      box.id = id; box.setAttribute('clipPathUnits', 'userSpaceOnUse');
      shape = document.createElementNS(SVGNS, 'path'); box.append(shape); defs.append(box);
      g.el.setAttribute('clip-path', `url(#${id})`);
    }
    shape.setAttribute('d', `M${poly.map(p => apply(m, p).map(v => v.toFixed(2)).join(',')).join('L')}Z`);
  });
  areas.forEach((a, k) => {
    if (pads[k]) a.el.style.setProperty('--hit-pad', `${(2 * pads[k] * s).toFixed(1)}px`);
    else a.el.style.removeProperty('--hit-pad');
    if (!a.host) return;
    let tap = a.host.querySelector(':scope > .hit-tap');
    if (!taps[k] || !a.hm) { tap?.remove(); return; }
    if (!tap) { tap = document.createElementNS(SVGNS, 'path'); tap.setAttribute('class', 'hit-tap'); tap.setAttribute('aria-hidden', 'true'); a.host.prepend(tap); }
    tap.setAttribute('d', `M${taps[k].map(p => apply(a.hm, p).map(v => v.toFixed(3)).join(',')).join('L')}Z`);
  });
  for (const l of labels) {
    if (l.size * l.k >= TEXT - .05) continue;
    const size = Math.max(l.size, Math.min(TEXT / l.k, l.max ?? Infinity));
    if (size <= l.size) continue;
    l.el.style.fontSize = `${size.toFixed(3)}px`;
    l.el.dataset.hitFont = '1';
  }
  return true;
}

// Fit now, and again whenever the board changes size, until it leaves the page.
const fitted = new WeakMap();
export function keepFitted(svg, fit) {
  if (!svg) return;
  const known = fitted.get(svg);
  if (known) { known.fit = fit; fit(); return; }
  const entry = {fit, w: svg.clientWidth, h: svg.clientHeight};
  fitted.set(svg, entry);
  fit();
  if (typeof ResizeObserver !== 'function') return;
  const watch = new ResizeObserver(() => {
    if (!svg.isConnected) { watch.disconnect(); return; }
    const w = svg.clientWidth, h = svg.clientHeight;
    if (Math.abs(w - entry.w) < .5 && Math.abs(h - entry.h) < .5) return;
    entry.w = w; entry.h = h;
    entry.fit();
  });
  watch.observe(svg);
}
