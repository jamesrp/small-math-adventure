// Checks the Card totals pack (dist/families/sumsets/sumsets.json): content
// fields and sources; the theorem over every pair of non-empty trays from
// 0–9 (the bounds m + n − 1 and m × n, and the fewest exactly for evenly
// spaced trays with one gap or a one-card tray), with totals counted on a
// 0–18 table rather than the mechanic's bitmasks; every puzzle's solving
// designs recomputed by brute force and by their structure (common gaps,
// disjoint jumps, B's jump); every route in every solving design climbs and
// passes every total, and no route does in any other design; witnesses
// played as moves; taps in page order, the corner first and a diagonal step
// refused; refusals kept through Undo; hint chains from fresh, after a wrong
// card, after a finished route that misses, after taps that are no route,
// after a wrong That's all; illegal moves;
// forged saves; the playground. Run: node scripts/validate-sumsets.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// --- An independent model --------------------------------------------------------
// Trays as bitmasks 1..1023 over cards 0–9; totals counted on a table.
const cardsOf = mask => { const out = []; for (let k = 0; k <= 9; k++) if (mask >> k & 1) out.push(k); return out; };
const ALL = Array.from({length: 1023}, (_, i) => cardsOf(i + 1));
function count(A, B) {
  const seen = new Array(19).fill(false);
  let n = 0;
  for (const a of A) for (const b of B) if (!seen[a + b]) { seen[a + b] = true; n++; }
  return n;
}
const gaps = X => X.slice(1).map((x, k) => x - X[k]);
const progression = X => new Set(gaps(X)).size <= 1;
const commonGap = (A, B) => { const g = new Set([...gaps(A), ...gaps(B)]); return g.size === 1; };
// The jumps inside a tray, every difference of two of its cards.
const jumps = X => { const out = new Set(); for (const x of X) for (const y of X) if (y > x) out.add(y - x); return out; };
const disjointJumps = (A, B) => ![...jumps(A)].some(d => jumps(B).has(d));
// All right/up routes through an m × n grid, as cell lists from [0, 0].
function routes(m, n) {
  const out = [];
  (function go(i, j, path) { if (i === m - 1 && j === n - 1) { out.push(path); return; } if (j + 1 < n) go(i, j + 1, [...path, [i, j + 1]]); if (i + 1 < m) go(i + 1, j, [...path, [i + 1, j]]); })(0, 0, [[0, 0]]);
  return out;
}
const sameSet = (X, Y) => X.length === Y.length && X.every((x, k) => x === Y[k]);
const allowed = (rule, X) => rule.fixed ? sameSet(rule.fixed, X) : rule.size ? X.length === rule.size : X.length >= 1 && X.length <= rule.max;

// The table in docs/sumsets/README.md.
const TABLE = {
  'sumsets-01': {mode: 'fewest', totals: 3, designs: 8},
  'sumsets-02': {mode: 'most', totals: 9, designs: 20},
  'sumsets-03': {mode: 'fewest', totals: 4, designs: 160},
  'sumsets-04': {mode: 'fewest', totals: 5, designs: 120},
  'sumsets-05': {mode: 'every', totals: 4, designs: 7, jump: 3},
  'sumsets-06': {mode: 'most', totals: 9, designs: 160, even: true},
  'sumsets-07': {mode: 'fit', totals: 3, designs: 10},
  'sumsets-08': {mode: 'fewest', totals: 6, designs: 1},
  'sumsets-09': {mode: 'most', totals: 16, designs: 8},
  'sumsets-10': {mode: 'every', totals: 5, designs: 4, jump: 6},
  'sumsets-11': {mode: 'fewest', totals: 7, designs: 66}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 80; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 3, `${p.id} ${label}: hint text`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// Put cards into the free trays to reach a design.
function build(p, a, A, B) {
  for (const [t, X] of [['A', A], ['B', B]]) {
    for (const k of a.board[t]) if (!X.includes(k)) a = play(p, a, {type: 'card', tray: t, card: k});
    for (const k of X) if (!a.board[t].includes(k)) a = play(p, a, {type: 'card', tray: t, card: k});
  }
  return a;
}
const walk = (p, a, route) => route.reduce((b, cell) => play(p, b, {type: 'step', cell}), a);

// The theorem over every pair of non-empty trays from 0–9. Each tray's jumps
// (as a bitmask of differences) and its gap (0 for one card, −1 when uneven)
// are worked out once.
function theorem() {
  const J = ALL.map(X => [...jumps(X)].reduce((m, d) => m | (1 << d), 0));
  const G = ALL.map(X => X.length === 1 ? 0 : progression(X) ? X[1] - X[0] : -1);
  let pairs = 0, equal = 0, singles = 0;
  for (let i = 0; i < ALL.length; i++) for (let j = 0; j < ALL.length; j++) {
    const A = ALL[i], B = ALL[j], m = A.length, n = B.length, c = count(A, B);
    if (c < m + n - 1 || c > m * n) assert.fail(`bounds for ${A} + ${B}`);
    const fewest = m === 1 || n === 1 || (G[i] > 0 && G[i] === G[j]);
    if ((c === m + n - 1) !== fewest) assert.fail(`fewest exactly for common gaps or a one-card tray: ${A} + ${B}`);
    if ((c === m * n) !== ((J[i] & J[j]) === 0)) assert.fail(`most exactly for disjoint jumps: ${A} + ${B}`);
    pairs++;
    if (c === m + n - 1) { equal++; if (m === 1 || n === 1) singles++; }
  }
  assert.equal(pairs, 1023 * 1023);
  return {pairs, fewestPairs: equal, oneCardPairs: singles};
}

export async function validateSumsets() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/sumsets/sumsets.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-55')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-55.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'sumsets');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  const summary = theorem();

  let hintSteps = 0, routesChecked = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'sumsets');
    assert.ok(p.id.startsWith('sumsets-'));
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

    // No predict-the-count: no puzzle names its fewest or most in a visible line, a title or a first hint.
    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
    if (q.mode !== 'every') for (const text of [p.visibleObjective, p.title, p.hints[0], p.objective]) assert.ok(!new RegExp(`\\b(${row.totals}|${WORDS[row.totals]})\\b`, 'i').test(text), `${p.id}: “${text}” does not give the count ${row.totals}`);

    // Every design the trays allow, by brute force over bitmasks.
    const designs = [];
    for (const A of ALL) if (allowed(q.trays.A, A)) for (const B of ALL) if (allowed(q.trays.B, B)) designs.push({A, B, c: count(A, B)});
    let good;
    if (q.mode === 'fewest' || q.mode === 'fit') {
      good = designs.filter(d => d.c === d.A.length + d.B.length - 1);
      if (q.mode === 'fewest') {
        const m = good[0].A.length, n = good[0].B.length;
        assert.equal(Math.min(...designs.map(d => d.c)), m + n - 1, `${p.id}: the fewest is m + n − 1`);
        assert.ok(good.every(d => m === 1 || n === 1 || commonGap(d.A, d.B)), `${p.id}: every fewest design has one common gap`);
      } else {
        assert.ok(good.every(d => d.A.length === 1), `${p.id}: only one-card A trays fit`);
        assert.ok(!progression(q.trays.B.fixed), `${p.id}: B is uneven`);
      }
      for (const d of designs) for (const r of routes(d.A.length, d.B.length)) {
        const t = r.map(([i, j]) => d.A[i] + d.B[j]);
        assert.ok(t.every((x, k) => k === 0 || x > t[k - 1]), `${p.id}: every route climbs`);
        assert.equal(new Set(t).size === d.c, good.includes(d), `${p.id}: a route passes every total exactly in a solving design`);
        routesChecked++;
      }
    } else if (q.mode === 'most') {
      const top = Math.max(...designs.filter(d => !q.even || (progression(d.A) && progression(d.B))).map(d => d.c));
      good = designs.filter(d => d.c === top && (!q.even || (progression(d.A) && progression(d.B))));
      assert.equal(top, good[0].A.length * good[0].B.length, `${p.id}: the most is m × n`);
      assert.ok(good.every(d => disjointJumps(d.A, d.B)), `${p.id}: every most design has disjoint jumps`);
      if (q.even) assert.ok(good.some(d => sameSet(d.A, [0, 2, 4]) && sameSet(d.B, [0, 3, 6])), `${p.id}: {0, 2, 4} + {0, 3, 6} is one`);
      if (p.id === 'sumsets-09') assert.ok(good.every(d => [d.A, d.B].some(X => sameSet(X, [0, 1, 8, 9]))), `${p.id}: one tray is {0, 1, 8, 9}`);
    } else {
      good = designs.filter(d => d.c === q.target);
      assert.ok(good.every(d => d.B[1] - d.B[0] === row.jump), `${p.id}: every answer jumps by ${row.jump}`);
      assert.equal(good.length, 10 - row.jump, `${p.id}: every start that fits`);
    }
    assert.equal(good.length, row.designs, `${p.id}: solving designs`);
    assert.ok(good.every(d => d.c === row.totals), `${p.id}: totals`);
    assert.ok(good.length / designs.length < 0.2, `${p.id}: random choices rarely solve (${good.length} of ${designs.length})`);

    if (q.mode === 'every') { hintSteps += checkEvery(p, fresh, good.map(d => d.B)); continue; }
    // The witness, played as moves.
    const w = p.solution;
    assert.ok(good.some(d => sameSet(d.A, w.A) && sameSet(d.B, w.B)), `${p.id}: the witness design solves`);
    let a = build(p, fresh, w.A, w.B);
    if (q.mode === 'most') assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    else {
      assert.ok(!isSolved(p, a.board), `${p.id}: a design alone is not a solve`);
      const done = walk(p, a, w.route);
      assert.ok(isSolved(p, done.board), `${p.id}: the witness route solves`);
      refuse(p, done, {type: 'back'}, 'a move after a solve');
      // Every route through every solving design solves (a sample of designs for the big ones).
      for (const d of good.slice(0, 12)) { const b = build(p, fresh, d.A, d.B); for (const r of routes(d.A.length, d.B.length)) assert.ok(isSolved(p, walk(p, b, r.slice(0)).board), `${p.id}: any route solves ${d.A} + ${d.B}`); }
      // A design that is not the fewest: a finished route misses a total and does not solve; hints still finish.
      const bad = designs.find(d => !good.includes(d) && d.A.length > 1);
      const built = build(p, fresh, bad.A, bad.B), r = routes(bad.A.length, bad.B.length)[0];
      const almost = walk(p, built, r.slice(0, -1));
      const wrong = play(p, almost, {type: 'step', cell: r.at(-1)});
      assert.ok(!isSolved(p, wrong.board), `${p.id}: a route through a design with too many totals does not solve`);
      assert.deepEqual(wrong.board.route, [], `${p.id}: the refusal clears the taps`);
      assert.equal(wrong.board.told.kind, 'missed', `${p.id}: it names the missed totals`);
      assert.equal(wrong.board.told.totals.length, bad.c - (bad.A.length + bad.B.length - 1), `${p.id}: as many as the extra totals`);
      const kept = mechanicFor(p).carry(p, wrong.board, undo(wrong).board);
      assert.deepEqual(kept.told, wrong.board.told, `${p.id}: Undo keeps the refusal`);
      assert.ok(validBoard(p, kept), `${p.id}: and the board stays valid`);
      hintSteps += hintsSolve(p, wrong, 'after a route that misses');
      const back = play(p, almost, {type: 'back'});
      assert.equal(back.board.route.length, almost.board.route.length - 1, `${p.id}: back takes one step`);
      // A certificate that can fail: page order (top row first), the corner first, and a diagonal are refused.
      const g = good[0], ready = build(p, fresh, g.A, g.B), m = g.A.length, n = g.B.length, corner = [m - 1, n - 1];
      if (m > 1) {
        const page = walk(p, ready, Array.from({length: n}, (_, j) => [m - 1, j]));
        assert.ok(!isSolved(p, page.board) && page.board.told?.kind === 'steps', `${p.id}: taps in page order do not solve`);
        hintSteps += hintsSolve(p, page, 'after taps in page order');
        if (n > 1) {
          const diagonal = walk(p, ready, [[0, 0], [1, 1]]);
          assert.ok(!isSolved(p, diagonal.board), `${p.id}: a diagonal step is no route`);
          hintSteps += hintsSolve(p, diagonal, 'after a diagonal step');
        }
      }
      const first = play(p, ready, {type: 'step', cell: corner});
      assert.ok(!isSolved(p, first.board) && first.board.told?.kind === 'steps', `${p.id}: the corner alone does not solve`);
    }
    hintSteps += hintsSolve(p, fresh, 'from fresh');
    // A wrong card first.
    const free = ['A', 'B'].find(t => !q.trays[t].fixed), card = [...Array(10).keys()].find(k => !good.some(d => d[free].includes(k)));
    if (card !== undefined) hintSteps += hintsSolve(p, play(p, fresh, {type: 'card', tray: free, card}), 'after a wrong card');
    // A full design that does not solve.
    const bad = designs.find(d => !good.includes(d));
    hintSteps += hintsSolve(p, build(p, fresh, bad.A, bad.B), 'from a design that does not solve');
    checkRefusals(p, fresh, good[0]);
  }
  return {sumsetsPuzzles: puzzles.length, ...summary, routesChecked, hintSteps};
}

function checkRefusals(p, fresh, d) {
  const q = p.parameters, fixedT = ['A', 'B'].find(t => q.trays[t].fixed), freeT = ['A', 'B'].find(t => !q.trays[t].fixed);
  for (const [action, why] of [[null, 'nothing'], ['card', 'a string'], [{type: 'card'}, 'no tray'], [{type: 'card', tray: 'C', card: 1}, 'an unknown tray'], [{type: 'card', tray: freeT, card: 10}, 'a card past 9'], [{type: 'card', tray: freeT, card: -1}, 'a card below 0'], [{type: 'card', tray: freeT, card: '1'}, 'a card named by a string'], [{type: 'card', tray: freeT, card: 1.5}, 'half a card'], [{type: 'step', cell: [0, 0]}, 'a route before the trays are full'], [{type: 'back'}, 'a step back with no route'], [{type: 'all'}, 'That’s all outside find-every'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  if (fixedT) refuse(p, fresh, {type: 'card', tray: fixedT, card: q.trays[fixedT].fixed[0]}, 'changing a given tray');
  // A full tray takes no more cards.
  const cap = q.trays[freeT].size ?? q.trays[freeT].max;
  let a = fresh;
  for (let k = 0; k < cap; k++) a = play(p, a, {type: 'card', tray: freeT, card: k});
  refuse(p, a, {type: 'card', tray: freeT, card: 9}, 'a card past the tray’s size');
  const B = fresh.board;
  const forged = [
    [{...B, extra: 1}, 'an unknown field'],
    [{...B, [freeT]: [3, 1]}, 'cards out of order'],
    [{...B, [freeT]: [2, 2]}, 'a card twice'],
    [{...B, [freeT]: [10]}, 'a card past 9'],
    [{...B, [freeT]: Array.from({length: cap + 1}, (_, k) => k)}, 'too many cards'],
    ...(fixedT ? [[{...B, [fixedT]: []}, 'a given tray emptied']] : [])
  ];
  if (q.mode !== 'most') {
    forged.push([{...B, route: [[0, 0]]}, 'a route before the trays are full'], [{...B, told: {kind: 'steps'}}, 'a refusal before the trays are full']);
    const full = build(p, fresh, d.A, d.B).board, m = full.A.length, n = full.B.length;
    assert.ok(validBoard(p, {...full, route: [[m - 1, 0]]}), `${p.id}: any taps short of the corner are kept`);
    forged.push([{...full, route: [[0, 0], [0, 0]]}, 'a dot tapped twice'], [{...full, route: [[0, 0], [0, 9]]}, 'a tap off the grid'], [{...full, route: 'up'}, 'a route that is not a list'], [{...full, route: [[m - 1, n - 1], [0, 0]]}, 'taps past the corner'], [{...full, route: [[m - 1, n - 1]]}, 'the corner kept without a proof'],
      [{...full, told: {kind: 'missed', totals: [99]}}, 'a missed total off the strip'], [{...full, told: {kind: 'missed', totals: []}}, 'a refusal that misses nothing on a design that fits'], [{...full, told: {kind: 'why'}}, 'an unknown refusal'], [{...full, told: 'no'}, 'a refusal that is not a record']);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkEvery(p, fresh, answers) {
  let steps = 0, a = fresh;
  refuse(p, fresh, {type: 'card', tray: 'A', card: 0}, 'changing the given A');
  refuse(p, fresh, {type: 'step', cell: [0, 0]}, 'a route');
  for (const [k, X] of answers.entries()) {
    a = build(p, a, p.parameters.trays.A.fixed, X);
    assert.deepEqual(a.board.found, answers.slice(0, k + 1), `${p.id}: a B that works joins the found row`);
    if (k === 0) {
      // Take a card out and put it back: found already.
      const again = play(p, play(p, a, {type: 'card', tray: 'B', card: X[0]}), {type: 'card', tray: 'B', card: X[0]});
      assert.equal(again.board.again, true, `${p.id}: found already`);
      assert.deepEqual(again.board.found, a.board.found);
      // Undo keeps what was found.
      const undone = undo(play(p, fresh, {type: 'card', tray: 'B', card: X[0]}));
      assert.deepEqual(undone.board.found, [], `${p.id}: Undo from the start finds nothing`);
    }
    if (k === 0) {
      const early = play(p, a, {type: 'all'});
      assert.equal(early.board.more, true, `${p.id}: there is another`);
      refuse(p, early, {type: 'all'}, 'That’s all again before a new B');
      // Undo does not lift the answer.
      const card = [...Array(10).keys()].find(c => !X.includes(c));
      const moved = play(p, early, {type: 'card', tray: 'B', card: X[1]});
      const back = mechanicFor(p).carry(p, moved.board, undo(moved).board);
      assert.equal(back.more, true, `${p.id}: Undo keeps There is another`);
      assert.ok(card !== undefined);
      steps += hintsSolve(p, early, 'after a wrong That’s all');
    }
  }
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board), `${p.id}: That’s all after every B`);
  steps += hintsSolve(p, fresh, 'from fresh');
  // A wrong card first.
  const card = [...Array(10).keys()].find(k => !answers.some(X => X.includes(k)));
  if (card !== undefined) steps += hintsSolve(p, play(p, fresh, {type: 'card', tray: 'B', card}), 'after a wrong card');
  steps += hintsSolve(p, build(p, fresh, p.parameters.trays.A.fixed, [0, 1]), 'from a B that does not work');
  const B = fresh.board, notOne = [0, 1];
  for (const [board, why] of [[{...B, found: [notOne]}, 'a found B that does not work'], [{...B, found: [answers[0], answers[0]]}, 'a B found twice'], [{...B, done: true}, 'That’s all before every B'], [{...B, found: answers, more: true}, '“there is another” when none is'], [{...B, again: true}, '“found already” for a B not found'], [{...B, B: answers[0]}, 'a B that works but is not in the found row'], [{...B, done: 'yes'}, 'a done flag that is not true or false'], [{...B, route: []}, 'a route field'], [{...B, A: [0, 3, 7]}, 'a changed A']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkPlayground(p, fresh) {
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  let a = build(p, fresh, [0, 2, 4], [1, 3]);
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  a = walk(p, a, [[0, 0], [0, 1], [1, 1], [2, 1]]);
  assert.ok(!isSolved(p, a.board), `${p.id}: a route through the fewest does not end the playground`);
  a = build(p, a, [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]);
  refuse(p, a, {type: 'card', tray: 'A', card: 9}, 'a seventh card');
  refuse(p, a, {type: 'all'}, 'That’s all');
}
export default validateSumsets;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateSumsets(), null, 2));
