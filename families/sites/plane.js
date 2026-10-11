// Exact nearest-site geometry on the half-unit lattice (worksheet Week 15).
// Points are given in half-steps: the lattice point (x, y) in grid squares is
// [2x, 2y], so every site, marked place and new dot has whole-number
// coordinates. A place z belongs to every site s with |z − s| smallest; the
// cell of s is the closed set of such places. Against one other site k, the
// places at least as close to s as to k form the half-plane
//   2(k − s)·z ≤ |k|² − |s|²,
// whose edge is the perpendicular bisector of s and k, so a cell is an
// intersection of half-planes: convex, containing its site, possibly
// unbounded. Everything here is exact: a half-plane is {a, b, c} meaning
// a·u + b·v ≤ c with whole numbers, and a corner of a cell is [X, Y, D],
// the point (X/D, Y/D) in half-steps with D > 0 in lowest terms. Sites lie
// within 6 half-steps of the centre, so a, b ≤ 24 and c ≤ 72 after the
// factor 2, a corner where two edges meet has |X|, |Y| ≤ 3456 and D ≤ 1152,
// and every product below stays far inside the safe integers. A cell is cut
// out of a box of half-size M (BIG, far beyond every corner, to read the
// whole cell; or the view, to draw it). Nothing here knows about the app.
export const BIG = 100000;
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isPoint = z => Array.isArray(z) && z.length === 2 && z.every(Number.isSafeInteger);
export const samePoint = (p, q) => p[0] === q[0] && p[1] === q[1];
export const keyOf = z => `${z[0]},${z[1]}`;
export const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;

// The places at least as close to s as to k.
export function bisector(s, k) {
  const a = 2 * (k[0] - s[0]), b = 2 * (k[1] - s[1]), c = k[0] ** 2 + k[1] ** 2 - s[0] ** 2 - s[1] ** 2;
  const g = gcd(gcd(a, b), c) || 1;
  return {a: a / g, b: b / g, c: c / g};
}
// Where two edge lines cross, or null for parallel lines.
function meet(p, q) {
  let D = p.a * q.b - q.a * p.b;
  if (!D) return null;
  let X = p.c * q.b - q.c * p.b, Y = p.a * q.c - q.a * p.c;
  if (D < 0) { D = -D; X = -X; Y = -Y; }
  const g = gcd(gcd(X, Y), D);
  return [X / g || 0, Y / g || 0, D / g];
}
export const inside = (h, [X, Y, D]) => h.a * X + h.b * Y <= h.c * D;
export const onLine = (h, [X, Y, D]) => h.a * X + h.b * Y === h.c * D;
export const holds = (h, z) => h.a * z[0] + h.b * z[1] <= h.c;
const boxOf = M => [{a: 1, b: 0, c: M, owner: 'box'}, {a: -1, b: 0, c: M, owner: 'box'}, {a: 0, b: 1, c: M, owner: 'box'}, {a: 0, b: -1, c: M, owner: 'box'}];

// Corners in turning order round an inside point o (a lattice point).
const half = ([x, y]) => (y > 0 || (y === 0 && x > 0) ? 0 : 1);
function around(o) {
  const rel = v => [v[0] - o[0] * v[2], v[1] - o[1] * v[2]];
  return (p, q) => {
    const r = rel(p), s = rel(q), h = half(r) - half(s);
    if (h) return h;
    const cross = r[0] * s[1] - r[1] * s[0];
    return cross > 0 ? -1 : cross < 0 ? 1 : 0;
  };
}
// The intersection of half-planes with the box of half-size M, as corners
// round the inside point o, each edge carrying the owner of its line ('box'
// for the box). Every crossing of two lines that keeps every half-plane is a
// corner; a corner shared by several lines (a four-way tie) is kept once.
export function region(halves, o, M = BIG) {
  const lines = [...halves, ...boxOf(M)], found = new Map();
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const v = meet(lines[i], lines[j]);
    if (!v) continue;
    const key = v.join();
    if (!found.has(key) && lines.every(h => inside(h, v))) found.set(key, v);
  }
  const verts = [...found.values()].sort(around(o));
  const edges = verts.map((v, k) => {
    const w = verts[(k + 1) % verts.length], on = lines.filter(h => onLine(h, v) && onLine(h, w));
    const line = on.find(h => h.owner !== 'box') || on[0];
    return {owner: line.owner, line};
  });
  return {verts, edges, M};
}

// The cell of site i among `sites`; each edge's owner is the other site.
const cells = new Map();
export function cellOf(sites, i, M = BIG) {
  const key = `${M}|${i}|${sites.map(keyOf).join(' ')}`;
  if (cells.has(key)) return cells.get(key);
  const halves = [];
  sites.forEach((k, j) => { if (j !== i) halves.push({...bisector(sites[i], k), owner: j}); });
  const cell = region(halves, sites[i], M);
  if (cells.size > 4000) cells.clear();
  cells.set(key, cell);
  return cell;
}
// A region given by half-planes (a target), round the inside point o.
export const shapeOf = (halves, o, M = BIG) => region(halves.map((h, i) => ({...h, owner: `t${i}`})), o, M);

export const onBox = ({verts, M}) => verts.some(([X, Y, D]) => Math.abs(X) === M * D || Math.abs(Y) === M * D);
export const bounded = cell => !onBox(cell);
// The whole region lies in the square frame |u|, |v| ≤ F.
export const fits = (cell, F) => bounded(cell) && cell.verts.every(([X, Y, D]) => Math.abs(X) <= F * D && Math.abs(Y) <= F * D);
// Two regions read in the same box are the same region.
const canon = cell => cell.verts.map(v => v.join()).sort().join(' ');
export const sameRegion = (p, q) => p.M === q.M && canon(p) === canon(q);

// Does a region (read in the big box), cut by one more half-plane h, lie in
// the frame? The cut keeps the corners inside h and adds one wherever an edge
// crosses h's line. A corner on the box is never in the frame, so a cut that
// leaves the region running off is caught too. h always keeps the region's
// inside point here (it is a new dot's half-plane), so the cut is not empty.
const sideOf = (h, [X, Y, D]) => Math.sign(h.a * X + h.b * Y - h.c * D);
export function clipFits(cell, h, F) {
  const {verts, edges} = cell, n = verts.length, ok = ([X, Y, D]) => Math.abs(X) <= F * D && Math.abs(Y) <= F * D;
  for (let k = 0; k < n; k++) {
    const v = verts[k], w = verts[(k + 1) % n], sv = sideOf(h, v), sw = sideOf(h, w);
    if (sv <= 0 && !ok(v)) return false;
    if (sv * sw < 0 && !ok(meet(edges[k].line, h))) return false;
  }
  return true;
}

// The sites nearest to a lattice place, by index.
export function nearest(sites, z) {
  const d = sites.map(s => d2(s, z)), m = Math.min(...d);
  return d.flatMap((x, i) => (x === m ? [i] : []));
}
export const owns = (sites, i, z) => nearest(sites, z).includes(i);
// The places i and j share: an edge (possibly running off to the box), a
// single corner, or nothing. Cell i lies on its side of the bisector of i and
// j, so what it has on that line is an edge, a corner or nothing.
export function shared(sites, i, j, M = BIG) {
  const cell = cellOf(sites, i, M), line = bisector(sites[i], sites[j]);
  const k = cell.edges.findIndex(e => e.owner === j);
  if (k >= 0) return {kind: 'edge', from: cell.verts[k], to: cell.verts[(k + 1) % cell.verts.length]};
  const v = cell.verts.find(x => onLine(line, x));
  return v ? {kind: 'point', at: v} : null;
}
export const touches = (sites, i, j) => shared(sites, i, j) !== null;
// The places that belong to three or more sites (the corners of the map that
// are not on the box), each with the sites that tie there.
export function ties(sites, M = BIG) {
  const out = new Map();
  sites.forEach((s, i) => {
    const cell = cellOf(sites, i, M);
    cell.verts.forEach((v, k) => {
      const before = cell.edges[(k + cell.verts.length - 1) % cell.verts.length], after = cell.edges[k];
      if (before.owner === 'box' || after.owner === 'box') return;
      const key = v.join();
      if (!out.has(key)) out.set(key, {at: v, sites: new Set()});
      const tie = out.get(key);
      tie.sites.add(i); tie.sites.add(before.owner); tie.sites.add(after.owner);
    });
  });
  return [...out.values()].map(t => ({at: t.at, sites: [...t.sites].sort((a, b) => a - b)}));
}
// A place shared by four or more sites.
export const fourWay = sites => ties(sites).some(t => t.sites.length >= 4);
// A corner of site i's region shared by four or more sites (one region read,
// not every one: a place four sites share is a corner of each of their regions).
export function fourWayAt(sites, i) {
  const cell = cellOf(sites, i);
  return cell.verts.some(([X, Y, D]) => {
    if (Math.abs(X) === cell.M * D || Math.abs(Y) === cell.M * D) return false;
    const d = sites.map(s => (X - s[0] * D) ** 2 + (Y - s[1] * D) ** 2), m = Math.min(...d);
    return d.filter(x => x === m).length >= 4;
  });
}

// Is r on the closed segment from p to q? (All lattice points.)
export function onSegment(p, q, r) {
  const cross = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  if (cross) return false;
  return (r[0] - p[0]) * (q[0] - p[0]) + (r[1] - p[1]) * (q[1] - p[1]) >= 0 && (r[0] - q[0]) * (p[0] - q[0]) + (r[1] - q[1]) * (p[1] - q[1]) >= 0;
}
// The lattice points of the frame |u|, |v| ≤ F, row by row from the top left.
const frames = new Map();
export function framePoints(F) {
  if (!frames.has(F)) { const out = []; for (let v = F; v >= -F; v--) for (let u = -F; u <= F; u++) out.push([u, v]); frames.set(F, out); }
  return frames.get(F);
}
export const inFrame = (z, F) => isPoint(z) && Math.abs(z[0]) <= F && Math.abs(z[1]) <= F;
export const toUnits = ([X, Y, D]) => [X / D / 2, Y / D / 2];
export const validHalf = h => object(h) && [h.a, h.b, h.c].every(Number.isSafeInteger) && (h.a || h.b);
