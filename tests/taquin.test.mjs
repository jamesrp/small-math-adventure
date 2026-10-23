// Sliding numbers: starts and slides against the Week 90 worksheet's worked
// examples and tables, corner orders, placing and its refusals, slides and
// the smaller-number rule, goals, the shelf and That's all, Undo keeping
// discoveries, hints, saves, rendering and the playground.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import taquinModule, {taquinMechanics, fillings, finishOf, finishKey, outlineOf, ordersOf, cornersOf, filledGrid, rectify, finishRows, runOf, tapCell, answersOf, isStandard} from '../dist/families/taquin/taquin.js';
import {loadPack} from '../scripts/packs.mjs';

const taquin = JSON.parse(await readFile(new URL('../dist/families/taquin/taquin.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = taquinMechanics.taquin;
const byId = id => taquin.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const undo = (p, a) => ({...a, board: mech.carry(p, a.board, a.history.at(-1).board), history: a.history.slice(0, -1)});
const A = {outer: [3, 2], inner: [1]}, D = {outer: [3, 2, 1], inner: [2, 1]}, B = {outer: [3, 3, 2], inner: [2, 1]};
const rows = (s, f) => finishKey(finishOf(s, f));
const place = (...cells) => cells.map(cell => ({type: 'place', cell}));
const open = (r, c) => ({type: 'open', at: [r, c]}), slide = (r, c) => ({type: 'slide', at: [r, c]});

test('the worksheet’s worked example and the A and D tables', () => {
  // Page 1: the ring top left, 2 top right, 1 bottom left, 3 bottom right.
  assert.equal(rows({outer: [2, 2], inner: [1]}, [2, 1, 3]), '1,2/3');
  // Problems 1–2: A1–A5, cells (1,2), (1,3), (2,1), (2,2).
  const cards = {A1: [1, 2, 3, 4], A2: [1, 3, 2, 4], A3: [1, 4, 2, 3], A4: [2, 3, 1, 4], A5: [2, 4, 1, 3]};
  assert.deepEqual(Object.values(cards).map(f => rows(A, f)), ['1,2/3,4', '1,3/2,4', '1,3,4/2', '1,2,3/4', '1,2,4/3']);
  assert.equal(fillings(A).length, 5);
  assert.deepEqual(fillings(A).map(String).sort(), Object.values(cards).map(String).sort(), 'the five A cards are every start');
  // Problem 3: D's labels top right to bottom left, every order of corners.
  const d = {D1: [1, 2, 3], D2: [1, 3, 2], D3: [2, 1, 3], D4: [2, 3, 1], D5: [3, 1, 2], D6: [3, 2, 1]};
  assert.deepEqual(Object.values(d).map(f => rows(D, f)), ['1/2/3', '1,3/2', '1,2/3', '1,2/3', '1,3/2', '1,2,3']);
  for (const f of Object.values(d)) {
    const ends = ordersOf(D.inner).map(order => { let k = 0; const cells = [[0, 0], [0, 1], [1, 0]]; return finishKey(finishRows(rectify(filledGrid(D, f), () => cells[order[k++]]).grid)); });
    assert.equal(new Set(ends).size, 1, `${f}: both orders finish alike`);
  }
  assert.equal(fillings(B).length, 16);
  assert.equal(new Set(fillings(B).map(f => rows(B, f))).size, 16, 'Problem 6: no two B starts share a finish');
  assert.deepEqual([...new Set(fillings(B).map(f => String(outlineOf(finishOf(B, f)))))].sort(), ['2,2,1', '3,1,1', '3,2'], 'Problem 4: three outlines');
});

test('corners and orders', () => {
  assert.deepEqual(cornersOf(filledGrid(D, [1, 3, 2])), [[0, 1], [1, 0]]);
  assert.equal(ordersOf([2, 1]).length, 2);
  assert.equal(ordersOf([3, 1]).length, 3);
  assert.equal(ordersOf([3, 2, 1]).length, 16);
  assert.ok(isStandard(A, [1, 2, 3, 4]) && !isStandard(A, [2, 1, 3, 4]));
});

test('placing: numbers in order, refused where a square above or left is empty', () => {
  const p = byId('taquin-01');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'place', cell: 3}), null, 'the bottom-right square waits for the squares above and left of it');
  const run = runOf(p.parameters, a.board);
  assert.deepEqual(tapCell(run, 1, 1), {ui: {told: {kind: 'grow', cells: [[0, 1], [1, 0]]}}});
  assert.deepEqual(tapCell(run, 0, 1), {move: {type: 'place', cell: 0}});
  assert.equal(tapCell(run, 0, 0), null, 'the gray square is not a control while placing');
  a = play(p, a, ...place(0, 1, 2));
  assert.equal(move(p, a, open(0, 0)), null, 'no opening until every number is placed');
  a = play(p, a, ...place(3));
  assert.equal(runOf(p.parameters, a.board).phase, 'open');
});

test('sliding: only the smaller number moves; the ring leaves the board; the goal', () => {
  const p = byId('taquin-01');
  let a = play(p, freshAttempt(p), ...place(0, 1, 2, 3), open(0, 0));
  const run = runOf(p.parameters, a.board);
  assert.deepEqual(tapCell(run, 1, 0), {ui: {told: {kind: 'smaller', cells: [[0, 1], [1, 0]]}}});
  assert.equal(move(p, a, slide(1, 0)), null, 'the larger number is refused');
  a = play(p, a, slide(0, 1));
  assert.equal(nextHint(p, a).text, 'Slide the 2.');
  a = play(p, a, slide(0, 2));
  assert.ok(isSolved(p, a.board), '1 2 over 3 4 finishes in two rows of two');
  // A start that misses: the goal turns red and New run is the way on.
  let b = play(p, freshAttempt(p), ...place(2, 0, 1, 3), open(0, 0), slide(1, 0), slide(1, 1));
  assert.ok(!isSolved(p, b.board));
  assert.match(view(p, b), /tq-goals miss/);
  assert.equal(nextHint(p, b).action.type, 'new');
  b = play(p, b, {type: 'new'});
  assert.deepEqual(b.board, {place: [], steps: [], reached: []});
});

test('a refusal belongs to the board it was made on', () => {
  const p = byId('taquin-01');
  const a = play(p, freshAttempt(p), ...place(0, 1, 2, 3), open(0, 0));
  mech.reset(p);
  view(p, a, true);
  mech.ui(p, {told: {kind: 'smaller', cells: [[0, 1], [1, 0]]}, at: JSON.stringify(a.board)});
  const html = view(p, a, true);
  assert.match(html, /The smaller number slides\./);
  assert.equal((html.match(/tq-cell tile marked/g) || []).length, 2);
  const next = play(p, a, slide(0, 1));
  assert.ok(!view(p, next, true).includes('The smaller number slides.'), 'gone after the next move');
});

test('the shelf: runs join it, That’s all judges it once, Undo keeps it', () => {
  const p = byId('taquin-02');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all is off with an empty shelf');
  a = play(p, a, ...place(0, 1, 2, 3), open(0, 0), slide(0, 1), slide(0, 2));
  assert.deepEqual(a.board.shelf, [[1, 2, 3, 4]]);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.more, true);
  assert.equal(move(p, a, {type: 'all'}), null, 'off until the shelf grows');
  let html = view(p, a);
  assert.match(html, /There is another\./);
  assert.ok(!/\d+ (more|left|of)/.test(html.replace(/<[^>]+>/g, ' ')), 'no count');
  a = play(p, a, {type: 'new'});
  const back = undo(p, undo(p, a));
  assert.equal(back.board.more, true, 'Undo keeps the refusal');
  assert.deepEqual(back.board.shelf, [[1, 2, 3, 4]], 'Undo keeps the shelf');
  // Shelf grouped by finished shape, the current one ringed.
  a = play(p, a, ...place(0, 2, 1, 3), open(0, 0), slide(0, 1), slide(0, 2));
  assert.equal(a.board.more, false, 'a new start lifts the refusal');
  html = view(p, a);
  assert.equal((html.match(/class="tq-group"/g) || []).length, 1, 'both finish in two rows of two');
  assert.equal((html.match(/tq-item now/g) || []).length, 1);
  // A start already kept does not join twice.
  a = play(p, a, {type: 'new'}, ...place(0, 1, 2, 3), open(0, 0), slide(0, 1), slide(0, 2));
  assert.equal(a.board.shelf.length, 2);
  while (!isSolved(p, a.board)) a = play(p, a, nextHint(p, a).action);
  assert.equal(a.board.shelf.length, 5);
});

test('orders: the start is given, each order joins the shelf with the same finish', () => {
  const p = byId('taquin-03');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'new'}), null, 'nothing to start again yet');
  assert.equal(move(p, a, open(0, 0)), null, 'the top-left gray square waits');
  a = play(p, a, open(0, 1), slide(0, 2), open(1, 0), slide(2, 0), open(0, 0), slide(0, 1), slide(1, 1));
  a = play(p, a, {type: 'new'}, open(1, 0), slide(2, 0), open(0, 1), slide(0, 2), open(0, 0), slide(0, 1), slide(1, 1));
  assert.deepEqual(a.board.shelf, [[1, 2, 0], [2, 1, 0]]);
  const html = view(p, a);
  assert.equal((html.match(/aria-label="Finished: rows 1 3, then 2"/g) || []).length, 2, 'both orders show the same finish');
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('starts of a finish, goals, and the answers', () => {
  assert.deepEqual(answersOf(byId('taquin-04').parameters), [[1, 3, 2], [3, 1, 2]]);
  assert.deepEqual(answersOf(byId('taquin-07').parameters).map(String).sort(), ['2,4,1,3', '2,4,3,1']);
  assert.deepEqual(answersOf(byId('taquin-08').parameters).map(String).sort(), ['2,1,1', '2,2', '3,1', '4']);
  assert.equal(answersOf(byId('taquin-09').parameters).length, 3);
  // A finish unlike the goal adds nothing; three goals are met one by one.
  const p = byId('taquin-04');
  const a = play(p, freshAttempt(p), ...place(0, 1, 2), open(0, 1), slide(0, 2), open(1, 0), slide(1, 1), open(0, 0), slide(0, 1));
  assert.equal(finishKey(finishRows(runOf(p.parameters, a.board).grid)), '1/2/3');
  assert.deepEqual(a.board.shelf, [], '1 2 3 down the diagonal is a column, not the goal');
  const five = byId('taquin-05');
  let b = freshAttempt(five);
  while (!b.board.reached.length) b = play(five, b, nextHint(five, b).action);
  const back = undo(five, b);
  assert.deepEqual(back.board.reached, b.board.reached, 'Undo keeps a goal met');
  assert.match(view(five, b), /tq-goal met/);
  const ten = byId('taquin-10');
  assert.equal(fillings(B).filter(f => ten.parameters.targets.some(t => finishKey(t.finish) === rows(B, f))).length, 1);
});

test('hints: rows named, the smaller number, New run, That’s all; hints alone solve every puzzle', () => {
  const p = byId('taquin-04');
  assert.equal(nextHint(p, freshAttempt(p)).text, 'Put 1 in the top row.');
  for (const q of taquin.puzzles.filter(x => x.parameters.mode !== 'playground')) {
    let a = freshAttempt(q), k = 0;
    while (!isSolved(q, a.board)) { const h = nextHint(q, a); assert.equal(h.type, 'move'); assert.ok(!/Press Can’t/.test(h.text)); a = play(q, a, h.action); assert.ok(++k < 300, `${q.id}: hints finish`); }
  }
  const two = byId('taquin-02');
  let done = freshAttempt(two);
  for (const f of [[1, 2, 3, 4], [1, 3, 2, 4], [1, 4, 2, 3], [2, 3, 1, 4], [2, 4, 1, 3]]) {
    const cells = [1, 2, 3, 4].map(n => f.indexOf(n));
    done = play(two, done, ...place(...cells));
    while (runOf(two.parameters, done.board).phase !== 'done') done = play(two, done, nextHint(two, done).action);
    if (done.board.shelf.length < 5) done = play(two, done, {type: 'new'});
  }
  assert.deepEqual(nextHint(two, done).action, {type: 'all'});
  assert.equal(nextHint(two, done).text, 'Every start is found.');
});

test('saves are replayed, and forged ones are rejected', () => {
  const p = byId('taquin-02');
  const a = play(p, freshAttempt(p), ...place(0, 1, 2, 3), open(0, 0), slide(0, 1));
  assert.ok(validBoard(p, a.board));
  for (const [board, why] of [
    [{...a.board, steps: [[0, 0], [1, 0]]}, 'a slide of the larger number'],
    [{...a.board, place: [3, 0, 1, 2]}, 'a 1 below an empty square'],
    [{...a.board, shelf: [[2, 1, 3, 4]]}, 'a start that does not grow'],
    [{...a.board, done: true}, 'done with an incomplete shelf'],
    [{...a.board, extra: 1}, 'an unknown field']
  ]) assert.equal(validBoard(p, board), false, why);
});

test('rendering: no slot per answer, the tray, keyboard controls', () => {
  const p = byId('taquin-08');
  let html = view(p, freshAttempt(p));
  assert.match(html, /aria-label="Next number 1"/);
  assert.match(html, /Find every shape the numbers can finish in\./);
  assert.ok(!html.includes('tq-item'), 'an empty shelf draws nothing');
  assert.equal((html.match(/<button type="button" class="tq-cell empty"/g) || []).length, 4, 'every empty square is a button');
  const one = byId('taquin-01');
  html = view(one, freshAttempt(one));
  assert.ok(!html.includes('puzzle-goal'), 'no objective line where the goal shows the task');
});

test('the playground: boards to choose, never solved, no hints', () => {
  const p = byId('taquin-playground');
  let a = freshAttempt(p);
  assert.equal(mech.noHint(p), true);
  a = play(p, a, {type: 'shape', index: 6});
  assert.equal(a.board.shape, 6);
  assert.equal(move(p, a, {type: 'shape', index: 6}), null);
  const box = p.parameters.shapes[6];
  assert.ok(fillings(box).every(f => String(outlineOf(finishOf(box, f))) === '3,2,1'), 'the 3 × 3 board always finishes as the staircase');
  assert.ok(!isSolved(p, a.board));
  assert.match(view(p, a), /aria-pressed="true" aria-label="Board 7"/);
});

test('the family entry and its symbol', () => {
  assert.equal(taquinModule.id, 'taquin');
  assert.equal(taquinModule.family.symbol, '◰');
  assert.ok(pack.puzzles.some(p => p.id === 'taquin-10'));
});
