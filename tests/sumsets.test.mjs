// Card totals: totals and shared tokens, trays and their sizes, routes that
// climb and pass every total, fewest and most, find every B with That's all,
// the one-card exception, hints, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {sumsetsMechanics, totalsOf, totalCount, pairCounts, evenlySpaced, missed, nextCells, designs, answersOf} from '../dist/families/sumsets/sumsets.js';
import {loadPack} from '../scripts/packs.mjs';

const json = JSON.parse(await readFile(new URL('../dist/families/sumsets/sumsets.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => json.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const card = (tray, ...ks) => ks.map(k => ({type: 'card', tray, card: k}));
const steps = (...cells) => cells.map(cell => ({type: 'step', cell}));
const view = (p, a) => { sumsetsMechanics.sumsets.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };

test('totals: the strip is A + B, and shared totals stack', () => {
  assert.deepEqual(totalsOf([1, 4], [0, 3]), [1, 4, 7]);
  assert.deepEqual(totalsOf([0, 2], [1, 3]), [1, 3, 5]);
  assert.equal(totalCount([0, 1, 2], [0, 3, 6]), 9);
  assert.equal(totalCount([0, 2, 4], [0, 3, 6]), 9, 'both evenly spaced, nine totals');
  assert.equal(totalCount([4], [0, 1, 3]), 3, 'one card shifts B');
  assert.equal(pairCounts([0, 1, 2], [0, 1, 2]).get(2), 3);
  assert.ok(evenlySpaced([1, 4, 7]) && !evenlySpaced([0, 1, 3]) && evenlySpaced([5]));
});

test('designs: the counts in the spec', () => {
  const n = id => designs(byId(id).parameters).length;
  assert.equal(n('sumsets-01'), 8);
  assert.equal(n('sumsets-04'), 120);
  assert.equal(n('sumsets-09'), 8);
  assert.equal(n('sumsets-11'), 66);
  assert.deepEqual(answersOf(byId('sumsets-05').parameters), [[0, 3], [1, 4], [2, 5], [3, 6], [4, 7], [5, 8], [6, 9]]);
  assert.deepEqual(answersOf(byId('sumsets-10').parameters), [[0, 6], [1, 7], [2, 8], [3, 9]]);
  assert.deepEqual(designs(byId('sumsets-08').parameters), [{A: [1, 4, 7], B: [0, 3, 6, 9]}]);
});

test('trays: a tap puts a card in or takes it out; a full tray takes no more; a given tray stays', () => {
  const p = byId('sumsets-04');
  let a = play(p, freshAttempt(p), ...card('A', 5, 1, 3));
  assert.deepEqual(a.board.A, [1, 3, 5], 'kept in order');
  assert.equal(move(p, a, card('A', 7)[0]), null, 'three cards at most');
  a = play(p, a, ...card('A', 3));
  assert.deepEqual(a.board.A, [1, 5]);
  const q = byId('sumsets-05');
  assert.equal(move(q, freshAttempt(q), card('A', 0)[0]), null, 'A is given');
});

test('fewest: every dot is a control; the claim is judged at the top-right dot; a refusal clears the taps and stays through Undo', () => {
  const p = byId('sumsets-04');
  let a = play(p, freshAttempt(p), ...card('A', 0, 1, 3), ...card('B', 0, 1, 2));
  assert.doesNotMatch(view(p, a), /can-go/, 'nothing marks the next dot');
  // Taps in page order (top row first) reach the corner without being a route.
  const order = play(p, a, ...steps([2, 0], [2, 1], [2, 2]));
  assert.deepEqual(order.board.route, []);
  assert.deepEqual(order.board.told, {kind: 'steps'});
  assert.match(view(p, order), /Step right or up from the bottom-left dot\./);
  const jump = play(p, a, ...steps([0, 0], [1, 1], [2, 2]));
  assert.deepEqual(jump.board.told, {kind: 'steps'}, 'a diagonal step is refused');
  // A route through a design with an extra total misses it.
  a = play(p, a, ...steps([0, 0], [0, 1], [0, 2], [1, 2]));
  assert.deepEqual(nextCells(a.board), [[2, 2]]);
  a = play(p, a, ...steps([0, 1]));
  assert.deepEqual(a.board.route, [[0, 0]], 'a tap on a tapped dot takes the taps back to it');
  a = play(p, a, ...steps([0, 1], [0, 2], [1, 2], [2, 2]));
  assert.equal(isSolved(p, a.board), false);
  assert.deepEqual(a.board.route, [], 'the refusal clears the taps');
  assert.deepEqual(a.board.told, {kind: 'missed', totals: [4]});
  assert.equal(missed({...a.board, route: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]}).join(), '4');
  assert.match(view(p, a), /Not on the route: 4\./);
  const back = {board: sumsetsMechanics.sumsets.carry(p, a.board, undo(a).board)};
  assert.deepEqual(back.board.told, {kind: 'missed', totals: [4]}, 'Undo keeps the refusal');
  assert.equal(back.board.route.length, 4);
  a = play(p, a, ...card('A', 3));
  assert.equal(a.board.told, null, 'a card change clears it');
  a = play(p, a, ...card('A', 2), ...steps([0, 0], [1, 0], [1, 1], [2, 1], [2, 2]));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, card('A', 2)[0]), null, 'nothing after a solve');
});

test('fit: with an uneven B only one A card fits every total on one route', () => {
  const p = byId('sumsets-07');
  let a = play(p, freshAttempt(p), ...card('A', 0, 1), ...steps([0, 0], [0, 1], [0, 2], [1, 2]));
  assert.equal(isSolved(p, a.board), false);
  assert.deepEqual(a.board.told, {kind: 'missed', totals: [2]});
  a = play(p, a, ...card('A', 1), ...steps([0, 0], [0, 1], [0, 2]));
  assert.ok(isSolved(p, a.board));
});

test('most: solved when every pair has its own total; evenly spaced when asked', () => {
  const p = byId('sumsets-02');
  let a = play(p, freshAttempt(p), ...card('B', 0, 2, 6));
  assert.equal(isSolved(p, a.board), false);
  assert.match(view(p, a), /ss-dot repeat/);
  a = play(p, a, ...card('B', 2, 3));
  assert.ok(isSolved(p, a.board));
  const e = byId('sumsets-06');
  let b = play(e, freshAttempt(e), ...card('A', 0, 1, 3), ...card('B', 0, 4, 8));
  assert.equal(totalCount(b.board.A, b.board.B), 9);
  assert.equal(isSolved(e, b.board), false, 'A is uneven');
  assert.match(view(e, b), /A is not evenly spaced\./);
  b = play(e, b, ...card('A', 3, 2));
  assert.ok(isSolved(e, b.board), '{0, 1, 2} + {0, 4, 8}');
});

test('find every: a B that works is kept; found already; there is another; Undo keeps both', () => {
  const p = byId('sumsets-05');
  let a = play(p, freshAttempt(p), ...card('B', 0, 3));
  assert.deepEqual(a.board.found, [[0, 3]]);
  a = play(p, a, ...card('B', 3), ...card('B', 3));
  assert.equal(a.board.again, true);
  assert.match(view(p, a), /Found already\./);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.more, true);
  assert.match(view(p, a), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for a new B');
  const b = play(p, a, ...card('B', 0));
  const back = undo(b);
  assert.equal(back.board.more, true, 'Undo does not lift There is another');
  assert.deepEqual(back.board.found, [[0, 3]]);
  a = play(p, a, ...card('B', 0, 3, 1, 4));
  assert.equal(a.board.more, false, 'a new B lifts it');
  assert.deepEqual(a.board.found, [[0, 3], [1, 4]]);
  assert.doesNotMatch(view(p, a), /ss-slot-answer|of 7/, 'no slots and no count');
});

test('hints: idea first, then cards and route; they reach a solve; memoised', () => {
  const p = byId('sumsets-11');
  const a = freshAttempt(p);
  assert.match(view(p, {...a, hintLevel: 1}), new RegExp(p.hints[0].replace(/[?×]/g, '.')));
  const t = performance.now();
  const h = nextHint(p, a);
  assert.ok(performance.now() - t < 1000);
  assert.equal(h.type, 'move');
  const t2 = performance.now();
  nextHint(p, a);
  assert.ok(performance.now() - t2 < 5, 'memoised');
  let b = a, n = 0;
  while (!isSolved(p, b.board) && n++ < 40) b = play(p, b, nextHint(p, b).action);
  assert.ok(isSolved(p, b.board));
  assert.equal(nextHint(byId('sumsets-playground'), freshAttempt(byId('sumsets-playground'))).type, 'done');
});

test('saves: forged boards are rejected', () => {
  const p = byId('sumsets-04'), f = freshAttempt(p).board;
  assert.ok(validBoard(p, f));
  for (const board of [{...f, A: [2, 1]}, {...f, A: [1, 2, 3, 4]}, {...f, route: [[0, 0]]}, {...f, told: {kind: 'steps'}}, {...f, extra: 1}, {A: [], B: []}]) assert.equal(validBoard(p, board), false);
  const full = {A: [0, 1, 3], B: [0, 1, 2], route: [], told: null};
  assert.ok(validBoard(p, {...full, route: [[2, 0], [0, 1]]}), 'any taps short of the corner');
  for (const board of [{...full, route: [[0, 0], [0, 0]]}, {...full, route: [[2, 2], [0, 0]]}, {...full, route: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]}, {...full, told: {kind: 'missed', totals: [6]}}, {...full, told: {kind: 'missed', totals: [0]}}, {...full, told: {kind: 'missed', totals: [3, 4]}}, {...full, told: {kind: 'maybe'}}]) assert.equal(validBoard(p, board), false);
  for (const x of [2, 3, 4]) assert.ok(validBoard(p, {...full, told: {kind: 'missed', totals: [x]}}), `a route can miss ${x}`);
  const fewest = {A: [0, 1, 2], B: [0, 1, 2], route: [], told: null};
  assert.equal(validBoard(p, {...fewest, told: {kind: 'missed', totals: [4]}}), false, 'no missed totals when every total fits');
});

test('render: trays, strip, grid, the hinted card, and no objective repeated on the board', () => {
  const p = byId('sumsets-01');
  const a = play(p, freshAttempt(p), ...card('B', 1, 3));
  const html = view(p, a);
  assert.match(html, /class="ss-strip" role="img" aria-label="Totals: 1, 3, 5"/);
  assert.match(html, /<button type="button" class="ss-dot" [^>]*aria-label="2 plus 3 is 5"/, 'every dot is a control');
  assert.equal((html.match(/class="ss-card[ "]/g) || []).length, 20);
  assert.match(view(p, {...freshAttempt(p), hintLevel: 2}), /ss-card hinted/);
  const g = byId('sumsets-playground');
  assert.doesNotMatch(view(g, freshAttempt(g)), /ss-pips/, 'no size dots in the playground');
});
