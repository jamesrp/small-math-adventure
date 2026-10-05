// Rainbow triangles: the boards and their side rules, taps that change a
// dot's letter, the count, only-rainbow and every-number puzzles, walks
// through doors, peeking at hidden letters, the playground, hints, saves and
// rendering. The counts are checked against independent methods in
// scripts/validate-rainbow.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, restart, validBoard} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {mechanicFor} from '../dist/expansion.js';
import {boardOf, validBoardSpec, legal, rainbows, doorsOf, cellDoors, walksOf, countTable, fromRows, toRows} from '../dist/families/rainbow/sperner.js';
import {plainLabels, nextLetter, peekPlan, planCost, PLAY_ORDER} from '../dist/families/rainbow/rainbow.js';
import {validateRainbow} from '../scripts/validate-rainbow.mjs';
import {loadPack} from '../scripts/packs.mjs';

const rainbow = JSON.parse(await readFile(new URL('../dist/families/rainbow/rainbow.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => rainbow.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const turn = (point, letter) => ({type: 'turn', point, ...(letter ? {letter} : {})});
const moveRainbow = byId('rainbow-01'), three = byId('rainbow-02'), doors = byId('rainbow-03'), counts = byId('rainbow-05');
const inside = byId('rainbow-09'), hidden = byId('rainbow-10'), comesBack = byId('rainbow-11'), ground = byId('rainbow-playground');
const noRainbow = byId('rainbow-s01'), howManyNow = byId('rainbow-s03'), blueLeft = byId('rainbow-s04');

test('the pack validates: counts match independent methods, hints solve, illegal moves fail', async () => {
  const report = await validateRainbow();
  assert.equal(report.rainbowPuzzles, 15, 'eleven puzzles and four Starred dots');
});

test('boards: points in rows from the bottom, side rules, and cut triangles', () => {
  const b = boardOf({steps: 3});
  assert.equal(b.m.points.length, 10);
  assert.equal(b.m.cells.length, 9);
  assert.deepEqual(b.allowed, ['R', 'RB', 'RB', 'B', 'RY', 'RBY', 'BY', 'RY', 'BY', 'Y']);
  assert.deepEqual(b.corners, [0, 3, 9]);
  assert.equal(toRows(b, fromRows('RBRB/RYB/RB/Y')), 'RBRB/RYB/RB/Y');
  const fan = boardOf({steps: 2, centres: [0, 1, 2, 3]});
  assert.equal(fan.m.cells.length, 12);
  assert.deepEqual(fan.allowed.slice(6), ['RBY', 'RBY', 'RBY', 'RBY'], 'middle points may be anything');
  assert.equal(boardOf({steps: 3, free: [1]}).allowed[1], 'RBY');
  assert.ok(validBoardSpec({steps: 4}) && validBoardSpec({steps: 2, centres: [0, 3], free: [1]}));
  for (const bad of [null, {steps: 0}, {steps: 9}, {steps: 2, centres: [4]}, {steps: 2, centres: [1, 1]}, {steps: 2, free: [6]}, {steps: 2, size: 3}]) assert.equal(validBoardSpec(bad), false, JSON.stringify(bad));
  assert.ok(legal(b, plainLabels(b)));
  assert.equal(legal(b, 'RYRB' + plainLabels(b).slice(4)), false, 'Y on the bottom side');
});

test('Sperner: every lettering of each plain board has an odd number of rainbows', () => {
  assert.deepEqual([...countTable(boardOf({steps: 2}))], [[1, 8]]);
  assert.deepEqual([...countTable(boardOf({steps: 3}))], [[1, 108], [3, 72], [5, 12]]);
  assert.deepEqual([...countTable(boardOf({steps: 4}))], [[1, 2920], [3, 6192], [5, 3840], [7, 848], [9, 24]]);
  assert.deepEqual([...countTable(boardOf({steps: 2, centres: [0, 1, 2, 3]}))].map(([n]) => n), [1, 3, 5, 7]);
  assert.equal(countTable(boardOf({steps: 3, free: [1]})).get(0), 16, 'a Y allowed on the bottom: no rainbow at all');
});

test('doors: a rainbow has one, other triangles none or two, and walks pair them up', () => {
  const b = boardOf({steps: 4}), labels = fromRows('RRBRB/YBRB/RBB/RB/Y');
  assert.deepEqual(rainbows(b.m, labels).map(i => i + 1), [2, 8, 16]);
  assert.equal(doorsOf(b.m, labels).length, 14);
  for (const [i] of b.m.cells.entries()) assert.equal(cellDoors(b.m, labels, i).length === 1, rainbows(b.m, labels).includes(i));
  const walks = walksOf(b.m, labels);
  assert.deepEqual(walks.map(w => w.ends), [['out', 'rainbow'], ['out', 'out'], ['rainbow', 'rainbow']]);
  assert.deepEqual(walks[2].cells.map(i => i + 1), [8, 9, 13, 14, 16]);
});

test('a tap moves a dot to its next letter; corners and refused letters stay', () => {
  const p = three, b = boardOf(p.parameters.board), fresh = freshAttempt(p), five = byId('rainbow-04');
  assert.equal(nextLetter(b, fresh.board.labels, 5), 'B', 'the middle dot goes R, B, Y');
  let a = play(five, freshAttempt(five), turn(5), turn(5));
  assert.equal(a.board.labels[5], 'Y');
  a = play(five, a, turn(5));
  assert.equal(a.board.labels[5], 'R', 'and round again');
  assert.equal(play(p, fresh, turn(1)).board.labels[1], 'B', 'a bottom dot switches between R and B');
  assert.equal(move(p, fresh, turn(1, 'Y')), null, 'no Y on the bottom side');
  assert.equal(move(p, fresh, turn(0)), null, 'corners stay');
  assert.equal(move(p, fresh, turn(5, 'R')), null, 'the letter it already has');
  a = play(p, fresh, turn(5, 'Y'));
  assert.equal(rainbows(b.m, a.board.labels).length, 3);
  assert.ok(isSolved(p, a.board), 'three rainbows solve Three rainbows');
  assert.equal(move(p, a, turn(1)), null, 'no moves after a solve');
});

test('only rainbows are collected one at a time, and Undo keeps them', () => {
  const p = moveRainbow, m = mechanicFor(p), fresh = freshAttempt(p);
  assert.deepEqual(fresh.board.found, [3], 'the start already has its rainbow on top');
  assert.deepEqual(play(p, fresh, turn(1, 'B')).board.found, [3], 'the rainbow stays on top');
  const a = play(p, fresh, turn(3, 'Y'));
  assert.deepEqual(a.board.found, [3, 1]);
  const back = undo(a), kept = {...back, board: m.carry(p, a.board, back.board)};
  assert.deepEqual(kept.board.found, [3, 1], 'Undo keeps the triangles collected');
  assert.ok(validBoard(p, kept.board));
  assert.match(view(p, a), /class="tg-dot rb-star"/);
  assert.deepEqual(restart(p, a).board.found, [3]);
  assert.equal(validBoard(p, {...a.board, found: [3]}), false, 'the only rainbow on the board must be collected');
});

test('every number: That’s all checks the list', () => {
  const p = counts, b = boardOf(p.parameters.board), fresh = freshAttempt(p);
  assert.deepEqual(fresh.board.found, [1]);
  const early = play(p, fresh, {type: 'claim'});
  assert.ok(early.board.missed && !isSolved(p, early.board));
  assert.match(view(p, early), /There’s another\./);
  assert.equal(move(p, early, {type: 'claim'}), null, 'one note until something changes');
  let a = play(p, early, turn(5, 'Y'));
  assert.equal(a.board.missed, false);
  a = play(p, a, turn(1, 'B'));
  assert.equal(rainbows(b.m, a.board.labels).length, 5);
  assert.deepEqual(a.board.found, [1, 3, 5]);
  assert.match(view(p, a), /<ol class="rb-shelf" aria-label="Numbers found">/);
  a = play(p, a, {type: 'claim'});
  assert.ok(isSolved(p, a.board));
});

test('Starred dots: a group whose starred side dot may take any letter, so no rainbow is possible', () => {
  for (const p of [noRainbow, howManyNow, blueLeft]) {
    assert.equal(p.mechanic, 'starred');
    assert.equal(p.libraryFamily, 'rainbow');
    assert.equal(p.group, 'Starred dots');
    assert.match(p.rules.join(' '), /starred dot may take any letter/);
  }
  let p = noRainbow, b = boardOf(p.parameters.board);
  let a = play(p, freshAttempt(p), turn(1, 'Y'), turn(3, 'Y'));
  assert.equal(rainbows(b.m, a.board.labels).length, 0);
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, freshAttempt(p)), /rb-free/);
  assert.match(view(p, freshAttempt(p)), /rb-star-mark/);
  // On the left side, the starred dot may be B; the dot above it may not.
  p = blueLeft; b = boardOf(p.parameters.board);
  assert.equal(move(p, freshAttempt(p), turn(7, 'B')), null);
  a = play(p, freshAttempt(p), turn(4, 'B'), turn(5, 'B'), turn(7, 'Y'));
  assert.equal(rainbows(b.m, a.board.labels).length, 0);
  assert.ok(isSolved(p, a.board));
  // Every number from 0 to 5, even ones included, is a count the board allows.
  p = howManyNow;
  assert.equal(validBoard(p, {...freshAttempt(p).board, found: [1, 0]}), true);
  assert.equal(validBoard(p, {...freshAttempt(p).board, found: [1, 6]}), false);
});

test('walks: in through an outside door, door by door, to a rainbow or out again', () => {
  const p = doors, b = boardOf(p.parameters.board), labels = p.parameters.start, fresh = freshAttempt(p);
  const outside = doorsOf(b.m, labels).filter(e => b.m.outer[e]), inner = doorsOf(b.m, labels).find(e => !b.m.outer[e]);
  assert.equal(outside.length, 3);
  assert.equal(move(p, fresh, {type: 'door', door: inner}), null, 'a walk starts outside or in a rainbow');
  let a = play(p, fresh, {type: 'door', door: outside[0]});
  assert.ok(a.board.at >= 0);
  assert.equal(move(p, a, {type: 'door', door: outside[2]}), null, 'only a door of the triangle you are in');
  assert.equal(move(p, a, {type: 'start', cell: rainbows(b.m, labels)[0]}), null, 'no new walk mid-walk');
  while (a.board.at >= 0) a = play(p, a, nextHint(p, a).action);
  assert.equal(a.board.walks.length, 1);
  assert.match(view(p, a), /Doors walked/);
  assert.match(view(p, a), /class="rb-trail"/);
  let done = a;
  while (!isSolved(p, done.board)) done = play(p, done, nextHint(p, done).action);
  assert.equal(done.board.walks.length, 2);
  assert.equal(move(p, done, {type: 'door', door: outside[0]}), null);
});

test('a walk can start in a rainbow that no walk has reached', () => {
  const p = inside, b = boardOf(p.parameters.board), labels = p.parameters.start;
  let a = freshAttempt(p);
  while (doorsOf(b.m, labels).some(e => b.m.outer[e] && !a.board.walks.flat().includes(e)) || a.board.at >= 0) a = play(p, a, nextHint(p, a).action);
  const hint = nextHint(p, a);
  assert.equal(hint.action.type, 'start');
  assert.ok([7, 15].includes(hint.action.cell), 'one of the two rainbows the outside never reaches');
  a = play(p, a, hint.action);
  while (!isSolved(p, a.board)) a = play(p, a, nextHint(p, a).action);
  assert.equal(a.board.walks.length, 3);
});

test('peeking: corners show, each peek shows one dot, a rainbow in view solves it', () => {
  const p = hidden, b = boardOf(p.parameters.board), fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'peek', point: 0}), null, 'corners show already');
  const html = view(p, fresh);
  assert.equal((html.match(/rb-hidden/g) || []).length, b.m.points.length - 3);
  assert.doesNotMatch(html, /rb-rainbow/, 'no rainbow shows before peeking');
  const labels = p.parameters.hidden[0], route = [];
  for (let k; (k = peekPlan(b, labels, [...b.corners, ...route])) !== -1;) route.push(k);
  assert.equal(route.length, planCost(b, labels, b.corners));
  assert.ok(route.length < p.parameters.budget);
  const a = play(p, fresh, ...route.map(point => ({type: 'peek', point})));
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /rb-rainbow/);
  assert.equal(move(p, a, {type: 'peek', point: route[0] + 1}), null, 'no peeks after a solve');
  // Start again hides another board.
  const again = play(p, play(p, fresh, {type: 'peek', point: 1}), {type: 'again'});
  assert.deepEqual(again.board, {which: 1, seen: []});
});

test('a walk can come back out; the plan then tries the next door', () => {
  const p = comesBack, b = boardOf(p.parameters.board);
  for (const labels of p.parameters.hidden) {
    const outside = doorsOf(b.m, labels).filter(e => b.m.outer[e]);
    assert.equal(outside.length, 3);
    assert.ok(walksOf(b.m, labels).some(w => w.ends[0] === 'out' && w.ends[1] === 'out'));
    assert.ok(planCost(b, labels, b.corners) < p.parameters.budget);
  }
});

test('the playground: five boards, taps, and a fresh board on each press', () => {
  const p = ground, fresh = freshAttempt(p);
  assert.equal(fresh.board.board, '3');
  assert.equal(nextHint(p, fresh).type, 'done');
  const fan = play(p, fresh, {type: 'size', board: 'fan'});
  assert.equal(fan.board.labels.length, 10);
  const tapped = play(p, fan, {type: 'turn', point: 6});
  assert.equal(tapped.board.labels[6], 'B');
  assert.equal(move(p, fan, {type: 'turn', point: 0}), null, 'corners stay');
  assert.deepEqual(PLAY_ORDER, ['2', '3', '4', '5', 'fan']);
  assert.equal(validBoard(p, {board: '7', labels: ''}), false);
  const html = view(p, tapped);
  assert.match(html, /aria-pressed="true" aria-label="Fan board"/);
  assert.match(html, /Rainbows/);
});

test('rendering: letters on every dot, doors on demand, names for every control', () => {
  const p = three, fresh = freshAttempt(p), html = view(p, fresh);
  assert.match(html, /data-mechanic-wire="rainbow"/);
  assert.equal((html.match(/data-tg-point=/g) || []).length, 7, 'every dot but the corners is a control');
  assert.match(html, /aria-label="Dot 2 in row 1, R, red\. Change to B"/);
  assert.doesNotMatch(html, /class="rb-door"/, 'doors hidden until asked for');
  mechanicFor(p).ui(p, {doors: true});
  assert.match(view(p, play(p, fresh, turn(1))), /class="rb-door/);
  mechanicFor(p).reset(p);
  assert.match(view(p, fresh), /Make 3 rainbows\./);
});
