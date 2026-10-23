// Fair shares: envy and the fair divisions, find one with Fair, find every
// with an unjudged shelf and That's all, the odd case with its pairing and the
// cut and its even contrast, favourites with Can't and a short group, cut and
// choose in two rounds with a final take, the view state (lifting, pairing,
// choosing people, the knife), hints, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {shareMechanics, fairKeys, envious, enviousAll, goodsNow, matchings, shortestGroup, likedBy, equalCuts, theyTake, theirCut, stripWorth, pairingLeft} from '../dist/families/shares/shares.js';
import {loadPack} from '../scripts/packs.mjs';

const shares = JSON.parse(await readFile(new URL('../dist/families/shares/shares.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = shareMechanics.shares;
const byId = id => shares.puzzles.find(p => p.id === `shares-${id}`);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const put = (spec) => spec.split(' ').map(s => { const [good, to] = s.split(':'); return {type: 'put', good, to: to === '-' ? null : to}; });
// view(p, a) draws a fresh board; view(p, a, true) keeps the view state set
// since the last drawing of the same puzzle.
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const solveByHints = (p, a) => { for (let i = 0; i < 60 && !isSolved(p, a.board); i++) a = play(p, a, nextHint(p, a).action); return a; };
const carried = (p, from) => { const to = undo(from); return {...to, board: mech.carry(p, from.board, to.board)}; };

test('envy: each person counts every tray with their own card, and a tie is fine', () => {
  const q = byId('01').parameters, goods = goodsNow(q);
  const at = owners => Object.fromEntries(goods.map((g, i) => [g.id, owners[i]]));
  assert.equal(envious(q, goods, at('AAAB')), null, 'B has 3 against 3');
  assert.equal(envious(q, goods, at('AABB')), null, 'A 6 against 4, B 4 against 2');
  assert.equal(envious(q, goods, at('ABBB')), 'A', 'A has 3 against 7');
  assert.equal(envious(q, goods, at('AAAA')), 'B');
  assert.deepEqual(enviousAll(q, goods, at('ABBA')), ['A', 'B'], 'A 4 against 6, B 2 against 4');
  assert.deepEqual(fairKeys(q), ['AAAB', 'AABB', 'ABAB', 'BAAB']);
  assert.equal(fairKeys(byId('06').parameters).length, 5, 'Problem 2: five, with ties');
  assert.equal(fairKeys(byId('02').parameters).length, 0, 'three equal cards for one taste: none');
  assert.equal(fairKeys(byId('02').parameters, 'R3').length, 4, 'with R3 cut: a card and a half each');
  assert.equal(fairKeys(byId('03').parameters).length, 6, 'four equal cards: two each');
});

test('find one: Fair checks a division and names everybody who would swap, with no numbers', () => {
  const p = byId('01');
  assert.equal(move(p, freshAttempt(p), {type: 'fair'}), null, 'not with cards on the table');
  let a = play(p, freshAttempt(p), ...put('R1:A R2:B R3:B B1:A'), {type: 'fair'});
  assert.deepEqual(a.board.told, {kind: 'swap', who: ['A', 'B']});
  const html = view(p, a);
  assert.match(html, /A and B would swap\./);
  assert.doesNotMatch(html, /Worth \d+ to|sh-view/, 'no counts of the trays');
  assert.equal(move(p, a, {type: 'fair'}), null, 'not twice');
  a = play(p, a, ...put('R2:A R3:A B1:B'), {type: 'fair'});
  assert.ok(isSolved(p, a.board));
});

test('find every: Keep shelves a way unjudged; That’s all judges the shelf once', () => {
  const p = byId('05');
  let a = play(p, freshAttempt(p), {type: 'all'});
  assert.deepEqual(a.board.told, {kind: 'more'});
  assert.match(view(p, a), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for the shelf to change');
  assert.equal(move(p, a, {type: 'fair'}), null, 'no Fair here');
  // An unfair way goes on the shelf without a word.
  a = play(p, a, ...put('R1:A R2:B R3:B B1:A'), {type: 'keep'});
  assert.deepEqual(a.board.shelf, ['ABBA']);
  assert.equal(a.board.told, null);
  let html = view(p, a);
  assert.doesNotMatch(html, /sh-told/, 'no refusal or note');
  assert.match(html, /class="sh-found"/, 'a picture of each way kept');
  assert.match(html, /sh-keep[^>]*disabled/, 'a way already kept can’t be kept again');
  assert.doesNotMatch(html, /\b1 of 4\b|kept: \d/i, 'no count of what is left');
  a = play(p, a, ...put('R2:A R3:A B1:B'), {type: 'keep'}, {type: 'all'});
  assert.deepEqual(a.board.told, {kind: 'unfair'});
  assert.match(view(p, a), /Somebody would swap in one\./);
  assert.equal(move(p, a, {type: 'all'}), null);
  assert.deepEqual(carried(p, a).board.told, {kind: 'unfair'}, 'Undo keeps the refusal on the same shelf');
  a = play(p, a, {type: 'drop', key: 'ABBA'});
  assert.equal(a.board.told, null, 'taking a way back lifts it');
  for (const k of ['AABB', 'ABAB', 'BAAB']) a = play(p, a, ...put(`R1:${k[0]} R2:${k[1]} R3:${k[2]} B1:${k[3]}`).filter(m => a.board.at[m.good] !== m.to), {type: 'keep'});
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  html = view(p, a);
  assert.match(html, /class="sh-catalog"/, 'the catalog by A’s reds and blues');
  assert.equal((html.match(/<td class="fair"/g) || []).length, 2, 'two kinds of fair way: two reds, three reds');
  assert.match(html, /×3/);
});

test('three reds: Can’t after an attempt, pairing across leaves an odd number, then the cut', () => {
  const p = byId('02');
  const fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'cant', pairs: [['R1', 'R2']]}), null, 'Can’t waits for an attempt');
  assert.match(view(p, fresh), /sh-cant[^>]*disabled/, 'Can’t is off before an attempt');
  let a = play(p, fresh, ...put('R1:U R2:U R3:V'));
  assert.deepEqual(pairingLeft(p.parameters, [['R1', 'R3']]), ['R2']);
  // Can't, then pair across: a second card from the same tray is refused and
  // the taps clear; the pair that leaves nothing more to pair is the claim.
  view(p, a);
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
  assert.deepEqual(a.board.claim, {left: ['R2'], pairs: [['R1', 'R3']]});
  assert.match(view(p, a), /One left over\./);
  assert.deepEqual(move(p, a, {type: 'fair'}).board.told, {kind: 'swap', who: ['V']}, 'whole cards still leave V wanting to swap');
  // Moving a paired card across ends the pair marks.
  const moved = play(p, a, ...put('R3:U'));
  assert.doesNotMatch(view(p, moved), /One left over|paired/);
  a = play(p, a, {type: 'halve', good: 'R2'});
  assert.deepEqual(Object.keys(a.board.at), ['R1', 'R2a', 'R2b', 'R3']);
  assert.match(view(p, a), /Half of R2/);
  a = play(p, a, {type: 'put', good: 'R2b', to: 'V'}, {type: 'fair'});
  assert.ok(isSolved(p, a.board), 'a card and a half each');
});

test('three reds in one tray: three left over is a right Can’t too', () => {
  const p = byId('02');
  const a = play(p, freshAttempt(p), ...put('R1:U R2:U R3:U'));
  assert.match(view(p, a), /data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;pairs&quot;:\[\]\}"/, 'nothing pairs across, so Can’t is the claim');
  const c = play(p, a, {type: 'cant', pairs: []});
  assert.deepEqual(c.board.claim, {left: ['R1', 'R2', 'R3'], pairs: []});
  assert.match(view(p, c), /3 left over\./);
  assert.ok(isSolved(p, solveByHints(p, c).board));
});

test('four reds: Can’t is refused with the even number left over, and the refusal stays through Undo', () => {
  const p = byId('03');
  let a = play(p, freshAttempt(p), ...put('R1:U R2:U R3:U R4:V'));
  const c = play(p, a, {type: 'cant', pairs: [['R1', 'R4']]});
  assert.deepEqual(c.board.told, {kind: 'over', n: 2});
  assert.equal(c.board.claim, null);
  assert.match(view(p, c), /2 left over\./);
  assert.match(view(p, c), /sh-cant[^>]*disabled/, 'no second try on the same cards');
  const back = carried(p, c);
  assert.deepEqual(back.board.told, {kind: 'over', n: 2}, 'Undo keeps it');
  assert.equal(move(p, back, {type: 'cant', pairs: [['R1', 'R4']]}), null);
  a = play(p, back, ...put('R3:V'));
  assert.equal(a.board.told, null, 'a card moving clears it');
  const even = play(p, a, {type: 'cant', pairs: [['R1', 'R3'], ['R2', 'R4']]});
  assert.match(view(p, even), /They pair up\./);
  assert.ok(isSolved(p, play(p, even, {type: 'fair'}).board), 'two each is fair');
  assert.equal(move(p, play(p, freshAttempt(p), ...put('R1:U R2:U R3:U R4:U')), {type: 'halve', good: 'R1'}), null, 'no cut without a right Can’t');
});

test('four reds: a refused Can’t after a refused Fair on the same cards stays through Undo', () => {
  const p = byId('03');
  const placed = play(p, freshAttempt(p), ...put('R1:U R2:U R3:U R4:V'));
  const fair = play(p, placed, {type: 'fair'});
  assert.deepEqual(fair.board.told, {kind: 'swap', who: ['V']});
  const c = play(p, fair, {type: 'cant', pairs: [['R1', 'R4']]});
  assert.deepEqual(c.board.told, {kind: 'over', n: 2});
  // One step back, Fair's line gives way to the refusal.
  const back = carried(p, c);
  assert.deepEqual(back.board.told, {kind: 'over', n: 2}, 'Undo keeps the refused Can’t');
  assert.ok(validBoard(p, back.board));
  assert.equal(move(p, back, {type: 'cant', pairs: [['R1', 'R4']]}), null, 'no second Can’t on the same cards');
  assert.match(view(p, back), /sh-cant[^>]*disabled/);
  // One press as the app takes it goes on past the steps that draw the same,
  // to the board before R4 moved: where Undo lands without the Fair.
  const press = a => { view(p, a); return undoPress(p, a, b => view(p, b, true)); };
  const landed = press(c);
  assert.equal(landed.history.length, 3);
  assert.equal(landed.board.at.R4, null);
  assert.equal(landed.board.told, null);
  assert.deepEqual(landed.board, press(play(p, placed, {type: 'cant', pairs: [['R1', 'R4']]})).board);
});

test('favourites: giving swaps, Can’t needs a short group and shuts after a refusal', () => {
  const p = byId('07'), q = p.parameters;
  assert.equal(matchings(q).length, 0);
  assert.deepEqual(shortestGroup(q), ['A', 'C', 'D'], 'the short group is not the top rows');
  assert.deepEqual(likedBy(q, ['A', 'C', 'D']).sort(), ['circle', 'triangle']);
  let a = play(p, freshAttempt(p), {type: 'give', item: 'circle', to: 'A'}, {type: 'give', item: 'triangle', to: 'A'});
  assert.equal(a.board.at.circle, null, 'A’s circle goes back');
  view(p, a);
  mech.ui(p, {claiming: true});
  for (const x of ['B', 'A']) mech.ui(p, {choose: x});
  assert.doesNotMatch(view(p, a, true), /hinted/, 'nothing marks the people to tap');
  a = play(p, a, {type: 'cant', group: ['A', 'B']});
  const refused = view(p, a, true);
  assert.match(refused, /2 people, 4 shapes\./, 'a group with enough shapes is refused');
  assert.doesNotMatch(refused, /sh-check/, 'the refusal clears the taps');
  assert.match(refused, /sh-cant[^>]*disabled/, 'Can’t shuts until a shape moves');
  assert.equal(move(p, a, {type: 'cant', group: ['A', 'C', 'D']}), null, 'no group at all before a shape moves');
  assert.deepEqual(carried(p, a).board.told, a.board.told, 'Undo keeps the refusal');
  a = play(p, a, {type: 'give', item: 'circle', to: 'C'});
  // The Check button carries the people tapped.
  view(p, a);
  mech.ui(p, {claiming: true});
  for (const x of ['D', 'A', 'C']) mech.ui(p, {choose: x});
  assert.match(view(p, a, true), /&quot;group&quot;:\[&quot;A&quot;,&quot;C&quot;,&quot;D&quot;\]/);
  a = play(p, a, {type: 'cant', group: ['A', 'C', 'D']});
  assert.ok(isSolved(p, a.board));
  const done = view(p, a);
  assert.match(done, /3 people, 2 shapes\./);
  assert.equal((done.match(/sh-item[^"]*ringed/g) || []).length, 2, 'both of their shapes are ringed, wherever they are');
  const easy = byId('04');
  assert.ok(isSolved(easy, play(easy, freshAttempt(easy), ...[['circle', 'B'], ['triangle', 'A'], ['square', 'C'], ['diamond', 'D']].map(([item, to]) => ({type: 'give', item, to}))).board));
});

test('cut and choose: a star for an equal cut, only your own counts, and a final take', () => {
  const p = byId('08'), q = p.parameters;
  assert.deepEqual(equalCuts(q.strip, q.you), [4]);
  assert.equal(theirCut(q), 8);
  assert.equal(theyTake(q, 4), 'right', 'B counts the right piece 20');
  assert.equal(theyTake(q, 6), 'right', 'at the join B counts 6 against 18');
  let a = play(p, freshAttempt(p), {type: 'cut', at: 6});
  assert.equal(a.board.r1.star, false);
  let html = view(p, a);
  assert.match(html, /Not equal for you\./);
  assert.match(html, /Worth 18 to you/, 'your own piece');
  assert.doesNotMatch(html, /Worth 6 to you/, 'not the piece B took');
  assert.match(html, /sh-tok sh-on[^>]*>B</, 'B’s token on B’s piece');
  a = play(p, a, {type: 'cut', at: 4});
  assert.equal(a.board.r1.star, true);
  html = view(p, a);
  assert.match(html, /Half for sure/);
  assert.match(html, /Take a piece\./);
  assert.equal((html.match(/class="sh-worth"/g) || []).length, 1, 'one number: your own piece');
  const wrong = play(p, a, {type: 'take', side: 'right'});
  html = view(p, wrong);
  assert.match(html, /The other piece is more for you\./);
  assert.match(html, /Worth 4 to you/);
  assert.doesNotMatch(html, /Worth 20 to you/);
  assert.equal(move(p, wrong, {type: 'take', side: 'left'}), null, 'the take is final');
  assert.deepEqual(carried(p, wrong).board.r2, wrong.board.r2, 'Undo keeps it');
  assert.deepEqual(play(p, wrong, {type: 'again'}).board, freshAttempt(p).board, 'Again starts over');
  a = play(p, a, {type: 'take', side: 'left'});
  assert.ok(isSolved(p, a.board));
  assert.equal(stripWorth(q.strip, q.you, 0, 8), 20);
});

test('the knife is view state: a tap places it, Cut makes the move', () => {
  const p = byId('11');
  const a = freshAttempt(p);
  assert.match(view(p, a), /sh-cutnow[^>]*disabled/);
  mech.ui(p, {knife: 3});
  const html = view(p, a, true);
  assert.match(html, /class="sh-knife"/);
  assert.match(html, /&quot;type&quot;:&quot;cut&quot;,&quot;at&quot;:3/);
  mech.ui(p, {knife: 99});
  assert.doesNotMatch(view(p, a, true), /class="sh-knife"/, 'a knife off the strip is ignored');
  assert.match(view(p, a), /B: card face down/, 'B’s card is face down until the cut');
});

test('view state lasts while a puzzle is on screen', () => {
  const p = byId('11'), other = byId('08');
  view(p, freshAttempt(p));
  mech.ui(p, {knife: 3});
  assert.match(view(p, freshAttempt(p), true), /class="sh-knife"/);
  view(other, freshAttempt(other));
  assert.doesNotMatch(view(p, freshAttempt(p), true), /class="sh-knife"/, 'drawing another puzzle clears it');
});

test('hints solve every puzzle from fresh, never open with a claim, and never say Press Can’t', () => {
  for (const p of shares.puzzles) {
    const fresh = freshAttempt(p);
    const first = nextHint(p, fresh);
    assert.equal(first.type, 'move', p.id);
    assert.ok(!['cant', 'fair', 'all', 'keep'].includes(first.action.type), `${p.id}: the first hint acts on the board`);
    let a = fresh;
    for (let i = 0; i < 60 && !isSolved(p, a.board); i++) {
      const h = nextHint(p, a);
      assert.doesNotMatch(h.text, /Press Can/, `${p.id}: ${h.text}`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id} from fresh`);
  }
});

test('saves are checked', () => {
  const p = byId('05'), fresh = freshAttempt(p);
  assert.equal(validBoard(p, {...fresh.board, shelf: ['AAAA'], done: true}), false, 'done with a way somebody would swap');
  assert.equal(validBoard(p, {...fresh.board, shelf: ['AAAA']}), true, 'a kept way is not judged until That’s all');
  assert.equal(validBoard(p, {...fresh.board, at: {...fresh.board.at, R1: 'C'}}), false, 'an unknown tray');
  assert.equal(validBoard(byId('08'), {r1: {at: 6, star: true}, r2: null}), false, 'a star on an unequal cut');
  assert.equal(validBoard(byId('07'), {...freshAttempt(byId('07')).board, tried: true, group: ['A', 'B']}), false, 'a claim that is not short');
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
