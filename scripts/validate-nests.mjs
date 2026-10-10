// Checks the Nesting cards pack (dist/families/nests/nests.json): content
// fields and sources; every answer recomputed by methods unlike the
// mechanic's (cards as strings of letters, collections by listing every
// subset of a deck as a bit pattern, the five-picture deck by a separate
// search that must find Dedekind's 7,581 collections, and the fewest rows by
// augmenting-path matching, so Dilworth's equality is checked on every best
// puzzle); the worksheet decks in printed order; witnesses played as moves and
// their rows checked as a certificate; hint chains from fresh, after random
// wrong moves and after a wrong That's all; illegal moves; forged saves; the
// playground; and how long a hint takes. Run: node scripts/validate-nests.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// --- Cards as strings ---------------------------------------------------------
const within = (a, b) => [...a].every(c => b.includes(c));
const nest = (a, b) => a !== b && (within(a, b) || within(b, a));
const nice = s => s || 'empty';
const label = set => [...set].map(nice).sort((a, b) => (a === 'empty' ? -1 : b === 'empty' ? 1 : a.length - b.length || a.localeCompare(b))).join('/');
// Every collection of a deck (at most 16 cards) by listing every subset as a bit pattern.
function collections(cards, keep = []) {
  const k = cards.length, out = [], bad = cards.map((a, i) => cards.reduce((m, b, j) => (nest(a, b) ? m | (1 << j) : m), 0));
  const keepMask = keep.reduce((m, s) => m | (1 << cards.indexOf(s)), 0);
  for (let set = 0; set < 1 << k; set++) {
    if ((set & keepMask) !== keepMask) continue;
    let ok = true;
    for (let i = 0; i < k && ok; i++) if (set & (1 << i) && set & bad[i]) ok = false;
    if (ok) out.push(cards.filter((_, i) => set & (1 << i)));
  }
  return out;
}
// Collections of the five-picture deck by a search over cards largest first.
function bigCollections(cards) {
  const order = [...cards].sort((a, b) => b.length - a.length || a.localeCompare(b)), out = [];
  (function go(t, pick) {
    if (t === order.length) { out.push([...pick]); return; }
    go(t + 1, pick);
    if (pick.every(x => !nest(x, order[t]))) go(t + 1, [...pick, order[t]]);
  })(0, []);
  return out;
}
// The fewest rows: cards minus a largest matching of "fits strictly inside".
function fewestRows(cards) {
  const k = cards.length, adj = cards.map(a => cards.map((b, j) => (a !== b && within(a, b) ? j : -1)).filter(j => j >= 0));
  const match = Array(k).fill(-1);
  const augment = (u, seen) => { for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); if (match[v] < 0 || augment(match[v], seen)) { match[v] = u; return true; } } return false; };
  let size = 0;
  for (let u = 0; u < k; u++) if (augment(u, new Set())) size++;
  return k - size;
}
// A certificate: rows that nest, hold every card once, and one chosen card in
// each row, or (with kept cards) only cards that nest with a kept card.
function checkCertificate(id, cards, keep, chosen, rows) {
  const flat = rows.flat();
  assert.deepEqual([...flat].sort(), [...cards].sort(), `${id}: the rows hold every card once`);
  for (const row of rows) {
    const byLen = [...row].sort((a, b) => a.length - b.length);
    for (let t = 1; t < byLen.length; t++) assert.ok(byLen[t - 1] !== byLen[t] && within(byLen[t - 1], byLen[t]), `${id}: row ${label(row)} nests`);
    const picked = row.filter(c => chosen.includes(c)).length;
    assert.ok(picked === 1 || (picked === 0 && keep.length && row.every(c => keep.some(s => nest(s, c)))), `${id}: row ${label(row)} has one chosen card or gives a kept collection nothing`);
  }
  for (const a of chosen) for (const b of chosen) assert.ok(!nest(a, b), `${id}: the chosen cards don’t nest`);
}

// The worksheet decks in printed order (Week 19 packets; the math check's pdf_decks).
const PRINTED = {
  deck2: ['', 'AB', 'A', 'B'],
  deck3: ['AC', '', 'B', 'ABC', 'A', 'BC', 'AB', 'C'],
  deck4: ['AC', 'BD', '', 'ABC', 'CD', 'A', 'BCD', 'AB', 'D', 'BC', 'ABCD', 'AD', 'B', 'ACD', 'C', 'ABD'],
  groups: [['', 'A', 'B'], ['A', 'AB', 'B'], ['AB', 'AC', 'BC'], ['A', 'BC', 'ABC']],
  // Reshuffles of the printed decks (checked below to hold the same cards).
  deck4x: ['BCD', 'C', 'B', 'ACD', 'BD', 'AC', 'ABD', 'AD', 'AB', 'CD', 'ABCD', 'D', 'BC', 'A', '', 'ABC'],
  ext3: ['C', '', 'AB', 'BC', 'A', 'ABC', 'B', 'AC']
};
assert.deepEqual([...PRINTED.deck4x].sort(), [...PRINTED.deck4].sort(), 'the reshuffled sixteen are the printed sixteen');
assert.deepEqual([...PRINTED.ext3].sort(), [...PRINTED.deck3].sort(), 'the reshuffled eight are the printed eight');
// Tapping every card of a deck in a given order: each card joins unless it nests with one already in.
const inOrder = (cards, keep, order) => order.reduce((pick, i) => (pick.includes(cards[i]) || pick.some(x => nest(x, cards[i])) ? pick : [...pick, cards[i]]), [...keep]);
const PAIRS5 = 'AB/AC/AD/AE/BC/BD/BE/CD/CE/DE', TRIPLES5 = 'ABC/ABD/ABE/ACD/ACE/ADE/BCD/BCE/BDE/CDE';
// The table in docs/nests/README.md.
const TABLE = {
  'nests-01': {mode: 'reach', decks: PRINTED.groups, answers: [['A/B'], ['A/B'], ['AB/AC/BC'], ['A/BC']], inOrder: [true, false, true, false]},
  'nests-02': {mode: 'reach', decks: ['deck3'], answers: [['A/B/C', 'AB/AC/BC']]},
  'nests-03': {mode: 'best', decks: ['deck2'], best: [2]},
  'nests-04': {mode: 'extend', decks: ['ext3', 'ext3', 'ext3'], starts: [['ABC'], ['A', 'BC'], ['AB']], best: [1, 2, 3], inOrder: [true, true, false]},
  'nests-05': {mode: 'every', decks: ['deck3'], answers: [['A/B/C', 'AB/AC/BC']]},
  'nests-06': {mode: 'best', decks: ['deck3'], best: [3]},
  'nests-07': {mode: 'reach', decks: ['deck4x'], answers: [['AB/AC/AD/BC/BD/CD']]},
  'nests-08': {mode: 'best', decks: [PRINTED.deck3.filter(s => s !== 'A' && s !== 'BC')], best: [2]},
  'nests-09': {mode: 'extend', decks: ['deck4x', 'deck4x'], starts: [['A', 'BCD'], ['AB', 'AC']], best: [2, 6], inOrder: [true, false]},
  'nests-10': {mode: 'best', decks: ['deck4x'], best: [6]},
  'nests-11': {mode: 'best', decks: ['deck4x'], starts: [['A']], best: [4]},
  'nests-12': {mode: 'every', decks: [null], answers: [[PAIRS5, TRIPLES5]]}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const times = [];
let worst = null;
function timedHint(p, a) {
  const t0 = performance.now(), h = nextHint(p, a), ms = performance.now() - t0;
  times.push(ms);
  if (!worst || ms > worst.ms) worst = {p, board: a.board, ms};
  return h;
}
// The slowest hint again, three times under fresh puzzle ids and fresh decks so
// no memo or cache is reused: a pause of a busy machine shows once, real work
// every time.
function retimeWorst() {
  let best = Infinity;
  for (let k = 0; k < 3; k++) {
    // Fresh deck objects too, so nothing the mechanic caches per deck is reused.
    const q = {...worst.p, id: `${worst.p.id}#retime${k}`, parameters: {...worst.p.parameters, decks: worst.p.parameters.decks.map(d => ({...d}))}}, t0 = performance.now();
    mechanicFor(q).hint(q, worst.board);
    best = Math.min(best, performance.now() - t0);
  }
  return best;
}
function hintsSolve(p, a, why) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 500; steps++) {
    const h = timedHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${why}: hints name a move`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${why}: a hint has words`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${why}: hints reach a solve`);
  return steps;
}
// A seeded stream of random numbers, for wrong moves.
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
function wander(p, a, random, count) {
  const q = p.parameters;
  for (let n = 0; n < count; n++) {
    const d = Math.floor(random() * a.board.decks.length), k = (q.decks || [])[d]?.cards.length || 0;
    const card = Math.floor(random() * k), r = random();
    let action = {type: 'tap', deck: d, card};
    if (q.mode === 'best' && r < 0.55) action = r < 0.45 ? {type: 'place', card, row: Math.floor(random() * (a.board.rows.length + 1))} : {type: 'unplace', card};
    const next = move(p, a, action);
    if (next && !isSolved(p, next.board)) a = next;
  }
  return a;
}
const idx = (q, d, s) => q.decks[d].cards.indexOf(s);

export async function validateNests() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/nests/nests.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-19')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-19.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'nests');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // The theorems on the full decks: the guide's counts of collections
  // (including no cards at all) and the largest sizes, which match the fewest rows.
  const counts = {deck2: 6, deck3: 20, deck4: 168}, widths = {deck2: 2, deck3: 3, deck4: 6};
  for (const [name, n] of Object.entries(counts)) {
    const list = collections(PRINTED[name]);
    assert.equal(list.length, n, `${name}: ${n} collections`);
    assert.equal(Math.max(...list.map(s => s.length)), widths[name], `${name}: the most`);
    assert.equal(fewestRows(PRINTED[name]), widths[name], `${name}: as many rows as the most (Dilworth)`);
  }
  const six = collections(PRINTED.deck4).filter(s => s.length === 6);
  assert.deepEqual(six.map(label), ['AB/AC/AD/BC/BD/CD'], 'four pictures: the six two-picture cards are the only six');
  // Setting aside any one card of the eight leaves a collection of three; the guide's A and BC leave two.
  for (const gone of PRINTED.deck3) assert.equal(Math.max(...collections(PRINTED.deck3.filter(s => s !== gone)).map(s => s.length)), 3, `without ${nice(gone)}: still three`);
  // Removing any two-picture card from sixteen lowers the most to five; any other card leaves six.
  for (const gone of PRINTED.deck4) assert.equal(fewestRows(PRINTED.deck4.filter(s => s !== gone)), gone.length === 2 ? 5 : 6, `sixteen without ${nice(gone)}`);

  let hintSteps = 0, checked = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'nests');
    assert.ok(p.id.startsWith('nests-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(!/\d+\s+of\s+\d+/.test(p.visibleObjective), `${p.id}: no counter in the objective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    assert.equal(nextHint(p, fresh).type, q.mode === 'playground' ? 'done' : 'move', `${p.id}: a first hint`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }

    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    row.decks.forEach((name, d) => {
      if (name === null) return;
      // A named deck keeps its printed order; a small printed group may be shuffled, since the app never lays cards out by size.
      if (typeof name === 'string') assert.deepEqual(q.decks[d].cards, PRINTED[name], `${p.id}: deck ${d + 1} as printed`);
      else assert.deepEqual([...q.decks[d].cards].sort(), [...name].sort(), `${p.id}: deck ${d + 1} has the printed cards`);
    });
    for (const deck of q.decks) {
      assert.equal(new Set(deck.cards).size, deck.cards.length, `${p.id}: no card twice`);
      if (new Set(deck.cards.map(s => s.length)).size > 1) assert.ok(deck.cards.some((s, i) => i && s.length < deck.cards[i - 1].length), `${p.id}: the deck is not laid out by size`);
      assert.deepEqual(deck.start || [], (row.starts || [])[q.decks.indexOf(deck)] || [], `${p.id}: the start`);
    }
    // Tapping every card in page order finishes a deck only where the table says there is no choice to make;
    // the sixteen-card decks also stop short tapped backwards and down the columns.
    if (row.mode !== 'best') q.decks.forEach((deck, d) => {
      const keep = deck.start || [], goal = deck.target ?? row.best[d], order = [...deck.cards.keys()];
      assert.equal(inOrder(deck.cards, keep, order).length >= goal, (row.inOrder || [])[d] ?? false, `${p.id}: deck ${d + 1} tapped in page order`);
      if (deck.cards.length === 16 && !(row.inOrder || [])[d]) for (const ord of [[...order].reverse(), ...[4, 5].map(w => [...Array(w).keys()].flatMap(c => order.filter(i => i % w === c)))]) assert.ok(inOrder(deck.cards, keep, ord).length < goal, `${p.id}: deck ${d + 1} tapped in another plain order`);
    });
    if (p.id === 'nests-12') {
      const deck = q.decks[0].cards, every = bigCollections(deck);
      assert.equal(deck.length, 32, 'five pictures: 32 cards');
      assert.equal(every.length, 7581, 'five pictures: Dedekind’s 7,581 collections');
      assert.equal(Math.max(...every.map(s => s.length)), 10, 'five pictures: ten is the most');
      assert.deepEqual(every.filter(s => s.length === 10).map(label).sort(), [PAIRS5, TRIPLES5], 'five pictures: exactly two collections of ten');
      assert.equal(fewestRows(deck), 10, 'five pictures: ten rows');
    }

    // Answers by listing every subset.
    if (row.mode === 'reach' || row.mode === 'every') {
      q.decks.forEach((deck, d) => {
        const list = deck.cards.length > 16 ? bigCollections(deck.cards) : collections(deck.cards);
        assert.deepEqual(list.filter(s => s.length === deck.target).map(label).sort(), [...row.answers[d]].sort(), `${p.id}: deck ${d + 1}'s collections of ${deck.target}`);
        if (row.mode === 'reach') assert.equal(Math.max(...list.map(s => s.length)), deck.target, `${p.id}: the circles ask for the most`);
      });
    } else {
      q.decks.forEach((deck, d) => {
        const keep = deck.start || [], list = collections(deck.cards, keep), best = Math.max(...list.map(s => s.length));
        assert.equal(best, row.best[d], `${p.id}: deck ${d + 1}'s most`);
        const free = deck.cards.filter(c => !keep.includes(c) && !keep.some(s => nest(s, c)));
        assert.equal(keep.length + fewestRows(free), best, `${p.id}: deck ${d + 1}: kept cards plus the fewest rows of the free cards (Dilworth)`);
      });
    }

    // The witness, played as moves.
    let a = fresh;
    if (row.mode === 'every') {
      for (const [n, set] of p.solution.answers.entries()) {
        for (const s of set) a = play(p, a, {type: 'tap', deck: 0, card: idx(q, 0, s)});
        assert.equal(a.board.found.length, n + 1, `${p.id}: a collection of the size is kept`);
        assert.deepEqual(a.board.decks[0], {chosen: [], out: []}, `${p.id}: the cards go back`);
        if (n === 0) {
          let again = a;
          for (const s of set) again = play(p, again, {type: 'tap', deck: 0, card: idx(q, 0, s)});
          assert.deepEqual(again.board.told, {kind: 'again', at: 0}, `${p.id}: found already`);
          const early = play(p, a, {type: 'all'});
          assert.deepEqual(early.board.told, {kind: 'more'}, `${p.id}: there is another`);
          refuse(p, early, {type: 'all'}, 'That’s all again before a new collection');
          hintSteps += hintsSolve(p, early, 'after a wrong That’s all');
        }
      }
      a = play(p, a, {type: 'all'});
      assert.ok(isSolved(p, a.board), `${p.id}: That’s all after every collection`);
      refuse(p, a, {type: 'tap', deck: 0, card: 0}, 'a move after a solve');
    } else {
      p.solution.chosen.forEach((set, d) => { for (const s of set) if (!(q.decks[d].start || []).includes(s)) a = play(p, a, {type: 'tap', deck: d, card: idx(q, d, s)}); });
      if (row.mode === 'extend') {
        p.solution.chosen.forEach((set, d) => assert.equal(set.length, row.best[d], `${p.id}: the witness is as big as possible`));
        assert.ok(!isSolved(p, a.board), `${p.id}: not solved before every other card is tried`);
        q.decks.forEach((deck, d) => deck.cards.forEach((s, i) => { if (!p.solution.chosen[d].includes(s)) { a = play(p, a, {type: 'tap', deck: d, card: i}); assert.ok(a.board.decks[d].out.includes(i), `${p.id}: ${nice(s)} is refused and marked`); } }));
      }
      if (row.mode === 'best') {
        checkCertificate(p.id, q.decks[0].cards, q.decks[0].start || [], p.solution.chosen[0], p.solution.rows);
        assert.equal(p.solution.chosen[0].length, row.best[0], `${p.id}: the witness is as big as possible`);
        p.solution.rows.forEach((r, n) => r.forEach(s => { a = play(p, a, {type: 'place', card: idx(q, 0, s), row: n}); }));
      }
      assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
      refuse(p, a, {type: 'tap', deck: 0, card: 0}, 'a move after a solve');
    }

    // Hints alone: from fresh and after random wrong moves.
    hintSteps += hintsSolve(p, fresh, 'from fresh');
    const random = rng(19 * p.number + 7);
    for (let trial = 0; trial < 24; trial++) hintSteps += hintsSolve(p, wander(p, fresh, random, 4 + Math.floor(random() * 22)), `after wrong moves (trial ${trial + 1})`);
    if (row.mode === 'extend') checkStuck(p, fresh);
    if (row.mode === 'best') checkRows(p, fresh, row);
    checkRefusals(p, fresh, row);
    checked++;
  }
  // Hints are memoised per board; nearly every one must be far under 100 ms,
  // and only a pause of the machine itself may reach it.
  times.sort((x, y) => x - y);
  const p99 = times[Math.floor(times.length * 0.99)], slowest = retimeWorst();
  // The first tap on the five-picture deck lists its 7,581 collections once; time it on fresh deck objects.
  const big = pack.puzzles.find(p => p.id === 'nests-12'), cold = {...big, id: 'nests-12#cold', parameters: {...big.parameters, decks: big.parameters.decks.map(d => ({...d}))}};
  const t0 = performance.now();
  play(cold, freshAttempt(cold), {type: 'tap', deck: 0, card: 0});
  const coldTap = performance.now() - t0;
  assert.ok(coldTap < 100, `the first tap on thirty-two cards takes ${coldTap.toFixed(1)} ms`);
  assert.ok(p99 < 50, `one hint in a hundred takes ${p99.toFixed(1)} ms or more; they should be well under 100 ms`);
  assert.ok(slowest < 100, `the slowest hint (${worst.p.id}) takes ${slowest.toFixed(1)} ms when timed again`);
  return {nestsPuzzles: checked, hintSteps, hintMs99: Number(p99.toFixed(1)), slowestHintRetimedMs: Number(slowest.toFixed(1)), slowestHintPuzzle: worst.p.id, slowestHintFirstMs: Number(worst.ms.toFixed(1)), firstTapOn32Ms: Number(coldTap.toFixed(1))};
}

// Extend: a stuck collection smaller than the most is not a solve.
function checkStuck(p, fresh) {
  const q = p.parameters;
  q.decks.forEach((deck, d) => {
    const keep = deck.start || [], list = collections(deck.cards, keep), best = Math.max(...list.map(s => s.length));
    // A collection that can take no more cards (maximal) but is smaller than the most.
    const small = list.find(s => s.length < best && deck.cards.every(c => s.includes(c) || s.some(x => nest(x, c))));
    if (!small) return;
    let a = fresh;
    for (const s of small) if (!keep.includes(s)) a = play(p, a, {type: 'tap', deck: d, card: idx(q, d, s)});
    for (const [i, s] of deck.cards.entries()) if (!small.includes(s)) a = play(p, a, {type: 'tap', deck: d, card: i});
    assert.equal(a.board.decks[d].chosen.length + a.board.decks[d].out.length, deck.cards.length, `${p.id}: deck ${d + 1}: every card tried`);
    assert.ok(!isSolved(p, a.board), `${p.id}: deck ${d + 1}: stuck at ${small.length} is not a solve`);
    assert.ok(a.board.stuck.includes(d), `${p.id}: deck ${d + 1}: “Another way fits more cards.” is in the save`);
    // Undo takes back the last tap, not the answer; a change of chosen cards clears it.
    const back = undo(a), kept = {...back, board: mechanicFor(p).carry(p, a.board, back.board)};
    assert.ok(validBoard(p, kept.board) && kept.board.stuck.includes(d), `${p.id}: deck ${d + 1}: Undo keeps the answer`);
    const loose = small.find(s => !keep.includes(s));
    const changed = play(p, kept, {type: 'tap', deck: d, card: idx(q, d, loose)});
    assert.ok(!changed.board.stuck.includes(d), `${p.id}: deck ${d + 1}: putting back a chosen card clears it`);
    hintSteps0(p, a, `stuck at ${label(small)}`);
  });
}
const hintSteps0 = (p, a, why) => hintsSolve(p, a, why);

// Best: rows that break, a row without a chosen card, and the pinned card's rows.
function checkRows(p, fresh, row) {
  const q = p.parameters, cards = q.decks[0].cards, keep = q.decks[0].start || [];
  let a = play(p, fresh, {type: 'place', card: 0, row: 0});
  a = play(p, a, {type: 'place', card: 1, row: 0});
  const twoInRow = within(cards[0], cards[1]) || within(cards[1], cards[0]);
  assert.equal(a.board.rows.length, 1, `${p.id}: a card joins a row`);
  if (!twoInRow) assert.ok(!isSolved(p, a.board), `${p.id}: a row that does not nest`);
  refuse(p, a, {type: 'place', card: 0, row: 0}, 'a card into its own row');
  refuse(p, a, {type: 'place', card: 2, row: 5}, 'a row past the new one');
  refuse(p, fresh, {type: 'unplace', card: 0}, 'taking out a card not in a row');
  refuse(p, a, {type: 'place', card: 'x', row: 0}, 'a card named by a string');
  // Every card in its own row, with the most chosen: too many rows, not a solve.
  let b = fresh;
  for (const s of p.solution.chosen[0]) if (!keep.includes(s)) b = play(p, b, {type: 'tap', deck: 0, card: idx(q, 0, s)});
  cards.forEach((_, i) => { b = play(p, b, {type: 'place', card: i, row: b.board.rows.length}); });
  assert.equal(b.board.rows.length, cards.length, `${p.id}: one row per card`);
  assert.ok(!isSolved(p, b.board), `${p.id}: rows with no chosen card are not a solve`);
  hintSteps0(p, b, 'from one row per card');
  if (keep.length) {
    // A row made only of cards that nest with the kept card needs no chosen card…
    const solved = p.solution.rows.some(r => !r.some(c => p.solution.chosen[0].includes(c)));
    assert.ok(solved, `${p.id}: the witness uses a row that gives the kept collection nothing`);
    // …but a row with a free card does.
    const free = cards.filter(c => !keep.includes(c) && !keep.some(s => nest(s, c)));
    assert.ok(free.length && free.every(c => !p.solution.rows.some(r => r.includes(c) && !r.some(x => p.solution.chosen[0].includes(x)))), `${p.id}: every free card’s row holds a chosen card`);
  }
  void row;
}

function checkRefusals(p, fresh, row) {
  const q = p.parameters, B = fresh.board;
  for (const [action, why] of [[null, 'nothing'], ['tap', 'a string'], [{type: 'tap'}, 'no card'], [{type: 'tap', deck: 0, card: -1}, 'a card off the deck'], [{type: 'tap', deck: 0, card: q.decks[0].cards.length}, 'a card off the deck'], [{type: 'tap', deck: q.decks.length, card: 0}, 'a deck that is not there'], [{type: 'tap', deck: 0, card: '1'}, 'a card named by a string'], [{type: 'fly'}, 'an unknown move'], [{type: 'deck', pick: 0}, 'a deck change']]) refuse(p, fresh, action, why);
  if (row.mode !== 'best') for (const [action, why] of [[{type: 'place', card: 0, row: 0}, 'a row outside a rows puzzle'], [{type: 'unplace', card: 0}, 'taking out of a row outside a rows puzzle']]) refuse(p, fresh, action, why);
  if (row.mode !== 'every') refuse(p, fresh, {type: 'all'}, 'That’s all outside a find-every puzzle');
  // A kept card stays chosen; a tap on it changes nothing.
  const keep = q.decks.findIndex(d => (d.start || []).length);
  if (keep >= 0) { const i = idx(q, keep, q.decks[keep].start[0]); assert.equal(move(p, fresh, {type: 'tap', deck: keep, card: i}), fresh, `${p.id}: a tap on a pinned card changes nothing`); }
  // A tap on a card that nests with a chosen card marks it; the chosen cards stay a collection.
  const deck = q.decks[0].cards, first = deck.findIndex(s => s.length === 1) >= 0 ? deck.findIndex(s => s.length === 1) : 0;
  const keep0 = q.decks[0].start || [];
  let a = keep0.includes(deck[first]) ? fresh : play(p, fresh, {type: 'tap', deck: 0, card: first});
  const bigger = deck.findIndex(s => s !== deck[first] && within(deck[first], s) && !keep0.some(k => nest(k, s) && !nest(deck[first], s)));
  if (bigger >= 0 && !a.board.decks[0].chosen.includes(bigger)) {
    const tried = play(p, a, {type: 'tap', deck: 0, card: bigger});
    if (row.mode !== 'every' || tried.board.decks[0].chosen.length) {
      assert.ok(tried.board.decks[0].out.includes(bigger), `${p.id}: a card that holds a chosen card is refused and marked`);
      assert.ok(!tried.board.decks[0].chosen.includes(bigger), `${p.id}: and not chosen`);
      assert.equal(move(p, tried, {type: 'tap', deck: 0, card: bigger}), tried, `${p.id}: a tap on a marked card changes nothing`);
      if (!keep0.includes(deck[first])) { const back = play(p, tried, {type: 'tap', deck: 0, card: first}); assert.ok(!back.board.decks[0].out.includes(bigger) || back.board.decks[0].chosen.some(j => nest(deck[j], deck[bigger])), `${p.id}: putting the chosen card back clears its marks`); }
    }
  }
  // Forged saves.
  const d0 = B.decks[0], k = deck.length, comparable = (() => { for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (nest(deck[i], deck[j]) && !keep0.includes(deck[i]) && !keep0.includes(deck[j])) return [i, j].sort((x, y) => x - y); return null; })();
  const forged = [
    [{...B, extra: 1}, 'an unknown field'],
    [{...B, decks: []}, 'no decks'],
    [{...B, decks: [{...d0, chosen: [k]}, ...B.decks.slice(1)]}, 'a chosen card off the deck'],
    [{...B, decks: [{...d0, chosen: d0.chosen.length ? [d0.chosen[0], ...d0.chosen] : [0, 0]}, ...B.decks.slice(1)]}, 'a card chosen twice'],
    [{...B, decks: [{...d0, mark: true}, ...B.decks.slice(1)]}, 'an unknown deck field']
  ];
  const loose = deck.findIndex((c, i) => !d0.chosen.includes(i) && !d0.chosen.some(j => nest(c, deck[j]) || nest(deck[j], c)));
  if (loose >= 0) forged.push([{...B, decks: [{...d0, out: [loose]}, ...B.decks.slice(1)]}, 'a marked card that nests with no chosen card']);
  if (comparable) forged.push([{...B, decks: [{chosen: [...new Set([...d0.chosen, ...comparable])].sort((x, y) => x - y), out: []}, ...B.decks.slice(1)]}, 'two chosen cards that nest']);
  if (keep0.length) forged.push([{...B, decks: [{chosen: [], out: []}, ...B.decks.slice(1)]}, 'a pinned card not chosen']);
  if (d0.chosen.length === 0 && k > 1) forged.push([{...B, decks: [{chosen: [1, 0], out: []}, ...B.decks.slice(1)]}, 'chosen cards out of order']);
  if (row.mode === 'extend') {
    const roomy = q.decks.findIndex(dk => collections(dk.cards, dk.start || []).some(set => set.length > (dk.start || []).length));
    forged.push([{...B, stuck: [q.decks.length]}, 'an answer for a deck that is not there'], [{...B, stuck: [0, 0]}, 'an answer twice']);
    if (roomy >= 0) forged.push([{...B, stuck: [roomy]}, '“another way fits more” for a collection that can still take a card']);
    forged.push([{decks: B.decks}, 'no answers list']);
  }
  if (row.mode === 'best') forged.push([{...B, rows: [[0, 0]]}, 'a card twice in the rows'], [{...B, rows: [[]]}, 'an empty row'], [{...B, rows: [[k]]}, 'a card off the deck in a row'], [{...B, rows: [[...deck.keys()].sort((x, y) => deck[y].length - deck[x].length).slice(0, 2)]}, 'a row not smallest first'], [{decks: B.decks}, 'no rows']);
  if (row.mode === 'every') {
    const t = q.decks[0].target, answers = p.solution.answers.map(set => set.map(s => idx(q, 0, s)).sort((x, y) => x - y));
    forged.push([{...B, found: [[0]]}, 'a found collection of the wrong size'], [{...B, found: [answers[0], answers[0]]}, 'a collection found twice'], [{...B, done: true}, 'That’s all before every collection'], [{...B, found: answers, told: {kind: 'more'}}, '“there is another” when none is'], [{...B, found: [answers[0]], told: {kind: 'again', at: 1}}, '“found already” for one not found'], [{...B, decks: [{chosen: answers[0], out: []}]}, 'a full collection left chosen'], [{...B, done: 'yes'}, 'a done flag that is not true or false']);
    void t;
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkPlayground(p, fresh) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  q.choices.forEach((deck, k) => {
    let a = k === fresh.board.pick ? fresh : play(p, fresh, {type: 'deck', pick: k});
    assert.equal(a.board.pick, k);
    const keep = collections(deck.cards), best = keep.filter(s => s.length === Math.max(...keep.map(x => x.length)))[0];
    for (const s of best) a = play(p, a, {type: 'tap', deck: 0, card: deck.cards.indexOf(s)});
    deck.cards.forEach((_, i) => { a = play(p, a, {type: 'place', card: i, row: a.board.rows.length}); });
    assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  });
  refuse(p, fresh, {type: 'deck', pick: 9}, 'an unknown deck');
  refuse(p, fresh, {type: 'deck', pick: fresh.board.pick}, 'the same deck');
  refuse(p, fresh, {type: 'all'}, 'That’s all in the playground');
  for (const [board, why] of [[{...fresh.board, pick: 7}, 'an unknown deck'], [{...fresh.board, rows: [[0, 0]]}, 'a card twice in the rows'], [{...fresh.board, decks: [{chosen: [0, 1], out: []}]}, 'two chosen cards that nest']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}
export default validateNests;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateNests(), null, 2));
