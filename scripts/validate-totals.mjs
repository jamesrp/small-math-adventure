// Checks the Running totals pack (dist/families/totals/totals.json) by methods
// separate from the mechanic's (which simulates the trays column by column
// and reads the most and least from the sorted decks):
//   - a tray simulator written here from scratch (a card is passed down the
//     trays, each tray adding what it is handed and handing on its new total);
//   - every order of every deck, as all n! orderings of positions, giving
//     every reachable total, the most and the least, which orders reach them,
//     and the weight formula C(N − i + k − 1, k − 1);
//   - the theorem behind Can't, for every deck of up to five cards 0–4 and one
//     to three trays: with two or more trays only biggest first makes the most
//     and only smallest first the least, and with one tray every order ties;
//   - Can't soundness: for every deck above, every full lane and every target
//     from the least − 2 to the most + 2, an accepted certificate means no
//     order makes the target; and each authored Can't is accepted on its
//     sorted lane and refused on every other lane;
//   - match puzzles by trying every lane of cards 0–5 (exactly one fits), and
//     every puzzles by trying every start to 30 with every lane;
//   - witnesses and hint chains played through the move rules, from fresh and
//     messy boards, after refusals and after a wrong That's all; refusals and
//     their locks through Undo; every Undo press changing the board; illegal
//     moves and forged saves; the playground.
// Run: node scripts/validate-totals.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {certificate} from '../dist/families/totals/totals.js';
import {loadPack} from './packs.mjs';

// --- An independent model ----------------------------------------------------
// Each card is handed to tray 1; every tray adds what it is handed and hands
// its new total to the next tray.
function sim(start, lane) {
  const trays = [...start];
  for (const card of lane) {
    let hand = card;
    for (let t = 0; t < trays.length; t++) { trays[t] += hand; hand = trays[t]; }
  }
  return trays[trays.length - 1];
}
// Every ordering of positions (n! of them, repeats included).
function perms(n) {
  if (n === 0) return [[]];
  return perms(n - 1).flatMap(p => Array.from({length: n}, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
}
const permMemo = new Map();
const allOrders = cards => { if (!permMemo.has(cards.length)) permMemo.set(cards.length, perms(cards.length)); return permMemo.get(cards.length).map(p => p.map(i => cards[i])); };
const key = lane => lane.join(',');
// Totals → the distinct orders that reach them.
function table(start, cards) {
  const m = new Map();
  for (const o of allOrders(cards)) { const t = sim(start, o); if (!m.has(t)) m.set(t, new Set()); m.get(t).add(key(o)); }
  return m;
}
const choose = (n, r) => { if (r < 0 || r > n) return 0; let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return Math.round(x); };
// Multisets of size n from 0..top.
const decks = (n, top, min = 0) => n === 0 ? [[]] : Array.from({length: top - min + 1}, (_, k) => min + k).flatMap(v => decks(n - 1, top, v).map(rest => [v, ...rest]));
const lanes = (n, supply) => n === 0 ? [[]] : lanes(n - 1, supply).flatMap(l => supply.map(v => [...l, v]));
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const desc = c => [...c].sort((a, b) => b - a), asc = c => [...c].sort((a, b) => a - b);

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const h = nextHint(p, a);
    if (h.type === 'deadend') { a = undoToSolvable(p, a); continue; }
    assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
    assert.ok(typeof h.text === 'string' && h.text.length > 3 && !/press can/i.test(h.text), `${p.id} ${label}: hint text "${h.text}"`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return {a, steps};
}
// A random legal-looking action for a puzzle.
function randomAction(p, a, rand) {
  const q = p.parameters, b = a.board, n = b.lane.length;
  const pick = list => list[Math.floor(rand() * list.length)];
  const slot = () => Math.floor(rand() * n);
  const cards = q.mode === 'make' ? q.cards : q.supply;
  const r = rand();
  if (q.mode === 'make' && r < .08) return {type: 'cant'};
  if (q.mode === 'every' && r < .15) return {type: 'start', value: Math.floor(rand() * (q.startCap + 1))};
  if (q.mode === 'every' && r < .2) return {type: 'all'};
  if (r < .55) return {type: 'put', slot: slot(), card: pick(cards)};
  if (r < .7) return {type: 'change', slot: slot(), card: pick(cards)};
  if (r < .8) return {type: 'take', slot: slot()};
  return {type: 'swap', a: slot(), b: slot()};
}
const rng = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let ctx = null;
// The pop of the cells a move changed is a one-time flourish, not the board.
const strip = html => html.replace(/ pop" style="--d:\d+"/g, '"');
const draw = p => att => playView(p, att, ctx);
const seen = p => att => strip(draw(p)(att));

export default async function validateTotals() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/totals/totals.json', import.meta.url), 'utf8'));
  const merged = await loadPack(), all = merged.puzzles;
  ctx = {pack: merged, selected: null, message: ''};
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(pack.families.length, 1); assert.equal(pack.families[0].id, 'totals');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  const ids = new Set(pack.sources.map(s => s.id));
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground'), playground = pack.puzzles.find(p => p.band === 'playground');
  assert.ok(playground, 'a playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 15, '8 to 15 puzzles');
  for (const p of pack.puzzles) {
    assert.match(p.id, /^totals-/);
    assert.equal(p.mechanic, 'totals');
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 3, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && Array.isArray(p.hints) && p.hints.length >= 3, `${p.id}: rules and hints`);
    assert.ok(p.hints.every(h => !/press can/i.test(h)), `${p.id}: no hint says to press Can’t`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent.${field}`);
    assert.ok(p.parent.sourceIds.every(id => ids.has(id)), `${p.id}: sources exist`);
    assert.ok(validBoard(p, freshAttempt(p).board), `${p.id}: starts valid`);
  }
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  // Every make puzzle has Can't, so its button gives nothing away.
  assert.ok(puzzles.filter(p => p.parameters.mode === 'make').every(p => p.parameters.cant === true), 'every make puzzle has Can’t');

  // --- The theorems behind the copy, over every small deck --------------------
  let decksChecked = 0, certificatesChecked = 0;
  for (let n = 1; n <= 5; n++) for (const deck of decks(n, 4)) for (let k = 1; k <= 3; k++) {
    const start = Array(k).fill(0), t = table(start, deck), totals = [...t.keys()];
    const most = Math.max(...totals), least = Math.min(...totals);
    // The weight formula.
    for (const o of allOrders(deck).slice(0, 6)) assert.equal(sim(start, o), o.reduce((s, u, i) => s + choose(n - i - 1 + k - 1, k - 1) * u, 0), `${deck} ${k}: weights`);
    if (k === 1) assert.equal(most, least, `${deck}: one tray ties`);
    else {
      // Only the sorted orders reach the ends (when the deck is not all one card).
      assert.deepEqual([...t.get(most)], [key(desc(deck))], `${deck} ${k}: only biggest first makes the most`);
      assert.deepEqual([...t.get(least)], [key(asc(deck))], `${deck} ${k}: only smallest first makes the least`);
    }
    // Can't soundness, for every full lane and every target near the range.
    const distinct = [...new Set(allOrders(deck).map(key))].map(s => s.split(',').map(Number));
    for (let target = least - 2; target <= most + 2; target++) {
      const q = {mode: 'make', trays: k, cards: deck, start, target, cant: true};
      for (const lane of distinct) {
        const why = certificate(q, lane);
        if (why) assert.ok(!t.has(target), `${deck} ${k} → ${target}: an accepted Can’t, but ${[...(t.get(target) || [])][0]} makes it`);
        certificatesChecked++;
      }
      // Past either end, the sorted lane is accepted.
      if (target > most) assert.ok(certificate(q, desc(deck)), `${deck} ${k} → ${target}: biggest first certifies`);
      if (target < least) assert.ok(certificate(q, asc(deck)), `${deck} ${k} → ${target}: smallest first certifies`);
    }
    decksChecked++;
  }

  // --- Each puzzle's claim ------------------------------------------------------
  for (const p of puzzles) {
    const q = p.parameters;
    assert.ok(['make', 'match', 'every'].includes(q.mode), `${p.id}: mode`);
    if (q.mode === 'make') {
      const t = table(q.start, q.cards), totals = [...t.keys()], most = Math.max(...totals), least = Math.min(...totals);
      assert.equal(p.visibleObjective, '', `${p.id}: the board shows the goal`);
      if (!q.witness.cant) {
        assert.deepEqual([...t.get(q.target)], [key(q.witness.lane)], `${p.id}: exactly one order makes ${q.target}`);
        assert.equal(sim(q.start, q.witness.lane), q.target);
      } else {
        assert.ok(!t.has(q.target), `${p.id}: no order makes ${q.target}`);
        assert.ok(q.target > most || q.target < least, `${p.id}: the target is past an end`);
        // Accepted on the sorted lane (or any lane, when every order ties), refused on every other.
        const distinct = [...new Set(allOrders(q.cards).map(key))].map(s => s.split(',').map(Number));
        for (const lane of distinct) {
          const ok = most === least || same(lane, q.target > most ? desc(q.cards) : asc(q.cards));
          assert.equal(Boolean(certificate(q, lane)), ok, `${p.id}: Can’t on ${lane}`);
        }
        assert.equal(certificate(q, q.witness.lane), q.witness.cant, `${p.id}: the reason is ${q.witness.cant}`);
      }
    }
    if (q.mode === 'match') {
      assert.equal(p.visibleObjective, '', `${p.id}: the board shows the goal`);
      const fit = lanes(q.goal.length, q.supply).filter(l => q.goal.every((g, j) => sim(q.start, l.slice(0, j + 1)) === g));
      assert.deepEqual(fit, [q.witness.lane], `${p.id}: exactly one lane makes the totals`);
    }
    if (q.mode === 'every') {
      const found = [];
      for (let s = 0; s <= 30; s++) {
        const fit = lanes(q.goal.length, q.supply).filter(l => q.goal.every((g, j) => sim([s], l.slice(0, j + 1)) === g));
        assert.ok(fit.length <= 1, `${p.id}: start ${s} has at most one lane`);
        if (fit.length) found.push({start: s, lane: fit[0]});
      }
      assert.deepEqual(found, q.witness.starts, `${p.id}: the starts and their lanes`);
      assert.ok(found.every(f => f.start <= q.startCap), `${p.id}: the start buttons reach every answer`);
      assert.ok(q.startCap > found.at(-1).start, `${p.id}: some start buttons fail`);
    }
  }
  // The numbers quoted in the copy.
  const byTitle = t => puzzles.find(p => p.title === t);
  {
    const z = [0, 0];
    assert.equal(sim(z, [1, 3, 0, 0]), 13); assert.equal(sim(z, [0, 0, 1, 3]), 5);
    const t5 = table(z, [3, 1, 0, 0]), r5 = Array.from({length: 11}, (_, i) => 5 + i).filter(x => !t5.has(x));
    assert.deepEqual(r5, [8, 12], 'cards 3, 1, 0, 0 miss 8 and 12');
    const t6 = table(z, [2, 2, 1, 0, 0]);
    assert.deepEqual([...t6.keys()].sort((a, b) => a - b), Array.from({length: 13}, (_, i) => 9 + i), 'two trays with 2, 2, 1, 0, 0 make every total 9 to 21');
    const t9 = table(z, [4, 1, 0, 0, 0]);
    assert.deepEqual(Array.from({length: 19}, (_, i) => 6 + i).filter(x => !t9.has(x)), [10, 15, 20], 'cards 4, 1, 0, 0, 0 miss 10, 15 and 20');
    const t10 = table([0, 0, 0], [2, 2, 1, 0, 0]);
    assert.equal(t10.size, 25, 'three trays make 25 totals'); assert.equal(Math.min(...t10.keys()), 14); assert.equal(Math.max(...t10.keys()), 56);
    assert.deepEqual([1, 2, 3].map(k => sim(Array(k).fill(0), Array(6).fill(1))), [6, 21, 56], 'six 1s');
    assert.equal(sim([0, 0, 0], Array(6).fill(2)), 112, 'six 2s');
    assert.equal(sim([3], [4, 3, 2, 1, 0]), 13, 'one tray from 3 makes 13');
    assert.equal(byTitle('Any order').parameters.target, 12);
    // The Easy two-tray decks: every order makes a different total, so the order is a decision.
    for (const t of ['Two trays', 'A zero turn']) { const q = byTitle(t).parameters; assert.equal(table(q.start, q.cards).size, 6, `${t}: six orders, six totals`); }
    assert.deepEqual([...table(z, [3, 1, 0]).keys()].sort((a, b) => a - b), [5, 6, 7, 9, 10, 11]);
  }

  // --- Witnesses, hints and play ---------------------------------------------
  // A make or match witness: its lane, then Can't when that is the claim.
  const witnessPlay = (p, a) => {
    const q = p.parameters;
    q.witness.lane.forEach((card, slot) => { a = play(p, a, {type: 'put', slot, card}); });
    return q.witness.cant ? play(p, a, {type: 'cant'}) : a;
  };
  let hintSteps = 0;
  for (const p of puzzles) {
    const q = p.parameters;
    // An every witness: each start, then the cards that differ from the lane already down.
    let a = freshAttempt(p);
    if (q.mode === 'every') {
      for (const {start, lane} of q.witness.starts) {
        a = play(p, a, {type: 'start', value: start});
        lane.forEach((card, slot) => { if (a.board.lane[slot] !== card) a = play(p, a, a.board.lane[slot] === null ? {type: 'put', slot, card} : {type: 'change', slot, card}); });
        assert.ok(a.board.found.includes(start), `${p.id}: start ${start} is recorded`);
      }
      a = play(p, a, {type: 'all'});
    } else a = witnessPlay(p, a);
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves it`);
    refuse(p, a, {type: 'take', slot: 0}, 'nothing moves after a solve');
    hintSteps += hintsSolve(p, freshAttempt(p), 'from fresh').steps;
    // Every press of Undo changes the board, all the way back.
    for (let u = a, k = 0; u.history.length && k < 80; k++) { const shown = seen(p)(u), back = undoPress(p, u, draw(p), draw(p)(u)); assert.notEqual(seen(p)(back), shown, `${p.id}: Undo changes the board`); u = back; }
    for (let seed = 1; seed <= 30; seed++) {
      const rand = rng(seed * 7919 + p.number);
      let b = freshAttempt(p);
      for (let k = 0; k < 24 && !isSolved(p, b.board); k++) { const next = move(p, b, randomAction(p, b, rand)); if (next) b = next; }
      assert.ok(validBoard(p, b.board), `${p.id}: random play stays valid`);
      for (let u = b, k = 0; u.history.length && k < 40; k++) { const shown = seen(p)(u), back = undoPress(p, u, draw(p), draw(p)(u)); assert.notEqual(seen(p)(back), shown, `${p.id}: Undo changes the board (seed ${seed})`); assert.ok(validBoard(p, back.board), `${p.id}: Undo keeps the board valid`); u = back; }
      if (!isSolved(p, b.board)) hintSteps += hintsSolve(p, b, `after random play ${seed}`).steps;
    }
  }

  // --- Rules: illegal moves ----------------------------------------------------
  {
    const p = byTitle('The most'), a = freshAttempt(p);
    refuse(p, a, {type: 'put', slot: 0, card: 3}, 'no 3 in the deck');
    refuse(p, a, {type: 'put', slot: 5, card: 2}, 'no turn 6');
    refuse(p, a, {type: 'take', slot: 0}, 'nothing to take');
    refuse(p, a, {type: 'swap', a: 0, b: 1}, 'two empty turns');
    refuse(p, a, {type: 'cant'}, 'no Can’t before the lane is full');
    refuse(p, a, {type: 'all'}, 'no That’s all in a make puzzle');
    refuse(p, a, {type: 'start', value: 1}, 'no start in a make puzzle');
    refuse(p, a, {type: 'trays', n: 3}, 'no tray choice in a make puzzle');
    let b = play(p, a, {type: 'put', slot: 0, card: 1});
    refuse(p, b, {type: 'put', slot: 0, card: 2}, 'the turn is full');
    refuse(p, b, {type: 'change', slot: 0, card: 1}, 'the same card');
    refuse(p, b, {type: 'change', slot: 1, card: 2}, 'nothing to change');
    b = play(p, b, {type: 'put', slot: 1, card: 0});
    b = play(p, b, {type: 'put', slot: 2, card: 0});
    refuse(p, b, {type: 'put', slot: 3, card: 0}, 'both 0s are down');
    refuse(p, b, {type: 'change', slot: 0, card: 0}, 'no 0 left in the hand');
    b = play(p, b, {type: 'change', slot: 0, card: 2});
    assert.deepEqual(b.board.lane, [2, 0, 0, null, null]);
    refuse(p, b, {type: 'swap', a: 1, b: 2}, 'two 0s do not trade');
    b = play(p, b, {type: 'swap', a: 1, b: 3});
    assert.deepEqual(b.board.lane, [2, null, 0, 0, null], 'a card trades with an empty turn');
  }
  // --- Can't: refusals and their locks ---------------------------------------------
  {
    const p = byTitle('Past the most');
    let a = freshAttempt(p);
    for (const [slot, card] of [[0, 2], [1, 1], [2, 2], [3, 0], [4, 0]]) a = play(p, a, {type: 'put', slot, card});
    a = play(p, a, {type: 'cant'});
    assert.equal(a.board.refused, true);
    assert.match(draw(p)(a), /That doesn’t rule it out\./);
    refuse(p, a, {type: 'cant'}, 'the same lane stays refused');
    assert.match(draw(p)(a), /rt-cant[^>]*disabled/, 'Can’t is off after a refusal');
    // Undo keeps the refusal while the lane is the same: the press goes back a card.
    const back = undoPress(p, a, draw(p), draw(p)(a));
    assert.deepEqual(back.board.lane, [2, 1, 2, 0, null], 'Undo takes back the last card');
    assert.equal(back.board.refused, false);
    // A change lifts the lock.
    let c = play(p, a, {type: 'swap', a: 1, b: 2});
    assert.equal(c.board.refused, false);
    c = play(p, c, {type: 'cant'});
    assert.ok(isSolved(p, c.board)); assert.equal(c.board.claim, 'most');
    assert.match(draw(p)(c), /21 is the most\./);
    assert.doesNotMatch(draw(p)(c), /rt-note[^>]*>[^<]*[Bb]iggest/, 'the line after a right Can’t leaves the reason to the child');
    // Hints after a refusal reach the claim.
    hintsSolve(p, a, 'after a refusal');
    const l = byTitle('Below the least');
    let d = freshAttempt(l);
    for (const [slot, card] of [[0, 2], [1, 2], [2, 1], [3, 0], [4, 0]]) d = play(l, d, {type: 'put', slot, card});
    d = play(l, d, {type: 'cant'});
    assert.equal(d.board.refused, true, 'the most is no reason for a target below the least');
    hintsSolve(l, d, 'after a refusal');
    const s = byTitle('Any order');
    let e = freshAttempt(s);
    for (const [slot, card] of [[0, 4], [1, 0], [2, 3], [3, 1], [4, 2]]) e = play(s, e, {type: 'put', slot, card});
    e = play(s, e, {type: 'cant'});
    assert.equal(e.board.claim, 'same', 'one tray: any full lane is the reason');
    assert.match(draw(s)(e), /Every order makes 13\./);
    // A reachable target is never claimed.
    const r = byTitle('Gaps');
    let f = freshAttempt(r);
    for (const [slot, card] of [[0, 4], [1, 1], [2, 0], [3, 0], [4, 0]]) f = play(r, f, {type: 'put', slot, card});
    assert.equal(f.board.lane.join(), '4,1,0,0,0');
    f = play(r, f, {type: 'cant'});
    assert.equal(f.board.refused, true, 'biggest first makes 24, and 14 is less');
  }
  // --- Every: That's all, its refusal and Undo ----------------------------------------
  {
    const p = byTitle('Hidden start'), q = p.parameters;
    let a = freshAttempt(p);
    refuse(p, a, {type: 'start', value: 9}, 'past the start buttons');
    a = play(p, a, {type: 'start', value: 6});
    for (const [slot, card] of [[0, 0], [1, 3], [2, 0], [3, 5]]) a = play(p, a, {type: 'put', slot, card});
    assert.deepEqual(a.board.found, [], 'start 6 with cards 0, 3, 0, 5 makes 6, 9, 9, 14');
    a = play(p, a, {type: 'start', value: 4});
    assert.deepEqual(a.board.found, [4], 'the same cards from 4 make the totals, and 4 is recorded');
    a = play(p, a, {type: 'all'});
    assert.equal(a.board.told, 'more');
    assert.match(draw(p)(a), /There is another\./);
    refuse(p, a, {type: 'all'}, 'That’s all waits for a new find');
    // Undo keeps the find and the refusal.
    let u = a;
    for (let k = 0; k < 3; k++) u = undoPress(p, u, draw(p), draw(p)(u));
    assert.deepEqual(u.board.found, [4], 'Undo keeps the start found');
    assert.equal(u.board.told, 'more', 'Undo keeps That’s all waiting');
    refuse(p, u, {type: 'all'}, 'still waiting after Undo');
    a = play(p, a, {type: 'start', value: 2});
    a = play(p, a, {type: 'change', slot: 0, card: 2});
    assert.deepEqual(a.board.found, [2, 4]); assert.equal(a.board.told, null, 'a new find lifts the lock');
    hintsSolve(p, a, 'after a wrong That’s all');
    assert.equal(q.startCap, 8);
  }
  // --- Forged saves --------------------------------------------------------------
  {
    const p = byTitle('The most'), f = freshAttempt(p).board;
    assert.ok(!validBoard(p, {...f, lane: [3, null, null, null, null]}), 'a card not in the deck');
    assert.ok(!validBoard(p, {...f, lane: [2, 2, 2, null, null]}), 'too many 2s');
    assert.ok(!validBoard(p, {...f, lane: [2, 2, 1, 0]}), 'a short lane');
    assert.ok(!validBoard(p, {...f, lane: [2, 2, 1, 0, 0.5]}), 'a fraction');
    assert.ok(!validBoard(p, {...f, claim: 'most'}), 'a claim on an empty lane');
    assert.ok(!validBoard(p, {...f, extra: 1}), 'an extra key');
    const m = byTitle('Past the most'), mf = freshAttempt(m).board;
    assert.ok(!validBoard(m, {...mf, lane: [2, 1, 2, 0, 0], claim: 'most'}), 'a claim on a lane that is not biggest first');
    assert.ok(!validBoard(m, {...mf, lane: [2, 2, 1, 0, 0], claim: 'least'}), 'the wrong reason');
    assert.ok(!validBoard(m, {...mf, lane: [2, 2, 1, 0, 0], refused: true}), 'a refusal of a real reason');
    assert.ok(!validBoard(m, {...mf, lane: [2, 2, 1, 0, null], refused: true}), 'a refusal before the lane is full');
    assert.ok(!validBoard(m, {...mf, lane: [2, 1, 2, 0, 0], claim: null, refused: 'yes'}), 'a refusal that is not true or false');
    assert.ok(validBoard(m, {...mf, lane: [2, 1, 2, 0, 0], refused: true}), 'a real refusal');
    assert.ok(validBoard(m, {...mf, lane: [2, 2, 1, 0, 0], claim: 'most'}), 'a real claim');
    const e = byTitle('Hidden start'), ef = freshAttempt(e).board;
    assert.ok(!validBoard(e, {...ef, found: [5]}), 'a start that does not work');
    assert.ok(!validBoard(e, {...ef, found: [3, 1]}), 'finds out of order');
    assert.ok(!validBoard(e, {...ef, found: [1, 1]}), 'a find twice');
    assert.ok(!validBoard(e, {...ef, done: true, found: [0, 1, 2]}), 'done without every start');
    assert.ok(!validBoard(e, {...ef, told: 'more', found: [0, 1, 2, 3, 4]}), 'a refusal with every start found');
    assert.ok(!validBoard(e, {...ef, start: 4, lane: [0, 3, 0, 5]}), 'a matching lane whose start is not recorded');
    assert.ok(!validBoard(e, {...ef, start: 9}), 'past the start buttons');
    assert.ok(!validBoard(e, {...ef, lane: [6, null, null, null]}), 'a card past the supply');
    assert.ok(validBoard(e, {...ef, start: 4, lane: [0, 3, 0, 5], found: [4]}), 'a real find');
    const g = playground, gf = freshAttempt(g).board;
    assert.ok(!validBoard(g, {...gf, trays: 4}), 'four trays');
    assert.ok(!validBoard(g, {...gf, trays: 0}), 'no trays');
    assert.ok(!validBoard(g, {...gf, lane: Array(7).fill(null)}), 'seven turns');
    const x = byTitle('Missing cards'), xf = freshAttempt(x).board;
    assert.ok(!validBoard(x, {lane: [3, 0, 4]}), 'a short lane');
    assert.ok(!validBoard(x, {...xf, claim: null}), 'a make key in a match board');
    assert.ok(validBoard(x, {lane: [3, null, 4, 3]}), 'a gap in the lane');
  }
  // --- The board's totals ------------------------------------------------------------
  {
    const p = byTitle('Twice back');
    let a = freshAttempt(p);
    a = play(p, a, {type: 'put', slot: 0, card: 2});
    a = play(p, a, {type: 'put', slot: 2, card: 0});
    const html = strip(draw(p)(a));
    // Totals stop at the first empty turn.
    assert.match(html, /rt-start" aria-hidden="true">0<\/span><span class="rt-cell last good" aria-hidden="true">2<\/span><span class="rt-cell last none"/, 'tray 2 reads 0, 2 and stops');
    for (const [slot, card] of [[1, 1], [3, 3]]) a = play(p, a, {type: 'put', slot, card});
    assert.ok(isSolved(p, a.board));
  }
  // --- Playground ------------------------------------------------------------------
  {
    const g = playground;
    assert.equal(mechanicFor(g).noHint(g), true, 'the playground has no Hint');
    assert.equal(nextHint(g, freshAttempt(g)).type, 'done');
    let a = freshAttempt(g);
    assert.equal(a.board.trays, 2);
    refuse(g, a, {type: 'trays', n: 2}, 'already two trays');
    refuse(g, a, {type: 'trays', n: 4}, 'at most three trays');
    a = play(g, a, {type: 'trays', n: 3});
    for (let slot = 0; slot < 6; slot++) a = play(g, a, {type: 'put', slot, card: 1});
    assert.ok(!isSolved(g, a.board), 'the playground is never solved');
    const html = strip(draw(g)(a));
    for (const v of [6, 21, 56]) assert.match(html, new RegExp(`>${v}</span>`), `six 1s show ${v}`);
    refuse(g, a, {type: 'cant'}, 'no Can’t in the playground');
    a = play(g, a, {type: 'trays', n: 1});
    assert.deepEqual(a.board.lane, Array(6).fill(1), 'the cards stay when the trays change');
  }
  return {puzzles: pack.puzzles.length, decksChecked, certificatesChecked, hintSteps};
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await validateTotals());
