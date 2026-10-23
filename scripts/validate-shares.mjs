// Checks the Fair shares pack (dist/families/shares/shares.json): content
// fields and sources; every answer recomputed by methods unlike the
// mechanic's (two people: the catalog by A's reds and blues with binomial
// counts, in exact fractions; favourites: augmenting paths for the largest
// matching, a count of matchings over subsets, and a short group found by
// König's alternating paths; cut and choose: prefix sums in fractions from
// both ends); witnesses played as moves; hint chains from fresh and after
// wrong moves and wrong claims; Undo keeping claims; illegal moves; forged
// saves. Run: node scripts/validate-shares.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// The table in docs/shares/README.md.
const TABLE = {
  'shares-01': {level: 'easy', mode: 'one', fair: 4},
  'shares-02': {level: 'easy', mode: 'halve', fair: 0, halved: 4},
  'shares-03': {level: 'easy', mode: 'halve', fair: 6},
  'shares-04': {level: 'easy', mode: 'favourites', ways: 1},
  'shares-05': {level: 'medium', mode: 'every', fair: 4},
  'shares-06': {level: 'medium', mode: 'every', fair: 5},
  'shares-07': {level: 'medium', mode: 'favourites', ways: 0, short: ['A', 'C', 'D']},
  'shares-08': {level: 'medium', mode: 'duel', cut: 4, theirs: 8, take: 'left'},
  'shares-09': {level: 'hard', mode: 'favourites', ways: 2},
  'shares-10': {level: 'hard', mode: 'favourites', ways: 0, short: ['A', 'C', 'D', 'E']},
  'shares-11': {level: 'hard', mode: 'duel', cut: 4, theirs: 5, take: 'left'}
};

// Exact fractions as [numerator, denominator].
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const fr = (n, d = 1) => { const g = gcd(n, d) || 1; return [n / g, d / g]; };
const add = (x, y) => fr(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
const cmp = (x, y) => x[0] * y[1] - y[0] * x[1];
const choose = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c; };

// Two people: whether a division is fair depends only on how many reds and
// blues A gets, so the answer is a sum of binomial counts over the catalog.
function catalog(q) {
  const [A, B] = q.people, R = q.goods.filter(g => g.colour === 'red').length, U = q.goods.length - R, rows = [];
  for (let r = 0; r <= R; r++) for (let u = 0; u <= U; u++) {
    const v = (p, rr, uu) => add(fr(p.likes.red * rr), fr(p.likes.blue * uu));
    const ok = cmp(v(A, r, u), v(A, R - r, U - u)) >= 0 && cmp(v(B, R - r, U - u), v(B, r, u)) >= 0;
    rows.push({r, u, ok, ways: choose(R, r) * choose(U, u)});
  }
  return rows;
}
// Every labelled division, judged with fractions (halves as 1/2).
function labelled(q, goods) {
  const out = [];
  for (let m = 0; m < 1 << goods.length; m++) {
    const owner = goods.map((g, i) => m >> i & 1 ? q.people[1].id : q.people[0].id);
    const tray = (p, id) => goods.reduce((s, g, i) => owner[i] === id ? add(s, fr(p.likes[g.colour], g.half ? 2 : 1)) : s, fr(0));
    const ok = q.people.every(p => q.people.every(o => cmp(tray(p, p.id), tray(p, o.id)) >= 0));
    if (ok) out.push(owner.join(''));
  }
  return out.sort();
}
const halves = (q, cut) => q.goods.flatMap(g => g.id === cut ? [{id: `${g.id}a`, colour: g.colour, half: true}, {id: `${g.id}b`, colour: g.colour, half: true}] : [g]);

// Favourites: the largest matching by augmenting paths (Kuhn), the number of
// perfect matchings by a count over subsets of items, and a short group by
// König: from a person left unmatched, everyone reachable by alternating
// paths likes only items matched to that group.
function kuhn(q) {
  const ids = q.items.map(i => i.id), owner = Object.fromEntries(ids.map(i => [i, null]));
  const tryPerson = (k, seen) => {
    for (const it of q.people[k].likes) {
      if (seen.has(it)) continue;
      seen.add(it);
      if (owner[it] === null || tryPerson(owner[it], seen)) { owner[it] = k; return true; }
    }
    return false;
  };
  let size = 0;
  for (let k = 0; k < q.people.length; k++) if (tryPerson(k, new Set())) size++;
  return {size, owner};
}
function countMatchings(q) {
  const ids = q.items.map(i => i.id), n = q.people.length, ways = new Array(1 << n).fill(0);
  ways[0] = 1;
  for (let m = 0; m < 1 << n; m++) {
    if (!ways[m]) continue;
    const k = [...Array(n).keys()].filter(i => m >> i & 1).length;
    if (k >= n) continue;
    for (let i = 0; i < n; i++) if (!(m >> i & 1) && q.people[k].likes.includes(ids[i])) ways[m | 1 << i] += ways[m];
  }
  return ways[(1 << n) - 1];
}
function konig(q) {
  const {owner} = kuhn(q), matchedTo = {};
  for (const [it, k] of Object.entries(owner)) if (k !== null) matchedTo[k] = it;
  const start = q.people.findIndex((_, k) => !(k in matchedTo));
  if (start < 0) return null;
  const people = new Set([start]), items = new Set(), queue = [start];
  while (queue.length) {
    const k = queue.shift();
    for (const it of q.people[k].likes) if (!items.has(it)) { items.add(it); const j = owner[it]; if (j !== null && !people.has(j)) { people.add(j); queue.push(j); } }
  }
  return {people: [...people].sort((a, b) => a - b).map(k => q.people[k].id), items: [...items]};
}
const likes = (q, group) => new Set(group.flatMap(id => q.people.find(p => p.id === id).likes));

// Cut and choose in fractions: the equal cuts, found from both ends.
const cellWorth = (taste, c) => fr(c === 'R' ? taste.red : taste.blue);
function cutsFor(strip, taste) {
  const left = [fr(0)];
  for (const c of strip) left.push(add(left.at(-1), cellWorth(taste, c)));
  const right = [fr(0)];
  for (const c of [...strip].reverse()) right.push(add(right.at(-1), cellWorth(taste, c)));
  const out = [];
  for (let k = 1; k < strip.length; k++) if (cmp(left[k], right[strip.length - k]) === 0) out.push(k);
  return {out, left, right};
}

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 60; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: hint words`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
const putAll = (p, a, owners) => Object.entries(owners).reduce((b, [good, to]) => b.board.at[good] === to ? b : play(p, b, {type: 'put', good, to}), a);

// Who would swap in a division, judged with fractions: everybody who counts
// another tray worth more than their own.
function swappers(q, goods, owner) {
  const tray = (p, id) => goods.reduce((s, g, i) => owner[i] === id ? add(s, fr(p.likes[g.colour], g.half ? 2 : 1)) : s, fr(0));
  return q.people.filter(p => q.people.some(o => cmp(tray(p, o.id), tray(p, p.id)) > 0)).map(p => p.id);
}
// Every labelled division with every card given out, as owner strings.
const everyDivision = q => Array.from({length: 1 << q.goods.length}, (_, m) => q.goods.map((g, i) => m >> i & 1 ? q.people[1].id : q.people[0].id).join(''));
const ownersOf = (q, key) => Object.fromEntries(q.goods.map((g, i) => [g.id, key[i]]));

function checkTwo(p, row) {
  const q = p.parameters, fresh = freshAttempt(p), goods = q.goods;
  let steps = 0;
  const all = labelled(q, goods), rows = catalog(q);
  assert.equal(all.length, row.fair, `${p.id}: fair whole divisions, labelled`);
  assert.equal(rows.filter(r => r.ok).reduce((s, r) => s + r.ways, 0), row.fair, `${p.id}: the catalog agrees`);
  // The first hint is never a claim.
  assert.equal(nextHint(p, fresh).action.type, 'put', `${p.id}: the first hint moves a card`);
  refuse(p, fresh, {type: 'put', good: 'R9', to: q.people[0].id}, 'an unknown card');
  refuse(p, fresh, {type: 'put', good: 'R1', to: 'C'}, 'an unknown tray');
  refuse(p, fresh, {type: 'put', good: 'R1', to: null}, 'a card already on the table');
  refuse(p, fresh, {type: 'fly'}, 'an unknown move');
  steps += hintsSolve(p, fresh, 'from fresh');
  if (q.mode === 'every') return steps + checkEvery(p, row, all);
  refuse(p, fresh, {type: 'fair'}, 'Fair with cards on the table');
  refuse(p, fresh, {type: 'all'}, 'That’s all, which this puzzle has not');
  refuse(p, fresh, {type: 'keep'}, 'Keep, which this puzzle has not');
  // Fair on every division: solved exactly when it is fair; otherwise it
  // names everybody who would swap, and nothing else.
  for (const key of everyDivision(q)) {
    const a = play(p, putAll(p, fresh, ownersOf(q, key)), {type: 'fair'});
    const who = swappers(q, goods, [...key]);
    if (!who.length) { assert.ok(isSolved(p, a.board), `${p.id}: ${key} is accepted`); continue; }
    assert.deepEqual(a.board.told, {kind: 'swap', who}, `${p.id}: ${key} is refused, naming ${who}`);
    refuse(p, a, {type: 'fair'}, 'Fair twice on one division');
  }
  if (q.mode === 'one') {
    refuse(p, fresh, {type: 'cant', pairs: [['R1', 'R2']]}, 'Can’t, which this puzzle has not');
    const both = everyDivision(q).find(k => swappers(q, goods, [...k]).length === 2);
    assert.ok(both, `${p.id}: some division has both people wanting to swap`);
    const refused = play(p, putAll(p, fresh, ownersOf(q, both)), {type: 'fair'});
    steps += hintsSolve(p, refused, 'after a refused Fair');
    for (const [board, why] of [
      [{...fresh.board, told: {kind: 'swap', who: ['A']}}, 'a refused Fair with cards on the table'],
      [{...refused.board, told: {kind: 'swap', who: ['A']}}, 'a refused Fair naming one of two'],
      [{...refused.board, told: {kind: 'swap', who: 'A'}}, 'a refused Fair naming a string'],
      [{...refused.board, told: {kind: 'more'}}, 'a That’s all refusal'],
      [{...fresh.board, done: true}, 'done with nothing given'],
      [{...fresh.board, extra: 1}, 'an extra field']
    ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    return steps;
  }
  return steps + checkHalve(p, row, all);
}

// Find every: Keep shelves a way unjudged; That's all judges the shelf once.
function checkEvery(p, row, all) {
  const q = p.parameters, fresh = freshAttempt(p), goods = q.goods;
  let steps = 0;
  const carry = (from, to) => ({...to, board: mechanicFor(p).carry(p, from.board, to.board)});
  const keep = (a, key) => play(p, putAll(p, a, ownersOf(q, key)), {type: 'keep'});
  const unfair = everyDivision(q).find(k => !all.includes(k));
  refuse(p, fresh, {type: 'fair'}, 'Fair in a find-every puzzle');
  refuse(p, fresh, {type: 'keep'}, 'Keep with cards on the table');
  refuse(p, fresh, {type: 'cant', pairs: []}, 'Can’t, which this puzzle has not');
  // An empty shelf: "There is another.", once, and moving cards doesn't lift it.
  let a = play(p, fresh, {type: 'all'});
  assert.deepEqual(a.board.told, {kind: 'more'}, `${p.id}: That’s all with nothing kept`);
  refuse(p, a, {type: 'all'}, 'That’s all twice on one shelf');
  a = play(p, a, {type: 'put', good: goods[0].id, to: q.people[0].id});
  assert.deepEqual(a.board.told, {kind: 'more'}, `${p.id}: moving a card keeps the refusal`);
  refuse(p, a, {type: 'all'}, 'That’s all again after moving a card');
  // Keep never judges: a way somebody would swap goes on the shelf as quietly as any.
  let b = keep(a, unfair);
  assert.equal(b.board.told, null, `${p.id}: Keep says nothing`);
  assert.deepEqual(b.board.shelf, [unfair]);
  refuse(p, b, {type: 'keep'}, 'keeping one way twice');
  b = play(p, b, {type: 'all'});
  assert.deepEqual(b.board.told, {kind: 'unfair'}, `${p.id}: somebody would swap in one`);
  refuse(p, b, {type: 'all'}, 'That’s all twice on one shelf');
  const back = carry(b, undo(b));
  assert.deepEqual(back.board.told, {kind: 'unfair'}, `${p.id}: Undo keeps the refusal on the same shelf`);
  assert.ok(validBoard(p, back.board), `${p.id}: and the board stays valid`);
  refuse(p, back, {type: 'all'}, 'That’s all again after Undo');
  assert.deepEqual(carry(back, undo(back)).board.told, {kind: 'more'}, `${p.id}: Undo to the empty shelf brings back that shelf’s own refusal`);
  steps += hintsSolve(p, b, 'after an unfair That’s all');
  // Every fair way but one: "There is another."; one too many: "Somebody would swap in one."
  let c = all.slice(1).reduce(keep, fresh);
  c = play(p, c, {type: 'all'});
  assert.deepEqual(c.board.told, {kind: 'more'}, `${p.id}: one way missing`);
  steps += hintsSolve(p, c, 'with one way missing');
  let d = keep(c, all[0]);
  assert.equal(d.board.told, null, `${p.id}: a new way lifts the refusal`);
  const extra = play(p, keep(d, unfair), {type: 'all'});
  assert.deepEqual(extra.board.told, {kind: 'unfair'}, `${p.id}: every fair way and one more`);
  const dropped = play(p, extra, {type: 'drop', key: unfair});
  assert.equal(dropped.board.told, null, `${p.id}: taking a way back lifts the refusal`);
  refuse(p, dropped, {type: 'drop', key: unfair}, 'taking back a way not kept');
  d = play(p, dropped, {type: 'all'});
  assert.ok(isSolved(p, d.board), `${p.id}: That’s all with exactly the fair ways`);
  for (const [board, why] of [
    [{...fresh.board, shelf: [...all].reverse()}, 'kept ways out of order'],
    [{...fresh.board, shelf: ['AB']}, 'a kept way of the wrong length'],
    [{...fresh.board, shelf: ['Z'.repeat(goods.length)]}, 'a kept way with an unknown tray'],
    [{...fresh.board, done: true}, 'done with nothing kept'],
    [{...fresh.board, shelf: all, told: {kind: 'more'}}, '“There is another.” with every way kept'],
    [{...fresh.board, shelf: all, told: {kind: 'unfair'}}, '“Somebody would swap” with every kept way fair'],
    [{...fresh.board, shelf: [unfair], told: {kind: 'more'}}, '“There is another.” with an unfair way kept'],
    [{...fresh.board, shelf: [...all, unfair].sort(), done: true}, 'done with an unfair way kept'],
    [{...fresh.board, told: {kind: 'swap', who: ['A']}}, 'a refused Fair'],
    [{...fresh.board, found: []}, 'an extra field']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

// The odd case and its even contrast: Can't is the cards paired one from
// each tray, accepted exactly when an odd number is left over.
function checkHalve(p, row, all) {
  const q = p.parameters, fresh = freshAttempt(p), [U, V] = q.people.map(x => x.id);
  let steps = 0;
  const carry = (from, to) => ({...to, board: mechanicFor(p).carry(p, from.board, to.board)});
  const across = key => { const us = q.goods.filter((g, i) => key[i] === U), vs = q.goods.filter((g, i) => key[i] === V); return us.slice(0, Math.min(us.length, vs.length)).map((g, k) => [g.id, vs[k].id]); };
  refuse(p, fresh, {type: 'cant', pairs: []}, 'Can’t before an attempt');
  assert.equal(all.length === 0, q.goods.length % 2 === 1, `${p.id}: whole cards fail exactly for an odd number`);
  for (const key of everyDivision(q)) {
    const a = putAll(p, fresh, ownersOf(q, key)), pairs = across(key), over = q.goods.length - 2 * pairs.length;
    const c = play(p, a, {type: 'cant', pairs});
    if (over % 2) {
      assert.equal(c.board.claim?.left.length, over, `${p.id}: ${key}: Can’t is shown, ${over} left over`);
      continue;
    }
    assert.deepEqual(c.board.told, {kind: 'over', n: over}, `${p.id}: ${key}: Can’t refused, ${over} left over`);
    assert.equal(c.board.claim, null);
    refuse(p, c, {type: 'cant', pairs}, 'Can’t twice on one arrangement');
    const kept = carry(c, undo(c));
    assert.deepEqual(kept.board.told, c.board.told, `${p.id}: Undo keeps a refused Can’t`);
    assert.ok(validBoard(p, kept.board), `${p.id}: and the board stays valid`);
    refuse(p, kept, {type: 'cant', pairs}, 'Can’t again after Undo');
    // After a refused Fair on the same cards, Undo still keeps the Can't.
    const fair = move(p, a, {type: 'fair'});
    if (fair && fair.board.told?.kind === 'swap') {
      const c2 = play(p, fair, {type: 'cant', pairs}), kept2 = carry(c2, undo(c2));
      assert.deepEqual(kept2.board.told, c.board.told, `${p.id}: ${key}: Undo keeps a refused Can’t over a refused Fair`);
      assert.ok(validBoard(p, kept2.board), `${p.id}: ${key}: and the board stays valid`);
      refuse(p, kept2, {type: 'cant', pairs}, 'Can’t again after Undo past a refused Fair');
    }
    if (pairs.length) assert.equal(play(p, c, {type: 'put', good: pairs[0][0], to: V}).board.told, null, `${p.id}: a card moving clears it`);
    if (over === 4 || over === 0) steps += hintsSolve(p, c, `after a refused Can’t (${over})`);
  }
  if (all.length) {
    // The even contrast: a Can't never stands, so the cut never comes.
    const lop = putAll(p, fresh, ownersOf(q, U.repeat(q.goods.length)));
    refuse(p, lop, {type: 'halve', good: 'R1'}, 'a cut without a Can’t');
    for (const [board, why] of [
      [{...lop.board, claim: {left: ['R1', 'R2', 'R3', 'R4'], pairs: []}}, 'a Can’t with an even number left over'],
      [{...lop.board, told: {kind: 'over', n: 2}}, 'a refusal with the wrong count'],
      [{...lop.board, told: {kind: 'over', n: 3}}, 'a refusal with an odd count']
    ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    return steps;
  }
  assert.equal(labelled(q, halves(q, 'R3')).length, row.halved, `${p.id}: fair divisions with one card cut`);
  let a = putAll(p, fresh, {R1: U, R2: U, R3: V});
  a = play(p, a, {type: 'fair'});
  assert.deepEqual(a.board.told, {kind: 'swap', who: [V]}, `${p.id}: V would swap`);
  refuse(p, a, {type: 'halve', good: 'R3'}, 'a cut before Can’t');
  refuse(p, a, {type: 'cant', pairs: [['R1', 'R1']]}, 'a card paired with itself');
  refuse(p, a, {type: 'cant', pairs: [['R1', 'R4']]}, 'an unknown card');
  refuse(p, a, {type: 'cant', pairs: []}, 'no pairs while a pair across is left');
  refuse(p, a, {type: 'cant', pairs: [['R1', 'R2']]}, 'a pair from one tray');
  refuse(p, a, {type: 'cant', pairs: [['R1', 'R3'], ['R2', 'R3']]}, 'a card in two pairs');
  steps += hintsSolve(p, a, 'after a refused Fair');
  const claimed = play(p, a, {type: 'cant', pairs: [['R3', 'R1']]});
  assert.deepEqual(claimed.board.claim, {left: ['R2'], pairs: [['R1', 'R3']]}, `${p.id}: one left over`);
  refuse(p, claimed, {type: 'cant', pairs: [['R1', 'R3']]}, 'Can’t twice');
  const cut = play(p, claimed, {type: 'halve', good: 'R2'});
  assert.deepEqual(Object.keys(cut.board.at).sort(), ['R1', 'R2a', 'R2b', 'R3'], `${p.id}: two halves`);
  assert.equal(cut.board.at.R2a, U, `${p.id}: halves stay where the card was`);
  refuse(p, cut, {type: 'halve', good: 'R1'}, 'a second cut');
  // Undo takes back the cut and the moves, not the claim.
  const back = carry(claimed, undo(carry(cut, undo(cut))));
  assert.ok(back.board.claim, `${p.id}: Undo keeps a shown Can’t`);
  assert.ok(validBoard(p, back.board), `${p.id}: and the board stays valid`);
  steps += hintsSolve(p, back, 'after Undo past the claim');
  steps += hintsSolve(p, cut, 'after the cut');
  const win = play(p, putAll(p, cut, {R1: U, R2a: U, R2b: V, R3: V}), {type: 'fair'});
  assert.ok(isSolved(p, win.board), `${p.id}: a whole card and a half each`);
  // All three in one tray: nothing pairs across, three are left over, and
  // that odd number is a right Can't too.
  const lop = putAll(p, fresh, {R1: U, R2: U, R3: U});
  const all3 = play(p, lop, {type: 'cant', pairs: []});
  assert.deepEqual(all3.board.claim, {left: ['R1', 'R2', 'R3'], pairs: []}, `${p.id}: three left over`);
  steps += hintsSolve(p, all3, 'after Can’t with three left over');
  refuse(p, putAll(p, fresh, {R1: U, R2: V, R3: U}), {type: 'cant', pairs: [['R1', 'R2'], ['R2', 'R3']]}, 'overlapping pairs');
  for (const [board, why] of [
    [{...fresh.board, claim: {left: ['R2'], pairs: [['R1', 'R2']]}}, 'a claim whose left-over card is paired'],
    [{...fresh.board, claim: {odd: 'R3', pairs: [['R1', 'R2']]}}, 'an old claim'],
    [{...fresh.board, cut: 'R3'}, 'a cut without a claim'],
    [{...fresh.board, done: true}, 'done with nothing given'],
    [{...cut.board, at: {R1: U, R2: V, R3: U, R3a: U, R3b: V}}, 'a cut card still whole'],
    [{...fresh.board, told: {kind: 'over', n: 3}}, 'a refused Can’t before an attempt'],
    [{...lop.board, told: {kind: 'over', n: 3}}, 'a refused Can’t with an odd number left over'],
    [{...lop.board, told: {kind: 'over', n: 0}}, 'a refusal with the wrong count']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkFav(p, row) {
  const q = p.parameters, fresh = freshAttempt(p);
  let steps = 0;
  const {size} = kuhn(q), n = q.people.length;
  assert.equal(countMatchings(q), row.ways, `${p.id}: ways by counting over subsets`);
  assert.equal(size === n, row.ways > 0, `${p.id}: augmenting paths agree`);
  refuse(p, fresh, {type: 'cant', group: ['A', 'B']}, 'Can’t before an attempt');
  refuse(p, fresh, {type: 'give', item: 'moon', to: 'A'}, 'an unknown shape');
  refuse(p, fresh, {type: 'give', item: q.items[0].id, to: 'Z'}, 'an unknown person');
  refuse(p, fresh, {type: 'give', item: q.items[0].id, to: null}, 'a shape already in the pile');
  // Giving to someone who holds a shape swaps the two.
  let a = play(p, fresh, {type: 'give', item: q.items[0].id, to: 'A'});
  a = play(p, a, {type: 'give', item: q.items[1].id, to: 'A'});
  assert.equal(a.board.at[q.items[0].id], null, `${p.id}: the shape A held goes back to the pile`);
  a = play(p, a, {type: 'give', item: q.items[0].id, to: 'B'});
  const swapped = play(p, a, {type: 'give', item: q.items[0].id, to: 'A'});
  assert.equal(swapped.board.at[q.items[1].id], 'B', `${p.id}: a shape given from one person to another swaps`);
  steps += hintsSolve(p, fresh, 'from fresh');
  steps += hintsSolve(p, swapped, 'after shuffling shapes');
  // A group that likes enough shapes is refused, every time it is asked.
  const roomy = q.people.map(x => x.id).slice(0, 2);
  const told = likes(q, roomy).size >= 2 ? play(p, swapped, {type: 'cant', group: roomy}) : null;
  if (told) {
    assert.equal(told.board.told?.kind, 'enough', `${p.id}: a group with enough shapes is refused`);
    assert.equal(told.board.told.liked, likes(q, roomy).size);
    refuse(p, told, {type: 'cant', group: roomy}, 'the same group twice in a row');
    if (row.short) refuse(p, told, {type: 'cant', group: row.short}, 'any group before a shape moves');
    steps += hintsSolve(p, told, 'after a refused Can’t');
    // Undo keeps the refusal while the shapes are where they were.
    const back = {...undo(told), board: mechanicFor(p).carry(p, told.board, undo(told).board)};
    assert.deepEqual(back.board.told, told.board.told, `${p.id}: Undo keeps a refused group`);
    assert.ok(validBoard(p, back.board), `${p.id}: and the board stays valid`);
    refuse(p, back, {type: 'cant', group: roomy}, 'the same group again after Undo');
    const moved = play(p, back, {type: 'give', item: q.items[0].id, to: null});
    assert.equal(moved.board.told, null, `${p.id}: a shape moving clears the refusal`);
    if (row.short) assert.ok(isSolved(p, play(p, moved, {type: 'cant', group: row.short}).board), `${p.id}: Can’t opens again once a shape moves`);
  }
  refuse(p, swapped, {type: 'cant', group: ['A']}, 'a group of one');
  refuse(p, swapped, {type: 'cant', group: ['B', 'A']}, 'a group out of order');
  refuse(p, swapped, {type: 'cant', group: ['A', 'A']}, 'a person twice');
  if (row.ways) {
    // Every way is a solve, and every group likes enough shapes.
    for (let m = 1; m < 1 << n; m++) { const g = q.people.filter((_, i) => m >> i & 1).map(x => x.id); assert.ok(likes(q, g).size >= g.length, `${p.id}: Hall holds for ${g}`); }
    for (const way of p.solution.ways) {
      let w = fresh;
      for (const [item, to] of Object.entries(way)) w = play(p, w, {type: 'give', item, to});
      assert.ok(isSolved(p, w.board), `${p.id}: ${JSON.stringify(way)} is a solve`);
    }
    assert.equal(p.solution.ways.length, row.ways);
  } else {
    const k = konig(q);
    assert.ok(k && likes(q, k.people).size < k.people.length, `${p.id}: König finds a short group`);
    let smallest = null;
    for (let m = 1; m < 1 << n; m++) { const g = q.people.filter((_, i) => m >> i & 1).map(x => x.id); if (likes(q, g).size < g.length && (!smallest || g.length < smallest.length)) smallest = g; }
    assert.deepEqual(smallest, row.short, `${p.id}: the smallest short group`);
    assert.deepEqual(p.solution.cant, row.short);
    const won = play(p, swapped, {type: 'cant', group: row.short});
    assert.ok(isSolved(p, won.board), `${p.id}: the short group is accepted`);
    assert.ok(won.board.group, `${p.id}: and kept`);
    if (k.people.join() !== row.short.join()) assert.ok(isSolved(p, play(p, swapped, {type: 'cant', group: k.people}).board), `${p.id}: any short group is accepted`);
    // The first hint leads to an attempt; Can't comes after one.
    assert.equal(nextHint(p, fresh).action.type, 'give', `${p.id}: the first hint gives a shape`);
  }
  for (const [board, why] of [
    [{...fresh.board, at: {...fresh.board.at, [q.items[0].id]: 'A', [q.items[1].id]: 'A'}, tried: true}, 'a person holding two shapes'],
    [{...fresh.board, at: {...fresh.board.at, [q.items[0].id]: 'A'}}, 'a shape given without a move'],
    [{...fresh.board, tried: true, group: ['A', 'B']}, 'a group that likes enough shapes kept as a claim'],
    [{...fresh.board, group: row.short || ['A', 'B']}, 'a claim before an attempt'],
    [{...fresh.board, tried: true, told: {kind: 'enough', group: ['A', 'B'], liked: 9}}, 'a refusal with the wrong count']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkDuel(p, row) {
  const q = p.parameters, fresh = freshAttempt(p), n = q.strip.length;
  let steps = 0;
  const mine = cutsFor(q.strip, q.you), theirs = cutsFor(q.strip, q.them);
  assert.deepEqual(mine.out, [row.cut], `${p.id}: one equal cut for you`);
  assert.deepEqual(theirs.out, [row.theirs], `${p.id}: one equal cut for B`);
  const youL = mine.left[row.theirs], youR = mine.right[n - row.theirs];
  assert.equal(cmp(youL, youR) > 0 ? 'left' : 'right', row.take, `${p.id}: the piece to take`);
  // Both get at least half at the equal cut, whatever B takes.
  const total = mine.left[n];
  for (const side of ['left', 'right']) { const kept = side === 'left' ? mine.right[n - row.cut] : mine.left[row.cut]; assert.equal(cmp(add(kept, kept), total), 0, `${p.id}: half if B takes the ${side}`); }
  // Every other cut is not starred, and at some of them B leaves you less than half.
  let losing = 0;
  for (let k = 1; k < n; k++) {
    const a = play(p, fresh, {type: 'cut', at: k});
    assert.equal(a.board.r1.star, k === row.cut, `${p.id}: cut after ${k}`);
    if (k !== row.cut) {
      const bl = theirs.left[k], br = theirs.right[n - k], yl = mine.left[k], yr = mine.right[n - k];
      const takes = cmp(bl, br) > 0 ? 'left' : cmp(bl, br) < 0 ? 'right' : cmp(yl, yr) < 0 ? 'left' : 'right';
      const kept = takes === 'left' ? yr : yl;
      if (cmp(add(kept, kept), total) < 0) losing++;
      steps += hintsSolve(p, a, `after a cut at ${k}`);
    }
  }
  assert.ok(losing > 0, `${p.id}: some unequal cut leaves you less than half`);
  refuse(p, fresh, {type: 'cut', at: 0}, 'a cut at the end');
  refuse(p, fresh, {type: 'cut', at: n}, 'a cut at the other end');
  refuse(p, fresh, {type: 'cut', at: 1.5}, 'a cut inside a square');
  refuse(p, fresh, {type: 'take', side: 'left'}, 'taking before B has cut');
  const once = play(p, fresh, {type: 'cut', at: row.cut === 1 ? 2 : 1});
  refuse(p, once, {type: 'cut', at: once.board.r1.at}, 'the same cut twice');
  steps += hintsSolve(p, fresh, 'from fresh');
  const r1 = play(p, fresh, {type: 'cut', at: row.cut});
  refuse(p, r1, {type: 'cut', at: row.cut === 1 ? 2 : 1}, 'cutting again after a star');
  const other = row.take === 'left' ? 'right' : 'left';
  refuse(p, r1, {type: 'again'}, 'Again before a take');
  assert.ok(isSolved(p, play(p, r1, {type: 'take', side: row.take}).board), `${p.id}: the bigger piece`);
  // A take is final: after the smaller piece only Again, and Undo keeps it.
  const bad = play(p, r1, {type: 'take', side: other});
  assert.equal(bad.board.r2.star, false, `${p.id}: the smaller piece gets no star`);
  assert.ok(!isSolved(p, bad.board));
  refuse(p, bad, {type: 'take', side: other}, 'the same piece twice');
  refuse(p, bad, {type: 'take', side: row.take}, 'the other piece after a take');
  refuse(p, bad, {type: 'cut', at: row.cut === 1 ? 2 : 1}, 'a new cut without Again');
  const kept = {...undo(bad), board: mechanicFor(p).carry(p, bad.board, undo(bad).board)};
  assert.deepEqual(kept.board.r2, bad.board.r2, `${p.id}: Undo keeps the take`);
  refuse(p, kept, {type: 'take', side: row.take}, 'the other piece after Undo');
  assert.equal(nextHint(p, bad).action.type, 'again', `${p.id}: the hint after a wrong take is Again`);
  assert.deepEqual(play(p, bad, {type: 'again'}).board, fresh.board, `${p.id}: Again starts the duel over`);
  steps += hintsSolve(p, bad, 'after taking the smaller piece');
  for (const [board, why] of [
    [{r1: {at: row.cut === 1 ? 2 : 1, star: true}, r2: null}, 'a star on an unequal cut'],
    [{r1: null, r2: {side: 'left', star: true}}, 'taking before cutting'],
    [{r1: {at: row.cut, star: true}, r2: {side: other, star: true}}, 'a star on the smaller piece'],
    [{r1: {at: row.cut, star: true}, r2: {side: row.take, star: false}}, 'no star on the bigger piece'],
    [{r1: {at: n, star: false}, r2: null}, 'a cut off the strip'],
    [{r1: null}, 'a missing field']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

export async function validateShares() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/shares/shares.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-58')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-58.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'shares');
  const puzzles = pack.puzzles;
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  let hintSteps = 0;
  for (const p of puzzles) {
    const row = TABLE[p.id], q = p.parameters;
    assert.equal(p.mechanic, 'shares');
    assert.equal(p.band, 'all');
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    assert.equal(q.mode, row.mode, `${p.id}: mode`);
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.match(p.provenance, /Week 58|new/i, `${p.id}: provenance names its source`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    assert.ok(!/can.t|press/i.test(p.hints[0]), `${p.id}: the first hint is not a claim`);
    assert.ok(!/\b(can.t|none|impossible|only)\b/i.test(p.title), `${p.id}: the title does not give the answer away`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    for (const forged of [null, [], 'x', {}]) assert.equal(validBoard(p, forged), false, `${p.id}: rejects ${JSON.stringify(forged)}`);
    refuse(p, fresh, {type: 'fly'}, 'an unknown move');
    refuse(p, fresh, null, 'no move');
    hintSteps += q.mode === 'favourites' ? checkFav(p, row) : q.mode === 'duel' ? checkDuel(p, row) : checkTwo(p, row);
    // A tap must stay fast: twenty hints on a fresh board well under 100 ms
    // (the best of five tries, so a busy machine doesn't fail it).
    const tries = Array.from({length: 5}, () => { const t0 = performance.now(); for (let i = 0; i < 20; i++) nextHint(p, fresh); return performance.now() - t0; });
    assert.ok(Math.min(...tries) < 100, `${p.id}: hints are fast`);
  }
  return {puzzles: puzzles.length, hintSteps};
}
export default validateShares;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateShares(), null, 2));
