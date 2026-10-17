// Checks the Holes pack (dist/families/holes/holes.json), the Holes group in
// Lantern Wires, by methods other than the mechanic's own. The mechanic
// decides inside and outside by walking across the board from the page and
// counting crossings; here each board is rebuilt from its points and
// triangles with wires as bit masks, and
// - a cancel puzzle can go dark exactly when some set of its tiles has the
//   lit wires as its outline (every set of tiles is tried), and its
//   certificates are the faces that are not tiles and that a ray from the
//   face to the edge of the page crosses the lit wires an odd number of
//   times (ray casting); that set never changes along random taps;
// - a schedule's saved loop is gone exactly when it is a sum, mod 2, of the
//   filled tiles' outlines (Gaussian elimination); for every first wire the
//   goal is reachable exactly when some k tiles have the loop in their span
//   and one of them is needed; on the small board every legal play is
//   enumerated;
// - a race can be won exactly when some set of filled tiles kills the
//   yellow loop and not the pink one (every set of tiles is tried), and the
//   tiles of a Can't claim are the only set whose outline is the pink loop.
// Then the theorems the notes rely on, over every loop on small boards; the
// witnesses; hints alone from fresh, after wrong moves and after refusals;
// Can't only after an attempt, its lock kept through Undo with the note
// hidden, and refusals that say the same of the same taps on every board;
// how often random certificate taps succeed; illegal moves; forged saves.
// Run: node scripts/validate-holes.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoToSolvable} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {certificates, canRace, raceRefusal} from '../dist/families/holes/holes.js';
import {meshOf} from '../dist/tri-mesh.js';
import {loadPack} from './packs.mjs';

/* ------------------------------------------------------------------ *
 * The model: a board from its points and triangles, wires as bits.
 * ------------------------------------------------------------------ */
const key2 = (a, b) => a < b ? `${a},${b}` : `${b},${a}`;
const one = 1n;
// Wires are numbered as tri-mesh numbers them, since moves name wires by
// that number; everything else is worked out here.
function model(mesh) {
  const ends = meshOf(mesh).edges.map(e => [...e]), index = new Map(ends.map(([a, b], e) => [key2(a, b), e])), uses = new Map();
  const wire = (a, b) => { const k = key2(a, b); assert.ok(index.has(k)); uses.set(k, (uses.get(k) || 0) + 1); return index.get(k); };
  const tri = mesh.cells.map(([a, b, c]) => [wire(a, b), wire(b, c), wire(c, a)]);
  const tileMask = tri.map(es => es.reduce((m, e) => m ^ one << BigInt(e), 0n));
  // Rim wires (one triangle) chained into loops; the largest is the outline
  // of the board and the others are holes.
  const rim = ends.map((_, e) => uses.get(key2(...ends[e])) === 1);
  const used = new Set(), loops = [];
  for (let e = 0; e < ends.length; e++) {
    if (!rim[e] || used.has(e)) continue;
    const dots = [], wires = [];
    let at = ends[e][0], cur = e;
    while (!used.has(cur)) {
      used.add(cur); wires.push(cur); dots.push(at);
      at = ends[cur][0] === at ? ends[cur][1] : ends[cur][0];
      cur = ends.findIndex((w, f) => rim[f] && f !== cur && w.includes(at) && !used.has(f)) ;
      if (cur < 0) break;
    }
    const area = Math.abs(dots.reduce((s, k, i) => { const [x1, y1] = mesh.points[k], [x2, y2] = mesh.points[dots[(i + 1) % dots.length]]; return s + x1 * y2 - x2 * y1; }, 0) / 2);
    loops.push({dots, wires, area});
  }
  const outer = loops.reduce((best, l, i) => l.area > loops[best].area ? i : best, 0);
  const holes = loops.filter((_, i) => i !== outer);
  const T = mesh.cells.length;
  // A point inside each face: a triangle's centre; a hole's average dot
  // (the holes here are convex).
  const middle = dots => [0, 1].map(d => dots.reduce((s, k) => s + mesh.points[k][d], 0) / dots.length);
  const faces = [...mesh.cells.map(middle), ...holes.map(h => middle(h.dots))];
  const faceMask = [...tileMask, ...holes.map(h => h.wires.reduce((m, e) => m ^ one << BigInt(e), 0n))];
  return {mesh, ends, index, T, E: ends.length, V: mesh.points.length, holes, faces, faceMask, tileMask};
}
const bitsOf = (M, mask) => M.ends.map((_, e) => e).filter(e => mask >> BigInt(e) & one);
const maskOfPairs = (M, pairs) => pairs.reduce((m, [a, b]) => m ^ one << BigInt(M.index.get(key2(a, b))), 0n);
const sumOf = (M, faces) => faces.reduce((m, f) => m ^ M.faceMask[f], 0n);
// Ray casting: the faces whose middle sees an odd number of lit wires along
// a ray towards the right, tilted so it misses every dot.
function insideByRays(M, lit) {
  const segs = bitsOf(M, lit).map(e => M.ends[e].map(k => M.mesh.points[k]));
  const dx = 1, dy = 0.1234567;
  return M.faces.map(([px, py]) => {
    let n = 0;
    for (const [[x1, y1], [x2, y2]] of segs) {
      // Solve p + t·d = a + s·(b − a), t > 0, 0 ≤ s < 1.
      const ex = x2 - x1, ey = y2 - y1, det = dx * -ey - dy * -ex;
      if (Math.abs(det) < 1e-12) continue;
      const rx = x1 - px, ry = y1 - py;
      const t = (rx * -ey - ry * -ex) / det, s = (dx * ry - dy * rx) / det;
      if (t > 1e-9 && s >= 0 && s < 1) n++;
    }
    return n % 2;
  }).map((odd, f) => odd ? f : -1).filter(f => f >= 0);
}
// Every subset of a list, in Gray-code order, with the running sum of
// outlines: calls visit(mask, members) for each.
function everySubset(M, list, visit) {
  let mask = 0n;
  const inSet = new Uint8Array(list.length);
  visit(0n, []);
  for (let i = 1; i < 1 << list.length; i++) {
    const bit = 31 - Math.clz32(i & -i);
    inSet[bit] ^= 1;
    mask ^= M.faceMask[list[bit]];
    visit(mask, list.filter((_, j) => inSet[j]));
  }
}
// Gaussian elimination over Z₂: is target a sum of some of the vectors?
function inSpan(vectors, target) {
  const basis = [];
  for (let v of vectors) {
    for (const b of basis) if ((v ^ b) < v) v ^= b;
    if (v) { basis.push(v); basis.sort((a, b) => (b > a ? 1 : b < a ? -1 : 0)); }
  }
  let t = target;
  for (const b of basis) if ((t ^ b) < t) t ^= b;
  return t === 0n;
}
// The highest bit decides the pivot when vectors are kept in decreasing
// order, so (v ^ b) < v exactly when b's top bit is set in v.

const sorted = list => [...list].sort((a, b) => a - b);
const same = (a, b) => sorted(a).join() === sorted(b).join();
const range = n => Array.from({length: n}, (_, i) => i);

/* ------------------------------------------------------------------ *
 * The theorems the notes rely on, on every loop of small boards: the
 * outline of exactly one set of faces, found by crossings; a tap changes
 * that set by the tile alone; a loop is a sum of tile outlines exactly when
 * every face inside it is a tile.
 * ------------------------------------------------------------------ */
function theorems(meshes) {
  let loops = 0;
  for (const mesh of meshes) {
    const M = model(mesh), F = M.faceMask.length;
    // Every set of faces gives a loop (an even number of wires at each dot);
    // different sets give different loops, so every loop is the outline of
    // exactly one set (the faces' outlines are independent).
    const seen = new Map();
    for (let s = 0; s < 1 << F; s++) {
      const faces = range(F).filter(f => s >> f & 1), lit = sumOf(M, faces);
      assert.ok(!seen.has(lit), 'different face sets have different outlines');
      seen.set(lit, faces);
      if (!lit) continue;
      const degree = new Uint8Array(M.V);
      for (const e of bitsOf(M, lit)) for (const k of M.ends[e]) degree[k]++;
      assert.ok(degree.every(d => d % 2 === 0), 'an outline is a loop');
      assert.ok(same(insideByRays(M, lit), faces), 'the faces inside a loop, by rays, are the faces it outlines');
      // A tile is a sum of tile outlines: the loop is, exactly when every
      // face inside is a tile.
      assert.equal(inSpan(M.tileMask, lit), faces.every(f => f < M.T), 'a loop is a sum of tile outlines exactly when every face inside is a tile');
      loops++;
    }
    // The loops are exactly the outlines: count the loops directly.
    let even = 0;
    const cap = Math.min(M.E, 20);
    if (M.E <= 20) for (let m = 1; m < 1 << cap; m++) {
      const degree = new Uint8Array(M.V);
      for (let e = 0; e < M.E; e++) if (m >> e & 1) for (const k of M.ends[e]) degree[k]++;
      if (degree.every(d => d % 2 === 0)) even++;
    }
    if (M.E <= 20) assert.equal(even, (1 << F) - 1, 'every loop is an outline');
  }
  return loops;
}

/* ------------------------------------------------------------------ *
 * Helpers on the engine.
 * ------------------------------------------------------------------ */
const hintRun = (p, a, label, limit = 300) => {
  let steps = 0;
  for (; steps < limit && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${label}: hints keep naming a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.trim(), `${label}: a hint says something`);
    assert.doesNotMatch(h.text, /Press Can’t|Can’t/, `${label}: hints give the reason, and the board marks Can’t`);
    a = move(p, a, h.action);
    assert.ok(a, `${label}: the hinted move ${JSON.stringify(h.action)} is legal`);
  }
  assert.ok(isSolved(p, a.board), `${label}: hints finish the puzzle`);
  assert.equal(nextHint(p, a).type, 'done');
  return steps;
};
const play = (p, actions, from = freshAttempt(p)) => actions.reduce((a, x) => { const next = a && move(p, a, x); assert.ok(next, `${p.id}: ${JSON.stringify(x)} is legal`); return next; }, from);
// Undo as the app does it: the engine's undo, then the mechanic's carry.
const undoInApp = (p, a) => { const next = undo(a); return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
let seed = 20261017;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = list => list[Math.floor(random() * list.length)];

/* ------------------------------------------------------------------ *
 * Cancel puzzles.
 * ------------------------------------------------------------------ */
function checkCancel(p, stats) {
  const q = p.parameters, M = model(q.mesh), label = p.id, lit = maskOfPairs(M, q.lit), F = M.faceMask.length;
  const tiles = q.filled;
  // Every set of tiles: which have the lit wires as their outline.
  const ways = [];
  everySubset(M, tiles, (mask, members) => { if (mask === lit) ways.push(members); });
  const inside = insideByRays(M, lit), byRays = inside.filter(f => !tiles.includes(f));
  assert.ok(ways.length <= 1, `${label}: at most one set of tiles outlines the lit wires`);
  assert.equal(ways.length === 1, byRays.length === 0, `${label}: dark exactly when no face inside is empty or a hole`);
  assert.ok(same(certificates(p), byRays), `${label}: the module's certificates are the empty faces inside, by rays`);
  if (ways.length) assert.ok(same(ways[0], inside), `${label}: the tiles to tap are the faces inside`);
  // The witness.
  const s = p.solution;
  let end = s.taps.reduce((m, t) => m ^ M.faceMask[t], lit);
  if (s.cant === null) { assert.equal(end, 0n, `${label}: the witness makes every wire dark`); assert.equal(s.taps.length, ways[0].length, `${label}: one tap for each face inside`); }
  else { assert.ok(byRays.includes(s.cant) && s.taps.length > 0 && end !== 0n, `${label}: the witness claims a certificate after a tap`); }
  assert.ok(same(s.inside, inside), `${label}: the faces inside, in the solution`);
  // Along random taps the empty faces inside never change.
  for (let run = 0; run < 40; run++) {
    let m = lit;
    for (let i = 0; i < 12; i++) { m ^= M.faceMask[pick(tiles)]; if (!m) break; assert.ok(same(insideByRays(M, m).filter(f => !tiles.includes(f)), byRays), `${label}: taps never move an empty face or the hole`); }
  }
  // Random certificate taps: one face of all.
  if (byRays.length) stats.certificateOdds.push(`${label} ${byRays.length}/${F}`);
  if (byRays.length) assert.ok(byRays.length / F <= 1 / 6, `${label}: a random face is seldom a certificate`);

  // Hints from fresh; the first hint taps a tile, never Can't.
  const fresh = freshAttempt(p);
  assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board));
  assert.ok('tile' in nextHint(p, fresh).action, `${label}: the first live hint is a tap`);
  stats.hintSteps += hintRun(p, fresh, label);
  // Can't before any tap does nothing.
  for (let f = 0; f < F; f++) assert.equal(move(p, fresh, {cant: f}), null, `${label}: Can’t needs a tap first`);
  // After a tap outside the loop (a wrong move), hints still finish.
  const outsideTile = tiles.find(t => !inside.includes(t));
  if (outsideTile !== undefined) { const a = play(p, [{tile: outsideTile}]); stats.hintSteps += hintRun(p, a, `${label} after a tap outside`); }
  // Every face after one tap: right claims solve; wrong ones are refused
  // with one note, lock Can't until the next tap, and keep the lock through
  // Undo with the note hidden.
  const first = play(p, [{tile: inside.find(f => tiles.includes(f)) ?? tiles[0]}]);
  for (let f = 0; f < F; f++) {
    const a = move(p, first, {cant: f});
    assert.ok(a, `${label}: Can’t on face ${f} after a tap`);
    if (byRays.includes(f)) { assert.ok(isSolved(p, a.board), `${label}: a right claim solves`); continue; }
    assert.deepEqual(a.board.refused, {face: f, shown: true}, `${label}: face ${f} refused`);
    assert.ok(!isSolved(p, a.board));
    assert.ok(mechanicFor(p).render(p, a).includes('That one doesn’t keep it lit.'), `${label}: one short refusal`);
    for (let g = 0; g < F; g++) assert.equal(move(p, a, {cant: g}), null, `${label}: Can’t stays off after a refusal`);
    const back = undoInApp(p, a);
    assert.deepEqual(back.board.refused, {face: f, shown: false}, `${label}: Undo keeps the lock and hides the note`);
    assert.ok(!mechanicFor(p).render(p, back).includes('That one doesn’t keep it lit.'), `${label}: Undo changes what is on screen`);
    for (let g = 0; g < F; g++) assert.equal(move(p, back, {cant: g}), null, `${label}: no claim after Undo either`);
    const back2 = undoInApp(p, back);
    assert.ok(back2.board.refused && back2.board.taps.length === 0, `${label}: Undo past the tap still keeps the lock`);
    stats.hintSteps += hintRun(p, back2, `${label} after a refusal and Undo`);
    const reopened = move(p, a, {tile: tiles[0]});
    assert.equal(reopened.board.refused, null, `${label}: a tap reopens Can’t`);
    stats.refusals++;
  }
  // Illegal taps.
  for (let t = 0; t < M.T; t++) if (!tiles.includes(t)) assert.equal(move(p, fresh, {tile: t}), null, `${label}: an empty triangle can’t be tapped`);
  for (const action of [{tile: -1}, {tile: M.T}, {tile: '0'}, {tile: 0.5}, {cant: F}, {cant: -1}, {tile: tiles[0], cant: 0}, {edge: 0}, {}, null, 3, 'tile'])
    { assert.equal(move(p, first, action), null, `${label}: rejects ${JSON.stringify(action)}`); stats.illegal++; }
  // Forged saves, among them a forged solve: a claim on a possible board,
  // a claim with no tap, a wrong face claimed right.
  const wrongFace = range(F).find(f => !byRays.includes(f));
  const forged = [
    {taps: [], cant: null}, {taps: [], cant: null, refused: null, done: true}, {taps: 'x', cant: null, refused: null}, {taps: [M.T], cant: null, refused: null},
    {taps: [tiles[0]], cant: wrongFace, refused: null}, {taps: [], cant: byRays[0] ?? wrongFace, refused: null},
    {taps: [tiles[0]], cant: null, refused: {face: byRays[0] ?? F, shown: true}}, {taps: [], cant: null, refused: {face: wrongFace, shown: true}},
    {taps: [tiles[0]], cant: null, refused: {face: wrongFace}}, {taps: [tiles[0]], cant: byRays[0] ?? wrongFace, refused: {face: wrongFace, shown: false}},
    null, [], 'taps'
  ];
  if (ways.length) forged.push({taps: [...ways[0], tiles[0]], cant: null, refused: null});
  for (let t = 0; t < M.T; t++) if (!tiles.includes(t)) forged.push({taps: [t], cant: null, refused: null});
  for (const f of forged) { assert.equal(validBoard(p, f), false, `${label}: rejects the forged save ${JSON.stringify(f)}`); assert.equal(isSolved(p, f), false); stats.forgeries++; }
}

/* ------------------------------------------------------------------ *
 * Schedules: a separate simulator with the span test.
 * ------------------------------------------------------------------ */
function simulate(M, q, steps) {
  const present = new Set(q.start.map(([a, b]) => M.index.get(key2(a, b)))), filled = [];
  let saved = null, out = 0;
  for (const st of steps) {
    if (out || filled.length >= q.target) return null;
    if ('edge' in st) {
      if (present.has(st.edge)) return null;
      if (!saved) {
        // A path between the ends along wires in, by depth-first search.
        const [a, b] = M.ends[st.edge], seen = new Map([[a, null]]), stack = [a];
        while (stack.length) { const x = stack.pop(); for (const e of present) { const [u, v] = M.ends[e]; const y = u === x ? v : v === x ? u : -1; if (y >= 0 && !seen.has(y)) { seen.set(y, e); stack.push(y); } } }
        if (seen.has(b)) { let m = one << BigInt(st.edge); for (let x = b; x !== a;) { const e = seen.get(x); m ^= one << BigInt(e); x = M.ends[e][0] === x ? M.ends[e][1] : M.ends[e][0]; } saved = m; }
      }
      present.add(st.edge);
    } else {
      const t = st.tile;
      if (filled.includes(t) || !bitsOf(M, M.tileMask[t]).every(e => present.has(e))) return null;
      filled.push(t);
      if (saved && inSpan(filled.map(f => M.tileMask[f]), saved)) out = filled.length;
    }
  }
  return {present, filled, saved, out};
}
// From the loop saved by a first wire: can it go out with tile k? Some k
// tiles span it, and one of them is needed.
function canFinish(M, loop, k) {
  let ok = false;
  const choose = (from, chosen) => {
    if (ok) return;
    if (chosen.length === k) { const v = chosen.map(t => M.tileMask[t]); if (inSpan(v, loop) && chosen.some((_, i) => !inSpan(v.filter((__, j) => j !== i), loop))) ok = true; return; }
    for (let t = from; t < M.T; t++) choose(t + 1, [...chosen, t]);
  };
  choose(0, []);
  return ok;
}
function checkSchedule(p, stats) {
  const q = p.parameters, M = model(q.mesh), label = p.id, k = q.target;
  const start = new Set(q.start.map(([a, b]) => M.index.get(key2(a, b))));
  assert.equal(start.size, M.V - 1, `${label}: the start wires join every dot with no loop`);
  const places = range(M.E).filter(e => !start.has(e));
  // For every first wire: the separate verdict and the module's hint agree.
  const fresh = freshAttempt(p);
  let winners = 0;
  for (const e of places) {
    const s = simulate(M, q, [{edge: e}]);
    assert.ok(s && s.saved, `${label}: every first wire closes a loop`);
    const can = canFinish(M, s.saved, k), a = move(p, fresh, {edge: e});
    assert.equal(nextHint(p, a).type === 'move', can, `${label}: after first wire ${e}, the hint ${can ? 'leads on' : 'says Undo'}`);
    if (can) { winners++; stats.hintSteps += hintRun(p, a, `${label} after first wire ${e}`); }
    else {
      const h = nextHint(p, a);
      assert.equal(h.text, '', `${label}: a doomed first wire shows nothing under the board yet`);
      stats.hintSteps += hintRun(p, undoToSolvable(p, a), `${label} after Undo from first wire ${e}`);
    }
  }
  stats.firstWires.push(`${label} ${winners}/${places.length}`);
  // The witness, on the separate simulator.
  const w = simulate(M, q, p.solution.steps);
  assert.ok(w && w.out === k, `${label}: the witness goes out with tile ${k}`);
  stats.hintSteps += hintRun(p, fresh, label);
  // Every legal play on a small board, and the module agrees on each end;
  // on a big one, random plays.
  if (M.E <= 9) {
    let plays = 0, wins = 0, chance = 0;
    const explore = (steps, prob) => {
      const s = simulate(M, q, steps), a = play(p, steps);
      assert.equal(isSolved(p, a.board), s.out === k, `${label}: solved exactly when the separate simulator says so`);
      if (s.out || s.filled.length >= k) { plays++; if (s.out === k) { wins++; chance += prob; } return; }
      const next = [...range(M.E).filter(e => !s.present.has(e)).map(edge => ({edge})), ...range(M.T).filter(t => !s.filled.includes(t) && bitsOf(M, M.tileMask[t]).every(e => s.present.has(e))).map(tile => ({tile}))];
      for (const st of next) explore([...steps, st], prob / next.length);
    };
    explore([], 1);
    stats.schedulePlays.push(`${label}: ${wins} of ${plays} complete plays win; random taps win ${(chance * 100).toFixed(1)}%`);
  } else {
    let wins = 0;
    for (let run = 0; run < 400; run++) {
      const steps = [];
      for (;;) {
        const s = simulate(M, q, steps);
        if (s.out || s.filled.length >= k) { if (s.out === k) wins++; break; }
        steps.push(pick([...range(M.E).filter(e => !s.present.has(e)).map(edge => ({edge})), ...range(M.T).filter(t => !s.filled.includes(t) && bitsOf(M, M.tileMask[t]).every(e => s.present.has(e))).map(tile => ({tile}))]));
      }
      if (run < 60) assert.equal(isSolved(p, play(p, steps).board), simulate(M, q, steps).out === k, `${label}: the module agrees on a random play`);
    }
    stats.schedulePlays.push(`${label}: random taps win ${(wins / 4).toFixed(1)}% of 400 plays`);
  }
  // Wrong orders the board shows: the loop out too soon (its own tiles
  // first), or still lit at the marked tile (a loop round the hole, or too
  // big); Undo finds a way on.
  const loopTiles = e => insideByRays(M, simulate(M, q, [{edge: e}]).saved);
  const everyWire = e => [{edge: e}, ...places.filter(f => f !== e).map(edge => ({edge}))];
  const small = places.find(e => { const ins = loopTiles(e); return ins.every(f => f < M.T) && ins.length < k; });
  assert.ok(small !== undefined, `${label}: a first wire whose loop needs fewer than ${k} tiles`);
  const soon = play(p, [...everyWire(small), ...loopTiles(small).map(tile => ({tile}))]);
  assert.deepEqual(nextHint(p, soon), {type: 'deadend', text: 'It went out too soon. Undo.'}, `${label}: out too soon`);
  stats.hintSteps += hintRun(p, undoToSolvable(p, soon), `${label} after out too soon`);
  const big = places.find(e => !canFinish(M, simulate(M, q, [{edge: e}]).saved, k));
  const lit = play(p, [...everyWire(big), ...range(M.T).filter(t => !loopTiles(big).includes(t)).concat(loopTiles(big).filter(f => f < M.T)).slice(0, k).map(tile => ({tile}))]);
  assert.deepEqual(nextHint(p, lit), {type: 'deadend', text: 'It is still lit. Undo.'}, `${label}: still lit at the marked tile`);
  stats.hintSteps += hintRun(p, undoToSolvable(p, lit), `${label} after still lit`);
  // Illegal steps.
  for (const action of [{tile: 0}, {edge: [...start][0]}, {edge: M.E}, {edge: -1}, {tile: M.T}, {edge: places[0], tile: 0}, {cant: 0}, {}, null, 'edge'])
    { assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`); stats.illegal++; }
  const done = play(p, p.solution.steps);
  for (const e of range(M.E)) assert.equal(move(p, done, {edge: e}), null, `${label}: nothing after the goal`);
  // Forged saves.
  const forged = [{steps: [{tile: 0}]}, {steps: [{edge: [...start][0]}]}, {steps: [...p.solution.steps, {edge: places.find(e => !p.solution.steps.some(s => s.edge === e)) ?? 0}]}, {steps: [{edge: places[0], tile: 0}]}, {steps: 'x'}, {steps: []  , done: true}, {steps: [{edge: places[0]}, {edge: places[0]}]}, null, [], {}];
  for (const f of forged) { assert.equal(validBoard(p, f), false, `${label}: rejects the forged save ${JSON.stringify(f)}`); stats.forgeries++; }
}

/* ------------------------------------------------------------------ *
 * Races.
 * ------------------------------------------------------------------ */
function checkRace(p, stats) {
  const q = p.parameters, M = model(q.mesh), label = p.id, Y = maskOfPairs(M, q.yellow), P = maskOfPairs(M, q.pink);
  const all = range(M.T);
  // Some set of tiles kills yellow and not pink; and the sets that outline
  // each loop.
  let winnable = false;
  const outlineY = [], outlineP = [];
  everySubset(M, all, (mask, members) => {
    if (mask === Y) outlineY.push(members);
    if (mask === P) outlineP.push(members);
  });
  // Spans by elimination on a sample of sets, all of them on a small board.
  const sets = M.T <= 8 ? range(1 << M.T).map(s => all.filter(t => s >> t & 1)) : range(3000).map(() => all.filter(() => random() < .5)).concat([outlineY[0], all.filter(t => !outlineP[0].includes(t))]);
  for (const S of sets) { const v = S.map(t => M.tileMask[t]); if (inSpan(v, Y) && !inSpan(v, P)) winnable = true; }
  assert.equal(outlineY.length, 1, `${label}: one set of tiles outlines the yellow loop`);
  assert.equal(outlineP.length, 1, `${label}: one set of tiles outlines the pink loop`);
  const ys = outlineY[0], ps = outlineP[0], pinkOnly = ps.filter(t => !ys.includes(t));
  assert.equal(winnable, pinkOnly.length > 0, `${label}: the yellow loop can go out first exactly when the pink loop needs a tile it doesn't`);
  assert.equal(canRace(p), winnable, `${label}: the module agrees`);
  assert.ok(same(p.solution.pinkTiles, ps), `${label}: the pink loop's tiles`);
  assert.ok(same(insideByRays(M, P), ps) && same(insideByRays(M, Y), ys), `${label}: inside by rays`);
  // Every fill order on the wheel; the witness on the separate simulator.
  const replay = fills => { let y = 0, k = 0; fills.forEach((t, i) => { const v = fills.slice(0, i + 1).map(f => M.tileMask[f]); if (!y && inSpan(v, Y)) y = i + 1; if (!k && inSpan(v, P)) k = i + 1; }); return {y, k}; };
  if (M.T <= 6) {
    let orders = 0, wins = 0;
    const perm = (left, done) => { if (!left.length) { orders++; const r = replay(done); if (r.y && (!r.k || r.y < r.k)) wins++; return; } left.forEach((t, i) => perm(left.filter((_, j) => j !== i), [...done, t])); };
    perm(all, []);
    stats.raceOrders.push(`${label}: yellow strictly first in ${wins} of ${orders} fill orders`);
    assert.equal(wins > 0, winnable);
  }
  const s = p.solution;
  if (s.cant) assert.ok(!winnable && same(s.cant, ps) && ps.every(t => ys.includes(t)) && s.fills.length > 0, `${label}: the claim is the pink loop's tiles, all inside the yellow loop`);
  else { const r = replay(s.fills); assert.ok(r.y && !r.k, `${label}: the witness puts the yellow loop out while the pink one is lit`); }
  if (!winnable) stats.certificateOdds.push(`${label} 1/${2 ** M.T - 1}`);

  const fresh = freshAttempt(p);
  assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board));
  assert.ok('tile' in nextHint(p, fresh).action, `${label}: the first live hint is a fill`);
  stats.hintSteps += hintRun(p, fresh, label);
  assert.equal(move(p, fresh, {cant: ps}), null, `${label}: Can’t needs a fill first`);
  const first = play(p, [{tile: ys.find(t => !ps.includes(t)) ?? ys[0]}]);
  // Claims: the pink loop's tiles solve a Can't board and get "There is a
  // way." on the other; other sets get one note about the tiles tapped.
  const tries = [ps, ys, [ps[0]], ps.slice(1), all, [all.find(t => !ps.includes(t)) ?? 0]].filter(x => x.length).map(sorted);
  for (const tiles of tries) {
    const a = move(p, first, {cant: tiles});
    assert.ok(a, `${label}: a claim after a fill`);
    if (!winnable && same(tiles, ps)) { assert.ok(isSolved(p, a.board), `${label}: the right claim solves`); continue; }
    assert.ok(!isSolved(p, a.board));
    const note = same(tiles, ps) ? 'There is a way.' : 'Those tiles don’t fill the pink loop.';
    assert.equal(raceRefusal(p, tiles), note, `${label}: the refusal says what is true of the tiles`);
    assert.ok(mechanicFor(p).render(p, a).includes(note), `${label}: the refusal shows`);
    assert.equal(move(p, a, {cant: ps}), null, `${label}: Can’t stays off after a refusal`);
    const back = undoInApp(p, a);
    assert.equal(back.board.refused?.shown, false, `${label}: Undo keeps the lock and hides the note`);
    assert.ok(!mechanicFor(p).render(p, back).includes(note), `${label}: Undo changes what is on screen`);
    assert.equal(move(p, back, {cant: ps}), null, `${label}: no claim after Undo`);
    stats.hintSteps += hintRun(p, back, `${label} after a refusal`);
    stats.refusals++;
  }
  // A wrong fill on a possible board: the pink loop's own tile first leaves
  // nothing to show yet; the hint offers Undo and hints finish.
  if (winnable) {
    const a = play(p, pinkOnly.map(tile => ({tile})));
    assert.deepEqual(nextHint(p, a), {type: 'deadend', text: ''}, `${label}: doomed, with nothing under the board yet`);
    stats.hintSteps += hintRun(p, undoToSolvable(p, a), `${label} after a wrong fill`);
  }
  // Pink out first: the board shows it, Can't is off until Undo.
  const pinkFirst = play(p, ps.map(tile => ({tile})));
  assert.equal(nextHint(p, pinkFirst).type, 'deadend', `${label}: the pink loop out first says Undo`);
  assert.equal(move(p, pinkFirst, {cant: ps}), null, `${label}: no claim once the pink loop is out`);
  stats.hintSteps += hintRun(p, undoToSolvable(p, pinkFirst), `${label} after the pink loop went out`);
  // Illegal moves and forged saves.
  for (const action of [{tile: M.T}, {tile: -1}, {cant: []}, {cant: [ps[0], ps[0]]}, {cant: [M.T]}, {cant: sorted(ps).reverse().length > 1 ? sorted(ps).reverse() : 'x'}, {edge: 0}, {}, null])
    { assert.equal(move(p, first, action), null, `${label}: rejects ${JSON.stringify(action)}`); stats.illegal++; }
  assert.equal(move(p, first, {tile: first.board.fills[0]}), null, `${label}: a triangle fills once`);
  const forged = [
    {fills: [], cant: ps, refused: null}, {fills: [ys[0]], cant: winnable ? ps : ys, refused: null}, {fills: [M.T], cant: null, refused: null}, {fills: [0, 0], cant: null, refused: null},
    {fills: [], cant: null, refused: {tiles: [0], shown: true}}, {fills: [ys[0]], cant: null, refused: {tiles: winnable ? [M.T] : ps, shown: true}},
    {fills: ps, cant: null, refused: {tiles: [0], shown: false}}, {fills: [...ps, ...all.filter(t => !ps.includes(t))], cant: null, refused: null},
    {fills: [], cant: null}, {fills: [], cant: null, refused: null, done: true}, null, 'fills', []
  ];
  for (const f of forged) { assert.equal(validBoard(p, f), false, `${label}: rejects the forged save ${JSON.stringify(f)}`); stats.forgeries++; }
}

export default async function validateHoles() {
  const own = JSON.parse(await readFile(new URL('../dist/families/holes/holes.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  const {puzzles} = own;
  assert.equal(puzzles.length, 12);
  assert.deepEqual(puzzles.map(p => p.number), range(12).map(i => i + 1));
  for (const level of ['easy', 'medium', 'hard']) assert.equal(puzzles.filter(p => p.difficulty_level === level).length, 4, `four ${level} puzzles`);
  for (const s of own.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(own.families.length, 1);
  assert.equal(own.families[0].id, 'holes');
  assert.ok(own.families[0].sourceIds.every(id => ids.has(id)));
  assert.ok(pack.puzzles.some(p => p.mechanic === 'toggle' && p.familyTitle === 'Lantern Wires'), 'Lantern Wires is in the base pack');
  const stats = {hintSteps: 0, refusals: 0, illegal: 0, forgeries: 0, certificateOdds: [], firstWires: [], schedulePlays: [], raceOrders: []};
  for (const p of puzzles) {
    const label = p.id;
    assert.equal(p.id, `holes-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'holes'); assert.equal(p.band, 'all'); assert.equal(p.group, 'Holes');
    assert.equal(p.libraryFamily, 'toggle'); assert.equal(p.familyTitle, 'Lantern Wires');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.ok(p.visibleObjective.split(/[.!?]\s/).length === 1 && p.visibleObjective.length <= 60, `${label}: one short line`);
    assert.match(p.controls, /^The sides of the triangles are wires/, `${label}: How to play opens with the mathematics`);
    assert.ok(p.rules.length >= 3, `${label}: rules`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    assert.doesNotMatch(p.hints[0], /Can’t/, `${label}: the first hint never says Can’t`);
    assert.doesNotMatch(p.title, /can’t|hole|empty|gap/i, `${label}: the title doesn’t give the answer`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.includes('holes-week77') && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.match(p.provenance, /^(Week 77|New for the app)/, `${label}: provenance names the worksheet problem or says New`);
    assert.ok(isExpansion(p));
    const html = mechanicFor(p).render(p, freshAttempt(p));
    assert.ok(html.includes('data-mechanic-wire="holes"') && html.includes('data-tg-board'), `${label}: renders its board`);
    ({cancel: checkCancel, schedule: checkSchedule, race: checkRace})[p.parameters.kind](p, stats);
  }
  // Puzzle data that is not a clean board is refused outright.
  const base = puzzles[0];
  for (const parameters of [{...base.parameters, lit: [[0, 1]]}, {...base.parameters, filled: [1, 0]}, {...base.parameters, kind: 'other'}, {...base.parameters, extra: 1}, {...base.parameters, mesh: {...base.parameters.mesh, cells: [[0, 1, 2], [0, 1, 3], [0, 1, 2]]}}])
    assert.equal(validBoard({...base, parameters}, {taps: [], cant: null, refused: null}), false, 'malformed puzzle data');
  // On the ring, with its hole, random sets of faces.
  const ringMesh = puzzles.find(p => p.parameters.mesh.cells.length === 18).parameters.mesh, R = model(ringMesh);
  for (let i = 0; i < 1500; i++) {
    const faces = range(R.faceMask.length).filter(() => random() < .4), lit = sumOf(R, faces);
    if (!lit) continue;
    assert.ok(same(insideByRays(R, lit), faces), 'ring: the faces inside a loop, by rays, are the faces it outlines');
    assert.equal(inSpan(R.tileMask, lit), faces.every(f => f < R.T), 'ring: a sum of tile outlines exactly when no hole is inside');
  }
  const loops = theorems([puzzles.find(p => p.parameters.mesh.cells.length === 2).parameters.mesh, puzzles.find(p => p.parameters.mesh.cells.length === 4).parameters.mesh, puzzles.find(p => p.parameters.mesh.cells.length === 6 && p.parameters.kind === 'race').parameters.mesh]);
  return {puzzles: puzzles.length, loopsChecked: loops, ...stats};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateHoles(), null, 2));
