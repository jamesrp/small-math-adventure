// The shared portal board: surfaces made of unit squares glued edge to edge by
// translations (a torus, a cylinder, a few squares glued any way), drawn as two
// views. The portal room is the surface itself, its squares where the family
// lays them out, with matching marks on the edges that are glued together. The
// unrolled view lays copies of the squares out in the plane along a path, so a
// trip that crosses a seam goes straight on. The module computes exact lattice
// positions, steps, lifts and straight shots of any rational slope with
// integer and rational arithmetic, draws both views as SVG, and wires taps,
// keys and finger slides. It never knows a family's rules. Portal rooms
// (Week 41) is the first user; Weeks 64, 70 and 75 can build on it. See
// docs/portal-board.md.
import {esc} from './expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = Number.isSafeInteger;

/* ------------------------------------------------------------------ *
 * Exact rationals, as [numerator, denominator] with the denominator
 * positive and the pair in lowest terms. Every function also takes a
 * plain integer.
 * ------------------------------------------------------------------ */
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const pair = x => Array.isArray(x) ? x : [x, 1];
export function Q(n, d = 1) {
  if (Array.isArray(n)) [n, d] = [n[0], n[1] * d];
  if (!integer(n) || !integer(d) || d === 0) throw new RangeError(`Not a rational: ${n}/${d}`);
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}
Q.add = (a, b) => { [a, b] = [pair(a), pair(b)]; return Q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]); };
Q.sub = (a, b) => { [a, b] = [pair(a), pair(b)]; return Q(a[0] * b[1] - b[0] * a[1], a[1] * b[1]); };
Q.mul = (a, b) => { [a, b] = [pair(a), pair(b)]; return Q(a[0] * b[0], a[1] * b[1]); };
Q.div = (a, b) => { [a, b] = [pair(a), pair(b)]; return Q(a[0] * b[1], a[1] * b[0]); };
Q.cmp = (a, b) => { [a, b] = [pair(a), pair(b)]; return Math.sign(a[0] * b[1] - b[0] * a[1]); };
Q.eq = (a, b) => Q.cmp(a, b) === 0;
Q.lt = (a, b) => Q.cmp(a, b) < 0;
Q.le = (a, b) => Q.cmp(a, b) <= 0;
Q.min = (a, b) => Q.le(a, b) ? pair(a) : pair(b);
Q.num = a => pair(a)[0] / pair(a)[1];
Q.isInt = a => pair(a)[1] === 1;
Q.floor = a => Math.floor(pair(a)[0] / pair(a)[1]);
Q.valid = a => integer(a) || (Array.isArray(a) && a.length === 2 && a.every(integer) && a[1] > 0 && gcd(a[0], a[1]) === 1);

/* ------------------------------------------------------------------ *
 * Directions and steps. y counts up, as on the worksheets.
 * ------------------------------------------------------------------ */
export const DIRS = {R: [1, 0], U: [0, 1], L: [-1, 0], D: [0, -1]};
export const DIR_NAMES = {R: 'right', U: 'up', L: 'left', D: 'down'};
export const OPPOSITE = {R: 'L', L: 'R', U: 'D', D: 'U'};
// A word such as 'RRU' as a list of unit steps, and back.
export const stepsOf = word => [...word].map(c => DIRS[c]);
export const wordOf = steps => steps.map(([a, b]) => Object.keys(DIRS).find(k => DIRS[k][0] === a && DIRS[k][1] === b) || '?').join('');
const SIDES = {right: [1, 0], up: [0, 1], left: [-1, 0], down: [0, -1]};
const BACK = {right: 'left', left: 'right', up: 'down', down: 'up'};

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */
// A surface from a puzzle's parameters:
//   squares: {id: [column, row]}   where each square is drawn in the portal
//                                   room, row 0 at the bottom
//   right:   {id: id | null}       the square across each square's right side
//   up:      {id: id | null}       the square across its top side
//   n:       lattice steps along a square's side (default 1)
//   lattice: 'cells' (points at the centres of the n × n small cells, the
//            default) or 'crosses' (points where lattice lines cross)
// A missing or null neighbour is a wall. Gluing is by translation only, so a
// square's left and down neighbours follow from right and up.
export function validSurfaceSpec(spec) {
  if (!object(spec) || !object(spec.squares)) return false;
  const ids = Object.keys(spec.squares);
  if (!ids.length || ids.length > 400) return false;
  if (!ids.every(id => Array.isArray(spec.squares[id]) && spec.squares[id].length === 2 && spec.squares[id].every(integer))) return false;
  if (new Set(ids.map(id => spec.squares[id].join())).size !== ids.length) return false;
  for (const map of [spec.right, spec.up]) {
    if (map === undefined) continue;
    if (!object(map) || !Object.keys(map).every(id => Object.hasOwn(spec.squares, id))) return false;
    const targets = Object.values(map).filter(v => v !== null);
    if (!targets.every(v => typeof v === 'string' && Object.hasOwn(spec.squares, v)) || new Set(targets).size !== targets.length) return false;
  }
  if (spec.n !== undefined && !(integer(spec.n) && spec.n >= 1 && spec.n <= 60)) return false;
  return spec.lattice === undefined || spec.lattice === 'cells' || spec.lattice === 'crosses';
}

// A spec from rows of square names, top row first: each character is one
// square, drawn where it stands. `wrapX` glues each row's right end to its
// left end and `wrapY` the top row to the bottom row, both by translation;
// false leaves a wall. Rows ['ABC', 'DHE', 'FGI'] give Week 41's 3 × 3 torus.
export function roomFromRows(rows, {wrapX = true, wrapY = true} = {}) {
  const H = rows.length, W = rows[0].length, squares = {}, right = {}, up = {};
  rows.forEach((row, k) => [...row].forEach((id, c) => { squares[id] = [c, H - 1 - k]; }));
  const name = (c, r) => rows[H - 1 - r][c];
  for (const [id, [c, r]] of Object.entries(squares)) {
    right[id] = c + 1 < W ? name(c + 1, r) : wrapX ? name(0, r) : null;
    up[id] = r + 1 < H ? name(c, r + 1) : wrapY ? name(c, 0) : null;
  }
  return {squares, right, up};
}

// Surfaces are cached by spec, the 64 most recently used, so calling
// surfaceOf in every render is cheap and a family that edits gluings doesn't
// keep every surface it has made.
const surfaces = new Map(), SURFACE_CACHE = 64;
export function surfaceOf(spec) {
  const cacheKey = JSON.stringify(spec);
  if (surfaces.has(cacheKey)) {
    const hit = surfaces.get(cacheKey);
    surfaces.delete(cacheKey); surfaces.set(cacheKey, hit);
    return hit;
  }
  const ids = Object.keys(spec.squares), at = Object.fromEntries(ids.map(id => [id, [...spec.squares[id]]]));
  const right = Object.fromEntries(ids.map(id => [id, spec.right?.[id] ?? null]));
  const up = Object.fromEntries(ids.map(id => [id, spec.up?.[id] ?? null]));
  const left = Object.fromEntries(ids.map(id => [id, null])), down = Object.fromEntries(ids.map(id => [id, null]));
  for (const id of ids) { if (right[id]) left[right[id]] = id; if (up[id]) down[up[id]] = id; }
  const n = spec.n || 1, lattice = spec.lattice || 'cells';
  const byPos = new Map(ids.map(id => [at[id].join(), id]));
  const cs = ids.map(id => at[id][0]), rs = ids.map(id => at[id][1]);
  const box = [Math.min(...cs), Math.min(...rs), Math.max(...cs) + 1, Math.max(...rs) + 1];
  const glue = {right, up, left, down};
  const s = {spec, ids, at, right, up, left, down, glue, n, lattice, byPos, box};
  s.edges = roomEdges(s);
  s.marks = seamMarks(s);
  s.corners = cornerSets(s);
  // A torus or cylinder: every square's right-then-up and up-then-right agree,
  // so the unrolled plane is one fixed tiling.
  s.abelian = ids.every(id => !right[id] || !up[id] || !up[right[id]] || up[right[id]] === right[up[id]]);
  surfaces.set(cacheKey, s);
  if (surfaces.size > SURFACE_CACHE) surfaces.delete(surfaces.keys().next().value);
  return s;
}

// Corners. A square's corner [cx, cy] is its lower-left [0, 0], upper-left
// [0, 1], lower-right [1, 0] or upper-right [1, 1]. Across a glued right side
// a square's two right corners are the two left corners of the square there;
// across a glued top its two top corners are the bottom corners of the square
// above. The corners this joins up are one point of the surface, a corner
// class: {corners: [{s, c: [cx, cy]}], angle, wall, cone}. `angle` is the
// total angle round the point in degrees, 90 for each corner; `wall` says the
// point lies on a wall; `cone` marks an inner point whose angle isn't 360,
// where the squares round it don't close up. On a torus every class is four
// corners and 360 degrees; on Week 64's L all twelve corners are one class of
// 1080 degrees. The first corner is the class's representative: a lower-left
// corner when there is one (the square to the right of the point and above
// it), then upper-left, lower-right, upper-right, in the order of `ids`.
const CORNERS = [[0, 0], [0, 1], [1, 0], [1, 1]];
const cornerKey = (id, [cx, cy]) => `${id}:${cx}${cy}`;
function cornerSets(s) {
  const parent = new Map();
  const find = k => { while (parent.get(k) !== k) k = parent.get(k); return k; };
  const join = (a, b) => { const [ra, rb] = [find(a), find(b)]; if (ra !== rb) parent.set(rb, ra); };
  for (const id of s.ids) for (const c of CORNERS) parent.set(cornerKey(id, c), cornerKey(id, c));
  for (const id of s.ids) {
    const r = s.right[id], u = s.up[id];
    if (r) { join(cornerKey(id, [1, 0]), cornerKey(r, [0, 0])); join(cornerKey(id, [1, 1]), cornerKey(r, [0, 1])); }
    if (u) { join(cornerKey(id, [0, 1]), cornerKey(u, [0, 0])); join(cornerKey(id, [1, 1]), cornerKey(u, [1, 0])); }
  }
  const groups = new Map();
  for (const c of CORNERS) for (const id of s.ids) {
    const root = find(cornerKey(id, c));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push({s: id, c});
  }
  const classes = [...groups.values()].map(corners => {
    const wall = corners.some(({s: id, c: [cx, cy]}) => !s.glue[cx ? 'right' : 'left'][id] || !s.glue[cy ? 'up' : 'down'][id]);
    const angle = 90 * corners.length;
    return {corners, angle, wall, cone: !wall && angle !== 360};
  });
  const of = new Map();
  classes.forEach((cl, k) => cl.corners.forEach(({s: id, c}) => of.set(cornerKey(id, c), k)));
  return {classes, of};
}
export const cornerClasses = surface => surface.corners.classes;
// The class of square s's corner [cx, cy].
export const cornerClass = (surface, s, c) => surface.corners.classes[surface.corners.of.get(cornerKey(s, c))];

// The room's drawn edges. Each side of each square is one of: 'inner' (glued
// to the square drawn next to it), 'wall' (glued to nothing) or 'seam' (glued
// to a square drawn somewhere else, carrying a mark that its partner repeats).
function roomEdges(s) {
  const out = [];
  for (const id of s.ids) {
    const [c, r] = s.at[id];
    for (const [side, [dx, dy]] of Object.entries(SIDES)) {
      const glued = s.glue[side][id], drawn = s.byPos.get(`${c + dx},${r + dy}`) ?? null;
      const kind = glued === null ? 'wall' : glued === drawn ? 'inner' : 'seam';
      out.push({s: id, side, kind, partner: glued});
    }
  }
  return out;
}

// Seam marks. Seam edges along one drawn line whose partners lie along one
// drawn line in the same order form a run; a run and its partner run share a
// shape and a colour. The shape is drawn on the middle of each run (`along`
// square widths from the start of its first square's side), and every seam
// edge of the pair takes the colour (`edge.colour`), so matching marks show
// the translation (nothing is ever turned over).
export const MARK_SHAPES = ['circle', 'diamond', 'triangle', 'square', 'bar', 'star'];
export const MARK_COLOURS = ['sun', 'sky', 'rose', 'leaf'];
function seamMarks(s) {
  const runs = [];
  for (const side of ['right', 'up']) {
    const along = side === 'right' ? 1 : 0; // the coordinate that varies along the run
    const edges = s.edges.filter(e => e.side === side && e.kind === 'seam').sort((a, b) => {
      const [pa, pb] = [s.at[a.s], s.at[b.s]];
      return pa[1 - along] - pb[1 - along] || pa[along] - pb[along];
    });
    for (const e of edges) {
      const last = runs.at(-1);
      const pe = s.at[e.s], pg = s.at[e.partner];
      if (last && last.side === side) {
        const le = s.at[last.squares.at(-1)], lg = s.at[last.partners.at(-1)];
        const next = (p, q) => p[1 - along] === q[1 - along] && p[along] === q[along] + 1;
        if (next(pe, le) && next(pg, lg)) { last.squares.push(e.s); last.partners.push(e.partner); continue; }
      }
      runs.push({side, squares: [e.s], partners: [e.partner]});
    }
  }
  const marks = [];
  runs.forEach((run, k) => {
    const look = {k, shape: MARK_SHAPES[k % MARK_SHAPES.length], colour: MARK_COLOURS[k % MARK_COLOURS.length]}, along = run.squares.length / 2;
    marks.push({...look, s: run.squares[0], side: run.side, along}, {...look, s: run.partners[0], side: BACK[run.side], along});
    for (const e of s.edges) {
      if (e.kind !== 'seam') continue;
      if ((e.side === run.side && run.squares.includes(e.s)) || (e.side === BACK[run.side] && run.partners.includes(e.s))) e.colour = look.colour;
    }
  });
  return marks;
}
// The colour of the seam on one side of a square, or ''.
const seamColour = (s, id, side) => s.edges.find(e => e.s === id && e.side === side)?.colour || '';

/* ------------------------------------------------------------------ *
 * Lattice points and steps
 * ------------------------------------------------------------------ */
// A lattice point is {s, i, j}: square s, and integer lattice coordinates
// inside it. On 'cells' 0 <= i, j < n and the point is the centre of a small
// cell; on 'crosses' 0 <= i, j <= n, and a point on a glued edge is stored in
// the square to its right or above (i = n or j = n only beside a wall). A
// cross at a corner is stored as its corner class's representative, so every
// point of the surface has exactly one form, even a cone point.
// A placed point also has X, Y: where its square lies in the plane, in
// square units, with the portal room drawn at copy (0, 0).
const isCorner = (surface, pt) => surface.lattice === 'crosses' && (pt.i === 0 || pt.i === surface.n) && (pt.j === 0 || pt.j === surface.n);
// The same corner point stored in another corner of its class, keeping its
// place in the plane (a corner point stays put as the squares turn round it).
function atCorner(surface, pt, {s, c: [cx, cy]}) {
  const n = surface.n, out = {s, i: cx * n, j: cy * n};
  return pt.X === undefined ? out : {...out, X: pt.X + pt.i / n - cx, Y: pt.Y + pt.j / n - cy};
}
export function canonical(surface, pt) {
  let {s, i, j, X, Y} = pt;
  const n = surface.n, lim = surface.lattice === 'cells' ? n - 1 : n;
  for (let guard = 0; guard < 8; guard++) {
    if (i > lim || (surface.lattice === 'crosses' && i === n && surface.right[s])) { if (!surface.right[s]) return null; s = surface.right[s]; i -= n; if (X !== undefined) X++; continue; }
    if (i < 0) { if (!surface.left[s]) return null; s = surface.left[s]; i += n; if (X !== undefined) X--; continue; }
    if (j > lim || (surface.lattice === 'crosses' && j === n && surface.up[s])) { if (!surface.up[s]) return null; s = surface.up[s]; j -= n; if (Y !== undefined) Y++; continue; }
    if (j < 0) { if (!surface.down[s]) return null; s = surface.down[s]; j += n; if (Y !== undefined) Y--; continue; }
    const out = X === undefined ? {s, i, j} : {s, i, j, X, Y};
    return isCorner(surface, out) ? atCorner(surface, out, cornerClass(surface, s, [i / n, j / n]).corners[0]) : out;
  }
  return null;
}
export const validPoint = (surface, pt) => object(pt) && Object.hasOwn(surface.at, pt.s) && integer(pt.i) && integer(pt.j) && JSON.stringify(canonical(surface, {s: pt.s, i: pt.i, j: pt.j})) === JSON.stringify({s: pt.s, i: pt.i, j: pt.j});
export const samePoint = (a, b) => a.s === b.s && a.i === b.i && a.j === b.j;
export const pointKey = pt => `${pt.s}:${pt.i},${pt.j}`;
// Where a placed point sits in the plane, as integer lattice coordinates
// [u, v]: a cell is named by its lower-left corner, a cross by itself.
export const planeKey = (surface, pt) => [pt.X * surface.n + pt.i, pt.Y * surface.n + pt.j];
// The copy a placed square belongs to: how far it is from where the portal
// room draws it, in square units. On a torus of W × H squares this is a
// multiple of [W, H]; on a one-square room it is the copy itself.
export const copyOf = (surface, s, X, Y) => [X - surface.at[s][0], Y - surface.at[s][1]];
// Place a point in the plane, in the given copy of the room (default [0, 0]).
export const place = (surface, pt, copy = [0, 0]) => ({s: pt.s, i: pt.i, j: pt.j, X: surface.at[pt.s][0] + copy[0], Y: surface.at[pt.s][1] + copy[1]});

// One lattice step from a placed point along [dx, dy] (a unit step, or any
// integer vector that stays within one square's width), or null at a wall.
// A step out of a corner leaves through a square the step goes into: the
// corner given, when its square lies that way, otherwise the first such corner
// of its class. At a cone point, where several squares lie each way, a family
// that needs a particular one passes that corner.
export function step(surface, pt, [dx, dy]) {
  if (isCorner(surface, pt)) {
    const n = surface.n, faces = (d, c) => d > 0 ? c === 0 : d < 0 ? c === 1 : true;
    const ahead = ({c: [cx, cy]}) => faces(dx, cx) && faces(dy, cy), here = {s: pt.s, c: [pt.i / n, pt.j / n]};
    const from = ahead(here) ? here : cornerClass(surface, pt.s, here.c).corners.find(ahead);
    if (!from) return null;
    pt = {...pt, ...atCorner(surface, pt, from)};
  } else if (surface.lattice === 'crosses') {
    // A cross on a wall edge can't step out through the wall.
    if ((pt.i === surface.n && dx > 0) || (pt.j === surface.n && dy > 0)) return null;
  }
  return canonical(surface, {...pt, i: pt.i + dx, j: pt.j + dy});
}

// The lift of a trip: the placed points it visits, from a start point in a
// start copy, step by step into the plane. Its end and the copies it visits
// say where it finishes and what it passed through; on a torus a trip that
// ends at its start point ends in copy [m·W, n·H]. On a surface that isn't a
// torus the lift is still exact: it is built square by square as the trip
// goes, from the gluing, never from a fixed tiling. `blocked` is the index of
// the first step that runs into a wall (the lift stops there), or -1.
export function lift(surface, start, steps, copy = [0, 0]) {
  let here = start.X === undefined ? place(surface, start, copy) : {...start};
  const points = [here];
  let blocked = -1;
  for (let k = 0; k < steps.length; k++) {
    const next = step(surface, here, steps[k]);
    if (!next) { blocked = k; break; }
    points.push(next); here = next;
  }
  const copies = [];
  for (const p of points) { const c = copyOf(surface, p.s, p.X, p.Y); if (!copies.some(d => d[0] === c[0] && d[1] === c[1])) copies.push(c); }
  return {points, end: here, endCopy: copyOf(surface, here.s, here.X, here.Y), copies, blocked};
}

/* ------------------------------------------------------------------ *
 * Straight shots
 * ------------------------------------------------------------------ */
// The geometric position of a lattice point inside its square, in lattice
// units, as rationals.
export const spot = (surface, pt) => surface.lattice === 'cells' ? [Q(2 * pt.i + 1, 2), Q(2 * pt.j + 1, 2)] : [Q(pt.i), Q(pt.j)];

// Is the corner of square s at (x, y) (each 0 or n) a flat point, where the
// four squares round it close up? A corner where they don't is a cone point,
// and a straight path can't go on through it. A corner beside a wall counts
// as flat for a path that doesn't need the missing square.
function coneCorner(surface, s, x, y) {
  const h = Q.eq(x, 0) ? surface.left : surface.right, v = Q.eq(y, 0) ? surface.down : surface.up;
  const a = h[s], b = v[s];
  if (!a || !b || !v[a] || !h[b]) return false;
  return v[a] !== h[b];
}

// A straight shot from a point along an integer direction [a, b], through the
// seams, for `length` direction vectors (a rational; omit it to go on until
// something stops the shot). `from` is {s, x, y} with rational x, y inside
// square s (or a lattice point {s, i, j}), optionally placed with X, Y.
// Options: `targets`, a list of points ({s, x, y} or lattice points) where
// the shot stops at the first one it reaches after leaving; `corners: 'stop'`
// to stop at any square corner (it always stops at a cone point); `limit`, the
// most squares to cross (default 200). Returns
//   {pieces: [{s, X, Y, a: [x, y], b: [x, y]}], end: {s, x, y, X, Y},
//    stop: 'length' | 'wall' | 'corner' | 'target' | 'limit', target, t}
// where each piece lies in one square (local rational coordinates), `target`
// is the index of the target reached, and t the length travelled.
export function shoot(surface, from, dir, opts = {}) {
  const n = surface.n, [a, b] = dir;
  if (!integer(a) || !integer(b) || (a === 0 && b === 0)) throw new RangeError('A shot needs a nonzero integer direction');
  const toSpot = p => p.x !== undefined ? {s: p.s, x: Q(p.x), y: Q(p.y)} : (([x, y]) => ({s: p.s, x, y}))(spot(surface, p));
  let {s, x, y} = toSpot(from);
  let X = from.X ?? surface.at[s][0], Y = from.Y ?? surface.at[s][1];
  let left = opts.length === undefined ? null : Q(opts.length), t = Q(0);
  // Each target in every square whose closed edges hold it.
  const reps = [];
  (opts.targets || []).forEach((target, k) => {
    const p = toSpot(target);
    const cx = Q.eq(p.x, 0) ? 0 : Q.eq(p.x, n) ? 1 : null, cy = Q.eq(p.y, 0) ? 0 : Q.eq(p.y, n) ? 1 : null;
    // A corner is in every square of its class; a point on a side, in the
    // square across it too.
    if (cx !== null && cy !== null) { for (const m of cornerClass(surface, p.s, [cx, cy]).corners) reps.push({k, s: m.s, x: Q(m.c[0] * n), y: Q(m.c[1] * n)}); return; }
    reps.push({k, s: p.s, x: p.x, y: p.y});
    if (cx !== null && surface.glue[cx ? 'right' : 'left'][p.s]) reps.push({k, s: surface.glue[cx ? 'right' : 'left'][p.s], x: Q(cx ? 0 : n), y: p.y});
    if (cy !== null && surface.glue[cy ? 'up' : 'down'][p.s]) reps.push({k, s: surface.glue[cy ? 'up' : 'down'][p.s], x: p.x, y: Q(cy ? 0 : n)});
  });
  const pieces = [];
  const piece = (x2, y2) => { if (!Q.eq(x, x2) || !Q.eq(y, y2)) pieces.push({s, X, Y, a: [x, y], b: [x2, y2]}); };
  const done = (stop, extra = {}) => ({pieces, end: {s, x, y, X, Y}, stop, t, ...extra});
  const INF = null;
  for (let crossed = 0; crossed <= (opts.limit ?? 200); crossed++) {
    const tx = a > 0 ? Q.div(Q.sub(n, x), a) : a < 0 ? Q.div(x, -a) : INF;
    const ty = b > 0 ? Q.div(Q.sub(n, y), b) : b < 0 ? Q.div(y, -b) : INF;
    const exit = tx === INF ? ty : ty === INF ? tx : Q.min(tx, ty);
    const span = left === null ? exit : Q.min(exit, left);
    // The first target along this piece (not the starting point itself).
    let hit = null;
    for (const r of reps) {
      if (r.s !== s) continue;
      let u;
      if (a !== 0) { u = Q.div(Q.sub(r.x, x), a); if (!Q.eq(Q.add(y, Q.mul(b, u)), r.y)) continue; }
      else { if (!Q.eq(r.x, x)) continue; u = Q.div(Q.sub(r.y, y), b); }
      if (Q.lt(u, 0) || Q.lt(span, u) || (Q.eq(u, 0) && Q.eq(t, 0))) continue;
      if (!hit || Q.lt(u, hit.u)) hit = {u, k: r.k};
    }
    if (hit) {
      const x2 = Q.add(x, Q.mul(a, hit.u)), y2 = Q.add(y, Q.mul(b, hit.u));
      piece(x2, y2); x = x2; y = y2; t = Q.add(t, hit.u);
      return done('target', {target: hit.k});
    }
    if (left !== null && Q.le(left, exit)) {
      const x2 = Q.add(x, Q.mul(a, left)), y2 = Q.add(y, Q.mul(b, left));
      piece(x2, y2); x = x2; y = y2; t = Q.add(t, left);
      return done('length');
    }
    const xe = Q.add(x, Q.mul(a, exit)), ye = Q.add(y, Q.mul(b, exit));
    piece(xe, ye); x = xe; y = ye; t = Q.add(t, exit);
    if (left !== null) left = Q.sub(left, exit);
    const cx = tx !== INF && Q.eq(tx, exit), cy = ty !== INF && Q.eq(ty, exit);
    const corner = (Q.eq(x, 0) || Q.eq(x, n)) && (Q.eq(y, 0) || Q.eq(y, n));
    if (corner && (opts.corners === 'stop' || coneCorner(surface, s, x, y))) return done('corner');
    let next = s;
    if (cx) next = a > 0 ? surface.right[next] : surface.left[next];
    if (next && cy) next = b > 0 ? surface.up[next] : surface.down[next];
    if (!next) return done('wall');
    if (cx) { X += Math.sign(a); x = Q(a > 0 ? 0 : n); }
    if (cy) { Y += Math.sign(b); y = Q(b > 0 ? 0 : n); }
    s = next;
  }
  return done('limit');
}
// The pieces of one step between lattice points, for drawing a trail that
// crosses seams.
export const stepPieces = (surface, pt, dir) => shoot(surface, pt, dir, {length: 1}).pieces;

/* ------------------------------------------------------------------ *
 * Unrolling: which square lies at each place of the plane
 * ------------------------------------------------------------------ */
// Fill the plane box [X0, Y0, X1, Y1] (square units, inclusive) with squares,
// starting from `anchors` ([{s, X, Y}], placed first and in order: the
// squares a path has visited) and spreading out across glued edges, nearest
// first. On a torus or a cylinder this is the one periodic tiling. On a
// surface whose corners don't all close up (Week 64's glued squares), two
// spreads can meet with different squares; the first placed wins, and the
// edge between them is a cut (the `cut` list), drawn like a seam.
export function develop(surface, anchors, box) {
  const [X0, Y0, X1, Y1] = box, placed = new Map(), queue = [];
  const inside = (X, Y) => X >= X0 && X <= X1 && Y >= Y0 && Y <= Y1;
  for (const {s, X, Y} of anchors) {
    const key = `${X},${Y}`;
    if (!inside(X, Y) || placed.has(key)) continue;
    placed.set(key, s); queue.push([X, Y]);
  }
  for (let k = 0; k < queue.length; k++) {
    const [X, Y] = queue[k], s = placed.get(`${X},${Y}`);
    for (const [side, [dx, dy]] of Object.entries(SIDES)) {
      const t = surface.glue[side][s], key = `${X + dx},${Y + dy}`;
      if (!t || !inside(X + dx, Y + dy) || placed.has(key)) continue;
      placed.set(key, t); queue.push([X + dx, Y + dy]);
    }
  }
  const cut = [], walls = [];
  for (const [key, s] of placed) {
    const [X, Y] = key.split(',').map(Number);
    for (const side of ['right', 'up', 'left', 'down']) {
      const [dx, dy] = SIDES[side], there = placed.get(`${X + dx},${Y + dy}`);
      if (surface.glue[side][s] === null) walls.push({X, Y, side});
      else if (there !== undefined && there !== surface.glue[side][s] && (side === 'right' || side === 'up')) cut.push({X, Y, side});
    }
  }
  return {placed, cut, walls, at: (X, Y) => placed.get(`${X},${Y}`)};
}

// The part of the plane the unrolled view shows, in square units
// [X0, Y0, X1, Y1]: every point in `show` (plane keys [u, v]), the `focus`
// with `margin` lattice steps round it, at least `min` squares across and at
// most `max`, square, centred on what it holds. When it can't hold everything
// within `max`, it centres on the focus. During a finger slide on the view it
// stays where it was, so the place under the finger doesn't move.
let frozen = null;
export function planeWindow(surface, opts = {}) {
  if (frozen && frozen.key === (opts.key || 'plane')) return frozen.window;
  const n = surface.n, m = opts.margin ?? 1, min = opts.min ?? 3, max = opts.max ?? 15;
  const sq = u => Math.floor(u / n);
  const pts = [...(opts.show || [])];
  if (opts.focus) for (const [du, dv] of [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]]) pts.push([opts.focus[0] + du, opts.focus[1] + dv]);
  if (!pts.length) pts.push(...surface.ids.map(id => [surface.at[id][0] * n, surface.at[id][1] * n]));
  let X0 = Math.min(...pts.map(p => sq(p[0]))), X1 = Math.max(...pts.map(p => sq(p[0])));
  let Y0 = Math.min(...pts.map(p => sq(p[1]))), Y1 = Math.max(...pts.map(p => sq(p[1])));
  const size = Math.max(X1 - X0 + 1, Y1 - Y0 + 1, min);
  if (size > max && opts.focus) {
    const fx = sq(opts.focus[0]), fy = sq(opts.focus[1]), h = Math.floor(max / 2);
    return [fx - h, fy - h, fx - h + max - 1, fy - h + max - 1];
  }
  const centre = (a0, a1) => { const grow = size - (a1 - a0 + 1); return [a0 - Math.floor(grow / 2), a1 + Math.ceil(grow / 2)]; };
  [X0, X1] = centre(X0, X1); [Y0, Y1] = centre(Y0, Y1);
  return [X0, Y0, X1, Y1];
}

/* ------------------------------------------------------------------ *
 * Trips as words of steps, and the local moves that change them
 * ------------------------------------------------------------------ */
// The moves at the vertex between steps k-1 and k (1 <= k < steps.length):
// 'cancel' when the two steps go straight back along each other (erase
// both), 'slide' when they are not parallel (swap them: the path moves across
// the parallelogram they span, a unit square for two unit steps). The ends of
// the trip never move, so neither does its lift's end.
export function tripMove(steps, k) {
  if (!integer(k) || k < 1 || k >= steps.length) return null;
  const [[a, b], [c, d]] = [steps[k - 1], steps[k]];
  if (a + c === 0 && b + d === 0) return 'cancel';
  return a * d - b * c !== 0 ? 'slide' : null;
}
export function tripApply(steps, k) {
  const kind = tripMove(steps, k);
  if (kind === 'cancel') return [...steps.slice(0, k - 1), ...steps.slice(k + 1)];
  if (kind === 'slide') return [...steps.slice(0, k - 1), steps[k], steps[k - 1], ...steps.slice(k + 1)];
  return null;
}
export const tripMoves = steps => steps.slice(1).map((_, i) => ({at: i + 1, kind: tripMove(steps, i + 1)})).filter(m => m.kind);

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
const f = x => Number((typeof x === 'number' ? x : Q.num(x)).toFixed(3));
// Drawing positions: the room and the plane both use lattice units with y up;
// the SVG flips y.
export const roomXY = (surface, s, x, y) => [surface.at[s][0] * surface.n + Q.num(x), -(surface.at[s][1] * surface.n + Q.num(y))];
export const planeXY = (surface, X, Y, x, y) => [X * surface.n + Q.num(x), -(Y * surface.n + Q.num(y))];
// Where a lattice point is drawn: in the room (every place it appears, since
// a cross on a seam shows on both sides), and in the plane.
// A corner point is drawn at every corner of its class.
export function roomSpots(surface, pt) {
  const [x, y] = spot(surface, pt), n = surface.n, out = [[pt.s, x, y]];
  if (isCorner(surface, pt)) out.splice(0, 1, ...cornerClass(surface, pt.s, [pt.i / n, pt.j / n]).corners.map(({s, c}) => [s, Q(c[0] * n), Q(c[1] * n)]));
  else if (surface.lattice === 'crosses') {
    const l = surface.left[pt.s], d = surface.down[pt.s];
    if (pt.i === 0 && l) out.push([l, Q(n), y]);
    if (pt.j === 0 && d) out.push([d, x, Q(n)]);
  }
  const spots = out.map(([s, a, b]) => roomXY(surface, s, a, b));
  return spots.filter((p, k) => spots.findIndex(q => Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9) === k);
}
export const planeSpot = (surface, pt) => { const [x, y] = spot(surface, pt); return planeXY(surface, pt.X, pt.Y, x, y); };

function markSVG(look, [cx, cy], size, cls = '') {
  const r = size, k = `pb-mark ${look.shape} ${look.colour} ${cls}`;
  switch (look.shape) {
    case 'circle': return `<circle class="${k}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
    case 'diamond': return `<polygon class="${k}" points="${f(cx)},${f(cy - r * 1.25)} ${f(cx + r)},${f(cy)} ${f(cx)},${f(cy + r * 1.25)} ${f(cx - r)},${f(cy)}"/>`;
    case 'triangle': return `<polygon class="${k}" points="${f(cx)},${f(cy - r * 1.15)} ${f(cx + r * 1.05)},${f(cy + r * .75)} ${f(cx - r * 1.05)},${f(cy + r * .75)}"/>`;
    case 'square': return `<rect class="${k}" x="${f(cx - r * .9)}" y="${f(cy - r * .9)}" width="${f(r * 1.8)}" height="${f(r * 1.8)}"/>`;
    case 'bar': return `<rect class="${k}" x="${f(cx - r * 1.3)}" y="${f(cy - r * .5)}" width="${f(r * 2.6)}" height="${f(r)}" rx="${f(r * .3)}"/>`;
    default: {
      const pts = Array.from({length: 10}, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .5 : r * 1.25; return `${f(cx + q * Math.cos(a))},${f(cy - q * Math.sin(a))}`; });
      return `<polygon class="${k}" points="${pts.join(' ')}"/>`;
    }
  }
}
// The mark of a run whose first square is placed with its lower-left
// lattice corner at drawing position [ox, oy] (y already flipped): halfway
// along the run, just outside the side, clear of the trails and labels.
function sideMark(surface, look, ox, oy, size, cls) {
  const n = surface.n, a = look.along * n, out = size * 1.3;
  const [x, y] = {right: [n + out, a], left: [-out, a], up: [a, n + out], down: [a, -out]}[look.side];
  return markSVG(look, [ox + x, oy - y], size, cls);
}
const sideLine = (side, x0, y0, n) => {
  // x0, y0: the square's lower-left corner in drawing coordinates (y flipped).
  const [x1, y1, x2, y2] = {right: [n, 0, n, n], left: [0, 0, 0, n], up: [0, n, n, n], down: [0, 0, n, 0]}[side];
  return `x1="${f(x0 + x1)}" y1="${f(y0 - y1)}" x2="${f(x0 + x2)}" y2="${f(y0 - y2)}"`;
};
function latticeLines(n, x0, y0, cls) {
  if (n < 2) return '';
  let out = '';
  for (let k = 1; k < n; k++) out += `<line class="${cls}" x1="${f(x0 + k)}" y1="${f(y0)}" x2="${f(x0 + k)}" y2="${f(y0 - n)}"/><line class="${cls}" x1="${f(x0)}" y1="${f(y0 - k)}" x2="${f(x0 + n)}" y2="${f(y0 - k)}"/>`;
  return out;
}
// The lattice points of one square, each [i, j].
function squarePoints(surface, s) {
  const n = surface.n, out = [];
  const top = surface.lattice === 'cells' ? n - 1 : n;
  for (let j = 0; j <= top; j++) for (let i = 0; i <= top; i++) {
    const c = canonical(surface, {s, i, j});
    if (c && c.s === s && c.i === i && c.j === j) out.push([i, j]);
  }
  return out;
}
// A point's control: a cell's square or a disc round a cross. Every point of
// a view carries data-pb-point so a finger slide can find it; only acting
// points are focusable buttons.
function pointHit(surface, view, at, [cx, cy], look) {
  const ctrl = look.act ? ` role="button" tabindex="0" aria-label="${esc(look.label || 'Point')}" data-focus="pb-${view}-${esc(at)}"` : '';
  const shape = surface.lattice === 'cells'
    ? `<rect class="pb-hit" x="${f(cx - .5)}" y="${f(cy - .5)}" width="1" height="1"/>`
    : `<circle class="pb-hit" cx="${f(cx)}" cy="${f(cy)}" r=".42"/>`;
  return `<g class="${['pb-point', look.cls, look.act ? 'act' : ''].filter(Boolean).join(' ')}" data-pb-point="${esc(at)}" data-pb-view="${view}"${ctrl}>${shape}</g>`;
}
// `opts.labelAt` moves every label off its point by [dx, dy] lattice units
// (y up), to keep it clear of a trip drawn through the points.
const labelXY = (opts, [x, y]) => opts.labelAt ? [x + opts.labelAt[0], y - opts.labelAt[1]] : [x, y];
const labelText = (text, [cx, cy], cls = '') => text === undefined || text === null || text === '' ? '' : `<text class="pb-label ${cls}" x="${f(cx)}" y="${f(cy + .13)}">${esc(text)}</text>`;

// The portal room: the surface's squares where the spec lays them out, its
// lattice, walls, and seams with matching marks. `opts.point(pt)` returns how
// each lattice point looks: {cls, text, textCls, label, act}; `act` makes it a
// control (aria-label `label`). `opts.under` and `opts.over` are SVG drawn
// below and above the points, `opts.top` above the controls, in drawing
// coordinates (roomXY, roomSpots). `opts.slide` marks a view where a finger
// slides from point to point; `opts.picture` draws a small picture with no
// controls (a room button, an icon); `opts.labelAt` moves the labels (both
// views).
export function roomBoard(surface, opts = {}) {
  const n = surface.n, point = opts.point || (() => ({}));
  const origin = id => [surface.at[id][0] * n, -surface.at[id][1] * n];
  let squares = '', grid = '', lines = '', marks = '', labels = '', hits = '';
  for (const id of surface.ids) {
    const [x0, y0] = origin(id);
    squares += `<rect class="pb-square" x="${f(x0)}" y="${f(y0 - n)}" width="${n}" height="${n}"/>`;
    grid += latticeLines(n, x0, y0, 'pb-grid');
  }
  for (const e of surface.edges) {
    if (e.kind === 'inner' && (e.side === 'left' || e.side === 'down')) continue;
    const [x0, y0] = origin(e.s);
    lines += `<line class="pb-edge ${e.kind}${e.colour ? ` ${e.colour}` : ''}" ${sideLine(e.side, x0, y0, n)}/>`;
  }
  for (const m of surface.marks) { const [x0, y0] = origin(m.s); marks += sideMark(surface, m, x0, y0, opts.markSize ?? .15, ''); }
  for (const id of surface.ids) for (const [i, j] of squarePoints(surface, id)) {
    const pt = {s: id, i, j}, look = point(pt) || {}, at = `${id},${i},${j}`;
    for (const xy of roomSpots(surface, pt)) {
      labels += labelText(look.text, labelXY(opts, xy), look.textCls);
      if (!opts.picture) hits += pointHit(surface, 'room', at, xy, look);
    }
  }
  const [c0, r0, c1, r1] = surface.box, pad = opts.pad ?? (surface.marks.length ? .5 : .1);
  const vb = [c0 * n - pad, -r1 * n - pad, (c1 - c0) * n + 2 * pad, (r1 - r0) * n + 2 * pad];
  const role = opts.picture ? 'role="img"' : 'role="group" data-pb-view-board="room"';
  return `<svg class="pb-board pb-room${opts.slide && !opts.picture ? ' pb-slide' : ''} ${opts.cls || ''}" viewBox="${vb.map(f).join(' ')}" ${role} aria-label="${esc(opts.label || 'Portal room')}">${squares}${grid}${opts.under || ''}${lines}<g class="pb-marks" aria-hidden="true">${marks}</g><g class="pb-labels" aria-hidden="true">${labels}</g>${opts.over || ''}<g class="pb-hits">${hits}</g>${opts.top || ''}</svg>`;
}

// The unrolled view: the plane window (planeWindow), filled by `develop` from
// `opts.anchors` (default: the room itself at copy [0, 0]). Copies of the
// room are outlined, each outline in the colour of the seam it crosses
// (opts.marks true also repeats the marks faintly on every copy); cuts and
// walls are drawn. `opts.point(pt)` returns how
// each lattice point looks, with pt = {s, i, j, X, Y, u, v, copy}; points are
// addressed by their plane key "u,v". `opts.square(s, X, Y, copy)` may return
// a class for a whole square (to tint a copy). `opts.under`, `opts.over` and
// `opts.top` are SVG in drawing coordinates (planeXY, planeSpot).
export function planeBoard(surface, opts = {}) {
  const n = surface.n, point = opts.point || (() => ({}));
  const window = opts.window || planeWindow(surface, opts);
  const [X0, Y0, X1, Y1] = window;
  const anchors = opts.anchors || surface.ids.map(s => ({s, X: surface.at[s][0], Y: surface.at[s][1]}));
  const dev = develop(surface, anchors, window);
  let squares = '', grid = '', lines = '', marks = '', labels = '', hits = '';
  for (const [key, s] of dev.placed) {
    const [X, Y] = key.split(',').map(Number), x0 = X * n, y0 = -Y * n, copy = copyOf(surface, s, X, Y);
    squares += `<rect class="pb-square ${opts.square?.(s, X, Y, copy) || ''}" x="${f(x0)}" y="${f(y0 - n)}" width="${n}" height="${n}"/>`;
    grid += latticeLines(n, x0, y0, 'pb-grid');
    for (const side of ['right', 'up']) {
      const [dx, dy] = SIDES[side], there = dev.at(X + dx, Y + dy);
      if (there === undefined || surface.glue[side][s] === null) continue;
      const other = copyOf(surface, there, X + dx, Y + dy);
      const cls = there !== surface.glue[side][s] ? 'cut' : other[0] !== copy[0] || other[1] !== copy[1] ? 'copy' : 'inner';
      const colour = cls === 'copy' ? seamColour(surface, s, side) : '';
      if (cls !== 'inner') lines += `<line class="pb-edge ${cls}${colour ? ` ${colour}` : ''}" ${sideLine(side, x0, y0, n)}/>`;
    }
    if (opts.marks) for (const m of surface.marks.filter(m => m.s === s)) marks += sideMark(surface, m, x0, y0, opts.markSize ?? .12, 'faint');
    for (const [i, j] of squarePoints(surface, s)) {
      const pt = {s, i, j, X, Y}, [u, v] = planeKey(surface, pt), look = point({...pt, u, v, copy}) || {}, xy = planeSpot(surface, pt);
      labels += labelText(look.text, labelXY(opts, xy), look.textCls);
      hits += pointHit(surface, 'plane', `${u},${v}`, xy, look);
    }
  }
  for (const w of dev.walls) lines += `<line class="pb-edge wall" ${sideLine(w.side, w.X * n, -w.Y * n, n)}/>`;
  // A surface with walls (a cylinder's strip) may fill only part of the
  // window: the picture is cropped to the squares placed.
  const keys = [...dev.placed.keys()].map(k => k.split(',').map(Number));
  const [x0, x1, y0, y1] = keys.length ? [Math.min(...keys.map(k => k[0])), Math.max(...keys.map(k => k[0])), Math.min(...keys.map(k => k[1])), Math.max(...keys.map(k => k[1]))] : [X0, X1, Y0, Y1];
  const pad = opts.pad ?? .25;
  const vb = [x0 * n - pad, -(y1 + 1) * n - pad, (x1 - x0 + 1) * n + 2 * pad, (y1 - y0 + 1) * n + 2 * pad];
  return `<svg class="pb-board pb-plane${opts.slide ? ' pb-slide' : ''} ${opts.cls || ''}" viewBox="${vb.map(f).join(' ')}" role="group" aria-label="${esc(opts.label || 'Unrolled view')}" data-pb-view-board="plane" data-pb-key="${esc(opts.key || 'plane')}" data-pb-window="${window.join(',')}">${squares}${grid}${opts.under || ''}${lines}<g class="pb-marks" aria-hidden="true">${marks}</g><g class="pb-labels" aria-hidden="true">${labels}</g>${opts.over || ''}<g class="pb-hits">${hits}</g>${opts.top || ''}</svg>`;
}

// A trail along a trip's steps from a placed start, as SVG: in the plane one
// unbroken line, in the room broken where it crosses a seam, with a small
// dot where it leaves and enters. `cls` styles the line.
export function planeTrail(surface, start, steps, cls = 'pb-trail') {
  const {points} = lift(surface, start, steps);
  if (points.length < 2) return '';
  return `<polyline class="${cls}" points="${points.map(p => planeSpot(surface, p).map(f).join(',')).join(' ')}"/>`;
}
export function roomTrail(surface, start, steps, cls = 'pb-trail') {
  const {points} = lift(surface, start, steps);
  // The dots take the first class with '-portal' added and keep the rest.
  const dot = cls.replace(/^(\S+)/, '$1-portal');
  let out = '', run = [], dots = '';
  const flush = () => { if (run.length > 1) out += `<polyline class="${cls}" points="${run.map(p => p.map(f).join(',')).join(' ')}"/>`; run = []; };
  for (let k = 1; k < points.length; k++) {
    const pieces = stepPieces(surface, points[k - 1], steps[k - 1]);
    pieces.forEach((pc, m) => {
      const a = roomXY(surface, pc.s, ...pc.a), b = roomXY(surface, pc.s, ...pc.b);
      const last = run.at(-1);
      if (!last || Math.abs(last[0] - a[0]) > 1e-9 || Math.abs(last[1] - a[1]) > 1e-9) {
        if (last && m > 0) dots += `<circle class="${dot}" cx="${f(last[0])}" cy="${f(last[1])}" r=".07"/><circle class="${dot}" cx="${f(a[0])}" cy="${f(a[1])}" r=".07"/>`;
        flush(); run.push(a);
      }
      run.push(b);
    });
  }
  flush();
  return out + dots;
}

// The trip layer for the unrolled view: the trip drawn from its placed start
// with a chevron on each step, and a control for each vertex where a local
// move is possible (tripMove). `opts.vertex(k, kind)` returns {cls, label,
// act}. A vertex control sits a little inside the square its slide would
// cross (or along the spike it would erase), so two moves at one place stay
// apart.
export function tripLayer(surface, start, steps, opts = {}) {
  const {points} = lift(surface, start, steps), xy = points.map(p => planeSpot(surface, p));
  const cls = opts.cls || 'pb-trip';
  let line = xy.length > 1 ? `<polyline class="${cls}" points="${xy.map(p => p.map(f).join(',')).join(' ')}"/>` : '';
  for (let k = 0; k < steps.length && k + 1 < xy.length; k++) {
    const [[x1, y1], [x2, y2]] = [xy[k], xy[k + 1]], [mx, my] = [(x1 + x2) / 2, (y1 + y2) / 2], len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const [dx, dy] = [(x2 - x1) / len * .14, (y2 - y1) / len * .14], [nx, ny] = [-dy * .9, dx * .9];
    line += `<polyline class="${cls}-chevron" points="${f(mx - dx + nx)},${f(my - dy + ny)} ${f(mx + dx)},${f(my + dy)} ${f(mx - dx - nx)},${f(my - dy - ny)}"/>`;
  }
  let controls = '';
  for (const {at: k, kind} of tripMoves(steps)) {
    if (k >= xy.length) continue;
    const look = opts.vertex?.(k, kind) || {};
    const [px, py] = xy[k], [a, b] = steps[k - 1], [c, d] = steps[k];
    // Drawing y is flipped: a step [a, b] points [a, -b] on screen.
    const [ox, oy] = kind === 'slide' ? [(c - a) * .3, -(d - b) * .3] : [-a * .3, b * .3];
    const label = esc(look.label || (kind === 'slide' ? 'Slide this corner' : 'Erase this step and its return'));
    const ctrl = look.act === false ? '' : ` role="button" tabindex="0" aria-label="${label}" data-pb-vertex="${k}" data-focus="pb-vertex-${k}"`;
    controls += `<g class="pb-vertex ${kind} ${look.cls || ''}"${ctrl}><circle class="pb-vertex-hit" cx="${f(px + ox)}" cy="${f(py + oy)}" r=".36"/><circle class="pb-vertex-dot" cx="${f(px)}" cy="${f(py)}" r=".11"/><line class="pb-vertex-tick" x1="${f(px)}" y1="${f(py)}" x2="${f(px + ox)}" y2="${f(py + oy)}"/></g>`;
  }
  return {line, controls};
}

// Arrow buttons, ← ↑ → ↓ in a cross. `opts.dir(name)` returns {act, hinted,
// label} for 'R', 'U', 'L', 'D'; a button that doesn't act is disabled.
const ARROW = {U: '↑', L: '←', R: '→', D: '↓'};
export function arrowPad(opts = {}) {
  const look = name => opts.dir?.(name) || {act: true};
  const button = name => {
    const l = look(name);
    return `<button type="button" class="pb-arrow pb-${name}${l.hinted ? ' hinted' : ''}" data-pb-dir="${name}" data-focus="pb-dir-${name}" aria-label="${esc(l.label || `Step ${DIR_NAMES[name]}`)}" ${l.act === false ? 'disabled' : ''}>${ARROW[name]}</button>`;
  };
  return `<div class="pb-pad ${opts.cls || ''}" role="group" aria-label="${esc(opts.label || 'Steps')}">${['U', 'L', 'R', 'D'].map(button).join('')}</div>`;
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */
// Taps, keys and slides. Handlers each return a move or null:
//   point(view, at)       a tap, Enter or Space on a point; view is 'room'
//                         or 'plane', at is "s,i,j" in the room and "u,v"
//                         (the plane key) in the plane
//   vertex(k)             a tap on a trip vertex control
//   dir(name)             an arrow button, or an arrow key anywhere in root
//   enter(view, from, to) a finger or mouse sliding from point `from` into
//                         the point `to` (default: point(view, to)); only on
//                         a view drawn with `slide`
//   settle()              called when a slide ends, so the family can redraw
//                         the unrolled view at its new size
// Taps are read from the pointer's press and release, because a phone
// browser can drop the click after a touch; the click that follows is
// ignored, and a click with no press before it (assistive technology) still
// works.
let press = null, slide = null, lastTap = -Infinity, listening = false;
function slideMove(e) {
  if (!slide || e.pointerId !== slide.pointer) return;
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-pb-point]');
  if (!el || el.dataset.pbView !== slide.view || el.dataset.pbPoint === slide.last) return;
  const from = slide.last;
  slide.last = el.dataset.pbPoint;
  slide.moved = true;
  const h = slide.handlers, action = h.enter ? h.enter(slide.view, from, slide.last) : h.point?.(slide.view, slide.last);
  if (action) slide.apply(action);
}
function pointerEnd(e) {
  const p = press?.pointer === e.pointerId ? press : null, s = slide?.pointer === e.pointerId ? slide : null;
  if (p) press = null;
  if (s) { slide = null; if (frozen) { frozen = null; if (s.moved) s.handlers.settle?.(); } }
  if (e.type !== 'pointerup') return;
  if (s?.moved) { lastTap = performance.now(); return; }
  if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 12) {
    lastTap = performance.now();
    const action = p.act();
    if (action) p.apply(action);
  }
}
export function wirePortal(root, handlers, apply) {
  const controls = '[data-pb-point][role="button"],[data-pb-vertex],[data-pb-dir]';
  const act = el => {
    if (el.dataset.pbVertex !== undefined) return handlers.vertex?.(Number(el.dataset.pbVertex));
    if (el.dataset.pbDir !== undefined) return el.disabled ? null : handlers.dir?.(el.dataset.pbDir);
    if (el.dataset.pbPoint !== undefined) return handlers.point?.(el.dataset.pbView, el.dataset.pbPoint);
    return null;
  };
  root.addEventListener('click', e => {
    const el = e.target.closest(controls);
    if (!el || !root.contains(el)) return;
    // A board point or vertex answered its pointer already.
    if (el.dataset.pbDir === undefined && performance.now() - lastTap < 700) return;
    const action = act(el);
    if (action) apply(action);
  });
  root.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = {ArrowRight: 'R', ArrowLeft: 'L', ArrowUp: 'U', ArrowDown: 'D'}[e.key];
    if (key && handlers.dir && !e.target.closest('input,select,textarea')) {
      // Only an arrow that moves the pawn is kept from scrolling the page.
      const action = handlers.dir(key);
      if (action) { e.preventDefault(); apply(action); }
      return;
    }
    if (!['Enter', ' '].includes(e.key)) return;
    const el = e.target.closest('[data-pb-point][role="button"],[data-pb-vertex]');
    if (!el) return;
    e.preventDefault();
    const action = act(el);
    if (action) apply(action);
  });
  if (!listening) {
    document.addEventListener('pointermove', slideMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, pointerEnd);
    listening = true;
  }
  // A slide in progress keeps working while the board redraws under it.
  if (slide && slide.root !== root && root.querySelector(`[data-pb-view-board="${slide.view}"]`)) { slide.handlers = handlers; slide.apply = apply; slide.root = root; }
  root.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    const el = e.target.closest('[data-pb-point],[data-pb-vertex],[data-pb-dir]');
    if (!el || !root.contains(el)) return;
    // Arrow buttons answer their click; only board points and vertices are read from the pointer.
    if (el.dataset.pbDir !== undefined) return;
    press = el.matches(controls) ? {pointer: e.pointerId, x: e.clientX, y: e.clientY, act: () => act(el), apply} : null;
    const board = el.closest('[data-pb-view-board]');
    if (el.dataset.pbPoint !== undefined && board?.classList.contains('pb-slide')) {
      slide = {pointer: e.pointerId, view: el.dataset.pbView, last: el.dataset.pbPoint, moved: false, handlers, apply, root};
      if (board.dataset.pbWindow) frozen = {key: board.dataset.pbKey, window: board.dataset.pbWindow.split(',').map(Number)};
    }
  });
}
