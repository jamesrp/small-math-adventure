// Pairs that stay: blocking pairs and who says no, claims checked only when
// made, the lock after a wrong Stays, finding every pairing that can stay,
// That's all, one-strip repairs and the Can't certificate, designing strips,
// last choices, the playground, taps, hints, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {matchingMechanics, blockersOf, blocks, saysNo, wants, stableOf, canStay, pairUp, partnerOf, repairsOf, disjointBlockers, lastOnes, isPairing, isStrip, swapsBetween, swapToward, profilesOf, tokenMode, cellsLive, tapAction, listsOf} from '../dist/families/matching/matching.js';
import {loadPack} from '../scripts/packs.mjs';

const matching = JSON.parse(await readFile(new URL('../dist/families/matching/matching.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = matchingMechanics.matching;
const byId = id => matching.puzzles.find(p => p.id === id);
const P = n => byId(`matching-${String(n).padStart(2, '0')}`);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, why || `${JSON.stringify(action)} is refused`);
const pair = (c, s) => ({type: 'pair', c, s});
const block = (c, s) => ({type: 'block', c, s});
const swap = (owner, i, j) => ({type: 'swap', owner, i, j});
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const visible = html => html.replace(/<p class="sr-only"[\s\S]*?<\/p>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('the pack: twelve puzzles over three levels and a playground, grade-free, with sources', () => {
  const list = matching.puzzles.filter(p => p.band === 'all');
  assert.equal(list.length, 12);
  assert.deepEqual(list.map(p => p.number), Array.from({length: 12}, (_, i) => i + 1));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(list.some(p => p.difficulty_level === level));
  assert.ok(byId('matching-playground'));
  for (const p of matching.puzzles) {
    assert.equal(p.mechanic, 'matching');
    assert.ok(p.parent.sourceIds.every(id => matching.sources.some(s => s.id === id)));
    assert.doesNotMatch(JSON.stringify(p), /\b(marr|bride|groom|husband|wife|boy|girl|romance|love|date)\w*/i, `${p.id}: no people or romance`);
    assert.doesNotMatch(`${p.visibleObjective} ${p.objective} ${p.controls}`, /grade|K–1|2–3|4–5/i, `${p.id}: the board names no grade`);
  }
});

test('blocking pairs need a yes from both letters', () => {
  const q = P(1).parameters;
  assert.deepEqual(blockersOf(q, q.lists, q.pairing), ['AY']);
  assert.ok(wants(q, q.lists, q.pairing, 'B', 'X'), 'B would rather have X');
  assert.equal(blocks(q, q.lists, q.pairing, 'B', 'X'), false, 'but X keeps A');
  assert.deepEqual(saysNo(q, q.lists, q.pairing, 'B', 'X'), ['X']);
  assert.deepEqual(blockersOf(P(5).parameters, P(5).parameters.lists, 'YXZ'), ['CX']);
  assert.deepEqual(blockersOf(P(7).parameters, P(7).parameters.lists, 'YZX'), ['AX', 'BX']);
  const two = P(2).parameters;
  assert.ok(canStay(two, two.lists, 'XY'));
  assert.deepEqual(blockersOf(two, two.lists, 'YX'), ['AX']);
});

test('pairings that can stay: a forced pair, everyone wants X, two blocks', () => {
  assert.deepEqual(stableOf(P(8).parameters, P(8).parameters.lists), ['YXZW', 'ZXYW', 'ZYXW']);
  assert.deepEqual(stableOf(P(9).parameters, P(9).parameters.lists), ['WYZX', 'ZYWX']);
  assert.deepEqual(stableOf(P(10).parameters, P(10).parameters.lists), ['WXYZ', 'WXZY', 'XWYZ', 'XWZY']);
  const q = P(8).parameters;
  assert.equal(pairUp(q, 'WXYZ', 'A', 'Y'), 'YXWZ', 'A takes Y; A’s old partner W goes to C, who had Y');
  assert.equal(partnerOf(q, 'YXWZ', 'W'), 'C');
  assert.ok(isPairing(q, 'ZYXW') && !isPairing(q, 'ZZXW'));
  assert.ok(isStrip(q, 'A', 'WXYZ') && !isStrip(q, 'A', 'ABCD'));
  assert.equal(swapsBetween('XYZ', 'ZYX'), 1);
  assert.equal(swapsBetween('WXYZ', 'XYZW'), 3);
  assert.deepEqual(swapToward('XYZ', 'YZX'), [0, 1]);
  assert.equal(swapToward('XYZ', 'XYZ'), null);
});

test('one-strip repairs, and two blocking pairs with no letter in common', () => {
  const r = n => { const q = P(n).parameters; return repairsOf(q, q.lists, q.pairing).map(x => `${x.owner}:${x.order}`); };
  assert.deepEqual(r(3), ['A:XY', 'Y:BA']);
  assert.deepEqual(r(4), []);
  assert.deepEqual(r(7), ['X:CBA', 'X:CAB']);
  const q = P(4).parameters;
  assert.deepEqual(disjointBlockers(q, q.lists, q.pairing), ['AY', 'BX']);
});

test('check: a one-sided claim is told who says no; the right claim solves; Stays is checked', () => {
  const p = P(1);
  let a = play(p, freshAttempt(p), block('B', 'X'));
  assert.equal(isSolved(p, a.board), false);
  assert.match(visible(view(p, a)), /X says no\./);
  refuse(p, a, block('B', 'X'), 'the same claim twice');
  refuse(p, a, block('A', 'X'), 'A and X are together');
  refuse(p, a, pair('A', 'Y'), 'the pairing is drawn');
  a = play(p, a, {type: 'stays'});
  assert.equal(isSolved(p, a.board), false);
  assert.match(visible(view(p, a)), /Can’t stay\./);
  a = play(p, a, block('A', 'Y'));
  assert.ok(isSolved(p, a.board));
  assert.doesNotMatch(visible(view(p, a)), /says no/);
  const two = P(2);
  const stays = play(two, freshAttempt(two), {type: 'stays'});
  assert.ok(isSolved(two, stays.board));
  // Its certificate: every wish drawn dotted, and the partner kept.
  const html = view(two, stays);
  assert.equal((html.match(/class="wish"/g) || []).length, 2, 'B wants X and Y wants A');
  assert.match(html, /sm-cell partner keep/, 'the partner each says no for');
});

test('find every: a wrong Stays holds the pairing until a blocking pair is tapped', () => {
  const p = P(10);
  let a = freshAttempt(p);
  assert.equal(tokenMode(p, a.board), 'pair');
  a = play(p, a, {type: 'stays'});
  assert.equal(a.board.pending, true);
  assert.equal(tokenMode(p, a.board), 'block');
  assert.match(visible(view(p, a)), /Can’t stay\. Tap a circle and a square that would both rather be together\./);
  refuse(p, a, pair('A', 'W'), 'no new pairing while it is held');
  refuse(p, a, {type: 'stays'});
  refuse(p, a, {type: 'all'});
  const wrong = blockersOf(p.parameters, p.parameters.lists, 'YZWX');
  const one = p.parameters.circles.split('').flatMap(c => p.parameters.squares.split('').map(s => c + s)).find(x => partnerOf(p.parameters, 'YZWX', x[0]) !== x[1] && !wrong.includes(x));
  a = play(p, a, block(one[0], one[1]));
  assert.equal(a.board.pending, true, 'a claim that is not a blocking pair keeps it held');
  assert.match(visible(view(p, a)), /says? no\./);
  a = play(p, a, block(wrong[0][0], wrong[0][1]));
  assert.equal(a.board.pending, false);
  assert.equal(tokenMode(p, a.board), 'pair');
  a = play(p, a, pair('A', 'W'), pair('B', 'X'));
  assert.equal(a.board.pairing, 'WXYZ');
  assert.equal(a.board.said, null);
});

test('find every: keeping, found already, There’s another, That’s all; Undo keeps the shelf', () => {
  const p = P(10);
  let a = freshAttempt(p);
  refuse(p, a, {type: 'all'}, 'That’s all needs a pairing kept');
  a = play(p, a, pair('A', 'W'), pair('B', 'X'), {type: 'stays'});
  assert.deepEqual(a.board.kept, ['WXYZ']);
  refuse(p, a, {type: 'stays'}, 'found already');
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.missed, true);
  assert.match(visible(view(p, a)), /There’s another\./);
  assert.doesNotMatch(visible(view(p, a)), /\b[0-9]\b.*(found|of)\b/, 'no visible count');
  refuse(p, a, {type: 'all'});
  a = play(p, a, pair('C', 'Z'), {type: 'stays'});
  assert.equal(a.board.missed, false);
  const before = a;
  a = play(p, a, pair('A', 'X'));
  const back = mech.carry(p, a.board, undo(a).board);
  assert.deepEqual(back.kept, before.board.kept, 'Undo keeps the pairings kept');
  a = play(p, a, {type: 'stays'}, pair('C', 'Y'), {type: 'stays'}, {type: 'all'});
  assert.ok(isSolved(p, a.board), 'all four kept and That’s all');
  assert.equal(nextHint(p, a).type, 'done');
});

test('design: changing a strip clears the shelf; That’s all says how many when the count is wrong', () => {
  const p = P(6), q = p.parameters;
  let a = freshAttempt(p);
  assert.equal(stableOf(q, q.lists).length, 1);
  a = play(p, a, {type: 'stays'}, {type: 'all'});
  assert.equal(a.board.claimed, true);
  assert.equal(isSolved(p, a.board), false);
  assert.match(visible(view(p, a)), /Only one can stay\./);
  refuse(p, a, {type: 'stays'}, 'the shelf is claimed for these strips');
  a = play(p, a, swap('B', 0, 1));
  assert.deepEqual(a.board.kept, []);
  assert.equal(a.board.claimed, false);
  assert.equal(a.board.lists.B, 'YX');
  // A: X first, B: Y first, X: B first, Y: A first.
  a = play(p, a, swap('X', 0, 1));
  assert.deepEqual(stableOf(q, a.board.lists), ['XY', 'YX']);
  a = play(p, a, {type: 'stays'}, pair('A', 'Y'), {type: 'stays'}, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  assert.equal(profilesOf(q).filter(M => stableOf(q, M).length === 2).length, 2, 'two of sixteen');
});

test('repair: one strip at a time; Can’t is checked and shows two blocking pairs', () => {
  const p = P(3);
  let a = play(p, freshAttempt(p), {type: 'cant'});
  assert.equal(isSolved(p, a.board), false);
  assert.match(visible(view(p, a)), /One strip can do it\./);
  a = play(p, a, swap('B', 0, 1));
  assert.deepEqual(a.board.strip, {owner: 'B', order: 'XY'});
  a = play(p, a, swap('A', 0, 1));
  assert.deepEqual(a.board.strip, {owner: 'A', order: 'XY'}, 'changing A’s strip puts B’s back');
  assert.equal(listsOf(p, a.board).B, 'YX');
  const back = play(p, a, swap('A', 0, 1));
  assert.equal(back.board.strip, null, 'swapping back leaves the printed strips');
  a = play(p, a, {type: 'stays'});
  assert.ok(isSolved(p, a.board));
  const cant = P(4);
  let c = play(cant, freshAttempt(cant), swap('A', 0, 1), {type: 'stays'});
  assert.equal(isSolved(cant, c.board), false);
  assert.match(visible(view(cant, c)), /Can’t stay\./);
  c = play(cant, c, {type: 'cant'});
  assert.ok(isSolved(cant, c.board));
  const html = view(cant, c);
  assert.match(visible(html), /One strip can change only one of these\./);
  assert.equal((html.match(/claim yes/g) || []).length, 2, 'two dashed blocking pairs');
  assert.match(html, /A’s choice 1: Y/, 'the printed strips are shown');
});

test('last choices: Stays is checked twice, for staying and for three last choices', () => {
  const p = P(12), q = p.parameters;
  let a = play(p, freshAttempt(p), {type: 'stays'});
  assert.equal(isSolved(p, a.board), false);
  assert.match(visible(view(p, a)), /None get their last choice\./);
  // The guide's example: A: X, Y, Z; B: Y, X, Z; C: Z, X, Y; X: B, C, A; Y: A, C, B; Z: A, B, C.
  a = play(p, a, swap('B', 1, 2), swap('X', 0, 1), swap('X', 1, 2), swap('Y', 0, 1), swap('Y', 1, 2), swap('Z', 0, 1), swap('Z', 1, 2));
  assert.deepEqual(a.board.lists, {A: 'XYZ', B: 'YXZ', C: 'ZXY', X: 'BCA', Y: 'CAB', Z: 'ABC'});
  assert.deepEqual(lastOnes(q, a.board.lists, a.board.pairing), ['X', 'Y', 'Z']);
  a = play(p, a, {type: 'stays'});
  assert.ok(isSolved(p, a.board));
  let held = play(p, freshAttempt(p), pair('A', 'Z'), {type: 'stays'});
  assert.equal(held.board.pending, true);
  assert.equal(cellsLive(p, held.board), false, 'strips wait for the blocking pair');
  refuse(p, held, swap('A', 0, 1));
});

test('taps: a circle and a square pair or claim; partners and same-side taps do nothing', () => {
  const p = P(10), b = freshAttempt(p).board;
  assert.deepEqual(tapAction(p, b, 'A', 'W'), {type: 'pair', c: 'A', s: 'W'});
  assert.deepEqual(tapAction(p, b, 'W', 'A'), {type: 'pair', c: 'A', s: 'W'});
  assert.equal(tapAction(p, b, 'A', 'Y'), null, 'already partners');
  assert.equal(tapAction(p, b, 'A', 'B'), null);
  const c = freshAttempt(P(1)).board;
  assert.deepEqual(tapAction(P(1), c, 'Y', 'A'), {type: 'block', c: 'A', s: 'Y'});
  assert.equal(cellsLive(P(1), c), false);
  assert.equal(cellsLive(P(3), freshAttempt(P(3)).board), true);
  const html = view(p, freshAttempt(p));
  assert.equal((html.match(/data-sm="[A-Z]"/g) || []).length, 8, 'eight letters to tap');
  assert.doesNotMatch(html, /data-sm="[A-Z]:\d"/, 'strips are fixed in find-every');
  assert.equal((view(P(6), freshAttempt(P(6))).match(/data-sm="[A-Z]:\d"/g) || []).length, 8, 'design strips are live');
  mech.ui(p, {pick: 'A', moves: 0});
  assert.match(view(p, freshAttempt(p), true), /aria-pressed="true">A</);
  mech.ui(p, {pick: '<x>', moves: 0});
  assert.doesNotMatch(view(p, freshAttempt(p), true), /aria-pressed="true"/);
});

test('hints solve every puzzle from fresh and after a wrong move; the first hint is the puzzle’s own', () => {
  const wrongs = {1: block('B', 'X'), 2: block('B', 'X'), 3: swap('B', 0, 1), 4: swap('A', 0, 1), 5: block('A', 'X'), 6: {type: 'stays'}, 7: swap('A', 0, 1), 8: {type: 'stays'}, 9: {type: 'stays'}, 10: {type: 'stays'}, 11: swap('A', 1, 2), 12: {type: 'stays'}};
  for (let n = 1; n <= 12; n++) {
    const p = P(n);
    for (const start of [freshAttempt(p), play(p, freshAttempt(p), wrongs[n])]) {
      let a = start;
      for (let i = 0; i < 60 && !isSolved(p, a.board); i++) {
        const h = nextHint(p, a);
        assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
        assert.ok(h.text && !/undefined/.test(h.text));
        a = move(p, a, h.action);
        assert.ok(a, `${p.id}: hint is legal`);
      }
      assert.ok(isSolved(p, a.board), `${p.id}: hints solve`);
    }
    assert.ok(p.hints.length === 3 && p.hints.every(Boolean));
  }
  const p = P(1);
  assert.match(nextHint(p, freshAttempt(p)).text, /A would rather have Y, and Y would rather have A\./);
  assert.match(nextHint(P(4), freshAttempt(P(4))).text, /Press Can’t\./);
  const held = play(P(8), freshAttempt(P(8)), {type: 'stays'});
  assert.equal(nextHint(P(8), held).action.type, 'block', 'a held pairing’s hint is a blocking pair');
  const h = playView(p, {...freshAttempt(p), hintLevel: 2}, {pack, selected: null, message: ''});
  assert.equal((h.match(/sm-token sm-[cs] hinted/g) || []).length, 2, 'level two marks the pair');
});

test('forged saves are refused', () => {
  const ok = (n, b) => validBoard(P(n), b);
  assert.equal(ok(1, {said: 'AX'}), false, 'a claim on partners');
  assert.equal(ok(1, {said: 'stays', extra: 1}), false);
  assert.equal(ok(3, {strip: {owner: 'A', order: 'YX'}, said: null}), false, 'the printed strip is not a change');
  assert.equal(ok(3, {strip: {owner: 'A', order: 'XX'}, said: null}), false);
  const ten = freshAttempt(P(10)).board;
  assert.equal(ok(10, {...ten, kept: ['YZWX']}), false, 'a pairing that can’t stay on the shelf');
  assert.equal(ok(10, {...ten, kept: ['WXYZ', 'WXYZ']}), false);
  assert.equal(ok(10, {...ten, pairing: 'WXYZ', pending: true}), false, 'held while it can stay');
  assert.equal(ok(10, {...ten, pending: true, said: 'AW'}), false, 'held after its blocking pair was tapped');
  assert.equal(ok(10, {...ten, claimed: true, kept: ['WXYZ']}), false, 'That’s all with one missing');
  assert.equal(ok(10, {...ten, pairing: 'WXYW'}), false);
  assert.equal(ok(6, {...freshAttempt(P(6)).board, lists: {A: 'XY', B: 'XY', X: 'AB', Y: 'AA'}}), false);
  assert.equal(ok(12, {...freshAttempt(P(12)).board, said: 'stays'}), true, 'a Stays that can stay is a save');
  assert.equal(ok(12, {...freshAttempt(P(12)).board, pairing: 'ZYX', said: 'stays'}), false, 'Stays on a pairing that can’t');
  assert.equal(isSolved(P(12), {...freshAttempt(P(12)).board, said: 'stays'}), false);
});

test('the playground: sizes, free strips, keeping; never solved and no hints', () => {
  const p = byId('matching-playground');
  let a = freshAttempt(p);
  assert.equal(a.board.size, 3);
  assert.ok(mech.noHint(p));
  a = play(p, a, {type: 'size', size: 4});
  assert.equal(a.board.pairing, 'YZWX');
  refuse(p, a, {type: 'size', size: 4});
  refuse(p, a, {type: 'size', size: 5});
  refuse(p, a, {type: 'all'}, 'no That’s all in the playground');
  a = play(p, a, {type: 'stays'});
  assert.equal(a.board.pending, true);
  a = play(p, a, block('A', 'W'), pair('A', 'W'), pair('B', 'X'), {type: 'stays'});
  assert.deepEqual(a.board.kept, ['WXYZ']);
  a = play(p, a, swap('A', 0, 3));
  assert.deepEqual(a.board.kept, [], 'new strips clear the shelf');
  a = play(p, a, {type: 'size', size: 2});
  assert.deepEqual(a.board.lists, p.parameters.markets[2].lists);
  assert.equal(isSolved(p, a.board), false);
  const html = view(p, a);
  assert.match(html, /aria-label="Two pairs"/);
  assert.doesNotMatch(visible(html), /That’s all/);
});
