// Checks the Mixed-up cups pack (dist/families/mixup/mixup.json): content
// fields and sources; every puzzle's rows against an independent enumeration
// (Heap's algorithm, with each cup's home looked up from the cup's side); the
// theorems the notes rely on, for up to seven cups (the overlap formula and
// its per-row cancellation, the recurrence by reversible deletion, the counts
// by number at home); the shelf's columns and hoops; hint chains to a solve;
// illegal moves; forged saves; and the playground.
// Run: node scripts/validate-mixup.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {targetRows} from '../dist/families/mixup/mixup.js';
import {loadPack} from './packs.mjs';

// An independent enumeration. A row is a string, home h holding row[h]; a
// cup's home is found from the cup's side, as a map cup → the home it is on.
const ABC = 'ABCDEFG';
function heap(n) {
  const a = [...ABC.slice(0, n)], c = Array(n).fill(0), out = [a.join('')];
  let i = 0;
  while (i < n) {
    if (c[i] < i) { const j = i % 2 ? c[i] : 0; [a[j], a[i]] = [a[i], a[j]]; out.push(a.join('')); c[i]++; i = 0; } else { c[i] = 0; i++; }
  }
  return out;
}
const whereIs = row => Object.fromEntries([...row].map((cup, h) => [cup, ABC[h]]));
const homeSet = row => { const w = whereIs(row); return Object.keys(w).filter(cup => w[cup] === cup).sort().join(''); };
const derangements = n => heap(n).filter(row => !homeSet(row));
const choose = (n, k) => k < 0 || k > n ? 0 : Array.from({length: k}, (_, i) => (n - i) / (i + 1)).reduce((x, y) => x * y, 1);
const factorial = n => n <= 1 ? 1 : n * factorial(n - 1);
const subsets = list => list.reduce((all, x) => [...all, ...all.map(s => [...s, x])], [[]]);
function satisfies(rule, row) {
  const home = homeSet(row);
  if (rule.type === 'away') return [...rule.cups].every(c => !home.includes(c));
  if (rule.type === 'some-home') return [...rule.cups].some(c => home.includes(c));
  if (rule.type === 'home-count') return home.length === rule.count;
  throw Error(`unknown rule ${rule.type}`);
}
const rowsFor = q => heap(q.cups).filter(row => [...(q.pinned || '')].every(h => whereIs(row)[q.start[ABC.indexOf(h)]] === h));
const sorted = list => [...list].sort();

// Theorems, for one to seven cups.
function theorems() {
  const D = [1, 0];
  for (let n = 2; n <= 7; n++) D[n] = (n - 1) * (D[n - 1] + D[n - 2]);
  const facts = {};
  for (let n = 1; n <= 7; n++) {
    const rows = heap(n), none = derangements(n);
    assert.equal(rows.length, factorial(n));
    assert.equal(new Set(rows).size, rows.length, `${n}: Heap lists each row once`);
    // Fixing k named cups leaves (n − k)! rows, more cups at home allowed.
    for (const S of subsets([...ABC.slice(0, n)])) assert.equal(rows.filter(r => S.every(c => homeSet(r).includes(c))).length, factorial(n - S.length));
    // The overlap formula.
    const formula = Array.from({length: n + 1}, (_, k) => (-1) ** k * choose(n, k) * factorial(n - k)).reduce((x, y) => x + y, 0);
    assert.equal(none.length, formula, `${n}: inclusion–exclusion`);
    assert.equal(none.length, D[n], `${n}: the recurrence`);
    // Each row's weight over the overlaps it is in: 1 with none at home, else 0.
    for (const r of rows) assert.equal(subsets([...homeSet(r)]).reduce((s, S) => s + (-1) ** S.length, 0), homeSet(r) ? 0 : 1);
    // Rows with exactly k at home: C(n, k) · D(n − k).
    for (let k = 0; k <= n; k++) assert.equal(rows.filter(r => homeSet(r).length === k).length, choose(n, k) * D[n - k], `${n}: ${k} at home`);
    facts[n] = none.length;
  }
  // Reversible deletion, for two to seven cups: in every row with none at home
  // and the last cup z on home A, either A is on z's home (take both out: a row
  // of the middle cups with none at home) or not (take z out and put the cup
  // from z's home on home A: a row of the first n − 1 with none at home). Both
  // steps are one-to-one and onto.
  for (let n = 3; n <= 7; n++) {
    const z = ABC[n - 1], rows = derangements(n).filter(r => r[0] === z);
    const trade = rows.filter(r => r[n - 1] === 'A'), along = rows.filter(r => r[n - 1] !== 'A');
    const small = trade.map(r => r.slice(1, n - 1)), shrunk = along.map(r => r[n - 1] + r.slice(1, n - 1));
    const middle = heap(n - 2).map(r => [...r].map(c => ABC[ABC.indexOf(c) + 1]).join('')).filter(r => [...r].every((c, i) => c !== ABC[i + 1]));
    assert.deepEqual(sorted(small), sorted(middle), `${n}: trades shrink onto the middle rows, one to one`);
    assert.deepEqual(sorted(shrunk), sorted(derangements(n - 1)), `${n}: the rest shrink onto rows of n − 1, one to one`);
    // And back: each smaller row grows one way.
    assert.deepEqual(sorted(derangements(n - 1).map(r => z + r.slice(1) + r[0])), sorted(along), `${n}: growing back`);
    assert.equal(rows.length, D[n - 1] + D[n - 2]);
  }
  return facts;
}

// The shelf's columns and hoops, recomputed.
function shelfCounts(q, rows) {
  const s = q.shelf, home = r => homeSet(r);
  if (s.type === 'list') return null;
  if (s.type === 'hoops') {
    const [x, y] = s.cups, inX = r => home(r).includes(x), inY = r => home(r).includes(y);
    return {left: rows.filter(r => inX(r) && !inY(r)).length, both: rows.filter(r => inX(r) && inY(r)).length, right: rows.filter(r => !inX(r) && inY(r)).length};
  }
  if (s.by === 'home') return Object.fromEntries([...ABC.slice(0, q.cups)].map(c => [c, rows.filter(r => home(r) === c).length]));
  if (s.by === 'in-home') return {yes: rows.filter(r => whereIs(r)[s.cup] === s.home).length, no: rows.filter(r => whereIs(r)[s.cup] !== s.home).length};
  if (s.by === 'staying') return Object.fromEntries(['', ...s.cups, s.cups].map(id => [id || 'neither', rows.filter(r => [...s.cups].filter(c => home(r).includes(c)).join('') === id).length]));
  throw Error(`unknown shelf ${JSON.stringify(s)}`);
}
const shelves = {
  'mixup-03': {left: 1, both: 1, right: 1},
  'mixup-04': {yes: 1, no: 2},
  'mixup-06': {left: 4, both: 2, right: 4},
  'mixup-07': {A: 2, B: 2, C: 2, D: 2},
  'mixup-08': {neither: 9, C: 2, D: 2, CD: 1},
  'mixup-09': {yes: 2, no: 9}
};

export async function validateMixup() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const mixup = await read('../dist/families/mixup/mixup.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of mixup.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(mixup.families.length, 1);
  const family = mixup.families[0];
  assert.equal(family.id, 'mixup'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = mixup.puzzles.filter(p => p.band === 'all'), playgrounds = mixup.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, mixup.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  for (const p of mixup.puzzles) {
    assert.equal(p.mechanic, 'mixup'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
    assert.ok(p.id === 'mixup-playground' || p.id === `mixup-${String(p.number).padStart(2, '0')}`, `${p.id}: id`);
    for (const key of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id} ${key}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id} parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
  }
  const facts = theorems();

  let steps = 0;
  const answers = {};
  for (const p of core) {
    const q = p.parameters, n = q.cups;
    // The rows that count, by the independent enumeration.
    const universe = rowsFor(q), want = universe.filter(r => satisfies(q.rule, r));
    assert.deepEqual(sorted(targetRows(q)), sorted(want), `${p.id}: the rows that count`);
    assert.ok(want.length >= 2, `${p.id}: more than one row to find`);
    assert.ok(!want.includes(q.start), `${p.id}: the start is not already one to keep`);
    assert.ok(universe.includes(q.start), `${p.id}: the start keeps the pinned cups`);
    if (q.pinned) assert.ok([...q.pinned].every(h => q.start[ABC.indexOf(h)] !== h), `${p.id}: a pinned cup is not at home`);
    assert.deepEqual(shelfCounts(q, want), shelves[p.id] || null, `${p.id}: shelf columns`);
    answers[p.id] = want.length;

    // Hints alone reach a solve, and every hint is a legal move.
    let a = freshAttempt(p);
    assert.ok(validBoard(p, a.board) && !isSolved(p, a.board), `${p.id}: valid unsolved start`);
    for (let i = 0; !isSolved(p, a.board) && i < 400; i++) {
      const hint = nextHint(p, a);
      assert.equal(hint.type, 'move', `${p.id}: ${hint.text}`);
      const next = move(p, a, hint.action);
      assert.ok(next && next !== a, `${p.id}: hint ${JSON.stringify(hint.action)} is legal`);
      a = next; steps++;
    }
    assert.ok(isSolved(p, a.board), `${p.id}: hints reach a solve`);
    assert.deepEqual(sorted(a.board.kept), sorted(want), `${p.id}: solved with every row that counts, each once`);
    for (const bad of [{type: 'claim'}, {type: 'keep'}, {type: 'swap', a: n - 2, b: n - 1}, {type: 'load', row: a.board.kept[0]}]) assert.equal(move(p, a, bad), null, `${p.id}: no ${bad.type} after a solve`);

    // Illegal moves change nothing.
    const fresh = freshAttempt(p);
    for (const bad of [null, 'keep', {type: 'jump'}, {type: 'swap', a: 1, b: 1}, {type: 'swap', a: 1, b: n}, {type: 'swap', a: -1, b: 1}, {type: 'swap', a: '1', b: 2}, {type: 'load', row: want[0]}, {type: 'cups', cups: 3}, {type: 'shuffle'}, {type: 'clear'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    assert.equal(move(p, fresh, {type: 'keep'}), null, `${p.id}: a row that doesn't count can't be kept`);
    for (const h of [...(q.pinned || '')]) assert.equal(move(p, fresh, {type: 'swap', a: ABC.indexOf(h), b: (ABC.indexOf(h) + 1) % n}), null, `${p.id}: a pinned cup stays`);
    // An early That's all says there's another, once, until something new is kept.
    const target = want.find(r => r !== q.start);
    let b = fresh;
    for (let i = 0; b.board.row !== target; i++) {
      const h = [...b.board.row].findIndex((c, k) => c !== target[k]);
      b = move(p, b, {type: 'swap', a: h, b: b.board.row.indexOf(target[h])});
      assert.ok(b && i < n, `${p.id}: reach a row that counts`);
    }
    const kept = move(p, b, {type: 'keep'});
    assert.ok(kept && kept.board.kept.length === 1, `${p.id}: Keep`);
    assert.equal(move(p, kept, {type: 'keep'}), null, `${p.id}: a row is kept once`);
    const early = move(p, kept, {type: 'claim'});
    assert.ok(early && early.board.missed && !isSolved(p, early.board), `${p.id}: an early That’s all says there is another`);
    assert.equal(move(p, early, {type: 'claim'}), null, `${p.id}: not twice in a row`);
    const back = undo(early);
    assert.ok(validBoard(p, back.board) && !back.board.missed, `${p.id}: Undo takes it back`);
    const away = move(p, kept, {type: 'swap', a: 1, b: 2}) || move(p, kept, {type: 'swap', a: 2, b: 3});
    const loaded = move(p, away, {type: 'load', row: target});
    assert.ok(loaded && loaded.board.row === target, `${p.id}: a kept row loads back onto the cups`);

    // Forged saves are rejected.
    const f = fresh.board, others = universe.filter(r => !want.includes(r));
    const forged = [
      null, [], {...f, row: f.row.slice(1)}, {...f, row: f.row.replace(f.row[0], f.row[1])}, {...f, row: 'ABCDEF'.slice(0, n + 1)},
      {...f, kept: [want[0], want[0]]}, {...f, kept: [others[0]]}, {...f, kept: 'ABC'}, {...f, claimed: 'yes'}, {...f, missed: 1},
      {...f, claimed: true}, {...f, kept: want, missed: true}, {...f, kept: want, claimed: true, missed: true}
    ];
    if (q.pinned) forged.push({...f, row: heap(n).find(r => !universe.includes(r))});
    for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
    assert.ok(validBoard(p, {...f, kept: want, claimed: true}), `${p.id}: a real solve is a valid save`);
  }

  // Playground: three to five cups; any row can be kept, once; it never counts as solved.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.ok(validBoard(pg, a.board) && !isSolved(pg, a.board));
  for (const cups of [3, 4, 5]) {
    a = move(pg, a, {type: 'cups', cups}) || a;
    assert.equal(a.board.cups, cups); assert.equal(a.board.row, ABC.slice(0, cups)); assert.deepEqual(a.board.kept, []);
    a = move(pg, a, {type: 'keep'});
    assert.equal(move(pg, a, {type: 'keep'}), null, `${cups}: kept once`);
    const shuffled = move(pg, a, {type: 'shuffle'}, () => 0.5);
    assert.ok(shuffled && shuffled.board.row !== a.board.row && validBoard(pg, shuffled.board), `${cups}: Shuffle`);
    a = move(pg, move(pg, a, {type: 'swap', a: 0, b: 1}), {type: 'keep'});
    assert.equal(a.board.kept.length, 2);
    a = move(pg, a, {type: 'load', row: ABC.slice(0, cups)});
    assert.equal(a.board.row, ABC.slice(0, cups), `${cups}: Load`);
    assert.ok(!isSolved(pg, a.board), 'the playground never counts as solved');
  }
  const cleared = move(pg, a, {type: 'clear'});
  assert.deepEqual(cleared.board.kept, []);
  assert.equal(move(pg, cleared, {type: 'clear'}), null);
  for (const bad of [{type: 'cups', cups: 6}, {type: 'cups', cups: a.board.cups}, {type: 'swap', a: 0, b: 9}, {type: 'load', row: 'EDCBA'}, {type: 'claim'}]) assert.equal(move(pg, a, bad), null, `playground rejects ${JSON.stringify(bad)}`);
  for (const board of [{...a.board, cups: 6}, {...a.board, row: 'ABCD'}, {...a.board, kept: ['ABCDE', 'ABCDE']}, {...a.board, kept: ['ABC']}]) assert.equal(validBoard(pg, board), false, `playground rejects ${JSON.stringify(board)}`);
  return {mixupPuzzles: core.length, playground: 1, sources: mixup.sources.length, rowsToFind: answers, hintSteps: steps, noneAtHome: facts};
}
export default validateMixup;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateMixup(), null, 2));
