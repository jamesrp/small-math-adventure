// Checks the Fair bags pack (dist/families/bags/bags.json): content fields and
// sources; every puzzle's answer against a separate enumeration (a bag as an
// array of colours, pairs as index pairs, rules counted by brute force); the
// theorems the notes rely on (red-blue against blue-red is fair for every bag
// with both colours, drawn with or without putting back, and for two bags
// exactly when they have the same share of red; without putting back red-red
// and blue-blue come r(r − 1) and b(b − 1) ways; a fair rule with no skips
// exists only for equal colours; a fair rule beats von Neumann's only when
// the colours are equal, and then skips nothing, or one is twice the other,
// and then skips only the smaller colour's square; the busiest bag for that
// rule splits the colours evenly); hint chains to a solve from the start and
// from every rule or bag a child can reach; illegal moves; forged saves; and
// the playground.
// Run: node scripts/validate-bags.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// A separate enumeration. A bag is an array of 'R' and 'B'; a pair is two
// places in it; a colour pair is counted by place, never by name.
const KINDS = ['RR', 'RB', 'BR', 'BB'];
function counts(first, second = first, distinct = false) {
  const out = {RR: 0, RB: 0, BR: 0, BB: 0};
  [...first].forEach((x, i) => [...second].forEach((y, j) => { if (!(distinct && i === j)) out[x + y]++; }));
  return out;
}
const LETTERS = ['S', 'C', 'X'];
const allRules = () => LETTERS.flatMap(a => LETTERS.flatMap(b => LETTERS.flatMap(c => LETTERS.map(d => a + b + c + d))));
function score(c, rule) {
  const t = {S: 0, C: 0, X: 0};
  KINDS.forEach((k, i) => { t[rule[i]] += c[k]; });
  return t;
}
const fair = t => t.S === t.C && t.S > 0;
const fairRules = c => allRules().filter(r => fair(score(c, r)));
const fewest = c => Math.min(...fairRules(c).map(r => score(c, r).X));
const bag = (r, b) => 'R'.repeat(r) + 'B'.repeat(b);
const sorted = list => [...list].sort();

function theorems() {
  const facts = {beatsVonNeumann: []};
  for (let r = 1; r <= 8; r++) for (let b = 1; b <= 8; b++) {
    for (const distinct of [false, true]) {
      const c = counts(bag(r, b), bag(r, b), distinct);
      if (c.RB) assert.ok(fair(score(c, 'XSCX')), `${r}R ${b}B${distinct ? ' kept out' : ''}: red-blue against blue-red is fair`);
    }
    assert.deepEqual(counts(bag(r, b), bag(r, b), true), {RR: r * (r - 1), RB: r * b, BR: b * r, BB: b * (b - 1)}, `${r}R ${b}B kept out: r(r − 1), rb, br, b(b − 1)`);
    const c = counts(bag(r, b));
    assert.deepEqual(c, {RR: r * r, RB: r * b, BR: b * r, BB: b * b}, `${r}R ${b}B: r², rb, br, b²`);
    assert.equal(fairRules(c).some(rule => score(c, rule).X === 0), r === b, `${r}R ${b}B: no skips only when equal`);
    const best = fewest(c), vn = r * r + b * b;
    assert.ok(best <= vn);
    if (best < vn) facts.beatsVonNeumann.push(`${r}R${b}B`);
    assert.equal(best < vn, r === b || r === 2 * b || b === 2 * r, `${r}R ${b}B: beats von Neumann only when equal or twice`);
    if (r === 2 * b) assert.equal(best, b * b, `${r}R ${b}B: skip only blue-blue`);
    if (b === 2 * r) assert.equal(best, r * r, `${r}R ${b}B: skip only red-red`);
    if (r === b) assert.equal(best, 0);
  }
  // The busiest bag for red-blue against blue-red: shapes come 2rb ways, most
  // when the colours split evenly.
  for (let n = 2; n <= 8; n++) {
    const shapes = Array.from({length: n + 1}, (_, r) => { const t = score(counts(bag(r, n - r)), 'XSCX'); return t.S + t.C; });
    const most = Math.max(...shapes);
    assert.deepEqual(shapes.map((s, r) => s === most ? r : -1).filter(r => r >= 0), n % 2 ? [(n - 1) / 2, (n + 1) / 2] : [n / 2], `${n}: busiest at an even split`);
    // Order inside the bag never matters: every arrangement of r red gives the same.
    for (let m = 0; m < 2 ** n; m++) {
      const colours = [...Array(n)].map((_, i) => m >> i & 1 ? 'B' : 'R').join(''), r = [...colours].filter(x => x === 'R').length;
      const t = score(counts(colours), 'XSCX');
      assert.equal(t.S + t.C, shapes[r]);
    }
  }
  // Two different bags can break the tie: red-blue against blue-red is fair
  // exactly when the bags have the same share of red (r₁b₂ = b₁r₂) and both
  // mixed pairs can happen.
  for (let r1 = 0; r1 <= 4; r1++) for (let b1 = 0; b1 <= 4; b1++) for (let r2 = 0; r2 <= 4; r2++) for (let b2 = 0; b2 <= 4; b2++) {
    if (!(r1 + b1) || !(r2 + b2)) continue;
    const c = counts(bag(r1, b1), bag(r2, b2));
    assert.deepEqual([c.RB, c.BR], [r1 * b2, b1 * r2]);
    const same = r1 * (r2 + b2) === r2 * (r1 + b1);
    assert.equal(fair(score(c, 'XSCX')), same && r1 * b2 > 0, `${r1}R ${b1}B then ${r2}R ${b2}B`);
  }
  const two = counts('RRRB', 'RBBB');
  assert.deepEqual(two, {RR: 3, RB: 9, BR: 1, BB: 3});
  assert.ok(!fair(score(two, 'XSCX')), 'two bags: red-blue against blue-red is not fair');
  return facts;
}

// The answers each puzzle asks for, by the enumeration.
function answer(q) {
  if (q.mode === 'pairs') return [...q.first].length ** 2;
  if (q.mode === 'busiest') return Math.max(...Array.from({length: q.size + 1}, (_, r) => { const t = score(counts(bag(r, q.size - r)), q.rule); return t.S + t.C; }));
  const c = counts(q.first, q.second || q.first, Boolean(q.distinct)), rules = fairRules(c);
  if (q.goal === 'fair') return rules;
  const skips = q.goal === 'noskip' ? 0 : fewest(c);
  return rules.filter(r => score(c, r).X === skips);
}
// Follow hints from a board to a solve; every hint is a legal move.
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const hint = nextHint(p, a);
    assert.equal(hint.type, 'move', `${label}: ${hint.text}`);
    const next = move(p, a, hint.action);
    assert.ok(next && next !== a, `${label}: hint ${JSON.stringify(hint.action)} is legal`);
    a = next;
  }
  assert.ok(isSolved(p, a.board), `${label}: hints reach a solve`);
  return [a, steps];
}
// Set a rule row by row, as a child would.
const setRule = (p, a, rule) => [...rule].reduce((x, shape, i) => x.board.rule[i] === shape ? x : move(p, x, {type: 'set', cls: KINDS[i], shape}), a);
const expected = {
  'bags-01': 9, 'bags-02': ['CCSS', 'CSCS', 'CSSC', 'SCCS', 'SCSC', 'SSCC'], 'bags-03': ['XCSX', 'XSCX'], 'bags-04': 8,
  'bags-05': ['CSSC', 'CSSS', 'CSSX', 'SCCC', 'SCCS', 'SCCX'], 'bags-06': ['CSSX', 'SCCX'], 'bags-07': ['CXXS', 'SXXC'], 'bags-08': ['CSSX', 'SCCX']
};

export async function validateBags() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const pack = await read('../dist/families/bags/bags.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  const family = pack.families[0];
  assert.equal(family.id, 'bags'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = pack.puzzles.filter(p => p.band === 'all'), playgrounds = pack.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, pack.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'bags'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
    assert.ok(p.id === 'bags-playground' || p.id === `bags-${String(p.number).padStart(2, '0')}`, `${p.id}: id`);
    for (const key of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id} ${key}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id} parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
  }
  const facts = theorems();

  let hintSteps = 0;
  const answers = {};
  for (const p of core) {
    const q = p.parameters, want = answer(q);
    assert.deepEqual(Array.isArray(want) ? sorted(want) : want, expected[p.id], `${p.id}: the notes' answer`);
    answers[p.id] = Array.isArray(want) ? want.length : want;

    // Hints alone reach a solve, and every hint is a legal move.
    const start = freshAttempt(p);
    assert.ok(validBoard(p, start.board) && !isSolved(p, start.board), `${p.id}: valid unsolved start`);
    if (q.mode === 'rule') assert.equal(start.board.rule, q.start || 'XXXX', `${p.id}: starts from its rule`);
    const [a, steps] = hintsSolve(p, start, p.id);
    hintSteps += steps;
    // And from every unsolved rule, or every bag, before and after a refused Done.
    if (q.mode === 'rule') for (const rule of allRules()) {
      const at = {...start, board: {...start.board, rule}};
      if (isSolved(p, at.board)) continue;
      hintsSolve(p, at, `${p.id} from ${rule}`);
      const missed = q.goal === 'fewest' && move(p, at, {type: 'claim'});
      if (missed) hintsSolve(p, missed, `${p.id} from ${rule}, after Done`);
    }
    if (q.mode === 'pairs') {
      // Any pair kept, then any draw of none, one or two counters, a repeat included.
      const ids = [...q.first].map((c, i) => `${c}${[...q.first].slice(0, i + 1).filter(x => x === c).length}`);
      for (const x of ids) for (const y of ids) {
        const kept = move(p, move(p, move(p, start, {type: 'draw', id: x}), {type: 'draw', id: y}), {type: 'keep'});
        hintsSolve(p, kept, `${p.id} after keeping ${x}${y}`);
        for (const u of ids) {
          const one = move(p, kept, {type: 'draw', id: u});
          hintsSolve(p, one, `${p.id} after ${x}${y}, drawing ${u}`);
          for (const v of ids) hintsSolve(p, move(p, one, {type: 'draw', id: v}), `${p.id} after ${x}${y}, drawing ${u}${v}`);
        }
      }
    }
    if (q.mode === 'busiest') for (let m = 0; m < 2 ** q.size; m++) {
      const colours = [...Array(q.size)].map((_, i) => m >> i & 1 ? 'B' : 'R').join('');
      const at = [...colours].reduce((x, c, i) => x.board.colours[i] === c ? x : move(p, x, {type: 'flip', at: i}), start);
      assert.equal(at.board.colours, colours);
      hintsSolve(p, at, `${p.id} from ${colours}`);
      const missed = move(p, at, {type: 'claim'});
      if (!isSolved(p, missed.board)) hintsSolve(p, missed, `${p.id} from ${colours}, after Done`);
    }
    for (const bad of [{type: 'draw', id: 'R1'}, {type: 'again'}, {type: 'keep'}, {type: 'claim'}, {type: 'flip', at: 0}, {type: 'set', cls: 'RR', shape: 'X'}, {type: 'set', cls: 'RR', shape: 'S'}]) assert.equal(move(p, a, bad), null, `${p.id}: no ${bad.type} after a solve`);
    const fresh = freshAttempt(p), f = fresh.board;

    if (q.mode === 'pairs') {
      assert.equal(a.board.kept.length, want, `${p.id}: solved with every pair, each once`);
      assert.equal(new Set(a.board.kept).size, want);
      for (const bad of [null, 'draw', {type: 'draw', id: 'R9'}, {type: 'draw', id: 'G1'}, {type: 'draw'}, {type: 'again'}, {type: 'keep'}, {type: 'claim'}, {type: 'load', key: 'R1R1'}, {type: 'flip', at: 0}, {type: 'set', cls: 'RR', shape: 'S'}, {type: 'random'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      let b = move(p, move(p, fresh, {type: 'draw', id: 'R1'}), {type: 'draw', id: 'R1'});
      assert.deepEqual(b.board.draw, ['R1', 'R1'], `${p.id}: the same counter twice`);
      assert.equal(move(p, b, {type: 'draw', id: 'B1'}), null, `${p.id}: two draws only`);
      assert.deepEqual(move(p, b, {type: 'again'}).board.draw, [], `${p.id}: Again`);
      const kept = move(p, b, {type: 'keep'});
      assert.deepEqual(kept.board.kept, ['R1R1']);
      assert.deepEqual(kept.board.draw, [], `${p.id}: Keep empties the draw`);
      for (const bad of [{type: 'keep'}, {type: 'again'}, {type: 'load', key: 'R1R1'}]) assert.equal(move(p, kept, bad), null, `${p.id}: no ${bad.type} with nothing drawn`);
      const twice = move(p, move(p, kept, {type: 'draw', id: 'R1'}), {type: 'draw', id: 'R1'});
      assert.equal(move(p, twice, {type: 'keep'}), null, `${p.id}: kept once`);
      const early = move(p, kept, {type: 'claim'});
      assert.ok(early && early.board.missed && !isSolved(p, early.board), `${p.id}: an early That’s all says there is another`);
      assert.equal(move(p, early, {type: 'claim'}), null, `${p.id}: not twice in a row`);
      assert.ok(!undo(early).board.missed, `${p.id}: Undo takes it back`);
      assert.deepEqual(undo(kept).board, b.board, `${p.id}: Undo takes a Keep back`);
      const forged = [null, [], {...f, draw: ['R9']}, {...f, draw: ['R1', 'R1', 'R1']}, {...f, kept: ['R1R1', 'R1R1']}, {...f, kept: ['R1R9']}, {...f, kept: 'x'}, {...f, claimed: 'yes'}, {...f, claimed: true}, {...f, missed: true}, {...f, extra: 1}, {draw: [], kept: []}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {...f, kept: a.board.kept, claimed: true}), `${p.id}: a real solve is a valid save`);
      continue;
    }

    if (q.mode === 'busiest') {
      const r = [...a.board.colours].filter(x => x === 'R').length;
      assert.equal(r, q.size / 2, `${p.id}: solved with an even split`);
      for (const bad of [null, {type: 'flip', at: q.size}, {type: 'flip', at: -1}, {type: 'flip', at: '0'}, {type: 'flip'}, {type: 'set', cls: 'RB', shape: 'C'}, {type: 'draw', id: 'R1'}, {type: 'keep'}, {type: 'random'}, {type: 'add'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      const early = move(p, fresh, {type: 'claim'});
      assert.ok(early.board.missed && !isSolved(p, early.board), `${p.id}: Done on a quieter bag says shapes can come more often`);
      assert.equal(move(p, early, {type: 'claim'}), null, `${p.id}: not twice in a row`);
      const flipped = move(p, early, {type: 'flip', at: 3});
      assert.ok(!flipped.board.missed && flipped.board.colours === 'RRRR', `${p.id}: a flip clears the note`);
      const forged = [null, {...f, colours: 'RRR'}, {...f, colours: 'RRGB'}, {...f, colours: 'RRRB', claimed: true}, {...f, colours: 'RRBB', missed: true}, {...f, claimed: true, missed: true}, {...f, extra: 1}, {colours: 'RRBB'}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {colours: 'BRBR', claimed: true, missed: false}), `${p.id}: any even split is a valid solve`);
      continue;
    }

    // A rule puzzle.
    assert.ok(want.includes(a.board.rule), `${p.id}: solved with a rule that works`);
    for (const bad of [null, {type: 'set', cls: 'GG', shape: 'S'}, {type: 'set', cls: 'RR', shape: 'T'}, {type: 'set', cls: 'RR', shape: f.rule[0]}, {type: 'set'}, {type: 'flip', at: 0}, {type: 'draw', id: 'R1'}, {type: 'keep'}, {type: 'random'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    const c = counts(q.first, q.second || q.first, Boolean(q.distinct));
    if (q.goal === 'fewest') {
      // Von Neumann's rule is fair but not the fewest here: Done says so once.
      assert.equal(move(p, fresh, {type: 'claim'}), null, `${p.id}: no Done on an unfair rule`);
      const vn = setRule(p, fresh, 'XSCX');
      assert.ok(fair(score(c, vn.board.rule)) && !want.includes(vn.board.rule));
      const early = move(p, vn, {type: 'claim'});
      assert.ok(early.board.missed && !isSolved(p, early.board), `${p.id}: von Neumann's rule can skip fewer`);
      assert.equal(move(p, early, {type: 'claim'}), null);
      assert.ok(!move(p, early, {type: 'set', cls: 'RR', shape: 'S'}).board.missed, `${p.id}: a change clears the note`);
      const forged = [null, {rule: 'XXXX'}, {...f, rule: 'XSCX', claimed: true}, {...f, rule: want[0], missed: true}, {...f, rule: 'SSSS', missed: true}, {...f, rule: 'XXXY'}, {...f, extra: 1}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {rule: want[0], claimed: true, missed: false}), `${p.id}: a real solve is a valid save`);
    } else {
      assert.equal(move(p, fresh, {type: 'claim'}), null, `${p.id}: no Done; a working rule solves itself`);
      for (const board of [null, {}, {rule: 'XXX'}, {rule: 'xxxx'}, {rule: 'XXXX', claimed: false}, {rule: 4}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      for (const rule of allRules()) assert.equal(isSolved(p, {rule}), want.includes(rule), `${p.id}: ${rule}`);
    }
  }

  // Playground: two to six counters, any rule, random pairs with the first put
  // back; changing the bag clears the piles; it never counts as solved.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.ok(validBoard(pg, a.board) && !isSolved(pg, a.board));
  assert.equal(a.board.colours, 'RRRB');
  a = move(pg, a, {type: 'random'}, () => 0.99);
  assert.deepEqual(a.board.draws, ['B1B1']);
  a = move(pg, a, {type: 'random', n: 10}, () => 0);
  assert.equal(a.board.draws.length, 11);
  assert.ok(a.board.draws.slice(1).every(k => k === 'R1R1'));
  const ruled = move(pg, a, {type: 'set', cls: 'RR', shape: 'S'});
  assert.equal(ruled.board.rule, 'SSCX'); assert.equal(ruled.board.draws.length, 11, 'a new rule keeps the pairs');
  for (const action of [{type: 'flip', at: 0}, {type: 'add'}, {type: 'remove'}]) assert.deepEqual(move(pg, a, action).board.draws, [], `${action.type} clears the piles`);
  let full = a;
  while (full.board.draws.length + 10 <= 60) full = move(pg, full, {type: 'random', n: 10});
  assert.equal(move(pg, full, {type: 'random', n: 10}), null, 'at most 60 draws');
  let small = a;
  while (small.board.colours.length > 2) small = move(pg, small, {type: 'remove'});
  assert.equal(move(pg, small, {type: 'remove'}), null, 'two counters at least');
  let big = a;
  while (big.board.colours.length < 6) big = move(pg, big, {type: 'add'});
  assert.equal(move(pg, big, {type: 'add'}), null, 'six counters at most');
  assert.equal(move(pg, move(pg, a, {type: 'clear'}), {type: 'clear'}), null);
  for (const bad of [{type: 'flip', at: 4}, {type: 'set', cls: 'RB', shape: 'S'}, {type: 'set', cls: 'XX', shape: 'S'}, {type: 'claim'}, {type: 'draw', id: 'R1'}, {type: 'keep'}]) assert.equal(move(pg, a, bad), null, `playground rejects ${JSON.stringify(bad)}`);
  for (const board of [{...a.board, colours: 'R'}, {...a.board, colours: 'RRRRRRR'}, {...a.board, colours: 'RRGB'}, {...a.board, rule: 'SSS'}, {...a.board, draws: ['R9R1']}, {...a.board, draws: Array(61).fill('R1R1')}, {...a.board, extra: 1}]) assert.equal(validBoard(pg, board), false, `playground rejects ${JSON.stringify(board)}`);
  assert.ok(!isSolved(pg, a.board), 'the playground never counts as solved');
  return {bagsPuzzles: core.length, playground: 1, sources: pack.sources.length, answers, hintSteps, theorems: facts};
}
export default validateBags;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateBags(), null, 2));
