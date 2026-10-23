// Checks the Missing square pack (dist/families/reshape/reshape.json), a group
// in Tile gardens: content fields and sources; every claim recomputed by its
// own exhaustive search, unlike the mechanic's (straight cuts enumerated as
// cut sequences with their own connectivity test, and a fill of the first
// empty square in column order with its own quarter turns); the theorem over
// a range of rectangles (one cut always takes the average side off the long
// side and leaves a corner square) and the reverse move over a range of
// corner-cut squares; fewest cuts; the Can't certificate and the largest set
// of squares that need pieces of their own; every solution the search finds,
// played as moves and accepted; the witnesses; hint chains from fresh, after
// every first cut, after wrong places, after a refused That's all, after Undo
// and from random boards; illegal moves; forged saves; and how long a hint
// takes. Run: node scripts/validate-reshape.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {geometry, footprint, forgetHints} from '../dist/families/reshape/reshape.js';
import {loadPack} from './packs.mjs';

// What each puzzle claims: the start shape, the cuts allowed, and the
// answer: the side of the square left over (or the one that must be left),
// whether it can be done, or the rectangles there are.
const TABLE = {
  'reshape-01': {home: [4, 2], cuts: 1, left: 1},
  'reshape-02': {home: [6, 2], cuts: 1, left: 2},
  'reshape-03': {home: [5, 1], cuts: 1, left: 2},
  'reshape-04': {corner: [3, 1], cuts: 1, answers: ['4x2']},
  'reshape-05': {home: [8, 2], cuts: 1, left: 3},
  'reshape-06': {home: [7, 3], cuts: 1, left: 2},
  'reshape-07': {corner: [4, 2], cuts: 1, answers: ['6x2', '4x3']},
  'reshape-08': {home: [10, 4], cuts: 1, left: 3},
  'reshape-09': {home: [6, 2], cuts: 2, hole: [1, 0, 2]},
  'reshape-10': {home: [10, 4], cuts: 2, hole: [2, 2, 3], cant: true},
  'reshape-11': {home: [10, 4], cuts: 3, hole: [2, 2, 3]},
  'reshape-12': {corner: [5, 3], cuts: 2, answers: ['8x2', '4x4']}
};

/* ----- Shapes, cuts and fills, written apart from the mechanic. */
const K = ([x, y]) => `${x},${y}`;
const column = (a, b) => a[0] - b[0] || a[1] - b[1];
const rectangle = (x, y, w, h) => { const out = []; for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) out.push([i, j]); return out; };
function shapeOfHome({w, h, notch = 0}) {
  const out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!(x >= w - notch && y < notch)) out.push([x, y]);
  return out;
}
function joined(cells) {
  const left = new Set(cells.map(K)), stack = [cells[0]];
  left.delete(K(cells[0]));
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const c of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (left.delete(K(c))) stack.push(c);
  }
  return left.size === 0;
}
const isRect = cells => { const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]); return (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1) === cells.length && new Set(cells.map(K)).size === cells.length; };
const dims = cells => { const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]); const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1; return `${Math.max(w, h)}x${Math.min(w, h)}`; };
// Every set of pieces that at most n straight cuts make, with one sequence
// of cuts that makes it: a cut follows a whole grid line across one piece
// and must leave two joined pieces.
function cutStates(start, n) {
  const keyOf = pieces => pieces.map(p => p.map(K).join(';')).sort().join('|');
  const first = {pieces: [start], cuts: []}, states = new Map([[keyOf(first.pieces), first]]);
  let layer = [first];
  for (let d = 0; d < n; d++) {
    const next = [];
    for (const s of layer) s.pieces.forEach((piece, i) => {
      for (const dir of ['h', 'v']) {
        const at = c => dir === 'h' ? c[1] : c[0], vals = piece.map(at);
        for (let k = Math.min(...vals) + 1; k <= Math.max(...vals); k++) {
          const a = piece.filter(c => at(c) < k), b = piece.filter(c => at(c) >= k);
          if (!a.length || !b.length || !joined(a) || !joined(b)) continue;
          const pieces = [...s.pieces.slice(0, i), ...s.pieces.slice(i + 1), a, b], key = keyOf(pieces);
          if (states.has(key)) continue;
          const state = {pieces, cuts: [...s.cuts, {cells: piece, dir, k}]};
          states.set(key, state); next.push(state);
        }
      }
    });
    layer = next;
  }
  return [...states.values()];
}
// The ways round of a piece by quarter turns (and flips when asked), each
// shifted to 0 and listed in column order, so its first square is the one
// that goes on the first empty square.
function forms(cells, flips) {
  const out = new Map();
  for (const flip of flips ? [false, true] : [false]) {
    let s = flip ? cells.map(([x, y]) => [-x, y]) : cells;
    for (let r = 0; r < 4; r++) {
      s = s.map(([x, y]) => [-y, x]);
      const mx = Math.min(...s.map(c => c[0])), my = Math.min(...s.map(c => c[1]));
      const n = s.map(([x, y]) => [x - mx, y - my]).sort(column);
      out.set(n.map(K).join(';'), n);
    }
  }
  return [...out.values()];
}
// Every way to fill `region` exactly with `pieces`: lists of each piece's
// squares, piece by piece. Fills the first empty square in column order.
function fills(region, pieces, {flips = false, limit = Infinity} = {}) {
  if (region.length !== pieces.reduce((s, p) => s + p.length, 0)) return [];
  const order = [...region].sort(column), free = new Set(order.map(K)), shapes = pieces.map(p => forms(p, flips)), used = pieces.map(() => null), out = [];
  const go = () => {
    if (out.length >= limit) return;
    const first = order.find(c => free.has(K(c)));
    if (!first) { out.push([...used]); return; }
    for (let i = 0; i < pieces.length; i++) if (!used[i]) for (const form of shapes[i]) {
      const cells = form.map(([x, y]) => [x + first[0] - form[0][0], y + first[1] - form[0][1]]);
      if (!cells.every(c => free.has(K(c)))) continue;
      cells.forEach(c => free.delete(K(c))); used[i] = cells;
      go();
      used[i] = null; cells.forEach(c => free.add(K(c)));
    }
  };
  go();
  return out;
}
// The m by m square with an s by s square left out at (x, y).
const squareLess = (m, [x, y, s]) => { const hole = new Set(rectangle(x, y, s, s).map(K)); return rectangle(0, 0, m, m).filter(c => !hole.has(K(c))); };
// Every way to fit the start shape, cut at most n times, in the m by m
// square leaving one s by s square: at `hole` if given, anywhere if not.
function squareWays(start, m, n, hole = null, limit = Infinity) {
  const s = Math.round(Math.sqrt(m * m - start.length));
  assert.equal(s * s, m * m - start.length, 'what is left over is a square’s worth');
  const holes = hole ? [hole] : rectangle(0, 0, m - s + 1, m - s + 1).map(([x, y]) => [x, y, s]);
  const out = [];
  for (const state of cutStates(start, n)) for (const h of holes) {
    for (const placed of fills(squareLess(m, h), state.pieces, {limit: limit - out.length})) out.push({state, hole: h, placed});
    if (out.length >= limit) return out;
  }
  return out;
}
// Every rectangle the start shape makes, cut at most n times: key → one way.
function rectangles(start, n, flips = false) {
  const out = new Map(), A = start.length;
  for (const state of cutStates(start, n)) for (let h = 1; h * h <= A; h++) {
    if (A % h || out.has(`${A / h}x${h}`)) continue;
    const [way] = fills(rectangle(0, 0, A / h, h), state.pieces, {flips, limit: 1});
    if (way) out.set(`${A / h}x${h}`, {state, placed: way, w: A / h, h});
  }
  return out;
}
// The largest set of squares of `region` no two of which one rectangle
// inside it can cover: two squares can share a piece only when the box
// round them misses the hole.
function largestApart(m, hole) {
  const [hx, hy, s] = hole, cells = squareLess(m, hole);
  const clash = (a, b) => Math.min(a[0], b[0]) < hx + s && Math.max(a[0], b[0]) >= hx && Math.min(a[1], b[1]) < hy + s && Math.max(a[1], b[1]) >= hy;
  let best = [];
  const grow = (set, rest) => {
    if (set.length > best.length) best = set;
    if (set.length + rest.length <= best.length) return;
    rest.forEach((c, i) => grow([...set, c], rest.slice(i + 1).filter(d => clash(c, d))));
  };
  grow([], cells);
  return {size: best.length, clash};
}

/* ----- Playing. */
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => { const next = move(p, a, action); assert.ok(next === null || next === a, `${p.id}: refuses ${why}`); };
const playAll = (p, a, actions) => actions.reduce((b, action) => play(p, b, action), a);
const undoCarry = (p, a) => { const next = undo(a); return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
// A way found by the search, as the moves a child makes: the cuts in order,
// then each piece put where the way has it.
function movesOf(p, way, offset = [0, 0]) {
  const G = geometry(p.parameters), index = new Map(G.home.map((c, i) => [K(c), i]));
  const idOf = cells => Math.min(...cells.map(c => index.get(K(c))));
  const moves = way.state.cuts.map(c => ({type: 'cut', piece: idOf(c.cells), dir: c.dir, k: c.k}));
  way.state.pieces.forEach((cells, i) => {
    const piece = {cells: cells.map(c => index.get(K(c))).sort((u, v) => u - v), at: null};
    const foot = way.placed[i].map(([x, y]) => [x + offset[0], y + offset[1]]), want = new Set(foot.map(K));
    const x = Math.min(...foot.map(c => c[0])), y = Math.min(...foot.map(c => c[1]));
    const r = [0, 1, 2, 3].find(t => footprint(G, piece, [x, y, t]).every(c => want.has(K(c))));
    assert.ok(r !== undefined, `${p.id}: a quarter turn puts the piece where the way has it`);
    moves.push({type: 'put', piece: piece.cells[0], x, y, r});
  });
  return moves;
}
let hintSteps = 0, hintRuns = 0, slowest = 0, slowestAt = '';
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const t = performance.now(), h = nextHint(p, a), took = performance.now() - t;
    if (took > slowest) { slowest = took; slowestAt = `${p.id} ${label}`; }
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(h.text && /^[A-Z].*\.$/.test(h.text), `${p.id} ${label}: a hint is a sentence (${h.text})`);
    if (h.action.type === 'cant') assert.ok(p.parameters.apart, `${p.id} ${label}: Can’t is hinted only where it holds`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  hintSteps += steps; hintRuns++;
  return a;
}
let seed = 93;
const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = n => Math.floor(random() * n);
function randomAction(p, a) {
  const q = p.parameters, b = a.board, piece = b.pieces[pick(b.pieces.length)], r = pick(12);
  if (r < 3) return {type: 'cut', piece: piece.cells[0], dir: pick(2) ? 'h' : 'v', k: 1 + pick(Math.max(q.home.w, q.home.h) - 1)};
  if (r < 9) return {type: 'put', piece: piece.cells[0], x: pick(q.mat.cols), y: pick(q.mat.rows), r: pick(4)};
  if (r < 10) return {type: 'home', piece: piece.cells[0]};
  if (r < 11) return {type: 'tape'};
  return q.mode === 'rebuild' ? {type: 'all'} : {type: 'cant', cells: [[pick(q.mat.cols), pick(q.mat.rows)]]};
}
function randomBoard(p, steps) {
  let a = freshAttempt(p);
  for (let i = 0; i < steps; i++) {
    const next = move(p, a, randomAction(p, a));
    if (next && !isSolved(p, next.board)) a = next;
    if (pick(9) === 0) a = undoCarry(p, a);
    assert.ok(validBoard(p, a.board), `${p.id}: random play stays valid`);
  }
  return a;
}

export async function validateReshape() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/reshape/reshape.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-93')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-93.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  const puzzles = pack.puzzles, sourceIds = new Set(pack.sources.map(s => s.id));
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.equal(new Set(puzzles.map(p => p.title)).size, puzzles.length, 'titles differ');
  for (const p of puzzles) {
    assert.equal(p.mechanic, 'reshape'); assert.equal(p.libraryFamily, 'tile'); assert.equal(p.group, 'Missing square'); assert.equal(p.band, 'all');
    for (const field of ['title', 'objective', 'visibleObjective', 'controls', 'idea', 'prerequisites']) assert.ok(typeof p[field] === 'string' && p[field].length, `${p.id}: ${field}`);
    assert.equal(p.visibleObjective.split(/(?<=\.)\s/).length, 1, `${p.id}: the visible objective is one sentence`);
    assert.ok(Array.isArray(p.rules) && p.rules.length >= 2 && p.hints.length === 3, `${p.id}: rules and three hints`);
    assert.ok(p.parent && p.parent.explanation && p.parent.sourceIds.every(id => sourceIds.has(id)), `${p.id}: grown-up notes and their sources`);
    assert.doesNotMatch(JSON.stringify(p), /decimal|\d\.\d/i, `${p.id}: whole squares only`);
  }

  /* ----- The theorem over a range: an a by b rectangle (a < b, a + b even)
     and the square of side m = (a + b)/2. One cut is enough, it is always
     the cut that takes m off the long side, and the square left over, of
     side d = (b − a)/2, is in a corner. No cut is never enough. */
  let theoremCases = 0;
  for (let b = 2; b <= 12; b++) for (let a = 1; a < b; a++) {
    if ((a + b) % 2) continue;
    const m = (a + b) / 2, d = (b - a) / 2, start = rectangle(0, 0, b, a);
    assert.equal(m * m - a * b, d * d, `${a} by ${b}: m² − ab = d²`);
    const ways = squareWays(start, m, 1);
    assert.ok(ways.length, `${a} by ${b}: one cut fits it in the ${m} by ${m} square`);
    for (const w of ways) {
      assert.deepEqual(w.state.pieces.map(dims).sort(), [`${Math.max(m, a)}x${Math.min(m, a)}`, `${Math.max(d, a)}x${Math.min(d, a)}`].sort(), `${a} by ${b}: the pieces are m by a and d by a`);
      const [x, y] = w.hole;
      assert.ok((x === 0 || x === m - d) && (y === 0 || y === m - d), `${a} by ${b}: the square left is in a corner`);
    }
    theoremCases++;
  }
  /* ----- The reverse move over a range: the m by m square with a d by d
     corner gone, cut once, makes the (m − d) by (m + d) rectangle it came
     from, and another rectangle only when m = 2d with d even: the 4k by 4k
     square with 2k by 2k gone also makes 4k by 3k, Week 93's reshaping move
     of 6k by 2k. The same with flips. Checked for squares up to 12 by 12. */
  const reverse = {};
  for (let m = 2; m <= 12; m++) for (let d = 1; d < m; d++) {
    const start = shapeOfHome({w: m, h: m, notch: d}), keys = [...rectangles(start, 1).keys()].sort();
    assert.deepEqual([...rectangles(start, 1, true).keys()].sort(), keys, `L(${m}, ${d}): flips make no more`);
    assert.ok(keys.includes(`${m + d}x${m - d}`), `L(${m}, ${d}): the rectangle it came from`);
    if (keys.length > 1) reverse[`${m}-${d}`] = keys;
  }
  assert.deepEqual(reverse, {'4-2': ['4x3', '6x2'], '8-4': ['12x4', '8x6'], '12-6': ['12x9', '18x6']}, 'one cut makes another rectangle only from the 4k by 4k square with 2k by 2k gone');

  /* ----- Each puzzle against the table, by the search. */
  let ways = 0, waysPlayed = 0;
  for (const p of puzzles) {
    const q = p.parameters, row = TABLE[p.id], G = geometry(q), fresh = freshAttempt(p);
    assert.equal(q.cuts, row.cuts, `${p.id}: cuts`);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: starts valid and unsolved`);
    if (row.corner) {
      const [m, d] = row.corner;
      assert.equal(q.mode, 'rebuild');
      assert.deepEqual(q.home, {w: m, h: m, notch: d}, `${p.id}: the ${m} by ${m} square with ${d} by ${d} gone`);
      const start = shapeOfHome(q.home), found = rectangles(start, q.cuts);
      assert.deepEqual([...found.keys()].sort(), [...row.answers].sort(), `${p.id}: the rectangles, by search`);
      assert.deepEqual([...q.answers].sort(), [...row.answers].sort(), `${p.id}: the pack’s answers`);
      assert.deepEqual([...rectangles(start, q.cuts, true).keys()].sort(), [...row.answers].sort(), `${p.id}: flips make no more`);
      assert.ok(row.answers.includes(`${m + d}x${m - d}`), `${p.id}: the rectangle it came from is one`);
      // Every way to make each rectangle, at two places on the grid, played.
      for (const key of row.answers) {
        const [L, S] = key.split('x').map(Number), [w, h] = L <= q.mat.cols && S <= q.mat.rows ? [L, S] : [S, L];
        assert.ok(w <= q.mat.cols && h <= q.mat.rows, `${p.id}: ${key} fits the grid`);
        for (const state of cutStates(start, q.cuts)) for (const placed of fills(rectangle(0, 0, w, h), state.pieces)) {
          ways++;
          for (const offset of [[0, 0], [q.mat.cols - w, q.mat.rows - h]]) {
            const a = playAll(p, fresh, movesOf(p, {state, placed}, offset));
            assert.ok(a.board.found.includes(key), `${p.id}: ${key} is kept however it is made`);
            waysPlayed++;
          }
        }
      }
    } else {
      const [b, a] = row.home, m = (a + b) / 2;
      assert.equal(q.mode, 'square');
      assert.deepEqual(q.home, {w: b, h: a}, `${p.id}: a ${b} by ${a} rectangle`);
      assert.deepEqual(q.mat, {cols: m, rows: m}, `${p.id}: the average-side square`);
      const start = rectangle(0, 0, b, a), d = (b - a) / 2, hole = row.hole || null;
      assert.equal(q.side, d, `${p.id}: the square left has side ${d}`);
      if (row.left) assert.equal(row.left, d);
      if (hole) assert.deepEqual(q.hole, hole, `${p.id}: the dashed square`);
      else assert.equal(q.hole, undefined);
      const solvable = squareWays(start, m, q.cuts, hole, 1).length > 0;
      assert.equal(solvable, !row.cant, `${p.id}: ${row.cant ? 'can’t be done' : 'can be done'} with ${q.cuts} cuts`);
      assert.equal(squareWays(start, m, q.cuts - 1, hole, 1).length, 0, `${p.id}: ${q.cuts - 1} cuts are too few`);
      assert.equal(Boolean(q.cant), Boolean(hole), `${p.id}: Can’t is offered with every dashed square`);
      if (hole) {
        const {size, clash} = largestApart(m, hole);
        if (row.cant) {
          assert.ok(squareWays(start, m, q.cuts + 1, hole, 1).length, `${p.id}: one more cut does it`);
          assert.equal(size, q.cuts + 2, `${p.id}: the most squares needing their own pieces`);
          assert.equal(q.apart.length, q.cuts + 2, `${p.id}: the certificate has one square more than the pieces`);
          q.apart.forEach((c, i) => q.apart.slice(i + 1).forEach(e => assert.ok(clash(c, e), `${p.id}: ${c} and ${e} need different pieces`)));
          assert.ok(q.apart.every(([x, y]) => x >= 0 && y >= 0 && x < m && y < m && !(x >= hole[0] && x < hole[0] + hole[2] && y >= hole[1] && y < hole[1] + hole[2])), `${p.id}: the certificate’s squares are on the grid, off the dashed square`);
          assert.deepEqual(p.solution.claim, q.apart);
        } else {
          assert.ok(size <= q.cuts + 1, `${p.id}: no Can’t claim exists when it can be done`);
          assert.equal(q.apart, undefined);
        }
      }
      // Every solution the search finds, played as moves and accepted.
      if (!row.cant) for (const way of squareWays(start, m, q.cuts, hole)) {
        const a = playAll(p, fresh, movesOf(p, way));
        assert.ok(isSolved(p, a.board), `${p.id}: every way is accepted (${JSON.stringify(way.hole)})`);
        ways++; waysPlayed++;
      }
    }
    // The witness.
    if (p.solution.moves) assert.ok(isSolved(p, playAll(p, fresh, p.solution.moves).board), `${p.id}: the witness solves`);
    else assert.ok(isSolved(p, play(p, play(p, fresh, {type: 'cut', piece: 0, dir: 'h', k: 2}), {type: 'cant', cells: p.solution.claim}).board), `${p.id}: the claim after a try`);
    checkMoves(p, fresh);
    checkHints(p, fresh);
  }
  const timing = timeHints(puzzles);
  assert.ok(timing.ms < 150, `a hint in under 150 ms (${timing.ms.toFixed(1)} at ${timing.at})`);
  return {puzzles: puzzles.length, theoremCases, reverseExceptions: reverse, waysFound: ways, waysPlayed, hintRuns, hintSteps, slowestHintMs: Number(slowest.toFixed(1)), slowestHintAt: slowestAt, coldHintMs: Number(timing.ms.toFixed(1)), coldHintBoards: timing.boards};
}

/* ----- Moves the mechanic must refuse, and saves it must not load. */
const pieceById = (a, id) => a.board.pieces.find(piece => piece.cells[0] === id);
function checkMoves(p, fresh) {
  const q = p.parameters, G = geometry(q), n = G.home.length;
  for (const [action, why] of [
    [{type: 'cut', piece: 0, dir: 'v', k: 0}, 'a cut along the edge'],
    [{type: 'cut', piece: 0, dir: 'v', k: q.home.w}, 'a cut along the far edge'],
    [{type: 'cut', piece: 0, dir: 'd', k: 1}, 'a slanting cut'],
    [{type: 'cut', piece: 0, dir: 'v', k: 1.5}, 'a cut between grid lines'],
    [{type: 'cut', piece: 1, dir: 'v', k: 1}, 'a piece that is not there'],
    [{type: 'home', piece: 0}, 'taking back a piece at the top'],
    [{type: 'tape'}, 'Tape before a cut'],
    [{type: 'put', piece: 0, x: -1, y: 0, r: 0}, 'a piece off the grid'],
    [{type: 'put', piece: 0, x: 0, y: 0, r: 4}, 'five quarter turns'],
    [{type: 'put', piece: 0, x: 0, y: 0, r: 2}, 'a half turn of a shape a turn leaves the same'],
    [{type: 'cant', cells: q.apart || [[0, 0]]}, 'Can’t before a try'],
    [{type: 'reshape'}, 'a reshape button'],
    [{type: q.mode === 'rebuild' ? 'cant' : 'all'}, 'the other mode’s claim']
  ]) if (!(why.startsWith('a half turn') && q.home.notch)) refuse(p, fresh, action, why);
  if (q.mode === 'rebuild') refuse(p, fresh, {type: 'all'}, 'That’s all with nothing made');
  // The whole rectangle never fits the square: it is longer than the square is wide.
  if (q.mode === 'square') for (let r = 0; r < 2; r++) for (let j = 0; j < q.mat.rows; j++) for (let i = 0; i < q.mat.cols; i++) refuse(p, fresh, {type: 'put', piece: 0, x: i, y: j, r}, 'the whole rectangle on the grid');
  // Cut once by the witness's first cut, then the illegal moves round it.
  // One cut (the witness's first if it can), then a piece on the grid: the
  // bigger of the two where one fits.
  const put = (a, id) => { for (let r = 0; r < 4; r++) for (let j = 0; j < q.mat.rows; j++) for (let i = 0; i < q.mat.cols; i++) { const next = move(p, a, {type: 'put', piece: id, x: i, y: j, r}); if (next) return [next, [i, j, r]]; } return [null, null]; };
  const firsts = [p.solution.moves ? p.solution.moves[0] : nextHint(p, fresh).action];
  for (const dir of ['h', 'v']) for (let k = 1; k < Math.max(q.home.w, q.home.h); k++) firsts.push({type: 'cut', piece: 0, dir, k});
  let a = null, idA, idB, placed = null, at;
  for (const first of firsts) {
    const cut = move(p, fresh, first);
    if (!cut) continue;
    const [big, small] = [...cut.board.pieces].sort((u, v) => v.cells.length - u.cells.length).map(piece => piece.cells[0]);
    for (const [u, v] of [[big, small], [small, big]]) { [placed, at] = put(cut, u); if (placed) { [a, idA, idB] = [cut, u, v]; break; } }
    if (placed) break;
  }
  assert.ok(placed, `${p.id}: a piece goes on the grid`);
  // A cut the piece takes at the top is refused once it is on the grid.
  let homeCuts = 0;
  for (const dir of ['h', 'v']) for (let k = 1; k < Math.max(q.home.w, q.home.h); k++) {
    const cut = {type: 'cut', piece: idA, dir, k};
    if (!move(p, a, cut)) continue;
    homeCuts++;
    refuse(p, placed, cut, 'cutting a piece on the grid');
  }
  if (q.cuts > 1 && pieceById(a, idA).cells.length > 1) assert.ok(homeCuts, `${p.id}: a cut to refuse on the grid`);
  refuse(p, placed, {type: 'put', piece: idA, x: at[0], y: at[1], r: at[2]}, 'putting a piece where it is');
  refuse(p, placed, {type: 'put', piece: idB, x: at[0], y: at[1], r: 0}, 'a piece on another');
  refuse(p, placed, {type: 'put', piece: idB, x: at[0], y: at[1], r: 1}, 'a piece on another, turned');
  if (q.hole) for (let r = 0; r < 2; r++) refuse(p, a, {type: 'put', piece: idA, x: q.hole[0], y: q.hole[1], r}, 'a piece on the dashed square');
  // Cuts past the limit.
  let c = fresh;
  for (let i = 0; i < q.cuts; i++) { const piece = [...c.board.pieces].sort((u, v) => v.cells.length - u.cells.length)[0]; const S = G.home.filter((_, j) => piece.cells.includes(j)), xs = S.map(s => s[0]), ys = S.map(s => s[1]); c = play(p, c, Math.max(...xs) > Math.min(...xs) ? {type: 'cut', piece: piece.cells[0], dir: 'v', k: Math.min(...xs) + 1} : {type: 'cut', piece: piece.cells[0], dir: 'h', k: Math.min(...ys) + 1}); }
  for (const piece of c.board.pieces) for (const dir of ['h', 'v']) for (let k = 1; k < Math.max(q.home.w, q.home.h); k++) refuse(p, c, {type: 'cut', piece: piece.cells[0], dir, k}, 'a cut past the scissors');
  // Can't: refused on solvable puzzles, wrong sizes and squares that can share.
  if (q.cant) {
    refuse(p, a, {type: 'cant', cells: [[0, 0], [q.mat.cols - 1, 0], [0, q.mat.rows - 1]].slice(0, q.cuts + 1)}, 'too few squares');
    refuse(p, a, {type: 'cant', cells: rectangle(0, 0, q.cuts + 2, 1)}, 'squares in a row, which one piece can share');
    const [hx, hy] = q.hole;
    refuse(p, a, {type: 'cant', cells: [[hx, hy], ...(q.apart || [[0, 0], [q.mat.cols - 1, q.mat.rows - 1], [0, q.mat.rows - 1], [q.mat.cols - 1, 0]]).slice(1)]}, 'a square of the dashed square');
    if (q.apart) {
      refuse(p, a, {type: 'cant', cells: [...q.apart.slice(1), [-1, 0]]}, 'a square off the grid');
      refuse(p, a, {type: 'cant', cells: [q.apart[0], ...q.apart.slice(0, -1)]}, 'a square twice');
      const done = play(p, a, {type: 'cant', cells: [...q.apart].reverse()});
      assert.deepEqual(done.board.claim, q.apart, `${p.id}: the claim is kept in order`);
      refuse(p, done, {type: 'tape'}, 'a move after the claim');
    } else {
      // No claim holds here (the search above finds no such set); the
      // squares beside the dashed square's sides, and corners, are refused.
      const s = q.hole[2], beside = [[hx + (s >> 1), hy - 1], [hx - 1, hy + (s >> 1)], [hx + s, hy + (s >> 1)], [hx + (s >> 1), hy + s]].filter(([u, v]) => u >= 0 && v >= 0 && u < q.mat.cols && v < q.mat.rows);
      refuse(p, a, {type: 'cant', cells: [...beside, [0, q.mat.rows - 1], [q.mat.cols - 1, q.mat.rows - 1]].slice(0, q.cuts + 2)}, 'a claim where it can be done');
    }
  }
  // Forged saves.
  const whole = {cells: [...Array(n).keys()], at: null}, pieces = a.board.pieces;
  const forged = [
    [{...fresh.board, extra: 1}, 'an extra field'],
    [{pieces: [whole]}, 'a missing field'],
    [{...fresh.board, pieces: []}, 'no pieces'],
    [{...fresh.board, pieces: [{cells: [...Array(n - 1).keys()], at: null}]}, 'a square missing'],
    [{...fresh.board, pieces: [{cells: [...Array(n).keys()].reverse(), at: null}]}, 'squares out of order'],
    [{...fresh.board, pieces: [...pieces].reverse()}, 'pieces out of order'],
    [{...fresh.board, pieces: [{cells: [0, 2], at: null}, {cells: [...Array(n).keys()].filter(i => i !== 0 && i !== 2), at: null}]}, 'a piece no straight cut makes'],
    [{...fresh.board, pieces: [...Array(n).keys()].map(i => ({cells: [i], at: null}))}, 'more pieces than the cuts make'],
    [{...fresh.board, pieces: pieces.map(piece => ({...piece, at: [0, 0, 0]}))}, 'two pieces on one place'],
    [{...fresh.board, pieces: pieces.map((piece, i) => i ? piece : {...piece, at: [q.mat.cols, 0, 0]})}, 'a piece off the grid'],
    [{...fresh.board, pieces: pieces.map((piece, i) => i ? piece : {...piece, at: [0, 0, 1.5]})}, 'half a turn'],
    [{...fresh.board, pieces: pieces.map((piece, i) => i ? piece : {...piece, at: [0, 0]})}, 'a place without a turn'],
    [{...fresh.board, pieces: pieces.map(piece => ({...piece, extra: true}))}, 'a piece with an extra field']
  ];
  if (q.mode === 'square') {
    forged.push([{...fresh.board, claim: q.apart || [[0, 0]]}, 'a claim before a try']);
    if (q.hole) forged.push([{...fresh.board, pieces: pieces.map((piece, i) => i ? piece : {...piece, at: [q.hole[0], q.hole[1], 0]})}, 'a piece on the dashed square']);
    if (!q.cant) forged.push([{...a.board, claim: [[0, 0], [1, 1], [2, 2]]}, 'a claim where Can’t is not offered']);
    if (q.apart) forged.push([{...a.board, claim: [...q.apart].reverse()}, 'a claim out of order'], [{...a.board, claim: q.apart.slice(1)}, 'a claim too short']);
    else if (q.cant) forged.push([{...a.board, claim: rectangle(0, 0, q.cuts + 2, 1).sort((u, v) => u[1] - v[1] || u[0] - v[0])}, 'a claim of squares one piece can share']);
  } else {
    forged.push(
      [{...fresh.board, found: ['5x5']}, 'a rectangle that is not an answer'],
      [{...fresh.board, found: [q.answers[0], q.answers[0]]}, 'a rectangle twice'],
      [{...fresh.board, found: [...q.answers], no: true}, 'a refusal with every rectangle found'],
      [{...fresh.board, no: true}, 'a refusal with nothing found'],
      [{...fresh.board, found: [...q.answers], no: true, done: true}, 'refused and accepted'],
      [{...fresh.board, no: 'yes'}, 'a refusal that is not true or false']
    );
    if (q.answers.length > 1) forged.push([{...fresh.board, found: q.answers.slice(0, 1), done: true}, 'That’s all accepted too soon']);
    // A rectangle on the grid that the shelf does not hold.
    const made2 = playAll(p, fresh, p.solution.moves.slice(0, p.solution.moves.findIndex(m => m.type === 'put') + 2));
    assert.ok(made2.board.found.length === 1, `${p.id}: the first rectangle is kept`);
    forged.push([{...made2.board, found: []}, 'a rectangle made but not kept']);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

/* ----- Hints. */
function checkHints(p, fresh) {
  const q = p.parameters;
  hintsSolve(p, fresh, 'from fresh');
  // After every first cut there is.
  const firsts = [];
  for (const dir of ['h', 'v']) for (let k = 1; k < (dir === 'h' ? q.home.h : q.home.w); k++) { const next = move(p, fresh, {type: 'cut', piece: 0, dir, k}); if (next) firsts.push([next, `after cut ${dir} ${k}`]); }
  assert.ok(firsts.length >= 2, `${p.id}: more than one first cut`);
  for (const [a, label] of firsts) hintsSolve(p, a, label);
  // After a wrong place: each first cut, its pieces put at the first spot that takes them.
  for (const [a0, label] of firsts.slice(0, 4)) {
    let a = a0;
    for (const piece of a0.board.pieces) {
      search: for (let j = 0; j < q.mat.rows; j++) for (let i = 0; i < q.mat.cols; i++) for (let r = 0; r < 2; r++) {
        const next = move(p, a, {type: 'put', piece: piece.cells[0], x: i, y: j, r});
        if (next && !isSolved(p, next.board)) { a = next; break search; }
      }
    }
    hintsSolve(p, a, `${label}, pieces put anywhere`);
  }
  if (q.mode === 'rebuild') {
    // A refused That's all, kept through Undo, then hints.
    const firstPut = p.solution.moves.findIndex(m => m.type === 'put');
    let a = playAll(p, fresh, p.solution.moves.slice(0, firstPut + 2));
    assert.equal(a.board.found.length, 1);
    if (q.answers.length > 1) {
      a = play(p, a, {type: 'all'});
      assert.equal(a.board.no, true, `${p.id}: That’s all refused`);
      refuse(p, a, {type: 'all'}, 'That’s all twice');
      const back = undoCarry(p, undoCarry(p, a));
      assert.deepEqual(back.board.found, a.board.found, `${p.id}: Undo keeps the rectangle found`);
      assert.equal(back.board.no, true, `${p.id}: Undo keeps the refusal while the shelf is the same`);
      hintsSolve(p, a, 'after a refused That’s all');
      hintsSolve(p, back, 'after Undo');
    } else {
      assert.ok(isSolved(p, play(p, a, {type: 'all'}).board), `${p.id}: That’s all with the one rectangle`);
    }
  }
  if (q.apart) {
    const h = nextHint(p, fresh);
    assert.equal(h.action.type, 'cut', `${p.id}: Can’t is hinted only after a try`);
    const tried = play(p, fresh, h.action), h2 = nextHint(p, tried);
    assert.deepEqual([h2.action.type, h2.text], ['cant', q.cantText], `${p.id}: then the claim, with its reason`);
  }
  for (let t = 0; t < 10; t++) hintsSolve(p, randomBoard(p, 20 + pick(20)), `after random play ${t}`);
}

// How long a hint takes with nothing remembered, on fresh and random boards,
// each timed three times, keeping the fastest (a pause for garbage
// collection is not the hint's).
function timeHints(puzzles) {
  let worst = 0, at = '', boards = 0;
  for (const p of puzzles) for (const a of [freshAttempt(p), ...Array.from({length: 30}, () => randomBoard(p, 1 + pick(12)))]) {
    let best = Infinity;
    for (let k = 0; k < 3; k++) { forgetHints(); const t = performance.now(); nextHint(p, a); best = Math.min(best, performance.now() - t); }
    if (best > worst) { worst = best; at = `${p.id}: ${JSON.stringify(a.board)}`; }
    boards++;
  }
  return {ms: worst, at, boards};
}

export default validateReshape;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateReshape(), null, 2));
