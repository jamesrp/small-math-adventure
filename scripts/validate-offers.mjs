// Checks the Take it or pass pack (dist/families/offers/offers.json): content
// fields and sources; every puzzle's answer against a separate simulation (a
// card as a number counted in base 3, a plan as a table of decisions played
// offer by offer, every plan tried); the theorems the notes rely on (the best
// averages by backward induction in exact fractions: 10/3, 40/9 and 134/27 for
// 0, 4, 6; 143/27 and 448/81 for 0, 5, 6, with four offers simulated on all 81
// cards; plans A and B at 130 and 134; the ties of 0, 3, 6; the tickets that tie
// beside 1 and 9 and the one that flips beside 0 and 6; one more offer never
// lowering the best average and a bag of equal tickets not raising it); that
// a claim or Keep is refused exactly when another plan scores more, and Keep
// in the bag puzzles only with a best plan on the switches; hint chains to a
// solve from the start, from every plan of two offers and every seventh of
// three, from shelves, cards and tickets a child can reach, and from random
// walks with Undo; illegal moves; forged saves; and the playground.
// Run: node scripts/validate-offers.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';
import {offerMechanics} from '../dist/families/offers/offers.js';

// A separate simulation. Cards: the numbers 0 … 3^n − 1 in base 3, a digit per offer.
const cardsFor = (bag, n) => Array.from({length: 3 ** n}, (_, m) => Array.from({length: n}, (_, k) => bag[Math.floor(m / 3 ** (n - 1 - k)) % 3]));
// A plan: take(k, offers so far) says whether to take offer k; the last is always taken.
function play(card, take) {
  for (let k = 0; k < card.length - 1; k++) if (take(k, card.slice(0, k + 1))) return card[k];
  return card.at(-1);
}
const scoreAll = (bag, n, take) => cardsFor(bag, n).reduce((s, card) => s + play(card, take), 0);
// A plan read from the pack's switches as a table: first[x], and second[x][y] after a passed first x.
const planString = (n, m) => Array.from({length: n === 2 ? 3 : 12}, (_, k) => m >> k & 1 ? 'P' : 'T').join('');
const allPlans = n => Array.from({length: 2 ** (n === 2 ? 3 : 12)}, (_, m) => planString(n, m));
function tableFor(bag, plan) {
  const first = Object.fromEntries(bag.map((x, i) => [x, plan[i] === 'T']));
  const second = Object.fromEntries(bag.map((x, i) => [x, Object.fromEntries(bag.map((y, j) => [y, plan[3 + 3 * i + j] === 'T']))]));
  return {first, second, take: (k, seen) => k === 0 ? first[seen[0]] : second[seen[0]][seen[1]]};
}
const tables = (bag, n) => allPlans(n).map(plan => tableFor(bag, plan));
// The key the pack uses: T or P per switch, '-' where a switch can't matter.
const keyOf = (bag, n, t) => bag.map(x => t.first[x] ? 'T' : 'P').join('') + (n === 3 ? bag.map(x => bag.map(y => t.first[x] ? '-' : t.second[x][y] ? 'T' : 'P').join('')).join('') : '');
const bestPlans = (bag, n) => {
  const scored = tables(bag, n).map(t => [keyOf(bag, n, t), scoreAll(bag, n, t.take)]), most = Math.max(...scored.map(s => s[1]));
  return {most, keys: [...new Set(scored.filter(s => s[1] === most).map(s => s[0]))].sort()};
};
// Exact best averages by backward induction: V1 = mean, Vm = mean of max(x, Vm−1), as fractions [p, q].
const frac = (p, q) => { const g = (a, b) => b ? g(b, a % b) : Math.abs(a); const d = g(p, q); return [p / d, q / d]; };
function V(bag, m) {
  let v = frac(bag.reduce((s, x) => s + x, 0), bag.length);
  for (let i = 1; i < m; i++) { const [p, q] = v; v = frac(bag.reduce((s, x) => s + Math.max(x * q, p), 0), bag.length * q); }
  return v;
}
const sorted = list => [...list].sort();
const sum = list => list.reduce((s, v) => s + v, 0);

function theorems() {
  assert.deepEqual([1, 2, 3].map(m => V([0, 4, 6], m)), [[10, 3], [40, 9], [134, 27]], '0, 4, 6');
  assert.deepEqual([3, 4].map(m => V([0, 5, 6], m)), [[143, 27], [448, 81]], '0, 5, 6');
  assert.deepEqual(V([0, 3, 6], 3), [14, 3]);
  // Simulated: the best two- and three-offer totals are 3^n Vn.
  for (const bag of [[0, 4, 6], [0, 5, 6], [0, 2, 6], [0, 3, 6]]) for (const n of [2, 3]) { const [p, q] = V(bag, n); assert.equal(bestPlans(bag, n).most * q, p * 3 ** n, `${bag} with ${n}`); }
  // Four offers from 0, 5, 6, on all 81 cards: pass a first 0 or 5, take a first 6, then take 5 or 6.
  const four = (k, seen) => k === 0 ? seen[0] === 6 : seen[k] >= 5;
  assert.equal(scoreAll([0, 5, 6], 4, four), 448);
  assert.equal(scoreAll([0, 5, 6], 4, (k, seen) => seen[k] >= 5), 440, 'taking a first 5 with four offers is worse: 135 on its row, not 143');
  // Plans A and B (Problem 4).
  const A = (k, seen) => seen[k] >= 4, B = (k, seen) => k === 0 ? seen[0] === 6 : seen[k] >= 4;
  assert.deepEqual([scoreAll([0, 4, 6], 3, A), scoreAll([0, 4, 6], 3, B)], [130, 134]);
  assert.deepEqual(cardsFor([0, 4, 6], 3).filter(c => play(c, A) !== play(c, B)).map(c => c.join('-')), ['4-0-0', '4-0-6', '4-6-0', '4-6-4', '4-6-6']);
  // A first 4 with two and three offers left; a first 3 ties with two.
  assert.ok(3 * 4 > 10 && 9 * 4 < 40, 'take 4 with two left, pass it with three');
  // Beside 1 and 9: the middle ties only for 5 and 17. Beside 0 and 6: only 4 flips.
  const middle = (x, pins) => [...pins, x].sort((a, b) => a - b)[1];
  const verdict = (bag, m, x) => { const [p, q] = V(bag, m - 1); return Math.sign(x * q - p); };
  const ties = [...Array(21).keys()].filter(x => x !== 1 && x !== 9 && verdict([1, 9, x], 2, middle(x, [1, 9])) === 0);
  assert.deepEqual(ties, [5, 17]);
  assert.deepEqual([1, 2, 3, 4, 5].map(b => [verdict([0, b, 6], 2, b), verdict([0, b, 6], 3, b)]), [[-1, -1], [-1, -1], [0, -1], [1, -1], [1, 1]], '0, b, 6: two offers, then three');
  // One more offer never lowers the best average; a bag of equal tickets keeps it.
  for (const bag of [[0, 4, 6], [0, 2, 6], [0, 3, 6], [0, 5, 6], [1, 5, 9]]) for (let m = 1; m < 5; m++) { const [a, b] = V(bag, m), [c, d] = V(bag, m + 1); assert.ok(c * b > a * d, `${bag}: ${m + 1} offers beat ${m}`); }
  assert.deepEqual([1, 2, 3].map(m => V([2, 2, 2], m)), [[2, 1], [2, 1], [2, 1]]);
}

// The answers each puzzle asks for, by the simulation.
function answer(q) {
  if (q.mode === 'plan' || q.mode === 'plans') return bestPlans(q.bag, q.n).keys;
  if (q.mode === 'differ') {
    const table = ([take1, take2]) => (k, seen) => (k === 0 ? take1 : take2).includes(seen[k]);
    return cardsFor(q.bag, q.n).filter(c => play(c, table(q.plans.A)) !== play(c, table(q.plans.B))).map(c => c.join('-'));
  }
  const [lo, hi] = q.pins;
  return q.menu.filter(x => {
    const bag = [lo, hi, x].sort((a, b) => a - b), m = bag[1];
    const v = n => { const [p, r] = V(bag, n); return [p, r]; };
    if (q.goal === 'tie') { const [p, r] = v(1); return m * r === p; }
    const [p1, r1] = v(1), [p2, r2] = v(2);
    return m * r1 > p1 && m * r2 < p2;
  }).map(String);
}
const expected = {
  'offers-01': ['PTT'], 'offers-02': ['PTT'], 'offers-03': ['PPT'], 'offers-04': ['PPT', 'PTT'],
  'offers-05': ['4-0-0', '4-0-6', '4-6-0', '4-6-4', '4-6-6'], 'offers-06': ['PPTPTTPTT---'], 'offers-07': ['PTTPTT------'],
  'offers-08': ['17', '5'], 'offers-09': ['PPTPPTPPT---', 'PPTPPTPTT---', 'PPTPTTPPT---', 'PPTPTTPTT---'], 'offers-10': ['4']
};

// Follow hints from a board to a solve; every hint is a legal move.
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 60; steps++) {
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
  let a = start, seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < steps && !isSolved(p, a.board); i++) {
    if (a.moves && random() < 0.15) a = undo(a);
    else { const next = move(p, a, actions[Math.floor(random() * actions.length)]); if (next) a = next; }
    assert.ok(validBoard(p, a.board), `${label}: a walk stays valid`);
    if (!isSolved(p, a.board)) hintsSolve(p, a, `${label} walk ${i}`);
  }
}
const subsets = list => Array.from({length: 2 ** list.length}, (_, m) => list.filter((_, i) => m >> i & 1));
const OTHER = [{type: 'flip', at: 0}, {type: 'best'}, {type: 'keep'}, {type: 'keep', key: '4-0-0'}, {type: 'claim'}, {type: 'pick', value: 5}, {type: 'draw'}, {type: 'take'}, {type: 'pass'}, {type: 'bag', bag: 1}];

export async function validateOffers() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const pack = await read('../dist/families/offers/offers.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  const family = pack.families[0];
  assert.equal(family.id, 'offers'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = pack.puzzles.filter(p => p.band === 'all'), playgrounds = pack.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, pack.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'offers'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
    assert.ok(p.id === 'offers-playground' || p.id === `offers-${String(p.number).padStart(2, '0')}`, `${p.id}: id`);
    for (const k of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id} ${k}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const k of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[k]?.trim(), `${p.id} parent.${k}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
    assert.doesNotMatch(`${p.objective} ${p.controls}`, /\b\d+ of \d+\b/, `${p.id}: no counters`);
  }
  theorems();

  let hintSteps = 0;
  const answers = {};
  for (const p of core) {
    const q = p.parameters, want = sorted(answer(q));
    assert.deepEqual(want, expected[p.id], `${p.id}: the notes' answer`);
    answers[p.id] = want.length;
    const start = freshAttempt(p), f = start.board;
    assert.ok(validBoard(p, f) && !isSolved(p, f), `${p.id}: valid unsolved start`);
    const [a, steps] = hintsSolve(p, start, p.id);
    hintSteps += steps;
    for (const bad of OTHER) assert.equal(move(p, a, bad), null, `${p.id}: no ${bad.type} after a solve`);
    for (const bad of [null, 'flip', {type: 'toss'}, {type: 'draw'}, {type: 'bag', bag: 1}]) assert.equal(move(p, start, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);

    if (q.mode === 'plan' || q.mode === 'plans') {
      const {most} = bestPlans(q.bag, q.n), plans = allPlans(q.n);
      // Every plan: a claim or Keep is refused exactly when another plan scores more, once per plan.
      for (const plan of plans) {
        const best = scoreAll(q.bag, q.n, tableFor(q.bag, plan).take) === most, there = at(start, {plan});
        const checked = move(p, there, {type: q.mode === 'plan' ? 'best' : 'keep'});
        assert.equal(checked.board.wrong, !best, `${p.id} ${plan}: refused exactly when not best`);
        if (q.mode === 'plan') assert.equal(isSolved(p, checked.board), best, `${p.id} ${plan}: a best plan solves`);
        if (!best) assert.equal(move(p, checked, {type: q.mode === 'plan' ? 'best' : 'keep'}), null, `${p.id}: once per plan`);
        // Hints from every plan of two offers and every seventh of three, refused or not.
        if (q.n === 2 || plans.indexOf(plan) % 7 === 0) hintsSolve(p, there, `${p.id} from ${plan}`);
        if (!best && (q.n === 2 || plan === plans[1])) hintsSolve(p, checked, `${p.id} after a refusal on ${plan}`);
      }
      // A switch after a first offer that is taken can't change.
      if (q.n === 3) assert.equal(move(p, start, {type: 'flip', at: 3}), null, `${p.id}: a closed switch`);
      for (const x of [{type: 'flip', at: 12}, {type: 'flip', at: -1}, {type: 'flip', at: '0'}, {type: 'flip'}, {type: 'pick', value: 3}, {type: 'keep', key: '0-0'}]) assert.equal(move(p, start, x), null, `${p.id}: rejects ${JSON.stringify(x)}`);
      const best = want[0].replace(/-/g, 'T');
      const forgedPlan = [null, {...f, plan: 'TT'}, {...f, plan: f.plan.replace('T', 'X')}, {...f, extra: 1}];
      if (q.mode === 'plan') {
        walk(p, start, [...Array(q.n === 2 ? 3 : 12).keys()].map(k => ({type: 'flip', at: k})).concat([{type: 'best'}]), p.id, 80);
        assert.ok(isSolved(p, move(p, at(start, {plan: best}), {type: 'best'}).board));
        const wrong = move(p, start, {type: 'best'});
        assert.ok(wrong.board.wrong === true && !isSolved(p, wrong.board), `${p.id}: the first plan is not the best`);
        assert.equal(move(p, wrong, {type: 'flip', at: 0}).board.wrong, false, `${p.id}: a switch clears the refusal`);
        assert.deepEqual(undo(wrong).board, f, `${p.id}: Undo`);
        for (const board of [...forgedPlan, {...f, claimed: true}, {...f, wrong: 2}, {...f, wrong: null}, {...f, plan: best, wrong: true}, {...wrong.board, claimed: true}, {plan: f.plan, claimed: false}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
        assert.ok(validBoard(p, {...f, plan: best, claimed: true}));
        continue;
      }
      // Every best plan kept once; shelves of every size, from several plans.
      assert.deepEqual(sorted(a.board.kept), want, `${p.id}: every best plan kept`);
      for (const kept of subsets(want)) for (const plan of [f.plan, best, plans[5], plans[plans.length - 1]]) for (const missed of kept.length && kept.length < want.length ? [false, true] : [false]) {
        if (kept.length === want.length && !missed) continue;
        hintsSolve(p, at(start, {plan, kept, missed}), `${p.id} from ${plan} with ${kept}`);
      }
      walk(p, start, [...Array(q.n === 2 ? 3 : 12).keys()].map(k => ({type: 'flip', at: k})).concat([{type: 'keep'}, {type: 'keep'}, {type: 'claim'}]), p.id, 100);
      const refused = move(p, start, {type: 'keep'});
      assert.ok(refused.board.wrong === true && !refused.board.kept.length, `${p.id}: Keep refuses a plan that isn't best`);
      assert.equal(move(p, refused, {type: 'keep'}), null);
      const one = move(p, at(start, {plan: best}), {type: 'keep'});
      assert.deepEqual(one.board.kept, [want.find(k => k.replace(/-/g, 'T') === best) || want[0]]);
      assert.equal(move(p, one, {type: 'keep'}), null, `${p.id}: kept once`);
      const early = move(p, one, {type: 'claim'});
      assert.ok(early.board.missed && !isSolved(p, early.board)); assert.equal(move(p, early, {type: 'claim'}), null);
      assert.deepEqual(undo(one).board, at(start, {plan: best}).board, `${p.id}: Undo takes a Keep back`);
      for (const board of [...forgedPlan, {...f, kept: [planString(q.n, 0)]}, {...f, kept: [want[0], want[0]]}, {...f, claimed: true}, {...f, wrong: 2}, {...f, plan: best, wrong: true}, {...f, kept: want, missed: true}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {...f, kept: want, claimed: true}));
      continue;
    }

    if (q.mode === 'differ') {
      const cards = cardsFor(q.bag, q.n).map(c => c.join('-')), others = cards.filter(c => !want.includes(c));
      assert.deepEqual(sorted(a.board.kept), want, `${p.id}: every card kept once`);
      for (const kept of subsets(want)) for (const wrong of [null, ...others]) for (const missed of kept.length && kept.length < want.length && wrong === null ? [false, true] : [false]) {
        if (kept.length === want.length) continue;
        hintsSolve(p, at(start, {kept, missed, wrong}), `${p.id} with ${kept}, ${wrong}`);
      }
      walk(p, start, [...cards.map(key => ({type: 'keep', key})), {type: 'claim'}], p.id, 100);
      const no = move(p, start, {type: 'keep', key: '6-0-0'});
      assert.equal(no.board.wrong, '6-0-0', `${p.id}: a card where A and B agree is refused`);
      assert.equal(move(p, no, {type: 'keep', key: '6-0-0'}), null, `${p.id}: not twice in a row`);
      const yes = move(p, no, {type: 'keep', key: '4-0-0'});
      assert.deepEqual([yes.board.kept, yes.board.wrong], [['4-0-0'], null]);
      assert.equal(move(p, yes, {type: 'keep', key: '4-0-0'}), null, `${p.id}: kept once`);
      const early = move(p, yes, {type: 'claim'});
      assert.ok(early.board.missed); assert.equal(move(p, early, {type: 'claim'}), null);
      for (const x of [{type: 'keep', key: '4-0'}, {type: 'keep', key: '4-0-7'}, {type: 'keep'}, {type: 'flip', at: 0}, {type: 'best'}, {type: 'claim'}]) assert.equal(move(p, start, x), null, `${p.id}: rejects ${JSON.stringify(x)}`);
      for (const board of [null, {...f, kept: ['6-0-0']}, {...f, wrong: '4-0-0'}, {...f, wrong: '9-9-9'}, {...f, claimed: true}, {...f, extra: 1}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {...f, kept: want, claimed: true}));
      continue;
    }

    // A ticket to choose. Keep checks it only with a best plan for its bag on the switches.
    const bagOf = v => [...q.pins, v].sort((x, y) => x - y), bestCache = new Map();
    const bestFor = v => { if (!bestCache.has(v)) bestCache.set(v, bestPlans(bagOf(v), q.n).keys[0].replace(/-/g, 'T')); return bestCache.get(v); };
    assert.deepEqual(sorted(a.board.kept), want, `${p.id}: every ticket kept once`);
    for (const kept of subsets(want)) for (const value of [null, ...q.menu]) {
      const states = value === null ? [[f.plan, null]] : [[f.plan, null], [f.plan, 'plan'], [bestFor(value), null], ...(want.includes(String(value)) ? [] : [[bestFor(value), 'goal']])];
      for (const [plan, wrong] of states) for (const missed of kept.length && kept.length < want.length ? [false, true] : [false]) {
        if (kept.length === want.length) continue;
        const board = {value, plan, kept, missed, wrong};
        assert.ok(validBoard(p, at(start, board).board), `${p.id}: ${JSON.stringify(board)} is reachable`);
        hintsSolve(p, at(start, board), `${p.id} from ${value} with ${kept}`);
      }
    }
    walk(p, start, [...q.menu.map(value => ({type: 'pick', value})), ...[...Array(q.n === 2 ? 3 : 12).keys()].map(k => ({type: 'flip', at: k})), {type: 'keep'}, {type: 'keep'}, {type: 'claim'}], p.id, 100);
    assert.equal(move(p, start, {type: 'keep'}), null, `${p.id}: nothing to keep before a ticket`);
    assert.equal(move(p, start, {type: 'flip', at: 0}), null, `${p.id}: no switches before a ticket`);
    const bad = q.menu.find(v => !want.includes(String(v))), good = Number(want[0]);
    const tried = move(p, start, {type: 'pick', value: bad}), flipped = move(p, tried, {type: 'flip', at: 0});
    assert.equal(flipped.board.plan[0], 'P', `${p.id}: switches explore`);
    const refused = move(p, flipped, {type: 'keep'});
    assert.deepEqual([refused.board.wrong, refused.board.kept], ['plan', []], `${p.id}: Keep needs a best plan`);
    assert.equal(move(p, refused, {type: 'keep'}), null);
    assert.equal(move(p, refused, {type: 'flip', at: 0}).board.wrong, null, `${p.id}: a switch clears the refusal`);
    const failed = move(p, at(start, {value: bad, plan: bestFor(bad)}), {type: 'keep'});
    assert.deepEqual([failed.board.wrong, failed.board.kept], ['goal', []], `${p.id}: Keep refuses ${bad} with a best plan`);
    assert.equal(move(p, failed, {type: 'keep'}), null);
    const picked = move(p, failed, {type: 'pick', value: good});
    assert.deepEqual([picked.board.plan, picked.board.wrong], [f.plan, null], `${p.id}: a new ticket starts the switches again`);
    assert.equal(move(p, picked, {type: 'keep'}).board.wrong, 'plan', `${p.id}: even a ticket that works needs a best plan`);
    const kept = move(p, at(picked, {plan: bestFor(good)}), {type: 'keep'});
    assert.deepEqual([kept.board.kept, kept.board.wrong], [[String(good)], null]);
    assert.equal(move(p, kept, {type: 'keep'}), null);
    assert.equal(move(p, kept, {type: 'pick', value: good}), null, `${p.id}: the ticket already there`);
    if (want.length > 1) { const early = move(p, kept, {type: 'claim'}); assert.ok(early.board.missed); }
    // With 0, 3 and 6 a best plan may take a second 3, but not every best plan does.
    if (q.goal === 'flip') assert.equal(move(p, at(start, {value: 3, plan: 'PPTPTTPTTTTT'}), {type: 'keep'}).board.wrong, 'goal', `${p.id}: 3 doesn't flip for every best plan`);
    for (const x of [{type: 'pick', value: q.pins[0]}, {type: 'pick', value: 99}, {type: 'pick', value: String(good)}, {type: 'best'}, {type: 'keep', key: '1'}]) assert.equal(move(p, start, x), null, `${p.id}: rejects ${JSON.stringify(x)}`);
    for (const board of [null, {...f, value: 99}, {...f, kept: [String(bad)]}, {...f, wrong: true}, {...f, wrong: 'plan'}, {...f, value: good, wrong: 'goal'}, {...f, value: good, plan: bestFor(good), wrong: 'goal'}, {...f, value: bad, plan: bestFor(bad), wrong: 'plan'}, {...f, claimed: true}, {...f, plan: 'T'}, {...f, extra: 1}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
    assert.ok(validBoard(p, {...f, kept: want, claimed: true}));
  }

  // Playground: rounds of the chosen bag and number of offers, the last offer
  // taken, unseen offers drawn to complete the card; never solved.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.deepEqual(a.board, {bag: 0, n: 2, offers: [], rounds: []});
  assert.equal(move(pg, a, {type: 'take'}), null, 'nothing to take before a draw');
  a = move(pg, a, {type: 'draw'}, () => 0.5);
  assert.deepEqual(a.board.offers, [4]);
  assert.equal(move(pg, a, {type: 'draw'}), null, 'one round at a time');
  const passed = move(pg, a, {type: 'pass'}, () => 0);
  assert.deepEqual(passed.board.offers, [4, 0]);
  assert.equal(move(pg, passed, {type: 'pass'}), null, 'the last offer must be taken');
  assert.deepEqual(move(pg, passed, {type: 'take'}).board.rounds, [[4, 0, 1]]);
  const early = move(pg, a, {type: 'take'}, () => 0.99);
  assert.deepEqual(early.board, {bag: 0, n: 2, offers: [], rounds: [[4, 6, 0]]}, 'the unseen offer is drawn too');
  assert.deepEqual(move(pg, early, {type: 'offers', n: 3}).board, {bag: 0, n: 3, offers: [], rounds: []});
  assert.equal(move(pg, a, {type: 'offers', n: 3}), null, 'the offers stay fixed during a round');
  assert.equal(move(pg, a, {type: 'bag', bag: 3}), null, 'the bag stays fixed during a round');
  assert.ok(offerMechanics.offers.noUndo(pg) && !offerMechanics.offers.noUndo(core[0]), 'a passed offer is gone for good: no Undo in the playground');
  assert.deepEqual(move(pg, early, {type: 'bag', bag: 3}).board, {bag: 3, n: 2, offers: [], rounds: []});
  assert.equal(move(pg, early, {type: 'bag', bag: 0}), null);
  assert.equal(move(pg, a, {type: 'clear'}), null, 'not during a round');
  let full = freshAttempt(pg);
  while (full.board.rounds.length < 30) full = move(pg, move(pg, full, {type: 'draw'}), {type: 'take'});
  assert.equal(move(pg, full, {type: 'draw'}), null, 'at most thirty rounds');
  assert.deepEqual(move(pg, full, {type: 'clear'}).board.rounds, []);
  for (const bad of [{type: 'bag', bag: 4}, {type: 'offers', n: 4}, {type: 'flip', at: 0}, {type: 'keep'}, {type: 'claim'}]) assert.equal(move(pg, early, bad), null, `playground rejects ${JSON.stringify(bad)}`);
  for (const board of [{...early.board, bag: 4}, {...early.board, n: 1}, {...early.board, rounds: [[4, 5, 0]]}, {...early.board, rounds: [[4, 6, 2]]}, {...early.board, rounds: [[4, 6]]}, {...early.board, offers: [4, 4, 4]}, {...early.board, rounds: Array(31).fill([4, 6, 0])}, {...early.board, extra: 1}]) assert.equal(validBoard(pg, board), false, `playground rejects ${JSON.stringify(board)}`);
  assert.ok(!isSolved(pg, early.board)); assert.equal(nextHint(pg, early).type, 'done');
  return {offersPuzzles: core.length, playground: 1, sources: pack.sources.length, answers, hintSteps};
}
export default validateOffers;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateOffers(), null, 2));
