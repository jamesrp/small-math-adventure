// Checks the Tower cities pack (dist/families/towers/towers.json), a group in
// Symbol Orchard: content fields, sources and copy; every answer recomputed by
// methods unlike the mechanic's (rows by running through every permutation in
// lexicographic order, cities built row by row from whole permutations rather
// than square by square, edge numbers read off by a running maximum, no-city
// lines checked by trying every order of both lines through each square, and
// design sets, single-out numbers and twins by grouping cities by the numbers
// they show); the theorems the notes state (the per-end rule and L + R ≤ n + 1
// for every card up to six towers, the record counts, critical sets of 2 and
// 3, the 204 cities that share their numbers); witnesses played as moves; hint
// chains from fresh, after a wrong move and after a wrong claim; claims that
// stay refused across Undo; illegal moves; forged saves.
// Run: node scripts/validate-towers.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import * as T from '../dist/families/towers/towers.js';
import {loadPack} from './packs.mjs';

// --- An independent model ----------------------------------------------------------
const SIDE = ['top', 'right', 'bottom', 'left'];
// Towers seen from the front of a line: each one taller than the running maximum.
const visible = line => line.reduce(([count, top], h) => h > top ? [count + 1, h] : [count, top], [0, 0])[0];
// Permutations of 1..n in lexicographic order (the next-permutation step).
const permMemo = new Map();
function lexPerms(n) {
  if (permMemo.has(n)) return permMemo.get(n);
  const out = [], a = Array.from({length: n}, (_, i) => i + 1);
  for (;;) {
    out.push([...a]);
    let i = n - 2;
    while (i >= 0 && a[i] > a[i + 1]) i--;
    if (i < 0) break;
    let j = n - 1;
    while (a[j] < a[i]) j--;
    [a[i], a[j]] = [a[j], a[i]];
    a.splice(i + 1, n - i - 1, ...a.slice(i + 1).reverse());
  }
  permMemo.set(n, out);
  return out;
}
const rowsWith = (n, L, R) => lexPerms(n).filter(r => visible(r) === L && visible([...r].reverse()) === R).map(r => r.join(''));
// A card has a row exactly when L + R ≤ n + 1 and it is not 1 and 1 (n ≥ 2).
const cardPossible = (n, L, R) => n === 1 ? L === 1 && R === 1 : L + R <= n + 1 && !(L === 1 && R === 1);
// Latin squares built a whole row at a time from permutations.
const squareMemo = new Map();
function latinSquares(n) {
  if (squareMemo.has(n)) return squareMemo.get(n);
  const out = [], rows = lexPerms(n);
  (function grow(done) {
    if (done.length === n) { out.push(done.flat()); return; }
    for (const r of rows) if (done.every(d => d.every((v, c) => v !== r[c]))) grow([...done, r]);
  })([]);
  squareMemo.set(n, out);
  return out;
}
const rowOf = (n, g, r) => g.slice(r * n, r * n + n);
const colOf = (n, g, c) => Array.from({length: n}, (_, r) => g[r * n + c]);
// The sixteen (or twelve) numbers, side by side: top and bottom by column,
// right and left by row; flattened in the order top, right, bottom, left.
const sides = (n, g) => ({
  top: Array.from({length: n}, (_, c) => visible(colOf(n, g, c))),
  right: Array.from({length: n}, (_, r) => visible(rowOf(n, g, r).reverse())),
  bottom: Array.from({length: n}, (_, c) => visible(colOf(n, g, c).reverse())),
  left: Array.from({length: n}, (_, r) => visible(rowOf(n, g, r)))
});
const flat = obj => SIDE.flatMap(s => obj[s]);
const numbers = (n, g) => flat(sides(n, g));
const clueFlat = (n, clues) => SIDE.flatMap(s => clues[s] || Array(n).fill(0));
const fitsAll = (clues, nums) => clues.every((k, i) => !k || nums[i] === k);
const fitList = (n, clues) => latinSquares(n).filter(g => fitsAll(clues, numbers(n, g)));
const key = g => g.join('');
const words = (n, slot) => { const side = SIDE[Math.floor(slot / n)], i = slot % n + 1; return {top: `above column ${i}`, bottom: `below column ${i}`, left: `left of row ${i}`, right: `right of row ${i}`}[side]; };
const slotFor = (n, text) => Array.from({length: 4 * n}, (_, s) => s).find(s => words(n, s) === text);
// The squares of the line from slot s, nearest the edge number first.
function squaresFrom(n, s) {
  const side = SIDE[Math.floor(s / n)], i = s % n, idx = Array.from({length: n}, (_, d) => d);
  if (side === 'top') return idx.map(d => d * n + i);
  if (side === 'bottom') return idx.map(d => (n - 1 - d) * n + i);
  if (side === 'left') return idx.map(d => i * n + d);
  return idx.map(d => i * n + n - 1 - d);
}
// No place for the line's tallest: every square of the line is one where no
// order of the row through it, and no order of the column through it, fits
// that line's two edge numbers with the tallest there.
function tallestBarred(n, clues, s) {
  const lineOk = (slot, k) => {
    const sq = squaresFrom(n, slot), a = clues[slot], z = clues[(slot + 2 * n) % (4 * n)];
    return lexPerms(n).some(r => (!a || visible(r) === a) && (!z || visible([...r].reverse()) === z) && r[sq.indexOf(k)] === n);
  };
  return squaresFrom(n, s).every(k => {
    const r = Math.floor(k / n), c = k % n;
    return !lineOk(3 * n + r, k) || !lineOk(c, k);
  });
}
// The sets of at most `budget` slots whose numbers fit only `city`.
function determining(n, city, budget) {
  const mine = numbers(n, city), others = latinSquares(n).filter(g => key(g) !== key(city)).map(g => numbers(n, g)), out = [];
  const subsets = (from, set) => {
    if (set.length && !others.some(v => set.every(s => v[s] === mine[s]))) { out.push(set); return; }
    if (set.length === budget) return;
    for (let s = from; s < 4 * n; s++) subsets(s + 1, [...set, s]);
  };
  subsets(0, []);
  return out;
}
const choose = (a, b) => { let r = 1; for (let i = 0; i < b; i++) r = r * (a - i) / (i + 1); return r; };
const stirling = (n, k) => n === 0 && k === 0 ? 1 : n === 0 || k === 0 ? 0 : stirling(n - 1, k - 1) + (n - 1) * stirling(n - 1, k);

// --- The table in docs/towers/README.md -------------------------------------------
const TABLE = {
  'towers-01': {level: 'easy', mode: 'row', answers: ['213']},
  'towers-02': {level: 'easy', mode: 'row', answers: []},
  'towers-03': {level: 'easy', mode: 'city', answers: ['231312123']},
  'towers-04': {level: 'medium', mode: 'row', answers: []},
  'towers-05': {level: 'medium', mode: 'row', answers: ['1432', '2431', '3421']},
  'towers-06': {level: 'medium', mode: 'city', answers: [], line: 'left of row 1'},
  'towers-07': {level: 'medium', mode: 'every', answers: ['312123231', '321132213', '321213132'], single: 9},
  'towers-08': {level: 'medium', mode: 'design', sets: 13, fewest: 2},
  'towers-09': {level: 'hard', mode: 'city', answers: ['2134142343123241']},
  'towers-10': {level: 'hard', mode: 'every', answers: ['1234214334124321', '1234214334214312', '1234234134124123', '1234241331424321'], single: 8},
  'towers-11': {level: 'hard', mode: 'design', sets: 8, fewest: 3},
  'towers-12': {level: 'hard', mode: 'twins', answers: ['1234241331424321']}
};

// --- Playing -------------------------------------------------------------------------
let hintSteps = 0, slowest = 0;
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function timedHint(p, a) {
  const t = performance.now(), h = nextHint(p, a);
  slowest = Math.max(slowest, performance.now() - t);
  return h;
}
function hintsSolve(p, a, label, answers = null) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const h = timedHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: hints say what to do`);
    if (h.action.type === 'none') {
      assert.equal(answers?.length, 0, `${p.id} ${label}: a hint claims none only when none fits`);
      assert.ok(a.board.tried, `${p.id} ${label}: the claim comes after an attempt`);
      assert.match(h.text, /^(Seeing|Wherever|The \d of) .+\. Press No (row|city)/, `${p.id} ${label}: the hint gives the reason before the claim`);
    }
    if (h.action.type === 'all') assert.equal(a.board.found.length, answers.length, `${p.id} ${label}: a hint presses That’s all only when every city is found`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  hintSteps += steps;
  return a;
}
const fillTo = (p, a, goal) => goal.reduce((b, v, k) => b.board.cells[k] === v ? b : play(p, b, {type: 'set', cell: k, value: v}), a);
// Undo as the app does it: the engine's undo, then the mechanic's carry.
const undoLikeApp = (p, a) => { const u = undo(a); return u === a ? a : {...u, board: mechanicFor(p).carry(p, a.board, u.board)}; };

export async function validateTowers() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/towers/towers.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-05')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-05.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'towers');
  const puzzles = pack.puzzles;
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  // The Orchard's own puzzles keep their mechanic; the group's are all towers.
  const orchard = all.filter(p => p.libraryFamily === 'latin' || p.mechanic === 'latin');
  assert.ok(orchard.some(p => p.mechanic === 'latin' && !p.group), 'Symbol Orchard keeps its own puzzles');
  assert.ok(orchard.filter(p => p.mechanic === 'towers').every(p => p.group === 'Towers'), 'every tower puzzle is in the Towers group');

  const facts = checkTheorems();

  for (const p of puzzles) {
    const row = TABLE[p.id], q = p.parameters, n = q.order;
    assert.equal(p.mechanic, 'towers');
    assert.equal(p.group, 'Towers');
    assert.equal(p.libraryFamily, 'latin');
    assert.equal(p.familyTitle, 'Symbol Orchard');
    assert.equal(p.band, 'all');
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    assert.equal(q.mode, row.mode, `${p.id}: mode`);
    for (const field of ['title', 'objective', 'visibleObjective', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    // Titles and first hints name neither the answer nor the deciding fact.
    const lead = `${p.title} ${p.hints[0]} ${p.visibleObjective}`;
    assert.ok(!/\bno (row|city)\b|can[’']t|cannot|impossible|\b(one|two|three|four|five|\d+) (rows|cities|ways)\b/i.test(lead), `${p.id}: the title, first hint and goal give nothing away (${lead})`);
    assert.ok(!/how many will you see|predict/i.test(JSON.stringify(p)), `${p.id}: no predictions`);
    if (q.mode === 'design') assert.ok(p.objective.includes(`at most ${q.budget}`), `${p.id}: the budget is a limit, not a count to beat`);

    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    const first = timedHint(p, fresh);
    assert.equal(first.type, 'move', `${p.id}: a first hint`);
    assert.ok(!['none', 'all'].includes(first.action.type), `${p.id}: the first hint is a move on the board, not a claim`);
    if (['row', 'city'].includes(q.mode)) assert.equal(fresh.board.tried, false, `${p.id}: nothing tried yet`);
    ({row: checkRow, city: checkCity, every: checkEvery, design: checkDesign, twins: checkTwins})[q.mode](p, fresh, row, n);
  }
  checkNotes(pack, facts);
  assert.ok(slowest < 150, `every hint is quick (slowest ${slowest.toFixed(1)} ms)`);
  return {towerPuzzles: puzzles.length, cardsChecked: facts.cards, latinSquares: facts.squares, hintSteps, slowestHintMs: Math.round(slowest * 10) / 10};
}

// --- The theorems ---------------------------------------------------------------------
function checkTheorems() {
  let cards = 0;
  for (let n = 1; n <= 6; n++) {
    let peak = 0;
    for (let L = 1; L <= n; L++) for (let R = 1; R <= n; R++) {
      const rows = rowsWith(n, L, R);
      assert.equal(rows.length > 0, cardPossible(n, L, R), `n = ${n}, card ${L} and ${R}: L + R ≤ n + 1 and not 1 and 1`);
      assert.deepEqual(T.rowsFor(n, L, R).map(r => r.join('')).sort(), rows, `n = ${n}, card ${L} and ${R}: the mechanic’s rows`);
      assert.equal(T.tallestPlaces(n, L, R).length > 0, rows.length > 0, `n = ${n}, card ${L} and ${R}: the tallest-place certificate`);
      if (n >= 2) assert.equal(rows.length, choose(L + R - 2, L - 1) * stirling(n - 1, L + R - 2), `n = ${n}, card ${L} and ${R}: rows by the Stirling count`);
      if (L + R === n + 1) peak += rows.length;
      cards++;
    }
    assert.equal(peak, 2 ** (n - 1), `n = ${n}: rows with L + R = n + 1 rise to the tallest and fall`);
    // The per-end rule: the tallest can stand in place j (from 0) with L seen
    // from the left exactly when L is 1 and j is 0, or L ≥ 2 and j ≥ L − 1.
    for (let L = 1; L <= n; L++) for (let j = 0; j < n; j++) {
      const some = lexPerms(n).some(r => r[j] === n && visible(r) === L);
      assert.equal(T.allowedAt(n, L, j), some, `n = ${n}: the tallest in place ${j + 1} with ${L} seen`);
    }
  }
  const squares = {};
  for (const n of [3, 4]) {
    const list = latinSquares(n);
    squares[n] = list.length;
    assert.deepEqual(list.map(key).sort(), T.cities(n).map(T.cityKey).sort(), `order ${n}: the same cities`);
    for (const g of list) {
      const nums = numbers(n, g);
      assert.deepEqual(T.viewsOf(n, g), nums, `order ${n}: the same edge numbers for ${key(g)}`);
      // A city's own numbers never leave a line without a place for its tallest,
      // so the no-city certificate is sound for every set of numbers a city shows.
      for (let s = 0; s < 4 * n; s++) assert.equal(T.noPlace(n, nums, s), false, `order ${n}: ${key(g)} keeps a place on ${words(n, s)}`);
    }
  }
  assert.deepEqual(squares, {3: 12, 4: 576}, '12 and 576 Latin squares');
  // 3 by 3: twelve different sets of twelve numbers; one number never fixes a
  // city, and every city has 13 pairs that do.
  const three = latinSquares(3), byNums3 = new Set(three.map(g => numbers(3, g).join()));
  assert.equal(byNums3.size, 12, 'the twelve 3-by-3 cities show twelve different sets');
  for (const g of three) {
    const sets = determining(3, g, 2);
    assert.ok(sets.every(s => s.length === 2), `${key(g)}: no single number fixes it`);
    assert.equal(sets.length, 13, `${key(g)}: 13 pairs fix it`);
  }
  // 4 by 4: cities grouped by their sixteen numbers.
  const four = latinSquares(4), groups = new Map();
  for (const g of four) { const k = numbers(4, g).join(); groups.set(k, [...(groups.get(k) || []), g]); }
  const shared = [...groups.values()].filter(c => c.length > 1);
  const sizes = shared.reduce((t, c) => ({...t, [c.length]: (t[c.length] || 0) + 1}), {});
  assert.equal(shared.flat().length, 204, '204 of the 576 cities share their sixteen numbers');
  assert.deepEqual(sizes, {2: 34, 4: 28, 6: 4}, '66 classes: 34 of two, 28 of four, 4 of six');
  const pairs = shared.flatMap(c => c.flatMap((g, i) => c.slice(i + 1).map(h => [g, h])));
  assert.equal(pairs.length, 262, '262 pairs share their numbers');
  assert.equal(pairs.filter(([g, h]) => g.filter((v, k) => v !== h[k]).length === 4).length, 152, '152 pairs differ by a 2-by-2 switch');
  // No two numbers fix a 4-by-4 city; 208 cities have three that do.
  const nums4 = four.map(g => numbers(4, g));
  for (let s = 0; s < 16; s++) for (let t = s + 1; t < 16; t++) {
    const count = new Map();
    for (const v of nums4) { const k = `${v[s]},${v[t]}`; count.set(k, (count.get(k) || 0) + 1); }
    assert.ok([...count.values()].every(c => c > 1), `no pair of 4-by-4 numbers (${s}, ${t}) fixes a city`);
  }
  const fixedByThree = new Set();
  for (let s = 0; s < 16; s++) for (let t = s + 1; t < 16; t++) for (let u = t + 1; u < 16; u++) {
    const count = new Map();
    nums4.forEach(v => { const k = `${v[s]},${v[t]},${v[u]}`; count.set(k, [...(count.get(k) || []), v]); });
    nums4.forEach((v, i) => { if (count.get(`${v[s]},${v[t]},${v[u]}`).length === 1) fixedByThree.add(i); });
  }
  assert.equal(fixedByThree.size, 208, '208 cities can be fixed by three numbers');
  return {cards, squares: 12 + 576, groups, fixedByThree: [...fixedByThree].map(i => key(four[i]))};
}

// --- Rows -----------------------------------------------------------------------------
function checkRow(p, fresh, row, n) {
  const q = p.parameters, [L, R] = q.card, rows = rowsWith(n, L, R);
  assert.deepEqual(rows, row.answers, `${p.id}: rows for the card`);
  assert.deepEqual(p.solution, rows.length ? {rows} : {none: true}, `${p.id}: the stored solution`);
  assert.ok(!rows.includes(q.start.join('')), `${p.id}: the start is not a solve`);
  assert.deepEqual([...q.start].sort(), Array.from({length: n}, (_, i) => i + 1), `${p.id}: one tower of each height`);
  // The two lanes the app draws after a right No row: the places each end
  // number allows the tallest, found here by trying every row.
  const lane = (k, fromRight) => Array.from({length: n}, (_, j) => j).filter(j => lexPerms(n).some(r => r[j] === n && visible(fromRight ? [...r].reverse() : r) === k));
  const left = lane(L, false), right = lane(R, true);
  assert.equal(left.some(j => right.includes(j)), rows.length > 0, `${p.id}: the lanes meet exactly when a row fits`);
  if (rows.length) {
    // Witness: swap each place into the first row in turn.
    let a = fresh;
    const goal = rows[0].split('').map(Number);
    for (let i = 0; i < n; i++) if (a.board.row[i] !== goal[i]) a = play(p, a, {type: 'swap', a: i, b: a.board.row.indexOf(goal[i])});
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    refuse(p, a, {type: 'swap', a: 0, b: 1}, 'a move after a solve');
    // A wrong No row is refused for good, and Undo keeps the refusal.
    const pairs = Array.from({length: n * n}, (_, k) => [Math.floor(k / n), k % n]).filter(([i, j]) => i < j);
    const [i0, j0] = pairs.find(([i, j]) => { const b = move(p, fresh, {type: 'swap', a: i, b: j}); return b && !isSolved(p, b.board); });
    const once = play(p, play(p, fresh, {type: 'swap', a: i0, b: j0}), {type: 'none'});
    assert.equal(once.board.refused, true, `${p.id}: a wrong No row is refused`);
    assert.ok(!isSolved(p, once.board));
    refuse(p, once, {type: 'none'}, 'No row again');
    const back = undoLikeApp(p, once);
    assert.equal(back.board.refused, true, `${p.id}: Undo takes back moves, not the refusal`);
    assert.ok(validBoard(p, back.board));
    refuse(p, back, {type: 'none'}, 'No row again after Undo');
    refuse(p, fresh, {type: 'none'}, 'No row before any swap');
    hintsSolve(p, once, 'after a wrong No row', rows);
  } else {
    refuse(p, fresh, {type: 'none'}, 'No row before any swap');
    const tried = play(p, fresh, {type: 'swap', a: 0, b: n - 1});
    const a = play(p, tried, {type: 'none'});
    assert.ok(isSolved(p, a.board) && a.board.said === 'no', `${p.id}: No row after a swap is right`);
    assert.deepEqual(a.board.row, tried.board.row, `${p.id}: the reason is drawn under the child’s own row`);
    const back = undoLikeApp(p, tried);
    refuse(p, back, {type: 'none'}, 'No row after undoing the only swap');
  }
  hintsSolve(p, fresh, 'from fresh', rows);
  // A swap that leaves the row no nearer any answer, then hints.
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const b = move(p, fresh, {type: 'swap', a: i, b: j});
    if (b && !isSolved(p, b.board)) hintsSolve(p, b, `after swapping places ${i + 1} and ${j + 1}`, rows);
  }
  for (const [action, why] of [[null, 'nothing'], ['swap', 'a string'], [{type: 'swap', a: 0, b: 0}, 'a tower with itself'], [{type: 'swap', a: 0, b: n}, 'a place off the row'], [{type: 'swap', a: -1, b: 1}, 'a place off the row'], [{type: 'swap', a: '0', b: 1}, 'a place named by a string'], [{type: 'set', cell: 0, value: 1}, 'a city move'], [{type: 'all'}, 'That’s all'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  const B = fresh.board, possible = rows.length > 0;
  for (const [board, why] of [
    [{...B, row: [...B.row.slice(1), B.row[0], 1].slice(0, n + 1)}, 'a row of the wrong length'],
    [{...B, row: B.row.map(() => 1)}, 'repeated heights'],
    [{...B, row: B.row.map(v => v + 1)}, 'a height too tall'],
    [{...B, tried: true, said: possible ? 'no' : null, refused: !possible}, possible ? 'a No row kept when a row fits' : 'a refusal when no row fits'],
    [{...B, said: possible ? null : 'no', refused: possible}, 'a claim before any swap'],
    [{...B, tried: 'yes'}, 'a try that is not true or false'],
    [{...B, said: 'yes'}, 'an unknown claim'],
    [{...B, refused: 'yes'}, 'a refusal that is not true or false'],
    [{...B, extra: 1}, 'an unknown field'],
    [{row: B.row, said: null, refused: false}, 'a missing field']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// --- One city or none --------------------------------------------------------------
function checkCity(p, fresh, row, n) {
  const clues = clueFlat(n, p.parameters.clues), fits = fitList(n, clues).map(key);
  assert.deepEqual(fits, row.answers, `${p.id}: cities that fit`);
  if (fits.length) {
    assert.deepEqual(p.solution, {cities: fits});
    const goal = fits[0].split('').map(Number), a = fillTo(p, fresh, goal);
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    // A wrong No city is refused for good, whichever line is tapped, and Undo keeps it.
    const once = play(p, play(p, fresh, {type: 'set', cell: 0, value: goal[0]}), {type: 'none', slot: 0});
    assert.equal(once.board.refused, true, `${p.id}: a wrong No city is refused`);
    for (let s = 0; s < 4 * n; s++) refuse(p, once, {type: 'none', slot: s}, 'No city again');
    refuse(p, fresh, {type: 'none', slot: 0}, 'No city before any height');
    const back = undoLikeApp(p, once);
    assert.equal(back.board.refused, true, `${p.id}: Undo keeps the refusal`);
    refuse(p, back, {type: 'none', slot: 1}, 'No city after Undo');
    hintsSolve(p, once, 'after a wrong No city', fits);
    // A wrong height, then hints.
    const wrong = play(p, fresh, {type: 'set', cell: n + 1, value: goal[n + 1] % n + 1});
    hintsSolve(p, wrong, 'after a wrong height', fits);
  } else {
    // Lines whose tallest tower has no place, found by trying every order.
    const barred = Array.from({length: 4 * n}, (_, s) => s).filter(s => tallestBarred(n, clues, s));
    const certs = T.certificates(n, clues), accepted = Array.from({length: 4 * n}, (_, s) => s).filter(s => T.noPlace(n, clues, s));
    assert.ok(certs.length && certs.every(s => accepted.includes(s)), `${p.id}: the certificates are lines the app accepts`);
    assert.deepEqual(accepted, barred, `${p.id}: the app accepts exactly the lines whose tallest has no place`);
    const line = slotFor(n, row.line);
    assert.ok(barred.includes(line), `${p.id}: ${row.line} has no place for its tallest`);
    assert.deepEqual(p.solution, {none: true, lines: certs.map(s => words(n, s))});
    for (let s = 0; s < 4 * n; s++) refuse(p, fresh, {type: 'none', slot: s}, 'No city before any height');
    const tried = play(p, fresh, {type: 'set', cell: 0, value: n});
    const right = play(p, tried, {type: 'none', slot: line});
    assert.ok(isSolved(p, right.board), `${p.id}: No city with the right line`);
    assert.deepEqual(right.board.cells, tried.board.cells, `${p.id}: the reason is drawn on the child’s own grid`);
    // A line that has a place: the claim stays open, the line is marked, and
    // the hints still finish.
    const open = Array.from({length: 4 * n}, (_, s) => s).filter(s => !T.noPlace(n, clues, s));
    assert.ok(open.length, `${p.id}: some line has a place`);
    for (const s of open) {
      const missed = play(p, tried, {type: 'none', slot: s});
      assert.equal(missed.board.missed, s, `${p.id}: ${words(n, s)} is not the line`);
      assert.ok(!isSolved(p, missed.board));
      refuse(p, missed, {type: 'none', slot: s}, 'the same wrong line twice');
      hintsSolve(p, missed, `after tapping ${words(n, s)}`, fits);
    }
    hintsSolve(p, play(p, fresh, {type: 'set', cell: 0, value: 1}), 'after a height', fits);
    hintsSolve(p, tried, 'after a 3 in the corner', fits);
  }
  hintsSolve(p, fresh, 'from fresh', fits);
  for (const [action, why] of [[null, 'nothing'], [{type: 'set', cell: n * n, value: 1}, 'a square off the grid'], [{type: 'set', cell: 0, value: n + 1}, 'a height too tall'], [{type: 'set', cell: 0, value: 0}, 'clearing an empty square'], [{type: 'set', cell: 0, value: 1.5}, 'a fraction'], [{type: 'none'}, 'No city with no line'], [{type: 'none', slot: 4 * n}, 'a line off the grid'], [{type: 'swap', a: 0, b: 1}, 'a swap'], [{type: 'all'}, 'That’s all'], [{type: 'toggle', slot: 0}, 'a design move']]) refuse(p, fresh, action, why);
  const B = fresh.board, possible = fits.length > 0;
  const barredLine = possible ? 0 : slotFor(n, row.line), openLine = possible ? 0 : Array.from({length: 4 * n}, (_, s) => s).find(s => !T.noPlace(n, clues, s));
  const forged = [
    [{...B, cells: B.cells.slice(1)}, 'a grid of the wrong size'],
    [{...B, cells: B.cells.map(() => n + 1)}, 'heights too tall'],
    [{...B, cells: B.cells.map(() => -1)}, 'negative heights'],
    [{...B, refused: 'no'}, 'a refusal that is not true or false'],
    [{...B, extra: 1}, 'an unknown field'],
    [{cells: B.cells, line: null, missed: null, refused: false}, 'a missing field'],
    [{...B, tried: 1}, 'a try that is not true or false']
  ];
  const T1 = {...B, tried: true};
  if (possible) forged.push([{...T1, line: 0}, 'No city kept when a city fits'], [{...T1, missed: 0}, 'a missed line when a city fits'], [{...B, refused: true}, 'a refusal before any height']);
  else forged.push([{...T1, refused: true}, 'a refusal when no city fits'], [{...T1, line: openLine}, 'a line that has a place'], [{...T1, missed: barredLine}, 'a right line marked as missed'], [{...T1, line: barredLine, missed: openLine}, 'a line both right and missed'], [{...B, line: barredLine}, 'a No city before any height'], [{...B, missed: openLine}, 'a missed line before any height']);
  assert.ok(validBoard(p, possible ? {...T1, refused: true} : {...T1, line: barredLine}), `${p.id}: the claim after a try is a valid save`);
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// --- Every city, then one more number ------------------------------------------------
function checkEvery(p, fresh, row, n) {
  const clues = clueFlat(n, p.parameters.clues), list = fitList(n, clues), fits = list.map(key);
  assert.deepEqual(fits, row.answers, `${p.id}: cities that fit`);
  // One more number: a blank place and a height that only one city shows there.
  const blank = Array.from({length: 4 * n}, (_, s) => s).filter(s => !clues[s]), nums = list.map(g => numbers(n, g));
  const single = blank.flatMap(s => Array.from({length: n}, (_, v) => v + 1).filter(v => nums.filter(x => x[s] === v).length === 1).map(v => [s, v]));
  assert.equal(single.length, row.single, `${p.id}: added numbers that leave one city`);
  assert.deepEqual(T.singlingOut(p), single, `${p.id}: the mechanic agrees`);
  assert.deepEqual(p.solution, {cities: fits, oneMore: single.map(([s, v]) => [words(n, s), v])});
  // Witness: build each city in turn, That's all, then one more number.
  let a = fresh;
  for (const [i, k] of fits.entries()) {
    a = fillTo(p, a, k.split('').map(Number));
    assert.ok(a.board.found.includes(k), `${p.id}: ${k} is kept`);
    if (i === 0) {
      const early = play(p, a, {type: 'all'});
      if (fits.length > 1) {
        assert.equal(early.board.told, 'more', `${p.id}: there is another`);
        refuse(p, early, {type: 'all'}, 'That’s all again before a new city');
        const back = undoLikeApp(p, early);
        refuse(p, back, {type: 'all'}, 'That’s all again after Undo');
        assert.deepEqual(back.board.found, early.board.found, `${p.id}: Undo keeps the cities found`);
        hintsSolve(p, early, 'after a wrong That’s all', fits);
      }
    }
  }
  assert.deepEqual([...a.board.found].sort(), [...fits].sort(), `${p.id}: every city found`);
  a = play(p, a, {type: 'all'});
  assert.ok(a.board.all && !isSolved(p, a.board), `${p.id}: That’s all, then one more number`);
  refuse(p, a, {type: 'set', cell: 0, value: a.board.cells[0] % n + 1}, 'building after That’s all');
  refuse(p, a, {type: 'extra', slot: clues.findIndex(k => k > 0), value: 1}, 'a number on a place that has one');
  // A wrong number (two or more cities still fit), then hints.
  const blur = blank.flatMap(s => Array.from({length: n}, (_, v) => [s, v + 1])).find(([s, v]) => nums.filter(x => x[s] === v).length !== 1);
  if (blur) {
    const b = play(p, a, {type: 'extra', slot: blur[0], value: blur[1]});
    assert.ok(!isSolved(p, b.board), `${p.id}: ${blur[1]} ${words(n, blur[0])} leaves ${nums.filter(x => x[blur[0]] === blur[1]).length} cities`);
    hintsSolve(p, b, 'after a number that leaves several cities', fits);
    const cleared = play(p, b, {type: 'extra', slot: blur[0], value: 0});
    assert.equal(cleared.board.extra, null, `${p.id}: a number can be taken off`);
  }
  const done = play(p, a, {type: 'extra', slot: single[0][0], value: single[0][1]});
  assert.ok(isSolved(p, done.board), `${p.id}: one more number leaves one city`);
  hintsSolve(p, fresh, 'from fresh', fits);
  hintsSolve(p, play(p, fresh, {type: 'set', cell: 0, value: n}), 'after a wrong height', fits);
  for (const [action, why] of [[null, 'nothing'], [{type: 'extra', slot: blank[0], value: 1}, 'a number before That’s all'], [{type: 'set', cell: -1, value: 1}, 'a square off the grid'], [{type: 'none', slot: 0}, 'No city'], [{type: 'toggle', slot: 0}, 'a design move']]) refuse(p, fresh, action, why);
  refuse(p, a, {type: 'extra', slot: blank[0], value: n + 1}, 'a number too tall');
  refuse(p, a, {type: 'extra', slot: 4 * n, value: 1}, 'a place off the edge');
  refuse(p, a, {type: 'all'}, 'That’s all twice');
  const B = fresh.board, notOne = latinSquares(n).map(key).find(k => !fits.includes(k));
  for (const [board, why] of [
    [{...B, found: [notOne]}, 'a found city that does not fit'],
    [{...B, found: [fits[0], fits[0]]}, 'a city found twice'],
    [{...B, all: true}, 'That’s all before every city'],
    [{...B, found: [...fits], told: 'more'}, '“there is another” when none is'],
    [{...B, told: 'again'}, 'an unknown message'],
    [{...B, found: [...fits], all: true, extra: [clues.findIndex(k => k > 0), 1]}, 'a number on a place that has one'],
    [{...B, extra: [blank[0], 1]}, 'a number before That’s all'],
    [{...B, cells: fits[0].split('').map(Number)}, 'a city that fits but was not kept'],
    [{...B, all: 'yes'}, 'a That’s all that is not true or false'],
    [{...B, extra: 1}, 'an unknown field shape']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// --- Make a puzzle ---------------------------------------------------------------------
function checkDesign(p, fresh, row, n) {
  const q = p.parameters, sets = determining(n, q.city, q.budget);
  assert.equal(sets.length, row.sets, `${p.id}: sets of numbers that fit only this city`);
  assert.equal(Math.min(...sets.map(s => s.length)), row.fewest, `${p.id}: fewest numbers`);
  assert.equal(q.budget, row.fewest, `${p.id}: the budget is the fewest, so the puzzle is to find a set`);
  assert.deepEqual(T.designSets(p).map(s => s.join()).sort(), sets.map(s => s.join()).sort(), `${p.id}: the mechanic agrees`);
  assert.equal(latinSquares(n).filter(g => numbers(n, g).join() === numbers(n, q.city).join()).length, 1, `${p.id}: a city that can be singled out`);
  let a = fresh;
  for (const s of sets[0]) a = play(p, a, {type: 'toggle', slot: s});
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  assert.equal(T.secondCity(p, a.board.shown), null, `${p.id}: no second city once solved`);
  // A full budget that leaves another city: the app shows one, and the hints finish.
  const pick = [], used = new Set(sets.flat());
  for (let s = 0; s < 4 * n && pick.length < q.budget; s++) if (!used.has(s) || pick.length < q.budget - 1) { const trial = [...pick, s]; if (!sets.some(t => t.every(x => trial.includes(x)))) pick.push(s); }
  let b = fresh;
  for (const s of pick) {
    b = play(p, b, {type: 'toggle', slot: s});
    const other = T.secondCity(p, b.board.shown), mine = numbers(n, q.city), theirs = other && numbers(n, other);
    assert.ok(other && key(other) !== key(q.city) && b.board.shown.every(x => theirs[x] === mine[x]) && latinSquares(n).some(g => key(g) === key(other)), `${p.id}: a second city that fits ${b.board.shown}`);
  }
  assert.equal(b.board.shown.length, q.budget);
  refuse(p, b, {type: 'toggle', slot: Array.from({length: 4 * n}, (_, s) => s).find(s => !b.board.shown.includes(s))}, 'a number past the budget');
  hintsSolve(p, b, 'after a full budget that leaves another city');
  hintsSolve(p, fresh, 'from fresh');
  const back = play(p, b, {type: 'toggle', slot: b.board.shown[0]});
  assert.equal(back.board.shown.length, q.budget - 1, `${p.id}: a number can be hidden again`);
  for (const [action, why] of [[null, 'nothing'], [{type: 'toggle', slot: 4 * n}, 'a place off the edge'], [{type: 'toggle', slot: '1'}, 'a place named by a string'], [{type: 'set', cell: 0, value: 1}, 'a height'], [{type: 'all'}, 'That’s all'], [{type: 'none'}, 'a claim']]) refuse(p, fresh, action, why);
  for (const [board, why] of [
    [{shown: Array.from({length: q.budget + 1}, (_, s) => s)}, 'numbers past the budget'],
    [{shown: [1, 0]}, 'places out of order'],
    [{shown: [0, 0]}, 'a place twice'],
    [{shown: [4 * n]}, 'a place off the edge'],
    [{shown: [], extra: 1}, 'an unknown field'],
    [{}, 'a missing field']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// --- Twin cities -----------------------------------------------------------------------
function checkTwins(p, fresh, row, n) {
  const q = p.parameters, mine = numbers(n, q.city).join();
  const twins = latinSquares(n).filter(g => key(g) !== key(q.city) && numbers(n, g).join() === mine).map(key);
  assert.deepEqual(twins, row.answers, `${p.id}: cities with the same numbers`);
  assert.deepEqual(p.solution, {twins});
  const a = fillTo(p, fresh, twins[0].split('').map(Number));
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  // The first city itself, a grid that repeats a height, and a city with other numbers do not.
  const other = latinSquares(n).find(g => numbers(n, g).join() !== mine);
  assert.ok(!isSolved(p, fillTo(p, fresh, other).board), `${p.id}: a city with other numbers`);
  const repeat = play(p, fresh, {type: 'set', cell: 0, value: q.city[1]});
  assert.ok(!isSolved(p, repeat.board), `${p.id}: a repeated height`);
  hintsSolve(p, repeat, 'after a wrong height', twins);
  hintsSolve(p, fresh, 'from fresh', twins);
  for (const [action, why] of [[null, 'nothing'], [{type: 'set', cell: 0, value: q.city[0]}, 'the same height'], [{type: 'set', cell: n * n, value: 1}, 'a square off the grid'], [{type: 'set', cell: 0, value: n + 1}, 'a height too tall'], [{type: 'none', slot: 0}, 'a claim'], [{type: 'toggle', slot: 0}, 'a design move']]) refuse(p, fresh, action, why);
  for (const [board, why] of [[{cells: q.city.slice(1)}, 'a grid of the wrong size'], [{cells: q.city.map(v => v + 1)}, 'heights too tall'], [{cells: q.city, extra: 1}, 'an unknown field'], [{}, 'a missing field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// --- What the notes say ------------------------------------------------------------------
function checkNotes(pack, facts) {
  const P = Object.fromEntries(pack.puzzles.map(p => [p.number, p]));
  const has = (k, text) => assert.ok(JSON.stringify(P[k].parent).includes(text), `puzzle ${k}'s notes say “${text}”`);
  // 1: the row 1, 3, 2 shows 2 and 2.
  assert.deepEqual([visible([1, 3, 2]), visible([2, 3, 1])], [2, 2]); has(1, '(2 and 2.)');
  // 2: the cards no row of three shows.
  const no3 = []; for (let L = 1; L <= 3; L++) for (let R = 1; R <= 3; R++) if (!rowsWith(3, L, R).length) no3.push(`${L}${R}`);
  assert.deepEqual(no3, ['11', '23', '32', '33']); has(2, '(3 and 3, 2 and 3, 3 and 2.)');
  // 4: cards of four with a row; 5: six rows show 2 and 2.
  for (let L = 1; L <= 4; L++) for (let R = 1; R <= 4; R++) assert.equal(rowsWith(4, L, R).length > 0, L + R <= 5 && !(L === 1 && R === 1));
  assert.equal(rowsWith(4, 2, 2).length, 6); has(5, '(Six.)');
  // 7: what one more number leaves.
  const p7 = P[7], n7 = 3, c7 = clueFlat(3, p7.parameters.clues), l7 = fitList(3, c7), nums7 = l7.map(g => numbers(3, g));
  const only = (s, v) => nums7.map((x, i) => x[s] === v ? i : -1).filter(i => i >= 0);
  assert.deepEqual(only(slotFor(n7, 'above column 2'), 3), [0]); assert.deepEqual(only(slotFor(n7, 'below column 1'), 3), [2]);
  const second = ['3 above column 3', '2 below column 2', '1 below column 3', '2 right of row 2', '1 right of row 3'];
  const forSecond = []; for (let s = 0; s < 12; s++) if (!c7[s]) for (let v = 1; v <= 3; v++) if (only(s, v).join() === '1') forSecond.push(`${v} ${words(3, s)}`);
  assert.deepEqual(forSecond.sort(), second.sort()); has(7, '(3 above column 3, 2 below column 2, 1 below column 3, 2 right of row 2, 1 right of row 3.)');
  // 8: 13 of the 66 pairs, six with the 3 right of row 2.
  const s8 = determining(3, P[8].parameters.city, 2), r2 = slotFor(3, 'right of row 2');
  assert.equal(s8.length, 13); assert.equal(choose(12, 2), 66); assert.equal(numbers(3, P[8].parameters.city)[r2], 3);
  assert.equal(s8.filter(s => s.includes(r2)).length, 6); has(8, '(13 of the 66 pairs; the 3 right of row 2 is in six of them.)');
  assert.ok(s8.some(s => s.join() === [r2, slotFor(3, 'below column 2')].sort((x, y) => x - y).join()) && numbers(3, P[8].parameters.city)[slotFor(3, 'below column 2')] === 3, 'the 3 right of row 2 with the 3 below column 2');
  // 9: dropping any one of the four 2s leaves at least ten cities; three
  // numbers of this city can fix it.
  const c9 = clueFlat(4, P[9].parameters.clues), twos = c9.map((k, s) => k ? s : -1).filter(s => s >= 0);
  assert.deepEqual(twos.map(s => c9[s]), [2, 2, 2, 2]);
  const left = twos.map(s => fitList(4, c9.map((k, t) => t === s ? 0 : k)).length);
  assert.ok(Math.min(...left) >= 10, `dropping a 2 leaves ${left}`); has(9, 'at least ten cities');
  assert.ok(facts.fixedByThree.includes('2134142343123241'), 'puzzle 9’s city has a set of three');
  // 10: which numbers single out the second and third cities; the first and fourth share theirs.
  const c10 = clueFlat(4, P[10].parameters.clues), l10 = fitList(4, c10), nums10 = l10.map(g => numbers(4, g));
  const by = i => { const out = []; for (let s = 0; s < 16; s++) if (!c10[s]) for (let v = 1; v <= 4; v++) { const w = nums10.map((x, j) => x[s] === v ? j : -1).filter(j => j >= 0); if (w.length === 1 && w[0] === i) out.push(`${v} ${words(4, s)}`); } return out.sort(); };
  assert.deepEqual(by(0), []); assert.deepEqual(by(3), []);
  assert.deepEqual(by(1), ['3 below column 3', '3 below column 4', '3 right of row 3', '3 right of row 4']);
  assert.deepEqual(by(2), ['2 below column 4', '2 right of row 4', '3 above column 2', '3 left of row 2']);
  assert.equal(nums10[0].join(), nums10[3].join());
  // 11: every set of three uses the 4 left of row 1; seven use the 3 left of row 2.
  const s11 = determining(4, P[11].parameters.city, 3), l1 = slotFor(4, 'left of row 1'), l2 = slotFor(4, 'left of row 2'), v11 = numbers(4, P[11].parameters.city);
  assert.equal(v11[l1], 4); assert.equal(v11[l2], 3);
  assert.ok(s11.every(s => s.includes(l1))); assert.equal(s11.filter(s => s.includes(l2)).length, 7);
  assert.ok(s11.every(s => s.some(x => v11[x] === 4)), 'no set of three without a 4');
  has(11, 'every one uses the 4 left of row 1'); has(11, 'Only 208 of the 576'); has(11, '204 can’t be fixed');
  // 12: the twin is puzzle 10's fourth city, by switching the middle block.
  const t12 = P[12].parameters.city, twin = P[12].solution.twins[0].split('').map(Number);
  assert.equal(key(t12), key(l10[0])); assert.equal(key(twin), key(l10[3]));
  assert.deepEqual(t12.map((v, k) => v !== twin[k] ? k : -1).filter(k => k >= 0), [5, 6, 9, 10], 'the middle four squares');
  has(12, '204 of the 576'); has(12, '152 of the 262');
  // Puzzle 9's line-by-line passes: the mechanic's propagation settles every square.
  const cand = T.candidates(4, c9, Array(16).fill(0));
  assert.ok(cand.every(c => c.length === 1), 'puzzle 9 is settled line by line');
  const passes = Math.max(...cand.when);
  assert.ok(passes >= 6 && passes <= 8, `about seven passes (${passes})`); has(9, 'about seven passes');
}

export default validateTowers;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateTowers(), null, 2));
