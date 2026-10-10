// Rhombus tilings of triangle-grid boards. A blue rhombus covers two
// triangles that share an edge, and every edge joins an up triangle to a down
// one, so a set of rhombi is a matching of up triangles with down ones:
// augmenting paths find the most rhombi, König's theorem gives dots that
// prove it, and three rhombi round a grid point can flip (one cube added to
// or taken from a corner pile). Shared by every group of Rhombus gardens.
import {placements, gridOf, cellKey} from '../../tri-grid.js';

export const sortPiece = cells => [...cells].sort((a, b) => a - b);
export const pieceKey = cells => sortPiece(cells).join('.');
export const tilingKey = pieces => pieces.map(pieceKey).sort().join(' ');
export const piecesOf = key => key ? key.split(' ').map(p => p.split('.').map(Number)) : [];

// The most rhombi on a board with some cells already taken (`used`), by
// augmenting paths from the up triangles. Returns the rhombi as [up, down].
export function maxPacking(g, used = new Set()) {
  const owner = new Map();
  const augment = (u, seen) => {
    for (const d of g.nbr[u]) {
      if (used.has(d) || seen.has(d)) continue;
      seen.add(d);
      if (!owner.has(d) || augment(owner.get(d), seen)) { owner.set(d, u); return true; }
    }
    return false;
  };
  g.cells.forEach((_, i) => { if (g.up[i] && !used.has(i)) augment(i, new Set()); });
  return [...owner].map(([d, u]) => sortPiece([u, d])).sort((a, b) => a[0] - b[0]);
}

// Fewest dots such that every rhombus spot covers one (König): from a most
// packing, mark the up triangles that an alternating path from an empty up
// triangle cannot reach, and the down triangles it can. With `side` 1 the
// roles of up and down swap, which gives the other extreme cover.
export function minCover(g, used = new Set(), side = 0) {
  const pack = maxPacking(g, used), mate = new Map();
  for (const [a, b] of pack) { mate.set(a, b); mate.set(b, a); }
  const mine = i => !used.has(i) && (side ? !g.up[i] : g.up[i]);
  const reached = new Set(), queue = [];
  g.cells.forEach((_, i) => { if (mine(i) && !mate.has(i)) { reached.add(i); queue.push(i); } });
  while (queue.length) {
    const x = queue.shift();
    for (const y of g.nbr[x]) {
      if (used.has(y) || reached.has(y)) continue;
      reached.add(y);
      const z = mate.get(y);
      if (z !== undefined && !reached.has(z)) { reached.add(z); queue.push(z); }
    }
  }
  return g.cells.map((_, i) => i).filter(i => !used.has(i) && (mine(i) ? !reached.has(i) : reached.has(i) && (side ? g.up[i] : !g.up[i])));
}

// A rhombus spot with no dot in it, or null when the dots stop every spot.
export const openSpot = (g, dots) => { const set = new Set(dots); return g.pairs.find(([a, b]) => !set.has(a) && !set.has(b)) || null; };

// Every exact cover of the board by a shape (rhombus tilings by default),
// up to `limit`, starting from pieces already placed. Branches on the
// first empty cell, so each cover is found once.
export function covers(g, shape = 'rhombus', limit = Infinity, start = []) {
  const fits = placements(g, shape), byCell = g.cells.map(() => []);
  for (const piece of fits) for (const c of piece) byCell[c].push(piece);
  const taken = new Set(start.flat()), chosen = [...start], out = [];
  (function search() {
    if (out.length >= limit) return;
    let first = -1;
    for (let i = 0; i < g.cells.length; i++) if (!taken.has(i)) { first = i; break; }
    if (first < 0) { out.push(chosen.map(p => [...p])); return; }
    for (const piece of byCell[first]) {
      if (piece.some(c => taken.has(c))) continue;
      piece.forEach(c => taken.add(c)); chosen.push(piece);
      search();
      chosen.pop(); piece.forEach(c => taken.delete(c));
      if (out.length >= limit) return;
    }
  })();
  return out;
}

// The six triangles round a grid point, in turning order, or null when the
// point is on the edge of the board.
const rings = new WeakMap();
export function ringAt(g, k) {
  if (!rings.has(g)) rings.set(g, g.points.map((_, j) => {
    const cells = g.around[j];
    if (cells.length !== 6) return null;
    const [px, py] = g.xy[j], angle = c => Math.atan2(g.centre[c][1] - py, g.centre[c][0] - px);
    return [...cells].sort((a, b) => angle(a) - angle(b));
  }));
  return rings.get(g)[k] ?? null;
}
// A flip at a grid point: when three rhombi make the hexagon round it, turn
// them to the hexagon's other filling. Returns the new pieces or null.
// `keys` (the pieces' keys as a set) saves rebuilding it point by point.
export function flipAt(g, pieces, k, keys = new Set(pieces.map(pieceKey))) {
  const ring = ringAt(g, k);
  if (!ring) return null;
  for (const shift of [0, 1]) {
    const now = [0, 2, 4].map(s => sortPiece([ring[(s + shift) % 6], ring[(s + shift + 1) % 6]]));
    if (now.every(p => keys.has(pieceKey(p)))) {
      const gone = new Set(now.map(pieceKey));
      const next = [0, 2, 4].map(s => sortPiece([ring[(s + 1 - shift) % 6], ring[(s + 2 - shift) % 6]]));
      return [...pieces.filter(p => !gone.has(pieceKey(p))), ...next];
    }
  }
  return null;
}
export const flipPoints = (g, pieces) => { const keys = new Set(pieces.map(pieceKey)); return g.points.map((_, k) => k).filter(k => flipAt(g, pieces, k, keys)); };

// Fewest flips from one tiling to every tiling it can reach (breadth-first
// over the flip map), as a map from tiling key to distance. Kept per board
// and starting tiling, so a puzzle searches its map once. The search holds
// each tiling as partner triangles, which makes a flip three swaps.
const distanceMaps = new WeakMap();
export function flipDistances(g, from) {
  if (!distanceMaps.has(g)) distanceMaps.set(g, new Map());
  const cache = distanceMaps.get(g), start = tilingKey(from);
  if (!cache.has(start)) {
    const first = new Int16Array(g.cells.length).fill(-1);
    for (const [a, b] of from) { first[a] = b; first[b] = a; }
    const rings = g.points.map((_, k) => ringAt(g, k)).filter(Boolean);
    const seen = new Map([[first.join(), 0]]), queue = [first];
    const pair = (m, x, y) => { m[x] = y; m[y] = x; };
    for (let i = 0; i < queue.length; i++) {
      const m = queue[i], d = seen.get(m.join());
      for (const r of rings) {
        for (const shift of [0, 1]) {
          const at = j => r[(j + shift) % 6];
          if (m[at(0)] !== at(1) || m[at(2)] !== at(3) || m[at(4)] !== at(5)) continue;
          const next = m.slice();
          pair(next, at(1), at(2)); pair(next, at(3), at(4)); pair(next, at(5), at(0));
          const key = next.join();
          if (!seen.has(key)) { seen.set(key, d + 1); queue.push(next); }
        }
      }
    }
    const dist = new Map();
    for (const m of queue) dist.set(tilingKey([...m].flatMap((b, a) => a < b ? [[a, b]] : [])), seen.get(m.join()));
    cache.set(start, dist);
  }
  return cache.get(start);
}

// One shortest route of flips between two tilings, as the grid points to flip
// at in turn ([] when they are the same), or null when there is none.
export function flipRoute(g, from, to) {
  const dist = flipDistances(g, to), route = [];
  let t = from, d = dist.get(tilingKey(t));
  if (d === undefined) return null;
  while (d > 0) {
    const keys = new Set(t.map(pieceKey));
    for (let k = 0; k < g.points.length; k++) {
      const next = flipAt(g, t, k, keys);
      if (next && dist.get(tilingKey(next)) === d - 1) { route.push(k); t = next; d--; break; }
    }
  }
  return route;
}

// The hexagon with sides a, b, c, a, b, c (rhombus.js `hexagon`) splits into
// three parallelograms, each with one tiling, meeting at a point inside.
// With the faces shaded as in rhombus.css (light tops), one choice of point
// looks like the corner of an empty box and the other (`full`) like the box
// full of cubes. Every other tiling lies between them on the flip map, and
// each flip adds or takes away one cube.
export function cornerTiling(g, a, b, c, full = false) {
  const P0 = [0, 0], P1 = [a, 0], P2 = [a, b], P3 = [a - c, b + c], P4 = [-c, b + c], P5 = [-c, c], Q = [0, b], R = [a - c, c];
  const parts = full ? [[P0, P1, P2, Q], [Q, P2, P3, P4], [P0, Q, P4, P5]] : [[P0, P1, R, P5], [P1, P2, P3, R], [P5, R, P3, P4]];
  return parts.flatMap(outline => {
    const sub = gridOf({outline}), [only] = covers(sub, 'rhombus', 1);
    return only.map(piece => sortPiece(piece.map(i => g.index.get(cellKey(sub.cells[i])))));
  });
}

// The tiling of the a, b, c hexagon, drawn turned, showing a pile of cubes
// in the corner of a box a cubes tall: heights[r][s] cubes stand on floor
// square (r, s), with columns never taller than the ones behind them (a
// plane partition). Built from the empty corner by adding one cube per flip.
export function stackTiling(g, a, b, c, heights) {
  let pieces = cornerTiling(g, a, b, c);
  const at = ([u, v]) => g.pointIndex.get(`${u},${v}`);
  const cubes = [];
  heights.forEach((row, r) => row.forEach((h, s) => { for (let z = 0; z < h; z++) cubes.push([z, s, r]); }));
  cubes.sort((x, y) => x[0] + x[1] + x[2] - y[0] - y[1] - y[2]);
  for (const [i, j, k] of cubes) {
    const next = flipAt(g, pieces, at([a - c - i + k, c + j - k]));
    if (!next) throw Error(`No room for cube ${i},${j},${k}`);
    pieces = next;
  }
  return pieces;
}
