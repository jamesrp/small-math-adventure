// Checks the Ways out pack (dist/families/ends/ends.json): content fields and
// sources; every count recomputed by a method unlike the mechanic's (union-find
// on a large window, a piece being forever when it touches the window's edge
// where the map runs on, instead of searching a box round the blocks; on the
// tree, union-find on a ball, forever when a piece reaches its rim, with the
// count 2m + 1 − (roads between blocks) for all pieces); every placement of
// blocks behind each table entry; the maps' numbers of ends and the box
// certificates; the tree's bound 2m + 1 for every placement of up to four
// blocks within three roads of the centre; witnesses played as moves; hint
// chains from fresh, after wrong blocks, wrong Checks, wrong Can'ts and the
// pitfalls named in the guide; illegal moves; forged saves; the playground.
// Can't answers only after a Check with a block.
// Run: node scripts/validate-ends.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {counts as mechanicCounts, outsidePieces, boxOf, piecesOf} from '../dist/families/ends/ends.js';
import {loadPack} from './packs.mjs';

// --- Flat maps, recounted ---------------------------------------------------------
// A dot is on a band when each coordinate is within the band's range (null: no end).
const on = (m, x, y) => m.bands.some(b => (b.x[0] === null || x >= b.x[0]) && (b.x[1] === null || x <= b.x[1]) && (b.y[0] === null || y >= b.y[0]) && (b.y[1] === null || y <= b.y[1]));
const parse = d => { const match = /^(-?\d+),(-?\d+)$/.exec(d); return match ? [Number(match[1]), Number(match[2])] : null; };
const key = (x, y) => `${x},${y}`;
// The part of the map near the middle that every window must hold: where the
// T's three ladders meet; the start everywhere.
const CORE = {tee: [[-1, -1], [2, 3]]};
// A window of the map: its dots, roads, and the dots on its edge with a road
// leaving it (the map goes on past them).
function windowOf(m, rect) {
  const [[x0, y0], [x1, y1]] = rect, dots = [], index = new Map();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (on(m, x, y)) { index.set(key(x, y), dots.length); dots.push([x, y]); }
  const roads = [], rim = new Uint8Array(dots.length);
  dots.forEach(([x, y], i) => {
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const n = index.get(key(x + dx, y + dy));
      if (n !== undefined) { if (n > i) roads.push([i, n]); } else if (on(m, x + dx, y + dy)) rim[i] = 1;
    }
  });
  return {dots, index, roads, rim};
}
function unionFind(n) {
  const up = new Int32Array(n).map((_, i) => i);
  const find = i => { while (up[i] !== i) { up[i] = up[up[i]]; i = up[i]; } return i; };
  return {find, join: (i, j) => { const a = find(i), b = find(j); if (a !== b) up[a] = b; }};
}
// Forever and trapped pieces among the window's open dots.
function windowCounts(W, blocked) {
  const {find, join} = unionFind(W.dots.length);
  for (const [i, j] of W.roads) if (!blocked[i] && !blocked[j]) join(i, j);
  const roots = new Set(), forever = new Set();
  for (let i = 0; i < W.dots.length; i++) if (!blocked[i]) { roots.add(find(i)); if (W.rim[i]) forever.add(find(i)); }
  return {forever: forever.size, trapped: roots.size - forever.size};
}
// A window round the blocks, the start and the map's middle, with `margin` dots
// to spare; big enough that past its edge the map is only open tails.
function rectFor(m, blocks, margin) {
  const pts = [...blocks.map(parse), m.start, ...(CORE[m.id] || [])];
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [[Math.min(...xs) - margin, Math.min(...ys) - margin], [Math.max(...xs) + margin, Math.max(...ys) + margin]];
}
function flatCounts(m, blocks, margin = 4) {
  const W = windowOf(m, rectFor(m, blocks, margin)), blocked = new Uint8Array(W.dots.length);
  for (const d of blocks) blocked[W.index.get(d)] = 1;
  return windowCounts(W, blocked);
}
// Every placement of up to `most` blocks among `dots`, with its counts, on one window.
function* placements(m, dots, most, margin = 4) {
  const W = windowOf(m, rectFor(m, dots, margin)), at = dots.map(d => W.index.get(d)), blocked = new Uint8Array(W.dots.length), chosen = [];
  function* grow(from) {
    yield {blocks: chosen.map(i => dots[i]), counts: windowCounts(W, blocked)};
    if (chosen.length === most) return;
    for (let i = from; i < dots.length; i++) { chosen.push(i); blocked[at[i]] = 1; yield* grow(i + 1); blocked[at[i]] = 0; chosen.pop(); }
  }
  yield* grow(0);
}
const dotsIn = (m, [x0, x1, y0, y1]) => { const out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (on(m, x, y)) out.push(key(x, y)); return out; };
// Ends: the open pieces left when a big box round the middle is blocked, counted
// on windows of growing size so the count is seen to settle.
function endsOf(m) {
  const found = [3, 5, 8].map(r => {
    const box = dotsIn(m, [-r, r + 1, -r, r + 1]);
    return flatCounts(m, box, 4).forever;
  });
  assert.ok(found.every(n => n === found[0]), `${m.id}: ends settle (${found})`);
  return found[0];
}
const meets = (goal, c) => (goal.forever === undefined || c.forever === goal.forever) && (goal.trapped === undefined || c.trapped === goal.trapped);

// --- The tree, recounted ------------------------------------------------------------
// Dots are words in a, b, c with no letter twice in a row; "o" is the centre.
function ball(r) {
  const out = ['o'];
  for (let k = 0; k < out.length; k++) { const d = out[k]; if ((d === 'o' ? 0 : d.length) < r) for (const x of 'abc') if (d === 'o' || d.at(-1) !== x) out.push(d === 'o' ? x : d + x); }
  return out;
}
const depth = d => d === 'o' ? 0 : d.length;
const up = d => d.length === 1 ? 'o' : d.slice(0, -1);
function treeCounts(blocks) {
  const R = Math.max(0, ...blocks.map(depth)) + 2, dots = ball(R), index = new Map(dots.map((d, i) => [d, i])), {find, join} = unionFind(dots.length);
  const blocked = new Set(blocks);
  for (const d of dots) if (d !== 'o' && !blocked.has(d) && !blocked.has(up(d))) join(index.get(d), index.get(up(d)));
  const roots = new Set(), forever = new Set();
  for (const d of dots) if (!blocked.has(d)) { roots.add(find(index.get(d))); if (depth(d) === R) forever.add(find(index.get(d))); }
  return {forever: forever.size, trapped: roots.size - forever.size};
}
const touching = (u, v) => (u !== 'o' && up(u) === v) || (v !== 'o' && up(v) === u);
const roadsBetween = blocks => blocks.reduce((n, u, i) => n + blocks.slice(i + 1).filter(v => touching(u, v)).length, 0);
function* subsetsOf(list, most, from = 0, now = []) {
  yield now;
  if (now.length === most) return;
  for (let i = from; i < list.length; i++) yield* subsetsOf(list, most, i + 1, [...now, list[i]]);
}

// --- The table in docs/ends/README.md ------------------------------------------------
// Flat puzzles: placements meeting the goal in the window, by number of blocks.
const TABLE = {
  'ends-01': {map: 'line', budget: 4, goal: {trapped: 2}, window: [-4, 4, 0, 0], bySize: [0, 0, 0, 35, 60]},
  'ends-02': {map: 'ladder', budget: 2, goal: {forever: 2}, window: [-3, 3, 0, 1], bySize: [0, 0, 19]},
  'ends-03': {map: 'grid', budget: 4, goal: {trapped: 1}, window: [-2, 2, -2, 2], bySize: [0, 0, 0, 0, 9]},
  'ends-04': {map: 'line', budget: 4, goal: {forever: 3}, impossible: 2},
  'ends-05': {map: 'tree', budget: 3, goal: {forever: 7}},
  'ends-06': {map: 'ladder', budget: 4, goal: {forever: 3}, impossible: 2},
  'ends-07': {map: 'ladder', budget: 3, goal: {forever: 2, trapped: 1}, window: [-3, 3, 0, 1], bySize: [0, 0, 0, 10]},
  'ends-08': {map: 'tee', budget: 3, goal: {forever: 3}, window: [-3, 4, 0, 4], bySize: [0, 0, 0, 12]},
  'ends-09': {map: 'strip', budget: 4, goal: {forever: 2, trapped: 1}, window: [-3, 3, 0, 2], bySize: [0, 0, 0, 0, 35]},
  'ends-10': {map: 'grid', budget: 10, goal: {forever: 2}, impossible: 1},
  'ends-11': {map: 'grid', budget: 6, goal: {trapped: 2}, window: [-2, 2, -2, 2], bySize: [0, 0, 0, 0, 0, 0, 8]},
  'ends-12': {map: 'tree', budget: 4, goal: {forever: 9}}
};
const ENDS = {line: 2, ladder: 2, strip: 2, grid: 1, tee: 3};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const blockAll = (p, a, dots) => dots.reduce((b, dot) => play(p, b, {type: 'block', dot}), a);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 80; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: hint words`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// A deterministic shuffle source.
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

export async function validateEnds() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/ends/ends.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-68')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-68.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'ends');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  assert.equal(new Set(puzzles.map(p => JSON.stringify(p.parameters))).size, puzzles.length, 'distinct starting data');
  const maps = pack.puzzles.find(p => p.band === 'playground').parameters.maps;
  for (const [id, m] of Object.entries(maps)) m.id = id;

  // The maps' ends, by blocking a big box and counting what is left on bigger windows.
  for (const [id, n] of Object.entries(ENDS)) assert.equal(endsOf(maps[id]), n, `${id}: ${n} ends`);
  const report = {endsPuzzles: puzzles.length, placementsChecked: 0, mechanicAgreements: 0, hintSteps: 0};
  const idOf = m => m.kind === 'tree' ? 'tree' : Object.keys(maps).find(id => JSON.stringify(maps[id].bands) === JSON.stringify(m.bands));

  // The certificates. On the line, ladder, strip and T, removing a box round the
  // blocks (and the junction) leaves only the tails; on the grid the ring road
  // round any box is on the map and joins everything outside it. Checked for
  // boxes of every size up to 6 × 6 at several places.
  // The mechanic's certificate (the pieces outside its box round the blocks)
  // must count the same for every set of blocks.
  for (const id of ['line', 'ladder', 'strip', 'tee', 'grid']) {
    const m = maps[id];
    for (let w = 0; w <= 5; w++) for (let h = 0; h <= 5; h++) for (const [ox, oy] of [[-3, -2], [0, 0], [2, 1], [-1, 3]]) {
      // A box across every row of a strip; round the junction on the T.
      const rect = id === 'grid' ? [ox, ox + w, oy, oy + h] : id === 'tee' ? [Math.min(ox, -1), Math.max(ox + w, 2), Math.min(oy, -1), Math.max(oy + h, 3)] : [ox, ox + w, -1, 3];
      const box = dotsIn(m, rect);
      assert.equal(flatCounts(m, box).forever, ENDS[id], `${id}: outside a box there are ${ENDS[id]} pieces`);
      const corners = [key(ox, oy), key(ox + w, oy + h)].filter(d => on(m, ...parse(d)));
      if (corners.length) assert.equal(outsidePieces(m, boxOf(m, corners)).pieces.length, ENDS[id], `${id}: the mechanic's box certificate`);
      report.mechanicAgreements++;
    }
  }

  // The pieces the mechanic draws far from the blocks (it searches only the box
  // and a ring round it, and joins a far dot to the tail it lies on) are the
  // pieces union-find finds on one window holding the blocks and the far dots.
  {
    const random = seeded(4192);
    for (const id of ['line', 'ladder', 'strip', 'grid', 'tee']) for (let t = 0; t < 25; t++) {
      const m = maps[id], pool = dotsIn(m, [-3, 3, -3, 4]);
      const blocks = [...new Set([...Array(1 + Math.floor(random() * 6))].map(() => pool[Math.floor(random() * pool.length)]))];
      const far = {x: [6 + t % 5, 14 + t % 5], y: id === 'grid' ? [-6, 6] : id === 'tee' ? [0, 12] : [0, 2]};
      if (id === 'tee' && t % 2) far.x = [-1, 2];
      const {pieceOf} = piecesOf(m, blocks, far);
      const W = windowOf(m, [[-6, -8], [22, 16]]), {find, join} = unionFind(W.dots.length), skip = new Set(blocks);
      for (const [i, j] of W.roads) if (!skip.has(key(...W.dots[i])) && !skip.has(key(...W.dots[j]))) join(i, j);
      const toRoot = new Map(), toPiece = new Map();
      for (const [d, piece] of pieceOf) {
        const r = find(W.index.get(d));
        assert.equal(toRoot.get(piece) ?? r, r, `${id}: one drawn piece is one piece (${blocks.join(' ')}, ${d})`);
        assert.equal(toPiece.get(r) ?? piece, piece, `${id}: one piece is drawn as one (${blocks.join(' ')}, ${d})`);
        toRoot.set(piece, r); toPiece.set(r, piece);
      }
      for (let y = far.y[0]; y <= far.y[1]; y++) for (let x = far.x[0]; x <= far.x[1]; x++) if (on(m, x, y) && !skip.has(key(x, y))) assert.ok(pieceOf.has(key(x, y)), `${id}: every drawn dot has a piece`);
      report.mechanicAgreements++;
    }
  }

  // Every placement behind the table, recounted, with the mechanic checked against it.
  for (const p of puzzles) {
    const row = TABLE[p.id], q = p.parameters;
    assert.equal(q.mode, 'goal');
    assert.equal(q.budget, row.budget, `${p.id}: budget`);
    assert.deepEqual(q.goal, row.goal, `${p.id}: goal`);
    assert.equal(idOf(q.map), row.map, `${p.id}: map`);
    assert.deepEqual({...q.map, id: row.map}, maps[row.map], `${p.id}: the playground has the same map`);
    if (!row.window) continue;
    const m = {...q.map, id: row.map}, bySize = Array(row.budget + 1).fill(0);
    let k = 0;
    for (const {blocks, counts} of placements(m, dotsIn(m, row.window), row.budget)) {
      report.placementsChecked++;
      if (meets(row.goal, counts)) bySize[blocks.length]++;
      if (k++ % 23 === 0) { assert.deepEqual(mechanicCounts(q.map, blocks), counts, `${p.id}: the mechanic agrees on ${blocks.join(' ')}`); report.mechanicAgreements++; }
    }
    assert.deepEqual(bySize, row.bySize, `${p.id}: placements in the window by number of blocks`);
    assert.deepEqual(p.solution.inWindow, row.bySize, `${p.id}: the pack's count`);
  }

  // Claims in the guide that the table's windows don't already show.
  const ladder = {...maps.ladder}, strip = {...maps.strip}, grid = {...maps.grid}, tee = {...maps.tee}, line = {...maps.line};
  {
    // Ladder: 25 pairs split it in nine columns, 16 of them slanting; one block never does.
    const splits = [...placements(ladder, dotsIn(ladder, [-4, 4, 0, 1]), 2)].filter(r => r.counts.forever === 2);
    assert.ok(splits.every(r => r.blocks.length === 2), 'ladder: one block never splits it');
    assert.equal(splits.length, 25, 'ladder: 25 splitting pairs in nine columns');
    assert.equal(splits.filter(r => { const [a, b] = r.blocks.map(parse); return a[0] !== b[0]; }).length, 16, 'ladder: 16 of them slant');
    assert.ok(splits.every(r => { const [a, b] = r.blocks.map(parse); return a[1] !== b[1] && Math.abs(a[0] - b[0]) <= 1; }), 'ladder: a rung or a slanting pair');
    // Two blocks never trap anything. Three trap only one dot, by blocking its two
    // rail neighbours and its rung partner, which also splits the ladder (ends-07).
    for (const r of placements(ladder, dotsIn(ladder, [-3, 3, 0, 1]), 3)) {
      if (r.blocks.length <= 2) assert.equal(r.counts.trapped, 0, 'ladder: two blocks trap nothing');
      if (!r.counts.trapped) continue;
      const set = new Set(r.blocks);
      assert.ok([...Array(7)].some((_, i) => [0, 1].some(y => [key(i - 4, y), key(i - 2, y), key(i - 3, 1 - y)].every(d => set.has(d)))), `ladder: ${r.blocks.join(' ')} surrounds one dot`);
      assert.deepEqual(r.counts, {forever: 2, trapped: 1}, 'ladder: and splits it');
    }
    assert.deepEqual(flatCounts(ladder, ['0,0', '2,0', '0,1', '2,1']), {forever: 2, trapped: 1}, 'ladder: two rungs make three pieces, the middle one trapped');
    assert.deepEqual(flatCounts(ladder, ['-1,0', '1,0', '0,1', '2,1']), {forever: 2, trapped: 2}, 'ladder: a zigzag of four traps two dots');
    assert.equal(Math.max(...[...placements(line, dotsIn(line, [-4, 4, 0, 0]), 4)].map(r => r.counts.trapped)), 3, 'line: four blocks trap at most three');
    assert.equal(endsOf({id: 'half', kind: 'flat', bands: [{x: [null, null], y: [null, 0]}], start: [0, 0]}), 1, 'a half-plane has one end');
    // Strip of three rows: three blocks are the fewest that split it.
    for (const r of placements(strip, dotsIn(strip, [-3, 3, 0, 2]), 3)) {
      if (r.blocks.length < 3) assert.ok(r.counts.forever < 2, 'strip: two blocks never split it');
      if (r.blocks.length < 4) assert.ok(!(r.counts.forever === 2 && r.counts.trapped === 1), 'strip: three blocks can’t split and trap');
      if (r.counts.forever === 2 && r.blocks.length === 3) {
        const pts = r.blocks.map(parse).sort((u, v) => u[1] - v[1]);
        assert.deepEqual(pts.map(p => p[1]), [0, 1, 2], 'strip: one block in each row');
        assert.ok(Math.abs(pts[0][0] - pts[1][0]) <= 1 && Math.abs(pts[1][0] - pts[2][0]) <= 1, 'strip: the wall steps at most one column');
      }
    }
    // Grid: three blocks trap nothing; five never trap two; two dots side by side need seven.
    for (const r of placements(grid, dotsIn(grid, [-2, 2, -2, 2]), 5)) {
      if (r.blocks.length <= 3) assert.equal(r.counts.trapped, 0, 'grid: three blocks trap nothing');
      assert.ok(r.counts.trapped < 2, 'grid: five blocks never trap two pieces');
      assert.equal(r.counts.forever, 1, 'grid: one forever piece');
      report.placementsChecked++;
    }
    const around = (...dots) => [...new Set(dots.flatMap(d => { const [x, y] = parse(d); return [key(x + 1, y), key(x - 1, y), key(x, y + 1), key(x, y - 1)]; }))].filter(d => !dots.includes(d));
    assert.equal(around('0,0', '2,0').length, 7, 'grid: two dots with one between share a neighbour');
    assert.deepEqual(flatCounts(grid, around('0,0', '2,0')), {forever: 1, trapped: 2}, 'grid: seven blocks trap them');
    assert.deepEqual(flatCounts(grid, around('0,0', '1,1', '2,2')), {forever: 1, trapped: 3}, 'grid: eight blocks trap three dots in a diagonal row');
    assert.equal(around('0,0', '1,1', '2,2').length, 8);
    const pairFence = ['0,-1', '1,-1', '-1,0', '2,0', '0,1', '1,1'];
    assert.deepEqual(flatCounts(grid, pairFence), {forever: 1, trapped: 1}, 'grid: six blocks trap two dots side by side as one piece');
    assert.deepEqual(flatCounts(grid, ['0,-1', '-1,0', '1,0', '2,1', '1,2', '0,1']), {forever: 1, trapped: 2}, 'grid: six blocks trap two dots corner to corner');
    // The T: never more than three forever pieces with up to four blocks near the junction; two blocks never three.
    for (const r of placements(tee, dotsIn(tee, [-3, 4, 0, 4]), 4)) { assert.ok(r.counts.forever <= 3, 'tee: at most three'); if (r.blocks.length < 3) assert.ok(r.counts.forever < 3, 'tee: two blocks never make three'); report.placementsChecked++; }
    // ...and in a wider window the twelve three-block answers are the same twelve, all at the junction.
    const wide = [...placements(tee, dotsIn(tee, [-5, 6, 0, 6]), 3)].filter(r => r.counts.forever === 3);
    assert.equal(wide.length, 12, 'tee: twelve answers in a wide window');
    assert.ok(wide.every(r => r.blocks.every(d => { const [x, y] = parse(d); return x >= -2 && x <= 3 && y <= 3; })), 'tee: all at the junction');
    // Line and ladder: never three forever pieces with up to four blocks.
    for (const [m, w] of [[line, [-6, 6, 0, 0]], [ladder, [-4, 4, 0, 1]], [strip, [-2, 2, 0, 2]]]) for (const r of placements(m, dotsIn(m, w), 4)) { assert.ok(r.counts.forever <= 2, `${m.id}: at most two`); report.placementsChecked++; }
    // Grid: walls and scattered blocks of every kind leave one forever piece.
    const random = seeded(68);
    const walls = [[...Array(10)].map((_, i) => key(i - 5, 0)), [...Array(10)].map((_, i) => key(0, i - 5)), [...Array(10)].map((_, i) => key(i - 5, i - 5)), [...Array(10)].map((_, i) => key(i - 5, i % 2))];
    for (let t = 0; t < 300; t++) walls.push([...new Set([...Array(1 + Math.floor(random() * 10))].map(() => key(Math.floor(random() * 9) - 4, Math.floor(random() * 9) - 4)))]);
    for (const w of walls) { assert.equal(flatCounts(grid, w).forever, 1, 'grid: one forever piece'); assert.equal(flatCounts(grid, w, 8).forever, 1, 'grid: on a wider window too'); assert.deepEqual(mechanicCounts(maps.grid, w), flatCounts(grid, w)); report.mechanicAgreements++; }
  }

  // The tree: every placement of up to four blocks within three roads of the
  // centre. All pieces number 2m + 1 − (roads between blocks); forever pieces
  // at most 2m + 1, and exactly that when no two blocks touch and nothing is trapped.
  {
    const best = [0, 0, 0, 0, 0];
    for (const blocks of subsetsOf(ball(3), 4)) {
      if (!blocks.length) continue;
      const c = treeCounts(blocks), m = blocks.length;
      assert.equal(c.forever + c.trapped, 2 * m + 1 - roadsBetween(blocks), `tree: ${blocks.join(' ')} pieces`);
      assert.equal(c.forever === 2 * m + 1, roadsBetween(blocks) === 0 && c.trapped === 0, `tree: ${blocks.join(' ')} reaches 2m + 1 only spread out`);
      best[m] = Math.max(best[m], c.forever);
      assert.deepEqual(mechanicCounts(maps.tree, blocks), c, `tree: the mechanic agrees on ${blocks.join(' ')}`);
      report.placementsChecked++; report.mechanicAgreements++;
    }
    assert.deepEqual(best, [0, 3, 5, 7, 9], 'tree: m blocks make at most 2m + 1');
    assert.deepEqual(treeCounts(['a', 'b', 'c']), {forever: 6, trapped: 1}, 'tree: three round the centre trap it');
    assert.deepEqual(treeCounts(['b', 'c', 'ab', 'ac']), {forever: 8, trapped: 1}, 'tree: four round a road trap two dots, so 8 and not 9');
    assert.deepEqual(treeCounts(['o', 'a', 'b', 'c']), {forever: 6, trapped: 0}, 'tree: the centre and its neighbours make six');
    const ten = ball(2);
    assert.deepEqual(treeCounts(ten), {forever: 12, trapped: 0}, 'tree: blocking everything within two roads makes 12');
    // Ten blocks spread out, chosen one at a time out from the centre.
    const spread = [];
    for (const d of ball(5)) if (spread.length < 10 && spread.every(u => !touching(u, d)) && treeCounts([...spread, d]).trapped === 0) spread.push(d);
    assert.deepEqual(treeCounts(spread), {forever: 21, trapped: 0}, 'tree: ten spread-out blocks make 21');
    assert.deepEqual(treeCounts(spread.slice(0, 6)), {forever: 13, trapped: 0}, 'tree: six make 13');
  }

  // Each puzzle: fresh state, witness, Check and Can't, hints, refusals, saves.
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'ends');
    assert.ok(p.id.startsWith('ends-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(p.visibleObjective.split(' ').length <= 8 && !/\.\s+\S/.test(p.visibleObjective), `${p.id}: one short objective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    assert.equal(nextHint(p, fresh).type, p.parameters.mode === 'playground' ? 'done' : 'move', `${p.id}: a first hint`);
    if (p.parameters.mode === 'playground') { checkPlayground(p, fresh, maps); continue; }
    report.hintSteps += checkPuzzle(p, fresh, TABLE[p.id], maps[TABLE[p.id].map]);
  }
  return report;
}

const recount = (m, blocks) => m.kind === 'tree' ? treeCounts(blocks) : flatCounts(m, blocks);
// Reading order on flat maps (rows, then across); by depth, then alphabetically, on the tree.
const ordered = (m, list) => [...list].sort((u, v) => { if (m.kind === 'tree') return depth(u) - depth(v) || (u < v ? -1 : 1); const [a, b] = parse(u), [c, d] = parse(v); return b - d || a - c; });

function checkPuzzle(p, fresh, row, m) {
  const q = p.parameters, tree = m.kind === 'tree';
  let steps = 0;
  const possible = !row.impossible;
  assert.equal(p.solution.possible, possible, `${p.id}: possible`);
  if (possible) {
    // The witness, recounted and played.
    const w = p.solution.witness;
    assert.ok(w.length <= q.budget, `${p.id}: witness within the budget`);
    assert.ok(meets(q.goal, recount(m, w)), `${p.id}: the witness meets the goal`);
    let a = blockAll(p, fresh, w);
    assert.ok(!isSolved(p, a.board), `${p.id}: not solved before Check`);
    a = play(p, a, {type: 'check'});
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    refuse(p, a, {type: 'unblock', dot: w[0]}, 'a move after a solve');
    // Patterns kept for hints all meet the goal.
    for (const pattern of q.patterns) assert.ok(meets(q.goal, recount(m, pattern)), `${p.id}: pattern ${pattern.join(' ')}`);
    if (tree) assert.equal(q.goal.forever, 2 * q.budget + 1, `${p.id}: the tree goal is 2m + 1`);
    // A wrong Can't (only after a Check with a block) says it can be done, and
    // waits for a change.
    const tried = play(p, play(p, fresh, {type: 'block', dot: firstTry(m)}), {type: 'check'});
    assert.ok(!isSolved(p, tried.board));
    const wrong = play(p, tried, {type: 'cant'});
    assert.equal(wrong.board.shown, 'can', `${p.id}: a wrong Can't`);
    assert.ok(!isSolved(p, wrong.board));
    refuse(p, wrong, {type: 'cant'}, 'Can’t twice');
    steps += hintsSolve(p, wrong, 'after a wrong Can’t');
  } else {
    // No placement reaches the goal: the map has fewer ends than the goal asks.
    assert.equal(ENDS[row.map], row.impossible, `${p.id}: ends`);
    assert.ok(q.goal.forever > row.impossible, `${p.id}: the goal asks for more than the ends`);
    assert.equal(p.solution.ends, row.impossible);
    // The hints try the trial blocks, Check with the authored reason, and only then Can't.
    assert.ok(q.trial.length <= q.budget && q.trial.every(d => on(m, ...parse(d))), `${p.id}: the trial`);
    assert.ok(!meets(q.goal, recount(m, q.trial)), `${p.id}: the trial falls short`);
    let a = fresh;
    const chain = [];
    while (!isSolved(p, a.board) && chain.length < 20) { const h = nextHint(p, a); chain.push([h.action.type, h.action.dot, h.text]); a = play(p, a, h.action); }
    assert.deepEqual(chain.map(c => c[0]), [...q.trial.map(() => 'block'), 'check', 'cant'], `${p.id}: a try, a Check, then Can't`);
    assert.deepEqual(chain.slice(0, q.trial.length).map(c => c[1]), q.trial, `${p.id}: the trial blocks`);
    assert.equal(chain[0][2], p.hints[0], `${p.id}: the first hint is the authored try`);
    assert.equal(chain.at(-2)[2], p.hints[1], `${p.id}: the Check comes with the authored reason`);
    assert.equal(chain.at(-1)[2], p.hints[2], `${p.id}: Can't comes with the authored answer`);
    assert.equal(a.board.shown, 'cant', `${p.id}: a right Can't`);
    // Can't waits for a Check with a block, and answers after any blocks.
    refuse(p, fresh, {type: 'cant'}, 'Can’t on an empty board');
    refuse(p, play(p, fresh, {type: 'check'}), {type: 'cant'}, 'Can’t after a Check with nothing blocked');
    const some = blockAll(p, fresh, ordered(m, flatNear(m).slice(0, 3)));
    refuse(p, some, {type: 'cant'}, 'Can’t before a Check');
    const h = nextHint(p, some);
    assert.deepEqual([h.action.type, h.text], ['check', p.hints[1]], `${p.id}: after blocks elsewhere the hint is Check, with the reason`);
    const b = play(p, play(p, some, {type: 'check'}), {type: 'cant'});
    assert.ok(isSolved(p, b.board), `${p.id}: Can’t after blocks and a Check`);
  }
  // Check with nothing blocked is wrong everywhere, and waits for a change.
  const checked = play(p, fresh, {type: 'check'});
  assert.ok(!isSolved(p, checked.board), `${p.id}: a wrong Check`);
  refuse(p, checked, {type: 'check'}, 'Check twice');
  steps += hintsSolve(p, fresh, 'from fresh');
  steps += hintsSolve(p, checked, 'after a wrong Check');
  // Wrong blocks: the pitfalls, a full budget far from the start, and random ones.
  const pitfalls = tree
    ? [['a', 'b', 'c'], ['a', 'b'], ['b', 'c', 'ab', 'ac'].slice(0, q.budget), ['o', 'a'], ['abc', 'cbc']]
    : [['0,0', '1,0'], ['5,0', '5,1'], ['0,0', '1,0', '2,0', '3,0'], ['-6,0', '7,0'], ['0,1', '1,1', '2,1'], ['-1,1', '0,2', '1,1']];
  const random = seeded(p.number * 97);
  const near = tree ? ball(3) : flatNear(m);
  for (let t = 0; t < 12; t++) pitfalls.push([...new Set([...Array(1 + Math.floor(random() * q.budget))].map(() => near[Math.floor(random() * near.length)]))]);
  for (const list of pitfalls) {
    const dots = list.filter(d => mechanicFor(p).valid(p, {blocks: [d], shown: null})).slice(0, q.budget);
    if (!dots.length) continue;
    let a = blockAll(p, fresh, dots);
    if (isSolved(p, a.board)) continue;
    steps += hintsSolve(p, a, `after blocking ${dots.join(' ')}`);
    a = play(p, a, {type: 'check'});
    if (!isSolved(p, a.board)) steps += hintsSolve(p, a, `after checking ${dots.join(' ')}`);
  }
  checkRefusals(p, fresh, possible, m);
  return steps;
}
// One block that solves no puzzle by itself.
const firstTry = m => m.kind === 'tree' ? 'ab' : key(...m.start);
const flatNear = m => { const [sx, sy] = m.start; return dotsIn(m, [sx - 4, sx + 4, sy - 3, sy + 3]); };

function checkRefusals(p, fresh, possible, m) {
  const q = p.parameters, tree = m.kind === 'tree', B = fresh.board;
  const good = tree ? 'ab' : key(...m.start), next = tree ? 'ba' : key(m.start[0] + 1, m.start[1]);
  const off = {tree: 'aab', tee: '5,5', grid: null, line: '0,1', ladder: '0,2', strip: '0,3'}[m.id];
  const bad = [[null, 'nothing'], ['block', 'a string'], [{type: 'block'}, 'no dot'], [{type: 'block', dot: 7}, 'a number'], [{type: 'unblock', dot: good}, 'taking off a block that isn’t there'], [{type: 'map', map: 'grid'}, 'a map change in a puzzle'], [{type: 'fly'}, 'an unknown move']];
  if (off) bad.push([{type: 'block', dot: off}, 'a dot off the map']);
  if (!tree) for (const d of ['-0,0', '01,0', '0, 0', '0,0,0', ' 0,0']) bad.push([{type: 'block', dot: d}, `a malformed dot ${JSON.stringify(d)}`]);
  else for (const d of ['', 'O', 'abca ', 'aa', 'd']) bad.push([{type: 'block', dot: d}, `a malformed dot ${JSON.stringify(d)}`]);
  for (const [action, why] of bad) refuse(p, fresh, action, why);
  const once = play(p, fresh, {type: 'block', dot: good});
  refuse(p, once, {type: 'block', dot: good}, 'blocking a dot twice');
  // Past the budget.
  const spare = tree ? ['o', 'a', 'b', 'c', 'ab', 'ac', 'ba', 'bc', 'ca', 'cb', 'aba'] : flatNear(m);
  let full = fresh;
  for (const d of spare) { if (full.board.blocks.length === q.budget) break; const next = move(p, full, {type: 'block', dot: d}); if (next && !isSolved(p, next.board)) full = next; }
  if (full.board.blocks.length === q.budget) refuse(p, full, {type: 'block', dot: spare.find(d => !full.board.blocks.includes(d))}, 'a block past the budget');
  // Forged saves.
  const blocks = full.board.blocks;
  const forged = [
    [{...B, blocks: [good, good]}, 'a dot blocked twice'],
    [{...B, blocks: ordered(m, [...blocks, spare.find(d => !blocks.includes(d))])}, 'blocks past the budget'],
    [{...B, blocks: [good], shown: possible ? 'cant' : 'can'}, possible ? 'Can’t accepted when it can be done' : '“it can be done” when it can’t'],
    [{...B, blocks: [], shown: possible ? 'can' : 'cant'}, 'a Can’t answer with nothing blocked'],
    [{...B, shown: 'yes'}, 'an unknown answer'],
    [{...B, extra: 1}, 'an unknown field'],
    [{blocks: []}, 'a missing field'],
    [{...B, map: 'grid'}, 'a map in a puzzle'],
    [{...B, blocks: 'none'}, 'blocks that are not a list'],
    [{...B, blocks: [off || 'zz']}, 'a dot off the map']
  ];
  assert.ok(validBoard(p, {...B, blocks: ordered(m, [good, next])}), `${p.id}: two blocks in order`);
  assert.ok(validBoard(p, {...B, blocks: [good], shown: possible ? 'can' : 'cant'}), `${p.id}: a Can’t answer after a block`);
  forged.push([{...B, blocks: ordered(m, [good, next]).reverse()}, 'blocks out of order']);
  if (!tree) forged.push([{...B, blocks: ['-0,0']}, 'a malformed dot']);
  else forged.push([{...B, blocks: ['abb']}, 'a word that turns straight back']);
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkPlayground(p, fresh, maps) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  assert.deepEqual(Object.keys(q.maps), ['line', 'ladder', 'strip', 'grid', 'tee', 'tree'], `${p.id}: six maps`);
  for (const [name, m] of Object.entries(q.maps)) {
    let a = name === fresh.board.map ? fresh : play(p, fresh, {type: 'map', map: name});
    assert.equal(a.board.map, name);
    const dots = m.kind === 'tree' ? ['o', 'ab', 'ba'] : flatNear(m).slice(0, 5);
    a = blockAll(p, a, dots);
    a = play(p, a, {type: 'check'});
    assert.equal(a.board.shown, 'pieces', `${p.id}: ${name} checks`);
    assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
    refuse(p, a, {type: 'cant'}, 'Can’t in the playground');
    const other = Object.keys(q.maps).find(k => k !== name);
    assert.deepEqual(play(p, a, {type: 'map', map: other}).board, {map: other, blocks: [], shown: null}, `${p.id}: a new map starts clear`);
    assert.deepEqual(mechanicCounts(m, dots), m.kind === 'tree' ? treeCounts(dots) : flatCounts({...m, id: name}, dots), `${p.id}: ${name} counts agree`);
  }
  refuse(p, fresh, {type: 'map', map: 'moon'}, 'an unknown map');
  refuse(p, fresh, {type: 'map', map: fresh.board.map}, 'the same map');
  // Up to 40 blocks, never 41.
  const grid = {...fresh.board, map: 'grid'}, many = [];
  for (let y = -3; y <= 3 && many.length < 41; y++) for (let x = -3; x <= 3 && many.length < 41; x++) many.push(key(x, y));
  assert.ok(validBoard(p, {...grid, blocks: many.slice(0, 40)}), `${p.id}: forty blocks`);
  assert.equal(validBoard(p, {...grid, blocks: many}), false, `${p.id}: rejects 41 blocks`);
  for (const [board, why] of [[{...fresh.board, map: 'moon'}, 'an unknown map'], [{...fresh.board, shown: 'cant'}, 'a Can’t answer'], [{...fresh.board, shown: 'can'}, 'a “can be done” answer'], [{blocks: [], shown: null}, 'a missing map'], [{...fresh.board, map: 'tree', blocks: ['0,0']}, 'a flat dot on the tree']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}
export default validateEnds;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateEnds(), null, 2));
