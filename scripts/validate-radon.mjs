// Checks the Stretch bands pack (dist/families/radon/radon.json): content
// fields and sources; every answer recomputed by linear programming, not by
// the mechanic's hull tests (two bands meet when some weighting of one group's
// dots, weights at least 0 and adding to 1, lands on a weighting of the
// other's: the validator looks for such weights among the basic solutions,
// in exact fractions); Radon's theorem and the counts the spec states over
// every placement of four labels on a 3 × 3 grid of points and every place for
// D against the fixed triangle; every lattice point of every place puzzle and
// of the locus board; that bands that miss stay well apart (so no gap hides
// under a disc); that no single move solves the two-board puzzle;
// witnesses played as moves; hint chains from fresh, after wrong moves and
// claims and from random states; Undo keeping claims; illegal moves; forged
// saves; the playground; and the time hints and moves take.
// Run: node scripts/validate-radon.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {meetingSplits} from '../dist/families/radon/radon.js';
import {loadPack} from './packs.mjs';

// --- Exact fractions on ordinary numbers (every value here stays small) ------
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const fr = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); assert.ok(Number.isSafeInteger(n) && Number.isSafeInteger(d)); return [n / g, d / g]; };
const sub = ([a, b], [c, d]) => fr(a * d - c * b, b * d), mul = ([a, b], [c, d]) => fr(a * c, b * d), div = ([a, b], [c, d]) => fr(a * d, b * c);
// Do the bands of P and Q meet? Unknowns: a weight for each dot of P and of Q.
// Equations: the two weighted sums agree in x and in y, P's weights add to 1,
// Q's add to 1. A feasible system has a basic solution: some independent set
// of at most four columns solves it with weights at least 0.
function lpMeet(P, Q) {
  const cols = [...P.map(p => [p[0], p[1], 1, 0]), ...Q.map(q => [-q[0], -q[1], 0, 1])], rhs = [0, 0, 1, 1], n = cols.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const S = cols.filter((_, i) => mask >> i & 1);
    if (S.length > 4) continue;
    const rows = rhs.map((r, i) => [...S.map(c => fr(c[i])), fr(r)]);
    let rank = 0; const pivots = [];
    for (let c = 0; c < S.length; c++) {
      const r = rows.findIndex((row, i) => i >= rank && row[c][0] !== 0);
      if (r < 0) continue;
      [rows[rank], rows[r]] = [rows[r], rows[rank]];
      for (let i = 0; i < rows.length; i++) if (i !== rank && rows[i][c][0] !== 0) { const k = div(rows[i][c], rows[rank][c]); rows[i] = rows[i].map((v, j) => sub(v, mul(k, rows[rank][j]))); }
      pivots.push(c); rank++;
    }
    if (rank !== S.length || rows.slice(rank).some(row => row.at(-1)[0] !== 0)) continue;
    if (pivots.every((c, i) => div(rows[i].at(-1), rows[i][c])[0] >= 0)) return true;
  }
  return false;
}
// Splits by brute force over subsets: every group containing the first letter
// that is not the whole set, written "group|rest" in the order the spec lists.
function splits(letters) {
  const [first, ...rest] = letters, out = [];
  for (let mask = 0; mask < (1 << rest.length) - 1; mask++) out.push([first, ...rest.filter((_, i) => mask >> i & 1)]);
  return out.sort((x, y) => x.length - y.length || x.join('').localeCompare(y.join(''))).map(g => `${g.join('')}|${letters.filter(l => !g.includes(l)).join('')}`);
}
const lpSplits = pos => { const letters = Object.keys(pos).sort(); return splits(letters).filter(k => { const [g, h] = k.split('|').map(s => [...s]); return lpMeet(g.map(l => pos[l]), h.map(l => pos[l])); }); };
const lattice = q => { const out = []; for (let y = q.rows; y >= 0; y--) for (let x = 0; x <= q.cols; x++) out.push([x, y]); return out; };
const same = (p, q) => p[0] === q[0] && p[1] === q[1];
const key = p => `${p[0]},${p[1]}`;
const collinear = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) === (b[1] - a[1]) * (c[0] - a[0]);
// The smallest gap between the two groups' dots and segments over the splits
// that miss: the distance from each dot of one group to each segment between
// two dots of the other (the bands are the hulls of those segments).
const segGap = (p, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], L = d[0] ** 2 + d[1] ** 2; const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L)) : 0; return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1]); };
function missGap(pos) {
  const met = lpSplits(pos);
  let least = Infinity;
  for (const k of splits(Object.keys(pos).sort())) {
    if (met.includes(k)) continue;
    const [g, h] = k.split('|').map(s => [...s].map(l => pos[l]));
    for (const [one, other] of [[g, h], [h, g]]) for (const p of one) for (const a of other) for (const b of other) least = Math.min(least, segGap(p, a, b));
  }
  return least;
}

// The table in docs/radon/README.md.
const TABLE = {
  'radon-01': {mode: 'every', level: 'easy', answers: ['AB|CD', 'ABC|D']},
  'radon-02': {mode: 'place', level: 'easy', answers: [[2, 3], [2, 2], [3, 2]]},
  'radon-03': {mode: 'every', level: 'easy', answers: []},
  'radon-04': {mode: 'every', level: 'medium', answers: ['AB|CD', 'AD|BC', 'ABD|C', 'ACD|B']},
  'radon-05': {mode: 'place', level: 'medium', count: 19},
  'radon-06': {mode: 'locus', level: 'medium', answers: [[8, 4], [4, 2], [0, 0]]},
  'radon-07': {mode: 'place', level: 'medium', answers: [[6, 1]]},
  'radon-08': {mode: 'every', level: 'hard', answers: ['A|BCD', 'AB|CD', 'AC|BD', 'ABC|D']},
  'radon-09': {mode: 'place', level: 'hard', answers: [[5, 1]]},
  'radon-10': {mode: 'pair', level: 'hard', moves: 2}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// Undo as dist/main.js does it: the previous board, then the family's carry.
const undoMove = (p, a) => { const next = undo(a); return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
// Every hint and move is timed. A shared machine pauses now and then, so the
// check is on the 99th percentile, with a loose bound on the slowest.
const times = [];
const timed = fn => { const t = performance.now(), out = fn(); times.push(performance.now() - t); return out; };
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 60; steps++) {
    const h = timed(() => nextHint(p, a));
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${JSON.stringify(h)})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: a hint has words`);
    a = timed(() => play(p, a, h.action));
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// A small seeded generator, so the random states are the same every run.
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
const pick = (r, list) => list[Math.floor(r() * list.length)];

export async function validateRadon() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/radon/radon.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-22')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-22.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'radon');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');

  // The theorems over every placement of four labels on a 3 × 3 grid of points
  // (labels may share a point), by linear programming, against the mechanic.
  const nine = lattice({cols: 2, rows: 2});
  const counts = {};
  let placements = 0;
  for (const A of nine) for (const B of nine) for (const C of nine) for (const D of nine) {
    const pos = {A, B, C, D}, lp = lpSplits(pos), n = new Set([A, B, C, D].map(key)).size;
    assert.deepEqual(meetingSplits(pos), lp, `${JSON.stringify(pos)}: the mechanic agrees with the program`);
    counts[lp.length] = (counts[lp.length] || 0) + 1;
    assert.ok(lp.length >= 1, 'Radon: four labels always have a split that meets');
    const triples = [[A, B, C], [A, B, D], [A, C, D], [B, C, D]].filter(t => new Set(t.map(key)).size === 3 && collinear(...t)).length;
    if (n === 4 && !triples) assert.equal(lp.length, 1, 'general position: exactly one');
    if (n === 4 && triples === 1) assert.equal(lp.length, 2, 'one triple on a line: two');
    if (n === 4 && triples === 4) assert.equal(lp.length, 4, 'four on a line: four');
    if (n < 4) assert.ok(lp.length >= 4, 'two labels on one point: at least four');
    placements++;
  }
  assert.equal(placements, 6561);
  assert.deepEqual(Object.keys(counts).map(Number).sort(), [1, 2, 4, 5, 6, 7], 'never 0 or 3 splits');
  // Three labels: a split meets exactly when the three are on one line.
  for (const A of nine) for (const B of nine) for (const C of nine) {
    const pos = {A, B, C}, lp = lpSplits(pos);
    assert.deepEqual(meetingSplits(pos), lp);
    assert.equal(lp.length > 0, collinear(A, B, C), `${JSON.stringify(pos)}: three meet only on a line`);
  }

  // One hint per puzzle first, so the timings below measure the code, not
  // the engine compiling it.
  for (const p of pack.puzzles) nextHint(p, freshAttempt(p));
  let hintSteps = 0, pointsChecked = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'radon');
    assert.ok(p.id.startsWith('radon-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    assert.equal(nextHint(p, fresh).type, q.mode === 'playground' ? 'done' : 'move', `${p.id}: a first hint`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    // No first hint, title or objective names the answer.
    const text = `${p.title} ${p.visibleObjective} ${p.hints[0]}`;
    if (q.mode === 'place') for (const [x, y] of row.answers || []) assert.ok(!text.includes(`${x} across`), `${p.id}: the answer is not in the title, goal or first hint`);
    if (q.mode === 'every') assert.ok(missGap(q.labels) >= .8, `${p.id}: bands that miss are at least 0.8 apart`);
    if (q.mode === 'place') assert.ok(lattice(q).every(D => missGap({...q.labels, D}) >= .6), `${p.id}: wherever D goes, bands that miss are at least 0.6 apart`);
    if (q.mode === 'every') { const lp = lpSplits(q.labels); assert.deepEqual(lp, row.answers, `${p.id}: splits by the program`); assert.deepEqual(p.solution.answers, lp, `${p.id}: the pack's answers`); hintSteps += checkEvery(p, fresh, lp); }
    if (q.mode === 'place') {
      const right = lattice(q).filter(D => { pointsChecked++; const lp = lpSplits({...q.labels, D}); return lp.length === q.goal.length && lp.every(k => q.goal.includes(k)); });
      if (row.answers) assert.deepEqual(right, row.answers, `${p.id}: places by the program`);
      else assert.equal(right.length, row.count, `${p.id}: number of places`);
      assert.deepEqual(p.solution.answers, right, `${p.id}: the pack's answers`);
      hintSteps += checkPlace(p, fresh, right);
    }
    if (q.mode === 'locus') {
      const right = lattice(q).filter(C => { pointsChecked++; return !same(C, q.labels.A) && !same(C, q.labels.B) && lpSplits({...q.labels, C}).length > 0; });
      assert.deepEqual(right, row.answers, `${p.id}: places by the program`);
      assert.ok(right.every(C => collinear(q.labels.A, q.labels.B, C)), `${p.id}: every place is on the line through A and B`);
      assert.deepEqual(p.solution.answers, right);
      hintSteps += checkLocus(p, fresh, right);
    }
    if (q.mode === 'pair') hintSteps += checkPair(p, fresh, row);
  }

  // A fixed triangle (puzzle 2's A, B and C) and every place for D on a
  // larger board: 1, 2 or 4 splits, 4 only on a corner, 2 only on a line
  // through two corners.
  const tri = pack.puzzles.find(p => p.id === 'radon-02').parameters.labels;
  for (let x = -3; x <= 9; x++) for (let y = -3; y <= 9; y++) {
    const D = [x, y], n = lpSplits({...tri, D}).length, corner = Object.values(tri).some(v => same(v, D));
    const lines = [['A', 'B'], ['A', 'C'], ['B', 'C']].filter(([u, v]) => collinear(tri[u], tri[v], D)).length;
    assert.ok([1, 2, 4].includes(n), `D at ${D}: 1, 2 or 4`);
    assert.equal(n === 4, corner, `D at ${D}: four only on a corner`);
    if (!corner) assert.equal(n === 2, lines > 0, `D at ${D}: two exactly on a line through two corners`);
    pointsChecked++;
  }
  times.sort((x, y) => x - y);
  const p99 = times[Math.floor(times.length * .99)], slowest = times.at(-1);
  assert.ok(p99 < 50, `hints and moves: 99% under 50 ms (${p99.toFixed(1)} ms)`);
  assert.ok(slowest < 500, `the slowest hint or move under 500 ms (${slowest.toFixed(1)} ms)`);
  return {radonPuzzles: puzzles.length, placements, pointsChecked, hintSteps, p99Ms: Number(p99.toFixed(1)), slowestMs: Math.round(slowest)};
}

// --- Find every split ----------------------------------------------------------
function checkEvery(p, fresh, answers) {
  const q = p.parameters, letters = Object.keys(q.labels).sort(), n = letters.length;
  let steps = hintsSolve(p, fresh, 'from fresh');
  refuse(p, fresh, {type: 'all'}, 'That’s all before any Meet');
  refuse(p, fresh, {type: 'meet'}, 'Meet while every dot is yellow');
  refuse(p, fresh, {type: 'tap', label: 'E'}, 'an unknown letter');
  refuse(p, fresh, {type: 'jump'}, 'an unknown move');
  // Every colouring: Meet tells apart, meet or found already, as the program says.
  for (let bits = 1; bits < (1 << n) - 1; bits++) {
    let a = fresh;
    for (let i = 0; i < n; i++) if (bits >> i & 1) a = play(p, a, {type: 'tap', label: letters[i]});
    const g = letters.filter((_, i) => (bits >> i & 1) === (bits & 1)), h = letters.filter((_, i) => (bits >> i & 1) !== (bits & 1)), k = `${g.join('')}|${h.join('')}`;
    const met = play(p, a, {type: 'meet'});
    assert.equal(met.board.told, answers.includes(k) ? 'meet' : 'apart', `${p.id} ${k}: Meet answers by the program`);
    refuse(p, met, {type: 'meet'}, 'a second Meet on the same colours');
    // Undo keeps the answer while the colours stay.
    const back = undoMove(p, met);
    assert.ok(validBoard(p, back.board), `${p.id}: Undo after Meet is valid`);
    assert.equal(back.board.told, met.board.told, `${p.id}: Undo keeps a Meet answer`);
    assert.deepEqual(back.board.found, met.board.found, `${p.id}: Undo keeps what was found`);
    refuse(p, back, {type: 'meet'}, 'Meet again after Undo');
    // A wrong first claim: hints still solve.
    if (!answers.includes(k)) steps += hintsSolve(p, met, `after ${k} apart`);
  }
  if (answers.length) {
    // That's all too soon: There is another, locked until a new find, through Undo.
    let a = fresh;
    const [g] = answers[0].split('|').map(s => [...s]);
    for (const l of letters.filter(l => !g.includes(l))) a = play(p, a, {type: 'tap', label: l});
    a = play(p, a, {type: 'meet'});
    if (answers.length > 1) {
      a = play(p, a, {type: 'all'});
      assert.equal(a.board.more, true, `${p.id}: There is another`);
      refuse(p, a, {type: 'all'}, 'That’s all again before a new find');
      const tapped = play(p, a, {type: 'tap', label: letters[0]});
      const back = undoMove(p, tapped);
      assert.equal(back.board.more, true, `${p.id}: Undo keeps There is another`);
      refuse(p, back, {type: 'all'}, 'That’s all after Undo');
      steps += hintsSolve(p, a, 'after a wrong That’s all');
      // Found already.
      const again = play(p, play(p, play(p, a, {type: 'tap', label: letters[0]}), {type: 'tap', label: letters[0]}), {type: 'meet'});
      assert.equal(again.board.told, 'again', `${p.id}: Found already`);
    }
  } else {
    // No split meets: That's all after one try is right.
    const tried = play(p, play(p, fresh, {type: 'tap', label: 'A'}), {type: 'meet'});
    assert.equal(tried.board.told, 'apart');
    assert.ok(isSolved(p, play(p, tried, {type: 'all'}).board), `${p.id}: That’s all after a try`);
    const h = nextHint(p, fresh);
    assert.notDeepEqual(h.action, {type: 'all'}, `${p.id}: the first hint is a try, not That’s all`);
  }
  // Random states.
  const r = rng(p.number * 97);
  for (let t = 0; t < 30; t++) {
    let a = fresh;
    for (let s = 0; s < 8; s++) {
      const options = [...letters.map(l => ({type: 'tap', label: l})), {type: 'meet'}, {type: 'all'}].filter(m => !isSolved(p, a.board) && move(p, a, m));
      if (!options.length) break;
      const m = pick(r, options);
      if (m.type === 'all' && isSolved(p, move(p, a, m).board)) continue;
      a = play(p, a, m);
    }
    steps += hintsSolve(p, a, `random state ${t}`);
  }
  // Forged saves.
  const b = fresh.board, base = {groups: b.groups, found: [], told: null, more: false, tried: false, done: false};
  const wrongSplit = splits(letters).find(k => !answers.includes(k));
  const forged = [
    [{...base, done: true}, 'done with nothing tried'],
    [{...base, tried: true, done: true, found: answers.slice(0, -1)}, answers.length ? 'done with a split missing' : null],
    [{...base, tried: true, found: wrongSplit ? [wrongSplit] : []}, wrongSplit ? 'a found split that does not meet' : null],
    [{...base, tried: true, found: answers.length ? [answers[0], answers[0]] : []}, answers.length ? 'a split found twice' : null],
    [{...base, found: answers.slice(0, 1)}, answers.length ? 'a find with nothing tried' : null],
    [{...base, told: 'apart'}, 'an answer with nothing tried'],
    [{...base, tried: true, groups: b.groups.map(() => 0), told: 'apart'}, 'an answer for one colour'],
    [{...base, groups: [...b.groups.slice(0, -1), 2]}, 'a third colour'],
    [{...base, groups: b.groups.slice(1)}, 'a missing dot'],
    [{...base, tried: true, more: true, found: answers}, 'There is another with every split found'],
    [{...base, tried: true, told: 'maybe', groups: [1, ...b.groups.slice(1)]}, 'an unknown answer'],
    [{...base, extra: 1}, 'an extra field'],
    [{groups: b.groups, found: []}, 'missing fields']
  ];
  for (const [board, why] of forged) if (why) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

// --- Place D -------------------------------------------------------------------
function checkPlace(p, fresh, right) {
  const q = p.parameters;
  let steps = hintsSolve(p, fresh, 'from fresh');
  for (const at of right) assert.ok(isSolved(p, play(p, play(p, fresh, {type: 'put', at}), {type: 'check'}).board), `${p.id}: D at ${at} solves`);
  // Every wrong place: Check refuses, the certificate split breaks the goal, and hints solve.
  for (const at of lattice(q).filter(x => !right.some(y => same(x, y)))) {
    let a = same(at, q.start) ? fresh : play(p, fresh, {type: 'put', at});
    a = play(p, a, {type: 'check'});
    assert.equal(a.board.refused, true, `${p.id}: Check at ${at} refused`);
    assert.ok(!isSolved(p, a.board));
    refuse(p, a, {type: 'check'}, 'Check twice');
    const back = undoMove(p, a);
    assert.equal(back.board.refused, true, `${p.id}: Undo keeps a refused Check on the same place`);
    refuse(p, back, {type: 'check'}, 'Check after Undo');
    steps += hintsSolve(p, a, `after Check at ${at}`);
  }
  refuse(p, fresh, {type: 'put', at: q.start}, 'D onto its own place');
  refuse(p, fresh, {type: 'put', at: [q.cols + 1, 0]}, 'D off the board');
  refuse(p, fresh, {type: 'put', at: [1.5, 2]}, 'D between points');
  refuse(p, fresh, {type: 'put'}, 'a put with no place');
  const solvedA = play(p, play(p, fresh, {type: 'put', at: right[0]}), {type: 'check'});
  refuse(p, solvedA, {type: 'put', at: q.start}, 'a move once solved');
  const wrong = lattice(q).find(x => !right.some(y => same(x, y)));
  for (const [board, why] of [[{at: wrong, refused: false, done: true}, 'done in a wrong place'], [{at: right[0], refused: true, done: false}, 'a refusal in a right place'], [{at: [-1, 0], refused: false, done: false}, 'D off the board'], [{at: [1, 1, 1], refused: false, done: false}, 'a bad place'], [{at: wrong, refused: false}, 'a missing field'], [{at: wrong, refused: 'no', done: false}, 'a field of the wrong kind']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

// --- Every place for C ---------------------------------------------------------
function checkLocus(p, fresh, right) {
  const q = p.parameters, free = lattice(q).filter(x => !same(x, q.labels.A) && !same(x, q.labels.B));
  let steps = hintsSolve(p, fresh, 'from fresh');
  refuse(p, fresh, {type: 'all'}, 'That’s all before any place');
  refuse(p, fresh, {type: 'put', at: q.labels.A}, 'C onto A');
  refuse(p, fresh, {type: 'put', at: [q.cols + 1, 0]}, 'C off the board');
  const wrong = free.filter(x => !right.some(y => same(x, y)));
  let a = play(p, fresh, {type: 'put', at: wrong[0]});
  assert.deepEqual(a.board.missed, [wrong[0]], `${p.id}: a wrong place is marked`);
  refuse(p, a, {type: 'all'}, 'That’s all with nothing found');
  refuse(p, a, {type: 'put', at: wrong[0]}, 'C onto its own place');
  steps += hintsSolve(p, a, 'after a wrong place');
  a = play(p, a, {type: 'put', at: right[0]});
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.more, true, `${p.id}: There is another`);
  refuse(p, a, {type: 'all'}, 'That’s all again before a new find');
  const moved = play(p, a, {type: 'put', at: wrong[1]});
  const back = undoMove(p, moved);
  assert.equal(back.board.more, true, `${p.id}: Undo keeps There is another`);
  assert.ok(back.board.missed.some(x => same(x, wrong[1])), `${p.id}: Undo keeps the marks`);
  refuse(p, back, {type: 'all'}, 'That’s all after Undo');
  steps += hintsSolve(p, a, 'after a wrong That’s all');
  // Random states.
  const r = rng(p.number * 31);
  for (let t = 0; t < 20; t++) {
    let b = fresh;
    for (let s = 0; s < 6; s++) { const m = r() < .85 ? {type: 'put', at: pick(r, free)} : {type: 'all'}; const next = move(p, b, m); if (next && next !== b && !isSolved(p, next.board)) b = next; }
    steps += hintsSolve(p, b, `random state ${t}`);
  }
  const base = {found: [], missed: [], at: null, more: false, done: false};
  for (const [board, why] of [[{...base, done: true}, 'done with nothing found'], [{...base, found: [wrong[0]], at: wrong[0]}, 'a wrong place found'], [{...base, missed: [right[0]], at: right[0]}, 'a right place marked wrong'], [{...base, found: [q.labels.A]}, 'C found on A'], [{...base, found: [right[0], right[0]]}, 'a place twice'], [{...base, at: right[0]}, 'C on a place not in the record'], [{...base, more: true}, 'There is another with nothing found'], [{...base, found: right, more: true}, 'There is another with every place found'], [{...base, done: true, found: right.slice(1)}, 'done with a place missing'], [{found: [], missed: []}, 'missing fields']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

// --- Two boards ----------------------------------------------------------------
function checkPair(p, fresh, row) {
  const q = p.parameters, L = ['A', 'B', 'C', 'D'];
  const common = boards => { const [s, t] = boards.map(lpSplits); return s.filter(k => t.includes(k)); };
  assert.ok(common(q.boards).length > 0, `${p.id}: the boards start sharing a split`);
  // No single move solves it: every move of every letter on either board.
  for (let k = 0; k < 2; k++) for (const l of L) for (const at of lattice(q)) {
    if (L.some(m => same(q.boards[k][m], at))) continue;
    const boards = q.boards.map((b, j) => j === k ? {...b, [l]: at} : b);
    assert.ok(common(boards).length > 0, `${p.id}: ${l} to ${at} on board ${k} still shares a split`);
  }
  // The witness, played as moves.
  let a = fresh;
  for (const m of p.solution.moves) a = play(p, a, m);
  assert.equal(p.solution.moves.length, row.moves, `${p.id}: witness length`);
  assert.deepEqual(common(a.board.boards), [], `${p.id}: the witness shares no split`);
  assert.ok(isSolved(p, play(p, a, {type: 'check'}).board), `${p.id}: Check accepts the witness`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  const refused = play(p, fresh, {type: 'check'});
  assert.equal(refused.board.refused, true, `${p.id}: Check refuses the start`);
  refuse(p, refused, {type: 'check'}, 'Check twice');
  assert.equal(undoMove(p, refused).board.refused, true, `${p.id}: Undo keeps the refusal`);
  steps += hintsSolve(p, refused, 'after a refused Check');
  refuse(p, fresh, {type: 'put', board: 0, label: 'A', at: q.boards[0].B}, 'a letter onto another');
  refuse(p, fresh, {type: 'put', board: 2, label: 'A', at: [0, 0]}, 'a third board');
  refuse(p, fresh, {type: 'put', board: 0, label: 'E', at: [0, 0]}, 'an unknown letter');
  refuse(p, fresh, {type: 'put', board: 0, label: 'A', at: [q.cols + 1, 0]}, 'off the board');
  // Random states, a few moves on either board.
  const r = rng(p.number * 53);
  for (let t = 0; t < 40; t++) {
    let b = fresh;
    for (let s = 0; s < 1 + t % 4; s++) { const m = {type: 'put', board: Math.floor(r() * 2), label: pick(r, L), at: pick(r, lattice(q))}; const next = move(p, b, m); if (next && next !== b && !isSolved(p, next.board)) b = next; }
    steps += hintsSolve(p, b, `random state ${t}`);
  }
  const one = q.boards[0];
  for (const [board, why] of [[{boards: q.boards, refused: false, done: true}, 'done while a split is shared'], [{boards: a.board.boards, refused: true, done: false}, 'a refusal when nothing is shared'], [{boards: [{...one, B: one.A}, one], refused: false, done: false}, 'two letters on one place'], [{boards: [one], refused: false, done: false}, 'one board'], [{boards: [{...one, D: [q.cols + 1, 0]}, one], refused: false, done: false}, 'a letter off the board'], [{boards: [{A: one.A, B: one.B, C: one.C}, one], refused: false, done: false}, 'a missing letter'], [{boards: q.boards, refused: false}, 'a missing field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

// --- Playground ----------------------------------------------------------------
function checkPlayground(p, fresh) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  assert.deepEqual(lpSplits(q.labels).length, 1, `${p.id}: the start has one split that meets`);
  const a = play(p, fresh, {type: 'tap', label: 'A'});
  assert.deepEqual(a.board.groups, [1, 0, 1, 1], `${p.id}: a tap switches a colour`);
  const b = play(p, a, {type: 'put', label: 'B', at: [3, 3]});
  assert.deepEqual(b.board.at.B, [3, 3], `${p.id}: a dot moves`);
  assert.ok(!isSolved(p, b.board), `${p.id}: never solved`);
  refuse(p, fresh, {type: 'put', label: 'A', at: q.labels.B}, 'a dot onto another');
  refuse(p, fresh, {type: 'put', label: 'A', at: [q.cols + 1, 0]}, 'off the board');
  refuse(p, fresh, {type: 'all'}, 'That’s all in the playground');
  refuse(p, fresh, {type: 'check'}, 'Check in the playground');
  for (const [board, why] of [[{...fresh.board, groups: [0, 0, 1]}, 'three colours for four dots'], [{...fresh.board, at: {...fresh.board.at, B: fresh.board.at.A}}, 'two dots on one place'], [{...fresh.board, done: true}, 'an extra field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export default validateRadon;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateRadon(), null, 2));
