// Checks the Clockwork Gates stars pack (dist/families/stars/stars.json):
// content fields and sources; every puzzle's answers against gcd (the module
// finds pieces by walking the ring instead); that hints alone finish every
// drawing from a fresh board and from a wrong start; that every listed answer
// finishes and every other hop or ring does not; the one-check rounds; illegal
// taps and forged saves.
// Run: node scripts/validate-stars.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

const gcd = (a, b) => b ? gcd(b, a % b) : a;
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const isPrime = n => n > 1 && range(2, n - 1).every(d => n % d);
// The taps that draw hop k on n dots, starting each piece at the lowest dot
// with no line: gcd(n, k) pieces, each closing after n / gcd(n, k) hops.
function drawing(n, k) {
  const g = gcd(n, k), taps = [];
  for (let s = 0; s < g; s++) for (let i = 0; i <= n / g; i++) taps.push((s + i * k) % n);
  return taps;
}
const tapAll = (p, a, taps) => taps.reduce((x, dot) => x && move(p, x, {type: 'tap', dot}), a);

export default async function validateStars() {
  const stars = JSON.parse(await readFile(new URL('../dist/families/stars/stars.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  assert.equal(stars.puzzles.length, 12);
  assert.deepEqual(stars.puzzles.map(p => p.number), range(1, 12));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(stars.puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of stars.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  let drawings = 0, rounds = 0, hintTaps = 0;
  for (const p of stars.puzzles) {
    const q = p.parameters, label = p.id;
    assert.equal(p.id, `stars-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'star'); assert.equal(p.libraryFamily, 'clock'); assert.equal(p.group, 'Stars'); assert.equal(p.band, 'all');
    assert.equal(p.familyTitle, 'Clockwork Gates');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    const fresh = freshAttempt(p);

    if (q.mode === 'every') {
      rounds++;
      const choicesOf = r => q.ask === 'hops' ? range(1, q.rounds[r] - 1) : range(...q.rounds[r]);
      const answerOf = r => q.ask === 'hops' ? choicesOf(r).filter(k => gcd(q.rounds[r], k) === 1) : choicesOf(r).filter(isPrime);
      assert.deepEqual(p.solution.rounds, q.rounds.map((_, r) => answerOf(r)), `${label}: each round's answer`);
      for (let r = 0; r < q.rounds.length; r++) {
        const ans = answerOf(r), choices = choicesOf(r);
        assert.ok(ans.length >= 3 && choices.length - ans.length >= 3, `${label}: round ${r} has both kinds`);
        // Reach round r by missing every earlier round.
        let a = fresh;
        for (let i = 0; i < r; i++) {
          a = move(p, a, {type: 'mark', value: choicesOf(i).find(v => !answerOf(i).includes(v))});
          a = move(p, a, {type: 'check'});
          assert.ok(a && !isSolved(p, a.board), `${label}: a wrong mark is a miss`);
          assert.equal(nextHint(p, a).action?.type, 'next');
          a = move(p, a, {type: 'next'});
        }
        assert.equal(a.board.round, r);
        assert.equal(nextHint(p, a).type, 'note', `${label}: round hints are notes`);
        const right = tapAll2(p, a, ans);
        assert.ok(isSolved(p, move(p, right, {type: 'check'}).board), `${label}: round ${r} answer solves`);
        // One missing or one extra mark is a miss, and no second check.
        const short = move(p, tapAll2(p, a, ans.slice(1)), {type: 'check'});
        assert.ok(short && !isSolved(p, short.board), `${label}: a missing mark is a miss`);
        assert.equal(move(p, short, {type: 'check'}), null, `${label}: one check per round`);
        assert.equal(move(p, short, {type: 'mark', value: ans[0]}), null, `${label}: no marking after Check`);
        const extra = move(p, tapAll2(p, a, [...ans, choices.find(v => !ans.includes(v))]), {type: 'check'});
        assert.ok(extra && !isSolved(p, extra.board), `${label}: an extra mark is a miss`);
      }
      assert.equal(move(p, fresh, {type: 'check'}), null, `${label}: no Check with nothing marked`);
      assert.equal(move(p, fresh, {type: 'next'}), null, `${label}: no Next before Check`);
      assert.equal(move(p, fresh, {type: 'mark', value: 0}), null);
      assert.equal(move(p, fresh, {type: 'mark', value: 999}), null);
      assert.equal(move(p, fresh, {type: 'tap', dot: 0}), null);
      assert.ok(mechanicFor(p).noUndo(p), `${label}: rounds have no Undo`);
      for (const forged of [{...fresh.board, round: 9}, {...fresh.board, marked: [0]}, {...fresh.board, marked: [1, 1]}, {...fresh.board, checked: true}, {...fresh.board, checked: 'no'}, {taps: []}]) {
        assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${JSON.stringify(forged)}`);
      }
      continue;
    }

    drawings++;
    assert.ok(!mechanicFor(p).noUndo?.(p), `${label}: drawings allow Undo`);
    // Independent answers.
    const n = q.dots ?? q.target?.dots;
    if (q.mode === 'draw') assert.equal(p.solution.pieces, gcd(q.dots, q.hop));
    if (q.mode === 'starts') assert.deepEqual(p.solution.hops, range(1, n - 1).filter(k => gcd(n, k) === q.starts), `${label}: hops`);
    if (q.mode === 'rings') assert.deepEqual(p.solution.rings, q.choices.filter(m => gcd(m, q.hop) === q.starts), `${label}: rings`);
    if (q.mode === 'match') {
      assert.ok(q.choices.includes(n), `${label}: the target ring is offered`);
      assert.equal(p.solution.pieces, gcd(n, q.target.hop));
      assert.deepEqual(p.solution.hops, range(1, n - 1).filter(k => k === q.target.hop || k === n - q.target.hop), `${label}: hops`);
      assert.ok(q.target.hop !== n / 2 && gcd(n, q.target.hop) < n / 2, `${label}: the goal picture is a star or polygon, not a set of lines`);
    }
    for (const list of [p.solution.hops, p.solution.rings]) if (list) assert.ok(list.length, `${label}: an answer exists`);

    // Every hop on every offered ring: it finishes exactly when it reaches the goal.
    const rings = q.mode === 'rings' || q.mode === 'match' ? q.choices : [n];
    let finishing = 0;
    for (const m of rings) {
      const hops = q.mode === 'draw' || q.mode === 'rings' ? [q.hop % m].filter(Boolean) : range(1, m - 1);
      for (const k of hops) {
        let a = q.mode === 'rings' || q.mode === 'match' ? move(p, fresh, {type: 'ring', ring: m}) : fresh;
        const taps = drawing(m, k);
        for (let i = 0; i < taps.length; i++) {
          const before = isSolved(p, a.board);
          assert.ok(!before, `${label}: not solved before the last tap (ring ${m}, hop ${k})`);
          a = move(p, a, {type: 'tap', dot: taps[i]});
          assert.ok(a, `${label}: ring ${m}, hop ${k}, tap ${i} is legal`);
        }
        const goal = q.mode === 'draw' ? true : q.mode === 'match' ? m === n && (k === q.target.hop || k === m - q.target.hop) : gcd(m, k) === q.starts;
        assert.equal(isSolved(p, a.board), goal, `${label}: ring ${m}, hop ${k} solves exactly when it reaches the goal`);
        if (goal) finishing++;
        else assert.equal(move(p, a, {type: 'tap', dot: 0}), null, `${label}: a finished drawing takes no more taps`);
      }
    }
    assert.ok(finishing >= 1, `${label}: some drawing solves`);

    // Hints alone finish from a fresh board, and from a wrong ring or hop.
    const starts = [fresh];
    if (q.mode === 'starts') starts.push(tapAll(p, fresh, [0, 1, 2]));
    if (q.mode === 'rings') starts.push(tapAll(p, move(p, fresh, {type: 'ring', ring: q.choices.find(m => gcd(m, q.hop) !== q.starts)}), [0]));
    if (q.mode === 'match') starts.push(tapAll(p, move(p, fresh, {type: 'ring', ring: n}), [0, 1, 2]), move(p, fresh, {type: 'ring', ring: q.choices.find(m => m !== n)}));
    for (const start of starts) {
      assert.ok(start, `${label}: hint start is legal`);
      let a = start;
      for (let step = 0; step < 120 && !isSolved(p, a.board); step++) {
        const h = nextHint(p, a);
        assert.equal(h.type, 'move', `${label}: hints keep naming a move`);
        assert.ok(h.text, `${label}: hint text`);
        a = move(p, a, h.action);
        assert.ok(a, `${label}: the hinted move is legal`);
        hintTaps++;
      }
      assert.ok(isSolved(p, a.board), `${label}: hints finish the drawing`);
      assert.equal(nextHint(p, a).type, 'done');
    }

    // Illegal taps and moves.
    const ring = q.mode === 'rings' || q.mode === 'match' ? move(p, fresh, {type: 'ring', ring: n ?? q.choices[0]}) : fresh;
    const m = ring.board.ring ?? n, hop = q.hop ?? 1;
    const one = move(p, ring, {type: 'tap', dot: 0});
    assert.ok(one && one.board.taps.length === 1);
    if (q.hop) assert.equal(move(p, one, {type: 'tap', dot: (hop + 1) % m}), null, `${label}: only the hop's dot`);
    assert.equal(move(p, one, {type: 'tap', dot: 0}), null, `${label}: no hop of 0`);
    for (const dot of [-1, m, 1.5, '1x', null]) assert.equal(move(p, ring, {type: 'tap', dot}), null, `${label}: rejects dot ${dot}`);
    assert.equal(move(p, fresh, {type: 'again'}), null, `${label}: Again needs a drawing`);
    assert.deepEqual(move(p, one, {type: 'again'}).board.taps, []);
    if (q.mode === 'draw' || q.mode === 'starts') assert.equal(move(p, fresh, {type: 'ring', ring: 7}), null, `${label}: no ring choice`);
    else {
      assert.equal(move(p, fresh, {type: 'tap', dot: 0}), null, `${label}: no tap before a ring`);
      assert.equal(move(p, fresh, {type: 'ring', ring: 99}), null, `${label}: only offered rings`);
    }
    for (const action of [{type: 'mark', value: 1}, {type: 'check'}, {type: 'shrug'}, null]) assert.equal(move(p, ring, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    // A piece must close before a new one starts, and a new start needs a dot with no line.
    const first = drawing(m, q.mode === 'starts' || q.mode === 'match' ? (p.solution.hops?.[0] ?? 1) : hop % m);
    const closed = tapAll(p, ring, first.slice(0, first.findIndex((d, i) => i > 0 && d === first[0]) + 1));
    if (closed && !isSolved(p, closed.board)) assert.equal(move(p, closed, {type: 'tap', dot: first[1]}), null, `${label}: a new start needs a dot with no line`);
    assert.deepEqual(undo(one).board, ring.board, `${label}: Undo takes back a tap`);
    for (const forged of [{...one.board, taps: [0, 0]}, {...one.board, taps: [m + 1]}, {...one.board, taps: 'x'}, {...one.board, taps: Array(201).fill(0)}, {...one.board, ring: 99}, {round: 0, marked: [], checked: false}]) {
      assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${JSON.stringify(forged).slice(0, 60)}`);
    }
  }
  return {puzzles: stars.puzzles.length, drawings, rounds, hintTaps};
}
const tapAll2 = (p, a, values) => values.reduce((x, value) => x && move(p, x, {type: 'mark', value}), a);

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateStars(), null, 2));
