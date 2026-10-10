// The mathematics of the Week 1 encore groups in Rhombus gardens, on boards
// cut from the shared triangle grid. A piece is its sorted cell numbers, and
// its size says which pattern block it is.
//   The rhombus duel: players take turns laying a rhombus; a player with no
//   room loses. Small boards are solved exactly (every position, once). On a
//   board that looks the same after a half turn, copying wins: the second
//   player when the centre is a grid point, the first player (after taking
//   the rhombus across the centre) when it is the middle of an edge.
//   Fewest blocks: a branch-and-bound search for a filling with at most so
//   many pieces, which keeps the pieces already down.
//   Red trapezoids: a trapezoid covers two up triangles and one down, or two
//   down and one up, so on any board the numbers of each kind are fixed by
//   the up and down counts. Two trapezoids that make a hexagon can be cut
//   the hexagon's three ways, so three re-cuts come back: an odd round trip.
import {placements} from '../../tri-grid.js';
import {sortPiece, pieceKey, tilingKey, ringAt} from '../rhombus/lozenge.js';

export {sortPiece, pieceKey, tilingKey};
export const BLOCKS = ['triangle', 'rhombus', 'trapezoid', 'hexagon'];
const SIZE = {triangle: 1, rhombus: 2, trapezoid: 3, hexagon: 6};
export const shapeOf = piece => ({1: 'triangle', 2: 'rhombus', 3: 'trapezoid', 6: 'hexagon'})[piece.length] || null;
export const covered = pieces => new Set(pieces.flat());

/* ------------------------------------------------------------------ *
 * The duel
 * ------------------------------------------------------------------ */
// Boards up to this many triangles are solved exactly, with one bit a triangle.
export const DUEL_LIMIT = 30;
const games = new WeakMap();
function gameOf(g) {
  if (!games.has(g)) {
    if (g.cells.length > DUEL_LIMIT) throw Error(`A duel board has at most ${DUEL_LIMIT} triangles`);
    const fits = placements(g, 'rhombus');
    games.set(g, {fits, masks: fits.map(maskOf), memo: new Map()});
  }
  return games.get(g);
}
const maskOf = cells => cells.reduce((m, c) => m | (1 << c), 0);
const takenMask = pieces => maskOf(pieces.flat());
// Whether the player to move wins when these triangles are taken.
function moverWins(game, taken) {
  const hit = game.memo.get(taken);
  if (hit !== undefined) return hit;
  let win = false;
  for (const m of game.masks) if (!(taken & m) && !moverWins(game, taken | m)) { win = true; break; }
  game.memo.set(taken, win);
  return win;
}
export const toMoveWins = (g, pieces) => moverWins(gameOf(g), takenMask(pieces));
export function openSpots(g, pieces) {
  const game = gameOf(g), taken = takenMask(pieces);
  return game.fits.filter((_, i) => !(taken & game.masks[i]));
}
// The spots that leave the other player lost.
export function winningSpots(g, pieces) {
  const game = gameOf(g), taken = takenMask(pieces);
  return game.fits.filter((_, i) => !(taken & game.masks[i]) && !moverWins(game, taken | game.masks[i]));
}
// How many positions the exact solution visits (for the notes and checks).
export const duelPositions = g => { toMoveWins(g, []); return gameOf(g).memo.size; };

// The half turn about the board's centre, as a map from cell to cell, or
// null when the board does not look the same after a half turn. `centre`
// says where the centre lies: on a grid point, the middle of an edge, or
// inside a triangle.
const turns = new WeakMap();
export function halfTurn(g) {
  if (!turns.has(g)) {
    const n = g.cells.length, cx = g.centre.reduce((s, c) => s + c[0], 0) / n, cy = g.centre.reduce((s, c) => s + c[1], 0) / n;
    const near = ([x, y]) => g.centre.findIndex(([a, b]) => Math.hypot(a - x, b - y) < 1e-6);
    const map = g.centre.map(([x, y]) => near([2 * cx - x, 2 * cy - y]));
    let result = null;
    if (map.every(j => j >= 0)) {
      const onPoint = g.xy.some(([x, y]) => Math.hypot(x - cx, y - cy) < 1e-6);
      const onEdge = g.pairs.some(([a, b]) => map[a] === b);
      result = {map, centre: onPoint ? 'point' : onEdge ? 'edge' : 'cell'};
    }
    turns.set(g, result);
  }
  return turns.get(g);
}
export const turnedPiece = (g, piece) => { const t = halfTurn(g); return t ? sortPiece(piece.map(c => t.map[c])) : null; };

/* ------------------------------------------------------------------ *
 * Fewest blocks
 * ------------------------------------------------------------------ */
// A filling of the board that keeps `start` and uses at most `budget`
// pieces of the given shapes, or null. Branches on the first empty
// triangle, whose piece must start there. The bound: a triangle no free
// hexagon covers needs a piece of at most three triangles, and every other
// piece covers at most six.
const tables = new WeakMap();
function tableOf(g, shapes) {
  if (!tables.has(g)) tables.set(g, new Map());
  const key = shapes.join(','), cache = tables.get(g);
  if (!cache.has(key)) {
    const byCell = g.cells.map(() => []), hexes = shapes.includes('hexagon') ? placements(g, 'hexagon') : [];
    // Bigger pieces first, so a good filling turns up early.
    for (const s of [...shapes].sort((a, b) => SIZE[b] - SIZE[a])) for (const p of placements(g, s)) byCell[p[0]].push(p);
    cache.set(key, {byCell, hexes, top: Math.max(...shapes.map(s => SIZE[s]))});
  }
  return cache.get(key);
}
export function fillWithin(g, start, budget, shapes = BLOCKS) {
  const {byCell, hexes, top} = tableOf(g, shapes), n = g.cells.length;
  const taken = new Uint8Array(n);
  for (const c of start.flat()) taken[c] = 1;
  let left = n - covered(start).size;
  const chosen = [...start];
  const bound = () => {
    if (top < 6) return Math.ceil(left / top);
    const reach = new Uint8Array(n);
    for (const h of hexes) if (h.every(c => !taken[c])) for (const c of h) reach[c] = 1;
    let lone = 0;
    for (let i = 0; i < n; i++) if (!taken[i] && !reach[i]) lone++;
    const small = Math.ceil(lone / 3);
    return small + Math.ceil(Math.max(0, left - 3 * small) / 6);
  };
  const search = from => {
    if (chosen.length + bound() > budget) return false;
    let i = from;
    while (i < n && taken[i]) i++;
    if (i === n) return true;
    for (const p of byCell[i]) {
      if (p.some(c => taken[c])) continue;
      for (const c of p) taken[c] = 1;
      chosen.push(p); left -= p.length;
      if (search(i + 1)) return true;
      chosen.pop(); left += p.length;
      for (const c of p) taken[c] = 0;
    }
    return false;
  };
  return left === 0 ? (start.length <= budget ? chosen : null) : search(0) ? chosen.map(sortPiece) : null;
}
export function fewestOf(g, shapes = BLOCKS) {
  for (let k = 1; k <= g.cells.length; k++) if (fillWithin(g, [], k, shapes)) return k;
  return null;
}
// Every filling with exactly `count` pieces (for the build's checks).
export function fillingsWith(g, count, shapes = BLOCKS) {
  const {byCell} = tableOf(g, shapes), n = g.cells.length, taken = new Uint8Array(n), chosen = [], out = [];
  (function search(from, left) {
    if (chosen.length + Math.ceil(left / 6) > count) return;
    let i = from;
    while (i < n && taken[i]) i++;
    if (i === n) { if (chosen.length === count) out.push(chosen.map(sortPiece)); return; }
    for (const p of byCell[i]) {
      if (p.some(c => taken[c])) continue;
      for (const c of p) taken[c] = 1;
      chosen.push(p);
      search(i + 1, left - p.length);
      chosen.pop();
      for (const c of p) taken[c] = 0;
    }
  })(0, n);
  return out;
}

/* ------------------------------------------------------------------ *
 * Red trapezoids
 * ------------------------------------------------------------------ */
// A trapezoid with two triangles pointing down (and one up).
export const pointsDown = (g, piece) => piece.filter(c => g.up[c]).length === 1;
export const kindsOf = (g, pieces) => { const down = pieces.filter(p => pointsDown(g, p)).length; return {up: pieces.length - down, down}; };
export const upsAndDowns = g => { const up = g.up.filter(Boolean).length; return {up, down: g.cells.length - up}; };

// The grid point in the middle of a hexagon of six cells, or -1.
function hexagonCentre(g, cells) {
  if (cells.length !== 6) return -1;
  const set = new Set(cells);
  return g.points.findIndex((_, k) => g.around[k].length === 6 && g.around[k].every(c => set.has(c)));
}
// The three ways to cut the hexagon round point k into two trapezoids, in
// turning order: way i is ring cells i, i+1, i+2 and the other three.
export function cutsAt(g, k) {
  const ring = ringAt(g, k);
  if (!ring) return null;
  return [0, 1, 2].map(i => [sortPiece([0, 1, 2].map(j => ring[(i + j) % 6])), sortPiece([3, 4, 5].map(j => ring[(i + j) % 6]))]);
}
// Re-cut two trapezoids that make a hexagon: the next of its three ways.
// Returns the new pieces, or null when the two do not make a hexagon.
export function recut(g, pieces, a, b) {
  const one = pieces.find(p => pieceKey(p) === a), two = pieces.find(p => pieceKey(p) === b);
  if (!one || !two || a === b || one.length !== 3 || two.length !== 3) return null;
  const k = hexagonCentre(g, [...one, ...two]);
  if (k < 0) return null;
  const ways = cutsAt(g, k), now = ways.findIndex(w => w.some(p => pieceKey(p) === a));
  if (now < 0) return null;
  const next = ways[(now + 1) % 3];
  return [...pieces.filter(p => p !== one && p !== two), ...next];
}
// The pairs of trapezoids that make a hexagon, as [key, key].
export function hexagonPairs(g, pieces) {
  const reds = pieces.filter(p => p.length === 3), out = [];
  for (let i = 0; i < reds.length; i++) for (let j = i + 1; j < reds.length; j++) if (hexagonCentre(g, [...reds[i], ...reds[j]]) >= 0) out.push([pieceKey(reds[i]), pieceKey(reds[j])]);
  return out;
}
