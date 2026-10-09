// Checks the Shuffle machines pack (dist/families/machines/machines.json):
// content fields and sources; every puzzle's answer against a separate
// simulation (a machine as the list of homes each cup goes to, the worksheet's
// "slot i → slot p(i)", run turn by turn until every cup is home, every
// machine tried); the theorems the notes rely on (turn counts are the least
// common multiples of the splits; the possible turn counts and the most, for 1
// to 10 cups, against OEIS A009490 and A000793; 20 of 120 five-cup machines
// take 6 turns and 420 of 5,040 seven-cup ones take 12; no machine moves
// exactly one cup; the machines home in 2 turns, and those moving every cup;
// one machine undoes any machine, and undoing A then B is undoing B then A);
// that Can't is right exactly when no machine works, Keep needs a finished run
// where a run is the test, and That's all / That's the most only when nothing
// is missing; hint chains to a solve from the start, from every machine on
// four cups, from shelves, and from random walks with Undo; that the board's
// lower row is always one turn of its machine on from the cups on top, so a
// turn brings it up, and in an undo puzzle is all home exactly for the
// answer; illegal moves; forged saves; and the playground.
// Run: node scripts/validate-machines.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';
import {machineMechanics} from '../dist/families/machines/machines.js';

// A separate simulation. A machine is go[i], the home the cup on home i goes
// to. The pack writes a machine as a row of letters: the home whose cup one
// turn brings to each home.
const ABC = 'ABCDEFGHIJ';
const fromPack = m => { const go = Array(m.length); [...m].forEach((src, h) => { go[ABC.indexOf(src)] = h; }); return go; };
const toPack = go => { const m = Array(go.length); go.forEach((h, i) => { m[h] = ABC[i]; }); return m.join(''); };
const step = (cups, go) => { const next = Array(cups.length); cups.forEach((c, i) => { next[go[i]] = c; }); return next; };
const home = cups => cups.every((c, i) => c === i);
// Turns until every cup is home, by running the machine.
function runTurns(go) {
  let cups = go.map((_, i) => i), t = 0;
  do { cups = step(cups, go); t++; } while (!home(cups) && t < 1000);
  return t;
}
// Every machine on n cups, by inserting cup n − 1's destination into every place.
function allMachines(n) {
  if (n === 0) return [[]];
  return allMachines(n - 1).flatMap(go => Array.from({length: n}, (_, k) => { const g = go.map(h => h >= k ? h + 1 : h); return [...g, k]; }));
}
const fixedCount = go => go.filter((h, i) => h === i).length;
const compose = (a, b) => a.map(h => b[h]);            // a, then b
const inverse = go => { const r = Array(go.length); go.forEach((h, i) => { r[h] = i; }); return r; };
// Splits of n into loop lengths, by a different recursion: the number of
// ways to write n as a sum with parts at most k.
function partitions(n, k = n) {
  if (n === 0) return [[]];
  const out = [];
  for (let first = Math.min(n, k); first >= 1; first--) for (const rest of partitions(n - first, first)) out.push([first, ...rest]);
  return out;
}
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcmAll = parts => parts.reduce((t, x) => t / gcd(t, x) * x, 1);
const sorted = list => [...list].sort();
const machineCache = new Map();
const machines = n => { if (!machineCache.has(n)) machineCache.set(n, allMachines(n)); return machineCache.get(n); };
const turnCache = new Map();
const turnsOf = go => { const k = go.join(','); if (!turnCache.has(k)) turnCache.set(k, runTurns(go)); return turnCache.get(k); };

function theorems() {
  for (let n = 1; n <= 7; n++) {
    const all = machines(n);
    assert.equal(all.length, [1, 2, 6, 24, 120, 720, 5040][n - 1], `${n}! machines`);
    assert.equal(new Set(all.map(go => go.join())).size, all.length, `${n}: no machine twice`);
    // Running agrees with the least common multiple of the splits.
    const byRun = sorted([...new Set(all.map(turnsOf))].map(String)), bySplit = sorted([...new Set(partitions(n).map(lcmAll))].map(String));
    assert.deepEqual(byRun, bySplit, `${n}: the turn counts are the splits' least common multiples`);
    assert.ok(!all.some(go => go.length - fixedCount(go) === 1), `${n}: no machine moves exactly one cup`);
  }
  assert.deepEqual(Array.from({length: 10}, (_, i) => new Set(partitions(i + 1).map(lcmAll)).size), [1, 2, 3, 4, 6, 6, 9, 11, 14, 16], 'OEIS A009490');
  assert.deepEqual(Array.from({length: 10}, (_, i) => Math.max(...partitions(i + 1).map(lcmAll))), [1, 2, 3, 4, 6, 6, 12, 15, 20, 30], 'OEIS A000793');
  assert.deepEqual([...new Set(machines(5).map(turnsOf))].sort((x, y) => x - y), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...new Set(machines(6).map(turnsOf))].sort((x, y) => x - y), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...new Set(machines(7).map(turnsOf))].sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 10, 12]);
  assert.equal(machines(5).filter(go => turnsOf(go) === 6).length, 20, '20 of 120 take 6 turns');
  assert.equal(machines(7).filter(go => turnsOf(go) === 12).length, 420, '420 of 5,040 take 12 turns');
  assert.deepEqual([3, 4].map(k => machines(4).filter(go => turnsOf(go) === k).length), [8, 6], 'four cups: 8 take 3 turns, 6 take 4');
  assert.deepEqual([4, 5, 6].map(n => machines(n).filter(go => turnsOf(go) <= 2).length), [10, 26, 76], 'home in 2 turns or fewer');
  assert.deepEqual([4, 5, 6].map(n => machines(n).filter(go => turnsOf(go) === 2 && !fixedCount(go)).length), [3, 0, 15], 'moving every cup, home in 2');
  assert.deepEqual(machines(3).map(turnsOf).sort(), [1, 2, 2, 2, 3, 3], 'three cups: 1, three 2s, two 3s');
  // One machine undoes each machine, reversing its arrows; undoing A then B is undoing B, then A.
  for (const a of machines(4)) {
    const undoers = machines(4).filter(u => home(step(step([0, 1, 2, 3], a), u)));
    assert.deepEqual(undoers, [inverse(a)]);
    for (const b of machines(4)) assert.deepEqual(inverse(compose(a, b)), compose(inverse(b), inverse(a)));
  }
}

// What each puzzle asks for, by the simulation, in the pack's letters.
function answer(q) {
  const all = machines(q.cups);
  if (q.mode === 'run') return [q.machine];
  if (q.mode === 'make') return all.filter(go => q.goal.turns ? turnsOf(go) === q.goal.turns : q.goal.moved ? go.length - fixedCount(go) === q.goal.moved : turnsOf(go) === 2 && !fixedCount(go)).map(toPack);
  if (q.mode === 'undo') {
    const after = q.chain.map(fromPack).reduce(step, all[0].map((_, i) => i));
    return all.filter(u => home(step(after, u))).map(toPack);
  }
  if (q.mode === 'every') return all.filter(go => q.rule === 'any' || (turnsOf(go) === 2 && !fixedCount(go))).map(toPack);
  const counts = [...new Set(all.map(turnsOf))];
  return (q.rule === 'most' ? [Math.max(...counts)] : counts).map(String);
}
const expected = {
  'machines-01': ['CEABD'], 'machines-02': 8, 'machines-03': 6, 'machines-04': [], 'machines-05': 20, 'machines-06': ['DCAB'],
  'machines-07': ['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'], 'machines-08': ['BADC', 'CDAB', 'DCBA'], 'machines-09': [],
  'machines-10': ['1', '2', '3', '4', '5', '6'], 'machines-11': ['12'], 'machines-12': ['DBAC']
};

// What the board draws: the cups on top, and the lower row.
function drawn(p, a) {
  const [top, lower] = machineMechanics.machine.render(p, a).split('class="mach-lower"');
  const cups = html => [...html.matchAll(/aria-label="Home [A-G]: cup ([A-G])/g)].map(x => x[1]).join('');
  return [cups(top), cups(lower)];
}
// The lower row is where one turn of the board's machine sends the cups on
// top, so when that machine turns next the top row becomes the lower row.
function lowerRow(p, a, label) {
  const [top, lower] = drawn(p, a), q = p.parameters;
  assert.equal(lower, step([...top], fromPack(a.board.machine)).join(''), `${label}: the lower row is one turn on`);
  const next = move(p, a, {type: 'turn'});
  if (next && (q.mode !== 'undo' || a.board.stage === q.chain.length)) assert.equal(drawn(p, next)[0], lower, `${label}: a turn brings the lower row up`);
}
// Follow hints from a board to a solve; every hint is a legal move.
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 60; steps++) {
    lowerRow(p, a, label);
    const hint = nextHint(p, a);
    assert.equal(hint.type, 'move', `${label}: ${hint.text}`);
    const next = move(p, a, hint.action);
    assert.ok(next && next !== a, `${label}: hint ${JSON.stringify(hint.action)} is legal`);
    a = next;
  }
  assert.ok(isSolved(p, a.board), `${label}: hints reach a solve`);
  return [a, steps];
}
const at = (start, board) => ({...start, board: {...start.board, ...board}});
function walk(p, start, actions, label, steps = 60) {
  let a = start, seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < steps && !isSolved(p, a.board); i++) {
    if (a.moves && random() < 0.15) a = undo(a);
    else { const next = move(p, a, actions[Math.floor(random() * actions.length)]); if (next) a = next; }
    assert.ok(validBoard(p, a.board), `${label}: a walk stays valid`);
    lowerRow(p, a, `${label} walk ${i}`);
    if (!isSolved(p, a.board) && i % 3 === 0) hintsSolve(p, a, `${label} walk ${i}`);
  }
}
const swaps = n => Array.from({length: n}, (_, a) => Array.from({length: n}, (_, b) => ({type: 'swap', a, b}))).flat().filter(x => x.a < x.b);
const subsets = list => Array.from({length: 2 ** list.length}, (_, m) => list.filter((_, i) => m >> i & 1));
const OTHER = [{type: 'swap', a: 0, b: 1}, {type: 'turn'}, {type: 'home'}, {type: 'cant'}, {type: 'keep'}, {type: 'claim'}, {type: 'mix'}, {type: 'cups', cups: 4}];

export async function validateMachines() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const pack = await read('../dist/families/machines/machines.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  const family = pack.families[0];
  assert.equal(family.id, 'machines'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = pack.puzzles.filter(p => p.band === 'all'), playgrounds = pack.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, pack.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  // The Cup swaps family has no other playground, so this one is its Playground button.
  assert.ok(!all.some(p => p.band === 'playground' && (p.libraryFamily || p.mechanic) === 'swap' && p.id !== 'machines-playground'), 'one Cup swaps playground');
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'machine'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
    assert.equal(p.libraryFamily, 'swap'); assert.equal(p.familyTitle, 'Cup swaps');
    assert.equal(p.group, p.band === 'all' ? 'Shuffle machines' : undefined, `${p.id}: the group`);
    assert.ok(p.id === 'machines-playground' || p.id === `machines-${String(p.number).padStart(2, '0')}`, `${p.id}: id`);
    for (const k of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id} ${k}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const k of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[k]?.trim(), `${p.id} parent.${k}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
    assert.doesNotMatch(`${p.objective} ${p.controls}`, /\b\d+ of \d+\b/, `${p.id}: no counters`);
    // The card: never ask how many turns before a run, and no swap counts.
    assert.doesNotMatch(`${p.objective} ${p.controls}`, /how many turns|fewest swaps|swaps? left/i, `${p.id}: no prediction or swap scoring`);
  }
  theorems();

  let hintSteps = 0;
  const answers = {};
  for (const p of core) {
    const q = p.parameters, want = sorted(answer(q)), mech = machineMechanics.machine;
    const e = expected[p.id];
    if (Array.isArray(e)) assert.deepEqual(want, sorted(e), `${p.id}: the notes' answer`); else assert.equal(want.length, e, `${p.id}: the notes' count`);
    answers[p.id] = want.length;
    const start = freshAttempt(p), f = start.board;
    assert.ok(validBoard(p, f) && !isSolved(p, f), `${p.id}: valid unsolved start`);
    const [a, steps] = hintsSolve(p, start, p.id);
    hintSteps += steps;
    for (const bad of OTHER) assert.equal(move(p, a, bad), null, `${p.id}: no ${bad.type} after a solve`);
    for (const bad of [null, 'turn', {type: 'toss'}, {type: 'mix'}, {type: 'straight'}, {type: 'cups', cups: 4}, {type: 'swap', a: 0, b: 0}, {type: 'swap', a: 0, b: q.cups}, {type: 'swap', a: '0', b: 1}, {type: 'swap', a: -1, b: 1}]) assert.equal(move(p, start, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    assert.ok(mech.render(p, {...start, hintLevel: 2}).includes('hinted'), `${p.id}: a hint shows on the board`);
    assert.ok(mech.render(p, a).length > 0);
    const forged = [null, [], {...f, machine: f.machine.slice(1)}, {...f, machine: f.machine.replace(f.machine[0], f.machine[1])}, {...f, machine: 'ABCDEFGH'.slice(0, q.cups + 1)}, {...f, extra: 1}];

    if (q.mode === 'run') {
      // Turn by turn: the cups match the simulation and stop when all are home.
      let b = start, cups = Array.from({length: q.cups}, (_, i) => i);
      for (let t = 1; t <= 6; t++) { b = move(p, b, {type: 'turn'}); cups = step(cups, fromPack(q.machine)); assert.equal(isSolved(p, b.board), home(cups), `${p.id} turn ${t}`); }
      assert.equal(move(p, b, {type: 'turn'}), null, 'the run stops when every cup is home');
      assert.equal(move(p, start, {type: 'swap', a: 0, b: 1}), null, `${p.id}: the machine is fixed`);
      const two = move(p, move(p, start, {type: 'turn'}), {type: 'turn'});
      assert.deepEqual(move(p, two, {type: 'home'}).board, f, 'Cups home');
      for (const board of [...forged, {...f, turns: 7}, {...f, turns: -1}, {...f, turns: 1.5}, {...f, machine: 'ABCDE'}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      continue;
    }

    if (q.mode === 'make') {
      const can = want.length > 0, cant = move(p, start, {type: 'cant'});
      assert.equal(cant.board.cant, !can, `${p.id}: Can't is right exactly when no machine works`);
      assert.equal(cant.board.wrong, can, `${p.id}: otherwise it is refused`);
      assert.equal(isSolved(p, cant.board), !can);
      if (can) {
        assert.equal(move(p, cant, {type: 'cant'}), null, `${p.id}: refused until the machine changes`);
        assert.equal(move(p, cant, {type: 'swap', a: 0, b: 1}).board.wrong, false, `${p.id}: a swap clears the refusal`);
        hintsSolve(p, cant, `${p.id} after Can't`);
      }
      // From every machine on four cups (every tenth on five), before and during a run: hints reach a solve.
      for (const [i, go] of machines(q.cups).entries()) {
        if (q.cups > 4 && i % 10) continue;
        const m = toPack(go), runs = turnsOf(go);
        for (const turns of [0, runs - 1, runs]) {
          if (turns < 0) continue;
          const there = at(start, {machine: m, turns});
          assert.ok(validBoard(p, there.board), `${p.id}: ${m} after ${turns}`);
          // A machine is a solve exactly when its finished run is one the puzzle asks for.
          assert.equal(isSolved(p, there.board), turns === runs && want.includes(m), `${p.id}: ${m} after ${turns} solves exactly when it should`);
          if (!isSolved(p, there.board)) hintsSolve(p, there, `${p.id} from ${m} after ${turns}`);
        }
      }
      walk(p, start, [...swaps(q.cups), {type: 'turn'}, {type: 'turn'}, {type: 'turn'}, {type: 'home'}, {type: 'cant'}], p.id, 80);
      for (const board of [...forged, {...f, turns: 2}, {...f, cant: true, wrong: true}, can ? {...f, cant: true} : {...f, wrong: true}, {...f, cant: 1}, {...f, wrong: null}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      continue;
    }

    if (q.mode === 'undo') {
      const n = q.chain.length, answerM = want[0];
      // Every machine of yours: solved exactly by the answer, after the chain and one turn of yours.
      for (const go of machines(q.cups)) {
        const m = toPack(go);
        let b = at(start, {machine: m});
        for (let s = 0; s <= n; s++) {
          assert.ok(!isSolved(p, b.board));
          // After the chain, the lower row is all home exactly when your machine is the answer.
          if (s === n) assert.equal(drawn(p, b)[1] === toPack(go.map((_, i) => i)), m === answerM, `${p.id}: ${m}'s lower row after the chain`);
          b = move(p, b, {type: 'turn'});
        }
        assert.equal(isSolved(p, b.board), m === answerM, `${p.id}: ${m}`);
        if (m !== answerM) {
          assert.equal(move(p, b, {type: 'turn'}), null, `${p.id}: no more turns`);
          const edited = move(p, b, {type: 'swap', a: 0, b: 1});
          assert.equal(edited.board.stage, n, `${p.id}: an edit takes back your machine's turn and keeps the chain's`);
          hintsSolve(p, b, `${p.id} from ${m} after the chain`);
          hintsSolve(p, at(start, {machine: m, stage: 1}), `${p.id} from ${m} at stage 1`);
        }
      }
      assert.equal(move(p, start, {type: 'home'}), null, 'nothing to send home');
      assert.deepEqual(move(p, move(p, start, {type: 'turn'}), {type: 'home'}).board, f, 'Cups home');
      walk(p, start, [...swaps(q.cups), {type: 'turn'}, {type: 'turn'}, {type: 'home'}], p.id, 80);
      for (const board of [...forged, {...f, stage: n + 2}, {...f, stage: -1}, {...f, turns: 0}, {machine: f.machine}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      continue;
    }

    if (q.mode === 'every') {
      assert.deepEqual(sorted(a.board.kept), want, `${p.id}: every machine kept once`);
      const self = q.rule === 'self';
      // Keep: a machine that must pass a test only after a run has shown it.
      const target = want[0], there = at(start, {machine: target});
      if (self) {
        assert.equal(move(p, there, {type: 'keep'}), null, `${p.id}: Keep waits for the run`);
        const ran = move(p, move(p, there, {type: 'turn'}), {type: 'turn'});
        assert.deepEqual(move(p, ran, {type: 'keep'}).board.kept, [target]);
        const other = at(start, {machine: 'BACD', turns: 2});
        assert.equal(move(p, other, {type: 'keep'}), null, `${p.id}: a machine that leaves cups is not kept`);
      } else assert.deepEqual(move(p, there, {type: 'keep'}).board.kept, [target]);
      const one = move(p, at(start, {machine: target, turns: self ? 2 : 0}), {type: 'keep'});
      assert.equal(move(p, one, {type: 'keep'}), null, `${p.id}: kept once`);
      const early = move(p, one, {type: 'claim'});
      assert.ok(early.board.missed && !isSolved(p, early.board)); assert.equal(move(p, early, {type: 'claim'}), null);
      assert.equal(move(p, at(early, {machine: want[1], turns: self ? 2 : 0}), {type: 'keep'}).board.missed, false, `${p.id}: Keep clears There's another`);
      const loaded = move(p, at(one, {machine: want[1]}), {type: 'load', machine: target});
      assert.deepEqual([loaded.board.machine, loaded.board.turns], [target, 0], `${p.id}: a kept machine goes back on the board`);
      assert.equal(move(p, one, {type: 'load', machine: want[1]}), null, `${p.id}: only kept machines load`);
      for (const kept of subsets(want.slice(0, 4))) for (const missed of kept.length && kept.length < want.length ? [false, true] : [false]) for (const m of [f.machine, want.at(-1), 'CBA'.length === q.cups ? 'CBA' : 'DCBA']) {
        hintsSolve(p, at(start, {machine: m, kept, missed}), `${p.id} from ${m} with ${kept}`);
      }
      walk(p, start, [...swaps(q.cups), {type: 'turn'}, {type: 'turn'}, {type: 'keep'}, {type: 'keep'}, {type: 'claim'}, {type: 'home'}], p.id, 100);
      for (const board of [...forged, {...f, kept: [target, target]}, {...f, claimed: true}, {...f, missed: true}, {...f, kept: want, missed: true}, ...(self ? [{...f, kept: ['BACD']}] : [{...f, kept: ['ABCD']}])]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {...f, kept: want, claimed: true}));
      continue;
    }

    // Turn counts: Keep after a finished run, one machine per count.
    const all7 = machines(q.cups).map(toPack), withTurns = k => all7.find(m => turnsOf(fromPack(m)) === k);
    assert.deepEqual(a.board.kept.map(m => String(turnsOf(fromPack(m)))).sort(), want, `${p.id}: the counts kept`);
    const six = withTurns(6), sixToo = all7.filter(m => turnsOf(fromPack(m)) === 6)[1];
    assert.equal(move(p, at(start, {machine: six}), {type: 'keep'}), null, `${p.id}: Keep waits for the run`);
    const kept6 = move(p, at(start, {machine: six, turns: 6}), {type: 'keep'});
    assert.deepEqual(kept6.board.kept, [six]);
    assert.equal(move(p, at(kept6, {machine: sixToo, turns: 6}), {type: 'keep'}), null, `${p.id}: one machine per count`);
    const early = move(p, kept6, {type: 'claim'});
    assert.ok(early.board.missed && !isSolved(p, early.board), `${p.id}: 6 isn't everything`);
    const counts = [...new Set(all7.map(m => turnsOf(fromPack(m))))].sort((x, y) => x - y);
    for (const kept of subsets(counts.slice(0, 5)).filter((_, i) => i % 3 === 0)) for (const missed of kept.length ? [false, true] : [false]) {
      const shelf = kept.map(withTurns), board = {machine: f.machine, turns: 0, kept: shelf, claimed: false, missed};
      if (missed && want.every(k => kept.includes(Number(k)))) continue;
      hintsSolve(p, at(start, board), `${p.id} with ${kept}`);
    }
    walk(p, start, [...swaps(q.cups), ...Array(6).fill({type: 'turn'}), {type: 'keep'}, {type: 'claim'}, {type: 'home'}], p.id, 120);
    const full = want.map(k => withTurns(Number(k)));
    assert.ok(validBoard(p, {...f, kept: full, claimed: true}));
    for (const board of [...forged, {...f, kept: [six, sixToo]}, {...f, kept: [six], claimed: true}, {...f, kept: full, missed: true}, {...f, missed: true}, {...f, kept: ['AB']}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
  }

  // Playground: three to seven cups, any machine, never solved.
  const [pg] = playgrounds;
  let b = freshAttempt(pg);
  assert.deepEqual(b.board, {cups: 5, machine: 'ABCDE', turns: 0});
  assert.equal(move(pg, b, {type: 'straight'}), null, 'already straight');
  b = move(pg, b, {type: 'swap', a: 0, b: 1});
  assert.equal(b.board.machine, 'BACDE');
  lowerRow(pg, b, 'playground');
  b = move(pg, b, {type: 'turn'});
  assert.equal(b.board.turns, 1);
  lowerRow(pg, b, 'playground mid-run');
  b = move(pg, b, {type: 'turn'});
  assert.equal(move(pg, b, {type: 'turn'}), null, 'home after 2: the run is over');
  assert.equal(move(pg, b, {type: 'home'}).board.turns, 0);
  const mixed = move(pg, b, {type: 'mix'}, () => 0.5);
  assert.ok(mixed.board.machine !== b.board.machine && mixed.board.turns === 0);
  for (const n of [3, 4, 6, 7]) assert.deepEqual(move(pg, b, {type: 'cups', cups: n}).board, {cups: n, machine: 'ABCDEFG'.slice(0, n), turns: 0});
  for (const bad of [{type: 'cups', cups: 8}, {type: 'cups', cups: 2}, {type: 'cups', cups: 5}, {type: 'keep'}, {type: 'claim'}, {type: 'cant'}, {type: 'swap', a: 0, b: 5}]) assert.equal(move(pg, b, bad), null, `playground rejects ${JSON.stringify(bad)}`);
  for (const board of [{...b.board, cups: 8}, {...b.board, machine: 'ABCD'}, {...b.board, turns: 3}, {...b.board, extra: 1}, {cups: 5, machine: 'ABCDE'}]) assert.equal(validBoard(pg, board), false, `playground rejects ${JSON.stringify(board)}`);
  assert.ok(!isSolved(pg, b.board)); assert.equal(nextHint(pg, b).type, 'done');
  return {machinesPuzzles: core.length, playground: 1, sources: pack.sources.length, answers, hintSteps};
}
export default validateMachines;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateMachines(), null, 2));
