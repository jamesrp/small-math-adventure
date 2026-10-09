// Checks the Copying bags pack (dist/families/copies/copies.json): content
// fields and sources; every puzzle's answer against a separate enumeration (a
// bag as colour counts, histories as lists of colour-and-copy numbers, built
// by recursion rather than from the mechanic); the theorems the notes rely on
// (copying makes every number of reds equally likely, n! histories each, for
// one to six draws; every order of the same colours has the same number of
// histories; neither colour vanishes; putting back gives binomial columns and
// adding the other colour 1, 4, 1 for two draws and 1, 11, 11, 1 for three;
// three colours split evenly); that each puzzle's rules state its own rule and
// that puzzles 1–3 leave chance out; hint chains to a solve; illegal moves;
// forged saves; and the playground.
// Run: node scripts/validate-copies.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// A separate enumeration. A bag is a map from colour to how many counters it
// holds; drawing the k-th counter of a colour is the pair [colour, k].
function every(start, rule, n) {
  const bag = {};
  for (const c of start) bag[c] = (bag[c] || 0) + 1;
  const out = [];
  (function go(b, h) {
    if (h.length === n) { out.push({history: h, bag: b}); return; }
    for (const c of Object.keys(b)) for (let k = 1; k <= b[c]; k++) {
      const next = {...b}, add = rule === 'copy' ? c : rule === 'other' ? (c === 'R' ? 'B' : 'R') : null;
      if (add) next[add] = (next[add] || 0) + 1;
      go(next, [...h, [c, k]]);
    }
  })(bag, []);
  return out;
}
const key = h => h.map(([c, k]) => c + k).join('');
const word = h => h.map(([c]) => c).join('');
const reds = h => h.filter(([c]) => c === 'R').length;
const bagOf = b => ['R', 'B', 'Y'].map(c => c.repeat(b[c] || 0)).join('');
const fact = n => n <= 1 ? 1 : n * fact(n - 1);
const choose = (n, k) => fact(n) / (fact(k) * fact(n - k));
const columns = (list, by) => list.reduce((t, x) => ({...t, [by(x)]: (t[by(x)] || 0) + 1}), {});

function theorems() {
  const facts = {};
  for (let n = 1; n <= 6; n++) {
    const all = every('RB', 'copy', n);
    assert.equal(all.length, fact(n + 1), `${n}: (n + 1)! histories`);
    const byReds = columns(all, x => reds(x.history));
    assert.deepEqual(Object.values(byReds), Array(n + 1).fill(fact(n)), `${n}: n! for every number of reds`);
    const byWord = columns(all, x => word(x.history));
    for (const [w, count] of Object.entries(byWord)) { const k = [...w].filter(c => c === 'R').length; assert.equal(count, fact(k) * fact(n - k), `${n} ${w}: k!(n − k)! for every order`); }
    assert.ok(all.every(x => x.bag.R >= 1 && x.bag.B >= 1), `${n}: neither colour vanishes`);
    const back = columns(every('RB', 'return', n), x => reds(x.history));
    assert.deepEqual(Object.values(back), Array.from({length: n + 1}, (_, k) => choose(n, k)), `${n}: putting back is binomial`);
    assert.equal(every('RB', 'other', n).length, fact(n + 1), `${n}: the other colour also grows the bag by one`);
    if (n <= 4) facts[n] = {copy: Object.values(byReds), return: Object.values(back), other: Object.values(columns(every('RB', 'other', n), x => reds(x.history)))};
  }
  assert.deepEqual(facts[2].other, [1, 4, 1]);
  assert.deepEqual(facts[3].other, [1, 11, 11, 1]);
  assert.deepEqual(facts[4].other, [1, 26, 66, 26, 1]);
  for (let n = 1; n <= 4; n++) {
    const mix = columns(every('RBY', 'copy', n), x => [...word(x.history)].sort().join(''));
    assert.ok(Object.values(mix).every(c => c === fact(n)), `three colours, ${n} draws: every mix n! times`);
    facts[`three${n}`] = Object.keys(mix).length;
  }
  return facts;
}

// The answers each puzzle asks for, by the enumeration.
function answer(q) {
  const n = q.mode === 'make' ? q.target.length - q.start.length : q.draws, all = every(q.start, q.rule, n);
  if (q.mode === 'make') return all.filter(x => bagOf(x.bag) === q.target).map(x => key(x.history));
  if (q.mode === 'bags') return [...new Set(all.map(x => bagOf(x.bag)))];
  if (q.mode === 'stories') return [...new Set(all.filter(x => bagOf(x.bag) === q.target).map(x => word(x.history)))];
  return all.filter(x => q.reds === undefined || reds(x.history) === q.reds).map(x => key(x.history));
}
const expected = {
  'copies-02': ['RBBBB', 'RRBBB', 'RRRBB', 'RRRRB'],
  'copies-03': ['BBRR', 'BRBR', 'BRRB', 'RBBR', 'RBRB', 'RRBB'],
  'copies-04': ['B1B1', 'B1B2', 'B1R1', 'R1B1', 'R1R1', 'R1R2'],
  'copies-05': ['B1B1', 'B1R1', 'R1B1', 'R1R1'],
  'copies-06': ['B1B1B1', 'B1B1B2', 'B1B1B3', 'B1B2B1', 'B1B2B2', 'B1B2B3'],
  'copies-07': ['B1R1R1', 'B1R1R2', 'R1B1R1', 'R1B1R2', 'R1R1B1', 'R1R2B1'],
  'copies-08': ['B1B1', 'B1R1', 'B1R2', 'R1B1', 'R1B2', 'R1R1']
};
const sorted = list => [...list].sort();

export async function validateCopies() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const pack = await read('../dist/families/copies/copies.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  const family = pack.families[0];
  assert.equal(family.id, 'copies'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = pack.puzzles.filter(p => p.band === 'all'), playgrounds = pack.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, pack.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'copies'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
    assert.ok(p.id === 'copies-playground' || p.id === `copies-${String(p.number).padStart(2, '0')}`, `${p.id}: id`);
    for (const k of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id} ${k}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const k of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[k]?.trim(), `${p.id} parent.${k}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
    // The rules name the puzzle's own rule; puzzles that ask only what can
    // happen leave chance out.
    const q = p.parameters, said = p.rules.join(' ');
    if (q.rule) assert.match(said, {copy: /a copy of its colour joins it/, return: /nothing joins it/, other: /the other colour joins it/}[q.rule], `${p.id}: the rules state the ${q.rule} rule`);
    if (['make', 'bags', 'stories'].includes(q.mode)) assert.doesNotMatch(`${said} ${p.objective}`, /likely/, `${p.id}: no chance in a puzzle about what can happen`);
  }
  const facts = theorems();

  let hintSteps = 0;
  const answers = {};
  for (const p of core) {
    const q = p.parameters, want = answer(q);
    if (expected[p.id]) assert.deepEqual(sorted(want), expected[p.id], `${p.id}: the notes' answer`);
    answers[p.id] = want.length;

    // Hints alone reach a solve, and every hint is a legal move.
    let a = freshAttempt(p);
    assert.ok(validBoard(p, a.board) && !isSolved(p, a.board), `${p.id}: valid unsolved start`);
    for (let i = 0; !isSolved(p, a.board) && i < 300; i++) {
      const hint = nextHint(p, a);
      assert.equal(hint.type, 'move', `${p.id}: ${hint.text}`);
      const next = move(p, a, hint.action);
      assert.ok(next && next !== a, `${p.id}: hint ${JSON.stringify(hint.action)} is legal`);
      a = next; hintSteps++;
    }
    assert.ok(isSolved(p, a.board), `${p.id}: hints reach a solve`);
    for (const bad of [{type: 'draw', id: 'R1'}, {type: 'again'}, {type: 'keep'}, {type: 'claim'}]) assert.equal(move(p, a, bad), null, `${p.id}: no ${bad.type} after a solve`);
    if (q.mode === 'make') assert.ok(want.includes(a.board.draws.join('')), `${p.id}: solved by a history that makes the bag`);
    else assert.deepEqual(sorted(a.board.kept), sorted(want), `${p.id}: solved with everything, each once`);

    // Illegal moves change nothing.
    const fresh = freshAttempt(p), f = fresh.board, n = q.mode === 'make' ? q.target.length - q.start.length : q.draws;
    for (const bad of [null, 'draw', {type: 'jump'}, {type: 'draw', id: 'R2'}, {type: 'draw', id: 'G1'}, {type: 'draw'}, {type: 'again'}, {type: 'load', key: 'R1'}, {type: 'random'}, {type: 'rule', rule: 'return'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    // A copy joins the bag and can be drawn next.
    const one = move(p, fresh, {type: 'draw', id: 'R1'});
    if (q.rule === 'copy') assert.ok(move(p, one, {type: 'draw', id: 'R2'}), `${p.id}: red 2 joins after red 1`);
    if (q.rule === 'return') assert.equal(move(p, one, {type: 'draw', id: 'R2'}), null, `${p.id}: no copy without copying`);
    if (q.rule === 'other') assert.ok(move(p, one, {type: 'draw', id: 'B2'}), `${p.id}: blue 2 joins after red 1`);
    let full = fresh;
    for (let k = 0; k < n; k++) full = move(p, full, {type: 'draw', id: 'B1'});
    assert.equal(full.board.draws.length, n);
    assert.equal(move(p, full, {type: 'draw', id: 'B1'}), null, `${p.id}: no draw after the last`);
    assert.deepEqual(move(p, full, {type: 'again'}).board.draws, [], `${p.id}: Again`);
    if (q.mode === 'make') {
      for (const bad of [{type: 'keep'}, {type: 'claim'}]) assert.equal(move(p, full, bad), null, `${p.id}: no ${bad.type} in a make puzzle`);
      for (const board of [null, {}, {draws: ['R2']}, {draws: ['B1', 'B1', 'B1', 'B1']}, {draws: [], kept: []}, {draws: 'B1'}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      continue;
    }
    // Find-every: keep one that counts, refuse one that doesn't or a repeat,
    // That's all early, Undo.
    const ok = every(q.start, q.rule, n).find(x => q.mode === 'histories' ? (q.reds === undefined || reds(x.history) === q.reds) : q.mode === 'stories' ? bagOf(x.bag) === q.target : true);
    const no = every(q.start, q.rule, n).find(x => q.mode === 'histories' ? q.reds !== undefined && reds(x.history) !== q.reds : q.mode === 'stories' && bagOf(x.bag) !== q.target);
    let b = fresh;
    for (const [c, k] of ok.history) b = move(p, b, {type: 'draw', id: c + k});
    const kept = move(p, b, {type: 'keep'});
    assert.ok(kept && kept.board.kept.length === 1 && kept.board.draws.length === 0, `${p.id}: Keep files it and empties the draws`);
    let again = kept;
    for (const [c, k] of ok.history) again = move(p, again, {type: 'draw', id: c + k});
    assert.equal(move(p, again, {type: 'keep'}), null, `${p.id}: kept once`);
    if (no) {
      let d = fresh;
      for (const [c, k] of no.history) d = move(p, d, {type: 'draw', id: c + k});
      assert.equal(move(p, d, {type: 'keep'}), null, `${p.id}: one that doesn't count can't be kept`);
    }
    const early = move(p, kept, {type: 'claim'});
    assert.ok(early && early.board.missed && !isSolved(p, early.board), `${p.id}: an early That’s all says there is another`);
    assert.equal(move(p, early, {type: 'claim'}), null, `${p.id}: not twice in a row`);
    assert.ok(!undo(early).board.missed, `${p.id}: Undo takes it back`);
    assert.deepEqual(undo(kept).board, b.board, `${p.id}: Undo takes a Keep back`);
    const forged = [null, [], {...f, draws: ['R2']}, {...f, draws: Array(n + 1).fill('B1')}, {...f, kept: [want[0], want[0]]}, {...f, kept: 'x'}, {...f, claimed: 'yes'}, {...f, claimed: true}, {...f, kept: want, missed: true}, {...f, missed: true}, {...f, extra: 1}, {draws: [], kept: []}];
    if (no) forged.push({...f, kept: [q.mode === 'stories' ? word(no.history) : key(no.history)]});
    for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
    assert.ok(validBoard(p, {...f, kept: want, claimed: true}), `${p.id}: a real solve is a valid save`);
  }

  // Playground: runs of four draws under three rules; a finished run is filed
  // by its reds; rules and Clear empty the columns; it never counts as solved.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.deepEqual(a.board, {rule: 'copy', draws: [], runs: []});
  for (const id of ['R1', 'R2', 'R3', 'B1']) a = move(pg, a, {type: 'draw', id});
  assert.deepEqual(a.board.runs, [3], 'a run of four is filed by its reds');
  a = move(pg, a, {type: 'draw', id: 'B1'});
  assert.deepEqual(a.board.draws, ['B1'], 'the next draw starts a new run');
  assert.equal(move(pg, a, {type: 'draw', id: 'R3'}), null, 'only counters in the bag');
  a = move(pg, a, {type: 'finish'}, () => 0);
  assert.deepEqual(a.board.draws, ['B1', 'R1', 'R1', 'R1']); assert.deepEqual(a.board.runs, [3, 3]);
  a = move(pg, a, {type: 'random'}, () => 0.99);
  assert.deepEqual(a.board.draws, ['B1']);
  a = move(pg, a, {type: 'runs', n: 10}, () => 0.5);
  assert.equal(a.board.runs.length, 12, 'ten more runs; the run under way is set aside');
  assert.equal(a.board.draws.length, 4);
  for (const rule of ['return', 'other']) {
    const r = move(pg, a, {type: 'rule', rule});
    assert.deepEqual(r.board, {rule, draws: [], runs: []}, `${rule}: a new rule clears the columns`);
    const one = move(pg, r, {type: 'draw', id: 'R1'});
    assert.equal(move(pg, one, {type: 'draw', id: 'R2'}) !== null, false, `${rule}: no red copy`);
  }
  let many = a;
  while (many.board.runs.length < 100) many = move(pg, many, many.board.runs.length + 10 <= 100 ? {type: 'runs', n: 10} : {type: 'finish'});
  assert.equal(many.board.runs.length, 100);
  for (const bad of [{type: 'runs', n: 10}, {type: 'finish'}, {type: 'random'}]) assert.equal(move(pg, many, bad), null, `at most 100 runs: ${bad.type}`);
  assert.deepEqual(move(pg, many, {type: 'clear'}).board, {rule: 'copy', draws: [], runs: []});
  assert.equal(move(pg, freshAttempt(pg), {type: 'clear'}), null);
  for (const bad of [{type: 'rule', rule: 'copy'}, {type: 'rule', rule: 'swap'}, {type: 'runs', n: 5}, {type: 'keep'}, {type: 'claim'}]) assert.equal(move(pg, a, bad), null, `playground rejects ${JSON.stringify(bad)}`);
  for (const board of [{...a.board, rule: 'swap'}, {...a.board, runs: [5]}, {...a.board, runs: [1.5]}, {...a.board, runs: Array(101).fill(0)}, {...a.board, draws: ['R2']}, {...a.board, draws: ['R1', 'R1', 'R1', 'R1'], runs: [0]}, {...a.board, extra: 1}, {...many.board, draws: ['R1']}, {...many.board, draws: ['B1', 'B1', 'B1', 'B1'], runs: [...many.board.runs.slice(0, -1), 4]}]) assert.equal(validBoard(pg, board), false, `playground rejects ${JSON.stringify(board)}`);
  assert.ok(validBoard(pg, many.board) && validBoard(pg, {...many.board, draws: []}), 'full columns with a finished run or none');
  assert.ok(!isSolved(pg, a.board), 'the playground never counts as solved');
  return {copiesPuzzles: core.length, playground: 1, sources: pack.sources.length, answers, hintSteps, theorems: facts};
}
export default validateCopies;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateCopies(), null, 2));
