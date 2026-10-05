// Checks the Signal Lanterns slippery secrets pack
// (dist/families/secrets/secrets.json): content fields and sources; every
// answer against a separate search (a size recursion for yes-or-no questions,
// a plain minimax over lists of rows for tests); that the slippery secret
// answers as badly for the child as any answer can; that every sequence of
// questions or tests within a "no" budget loses and a known way wins within a
// "yes" budget; that claims are accepted only when true; that hints alone
// finish every find and plan puzzle; for tests planned ahead, an independent
// count of the sets that work and that the scores given keep the most secrets;
// illegal moves and forged saves.
// Run: node scripts/validate-secrets.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

const rowsOf = n => Array.from({length: 2 ** n}, (_, i) => i.toString(2).padStart(n, '0'));
const matches = (a, b) => [...a].filter((c, i) => c === b[i]).length;
// Yes-or-no questions: by symmetry only the number of things left matters.
const questionsMemo = new Map([[0, 0], [1, 0]]);
function questions(m) {
  if (!questionsMemo.has(m)) {
    let best = Infinity;
    for (let k = 1; k < m; k++) best = Math.min(best, 1 + Math.max(questions(k), questions(m - k)));
    questionsMemo.set(m, best);
  }
  return questionsMemo.get(m);
}
// Tests: the exact minimax value of a list of secrets, by plain recursion.
const testsMemo = new Map();
function tests(n, hit, secrets) {
  if (hit ? secrets.length === 0 : secrets.length === 1) return 0;
  const key = `${n}/${hit}/${secrets.join(' ')}`;
  if (testsMemo.has(key)) return testsMemo.get(key);
  let best = Infinity;
  for (const t of rowsOf(n)) {
    const groups = {};
    for (const s of secrets) { const sc = matches(t, s); if (hit && sc === n) continue; (groups[sc] ??= []).push(s); }
    const parts = Object.values(groups);
    if (parts.some(part => part.length === secrets.length)) continue;
    const worst = Math.max(0, ...parts.map(part => tests(n, hit, part)));
    if (worst + 1 < best) best = worst + 1;
    if (best === 1) break;
  }
  testsMemo.set(key, best);
  return best;
}
const fits = (n, transcript) => rowsOf(n).filter(s => transcript.every(t => matches(t.row, s) === t.score));
const run = (p, a, actions) => actions.reduce((x, action) => { const y = move(p, x, action); assert.ok(y, `${p.id}: ${JSON.stringify(action)} is legal`); return y; }, a);
const setRow = (p, a, row) => run(p, a, [...row].flatMap((c, i) => c !== a.board.row[i] ? [{type: 'lantern', lantern: i}] : []));
const doTest = (p, a, row) => run(p, setRow(p, a, row), [{type: 'test'}]);
const ask = (p, a, pick) => run(p, a, [...pick.map(item => ({type: 'item', item})), {type: 'ask'}]);
function finish(p, a, limit = 400) {
  for (let i = 0; i < limit && !isSolved(p, a.board); i++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id}: hints keep naming a move`);
    assert.ok(h.text, `${p.id}: hint text`);
    a = move(p, a, h.action);
    assert.ok(a, `${p.id}: the hinted move is legal`);
  }
  return a;
}
// Every sequence of tests (or of questions about live things) within a budget,
// played against the app; `visit` sees each finished sequence.
function everyTestRound(p, a, budget, visit) {
  const n = p.parameters.length;
  if (a.board.tests.length === budget || (p.parameters.hit && a.board.tests.some(t => t.score === n))) return visit(a);
  for (const t of rowsOf(n)) everyTestRound(p, doTest(p, a, t), budget, visit);
}
// Every set of k different tests of length n that gives all secrets
// different lists of scores, counted directly.
function plannedSets(n, k) {
  const all = rowsOf(n);
  let count = 0;
  const pick = [];
  const go = start => {
    if (pick.length === k) { if (new Set(all.map(s => pick.map(t => matches(t, s)).join())).size === all.length) count++; return; }
    for (let i = start; i < all.length; i++) { pick.push(all[i]); go(i + 1); pick.pop(); }
  };
  go(0);
  return count;
}
const planTests = (p, a, rows) => run(p, a, rows.flatMap((r, j) => [...r].flatMap((c, i) => c !== a.board.rows[j][i] ? [{type: 'lantern', test: j, lantern: i}] : [])));
const subsets = list => list.length > 12 ? null : Array.from({length: 2 ** list.length - 1}, (_, m) => list.filter((_, i) => m + 1 >> i & 1));

export default async function validateSecrets() {
  const book = JSON.parse(await readFile(new URL('../dist/families/secrets/secrets.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  assert.equal(book.puzzles.length, 13);
  assert.deepEqual(book.puzzles.map(p => p.number), Array.from({length: 13}, (_, i) => i + 1));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(book.puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of book.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  // The facts the spec states, by the separate searches.
  assert.deepEqual([2, 3, 4, 5].map(n => tests(n, false, rowsOf(n))), [2, 3, 4, 4], 'tests to know: n for 2 to 4 lanterns, 4 for 5');
  assert.deepEqual([2, 3, 4, 5].map(n => tests(n, true, rowsOf(n))), [3, 4, 5, 5], 'tests to score n: one more');
  assert.deepEqual([4, 8, 16, 17, 20, 32, 33].map(questions), [2, 3, 4, 5, 5, 5, 6], 'questions: log₂ rounded up');
  const planned5 = ['00000', '00011', '00101', '01001'];
  assert.equal(new Set(rowsOf(5).map(s => planned5.map(t => matches(t, s)).join())).size, 32, 'four planned tests tell every five-lantern secret');
  assert.deepEqual([[3, 2], [3, 3], [4, 3], [5, 3]].map(([n, k]) => plannedSets(n, k)), [0, 32, 0, 0], 'planned tests: 3 for 3 lanterns, never 3 for 4 or 5');
  let rounds = 0, hintMoves = 0, decided = {yes: 0, no: 0}, adversary = 0;

  for (const p of book.puzzles) {
    const q = p.parameters, label = p.id, fresh = freshAttempt(p);
    assert.equal(p.id, `secrets-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'secret'); assert.equal(p.libraryFamily, 'code'); assert.equal(p.group, 'Slippery secrets'); assert.equal(p.band, 'all');
    assert.equal(p.familyTitle, 'Signal Lanterns');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    assert.ok(p.rules.some(r => r.startsWith('The secret may change at any time, but only to one that fits every')), `${label}: the rules say the secret is slippery`);
    assert.ok(mechanicFor(p).render(p, fresh).includes('data-mechanic-wire="secrets"'));

    if (q.mode === 'plan') {
      assert.equal(p.solution.possible, q.count <= 2 ** q.questions);
      assert.ok(p.solution.possible, `${label}: planned questions can work`);
      // Base-2 questions win; any two things with the same answers lose.
      const binary = Array.from({length: q.questions}, (_, k) => Array.from({length: q.count}, (_, i) => i).filter(i => i >> (q.questions - 1 - k) & 1));
      let a = fresh;
      binary.forEach((pick, k) => { a = run(p, a, pick.map(item => ({type: 'item', question: k, item}))); });
      assert.ok(isSolved(p, run(p, a, [{type: 'ask'}]).board), `${label}: base-2 questions win`);
      const clash = run(p, a, [{type: 'item', question: 0, item: 0}, {type: 'ask'}]);
      assert.ok(!isSolved(p, clash.board), `${label}: two things with the same answers lose`);
      assert.ok(mechanicFor(p).render(p, clash).includes('both fit every answer'), `${label}: a lost plan names two that fit`);
      assert.equal(move(p, clash, {type: 'item', item: 1}), null, `${label}: no changes after asking`);
      assert.ok(run(p, clash, [{type: 'again'}]).board.asked === false, `${label}: Again keeps the questions`);
      for (const start of [fresh, a, clash]) { const done = finish(p, start); hintMoves += done.moves - start.moves; assert.ok(isSolved(p, done.board), `${label}: hints finish the plan`); }
      for (const action of [{type: 'item', item: q.count}, {type: 'item', question: q.questions, item: 0}, {type: 'question', question: -1}, {type: 'claim'}, {type: 'test'}, null]) assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
      for (const forged of [{...fresh.board, picks: fresh.board.picks.slice(1)}, {...fresh.board, picks: [[1, 0], ...fresh.board.picks.slice(1)]}, {...fresh.board, current: q.questions}, {...fresh.board, asked: 'yes'}]) assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save`);
      continue;
    }

    if (q.mode === 'plantest') {
      const n = q.length, working = plannedSets(n, q.tests);
      assert.equal(p.solution.working, working, `${label}: the number of planned sets that work`);
      assert.ok(working > 0 && p.solution.possible, `${label}: planned tests can work`);
      assert.equal(mechanicFor(p).noUndo(p), false, `${label}: Undo while planning`);
      // The scores given are shared by as many secrets as any scores can be.
      const asked = rows => {
        const a = run(p, planTests(p, fresh, rows), [{type: 'ask'}]);
        const html = mechanicFor(p).render(p, a);
        const shown = [...html.matchAll(/<td class="sx-score">(\d+)<\/td>/g)].map(m => Number(m[1]));
        const groups = {};
        for (const s of rowsOf(n)) { const key = rows.map(t => matches(t, s)).join(); groups[key] = (groups[key] ?? 0) + 1; }
        const most = Math.max(...Object.values(groups)), left = fits(n, rows.map((row, j) => ({row, score: shown[j]})));
        assert.equal(left.length, most, `${label}: the scores keep the most secrets for ${rows.join(' ')}`);
        assert.equal(isSolved(p, a.board), most === 1, `${label}: solved exactly when every secret gets its own scores`);
        assert.match(html, most === 1 ? /Only this fits every score/ : /These both fit every score/);
        adversary++;
        return a;
      };
      const known = n === 3 ? [['000', '100', '010'], ['100', '010', '001']] : [planned5, ['10000', '01000', '00100', '00010']];
      for (const rows of known) assert.ok(isSolved(p, asked(rows).board), `${label}: ${rows.join(' ')} works`);
      const failing = n === 3 ? [['000', '000', '000'], ['000', '100', '011']] : [['00000', '10000', '01000', '00100'], ['00000', '00000', '00011', '00101']];
      const lost = failing.map(rows => asked(rows));
      for (let trial = 0; trial < 24; trial++) asked(Array.from({length: q.tests}, (_, j) => rowsOf(n)[(trial * 11 + j * 7 + j * j * trial) % 2 ** n]));
      assert.equal(move(p, lost[0], {type: 'lantern', test: 0, lantern: 0}), null, `${label}: no changes after testing`);
      assert.equal(move(p, lost[0], {type: 'ask'}), null, `${label}: no second asking`);
      assert.deepEqual(run(p, lost[1], [{type: 'again'}]).board, {rows: failing[1], asked: false}, `${label}: Again keeps the tests`);
      for (const start of [fresh, ...lost, planTests(p, fresh, failing[1])]) { const done = finish(p, start); hintMoves += done.moves - start.moves; assert.ok(isSolved(p, done.board), `${label}: hints finish the plan`); }
      for (const action of [{type: 'lantern', test: q.tests, lantern: 0}, {type: 'lantern', test: 0, lantern: n}, {type: 'lantern', test: -1, lantern: 0}, {type: 'again'}, {type: 'claim'}, {type: 'test'}, {type: 'budget', budget: 3}, null]) assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
      for (const forged of [{...fresh.board, rows: fresh.board.rows.slice(1)}, {...fresh.board, rows: fresh.board.rows.map(() => '0'.repeat(n + 1))}, {...fresh.board, rows: fresh.board.rows.map(() => '2'.repeat(n))}, {...fresh.board, asked: 'yes'}, {...fresh.board, rows: null}]) assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save`);
      rounds += known.length + failing.length;
      continue;
    }

    assert.ok(mechanicFor(p).noUndo(p), `${label}: no Undo, so an answer can't be taken back`);
    const possible = q.mode === 'ask' ? k => questions(q.count) <= k : k => tests(q.length, q.hit, rowsOf(q.length)) <= k;
    if (q.goal === 'fewest') {
      const least = q.budgets.find(possible);
      assert.equal(p.solution.fewest, least, `${label}: the fewest`);
      assert.ok(least > q.budgets[0], `${label}: a smaller budget to rule out`);
    } else {
      assert.equal(p.solution.possible, possible(q.budgets[0]), `${label}: whether the budget always works`);
      if (q.goal === 'find') assert.ok(p.solution.possible, `${label}: find puzzles can be done`);
      else decided[p.solution.possible ? 'yes' : 'no']++;
    }
    const at = k => q.goal === 'fewest' && k !== fresh.board.budget ? run(p, fresh, [{type: 'budget', budget: k}]) : fresh;

    if (q.mode === 'ask') {
      // The slippery answer is always a worst one: it keeps the side needing more questions.
      const sizes = Array.from({length: q.count}, (_, i) => i);
      for (let trial = 0; trial < 40; trial++) {
        const pick = sizes.filter(i => (i * 7 + trial * 3) % 5 < 2 + trial % 3);
        if (!pick.length || pick.length === q.count) continue;
        const after = ask(p, at(q.budgets.at(-1)), pick), yes = after.board.asked[0].yes;
        const kept = yes ? pick.length : q.count - pick.length, other = q.count - kept;
        assert.ok(questions(kept) >= questions(other), `${label}: the answer keeps the harder side`);
        adversary++;
      }
      // Halving wins within the fewest budget.
      const halve = a => { while (!a.board.wins[a.board.budget] && a.board.asked.length < a.board.budget) { const live = sizes.filter(i => a.board.asked.every(x => x.pick.includes(i) === x.yes)); a = ask(p, a, live.slice(0, Math.floor(live.length / 2))); } return a; };
      for (const k of q.budgets.filter(possible)) { const won = halve(at(k)); assert.ok(won.board.wins[k], `${label}: halving wins with ${k}`); rounds++; }
      // Within a budget that can't always work, every way of asking loses (small cases), or the halving round does.
      for (const k of q.budgets.filter(k => !possible(k))) {
        const start = at(k);
        if (q.count <= 8) {
          const every = a => {
            const live = sizes.filter(i => a.board.asked.every(x => x.pick.includes(i) === x.yes));
            if (live.length === 1) assert.fail(`${label}: a way of asking won with ${k}`);
            if (a.board.asked.length === k) { rounds++; return; }
            for (const pick of subsets(live)) every(ask(p, a, pick));
          };
          every(start);
        } else assert.ok(!halve(start).board.wins[k], `${label}: halving loses with ${k}`);
      }
    } else {
      const n = q.length;
      // The slippery score is always a worst one.
      let a = at(q.budgets.at(-1));
      for (const t of rowsOf(n).slice(0, 6)) {
        if (a.board.tests.length >= a.board.budget - 1 || fits(n, a.board.tests).length <= 1) break;
        const before = fits(n, a.board.tests);
        a = doTest(p, a, t);
        const sc = a.board.tests.at(-1).score, value = s => tests(n, q.hit, before.filter(x => matches(t, x) === s && !(q.hit && s === n)));
        const scores = [...new Set(before.map(x => matches(t, x)))].filter(s => !(q.hit && s === n) || before.length === 1);
        assert.ok(scores.every(s => value(s) <= value(sc)), `${label}: the score keeps the most tests needed`);
        adversary++;
      }
      // An independent way wins within each budget that always works.
      const play = (a, k) => {
        while (!a.board.wins[k]) {
          const left = fits(n, a.board.tests);
          if (!q.hit && left.length === 1) { a = run(p, setRow(p, a, left[0]), [{type: 'name'}]); break; }
          assert.ok(a.board.tests.length < k, `${label}: tests left`);
          let best = null;
          for (const t of rowsOf(n)) {
            const groups = {};
            for (const s of left) { const sc = matches(t, s); if (q.hit && sc === n) continue; (groups[sc] ??= []).push(s); }
            const parts = Object.values(groups);
            if (parts.some(part => part.length === left.length)) continue;
            const worst = Math.max(0, ...parts.map(part => tests(n, q.hit, part)));
            if (!best || worst < best.worst) best = {t, worst};
          }
          a = doTest(p, a, best.t);
        }
        return a;
      };
      for (const k of q.budgets.filter(possible)) { assert.ok(play(at(k), k).board.wins[k], `${label}: a known way wins with ${k}`); rounds++; }
      if (n === 5) {
        let b = at(4);
        for (const t of planned5) b = doTest(p, b, t);
        const left = fits(n, b.board.tests);
        assert.equal(left.length, 1, `${label}: the planned tests leave one secret`);
        assert.ok(isSolved(p, run(p, setRow(p, b, left[0]), [{type: 'name'}]).board), `${label}: the planned tests win`);
      }
      // Within a budget that can't always work, every sequence of tests leaves two secrets (or no hit).
      for (const k of q.budgets.filter(k => !possible(k) && k <= 3)) {
        everyTestRound(p, at(k), k, end => {
          const left = fits(n, end.board.tests);
          if (q.hit) assert.ok(!end.board.wins[k], `${label}: no sequence of ${k} tests forces a hit`);
          else {
            assert.ok(left.length >= 2, `${label}: no sequence of ${k} tests leaves one secret`);
            assert.ok(!run(p, setRow(p, end, left[0]), [{type: 'name'}]).board.wins[k], `${label}: naming a secret while two fit loses`);
          }
          rounds++;
        });
      }
      // A wrong name loses and shows what fits.
      const guessed = run(p, at(q.budgets.at(-1)), [{type: 'test'}]);
      if (!q.hit) {
        const lost = run(p, guessed, [{type: 'name'}]);
        assert.ok(!lost.board.wins[lost.board.budget] && lost.board.named !== null, `${label}: guessing early loses`);
        assert.match(mechanicFor(p).render(p, lost), /fit(s)? every score/, `${label}: a lost round shows what fits`);
        assert.equal(move(p, lost, {type: 'test'}), null, `${label}: no tests after the round ends`);
      }
    }

    // Claims: only after a finished round, accepted only when true.
    if (q.goal === 'find') {
      assert.equal(move(p, fresh, {type: 'claim'}), null, `${label}: find puzzles take no claim`);
      for (const start of [fresh]) { const done = finish(p, start); hintMoves += done.moves - start.moves; assert.ok(isSolved(p, done.board), `${label}: hints finish`); }
      // From a lost round too.
      const lost = q.mode === 'ask' ? ask(p, ask(p, fresh, [0]), [1]) : run(p, fresh, q.hit ? [] : [{type: 'name'}]);
      const done = finish(p, lost); hintMoves += done.moves - lost.moves;
      assert.ok(isSolved(p, done.board), `${label}: hints finish after a lost start`);
    } else {
      assert.equal(nextHint(p, fresh).type, 'note', `${label}: hints never say which budgets work`);
      for (const k of q.budgets.filter(k => q.goal === 'decide' ? k === q.budgets[0] : true)) {
        const start = at(k);
        assert.equal(move(p, start, {type: 'claim'}), null, `${label}: no claim before a round`);
        const ended = q.mode === 'ask'
          ? (() => { let a = start; while (a.board.asked.length < k && !a.board.wins[k]) a = ask(p, a, [a.board.asked.length % q.count]); return a.board.wins[k] ? null : a; })()
          : (() => { let a = start; if (!q.hit) return run(p, a, [{type: 'name'}]); while (a.board.tests.length < k && !a.board.wins[k]) a = doTest(p, a, rowsOf(q.length)[a.board.tests.length]); return a.board.wins[k] ? null : a; })();
        if (!ended) continue;
        const claimed = move(p, ended, {type: 'claim'});
        if (possible(k)) { assert.equal(claimed.board.wrong, k, `${label}: a false claim with ${k} is refused`); assert.ok(!claimed.board.claims.includes(k)); }
        else assert.ok(claimed.board.claims.includes(k), `${label}: the true claim with ${k} is accepted`);
        assert.ok(run(p, ended, [{type: 'again'}]).board.tried.includes(k), `${label}: a new round keeps the record`);
      }
      // Solving: the fewest needs a win there and the claim below it.
      if (q.goal === 'fewest') {
        const least = p.solution.fewest;
        let a = at(least - 1);
        a = q.mode === 'ask' ? ask(p, a, [0]) : a;
        if (q.mode === 'ask') while (a.board.asked.length < least - 1) a = ask(p, a, [a.board.asked.length]);
        else if (q.hit) while (a.board.tests.length < least - 1) a = doTest(p, a, rowsOf(q.length)[a.board.tests.length]);
        else a = run(p, a, [{type: 'name'}]);
        a = run(p, a, [{type: 'claim'}, {type: 'budget', budget: least}]);
        assert.ok(!isSolved(p, a.board), `${label}: the claim alone does not solve`);
        const won = q.mode === 'ask' ? (() => { let b = a; while (!b.board.wins[least]) { const live = Array.from({length: q.count}, (_, i) => i).filter(i => b.board.asked.every(x => x.pick.includes(i) === x.yes)); b = ask(p, b, live.slice(0, Math.floor(live.length / 2))); } return b; })() : null;
        if (won) assert.ok(isSolved(p, won.board), `${label}: a win at the fewest and the claim below solve`);
        const longer = q.budgets.at(-1);
        assert.ok(longer > least);
      }
    }

    // Illegal moves and forged saves.
    const bad = [{type: 'item', item: -1}, {type: 'lantern', lantern: 9}, {type: 'again'}, {type: 'shrug'}, null];
    if (q.goal !== 'fewest') bad.push({type: 'budget', budget: q.budgets[0] + 1});
    for (const action of bad) assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    const b = fresh.board, k0 = b.budget;
    const forgeries = [{...b, budget: 99}, {...b, tried: [k0, k0]}, {...b, claims: [k0]}, {...b, wrong: k0}];
    if (q.mode === 'ask') forgeries.push({...b, asked: [{pick: [0], yes: true}]}, {...b, wins: {[k0]: []}, tried: [k0]}, {...b, pick: [q.count]});
    else {
      const t = doTest(p, fresh, '0'.repeat(q.length)).board.tests[0];
      forgeries.push({...b, tests: [{...t, score: (t.score + 1) % (q.length + 1)}]}, {...b, wins: {[k0]: {tests: [], named: '0'.repeat(q.length)}}, tried: [k0]}, {...b, row: '0'.repeat(q.length + 1)}, {...b, named: '1'.repeat(q.length)});
    }
    for (const forged of forgeries) assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${JSON.stringify(forged).slice(0, 100)}`);
  }
  assert.ok(decided.yes >= 1 && decided.no >= 2, 'decide puzzles have both answers');
  return {puzzles: book.puzzles.length, rounds, adversary, decided, hintMoves};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateSecrets(), null, 2));
