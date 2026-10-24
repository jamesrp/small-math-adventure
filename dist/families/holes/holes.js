// Holes (worksheet Week 77, "Persistent holes"), a group in Lantern Wires.
//
// A board is a flat region cut into triangles, some with a hole in it that
// no tile can ever fill. The triangles' sides are wires. A loop is a set of
// wires with an even number at every dot, so it closes up. A tile covers a
// triangle; tapping a tile flips its three wires (lit goes dark, dark
// lights), so the lit wires change by the tile's boundary, mod 2.
//
// The mathematics. The bounded faces of a connected flat board (its
// triangles and its holes) have independent boundaries that make every loop:
// each loop L is the boundary of exactly one set of faces, inside(L), the
// faces from which a path out to the edge of the page crosses L an odd
// number of times. Tapping tile t changes inside(L) by t alone. So the faces
// inside the loop that are not tiles never change: the wires can all go dark
// exactly when every face inside the lit loop is a tile, and an empty
// triangle or a hole inside the loop is the certificate that they can't.
// On a growing board a loop is gone (the boundary of some filled tiles)
// exactly when every face inside it is a filled triangle, so a loop round a
// hole is never gone, a loop goes out with the last tile inside it, and a
// loop that is out stays out. Two loops race: the yellow one goes out
// strictly first exactly when the pink one needs a tile the yellow one
// doesn't; when every tile the pink loop needs is inside the yellow one,
// those tiles are the certificate that it can't.
//
// Three kinds of puzzle share the board:
// - cancel: tiles are fixed; tap tiles to make every wire dark, or claim
//   Can't by tapping the empty triangle or hole the loop goes round.
// - schedule: add wires and fill triangles one at a time; the first loop to
//   close lights; make it go out with the marked tile.
// - race: every wire is in; fill triangles one at a time so the yellow loop
//   goes out while the pink one is still lit, or claim Can't by tapping the
//   tiles that fill the pink loop, all inside the yellow one.
import {esc} from '../../expansion-controls.js';
import {meshOf, validMeshSpec, edgeKey} from '../../tri-mesh.js';
import {wireTri} from '../../tri-grid.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const index = (value, n) => Number.isInteger(value) && value >= 0 && value < n;
const keysAre = (b, keys) => object(b) && Object.keys(b).sort().join() === keys;
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ *
 * The board: triangles, holes, wires and which faces each wire divides.
 * ------------------------------------------------------------------ */
// Faces are numbered: triangles 0 … T − 1 in the pack's order, then holes
// T … T + H − 1. OUT stands for the page outside the board.
export const OUT = -1;
const cache = new Map();
const shoelace = (points, loop) => loop.reduce((s, k, i) => { const [x1, y1] = points[k], [x2, y2] = points[loop[(i + 1) % loop.length]]; return s + x1 * y2 - x2 * y1; }, 0) / 2;
// A board's shape is fine when tri-mesh accepts it, every dot is on a
// triangle, the wires join up, and its outline and holes are separate loops
// that never touch (no dot where two rims meet).
export function validShape(spec) {
  if (!validMeshSpec(spec)) return false;
  const m = meshOf(spec), V = m.points.length;
  if (new Set(m.cells.flat()).size !== V) return false;
  const rim = Array.from({length: V}, () => 0), seen = new Set([0]), stack = [0], nbr = Array.from({length: V}, () => []);
  m.edges.forEach(([a, b], e) => { nbr[a].push(b); nbr[b].push(a); if (m.outer[e]) { rim[a]++; rim[b]++; } });
  if (rim.some(n => n !== 0 && n !== 2)) return false;
  while (stack.length) for (const k of nbr[stack.pop()]) if (!seen.has(k)) { seen.add(k); stack.push(k); }
  return seen.size === V;
}
export function boardOf(q) {
  const key = JSON.stringify(q.mesh);
  if (cache.has(key)) return cache.get(key);
  const m = meshOf(q.mesh), T = m.cells.length, E = m.edges.length, V = m.points.length;
  // The rims: the wires with a triangle on one side only, as loops of dots.
  const rimAt = Array.from({length: V}, () => []);
  m.edges.forEach((e, i) => { if (m.outer[i]) for (const k of e) rimAt[k].push(i); });
  const loopOf = new Int32Array(E).fill(-1), rims = [];
  for (let i = 0; i < E; i++) {
    if (!m.outer[i] || loopOf[i] >= 0) continue;
    const edges = [], dots = [];
    let e = i, at = m.edges[i][0];
    while (loopOf[e] < 0) {
      loopOf[e] = rims.length; edges.push(e); dots.push(at);
      at = m.edges[e][0] === at ? m.edges[e][1] : m.edges[e][0];
      e = rimAt[at].find(x => x !== e);
    }
    rims.push({edges, dots, area: Math.abs(shoelace(m.points, dots))});
  }
  // The outline is the rim with the largest area; the others are holes.
  const outline = rims.reduce((best, r, i) => r.area > rims[best].area ? i : best, 0);
  const holes = rims.filter((_, i) => i !== outline);
  const F = T + holes.length;
  const sides = m.edges.map((_, e) => m.edgeCells[e].length === 2 ? [...m.edgeCells[e]] : [m.edgeCells[e][0], loopOf[e] === outline ? OUT : T + holes.indexOf(rims[loopOf[e]])]);
  // Neighbouring faces across each wire, with the page as face F.
  const dual = Array.from({length: F + 1}, () => []);
  const at = f => f === OUT ? F : f;
  sides.forEach(([a, b], e) => { dual[at(a)].push([at(b), e]); dual[at(b)].push([at(a), e]); });
  const faceEdges = [...m.cellEdges, ...holes.map(h => h.edges)];
  const nbr = Array.from({length: V}, () => []);
  m.edges.forEach(([a, b], e) => { nbr[a].push([b, e]); nbr[b].push([a, e]); });
  const board = {m, T, E, V, F, holes, sides, dual, faceEdges, nbr, key};
  cache.set(key, board);
  return board;
}
// Wires named by their two dots, as the pack stores them, to wire numbers.
export const edgesOf = (B, pairs) => pairs.map(([a, b]) => B.m.index.get(edgeKey(a, b)));
export function maskOf(B, list) {
  const mask = new Uint8Array(B.E);
  for (const e of list) mask[e] ^= 1;
  return mask;
}
export const listOf = mask => [...mask.keys()].filter(e => mask[e]);
// Flips a face's wires in a mask, in place.
export function flip(B, mask, face) { for (const e of B.faceEdges[face]) mask[e] ^= 1; return mask; }
export const isLoop = (B, mask) => B.m.points.every((_, k) => B.nbr[k].reduce((s, [, e]) => s + mask[e], 0) % 2 === 0);
// Which faces a loop goes round: walk out from the page, crossing a wire of
// the loop flips inside and outside. Returns 0 or 1 for each face, or null
// if the wires are not a loop (an odd number at some dot).
export function insideOf(B, mask) {
  const par = new Int8Array(B.F + 1).fill(-1), queue = [B.F];
  par[B.F] = 0;
  for (let i = 0; i < queue.length; i++) {
    const f = queue[i];
    for (const [g, e] of B.dual[f]) {
      const want = par[f] ^ mask[e];
      if (par[g] < 0) { par[g] = want; queue.push(g); } else if (par[g] !== want) return null;
    }
  }
  return par.subarray(0, B.F);
}
export const facesInside = (B, mask) => { const par = insideOf(B, mask); return par ? [...par.keys()].filter(f => par[f]) : null; };
const dark = mask => mask.every(x => !x);
const isHole = (B, f) => f >= B.T;

/* ------------------------------------------------------------------ *
 * The puzzle data: checked once per puzzle, so saves of a puzzle with
 * malformed data are never valid.
 * ------------------------------------------------------------------ */
const pairsOk = (B, pairs) => Array.isArray(pairs) && pairs.length > 0 && pairs.every(x => Array.isArray(x) && x.length === 2 && x.every(k => index(k, B.V)) && B.m.index.has(edgeKey(x[0], x[1]))) && new Set(pairs.map(([a, b]) => edgeKey(a, b))).size === pairs.length;
// One closed loop through distinct dots: two wires at each dot it visits.
export function simpleLoop(B, mask) {
  const used = listOf(mask);
  if (!used.length || !B.m.points.every((_, k) => [0, 2].includes(B.nbr[k].reduce((s, [, e]) => s + mask[e], 0)))) return false;
  const start = B.m.edges[used[0]][0];
  let at = start, prev = -1, count = 0;
  do { const [k, e] = B.nbr[at].find(([, f]) => mask[f] && f !== prev); prev = e; at = k; count++; } while (at !== start && count <= used.length);
  return count === used.length;
}
// The start wires of a schedule join every dot and close no loop.
export function spanningTree(B, mask) {
  const parent = [...B.m.points.keys()], find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
  for (const e of listOf(mask)) { const [a, b] = B.m.edges[e].map(find); if (a === b) return false; parent[a] = b; }
  return listOf(mask).length === B.V - 1;
}
function checkPuzzle(q) {
  if (!object(q) || !validShape(q.mesh) || !keysAre(q.mesh, 'cells,points')) return false;
  const B = boardOf(q);
  if (q.kind === 'cancel') {
    if (!keysAre(q, 'filled,kind,lit,mesh') || !Array.isArray(q.filled) || !q.filled.every((t, i) => index(t, B.T) && (i === 0 || t > q.filled[i - 1])) || !pairsOk(B, q.lit)) return false;
    const lit = maskOf(B, edgesOf(B, q.lit));
    return insideOf(B, lit) !== null;
  }
  if (q.kind === 'schedule') return keysAre(q, 'kind,mesh,start,target') && pairsOk(B, q.start) && spanningTree(B, maskOf(B, edgesOf(B, q.start))) && Number.isInteger(q.target) && q.target >= 1 && q.target <= B.T;
  if (q.kind === 'race') {
    if (!keysAre(q, 'kind,mesh,pink,yellow') || !pairsOk(B, q.yellow) || !pairsOk(B, q.pink)) return false;
    const yellow = maskOf(B, edgesOf(B, q.yellow)), pink = maskOf(B, edgesOf(B, q.pink));
    return simpleLoop(B, yellow) && simpleLoop(B, pink) && !sameList(listOf(yellow), listOf(pink)) && [yellow, pink].every(m => !facesInside(B, m).some(f => f >= B.T));
  }
  return false;
}
const checked = new WeakMap();
export function puzzleOk(p) {
  const q = p?.parameters;
  if (!object(q)) return false;
  if (!checked.has(q)) { let ok = false; try { ok = checkPuzzle(q); } catch { ok = false; } checked.set(q, ok); }
  return checked.get(q);
}

/* ------------------------------------------------------------------ *
 * Cancel: tap tiles to make every wire dark, or Can't and the face that
 * keeps the loop lit.
 * ------------------------------------------------------------------ */
// The save: {taps, cant, refused}. taps are the tiles tapped, in order;
// cant is the face of a right claim; refused is a wrong claim's face and
// whether its note still shows. A refusal is a lock: Can't stays off until
// the next tap, and Undo keeps it (hiding the note, so Undo always changes
// what is on screen).
const filledOf = p => new Set(p.parameters.filled);
export const startLit = p => maskOf(boardOf(p.parameters), edgesOf(boardOf(p.parameters), p.parameters.lit));
export function litAfter(p, taps) {
  const B = boardOf(p.parameters), mask = startLit(p);
  for (const t of taps) flip(B, mask, t);
  return mask;
}
// The faces that prove Can't: not tiles, and inside the lit loop. Tapping
// tiles never changes them, so they can be read from the start.
export function certificates(p) {
  const B = boardOf(p.parameters), tiles = filledOf(p);
  return facesInside(B, startLit(p)).filter(f => !tiles.has(f));
}
export const canGoDark = p => certificates(p).length === 0;
const validRefusal = (r, n) => keysAre(r, 'face,shown') && index(r.face, n) && typeof r.shown === 'boolean';
function validCancel(p, b) {
  if (!puzzleOk(p) || !keysAre(b, 'cant,refused,taps') || !Array.isArray(b.taps) || b.taps.length > 400) return false;
  const B = boardOf(p.parameters), tiles = filledOf(p);
  if (!b.taps.every(t => tiles.has(t))) return false;
  // Nothing follows a dark board.
  const mask = startLit(p);
  for (const t of b.taps) { if (dark(mask)) return false; flip(B, mask, t); }
  const certs = certificates(p);
  if (b.cant !== null && !(index(b.cant, B.F) && certs.includes(b.cant) && b.taps.length > 0 && !dark(mask))) return false;
  if (b.refused !== null && !(validRefusal(b.refused, B.F) && !certs.includes(b.refused.face) && (!b.refused.shown || b.taps.length > 0))) return false;
  return b.cant === null || b.refused === null;
}
const solvedCancel = (p, b) => validCancel(p, b) && (b.cant !== null || dark(litAfter(p, b.taps)));
const cantOpen = b => b.taps.length > 0 && b.refused === null;
function moveCancel(p, b, action) {
  if (!validCancel(p, b) || solvedCancel(p, b) || !object(action)) return null;
  const B = boardOf(p.parameters);
  if ('tile' in action) return filledOf(p).has(action.tile) && Object.keys(action).length === 1 ? {taps: [...b.taps, action.tile], cant: null, refused: null} : null;
  if ('cant' in action && Object.keys(action).length === 1 && index(action.cant, B.F) && cantOpen(b)) {
    return certificates(p).includes(action.cant) ? {...b, cant: action.cant} : {...b, refused: {face: action.cant, shown: true}};
  }
  return null;
}
const REASON = {
  hole: 'The loop goes round the hole. Tapping tiles moves the loop, but the hole stays inside it.',
  empty: 'The loop goes round an empty triangle. Tapping tiles moves the loop, but that triangle stays inside it.'
};
function hintCancel(p, b) {
  if (!validCancel(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solvedCancel(p, b)) return {type: 'done'};
  const B = boardOf(p.parameters), tiles = filledOf(p), lit = litAfter(p, b.taps);
  const inside = facesInside(B, lit), certs = certificates(p);
  // A tile to tap: one inside the lit loop (always one while it can go dark;
  // on a Can't board the attempt comes first, and after a refusal a tap
  // reopens Can't).
  const tile = inside.find(f => tiles.has(f)) ?? listOf(lit).flatMap(e => B.sides[e]).find(f => tiles.has(f)) ?? p.parameters.filled[0];
  if (!certs.length || !cantOpen(b)) return {type: 'move', action: {tile}, text: inside.some(f => tiles.has(f)) ? 'Tap a tile inside the lit loop.' : 'Tap a tile next to the lit wires.'};
  // The reason in words; from the second hint on, Can't and the face are
  // marked on the board.
  const face = certs.find(f => isHole(B, f)) ?? certs[0];
  return {type: 'move', action: {cant: face}, text: isHole(B, face) ? REASON.hole : REASON.empty};
}

/* ------------------------------------------------------------------ *
 * Schedule: add wires and fill triangles; the first loop to close lights,
 * and must go out with the marked tile.
 * ------------------------------------------------------------------ */
// The save: {steps}, each {edge: e} or {tile: t}. Everything shown is
// replayed from it.
const targetOf = p => p.parameters.target;
export const startEdges = p => edgesOf(boardOf(p.parameters), p.parameters.start);
// The wires between two dots along wires already in, or null.
function pathBetween(B, present, from, to) {
  const back = new Map([[from, null]]), queue = [from];
  for (let i = 0; i < queue.length && !back.has(to); i++) {
    for (const [k, e] of B.nbr[queue[i]]) if (present[e] && !back.has(k)) { back.set(k, [queue[i], e]); queue.push(k); }
  }
  if (!back.has(to)) return null;
  const path = [];
  for (let k = to; back.get(k); k = back.get(k)[0]) path.push(back.get(k)[1]);
  return path;
}
// Replays steps from the start: wires in, tiles filled, the saved loop (the
// first to close) and its faces inside, and the tile count at which it
// went out (0 while lit). ok is false at the first illegal step.
export function replaySchedule(p, steps) {
  const B = boardOf(p.parameters), present = maskOf(B, startEdges(p)), filled = new Uint8Array(B.T);
  const s = {ok: true, present, filled, tiles: 0, saved: null, inside: null, born: 0, out: 0, steps: 0};
  for (const step of steps) {
    if (s.out || s.tiles >= targetOf(p) || !object(step) || Object.keys(step).length !== 1) { s.ok = false; break; }
    if ('edge' in step) {
      const e = step.edge;
      if (!index(e, B.E) || present[e]) { s.ok = false; break; }
      if (!s.saved) {
        const [a, c] = B.m.edges[e], path = pathBetween(B, present, a, c);
        if (path) { s.saved = maskOf(B, [e, ...path]); s.inside = facesInside(B, s.saved); s.born = s.steps + 1; }
      }
      present[e] = 1;
    } else if ('tile' in step) {
      const t = step.tile;
      if (!index(t, B.T) || filled[t] || !B.m.cellEdges[t].every(e => present[e])) { s.ok = false; break; }
      filled[t] = 1; s.tiles++;
      if (s.saved && s.inside.every(f => f < B.T && filled[f])) s.out = s.tiles;
    } else { s.ok = false; break; }
    s.steps++;
  }
  return s;
}
const validSchedule = (p, b) => puzzleOk(p) && keysAre(b, 'steps') && Array.isArray(b.steps) && b.steps.length <= 200 && replaySchedule(p, b.steps).ok;
const solvedSchedule = (p, b) => validSchedule(p, b) && replaySchedule(p, b.steps).out === targetOf(p);
const decided = (p, s) => s.out > 0 || s.tiles >= targetOf(p);
function moveSchedule(p, b, action) {
  if (!validSchedule(p, b) || !object(action) || Object.keys(action).length !== 1 || !('edge' in action || 'tile' in action)) return null;
  const steps = [...b.steps, 'edge' in action ? {edge: action.edge} : {tile: action.tile}];
  return replaySchedule(p, steps).ok ? {steps} : null;
}
// The plan from a state: which loop to save (before the first wire), and
// whether the marked tile can still put it out. The start wires join every
// dot with no loop (the builder checks), so the first wire always closes a
// loop: that wire and the start wires' path between its dots. No tile can be
// filled before then, since a tile needs a loop of three wires.
function schedulePlan(p, s) {
  const B = boardOf(p.parameters), k = targetOf(p);
  // The same wires and tiles can come with different saved loops, so the
  // saved loop is part of the key.
  const memo = planMemo(p), key = `${listOf(s.present).join()}|${listOf(s.filled).join()}|${s.saved ? listOf(s.saved).join() : ''}`;
  if (memo.has(key)) return memo.get(key);
  let plan = null;
  if (s.saved) {
    // Out with tile k: no hole inside, and the loop's tiles left plus the
    // tiles outside it still to pad fit exactly into the tiles left.
    const left = s.inside.filter(f => f < B.T && !s.filled[f]).length;
    const outsideLeft = [...B.m.cells.keys()].filter(t => !s.inside.includes(t) && !s.filled[t]).length;
    const padding = k - s.tiles - left;
    if (!s.inside.some(f => isHole(B, f)) && left >= 1 && padding >= 0 && outsideLeft >= padding) plan = {inside: s.inside, saved: s.saved, padding};
  } else {
    for (let e = 0; e < B.E; e++) {
      if (s.present[e]) continue;
      const [a, c] = B.m.edges[e], path = pathBetween(B, s.present, a, c);
      if (!path) continue;
      const saved = maskOf(B, [e, ...path]), inside = facesInside(B, saved);
      if (inside.some(f => isHole(B, f)) || inside.length > k) continue;
      if (!plan || inside.length > plan.inside.length) plan = {inside, saved, edge: e, padding: k - inside.length};
    }
  }
  memo.set(key, plan);
  return plan;
}
const plans = new Map();
const planMemo = p => { if (!plans.has(p.id)) plans.set(p.id, new Map()); return plans.get(p.id); };
const fillable = (B, present, t) => B.m.cellEdges[t].every(e => present[e]);
function hintSchedule(p, b) {
  if (!validSchedule(p, b)) return {type: 'deadend', text: 'Restart.'};
  const s = replaySchedule(p, b.steps), B = boardOf(p.parameters);
  if (s.out === targetOf(p)) return {type: 'done'};
  // Gone too soon, or the marked tile is in and the loop is still lit: the
  // board shows it.
  if (decided(p, s)) return {type: 'deadend', text: s.out ? 'It went out too soon. Undo.' : 'It is still lit. Undo.'};
  const plan = schedulePlan(p, s);
  // No way left, though the board doesn't show it yet: no line under the
  // board, and a hint asks for Undo.
  if (!plan) return {type: 'deadend', text: ''};
  if (!s.saved) return {type: 'move', action: {edge: plan.edge}, text: B.holes.length ? 'Add this wire first. The loop it closes doesn’t go round the hole.' : 'Add this wire first.'};
  // Pad with tiles outside the loop first, then fill the loop's own tiles,
  // so its last one is the marked tile.
  const want = plan.padding > 0 ? [...B.m.cells.keys()].filter(t => !s.filled[t] && !plan.inside.includes(t)) : plan.inside.filter(t => !s.filled[t]);
  const ready = want.find(t => fillable(B, s.present, t));
  if (ready !== undefined) {
    const last = plan.padding === 0 && want.length === 1;
    return {type: 'move', action: {tile: ready}, text: last ? 'Fill this triangle: it is the last one inside the loop.' : plan.padding > 0 ? 'Fill a triangle outside the lit loop.' : 'Fill a triangle inside the lit loop.'};
  }
  const e = B.m.cellEdges[want[0]].find(f => !s.present[f]);
  return {type: 'move', action: {edge: e}, text: 'Add this wire.'};
}

/* ------------------------------------------------------------------ *
 * Race: fill triangles so the yellow loop goes out while the pink one is
 * still lit, or Can't and the tiles that fill the pink loop.
 * ------------------------------------------------------------------ */
// The save: {fills, cant, refused}. fills are the triangles filled, in
// order; cant is the right claim's tiles; refused is a wrong claim's tiles
// and whether its note still shows (a lock, as in cancel).
export const loopsOf = p => { const B = boardOf(p.parameters); return {yellow: maskOf(B, edgesOf(B, p.parameters.yellow)), pink: maskOf(B, edgesOf(B, p.parameters.pink))}; };
export function raceSets(p) {
  const B = boardOf(p.parameters), {yellow, pink} = loopsOf(p);
  const y = facesInside(B, yellow), k = facesInside(B, pink);
  return {yellow: y, pink: k, pinkOnly: k.filter(f => !y.includes(f))};
}
// A loop round a hole never goes out (the builder keeps holes out of race
// loops, and this says so anyway).
export const canRace = p => { const B = boardOf(p.parameters), sets = raceSets(p); return !sets.yellow.some(f => isHole(B, f)) && sets.pinkOnly.length > 0; };
// Replays fills: the fill count at which each loop went out (0 while lit).
export function replayRace(p, fills) {
  const B = boardOf(p.parameters), sets = raceSets(p), filled = new Uint8Array(B.T), s = {ok: true, filled, yellow: 0, pink: 0};
  const gone = inside => inside.every(f => f < B.T && filled[f]);
  for (const [i, t] of fills.entries()) {
    if (s.yellow || s.pink || !index(t, B.T) || filled[t]) { s.ok = false; break; }
    filled[t] = 1;
    if (gone(sets.yellow)) s.yellow = i + 1;
    if (gone(sets.pink)) s.pink = i + 1;
  }
  return s;
}
const validTiles = (list, T) => Array.isArray(list) && list.length > 0 && list.every((t, i) => index(t, T) && (i === 0 || t > list[i - 1]));
const rightClaim = (p, tiles) => { const sets = raceSets(p); return !canRace(p) && sameList(tiles, [...sets.pink].sort((a, b) => a - b)); };
function validRace(p, b) {
  if (!puzzleOk(p) || !keysAre(b, 'cant,fills,refused') || !Array.isArray(b.fills)) return false;
  const B = boardOf(p.parameters), s = replayRace(p, b.fills);
  if (!s.ok) return false;
  // Claims are made after a fill and before the pink loop goes out (a loop
  // that is out stays out, so a claim kept through Undo still fits).
  if (b.cant !== null && !(validTiles(b.cant, B.T) && rightClaim(p, b.cant) && b.fills.length > 0 && !s.pink)) return false;
  if (b.refused !== null && !(keysAre(b.refused, 'shown,tiles') && validTiles(b.refused.tiles, B.T) && typeof b.refused.shown === 'boolean' && !rightClaim(p, b.refused.tiles) && (!b.refused.shown || b.fills.length > 0) && !s.pink)) return false;
  // A right claim ends the puzzle; yellow out first ends it too.
  if (b.cant !== null && (b.refused !== null || s.yellow && !s.pink)) return false;
  return true;
}
const solvedRace = (p, b) => { if (!validRace(p, b)) return false; const s = replayRace(p, b.fills); return b.cant !== null || s.yellow > 0 && !s.pink; };
// Can't is open after a fill, while the pink loop is lit and no refusal
// stands. Once the pink loop is out the board shows the attempt failed;
// Undo, and Can't opens again.
const raceOpen = (p, b) => b.fills.length > 0 && b.refused === null && !replayRace(p, b.fills).pink && !solvedRace(p, b);
function moveRace(p, b, action) {
  if (!validRace(p, b) || solvedRace(p, b) || !object(action) || Object.keys(action).length !== 1) return null;
  const B = boardOf(p.parameters);
  if ('tile' in action) {
    const fills = [...b.fills, action.tile];
    return replayRace(p, fills).ok ? {fills, cant: null, refused: null} : null;
  }
  if ('cant' in action && validTiles(action.cant, B.T) && raceOpen(p, b)) {
    return rightClaim(p, action.cant) ? {...b, cant: [...action.cant]} : {...b, refused: {tiles: [...action.cant], shown: true}};
  }
  return null;
}
// The refusal says what is true of the tiles tapped: they don't fill the
// pink loop, or they do and there is a way (the only way the right tiles
// can be refused).
export const raceRefusal = (p, tiles) => sameList(tiles, [...raceSets(p).pink].sort((a, b) => a - b)) ? 'There is a way.' : 'Those tiles don’t fill the pink loop.';
function hintRace(p, b) {
  if (!validRace(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solvedRace(p, b)) return {type: 'done'};
  const B = boardOf(p.parameters), s = replayRace(p, b.fills), sets = raceSets(p);
  if (s.pink) return {type: 'deadend', text: s.yellow ? 'They went out together. Undo.' : 'The pink loop went out first. Undo.'};
  if (canRace(p)) {
    // Doomed though the board doesn't show it yet: every tile only the pink
    // loop needs is in. No line under the board; a hint offers Undo.
    if (sets.pinkOnly.every(t => s.filled[t])) return {type: 'deadend', text: ''};
    return {type: 'move', action: {tile: sets.yellow.find(t => !s.filled[t])}, text: 'Fill a triangle inside the yellow loop.'};
  }
  // Can't: an attempt first, then the reason (from the second hint on, Can't
  // and the tiles are marked). After a refusal a fill reopens Can't: one that
  // leaves the pink loop lit.
  if (!raceOpen(p, b)) {
    const left = sets.pink.filter(t => !s.filled[t]).length;
    const tile = [...sets.yellow, ...B.m.cells.keys()].find(t => !s.filled[t] && (left > 1 || !sets.pink.includes(t)));
    if (tile === undefined) return {type: 'deadend', text: 'Undo.'};
    return {type: 'move', action: {tile}, text: sets.yellow.includes(tile) ? 'Fill a triangle inside the yellow loop.' : 'Fill a triangle.'};
  }
  return {type: 'move', action: {cant: [...sets.pink].sort((a, c) => a - c)}, text: 'Every triangle the pink loop needs is inside the yellow loop, so the pink loop goes out first or with it.'};
}

/* ------------------------------------------------------------------ *
 * Drawing: one SVG board, its controls, the tile track and the tools.
 * ------------------------------------------------------------------ */
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {point: false, picks: []}); return uiState.get(p.id); };
const kindOf = p => p.parameters.kind;
const n2 = v => Number(v.toFixed(2));
const pts = (B, dots) => dots.map(k => B.m.xy[k].map(n2).join(',')).join(' ');
const cellPts = (B, t) => pts(B, B.m.cells[t]);
const holePts = (B, h) => pts(B, B.holes[h].dots);
const facePts = (B, f) => f < B.T ? cellPts(B, f) : holePts(B, f - B.T);
// A wire's ends as line attributes, moved sideways by shift.
const ends = (B, e, shift = 0) => {
  const [a, b] = B.m.edges[e].map(k => B.m.xy[k]), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len * shift, ny = dx / len * shift;
  return `x1="${n2(a[0] + nx)}" y1="${n2(a[1] + ny)}" x2="${n2(b[0] + nx)}" y2="${n2(b[1] + ny)}"`;
};
// A face's middle, for rings and marks: a triangle's centre, a hole's
// average dot (the holes here are convex).
const middle = (B, f) => f < B.T ? B.m.centre[f] : [0, 1].map(d => B.holes[f - B.T].dots.reduce((s, k) => s + B.m.xy[k][d], 0) / B.holes[f - B.T].dots.length);
const faceName = (B, f) => f < B.T ? `triangle ${f + 1}` : B.holes.length > 1 ? `hole ${f - B.T + 1}` : 'the hole';
const Cap = s => s[0].toUpperCase() + s.slice(1);

// The board. look: {tiles (filled triangles), present (wires in, or null for
// all), glows [{mask, cls}], outs [{mask}], cells (t → {act, label, cls}),
// holes (h → {act, label}), places (e → {act, label, cls}), shade (faces),
// rings (faces), solved}.
function drawBoard(p, B, look) {
  const tiles = look.tiles, present = look.present;
  const tris = B.m.cells.map((_, t) => `<polygon class="hl-tri${tiles[t] ? ' filled' : ''}${look.cells?.(t)?.cls || ''}" points="${cellPts(B, t)}"/>`).join('');
  const holes = B.holes.map((_, h) => `<polygon class="hl-hole" points="${holePts(B, h)}"/>`).join('');
  const shade = (look.shade || []).map(f => `<polygon class="hl-shade${f >= B.T ? ' over-hole' : ''}" points="${facePts(B, f)}"/>`).join('');
  const wires = B.m.edges.map((_, e) => `<line class="${!present || present[e] ? 'hl-wire' : `hl-place${look.places?.(e)?.cls || ''}`}" ${ends(B, e)}/>`).join('');
  // Lit loops: an ink line under a coloured one. Where two loops share a
  // wire they run side by side.
  const glows = look.glows || [], outs = look.outs || [];
  const both = e => glows.filter(g => g.mask[e]).length + outs.filter(o => o.mask[e]).length;
  const lines = (list, cls) => list.map((g, i) => listOf(g.mask).map(e => {
    const k = both(e), order = [...glows, ...outs].filter(x => x.mask[e]).indexOf(g), shift = k > 1 ? (order - (k - 1) / 2) * 1.3 : 0;
    return cls === 'out' ? `<line class="hl-out" ${ends(B, e, shift)}/>` : `<line class="hl-glow-under${k > 1 ? ' thin' : ''}" ${ends(B, e, shift)}/><line class="hl-glow ${g.cls}${k > 1 ? ' thin' : ''}" ${ends(B, e, shift)}/>`;
  }).join('')).join('');
  const dots = B.m.xy.map(([x, y]) => `<circle class="hl-dot" cx="${n2(x)}" cy="${n2(y)}" r=".55"/>`).join('');
  const rings = (look.rings || []).map(f => `<polygon class="hl-ring" points="${facePts(B, f)}"/>`).join('');
  const picks = (look.picks || []).map(t => `<polygon class="hl-pick" points="${insetPts(B, t)}"/>`).join('');
  const marks = (look.marks || []).map(f => `<polygon class="hl-mark" points="${f < B.T ? insetPts(B, f) : holePts(B, f - B.T)}"/>`).join('');
  const markedPlaces = (look.markedPlaces || []).map(e => `<line class="hl-mark-place" ${ends(B, e)}/>`).join('');
  // Controls: triangles and holes, then dashed wire places (placeArea), which
  // never overlap a triangle that is a button.
  const cellHits = B.m.cells.map((_, t) => { const c = look.cells?.(t); return c?.act ? `<polygon class="tg-hit hl-hit" points="${cellPts(B, t)}" role="button" tabindex="0" aria-label="${esc(c.label)}" data-tg-cell="${t}" data-focus="hl-cell-${t}"/>` : ''; }).join('');
  const holeHits = B.holes.map((_, h) => { const c = look.holes?.(h); return c?.act ? `<polygon class="tg-hit hl-hit hl-hole-hit" points="${holePts(B, h)}" role="button" tabindex="0" aria-label="${esc(c.label)}" data-tg-piece="hole-${h}" data-focus="hl-hole-${h}"/>` : ''; }).join('');
  const placeHits = present ? B.m.edges.map((_, e) => { const c = !present[e] && look.places?.(e); return c?.act ? `<polygon class="tg-hit hl-place-hit" points="${pts2(placeArea(B, e))}" role="button" tabindex="0" aria-label="${esc(c.label)}" data-tg-edge="${e}" data-focus="hl-edge-${e}"/>` : ''; }).join('') : '';
  const [x, y, w, h] = B.m.box, pad = 4;
  // The hatching that marks a hole (one board on a page, so one pattern id).
  const hatch = B.holes.length ? '<defs><pattern id="hl-hatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="hl-hatch-bg" width="2.4" height="2.4"/><line class="hl-hatch-line" x1="0" y1="0" x2="0" y2="2.4"/></pattern></defs>' : '';
  return `<svg class="tg-board hl-svg${look.solved ? ' solved' : ''}" viewBox="${n2(x - pad)} ${n2(y - pad)} ${n2(w + 2 * pad)} ${n2(h + 2 * pad)}" style="--hl-units:${n2((w + 2 * pad) / 10)};--hl-ratio:${n2((w + 2 * pad) / (h + 2 * pad))}" role="group" data-tg-board tabindex="-1" aria-label="${esc(look.label || 'Board')}">${hatch}${tris}${holes}${shade}${wires}${lines(outs, 'out')}${lines(glows, 'glow')}${dots}${rings}${picks}${marks}${markedPlaces}${cellHits}${holeHits}${placeHits}</svg>`;
}
// A dashed place's button: the part of the triangles on each side of it that
// is nearer to it than to their other sides (each triangle splits into three
// by the lines from its corners to its incentre), and on the page or hole side
// the same shape mirrored. So a tap goes to the nearest wire, places never
// overlap, and none reaches a triangle ready for a tile (both triangles beside
// a place lack its wire). It is cut off short of each dot, so a tap close to a
// dot where several dashed lines meet adds none.
const PLACE_TRIM = .12;
const incentre = (B, t) => {
  const c = B.m.cells[t].map(k => B.m.xy[k]), l = c.map((_, i) => Math.hypot(c[(i + 1) % 3][0] - c[(i + 2) % 3][0], c[(i + 1) % 3][1] - c[(i + 2) % 3][1])), L = l[0] + l[1] + l[2];
  return [0, 1].map(d => (l[0] * c[0][d] + l[1] * c[1][d] + l[2] * c[2][d]) / L);
};
export function placeArea(B, e) {
  const [a, b] = B.m.edges[e].map(k => B.m.xy[k]), dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
  const inner = B.sides[e].filter(f => f >= 0 && f < B.T).map(t => incentre(B, t));
  // The mirror image across the wire, for its side without a triangle.
  const mirror = ([x, y]) => { const k = 2 * ((x - a[0]) * dy - (y - a[1]) * dx) / len2; return [x - k * dy, y + k * dx]; };
  const tips = inner.length === 2 ? inner : [inner[0], mirror(inner[0])];
  let poly = [a, tips[0], b, tips[1]];
  // Keep the part between PLACE_TRIM and 1 − PLACE_TRIM along the wire.
  const along = ([x, y]) => ((x - a[0]) * dx + (y - a[1]) * dy) / len2;
  for (const keep of [q => along(q) - PLACE_TRIM, q => 1 - PLACE_TRIM - along(q)]) {
    const out = [];
    poly.forEach((q, i) => {
      const r = poly[(i + 1) % poly.length], fq = keep(q), fr = keep(r);
      if (fq >= 0) out.push(q);
      if ((fq >= 0) !== (fr >= 0)) { const u = fq / (fq - fr); out.push([q[0] + (r[0] - q[0]) * u, q[1] + (r[1] - q[1]) * u]); }
    });
    poly = out;
  }
  return poly;
}
const pts2 = list => list.map(q => q.map(n2).join(',')).join(' ');
function insetPts(B, t, k = .62) {
  const [cx, cy] = B.m.centre[t];
  return B.m.cells[t].map(i => [cx + (B.m.xy[i][0] - cx) * k, cy + (B.m.xy[i][1] - cy) * k].map(n2).join(',')).join(' ');
}
const tool = (label, cls, attrs) => `<button type="button" class="secondary hl-tool ${cls}" ${attrs}>${label}</button>`;

function renderCancel(p, a) {
  const B = boardOf(p.parameters), b = a.board, tiles = filledOf(p), solved = solvedCancel(p, b);
  const lit = litAfter(p, b.taps), state = ui(p), open = !solved && cantOpen(b);
  const point = open && state.point;
  const shown = a.hintLevel >= 2 && !solved ? hintCancel(p, b) : null;
  const hintTile = shown?.action?.tile, hintFace = shown?.action?.cant;
  const mask = new Uint8Array(B.T);
  for (const t of tiles) mask[t] = 1;
  const cells = t => {
    const filled = tiles.has(t);
    if (solved) return {};
    if (point) return {act: true, label: `${Cap(faceName(B, t))}, ${filled ? 'tile' : 'empty'}. Claim this one keeps the loop lit`};
    return filled ? {act: true, label: `Tile on ${faceName(B, t)}: flip its three wires`} : {};
  };
  const holes = h => point ? {act: true, label: `${Cap(faceName(B, B.T + h))}. Claim it keeps the loop lit`} : null;
  const marks = [hintTile, hintFace].filter(f => f !== undefined);
  const right = b.cant !== null;
  const board = drawBoard(p, B, {
    tiles: mask, present: null, glows: dark(lit) ? [] : [{mask: lit, cls: 'sun'}], cells, holes,
    shade: right ? facesInside(B, lit) : [], rings: right ? [b.cant] : [], marks,
    solved, label: `Board: ${plural(B.T, 'triangle', 'triangles')}${B.holes.length ? ' round a hole' : ''}`
  });
  const cant = solved ? '' : tool('Can’t', `hl-cant${hintFace !== undefined && !point ? ' hinted' : ''}`, `data-hl-ui='${JSON.stringify({point: !point})}' data-focus="hl-cant" aria-pressed="${point}"${open ? '' : ' disabled'}`);
  const note = b.refused?.shown ? 'That one doesn’t keep it lit.' : '';
  const litCount = listOf(lit).length;
  const status = solved ? (right ? `${Cap(faceName(B, b.cant))} stays inside the loop, so it can’t go dark.` : 'Every wire is dark.') : `${litCount ? plural(litCount, 'wire lit', 'wires lit') : 'Every wire is dark'}.${point ? ` Tap the triangle${B.holes.length ? ' or hole' : ''} that keeps the loop lit.` : ''}${note ? ` ${note}` : ''}`;
  return `<div class="hl-board hl-cancel${solved ? ' solved' : ''}${point ? ' pointing' : ''}" data-mechanic-wire="holes">${board}<div class="hl-tools">${cant}${note ? `<p class="hl-note">${esc(note)}</p>` : ''}</div><p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// The tile track: an outline for each tile up to the marked one; tiles
// filled fill them in order; the marked outline has a dark loop in it, and
// the outline where the loop went out gets one too.
function track(p, s) {
  const k = targetOf(p);
  const loop = '<svg viewBox="0 0 20 20" class="hl-glyph" aria-hidden="true"><path class="hl-glyph-loop" d="M10 3.5 16.5 15h-13Z"/></svg>';
  const tile = '<svg viewBox="0 0 20 20" class="hl-glyph" aria-hidden="true"><path class="hl-glyph-tile" d="M10 3.5 16.5 15h-13Z"/></svg>';
  const slots = Array.from({length: k}, (_, i) => {
    const n = i + 1, filled = n <= s.tiles, out = s.out === n;
    const cls = `hl-slot${filled ? ' filled' : ''}${n === k ? ' target' : ''}${out ? ' out' : ''}`;
    const words = `Tile ${n}${n === k ? ', marked' : ''}${filled ? ', filled' : ''}${out ? ', the loop went out' : ''}`;
    return `<li class="${cls}"><span class="sr-only">${words}</span>${filled ? tile : ''}${n === k || out ? loop : ''}</li>`;
  }).join('');
  return `<ol class="hl-track" aria-label="Tiles">${slots}</ol>`;
}
function renderSchedule(p, a) {
  const B = boardOf(p.parameters), b = a.board, s = replaySchedule(p, b.steps), solved = s.out === targetOf(p), live = !decided(p, s);
  const shown = a.hintLevel >= 2 && !solved ? hintSchedule(p, b) : null;
  const cells = t => {
    if (!live || s.filled[t]) return {};
    const ready = fillable(B, s.present, t);
    return ready ? {act: true, label: `Fill ${faceName(B, t)}`, cls: ' ready'} : {};
  };
  const places = e => live ? {act: true, label: `Add the wire between dots ${B.m.edges[e][0] + 1} and ${B.m.edges[e][1] + 1}`} : null;
  const lit = s.saved && !s.out ? [{mask: s.saved, cls: 'sun'}] : [];
  const board = drawBoard(p, B, {
    tiles: s.filled, present: s.present, glows: lit, outs: s.saved && s.out ? [{mask: s.saved}] : [], cells, places,
    marks: shown?.action?.tile !== undefined ? [shown.action.tile] : [], markedPlaces: shown?.action?.edge !== undefined ? [shown.action.edge] : [],
    solved, label: `Board: ${plural(B.T, 'triangle', 'triangles')}${B.holes.length ? ' round a hole' : ''}`
  });
  const status = `${s.saved ? s.out ? `The first loop went out with tile ${s.out}.` : 'The first loop is lit.' : 'No loop yet.'} ${plural(s.tiles, 'tile', 'tiles')} of ${targetOf(p)} filled.`;
  return `<div class="hl-board hl-schedule${solved ? ' solved' : ''}" data-mechanic-wire="holes">${board}${track(p, s)}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

function renderRace(p, a) {
  const B = boardOf(p.parameters), b = a.board, s = replayRace(p, b.fills), solved = solvedRace(p, b), loops = loopsOf(p), state = ui(p);
  const open = raceOpen(p, b);
  const point = open && state.point;
  const shown = a.hintLevel >= 2 && !solved ? hintRace(p, b) : null;
  const hintTiles = shown?.action?.tile !== undefined ? [shown.action.tile] : shown?.action?.cant || [];
  const live = !s.yellow && !s.pink && !solved;
  const cells = t => {
    if (solved) return {};
    if (point) return {act: true, label: `${Cap(faceName(B, t))}${state.picks.includes(t) ? ', tapped' : ''}`};
    return live && !s.filled[t] ? {act: true, label: `Fill ${faceName(B, t)}`} : {};
  };
  const glows = [], outs = [];
  (s.yellow ? outs : glows).push({mask: loops.yellow, cls: 'sun'});
  (s.pink ? outs : glows).push({mask: loops.pink, cls: 'rose'});
  const right = b.cant !== null;
  const board = drawBoard(p, B, {
    tiles: s.filled, present: null, glows, outs, cells, solved,
    shade: right ? raceSets(p).yellow : [], rings: right ? b.cant : [], picks: point ? state.picks : [], marks: hintTiles,
    label: `Board: ${plural(B.T, 'triangle', 'triangles')}, a yellow loop and a pink loop`
  });
  const cant = solved ? '' : tool('Can’t', `hl-cant${shown?.action?.cant && !point ? ' hinted' : ''}`, `data-hl-ui='${JSON.stringify({point: !point})}' data-focus="hl-cant" aria-pressed="${point}"${open ? '' : ' disabled'}`);
  const check = point ? tool('Check', `hl-check${shown?.action?.cant ? ' hinted' : ''}`, `data-hl-move='${esc(JSON.stringify({cant: [...state.picks].sort((x, y) => x - y)}))}' data-focus="hl-check"${state.picks.length ? '' : ' disabled'}`) : '';
  const note = b.refused?.shown ? raceRefusal(p, b.refused.tiles) : '';
  const word = x => x ? `out with fill ${x}` : 'lit';
  const status = solved && right ? 'Every tile the pink loop needs is inside the yellow loop.' : `Yellow loop ${word(s.yellow)}, pink loop ${word(s.pink)}. ${plural(b.fills.length, 'triangle', 'triangles')} filled.${point ? ` ${ASK.race}` : ''}${note ? ` ${note}` : ''}`;
  return `<div class="hl-board hl-race${solved ? ' solved' : ''}${point ? ' pointing' : ''}" data-mechanic-wire="holes">${board}<div class="hl-tools">${cant}${check}${note ? `<p class="hl-note">${esc(note)}</p>` : ''}</div><p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// While pointing after Can't, the goal line says what to tap instead, so the
// screen keeps one line and nothing moves.
const ASK = {cancel: 'Tap what keeps the loop lit.', race: 'Tap the tiles that fill the pink loop, then Check.'};
function objective(p, b) {
  if (!puzzleOk(p) || !uiState.get(p.id)?.point) return undefined;
  if (kindOf(p) === 'cancel') return validCancel(p, b) && !solvedCancel(p, b) && cantOpen(b) ? ASK.cancel : undefined;
  if (kindOf(p) === 'race') return validRace(p, b) && raceOpen(p, b) ? ASK.race : undefined;
  return undefined;
}

// Taps on the board go through tri-grid's wireTri (pointer press and
// release, Enter and Space). Can't and Check are this family's own buttons,
// so pressing Can't can send focus to the board rather than leave it on
// Can't.
function wire(root, p, api) {
  const kind = kindOf(p), B = boardOf(p.parameters), state = ui(p);
  const apply = action => { Object.assign(state, {point: false, picks: []}); api.apply(action); };
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-hl-ui],[data-hl-move]');
    if (!control || !root.contains(control) || control.disabled) return;
    if (control.dataset.hlMove) { try { apply(JSON.parse(control.dataset.hlMove)); } catch { /* malformed control data is ignored */ } return; }
    try { api.ui(JSON.parse(control.dataset.hlUi)); } catch { return; }
    if (ui(p).point) document.querySelector('[data-mechanic-wire="holes"] .hl-svg')?.focus({preventScroll: true});
  });
  const pointing = () => state.point && root.classList.contains('pointing');
  wireTri(root, B.m, {
    cell: t => {
      if (kind === 'cancel') return pointing() ? {cant: t} : {tile: t};
      if (kind === 'race' && pointing()) { api.ui({pick: t}); return null; }
      return {tile: t};
    },
    piece: key => kind === 'cancel' && pointing() && /^hole-\d+$/.test(key) ? {cant: B.T + Number(key.slice(5))} : null,
    edge: e => ({edge: e})
  }, action => {
    // A face tapped after Can't is the claim; it ends the pointing.
    apply(action);
  });
}

const hooks = {
  fresh: p => kindOf(p) === 'schedule' ? {steps: []} : kindOf(p) === 'race' ? {fills: [], cant: null, refused: null} : {taps: [], cant: null, refused: null},
  valid: (p, b) => kindOf(p) === 'schedule' ? validSchedule(p, b) : kindOf(p) === 'race' ? validRace(p, b) : validCancel(p, b),
  solved: (p, b) => kindOf(p) === 'schedule' ? solvedSchedule(p, b) : kindOf(p) === 'race' ? solvedRace(p, b) : solvedCancel(p, b),
  move: (p, b, action) => kindOf(p) === 'schedule' ? moveSchedule(p, b, action) : kindOf(p) === 'race' ? moveRace(p, b, action) : moveCancel(p, b, action),
  hint: (p, b) => kindOf(p) === 'schedule' ? hintSchedule(p, b) : kindOf(p) === 'race' ? hintRace(p, b) : hintCancel(p, b),
  render: (p, a) => kindOf(p) === 'schedule' ? renderSchedule(p, a) : kindOf(p) === 'race' ? renderRace(p, a) : renderCancel(p, a),
  objective,
  wire,
  ui(p, payload) {
    const state = ui(p);
    if (!object(payload)) return;
    if (typeof payload.point === 'boolean') Object.assign(state, {point: payload.point, picks: []});
    // A tile tapped after Can't in a race: ringed, or unringed.
    if (Number.isInteger(payload.pick) && state.point) state.picks = state.picks.includes(payload.pick) ? state.picks.filter(t => t !== payload.pick) : [...state.picks, payload.pick];
  },
  reset: p => { uiState.delete(p.id); },
  // Undo takes back a tap or a fill, never a lock: a refused claim stays
  // refused (its note hidden) until the next tap or fill. Undo also ends
  // pointing after Can't.
  carry(p, from, to) {
    uiState.delete(p.id);
    if (kindOf(p) === 'schedule' || !object(from) || !object(to) || !from.refused || to.refused) return to;
    return {...to, refused: {...from.refused, shown: false}};
  }
};
export const holesMechanics = {holes: hooks};
// For tests and the validator.
export const internals = {validCancel, solvedCancel, hintCancel, validSchedule, hintSchedule, schedulePlan, validRace, hintRace, ui};

// The family seam entry (dist/families.js). The puzzles join Lantern Wires as
// its Holes group, so the module adds no satchel family.
export default {
  id: 'holes',
  mechanics: holesMechanics,
  pack: new URL('./holes.json', import.meta.url).href,
  css: new URL('./holes.css', import.meta.url).href,
  // After a move, focus stays on the board: a tile, a triangle, a hole or a
  // dashed wire, never Can't or Check.
  focus: '[data-mechanic-wire="holes"] :is(.hl-hit,.hl-place-hit)[tabindex="0"]'
};
