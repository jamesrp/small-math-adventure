// Checks the Flip switches pack (dist/families/rotor/rotor.json) by methods
// separate from the mechanic's (which numbers switches in level order and
// walks heap indices):
//   - a tree of linked switch objects written here from scratch, each with its
//     own arrow, run counter by counter;
//   - every order of the exits (all 24 on four exits, all 40,320 on eight, all
//     16 four-letter words on one switch) sorted three ways that must agree:
//     made by some start of the linked tree, taking turns at every switch
//     (read from each switch's range of letters), and having no Can't claim
//     the mechanic accepts; every start makes its own order (2, 8 and 128);
//   - every claim (switch and two slots) on every make puzzle's order, makeable
//     or not, answered with the verdict worked out here (so Can't answers a
//     claim on its own and never says whether the order can be made), accepted
//     exactly when it is a proof here, and each accepted claim sound: no start
//     agrees with the order up to the claim's later slot; and soundness over
//     every pattern with open slots on one switch and four exits, and 20,000
//     patterns on eight;
//   - every That's-all set against all starts of the linked tree, and That's
//     all judged on every part of each shelf;
//   - witnesses and hint chains from fresh and messy boards, Can't refusals
//     and their lines, the locks through Undo and every Undo changing the
//     screen, illegal moves, forged saves and the playground.
// Run: node scripts/validate-rotor.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {certify, ordersFitting, startsFitting} from '../dist/families/rotor/rotor.js';
import {loadPack} from './packs.mjs';

// --- An independent model ------------------------------------------------------
// A switch is {lo, hi, arrow, left, right}: the exits lo..hi lie below it, and
// its children are switches or exit numbers. Built from the letters' range,
// halving it.
function build(lo, hi) {
  if (lo === hi) return lo;
  const mid = (lo + hi + 1) / 2;
  return {lo, hi, mid, arrow: null, left: build(lo, mid - 1), right: build(mid, hi)};
}
// The switches top-down, level by level (the order a start lists them in).
function levels(root) {
  const out = [], queue = [root];
  while (queue.length) { const s = queue.shift(); if (typeof s === 'object') { out.push(s); queue.push(s.left, s.right); } }
  return out;
}
const LETTERS = 'ABCDEFGH';
function machine(d, start) {
  const root = build(0, 2 ** d - 1), list = levels(root);
  list.forEach((s, i) => { s.arrow = start[i]; });
  return {
    drop() {
      let s = root;
      while (typeof s === 'object') { const go = s.arrow; s.arrow = go === 'L' ? 'R' : 'L'; s = go === 'L' ? s.left : s.right; }
      return LETTERS[s];
    }
  };
}
const orderFrom = (d, start, n) => { const m = machine(d, start); return Array.from({length: n}, () => m.drop()).join(''); };
function startsOf(d) {
  const n = 2 ** d - 1, out = [];
  (function grow(prefix) { if (prefix.length === n) { out.push(prefix); return; } grow([...prefix, 'L']); grow([...prefix, 'R']); })([]);
  return out;
}
// Taking turns: at each switch, the letters of the word below it, in order,
// alternate between its two halves.
function takesTurns(d, word) {
  return levels(build(0, 2 ** d - 1)).every(s => {
    const sides = [...word].map(x => LETTERS.indexOf(x)).filter(k => k >= s.lo && k <= s.hi).map(k => k < s.mid);
    return sides.every((side, i) => i === 0 || side !== sides[i - 1]);
  });
}
// What a claim (switch s, slots a < b) gets: 'open' when a chosen slot is
// open, 'off' when a letter isn't below s, 'apart' when the two are on
// different sides, 'between' when a slot between them holds a letter below s
// or is open (its counter might pass s), and 'ok' when it proves the word
// impossible: two consecutive visits to s that leave the same way.
function verdictOf(d, word, s, a, b) {
  const sw = levels(build(0, 2 ** d - 1))[s], below = k => k >= sw.lo && k <= sw.hi, ks = [...word].map(x => x === '_' ? null : LETTERS.indexOf(x));
  if (ks[a] === null || ks[b] === null) return 'open';
  if (!below(ks[a]) || !below(ks[b])) return 'off';
  if ((ks[a] < sw.mid) !== (ks[b] < sw.mid)) return 'apart';
  for (let k = a + 1; k < b; k++) if (ks[k] === null || below(ks[k])) return 'between';
  return 'ok';
}
const proves = (d, word, s, a, b) => verdictOf(d, word, s, a, b) === 'ok';
function permutations(list) {
  if (list.length <= 1) return [list];
  return list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map(rest => [x, ...rest]));
}
const words = (alphabet, n) => n === 0 ? [''] : words(alphabet, n - 1).flatMap(w => [...alphabet].map(x => w + x));

// --- Playing --------------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is allowed`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: ${why}`);
const rng = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
function randomAction(p, b, rand) {
  const q = p.parameters, n = 2 ** q.depth - 1, pick = list => list[Math.floor(rand() * list.length)];
  const r = rand();
  if (r < .35) return {type: 'flip', node: `s${Math.floor(rand() * n)}`};
  if (r < .45) return {type: 'set', node: `s${Math.floor(rand() * n)}`, side: pick(['L', 'R'])};
  if (r < .85) return {type: 'send'};
  if (q.mode === 'make') return {type: 'cant', node: `s${Math.floor(rand() * n)}`, at: [0, 1 + Math.floor(rand() * (q.target.length - 1))]};
  return pick([{type: 'keep'}, {type: 'all'}]);
}
let ctx = null;
const draw = p => att => playView(p, att, ctx);
// Hints alone from an attempt, undoing out of dead ends as the hint card does.
function hintsSolve(p, a, limit = 120) {
  for (let k = 0; k < limit; k++) {
    if (isSolved(p, a.board)) return a;
    if (nextHint(p, a).type === 'deadend') { a = undoToSolvable(p, a); continue; }
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id}: a hint is a move (${h.text})`);
    a = play(p, a, h.action);
  }
  assert.fail(`${p.id}: hints solve within ${limit} steps`);
}

export default async function validateRotor() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/rotor/rotor.json', import.meta.url), 'utf8'));
  const merged = await loadPack(), all = merged.puzzles;
  ctx = {pack: merged, selected: null, message: ''};
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(pack.families.length, 1); assert.equal(pack.families[0].id, 'rotor');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  const sourceIds = new Set(pack.sources.map(s => s.id));
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground'), playground = pack.puzzles.find(p => p.band === 'playground');
  assert.ok(playground, 'a playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  for (const p of pack.puzzles) {
    assert.match(p.id, /^rotor-/);
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 3, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && Array.isArray(p.hints) && p.hints.length >= 3, `${p.id}: rules and hints`);
    assert.ok(p.parent.sourceIds.every(id => sourceIds.has(id)), `${p.id}: sources`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
  }

  // Every order of the exits, three ways.
  const counts = {};
  for (const d of [1, 2, 3]) {
    const n = d === 1 ? 4 : 2 ** d, made = new Set(startsOf(d).map(s => orderFrom(d, s, n)));
    counts[d] = made.size;
    assert.equal(made.size, 2 ** (2 ** d - 1), `depth ${d}: every start makes its own order`);
    const cands = d === 1 ? words('AB', 4) : permutations(LETTERS.slice(0, 2 ** d).split('')).map(w => w.join(''));
    let impossible = 0;
    for (const w of cands) {
      const target = w.split(''), can = made.has(w), mech = ordersFitting(d, target).length > 0;
      assert.equal(mech, can, `depth ${d}, ${w}: the mechanic agrees`);
      assert.equal(takesTurns(d, w), can, `depth ${d}, ${w}: possible exactly when every switch takes turns`);
      // A claim the mechanic accepts exists exactly when the order can't be made.
      let accepted = 0;
      for (let s = 0; s < 2 ** d - 1; s++) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (certify(d, target, s, a, b) === 'ok') accepted++;
      assert.equal(accepted > 0, !can, `depth ${d}, ${w}: a proof exactly when impossible`);
      if (!can) impossible++;
    }
    if (d === 2) assert.equal(impossible, 16, 'four exits: 8 of 24 orders');
    if (d === 3) assert.equal(impossible, 40320 - 128, 'eight exits: 128 of 40,320 orders');
    if (d === 1) assert.deepEqual([...made].sort(), ['ABAB', 'BABA']);
  }
  assert.deepEqual(startsOf(2).map(s => orderFrom(2, s, 4)), ['ACBD', 'ADBC', 'BCAD', 'BDAC', 'CADB', 'DACB', 'CBDA', 'DBCA'], 'the guide’s four-exit key');
  assert.equal(orderFrom(3, Array(7).fill('L'), 8), 'AECGBFDH', 'all left: bit reversal');
  assert.equal(orderFrom(3, Array(7).fill('R'), 8), 'HDFBGCEA', 'all right');
  // Claims on patterns with open slots: every claim gets the verdict worked
  // out here, and an accepted one means no start fits the pattern (so on a
  // pattern some start fits, no claim is accepted).
  let patterns = 0;
  for (const d of [1, 2, 3]) {
    const n = d === 1 ? 4 : 2 ** d, orders = startsOf(d).map(s => orderFrom(d, s, n)), alphabet = LETTERS.slice(0, 2 ** d) + '_';
    const rand = rng(91 + d), list = d < 3 ? words(alphabet, n) : Array.from({length: 20000}, () => Array.from({length: n}, () => alphabet[Math.floor(rand() * alphabet.length)]).join(''));
    for (const w of list) {
      const target = [...w].map(x => x === '_' ? null : x), fit = orders.some(o => [...o].every((x, i) => target[i] === null || target[i] === x));
      for (let s = 0; s < 2 ** d - 1; s++) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
        const v = certify(d, target, s, a, b);
        assert.equal(v, verdictOf(d, w, s, a, b), `depth ${d}, ${w}: claim s${s} ${a},${b}`);
        if (v === 'ok') assert.ok(!fit, `depth ${d}, ${w}: an accepted claim on a pattern some start fits`);
      }
      patterns++;
    }
  }
  assert.equal(certify(1, ['A', null, 'A', null], 0, 0, 2), 'between', 'A _ A _: the open slot’s counter might pass the switch');
  // Every block of 2^d reaches each exit once, and the switches return.
  for (const d of [1, 2, 3]) for (const s of startsOf(d)) {
    const n = 2 ** d, m = machine(d, s), w = Array.from({length: 3 * n}, () => m.drop()).join('');
    for (let k = 0; k + n <= w.length; k++) assert.equal(new Set(w.slice(k, k + n)).size, n, `depth ${d}: any ${n} in a row reach every exit`);
    assert.equal(w.slice(n, 2 * n), w.slice(0, n), `depth ${d}: the order repeats`);
  }

  // The puzzles.
  const expected = {
    'rotor-01': {possible: true, starts: 1}, 'rotor-02': {possible: false}, 'rotor-03': {possible: true, starts: 2}, 'rotor-04': {possible: true, starts: 1},
    'rotor-05': {possible: false}, 'rotor-06': {every: 2}, 'rotor-07': {possible: true, starts: 1}, 'rotor-08': {possible: false},
    'rotor-09': {possible: true, starts: 1}, 'rotor-10': {possible: true, starts: 1}, 'rotor-11': {possible: false}, 'rotor-12': {possible: false}, 'rotor-13': {every: 4}
  };
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(expected));
  let claimsChecked = 0;
  for (const p of puzzles) {
    const q = p.parameters, d = q.depth, n = q.target.length, word = q.target.map(x => x ?? '_').join(''), want = expected[p.id];
    const fitting = startsOf(d).filter(s => [...orderFrom(d, s, n)].every((x, i) => q.target[i] === null || q.target[i] === x));
    if (q.mode === 'make') {
      assert.equal(fitting.length > 0, want.possible, `${p.id}: possible or not`);
      if (want.possible) assert.equal(fitting.length, want.starts, `${p.id}: ${want.starts} starts`);
      assert.equal(startsFitting(d, q.target).length, fitting.length, `${p.id}: the mechanic’s starts`);
      // Every claim on this order, played after one counter: answered with its
      // own verdict whether or not the order can be made, accepted exactly
      // when it proves, and sound.
      let after = freshAttempt(p);
      for (let i = 0; i < 2 ** d - 1; i++) after = play(p, after, {type: 'flip', node: `s${i}`});
      after = play(p, after, {type: 'send'});
      for (let s = 0; s < 2 ** d - 1; s++) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
        const v = verdictOf(d, word, s, a, b), ok = v === 'ok';
        assert.equal(certify(d, q.target, s, a, b), v, `${p.id}: claim s${s} ${a},${b}`);
        const claimed = play(p, after, {type: 'cant', node: `s${s}`, at: [b, a]}).board;
        assert.equal(isSolved(p, claimed), ok, `${p.id}: claim s${s} ${a},${b} accepted exactly when it proves`);
        assert.equal(claimed.told, ok ? null : v, `${p.id}: claim s${s} ${a},${b} answered with its own verdict`);
        if (ok) assert.ok(!want.possible && startsOf(d).every(st => [...orderFrom(d, st, b + 1)].some((x, i) => x !== q.target[i])), `${p.id}: no start agrees up to slot ${b}`);
        claimsChecked++;
      }
    } else {
      const set = fitting.map(s => orderFrom(d, s, n));
      assert.equal(set.length, want.every, `${p.id}: ${want.every} orders fit`);
      assert.deepEqual([...ordersFitting(d, q.target)].sort(), [...set].sort(), `${p.id}: the mechanic’s set`);
      // That's all on every part of the shelf: only the whole set is accepted.
      for (let mask = 1; mask < 2 ** set.length; mask++) {
        const kept = set.filter((_, i) => mask >> i & 1), board = {...freshAttempt(p).board, kept};
        assert.ok(validBoard(p, board), `${p.id}: a shelf of fitting orders is valid`);
        const after = mechanicFor(p).move(p, board, {type: 'all'});
        assert.equal(after.done, kept.length === set.length, `${p.id}: That’s all on ${kept.join(' ')}`);
        if (!after.done) assert.equal(after.told, 'more');
      }
    }
    // The witness, played.
    let a = freshAttempt(p);
    for (const action of q.witness) a = play(p, a, action);
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves it`);
    // Hints from fresh: never a claim first, and they solve it.
    const first = nextHint(p, freshAttempt(p));
    assert.ok(first.type === 'move' && !['cant', 'all'].includes(first.action.type), `${p.id}: hints don’t begin with a claim`);
    hintsSolve(p, freshAttempt(p));
    // Hints from messy boards, and every Undo changes the screen.
    for (let seed = 1; seed <= 25; seed++) {
      const rand = rng(seed * 7919 + p.number);
      let m = freshAttempt(p);
      for (let k = 0; k < 14 && !isSolved(p, m.board); k++) { const next = move(p, m, randomAction(p, m.board, rand)); if (next) m = next; }
      assert.ok(validBoard(p, m.board), `${p.id}: random play stays valid`);
      for (let u = m, k = 0; u.history.length && k < 40; k++) { const shown = draw(p)(u), back = undoPress(p, u, draw(p), shown); assert.notEqual(draw(p)(back), shown, `${p.id}: Undo changes the screen`); u = back; }
      if (!isSolved(p, m.board)) hintsSolve(p, m);
    }
  }

  // Can't: refusals, their lines and the lock.
  const byId = id => puzzles.find(p => p.id === id);
  {
    const p = byId('rotor-02'); // A B B A on one switch.
    let a = freshAttempt(p);
    refuse(p, a, {type: 'cant', node: 's0', at: [1, 2]}, 'Can’t waits for a counter');
    refuse(p, a, {type: 'send'}, 'Send waits for the switch');
    a = play(p, a, {type: 'flip', node: 's0'});
    a = play(p, a, {type: 'send'});
    refuse(p, a, {type: 'flip', node: 's0'}, 'switches are set before the first counter');
    assert.equal(play(p, a, {type: 'cant', node: 's0', at: [0, 3]}).board.told, 'between', 'the Bs come between the As');
    assert.equal(play(p, a, {type: 'cant', node: 's0', at: [0, 1]}).board.told, 'apart', 'A and B go different ways');
    const told = play(p, a, {type: 'cant', node: 's0', at: [0, 1]});
    assert.match(draw(p)(told), /Those two go different ways there\./);
    assert.equal(play(p, told, {type: 'send'}).board.told, null, 'a move clears a refused claim’s line');
    assert.ok(isSolved(p, play(p, a, {type: 'cant', node: 's0', at: [2, 1]}).board), 'B, B at slots 2 and 3, in either order');
    refuse(p, a, {type: 'cant', node: 's0', at: [1, 1]}, 'two different slots');
    refuse(p, a, {type: 'cant', node: 's1', at: [1, 2]}, 'a switch that exists');
  }
  {
    const p = byId('rotor-05'); // A B C D.
    let a = freshAttempt(p);
    for (const s of ['s0', 's1', 's2']) a = play(p, a, {type: 'flip', node: s});
    a = play(p, a, {type: 'send'});
    assert.equal(play(p, a, {type: 'cant', node: 's2', at: [0, 1]}).board.told, 'off', 'A and B never pass the switch above C and D');
    assert.equal(play(p, a, {type: 'cant', node: 's1', at: [0, 1]}).board.told, 'apart', 'A and B part at the switch above them');
    assert.ok(isSolved(p, play(p, a, {type: 'cant', node: 's0', at: [2, 3]}).board), 'C and D also prove it');
  }
  {
    const p = byId('rotor-11'); // A E B F C G D H.
    let a = freshAttempt(p);
    for (let i = 0; i < 7; i++) a = play(p, a, {type: 'flip', node: `s${i}`});
    a = play(p, a, {type: 'send'});
    assert.equal(play(p, a, {type: 'cant', node: 's0', at: [0, 2]}).board.told, 'between', 'E passes the top switch between A and B');
    assert.ok(isSolved(p, play(p, a, {type: 'cant', node: 's2', at: [1, 3]}).board), 'E and F at the switch above E to H');
  }
  {
    // A Can't on an order some start makes gets the claim's own verdict, as on
    // an impossible order, and Can't stays on; Undo takes the line away.
    const p = byId('rotor-04'); // A C B D.
    let a = freshAttempt(p);
    for (const s of ['s0', 's1', 's2']) a = play(p, a, {type: 'flip', node: s});
    a = play(p, a, {type: 'send'});
    const told = play(p, a, {type: 'cant', node: 's0', at: [0, 1]});
    assert.equal(told.board.told, 'apart', 'A and C go different ways at the top switch');
    assert.match(draw(p)(told), /Those two go different ways there\./);
    assert.doesNotMatch(draw(p)(told), /There is a way/);
    assert.equal(play(p, told, {type: 'cant', node: 's1', at: [0, 2]}).board.told, 'apart', 'A and B part at the switch above them');
    assert.equal(play(p, told, {type: 'cant', node: 's0', at: [0, 2]}).board.told, 'between', 'C passes the top switch between A and B');
    assert.equal(play(p, told, {type: 'cant', node: 's2', at: [0, 1]}).board.told, 'off');
    const back = undoPress(p, told, draw(p), draw(p)(told));
    assert.equal(back.board.told, null, 'Undo takes the line away');
    assert.equal(back.board.sent, 1, 'and only the line');
    assert.ok(isSolved(p, hintsSolve(p, told).board), 'hints still solve it');
    // An open slot can't be one of the two.
    const o = byId('rotor-03'); // D _ _ _.
    let c = freshAttempt(o);
    for (const s of ['s0', 's1', 's2']) c = play(o, c, {type: 'set', node: s, side: 'L'});
    c = play(o, c, {type: 'send'});
    const open = play(o, c, {type: 'cant', node: 's0', at: [0, 1]});
    assert.equal(open.board.told, 'open');
    assert.match(draw(o)(open), /That slot could be any exit\./);
  }
  {
    // That's all refused: kept while the shelf is the same.
    const p = byId('rotor-06');
    let a = freshAttempt(p);
    for (const [s, side] of [['s0', 'R'], ['s1', 'L'], ['s2', 'R']]) a = play(p, a, {type: 'set', node: s, side});
    refuse(p, a, {type: 'all'}, 'That’s all needs a kept order');
    for (let k = 0; k < 4; k++) a = play(p, a, {type: 'send'});
    refuse(p, a, {type: 'send'}, 'four counters a trial');
    a = play(p, a, {type: 'keep'});
    assert.equal(a.board.sent, 0, 'Keep brings the counters back');
    assert.deepEqual(a.board.kept, ['DACB']);
    a = play(p, a, {type: 'all'});
    assert.equal(a.board.told, 'more');
    assert.match(draw(p)(a), /There is another\./);
    refuse(p, a, {type: 'all'}, 'That’s all stays off');
    a = play(p, a, {type: 'set', node: 's1', side: 'R'});
    assert.equal(a.board.told, 'more', 'flips keep it');
    a = play(p, a, {type: 'send'});
    const back = undoPress(p, a, draw(p), draw(p)(a));
    assert.equal(back.board.told, 'more', 'Undo keeps it while the shelf is the same');
    for (let k = 0; k < 3; k++) a = play(p, a, {type: 'send'});
    a = play(p, a, {type: 'keep'});
    assert.equal(a.board.told, null, 'a new order on the shelf opens That’s all');
    refuse(p, a, {type: 'keep'}, 'Keep needs a full trial');
    a = play(p, a, {type: 'all'});
    assert.ok(isSolved(p, a.board));
    // A kept order again, or one that doesn't fit.
    let b = freshAttempt(p);
    for (const [s, side] of [['s0', 'R'], ['s1', 'L'], ['s2', 'R']]) b = play(p, b, {type: 'set', node: s, side});
    for (let k = 0; k < 4; k++) b = play(p, b, {type: 'send'});
    b = play(p, b, {type: 'keep'});
    for (let k = 0; k < 4; k++) b = play(p, b, {type: 'send'});
    refuse(p, b, {type: 'keep'}, 'an order already kept');
    let c = freshAttempt(p);
    for (const s of ['s0', 's1', 's2']) c = play(p, c, {type: 'flip', node: s});
    for (let k = 0; k < 4; k++) c = play(p, c, {type: 'send'});
    refuse(p, c, {type: 'keep'}, 'an order that doesn’t start with D');
  }

  // Forged saves.
  const forge = (p, board, why) => assert.equal(validBoard(p, board), false, `${p.id}: ${why}`);
  {
    const p = byId('rotor-04'), f = freshAttempt(p).board;
    forge(p, {...f, sent: 1}, 'a counter before the switches are set');
    forge(p, {...f, start: ['L', 'L', 'L'], sent: 5}, 'more counters than the order');
    forge(p, {...f, start: ['L', 'L', 'L'], sent: 1, claim: {node: 's0', at: [0, 1]}}, 'a claim on a possible order');
    assert.ok(validBoard(p, {...f, start: ['L', 'L', 'L'], sent: 1, told: 'apart'}), 'a refused claim on a possible order');
    forge(p, {...f, start: ['L', 'L', 'L'], sent: 0, told: 'apart'}, 'a refused claim before any counter');
    forge(p, {...f, start: ['L', 'L', 'L'], sent: 1, told: 'open'}, 'a line no claim here gets (no slot is open)');
    forge(p, {...f, start: ['L', 'L', 'L'], sent: 1, told: 'way'}, 'a line the app doesn’t give');
    forge(p, {...f, start: ['L', 'X', 'L']}, 'a switch with no side');
    forge(p, {...f, start: ['L', 'L']}, 'too few switches');
  }
  {
    const p = byId('rotor-05'), f = freshAttempt(p).board;
    forge(p, {...f, start: ['L', 'L', 'L'], sent: 1, told: 'way'}, 'a line the app doesn’t give');
    forge(p, {...f, start: ['L', 'L', 'L'], sent: 1, told: 'off', claim: {node: 's0', at: [0, 1]}}, 'a line beside an accepted claim');
    forge(p, {...f, start: ['L', 'L', 'L'], sent: 1, claim: {node: 's1', at: [0, 1]}}, 'a claim that proves nothing');
    forge(p, {...f, start: ['L', 'L', 'L'], sent: 0, claim: {node: 's0', at: [0, 1]}}, 'a claim before any counter');
    assert.ok(validBoard(p, {...f, start: ['L', 'L', 'L'], sent: 1, claim: {node: 's0', at: [0, 1]}}), 'a true claim');
  }
  {
    const p = byId('rotor-13'), f = freshAttempt(p).board;
    forge(p, {...f, kept: ['AEBFCGDH']}, 'a kept order no start makes');
    forge(p, {...f, kept: ['HDFBGCEA']}, 'a kept order that doesn’t fit');
    forge(p, {...f, kept: ['AECGBFDH', 'AECGBFDH']}, 'an order kept twice');
    forge(p, {...f, kept: ['AECGBFDH'], done: true}, 'That’s all accepted on part of the shelf');
    forge(p, {...f, told: 'more'}, 'a refusal with nothing kept');
  }

  // The playground.
  {
    const g = playground;
    let a = freshAttempt(g);
    assert.ok(mechanicFor(g).noHint(g));
    assert.equal(nextHint(g, a).type, 'note');
    refuse(g, a, {type: 'send'}, 'set the switch first');
    a = play(g, a, {type: 'flip', node: 's0'});
    for (let k = 0; k < 8; k++) a = play(g, a, {type: 'send'});
    refuse(g, a, {type: 'send'}, 'the one-switch playground holds 8');
    a = play(g, a, {type: 'clear'});
    refuse(g, a, {type: 'clear'}, 'nothing to clear');
    a = play(g, a, {type: 'tree', depth: 3});
    assert.deepEqual(a.board.start, Array(7).fill(null), 'a new tree starts unset');
    for (let i = 0; i < 7; i++) a = play(g, a, {type: 'set', node: `s${i}`, side: 'R'});
    for (let k = 0; k < 16; k++) a = play(g, a, {type: 'send'});
    refuse(g, a, {type: 'send'}, 'two blocks of eight');
    refuse(g, a, {type: 'tree', depth: 3}, 'the same tree');
    assert.doesNotMatch(draw(g)(a).match(/<button[^>]*data-focus="ro-tree-3"[^>]*>/)[0], /data-move/, 'the chosen tree’s button does nothing');
    assert.match(draw(g)(a).match(/<button[^>]*data-focus="ro-tree-2"[^>]*>/)[0], /data-move/, 'another tree’s button chooses it');
    forge(g, {...a.board, depth: 4}, 'a tree that isn’t offered');
    assert.ok(!isSolved(g, a.board), 'the playground is never solved');
  }
  return {puzzles: pack.puzzles.length, orders: counts, claimsChecked, patterns};
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await validateRotor());
