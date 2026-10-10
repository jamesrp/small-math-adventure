// Checks the Memory robot pack (dist/families/robot/robot.json): content
// fields and sources; every puzzle's budget and number of shortest walks
// against a separate simulator that never adds up the memory directly. It
// tracks the other sum, w = Σ y·Δx over the steps east and west, and reads
// the memory as z = x·y − x₀·y₀ − w (since d(xy) = x dy + y dx for unit
// steps), searching forwards over (x, y, w) where the module searches
// backwards over (x, y, z). Then the theorems the notes rely on: the loop
// formula 2⌈2√|n|⌉ against search for every n from −12 to 16, the board
// never making a puzzle longer than the open plane does, staircases, sliding
// loops, the group law, and the shading over every walk of up to 8 moves
// (its squares add up to the memory; a closed walk's square counts are its
// winding numbers, so a simple loop shades exactly its inside). Last, hints
// alone from fresh, after a wasted move and with the budget spent; illegal
// moves; forged saves; and the playground.
// Run: node scripts/validate-robot.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoToSolvable} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {LO, HI, shading} from '../dist/families/robot/robot.js';
import {loadPack} from './packs.mjs';

const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
// The simulator: a state is [x, y, w]; the memory is read off at the end.
const MOVES = [['E', 1, 0], ['N', 0, 1], ['W', -1, 0], ['S', 0, -1]];
const walkOf = word => [...word].map(c => MOVES.find(m => m[0] === c));
const advance = ([x, y, w], [, dx, dy]) => [x + dx, y + dy, w + y * dx];
const memory = (start, [x, y, w]) => (x * y - start[0] * start[1] - w) || 0;
function run(start, word) {
  let s = [...start, 0];
  for (const m of walkOf(word)) s = advance(s, m);
  return {x: s[0], y: s[1], z: memory(start, s)};
}
const inside = (box, x, y) => x >= box[0] && x <= box[1] && y >= box[0] && y <= box[1];
const BOARD = [LO, HI], PLANE = [-12, 14];
// The fewest moves from start to (flag, goal) inside the box, and how many
// walks of that length do it, by a forward search over (x, y, w) counting
// walks layer by layer. Gives up after `cap` moves.
function search(start, flag, goal, box, cap = 16) {
  const want = flag[0] * flag[1] - start[0] * start[1] - goal;
  let layer = new Map([[`${start},0`, {s: [...start, 0], n: 1}]]);
  for (let len = 0; len <= cap; len++) {
    const hits = [...layer.values()].filter(({s}) => s[0] === flag[0] && s[1] === flag[1] && s[2] === want);
    if (hits.length) return {len, count: hits.reduce((sum, h) => sum + h.n, 0)};
    const next = new Map();
    for (const {s, n} of layer.values()) for (const m of MOVES) {
      const t = advance(s, m);
      if (!inside(box, t[0], t[1]) || Math.abs(t[2]) > 400) continue;
      const k = t.join();
      next.set(k, {s: t, n: (next.get(k)?.n || 0) + n});
    }
    layer = next;
  }
  return null;
}
const loopBound = n => 2 * Math.ceil(2 * Math.sqrt(Math.abs(n)));
// Every word of exactly len moves.
function* words(len) {
  if (!len) { yield ''; return; }
  for (const w of words(len - 1)) for (const [c] of MOVES) yield w + c;
}

// The theorems, over every small case.
function theorems() {
  let checked = 0;
  // The fewest moves for a loop at O that remembers n is 2⌈2√|n|⌉, in the
  // open plane and on the board.
  for (const n of range(-12, 16)) {
    if (!n) continue;
    for (const box of [PLANE, BOARD]) assert.equal(search([0, 0], [0, 0], n, box).len, loopBound(n), `a loop remembering ${n} takes ${loopBound(n)} moves`);
    checked++;
  }
  // Staircases: the walks of a steps east and b north leave every memory
  // from 0 to ab and nothing else.
  for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) {
    const seen = new Set();
    for (const w of words(a + b)) if ([...w].filter(c => c === 'E').length === a && [...w].filter(c => c === 'N').length === b) seen.add(run([0, 0], w).z);
    assert.deepEqual([...seen].sort((p, q) => p - q), range(0, a * b), `staircases to (${a}, ${b})`);
    checked++;
  }
  // Every closed walk of up to 8 moves, slid sideways or up, keeps its memory;
  // walked backwards it changes sign.
  const back = {E: 'W', W: 'E', N: 'S', S: 'N'};
  for (let len = 0; len <= 8; len += 2) for (const w of words(len)) {
    const end = run([0, 0], w);
    if (end.x || end.y) continue;
    for (const start of [[3, 0], [-2, 1], [1, -3]]) assert.equal(run(start, w).z, end.z, `${w} slid to ${start}`);
    assert.equal(run([0, 0], [...w].reverse().map(c => back[c]).join('')).z, -end.z || 0, `${w} walked backwards`);
    checked++;
  }
  // The group law: walking u then v from O ends at (x, y, z)(a, b, c) =
  // (x + a, y + b, z + c + x·b), for every pair of walks of up to 4 moves.
  const short = range(0, 4).flatMap(n => [...words(n)]);
  for (const u of short) {
    const p = run([0, 0], u);
    for (const v of short) {
      const q = run([0, 0], v), r = run([0, 0], u + v);
      assert.deepEqual([r.x, r.y, r.z], [p.x + q.x, p.y + q.y, p.z + q.z + p.x * q.y], `${u}·${v}`);
    }
    checked++;
  }
  // The shading, over every walk of up to 8 moves from O: its squares add up
  // to the memory. For a closed walk each square's count is the walk's
  // winding number round its middle (signed crossings of a ray to the
  // right), and for a simple loop the shaded squares are its inside, as many
  // as its shoelace area, each counting its orientation.
  for (let len = 1; len <= 8; len++) for (const w of words(len)) {
    const counts = shading({start: [0, 0]}, w), end = run([0, 0], w);
    assert.equal([...counts.values()].reduce((s, v) => s + v, 0), end.z, `${w}: the squares add up to the memory`);
    if (!end.x && !end.y) {
      const pts = [[0, 0]];
      for (const [, dx, dy] of walkOf(w)) { const [x, y] = pts.at(-1); pts.push([x + dx, y + dy]); }
      const cross = new Map();
      for (let i = 1; i < pts.length; i++) if (pts[i][0] === pts[i - 1][0]) {
        const [x, y0] = pts[i - 1], dy = pts[i][1] - y0, row = Math.min(y0, pts[i][1]);
        for (let a = -9; a < x; a++) cross.set(`${a},${row}`, (cross.get(`${a},${row}`) || 0) + dy);
      }
      for (const [k, v] of cross) if (!v) cross.delete(k);
      assert.deepEqual(new Map([...counts].sort()), new Map([...cross].sort()), `${w}: counts are winding numbers`);
      const simple = new Set(pts.slice(1).map(String)).size === len;
      if (simple && len >= 4) {
        const twice = pts.slice(1).reduce((s, [x, y], i) => s + pts[i][0] * y - x * pts[i][1], 0);
        assert.equal(counts.size, Math.abs(twice) / 2, `${w}: a simple loop shades its area`);
        assert.ok([...counts.values()].every(v => v === Math.sign(twice)), `${w}: each square counts the orientation`);
      }
    }
    checked++;
  }
  return checked;
}

const hintRun = (p, a, label, limit = 40) => {
  let steps = 0;
  for (; steps < limit && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${label}: hints keep naming a move`);
    assert.match(h.text, /^Move (east|west|north|south)\.$/, `${label}: hint text`);
    a = move(p, a, h.action);
    assert.ok(a, `${label}: the hinted move ${JSON.stringify(h.action)} is legal`);
  }
  assert.ok(isSolved(p, a.board), `${label}: hints finish the puzzle`);
  assert.equal(nextHint(p, a).type, 'done');
  return steps;
};
const go = (p, a, word) => [...word].reduce((x, c) => {
  if (!x) return null;
  const {x: px, y: py} = run(p.parameters.start || [0, 0], x.board.walk), [, dx, dy] = walkOf(c)[0];
  return move(p, x, {type: 'go', to: [px + dx, py + dy]});
}, a);

export default async function validateRobot() {
  const robot = JSON.parse(await readFile(new URL('../dist/families/robot/robot.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  const puzzles = robot.puzzles.filter(p => p.band !== 'playground'), playground = robot.puzzles.find(p => p.band === 'playground');
  assert.equal(puzzles.length, 12);
  assert.deepEqual(puzzles.map(p => p.number), range(1, 12));
  for (const level of ['easy', 'medium', 'hard']) assert.equal(puzzles.filter(p => p.difficulty_level === level).length, 4, `four ${level} puzzles`);
  for (const s of robot.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(robot.families[0].id, 'robot');
  assert.equal(new Set(puzzles.map(p => JSON.stringify(p.parameters))).size, 12, 'distinct puzzles');
  let hintSteps = 0, illegal = 0, forgeries = 0;
  const cut = [];
  for (const p of puzzles) {
    const q = p.parameters, label = p.id, start = q.start;
    assert.equal(p.id, `robot-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'robot'); assert.equal(p.band, 'all'); assert.equal(p.familyTitle, 'Memory robot');
    assert.equal(p.visibleObjective, '', `${label}: the board shows the goal`);
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    assert.ok([start, q.flag].every(c => Array.isArray(c) && c.length === 2 && inside(BOARD, ...c)), `${label}: start and flag on the board`);
    assert.ok(Number.isInteger(q.goal) && Number.isInteger(q.budget) && q.budget > 0, `${label}: goal and budget`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${label}: fresh board is valid`);
    assert.ok(!isSolved(p, fresh.board), `${label}: not solved at the start`);
    assert.ok(mechanicFor(p).render(p, fresh).length > 1000, `${label}: renders`);

    // The budget is the fewest moves, by the separate search, and the board
    // never makes it longer than the open plane does.
    const onBoard = search(start, q.flag, q.goal, BOARD), plane = search(start, q.flag, q.goal, PLANE);
    assert.equal(onBoard.len, q.budget, `${label}: the budget is the fewest moves`);
    assert.equal(plane.len, q.budget, `${label}: the board is big enough`);
    assert.equal(p.solution.fewest, q.budget);
    assert.equal(onBoard.count, p.solution.shortestWalks, `${label}: number of shortest walks`);
    if (plane.count !== onBoard.count) cut.push(`${label}: ${onBoard.count} of ${plane.count}`);
    if (q.flag[0] === start[0] && q.flag[1] === start[1]) assert.equal(q.budget, loopBound(q.goal), `${label}: a loop remembering ${q.goal} takes 2⌈2√n⌉`);
    // The witness, by the simulator, then as moves.
    const end = run(start, p.solution.walk);
    assert.deepEqual([end.x, end.y, end.z], [...q.flag, q.goal], `${label}: the witness reaches the goal`);
    const solved = go(p, fresh, p.solution.walk);
    assert.ok(solved && isSolved(p, solved.board), `${label}: the witness solves`);
    // Every walk of the budget's length that the simulator says stays on the
    // board and reaches the goal is a solve in the app, and every other is not.
    if (q.budget <= 8) {
      let solves = 0;
      for (const w of words(q.budget)) {
        const r = run(start, w), on = [...w].every((_, i) => { const t = run(start, w.slice(0, i + 1)); return inside(BOARD, t.x, t.y); });
        const right = on && r.x === q.flag[0] && r.y === q.flag[1] && r.z === q.goal;
        assert.equal(validBoard(p, {walk: w}), on, `${label}: ${w} is a legal save exactly when it stays on the board`);
        assert.equal(isSolved(p, {walk: w}), right, `${label}: ${w}`);
        if (right) solves++;
      }
      assert.equal(solves, p.solution.shortestWalks, `${label}: every shortest walk is accepted`);
    }

    // Hints alone: from fresh; after a wasted move; with the budget spent.
    hintSteps += hintRun(p, fresh, label);
    const wrong = [...words(1), ...words(2)].map(w => go(p, fresh, w)).find(a => a && nextHint(p, a).type === 'deadend');
    assert.ok(wrong, `${label}: one or two moves can waste the budget`);
    assert.match(nextHint(p, wrong).text, /Undo/, `${label}: a wasted move says Undo`);
    assert.equal(nextHint(p, undoToSolvable(p, wrong)).type, 'move', `${label}: Undo finds a finish again`);
    hintSteps += hintRun(p, undoToSolvable(p, wrong), `${label} after a wasted move`);
    let spent = null;
    for (const w of words(Math.min(q.budget, 6))) {
      const a = go(p, fresh, w + 'EW'.repeat((q.budget - w.length) / 2));
      if (a && a.board.walk.length === q.budget && !isSolved(p, a.board)) { spent = a; break; }
    }
    assert.ok(spent, `${label}: a spent budget`);
    assert.equal(nextHint(p, spent).type, 'deadend', `${label}: a spent budget is a dead end`);
    hintSteps += hintRun(p, undoToSolvable(p, spent), `${label} after Undo from a spent budget`);

    // Illegal moves: two blocks, a diagonal, off the board, past the budget,
    // after a solve, and moves that aren't moves.
    const [sx, sy] = start;
    for (const action of [{type: 'go', to: [sx + 2, sy]}, {type: 'go', to: [sx + 1, sy + 1]}, {type: 'go', to: [sx, sy]}, {type: 'go', to: [sx + .5, sy]}, {type: 'go', to: [sx + 1]}, {type: 'go', to: `${sx + 1},${sy}`}, {type: 'go'}, {type: 'step', to: [sx + 1, sy]}, {type: 'clear'}, null, 'E', [sx + 1, sy]]) {
      assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
      illegal++;
    }
    let edge = fresh;
    for (let i = 0; i < q.budget && run(start, edge.board.walk).x < HI; i++) edge = go(p, edge, 'E');
    if (edge.board.walk.length < q.budget) { assert.equal(go(p, edge, 'E'), null, `${label}: no step off the board`); illegal++; }
    assert.equal(go(p, spent, 'E') || go(p, spent, 'W'), null, `${label}: no move past the budget`);
    assert.equal(go(p, solved, 'E') || go(p, solved, 'N'), null, `${label}: no move after a solve`);
    illegal += 2;

    // Forged saves.
    const b = fresh.board;
    for (const f of [{walk: 'X'}, {walk: 'e'}, {walk: 'E N'}, {walk: ['E']}, {walk: 3}, {}, null, 'E', {...b, extra: 1}, {walk: '', moves: []},
      {walk: 'EW'.repeat(q.budget)}, {walk: 'W'.repeat(sx - LO + 1)}, {walk: p.solution.walk + 'E'}]) {
      assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f)}`);
      forgeries++;
    }
  }

  // The playground: free walking, Clear, the cap, never solved and no hints.
  assert.ok(playground);
  assert.equal(playground.mechanic, 'robot'); assert.equal(playground.parameters.mode, 'playground');
  let a = freshAttempt(playground);
  assert.deepEqual(a.board, {walk: ''});
  assert.equal(mechanicFor(playground).noHint(playground), true);
  assert.equal(nextHint(playground, a).type, 'note');
  a = go(playground, a, 'ENWSENWSWNNEESWW');
  assert.equal(a.board.walk, 'ENWSENWSWNNEESWW');
  assert.equal(run([0, 0], a.board.walk).z, [...shading({start: [0, 0]}, a.board.walk).values()].reduce((s, v) => s + v, 0));
  assert.ok(!isSolved(playground, a.board), 'the playground is never solved');
  assert.equal(move(playground, a, {type: 'clear'}).board.walk, '', 'Clear');
  assert.equal(move(playground, freshAttempt(playground), {type: 'clear'}), null, 'nothing to clear');
  assert.equal(go(playground, freshAttempt(playground), 'WWW'), null, 'the playground stays on the board');
  assert.equal(go(playground, freshAttempt(playground), 'NNNNN'), null);
  assert.ok(validBoard(playground, {walk: 'EW'.repeat(100)}), 'two hundred moves');
  assert.equal(move(playground, {...freshAttempt(playground), board: {walk: 'EW'.repeat(100)}}, {type: 'go', to: [1, 0]}), null, 'no more than two hundred');
  for (const f of [{walk: 'EW'.repeat(101)}, {walk: 'WWW'}, {walk: 'Q'}, {walk: '', extra: 1}, {}]) {
    assert.equal(validBoard(playground, f), false, `playground rejects ${JSON.stringify(f).slice(0, 60)}`);
    forgeries++;
  }
  return {puzzles: puzzles.length, theoremCases: theorems(), hintSteps, illegalMoves: illegal, forgeries, shortestWalksCutByTheBoard: cut};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateRobot(), null, 2));
