// Checks the Three decks pack (dist/families/decks/decks.json): content
// fields and sources; every puzzle's answer against a separate enumeration (a
// deal as a deck letter for each card, every pair of cards compared); the
// theorems the notes rely on (A 2 4 9, B 1 6 8, C 3 5 7 make a cycle of 5,
// 5 and 5 with equal totals; 15 of the 1,680 deals of 1–9 make the cycle,
// each with a weakest win of exactly 5; two wins of 6 in one cycle turned
// round, three never; with 9, 8 and 7 pinned, three cycles of 90 deals and
// none the other way; 1 4 against 2 3 the only ties of four cards; two decks
// of three from 1–6 never tie; two-card decks from 1–6 never cycle, the deck
// holding 1 winning at most 2 of 4; the swaps and the missing card; puzzle
// 9's nearest cycles); hint chains to a solve from the start, from every
// deal, card, swap, marking or answer a child can reach, and from random
// walks with Undo; Keep and Can't checked; illegal moves; forged saves; and
// the playground.
// Run: node scripts/validate-decks.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// A separate enumeration. A deal is a deck letter for each card; decks are
// read off in card order. Every ordered pair of one card from each deck counts.
const score = (X, Y) => { let w = 0; for (const x of X) for (const y of Y) if (x > y) w++; return w; };
const over = (X, Y) => score(X, Y) * 2 > X.length * Y.length;
const big = (X, Y) => score(X, Y) * 3 >= X.length * Y.length * 2;
function enumerate(cards, decks, size, pins = []) {
  const out = [];
  const total = decks ** cards.length;
  for (let m = 0; m < total; m++) {
    const letter = cards.map((_, i) => Math.floor(m / decks ** i) % decks);
    const d = Array.from({length: decks}, (_, k) => cards.filter((_, i) => letter[i] === k));
    if (d.every(x => x.length === size) && pins.every((ps, k) => ps.every(v => d[k].includes(v)))) out.push(d);
  }
  return out;
}
const key = d => d.map(x => [...x].sort((a, b) => a - b).join('-')).join('|');
const cycle = d => over(d[0], d[1]) && over(d[1], d[2]) && over(d[2], d[0]);
const backwards = d => over(d[1], d[0]) && over(d[2], d[1]) && over(d[0], d[2]);
const bigCount = d => [big(d[0], d[1]), big(d[1], d[2]), big(d[2], d[0])].filter(Boolean).length;
const WORKS = {beat: d => over(d[0], d[1]), beatBA: d => over(d[1], d[0]), tie: d => score(d[0], d[1]) === score(d[1], d[0]), cycle, big2: d => cycle(d) && bigCount(d) >= 2, big3: d => cycle(d) && bigCount(d) === 3};
const ONE_TO = n => Array.from({length: n}, (_, i) => i + 1);
const sorted = list => [...list].sort();
const dealsFor = q => enumerate([...q.decks.flat()].sort((a, b) => a - b), q.decks.length, q.decks[0].length, q.pins);
const swapOne = (q, a, b) => [q.decks[0].map(v => v === a ? b : v), q.decks[1].map(v => v === b ? a : v), ...q.decks.slice(2)];

function theorems() {
  const P1 = [[2, 4, 9], [1, 6, 8], [3, 5, 7]];
  assert.deepEqual([score(P1[0], P1[1]), score(P1[1], P1[2]), score(P1[2], P1[0])], [5, 5, 5], 'A beats B, B beats C, C beats A, each 5 to 4');
  assert.ok(P1.every(x => x.reduce((s, v) => s + v, 0) === 15), 'every deck totals 15');
  const all = enumerate(ONE_TO(9), 3, 3);
  assert.equal(all.length, 1680);
  const cycles = all.filter(cycle);
  assert.equal(cycles.length, 15); assert.equal(all.filter(backwards).length, 15);
  for (const d of cycles) assert.equal(Math.min(score(d[0], d[1]), score(d[1], d[2]), score(d[2], d[0])), 5, `${key(d)}: weakest win 5`);
  assert.deepEqual(sorted(all.filter(WORKS.big2).map(key)), ['1-7-8|4-5-6|2-3-9', '2-3-9|1-7-8|4-5-6', '4-5-6|2-3-9|1-7-8'], 'two big wins: one cycle, turned round');
  assert.equal(all.filter(d => big(d[0], d[1]) && big(d[1], d[2]) && big(d[2], d[0])).length, 0, 'three big wins never');
  assert.deepEqual(cycles.map(bigCount).sort().join(''), '000000111111222', 'cycles by big wins: 6, 6 and 3');
  const pinned = enumerate(ONE_TO(9), 3, 3, [[9], [8], [7]]);
  assert.equal(pinned.length, 90);
  assert.deepEqual(sorted(pinned.filter(cycle).map(key)), ['1-5-9|3-4-8|2-6-7', '2-3-9|1-6-8|4-5-7', '2-4-9|1-6-8|3-5-7']);
  assert.equal(pinned.filter(backwards).length, 0, 'with 9, 8 and 7 pinned, never the other way');
  assert.equal(pinned.filter(d => over(d[1], d[0])).length, 30, 'though B beats A in 30');
  // The guide's certificate: with the maxima pinned, each win reduces to the small cards.
  for (const d of pinned) {
    const small = x => x.filter(v => v < 7);
    assert.equal(over(d[0], d[1]), score(small(d[0]), small(d[1])) >= 2);
    assert.equal(over(d[1], d[2]), score(small(d[1]), small(d[2])) >= 2);
    assert.equal(over(d[2], d[0]), score(small(d[2]), small(d[0])) >= 3);
  }
  const splits = enumerate(ONE_TO(6), 2, 3);
  assert.equal(splits.length, 20); assert.ok(splits.every(d => score(d[0], d[1]) !== score(d[1], d[0])), 'two decks of three never tie');
  assert.deepEqual([...new Set(splits.filter(d => d[0].includes(1)).map(d => Math.max(score(d[0], d[1]), score(d[1], d[0]))))].sort(), [5, 6, 7, 8, 9]);
  // Puzzle 4: two of the six splits of 1–4 tie, the deck holding 1 always holding 4; only A 2 4 wins 3.
  const four = enumerate(ONE_TO(4), 2, 2);
  assert.deepEqual(sorted(four.filter(WORKS.tie).map(key)), ['1-4|2-3', '2-3|1-4']);
  assert.deepEqual(four.filter(d => score(d[0], d[1]) === 3).map(key), ['2-4|1-3']);
  assert.deepEqual([score([1, 4, 6, 7], [2, 3, 5, 8]), score([2, 3, 5, 8], [1, 4, 6, 7])], [8, 8], 'four cards each can tie');
  const pairs = enumerate(ONE_TO(6), 3, 2);
  assert.equal(pairs.length, 90); assert.ok(!pairs.some(d => cycle(d) || backwards(d)), 'two-card decks never cycle');
  for (const d of pairs) { const i = d.findIndex(x => x.includes(1)); for (let j = 0; j < 3; j++) if (j !== i) assert.ok(score(d[i], d[j]) <= 2, 'the deck holding 1 wins at most 2 of 4'); }
  // The swaps (K–1 P6) and the missing card (2–3 P4).
  const swaps = P1[0].flatMap(a => P1[1].map(b => [a, b])).filter(([a, b]) => over(P1[1].map(v => v === b ? a : v), P1[0].map(v => v === a ? b : v)));
  assert.deepEqual(swaps.map(s => s.join('-')).sort(), ['2-1', '4-1', '9-1', '9-6', '9-8']);
  assert.ok(swaps.every(([a, b]) => a === 9 || b === 1), 'exactly the swaps that give B the 9 or A the 1');
  assert.deepEqual([[9, 1], [9, 6], [9, 8], [2, 1], [4, 1]].map(([a, b]) => score(P1[1].map(v => v === b ? a : v), P1[0].map(v => v === a ? b : v))), [9, 6, 5, 5, 6], 'B’s wins after each');
  for (let x = 0; x <= 12; x++) if (![1, 3, 5, 6, 7, 8].includes(x)) assert.equal(cycle([[2, x, 9], P1[1], P1[2]]), x > 1 && x < 5, `missing card ${x}`);
  // Puzzles 9 and 11: two swaps, not one. Puzzle 9's nearest cycles have one
  // big win each, so it doesn't hand over puzzle 11's answer.
  const swapsFrom = d => d.flatMap((x, i) => d.flatMap((y, j) => j <= i ? [] : x.flatMap(a => y.map(b => d.map((z, k) => k === i ? z.map(v => v === a ? b : v) : k === j ? z.map(v => v === b ? a : v) : z)))));
  const start9 = [[3, 6, 9], [2, 5, 8], [1, 4, 7]];
  assert.ok(!cycle(start9) && !swapsFrom(start9).some(cycle), 'no cycle within one swap of A 3 6 9, B 2 5 8, C 1 4 7');
  const near = [...new Set(swapsFrom(start9).flatMap(swapsFrom).filter(cycle).map(key))].sort();
  assert.deepEqual(near, ['2-3-9|1-6-8|4-5-7', '3-5-6|2-4-9|1-7-8'], 'two cycles two swaps away');
  assert.ok(near.every(k => bigCount(k.split('|').map(x => x.split('-').map(Number))) === 1), 'each with one big win');
  assert.ok(cycle([[2, 3, 9], [1, 6, 8], [4, 5, 7]]), '1 with 5, then 2 with 6');
  assert.ok(!swapsFrom(P1).some(WORKS.big2) && WORKS.big2([[2, 3, 9], [1, 7, 8], [4, 5, 6]]), 'two big wins: two swaps from puzzle 1’s decks');
  assert.deepEqual([score([2, 3, 9], [1, 7, 8]), score([1, 7, 8], [4, 5, 6]), score([4, 5, 6], [2, 3, 9])], [5, 6, 6]);
  return {deals: all.length, cycles: cycles.length};
}

// The answers each puzzle asks for, by the enumeration.
function answer(q) {
  if (q.mode === 'pairs') return [over(q.decks[0], q.decks[1]) ? '0' : '1'];
  if (q.mode === 'menu') return q.menu.filter(v => WORKS[q.goal](q.decks.map(x => x.map(c => c ?? v)))).map(String);
  if (q.mode === 'swaps') return q.decks[0].flatMap(a => q.decks[1].map(b => [a, b])).filter(([a, b]) => WORKS[q.goal](swapOne(q, a, b))).map(s => s.join('-'));
  return dealsFor(q).filter(WORKS[q.goal]).map(key);
}
const expected = {
  'decks-01': ['0'], 'decks-02': ['0'], 'decks-03': ['0'], 'decks-04': ['1-4|2-3', '2-3|1-4'], 'decks-05': ['2-1', '4-1', '9-1', '9-6', '9-8'], 'decks-06': ['2', '4'],
  'decks-07': [], 'decks-08': ['1-5-9|3-4-8|2-6-7', '2-3-9|1-6-8|4-5-7', '2-4-9|1-6-8|3-5-7'], 'decks-10': [], 'decks-11': ['1-7-8|4-5-6|2-3-9', '2-3-9|1-7-8|4-5-6', '4-5-6|2-3-9|1-7-8'], 'decks-12': []
};

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
const at = (start, board) => ({...start, board: {...start.board, ...board}});
// A random walk of legal moves, with Undo now and then; hints solve from every board on the way.
function walk(p, start, actions, label, steps = 40) {
  let a = start, seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < steps && !isSolved(p, a.board); i++) {
    if (a.moves && random() < 0.15) a = undo(a);
    else { const next = move(p, a, actions[Math.floor(random() * actions.length)]); if (next) a = next; }
    assert.ok(validBoard(p, a.board), `${label}: a walk stays valid`);
    if (!isSolved(p, a.board)) hintsSolve(p, a, `${label} walk ${i}`);
  }
}
const subsets = list => Array.from({length: 2 ** list.length}, (_, m) => list.filter((_, i) => m >> i & 1));
const OTHER = [{type: 'mark', cell: 0, side: 0}, {type: 'choose', deck: 0}, {type: 'best', deck: null}, {type: 'best', deck: 0}, {type: 'pick', value: 3}, {type: 'swap', a: 2, b: 1}, {type: 'again'}, {type: 'keep'}, {type: 'claim'}, {type: 'cant'}, {type: 'random'}, {type: 'match', match: 1}];

export async function validateDecks() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const pack = await read('../dist/families/decks/decks.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  const family = pack.families[0];
  assert.equal(family.id, 'decks'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = pack.puzzles.filter(p => p.band === 'all'), playgrounds = pack.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, pack.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'decks'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
    assert.ok(p.id === 'decks-playground' || p.id === `decks-${String(p.number).padStart(2, '0')}`, `${p.id}: id`);
    for (const k of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id} ${k}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const k of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[k]?.trim(), `${p.id} parent.${k}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
  }
  const facts = theorems();
  // Can't is offered on possible and impossible deals alike, so it is no free guess.
  // The first Can't has an answer.
  const deals = core.filter(p => p.parameters.mode === 'deal');
  assert.ok(deals.some(p => answer(p.parameters).length) && deals.some(p => !answer(p.parameters).length));
  assert.ok(answer(deals[0].parameters).length, 'the first puzzle with Can’t has an answer');

  let hintSteps = 0;
  const answers = {};
  for (const p of core) {
    const q = p.parameters, want = answer(q);
    if (expected[p.id]) assert.deepEqual(sorted(want), expected[p.id], `${p.id}: the notes' answer`);
    if (p.id === 'decks-09') assert.equal(want.length, 15);
    answers[p.id] = want.length;

    const start = freshAttempt(p), f = start.board;
    assert.ok(validBoard(p, start.board) && !isSolved(p, start.board), `${p.id}: valid unsolved start`);
    const [a, steps] = hintsSolve(p, start, p.id);
    hintSteps += steps;
    for (const bad of OTHER) assert.equal(move(p, a, bad), null, `${p.id}: no ${bad.type} after a solve`);
    for (const bad of [null, 'swap', {type: 'random'}, {type: 'match', match: 1}, {type: 'toss'}]) assert.equal(move(p, start, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);

    if (q.mode === 'pairs') {
      const [X, Y] = q.decks, cells = X.flatMap(x => Y.map(y => [x, y])), side = k => cells[k][0] > cells[k][1] ? 0 : 1;
      assert.equal(a.board.chosen, Number(want[0]));
      // Hints from every marking, with a wrong choice or not.
      for (const marked of subsets(cells.map((_, k) => k))) for (const missed of marked.length === 9 ? [false, true] : [false]) hintsSolve(p, at(start, {marked, missed}), `${p.id} from ${marked}`);
      const all9 = cells.map((_, k) => k), right = Number(want[0]);
      if (q.loop) {
        // Does any deck beat both others? None: every deck named is answered, No solves.
        assert.ok(cycle(q.loop) && q.loop.every((_, i) => !q.loop.every((y, j) => j === i || over(q.loop[i], y))), `${p.id}: no deck beats both others`);
        const chosen = at(start, {marked: all9, chosen: right});
        assert.ok(validBoard(p, chosen.board) && !isSolved(p, chosen.board), `${p.id}: the question waits after the choice`);
        for (const guess of [null, 0, 1, 2]) hintsSolve(p, at(start, {marked: all9, chosen: right, guess}), `${p.id} after ${guess}`);
        assert.equal(move(p, at(start, {marked: all9}), {type: 'best', deck: null}), null, `${p.id}: no answer before the choice`);
        const named = move(p, chosen, {type: 'best', deck: 0});
        assert.ok(named.board.guess === 0 && !isSolved(p, named.board));
        assert.equal(move(p, named, {type: 'best', deck: 0}), null, `${p.id}: not the same deck twice`);
        assert.equal(move(p, named, {type: 'best', deck: 1}).board.guess, 1);
        for (const bad of [{type: 'best', deck: 3}, {type: 'best', deck: '0'}, {type: 'best'}, {type: 'choose', deck: right}]) assert.equal(move(p, chosen, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
        const no = move(p, named, {type: 'best', deck: null});
        assert.ok(isSolved(p, no.board) && no.board.guess === null);
        assert.deepEqual(undo(no).board, named.board, `${p.id}: Undo`);
        for (const board of [{...f, best: true}, {...f, guess: 0}, {...chosen.board, best: true, guess: 1}, {...chosen.board, guess: 3}, {...chosen.board, best: 'yes'}, {marked: all9, chosen: right, missed: false}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      } else assert.equal(move(p, at(start, {marked: all9, chosen: right}), {type: 'best', deck: null}), null, `${p.id}: no question`);
      for (let k = 0; k < 9; k++) {
        assert.equal(move(p, start, {type: 'mark', cell: k, side: 1 - side(k)}), null, `${p.id}: the smaller card is not the winner`);
        assert.deepEqual(move(p, start, {type: 'mark', cell: k, side: side(k)}).board.marked, [k]);
      }
      for (const bad of [{type: 'mark', cell: 9, side: 0}, {type: 'mark', cell: '0', side: side(0)}, {type: 'mark', cell: 0}, {type: 'choose', deck: Number(want[0])}, {type: 'pick', value: 3}, {type: 'swap', a: X[0], b: Y[0]}, {type: 'keep'}, {type: 'claim'}, {type: 'cant'}]) assert.equal(move(p, start, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      const once = move(p, start, {type: 'mark', cell: 0, side: side(0)});
      assert.equal(move(p, once, {type: 'mark', cell: 0, side: side(0)}), null, `${p.id}: marked once`);
      const full = at(start, {marked: [0, 1, 2, 3, 4, 5, 6, 7, 8]}), lose = 1 - Number(want[0]);
      const wrong = move(p, full, {type: 'choose', deck: lose});
      assert.ok(wrong.board.missed && !isSolved(p, wrong.board), `${p.id}: the wrong deck says count again`);
      assert.equal(move(p, wrong, {type: 'choose', deck: lose}), null, `${p.id}: not the same wrong deck twice`);
      const fixed = move(p, wrong, {type: 'choose', deck: Number(want[0])}).board;
      assert.ok(fixed.chosen === Number(want[0]) && !fixed.missed && isSolved(p, fixed) === !q.loop);
      assert.equal(move(p, full, {type: 'choose', deck: 2}), null);
      assert.deepEqual(undo(once).board, f, `${p.id}: Undo`);
      const forged = [null, {...f, marked: [1, 0]}, {...f, marked: [0, 0]}, {...f, marked: [9]}, {...f, chosen: Number(want[0])}, {...f, marked: full.board.marked, chosen: lose}, {...f, missed: true}, {...f, marked: full.board.marked, chosen: Number(want[0]), missed: true}, {...f, extra: 1}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {...f, marked: full.board.marked, missed: true}));
      continue;
    }

    if (q.mode === 'menu') {
      assert.deepEqual(sorted(a.board.kept), sorted(want), `${p.id}: every card kept once`);
      for (const kept of subsets(want)) for (const value of [null, ...q.menu]) for (const missed of kept.length && kept.length < want.length ? [false, true] : [false]) for (const wrong of value !== null && !want.includes(String(value)) ? [false, true] : [false]) {
        if (kept.length === want.length && !missed) { assert.ok(validBoard(p, {...f, value, kept, wrong})); hintsSolve(p, at(start, {value, kept, wrong}), `${p.id} all kept`); continue; }
        hintsSolve(p, at(start, {value, kept, missed, wrong}), `${p.id} from ${value} with ${kept}`);
      }
      walk(p, start, [...q.menu.map(value => ({type: 'pick', value})), {type: 'keep'}, {type: 'keep'}, {type: 'claim'}], p.id, 80);
      assert.equal(move(p, start, {type: 'keep'}), null, `${p.id}: nothing to keep before a card is tried`);
      const bad = q.menu.find(v => !want.includes(String(v))), good = Number(want[0]);
      const refused = move(p, move(p, start, {type: 'pick', value: bad}), {type: 'keep'});
      assert.ok(refused.board.wrong && !refused.board.kept.length, `${p.id}: Keep refuses ${bad}`);
      assert.equal(move(p, refused, {type: 'keep'}), null, `${p.id}: not twice`);
      const kept = move(p, move(p, refused, {type: 'pick', value: good}), {type: 'keep'});
      assert.deepEqual(kept.board.kept, [String(good)]); assert.equal(kept.board.wrong, false);
      assert.equal(move(p, kept, {type: 'keep'}), null, `${p.id}: kept once`);
      assert.equal(move(p, kept, {type: 'pick', value: good}), null, `${p.id}: the card already there`);
      if (want.length > 1) { const early = move(p, kept, {type: 'claim'}); assert.ok(early.board.missed && !isSolved(p, early.board)); assert.equal(move(p, early, {type: 'claim'}), null); }
      for (const x of [{type: 'pick', value: 6}, {type: 'pick', value: '9'}, {type: 'pick'}, {type: 'claim'}, {type: 'mark', cell: 0, side: 0}, {type: 'swap', a: 2, b: 1}, {type: 'cant'}]) assert.equal(move(p, start, x), null, `${p.id}: rejects ${JSON.stringify(x)}`);
      const forged = [null, {...f, value: 6}, {...f, kept: [String(bad)]}, {...f, kept: [String(good), String(good)]}, {...f, claimed: true}, {...f, wrong: true}, {...f, value: good, wrong: true}, {...f, extra: 1}, {value: null, kept: [], claimed: false, missed: false}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {...f, kept: want, claimed: true}), `${p.id}: a real solve is a valid save`);
      continue;
    }

    if (q.mode === 'swaps') {
      assert.deepEqual(sorted(a.board.kept), sorted(want), `${p.id}: every swap kept once`);
      const every = q.decks[0].flatMap(x => q.decks[1].map(y => [x, y]));
      for (const kept of subsets(want)) for (const swap of [null, ...every]) for (const missed of kept.length && kept.length < want.length ? [false, true] : [false]) for (const wrong of swap && !want.includes(swap.join('-')) ? [false, true] : [false]) {
        if (kept.length === want.length && !missed) continue;
        hintsSolve(p, at(start, {swap, kept, missed, wrong}), `${p.id} from ${swap} with ${kept}`);
      }
      walk(p, start, [...every.map(([x, y]) => ({type: 'swap', a: x, b: y})), {type: 'again'}, {type: 'keep'}, {type: 'keep'}, {type: 'claim'}], p.id, 80);
      const one = move(p, start, {type: 'swap', a: 1, b: 2});
      assert.deepEqual(one.board.swap, [2, 1], `${p.id}: a B card tapped first swaps the same way`);
      assert.equal(move(p, one, {type: 'swap', a: 4, b: 6}), null, `${p.id}: one swap at a time`);
      const keptOne = move(p, one, {type: 'keep'});
      assert.deepEqual([keptOne.board.kept, keptOne.board.swap], [['2-1'], null], `${p.id}: Keep puts the swap away and swaps back`);
      assert.equal(move(p, move(p, keptOne, {type: 'swap', a: 2, b: 1}), {type: 'keep'}), null, `${p.id}: kept once`);
      const no = move(p, move(p, start, {type: 'swap', a: 4, b: 8}), {type: 'keep'});
      assert.ok(no.board.wrong && no.board.swap, `${p.id}: Keep refuses a swap that doesn’t work and leaves it showing`);
      assert.equal(move(p, no, {type: 'keep'}), null);
      assert.deepEqual(move(p, no, {type: 'again'}).board.swap, null);
      assert.equal(move(p, start, {type: 'again'}), null, `${p.id}: nothing to swap back`);
      assert.deepEqual(undo(keptOne).board, one.board, `${p.id}: Undo takes a Keep back`);
      for (const x of [{type: 'swap', a: 2, b: 4}, {type: 'swap', a: 2, b: 3}, {type: 'swap', a: 2}, {type: 'swap', a: '2', b: 1}, {type: 'keep'}, {type: 'claim'}, {type: 'pick', value: 3}, {type: 'cant'}]) assert.equal(move(p, start, x), null, `${p.id}: rejects ${JSON.stringify(x)}`);
      const forged = [null, {...f, swap: [1, 2]}, {...f, swap: [2, 4]}, {...f, swap: [2]}, {...f, kept: ['4-8']}, {...f, wrong: true}, {...f, swap: [2, 1], wrong: true}, {...f, claimed: true}, {...f, extra: 1}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {...f, kept: want, claimed: true}));
      continue;
    }

    const universe = dealsFor(q), cards = [...q.decks.flat()];
    const pinnedCard = cards.find(v => (q.pins || []).some(ps => ps.includes(v)));
    const free = cards.filter(v => v !== pinnedCard && !(q.pins || []).some(ps => ps.includes(v)));
    const swapActions = free.flatMap(x => free.filter(y => y > x).map(y => ({type: 'swap', a: x, b: y})));
    if (q.mode === 'deal') {
      if (want.length) assert.ok(want.includes(key(a.board.decks)), `${p.id}: solved with a deal that works`);
      else assert.ok(a.board.cant, `${p.id}: solved by Can’t`);
      // Hints from every deal, with Can't pressed or not.
      for (const d of universe) for (const cant of [false, true]) {
        const there = at(start, {decks: d, cant});
        assert.ok(validBoard(p, there.board), `${p.id}: ${key(d)} is a valid deal`);
        assert.equal(isSolved(p, there.board), WORKS[q.goal](d) || (cant && !want.length), `${p.id}: ${key(d)} solved exactly when it works`);
        if (!isSolved(p, there.board)) hintsSolve(p, there, `${p.id} from ${key(d)}${cant ? ', Can’t' : ''}`);
      }
      walk(p, start, [...swapActions, {type: 'cant'}], p.id, 60);
      const cant = move(p, start, {type: 'cant'});
      assert.equal(isSolved(p, cant.board), want.length === 0, `${p.id}: Can’t is ${want.length ? 'refused' : 'right'}`);
      if (want.length) {
        assert.equal(move(p, cant, {type: 'cant'}), null, `${p.id}: Can’t once until the decks change`);
        const changed = swapActions.map(x => move(p, cant, x)).find(x => x && !isSolved(p, x.board));
        assert.equal(changed.board.cant, false, `${p.id}: a swap clears the refusal`);
      }
      for (const x of [{type: 'swap', a: q.decks[0][0], b: q.decks[0][1]}, {type: 'swap', a: 1, b: 99}, {type: 'swap', a: 1}, {type: 'keep'}, {type: 'claim'}, {type: 'pick', value: 3}, {type: 'mark', cell: 0, side: 0}]) assert.equal(move(p, start, x), null, `${p.id}: rejects ${JSON.stringify(x)}`);
      const forged = [null, {...f, decks: [[1, 2, 3]]}, {...f, decks: q.decks.map(x => [...x].reverse())}, {...f, decks: q.decks.map((x, i) => i ? x : [...x.slice(1), x[0] + 10])}, {...f, cant: 'yes'}, {...f, extra: 1}, {decks: f.decks}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      continue;
    }

    // Every deal (puzzle 8): the pins never move.
    assert.deepEqual(sorted(a.board.kept), sorted(want), `${p.id}: every deal kept once`);
    for (const n of [0, 1, 2]) for (const d of universe) {
      const shelf = want.slice(0, n);
      for (const missed of n ? [false, true] : [false]) {
        hintsSolve(p, at(start, {decks: d, kept: shelf, missed}), `${p.id} from ${key(d)} with ${n} kept`);
        if (!WORKS[q.goal](d)) hintsSolve(p, at(start, {decks: d, kept: shelf, missed, wrong: true}), `${p.id} from ${key(d)}, refused`);
      }
    }
    walk(p, start, [...swapActions, {type: 'keep'}, {type: 'keep'}, {type: 'claim'}], p.id, 120);
    for (const v of [9, 8, 7]) for (const w of free) assert.equal(move(p, start, {type: 'swap', a: v, b: w}), null, `${p.id}: ${v} stays put`);
    const wrong = move(p, start, {type: 'keep'});
    assert.ok(wrong.board.wrong && !wrong.board.kept.length, `${p.id}: the starting deal is refused`);
    assert.equal(move(p, wrong, {type: 'keep'}), null);
    assert.equal(move(p, wrong, {type: 'swap', a: 1, b: 3}).board.wrong, false, `${p.id}: a swap clears the note`);
    const first = at(start, {decks: [[2, 4, 9], [1, 6, 8], [3, 5, 7]]}), kept = move(p, first, {type: 'keep'});
    assert.deepEqual(kept.board.kept, ['2-4-9|1-6-8|3-5-7']);
    assert.equal(move(p, kept, {type: 'keep'}), null, `${p.id}: kept once`);
    const early = move(p, kept, {type: 'claim'});
    assert.ok(early.board.missed && !isSolved(p, early.board)); assert.equal(move(p, early, {type: 'claim'}), null);
    assert.deepEqual(undo(kept).board, first.board, `${p.id}: Undo takes a Keep back`);
    const forged = [null, {...f, decks: [[1, 2, 8], [3, 4, 9], [5, 6, 7]]}, {...f, kept: [key(f.decks)]}, {...f, kept: ['2-4-9|1-6-8|3-5-7', '2-4-9|1-6-8|3-5-7']}, {...f, claimed: true}, {...f, decks: [[2, 4, 9], [1, 6, 8], [3, 5, 7]], wrong: true}, {...f, extra: 1}];
    for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
    assert.ok(validBoard(p, {...f, kept: want, claimed: true}));
  }

  // Playground: free swaps, a match of two decks, random rounds piled by the
  // winner, cleared when the decks or the match change; never solved.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.ok(validBoard(pg, a.board) && !isSolved(pg, a.board));
  assert.deepEqual(a.board, {decks: [[2, 4, 9], [1, 6, 8], [3, 5, 7]], match: 0, rounds: []});
  a = move(pg, a, {type: 'random'}, () => 0.99);
  assert.deepEqual(a.board.rounds, [[9, 8]]);
  a = move(pg, a, {type: 'random', n: 10}, () => 0);
  assert.equal(a.board.rounds.length, 11); assert.ok(a.board.rounds.slice(1).every(r => r[0] === 2 && r[1] === 1));
  assert.deepEqual(move(pg, a, {type: 'match', match: 2}).board, {...a.board, match: 2, rounds: []}, 'a new match clears the rounds');
  assert.deepEqual(move(pg, move(pg, a, {type: 'match', match: 2}), {type: 'random'}, () => 0).board.rounds, [[3, 2]], 'C against A draws C’s card first');
  assert.deepEqual(move(pg, a, {type: 'swap', a: 2, b: 1}).board, {decks: [[1, 4, 9], [2, 6, 8], [3, 5, 7]], match: 0, rounds: []}, 'a swap clears the rounds');
  assert.equal(move(pg, a, {type: 'match', match: 0}), null);
  let full = a;
  while (full.board.rounds.length + 10 <= 60) full = move(pg, full, {type: 'random', n: 10});
  assert.equal(move(pg, full, {type: 'random', n: 10}), null, 'at most 60 rounds');
  assert.equal(move(pg, move(pg, a, {type: 'clear'}), {type: 'clear'}), null);
  for (const bad of [{type: 'random', n: 5}, {type: 'match', match: 3}, {type: 'swap', a: 2, b: 4}, {type: 'swap', a: 2, b: 10}, {type: 'keep'}, {type: 'claim'}, {type: 'cant'}]) assert.equal(move(pg, a, bad), null, `playground rejects ${JSON.stringify(bad)}`);
  for (const board of [{...a.board, match: 3}, {...a.board, rounds: [[1, 2]]}, {...a.board, rounds: [[2, 3]]}, {...a.board, rounds: Array(61).fill([2, 1])}, {...a.board, decks: [[1, 2, 3], [4, 5, 6], [7, 8, 10]]}, {...a.board, extra: 1}]) assert.equal(validBoard(pg, board), false, `playground rejects ${JSON.stringify(board)}`);
  assert.equal(nextHint(pg, a).type, 'done');
  return {decksPuzzles: core.length, playground: 1, sources: pack.sources.length, answers, hintSteps, deals: facts.deals, cycles: facts.cycles};
}
export default validateDecks;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateDecks(), null, 2));
