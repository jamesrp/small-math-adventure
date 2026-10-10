// Checks the Sharing circles pack (dist/families/averages/averages.json):
// content fields and sources; every answer recomputed by methods unlike the
// mechanic's (a brute-force search over every number on every free place,
// circles included, against a separate averaging check read straight off the
// edge list, where the mechanic solves the circles exactly by elimination;
// Gauss–Seidel relaxation in floating point for the real filling a tie board
// has, where the mechanic eliminates over fractions; union–find for the
// circle groups, where the mechanic searches outward); the theorems on 400
// random boards (uniqueness, the maximum principle and its equality case),
// every path of 2 to 6 circles between ends 0 to 12 (whole exactly when the
// number of steps divides the difference), and the squareless triangle
// (only constant fillings); witnesses played as moves; hint chains from fresh,
// after a wrong number, after a wrong That's all, after a wrong Can't and
// after random play with Undo; illegal moves; forged saves; the playground;
// and how long a hint or move takes.
// Run: node scripts/validate-averages.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {waysOf, fillingOf, tieCan, solve, playBoard, chaseNext} from '../dist/families/averages/averages.js';
import {loadPack} from './packs.mjs';

// The table in docs/averages/README.md: every way (the free places' numbers
// in `free` order), the tie filling, or the chase the hints tap.
const TABLE = {
  'averages-01': {ways: [[0, 3, 3], [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 2, 2], [2, 3, 1], [3, 0, 3], [3, 1, 2], [3, 2, 1], [3, 3, 0]]},
  'averages-02': {ways: [[0, 1, 2], [0, 2, 4], [1, 2, 3], [2, 1, 0], [2, 3, 4], [3, 2, 1], [4, 2, 0], [4, 3, 2]]},
  'averages-03': {ways: [[1, 11], [5, 7]]},
  'averages-04': {filling: {a: 4, b: 8}},
  'averages-05': {chase: ['b', 'a', 'z']},
  'averages-06': {ways: [[0, 4, 6], [1, 3, 4], [2, 2, 2], [3, 1, 0]]},
  'averages-07': {ways: [[0, 0, 0], [3, 1, 2], [6, 2, 4], [9, 3, 6]]},
  'averages-08': {chase: ['c', 'b', 'a', 'z']},
  'averages-09': {ways: [[0, 4, 12], [6, 7, 9]]},
  'averages-10': {ways: [[1, 2, 5], [6, 4, 6], [11, 6, 7]]},
  'averages-11': {chase: ['z', 'v', 'S']},
  'averages-12': {filling: {a: 5, b: 5, c: 8}}
};

// --- An independent model --------------------------------------------------------
// A circle works when the places joined to it, found by scanning the edge
// list, total its number times their count.
function circleOK(q, vals, c) {
  let count = 0, total = 0;
  for (const [u, v] of q.edges) {
    const other = u === c ? v : v === c ? u : null;
    if (other === null) continue;
    if (vals[other] === null || vals[other] === undefined) return false;
    count++; total += vals[other];
  }
  return count > 0 && vals[c] !== null && vals[c] !== undefined && total === count * vals[c];
}
const circlesOf = q => Object.keys(q.places).filter(id => q.places[id].shape === 'circle');
const squaresOf = q => Object.keys(q.places).filter(id => q.places[id].shape === 'square');
const everyOK = (q, vals) => circlesOf(q).every(c => circleOK(q, vals, c));
// Every assignment of the range to the free places, in lexicographic order.
function* assignments(q) {
  const [lo, hi] = q.range, way = q.free.map(() => lo);
  while (true) {
    yield [...way];
    let k = way.length - 1;
    while (k >= 0 && way[k] === hi) way[k--] = lo;
    if (k < 0) return;
    way[k]++;
  }
}
const asVals = (q, way) => ({...q.given, ...Object.fromEntries(q.free.map((id, i) => [id, way[i]]))});
function bruteWays(q) {
  const out = [];
  for (const way of assignments(q)) {
    const vals = asVals(q, way);
    if (q.cards && new Set(way).size !== way.length) continue;
    if (q.mode === 'change' && squaresOf(q).filter(s => vals[s] !== q.start[s]).length !== 1) continue;
    if (everyOK(q, vals)) out.push(way);
  }
  return out;
}
// Circle groups by union–find over circle–circle edges.
function groups(q) {
  const up = Object.fromEntries(circlesOf(q).map(c => [c, c])), find = c => up[c] === c ? c : (up[c] = find(up[c]));
  for (const [u, v] of q.edges) if (up[u] !== undefined && up[v] !== undefined) up[find(u)] = find(v);
  const out = {};
  for (const c of circlesOf(q)) (out[find(c)] ||= {circles: [], squares: new Set()}).circles.push(c);
  for (const [u, v] of q.edges) for (const [a, b] of [[u, v], [v, u]]) if (up[a] !== undefined && up[b] === undefined) out[find(a)].squares.add(b);
  return Object.fromEntries(circlesOf(q).map(c => [c, out[find(c)]]));
}
// The real filling with every circle free, by Gauss–Seidel relaxation (it
// converges because every circle group touches a square).
function relax(q, squares) {
  const h = {...squares}, nb = {};
  for (const c of circlesOf(q)) { h[c] = 0; nb[c] = []; }
  for (const [u, v] of q.edges) { if (nb[u]) nb[u].push(v); if (nb[v]) nb[v].push(u); }
  for (let it = 0; it < 20000; it++) {
    let change = 0;
    for (const c of circlesOf(q)) { const x = nb[c].reduce((s, v) => s + h[v], 0) / nb[c].length; change = Math.max(change, Math.abs(x - h[c])); h[c] = x; }
    if (change < 1e-13) break;
  }
  return h;
}
const near = (x, y) => Math.abs(x - y) < 1e-7;

// --- Playing ---------------------------------------------------------------------
let slowest = 0;
const timed = f => { const t = performance.now(), out = f(); slowest = Math.max(slowest, performance.now() - t); return out; };
const play = (p, a, action) => { const next = timed(() => move(p, a, action)); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// Undo as the app does it, with the mechanic's carry.
function undoCarry(p, a) {
  const back = undo(a), carry = mechanicFor(p).carry;
  return back === a || !carry ? back : {...back, board: carry(p, a.board, back.board)};
}
// Set each free place to a way's number, skipping places that already hold it.
function setAll(p, a, values) {
  for (const [id, value] of Object.entries(values)) if (a.board.values[id] !== value) a = play(p, a, {type: 'set', id, value});
  return a;
}
const wayValues = (q, way) => Object.fromEntries(q.free.map((id, i) => [id, way[i]]));
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const h = timed(() => nextHint(p, a));
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: a hint has words`);
    a = play(p, a, h.action);
    assert.ok(validBoard(p, a.board), `${p.id} ${label}: hints keep the board valid`);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// A seeded random source, so a failure can be replayed.
function seeded(seed) { return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }

// --- The theorems ---------------------------------------------------------------
function randomBoard(rand) {
  const n = 4 + Math.floor(rand() * 5), ids = Array.from({length: n}, (_, i) => `n${i}`), places = {}, edges = [];
  const nSquares = 1 + Math.floor(rand() * Math.min(3, n - 2));
  ids.forEach((id, i) => { places[id] = {at: [10 + 80 * rand(), 10 + 80 * rand()], shape: i < nSquares ? 'square' : 'circle', name: id}; });
  // A random spanning tree, then a few more edges.
  for (let i = 1; i < n; i++) edges.push([ids[Math.floor(rand() * i)], ids[i]]);
  for (let k = Math.floor(rand() * n); k > 0; k--) {
    const u = ids[Math.floor(rand() * n)], v = ids[Math.floor(rand() * n)];
    if (u !== v && !edges.some(([a, b]) => (a === u && b === v) || (a === v && b === u))) edges.push([u, v]);
  }
  const squares = Object.fromEntries(ids.slice(0, nSquares).map(s => [s, Math.floor(rand() * 13)]));
  return {places, edges, aspect: 1, scale: 1, squares};
}
function checkTheorems() {
  const rand = seeded(20), counts = {randomBoards: 0, randomTies: 0, randomTiesPossible: 0, pathsChecked: 0};
  for (let k = 0; k < 400; k++) {
    const board = randomBoard(rand), {squares} = board, circles = circlesOf(board);
    const q = {mode: 'tie', ...board, given: squares, free: circles, range: [0, 12]};
    const h = relax(q, squares), exact = solve(q, squares), M = Math.max(...Object.values(squares)), g = groups(q);
    assert.ok(exact, `random board ${k}: one filling (every circle group touches a square)`);
    for (const c of circles) {
      const [num, den] = exact[c], touching = [...g[c].squares].map(s => squares[s]);
      assert.ok(near(num / den, h[c]), `random board ${k}: elimination agrees with relaxation at ${c}`);
      assert.ok(h[c] >= Math.min(...touching) - 1e-9 && h[c] <= Math.max(...touching) + 1e-9, `random board ${k}: ${c} between the squares its group touches`);
      if (new Set(touching).size > 1) assert.ok(h[c] > Math.min(...touching) + 1e-9 && h[c] < Math.max(...touching) - 1e-9, `random board ${k}: ${c} strictly between`);
      // The equality case, as a tie puzzle: give c the biggest square's number.
      const tie = {...q, given: {...squares, [c]: M}, free: circles.filter(x => x !== c), target: c};
      assert.equal(tieCan(tie), near(h[c], M), `random board ${k}: ${c} can tie ${M} exactly when its group touches only ${M}s`);
      assert.equal(tieCan(tie), [...g[c].squares].every(s => squares[s] === M), `random board ${k}: tieCan is the group test`);
      counts.randomTies++; counts.randomTiesPossible += tieCan(tie);
    }
    counts.randomBoards++;
  }
  // Paths: L steps between whole ends A and B have whole circles exactly when L divides B − A.
  for (let L = 3; L <= 7; L++) for (let A = 0; A <= 12; A++) for (let B = 0; B <= 12; B++) {
    const ids = Array.from({length: L + 1}, (_, i) => `x${i}`), places = Object.fromEntries(ids.map((id, i) => [id, {at: [i * 10, 50], shape: i === 0 || i === L ? 'square' : 'circle', name: id}]));
    const q = {mode: 'every', places, edges: ids.slice(1).map((id, i) => [ids[i], id]), aspect: 4, scale: 1, given: {x0: A, [`x${L}`]: B}, free: ids.slice(1, -1), range: [0, 12]};
    const s = solve(q, q.given);
    assert.equal(Object.values(s).every(([, den]) => den === 1), (B - A) % L === 0, `path of ${L} steps from ${A} to ${B}`);
    Object.values(s).forEach(([num, den], i) => assert.ok(near(num / den, A + (B - A) * (i + 1) / L), `path of ${L} steps: equal steps`));
    counts.pathsChecked++;
  }
  return counts;
}

// --- The puzzles -----------------------------------------------------------------
export async function validateAverages() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/averages/averages.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-20')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-20.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'averages');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  const theorems = checkTheorems();
  let hintSteps = 0, waysChecked = 0, assignmentsSearched = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'averages');
    assert.ok(p.id.startsWith('averages-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(p.visibleObjective.split(/[.!?](\s|$)/).filter(s => s && s.trim()).length <= 2, `${p.id}: a short visible objective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    assert.ok(!/press can.t/i.test(p.hints[0]), `${p.id}: the first hint never says Press Can’t`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);

    // The board: names, no lonely circle, every circle group reaching a square.
    const names = Object.values(q.places).map(x => x.name);
    assert.equal(new Set(names).size, names.length, `${p.id}: every place has its own name`);
    assert.ok(circlesOf(q).every(c => q.edges.some(e => e.includes(c))), `${p.id}: no lonely circle`);
    const g = groups(q);
    assert.ok(circlesOf(q).every(c => g[c].squares.size > 0), `${p.id}: every circle group touches a square`);
    assert.deepEqual([...Object.keys(q.given), ...q.free].sort(), Object.keys(q.places).sort(), `${p.id}: every place is given or free, once`);
    assert.ok(q.free.length <= 3 && q.range[1] - q.range[0] <= 12, `${p.id}: a search the size of a child’s`);

    const row = TABLE[p.id];
    if (q.mode === 'every' || q.mode === 'change') {
      const brute = bruteWays(q);
      assignmentsSearched += (q.range[1] - q.range[0] + 1) ** q.free.length;
      assert.deepEqual(brute, row.ways, `${p.id}: every way, by brute force`);
      assert.deepEqual(waysOf(q), brute, `${p.id}: the mechanic agrees`);
      waysChecked += brute.length;
      if (q.mode === 'change') {
        // The start fails, and each way changes one square away from it.
        const startVals = {...q.given, ...q.start};
        const h = relax(q, Object.fromEntries(squaresOf(q).map(s => [s, startVals[s]])));
        assert.ok(circlesOf(q).filter(c => Object.hasOwn(q.given, c)).some(c => !near(h[c], q.given[c])), `${p.id}: the start squares don’t make the given circle work`);
      }
      hintSteps += checkEvery(p, fresh, row.ways);
    } else {
      assert.equal(q.mode, 'tie');
      const M = q.given[q.target], squares = Object.fromEntries(squaresOf(q).map(s => [s, q.given[s]]));
      assert.equal(M, Math.max(...Object.values(squares)), `${p.id}: the given circle has the biggest square’s number`);
      const fills = [...assignments(q)].filter(way => everyOK(q, asVals(q, way)));
      assignmentsSearched += (q.range[1] - q.range[0] + 1) ** q.free.length;
      const h = relax(q, squares);
      if (row.filling) {
        assert.deepEqual(fills, [q.free.map(c => row.filling[c])], `${p.id}: one filling, by brute force`);
        assert.ok(near(h[q.target], M), `${p.id}: relaxation puts the given circle at ${M}`);
        assert.ok(circlesOf(q).every(c => near(h[c], asVals(q, fills[0])[c])), `${p.id}: and agrees with the filling`);
        assert.deepEqual(Object.fromEntries(q.free.map(c => [c, fillingOf(q)[c]])), row.filling, `${p.id}: the mechanic agrees`);
        assert.ok(tieCan(q) && [...g[q.target].squares].every(s => q.given[s] === M), `${p.id}: the group touches only ${M}s`);
      } else {
        assert.deepEqual(fills, [], `${p.id}: no whole filling, by brute force`);
        assert.ok(h[q.target] < M - 1e-6, `${p.id}: the one real filling puts the given circle below ${M} (${h[q.target].toFixed(3)})`);
        assert.equal(fillingOf(q), null, `${p.id}: the mechanic agrees`);
        // The certificate: a walk from the given circle through circles to a smaller square.
        const c = row.chase;
        assert.equal(c[0], q.target);
        for (let k = 1; k < c.length; k++) assert.ok(q.edges.some(([u, v]) => (u === c[k - 1] && v === c[k]) || (v === c[k - 1] && u === c[k])), `${p.id}: the chase follows edges`);
        assert.ok(c.slice(0, -1).every(x => q.places[x].shape === 'circle') && q.places[c.at(-1)].shape === 'square' && q.given[c.at(-1)] < M, `${p.id}: through circles to a smaller square`);
        assert.ok([...g[q.target].squares].some(s => q.given[s] < M), `${p.id}: the group touches a smaller square`);
      }
      hintSteps += checkTie(p, fresh, row);
    }
    hintSteps += checkRefusals(p, fresh);
    hintSteps += wander(p, fresh);
  }
  return {averagesPuzzles: puzzles.length, waysChecked, assignmentsSearched, ...theorems, hintSteps, slowestMoveOrHintMs: Number(slowest.toFixed(1))};
}

function checkEvery(p, fresh, ways) {
  const q = p.parameters;
  let steps = 0, a = fresh;
  // Witnesses: every way, played as numbers; each is kept the moment it is made.
  for (const [k, way] of ways.entries()) {
    a = setAll(p, a, wayValues(q, way));
    assert.ok(a.board.found.some(w => w.join() === way.join()), `${p.id}: way ${way} is kept`);
    if (k === 1) {
      const again = setAll(p, a, wayValues(q, ways[0]));
      assert.equal(again.board.again, again.board.found.findIndex(w => w.join() === ways[0].join()), `${p.id}: found already`);
      assert.equal(again.board.found.length, a.board.found.length, `${p.id}: nothing new`);
    }
    if (k < ways.length - 1) assert.ok(!isSolved(p, a.board), `${p.id}: not solved before That’s all`);
  }
  assert.deepEqual([...a.board.found].sort().join('|'), [...ways].sort().join('|'), `${p.id}: every way found`);
  const done = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, done.board), `${p.id}: That’s all after every way`);
  refuse(p, done, {type: 'set', id: q.free[0], value: q.range[0]}, 'a move after a solve');
  // That's all too soon: refused, held through Undo, lifted by a new way.
  const early = play(p, fresh, {type: 'all'});
  assert.equal(early.board.more, true, `${p.id}: there is another`);
  refuse(p, early, {type: 'all'}, 'That’s all again before a new way');
  steps += hintsSolve(p, early, 'after a wrong That’s all');
  const one = setAll(p, early, wayValues(q, ways[0]));
  assert.equal(one.board.more, false, `${p.id}: a new way lifts “there is another”`);
  if (ways.length > 1) {
    const refused = play(p, one, {type: 'all'});
    assert.equal(refused.board.more, true);
    const back = undoCarry(p, refused);
    assert.equal(back.board.more, true, `${p.id}: Undo keeps a refused That’s all`);
    assert.ok(validBoard(p, back.board));
    refuse(p, back, {type: 'all'}, 'That’s all after Undo');
    const lastBack = undoCarry(p, back);
    assert.deepEqual(lastBack.board.found, one.board.found, `${p.id}: Undo keeps the ways found`);
  }
  steps += hintsSolve(p, fresh, 'from fresh');
  // A wrong number first: the first free place set to a number on no way.
  const id = q.free[0], wrong = [...Array(q.range[1] - q.range[0] + 1).keys()].map(v => v + q.range[0]).find(v => !ways.some(w => w[0] === v) && v !== fresh.board.values[id]);
  if (wrong !== undefined) {
    const b = play(p, fresh, {type: 'set', id, value: wrong});
    const h = nextHint(p, b);
    assert.ok(h.action.type === 'set', `${p.id}: after a wrong number the hint sets a number`);
    steps += hintsSolve(p, b, 'after a wrong number');
  }
  return steps;
}

function checkTie(p, fresh, row) {
  const q = p.parameters, M = q.given[q.target], group = groups(q)[q.target].circles;
  const mine = group.filter(c => q.free.includes(c)), outside = q.free.filter(c => !group.includes(c));
  let steps = hintsSolve(p, fresh, 'from fresh');
  refuse(p, fresh, {type: 'cant'}, 'Can’t before an attempt');
  // A number on a circle outside the given circle's group is no attempt at the claim.
  if (outside.length) refuse(p, play(p, fresh, {type: 'set', id: outside[0], value: M}), {type: 'cant'}, 'Can’t after a number away from the given circle’s group');
  const first = nextHint(p, fresh);
  assert.equal(first.action.type, 'set', `${p.id}: the first hint is an attempt, never Can’t`);
  if (row.filling) {
    assert.ok(isSolved(p, setAll(p, fresh, row.filling).board), `${p.id}: the filling solves`);
    // A wrong Can't: the hint ends it; tapped through, it runs out, and that is
    // kept through Undo until a number changes.
    let b = play(p, play(p, fresh, {type: 'set', id: mine[0], value: M === 0 ? 1 : 0}), {type: 'cant'});
    assert.equal(nextHint(p, b).action.type, 'stop', `${p.id}: after a wrong Can’t the hint stops the chase`);
    steps += hintsSolve(p, b, 'after a wrong Can’t');
    while (b.board.chase) { const next = chaseNext(q, b.board.chase); assert.ok(next.length, `${p.id}: a chase never rests with nothing to tap`); b = play(p, b, {type: 'chase', id: next.at(-1)}); }
    assert.equal(b.board.told, 'out', `${p.id}: the chase runs out`);
    assert.ok(!isSolved(p, b.board));
    refuse(p, b, {type: 'cant'}, 'Can’t again before a number changes');
    let back = b;
    for (let k = 0; k < 10; k++) {
      back = undoCarry(p, back);
      assert.ok(back.board.told === 'out' && back.board.chase === null && validBoard(p, back.board), `${p.id}: Undo ${k + 1} keeps the chase that ran out`);
    }
    refuse(p, back, {type: 'cant'}, 'Can’t after Undo');
    const changed = play(p, b, {type: 'set', id: mine[0], value: M});
    assert.equal(changed.board.told, null, `${p.id}: a new number lifts it`);
    assert.deepEqual(play(p, changed, {type: 'cant'}).board.chase, [q.target], `${p.id}: Can’t opens again`);
    steps += hintsSolve(p, b, 'after a chase that ran out') + hintsSolve(p, back, 'after Undo past a chase that ran out');
    return steps;
  }
  // Can't: an attempt in the group, the reason, the claim, the chase.
  assert.ok(mine.includes(first.action.id), `${p.id}: the hints’ attempt is in the given circle’s group`);
  const tried = play(p, fresh, {type: 'set', id: first.action.id, value: first.action.value});
  const why = nextHint(p, tried);
  assert.equal(why.action.type, 'cant', `${p.id}: after an attempt the hint gives the reason`);
  assert.match(why.text, /must be .* can’t be\.$/, `${p.id}: the reason`);
  assert.ok(!/press can.t/i.test(why.text), `${p.id}: the level-1 text leaves the button to level 2`);
  const claimed = play(p, tried, {type: 'cant'});
  assert.ok(!isSolved(p, claimed.board), `${p.id}: a bare Can’t is not a solve`);
  assert.equal(undoCarry(p, claimed).board.chase, null, `${p.id}: Undo takes back the claim, which marked nothing`);
  let a = claimed;
  for (const id of row.chase.slice(1)) a = play(p, a, {type: 'chase', id});
  assert.ok(isSolved(p, a.board), `${p.id}: the chase to a smaller square solves`);
  refuse(p, a, {type: 'stop'}, 'a move after a solve');
  // A tap on any place not joined to the chase ends it with one refusal, so
  // Can't must be pressed again; a tap on a place already in it does nothing.
  for (const x of Object.keys(q.places).filter(x => x !== q.target && !chaseNext(q, [q.target]).includes(x))) {
    const off = play(p, claimed, {type: 'chase', id: x});
    assert.ok(off.board.chase === null && off.board.told === 'apart', `${p.id}: a tap on ${x} ends the chase`);
    assert.deepEqual(play(p, off, {type: 'cant'}).board, {...off.board, chase: [q.target], told: null}, `${p.id}: Can’t again starts afresh`);
  }
  refuse(p, claimed, {type: 'chase', id: q.target}, 'a tap on a place already in the chase');
  // A chase that wanders to an agreeing square first still finishes by hints.
  let b = claimed;
  const agree = chaseNext(q, b.board.chase).find(x => q.places[x].shape === 'square' && q.given[x] === M);
  if (agree) b = play(p, b, {type: 'chase', id: agree});
  steps += hintsSolve(p, b, 'after a wandering chase');
  const stopped = play(p, b, {type: 'stop'});
  assert.equal(stopped.board.chase, null);
  steps += hintsSolve(p, stopped, 'after stopping a chase');
  return steps;
}

// Thirty random legal moves, with Undo now and then; the board stays valid and
// hints still finish.
function wander(p, fresh) {
  const q = p.parameters, rand = seeded(p.number * 7919);
  let a = fresh, steps = 0;
  for (let k = 0; k < 30 && !isSolved(p, a.board); k++) {
    if (rand() < 0.2) { a = undoCarry(p, a); assert.ok(validBoard(p, a.board), `${p.id}: valid after Undo`); continue; }
    const options = [];
    if (q.mode !== 'tie' || a.board.chase === null) for (const id of q.free) options.push({type: 'set', id, value: q.range[0] + Math.floor(rand() * (q.range[1] - q.range[0] + 1))});
    if (q.mode === 'tie') { options.push({type: a.board.chase ? 'stop' : 'cant'}); if (a.board.chase) for (const id of Object.keys(q.places)) options.push({type: 'chase', id}); }
    else if (rand() < 0.1) options.push({type: 'all'});
    const action = options[Math.floor(rand() * options.length)], next = move(p, a, action);
    if (next) { a = next; assert.ok(validBoard(p, a.board), `${p.id}: valid after ${JSON.stringify(action)}`); }
  }
  return isSolved(p, a.board) ? steps : hintsSolve(p, a, 'after random play with Undo');
}

function checkRefusals(p, fresh) {
  const q = p.parameters, B = fresh.board, given = Object.keys(q.given)[0], id = q.free[0];
  for (const [action, why] of [[null, 'nothing'], ['set', 'a string'], [{type: 'set'}, 'no place'], [{type: 'set', id: 'zz', value: 1}, 'an unknown place'], [{type: 'set', id: given, value: 1}, 'a given place'], [{type: 'set', id, value: q.range[1] + 1}, 'a number past the range'], [{type: 'set', id, value: q.range[0] - 1}, 'a number below the range'], [{type: 'set', id, value: 1.5}, 'a fraction'], [{type: 'set', id, value: '3'}, 'a number as a string'], [{type: 'set', id, value: null}, 'clearing a place'], [{type: 'board', board: 'path'}, 'a board change'], [{type: 'chase', id}, 'a chase with no claim'], [{type: 'stop'}, 'stopping no chase'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  if (q.mode === 'tie') {
    refuse(p, fresh, {type: 'all'}, 'That’s all in a tie puzzle');
    const mine = groups(q)[q.target].circles.find(c => q.free.includes(c));
    const a = play(p, play(p, fresh, {type: 'set', id: mine, value: q.range[0]}), {type: 'cant'});
    refuse(p, a, {type: 'set', id: mine, value: q.range[1]}, 'a number during a chase');
    refuse(p, a, {type: 'cant'}, 'Can’t twice');
    refuse(p, a, {type: 'chase', id: q.target}, 'the given circle again');
    refuse(p, a, {type: 'chase', id: 'zz'}, 'an unknown place');
    const far = Object.keys(q.places).find(x => x !== q.target && !chaseNext(q, a.board.chase).includes(x));
    // The whole chase on a board where the tie is possible: it would have run out.
    const all = [q.target, ...Object.keys(q.places).filter(x => x !== q.target && (groups(q)[q.target].circles.includes(x) || groups(q)[q.target].squares.has(x)))];
    const forged = [
      [{...a.board, told: 'apart'}, 'a refusal during a chase'],
      [{...a.board, chase: null, told: 'maybe'}, 'an unknown refusal'],
      [{values: a.board.values, chase: null}, 'a missing refusal field'],
      [{...B, chase: [q.target]}, 'a chase with no attempt'],
      [{...a.board, chase: [far || q.free[0]]}, 'a chase not from the given circle'],
      ...(far ? [[{...a.board, chase: [q.target, far]}, 'a chase that jumps']] : []),
      [{...a.board, chase: [q.target, q.target]}, 'a place chased twice'],
      [{...B, values: {...B.values, [id]: 13}}, 'a number past the range'],
      [{...B, values: {...B.values, [given]: 1}}, 'a number on a given place'],
      [{values: B.values, told: null}, 'a missing chase'],
      [{...B, extra: 1}, 'an unknown field']
    ];
    const row = TABLE[p.id];
    if (row.chase) forged.push([{...a.board, chase: [...row.chase, chaseNext(q, row.chase)[0]].filter(Boolean)}, 'a chase past its smaller square']);
    if (row.filling) forged.push([{values: {...row.filling}, chase: [q.target], told: null}, 'a chase on a board where every circle works'], [{...a.board, chase: all}, 'a chase that ran out but goes on']);
    else forged.push([{...a.board, chase: null, told: 'out'}, 'a chase that ran out where a smaller square is reached']);
    for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    return 0;
  }
  refuse(p, fresh, {type: 'cant'}, 'Can’t in a find-every puzzle');
  const ways = TABLE[p.id].ways, notWay = q.free.map(() => q.range[0] + 1 === q.range[1] ? q.range[0] : q.range[0] + 1);
  const forged = [
    [{...B, found: [notWay]}, 'a found way that does not work'],
    [{...B, found: [ways[0], ways[0]]}, 'a way found twice'],
    [{...B, done: true}, 'That’s all before every way'],
    [{...B, found: ways.map(w => [...w]), more: true}, '“there is another” when none is'],
    [{...B, found: ways.map(w => [...w]), done: true, more: true}, 'done and another at once'],
    [{...B, again: 0}, '“found already” with nothing found'],
    [{...B, values: wayValues(q, ways[0])}, 'a way on the board not kept'],
    [{...B, found: [ways[0]], again: 0}, '“found already” for a way not on the board'],
    [{...B, values: {...B.values, [id]: q.range[1] + 1}}, 'a number past the range'],
    [{...B, values: {...B.values, [id]: 0.5}}, 'a fraction'],
    [{...B, values: {...B.values, zz: 1}}, 'an unknown place'],
    [{...B, more: 'yes'}, 'a flag that is not true or false'],
    [{...B, extra: 1}, 'an unknown field']
  ];
  if (q.cards) forged.push([{...B, values: Object.fromEntries(q.free.map(x => [x, q.range[0]]))}, 'a card on two places']);
  if (q.mode === 'change') {
    const [s1, s2] = q.free.filter(x => q.places[x].shape === 'square');
    forged.push([{...B, values: {...B.values, [s1]: q.start[s1] + 1, [s2]: q.start[s2] === 0 ? 1 : q.start[s2] - 1}}, 'two squares changed']);
    forged.push([{...B, values: {...B.values, [s1]: null}}, 'an empty square']);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  // Cards move: a number put on a second place leaves the first.
  if (q.cards) {
    const a = play(p, play(p, fresh, {type: 'set', id: q.free[0], value: 1}), {type: 'set', id: q.free[1], value: 1});
    assert.equal(a.board.values[q.free[0]], null, `${p.id}: a card moves`);
  }
  // A change puzzle puts the first square back when a second changes.
  if (q.mode === 'change') {
    const [s1, s2] = q.free.filter(x => q.places[x].shape === 'square'), a = play(p, play(p, fresh, {type: 'set', id: s1, value: (q.start[s1] + 1) % 13}), {type: 'set', id: s2, value: (q.start[s2] + 1) % 13});
    assert.equal(a.board.values[s1], q.start[s1], `${p.id}: one square changes at a time`);
  }
  return 0;
}

function checkPlayground(p, fresh) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done', `${p.id}: no hints`);
  for (const [name, board] of Object.entries(q.boards)) {
    let a = name === fresh.board.board ? fresh : play(p, fresh, {type: 'board', board: name});
    const bq = playBoard(q, a.board);
    assert.deepEqual(Object.fromEntries(Object.entries(a.board.values).filter(([, v]) => v !== null)), board.start, `${p.id}: ${name} starts with its squares`);
    const g = groups(bq), squares = squaresOf(bq);
    if (!squares.length) {
      // No squares: a filling works exactly when every circle is the same.
      let works = 0;
      for (const way of assignments(bq)) { const ok = everyOK(bq, asVals(bq, way)); assert.equal(ok, new Set(way).size === 1, `${p.id}: ${name}: only constant fillings`); works += ok; }
      assert.equal(works, 13, `${p.id}: ${name}: one filling per number`);
      a = setAll(p, a, Object.fromEntries(bq.free.map(id => [id, 5])));
    } else {
      assert.ok(circlesOf(bq).every(c => g[c].squares.size), `${p.id}: ${name}: every circle group touches a square`);
      const h = relax(bq, board.start);
      assert.ok(circlesOf(bq).every(c => Number.isInteger(Math.round(h[c])) && near(h[c], Math.round(h[c]))), `${p.id}: ${name}: its start squares fill with whole numbers`);
      a = setAll(p, a, Object.fromEntries(circlesOf(bq).map(c => [c, Math.round(h[c])])));
    }
    assert.ok(everyOK(bq, a.board.values), `${p.id}: ${name}: every circle can work`);
    assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
    refuse(p, a, {type: 'all'}, 'That’s all in the playground');
    refuse(p, a, {type: 'cant'}, 'Can’t in the playground');
    refuse(p, a, {type: 'set', id: 'zz', value: 1}, 'an unknown place');
  }
  refuse(p, fresh, {type: 'board', board: 'moon'}, 'an unknown board');
  refuse(p, fresh, {type: 'board', board: fresh.board.board}, 'the same board');
  for (const [board, why] of [[{...fresh.board, board: 'moon'}, 'an unknown board'], [{...fresh.board, values: {...fresh.board.values, A: 13}}, 'a number past the range'], [{...fresh.board, found: []}, 'an unknown field'], [{board: fresh.board.board}, 'no values']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export default validateAverages;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateAverages(), null, 2));
