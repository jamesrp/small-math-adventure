// Checks the Signal Lanterns codebooks pack (dist/families/codebooks/codebooks.json):
// content fields and sources; every answer against plain enumeration (every
// set of rows for the small cases, the greedy list for eight pictures); that
// a working key solves and claims are accepted only when no key exists; that
// hints alone finish every key puzzle and every changer round; the partner
// rounds; illegal moves and forged saves.
// Run: node scripts/validate-codebooks.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

const rowsOf = n => Array.from({length: 2 ** n}, (_, i) => i.toString(2).padStart(n, '0'));
const dist = (a, b) => [...a].filter((c, i) => c !== b[i]).length;
const ones = r => [...r].filter(c => c === '1').length;
const minDist = rows => Math.min(...rows.flatMap((r, i) => rows.slice(i + 1).map(s => dist(r, s))));
// Every set of k rows of length n, by plain combinations (small cases only).
function anyKey(n, k, gap, weight = null) {
  const pool = rowsOf(n).filter(r => weight === null || ones(r) === weight);
  const pick = [];
  const go = start => {
    if (pick.length === k) return minDist(pick) >= gap;
    for (let i = start; i < pool.length; i++) { pick.push(pool[i]); if (go(i + 1)) return true; pick.pop(); }
    return false;
  };
  return go(0) ? [...pick] : null;
}
// The greedy list in counting order.
const greedy = (n, gap) => rowsOf(n).reduce((kept, r) => kept.every(s => dist(r, s) >= gap) ? [...kept, r] : kept, []);
const keyFor = (n, k, gap, weight = null) => k === 8 ? greedy(n, gap).slice(0, 8) : anyKey(n, k, gap, weight);
const run = (p, a, actions) => actions.reduce((x, action) => { const y = move(p, x, action); assert.ok(y, `${p.id}: ${JSON.stringify(action)} is legal`); return y; }, a);
// Tap lanterns until the board shows these rows.
const setRows = (p, a, rows) => run(p, a, rows.flatMap((row, picture) => [...row].flatMap((c, lantern) => c !== a.board.rows[picture][lantern] ? [{type: 'lantern', picture, lantern}] : [])));
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

export default async function validateCodebooks() {
  const book = JSON.parse(await readFile(new URL('../dist/families/codebooks/codebooks.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  assert.equal(book.puzzles.length, 12);
  assert.deepEqual(book.puzzles.map(p => p.number), Array.from({length: 12}, (_, i) => i + 1));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(book.puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of book.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  const greedy6 = greedy(6, 3);
  assert.deepEqual(greedy6, ['000000', '000111', '011001', '011110', '101010', '101101', '110011', '110100'], 'the greedy list for six lanterns');
  let designs = 0, changers = 0, partners = 0, hintMoves = 0, decided = {yes: 0, no: 0}, foolable = {yes: 0, no: 0};
  for (const p of book.puzzles) {
    const q = p.parameters, label = p.id;
    assert.equal(p.id, `codebooks-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'codebook'); assert.equal(p.libraryFamily, 'code'); assert.equal(p.group, 'Codebooks'); assert.equal(p.band, 'all');
    assert.equal(p.familyTitle, 'Signal Lanterns');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    assert.ok(p.rules.some(r => r.includes(q.flips === 2 ? 'up to two' : 'one lantern, or none')), `${label}: the rules name the changer's limit`);
    const fresh = freshAttempt(p), gap = 2 * q.flips + 1;

    if (q.mode === 'design') {
      designs++;
      const weight = q.weight ?? null;
      const exists = n => Boolean(keyFor(n, q.pictures, gap, weight));
      if (q.goal === 'fewest') {
        const least = q.lengths.find(exists);
        assert.equal(p.solution.fewest, least, `${label}: the fewest lanterns`);
        assert.ok(least > q.lengths[0], `${label}: a shorter length to rule out`);
        let a = run(p, fresh, [{type: 'length', length: least - 1}, {type: 'claim'}].slice(0, 1));
        assert.equal(move(p, a, {type: 'claim'}), null, `${label}: no claim before a check`);
        a = run(p, a, [{type: 'check'}, {type: 'claim'}]);
        assert.ok(a.board.claims.includes(least - 1) && !isSolved(p, a.board), `${label}: the claim alone does not solve`);
        a = run(p, a, [{type: 'length', length: least}]);
        a = run(p, setRows(p, a, keyFor(least, q.pictures, gap, weight)), [{type: 'check'}]);
        assert.ok(isSolved(p, a.board), `${label}: a working key at the fewest length and the claim below it solve`);
        // A working key at a longer length is not enough.
        const longer = q.lengths.at(-1);
        let b = run(p, fresh, [{type: 'length', length: longer}]);
        b = run(p, setRows(p, b, keyFor(longer, q.pictures, gap, weight)), [{type: 'check'}]);
        assert.ok(!isSolved(p, b.board), `${label}: a longer key does not solve`);
        const refused = move(p, b, {type: 'claim'});
        assert.equal(refused.board.wrong, longer, `${label}: a false claim is refused`);
        assert.ok(!refused.board.claims.includes(longer));
        assert.equal(nextHint(p, fresh).type, 'note', `${label}: hints never say which lengths work`);
      } else {
        const n = q.lengths[0], can = exists(n);
        if (q.goal === 'key') assert.ok(can, `${label}: a key exists`);
        else { assert.equal(p.solution.possible, can, `${label}: whether a key exists`); decided[can ? 'yes' : 'no']++; }
        if (q.pictures === 2) assert.equal(p.solution.keys, rowsOf(n).flatMap(a => rowsOf(n).filter(b => a !== b && dist(a, b) >= gap && (weight === null || (ones(a) === weight && ones(b) === weight)))).length, `${label}: the number of keys`);
        let a = run(p, fresh, [{type: 'check'}]);
        assert.ok(!isSolved(p, a.board), `${label}: all-dark rows fail`);
        if (can) {
          const key = keyFor(n, q.pictures, gap, weight);
          assert.ok(isSolved(p, run(p, setRows(p, a, key), [{type: 'check'}]).board), `${label}: a working key solves`);
          if (q.goal === 'decide') assert.equal(move(p, a, {type: 'claim'}).board.wrong, n, `${label}: a false claim is refused`);
        } else {
          assert.equal(move(p, fresh, {type: 'claim'}), null, `${label}: no claim before a check`);
          assert.ok(isSolved(p, run(p, a, [{type: 'claim'}]).board), `${label}: the true claim solves`);
        }
        // Every key with a clash fails, shown by checking keys one change away from a working one.
        if (can) {
          const key = keyFor(n, q.pictures, gap, weight);
          const broken = key.map((r, i) => i === 1 ? (gap === 3 ? key[0].slice(0, -1) + (key[0].at(-1) === '1' ? '0' : '1') : key[0]) : r);
          if (weight === null) assert.ok(!isSolved(p, run(p, setRows(p, fresh, broken), [{type: 'check'}]).board), `${label}: a key with two close rows fails`);
        }
        if (q.goal === 'key') {
          assert.equal(move(p, a, {type: 'claim'}), null, `${label}: key puzzles take no claim`);
          // Hints alone finish, from a fresh board and from a messy one.
          const messy = setRows(p, fresh, Array.from({length: q.pictures}, (_, i) => rowsOf(n)[(i * 5 + 3) % 2 ** n]));
          for (const start of [fresh, messy]) { const done = finish(p, start); hintMoves += done.moves - start.moves; assert.ok(isSolved(p, done.board), `${label}: hints finish the key`); }
          if (weight !== null) {
            const off = rowsOf(n).find(r => ones(r) !== weight), far = rowsOf(n).find(r => dist(r, off) >= gap);
            assert.ok(!isSolved(p, run(p, setRows(p, fresh, [off, far]), [{type: 'check'}]).board), `${label}: rows breaking the lit rule fail`);
          }
        } else assert.equal(nextHint(p, fresh).type, 'note', `${label}: hints never say whether a key exists`);
      }
      // Illegal moves and forged saves.
      for (const action of [{type: 'lantern', picture: q.pictures, lantern: 0}, {type: 'lantern', picture: 0, lantern: 9}, {type: 'lantern', picture: -1, lantern: 0}, {type: 'send'}, {type: 'shrug'}, null]) assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
      if (q.goal !== 'fewest') assert.equal(move(p, fresh, {type: 'length', length: q.lengths[0] + 1}), null, `${label}: fixed length`);
      const b = fresh.board, n0 = b.length;
      const wrongKey = Array(q.pictures).fill('0'.repeat(n0));
      for (const forged of [{...b, rows: b.rows.slice(1)}, {...b, rows: b.rows.map(r => r + '0')}, {...b, length: 9}, {...b, checked: true}, {...b, found: {[n0]: wrongKey}, tried: [n0]}, {...b, found: {[n0]: wrongKey}}, {...b, claims: [n0]}, {...b, wrong: n0}, {...b, tried: [n0, n0]}]) {
        assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${JSON.stringify(forged).slice(0, 80)}`);
      }
      continue;
    }

    if (q.mode === 'changer') {
      changers++;
      assert.deepEqual(p.solution.foolable, q.keys.map(key => minDist(key) <= 2 * q.flips), `${label}: which keys can be fooled`);
      for (const f of p.solution.foolable) foolable[f ? 'yes' : 'no']++;
      assert.ok(p.solution.foolable.includes(true) && p.solution.foolable.includes(false), `${label}: both kinds of key`);
      assert.ok(q.keys.every(key => new Set(key.map(r => r.length)).size === 1), `${label}: one length per key`);
      // Each round: every fooling row wins, every other row does not; the claim only when true.
      let a = fresh;
      for (let r = 0; r < q.keys.length; r++) {
        const key = q.keys[r], n = key[0].length;
        assert.equal(a.board.round, r);
        assert.equal(move(p, a, {type: 'cant'}), null, `${label}: no claim before a send`);
        for (const row of rowsOf(n)) {
          const fools = key.filter(k => dist(k, row) <= q.flips).length > 1;
          const sent = run(p, run(p, a, [...row].flatMap((c, i) => c !== a.board.row[i] ? [{type: 'lantern', lantern: i}] : [])), [{type: 'send'}]);
          assert.equal(sent.board.won, fools, `${label}: key ${r}, row ${row}`);
        }
        const tried = run(p, a, [{type: 'send'}]);
        const claim = move(p, tried, {type: 'cant'});
        assert.equal(claim.board.won, !p.solution.foolable[r], `${label}: key ${r}, the claim`);
        if (p.solution.foolable[r]) assert.equal(claim.board.cant, 'no');
        // Hints alone win this key and move on.
        for (let i = 0; i < 40 && a.board.round === r && !isSolved(p, a.board); i++) {
          const h = nextHint(p, a);
          assert.equal(h.type, 'move', `${label}: key ${r} hints name a move`);
          a = move(p, a, h.action);
          assert.ok(a, `${label}: key ${r}, the hinted move is legal`);
          hintMoves++;
        }
        assert.ok(isSolved(p, a.board) || a.board.round === r + 1, `${label}: hints win key ${r}`);
      }
      assert.ok(isSolved(p, a.board), `${label}: hints win every key`);
      for (const forged of [{...fresh.board, round: 9}, {...fresh.board, row: '01'}, {...fresh.board, won: true}, {...fresh.board, cant: 'yes'}, {...fresh.board, sent: true}, {...fresh.board, round: 1, won: true, cant: 'yes', tried: true}]) {
        if (forged.round === 1 && !p.solution.foolable[1]) continue;
        assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${JSON.stringify(forged)}`);
      }
      continue;
    }

    partners++;
    assert.ok(mechanicFor(p).noUndo(p), `${label}: one check, no Undo`);
    for (let r = 0; r < q.rounds.length; r++) {
      const given = q.rounds[r], answer = rowsOf(given.length).filter(row => dist(row, given) >= gap);
      assert.deepEqual(p.solution.rounds[r], answer, `${label}: round ${r} partners`);
      let a = fresh;
      for (let i = 0; i < r; i++) a = run(p, a, [{type: 'add'}, {type: 'check'}, {type: 'next'}]);
      assert.equal(a.board.round, r);
      assert.equal(nextHint(p, a).type, 'note');
      const collect = rows => rows.reduce((x, row) => run(p, run(p, x, [...row].flatMap((c, i) => c !== x.board.row[i] ? [{type: 'lantern', lantern: i}] : [])), [{type: 'add'}]), a);
      assert.ok(isSolved(p, run(p, collect(answer), [{type: 'check'}]).board), `${label}: round ${r}, every partner solves`);
      const short = run(p, collect(answer.slice(1)), [{type: 'check'}]);
      assert.ok(!isSolved(p, short.board), `${label}: a missing partner is a miss`);
      assert.equal(move(p, short, {type: 'add'}), null, `${label}: one check`);
      assert.equal(nextHint(p, short).action.type, 'next');
      const extra = run(p, collect([...answer, given]), [{type: 'check'}]);
      assert.ok(!isSolved(p, extra.board), `${label}: an extra row is a miss`);
    }
    assert.equal(move(p, fresh, {type: 'check'}), null, `${label}: no check with nothing collected`);
    assert.equal(move(p, fresh, {type: 'remove', row: '1111'}), null);
    for (const forged of [{...fresh.board, round: 7}, {...fresh.board, list: ['0000', '0000']}, {...fresh.board, list: ['000']}, {...fresh.board, checked: true}]) {
      assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save`);
    }
  }
  assert.ok(decided.yes >= 1 && decided.no >= 2, 'decide puzzles have both answers');
  return {puzzles: book.puzzles.length, designs, changers, partners, decided, foolable, hintMoves};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateCodebooks(), null, 2));
