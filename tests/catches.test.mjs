// Catch and mark: the overlap range and its worksheet answers (Week 95
// grades 2–3 Problems 2, 6 and 7, grades 4–5 Problem 2), the piles and the
// average, taps into the two catches, Can't and its certificate, refusals,
// the shelf and That's all, Undo keeping discoveries, hints, saves,
// rendering and the playground.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import catchModule, {catchMechanics, lowest, highest, overlapsOf, fits, smallestBag, subsets, keyOf, tilesOf, choose, overlapOf, targetOf} from '../dist/families/catches/catches.js';
import {loadPack} from '../scripts/packs.mjs';

const catches = JSON.parse(await readFile(new URL('../dist/families/catches/catches.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = catchMechanics.catches;
const byId = id => catches.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal from ${JSON.stringify(b.board)}`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const undo = (p, a) => ({...a, board: mech.carry(p, a.board, a.history.at(-1).board), history: a.history.slice(0, -1)});
const tap = (...tiles) => tiles.map(tile => ({type: 'tap', tile}));
const A = 0, B = 1, C = 2, D = 3, E = 4, F = 5, G = 6;

test('the worksheet’s answers', () => {
  // 2–3 Problem 2: ABCDE and BDEFG show seven different tiles.
  const first = [A, B, C, D, E], second = [B, D, E, F, G];
  assert.equal(overlapOf(first, second), 3);
  assert.equal(new Set([...first, ...second]).size, 7);
  assert.equal(smallestBag(5, 5, 3), 7);
  assert.deepEqual([6, 7, 8, 12, 20].filter(N => fits(N, 5, 5, 3)), [7, 8, 12, 20]);
  // 2–3 Problem 3: disjoint catches of five need ten.
  assert.equal(smallestBag(5, 5, 0), 10);
  // 2–3 Problem 6: bags of 6, 8 and 12, catches of 5 and 4.
  assert.deepEqual(overlapsOf(6, 5, 4), [3, 4]);
  assert.deepEqual(overlapsOf(8, 5, 4), [1, 2, 3, 4]);
  assert.deepEqual(overlapsOf(12, 5, 4), [0, 1, 2, 3, 4]);
  // 2–3 Problem 7: a bag of 7 gives 2, 3 or 4.
  assert.deepEqual(overlapsOf(7, 5, 4), [2, 3, 4]);
  // 4–5 Problem 2: catches of 6 and 6 with overlap 2 or 0 need 10 or 12.
  assert.equal(smallestBag(6, 6, 2), 10);
  assert.equal(smallestBag(6, 6, 0), 12);
  // 4–5 Problem 5: overlap 0 is impossible exactly when M + n > N.
  assert.equal(lowest(20, 12, 9), 1);
  assert.equal(lowest(20, 10, 10), 0);
  assert.equal(highest(3, 7), 3);
});

test('piles and the average: 4, 12, 4 from A–F with A and C marked', () => {
  const all = subsets(6, 3);
  assert.equal(all.length, 20);
  const piles = [0, 1, 2].map(k => all.filter(c => c.filter(t => t === A || t === C).length === k).length);
  assert.deepEqual(piles, [4, 12, 4]);
  assert.deepEqual(piles, [0, 1, 2].map(k => choose(2, k) * choose(4, 3 - k)));
  assert.equal((0 * 4 + 1 * 12 + 2 * 4) / 20, 2 * 3 / 6);
  assert.equal(keyOf([C, A, D]), 'ACD');
  assert.deepEqual(tilesOf('ACD'), [A, C, D]);
});

test('taps fill the first catch, then the second; a full second catch takes no more', () => {
  const p = byId('catches-01');
  let a = play(p, freshAttempt(p), ...tap(A));
  assert.deepEqual(a.board.first, [A]);
  a = play(p, a, ...tap(A));
  assert.deepEqual(a.board.first, [], 'a second tap takes it out');
  a = play(p, a, ...tap(A, B, C, D));
  assert.deepEqual(a.board, {first: [A, B], second: [C, D], cant: false, refused: false});
  a = play(p, a, ...tap(E));
  assert.ok(!isSolved(p, a.board), 'no dots: not the goal');
  assert.equal(move(p, a, {type: 'tap', tile: F}), null, 'the second catch is full');
  a = play(p, a, {type: 'out', which: 2, tile: E}, ...tap(A));
  assert.ok(isSolved(p, a.board), 'one dot matches the goal');
  // Taking a tile out of a full first catch sends taps back to it.
  const b = play(p, freshAttempt(p), ...tap(A, B, C), {type: 'out', which: 1, tile: A}, ...tap(D));
  assert.deepEqual(b.board.first, [B, D]);
  assert.deepEqual(b.board.second, [C]);
});

test('Can’t: refused with the swap that comes closer, accepted on the closest catch', () => {
  const p = byId('catches-03');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'cant'}), null, 'off until both catches are full');
  a = play(p, a, ...tap(A, B, C), ...tap(A, B, D));
  a = play(p, a, {type: 'cant'});
  assert.equal(a.board.refused, true);
  assert.match(view(p, a), /A plain tile could swap in\./);
  assert.equal(move(p, a, {type: 'cant'}), null, 'once per arrangement');
  const back = undo(p, a);
  assert.equal(back.board.refused, true, 'Undo keeps the refusal while the catches stay');
  a = play(p, a, {type: 'out', which: 2, tile: B}, ...tap(E));
  assert.equal(a.board.refused, false, 'a change of catch lifts it');
  a = play(p, a, {type: 'cant'});
  assert.ok(isSolved(p, a.board), 'both plain tiles caught, and a dot anyway');
  const html = view(p, a);
  assert.match(html, /Every plain tile is in the second catch\./);
  assert.equal((html.match(/ct-slot proof/g) || []).length, 2, 'the two plain tiles are the certificate');
  // A goal that can be made: Can't is refused, never accepted.
  const one = byId('catches-01');
  const b = play(one, freshAttempt(one), ...tap(A, B, C, D, E), {type: 'cant'});
  assert.equal(b.board.refused, true);
  assert.match(view(one, b), /A dotted tile could swap in\./);
});

test('every overlap: full catches join the shelf; That’s all judges it once; Undo keeps it', () => {
  const p = byId('catches-04');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'all'}), null, 'off with an empty shelf');
  a = play(p, a, ...tap(A, B, C, D, E), ...tap(A, B, C, D));
  assert.deepEqual(a.board.kept, ['4']);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.missed, true);
  const html = view(p, a);
  assert.match(html, /There is another\./);
  assert.ok(!/\d+ (more|left|of)/.test(html.replace(/<[^>]+>/g, ' ')), 'no count');
  assert.equal(move(p, a, {type: 'all'}), null, 'off until the shelf grows');
  const back = undo(p, undo(p, a));
  assert.equal(back.board.missed, true, 'Undo keeps the refusal');
  assert.deepEqual(back.board.kept, ['4'], 'Undo keeps the shelf');
  a = play(p, a, {type: 'out', which: 2, tile: D}, ...tap(F));
  assert.deepEqual(a.board.kept, ['4', '3']);
  assert.equal(a.board.missed, false, 'a new number lifts the refusal');
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  assert.equal((view(p, a).match(/case-kept no/g) || []).length, 3, 'the catalog fades 0, 1 and 2');
});

test('bags: a size change keeps the first catch and empties the second; a matching record ticks the bag', () => {
  const p = byId('catches-06');
  let a = freshAttempt(p);
  assert.equal(a.board.bag, 8);
  a = play(p, a, ...tap(A, B, C, D, E), ...tap(A, B, C, F, G));
  assert.deepEqual(a.board.kept, ['8']);
  a = play(p, a, {type: 'size', size: 20});
  assert.deepEqual(a.board.first, [A, B, C, D, E], 'the first catch stays');
  assert.deepEqual(a.board.second, [], 'the second catch starts again');
  assert.deepEqual(a.board.kept, ['8'], 'a new bag needs its own catch');
  a = play(p, a, ...tap(A, B, C, F, G));
  assert.deepEqual(a.board.kept, ['8', '20']);
  a = play(p, a, {type: 'size', size: 6});
  assert.equal(move(p, a, {type: 'tap', tile: G}), null, 'no G in a bag of 6');
  a = play(p, a, ...tap(A, B, C, F, D));
  assert.deepEqual(a.board.kept, ['8', '20'], 'four dots: the bag of 6 can’t match');
  assert.match(view(p, a), /aria-pressed="true" aria-label="Bag of 6"/);
  for (const N of [7, 12]) a = play(p, a, {type: 'size', size: N}, ...tap(A, B, C, F, G));
  assert.deepEqual(a.board.kept, ['8', '20', '7', '12']);
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /ct-bag-chip no/);
});

test('sorting every catch: the first catch is given, catches land in bins by their dots', () => {
  const p = byId('catches-07');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'out', which: 1, tile: A}), null, 'the dotted tiles stay dotted');
  a = play(p, a, ...tap(A, C));
  assert.deepEqual(a.board.kept, ['AC']);
  a = play(p, a, {type: 'out', which: 2, tile: C}, ...tap(B));
  assert.deepEqual(a.board.kept, ['AC', 'AB']);
  const html = view(p, a);
  assert.equal((html.match(/class="case-bin"/g) || []).length, 3, 'three bins: no dots, one, two');
  assert.match(html, /case-kept current/);
  while (!isSolved(p, a.board)) a = play(p, a, nextHint(p, a).action);
  assert.equal(a.board.kept.length, 10);
  assert.deepEqual([...a.board.kept].sort(), targetOf(p.parameters));
});

test('hints: letters named, Can’t and That’s all; hints alone solve every puzzle', () => {
  const p = byId('catches-01');
  assert.equal(nextHint(p, freshAttempt(p)).text, 'Put A in the first catch.');
  const three = byId('catches-03');
  const c = play(three, freshAttempt(three), ...tap(A, B, C, D, E, A));
  assert.equal(nextHint(three, c).text, 'Every plain tile is in the second catch. Press Can’t.');
  for (const q of catches.puzzles.filter(x => x.parameters.mode !== 'playground')) {
    let a = freshAttempt(q), k = 0;
    while (!isSolved(q, a.board)) { const h = nextHint(q, a); assert.equal(h.type, 'move'); a = play(q, a, h.action); assert.ok(++k < 300, `${q.id}: hints finish`); }
  }
  const six = byId('catches-06');
  assert.deepEqual(nextHint(six, play(six, freshAttempt(six), {type: 'size', size: 6})).action, {type: 'size', size: 7}, 'from the bag of 6, a bag that fits');
});

test('saves are checked, and forged ones are rejected', () => {
  const p = byId('catches-09');
  const a = play(p, freshAttempt(p), ...tap(0, 1, 2, 3, 4, 5), ...tap(0, 1, 2, 6, 7, 8));
  assert.ok(validBoard(p, a.board));
  for (const [board, why] of [
    [{...a.board, cant: true}, 'Can’t on a catch that isn’t the closest'],
    [{...a.board, second: [0, 1, 6, 7, 8, 9], refused: true}, 'a refused Can’t on the closest catch'],
    [{...a.board, first: [0, 1, 2, 3, 4, 5, 6]}, 'an overfull first catch'],
    [{...a.board, second: [0, 0, 1, 2, 3, 4]}, 'a tile twice'],
    [{...a.board, extra: 1}, 'an unknown field']
  ]) assert.equal(validBoard(p, board), false, why);
  const every = byId('catches-05');
  assert.equal(validBoard(every, {...freshAttempt(every).board, kept: ['0']}), false, 'an overlap the bag can’t give');
});

test('rendering: no slot per answer, the goal, buttons for every tile', () => {
  const p = byId('catches-05');
  let html = view(p, freshAttempt(p));
  assert.match(html, /Find every number of dots the second catch can hold\./);
  assert.ok(!html.includes('case-shelf'), 'an empty shelf draws nothing');
  assert.equal((html.match(/<button type="button" class="ct-tile/g) || []).length, 8);
  const one = byId('catches-01');
  html = view(one, freshAttempt(one));
  assert.ok(!html.includes('puzzle-goal'), 'no objective line where the goal shows the task');
  assert.match(html, /aria-label="Goal: a second catch with 1 dotted tile and 2 plain"/);
  assert.equal((html.match(/ct-slot empty/g) || []).length, 5, 'a slot per tile of each catch');
});

test('the playground: random catches pile up by their dots, never solved, no hints', () => {
  const p = byId('catches-playground');
  let a = freshAttempt(p);
  assert.equal(mech.noHint(p), true);
  let x = 1;
  const random = () => (x = (x * 16807) % 2147483647) / 2147483647;
  a = {...a, board: mech.move(p, a.board, {type: 'round', count: 10}, random)};
  assert.equal(a.board.rounds.length, 10);
  assert.ok(a.board.rounds.every(r => r >= 0 && r <= 2));
  assert.ok(validBoard(p, a.board));
  assert.ok(!isSolved(p, a.board));
  const html = view(p, a);
  assert.equal((html.match(/class="ct-pile"/g) || []).length, 3);
  const b = play(p, a, {type: 'catch', which: 1, by: 1});
  assert.deepEqual(b.board.rounds, [], 'a new catch size clears the piles');
  assert.equal(move(p, play(p, freshAttempt(p), {type: 'catch', which: 1, by: -1}), {type: 'catch', which: 1, by: -1}), null, 'a catch of at least one');
});

test('the family entry and its symbol', () => {
  assert.equal(catchModule.id, 'catches');
  assert.equal(catchModule.family.symbol, '⊙');
  assert.ok(pack.puzzles.some(p => p.id === 'catches-11'));
});
