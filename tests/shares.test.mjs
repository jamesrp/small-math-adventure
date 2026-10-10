// Fair shares: envy and the fair divisions, find one and find every with
// That's all, the odd case with its pairing and the cut, favourites with Can't
// and a short group, cut and choose in two rounds, the view state (lifting,
// pairing, choosing people, the knife), hints, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {shareMechanics, fairKeys, envious, goodsNow, matchings, shortestGroup, likedBy, equalCuts, theyTake, theirCut, stripWorth, pairingLeft} from '../dist/families/shares/shares.js';
import {loadPack} from '../scripts/packs.mjs';

const shares = JSON.parse(await readFile(new URL('../dist/families/shares/shares.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = shareMechanics.shares;
const byId = id => shares.puzzles.find(p => p.id === `shares-${id}`);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const put = (spec) => spec.split(' ').map(s => { const [good, to] = s.split(':'); return {type: 'put', good, to: to === '-' ? null : to}; });
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const solveByHints = (p, a) => { for (let i = 0; i < 60 && !isSolved(p, a.board); i++) a = play(p, a, nextHint(p, a).action); return a; };

test('envy: each person counts every tray with their own card, and a tie is fine', () => {
  const q = byId('01').parameters, goods = goodsNow(q);
  const at = owners => Object.fromEntries(goods.map((g, i) => [g.id, owners[i]]));
  assert.equal(envious(q, goods, at('AAAB')), null, 'B has 3 against 3');
  assert.equal(envious(q, goods, at('AABB')), null, 'A 6 against 4, B 4 against 2');
  assert.equal(envious(q, goods, at('ABBB')), 'A', 'A has 3 against 7');
  assert.equal(envious(q, goods, at('AAAA')), 'B');
  assert.deepEqual(fairKeys(q), ['AAAB', 'AABB', 'ABAB', 'BAAB']);
  assert.equal(fairKeys(byId('05').parameters).length, 5, 'Problem 2: five, with ties');
  assert.equal(fairKeys(byId('02').parameters).length, 0, 'three equal cards for one taste: none');
  assert.equal(fairKeys(byId('02').parameters, 'R3').length, 4, 'with R3 cut: a card and a half each');
});

test('find one: Fair keeps a division nobody would swap, and refuses one with envy', () => {
  const p = byId('01');
  let a = play(p, freshAttempt(p), ...put('R1:B R2:B R3:B B1:A'));
  assert.equal(move(p, freshAttempt(p), {type: 'fair'}), null, 'not with cards on the table');
  a = play(p, a, {type: 'fair'});
  assert.deepEqual(a.board.told, {kind: 'swap', who: 'A'});
  assert.match(view(p, a), /A would swap\./);
  assert.match(view(p, a), /Worth 1 to A/, 'A’s own count of the trays');
  assert.doesNotMatch(view(p, a), /to B"/, 'never B’s numbers beside A’s');
  assert.equal(move(p, a, {type: 'fair'}), null, 'not twice');
  a = play(p, a, ...put('R1:A R2:A R3:A B1:B'), {type: 'fair'});
  assert.ok(isSolved(p, a.board));
});

test('find every: ways found, Found already, There is another, That’s all and its catalog', () => {
  const p = byId('04');
  let a = play(p, freshAttempt(p), {type: 'all'});
  assert.equal(a.board.more, true);
  assert.match(view(p, a), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for a new way');
  a = play(p, a, ...put('R1:A R2:A R3:A B1:B'), {type: 'fair'});
  assert.deepEqual(a.board.found, ['AAAB']);
  assert.equal(a.board.more, false);
  const again = play(p, a, {type: 'put', good: 'R1', to: null}, {type: 'put', good: 'R1', to: 'A'}, {type: 'fair'});
  assert.match(view(p, again), /Found already\./);
  const html = view(p, a);
  assert.match(html, /class="sh-found"/, 'a thumbnail of each way found');
  assert.doesNotMatch(html, /\b1 of 4\b|found: \d/i, 'no count of what is left');
  for (const k of ['AABB', 'ABAB', 'BAAB']) a = play(p, a, ...put(`R1:${k[0]} R2:${k[1]} R3:${k[2]} B1:${k[3]}`).filter(m => a.board.at[m.good] !== m.to), {type: 'fair'});
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  const done = view(p, a);
  assert.match(done, /class="sh-catalog"/, 'the catalog by A’s reds and blues');
  assert.equal((done.match(/<td class="fair"/g) || []).length, 2, 'two kinds of fair way: two reds, three reds');
  assert.match(done, /×3/);
});

test('Undo keeps the ways found and a refused That’s all', () => {
  const p = byId('05');
  let a = play(p, freshAttempt(p), ...put('R1:A R2:A B1:B B2:B'), {type: 'fair'}, {type: 'all'});
  const back = undo(a);
  const kept = mech.carry(p, a.board, back.board);
  assert.deepEqual(kept.found, ['AABB']);
  assert.equal(kept.more, true);
  assert.ok(validBoard(p, kept));
});

test('three reds: Can’t after an attempt, pairing across leaves one, then the cut', () => {
  const p = byId('02');
  const fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'cant', pairs: [['R1', 'R2']]}), null, 'Can’t waits for an attempt');
  assert.match(view(p, fresh), /sh-cant[^>]*disabled/, 'Can’t is off before an attempt');
  let a = play(p, fresh, ...put('R1:U R2:U R3:V'));
  assert.deepEqual(pairingLeft(p.parameters, [['R1', 'R3']]), ['R2']);
  // Can't, then pair across: a second card from the same tray is refused and
  // the taps clear; the pair that leaves nothing more to pair is the claim.
  mech.reset(p);
  mech.ui(p, {claiming: true});
  mech.ui(p, {pair: 'R1'});
  let html = view(p, a, true);
  assert.doesNotMatch(html, /hinted/, 'nothing marks the next tap');
  assert.match(html, /data-ui="\{&quot;pair&quot;:&quot;R2&quot;,&quot;wrong&quot;:true\}"/, 'R2 is in R1’s tray');
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;pairs&quot;:\[\[&quot;R1&quot;,&quot;R3&quot;\]\]\}"/, 'R3 completes the pairing');
  mech.ui(p, {pair: 'R2', wrong: true});
  html = view(p, a, true);
  assert.match(html, /One from each tray\./);
  assert.doesNotMatch(html, /picked|paired/, 'the taps clear');
  a = play(p, a, {type: 'cant', pairs: [['R1', 'R3']]});
  assert.deepEqual(a.board.claim, {odd: 'R2', pairs: [['R1', 'R3']]});
  assert.match(view(p, a), /One left over\./);
  assert.deepEqual(move(p, a, {type: 'fair'}).board.told, {kind: 'swap', who: 'V'}, 'whole cards still leave V wanting to swap');
  a = play(p, a, {type: 'halve', good: 'R2'});
  assert.deepEqual(Object.keys(a.board.at), ['R1', 'R2a', 'R2b', 'R3']);
  assert.match(view(p, a), /Half of R2/);
  a = play(p, a, {type: 'put', good: 'R2b', to: 'V'}, {type: 'fair'});
  assert.ok(isSolved(p, a.board), 'a card and a half each');
});

test('three reds in one tray: Can’t is judged at once and refused, and Undo keeps the refusal', () => {
  const p = byId('02');
  let a = play(p, freshAttempt(p), ...put('R1:U R2:U R3:U'));
  mech.reset(p);
  assert.match(view(p, a, true), /data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;pairs&quot;:\[\]\}"/, 'nothing pairs across, so Can’t is the claim');
  const over = play(p, a, {type: 'cant', pairs: []});
  assert.deepEqual(over.board.told, {kind: 'over', n: 3});
  assert.match(view(p, over), /3 left over\./);
  assert.match(view(p, over), /sh-cant[^>]*disabled/, 'no second try on the same cards');
  const back = {...undo(over), board: mech.carry(p, over.board, undo(over).board)};
  assert.deepEqual(back.board.told, {kind: 'over', n: 3}, 'Undo keeps it');
  assert.equal(move(p, back, {type: 'cant', pairs: []}), null);
  assert.equal(play(p, back, ...put('R3:V')).board.told, null, 'a card moving clears it');
});

test('favourites: giving swaps, Can’t needs a short group, a solve when everyone holds a favourite', () => {
  const p = byId('06'), q = p.parameters;
  assert.equal(matchings(q).length, 0);
  assert.deepEqual(shortestGroup(q), ['A', 'B', 'C']);
  assert.deepEqual(likedBy(q, ['A', 'B', 'C']).sort(), ['circle', 'triangle']);
  let a = play(p, freshAttempt(p), {type: 'give', item: 'circle', to: 'A'}, {type: 'give', item: 'triangle', to: 'A'});
  assert.equal(a.board.at.circle, null, 'A’s circle goes back');
  view(p, a);
  mech.ui(p, {claiming: true});
  for (const x of ['D', 'A']) mech.ui(p, {choose: x});
  assert.doesNotMatch(view(p, a, true), /hinted/, 'nothing marks the people to tap');
  a = play(p, a, {type: 'cant', group: ['A', 'D']});
  const refused = view(p, a, true);
  assert.match(refused, /2 people, 4 shapes\./, 'a group with enough shapes is refused');
  assert.doesNotMatch(refused, /sh-check/, 'the refusal clears the taps');
  assert.equal(move(p, a, {type: 'cant', group: ['A', 'D']}), null, 'not twice');
  // The Check button carries the people tapped.
  mech.ui(p, {claiming: true});
  for (const x of ['C', 'A', 'B']) mech.ui(p, {choose: x});
  assert.match(view(p, a, true), /&quot;group&quot;:\[&quot;A&quot;,&quot;B&quot;,&quot;C&quot;\]/);
  a = play(p, a, {type: 'cant', group: ['A', 'B', 'C']});
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /3 people, 2 shapes\./);
  const easy = byId('03');
  assert.ok(isSolved(easy, play(easy, freshAttempt(easy), ...[['circle', 'B'], ['triangle', 'A'], ['square', 'C'], ['diamond', 'D']].map(([item, to]) => ({type: 'give', item, to}))).board));
});

test('cut and choose: a star for an equal cut, B takes its better piece, then the bigger piece', () => {
  const p = byId('07'), q = p.parameters;
  assert.deepEqual(equalCuts(q.strip, q.you), [4]);
  assert.equal(theirCut(q), 8);
  assert.equal(theyTake(q, 4), 'right', 'B counts the right piece 20');
  assert.equal(theyTake(q, 6), 'right', 'at the join B counts 6 against 18');
  let a = play(p, freshAttempt(p), {type: 'cut', at: 6});
  assert.equal(a.board.r1.star, false);
  assert.match(view(p, a), /Not equal for you\./);
  assert.match(view(p, a), /Worth 18 to you/);
  a = play(p, a, {type: 'cut', at: 4});
  assert.equal(a.board.r1.star, true);
  const html = view(p, a);
  assert.match(html, /Half for sure/);
  assert.match(html, /Take a piece\./);
  a = play(p, a, {type: 'take', side: 'right'});
  assert.match(view(p, a), /The other piece is more for you\./);
  a = play(p, a, {type: 'take', side: 'left'});
  assert.ok(isSolved(p, a.board));
  assert.equal(stripWorth(q.strip, q.you, 0, 8), 20);
});

test('the knife is view state: a tap places it, Cut makes the move', () => {
  const p = byId('10');
  mech.reset(p);
  const a = freshAttempt(p);
  assert.match(view(p, a, true), /sh-cutnow[^>]*disabled/);
  mech.ui(p, {knife: 3});
  const html = view(p, a, true);
  assert.match(html, /class="sh-knife"/);
  assert.match(html, /&quot;type&quot;:&quot;cut&quot;,&quot;at&quot;:3/);
  mech.ui(p, {knife: 99});
  assert.doesNotMatch(view(p, a, true), /class="sh-knife"/, 'a knife off the strip is ignored');
  assert.match(view(p, a), /B: card face down/, 'B’s card is face down until the cut');
});

test('hints solve every puzzle from fresh and after a wrong move, and never open with a claim', () => {
  for (const p of shares.puzzles) {
    const fresh = freshAttempt(p);
    const first = nextHint(p, fresh);
    assert.equal(first.type, 'move', p.id);
    assert.ok(!['cant', 'fair', 'all'].includes(first.action.type), `${p.id}: the first hint acts on the board`);
    assert.ok(isSolved(p, solveByHints(p, fresh).board), `${p.id} from fresh`);
  }
});

test('saves are checked', () => {
  const p = byId('04'), fresh = freshAttempt(p);
  assert.equal(validBoard(p, {...fresh.board, found: ['AAAA']}), false, 'a found way with envy');
  assert.equal(validBoard(p, {...fresh.board, at: {...fresh.board.at, R1: 'C'}}), false, 'an unknown tray');
  assert.equal(validBoard(byId('07'), {r1: {at: 6, star: true}, r2: null}), false, 'a star on an unequal cut');
  assert.equal(validBoard(byId('06'), {...freshAttempt(byId('06')).board, tried: true, group: ['A', 'D']}), false, 'a claim that is not short');
});

test('every puzzle renders a board with its controls and no nested buttons', () => {
  for (const p of shares.puzzles) {
    const a = freshAttempt(p);
    for (const pick of [null, 'R1', 'circle']) {
      mech.reset(p);
      if (pick) mech.ui(p, {pick});
      const html = view(p, a, true);
      assert.match(html, /data-mechanic-wire="shares"/, p.id);
      const board = html.slice(html.indexOf('sh-puzzle'));
      let depth = 0, nested = false;
      for (const m of board.matchAll(/<(\/?)button\b/g)) { depth += m[1] ? -1 : 1; if (depth > 1) nested = true; }
      assert.equal(nested, false, `${p.id}: no button inside a button (${pick})`);
    }
  }
});
