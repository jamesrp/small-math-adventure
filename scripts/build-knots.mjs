// Authoring list for Knot colours (worksheet Week 40). Draws every knot and
// tangle from a smooth curve, finds its crossings, chooses which strand goes
// over (all crossings of one sign, or alternating), cuts the under strands
// into arcs with gaps, and records the exact crossing code: a signed Gauss
// code per picture. Checks each knot's Jones polynomial against the table in
// scripts/validate-knots.mjs, every answer with the mechanic, and writes
// dist/families/knots/knots.json. Run: node scripts/build-knots.mjs
// (`--preview <file.html>` also writes a page of every picture with its arcs
// numbered and named, for checking the drawings by eye).
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {completions, nonConstant, claimTrue, certificate, COLOURS} from '../dist/families/knots/knots.js';
import {jonesOfCode, JONES, samePolynomial} from './validate-knots.mjs';

// --- Curves -------------------------------------------------------------------
const TAU = 2 * Math.PI;
const sampleParam = (f, n) => Array.from({length: n}, (_, k) => f(TAU * k / n));
function cubic(p0, c1, c2, p3, per = 30) {
  const out = [];
  for (let k = 0; k <= per; k++) {
    const t = k / per, s = 1 - t;
    out.push([0, 1].map(d => s * s * s * p0[d] + 3 * s * s * t * c1[d] + 3 * s * t * t * c2[d] + t * t * t * p3[d]));
  }
  return out;
}
const same = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-9;
// Join polylines that share end points into closed loops.
function chain(pieces) {
  const left = pieces.map(p => p.slice()), loops = [];
  while (left.length) {
    let cur = left.shift();
    for (;;) {
      if (cur.length > 2 && same(cur[0], cur.at(-1))) { loops.push(cur.slice(0, -1)); break; }
      const k = left.findIndex(p => same(p[0], cur.at(-1)) || same(p.at(-1), cur.at(-1)));
      assert.ok(k >= 0, 'pieces join into loops');
      let p = left.splice(k, 1)[0];
      if (!same(p[0], cur.at(-1))) p = p.reverse();
      cur = [...cur, ...p.slice(1)];
    }
  }
  return loops;
}

// --- Crossings, arcs and the code -------------------------------------------------
function segmentCross(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-12) return null;
  const q = [c[0] - a[0], c[1] - a[1]], t = (q[0] * s[1] - q[1] * s[0]) / den, u = (q[0] * r[1] - q[1] * r[0]) / den;
  return t >= 0 && t < 1 && u >= 0 && u < 1 ? {t, u, p: [a[0] + t * r[0], a[1] + t * r[1]], r, s} : null;
}
// Every place two strands (or one strand with itself) cross, with the
// position along each as segment index plus fraction.
function crossingsOf(strands) {
  const out = [], segs = strands.map(s => s.closed ? s.points.length : s.points.length - 1);
  const pt = (k, i) => strands[k].points[i % strands[k].points.length];
  for (let k1 = 0; k1 < strands.length; k1++) for (let k2 = k1; k2 < strands.length; k2++) {
    for (let i = 0; i < segs[k1]; i++) for (let j = k1 === k2 ? i + 2 : 0; j < segs[k2]; j++) {
      if (k1 === k2 && strands[k1].closed && i === 0 && j === segs[k1] - 1) continue;
      const x = segmentCross(pt(k1, i), pt(k1, i + 1), pt(k2, j), pt(k2, j + 1));
      if (!x) continue;
      const cos = Math.abs(x.r[0] * x.s[0] + x.r[1] * x.s[1]) / Math.hypot(...x.r) / Math.hypot(...x.s);
      out.push({a: {strand: k1, u: i + x.t, dir: x.r}, b: {strand: k2, u: j + x.u, dir: x.s}, p: x.p, angle: Math.acos(Math.min(1, cos))});
    }
  }
  // A crossing exactly at a shared sample point can be found twice.
  return out.filter((x, k) => !out.slice(0, k).some(y => same(x.p, y.p)));
}
const sideSign = (over, under) => -Math.sign(over[0] * under[1] - over[1] * under[0]); // y points down
function lengthsOf(s) {
  const n = s.points.length, cum = [0];
  for (let i = 0; i < (s.closed ? n : n - 1); i++) { const a = s.points[i], b = s.points[(i + 1) % n]; cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  return cum;
}
function pointAt(s, cum, L) {
  const total = cum.at(-1), n = s.points.length;
  if (s.closed) L = ((L % total) + total) % total;
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < L) i++;
  const t = (L - cum[i]) / (cum[i + 1] - cum[i] || 1), a = s.points[i], b = s.points[(i + 1) % n];
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}
function piece(s, cum, L0, L1) {
  const out = [pointAt(s, cum, L0)], total = cum.at(-1), n = s.points.length;
  for (let k = 0; k < (s.closed ? 2 * n : n); k++) {
    const L = cum[k % n] + (k >= n ? total : 0);
    if (L > L0 + 1e-9 && L < L1 - 1e-9) out.push(s.points[k % n]);
  }
  out.push(pointAt(s, cum, L1));
  return out;
}
// Ramer–Douglas–Peucker, so the pack holds few points per arc.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts.at(-1), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  let best = 0, at = 0;
  // A closed loop starts and ends at one point: measure from that point.
  const away = p => L < 1e-9 ? Math.hypot(p[0] - a[0], p[1] - a[1]) : Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L;
  for (let i = 1; i < pts.length - 1; i++) { const d = away(pts[i]); if (d > best) { best = d; at = i; } }
  return best <= tol ? [a, b] : [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)];
}
const round = p => p.map(v => Number(v.toFixed(2)));
export const CORD = {half: 2.3, clear: 1.15};
const PREVIEW = process.argv.includes('--preview');
// strands: [{points, closed}] in board units. over: 'alternate', {sign: ±1}
// (every crossing of that sign), or a function (crossing) => 'a' | 'b'.
// Arcs are numbered strand by strand along each strand's direction; on a
// closed strand arc 0 starts at the first underpass after the strand's first
// point. Crossing ids in the code follow first appearance.
export function diagram(strands, over) {
  const X = crossingsOf(strands), cums = strands.map(lengthsOf), visits = strands.map(() => []);
  X.forEach((x, c) => { visits[x.a.strand].push({c, side: 'a', u: x.a.u}); visits[x.b.strand].push({c, side: 'b', u: x.b.u}); });
  visits.forEach(v => v.sort((p, q) => p.u - q.u));
  const up = X.map(() => null);
  if (over === 'alternate') {
    let o = true;
    for (const v of visits.flat()) {
      if (up[v.c] === null) up[v.c] = o ? v.side : v.side === 'a' ? 'b' : 'a';
      else assert.equal(up[v.c] === v.side, o, 'the curve alternates');
      o = !o;
    }
  } else if (typeof over === 'function') X.forEach((x, c) => { up[c] = over(x); });
  else X.forEach((x, c) => { up[c] = sideSign(x.a.dir, x.b.dir) === over.sign ? 'a' : 'b'; });
  const isOver = v => up[v.c] === v.side;
  const gap = c => (CORD.half + CORD.clear) / Math.max(0.55, Math.sin(X[c].angle));
  const arcs = [], ends = [], info = X.map(() => ({})), id = new Map(), code = {strands: [], signs: []};
  strands.forEach((s, k) => {
    const cum = cums[k], total = cum.at(-1), vs = visits[k], first = vs.findIndex(v => !isOver(v));
    const seq = s.closed && first >= 0 ? [...vs.slice(first + 1), ...vs.slice(0, first + 1)] : vs;
    const unders = seq.filter(v => !isOver(v)), at = v => { const i = Math.floor(v.u); return cum[i] + (v.u - i) * (cum[i + 1] - cum[i]); };
    const start = arcs.length;
    if (s.closed && !unders.length) arcs.push([...s.points, s.points[0]]);
    else if (s.closed) unders.forEach((u, j) => {
      const prev = unders[(j - 1 + unders.length) % unders.length];
      const L0 = at(prev) + gap(prev.c);
      let L1 = at(u) - gap(u.c);
      if (L1 <= L0) L1 += total;
      arcs.push(piece(s, cum, L0, L1));
    });
    else {
      const cuts = [{L: 0, g: 0}, ...unders.map(u => ({L: at(u), g: gap(u.c)})), {L: total, g: 0}];
      for (let j = 0; j + 1 < cuts.length; j++) arcs.push(piece(s, cum, cuts[j].L + cuts[j].g, cuts[j + 1].L - cuts[j + 1].g));
      ends.push({at: round(s.points[0]), arc: start}, {at: round(s.points.at(-1)), arc: arcs.length - 1});
    }
    const count = arcs.length - start;
    let cur = start;
    for (const v of seq) {
      const x = info[v.c], dir = X[v.c][v.side].dir;
      if (isOver(v)) Object.assign(x, {over: cur, overDir: dir});
      else { Object.assign(x, {in: cur, underDir: dir}); cur = s.closed ? start + (cur - start + 1) % count : cur + 1; x.out = cur; }
    }
    code.strands.push({closed: s.closed, visits: seq.map(v => { if (!id.has(v.c)) id.set(v.c, id.size + 1); return (isOver(v) ? 1 : -1) * id.get(v.c); })});
  });
  const byId = [...id.entries()].sort((a, b) => a[1] - b[1]).map(([c]) => c);
  code.signs = byId.map(c => sideSign(info[c].overDir, info[c].underDir));
  return {
    arcs: arcs.map(d => simplify(d, 0.08).map(round)),
    crossings: byId.map(c => ({at: round(X[c].p), over: info[c].over, under: [info[c].in, info[c].out], angle: Math.round(X[c].angle * 180 / Math.PI)})),
    ends, code
  };
}

// --- Drawings in their own units ------------------------------------------------
// The worksheet's trefoil (Week 40 guide): (sin t + 2 sin 2t, cos t − 2 cos 2t).
const trefoilCurve = t => [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t)];
const drawings = {
  trefoil: () => ({strands: [{points: sampleParam(trefoilCurve, 720), closed: true}], over: {sign: -1}}),
  // The (2, 5) torus knot, five lobes wound twice round.
  cinquefoil: () => ({strands: [{points: sampleParam(t => [(2.6 + Math.cos(5 * t)) * Math.sin(2 * t), -(2.6 + Math.cos(5 * t)) * Math.cos(2 * t)], 1000), closed: true}], over: {sign: 1}}),
  plain: () => ({strands: [{points: sampleParam(t => [1.25 * Math.cos(t), Math.sin(t)], 240), closed: true}], over: 'alternate'}),
  // Two trefoils of the same hand, each opened at one lobe and joined.
  granny: () => {
    const rot = ([x, y]) => [-y, x], D = 3.05, cut = 0.5, n = 400;
    const open = (sgn, dx) => Array.from({length: n + 1}, (_, k) => { const t = Math.PI + cut + (TAU - 2 * cut) * k / n; const [x, y] = rot(trefoilCurve(t)); return [sgn * x + dx, sgn * y]; });
    const A = open(1, -D), B = open(-1, D);
    const tangent = (pts, end) => { const [p, q] = end ? [pts.at(-2), pts.at(-1)] : [pts[1], pts[0]]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]); return [(q[0] - p[0]) / L, (q[1] - p[1]) / L]; };
    const bridge = (p, tp, q, tq) => cubic(p, [p[0] + tp[0] * 0.7, p[1] + tp[1] * 0.7], [q[0] + tq[0] * 0.7, q[1] + tq[1] * 0.7], q, 24);
    // A's last point joins B's first point and B's last joins A's first.
    const loop = chain([A, bridge(A.at(-1), tangent(A, true), B[0], tangent(B, false)), B, bridge(B.at(-1), tangent(B, true), A[0], tangent(A, false))]);
    return {strands: [{points: loop[0], closed: true}], over: {sign: -1}};
  },
  // Pretzel knots P(a, 1, 1): a column of a half twists and a clasp of two
  // single crossings. P(2,1,1) is the figure-eight, P(3,1,1) is 5_2 and
  // P(4,1,1) is 6_1, the twist knots.
  pretzel: cols => {
    const s = 1.45, hw = 0.66, D = 2.5, H = Math.max(...cols) * s, X = cols.map((_, i) => (i - (cols.length - 1) / 2) * D), pieces = [];
    // A shorter column twists in the middle and runs straight above and below.
    cols.forEach((a, i) => {
      const y0 = (H - a * s) / 2;
      for (const sg of [1, -1]) {
        const twist = Array.from({length: 16 * a + 1}, (_, k) => [X[i] - sg * hw * Math.cos(Math.PI * k / 16), y0 + s * k / 16]);
        pieces.push([...(y0 > 0 ? line([twist[0][0], 0], twist[0], 8).slice(0, -1) : []), ...twist, ...(y0 > 0 ? line(twist.at(-1), [twist.at(-1)[0], H], 8).slice(1) : [])]);
      }
    });
    const cap = (x1, x2, y, k) => cubic([x1, y], [x1, y + k], [x2, y + k], [x2, y], 28);
    for (let i = 0; i + 1 < cols.length; i++) { pieces.push(cap(X[i] + hw, X[i + 1] - hw, 0, -1.25)); pieces.push(cap(X[i] + hw, X[i + 1] - hw, H, 1.25)); }
    pieces.push(cap(X[0] - hw, X.at(-1) + hw, 0, -2.9));
    pieces.push(cap(X[0] - hw, X.at(-1) + hw, H, 2.9));
    return {strands: [{points: chain(pieces)[0], closed: true}], over: 'alternate'};
  },
  // One crossing: a horizontal strand passing under a vertical one.
  crossing: () => ({strands: [{points: line([-1, 0], [1, 0]), closed: false}, {points: line([0, -1], [0, 1]), closed: false}], over: x => x.a.strand === 1 ? 'a' : 'b'}),
  // The worksheet's two-crossing tangle (K–1 P6, upper P5): L to S across,
  // and a bend from P down over it and back up to Q. After the move the bend
  // stays above the strand.
  bend: after => {
    const depth = after ? -0.85 : 1.15;
    const U = [...line([-1, -2.1], [-1, depth - 0.5], 20), ...cubic([-1, depth - 0.5], [-1, depth + 0.35], [1, depth + 0.35], [1, depth - 0.5], 30).slice(1), ...line([1, depth - 0.5], [1, -2.1], 20).slice(1)];
    return {strands: [{points: line([-2.6, 0], [2.6, 0], 60), closed: false}, {points: U, closed: false}], over: x => x.a.strand === 1 ? 'a' : 'b'};
  },
  // Three strands for the slide (a Reidemeister III move): H across, over
  // both others; Y from top right to bottom left, over X; X from top left to
  // bottom right. Before the slide H passes above the X–Y crossing, after it
  // below. The six ends are in the same places.
  slide: after => {
    const bow = after ? 1 : -1;
    const H = Array.from({length: 61}, (_, k) => { const x = -2.7 + 5.4 * k / 60; return [x, 0.15 + bow * 1.15 * (1 - (x / 2.7) ** 2)]; });
    return {strands: [{points: H, closed: false}, {points: line([-2.1, -2.2], [2.1, 2.5], 60), closed: false}, {points: line([2.1, -2.2], [-2.1, 2.5], 60), closed: false}], over: x => {
      const top = Math.min(x.a.strand, x.b.strand); // H (0) is over X and Y; Y (2) is over X (1)
      const winner = top === 0 ? 0 : 2;
      return x.a.strand === winner ? 'a' : 'b';
    }};
  }
};
function line(p, q, n = 30) { return Array.from({length: n + 1}, (_, k) => [p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]); }

// Scale a drawing uniformly into a box [x, y, w, h] of the board, centred.
function placed(drawing, box, extra = []) {
  const all = [...drawing.strands.flatMap(s => s.points), ...extra];
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]), [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min(box[2] / (x1 - x0), box[3] / (y1 - y0)), ox = box[0] + (box[2] - (x1 - x0) * s) / 2, oy = box[1] + (box[3] - (y1 - y0) * s) / 2;
  const map = ([x, y]) => [ox + (x - x0) * s, oy + (y - y0) * s];
  return {strands: drawing.strands.map(t => ({...t, points: t.points.map(map)})), over: drawing.over};
}
// A single picture on its own board, `width` units wide inside a margin.
function aspectOf(drawing, margin = 7) {
  const all = drawing.strands.flatMap(s => s.points), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), height = h * (100 - 2 * margin) / w + 2 * margin;
  return {box: [margin, margin, 100 - 2 * margin, height - 2 * margin], height};
}

// --- Arc names ------------------------------------------------------------------
// Where an arc sits in its picture, from its point farthest from every crossing.
const WORDS = {'-1,-1': 'top left', '0,-1': 'top', '1,-1': 'top right', '-1,0': 'left', '0,0': 'middle', '1,0': 'right', '-1,1': 'bottom left', '0,1': 'bottom', '1,1': 'bottom right'};
function placeWords(d, arcs, box) {
  const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
  return arcs.map(a => {
    const far = a.reduce((best, p) => { const m = Math.min(...d.crossings.map(x => Math.hypot(p[0] - x.at[0], p[1] - x.at[1])), 99); return m > best.m ? {p, m} : best; }, {p: a[0], m: -1}).p;
    const sx = (far[0] - cx) / (box[2] / 2), sy = (far[1] - cy) / (box[3] / 2);
    return WORDS[`${Math.abs(sx) < 0.3 ? 0 : Math.sign(sx)},${Math.abs(sy) < 0.3 ? 0 : Math.sign(sy)}`];
  });
}

// --- Boards ---------------------------------------------------------------------
// A board of one or more pictures: arcs, crossings and end dots numbered across
// the board, with each picture's code and the arc range it covers.
function board(pictures, height, extra = {}) {
  const out = {aspect: Number((100 / height).toFixed(4)), arcs: [], crossings: [], ends: [], pictures: [], ...extra};
  pictures.forEach((pic, k) => {
    const d = diagram(pic.strands, pic.over), first = out.arcs.length;
    assert.equal(pic.names.length, d.arcs.length, `${pic.label}: one name per arc`);
    d.arcs.forEach((a, i) => out.arcs.push({d: a, name: pic.names[i], pic: k}));
    d.crossings.forEach(x => out.crossings.push({at: x.at, over: x.over + first, under: x.under.map(a => a + first), pic: k}));
    d.ends.forEach((e, i) => out.ends.push({at: e.at, arc: e.arc + first, pic: k, ...(pic.ends?.[i] || {})}));
    out.pictures.push({code: d.code, arcs: [first, out.arcs.length]});
    for (const x of d.crossings) assert.ok(x.angle >= 40, `${pic.label}: crossings are not too shallow (${x.angle}°)`);
  });
  if (!PREVIEW) assert.equal(new Set(out.arcs.map(a => a.name)).size, out.arcs.length, `arc names are different: ${out.arcs.map(a => a.name).join('; ')}`);
  return out;
}
// One knot on its own board, with arc names from their places unless given.
function knotBoard(name, names = null, margin = 7) {
  const raw = typeof name === 'string' ? drawings[name]() : name;
  const {box, height} = aspectOf(raw, margin), pic = placed(raw, box);
  const d = diagram(pic.strands, pic.over);
  const words = names || placeWords(d, d.arcs, box).map(w => `the ${w} arc`);
  return board([{...pic, names: words, label: String(typeof name === 'string' ? name : 'knot')}], height);
}

export {drawings, placed, knotBoard, board, aspectOf, line};


// --- The knots ------------------------------------------------------------------
// Each knot: its drawing, its arc names (checked by eye against the preview),
// and its row in the Jones table.
const KNOTS = {
  plain: {draw: () => drawings.plain(), title: 'Plain loop', jones: 'plain', names: ['the loop']},
  trefoil: {draw: () => drawings.trefoil(), title: 'Trefoil', jones: 'trefoil', names: ['the top arc', 'the bottom left arc', 'the bottom right arc']},
  figure8: {draw: () => drawings.pretzel([2, 1, 1]), title: 'Figure-eight knot', jones: 'figure8', names: ['the long bottom arc', 'the lower left arc', 'the middle arc', 'the top arc']},
  cinquefoil: {draw: () => drawings.cinquefoil(), title: 'Cinquefoil', jones: 'cinquefoil', names: ['the bottom right arc', 'the left arc', 'the right arc', 'the bottom left arc', 'the top arc']},
  '5_2': {draw: () => drawings.pretzel([3, 1, 1]), title: 'Three-twist knot', jones: '5_2', names: ['the lower left arc', 'the long bottom arc', 'the short left arc', 'the middle arc', 'the top arc']},
  '6_1': {draw: () => drawings.pretzel([4, 1, 1]), title: 'Stevedore knot', jones: '6_1', names: ['the lower short arc', 'the long bottom arc', 'the lower left arc', 'the upper short arc', 'the middle arc', 'the top arc']},
  granny: {draw: () => drawings.granny(), title: 'Granny knot', jones: 'granny', names: ['the top left arc', 'the bottom left arc', 'the top arc', 'the bottom right arc', 'the top right arc', 'the bottom arc']}
};
function knot(key) {
  const k = KNOTS[key], q = knotBoard(k.draw(), k.names);
  assert.ok(samePolynomial(jonesOfCode(q.pictures[0].code), JONES[k.jones]), `${key}: the drawing’s Jones polynomial is the table’s`);
  return q;
}
// Nine single crossings in a 3 × 3 grid (K–1 Problem 5): in each, a horizontal
// strand passes under an upright one. Ends carry no dots.
function crossingGrid() {
  const pics = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const where = WORDS[`${c - 1},${r - 1}`];
    pics.push({...placed(drawings.crossing(), [9 + 32 * c, 9 + 32 * r, 18, 18]), names: ['left', 'right', 'upright'].map(w => `the ${w} arc of the ${where} crossing`), label: `${where} crossing`});
  }
  return {...board(pics, 100), ends: []};
}
const ROW_COLOUR = k => Math.floor(k / 3), COLUMN_COLOUR = k => k % 3;
const gridLocked = () => Array.from({length: 9}, (_, k) => [ROW_COLOUR(k), null, COLUMN_COLOUR(k)]).flat();
// One tangle on its own board; `ends` gives each end dot's fixed colour in the
// drawing's end order.
function tangleBoard(kind, names, colours) {
  const raw = drawings[kind](false), {box, height} = aspectOf(raw, 8);
  return board([{...placed(raw, box), names, ends: colours.map(colour => ({colour})), label: kind}], height);
}
// Before and after pictures at one scale. Each picture is drawn in its own
// frame, 100 units wide (the page shows the frames side by side, or one
// above the other on a narrow screen, with an arrow between). `ends[k]` gives
// picture k's end dots: a colour fixes the dot, 'match' ties it to the dot in
// the same place in the other picture.
function pairBoard(kind, names, ends) {
  const raws = [drawings[kind](false), drawings[kind](true)], all = raws.flatMap(r => r.strands.flatMap(s => s.points));
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]), corners = [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
  const pad = 8, W = 100 - 2 * pad, H = W * (corners[1][1] - corners[0][1]) / (corners[1][0] - corners[0][0]), height = Number((H + 2 * pad).toFixed(2));
  const frames = [[0, 0, 100, height], [PAIR_GAP, 0, 100, height]], count = raws.map(r => diagram(r.strands, r.over).ends.length);
  const pics = raws.map((r, k) => ({...placed(r, [frames[k][0] + pad, pad, W, H], corners), names: names[k], label: `${kind} ${k ? 'after' : 'before'}`,
    ends: ends[k].map((e, i) => e === 'match' ? {match: (k ? 0 : count[0]) + i} : {colour: e})}));
  return board(pics, height, {frames});
}
const PAIR_GAP = 120;
const [RED, BLUE, YELLOW] = [0, 1, 2];
const BEND_NAMES = ['the left arc', 'the middle arc', 'the right arc', 'the bend'];
// End order in a bend picture: L, S (the strand's left and right ends), then
// P, Q (the bend's left and right ends). In a slide picture: the curved
// strand's left and right ends, X's top and bottom, Y's top and bottom.
const BOARDS = {
  crossings: crossingGrid,
  bendYes: () => tangleBoard('bend', BEND_NAMES, [RED, RED, BLUE, BLUE]),
  bendNo: () => tangleBoard('bend', BEND_NAMES, [RED, BLUE, RED, RED]),
  bendPair: () => pairBoard('bend', [BEND_NAMES.map(n => n.replace('the ', 'the first picture’s ')), ['the second picture’s straight arc', 'the second picture’s bend']], [[RED, 'match', BLUE, 'match'], [RED, 'match', BLUE, 'match']]),
  slidePair: () => {
    const before = ['curved arc', 'top left arc', 'middle arc', 'bottom right arc', 'top right arc', 'bottom left arc'];
    const fixed = ['match', 'match', RED, YELLOW, BLUE, 'match'];
    return pairBoard('slide', [before.map(n => `the first picture’s ${n}`), before.map(n => `the second picture’s ${n}`)], [fixed, fixed]);
  }
};

// --- Copy -------------------------------------------------------------------------
const RULES = {
  arcs: 'An arc runs from one gap in the cord to the next, passing over any crossings on the way. Each arc is one colour.',
  crossing: 'At each crossing, the arc on top and the two arcs that stop there must be all one colour or all three colours. A solid ring shows a crossing that works; a dashed ring, one that clashes.',
  given: 'Arcs with a thick edge are given and stay as they are.',
  ends: 'An arc that ends at a filled dot must be the dot’s colour.',
  pair: 'A dot with a dashed edge takes its arc’s colour, and must match the dot in the same place in the other picture.',
  one: 'If no colouring can use more than one colour, press One colour only. It is checked. If it is right, one crossing is coloured all different and the colours that forces are followed to a clash; tap another crossing to start there.',
  cant: 'If the dots can’t all be matched, press Can’t. It is checked. If it is right, the colours the dots force are shown up to the clash.',
  every: 'Each colouring found goes on the shelf below the knot. Press That’s all when you think none is left. It says if there is another.'
};
const TAP = 'Tap an arc to change its colour: red, blue, yellow, then red again. Undo takes back the last change.';
const CONTROLS = {
  plain: TAP,
  one: `${TAP} Press One colour only when you are sure.`,
  cant: `${TAP} Press Can’t when you are sure.`,
  every: `${TAP} Press That’s all when you think you have them all.`,
  playground: 'Choose a knot. Tap an arc to change its colour: red, blue, yellow, then red again. Clear takes every colour off.'
};
const OBJECTIVE = {
  crossings: ['Colour the right arc of each crossing so that every crossing is all one colour or all three colours.', 'Make every crossing all one colour or all different.'],
  more: ['Colour every arc so that each crossing is all one colour or all three colours, using more than one colour; or press One colour only if that can’t be done.', 'Use more than one colour.'],
  ends: ['Colour every arc so that each crossing works and each arc that ends at a dot is the dot’s colour; or press Can’t if that can’t be done.', 'Match the end dots.'],
  pair: ['Colour both pictures so that every crossing works, every arc ending at a filled dot is its colour, and the dots in the same place in the two pictures match.', 'Colour both pictures so their end dots match.'],
  every: ['Find every colouring of this knot, the one-colour ones too, then press That’s all.', 'Find every colouring.']
};
const PREREQUISITES = {
  crossings: 'Tell red, blue and yellow apart and see when three things are all the same or all different. No reading or arithmetic.',
  colour: 'Follow a cord through its crossings and see which arcs stop at each. No reading; a grown-up can read How to play.',
  ends: 'Follow a strand from a dot through its crossings. No reading.',
  every: 'Keep track of colourings already found and decide when none is left. No counting is asked.',
  claim: 'Try colourings until sure that none uses two colours, then press the button; the checked clash shows why.',
  slide: 'Try a colour, follow what it forces through three crossings, and change it if it clashes.'
};
const sources = ['knots-week40', 'knots-card40', 'knots-bestvina', 'knots-kauffman', 'knots-knotinfo'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Nine crossings', mode: 'complete', board: 'crossings', locked: gridLocked, copy: 'crossings', prereq: 'crossings', rules: ['given'],
    check: {colourings: 1},
    idea: 'Any two arcs at a crossing decide the third: two the same make the third the same, two different make it the remaining colour.',
    hints: ['Look at one crossing. Are its two given arcs the same colour or different?', 'Same: the right arc matches them. Different: the right arc is the third colour.', 'Each row and each column of right arcs uses each colour once.'],
    parent: {notice: 'Whether your child taps through the colours and watches the ring, or says the colour before tapping.', prompt: 'Could the right arc of any crossing have two different colours?', explanation: 'If the left and upright arcs match, the right arc must match them; if they differ, it must be the colour neither has. So each crossing has exactly one answer. The nine answers make a 3 × 3 square in which every row and every column has each colour once, a Latin square.', extension: 'Cover one given arc with a finger. How many ways could the other two be coloured now? (Three: choosing one decides the other.)', connection: 'With red, blue and yellow as 0, 1 and 2, the rule is a + b + c ≡ 0 (mod 3), so any two arcs decide the third. It is the rule of a set in the card game SET for one attribute (Week 36), and Fox’s rule for colouring knots.'},
    provenance: 'Week 40 K–1 Problem 5: the 3 × 3 grid of crossings with the left and upright arcs given and “Can any question mark have two different answers?”'},
  {number: 2, level: 'easy', title: 'Trefoil', mode: 'more', claim: 'one', board: 'trefoil', copy: 'more', prereq: 'colour',
    check: {colourings: 9, nonConstant: 6, claim: false},
    idea: 'Two different colours on the trefoil force the third onto the last arc; a plain loop can never be coloured with two colours, so this is a certificate that the trefoil is knotted.',
    hints: ['Give two arcs different colours. What must the third be?', 'At each crossing, two different colours force the third colour.', 'Make the three arcs red, blue and yellow, one each.'],
    parent: {notice: 'Whether your child gives up on two colours after one clash, or tries the third colour on the last arc.', prompt: 'Once two arcs have different colours, what must the third one be?', explanation: 'Every crossing of this trefoil touches all three arcs: one on top and the other two stopping there. If two arcs differ, the crossing they share forces the third to be the remaining colour, and then all three crossings are all different. Moving a loop without cutting it never changes whether it has a colouring with two or more colours (each Reidemeister move matches colourings one for one), and a plain circle has only its one-colour colourings. So no amount of moving turns this trefoil into a plain loop.', extension: 'Draw a loop with one twist in it. How many arcs does it have, and how many colours can it use? (One arc, so one colour.)', connection: 'Three-colourability, Fox’s first example of a knot invariant (Bestvina §3; Kauffman, “The Three Colored Trefoil”).'},
    provenance: 'Week 40 Problem 2 (every band): the worksheet’s trefoil, drawn from the guide’s curve, asked as one colouring with more than one colour.'},
  {number: 3, level: 'easy', title: 'Dots on a bend', mode: 'complete', claim: 'cant', board: 'bendYes', copy: 'ends', prereq: 'ends', rules: ['ends'],
    check: {colourings: 1, claim: false},
    idea: 'End dots fix the arcs that touch them, and each crossing passes a colour along the strand: these dots can be met in exactly one way.',
    hints: ['Which arcs touch a dot?', 'The bend touches two blue dots, and the left arc a red dot. What does the first crossing need?', 'Bend blue, left arc red, middle arc yellow, right arc red.'],
    parent: {notice: 'Whether your child starts from the dots or taps arcs at random.', prompt: 'Which arcs can you colour without looking at any crossing?', explanation: 'The bend passes over both crossings, so it is one arc, and both its dots are blue: it is blue. The left arc is red from its dot. At the first crossing blue on top and red stopping force yellow for the middle arc; at the second, blue on top and yellow force red for the right arc, which matches its dot.', extension: 'If the right dot were blue, could it be done? (No: the right arc is forced red.)', connection: 'A tangle’s colourings decide which colours can occur at its ends.'},
    provenance: 'Week 40 K–1 Problem 6, case 1 (L red, P blue, S red, Q blue; the end dot R renamed S, review card fix 7).'},
  {number: 4, level: 'easy', title: 'A dot that won’t match', mode: 'complete', claim: 'cant', board: 'bendNo', copy: 'ends', prereq: 'ends', rules: ['ends'],
    check: {colourings: 0, claim: true},
    idea: 'Colours forced from the dots can clash: then no colouring exists, and the forced chain is the proof.',
    hints: ['Which arcs touch a dot?', 'The bend touches two red dots. Follow red along the strand from the left.', 'Red on top of red forces red, twice, but the right dot is blue. Press Can’t.'],
    parent: {notice: 'Whether your child presses Can’t only after following the colours, and can say where the clash is.', prompt: 'Which arcs do the dots decide, and what do the crossings do with them?', explanation: 'The bend touches two red dots, so it is red, and the left arc is red. Red on top and red stopping force red for the middle arc, and again for the right arc. Its dot is blue, so no colouring meets all four dots.', extension: 'Which colour for the right dot would work? (Red.)', connection: 'An obstruction found by forcing: the end colours of a tangle are constrained by its crossings.'},
    provenance: 'Week 40 K–1 Problem 6, case 2 (L red, P red, S blue, Q red), which cannot be completed.'},
  {number: 5, level: 'medium', title: 'Every trefoil colouring', mode: 'every', board: 'trefoil', copy: 'every', prereq: 'every', rules: ['every'],
    check: {colourings: 9},
    idea: 'The trefoil’s colourings are its three one-colour ones and the six with every arc different; That’s all is checked.',
    hints: ['Start with one colour on every arc.', 'If two arcs differ, the third is the remaining colour. In how many orders can three different colours go on three arcs?', 'Three one-colour colourings and six with every arc different. Then press That’s all.'],
    parent: {notice: 'How your child organises the search: by changing one arc at a time, or by choosing an order for the colours.', prompt: 'How do you know there isn’t another?', explanation: 'Every crossing touches all three arcs. If two arcs match, the crossing they share forces the third to match: one colour, three ways. If two differ, the third is the remaining colour: every arc different, 3 × 2 × 1 = 6 ways. That is all of them. Other knots have the same number of colourings (puzzle 10’s knot has as many), so equal numbers never show that two loops are the same.', extension: 'Does the trefoil have a colouring with exactly two colours? (No: two different arcs force the third colour.)', connection: 'Fox colourings of a diagram form a vector space over the integers mod 3; for the trefoil it has 9 elements, for every drawing of a plain loop 3.'},
    provenance: 'Week 40 Problem 2: “Find every valid coloring of this loop, including one-color choices”, with That’s all, checked, in place of the twelve record lines.'},
  {number: 6, level: 'medium', title: 'Figure-eight', mode: 'more', claim: 'one', board: 'figure8', copy: 'more', prereq: 'claim', rules: ['one'],
    check: {colourings: 3, nonConstant: 0, claim: true},
    idea: 'The figure-eight is knotted, yet no colouring uses two colours: three colours can certify a knot but cannot always find one.',
    hints: ['Give two arcs at one crossing different colours, and follow what they force.', 'From any crossing coloured all different, the forced colours reach a clash.', 'No colouring uses two colours. Press One colour only.'],
    parent: {notice: 'How many crossings your child starts from before pressing One colour only, and whether a failed try is enough to convince them.', prompt: 'If you colour two arcs at one crossing differently, what is forced next?', explanation: 'A colouring with two colours must change colour somewhere, and colour can only change at a crossing whose two stopping arcs differ; that crossing is then all different. Renaming the colours, its top arc can be red, the arc in blue and the arc out yellow. The other arcs are then forced, and they clash, from whichever crossing you start (tap a crossing on the solved board to see it). So only the three one-colour colourings exist. The figure-eight still cannot be untied: other invariants, such as its Jones polynomial, tell it from a plain loop. Equal colouring counts never show two loops are the same.', extension: 'For grown-ups: with five colours 0–4 and the rule 2 × top ≡ in + out (mod 5), the figure-eight has colourings with more than one colour; it can be coloured this way with n colours exactly when 5 divides n (Bestvina, §4 Problem 11).', connection: 'Its determinant is 5, not divisible by 3, so it has no three-colouring with two colours.'},
    provenance: 'Week 40 grades 4–5 Problem 7, with the review card’s fix 2: draw the figure-eight and find its colourings. Drawn here as the pretzel knot P(2, 1, 1).'},
  {number: 7, level: 'medium', title: 'Pull the bend off', mode: 'complete', board: 'bendPair', copy: 'pair', prereq: 'ends', rules: ['ends', 'pair'],
    check: {colourings: 1},
    idea: 'Pulling the bend off the strand (a second-type Reidemeister move) keeps the colours at the ends.',
    hints: ['Start with the first picture: which arcs touch a filled dot?', 'In the second picture nothing crosses, so each arc is the colour of its filled dot.', 'First picture: bend blue, left arc red, middle arc yellow, right arc red. Second picture: straight arc red, bend blue.'],
    parent: {notice: 'Whether your child colours each picture on its own and then compares, or carries colours across.', prompt: 'Where did the middle arc’s colour go when the bend was pulled off?', explanation: 'In the first picture the bend is blue from its dot and the left arc red, which forces yellow for the middle arc and red for the right arc. In the second picture nothing crosses: the straight arc is red from end to end, and the bend blue. The right-hand dots are red and blue in both pictures; the middle arc lives only inside the move.', extension: 'Choose other colours for the two filled dots in your head. Do the pictures always agree at the other dots? (Yes: in the first picture the right arc is always the left arc’s colour, since 2 × bend − (2 × bend − left) = left.)', connection: 'Each Reidemeister move changes a picture only inside a small disc and matches colourings on its two sides one for one with the same colours at the edge of the disc; that is why the number of colourings is a knot invariant (Bestvina §2–3).'},
    provenance: 'Week 40 grades 2–3 and 4–5 Problem 5: before and after pictures with fixed end dots, here with L red and P blue (end dot R renamed S, review card fix 7).'},
  {number: 8, level: 'medium', title: 'Granny knot', mode: 'more', claim: 'one', board: 'granny', copy: 'more', prereq: 'colour', rules: ['one'],
    check: {colourings: 27, nonConstant: 24, claim: false},
    idea: 'Two trefoils joined: one half can use three colours while the other uses one, so the joined loop is knotted.',
    hints: ['Can you colour just one half of the knot with three colours?', 'The top and bottom arcs join the two halves; in every colouring they match.', 'Make the top left, bottom left, top and bottom arcs red, the top right arc yellow and the bottom right arc blue.'],
    parent: {notice: 'Whether your child sees the two trefoils in the picture.', prompt: 'Can you colour one half and leave the other all one colour?', explanation: 'Each half is a trefoil opened at one arc; the top and bottom arcs are the two pieces of that arc, joined across, so they always share a colour. Colour one half with three colours and give the other half that shared colour throughout: more than one colour, so the granny knot is knotted.', extension: 'Can both halves use three colours at once? (Yes, as long as they agree on the top and bottom arcs.)', connection: 'For a sum of two knots the colourings multiply and divide by 3: (9 × 9) / 3 = 27 for the granny knot.'},
    provenance: 'New, from the review card’s App fit (“colour a knot with more than one colour (trefoil, granny, 6₁)”); the joined loops of the bonus Problem 3.'},
  {number: 9, level: 'hard', title: 'Cinquefoil', mode: 'more', claim: 'one', board: 'cinquefoil', copy: 'more', prereq: 'claim', rules: ['one'],
    check: {colourings: 3, nonConstant: 0, claim: true},
    idea: 'Five lobes instead of three, and no colouring with two colours: from any crossing coloured all different, the forced colours run round to a clash.',
    hints: ['Give two arcs at one crossing different colours, and follow what they force.', 'Each forced colour forces the next, round the knot, until two colours clash.', 'No colouring uses two colours. Press One colour only.'],
    parent: {notice: 'Whether your child expects the trefoil’s pattern (every arc different) to work here.', prompt: 'Where did the colours go wrong, and does it happen from every crossing?', explanation: 'Any colouring with two colours has a crossing coloured all different; renaming colours, red on top, blue in, yellow out. From there each crossing in turn has two coloured arcs and forces the third, and the chain clashes (the solved board shows it from each crossing). So only the three one-colour colourings exist. The cinquefoil is still knotted; three colours just cannot show it.', extension: 'For grown-ups: with five colours and the rule 2 × top ≡ in + out (mod 5) the cinquefoil can use more than one colour.', connection: 'The (2, 5) torus knot 5₁. Its determinant is 5, not divisible by 3.'},
    provenance: 'New, named in the review card’s App fit (“claim ‘one colour only’ where that is true (figure-eight, 5₁, 5₂)”); a five-lobed relative of the worksheet’s trefoil.'},
  {number: 10, level: 'hard', title: 'Stevedore knot', mode: 'more', claim: 'one', board: '6_1', copy: 'more', prereq: 'colour', rules: ['one'],
    check: {colourings: 9, nonConstant: 6, claim: false},
    idea: 'One more twist than puzzle 11’s knot, and now three colours fit: whether a twist knot can be coloured depends on its number of twists.',
    hints: ['Give the top arc and the middle arc different colours, and follow what the crossings force.', 'Each crossing with two coloured arcs decides its third arc; keep going round the knot.', 'Make the top arc red, the middle and lower short arcs blue, the long bottom and upper short arcs yellow, and the lower left arc red.'],
    parent: {notice: 'Whether your child, after the figure-eight, expects one colour only here too.', prompt: 'The figure-eight could only use one colour. What is different here?', explanation: 'Give the top and middle arcs different colours. Where the top arc passes over, the upper short arc is forced to the third colour; where the top and middle arcs both stop, the long bottom arc on top is forced to that third colour too. Two more crossings force the lower left arc to the top arc’s colour and the lower short arc to the middle arc’s, and every crossing then works. The twist knots P(n, 1, 1) can be coloured with more than one colour exactly when n leaves remainder 1 on division by 3.', extension: 'Is this knot the trefoil in disguise, since both use three colours? (No: they have different Jones polynomials. Colourings can show a knot is knotted, never that two knots are the same.)', connection: 'The knot 6₁, the pretzel knot P(4, 1, 1). Its determinant is 9, divisible by 3, and it has 9 colourings.'},
    provenance: 'New, named in the review card’s App fit (6₁): the twist knot with two more half twists than the figure-eight.'},
  {number: 11, level: 'hard', title: 'Three twists', mode: 'more', claim: 'one', board: '5_2', copy: 'more', prereq: 'claim', rules: ['one'],
    check: {colourings: 3, nonConstant: 0, claim: true},
    idea: 'Between the figure-eight and the stevedore knot, this twist knot has no colouring with two colours.',
    hints: ['Give two arcs at one crossing different colours, and follow what they force.', 'From any crossing coloured all different, the forced colours reach a clash.', 'No colouring uses two colours. Press One colour only.'],
    parent: {notice: 'Whether your child tries the stevedore knot’s pattern (pairs of arcs with the same colour) and sees it fail.', prompt: 'Which crossing did you start from, and where did the clash appear?', explanation: 'As for the figure-eight, a colouring with two colours has a crossing coloured all different; from each crossing the forced colours clash. So only the one-colour colourings exist, though the knot is knotted.', extension: 'Line up the figure-eight (two half twists), this knot (three) and the stevedore knot (four). Which twist knots can use three colours? (Those whose number of half twists leaves remainder 1 on division by 3: 1, 4, 7, …)', connection: 'The knot 5₂, the pretzel knot P(3, 1, 1). Its determinant is 7, not divisible by 3.'},
    provenance: 'New, named in the review card’s App fit (5₂), drawn as the pretzel knot P(3, 1, 1).'},
  {number: 12, level: 'hard', title: 'Slide across', mode: 'complete', board: 'slidePair', copy: 'pair', prereq: 'slide', rules: ['ends', 'pair'],
    check: {colourings: 1},
    idea: 'Sliding a strand across a crossing (the third Reidemeister move) leaves the colours at all six ends the same, though an arc inside changes.',
    hints: ['Colour the arcs at the filled dots. No crossing then has two known arcs: try a colour for the curved arc.', 'A wrong colour for the curved arc reaches a clash within three crossings.', 'The curved arc is yellow in both pictures; then each crossing has two known arcs.'],
    parent: {notice: 'Whether your child tries a colour for the curved arc and changes it after a clash, and compares the two pictures’ dots.', prompt: 'Which arc changed colour when the curved strand slid across, and which dots stayed the same?', explanation: 'In the first picture the three filled dots give no crossing two known arcs, so try the curved arc. Red or blue leads to a clash; yellow forces the middle arc blue and the bottom left arc red. In the second picture the top dots force the middle arc yellow at the crossing of the two straight strands, then the curved arc yellow and the bottom left arc red. The dashed dots agree: yellow, yellow and red in both. Only the middle arc changed.', extension: 'Choose any colours for the curved arc and the two top dots. Do the two pictures always end with the same colours at the bottom? (Yes, for all 27 choices; the validator checks them.)', connection: 'Reidemeister’s third move. Matching end colours on both sides of each move is the local fact behind the invariance of colourings (Bestvina §2–3; Kauffman).'},
    provenance: 'New, from the review card’s fix 1: before and after pictures with end dots for the three-strand slide (Type III).'}
];
const PLAY = ['plain', 'trefoil', 'figure8', 'cinquefoil', '5_2', '6_1', 'granny'];

// --- Build --------------------------------------------------------------------------
const id = n => n ? `knots-${String(n).padStart(2, '0')}` : 'knots-playground';
const makeBoard = key => KNOTS[key] ? knot(key) : BOARDS[key]();
const describe = (q, colours) => colours.map((c, i) => `${q.arcs[i].name} ${COLOURS[c]}`).join(', ');
const manyColours = c => new Set(c).size > 1;
function build() {
  const out = PUZZLES.map(item => {
    const q = {mode: item.mode, ...(item.claim ? {claim: item.claim} : {}), ...makeBoard(item.board), ...(item.locked ? {locked: item.locked()} : {})};
    const all = completions(q), name = id(item.number);
    assert.equal(all.length, item.check.colourings, `${name}: colourings`);
    if ('nonConstant' in item.check) assert.equal(nonConstant(q).length, item.check.nonConstant, `${name}: colourings with two or more colours`);
    if (item.claim) assert.equal(claimTrue(q), item.check.claim, `${name}: the claim`);
    let solution;
    if (item.claim && claimTrue(q)) {
      // The certificate: forcing from every crossing (or from the dots) clashes.
      const seeds = q.claim === 'one' ? q.crossings.map((_, i) => i) : [0];
      for (const seed of seeds) assert.ok(certificate(q, seed).clash, `${name}: forcing from crossing ${seed + 1} clashes`);
      solution = {claim: q.claim, clash: q.claim === 'one' ? 'from every crossing' : 'from the dots'};
    } else if (item.mode === 'every') solution = {colourings: all, done: true};
    else {
      const aim = item.mode === 'more' ? nonConstant(q)[0] : all[0];
      assert.ok(aim && (item.mode !== 'more' || manyColours(aim)), `${name}: a witness`);
      solution = {colouring: aim, words: describe(q, aim)};
    }
    const [objective, visible] = OBJECTIVE[item.copy];
    return {
      id: name, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Knot colours', mechanic: 'knots', band: 'all', revision: 1, sourceDocument: 'docs/knots/README.md',
      parameters: q, objective, visibleObjective: visible, instruction: objective,
      controls: CONTROLS[item.mode === 'every' ? 'every' : item.claim || 'plain'],
      rules: [RULES.arcs, RULES.crossing, ...(item.rules || []).map(r => RULES[r]), ...(item.claim === 'cant' ? [RULES.cant] : [])],
      idea: item.idea, prerequisites: PREREQUISITES[item.prereq], hints: item.hints,
      parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
    };
  });
  // A claim puzzle's rules mention its button once.
  for (const p of out) if (p.parameters.claim === 'one' && !p.rules.includes(RULES.one)) p.rules.push(RULES.one);
  const knots = PLAY.map(key => { const {aspect, arcs, crossings, pictures} = knot(key); return {name: KNOTS[key].title, aspect, arcs, crossings, ends: [], pictures}; });
  const playground = {
    id: id(0), number: 0, title: 'Knot colours playground', difficulty_level: 'playground', familyTitle: 'Knot colours', mechanic: 'knots', band: 'playground', revision: 1, sourceDocument: 'docs/knots/README.md',
    parameters: {mode: 'playground', knots},
    objective: 'Colour any of seven knots, and look for colourings with more than one colour.', visibleObjective: '',
    instruction: 'Colour any of seven knots, and look for colourings with more than one colour.',
    controls: CONTROLS.playground, rules: [RULES.arcs, RULES.crossing],
    idea: 'Free colouring on a plain loop and six knots.',
    prerequisites: 'None. A grown-up or a partner can set a challenge: “Can this one use two colours?”',
    hints: ['Pick a knot and try two colours at one crossing.', 'Two different colours at a crossing force the third colour.', 'The trefoil, the stevedore knot and the granny knot can use three colours.'],
    parent: {notice: 'Which knots your child tries to colour with more than one colour, and which they give up on.', prompt: 'Which of these loops could you untie by moving it, without cutting?', explanation: 'A colouring with more than one colour proves a loop is knotted: the trefoil, the stevedore knot and the granny knot have one. The plain loop, the figure-eight, the cinquefoil and the three-twist knot have only one-colour colourings, and of those only the plain loop is unknotted. So a loop with one colour only may or may not be knotted.', extension: 'Draw your own knot on paper and colour it.', connection: 'Fox three-colourings; the number of colourings is 3 times a power of 3, and it never changes when the loop is moved.', sourceIds: sources},
    provenance: 'Week 40 Problem 4’s tray of closed cords (try to make each one a plain loop), as colouring instead of handling: the plain loop, three-colourable knots and knots that three colours cannot see.'
  };
  // Every knot in the playground, too, against the table.
  for (const [k, key] of PLAY.entries()) assert.equal(completions(knots[k]).length, {plain: 3, trefoil: 9, figure8: 3, cinquefoil: 3, '5_2': 3, '6_1': 9, granny: 27}[key], `playground ${key}: colourings`);
  return {
    title: 'Knot colours',
    version: 1,
    families: [{id: 'knots', title: 'Knot colours', mathematics: 'A knot diagram is cut into arcs at its underpasses: an arc runs from one gap to the next, over any crossings between. A colouring gives each arc red, blue or yellow so that at every crossing the arc on top and the two arcs stopping there are all one colour or all three colours; as 0, 1, 2 that is top + in + out ≡ 0 (mod 3), so any two arcs at a crossing decide the third. Each Reidemeister move (a curl, pulling a bend off, sliding a strand across a crossing) matches the colourings on its two sides one for one with the same colours at its edge, so the number of colourings is a knot invariant. A plain loop has only its three one-colour colourings, so a colouring with two or more colours certifies that a loop is knotted: the trefoil (9 colourings), the stevedore knot 6₁ (9) and the granny knot (27). The converse fails: the figure-eight, the cinquefoil 5₁ and the three-twist knot 5₂ are knotted and have only one-colour colourings, which a forced clash from any crossing coloured all different proves. Equal counts never show two loops are the same. Tangles with fixed end dots restrict which end colours occur, and a move keeps the end colours.', rules: [RULES.arcs, RULES.crossing], sourceIds: sources}],
    sources: [
      {id: 'knots-week40', title: 'Bellingham Math Circle — Week 40: Loop colors (student packets, bonus and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-40', kind: 'local curriculum'},
      {id: 'knots-card40', title: 'Week 40 review card (fixes 1, 2 and 7; App fit and Decision)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-40.md', kind: 'local curriculum'},
      {id: 'knots-bestvina', title: 'Mladen Bestvina — Knots: a handout for Summer Math Program (2007), §§1–4 (Reidemeister moves, tricolourability, §4 Problem 11 on the figure-eight)', url: 'https://www.math.utah.edu/~bestvina/HS07/knots-hs07.pdf', kind: 'exposition'},
      {id: 'knots-kauffman', title: 'Louis H. Kauffman — Knots, “The Three Colored Trefoil” and “The Quandle and the Determinant of a Knot”', url: 'https://homepages.math.uic.edu/~kauffman/Tots/Knots', kind: 'exposition'},
      {id: 'knots-knotinfo', title: 'KnotInfo: Table of Knot Invariants (PD notation and Jones polynomials of 3₁, 4₁, 5₁, 5₂ and 6₁)', url: 'https://knotinfo.math.indiana.edu/', kind: 'research'}
    ],
    puzzles: [playground, ...out]
  };
}

// --- Preview ----------------------------------------------------------------------
// A page of every board with arcs numbered, and each arc alone with its name.
async function preview(file) {
  const COL = ['#d1473a', '#3a6dc3', '#f1c232'], h = q => (100 / q.aspect).toFixed(1);
  const show = (title, q) => `<figure style="display:inline-block;width:420px;margin:6px;vertical-align:top"><svg viewBox="0 0 100 ${h(q)}" style="width:100%;border:1px solid #ccc">${(q.frames || []).map(([x, y, w, hh]) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="#f4f1e4"/>`).join('')}${q.crossings.map(x => `<circle cx="${x.at[0]}" cy="${x.at[1]}" r="5.4" fill="#e2ecd6" stroke="#31533e" stroke-width="1"/>`).join('')}${q.arcs.map((a, i) => { const d = 'M' + a.d.map(p => p.join(' ')).join('L'); return `<path d="${d}" fill="none" stroke="#294439" stroke-width="4.6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${COL[i % 3]}" stroke-width="2.8" stroke-linecap="round"/>`; }).join('')}${q.ends.map(e => `<circle cx="${e.at[0]}" cy="${e.at[1]}" r="2.7" fill="${e.colour === undefined ? '#fff' : COL[e.colour]}" stroke="#294439" ${e.match !== undefined ? 'stroke-dasharray="1 1"' : ''}/>`).join('')}${q.arcs.map((a, i) => { const m = a.d[Math.floor(a.d.length / 2)]; return `<text x="${m[0]}" y="${m[1]}" font-size="4" fill="#000">${i}</text>`; }).join('')}</svg><figcaption style="font:12px sans-serif">${title}</figcaption></figure>`;
  const one = (t, q, k) => `<figure style="display:inline-block;width:200px;margin:4px;vertical-align:top"><svg viewBox="0 0 100 ${h(q)}" style="width:100%;border:1px solid #ccc">${q.arcs.map((a, i) => `<path d="M${a.d.map(p => p.join(' ')).join('L')}" fill="none" stroke="${i === k ? '#d1473a' : '#ccc'}" stroke-width="${i === k ? 4 : 2.5}" stroke-linecap="round"/>`).join('')}</svg><figcaption style="font:11px sans-serif">${t} ${k}: ${q.arcs[k].name}</figcaption></figure>`;
  const items = [...Object.keys(KNOTS).map(k => [k, knot(k)]), ...Object.entries(BOARDS).map(([k, f]) => [k, f()])];
  for (const [t, q] of items) console.log(t, q.pictures.map(p => JSON.stringify(p.code)).join(' '));
  await writeFile(file, `<!doctype html><body>${items.map(([t, q]) => show(t, q)).join('')}<hr>${items.map(([t, q]) => q.arcs.map((_, k) => one(t, q, k)).join('') + '<br>').join('')}</body>`);
}
const main = process.argv[1] === new URL(import.meta.url).pathname;
if (main && PREVIEW) await preview(process.argv[process.argv.indexOf('--preview') + 1]);
else if (main) {
  const json = build();
  // Indented like the other packs, with each list of numbers (a point, an
  // arc's points, a code) kept on one line.
  const text = JSON.stringify(json, null, 1).replace(/\[[^[\]{}"]*\]/g, m => m.replace(/\s+/g, '')).replace(/\[(\s*\[[^[\]{}"]*\],?)+\s*\]/g, m => m.replace(/\s+/g, ''));
  assert.deepEqual(JSON.parse(text), json);
  await writeFile(new URL('../dist/families/knots/knots.json', import.meta.url), text + '\n');
  for (const p of json.puzzles.slice(1)) console.log(`${p.id} ${p.difficulty_level} ${p.parameters.mode}${p.parameters.claim ? `/${p.parameters.claim}` : ''}: ${p.solution.claim ? `${p.solution.claim} (clash ${p.solution.clash})` : p.solution.colourings ? `${p.solution.colourings.length} colourings` : p.solution.words}`);
}
